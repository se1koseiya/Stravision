/**
 * 手动触发知识条目 embedding 重新生成 API
 *
 * POST /api/knowledge/items/[id]/embed
 *  - 删除旧 chunks 并重新分块、生成 embedding
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getItem, updateItem } from "@/lib/db/knowledge-service"
import { embedItem } from "@/lib/ai/embedding-service"
import { queryOne } from "@/lib/db/database"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const { id } = await params
  const itemId = Number(id)
  if (!itemId) return jsonError("id 必填")

  // admin 角色允许对市场 KB 条目重新 embedding
  const role = (user as any).role
  const isAdmin = role === "admin" || role === "super_admin"
  const ownerRow = await queryOne<{ user_id: number }>(
    `SELECT user_id FROM knowledge_items WHERE id = $1`,
    [itemId]
  )
  if (!ownerRow) return jsonError("条目不存在", 404)
  const ownerId = isAdmin ? ownerRow.user_id : user.id

  const item = await getItem(itemId, ownerId, false)
  if (!item) return jsonError("条目不存在或无权限", 404)

  try {
    const result = await embedItem(item, { userId: ownerId })
    await updateItem(itemId, ownerId, {
      embedding_model: result.model,
      embedding_status: "ready",
      change_type: "manual_embed",
      change_summary: `手动重新生成 ${result.chunkCount} 个分块`,
      create_version: false
    })
    return Response.json({ success: true, ...result })
  } catch (e: any) {
    await updateItem(itemId, ownerId, {
      embedding_status: "failed",
      change_type: "manual_embed",
      change_summary: `embedding 失败: ${e?.message || "未知错误"}`,
      create_version: false
    })
    return jsonError(`embedding 失败: ${e?.message}`, 500)
  }
}
