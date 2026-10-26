/**
 * 上下文工程层 · 埋点
 *
 * 现状问题：上下文膨胀是「静默」的 —— 没有任何一处日志能回答
 * 「这一轮请求里，技能文档占了多少 token？知识库检索结果占了多少？
 *  工具结果截断前是多少？」只能靠事后翻源码猜。
 *
 * 本模块把装配结果转成**可读的一行日志 + 结构化快照**。
 * 刻意不打印内容本体（只打印段 id 与 token 数），避免把用户对话写进日志。
 */

import type { AssembledContext, ContextTelemetry, ContextTier } from './types'

/** 各段位的中文名（日志可读性） */
const TIER_LABEL: Record<ContextTier, string> = {
  identity: '身份/规则',
  pinned: '用户信息',
  working: '技能/环境',
  history: '历史/工具',
}

/** 段 id 前缀 → 可读名（埋点里展示得更直观） */
const SECTION_LABEL: Record<string, string> = {
  'base-prompt': '基础提示词',
  skill: '技能文档',
  persona: '人格',
  memory: '用户记忆',
  personalization: '个性化设置',
  knowledge: '知识库',
  'env-snapshot': '环境快照',
  'device-state': '设备状态',
  'time-context': '时间上下文',
  'tasks-list': '定时任务',
  'tools-index': '工具清单',
  'schedule-rules': '定时任务规则',
  'report-rules': '报告规则',
  'feature-flags': '功能开关',
  'forced-tool': '强制工具提示',
  'plan-mode': '计划模式',
  'mcp-hint': 'MCP 缺失提示',
}

function labelOf(id: string): string {
  if (SECTION_LABEL[id]) return SECTION_LABEL[id]
  // 形如 'env-snapshot#2' 的带序号段
  const base = id.split('#')[0]
  return SECTION_LABEL[base] ?? id
}

/** 从装配结果构造埋点快照 */
export function buildTelemetry(label: string, ctx: AssembledContext): ContextTelemetry {
  const topSections = Object.entries(ctx.usage)
    .map(([id, tokens]) => ({
      id,
      tier: (ctx.sections.find((s) => s.id === id)?.tier ?? 'working') as ContextTier,
      tokens,
    }))
    .filter((e) => e.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 8)

  return {
    label,
    totalTokens: ctx.totalTokens,
    budgetTokens: ctx.budgetTokens,
    tierUsage: ctx.tierUsage,
    topSections,
    truncatedSections: ctx.truncatedSections,
  }
}

/**
 * 打印一行紧凑日志。
 *
 * 格式示例：
 *   [Context] chat#a1b2c3 total=4821/99220 (4.9%) | 身份/规则 1980 · 用户信息 620 · 技能/环境 1421 · 历史/工具 800 | top: 基础提示词 1980, 技能文档 1180 | ⚠截断: 知识库
 */
export function logContextTelemetry(tel: ContextTelemetry): void {
  const pct = tel.budgetTokens > 0 ? ((tel.totalTokens / tel.budgetTokens) * 100).toFixed(1) : '0'
  const tiers = (Object.keys(tel.tierUsage) as ContextTier[])
    .map((t) => `${TIER_LABEL[t]} ${tel.tierUsage[t]}`)
    .join(' · ')
  const top = tel.topSections
    .slice(0, 5)
    .map((s) => `${labelOf(s.id)} ${s.tokens}`)
    .join(', ')
  const trunc = tel.truncatedSections.length
    ? ` | ⚠截断: ${tel.truncatedSections.map(labelOf).join(', ')}`
    : ''
  const comp = tel.compression
    ? ` | 压缩 ${tel.compression.beforeTokens}→${tel.compression.afterTokens} (${tel.compression.mode}, ${tel.compression.durationMs}ms)`
    : ''
  const tool = tel.toolCompaction
    ? ` | 工具结果 ${tel.toolCompaction.beforeTokens}→${tel.toolCompaction.afterTokens}`
    : ''

  console.log(
    `[Context] ${tel.label} total=${tel.totalTokens}/${tel.budgetTokens} (${pct}%) | ${tiers} | top: ${top}${trunc}${comp}${tool}`,
  )
}

/** 结构化快照（供调试接口 / 单测断言使用，不含对话内容） */
export function snapshotContext(ctx: AssembledContext): Record<string, unknown> {
  return {
    totalTokens: ctx.totalTokens,
    budgetTokens: ctx.budgetTokens,
    utilization: ctx.budgetTokens > 0 ? Number((ctx.totalTokens / ctx.budgetTokens).toFixed(4)) : 0,
    tierUsage: ctx.tierUsage,
    sections: ctx.sections.map((s) => ({
      id: s.id,
      tier: s.tier,
      stability: s.stability,
      tokens: ctx.usage[s.id] ?? 0,
      truncated: ctx.truncatedSections.includes(s.id),
    })),
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 分项归类（供前端「上下文用量」面板展示）
 *
 * 段位（identity/pinned/working/history）是**工程视角**的分层，用户看不懂；
 * 这里把段 id 收束成用户能认的几类，作为面板里的明细行与堆叠条分段。
 * 归类只做「段 id → 类别」的纯映射，不在别处再算一遍 token（分母仍是 ctx.usage）。
 * ──────────────────────────────────────────────────────────────────────────── */

/** 展示用类别标识（前端按 key 上色；数组顺序即展示顺序） */
export type ContextCategoryKey =
  /** 身份 / 人格 / 基础规则 */
  | 'system'
  /** 技能文档 */
  | 'skill'
  /** 工具清单 / MCP 提示 */
  | 'tools'
  /** 对话历史与工具结果（不来自 ctx.usage，由调用方传入） */
  | 'messages'
  /** 用户记忆 / 个性化 / 知识库 */
  | 'userInfo'
  /** 环境快照 / 设备状态 / 时间上下文 */
  | 'environment'
  /** 其余（定时任务、报告规则、计划模式、强制工具提示…） */
  | 'other'

export interface ContextCategoryUsage {
  key: ContextCategoryKey
  /** 中文展示名 */
  label: string
  tokens: number
}

/**
 * 「虚拟拆分」项：某类内容物理上被拼进了别的段（当前只有技能文档 / 工具清单
 * 被拼进 `base-prompt`），但从用户视角它是独立的一项。
 *
 * 只影响**展示归类**，不改动 prompt 本身 —— 因此对模型行为零风险。
 */
export interface ContextCarveOut {
  key: ContextCategoryKey
  tokens: number
}

/** 段 id（不含 #序号）→ 类别 */
const CATEGORY_OF_SECTION: Record<string, ContextCategoryKey> = {
  persona: 'system',
  'base-prompt': 'system',
  'feature-flags': 'system',

  skill: 'skill',

  'tools-index': 'tools',
  'mcp-hint': 'tools',

  memory: 'userInfo',
  personalization: 'userInfo',
  knowledge: 'userInfo',

  'env-snapshot': 'environment',
  'device-state': 'environment',
  'time-context': 'environment',
}

const CATEGORY_LABEL: Record<ContextCategoryKey, string> = {
  system: '系统提示词',
  skill: '技能文档',
  tools: '工具及 MCP',
  messages: '对话消息',
  userInfo: '用户信息与记忆',
  environment: '环境与设备',
  other: '其他',
}

/** 展示顺序：越"底层/固定"的越靠前，对话消息夹在中间（用户最关心它的涨势） */
const CATEGORY_ORDER: ContextCategoryKey[] = [
  'system',
  'skill',
  'tools',
  'messages',
  'userInfo',
  'environment',
  'other',
]

/**
 * 把装配结果归类成展示用的分项占用。
 *
 * @param ctx 上下文装配结果（提供各段 token）
 * @param messagesTokens 对话消息 + 工具结果的 token（来自消息数组本身，不在 ctx.usage 里）
 * @param carveOuts 虚拟拆分项：从 `system` 里再划出来的独立项（技能 / 工具清单）
 * @returns 按 CATEGORY_ORDER 排序、已剔除 0 值项的数组
 */
export function categorizeContext(
  ctx: AssembledContext,
  messagesTokens: number,
  carveOuts: ContextCarveOut[] = [],
): ContextCategoryUsage[] {
  const acc: Record<ContextCategoryKey, number> = {
    system: 0, skill: 0, tools: 0, messages: 0, userInfo: 0, environment: 0, other: 0,
  }
  for (const [id, tokens] of Object.entries(ctx.usage)) {
    const base = id.split('#')[0]
    acc[CATEGORY_OF_SECTION[base] ?? 'other'] += tokens
  }
  acc.messages += Math.max(0, messagesTokens)

  /*
   * 虚拟拆分：技能文档与工具清单在拼装时被写进了 `base-prompt`（同属 system 类），
   * 但用户看到「技能 3.2K」比看到「系统提示词 21.7K」有用得多。
   * 这里只做归类搬运 —— 从 system 扣减的额度取 min(声明值, 当前 system 值)，
   * 避免 base-prompt 被预算截断后出现负数。
   */
  for (const co of carveOuts) {
    if (!co || co.tokens <= 0) continue
    const moved = Math.min(co.tokens, acc.system)
    if (moved <= 0) continue
    acc.system -= moved
    acc[co.key] += moved
  }

  return CATEGORY_ORDER
    .map((key) => ({ key, label: CATEGORY_LABEL[key], tokens: acc[key] }))
    .filter((c) => c.tokens > 0)
}
