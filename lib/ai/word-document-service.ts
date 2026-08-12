/**
 * Word 文档（.docx）双向转换服务
 *
 * - docxToMarkdown(buffer):  .docx 二进制 → Markdown 文本（mammoth → HTML → MD）
 * - markdownToDocx(md):      Markdown 文本 → .docx 二进制 Buffer（docx lib）
 *
 * 不依赖额外 HTML→MD 库：内置一个轻量级 HTML→MD 转换器（覆盖 mammoth 输出的常见标签）。
 * 仅依赖 mammoth + docx，已在 package.json 中。
 */

import mammoth from "mammoth"
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType
} from "docx"

// ============== HTML → Markdown（轻量级）==============

/**
 * 把 mammoth 输出的 HTML 转换为 Markdown。
 * 覆盖：h1-h6, p, strong/b, em/i, u, s/del, code, pre, blockquote, ul, ol, li, a, br, hr, table, img
 */
export function htmlToMarkdown(html: string): string {
  // 标准化：去换行、去多余空白
  let s = html.replace(/\r\n/g, "\n").replace(/\t/g, "  ")

  // 块级预处理：把块级标签前后加换行
  const blockTags = [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "div", "pre", "blockquote", "ul", "ol", "li",
    "table", "tr", "hr", "br"
  ]
  for (const tag of blockTags) {
    const re = new RegExp(`<\\/?${tag}[^>]*>`, "gi")
    s = s.replace(re, (m) => `\n${m}\n`)
  }

  // 行内替换（多次扫描保证嵌套）
  const inlinePass = (input: string): string => {
    let out = input
    // 标题
    out = out.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => `\n# ${stripTags(t).trim()}\n`)
    out = out.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `\n## ${stripTags(t).trim()}\n`)
    out = out.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `\n### ${stripTags(t).trim()}\n`)
    out = out.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, t) => `\n#### ${stripTags(t).trim()}\n`)
    out = out.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, t) => `\n##### ${stripTags(t).trim()}\n`)
    out = out.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, t) => `\n###### ${stripTags(t).trim()}\n`)

    // 代码块
    out = out.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, t) => `\n\`\`\`\n${stripTags(t).trim()}\n\`\`\`\n`)

    // 引用块
    out = out.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, t) => {
      const inner = t.split("\n").map((l: string) => l.trim()).filter(Boolean).map((l: string) => `> ${l}`).join("\n")
      return `\n${inner}\n`
    })

    // 无序列表
    out = out.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, t) => `\n${convertListItems(t, false)}\n`)
    // 有序列表
    out = out.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, t) => `\n${convertListItems(t, true)}\n`)

    // 表格（基础转换：转成 MD 表格）
    out = out.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, t) => {
      const rows: string[][] = []
      const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
      let trMatch
      while ((trMatch = trRe.exec(t)) !== null) {
        const cells: string[] = []
        const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
        let tdMatch
        while ((tdMatch = tdRe.exec(trMatch[1])) !== null) {
          cells.push(stripTags(tdMatch[1]).trim())
        }
        if (cells.length) rows.push(cells)
      }
      if (!rows.length) return ""
      const header = rows[0]
      const md = [
        `| ${header.join(" | ")} |`,
        `| ${header.map(() => "---").join(" | ")} |`,
        ...rows.slice(1).map((r) => `| ${r.join(" | ")} |`)
      ].join("\n")
      return `\n${md}\n`
    })

    // 段落
    out = out.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, t) => `\n${t.trim()}\n`)
    // div
    out = out.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, (_, t) => `\n${t.trim()}\n`)

    // 行内标签
    out = out.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    out = out.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    out = out.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    out = out.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
    out = out.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, "$1")
    out = out.replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, "~~$1~~")
    out = out.replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, "~~$1~~")
    out = out.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
    out = out.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    out = out.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, "![$2]($1)")
    out = out.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, "![]($1)")
    out = out.replace(/<br\s*\/?>/gi, "  \n")
    out = out.replace(/<hr\s*\/?>/gi, "\n---\n")

    // 移除其他未识别标签
    out = out.replace(/<\/?[^>]+>/g, "")
    // HTML 实体
    out = out.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    return out
  }

  // 多次扫描确保嵌套标签被处理
  let prev = s
  let cur = inlinePass(s)
  let iter = 0
  while (cur !== prev && iter < 5) {
    prev = cur
    cur = inlinePass(cur)
    iter++
  }

  // 清理多空行
  cur = cur.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim()
  return cur + "\n"
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "")
}

function convertListItems(html: string, ordered: boolean): string {
  const items: string[] = []
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi
  let m
  let idx = 1
  while ((m = re.exec(html)) !== null) {
    const prefix = ordered ? `${idx}. ` : "- "
    items.push(prefix + stripTags(m[1]).trim())
    idx++
  }
  return items.join("\n")
}

// ============== .docx → Markdown ==============

export interface DocxConversionResult {
  markdown: string
  title: string | null
  warnings: string[]
}

/**
 * .docx Buffer → Markdown
 */
export async function docxToMarkdown(buf: Buffer): Promise<DocxConversionResult> {
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  const result = await mammoth.convertToHtml({ arrayBuffer })
  const html = result.value || ""
  const markdown = htmlToMarkdown(html)

  // 尝试从首个标题或首段提取标题
  let title: string | null = null
  const firstLineMatch = markdown.match(/^#\s+(.+)$/m)
  if (firstLineMatch) {
    title = firstLineMatch[1].trim()
  } else {
    const firstNonEmpty = markdown.split("\n").find((l) => l.trim().length > 0)
    if (firstNonEmpty) {
      title = firstNonEmpty.replace(/[#>*_`~]/g, "").trim().slice(0, 100)
    }
  }

  return {
    markdown,
    title,
    warnings: (result.messages || []).map((m: any) => m.message)
  }
}

// ============== Markdown → .docx ==============

/**
 * Markdown 文本 → .docx Buffer
 *
 * 解析 MD 行（标题、列表、代码块、引用、表格、段落、行内强调）
 * 输出 docx Paragraph/TextRun 结构。
 */
export async function markdownToDocx(md: string): Promise<Buffer> {
  const lines = md.replace(/\r\n/g, "\n").split("\n")

  const paragraphs: Paragraph[] = []
  let i = 0

  const pushText = (text: string) => {
    if (!text) {
      paragraphs.push(new Paragraph({ children: [] }))
      return
    }
    paragraphs.push(new Paragraph({ children: parseInline(text) }))
  }

  while (i < lines.length) {
    const line = lines[i]

    // 代码块
    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, "").trim()
      const code: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i])
        i++
      }
      // 跳过结束 ```
      i++
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: code.join("\n"), font: "Consolas" })
          ],
          spacing: { before: 120, after: 120 }
        })
      )
      // 语言注释（不写入正文，仅用于元信息）
      void lang
      continue
    }

    // 标题
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2].trim()
      const headingLevel = (
        level === 1 ? HeadingLevel.HEADING_1 :
        level === 2 ? HeadingLevel.HEADING_2 :
        level === 3 ? HeadingLevel.HEADING_3 :
        level === 4 ? HeadingLevel.HEADING_4 :
        level === 5 ? HeadingLevel.HEADING_5 :
        HeadingLevel.HEADING_6
      )
      paragraphs.push(
        new Paragraph({
          heading: headingLevel,
          children: [new TextRun({ text, bold: true })]
        })
      )
      i++
      continue
    }

    // 引用块
    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""))
        i++
      }
      paragraphs.push(
        new Paragraph({
          children: parseInline(quote.join(" ")),
          indent: { left: 720 },
          spacing: { before: 120, after: 120 }
        })
      )
      continue
    }

    // 无序列表
    if (/^[-*+]\s+/.test(line)) {
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        const text = lines[i].replace(/^[-*+]\s+/, "")
        paragraphs.push(
          new Paragraph({
            children: parseInline(text),
            bullet: { level: 0 }
          })
        )
        i++
      }
      continue
    }

    // 有序列表
    if (/^\d+[.)]\s+/.test(line)) {
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) {
        const text = lines[i].replace(/^\d+[.)]\s+/, "")
        paragraphs.push(
          new Paragraph({
            children: parseInline(text),
            numbering: { reference: "default-numbering", level: 0 }
          })
        )
        i++
      }
      continue
    }

    // 水平分割线
    if (/^---+\s*$/.test(line) || /^\*\*\*+\s*$/.test(line)) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "────────────", color: "999999" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 }
        })
      )
      i++
      continue
    }

    // 表格
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s\-:|]+\|?\s*$/.test(lines[i + 1])) {
      const tableRows: string[][] = []
      // 表头
      tableRows.push(parseTableRow(line))
      i += 2 // 跳过分隔行
      while (i < lines.length && lines[i].includes("|")) {
        tableRows.push(parseTableRow(lines[i]))
        i++
      }
      // docx 表格需要 Table 对象，这里简化为以"列1: 列2 | 列3: ..."形式展示
      for (const row of tableRows) {
        const cells = row.map((c) => new TextRun({ text: c, bold: tableRows.indexOf(row) === 0 }))
        const joined: TextRun[] = []
        cells.forEach((c, idx) => {
          joined.push(c)
          if (idx < cells.length - 1) joined.push(new TextRun({ text: " | " }))
        })
        paragraphs.push(new Paragraph({ children: joined }))
      }
      continue
    }

    // 空行
    if (line.trim() === "") {
      i++
      continue
    }

    // 普通段落
    pushText(line)
    i++
  }

  // 至少有一个段落
  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({ children: [] }))
  }

  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }]
  })

  const buf = await Packer.toBuffer(doc)
  return Buffer.from(buf)
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "")
  return trimmed.split("|").map((c) => c.trim())
}

/**
 * 解析行内 Markdown 强调：**bold**、*italic*、`code`、~~strike~~、[link](url)
 */
function parseInline(text: string): TextRun[] {
  const runs: TextRun[] = []
  // 简易状态机：用正则匹配 token
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|~~([^~]+)~~|\[([^\]]+)\]\(([^)]+)\))/g
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, m.index) }))
    }
    if (m[2] != null) {
      // bold
      runs.push(new TextRun({ text: m[2], bold: true }))
    } else if (m[3] != null) {
      // italic
      runs.push(new TextRun({ text: m[3], italics: true }))
    } else if (m[4] != null) {
      // code
      runs.push(new TextRun({ text: m[4], font: "Consolas" }))
    } else if (m[5] != null) {
      // strikethrough
      runs.push(new TextRun({ text: m[5], strike: true }))
    } else if (m[6] != null && m[7] != null) {
      // link - docx 不直接支持超链接 run（需要 hyperlink 关系），此处用蓝色下划线模拟
      runs.push(new TextRun({ text: m[6], color: "0563C1", underline: {} }))
      runs.push(new TextRun({ text: ` (${m[7]})`, color: "888888", size: 16 }))
    }
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }))
  }
  if (runs.length === 0) {
    runs.push(new TextRun({ text }))
  }
  return runs
}
