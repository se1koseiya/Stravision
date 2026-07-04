/**
 * 知识库市场 - 我的订阅列表 + AI 可用 collection 列表
 *
 * GET /api/knowledge/market/my-subscriptions   - 已订阅
 * GET /api/knowledge/market/ai-collections    - 用户在 AI 上下文中可用的 collection
 *                                              （自己 + 已订阅 market，供 /<name> 自动补全）
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  listMySubscriptions,
  listAvailableCollectionsForAI
} from "@/lib/db/knowledge-service"

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const list = await listMySubscriptions(user.id)
  return NextResponse.json({ list, total: list.length })
}
