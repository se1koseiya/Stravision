/**
 * GET    /api/device-platform/connections/[id]  连接详情
 * PATCH  /api/device-platform/connections/[id]  更新（secrets 增量合并，空串=删除该键）
 * DELETE /api/device-platform/connections/[id]  删除（有设备时拒绝）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/lib/devices/protocols'
import {
  countDevicesOfConnection,
  deleteConnection,
  getConnection,
  toSafeConnection,
  updateConnection,
} from '@/lib/devices/service'
import { badRequest, notFound, parseId, requireAdmin, requireUser, serverError } from '@/lib/devices/api-helpers'
import { dropDeviceRuntime, forceResync } from '@/lib/devices/runtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireUser(req)
  if (!guard.ok) return guard.response
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return badRequest('连接 ID 不合法')
  try {
    const connection = await getConnection(id)
    if (!connection) return notFound('连接不存在')
    const count = await countDevicesOfConnection(id)
    return NextResponse.json({ connection: toSafeConnection(connection, count) })
  } catch (error) {
    return serverError('connections.get', error)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return badRequest('连接 ID 不合法')

  try {
    const existing = await getConnection(id)
    if (!existing) return notFound('连接不存在')
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return badRequest('请求体不是合法 JSON')

    const config = body.config !== undefined
      ? (body.config && typeof body.config === 'object' ? body.config : {})
      : existing.config

    // secrets 增量合并：前端拿不到原文，只提交改动的键；空串 = 删除
    let secrets = existing.secrets
    if (body.secrets && typeof body.secrets === 'object') {
      const merged: Record<string, unknown> = { ...existing.secrets }
      for (const [k, v] of Object.entries(body.secrets as Record<string, unknown>)) {
        if (v === '' || v === null) delete merged[k]
        else merged[k] = v
      }
      secrets = merged
    }

    const adapter = getAdapter(existing.protocol)
    if (adapter) {
      const errors = adapter.validate(config, secrets)
      if (errors.length > 0) return badRequest(errors.join('；'))
    }

    const updated = await updateConnection(id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      description: body.description !== undefined ? (body.description === null ? null : String(body.description)) : undefined,
      config,
      secrets,
      is_enabled: body.is_enabled !== undefined ? body.is_enabled === true : undefined,
      allow_private_network: body.allow_private_network !== undefined ? body.allow_private_network === true : undefined,
    })
    if (!updated) return notFound('连接不存在')

    if (!updated.is_enabled) dropDeviceRuntime(id)
    else void forceResync()

    const count = await countDevicesOfConnection(id)
    return NextResponse.json({ connection: toSafeConnection(updated, count) })
  } catch (error) {
    return serverError('connections.update', error)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return badRequest('连接 ID 不合法')

  try {
    const result = await deleteConnection(id)
    if (result.blocked === 'not_found') return notFound('连接不存在')
    if (result.blocked === 'has_devices') {
      return NextResponse.json(
        { error: '该连接下还有设备，请先移除设备再删除连接' },
        { status: 409 }
      )
    }
    dropDeviceRuntime(id)
    return NextResponse.json({ deleted: result.deleted })
  } catch (error) {
    return serverError('connections.delete', error)
  }
}
