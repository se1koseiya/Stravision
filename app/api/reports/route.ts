/**
 * 简报/我的空间 API
 *
 * GET  /api/reports                  列出当前用户简报（支持 ?since=ms&favorite=1&limit=N）
 * POST /api/reports                  新建一条简报（自动去重，5 秒内同 user+source+title 不重复）
 * DELETE /api/reports?id=X          删除一条简报（带 user_id 校验）
 * PATCH /api/reports                 切换收藏（body: { id, favorite }）
 */
export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  createUserReport,
  deleteUserReport,
  listUserReports,
  listUserReportsSince,
  toggleUserReportFavorite,
  type UserReportSource,
  type UserReportType
} from "@/lib/db/user-reports-service"

const VALID_SOURCES: UserReportSource[] = [
  "manual",
  "scheduled_task",
  "ai_cron",
  "chat",
  "import"
]
const VALID_TYPES: UserReportType[] = [
  "report",
  "task",
  "file",
  "audio",
  "creation",
  "image",
  "video"
]

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)

  const { searchParams } = new URL(req.url)
  const since = Number(searchParams.get("since") || 0)
  const favorite = searchParams.get("favorite") === "1"
  const limit = Number(searchParams.get("limit") || 50)

  if (Number.isFinite(since) && since > 0) {
    const items = await listUserReportsSince(user.id, since, Math.min(limit, 50))
    return Response.json({ items, serverTime: Date.now() })
  }
  const items = await listUserReports(user.id, {
    limit,
    onlyFavorite: favorite
  })
  return Response.json({ items, serverTime: Date.now() })
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

  const title: string = (body?.title || "").toString().trim()
  const html: string = (body?.html || "").toString()
  if (!title) return jsonError("title 必填")
  if (!html || html.length < 2) return jsonError("html 必填且不能为空")
  if (html.length > 5_000_000) return jsonError("html 内容超过 5MB 上限")

  const source: UserReportSource = VALID_SOURCES.includes(body?.source)
    ? body.source
    : "manual"
  const type: UserReportType = VALID_TYPES.includes(body?.type) ? body.type : "report"
  const sourceId = body?.source_id ? String(body.source_id) : null
  const summary = body?.summary ? String(body.summary).slice(0, 500) : null

  const id = await createUserReport({
    user_id: user.id,
    title: title.slice(0, 200),
    html,
    source,
    source_id: sourceId,
    summary,
    type
  })

  return Response.json({ ok: true, id, serverTime: Date.now() })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get("id") || 0)
  if (!id) return jsonError("缺少 id")
  const ok = await deleteUserReport(user.id, id)
  if (!ok) return jsonError("简报不存在或已删除", 404)
  return Response.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonError("请求体不是合法 JSON")
  }
  const id = Number(body?.id || 0)
  if (!id) return jsonError("缺少 id")
  const favorite = await toggleUserReportFavorite(user.id, id)
  if (favorite === null) return jsonError("简报不存在", 404)
  return Response.json({ ok: true, favorite })
}
