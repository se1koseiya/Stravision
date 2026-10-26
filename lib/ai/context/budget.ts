/**
 * 上下文工程层 · Token 预算分配
 *
 * 现状问题：route.ts 里没有任何「预算」概念 —— 压缩阈值是一个孤零零的
 * `MAX_CHAR_COUNT = 60000`，与模型上下文窗口无关，也与各段实际占用无关。
 * 结果是：知识库注入 4 段 + 技能文档 + 工具清单 + 记忆，全都无上限地往
 * system prompt 里堆，谁先堆满谁说了算。
 *
 * 本模块引入显式预算：
 *   输入预算 = 上下文窗口 − 输出预留
 *   各段位按份额切分，段内超支则降级（fallback）或裁剪。
 *
 * 份额设计依据（按「缺了它助手就不成立」排序）：
 *   identity 30% —— 身份/规则绝不能被挤掉，否则助手行为漂移
 *   pinned   25% —— 用户显式给的信息（记忆/个性化/强引用），丢了用户直接感知
 *   working  20% —— 技能/工具/环境，可降级为精简版
 *   history  25% —— 对话历史与工具结果，最先被压缩
 */

import type { ContextBudget, ContextTier } from './types'
import { estimateContextTokens } from './token-estimator'

/** 常见模型的上下文窗口（token）。未识别时用保守默认值 */
const MODEL_WINDOWS: Array<{ match: RegExp; window: number }> = [
  { match: /gpt-4o|gpt-4\.1|gpt-4-turbo|o1|o3/i, window: 128_000 },
  { match: /gpt-4(?!o)/i, window: 8_192 },
  { match: /gpt-3\.5/i, window: 16_385 },
  { match: /claude/i, window: 200_000 },
  { match: /deepseek/i, window: 128_000 },
  { match: /qwen/i, window: 128_000 },
  { match: /glm|chatglm/i, window: 128_000 },
  { match: /kimi|moonshot/i, window: 128_000 },
  { match: /doubao|豆包/i, window: 128_000 },
  { match: /minimax|abab/i, window: 128_000 },
]

/** 无法识别模型时的保守窗口 */
const FALLBACK_WINDOW = 32_000

/**
 * 估算模型的上下文窗口。
 *
 * 沿用 provider-resolver 的模型 id 命名习惯做前缀匹配；
 * 匹配不到时用保守值，宁可早压缩也不要让上游 400。
 */
export function resolveModelWindow(modelId?: string): number {
  if (!modelId) return FALLBACK_WINDOW
  for (const { match, window } of MODEL_WINDOWS) {
    if (match.test(modelId)) return window
  }
  return FALLBACK_WINDOW
}

/** 默认输出预留（按窗口比例，且有上下限） */
function defaultOutputReserve(window: number): number {
  // 小窗口按 1/4 留，大窗口收敛到 8k（多数模型的 max_tokens 上限）
  return Math.min(8_192, Math.max(1_024, Math.floor(window * 0.25)))
}

/**
 * 构造默认预算。
 *
 * @param modelId 模型 id（用于推断窗口）
 * @param overrides 覆盖项（窗口 / 输出预留 / 段位份额）
 */
export function buildContextBudget(
  modelId?: string,
  overrides?: Partial<ContextBudget>,
): ContextBudget {
  const windowTokens = overrides?.windowTokens ?? resolveModelWindow(modelId)
  const reservedForOutput = overrides?.reservedForOutput ?? defaultOutputReserve(windowTokens)
  const tierShares = overrides?.tierShares ?? {
    identity: 0.3,
    pinned: 0.25,
    working: 0.2,
    history: 0.25,
  }
  return { windowTokens, reservedForOutput, tierShares }
}

/** 输入预算 = 窗口 − 输出预留 − 安全余量（模板开销 / 消息包装） */
export function getInputBudget(budget: ContextBudget): number {
  const safety = Math.max(256, Math.floor(budget.windowTokens * 0.02))
  return Math.max(1_024, budget.windowTokens - budget.reservedForOutput - safety)
}

/** 某段位分到的 token 上限 */
export function getTierBudget(budget: ContextBudget, tier: ContextTier): number {
  return Math.floor(getInputBudget(budget) * (budget.tierShares[tier] ?? 0))
}

/**
 * 在预算内裁剪单个文本。
 *
 * 策略：优先按「行」截断（保住结构），单行过长才按字符截断；
 * 截断处追加省略说明，让模型知道内容不完整（而不是以为这就是全部）。
 */
export function truncateToBudget(text: string, maxTokens: number): { text: string; truncated: boolean } {
  if (!text) return { text: '', truncated: false }
  if (estimateContextTokens(text) <= maxTokens) return { text, truncated: false }

  // 二分找到恰好装得下的长度（避免逐字符估算）
  const lines = text.split('\n')
  let lo = 0
  let hi = lines.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    const candidate = lines.slice(0, mid).join('\n')
    if (estimateContextTokens(candidate) <= maxTokens) lo = mid
    else hi = mid - 1
  }

  if (lo > 0) {
    const kept = lines.slice(0, lo).join('\n')
    return { text: `${kept}\n…（内容过长已截断，共省略 ${lines.length - lo} 行）`, truncated: true }
  }

  // 单行就超预算：按字符硬截
  const chars = Math.max(0, Math.floor(maxTokens / 0.28))
  return {
    text: `${text.slice(0, chars)}…（内容过长已截断）`,
    truncated: true,
  }
}
