/**
 * XLSX 就地编辑
 *
 * 用 exceljs 读写（不是 SheetJS）：exceljs 能保留样式、合并单元格、数据验证、冻结窗格、
 * 公式（写回时公式字符串原样保留），SheetJS 社区版写回会把这些丢掉。
 *
 * 已知限制（必须在结果里如实告诉用户，而不是假装无损）：
 *   · 图表（chart）、图片、数据透视表 —— exceljs 不支持读写，编辑后会丢失；
 *   · 因此工具返回里会带一条 note，让用户知道"这是改后的副本，原件仍在"。
 */

import ExcelJS from 'exceljs'

export type XlsxOp =
  | { op: 'set_cell'; sheet?: string; cell: string; value: string | number | null }
  | { op: 'append_rows'; sheet?: string; rows: Array<Array<string | number | null>> }
  | { op: 'replace_text'; find: string; replace: string; sheet?: string; limit?: number }
  | { op: 'set_sheet_name'; sheet: string; name: string }

export interface XlsxEditResult {
  buf: Buffer
  replacements: number
  notes: string[]
  details: Array<{ op: string; ok: boolean; note?: string }>
}

export async function applyXlsxEdits(buf: Buffer, ops: XlsxOp[]): Promise<XlsxEditResult> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf as unknown as ArrayBuffer)

  if (wb.worksheets.length === 0) throw new Error('工作簿里没有任何工作表')

  let replacements = 0
  const notes: string[] = []
  const details: XlsxEditResult['details'] = []

  const resolveSheet = (name?: string, fallbackIndex = 0): ExcelJS.Worksheet | null => {
    if (name) {
      const byName = wb.getWorksheet(name)
      if (byName) return byName
      // 允许用序号（"1" 表示第一张）
      const n = Number(name)
      if (Number.isFinite(n) && n >= 1 && n <= wb.worksheets.length) return wb.worksheets[n - 1]
      return null
    }
    return wb.worksheets[fallbackIndex] ?? null
  }

  for (const op of ops) {
    if (op.op === 'set_cell') {
      const ws = resolveSheet(op.sheet)
      if (!ws) {
        details.push({ op: `set_cell(${op.cell})`, ok: false, note: `找不到工作表「${op.sheet}」` })
        continue
      }
      const addr = op.cell.replace(/\$/g, '').toUpperCase()
      if (!/^[A-Z]{1,3}\d{1,7}$/.test(addr)) {
        details.push({ op: `set_cell(${op.cell})`, ok: false, note: '单元格地址格式不对，应为 A1 / B12 这种' })
        continue
      }
      const cell = ws.getCell(addr)
      // 公式：以 = 开头的字符串按公式写入，Excel 会重新计算
      if (typeof op.value === 'string' && op.value.startsWith('=')) {
        cell.value = { formula: op.value.slice(1) } as ExcelJS.CellFormulaValue
      } else {
        cell.value = op.value as ExcelJS.CellValue
      }
      details.push({ op: `set_cell(${ws.name}!${addr})`, ok: true })
    } else if (op.op === 'append_rows') {
      const ws = resolveSheet(op.sheet)
      if (!ws) {
        details.push({ op: 'append_rows', ok: false, note: `找不到工作表「${op.sheet}」` })
        continue
      }
      for (const row of op.rows) ws.addRow(row as ExcelJS.CellValue[])
      details.push({ op: `append_rows(${ws.name} +${op.rows.length}行)`, ok: true })
    } else if (op.op === 'replace_text') {
      const sheets = op.sheet ? [resolveSheet(op.sheet)].filter(Boolean) as ExcelJS.Worksheet[] : wb.worksheets
      let hit = 0
      const limit = op.limit ?? Infinity
      for (const ws of sheets) {
        ws.eachRow({ includeEmpty: false }, row => {
          row.eachCell({ includeEmpty: false }, cell => {
            if (hit >= limit) return
            const v = cell.value
            if (typeof v === 'string' && v.includes(op.find)) {
              cell.value = v.split(op.find).join(op.replace)
              hit += v.split(op.find).length - 1
            } else if (v && typeof v === 'object' && 'formula' in (v as any) && typeof (v as any).formula === 'string') {
              const f = (v as any).formula as string
              if (f.includes(op.find)) {
                cell.value = { formula: f.split(op.find).join(op.replace) } as ExcelJS.CellFormulaValue
                hit++
              }
            }
          })
        })
      }
      replacements += hit
      details.push({
        op: `replace_text("${op.find.slice(0, 20)}")`,
        ok: hit > 0,
        note: hit > 0 ? `命中 ${hit} 处` : '未找到目标文本',
      })
    } else if (op.op === 'set_sheet_name') {
      const ws = wb.getWorksheet(op.sheet)
      if (!ws) {
        details.push({ op: 'set_sheet_name', ok: false, note: `找不到工作表「${op.sheet}」` })
        continue
      }
      ws.name = op.name.replace(/[:\\/?*[\]]/g, '_').slice(0, 31)
      details.push({ op: `set_sheet_name(${ws.name})`, ok: true })
    }
  }

  const out = await wb.xlsx.writeBuffer()
  notes.push('本次编辑输出的是新副本；若原表含图表/图片/数据透视表，这类元素不会被 exceljs 保留，建议对照原件确认。')

  return { buf: Buffer.from(out as ArrayBuffer), replacements, notes, details }
}
