/**
 * 知识库市场 - 详情 / 更新 / 删除
 *
 * GET    /api/knowledge/market/[id]   - 公开：详情（带订阅状态）
 * PATCH  /api/knowledge/market/[id]   - admin：更新
 * DELETE /api/knowledge/market/[id]   - admin：删除
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  getMarketCollection,
  updateMarketCollection,
  deleteMarketCollection
} from "@/lib/db/knowledge-service"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id: idStr } = await params
  const id = Number(idStr)
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id 非法" }, { status: 400 })
  const data = await getMarketCollection(user.id, id)
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const role = (user as any).role
  if (role !== "admin" && role !== "super_admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 })
  }
  const { id: idStr } = await params
  const id = Number(idStr)
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id 非法" }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    await updateMarketCollection(id, {
      name: body.name,
      description: body.description,
      category: body.category,
      cover_image: body.cover_image,
      color: body.color,
      icon: body.icon,
      official: body.official,
      is_archived: body.is_archived,
      popularity: body.popularity !== undefined ? Number(body.popularity) || 0 : undefined
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "更新失败" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const role = (user as any).role
  if (role !== "admin" && role !== "super_admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 })
  }
  const { id: idStr } = await params
  const id = Number(idStr)
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id 非法" }, { status: 400 })
  try {
    await deleteMarketCollection(id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "删除失败" }, { status: 500 })
  }
}
