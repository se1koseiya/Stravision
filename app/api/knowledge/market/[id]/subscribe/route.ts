/**
 * 知识库市场 - 订阅 / 取消订阅（虚拟订阅）
 *
 * POST   /api/knowledge/market/[id]/subscribe  - 订阅
 * DELETE /api/knowledge/market/[id]/subscribe  - 取消订阅
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  subscribeMarketCollection,
  unsubscribeMarketCollection
} from "@/lib/db/knowledge-service"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id: idStr } = await params
  const id = Number(idStr)
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id 非法" }, { status: 400 })
  const ok = await subscribeMarketCollection(user.id, id)
  if (!ok) return NextResponse.json({ error: "订阅失败：KB 不存在或已下架" }, { status: 404 })
  return NextResponse.json({ success: true, is_subscribed: 1 })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id: idStr } = await params
  const id = Number(idStr)
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id 非法" }, { status: 400 })
  await unsubscribeMarketCollection(user.id, id)
  return NextResponse.json({ success: true, is_subscribed: 0 })
}
