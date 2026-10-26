/**
 * DOCX 就地编辑（保格式）
 *
 * ## 为什么不用「解析成 Markdown 再重新生成」
 *
 * 那条路会把格式全部抹掉：字体、字号、行距、编号列表、页眉页脚、批注、批注锚点、
 * 分节符、图片位置…… 用户把一份排版好的合同交给助手改一句话，拿回来的应该还是
 * **同一份合同**，只是那句话变了。
 *
 * 所以这里直接在 `word/document.xml` 上做文本手术：只改 `<w:t>` 里的字符，
 * 其余 XML 一个字节都不动。格式天然保留。
 *
 * ## 跨 run 替换是核心难点
 *
 * Word 会把一段连续文字切成多个 run（拼写检查、格式变化、输入法边界都会触发）：
 *
 *   <w:p><w:r><w:t>草莓灰霉病</w:t></w:r><w:r><w:t>防治方案</w:t></w:r></w:p>
 *
 * 直接在单个 `<w:t>` 里找 "草莓灰霉病防治方案" 永远找不到。正确做法是：
 * 在**段落**层面拼接所有 run 的文本做匹配，再把命中区间映射回具体 run，
 * 把替换文本写进第一个受影响的 run、清空中间 run、保留最后一个 run 的尾部。
 */

import JSZip from 'jszip'

export interface DocxEditResult {
  buf: Buffer
  /** 实际发生的替换次数（0 表示没找到目标文本，要如实告诉用户） */
  replacements: number
  notes: string[]
}

const RUN_T_RE = /<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g

/** 反转义 XML（只处理 Word 会写出的五种 + 数字实体） */
export function decodeXmlText(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
}

export function encodeXmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // XML 1.0 非法控制字符必须剔除，否则 Word 打不开
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

/**
 * 在一个 `<w:p>` 内做文本替换（跨 run 安全）。
 *
 * @returns 替换后的段落 XML 与命中次数
 */
export function replaceInParagraph(paragraphXml: string, find: string, replace: string, limit = Infinity): {
  xml: string
  count: number
} {
  if (!find) return { xml: paragraphXml, count: 0 }

  type Slot = { start: number; end: number; text: string; raw: string; attrs: string }
  const slots: Slot[] = []
  let combined = ''

  RUN_T_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RUN_T_RE.exec(paragraphXml)) !== null) {
    const raw = m[0]
    const openTagEnd = raw.indexOf('>')
    const attrs = raw.slice(4, openTagEnd) // 跳过 `<w:t`，保留其后的属性（含前导空格）
    const inner = raw.slice(openTagEnd + 1, raw.lastIndexOf('</w:t>'))
    const text = decodeXmlText(inner)
    slots.push({ start: combined.length, end: combined.length + text.length, text, raw, attrs })
    combined += text
  }
  if (!slots.length) return { xml: paragraphXml, count: 0 }

  // 从后往前找，替换不影响前面未处理部分的 offset
  const hits: Array<{ s: number; e: number }> = []
  let from = 0
  while (hits.length < limit) {
    const idx = combined.indexOf(find, from)
    if (idx < 0) break
    hits.push({ s: idx, e: idx + find.length })
    from = idx + find.length
  }
  if (!hits.length) return { xml: paragraphXml, count: 0 }

  // 重建 run 文本
  const newTexts = slots.map(s => s.text)
  for (const hit of [...hits].reverse()) {
    const firstIdx = slots.findIndex(s => hit.s >= s.start && hit.s < s.end)
    const lastIdx = slots.findIndex(s => hit.e > s.start && hit.e <= s.end)
    const i = firstIdx < 0 ? slots.length - 1 : firstIdx
    const j = lastIdx < 0 ? i : Math.max(i, lastIdx)
    const prefix = newTexts[i].slice(0, hit.s - slots[i].start)
    const suffix = newTexts[j].slice(hit.e - slots[j].start)
    newTexts[i] = prefix + replace + (i === j ? suffix : '')
    for (let k = i + 1; k < j; k++) newTexts[k] = ''
    if (i !== j) newTexts[j] = suffix
  }

  // 按原顺序把新文本写回，保留每个 run 的原始属性（含 xml:space）
  let cursor = 0
  const rebuilt = paragraphXml.replace(RUN_T_RE, () => {
    const slot = slots[cursor]
    const text = newTexts[cursor]
    cursor++
    if (!slot) return ''
    const keepSpace = /\bxml:space="preserve"/.test(slot.attrs) || /^\s|\s$/.test(text)
    const attrs = keepSpace && !/xml:space/.test(slot.attrs) ? `${slot.attrs} xml:space="preserve"` : slot.attrs
    return `<w:t${attrs}>${encodeXmlText(text)}</w:t>`
  })

  return { xml: rebuilt, count: hits.length }
}

/** 全文替换（遍历所有段落） */
export function replaceInDocumentXml(
  xml: string,
  find: string,
  replace: string,
  limit = Infinity,
): { xml: string; count: number } {
  let total = 0
  const out = xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, para => {
    if (total >= limit) return para
    const r = replaceInParagraph(para, find, replace, limit - total)
    total += r.count
    return r.xml
  })
  return { xml: out, count: total }
}

/** 替换第 tableIndex 个表格的 (row, col) 单元格文本 */
export function replaceTableCell(
  xml: string,
  tableIndex: number,
  row: number,
  col: number,
  value: string,
): { xml: string; ok: boolean } {
  const tables = [...xml.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/g)]
  const target = tables[tableIndex]
  if (!target || target.index == null) return { xml, ok: false }

  const tableXml = target[0]
  const rows = [...tableXml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)]
  const rowMatch = rows[row]
  if (!rowMatch) return { xml, ok: false }

  const cells = [...rowMatch[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)]
  const cellMatch = cells[col]
  if (!cellMatch) return { xml, ok: false }

  // 单元格内可能有多段：只把第一段的首个 run 设为新值，其余 run/段落清空 ——
  // 保留单元格原有的段落格式与边框，而不是整块重建
  const newCell = replaceFirstRunText(cellMatch[0], value)

  const patched = xml.slice(0, target.index) + newCell + xml.slice(target.index + tableXml.length)
  return { xml: patched, ok: true }
}

/** 把一段 XML 里的第一个 w:t 设成指定文本，后续 w:t 清空（保留段落与 run 结构） */
function replaceFirstRunText(scopeXml: string, value: string): string {
  let done = false
  return scopeXml.replace(RUN_T_RE, (raw: string) => {
    const openTagEnd = raw.indexOf('>')
    const attrs = raw.slice(4, openTagEnd) // 跳过 `<w:t`，保留其后的属性（含前导空格）
    if (!done) {
      done = true
      const keepSpace = /xml:space/.test(attrs) || /^\s|\s$/.test(value)
      const a = keepSpace && !/xml:space/.test(attrs) ? `${attrs} xml:space="preserve"` : attrs
      return `<w:t${a}>${encodeXmlText(value)}</w:t>`
    }
    return `<w:t${attrs}></w:t>`
  })
}

/** 在正文末尾追加段落（保留原文档最后的分节属性 sectPr） */
export function appendParagraphs(xml: string, texts: string[]): { xml: string; count: number } {
  if (!texts.length) return { xml, count: 0 }
  const paragraphs = texts
    .map(t => `<w:p><w:r><w:t xml:space="preserve">${encodeXmlText(t)}</w:t></w:r></w:p>`)
    .join('')

  const sectPrMatch = xml.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/)
  if (sectPrMatch && sectPrMatch.index != null) {
    // sectPr 必须是 body 的最后一个子元素，插到它前面
    const at = sectPrMatch.index
    return { xml: xml.slice(0, at) + paragraphs + xml.slice(at), count: texts.length }
  }
  const bodyEnd = xml.lastIndexOf('</w:body>')
  if (bodyEnd < 0) return { xml, count: 0 }
  return { xml: xml.slice(0, bodyEnd) + paragraphs + xml.slice(bodyEnd), count: texts.length }
}

// ─────────────────────────────────────────────────────────────
// 对外：执行一组编辑操作
// ─────────────────────────────────────────────────────────────

export type DocxOp =
  | { op: 'replace_text'; find: string; replace: string; limit?: number }
  | { op: 'append_paragraph'; text: string }
  | { op: 'set_table_cell'; table?: number; row: number; col: number; value: string }

export interface ApplyDocxEditsResult extends DocxEditResult {
  /** 每条操作的结果，便于如实汇报"第几条没命中" */
  details: Array<{ op: string; ok: boolean; note?: string }>
}

export async function applyDocxEdits(buf: Buffer, ops: DocxOp[]): Promise<ApplyDocxEditsResult> {
  const zip = await JSZip.loadAsync(buf)
  const docFile = zip.file('word/document.xml')
  if (!docFile) throw new Error('不是有效的 docx：缺少 word/document.xml')

  let xml = await docFile.async('string')
  let replacements = 0
  const notes: string[] = []
  const details: ApplyDocxEditsResult['details'] = []

  for (const op of ops) {
    if (op.op === 'replace_text') {
      const r = replaceInDocumentXml(xml, op.find, op.replace, op.limit ?? Infinity)
      xml = r.xml
      replacements += r.count
      details.push({
        op: `replace_text("${op.find.slice(0, 20)}")`,
        ok: r.count > 0,
        note: r.count > 0 ? `命中 ${r.count} 处` : '未找到目标文本（可能在表格、页眉或图片里，或文字被拆散在多个段落）',
      })
    } else if (op.op === 'append_paragraph') {
      const r = appendParagraphs(xml, [op.text])
      xml = r.xml
      details.push({ op: 'append_paragraph', ok: r.count > 0 })
    } else if (op.op === 'set_table_cell') {
      const r = replaceTableCell(xml, op.table ?? 0, op.row, op.col, op.value)
      xml = r.xml
      details.push({
        op: `set_table_cell(表${op.table ?? 0} 行${op.row} 列${op.col})`,
        ok: r.ok,
        note: r.ok ? undefined : '定位失败：表格/行/列序号越界（序号从 0 开始）',
      })
    }
  }

  zip.file('word/document.xml', xml)
  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

  // 页眉页脚里的文字不在 document.xml，命中不到时给个明确解释，避免用户以为工具坏了
  if (replacements === 0 && ops.some(o => o.op === 'replace_text')) {
    const hasHeader = Object.keys(zip.files).some(n => /^word\/(header|footer)\d*\.xml$/.test(n))
    if (hasHeader) notes.push('文档含页眉/页脚，其中的文字不在本次替换范围内。')
  }

  return { buf: out, replacements, notes, details }
}
