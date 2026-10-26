/**
 * 文档下载（鉴权）
 *
 * 与 public/uploads 的区别：产物与上传件都含用户业务数据，必须过登录校验，
 * 且只能下自己的（`getDocumentMeta` 里做 userId 比对，不匹配等同不存在）。
 *
 * 中文文件名用 RFC 5987 的 `filename*`：直接塞进 `filename=` 会被部分浏览器截断成乱码。
 * 同时保留 ASCII 兜底（老浏览器只认 `filename=`）。
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getDocumentMeta, mimeOf, readDocument } from '@/lib/documents/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const { id } = await params
    const userId = Number(user.id)

    const meta = await getDocumentMeta(id, userId)
    if (!meta) return NextResponse.json({ error: '文件不存在或无权访问' }, { status: 404 })

    const stored = await readDocument(id, userId)
    if (!stored) return NextResponse.json({ error: '文件内容已丢失' }, { status: 410 })

    const asciiFallback = meta.fileName.replace(/[^\x20-\x7E]/g, '_')
    const encoded = encodeURIComponent(meta.fileName)

    // `?inline=1` → 让浏览器**就地打开**而不是下载。
    // PDF 预览走这条路：浏览器自带 PDF 渲染器（含翻页/缩放/查找），
    // 比引一个 pdfjs 在 canvas 上重画一遍更稳、更小、也不需要配 worker。
    const inline = new URL(req.url).searchParams.get('inline') === '1'
    const disposition = inline ? 'inline' : 'attachment'

    return new Response(new Uint8Array(stored.buf), {
      status: 200,
      headers: {
        'Content-Type': mimeOf(meta.format),
        'Content-Length': String(stored.buf.length),
        'Content-Disposition': `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`,
        // 私密内容：禁止 CDN / 浏览器中间层缓存
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e: any) {
    console.error('[documents/download] error:', e)
    return NextResponse.json({ error: e?.message || '下载失败' }, { status: 500 })
  }
}
