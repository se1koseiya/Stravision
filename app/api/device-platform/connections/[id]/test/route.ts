/**
 * POST /api/device-platform/connections/[id]/test
 * 连通性自检（会发真实请求：MQTT 建连 / HTTP GET / Modbus 读寄存器）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/lib/devices/protocols'
import { getConnection, recordConnectionTest, toSafeConnection } from '@/lib/devices/service'
import { badRequest, notFound, parseId, requireAdmin, serverError } from '@/lib/devices/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return badRequest('连接 ID 不合法')

  try {
    const connection = await getConnection(id)
    if (!connection) return notFound('连接不存在')
    const adapter = getAdapter(connection.protocol)
    if (!adapter) return badRequest(`不支持的协议：${connection.protocol}`)

    const result = await adapter.test(connection)
    await recordConnectionTest(id, { ok: result.ok, error: result.ok ? undefined : result.detail })
    const refreshed = await getConnection(id)
    return NextResponse.json({
      ok: result.ok,
      detail: result.detail,
      extra: result.extra,
      connection: refreshed ? toSafeConnection(refreshed) : null,
    })
  } catch (error) {
    return serverError('connections.test', error)
  }
}
