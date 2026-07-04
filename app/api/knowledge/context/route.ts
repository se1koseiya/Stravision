/**
 * 知识库相关上下文 API（供 AI 助手在对话中检索知识）
 *
 * GET /api/knowledge/context?q=keyword&maxChunks=5
 *
 * 返回与查询相关的知识片段，结构化供 prompt 注入
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getRelevantContext } from "@/lib/ai/knowledge-search"
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

  // maxChunks 默认值/上限 走 admin knowledgeConfig.ui.contextMaxChunks
  // maxChunks 的硬下限走 admin knowledgeConfig.ui.contextMaxChunksCeilingMin
  // 防御性放大倍数走 admin knowledgeConfig.search.requestOvershootMultiplier
  const defaultChunks = kc.ui.contextMaxChunks
  const k = kc.search.requestOvershootMultiplier
  const maxChunks = Math.min(
    Number(searchParams.get("maxChunks") || defaultChunks),
    Math.max(defaultChunks * k, kc.ui.contextMaxChunksCeilingMin)
  )
  const ctx = await getRelevantContext(user.id, q, { maxChunks })
  return Response.json({ query: q, contexts: ctx })
}
