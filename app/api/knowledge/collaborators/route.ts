/**
 * 知识库协作者 API
 *
 * GET    /api/knowledge/collaborators?collection_id=X      列出某集合的协作者
 * PATCH  /api/knowledge/collaborators?collection_id=X&user_id=Y   变更角色
 *        body: { role: "admin" | "editor" | "viewer" }
 * DELETE /api/knowledge/collaborators?collection_id=X&user_id=Y    移除协作者
 *
 * 鉴权：所有操作至少需要 admin 权限（owner 自动满足）
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  listCollaborators,
  updateCollaboratorRole,
  removeCollaborator,
  hasPermission,
  logOperation,
  type CollaboratorRole
} from "@/lib/db/kb-collaboration-service"
import { broadcastOperationLog } from "@/lib/server/kb-activity-bus"
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

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)

  const { searchParams } = new URL(req.url)
  const collectionId = Number(searchParams.get("collection_id") || 0)
  if (!collectionId) return jsonError("collection_id 必填")

  // 至少需要读权限
  const canRead = await hasPermission(collectionId, user.id, "read")
  if (!canRead) return jsonError("无权限查看此集合的协作者", 403)

  const items = await listCollaborators(collectionId)
  return Response.json({ items })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)

  const { searchParams } = new URL(req.url)
  const collectionId = Number(searchParams.get("collection_id") || 0)
  const targetUserId = Number(searchParams.get("user_id") || 0)
  if (!collectionId || !targetUserId) return jsonError("collection_id 和 user_id 必填")

  // 不能修改自己的角色（避免自己降权后失去管理能力）
  if (targetUserId === user.id) {
    return jsonError("不能修改自己的角色", 400)
  }

  const canManage = await hasPermission(collectionId, user.id, "admin")
  if (!canManage) return jsonError("无权限：仅 owner/admin 可变更角色", 403)

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonError("请求体不是合法 JSON")
  }

  const newRole = (body?.role || "") as CollaboratorRole
  if (!["admin", "editor", "viewer"].includes(newRole)) {
    return jsonError("role 必须为 admin/editor/viewer")
  }

  const ok = await updateCollaboratorRole(collectionId, targetUserId, newRole)
  if (!ok) return jsonError("变更失败：目标不存在或为 owner", 404)

  await logOperation({
    userId: user.id,
    action: "update_role",
    collectionId,
    targetType: "collaborator",
    targetId: targetUserId,
    metadata: { new_role: newRole },
    visibility: "collection",
    context: getClientInfo(req)
  })

  const { items } = await listOperationLogs({ collectionId, limit: 1 })
  if (items[0]) await broadcastOperationLog(items[0])

  return Response.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)

  const { searchParams } = new URL(req.url)
  const collectionId = Number(searchParams.get("collection_id") || 0)
  const targetUserId = Number(searchParams.get("user_id") || 0)
  if (!collectionId || !targetUserId) return jsonError("collection_id 和 user_id 必填")

  // 不能移除自己
  if (targetUserId === user.id) {
    return jsonError("不能移除自己（如需退出请联系 owner）", 400)
  }

  const canManage = await hasPermission(collectionId, user.id, "admin")
  if (!canManage) return jsonError("无权限：仅 owner/admin 可移除协作者", 403)

  const ok = await removeCollaborator(collectionId, targetUserId)
  if (!ok) return jsonError("移除失败：目标不存在或为 owner", 404)

  await logOperation({
    userId: user.id,
    action: "remove_collaborator",
    collectionId,
    targetType: "collaborator",
    targetId: targetUserId,
    metadata: {},
    visibility: "collection",
    context: getClientInfo(req)
  })

  const { items } = await listOperationLogs({ collectionId, limit: 1 })
  if (items[0]) await broadcastOperationLog(items[0])

  return Response.json({ success: true })
}
