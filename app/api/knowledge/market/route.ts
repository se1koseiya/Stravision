/**
 * 知识库市场 - 列表 / 创建
 *
 * GET  /api/knowledge/market
 *   - 列出已发布的市场知识库 collection（带订阅状态）
 *   - query: search / category / sort / limit / offset / scope (all | mine)
 *
 * POST /api/knowledge/market
 *   - admin 创建市场 KB（需 is_admin）
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  listMarketCollections,
  createMarketCollection,
  listMarketCategories
} from "@/lib/db/knowledge-service"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || undefined
    const category = searchParams.get("category") || undefined
    const sort = (searchParams.get("sort") || "published_at") as "published_at" | "popularity" | "created_at"
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 200)
    const offset = Math.max(Number(searchParams.get("offset") || 0), 0)
    const scope = searchParams.get("scope") || "all" // all | mine

    const [list, categories] = await Promise.all([
      listMarketCollections(user.id, {
        search, category, sort, limit, offset,
        ownerOnly: scope === "mine"
      }),
      listMarketCategories()
    ])
    return NextResponse.json({ list, categories, total: list.length })
  } catch (e: any) {
    console.error("[knowledge/market GET]", e)
    return NextResponse.json({ error: e.message || "查询失败" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  // 仅 admin / super_admin 可创建市场 KB
  const role = (user as any).role
  if (role !== "admin" && role !== "super_admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const name = String(body?.name || "").trim()
    if (!name) return NextResponse.json({ error: "name 必填" }, { status: 400 })
    const id = await createMarketCollection({
      publisher_id: user.id,
      name,
      description: body.description ?? null,
      category: body.category || "general",
      cover_image: body.cover_image || null,
      color: body.color || "#1677ff",
      icon: body.icon || "book",
      official: !!body.official,
      popularity: Number(body.popularity) || 0
    })
    return NextResponse.json({ success: true, id })
  } catch (e: any) {
    console.error("[knowledge/market POST]", e)
    return NextResponse.json({ error: e.message || "创建失败" }, { status: 500 })
  }
}
