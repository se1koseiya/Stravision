import { NextResponse } from "next/server"
import { initDB } from "@/lib/db/database"
import { listPublishedChangelog } from "@/lib/db/changelog-service"

/** 公开接口：已发布的更新日志（无需登录） */
export async function GET() {
  try {
    await initDB()
    const entries = await listPublishedChangelog()
    return NextResponse.json({ entries })
  } catch (error) {
    console.error("Failed to fetch changelog:", error)
    return NextResponse.json({ error: "Internal Server Error", entries: [] }, { status: 500 })
  }
}
