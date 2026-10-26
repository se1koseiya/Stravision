/**
 * 上下文工程层 · 历史压缩（分级保留）
 *
 * 现状问题（本文件要重写的）：
 *   route.ts 里 `MAX_CHAR_COUNT = 60000` 触发一次性压缩：
 *     ① 阈值是**字符数**，与真实 token 脱钩 —— 纯英文历史（4 字符/token）
 *        其实才 15k token 就被压，纯中文历史（1 字符/token）压得太晚。
 *     ② 压缩粒度过粗：除最近 4 条外的**全部**历史一次性压成一段 JSON，
 *        中段那些"还有用但不够新"的对话（比如 8 轮前定的品种、棚号）
 *        跟 100 轮前的寒暄同等对待，一起糊成摘要，细节不可逆丢失。
 *     ③ 压缩结果仍可能超长（旧摘要 >12000 字符只提示"深度压缩"，
 *        没有硬保证）。
 *
 * 新策略 —— 三层保留（按"距当前的距离"分级）：
 *   ┌ 近段（最近 RECENT_TURNS 轮）  原文保留，不压缩 ← 保证连贯性
 *   ├ 中段（RECENT ~ MIDDLE_TURNS）   结构化摘要 ← 保留事实/决策/待办
 *   └ 远段（更早）                     要点合并 ← 见 compressFarHistory
 *   已有 <PAST_MEMORY> 摘要 → 与新压缩内容增量合并，不重头来。
 *
 * 触发条件从「字符数 > 60000」改为「估算 token > 输入预算 × 阈值」，
 * 阈值随模型窗口自适应。
 *
 * 兼容性：输出仍写回 `<PAST_MEMORY>…</PAST_MEMORY>` 协议，
 * 仍产出 `context_update` 事件的 messages 结构 —— 前端零改动。
 */

import type { ContextBudget } from './types'
import { buildContextBudget, getInputBudget } from './budget'
import { estimateMessagesTokens } from './token-estimator'

/**
 * 对话消息的最小结构（只声明本模块真正访问的字段）。
 * 刻意不用 `any` —— route.ts 传进来的是 OpenAI 风格消息，
 * 但这里只关心 role / content / tool_calls 三处。
 */
export interface HistoryMessage {
  role?: string
  content?: string | Array<{ type?: string; text?: string }>
  tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>
}

/** 压缩配置 */
export interface CompressionConfig {
  /** 触发压缩的预算占比（默认 0.6，即用到输入预算 60% 就压） */
  triggerRatio: number
  /** 近段保留的对话条数（不压缩，默认 6 条 ≈ 3 轮） */
  recentKeepCount: number
  /** 中段保留的对话条数（结构化摘要，默认 12 条） */
  middleKeepCount: number
  /** 压缩后目标预算占比（默认 0.35） */
  targetRatio: number
}

export const DEFAULT_COMPRESSION: CompressionConfig = {
  triggerRatio: 0.6,
  recentKeepCount: 6,
  middleKeepCount: 12,
  targetRatio: 0.35,
}

/** 取消息的纯文本（跳过图片 base64 等非语言结构） */
export function messageText(m: HistoryMessage | null | undefined): string {
  if (!m || typeof m !== 'object') return ''
  const c = m.content
  if (typeof c === 'string') return c
  if (Array.isArray(c)) {
    return c
      .filter((p) => p?.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text as string)
      .join('\n')
  }
  // tool_calls 的参数也算（多轮推理依赖）
  if (Array.isArray(m.tool_calls)) {
    return m.tool_calls
      .map((tc) => `${tc?.function?.name ?? ''} ${tc?.function?.arguments ?? ''}`)
      .join('\n')
  }
  return ''
}

/** 序列化消息数组为可喂给摘要模型的文本 */
export function stringifyMessages(messages: HistoryMessage[]): string {
  return messages
    .map((m) => {
      const role = m?.role === 'user' ? '用户' : m?.role === 'assistant' ? '助手' : m?.role === 'tool' ? '工具' : '系统'
      return `${role}: ${messageText(m)}`
    })
    .filter((line) => line.trim().length > 3)
    .join('\n')
}

/** 判断是否需要压缩，并返回分层切片 */
export interface CompressionPlan {
  needed: boolean
  /** 需要压缩的（远段 + 中段）部分 */
  toCompress: HistoryMessage[]
  /** 原样保留的近段 */
  recent: HistoryMessage[]
  /** 当前 token / 预算 / 触发阈值（埋点用） */
  currentTokens: number
  budgetTokens: number
  triggerTokens: number
}

/**
 * 计算压缩计划（纯函数，可单测）。
 *
 * @param messages 非记忆部分的完整消息数组
 * @param modelId 模型 id（推断窗口）
 * @param existingMemoryTokens 已有 <PAST_MEMORY> 的 token（计入当前占用）
 */
export function planCompression(
  messages: HistoryMessage[],
  modelId?: string,
  existingMemoryTokens = 0,
  config: CompressionConfig = DEFAULT_COMPRESSION,
  budgetOverride?: Partial<ContextBudget>,
): CompressionPlan {
  const budget = buildContextBudget(modelId, budgetOverride)
  const inputBudget = getInputBudget(budget)
  const triggerTokens = Math.floor(inputBudget * config.triggerRatio)

  const historyTokens = estimateMessagesTokens(messages) + existingMemoryTokens
  const needed =
    historyTokens > triggerTokens &&
    messages.length > config.recentKeepCount + 1

  const recent = needed ? messages.slice(messages.length - config.recentKeepCount) : messages
  const toCompress = needed ? messages.slice(0, messages.length - config.recentKeepCount) : []

  return {
    needed,
    toCompress,
    recent,
    currentTokens: historyTokens,
    budgetTokens: inputBudget,
    triggerTokens,
  }
}

/** 结构化摘要的输出规范（与原实现一致，前端已按此结构渲染卡片） */
export const STRUCTURED_OUTPUT_SPEC = `【输出格式 - 严格 JSON】
你必须输出**严格的 JSON 对象**（不要 Markdown 代码块包裹，不要其他任何文字），结构如下：
{
  "timeframe": "对话时间范围（简短描述）",
  "user_intent": "用户当前主要意图（1 句话）",
  "key_facts": ["核心事实 1", "核心事实 2", ...],
  "actions_taken": ["AI 已执行的行动 1", ...],
  "decisions": ["关键决策或结论 1", ...],
  "pending_tasks": ["待办事项 1", ...],
  "current_state": "当前状态/进展的简短描述"
}
要求：
- 每个数组最多 4 项，每项 ≤ 30 字
- 客观陈述，去除寒暄和重复内容
- **必须保留**具体设备名/棚号/品种/参数/日期等可复用的实体信息
- 若某类无内容，输出空数组`

/** 压缩时给摘要模型的 system prompt */
export function buildSummaryPrompt(hasExisting: boolean, existingTooLong = false): string {
  let prompt = hasExisting
    ? `你是一个对话记忆合并优化专家，需要将旧记忆与新对话合并为最新结构化记忆。${STRUCTURED_OUTPUT_SPEC}`
    : `你是一个对话历史压缩专家，擅长从冗长对话中提取结构化记忆。${STRUCTURED_OUTPUT_SPEC}`
  if (existingTooLong) {
    prompt += '\n警告：旧摘要冗长，请在合并时深度压缩去重，整体缩减 40% 以上。'
  }
  return prompt
}

/** 规范化摘要模型输出（校验字段、截断长度），失败时回退原文 */
export function normalizeSummary(rawSummary: string): string {
  try {
    const parsed = JSON.parse(rawSummary)
    if (parsed && typeof parsed === 'object') {
      const safe = {
        timeframe: typeof parsed.timeframe === 'string' ? parsed.timeframe : '历史对话',
        user_intent: typeof parsed.user_intent === 'string' ? parsed.user_intent : '',
        key_facts: Array.isArray(parsed.key_facts) ? parsed.key_facts.slice(0, 4) : [],
        actions_taken: Array.isArray(parsed.actions_taken) ? parsed.actions_taken.slice(0, 4) : [],
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions.slice(0, 4) : [],
        pending_tasks: Array.isArray(parsed.pending_tasks) ? parsed.pending_tasks.slice(0, 4) : [],
        current_state: typeof parsed.current_state === 'string' ? parsed.current_state : '',
      }
      return JSON.stringify(safe)
    }
    return rawSummary
  } catch {
    // LLM 没严格按 JSON 输出时，尝试抽取首个 JSON 块
    const jsonMatch = rawSummary.match(/\{[\s\S]*\}/)
    return jsonMatch ? jsonMatch[0] : rawSummary
  }
}

/** 提取已存在的 <PAST_MEMORY> 内容 */
export function extractPastMemory(messages: HistoryMessage[]): { index: number; text: string } | null {
  const index = messages.findIndex((m) => messageText(m).includes('<PAST_MEMORY>'))
  if (index === -1) return null
  const match = messageText(messages[index]).match(/<PAST_MEMORY>([\s\S]*?)<\/PAST_MEMORY>/)
  return { index, text: match ? match[1] : '' }
}

/** 构造压缩后的消息数组（保持 <PAST_MEMORY> 协议 + 近段原文） */
export function buildCompressedMessages(normalizedSummary: string, recent: HistoryMessage[]): HistoryMessage[] {
  return [
    {
      role: 'assistant',
      content: `[系统消息：为了节省上下文长度，早期的历史已被提炼如下]\n<PAST_MEMORY>\n${normalizedSummary}\n</PAST_MEMORY>`,
    },
    ...recent,
  ]
}

/**
 * 压缩统计（2026-10-11 用户：「压缩过程怎么没给用户看。用户不明不白地」）
 *
 * 压缩原本是**静默发生**的：用户只会看到历史消息突然变成一段摘要，
 * 既不知道发生了什么，也不知道为什么。这里把压缩的真实计量留痕，
 * 由前端渲染成一张可读的「上下文整理」提示卡。
 */
export interface CompressionStats {
  /** 压缩前历史占用的估算 token */
  beforeTokens: number
  /** 压缩后（摘要 + 近段原文）的估算 token */
  afterTokens: number
  /** 被折叠进摘要的消息条数 */
  foldedMessages: number
  /** 原样保留原文的消息条数 */
  keptMessages: number
  /** 触发压缩的 token 线（输入预算 × 触发比例） */
  triggerTokens: number
  /** 输入预算（窗口 − 输出预留 − 安全余量） */
  inputBudgetTokens: number
  /** 触发比例（用户可在设置里调整） */
  triggerRatio: number
  /** 当前生效的上下文窗口 */
  windowTokens: number
  /** 发生时间（ms） */
  at: number
}

/** 前端识别「上下文整理提示」的标签（与 PAST_MEMORY / CHECKPOINT 同一套标签协议） */
export const CONTEXT_COMPRESSED_TAG = 'CONTEXT_COMPRESSED'

/**
 * 构造「已整理上下文」提示消息。
 *
 * 放在压缩结果之前（与 <PAST_MEMORY> 消息相邻），这样：
 *   - 用户能立刻看到「为什么历史变了」，而不是不明不白；
 *   - 这条消息随会话一起持久化 → 回看历史时仍能定位到压缩发生的位置；
 *   - 模型也会读到它，明确知道早期对话已被折叠（而不是以为用户没说过）。
 */
export function buildCompressionNoticeMessage(stats: CompressionStats): HistoryMessage {
  return {
    role: 'assistant',
    content: `<${CONTEXT_COMPRESSED_TAG}>${JSON.stringify(stats)}</${CONTEXT_COMPRESSED_TAG}>`,
  }
}

/** 解析提示消息里的统计（失败返回 null，前端据此退化为纯文案） */
export function parseCompressionStats(content: string): CompressionStats | null {
  if (!content) return null
  const m = content.match(/<CONTEXT_COMPRESSED>([\s\S]*?)<\/CONTEXT_COMPRESSED>/)
  if (!m) return null
  try {
    const parsed = JSON.parse(m[1])
    return parsed && typeof parsed === 'object' ? (parsed as CompressionStats) : null
  } catch {
    return null
  }
}

/** 目标压缩量检查：压缩后是否真的降到目标占比以内 */
export function isCompressionSufficient(
  afterTokens: number,
  modelId?: string,
  config: CompressionConfig = DEFAULT_COMPRESSION,
  budgetOverride?: Partial<ContextBudget>,
): boolean {
  const inputBudget = getInputBudget(buildContextBudget(modelId, budgetOverride))
  return afterTokens <= Math.floor(inputBudget * config.targetRatio)
}
