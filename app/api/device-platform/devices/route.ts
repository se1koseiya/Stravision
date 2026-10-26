/**
 * GET  /api/device-platform/devices  通用设备列表（可按 connectionId 过滤）
 * POST /api/device-platform/devices  接入一台新设备（admin）
 *
 * 与 /api/devices（内置注册表）并存：
 * - /api/devices 管的是 access_mode='legacy' 的专属硬件
 * - 这里只管 access_mode='generic' 的通用设备，互不干扰
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConnection, listGenericDevices, createGenericDevice, getLatestValuesForDevices } from '@/lib/devices/service'
import { normalizeThingModel, validateThingModel } from '@/lib/devices/thing-model'
import { badRequest, parseId, requireAdmin, requireUser, serverError } from '@/lib/devices/api-helpers'
import { forceResync } from '@/lib/devices/runtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireUser(req)
  if (!guard.ok) return guard.response
  try {
    const connectionId = parseId(req.nextUrl.searchParams.get('connectionId') || '')
    const devices = await listGenericDevices(connectionId ?? undefined)
    const latest = await getLatestValuesForDevices(devices.map((d) => d.id))
    return NextResponse.json({
      devices: devices.map((d) => ({
        ...d,
        // 列表页直接带最新值，避免每张卡片各发一个请求
        latest: latest.get(d.id) || [],
      })),
    })
  } catch (error) {
    return serverError('devices.list', error)
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return badRequest('请求体不是合法 JSON')

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return badRequest('设备名称必填')

    const connectionId = parseId(String(body.connection_id ?? ''))
    if (!connectionId) return badRequest('请选择接入连接')
    const connection = await getConnection(connectionId)
    if (!connection) return badRequest('接入连接不存在')

    const model = normalizeThingModel(body.thing_model)
    const validation = validateThingModel(model)
    if (!validation.ok) {
      return NextResponse.json(
        { error: '物模型校验未通过', issues: validation.issues },
        { status: 400 }
      )
    }

    // 上行 topic 与下行 topic 支持占位符，这里只做长度限制，渲染发生在运行时
    const subscribeTopic = typeof body.subscribe_topic === 'string' ? body.subscribe_topic.trim().slice(0, 200) : undefined
    const publishTopic = typeof body.publish_topic === 'string' ? body.publish_topic.trim().slice(0, 200) : undefined
    if (connection.protocol === 'mqtt' && !subscribeTopic && !publishTopic) {
      return badRequest('MQTT 设备至少需要填「上报 topic」或「下发 topic」之一')
    }

    const device = await createGenericDevice({
      name,
      connection_id: connectionId,
      external_id: typeof body.external_id === 'string' ? body.external_id.trim().slice(0, 120) : undefined,
      category: typeof body.category === 'string' ? body.category : undefined,
      type: typeof body.type === 'string' ? body.type : 'generic',
      icon: typeof body.icon === 'string' ? body.icon : undefined,
      color: typeof body.color === 'string' ? body.color : undefined,
      subscribe_topic: subscribeTopic,
      publish_topic: publishTopic,
      thing_model: model,
      protocol: connection.protocol,
    })

    void forceResync()
    return NextResponse.json({ device, issues: validation.issues }, { status: 201 })
  } catch (error) {
    return serverError('devices.create', error)
  }
}
