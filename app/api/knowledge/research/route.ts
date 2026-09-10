/**
 * AI 深度研究：联网检索 → 多源融合 → 沉淀入库 → 自动向量化
 *
 * POST /api/knowledge/research
 *   body: { topic: string, collectionId?: number, maxSubQueries?: number, maxRounds?: number }
 *
 * 核心逻辑在 lib/ai/deep-research-service.ts 的 researchAndIngest，
 * 与 AI 助手的 builtin deep_research 工具共用同一条链路。
 */

export const runtime = "nodejs"
// 研究链路涉及多轮 LLM + 搜索，放宽超时
export const maxDuration = 300

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { researchAndIngest } from "@/lib/ai/deep-research-service"

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "未登录" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const topic = String(body?.topic ?? "").trim()
  if (!topic) return Response.json({ error: "topic 必填" }, { status: 400 })
  if (topic.length > 300) return Response.json({ error: "topic 过长" }, { status: 400 })

  try {
    const result = await researchAndIngest(topic, user.id, {
      collectionId: body?.collectionId ? Number(body.collectionId) : null,
      maxSubQueries: clampInt(body?.maxSubQueries, 1, 6, 3),
      maxRounds: clampInt(body?.maxRounds, 0, 3, 1),
      onProgress: (stage, detail) => console.log(`[research][u${user.id}] ${stage}: ${detail ?? ""}`)
    })

    return Response.json({
      success: true,
      itemId: result.itemId,
      title: result.title,
      summary: result.summary,
      subQueries: result.subQueries,
      rounds: result.rounds,
      sources: result.sources,
      embed: result.embed
    })
  } catch (e: any) {
    console.error(`[research][u${user.id}] 失败:`, e)
    return Response.json({ error: e?.message || "研究失败" }, { status: 500 })
  }
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.floor(n)))
}
