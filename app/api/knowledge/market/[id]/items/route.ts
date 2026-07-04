/**
 * 知识库市场 - 列出 market collection 的条目
 * 用户必须已订阅（或自己是 publisher）才能看到内容
 *
 * GET /api/knowledge/market/[id]/items
 *   query: limit, offset
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getKnowledgeConfig } from "@/lib/ai/provider-resolver"
import { query, queryOne } from "@/lib/db/database"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id: idStr } = await params
  const id = Number(idStr)
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id 非法" }, { status: 400 })

  // 权限：admin / publisher / 已订阅用户可看
  const col = await queryOne<{ user_id: number; is_marketplace: number }>(
    `SELECT user_id, is_marketplace FROM knowledge_collections WHERE id = $1 AND is_archived = 0`,
    [id]
  )
  if (!col || col.is_marketplace !== 1) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const role = (user as any).role
  const isAdmin = role === "admin" || role === "super_admin"
  const isOwner = col.user_id === user.id
  if (!isAdmin && !isOwner) {
    const sub = await queryOne<{ id: number }>(
      `SELECT id FROM knowledge_market_subscriptions WHERE user_id = $1 AND collection_id = $2`,
      [user.id, id]
    )
    if (!sub) {
      return NextResponse.json({ error: "请先订阅后再查看内容" }, { status: 403 })
    }
  }

  const kc = await getKnowledgeConfig()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || kc.list.defaultLimit), 1), kc.list.maxLimit)
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0)

  const rows = await query<any>(
    `SELECT i.id, i.title, i.summary, i.content_type, i.file_url, i.mime_type, i.file_size,
            i.embedding_status, i.view_count, i.tags_cache, i.created_at, i.updated_at
       FROM knowledge_items i
       WHERE i.collection_id = $1 AND i.is_archived = 0
       ORDER BY i.updated_at DESC
       LIMIT $2 OFFSET $3`,
    [id, limit, offset]
  )
  return NextResponse.json({ list: rows, total: rows.length, limit, offset })
}
