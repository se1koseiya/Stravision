"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { chatClient } from "@/lib/chat/chat-client"
import type { ChatTarget } from "@/lib/chat/chat-types"
import { useChatSSE } from "./use-chat-sse"

/**
 * 输入指示器 hook
 *
 * - 私聊：通过 SSE chat_typing 实时感知
 * - 群聊：SSE 无法群发 typing，降级为 GET /api/chat/typing 轮询（2s）
 * - 用户输入时调用 notifyTyping()（已节流到 1s 一次）
 */

const TYPING_TIMEOUT = 3500 // 3.5s 内没收到新 typing 事件就视为停止
const GROUP_POLL_INTERVAL = 2_000
const SEND_TYPING_THROTTLE = 1_000

export function useTypingStatus(target: ChatTarget | null) {
  const { subscribe } = useChatSSE()
  const [isTyping, setIsTyping] = useState(false)

  const targetRef = useRef<ChatTarget | null>(target)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sendTypingLockRef = useRef(false)
  const sendTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 在 effect 中同步 ref，避免渲染期间访问 ref
  useEffect(() => {
    targetRef.current = target
  }, [target])

  // ===== 私聊：监听 SSE typing =====
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!target || target.kind !== "direct") {
      setIsTyping(false)
      return
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    const expectedPeer = target.friend.id
    const unsubscribe = subscribe((ev) => {
      if (ev.type !== "chat_typing") return
      const e = ev as { type: "chat_typing"; chatKind: "direct" | "group"; peerId: number; isTyping: boolean }
      const { chatKind, peerId, isTyping: incoming } = e
      if (chatKind !== "direct") return
      if (peerId !== expectedPeer) return

      if (incoming) {
        setIsTyping(true)
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), TYPING_TIMEOUT)
      } else {
        setIsTyping(false)
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = null
        }
      }
    })

    return () => {
      unsubscribe()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      setIsTyping(false)
    }
  }, [target, subscribe])

  // ===== 群聊：轮询 GET =====
  useEffect(() => {
    if (!target || target.kind !== "group") {
      return
    }
    const groupId = target.group.id

    let cancelled = false
    const poll = async () => {
      if (cancelled) return
      const isT = await chatClient.getTyping({ groupId })
      if (!cancelled) setIsTyping(isT)
    }
    poll()
    const id = setInterval(poll, GROUP_POLL_INTERVAL)
    return () => {
      cancelled = true
      clearInterval(id)
      setIsTyping(false)
    }
  }, [target])

  /**
   * 用户输入时调用。已内置 1s 节流，避免每次按键都发请求。
   */
  const notifyTyping = useCallback(() => {
    const t = targetRef.current
    if (!t) return
    if (sendTypingLockRef.current) return
    sendTypingLockRef.current = true
    sendTypingTimerRef.current = setTimeout(() => {
      sendTypingLockRef.current = false
    }, SEND_TYPING_THROTTLE)

    chatClient.pingTyping(
      t.kind === "direct" ? { targetId: t.friend.id } : { groupId: t.group.id }
    )
  }, [])

  // 卸载时清掉 send typing 的 timer
  useEffect(() => {
    return () => {
      if (sendTypingTimerRef.current) {
        clearTimeout(sendTypingTimerRef.current)
        sendTypingTimerRef.current = null
      }
    }
  }, [])

  return { isTyping, notifyTyping }
}
