import DOMPurify from "dompurify"

/**
 * HTML 净化工具
 *
 * 用于在通过 dangerouslySetInnerHTML 注入 DOM 之前移除恶意内容：
 *  - <script> 标签
 *  - 事件处理器属性（onclick, onerror 等）
 *  - javascript: 协议
 *  - 其他 XSS 向量
 *
 * 主要应用场景：AI 生成的报告 HTML、聊天内容等不可信来源的 HTML 渲染。
 */

// 严格配置：禁止所有脚本/事件，仅保留安全的展示性 HTML
const STRICT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    // 文本结构
    "p", "br", "hr", "div", "span",
    // 标题
    "h1", "h2", "h3", "h4", "h5", "h6",
    // 列表
    "ul", "ol", "li", "dl", "dt", "dd",
    // 表格
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
    // 文本格式
    "strong", "b", "em", "i", "u", "s", "del", "ins", "mark", "small", "sub", "sup",
    "abbr", "address", "cite", "q", "blockquote", "pre", "code", "kbd", "samp", "var",
    // 链接与媒体
    "a", "img", "figure", "figcaption", "picture", "source",
    // 语义
    "article", "section", "aside", "header", "footer", "nav", "main", "details", "summary",
    // 其他
    "details", "summary", "time", "mark", "ruby", "rt", "rp", "bdi", "bdo", "wbr",
  ],
  ALLOWED_ATTR: [
    "href", "src", "alt", "title", "width", "height", "class", "id",
    "style", "target", "rel", "colspan", "rowspan", "lang", "dir",
    "datetime", "loading", "srcset", "sizes", "name", "value",
    "open", "start", "reversed", "type",
  ],
  // 强制对 href/src 只允许安全协议：http/https/mailto/tel + 图片 data URI
  ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):|^data:image\/(?:png|jpeg|gif|webp);base64,/i,
  // 禁止所有 on* 事件属性（默认即禁，显式声明）
  FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover", "onmouseout", "onfocus", "onblur"],
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button", "textarea", "select", "option", "meta", "link", "base"],
  // 保留自定义 data-* 属性
  ALLOW_DATA_ATTR: true,
}

/**
 * 净化 HTML 字符串，移除 XSS 向量。
 *
 * 在服务端渲染（SSR）期间 DOMPurify 不可用（依赖 window），
 * 此时退化为正则移除 <script> 等最危险标签，保证不崩溃。
 * 真正的净化在客户端 hydration 后生效。
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== "string") return ""

  // 客户端：使用 DOMPurify 完整净化
  if (typeof window !== "undefined") {
    try {
      return DOMPurify.sanitize(dirty, STRICT_CONFIG) as string
    } catch {
      // DOMPurify 出错时退化为基础清理，不阻断渲染
      return basicStrip(dirty)
    }
  }

  // 服务端：退化为基础清理（仅移除最危险的 script 标签）
  return basicStrip(dirty)
}

/**
 * 基础 HTML 清理（服务端降级方案）
 * 仅移除 <script>、<iframe>、事件属性，不保证完整净化
 */
function basicStrip(html: string): string {
  return html
    // 移除 script 标签及内容
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // 移除 iframe 标签
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    // 移除所有 on* 事件属性
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // 移除 javascript: 协议
    .replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, '$1=""')
}
