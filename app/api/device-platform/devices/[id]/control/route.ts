/**
 * POST /api/device-platform/devices/[id]/control
 *
 * 统一下发入口：
 *   { "action": "turn_on", "params": { ... } }   执行动作
 *   { "property": "brightness", "value": 80 }     写可写属性
 *
 * 返回里带 request（已渲染的真实 topic / url / payload），用户可以直接拿去复现。
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeDeviceAction, writeDeviceProperty } from '@/lib/devices/commands'
import { badRequest, parseId, requireAdmin, serverError } from '@/lib/devices/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return badRequest('设备 ID 不合法')

  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return badRequest('请求体不是合法 JSON')

    const operator = guard.user.username || guard.user.email || `user#${guard.user.id}`

    if (typeof body.action === 'string' && body.action) {
      const result = await executeDeviceAction(id, body.action, body.params, operator)
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }

    if (typeof body.property === 'string' && body.property) {
      const result = await writeDeviceProperty(id, body.property, body.value, operator)
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }

    return badRequest('需要提供 action（动作标识）或 property（属性标识）')
  } catch (error) {
    return serverError('devices.control', error)
  }
}
