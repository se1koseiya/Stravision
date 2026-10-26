import {
  readProvidersConfig,
  resolveDefaultModelId,
  type ProvidersConfig,
} from '@/lib/ai/provider-resolver'

/**
 * 「最终用哪个模型」的统一决策层 —— 主对话 /api/chat 与各类 AI 辅助接口共用同一份逻辑。
 *
 * 🚨 为什么必须共享：
 *   用户在前端选的常常是 **`auto`（智能模型）**。此时两边曾各自实现了一套「挑哪个真模型」，
 *   结果提示集挑到的是 `resolveDefaultModelId`（providers 里第一个 enabled 模型，可能是
 *   一个不可用的模型）而主对话挑的是「第一个 supportsReasoning 的模型」—— 同一个 Auto，
 *   两个接口用的根本不是同一个模型，提示集因此恒 4xx 静默回退到兜底文案。
 *   （2026-10-04 用户实测："提示集没有根据我选择的模型和回答体一起生成"。）
 *
 * 逻辑逐字搬自 `app/api/chat/route.ts` 的 `if (effectiveModel === 'auto')` 分支，
 * 唯一改动是把重复的 `readProvidersConfig()` 结果作为参数传入。
 */
export interface PickAutoModelOptions {
  /** 与主对话 `enableReasoning` 同源（AI 助手默认 true） */
  enableReasoning?: boolean
  /** 本次请求是否带图片（多模态） */
  hasImageContent?: boolean
}

/**
 * 把一个 `auto` 解析成具体模型 id。
 * 优先级：reasoning 模型 > vision 模型 > providers 默认模型；配置读取失败时用与
 * 主对话一致的字面兜底值（保持行为完全一致，不在这里"优化"）。
 */
export function pickAutoModel(
  cfg: ProvidersConfig,
  opts: PickAutoModelOptions = {},
): string {
  const { enableReasoning, hasImageContent } = opts

  if (enableReasoning) {
    try {
      const reasoningModel = cfg.providers
        .filter(p => p.enabled)
        ?.flatMap(p => p.models.filter(m => m.enabled && m.supportsReasoning).map(m => ({ ...m, _providerPriority: p.priority ?? 999 })))
        ?.sort((a, b) => a._providerPriority - b._providerPriority)?.[0]
      if (reasoningModel?.id) return reasoningModel.id
      return 'deepseek-v3.2'
    } catch {
      return 'deepseek-v3.2' // 配置读取失败时的最后兜底
    }
  }

  if (hasImageContent) {
    try {
      const visionModel = cfg.providers
        .filter(p => p.enabled)
        ?.flatMap(p => p.models.filter(m => m.enabled && m.supportsVision).map(m => ({ ...m, _providerPriority: p.priority ?? 999 })))
        ?.sort((a, b) => a._providerPriority - b._providerPriority)?.[0]
      return visionModel?.id || resolveDefaultModelId(cfg) || 'qwen3.6-plus'
    } catch {
      return 'qwen3.6-plus'
    }
  }

  try {
    return resolveDefaultModelId(cfg) || 'qwen3.6-plus'
  } catch {
    return 'qwen3.6-plus'
  }
}

/**
 * 判断某个模型 id 是否能在**平台侧**（providers 配置）找到归属。
 * 用于识别「模型广场 / 历史遗留」的幽灵 id —— 这类 id 平台无法路由，
 * 只能靠系统环境变量兜底，几乎必然 4xx。
 */
export function isPlatformRoutableModel(cfg: ProvidersConfig, modelId: string): boolean {
  if (!modelId) return false
  return cfg.providers.some(p =>
    p.enabled !== false && Array.isArray(p.models) &&
    p.models.some(m => m.enabled !== false && m.id === modelId),
  )
}

/**
 * 解析请求里传入的模型 → 真正要下发给上游的模型 id。
 *
 * - 空 / `auto`：走 {@link pickAutoModel}（与主对话一致）
 * - 具体 id：默认原样使用（用户选什么就用什么）
 * - 🩹 例外：**平台托管模式**（用户没带自己的 key）下，若该 id 在 providers 里查无此模型，
 *   说明平台无法路由它（典型：模型广场的 id 与 provider 模型 id 是两套命名），
 *   继续用只会得到必然的 4xx + 静默回退。此时改用自动选择结果，保证功能可用。
 *   用户自带 key（BYOK / 自定义模型）时**不做任何替换** —— 那是他自己的端点，模型名由他决定。
 */
export async function resolveRequestedModel(opts: {
  model?: string
  enableReasoning?: boolean
  hasImageContent?: boolean
  /** 是否处于"用户自带 key"模式 */
  isByok?: boolean
  /** 已读取的 providers 配置（避免重复 IO） */
  cfg?: ProvidersConfig
}): Promise<{ model: string; degraded: boolean; reason?: string }> {
  const cfg = opts.cfg ?? await readProvidersConfig()
  const requested = (opts.model || '').trim()

  if (!requested || requested === 'auto') {
    return { model: pickAutoModel(cfg, opts), degraded: false }
  }

  if (isPlatformRoutableModel(cfg, requested)) {
    return { model: requested, degraded: false }
  }

  if (opts.isByok) {
    // 自带 key：模型名交给用户自己的端点判断，不替换
    return { model: requested, degraded: false }
  }

  const auto = pickAutoModel(cfg, opts)
  if (auto && auto !== requested) {
    return {
      model: auto,
      degraded: true,
      reason: `model "${requested}" is not routable on this platform; fell back to "${auto}"`,
    }
  }
  return { model: requested, degraded: false }
}

/** 兼容旧调用点：只要最终模型 id */
export async function resolveEffectiveModel(opts: {
  model?: string
  enableReasoning?: boolean
  hasImageContent?: boolean
  isByok?: boolean
}): Promise<string> {
  const { model } = await resolveRequestedModel(opts)
  return model
}

/**
 * 构造「候选模型链」：首选用户所选模型，其后是平台其它候选。
 *
 * 用途：辅助接口（如提示集）在**平台托管模式**下逐个尝试，
 * 避免"用户选的模型上游不可用（额度/权限/未购买）→ 整个功能静默失效"。
 * 自带 key（BYOK）时只保留首选 —— 用户的端点只认他自己的模型，换模型没有意义。
 *
 * 顺序：primary → 自动决策模型（reasoning 优先）→ 按 provider priority 铺开全部 enabled 模型。
 */
export function buildModelCandidates(opts: {
  primary?: string
  cfg: ProvidersConfig
  enableReasoning?: boolean
  hasImageContent?: boolean
  allowFallback?: boolean
  max?: number
}): string[] {
  const list: string[] = []
  const push = (id?: string) => {
    const v = (id || '').trim()
    if (v && !list.includes(v)) list.push(v)
  }

  push(opts.primary)

  if (opts.allowFallback !== false) {
    push(pickAutoModel(opts.cfg, { enableReasoning: opts.enableReasoning, hasImageContent: opts.hasImageContent }))
    const sorted = [...opts.cfg.providers].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))

    // 先取「每个 provider 的代表模型」—— 同 provider 的模型往往一起不可用，
    // 按 provider 铺开能用最少的尝试覆盖最多的可能性。
    for (const p of sorted) {
      if (p.enabled === false) continue
      const first = p.models.find(m => m.enabled !== false)
      if (first) push(first.id)
    }
    // 再补齐各自 provider 的其余模型
    for (const p of sorted) {
      if (p.enabled === false) continue
      for (const m of p.models) {
        if (m.enabled !== false) push(m.id)
      }
    }
  }

  return list.slice(0, opts.max ?? 6)
}
