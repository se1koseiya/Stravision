/**
 * 内存版 Redis 假实现（仅测试用）
 *
 * 为什么要它：HITL 传输层的跨实例能力（原子认领 / 心跳过滤 / Pub-Sub 投递 / 连接失败降级）
 * 是本次改造的核心，而这些行为**无法用单元测试直接打到真 Redis**。
 * 这里实现 ioredis 里我们用到的那一小撮命令，语义尽量与 Redis 对齐：
 *   - Hash：HSET / HGETALL / HDEL（HDEL 返回删除个数 → 原子认领的依据）
 *   - String：SET EX（TTL 生效）/ MGET（按位置返回，缺失为 null）
 *   - Pub/Sub：SUBSCRIBE / PUBLISH（进程内多连接模拟多实例）
 *
 * ⚠️ 只做单进程内存模拟：**不保证多进程语义**，但足以覆盖「两个连接 = 两个实例」的代码路径。
 */

import type { RedisLike, RedisLikeFactory } from './redis-transport'

export interface FakeRedisStore {
  hashes: Map<string, Map<string, string>>
  strings: Map<string, { value: string; expiresAt: number }>
  subscribers: Map<string, Set<FakeRedisConnection>>
  /** PUBLISH 被调用的次数（断言「投递确实走了通道」而不是只走了本地派发） */
  publishCount: number
}

export class FakeRedisConnection implements RedisLike {
  status = 'wait'
  private messageHandlers: Array<(...args: unknown[]) => void> = []
  private channels = new Set<string>()

  constructor(
    private readonly store: FakeRedisStore,
    private readonly failConnect = false
  ) {}

  connect(): Promise<void> {
    if (this.failConnect) {
      this.status = 'end'
      return Promise.reject(new Error('fake ECONNREFUSED'))
    }
    this.status = 'ready'
    return Promise.resolve()
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    let hash = this.store.hashes.get(key)
    if (!hash) {
      hash = new Map<string, string>()
      this.store.hashes.set(key, hash)
    }
    const existed = hash.has(field)
    hash.set(field, value)
    return existed ? 0 : 1
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.store.hashes.get(key)
    if (!hash) return {}
    return Object.fromEntries(hash.entries())
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const hash = this.store.hashes.get(key)
    if (!hash) return 0
    let removed = 0
    for (const f of fields) {
      if (hash.delete(f)) removed++
    }
    return removed
  }

  async set(key: string, value: string, ...args: (string | number)[]): Promise<unknown> {
    let expiresAt = Number.POSITIVE_INFINITY
    for (let i = 0; i < args.length; i++) {
      const token = String(args[i]).toUpperCase()
      if (token === 'EX') expiresAt = Date.now() + Number(args[i + 1]) * 1000
      if (token === 'PX') expiresAt = Date.now() + Number(args[i + 1])
    }
    this.store.strings.set(key, { value, expiresAt })
    return 'OK'
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    const now = Date.now()
    return keys.map((k) => {
      const hit = this.store.strings.get(k)
      if (!hit) return null
      if (hit.expiresAt <= now) {
        this.store.strings.delete(k)
        return null
      }
      return hit.value
    })
  }

  async publish(channel: string, message: string): Promise<number> {
    this.store.publishCount++
    const subs = this.store.subscribers.get(channel)
    if (!subs) return 0
    let n = 0
    for (const conn of subs) {
      conn.deliverMessage(channel, message)
      n++
    }
    return n
  }

  subscribe(channel: string): Promise<unknown> {
    this.channels.add(channel)
    let subs = this.store.subscribers.get(channel)
    if (!subs) {
      subs = new Set<FakeRedisConnection>()
      this.store.subscribers.set(channel, subs)
    }
    subs.add(this)
    this.status = 'ready'
    return Promise.resolve(1)
  }

  on(event: string, listener: (...args: unknown[]) => void): unknown {
    if (event === 'message') this.messageHandlers.push(listener)
    // 其它事件（error/connect/ready…）这里不模拟
    return this
  }

  disconnect(): void {
    for (const ch of this.channels) this.store.subscribers.get(ch)?.delete(this)
    this.channels.clear()
    this.status = 'end'
  }

  /** 供 store 回放 pub/sub 消息 */
  deliverMessage(channel: string, message: string): void {
    for (const h of this.messageHandlers) h(channel, message)
  }
}

export function createFakeRedisStore(): FakeRedisStore {
  return {
    hashes: new Map<string, Map<string, string>>(),
    strings: new Map<string, { value: string; expiresAt: number }>(),
    subscribers: new Map<string, Set<FakeRedisConnection>>(),
    publishCount: 0,
  }
}

/** 每个连接都是独立对象（模拟不同实例各自的连接），但共享同一份数据 */
export function createFakeRedisFactory(
  store: FakeRedisStore,
  options: { failConnect?: boolean } = {}
): RedisLikeFactory {
  return () => new FakeRedisConnection(store, options.failConnect)
}
