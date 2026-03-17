import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { findOrCreateWeWorkUser } from "@/lib/db/user-service"
import { generateToken, setAuthCookie } from "@/lib/auth"

export async function GET(req: Request) {
  const corpId = process.env.WEWORK_CORP_ID
  const secret = process.env.WEWORK_CORP_SECRET
  
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  if (!corpId || !secret) {
    return NextResponse.redirect(new URL(`/login?error=wework_config`, req.url))
  }

  const cookieStore = await cookies()
  const expectedState = cookieStore.get("wework_state")?.value
  
  // 验证 state 防止 CSRF
  if (!code || !state || !expectedState || expectedState !== state) {
    return NextResponse.redirect(new URL(`/login?error=wework_state`, req.url))
  }

  try {
    // 1. 获取 Access Token
    const tokenResp = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${secret}`
    )
    const tokenJson = await tokenResp.json()

    if (tokenJson.errcode !== 0) {
      console.error("获取企业微信Token失败:", tokenJson)
      return NextResponse.redirect(new URL(`/login?error=wework_token`, req.url))
    }
    
    const accessToken = tokenJson.access_token

    // 2. 获取访问用户身份 (UserId)
    const userInfoResp = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${accessToken}&code=${code}`
    )
    const userInfoJson = await userInfoResp.json()

    if (userInfoJson.errcode !== 0) {
      console.error("获取企业微信用户身份失败:", userInfoJson)
      return NextResponse.redirect(new URL(`/login?error=wework_user_identity`, req.url))
    }

    const userId = userInfoJson.UserId
    // 如果是外部联系人，则是 OpenId，暂不支持
    if (!userId) {
       return NextResponse.redirect(new URL(`/login?error=wework_external_user`, req.url))
    }

    // 3. 获取用户详细信息 (姓名、头像、邮箱)
    let nickname = `企业微信用户`
    let avatar: string | null = null
    let email: string | undefined = undefined

    try {
        const userDetailResp = await fetch(
            `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}&userid=${userId}`
        )
        const userDetailJson = await userDetailResp.json()
        
        if (userDetailJson.errcode === 0) {
            nickname = userDetailJson.name || nickname
            avatar = userDetailJson.avatar || null
            email = userDetailJson.email
        }
    } catch (e) {
        console.error("获取用户详细信息失败:", e)
    }

    // 4. 查找或创建用户
    const user = await findOrCreateWeWorkUser({
      userid: userId,
      name: nickname,
      avatar,
      email
    })

    // 5. 生成 Token 并登录
    const jwt = await generateToken({ id: user.id, email: user.email, username: user.username })
    await setAuthCookie(jwt)

    // 6. 清除 state cookie 并重定向
    const ua = req.headers.get("user-agent") || "";
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(ua);
    const target = isMobile ? "/home" : "/monitor";
    const res = NextResponse.redirect(new URL(target, req.url))
    res.cookies.set("wework_state", "", { path: "/", maxAge: 0 })
    return res

  } catch (error) {
    console.error("企业微信登录回调处理失败:", error)
    return NextResponse.redirect(new URL(`/login?error=wework_error`, req.url))
  }
}
