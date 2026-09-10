/**
 * 设备注册表 API
 *
 * GET  /api/devices          - 获取设备列表（所有认证用户）
 * GET  /api/devices?type=xxx - 按类型过滤
 * POST /api/devices          - 创建设备（仅 admin/super_admin）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { checkSecurity, logRequest } from '@/lib/security'
import {
  listDevices,
  listDevicesByType,
  createDevice,
  DeviceType,
} from '@/lib/db/device-registry-service'

/**
 * 设备写入后刷新 MQTT 动态订阅（bug 修复）：
 * subscribeToDynamicDeviceTopics 此前全库无调用方 —— admin 新增 sensor 设备并配置了
 * subscribe_topic 后，MQTT 客户端不会订阅新 topic，设备数据永远到不了平台。
 * POST/PATCH 落库成功后立即刷新。MQTT 未连接时静默跳过（连接成功后 init 会全量加载一次）。
 */
async function refreshMqttSubscriptions(): Promise<void> {
  try {
    const { MQTTService } = await import('@/lib/mqtt-service')
    await MQTTService.getInstance().refreshDynamicSubscriptions()
  } catch (e) {
    console.error('[Devices API] refresh MQTT subscriptions failed:', e)
  }
}

export async function GET(req: NextRequest) {
  const securityCheck = await checkSecurity(req)
  if (!securityCheck.allowed) return securityCheck.response!

  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') as DeviceType | null
    const includeDisabled = searchParams.get('includeDisabled') === 'true'

    // 只有 admin 可以看到禁用的设备
    const canSeeDisabled = includeDisabled && (currentUser.role === 'admin' || currentUser.role === 'super_admin')

    let devices
    if (type) {
      devices = await listDevicesByType(type, { includeDisabled: canSeeDisabled })
    } else {
      devices = await listDevices({ includeDisabled: canSeeDisabled })
    }

    await logRequest(req, 200, currentUser.id)
    return NextResponse.json({ devices })
  } catch (error) {
    console.error('[Devices API] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const securityCheck = await checkSecurity(req)
  if (!securityCheck.allowed) return securityCheck.response!

  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 仅 admin/super_admin 可创建设备
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      await logRequest(req, 403, currentUser.id)
      return NextResponse.json({ error: 'Permission denied: admin only' }, { status: 403 })
    }

    const body = await req.json()

    // 基本校验
    if (!body.name || !body.type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 })
    }
    const validTypes = ['relay', 'sensor', 'camera', 'stepper']
    if (!validTypes.includes(body.type)) {
      return NextResponse.json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 })
    }

    const device = await createDevice({
      name: body.name,
      type: body.type,
      category: body.category,
      subscribe_topic: body.subscribe_topic,
      publish_topic: body.publish_topic,
      node_id: body.node_id,
      icon: body.icon,
      color: body.color,
      config: body.config,
      is_critical: body.is_critical,
      is_enabled: body.is_enabled,
      sort_order: body.sort_order,
    })

    // 🔥 动态订阅刷新：新增 sensor 设备后立即订阅其 topic，否则数据到不了平台
    if (device.type === 'sensor' && device.subscribe_topic) {
      await refreshMqttSubscriptions()
    }

    await logRequest(req, 200, currentUser.id)
    return NextResponse.json({ device }, { status: 201 })
  } catch (error) {
    console.error('[Devices API] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
