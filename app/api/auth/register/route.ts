import { createUser } from "@/lib/db/user-service"
import { getPool } from "@/lib/db/database"
import { generateToken, setAuthCookie } from "@/lib/auth"
import { registerSchema } from "@/lib/validations/auth"
import { rateLimit } from "@/lib/rate-limit"
import { NextRequest } from "next/server"

/** initDB() 预置的系统机器人账号（lib/db/database.ts），不计入"已有用户" */
const SYSTEM_BOT_EMAIL = "bot@stravision.ai"

export async function POST(req: NextRequest) {
  try {
    // Rate Limit: 3 attempts per minute to prevent spam registration
    const limiter = rateLimit(req, { limit: 3, windowMs: 60 * 1000 })
    if (!limiter.success) {
      return Response.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 })
    }

    const body = await req.json()
    
    // Use Zod to validate input
    const result = registerSchema.safeParse(body)
    
    if (!result.success) {
        return Response.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { email, password, username } = result.data

    // 桌面端（离线单用户实例）：首个注册账号自动成为超级管理员。
    // 否则用户拿不到 admin 后台权限，无法配置 AI 供应商等必要项。
    // 仅 STRAVISION_LOCAL_MODE=1 时生效，线上环境行为完全不变。
    //
    // ⚠️ 必须排除系统机器人账号：initDB() 会无条件插入
    // bot@stravision.ai（"莓小智"，role=admin），所以首次启动后 users 表
    // 天然已有 1 行。若按 COUNT(*)===0 判断，本地实例永远拿不到管理员。
    let role: string | undefined
    if (process.env.STRAVISION_LOCAL_MODE === "1") {
      const { rows } = await getPool().query<{ n: number }>(
        "SELECT COUNT(*)::int AS n FROM users WHERE email <> $1",
        [SYSTEM_BOT_EMAIL]
      )
      if (rows[0]?.n === 0) role = "super_admin"
    }

    // 使用 user-service 创建用户(保存到数据库)
    const user = await createUser({
      email,
      password,
      username,
      ...(role ? { role } : {}),
    })

    // 生成包含完整用户信息的 JWT 令牌
    const token = await generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    })

    // 设置 httpOnly cookie
    await setAuthCookie(token)

    // 返回 UserPublic 信息
    return Response.json({
      ok: true,
      user,
    })
  } catch (error) {
    // 处理邮箱已存在的错误
    if (error instanceof Error && error.message.includes("该邮箱已被注册")) {
      return Response.json({ error: "该邮箱已被注册" }, { status: 409 })
    }

    console.error("注册失败:", error)
    return Response.json({ error: "服务异常,请稍后重试" }, { status: 500 })
  }
}
