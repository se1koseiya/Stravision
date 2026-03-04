import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { updateUser } from "@/lib/db/user-service"
import { updateUserSchema } from "@/lib/validations/auth"

/**
 * PUT /api/user/update
 * 更新当前用户信息
 */
export async function PUT(req: Request) {
  try {
    // 获取当前登录用户
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      )
    }
    
    const body = await req.json()
    
    // Use Zod to validate input
    const result = updateUserSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { username, avatar_url } = result.data
    
    // 更新用户信息
    const updatedUser = await updateUser(currentUser.id, {
      username,
      avatar_url,
    })
    
    return NextResponse.json({
      ok: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error("更新用户信息失败:", error)
    return NextResponse.json(
      { error: "服务异常,请稍后重试" },
      { status: 500 }
    )
  }
}
