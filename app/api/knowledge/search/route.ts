/**
 * 知识库检索 API
 *
 * GET /api/knowledge/search?q=keyword&mode=hybrid&limit=20&collectionId=&type=&tag=
 *
 * mode: keyword | semantic | hybrid (默认)
 * 返回结构化结果，包含每个命中的 item、score、匹配片段
 *
 * limit 默认值/上限 走 admin knowledgeConfig.search（可后台调整）
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { search, type SearchMode } from "@/lib/ai/knowledge-search"
import { getKnowledgeConfig } from "@/lib/ai/provider-resolver"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const kc = await getKnowledgeConfig()
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim()
  if (!q) return jsonError("q 必填", 400)
  if (q.length > kc.search.queryMaxLength) return jsonError(`q 长度不能超过 ${kc.search.queryMaxLength}`)

  const mode = (searchParams.get("mode") || "hybrid") as SearchMode
  const collectionIdParam = searchParams.get("collectionId")
  const collectionId = collectionIdParam === "root"
    ? null
    : collectionIdParam ? Number(collectionIdParam) : undefined

  // limit 默认值/上限：服务端保护 = max(defaultLimit, maxCandidate)
  // maxCandidate 是 admin knowledgeConfig.search.maxCandidate（可后台调整）
  const defaultLimit = kc.search.defaultLimit
  const maxLimit = Math.max(defaultLimit, kc.search.maxCandidate)
  const result = await search(user.id, q, {
    mode: ["keyword", "semantic", "hybrid"].includes(mode) ? mode : "hybrid",
    collectionId: collectionId,
    contentType: searchParams.get("type") || undefined,
    tags: searchParams.get("tag") ? [searchParams.get("tag")!] : undefined,
    isFavorite: searchParams.get("favorite") === "1",
    limit: Math.min(Number(searchParams.get("limit") || defaultLimit), maxLimit),
    offset: Math.max(Number(searchParams.get("offset") || 0), 0),
    keywordWeight: searchParams.get("kwWeight") ? Number(searchParams.get("kwWeight")) : undefined,
    semanticWeight: searchParams.get("semWeight") ? Number(searchParams.get("semWeight")) : undefined,
    sessionId: searchParams.get("sessionId") || undefined,
    // 个人知识库搜索不包含市场 KB（含 admin 自己创建的）——市场 KB 由 admin UI 管理
    includeMarket: false
  })

  return Response.json(result)
}
