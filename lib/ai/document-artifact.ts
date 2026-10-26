/**
 * 文档产物引用（artifacts → DocumentRef）—— 唯一源
 *
 * ## 为什么要有这一层
 *
 * `document_create` / `document_edit` 的 tool_result 里带 `artifacts: [{fileId, fileName,
 * format, sizeBytes, downloadUrl, origin}]`，这是**前端画下载卡的唯一凭据**（渲染层见
 * `app/ai-assistant/_components/document-card.tsx`）。
 *
 * 但这坨数据有两个消费方，各自都在 SSE 回调里手工拼一遍对象：
 *   · 主助手 `app/ai-assistant/page.tsx`（`__flushDocArtifacts`）
 *   · Copilot 侧栏 `components/ai/copilot/use-copilot-chat.ts`
 * 两处字段口径一旦漂移，症状就是「主助手能看到卡、侧栏看不到」这种极难查的差异。
 *
 * 所以转换与合并只在这里做，两边都调它。
 *
 * ## 关键约定
 *
 * - **判据只看结果里有没有 artifacts**，不按工具名硬编码 —— 将来任何产出文件的工具
 *   （导出巡检报告、生成合同…）都能自动获得下载卡。
 * - `sizeBytes` → `sizeText`（人可读）在这里转，避免每处各写一遍三元表达式。
 * - 合并按 `fileId` 去重：同一轮里模型偶尔会重复调用同一工具，别给用户看两张一样的卡。
 */

import type { DocumentRef } from "@/app/ai-assistant/types"

/** 工具结果里的单条产物（服务端 `lib/documents/create.ts` 的产出形态） */
export interface DocumentArtifactLike {
  fileId?: unknown
  fileName?: unknown
  format?: unknown
  sizeBytes?: unknown
  downloadUrl?: unknown
  origin?: unknown
}

/** 字节数 → 人可读体积（与对话流里其它文件行同一套单位） */
export function formatSizeText(sizeBytes: unknown): string | undefined {
  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes < 0) return undefined
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`
}

/**
 * 单条 artifact → `DocumentRef`；字段不全（没 fileId / downloadUrl）返回 null。
 *
 * `downloadUrl` 是硬要求：没有它卡片就只能显示一个点不动的文件名，
 * 那比不显示更让人困惑（用户会以为链接坏了）。
 */
export function toDocumentRef(artifact: unknown): DocumentRef | null {
  if (!artifact || typeof artifact !== "object") return null
  const a = artifact as Record<string, unknown>
  const fileId = typeof a.fileId === "string" ? a.fileId.trim() : ""
  const downloadUrl = typeof a.downloadUrl === "string" ? a.downloadUrl.trim() : ""
  if (!fileId || !downloadUrl) return null
  return {
    fileId,
    fileName: typeof a.fileName === "string" && a.fileName ? a.fileName : "未命名文件",
    format: typeof a.format === "string" && a.format ? a.format : "bin",
    sizeText: formatSizeText(a.sizeBytes),
    downloadUrl,
    origin: a.origin === "edited" ? "edited" : "generated",
  }
}

/**
 * 把 tool_result.result.artifacts 转成 `DocumentRef[]`（已过滤 + 去重）。
 *
 * @param artifacts tool_result.result.artifacts（可能是任意脏数据）
 * @param existing  已经收过的（用于跨多次工具调用去重）
 */
export function collectDocumentRefs(
  artifacts: unknown,
  existing: readonly DocumentRef[] = [],
): DocumentRef[] {
  if (!Array.isArray(artifacts) || artifacts.length === 0) return []
  const seen = new Set(existing.map(d => d.fileId))
  const out: DocumentRef[] = []
  for (const raw of artifacts) {
    const ref = toDocumentRef(raw)
    if (!ref || seen.has(ref.fileId)) continue
    seen.add(ref.fileId)
    out.push(ref)
  }
  return out
}

/**
 * 合并两组文档引用（按 fileId 去重，`next` 覆盖 `prev` 的同 id 项）。
 *
 * 用于「收尾投递」：把 pending 队列挂到消息已有的 documents 上，
 * 而不是整体替换（同一轮里可能既改了旧文件又生成了新文件）。
 */
export function mergeDocumentRefs(
  prev: readonly DocumentRef[] | undefined,
  next: readonly DocumentRef[] | undefined,
): DocumentRef[] {
  const out: DocumentRef[] = []
  const index = new Map<string, number>()
  for (const ref of [...(prev ?? []), ...(next ?? [])]) {
    if (!ref?.fileId) continue
    const at = index.get(ref.fileId)
    if (at === undefined) {
      index.set(ref.fileId, out.length)
      out.push(ref)
    } else {
      out[at] = ref
    }
  }
  return out
}

/**
 * 规范化**已经是 DocumentRef 形态**的数据（会话历史回放 / 本地缓存）。
 *
 * 与 `collectDocumentRefs` 的区别：
 *   · 这里允许 `downloadUrl` 缺失 —— 用户上传件本来就没有下载地址（文件在用户手里），
 *     但它们仍要显示文件行；
 *   · `sizeText` 直接沿用（历史里存的就是人可读文本，没有原始字节数可换算）。
 */
export function normalizeDocumentRefs(list: unknown): DocumentRef[] {
  if (!Array.isArray(list) || list.length === 0) return []
  const seen = new Set<string>()
  const out: DocumentRef[] = []
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue
    const d = raw as Record<string, unknown>
    const fileId = typeof d.fileId === "string" ? d.fileId.trim() : ""
    if (!fileId || seen.has(fileId)) continue
    seen.add(fileId)
    const origin =
      d.origin === "generated" || d.origin === "edited" || d.origin === "uploaded"
        ? d.origin
        : undefined
    out.push({
      fileId,
      fileName: typeof d.fileName === "string" && d.fileName ? d.fileName : "未命名文件",
      format: typeof d.format === "string" && d.format ? d.format : "bin",
      sizeText: typeof d.sizeText === "string" ? d.sizeText : formatSizeText(d.sizeBytes),
      downloadUrl: typeof d.downloadUrl === "string" && d.downloadUrl ? d.downloadUrl : undefined,
      origin,
    })
  }
  return out
}
