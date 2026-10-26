/**
 * GET /api/device-platform/protocols
 * 返回所有可用协议的元数据（前端据此动态渲染接入表单，不需要硬编码协议列表）
 *
 * 服务端专用模块（含 node:net），所以通过接口下发而不是让客户端直接 import。
 */

import { NextResponse } from 'next/server'
import { listProtocolMeta } from '@/lib/devices/protocols'
import { requireUser } from '@/lib/devices/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const guard = await requireUser()
  if (!guard.ok) return guard.response
  void req
  return NextResponse.json({ protocols: listProtocolMeta() })
}
