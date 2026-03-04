import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getAllUsers, getUserByEmail, updateUser } from "@/lib/db/user-service"

// 获取所有成员（有设备操作权限的用户）
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth")?.value
    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 })
    }

    // 获取所有用户
    const allUsers = await getAllUsers()
    
    // 筛选有设备操作权限的成员（管理员、超级管理员，或有 deviceControl 权限的用户）
    const members = allUsers.filter(user => {
      if (user.role === "admin" || user.role === "super_admin") return true
      const permissions = user.permissions as { deviceControl?: boolean }
      return permissions?.deviceControl === true
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error("获取成员列表失败:", error)
    return NextResponse.json({ error: "获取成员列表失败" }, { status: 500 })
  }
}

// 添加成员（授予设备操作权限）
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth")?.value
    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 })
    }

    // 检查权限：只有管理员和超级管理员可以添加成员
    const allUsers = await getAllUsers()
    const currentUser = allUsers.find(u => u.id === payload.id)
    
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
      return NextResponse.json({ error: "没有权限执行此操作" }, { status: 403 })
    }

    const { email } = await request.json()
    
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "请提供有效的邮箱地址" }, { status: 400 })
    }

    // 查找用户
    const targetUser = await getUserByEmail(email)
    if (!targetUser) {
      return NextResponse.json({ error: "未找到该邮箱对应的用户" }, { status: 404 })
    }

    // 检查是否已经有权限
    const existingPermissions = JSON.parse(targetUser.permissions || "{}")
    if (existingPermissions.deviceControl === true || 
        targetUser.role === "admin" || 
        targetUser.role === "super_admin") {
      return NextResponse.json({ error: "该用户已经是成员" }, { status: 400 })
    }

    // 更新用户权限
    const newPermissions = { ...existingPermissions, deviceControl: true }
    await updateUser(targetUser.id, { permissions: newPermissions })

    return NextResponse.json({ success: true, message: "成员添加成功" })
  } catch (error) {
    console.error("添加成员失败:", error)
    return NextResponse.json({ error: "添加成员失败" }, { status: 500 })
  }
}
