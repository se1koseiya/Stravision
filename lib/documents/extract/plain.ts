/**
 * 纯文本族读取：md / txt / csv / json / html
 *
 * 这些格式没有二进制结构，但仍然走同一条 IR（DocumentDigest），
 * 这样「读一份 md 大纲 → 生成 pptx」和「读一份 pptx → 生成 md」用的是同一套下游。
 */

import type { DocumentDigest, DigestSection, DigestTable } from '../types'
import { CharBudget, DEFAULT_MAX_CHARS, guessTitle, wantedSections, type ExtractOptions } from './common'

export async function extractPlain(buf: Buffer, format: DocumentDigest['format'], opts: ExtractOptions): Promise<DocumentDigest> {
  const raw = decodeBuffer(buf)
  const budget = new CharBudget(opts.maxChars ?? DEFAULT_MAX_CHARS)
  const only = wantedSections(opts.sections)
  const notes: string[] = []
  const sections: DigestSection[] = []
  const tables: DigestTable[] = []
  const outline: Array<{ level: number; title: string; sectionIndex?: number }> = []
  /** 文件里自带明确标题时用它（目前只有 md 的 H1） */
  let preferredTitle: string | undefined

  if (format === 'csv') {
    const table = parseCsv(raw)
    tables.push({ sectionIndex: 1, label: opts.fileName, headers: table.headers, rows: table.rows, truncatedRows: 0 })
    const lines = [
      `CSV：${table.rows.length + 1} 行 × ${table.headers.length} 列`,
      `表头：${table.headers.join(' ｜ ')}`,
      ...table.rows.slice(0, 40).map(r => '  ' + r.join(' ｜ ')),
    ]
    if (table.rows.length > 40) lines.push(`…另有 ${table.rows.length - 40} 行未展示`)
    const text = budget.take(lines.join('\n'))
    sections.push({ index: 1, kind: 'section', label: '数据表', text, charCount: text.length, tableIndexes: [0] })
    outline.push({ level: 1, title: '数据表', sectionIndex: 1 })
  } else if (format === 'json') {
    const pretty = tryPrettyJson(raw)
    const text = budget.take(pretty)
    sections.push({ index: 1, kind: 'section', label: 'JSON', text, charCount: text.length })
    outline.push({ level: 1, title: 'JSON 内容', sectionIndex: 1 })
    if (pretty.length > text.length) notes.push(`JSON 共 ${pretty.length} 字，已按预算截断。`)
  } else if (format === 'html') {
    const converted = htmlToSections(raw)
    let idx = 0
    for (const block of converted) {
      idx++
      if (only && !only.has(idx)) continue
      const text = budget.take(block.text)
      sections.push({ index: idx, kind: 'section', label: block.title || `第 ${idx} 节`, text, charCount: text.length })
      if (block.title) outline.push({ level: block.level, title: block.title, sectionIndex: idx })
      if (budget.remaining() <= 0) break
    }
  } else {
    // md / txt：按标题（md）或空行分块（txt）
    const blocks = format === 'md' ? splitMarkdown(raw) : splitParagraphs(raw)
    // md 的文档标题就是它的 H1 —— 不能交给 guessTitle 去"猜正文第一句"，
    // 否则一份以 `# 季度报告` 开头的文件，标题会变成正文里的第一段话。
    if (format === 'md') preferredTitle = blocks.find(b => b.level === 1 && b.title)?.title
    let idx = 0
    for (const block of blocks) {
      idx++
      if (only && !only.has(idx)) continue
      const text = budget.take(block.text)
      sections.push({ index: idx, kind: 'section', label: block.title || `第 ${idx} 段`, text, charCount: text.length })
      if (block.title) outline.push({ level: block.level, title: block.title, sectionIndex: idx })
      if (budget.remaining() <= 0) {
        notes.push(`已达读取预算（${budget.max} 字），后续段落未读取。可用 sections 续读。`)
        break
      }
    }
  }

  const fullText = sections.map(s => s.text).join('\n')
  return {
    fileId: opts.fileId,
    fileName: opts.fileName,
    format,
    sizeBytes: buf.length,
    title: preferredTitle || guessTitle(fullText, opts.fileName.replace(/\.[^.]+$/, '')),
    outline,
    sections,
    tables,
    images: [],
    stats: {
      chars: sections.reduce((n, s) => n + s.charCount, 0),
      tables: tables.length,
      images: 0,
      paragraphs: sections.length,
    },
    truncated: budget.truncated,
    notes,
  }
}

/** 解码：优先 UTF-8，含大量替换符时回退 GB18030（国内 Excel 导出的 CSV 常见） */
function decodeBuffer(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString('utf8')
  }
  const utf8 = buf.toString('utf8')
  const bad = (utf8.match(/\uFFFD/g) || []).length
  if (bad > 0 && bad / Math.max(1, utf8.length) > 0.002) {
    try {
      return new TextDecoder('gb18030').decode(buf)
    } catch {
      return utf8
    }
  }
  return utf8
}

/** md 按 # 标题切块；无标题则整体一节 */
function splitMarkdown(raw: string): Array<{ title?: string; level: number; text: string }> {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const blocks: Array<{ title?: string; level: number; text: string }> = []
  let cur: { title?: string; level: number; text: string } = { level: 1, text: '' }

  for (const line of lines) {
    const m = /^(#{1,6})\s+(.+)$/.exec(line)
    if (m) {
      if (cur.text.trim() || cur.title) blocks.push(cur)
      cur = { title: m[2].trim(), level: m[1].length, text: '' }
    } else {
      cur.text += line + '\n'
    }
  }
  if (cur.text.trim() || cur.title) blocks.push(cur)
  return blocks.length ? blocks : [{ level: 1, text: raw }]
}

/** 纯文本按空行分段；单段过长时按 3000 字硬切（避免一节吞掉整个预算） */
function splitParagraphs(raw: string): Array<{ title?: string; level: number; text: string }> {
  const chunks = raw
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(s => s.trim())
    .filter(Boolean)

  const out: Array<{ level: number; text: string }> = []
  for (const chunk of chunks) {
    if (chunk.length <= 3000) {
      out.push({ level: 1, text: chunk })
    } else {
      for (let i = 0; i < chunk.length; i += 3000) out.push({ level: 1, text: chunk.slice(i, i + 3000) })
    }
  }
  return out.length ? out : [{ level: 1, text: raw.slice(0, 3000) }]
}

/** 极简 CSV：支持引号包裹、转义双引号、CRLF */
function parseCsv(raw: string): { headers: string[]; rows: string[][] } {
  const text = raw.replace(/\r\n/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else inQuotes = false
      } else cell += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',' || ch === '\t') {
      row.push(cell.trim())
      cell = ''
    } else if (ch === '\n') {
      row.push(cell.trim())
      if (row.some(c => c)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  row.push(cell.trim())
  if (row.some(c => c)) rows.push(row)

  const width = rows.length ? Math.max(...rows.map(r => r.length)) : 0
  const norm = rows.map(r => (r.length < width ? [...r, ...Array(width - r.length).fill('')] : r))
  return { headers: norm[0] ?? [], rows: norm.slice(1) }
}

function tryPrettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

/** HTML 按 h1-h6 切块并去标签 */
function htmlToSections(html: string): Array<{ title?: string; level: number; text: string }> {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  const blocks: Array<{ title?: string; level: number; text: string }> = []
  const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi
  let last = 0
  let m: RegExpExecArray | null
  const push = (fragment: string, title?: string, level = 1) => {
    const text = toText(fragment)
    if (text || title) blocks.push({ title, level, text })
  }

  while ((m = re.exec(cleaned)) !== null) {
    push(cleaned.slice(last, m.index))
    push('', m[2].replace(/<[^>]+>/g, '').trim(), Number(m[1]))
    last = m.index + m[0].length
  }
  push(cleaned.slice(last))
  return blocks.filter(b => b.text || b.title)
}

function toText(html: string): string {
  return html
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, t) => `• ${String(t).replace(/<[^>]+>/g, '').trim()}\n`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr)>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .split('\n')
    .map(l => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}
