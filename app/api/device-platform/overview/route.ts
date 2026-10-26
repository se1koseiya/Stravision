/**
 * GET /api/device-platform/overview
 * 概览：连接数 / 设备数 / 在线设备 / 今日上报点数 + 运行时状态
 */

import { NextResponse } from 'next/server'
import { getDevicePlatformStats } from '@/lib/devices/service'
import { getRuntimeStatus, syncDeviceRuntime } from '@/lib/devices/runtime'
import { requireUser, serverError } from '@/lib/devices/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireUser()
  if (!guard.ok) return guard.response
  try {
    // 惰性启动常驻监听：用户打开接入页就能看到设备上报，不需要等某个定时任务
    await syncDeviceRuntime()
    const [stats] = await Promise.all([getDevicePlatformStats()])
    return NextResponse.json({ stats, runtime: getRuntimeStatus() })
  } catch (error) {
    return serverError('overview', error)
  }
}
