/**
 * Copilot 页面上下文快照的 sessionStorage key
 *
 * 业务页悬浮球 → 展开侧栏时把页面实时快照写入，
 * useCopilotChat 首条消息注入 systemPrompt 后即删（一次性上下文）。
 */
export const PAGE_CONTEXT_KEY = "ai_page_context"
