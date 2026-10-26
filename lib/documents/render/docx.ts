/**
 * DOCX 生成
 *
 * 与 `lib/ai/word-document-service.ts#markdownToDocx` 的区别（那个是知识库导出用的最小实现）：
 *
 *   · 那个把 Markdown 表格拆成「A | B | C」的一行段落 —— 在 Word 里打开不是表格，用户没法排序筛选；
 *     这里生成真正的 `w:tbl`（表头灰底、细边框、列宽按内容自适应）。
 *   · 那个没有封面、页边距、页码、语言标记（中文会被 Word 判成英文，标点行距全错）；
 *     这里默认带封面页 + A4 页边距 + 页脚页码 + `w:eastAsia` 字体映射。
 *
 * 生成的是「可以直接发出去的文档」，不是「能用就行」的临时文件 —— 这是本模块的验收标准。
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ISectionOptions,
} from 'docx'
import type { MdBlock } from './markdown'
import { inline, plainText, splitChapters } from './markdown'

/** 视觉主题：正文字体走中英文双映射，避免 Word 把中文回退成宋体 */
const THEME = {
  bodyFont: { ascii: 'Calibri', hAnsi: 'Calibri', eastAsia: '等线' },
  headingFont: { ascii: 'Calibri Light', hAnsi: 'Calibri Light', eastAsia: '微软雅黑' },
  monoFont: { ascii: 'Consolas', hAnsi: 'Consolas', eastAsia: '等线' },
  bodySize: 21, // half-points → 10.5pt（中文 Office 默认正文字号）
  accent: '059669', // 与平台 emerald 主色一致
  headerShading: 'F2F5F4',
  codeShading: 'F6F7F7',
  border: 'D9D9D9',
}

export interface DocxRenderOptions {
  title: string
  subtitle?: string
  author?: string
  /** 是否生成封面页（默认：正文有内容就生成） */
  cover?: boolean
  /** 页脚左侧文字，不传则只显示页码 */
  footerNote?: string
}

export async function renderDocx(blocks: MdBlock[], options: DocxRenderOptions): Promise<Buffer> {
  const children: Array<Paragraph | Table> = []
  const wantCover = options.cover !== false && blocks.length > 0

  if (wantCover) {
    children.push(...coverParagraphs(options))
  }

  for (const block of blocks) {
    const rendered = renderBlock(block)
    for (const node of rendered) children.push(node)
  }

  if (children.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: '（空文档）', italics: true })] }))
  }

  const section: ISectionOptions = {
    properties: {
      page: {
        margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 }, // A4 默认 2cm 边距
      },
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              ...(options.footerNote
                ? [new TextRun({ text: options.footerNote + '   ', size: 18, color: '888888' })]
                : []),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888' }),
              new TextRun({ text: ' / ', size: 18, color: '888888' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '888888' }),
            ],
          }),
        ],
      }),
    },
    children,
  }

  const doc = new Document({
    creator: options.author || 'Stravision AI 助手',
    title: options.title,
    description: options.subtitle,
    // 中文文档必须声明语言，否则 Word 用英文规则处理中文标点与断行
    styles: {
      default: {
        document: {
          run: { font: THEME.bodyFont, size: THEME.bodySize, language: { value: 'zh-CN', eastAsia: 'zh-CN' } },
          paragraph: { spacing: { line: 320, before: 0, after: 120 } },
        },
        heading1: {
          run: { font: THEME.headingFont, size: 32, bold: true, color: '1F2328' },
          paragraph: { spacing: { before: 320, after: 160 } },
        },
        heading2: {
          run: { font: THEME.headingFont, size: 26, bold: true, color: '1F2328' },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        heading3: {
          run: { font: THEME.headingFont, size: 23, bold: true, color: '1F2328' },
          paragraph: { spacing: { before: 200, after: 100 } },
        },
      },
    },
    sections: [section],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}

/** 封面：大标题 + 主色横线 + 副标题 + 生成时间 */
function coverParagraphs(options: DocxRenderOptions): Array<Paragraph> {
  const today = new Date()
  const dateText = `${today.getFullYear()} 年 ${today.getMonth() + 1} 月 ${today.getDate()} 日`
  return [
    new Paragraph({ children: [], spacing: { before: 2400 } }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({ text: options.title || '未命名文档', font: THEME.headingFont, size: 52, bold: true, color: '1F2328' }),
      ],
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [],
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: THEME.accent, space: 1 } },
      spacing: { after: 240 },
    }),
    ...(options.subtitle
      ? [
          new Paragraph({
            children: [new TextRun({ text: options.subtitle, size: 24, color: '5A6460' })],
            spacing: { after: 120 },
          }),
        ]
      : []),
    new Paragraph({
      children: [
        new TextRun({
          text: [options.author, dateText].filter(Boolean).join('   ·   '),
          size: 20,
          color: '8A9490',
        }),
      ],
    }),
    // 封面之后强制分页，正文从第 2 页开始（pageBreakBefore 比插入空段落可靠：
    // 空段落会被 Word 的「删除空行」清理掉，分页随之消失）
    new Paragraph({ children: [], pageBreakBefore: true }),
  ]
}

/** 单个块 → 若干 docx 节点 */
function renderBlock(block: MdBlock): Array<Paragraph | Table> {
  switch (block.type) {
    case 'heading': {
      const level =
        block.level <= 1 ? HeadingLevel.HEADING_1 :
        block.level === 2 ? HeadingLevel.HEADING_2 :
        HeadingLevel.HEADING_3
      return [
        new Paragraph({
          heading: level,
          children: runsToTextRuns(block.runs, { size: block.level <= 1 ? 32 : block.level === 2 ? 26 : 23, bold: true, font: THEME.headingFont }),
        }),
      ]
    }

    case 'paragraph':
      return [
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          children: runsToTextRuns(block.runs),
        }),
      ]

    case 'list':
      return block.items.map(
        (item, i) =>
          new Paragraph({
            // 有序列表刻意不用 `numbering`：那要求 Document 里配好 numbering 定义，
            // 一旦引用名对不上，WPS 打开会显示成「没有编号的普通段落」。
            // 直接把序号写进文本 + 悬挂缩进，任何 Word/WPS/浏览器预览都一致。
            children: [
              ...(block.ordered
                ? [new TextRun({ text: `${i + 1}. `, bold: true, size: THEME.bodySize })]
                : [new TextRun({ text: '•  ', size: THEME.bodySize })]),
              ...runsToTextRuns(item.runs),
            ],
            indent: { left: 420 + item.depth * 360, hanging: 300 },
            spacing: { after: 60 },
          }),
      )

    case 'quote':
      return [
        new Paragraph({
          children: runsToTextRuns(block.runs, { italics: true, color: '5A6460' }),
          indent: { left: 480 },
          border: { left: { style: BorderStyle.SINGLE, size: 18, color: THEME.accent, space: 12 } },
          spacing: { before: 120, after: 120 },
        }),
      ]

    case 'code':
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: block.text || ' ',
              font: THEME.monoFont,
              size: 18,
              color: '24292F',
            }),
          ],
          shading: { type: ShadingType.CLEAR, fill: THEME.codeShading, color: 'auto' },
          spacing: { before: 120, after: 120, line: 260 },
          indent: { left: 240, right: 240 },
        }),
      ]

    case 'hr':
      return [
        new Paragraph({
          children: [],
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: THEME.border, space: 1 } },
          spacing: { before: 120, after: 120 },
        }),
      ]

    case 'table':
      return [buildTable(block.headers, block.rows, block.align)]

    case 'image':
      // 不下载远程图片（生成链路不发起网络请求，避免 SSRF 与超时）；
      // 留一行图注，读者知道原文这里有一张图以及它的地址
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `［图片：${block.alt || block.src}］`, size: 18, color: '8A9490', italics: true })],
          spacing: { before: 120, after: 120 },
        }),
      ]

    default:
      return []
  }
}

/** 真表格：表头灰底加粗，全表细边框，列宽均分 */
function buildTable(headers: string[], rows: string[][], align: Array<'left' | 'center' | 'right'>): Table {
  const colCount = Math.max(headers.length, ...rows.map(r => r.length), 1)
  const cellPara = (text: string, opts: { bold?: boolean; align?: 'left' | 'center' | 'right' }) =>
    new Paragraph({
      alignment:
        opts.align === 'center' ? AlignmentType.CENTER :
        opts.align === 'right' ? AlignmentType.RIGHT :
        AlignmentType.LEFT,
      children: runsToTextRuns(inlineRuns(text), { bold: opts.bold, size: 19 }),
      spacing: { before: 40, after: 40, line: 260 },
    })

  const border = { style: BorderStyle.SINGLE, size: 4, color: THEME.border }
  const borders = { top: border, bottom: border, left: border, right: border }

  const headerRow = new TableRow({
    tableHeader: true,
    children: Array.from({ length: colCount }, (_, i) =>
      new TableCell({
        children: [cellPara(headers[i] ?? '', { bold: true, align: 'left' })],
        shading: { type: ShadingType.CLEAR, fill: THEME.headerShading, color: 'auto' },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
      }),
    ),
  })

  const bodyRows = rows.map(
    row =>
      new TableRow({
        children: Array.from({ length: colCount }, (_, i) =>
          new TableCell({
            children: [cellPara(row[i] ?? '', { align: align[i] ?? 'left' })],
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
          }),
        ),
      }),
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
    rows: [headerRow, ...bodyRows],
  })
}

/** 表格单元格文本 → 行内 runs（复用 markdown 解析器的行内规则，保持与正文一致） */
function inlineRuns(text: string) {
  return inline(text)
}

interface RunStyle {
  size?: number
  bold?: boolean
  italics?: boolean
  color?: string
  font?: { ascii?: string; hAnsi?: string; eastAsia?: string }
}

function runsToTextRuns(
  runs: Array<{ text: string; bold?: boolean; italic?: boolean; code?: boolean; strike?: boolean; link?: string }>,
  style: RunStyle = {},
): TextRun[] {
  return runs.map(r => {
    const base = {
      text: r.text,
      bold: r.bold || style.bold,
      italics: r.italic || style.italics,
      strike: r.strike,
      size: style.size,
      color: style.color,
      font: style.font,
    }
    if (r.code) {
      return new TextRun({ ...base, font: THEME.monoFont, shading: { type: ShadingType.CLEAR, fill: THEME.codeShading, color: 'auto' } })
    }
    if (r.link) {
      return new TextRun({ ...base, color: '0563C1', underline: {} })
    }
    return new TextRun(base)
  })
}

/** 供外部快速取标题（pptx 复用） */
export function firstHeading(blocks: MdBlock[], fallback: string): string {
  for (const b of blocks) {
    if (b.type === 'heading' && b.level === 1) return plainText(b.text)
  }
  return fallback
}

export { splitChapters }
