/**
 * 响应过滤器测试
 *
 * 这些函数此前深埋在 3141 行的 route.ts 里没有任何测试，
 * 却是 9 处「🔥 Bug 修复」注释中最密集的区域。
 * 抽出后按行为逐条锁定：
 * - 裸 TASK_LIST JSON 必须拦截，带标签的必须保留
 * - schedule_task / 自动化策略 JSON 绝不能被误删（曾因此丢过用户配置）
 * - 旧版设备指令要能提取、去重、参数校验
 */

import { describe, it, expect } from 'vitest'

import {
  filterBareTaskListJson,
  extractDeviceActionsFromResponse,
  extractLegacyDeviceControlCalls,
  sanitizeLegacyDeviceControlMessages
} from '../response-filters'

describe('filterBareTaskListJson', () => {
  it('普通文本原样通过', () => {
    const text = '今天土壤湿度 65%，建议明早灌溉。'
    expect(filterBareTaskListJson(text)).toBe(text)
  })

  it('裸露的完整 TASK_LIST JSON 被移除', () => {
    const text = '好的，任务列表如下 {"status":"in_progress","tasks":[{"id":"t1","content":"浇水"}]} 请确认'
    const out = filterBareTaskListJson(text)
    expect(out).not.toContain('"tasks"')
    expect(out).toContain('好的')
    expect(out).toContain('请确认')
  })

  it('包裹在 <TASK_LIST> 标签内的 JSON 保留', () => {
    const text = '<TASK_LIST>{"status":"in_progress","tasks":[{"id":"t1"}]}</TASK_LIST>'
    expect(filterBareTaskListJson(text)).toBe(text)
  })

  it('累积内容已处于 TASK_LIST 块内时不拦截当前 chunk', () => {
    const acc = '前文 <TASK_LIST>{"status"'
    const chunk = ':"in_progress","tasks":[...]}'
    expect(filterBareTaskListJson(chunk, acc)).toBe(chunk)
  })

  it('流式输出中不完整的 TASK_LIST 片段被截断', () => {
    const text = '分析完成 {"status":"in_progress","tasks":[{"id":"t1","con'
    const out = filterBareTaskListJson(text)
    expect(out).not.toContain('"in_progress"')
  })

  it('schedule_task JSON 代码块不被误删（曾因此丢过用户配置）', () => {
    const text = [
      '创建定时任务：',
      '```json',
      '{"action":"schedule_task","name":"浇水","schedule":"0 8 * * *"}',
      '```'
    ].join('\n')
    expect(filterBareTaskListJson(text)).toBe(text)
  })

  it('自动化策略 JSON（nodes/edges）不被误删', () => {
    const text = [
      '策略如下：',
      '```json',
      '{"nodes":[{"type":"triggerNode"}],"edges":[]}',
      '```'
    ].join('\n')
    expect(filterBareTaskListJson(text)).toBe(text)
  })

  it('空内容直接返回', () => {
    expect(filterBareTaskListJson('')).toBe('')
  })
})

describe('extractDeviceActionsFromResponse', () => {
  it('提取继电器范围（5-8）内的 toggle_relay 动作', () => {
    const text = '{"action":"toggle_relay","device":6,"value":1}'
    const actions = extractDeviceActionsFromResponse(text)
    expect(actions).toHaveLength(1)
    expect(actions[0].deviceId).toBe(6)
    expect(actions[0].success).toBe(true)
  })

  it('忽略继电器范围外的设备（1-4）', () => {
    const text = '{"action":"toggle_relay","device":2,"value":1}'
    expect(extractDeviceActionsFromResponse(text)).toHaveLength(0)
  })

  it('无匹配时返回空数组', () => {
    expect(extractDeviceActionsFromResponse('没有动作')).toHaveLength(0)
  })
})

describe('extractLegacyDeviceControlCalls', () => {
  it('从 ```json 代码块提取 toggle_relay', () => {
    const text = '好的\n```json\n{"action":"toggle_relay","device":5,"value":1}\n```'
    const calls = extractLegacyDeviceControlCalls(text)
    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe('toggle_relay')
    expect(calls[0].arguments.value).toBe(1)
  })

  it('从裸露内联 JSON 提取', () => {
    const text = '执行 {"action":"toggle_relay","device":7,"value":0} 完成'
    const calls = extractLegacyDeviceControlCalls(text)
    expect(calls).toHaveLength(1)
    expect(calls[0].arguments.value).toBe(0)
  })

  it('相同动作与参数去重', () => {
    const text = [
      '{"action":"toggle_relay","device":5,"value":1}',
      '{"action":"toggle_relay","device":5,"value":1}'
    ].join('\n')
    expect(extractLegacyDeviceControlCalls(text)).toHaveLength(1)
  })

  it('toggle_relay 的 value 非 0/1 时跳过', () => {
    const text = '{"action":"toggle_relay","device":5,"value":2}'
    expect(extractLegacyDeviceControlCalls(text)).toHaveLength(0)
  })

  it('toggle_relay 无有效设备标识时跳过', () => {
    const text = '{"action":"toggle_relay","value":1}'
    expect(extractLegacyDeviceControlCalls(text)).toHaveLength(0)
  })

  it('set_led 校验 RGB 范围', () => {
    const ok = extractLegacyDeviceControlCalls('{"action":"set_led","r":255,"g":0,"b":0}')
    expect(ok).toHaveLength(1)
    const bad = extractLegacyDeviceControlCalls('{"action":"set_led","r":300,"g":0,"b":0}')
    expect(bad).toHaveLength(0)
  })

  it('control_camera 校验方向并透传行程', () => {
    const calls = extractLegacyDeviceControlCalls('{"action":"control_camera","direction":1,"distance_mm":350}')
    expect(calls).toHaveLength(1)
    expect(calls[0].arguments.distance_mm).toBe(350)
    const bad = extractLegacyDeviceControlCalls('{"action":"control_camera","direction":9}')
    expect(bad).toHaveLength(0)
  })

  it('文本不含 "action" 时快速返回空', () => {
    expect(extractLegacyDeviceControlCalls('普通回复')).toHaveLength(0)
  })
})

describe('sanitizeLegacyDeviceControlMessages', () => {
  it('assistant 消息中的旧版指令代码块被替换为中性描述', () => {
    const messages = [
      { role: 'user', content: '开灯' },
      { role: 'assistant', content: '好的\n```json\n{"action":"set_led","r":255,"g":255,"b":255}\n```' }
    ]
    const out = sanitizeLegacyDeviceControlMessages(messages)
    expect(out[1].content).not.toContain('"action"')
    expect(out[1].content).toContain('设备控制指令')
  })

  it('user 消息与无 action 的消息原样保留', () => {
    const messages = [
      { role: 'user', content: '{"action":"toggle_relay"} 这是用户引用的文本' },
      { role: 'assistant', content: '普通回复' }
    ]
    const out = sanitizeLegacyDeviceControlMessages(messages)
    expect(out[0].content).toBe(messages[0].content)
    expect(out[1].content).toBe(messages[1].content)
  })

  it('非字符串 content（如多模态数组）原样保留', () => {
    const messages = [{ role: 'assistant', content: [{ type: 'text', text: '带图回复' }] }]
    expect(sanitizeLegacyDeviceControlMessages(messages)[0].content).toBe(messages[0].content)
  })
})
