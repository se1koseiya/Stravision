"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * 单一 SSE 连接 hook
 *
 * 复用 /api/user-events/stream（与 useUserReports 共享）。
 * 多个 chat hook 通过 dispatch 把事件分发出去，避免重复建连。
 *
 * 调用方：
 * ```
 * const { connected, subscribe } = useChatSSE()
 * useEffect(() => subscribe((ev) => {
 *   if (ev.type === "chat_message") { ... }
 * }), [subscribe])
 * ```
 */

export type ChatSseEvent =
  | { type: "ready" }
  | { type: "ping" }
  | { type: "__disconnected__" }
  | { type: "new_report"; [k: string]: unknown }
  | { type: "new_invitation"; [k: string]: unknown }
  | { type: "chat_message"; [k: string]: unknown }
  | { type: "chat_typing"; [k: string]: unknown }
  | { type: "chat_friend_request"; [k: string]: unknown }
  | { type: "chat_friend_request_responded"; [k: string]: unknown }
  | { type: "chat_message_recalled"; [k: string]: unknown }
  | { type: "chat_block_changed"; [k: string]: unknown }
  | { type: "chat_group_member_changed"; [k: string]: unknown }
  | { type: "chat_group_disbanded"; [k: string]: unknown }
  | { type: string; [k: string]: unknown }

type Listener = (event: ChatSseEvent) => void

// 模块级单例：一个浏览器 tab 内只建一个 SSE 连接
let globalEs: EventSource | null = null
const globalListeners: Set<Listener> = new Set()
let globalRefcount = 0
let globalConnected = false
let globalRetryDelay = 2000
let globalRetryTimer: ReturnType<typeof setTimeout> | null = null

function ensureConnection() {
  if (typeof window === "undefined") return
  if (globalEs) {
    globalRefcount++
    return
  }

  const connect = () => {
    try {
      globalEs = new EventSource("/api/user-events/stream", { withCredentials: true })
    } catch (e) {
      console.warn("[useChatSSE] EventSource create failed:", e)
      scheduleRetry()
      return
    }

    globalEs.onopen = () => {
      globalRetryDelay = 2000
    }
    globalEs.onerror = () => {
      try { globalEs?.close() } catch {}
      globalEs = null
      globalConnected = false
      notifyListeners({ type: "__disconnected__" })
      scheduleRetry()
    }
    globalEs.onmessage = (ev) => {
      if (!ev.data) return
      try {
        const payload = JSON.parse(ev.data)
        if (payload?.type === "ready") {
          globalConnected = true
        }
        notifyListeners(payload as ChatSseEvent)
      } catch {
        // ignore non-JSON
      }
    }
  }

  const scheduleRetry = () => {
    if (globalRetryTimer) return
    globalRetryTimer = setTimeout(() => {
      globalRetryTimer = null
      globalRetryDelay = Math.min(globalRetryDelay * 2, 30_000)
      if (globalRefcount > 0) connect()
    }, globalRetryDelay)
  }

  globalRefcount++
  connect()
}

function notifyListeners(event: ChatSseEvent) {
  for (const l of globalListeners) {
    try {
      l(event)
    } catch (e) {
      console.error("[useChatSSE] listener error:", e)
    }
  }
}

function teardownConnection() {
  globalRefcount = Math.max(0, globalRefcount - 1)
  if (globalRefcount === 0) {
    if (globalRetryTimer) {
      clearTimeout(globalRetryTimer)
      globalRetryTimer = null
    }
    if (globalEs) {
      try { globalEs.close() } catch {}
      globalEs = null
    }
    globalConnected = false
  }
}

export function useChatSSE() {
  const [connected, setConnected] = useState(globalConnected)
  const listenerRef = useRef<Listener | null>(null)

  useEffect(() => {
    ensureConnection()

    // sync connected state with module-level
    const syncListener: Listener = (ev) => {
      if (ev.type === "ready") setConnected(true)
      if (ev.type === "__disconnected__") setConnected(false)
    }
    globalListeners.add(syncListener)

    return () => {
      globalListeners.delete(syncListener)
      if (listenerRef.current) {
        globalListeners.delete(listenerRef.current)
        listenerRef.current = null
      }
      teardownConnection()
    }
  }, [])

  const subscribe = useCallback((listener: Listener) => {
    // 替换旧 listener
    if (listenerRef.current) {
      globalListeners.delete(listenerRef.current)
    }
    listenerRef.current = listener
    globalListeners.add(listener)
    return () => {
      if (listenerRef.current === listener) {
        globalListeners.delete(listener)
        listenerRef.current = null
      }
    }
  }, [])

  return { connected, subscribe }
}
