/**
 * 设备详情 API
 *
 * GET    /api/devices/[id] - 获取单个设备
 * PATCH  /api/devices/[id] - 更新设备（仅 admin/super_admin）
 * DELETE /api/devices/[id] - 删除设备（仅 admin/super_admin）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { checkSecurity, logRequest } from '@/lib/security'
import { getDevice, updateDevice, deleteDevice } from '@/lib/db/device-registry-service'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const securityCheck = await checkSecurity(req)
  if (!securityCheck.allowed) return securityCheck.response!

  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const deviceId = parseInt(id, 10)
    if (isNaN(deviceId)) {
      return NextResponse.json({ error: 'Invalid device id' }, { status: 400 })
    }

    const device = await getDevice(deviceId)
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    await logRequest(req, 200, currentUser.id)
    return NextResponse.json({ device })
  } catch (error) {
    console.error('[Devices API] GET [id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const securityCheck = await checkSecurity(req)
  if (!securityCheck.allowed) return securityCheck.response!

  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      await logRequest(req, 403, currentUser.id)
      return NextResponse.json({ error: 'Permission denied: admin only' }, { status: 403 })
    }

    const { id } = await params
    const deviceId = parseInt(id, 10)
    if (isNaN(deviceId)) {
      return NextResponse.json({ error: 'Invalid device id' }, { status: 400 })
    }

    const body = await req.json()
    const device = await updateDevice(deviceId, body)

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // 🔥 动态订阅刷新（同 POST）：sensor 更新 topic 后立即同步 MQTT 订阅
    if (device.type === 'sensor' && device.subscribe_topic) {
      try {
        const { MQTTService } = await import('@/lib/mqtt-service')
        await MQTTService.getInstance().refreshDynamicSubscriptions()
      } catch (e) {
        console.error('[Devices API] refresh MQTT subscriptions failed:', e)
      }
    }

    await logRequest(req, 200, currentUser.id)
    return NextResponse.json({ device })
  } catch (error) {
    console.error('[Devices API] PATCH [id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const securityCheck = await checkSecurity(req)
  if (!securityCheck.allowed) return securityCheck.response!

  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      await logRequest(req, 403, currentUser.id)
      return NextResponse.json({ error: 'Permission denied: admin only' }, { status: 403 })
    }

    const { id } = await params
    const deviceId = parseInt(id, 10)
    if (isNaN(deviceId)) {
      return NextResponse.json({ error: 'Invalid device id' }, { status: 400 })
    }

    // force=true 时跳过 critical 保护（API 自身不做防护，仅 admin 调用）
    const force = new URL(req.url).searchParams.get('force') === 'true'
    const result = await deleteDevice(deviceId, { force })
    if (result.blocked === 'not_found') {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }
    if (result.blocked === 'critical') {
      return NextResponse.json(
        { error: '关键设备受保护：请先在设备管理页解除「关键设备」标记后再删除', code: 'CRITICAL_PROTECTED' },
        { status: 423 }
      )
    }
    if (!result.deleted) {
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
    }

    // 🔥 删除 sensor 后立即刷新 MQTT 动态订阅，避免旧 topic 仍在收数据
    try {
      const { MQTTService } = await import('@/lib/mqtt-service')
      await MQTTService.getInstance().refreshDynamicSubscriptions()
    } catch (e) {
      console.error('[Devices API] refresh MQTT subscriptions after delete failed:', e)
    }

    await logRequest(req, 200, currentUser.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Devices API] DELETE [id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
