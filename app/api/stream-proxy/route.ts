import { NextResponse } from "next/server"
import { assertSafeUrl } from "@/lib/security/ssrf-guard"

export const runtime = "nodejs"

function rewriteM3u8(content: string, baseUrl: string) {
  const base = new URL(baseUrl)
  const lines = content.split(/\r?\n/)
  const rewritten = lines.map((line) => {
    if (!line) return line

    const replacedAttr = line.replace(/URI="([^"]+)"/g, (_m, uriRaw) => {
      try {
        const resolved = new URL(uriRaw, base).toString()
        return `URI="/api/stream-proxy?url=${encodeURIComponent(resolved)}"`
      } catch {
        return `URI="${uriRaw}"`
      }
    })

    if (replacedAttr.startsWith("#")) return replacedAttr

    try {
      const resolved = new URL(replacedAttr, base).toString()
      return `/api/stream-proxy?url=${encodeURIComponent(resolved)}`
    } catch {
      return replacedAttr
    }
  })

  return rewritten.join("\n")
}

function extractRealStreamUrl(url: string): string {
  if (!/player\.xstrive\.com\/video\/live/i.test(url)) return url
  try {
    const safeDecode = (value: string) => {
      try { return decodeURIComponent(value) } catch { return value }
    }
    const qIndex = url.indexOf("?")
    if (qIndex < 0) return url
    const query = url.slice(qIndex + 1)
    const lower = query.toLowerCase()
    let start = lower.indexOf("videourl=")
    
    // 修正索引逻辑：start 是相对于 query 的索引
    while (start !== -1 && start > 0 && query[start - 1] !== "&") {
      start = lower.indexOf("videourl=", start + 1)
    }
    
    if (start === -1) return url
    const valueStart = start + "videourl=".length
    const after = query.slice(valueStart)
    const parts = after.split("&")
    
    // xstrive 播放器特定的停顿参数
    const stopKeys = new Set(["islive", "ismute", "aspect", "lang", "autoplay", "from", "player", "t", "ts"])
    const videoParts: string[] = []
    for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        const eq = p.indexOf("=")
        const key = eq >= 0 ? p.slice(0, eq).toLowerCase() : ""
        if (i > 0 && key && stopKeys.has(key)) break
        videoParts.push(p)
    }
    const realStreamUrl = safeDecode(videoParts.join("&"))
    console.log(`[Stream Proxy] Unwrapped URL: ${realStreamUrl}`)
    return realStreamUrl
  } catch { return url }
}

function isAllowedHost(host: string) {
  // 已由 assertSafeUrl 做完整的内网/保留 IP 校验，此处仅保留兼容占位
  const h = host.toLowerCase()
  if (h === "localhost" || h === "127.0.0.1") return false
  return true
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawUrl = searchParams.get("url") ?? ""
  if (!rawUrl) return NextResponse.json({ error: "Missing url" }, { status: 400 })

  const raw = extractRealStreamUrl(rawUrl)

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 })
  }

  if (!(target.protocol === "http:" || target.protocol === "https:")) {
    return NextResponse.json({ error: "Unsupported protocol" }, { status: 400 })
  }

  // SSRF 防护：解析主机名 DNS 并校验所有 IP 均非内网/保留地址，
  // 阻止访问 169.254.169.254 元数据端点、127.0.0.1、10.x、192.168.x 等
  const safeCheck = await assertSafeUrl(target.toString())
  if (!safeCheck.ok) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 })
  }

  if (!isAllowedHost(target.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 })
  }

  const reqHeaders = new Headers()
  const range = req.headers.get("range")
  if (range) reqHeaders.set("range", range)
  reqHeaders.set("user-agent", "Mozilla/5.0")
  reqHeaders.set("accept", "*/*")
  reqHeaders.set("referer", "https://player.xstrive.com/")
  reqHeaders.set("origin", "https://player.xstrive.com")

  // 使用 redirect: "manual" 防止重定向绕过 SSRF 校验，
  // 对每个重定向 Location 重新走 assertSafeUrl 校验
  let currentUrl = target.toString()
  let upstream = await fetch(currentUrl, {
    redirect: "manual",
    headers: reqHeaders
  })

  // 跟随重定向（最多 5 跳），每跳重新校验目标 URL
  let hopCount = 0
  while ([301, 302, 303, 307, 308].includes(upstream.status) && hopCount < 5) {
    const location = upstream.headers.get("location")
    if (!location) break
    const nextUrl = new URL(location, currentUrl).toString()
    const nextSafe = await assertSafeUrl(nextUrl)
    if (!nextSafe.ok) {
      return NextResponse.json({ error: "Redirect target not allowed" }, { status: 403 })
    }
    currentUrl = nextUrl
    upstream = await fetch(currentUrl, {
      redirect: "manual",
      headers: reqHeaders
    })
    hopCount++
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream"
  const finalUrl = new URL(currentUrl)
  const isM3u8 = finalUrl.pathname.toLowerCase().endsWith(".m3u8") || contentType.includes("application/vnd.apple.mpegurl") || contentType.includes("application/x-mpegurl")

  if (isM3u8) {
    const text = await upstream.text()
    const rewritten = rewriteM3u8(text, finalUrl.toString())
    return new Response(rewritten, {
      status: upstream.status,
      headers: {
        "content-type": "application/vnd.apple.mpegurl; charset=utf-8",
        "cache-control": "no-store"
      }
    })
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
      ...(range ? { "accept-ranges": "bytes" } : {})
    }
  })
}
