/**
 * GET    /api/device-platform/devices/[id]  设备详情（含最新属性值）
 * PATCH  /api/device-platform/devices/[id]  更新设备 / 物模型
 * DELETE /api/device-platform/devices/[id]  移除设备（属性历史一并清理）
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  deleteGenericDevice,
  getConnection,
  getGenericDevice,
  getLatestPropertyValues,
  toSafeConnection,
  updateGenericDevice,
} from '@/lib/devices/service'
import { normalizeThingModel, validateThingModel } from '@/lib/devices/thing-model'
import { badRequest, notFound, parseId, requireAdmin, requireUser, serverError } from '@/lib/devices/api-helpers'
import { forceResync, invalidateDeviceCache } from '@/lib/devices/runtime'

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
    const [values, connection] = await Promise.all([
      getLatestPropertyValues(id),
      device.connection_id ? getConnection(device.connection_id) : Promise.resolve(null),
    ])
    return NextResponse.json({
      device,
      values,
      connection: connection ? toSafeConnection(connection) : null,
    })
  } catch (error) {
    return serverError('devices.get', error)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return badRequest('设备 ID 不合法')

  try {
    const existing = await getGenericDevice(id)
    if (!existing) return notFound('设备不存在')
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return badRequest('请求体不是合法 JSON')

    let issues: unknown[] = []
    if (body.thing_model !== undefined) {
      const model = normalizeThingModel(body.thing_model)
      const validation = validateThingModel(model)
      if (!validation.ok) {
        return NextResponse.json({ error: '物模型校验未通过', issues: validation.issues }, { status: 400 })
      }
      issues = validation.issues
      body.thing_model = model
    }

    const device = await updateGenericDevice(id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      category: typeof body.category === 'string' ? body.category : undefined,
      type: typeof body.type === 'string' ? body.type : undefined,
      icon: typeof body.icon === 'string' ? body.icon : undefined,
      color: typeof body.color === 'string' ? body.color : undefined,
      subscribe_topic: body.subscribe_topic !== undefined ? (body.subscribe_topic === null ? null : String(body.subscribe_topic)) : undefined,
      publish_topic: body.publish_topic !== undefined ? (body.publish_topic === null ? null : String(body.publish_topic)) : undefined,
      external_id: body.external_id !== undefined ? (body.external_id === null ? null : String(body.external_id)) : undefined,
      thing_model: body.thing_model,
      is_enabled: body.is_enabled !== undefined ? body.is_enabled === true : undefined,
    })
    if (!device) return notFound('设备不存在')

    invalidateDeviceCache(device.connection_id ?? undefined)
    void forceResync()
    return NextResponse.json({ device, issues })
  } catch (error) {
    return serverError('devices.update', error)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return badRequest('设备 ID 不合法')

  try {
    const existing = await getGenericDevice(id)
    if (!existing) return notFound('设备不存在')
    const deleted = await deleteGenericDevice(id)
    invalidateDeviceCache(existing.connection_id ?? undefined)
    void forceResync()
    return NextResponse.json({ deleted })
  } catch (error) {
    return serverError('devices.delete', error)
  }
}
