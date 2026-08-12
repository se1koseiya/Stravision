/**
 * 知识库协作 服务层
 *
 * 三大块：
 *  1) 邀请（kb_invitations）：发送 / 接受 / 拒绝 / 取消 / 列出
 *  2) 协作者（kb_collaborators）：列表 / 角色变更 / 移除 / 权限校验
 *  3) 操作日志（kb_operation_logs）：写入 / 查询 / 全平台活动流
 *
 * 设计要点：
 *  - 所有写入操作走 withTransaction，保证一致性
 *  - 邀请接受后原子地插入协作者并标记邀请状态
 *  - 操作日志的 metadata 用 JSON.stringify 序列化，IP/UA 由调用方传入
 *  - 默认 invitation 过期 7 天
 *  - 角色层级：owner > admin > editor > viewer（owner 不可变更/移除）
 */

import { query, queryOne, execute, initDB, withTransaction } from "./database"

// ============== 类型定义 ==============

export type CollaboratorRole = "owner" | "admin" | "editor" | "viewer"
export type InvitationStatus = "pending" | "accepted" | "rejected" | "cancelled" | "expired"
export type OperationAction =
  | "create_collection"
  | "update_collection"
  | "delete_collection"
  | "create_item"
  | "update_item"
  | "delete_item"
  | "restore_version"
  | "invite_user"
  | "accept_invitation"
  | "reject_invitation"
  | "cancel_invitation"
  | "update_role"
  | "remove_collaborator"
  | "edit_document"
  | "export_document"
  | "import_document"
  | "share"
  | "view"

export interface KbCollaborator {
  id: number
  collection_id: number
  user_id: number
  role: CollaboratorRole
  invited_by: number | null
  joined_at: number
  created_at: number
  // 关联字段
  username?: string
  avatar_url?: string | null
  email?: string
  uid?: string
}

export interface KbInvitation {
  id: number
  collection_id: number
  inviter_id: number
  invitee_id: number
  role: CollaboratorRole
  status: InvitationStatus
  message: string | null
  expires_at: number | null
  created_at: number
  responded_at: number | null
  // 关联字段
  collection_name?: string
  inviter_name?: string
  inviter_avatar?: string | null
  invitee_name?: string
  invitee_avatar?: string | null
}

export interface KbOperationLog {
  id: number
  user_id: number
  collection_id: number | null
  item_id: number | null
  action: OperationAction | string
  target_type: string | null
  target_id: number | null
  metadata: string | null
  ip: string | null
  user_agent: string | null
  visibility: string
  created_at: number
  // 关联字段
  username?: string
  avatar_url?: string | null
  collection_name?: string | null
  item_title?: string | null
}

export interface OperationLogContext {
  ip?: string | null
  user_agent?: string | null
}

// 邀请默认过期时间 7 天
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

// ============== 内部工具 ==============

function rowToCollaborator(row: any): KbCollaborator {
  return {
    id: Number(row.id),
    collection_id: Number(row.collection_id),
    user_id: Number(row.user_id),
    role: (row.role as CollaboratorRole) || "viewer",
    invited_by: row.invited_by != null ? Number(row.invited_by) : null,
    joined_at: Number(row.joined_at),
    created_at: Number(row.created_at),
    username: row.username,
    avatar_url: row.avatar_url,
    email: row.email,
    uid: row.uid
  }
}

function rowToInvitation(row: any): KbInvitation {
  return {
    id: Number(row.id),
    collection_id: Number(row.collection_id),
    inviter_id: Number(row.inviter_id),
    invitee_id: Number(row.invitee_id),
    role: (row.role as CollaboratorRole) || "editor",
    status: (row.status as InvitationStatus) || "pending",
    message: row.message,
    expires_at: row.expires_at != null ? Number(row.expires_at) : null,
    created_at: Number(row.created_at),
    responded_at: row.responded_at != null ? Number(row.responded_at) : null,
    collection_name: row.collection_name,
    inviter_name: row.inviter_name,
    inviter_avatar: row.inviter_avatar,
    invitee_name: row.invitee_name,
    invitee_avatar: row.invitee_avatar
  }
}

function rowToLog(row: any): KbOperationLog {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    collection_id: row.collection_id != null ? Number(row.collection_id) : null,
    item_id: row.item_id != null ? Number(row.item_id) : null,
    action: row.action,
    target_type: row.target_type,
    target_id: row.target_id != null ? Number(row.target_id) : null,
    metadata: row.metadata,
    ip: row.ip,
    user_agent: row.user_agent,
    visibility: row.visibility || "collection",
    created_at: Number(row.created_at),
    username: row.username,
    avatar_url: row.avatar_url,
    collection_name: row.collection_name,
    item_title: row.item_title
  }
}

// ============== 协作者查询 ==============

/**
 * 列出某集合的全部协作者（含 owner）
 */
export async function listCollaborators(collectionId: number): Promise<KbCollaborator[]> {
  await initDB()
  // 用 UNION ALL 合并 owner（来自 knowledge_collections.user_id）和 kb_collaborators 表
  // 避免 owner 不在 kb_collaborators 表里而不出现在协作者列表中
  const rows = await query<any>(
    `SELECT user_id, role, joined_at, invited_by, username, avatar_url, email, uid FROM (
       SELECT kc.user_id AS user_id,
              'owner'::text AS role,
              kc.created_at AS joined_at,
              NULL::bigint AS invited_by,
              u.username, u.avatar_url, u.email, u.uid
         FROM knowledge_collections kc
         LEFT JOIN users u ON u.id = kc.user_id
        WHERE kc.id = $1
       UNION ALL
       SELECT c.user_id, c.role, c.joined_at, c.invited_by,
              u.username, u.avatar_url, u.email, u.uid
         FROM kb_collaborators c
         LEFT JOIN users u ON u.id = c.user_id
        WHERE c.collection_id = $1
     ) AS all_members
     ORDER BY role = 'owner' DESC, role = 'admin' DESC, role = 'editor' DESC, joined_at ASC`,
    [collectionId]
  )
  return rows.map(rowToCollaborator)
}

/**
 * 获取单条协作者记录（带用户信息）
 */
export async function getCollaborator(
  collectionId: number,
  userId: number
): Promise<KbCollaborator | null> {
  await initDB()
  const row = await queryOne<any>(
    `SELECT c.*, u.username, u.avatar_url, u.email, u.uid
       FROM kb_collaborators c
       LEFT JOIN users u ON u.id = c.user_id
      WHERE c.collection_id = $1 AND c.user_id = $2`,
    [collectionId, userId]
  )
  return row ? rowToCollaborator(row) : null
}

/**
 * 列出当前用户作为协作者参与的所有集合（不含自己 owner 的，避免重复）
 * 返回集合完整字段 + 我的角色 + owner 用户名
 */
export async function listCollaboratedCollections(userId: number): Promise<any[]> {
  await initDB()
  const rows = await query<any>(
    `SELECT kc.*,
            c.role AS my_role,
            owner.username AS owner_name,
            owner.avatar_url AS owner_avatar,
            (SELECT COUNT(*) FROM kb_collaborators WHERE collection_id = kc.id) AS collaborator_count
       FROM kb_collaborators c
       JOIN knowledge_collections kc ON kc.id = c.collection_id
       LEFT JOIN users owner ON owner.id = kc.user_id
      WHERE c.user_id = $1
        AND c.role != 'owner'
        AND kc.is_archived = 0
        AND (kc.is_marketplace = 0 OR kc.is_marketplace IS NULL)
      ORDER BY c.joined_at DESC`,
    [userId]
  )
  return rows.map((r) => ({
    id: Number(r.id),
    user_id: Number(r.user_id),
    name: r.name,
    description: r.description,
    parent_id: r.parent_id != null ? Number(r.parent_id) : null,
    color: r.color,
    icon: r.icon,
    sort_order: r.sort_order,
    is_archived: r.is_archived,
    item_count: r.item_count,
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
    my_role: r.my_role,
    owner_name: r.owner_name,
    owner_avatar: r.owner_avatar,
    collaborator_count: Number(r.collaborator_count)
  }))
}

/**
 * 创建集合时自动注册 owner
 */
export async function addOwner(collectionId: number, userId: number): Promise<void> {
  await initDB()
  const now = Date.now()
  await execute(
    `INSERT INTO kb_collaborators (collection_id, user_id, role, invited_by, joined_at, created_at)
     VALUES ($1, $2, 'owner', NULL, $3, $3)
     ON CONFLICT (collection_id, user_id) DO NOTHING`,
    [collectionId, userId, now]
  )
}

/**
 * 直接添加协作者（仅 owner/admin 可调用，用于跳过邀请流程的内部场景）
 */
export async function addCollaborator(
  collectionId: number,
  userId: number,
  role: CollaboratorRole,
  invitedBy: number
): Promise<boolean> {
  if (role === "owner") return false // owner 不可被添加
  await initDB()
  const now = Date.now()
  const res = await execute(
    `INSERT INTO kb_collaborators (collection_id, user_id, role, invited_by, joined_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $5)
     ON CONFLICT (collection_id, user_id) DO UPDATE
       SET role = EXCLUDED.role, joined_at = EXCLUDED.joined_at
       WHERE kb_collaborators.role <> 'owner'`,
    [collectionId, userId, role, invitedBy, now]
  )
  return (res.rowCount ?? 0) > 0
}

/**
 * 变更协作者角色（不能变更 owner）
 */
export async function updateCollaboratorRole(
  collectionId: number,
  userId: number,
  newRole: CollaboratorRole
): Promise<boolean> {
  if (newRole === "owner") return false
  await initDB()
  const res = await execute(
    `UPDATE kb_collaborators
        SET role = $3
      WHERE collection_id = $1 AND user_id = $2 AND role <> 'owner'`,
    [collectionId, userId, newRole]
  )
  return (res.rowCount ?? 0) > 0
}

/**
 * 移除协作者（不能移除 owner）
 */
export async function removeCollaborator(
  collectionId: number,
  userId: number
): Promise<boolean> {
  await initDB()
  const res = await execute(
    `DELETE FROM kb_collaborators
      WHERE collection_id = $1 AND user_id = $2 AND role <> 'owner'`,
    [collectionId, userId]
  )
  return (res.rowCount ?? 0) > 0
}

/**
 * 权限校验：用户在某集合上的最高角色
 *  - 系统管理员自动获得 admin 权限
 *  - 集合 owner（user_id 字段）获得 owner
 *  - 市场发布者获得 admin
 *  - 协作者表 kb_collaborators 提供 admin/editor/viewer
 */
export async function resolveRole(
  collectionId: number,
  userId: number,
  isSystemAdmin: boolean = false
): Promise<CollaboratorRole | null> {
  await initDB()
  if (isSystemAdmin) return "admin"

  // 自动识别系统管理员（admin/super_admin），避免每个调用点都重复传 isSystemAdmin
  const userRow = await queryOne<{ role: string }>(
    "SELECT role FROM users WHERE id = $1",
    [userId]
  )
  if (userRow?.role === "admin" || userRow?.role === "super_admin") {
    return "admin"
  }

  const row = await queryOne<any>(
    `SELECT
        kc.user_id AS owner_user_id,
        kc.is_marketplace,
        kc.publisher_id,
        COALESCE(col.role, NULL) AS collaborator_role
      FROM knowledge_collections kc
        LEFT JOIN kb_collaborators col
          ON col.collection_id = kc.id AND col.user_id = $2
      WHERE kc.id = $1`,
    [collectionId, userId]
  )
  if (!row) return null

  if (row.owner_user_id === userId) return "owner"
  if (row.publisher_id === userId) return "admin"
  if (row.collaborator_role) return row.collaborator_role as CollaboratorRole
  return null
}

/**
 * 校验用户在集合上是否具备指定权限级别
 *  - "read"  >= viewer
 *  - "write" >= editor
 *  - "admin" >= admin
 */
export async function hasPermission(
  collectionId: number,
  userId: number,
  level: "read" | "write" | "admin",
  isSystemAdmin: boolean = false
): Promise<boolean> {
  const role = await resolveRole(collectionId, userId, isSystemAdmin)
  if (!role) return false
  if (level === "read") return true // 任何角色都可读
  if (level === "write") return role === "owner" || role === "admin" || role === "editor"
  if (level === "admin") return role === "owner" || role === "admin"
  return false
}

// ============== 邀请 ==============

/**
 * 发送邀请
 *  - 不允许重复 pending 邀请
 *  - 不允许邀请已经是协作者的人
 *  - 不能邀请自己
 */
export async function createInvitation(params: {
  collectionId: number
  inviterId: number
  inviteeId: number
  role: CollaboratorRole
  message?: string | null
  expiresInMs?: number
}): Promise<{ id: number; status: "created" | "already_member" | "already_pending" | "self" | "invalid_role" | "forbidden" }> {
  if (params.inviterId === params.inviteeId) {
    return { id: 0, status: "self" }
  }
  if (params.role === "owner") {
    return { id: 0, status: "invalid_role" }
  }

  await initDB()
  const now = Date.now()
  const expiresAt = now + (params.expiresInMs ?? INVITATION_TTL_MS)

  // 权限校验：只有 owner / admin 可以邀请
  const inviterRole = await resolveRole(params.collectionId, params.inviterId)
  if (inviterRole !== "owner" && inviterRole !== "admin") {
    return { id: 0, status: "forbidden" }
  }

  // 已经是协作者？
  const existing = await getCollaborator(params.collectionId, params.inviteeId)
  if (existing) {
    return { id: 0, status: "already_member" }
  }

  // 已有 pending 邀请？
  const pending = await queryOne<any>(
    `SELECT id FROM kb_invitations
      WHERE collection_id = $1 AND invitee_id = $2 AND status = 'pending'`,
    [params.collectionId, params.inviteeId]
  )
  if (pending) {
    return { id: Number(pending.id), status: "already_pending" }
  }

  const res = await execute(
    `INSERT INTO kb_invitations
       (collection_id, inviter_id, invitee_id, role, status, message, expires_at, created_at)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)
     RETURNING id`,
    [
      params.collectionId,
      params.inviterId,
      params.inviteeId,
      params.role,
      params.message ?? null,
      expiresAt,
      now
    ]
  )
  const id = Number(res.rows?.[0]?.id) || 0
  return { id, status: "created" }
}

/**
 * 列出我收到的邀请（含已响应历史）
 */
export async function listInvitationsReceived(
  userId: number,
  filter: { status?: InvitationStatus | "all"; limit?: number } = {}
): Promise<KbInvitation[]> {
  await initDB()
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200)
  const params: any[] = [userId]
  let where = "i.invitee_id = $1"
  if (filter.status && filter.status !== "all") {
    params.push(filter.status)
    where += ` AND i.status = $${params.length}`
  }
  params.push(limit)

  const rows = await query<any>(
    `SELECT i.*,
            kc.name AS collection_name,
            inv.username AS inviter_name,
            inv.avatar_url AS inviter_avatar
       FROM kb_invitations i
       LEFT JOIN knowledge_collections kc ON kc.id = i.collection_id
       LEFT JOIN users inv ON inv.id = i.inviter_id
      WHERE ${where}
      ORDER BY i.created_at DESC
      LIMIT $${params.length}`,
    params
  )
  return rows.map(rowToInvitation)
}

/**
 * 列出我发出的邀请
 */
export async function listInvitationsSent(
  userId: number,
  filter: { collectionId?: number; status?: InvitationStatus | "all"; limit?: number } = {}
): Promise<KbInvitation[]> {
  await initDB()
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200)
  const params: any[] = [userId]
  let where = "i.inviter_id = $1"
  if (filter.collectionId) {
    params.push(filter.collectionId)
    where += ` AND i.collection_id = $${params.length}`
  }
  if (filter.status && filter.status !== "all") {
    params.push(filter.status)
    where += ` AND i.status = $${params.length}`
  }
  params.push(limit)

  const rows = await query<any>(
    `SELECT i.*,
            kc.name AS collection_name,
            inv.username AS invitee_name,
            inv.avatar_url AS invitee_avatar
       FROM kb_invitations i
       LEFT JOIN knowledge_collections kc ON kc.id = i.collection_id
       LEFT JOIN users inv ON inv.id = i.invitee_id
      WHERE ${where}
      ORDER BY i.created_at DESC
      LIMIT $${params.length}`,
    params
  )
  return rows.map(rowToInvitation)
}

/**
 * 获取单条邀请
 */
export async function getInvitation(id: number): Promise<KbInvitation | null> {
  await initDB()
  const row = await queryOne<any>(
    `SELECT i.*,
            kc.name AS collection_name,
            inv.username AS inviter_name,
            inv.avatar_url AS inviter_avatar,
            inv2.username AS invitee_name,
            inv2.avatar_url AS invitee_avatar
       FROM kb_invitations i
       LEFT JOIN knowledge_collections kc ON kc.id = i.collection_id
       LEFT JOIN users inv ON inv.id = i.inviter_id
       LEFT JOIN users inv2 ON inv2.id = i.invitee_id
      WHERE i.id = $1`,
    [id]
  )
  return row ? rowToInvitation(row) : null
}

/**
 * 接受邀请：原子地把 pending 邀请标记为 accepted，并加入协作者表
 */
export async function acceptInvitation(
  invitationId: number,
  userId: number
): Promise<{ ok: boolean; reason?: "not_found" | "not_yours" | "not_pending" | "expired" | "already_member" | "invalid_role" }> {
  await initDB()

  return withTransaction(async (client) => {
    // SELECT ... FOR UPDATE 锁定邀请行
    const { rows } = await client.query(
      `SELECT * FROM kb_invitations WHERE id = $1 FOR UPDATE`,
      [invitationId]
    )
    const inv = rows[0]
    if (!inv) return { ok: false, reason: "not_found" }
    // 用字符串比较，避免 BigInt/number 类型不一致导致误判
    if (String(inv.invitee_id) !== String(userId)) {
      console.warn("[acceptInvitation] not_yours:", {
        db_invitee_id: inv.invitee_id,
        typeof_db: typeof inv.invitee_id,
        String_db: String(inv.invitee_id),
        param_userId: userId,
        typeof_param: typeof userId,
        String_param: String(userId)
      })
      return { ok: false, reason: "not_yours" }
    }
    if (inv.status !== "pending") return { ok: false, reason: "not_pending" }
    if (inv.expires_at != null && Number(inv.expires_at) < Date.now()) {
      await client.query(
        `UPDATE kb_invitations SET status = 'expired', responded_at = $2 WHERE id = $1`,
        [invitationId, Date.now()]
      )
      return { ok: false, reason: "expired" }
    }
    if (inv.role === "owner") return { ok: false, reason: "invalid_role" }

    // 已经是协作者？
    const { rows: existing } = await client.query(
      `SELECT id FROM kb_collaborators WHERE collection_id = $1 AND user_id = $2`,
      [inv.collection_id, userId]
    )
    if (existing.length > 0) {
      await client.query(
        `UPDATE kb_invitations SET status = 'accepted', responded_at = $2 WHERE id = $1`,
        [invitationId, Date.now()]
      )
      return { ok: false, reason: "already_member" }
    }

    const now = Date.now()
    await client.query(
      `INSERT INTO kb_collaborators
         (collection_id, user_id, role, invited_by, joined_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $5)`,
      [inv.collection_id, userId, inv.role, inv.inviter_id, now]
    )
    await client.query(
      `UPDATE kb_invitations SET status = 'accepted', responded_at = $2 WHERE id = $1`,
      [invitationId, now]
    )
    return { ok: true }
  })
}

/**
 * 拒绝邀请
 */
export async function rejectInvitation(
  invitationId: number,
  userId: number
): Promise<{ ok: boolean; reason?: "not_found" | "not_yours" | "not_pending" }> {
  await initDB()
  const inv = await queryOne<any>(
    `SELECT * FROM kb_invitations WHERE id = $1`,
    [invitationId]
  )
  if (!inv) return { ok: false, reason: "not_found" }
  if (String(inv.invitee_id) !== String(userId)) {
    console.warn("[rejectInvitation] not_yours:", {
      db_invitee_id: inv.invitee_id,
      typeof_db: typeof inv.invitee_id,
      param_userId: userId,
      typeof_param: typeof userId
    })
    return { ok: false, reason: "not_yours" }
  }
  if (inv.status !== "pending") return { ok: false, reason: "not_pending" }

  await execute(
    `UPDATE kb_invitations SET status = 'rejected', responded_at = $2 WHERE id = $1`,
    [invitationId, Date.now()]
  )
  return { ok: true }
}

/**
 * 取消邀请（仅邀请者本人或同集合 owner/admin）
 */
export async function cancelInvitation(
  invitationId: number,
  actorUserId: number
): Promise<{ ok: boolean; reason?: "not_found" | "not_pending" | "not_authorized" }> {
  await initDB()
  const inv = await queryOne<any>(
    `SELECT * FROM kb_invitations WHERE id = $1`,
    [invitationId]
  )
  if (!inv) return { ok: false, reason: "not_found" }
  if (inv.status !== "pending") return { ok: false, reason: "not_pending" }
  if (Number(inv.inviter_id) !== actorUserId) {
    // 检查是否同集合的 owner/admin
    const role = await resolveRole(Number(inv.collection_id), actorUserId)
    if (role !== "owner" && role !== "admin") {
      return { ok: false, reason: "not_authorized" }
    }
  }
  await execute(
    `UPDATE kb_invitations SET status = 'cancelled', responded_at = $2 WHERE id = $1`,
    [invitationId, Date.now()]
  )
  return { ok: true }
}

/**
 * 自动过期：清理所有 pending 且已过期的邀请（可由 cron 调用）
 */
export async function expirePendingInvitations(): Promise<number> {
  await initDB()
  const res = await execute(
    `UPDATE kb_invitations
        SET status = 'expired', responded_at = $1
      WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < $1`,
    [Date.now()]
  )
  return res.rowCount ?? 0
}

// ============== 操作日志 ==============

/**
 * 写入操作日志
 */
export async function logOperation(params: {
  userId: number
  action: OperationAction | string
  collectionId?: number | null
  itemId?: number | null
  targetType?: string | null
  targetId?: number | null
  metadata?: Record<string, any> | null
  visibility?: "public" | "collection" | "private"
  context?: OperationLogContext
}): Promise<number> {
  await initDB()
  const now = Date.now()
  const res = await execute(
    `INSERT INTO kb_operation_logs
       (user_id, collection_id, item_id, action, target_type, target_id, metadata, ip, user_agent, visibility, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      params.userId,
      params.collectionId ?? null,
      params.itemId ?? null,
      params.action,
      params.targetType ?? null,
      params.targetId ?? null,
      params.metadata ? JSON.stringify(params.metadata) : null,
      params.context?.ip ?? null,
      params.context?.user_agent ?? null,
      params.visibility ?? "collection",
      now
    ]
  )
  return Number(res.rows?.[0]?.id) || 0
}

/**
 * 查询操作日志（多维度过滤）
 */
export async function listOperationLogs(filter: {
  userId?: number
  collectionId?: number
  itemId?: number
  action?: string
  visibility?: "public" | "collection" | "private" | "all"
  limit?: number
  offset?: number
  sinceMs?: number
  untilMs?: number
}): Promise<{ items: KbOperationLog[]; total: number }> {
  await initDB()
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200)
  const offset = Math.max(filter.offset ?? 0, 0)
  const params: any[] = []
  const where: string[] = []

  if (filter.userId != null) {
    params.push(filter.userId)
    where.push(`l.user_id = $${params.length}`)
  }
  if (filter.collectionId != null) {
    params.push(filter.collectionId)
    where.push(`l.collection_id = $${params.length}`)
  }
  if (filter.itemId != null) {
    params.push(filter.itemId)
    where.push(`l.item_id = $${params.length}`)
  }
  if (filter.action && filter.action !== "all") {
    params.push(filter.action)
    where.push(`l.action = $${params.length}`)
  }
  if (filter.visibility && filter.visibility !== "all") {
    params.push(filter.visibility)
    where.push(`l.visibility = $${params.length}`)
  }
  if (filter.sinceMs != null) {
    params.push(filter.sinceMs)
    where.push(`l.created_at >= $${params.length}`)
  }
  if (filter.untilMs != null) {
    params.push(filter.untilMs)
    where.push(`l.created_at < $${params.length}`)
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

  // 总数
  const totalRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM kb_operation_logs l ${whereSql}`,
    params
  )
  const total = totalRow ? Number(totalRow.count) : 0

  // 列表
  const listParams = [...params, limit, offset]
  const rows = await query<any>(
    `SELECT l.*,
            u.username,
            u.avatar_url,
            kc.name AS collection_name,
            ki.title AS item_title
       FROM kb_operation_logs l
       LEFT JOIN users u ON u.id = l.user_id
       LEFT JOIN knowledge_collections kc ON kc.id = l.collection_id
       LEFT JOIN knowledge_items ki ON ki.id = l.item_id
       ${whereSql}
       ORDER BY l.created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  )
  return { items: rows.map(rowToLog), total }
}

/**
 * 全平台可见的活动流（visibility='public'）
 */
export async function listPublicActivity(filter: {
  limit?: number
  offset?: number
  sinceMs?: number
  action?: string
} = {}): Promise<{ items: KbOperationLog[]; total: number }> {
  return listOperationLogs({
    visibility: "public",
    limit: filter.limit,
    offset: filter.offset,
    sinceMs: filter.sinceMs,
    action: filter.action
  })
}

/**
 * 用户能看见的所有活动流：
 *  - 自己产生的所有日志
 *  - 自己作为协作者/owner 的集合的 collection 可见日志
 *  - 全平台 public 日志
 */
export async function listVisibleActivity(
  userId: number,
  filter: {
    limit?: number
    offset?: number
    sinceMs?: number
    action?: string
    collectionId?: number
  } = {}
): Promise<{ items: KbOperationLog[]; total: number }> {
  await initDB()
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200)
  const offset = Math.max(filter.offset ?? 0, 0)
  const params: any[] = []
  const where: string[] = []

  // 自己产生的日志 OR 自己可访问的集合日志 OR 公开日志
  params.push(userId)
  const userParamIdx = params.length
  where.push(`(l.user_id = $${userParamIdx}
              OR l.visibility = 'public'
              OR (l.visibility = 'collection'
                  AND l.collection_id IN (
                    SELECT collection_id FROM kb_collaborators WHERE user_id = $${userParamIdx}
                    UNION
                    SELECT id FROM knowledge_collections WHERE user_id = $${userParamIdx}
                  )))`)

  if (filter.collectionId != null) {
    params.push(filter.collectionId)
    where.push(`l.collection_id = $${params.length}`)
  }
  if (filter.action && filter.action !== "all") {
    params.push(filter.action)
    where.push(`l.action = $${params.length}`)
  }
  if (filter.sinceMs != null) {
    params.push(filter.sinceMs)
    where.push(`l.created_at >= $${params.length}`)
  }

  const whereSql = `WHERE ${where.join(" AND ")}`

  const totalRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM kb_operation_logs l ${whereSql}`,
    params
  )
  const total = totalRow ? Number(totalRow.count) : 0

  const listParams = [...params, limit, offset]
  const rows = await query<any>(
    `SELECT l.*,
            u.username,
            u.avatar_url,
            kc.name AS collection_name,
            ki.title AS item_title
       FROM kb_operation_logs l
       LEFT JOIN users u ON u.id = l.user_id
       LEFT JOIN knowledge_collections kc ON kc.id = l.collection_id
       LEFT JOIN knowledge_items ki ON ki.id = l.item_id
       ${whereSql}
       ORDER BY l.created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  )
  return { items: rows.map(rowToLog), total }
}

// ============== Yjs 文档持久化 ==============

/**
 * 加载 Yjs 文档状态（二进制 update 累积）
 */
export async function loadYjsDocument(itemId: number): Promise<{
  docState: Buffer | null
  version: number
  lastEditorId: number | null
  lastEditAt: number | null
}> {
  await initDB()
  const row = await queryOne<any>(
    `SELECT doc_state, version, last_editor_id, last_edit_at
       FROM kb_yjs_documents
      WHERE item_id = $1`,
    [itemId]
  )
  if (!row) {
    return { docState: null, version: 0, lastEditorId: null, lastEditAt: null }
  }
  return {
    docState: row.doc_state ? Buffer.from(row.doc_state) : null,
    version: Number(row.version) || 0,
    lastEditorId: row.last_editor_id != null ? Number(row.last_editor_id) : null,
    lastEditAt: row.last_edit_at != null ? Number(row.last_edit_at) : null
  }
}

/**
 * 保存 Yjs 文档状态（覆盖式）
 */
export async function saveYjsDocument(
  itemId: number,
  docState: Buffer,
  editorId: number | null
): Promise<void> {
  await initDB()
  const now = Date.now()
  await execute(
    `INSERT INTO kb_yjs_documents
       (item_id, doc_state, last_editor_id, last_edit_at, version, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 1, $4, $4)
     ON CONFLICT (item_id) DO UPDATE
       SET doc_state = EXCLUDED.doc_state,
           last_editor_id = EXCLUDED.last_editor_id,
           last_edit_at = EXCLUDED.last_edit_at,
           version = kb_yjs_documents.version + 1,
           updated_at = EXCLUDED.updated_at`,
    [itemId, docState, editorId, now]
  )
}

/**
 * 写入 Yjs snapshot（可选，主要用于人工备份/恢复）
 */
export async function saveYjsSnapshot(itemId: number, snapshot: string): Promise<void> {
  await initDB()
  const now = Date.now()
  await execute(
    `INSERT INTO kb_yjs_documents
       (item_id, snapshot, last_edit_at, version, created_at, updated_at)
     VALUES ($1, $2, $4, 1, $4, $4)
     ON CONFLICT (item_id) DO UPDATE
       SET snapshot = EXCLUDED.snapshot,
           last_edit_at = EXCLUDED.last_edit_at,
           updated_at = EXCLUDED.updated_at`,
    [itemId, snapshot, null, now]
  )
}
