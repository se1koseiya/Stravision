/**
 * MQTT 协议适配器
 *
 * 与内置专属链路的区别：内置链路只有一个 broker（环境变量 MQTT_HOST），
 * 且 topic/报文格式写死在 lib/mqtt-service.ts；这里每个「接入连接」独立一套
 * broker + 凭证 + 报文模板，可以同时接 N 家第三方 MQTT 平台。
 *
 * 连接复用：同一连接的下发与订阅共用一条 client（Map<connectionId, client>），
 * 缓存在 globalThis 上，避免 Next dev 热重载后残留一堆僵尸连接。
 */

import mqtt from 'mqtt'
import type {
  ConnectionRecord,
  ProtocolAdapter,
  ProtocolMeta,
  SendContext,
  SendResult,
  TestResult,
} from './types'
import { cfgBool, cfgNum, cfgStr } from './types'

export const MQTT_META: ProtocolMeta = {
  id: 'mqtt',
  name: 'MQTT',
  summary: '订阅设备上报 topic、向控制 topic 发布指令。适合自建 broker、EMQX、第三方物联网平台。',
  inbound: true,
  outbound: true,
  inboundHint: '平台保持长连接并订阅设备的「上报 topic」；设备侧向该 topic publish 即可',
  fields: [
    { key: 'url', label: 'Broker 地址', type: 'text', required: true, placeholder: 'mqtt://broker.example.com:1883 或 mqtts://...:8883', help: '支持 mqtt:// mqtts:// ws:// wss://' },
    { key: 'useTLS', label: '启用 TLS', type: 'boolean', default: false, help: '用 mqtts:// 时通常需要开启' },
    { key: 'clientIdPrefix', label: 'Client ID 前缀', type: 'text', placeholder: 'berry', advanced: true, help: '留空则用 berry-<连接ID>，避免与设备端 clientId 冲突' },
    { key: 'username', label: '用户名', type: 'text', secret: true },
    { key: 'password', label: '密码', type: 'password', secret: true },
    { key: 'qos', label: '下发 QoS', type: 'select', default: '1', advanced: true, options: [{ label: '0 最多一次', value: '0' }, { label: '1 至少一次', value: '1' }, { label: '2 恰好一次', value: '2' }] },
    { key: 'timeoutMs', label: '超时（毫秒）', type: 'number', default: 8000, advanced: true },
  ],
}

interface PooledClient {
  client: mqtt.MqttClient
  key: string
  ready: Promise<void>
}

function poolStore(): Map<number, PooledClient> {
  const g = globalThis as unknown as { __berryMqttPool?: Map<number, PooledClient> }
  if (!g.__berryMqttPool) g.__berryMqttPool = new Map()
  return g.__berryMqttPool
}

function connectionKey(connection: ConnectionRecord): string {
  return JSON.stringify({
    url: cfgStr(connection.config, 'url'),
    tls: cfgBool(connection.config, 'useTLS'),
    u: connection.secrets?.username ?? '',
    p: connection.secrets?.password ?? '',
    id: connection.id,
  })
}

/** 拿到（必要时建立）该连接的长连接 client；失败抛错 */
export function acquireClient(connection: ConnectionRecord): { client: mqtt.MqttClient; ready: Promise<void> } {
  const pool = poolStore()
  const key = connectionKey(connection)
  const existing = pool.get(connection.id)
  if (existing && existing.key === key && !existing.client.disconnected) {
    return { client: existing.client, ready: existing.ready }
  }
  if (existing) {
    try { existing.client.end(true) } catch { /* 忽略 */ }
    pool.delete(connection.id)
  }

  const rawUrl = cfgStr(connection.config, 'url').trim()
  if (!rawUrl) throw new Error('MQTT 连接缺少 broker 地址')
  const url = normalizeUrl(rawUrl, cfgBool(connection.config, 'useTLS'))
  const username = typeof connection.secrets?.username === 'string' ? (connection.secrets.username as string) : undefined
  const password = typeof connection.secrets?.password === 'string' ? (connection.secrets.password as string) : undefined
  const prefix = cfgStr(connection.config, 'clientIdPrefix', 'berry')
  const timeoutMs = cfgNum(connection.config, 'timeoutMs', 8000, 1000, 30000)

  const client = mqtt.connect(url, {
    username,
    password,
    clientId: `${prefix}-${connection.id}-${Math.random().toString(16).slice(2, 8)}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: timeoutMs,
    rejectUnauthorized: false,
  })

  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`连接 MQTT 超时（${timeoutMs}ms）`)), timeoutMs)
    client.once('connect', () => {
      clearTimeout(timer)
      resolve()
    })
    client.once('error', (err) => {
      clearTimeout(timer)
      reject(err instanceof Error ? err : new Error(String(err)))
    })
  })
  // 避免未处理的 rejection 冒到进程级（调用方仍会 await 到）
  ready.catch(() => { /* noop */ })
  client.on('error', () => { /* 常驻错误已在 ready / send 中处理，这里防止 EventEmitter 抛未捕获 */ })

  const entry: PooledClient = { client, key, ready }
  pool.set(connection.id, entry)
  return { client, ready }
}

export function dropClient(connectionId: number): void {
  const pool = poolStore()
  const entry = pool.get(connectionId)
  if (entry) {
    try { entry.client.end(true) } catch { /* 忽略 */ }
    pool.delete(connectionId)
  }
}

function normalizeUrl(raw: string, useTLS: boolean): string {
  let url = raw.trim()
  if (!/^[a-z]+:\/\//i.test(url)) url = `${useTLS ? 'mqtts' : 'mqtt'}://${url}`
  if (useTLS && url.startsWith('mqtt://')) url = url.replace('mqtt://', 'mqtts://')
  return url
}

const adapter: ProtocolAdapter = {
  meta: MQTT_META,

  validate(config, secrets) {
    const errors: string[] = []
    const url = cfgStr(config, 'url').trim()
    if (!url) errors.push('Broker 地址必填（如 mqtt://192.168.1.10:1883）')
    else if (!/^([a-z]+:\/\/)?[\w.\-:[\]]+(\/\S*)?$/i.test(url)) errors.push('Broker 地址格式不对')
    const qos = cfgStr(config, 'qos', '1')
    if (!['0', '1', '2'].includes(qos)) errors.push('QoS 只能是 0 / 1 / 2')
    const hasUser = typeof secrets.username === 'string' && secrets.username !== ''
    const hasPass = typeof secrets.password === 'string' && secrets.password !== ''
    if (hasUser !== hasPass) errors.push('用户名与密码需要同时填写（或都不填）')
    return errors
  },

  async test(connection): Promise<TestResult> {
    const started = Date.now()
    const { client, ready } = acquireClient(connection)
    try {
      await ready
      return {
        ok: true,
        detail: `已连接 ${cfgStr(connection.config, 'url')}（${Date.now() - started}ms）`,
        extra: { connected: client.connected },
      }
    } catch (e) {
      dropClient(connection.id)
      return { ok: false, detail: e instanceof Error ? e.message : String(e) }
    }
  },

  async send(ctx: SendContext): Promise<SendResult> {
    const started = Date.now()
    const topic = String(ctx.spec.topic || '').trim()
    if (!topic) {
      return { ok: false, error: '该动作没有配置 MQTT 下行 topic' }
    }
    if (/\{\{/.test(topic)) {
      return { ok: false, error: `下行 topic 里还有未替换的占位符：${topic}` }
    }
    const qos = cfgNum(ctx.connection.config, 'qos', 1, 0, 2) as 0 | 1 | 2
    const payload = ctx.spec.payload === undefined ? JSON.stringify(ctx.vars.params ?? ctx.vars) : ctx.spec.payload

    try {
      const { client, ready } = acquireClient(ctx.connection)
      await ready
      await new Promise<void>((resolve, reject) => {
        client.publish(topic, payload, { qos }, (err) => (err ? reject(err) : resolve()))
      })
      return {
        ok: true,
        request: { protocol: 'mqtt', topic, qos, payload },
        response: 'published',
        durationMs: Date.now() - started,
      }
    } catch (e) {
      dropClient(ctx.connection.id)
      return {
        ok: false,
        request: { protocol: 'mqtt', topic, qos, payload },
        error: e instanceof Error ? e.message : String(e),
        durationMs: Date.now() - started,
      }
    }
  },
}

export default adapter
