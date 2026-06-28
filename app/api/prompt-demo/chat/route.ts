export const runtime = 'nodejs'

import { getCurrentUser } from '@/lib/auth'
import { getUserAiQuota } from '@/lib/db/ai-quota-service'

function trimQuotes(value: unknown): string {
  const s = String(value ?? "").trim()
  return s.replace(/^['"]+/, "").replace(/['"]+$/, "").trim()
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messages, model, apiKey: rawApiKey, apiUrl: rawApiUrl } = await req.json()

    let apiKey = trimQuotes(rawApiKey)
    let targetUrl = trimQuotes(rawApiUrl)

    const useSystemKey = !apiKey && !rawApiUrl

    if (useSystemKey) {
      const quota = await getUserAiQuota(user.id as number)
      if (!quota.can_use) {
        const reason = quota.reason === 'membership_required'
          ? 'AI 功能仅限 Pro/Plus 会员使用'
          : quota.reason === 'limit_reached'
            ? '今日配额已用完'
            : '余额不足';
        return Response.json({ error: reason, quota }, { status: 403 })
      }

      apiKey = process.env.SYSTEM_OPENAI_API_KEY || ""
      const systemBaseUrl = process.env.SYSTEM_OPENAI_BASE_URL || ""

      if (systemBaseUrl) {
        targetUrl = systemBaseUrl.replace(/\/$/, "") + "/chat/completions"
      }

      if (!apiKey) {
        return Response.json({ error: "System AI service is not configured." }, { status: 503 })
      }
    }

    if (!apiKey) {
      return Response.json({ error: "API Key is required." }, { status: 400 })
    }

    if (!targetUrl) {
      targetUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    } else {
      targetUrl = targetUrl.replace(/\/$/, "")
      if (!targetUrl.includes("/chat/completions")) {
        targetUrl = targetUrl + "/chat/completions"
      }
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || "qwen-plus",
        messages: messages,
        stream: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return Response.json({ error: errorText || `API Error: ${response.status}` }, { status: response.status })
    }

    const stream = response.body
    if (!stream) {
      return Response.json({ error: "No response body" }, { status: 500 })
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    })
  } catch (error: any) {
    console.error("Prompt Demo API Error:", error)
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}