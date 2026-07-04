/**
 * 用户事件 SSE 流
 *
 * GET /api/user-events/stream
 *
 * 鉴权当前登录用户，订阅进程内事件总线，按 userId 过滤后以 SSE 推送给浏览器。
 * 事件格式：data: {json}\n\n（不输出 [DONE] 终止符，长连接）。
 * 30s 心跳一次，注释行 :heartbeat\n\n 防代理超时。
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { subscribeUserEvents } from "@/lib/server/user-event-bus"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      const safeEnqueue = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          cleanup()
        }
      }

      const sendEvent = (data: any) => {
        safeEnqueue(`data: ${JSON.stringify(data)}\n\n`)
      }

      const sendComment = (text: string) => {
        safeEnqueue(`: ${text}\n\n`)
      }

      // 初次连接成功事件，方便前端区分连接 vs 流错误
      sendEvent({ type: "ready", userId: user.id, ts: Date.now() })

      unsubscribe = subscribeUserEvents(user.id, (event) => {
        sendEvent(event)
      })

      heartbeat = setInterval(() => {
        sendComment("heartbeat")
      }, 30_000)

      const cleanup = () => {
        if (closed) return
        closed = true
        if (unsubscribe) {
          try {
            unsubscribe()
          } catch {}
          unsubscribe = null
        }
        if (heartbeat) {
          clearInterval(heartbeat)
          heartbeat = null
        }
        try {
          controller.close()
        } catch {}
      }

      req.signal.addEventListener("abort", cleanup)
    },
    cancel() {
      closed = true
      if (unsubscribe) {
        try {
          unsubscribe()
        } catch {}
        unsubscribe = null
      }
      if (heartbeat) {
        clearInterval(heartbeat)
        heartbeat = null
      }
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  })
}
