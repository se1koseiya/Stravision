import { NextRequest, NextResponse } from "next/server"
import { isIPBanned } from "@/lib/db/security-service"
import { getInternalApiSecret } from "@/lib/constants"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret")
  if (secret !== getInternalApiSecret()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const ip = searchParams.get("ip")
    
    if (!ip) {
      return NextResponse.json({ error: "IP required" }, { status: 400 })
    }

    const banned = await isIPBanned(ip)
    return NextResponse.json({ banned })
  } catch (error) {
    console.error("Internal Check Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
