import { initDB, query, queryOne, execute } from "./database"

export interface ScheduledTask {
  id: number
  title: string
  cron_expression?: string | null
  execute_at?: number | null
  action_type: 'relay' | 'led' | 'agent' | 'reminder'
  device_id?: number
  params: string // JSON string
  is_active: number // 1 or 0
  created_at: number
  updated_at: number
  last_error?: string | null // 最近一次执行失败的错误信息
  last_run_at?: number | null // 最近一次执行时间戳
  run_status?: 'success' | 'failed' | null // 最近一次执行状态
}

export interface CreateTaskDTO {
  title: string
  cron_expression?: string
  execute_at?: number
  action_type: 'relay' | 'led' | 'agent' | 'reminder'
  device_id?: number
  params: any
}

export async function createTask(data: CreateTaskDTO): Promise<ScheduledTask> {
  await initDB()
  const now = Date.now()

  const row = await queryOne<{ id: number }>(
    `INSERT INTO scheduled_tasks (
       title, cron_expression, execute_at, action_type, device_id, params, is_active, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8)
     RETURNING id`,
    [
      data.title,
      data.cron_expression || null,
      data.execute_at || null,
      data.action_type,
      data.device_id || null,
      JSON.stringify(data.params),
      now,
      now
    ]
  )

  if (!row) {
    throw new Error("Failed to create task")
  }

  const task = await getTaskById(row.id)
  if (!task) {
    throw new Error("Failed to load created task")
  }
  return task
}

export async function getTaskById(id: number): Promise<ScheduledTask | undefined> {
  await initDB()
  const task = await queryOne<ScheduledTask>("SELECT * FROM scheduled_tasks WHERE id = $1", [id])
  return task || undefined
}

export async function getAllTasks(): Promise<ScheduledTask[]> {
  await initDB()
  return query<ScheduledTask>("SELECT * FROM scheduled_tasks ORDER BY created_at DESC")
}

export async function getActiveTasks(): Promise<ScheduledTask[]> {
  await initDB()
  return query<ScheduledTask>("SELECT * FROM scheduled_tasks WHERE is_active = 1")
}

export async function deleteTask(id: number): Promise<void> {
  await initDB()
  await execute("DELETE FROM scheduled_tasks WHERE id = $1", [id])
}

export async function updateTaskStatus(id: number, isActive: boolean): Promise<void> {
  await initDB()
  await execute("UPDATE scheduled_tasks SET is_active = $1, updated_at = $2 WHERE id = $3", [
    isActive ? 1 : 0,
    Date.now(),
    id
  ])
}

export async function updateTask(id: number, data: Partial<CreateTaskDTO> & { is_active?: boolean }): Promise<void> {
  await initDB()
  const fields: string[] = []
  const values: any[] = []
  let i = 1

  if (data.title !== undefined) { fields.push(`title = $${i++}`); values.push(data.title) }
  if (data.cron_expression !== undefined) { fields.push(`cron_expression = $${i++}`); values.push(data.cron_expression || null) }
  if (data.execute_at !== undefined) { fields.push(`execute_at = $${i++}`); values.push(data.execute_at || null) }
  if (data.action_type !== undefined) { fields.push(`action_type = $${i++}`); values.push(data.action_type) }
  if (data.device_id !== undefined) { fields.push(`device_id = $${i++}`); values.push(data.device_id || null) }
  if (data.params !== undefined) { fields.push(`params = $${i++}`); values.push(JSON.stringify(data.params)) }
  if (data.is_active !== undefined) { fields.push(`is_active = $${i++}`); values.push(data.is_active ? 1 : 0) }

  if (fields.length === 0) return
  fields.push(`updated_at = $${i++}`)
  values.push(Date.now())
  values.push(id)

  await execute(`UPDATE scheduled_tasks SET ${fields.join(", ")} WHERE id = $${i}`, values)
}

/**
 * 记录任务执行结果（不删除任务，保留失败记录以便排查）
 * @param id 任务 ID
 * @param success 是否成功
 * @param errorMsg 失败时的错误信息
 */
export async function markTaskResult(id: number, success: boolean, errorMsg?: string): Promise<void> {
  await initDB()
  await execute(
    `UPDATE scheduled_tasks
     SET last_run_at = $1,
         run_status = $2,
         last_error = $3,
         updated_at = $1
     WHERE id = $4`,
    [Date.now(), success ? 'success' : 'failed', success ? null : (errorMsg || 'Unknown error'), id]
  )
}
