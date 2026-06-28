import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { promises as fs } from "node:fs"
import path from "node:path"
import { Buffer } from "buffer"

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file selected" },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
      "audio/webm", "audio/mp3", "audio/wav", "audio/ogg",
      "video/mp4", "video/webm", "video/ogg", "video/quicktime"
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      )
    }

    // Validate file size (max 100MB for videos, 10MB for images/audio)
    const isVideo = file.type.startsWith("video/")
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: isVideo ? "Video too large (max 100MB)" : "File too large (max 10MB)" },
        { status: 400 }
      )
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", "chat")
    try {
      await fs.access(uploadDir)
    } catch {
      await fs.mkdir(uploadDir, { recursive: true })
    }

    // Generate filename
    const timestamp = Date.now()
    const mimeToExt: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "audio/webm": ".webm",
      "audio/mp3": ".mp3",
      "audio/wav": ".wav",
      "audio/ogg": ".ogg",
      "video/mp4": ".mp4",
      "video/webm": ".webm",
      "video/ogg": ".ogv",
      "video/quicktime": ".mov"
    }
    const ext = mimeToExt[file.type] || ".bin"

    const filename = `chat-${currentUser.id}-${timestamp}${ext}`
    const filepath = path.join(uploadDir, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await fs.writeFile(filepath, buffer)

    // Return file URL
    const fileUrl = `/uploads/chat/${filename}`

    return NextResponse.json({
      success: true,
      url: fileUrl,
    })
  } catch (error: any) {
    console.error("Upload failed:", error)
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 }
    )
  }
}
