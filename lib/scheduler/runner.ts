import cron from "node-cron"
import type { ScheduledTask as CronScheduledTask } from "node-cron"
import { getActiveTasks, deleteTask, ScheduledTask } from "@/lib/db/scheduler-service"
import { MQTTService } from "@/lib/mqtt-service"

// In-memory storage for running jobs
const jobs: Map<number, CronScheduledTask | NodeJS.Timeout> = new Map()

export class SchedulerRunner {
  private static instance: SchedulerRunner
  private isInitialized = false

  private constructor() {}

  public static getInstance(): SchedulerRunner {
    if (!SchedulerRunner.instance) {
      SchedulerRunner.instance = new SchedulerRunner()
    }
    return SchedulerRunner.instance
  }

  public async init() {
    if (this.isInitialized) return
    this.isInitialized = true
    console.log("[Scheduler] Initializing...")
    
    await this.refreshTasks()
    
    console.log("[Scheduler] Started")
  }

  public async refreshTasks() {
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
           this.executeTask(task)
        } else {
           // Mark as expired? Or just delete?
           deleteTask(task.id)
        }
        return
      }

      const timeout = setTimeout(() => {
        this.executeTask(task)
        // Cleanup after run
        deleteTask(task.id)
        jobs.delete(task.id)
      }, delay)
      
      jobs.set(task.id, timeout)
      console.log(`[Scheduler] Scheduled one-time task ${task.id}: ${task.title} in ${Math.round(delay/1000)}s`)
    }
  }

  private async executeTask(task: ScheduledTask) {
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
        return; 
      }

      if (!command) throw new Error(`Unsupported action_type: ${task.action_type}`)
      console.log(`[Scheduler] Sending command:`, command)
      await mqtt.sendControlCommand(command)
      console.log(`[Scheduler] Task ${task.id} executed successfully`)
      
    } catch (e) {
      console.error(`[Scheduler] Failed to execute task ${task.id}:`, e)
    }
  }
}
