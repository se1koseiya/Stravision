/**
 * 文档附件上传
 *
 * 对话里的非图片文件（PDF / Word / Excel / PPT / md / csv…）走这条路：
 *   浏览器 → POST /api/documents/upload → 服务端落盘 + 轻量解析 → 返回 fileId
 *
 * 为什么不像图片那样直接读成 dataURL：
 *   · 一份 5MB 的 PPT 转 base64 是 6.7MB 字符串，塞进请求体会被网关 413，
 *     塞进 `image_url` 更是直接被上游拒绝（它不是图片）；
 *   · 文档需要**按需分段解析**（80 页 PDF 不该一次全读），这要求它先以文件形式存在服务端。
 *
 * 上传失败的附件**保留**在附件条里并标红，让用户看到原因（而不是"点了没反应"）。
 */

import type { ChatAttachment } from "@/app/ai-assistant/types"

/** 服务端支持解析的扩展名 */
const DOC_EXT_RE = /\.(pdf|docx|xlsx|pptx|md|markdown|txt|log|csv|tsv|json|html?)$/i

/** 旧版 Office / 压缩包等：不拦在前端，交给服务端给出准确解释 */
const KNOWN_UNSUPPORTED_RE = /\.(doc|xls|ppt|odt|ods|odp|zip|rar|7z)$/i

export function looksLikeDocument(file: File): boolean {
  if ((file.type || "").startsWith("image/")) return false
  if (DOC_EXT_RE.test(file.name)) return true
  const t = file.type || ""
  return (
    t === "application/pdf" ||
    t.includes("openxmlformats") ||
    t === "text/plain" ||
    t === "text/csv" ||
    t === "application/json"
  )
}

export function isKnownUnsupported(file: File): boolean {
  return KNOWN_UNSUPPORTED_RE.test(file.name)
}

interface UploadResponse {
  artifact?: { fileId: string; fileName: string; format: string; sizeBytes: number }
  sizeText?: string
  preview?: { summary: string; stats: any; outline: any[] }
  error?: string
}

/**
 * 上传一份文档。
 *
 * 不抛异常：失败时返回 `status: 'error'` 的附件（含原因），调用方直接塞进列表即可。
 * 上传成功但**服务端解析失败**仍算成功（文件已存好，AI 照样能读）。
 */
export async function uploadDocumentFile(file: File, sessionId?: string): Promise<ChatAttachment> {
  const base: ChatAttachment = {
    name: file.name,
    type: file.type || "application/octet-stream",
    dataUrl: "",
    status: "uploading",
  }

  try {
    const form = new FormData()
    form.append("file", file)
    if (sessionId) form.append("sessionId", sessionId)

    const res = await fetch("/api/documents/upload", { method: "POST", body: form })
    const json = (await res.json().catch(() => ({}))) as UploadResponse

    if (!res.ok || !json.artifact) {
      return {
        ...base,
        status: "error",
        error: json.error || `上传失败（HTTP ${res.status}）`,
      }
    }

    return {
      ...base,
      name: json.artifact.fileName || file.name,
      format: json.artifact.format,
      sizeText: json.sizeText,
      fileId: json.artifact.fileId,
      status: "ready",
    }
  } catch (e: any) {
    return {
      ...base,
      status: "error",
      error: e?.message ? `上传失败：${e.message}` : "上传失败（网络异常）",
    }
  }
}

/** 把附件里「已就绪的文档」转成随消息发送的引用 */
export function toDocumentRefs(attachments: ChatAttachment[]) {
  return attachments
    .filter(a => a.status === "ready" && a.fileId)
    .map(a => ({
      fileId: a.fileId as string,
      fileName: a.name,
      format: a.format || "bin",
      sizeText: a.sizeText,
    }))
}
