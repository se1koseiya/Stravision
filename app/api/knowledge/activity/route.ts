/**
 * 知识库活动流 API
 *
 * GET  /api/knowledge/activity                 获取活动日志列表
 *      ?scope=all|visible|public|collection|user (默认 visible)
 *      ?collection_id=X
 *      ?action=ACTION
 *      ?since_ms=UNIX_MS
 *      ?limit=50&offset=0
 *
 * GET  /api/knowledge/activity?stream=1        SSE 实时推送
 *      ?scope=all|visible|collection|user (默认 visible)
 *      ?collection_id=X
 *
 * 推送格式：
 *   data: {"type":"operation","log":{...}}
 *   （心跳间隔 15 秒）
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  listOperationLogs,
  listVisibleActivity,
  listPublicActivity
} from "@/lib/db/kb-collaboration-service"
import {
  subscribeKbActivity,
  type KbActivityEvent
} from "@/lib/server/kb-activity-bus"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)

  const { searchParams } = new URL(req.url)
  const stream = searchParams.get("stream") === "1"
  const scope = searchParams.get("scope") || "visible"
  const collectionId = searchParams.get("collection_id") ? Number(searchParams.get("collection_id")) : null
  const action = searchParams.get("action") || undefined
  const sinceMs = searchParams.get("since_ms") ? Number(searchParams.get("since_ms")) : undefined
  const limit = Number(searchParams.get("limit")) || 50
  const offset = Number(searchParams.get("offset")) || 0

  // ===== SSE 流 =====
  if (stream) {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // 发送初始事件
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "ready", ts: Date.now() })}\n\n`)
        )

        // 选择订阅主题
        const unsubscribers: Array<() => void> = []
        const handler = (event: KbActivityEvent) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            )
          } catch (e) {
            // 已断开
          }
        }

        if (scope === "all" || scope === "public") {
          unsubscribers.push(subscribeKbActivity("all", handler))
        } else if (scope === "collection" && collectionId != null) {
          unsubscribers.push(subscribeKbActivity(`collection:${collectionId}`, handler))
        } else if (scope === "user") {
          unsubscribers.push(subscribeKbActivity(`user:${user.id}`, handler))
        } else {
          // visible: 同时订阅 user + all + 所有协作集合
          unsubscribers.push(subscribeKbActivity(`user:${user.id}`, handler))
          unsubscribers.push(subscribeKbActivity("all", handler))
          if (collectionId != null) {
            unsubscribers.push(subscribeKbActivity(`collection:${collectionId}`, handler))
          }
        }

        // 心跳
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`))
          } catch (e) {
            // ignore
          }
        }, 15000)

        // AbortSignal
        const onAbort = () => {
          clearInterval(heartbeat)
          unsubscribers.forEach((u) => {
            try { u() } catch (e) {}
          })
          try { controller.close() } catch (e) {}
        }
        req.signal.addEventListener("abort", onAbort)

        // 防止 controller 在异步上下文中被回收
        ;(controller as any)._keepAlive = { heartbeat, unsubscribers, onAbort }
      },
      cancel() {
        // 在 start 中注册的 abort 处理
      }
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      }
    })
  }

  // ===== 普通列表 =====
  if (scope === "public" || scope === "all") {
    const { items, total } = await listPublicActivity({ limit, offset, sinceMs, action })
    return Response.json({ items, total })
  }
  if (scope === "collection" && collectionId != null) {
    const { items, total } = await listOperationLogs({
      collectionId,
      limit,
      offset,
      sinceMs,
      action
    })
    return Response.json({ items, total })
  }
  if (scope === "user") {
    const { items, total } = await listOperationLogs({
      userId: user.id,
      limit,
      offset,
      sinceMs,
      action
    })
    return Response.json({ items, total })
  }
  // 默认 visible
  const { items, total } = await listVisibleActivity(user.id, {
    limit,
    offset,
    sinceMs,
    action,
    collectionId: collectionId ?? undefined
  })
  return Response.json({ items, total })
}
