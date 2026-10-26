/**
 * 上下文偏好 · 纯函数层（用户可自定义「上下文容量」与「自动压缩阈值」）
 *
 * 2026-10-11 用户要求：「用户可以在设置里自定义上下文容量，以及到什么容量会自动压缩」。
 *
 * 本模块只做**取值与派生**，不做任何 IO / 不碰 DB —— 因此前端（设置弹窗、上下文指示器）
 * 可以安全 import 常量与归一化函数，而不会把 pg 拖进客户端 bundle。
 * 服务端读写见 `lib/db/context-prefs-service.ts`。
 *
 * 两个可调项：
 *   ① windowTokens          上下文容量（token）。null = 跟随模型窗口自动识别。
 *                           语义是**上限**：实际取值 = min(用户值, 模型窗口)。
 *                           即使用户填得比模型窗口大也不会放大 —— 否则必然换来上游 400。
 *   ② compressionTriggerRatio 自动压缩触发阈值（输入预算占比，0.2~0.9，默认 0.6）。
 *                           用量超过「输入预算 × 该比例」时，较早的对话被折叠为摘要。
 *
 * 与既有逻辑的关系：
 *   - 未设置时 **行为与改造前完全一致**（windowTokens=null + triggerRatio=0.6=DEFAULT_COMPRESSION）。
 *   - 所有派生都复用 `budget.ts` / `history-compressor.ts` 的既有函数，不另起第二套口径。
 */

import type { ContextBudget } from './types'
import { buildContextBudget, getInputBudget, resolveModelWindow } from './budget'
import { DEFAULT_COMPRESSION, type CompressionConfig } from './history-compressor'

/** 用户可调的上下文偏好（与后端 user_preferences 存储一一对应） */
export interface UserContextPrefs {
  /** 上下文容量上限（token）；null = 跟随模型自动识别 */
  windowTokens: number | null
  /** 自动压缩触发阈值：输入预算占比（0.2 ~ 0.9） */
  compressionTriggerRatio: number
}

/** 默认值与改造前行为一致（不改 = 不变） */
export const DEFAULT_USER_CONTEXT_PREFS: UserContextPrefs = {
  windowTokens: null,
  compressionTriggerRatio: DEFAULT_COMPRESSION.triggerRatio,
}

/** 存储 key（user_preferences.preference_key），与 personal.* 同前缀但独立于个性化配置 */
export const CONTEXT_PREFS_KEYS = {
  window: 'personal.context_window_tokens',
  trigger: 'personal.compression_trigger_ratio',
} as const

/** 容量下限：低于此值连身份段 + 工具清单都装不下，压缩会退化成「每次都是摘要」 */
export const MIN_WINDOW_TOKENS = 16_000
/** 容量上限：防止误填天文数字后一路不压缩直到上游 400 */
export const MAX_WINDOW_TOKENS = 1_000_000
/** 压缩阈值下限：低于此值几乎每轮都在压缩，摘要会反复覆盖细节 */
export const MIN_TRIGGER_RATIO = 0.2
/** 压缩阈值上限：贴近 1.0 时压缩永远来不及触发，等于关掉压缩 */
export const MAX_TRIGGER_RATIO = 0.9

/**
 * 设置面板的容量预设。value 为字符串（antd Select 契约），tokens 为 null 表示自动。
 * 只提供「比常见模型窗口小或相等」的档位 —— 容量是上限，放大没有意义。
 */
export const CONTEXT_WINDOW_PRESETS: Array<{ value: string; label: string; tokens: number | null }> = [
  { value: 'auto', label: '自动（跟随模型）', tokens: null },
  { value: '32000', label: '32K', tokens: 32_000 },
  { value: '64000', label: '64K', tokens: 64_000 },
  { value: '128000', label: '128K', tokens: 128_000 },
  { value: '200000', label: '200K', tokens: 200_000 },
]

/** 预设 value（字符串）→ 容量（token）。非预设值回退为自动 */
export function windowTokensFromPreset(value: string): number | null {
  const hit = CONTEXT_WINDOW_PRESETS.find((p) => p.value === value)
  return hit ? hit.tokens : null
}

/** 容量（token）→ 预设 value（用于回显到下拉） */
export function presetFromWindowTokens(tokens: number | null): string {
  if (tokens == null) return 'auto'
  const hit = CONTEXT_WINDOW_PRESETS.find((p) => p.tokens === tokens)
  return hit ? hit.value : String(tokens)
}

/** 宽松解析：字符串 / 数字 / 空值 → number | null */
function toNumberOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * 归一化任意输入（请求体 / DB 字符串）为合法偏好。
 * 任何非法值都回落到默认，绝不抛错 —— 这条链路上游是用户输入。
 */
export function normalizeUserContextPrefs(raw: unknown): UserContextPrefs {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  const w = toNumberOrNull(o.windowTokens)
  const windowTokens =
    w != null && w >= MIN_WINDOW_TOKENS ? Math.min(MAX_WINDOW_TOKENS, Math.round(w)) : null

  const t = toNumberOrNull(o.compressionTriggerRatio)
  const compressionTriggerRatio =
    t != null
      ? Math.min(MAX_TRIGGER_RATIO, Math.max(MIN_TRIGGER_RATIO, Math.round(t * 100) / 100))
      : DEFAULT_USER_CONTEXT_PREFS.compressionTriggerRatio

  return { windowTokens, compressionTriggerRatio }
}

/**
 * 解析最终生效的窗口容量。
 * 用户设置的是**上限**：永远取 min(用户值, 模型窗口)，不放大。
 */
export function resolvePrefsWindow(modelId: string | undefined, prefs: UserContextPrefs): number {
  const modelWindow = resolveModelWindow(modelId)
  if (prefs.windowTokens == null) return modelWindow
  return Math.min(prefs.windowTokens, modelWindow)
}

/**
 * 预算覆盖项。只有「确实改变了窗口」时才返回对象 ——
 * 否则返回 undefined，保证未设置用户的链路逐字等同于改造前。
 */
export function contextBudgetOverride(
  modelId: string | undefined,
  prefs: UserContextPrefs,
): Partial<ContextBudget> | undefined {
  const modelWindow = resolveModelWindow(modelId)
  const win = resolvePrefsWindow(modelId, prefs)
  if (win === modelWindow) return undefined
  return { windowTokens: win }
}

/** 压缩配置（只覆盖触发比例，其余保持 DEFAULT_COMPRESSION 语义） */
export function compressionConfigFrom(prefs: UserContextPrefs): CompressionConfig {
  return { ...DEFAULT_COMPRESSION, triggerRatio: prefs.compressionTriggerRatio }
}

/** 生效的输入预算（窗口 − 输出预留 − 安全余量），与压缩链路同一套口径 */
export function effectiveInputBudget(
  modelId: string | undefined,
  prefs: UserContextPrefs,
): number {
  return getInputBudget(buildContextBudget(modelId, contextBudgetOverride(modelId, prefs)))
}

/** 触发自动压缩的 token 数（= 输入预算 × 触发比例），供 SSE 上报与前端画线 */
export function compressionTriggerTokens(
  modelId: string | undefined,
  prefs: UserContextPrefs,
): number {
  return Math.floor(effectiveInputBudget(modelId, prefs) * prefs.compressionTriggerRatio)
}

/** 该模型是否存在「模型窗口小于用户设置值」的收敛（用于前端提示实际生效容量） */
export function isWindowClamped(modelId: string | undefined, prefs: UserContextPrefs): boolean {
  if (prefs.windowTokens == null) return false
  return prefs.windowTokens > resolveModelWindow(modelId)
}
