/**
 * 知识库邀请 API
 *
 * GET  /api/knowledge/invitations                列出当前用户相关邀请
 *      ?direction=received|sent (默认 received)
 *      ?status=pending|accepted|rejected|cancelled|expired|all (默认 pending)
 *      ?limit=50
 * POST /api/knowledge/invitations                发送新邀请
 *      body: { collection_id, invitee_id?, email?, uid?, role, message? }
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  createInvitation,
  listInvitationsReceived,
  listInvitationsSent,
  logOperation,
  type CollaboratorRole,
  type InvitationStatus
} from "@/lib/db/kb-collaboration-service"
import { hasPermission } from "@/lib/db/kb-collaboration-service"
import { broadcastOperationLog } from "@/lib/server/kb-activity-bus"
import { publishUserEvent } from "@/lib/server/user-event-bus"
import { getUserByEmail, getUserById } from "@/lib/db/user-service"
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

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)

  const { searchParams } = new URL(req.url)
  const direction = searchParams.get("direction") === "sent" ? "sent" : "received"
  const status = (searchParams.get("status") as InvitationStatus | "all") || "pending"
  const limit = Number(searchParams.get("limit")) || 50

  if (direction === "sent") {
    const items = await listInvitationsSent(user.id, { status, limit })
    return Response.json({ items })
  }
  const items = await listInvitationsReceived(user.id, { status, limit })
  return Response.json({ items })
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

  const collectionId = Number(body?.collection_id || 0)
  if (!collectionId) return jsonError("collection_id 必填")

  const role = (body?.role || "editor") as CollaboratorRole
  if (!["admin", "editor", "viewer"].includes(role)) {
    return jsonError("role 必须为 admin/editor/viewer")
  }
  const message = body?.message ? String(body.message).slice(0, 500) : null

  try {
    // 鉴权：仅 owner/admin 能发送邀请
    const canInvite = await hasPermission(collectionId, user.id, "admin")
    if (!canInvite) {
      return jsonError("无权限：仅 owner/admin 可发送邀请", 403)
    }

    // 解析 invitee：优先 invitee_id，其次 email，再次 uid
    let inviteeId = Number(body?.invitee_id) || 0
    if (!inviteeId) {
      const email = body?.email ? String(body.email).trim().toLowerCase() : ""
      const uid = body?.uid ? String(body.uid).trim() : ""
      if (email) {
        const u = await getUserByEmail(email)
        if (u) inviteeId = u.id
      } else if (uid) {
        // 通过 uid 查找：lib/db/user-service 未提供 getUserByUid，使用 SQL 查询
        const { queryOne } = await import("@/lib/db/database")
        const row = await queryOne<{ id: number }>("SELECT id FROM users WHERE uid = $1", [uid])
        if (row) inviteeId = Number(row.id)
      }
      if (!inviteeId) {
        return jsonError("未找到对应用户", 404)
      }
    }

    // 不允许邀请自己
    if (inviteeId === user.id) {
      return jsonError("不能邀请自己", 400)
    }

    // 校验 invitee 存在
    const invitee = await getUserById(inviteeId)
    if (!invitee) return jsonError("被邀请用户不存在", 404)

    const result = await createInvitation({
      collectionId,
      inviterId: user.id,
      inviteeId,
      role,
      message
    })

    if (result.status === "already_member") {
      return Response.json({ id: 0, status: "already_member", message: "该用户已是协作者" })
    }
    if (result.status === "already_pending") {
      return Response.json({ id: result.id, status: "already_pending", message: "已有待处理邀请" })
    }
    if (result.status === "self") {
      return jsonError("不能邀请自己", 400)
    }
    if (result.status === "invalid_role") {
      return jsonError("无效的角色", 400)
    }
    if (result.status === "forbidden") {
      return jsonError("无权限：仅 owner/admin 可发送邀请", 403)
    }

    // 写入操作日志
    const logId = await logOperation({
      userId: user.id,
      action: "invite_user",
      collectionId,
      targetType: "user",
      targetId: inviteeId,
      metadata: { role, message, invitation_id: result.id },
      visibility: "collection",
      context: getClientInfo(req)
    })

    // 广播到活动总线：取最新一条日志（即上面插入的）广播给该集合订阅者
    try {
      const { listOperationLogs } = await import("@/lib/db/kb-collaboration-service")
      const { items } = await listOperationLogs({ collectionId, limit: 1 })
      if (items[0]) {
        await broadcastOperationLog(items[0])
      }

      // 推送实时通知给被邀请方（让对方的浏览器立刻知道有新邀请）
      const colRow = await queryOne<{ name: string }>(
        "SELECT name FROM knowledge_collections WHERE id = $1",
        [collectionId]
      )
      const collectionName = colRow?.name || "未命名集合"
      publishUserEvent({
        type: "new_invitation",
        userId: inviteeId,
        invitation: {
          id: result.id,
          collection_id: collectionId,
          collection_name: collectionName,
          inviter_id: user.id,
          inviter_name: user.username,
          inviter_avatar: user.avatar_url || null,
          role,
          message,
          created_at: Date.now()
        }
      })
    } catch (e: any) {
      // 广播失败不影响邀请本身
      console.warn("[invitations] broadcast failed:", e?.message)
    }

    return Response.json({ id: result.id, status: "created", success: true })
  } catch (err: any) {
    console.error("[POST /api/knowledge/invitations] error:", err)
    return Response.json(
      { error: `服务器内部错误：${err?.message || String(err)}` },
      { status: 500 }
    )
  }
}
