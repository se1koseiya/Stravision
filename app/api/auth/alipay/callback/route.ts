export const runtime = 'nodejs'

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AlipaySdk } from 'alipay-sdk'
import { findOrCreateAlipayUser } from "@/lib/db/user-service"
import { updateTicketWithJwt } from "@/lib/db/ticket-service"
import { generateToken } from "@/lib/auth"

const normalizePem = (value: string) => {
  // 处理多种格式的换行符
  return value
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  // 优先使用环境变量配置的 APP_URL，解决容器/反代环境下 req.url 可能为内网IP的问题
  const appUrl = (process.env.APP_URL || url.origin).replace(/\/+$/, "")
  
  const authCode = url.searchParams.get("auth_code")
  const state = url.searchParams.get("state")
  const ticket = url.searchParams.get("ticket") // 获取移动端跨浏览器登录凭证
  
  // 如果是 ticket 模式，不需要校验 cookie 中的 state (因为是跨浏览器的)
  if (!ticket) {
    const cookieStore = await cookies()
    const expectedState = cookieStore.get("alipay_state")?.value

    // 简单的 State 验证
    if (!authCode || !state || !expectedState || expectedState !== state) {
      console.error("Alipay state mismatch:", { authCode: !!authCode, state, expectedState })
      return NextResponse.redirect(`${appUrl}/login?error=alipay_state`)
    }
  } else {
    // 简单校验
    if (!authCode) {
      return NextResponse.redirect(`${appUrl}/login?error=alipay_code_missing`)
    }
  }

  const appId = process.env.ALIPAY_APP_ID?.trim()
  const privateKeyRaw = process.env.ALIPAY_PRIVATE_KEY
  const alipayPublicKeyRaw = process.env.ALIPAY_PUBLIC_KEY

  if (!appId || !privateKeyRaw || !alipayPublicKeyRaw) {
    console.error("Alipay configuration missing:", {
      hasAppId: !!appId,
      hasPrivateKey: !!privateKeyRaw,
      hasPublicKey: !!alipayPublicKeyRaw
    })
    return NextResponse.redirect(`${appUrl}/login?error=alipay_config_missing`)
  }

  const privateKey = normalizePem(privateKeyRaw)
  const alipayPublicKey = normalizePem(alipayPublicKeyRaw)
  
  // 更准确的密钥类型检测
  let keyType: 'PKCS1' | 'PKCS8' = 'PKCS8'
  if (privateKey.includes('BEGIN RSA PRIVATE KEY')) {
    keyType = 'PKCS1'
  } else if (privateKey.includes('BEGIN PRIVATE KEY')) {
    keyType = 'PKCS8'
  }

  console.log("Alipay SDK Config:", {
    appId,
    keyType,
    privateKeyLength: privateKey.length,
    publicKeyLength: alipayPublicKey.length,
    privateKeyStart: privateKey.substring(0, 50),
    publicKeyStart: alipayPublicKey.substring(0, 50)
  })

  let alipaySdk;
  try {
    // 实例化 SDK
    alipaySdk = new AlipaySdk({
        appId,
        privateKey,
        alipayPublicKey,
        keyType,
        // 如果是沙箱环境，取消注释下面这行
        // gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
    })
    console.log("Alipay SDK initialized successfully")
  } catch (sdkError: any) {
    console.error("Alipay SDK Instantiation Failed:", {
      error: sdkError.message,
      stack: sdkError.stack
    });
    return NextResponse.redirect(`${appUrl}/login?error=alipay_sdk_init&msg=${encodeURIComponent(sdkError.message)}`)
  }

  try {
    // 1. 使用 auth_code 换取 access_token
    console.log("Exchanging auth_code for access_token...")
    const tokenResult: any = await alipaySdk.exec('alipay.system.oauth.token', {
      grant_type: 'authorization_code',
      code: authCode,
    })

    // 打印完整的响应结构用于调试
    console.log("Token exchange raw result:", JSON.stringify(tokenResult, null, 2))
    
    console.log("Token exchange result:", {
      code: tokenResult?.code,
      msg: tokenResult?.msg,
      subCode: tokenResult?.sub_code,
      subMsg: tokenResult?.sub_msg,
      hasAccessToken: !!tokenResult?.accessToken,
      hasUserId: !!(tokenResult?.userId || tokenResult?.user_id),
      allKeys: Object.keys(tokenResult || {})
    })

    const tokenCode = tokenResult?.code
    if (tokenCode && tokenCode !== '10000') {
      console.error("Failed to get alipay access token:", {
        code: tokenCode,
        msg: tokenResult?.msg,
        subCode: tokenResult?.sub_code,
        subMsg: tokenResult?.sub_msg
      })
      const errorMsg = tokenResult?.sub_msg || tokenResult?.msg || 'token_failed'
      return NextResponse.redirect(`${appUrl}/login?error=alipay_token&msg=${encodeURIComponent(errorMsg)}`)
    }

    const accessToken = tokenResult?.accessToken || tokenResult?.access_token
    
    if (!accessToken) {
      console.error("Access token missing in response. Full result:", tokenResult)
      return NextResponse.redirect(`${appUrl}/login?error=alipay_no_token`)
    }
    
    console.log("Access token obtained successfully")

    // 2. 获取用户信息
    // 初始化为 undefined，避免在获取失败时覆盖现有的用户信息
    let nickname: string | undefined = undefined
    let avatar: string | undefined | null = undefined
    
    // 尝试从多个可能的字段中提取用户ID
    let alipayUserId = tokenResult.userId || 
                       tokenResult.user_id || 
                       tokenResult.alipay_user_id ||
                       tokenResult.openId ||
                       tokenResult.open_id

    console.log("Extracted user ID from token:", alipayUserId)
    console.log("Token result keys:", Object.keys(tokenResult || {}))

    // 尝试获取用户详细信息（仅在 scope=auth_user 时有效）
    // 如果使用 auth_base，这个调用会失败，但我们已经有 userId 了
    try {
        console.log("Attempting to fetch user info...")
        const userResult: any = await alipaySdk.exec('alipay.user.info.share', {
          auth_token: accessToken,
        })
        
        console.log("User info result:", {
          code: userResult?.code,
          msg: userResult?.msg,
          hasNickName: !!(userResult?.nickName || userResult?.nick_name),
          hasAvatar: !!userResult?.avatar
        })

        if (userResult?.code === '10000') {
             nickname = userResult.nickName || userResult.nick_name || nickname
             avatar = userResult.avatar || avatar
             // 优先使用 userResult 里的 ID
             alipayUserId = userResult.userId || userResult.user_id || alipayUserId
             console.log("Successfully fetched user details:", { nickname, hasAvatar: !!avatar })
        } else {
             console.warn("User info fetch returned non-success code:", userResult?.code, userResult?.sub_msg)
        }
    } catch (e: any) {
        console.warn("Failed to fetch alipay user info (likely using auth_base scope):", e.message)
        // 这不是致命错误，我们可以继续使用 userId
    }

    if (!alipayUserId) {
        console.error("Alipay user_id missing in token response")
        console.error("Full token result:", JSON.stringify(tokenResult, null, 2))
        console.error("Tried fields: userId, user_id, alipay_user_id, openId, open_id")
        
        // 尝试从 user info 获取
        console.log("Attempting to get user ID from user info API...")
        try {
            const userInfoResult: any = await alipaySdk.exec('alipay.user.info.share', {
              auth_token: accessToken,
            })
            console.log("User info API result:", JSON.stringify(userInfoResult, null, 2))
            
            alipayUserId = userInfoResult?.userId || 
                          userInfoResult?.user_id || 
                          userInfoResult?.openId ||
                          userInfoResult?.open_id
            
            if (alipayUserId) {
                console.log("Successfully got user ID from user info API:", alipayUserId)
                nickname = userInfoResult?.nickName || userInfoResult?.nick_name || nickname
                avatar = userInfoResult?.avatar || avatar
            }
        } catch (e: any) {
            console.error("Failed to get user info:", e.message)
        }
        
        // 最后的备用方案：使用 access_token 的一部分作为唯一标识
        if (!alipayUserId && accessToken) {
            console.warn("Using access token hash as fallback user ID")
            // 使用 SHA-256（而非 MD5）并取足够长度，降低碰撞导致的账号合并风险
            const crypto = require('crypto')
            alipayUserId = 'alipay_' + crypto.createHash('sha256').update(accessToken).digest('hex').substring(0, 32)
            console.log("Generated fallback user ID:", alipayUserId)
        }
        
        if (!alipayUserId) {
            return NextResponse.redirect(`${appUrl}/login?error=alipay_user_id_missing&msg=无法获取用户标识`)
        }
    }

    console.log("Final user data:", { alipayUserId, nickname, hasAvatar: !!avatar })

    // 3. 查找或创建用户
    console.log("Finding or creating user...")
    const user = await findOrCreateAlipayUser({
      userId: alipayUserId,
      nickname: nickname,
      avatar: avatar,
    })
    console.log("User created/found:", { id: user.id, username: user.username })

    // 4. 生成 JWT
    console.log("Generating JWT token...")
    const jwt = await generateToken({ 
      id: user.id, 
      email: user.email, 
      username: user.username,
      role: user.role 
    })
    console.log("JWT generated successfully")
    
    // 如果是 ticket 模式 (移动端跨浏览器登录)
    if (ticket) {
        await updateTicketWithJwt(ticket, jwt)
        
        // 返回一个提示页，告诉用户可以返回浏览器了
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>登录成功</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 40px 20px; }
    .icon { font-size: 64px; color: #059669; margin-bottom: 20px; }
    h3 { margin-bottom: 10px; }
    p { color: #666; margin-bottom: 30px; }
    .btn { display: block; width: 100%; max-width: 300px; margin: 20px auto; padding: 12px 0; background: #1677FF; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="icon">✅</div>
  <h3>授权成功</h3>
  <p>您已成功登录，请手动返回刚才的浏览器页面，系统将自动跳转。</p>
  <a href="javascript:history.back()" class="btn">返回上一页</a>
</body>
</html>
        `
        return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
    }

    // 注意：在 Next.js Route Handler 中，如果使用 cookies().set() 后直接返回 NextResponse.redirect，
    // Cookie 有时可能不会正确合并到响应头中。
    // 为了确保 Cookie 一定能种下，我们显式在 Response 对象上设置 Cookie。
    // await setAuthCookie(jwt) 

    const ua = req.headers.get("user-agent") || "";
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(ua);
    const target = isMobile ? "/home" : "/monitor";
    const res = NextResponse.redirect(`${appUrl}${target}`)
    
    // 强制设置 Cookie，确保兼容 HTTP 环境 (secure: false)
    // 如果您的生产环境启用了 HTTPS，可以考虑根据协议动态设置 secure
    res.cookies.set("auth", jwt, {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // 允许 HTTP 访问 (解决云服务无 HTTPS 导致 Cookie 丢失的问题)
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 天
    })

    res.cookies.set("alipay_state", "", { path: "/", maxAge: 0 })

    return res
  } catch (error: any) {
    console.error("Alipay callback error:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    const errorMsg = error.message || "未知错误"
    return NextResponse.redirect(`${appUrl}/login?error=alipay_exception&msg=${encodeURIComponent(errorMsg)}`)
  }
}
