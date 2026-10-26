/**
 * 对话总结（= 对话标题）—— 前后端共用的薄封装。
 *
 * 分工：
 *  · 服务端：app/api/ai/summarize-title/route.ts —— 用「用户当前选择的模型」把
 *    用户意图压成一句话标题。模型解析/额度守卫与 /api/chat 同一条链路。
 *  · 客户端：本文件的 {@link summarizeConversationTitle} —— 在「用户开始一轮新对话」时
 *    调一次，拿到标题后由调用方 PATCH 到 /api/sessions/:id。
 *
 * 服务端为什么也要用这里的 {@link fallbackConversationTitle}：
 * 模型没配 / 上游报错时不能拖垮主流程，统一降级成「首句截断」，让标题永远有值。
 */

/** 标题最大字数（中文按字算）—— 与 route.ts 的默认值保持一致 */
export const CONVERSATION_TITLE_MAX_LEN = 16

/** 兜底标题：首句截断（模型未配置 / 调用失败 / 尚未生成时的占位） */
export function fallbackConversationTitle(
  text: string,
  limit: number = CONVERSATION_TITLE_MAX_LEN
): string {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  if (!t) return '新对话'
  return t.length > limit ? t.slice(0, limit) : t
}

export interface SummarizeConversationTitleOptions {
  /**
   * 🎯 用户**当前选择的模型**（与主对话 /api/chat 同一个值）。
   * 为空时服务端才回落到 providers 配置的默认模型 —— 不要在这里替用户选模型。
   */
  model?: string
  /** 用户的 AI 配置（localStorage "ai-settings"）；为空则服务端用系统 key */
  apiKey?: string
  apiUrl?: string
  /** 标题最大字数 */
  maxLen?: number
  /** 中止信号（会话被切走 / 组件卸载时中止） */
  signal?: AbortSignal
}

/**
 * 让 AI 用一句话概括「用户想让 AI 帮他做什么」，作为对话标题。
 *
 * 失败（网络异常 / 非 2xx / 返回空）时返回 null —— 调用方保留原占位标题即可，
 * **绝不抛异常**：标题生成是锦上添花，不能拖累主对话。
 */
export async function summarizeConversationTitle(
  messages: { role?: string; content?: unknown }[],
  opts: SummarizeConversationTitleOptions = {}
): Promise<string | null> {
  if (!Array.isArray(messages) || messages.length === 0) return null
  try {
    const res = await fetch('/api/ai/summarize-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl,
        model: (opts.model || '').trim() || undefined,
        maxLen: opts.maxLen ?? CONVERSATION_TITLE_MAX_LEN,
        messages,
      }),
      signal: opts.signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    const title = typeof data?.title === 'string' ? data.title.trim() : ''
    return title || null
  } catch {
    return null
  }
}
