/**
 * 用户事件总线（进程内）
 *
 * 用于把"某用户产生了新简报"这类事件从 server 端业务（定时任务执行、AI cron executor 等）
 * 转发到 SSE 路由 /api/user-events/stream 推送给该用户的浏览器。
 *
 * 注意：Next.js 在 dev/HMR 下会多次执行模块，但单进程内的事件总线对当前部署是足够的；
 * 多实例 / Edge 部署时需要切到 Redis Pub/Sub。
 */

export type UserEvent =
  | {
      type: "new_report"
      userId: number
      report: {
        id: number
        title: string
        type: string
        source: string
        created_at: number
      }
    }
  | { type: "ping"; userId: number; ts: number }

type Listener = (event: UserEvent) => void

// userId -> Set<Listener>
const listeners = new Map<number, Set<Listener>>()

export function subscribeUserEvents(userId: number, listener: Listener): () => void {
  let set = listeners.get(userId)
  if (!set) {
    set = new Set()
    listeners.set(userId, set)
  }
  set.add(listener)
  return () => {
    const s = listeners.get(userId)
    if (!s) return
    s.delete(listener)
    if (s.size === 0) listeners.delete(userId)
  }
}

export function publishUserEvent(event: UserEvent): void {
  const set = listeners.get(event.userId)
  if (!set || set.size === 0) return
  for (const l of set) {
    try {
      l(event)
    } catch (e) {
      // 监听者异常不影响其他监听者
      console.error("[user-event-bus] listener error:", e)
    }
  }
}

export function getUserListenerCount(userId: number): number {
  return listeners.get(userId)?.size || 0
}
