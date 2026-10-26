/**
 * 联网检索服务（协议可插拔，由 admin 后台 webSearchConfig.protocol 决定）：
 *
 * - zhipu（默认）：智谱 Web Search API，整合自研引擎 + 搜狗/夸克，国内服务器直连无障碍，
 *   复用现有 GLM provider 凭据，返回结构化结果（标题 / URL / 摘要 / 来源站点 / 发布时间）。
 * - exa：Exa Search 官方 API（api.exa.ai），语义检索质量高、有免费额度，x-api-key 鉴权，
 *   contents.text 直接带回正文片段，深度研究场景可省一次网页抓取。
 * - anysearch：AnySearch 远程 MCP，免 Key 匿名可用。
 * - local：内置本地引擎（lib/ai/local-search-engine.ts），进程内聚合 Bing / 360 / DuckDuckGo，
 *   零 Key、零外部服务，桌面端开箱默认走这条。
 *
 * 之所以不套用 jina-ai/node-DeepResearch 那套（Jina Reader + Gemini）：
 * 一是国内访问不稳定，二是协议分派点留在本服务内，后续接 Tavily/Brave 等只需再加分支。
 *
 * 同时提供正文抓取（HTML → 纯文本），供研究循环的「Read」阶段使用。
 */

import { resolveWebSearchProvider, type WebSearchProtocol } from "./provider-resolver"
import { remoteMcpToolCall } from "../mcp/remote-mcp-client"
import { localWebSearch } from "./local-search-engine"

// ============== 类型 ==============

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  siteName: string
  publishDate?: string
  icon?: string
  /** 作者（仅 Exa 协议返回） */
  author?: string
  /** 正文全文，仅在 fetchFullText=true 且抓取成功时有值 */
  fullText?: string
}

/**
 * 智谱协议搜索引擎：
 * - search_std       基础版
 * - search_pro       高级版（智谱自研）
 * - search_pro_sogou 搜狗
 * - search_pro_quark 夸克
 */
export type SearchEngine = "search_std" | "search_pro" | "search_pro_sogou" | "search_pro_quark"

/** Exa 协议检索类型：auto 自动 / neural 语义 / keyword 关键词 */
export type ExaSearchType = "auto" | "neural" | "keyword"

export interface WebSearchOptions {
  /** 返回条数 1-50，默认 8 */
  count?: number
  /** 智谱：search_std/pro/pro_sogou/pro_quark；Exa：auto/neural/keyword（传智谱值时按 auto 处理） */
  engine?: SearchEngine | ExaSearchType
  recency?: "noLimit" | "day" | "week" | "month" | "year"
  /** 限定域名，如 www.sohu.com（仅智谱协议支持） */
  domainFilter?: string
  /** 摘要长度，high 更适合直接给 LLM 做融合 */
  contentSize?: "low" | "medium" | "high"
  signal?: AbortSignal
  /** 是否顺带抓取正文全文，默认 false（只拿摘要，省时省 token；Exa 协议由 contents.text 直接返回，无需二次抓取） */
  fetchFullText?: boolean
  maxFullTextChars?: number
}

const DEFAULT_BASE = "https://open.bigmodel.cn/api/paas/v4"
const DEFAULT_EXA_BASE = "https://api.exa.ai"

interface SearchCredentials {
  base: string
  apiKey: string
  /** 搜索协议，决定走智谱 Web Search 还是 Exa 官方 API */
  protocol: WebSearchProtocol
  /** admin 指定的默认引擎/检索类型 */
  engine?: string
  /** admin 指定的默认条数 */
  defaultCount?: number
}

// ============== 凭据解析 ==============

let credCache: { value: SearchCredentials | null; ts: number } | null = null
const CRED_TTL = 5 * 60 * 1000

/** 把 provider 的 baseUrl 归一成 Web Search 的 base（去掉 /chat/completions 等后缀） */
function normalizeSearchBase(raw?: string): string {
  let s = (raw || "").trim().replace(/\/+$/, "")
  if (!s || !/^https?:\/\//.test(s)) return DEFAULT_BASE
  s = s
    .replace(/\/chat\/completions$/, "")
    .replace(/\/embeddings$/, "")
    .replace(/\/rerank$/, "")
    .replace(/\/web_search$/, "")
  return s || DEFAULT_BASE
}

/** 把 provider 的 baseUrl 归一成 Exa 的 base（去掉 /search 后缀；空/非法时用官方端点，兼容代理） */
function normalizeExaBase(raw?: string): string {
  let s = (raw || "").trim().replace(/\/+$/, "")
  if (!s || !/^https?:\/\//.test(s)) return DEFAULT_EXA_BASE
  s = s.replace(/\/search$/, "")
  return s || DEFAULT_EXA_BASE
}

/**
 * 解析联网检索凭据。核心解析逻辑在 provider-resolver.resolveWebSearchProvider：
 * admin 后台 webSearchConfig 指定的 provider（不限类型）→ GLM provider → 环境变量。
 * 协议（zhipu/exa）由 admin 配置决定，这里只做 base 归一与缓存。
 */
async function resolveCredentials(): Promise<SearchCredentials | null> {
  if (credCache && Date.now() - credCache.ts < CRED_TTL) return credCache.value

  let value: SearchCredentials | null = null
  try {
    const resolved = await resolveWebSearchProvider()
    // anysearch 免 Key 匿名可用、local 进程内聚合，apiKey 均可为空
    if (resolved && (resolved.apiKey || resolved.protocol === "anysearch" || resolved.protocol === "local")) {
      const protocol = resolved.protocol
      value = {
        base:
          protocol === "exa"
            ? normalizeExaBase(resolved.baseUrl)
            : protocol === "anysearch"
              ? "https://api.anysearch.com/mcp"
              : protocol === "local"
                ? "local"
                : normalizeSearchBase(resolved.baseUrl),
        apiKey: resolved.apiKey || "",
        protocol,
        engine: resolved.engine,
        defaultCount: resolved.defaultCount
      }
    }
  } catch {
    /* 解析失败按不可用处理 */
  }

  credCache = { value, ts: Date.now() }
  return value
}

export function invalidateWebSearchCredentials(): void {
  credCache = null
}

/** 供上层判断是否可用（未配置则研究循环应直接跳过联网阶段） */
export async function isWebSearchAvailable(): Promise<boolean> {
  return (await resolveCredentials()) !== null
}

// ============== 检索 ==============

/**
 * 执行一次联网检索（按 admin 配置的协议分派：智谱 Web Search / Exa）
 */
export async function webSearch(query: string, options: WebSearchOptions = {}): Promise<WebSearchResult[]> {
  const q = (query || "").trim()
  if (!q) return []

  const creds = await resolveCredentials()
  if (!creds) {
    console.warn("[web-search] 未配置搜索 provider（webSearchConfig / GLM / 环境变量均缺失），跳过联网检索")
    return []
  }

  const results =
    creds.protocol === "exa"
      ? await searchExa(q, creds, options)
      : creds.protocol === "anysearch"
        ? await searchAnySearch(q, creds, options)
        : creds.protocol === "local"
          ? await searchLocal(q, creds, options)
          : await searchZhipu(q, creds, options)

  if (options.fetchFullText && results.length > 0) {
    await Promise.all(
      results.map(async r => {
        if (r.fullText) return // Exa 的 contents.text 已带正文，无需二次抓取
        const text = await fetchPageText(r.url, options.maxFullTextChars ?? 6000, options.signal)
        if (text) r.fullText = text
      })
    )
  }

  return results
}

/** 智谱 Web Search 协议（/web_search 端点，Bearer 鉴权，自研引擎 + 搜狗/夸克） */
async function searchZhipu(q: string, creds: SearchCredentials, options: WebSearchOptions): Promise<WebSearchResult[]> {
  const body: Record<string, unknown> = {
    // 调用方 > admin webSearchConfig > 内置默认
    search_engine: options.engine ?? creds.engine ?? "search_pro_sogou",
    search_query: q,
    count: Math.min(Math.max(options.count ?? creds.defaultCount ?? 8, 1), 50),
    content_size: options.contentSize ?? "high"
  }
  if (options.recency) body.search_recency_filter = options.recency
  if (options.domainFilter) body.search_domain_filter = options.domainFilter

  const res = await fetch(`${creds.base}/web_search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${creds.apiKey}`
    },
    body: JSON.stringify(body),
    signal: options.signal
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`联网检索失败 ${res.status}: ${detail.slice(0, 200)}`)
  }

  const data: any = await res.json()
  const raw: any[] = Array.isArray(data?.search_result) ? data.search_result : []

  return raw
    .map(r => ({
      title: String(r?.title ?? "").trim(),
      url: String(r?.link ?? "").trim(),
      snippet: String(r?.content ?? "").trim(),
      siteName: String(r?.media ?? "").trim(),
      publishDate: r?.publish_date ? String(r.publish_date) : undefined,
      icon: r?.icon ? String(r.icon) : undefined
    }))
    .filter(r => r.url && (r.title || r.snippet))
}

/** Exa 官方 API（POST /search，x-api-key 鉴权；contents.text 直接带回正文，省一次抓取） */
async function searchExa(q: string, creds: SearchCredentials, options: WebSearchOptions): Promise<WebSearchResult[]> {
  const count = Math.min(Math.max(options.count ?? creds.defaultCount ?? 8, 1), 50)

  // 引擎映射：调用方/admin 的 auto/neural/keyword 直接用；误传智谱值时按 auto 兜底
  const rawEngine = options.engine ?? creds.engine
  const exaType: ExaSearchType =
    rawEngine === "neural" || rawEngine === "keyword" ? rawEngine : "auto"

  // contentSize → Exa 正文截断长度：low 省 token，high 便于直接给 LLM 融合
  const textMaxChars = options.contentSize === "low" ? 500 : options.contentSize === "medium" ? 1500 : 3000

  const body: Record<string, unknown> = {
    query: q,
    numResults: count,
    type: exaType,
    contents: { text: { maxCharacters: textMaxChars } }
  }
  // Exa 支持 startPublishedDate / includeDomains，做一层近似映射
  if (options.domainFilter) body.includeDomains = [options.domainFilter.replace(/^https?:\/\//, "")]
  if (options.recency === "day" || options.recency === "week" || options.recency === "month" || options.recency === "year") {
    const days = { day: 1, week: 7, month: 30, year: 365 }[options.recency]
    body.startPublishedDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  }

  const res = await fetch(`${creds.base}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": creds.apiKey,
      Authorization: `Bearer ${creds.apiKey}`
    },
    body: JSON.stringify(body),
    signal: options.signal
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Exa 检索失败 ${res.status}: ${detail.slice(0, 200)}`)
  }

  const data: any = await res.json()
  const raw: any[] = Array.isArray(data?.results) ? data.results : []

  return raw
    .map(r => {
      const url = String(r?.url ?? "").trim()
      const highlights = Array.isArray(r?.highlights) ? r.highlights.filter(Boolean).join(" ... ") : ""
      const snippet = String(r?.text ?? "").trim() || highlights
      let siteName = ""
      try {
        siteName = new URL(url).hostname
      } catch {
        /* 非法 url 交给下面的 filter 剔除 */
      }
      return {
        title: String(r?.title ?? "").trim(),
        url,
        snippet,
        siteName,
        publishDate: r?.publishedDate ? String(r.publishedDate).slice(0, 10) : undefined,
        author: r?.author ? String(r.author) : undefined
      }
    })
    .filter(r => r.url && (r.title || r.snippet))
    .map(r => ({ ...r, fullText: r.snippet || undefined }))
}

/**
 * 内置本地引擎协议：进程内聚合 Bing / 360 / DuckDuckGo。
 * 不需要 provider、不需要 Key、不依赖任何外部服务进程 —— 桌面端开箱默认走这条。
 */
async function searchLocal(q: string, creds: SearchCredentials, options: WebSearchOptions): Promise<WebSearchResult[]> {
  const count = Math.min(Math.max(options.count ?? creds.defaultCount ?? 8, 1), 20)
  return localWebSearch(q, {
    count,
    engine: options.engine ?? creds.engine,
    signal: options.signal
  })
}

/**
 * AnySearch 协议（远程 MCP，tools/call search；免 Key 匿名可用）
 * MCP 返回的是 text 内容（通常为 Markdown），需解析出标题/链接/摘要
 */
async function searchAnySearch(q: string, creds: SearchCredentials, options: WebSearchOptions): Promise<WebSearchResult[]> {
  const count = Math.min(Math.max(options.count ?? creds.defaultCount ?? 8, 1), 10)
  const r = await remoteMcpToolCall(
    creds.base, // https://api.anysearch.com/mcp
    "search",
    { query: q, max_results: count },
    {
      apiKey: creds.apiKey || undefined,
      extraHeaders: { "X-Anysearch-Client": "mcp/1.0.0" },
      timeoutMs: 45000,
      signal: options.signal
    }
  )
  return parseAnySearchResults(r.text)
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ""
  }
}

/**
 * 解析 AnySearch MCP 的 text 返回为结构化结果：
 * 1) JSON 数组（若有） 2) Markdown 链接 [title](url) 3) 裸 URL 兜底
 */
function parseAnySearchResults(text: string): WebSearchResult[] {
  const trimmed = (text || "").trim()
  if (!trimmed) return []

  // 1) JSON 形态
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed)
      const items: any[] = Array.isArray(parsed)
        ? parsed
        : parsed?.results || parsed?.data || []
      const out: WebSearchResult[] = []
      for (const it of items) {
        const url = String(it?.url || it?.link || "").trim()
        if (!url) continue
        out.push({
          title: String(it?.title || "").trim(),
          url,
          snippet: String(it?.snippet || it?.content || it?.description || "").trim(),
          siteName: String(it?.site || it?.siteName || "").trim() || hostOf(url),
          publishDate: it?.publishedDate || it?.publish_date || undefined
        })
      }
      if (out.length > 0) return out
    } catch { /* 落到 Markdown 解析 */ }
  }

  // 2) Markdown 链接
  const lines = trimmed.split("\n")
  const linkRe = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g
  const seen = new Set<string>()
  const out: WebSearchResult[] = []
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(trimmed)) !== null) {
    const url = m[2].replace(/[).,]+$/, "")
    const key = url.replace(/[#?].*$/, "")
    if (seen.has(key)) continue
    seen.add(key)
    const line = lines.find(l => l.includes(m![2])) || ""
    const snippet = line
      .replace(linkRe, "")
      .replace(/[*_#>`-]/g, "")
      .trim()
      .slice(0, 300)
    out.push({
      title: (m[1] || "").trim() || hostOf(url),
      url,
      snippet,
      siteName: hostOf(url)
    })
  }
  if (out.length > 0) return out

  // 3) 裸 URL 兜底
  const urlRe = /(https?:\/\/[^\s)<>"']+)/g
  let u: RegExpExecArray | null
  while ((u = urlRe.exec(trimmed)) !== null) {
    const url = u[1]
    const key = url.replace(/[#?].*$/, "")
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      title: hostOf(url),
      url,
      snippet: trimmed.slice(Math.max(0, u.index - 100), u.index + 200).replace(/\s+/g, " ").trim(),
      siteName: hostOf(url)
    })
  }
  return out
}

// ============== 正文抓取 ==============

/**
 * 抓取网页正文（HTML → 纯文本）
 * 不引额外依赖：先剔除 script/style/nav/footer 等噪声块，再按块级标签换行，最后反转义。
 */
export async function fetchPageText(
  url: string,
  maxChars = 6000,
  signal?: AbortSignal
): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      signal: signal ?? AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; StravisionBot/1.0; +https://stravision.site)",
        Accept: "text/html,application/xhtml+xml,text/plain"
      },
      redirect: "follow"
    })
    if (!res.ok) return undefined
    const contentType = res.headers.get("content-type") || ""
    if (!/text\/html|text\/plain|application\/xhtml/i.test(contentType)) return undefined
    return htmlToText(await res.text(), maxChars)
  } catch {
    return undefined
  }
}

/** 极简 HTML → 纯文本，够用于给 LLM 做素材 */
export function htmlToText(html: string, maxChars = 6000): string {
  let s = html
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ")
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ")
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, " ")
  s = s.replace(/<nav[\s\S]*?<\/nav>/gi, " ")
  s = s.replace(/<footer[\s\S]*?<\/footer>/gi, " ")
  s = s.replace(/<!--[\s\S]*?-->/g, " ")
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|blockquote|section|article)>/gi, "\n")
  s = s.replace(/<br\s*\/?>/gi, "\n")
  s = s.replace(/<[^>]+>/g, " ")
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  s = s.replace(/[ \t\u00a0]+/g, " ")
  s = s.replace(/\n{3,}/g, "\n\n")
  s = s
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .join("\n")
    .trim()
  return s.length > maxChars ? s.slice(0, maxChars) + "..." : s
}
