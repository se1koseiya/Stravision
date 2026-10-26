import { NextResponse } from 'next/server'
import { guardAiQuota } from '@/lib/api/ai-quota-guard'
import { adaptChatRequestBody } from '@/lib/ai/provider-body-adapter'
import { IS_DESKTOP_APP } from '@/lib/desktop-mode'
import {
  resolveProvider,
  normalizeOpenAIChatCompletionsUrl,
  readProvidersConfig,
  resolveDefaultModelId,
} from '@/lib/ai/provider-resolver'
import {
  CONVERSATION_TITLE_MAX_LEN,
  fallbackConversationTitle,
} from '@/lib/ai/conversation-title'

export const runtime = 'nodejs'

/**
 * 对话总结（= 对话标题）生成。
 *
 * 「用户一开始对话就总结其意图，并作为标题」—— 侧栏「最近对话」列表、悬浮在顶栏的
 * 对话总结胶囊，用的都是这里产出的那一句。
 *
 * 请求体：{ apiKey?, apiUrl?, model?, messages: {role,content}[], maxLen? }
 *   · `model` = **用户当前在模型选择器里选的模型**（与主对话 /api/chat 同一个值）；
 *     缺省 / 'auto' 时才由服务端从 providers 配置解析默认模型。
 * 响应体：{ title: string }
 *
 * 🚨 模型解析必须与 /api/chat / suggest-followups 走**完全同一条链路**
 *    （resolveProvider + resolveDefaultModelId + guardAiQuota 的 useSystemKey 口径），
 *    绝不能在这里写死某个模型名 —— 否则用户换了模型，总结仍按旧模型生成。
 */
export async function POST(req: Request) {
  try {
    const {
      apiKey: userApiKey,
      apiUrl: userApiUrl,
      model: userModel,
      messages,
      maxLen,
    } = (await req.json()) as {
      apiKey?: string
      apiUrl?: string
      model?: string
      messages?: { role?: string; content?: unknown }[]
      maxLen?: number
    }

    const transcript = buildTranscript(messages)
    if (!transcript.firstUser) {
      return NextResponse.json({ error: 'Conversation context is required' }, { status: 400 })
    }

    // 目标长度：默认 16 字（中文短标题的舒适区），夹在 6~24 之间
    const limit = Math.min(
      Math.max(Number(maxLen) || CONVERSATION_TITLE_MAX_LEN, 6),
      24
    )

    // 🎯 模型 / 供应商解析：与 /api/chat 完全相同的一条链路
    let effectiveModel = (userModel || '').trim() || 'auto'
    if (effectiveModel === 'auto') {
      const providersConfig = await readProvidersConfig()
      effectiveModel = resolveDefaultModelId(providersConfig) || 'auto'
    }

    const normalizedUserUrl = userApiUrl ? normalizeOpenAIChatCompletionsUrl(userApiUrl) : undefined
    const resolved = await resolveProvider(effectiveModel, userApiKey, normalizedUserUrl)

    let apiKey = ''
    let targetUrl = ''
    if (userApiKey && !resolved) {
      apiKey = userApiKey
      targetUrl = normalizedUserUrl || ''
    } else if (resolved) {
      apiKey = resolved.apiKey
      targetUrl = resolved.baseUrl
    }

    // 无可用供应商 → 直接把「截断首句」当标题返回（前端不必再兜一层）
    if (!apiKey || !targetUrl) {
      return NextResponse.json({
        title: fallbackConversationTitle(transcript.firstUser, limit),
        fallback: true,
        reason: 'no-provider',
      })
    }

    // 🔥 额度守卫：口径与 /api/chat 的 useSystemKey 完全一致（桌面端整体豁免）
    const useSystemKey = !IS_DESKTOP_APP && (!userApiKey || (!!resolved && resolved.providerId !== 'user-custom'))
    const guard = await guardAiQuota({ skipCreditCheck: !useSystemKey })
    if (!guard.ok) return guard.response

    const model = (
      resolved?.model && resolved.model !== 'auto'
        ? resolved.model
        : (process.env.SYSTEM_OPENAI_MODEL || effectiveModel)
    ).trim()

    const systemPrompt = `你是一名"对话标题生成器"。用户刚发起一轮新的对话，请用一句话概括「用户想让 AI 帮他做什么」，作为这次对话的标题。

要求：
1. **必须改写，禁止照抄**：标题里的字面串**不得是用户原话的前缀**。把口语改写成主题短语。
2. **极短**：不超过 ${limit} 个字（中文按字算），越短越好。
3. **名词短语或动宾短语**：不要疑问句、不要"我想""请问""帮我"这类口头语。
4. **不要标点**：结尾不写句号、问号、引号、书名号；不要换行。
5. **只输出标题本身**：不要解释、不要 JSON、不要 Markdown、不要加"标题："前缀。

示例：
· 用户「帮我看看 3 号温室的温度和湿度是不是不太对，草莓叶子有点发蔫」→ 3号温室温湿度排查
· 用户「大棚湿度 90% 要不要放风？」→ 高湿放风决策
· 用户「这是我拍的叶片照片，帮我看看是不是得病了」→ 叶片病害诊断

直接输出这一句话。`

    const userMessage = `【用户首条消息】\n${truncate(transcript.firstUser, 500)}\n\n【截至目前对话片段】\n${transcript.tail}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }

    const requestBody = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: false,
      temperature: 0.2,
      max_tokens: 64,
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(adaptChatRequestBody(requestBody, { baseUrl: targetUrl, model })),
    })

    if (!response.ok) {
      // 🚨 总结失败不能拖累主对话：降级成截断标题，仍然返回 200
      const body = await response.text().catch(() => '')
      console.warn(`[summarize-title] upstream ${response.status} model=${model}: ${body.slice(0, 200)}`)
      return NextResponse.json({
        title: fallbackConversationTitle(transcript.firstUser, limit),
        fallback: true,
        reason: `upstream-${response.status}`,
      })
    }

    const data = await response.json()
    let raw = data.choices?.[0]?.message?.content || ''
    if (!raw) raw = data.output?.choices?.[0]?.message?.content || ''

    const title = sanitizeTitle(raw, limit)
    if (!title) {
      return NextResponse.json({
        title: fallbackConversationTitle(transcript.firstUser, limit),
        fallback: true,
        reason: 'empty-completion',
      })
    }

    return NextResponse.json({ title })
  } catch (error: any) {
    console.error('Summarize title error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

/** 把 messages 摊平成「首条用户消息 + 最近的对话片段」 */
function buildTranscript(messages?: { role?: string; content?: unknown }[]): {
  firstUser: string
  tail: string
} {
  if (!Array.isArray(messages) || messages.length === 0) return { firstUser: '', tail: '' }

  const flat: { role: 'user' | 'assistant'; text: string }[] = []
  for (const m of messages) {
    const role = m?.role === 'assistant' ? 'assistant' : 'user'
    const text = contentToText(m?.content)
    if (!text) continue
    flat.push({ role, text })
  }

  const firstUser = flat.find((m) => m.role === 'user')?.text || ''
  // 只取最后 4 条（且每条截断）—— 标题生成不需要完整上下文，够判断意图即可
  const tail = flat
    .slice(-4)
    .map((m) => `${m.role === 'user' ? '用户' : 'AI'}：${truncate(m.text, 240)}`)
    .join('\n')

  return { firstUser, tail }
}

/** 多模态 content（数组）→ 纯文本（图片只留占位标记） */
function contentToText(content: unknown): string {
  if (typeof content === 'string') return content.replace(/\s+/g, ' ').trim()
  if (Array.isArray(content)) {
    const parts: string[] = []
    for (const p of content as { type?: string; text?: string }[]) {
      if (typeof p?.text === 'string' && p.text.trim()) parts.push(p.text.trim())
      else if (p?.type === 'image_url') parts.push('（图片）')
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim()
  }
  return ''
}

function truncate(s: string, max: number): string {
  if (!s) return ''
  return s.length > max ? s.slice(0, max) + '…' : s
}

/**
 * 清洗模型输出 → 单行短标题。
 * 容忍模型不听话的情况：加前缀、带引号、换行、Markdown 包装、超长。
 */
function sanitizeTitle(raw: string, limit: number): string {
  if (!raw) return ''
  let t = raw.trim()
  // 去掉 Markdown 代码块 / 粗体包装
  t = t.replace(/^```[\s\S]*?\n/, '').replace(/```$/g, '').trim()
  t = t.replace(/^\*+|\*+$/g, '').replace(/^#+\s*/, '').trim()
  // 去掉「标题：」「对话标题：」这类前缀
  t = t.replace(/^(对话)?标题\s*[:：]\s*/, '').trim()
  // 只保留第一行
  t = (t.split(/\r?\n/)[0] || '').trim()
  // 去掉首尾成对的引号 / 书名号 / 括号
  t = t.replace(/^["'“”‘’「『《（(]+/, '').replace(/["'“”‘’」』》）)]+$/, '').trim()
  // 去掉结尾标点（中英文）
  t = t.replace(/[。．.，,、；;：:！!？?~～\s]+$/g, '').trim()
  if (!t) return ''
  return t.length > limit ? t.slice(0, limit) : t
}
