/**
 * 组织架构服务（Organization Service）
 *
 * 设计目标：
 * 1. 维护组织架构（树形，parent_id 自引用）+ 成员关系
 * 2. 邀请成员到组织节点时，自动授予 deviceControl（使其成为大棚成员），
 *    并在 inviter 与 invitee 之间建立双向 friends 关系（使其出现在 /chat 通讯录）
 * 3. 移除组织成员时，若该用户在所有组织节点都不再存在，则撤销 deviceControl
 * 4. 与 monitor 页面 /api/members 双向一致：
 *    - org 邀请 → deviceControl=true（monitor 自动显示）
 *    - syncExistingGreenhouseMembers: 把当前所有大棚成员回填到指定组织节点
 *
 * 与 ChatService 解耦：组织架构不是 chat group，仅复用 friends 表来实现"通讯录可见性"。
 */

import { initDB, query, queryOne, execute, withTransaction } from "./database"
import { UserPublic, toPublicUser, User, getUserByEmail, getUserById, updateUser } from "./user-service"
import { publishUserEvent } from "@/lib/server/user-event-bus"

let dbInitPromise: Promise<void> | null = null

async function ensureDB() {
  if (!dbInitPromise) {
    dbInitPromise = initDB()
  }
  await dbInitPromise
}

// ===== Types =====

export type OrganizationRole = "owner" | "admin" | "member"

export interface Organization {
  id: number
  name: string
  parent_id: number | null
  owner_id: number
  description: string | null
  created_at: number
  updated_at: number
  // 关联字段（join 后填充）
  member_count?: number
  child_count?: number
  owner?: Pick<UserPublic, "id" | "username" | "avatar_url"> | null
}

export interface OrganizationMember {
  id: number
  org_id: number
  user_id: number
  role: OrganizationRole
  invited_by: number | null
  joined_at: number
  user?: UserPublic
}

// ===== Helpers =====

interface OrgRow {
  id: number
  name: string
  parent_id: number | null
  owner_id: number
  description: string | null
  created_at: number
  updated_at: number
  member_count: number
  child_count: number
  owner_username: string | null
  owner_avatar_url: string | null
}

interface OrgMemberRow {
  id: number
  org_id: number
  user_id: number
  role: string
  invited_by: number | null
  joined_at: number
  // users 表字段
  uid: string
  email: string
  username: string
  avatar_url: string | null
  role_user: string // users.role，重命名避免与 organization_members.role 冲突
  membership: string
  permissions: string
  notification_settings: string
  created_at: number
}

function mapOrgMemberRow(row: OrgMemberRow): OrganizationMember {
  // 重建一个 User 形状供 toPublicUser 使用
  const userLike: User = {
    id: row.user_id,
    uid: row.uid,
    email: row.email,
    password_hash: "",
    username: row.username,
    avatar_url: row.avatar_url,
    role: row.role_user as User["role"],
    membership: row.membership as User["membership"],
    permissions: row.permissions,
    notification_settings: row.notification_settings,
    created_at: row.created_at,
    updated_at: 0
  }
  return {
    id: row.id,
    org_id: row.org_id,
    user_id: row.user_id,
    role: row.role as OrganizationRole,
    invited_by: row.invited_by,
    joined_at: row.joined_at,
    user: toPublicUser(userLike)
  }
}

function mapOrgRow(row: OrgRow): Organization {
  return {
    id: row.id,
    name: row.name,
    parent_id: row.parent_id,
    owner_id: row.owner_id,
    description: row.description,
    created_at: row.created_at,
    updated_at: row.updated_at,
    member_count: Number(row.member_count) || 0,
    child_count: Number(row.child_count) || 0,
    owner: row.owner_username
      ? {
          id: row.owner_id,
          username: row.owner_username,
          avatar_url: row.owner_avatar_url
        }
      : null
  }
}

// ===== Service =====

export class OrganizationService {
  /**
   * 列出全部组织节点（带成员数、子节点数、所有者信息）
   * 前端自行构建树形结构（无递归 CTE 依赖）
   */
  static async listOrganizations(): Promise<Organization[]> {
    await ensureDB()
    const rows = await query<OrgRow>(`
      SELECT
        o.*,
        COALESCE(m.cnt, 0) AS member_count,
        COALESCE(c.cnt, 0) AS child_count,
        u.username AS owner_username,
        u.avatar_url AS owner_avatar_url
      FROM organizations o
      LEFT JOIN (SELECT org_id, COUNT(*)::int AS cnt FROM organization_members GROUP BY org_id) m
        ON m.org_id = o.id
      LEFT JOIN (SELECT parent_id, COUNT(*)::int AS cnt FROM organizations WHERE parent_id IS NOT NULL GROUP BY parent_id) c
        ON c.parent_id = o.id
      LEFT JOIN users u ON u.id = o.owner_id
      ORDER BY o.created_at ASC
    `)
    return rows.map(mapOrgRow)
  }

  /**
   * 获取单个组织节点（含成员数、子节点数、所有者）
   */
  static async getOrganization(id: number): Promise<Organization | null> {
    await ensureDB()
    const row = await queryOne<OrgRow>(
      `
      SELECT
        o.*,
        COALESCE(m.cnt, 0) AS member_count,
        COALESCE(c.cnt, 0) AS child_count,
        u.username AS owner_username,
        u.avatar_url AS owner_avatar_url
      FROM organizations o
      LEFT JOIN (SELECT org_id, COUNT(*)::int AS cnt FROM organization_members GROUP BY org_id) m
        ON m.org_id = o.id
      LEFT JOIN (SELECT parent_id, COUNT(*)::int AS cnt FROM organizations WHERE parent_id IS NOT NULL GROUP BY parent_id) c
        ON c.parent_id = o.id
      LEFT JOIN users u ON u.id = o.owner_id
      WHERE o.id = $1
      `,
      [id]
    )
    return row ? mapOrgRow(row) : null
  }

  /**
   * 创建组织节点
   * 仅 admin/super_admin 可调用（API 层做权限校验，service 不重复）
   */
  static async createOrganization(input: {
    name: string
    parentId?: number | null
    ownerId: number
    description?: string | null
  }): Promise<{ success: boolean; organizationId?: number; message: string }> {
    await ensureDB()
    const name = input.name.trim()
    if (!name) {
      return { success: false, message: "组织名称不能为空" }
    }
    if (name.length > 50) {
      return { success: false, message: "组织名称不能超过 50 字符" }
    }

    // 校验 parentId 存在（如果指定）
    if (input.parentId) {
      const parent = await queryOne<{ id: number }>(
        "SELECT id FROM organizations WHERE id = $1",
        [input.parentId]
      )
      if (!parent) {
        return { success: false, message: "上级组织不存在" }
      }
    }

    const now = Date.now()
    try {
      const row = await queryOne<{ id: number }>(
        `INSERT INTO organizations (name, parent_id, owner_id, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [name, input.parentId ?? null, input.ownerId, input.description ?? null, now, now]
      )
      if (!row) {
        return { success: false, message: "创建组织失败" }
      }

      // 创建者自动作为 owner 加入该组织
      await execute(
        `INSERT INTO organization_members (org_id, user_id, role, invited_by, joined_at)
         VALUES ($1, $2, 'owner', $3, $4)
         ON CONFLICT (org_id, user_id) DO NOTHING`,
        [row.id, input.ownerId, input.ownerId, now]
      )

      return { success: true, organizationId: row.id, message: "组织创建成功" }
    } catch (error) {
      console.error("[organization-service] createOrganization error:", error)
      return { success: false, message: "创建组织失败" }
    }
  }

  /**
   * 更新组织节点基本信息
   */
  static async updateOrganization(
    id: number,
    input: { name?: string; parentId?: number | null; description?: string | null }
  ): Promise<{ success: boolean; message: string }> {
    await ensureDB()

    const sets: string[] = []
    const params: unknown[] = []
    let idx = 1

    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) return { success: false, message: "组织名称不能为空" }
      if (name.length > 50) return { success: false, message: "组织名称不能超过 50 字符" }
      sets.push(`name = $${idx++}`)
      params.push(name)
    }
    if (input.parentId !== undefined) {
      if (input.parentId === id) {
        return { success: false, message: "不能将自身设为上级组织" }
      }
      if (input.parentId) {
        const parent = await queryOne<{ id: number }>(
          "SELECT id FROM organizations WHERE id = $1",
          [input.parentId]
        )
        if (!parent) return { success: false, message: "上级组织不存在" }
        // 简单环检测：不允许把 parent 设为自身的后代
        const descendantIds = await this.collectDescendantIds(id)
        if (descendantIds.has(input.parentId)) {
          return { success: false, message: "不能将后代组织设为上级（会形成环）" }
        }
      }
      sets.push(`parent_id = $${idx++}`)
      params.push(input.parentId ?? null)
    }
    if (input.description !== undefined) {
      sets.push(`description = $${idx++}`)
      params.push(input.description ?? null)
    }

    if (sets.length === 0) {
      return { success: true, message: "无更新" }
    }

    sets.push(`updated_at = $${idx++}`)
    params.push(Date.now())
    params.push(id)

    try {
      const result = await execute(
        `UPDATE organizations SET ${sets.join(", ")} WHERE id = $${idx}`,
        params as unknown[]
      )
      if (result.rowCount === 0) {
        return { success: false, message: "组织不存在" }
      }
      return { success: true, message: "组织更新成功" }
    } catch (error) {
      console.error("[organization-service] updateOrganization error:", error)
      return { success: false, message: "更新组织失败" }
    }
  }

  /**
   * 删除组织节点（连同子组织和成员关系一并删除）
   * 使用递归 CTE 收集所有后代 id，事务删除
   */
  static async deleteOrganization(id: number): Promise<{ success: boolean; message: string }> {
    await ensureDB()
    try {
      const allIds = await this.collectDescendantIds(id)
      allIds.add(id)

      await withTransaction(async (client) => {
        await client.query("DELETE FROM organization_members WHERE org_id = ANY($1::bigint[])", [
          Array.from(allIds)
        ])
        await client.query("DELETE FROM organizations WHERE id = ANY($1::bigint[])", [
          Array.from(allIds)
        ])
      })
      return { success: true, message: "组织已删除" }
    } catch (error) {
      console.error("[organization-service] deleteOrganization error:", error)
      return { success: false, message: "删除组织失败" }
    }
  }

  /**
   * 列出指定组织的全部成员（含 users 表信息）
   */
  static async listMembers(orgId: number): Promise<OrganizationMember[]> {
    await ensureDB()
    const rows = await query<OrgMemberRow>(
      `
      SELECT
        om.id, om.org_id, om.user_id, om.role, om.invited_by, om.joined_at,
        u.uid, u.email, u.username, u.avatar_url, u.role AS role_user,
        u.membership, u.permissions, u.notification_settings, u.created_at
      FROM organization_members om
      INNER JOIN users u ON u.id = om.user_id
      WHERE om.org_id = $1
      ORDER BY
        CASE om.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
        om.joined_at ASC
      `,
      [orgId]
    )
    return rows.map(mapOrgMemberRow)
  }

  /**
   * 邀请成员加入组织（核心同步逻辑）
   *
   * 副作用（全部在同一事务内）：
   * 1. 插入 organization_members 记录
   * 2. 若用户尚未有 deviceControl 权限，则授予（成为大棚成员）
   * 3. 在 inviter 与 invitee 之间建立双向 friends 关系（使其出现在 /chat）
   * 4. 通过 SSE 通知 invitee（chat_friend_request_responded accept）以触发 /chat 实时刷新
   *
   * @returns 邀请结果
   */
  static async inviteMember(input: {
    orgId: number
    email: string
    inviterId: number
    role?: OrganizationRole
  }): Promise<{ success: boolean; message: string; userId?: number }> {
    await ensureDB()

    const email = input.email.trim().toLowerCase()
    if (!email) {
      return { success: false, message: "请输入邮箱地址" }
    }

    // 1. 校验组织存在
    const org = await queryOne<{ id: number; name: string; owner_id: number }>(
      "SELECT id, name, owner_id FROM organizations WHERE id = $1",
      [input.orgId]
    )
    if (!org) {
      return { success: false, message: "组织不存在" }
    }

    // 2. 查找目标用户
    const targetUser = await getUserByEmail(email)
    if (!targetUser) {
      return { success: false, message: "未找到该邮箱对应的用户" }
    }

    if (targetUser.id === input.inviterId) {
      return { success: false, message: "不能邀请自己" }
    }

    // 3. 校验是否已是成员
    const existing = await queryOne<{ id: number }>(
      "SELECT id FROM organization_members WHERE org_id = $1 AND user_id = $2",
      [input.orgId, targetUser.id]
    )
    if (existing) {
      return { success: false, message: "该用户已是组织成员" }
    }

    const role: OrganizationRole = input.role ?? "member"
    const now = Date.now()

    try {
      await withTransaction(async (client) => {
        // a. 插入组织成员
        await client.query(
          `INSERT INTO organization_members (org_id, user_id, role, invited_by, joined_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (org_id, user_id) DO NOTHING`,
          [input.orgId, targetUser.id, role, input.inviterId, now]
        )

        // b. 授予 deviceControl（如尚未拥有）
        const permRow = await client.query<{ permissions: string }>(
          "SELECT permissions FROM users WHERE id = $1",
          [targetUser.id]
        )
        const existingPerms = (() => {
          try {
            return JSON.parse(permRow.rows[0]?.permissions || "{}")
          } catch {
            return {}
          }
        })()
        const isAlreadyMember =
          targetUser.role === "admin" ||
          targetUser.role === "super_admin" ||
          existingPerms.deviceControl === true

        if (!isAlreadyMember) {
          existingPerms.deviceControl = true
          await client.query(
            "UPDATE users SET permissions = $1, updated_at = $2 WHERE id = $3",
            [JSON.stringify(existingPerms), now, targetUser.id]
          )
        }

        // c. 建立 inviter ↔ invitee 双向 friends（使其出现在 /chat）
        await client.query(
          `INSERT INTO friends (user_id, friend_id, created_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, friend_id) DO NOTHING`,
          [input.inviterId, targetUser.id, now]
        )
        await client.query(
          `INSERT INTO friends (user_id, friend_id, created_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, friend_id) DO NOTHING`,
          [targetUser.id, input.inviterId, now]
        )
      })

      // d. SSE 通知 invitee：组织已邀请（复用 chat_friend_request_responded 让 /chat 通讯录刷新）
      const inviter = await getUserById(input.inviterId)
      publishUserEvent({
        type: "chat_friend_request_responded",
        userId: targetUser.id,
        requestId: 0, // 0 表示来自组织邀请（非好友请求）
        action: "accept",
        responder: {
          id: input.inviterId,
          username: inviter?.username || ""
        }
      })

      return {
        success: true,
        message: `已邀请 ${targetUser.username} 加入「${org.name}」，并添加为大棚成员`,
        userId: targetUser.id
      }
    } catch (error) {
      console.error("[organization-service] inviteMember error:", error)
      return { success: false, message: "邀请成员失败" }
    }
  }

  /**
   * 从组织移除成员
   *
   * 副作用：
   * - 若该用户在所有组织节点都不再存在，撤销其 deviceControl（不再是大棚成员）
   * - 不删除 friends 关系（保留通讯录，避免误删好友）
   *
   * @returns 操作结果
   */
  static async removeMember(
    orgId: number,
    userId: number,
    operatorId: number
  ): Promise<{ success: boolean; message: string }> {
    await ensureDB()

    // 不能移除组织所有者
    const org = await queryOne<{ owner_id: number }>(
      "SELECT owner_id FROM organizations WHERE id = $1",
      [orgId]
    )
    if (!org) {
      return { success: false, message: "组织不存在" }
    }
    if (userId === org.owner_id) {
      return { success: false, message: "不能移除组织所有者" }
    }

    // 不能移除自己（除非是 super_admin）
    if (userId === operatorId) {
      const operator = await getUserById(operatorId)
      if (!operator || operator.role !== "super_admin") {
        return { success: false, message: "不能移除自己" }
      }
    }

    // 不能移除 super_admin
    const target = await getUserById(userId)
    if (target?.role === "super_admin" && operatorId !== org.owner_id) {
      return { success: false, message: "不能移除超级管理员" }
    }

    try {
      await execute("DELETE FROM organization_members WHERE org_id = $1 AND user_id = $2", [
        orgId,
        userId
      ])

      // 检查该用户是否还在任何组织节点中
      const stillInAnyOrg = await queryOne<{ id: number }>(
        "SELECT id FROM organization_members WHERE user_id = $1 LIMIT 1",
        [userId]
      )

      // 若已不在任何组织，且不是 admin/super_admin，撤销 deviceControl
      if (!stillInAnyOrg && target && target.role === "user") {
        const existingPerms = (() => {
          try {
            return JSON.parse(target.permissions || "{}")
          } catch {
            return {}
          }
        })()
        if (existingPerms.deviceControl === true) {
          delete existingPerms.deviceControl
          await updateUser(userId, { permissions: existingPerms })
        }
      }

      return { success: true, message: "成员已移除" }
    } catch (error) {
      console.error("[organization-service] removeMember error:", error)
      return { success: false, message: "移除成员失败" }
    }
  }

  /**
   * 把当前所有大棚成员回填到指定组织节点（数据整合）
   *
   * 用于一次性同步：monitor 页面的成员 → 组织架构
   * - 已是该组织成员的跳过
   * - admin/super_admin 跳过（他们通过 role 而非 deviceControl 隐式是大棚成员）
   * - 调用者需为 admin/super_admin（API 层校验）
   */
  static async syncExistingGreenhouseMembers(
    orgId: number,
    operatorId: number
  ): Promise<{ success: boolean; added: number; skipped: number; message: string }> {
    await ensureDB()

    const org = await queryOne<{ id: number; name: string }>(
      "SELECT id, name FROM organizations WHERE id = $1",
      [orgId]
    )
    if (!org) {
      return { success: false, added: 0, skipped: 0, message: "组织不存在" }
    }

    const allUsers = await query<User>("SELECT * FROM users ORDER BY created_at ASC")
    const greenhouseMembers = allUsers.filter(u => {
      if (u.role === "admin" || u.role === "super_admin") return true
      try {
        const perms = JSON.parse(u.permissions || "{}")
        return perms?.deviceControl === true
      } catch {
        return false
      }
    })

    let added = 0
    let skipped = 0
    const now = Date.now()

    try {
      await withTransaction(async (client) => {
        for (const u of greenhouseMembers) {
          const result = await client.query(
            `INSERT INTO organization_members (org_id, user_id, role, invited_by, joined_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (org_id, user_id) DO NOTHING`,
            [orgId, u.id, "member", operatorId, now]
          )
          if (result.rowCount && result.rowCount > 0) {
            added++
          } else {
            skipped++
          }
        }
      })

      return {
        success: true,
        added,
        skipped,
        message: `已同步 ${added} 位成员到「${org.name}」（跳过 ${skipped} 位已存在）`
      }
    } catch (error) {
      console.error("[organization-service] syncExistingGreenhouseMembers error:", error)
      return {
        success: false,
        added: 0,
        skipped: 0,
        message: "同步失败"
      }
    }
  }

  /**
   * 将组织内所有成员（除自己外）与当前用户建立双向 friends 关系
   *
   * 用于：用户查看组织详情时，自动把组织成员加入通讯录，使其可直达 /chat 发消息。
   * - 已是好友的跳过（ON CONFLICT DO NOTHING）
   * - 不创建好友请求流程，直接建立 accepted 状态的双向 friends
   * - 不涉及 deviceControl 权限变更（仅影响通讯录可见性）
   *
   * @returns 新增好友数（单向计数，实际双向插入）
   */
  static async ensureMembersAsFriends(
    orgId: number,
    userId: number
  ): Promise<{ success: boolean; added: number; skipped: number; message: string }> {
    await ensureDB()

    const org = await queryOne<{ id: number; name: string }>(
      "SELECT id, name FROM organizations WHERE id = $1",
      [orgId]
    )
    if (!org) {
      return { success: false, added: 0, skipped: 0, message: "组织不存在" }
    }

    // 取该组织所有成员 user_id（排除自己）
    const memberRows = await query<{ user_id: number }>(
      "SELECT user_id FROM organization_members WHERE org_id = $1 AND user_id != $2",
      [orgId, userId]
    )

    if (memberRows.length === 0) {
      return { success: true, added: 0, skipped: 0, message: "组织暂无其他成员" }
    }

    const now = Date.now()
    let added = 0
    let skipped = 0

    try {
      await withTransaction(async (client) => {
        for (const row of memberRows) {
          // 双向插入
          const r1 = await client.query(
            `INSERT INTO friends (user_id, friend_id, created_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, friend_id) DO NOTHING`,
            [userId, row.user_id, now]
          )
          const r2 = await client.query(
            `INSERT INTO friends (user_id, friend_id, created_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, friend_id) DO NOTHING`,
            [row.user_id, userId, now]
          )
          if ((r1.rowCount ?? 0) > 0 || (r2.rowCount ?? 0) > 0) {
            added++
          } else {
            skipped++
          }
        }
      })

      return {
        success: true,
        added,
        skipped,
        message: added > 0
          ? `已将 ${added} 位组织成员加入通讯录`
          : "组织成员已在通讯录中"
      }
    } catch (error) {
      console.error("[organization-service] ensureMembersAsFriends error:", error)
      return { success: false, added: 0, skipped: 0, message: "同步通讯录失败" }
    }
  }

  // ===== Internal helpers =====

  /**
   * 收集某个组织节点的所有后代 id（不含自身）
   * 使用递归 CTE
   */
  private static async collectDescendantIds(rootId: number): Promise<Set<number>> {
    await ensureDB()
    const rows = await query<{ id: number }>(
      `
      WITH RECURSIVE descendants AS (
        SELECT id FROM organizations WHERE parent_id = $1
        UNION ALL
        SELECT o.id FROM organizations o
        INNER JOIN descendants d ON o.parent_id = d.id
      )
      SELECT id FROM descendants
      `,
      [rootId]
    )
    return new Set(rows.map(r => r.id))
  }
}
