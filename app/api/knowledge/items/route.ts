/**
 * 知识库条目 API
 *
 * GET  /api/knowledge/items       列出条目（支持 ?collectionId=&type=&favorite=&tag=&q=&limit=&offset=）
 * POST /api/knowledge/items       创建新条目
 *
 * 自动触发 embedding 生成（异步），不影响响应速度
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createItem, listItems, type ContentType } from "@/lib/db/knowledge-service"
import { getKnowledgeConfig } from "@/lib/ai/provider-resolver"
import { queryOne } from "@/lib/db/database"

const VALID_CONTENT_TYPES: ContentType[] = [
  "note", "text", "image", "document", "pdf", "audio", "video", "web_clip", "link"
]

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  const kc = await getKnowledgeConfig()
  const { searchParams } = new URL(req.url)

  const collectionIdParam = searchParams.get("collectionId")
  const collectionId = collectionIdParam === null
    ? undefined
    : collectionIdParam === "root"
      ? null
      : collectionIdParam ? Number(collectionIdParam) : undefined

  // limit 默认值/上限 走 admin knowledgeConfig.ui.listPageSize
  // 上限 = max(default, maxCandidate × requestOvershootMultiplier)
  const defaultLimit = kc.ui.listPageSize
  const maxLimit = Math.max(defaultLimit, kc.search.maxCandidate * kc.search.requestOvershootMultiplier)
  const result = await listItems(user.id, {
    collection_id: collectionId,
    content_type: (searchParams.get("type") as ContentType) || undefined,
    is_favorite: searchParams.get("favorite") === "1" ? true : searchParams.get("favorite") === "0" ? false : undefined,
    is_archived: searchParams.get("archived") === "1" ? true : undefined,
    tag: searchParams.get("tag") || undefined,
    search: searchParams.get("q") || undefined,
    limit: Math.min(Number(searchParams.get("limit") || defaultLimit), maxLimit),
    offset: Math.max(Number(searchParams.get("offset") || 0), 0),
    orderBy: (searchParams.get("orderBy") as any) || "updated_at",
    orderDir: (searchParams.get("orderDir") as any) || "DESC"
  })
  return Response.json({ items: result.items, total: result.total })
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

  const title = (body?.title || "").toString().trim()
  if (!title) return jsonError("title 必填")
  if (title.length > kc.limits.itemTitleMax) return jsonError(`title 长度不能超过 ${kc.limits.itemTitleMax}`)

  const contentType: ContentType = VALID_CONTENT_TYPES.includes(body?.content_type) ? body.content_type : "note"
  const content = body?.content ? String(body.content) : null
  if (content && content.length > kc.maxExtractedChars) {
    return jsonError(`content 超过 ${Math.round(kc.maxExtractedChars / 1000)}K 字符上限（可在 admin → 知识库配置中调整）`)
  }

  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((t: any) => typeof t === "string").slice(0, kc.limits.maxTagsPerItem)
    : []

  // 如果 collection_id 指向市场 KB，使用 publisher_id 作为条目 owner
  // 这样订阅用户拉取 market items 时不会被 user_id 过滤掉
  let ownerUserId = user.id
  if (body?.collection_id) {
    const col = await queryOne<{ user_id: number; is_marketplace: number; publisher_id: number | null }>(
      `SELECT user_id, is_marketplace, publisher_id FROM knowledge_collections WHERE id = $1 AND is_archived = 0`,
      [body.collection_id]
    )
    if (col?.is_marketplace === 1) {
      const role = (user as any).role
      const isAdmin = role === "admin" || role === "super_admin"
      // admin / publisher 都允许写入，条目 owner 始终用 publisher
      if (isAdmin || col.user_id === user.id || col.publisher_id === user.id) {
        ownerUserId = col.user_id
      } else {
        return jsonError("无权限向该市场知识库添加条目", 403)
      }
    }
  }

  const id = await createItem({
    user_id: ownerUserId,
    title,
    content,
    content_type: contentType,
    collection_id: body?.collection_id ?? null,
    file_url: body?.file_url ?? null,
    file_size: body?.file_size ?? 0,
    mime_type: body?.mime_type ?? null,
    source_url: body?.source_url ?? null,
    source_metadata: body?.source_metadata ?? null,
    summary: body?.summary ?? null,
    tags,
    access_level: body?.access_level || "private",
    change_summary: body?.change_summary || "创建"
  })

  // 异步触发 embedding（不等待）
  if (content || body?.summary) {
    void triggerEmbedding(id, ownerUserId)
  }

  return Response.json({ id, success: true })
}

async function triggerEmbedding(itemId: number, userId: number) {
  try {
    const { embedItem } = await import("@/lib/ai/embedding-service")
    const { getItem, updateItem } = await import("@/lib/db/knowledge-service")
    const item = await getItem(itemId, userId, false)
    if (!item) return
    const result = await embedItem(item, { userId })
    await updateItem(itemId, userId, {
      embedding_model: result.model,
      embedding_status: "ready",
      change_type: "auto_embed",
      change_summary: `自动生成 ${result.chunkCount} 个分块的 embedding`,
      create_version: false
    })
  } catch (e) {
    console.warn(`[knowledge/embed] item ${itemId} failed:`, e)
    try {
      const { updateItem } = await import("@/lib/db/knowledge-service")
      await updateItem(itemId, userId, {
        embedding_status: "failed",
        change_type: "auto_embed",
        change_summary: "embedding 生成失败",
        create_version: false
      })
    } catch {}
  }
}
