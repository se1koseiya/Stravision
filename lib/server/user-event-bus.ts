/**
 * 用户事件总线（进程内）
 *
 * 用于把"某用户产生了新简报"这类事件从 server 端业务（定时任务执行、AI cron executor 等）
 * 转发到 SSE 路由 /api/user-events/stream 推送给该用户的浏览器。
 *
 * 注意：Next.js 在 dev/HMR 下会多次执行模块，但单进程内的事件总线对当前部署是足够的；
 * 多实例 / Edge 部署时需要切到 Redis Pub/Sub。
 */

import type { Message } from "@/lib/db/chat-service"

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
  | {
      type: "new_invitation"
      userId: number
      invitation: {
        id: number
        collection_id: number
        collection_name: string
        inviter_id: number
        inviter_name: string
        inviter_avatar: string | null
        role: string
        message: string | null
        created_at: number
      }
    }
  // ===== Chat events =====
  /**
   * 新消息到达。
   * - 私聊：receiver_id 即接收者 userId
   * - 群聊：groupId 即每个群成员的 userId（见 publishGroupMessage）
   */
  | {
      type: "chat_message"
      userId: number
      message: Message
      chatKind: "direct" | "group"
      peerId: number // 私聊: 对方 userId；群聊: groupId
      senderName?: string
      senderAvatar?: string | null
      groupName?: string
    }
  /** 对方正在输入 / 停止输入 */
  | {
      type: "chat_typing"
      userId: number
      peerId: number
      chatKind: "direct" | "group"
      isTyping: boolean
      senderName?: string
    }
  /** 收到新的好友请求 */
  | {
      type: "chat_friend_request"
      userId: number
      requestId: number
      requester: {
        id: number
        username: string
        avatar_url: string | null
      }
    }
  /** 我发出的好友请求被处理（对方接受/拒绝） */
  | {
      type: "chat_friend_request_responded"
      userId: number
      requestId: number
      action: "accept" | "reject"
      responder: {
        id: number
        username: string
      }
    }
  /** 消息被撤回 */
  | {
      type: "chat_message_recalled"
      userId: number
      messageId: number
      chatKind: "direct" | "group"
      peerId: number
    }
  /** 拉黑/取消拉黑状态变化（通知被影响一方） */
  | {
      type: "chat_block_changed"
      userId: number
      peerId: number
      blocked: boolean
    }
  /** 群成员变动（加入/被踢/退出/角色变更） */
  | {
      type: "chat_group_member_changed"
      userId: number
      groupId: number
      change: "joined" | "left" | "kicked" | "role_changed" | "muted" | "unmuted"
      targetUserId: number
    }
  /** 群被解散 */
  | {
      type: "chat_group_disbanded"
      userId: number
      groupId: number
      groupName: string
    }

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

/**
 * 向多个 userId 广播同一事件（用于群消息/群成员变动等场景）。
 * 不要在大列表里调用——以进程内 Set 为上限。
 */
export function publishUserEventsTo(userIds: number[], makeEvent: (userId: number) => UserEvent): void {
  for (const uid of userIds) {
    publishUserEvent(makeEvent(uid))
  }
}

export function getUserListenerCount(userId: number): number {
  return listeners.get(userId)?.size || 0
}
