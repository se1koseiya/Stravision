/**
 * 上下文工程层（Context Engineering Layer）
 *
 * 统一入口。这一层回答四个问题：
 *   1. **装什么** → ContextBuilder（段位化装配，替代散落各处的字符串拼接）
 *   2. **装多少** → budget（token 预算分配，替代写死的字符阈值）
 *   3. **怎么省** → ToolResultCompactor（工具结果分级截断）+ history-compressor（历史分级压缩）
 *   4. **装了多少** → telemetry（埋点，让膨胀可见）
 *
 * 设计约束（与项目铁律一致）：
 *   - 纯函数为主，不做 IO、不碰 DB —— 可被 vitest 直接跑，也不引入新的加载顺序依赖。
 *   - 输出保持与 route.ts 旧逻辑兼容（systemPrompt 语义等价、<PAST_MEMORY> 协议不变）。
 */

export type {
  ContextTier,
  ContextStability,
  ContextSection,
  ContextBudget,
  AssembledContext,
  ContextTelemetry,
} from './types'

export {
  estimateContextTokens,
  estimateMessagesTokens,
  stripBinaryPayload,
} from './token-estimator'

export {
  buildContextBudget,
  getInputBudget,
  getTierBudget,
  resolveModelWindow,
  truncateToBudget,
} from './budget'

// 用户可自定义的上下文偏好（纯函数：取值 / 归一化 / 派生，无 IO）
// 服务端读写见 lib/db/context-prefs-service.ts（含 pg，不进客户端 bundle）
export {
  DEFAULT_USER_CONTEXT_PREFS,
  CONTEXT_PREFS_KEYS,
  CONTEXT_WINDOW_PRESETS,
  MIN_WINDOW_TOKENS,
  MAX_WINDOW_TOKENS,
  MIN_TRIGGER_RATIO,
  MAX_TRIGGER_RATIO,
  normalizeUserContextPrefs,
  windowTokensFromPreset,
  presetFromWindowTokens,
  resolvePrefsWindow,
  contextBudgetOverride,
  compressionConfigFrom,
  effectiveInputBudget,
  compressionTriggerTokens,
  isWindowClamped,
  type UserContextPrefs,
} from './context-prefs'

export {
  buildContext,
  inputBudgetFor,
  type ContextInput,
} from './context-builder'

export {
  compactToolResult,
  compactMultimodalMetadata,
  summarizeCompactions,
  COMPACTION_THRESHOLDS,
  type CompactionLevel,
  type CompactionResult,
} from './tool-result-compactor'

export {
  planCompression,
  stringifyMessages,
  messageText,
  buildSummaryPrompt,
  normalizeSummary,
  extractPastMemory,
  buildCompressedMessages,
  isCompressionSufficient,
  STRUCTURED_OUTPUT_SPEC,
  DEFAULT_COMPRESSION,
  // 「压缩过程可见」：把真实计量留痕成一条提示消息，由前端渲染成卡片
  buildCompressionNoticeMessage,
  parseCompressionStats,
  CONTEXT_COMPRESSED_TAG,
  type CompressionConfig,
  type CompressionPlan,
  type CompressionStats,
} from './history-compressor'

export {
  buildTelemetry,
  logContextTelemetry,
  snapshotContext,
  categorizeContext,
  type ContextCategoryKey,
  type ContextCategoryUsage,
  type ContextCarveOut,
} from './telemetry'
