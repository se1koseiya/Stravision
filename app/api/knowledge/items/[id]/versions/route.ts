/**
 * 知识库条目版本历史 API
 *
 * GET /api/knowledge/items/[id]/versions   列出所有历史版本
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { listVersions } from "@/lib/db/knowledge-service"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const { id } = await params
  const itemId = Number(id)
  if (!itemId) return jsonError("id 必填")

  const versions = await listVersions(itemId, user.id)
  return Response.json({ versions })
}
