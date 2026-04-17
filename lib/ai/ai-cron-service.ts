/**
 * AI Cron Service
 * 允许 AI 安排延迟任务，如"5分钟后重新分析"、"10分钟后关闭设备"等
 */

import { initDB } from '@/lib/db/database'

export interface AICronJob {
  id: number
  user_id: number
  session_id: string
  task_type: 'analysis' | 'device_control' | 'notification' | 'custom'
  task_description: string
  scheduled_time: number // Unix timestamp
  payload: string // JSON string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  result?: string
  created_at: number
  executed_at?: number
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
  const db = await initDB()
  
  const scheduledTime = Date.now() + delayMinutes * 60 * 1000
  
  const result = await db.run(
    `INSERT INTO ai_cron_jobs (
      user_id, session_id, task_type, task_description, 
      scheduled_time, payload, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
  
  console.log(`[AI Cron] Created job #${result.lastID}: ${taskDescription} (in ${delayMinutes} min)`)
  
  return result.lastID as number
}

/**
 * 获取待执行的任务
 */
export async function getPendingAICronJobs(): Promise<AICronJob[]> {
  const db = await initDB()
  
  const jobs = await db.all<AICronJob[]>(
    `SELECT * FROM ai_cron_jobs 
     WHERE status = 'pending' 
     AND scheduled_time <= ?
     ORDER BY scheduled_time ASC
     LIMIT 50`,
    [Date.now()]
  )
  
  return jobs
}

/**
 * 获取用户的所有任务
 */
export async function getUserAICronJobs(userId: number): Promise<AICronJob[]> {
  const db = await initDB()
  
  const jobs = await db.all<AICronJob[]>(
    `SELECT * FROM ai_cron_jobs 
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 100`,
    [userId]
  )
  
  return jobs
}

/**
 * 更新任务状态
 */
export async function updateAICronJobStatus(
  jobId: number,
  status: AICronJob['status'],
  result?: string
): Promise<void> {
  const db = await initDB()
  
  await db.run(
    `UPDATE ai_cron_jobs 
     SET status = ?, result = ?, executed_at = ?
     WHERE id = ?`,
    [status, result || null, status === 'completed' || status === 'failed' ? Date.now() : null, jobId]
  )
  
  console.log(`[AI Cron] Updated job #${jobId}: ${status}`)
}

/**
 * 取消任务
 */
export async function cancelAICronJob(jobId: number, userId: number): Promise<boolean> {
  const db = await initDB()
  
  const result = await db.run(
    `UPDATE ai_cron_jobs 
     SET status = 'cancelled'
     WHERE id = ? AND user_id = ? AND status = 'pending'`,
    [jobId, userId]
  )
  
  return (result.changes || 0) > 0
}

/**
 * 清理旧任务（保留最近7天）
 */
export async function cleanupOldAICronJobs(): Promise<number> {
  const db = await initDB()
  
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  
  const result = await db.run(
    `DELETE FROM ai_cron_jobs 
     WHERE created_at < ? 
     AND status IN ('completed', 'failed', 'cancelled')`,
    [sevenDaysAgo]
  )
  
  const deleted = result.changes || 0
  if (deleted > 0) {
    console.log(`[AI Cron] Cleaned up ${deleted} old jobs`)
  }
  
  return deleted
}
