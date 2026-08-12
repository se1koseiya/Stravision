import { NextResponse } from "next/server"
import { initDB, query } from "@/lib/db/database"
import { getCurrentUser } from "@/lib/auth"

/**
 * 调试端点 - 显示日志的详细信息（仅管理员，生产环境禁用）
 */
export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: "Not available in production" }, { status: 404 })
    }
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 })
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: "无权限" }, { status: 403 })
    }
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
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
