import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * 根据最近一次 AI 回复 + 用户上文，自动推断出 3 条用户可能想问的追问。
 *
 * 请求体：{ apiKey?, apiUrl?, model?, lastUser, lastAssistant, history? }
 * 响应体：{ suggestions: string[] }
 *
 * 若用户未传入 apiKey，回退到系统环境变量 SYSTEM_OPENAI_API_KEY / SYSTEM_OPENAI_API_URL。
 */
export async function POST(req: Request) {
  try {
    const { apiKey: userApiKey, apiUrl: userApiUrl, model: userModel, lastUser, lastAssistant, history } = await req.json() as {
      apiKey?: string
      apiUrl?: string
      model?: string
      lastUser?: string
      lastAssistant?: string
      history?: { role: string; content: string }[]
    }

    if (!lastAssistant && !lastUser) {
      return NextResponse.json({ error: 'Conversation context is required' }, { status: 400 })
    }

    // 解析 API 配置：用户配置 > 系统环境变量
    const apiKey = (userApiKey || process.env.SYSTEM_OPENAI_API_KEY || '').trim()
    const apiUrl = (userApiUrl || process.env.SYSTEM_OPENAI_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions').trim()
    // 此任务使用快速/便宜模型，默认 qwen-turbo；用户显式传值才覆盖
    const model = (userModel || process.env.SYSTEM_OPENAI_MODEL || 'qwen-turbo').trim()

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 })
    }

    const systemPrompt = `你是一名"用户意图预测助手"。你的任务是根据 AI 助手最近一次回复以及用户的原始提问，推断出用户接下来最可能想问的 3 个追问。

要求：
1. **紧密结合语境**：追问必须与最近一次 AI 回复内容直接相关，是对当前回答的延伸、细化或操作请求。
2. **多样化**：3 条追问要角度不同——可以是要"进一步分析"、"换种表达/格式重写"、"基于内容执行某个操作（生成报告/控制设备/调整设置）"等。
3. **简短直接**：每条不超过 30 个字，祈使句或疑问句，直接表达用户想说的话。
4. **自然口语化**：像真人会问出来的话，不要生硬。
5. **不要复述原文**：不要把 AI 回答原样照搬，要提出新的问题或指令。

严格按如下 JSON 数组格式返回，不要任何解释、不要 Markdown 包装：
["追问1","追问2","追问3"]`

    // 构造上下文摘要（截断以节省 token）
    const userPart = lastUser ? `【用户上一条提问】\n${truncate(lastUser, 500)}` : ''
    const assistantPart = lastAssistant ? `【AI 助手最近一次回复】\n${truncate(lastAssistant, 1500)}` : ''
    const historyPart = Array.isArray(history) && history.length > 0
      ? `【更早的对话片段（最多 3 条）】\n${history.slice(-3).map(h => `${h.role === 'user' ? '用户' : 'AI'}：${truncate(h.content, 200)}`).join('\n')}`
      : ''

    const userMessage = `请基于以下对话预测用户接下来最可能想问的 3 个追问。\n\n${historyPart}\n\n${userPart}\n\n${assistantPart}`

    // 复用与 optimize-prompt 相同的请求结构
    let targetUrl = apiUrl || ''
    const isDashScope = apiUrl?.includes('dashscope.aliyuncs.com') || model?.startsWith('qwen')
    const isCompatibleMode = apiUrl?.includes('compatible-mode/v1') ?? false

    let requestBody: any
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }

    if (isDashScope && !isCompatibleMode) {
      requestBody = {
        model: model || 'qwen-plus',
        input: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        },
        parameters: { result_format: 'message' },
      }
    } else {
      if (/\/v1$/.test(targetUrl) && !/\/chat\/completions(\?|$)/.test(targetUrl)) {
        targetUrl = `${targetUrl}/chat/completions`
      }
      requestBody = {
        model: model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        temperature: 0.8,
      }
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: `API Error: ${response.status} - ${error}` }, { status: response.status })
    }

    const data = await response.json()

    let raw = ''
    if (isDashScope && !isCompatibleMode) {
      raw = data.output?.choices?.[0]?.message?.content || ''
    } else {
      raw = data.choices?.[0]?.message?.content || ''
    }

    const suggestions = parseJsonArray(raw)
    if (suggestions.length === 0) {
      return NextResponse.json({ error: 'Failed to parse suggestions', raw }, { status: 502 })
    }

    return NextResponse.json({ suggestions })
  } catch (error: any) {
    console.error('Suggest followups error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

function truncate(s: string, max: number): string {
  if (!s) return ''
  return s.length > max ? s.slice(0, max) + '…' : s
}

/** 从模型返回中解析 JSON 数组，容忍 Markdown 包装 / 杂讯。 */
function parseJsonArray(raw: string): string[] {
  if (!raw) return []
  let text = raw.trim()
  // 去掉 ```json / ``` 包装
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  // 提取首个 [ ... ] 段
  const m = text.match(/\[[\s\S]*\]/)
  if (m) text = m[0]
  try {
    const arr = JSON.parse(text)
    if (!Array.isArray(arr)) return []
    return arr
      .map((x) => (typeof x === 'string' ? x.trim() : ''))
      .filter((x) => x.length > 0)
      .slice(0, 3)
  } catch {
    return []
  }
}
