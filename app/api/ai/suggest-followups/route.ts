import { NextResponse } from 'next/server'
import { guardAiQuota } from '@/lib/api/ai-quota-guard'
import { adaptChatRequestBody } from '@/lib/ai/provider-body-adapter'
import { IS_DESKTOP_APP } from '@/lib/desktop-mode'
import { resolveRequestedModel, buildModelCandidates } from '@/lib/ai/effective-model'
import {
  resolveProvider,
  normalizeOpenAIChatCompletionsUrl,
  readProvidersConfig,
} from '@/lib/ai/provider-resolver'

export const runtime = 'nodejs'

/**
 * 根据最近一次 AI 回复 + 用户上文，自动推断出 3 条用户可能想问的追问。
 *
 * 请求体：{ apiKey?, apiUrl?, model?, lastUser, lastAssistant, history? }
 *   · `model` = **用户当前在模型选择器里选的模型**（与主对话 /api/chat 同一个值）；
 *     缺省 / 'auto' 时才由服务端从 providers 配置解析默认模型。
 * 响应体：{ suggestions: string[] }
 *
 * 🚨 模型解析**必须与 /api/chat 完全同一条链路**（resolveProvider + resolveDefaultModelId），
 *    绝不能在这里自行写死某个模型名 —— 否则用户在界面上换了模型，提示集仍按旧模型生成。
 */
export async function POST(req: Request) {
  try {
    const { apiKey: userApiKey, apiUrl: userApiUrl, model: userModel, enableReasoning, lastUser, lastAssistant, history } = await req.json() as {
      apiKey?: string
      apiUrl?: string
      model?: string
      /** 与主对话 enableReasoning 同源；未传时按 AI 助手页面的默认值 true 处理 */
      enableReasoning?: boolean
      lastUser?: string
      lastAssistant?: string
      history?: { role: string; content: string }[]
    }

    if (!lastAssistant && !lastUser) {
      return NextResponse.json({ error: 'Conversation context is required' }, { status: 400 })
    }

    // 🎯 模型 / 供应商解析：与主对话 /api/chat **完全相同**的一条链路
    //    用户当前选择的模型 → providers 配置（admin）→ 系统 env。这里不再硬编码任何模型名。
    //    🚨 `auto` 必须走 lib/ai/effective-model 的共享决策（reasoning 模型优先），
    //       否则会和主对话挑到不同的模型 —— 那正是「提示集没跟随所选模型」的根因。
    const providersConfig = await readProvidersConfig()
    const normalizedUserUrl = userApiUrl ? normalizeOpenAIChatCompletionsUrl(userApiUrl) : undefined
    const isByok = !!(userApiKey || userApiUrl)
    const { model: effectiveModel, degraded, reason } = await resolveRequestedModel({
      model: userModel,
      enableReasoning: enableReasoning !== false,
      isByok,
      cfg: providersConfig,
    })
    if (degraded) console.warn('[suggest-followups]', reason)

    // 🩹 候选模型链：首选 = 用户所选模型；平台托管模式下再备几个平台模型，
    //    逐个尝试直到出结果 —— 单次失败就整个功能静默失效（历史上是"永远那三条通用文案"）
    //    的体验太差。BYOK 时只有首选（用户的端点只认他自己的模型）。
    const candidates = buildModelCandidates({
      primary: effectiveModel,
      cfg: providersConfig,
      enableReasoning: enableReasoning !== false,
      allowFallback: !isByok,
      max: 6,
    })

    const resolved = await resolveProvider(candidates[0], userApiKey, normalizedUserUrl)

    if (!resolved && !userApiKey) {
      return NextResponse.json(
        { error: 'No AI provider configured for follow-up suggestions. Please add a provider in admin settings.' },
        { status: 503 },
      )
    }

    // 🔥 额度守卫：口径与 /api/chat 的 useSystemKey 完全一致 ——
    //   · 桌面端整体豁免（本地运行 + BYOK，平台积分/会员体系不适用；2026-09-14 实测 403 后定稿）
    //   · 用户自带 key（user-custom / 未匹配到平台 provider）不检查积分，只要求登录
    //   · 只有确实烧平台 key 才检查
    //   🚨 少了这层豁免，桌面端用户（向导把 key 存进服务端 providers、前端不带 apiKey）
    //      会在提示集上恒被 403 打回 fallback —— 表现为"提示集永远是那三条硬编码文案"。
    const useSystemKey = !IS_DESKTOP_APP && (!userApiKey || (!!resolved && resolved.providerId !== 'user-custom'))
    const guard = await guardAiQuota({ skipCreditCheck: !useSystemKey })
    if (!guard.ok) return guard.response

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

    // 统一走 OpenAI 兼容的 /chat/completions —— resolveProvider 返回的 baseUrl
    // 已经规范化到该端点（DashScope 自动收敛到 compatible-mode），无需再分支判断厂商。

    // 依次尝试候选链里的模型；第一个出结果的就用它。
    let lastError = { status: 502, body: 'all candidates failed' }
    let suggestions: string[] = []
    let usedModel = candidates[0] || ''

    for (const candidate of candidates) {
      const r = await resolveProvider(candidate, userApiKey, normalizedUserUrl)
      const key = r ? r.apiKey : (userApiKey || '')
      const url = r ? r.baseUrl : (normalizedUserUrl || '')
      if (!key || !url) continue

      const requestBody = {
        model: candidate,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        temperature: 0.8,
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(adaptChatRequestBody(requestBody, { baseUrl: url, model: candidate })),
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        lastError = { status: response.status, body: body.slice(0, 200) }
        console.warn(`[suggest-followups] model "${candidate}" failed (${response.status})`)
        continue
      }

      const data = await response.json()
      let raw = data.choices?.[0]?.message?.content || ''
      if (!raw) {
        // 兜底：少数网关把内容放在 output.choices（DashScope 原生格式）
        raw = data.output?.choices?.[0]?.message?.content || ''
      }
      const list = parseJsonArray(raw)
      if (list.length > 0) {
        suggestions = list
        usedModel = candidate
        break
      }
      lastError = { status: 502, body: `unparsable: ${raw.slice(0, 120)}` }
    }

    if (suggestions.length === 0) {
      return NextResponse.json(
        { error: `API Error: ${lastError.status} - ${lastError.body}`, tried: candidates },
        { status: lastError.status },
      )
    }

    // 与 /api/ai/daily-insight 统一口径：降级/回退必须带 reason。
    // 否则前端只会看到「提示集是兜底文案」，分不清是「模型名没解析到」还是「上游额度耗尽」。
    const fellBack = usedModel !== effectiveModel
    return NextResponse.json({
      suggestions,
      model: usedModel,
      degraded: fellBack || degraded,
      ...(fellBack || degraded
        ? {
            reason:
              reason ??
              (fellBack
                ? `primary "${effectiveModel}" unavailable → fell back to "${usedModel}"`
                : 'unknown'),
          }
        : {}),
    })
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
