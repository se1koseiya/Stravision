/**
 * 知识库标签 API
 *
 * GET    /api/knowledge/tags        列出所有标签
 * POST   /api/knowledge/tags        创建标签 body: { name, color? }
 * DELETE /api/knowledge/tags?id=X   删除标签
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { listTags, upsertTag, deleteTag } from "@/lib/db/knowledge-service"
import { getKnowledgeConfig } from "@/lib/ai/provider-resolver"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const tags = await listTags(user.id)
  return Response.json({ tags })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const kc = await getKnowledgeConfig()
  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonError("请求体不是合法 JSON")
  }
  const name = (body?.name || "").toString().trim()
  if (!name) return jsonError("name 必填")
  if (name.length > kc.limits.tagNameMax) return jsonError(`name 长度不能超过 ${kc.limits.tagNameMax}`)
  const id = await upsertTag(user.id, name, body?.color)
  return Response.json({ id, success: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get("id") || 0)
  if (!id) return jsonError("id 必填")
  const ok = await deleteTag(id, user.id)
  if (!ok) return jsonError("删除失败或无权限", 404)
  return Response.json({ success: true })
}
