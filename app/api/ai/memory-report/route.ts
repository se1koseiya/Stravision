/**
 * 记忆档案报告 API
 *
 * POST /api/ai/memory-report
 *   汇总当前用户的记忆数据（偏好/设备模式/成功策略/执行统计），
 *   生成 HTML 报告并保存到"我的空间"（user_reports 表），
 *   通过 SSE 推送 new_report 事件，前端"我的空间"面板实时刷新。
 *
 * 无需前端传参，所有数据从服务端记忆系统读取。
 */
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createUserReport } from "@/lib/db/user-reports-service"
import { publishUserEvent } from "@/lib/server/user-event-bus"
import { generateMemoryReport } from "@/lib/ai/memory-report-generator"

export async function POST(_req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: "未登录" }, { status: 401 })
  }

  try {
    // 1. 生成记忆画像 HTML 报告
    const report = await generateMemoryReport(user.id as number)

    // 2. 保存到"我的空间"
    const reportId = await createUserReport({
      user_id: user.id as number,
      title: report.title,
      html: report.html,
      summary: report.summary,
      source: "chat",
      type: "report"
    })

    // 3. 通过 SSE 推送通知前端"我的空间"面板实时刷新
    publishUserEvent({
      type: "new_report",
      userId: user.id as number,
      report: {
        id: reportId,
        title: report.title,
        type: "report",
        source: "chat",
        created_at: Date.now()
      }
    })

    return Response.json({
      success: true,
      id: reportId,
      title: report.title,
      summary: report.summary
    })
  } catch (error) {
    console.error("[Memory Report] Failed to generate:", error)
    return Response.json(
      { error: "生成记忆档案失败，请稍后重试" },
      { status: 500 }
    )
  }
}
