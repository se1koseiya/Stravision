import { NextResponse } from "next/server"
import { SchedulerRunner } from "@/lib/scheduler/runner"
import { initDB } from "@/lib/db/database"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await initDB()
    await SchedulerRunner.getInstance().init()
    return NextResponse.json({ success: true, message: "Scheduler initialized" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
