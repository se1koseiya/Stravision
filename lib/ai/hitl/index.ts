/**
 * HITL 传输层唯一入口
 *
 * 选择规则（唯一判定点，别在别处再写一遍）：
 *   `REDIS_URL` / `VALKEY_URL` 存在且是 redis(s):// → RedisTransport（跨实例）
 *   否则                                          → InProcessTransport（单进程，等价改造前）
 *
 * 单例挂在 globalThis 上：同一进程内的多个 route bundle 必须共用**同一个**
 * transport 实例 —— 否则会建出多条 Pub/Sub 订阅连接、handler 表也会分裂。
 */

import { InProcessTransport } from './in-process-transport'
import { RedisTransport } from './redis-transport'
import type { HitlDeliveryHandler, HitlTransport } from './types'

export * from './types'
export { HITL_INSTANCE_ID } from './instance'

const g = globalThis as unknown as {
  __berryHitlTransport?: HitlTransport
  __berryHitlHandlers?: Set<HitlDeliveryHandler>
}

/** 已注册的投递处理器：绑定在「当前单例」上，并在单例被替换时自动重绑 */
function handlerSet(): Set<HitlDeliveryHandler> {
  if (!g.__berryHitlHandlers) g.__berryHitlHandlers = new Set<HitlDeliveryHandler>()
  return g.__berryHitlHandlers
}

/** 读取 Redis 连接串（兼容多种环境变量命名；部署侧只认 `REDIS_URL`） */
export function resolveHitlRedisUrl(): string | undefined {
  const raw = process.env.REDIS_URL || process.env.VALKEY_URL || process.env.REDIS_URI || ''
  const url = String(raw).trim()
  if (!url) return undefined
  if (!/^rediss?:\/\//i.test(url)) {
    console.warn('[Hitl] REDIS_URL 格式不合法（需以 redis:// 或 rediss:// 开头），回退进程内传输层')
    return undefined
  }
  return url
}

export function getHitlTransport(): HitlTransport {
  if (!g.__berryHitlTransport) {
    const url = resolveHitlRedisUrl()
    g.__berryHitlTransport = url ? new RedisTransport(url) : new InProcessTransport()
    console.log(`[Hitl] transport = ${g.__berryHitlTransport.mode}`)
    for (const handler of handlerSet()) g.__berryHitlTransport.onDeliver(handler)
  }
  return g.__berryHitlTransport
}

/**
 * 注册跨实例投递处理器（各挂起注册表在模块初始化时调用）。
 *
 * 不直接用 `getHitlTransport().onDeliver()` 的原因：单例可能在运行期被替换
 * （测试注入 / 未来切换后端），届时必须把已注册的处理器重绑到新实例上，
 * 否则投递会静默失效。
 */
export function onHitlDelivery(handler: HitlDeliveryHandler): void {
  handlerSet().add(handler)
  getHitlTransport().onDeliver(handler)
}

/** 诊断 / 健康检查：当前挂起传输层的形态与连通性 */
export function describeHitlTransport() {
  return getHitlTransport().describe()
}

/** 测试用：替换单例（已注册的处理器会自动重绑） */
export function __setHitlTransportForTests(transport: HitlTransport | undefined): void {
  g.__berryHitlTransport = transport
  if (transport) {
    for (const handler of handlerSet()) transport.onDeliver(handler)
  }
}
