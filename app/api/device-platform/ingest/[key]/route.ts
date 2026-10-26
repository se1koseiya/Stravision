/**
 * POST /api/device-platform/ingest/[key]
 *
 * HTTP 上报入口：**公开路由**（设备/网关没有登录态），凭证就是 URL 里的 ingest key。
 * 设计取舍：
 *   - key 由平台生成（udk_ + 24 字节随机），可随时重置；泄露后只能伪造该设备的数据，
 *     不能读写其他设备（每台设备一把 key）。
 *   - 只在「设备已启用」且「连接未停用」时接收数据。
 *   - 限流 120 次/分钟/IP，避免被刷爆数据库。
 *   - 响应只回接受情况，不回显物模型，避免信息泄露。
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConnection, getDeviceByIngestKey } from '@/lib/devices/service'
import { ingestRaw } from '@/lib/devices/ingest'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 256 * 1024

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const limited = rateLimit(req, { limit: 120, windowMs: 60 * 1000 })
  if (!limited.success) {
    return NextResponse.json({ ok: false, error: '上报过于频繁' }, { status: 429, headers: CORS_HEADERS })
  }

  const { key } = await params
  if (!key || key.length < 12) {
    return NextResponse.json({ ok: false, error: '上报凭证无效' }, { status: 401, headers: CORS_HEADERS })
  }

  try {
    const device = await getDeviceByIngestKey(key)
    if (!device) {
      return NextResponse.json({ ok: false, error: '上报凭证无效' }, { status: 401, headers: CORS_HEADERS })
    }
    if (!device.is_enabled) {
      return NextResponse.json({ ok: false, error: '设备已停用' }, { status: 403, headers: CORS_HEADERS })
    }
    if (device.connection_id) {
      const connection = await getConnection(device.connection_id)
      if (connection && !connection.is_enabled) {
        return NextResponse.json({ ok: false, error: '所属接入连接已停用' }, { status: 403, headers: CORS_HEADERS })
      }
    }

    const raw = await req.text()
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: '报文过大（上限 256KB）' }, { status: 413, headers: CORS_HEADERS })
    }

    const result = await ingestRaw(device, raw)
    const status = result.ok ? 200 : 422
    return NextResponse.json(
      {
        ok: result.ok,
        accepted: result.accepted,
        missing: result.missing,
        error: result.error,
        values: result.values,
      },
      { status, headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('[DevicePlatform] ingest:', error)
    return NextResponse.json({ ok: false, error: '服务器内部错误' }, { status: 500, headers: CORS_HEADERS })
  }
}
