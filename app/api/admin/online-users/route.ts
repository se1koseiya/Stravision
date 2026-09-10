import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getOnlineSnapshot } from "@/lib/db/security-service"

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const windowMinutes = Math.min(
      Math.max(parseInt(req.nextUrl.searchParams.get("window") || "5", 10) || 5, 1),
      60
    )
    const snapshot = await getOnlineSnapshot(windowMinutes)
    return NextResponse.json(snapshot)
  } catch (error) {
    console.error("Failed to fetch online snapshot:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
