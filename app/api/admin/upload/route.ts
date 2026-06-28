import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join, relative, sep } from "path"
import { v4 as uuidv4 } from "uuid"
import { getCurrentUser } from "@/lib/auth"

// 允许的文件类型白名单（MIME → 安全扩展名映射）
// 严禁包含 html/htm/svg/js/mjs/json/xml/css 等可被浏览器渲染或执行的类型，
// 因为 public/uploads 由 Next.js 作为静态资源直接对外暴露。
const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "video/mp4": "mp4",
  "audio/mpeg": "mp3",
}

// 允许的扩展名白名单（反向校验，防止客户端伪造 MIME）
const ALLOWED_EXTENSIONS = new Set(Object.values(ALLOWED_MIME_TO_EXT))

// 文件大小上限：10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(req: Request) {
  // 1. 认证 + 授权：仅 admin / super_admin 可上传
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // 2. 文件大小校验，防止内存/磁盘耗尽 DoS
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      )
    }

    // 3. MIME 类型白名单校验（file.type 来自客户端，可被篡改，但作为第一道防线）
    const declaredMime = file.type || ""
    let fileExt = ALLOWED_MIME_TO_EXT[declaredMime]

    if (!fileExt) {
      // MIME 不在白名单：尝试从原始文件名取扩展名做反向校验
      // 但仍必须是允许的扩展名之一，且用正则严格限制字符集防止路径遍历
      const originalName = file.name || ""
      const extMatch = originalName.match(/\.([a-zA-Z0-9]{1,8})$/)
      const fallbackExt = extMatch ? extMatch[1].toLowerCase() : ""
      if (!ALLOWED_EXTENSIONS.has(fallbackExt)) {
        return NextResponse.json(
          { error: "File type not allowed" },
          { status: 415 }
        )
      }
      fileExt = fallbackExt
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 4. 文件头魔数校验：验证实际内容与声明类型一致，防止伪造 MIME 绕过
    const magicError = validateMagicBytes(buffer, fileExt)
    if (magicError) {
      return NextResponse.json({ error: magicError }, { status: 415 })
    }

    const uploadDir = join(process.cwd(), "public", "uploads")

    // Ensure upload directory exists
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (e) {}

    // 5. 防路径遍历：扩展名已通过白名单+正则校验，文件名由服务端生成
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = join(uploadDir, fileName)

    // 6. 双重防御：最终路径必须仍在 uploadDir 之内
    const rel = relative(uploadDir, filePath)
    if (rel.startsWith("..") || rel.includes(`..${sep}`) || rel === "") {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 })
    }

    await writeFile(filePath, buffer)

    const publicPath = `/uploads/${fileName}`

    return NextResponse.json({
      success: true,
      url: publicPath
    })
  } catch (error: any) {
    console.error("[Upload Error]:", error)
    // 不向客户端泄漏内部错误细节（如文件系统路径、权限信息）
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

/**
 * 校验文件头魔数与声明扩展名是否一致。
 * 仅对常见类型做最小校验，不匹配则返回错误描述。
 */
function validateMagicBytes(buf: Buffer, ext: string): string | null {
  if (buf.length < 4) return null // 太小不做校验，让上游白名单兜底

  switch (ext) {
    case "png":
      if (!(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)) {
        return "File content does not match PNG format"
      }
      break
    case "jpg":
    case "jpeg":
      if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) {
        return "File content does not match JPEG format"
      }
      break
    case "gif":
      if (!(buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38)) {
        return "File content does not match GIF format"
      }
      break
    case "pdf":
      if (buf.slice(0, 4).toString("ascii") !== "%PDF") {
        return "File content does not match PDF format"
      }
      break
    case "zip":
      if (!(buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07))) {
        return "File content does not match ZIP format"
      }
      break
    case "mp4":
      // ftyp box 在偏移 4-8
      if (buf.length < 12 || buf.slice(4, 8).toString("ascii") !== "ftyp") {
        return "File content does not match MP4 format"
      }
      break
    default:
      // 其他类型不强制魔数校验，依赖 MIME + 扩展名白名单
      break
  }
  return null
}
