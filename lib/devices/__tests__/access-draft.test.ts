import { describe, expect, it } from 'vitest'
import { parseAccessDraft } from '../access-draft'

/**
 * 接入草稿解析契约
 *
 * 这一层是「模型输出」与「向导表单」之间的唯一闸门：
 *   · 放得太松 → 残缺草稿灌进表单，用户对着一半空白不知道缺什么；
 *   · 收得太紧 → 模型稍一用词不同就被拒，AI 反复重试把对话拖死。
 * 所以这里既锁「该收的收得下」，也锁「该拒的必须说清原因」。
 */

const base = {
  device: {
    name: 'A 区温湿度',
    external_id: 'SN-001',
    thing_model: {
      properties: [
        { key: 'temperature', name: '温度', dataType: 'number', unit: '°C', access: 'r', path: 'data.temp', scale: 10 },
        { key: 'humidity', name: '湿度', dataType: 'number', unit: '%', access: 'r' },
      ],
      actions: [],
    },
  },
}

describe('parseAccessDraft', () => {
  it('最小可用草稿：收下并归一化物模型', () => {
    const { draft, issues } = parseAccessDraft(base)
    expect(issues).toEqual([])
    expect(draft?.device.name).toBe('A 区温湿度')
    expect(draft?.device.external_id).toBe('SN-001')
    expect(draft?.device.thing_model.properties).toHaveLength(2)
    expect(draft?.device.thing_model.properties[0].path).toBe('data.temp')
    expect(draft?.device.thing_model.properties[0].scale).toBe(10)
    expect(draft?.source).toBe('copilot')
  })

  it('缺设备名 → 拒收并说明', () => {
    const { draft, issues } = parseAccessDraft({ device: { thing_model: base.device.thing_model } })
    expect(draft).toBeNull()
    expect(issues.join()).toContain('设备名称')
  })

  it('没有属性 → 拒收（不知道要采集什么就别接）', () => {
    const { draft, issues } = parseAccessDraft({ device: { name: 'x', thing_model: { properties: [] } } })
    expect(draft).toBeNull()
    expect(issues.join()).toContain('没有任何属性')
  })

  it('兼容「properties 直接给对象映射」的简化写法', () => {
    const { draft } = parseAccessDraft({
      device: {
        name: '土壤',
        thing_model: { properties: { moisture: { name: '含水率', dataType: 'number', access: 'r' } } },
      },
    })
    expect(draft?.device.thing_model.properties.map((p) => p.key)).toContain('moisture')
  })

  it('兼容「thing_model 直接给属性数组」', () => {
    const { draft } = parseAccessDraft({
      device: { name: '开关', thing_model: [{ key: 'power', name: '开关', dataType: 'boolean', access: 'rw' }] },
    })
    expect(draft?.device.thing_model.properties[0].key).toBe('power')
  })

  it('未知协议 → 拒收并列出支持的协议', () => {
    const { draft, issues } = parseAccessDraft({
      ...base,
      connection: { name: '老网关', protocol: 'zigbee' },
    })
    expect(draft).toBeNull()
    expect(issues.join()).toContain('mqtt / http / modbus_tcp')
  })

  it('新建连接缺名字/协议 → 拒收', () => {
    const { issues } = parseAccessDraft({ ...base, connection: { config: { url: 'mqtt://x' } } })
    expect(issues.join()).toContain('connection.name')
    expect(issues.join()).toContain('connection.protocol')
  })

  it('复用已有连接：只给 id 就够，config 原样保留', () => {
    const { draft, issues } = parseAccessDraft({
      ...base,
      connection: { id: 7, protocol: 'mqtt', config: { url: 'mqtt://b:1883', port: '1883' } },
    })
    expect(issues).toEqual([])
    expect(draft?.connection?.id).toBe(7)
    expect(draft?.connection?.config?.port).toBe('1883')
  })

  it('枚举属性缺可选值 → 拒收（否则前端只能显示一个空下拉）', () => {
    const { draft, issues } = parseAccessDraft({
      device: {
        name: '模式开关',
        thing_model: { properties: [{ key: 'mode', name: '模式', dataType: 'enum', access: 'rw' }] },
      },
    })
    expect(draft).toBeNull()
    expect(issues.join()).toContain('枚举')
  })

  it('非法属性标识 → 拒收', () => {
    const { issues } = parseAccessDraft({
      device: {
        name: 'x',
        thing_model: { properties: [{ key: '温度值', name: '温度', dataType: 'number', access: 'r' }] },
      },
    })
    expect(issues.join()).toContain('非法')
  })

  it('notes / missing 去空、去重；非文本项直接丢弃', () => {
    const { draft } = parseAccessDraft({
      ...base,
      notes: ['温湿度常用 MQTT', '  ', '温湿度常用 MQTT', 123],
      missing: ['MQTT 密码'],
    })
    // 123 这类非文本项没有展示价值 —— 丢掉比渲染成「123」更干净
    expect(draft?.notes).toEqual(['温湿度常用 MQTT'])
    expect(draft?.missing).toEqual(['MQTT 密码'])
  })

  it('非对象输入 → 拒收而不是抛异常', () => {
    expect(parseAccessDraft(null).draft).toBeNull()
    expect(parseAccessDraft('随便一句话').draft).toBeNull()
    expect(parseAccessDraft(undefined).issues.length).toBeGreaterThan(0)
  })
})
