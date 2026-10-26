/**
 * PDF 生成
 *
 * ## 中文 PDF 的唯一难点是字体
 *
 * PDF 的 14 个标准字体全是西文，直接写中文得到的是空白或方块。必须嵌入 TrueType。
 * 但项目自带的中文字体有 20MB —— 每次生成都把 20MB 塞进 PDF 是不可接受的。
 *
 * 解法：`@pdf-lib/fontkit` + `{ subset: true }`，只嵌入**实际用到的字形**。
 * 一份 20 页中文报告通常只用到 800~1500 个不同字符，输出 PDF 约 200~600KB。
 *
 * 字体字节在模块级缓存：母进程只读一次盘 + 解析一次，后续生成直接复用。
 *
 * ## 排版
 *
 * pdf-lib 只提供「在某个坐标画一行字」，分页/换行/表格全靠自己算。
 * 这里实现的是够用的排版引擎：A4、1.6 倍行距、中文逐字断行 + 英文按词断行、
 * 表格自动分页、页脚页码。
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { MdBlock } from './markdown'
import { plainText } from './markdown'

const A4 = { width: 595.28, height: 841.89 }
const MARGIN = { top: 56, bottom: 56, left: 56, right: 56 }
const CONTENT_W = A4.width - MARGIN.left - MARGIN.right

const SIZE = { h1: 20, h2: 15.5, h3: 13, body: 10.5, small: 9, table: 9 }
const LINE = 1.62

const INK = rgb(0.12, 0.14, 0.16)
const MUTE = rgb(0.42, 0.46, 0.44)
const ACCENT = rgb(0.02, 0.59, 0.41)
const HAIRLINE = rgb(0.89, 0.91, 0.9)
const CODE_BG = rgb(0.965, 0.97, 0.97)

const FONT_PATH = path.join(process.cwd(), 'public', 'font', 'HarmonyOS_Sans_SC.ttf')

/** 字体字节缓存（跨请求复用；20MB 只读一次） */
let fontBytesCache: Buffer | null = null

async function loadFontBytes(): Promise<Buffer> {
  if (fontBytesCache) return fontBytesCache
  fontBytesCache = await fs.readFile(FONT_PATH)
  return fontBytesCache
}

export interface PdfRenderOptions {
  title: string
  subtitle?: string
  author?: string
  /** 是否生成封面页 */
  cover?: boolean
}

/** 排版游标 */
interface Cursor {
  page: PDFPage
  y: number
}

export async function renderPdf(blocks: MdBlock[], options: PdfRenderOptions): Promise<Buffer> {
  const fontBytes = await loadFontBytes()
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)

  const font = await pdf.embedFont(fontBytes, { subset: true })

  pdf.setTitle(options.title || '未命名文档')
  pdf.setAuthor(options.author || 'Stravision AI 助手')
  pdf.setCreator('Stravision AI 助手')
  pdf.setProducer('Stravision')

  const pages: PDFPage[] = []
  const newPage = (): Cursor => {
    const page = pdf.addPage([A4.width, A4.height])
    pages.push(page)
    return { page, y: A4.height - MARGIN.top }
  }

  let cur = newPage()

  if (options.cover !== false && (options.title || options.subtitle)) {
    drawCover(cur.page, font, options)
    cur = newPage()
  }

  for (const block of blocks) {
    cur = renderBlock(block, cur, font, newPage)
  }

  // 页脚页码（全部画完之后统一加，避免中途新增页漏编号）
  const total = pages.length
  pages.forEach((page, i) => {
    const label = `${i + 1} / ${total}`
    const w = font.widthOfTextAtSize(label, SIZE.small)
    page.drawText(label, {
      x: A4.width - MARGIN.right - w,
      y: MARGIN.bottom / 2,
      size: SIZE.small,
      font,
      color: MUTE,
    })
    if (options.title) {
      page.drawText(truncate(options.title, font, SIZE.small, CONTENT_W * 0.6), {
        x: MARGIN.left,
        y: MARGIN.bottom / 2,
        size: SIZE.small,
        font,
        color: MUTE,
      })
    }
  })

  const out = await pdf.save()
  return Buffer.from(out)
}

/** 封面：大标题 + 主色短线 + 副标题 + 日期 */
function drawCover(page: PDFPage, font: PDFFont, options: PdfRenderOptions): void {
  const titleSize = 30
  const lines = wrapText(options.title || '未命名文档', font, titleSize, CONTENT_W)
  let y = A4.height * 0.62
  for (const line of lines.slice(0, 3)) {
    page.drawText(line, { x: MARGIN.left, y, size: titleSize, font, color: INK })
    y -= titleSize * 1.35
  }
  page.drawRectangle({ x: MARGIN.left, y: y + 6, width: 64, height: 2.5, color: ACCENT })

  if (options.subtitle) {
    y -= 18
    for (const line of wrapText(options.subtitle, font, 12, CONTENT_W).slice(0, 3)) {
      page.drawText(line, { x: MARGIN.left, y, size: 12, font, color: MUTE })
      y -= 20
    }
  }

  const today = new Date()
  const dateText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  page.drawText([options.author, dateText].filter(Boolean).join('    '), {
    x: MARGIN.left,
    y: MARGIN.bottom + 40,
    size: SIZE.small,
    font,
    color: MUTE,
  })
}

/** 渲染一个块，返回新的游标（可能已经翻页） */
function renderBlock(
  block: MdBlock,
  cur: Cursor,
  font: PDFFont,
  newPage: () => Cursor,
): Cursor {
  const ensure = (need: number): Cursor => {
    if (cur.y - need >= MARGIN.bottom) return cur
    return newPage()
  }

  switch (block.type) {
    case 'heading': {
      const size = block.level === 1 ? SIZE.h1 : block.level === 2 ? SIZE.h2 : SIZE.h3
      const gapBefore = block.level === 1 ? 16 : 12
      cur = ensure(size * LINE + gapBefore)
      cur.y -= gapBefore
      for (const line of wrapText(plainText(block.text), font, size, CONTENT_W)) {
        cur = ensure(size * LINE)
        cur.page.drawText(line, { x: MARGIN.left, y: cur.y - size, size, font, color: block.level === 1 ? INK : INK })
        cur.y -= size * LINE
      }
      cur.y -= block.level === 1 ? 6 : 4
      if (block.level === 1) {
        cur.page.drawRectangle({ x: MARGIN.left, y: cur.y + 2, width: 42, height: 1.6, color: ACCENT })
        cur.y -= 8
      }
      return cur
    }

    case 'paragraph': {
      for (const line of wrapText(plainText(block.text), font, SIZE.body, CONTENT_W)) {
        cur = ensure(SIZE.body * LINE)
        cur.page.drawText(line, { x: MARGIN.left, y: cur.y - SIZE.body, size: SIZE.body, font, color: INK })
        cur.y -= SIZE.body * LINE
      }
      cur.y -= 4
      return cur
    }

    case 'list': {
      let index = 0
      for (const item of block.items) {
        index++
        const prefix = block.ordered ? `${index}. ` : '• '
        const indent = 12 + item.depth * 14
        const lines = wrapText(plainText(item.text), font, SIZE.body, CONTENT_W - indent)
        lines.forEach((line, li) => {
          cur = ensure(SIZE.body * LINE)
          if (li === 0) {
            cur.page.drawText(prefix, { x: MARGIN.left + item.depth * 14, y: cur.y - SIZE.body, size: SIZE.body, font, color: MUTE })
          }
          cur.page.drawText(line, { x: MARGIN.left + indent, y: cur.y - SIZE.body, size: SIZE.body, font, color: INK })
          cur.y -= SIZE.body * LINE
        })
        cur.y -= 1
      }
      cur.y -= 4
      return cur
    }

    case 'quote': {
      const lines = wrapText(plainText(block.text), font, SIZE.body, CONTENT_W - 16)
      const height = lines.length * SIZE.body * LINE + 8
      cur = ensure(height)
      const top = cur.y
      for (const line of lines) {
        cur.page.drawText(line, { x: MARGIN.left + 12, y: cur.y - SIZE.body, size: SIZE.body, font, color: MUTE })
        cur.y -= SIZE.body * LINE
      }
      cur.page.drawRectangle({ x: MARGIN.left + 4, y: cur.y + 2, width: 1.6, height: top - cur.y - 6, color: ACCENT })
      cur.y -= 8
      return cur
    }

    case 'code': {
      const size = 8.8
      const lines = block.text.split('\n').flatMap(l => wrapText(l || ' ', font, size, CONTENT_W - 16))
      for (const line of lines) {
        cur = ensure(size * LINE + 6)
        cur.page.drawRectangle({
          x: MARGIN.left,
          y: cur.y - size * LINE,
          width: CONTENT_W,
          height: size * LINE,
          color: CODE_BG,
        })
        cur.page.drawText(line, { x: MARGIN.left + 8, y: cur.y - size * 1.25, size, font, color: INK })
        cur.y -= size * LINE
      }
      cur.y -= 6
      return cur
    }

    case 'hr': {
      cur = ensure(16)
      cur.page.drawRectangle({ x: MARGIN.left, y: cur.y - 6, width: CONTENT_W, height: 0.8, color: HAIRLINE })
      cur.y -= 16
      return cur
    }

    case 'table':
      return renderTable(block.headers, block.rows, cur, font, newPage)

    case 'image': {
      cur = ensure(20)
      const label = `［图片：${block.alt || block.src}］`
      cur.page.drawText(truncate(label, font, SIZE.small, CONTENT_W), {
        x: MARGIN.left,
        y: cur.y - SIZE.small,
        size: SIZE.small,
        font,
        color: MUTE,
      })
      cur.y -= 16
      return cur
    }

    default:
      return cur
  }
}

/** 表格：列宽均分、单元格文本自动折行、跨页续画表头 */
function renderTable(
  headers: string[],
  rows: string[][],
  cur: Cursor,
  font: PDFFont,
  newPage: () => Cursor,
): Cursor {
  const colCount = Math.max(headers.length, 1)
  const colW = CONTENT_W / colCount
  const padX = 5
  const padY = 4
  const size = SIZE.table

  const drawRow = (cells: string[], isHeader: boolean): number => {
    const wrapped = cells.map(c => wrapText(c ?? '', font, size, colW - padX * 2))
    const lineCount = Math.max(1, ...wrapped.map(w => w.length))
    const rowH = lineCount * size * 1.42 + padY * 2
    return rowH
  }

  const drawHeader = (): void => {
    const h = drawRow(headers, true)
    cur.page.drawRectangle({ x: MARGIN.left, y: cur.y - h, width: CONTENT_W, height: h, color: rgb(0.95, 0.96, 0.958) })
    headers.forEach((cell, i) => {
      const lines = wrapText(cell ?? '', font, size, colW - padX * 2)
      lines.forEach((line, li) => {
        cur.page.drawText(line, {
          x: MARGIN.left + i * colW + padX,
          y: cur.y - padY - size - li * size * 1.42,
          size,
          font,
          color: INK,
        })
      })
    })
    // 表头下边框
    cur.page.drawRectangle({ x: MARGIN.left, y: cur.y - h, width: CONTENT_W, height: 0.7, color: HAIRLINE })
    cur.y -= h
  }

  cur = cur.y - 10 - drawRow(headers, true) >= MARGIN.bottom ? cur : newPage()
  drawHeader()

  for (const row of rows) {
    const rowH = drawRow(row, false)
    if (cur.y - rowH < MARGIN.bottom) {
      cur = newPage()
      drawHeader()
    }
    row.forEach((cell, i) => {
      const lines = wrapText(cell ?? '', font, size, colW - padX * 2)
      lines.forEach((line, li) => {
        cur.page.drawText(line, {
          x: MARGIN.left + i * colW + padX,
          y: cur.y - padY - size - li * size * 1.42,
          size,
          font,
          color: INK,
        })
      })
    })
    cur.page.drawRectangle({ x: MARGIN.left, y: cur.y - rowH, width: CONTENT_W, height: 0.5, color: HAIRLINE })
    cur.y -= rowH
  }

  // 竖向分隔线
  for (let i = 1; i < colCount; i++) {
    cur.page.drawRectangle({
      x: MARGIN.left + i * colW,
      y: cur.y,
      width: 0.4,
      height: Math.min(600, A4.height - MARGIN.top - cur.y),
      color: HAIRLINE,
    })
  }

  cur.y -= 12
  return cur
}

/**
 * 断行：中文按字符断、英文/数字按词断。
 *
 * 为什么不能简单按字符切：英文单词从中间断开（"temperat / ure"）会显著影响可读性，
 * 而中文不存在词边界，逐字断才是对的。
 */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = []
  const paragraphs = String(text ?? '').replace(/\r\n/g, '\n').split('\n')

  for (const para of paragraphs) {
    if (!para) {
      out.push('')
      continue
    }
    let line = ''
    let i = 0
    while (i < para.length) {
      // 取下一个「原子」：连续的非中日韩字符算一个词，中日韩字符各算一个
      const ch = para[i]
      let atom = ch
      if (/[A-Za-z0-9_\-./%@#$&+=~'"()[\]{}<>:;!?]/.test(ch)) {
        let j = i
        while (j < para.length && /[A-Za-z0-9_\-./%@#$&+=~'"()[\]{}<>:;!?]/.test(para[j])) {
          atom = para.slice(i, j + 1)
          j++
        }
        i = j
      } else {
        i++
      }

      const candidate = line + atom
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        out.push(line)
        line = atom.trimStart()
      } else {
        line = candidate
      }
    }
    out.push(line)
  }
  return out
}

/** 截断到指定宽度（表格/页脚用） */
function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let s = text
  while (s.length > 1 && font.widthOfTextAtSize(s + '…', size) > maxWidth) s = s.slice(0, -1)
  return s + '…'
}
