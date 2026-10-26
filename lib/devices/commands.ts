/**
 * 下行指令执行：动作 / 可写属性 → 协议适配器
 *
 * 唯一入口，页面、API、AI 工具都走这里，避免「网页能控、AI 控不了」这类分叉。
 */

import { initDB, execute } from '@/lib/db/database'
import { getConnection, getGenericDevice } from './service'
import { getAdapter } from './protocols'
import type { ConnectionRecord, GenericDeviceRecord } from './protocols/types'
import {
  readPath,
  renderTemplate,
  validateActionParams,
  type ThingAction,
  type ThingModel,
  type ThingProperty,
  type TransportSpec,
} from './thing-model'
import { deviceTemplateVars } from './ingest'

export interface ExecutionResult {
  ok: boolean
  deviceId: number
  /** 'action' | 'property' */
  kind: 'action' | 'property'
  target: string
  request?: Record<string, unknown>
  response?: unknown
  error?: string
  durationMs?: number
  /** 参数/配置层面的问题（不是网络错误） */
  issues?: string[]
}

function renderString(tpl: string | undefined, vars: Record<string, unknown>): string | undefined {
  if (tpl === undefined || tpl === null || tpl === '') return undefined
  const rendered = renderTemplate(tpl, vars)
  if (rendered === undefined || rendered === null) return undefined
  if (typeof rendered === 'string') return rendered
  return JSON.stringify(rendered)
}

function renderHeaders(headers: Record<string, string> | undefined, vars: Record<string, unknown>): Record<string, string> | undefined {
  if (!headers) return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) out[k] = String(renderTemplate(v, vars) ?? '')
  return out
}

/** 动作没配下发通道时的兜底报文：单参数直出该参数，多参数直出对象 */
function fallbackPayload(action: ThingAction | null, vars: Record<string, unknown>): string | undefined {
  if (action && action.params.length > 0) {
    if (action.params.length === 1) {
      const only = action.params[0]
      const v = readPath(vars, `params.${only.key}`)
      return JSON.stringify({ [only.key]: v ?? null })
    }
    return JSON.stringify(vars.params ?? {})
  }
  const v = readPath(vars, 'value')
  if (v === undefined) return undefined
  return JSON.stringify({ value: v })
}

function mergeSpec(base: TransportSpec | undefined, device: GenericDeviceRecord): TransportSpec {
  const spec: TransportSpec = { ...(base || {}) }
  if (!spec.topic && device.publish_topic) spec.topic = device.publish_topic
  return spec
}

async function logAction(deviceName: string, action: string, operator: string, details: string) {
  try {
    await initDB()
    await execute(
      `INSERT INTO device_logs (device_name, action, operator, details, created_at) VALUES ($1,$2,$3,$4,$5)`,
      [deviceName, action, operator, details, Date.now()]
    )
  } catch (e) {
    console.error('[Devices] log action failed:', e)
  }
}

interface PreparedCommand {
  adapter: ReturnType<typeof getAdapter>
  connection: ConnectionRecord
  spec: TransportSpec
  vars: Record<string, unknown>
  protocol: string
}

function prepare(
  device: GenericDeviceRecord,
  connection: ConnectionRecord,
  baseSpec: TransportSpec | undefined,
  vars: Record<string, unknown>
): { prepared?: PreparedCommand; error?: string } {
  const spec = mergeSpec(baseSpec, device)
  const protocol = spec.protocol || device.protocol || connection.protocol
  const adapter = getAdapter(protocol)
  if (!adapter) return { error: `不支持的协议：${protocol}` }
  if (!adapter.meta.outbound) return { error: `${adapter.meta.name} 协议不支持下发指令` }
  return { prepared: { adapter, connection, spec, vars, protocol } }
}

/** 执行一个动作（如 turn_on / set_brightness） */
export async function executeDeviceAction(
  deviceId: number,
  actionKey: string,
  params: Record<string, unknown> | undefined,
  operator = 'system'
): Promise<ExecutionResult> {
  const base: ExecutionResult = { ok: false, deviceId, kind: 'action', target: actionKey }
  const device = await getGenericDevice(deviceId)
  if (!device) return { ...base, error: '设备不存在或不是通用接入设备' }
  if (!device.is_enabled) return { ...base, error: '设备已停用' }
  if (!device.connection_id) return { ...base, error: '设备没有绑定接入连接' }

  const connection = await getConnection(device.connection_id)
  if (!connection) return { ...base, error: '接入连接不存在' }
  if (!connection.is_enabled) return { ...base, error: `接入连接「${connection.name}」已停用` }

  const model = device.thing_model as ThingModel
  const action = model.actions.find((a) => a.key === actionKey) || null

  // 动作未在物模型里声明 → 允许「按可写属性下发」（兼容快速接入）
  const prop = !action ? model.properties.find((p) => p.key === actionKey && p.access !== 'r') : null
  if (!action && !prop) {
    return { ...base, error: `设备「${device.name}」没有名为 ${actionKey} 的动作或可写属性` }
  }

  let normalized: Record<string, unknown> = params || {}
  if (action) {
    const check = validateActionParams(action, params)
    if (!check.ok) return { ...base, error: check.errors.join('；'), issues: check.errors }
    normalized = check.normalized
  } else if (prop) {
    const raw = params?.value ?? params?.[prop.key]
    if (raw === undefined) return { ...base, error: `写入属性 ${prop.key} 需要提供 value` }
    normalized = { value: raw }
  }

  const vars: Record<string, unknown> = {
    ...deviceTemplateVars(device),
    params: normalized,
    value: normalized.value ?? (action && action.params.length === 1 ? normalized[action.params[0].key] : undefined),
    conn: { id: connection.id, name: connection.name },
  }

  const { prepared, error } = prepare(device, connection, action?.transport || prop?.write, vars)
  if (!prepared) {
    await logAction(device.name, actionKey, operator, `下发失败：${error}`)
    return { ...base, error }
  }

  // 渲染模板（topic / url / payload / headers）
  const spec: TransportSpec = {
    ...prepared.spec,
    topic: renderString(prepared.spec.topic, vars),
    url: renderString(prepared.spec.url, vars),
    headers: renderHeaders(prepared.spec.headers, vars),
  }
  if (!spec.payload && !spec.body) {
    spec.payload = fallbackPayload(action, vars)
  } else {
    if (spec.payload) spec.payload = renderString(spec.payload, vars)
    if (spec.body) spec.body = renderString(spec.body, vars)
  }

  try {
    const result = await prepared.adapter!.send({
      connection,
      device,
      spec,
      vars,
    })
    const ok = result.ok
    await logAction(
      device.name,
      actionKey,
      operator,
      ok
        ? `${prepared.protocol} 下发成功${result.durationMs !== undefined ? `（${result.durationMs}ms）` : ''}`
        : `下发失败：${result.error || '未知错误'}`
    )
    return {
      ok,
      deviceId,
      kind: 'action',
      target: actionKey,
      request: result.request,
      response: result.response,
      error: result.error,
      durationMs: result.durationMs,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await logAction(device.name, actionKey, operator, `下发异常：${msg}`)
    return { ...base, error: msg }
  }
}

/** 写一个可写属性（本质是只有一个 value 参数的动作） */
export async function writeDeviceProperty(
  deviceId: number,
  propertyKey: string,
  value: unknown,
  operator = 'system'
): Promise<ExecutionResult> {
  const device = await getGenericDevice(deviceId)
  if (!device) return { ok: false, deviceId, kind: 'property', target: propertyKey, error: '设备不存在' }
  const model = device.thing_model as ThingModel
  const prop: ThingProperty | undefined = model.properties.find((p) => p.key === propertyKey)
  if (!prop) return { ok: false, deviceId, kind: 'property', target: propertyKey, error: `没有属性 ${propertyKey}` }
  if (prop.access === 'r') {
    return { ok: false, deviceId, kind: 'property', target: propertyKey, error: `属性「${prop.name}」是只读的` }
  }
  if (prop.dataType === 'number') {
    const n = Number(value)
    if (!Number.isFinite(n)) return { ok: false, deviceId, kind: 'property', target: propertyKey, error: '值必须是数字' }
    if (prop.min !== undefined && n < prop.min) return { ok: false, deviceId, kind: 'property', target: propertyKey, error: `不能小于 ${prop.min}` }
    if (prop.max !== undefined && n > prop.max) return { ok: false, deviceId, kind: 'property', target: propertyKey, error: `不能大于 ${prop.max}` }
    value = n
  }
  const res = await executeDeviceAction(deviceId, propertyKey, { value }, operator)
  return { ...res, kind: 'property', target: propertyKey }
}

/** 供 UI 展示「这台设备能做什么」 */
export function describeCapabilities(model: ThingModel): {
  properties: Array<{ key: string; name: string; writable: boolean; unit?: string }>
  actions: Array<{ key: string; name: string; params: ThingAction['params'] }>
} {
  return {
    properties: model.properties.map((p) => ({ key: p.key, name: p.name, writable: p.access !== 'r', unit: p.unit })),
    actions: model.actions.map((a) => ({ key: a.key, name: a.name, params: a.params })),
  }
}
