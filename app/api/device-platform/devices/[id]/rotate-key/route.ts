/**
 * POST /api/device-platform/devices/[id]/rotate-key
 * 重置 HTTP 上报凭证（旧地址立即失效）
 */

import { NextRequest, NextResponse } from 'next/server'
import { regenerateIngestKey } from '@/lib/devices/service'
import { badRequest, notFound, parseId, requireAdmin, serverError } from '@/lib/devices/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return badRequest('设备 ID 不合法')

  try {
    const key = await regenerateIngestKey(id)
    if (!key) return notFound('设备不存在')
    return NextResponse.json({ ingest_key: key })
  } catch (error) {
    return serverError('devices.rotateKey', error)
  }
}
