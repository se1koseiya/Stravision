/**
 * 内置本地搜索引擎（零 Key / 零外部服务 / 零端口）
 *
 * 为什么不用 SearXNG：
 *   SearXNG 依赖 Python + Docker，Electron 安装包塞不进去，桌面端无法「装完即用」。
 *   这里直接在 app-server 进程内做多引擎聚合，与 web-search-service 同生命周期，
 *   不需要额外进程、端口、编排文件。同一份代码在 Web 部署上也能作为兜底。
 *
 * 为什么抓 HTML 而不是走官方 API：
 *   国内可用且免 Key 的搜索 API 基本没有；而桌面端跑在用户住宅 IP 上，
 *   被风控的概率远低于云服务器出口，抓取形态反而更稳定。
 *
 * 引擎选型原则：**只留能还原成真实 URL 的引擎**。
 *   - Bing：结果页 href 是 /ck/a?...&u=a1<base64url>，可解码出原始地址 ✅
 *   - 360：多数结果为直链，部分带 data-mdurl 可兜底 ✅
 *   - DuckDuckGo：/l/?uddg=<urlencoded>，可解码 ✅
 *   - 搜狗 / 百度：/link?url=... 必须带会话 Cookie 才能 302 到真实地址，
 *     拿不到就只剩一个打不开的跳转链接，干脆不接 ❌
 *
 * 容错：任一引擎失败只记警告并跳过，全部失败才返回空；结果 5 分钟内缓存。
 */

import type { WebSearchResult } from "./web-search-service"

export type LocalEngineId = "bing" | "so360" | "ddg"

export interface LocalSearchOptions {
  /** 返回条数，默认 8，上限 30 */
  count?: number
  /** 指定单一引擎（bing / so360 / ddg）；留空或未知值则三引擎并发 */
  engine?: string
  signal?: AbortSignal
}

/** Bing 国内站：中文结果覆盖最好，且 href 可解码 */
const BING_URL = (q: string) => `https://cn.bing.com/search?q=${encodeURIComponent(q)}&ensearch=0`
/** 360 搜索：无 Referer / Cookie 依赖 */
const SO360_URL = (q: string) => `https://www.so.com/s?q=${encodeURIComponent(q)}`
/** DuckDuckGo HTML 版：无 JS，结果链接可解包；国内网络可能不可达，失败即跳过 */
const DDG_URL = (q: string) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=cn-zh`

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  Pragma: "no-cache"
}

const ENGINE_TIMEOUT_MS = 6000
/**
 * 国内网络下 DuckDuckGo 基本不可达（实测稳定超时）。
 * 给它更短的超时：失败可以接受，但绝不允许它把整次检索拖长到 8 秒。
 */
const DDG_TIMEOUT_MS = 3500
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_MAX = 100

// ============== 文本处理 ==============

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => {
      const code = Number(d)
      return Number.isFinite(code) && code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : ""
    })
    // &amp; 最后解，避免 "&amp;lt;" 被二次解码成标签
    .replace(/&amp;/g, "&")
}

/** HTML 片段 → 纯文本（去标签、反转义、压空白） */
function plain(html: string): string {
  if (!html) return ""
  const text = decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
  // 搜索页会把命中的关键词用 <strong>/<em> 包起来，去标签后中文会被切成「草莓 白粉病 防治」。
  // 中文词之间本来没有空格，这里把「两个汉字之间的空白」全部吃掉（英文单词边界不受影响）。
  return text.replace(/([\u4e00-\u9fa5])\s+(?=[\u4e00-\u9fa5])/g, "$1")
}

/** 取第一个匹配中「最后一个捕获组」的纯文本；无匹配返回空串 */
function textOf(block: string, re: RegExp): string {
  const m = block.match(re)
  if (!m || m.length === 0) return ""
  return plain(m[m.length - 1] ?? "")
}

// ============== 结构切分 ==============

/**
 * 按「结果块起始标记」把整页 HTML 切成若干块。
 * 用「起点到下一个起点」切片，而不是靠闭合标签：
 * 搜索结果页的 <li>/<div> 嵌套很深，靠 </li> 配对几乎必错。
 */
function eachBlock(html: string, startRe: RegExp): string[] {
  const re = new RegExp(startRe.source, startRe.flags.includes("g") ? startRe.flags : startRe.flags + "g")
  const starts: number[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    starts.push(m.index)
    if (m[0].length === 0) re.lastIndex += 1
  }
  if (starts.length === 0) return []
  return starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : Math.min(html.length, start + 8000)
    return html.slice(start, end)
  })
}

interface Anchor {
  href: string
  text: string
  cls: string
}

/**
 * 抽出块内所有 <a>，返回 href / 文本 / class。
 * 比「一条大正则同时匹配 href 和文本」稳得多：属性顺序、换行、额外属性都不影响。
 */
function findAnchors(block: string): Anchor[] {
  const out: Anchor[] = []
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(block)) !== null) {
    const attrs = m[1]
    const href =
      (attrs.match(/href\s*=\s*"([^"]*)"/i) || attrs.match(/href\s*=\s*'([^']*)'/i) || [])[1] || ""
    const cls = (attrs.match(/class\s*=\s*"([^"]*)"/i) || attrs.match(/class\s*=\s*'([^']*)'/i) || [])[1] || ""
    out.push({ href: decodeEntities(href).trim(), text: plain(m[2]), cls })
  }
  return out
}

/** 块内第一个带指定 class 关键词的锚点 */
function anchorByClass(block: string, keyword: string): Anchor | undefined {
  return findAnchors(block).find(a => a.cls.toLowerCase().includes(keyword))
}

// ============== URL 解包 ==============

/** 只接受 http(s) 绝对地址，其余视为不可用 */
function isHttpUrl(u: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(u)
}

/**
 * Bing 结果链接是 /ck/a?...&u=a1<base64url(原始URL)>
 * a1 前缀表示「base64url 编码的绝对地址」，a1 之后才是载荷。
 */
function unwrapBingUrl(href: string): string {
  if (isHttpUrl(href) && !/[?&]u=a1[\w-]/.test(href)) return href
  const m = href.match(/[?&]u=a1([\w-]+)/)
  if (m) {
    try {
      const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/")
      const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4)
      const decoded = Buffer.from(padded, "base64").toString("utf8")
      if (isHttpUrl(decoded)) return decoded
    } catch {
      /* 落到原 href */
    }
  }
  return href
}

/** DuckDuckGo 结果链接是 //duckduckgo.com/l/?uddg=<urlencoded> */
function unwrapDdgUrl(href: string): string {
  const m = href.match(/[?&]uddg=([^&]+)/)
  if (m) {
    try {
      const decoded = decodeURIComponent(m[1])
      if (isHttpUrl(decoded)) return decoded
    } catch {
      /* 落到原 href */
    }
  }
  const abs = href.startsWith("//") ? `https:${href}` : href
  return abs
}

/** 360 的 /link?m=... 跳转拿不到真实地址，优先用块内 data-mdurl 直链 */
function unwrapSo360Url(href: string, block: string): string {
  if (isHttpUrl(href) && !/^https?:\/\/www\.so\.com\/link/i.test(href)) return href
  const md = block.match(/data-mdurl\s*=\s*"([^"]+)"/i) || block.match(/data-url\s*=\s*"([^"]+)"/i)
  if (md) {
    const u = decodeEntities(md[1]).trim()
    if (isHttpUrl(u)) return u
  }
  return href.startsWith("/") ? `https://www.so.com${href}` : href
}

// ============== 引擎定义 ==============

interface EngineSpec {
  id: LocalEngineId
  label: string
  buildUrl: (q: string) => string
  /** 结果块起始标记 */
  splitRe: RegExp
  /** 单引擎超时；国内不可达的引擎给更短的值，别拖累整体延迟 */
  timeoutMs: number
  /** 从块中解析出 标题锚点 + 摘要 */
  parse: (block: string) => { url: string; title: string; snippet: string } | null
}

const ENGINES: EngineSpec[] = [
  {
    id: "bing",
    label: "Bing",
    buildUrl: BING_URL,
    splitRe: /<li class="b_algo"/i,
    timeoutMs: ENGINE_TIMEOUT_MS,
    parse: block => {
      const h2 = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
      const anchors = h2 ? findAnchors(h2[1]) : findAnchors(block)
      const a = anchors.find(x => x.href && x.text) || anchors[0]
      if (!a || !a.text) return null
      const snippet =
        textOf(block, /<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
        textOf(block, /<div[^>]*class="[^"]*b_caption[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) ||
        textOf(block, /<p[^>]*>([\s\S]*?)<\/p>/i)
      return { url: unwrapBingUrl(a.href), title: a.text, snippet }
    }
  },
  {
    id: "so360",
    label: "360 搜索",
    buildUrl: SO360_URL,
    splitRe: /<li class="res-list/i,
    timeoutMs: ENGINE_TIMEOUT_MS,
    parse: block => {
      const h3 = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
      const anchors = h3 ? findAnchors(h3[1]) : findAnchors(block)
      const a = anchors.find(x => x.href && x.text) || anchors[0]
      if (!a || !a.text) return null
      const snippet =
        textOf(block, /<p[^>]*class="[^"]*res-desc[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
        textOf(block, /<div[^>]*class="[^"]*res-desc[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
        textOf(block, /<p[^>]*>([\s\S]*?)<\/p>/i)
      return { url: unwrapSo360Url(a.href, block), title: a.text, snippet }
    }
  },
  {
    id: "ddg",
    label: "DuckDuckGo",
    buildUrl: DDG_URL,
    splitRe: /<div class="result\s+results_links/i,
    timeoutMs: DDG_TIMEOUT_MS,
    parse: block => {
      const titleA = anchorByClass(block, "result__a")
      const href = titleA?.href || ""
      const title = titleA?.text || ""
      if (!href || !title) return null
      const snipA = anchorByClass(block, "result__snippet")
      const snippet =
        snipA?.text ||
        textOf(block, /<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      return { url: unwrapDdgUrl(href), title, snippet }
    }
  }
]

// ============== 抓取 ==============

/** 组合外部 signal 与单引擎超时 */
function withTimeout(outer: AbortSignal | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(ms)
  const anyFn = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any
  if (!outer) return timeout
  return typeof anyFn === "function" ? anyFn([outer, timeout]) : outer
}

interface EngineOutcome {
  engine: LocalEngineId
  hits: WebSearchResult[]
  error?: string
}

async function runEngine(spec: EngineSpec, query: string, signal?: AbortSignal): Promise<EngineOutcome> {
  try {
    const res = await fetch(spec.buildUrl(query), {
      method: "GET",
      headers: { ...BROWSER_HEADERS, Referer: `https://${new URL(spec.buildUrl(query)).hostname}/` },
      redirect: "follow",
      signal: withTimeout(signal, spec.timeoutMs)
    })
    if (!res.ok) {
      return { engine: spec.id, hits: [], error: `HTTP ${res.status}` }
    }
    const html = await res.text()
    const hits: WebSearchResult[] = []
    for (const block of eachBlock(html, spec.splitRe)) {
      const parsed = spec.parse(block)
      if (!parsed) continue
      const url = parsed.url
      if (!isHttpUrl(url)) continue
      if (!parsed.title && !parsed.snippet) continue
      hits.push({
        title: parsed.title,
        url,
        snippet: parsed.snippet,
        siteName: hostOf(url)
      })
      if (hits.length >= 20) break
    }
    return { engine: spec.id, hits }
  } catch (e) {
    return { engine: spec.id, hits: [], error: e instanceof Error ? e.message : String(e) }
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

// ============== 合并去重 ==============

/** 去重键：忽略协议、大小写、尾斜杠、hash 与常见追踪参数 */
function dedupeKey(url: string): string {
  try {
    const u = new URL(url)
    const drop = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "spm", "from", "ref"]
    for (const k of drop) u.searchParams.delete(k)
    const qs = u.searchParams.toString()
    return `${u.hostname.replace(/^www\./, "").toLowerCase()}${u.pathname.replace(/\/+$/, "")}${qs ? `?${qs}` : ""}`
  } catch {
    return url.replace(/[#?].*$/, "").replace(/\/+$/, "").toLowerCase()
  }
}

/**
 * 轮转合并：第 1 名的 Bing、第 1 名的 360、第 1 名的 DDG，再第 2 名…
 * 单一引擎的霸榜不会挤掉其他引擎的优质结果，且不引入分数归一化的量纲问题。
 */
function mergeRoundRobin(outcomes: EngineOutcome[], count: number): WebSearchResult[] {
  const seen = new Set<string>()
  const merged: WebSearchResult[] = []
  const cursors = outcomes.map(() => 0)

  let progressed = true
  while (merged.length < count && progressed) {
    progressed = false
    for (let i = 0; i < outcomes.length; i++) {
      const hits = outcomes[i].hits
      while (cursors[i] < hits.length) {
        const hit = hits[cursors[i]++]
        const key = dedupeKey(hit.url)
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(hit)
        progressed = true
        break
      }
      if (merged.length >= count) break
    }
  }
  return merged
}

// ============== 引擎健康度 ==============
//
// DuckDuckGo 在国内网络下稳定不可达。每次检索都为它等满超时，等于给所有查询
// 固定加 3.5 秒延迟。这里记录连续失败次数：连续失败 2 次就冷却 10 分钟，
// 冷却期内直接跳过；一次成功立即恢复。这样「网络本来就不通」只付一次代价。

const ENGINE_COOLDOWN_MS = 10 * 60 * 1000
const ENGINE_FAIL_THRESHOLD = 2
const engineHealth = new Map<LocalEngineId, { fails: number; until: number }>()

function isCoolingDown(id: LocalEngineId): boolean {
  const st = engineHealth.get(id)
  return !!st && st.until > Date.now()
}

function noteEngineResult(id: LocalEngineId, failed: boolean): void {
  if (!failed) {
    engineHealth.delete(id)
    return
  }
  const prev = engineHealth.get(id) || { fails: 0, until: 0 }
  const fails = prev.fails + 1
  engineHealth.set(id, {
    fails,
    until: fails >= ENGINE_FAIL_THRESHOLD ? Date.now() + ENGINE_COOLDOWN_MS : 0
  })
  if (fails === ENGINE_FAIL_THRESHOLD) {
    console.warn(`[local-search] ${id} 连续失败 ${fails} 次，冷却 ${ENGINE_COOLDOWN_MS / 60000} 分钟`)
  }
}

// ============== 缓存 ==============

const cache = new Map<string, { ts: number; result: WebSearchResult[] }>()

function cacheGet(key: string): WebSearchResult[] | undefined {
  const hit = cache.get(key)
  if (!hit) return undefined
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    cache.delete(key)
    return undefined
  }
  return hit.result
}

function cacheSet(key: string, result: WebSearchResult[]): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, { ts: Date.now(), result })
}

// ============== 对外入口 ==============

/** 可用引擎 id 列表（供 admin UI / 诊断展示） */
export const LOCAL_SEARCH_ENGINES: Array<{ id: LocalEngineId; label: string }> = ENGINES.map(e => ({
  id: e.id,
  label: e.label
}))

/**
 * 执行一次本地聚合检索。
 * 任一引擎失败不影响整体；全部失败返回空数组（调用方按「无结果」处理，不报错）。
 */
export async function localWebSearch(
  query: string,
  options: LocalSearchOptions = {}
): Promise<WebSearchResult[]> {
  const q = (query || "").trim()
  if (!q) return []

  const count = Math.min(Math.max(options.count ?? 8, 1), 30)
  const wanted = (options.engine || "").trim().toLowerCase()
  const requested =
    wanted && ENGINES.some(e => e.id === wanted) ? ENGINES.filter(e => e.id === wanted) : ENGINES

  // 冷却中的引擎直接跳过；但若全都在冷却，就全部放行（宁可慢，也不能没结果）
  const alive = requested.filter(e => !isCoolingDown(e.id))
  const specs = alive.length > 0 ? alive : requested

  const cacheKey = `${specs.map(s => s.id).join("+")}|${count}|${q}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached.slice(0, count)

  const outcomes = await Promise.all(specs.map(spec => runEngine(spec, q, options.signal)))

  for (const o of outcomes) {
    // 只有「网络/HTTP 层面失败」才计健康度；正常返回 0 条（冷门查询）不算故障，
    // 否则两次冷门查询就会把正常引擎误判进冷却。
    noteEngineResult(o.engine, !!o.error)
    if (o.error) {
      console.warn(`[local-search] ${o.engine} 检索失败，已跳过：${o.error}`)
    }
  }

  const merged = mergeRoundRobin(outcomes, count)
  cacheSet(cacheKey, merged)
  return merged
}
