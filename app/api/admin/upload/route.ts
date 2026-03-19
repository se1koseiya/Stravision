import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { promises as fs } from "fs"
import path from "path"
import { Buffer } from "buffer"

/**
 * POST /api/admin/upload
 * Admin-only: upload images or videos for use in announcements / feature pages.
 * Returns a public URL to the uploaded file.
 */
export async function POST(req: Request) {
    try {
        const currentUser = await getCurrentUser()

        if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const formData = await req.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json({ error: "No file selected" }, { status: 400 })
        }

        // Validate file type — images and videos only
        const allowedTypes = [
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
            "video/mp4", "video/webm", "video/ogg", "video/quicktime",
        ]
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Unsupported file type. Only images (JPG/PNG/GIF/WebP) and videos (MP4/WebM) are allowed." },
                { status: 400 }
            )
        }

        // Size limits: images ≤ 20 MB, videos ≤ 200 MB
        const isVideo = file.type.startsWith("video/")
        const maxSize = isVideo ? 200 * 1024 * 1024 : 20 * 1024 * 1024
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: isVideo ? "Video too large (max 200MB)" : "Image too large (max 20MB)" },
                { status: 400 }
            )
        }

        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), "public", "uploads", "admin")
        try {
            await fs.access(uploadDir)
        } catch {
            await fs.mkdir(uploadDir, { recursive: true })
        }

        // Build a safe filename from MIME type (never trust the original name)
        const timestamp = Date.now()
        const mimeToExt: Record<string, string> = {
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
            "video/mp4": ".mp4",
            "video/webm": ".webm",
            "video/ogg": ".ogv",
            "video/quicktime": ".mov",
        }
        const ext = mimeToExt[file.type] || ".bin"
        const filename = `admin-${currentUser.id}-${timestamp}${ext}`
        const filepath = path.join(uploadDir, filename)

        // Write file to disk
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await fs.writeFile(filepath, buffer)

        const fileUrl = `/uploads/admin/${filename}`

        return NextResponse.json({
            success: true,
            url: fileUrl,
            type: isVideo ? "video" : "image",
        })
    } catch (error: any) {
        console.error("Admin upload failed:", error)
        return NextResponse.json(
            { error: `Upload failed: ${error.message}` },
            { status: 500 }
        )
    }
}
