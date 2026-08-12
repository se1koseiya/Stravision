import { NextResponse } from "next/server"
import { initDB, query } from "@/lib/db/database"

export const dynamic = "force-dynamic"

/**
 * 健康检查端点
 * GET /api/health
 *
 * 用于容器编排（Docker / K8s）与负载均衡主动探活。
 * 返回各依赖项的检查结果，整体状态：ok / degraded / down。
 */
export async function GET() {
  const checks: Record<string, { status: "ok" | "down"; latencyMs?: number; error?: string }> = {}
  let overall: "ok" | "degraded" | "down" = "ok"

  // 1) 数据库连接
  try {
    const t0 = Date.now()
    await initDB()
    await query("SELECT 1")
    checks.database = { status: "ok", latencyMs: Date.now() - t0 }
  } catch (e: any) {
    checks.database = { status: "down", error: e?.message || "unknown" }
    overall = "down"
  }

  // 2) MQTT 连接状态（非致命，缺失仅降级）
  try {
    const { MQTTService } = await import("@/lib/mqtt-service")
    const connected = MQTTService.getInstance().isConnected()
    checks.mqtt = { status: connected ? "ok" : "down" }
    if (!connected && overall === "ok") overall = "degraded"
  } catch (e: any) {
    checks.mqtt = { status: "down", error: e?.message || "unknown" }
    if (overall === "ok") overall = "degraded"
  }

  const status = overall === "ok" ? 200 : overall === "degraded" ? 200 : 503
  return NextResponse.json({ status: overall, checks, timestamp: Date.now() }, { status })
}
