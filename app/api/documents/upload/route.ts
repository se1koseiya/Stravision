/**
 * 文档上传
 *
 * 用户把 PDF / Word / Excel / PPT 拖进对话后落到这里。三件事：
 *   1. 嗅探真实格式（不信后缀，见 lib/documents/sniff.ts）；
 *   2. 落盘 + 登记元数据（只存 fileId，前端与 AI 都拿 id 说话）；
 *   3. 立刻做一次**轻量解析**（小预算）并返回摘要 —— 让用户上传完就能看到
 *      「已识别：Word 文档，5 段，约 2500 字」，而不是一片空白等着 AI 开口。
 *
 * 为什么解析放在请求里而不是后台任务：请求本身通常 100~800ms（PDF 首次要加载 pdfjs），
 * 用户能接受；而后台任务在 serverless / 桌面端都可能被回收，反而更不可靠。
 */

import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'buffer'
import { getCurrentUser } from '@/lib/auth'
import { sniffFormat, unsupportedFormatMessage } from '@/lib/documents/sniff'
import { MAX_DOCUMENT_BYTES, formatBytes, putDocument, toArtifactRef } from '@/lib/documents/store'
import { readDocument } from '@/lib/documents/read'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// PDF 解析首次加载 pdfjs + cmaps 可能超默认超时
export const maxDuration = 60

/** 上传时的解析预算：只要够生成一句摘要，不必读全文（正文由 document_read 按需读） */
const PREVIEW_MAX_CHARS = 1500

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file')
    const sessionIdRaw = form.get('sessionId')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: '缺少 file 字段' }, { status: 400 })
    }

    const f = file as File
    if (f.size === 0) return NextResponse.json({ error: '文件为空（0 字节）' }, { status: 400 })
    if (f.size > MAX_DOCUMENT_BYTES) {
      return NextResponse.json(
        { error: `文件超过 ${Math.round(MAX_DOCUMENT_BYTES / 1024 / 1024)}MB 上限（当前 ${(f.size / 1024 / 1024).toFixed(1)}MB）` },
        { status: 413 },
      )
    }

    const buf = Buffer.from(await f.arrayBuffer())
    const sniff = sniffFormat(buf, f.name)
    if (!sniff.format) {
      return NextResponse.json({ error: unsupportedFormatMessage(sniff, f.name) }, { status: 415 })
    }

    const userId = Number(user.id)
    const meta = await putDocument({
      buf,
      fileName: f.name || `未命名.${sniff.format}`,
      format: sniff.format,
      userId,
      origin: 'uploaded',
      sessionId: typeof sessionIdRaw === 'string' && sessionIdRaw.trim() ? sessionIdRaw.trim() : undefined,
    })

    // 轻量解析：失败不影响上传成功（文件已存好，AI 仍可读）
    let preview: { summary: string; stats: any; outline: any[] } | null = null
    try {
      const { digest } = await readDocument(meta.fileId, userId, { maxChars: PREVIEW_MAX_CHARS })
      if (digest) {
        preview = {
          summary: buildSummary(meta.fileName, meta.format, digest.stats, digest.sections.length),
          stats: digest.stats,
          outline: digest.outline.slice(0, 12),
        }
      }
    } catch (e: any) {
      console.warn('[documents/upload] 预览解析失败（不影响上传）:', e?.message ?? e)
    }

    return NextResponse.json({
      artifact: toArtifactRef(meta),
      sizeText: formatBytes(meta.sizeBytes),
      preview,
    })
  } catch (e: any) {
    console.error('[documents/upload] error:', e)
    return NextResponse.json({ error: e?.message || '上传失败' }, { status: 500 })
  }
}

/** 一句话摘要：`Word 文档 · 5 段 · 约 2500 字 · 1 张表` */
function buildSummary(fileName: string, format: string, stats: any, sectionCount: number): string {
  const parts: string[] = []
  if (stats.pages) parts.push(`${stats.pages} 页`)
  if (stats.sheets) parts.push(`${stats.sheets} 个工作表`)
  if (stats.slides) parts.push(`${stats.slides} 张幻灯片`)
  if (!parts.length) parts.push(`${sectionCount} 段`)
  parts.push(`约 ${stats.chars ?? 0} 字`)
  if (stats.tables) parts.push(`${stats.tables} 张表`)
  if (stats.images) parts.push(`${stats.images} 张图`)
  if (stats.textlessUnits) parts.push(`${stats.textlessUnits} 页为扫描件`)
  return `${format.toUpperCase()} · ${parts.join(' · ')}`
}
