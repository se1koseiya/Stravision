/**
 * 上下文工程层 · 工具结果分级截断 ToolResultCompactor
 *
 * 现状问题（本文件要解决的）：
 *   route.ts 里工具结果回灌是「一刀切」的：
 *     - 多模态结果：整坨 metadata JSON 塞进 text part（图片 base64 另计）
 *     - 普通结果：`JSON.stringify(toolData)` 原样进上下文，**无任何截断**
 *   于是「搜一次网页」「查一次 7 天传感器历史」这类工具，返回的整坨 JSON
 *   会原样留在上下文里陪跑到对话结束。几轮工具调用就能吃掉大半个窗口，
 *   并且后续每一轮请求都要重新为它付费。
 *
 * 分级策略（按 token 量）：
 *   - tiny   (<1.5k)  原样保留 —— 截断的收益不抵信息损失
 *   - small  (<6k)    保留结构骨架：顶层标量 + 数组前 N 项 + 其余折叠计数
 *   - large  (<20k)   只留摘要 + 关键字段白名单
 *   - huge   (≥20k)   只留摘要 + 总数 + 取数指引（告诉模型怎么重新取）
 *
 * 关键原则：**永远保留「模型据此能继续推理」的最小充分信息**，
 * 而不是简单砍掉尾巴 —— 砍尾巴会让模型以为数据只有这么点。
 */

import type { AssembledContext, ContextTier } from './types'
import { estimateContextTokens, stripBinaryPayload } from './token-estimator'

/** 分级阈值（token） */
export const COMPACTION_THRESHOLDS = {
  tiny: 1_500,
  small: 6_000,
  large: 20_000,
} as const

export type CompactionLevel = 'none' | 'structure' | 'summary' | 'pointer'

export interface CompactionResult {
  /** 压缩后的内容（直接用于 role:'tool' 的 content） */
  content: unknown
  level: CompactionLevel
  beforeTokens: number
  afterTokens: number
  /** 是否发生了压缩 */
  compacted: boolean
}

/**
 * 工具结果里**必须保留**的关键字段（白名单）。
 * 这些是模型继续推理的必要信息；其余字段在 large/huge 级别会被丢弃。
 */
const KEY_FIELDS = [
  'success',
  'error',
  'message',
  'summary',
  'note',
  'count',
  'total',
  'status',
  'confirmed',
  'stable',
  'degraded',
  '_agent_action',
  '_ui',
  // 设备控制类
  'device',
  'value',
  'state',
  // 天气 / 环境类
  'temperature',
  'humidity',
  'condition',
  // 诊断类
  'diseaseName',
  'disease_name',
  'severity',
  'confidence',
  'imageCount',
]

/** 判断值是否是「可继续推理的标量」（保留），而非大对象/大数组 */
function isScalar(v: unknown): boolean {
  return (
    v === null ||
    typeof v === 'number' ||
    typeof v === 'boolean' ||
    (typeof v === 'string' && v.length <= 200)
  )
}

/** 从任意值里提取一个人类可读的摘要（优先用工具自带的 summary/message） */
function pickSummary(data: unknown): string {
  if (!data || typeof data !== 'object') return String(data ?? '').slice(0, 200)
  const rec = data as Record<string, unknown>
  const candidates = ['summary', 'message', 'note', 'error', 'description', 'text']
  for (const k of candidates) {
    const v = rec[k]
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 300)
  }
  return ''
}

/** 摘要级：只保留关键字段 + 摘要 */
function toSummary(data: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const rec = data as Record<string, unknown>
    for (const k of KEY_FIELDS) {
      if (k in rec && isScalar(rec[k])) out[k] = rec[k]
    }
    const summary = pickSummary(data)
    if (summary) out.summary = summary
    // 数组字段只报数量
    const arrays: Record<string, string> = {}
    for (const [k, v] of Object.entries(rec)) {
      if (Array.isArray(v) && v.length > 0) arrays[k] = `共 ${v.length} 项（已省略，如需详情请重新用更精确的参数查询）`
    }
    if (Object.keys(arrays).length) out._omitted_arrays = arrays
    if (!Object.keys(out).length) out.summary = String(stripBinaryPayload(JSON.stringify(data))).slice(0, 300)
  } else if (Array.isArray(data)) {
    out.count = data.length
    out.summary = `返回 ${data.length} 条记录，已省略明细`
  } else {
    out.summary = String(data ?? '').slice(0, 300)
  }
  return out
}

/** 结构级：保留骨架，数组留前 N 项 */
function toStructure(data: unknown, maxTokens: number): Record<string, unknown> {
  if (Array.isArray(data)) {
    // 逐项追加直到接近预算
    const kept: unknown[] = []
    for (const item of data) {
      const candidate = [...kept, item]
      if (estimateContextTokens(JSON.stringify(candidate)) > maxTokens) break
      kept.push(item)
    }
    return {
      count: data.length,
      items: kept,
      ...(kept.length < data.length
        ? { truncated: `仅展示前 ${kept.length} 项，共 ${data.length} 项` }
        : {}),
    }
  }

  if (!data || typeof data !== 'object') return { summary: String(data ?? '').slice(0, 300) }

  const rec = data as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rec)) {
    if (isScalar(v)) {
      out[k] = v
    } else if (Array.isArray(v)) {
      const kept: unknown[] = []
      for (const item of v) {
        const candidate = [...kept, item]
        if (estimateContextTokens(JSON.stringify(candidate)) > maxTokens / 2) break
        kept.push(item)
      }
      out[k] = kept.length < v.length
        ? { count: v.length, items: kept, truncated: `仅展示前 ${kept.length} 项` }
        : v
    } else if (v && typeof v === 'object') {
      // 嵌套对象只保留其标量字段（一层），再深就丢
      const shallow: Record<string, unknown> = {}
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
        if (isScalar(v2)) shallow[k2] = v2
      }
      if (Object.keys(shallow).length) out[k] = shallow
    }
  }
  return out
}

/**
 * 压缩工具结果。
 *
 * @param data 工具返回的数据（result.data 或降级后的 {error}）
 * @param opts.toolName 工具名（用于日志）
 * @param opts.maxTokens 允许的最大 token（默认按段位预算给出）
 */
export function compactToolResult(
  data: unknown,
  opts?: { toolName?: string; maxTokens?: number },
): CompactionResult {
  const maxTokens = opts?.maxTokens ?? COMPACTION_THRESHOLDS.small
  const beforeTokens = estimateContextTokens(data)

  if (beforeTokens <= COMPACTION_THRESHOLDS.tiny) {
    return { content: data, level: 'none', beforeTokens, afterTokens: beforeTokens, compacted: false }
  }

  let content: unknown
  let level: CompactionLevel

  if (beforeTokens <= COMPACTION_THRESHOLDS.small) {
    content = toStructure(data, maxTokens)
    level = 'structure'
  } else if (beforeTokens <= COMPACTION_THRESHOLDS.large) {
    content = toSummary(data)
    level = 'summary'
  } else {
    content = {
      ...toSummary(data),
      _pointer: '结果过大已折叠。如需具体明细，请用更精确的参数重新调用该工具。',
    }
    level = 'pointer'
  }

  const afterTokens = estimateContextTokens(content)
  return {
    content,
    level,
    beforeTokens,
    afterTokens,
    compacted: afterTokens < beforeTokens,
  }
}

/**
 * 压缩「多模态工具结果」的 metadata 部分。
 *
 * 多模态结果（摄像头截图）的结构是：
 *   text part = `${summary}\n\n[metadata]\n${JSON.stringify(metadata)}`
 *   + image part（base64 dataURL）
 *
 * 现状问题：metadata 是整坨 JSON，而 summary 已经包含了模型需要的信息。
 * 这里把 metadata 换成压缩版，summary 原样保留。
 */
export function compactMultimodalMetadata(
  summary: string,
  metadata: unknown,
  opts?: { toolName?: string; maxTokens?: number },
): { text: string; compaction: CompactionResult } {
  const summaryTokens = estimateContextTokens(summary)
  // 留给 metadata 的预算 = 总额度 − summary 已占
  const metaBudget = Math.max(200, (opts?.maxTokens ?? COMPACTION_THRESHOLDS.small) - summaryTokens)
  const compaction = compactToolResult(metadata, { ...opts, maxTokens: metaBudget })
  const metaText = JSON.stringify(compaction.content)
  return {
    text: `${summary}\n\n[metadata]\n${metaText}`,
    compaction,
  }
}

/** 汇总一批压缩结果（写入埋点） */
export function summarizeCompactions(
  items: Array<{ toolName: string } & CompactionResult | null | undefined>,
): { beforeTokens: number; afterTokens: number; compactedTools: string[] } | undefined {
  const valid = items.filter(Boolean) as Array<{ toolName: string } & CompactionResult>
  if (!valid.length) return undefined
  return {
    beforeTokens: valid.reduce((s, r) => s + r.beforeTokens, 0),
    afterTokens: valid.reduce((s, r) => s + r.afterTokens, 0),
    compactedTools: valid.filter((r) => r.compacted).map((r) => r.toolName),
  }
}

/** 判断段位（供调用方按 tier 决定预算；history 段最紧） */
export function toolResultTier(): ContextTier {
  return 'history'
}

/** 供 AssembledContext 复用的空占位（避免 types 循环引用告警） */
export type _AssembledContextRef = AssembledContext
