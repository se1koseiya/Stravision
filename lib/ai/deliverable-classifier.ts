/**
 * 交付物分类：报告（[REPORT:] 卡） vs 代码产物（代码块卡）
 *
 * ## 背景（2026-10-11 事故）
 *
 * AI 助手把「用户要的代码」当成报告交付了：
 *
 * 1. 前端流式过滤器只要看到带 `style` 的 HTML 就自动包成 `[REPORT:标题]`，
 *    关键词表里甚至包含 `数据` / `font-family` / `gradient` / `padding` / `border-radius`
 *    这类**任何前端代码都必然命中**的通用词 → 一个番茄钟页面也会被判成「报告」。
 * 2. 更严重的是它连 ```` ```html ```` 代码块也整体替换成报告卡：
 *    源码从此消失，用户既看不到代码、也没有任何下载入口（"无法交付代码产物"）。
 *
 * ## 新口径
 *
 * - 报告 = **用户明确要报告** 且 **内容确实是报告**（语义 + 结构双证）；
 * - 代码 = 其余一切 HTML/CSS/JS 产物，一律走代码块/代码卡交付，绝不被报告卡吞掉。
 *
 * 本模块是这套判定的唯一来源：前端流式过滤器（page.tsx）与渲染层
 * （chat-message-renderer）共用同一口径，避免两处漂移出不同结论。
 * 纯函数、无依赖，客户端可安全引用。
 */

/** 用户「要报告」的意图词（用于判定交付物类型，不用于判定内容） */
const REPORT_INTENT_RE = /(报告|日报|周报|月报|年报|简报|报表|导出|report)/i

/**
 * 判定用户意图是否为「要报告」。
 *
 * 传多条文本时按「或」合并：调用方通常传「当前这条消息」+「本会话根意图」——
 * 多轮链路里用户先说「生成一份环境报告」、后面只说「继续」时，根意图仍应生效。
 *
 * @param texts 用户消息文本（可能含 undefined / 非字符串，如视觉消息数组）
 */
export function hasReportIntent(...texts: Array<string | null | undefined | unknown>): boolean {
  for (const t of texts) {
    if (typeof t === "string" && REPORT_INTENT_RE.test(t)) return true
  }
  return false
}

/** 语言标识是否属于 HTML 家族 */
export function isHtmlLang(lang?: string | null): boolean {
  if (!lang) return false
  return /^(?:html?|xhtml)$/i.test(String(lang).trim())
}

/**
 * 代码/程序特征 —— 报告是「内容页」（内联样式 + 表格/卡片），
 * 代码产物是「程序」（脚本逻辑 / 框架痕迹 / SPA 挂载点）。
 */
const SCRIPT_LOGIC_RE =
  /<script\b[^>]*>[\s\S]*?(?:function\s|=>|document\.|window\.|addEventListener|createRoot|ReactDOM|const\s|let\s|var\s)[\s\S]*?<\/script\s*>/i
const FRAMEWORK_RE =
  /(?:export\s+default|import\s+React|from\s+['"]react['"]|ReactDOM\.createRoot|ReactDOM\.render|createApp\(|new\s+Vue\(|defineComponent\()/i
const SPA_ROOT_RE = /<div\s+id=["'](?:root|app)["']\s*>/i

/** HTML 是否明显是「代码产物」而非内容型报告 */
export function looksLikeCodeArtifact(html: string): boolean {
  if (!html) return false
  return SCRIPT_LOGIC_RE.test(html) || looksLikeAppShell(html)
}

/**
 * 是否「应用外壳」（框架痕迹 / SPA 挂载点）—— 报告绝不会有，页面必然有。
 *
 * 与 looksLikeCodeArtifact 分开的原因：报告里合法的图表脚本（内联 `<script>`）
 * 属于代码，但不足以否定它是一份报告；而 `#root` / `createApp` 这类外壳则足够。
 */
function looksLikeAppShell(html: string): boolean {
  return FRAMEWORK_RE.test(html) || SPA_ROOT_RE.test(html)
}

/** 报告语义关键词（强）—— 报告正文必然会写到「报告/分析/监测/摘要/结论」之类 */
const REPORT_SEMANTIC_RE =
  /(报告|日报|周报|月报|年报|简报|报表|摘要|分析报告|监测报告|诊断报告|结论|评估|Report)/i
/** 报告结构标记 —— 报告必然有标题层级或数据表格 */
const REPORT_STRUCTURE_RE = /<(?:h[12]|table|thead|th|section|article)[\s>/]/i

/**
 * HTML 是否具备报告特征（语义 + 结构双证，且不是应用外壳）。
 *
 * 双证是故意的：单看关键词会被"代码注释里写了报告"骗到，
 * 单看结构会被任何一张卡片式页面骗到。
 */
export function looksLikeReportHtml(html: string): boolean {
  if (!html || html.length < 150) return false
  if (looksLikeAppShell(html)) return false
  return REPORT_SEMANTIC_RE.test(html) && REPORT_STRUCTURE_RE.test(html)
}

/** 完整 HTML 文档（而不是 markdown 里的零散内联标签） */
const BARE_HTML_DOC_RE = /<!DOCTYPE\s+html|<html[\s>]/i

/**
 * 是否是一段**裸露的 HTML 代码产物**（没有代码围栏包裹）。
 *
 * 用途：这类内容直接交给 Markdown 渲染器会被当未知 HTML 静默吞掉
 * （表现为"AI 说写好了，界面上什么都没有"），需要在流结束后补上 html 语言
 * 的代码围栏，让它以代码卡（源码 + 预览 + 下载）交付。
 *
 * 报告（已带报告特征）与 markdown 片段（无 <html>/<!DOCTYPE）都不算。
 */
export function isBareHtmlArtifact(text: string): boolean {
  if (!text || !BARE_HTML_DOC_RE.test(text)) return false
  if (looksLikeReportHtml(text)) return false
  // 开标签与闭标签都算（只数开标签会让"4 个元素的极简页面"漏判）
  const tagCount = (text.match(/<[a-z/][^>]*>/gi) || []).length
  return tagCount >= 5
}

/** 从 HTML 中提取一个像样的标题（优先 <h1>，退化到 <title>），失败返回兜底值 */
export function extractReportTitle(html: string, fallback = "AI生成报告"): string {
  if (!html) return fallback
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1 && h1[1]) return h1[1].replace(/<[^>]+>/g, "").trim() || fallback
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (title && title[1]) return title[1].replace(/<[^>]+>/g, "").trim() || fallback
  return fallback
}
