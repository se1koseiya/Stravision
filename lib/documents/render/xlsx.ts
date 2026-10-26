/**
 * XLSX 生成
 *
 * 用 exceljs 而不是 SheetJS 写文件：SheetJS 社区版**写不了单元格样式**
 * （字体、填充、边框全部被忽略），生成的表打开是纯黑白网格 —— 交给用户的报表不该长这样。
 * exceljs 支持表头样式、冻结窗格、自动筛选、列宽、数字格式，且是纯 JS 无原生依赖。
 *
 * 读取仍走 SheetJS（快，且不需要样式），读写各用各的长处。
 */

import ExcelJS from 'exceljs'

export interface SheetSpec {
  name: string
  /** 表头；不传则把 rows 第一行当表头 */
  headers?: string[]
  /** 数据行。数字会保持为数值（Excel 里可直接求和），字符串保持文本 */
  rows: Array<Array<string | number | null | undefined>>
  /** 列宽（字符数），不传自动按内容估算 */
  columnWidths?: number[]
}

export interface XlsxRenderOptions {
  /** 工作簿标题（写入文档属性，不影响表格内容） */
  title?: string
  author?: string
  /** 表头样式色（ARGB 六位，不带 #） */
  accent?: string
}

const HEADER_FILL = 'F2F5F4'
const HEADER_FONT = '1F2328'
const BORDER_COLOR = 'D9D9D9'

export async function renderXlsx(sheets: SheetSpec[], options: XlsxRenderOptions = {}): Promise<Buffer> {
  if (!sheets.length) throw new Error('至少需要一个工作表')

  const wb = new ExcelJS.Workbook()
  wb.creator = options.author || 'Stravision AI 助手'
  if (options.title) wb.title = options.title
  wb.created = new Date()

  for (const spec of sheets) {
    const name = sanitizeSheetName(spec.name)
    const ws = wb.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 1 }], // 冻结表头
    })

    const headers = spec.headers ?? (spec.rows.length ? spec.rows[0].map(v => stringify(v)) : [])
    const dataRows = spec.headers ? spec.rows : spec.rows.slice(1)

    if (headers.length) {
      const row = ws.addRow(headers)
      row.eachCell(cell => {
        cell.font = { bold: true, size: 11, color: { argb: HEADER_FONT } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
        cell.border = thinBorder()
      })
      row.height = 22
    }

    for (const raw of dataRows) {
      const row = ws.addRow(raw.map(v => normalizeCell(v)))
      row.eachCell(cell => {
        cell.border = thinBorder()
        cell.alignment = { vertical: 'top', wrapText: false }
      })
    }

    // 列宽：优先用显式值，否则按「表头与内容的最大显示宽度」估算
    const colCount = Math.max(headers.length, ...dataRows.map(r => r.length), 1)
    for (let c = 1; c <= colCount; c++) {
      const explicit = spec.columnWidths?.[c - 1]
      if (explicit) {
        ws.getColumn(c).width = explicit
        continue
      }
      const headerLen = displayWidth(headers[c - 1] ?? '')
      const bodyMax = dataRows.reduce((m, r) => Math.max(m, displayWidth(stringify(r[c - 1]))), 0)
      ws.getColumn(c).width = Math.min(50, Math.max(10, Math.max(headerLen, bodyMax) + 4))
    }

    // 自动筛选（有表头且有数据时才加，否则筛选按钮会盖住空行）
    if (headers.length && dataRows.length) {
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length },
      }
    }

    /**
     * 百分比列：Markdown 里写 `92.7%`，normalizeCell 会存成 0.927（这样才能求和、求平均），
     * 但**必须同时把列的数字格式设成 `0.##%`** —— 否则 Excel 里显示 0.93，
     * 用户以为数字被改坏了；而 `raw:false` 读回来也是 0.93，AI 下一轮改表就按错误的值算。
     * `0.##%` 保留源文本的小数位（92.7% 不会被补成 92.70%）。
     */
    const percentCols = new Set<number>()
    for (const raw of dataRows) {
      raw.forEach((v, i) => {
        if (typeof v === 'string' && /^-?(?:0|[1-9]\d*)(?:\.\d+)?%$/.test(v.trim())) percentCols.add(i + 1)
      })
    }
    for (const c of percentCols) ws.getColumn(c).numFmt = '0.##%'

    // 数字列自动设千分位/两位小数的显示格式，但不改值
    for (let c = 1; c <= colCount; c++) {
      if (percentCols.has(c)) continue // 百分比列已单独处理，别被千分位覆盖
      const values = dataRows.map(r => r[c - 1]).filter(v => v != null)
      if (values.length >= 3 && values.every(v => typeof v === 'number')) {
        const anyDecimal = values.some(v => !Number.isInteger(v as number))
        ws.getColumn(c).numFmt = anyDecimal ? '#,##0.00' : '#,##0'
      }
    }
  }

  const out = await wb.xlsx.writeBuffer()
  return Buffer.from(out as ArrayBuffer)
}

/** Excel 单元格值归一：数字保留数值，其余转文本（undefined→空） */
function normalizeCell(v: string | number | null | undefined): string | number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim()
  if (!s) return null
  // 纯数字字符串转数值，让用户在 Excel 里能直接求和；
  // 带前导 0（001）、带分隔符（1,234）、带单位（12kg）的一律保留文本
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?%?$/.test(s) && !/^0\d/.test(s)) {
    const n = s.endsWith('%') ? Number(s.slice(0, -1)) / 100 : Number(s)
    if (Number.isFinite(n)) return n
  }
  return s
}

function stringify(v: unknown): string {
  if (v == null) return ''
  return String(v)
}

/** 中文按 2 个字符宽度估算，列宽才不会被压扁 */
function displayWidth(s: string): number {
  let w = 0
  for (const ch of s) {
    w += /[\u4e00-\u9fa5\uff00-\uffef]/.test(ch) ? 2 : 1
  }
  return Math.min(w, 60)
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const side = { style: 'thin' as const, color: { argb: BORDER_COLOR } }
  return { top: side, left: side, bottom: side, right: side }
}

/** Excel 工作表名限制：≤31 字符，且不含 : \ / ? * [ ] */
function sanitizeSheetName(name: string): string {
  const cleaned = (name || 'Sheet').replace(/[:\\/?*[\]]/g, '_').trim()
  return (cleaned || 'Sheet').slice(0, 31)
}
