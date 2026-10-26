/**
 * 上下文工程层 · 类型定义
 *
 * 设计目标（对应 route.ts 现状的四个问题）：
 *   1. 装配散在 5 个分支、prompt 拼装重复 3 次 → 统一 ContextBuilder 收口
 *   2. 工具结果无截断 JSON 全量回灌 → ToolResultCompactor 分级截断
 *   3. 压缩阈值写死字符数（60000） → token 预算驱动
 *   4. 各段占用不可观测 → 埋点
 *
 * 分层原则（承袭 route.ts 已有的「静态/动态分层」注释）：
 *   - 静态段（stable）：身份 + 技能 + 人格 + 记忆 + 规则。同一会话多轮不变，
 *     排在最前，便于上游 Prompt Cache 命中（前缀稳定）。
 *   - 动态段（volatile）：环境数据 + 时间 + 工具清单 + 强制提示。每轮都变，
 *     排在最后，利用 Recency 效应增强模型注意力。
 */

/** 上下文段落位（决定「重要性」与「可压缩性」） */
export type ContextTier =
  /** 不可压缩：身份、人格、核心规则。压缩它等于改变助手是谁 */
  | 'identity'
  /** 弱压缩：用户显式提供的信息（用户记忆、个性化设置、知识库强引用） */
  | 'pinned'
  /** 可压缩：技能文档、工具清单、环境快照 */
  | 'working'
  /** 首先被压缩：历史对话、工具结果 */
  | 'history'

/** 上下文变化频率（决定缓存策略与排布位置） */
export type ContextStability = 'stable' | 'volatile'

/** 单个上下文片段 */
export interface ContextSection {
  /** 段标识，用于埋点与去重（如 'base-prompt' / 'skill' / 'env' ） */
  id: string
  /** 段位（决定预算与压缩优先级） */
  tier: ContextTier
  /** 稳定性（决定排布：stable 在前吃到 prompt cache） */
  stability: ContextStability
  /** 文本内容（空字符串会被丢弃） */
  content: string
  /**
   * 该段允许占用的最大 token 数（可选）。
   * 未设置时由预算分配器按段位份额决定。
   */
  maxTokens?: number
  /**
   * 压缩时的降级形式（可选）。
   * 预算不足时优先用 fallback 替换 content，而不是整段丢弃。
   */
  fallback?: string
  /** 元信息，仅用于埋点输出，不进入模型上下文 */
  meta?: Record<string, unknown>
}

/** 预算分配表：各段位允许占用的 token 份额（占总输入预算的比例） */
export interface ContextBudget {
  /** 模型上下文窗口（token） */
  windowTokens: number
  /** 预留给模型输出的 token（不参与输入预算） */
  reservedForOutput: number
  /** 各段位的份额（0~1，总和应 ≤ 1） */
  tierShares: Record<ContextTier, number>
}

/** 装配结果 */
export interface AssembledContext {
  /** 完整 system prompt（静态段 + 动态段拼接后的文本） */
  systemPrompt: string
  /** 分段明细（按最终顺序），用于埋点与调试 */
  sections: ContextSection[]
  /** 各段 token 占用（段 id → token） */
  usage: Record<string, number>
  /** 按段位汇总的 token 占用 */
  tierUsage: Record<ContextTier, number>
  /** 本次装配消耗的总 token */
  totalTokens: number
  /** 输入预算上限 */
  budgetTokens: number
  /** 是否因预算不足发生过裁剪/降级 */
  truncated: boolean
  /** 被裁剪/降级的段 id 列表（供埋点告警） */
  truncatedSections: string[]
}

/** 上下文埋点快照（写日志用，不含内容本体，避免日志泄漏用户数据） */
export interface ContextTelemetry {
  /** 会话/请求标识 */
  label: string
  totalTokens: number
  budgetTokens: number
  /** 段位 → token */
  tierUsage: Record<ContextTier, number>
  /** 段 id → token（按占用降序，只保留 Top N） */
  topSections: Array<{ id: string; tier: ContextTier; tokens: number }>
  truncatedSections: string[]
  /** 历史压缩相关（可选） */
  compression?: {
    beforeTokens: number
    afterTokens: number
    mode: 'none' | 'incremental' | 'fresh'
    durationMs: number
  }
  /** 工具结果截断相关（可选） */
  toolCompaction?: {
    /** 原始总 token */
    beforeTokens: number
    /** 截断后总 token */
    afterTokens: number
    /** 被降级的工具名 */
    compactedTools: string[]
  }
}
