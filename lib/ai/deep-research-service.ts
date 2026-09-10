/**
 * 深度研究服务：联网检索 → 多源融合 → 结构化知识条目
 *
 * 这是「AI 自己联网搜、自己融合成知识、沉淀给自己检索」闭环的核心。
 * 方法论上借鉴了两个开源项目，但都没有直接引入：
 * - jina-ai/node-DeepResearch 的 Search→Read→Reason 迭代循环（TS，但依赖 Jina/Gemini，国内不稳）
 * - stanford-oval/storm 的「多视角提问」策略（Python，仅借鉴 prompt 设计）
 *
 * 流程：
 *   1. planSubQueries —— LLM 从多个视角拆解子查询（不同侧面提升覆盖度）
 *   2. gatherSources  —— 并行联网搜索 + 抓取正文，按 URL 去重
 *   3. identifyGaps   —— LLM 审视已有素材找出信息缺口，补搜（可配轮数）
 *   4. synthesize     —— LLM 把多源素材融合成带引用标注的结构化条目
 */

import {
  webSearch,
  type WebSearchResult
} from "./web-search-service"
import { readProvidersConfig, resolveProvider, resolveDefaultModelId } from "./provider-resolver"
import { createItem, type KnowledgeItem } from "../db/knowledge-service"
import { embedItem } from "./embedding-service"

// ============== LLM 调用 ==============

async function callLLM(
  messages: Array<{ role: string; content: string }>,
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const cfg = await readProvidersConfig()
  const modelId = resolveDefaultModelId(cfg) ?? (cfg as any)?.defaultModelId
  const resolved = modelId ? await resolveProvider(modelId) : null
  if (!resolved?.apiKey) throw new Error("未配置可用的 LLM provider，无法执行研究")

  const res = await fetch(resolved.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolved.apiKey}`
    },
    body: JSON.stringify({
      model: resolved.model,
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 4000,
      stream: false
    })
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`LLM 调用失败 ${res.status}: ${detail.slice(0, 200)}`)
  }
  const data: any = await res.json()
  return String(data?.choices?.[0]?.message?.content ?? "").trim()
}

/** 从 LLM 回复中提取 JSON（容忍 ```json 包裹与前后废话） */
function extractJson<T>(text: string): T | null {
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced ? fenced[1] : text).trim()
  const start = candidate.search(/[[{]/)
  if (start === -1) return null
  const openChar = candidate[start]
  const closeChar = openChar === "[" ? "]" : "}"
  const end = candidate.lastIndexOf(closeChar)
  if (end <= start) return null
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T
  } catch {
    return null
  }
}

// ============== 类型 ==============

export interface ResearchSource {
  title: string
  url: string
  siteName: string
  snippet: string
  fullText?: string
  publishDate?: string
}

export interface ResearchResult {
  title: string
  summary: string
  /** Markdown 正文，含参考来源一节 */
  content: string
  sources: Array<{ title: string; url: string; siteName: string }>
  subQueries: string[]
  rounds: number
}

export interface ResearchOptions {
  /** 视角子查询数，默认 3 */
  maxSubQueries?: number
  /** 缺口补搜轮数，默认 1 */
  maxRounds?: number
  /** 每个子查询取的结果数，默认 6 */
  sourcesPerQuery?: number
  signal?: AbortSignal
  /** 进度回调（用于 SSE 推送或日志） */
  onProgress?: (stage: string, detail?: string) => void
}

// ============== 1. 多视角子查询规划 ==============

async function planSubQueries(topic: string, maxSubQueries: number, signal?: AbortSignal): Promise<string[]> {
  const prompt = `你是一个研究规划器。针对主题「${topic}」，从不同视角拆解出 ${maxSubQueries} 个互补的搜索子查询，让合并后的信息覆盖尽量全面。
视角可以包括：事实/数据、方法/教程、原理/背景、常见问题/对比等，按主题选择最合适的。
只输出 JSON 数组，元素为子查询字符串，不要解释。`

  try {
    const text = await callLLM([{ role: "user", content: prompt }], { maxTokens: 300, temperature: 0.5 })
    const arr = extractJson<string[]>(text)
    const queries = (Array.isArray(arr) ? arr : [])
      .map(q => String(q).trim())
      .filter(q => q.length > 1)
      .slice(0, maxSubQueries)
    if (queries.length > 0) return queries
  } catch {
    /* 规划失败时退化为单查询 */
  }
  return [topic]
}

// ============== 2. 搜索与素材收集 ==============

function dedupeSources(sources: ResearchSource[]): ResearchSource[] {
  const seen = new Set<string>()
  const out: ResearchSource[] = []
  for (const s of sources) {
    const key = s.url.replace(/[#?].*$/, "").replace(/\/+$/, "")
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

async function gatherSources(
  queries: string[],
  options: ResearchOptions,
  existing: ResearchSource[] = []
): Promise<ResearchSource[]> {
  const perQuery = options.sourcesPerQuery ?? 6
  const knownUrls = new Set(existing.map(s => s.url))

  const batches = await Promise.allSettled(
    queries.map(q =>
      webSearch(q, {
        count: perQuery,
        contentSize: "high",
        signal: options.signal
      })
    )
  )

  const collected: WebSearchResult[] = []
  for (const b of batches) {
    if (b.status === "fulfilled") collected.push(...b.value)
  }

  // 对新来源抓正文（限并发，全并行容易触发对方反爬）
  const fresh = collected.filter(r => r.url && !knownUrls.has(r.url)).slice(0, perQuery * 2)
  const { fetchPageText } = await import("./web-search-service")
  const CONCURRENCY = 3
  const texts: Array<string | undefined> = []
  for (let i = 0; i < fresh.length; i += CONCURRENCY) {
    const slice = fresh.slice(i, i + CONCURRENCY)
    texts.push(
      ...(await Promise.all(slice.map(r => fetchPageText(r.url, 6000, options.signal))))
    )
  }

  const sources: ResearchSource[] = fresh.map((r, i) => ({
    title: r.title,
    url: r.url,
    siteName: r.siteName,
    snippet: r.snippet,
    fullText: texts[i] || undefined,
    publishDate: r.publishDate
  }))
  return dedupeSources([...existing, ...sources])
}

// ============== 3. 缺口识别 ==============

async function identifyGaps(topic: string, sources: ResearchSource[], signal?: AbortSignal): Promise<string[]> {
  if (sources.length === 0) return [topic]
  const digest = sources
    .slice(0, 20)
    .map((s, i) => `${i + 1}. [${s.siteName || s.url}] ${s.title}：${(s.snippet || "").slice(0, 120)}`)
    .join("\n")

  const prompt = `研究主题：「${topic}」
已收集素材：
${digest}

判断以上素材是否足以全面回答该主题。若有明显缺口（如缺少数据、缺少方法细节、缺少对比），输出 1-2 个补充搜索查询；若已充分，输出空数组 []。
只输出 JSON 数组。`

  try {
    const text = await callLLM([{ role: "user", content: prompt }], { maxTokens: 200, temperature: 0.3 })
    const arr = extractJson<string[]>(text)
    return (Array.isArray(arr) ? arr : [])
      .map(q => String(q).trim())
      .filter(q => q.length > 1)
      .slice(0, 2)
  } catch {
    return []
  }
}

// ============== 4. 知识合成 ==============

async function synthesize(
  topic: string,
  sources: ResearchSource[],
  subQueries: string[],
  signal?: AbortSignal
): Promise<ResearchResult> {
  if (sources.length === 0) {
    throw new Error("联网检索未获得任何可用素材，无法合成知识")
  }

  const material = sources
    .map((s, i) => {
      const body = (s.fullText || s.snippet || "").slice(0, 4000)
      return `【来源${i + 1}】${s.title}（${s.siteName || s.url}${s.publishDate ? "，" + s.publishDate : ""}）\n${body}`
    })
    .join("\n\n")

  const prompt = `你是知识整理专家。基于以下联网素材，为主题「${topic}」撰写一篇结构化的知识条目。

要求：
1. 严格基于素材，不要编造素材中没有的事实；素材间冲突时注明分歧
2. 正文用 Markdown，分节组织（用 ## 二级标题），要点优先
3. 引用素材时在句末标注 [来源编号]，如 [1] 或 [2][5]
4. 输出 JSON：{"title": "条目标题(简洁准确)", "summary": "一两句话的摘要", "content": "Markdown 正文"}
5. content 末尾不要自己加参考来源列表，系统会自动追加

素材：
${material}

只输出 JSON。`

  const text = await callLLM([{ role: "user", content: prompt }], { maxTokens: 6000, temperature: 0.3 })
  const parsed = extractJson<{ title?: string; summary?: string; content?: string }>(text)

  const title = (parsed?.title || topic).trim().slice(0, 120)
  const summary = (parsed?.summary || "").trim()
  let content = (parsed?.content || "").trim()
  if (!content) content = `关于「${topic}」的自动研究未能生成正文，请参考以下来源。\n\n` + material.slice(0, 2000)

  // 追加参考来源（自动生成，不依赖 LLM）
  const refs = sources
    .map((s, i) => `${i + 1}. [${s.title || s.url}](${s.url})${s.siteName ? " — " + s.siteName : ""}${s.publishDate ? "（" + s.publishDate + "）" : ""}`)
    .join("\n")
  content = `${content}\n\n## 参考来源\n\n${refs}`

  return {
    title,
    summary,
    content,
    sources: sources.map(s => ({ title: s.title, url: s.url, siteName: s.siteName })),
    subQueries,
    rounds: 0
  }
}

// ============== 主入口 ==============

/**
 * 对一个主题执行完整研究：拆解 → 搜索 → 补搜 → 融合
 */
export async function researchTopic(topic: string, options: ResearchOptions = {}): Promise<ResearchResult> {
  const signal = options.signal
  const maxRounds = options.maxRounds ?? 1
  const notify = options.onProgress

  notify?.("plan", "拆解研究子查询")
  const subQueries = await planSubQueries(topic, options.maxSubQueries ?? 3, signal)
  notify?.("search", `并行检索 ${subQueries.length} 个子查询`)

  let sources = await gatherSources(subQueries, options)
  let rounds = 0

  for (let round = 0; round < maxRounds; round++) {
    notify?.("gap", `第 ${round + 1} 轮缺口分析（已有 ${sources.length} 条来源）`)
    const gaps = await identifyGaps(topic, sources, signal)
    if (gaps.length === 0) break
    notify?.("search", `补搜：${gaps.join("；")}`)
    const before = sources.length
    sources = await gatherSources(gaps, options, sources)
    rounds++
    if (sources.length === before) break // 补搜无新增，提前结束
  }

  notify?.("synthesize", `融合 ${sources.length} 条来源`)
  const result = await synthesize(topic, sources, subQueries, signal)
  result.rounds = rounds
  return result
}

// ============== 直接保存知识条目 ==============

export interface KnowledgeSaveResult {
  itemId: number
  embed: { chunkCount: number; model: string } | null
}

/**
 * 把用户直接给定的内容（笔记/资料/要点）写入知识库并自动向量化。
 * 与 researchAndIngest 的入库段同构，但不走联网研究——内容以用户提供的为准。
 * 供 builtin knowledge_save 工具调用。
 */
export async function saveKnowledgeEntry(
  userId: number,
  opts: { title: string; content: string; tags?: string[]; collectionId?: number | null }
): Promise<KnowledgeSaveResult> {
  const title = opts.title.trim().slice(0, 200) || "未命名条目"
  const content = opts.content.trim()

  const sourceMetadata = JSON.stringify({
    type: "manual_save",
    saved_at: Date.now()
  })

  const itemId = await createItem({
    user_id: userId,
    title,
    content,
    content_type: "note",
    collection_id: opts.collectionId ?? null,
    source_url: null,
    source_metadata: sourceMetadata,
    summary: null,
    tags: opts.tags && opts.tags.length > 0 ? opts.tags.slice(0, 10) : ["AI收藏"],
    embedding_status: "pending"
  })

  // 入库即向量化；失败不阻塞（embedding_status 已是 pending，可手动重试）
  let embed: { chunkCount: number; model: string } | null = null
  try {
    const item = {
      id: itemId,
      user_id: userId,
      title,
      summary: null,
      content,
      content_type: "note",
      current_version: 1
    } as KnowledgeItem
    const r = await embedItem(item, { userId })
    embed = { chunkCount: r.chunkCount, model: r.model }
  } catch (e) {
    console.warn(`[knowledge-save][u${userId}] embedding 失败:`, e)
  }

  return { itemId, embed }
}

// ============== 研究并沉淀入库 ==============

export interface ResearchIngestResult extends ResearchResult {
  itemId: number
  embed: { chunkCount: number; model: string } | null
}

/**
 * 完整闭环：研究 → 写入调用者的知识库 → 自动向量化。
 * 供 /api/knowledge/research 路由与 builtin-deep-research 工具共用。
 */
export async function researchAndIngest(
  topic: string,
  userId: number,
  options: ResearchOptions & { collectionId?: number | null } = {}
): Promise<ResearchIngestResult> {
  const result = await researchTopic(topic, options)

  const sourceMetadata = JSON.stringify({
    type: "deep_research",
    researched_at: Date.now(),
    sub_queries: result.subQueries,
    rounds: result.rounds,
    sources: result.sources
  })

  const itemId = await createItem({
    user_id: userId,
    title: result.title,
    content: result.content,
    content_type: "web_clip",
    collection_id: options.collectionId ?? null,
    source_url: result.sources[0]?.url ?? null,
    source_metadata: sourceMetadata,
    summary: result.summary || null,
    tags: ["AI研究"],
    embedding_status: "pending"
  })

  // 入库即向量化；失败不阻塞（embedding_status 已是 pending，可手动重试）
  let embed: { chunkCount: number; model: string } | null = null
  try {
    const item = {
      id: itemId,
      user_id: userId,
      title: result.title,
      summary: result.summary || null,
      content: result.content,
      content_type: "web_clip",
      current_version: 1
    } as KnowledgeItem
    const r = await embedItem(item, { userId })
    embed = { chunkCount: r.chunkCount, model: r.model }
  } catch (e) {
    console.warn(`[research][u${userId}] embedding 失败:`, e)
  }

  return { ...result, itemId, embed }
}
