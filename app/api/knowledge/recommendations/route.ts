/**
 * 知识库推荐 API
 *
 * GET /api/knowledge/recommendations?limit=10&type=history|similar
 *  - history: 基于用户查询历史的协同过滤推荐
 *  - similar: 基于内容相似度（需要 itemId 参数）
 *  - cached: 读取预计算的 knowledge_recommendations 表
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  recommendFromHistory,
  recommendSimilar
} from "@/lib/ai/knowledge-search"
import { listRecommendations } from "@/lib/db/knowledge-service"
import { getKnowledgeConfig } from "@/lib/ai/provider-resolver"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const kc = await getKnowledgeConfig()
  const { searchParams } = new URL(req.url)
  const type = (searchParams.get("type") || "history").toLowerCase()
  // limit 默认值/上限 走 admin knowledgeConfig.search.recommendMaxResults
  // 上限走 admin knowledgeConfig.search.requestOvershootMultiplier
  const defaultLimit = kc.search.recommendMaxResults
  const k = kc.search.requestOvershootMultiplier
  const maxLimit = Math.max(defaultLimit * k, kc.ui.maxRecommendationCards * k)
  const limit = Math.min(Number(searchParams.get("limit") || defaultLimit), maxLimit)
  const itemId = Number(searchParams.get("itemId") || 0)

  if (type === "similar" && itemId) {
    const items = await recommendSimilar(user.id, itemId, limit)
    return Response.json({ items, type: "similar" })
  }
  if (type === "cached") {
    const items = await listRecommendations(user.id, limit)
    return Response.json({ items, type: "cached" })
  }
  // 默认 history
  const items = await recommendFromHistory(user.id, limit)
  return Response.json({ items, type: "history" })
}
