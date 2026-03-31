import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = join(process.cwd(), "public", "uploads")
    
    // Ensure upload directory exists
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (e) {}

    const fileExt = file.name.split(".").pop() || "png"
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = join(uploadDir, fileName)

    await writeFile(filePath, buffer)
    
    const publicPath = `/uploads/${fileName}`

    return NextResponse.json({ 
      success: true, 
      url: publicPath 
    })
  } catch (error: any) {
    console.error("[Upload Error]:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
