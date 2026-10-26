/**
 * 编辑统一入口
 *
 * 对外只暴露一组操作名，内部分发到各格式的编辑器。
 * 每种格式支持哪些操作在这里**显式声明**（SUPPORTED_OPS），
 * 而不是让模型试错 —— 试错的代价是用户等了一轮才发现"PDF 改不了"。
 */

import { putDocument, readDocument, toArtifactRef } from '../store'
import { sniffFormat } from '../sniff'
import { applyDocxEdits, type DocxOp } from './docx'
import { applyXlsxEdits, type XlsxOp } from './xlsx'
import { applyPptxEdits, type PptxOp } from './pptx'
import type { ArtifactRef, DocFormat } from '../types'

/** 统一的操作描述（各格式取自己支持的那几种） */
export type DocumentEditOp =
  | { op: 'replace_text'; find: string; replace: string; limit?: number; slide?: number; sheet?: string }
  | { op: 'append_paragraph'; text: string }
  | { op: 'set_table_cell'; table?: number; row: number; col: number; value: string }
  | { op: 'set_cell'; sheet?: string; cell: string; value: string | number | null }
  | { op: 'append_rows'; sheet?: string; rows: Array<Array<string | number | null>> }
  | { op: 'set_slide_title'; slide: number; title: string }
  | { op: 'append_slide'; title: string; bullets?: string[] }
  | { op: 'set_sheet_name'; sheet: string; name: string }

/** 各格式支持的操作集合（工具层据此提前拒绝，而不是执行到一半失败） */
export const SUPPORTED_OPS: Record<string, readonly string[]> = {
  docx: ['replace_text', 'append_paragraph', 'set_table_cell'],
  xlsx: ['replace_text', 'set_cell', 'append_rows', 'set_sheet_name'],
  pptx: ['replace_text', 'set_slide_title', 'append_slide'],
  pdf: [],
  md: [],
  txt: [],
  csv: [],
  json: [],
  html: [],
}

/** 不支持编辑的格式，给出「应该怎么做」而不是只说不行 */
export function unsupportedEditMessage(format: DocFormat): string {
  if (format === 'pdf') {
    return (
      'PDF 不支持原地修改：PDF 是版面固化格式，改文字需要重排版面。' +
      '正确做法是用 document_read 读出内容，再用 document_create 以 docx 或 pdf 重新生成一份（用户能继续编辑）。'
    )
  }
  return `${format.toUpperCase()} 格式不支持结构化编辑。可以读取内容后用 document_create 生成新文件。`
}

export interface ApplyEditsResult {
  artifact: ArtifactRef
  replacements: number
  notes: string[]
  details: Array<{ op: string; ok: boolean; note?: string }>
  /** 文件真正被改动了吗（全部 op 都未命中时为 false） */
  changed: boolean
}

export interface ApplyEditsInput {
  fileId: string
  userId: number
  ops: DocumentEditOp[]
  sessionId?: string
  /** 输出文件名；不传则在原名后加「-已修改」 */
  fileName?: string
}

export async function applyDocumentEdits(input: ApplyEditsInput): Promise<ApplyEditsResult> {
  if (!input.ops?.length) throw new Error('ops 不能为空')

  const stored = await readDocument(input.fileId, input.userId)
  if (!stored) throw new Error(`找不到文件 ${input.fileId}（可能已被清理，或不属于当前用户）`)

  const { meta, buf } = stored
  const sniff = sniffFormat(buf, meta.fileName)
  const format = sniff.format
  if (!format) throw new Error(`无法识别文件格式：${sniff.evidence}`)

  const supported = SUPPORTED_OPS[format] ?? []
  if (supported.length === 0) throw new Error(unsupportedEditMessage(format))

  const unsupported = input.ops.filter(o => !supported.includes(o.op))
  if (unsupported.length) {
    throw new Error(
      `该文件是 ${format.toUpperCase()}，不支持这些操作：${[...new Set(unsupported.map(o => o.op))].join('、')}。` +
        `支持的操作：${supported.join('、')}。`,
    )
  }

  let out: Buffer
  let replacements = 0
  let notes: string[] = []
  let details: ApplyEditsResult['details'] = []

  if (format === 'docx') {
    const r = await applyDocxEdits(buf, input.ops as DocxOp[])
    out = r.buf
    replacements = r.replacements
    notes = r.notes
    details = r.details
  } else if (format === 'xlsx') {
    const r = await applyXlsxEdits(buf, input.ops as XlsxOp[])
    out = r.buf
    replacements = r.replacements
    notes = r.notes
    details = r.details
  } else if (format === 'pptx') {
    const r = await applyPptxEdits(buf, input.ops as PptxOp[])
    out = r.buf
    replacements = r.replacements
    notes = r.notes
    details = r.details
  } else {
    throw new Error(unsupportedEditMessage(format))
  }

  const changed = details.some(d => d.ok)
  if (!changed) {
    // 一个操作都没命中：不写盘，避免产生一堆"内容一样的新文件"污染文件列表
    return {
      artifact: toArtifactRef(meta),
      replacements: 0,
      notes: [...notes, '没有任何改动被应用，未生成新文件。'],
      details,
      changed: false,
    }
  }

  const baseName = meta.fileName.replace(/\.[^.]+$/, '')
  const ext = meta.fileName.split('.').pop() || format
  const newMeta = await putDocument({
    buf: out,
    fileName: input.fileName || `${baseName}-已修改.${ext}`,
    format,
    userId: input.userId,
    origin: 'edited',
    sourceFileId: meta.fileId,
    sessionId: input.sessionId ?? meta.sessionId,
  })

  return { artifact: toArtifactRef(newMeta), replacements, notes, details, changed: true }
}
