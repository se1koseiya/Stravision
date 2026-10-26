/**
 * HITL（Human-in-the-loop）挂起状态传输层 —— 类型定义
 *
 * 背景（架构评审 P0）：
 * 挂起注册表原先把状态挂在 `globalThis.__berry*` 上。这么做只是为了让
 * `/api/chat`（挂起方）与 `/api/chat/respond`（恢复方）两个 route bundle
 * 共享同一份状态 —— 在**单进程**下够用，但多容器 / PM2 cluster 下必然失效：
 * 用户点「确认」的请求可能落到**没有该挂起的实例**上，AI 永远等不到回复，
 * 直到 5 分钟超时。这是水平扩展的硬阻塞。
 *
 * 本层把「挂起」拆成两部分：
 *   ① **本地 waiter**（进程内，无法跨进程）：真正的 promise resolver —— 必须在
 *      发起等待的那个进程里，所以永远只存在本进程内存里（跨 bundle 仍走 globalThis）。
 *   ② **共享索引 + 投递通道**（可跨进程）：索引记录「哪个实例正在等哪个 key」，
 *      投递通道把「有人答复了」这件事送到那个实例上。
 *
 * 两种实现：
 *   - `redis-transport`（REDIS_URL 存在时）：索引落 Redis Hash，投递走 Pub/Sub，
 *     用 `HDEL` 的返回值做**原子认领**（只有一方能消费掉挂起项）。
 *   - `in-process-transport`（未配置 / 连接失败 / 桌面端）：索引与投递全在进程内，
 *     行为与改造前的 `globalThis` 方案逐字等价。
 */

/** 挂起种类：等待用户回复 / 等待前端工具执行结果 */
export type HitlKind = 'user-input' | 'client-tool'

/** 传输层实现标识 */
export type HitlTransportMode = 'redis' | 'in-process'

/**
 * 共享索引项：描述「某个实例上正挂着一个等待中的 key」。
 *
 * 只保留**用于匹配**的元信息 —— 绝不包含 resolve/reject（不可序列化）。
 */
export interface HitlIndexEntry {
  kind: HitlKind
  /** 索引键：user-input = sessionId；client-tool = clientToolId */
  key: string
  /** 持有 waiter 的实例指纹（投递时用于定位） */
  instanceId: string
  /** 所属 Agent Loop 会话 */
  sessionId: string
  /** user-input 专用：用于 `session-${userId}-` 前缀匹配 */
  userId?: number
  /** user-input 专用：CHECKPOINT / CLARIFY / ask_user_question 的 id */
  checkpointId?: string
  /** user-input 专用：挂起类型 */
  pendingType?: 'checkpoint' | 'clarify' | 'tool_confirm'
  /** user-input 专用：标题（调试用） */
  title?: string
  /** client-tool 专用：工具名 */
  toolName?: string
  createdAt: number
  /** 过期时刻（超时时间由 waiter 自己持有，这里只用于索引懒清理） */
  expiresAt: number
}

/**
 * 投递消息：把「挂起已被消费」这件事送到持有 waiter 的实例。
 *
 * 载荷必须一并传输 —— 回复文本 / 工具结果是发起方（respond 路由）才有的数据，
 * 持有方只拿着一个空 promise。
 */
export interface HitlDelivery {
  kind: HitlKind
  /** 与 `HitlIndexEntry.key` 同义 */
  key: string
  /** 目标实例指纹（不匹配的实例直接忽略） */
  instanceId: string
  action: 'resolve' | 'cancel'
  /** action=resolve 且 kind=user-input：用户回复文本 */
  reply?: string
  /** action=resolve 且 kind=client-tool：前端工具返回的结构化结果 */
  result?: unknown
  /** action=cancel：取消原因 */
  reason?: string
}

export type HitlDeliveryHandler = (msg: HitlDelivery) => void

/**
 * 传输层接口。
 *
 * ⚠️ 约定：`deliver()` 是**同步尽力**的 —— 先在本进程派发一次，再（Redis 模式下）
 * 发布到通道。本进程派发对「自己就是持有者」的场景是必需的（否则单进程下也要
 * 绕一圈网络）；对「持有者在别的实例」的场景，本进程派发会因 key 不匹配而空转，
 * 真正的投递由 Pub/Sub 完成。两侧都做，语义上只会重复一次「找不到 waiter」。
 */
export interface HitlTransport {
  readonly mode: HitlTransportMode
  /** 索引/通道是否真的可用（redis 模式下 = 已连接并订阅成功） */
  isReady(): boolean
  /** 写入或覆盖索引项（同 key 覆盖 → 天然实现「新挂起取代旧挂起」） */
  upsert(entry: HitlIndexEntry): Promise<void>
  /** 删除索引项（不关心是否存在） */
  drop(kind: HitlKind, key: string): Promise<void>
  /** **原子**摘取索引项：并发下只有一方能拿到，用于防止重复消费 */
  claim(kind: HitlKind, key: string): Promise<HitlIndexEntry | null>
  /** 列举未过期索引项（跨实例） */
  list(kind: HitlKind): Promise<HitlIndexEntry[]>
  /**
   * 过滤掉**持有者进程已死**的索引项。
   *
   * 为什么需要：索引项活着不等于「还有人在等」—— 容器重启后索引会残留到过期为止。
   * 若此时用户点「确认」，认领会成功、投递会石沉大海，`respond` 却返回 200 成功
   * （正是本项目明令禁止的「假成功」）。过滤后这种情况会退化成「没有挂起点」→ 404 →
   * 前端立刻走兜底，而不是静默挂到超时。
   */
  filterAlive(entries: HitlIndexEntry[]): Promise<HitlIndexEntry[]>
  /** 续期本实例的心跳（进程存活标记） */
  touchAlive(): void
  /** 投递（本地优先 + 远端通道） */
  deliver(msg: HitlDelivery): void
  /** 注册投递处理器（进程内幂等，重复注册只保留一份） */
  onDeliver(handler: HitlDeliveryHandler): void
  /** 诊断信息 */
  describe(): { mode: HitlTransportMode; ready: boolean; subscribed: boolean; lastError?: string }
}
