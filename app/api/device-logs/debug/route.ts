import { NextResponse } from "next/server"
import { initDB, query } from "@/lib/db/database"

/**
 * 调试端点 - 显示日志的详细信息
 */
export async function GET() {
  try {
    await initDB()
    
    const logs = await query(
      `SELECT * FROM device_logs ORDER BY created_at DESC LIMIT 10`
    )
    
    const debugInfo = logs.map((log: any) => {
      let dateInfo
      try {
        const date = new Date(log.created_at)
        const isValid = !isNaN(date.getTime())
        dateInfo = {
          created_at: log.created_at,
          created_at_type: typeof log.created_at,
          is_valid: isValid,
          ...(isValid ? {
            created_at_date: date.toISOString(),
            created_at_local: date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
          } : {
            error: 'Invalid timestamp'
          })
        }
      } catch (e) {
        dateInfo = {
          created_at: log.created_at,
          created_at_type: typeof log.created_at,
          is_valid: false,
          error: String(e)
        }
      }
      
      return {
        id: log.id,
        device_name: log.device_name,
        action: log.action,
        operator: log.operator,
        details: log.details,
        ...dateInfo
      }
    })
    
    return NextResponse.json({ 
      success: true,
      count: logs.length,
      current_time: Date.now(),
      current_date: new Date().toISOString(),
      logs: debugInfo
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    })
  } catch (error) {
    console.error("Debug endpoint error:", error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
