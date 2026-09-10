export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { initDB } from '@/lib/db/database'
import {
  getUnreadAlerts,
  markAlertRead,
  dismissAlert,
  checkAndNotify,
  ensureGuardianTable,
  getDeviceStatus,
  type GuardianAlert,
  type DeviceStatusInfo,
} from '@/lib/ai/guardian-service'

/**
 * AI 主动守护通知 API
 *
 * GET  /api/ai/guardian-alerts            → 获取当前用户未读通知
 * POST /api/ai/guardian-alerts            → 手动触发一次守护检查（需传 sensorData）
 * PATCH /api/ai/guardian-alerts?id=N      → 标记某条通知已读
 * POST /api/ai/guardian-alerts?id=N&action=dismiss → 忽略某条通知
 */

async function requireUser() {
  const user = await getCurrentUser()
  if (!user) return null
  await initDB()
  await ensureGuardianTable()
  return user
}

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit') || 20), 50)
    const alerts: GuardianAlert[] = await getUnreadAlerts(user.id as number, limit)

    // 设备状态查询失败不阻塞 alerts 返回（降级为 null，前端按中性文案渲染）
    let deviceStatus: DeviceStatusInfo | null = null
    try {
      deviceStatus = await getDeviceStatus()
    } catch (e) {
      console.error('[Guardian Alerts API] getDeviceStatus failed:', e)
    }

    return Response.json({ alerts, count: alerts.length, deviceStatus })
  } catch (e: any) {
    console.error('[Guardian Alerts API] GET failed:', e)
    return Response.json({ error: `AI API Error: 500 - ${e?.message || 'Internal server error'}` }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get('id')
    const action = searchParams.get('action')

    // 路由：忽略某条通知
    if (idParam && action === 'dismiss') {
      const id = Number(idParam)
      if (!Number.isFinite(id)) return Response.json({ error: 'invalid id' }, { status: 400 })
      await dismissAlert(id, user.id as number)
      return Response.json({ ok: true })
    }

    // 路由：手动触发守护检查（走 LLM 分析，须检查积分；dismiss/已读不消耗 token 不检查）
    const sensorData = body?.sensorData
    if (sensorData && typeof sensorData === 'object') {
      const { checkCreditAllowance } = await import('@/lib/db/credit-service')
      const denyReason = await checkCreditAllowance(user.id as number)
      if (denyReason) {
        return Response.json({ error: `${denyReason}。` }, { status: 403 })
      }
      const created: GuardianAlert[] = await checkAndNotify(user.id as number, sensorData)
      return Response.json({ triggered: created.length, alerts: created })
    }

    return Response.json({ error: 'missing sensorData or id+action' }, { status: 400 })
  } catch (e: any) {
    console.error('[Guardian Alerts API] POST failed:', e)
    return Response.json({ error: `AI API Error: 500 - ${e?.message || 'Internal server error'}` }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    if (!Number.isFinite(id)) return Response.json({ error: 'invalid id' }, { status: 400 })

    await markAlertRead(id, user.id as number)
    return Response.json({ ok: true })
  } catch (e: any) {
    console.error('[Guardian Alerts API] PATCH failed:', e)
    return Response.json({ error: `AI API Error: 500 - ${e?.message || 'Internal server error'}` }, { status: 500 })
  }
}
