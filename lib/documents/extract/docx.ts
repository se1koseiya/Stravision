/**
 * DOCX 读取
 *
 * mammoth 把 .docx 转成语义 HTML（它读的是 OOXML 语义，不是版式），本模块再把这个 HTML
 * 拆成「大纲 + 分节正文 + 结构化表格 + 图片」。
 *
 * 两个刻意的处理：
 *
 * 1. **表格单独抽出**，不混在正文里。
 *    表格是 Office 文档里信息密度最高的部分，转成 markdown 管道表塞进正文后，
 *    模型既数不清列、也订不了「第 3 行第 2 列」这种精确引用。抽成二维数组后，
 *    编辑工具可以直接按 `table[0].rows[2][1]` 定位。
 *
 * 2. **图片不内联成 base64**。
 *    mammoth 默认把每张图转成 dataURI 塞进 <img src>，一份图文报告立刻变成几百 KB 的字符串。
 *    这里用 convertImage 拦下来：正文只留 `[图片 3]` 占位，字节另存到 images[]。
 */

import mammoth from 'mammoth'
import type { DocumentDigest, DigestImage, DigestSection, DigestTable, OutlineNode } from '../types'
import { CharBudget, DEFAULT_MAX_CHARS, MAX_VISION_IMAGE_BYTES, guessTitle, wantedSections, type ExtractOptions } from './common'

export async function extractDocx(buf: Buffer, opts: ExtractOptions): Promise<DocumentDigest> {
  const collectedImages: Array<{ mime: string; bytes: Buffer }> = []

  const result = await mammoth.convertToHtml(
    { buffer: buf },
    {
      convertImage: mammoth.images.imgElement(async image => {
        const bytes = Buffer.from(await image.read('base64'), 'base64')
        collectedImages.push({ mime: image.contentType || 'image/png', bytes })
        return { src: `__img_${collectedImages.length - 1}__`, alt: `[图片 ${collectedImages.length}]` }
      }),
    } as any,
  )

  const html = result.value || ''
  const budget = new CharBudget(opts.maxChars ?? DEFAULT_MAX_CHARS)
  const only = wantedSections(opts.sections)
  const notes: string[] = []

  // ── 1. 抽表格，正文里换占位 ──
  const tables: DigestTable[] = []
  const bodyHtml = html.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml: string) => {
    const parsed = parseHtmlTable(tableHtml)
    if (!parsed || parsed.rows.length === 0) return ''
    tables.push({
      sectionIndex: 0, // 下面按所在分节回填
      label: `表格 ${tables.length + 1}`,
      headers: parsed.headers,
      rows: parsed.rows,
      truncatedRows: 0,
    })
    return `\n<p>［表格 ${tables.length}：${parsed.headers.join('｜').slice(0, 60)}］</p>\n`
  })

  // ── 2. 按标题切分节 ──
  const blocks = splitByHeadings(bodyHtml)
  const sections: DigestSection[] = []
  const outline: OutlineNode[] = []
  let sectionIndex = 0
  let tableCursor = 0

  for (const block of blocks) {
    sectionIndex++
    if (only && !only.has(sectionIndex)) continue

    const text = htmlToText(block.html)
    const content = budget.take(text)

    // 把该块内出现的表格归属到本节（按占位顺序推进游标即可，表格是顺序消费的）
    const tableRefs: number[] = []
    const placeholders = (block.html.match(/［表格 \d+/g) || []).length
    for (let k = 0; k < placeholders && tableCursor < tables.length; k++) {
      tables[tableCursor].sectionIndex = sectionIndex
      tables[tableCursor].label = `${block.title ? block.title + ' · ' : ''}表格 ${tableCursor + 1}`
      tableRefs.push(tableCursor)
      tableCursor++
    }

    sections.push({
      index: sectionIndex,
      kind: 'section',
      label: block.title || `第 ${sectionIndex} 段`,
      text: content,
      charCount: content.length,
      tableIndexes: tableRefs.length ? tableRefs : undefined,
    })

    if (block.title) {
      outline.push({ level: block.level || 1, title: block.title, sectionIndex })
    }

    if (budget.remaining() <= 0) {
      notes.push(`已达读取预算（${budget.max} 字），后续章节未读取。请用 sections 指定章节续读。`)
      break
    }
  }

  // ── 3. 图片 ──
  const images: DigestImage[] = []
  for (let i = 0; i < collectedImages.length; i++) {
    const item = collectedImages[i]
    if (item.bytes.length < 6 * 1024) continue // 图标/装饰
    const entry: DigestImage = {
      sectionIndex: findSectionOfImage(bodyHtml, i, sections),
      label: `图片 ${i + 1}（${Math.round(item.bytes.length / 1024)}KB）`,
      bytes: item.bytes.length,
    }
    if (opts.includeImages && opts.describeImage && item.bytes.length <= MAX_VISION_IMAGE_BYTES) {
      const dataUrl = `data:${item.mime};base64,${item.bytes.toString('base64')}`
      entry.dataUrl = dataUrl
      try {
        entry.transcript = (await opts.describeImage(dataUrl, `${opts.fileName} 中的图片 ${i + 1}`)) ?? undefined
      } catch {
        // 单张失败不影响整体
      }
    }
    images.push(entry)
  }

  const fullText = sections.map(s => s.text).join('\n')
  const title = guessTitle(fullText, opts.fileName.replace(/\.docx$/i, ''))
  if (result.messages?.length) {
    const meaningful = result.messages.filter((m: any) => m.type === 'warning').slice(0, 3)
    for (const m of meaningful) notes.push(`转换提示：${m.message}`)
  }

  return {
    fileId: opts.fileId,
    fileName: opts.fileName,
    format: 'docx',
    sizeBytes: buf.length,
    title,
    outline,
    sections,
    tables,
    images,
    stats: {
      chars: sections.reduce((n, s) => n + s.charCount, 0),
      tables: tables.length,
      images: images.length,
      paragraphs: sections.length,
    },
    truncated: budget.truncated,
    notes,
  }
}

/** 按 h1~h6 切块；块内保留原文 HTML（表格占位也在这里） */
function splitByHeadings(html: string): Array<{ title?: string; level?: number; html: string }> {
  const parts: Array<{ title?: string; level?: number; html: string }> = []
  const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(html)) !== null) {
    const before = html.slice(last, m.index)
    if (before.trim()) {
      // 第一个标题之前的前言：单独成节（文档标题、摘要常在标题前）
      if (parts.length === 0) parts.push({ html: before })
      else parts[parts.length - 1].html += before
    }
    parts.push({ title: stripTags(m[2]).trim(), level: Number(m[1]), html: '' })
    last = m.index + m[0].length
  }
  const tail = html.slice(last)
  if (parts.length === 0) parts.push({ html: tail })
  else parts[parts.length - 1].html += tail

  return parts.filter(p => p.html.trim() || p.title)
}

/** mammoth 输出的 HTML → 给模型读的纯文本（保留列表符号与段落边界） */
function htmlToText(html: string): string {
  let s = html
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, t) => `• ${stripTags(t).trim()}\n`)
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<\/(p|div|tr|h[1-6]|blockquote)>/gi, '\n')
  s = s.replace(/<(p|div|tr|h[1-6]|blockquote)[^>]*>/gi, '')
  s = s.replace(/<\/?[^>]+>/g, '')
  s = decodeEntities(s)
  return s
    .split('\n')
    .map(l => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, ''))
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

/** <table> → 表头 + 行（处理 colspan 简单展开，保证列数对齐） */
function parseHtmlTable(html: string): { headers: string[]; rows: string[][] } | null {
  const rows: string[][] = []
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let tr: RegExpExecArray | null
  while ((tr = trRe.exec(html)) !== null) {
    const cells: string[] = []
    const cellRe = /<(td|th)([^>]*)>([\s\S]*?)<\/\1>/gi
    let c: RegExpExecArray | null
    while ((c = cellRe.exec(tr[1])) !== null) {
      const span = Number((c[2].match(/colspan=["']?(\d+)/i) || [])[1] || 1)
      const text = stripTags(c[3]).replace(/\s+/g, ' ').trim()
      cells.push(text)
      for (let k = 1; k < span; k++) cells.push('')
    }
    if (cells.length) rows.push(cells)
  }
  if (!rows.length) return null

  const width = Math.max(...rows.map(r => r.length))
  const normalized = rows.map(r => (r.length < width ? [...r, ...Array(width - r.length).fill('')] : r))
  return { headers: normalized[0], rows: normalized.slice(1) }
}

/** 图片占位在哪个分节里（占位是 `__img_N__`） */
function findSectionOfImage(_html: string, index: number, sections: DigestSection[]): number {
  // 简化：图片顺序与文档顺序一致，按分节数量均摊会失真，
  // 但精确做法要跟踪占位位置 —— 这里用标记定位，命中不到就归到第一节
  const marker = `__img_${index}__`
  const pos = _html.indexOf(marker)
  if (pos < 0) return sections[0]?.index ?? 1
  const ratio = pos / Math.max(1, _html.length)
  const idx = Math.min(sections.length - 1, Math.floor(ratio * sections.length))
  return sections[idx]?.index ?? 1
}
