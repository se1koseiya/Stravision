/**
 * POST /api/device-platform/sync
 * 手动重建常驻监听（MQTT 订阅 / 轮询定时器），用于排查「配置改了但没生效」
 */

import { NextRequest, NextResponse } from 'next/server'
import { forceResync, getRuntimeStatus } from '@/lib/devices/runtime'
import { requireAdmin, serverError } from '@/lib/devices/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response
  try {
    await forceResync()
    return NextResponse.json({ ok: true, runtime: getRuntimeStatus() })
  } catch (error) {
    return serverError('sync', error)
  }
}
