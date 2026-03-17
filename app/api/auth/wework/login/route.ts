import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const corpId = process.env.WEWORK_CORP_ID
  const agentId = process.env.WEWORK_AGENT_ID
  
  if (!corpId || !agentId) {
    return NextResponse.json({ error: "未配置 WEWORK_CORP_ID 或 WEWORK_AGENT_ID" }, { status: 500 })
  }

  const url = new URL(req.url)
  // 优先使用环境变量中配置的 PUBLIC_URL，如果没有则使用请求的 origin
  // 这对于部署在反向代理后面或需要指定域名的情况很有用
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)
  const redirectUri = `${origin}/api/auth/wework/callback`

  const weworkUrl = `https://open.work.weixin.qq.com/wwopen/sso/qrConnect?appid=${corpId}&agentid=${agentId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${state}`

  const res = NextResponse.redirect(weworkUrl)
  res.cookies.set("wework_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300, // 5 minutes
  })
  return res
}
