/**
 * 版本回滚 API
 *
 * POST /api/knowledge/items/[id]/restore  body: { versionId: number }
 *  - 读取指定版本的内容
 *  - 创建一个新版本（标记 change_type = 'restore'）
 *  - 更新 item 的当前内容
 *  - 异步重新生成 embedding
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { restoreVersion, updateItem, getItem } from "@/lib/db/knowledge-service"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const { id } = await params
  const itemId = Number(id)
  if (!itemId) return jsonError("id 必填")

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonError("请求体不是合法 JSON")
  }
  const versionId = Number(body?.versionId || 0)
  if (!versionId) return jsonError("versionId 必填")

  const ok = await restoreVersion(versionId, user.id)
  if (!ok) return jsonError("恢复失败或无权限", 404)

  // 异步重新生成 embedding
  void (async () => {
    try {
      const { embedItem } = await import("@/lib/ai/embedding-service")
      const item = await getItem(itemId, user.id, false)
      if (!item) return
      const result = await embedItem(item, { userId: user.id })
      await updateItem(itemId, user.id, {
        embedding_model: result.model,
        embedding_status: "ready",
        change_type: "auto_embed",
        change_summary: `版本恢复后重新生成 ${result.chunkCount} 个分块`,
        create_version: false
      })
    } catch (e) {
      console.warn(`[knowledge/restore] re-embed failed:`, e)
    }
  })()

  return Response.json({ success: true })
}
