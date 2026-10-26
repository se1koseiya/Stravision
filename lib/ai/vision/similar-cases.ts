/**
 * 相似案例检索 —— 「AI 去互联网上找同病害的历史案例」
 *
 * ── 它解决什么 ──
 * 视觉模型给出「疑似灰霉病」之后，种植户真正想问的是：
 * 「别人家这个病长什么样、后来怎么处理的？」—— 这是模型权重里没有的、**实时**的信息，
 * 只能联网找。所以这里不复用 `deep-research-service`（那是长跑型研究循环，几十秒起步），
 * 而是走一条**短链路**：检索 → 抓页面 → 抠实拍图 → 收敛成 3 张案例卡。
 *
 * ── 链路 ──
 *   1. `webSearch()`（`lib/ai/web-search-service.ts`，智谱 / Exa / AnySearch 可插拔）
 *      搜「{作物} {病名} 症状 图片」；
 *   2. 对结果页抓 HTML（限 3 并发 / 8s 超时 / 500KB 截断）；
 *   3. 从 HTML 里抠图：`og:image` 优先，其次 `<img>`（含 `data-src` 等懒加载属性），
 *      过一遍噪声词黑名单（logo / icon / 二维码 / 按钮…）；
 *   4. 一张图 = 一个案例，配图统一改写成站内代理地址。
 *
 * ── 为什么图片必须走代理 ──
 * 外链直引会撞两件事：① 防盗链（Referer 校验 → 403 裂图）；② 混合内容 / 跨域策略。
 * 代理侧统一补 Referer、做类型白名单与体积上限，见 `app/api/vision/image-proxy`。
 *
 * ── 降级 ──
 * 平台未配置搜索 provider（`webSearchConfig` 缺失且无 GLM / 环境变量）时，
 * 直接返回 `{ ok: false, available: false }` —— 卡片据此显示「未配置联网检索」，
 * **不伪造案例**。这是硬约束：假案例比没有案例危险得多。
 */

import { isWebSearchAvailable, webSearch, type WebSearchResult } from '@/lib/ai/web-search-service'
import type { DiseaseCategory, SimilarCase } from '@/lib/types/vision-diagnosis'

// ---------------------------------------------------------------------------
// 对外类型
// ---------------------------------------------------------------------------

export interface SimilarCaseQuery {
    /** 病名（模型给出的 diseaseName） */
    diseaseName: string
    /** 病害大类（用于拼检索词，可选） */
    category?: DiseaseCategory
    /** 作物名，默认「草莓」（平台当前主场景） */
    crop?: string
    /** 最多返回几个案例，默认 3 */
    limit?: number
    signal?: AbortSignal
}

export interface SimilarCaseResult {
    ok: boolean
    /** 联网检索是否可用（false = 平台未配置搜索 provider，卡片据此提示而不是显示空） */
    available: boolean
    cases: SimilarCase[]
    /** 实际抓取过正文的页面数（排障用） */
    pagesSearched?: number
    error?: string
}

// ---------------------------------------------------------------------------
// 缓存（同一病名短时间内反复展开「相似案例」不应重复联网）
// ---------------------------------------------------------------------------

const CACHE_TTL = 6 * 60 * 60 * 1000
const MAX_CACHE_ENTRIES = 120
const cache = new Map<string, { value: SimilarCaseResult; ts: number }>()

export function clearSimilarCaseCache(): void {
    cache.clear()
}

function cacheKey(q: SimilarCaseQuery): string {
    return `${q.crop || '草莓'}::${q.diseaseName}::${q.limit ?? 3}`
}

function readCache(key: string): SimilarCaseResult | null {
    const hit = cache.get(key)
    if (!hit) return null
    if (Date.now() - hit.ts > CACHE_TTL) {
        cache.delete(key)
        return null
    }
    return hit.value
}

function writeCache(key: string, value: SimilarCaseResult): void {
    if (cache.size >= MAX_CACHE_ENTRIES) {
        // 简单 FIFO 淘汰：Map 保持插入序，删最早的一条即可
        const oldest = cache.keys().next().value
        if (oldest) cache.delete(oldest)
    }
    cache.set(key, { value, ts: Date.now() })
}

// ---------------------------------------------------------------------------
// 检索
// ---------------------------------------------------------------------------

/** 图片来源黑名单：命中即丢（不是病害实拍图） */
const IMAGE_NOISE = new RegExp(
    [
        'logo',
        'icon',
        'avatar',
        'sprite',
        'banner',
        'qrcode',
        'qr_code',
        'placeholder',
        'blank\\.',
        'loading',
        'spinner',
        'watermark',
        'share',
        'weixin',
        'wechat',
        'button',
        'btn[_\\-.]',
        '/ads?/',
        '_ad\\.',
        'advert',
        'sprite\\.',
    ].join('|'),
    'i',
)

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

/** 抓一个页面的 HTML（体积与类型双重限制，失败一律返回 null） */
async function fetchHtml(url: string, timeoutMs = 8000): Promise<string | null> {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
            redirect: 'follow',
            signal: AbortSignal.timeout(timeoutMs),
        })
        if (!res.ok) return null

        const contentType = res.headers.get('content-type') || ''
        if (!/text\/html|application\/xhtml/i.test(contentType)) return null

        const buf = await res.arrayBuffer()
        // 500KB 足够覆盖文章头部（配图元信息都在 <head> 与正文前段），
        // 再大就是视频页 / 图库页，对"一张实拍图"的目标没有增益。
        if (buf.byteLength === 0 || buf.byteLength > 500_000) return null

        // 中文站点常见 GBK / GB2312，交给 TextDecoder 的 ICU 表处理
        const charset = /charset=["']?([\w-]+)/i.exec(contentType)?.[1] || 'utf-8'
        try {
            return new TextDecoder(charset).decode(buf)
        } catch {
            return new TextDecoder('utf-8').decode(buf)
        }
    } catch {
        return null
    }
}

/** 相对地址 → 绝对地址（跳不过去的一律丢弃） */
function absolute(src: string, base: string): string | null {
    const s = (src || '').trim()
    if (!s || s.startsWith('data:') || s.startsWith('blob:')) return null
    try {
        const u = new URL(s, base)
        if (!/^https?:$/.test(u.protocol)) return null
        if (/\.svg($|\?)/i.test(u.pathname)) return null
        return u.toString()
    } catch {
        return null
    }
}

/**
 * 从 HTML 里抠出「可能是正文实拍图」的候选地址，按可信度降序。
 *
 * 顺序即优先级：`og:image` 是站点自己声明的分享大图，命中率最高；
 * 其次是 `twitter:image`；最后才是正文 `<img>`（混着图标与广告，靠黑名单洗）。
 */
export function extractImageCandidates(html: string, baseUrl: string, max = 6): string[] {
    const out: string[] = []
    const seen = new Set<string>()

    const push = (raw: string | undefined) => {
        if (!raw || out.length >= max) return
        const url = absolute(raw, baseUrl)
        if (!url) return
        const key = url.replace(/[#?].*$/, '')
        if (seen.has(key)) return
        if (IMAGE_NOISE.test(url)) return
        seen.add(key)
        out.push(url)
    }

    // 1) og:image / og:image:secure_url（属性顺序两种都兜）
    const metaRe = /<meta\b[^>]*>/gi
    const metas = html.match(metaRe) || []
    const ogImages: string[] = []
    const twImages: string[] = []
    for (const tag of metas) {
        const prop = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase()
        const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1]
        if (!prop || !content) continue
        if (prop === 'og:image' || prop === 'og:image:secure_url') ogImages.push(content)
        else if (prop === 'twitter:image' || prop === 'twitter:image:src') twImages.push(content)
    }
    ogImages.forEach(push)
    twImages.forEach(push)

    // 2) 正文 <img>：src 可能是懒加载占位，优先读 data-* 真身
    const imgRe = /<img\b[^>]*>/gi
    let m: RegExpExecArray | null
    while ((m = imgRe.exec(html)) !== null && out.length < max) {
        const tag = m[0]
        const lazy =
            /data-src\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ||
            /data-original\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ||
            /data-lazy-src\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ||
            /data-echo\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
        const src = /(?:^|\s)src\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
        // 有懒加载真身就用真身；否则用 src（src 常见为 1x1 占位，黑名单会兜住）
        push(lazy || src)
    }

    return out
}

/** 标题洗一遍：去掉站点后缀、压缩空白、限长 */
export function cleanTitle(raw: string, max = 36): string {
    let t = (raw || '').replace(/\s+/g, ' ').trim()
    // 常见站点后缀分隔符（中英）
    const cut = t.split(/\s*[|｜\-–—_]\s*/).filter((s) => s.trim().length > 0)
    if (cut.length > 1) {
        // 取最长的一段当正文标题（站点名通常最短）
        t = cut.reduce((a, b) => (b.length > a.length ? b : a), cut[0])
    }
    t = t.replace(/^[\s\-–—_|｜:：]+|[\s\-–—_|｜:：]+$/g, '')
    return t.length > max ? t.slice(0, max) + '…' : t
}

/** 摘要洗一遍：去 html 实体与多余空白 */
function cleanSnippet(raw: string, max = 60): string {
    const s = (raw || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
    return s.length > max ? s.slice(0, max) + '…' : s
}

/** 日期归一成 YYYY-MM-DD（识别不了就不给） */
function cleanDate(raw?: string): string | undefined {
    if (!raw) return undefined
    const m = /(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/.exec(raw)
    if (!m) return undefined
    const [, y, mo, d] = m
    const mm = mo.padStart(2, '0')
    const dd = d.padStart(2, '0')
    const year = Number(y)
    if (year < 2000 || year > 2100) return undefined
    return `${y}-${mm}-${dd}`
}

function hostOf(url: string): string {
    try {
        return new URL(url).hostname
    } catch {
        return ''
    }
}

/** 站内图片代理地址 —— 卡片只用这个，绝不直引外链 */
export function proxyImageUrl(raw: string): string {
    return `/api/vision/image-proxy?url=${encodeURIComponent(raw)}`
}

/** 同一条检索结果是否真的和这个病害相关（标题或摘要里出现病名） */
function isRelevant(r: WebSearchResult, diseaseName: string): boolean {
    const hay = `${r.title} ${r.snippet}`
    if (hay.includes(diseaseName)) return true
    // 病名可能是「草莓灰霉病」这类复合词，退一步用末两字（灰霉病 → 霉病）做宽松匹配
    if (diseaseName.length >= 3) return hay.includes(diseaseName.slice(-2))
    return false
}

/** 并发执行并保序（避免一次性打出十几个请求把目标站打挂） */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length)
    let cursor = 0
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
            const index = cursor++
            results[index] = await fn(items[index], index)
        }
    })
    await Promise.all(workers)
    return results
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

/**
 * 检索同病害的相似案例（不抛异常，全部失败都收敛为 `ok: false`）。
 */
export async function findSimilarCases(query: SimilarCaseQuery): Promise<SimilarCaseResult> {
    const diseaseName = (query.diseaseName || '').trim()
    const limit = Math.min(Math.max(query.limit ?? 3, 1), 6)
    const crop = (query.crop || '草莓').trim()

    // 病名不可检索（「信息不足」/空）时没有必要联网
    if (!diseaseName || diseaseName === '信息不足') {
        return { ok: false, available: true, cases: [], error: '当前结论不足以检索相似案例' }
    }

    const key = cacheKey({ ...query, diseaseName, crop, limit })
    const cached = readCache(key)
    if (cached) return cached

    if (!(await isWebSearchAvailable())) {
        return { ok: false, available: false, cases: [], error: '平台未配置联网检索（webSearchConfig）' }
    }

    try {
        // 一次检索拿够候选；引擎默认 search_pro_sogou，中文农业站覆盖较好
        const results = await webSearch(`${crop} ${diseaseName} 症状 图片 病斑`, {
            count: 12,
            contentSize: 'medium',
            signal: query.signal,
        })

        // 相关度优先，其次保序；相关的一条都没有时退回原始顺序（宁可给相关的弱结果，也别空手）
        const relevant = results.filter((r) => isRelevant(r, diseaseName))
        const ordered = (relevant.length > 0 ? relevant : results).filter((r) => r.url)

        // 只抓前 5 个页面：每页最多出一张图，5 个通常足够凑满 limit
        const pages = ordered.slice(0, 5)
        const perPage = await mapLimit(pages, 3, async (r) => {
            if (query.signal?.aborted) return null
            const html = await fetchHtml(r.url)
            if (!html) return null
            const images = extractImageCandidates(html, r.url, 3)
            if (images.length === 0) return null
            return { result: r, image: images[0] }
        })

        const cases: SimilarCase[] = []
        const seenHost = new Set<string>()
        for (const hit of perPage) {
            if (!hit) continue
            if (cases.length >= limit) break
            const host = hostOf(hit.result.url)
            // 同一站点只要一条：三个案例来自同一站会让「相似案例」失去旁证价值
            if (host && seenHost.has(host)) continue
            if (host) seenHost.add(host)

            cases.push({
                id: `${host}-${cases.length}`,
                title: cleanTitle(hit.result.title) || `${crop}·${diseaseName}`,
                crop,
                description: cleanSnippet(hit.result.snippet),
                date: cleanDate(hit.result.publishDate),
                imageUrl: proxyImageUrl(hit.image),
                sourceUrl: hit.result.url,
                source: hit.result.siteName || host,
            })
        }

        const value: SimilarCaseResult = {
            ok: cases.length > 0,
            available: true,
            cases,
            pagesSearched: pages.length,
            error: cases.length === 0 ? '未检索到可用配图的案例' : undefined,
        }
        writeCache(key, value)
        return value
    } catch (err: any) {
        console.warn('[similar-cases] 检索失败:', err?.message || err)
        return { ok: false, available: true, cases: [], error: err?.message || '联网检索失败' }
    }
}
