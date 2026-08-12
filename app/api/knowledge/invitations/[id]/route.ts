/**
 * 单条邀请 API
 *
 * GET    /api/knowledge/invitations/[id]      获取详情
 * POST   /api/knowledge/invitations/[id]      响应或取消邀请
 *        body: { action: "accept" | "reject" | "cancel" }
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  getInvitation,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
  logOperation
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)

  const { id } = await params
  const invitationId = Number(id)
  if (!invitationId) return jsonError("无效的邀请 id", 400)

  const invitation = await getInvitation(invitationId)
  if (!invitation) return jsonError("邀请不存在", 404)

  // 仅邀请者或被邀请者可读
  if (invitation.inviter_id !== user.id && invitation.invitee_id !== user.id) {
    return jsonError("无权查看此邀请", 403)
  }

  return Response.json({ invitation })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)

  const { id } = await params
  const invitationId = Number(id)
  if (!invitationId) return jsonError("无效的邀请 id", 400)

  let body: any
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const action = String(body?.action || "").toLowerCase()
  if (!["accept", "reject", "cancel"].includes(action)) {
    return jsonError("action 必须为 accept / reject / cancel", 400)
  }

  let result: { ok: boolean; reason?: string } | null = null
  let actionLogName: "accept_invitation" | "reject_invitation" | "cancel_invitation" = "cancel_invitation"

  if (action === "accept") {
    result = await acceptInvitation(invitationId, user.id)
    actionLogName = "accept_invitation"
  } else if (action === "reject") {
    result = await rejectInvitation(invitationId, user.id)
    actionLogName = "reject_invitation"
  } else {
    result = await cancelInvitation(invitationId, user.id)
    actionLogName = "cancel_invitation"
  }

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      not_found: 404,
      not_yours: 403,
      not_pending: 409,
      expired: 410,
      already_member: 409,
      invalid_role: 400,
      not_authorized: 403
    }
    // 携带详细诊断信息，便于排查身份不匹配问题
    let detail: any = undefined
    if (result.reason === "not_yours" || result.reason === "not_found") {
      const inv = await getInvitation(invitationId)
      detail = {
        current_user_id: user.id,
        current_username: user.username,
        invitation_exists: !!inv,
        invitee_id: inv?.invitee_id,
        inviter_id: inv?.inviter_id,
        status: inv?.status
      }
      console.warn("[invitations/%s] %s failed: %s", invitationId, action, JSON.stringify(detail))
    }
    return Response.json(
      { error: result.reason || "操作失败", detail },
      { status: statusMap[result.reason || ""] || 400 }
    )
  }

  // 写入操作日志
  const invitation = await getInvitation(invitationId)
  if (invitation) {
    const logId = await logOperation({
      userId: user.id,
      action: actionLogName,
      collectionId: invitation.collection_id,
      targetType: "invitation",
      targetId: invitationId,
      metadata: { role: invitation.role, counterparty_id: action === "cancel" ? invitation.invitee_id : invitation.inviter_id },
      visibility: "collection",
      context: getClientInfo(req)
    })

    // 广播到活动总线
    const { items } = await listOperationLogs({ collectionId: invitation.collection_id, limit: 1 })
    if (items[0]) {
      await broadcastOperationLog(items[0])
    }
  }

  return Response.json({ success: true })
}
