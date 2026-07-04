/**
 * Embedding 服务
 *
 * 统一管理知识库文本的分块、Embedding 生成、相似度计算
 *
 * 设计：
 * 1. 文本分块：基于段落/句子的滑动窗口分块，默认 500 字符 / 块，相邻块重叠 50 字符
 *    - GLM embedding-2 单条 ≤ 512 tokens → chunk 默认 500 字符（≈ 200-300 中文字）已足够
 *    - GLM embedding-3 单条 ≤ 3072 tokens → 允许更大块
 * 2. Embedding 提供商：OpenAI / 智谱 GLM / 阿里 DashScope，admin 后台可配置
 * 3. 相似度：余弦相似度
 * 4. 向量存储：JSON 字符串（兼容无 pgvector 扩展的环境）
 * 5. 智谱 GLM 配套 API：
 *    - /embeddings    文本嵌入（embedding-2 / embedding-3）
 *    - /rerank        文本重排序（rerank）
 *    - /layout_parsing 文档解析（glm-ocr），用于图片/PDF 的高级 OCR
 */

import { createHash } from "node:crypto"
import { readProvidersConfig, getKnowledgeConfig } from "./provider-resolver"
import { createChunk, deleteChunksByItem, updateChunkEmbedding, listChunks } from "../db/knowledge-service"
import type { KnowledgeItem } from "../db/knowledge-service"

// ============== 类型定义 ==============

export type EmbeddingProvider = "openai" | "dashscope" | "local" | "glm"

export interface ChunkOptions {
  chunkSize?: number        // 块大小（字符数）
  chunkOverlap?: number     // 块重叠（字符数）
  minChunkSize?: number     // 最小块大小
  maxTokens?: number        // 单块最大 token 数（GLM embedding-2: 512, embedding-3: 3072）
}

export interface TextChunk {
  index: number
  content: string
  startOffset: number
  endOffset: number
  tokenCount: number
  hash: string
}

export interface EmbeddingResult {
  vector: number[]
  model: string
  provider: EmbeddingProvider
  dimension: number
}

export interface SimilarityResult {
  id: number
  score: number
  content: string
  metadata?: any
}

// ============== 文本分块 ==============

/**
 * 简单分块：按段落（空行/换行）优先，再按句子边界，最后按字符滑动窗口
 * 中文文本保留标点切分；英文按 . 切分
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  if (!text || text.trim().length === 0) return []

  const chunkSize = options.chunkSize ?? 500
  const chunkOverlap = options.chunkOverlap ?? 50
  const minChunkSize = options.minChunkSize ?? 50
  const maxTokens = options.maxTokens ?? null

  const normalized = text.replace(/\r\n/g, "\n").trim()
  const chunks: TextChunk[] = []
  let charOffset = 0
  let chunkIndex = 0

  // 1) 先按段落（双换行）切分
  const paragraphs = normalized.split(/\n{2,}/)
  let buffer = ""
  let bufferStart = 0

  /** 检查是否需要 flush（按字符或 token 限制） */
  const shouldFlush = (extra: string) => {
    const nextLen = buffer.length + extra.length + 2
    if (nextLen > chunkSize) return true
    if (maxTokens) {
      const nextTokens = estimateTokenCount(buffer + extra)
      if (nextTokens > maxTokens) return true
    }
    return false
  }

  const flushBuffer = (end: number) => {
    if (buffer.length < minChunkSize) return
    chunks.push({
      index: chunkIndex++,
      content: buffer.trim(),
      startOffset: bufferStart,
      endOffset: end,
      tokenCount: estimateTokenCount(buffer),
      hash: createHash("sha256").update(buffer).digest("hex").slice(0, 16)
    })
  }

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue
    if (shouldFlush(trimmed)) {
      // 当前 buffer 已满，先 flush
      if (buffer) {
        flushBuffer(bufferStart + buffer.length)
        // 保留 overlap
        const overlap = buffer.slice(-chunkOverlap)
        buffer = overlap
        bufferStart = bufferStart + buffer.length - overlap.length
      }
      // 如果单段落超长，按句子切
      if (trimmed.length > chunkSize) {
        const sentences = splitSentences(trimmed)
        for (const sent of sentences) {
          if (shouldFlush(sent)) {
            flushBuffer(bufferStart + buffer.length)
            const overlap = buffer.slice(-chunkOverlap)
            buffer = overlap
            bufferStart = bufferStart + buffer.length - overlap.length
          }
          buffer += (buffer ? " " : "") + sent
        }
      } else {
        buffer += (buffer ? "\n\n" : "") + trimmed
      }
    } else {
      buffer += (buffer ? "\n\n" : "") + trimmed
    }
  }
  if (buffer.trim()) flushBuffer(bufferStart + buffer.length)

  return chunks
}

function splitSentences(text: string): string[] {
  // 中英文混合句子切分
  return text
    .split(/(?<=[。！？!?；;])|(?<=[。！？!?]["""''])|(?<=\.\s)|(?<=\n)/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

export function estimateTokenCount(text: string): number {
  // 简单估算：中文 1.5 字符/token，英文 0.25 token/字符
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const otherChars = text.length - chineseChars
  return Math.ceil(chineseChars / 1.5 + otherChars / 4)
}

// ============== Embedding Providers ==============

/**
 * 解析当前可用的 embedding 提供商
 * 优先级：
 *   1) admin 后台配置 (ProvidersConfig.embeddingConfig) - 推荐
 *   2) 环境变量 EMBEDDING_PROVIDER / OPENAI_API_KEY / DASHSCOPE_API_KEY / GLM
 *   3) local hash (非语义，仅保证功能可用)
 */
export async function resolveEmbeddingProvider(): Promise<{
  provider: EmbeddingProvider
  model: string
  baseUrl: string
  apiKey: string
  dimension: number
}> {
  // 1) 优先：admin 后台配置
  try {
    const config = await readProvidersConfig()
    if (config.embeddingConfig?.enabled && config.embeddingConfig.providerId && config.embeddingConfig.model) {
      const provider = config.providers.find(p => p.id === config.embeddingConfig!.providerId && p.enabled)
      if (provider && provider.apiKey) {
        const model = provider.models.find(m => m.id === config.embeddingConfig!.model && m.enabled)
        if (model) {
          const baseRaw = provider.baseUrl.replace(/\/+$/, '')
          // 智谱 GLM 的 embedding 接口路径是 /api/paas/v4/embeddings
          // OpenAI/DashScope (compatible-mode) 走 /v1/embeddings
          let embedBase: string
          if (provider.type === 'glm') {
            embedBase = `${baseRaw}/embeddings`
          } else if (provider.type === 'dashscope' && baseRaw.includes('compatible-mode')) {
            embedBase = `${baseRaw}/embeddings`
          } else if (baseRaw.endsWith('/v1')) {
            embedBase = `${baseRaw}/embeddings`
          } else {
            embedBase = `${baseRaw}/v1/embeddings`
          }
          // 维度判断
          const dim = config.embeddingConfig.dimension ||
            (model.id === 'embedding-3' ? 2048 :
             model.id === 'embedding-2' ? 1024 :
             model.id.includes('3-large') ? 3072 :
             model.id.includes('v3') || model.id.includes('v4') ? 1024 :
             model.id.includes('v2') ? 1536 :
             1536)
          return {
            provider: provider.type === 'dashscope' ? 'dashscope' : (provider.type === 'glm' ? 'glm' : 'openai'),
            model: model.id,
            baseUrl: embedBase,
            apiKey: provider.apiKey,
            dimension: dim
          }
        }
      }
    }
  } catch (e) {
    console.warn('[embedding] failed to read admin config:', e)
  }

  // 2) 环境变量
  const envProvider = (process.env.EMBEDDING_PROVIDER || "").toLowerCase() as EmbeddingProvider
  if (envProvider === "openai" && process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/embeddings",
      apiKey: process.env.OPENAI_API_KEY,
      dimension: 1536
    }
  }
  if (envProvider === "dashscope" && process.env.DASHSCOPE_API_KEY) {
    return {
      provider: "dashscope",
      model: process.env.EMBEDDING_MODEL || "text-embedding-v3",
      baseUrl: "https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding",
      apiKey: process.env.DASHSCOPE_API_KEY,
      dimension: 1024
    }
  }
  // GLM 环境变量
  if ((envProvider === "glm" || !envProvider) && process.env.GLM_API_KEY) {
    return {
      provider: "glm",
      model: process.env.EMBEDDING_MODEL || "embedding-2",
      baseUrl: process.env.GLM_BASE_URL
        ? `${process.env.GLM_BASE_URL.replace(/\/+$/, "")}/embeddings`
        : "https://open.bigmodel.cn/api/paas/v4/embeddings",
      apiKey: process.env.GLM_API_KEY,
      dimension: 1024
    }
  }

  // 3) provider-resolver 启发式（admin 配置中只要模型 id 含 embed 即可）
  try {
    const config = await readProvidersConfig()
    for (const p of config.providers) {
      if (!p.enabled || !p.apiKey) continue
      const embedModel = p.models.find(m => m.enabled && (m.supportsEmbedding || /embed/i.test(m.id)))
      if (!embedModel) continue
      const baseRaw = p.baseUrl.replace(/\/+$/, '')
      let embedBase: string
      if (p.type === 'glm') {
        embedBase = `${baseRaw}/embeddings`
      } else if (p.type === 'dashscope' && baseRaw.includes('compatible-mode')) {
        embedBase = `${baseRaw}/embeddings`
      } else if (baseRaw.endsWith('/v1')) {
        embedBase = `${baseRaw}/embeddings`
      } else {
        embedBase = `${baseRaw}/v1/embeddings`
      }
      const dim = embedModel.id === 'embedding-3' ? 2048 : embedModel.id === 'embedding-2' ? 1024 : 1024
      return {
        provider: p.type === 'dashscope' ? 'dashscope' : (p.type === 'glm' ? 'glm' : 'openai'),
        model: embedModel.id,
        baseUrl: embedBase,
        apiKey: p.apiKey,
        dimension: dim
      }
    }
  } catch {}

  // 4) 默认环境变量
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/embeddings",
      apiKey: process.env.OPENAI_API_KEY,
      dimension: 1536
    }
  }
  if (process.env.DASHSCOPE_API_KEY) {
    return {
      provider: "dashscope",
      model: process.env.EMBEDDING_MODEL || "text-embedding-v3",
      baseUrl: "https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding",
      apiKey: process.env.DASHSCOPE_API_KEY,
      dimension: 1024
    }
  }
  if (process.env.GLM_API_KEY) {
    return {
      provider: "glm",
      model: process.env.EMBEDDING_MODEL || "embedding-2",
      baseUrl: "https://open.bigmodel.cn/api/paas/v4/embeddings",
      apiKey: process.env.GLM_API_KEY,
      dimension: 1024
    }
  }

  // 5) 回退到本地 hash（轻量、非语义但稳定）
  return {
    provider: "local",
    model: "local-hash-v1",
    baseUrl: "",
    apiKey: "",
    dimension: 256
  }
}

/**
 * 调用远端 embedding API
 * - openai：OpenAI / DeepSeek / OpenAI 兼容的第三方（默认格式）
 * - dashscope：阿里云 DashScope（自定义格式）
 * - glm：智谱 BigModel
 *   - 端点：POST /api/paas/v4/embeddings
 *   - 请求：{ model, input: string | string[], dimensions? }
 *   - 响应：{ model, object: "list", data: [{ index, object: "embedding", embedding: number[] }], usage }
 *   - 模型：
 *       embedding-2：固定 1024 维，单条 ≤ 512 tokens，数组总长 ≤ 8K
 *       embedding-3：可选 256/512/1024/2048 维，单条 ≤ 3072 tokens，数组 ≤ 64 条
 */
export async function callRemoteEmbedding(
  text: string | string[],
  config: { provider: EmbeddingProvider; model: string; baseUrl: string; apiKey: string; dimension: number }
): Promise<number[][]> {
  if (config.provider === "glm") {
    // 智谱 GLM embedding 接口：input 允许单条或数组
    const input = Array.isArray(text) ? text : [text]
    const body: any = { model: config.model, input }
    // embedding-3 支持自定义维度；embedding-2 固定 1024
    if (config.model === "embedding-3" && config.dimension && [256, 512, 1024, 2048].includes(config.dimension)) {
      body.dimensions = config.dimension
    }
    const res = await fetch(config.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`GLM Embedding failed (${res.status}): ${errText.slice(0, 300)}`)
    }
    const data = (await res.json()) as { data?: Array<{ index: number; embedding: number[] }>; embedding?: number[] }
    if (Array.isArray(data.data)) {
      // 按 index 排序
      return data.data
        .slice()
        .sort((a, b) => a.index - b.index)
        .map(d => d.embedding || [])
    }
    return []
  }
  if (config.provider === "openai") {
    const input = Array.isArray(text) ? text : [text]
    const res = await fetch(config.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({ input, model: config.model })
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`Embedding failed (${res.status}): ${errText.slice(0, 300)}`)
    }
    const data = (await res.json()) as { data?: Array<{ embedding?: number[] }>; embedding?: number[] }
    if (data.data && data.data[0]?.embedding) {
      return data.data.map(d => d.embedding || [])
    }
    if (Array.isArray(data.embedding)) return [data.embedding]
    return []
  }
  if (config.provider === "dashscope") {
    const input = Array.isArray(text) ? text : [text]
    const res = await fetch(config.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        input: { texts: input },
        parameters: { text_type: "document" }
      })
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`DashScope embedding failed ${res.status}: ${errText.slice(0, 200)}`)
    }
    const data = (await res.json()) as { output: { embeddings: Array<{ embedding: number[] }> } }
    return (data.output?.embeddings || []).map(e => e.embedding || [])
  }
  throw new Error(`Unsupported embedding provider: ${config.provider}`)
}

/**
 * 智谱 GLM 文本重排序（Rerank）
 * - 端点：POST /api/paas/v4/rerank
 * - 请求：{ model: "rerank", query, documents: string[], top_n? }
 * - 响应：{ id, results: [{ index, relevance_score, document? }] }
 * - 用途：对 hybrid 检索出的候选 chunks 按与 query 的相关性重新打分
 */
export async function callGLMRerank(opts: {
  apiKey: string
  baseUrl?: string
  query: string
  documents: string[]
  topN?: number
  returnDocuments?: boolean
}): Promise<Array<{ index: number; score: number; document?: string }>> {
  const url = (opts.baseUrl || "https://open.bigmodel.cn/api/paas/v4").replace(/\/+$/, "") + "/rerank"
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`
    },
    body: JSON.stringify({
      model: "rerank",
      query: opts.query,
      documents: opts.documents,
      top_n: opts.topN ?? opts.documents.length,
      return_documents: !!opts.returnDocuments
    })
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`GLM Rerank failed (${res.status}): ${errText.slice(0, 300)}`)
  }
  const data = (await res.json()) as { results?: Array<{ index: number; relevance_score: number; document?: string }> }
  return (data.results || []).map(r => ({
    index: r.index,
    score: r.relevance_score,
    document: r.document
  }))
}

/**
 * 智谱 GLM 文档解析（GLM-OCR）
 * - 端点：POST /api/paas/v4/layout_parsing
 * - 请求：{ model: "glm-ocr", file: <url | base64 data:...>, start_page_id?, end_page_id? }
 * - 响应：{ md_results: <markdown>, layout_details, ... }
 * - 用途：替代/增强 PDF/图片 解析，可识别表格/公式/图片，输出 markdown
 *
 * 注意：file 参数是图片或 PDF 的 url（公网）或者 base64 data URI。
 * 适合处理「需要 OCR」或者「希望按布局提取 markdown」的高质量场景。
 */
export async function callGLMDocumentParsing(opts: {
  apiKey: string
  baseUrl?: string
  file: string       // url 或 data:image/...;base64,...
  startPage?: number
  endPage?: number
  needVisualization?: boolean
}): Promise<{ markdown: string; pages: number; usage: any }> {
  const url = (opts.baseUrl || "https://open.bigmodel.cn/api/paas/v4").replace(/\/+$/, "") + "/layout_parsing"
  const body: any = { model: "glm-ocr", file: opts.file }
  if (opts.startPage) body.start_page_id = opts.startPage
  if (opts.endPage) body.end_page_id = opts.endPage
  if (opts.needVisualization) body.need_layout_visualization = true
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`GLM Document Parsing failed (${res.status}): ${errText.slice(0, 300)}`)
  }
  const data = (await res.json()) as {
    md_results?: string
    data_info?: { num_pages?: number }
    usage?: any
  }
  return {
    markdown: data.md_results || "",
    pages: data.data_info?.num_pages || 0,
    usage: data.usage || null
  }
}

/**
 * 本地简单 hash embedding（256 维）
 * 基于字符 n-gram 的 hash + IDF 风格的归一化
 * 注意：这不是真正的语义 embedding，仅用于在没有 API key 时保证功能可用
 */
export function localHashEmbedding(text: string, dimension = 256): number[] {
  const vec = new Array<number>(dimension).fill(0)
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim()
  if (!normalized) return vec

  // 1-gram + 2-gram + 3-gram 特征
  const tokens: string[] = []
  // 中文字符按字切
  const cjkChars = normalized.match(/[\u4e00-\u9fa5]/g) || []
  tokens.push(...cjkChars)
  // 英文按词切
  const words = normalized.match(/[a-z0-9]+/g) || []
  tokens.push(...words)

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const h1 = simpleHash(t) % dimension
    vec[h1] += 1
    if (i + 1 < tokens.length) {
      const t2 = tokens[i] + tokens[i + 1]
      const h2 = simpleHash(t2) % dimension
      vec[h2] += 0.5
    }
  }

  // L2 归一化
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
  return vec.map(v => v / norm)
}

function simpleHash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * 统一 embedding 入口
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const config = await resolveEmbeddingProvider()
  if (config.provider === "local") {
    return {
      vector: localHashEmbedding(text, config.dimension),
      model: config.model,
      provider: "local",
      dimension: config.dimension
    }
  }
  try {
    const vectors = await callRemoteEmbedding(text, config)
    const vector = vectors[0] || []
    return {
      vector,
      model: config.model,
      provider: config.provider,
      dimension: vector.length || config.dimension
    }
  } catch (e) {
    console.warn("[embedding] remote failed, fallback to local:", e)
    return {
      vector: localHashEmbedding(text, config.dimension),
      model: "local-hash-v1",
      provider: "local",
      dimension: config.dimension
    }
  }
}

/**
 * 批量 embedding（带并发控制）
 */
export async function generateEmbeddings(texts: string[], concurrency = 4): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = []
  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(t => generateEmbedding(t)))
    results.push(...batchResults)
  }
  return results
}

// ============== 相似度计算 ==============

/**
 * 余弦相似度
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

export function parseEmbeddingVector(str: string | null | undefined): number[] | null {
  if (!str) return null
  try {
    const parsed = JSON.parse(str)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

// ============== 知识库嵌入管理 ==============

/**
 * 为一个知识条目生成分块和 embedding
 * - 删除旧 chunks
 * - 按 chunkSize/overlap 切分文本
 * - 调用 embedding API 写入 chunks 表
 * - 更新 item 的 embedding_status
 */
export async function embedItem(item: KnowledgeItem, options: ChunkOptions & { userId: number }): Promise<{
  chunkCount: number
  model: string
  provider: EmbeddingProvider
}> {
  // 1) 文本准备：title + content + summary
  const text = [item.title, item.summary || "", item.content || ""].filter(Boolean).join("\n\n")
  if (!text.trim()) {
    return { chunkCount: 0, model: "none", provider: "local" }
  }

  // 2) 根据 embedding 模型从 admin knowledgeConfig.chunking.maxTokensByModel 推断 maxTokens
  //    用户可通过 admin 后台或单次调用 options.maxTokens 覆盖
  let chunkOpts: ChunkOptions = { ...options }
  if (!chunkOpts.maxTokens) {
    const provider = await resolveEmbeddingProvider()
    const kc = await getKnowledgeConfig()
    const configured = kc.chunking.maxTokensByModel[provider.model]
    chunkOpts.maxTokens = configured || kc.chunking.maxTokensByModel["*"] || null
  }
  if (chunkOpts.chunkSize === undefined) {
    const kc = await getKnowledgeConfig()
    chunkOpts.chunkSize = kc.chunking.chunkSize
  }
  if (chunkOpts.chunkOverlap === undefined) {
    const kc = await getKnowledgeConfig()
    chunkOpts.chunkOverlap = kc.chunking.chunkOverlap
  }
  if (chunkOpts.minChunkSize === undefined) {
    const kc = await getKnowledgeConfig()
    chunkOpts.minChunkSize = kc.chunking.minChunkSize
  }

  // 3) 分块
  const chunks = chunkText(text, chunkOpts)

  // 3) 删除旧 chunks
  await deleteChunksByItem(item.id)

  // 4) 创建新 chunks + 生成 embedding
  let model = "none"
  let provider: EmbeddingProvider = "local"
  for (const c of chunks) {
    const chunkId = await createChunk({
      item_id: item.id,
      version_id: item.current_version,
      chunk_index: c.index,
      content: c.content,
      content_hash: c.hash,
      token_count: c.tokenCount,
      start_offset: c.startOffset,
      end_offset: c.endOffset,
      metadata: null,
      embedding: null,
      embedding_model: null
    })
    try {
      const emb = await generateEmbedding(c.content)
      await updateChunkEmbedding(chunkId, JSON.stringify(emb.vector), emb.model)
      model = emb.model
      provider = emb.provider
    } catch (e) {
      console.warn(`[embedding] chunk ${c.index} failed:`, e)
    }
  }

  return { chunkCount: chunks.length, model, provider }
}

/**
 * 解析 item 的所有 chunks 为可检索结构
 */
export async function getItemEmbeddings(itemId: number): Promise<Array<{
  id: number
  content: string
  vector: number[] | null
  chunkIndex: number
}>> {
  const chunks = await listChunks(itemId)
  return chunks.map(c => ({
    id: c.id,
    content: c.content,
    vector: parseEmbeddingVector(c.embedding),
    chunkIndex: c.chunk_index
  }))
}
