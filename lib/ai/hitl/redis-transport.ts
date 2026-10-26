/**
 * Redis（Valkey 兼容）HITL 传输层 —— 解除水平扩展阻塞
 *
 * 存储布局：
 *   Hash   berry:hitl:index:user-input   field = sessionId     value = JSON(HitlIndexEntry)
 *   Hash   berry:hitl:index:client-tool  field = clientToolId  value = JSON(HitlIndexEntry)
 *   Pub/Sub berry:hitl:deliver           message = JSON(HitlDelivery)
 *
 * 为什么用 `HDEL` 做认领：`HDEL` 返回被删除的字段数，是**单命令原子**的 ——
 * N 个实例同时答复同一个挂起点时，只有拿到 1 的那一方会去投递，杜绝重复消费。
 * （`HGETALL` + `HDEL` 之间有窗口，但窗口只影响「谁赢」，不影响「只有一个赢家」。）
 *
 * 降级策略（重要）：
 *   - 未配置 `REDIS_URL` → 根本不会走到这里（由 index.ts 选择进程内实现）；
 *   - 已配置但连不上 / 重试耗尽 → `isReady()=false`，所有方法退化为**空操作/空结果**。
 *     此时匹配仍能命中本进程的本地 waiter（facade 是「本地优先」的），
 *     所以单实例功能不受影响；只是回不到跨实例投递 —— 绝不允许整站报错。
 */

import { HITL_INSTANCE_ID } from './instance'
import type {
  HitlDelivery,
  HitlDeliveryHandler,
  HitlIndexEntry,
  HitlKind,
  HitlTransport,
  HitlTransportMode,
} from './types'

const INDEX_KEY_PREFIX = 'berry:hitl:index:'
const DELIVER_CHANNEL = 'berry:hitl:deliver'
const ALIVE_KEY_PREFIX = 'berry:hitl:alive:'
/** 实例心跳 TTL / 刷新周期：TTL 必须是刷新周期的 3 倍以上，容忍一次丢包或事件循环抖动 */
const ALIVE_TTL_SECONDS = 20
const ALIVE_REFRESH_MS = 6_000

/** 只用到 ioredis 的一小部分能力 —— 抽成结构接口，便于单测注入假实现 */
export interface RedisLike {
  status: string
  connect(): Promise<void>
  hset(key: string, field: string, value: string): Promise<unknown>
  hgetall(key: string): Promise<Record<string, string>>
  hdel(key: string, ...fields: string[]): Promise<number>
  set(key: string, value: string, ...args: (string | number)[]): Promise<unknown>
  mget(...keys: string[]): Promise<(string | null)[]>
  publish(channel: string, message: string): Promise<unknown>
  subscribe(channel: string): Promise<unknown>
  on(event: string, listener: (...args: unknown[]) => void): unknown
  disconnect(reconnect?: boolean): void
}

export type RedisLikeFactory = (url: string) => RedisLike

function indexKey(kind: HitlKind): string {
  return `${INDEX_KEY_PREFIX}${kind}`
}

function aliveKey(instanceId: string): string {
  return `${ALIVE_KEY_PREFIX}${instanceId}`
}

/** 惰性加载 ioredis：未配置 Redis 的部署（含桌面端）连模块都不会加载 */
async function defaultRedisFactory(url: string): Promise<RedisLike> {
  const mod = (await import('ioredis')) as unknown as {
    Redis?: new (url: string, options?: Record<string, unknown>) => unknown
    default?: new (url: string, options?: Record<string, unknown>) => unknown
  }
  const Ctor = mod.Redis ?? mod.default
  if (!Ctor) throw new Error('ioredis 模块未导出 Redis 构造器')
  // ioredis 的命令签名极多（每个命令几十个重载），不逐个对齐类型：
  // 这里只按我们用到的能力做结构断言，避免版本升级时类型噪音。
  return new Ctor(url, {
    lazyConnect: true,
    // 命令最多重试 2 次即失败（配合 retryStrategy 的放弃阈值，避免永久挂起请求）
    maxRetriesPerRequest: 2,
    connectTimeout: 3_000,
    // 头几次快速重连，之后直接放弃 → 由 isReady() 触发降级
    retryStrategy: (times: number) => (times > 5 ? null : Math.min(times * 200, 2_000)),
  }) as unknown as RedisLike
}

export class RedisTransport implements HitlTransport {
  readonly mode: HitlTransportMode = 'redis'

  private readonly url: string
  private readonly factory: RedisLikeFactory | ((url: string) => Promise<RedisLike>) | undefined
  private client: RedisLike | null = null
  private subscriber: RedisLike | null = null
  private connecting: Promise<boolean> | null = null
  private subscribed = false
  private gaveUp = false
  private lastError: string | undefined
  private readonly instanceId = HITL_INSTANCE_ID
  private heartbeat: ReturnType<typeof setInterval> | null = null
  private readonly handlers = new Set<HitlDeliveryHandler>()

  constructor(url: string, factory?: RedisLikeFactory) {
    this.url = url
    this.factory = factory
  }

  // ────────────────────────── 连接管理 ──────────────────────────

  private async ensureConnected(): Promise<boolean> {
    if (this.subscribed) return true
    if (this.gaveUp) return false
    if (this.connecting) return this.connecting

    this.connecting = (async () => {
      try {
        const factory = this.factory
        const make = async (): Promise<RedisLike> => {
          if (typeof factory === 'function') {
            // 允许注入同步或异步工厂（测试注入同步假实现）
            const made = factory(this.url) as unknown
            return made instanceof Promise ? await (made as Promise<RedisLike>) : (made as RedisLike)
          }
          return await defaultRedisFactory(this.url)
        }

        const client = await make()
        const subscriber = await make()
        // ioredis 要求必须挂 error 监听，否则连接错误会变成 unhandled 事件
        client.on('error', (e) => {
          this.lastError = e instanceof Error ? e.message : String(e)
        })
        subscriber.on('error', (e) => {
          this.lastError = e instanceof Error ? e.message : String(e)
        })

        await client.connect()
        await subscriber.connect()
        subscriber.on('message', (channel, payload) => {
          if (channel !== DELIVER_CHANNEL) return
          this.dispatchRemote(String(payload))
        })
        await subscriber.subscribe(DELIVER_CHANNEL)

        this.client = client
        this.subscriber = subscriber
        this.subscribed = true
        console.log('[Hitl][redis] connected & subscribed')
        return true
      } catch (e) {
        this.lastError = e instanceof Error ? e.message : String(e)
        this.gaveUp = true
        console.warn(`[Hitl][redis] unavailable, falling back to local-only: ${this.lastError}`)
        return false
      }
    })()

    return this.connecting
  }

  isReady(): boolean {
    return this.subscribed && !this.gaveUp
  }

  /** 后台预热（不阻塞调用方）：首次注册挂起时顺手触发 */
  warmup(): void {
    void this.ensureConnected()
  }

  /**
   * 心跳：让别的实例能判断「持有这个挂起的进程还活着」。
   *
   * 只在需要时启动定时器（首次调用后），进程退出即随进程消失；
   * 未连接 Redis 时什么都不做 —— 降级路径下跨实例能力本就不可用。
   */
  touchAlive(): void {
    this.warmup()
    if (this.heartbeat) return
    const tick = () => {
      void (async () => {
        const client = await this.readyClient()
        if (!client) return
        try {
          await this.writeHeartbeat(client)
        } catch (e) {
          this.noteFailure(e)
        }
      })()
    }
    tick()
    this.heartbeat = setInterval(tick, ALIVE_REFRESH_MS)
    // Node 下不要让心跳把进程钉住（不影响 Next server，但利于脚本/测试退出）
    if (typeof this.heartbeat === 'object' && typeof (this.heartbeat as { unref?: () => void }).unref === 'function') {
      ;(this.heartbeat as { unref: () => void }).unref()
    }
  }

  /** 写本实例的存活标记（TTL 语义：进程没了 → 标记自动消失） */
  private async writeHeartbeat(client: RedisLike): Promise<void> {
    await client.set(aliveKey(this.instanceId), '1', 'EX', ALIVE_TTL_SECONDS)
  }

  /**
   * 过滤掉持有者已死的索引项。
   *
   * 用 `MGET` 而不是 `EXISTS`：`EXISTS k1 k2 …` 只返回**存在个数**，无法映射回具体哪个
   * key 不存在；`MGET` 按位置返回，能精确对应（心跳存的是字符串 key，正好可用）。
   */
  async filterAlive(entries: HitlIndexEntry[]): Promise<HitlIndexEntry[]> {
    if (entries.length === 0) return entries
    const client = await this.readyClient()
    if (!client) return entries
    try {
      const values = await client.mget(...entries.map((e) => aliveKey(e.instanceId)))
      const aliveIds = new Set<string>()
      entries.forEach((e, i) => {
        if (values[i] != null) aliveIds.add(e.instanceId)
      })
      const kept = entries.filter((e) => aliveIds.has(e.instanceId))
      if (kept.length !== entries.length) {
        console.warn(
          `[Hitl][redis] dropped ${entries.length - kept.length} stale pending entries (owner process gone)`
        )
      }
      return kept
    } catch (e) {
      this.noteFailure(e)
      // 心跳查询失败时**保守放行**（宁可尝试投递，也不要把活着的挂起判死）
      return entries
    }
  }

  private dispatchRemote(raw: string): void {
    let msg: HitlDelivery
    try {
      msg = JSON.parse(raw) as HitlDelivery
    } catch {
      console.warn('[Hitl][redis] bad delivery payload')
      return
    }
    this.dispatchLocal(msg)
  }

  private dispatchLocal(msg: HitlDelivery): void {
    for (const handler of this.handlers) {
      try {
        handler(msg)
      } catch (e) {
        console.warn('[Hitl][redis] delivery handler failed:', e)
      }
    }
  }

  // ────────────────────────── 索引读写 ──────────────────────────

  async upsert(entry: HitlIndexEntry): Promise<void> {
    this.warmup()
    const client = await this.readyClient()
    if (!client) return
    try {
      // 🚨 顺序不可颠倒：**先**续心跳，**再**写索引。
      // 反过来的话，别的实例可能先读到索引项、又查不到心跳，从而把活着的挂起误判成
      // 「持有者已死」→ 用户答复被丢弃并收到 404。
      await this.writeHeartbeat(client)
      await client.hset(indexKey(entry.kind), entry.key, JSON.stringify(entry))
    } catch (e) {
      this.noteFailure(e)
    }
  }

  async drop(kind: HitlKind, key: string): Promise<void> {
    const client = await this.readyClient()
    if (!client) return
    try {
      await client.hdel(indexKey(kind), key)
    } catch (e) {
      this.noteFailure(e)
    }
  }

  async claim(kind: HitlKind, key: string): Promise<HitlIndexEntry | null> {
    const client = await this.readyClient()
    if (!client) return null
    try {
      const hashKey = indexKey(kind)
      const raw = await client.hgetall(hashKey)
      const found = raw?.[key]
      if (!found) return null
      // 原子认领：只有一方能删掉这个字段
      const deleted = await client.hdel(hashKey, key)
      if (deleted !== 1) return null
      return JSON.parse(found) as HitlIndexEntry
    } catch (e) {
      this.noteFailure(e)
      return null
    }
  }

  /**
   * 列举未过期索引项。
   *
   * 过期项**懒清理**（随手 HDEL）：Hash 不支持字段级 TTL，而挂起最长也就 5 分钟，
   * 用「读取时按 expiresAt 过滤 + 删除」已经足够 —— 不引入额外的到期清扫任务。
   */
  async list(kind: HitlKind): Promise<HitlIndexEntry[]> {
    const client = await this.readyClient()
    if (!client) return []
    try {
      const hashKey = indexKey(kind)
      const raw = await client.hgetall(hashKey)
      if (!raw) return []
      const now = Date.now()
      const out: HitlIndexEntry[] = []
      const stale: string[] = []
      for (const [key, value] of Object.entries(raw)) {
        try {
          const entry = JSON.parse(value) as HitlIndexEntry
          if (entry.expiresAt <= now) {
            stale.push(key)
            continue
          }
          out.push(entry)
        } catch {
          stale.push(key)
        }
      }
      if (stale.length > 0) {
        client.hdel(hashKey, ...stale).catch(() => { /* 清理失败无妨 */ })
      }
      return out
    } catch (e) {
      this.noteFailure(e)
      return []
    }
  }

  /**
   * 投递：**本地优先**，再发布到通道。
   *
   * 本地优先是必需的 —— 单实例部署（绝大多数情况）下持有者就是自己，
   * 不该为了一个本进程内就能完成的事情多绕一圈网络。
   * 远端发布对「持有者在别的容器」的场景生效；两边都发只会多一次空转。
   */
  deliver(msg: HitlDelivery): void {
    this.dispatchLocal(msg)
    void (async () => {
      const client = await this.readyClient()
      if (!client) return
      try {
        await client.publish(DELIVER_CHANNEL, JSON.stringify(msg))
      } catch (e) {
        this.noteFailure(e)
      }
    })()
  }

  onDeliver(handler: HitlDeliveryHandler): void {
    this.handlers.add(handler)
    this.touchAlive()
  }

  describe() {
    return {
      mode: this.mode,
      ready: this.isReady(),
      subscribed: this.subscribed,
      lastError: this.lastError,
    }
  }

  private async readyClient(): Promise<RedisLike | null> {
    if (!this.subscribed) {
      const ok = await this.ensureConnected()
      if (!ok) return null
    }
    return this.client
  }

  private noteFailure(e: unknown): void {
    this.lastError = e instanceof Error ? e.message : String(e)
    console.warn(`[Hitl][redis] command failed: ${this.lastError}`)
  }
}
