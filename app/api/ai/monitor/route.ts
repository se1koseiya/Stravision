import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { globalOrchestratorManager } from "@/lib/ai/agent-orchestrator"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 鉴权守卫：仅管理员可查看 Agent 监控指标
async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return null
  if (user.role !== 'admin' && user.role !== 'super_admin') return null
  return user
}

/**
 * Agent 监控指标导出接口
 * GET /api/ai/monitor              → 聚合指标 + 历史快照 + 活跃会话数
 * GET /api/ai/monitor?detail=1     → 额外包含每个活跃会话的详细统计
 * POST /api/ai/monitor {action:"reset"} → 重置所有活跃编排器的指标
 */
export async function GET(req: Request) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const withDetail = searchParams.get('detail') === '1'
    const historyLimit = Math.min(Number(searchParams.get('history')) || 20, 100)

    const aggregated = globalOrchestratorManager.getAggregatedMetrics()
    const stats = globalOrchestratorManager.getStats()
    const history = globalOrchestratorManager.getMetricsHistory(historyLimit)

    const payload: Record<string, unknown> = {
      aggregated,
      stats,
      history,
      timestamp: Date.now(),
    }

    if (withDetail) {
      // 每个活跃会话的详细统计（含成功率、响应时间分布、Top 工具）
      payload.sessions = globalOrchestratorManager.getAll().map((o, i) => ({
        index: i,
        ...o.getMonitor().getDetailedStats(),
      }))
    }

    return NextResponse.json(payload)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Monitor API] Error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    if (body?.action !== 'reset') {
      return NextResponse.json({ error: "Unsupported action. Use {\"action\":\"reset\"} to reset metrics." }, { status: 400 })
    }

    // 重置所有活跃编排器的监控指标
    const orchestrators = globalOrchestratorManager.getAll()
    for (const o of orchestrators) {
      try { o.reset() } catch (e) {
        console.error('[Monitor API] Failed to reset orchestrator metrics:', e)
      }
    }

    return NextResponse.json({
      message: `Reset metrics for ${orchestrators.length} active orchestrator(s)`,
      resetAt: Date.now(),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Monitor API] POST Error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
