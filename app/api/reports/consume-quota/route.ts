import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db/database"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: "缺少用户ID" }, { status: 400 })
    }

    const pool = getPool()
    const today = new Date().toISOString().split('T')[0]

    // 获取用户当前配额信息
    const userResult = await pool.query(
      `SELECT daily_report_quota, daily_report_usage, last_report_usage_date 
       FROM users WHERE id = $1`,
      [userId]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const user = userResult.rows[0]
    const quota = user.daily_report_quota || 5
    let usage = user.daily_report_usage || 0
    const lastUsageDate = user.last_report_usage_date

    // 如果是新的一天，重置使用次数
    if (lastUsageDate !== today) {
      usage = 0
    }

    // 检查是否还有配额
    if (usage >= quota) {
      return NextResponse.json(
        { 
          error: "今日报告生成配额已用完",
          quota,
          usage,
          remaining: 0
        },
        { status: 403 }
      )
    }

    // 扣除配额
    const newUsage = usage + 1
    await pool.query(
      `UPDATE users 
       SET daily_report_usage = $1, last_report_usage_date = $2 
       WHERE id = $3`,
      [newUsage, today, userId]
    )

    return NextResponse.json({
      success: true,
      quota,
      usage: newUsage,
      remaining: quota - newUsage,
      message: `报告生成成功，已消耗 1 个配额。今日剩余 ${quota - newUsage}/${quota} 次`
    })
  } catch (error) {
    console.error("扣除报告配额失败:", error)
    return NextResponse.json(
      { error: "扣除配额失败" },
      { status: 500 }
    )
  }
}
