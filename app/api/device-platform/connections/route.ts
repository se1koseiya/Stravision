/**
 * GET  /api/device-platform/connections  连接列表（凭证只回掩码字段名）
 * POST /api/device-platform/connections  新建接入连接（admin）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdapter, isProtocolId } from '@/lib/devices/protocols'
import {
  countDevicesGrouped,
  createConnection,
  listConnections,
  toSafeConnection,
} from '@/lib/devices/service'
import { badRequest, requireAdmin, requireUser, serverError } from '@/lib/devices/api-helpers'
import { forceResync } from '@/lib/devices/runtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireUser(req)
  if (!guard.ok) return guard.response
  try {
    const [connections, counts] = await Promise.all([listConnections(), countDevicesGrouped()])
    return NextResponse.json({
      connections: connections.map((c) => toSafeConnection(c, counts.get(c.id) ?? 0)),
    })
  } catch (error) {
    return serverError('connections.list', error)
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return badRequest('请求体不是合法 JSON')

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return badRequest('连接名称必填')
    if (!isProtocolId(body.protocol)) return badRequest('请选择支持的协议（mqtt / http / modbus_tcp）')

    const adapter = getAdapter(body.protocol)!
    const config = body.config && typeof body.config === 'object' ? body.config : {}
    const secrets = body.secrets && typeof body.secrets === 'object' ? body.secrets : {}
    const errors = adapter.validate(config, secrets)
    if (errors.length > 0) return badRequest(errors.join('；'))

    const connection = await createConnection({
      name,
      protocol: body.protocol,
      description: typeof body.description === 'string' ? body.description : undefined,
      config,
      secrets,
      is_enabled: body.is_enabled !== false,
      allow_private_network: body.allow_private_network === true,
      owner_id: guard.user.id,
    })

    // 新连接可能带 MQTT 订阅，后台异步拉起（不阻塞响应）
    void forceResync()

    return NextResponse.json(
      { connection: toSafeConnection(connection, 0) },
      { status: 201 }
    )
  } catch (error) {
    return serverError('connections.create', error)
  }
}
