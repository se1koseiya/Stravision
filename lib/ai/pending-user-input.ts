/**
 * 挂起的用户输入注册表（HITL：CHECKPOINT / CLARIFY / ask_user_question）
 *
 * 用于支持 Agent Loop 内的「等待用户输入」机制：
 * - 当 AI 输出 <CHECKPOINT> / <CLARIFY>（或调用 ask_user_question 工具）时，
 *   Agent Loop 不退出，而是挂起等待用户填表回复
 * - 前端渲染表单 → 用户提交 → POST /api/chat/respond
 * - respond 路由找到挂起的 resolve 函数，传回用户回复
 * - Agent Loop 继续下一轮迭代
 *
 * 同一个 session 同一时间只允许一个挂起的 checkpoint（防止并发污染）
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 2026-10-14 架构升级：挂起状态从「只在本进程」变为「本地 waiter + 共享索引」
 *
 *   ① **本地 waiter**（本文件，挂 globalThis）：真正的 promise resolver。
 *      必须在发起等待的进程里，跨 bundle 共享仍然靠 globalThis。
 *   ② **共享索引 + 投递通道**（`lib/ai/hitl/`）：记录「哪个实例在等哪个 checkpoint」，
 *      并把「有人答复了」送到那个实例。
 *
 *   匹配顺序 = **本地优先**（零网络往返，单实例行为逐字不变）→ 再查共享索引
 *   （跨实例/多容器）。索引的认领用 `HDEL` 做原子操作，并发下只有一个实例能消费。
 *
 *   未配置 `REDIS_URL` 时传输层自动退化为进程内实现，行为与升级前完全一致。
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ 解析策略（2026-10-09 修正，保持不变）
 * 历史上这里有一个致命缺陷：`resolvePendingUserInputByCheckpointId` 在**未命中**时
 * 会「把回复缓存起来并返回 true」，导致 `respond` 路由里的 `ByUserId` 兜底变成**死代码**
 * （永远执行不到）。后果是：只要 checkpoint_id 对不上（模型复用同名 checkpoint、
 * 前端残留陈旧 id、跨会话重复 id…），服务端就会返回 200「成功」但**什么都没恢复**，
 * Agent Loop 原地干等到 5 分钟超时 —— 用户观感正是「澄清卡提交完，AI 半天不回复」。
 *
 * 现在改为：**精确匹配只做精确匹配**，未命中就返回 false，让调用方继续走更宽的兜底
 * （先「该用户当前挂起」，再「任意会话 id 精确命中」），最后都没有才 404。
 * 宁可 404 让前端立刻走兜底（发新消息），也绝不假成功静默挂死。
 *
 * 跨实例时同一条铁律继续成立：索引里查不到、或认领失败（别人抢先了）、
 * 或持有者进程已死（心跳缺失）→ 一律返回 false，绝不假成功。
 */

// 挂起超时的唯一来源（lib/ai/agent-budget.ts）
import { HITL_USER_INPUT_TIMEOUT_MS } from './agent-budget'
import { HITL_INSTANCE_ID, getHitlTransport, onHitlDelivery } from './hitl'
import type { HitlIndexEntry } from './hitl/types'

const KIND = 'user-input' as const

/**
 * 挂起类型：
 *   · `checkpoint`   —— AI 输出 `<CHECKPOINT>` 等用户做决策
 *   · `clarify`      —— AI 输出 `<CLARIFY>` / 调用 ask_user_question 等用户补参数
 *   · `tool_confirm` —— 「请求批准」模式下高风险工具执行前等用户放行
 *                       （2026-10-14：确认条浮在 sender 上方，不是消息流里的卡片）
 */
export type PendingUserInputType = 'checkpoint' | 'clarify' | 'tool_confirm'

export interface PendingUserInput {
  /** 挂起点 ID（CHECKPOINT JSON 的 id / CLARIFY 自动生成 / ask_user_question 工具生成 / tool_confirm 自动生成） */
  checkpointId: string
  /** 挂起类型 */
  type: PendingUserInputType
  /** 挂起时间戳 */
  createdAt: number
  /** 标题（用于调试） */
  title?: string
  /** resolve 回调：用户回复到达时调用，参数为用户回复文本 */
  resolve: (reply: string) => void
  /** reject 回调：超时或连接断开时调用 */
  reject: (reason: string) => void
}

/** 本地记录：在对外结构上追加进程内专用字段（定时器 / abort 解绑） */
interface LocalPendingUserInput extends PendingUserInput {
  /** 本次挂起的超时（用于计算索引里的 expiresAt） */
  timeoutMs: number
  /** 超时定时器句柄 */
  timer?: ReturnType<typeof setTimeout>
  /** AbortSignal 解绑函数（收尾时调用） */
  detachAbort?: () => void
}

/**
 * 🚨 本地 waiter 表必须挂在 globalThis 上，不能用模块级 `new Map()`。
 *
 * 原因：Next.js 的 App Router 会**按路由入口分别打包**，同一个模块被
 * `/api/chat`（挂起方，调用 waitForUserInput）与 `/api/chat/respond`
 * （恢复方，调用 resolvePendingUserInput*）两个 route 各自实例化一份。
 * 模块级 Map 因此是两个互不相干的副本 —— 表现为：用户在澄清卡片提交答案后，
 * respond 路由查不到挂起点，Agent Loop 一直挂到 5 分钟超时。
 * 挂到 globalThis 后所有 bundle 实例（含 dev HMR 的各代）共享同一份状态。
 *
 * 同构实现见 `lib/ai/pending-client-tool.ts`（前端工具挂起注册表）。
 */
interface PendingUserInputRegistry {
  map: Map<string, LocalPendingUserInput>
  instanceId: string
}

const g = globalThis as unknown as { __berryPendingUserInput?: PendingUserInputRegistry }
if (!g.__berryPendingUserInput) {
  g.__berryPendingUserInput = {
    map: new Map<string, LocalPendingUserInput>(),
    instanceId: HITL_INSTANCE_ID,
  }
}

// 全局注册表：sessionId -> LocalPendingUserInput
const pendingMap = g.__berryPendingUserInput.map

/** 诊断用：当前模块所在 bundle 的实例指纹（不同路由若各自实例化模块，此值可用于比对） */
export const PENDING_USER_INPUT_INSTANCE_ID = g.__berryPendingUserInput.instanceId

/** sessionId 形如 `session-${userId}-${timestamp}` → 取 userId 用于索引匹配 */
function userIdFromSessionId(sessionId: string): number | undefined {
  const m = /^session-(\d+)-/.exec(sessionId)
  if (!m) return undefined
  const id = Number(m[1])
  return Number.isFinite(id) ? id : undefined
}

function toIndexEntry(sessionId: string, pending: LocalPendingUserInput): HitlIndexEntry {
  return {
    kind: KIND,
    key: sessionId,
    instanceId: HITL_INSTANCE_ID,
    sessionId,
    userId: userIdFromSessionId(sessionId),
    checkpointId: pending.checkpointId,
    pendingType: pending.type,
    title: pending.title,
    createdAt: pending.createdAt,
    expiresAt: pending.createdAt + (pending.timeoutMs || HITL_USER_INPUT_TIMEOUT_MS),
  }
}

/** 摘除本地记录（不 resolve/reject，由调用方决定语义） */
function detachLocal(sessionId: string, pending: LocalPendingUserInput, dropIndex: boolean): void {
  if (pending.timer) clearTimeout(pending.timer)
  pending.timer = undefined
  pending.detachAbort?.()
  pending.detachAbort = undefined
  pendingMap.delete(sessionId)
  if (dropIndex) {
    // 尽力而为：索引清理失败不影响本地语义（读取时会按 expiresAt 懒清理）
    void getHitlTransport()
      .drop(KIND, sessionId)
      .catch(() => { /* ignore */ })
  }
}

/**
 * 注册一个挂起的用户输入请求
 *
 * 注册是**同步**完成的（保证「注册后立刻 resolve」的既有顺序语义）；
 * 共享索引的写入是异步的 —— 匹配是本地优先的，索引落地延迟不影响单实例正确性。
 */
export function registerPendingUserInput(
  sessionId: string,
  pending: Omit<PendingUserInput, 'createdAt'> & { timeoutMs?: number }
): void {
  // 如果该 session 已有挂起的请求，先拒绝旧的（防止并发污染）
  const existing = pendingMap.get(sessionId)
  if (existing) {
    existing.reject('superseded_by_new_checkpoint')
    detachLocal(sessionId, existing, false)
  }
  const record: LocalPendingUserInput = {
    ...pending,
    createdAt: Date.now(),
    timeoutMs: pending.timeoutMs ?? HITL_USER_INPUT_TIMEOUT_MS,
  }
  pendingMap.set(sessionId, record)
  const transport = getHitlTransport()
  transport.touchAlive()
  void transport.upsert(toIndexEntry(sessionId, record)).catch(() => { /* 索引写失败按单机模式继续 */ })
  console.log(`[PendingUserInput] Registered ${record.type} for session ${sessionId}, id=${record.checkpointId}`)
}

/** 本地消费：resolve 并清理（含索引） */
function consumeLocal(sessionId: string, pending: LocalPendingUserInput, reply: string, how: string): true {
  pending.resolve(reply)
  detachLocal(sessionId, pending, true)
  console.log(
    `[PendingUserInput] Resolved by ${how}, session=${sessionId}, id=${pending.checkpointId}, reply length=${reply.length}`
  )
  return true
}

/**
 * 跨实例消费：查共享索引 → 原子认领 → 投递到持有者
 *
 * 任一步失败（查不到 / 被别人抢先 / 持有者进程已死）都返回 false ——
 * 调用方据此继续降级或 404，**绝不假成功**。
 */
async function claimAndDeliver(
  predicate: (entry: HitlIndexEntry) => boolean,
  reply: string,
  how: string
): Promise<boolean> {
  const transport = getHitlTransport()
  try {
    const entries = await transport.list(KIND)
    if (entries.length === 0) return false
    const alive = await transport.filterAlive(entries)
    const hit = alive.find(predicate)
    if (!hit) return false
    const claimed = await transport.claim(KIND, hit.key)
    if (!claimed) return false // 并发下已被抢先消费
    transport.deliver({
      kind: KIND,
      key: claimed.key,
      instanceId: claimed.instanceId,
      action: 'resolve',
      reply,
    })
    console.log(
      `[PendingUserInput] Resolved by ${how} (cross-instance → ${claimed.instanceId}), session=${claimed.sessionId}`
    )
    return true
  } catch (e) {
    console.warn('[PendingUserInput] cross-instance resolve failed:', e)
    return false
  }
}

/**
 * 用户回复到达时调用（按 sessionId 精确）
 *
 * @returns true 表示成功 resolve，false 表示没有挂起的请求
 */
export async function resolvePendingUserInput(sessionId: string, reply: string): Promise<boolean> {
  const pending = pendingMap.get(sessionId)
  if (pending) return consumeLocal(sessionId, pending, reply, `session=${sessionId}`)
  return claimAndDeliver((entry) => entry.sessionId === sessionId, reply, `session=${sessionId}`)
}

/**
 * 取消挂起的请求（连接断开 / 超时 / 用户主动取消）
 *
 * 同步本地 reject + 异步清理索引（调用方无需关心索引清理延迟）。
 */
export function cancelPendingUserInput(sessionId: string, reason: string): void {
  const pending = pendingMap.get(sessionId)
  if (!pending) return
  pending.reject(reason)
  detachLocal(sessionId, pending, true)
  console.log(`[PendingUserInput] Cancelled ${pending.type} for session ${sessionId}, reason=${reason}`)
}

/**
 * 查询当前是否有挂起的请求（用于调试 / 健康检查）
 *
 * ⚠️ 只反映**本进程**的挂起；跨实例视图见 `countPendingUserInputAcrossInstances`。
 */
export function getPendingUserInput(sessionId: string): PendingUserInput | undefined {
  return pendingMap.get(sessionId)
}

/** 当前本进程挂起项总数（用于诊断日志） */
export function countPendingUserInput(): number {
  return pendingMap.size
}

/** 跨实例挂起项总数（异步；Redis 未配置时 = 本进程数） */
export async function countPendingUserInputAcrossInstances(): Promise<number> {
  try {
    const transport = getHitlTransport()
    const entries = await transport.list(KIND)
    const alive = await transport.filterAlive(entries)
    const keys = new Set(alive.map((e) => e.key))
    // 本地 waiter 是权威视图，与索引并集（防索引写入尚未落地）
    for (const key of pendingMap.keys()) keys.add(key)
    return keys.size
  } catch {
    return pendingMap.size
  }
}

/**
 * 【首选】按「用户 + checkpoint_id」双重匹配解析
 *
 * 最精确的一档：只在该用户自己的挂起项里找 id 完全一致的那个。
 * 之所以要加 userId 约束：checkpoint id 可能是**模型自己起的名**（如 `cp_light_retry`），
 * 跨会话/跨轮次极易重名 —— 只按 id 全局找会命中**别的会话的历史残留**，
 * 把回复投递给错误的挂起点，而真正在等的那个永远等不到。
 *
 * @returns true 表示已 resolve
 */
export async function resolvePendingUserInputByUserIdAndCheckpoint(
  userId: number,
  checkpointId: string,
  reply: string
): Promise<boolean> {
  const prefix = `session-${userId}-`
  for (const [sessionId, pending] of pendingMap.entries()) {
    if (sessionId.startsWith(prefix) && pending.checkpointId === checkpointId) {
      return consumeLocal(sessionId, pending, reply, `userId=${userId} + checkpointId=${checkpointId}`)
    }
  }
  return claimAndDeliver(
    (entry) => entry.sessionId.startsWith(prefix) && entry.checkpointId === checkpointId,
    reply,
    `userId=${userId} + checkpointId=${checkpointId}`
  )
}

/**
 * 【次选】按用户 ID 解析挂起的请求
 *
 * sessionId 格式为 `session-${userId}-${timestamp}`，前端无法知道完整 sessionId，
 * 所以通过 userId 前缀匹配。同一用户同时只允许一个挂起的 checkpoint
 * （由 registerPendingUserInput 保证），因此找到的第一个匹配项即为当前活跃的挂起请求。
 *
 * 这一档是「id 对不上」时的**自愈路径**：前端残留了陈旧 id、或模型复用了同名 id 时，
 * 直接恢复该用户当前真正在等的那一个，而不是干等到超时。
 *
 * @returns true 表示成功 resolve
 */
export async function resolvePendingUserInputByUserId(userId: number, reply: string): Promise<boolean> {
  const prefix = `session-${userId}-`
  for (const [sessionId, pending] of pendingMap.entries()) {
    if (sessionId.startsWith(prefix)) {
      return consumeLocal(sessionId, pending, reply, `userId=${userId}`)
    }
  }
  return claimAndDeliver((entry) => entry.sessionId.startsWith(prefix), reply, `userId=${userId}`)
}

/**
 * 【末选】按 checkpointId 在**所有会话**里精确匹配
 *
 * 仅做精确匹配，**未命中就返回 false**（绝不缓存/假成功）。
 * 未命中时调用方应继续降级或直接 404，让前端立刻走兜底。
 *
 * @returns true 表示已 resolve，false 表示没有任何挂起项的 id 与之匹配
 */
export async function resolvePendingUserInputByCheckpointId(
  checkpointId: string,
  reply: string
): Promise<boolean> {
  for (const [sessionId, pending] of pendingMap.entries()) {
    if (pending.checkpointId === checkpointId) {
      return consumeLocal(sessionId, pending, reply, `checkpointId=${checkpointId} (any session)`)
    }
  }
  return claimAndDeliver(
    (entry) => entry.checkpointId === checkpointId,
    reply,
    `checkpointId=${checkpointId} (any session)`
  )
}

/** 把一个**跨实例投递**落到本地挂起上（handler 由传输层回调，key = sessionId） */
function applyDelivery(key: string, action: 'resolve' | 'cancel', reply: string, reason: string): void {
  const pending = pendingMap.get(key)
  if (!pending) return // 已超时/已处理：静默忽略（与既有的幂等语义一致）
  if (action === 'resolve') {
    consumeLocal(key, pending, reply, 'cross-instance delivery')
  } else {
    pending.reject(reason)
    detachLocal(key, pending, false)
    console.log(`[PendingUserInput] Cancelled by cross-instance delivery for session ${key}, reason=${reason}`)
  }
}

// 只在持有本地 waiter 的实例上生效：投递消息带 instanceId，非归属实例直接忽略
onHitlDelivery((msg) => {
  if (msg.kind !== KIND) return
  if (msg.instanceId !== HITL_INSTANCE_ID) return
  applyDelivery(msg.key, msg.action, msg.reply ?? '', msg.reason ?? 'cancelled')
})

/**
 * 等待用户输入
 *
 * - 注册挂起请求 → await promise
 * - 超时自动 reject（默认 5 分钟）
 * - 外部可通过 resolvePendingUserInput* / cancelPendingUserInput 控制
 * - **AbortSignal**：SSE 连接断开 / 请求被中止时立刻收尾，不再空占挂起槽位
 *
 * @param signal 可选 —— 传 `req.signal` 可让「客户端断开」立刻释放挂起
 */
export function waitForUserInput(
  sessionId: string,
  checkpointId: string,
  type: PendingUserInputType,
  title: string,
  timeoutMs: number = HITL_USER_INPUT_TIMEOUT_MS,
  signal?: AbortSignal
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error(signal.reason ? String(signal.reason) : 'client_disconnected'))
      return
    }

    registerPendingUserInput(sessionId, { checkpointId, type, title, timeoutMs, resolve, reject })

    const record = pendingMap.get(sessionId)

    // 超时清理：超时时间到自动取消，避免长连接资源占用
    const timer = setTimeout(() => {
      const stillPending = pendingMap.get(sessionId)
      if (stillPending && stillPending.checkpointId === checkpointId) {
        cancelPendingUserInput(sessionId, `timeout_after_${timeoutMs}ms`)
      }
    }, timeoutMs)

    if (record) {
      record.timer = timer
      if (signal) {
        const onAbort = () => {
          const stillPending = pendingMap.get(sessionId)
          if (stillPending && stillPending.checkpointId === checkpointId) {
            cancelPendingUserInput(
              sessionId,
              signal.reason ? String(signal.reason) : 'client_disconnected'
            )
          }
        }
        signal.addEventListener('abort', onAbort, { once: true })
        record.detachAbort = () => signal.removeEventListener('abort', onAbort)
      }
    }
  })
}

/** 测试用：清空本地 waiter 表 */
export function __resetPendingUserInputForTests(): void {
  for (const [sessionId, pending] of pendingMap.entries()) {
    detachLocal(sessionId, pending, false)
  }
  pendingMap.clear()
}
