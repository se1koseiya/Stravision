import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const appId = process.env.QQ_CLIENT_ID
  
  if (!appId) {
    return NextResponse.json({ error: "未配置 QQ_CLIENT_ID" }, { status: 500 })
  }

  const url = new URL(req.url)
  // 优先使用环境变量中的 APP_URL (适用于云服务器/容器环境)
  const origin = process.env.APP_URL || url.origin
  // 回调地址必须与 QQ 互联后台配置的一致
  const redirectUri = `${origin}/api/auth/qq/callback`
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)

  // QQ 登录授权地址
  const qqUrl = `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${state}&scope=get_user_info`

  const res = NextResponse.redirect(qqUrl)
  
  // 存储 state 以防止 CSRF
  res.cookies.set("qq_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  })
  
  return res
}
