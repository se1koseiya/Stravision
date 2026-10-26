// 将 TECHNICAL_MANUAL.md 转换为学术排版后的 Word 文档
// 用法: node scripts/build-manual-docx.mjs [输入.md] [输出.docx]
// 版式规范（科研/评审级）：
//   A4 / 上下 2.54cm / 左右 2.5cm；正文小四宋体 + 西文 Times New Roman，1.5 倍行距，首行缩进 2 字符；
//   章标题三号黑体居中并另起页，节四号黑体，小节小四黑体；表格为三线表并带表题；图带居中图注；
//   页眉带细线，页脚为「— 页码 —」；封面单独成页，目录为自动域（打开时更新）。
import { readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  TableOfContents, PageNumber, Footer, Header, PageBreak, convertInchesToTwip,
  ImageRun, LineRuleType, VerticalAlign,
} = require("docx")

const src = process.argv[2] || "TECHNICAL_MANUAL.md"
const out = process.argv[3] || "TECHNICAL_MANUAL.docx"
const raw = readFileSync(src, "utf8").replace(/\r\n/g, "\n")
const lines = raw.split("\n")

/* ───────────── 字体与度量 ───────────── */
const FONT_BODY = { ascii: "Times New Roman", eastAsia: "宋体", hAnsi: "Times New Roman" }
const FONT_HEAD = { ascii: "Times New Roman", eastAsia: "黑体", hAnsi: "Times New Roman" }
const FONT_MONO = { ascii: "Consolas", eastAsia: "宋体", hAnsi: "Consolas" }

const SZ = {
  chapter: 32,   // 16pt 三号
  section: 28,   // 14pt 四号
  sub: 24,       // 12pt 小四
  body: 24,      // 12pt 小四
  tableHead: 21, // 10.5pt 五号
  tableBody: 20, // 10pt
  caption: 21,   // 10.5pt
  code: 18,      // 9pt
  meta: 18,      // 9pt
}

const LINE = { single: 240, oneHalf: 360 }
const INK = "000000"
const MUTED = "444444"
const RULE = "000000"
const HAIR = "808080"

const THICK = { style: BorderStyle.SINGLE, size: 12, color: RULE }  // 1.5pt
const THIN = { style: BorderStyle.SINGLE, size: 6, color: RULE }    // 0.75pt
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }

const IMG_W = 580

/* ---------- 行内解析: **粗体** / `代码` ---------- */
function parseInline(text, opts = {}) {
  const base = { font: FONT_BODY, size: SZ.body, ...opts }
  const runs = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      runs.push(new TextRun({ ...base, text: text.slice(last, m.index) }))
    }
    const token = m[0]
    if (token.startsWith("**")) {
      runs.push(new TextRun({ ...base, text: token.slice(2, -2), bold: true }))
    } else {
      runs.push(new TextRun({
        ...base,
        text: token.slice(1, -1),
        font: FONT_MONO,
        size: Math.max(16, (base.size || SZ.body) - 2),
        color: INK,
      }))
    }
    last = m.index + token.length
  }
  if (last < text.length) runs.push(new TextRun({ ...base, text: text.slice(last) }))
  return runs.length ? runs : [new TextRun({ ...base, text: "" })]
}

/* ---------- 三线表 ---------- */
function splitRow(line) {
  let s = line.trim()
  if (s.startsWith("|")) s = s.slice(1)
  if (s.endsWith("|")) s = s.slice(0, -1)
  return s.split("|").map((c) => c.trim())
}

function isSeparatorRow(line) {
  return /^\|?[\s:|-]+\|?$/.test(line) && line.includes("-")
}

function buildTable(rowLines) {
  const header = splitRow(rowLines[0])
  const body = rowLines.slice(1).map(splitRow)
  const cols = header.length

  const weights = new Array(cols).fill(0)
  for (const r of [header, ...body]) {
    for (let i = 0; i < cols; i++) {
      weights[i] = Math.max(weights[i], Math.min((r[i] || "").length, 56))
    }
  }
  const total = weights.reduce((a, b) => a + b, 0) || cols
  let pcts = weights.map((w) => Math.max(9, Math.round((w / total) * 100)))
  const sum = pcts.reduce((a, b) => a + b, 0)
  pcts = pcts.map((p) => Math.round((p / sum) * 100))

  // 行数较多的参考表补一条极淡的行分隔线，避免密集文本串行（仍保持无竖线的三线表骨架）
  const dense = body.length > 12
  const HAIRLINE = { style: BorderStyle.SINGLE, size: 2, color: "D9D9D9" }

  const makeCell = (text, i, isHead, isLast) => new TableCell({
    width: { size: pcts[i], type: WidthType.PERCENTAGE },
    borders: {
      top: isHead ? THICK : NONE,
      left: NONE,
      right: NONE,
      bottom: isHead ? THIN : isLast ? THICK : dense ? HAIRLINE : NONE,
    },
    margins: { top: 70, bottom: 70, left: 90, right: 90 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      spacing: { before: 0, after: 0, line: 260 },
      alignment: isHead ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: parseInline(text, {
        font: isHead ? FONT_HEAD : FONT_BODY,
        size: isHead ? SZ.tableHead : SZ.tableBody,
        bold: isHead,
      }),
    })],
  })

  const rows = [
    new TableRow({
      tableHeader: true,
      children: header.map((h, i) => makeCell(h, i, true, false)),
    }),
    ...body.map((r, ri) => new TableRow({
      children: Array.from({ length: cols }, (_, i) =>
        makeCell(r[i] || "", i, false, ri === body.length - 1)),
    })),
  ]

  return {
    node: new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      borders: {
        top: THICK, bottom: THICK, left: NONE, right: NONE,
        insideHorizontal: dense ? HAIRLINE : NONE, insideVertical: NONE,
      },
      rows,
    }),
    consumed: rowLines.length + 1,
  }
}

/* ---------- 段落工厂 ---------- */
const captionPara = (text, before = 60, after = 240) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before, after, line: LINE.single },
  children: [new TextRun({ text, font: FONT_BODY, size: SZ.caption, bold: true, color: INK })],
})

/* ---------- 主解析 ---------- */
const children = []
let i = 0
let firstH1 = true
let tocInserted = false
let coverDone = false
let bodyStartIdx = null

const CHAPTER_RE = /^(0|[1-9]\d*)\./

const TODAY = new Date()
const DATE_STR = `${TODAY.getFullYear()} 年 ${TODAY.getMonth() + 1} 月`

/* ---------- 封面元信息表（复用正文表，去掉表头行） ---------- */
function coverTable(rows) {
  const cellBorder = { top: NONE, left: NONE, right: NONE, bottom: THIN }
  return new Table({
    alignment: AlignmentType.CENTER,
    width: { size: 78, type: WidthType.PERCENTAGE },
    borders: {
      top: NONE, bottom: NONE, left: NONE, right: NONE,
      insideHorizontal: THIN, insideVertical: NONE,
    },
    rows: rows.map((r) => {
      const k = r[0] || ""
      const v = r.slice(1).join("　") || ""
      return new TableRow({
        children: [
          new TableCell({
            width: { size: 24, type: WidthType.PERCENTAGE },
            borders: cellBorder,
            margins: { top: 90, bottom: 90, left: 0, right: 160 },
            children: [new Paragraph({
              spacing: { before: 0, after: 0, line: LINE.single },
              children: [new TextRun({ text: k, font: FONT_HEAD, size: 21, color: INK })],
            })],
          }),
          new TableCell({
            width: { size: 76, type: WidthType.PERCENTAGE },
            borders: cellBorder,
            margins: { top: 90, bottom: 90, left: 0, right: 0 },
            children: [new Paragraph({
              spacing: { before: 0, after: 0, line: LINE.single },
              children: [new TextRun({ text: v, font: FONT_BODY, size: 21, color: INK })],
            })],
          }),
        ],
      })
    }),
  })
}

while (i < lines.length) {
  const line = lines[i]

  /* 代码块 */
  if (line.startsWith("```")) {
    const buf = []
    i++
    while (i < lines.length && !lines[i].startsWith("```")) { buf.push(lines[i]); i++ }
    i++
    children.push(new Paragraph({
      spacing: { before: 120, after: 180, line: LINE.single },
      shading: { type: ShadingType.CLEAR, fill: "F7F7F7", color: "auto" },
      indent: { left: 240, right: 120 },
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: "BFBFBF" } },
      children: buf.flatMap((l, idx) => {
        const runs = [new TextRun({
          text: l.replace(/\t/g, "    "),
          font: FONT_MONO,
          size: SZ.code,
          color: "1A1A1A",
        })]
        if (idx < buf.length - 1) runs.push(new TextRun({ break: 1 }))
        return runs
      }),
    }))
    continue
  }

  /* 表格 */
  if (line.startsWith("|") && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
    const buf = [line]
    let j = i + 1
    while (j < lines.length && lines[j].startsWith("|")) { buf.push(lines[j]); j++ }
    const tableRows = [buf[0], ...buf.slice(2)]
    if (!tocInserted) {
      // 前置部分：封面元信息表（去掉表头行）
      children.push(coverTable(tableRows.slice(1).map(splitRow)))
      children.push(new Paragraph({ spacing: { after: 0 }, children: [] }))
      i += tableRows.length + 1
      continue
    }
    const { node, consumed } = buildTable(tableRows)
    children.push(node)
    children.push(new Paragraph({ spacing: { after: 160 }, children: [] }))
    i += consumed
    continue
  }

  /* 分隔线 */
  if (/^---+\s*$/.test(line)) { i++; continue }

  /* 独占加粗行：表前小标题 / 无编号小节标签 */
  const boldOnly = /^\*\*([^*]+)\*\*\s*$/.exec(line)
  if (boldOnly) {
    const text = boldOnly[1].trim()
    children.push(new Paragraph({
      spacing: { before: 200, after: 100, line: LINE.single },
      keepNext: true,
      children: [new TextRun({ text, font: FONT_HEAD, size: SZ.sub, bold: true, color: INK })],
    }))
    i++
    continue
  }

  /* 标题 */
  const h = /^(#{1,4})\s+(.*)$/.exec(line)
  if (h) {
    const level = h[1].length
    const text = h[2].trim()

    if (level === 1) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1600, after: 200, line: LINE.single },
        children: [new TextRun({ text, font: FONT_HEAD, size: 44, bold: true, color: INK })],
      }))
      firstH1 = false
    } else if (level === 2) {
      if (text === "技术手册") {
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400, line: LINE.single },
          children: [new TextRun({ text, font: FONT_HEAD, size: 32, color: INK, characterSpacing: 60 })],
        }))
        children.push(new Paragraph({
          spacing: { after: 520, line: LINE.single },
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: RULE } },
          children: [],
        }))
        coverDone = true
      } else {
        if (!tocInserted) {
          children.push(new Paragraph({ spacing: { after: 0 }, children: [new PageBreak()] }))
          children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 320, line: LINE.single },
            children: [new TextRun({ text: "目　　录", font: FONT_HEAD, size: 32, bold: true, color: INK })],
          }))
          children.push(new TableOfContents("目录", { hyperlink: true, headingStyleRange: "1-2" }))
          // 前置部分（封面 + 目录）到此结束，正文另起一节并从 1 开始编页
          bodyStartIdx = children.length
          tocInserted = true
        } else {
          children.push(new Paragraph({ spacing: { after: 0 }, children: [new PageBreak()] }))
        }
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 360, line: LINE.single },
          children: [new TextRun({ text, font: FONT_HEAD, size: SZ.chapter, bold: true, color: INK })],
        }))
      }
    } else if (level === 3) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 160, line: LINE.single },
        keepNext: true,
        children: [new TextRun({ text, font: FONT_HEAD, size: SZ.section, bold: true, color: INK })],
      }))
    } else {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120, line: LINE.single },
        keepNext: true,
        children: [new TextRun({ text, font: FONT_HEAD, size: SZ.sub, bold: true, color: INK })],
      }))
    }
    i++
    continue
  }

  /* 引用 */
  const q = /^>\s?(.*)$/.exec(line)
  if (q) {
    children.push(new Paragraph({
      spacing: { before: 120, after: 120, line: LINE.oneHalf },
      indent: { left: 360, right: 240 },
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: "9A9A9A" } },
      children: parseInline(q[1], { font: FONT_BODY, size: 21, color: MUTED }),
    }))
    i++
    continue
  }

  /* 无序列表 */
  const ul = /^(\s*)[-*]\s+(.*)$/.exec(line)
  if (ul) {
    const depth = Math.floor(ul[1].length / 2)
    children.push(new Paragraph({
      spacing: { before: 40, after: 40, line: LINE.oneHalf },
      indent: { left: 480 + depth * 280, hanging: 240 },
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({ text: "· ", font: FONT_BODY, size: SZ.body, color: INK }),
        ...parseInline(ul[2], { font: FONT_BODY, size: SZ.body }),
      ],
    }))
    i++
    continue
  }

  /* 有序列表 */
  const ol = /^(\s*)(\d+)\.\s+(.*)$/.exec(line)
  if (ol) {
    const depth = Math.floor(ol[1].length / 2)
    children.push(new Paragraph({
      spacing: { before: 40, after: 40, line: LINE.oneHalf },
      indent: { left: 520 + depth * 280, hanging: 280 },
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({ text: `${ol[2]}. `, font: FONT_BODY, size: SZ.body, color: INK }),
        ...parseInline(ol[3], { font: FONT_BODY, size: SZ.body }),
      ],
    }))
    i++
    continue
  }

  /* 空行 */
  if (line.trim() === "") { i++; continue }

  /* 图 */
  const img = /^!\[(.*?)\]\((.*?)\)\s*$/.exec(line)
  if (img) {
    const caption = img[1]
    const file = img[2]
    const data = readFileSync(file)
    const pxW = data.readUInt32BE(16)
    const pxH = data.readUInt32BE(20)
    const targetH = Math.round((IMG_W * pxH) / pxW)
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80, line: LINE.single },
      keepNext: true,
      children: [new ImageRun({ type: "png", data, transformation: { width: IMG_W, height: targetH } })],
    }))
    if (caption) children.push(captionPara(caption))
    i++
    continue
  }

  /* 正文段落 */
  children.push(new Paragraph({
    spacing: { before: 0, after: 0, line: LINE.oneHalf },
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    children: parseInline(line.trim(), { font: FONT_BODY, size: SZ.body }),
  }))
  i++
}

void coverDone

const front = bodyStartIdx === null ? children : children.slice(0, bodyStartIdx)
const body = bodyStartIdx === null ? [] : children.slice(bodyStartIdx)

const PAGE = {
  size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
  margin: {
    top: convertInchesToTwip(1),
    bottom: convertInchesToTwip(1),
    left: convertInchesToTwip(0.984),
    right: convertInchesToTwip(0.984),
  },
}

const runningHeader = new Header({
  children: [new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 60, line: LINE.single },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: HAIR } },
    children: [new TextRun({
      text: "Stravision 莓界 · 智慧农业一体化平台技术手册",
      font: FONT_BODY, size: SZ.meta, color: "595959",
    })],
  })],
})

const pageFooter = new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, line: LINE.single },
    children: [
      new TextRun({ text: "— ", font: FONT_BODY, size: SZ.meta, color: "595959" }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT_BODY, size: SZ.meta, color: "595959" }),
      new TextRun({ text: " —", font: FONT_BODY, size: SZ.meta, color: "595959" }),
    ],
  })],
})

const blankHeader = new Header({ children: [new Paragraph({ children: [] })] })
const blankFooter = new Footer({ children: [new Paragraph({ children: [] })] })

const doc = new Document({
  features: { updateFields: true },
  creator: "Stravision",
  title: "Stravision 莓界 · 智慧农业一体化平台技术手册",
  description: "技术手册（评审版）",
  styles: {
    default: {
      document: {
        run: { font: FONT_BODY, size: SZ.body, color: INK },
        paragraph: { spacing: { line: LINE.oneHalf } },
      },
    },
  },
  sections: [
    {
      properties: { page: { ...PAGE } },
      headers: { default: blankHeader },
      footers: { default: blankFooter },
      children: front,
    },
    {
      properties: { page: { ...PAGE, pageNumbers: { start: 1 } } },
      headers: { default: runningHeader },
      footers: { default: pageFooter },
      children: body,
    },
  ],
})

const buf = await Packer.toBuffer(doc)
writeFileSync(out, buf)
console.log(`已生成 ${out}（${(buf.length / 1024 / 1024).toFixed(2)} MB，${children.length} 个块）`)
