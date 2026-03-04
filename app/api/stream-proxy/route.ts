import { NextResponse } from "next/server"

export const runtime = "nodejs"

function isAllowedHost(host: string) {
  const h = host.toLowerCase()
  if (h === "localhost" || h === "127.0.0.1") return false
  return h.endsWith(".xstrive.com") || h.endsWith(".cloud.xstrive.com") || h === "xstrive.com"
}

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get("url") ?? ""
  if (!raw) return NextResponse.json({ error: "Missing url" }, { status: 400 })

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 })
  }

  if (!(target.protocol === "http:" || target.protocol === "https:")) {
    return NextResponse.json({ error: "Unsupported protocol" }, { status: 400 })
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

  const upstream = await fetch(target.toString(), {
    redirect: "follow",
    headers: reqHeaders
  })

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream"
  const isM3u8 = target.pathname.toLowerCase().endsWith(".m3u8") || contentType.includes("application/vnd.apple.mpegurl") || contentType.includes("application/x-mpegurl")

  if (isM3u8) {
    const text = await upstream.text()
    const rewritten = rewriteM3u8(text, target.toString())
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
