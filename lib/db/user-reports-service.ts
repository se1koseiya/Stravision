/**
 * 用户简报/我的空间 服务
 * 统一管理 user_reports 表的 CRUD，供"我的空间"面板、定时任务简报自动入空间、聊天内报告保存共用。
 */
import { queryOne, query, execute, initDB } from "./database"

export type UserReportSource = "manual" | "scheduled_task" | "ai_cron" | "chat" | "import"
export type UserReportType = "report" | "task" | "file" | "audio" | "creation" | "image" | "video"

export interface UserReport {
  id: number
  user_id: number
  source: UserReportSource
  source_id: string | null
  title: string
  html: string
  summary: string | null
  type: UserReportType
  is_favorite: 0 | 1
  created_at: number
}

export interface CreateUserReportInput {
  user_id: number
  title: string
  html: string
  source?: UserReportSource
  source_id?: string | null
  summary?: string | null
  type?: UserReportType
}

export interface ListUserReportsOptions {
  limit?: number
  onlyFavorite?: boolean
}

/**
 * pg 驱动会把 BIGINT 列（id / created_at）以字符串返回（避免 int64 精度丢失），
 * 统一归一为 number，否则前端 new Date("1758512345678") 得到 Invalid Date，显示 NaN-NaN-NaN NaN:NaN。
 */
function mapReportRow(row: UserReport): UserReport {
  return {
    ...row,
    id: Number(row.id),
    created_at: Number(row.created_at)
  }
}

/**
 * 创建一条简报。若同 user + 同 title + source 在 5 秒内已存在相同 title（去抖），返回已有记录 id。
 */
export async function createUserReport(input: CreateUserReportInput): Promise<number> {
  await initDB()
  const now = Date.now()

  // 简易去抖：5 秒内同 user+source+title 不重复
  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM user_reports
     WHERE user_id = $1 AND source = $2 AND title = $3
       AND created_at > $4
     ORDER BY created_at DESC LIMIT 1`,
    [input.user_id, input.source || "manual", input.title, now - 5000]
  )
  if (existing?.id) {
    return existing.id
  }

  const result = await execute(
    `INSERT INTO user_reports
      (user_id, source, source_id, title, html, summary, type, is_favorite, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)
     RETURNING id`,
    [
      input.user_id,
      input.source || "manual",
      input.source_id || null,
      input.title,
      input.html,
      input.summary || null,
      input.type || "report",
      now
    ]
  )

  const newId = result.rows?.[0]?.id
  return typeof newId === "number" ? newId : Number(newId) || 0
}

/**
 * 列出当前用户的简报，按创建时间倒序。
 */
export async function listUserReports(
  userId: number,
  options: ListUserReportsOptions = {}
): Promise<UserReport[]> {
  await initDB()
  const limit = Math.min(Math.max(options.limit || 50, 1), 200)
  const sql = options.onlyFavorite
    ? `SELECT * FROM user_reports
       WHERE user_id = $1 AND is_favorite = 1
       ORDER BY created_at DESC LIMIT $2`
    : `SELECT * FROM user_reports
     WHERE user_id = $1
     ORDER BY created_at DESC LIMIT $2`
  const rows = await query<UserReport>(sql, [userId, limit])
  return rows.map(mapReportRow)
}

/**
 * 列出指定时间戳之后新增的简报（用于轮询/SSE 增量通知）。
 */
export async function listUserReportsSince(
  userId: number,
  since: number,
  limit = 20
): Promise<UserReport[]> {
  await initDB()
  const rows = await query<UserReport>(
    `SELECT * FROM user_reports
     WHERE user_id = $1 AND created_at > $2
     ORDER BY created_at DESC LIMIT $3`,
    [userId, since, limit]
  )
  return rows.map(mapReportRow)
}

/**
 * 删除一条简报（带 user_id 校验，避免越权）。
 */
export async function deleteUserReport(userId: number, reportId: number): Promise<boolean> {
  await initDB()
  const result = await execute(
    `DELETE FROM user_reports WHERE id = $1 AND user_id = $2`,
    [reportId, userId]
  )
  return result.rowCount > 0
}

/**
 * 切换收藏状态。
 */
export async function toggleUserReportFavorite(
  userId: number,
  reportId: number
): Promise<boolean | null> {
  await initDB()
  const current = await queryOne<{ is_favorite: 0 | 1 }>(
    `SELECT is_favorite FROM user_reports WHERE id = $1 AND user_id = $2`,
    [reportId, userId]
  )
  if (!current) return null
  const next = current.is_favorite === 1 ? 0 : 1
  await execute(
    `UPDATE user_reports SET is_favorite = $1 WHERE id = $2 AND user_id = $3`,
    [next, reportId, userId]
  )
  return next === 1
}

/**
 * 按 id 取单条（同样校验 user_id）。
 */
export async function getUserReport(userId: number, reportId: number): Promise<UserReport | null> {
  await initDB()
  const row = await queryOne<UserReport>(
    `SELECT * FROM user_reports WHERE id = $1 AND user_id = $2`,
    [reportId, userId]
  )
  return row ? mapReportRow(row) : null
}
