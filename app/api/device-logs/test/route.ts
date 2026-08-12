import { NextResponse } from "next/server"
import { initDB, execute } from "@/lib/db/database"
import { getCurrentUser } from "@/lib/auth"

/**
 * 添加测试设备日志
 * 仅用于开发和测试
 */
export async function POST() {
  try {
    // 生产环境禁用测试数据注入，避免污染生产数据
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: "Test endpoint disabled in production" },
        { status: 404 }
      )
    }
    const currentUser = await getCurrentUser()

    // 仅管理员可以添加测试日志
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    await initDB()
    
    const now = Date.now()
    const testLogs = [
      {
        device_name: '水泵/灌溉',
        action: '开启',
        operator: currentUser.username || '测试用户',
        details: '测试开启水泵',
        created_at: now - 3600000 // 1小时前
      },
      {
        device_name: '风扇/通风',
        action: '关闭',
        operator: currentUser.username || '测试用户',
        details: '测试关闭风扇',
        created_at: now - 1800000 // 30分钟前
      },
      {
        device_name: 'RGB Light',
        action: '调整颜色',
        operator: 'AI Assistant',
        details: 'R:255 G:100 B:50',
        created_at: now - 600000 // 10分钟前
      },
      {
        device_name: '植物全光谱补光灯',
        action: '开启',
        operator: currentUser.username || '测试用户',
        details: '测试开启补光灯',
        created_at: now - 300000 // 5分钟前
      },
      {
        device_name: '摄像头云台',
        action: '左移',
        operator: currentUser.username || '测试用户',
        details: 'AI 控制摄像头云台左移',
        created_at: now - 120000 // 2分钟前
      }
    ]
    
    for (const log of testLogs) {
      await execute(
        `INSERT INTO device_logs (device_name, action, operator, details, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [log.device_name, log.action, log.operator, log.details, log.created_at]
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `成功添加 ${testLogs.length} 条测试日志`,
      count: testLogs.length 
    })
  } catch (error) {
    console.error("Failed to add test logs:", error)
    return NextResponse.json(
      { success: false, error: "Failed to add test logs" },
      { status: 500 }
    )
  }
}
