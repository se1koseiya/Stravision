/**
 * 客户端调度器
 * 在浏览器中使用 setTimeout/setInterval 实现定时任务
 * 无需服务器端 Cron Job
 */

export interface ClientScheduledTask {
  id: string
  description: string
  scheduledTime: number
  taskType: 'analysis' | 'notification' | 'reminder' | 'custom'
  payload: any
  callback: (task: ClientScheduledTask) => void | Promise<void>
  status: 'pending' | 'completed' | 'cancelled'
  timerId?: NodeJS.Timeout
}

class ClientScheduler {
  private tasks: Map<string, ClientScheduledTask> = new Map()
  private storageKey = 'ai-scheduled-tasks'

  constructor() {
    // 从 localStorage 恢复任务
    this.restoreTasks()
    
    // 页面关闭前保存任务
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveTasks()
      })
    }
  }

  /**
   * 创建定时任务
   */
  scheduleTask(
    description: string,
    delayMinutes: number,
    taskType: ClientScheduledTask['taskType'],
    payload: any,
    callback: (task: ClientScheduledTask) => void | Promise<void>
  ): string {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const scheduledTime = Date.now() + delayMinutes * 60 * 1000

    const task: ClientScheduledTask = {
      id,
      description,
      scheduledTime,
      taskType,
      payload,
      callback,
      status: 'pending'
    }

    // 设置定时器
    const timerId = setTimeout(async () => {
      await this.executeTask(id)
    }, delayMinutes * 60 * 1000)

    task.timerId = timerId
    this.tasks.set(id, task)
    this.saveTasks()

    console.log(`[Client Scheduler] Task scheduled: ${description} (in ${delayMinutes} min)`)

    return id
  }

  /**
   * 执行任务
   */
  private async executeTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task || task.status !== 'pending') return

    console.log(`[Client Scheduler] Executing task: ${task.description}`)

    try {
      await task.callback(task)
      task.status = 'completed'
      
      // 显示通知
      this.showNotification(task)
    } catch (error) {
      console.error(`[Client Scheduler] Task execution failed:`, error)
    }

    this.saveTasks()
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task || task.status !== 'pending') return false

    if (task.timerId) {
      clearTimeout(task.timerId)
    }

    task.status = 'cancelled'
    this.saveTasks()

    console.log(`[Client Scheduler] Task cancelled: ${task.description}`)
    return true
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): ClientScheduledTask[] {
    return Array.from(this.tasks.values())
  }

  /**
   * 获取待执行任务
   */
  getPendingTasks(): ClientScheduledTask[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'pending')
  }

  /**
   * 清理已完成的任务
   */
  cleanupCompletedTasks() {
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    for (const [id, task] of this.tasks.entries()) {
      if (task.status !== 'pending' && task.scheduledTime < oneDayAgo) {
        this.tasks.delete(id)
      }
    }

    this.saveTasks()
  }

  /**
   * 保存任务到 localStorage
   */
  private saveTasks() {
    if (typeof window === 'undefined') return

    const tasksToSave = Array.from(this.tasks.values()).map(task => ({
      id: task.id,
      description: task.description,
      scheduledTime: task.scheduledTime,
      taskType: task.taskType,
      payload: task.payload,
      status: task.status
    }))

    localStorage.setItem(this.storageKey, JSON.stringify(tasksToSave))
  }

  /**
   * 从 localStorage 恢复任务
   */
  private restoreTasks() {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem(this.storageKey)
      if (!saved) return

      const tasks = JSON.parse(saved)
      const now = Date.now()

      for (const taskData of tasks) {
        if (taskData.status !== 'pending') continue
        if (taskData.scheduledTime < now) continue // 跳过过期任务

        // 重新创建定时器
        const delay = taskData.scheduledTime - now
        const timerId = setTimeout(async () => {
          await this.executeTask(taskData.id)
        }, delay)

        const task: ClientScheduledTask = {
          ...taskData,
          callback: this.getDefaultCallback(taskData.taskType),
          timerId
        }

        this.tasks.set(task.id, task)
      }

      console.log(`[Client Scheduler] Restored ${this.tasks.size} tasks`)
    } catch (error) {
      console.error('[Client Scheduler] Failed to restore tasks:', error)
    }
  }

  /**
   * 获取默认回调函数
   */
  private getDefaultCallback(taskType: string) {
    return async (task: ClientScheduledTask) => {
      console.log(`[Client Scheduler] Default callback for ${taskType}:`, task)
    }
  }

  /**
   * 显示浏览器通知
   */
  private showNotification(task: ClientScheduledTask) {
    if (typeof window === 'undefined') return

    // 检查通知权限
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('定时任务完成', {
        body: task.description,
        icon: '/favicon.ico',
        tag: task.id
      })
    }

    // 同时显示 toast 通知（如果有 toast 库）
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.success(task.description)
    }
  }

  /**
   * 请求通知权限
   */
  async requestNotificationPermission() {
    if (typeof window === 'undefined') return false
    if (!('Notification' in window)) return false

    if (Notification.permission === 'granted') return true

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
}

// 单例实例
export const clientScheduler = new ClientScheduler()

/**
 * React Hook 用于管理定时任务
 */
export function useClientScheduler() {
  const scheduleTask = (
    description: string,
    delayMinutes: number,
    taskType: ClientScheduledTask['taskType'],
    payload: any,
    callback: (task: ClientScheduledTask) => void | Promise<void>
  ) => {
    return clientScheduler.scheduleTask(description, delayMinutes, taskType, payload, callback)
  }

  const cancelTask = (taskId: string) => {
    return clientScheduler.cancelTask(taskId)
  }

  const getAllTasks = () => {
    return clientScheduler.getAllTasks()
  }

  const getPendingTasks = () => {
    return clientScheduler.getPendingTasks()
  }

  const requestNotificationPermission = () => {
    return clientScheduler.requestNotificationPermission()
  }

  return {
    scheduleTask,
    cancelTask,
    getAllTasks,
    getPendingTasks,
    requestNotificationPermission
  }
}
