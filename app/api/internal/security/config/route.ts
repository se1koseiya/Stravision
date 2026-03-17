import { NextRequest, NextResponse } from "next/server"
import { getRateLimitConfig } from "@/lib/db/settings-service"
import { getInternalApiSecret } from "@/lib/constants"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret")
  if (secret !== getInternalApiSecret()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const config = await getRateLimitConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error("Internal Config Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
