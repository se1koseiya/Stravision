import { getCurrentUser } from "@/lib/auth"
import { updateUser, NotificationSettings } from "@/lib/db/user-service"
import { getUserAiQuota } from "@/lib/db/ai-quota-service"
import { getUserCreditStatus } from "@/lib/db/credit-service"
import { initDB } from "@/lib/db/database"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    await initDB()
    
    // 获取配额信息（旧按次）
    let quota = null
    try {
        quota = await getUserAiQuota(user.id as number)
    } catch (e) {
        console.error("Failed to get user quota:", e)
    }

    // 积分制度：月度额度 / 已用 / 剩余 / 充值余额（token 计费 × 模型倍率 × 全局倍率）
    let credit = null
    try {
        credit = await getUserCreditStatus(user.id as number)
    } catch (e) {
        console.error("Failed to get user credit:", e)
    }

    return Response.json({
      success: true,
      user: {
        ...user,
        quota,
        credit
      },
      quota,  // 方便前端直接读取（旧）
      credit  // 积分视图（新）
    }, {
      // 🔥 额度/用户数据不允许缓存：否则积分耗尽后前端仍显示旧余额（或反向误导），
      // 且含用户敏感信息，任何中间层都不应缓存。
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error("Failed to get user settings:", error)
    return Response.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const notification_settings = body.notification_settings as NotificationSettings

    if (!notification_settings) {
      return Response.json({ error: "Missing notification_settings" }, { status: 400 })
    }

    const updatedUser = await updateUser(user.id, { notification_settings })

    return Response.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error("Failed to update notification settings:", error)
    return Response.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
