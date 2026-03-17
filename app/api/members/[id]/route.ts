import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getAllUsers, getUserById, updateUser } from "@/lib/db/user-service"

// 移除成员（撤销设备操作权限）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("auth")?.value
    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 })
    }

    // 检查权限：只有管理员和超级管理员可以移除成员
    const allUsers = await getAllUsers()
    const currentUser = allUsers.find(u => u.id === payload.id)
    
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
      return NextResponse.json({ error: "没有权限执行此操作" }, { status: 403 })
    }

    const { id } = await params
    const memberId = parseInt(id, 10)
    
    if (isNaN(memberId)) {
      return NextResponse.json({ error: "无效的成员ID" }, { status: 400 })
    }

    // 不能移除自己
    if (memberId === currentUser.id) {
      return NextResponse.json({ error: "不能移除自己" }, { status: 400 })
    }

    // 查找目标用户
    const targetUser = await getUserById(memberId)
    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    // 超级管理员不能被移除
    if (targetUser.role === "super_admin") {
      return NextResponse.json({ error: "不能移除超级管理员" }, { status: 400 })
    }

    // 普通管理员只能移除普通用户，不能移除其他管理员
    if (currentUser.role === "admin" && targetUser.role === "admin") {
      return NextResponse.json({ error: "管理员不能移除其他管理员" }, { status: 400 })
    }

    // 移除设备操作权限（对于普通用户）
    // 对于管理员，超级管理员可以将其降级为普通用户
    if (targetUser.role === "admin") {
      // 超级管理员移除管理员：降级为普通用户
      await updateUser(memberId, { role: "user" })
    } else {
      // 移除普通用户的设备操作权限
      const existingPermissions = JSON.parse(targetUser.permissions || "{}")
      delete existingPermissions.deviceControl
      await updateUser(memberId, { permissions: existingPermissions })
    }

    return NextResponse.json({ success: true, message: "成员已移除" })
  } catch (error) {
    console.error("移除成员失败:", error)
    return NextResponse.json({ error: "移除成员失败" }, { status: 500 })
  }
}
