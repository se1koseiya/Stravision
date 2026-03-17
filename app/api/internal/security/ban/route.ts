import { NextRequest, NextResponse } from "next/server"
import { addBannedIP } from "@/lib/db/security-service"
import { getInternalApiSecret } from "@/lib/constants"

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret")
  if (secret !== getInternalApiSecret()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { ip, reason } = await req.json()
    if (!ip) {
      return NextResponse.json({ error: "IP required" }, { status: 400 })
    }

    // Auto-ban for 24 hours
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000
    await addBannedIP(ip, reason || "Auto-ban: Suspicious activity", "system", expiresAt)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Internal Ban Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
