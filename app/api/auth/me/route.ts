import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    // 使用 getCurrentUser() 获取当前用户
    const user = await getCurrentUser()

    if (!user) {
      // 未认证或令牌无效
      return Response.json({ authenticated: false })
    }

    // 返回包含完整用户资料的响应
    return Response.json({
      authenticated: true,
      user: user,
    })
  } catch (error) {
    console.error("获取用户信息失败:", error)
    return Response.json({ authenticated: false }, { status: 500 })
  }
}