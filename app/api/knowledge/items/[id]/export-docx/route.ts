/**
 * Word 文档导出 API
 *
 * GET /api/knowledge/items/[id]/export-docx
 *   读取该条目的 content（Markdown 文本），转换为 .docx 并以文件下载形式返回。
 *
 * 鉴权：item owner 或 集合 read 权限
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getItem } from "@/lib/db/knowledge-service"
import { hasPermission } from "@/lib/db/kb-collaboration-service"
import { logOperation } from "@/lib/db/kb-collaboration-service"
import { broadcastOperationLog } from "@/lib/server/kb-activity-bus"
import { markdownToDocx } from "@/lib/ai/word-document-service"
import { listOperationLogs } from "@/lib/db/kb-collaboration-service"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

function getClientInfo(req: NextRequest) {
  return {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
    user_agent: req.headers.get("user-agent") || null
  }
}

function sanitizeFilename(name: string): string {
  const trimmed = (name || "document").trim().replace(/[\\/:*?"<>|]/g, "_").slice(0, 100)
  return trimmed || "document"
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)

  const { id } = await params
  const itemId = Number(id)
  if (!itemId) return jsonError("无效的 item id", 400)

  const item = await getItem(itemId, user.id)
  if (!item) {
    // 校验集合协作者是否能读
    const { queryOne } = await import("@/lib/db/database")
    const row = await queryOne<{ collection_id: number | null; user_id: number; title: string; content: string | null }>(
      "SELECT collection_id, user_id, title, content FROM knowledge_items WHERE id = $1",
      [itemId]
    )
    if (!row) return jsonError("文档不存在", 404)
    let canRead = false
    if (row.collection_id != null) {
      canRead = await hasPermission(Number(row.collection_id), user.id, "read")
    }
    if (!canRead) return jsonError("无权访问此文档", 403)

    // 重新组装 item
    const itemData = {
      id: itemId,
      user_id: Number(row.user_id),
      collection_id: row.collection_id ? Number(row.collection_id) : null,
      title: row.title,
      content: row.content
    } as any
    return await exportItem(req, user, itemData)
  }

  return await exportItem(req, user, item as any)
}

async function exportItem(req: NextRequest, user: any, item: any) {
  const md = item.content || `# ${item.title}\n\n（空文档）`
  let buf: Buffer
  try {
    buf = await markdownToDocx(md)
  } catch (e: any) {
    console.error("[export-docx] markdownToDocx error:", e.message)
    return jsonError("Word 文档生成失败：" + e.message, 500)
  }

  // 写入操作日志
  await logOperation({
    userId: user.id,
    action: "export_document",
    collectionId: item.collection_id ?? null,
    itemId: item.id,
    targetType: "item",
    targetId: item.id,
    metadata: { format: "docx" },
    visibility: "collection",
    context: getClientInfo(req)
  })

  // 广播活动
  if (item.collection_id != null) {
    const { items } = await listOperationLogs({ collectionId: item.collection_id, limit: 1 })
    if (items[0]) await broadcastOperationLog(items[0])
  }

  const filename = sanitizeFilename(item.title || "document") + ".docx"
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(buf.length)
    }
  })
}
