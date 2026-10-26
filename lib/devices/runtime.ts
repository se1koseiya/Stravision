/**
 * 常驻运行时：MQTT 订阅 + HTTP 轮询
 *
 * Next 的 API 路由是短生命周期的，而「设备随时可能上报」需要长驻监听。
 * 这里用 globalThis 单例承载连接与定时器（与 lib/mqtt-service.ts 同样的做法），
 * 由 ensureDeviceRuntime() 在任意接入相关请求/启动钩子里幂等触发。
 *
 * 约束：
 * - 只在 Node runtime 生效（Edge 里没有 net / mqtt）
 * - 每个连接的下发与订阅复用同一条 MQTT client（见 protocols/mqtt.ts 的连接池）
 * - 任何异常都只记录，不抛出 —— 后台监听不能把请求打挂
 */

import { listGenericDevices, listConnections, getConnection } from './service'
import { acquireClient, dropClient } from './protocols/mqtt'
import { buildUrl, authHeaders, guardUrl, parseHeaders } from './protocols/http'
import { fetchWithTimeout, cfgNum, cfgStr } from './protocols/types'
import type { ConnectionRecord, GenericDeviceRecord } from './protocols/types'
import { ingestPayload, matchTopic, resolveInboundTopic } from './ingest'

interface RuntimeState {
  started: boolean
  syncing: Promise<void> | null
  /** connectionId → 已订阅的 topic 集合 */
  subscribed: Map<number, Set<string>>
  /** deviceId → 轮询定时器 */
  pollers: Map<number, ReturnType<typeof setInterval>>
  /** deviceId → 轮询签名（间隔/路径/连接版本变化时重建定时器） */
  pollerSignatures: Map<number, string>
  /** connectionId → 设备列表缓存（避免每条消息查库） */
  deviceCache: Map<number, { at: number; devices: GenericDeviceRecord[] }>
  /** 已挂过 message 监听的 client，防重复注册 */
  wired: WeakSet<object>
  lastSyncAt: number
}

function state(): RuntimeState {
  const g = globalThis as unknown as { __berryDeviceRuntime?: RuntimeState }
  if (!g.__berryDeviceRuntime) {
    g.__berryDeviceRuntime = {
      started: false,
      syncing: null,
      subscribed: new Map(),
      pollers: new Map(),
      pollerSignatures: new Map(),
      deviceCache: new Map(),
      wired: new WeakSet(),
      lastSyncAt: 0,
    }
  }
  return g.__berryDeviceRuntime
}

const DEVICE_CACHE_TTL = 5000

async function devicesOf(connectionId: number): Promise<GenericDeviceRecord[]> {
  const st = state()
  const cached = st.deviceCache.get(connectionId)
  if (cached && Date.now() - cached.at < DEVICE_CACHE_TTL) return cached.devices
  const devices = await listGenericDevices(connectionId)
  st.deviceCache.set(connectionId, { at: Date.now(), devices })
  return devices
}

/** 清缓存（设备增删改后调用） */
export function invalidateDeviceCache(connectionId?: number): void {
  const st = state()
  if (connectionId === undefined) st.deviceCache.clear()
  else st.deviceCache.delete(connectionId)
}

/** 处理一条 MQTT 上行消息 */
async function handleMqttMessage(connection: ConnectionRecord, topic: string, text: string): Promise<void> {
  const devices = await devicesOf(connection.id)
  if (devices.length === 0) return

  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    payload = { value: text }
  }

  for (const device of devices) {
    if (!device.is_enabled) continue
    const pattern = resolveInboundTopic(device)
    if (!pattern) continue
    if (!matchTopic(pattern, topic)) continue

    // 通配 topic（sensors/+/data）需要再按 external_id 分流，避免 A 设备的数据落到 B 设备
    if (pattern.includes('+') && device.external_id) {
      const segments = pattern.split('/')
      const actual = topic.split('/')
      const wildcardValues = segments
        .map((seg, i) => (seg === '+' ? actual[i] : null))
        .filter((v): v is string => v !== null)
      const hit = wildcardValues.some((v) => v === device.external_id)
      if (!hit) continue
    }

    try {
      const result = await ingestPayload(device, payload)
      if (!result.ok) {
        console.warn(`[Devices] 设备 ${device.name}(${device.id}) 上报未入库：${result.error}`)
      }
    } catch (e) {
      console.error(`[Devices] 设备 ${device.id} 入库失败:`, e)
    }
    // 精确 topic 只可能对应一台设备，命中即结束；通配 topic 继续遍历
    if (!pattern.includes('+') && !pattern.includes('#')) break
  }
}

function wireClient(connection: ConnectionRecord, client: import('mqtt').MqttClient): void {
  const st = state()
  if (st.wired.has(client)) return
  st.wired.add(client)
  client.on('message', (topic: string, payload: Buffer) => {
    handleMqttMessage(connection, topic, payload.toString()).catch((e) =>
      console.error('[Devices] MQTT 消息处理异常:', e)
    )
  })
}

async function syncMqttConnection(connection: ConnectionRecord): Promise<void> {
  const st = state()
  const devices = await devicesOf(connection.id)
  const topics = Array.from(
    new Set(
      devices
        .filter((d) => d.is_enabled)
        .map((d) => resolveInboundTopic(d))
        .filter((t) => t.length > 0)
    )
  )
  if (topics.length === 0) {
    dropDeviceRuntime(connection.id)
    return
  }
  try {
    const { client, ready } = acquireClient(connection)
    await ready
    wireClient(connection, client)
    const already = st.subscribed.get(connection.id) || new Set<string>()
    const fresh = topics.filter((t) => !already.has(t))
    if (fresh.length > 0) {
      await new Promise<void>((resolve, reject) => {
        client.subscribe(fresh, { qos: 0 }, (err) => (err ? reject(err) : resolve()))
      })
      for (const t of fresh) already.add(t)
      st.subscribed.set(connection.id, already)
    }
  } catch (e) {
    console.warn(`[Devices] MQTT 连接「${connection.name}」订阅失败:`, e instanceof Error ? e.message : e)
  }
}

async function pollOnce(connection: ConnectionRecord, device: GenericDeviceRecord, pollPath: string): Promise<void> {
  const baseUrl = cfgStr(connection.config, 'baseUrl').trim()
  if (!baseUrl) return
  const rendered = pollPath
    .replace(/\{\{\s*device\.external_id\s*\}\}/g, device.external_id || String(device.id))
    .replace(/\{\{\s*device\.id\s*\}\}/g, String(device.id))
  const url = buildUrl(baseUrl, rendered)
  const blocked = await guardUrl(url, connection, false)
  if (blocked) {
    console.warn(`[Devices] 轮询被拦截（${device.name}）：${blocked}`)
    return
  }
  const timeout = cfgNum(connection.config, 'timeoutMs', 8000, 1000, 30000)
  try {
    const res = await fetchWithTimeout(
      url,
      { method: 'GET', headers: { Accept: 'application/json', ...parseHeaders(connection.config.headers), ...authHeaders(connection) } },
      timeout
    )
    if (!res.ok) return
    const payload = await res.json()
    await ingestPayload(device, payload)
  } catch (e) {
    console.warn(`[Devices] 轮询 ${device.name} 失败:`, e instanceof Error ? e.message : e)
  }
}

async function syncPollers(): Promise<void> {
  const st = state()
  const connections = (await listConnections()).filter(
    (c) => c.is_enabled && c.protocol === 'http' && cfgStr(c.config, 'pollPath').trim().length > 0
  )
  const wanted = new Map<number, { connection: ConnectionRecord; device: GenericDeviceRecord; pollPath: string; interval: number; signature: string }>()

  for (const connection of connections) {
    const pollPath = cfgStr(connection.config, 'pollPath').trim()
    const interval = Math.max(10, cfgNum(connection.config, 'pollIntervalSec', 60, 10, 86400)) * 1000
    const devices = await devicesOf(connection.id)
    for (const device of devices) {
      if (!device.is_enabled) continue
      // 不支持占位符的固定路径只能对应一台设备，多设备时跳过（避免把同一份数据重复写给多台）
      if (!/\{\{/.test(pollPath) && devices.length > 1) continue
      wanted.set(device.id, {
        connection,
        device,
        pollPath,
        interval,
        signature: `${interval}|${pollPath}|${connection.updated_at}`,
      })
    }
  }

  // 移除不再需要的 / 配置已变化的
  for (const [deviceId, timer] of st.pollers) {
    const next = wanted.get(deviceId)
    const currentSig = st.pollerSignatures.get(deviceId)
    if (!next || next.signature !== currentSig) {
      clearInterval(timer)
      st.pollers.delete(deviceId)
      st.pollerSignatures.delete(deviceId)
    }
  }
  // 新增缺失的
  for (const [deviceId, item] of wanted) {
    if (st.pollers.has(deviceId)) continue
    const timer = setInterval(() => {
      void pollOnce(item.connection, item.device, item.pollPath)
    }, item.interval)
    // 首次延迟 3s 执行，避开启动高峰
    setTimeout(() => { void pollOnce(item.connection, item.device, item.pollPath) }, 3000)
    st.pollers.set(deviceId, timer)
    st.pollerSignatures.set(deviceId, item.signature)
  }
}

/** 幂等同步：把数据库里的连接/设备映射成实际的监听与定时器 */
export async function syncDeviceRuntime(): Promise<void> {
  const st = state()
  if (st.syncing) return st.syncing
  // 30s 内已同步过就直接返回：配置变更由 forceResync() 显式触发，
  // 避免每个 API 请求都做一遍全表扫描
  if (st.started && Date.now() - st.lastSyncAt < 30_000) return
  st.syncing = (async () => {
    try {
      const connections = (await listConnections()).filter((c) => c.is_enabled && c.protocol === 'mqtt')
      const activeIds = new Set(connections.map((c) => c.id))
      // 关掉/删掉的连接要释放
      for (const id of Array.from(st.subscribed.keys())) {
        if (!activeIds.has(id)) dropDeviceRuntime(id)
      }
      for (const connection of connections) {
        await syncMqttConnection(connection)
      }
      await syncPollers()
      st.started = true
      st.lastSyncAt = Date.now()
    } catch (e) {
      console.error('[Devices] 运行时同步失败:', e)
    } finally {
      st.syncing = null
    }
  })()
  return st.syncing
}

/** 释放某个连接占用的资源（连接被停用/删除时调用） */
export function dropDeviceRuntime(connectionId: number): void {
  const st = state()
  dropClient(connectionId)
  st.subscribed.delete(connectionId)
  st.deviceCache.delete(connectionId)
  // 轮询定时器按设备挂，需反查设备归属
  void (async () => {
    try {
      const devices = await listGenericDevices(connectionId)
      for (const d of devices) {
        const timer = st.pollers.get(d.id)
        if (timer) {
          clearInterval(timer)
          st.pollers.delete(d.id)
        }
      }
    } catch { /* 忽略 */ }
  })()
}

/** 供状态接口展示 */
export function getRuntimeStatus(): { started: boolean; mqttConnections: number; pollers: number; lastSyncAt: number } {
  const st = state()
  return {
    started: st.started,
    mqttConnections: st.subscribed.size,
    pollers: st.pollers.size,
    lastSyncAt: st.lastSyncAt,
  }
}

/** 手动触发一次同步（连接/设备变更后由 API 调用） */
export async function forceResync(): Promise<void> {
  const st = state()
  invalidateDeviceCache()
  st.lastSyncAt = 0
  await syncDeviceRuntime()
}

/** 重新取单个连接（供轮询任务在配置变更后刷新） */
export async function refreshConnection(connectionId: number): Promise<ConnectionRecord | null> {
  const conn = await getConnection(connectionId)
  invalidateDeviceCache(connectionId)
  return conn
}
