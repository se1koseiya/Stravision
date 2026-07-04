/**
 * AI 上下文可用的知识库 collection 列表（用户自己的 + 已订阅的市场 KB）
 * 用于 chat 输入 /<name> 指令的自动补全下拉
 *
 * GET /api/knowledge/market/ai-collections?search=xxx&limit=50
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { listAvailableCollectionsForAI } from "@/lib/db/knowledge-service"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || undefined
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 200)
  const list = await listAvailableCollectionsForAI(user.id, { search, limit })
  return NextResponse.json({ list, total: list.length })
}
