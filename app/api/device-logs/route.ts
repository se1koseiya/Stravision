import { NextRequest, NextResponse } from "next/server"
import { initDB, query, queryOne } from "@/lib/db/database"

export async function GET(req: NextRequest) {
  try {
    await initDB()
    
    const searchParams = req.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "50")
    
    const logs = await query(
      `SELECT * FROM device_logs 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    )
    
    return NextResponse.json({ success: true, logs })
  } catch (error) {
    console.error("Failed to fetch device logs:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch logs" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDB()
    
    const body = await req.json()
    const { device_name, action, operator, details } = body
    
    if (!device_name || !action || !operator) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }
    
    const row = await queryOne<{ id: number }>(
      `INSERT INTO device_logs (device_name, action, operator, details, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [device_name, action, operator, details || "", Date.now()]
    )
    return NextResponse.json({ success: true, id: row?.id })
  } catch (error) {
    console.error("Failed to create device log:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create log" },
      { status: 500 }
    )
  }
}
