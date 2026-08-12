/**
 * 知识库文件上传 API
 *
 * POST /api/knowledge/upload  multipart/form-data: file + collection_id?
 *  - 文件保存到 public/uploads/knowledge/[uid]/
 *  - 自动提取文本内容：
 *      text/* 直接 utf-8
 *      PDF  → pdf-data-parser
 *      DOCX → mammoth
 *      XLSX → xlsx
 *      PPTX → 解析内部 XML 文本
 *  - 创建 knowledge_items 记录
 *  - 同步触发 embedding（不异步，失败时通过 embedding_status 标记）
 *
 * 支持的文件类型：
 *  - 文本: text/plain, text/markdown, text/csv, application/json
 *  - 图片: image/jpeg, image/png, image/gif, image/webp
 *  - 文档: application/pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx
 *  - 音视频: 限制大小，存入但不自动解析
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { promises as fs } from "node:fs"
import path from "node:path"
import { Buffer } from "buffer"
import { createItem, updateItem } from "@/lib/db/knowledge-service"
import { getKnowledgeConfig, readProvidersConfig } from "@/lib/ai/provider-resolver"
import { queryOne } from "@/lib/db/database"

const ALLOWED_TEXT = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml"
  // 注意：已移除 text/html —— 静态资源目录直接对外暴露 HTML 会造成存储型 XSS 风险
])
const ALLOWED_IMAGE = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
  // 注意：已移除 image/svg+xml —— SVG 可内嵌 <script>/onload，与 admin/upload 白名单保持一致
])
const ALLOWED_DOC = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
])
const ALLOWED_AUDIO = new Set([
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm", "audio/aac"
])
const ALLOWED_VIDEO = new Set([
  "video/mp4", "video/webm", "video/ogg", "video/quicktime"
])

// ============== 文本提取 ==============

/**
 * 文本截断的本地兜底值（仅当 knowledgeConfig 加载失败时使用，admin 可在后台调整 maxExtractedChars）
 */
const DEFAULT_MAX_EXTRACTED_CHARS = 500_000

function truncate(text: string, maxChars: number = DEFAULT_MAX_EXTRACTED_CHARS): string {
  if (!maxChars || text.length <= maxChars) return text
  return text.slice(0, maxChars) + "\n\n...(内容过长已截断)..."
}

/** 从 PPTX/Office 压缩包格式中提取所有 XML 文本节点 */
function extractTextFromZipXml(buf: Buffer): string {
  // 简化方案：直接通过 mammoth 走 DOCX，xlsx 走 xlsx 包，PPTX/老 DOC 暂返回空
  return ""
}

async function extractTextFromPDF(buf: Buffer): Promise<string> {
  try {
    // pdf-data-parser 兼容 API：默认导出 PDFParser 类
    const mod = await import("pdf-data-parser").catch(() => null) as any
    if (!mod) {
      console.warn("[knowledge/upload] pdf-data-parser not available")
      return ""
    }
    const PDFParser = mod.PDFParser || mod.default?.PDFParser || mod.default
    if (!PDFParser) return ""
    const parser = new PDFParser()
    return await new Promise<string>((resolve) => {
      let text = ""
      parser.on("pdfParser_dataReady", (data: any) => {
        try {
          if (data?.Pages) {
            for (const page of data.Pages) {
              for (const t of page.Texts || []) {
                for (const r of t.R || []) {
                  text += decodeURIComponent(r.T || "") + " "
                }
              }
              text += "\n"
            }
          }
        } catch (e) {
          console.warn("[knowledge/upload] PDF parse error", e)
        }
        resolve(text.trim())
      })
      parser.on("pdfParser_dataError", () => resolve(""))
      try {
        parser.parseBuffer(buf)
      } catch {
        resolve("")
      }
    })
  } catch (e) {
    console.warn("[knowledge/upload] PDF extract failed:", e)
    return ""
  }
}

async function extractTextFromDOCX(buf: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth").catch(() => null) as any
    if (!mammoth) return ""
    const result = await mammoth.extractRawText({ buffer: buf })
    return result?.value || ""
  } catch (e) {
    console.warn("[knowledge/upload] DOCX extract failed:", e)
    return ""
  }
}

async function extractTextFromXLSX(buf: Buffer, maxRows: number): Promise<string> {
  try {
    const XLSX = await import("xlsx").catch(() => null) as any
    if (!XLSX) return ""
    const wb = XLSX.read(buf, { type: "buffer" })
    const lines: string[] = []
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName]
      lines.push(`[Sheet: ${sheetName}]`)
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][]
      // maxRows 走 admin knowledgeConfig.upload.xlsxMaxRows（防止超大表 OOM）
      for (const row of rows.slice(0, maxRows)) {
        if (!row || row.length === 0) continue
        lines.push(row.map(c => String(c ?? "")).join("\t"))
      }
      lines.push("")
    }
    return lines.join("\n")
  } catch (e) {
    console.warn("[knowledge/upload] XLSX extract failed:", e)
    return ""
  }
}

async function extractTextFromPPTX(buf: Buffer): Promise<string> {
  try {
    // PPTX 是 zip 包含 XML：使用 jszip-style 解压
    const JSZip = await import("jszip").catch(() => null) as any
    if (!JSZip) {
      // 退化方案：用 PDF 解析器可能无效，直接返回空
      return ""
    }
    const zip = await JSZip.loadAsync(buf)
    const slideFiles = Object.keys(zip.files)
      .filter(n => n.match(/ppt\/slides\/slide\d+\.xml$/))
      .sort((a, b) => {
        const na = Number(a.match(/slide(\d+)/)?.[1] || 0)
        const nb = Number(b.match(/slide(\d+)/)?.[1] || 0)
        return na - nb
      })
    const texts: string[] = []
    for (const f of slideFiles) {
      const xml = await zip.files[f].async("string")
      const stripped = xml
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
      if (stripped) texts.push(stripped)
    }
    return texts.join("\n\n")
  } catch (e) {
    console.warn("[knowledge/upload] PPTX extract failed:", e)
    return ""
  }
}

async function extractContent(
  mime: string,
  filename: string,
  buf: Buffer,
  options: { maxChars?: number; xlsxMaxRows?: number } = {}
): Promise<string | null> {
  const maxChars = options.maxChars ?? DEFAULT_MAX_EXTRACTED_CHARS
  const xlsxMaxRows = options.xlsxMaxRows ?? 2000
  if (ALLOWED_TEXT.has(mime)) {
    return truncate(buf.toString("utf-8"), maxChars)
  }
  const ext = filename.toLowerCase().match(/\.([a-zA-Z0-9]+)$/)?.[1] || ""
  try {
    if (mime === "application/pdf" || ext === "pdf") {
      return truncate(await extractTextFromPDF(buf), maxChars)
    }
    if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === "docx"
    ) {
      return truncate(await extractTextFromDOCX(buf), maxChars)
    }
    if (
      mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      ext === "xlsx"
    ) {
      return truncate(await extractTextFromXLSX(buf, xlsxMaxRows), maxChars)
    }
    if (
      mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      ext === "pptx"
    ) {
      return truncate(await extractTextFromPPTX(buf), maxChars)
    }
    // 老版 .doc / .xls / .ppt 不解析
    if (ext === "doc" || ext === "xls" || ext === "ppt") {
      return null
    }
  } catch (e) {
    console.warn("[knowledge/upload] extractContent failed:", e)
  }
  return null
}

function extFromMime(mime: string, filename: string): string {
  const mimeToExt: Record<string, string> = {
    "text/plain": ".txt",
    "text/markdown": ".md",
    "text/csv": ".csv",
    "text/html": ".html",
    "application/json": ".json",
    "application/xml": ".xml",
    "text/xml": ".xml",
    "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png",
    "image/gif": ".gif", "image/webp": ".webp", "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "audio/mpeg": ".mp3", "audio/mp3": ".mp3", "audio/wav": ".wav",
    "audio/ogg": ".ogg", "audio/webm": ".webm", "audio/aac": ".aac",
    "video/mp4": ".mp4", "video/webm": ".webm", "video/ogg": ".ogv", "video/quicktime": ".mov"
  }
  if (mimeToExt[mime]) return mimeToExt[mime]
  // 从文件名取扩展名
  const m = filename.match(/\.([a-zA-Z0-9]+)$/)
  return m ? "." + m[1].toLowerCase() : ".bin"
}

function detectContentType(mime: string): "note" | "text" | "image" | "document" | "pdf" | "audio" | "video" | "web_clip" | "link" {
  if (ALLOWED_TEXT.has(mime)) return mime === "text/markdown" ? "note" : "text"
  if (ALLOWED_IMAGE.has(mime)) return "image"
  if (mime === "application/pdf") return "pdf"
  if (ALLOWED_DOC.has(mime)) return "document"
  if (ALLOWED_AUDIO.has(mime)) return "audio"
  if (ALLOWED_VIDEO.has(mime)) return "video"
  return "document"
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file selected" }, { status: 400 })
    }
    const collectionId = formData.get("collection_id")
    const collectionIdNum = collectionId ? Number(collectionId) : null
    // 市场 KB 的条目 owner 必须用 publisher_id（collection.user_id），否则
    // 搜索的访问校验 (i.user_id = $1 OR EXISTS 订阅) 会把 publisher 自己挡在外面，
    // 且订阅用户虽能列出条目，但 publisher 无法检索到自己 KB 的内容。
    let ownerUserId = user.id
    if (collectionIdNum) {
      const col = await queryOne<{ user_id: number; is_marketplace: number; publisher_id: number | null }>(
        `SELECT user_id, is_marketplace, publisher_id FROM knowledge_collections WHERE id = $1 AND is_archived = 0`,
        [collectionIdNum]
      )
      if (col?.is_marketplace === 1) {
        const role = (user as any).role
        const isAdmin = role === "admin" || role === "super_admin"
        // admin / publisher 允许写入，条目 owner 始终用 publisher
        if (isAdmin || col.user_id === user.id || col.publisher_id === user.id) {
          ownerUserId = col.user_id
        } else {
          return NextResponse.json({ error: "无权限向该市场知识库添加条目" }, { status: 403 })
        }
      }
    }
    const tagsField = formData.get("tags")
    // tags 上限走 admin knowledgeConfig.limits.maxTagsPerItem（可后台调整）
    const kcForTags = await getKnowledgeConfig()
    const maxTags = kcForTags.limits.maxTagsPerItem
    const tags = tagsField
      ? String(tagsField).split(",").map(s => s.trim()).filter(Boolean).slice(0, maxTags)
      : []

    // 校验类型
    const mime = file.type || "application/octet-stream"
    const allowed = new Set([...ALLOWED_TEXT, ...ALLOWED_IMAGE, ...ALLOWED_DOC, ...ALLOWED_AUDIO, ...ALLOWED_VIDEO])
    if (!allowed.has(mime)) {
      return NextResponse.json({ error: `不支持的文件类型: ${mime}` }, { status: 400 })
    }

    // 大小限制（从 admin knowledgeConfig 读取，按文件类型分类）
    const kc = kcForTags
    const isVideo = ALLOWED_VIDEO.has(mime)
    const isAudio = ALLOWED_AUDIO.has(mime)
    const isImage = ALLOWED_IMAGE.has(mime)
    const isDoc = ALLOWED_DOC.has(mime)
    const isText = ALLOWED_TEXT.has(mime)
    const maxSize = isVideo ? kc.uploadLimits.video
      : isAudio ? kc.uploadLimits.audio
      : isImage ? kc.uploadLimits.image
      : isDoc ? kc.uploadLimits.document
      : isText ? kc.uploadLimits.text
      : kc.uploadLimits.other
    if (file.size > maxSize) {
      return NextResponse.json({
        error: `文件超过 ${Math.round(maxSize / 1024 / 1024)}MB 上限（可在 admin → 知识库配置中调整）`
      }, { status: 400 })
    }

    // 保存文件
    const uploadDir = path.join(process.cwd(), "public", "uploads", "knowledge", String(user.id))
    try {
      await fs.access(uploadDir)
    } catch {
      await fs.mkdir(uploadDir, { recursive: true })
    }
    const ext = extFromMime(mime, file.name)
    const filename = `kb-${user.id}-${Date.now()}${ext}`
    const filepath = path.join(uploadDir, filename)
    const bytes = await file.arrayBuffer()
    await fs.writeFile(filepath, Buffer.from(bytes))
    const fileUrl = `/uploads/knowledge/${user.id}/${filename}`

    // 提取文本内容（支持 PDF/DOCX/XLSX/PPTX/纯文本）
    // 可选高阶模式：useGLMOCR=true 时使用智谱 GLM-OCR 解析 PDF/图片（输出 markdown，识别表格/公式）
    // 是否启用 GLM-OCR 由 admin 配置 kc.glm.autoOcr 控制（用户可临时覆盖）
    const wantGLMOCR = formData.get("use_glm_ocr")
    const enableGLMOCR = wantGLMOCR !== null ? wantGLMOCR === "true" : kc.glm.autoOcr
    const isPdfOrImage = mime === "application/pdf" || ALLOWED_IMAGE.has(mime) || mime.startsWith("image/")
    let extractedContent: string | null = null
    let extractionMethod = ""
    if (enableGLMOCR && isPdfOrImage) {
      try {
        const { callGLMDocumentParsing } = await import("@/lib/ai/embedding-service")
        const cfg = await readProvidersConfig()
        const glmProvider = cfg.providers.find(p => p.type === "glm" && p.apiKey)
        if (glmProvider) {
          // 限制：图片/文档大小走 kc.glm.fileSizeLimits（admin 可在后台调整）
          const ocrMax = ALLOWED_IMAGE.has(mime) ? kc.glm.fileSizeLimits.image : kc.glm.fileSizeLimits.document
          if (file.size > ocrMax) {
            console.warn(`[knowledge/upload] file too large for GLM-OCR (${Math.round(file.size/1024/1024)}MB > ${Math.round(ocrMax/1024/1024)}MB), falling back to local parser`)
          } else {
            const dataUri = `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`
            const result = await callGLMDocumentParsing({
              apiKey: glmProvider.apiKey,
              file: dataUri,
              endPage: kc.glm.ocrMaxPages
            })
            if (result.markdown) {
              let md = result.markdown
              if (md.length > kc.glm.ocrMaxChars) {
                md = md.slice(0, kc.glm.ocrMaxChars) + "\n\n...(已截断)..."
              }
              extractedContent = md
              extractionMethod = "glm-ocr"
              console.log(`[knowledge/upload] GLM-OCR extracted ${result.markdown.length} chars from ${file.name} (${result.pages} pages)`)
            }
          }
        } else {
          console.warn("[knowledge/upload] GLM-OCR requested but no GLM provider configured, falling back")
        }
      } catch (e: any) {
        console.warn("[knowledge/upload] GLM-OCR failed, falling back to local parser:", e?.message)
      }
    }
    if (!extractedContent) {
      const buffer = Buffer.from(bytes)
      extractedContent = await extractContent(mime, file.name, buffer, {
        maxChars: kc.maxExtractedChars,
        xlsxMaxRows: kc.upload.xlsxMaxRows,
      })
      if (extractionMethod === "") {
        extractionMethod = mime === "application/pdf" ? "pdf-parser" :
          mime.includes("wordprocessingml") || file.name.toLowerCase().endsWith(".docx") ? "mammoth" :
          mime.includes("spreadsheetml") || file.name.toLowerCase().endsWith(".xlsx") ? "xlsx" :
          mime.includes("presentationml") || file.name.toLowerCase().endsWith(".pptx") ? "jszip" :
          mime.startsWith("text/") ? "text-utf8" : "none"
      }
    }

    // 创建条目
    const title = file.name.replace(/\.[^.]+$/, "")
    const contentType = detectContentType(mime)
    const itemId = await createItem({
      user_id: ownerUserId,
      title,
      content: extractedContent,
      content_type: contentType,
      collection_id: collectionIdNum,
      file_url: fileUrl,
      file_size: file.size,
      mime_type: mime,
      source_metadata: JSON.stringify({
        original_filename: file.name,
        uploaded_at: Date.now(),
        has_extracted_text: !!extractedContent,
        extracted_length: extractedContent?.length || 0
      }),
      tags,
      embedding_status: extractedContent ? "pending" : "skipped",
      change_summary: "上传文件"
    })

    // 是否自动向量化（由 admin kc.auto.autoEmbed 控制）
    // 注意：embeddingResult / embeddingError 必须在 if 外部声明，否则会被块作用域隔离
    let embeddingResult: { chunkCount: number; model: string } | null = null
    let embeddingError: string | null = null
    if (!kc.auto.autoEmbed) {
      console.log(`[knowledge/upload] autoEmbed disabled, skip embedding for item ${itemId}`)
    } else if (extractedContent && extractedContent.trim().length > 0) {
      // 同步触发 embedding（10s 软超时）
      // 这样用户上传后立刻可用 @知识库:xxx 引用，状态会写入 embedding_status
      try {
        const { embedItem } = await import("@/lib/ai/embedding-service")
        const { getItem } = await import("@/lib/db/knowledge-service")
        const item = await getItem(itemId, ownerUserId, false)
        if (item) {
          const embedPromise = embedItem(item, { userId: ownerUserId })
          const timeoutMs = kc.auto.embedTimeout * 1000
          const timeoutPromise = new Promise<{ chunkCount: number; model: string }>((_, reject) =>
            setTimeout(() => reject(new Error(`Embedding timeout (${kc.auto.embedTimeout}s)`)), timeoutMs)
          )
          const result = await Promise.race([embedPromise, timeoutPromise])
          embeddingResult = { chunkCount: result.chunkCount, model: result.model }
          await updateItem(itemId, ownerUserId, {
            embedding_model: result.model,
            embedding_status: "ready",
            change_type: "auto_embed",
            change_summary: `上传后自动生成 ${result.chunkCount} 个分块 (${result.model})`,
            create_version: false
          })
          console.log(`[knowledge/upload] Embedded ${result.chunkCount} chunks with ${result.model} for item ${itemId}`)
        }
      } catch (e: any) {
        embeddingError = e?.message || String(e)
        console.warn(`[knowledge/upload] embed failed:`, e)
        try {
          await updateItem(itemId, ownerUserId, {
            embedding_status: "failed",
            change_type: "embed_failed",
            change_summary: `Embedding 失败: ${embeddingError}`,
            create_version: false
          })
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      id: itemId,
      url: fileUrl,
      fileSize: file.size,
      mimeType: mime,
      contentType,
      extractedLength: extractedContent?.length || 0,
      hasContent: !!extractedContent,
      extractionMethod,
      embedding: embeddingResult
        ? { status: "ready", chunkCount: embeddingResult.chunkCount, model: embeddingResult.model }
        : extractedContent
        ? { status: "failed", error: embeddingError || "未知错误" }
        : { status: "skipped", reason: "未提取到文本内容" }
    })
  } catch (error: any) {
    console.error("Knowledge upload failed:", error)
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
  }
}
