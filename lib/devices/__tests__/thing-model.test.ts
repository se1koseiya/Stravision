import { describe, expect, it } from 'vitest'
import {
  coercePropertyValue,
  createEmptyThingModel,
  extractPropertyValues,
  normalizeThingModel,
  readPath,
  renderJsonTemplate,
  renderTemplate,
  summarizeThingModel,
  thingModelFromLegacyMetrics,
  validateActionParams,
  validateThingModel,
  type ThingModel,
} from '../thing-model'
import { extractTopicSegments, matchTopic } from '../topic'

describe('thing-model / 路径与模板', () => {
  it('readPath 支持点路径与数组下标', () => {
    const payload = { data: { list: [{ v: 1.5 }, { v: 2.5 }] }, ts: 1 }
    expect(readPath(payload, 'data.list[1].v')).toBe(2.5)
    expect(readPath(payload, 'data.list.0.v')).toBe(1.5)
    expect(readPath(payload, 'data.missing.v')).toBeUndefined()
  })

  it('整模板是占位符时保留原始类型', () => {
    expect(renderTemplate('{{value}}', { value: 23.5 })).toBe(23.5)
    expect(renderTemplate('{{value}}', { value: true })).toBe(true)
    expect(renderTemplate('{{params}}', { params: { a: 1 } })).toEqual({ a: 1 })
  })

  it('混排模板做字符串替换，取不到值留空', () => {
    expect(renderTemplate('dev/{{device.external_id}}/cmd', { device: { external_id: 'A1' } })).toBe('dev/A1/cmd')
    expect(renderTemplate('v={{value}}', { value: 3 })).toBe('v=3')
    expect(renderTemplate('v={{nothing}}', {})).toBe('v=')
  })

  it('renderJsonTemplate 渲染后解析，非法 JSON 抛错', () => {
    expect(renderJsonTemplate('{"power": {{value}}}', { value: true })).toEqual({ power: true })
    expect(() => renderJsonTemplate('{"power": {{value}}', { value: 1 })).toThrow()
  })
})

describe('thing-model / 值归一化', () => {
  it('数值按 scale 换算并保留小数', () => {
    const r = coercePropertyValue(
      { key: 'temperature', name: '温度', dataType: 'number', access: 'r', scale: 10, decimals: 1 },
      235
    )
    expect(r.ok).toBe(true)
    expect(r.numeric).toBeCloseTo(23.5)
    expect(r.value).toBe(23.5)
  })

  it('offset 语义：真实值 = 原始/scale - offset', () => {
    const r = coercePropertyValue(
      { key: 't', name: '温度', dataType: 'number', access: 'r', scale: 1, offset: 40 },
      100
    )
    expect(r.numeric).toBe(60)
  })

  it('布尔接受 0/1、on/off、true/false', () => {
    const prop = { key: 'power', name: '开关', dataType: 'boolean' as const, access: 'rw' as const }
    expect(coercePropertyValue(prop, 1).bool).toBe(true)
    expect(coercePropertyValue(prop, 'off').bool).toBe(false)
    expect(coercePropertyValue(prop, 'true').bool).toBe(true)
    expect(coercePropertyValue(prop, 'maybe').ok).toBe(false)
  })

  it('解包第三方 { value } 包裹', () => {
    const prop = { key: 't', name: '温度', dataType: 'number' as const, access: 'r' as const }
    expect(coercePropertyValue(prop, { value: 21 }).numeric).toBe(21)
  })

  it('缺失字段标记 ok=false 并给出原因', () => {
    const prop = { key: 't', name: '温度', dataType: 'number' as const, access: 'r' as const }
    const r = coercePropertyValue(prop, undefined)
    expect(r.ok).toBe(false)
    expect(r.reason).toBeTruthy()
  })
})

describe('thing-model / 规范化与校验', () => {
  it('兼容旧的 config.metrics 结构', () => {
    const model = thingModelFromLegacyMetrics([
      { key: 'temperature', label: '温度', unit: '°C', mqtt_field: 'temperature', scale: 10 },
    ])
    expect(model.properties).toHaveLength(1)
    expect(model.properties[0].path).toBe('temperature')
    expect(model.properties[0].scale).toBe(10)
  })

  it('属性 key 去重，非法字段被丢弃', () => {
    const model = normalizeThingModel({
      properties: [
        { key: 'a', name: 'A' },
        { key: 'a', name: '重复' },
        { name: '没有 key' },
        { key: 'b', name: 'B', dataType: 'number', access: 'rw' },
      ],
    })
    expect(model.properties.map((p) => p.key)).toEqual(['a', 'b'])
    expect(model.properties[1].access).toBe('rw')
  })

  it('空物模型报错', () => {
    const result = validateThingModel({ schemaVersion: 1, properties: [], actions: [], events: [] })
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.level === 'error')).toBe(true)
  })

  it('非法 key / 量程颠倒 / 枚举缺值都报 error', () => {
    const model: ThingModel = normalizeThingModel({
      properties: [
        { key: '1bad', name: '坏 key', dataType: 'number' },
        { key: 'range', name: '量程', dataType: 'number', min: 10, max: 1 },
        { key: 'mode', name: '模式', dataType: 'enum' },
      ],
    })
    const result = validateThingModel(model)
    expect(result.ok).toBe(false)
    expect(result.issues.filter((i) => i.level === 'error').length).toBeGreaterThanOrEqual(3)
  })

  it('合法物模型通过校验', () => {
    const model = createEmptyThingModel('测试')
    model.actions.push({ key: 'turn_on', name: '开启', params: [] })
    const result = validateThingModel(model)
    expect(result.ok).toBe(true)
  })

  it('summarizeThingModel 输出属性与动作摘要', () => {
    const model: ThingModel = normalizeThingModel({
      properties: [{ key: 'temperature', name: '温度', unit: '°C', dataType: 'number', path: 't' }],
      actions: [{ key: 'turn_on', name: '开启', params: [{ key: 'channel', name: '通道', dataType: 'number', required: true }] }],
    })
    const text = summarizeThingModel(model)
    expect(text).toContain('temperature')
    expect(text).toContain('turn_on')
    expect(text).toContain('channel*')
  })
})

describe('thing-model / 报文字段抽取与动作参数', () => {
  it('extractPropertyValues 按 path 取值并分组缺失项', () => {
    const model = normalizeThingModel({
      properties: [
        { key: 'temperature', name: '温度', dataType: 'number', path: 'data.temp', scale: 10 },
        { key: 'humidity', name: '湿度', dataType: 'number', path: 'data.hum' },
        { key: 'write_only', name: '只写', dataType: 'number', access: 'w', path: 'x' },
      ],
    })
    const { values, missing } = extractPropertyValues(model, { data: { temp: 235 } })
    expect(values.temperature.numeric).toBeCloseTo(23.5)
    expect(missing).toContain('humidity')
    expect(values.write_only).toBeUndefined()
  })

  it('动作参数校验：必填/范围/枚举', () => {
    const action = {
      key: 'set',
      name: '设置',
      params: [
        { key: 'channel', name: '通道', dataType: 'number' as const, required: true, min: 1, max: 4 },
        { key: 'mode', name: '模式', dataType: 'enum' as const, enum: [{ value: 'auto', label: '自动' }] },
      ],
    }
    expect(validateActionParams(action, { channel: 2, mode: 'auto' }).ok).toBe(true)
    expect(validateActionParams(action, { mode: 'auto' }).ok).toBe(false)
    expect(validateActionParams(action, { channel: 9, mode: 'auto' }).ok).toBe(false)
    expect(validateActionParams(action, { channel: 2, mode: 'manual' }).ok).toBe(false)
  })
})

describe('ingest / MQTT topic 匹配', () => {
  it('精确匹配', () => {
    expect(matchTopic('a/b/c', 'a/b/c')).toBe(true)
    expect(matchTopic('a/b/c', 'a/b/d')).toBe(false)
    expect(matchTopic('a/b', 'a/b/c')).toBe(false)
  })

  it('+ 单层与 # 多层通配', () => {
    expect(matchTopic('sensors/+/data', 'sensors/SN1/data')).toBe(true)
    expect(matchTopic('sensors/+/data', 'sensors/SN1/SN2/data')).toBe(false)
    expect(matchTopic('farm/#', 'farm/a/b/c')).toBe(true)
  })

  it('从 pattern 提取通配段', () => {
    expect(extractTopicSegments('sensors/+/data', 'sensors/SN1/data')).toEqual(['SN1'])
    expect(extractTopicSegments('farm/#', 'farm/a/b')).toEqual(['a/b'])
  })
})
