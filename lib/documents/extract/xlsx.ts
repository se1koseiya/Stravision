/**
 * XLSX 读取
 *
 * 电子表格的「读」与文档不同：模型需要的不是一段连续文字，而是
 * **结构（哪几个 sheet、每个多大）+ 表头 + 若干代表行 + 公式**。
 * 把 5000 行数据整段倒给模型既装不下也没意义。
 *
 * 所以这里的输出是：
 *   · 每个 sheet = 一个分节，正文是「尺寸 + 表头 + 前 N 行」的可读摘要
 *   · 同一批数据同时以 DigestTable 形式给出（供编辑工具按行列精确定位）
 *   · 公式单独列出（模型改表时最容易破坏的就是公式引用）
 */

import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import type { DocumentDigest, DigestSection, DigestTable } from '../types'
import { CharBudget, DEFAULT_MAX_CHARS, wantedSections, type ExtractOptions } from './common'

/** 单个 sheet 最多展示的数据行（超出部分只报数量） */
const MAX_ROWS_PER_SHEET = 300
/** 单个 sheet 最多展示的列（宽表按上限截断） */
const MAX_COLS_PER_SHEET = 40

export async function extractXlsx(buf: Buffer, opts: ExtractOptions): Promise<DocumentDigest> {
  // cellDates:true 让日期单元格返回 Date 而不是序列号（45923 这种数字模型看不懂）
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, cellFormula: true, cellStyles: false })
  const budget = new CharBudget(opts.maxChars ?? DEFAULT_MAX_CHARS)
  const only = wantedSections(opts.sections)
  const notes: string[] = []

  // 公式直接从 OOXML 取：SheetJS 会**丢弃没有缓存值的单元格**
  // （exceljs / 程序生成的公式表只有 <f> 没有 <v>，SheetJS 读出来该单元格直接消失）。
  // 公式是"改表时最容易踩坏"的信息，不能丢。
  const formulasBySheet = await readSheetFormulas(buf)

  const sections: DigestSection[] = []
  const tables: DigestTable[] = []
  const outline: Array<{ level: number; title: string; sectionIndex?: number }> = []

  wb.SheetNames.forEach((name, i) => {
    const sectionIndex = i + 1
    if (only && !only.has(sectionIndex)) return

    const ws = wb.Sheets[name]
    if (!ws || !ws['!ref']) {
      sections.push({ index: sectionIndex, kind: 'sheet', label: `工作表「${name}」`, text: '（空表）', charCount: 4 })
      outline.push({ level: 1, title: `${name}（空表）`, sectionIndex })
      return
    }

    const range = XLSX.utils.decode_range(ws['!ref'])
    const totalRows = range.e.r - range.s.r + 1
    const totalCols = range.e.c - range.s.c + 1

    const matrix = XLSX.utils.sheet_to_json<any[]>(ws, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    }) as any[][]

    const shownRows = matrix.slice(0, MAX_ROWS_PER_SHEET + 1)
    const normalized = shownRows.map(row => {
      const cells = (row || []).slice(0, MAX_COLS_PER_SHEET).map(v => cellText(v))
      while (cells.length < Math.min(totalCols, MAX_COLS_PER_SHEET)) cells.push('')
      return cells
    })

    const headers = normalized[0] ?? []
    const dataRows = normalized.slice(1)
    const truncatedRows = Math.max(0, matrix.length - shownRows.length)

    if (dataRows.length || headers.some(Boolean)) {
      tables.push({
        sectionIndex,
        label: `${name}!${ws['!ref']}`,
        headers,
        rows: dataRows,
        truncatedRows,
      })
    }

    // ── 公式清单（OOXML 优先，SheetJS 结果作为补充去重）──
    const formulaSet = new Set<string>(formulasBySheet.get(name) ?? [])
    for (const addr of Object.keys(ws)) {
      if (addr.startsWith('!')) continue
      const cell = ws[addr] as XLSX.CellObject
      if (cell?.f) formulaSet.add(`${addr} = ${cell.f}`)
    }
    const formulas = [...formulaSet].slice(0, 30)

    // ── 合并单元格 ──
    const merges = (ws['!merges'] || []).slice(0, 20).map(m => XLSX.utils.encode_range(m))

    const lines: string[] = []
    lines.push(`工作表「${name}」：${totalRows} 行 × ${totalCols} 列（区域 ${ws['!ref']}）`)
    if (headers.some(Boolean)) {
      lines.push(`表头：${headers.filter(Boolean).join(' ｜ ').slice(0, 400)}`)
    }
    if (dataRows.length) {
      lines.push(`前 ${Math.min(dataRows.length, 40)} 行数据：`)
      for (const row of dataRows.slice(0, 40)) {
        lines.push('  ' + row.map(c => c.slice(0, 40)).join(' ｜ '))
      }
    }
    if (truncatedRows > 0) lines.push(`…另有 ${truncatedRows} 行未展示`)
    if (formulas.length) lines.push(`公式：${formulas.join('；')}`)
    if (merges.length) lines.push(`合并单元格：${merges.join('，')}`)

    const text = budget.take(lines.join('\n'))
    sections.push({
      index: sectionIndex,
      kind: 'sheet',
      label: `工作表「${name}」`,
      text,
      charCount: text.length,
      tableIndexes: tables.length ? [tables.length - 1] : undefined,
    })
    outline.push({ level: 1, title: `${name}（${totalRows}×${totalCols}）`, sectionIndex })

    if (budget.remaining() <= 0 && i < wb.SheetNames.length - 1) {
      notes.push(`已达读取预算（${budget.max} 字），后续工作表未读取。可用 sections 指定工作表序号续读。`)
    }
  })

  const sheetCount = wb.SheetNames.length
  return {
    fileId: opts.fileId,
    fileName: opts.fileName,
    format: 'xlsx',
    sizeBytes: buf.length,
    title: wb.Props?.Title || opts.fileName.replace(/\.xlsx$/i, ''),
    outline,
    sections,
    tables,
    images: [],
    stats: {
      sheets: sheetCount,
      chars: sections.reduce((n, s) => n + s.charCount, 0),
      tables: tables.length,
      images: 0,
      paragraphs: sections.length,
    },
    truncated: budget.truncated,
    notes,
  }
}

/**
 * 从 OOXML 直接读各工作表的公式（`<c r="D2"><f>B2*C2</f></c>`）。
 *
 * 工作表名 → 文件路径的映射必须走 `workbook.xml` 的 `<sheet>` + rels 的 rId，
 * 不能按 sheetN.xml 的文件名数字猜 —— 重命名/重排过的工作簿，文件名顺序与显示顺序不一致。
 */
async function readSheetFormulas(buf: Buffer): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  try {
    const zip = await JSZip.loadAsync(buf)
    const workbookXml = await zip.file('xl/workbook.xml')?.async('string')
    const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string')
    if (!workbookXml || !relsXml) return out

    const ridToTarget = new Map<string, string>()
    for (const m of relsXml.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/g)) {
      ridToTarget.set(m[1], m[2])
    }

    for (const m of workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)) {
      const attrs = m[1]
      const name = (attrs.match(/\bname="([^"]*)"/) || [])[1]
      const rid = (attrs.match(/\br:id="([^"]*)"/) || [])[1]
      if (!name || !rid) continue
      const target = ridToTarget.get(rid)
      if (!target) continue
      const sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
      const xml = await zip.file(sheetPath)?.async('string')
      if (!xml) continue

      const list: string[] = []
      // 必须逐个 `<c>…</c>` 解析：用「`<c>` 之后非贪婪找 `<f>`」会跨单元格匹配，
      // 把 A1 的地址配到 D2 的公式上（实测踩过）。
      for (const cm of xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
        const addr = (cm[1].match(/\br="([A-Z]+\d+)"/) || [])[1]
        const f = (cm[2].match(/<f\b[^>]*>([\s\S]*?)<\/f>/) || [])[1]
        if (addr && f) list.push(`${addr} = ${decodeXml(f)}`)
        if (list.length >= 60) break
      }
      if (list.length) out.set(name, list)
    }
  } catch {
    // 公式是附加信息，解析失败不影响主流程
  }
  return out
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

/** 单元格 → 可读文本（日期格式化、布尔/错误值归一） */
function cellText(v: any): string {
  if (v == null) return ''
  if (v instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`
  }
  if (typeof v === 'number') {
    // 浮点误差（0.30000000000000004）会让模型误判数据质量
    return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(6)))
  }
  return String(v).replace(/\s+/g, ' ').trim()
}
