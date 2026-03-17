import { NextResponse } from "next/server"
import { clearAuthCookie } from "@/lib/auth"

/**
 * POST /api/auth/logout
 * 用户登出接口
 */
export async function POST() {
  try {
    // 清除认证 Cookie
    await clearAuthCookie()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("登出失败:", error)
    return NextResponse.json(
      { error: "登出失败" },
      { status: 500 }
    )
  }
}
