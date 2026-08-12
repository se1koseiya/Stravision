/**
 * 用户搜索 API（用于邀请表单查找用户）
 *
 * GET /api/knowledge/users/search?q=KEYWORD
 *   - q 可以是 email / uid / username 前缀
 *   - 仅返回 UserPublic 字段，且排除当前用户
 *   - 上限 10 条
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db/database"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim().toLowerCase()
  if (q.length < 2) {
    return Response.json({ items: [] })
  }
  if (q.length > 80) {
    return jsonError("搜索关键词过长", 400)
  }

  const rows = await query<{
    id: number
    uid: string
    username: string
    email: string
    avatar_url: string | null
  }>(
    `SELECT id, uid, username, email, avatar_url
       FROM users
      WHERE id <> $1
        AND (
          LOWER(email) LIKE $2
          OR LOWER(uid) LIKE $2
          OR LOWER(username) LIKE $2
        )
      ORDER BY
        CASE
          WHEN LOWER(email) = $3 THEN 0
          WHEN LOWER(uid) = $3 THEN 1
          WHEN LOWER(username) = $3 THEN 2
          ELSE 3
        END,
        id ASC
      LIMIT 10`,
    [user.id, `%${q}%`, q]
  )

  return Response.json({
    items: rows.map((r) => ({
      id: r.id,
      uid: r.uid,
      username: r.username,
      email: r.email,
      avatar_url: r.avatar_url
    }))
  })
}
