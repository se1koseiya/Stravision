/**
 * Yjs 文档持久化 API
 *
 * GET  /api/knowledge/documents/[itemId]      加载文档状态（二进制 + 版本号）
 * POST /api/knowledge/documents/[itemId]      保存文档状态（覆盖式）
 *      body: { doc_state: base64 string, last_editor_id?: number }
 *
 * 鉴权：用户对该 item 所属集合至少有 read 权限（GET）或 write 权限（POST）
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { loadYjsDocument, saveYjsDocument } from "@/lib/db/kb-collaboration-service"
import { queryOne } from "@/lib/db/database"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

async function resolveItemCollection(itemId: number): Promise<{ collection_id: number | null; user_id: number } | null> {
  const row = await queryOne<{ collection_id: number | null; user_id: number }>(
    "SELECT collection_id, user_id FROM knowledge_items WHERE id = $1",
    [itemId]
  )
  return row ? { collection_id: row.collection_id, user_id: Number(row.user_id) } : null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)

  const { itemId: itemIdStr } = await params
  const itemId = Number(itemIdStr)
  if (!itemId) return jsonError("无效的 itemId", 400)

  const item = await resolveItemCollection(itemId)
  if (!item) return jsonError("文档不存在", 404)

  // 校验权限：item owner 或 集合协作者
  let canRead = item.user_id === user.id
  if (!canRead && item.collection_id != null) {
    const { hasPermission } = await import("@/lib/db/kb-collaboration-service")
    canRead = await hasPermission(item.collection_id, user.id, "read")
  }
  if (!canRead) return jsonError("无权访问此文档", 403)

  const result = await loadYjsDocument(itemId)
  return Response.json({
    doc_state: result.docState ? Buffer.from(result.docState).toString("base64") : null,
    version: result.version,
    last_editor_id: result.lastEditorId,
    last_edit_at: result.lastEditAt
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)

  const { itemId: itemIdStr } = await params
  const itemId = Number(itemIdStr)
  if (!itemId) return jsonError("无效的 itemId", 400)

  const item = await resolveItemCollection(itemId)
  if (!item) return jsonError("文档不存在", 404)

  // 写权限：item owner 或 集合 editor/admin
  let canWrite = item.user_id === user.id
  if (!canWrite && item.collection_id != null) {
    const { hasPermission } = await import("@/lib/db/kb-collaboration-service")
    canWrite = await hasPermission(item.collection_id, user.id, "write")
  }
  if (!canWrite) return jsonError("无写入权限", 403)

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonError("请求体不是合法 JSON")
  }

  const docStateB64 = body?.doc_state ? String(body.doc_state) : ""
  if (!docStateB64) return jsonError("doc_state 必填（base64）")

  let docState: Buffer
  try {
    docState = Buffer.from(docStateB64, "base64")
  } catch {
    return jsonError("doc_state 不是合法 base64")
  }

  const editorId = body?.last_editor_id != null ? Number(body.last_editor_id) : user.id
  await saveYjsDocument(itemId, docState, editorId)

  return Response.json({ success: true })
}
