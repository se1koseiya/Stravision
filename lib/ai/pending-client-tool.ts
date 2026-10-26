/**
 * 挂起的「前端工具（client tool）」注册表
 *
 * 背景：有些工具只能在浏览器里执行 —— 最典型的是「修改画布」：
 * ReactFlow 的节点/边是编辑器的本地 state，后端既看不到也未落库，
 * 所以必须由前端执行、再把结果回灌给 Agent Loop。
 *
 * 链路（与 pending-user-input 同一套挂起思路，但按 clientToolId 定位而非 sessionId）：
 *   1. 模型 tool_call 命中后端登记的「前端工具」名字
 *   2. route.ts 不交给 executor，而是推 SSE `client_tool_call { id, name, arguments }`
 *   3. 前端执行（改画布）→ POST /api/chat/client-tool-result { client_tool_id, result }
 *   4. 本模块 resolve → Agent Loop 拿到结果继续下一轮推理
 *
 * 与 pending-user-input 的差异：那边 resolve 的是一段"用户回复文本"，
 * 这边 resolve 的是前端工具的结构化返回（会原样 JSON 序列化后作为 tool 结果）。
 *
 * 结构与语义同 `pending-user-input.ts`：**本地 waiter（globalThis）+ 共享索引/投递通道**
 * （`lib/ai/hitl/`），本地优先匹配，跨实例靠 Redis 索引 + Pub/Sub 投递。
 */

// 挂起超时的唯一来源（lib/ai/agent-budget.ts）
import { HITL_CLIENT_TOOL_TIMEOUT_MS } from './agent-budget'
import { HITL_INSTANCE_ID, getHitlTransport, onHitlDelivery } from './hitl'
import type { HitlIndexEntry } from './hitl/types'

const KIND = 'client-tool' as const

export interface PendingClientTool {
  /** 本次前端工具调用的唯一 ID（前端原样回传） */
  clientToolId: string
  /** 工具名（如 automation_canvas_apply） */
  toolName: string
  /** 所属 Agent Loop 会话（用于流结束/异常时统一清理） */
  sessionId: string
  /** 挂起时间戳 */
  createdAt: number
  resolve: (result: unknown) => void
  reject: (reason?: unknown) => void
}

/** 本地记录：追加进程内专用字段 */
interface LocalPendingClientTool extends PendingClientTool {
  timeoutMs: number
  timer?: ReturnType<typeof setTimeout>
  detachAbort?: () => void
}

/**
 * 🚨 本地 waiter 表必须挂在 globalThis 上，不能用模块级 `new Map()`。
 *
 * 原因：Next.js 的 App Router 会**按路由入口分别打包**，同一个模块被
 * `/api/chat` 与 `/api/chat/client-tool-result` 两个 route 各自实例化一份，
 * 模块级 Map 因此是两个互不相干的副本 —— 表现为：A 路由挂起的 promise
 * 永远等不到 B 路由的 resolve，前端回传结果被判定为 `not_pending`，
 * 最终只会等到超时（实测 2026-09-21 踩到）。
 * 挂到 globalThis 后所有 bundle 实例（含 dev HMR 的各代）共享同一份状态。
 *
 * 同理见 `lib/ai/pending-user-input.ts`（CHECKPOINT/CLARIFY 挂起）。
 */
interface ClientToolRegistry {
  map: Map<string, LocalPendingClientTool>
  instanceId: string
}

const g = globalThis as unknown as { __berryPendingClientTools?: ClientToolRegistry }
if (!g.__berryPendingClientTools) {
  g.__berryPendingClientTools = {
    map: new Map<string, LocalPendingClientTool>(),
    instanceId: HITL_INSTANCE_ID,
  }
}

const pendingMap = g.__berryPendingClientTools.map

/** 诊断用：当前模块所在 bundle 的实例指纹（不同路由若各自实例化模块，此值可用于比对） */
export const REGISTRY_INSTANCE_ID = g.__berryPendingClientTools.instanceId

/** 默认超时：2 分钟。前端执行失败/页面已关闭时避免长连接永久挂住（值见 lib/ai/agent-budget.ts） */
const DEFAULT_TIMEOUT_MS = HITL_CLIENT_TOOL_TIMEOUT_MS

function toIndexEntry(pending: LocalPendingClientTool): HitlIndexEntry {
  return {
    kind: KIND,
    key: pending.clientToolId,
    instanceId: HITL_INSTANCE_ID,
    sessionId: pending.sessionId,
    toolName: pending.toolName,
    createdAt: pending.createdAt,
    expiresAt: pending.createdAt + (pending.timeoutMs || DEFAULT_TIMEOUT_MS),
  }
}

function detachLocal(clientToolId: string, pending: LocalPendingClientTool, dropIndex: boolean): void {
  if (pending.timer) clearTimeout(pending.timer)
  pending.timer = undefined
  pending.detachAbort?.()
  pending.detachAbort = undefined
  pendingMap.delete(clientToolId)
  if (dropIndex) {
    void getHitlTransport()
      .drop(KIND, clientToolId)
      .catch(() => { /* ignore */ })
  }
}

/**
 * 注册并等待前端工具结果
 *
 * @param signal 可选 —— 传 `req.signal`：客户端断开时立刻收尾，不留悬挂 promise
 * @returns 前端回传的结果对象
 * @throws 超时 / 流关闭 / 连接断开时 reject
 */
export function waitForClientToolResult(
  clientToolId: string,
  sessionId: string,
  toolName: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  signal?: AbortSignal
): Promise<unknown> {
  return new Promise<unknown>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('client_disconnected'))
      return
    }

    const record: LocalPendingClientTool = {
      clientToolId,
      toolName,
      sessionId,
      createdAt: Date.now(),
      timeoutMs,
      resolve,
      reject,
    }
    pendingMap.set(clientToolId, record)

    const transport = getHitlTransport()
    transport.touchAlive()
    void transport.upsert(toIndexEntry(record)).catch(() => { /* 索引写失败按单机模式继续 */ })

    const timer = setTimeout(() => {
      const still = pendingMap.get(clientToolId)
      if (still) {
        detachLocal(clientToolId, still, true)
        console.warn(`[PendingClientTool] ${toolName} timeout after ${timeoutMs}ms (id=${clientToolId})`)
        reject(new Error(`client_tool_timeout_after_${timeoutMs}ms`))
      }
    }, timeoutMs)
    record.timer = timer

    if (signal) {
      const onAbort = () => {
        const still = pendingMap.get(clientToolId)
        if (still) {
          detachLocal(clientToolId, still, true)
          still.reject(new Error('client_disconnected'))
        }
      }
      signal.addEventListener('abort', onAbort, { once: true })
      record.detachAbort = () => signal.removeEventListener('abort', onAbort)
    }
  })
}

/**
 * 前端执行完成 → 传回结果
 *
 * @returns true 表示成功 resolve；false 表示没有该挂起项（已超时/已处理/在别的实例且不可达）
 */
export async function resolveClientToolResult(clientToolId: string, result: unknown): Promise<boolean> {
  const pending = pendingMap.get(clientToolId)
  if (pending) {
    pending.resolve(result)
    detachLocal(clientToolId, pending, true)
    console.log(
      `[PendingClientTool] Resolved ${pending.toolName} (id=${clientToolId}) in ${Date.now() - pending.createdAt}ms`
    )
    return true
  }

  // 跨实例：挂起在别的容器上
  const transport = getHitlTransport()
  try {
    const entries = await transport.list(KIND)
    if (entries.length === 0) {
      console.warn(`[PendingClientTool] No pending client tool for id=${clientToolId}`)
      return false
    }
    const alive = await transport.filterAlive(entries)
    const hit = alive.find((e) => e.key === clientToolId)
    if (!hit) {
      console.warn(`[PendingClientTool] No pending client tool for id=${clientToolId}`)
      return false
    }
    const claimed = await transport.claim(KIND, clientToolId)
    if (!claimed) return false
    transport.deliver({
      kind: KIND,
      key: claimed.key,
      instanceId: claimed.instanceId,
      action: 'resolve',
      result,
    })
    console.log(
      `[PendingClientTool] Resolved ${claimed.toolName} (id=${clientToolId}) cross-instance → ${claimed.instanceId}`
    )
    return true
  } catch (e) {
    console.warn('[PendingClientTool] cross-instance resolve failed:', e)
    return false
  }
}

/**
 * 清理某个会话下所有挂起的前端工具（SSE 流关闭 / 异常 / 用户中断时调用）
 */
export function cancelPendingClientToolsForSession(sessionId: string, reason: string): void {
  for (const [id, pending] of pendingMap.entries()) {
    if (pending.sessionId === sessionId) {
      pending.reject(new Error(reason))
      detachLocal(id, pending, true)
      console.log(`[PendingClientTool] Cancelled ${pending.toolName} (id=${id}), reason=${reason}`)
    }
  }
}

/** 挂起数量（调试用；只统计本进程） */
export function getPendingClientToolCount(): number {
  return pendingMap.size
}

/** 跨实例挂起数量（异步；Redis 未配置时 = 本进程数） */
export async function getPendingClientToolCountAcrossInstances(): Promise<number> {
  try {
    const transport = getHitlTransport()
    const entries = await transport.list(KIND)
    const alive = await transport.filterAlive(entries)
    const keys = new Set(alive.map((e) => e.key))
    for (const key of pendingMap.keys()) keys.add(key)
    return keys.size
  } catch {
    return pendingMap.size
  }
}

/** 跨实例投递落到本地挂起上（key = clientToolId） */
function applyDelivery(key: string, action: 'resolve' | 'cancel', result: unknown, reason: string): void {
  const pending = pendingMap.get(key)
  if (!pending) return
  if (action === 'resolve') {
    pending.resolve(result)
    detachLocal(key, pending, false)
    console.log(`[PendingClientTool] Resolved ${pending.toolName} (id=${key}) via cross-instance delivery`)
  } else {
    pending.reject(new Error(reason))
    detachLocal(key, pending, false)
    console.log(`[PendingClientTool] Cancelled ${pending.toolName} (id=${key}) via cross-instance delivery`)
  }
}

onHitlDelivery((msg) => {
  if (msg.kind !== KIND) return
  if (msg.instanceId !== HITL_INSTANCE_ID) return
  applyDelivery(msg.key, msg.action, msg.result, msg.reason ?? 'cancelled')
})

/** 测试用：清空本地 waiter 表 */
export function __resetPendingClientToolsForTests(): void {
  for (const [id, pending] of pendingMap.entries()) {
    detachLocal(id, pending, false)
  }
  pendingMap.clear()
}
