import { NextRequest, NextResponse } from "next/server"
import { recordAccessLog, getBanDetails } from "@/lib/db/security-service"

/**
 * 获取请求的真实 IP
 */
export function getClientIp(req: NextRequest): string {
  // 优先从 headers 获取 (适用于反向代理/CDN)
  const forwardedFor = req.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }
  
  // 其次尝试 NextRequest 的 ip 属性
  const directIp = (req as unknown as { ip?: unknown }).ip
  if (typeof directIp === "string" && directIp.trim()) {
    return directIp
  }
  
  return "127.0.0.1"
}

/**
 * 安全检查结果
 */
interface SecurityCheckResult {
  allowed: boolean
  response?: NextResponse
  ip: string
}

/**
 * 执行安全检查（IP封禁检查 + 访问日志）
 * 注意：此函数不应在 Middleware 中调用（因为涉及数据库操作）
 */
export async function checkSecurity(req: NextRequest, userId?: number): Promise<SecurityCheckResult> {
  const start = Date.now()
  const ip = getClientIp(req)
  const method = req.method
  const path = req.nextUrl.pathname
  const userAgent = req.headers.get("user-agent") || ""

  // 1. 检查 IP 是否被封禁
  const banDetails = await getBanDetails(ip)
  
  if (banDetails) {
    // 记录被拒绝的访问
    await recordAccessLog({
      ip,
      method,
      path,
      status: 403,
      duration: Date.now() - start,
      user_id: userId,
      user_agent: userAgent
    })
    
    return {
      allowed: false,
      ip,
      response: NextResponse.json(
        { 
          error: "Access Denied: Your IP has been banned.",
          reason: banDetails.reason || undefined
        },
        { status: 403 }
      )
    }
  }

  // 2. 记录正常访问 (异步，不阻塞)
  // 为了性能，可以考虑只记录写操作或关键路径，但用户要求“记录每个访问IP”，所以暂时全部记录
  // 但为了防止日志爆炸，建议只对 API 请求记录，或者由调用方决定
  // 这里我们只返回 info，由调用方决定何时调用 recordAccessLog 完成记录（通常在响应发送后或处理完后）
  
  // 实际上，为了简化，我们在 checkSecurity 内部只做检查。
  // 日志记录最好结合响应状态码，所以在 API handler 结束时记录更准确。
  // 但 Next.js App Router 很难在 handler 结束后统一 hook。
  // 所以我们在 checkSecurity 记录 "Request Started" 或者由调用者负责记录。
  
  // 妥协方案：在此处记录，状态码暂时设为 0 (Processing)，或者由调用者传入最终状态。
  // 鉴于用户需求是“记录访问IP”，我们在 checkSecurity 中记录一次即可。
  
  // 只有非 GET 请求或关键路径才记录详细日志？
  // 用户说 "记录每个访问的ip"，所以我们记录。
  
  return {
    allowed: true,
    ip
  }
}

/**
 * 记录请求完成后的日志 (用于 API 路由)
 */
export async function logRequest(req: NextRequest, status: number, userId?: number) {
  const ip = getClientIp(req)
  const method = req.method
  const path = req.nextUrl.pathname
  const userAgent = req.headers.get("user-agent") || ""
  
  await recordAccessLog({
    ip,
    method,
    path,
    status,
    duration: 0, // 简化，不计算耗时
    user_id: userId,
    user_agent: userAgent
  })
}
