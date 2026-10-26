/**
 * 上行归一化：设备报文 → 标准属性值
 *
 * 三条上行通路（HTTP 推送 / HTTP 轮询 / MQTT 订阅）最后都收口到这里，
 * 保证「不管设备怎么说话，落库的都是同一套 property_key + 数值」。
 */

import type { GenericDeviceRecord } from './protocols/types'
import { extractPropertyValues, readPath, renderTemplate, type ThingModel } from './thing-model'
import { savePropertyValues, type PropertyValueInput } from './service'

export interface IngestValueView {
  key: string
  name: string
  unit?: string
  value: number | string | boolean | null
  display: string
  ok: boolean
  reason?: string
}

export interface IngestResult {
  ok: boolean
  deviceId: number
  accepted: number
  missing: string[]
  values: IngestValueView[]
  error?: string
}

/** 把设备记录转成模板上下文（topic/url/body 模板通用） */
export function deviceTemplateVars(device: GenericDeviceRecord): Record<string, unknown> {
  return {
    device: {
      id: device.id,
      name: device.name,
      external_id: device.external_id,
      externalId: device.external_id,
      category: device.category,
      type: device.type,
    },
    deviceId: device.id,
    deviceName: device.name,
    externalId: device.external_id,
  }
}

/** 渲染设备的上行 topic 模板（MQTT 场景） */
export function resolveInboundTopic(device: GenericDeviceRecord): string {
  if (!device.subscribe_topic) return ''
  const rendered = renderTemplate(device.subscribe_topic, deviceTemplateVars(device))
  return typeof rendered === 'string' ? rendered : ''
}

/**
 * MQTT topic 通配符匹配与分段提取（纯函数实现见 ./topic.ts，这里再导出以保持调用方简单）
 */
export { matchTopic, extractTopicSegments } from './topic'

/** 在 payload 中按 external_id_path 取设备外部 ID（配置在连接 config 里，可选） */
export function extractExternalIdFromPayload(payload: unknown, path: string | undefined): string | null {
  if (!path) return null
  const v = readPath(payload, path)
  if (v === undefined || v === null) return null
  return String(v)
}

function displayValue(value: number | string | boolean | null, prop: { unit?: string; decimals?: number }): string {
  if (value === null) return '—'
  if (typeof value === 'boolean') return value ? '开' : '关'
  if (typeof value === 'number') {
    const text = prop.decimals !== undefined ? value.toFixed(prop.decimals) : String(value)
    return prop.unit ? `${text} ${prop.unit}` : text
  }
  return String(value)
}

/**
 * 归一化 + 落库。
 *
 * @param device 通用设备记录（thing_model 必须是规范后的 ThingModel）
 * @param payload 设备上报报文（已 JSON.parse）
 */
export async function ingestPayload(
  device: GenericDeviceRecord,
  payload: unknown
): Promise<IngestResult> {
  const model = device.thing_model as ThingModel
  if (!model || !Array.isArray(model.properties) || model.properties.length === 0) {
    return {
      ok: false,
      deviceId: device.id,
      accepted: 0,
      missing: [],
      values: [],
      error: '设备还没有定义任何属性（物模型为空），无法映射上报数据',
    }
  }

  const { values, missing } = extractPropertyValues(model, payload)
  const rows: PropertyValueInput[] = []
  const views: IngestValueView[] = []

  for (const prop of model.properties) {
    if (prop.access === 'w') continue
    const coerced = values[prop.key]
    if (!coerced) continue
    if (coerced.ok) {
      rows.push({
        key: prop.key,
        valueNum: coerced.numeric,
        valueText: coerced.text,
        valueBool: coerced.bool,
        quality: 'good',
      })
    }
    views.push({
      key: prop.key,
      name: prop.name,
      unit: prop.unit,
      value: coerced.value,
      display: displayValue(coerced.value, prop),
      ok: coerced.ok,
      reason: coerced.reason,
    })
  }

  if (rows.length === 0) {
    return {
      ok: false,
      deviceId: device.id,
      accepted: 0,
      missing,
      values: views,
      error: `上报报文里没有任何字段能对上物模型（缺失：${missing.slice(0, 6).join('、') || '全部'}）`,
    }
  }

  await savePropertyValues(device.id, rows, payload)
  return { ok: true, deviceId: device.id, accepted: rows.length, missing, values: views }
}

/** 便捷方法：设备 + 原始字符串（HTTP 入口用，自动 JSON.parse 并给出可读错误） */
export async function ingestRaw(
  device: GenericDeviceRecord,
  raw: string
): Promise<IngestResult> {
  const text = (raw || '').trim()
  if (!text) {
    return { ok: false, deviceId: device.id, accepted: 0, missing: [], values: [], error: '上报报文为空' }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // 兼容表单/纯文本上报：包成 { value: "..." }
    parsed = { value: text }
  }
  return ingestPayload(device, parsed)
}
