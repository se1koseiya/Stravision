/**
 * 结构感知分块器
 *
 * 基于 mdast（unified 生态，项目已通过 react-markdown 引入）做 AST 级切分，
 * 替代原先按 /\n{2,}/ 的正则切段。原实现的三个硬伤在这里被修掉：
 *
 * 1. 无结构感知 —— Markdown 表格、代码块会被拦腰截断，语义破碎。
 *    现在 code / table / html 作为原子单元，永不拆分。
 * 2. 无标题上下文 —— 切出来的 chunk 不知道自己属于哪一节，
 *    导致「草莓白粉病用什么药」这种查询召回不到只有「白粉病」正文的块。
 *    现在每个 chunk 携带 headingPath 面包屑，并拼进用于 embedding 的正文。
 * 3. token 计数低估 —— 旧公式按「中文 1.5 字符/token」算，等于 1 汉字 ≈ 0.67 token，
 *    而 cl100k 下汉字实际约 1-1.5 token，低估两倍以上，chunk 会超出
 *    GLM embedding-2 的 512 token 上限。现在默认走 js-tiktoken 精确计数，
 *    不可用时回退到保守（宁高勿低）估算。
 *
 * 设计取舍：不做字符级 overlap。AST 分块 + 标题面包屑已经提供了足够的上下文连续性，
 * 字符重叠只会造成重复 embedding 与检索噪声。需要上下文时应在检索阶段做相邻块扩展。
 * 仅当单个原子块（如超长代码块）被迫按行拆分时才保留 overlapTokens。
 */

import { createHash } from "node:crypto"
import { fromMarkdown } from "mdast-util-from-markdown"
import { gfmFromMarkdown } from "mdast-util-gfm"
import { gfm } from "micromark-extension-gfm"

// ============== 类型 ==============

export interface StructuredChunk {
  index: number
  /** 用于 embedding 与展示的正文，已拼接标题面包屑前缀 */
  content: string
  /** 不含面包屑的原始正文 */
  rawContent: string
  /** 所属标题层级，如 ["草莓种植", "病虫害防治"] */
  headingPath: string[]
  startOffset: number
  endOffset: number
  tokenCount: number
  hash: string
}

export interface ChunkerOptions {
  /** 单块 token 上限，默认 800 */
  maxTokens?: number
  /** 单块 token 下限，低于此值会与相邻同层级块合并，默认 30 */
  minTokens?: number
  /** 仅在被迫拆分超长原子块时使用的重叠 token 数，默认 60 */
  overlapTokens?: number
}

const DEFAULT_MAX_TOKENS = 800
const DEFAULT_MIN_TOKENS = 30
const DEFAULT_OVERLAP_TOKENS = 60

// ============== Token 计数 ==============

type Encoder = { encode: (text: string) => number[] }

let encoderState: Encoder | null | undefined

/**
 * 惰性加载 js-tiktoken（可选依赖）。
 * 装了就用 cl100k_base 精确计数；没装则静默回退到保守估算，不阻断分块。
 * 用变量形式的 import：既避免 TS 在依赖缺失时报 TS2307，
 * 也避免打包器为可选依赖生成 critical dependency 警告。
 */
async function resolveEncoder(): Promise<Encoder | null> {
  if (encoderState !== undefined) return encoderState
  try {
    const moduleName = "js-tiktoken"
    const mod: any = await import(/* webpackIgnore: true */ moduleName)
    encoderState = (mod?.encodingForModel?.("gpt-4o") as Encoder) ?? null
  } catch {
    encoderState = null
  }
  return encoderState
}

/**
 * 回退估算：覆盖 CJK 统一表意文字、日文假名、韩文音节。
 * 中文按 1 字 1 token 计（保守），其余按 3.5 字符/token。
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  const cjk = (
    text.match(/[㐀-䶿一-鿿぀-ヿ가-힯]/g) || []
  ).length
  const rest = text.length - cjk
  return Math.ceil(cjk + rest / 3.5)
}

export async function countTokens(text: string): Promise<number> {
  const enc = await resolveEncoder()
  if (enc) {
    try {
      return enc.encode(text).length
    } catch {
      /* 落到估算 */
    }
  }
  return estimateTokens(text)
}

// ============== 句子切分 ==============

/**
 * 中英文混合句子切分。
 * 相比旧实现，额外规避：小数点（3.14）、英文缩写（Inc. / Dr.）、省略号。
 */
export function splitSentences(text: string): string[] {
  if (!text.trim()) return []
  // 先按行切，行内再切句，避免把 Markdown 的换行结构压平
  const lines = text.split(/\n+/)
  const out: string[] = []
  for (const line of lines) {
    const parts = line
      .split(/(?<=[。！？!?；;])(?![”"'"'）)]*\d)|(?<=\.{3})|(?<=[.!?])\s+(?=[A-Z"'（(])/)
      .map(s => s.trim())
      .filter(Boolean)
    if (parts.length === 0 && line.trim()) out.push(line.trim())
    else out.push(...parts)
  }
  return out
}

// ============== AST 遍历 ==============

type Segment =
  | { kind: "heading"; depth: number; text: string }
  | { kind: "block"; text: string; start: number; end: number; atomic: boolean }

interface MdastNode {
  type: string
  depth?: number
  value?: string
  children?: MdastNode[]
  position?: { start: { offset?: number }; end: { offset?: number } }
}

/** 作为原子单元、不允许拆分的节点类型 */
const ATOMIC_TYPES = ["code", "table", "html", "math", "yaml", "toml", "definition", "footnoteDefinition"]

/** 参与正文分块的块级节点类型 */
const BLOCK_TYPES = [
  "paragraph",
  "blockquote",
  "list",
  "listItem",
  "thematicBreak",
  "heading",
  ...ATOMIC_TYPES,
]

/**
 * 从 mdast 顶层节点提取线性片段序列。
 * 只遍历顶层：嵌套内容（如 listItem 内的段落）随父节点整块保留，
 * 因为列表项本身就应该作为一个语义单元。
 */
function extractSegments(raw: string, root: MdastNode): Segment[] {
  const segments: Segment[] = []
  for (const node of root.children ?? []) {
    if (BLOCK_TYPES.indexOf(node.type) === -1) continue
    const start = node.position?.start?.offset ?? 0
    const end = node.position?.end?.offset ?? 0
    // 直接切原始文本：完整保留表格、代码块的原始 Markdown 格式
    const text = raw.slice(start, end)
    if (!text.trim()) continue

    if (node.type === "heading") {
      segments.push({ kind: "heading", depth: node.depth ?? 1, text: text.replace(/^#{1,6}\s*/, "").trim() })
    } else {
      segments.push({ kind: "block", text, start, end, atomic: ATOMIC_TYPES.indexOf(node.type) !== -1 })
    }
  }
  return segments
}

// ============== 主入口 ==============

/**
 * Markdown 结构感知分块
 */
export async function chunkMarkdown(markdown: string, options: ChunkerOptions = {}): Promise<StructuredChunk[]> {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS
  const minTokens = options.minTokens ?? DEFAULT_MIN_TOKENS

  const raw = (markdown ?? "").replace(/\r\n/g, "\n")
  if (!raw.trim()) return []

  let tree: MdastNode
  try {
    tree = fromMarkdown(raw, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    }) as unknown as MdastNode
  } catch {
    // 解析失败（异常语法）时降级为纯文本分块，保证不丢内容
    return chunkPlainText(raw, options)
  }

  const segments = extractSegments(raw, tree)
  if (segments.length === 0) return chunkPlainText(raw, options)

  const headingStack: string[] = []
  let buffer: Segment[] = []
  let bufferTokens = 0

  const chunks: StructuredChunk[] = []

  const pushChunk = async (segs: Segment[], path: string[]) => {
    if (segs.length === 0) return
    const rawContent = segs.map(s => s.text).join("\n\n").trim()
    if (!rawContent) return
    const first = segs.find(s => s.kind === "block") as Extract<Segment, { kind: "block" }> | undefined
    const last = [...segs].reverse().find(s => s.kind === "block") as Extract<Segment, { kind: "block" }> | undefined
    const breadcrumb = path.length > 0 ? path.join(" > ") + "\n\n" : ""
    const content = breadcrumb + rawContent
    chunks.push({
      index: chunks.length,
      content,
      rawContent,
      headingPath: [...path],
      startOffset: first?.start ?? 0,
      endOffset: last?.end ?? 0,
      tokenCount: await countTokens(content),
      hash: createHash("sha256").update(rawContent).digest("hex").slice(0, 16),
    })
  }

  for (const seg of segments) {
    if (seg.kind === "heading") {
      // 标题层级变化：先落地当前 buffer，再更新面包屑
      await pushChunk(buffer, headingStack)
      buffer = []
      bufferTokens = 0
      headingStack.length = Math.max(0, seg.depth - 1)
      headingStack[seg.depth - 1] = seg.text
      headingStack.length = seg.depth
      continue
    }

    let tokens = await countTokens(seg.text)

    if (seg.atomic && tokens > maxTokens) {
      // 原子块本身超限（巨型代码块 / 表格）：先落地 buffer，再按行强制拆分
      await pushChunk(buffer, headingStack)
      buffer = []
      bufferTokens = 0
      const pieces = splitOversized(seg.text, maxTokens, options.overlapTokens ?? DEFAULT_OVERLAP_TOKENS)
      for (const piece of pieces) {
        await pushChunk([{ kind: "block", text: piece, start: seg.start, end: seg.end, atomic: false }], headingStack)
      }
      continue
    }

    if (!seg.atomic && tokens > maxTokens) {
      // 普通超长块：按句子二次切分
      const sentences = splitSentences(seg.text)
      let acc = ""
      for (const sentence of sentences) {
        const candidate = acc ? acc + sentence : sentence
        const candidateTokens = await countTokens(candidate)
        if (candidateTokens > maxTokens && acc) {
          buffer.push({ kind: "block", text: acc.trim(), start: seg.start, end: seg.end, atomic: false })
          bufferTokens += await countTokens(acc)
          await pushChunk(buffer, headingStack)
          buffer = []
          bufferTokens = 0
          acc = sentence
        } else {
          acc = candidate
        }
      }
      if (acc.trim()) {
        buffer.push({ kind: "block", text: acc.trim(), start: seg.start, end: seg.end, atomic: false })
        bufferTokens += await countTokens(acc)
      }
      continue
    }

    if (bufferTokens + tokens > maxTokens && bufferTokens > 0) {
      await pushChunk(buffer, headingStack)
      buffer = []
      bufferTokens = 0
    }
    buffer.push(seg)
    bufferTokens += tokens
  }

  await pushChunk(buffer, headingStack)

  return mergeSmallChunks(chunks, minTokens, maxTokens)
}

/**
 * 纯文本分块：按段落优先，超长段落按句子切
 */
export async function chunkPlainText(text: string, options: ChunkerOptions = {}): Promise<StructuredChunk[]> {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS
  const raw = (text ?? "").replace(/\r\n/g, "\n")
  if (!raw.trim()) return []

  const chunks: StructuredChunk[] = []
  let buffer: string[] = []
  let bufferTokens = 0
  let offset = 0

  const flush = async () => {
    const rawContent = buffer.join("\n\n").trim()
    buffer = []
    if (!rawContent) return
    chunks.push({
      index: chunks.length,
      content: rawContent,
      rawContent,
      headingPath: [],
      startOffset: offset,
      endOffset: offset + rawContent.length,
      tokenCount: await countTokens(rawContent),
      hash: createHash("sha256").update(rawContent).digest("hex").slice(0, 16),
    })
    offset += rawContent.length
  }

  for (const para of raw.split(/\n{2,}/)) {
    if (!para.trim()) continue
    const tokens = await countTokens(para)
    if (tokens > maxTokens) {
      await flush()
      let acc = ""
      for (const sentence of splitSentences(para)) {
        const candidate = acc ? acc + sentence : sentence
        if ((await countTokens(candidate)) > maxTokens && acc) {
          buffer = [acc.trim()]
          await flush()
          acc = sentence
        } else {
          acc = candidate
        }
      }
      if (acc.trim()) {
        buffer = [acc.trim()]
        await flush()
      }
      continue
    }
    if (bufferTokens + tokens > maxTokens && bufferTokens > 0) await flush()
    buffer.push(para.trim())
    bufferTokens += tokens
  }
  await flush()

  return chunks
}

/**
 * 按内容类型自动选择分块策略
 */
export async function chunkDocument(
  text: string,
  contentType?: string | null,
  options: ChunkerOptions = {}
): Promise<StructuredChunk[]> {
  const looksLikeMarkdown =
    contentType === "markdown" ||
    /^#{1,6}\s/m.test(text) ||
    /```/.test(text) ||
    /^\s*\|.+\|\s*$/m.test(text)

  return looksLikeMarkdown ? chunkMarkdown(text, options) : chunkPlainText(text, options)
}

// ============== 辅助 ==============

/** 超长原子块按行拆分（保留 fence 之外的内容完整性） */
function splitOversized(text: string, maxTokens: number, overlapTokens: number): string[] {
  const lines = text.split("\n")
  const pieces: string[] = []
  let current: string[] = []
  let currentEstimate = 0

  for (const line of lines) {
    const lineEstimate = estimateTokens(line)
    if (currentEstimate + lineEstimate > maxTokens && current.length > 0) {
      pieces.push(current.join("\n"))
      // 保留末尾若干行作为重叠
      const tail: string[] = []
      let tailEstimate = 0
      for (let i = current.length - 1; i >= 0 && tailEstimate < overlapTokens; i--) {
        tail.unshift(current[i])
        tailEstimate += estimateTokens(current[i])
      }
      current = tail
      currentEstimate = tailEstimate
    }
    current.push(line)
    currentEstimate += lineEstimate
  }
  if (current.length > 0) pieces.push(current.join("\n"))
  return pieces.filter(p => p.trim().length > 0)
}

/** 合并相邻的同层级小块，避免碎片化 */
function mergeSmallChunks(chunks: StructuredChunk[], minTokens: number, maxTokens: number): StructuredChunk[] {
  if (chunks.length <= 1) return chunks
  const out: StructuredChunk[] = []
  let pending: StructuredChunk | null = null

  for (const chunk of chunks) {
    if (!pending) {
      pending = chunk
      continue
    }
    const samePath = pending.headingPath.join(">") === chunk.headingPath.join(">")
    if (pending.tokenCount < minTokens && samePath && pending.tokenCount + chunk.tokenCount <= maxTokens) {
      const rawContent: string = pending.rawContent + "\n\n" + chunk.rawContent
      const breadcrumb = chunk.headingPath.length > 0 ? chunk.headingPath.join(" > ") + "\n\n" : ""
      pending = {
        ...pending,
        content: breadcrumb + rawContent,
        rawContent,
        endOffset: chunk.endOffset,
        tokenCount: pending.tokenCount + chunk.tokenCount,
        hash: createHash("sha256").update(rawContent).digest("hex").slice(0, 16),
      }
    } else {
      out.push(pending)
      pending = chunk
    }
  }
  if (pending) out.push(pending)

  return out.map((c, i) => ({ ...c, index: i }))
}
