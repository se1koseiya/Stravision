import { verifyCredentials } from "@/lib/db/user-service"
import { generateToken, setAuthCookie } from "@/lib/auth"
import { loginSchema } from "@/lib/validations/auth"
import { rateLimit } from "@/lib/rate-limit"
import { NextRequest } from "next/server"
import { checkSuspiciousLogin, fetchIpLocation, recordLoginLog } from "@/lib/db/security-service"
import { verifyEmailCode } from "@/lib/email-verification-service"

export async function POST(req: NextRequest) {
  try {
    // Rate Limit: 5 attempts per minute
    const limiter = rateLimit(req, { limit: 5, windowMs: 60 * 1000 })
    if (!limiter.success) {
      return Response.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 })
    }

    const body = await req.json()
    
    // Use Zod to validate input
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      return Response.json({ error: "缺少邮箱或密码" }, { status: 400 })
    }

    const { email, password, verificationCode } = result.data as any // verificationCode is optional in schema but passed in body

    // 使用 user-service 的 verifyCredentials() 验证用户
    const user = await verifyCredentials(email, password)
    if (!user) {
      return Response.json({ error: "邮箱或密码错误" }, { status: 401 })
    }

    // 安全检查：异地登录检测
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    
    // 异步获取位置信息
    const location = await fetchIpLocation(ip)

    // 检查是否可疑（与历史记录对比）
    const suspiciousCheck = await checkSuspiciousLogin(
      user.id, 
      ip, 
      location?.region || null,
      user.permissions // 传递用户权限以检查 ignoreLocationCheck
    )
    
    if (suspiciousCheck.isSuspicious) {
      // 如果提供了验证码，进行验证
      if (verificationCode) {
        const verifyResult = await verifyEmailCode(email, verificationCode)
        if (!verifyResult.valid) {
          return Response.json({ error: verifyResult.error || "验证码无效" }, { status: 400 })
        }
        // 验证通过，继续登录流程
      } else {
        // 未提供验证码，返回验证要求
        return Response.json({
          ok: false,
          requireVerification: true,
          warning: {
            type: 'suspicious_login',
            message: `检测到异地登录 (IP: ${ip}${location?.region ? `, ${location.region}` : ''})，为了您的账户安全，请进行邮箱验证。`,
            lastRegion: suspiciousCheck.lastRegion
          }
        })
      }
    }

    // 生成包含 id, email, username, role 的 JWT 令牌
    const token = await generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    })

    // 设置 httpOnly cookie
    await setAuthCookie(token)
    
    // 记录本次登录
    await recordLoginLog(user.id, ip, userAgent, location)

    // 返回 UserPublic 信息
    return Response.json({ 
      ok: true, 
      user
    })
  } catch (e) {
    console.error("登录失败:", e)
    return Response.json({ error: "服务异常" }, { status: 500 })
  }
}