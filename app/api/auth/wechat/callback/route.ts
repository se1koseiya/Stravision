import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { findOrCreateWeChatUser } from "@/lib/db/user-service"
import { generateToken, setAuthCookie } from "@/lib/auth"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  
  const cookieStore = await cookies()
  const expectedState = cookieStore.get("wx_state")?.value
  const loginType = cookieStore.get("wx_login_type")?.value || 'open' // Default to open if not set
  
  // 根据登录类型选择对应的 AppID 和 Secret
  // 优先使用明确指定的环境变量
  const appId = loginType === 'official' 
    ? process.env.WECHAT_OFFICIAL_APP_ID?.trim()
    : process.env.WECHAT_OPEN_APP_ID?.trim()
    
  const secret = loginType === 'official'
    ? process.env.WECHAT_OFFICIAL_APP_SECRET?.trim()
    : process.env.WECHAT_OPEN_APP_SECRET?.trim()

  if (!appId || !secret) {
    return NextResponse.redirect(`/login?error=wechat_config`)
  }

  if (!code || !state || !expectedState || expectedState !== state) {
    return NextResponse.redirect(`/login?error=wechat_state`)
  }

  try {
    const tokenResp = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${secret}&code=${code}&grant_type=authorization_code`
    )
    const tokenJson = await tokenResp.json()

    const accessToken: string | undefined = tokenJson?.access_token
    const openid: string | undefined = tokenJson?.openid
    const unionid: string | undefined = tokenJson?.unionid

    if (!accessToken || !openid) {
      return NextResponse.redirect(`/login?error=wechat_token`)
    }

    let nickname: string | undefined
    let avatar: string | null = null
    try {
      const infoResp = await fetch(
        `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}`
      )
      const infoJson = await infoResp.json()
      nickname = infoJson?.nickname
      avatar = infoJson?.headimgurl || null
    } catch {}

    const user = await findOrCreateWeChatUser({
      openid,
      unionid,
      nickname,
      avatar,
    })

    const jwt = await generateToken({ id: user.id, email: user.email, username: user.username })
    await setAuthCookie(jwt)

    const ua = req.headers.get("user-agent") || "";
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(ua);
    const target = isMobile ? "/home" : "/monitor";
    const res = NextResponse.redirect(new URL(target, req.url))
    res.cookies.set("wx_state", "", { path: "/", maxAge: 0 })
    res.cookies.set("wx_login_type", "", { path: "/", maxAge: 0 })
    return res
  } catch (error) {
    console.error("微信登录回调处理失败:", error)
    return NextResponse.redirect(new URL("/login?error=wechat_error", req.url))
  }
}

