/**
 * Word 文档导入 API（覆盖式更新条目内容）
 *
 * POST /api/knowledge/items/[id]/import-docx
 *   multipart/form-data 字段 file：.docx 文件
 *
 * 行为：
 *   - 校验用户对该 item 有 write 权限
 *   - 用 mammoth 把 .docx 转 markdown
 *   - 覆盖 item.content 并写入历史版本
 *   - 写入操作日志
 *
 * 返回：{ success, markdown, title, warnings }
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getItem, updateItem } from "@/lib/db/knowledge-service"
import { hasPermission, logOperation } from "@/lib/db/kb-collaboration-service"
import { broadcastOperationLog } from "@/lib/server/kb-activity-bus"
import { listOperationLogs } from "@/lib/db/kb-collaboration-service"
import { docxToMarkdown } from "@/lib/ai/word-document-service"
import { queryOne } from "@/lib/db/database"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

function getClientInfo(req: NextRequest) {
  return {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
    user_agent: req.headers.get("user-agent") || null
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)

  const { id } = await params
  const itemId = Number(id)
  if (!itemId) return jsonError("无效的 item id", 400)

  // 解析 multipart
  const formData = await req.formData().catch(() => null)
  if (!formData) return jsonError("需要 multipart/form-data")
  const file = formData.get("file")
  if (!(file instanceof File)) return jsonError("未找到 file 字段")

  // 校验文件类型
  const name = (file.name || "").toLowerCase()
  if (!name.endsWith(".docx")) {
    return jsonError("仅支持 .docx 文件")
  }
  if (file.size > 20 * 1024 * 1024) {
    return jsonError("文件过大（最大 20MB）")
  }

  // 校验权限：item owner 或 集合 editor/admin
  const item = await getItem(itemId, user.id)
  let canWrite = false
  let collectionId: number | null = null
  let ownerUserId = user.id
  if (item) {
    collectionId = item.collection_id ?? null
    ownerUserId = item.user_id
    canWrite = true
  } else {
    const row = await queryOne<{ collection_id: number | null; user_id: number; title: string; content: string | null }>(
      "SELECT collection_id, user_id, title, content FROM knowledge_items WHERE id = $1",
      [itemId]
    )
    if (!row) return jsonError("文档不存在", 404)
    collectionId = row.collection_id ? Number(row.collection_id) : null
    ownerUserId = Number(row.user_id)
    if (collectionId != null) {
      canWrite = await hasPermission(collectionId, user.id, "write")
    }
    // 系统管理员允许写入
    if (!canWrite && (user.role === "admin" || user.role === "super_admin")) {
      canWrite = true
    }
  }
  if (!canWrite) return jsonError("无写入权限", 403)

  // 读取文件内容
  const arrayBuf = await file.arrayBuffer()
  const buf = Buffer.from(arrayBuf)

  let conv: Awaited<ReturnType<typeof docxToMarkdown>>
  try {
    conv = await docxToMarkdown(buf)
  } catch (e: any) {
    console.error("[import-docx] docxToMarkdown error:", e.message)
    return jsonError("Word 文档解析失败：" + e.message, 500)
  }

  // 更新 item content（同时保留原 title，仅当原 title 为空或为"未命名"时使用提取的 title）
  const currentItemTitle = item?.title ?? (await queryOne<{ title: string }>(
    "SELECT title FROM knowledge_items WHERE id = $1",
    [itemId]
  ))?.title || ""
  const newTitle =
    !currentItemTitle || currentItemTitle === "未命名文档" || currentItemTitle === ""
      ? conv.title || currentItemTitle || "导入文档"
      : currentItemTitle

  // 使用 item 的实际 owner user_id 调用 updateItem（保证协作者编辑能写入）
  await updateItem(itemId, ownerUserId, {
    title: newTitle,
    content: conv.markdown,
    change_summary: "从 Word 文档导入"
  })

  // 操作日志
  await logOperation({
    userId: user.id,
    action: "import_document",
    collectionId: collectionId ?? null,
    itemId,
    targetType: "item",
    targetId: itemId,
    metadata: {
      format: "docx",
      original_filename: file.name,
      file_size: file.size,
      warnings_count: conv.warnings.length
    },
    visibility: "collection",
    context: getClientInfo(req)
  })

  // 广播
  if (collectionId != null) {
    const { items } = await listOperationLogs({ collectionId, limit: 1 })
    if (items[0]) await broadcastOperationLog(items[0])
  }

  return Response.json({
    success: true,
    markdown: conv.markdown,
    title: newTitle,
    warnings: conv.warnings
  })
}
