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
