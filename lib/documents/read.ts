/**
 * 读取统一入口 + 面向模型的文本化
 *
 * 上层（工具层）只需要 `readDocument(fileId, userId, options)`，
 * 不关心它背后是 pdfjs 还是 mammoth。新增格式只改 formatOf + 分发。
 */

import { sniffFormat, unsupportedFormatMessage } from './sniff'
import { readDocument as readStored } from './store'
import type { DocFormat, DocumentDigest } from './types'
import { extractPdf } from './extract/pdf'
import { extractDocx } from './extract/docx'
import { extractXlsx } from './extract/xlsx'
import { extractPptx } from './extract/pptx'
import { extractPlain } from './extract/plain'
import type { ExtractOptions } from './extract/common'

export interface ReadOptions {
  /** 只读这些分节（pdf=页 / xlsx=工作表序 / pptx=幻灯片序 / docx=章节序） */
  sections?: number[]
  maxChars?: number
  /** 是否尝试多模态转写图片（代价高，默认关闭，仅扫描件需要） */
  includeImages?: boolean
  /** 视觉链路回调；不传则不做图片理解 */
  describeImage?: (dataUrl: string, hint: string) => Promise<string | null>
}

export interface ReadResult {
  digest: DocumentDigest
  /** 格式不可识别时的用户级提示（此时 digest 为 null） */
  error?: string
}

/** 读一份已存文档 */
export async function readDocument(
  fileId: string,
  userId: number,
  options: ReadOptions = {},
): Promise<ReadResult> {
  const stored = await readStored(fileId, userId)
  if (!stored) {
    return {
      digest: null as unknown as DocumentDigest,
      error: `找不到文件 ${fileId}（可能已被清理，或不属于当前用户）。可先列出本次对话的文件再选一个。`,
    }
  }

  const { meta, buf } = stored
  const sniff = sniffFormat(buf, meta.fileName)
  if (!sniff.format) {
    return { digest: null as unknown as DocumentDigest, error: unsupportedFormatMessage(sniff, meta.fileName) }
  }

  const opts: ExtractOptions = {
    fileId: meta.fileId,
    fileName: meta.fileName,
    sections: options.sections,
    maxChars: options.maxChars,
    includeImages: options.includeImages,
    describeImage: options.describeImage,
  }

  const digest = await extractByFormat(buf, sniff.format, opts)
  return { digest }
}

/** 按格式分发（导出供「不落盘、直接解析内存字节」的场景复用，如上传时预检） */
export async function extractByFormat(
  buf: Buffer,
  format: DocFormat,
  opts: ExtractOptions,
): Promise<DocumentDigest> {
  switch (format) {
    case 'pdf':
      return extractPdf(buf, opts)
    case 'docx':
      return extractDocx(buf, opts)
    case 'xlsx':
      return extractXlsx(buf, opts)
    case 'pptx':
      return extractPptx(buf, opts)
    default:
      return extractPlain(buf, format, opts)
  }
}

/**
 * DocumentDigest → 给模型读的文本。
 *
 * 排版刻意「结构化而紧凑」：
 *   · 头部是一行统计（模型据此判断要不要分段读）
 *   · 大纲在前（先看地图再决定走哪条路）
 *   · 表格给表头 + 若干行样例行，不整表倾倒
 *   · 每节标注 `[第 N 页]` 便于模型精确引用与后续编辑定位
 */
export function digestToText(digest: DocumentDigest): string {
  const lines: string[] = []

  const statParts: string[] = []
  if (digest.stats.pages) statParts.push(`${digest.stats.pages} 页`)
  if (digest.stats.sheets) statParts.push(`${digest.stats.sheets} 个工作表`)
  if (digest.stats.slides) statParts.push(`${digest.stats.slides} 张幻灯片`)
  statParts.push(`${digest.sections.length} 个可读分节`)
  statParts.push(`约 ${digest.stats.chars} 字`)
  if (digest.stats.tables) statParts.push(`${digest.stats.tables} 张表`)
  if (digest.stats.images) statParts.push(`${digest.stats.images} 张图`)

  lines.push(`《${digest.title || digest.fileName}》（${digest.format.toUpperCase()}，${statParts.join('，')}）`)
  lines.push(`file_id: ${digest.fileId}`)

  if (digest.outline.length) {
    lines.push('')
    lines.push('【大纲】')
    for (const o of digest.outline.slice(0, 60)) {
      const indent = '  '.repeat(Math.max(0, o.level - 1))
      const ref = o.sectionIndex != null ? ` → 第 ${o.sectionIndex} 节` : ''
      lines.push(`${indent}- ${o.title}${ref}`)
    }
  }

  lines.push('')
  for (const s of digest.sections) {
    const headRef =
      s.kind === 'page' ? `[第 ${s.index} 页]` :
      s.kind === 'sheet' ? `[工作表 ${s.index}]` :
      s.kind === 'slide' ? `[第 ${s.index} 张]` :
      `[第 ${s.index} 节]`
    lines.push(`${headRef} ${s.label}`)
    if (s.text.trim()) lines.push(s.text.trim())
    else if (s.kind === 'page') lines.push('（本页无文本层）')

    if (s.tableIndexes?.length) {
      for (const ti of s.tableIndexes) {
        const t = digest.tables[ti]
        if (!t) continue
        lines.push('')
        lines.push(`表格：${t.label}（${t.rows.length} 行${t.truncatedRows ? `，另有 ${t.truncatedRows} 行未展示` : ''}）`)
        if (t.headers.some(Boolean)) lines.push('| ' + t.headers.join(' | ') + ' |')
        for (const row of t.rows.slice(0, 15)) {
          lines.push('| ' + row.map(c => (c || '').slice(0, 30)).join(' | ') + ' |')
        }
        if (t.rows.length > 15) lines.push(`（仅列前 15 行，共 ${t.rows.length} 行）`)
      }
    }
    lines.push('')
  }

  const transcribed = digest.images.filter(i => i.transcript)
  if (transcribed.length) {
    lines.push('【图片内容（多模态识别）】')
    for (const img of transcribed.slice(0, 12)) {
      lines.push(`- ${img.label}：${(img.transcript || '').slice(0, 600)}`)
    }
    lines.push('')
  }

  if (digest.truncated) lines.push('⚠️ 内容超出单次读取预算，已截断。可用 sections 指定分节续读。')
  for (const n of digest.notes) lines.push(`提示：${n}`)

  return lines.join('\n').trim()
}
