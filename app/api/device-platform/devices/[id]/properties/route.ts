/**
 * GET /api/device-platform/devices/[id]/properties
 *   ?latest=1                     最新值（每个属性一条）
 *   ?range=1h&keys=a,b            历史曲线数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGenericDevice, getLatestPropertyValues, getPropertyHistory } from '@/lib/devices/service'
import { badRequest, notFound, parseId, requireUser, serverError } from '@/lib/devices/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireUser(req)
  if (!guard.ok) return guard.response
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return badRequest('设备 ID 不合法')

  try {
    const device = await getGenericDevice(id)
    if (!device) return notFound('设备不存在')

    const sp = req.nextUrl.searchParams
    if (sp.get('latest') === '1' || !sp.get('range')) {
      const values = await getLatestPropertyValues(id)
      return NextResponse.json({
        deviceId: id,
        lastSeenAt: device.last_seen_at,
        values,
      })
    }

    const range = sp.get('range') || '1h'
    const keys = (sp.get('keys') || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
    const series = await getPropertyHistory(id, keys, range)
    return NextResponse.json({ deviceId: id, range, series })
  } catch (error) {
    return serverError('devices.properties', error)
  }
}
