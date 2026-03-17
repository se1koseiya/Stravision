import { getCurrentUser } from "@/lib/auth"
import { updateUser, NotificationSettings } from "@/lib/db/user-service"
import { getUserAiQuota } from "@/lib/db/ai-quota-service"
import { initDB } from "@/lib/db/database"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    await initDB()
    
    // 获取配额信息
    let quota = null
    try {
        quota = await getUserAiQuota(user.id as number)
    } catch (e) {
        console.error("Failed to get user quota:", e)
    }

    return Response.json({
      success: true,
      user: {
        ...user,
        quota
      },
      quota // 方便前端直接读取
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
