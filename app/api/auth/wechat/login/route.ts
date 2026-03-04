import { NextResponse } from "next/server"

export async function GET(req: Request) {
  // 尝试获取不同环境的配置
  // WECHAT_OFFICIAL_APP_ID: 微信公众号 AppID (用于微信内访问)
  // WECHAT_OPEN_APP_ID: 微信开放平台 AppID (用于 PC/外部浏览器访问)
  
  // 只有当明确配置了 WECHAT_OFFICIAL_APP_ID 时，才在微信内启用公众号登录流程
  const officialAppId = process.env.WECHAT_OFFICIAL_APP_ID?.trim()
  const openAppId = process.env.WECHAT_OPEN_APP_ID?.trim()
  
  const userAgent = req.headers.get("user-agent") || ""
  // Check if running in WeChat client
  const isWeChat = /MicroMessenger/i.test(userAgent)

  // 打印调试信息，帮助定位 ID 问题
  console.log('WeChat Login Debug:', {
    isWeChat,
    officialAppId: officialAppId ? `${officialAppId.slice(0, 4)}***` : 'missing',
    openAppId: openAppId ? `${openAppId.slice(0, 4)}***` : 'missing',
    usedAppId: (isWeChat && officialAppId) ? officialAppId : openAppId,
    timestamp: new Date().toISOString()
  })

  if (!officialAppId && !openAppId) {
    return NextResponse.json({ error: "未配置 WECHAT_APP_ID" }, { status: 500 })
  }

  const url = new URL(req.url)
  // 优先使用环境变量中的 APP_URL (适用于云服务器/容器环境)
  const origin = process.env.APP_URL || url.origin
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)
  const redirectUri = `${origin}/api/auth/wechat/callback`

  let wechatUrl: string
  let loginType: 'official' | 'open'

  // 只有在微信环境且明确配置了公众号 ID 时，才使用公众号 OAuth
  if (isWeChat && officialAppId) {
    // 微信环境：使用公众号 OAuth (snsapi_userinfo)
    loginType = 'official'
    wechatUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${officialAppId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`
  } else {
    // 其他情况（PC、外部浏览器、或未配置公众号ID的微信环境）：使用开放平台 QR Login
    // 注意：微信内也可以打开 QR Login 页面，虽然体验不如 OAuth 流畅，但能解决 Scope 问题
    loginType = 'open'
    // 确保使用 snsapi_login
    wechatUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${openAppId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`
  }

  // 打印最终生成的 URL，方便调试
  console.log('Generated WeChat URL:', wechatUrl)

  const res = NextResponse.redirect(wechatUrl)
  
  // 存储 state 和 登录类型，以便 callback 知道使用哪个 AppID/Secret 验证
  res.cookies.set("wx_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  })
  
  res.cookies.set("wx_login_type", loginType, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  })
  
  return res
}
