/**
 * 知识库权限共享 API
 *
 * GET    /api/knowledge/permissions?itemId=X | ?collectionId=X   列出我授予他人的权限
 * POST   /api/knowledge/permissions  body: { grantee_user_id, item_id?, collection_id?, permission?, expires_at? }
 * DELETE /api/knowledge/permissions?id=X
 *
 * 注意：实际查询受让人视角的条目列表时，需要扩展 listItems 以合并共享给当前用户的条目
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { listPermissions, grantPermission, revokePermission } from "@/lib/db/knowledge-service"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get("itemId")
  const collectionId = searchParams.get("collectionId")
  const perms = await listPermissions(user.id, {
    item_id: itemId ? Number(itemId) : undefined,
    collection_id: collectionId ? Number(collectionId) : undefined
  })
  return Response.json({ permissions: perms })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonError("请求体不是合法 JSON")
  }
  const granteeUserId = Number(body?.grantee_user_id || 0)
  if (!granteeUserId) return jsonError("grantee_user_id 必填")
  if (granteeUserId === user.id) return jsonError("不能授权给自己")
  if (!body?.item_id && !body?.collection_id) return jsonError("item_id 或 collection_id 至少一个")
  const validPerms = ["read", "write", "admin"]
  const permission = validPerms.includes(body?.permission) ? body.permission : "read"
  const id = await grantPermission(
    user.id,
    granteeUserId,
    { item_id: body.item_id, collection_id: body.collection_id },
    permission,
    body?.expires_at ?? null
  )
  return Response.json({ id, success: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get("id") || 0)
  if (!id) return jsonError("id 必填")
  const ok = await revokePermission(id, user.id)
  if (!ok) return jsonError("撤销失败或无权限", 404)
  return Response.json({ success: true })
}
