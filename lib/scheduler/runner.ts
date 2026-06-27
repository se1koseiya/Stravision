import cron from "node-cron"
import type { ScheduledTask as CronScheduledTask } from "node-cron"
import { getActiveTasks, deleteTask, ScheduledTask } from "@/lib/db/scheduler-service"
import { MQTTService } from "@/lib/mqtt-service"

// In-memory storage for running jobs
const jobs: Map<number, CronScheduledTask | NodeJS.Timeout> = new Map()

// setTimeout 的最大安全延迟（约 24.8 天 = 2^31 - 1 毫秒）
const MAX_SETTIMEOUT_DELAY = 2 ** 31 - 1

export class SchedulerRunner {
  private static instance: SchedulerRunner
  private isInitialized = false
  private initPromise: Promise<void> | null = null

  private constructor() {}

  public static getInstance(): SchedulerRunner {
    if (!SchedulerRunner.instance) {
      SchedulerRunner.instance = new SchedulerRunner()
    }
    return SchedulerRunner.instance
  }

  public async init(): Promise<void> {
    // 防止并发初始化：复用进行中的 init Promise
    if (this.isInitialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = this._doInit()
    try {
      await this.initPromise
    } finally {
      this.initPromise = null
    }
  }

  private async _doInit(): Promise<void> {
    console.log("[Scheduler] Initializing...")
    try {
      await this.refreshTasks()
      // 只有 refreshTasks 成功后才标记为已初始化
      this.isInitialized = true
      console.log("[Scheduler] Started")
    } catch (e) {
      console.error("[Scheduler] Init failed, will retry on next call:", e)
      throw e
    }
  }

  public async refreshTasks(): Promise<void> {
    // Stop all existing jobs
    this.stopAll()

    // Fetch active tasks
    const tasks = await getActiveTasks()
    console.log(`[Scheduler] Loaded ${tasks.length} active tasks`)

    const mqtt = MQTTService.getInstance()

    // Ensure MQTT is connected
    if (!mqtt.isConnected()) {
      console.log("[Scheduler] Connecting to MQTT...")
      try {
        await mqtt.connect()
      } catch (e) {
        console.error("[Scheduler] Failed to connect to MQTT during init, but continuing to schedule tasks:", e)
      }
    }

    for (const task of tasks) {
      this.scheduleTask(task)
    }
  }

  private stopAll() {
    for (const [, job] of jobs.entries()) {
      if ('stop' in job) {
        job.stop() // Cron job
      } else {
        clearTimeout(job) // Timeout
      }
    }
    jobs.clear()
  }

  private scheduleTask(task: ScheduledTask) {
    if (task.cron_expression) {
      // Cron Task
      if (!cron.validate(task.cron_expression)) {
        console.error(`[Scheduler] Invalid cron expression for task ${task.id}: ${task.cron_expression}`)
        return
      }

      const job = cron.schedule(task.cron_expression, () => {
        this.executeTask(task)
      })
      jobs.set(task.id, job)
      console.log(`[Scheduler] Scheduled cron task ${task.id}: ${task.title} (${task.cron_expression})`)

    } else if (task.execute_at) {
      // One-time Task
      const now = Date.now()
      const delay = task.execute_at - now

      if (delay <= 0) {
        console.log(`[Scheduler] Task ${task.id} is in the past, executing immediately if within reasonable window (e.g. 1 min)`)
        if (delay > -60000) {
          // 在 1 分钟内的过期任务，立即执行
          this.executeTask(task).finally(() => {
            // 执行完成后清理
            jobs.delete(task.id)
            deleteTask(task.id).catch(e => console.error(`[Scheduler] Failed to delete expired task ${task.id}:`, e))
          })
        } else {
          // 已过期太久的任务，直接删除
          deleteTask(task.id).catch(e => console.error(`[Scheduler] Failed to delete stale task ${task.id}:`, e))
        }
        return
      }

      // 🔥 修复 setTimeout 32-bit 溢出：对于超长延迟使用分阶段调度
      if (delay <= MAX_SETTIMEOUT_DELAY) {
        // 安全范围内：直接使用 setTimeout
        const timeout = setTimeout(() => {
          this.executeTask(task).finally(() => {
            jobs.delete(task.id)
            deleteTask(task.id).catch(e => console.error(`[Scheduler] Failed to delete completed task ${task.id}:`, e))
          })
        }, delay)
        jobs.set(task.id, timeout)
        console.log(`[Scheduler] Scheduled one-time task ${task.id}: ${task.title} in ${Math.round(delay / 1000)}s`)
      } else {
        // 超过 setTimeout 最大延迟：使用递归分阶段调度
        console.log(`[Scheduler] Task ${task.id} delay ${Math.round(delay / 1000)}s exceeds setTimeout limit, using chunked scheduling`)
        this.scheduleLongDelayTask(task, delay)
      }
    }
  }

  /**
   * 处理超过 setTimeout 32-bit 最大延迟的延时任务
   * 使用递归调度：每 MAX_SETTIMEOUT_DELAY 检查一次
   */
  private scheduleLongDelayTask(task: ScheduledTask, remainingDelay: number) {
    if (remainingDelay <= MAX_SETTIMEOUT_DELAY) {
      // 剩余延迟已在安全范围
      const timeout = setTimeout(() => {
        this.executeTask(task).finally(() => {
          jobs.delete(task.id)
          deleteTask(task.id).catch(e => console.error(`[Scheduler] Failed to delete completed long-delay task ${task.id}:`, e))
        })
      }, remainingDelay)
      jobs.set(task.id, timeout)
      return
    }

    // 继续等待一个 MAX_SETTIMEOUT_DELAY 周期
    const timeout = setTimeout(() => {
      const newRemaining = task.execute_at! - Date.now()
      if (newRemaining <= 0) {
        // 已到执行时间
        this.executeTask(task).finally(() => {
          jobs.delete(task.id)
          deleteTask(task.id).catch(e => console.error(`[Scheduler] Failed to delete completed long-delay task ${task.id}:`, e))
        })
      } else {
        this.scheduleLongDelayTask(task, newRemaining)
      }
    }, MAX_SETTIMEOUT_DELAY)
    jobs.set(task.id, timeout)
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    console.log(`[Scheduler] Executing task ${task.id}: ${task.title}`)
    const mqtt = MQTTService.getInstance()

    try {
      // Ensure MQTT is connected
      if (!mqtt.isConnected()) {
        console.log("[Scheduler] MQTT not connected, attempting to connect...")
        await mqtt.connect()
      }

      let params: unknown
      try {
        params = typeof task.params === 'string' ? JSON.parse(task.params) : task.params
      } catch (e) {
        console.error(`[Scheduler] Failed to parse params for task ${task.id}:`, task.params)
        return
      }

      console.log(`[Scheduler] Task params:`, params)

      let command:
        | { type: 'relay'; relayNum: number; newState: number }
        | { type: 'led'; led1: number; led2: number; led3: number; led4: number }
        | null = null

      if (task.action_type === 'relay') {
        if (typeof params !== "object" || params === null || !("value" in params)) {
          throw new Error("Missing 'value' in relay task params")
        }
        const value = (params as { value: unknown }).value
        if (typeof value !== "number") throw new Error("Invalid 'value' in relay task params")
        if (!task.device_id) throw new Error("Missing device_id for relay task")
        command = {
          type: 'relay',
          relayNum: task.device_id,
          newState: value
        }
      } else if (task.action_type === 'led') {
        const p = typeof params === "object" && params !== null ? (params as { r?: unknown; g?: unknown; b?: unknown; w?: unknown }) : {}
        const r = typeof p.r === "number" ? p.r : 0
        const g = typeof p.g === "number" ? p.g : 0
        const b = typeof p.b === "number" ? p.b : 0
        const w = typeof p.w === "number" ? p.w : 0
        command = {
          type: 'led',
          led1: r,
          led2: g,
          led3: b,
          led4: w
        }
      } else if (task.action_type === 'agent' || task.action_type === 'reminder') {
        // Agent and reminder tasks are primarily handled by the frontend picking up the "due" status.
        // We log it here so we know the backend did its part (for one-time tasks).
        console.log(`[Scheduler] Agent/Reminder task triggered: ${task.title}. Frontend should handle the visual execution.`)
        return
      }

      if (!command) throw new Error(`Unsupported action_type: ${task.action_type}`)
      console.log(`[Scheduler] Sending command:`, command)
      await mqtt.sendControlCommand(command)
      console.log(`[Scheduler] Task ${task.id} executed successfully`)

    } catch (e) {
      console.error(`[Scheduler] Failed to execute task ${task.id}:`, e)
    }
  }

  /**
   * 立即触发指定 ID 的任务（手动执行，不修改任务状态）
   */
  public async runNow(taskId: number): Promise<void> {
    await this.init()
    const task = jobs.get(taskId)
    if (!task) {
      // 任务不在内存中，从数据库重新加载
      const { getTaskById } = await import("@/lib/db/scheduler-service")
      const t = await getTaskById(taskId)
      if (!t) throw new Error(`Task ${taskId} not found`)
      await this.executeTask(t)
      return
    }
    await this.executeTask(task)
  }
}
