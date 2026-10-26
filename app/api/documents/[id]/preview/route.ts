/**
 * 文档预览（鉴权 · 只回元数据与结构，不回二进制）
 *
 * ## 为什么单独开一个接口
 *
 * 下载接口是 `Content-Disposition: attachment`，语义上是"把文件拿走"；
 * 预览要的是"先看看里面是什么"。两者虽然都过 userId 校验，但载荷完全不同：
 *   · 下载 = 原始字节流；
 *   · 预览 = 结构化模型（几十 KB 的 JSON），前端据此渲染，不必自己解析二进制。
 *
 * ## 两条供给路径
 *
 *   1. `previewModel` —— 我们自己生成的产物（pptx 目前走这条）。
 *      文件是我们拼的，排版时的结构直接留在元数据里，前端照着渲染即可，
 *      预览和最终文件天然一致。
 *
 *   2. `digest` —— 用户上传的外部文件（没有 previewModel）。
 *      复用 `document_read` 的同一次抽取结果，前端按「分节文本 + 表格 + 图片索引」
 *      渲染。这是兜底视图，不是像素级还原 —— 对"我传的是不是这份"来说够了。
 *
 * 两条路径都只回**结构**；真正的二进制仍走下载接口（带鉴权 + no-store）。
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getDocumentMeta } from '@/lib/documents/store'
import { readDocument } from '@/lib/documents/read'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const { id } = await params
    const userId = Number(user.id)

    const meta = await getDocumentMeta(id, userId)
    if (!meta) return NextResponse.json({ error: '文件不存在或无权访问' }, { status: 404 })

    const base = {
      fileId: meta.fileId,
      fileName: meta.fileName,
      format: meta.format,
      sizeBytes: meta.sizeBytes,
    }

    // ① 我们自己生成的产物：有留结构就直接用
    if (meta.previewModel) {
      return NextResponse.json({ ...base, source: 'model', previewModel: meta.previewModel }, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    }

    // ② 外部上传件（以及没留版式结构的生成件）：服务端抽一次 Digest 兜底
    const { digest, error } = await readDocument(id, userId, { maxChars: 60_000 })
    if (error || !digest) {
      return NextResponse.json(
        { ...base, source: 'none', error: error || '无法解析该文件的内容' },
        { status: 422, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }

    // 图片索引里的 dataURL 不回传：那是给模型看的，回给前端会把响应撑大几十倍
    const images = (digest.images || []).map(img => ({
      sectionIndex: img.sectionIndex,
      label: img.label,
      bytes: img.bytes,
      width: img.width,
      height: img.height,
      transcript: img.transcript,
    }))

    return NextResponse.json(
      {
        ...base,
        source: 'digest',
        // 统一叫 previewModel：前端不关心它来自「生成时留下的版式」还是「现抽的 Digest」，
        // 只按 kind 分发渲染 —— 字段名对不上是今天「预览显示为空」的直接原因。
        previewModel: {
          kind: 'digest',
          title: digest.title,
          outline: digest.outline,
          sections: digest.sections,
          tables: digest.tables,
          images,
          stats: digest.stats,
          truncated: digest.truncated,
          notes: digest.notes,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (e: any) {
    console.error('[documents/preview] error:', e)
    return NextResponse.json({ error: e?.message || '预览失败' }, { status: 500 })
  }
}
