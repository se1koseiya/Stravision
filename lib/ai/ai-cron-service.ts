/**
 * AI Cron Service
 * 允许 AI 安排延迟任务，如"5分钟后重新分析"、"10分钟后关闭设备"等
 *
 * 注意：本模块使用 PostgreSQL（pg Pool）API，通过 lib/db/database.ts 的
 * query / queryOne / execute 函数访问数据库，占位符为 $1, $2, ...
 */

import { query, queryOne, execute } from '@/lib/db/database'

export interface AICronJob {
  id: number
  user_id: number
  session_id: string
  task_type: 'analysis' | 'device_control' | 'notification' | 'custom'
  task_description: string
  scheduled_time: number // Unix timestamp
  payload: string // JSON string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  result?: string | null
  created_at: number
  executed_at?: number | null
}

/**
 * 创建 AI Cron 任务
 */
export async function createAICronJob(
  userId: number,
  sessionId: string,
  taskType: AICronJob['task_type'],
  taskDescription: string,
  delayMinutes: number,
  payload: Record<string, any>
): Promise<number> {
  const scheduledTime = Date.now() + delayMinutes * 60 * 1000

  const row = await queryOne<{ id: number }>(
    `INSERT INTO ai_cron_jobs (
      user_id, session_id, task_type, task_description,
      scheduled_time, payload, status, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id`,
    [
      userId,
      sessionId,
      taskType,
      taskDescription,
      scheduledTime,
      JSON.stringify(payload),
      'pending',
      Date.now()
    ]
  )

  const id = row?.id ?? 0
  console.log(`[AI Cron] Created job #${id}: ${taskDescription} (in ${delayMinutes} min)`)

  return id
}

/**
 * 获取待执行的任务
 */
export async function getPendingAICronJobs(): Promise<AICronJob[]> {
  return query<AICronJob>(
    `SELECT * FROM ai_cron_jobs
     WHERE status = 'pending'
       AND scheduled_time <= $1
     ORDER BY scheduled_time ASC
     LIMIT 50`,
    [Date.now()]
  )
}

/**
 * 获取用户的所有任务
 */
export async function getUserAICronJobs(userId: number): Promise<AICronJob[]> {
  return query<AICronJob>(
    `SELECT * FROM ai_cron_jobs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [userId]
  )
}

/**
 * 更新任务状态
 */
export async function updateAICronJobStatus(
  jobId: number,
  status: AICronJob['status'],
  result?: string
): Promise<void> {
  const executedAt =
    status === 'completed' || status === 'failed' ? Date.now() : null

  await execute(
    `UPDATE ai_cron_jobs
     SET status = $1, result = $2, executed_at = $3
     WHERE id = $4`,
    [status, result || null, executedAt, jobId]
  )

  console.log(`[AI Cron] Updated job #${jobId}: ${status}`)
}

/**
 * 取消任务
 */
export async function cancelAICronJob(jobId: number, userId: number): Promise<boolean> {
  const result = await execute(
    `UPDATE ai_cron_jobs
     SET status = 'cancelled'
     WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
    [jobId, userId]
  )

  return result.rowCount > 0
}

/**
 * 清理旧任务（保留最近7天）
 */
export async function cleanupOldAICronJobs(): Promise<number> {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  const result = await execute(
    `DELETE FROM ai_cron_jobs
     WHERE created_at < $1
       AND status IN ('completed', 'failed', 'cancelled')`,
    [sevenDaysAgo]
  )

  const deleted = result.rowCount
  if (deleted > 0) {
    console.log(`[AI Cron] Cleaned up ${deleted} old jobs`)
  }

  return deleted
}
