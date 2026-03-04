import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { findOrCreateQQUser } from "@/lib/db/user-service"
import { generateToken, setAuthCookie } from "@/lib/auth"

export async function GET(req: Request) {
  const appId = process.env.QQ_CLIENT_ID
  const appKey = process.env.QQ_CLIENT_SECRET
  
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  // 优先使用环境变量中的 APP_URL
  const origin = process.env.APP_URL || url.origin
  const redirectUri = `${origin}/api/auth/qq/callback`

  if (!appId || !appKey) {
    return NextResponse.redirect(new URL(`/login?error=qq_config`, req.url))
  }

  const cookieStore = await cookies()
  const expectedState = cookieStore.get("qq_state")?.value
  
  if (!code || !state || !expectedState || expectedState !== state) {
    return NextResponse.redirect(new URL(`/login?error=qq_state`, req.url))
  }

  try {
    // 1. 获取 Access Token
    // 注意：QQ 建议加上 fmt=json 参数以获取 JSON 响应
    const tokenUrl = `https://graph.qq.com/oauth2.0/token?grant_type=authorization_code&client_id=${appId}&client_secret=${appKey}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}&fmt=json`
    const tokenResp = await fetch(tokenUrl)
    
    // QQ 可能返回 JSON 也可能返回 text (取决于 fmt 参数，加上 fmt=json 后返回 json)
    // 成功响应: { "access_token": "...", "expires_in": 7776000, "refresh_token": "..." }
    // 失败响应: { "error": ..., "error_description": ... }
    const tokenJson = await tokenResp.json()

    if (tokenJson.error || !tokenJson.access_token) {
      console.error("QQ 获取 Token 失败:", tokenJson)
      return NextResponse.redirect(new URL(`/login?error=qq_token`, req.url))
    }
    
    const accessToken = tokenJson.access_token

    // 2. 获取 OpenID
    // 接口: https://graph.qq.com/oauth2.0/me?access_token=...&fmt=json
    const meUrl = `https://graph.qq.com/oauth2.0/me?access_token=${accessToken}&fmt=json`
    const meResp = await fetch(meUrl)
    const meJson = await meResp.json()

    if (meJson.error || !meJson.openid) {
       console.error("QQ 获取 OpenID 失败:", meJson)
       return NextResponse.redirect(new URL(`/login?error=qq_openid`, req.url))
    }
    
    const openid = meJson.openid

    // 3. 获取用户信息 (get_user_info)
    const infoUrl = `https://graph.qq.com/user/get_user_info?access_token=${accessToken}&oauth_consumer_key=${appId}&openid=${openid}`
    const infoResp = await fetch(infoUrl)
    const infoJson = await infoResp.json()

    if (infoJson.ret !== 0) {
       console.error("QQ 获取用户信息失败:", infoJson)
       // 即使获取信息失败，只要有 openid 也可以尝试登录（虽然没有头像昵称）
       // 这里选择继续，使用默认昵称
    }

    const nickname = infoJson.nickname || `QQ用户`
    const avatar = infoJson.figureurl_qq_2 || infoJson.figureurl_qq_1 || null // figureurl_qq_2 是 100x100，_1 是 40x40

    // 4. 查找或创建用户
    const user = await findOrCreateQQUser({
      openid,
      nickname,
      avatar
    })

    // 5. 生成 Token 并登录
    const jwt = await generateToken({ id: user.id, email: user.email, username: user.username })
    await setAuthCookie(jwt)

    // 6. 清除 state cookie 并重定向
    const ua = req.headers.get("user-agent") || "";
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(ua);
    const target = isMobile ? "/home" : "/monitor";
    const res = NextResponse.redirect(new URL(target, req.url))
    res.cookies.set("qq_state", "", { path: "/", maxAge: 0 })
    return res

  } catch (error) {
    console.error("QQ 登录回调处理异常:", error)
    return NextResponse.redirect(new URL(`/login?error=qq_error`, req.url))
  }
}
