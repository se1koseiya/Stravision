/**
 * 知识库检索服务
 *
 * 提供三种检索能力：
 * 1. 关键词搜索（PostgreSQL ILIKE + tsvector 全文）
 * 2. 语义搜索（向量余弦相似度）
 * 3. 混合搜索（关键词权重 0.4 + 语义权重 0.6，可配置）
 *
 * 同时提供：
 * - 查询日志记录
 * - 上下文窗口聚合
 * - 相关性评分
 */

import { query, queryOne, execute, initDB } from "../db/database"
import {
  generateEmbedding,
  cosineSimilarity,
  parseEmbeddingVector
} from "./embedding-service"
import {
  logQuery,
  listItems,
  getItem,
  type KnowledgeItem,
  type KnowledgeItemWithTags,
  type KnowledgeChunk
} from "../db/knowledge-service"
import { getKnowledgeConfig } from "./provider-resolver"

/**
 * 查询向量缓存：相同 query 文本在 TTL 内复用 embedding，避免每次语义搜索都调用远端 embedding API。
 * admin 配置变更不影响已缓存向量（向量仅依赖文本与模型），故 mtime 失效不必要。
 */
const queryEmbeddingCache = new Map<string, { vector: number[]; ts: number }>()
const QUERY_EMBEDDING_CACHE_TTL = 30 * 60 * 1000 // 30 分钟
const QUERY_EMBEDDING_CACHE_MAX = 200

async function getCachedQueryEmbedding(text: string): Promise<number[]> {
  // 截断作为缓存键，避免超长 query 占用过多内存
  const key = text.length > 500 ? text.slice(0, 500) : text
  const hit = queryEmbeddingCache.get(key)
  if (hit && Date.now() - hit.ts < QUERY_EMBEDDING_CACHE_TTL) {
    return hit.vector
  }
  const emb = await generateEmbedding(text)
  if (queryEmbeddingCache.size >= QUERY_EMBEDDING_CACHE_MAX) {
    const firstKey = queryEmbeddingCache.keys().next().value
    if (firstKey) queryEmbeddingCache.delete(firstKey)
  }
  queryEmbeddingCache.set(key, { vector: emb.vector, ts: Date.now() })
  return emb.vector
}

// ============== 类型定义 ==============

export type SearchMode = "keyword" | "semantic" | "hybrid"

export interface SearchOptions {
  mode?: SearchMode
  collectionId?: number | null
  contentType?: string
  tags?: string[]
  isFavorite?: boolean
  limit?: number
  offset?: number
  keywordWeight?: number
  semanticWeight?: number
  minScore?: number
  sessionId?: string
  /**
   * 是否包含用户已订阅的市场知识库 collection
   * - true（默认）：搜索范围 = 用户自己的 items + 已订阅的 market collection items
   * - false：只搜用户自己的 items
   * 当 collectionId 显式传入时，本选项被忽略（只在该 collection 范围内搜）
   */
  includeMarket?: boolean
}

export interface SearchHit {
  item: KnowledgeItemWithTags
  /** RRF 融合后的最终排序分 */
  score: number
  /** 关键词通道贡献的 RRF 分量（0 表示该通道未命中） */
  keywordScore: number
  /** 语义通道贡献的 RRF 分量（0 表示该通道未命中） */
  semanticScore: number
  /** 语义通道的原始余弦相似度，仅用于调试与阈值判断，不参与排序 */
  semanticCosine?: number
  /** Rerank 前的检索分（RRF），rerank 启用时保留便于排查排序变化 */
  retrievalScore?: number
  matchedChunk?: KnowledgeChunk
  matchedSnippet?: string
  highlights?: string[]
}

export interface SearchResult {
  query: string
  mode: SearchMode
  total: number
  hits: SearchHit[]
  logId?: number
  durationMs: number
}

// ============== 关键词搜索 ==============

/**
 * 关键词搜索：使用 PostgreSQL ILIKE 在 title/content/summary/tags 中匹配
 * 同时支持 tsvector 全文搜索（fallback）
 */
export async function keywordSearch(
  userId: number,
  queryText: string,
  options: Omit<SearchOptions, "mode" | "semanticWeight" | "keywordWeight"> = {}
): Promise<KnowledgeItemWithTags[]> {
  await initDB()
  const kc = await getKnowledgeConfig()
  const { collectionId, contentType, tags, isFavorite, limit = kc.search.maxCandidate, offset = 0, includeMarket = true } = options
  // 基础访问条件：用户自己的 items（当 includeMarket=true 时，扩展为「自己的 + 已订阅的 market collection items」）
  // 知识库市场采用虚拟订阅模型：market collection 的 items 仍归原 owner 所有，但已订阅用户可读
  // includeMarket=false 时排除所有市场 KB 条目（含 admin 自己创建的），保证个人知识库视图纯净
  const ownClause = "i.user_id = $1 AND NOT EXISTS (SELECT 1 FROM knowledge_collections c WHERE c.id = i.collection_id AND c.is_marketplace = 1)"
  const marketClause = "(i.user_id = $1 OR EXISTS (SELECT 1 FROM knowledge_market_subscriptions s WHERE s.user_id = $1 AND s.collection_id = i.collection_id))"
  const where: string[] = [includeMarket ? marketClause : ownClause, "i.is_archived = 0"]
  const params: any[] = [userId]
  const tokens = queryText.trim().split(/\s+/).filter(Boolean)

  if (tokens.length === 0) {
    return []
  }

  // 1) tsvector 全文匹配（如果可用）
  const fts = tokens.join(" & ")
  params.push(fts)
  const tsScore = `ts_rank(to_tsvector('simple', coalesce(i.title, '') || ' ' || coalesce(i.content, '') || ' ' || coalesce(i.summary, '')), to_tsquery('simple', $${params.length}))`
  // 2) ILIKE 模糊匹配
  const likeClauses: string[] = []
  for (const t of tokens) {
    params.push(`%${t}%`)
    const p = params.length
    likeClauses.push(`(i.title ILIKE $${p} OR i.content ILIKE $${p} OR i.summary ILIKE $${p} OR i.tags_cache ILIKE $${p})`)
  }

  if (collectionId !== undefined) {
    if (collectionId === null) where.push("i.collection_id IS NULL")
    else {
      params.push(collectionId)
      where.push(`i.collection_id = $${params.length}`)
    }
  }
  if (contentType) {
    params.push(contentType)
    where.push(`i.content_type = $${params.length}`)
  }
  if (isFavorite !== undefined) where.push(`i.is_favorite = ${isFavorite ? 1 : 0}`)
  if (tags && tags.length > 0) {
    params.push(tags)
    where.push(`EXISTS (
      SELECT 1 FROM knowledge_item_tags it
      JOIN knowledge_tags t ON t.id = it.tag_id
      WHERE it.item_id = i.id AND t.name = ANY($${params.length}::text[])
    )`)
  }

  const scoreExpr = `(${tsScore} * ${kc.search.tsVectorWeight} + (${likeClauses.join(" OR ")})::int)`
  params.push(limit, offset)
  const rows = await query<KnowledgeItem & { collection_name: string | null; kw_score: number }>(
    `SELECT i.*, c.name AS collection_name, ${scoreExpr} AS kw_score
     FROM knowledge_items i
     LEFT JOIN knowledge_collections c ON c.id = i.collection_id
     WHERE ${where.join(" AND ")}
       AND (${tsScore} > 0 OR ${likeClauses.join(" OR ")})
     ORDER BY kw_score DESC, i.updated_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )
  return rows.map(({ kw_score, ...rest }) => rest as KnowledgeItemWithTags)
}

// ============== 语义搜索 ==============

/**
 * 语义搜索：基于向量余弦相似度
 * 1. 生成查询向量
 * 2. 取出该用户所有 chunks 的向量（无向量化库时全量加载）
 * 3. 计算相似度，按 item 聚合最高分
 */
export async function semanticSearch(
  userId: number,
  queryText: string,
  options: Omit<SearchOptions, "mode" | "semanticWeight" | "keywordWeight"> = {}
): Promise<{ item: KnowledgeItem; score: number; matchedChunk: KnowledgeChunk }[]> {
  await initDB()
  const kc = await getKnowledgeConfig()
  const { collectionId, contentType, tags, isFavorite, limit = kc.search.maxCandidate, includeMarket = true } = options
  // 虚拟订阅：market collection 的 items 仍归原 owner 所有，但已订阅用户可读
  // includeMarket=false 时排除所有市场 KB 条目（含 admin 自己创建的），保证个人知识库视图纯净
  const ownClause = "i.user_id = $1 AND NOT EXISTS (SELECT 1 FROM knowledge_collections c WHERE c.id = i.collection_id AND c.is_marketplace = 1)"
  const marketClause = "(i.user_id = $1 OR EXISTS (SELECT 1 FROM knowledge_market_subscriptions s WHERE s.user_id = $1 AND s.collection_id = i.collection_id))"

  // 1) 生成查询 embedding（命中缓存可避免远端 HTTP 调用）
  const queryVec = await getCachedQueryEmbedding(queryText)

  // 2) 加载该用户所有 chunks（带 item 元数据过滤）
  const where: string[] = [includeMarket ? marketClause : ownClause, "i.is_archived = 0", "c.embedding IS NOT NULL"]
  const params: any[] = [userId]
  if (collectionId !== undefined) {
    if (collectionId === null) where.push("i.collection_id IS NULL")
    else {
      params.push(collectionId)
      where.push(`i.collection_id = $${params.length}`)
    }
  }
  if (contentType) {
    params.push(contentType)
    where.push(`i.content_type = $${params.length}`)
  }
  if (isFavorite !== undefined) where.push(`i.is_favorite = ${isFavorite ? 1 : 0}`)
  if (tags && tags.length > 0) {
    params.push(tags)
    where.push(`EXISTS (
      SELECT 1 FROM knowledge_item_tags it
      JOIN knowledge_tags t ON t.id = it.tag_id
      WHERE it.item_id = i.id AND t.name = ANY($${params.length}::text[])
    )`)
  }

  const chunks = await query<ChunkWithItem & { item_title: string; item_content_type: string; item_collection_id: number; item_summary: string; item_file_url: string; item_mime_type: string; item_user_id: number; item_is_favorite: number; item_access_level: string; item_current_version: number; item_view_count: number; item_search_count: number; item_tags_cache: string; item_archived: number; item_created_at: number; item_updated_at: number }>(
    `SELECT c.*, i.title AS item_title, i.content_type AS item_content_type, i.collection_id AS item_collection_id,
            i.summary AS item_summary, i.file_url AS item_file_url, i.mime_type AS item_mime_type,
            i.user_id AS item_user_id, i.is_favorite AS item_is_favorite, i.access_level AS item_access_level,
            i.current_version AS item_current_version, i.view_count AS item_view_count, i.search_count AS item_search_count,
            i.tags_cache AS item_tags_cache, i.is_archived AS item_archived, i.created_at AS item_created_at, i.updated_at AS item_updated_at
     FROM knowledge_chunks c
     JOIN knowledge_items i ON i.id = c.item_id
     WHERE ${where.join(" AND ")}`,
    params
  )

  // 3) 计算相似度并按 item 聚合
  type ChunkWithItem = KnowledgeChunk & {
    item_title: string
    item_content_type: string
    item_collection_id: number | null
    item_summary: string | null
    item_file_url: string | null
    item_mime_type: string | null
    item_user_id: number
    item_is_favorite: number
    item_access_level: string
    item_current_version: number
    item_view_count: number
    item_search_count: number
    item_tags_cache: string
    item_archived: number
    item_created_at: number
    item_updated_at: number
  }
  const itemScoreMap = new Map<number, { score: number; matchedChunk: ChunkWithItem }>()
  for (const c of chunks) {
    const vec = parseEmbeddingVector(c.embedding)
    if (!vec) continue
    const sim = cosineSimilarity(queryVec, vec)
    const existing = itemScoreMap.get(c.item_id)
    if (!existing || sim > existing.score) {
      itemScoreMap.set(c.item_id, { score: sim, matchedChunk: c })
    }
  }

  // 4) 排序并限制
  const top = Array.from(itemScoreMap.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)

  return top.map(([id, v]) => {
    const c = v.matchedChunk
    return {
      item: {
        id: c.item_id,
        user_id: c.item_user_id,
        collection_id: c.item_collection_id,
        title: c.item_title,
        content: c.content,
        content_type: c.item_content_type as any,
        file_url: c.item_file_url,
        file_size: 0,
        mime_type: c.item_mime_type,
        source_url: null,
        source_metadata: null,
        summary: c.item_summary,
        tags_cache: c.item_tags_cache,
        is_favorite: c.item_is_favorite as 0 | 1,
        is_archived: c.item_archived as 0 | 1,
        access_level: c.item_access_level as any,
        current_version: c.item_current_version,
        view_count: c.item_view_count,
        search_count: c.item_search_count,
        last_accessed_at: null,
        embedding_model: null,
        embedding_status: "ready" as const,
        created_at: c.item_created_at,
        updated_at: c.item_updated_at
      } as KnowledgeItem,
      score: v.score,
      matchedChunk: c
    }
  })
}

// ============== 混合搜索 ==============

/**
 * 混合搜索：关键词 + 语义，结果取并集并按加权分数排序
 * keywordWeight 默认 0.4，semanticWeight 默认 0.6
 */
export async function search(
  userId: number,
  queryText: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const start = Date.now()
  const kc = await getKnowledgeConfig()
  const mode: SearchMode = options.mode ?? "hybrid"
  const keywordWeight = options.keywordWeight ?? kc.search.hybridKeywordWeight
  const semanticWeight = options.semanticWeight ?? Math.max(0, 1 - kc.search.hybridKeywordWeight)
  const limit = options.limit ?? kc.search.defaultLimit
  const minScore = options.minScore ?? 0

  // 1) 记录查询
  // 🔥 性能优化：不在这里 await。DB 写入与下面的检索并行执行，
  // 省掉一次阻塞等待（这段在主 LLM 调用之前，直接贡献首字延迟）。
  // 真正需要 logId 时在「更新日志」处再 await。
  const logIdPromise = logQuery(userId, queryText, {
    sessionId: options.sessionId,
    queryType: mode,
    resultsCount: 0
  }).catch(() => undefined as number | undefined)

  // 2) 关键词 + 语义并行检索
  // 🔥 性能优化：原本两个 await 串行，等于多等一整轮 embedding API 往返
  // （semanticSearch 要把 query 向量化）。两者无依赖，改成 Promise.all。
  const [kwResults, semResults] = await Promise.all([
    (mode === "keyword" || mode === "hybrid")
      ? keywordSearch(userId, queryText, options)
      : Promise.resolve([]),
    (mode === "semantic" || mode === "hybrid")
      ? semanticSearch(userId, queryText, options)
      : Promise.resolve([]),
  ])

  // 4) RRF 融合（Reciprocal Rank Fusion）
  //
  // 旧实现把「关键词排名归一化分」与「语义余弦相似度」直接加权相加，量纲根本不一致：
  // 余弦集中在 0.7-0.9，而 rank 归一化分（1 - idx/len）会随候选集变大整体被稀释，
  // 两者相加在数学上没有意义，这正是排序时常显得莫名其妙的主因。
  // RRF 只消费「排名」、不消费「分数」，天然免疫量纲问题：
  //   score(d) = Σ  w_channel / (k + rank_channel(d))，k 取经验值 60
  const RRF_K = 60
  const hitMap = new Map<number, SearchHit>()

  // 关键词通道
  for (let idx = 0; idx < kwResults.length; idx++) {
    const item = kwResults[idx]
    const rrf = keywordWeight / (RRF_K + idx + 1)
    const existing = hitMap.get(item.id)
    if (existing) {
      existing.keywordScore = rrf
      existing.score += rrf
    } else {
      hitMap.set(item.id, {
        item,
        score: rrf,
        keywordScore: rrf,
        semanticScore: 0,
        highlights: await extractHighlights(queryText, item)
      })
    }
  }

  // 语义通道
  for (let idx = 0; idx < semResults.length; idx++) {
    const { item, score, matchedChunk } = semResults[idx]
    const rrf = semanticWeight / (RRF_K + idx + 1)
    const snippet = await makeSnippet(matchedChunk.content, queryText)
    const existing = hitMap.get(item.id)
    if (existing) {
      existing.semanticScore = rrf
      existing.semanticCosine = score
      existing.score += rrf
      existing.matchedChunk = matchedChunk
      existing.matchedSnippet = snippet
    } else {
      hitMap.set(item.id, {
        item: item as KnowledgeItemWithTags,
        score: rrf,
        keywordScore: 0,
        semanticScore: rrf,
        semanticCosine: score,
        matchedChunk,
        matchedSnippet: snippet,
        highlights: []
      })
    }
  }

  // 5) 排序 + 过滤
  //    注意：这里不能直接 slice(limit)。Rerank 的价值来自「过召回再精排」，
  //    如果候选池已经被截到 limit，rerank 看到的东西和最终返回的一样多，等于白跑。
  const rankedHits = Array.from(hitMap.values())
    .filter(h => h.score >= minScore)
    .sort((a, b) => b.score - a.score)

  const rerankEnabled = kc.glm.enableRerank && rankedHits.length > 1
  const candidatePoolSize = rerankEnabled
    ? Math.min(rankedHits.length, Math.max(limit, kc.glm.rerankTopN))
    : limit
  const candidates = rankedHits.slice(0, candidatePoolSize)

  // 5.5) 智谱 GLM Rerank：过召回 top-N 候选，按「查询-文档相关性」重新精排
  if (rerankEnabled) {
    try {
      const { callGLMRerank } = await import("./embedding-service")
      const { readProvidersConfig } = await import("./provider-resolver")
      const cfg = await readProvidersConfig()
      const ec = cfg.embeddingConfig
      const rerankProvider = ec?.enabled && ec.providerId
        ? cfg.providers.find(p => p.id === ec.providerId && p.apiKey)
        : cfg.providers.find(p => p.type === "glm" && p.apiKey)
      if (rerankProvider) {
        const topN = Math.min(candidates.length, kc.glm.rerankTopN)
        const toRerank = candidates.slice(0, topN)
        const rest = candidates.slice(topN)
        const docs = toRerank.map(h => h.matchedSnippet || h.matchedChunk?.content || h.item.summary || h.item.title)
        const rerankResults = await callGLMRerank({
          apiKey: rerankProvider.apiKey,
          query: queryText,
          documents: docs,
          topN: topN
        })
        if (rerankResults.length > 0) {
          // rerank 模型本身就是为「查询-文档相关性」训练的，直接用它的分数排序。
          // 旧实现把 rerank 分与检索分按 blend 混合，但两者差两个数量级
          // （rerank 分接近 0-1，RRF 分最大仅约 1/60），混合只会稀释 rerank 效果。
          const reranked = rerankResults
            .map(r => {
              const original = toRerank[r.index] ?? toRerank[0]
              if (!original) return null
              return {
                ...original,
                score: r.score,
                retrievalScore: original.score,
                matchedSnippet: r.document || original.matchedSnippet
              } as SearchHit
            })
            .filter((h): h is SearchHit => h !== null)
          candidates.length = 0
          // 未参与 rerank 的候选保持原 RRF 顺序，排在后
          candidates.push(...reranked, ...rest)
        }
      }
    } catch (e) {
      console.warn("[knowledge/search] GLM rerank skipped:", e)
    }
  }

  const hits = candidates.slice(0, limit)

  // 6) 更新日志（此处才 await 第 1 步的 DB 写入，此时检索早已完成，不再阻塞主流程）
  const logId = await logIdPromise
  if (logId) {
    await execute(
      `UPDATE knowledge_query_log SET results_count = $1 WHERE id = $2 AND user_id = $3`,
      [hits.length, logId, userId]
    )
  }

  return {
    query: queryText,
    mode,
    total: hits.length,
    hits,
    logId,
    durationMs: Date.now() - start
  }
}

// ============== 工具函数 ==============

/**
 * 从 item 中提取高亮片段（窗口长度走 config.search.highlightPadding / snippetMaxLen）
 */
async function extractHighlights(queryText: string, item: KnowledgeItemWithTags): Promise<string[]> {
  const kc = await getKnowledgeConfig()
  const tokens = queryText.trim().split(/\s+/).filter(Boolean)
  const source = `${item.title}\n${item.summary || ""}\n${item.content || ""}`.slice(0, kc.search.snippetMaxLen * kc.search.snippetWindowMultiplier)
  const highlights: string[] = []
  for (const t of tokens) {
    if (t.length < kc.search.minTokenLength) continue
    const idx = source.toLowerCase().indexOf(t.toLowerCase())
    if (idx >= 0) {
      const start = Math.max(0, idx - kc.search.highlightPadding)
      const end = Math.min(source.length, idx + t.length + kc.search.highlightPadding + kc.search.highlightTailLength)
      let snippet = source.slice(start, end).replace(/\n+/g, " ").trim()
      if (start > 0) snippet = "..." + snippet
      if (end < source.length) snippet = snippet + "..."
      highlights.push(snippet)
      if (highlights.length >= kc.search.maxHighlights) break
    }
  }
  return highlights
}

/**
 * 生成 chunk 摘要（窗口走 config.search.snippetPadding / snippetMaxLen）
 */
async function makeSnippet(content: string, queryText: string): Promise<string> {
  const kc = await getKnowledgeConfig()
  const tokens = queryText.trim().split(/\s+/).filter(t => t.length >= kc.search.minTokenLength)
  let idx = -1
  for (const t of tokens) {
    const i = content.toLowerCase().indexOf(t.toLowerCase())
    if (i >= 0) {
      idx = i
      break
    }
  }
  if (idx < 0) {
    return content.length > kc.search.snippetMaxLen ? content.slice(0, kc.search.snippetMaxLen) + "..." : content
  }
  const start = Math.max(0, idx - kc.search.snippetPadding.before)
  const end = Math.min(content.length, idx + kc.search.snippetPadding.after)
  let snippet = content.slice(start, end).replace(/\n+/g, " ").trim()
  if (start > 0) snippet = "..." + snippet
  if (end < content.length) snippet = snippet + "..."
  return snippet
}

// ============== 推荐 ==============

/**
 * 基于用户最近查询生成内容推荐
 * 1) 拉取用户最近 50 条查询
 * 2) 找出被点击的 items
 * 3) 推荐相同 collection 或同 tag 的其他 items
 */
export async function recommendFromHistory(userId: number, limit?: number): Promise<KnowledgeItemWithTags[]> {
  await initDB()
  const kc = await getKnowledgeConfig()
  const maxResults = limit ?? kc.search.recommendMaxResults
  // 1) 拉最近点击过的 items
  // 注意：原 SQL 用 SELECT DISTINCT ... ORDER BY created_at DESC 会报错
  // （DISTINCT 要求 ORDER BY 字段出现在 SELECT 列表中）。
  // 改用 GROUP BY clicked_item_id + ORDER BY MAX(created_at) DESC，
  // 既去重又按"最近一次点击时间"倒序取 top N。
  const recentClicked = await query<{ item_id: number }>(
    `SELECT clicked_item_id AS item_id
     FROM knowledge_query_log
     WHERE user_id = $1 AND clicked_item_id IS NOT NULL
     GROUP BY clicked_item_id
     ORDER BY MAX(created_at) DESC
     LIMIT $2`,
    [userId, kc.search.recommendHistoryLimit]
  )
  if (recentClicked.length === 0) {
    // 没有历史：返回最近更新的 items
    return listItems(userId, { limit: maxResults, orderBy: "updated_at", orderDir: "DESC" }).then(r => r.items)
  }
  const clickedIds = recentClicked.map(r => r.item_id)

  // 2) 找相同 collection / 相同 tag 的 items
  const collections = await query<{ collection_id: number | null }>(
    `SELECT DISTINCT collection_id FROM knowledge_items WHERE id = ANY($1::bigint[])`,
    [clickedIds]
  )
  const collectionIds = collections.map(c => c.collection_id).filter((c): c is number => c !== null)

  const tags = await query<{ name: string }>(
    `SELECT DISTINCT t.name FROM knowledge_item_tags it
     JOIN knowledge_tags t ON t.id = it.tag_id
     WHERE it.item_id = ANY($1::bigint[])`,
    [clickedIds]
  )
  const tagNames = tags.map(t => t.name)

  // 3) 合并去重（候选条目数走 admin knowledgeConfig.search.recommendCandidateMultiplier）
  const recommended = await listItems(userId, {
    limit: maxResults * kc.search.recommendCandidateMultiplier,
    orderBy: "updated_at",
    orderDir: "DESC"
  })
  const filtered = recommended.items.filter(item => {
    if (clickedIds.includes(item.id)) return false
    if (collectionIds.length > 0 && item.collection_id && collectionIds.includes(item.collection_id)) return true
    if (tagNames.length > 0 && item.tags.some(t => tagNames.includes(t))) return true
    return false
  })
  return filtered.slice(0, maxResults)
}

/**
 * 基于内容相似度的推荐（查找与指定 item 相似的其他 items）
 * 默认 limit 走 admin knowledgeConfig.search.similarDefaultLimit
 */
export async function recommendSimilar(
  userId: number,
  itemId: number,
  limit?: number
): Promise<KnowledgeItemWithTags[]> {
  const kc = await getKnowledgeConfig()
  const effectiveLimit = limit ?? kc.search.similarDefaultLimit
  const baseItem = await getItem(itemId, userId, false)
  if (!baseItem) return []
  const results = await semanticSearch(userId, baseItem.title + "\n" + (baseItem.summary || ""), {
    limit: effectiveLimit + 1
  })
  return results
    .filter(r => r.item.id !== itemId)
    .slice(0, effectiveLimit)
    .map(r => r.item as KnowledgeItemWithTags)
}

// ============== 关联上下文 ==============

/**
 * 获取与查询相关的知识上下文（供 AI 助手引用）
 * 返回结构化的 chunk 列表，每条带来源 item 信息
 */
export async function getRelevantContext(
  userId: number,
  queryText: string,
  options: { maxChunks?: number; maxChunkLength?: number; collectionId?: number | null; includeMarket?: boolean } = {}
): Promise<Array<{ itemId: number; itemTitle: string; content: string; chunkIndex: number; score: number; source: "keyword" | "semantic" }>> {
  const kc = await getKnowledgeConfig()
  const maxChunks = options.maxChunks ?? kc.ui.contextMaxChunks
  const maxChunkLength = options.maxChunkLength ?? kc.ui.contextMaxChunkLength
  // 锁定到具体 collection 时（用户显式 /<name> 或 KB 详情页 lockedCollectionId），
  // 只在该 collection 范围内检索，避免无关 KB 干扰
  const result = await search(userId, queryText, {
    limit: maxChunks * kc.search.requestOvershootMultiplier,
    mode: "hybrid",
    collectionId: options.collectionId,
    includeMarket: options.includeMarket
  })
  const ctx: Array<{ itemId: number; itemTitle: string; content: string; chunkIndex: number; score: number; source: "keyword" | "semantic" }> = []
  for (const h of result.hits) {
    if (ctx.length >= maxChunks) break
    if (h.matchedChunk) {
      const text = h.matchedChunk.content.length > maxChunkLength
        ? h.matchedChunk.content.slice(0, maxChunkLength) + "..."
        : h.matchedChunk.content
      ctx.push({
        itemId: h.item.id,
        itemTitle: h.item.title,
        content: text,
        chunkIndex: h.matchedChunk.chunk_index,
        score: h.score,
        source: h.semanticScore > h.keywordScore ? "semantic" : "keyword"
      })
    } else if (h.item.content) {
      const text = h.item.content.length > maxChunkLength
        ? h.item.content.slice(0, maxChunkLength) + "..."
        : h.item.content
      ctx.push({
        itemId: h.item.id,
        itemTitle: h.item.title,
        content: text,
        chunkIndex: 0,
        score: h.score,
        source: "keyword"
      })
    }
  }
  return ctx
}
