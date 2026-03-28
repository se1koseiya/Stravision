import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getMonitorPageVersion, updateMonitorPageVersion } from "@/lib/db/settings-service"

export async function GET() {
  try {
    const version = await getMonitorPageVersion()
    return NextResponse.json({ version })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch setting" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { version } = await req.json()
    if (version !== 'beautiful' && version !== 'ugly') {
      return NextResponse.json({ error: "Invalid version" }, { status: 400 })
    }
    await updateMonitorPageVersion(version)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 })
  }
}