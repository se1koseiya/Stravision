import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getMaintenanceConfig, updateMaintenanceConfig } from "@/lib/db/maintenance-service"
import { z } from "zod"

const updateSchema = z.object({
  enabled: z.boolean(),
  title: z.string().min(1),
  message: z.string().min(1),
  allowed_roles: z.array(z.string()).optional()
})

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const config = await getMaintenanceConfig()
    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const result = updateSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }

    const currentConfig = await getMaintenanceConfig()
    const newConfig = { ...currentConfig, ...result.data }
    
    await updateMaintenanceConfig(newConfig)
    return NextResponse.json(newConfig)
  } catch (error) {
    console.error("Failed to update maintenance config:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
