"use client"

import { useCallback, useEffect, useState } from "react"
import { chatClient } from "@/lib/chat/chat-client"
import type { ChatUser, ChatFriendRequest, ChatGroup, ChatMessage } from "@/lib/chat/chat-types"
import { useChatSSE } from "./use-chat-sse"

/**
 * 联系人数据 hook：好友 / 群组 / 好友请求
 *
 * - 初次拉取 + 60s 兜底轮询
 * - SSE 推送：
 *   - chat_friend_request → 拉取最新 requests
 *   - chat_friend_request_responded → 拉取最新 friends（我新加了一个好友）
 *   - chat_message → 更新对应好友/群组的 last_message + unread_count
 *   - chat_message_recalled → 更新对应 last_message 内容
 *   - chat_block_changed → 更新对应好友的 is_blocked
 *   - chat_group_disbanded → 从 groups 列表移除
 *   - chat_group_member_changed (kicked) → 由 page 监听同 SSE 处理（本 hook 不持有 currentUser）
 */

const SAFETY_POLL_INTERVAL = 60_000 // 60s 兜底刷新

/** SSE 事件负载类型断言：从 ChatSseEvent 中安全提取字段 */
type ChatMessageEvent = {
  type: "chat_message"
  chatKind: "direct" | "group"
  peerId: number
  message: ChatMessage
}
type ChatMessageRecalledEvent = {
  type: "chat_message_recalled"
  chatKind: "direct" | "group"
  peerId: number
  messageId: number
}
type ChatFriendRequestRespondedEvent = {
  type: "chat_friend_request_responded"
  action: "accept" | "reject"
}
type ChatBlockChangedEvent = {
  type: "chat_block_changed"
  peerId: number
  blocked: boolean
}
type ChatGroupDisbandedEvent = {
  type: "chat_group_disbanded"
  groupId: number
}

export function useContacts() {
  const { subscribe, connected } = useChatSSE()

  const [friends, setFriends] = useState<ChatUser[]>([])
  const [groups, setGroups] = useState<ChatGroup[]>([])
  const [requests, setRequests] = useState<ChatFriendRequest[]>([])
  const [loading, setLoading] = useState(true)

  const refreshFriends = useCallback(async () => {
    const r = await chatClient.listFriends()
    if (r.ok && r.friends) setFriends(r.friends)
  }, [])

  const refreshGroups = useCallback(async () => {
    const r = await chatClient.listGroups()
    if (r.ok && r.groups) setGroups(r.groups)
  }, [])

  const refreshRequests = useCallback(async () => {
    const r = await chatClient.listRequests()
    if (r.ok && r.requests) setRequests(r.requests)
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshFriends(), refreshGroups(), refreshRequests()])
    setLoading(false)
  }, [refreshFriends, refreshGroups, refreshRequests])

  // 初始拉取（fetch-on-mount 是 effect 同步外部数据的标准模式）
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    refreshAll()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refreshAll])

  // 兜底轮询
  useEffect(() => {
    const id = setInterval(() => {
      refreshAll()
    }, SAFETY_POLL_INTERVAL)
    return () => clearInterval(id)
  }, [refreshAll])

  // SSE 订阅
  useEffect(() => {
    const unsubscribe = subscribe((ev) => {
      switch (ev.type) {
        case "chat_message": {
          const e = ev as ChatMessageEvent
          const { chatKind, peerId, message } = e
          if (chatKind === "direct") {
            setFriends(prev => prev.map(f => {
              if (f.id !== peerId) return f
              return { ...f, last_message: message, unread_count: (f.unread_count ?? 0) + 1 }
            }))
          } else if (chatKind === "group") {
            setGroups(prev => prev.map(g => {
              if (g.id !== peerId) return g
              return { ...g, last_message: message, unread_count: (g.unread_count ?? 0) + 1 }
            }))
          }
          break
        }
        case "chat_message_recalled": {
          const e = ev as ChatMessageRecalledEvent
          const { chatKind, peerId, messageId } = e
          const recalledMsg: ChatMessage = {
            id: messageId,
            sender_id: 0,
            receiver_id: 0,
            content: "[消息已撤回]",
            type: "recalled",
            created_at: Date.now()
          }
          if (chatKind === "direct") {
            setFriends(prev => prev.map(f =>
              f.id === peerId && f.last_message?.id === messageId
                ? { ...f, last_message: recalledMsg }
                : f
            ))
          } else if (chatKind === "group") {
            setGroups(prev => prev.map(g =>
              g.id === peerId && g.last_message?.id === messageId
                ? { ...g, last_message: recalledMsg }
                : g
            ))
          }
          break
        }
        case "chat_friend_request": {
          // 收到新好友请求
          refreshRequests()
          break
        }
        case "chat_friend_request_responded": {
          const e = ev as ChatFriendRequestRespondedEvent
          // 我发出的请求被对方处理：刷新好友列表
          if (e.action === "accept") {
            refreshFriends()
          }
          refreshRequests()
          break
        }
        case "chat_block_changed": {
          const e = ev as ChatBlockChangedEvent
          setFriends(prev => prev.map(f =>
            f.id === e.peerId ? { ...f, is_blocked: e.blocked } : f
          ))
          break
        }
        case "chat_group_disbanded": {
          const e = ev as ChatGroupDisbandedEvent
          setGroups(prev => prev.filter(g => g.id !== e.groupId))
          break
        }
        case "chat_group_member_changed": {
          // muted/unmuted/role_changed 不影响 list，留给 info panel 处理
          // kicked 由 page 监听同 SSE 处理（本 hook 不持有 currentUser）
          break
        }
        default:
          break
      }
    })
    return unsubscribe
  }, [subscribe, refreshFriends, refreshRequests])

  /**
   * 当用户切换到某个 chat 后，清除该 peer 的 unread_count。
   */
  const clearUnread = useCallback((chatKind: "direct" | "group", peerId: number) => {
    if (chatKind === "direct") {
      setFriends(prev => prev.map(f => f.id === peerId ? { ...f, unread_count: 0 } : f))
    } else {
      setGroups(prev => prev.map(g => g.id === peerId ? { ...g, unread_count: 0 } : g))
    }
  }, [])

  /**
   * 移除某个 group（自己被踢/群解散）
   */
  const removeGroup = useCallback((groupId: number) => {
    setGroups(prev => prev.filter(g => g.id !== groupId))
  }, [])

  return {
    friends,
    groups,
    requests,
    loading,
    connected,
    refreshFriends,
    refreshGroups,
    refreshRequests,
    refreshAll,
    clearUnread,
    removeGroup,
    setFriends,
    setGroups
  }
}
