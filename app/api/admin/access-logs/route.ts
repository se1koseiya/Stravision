import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getAccessLogs } from "@/lib/db/security-service"

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const searchParams = req.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "100")
    
    const logs = await getAccessLogs(limit)
    return NextResponse.json(logs)
  } catch (error) {
    console.error("Failed to fetch access logs:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
