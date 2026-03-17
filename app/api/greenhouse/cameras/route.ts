import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getGreenhouseCameraUrls, updateGreenhouseCameraUrls } from "@/lib/db/settings-service"
import { z } from "zod"

const payloadSchema = z.object({
  cameraAUrl: z.string(),
  cameraBUrl: z.string()
})

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const urls = await getGreenhouseCameraUrls()
    return NextResponse.json(urls)
  } catch (error) {
    console.error("Failed to fetch greenhouse camera urls:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = payloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const normalized = {
      cameraAUrl: parsed.data.cameraAUrl.trim(),
      cameraBUrl: parsed.data.cameraBUrl.trim()
    }

    await updateGreenhouseCameraUrls(normalized)
    return NextResponse.json({ success: true, urls: normalized })
  } catch (error) {
    console.error("Failed to update greenhouse camera urls:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

