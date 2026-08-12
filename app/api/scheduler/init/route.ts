import { NextResponse } from "next/server"
import { SchedulerRunner } from "@/lib/scheduler/runner"
import { initDB } from "@/lib/db/database"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }
    await initDB()
    await SchedulerRunner.getInstance().init()
    return NextResponse.json({ success: true, message: "Scheduler initialized" })
  } catch (error: any) {
    console.error("Scheduler init error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
