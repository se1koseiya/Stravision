import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getRateLimitConfig, updateRateLimitConfig } from "@/lib/db/settings-service"
import { z } from "zod"

const configSchema = z.object({
  limit: z.number().min(1),
  windowMs: z.number().min(1000),
  violationLimit: z.number().min(1),
  banDuration: z.number().min(1000)
})

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const config = await getRateLimitConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error("Failed to fetch rate limit settings:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const result = configSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    await updateRateLimitConfig(result.data)
    return NextResponse.json({ success: true, config: result.data })
  } catch (error) {
    console.error("Failed to update rate limit settings:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
