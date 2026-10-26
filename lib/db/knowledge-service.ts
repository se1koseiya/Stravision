/**
 * 个人知识库 服务层
 *
 * 统一管理知识库 9 张表（collections/items/versions/tags/item_tags/chunks/permissions/query_log/backups/recommendations）
 * 提供：分类管理 / 条目 CRUD / 版本控制 / 标签 / 分块 / 权限 / 查询日志 / 备份 / 推荐
 */

import { queryOne, query, execute, initDB, withTransaction } from "./database"
import { getKnowledgeConfig } from "@/lib/ai/provider-resolver"

// ============== 类型定义 ==============

export type ContentType = "note" | "text" | "image" | "document" | "pdf" | "audio" | "video" | "web_clip" | "link"
export type AccessLevel = "private" | "shared" | "public"
export type EmbeddingStatus = "pending" | "processing" | "ready" | "failed" | "skipped"
export type Permission = "read" | "write" | "admin"
export type BackupType = "full" | "incremental"
export type BackupStatus = "pending" | "running" | "completed" | "failed"

export interface KnowledgeCollection {
  id: number
  user_id: number
  name: string
  description: string | null
  parent_id: number | null
  color: string
  icon: string
  sort_order: number
  is_archived: 0 | 1
  item_count: number
  // 知识库市场扩展字段
  is_marketplace: 0 | 1
  category: string
  cover_image: string | null
  popularity: number
  official: 0 | 1
  publisher_id: number | null
  published_at: number | null
  created_at: number
  updated_at: number
}

export interface KnowledgeMarketSubscription {
  id: number
  user_id: number
  collection_id: number
  created_at: number
}

/**
 * 知识库市场扩展信息（带订阅状态）
 */
export interface MarketCollectionView extends KnowledgeCollection {
  subscriber_count: number
  item_count_real: number
  is_subscribed: 0 | 1
  publisher_name?: string | null
}

export interface KnowledgeItem {
  id: number
  user_id: number
  collection_id: number | null
  title: string
  content: string | null
  content_type: ContentType
  file_url: string | null
  file_size: number
  mime_type: string | null
  source_url: string | null
  source_metadata: string | null
  summary: string | null
  tags_cache: string
  is_favorite: 0 | 1
  is_archived: 0 | 1
  access_level: AccessLevel
  current_version: number
  view_count: number
  search_count: number
  last_accessed_at: number | null
  embedding_model: string | null
  embedding_status: EmbeddingStatus
  created_at: number
  updated_at: number
}

export interface KnowledgeItemWithTags extends KnowledgeItem {
  tags: string[]
  collection_name?: string | null
}

export interface KnowledgeVersion {
  id: number
  item_id: number
  version_number: number
  title: string
  content: string | null
  file_url: string | null
  change_summary: string | null
  change_type: string
  created_by: number | null
  created_at: number
}

export interface KnowledgeTag {
  id: number
  user_id: number
  name: string
  color: string
  usage_count: number
  created_at: number
}

export interface KnowledgeChunk {
  id: number
  item_id: number
  version_id: number | null
  chunk_index: number
  content: string
  content_hash: string | null
  token_count: number
  start_offset: number
  end_offset: number
  metadata: string | null
  embedding: string | null
  embedding_model: string | null
  created_at: number
}

export interface KnowledgePermission {
  id: number
  item_id: number | null
  collection_id: number | null
  user_id: number
  grantee_user_id: number
  permission: Permission
  granted_by: number
  expires_at: number | null
  created_at: number
}

export interface KnowledgeQueryLog {
  id: number
  user_id: number
  session_id: string | null
  query: string
  query_type: string
  results_count: number
  clicked_item_id: number | null
  clicked_chunk_id: number | null
  created_at: number
}

export interface KnowledgeBackup {
  id: number
  user_id: number
  backup_type: BackupType
  name: string | null
  item_count: number
  file_path: string | null
  file_size: number
  status: BackupStatus
  include_files: 0 | 1
  metadata: string | null
  error_message: string | null
  created_at: number
  completed_at: number | null
}

export interface KnowledgeRecommendation {
  id: number
  user_id: number
  item_id: number
  score: number
  reason: string | null
  reason_type: string
  expires_at: number | null
  created_at: number
}

// ============== 集合 (Collections) ==============

export interface CreateCollectionInput {
  user_id: number
  name: string
  description?: string | null
  parent_id?: number | null
  color?: string
  icon?: string
  sort_order?: number
}

export async function createCollection(input: CreateCollectionInput): Promise<number> {
  await initDB()
  const now = Date.now()
  const res = await execute(
    `INSERT INTO knowledge_collections
      (user_id, name, description, parent_id, color, icon, sort_order, is_archived, item_count, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, $8, $8)
     RETURNING id`,
    [
      input.user_id,
      input.name,
      input.description ?? null,
      input.parent_id ?? null,
      input.color ?? "#059669",
      input.icon ?? "folder",
      input.sort_order ?? 0,
      now
    ]
  )
  const id = res.rows?.[0]?.id
  return typeof id === "number" ? id : Number(id) || 0
}

export async function listCollections(
  userId: number,
  options: { includeArchived?: boolean; parentId?: number | null } = {}
): Promise<KnowledgeCollection[]> {
  await initDB()
  // 市场 KB（is_marketplace=1）不属于用户个人知识库——它们由 admin UI 管理，
  // 用户通过知识库市场订阅后使用。即使 publisher_id == userId 也不在此列出，
  // 否则会在用户的「知识库」侧栏分类里出现市场 KB。
  const where: string[] = ["user_id = $1", "(is_marketplace = 0 OR is_marketplace IS NULL)"]
  const params: any[] = [userId]
  if (!options.includeArchived) where.push("is_archived = 0")
  if (options.parentId !== undefined) {
    if (options.parentId === null) where.push(`parent_id IS NULL`)
    else {
      params.push(options.parentId)
      where.push(`parent_id = $${params.length}`)
    }
  }
  return query<KnowledgeCollection>(
    `SELECT * FROM knowledge_collections WHERE ${where.join(" AND ")}
     ORDER BY sort_order ASC, id ASC`,
    params
  )
}

export async function getCollection(id: number, userId: number): Promise<KnowledgeCollection | null> {
  return queryOne<KnowledgeCollection>(
    `SELECT * FROM knowledge_collections WHERE id = $1 AND user_id = $2`,
    [id, userId]
  )
}

export async function updateCollection(
  id: number,
  userId: number,
  patch: Partial<Pick<KnowledgeCollection, "name" | "description" | "color" | "icon" | "sort_order" | "is_archived" | "parent_id">>
): Promise<boolean> {
  const fields: string[] = []
  const params: any[] = []
  for (const [k, v] of Object.entries(patch)) {
    params.push(v)
    fields.push(`${k} = $${params.length}`)
  }
  if (fields.length === 0) return false
  params.push(Date.now())
  fields.push(`updated_at = $${params.length}`)
  params.push(id, userId)
  const res = await execute(
    `UPDATE knowledge_collections SET ${fields.join(", ")} WHERE id = $${params.length - 1} AND user_id = $${params.length}`,
    params
  )
  return (res.rowCount ?? 0) > 0
}

export async function deleteCollection(id: number, userId: number): Promise<boolean> {
  return withTransaction(async (client) => {
    // 将条目移动到 root（collection_id = NULL）
    await client.query(
      `UPDATE knowledge_items SET collection_id = NULL, updated_at = $1 WHERE collection_id = $2 AND user_id = $3`,
      [Date.now(), id, userId]
    )
    const res = await client.query(
      `DELETE FROM knowledge_collections WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    return (res.rowCount ?? 0) > 0
  })
}

export async function updateCollectionItemCount(collectionId: number): Promise<void> {
  await initDB()
  await execute(
    `UPDATE knowledge_collections SET item_count = (
       SELECT COUNT(*) FROM knowledge_items WHERE collection_id = $1 AND is_archived = 0
     ), updated_at = $2 WHERE id = $1`,
    [collectionId, Date.now()]
  )
}

// ============== 标签 (Tags) ==============

export async function upsertTag(userId: number, name: string, color = "#059669"): Promise<number> {
  await initDB()
  const now = Date.now()
  const res = await execute(
    `INSERT INTO knowledge_tags (user_id, name, color, usage_count, created_at)
     VALUES ($1, $2, $3, 0, $4)
     ON CONFLICT (user_id, name) DO UPDATE SET color = EXCLUDED.color
     RETURNING id`,
    [userId, name, color, now]
  )
  const id = res.rows?.[0]?.id
  return typeof id === "number" ? id : Number(id) || 0
}

export async function listTags(userId: number): Promise<KnowledgeTag[]> {
  await initDB()
  return query<KnowledgeTag>(
    `SELECT * FROM knowledge_tags WHERE user_id = $1 ORDER BY usage_count DESC, name ASC`,
    [userId]
  )
}

export async function deleteTag(id: number, userId: number): Promise<boolean> {
  await initDB()
  return withTransaction(async (client) => {
    await client.query(`DELETE FROM knowledge_item_tags WHERE tag_id = $1`, [id])
    const res = await client.query(
      `DELETE FROM knowledge_tags WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    return (res.rowCount ?? 0) > 0
  })
}

// ============== 知识条目 (Items) ==============

export interface CreateItemInput {
  user_id: number
  title: string
  content?: string | null
  content_type?: ContentType
  collection_id?: number | null
  file_url?: string | null
  file_size?: number
  mime_type?: string | null
  source_url?: string | null
  source_metadata?: string | null
  summary?: string | null
  tags?: string[]
  access_level?: AccessLevel
  embedding_model?: string | null
  embedding_status?: EmbeddingStatus
  change_summary?: string
}

export async function createItem(input: CreateItemInput): Promise<number> {
  return withTransaction(async (client) => {
    const now = Date.now()
    const res = await client.query(
      `INSERT INTO knowledge_items
        (user_id, collection_id, title, content, content_type, file_url, file_size, mime_type,
         source_url, source_metadata, summary, tags_cache, is_favorite, is_archived, access_level,
         current_version, view_count, search_count, last_accessed_at, embedding_model, embedding_status,
         created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, 0, $13, 1, 0, 0, NULL, NULL, 'pending', $14, $14)
       RETURNING id`,
      [
        input.user_id,
        input.collection_id ?? null,
        input.title,
        input.content ?? null,
        input.content_type ?? "note",
        input.file_url ?? null,
        input.file_size ?? 0,
        input.mime_type ?? null,
        input.source_url ?? null,
        input.source_metadata ?? null,
        input.summary ?? null,
        (input.tags ?? []).join(","),
        input.access_level ?? "private",
        now
      ]
    )
    const itemId = Number(res.rows?.[0]?.id) || 0
    if (!itemId) return 0

    // 创建 v1 版本记录
    await client.query(
      `INSERT INTO knowledge_versions
        (item_id, version_number, title, content, file_url, change_summary, change_type, created_by, created_at)
       VALUES ($1, 1, $2, $3, $4, $5, 'create', $6, $7)`,
      [itemId, input.title, input.content ?? null, input.file_url ?? null,
       input.change_summary ?? "创建", input.user_id, now]
    )

    // 处理标签
    const tags = input.tags ?? []
    for (const tagName of tags) {
      const tagId = await upsertTagInternal(client, input.user_id, tagName)
      await client.query(
        `INSERT INTO knowledge_item_tags (item_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [itemId, tagId]
      )
      await client.query(
        `UPDATE knowledge_tags SET usage_count = usage_count + 1 WHERE id = $1`,
        [tagId]
      )
    }

    if (input.collection_id) {
      await updateCollectionItemCountInternal(client, input.collection_id)
    }

    return itemId
  })
}

async function upsertTagInternal(client: any, userId: number, name: string, color = "#059669"): Promise<number> {
  const res = await client.query(
    `INSERT INTO knowledge_tags (user_id, name, color, usage_count, created_at)
     VALUES ($1, $2, $3, 0, $4)
     ON CONFLICT (user_id, name) DO UPDATE SET color = EXCLUDED.color
     RETURNING id`,
    [userId, name, color, Date.now()]
  )
  return Number(res.rows?.[0]?.id) || 0
}

async function updateCollectionItemCountInternal(client: any, collectionId: number): Promise<void> {
  await client.query(
    `UPDATE knowledge_collections SET item_count = (
       SELECT COUNT(*) FROM knowledge_items WHERE collection_id = $1 AND is_archived = 0
     ), updated_at = $2 WHERE id = $1`,
    [collectionId, Date.now()]
  )
}

export interface ListItemsOptions {
  collection_id?: number | null
  content_type?: ContentType
  is_favorite?: boolean
  is_archived?: boolean
  tag?: string
  search?: string
  limit?: number
  offset?: number
  orderBy?: "updated_at" | "created_at" | "view_count" | "search_count"
  orderDir?: "ASC" | "DESC"
  /** 是否包含市场 KB（is_marketplace=1）内的条目。默认 false——个人知识库视图不应
   *  出现市场 KB 的条目，市场条目由 admin UI 管理或通过市场订阅访问。 */
  includeMarket?: boolean
}

/**
 * 列出"用户可见的"条目：包括自己 owner 的，以及作为协作者参与集合内的所有条目。
 *
 * 用于侧边栏协作集合视图——需要看到集合 owner 创建的所有条目，
 * 而不是只看到自己创建的。
 */
export async function listVisibleItems(
  userId: number,
  options: ListItemsOptions = {}
): Promise<{ items: KnowledgeItemWithTags[]; total: number }> {
  await initDB()
  // 找出当前用户作为协作者参与的所有 collection_id
  const collabRows = await query<{ collection_id: number | string }>(
    `SELECT collection_id FROM kb_collaborators WHERE user_id = $1`,
    [userId]
  )
  // BigInt 统一转 number
  const collabCollectionIds = collabRows
    .map((r) => Number(r.collection_id))
    .filter((n) => Number.isFinite(n))

  // pg 驱动在传空数组给 ANY 时会失败（无类型推导）
  // 用户没有任何协作集合时，仅按 user_id 过滤即可，无需 ANY
  // 注意：params 也必须与占位符数量严格匹配，否则 pg 会抛
  // "绑定消息提供了N个参数,但已准备好语句要求M个参数"
  const hasCollab = collabCollectionIds.length > 0
  const where: string[] = hasCollab
    ? [
        "(i.user_id = $1 OR (i.collection_id = ANY($2::bigint[]) AND EXISTS (SELECT 1 FROM kb_collaborators kc WHERE kc.collection_id = i.collection_id AND kc.user_id = $1)))"
      ]
    : ["i.user_id = $1"]
  if (!options.includeMarket) {
    where.push("NOT EXISTS (SELECT 1 FROM knowledge_collections c WHERE c.id = i.collection_id AND c.is_marketplace = 1)")
  }
  const params: any[] = hasCollab ? [userId, collabCollectionIds] : [userId]
  if (options.collection_id !== undefined) {
    if (options.collection_id === null) where.push("i.collection_id IS NULL")
    else {
      params.push(options.collection_id)
      where.push(`i.collection_id = $${params.length}`)
    }
  }
  if (options.content_type) {
    params.push(options.content_type)
    where.push(`i.content_type = $${params.length}`)
  }
  if (options.is_favorite !== undefined) {
    where.push(`i.is_favorite = ${options.is_favorite ? 1 : 0}`)
  }
  if (options.is_archived !== undefined) {
    where.push(`i.is_archived = ${options.is_archived ? 1 : 0}`)
  } else {
    where.push("i.is_archived = 0")
  }
  if (options.tag) {
    params.push(options.tag)
    where.push(`EXISTS (SELECT 1 FROM knowledge_item_tags it JOIN knowledge_tags t ON t.id = it.tag_id WHERE it.item_id = i.id AND t.name = $${params.length})`)
  }
  if (options.search) {
    params.push(`%${options.search}%`)
    where.push(`(i.title ILIKE $${params.length} OR i.content ILIKE $${params.length} OR i.summary ILIKE $${params.length})`)
  }

  const kc = await getKnowledgeConfig()
  const defaultLimit = kc.list.defaultLimit
  const maxLimit = kc.list.maxLimit
  const limit = Math.min(Math.max(options.limit ?? defaultLimit, 1), maxLimit)
  const offset = Math.max(options.offset ?? 0, 0)
  const orderBy = options.orderBy ?? "updated_at"
  const orderDir = options.orderDir ?? "DESC"

  const totalRes = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM knowledge_items i WHERE ${where.join(" AND ")}`,
    params
  )
  const total = Number(totalRes?.count ?? 0)

  params.push(limit, offset)
  const items = await query<KnowledgeItem & { collection_name: string | null }>(
    `SELECT i.*, c.name AS collection_name
       FROM knowledge_items i
       LEFT JOIN knowledge_collections c ON c.id = i.collection_id
      WHERE ${where.join(" AND ")}
      ORDER BY i.${orderBy} ${orderDir}
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  return {
    items: items.map((it) => ({ ...it, tags: (it.tags_cache || "").split(",").filter(Boolean) })),
    total
  }
}

export async function listItems(userId: number, options: ListItemsOptions = {}): Promise<{ items: KnowledgeItemWithTags[]; total: number }> {
  await initDB()
  const where: string[] = ["i.user_id = $1"]
  if (!options.includeMarket) {
    where.push("NOT EXISTS (SELECT 1 FROM knowledge_collections c WHERE c.id = i.collection_id AND c.is_marketplace = 1)")
  }
  const params: any[] = [userId]
  if (options.collection_id !== undefined) {
    if (options.collection_id === null) where.push("i.collection_id IS NULL")
    else {
      params.push(options.collection_id)
      where.push(`i.collection_id = $${params.length}`)
    }
  }
  if (options.content_type) {
    params.push(options.content_type)
    where.push(`i.content_type = $${params.length}`)
  }
  if (options.is_favorite !== undefined) {
    where.push(`i.is_favorite = ${options.is_favorite ? 1 : 0}`)
  }
  if (options.is_archived !== undefined) {
    where.push(`i.is_archived = ${options.is_archived ? 1 : 0}`)
  } else {
    where.push("i.is_archived = 0")
  }
  if (options.tag) {
    params.push(options.tag)
    where.push(`EXISTS (SELECT 1 FROM knowledge_item_tags it JOIN knowledge_tags t ON t.id = it.tag_id WHERE it.item_id = i.id AND t.name = $${params.length})`)
  }
  if (options.search) {
    params.push(`%${options.search}%`)
    where.push(`(i.title ILIKE $${params.length} OR i.content ILIKE $${params.length} OR i.summary ILIKE $${params.length})`)
  }

  // listItems limit 默认/上限 走 admin knowledgeConfig.list（可后台调整）
  // 调用方传 limit 时会被 clamp 在 [1, maxLimit] 区间
  const kc = await getKnowledgeConfig()
  const defaultLimit = kc.list.defaultLimit
  const maxLimit = kc.list.maxLimit
  const limit = Math.min(Math.max(options.limit ?? defaultLimit, 1), maxLimit)
  const offset = Math.max(options.offset ?? 0, 0)
  const orderBy = options.orderBy ?? "updated_at"
  const orderDir = options.orderDir ?? "DESC"

  const totalRes = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM knowledge_items i WHERE ${where.join(" AND ")}`,
    params
  )
  const total = Number(totalRes?.count ?? 0)

  params.push(limit, offset)
  const items = await query<KnowledgeItem & { collection_name: string | null }>(
    `SELECT i.*, c.name AS collection_name
     FROM knowledge_items i
     LEFT JOIN knowledge_collections c ON c.id = i.collection_id
     WHERE ${where.join(" AND ")}
     ORDER BY i.${orderBy} ${orderDir}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  // 加载标签
  const itemIds = items.map(i => i.id)
  let tagMap = new Map<number, string[]>()
  if (itemIds.length > 0) {
    const tagRows = await query<{ item_id: number; name: string }>(
      `SELECT it.item_id, t.name FROM knowledge_item_tags it
       JOIN knowledge_tags t ON t.id = it.tag_id
       WHERE it.item_id = ANY($1::bigint[])`,
      [itemIds]
    )
    for (const r of tagRows) {
      if (!tagMap.has(r.item_id)) tagMap.set(r.item_id, [])
      tagMap.get(r.item_id)!.push(r.name)
    }
  }

  return {
    items: items.map(i => ({ ...i, tags: tagMap.get(i.id) ?? [] })),
    total
  }
}

export async function getItem(id: number, userId: number, incrementView = true): Promise<KnowledgeItemWithTags | null> {
  await initDB()
  if (incrementView) {
    await execute(
      `UPDATE knowledge_items SET view_count = view_count + 1, last_accessed_at = $1 WHERE id = $2 AND user_id = $3`,
      [Date.now(), id, userId]
    )
  }
  const item = await queryOne<KnowledgeItem & { collection_name: string | null }>(
    `SELECT i.*, c.name AS collection_name FROM knowledge_items i
     LEFT JOIN knowledge_collections c ON c.id = i.collection_id
     WHERE i.id = $1 AND i.user_id = $2`,
    [id, userId]
  )
  if (!item) return null
  const tagRows = await query<{ name: string }>(
    `SELECT t.name FROM knowledge_item_tags it
     JOIN knowledge_tags t ON t.id = it.tag_id
     WHERE it.item_id = $1`,
    [id]
  )
  return { ...item, tags: tagRows.map(r => r.name) }
}

export interface UpdateItemInput {
  title?: string
  content?: string | null
  content_type?: ContentType
  collection_id?: number | null
  file_url?: string | null
  file_size?: number
  mime_type?: string | null
  source_url?: string | null
  source_metadata?: string | null
  summary?: string | null
  tags?: string[]
  is_favorite?: boolean
  is_archived?: boolean
  access_level?: AccessLevel
  embedding_model?: string | null
  embedding_status?: EmbeddingStatus
  change_summary?: string
  change_type?: string
  create_version?: boolean
}

export async function updateItem(id: number, userId: number, patch: UpdateItemInput): Promise<boolean> {
  return withTransaction(async (client) => {
    const current = await client.query(
      `SELECT * FROM knowledge_items WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    if (current.rowCount === 0) return false
    const cur = current.rows[0] as KnowledgeItem
    const now = Date.now()

    // 如果创建新版本
    if (patch.create_version !== false) {
      const newVersion = (cur.current_version ?? 1) + 1
      await client.query(
        `INSERT INTO knowledge_versions
          (item_id, version_number, title, content, file_url, change_summary, change_type, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          newVersion,
          patch.title ?? cur.title,
          patch.content !== undefined ? patch.content : cur.content,
          patch.file_url !== undefined ? patch.file_url : cur.file_url,
          patch.change_summary ?? "更新",
          patch.change_type ?? "edit",
          userId,
          now
        ]
      )
      // 设置旧 chunks 为过期（保留以便历史检索）
      await client.query(
        `UPDATE knowledge_items SET current_version = $1, embedding_status = 'pending', updated_at = $2 WHERE id = $3`,
        [newVersion, now, id]
      )
    }

    const setParts: string[] = []
    const params: any[] = []
    for (const [k, v] of Object.entries(patch)) {
      if (["tags", "change_summary", "change_type", "create_version"].includes(k)) continue
      // 跳过 undefined 字段，避免 PG 类型推导报错
      // （如路由层没有传 content_type，不应该覆盖数据库里的现有值）
      if (v === undefined) continue
      if (k === "is_favorite" || k === "is_archived") {
        setParts.push(`${k} = ${v ? 1 : 0}`)
      } else {
        params.push(v)
        setParts.push(`${k} = $${params.length}`)
      }
    }
    if (setParts.length > 0) {
      params.push(now)
      setParts.push(`updated_at = $${params.length}`)
      params.push(id, userId)
      await client.query(
        `UPDATE knowledge_items SET ${setParts.join(", ")} WHERE id = $${params.length - 1} AND user_id = $${params.length}`,
        params
      )
    }

    // 标签处理
    if (patch.tags) {
      await client.query(`DELETE FROM knowledge_item_tags WHERE item_id = $1`, [id])
      // 减少旧标签计数
      await client.query(
        `UPDATE knowledge_tags SET usage_count = GREATEST(usage_count - 1, 0)
         WHERE id IN (SELECT tag_id FROM knowledge_item_tags WHERE item_id = $1)`,
        [id]
      )
      // 再次清理（上面只是标记了，先 DELETE 再 UPDATE 更安全）
      await client.query(`DELETE FROM knowledge_item_tags WHERE item_id = $1`, [id])
      for (const tagName of patch.tags) {
        const tagId = await upsertTagInternal(client, userId, tagName)
        await client.query(
          `INSERT INTO knowledge_item_tags (item_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, tagId]
        )
        await client.query(
          `UPDATE knowledge_tags SET usage_count = usage_count + 1 WHERE id = $1`,
          [tagId]
        )
      }
      // 同步 tags_cache
      await client.query(
        `UPDATE knowledge_items SET tags_cache = $1 WHERE id = $2`,
        [patch.tags.join(","), id]
      )
    }

    // 集合计数更新
    if (patch.collection_id !== undefined && patch.collection_id !== cur.collection_id) {
      if (cur.collection_id) await updateCollectionItemCountInternal(client, cur.collection_id)
      if (patch.collection_id) await updateCollectionItemCountInternal(client, patch.collection_id)
    }

    return true
  })
}

export async function deleteItem(id: number, userId: number): Promise<boolean> {
  return withTransaction(async (client) => {
    const cur = await client.query(
      `SELECT collection_id FROM knowledge_items WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    if (cur.rowCount === 0) return false
    const collectionId = cur.rows[0].collection_id

    await client.query(`DELETE FROM knowledge_item_tags WHERE item_id = $1`, [id])
    await client.query(`DELETE FROM knowledge_chunks WHERE item_id = $1`, [id])
    await client.query(`DELETE FROM knowledge_versions WHERE item_id = $1`, [id])
    await client.query(`DELETE FROM knowledge_permissions WHERE item_id = $1`, [id])
    const res = await client.query(
      `DELETE FROM knowledge_items WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    if ((res.rowCount ?? 0) > 0 && collectionId) {
      await updateCollectionItemCountInternal(client, collectionId)
    }
    return (res.rowCount ?? 0) > 0
  })
}

// ============== 版本控制 ==============

export async function listVersions(itemId: number, userId: number): Promise<KnowledgeVersion[]> {
  await initDB()
  // 先校验条目所有权
  const item = await queryOne<{ id: number }>(
    `SELECT id FROM knowledge_items WHERE id = $1 AND user_id = $2`,
    [itemId, userId]
  )
  if (!item) return []
  return query<KnowledgeVersion>(
    `SELECT * FROM knowledge_versions WHERE item_id = $1 ORDER BY version_number DESC`,
    [itemId]
  )
}

export async function getVersion(versionId: number, userId: number): Promise<KnowledgeVersion | null> {
  await initDB()
  const version = await queryOne<KnowledgeVersion & { owner_id: number }>(
    `SELECT v.*, i.user_id AS owner_id
     FROM knowledge_versions v
     JOIN knowledge_items i ON i.id = v.item_id
     WHERE v.id = $1 AND i.user_id = $2`,
    [versionId, userId]
  )
  if (!version) return null
  return version
}

export async function restoreVersion(versionId: number, userId: number): Promise<boolean> {
  return withTransaction(async (client) => {
    const version = await client.query(
      `SELECT v.*, i.user_id AS owner_id
       FROM knowledge_versions v
       JOIN knowledge_items i ON i.id = v.item_id
       WHERE v.id = $1 AND i.user_id = $2`,
      [versionId, userId]
    )
    if (version.rowCount === 0) return false
    const v = version.rows[0] as KnowledgeVersion & { owner_id: number }
    const now = Date.now()
    const newVersion = await client.query(
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS nv FROM knowledge_versions WHERE item_id = $1`,
      [v.item_id]
    )
    const nextVersion = Number(newVersion.rows?.[0]?.nv ?? 1)

    await client.query(
      `INSERT INTO knowledge_versions
        (item_id, version_number, title, content, file_url, change_summary, change_type, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'restore', $7, $8)`,
      [v.item_id, nextVersion, v.title, v.content, v.file_url,
       `从 v${v.version_number} 恢复`, userId, now]
    )
    await client.query(
      `UPDATE knowledge_items
       SET title = $1, content = $2, file_url = $3, current_version = $4,
           embedding_status = 'pending', updated_at = $5
       WHERE id = $6`,
      [v.title, v.content, v.file_url, nextVersion, now, v.item_id]
    )
    return true
  })
}

// ============== 分块 (Chunks) ==============

export interface CreateChunkInput {
  item_id: number
  version_id?: number | null
  chunk_index: number
  content: string
  content_hash?: string | null
  token_count?: number
  start_offset?: number
  end_offset?: number
  metadata?: string | null
  embedding?: string | null
  embedding_model?: string | null
}

export async function createChunk(input: CreateChunkInput): Promise<number> {
  await initDB()
  const res = await execute(
    `INSERT INTO knowledge_chunks
      (item_id, version_id, chunk_index, content, content_hash, token_count, start_offset, end_offset,
       metadata, embedding, embedding_model, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      input.item_id,
      input.version_id ?? null,
      input.chunk_index,
      input.content,
      input.content_hash ?? null,
      input.token_count ?? 0,
      input.start_offset ?? 0,
      input.end_offset ?? 0,
      input.metadata ?? null,
      input.embedding ?? null,
      input.embedding_model ?? null,
      Date.now()
    ]
  )
  return Number(res.rows?.[0]?.id) || 0
}

export async function listChunks(itemId: number, versionId?: number): Promise<KnowledgeChunk[]> {
  await initDB()
  if (versionId !== undefined && versionId !== null) {
    return query<KnowledgeChunk>(
      `SELECT * FROM knowledge_chunks WHERE item_id = $1 AND version_id = $2 ORDER BY chunk_index ASC`,
      [itemId, versionId]
    )
  }
  return query<KnowledgeChunk>(
    `SELECT * FROM knowledge_chunks WHERE item_id = $1 ORDER BY chunk_index ASC`,
    [itemId]
  )
}

export async function deleteChunksByItem(itemId: number): Promise<void> {
  await initDB()
  await execute(`DELETE FROM knowledge_chunks WHERE item_id = $1`, [itemId])
}

export async function updateChunkEmbedding(
  chunkId: number,
  embedding: string,
  embeddingModel: string
): Promise<void> {
  await initDB()
  await execute(
    `UPDATE knowledge_chunks SET embedding = $1, embedding_model = $2 WHERE id = $3`,
    [embedding, embeddingModel, chunkId]
  )
}

// ============== 权限 (Permissions) ==============

export async function grantPermission(
  userId: number,
  granteeUserId: number,
  scope: { item_id?: number; collection_id?: number },
  permission: Permission = "read",
  expiresAt?: number | null
): Promise<number> {
  await initDB()
  const res = await execute(
    `INSERT INTO knowledge_permissions
      (item_id, collection_id, user_id, grantee_user_id, permission, granted_by, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      scope.item_id ?? null,
      scope.collection_id ?? null,
      userId,
      granteeUserId,
      permission,
      userId,
      expiresAt ?? null,
      Date.now()
    ]
  )
  return Number(res.rows?.[0]?.id) || 0
}

export async function revokePermission(id: number, userId: number): Promise<boolean> {
  await initDB()
  const res = await execute(
    `DELETE FROM knowledge_permissions WHERE id = $1 AND granted_by = $2`,
    [id, userId]
  )
  return (res.rowCount ?? 0) > 0
}

export async function listPermissions(
  userId: number,
  scope?: { item_id?: number; collection_id?: number }
): Promise<KnowledgePermission[]> {
  await initDB()
  const where: string[] = ["granted_by = $1"]
  const params: any[] = [userId]
  if (scope?.item_id !== undefined) {
    params.push(scope.item_id)
    where.push(`item_id = $${params.length}`)
  }
  if (scope?.collection_id !== undefined) {
    params.push(scope.collection_id)
    where.push(`collection_id = $${params.length}`)
  }
  return query<KnowledgePermission>(
    `SELECT * FROM knowledge_permissions WHERE ${where.join(" AND ")} ORDER BY created_at DESC`,
    params
  )
}

// ============== 查询日志 ==============

export async function logQuery(
  userId: number,
  queryText: string,
  options: { sessionId?: string; queryType?: string; resultsCount?: number } = {}
): Promise<number> {
  await initDB()
  const res = await execute(
    `INSERT INTO knowledge_query_log
      (user_id, session_id, query, query_type, results_count, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [userId, options.sessionId ?? null, queryText, options.queryType ?? "keyword", options.resultsCount ?? 0, Date.now()]
  )
  return Number(res.rows?.[0]?.id) || 0
}

export async function recordQueryClick(
  logId: number,
  userId: number,
  itemId: number,
  chunkId?: number | null
): Promise<void> {
  await initDB()
  await execute(
    `UPDATE knowledge_query_log
     SET clicked_item_id = $1, clicked_chunk_id = $2
     WHERE id = $3 AND user_id = $4`,
    [itemId, chunkId ?? null, logId, userId]
  )
  await execute(
    `UPDATE knowledge_items SET search_count = search_count + 1 WHERE id = $1 AND user_id = $2`,
    [itemId, userId]
  )
}

// ============== 备份 ==============

export async function createBackup(
  userId: number,
  options: { name?: string; backupType?: BackupType; includeFiles?: boolean; metadata?: string } = {}
): Promise<number> {
  await initDB()
  const res = await execute(
    `INSERT INTO knowledge_backups
      (user_id, backup_type, name, item_count, file_path, file_size, status, include_files, metadata, created_at)
     VALUES ($1, $2, $3, 0, NULL, 0, 'pending', $4, $5, $6)
     RETURNING id`,
    [userId, options.backupType ?? "full", options.name ?? null,
     options.includeFiles === false ? 0 : 1, options.metadata ?? null, Date.now()]
  )
  return Number(res.rows?.[0]?.id) || 0
}

export async function updateBackupStatus(
  id: number,
  userId: number,
  status: BackupStatus,
  extras: { filePath?: string; fileSize?: number; itemCount?: number; errorMessage?: string } = {}
): Promise<void> {
  await initDB()
  const fields: string[] = ["status = $1"]
  const params: any[] = [status]
  if (extras.filePath !== undefined) { params.push(extras.filePath); fields.push(`file_path = $${params.length}`) }
  if (extras.fileSize !== undefined) { params.push(extras.fileSize); fields.push(`file_size = $${params.length}`) }
  if (extras.itemCount !== undefined) { params.push(extras.itemCount); fields.push(`item_count = $${params.length}`) }
  if (extras.errorMessage !== undefined) { params.push(extras.errorMessage); fields.push(`error_message = $${params.length}`) }
  if (status === "completed" || status === "failed") {
    params.push(Date.now())
    fields.push(`completed_at = $${params.length}`)
  }
  params.push(id, userId)
  await execute(
    `UPDATE knowledge_backups SET ${fields.join(", ")} WHERE id = $${params.length - 1} AND user_id = $${params.length}`,
    params
  )
}

/**
 * 列出知识库备份
 * @param limit 默认走 admin knowledgeConfig.list.backupDefaultLimit
 */
export async function listBackups(userId: number, limit?: number): Promise<KnowledgeBackup[]> {
  await initDB()
  const kc = await getKnowledgeConfig()
  const effectiveLimit = limit ?? kc.list.backupDefaultLimit
  return query<KnowledgeBackup>(
    `SELECT * FROM knowledge_backups WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, effectiveLimit]
  )
}

// ============== 推荐 ==============

export async function recordRecommendation(
  userId: number,
  itemId: number,
  score: number,
  reason: string,
  reasonType = "history",
  expiresAt?: number
): Promise<number> {
  await initDB()
  const res = await execute(
    `INSERT INTO knowledge_recommendations
      (user_id, item_id, score, reason, reason_type, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [userId, itemId, score, reason, reasonType, expiresAt ?? null, Date.now()]
  )
  return Number(res.rows?.[0]?.id) || 0
}

/**
 * 列出知识库推荐（基于预计算表）
 * @param limit 默认走 admin knowledgeConfig.list.recommendationDefaultLimit
 */
export async function listRecommendations(
  userId: number,
  limit?: number
): Promise<(KnowledgeRecommendation & KnowledgeItem)[]> {
  await initDB()
  const kc = await getKnowledgeConfig()
  const effectiveLimit = limit ?? kc.list.recommendationDefaultLimit
  return query<KnowledgeRecommendation & KnowledgeItem>(
    `SELECT r.*, i.title, i.content, i.summary, i.content_type, i.file_url, i.mime_type
     FROM knowledge_recommendations r
     JOIN knowledge_items i ON i.id = r.item_id
     WHERE r.user_id = $1
       AND (r.expires_at IS NULL OR r.expires_at > $2)
     ORDER BY r.score DESC, r.created_at DESC
     LIMIT $3`,
    [userId, Date.now(), effectiveLimit]
  )
}

export async function clearExpiredRecommendations(): Promise<void> {
  await initDB()
  await execute(
    `DELETE FROM knowledge_recommendations WHERE expires_at IS NOT NULL AND expires_at < $1`,
    [Date.now()]
  )
}

// ============== 统计 ==============

export interface KnowledgeStats {
  total_items: number
  total_collections: number
  total_tags: number
  total_versions: number
  total_chunks: number
  favorites_count: number
  by_type: Record<string, number>
  storage_bytes: number
}

export async function getStats(userId: number): Promise<KnowledgeStats> {
  await initDB()
  // 个人知识库统计：排除市场 KB（is_marketplace=1）的 collection 及其条目，
  // 市场 KB 由 admin UI 管理，不计入用户个人统计。
  const baseStats = await queryOne<{
    total_items: string; total_collections: string; total_tags: string;
    total_versions: string; total_chunks: string; favorites_count: string; storage_bytes: string
  }>(
    `SELECT
       (SELECT COUNT(*) FROM knowledge_items i WHERE i.user_id = $1
          AND NOT EXISTS (SELECT 1 FROM knowledge_collections c WHERE c.id = i.collection_id AND c.is_marketplace = 1)) AS total_items,
       (SELECT COUNT(*) FROM knowledge_collections WHERE user_id = $1 AND (is_marketplace = 0 OR is_marketplace IS NULL)) AS total_collections,
       (SELECT COUNT(*) FROM knowledge_tags WHERE user_id = $1) AS total_tags,
       (SELECT COUNT(*) FROM knowledge_versions v
         JOIN knowledge_items i ON i.id = v.item_id WHERE i.user_id = $1
          AND NOT EXISTS (SELECT 1 FROM knowledge_collections c WHERE c.id = i.collection_id AND c.is_marketplace = 1)) AS total_versions,
       (SELECT COUNT(*) FROM knowledge_chunks c
         JOIN knowledge_items i ON i.id = c.item_id WHERE i.user_id = $1
          AND NOT EXISTS (SELECT 1 FROM knowledge_collections col WHERE col.id = i.collection_id AND col.is_marketplace = 1)) AS total_chunks,
       (SELECT COUNT(*) FROM knowledge_items i WHERE i.user_id = $1 AND i.is_favorite = 1
          AND NOT EXISTS (SELECT 1 FROM knowledge_collections c WHERE c.id = i.collection_id AND c.is_marketplace = 1)) AS favorites_count,
       (SELECT COALESCE(SUM(file_size), 0) FROM knowledge_items i WHERE i.user_id = $1
          AND NOT EXISTS (SELECT 1 FROM knowledge_collections c WHERE c.id = i.collection_id AND c.is_marketplace = 1)) AS storage_bytes`,
    [userId]
  )
  const typeRows = await query<{ content_type: string; count: string }>(
    `SELECT i.content_type, COUNT(*)::text AS count
     FROM knowledge_items i WHERE i.user_id = $1
       AND NOT EXISTS (SELECT 1 FROM knowledge_collections c WHERE c.id = i.collection_id AND c.is_marketplace = 1)
     GROUP BY i.content_type`,
    [userId]
  )
  const by_type: Record<string, number> = {}
  for (const r of typeRows) by_type[r.content_type] = Number(r.count)
  return {
    total_items: Number(baseStats?.total_items ?? 0),
    total_collections: Number(baseStats?.total_collections ?? 0),
    total_tags: Number(baseStats?.total_tags ?? 0),
    total_versions: Number(baseStats?.total_versions ?? 0),
    total_chunks: Number(baseStats?.total_chunks ?? 0),
    favorites_count: Number(baseStats?.favorites_count ?? 0),
    by_type,
    storage_bytes: Number(baseStats?.storage_bytes ?? 0)
  }
}

// ============== 知识库市场 (Marketplace) ==============

/**
 * 列出市场中的知识库 collection（带订阅状态）
 * @param viewerUserId  浏览者 ID（用于判断 is_subscribed）
 * @param options.search  名称模糊搜索
 * @param options.category  分类精确匹配
 * @param options.includeSubscribed  是否包含「我已订阅的」（默认 true）
 * @param options.ownerOnly  仅看我（作为 publisher）创建的市场 KB
 * @param options.sort  published_at | popularity | created_at
 * @param options.limit / offset  分页
 */
export async function listMarketCollections(
  viewerUserId: number,
  options: {
    search?: string
    category?: string
    includeSubscribed?: boolean
    ownerOnly?: boolean
    sort?: "published_at" | "popularity" | "created_at"
    limit?: number
    offset?: number
  } = {}
): Promise<MarketCollectionView[]> {
  await initDB()
  const {
    search, category,
    ownerOnly = false,
    sort = "published_at",
    limit = 50, offset = 0
  } = options
  const where: string[] = ["c.is_marketplace = 1", "c.is_archived = 0"]
  const params: any[] = [viewerUserId]
  if (ownerOnly) {
    where.push("c.publisher_id = $1")
  }
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`)
    where.push(`(c.name ILIKE $${params.length} OR c.description ILIKE $${params.length})`)
  }
  if (category && category !== "all") {
    params.push(category)
    where.push(`c.category = $${params.length}`)
  }
  const orderCol = sort === "popularity" ? "c.popularity DESC, c.published_at DESC"
    : sort === "created_at" ? "c.created_at DESC"
    : "c.published_at DESC NULLS LAST, c.created_at DESC"
  params.push(limit, offset)
  const rows = await query<MarketCollectionView>(
    `SELECT c.*,
            (SELECT COUNT(*)::int FROM knowledge_market_subscriptions s WHERE s.collection_id = c.id) AS subscriber_count,
            (SELECT COUNT(*)::int FROM knowledge_items i WHERE i.collection_id = c.id AND i.is_archived = 0) AS item_count_real,
            EXISTS (SELECT 1 FROM knowledge_market_subscriptions s WHERE s.collection_id = c.id AND s.user_id = $1) AS is_subscribed,
            (SELECT u.username FROM users u WHERE u.id = c.publisher_id) AS publisher_name
       FROM knowledge_collections c
       WHERE ${where.join(" AND ")}
       ORDER BY ${orderCol}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )
  // 把 is_subscribed (boolean) 归一为 0/1
  return rows.map(r => ({ ...r, is_subscribed: r.is_subscribed ? 1 as const : 0 as const }))
}

/**
 * 获取单个市场 KB 详情（带订阅状态）
 */
export async function getMarketCollection(
  viewerUserId: number,
  collectionId: number
): Promise<MarketCollectionView | null> {
  await initDB()
  const rows = await query<MarketCollectionView>(
    `SELECT c.*,
            (SELECT COUNT(*)::int FROM knowledge_market_subscriptions s WHERE s.collection_id = c.id) AS subscriber_count,
            (SELECT COUNT(*)::int FROM knowledge_items i WHERE i.collection_id = c.id AND i.is_archived = 0) AS item_count_real,
            EXISTS (SELECT 1 FROM knowledge_market_subscriptions s WHERE s.collection_id = c.id AND s.user_id = $1) AS is_subscribed,
            (SELECT u.username FROM users u WHERE u.id = c.publisher_id) AS publisher_name
       FROM knowledge_collections c
       WHERE c.id = $2 AND c.is_marketplace = 1`,
    [viewerUserId, collectionId]
  )
  const r = rows[0]
  if (!r) return null
  return { ...r, is_subscribed: r.is_subscribed ? 1 as const : 0 as const }
}

/**
 * 订阅（虚拟订阅，仅写订阅表，不复制 items）
 */
export async function subscribeMarketCollection(userId: number, collectionId: number): Promise<boolean> {
  await initDB()
  // 校验 collection 存在且是市场 KB
  const col = await queryOne<{ id: number; is_marketplace: number }>(
    `SELECT id, is_marketplace FROM knowledge_collections WHERE id = $1 AND is_archived = 0`,
    [collectionId]
  )
  if (!col || col.is_marketplace !== 1) return false
  // ON CONFLICT DO NOTHING 幂等
  await execute(
    `INSERT INTO knowledge_market_subscriptions (user_id, collection_id, created_at)
     VALUES ($1, $2, $3) ON CONFLICT (user_id, collection_id) DO NOTHING`,
    [userId, collectionId, Date.now()]
  )
  // 订阅数 +1
  await execute(
    `UPDATE knowledge_collections SET popularity = popularity + 1, updated_at = $2 WHERE id = $1`,
    [collectionId, Date.now()]
  )
  return true
}

/**
 * 取消订阅
 */
export async function unsubscribeMarketCollection(userId: number, collectionId: number): Promise<boolean> {
  await initDB()
  await execute(
    `DELETE FROM knowledge_market_subscriptions WHERE user_id = $1 AND collection_id = $2`,
    [userId, collectionId]
  )
  // 订阅数 -1（不能低于 0）
  await execute(
    `UPDATE knowledge_collections SET popularity = GREATEST(popularity - 1, 0), updated_at = $2 WHERE id = $1`,
    [collectionId, Date.now()]
  )
  return true
}

/**
 * 列出用户已订阅的 market collection
 */
export async function listMySubscriptions(userId: number): Promise<MarketCollectionView[]> {
  await initDB()
  const rows = await query<MarketCollectionView>(
    `SELECT c.*,
            (SELECT COUNT(*)::int FROM knowledge_market_subscriptions s WHERE s.collection_id = c.id) AS subscriber_count,
            (SELECT COUNT(*)::int FROM knowledge_items i WHERE i.collection_id = c.id AND i.is_archived = 0) AS item_count_real,
            1 AS is_subscribed,
            (SELECT u.username FROM users u WHERE u.id = c.publisher_id) AS publisher_name
       FROM knowledge_collections c
       JOIN knowledge_market_subscriptions s ON s.collection_id = c.id
       WHERE s.user_id = $1 AND c.is_marketplace = 1 AND c.is_archived = 0
       ORDER BY s.created_at DESC`,
    [userId]
  )
  return rows.map(r => ({ ...r, is_subscribed: 1 as const }))
}

/**
 * 列出用户在 AI 上下文中可用的所有 collection（自己 + 已订阅的 market）
 * 用于聊天输入 /<name> 指令的自动补全
 */
export async function listAvailableCollectionsForAI(
  userId: number,
  options: { search?: string; limit?: number } = {}
): Promise<Array<{ id: number; name: string; source: "own" | "market"; is_subscribed: 0 | 1 }>> {
  await initDB()
  const { search, limit = 50 } = options
  const where: string[] = [
    "c.is_archived = 0",
    "(c.user_id = $1 OR c.is_marketplace = 1)",
  ]
  const params: any[] = [userId]
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`)
    where.push(`c.name ILIKE $${params.length}`)
  }
  // 已订阅的 market 优先
  where.push(`(c.user_id = $1 OR EXISTS (SELECT 1 FROM knowledge_market_subscriptions s WHERE s.user_id = $1 AND s.collection_id = c.id))`)
  params.push(limit)
  const rows = await query<{ id: number; name: string; user_id: number; is_marketplace: number; is_subscribed: number }>(
    `SELECT c.id, c.name, c.user_id, c.is_marketplace,
            EXISTS (SELECT 1 FROM knowledge_market_subscriptions s WHERE s.user_id = $1 AND s.collection_id = c.id) AS is_subscribed
       FROM knowledge_collections c
       WHERE ${where.join(" AND ")}
       ORDER BY c.is_marketplace DESC, c.updated_at DESC
       LIMIT $${params.length}`,
    params
  )
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    source: (r.is_marketplace === 1 ? "market" : "own") as "own" | "market",
    is_subscribed: r.is_subscribed ? 1 as const : 0 as const
  }))
}

/**
 * 创建/更新市场 KB（admin 用）
 */
export interface CreateMarketCollectionInput {
  publisher_id: number
  name: string
  description?: string | null
  category?: string
  cover_image?: string | null
  color?: string
  icon?: string
  official?: boolean
  popularity?: number
}

export async function createMarketCollection(input: CreateMarketCollectionInput): Promise<number> {
  await initDB()
  const now = Date.now()
  const official = input.official ? 1 : 0
  const res = await execute(
    `INSERT INTO knowledge_collections
       (user_id, name, description, color, icon, is_marketplace, category, cover_image, popularity, official, publisher_id, published_at, item_count, is_archived, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8, $9, $1, $10, 0, 0, 0, $10, $10)
     RETURNING id`,
    [
      input.publisher_id,
      input.name,
      input.description ?? null,
      input.color ?? "#059669",
      input.icon ?? "book",
      input.category ?? "general",
      input.cover_image ?? null,
      input.popularity ?? 0,
      official,
      now
    ]
  )
  const id = (res as any).rows?.[0]?.id
  return typeof id === "number" ? id : Number(id) || 0
}

export async function updateMarketCollection(
  collectionId: number,
  patch: Partial<{
    name: string
    description: string | null
    category: string
    cover_image: string | null
    color: string
    icon: string
    official: boolean
    is_archived: 0 | 1
    popularity: number
  }>
): Promise<void> {
  await initDB()
  const fields: string[] = []
  const params: any[] = []
  let idx = 1
  if (patch.name !== undefined) { fields.push(`name = $${idx++}`); params.push(patch.name) }
  if (patch.description !== undefined) { fields.push(`description = $${idx++}`); params.push(patch.description) }
  if (patch.category !== undefined) { fields.push(`category = $${idx++}`); params.push(patch.category) }
  if (patch.cover_image !== undefined) { fields.push(`cover_image = $${idx++}`); params.push(patch.cover_image) }
  if (patch.color !== undefined) { fields.push(`color = $${idx++}`); params.push(patch.color) }
  if (patch.icon !== undefined) { fields.push(`icon = $${idx++}`); params.push(patch.icon) }
  if (patch.official !== undefined) { fields.push(`official = $${idx++}`); params.push(patch.official ? 1 : 0) }
  if (patch.is_archived !== undefined) { fields.push(`is_archived = $${idx++}`); params.push(patch.is_archived) }
  if (patch.popularity !== undefined) { fields.push(`popularity = $${idx++}`); params.push(patch.popularity) }
  if (fields.length === 0) return
  fields.push(`updated_at = $${idx++}`); params.push(Date.now())
  params.push(collectionId)
  await execute(
    `UPDATE knowledge_collections SET ${fields.join(", ")} WHERE id = $${idx} AND is_marketplace = 1`,
    params
  )
}

export async function deleteMarketCollection(collectionId: number): Promise<void> {
  await withTransaction(async (client) => {
    // 收集所有 item ids（用于清理关联表）
    const itemRows = await client.query<{ id: string }>(
      `SELECT id FROM knowledge_items WHERE collection_id = $1`,
      [collectionId]
    )
    const itemIds: number[] = itemRows.rows.map(r => Number(r.id))

    if (itemIds.length > 0) {
      // 1. 清理 items 的关联表（按 item_id 维度）
      const placeholders = itemIds.map((_, i) => `$${i + 1}`).join(",")
      await client.query(`DELETE FROM knowledge_item_tags WHERE item_id IN (${placeholders})`, itemIds)
      await client.query(`DELETE FROM knowledge_chunks WHERE item_id IN (${placeholders})`, itemIds)
      await client.query(`DELETE FROM knowledge_versions WHERE item_id IN (${placeholders})`, itemIds)
      await client.query(`DELETE FROM knowledge_permissions WHERE item_id IN (${placeholders})`, itemIds)
      await client.query(`DELETE FROM knowledge_query_log WHERE clicked_item_id IN (${placeholders})`, itemIds)
      await client.query(`DELETE FROM knowledge_recommendations WHERE item_id IN (${placeholders})`, itemIds)
    }

    // 2. 清理 collection 维度的关联
    await client.query(`DELETE FROM knowledge_market_subscriptions WHERE collection_id = $1`, [collectionId])
    await client.query(`DELETE FROM knowledge_permissions WHERE collection_id = $1`, [collectionId])

    // 3. 删除 items
    await client.query(`DELETE FROM knowledge_items WHERE collection_id = $1`, [collectionId])

    // 4. 最后删除 collection 本身
    await client.query(`DELETE FROM knowledge_collections WHERE id = $1 AND is_marketplace = 1`, [collectionId])
  })
}

/**
 * 列出市场分类（distinct）
 */
export async function listMarketCategories(): Promise<Array<{ category: string; count: number }>> {
  await initDB()
  const rows = await query<{ category: string; count: string }>(
    `SELECT category, COUNT(*)::text AS count
       FROM knowledge_collections
       WHERE is_marketplace = 1 AND is_archived = 0
       GROUP BY category
       ORDER BY count DESC`
  )
  return rows.map(r => ({ category: r.category, count: Number(r.count) }))
}
