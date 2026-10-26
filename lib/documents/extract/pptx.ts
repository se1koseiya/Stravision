/**
 * PPTX 读取
 *
 * ## 为什么不用现成的解析库
 *
 * npm 上的 pptx 解析库大多把整份文件转成一坨扁平文本，丢掉「第几张幻灯片」这个
 * 最关键的定位信息 —— 而模型修改 PPT 时，第一句话必然是"改第 5 张的标题"。
 *
 * 这里直接读 OOXML：
 *   · 播放顺序以 `ppt/presentation.xml` 的 `sldIdLst` 为准（不能按文件名排序，重排过的 PPT 会错）
 *   · 每张幻灯片 = 一个分节，标题从 `<p:ph type="title">` 占位符取，取不到用首行
 *   · 演讲者备注单独收（很多汇报的关键信息只在备注里）
 *   · 图片按 slide 的 rels 归属到具体页面，供「这张图的图表趋势是什么」这类问题使用
 */

import JSZip from 'jszip'
import path from 'node:path'
import type { DocumentDigest, DigestImage, DigestSection, DigestTable, OutlineNode } from '../types'
import { CharBudget, DEFAULT_MAX_CHARS, MAX_VISION_IMAGE_BYTES, wantedSections, type ExtractOptions } from './common'

export async function extractPptx(buf: Buffer, opts: ExtractOptions): Promise<DocumentDigest> {
  const zip = await JSZip.loadAsync(buf)
  const budget = new CharBudget(opts.maxChars ?? DEFAULT_MAX_CHARS)
  const only = wantedSections(opts.sections)
  const notes: string[] = []

  const order = await resolveSlideOrder(zip)
  const sections: DigestSection[] = []
  const tables: DigestTable[] = []
  const images: DigestImage[] = []
  const outline: OutlineNode[] = []

  for (let i = 0; i < order.length; i++) {
    const slideNo = i + 1
    if (only && !only.has(slideNo)) continue

    const slidePath = order[i]
    const xml = await readText(zip, slidePath)
    if (!xml) {
      sections.push({ index: slideNo, kind: 'slide', label: `第 ${slideNo} 张幻灯片`, text: '（无法读取）', charCount: 7 })
      continue
    }

    const parsed = parseSlideXml(xml)
    const noteText = await readSlideNotes(zip, slidePath)

    const lines: string[] = []
    if (parsed.title) lines.push(`标题：${parsed.title}`)
    if (parsed.lines.length) lines.push(parsed.lines.join('\n'))
    if (!parsed.lines.length && parsed.title) lines.push('（无正文，仅标题）')
    if (!parsed.lines.length && !parsed.title) lines.push('（本页无文字，可能是纯图片页）')
    if (noteText) lines.push(`备注：${noteText}`)

    // 表格单独成结构化条目（与 docx / xlsx 同一套 IR）。
    // 不能让表格只以「A ｜ B ｜ C」的形式混在正文里 —— 那样模型拿到的是几行
    // 用竖线隔开的文本，列对齐关系全丢，回写时必然错列。
    const tableIndexes: number[] = []
    for (const t of parsed.tables) {
      if (!t.rows.length && !t.headers.some(Boolean)) continue
      tableIndexes.push(tables.length)
      tables.push({
        sectionIndex: slideNo,
        label: `第 ${slideNo} 张幻灯片表格${parsed.tables.length > 1 ? `（${tableIndexes.length}/${parsed.tables.length}）` : ''}`,
        headers: t.headers,
        rows: t.rows,
        truncatedRows: 0,
      })
    }

    const text = budget.take(lines.join('\n'))
    const title = parsed.title || parsed.lines[0] || `第 ${slideNo} 张幻灯片`

    const slideImages = await collectSlideImages(zip, slidePath, slideNo, opts)
    images.push(...slideImages)

    sections.push({
      index: slideNo,
      kind: 'slide',
      label: `第 ${slideNo} 张幻灯片${parsed.title ? '：' + parsed.title : ''}`,
      text,
      charCount: text.length,
      ...(tableIndexes.length ? { tableIndexes } : {}),
    })
    outline.push({ level: 1, title: `${slideNo}. ${title}`, sectionIndex: slideNo })

    if (budget.remaining() <= 0 && i < order.length - 1) {
      notes.push(`已达读取预算（${budget.max} 字），第 ${slideNo + 1} 张起未读取。可用 sections 续读。`)
      break
    }
  }

  const totalSlides = order.length
  return {
    fileId: opts.fileId,
    fileName: opts.fileName,
    format: 'pptx',
    sizeBytes: buf.length,
    title: (await readCoreTitle(zip)) || opts.fileName.replace(/\.pptx$/i, ''),
    outline,
    sections,
    tables,
    images,
    stats: {
      slides: totalSlides,
      chars: sections.reduce((n, s) => n + s.charCount, 0),
      tables: tables.length,
      images: images.length,
      paragraphs: sections.length,
    },
    truncated: budget.truncated,
    notes,
  }
}

/** 播放顺序：presentation.xml 的 sldIdLst → rels 映射到具体 slide 文件 */
async function resolveSlideOrder(zip: JSZip): Promise<string[]> {
  const presXml = await readText(zip, 'ppt/presentation.xml')
  const relsXml = await readText(zip, 'ppt/_rels/presentation.xml.rels')

  if (presXml && relsXml) {
    const ridToTarget = new Map<string, string>()
    for (const m of relsXml.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/g)) {
      ridToTarget.set(m[1], m[2])
    }
    const ordered: string[] = []
    for (const m of presXml.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)) {
      const target = ridToTarget.get(m[1])
      if (!target) continue
      // Target 形如 slides/slide3.xml，相对 ppt/
      ordered.push(target.startsWith('/') ? target.slice(1) : path.posix.join('ppt', target))
    }
    if (ordered.length) return ordered
  }

  // 兜底：按文件名数字排序
  return Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/)?.[1] || 0)
      const nb = Number(b.match(/slide(\d+)/)?.[1] || 0)
      return na - nb
    })
}

/** 解析一张幻灯片的 XML 取标题、正文行与表格 */
function parseSlideXml(xml: string): {
  title: string | null
  lines: string[]
  tables: Array<{ headers: string[]; rows: string[][] }>
} {
  // 先按形状（<p:sp>）切，才能知道哪段文字在标题占位符里
  const shapes = xml.split(/<p:sp>/).slice(1)
  let title: string | null = null
  const lines: string[] = []

  for (const shape of shapes) {
    const isTitle = /<p:ph\b[^>]*\btype="(?:title|ctrTitle)"/i.test(shape)
    const paragraphs = shape.match(/<a:p>[\s\S]*?<\/a:p>/g) || []
    for (const p of paragraphs) {
      const text = extractRuns(p)
      if (!text) continue
      if (isTitle && !title) title = text
      else lines.push(text)
    }
  }

  // 表格（<p:graphicFrame><a:tbl>）不在 <p:sp> 里，单独解析
  const tables = parseTables(xml)

  return { title, lines: dedupe(lines), tables }
}

/** 取本页所有表格：首行当表头（PowerPoint 的表格习惯，也是我们生成器的写法） */
function parseTables(xml: string): Array<{ headers: string[]; rows: string[][] }> {
  const out: Array<{ headers: string[]; rows: string[][] }> = []
  for (const m of xml.matchAll(/<a:tbl>[\s\S]*?<\/a:tbl>/g)) {
    const grid: string[][] = []
    for (const row of m[0].matchAll(/<a:tr\b[\s\S]*?<\/a:tr>/g)) {
      const cells = [...row[0].matchAll(/<a:tc\b[\s\S]*?<\/a:tc>/g)].map(c =>
        [...c[0].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
          .map(t => decodeXml(t[1]))
          .join('')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      if (cells.some(Boolean)) grid.push(cells)
    }
    if (!grid.length) continue
    const width = Math.max(...grid.map(r => r.length))
    const norm = grid.map(r => (r.length < width ? [...r, ...Array(width - r.length).fill('')] : r))
    out.push({ headers: norm[0], rows: norm.slice(1) })
  }
  return out
}

/** 一段 <a:p> 里的所有 <a:t> 拼成一行（含软换行 <a:br/>） */
function extractRuns(paragraphXml: string): string {
  const parts: string[] = []
  const re = /<a:t>([\s\S]*?)<\/a:t>|<a:br\s*\/>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(paragraphXml)) !== null) {
    if (m[1] == null) parts.push(' ')
    else parts.push(decodeXml(m[1]))
  }
  return parts.join('').replace(/\s+/g, ' ').trim()
}

function dedupe(lines: string[]): string[] {
  const out: string[] = []
  for (const l of lines) if (l && out[out.length - 1] !== l) out.push(l)
  return out
}

/** 演讲者备注 */
async function readSlideNotes(zip: JSZip, slidePath: string): Promise<string> {
  const relPath = path.posix.join(path.posix.dirname(slidePath), '_rels', path.posix.basename(slidePath) + '.rels')
  const rels = await readText(zip, relPath)
  if (!rels) return ''
  const m = rels.match(/Target="([^"]*notesSlide\d+\.xml)"/)
  if (!m) return ''
  const notesPath = m[1].startsWith('/') ? m[1].slice(1) : path.posix.join('ppt', m[1].replace(/^\.\.\//, ''))
  const xml = await readText(zip, notesPath)
  if (!xml) return ''
  const texts = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(t => decodeXml(t[1]).trim()).filter(Boolean)
  return texts.join(' ').slice(0, 800)
}

/** 该页引用的图片（按 rels 归属，比"全包 media 平摊"准确得多） */
async function collectSlideImages(
  zip: JSZip,
  slidePath: string,
  slideNo: number,
  opts: ExtractOptions,
): Promise<DigestImage[]> {
  const out: DigestImage[] = []
  const relPath = path.posix.join(path.posix.dirname(slidePath), '_rels', path.posix.basename(slidePath) + '.rels')
  const rels = await readText(zip, relPath)
  if (!rels) return out

  for (const m of rels.matchAll(/Target="([^"]*media\/[^"]+\.(?:png|jpe?g|gif|bmp|webp))"/gi)) {
    const target = m[1]
    const mediaPath = target.startsWith('/') ? target.slice(1) : path.posix.join('ppt', target.replace(/^\.\.\//, ''))
    const file = zip.file(mediaPath)
    if (!file) continue
    const bytes = Buffer.from(await file.async('nodebuffer'))
    if (bytes.length < 8 * 1024) continue // 图标/logo

    const entry: DigestImage = {
      sectionIndex: slideNo,
      label: `第 ${slideNo} 张 · 图 ${out.length + 1}`,
      bytes: bytes.length,
    }
    if (opts.includeImages && opts.describeImage && bytes.length <= MAX_VISION_IMAGE_BYTES) {
      const ext = (mediaPath.split('.').pop() || 'png').toLowerCase()
      const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
      const dataUrl = `data:${mime};base64,${bytes.toString('base64')}`
      entry.dataUrl = dataUrl
      try {
        entry.transcript =
          (await opts.describeImage(dataUrl, `${opts.fileName} 第 ${slideNo} 张幻灯片中的图片`)) ?? undefined
      } catch {
        // 忽略单张失败
      }
    }
    out.push(entry)
  }
  return out
}

/** 从 docProps/core.xml 取标题 */
async function readCoreTitle(zip: JSZip): Promise<string> {
  const xml = await readText(zip, 'docProps/core.xml')
  if (!xml) return ''
  const m = xml.match(/<dc:title>([\s\S]*?)<\/dc:title>/)
  return m ? decodeXml(m[1]).trim().slice(0, 120) : ''
}

async function readText(zip: JSZip, p: string): Promise<string | null> {
  const f = zip.file(p)
  if (!f) return null
  try {
    return await f.async('string')
  } catch {
    return null
  }
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&')
}
