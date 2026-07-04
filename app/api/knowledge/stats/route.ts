/**
 * 知识库统计 API
 *
 * GET /api/knowledge/stats
 *  - 返回总数、类型分布、存储大小等
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getStats } from "@/lib/db/knowledge-service"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const stats = await getStats(user.id)
  return Response.json({ stats })
}
