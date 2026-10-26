import { assertSafeUrl } from "@/lib/security/ssrf-guard"
import { getCurrentUser } from "@/lib/auth"
import { adaptChatRequestBody } from "@/lib/ai/provider-body-adapter"

export async function POST(req: Request) {
  // 认证：必须登录才能调用（防止匿名 SSRF）
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { messages, apiKey, apiUrl, model, systemPrompt, enableSearch } = await req.json()
    if (!apiKey) {
      return Response.json({ error: "API Key is required" }, { status: 400 })
    }
    const isDashScope = apiUrl?.includes("dashscope.aliyuncs.com") || model?.startsWith("qwen")
    const isCompatibleMode = apiUrl?.includes("compatible-mode/v1") ?? false
    let targetUrl = apiUrl || ""
    if (isDashScope && isCompatibleMode) {
      if (/\/v1$/.test(targetUrl) && !/\/chat\/completions(\?|$)/.test(targetUrl)) {
        targetUrl = `${targetUrl}/chat/completions`
      }
    }

    // SSRF 防护：apiUrl 由请求方提供，必须校验协议 + 内网 IP，
    // 阻止指向 169.254.169.254 元数据端点或内网服务。
    // 由于响应体会回显给客户端，此处盲 SSRF 会升级为完整内容泄露。
    if (targetUrl) {
      const safeCheck = await assertSafeUrl(targetUrl)
      if (!safeCheck.ok) {
        return Response.json({ error: "API URL not allowed" }, { status: 403 })
      }
    }

    const citationOnlyInstruction =
      "仅返回 <SOURCES> 与 </SOURCES> 包裹的 JSON 数组，数组项包含 number、title、url、description、quote。url 必须为真实可访问的 http/https 链接，来源必须来自联网检索结果，不得编造，不要返回正文。"
    const fullMessages = [
      { role: "system", content: `${systemPrompt || "你是一个有帮助的AI助手。"}\n\n${citationOnlyInstruction}` },
      ...(Array.isArray(messages) ? messages : []),
      { role: "user", content: "请仅返回<SOURCES>JSON，不要返回正文。" },
    ]
    let requestBody: Record<string, unknown>
    if (isDashScope && isCompatibleMode) {
      requestBody = {
        model: model || "qwen3-max",
        messages: fullMessages,
        temperature: 0,
        ...(enableSearch ? { enable_search: true, search_strategy: "agent" } : {}),
      }
    } else if (isDashScope) {
      requestBody = {
        model: model || "qwen-turbo",
        input: { messages: fullMessages },
        parameters: { result_format: "message" },
      }
    } else {
      requestBody = {
        model: model || "gpt-3.5-turbo",
        messages: fullMessages,
        temperature: 0,
      }
    }
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    headers["Authorization"] = `Bearer ${apiKey}`
    const resp = await fetch(targetUrl, { method: "POST", headers, body: JSON.stringify(adaptChatRequestBody(requestBody, { baseUrl: targetUrl, model })) })
    if (!resp.ok) {
      const t = await resp.text()
      return Response.json({ error: `API Error: ${resp.status} - ${t}` }, { status: resp.status })
    }
    const data = await resp.json()
    const content: string = data?.choices?.[0]?.message?.content ?? data?.output?.choices?.[0]?.message?.content ?? ""
    const m = content.match(/<SOURCES>\s*([\s\S]*?)\s*<\/SOURCES>/)
    let arr: unknown[] = []
    if (m && m[1]) {
      try {
        const parsed = JSON.parse(m[1])
        if (Array.isArray(parsed)) arr = parsed
      } catch {}
    }
    const toStr = (v: unknown) => (typeof v === "string" ? v.trim() : undefined)
    const pickUrlFromText = (s?: string) => {
      if (!s) return undefined
      const r1 = s.match(/https?:\/\/[^\s)]+/i)
      if (r1) return r1[0]
      const r2 = s.match(/\b([a-z0-9.-]+\.[a-z]{2,})(\/[^\s)]*)?/i)
      return r2 ? `https://${r2[0]}` : undefined
    }
    type Citation = { number: string; title: string; url: string; description?: string; quote?: string }
    const raw: Citation[] = arr.map((v) => {
      if (typeof v !== "object" || v === null) return null as unknown as Citation
      const o = v as Record<string, unknown>
      const num = String((o.number as string | number | undefined) ?? "1")
      const title = toStr(o.title) ?? toStr(o.url) ?? ""
      let u = toStr(o.url) ?? toStr(o.href) ?? toStr(o.link) ?? toStr(o.source) ?? toStr(o.website) ?? toStr(o.page) ?? toStr(o.page_url) ?? toStr(o.origin) ?? toStr(o.source_url) ?? toStr(o.openUrl) ?? undefined
      if (!u) u = pickUrlFromText(title) ?? pickUrlFromText(toStr(o.description)) ?? pickUrlFromText(toStr(o.quote))
      const description = toStr(o.description)
      const quote = toStr(o.quote)
      if (!u) return null as unknown as Citation
      if (!/^https?:\/\//i.test(u)) u = `https://${u}`
      return { number: num, title: String(title || u), url: String(u), description, quote }
    }).filter((x: Citation | null): x is Citation => !!x)
    const verifyUrl = async (u: string) => {
      try { new URL(u) } catch { return null }
      // SSRF 防护：verifyUrl 抓取 AI 生成的 URL，可能被提示注入控制，
      // 必须校验目标 IP 非内网/元数据地址
      const safeCheck = await assertSafeUrl(u)
      if (!safeCheck.ok) return null
      const ac = new AbortController()
      const to = setTimeout(() => ac.abort(), 7000)
      try {
        // 使用 manual 重定向，逐跳校验，防止重定向绕过
        const r = await fetch(u, { method: "GET", redirect: "manual", cache: "no-store", signal: ac.signal })
        clearTimeout(to)
        // 对 3xx 重定向，校验 Location 后跟随（最多 3 跳）
        let currentUrl = u
        let resp = r
        let hops = 0
        while ([301, 302, 303, 307, 308].includes(resp.status) && hops < 3) {
          const location = resp.headers.get("location")
          if (!location) break
          const nextUrl = new URL(location, currentUrl).toString()
          const nextSafe = await assertSafeUrl(nextUrl)
          if (!nextSafe.ok) { clearTimeout(to); return null }
          currentUrl = nextUrl
          resp = await fetch(currentUrl, { method: "GET", redirect: "manual", cache: "no-store", signal: ac.signal })
          hops++
        }
        if (resp.ok || (resp.status >= 300 && resp.status < 400)) return currentUrl
      } catch {}
      clearTimeout(to)
      return null
    }
    const out: Citation[] = []
    for (const c of raw) {
      const vu = await verifyUrl(c.url)
      if (vu) out.push({ ...c, url: vu })
    }
    return Response.json({ citations: out })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg || "Internal error" }, { status: 500 })
  }
}
