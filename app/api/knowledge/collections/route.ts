/**
 * 知识库集合 API
 *
 * GET  /api/knowledge/collections        列出当前用户所有集合
 * POST /api/knowledge/collections        创建新集合
 * PATCH /api/knowledge/collections?id=X  更新集合
 * DELETE /api/knowledge/collections?id=X 删除集合（条目自动归入 root）
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  listCollections,
  createCollection,
  updateCollection,
  deleteCollection
} from "@/lib/db/knowledge-service"
import { getKnowledgeConfig } from "@/lib/ai/provider-resolver"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)

  const { searchParams } = new URL(req.url)
  const includeArchived = searchParams.get("includeArchived") === "1"
  const parentIdParam = searchParams.get("parentId")
  const parentId = parentIdParam === "null" ? null : parentIdParam ? Number(parentIdParam) : undefined

  const items = await listCollections(user.id, { includeArchived, parentId })
  return Response.json({ items })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const kc = await getKnowledgeConfig()

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonError("请求体不是合法 JSON")
  }

  const name = (body?.name || "").toString().trim()
  if (!name) return jsonError("name 必填")
  if (name.length > kc.limits.collectionNameMax) return jsonError(`name 长度不能超过 ${kc.limits.collectionNameMax}`)

  const id = await createCollection({
    user_id: user.id,
    name,
    description: body.description ?? null,
    parent_id: body.parent_id ?? null,
    color: body.color,
    icon: body.icon,
    sort_order: body.sort_order
  })
  return Response.json({ id, success: true })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get("id") || 0)
  if (!id) return jsonError("id 必填")

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonError("请求体不是合法 JSON")
  }

  const ok = await updateCollection(id, user.id, {
    name: body.name,
    description: body.description,
    color: body.color,
    icon: body.icon,
    sort_order: body.sort_order,
    is_archived: body.is_archived !== undefined ? (body.is_archived ? 1 : 0) : undefined,
    parent_id: body.parent_id
  })
  if (!ok) return jsonError("更新失败或无权限", 404)
  return Response.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get("id") || 0)
  if (!id) return jsonError("id 必填")
  const ok = await deleteCollection(id, user.id)
  if (!ok) return jsonError("删除失败或无权限", 404)
  return Response.json({ success: true })
}
