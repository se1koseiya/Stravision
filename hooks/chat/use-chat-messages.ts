"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { chatClient } from "@/lib/chat/chat-client"
import type { ChatMessage, ChatTarget } from "@/lib/chat/chat-types"
import { targetKey } from "@/lib/chat/chat-types"
import { useChatSSE } from "./use-chat-sse"

/**
 * 消息 hook
 *
 * - target 变化时拉取一次消息
 * - SSE 监听 chat_message / chat_message_recalled
 *   - 只处理属于当前 target 的消息
 * - sendMessage 乐观追加 + 失败回滚
 * - recallMessage 直接更新本地
 */

type ChatMessageSseEvent = {
  type: "chat_message"
  chatKind: "direct" | "group"
  peerId: number
  message: ChatMessage
}
type ChatMessageRecalledSseEvent = {
  type: "chat_message_recalled"
  chatKind: "direct" | "group"
  peerId: number
  messageId: number
}

export function useChatMessages(target: ChatTarget | null) {
  const { subscribe } = useChatSSE()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const targetKeyRef = useRef<string>("")
  const targetRef = useRef<ChatTarget | null>(target)

  // 在 effect 中同步 ref，避免渲染期间访问 ref
  useEffect(() => {
    targetRef.current = target
  }, [target])

  const refresh = useCallback(async () => {
    const t = targetRef.current
    if (!t) {
      setMessages([])
      return
    }
    // 延迟显示骨架图：若请求在 300ms 内返回（新联系人常返回空列表），
    // 则 loading 始终为 false，避免骨架图一闪而过
    const skeletonTimer = setTimeout(() => setLoading(true), 300)
    const r = await chatClient.listMessages(
      t.kind === "direct" ? { friendId: t.friend.id } : { groupId: t.group.id }
    )
    clearTimeout(skeletonTimer)
    if (targetKey(targetRef.current) !== targetKey(t)) return
    if (r.ok && r.messages) {
      setMessages(r.messages)
    }
    setLoading(false)
  }, [])

  // target 变化时拉取
  useEffect(() => {
    const newKey = targetKey(target)
    // 切换对话时立即清空旧消息，避免显示错误归属
    if (newKey !== targetKeyRef.current) {
      setMessages([])
    }
    targetKeyRef.current = newKey
    if (target) {
      refresh()
    } else {
      setLoading(false)
    }
  }, [target, refresh])

  // SSE 订阅
  useEffect(() => {
    const unsubscribe = subscribe((ev) => {
      const t = targetRef.current
      if (!t) return

      if (ev.type === "chat_message") {
        const e = ev as ChatMessageSseEvent
        if (e.chatKind !== t.kind) return
        const expectedPeer = t.kind === "direct" ? t.friend.id : t.group.id
        if (e.peerId !== expectedPeer) return
        setMessages(prev => {
          if (prev.some(m => m.id === e.message.id)) return prev
          return [...prev, e.message]
        })
      } else if (ev.type === "chat_message_recalled") {
        const e = ev as ChatMessageRecalledSseEvent
        if (e.chatKind !== t.kind) return
        const expectedPeer = t.kind === "direct" ? t.friend.id : t.group.id
        if (e.peerId !== expectedPeer) return
        setMessages(prev => prev.map(m =>
          m.id === e.messageId
            ? { ...m, content: "[消息已撤回]", type: "recalled" }
            : m
        ))
      }
    })
    return unsubscribe
  }, [subscribe])

  const sendMessage = useCallback(async (payload: {
    content: string
    type?: "text" | "image" | "audio" | "video" | "file"
    fileUrl?: string
  }): Promise<{ ok: boolean; error?: string }> => {
    const t = targetRef.current
    if (!t) return { ok: false, error: "未选择对话" }
    if (!payload.content.trim() && payload.type === "text") return { ok: false, error: "内容为空" }

    const r = await chatClient.sendMessage({
      friendId: t.kind === "direct" ? t.friend.id : undefined,
      groupId: t.kind === "group" ? t.group.id : undefined,
      content: payload.content,
      type: payload.type ?? "text",
      fileUrl: payload.fileUrl
    })

    if (r.ok && r.message) {
      const newMsg = r.message
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })
      return { ok: true }
    }
    return { ok: false, error: r.error || "发送失败" }
  }, [])

  const recallMessage = useCallback(async (messageId: number): Promise<boolean> => {
    const r = await chatClient.recallMessage(messageId)
    if (!r.ok) return false
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, content: "[消息已撤回]", type: "recalled" }
        : m
    ))
    return true
  }, [])

  const clearHistory = useCallback(async (): Promise<boolean> => {
    const t = targetRef.current
    if (!t || t.kind !== "direct") return false
    const r = await chatClient.clearHistory(t.friend.id)
    if (!r.ok) return false
    setMessages([])
    return true
  }, [])

  return {
    messages,
    loading,
    refresh,
    sendMessage,
    recallMessage,
    clearHistory
  }
}
