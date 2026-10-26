/**
 * Markdown → 规范化块树
 *
 * ## 为什么生成层统一吃 Markdown
 *
 * 模型最擅长写的就是 Markdown（结构清晰、token 便宜、不会漏闭合标签）。
 * 但如果每个 writer 各自去正则解析 Markdown，四份实现必然对
 * 「嵌套列表 / 表格对齐行 / 代码块里的 | 」这些边界给出不同答案。
 *
 * 所以这里解析一次，得到与格式无关的块树，writer 只负责「把块画成自己格式的样子」。
 *
 * 支持的子集（刻意收敛，超出部分降级为段落而不是丢失）：
 *   标题 #~######、段落、无序/有序列表（含一层嵌套）、GFM 表格、
 *   围栏代码块、引用块、分隔线、独立成行的图片、行内 **粗** *斜* `代码`
 */

export type InlineRun = {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  strike?: boolean
  link?: string
}

export type MdBlock =
  | { type: 'heading'; level: number; text: string; runs: InlineRun[] }
  | { type: 'paragraph'; text: string; runs: InlineRun[] }
  | { type: 'list'; ordered: boolean; items: Array<{ text: string; runs: InlineRun[]; depth: number }> }
  | { type: 'table'; headers: string[]; rows: string[][]; align: Array<'left' | 'center' | 'right'> }
  | { type: 'code'; lang: string; text: string }
  | { type: 'quote'; text: string; runs: InlineRun[] }
  | { type: 'hr' }
  | { type: 'image'; alt: string; src: string }

/** 解析整篇 Markdown 为块树 */
export function parseMarkdown(md: string): MdBlock[] {
  const lines = (md || '').replace(/\r\n/g, '\n').split('\n')
  const blocks: MdBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // ── 空行 ──
    if (!line.trim()) {
      i++
      continue
    }

    // ── 围栏代码块 ──
    const fence = /^```([\w+#.-]*)\s*$/.exec(line.trim())
    if (fence) {
      const lang = fence[1] || ''
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) {
        buf.push(lines[i])
        i++
      }
      i++ // 跳过结束围栏
      blocks.push({ type: 'code', lang, text: buf.join('\n') })
      continue
    }

    // ── 标题 ──
    const heading = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line)
    if (heading) {
      const text = heading[2].trim()
      blocks.push({ type: 'heading', level: heading[1].length, text, runs: inline(text) })
      i++
      continue
    }

    // ── 分隔线 ──
    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // ── 表格（当前行含 |，且下一行是分隔行）──
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      const headers = splitRow(line)
      const align = splitRow(lines[i + 1]).map(spec => {
        const left = spec.startsWith(':')
        const right = spec.endsWith(':')
        if (left && right) return 'center' as const
        if (right) return 'right' as const
        return 'left' as const
      })
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        const cells = splitRow(lines[i])
        // 列数对齐到表头，避免 writer 里每处都要补空
        while (cells.length < headers.length) cells.push('')
        rows.push(cells.slice(0, headers.length))
        i++
      }
      blocks.push({ type: 'table', headers, rows, align })
      continue
    }

    // ── 引用块 ──
    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      const text = buf.join(' ').trim()
      blocks.push({ type: 'quote', text, runs: inline(text) })
      continue
    }

    // ── 列表（- * + 或 1. 2) ）──
    if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line)
      const items: Array<{ text: string; runs: InlineRun[]; depth: number }> = []
      while (i < lines.length && /^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[i])) {
        const raw = lines[i]
        const indent = (raw.match(/^\s*/) || [''])[0].length
        const text = raw.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '').trim()
        items.push({ text, runs: inline(text), depth: indent >= 2 ? 1 : 0 })
        i++
        // 列表项的软换行（紧随的缩进续行）并入本项
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[i])) {
          items[items.length - 1].text += ' ' + lines[i].trim()
          i++
        }
      }
      blocks.push({ type: 'list', ordered, items })
      continue
    }

    // ── 独立图片行 ──
    const img = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(line.trim())
    if (img) {
      blocks.push({ type: 'image', alt: img[1], src: img[2] })
      i++
      continue
    }

    // ── 段落（连续非空行合并）──
    const buf: string[] = [line.trim()]
    i++
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|```|>\s?|\s*(?:[-*+]|\d+[.)])\s+)/.test(lines[i]) &&
      !(lines[i].includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1]))
    ) {
      buf.push(lines[i].trim())
      i++
    }
    const text = buf.join(' ')
    blocks.push({ type: 'paragraph', text, runs: inline(text) })
  }

  return blocks
}

/** 拆表格行（去掉首尾管道，保留单元格内的转义管道） */
function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let cur = ''
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]
    if (ch === '\\' && trimmed[i + 1] === '|') {
      cur += '|'
      i++
    } else if (ch === '|') {
      cells.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur.trim())
  return cells
}

/**
 * 行内标记 → runs。
 *
 * 用单次扫描而不是多轮 replace：多轮会把 `**a*b*c**` 这类嵌套解错，
 * 而且 `__` 与 `**` 交替替换时容易吃掉对方的定界符。
 */
export function inline(text: string): InlineRun[] {
  const runs: InlineRun[] = []
  const re = /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3|`([^`]+)`|~~(.+?)~~|\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index) })
    if (m[2] != null) runs.push({ text: m[2], bold: true })
    else if (m[4] != null) runs.push({ text: m[4], italic: true })
    else if (m[5] != null) runs.push({ text: m[5], code: true })
    else if (m[6] != null) runs.push({ text: m[6], strike: true })
    else if (m[7] != null && m[8] != null) runs.push({ text: m[7], link: m[8] })
    last = m.index + m[0].length
  }
  if (last < text.length) runs.push({ text: text.slice(last) })
  return runs.length ? runs : [{ text }]
}

/** 去掉行内标记，用于需要纯文本的目标（PPT 标题、PDF 度量） */
export function plainText(text: string): string {
  return inline(text)
    .map(r => r.text)
    .join('')
}

/**
 * 把块树按「一级标题」切成幻灯片 / 章节。
 *
 * pptx 与 docx 的章节拆分共用这一份逻辑，避免两边对「第一张要不要封面」判断不一致。
 */
export interface Chapter {
  title: string
  subtitle?: string
  blocks: MdBlock[]
}

export function splitChapters(blocks: MdBlock[], fallbackTitle: string): Chapter[] {
  const chapters: Chapter[] = []
  let cur: Chapter | null = null

  for (const b of blocks) {
    if (b.type === 'heading' && b.level === 1) {
      if (cur) chapters.push(cur)
      cur = { title: b.text, blocks: [] }
    } else if (!cur) {
      cur = { title: fallbackTitle, blocks: [] }
      cur.blocks.push(b)
    } else {
      cur.blocks.push(b)
    }
  }
  if (cur) chapters.push(cur)

  // 首个章节只有标题没有内容 → 视为封面
  if (chapters.length > 1 && chapters[0].blocks.length === 0) {
    chapters.shift()
  }
  return chapters.length ? chapters : [{ title: fallbackTitle, blocks }]
}
