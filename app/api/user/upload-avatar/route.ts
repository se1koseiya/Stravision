import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { promises as fs } from "fs"
import path from "path"

/**
 * POST /api/user/upload-avatar
 * 上传用户头像
 */
export async function POST(req: Request) {
  try {
    // 获取当前登录用户
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      )
    }
    
    const formData = await req.formData()
    const file = formData.get("avatar") as File
    
    if (!file) {
      return NextResponse.json(
        { error: "未选择文件" },
        { status: 400 }
      )
    }
    
    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "只支持 JPG、PNG、GIF 和 WebP 格式的图片" },
        { status: 400 }
      )
    }
    
    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "文件大小不能超过 5MB" },
        { status: 400 }
      )
    }
    
    // 创建上传目录
    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars")
    try {
      await fs.access(uploadDir)
    } catch {
      await fs.mkdir(uploadDir, { recursive: true })
    }
    
    // 生成唯一文件名 (强制使用安全后缀，防止脚本注入)
    const timestamp = Date.now()
    // const ext = path.extname(file.name) // 不使用用户提供的后缀
    const mimeToExt: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
    }
    const ext = mimeToExt[file.type] || ".png"
    
    const filename = `avatar-${currentUser.id}-${timestamp}${ext}`
    const filepath = path.join(uploadDir, filename)
    
    // 保存文件
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await fs.writeFile(filepath, buffer)
    
    // 返回文件 URL
    const avatarUrl = `/uploads/avatars/${filename}`
    
    return NextResponse.json({
      ok: true,
      avatar_url: avatarUrl,
    })
  } catch (error) {
    console.error("上传头像失败:", error)
    return NextResponse.json(
      { error: "上传失败,请稍后重试" },
      { status: 500 }
    )
  }
}
