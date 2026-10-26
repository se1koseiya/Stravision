/**
 * 文档列表（鉴权）
 *
 * 给预览面板的「+」按钮用：模型这轮可能产出多份文件，用户不想滚回对话里挨个找，
 * 点「+」直接从最近的文档里挑一份打开。
 *
 * 与下载/预览同一条鉴权口径：只返回当前用户自己的文件，跨用户视同不存在。
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { listSessionDocuments, formatBytes } from '@/lib/documents/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const userId = Number(user.id)
    const sp = req.nextUrl.searchParams
    const sessionId = sp.get('sessionId') || undefined
    const limit = Math.min(Math.max(Number(sp.get('limit')) || 12, 1), 50)

    const metas = await listSessionDocuments(userId, { sessionId, limit })

    return NextResponse.json(
      {
        items: metas.map(m => ({
          fileId: m.fileId,
          fileName: m.fileName,
          format: m.format,
          sizeBytes: m.sizeBytes,
          sizeText: formatBytes(m.sizeBytes),
          downloadUrl: `/api/documents/${m.fileId}/download`,
          createdAt: m.createdAt,
          hasPreviewModel: Boolean(m.previewModel),
        })),
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (e: any) {
    console.error('[documents/list] error:', e)
    return NextResponse.json({ error: e?.message || '获取文档列表失败' }, { status: 500 })
  }
}
