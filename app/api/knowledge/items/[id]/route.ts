/**
 * 单个知识条目 API
 *
 * GET    /api/knowledge/items/[id]    获取条目详情（自动 +1 view_count）
 * PATCH  /api/knowledge/items/[id]    更新条目（自动创建新版本）
 * DELETE /api/knowledge/items/[id]    删除条目
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  getItem,
  updateItem,
  deleteItem
} from "@/lib/db/knowledge-service"
import { queryOne } from "@/lib/db/database"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

/**
 * 如果当前用户是 admin / super_admin，定位条目实际 owner（用于市场 KB 条目管理）
 * 返回 { userId, isAdmin }，isAdmin=true 时 userId 是条目的真实 owner
 */
async function resolveItemOwnerId(itemId: number, currentUserId: number, currentRole: string): Promise<{ userId: number; isAdmin: boolean }> {
  const row = await queryOne<{ user_id: number }>(
    `SELECT user_id FROM knowledge_items WHERE id = $1`,
    [itemId]
  )
  if (!row) return { userId: currentUserId, isAdmin: false }
  const isAdmin = currentRole === "admin" || currentRole === "super_admin"
  return { userId: row.user_id, isAdmin }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const { id } = await params
  const itemId = Number(id)
  if (!itemId) return jsonError("id 必填")

  const item = await getItem(itemId, user.id, true)
  if (!item) return jsonError("条目不存在或无权限", 404)
  return Response.json({ item })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const { id } = await params
  const itemId = Number(id)
  if (!itemId) return jsonError("id 必填")

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonError("请求体不是合法 JSON")
  }

  // 默认更新时创建版本（除非显式关闭）
  const createVersion = body.create_version !== false

  // 如果是内容/标题/文件 URL 变更，自动触发 embedding
  const contentChanged = body.content !== undefined || body.title !== undefined || body.file_url !== undefined

  // admin 操作市场 KB 时，user.id 可能是 admin 而不是 publisher；用条目的真实 owner 调用 updateItem
  const { userId: ownerId } = await resolveItemOwnerId(itemId, user.id, (user as any).role)

  // 过滤掉 undefined 字段，避免 updateItem 把 undefined 写入 PG（会触发类型/约束错误）
  // 仅当字段在 body 中明确出现时才传递（null 是合法值，表示清除）
  const patch: any = {
    change_summary: body.change_summary,
    change_type: body.change_type,
    create_version: createVersion
  }
  for (const k of [
    "title", "content", "content_type", "collection_id", "file_url", "file_size",
    "mime_type", "source_url", "source_metadata", "summary", "access_level"
  ] as const) {
    if (k in body) patch[k] = body[k]
  }
  if (Array.isArray(body.tags)) patch.tags = body.tags
  if (body.is_favorite !== undefined) patch.is_favorite = !!body.is_favorite
  if (body.is_archived !== undefined) patch.is_archived = !!body.is_archived

  const ok = await updateItem(itemId, ownerId, patch)
  if (!ok) return jsonError("更新失败或无权限", 404)

  if (contentChanged) {
    void triggerReEmbed(itemId, ownerId)
  }
  return Response.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const { id } = await params
  const itemId = Number(id)
  if (!itemId) return jsonError("id 必填")
  const { userId: ownerId } = await resolveItemOwnerId(itemId, user.id, (user as any).role)
  const ok = await deleteItem(itemId, ownerId)
  if (!ok) return jsonError("删除失败或无权限", 404)
  return Response.json({ success: true })
}

async function triggerReEmbed(itemId: number, userId: number) {
  try {
    const { embedItem } = await import("@/lib/ai/embedding-service")
    const { getItem, updateItem } = await import("@/lib/db/knowledge-service")
    const item = await getItem(itemId, userId, false)
    if (!item) return
    const result = await embedItem(item, { userId })
    await updateItem(itemId, userId, {
      embedding_model: result.model,
      embedding_status: "ready",
      change_type: "auto_embed",
      change_summary: `更新后重新生成 ${result.chunkCount} 个分块`,
      create_version: false
    })
  } catch (e) {
    console.warn(`[knowledge/embed] item ${itemId} re-embed failed:`, e)
  }
}
