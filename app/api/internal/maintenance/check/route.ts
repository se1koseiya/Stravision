import { NextRequest, NextResponse } from "next/server"
import { getInternalApiSecret } from "@/lib/constants"
import { getMaintenanceConfig } from "@/lib/db/maintenance-service"

export async function GET(req: NextRequest) {
  // Security check: Only allow internal calls
  const secret = req.headers.get("x-internal-secret")
  if (secret !== getInternalApiSecret()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const config = await getMaintenanceConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error("Failed to fetch maintenance config:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
