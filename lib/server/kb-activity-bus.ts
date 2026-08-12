/**
 * 知识库活动事件总线（进程内）
 *
 * 用于把"某用户在某知识库产生新操作"事件从 API 路由（POST 创建/编辑/邀请 等）
 * 转发到 SSE 路由 /api/knowledge/activity?stream=1 推送给订阅该活动的浏览器。
 *
 * 与 user-event-bus 类似但粒度不同：本总线按"主题"广播：
 *  - "all" 主题：全平台 public 活动（任何订阅者都能收到）
 *  - collection:{id} 主题：某集合的活动（订阅者需主动订阅）
 *  - user:{id} 主题：某用户能看见的活动（个性化推送）
 *
 * 注意：单进程内的事件总线对当前部署是足够的；多实例时需切到 Redis Pub/Sub。
 */

import type { KbOperationLog } from "@/lib/db/kb-collaboration-service"

export interface KbActivityEvent {
  type: "operation"
  topic: "all" | `collection:${number}` | `user:${number}`
  log: KbOperationLog
}

type Listener = (event: KbActivityEvent) => void

// topic -> Set<Listener>
const topicListeners = new Map<string, Set<Listener>>()

function ensureSet(topic: string): Set<Listener> {
  let set = topicListeners.get(topic)
  if (!set) {
    set = new Set()
    topicListeners.set(topic, set)
  }
  return set
}

export function subscribeKbActivity(topic: string, listener: Listener): () => void {
  const set = ensureSet(topic)
  set.add(listener)
  return () => {
    const s = topicListeners.get(topic)
    if (!s) return
    s.delete(listener)
    if (s.size === 0) topicListeners.delete(topic)
  }
}

export function publishKbActivity(event: KbActivityEvent): void {
  const set = topicListeners.get(event.topic)
  if (!set || set.size === 0) return
  for (const l of set) {
    try {
      l(event)
    } catch (e) {
      console.error("[kb-activity-bus] listener error:", e)
    }
  }
}

export function getKbActivityListenerCount(topic: string): number {
  return topicListeners.get(topic)?.size || 0
}

/**
 * 广播一条操作日志到所有相关主题
 *  - "all" 主题（仅当 visibility=public）
 *  - collection:{id}（如果有 collectionId）
 *  - user:{actorUserId}（自己产生的事件总能让自己的视图刷新）
 *  - user:{所有协作者}（如果有 collectionId，给该集合所有协作者推送）
 */
export async function broadcastOperationLog(log: KbOperationLog): Promise<void> {
  // 1. 公开主题
  if (log.visibility === "public") {
    publishKbActivity({ type: "operation", topic: "all", log })
  }
  // 2. 集合主题
  if (log.collection_id != null) {
    publishKbActivity({
      type: "operation",
      topic: `collection:${log.collection_id}`,
      log
    })
  }
  // 3. 用户主题：自己
  publishKbActivity({ type: "operation", topic: `user:${log.user_id}`, log })
}
