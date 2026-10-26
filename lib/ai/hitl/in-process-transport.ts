/**
 * 进程内 HITL 传输层（默认实现）
 *
 * 适用：未配置 `REDIS_URL` / Redis 连接不可用 / 桌面端（本地单进程）——
 * 此时语义与改造前的 `globalThis` 注册表**完全等价**，不引入任何新依赖与新接口。
 *
 * 索引仍然挂在 globalThis 上：这样 `/api/chat` 与 `/api/chat/respond` 两个
 * bundle（同进程）能共享同一份索引 —— 与本地 waiter 共享方式一致。
 */

import type { HitlDelivery, HitlDeliveryHandler, HitlIndexEntry, HitlKind, HitlTransport } from './types'

interface InProcessIndexGlobal {
  index: Map<string, Map<string, HitlIndexEntry>>
  handlers: Set<HitlDeliveryHandler>
}

const g = globalThis as unknown as { __berryHitlInProcess?: InProcessIndexGlobal }
if (!g.__berryHitlInProcess) {
  g.__berryHitlInProcess = {
    index: new Map<string, Map<string, HitlIndexEntry>>(),
    handlers: new Set<HitlDeliveryHandler>(),
  }
}

const store = g.__berryHitlInProcess

function bucket(kind: HitlKind): Map<string, HitlIndexEntry> {
  let b = store.index.get(kind)
  if (!b) {
    b = new Map<string, HitlIndexEntry>()
    store.index.set(kind, b)
  }
  return b
}

export class InProcessTransport implements HitlTransport {
  readonly mode = 'in-process' as const

  isReady(): boolean {
    return true
  }

  async upsert(entry: HitlIndexEntry): Promise<void> {
    bucket(entry.kind).set(entry.key, entry)
  }

  async drop(kind: HitlKind, key: string): Promise<void> {
    bucket(kind).delete(key)
  }

  async claim(kind: HitlKind, key: string): Promise<HitlIndexEntry | null> {
    const b = bucket(kind)
    const entry = b.get(key)
    if (!entry) return null
    b.delete(key)
    return entry
  }

  async list(kind: HitlKind): Promise<HitlIndexEntry[]> {
    const now = Date.now()
    const out: HitlIndexEntry[] = []
    const b = bucket(kind)
    for (const [key, entry] of b.entries()) {
      if (entry.expiresAt <= now) {
        b.delete(key)
        continue
      }
      out.push(entry)
    }
    return out
  }

  /** 进程内不存在「持有者在别的进程」的情况 → 无需过滤 */
  async filterAlive(entries: HitlIndexEntry[]): Promise<HitlIndexEntry[]> {
    return entries
  }

  touchAlive(): void {
    /* 进程内无需心跳 */
  }

  /**
   * 进程内投递 = 直接调用处理器。
   *
   * 注意：这里**不判断** key/instanceId 是否属于本进程 —— 过滤由各 facade 的
   * 处理器自己完成（它才持有本地 waiter 表）。语义与 Redis 模式保持一致。
   */
  deliver(msg: HitlDelivery): void {
    for (const handler of store.handlers) {
      try {
        handler(msg)
      } catch (e) {
        console.warn('[Hitl][in-process] delivery handler failed:', e)
      }
    }
  }

  onDeliver(handler: HitlDeliveryHandler): void {
    store.handlers.add(handler)
  }

  describe() {
    return { mode: this.mode, ready: true, subscribed: true }
  }
}

/** 测试用：清空索引（waiter 由各 facade 自己复位） */
export function __resetInProcessIndexForTests(): void {
  store.index.clear()
}
