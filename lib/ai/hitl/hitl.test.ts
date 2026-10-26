/**
 * HITL 传输层测试（跨实例挂起的底座）
 *
 * 覆盖四类不变量：
 *  1. 索引读写与**原子认领**（HDEL 语义）—— 并发下只能有一方消费掉挂起
 *  2. 心跳过滤 —— 持有者进程已死的索引项必须被剔除（否则就是「假成功」）
 *  3. 跨实例投递 —— A 实例 deliver → B 实例的处理器收到（走 Pub/Sub，不是本地派发）
 *  4. 降级 —— Redis 连不上时所有方法安全空转，绝不抛错、绝不阻塞主流程
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RedisTransport } from './redis-transport'
import { InProcessTransport, __resetInProcessIndexForTests } from './in-process-transport'
import { createFakeRedisStore, createFakeRedisFactory } from './fake-redis'
import { HITL_INSTANCE_ID } from './instance'
import type { HitlDelivery, HitlIndexEntry } from './types'

function entry(overrides: Partial<HitlIndexEntry> = {}): HitlIndexEntry {
  const now = Date.now()
  return {
    kind: 'user-input',
    key: 'session-4-1',
    instanceId: 'i-test',
    sessionId: 'session-4-1',
    userId: 4,
    checkpointId: 'cp-1',
    createdAt: now,
    expiresAt: now + 60_000,
    ...overrides,
  }
}

describe('InProcessTransport', () => {
  beforeEach(() => {
    __resetInProcessIndexForTests()
  })

  it('upsert → list → claim：认领后不可再次认领（原子性）', async () => {
    const t = new InProcessTransport()
    await t.upsert(entry())
    expect(await t.list('user-input')).toHaveLength(1)

    const first = await t.claim('user-input', 'session-4-1')
    expect(first?.checkpointId).toBe('cp-1')
    // 第二次认领必须拿不到（否则「谁赢」就不唯一了）
    expect(await t.claim('user-input', 'session-4-1')).toBeNull()
  })

  it('过期条目在 list 时被剔除（Hash 无字段级 TTL 的替代方案）', async () => {
    const t = new InProcessTransport()
    await t.upsert(entry({ key: 'session-4-stale', sessionId: 'session-4-stale', expiresAt: Date.now() - 1 }))
    await t.upsert(entry({ key: 'session-4-live', sessionId: 'session-4-live' }))
    const list = await t.list('user-input')
    expect(list.map((e) => e.key)).toEqual(['session-4-live'])
  })

  it('kind 隔离：user-input 的索引不会出现在 client-tool 里', async () => {
    const t = new InProcessTransport()
    await t.upsert(entry())
    expect(await t.list('client-tool')).toHaveLength(0)
  })
})

describe('RedisTransport（内存假 Redis）', () => {
  it('索引落在 Redis，认领是原子的（HDEL 只成功一次）', async () => {
    const store = createFakeRedisStore()
    const t = new RedisTransport('redis://fake:6379', createFakeRedisFactory(store))
    await t.upsert(entry())
    expect(t.isReady()).toBe(true)

    expect(await t.list('user-input')).toHaveLength(1)
    const first = await t.claim('user-input', 'session-4-1')
    expect(first?.instanceId).toBe('i-test')
    expect(await t.claim('user-input', 'session-4-1')).toBeNull()
    expect(await t.list('user-input')).toHaveLength(0)
  })

  it('upsert 会同时写「实例心跳」；心跳缺失的条目在 filterAlive 中被剔除', async () => {
    const store = createFakeRedisStore()
    const t = new RedisTransport('redis://fake:6379', createFakeRedisFactory(store))

    await t.upsert(entry({ key: 'session-4-live', sessionId: 'session-4-live', instanceId: 'i-live' }))
    // upsert 必须连带写下**本实例**的心跳（顺序：先心跳、后索引）
    expect(store.strings.has(`berry:hitl:alive:${HITL_INSTANCE_ID}`)).toBe(true)

    // 正在等的实例：心跳在 → 条目必须保留
    store.strings.set('berry:hitl:alive:i-live', { value: '1', expiresAt: Date.now() + 20_000 })
    // 进程已崩的实例（索引残留到过期为止，但没有心跳）
    await t.upsert(entry({ key: 'session-4-dead', sessionId: 'session-4-dead', instanceId: 'i-dead' }))

    const alive = await t.filterAlive(await t.list('user-input'))
    expect(alive.map((e) => e.key)).toEqual(['session-4-live'])
  })

  it('跨实例投递：A 的 deliver 经 Pub/Sub 到达 B（不是本地派发）', async () => {
    const store = createFakeRedisStore()
    const factory = createFakeRedisFactory(store)
    const a = new RedisTransport('redis://fake:6379', factory)
    const b = new RedisTransport('redis://fake:6379', factory)

    const atA: HitlDelivery[] = []
    const atB: HitlDelivery[] = []
    a.onDeliver((m) => atA.push(m))
    b.onDeliver((m) => atB.push(m))

    // 先让两个实例都完成连接 + 订阅（订阅必须先于 publish 建立）
    await a.upsert(entry())
    await b.upsert(entry({ key: 'session-4-b-warmup', sessionId: 'session-4-b-warmup' }))

    a.deliver({
      kind: 'user-input',
      key: 'session-4-1',
      instanceId: 'i-b',
      action: 'resolve',
      reply: '确认',
    })

    expect(atA).toHaveLength(1) // 本地优先派发（同步发生）
    // publish 是「尽力而为」的异步动作 → 等通道回放
    await vi.waitFor(() => expect(atB).toHaveLength(1))
    expect(atB[0].reply).toBe('确认')
    expect(store.publishCount).toBeGreaterThan(0) // 确实走了 Pub/Sub
  })

  it('Redis 连不上时全部安全降级（isReady=false，方法不抛错）', async () => {
    const store = createFakeRedisStore()
    const t = new RedisTransport(
      'redis://fake:6379',
      createFakeRedisFactory(store, { failConnect: true })
    )

    await expect(t.upsert(entry())).resolves.toBeUndefined()
    await expect(t.drop('user-input', 'session-4-1')).resolves.toBeUndefined()
    expect(await t.claim('user-input', 'session-4-1')).toBeNull()
    expect(await t.list('user-input')).toEqual([])
    expect(await t.filterAlive([entry()])).toHaveLength(1) // 查不到心跳 → 保守放行
    expect(() => t.deliver({ kind: 'user-input', key: 'k', instanceId: 'i', action: 'cancel', reason: 'x' })).not.toThrow()

    expect(t.isReady()).toBe(false)
    expect(t.describe().mode).toBe('redis')
    expect(t.describe().lastError).toContain('ECONNREFUSED')
  })
})
