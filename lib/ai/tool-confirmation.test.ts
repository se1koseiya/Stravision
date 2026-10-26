/**
 * 高风险工具「执行前确认」· 契约测试
 *
 * 锁定的三件事（都是"漏了就会出事故"的类型）：
 *   1. 登记表里每个需确认的工具**都有文案** —— 否则确认条上会是一句 "高风险操作"，
 *      用户根本不知道自己在批什么。
 *   2. 裁决令牌是**机器哨兵**，不会把用户手打的自然语言误判成批准 ——
 *      这条通道与 CHECKPOINT / CLARIFY 共用，误判的代价是"不该执行的被执行了"。
 *   3. 文案会被压成**单行短句** —— 胶囊是 whitespace-nowrap 的浮层，超长会撑破版面。
 */

import { describe, it, expect } from 'vitest'

import { CONFIRMATION_REQUIRED_TOOLS } from './agent-budget'
import {
  TOOL_CONFIRM_LABELS,
  TOOL_CONFIRM_APPROVE_REPLY,
  TOOL_CONFIRM_REJECT_REPLY,
  TOOL_CONFIRM_FALLBACK_LABEL,
  isToolConfirmationRequired,
  getToolConfirmLabel,
  describeToolArguments,
  condenseAssistantNote,
  buildToolConfirmText,
  isToolConfirmApproved,
} from './tool-confirmation'

describe('tool-confirmation · 文案覆盖（漏了就问不出人话）', () => {
  it('每个需确认的工具都有短标签', () => {
    for (const name of CONFIRMATION_REQUIRED_TOOLS) {
      expect(TOOL_CONFIRM_LABELS[name], `${name} 缺少确认条文案`).toBeTruthy()
      expect(getToolConfirmLabel(name)).not.toBe(TOOL_CONFIRM_FALLBACK_LABEL)
    }
  })

  it('标签表里没有"已不再需要确认"的僵尸条目', () => {
    for (const name of Object.keys(TOOL_CONFIRM_LABELS)) {
      expect(CONFIRMATION_REQUIRED_TOOLS.has(name), `${name} 已不需要确认，请删掉文案`).toBe(true)
    }
  })

  it('未知工具回落到兜底标签而不是空串', () => {
    expect(getToolConfirmLabel('some_future_tool')).toBe(TOOL_CONFIRM_FALLBACK_LABEL)
  })

  it('isToolConfirmationRequired 与派生集一致', () => {
    expect(isToolConfirmationRequired('toggle_relay')).toBe(true)
    expect(isToolConfirmationRequired('take_camera_snapshot')).toBe(false)
    expect(isToolConfirmationRequired('deep_research')).toBe(false)
  })
})

describe('tool-confirmation · 裁决令牌（误判 = 越权执行）', () => {
  it('只有批准哨兵算批准', () => {
    expect(isToolConfirmApproved(TOOL_CONFIRM_APPROVE_REPLY)).toBe(true)
  })

  it('拒绝哨兵 / 空串不算批准', () => {
    expect(isToolConfirmApproved(TOOL_CONFIRM_REJECT_REPLY)).toBe(false)
    expect(isToolConfirmApproved('')).toBe(false)
  })

  it('用户手打的自然语言不会被误判成批准（哨兵必须与自然语言不重合）', () => {
    for (const text of ['执行', '是', '好', '确认', 'approve', 'yes', 'ok', '可以，开吧']) {
      expect(isToolConfirmApproved(text), `"${text}" 被误判为批准`).toBe(false)
    }
  })

  it('两个哨兵互不相同（复制粘贴改名会撞车）', () => {
    expect(TOOL_CONFIRM_APPROVE_REPLY).not.toBe(TOOL_CONFIRM_REJECT_REPLY)
  })
})

describe('tool-confirmation · 文案压缩（胶囊是单行浮层）', () => {
  it('取最后一段正文，而不是把整段回答都搬上去', () => {
    const raw = '先看一下土壤数据。\n\n土壤湿度 32%，偏干。'
    expect(condenseAssistantNote(raw)).toBe('土壤湿度 32%，偏干。')
  })

  it('剥掉结构化标签与代码块（它们已由各自的渲染器消费）', () => {
    const raw = '好的\n\n<TASK_LIST>{"tasks":[]}</TASK_LIST>\n\n```json\n{"action":"x"}\n```'
    const out = condenseAssistantNote(raw)
    expect(out).not.toContain('TASK_LIST')
    expect(out).not.toContain('{')
  })

  it('超长时截断并加省略号，且不超过上限 + 1', () => {
    const out = condenseAssistantNote('甲'.repeat(200), 40)
    expect(out.length).toBe(41)
    expect(out.endsWith('…')).toBe(true)
  })

  it('空输入返回空串（不抛错）', () => {
    expect(condenseAssistantNote('')).toBe('')
    expect(condenseAssistantNote(undefined as unknown as string)).toBe('')
  })

  it('压平换行与多余空格', () => {
    expect(condenseAssistantNote('  开灯  \n\n  马上', 40)).toBe('马上')
  })
})

describe('tool-confirmation · 参数摘要（AI 没给说明时的兜底）', () => {
  it('toggle_relay 区分开启/关闭并带上设备名', () => {
    expect(describeToolArguments('toggle_relay', { device: '1号水泵', value: true })).toBe('开启「1号水泵」继电器')
    expect(describeToolArguments('toggle_relay', { device: '1号水泵', value: false })).toBe('关闭「1号水泵」继电器')
  })

  it('set_led / control_camera / delete_device 各自说人话', () => {
    expect(describeToolArguments('set_led', { r: 255, g: 0, b: 0 })).toContain('rgb(255, 0, 0)')
    expect(describeToolArguments('control_camera', { direction: 'left', pulses: 3 })).toContain('left')
    expect(describeToolArguments('delete_device', { device_name: '旧传感器' })).toBe('删除设备「旧传感器」')
  })

  it('未知工具 / 空参数不抛错，回落到标签', () => {
    expect(describeToolArguments('some_future_tool', {})).toBe(TOOL_CONFIRM_FALLBACK_LABEL)
    expect(describeToolArguments('toggle_relay', null)).toBe('关闭继电器')
  })

  it('参数摘要里不出现整坨 JSON（会撑破胶囊）', () => {
    const out = describeToolArguments('delete_device', { device_name: 'X', nested: { a: [1, 2] } })
    expect(out).not.toContain('{')
  })
})

describe('tool-confirmation · 最终文案拼装', () => {
  it('优先用 AI 自己的说明（用户要求"询问文案交给 AI 控制"）', () => {
    const out = buildToolConfirmText('toggle_relay', { device: '1号水泵', value: true }, '马上开启 1 号水泵给草莓补水')
    expect(out).toBe('设备启停 · 马上开启 1 号水泵给草莓补水')
  })

  it('AI 没给说明时回落到参数摘要', () => {
    const out = buildToolConfirmText('toggle_relay', { device: '1号水泵', value: true }, '')
    expect(out).toBe('设备启停 · 开启「1号水泵」继电器')
  })

  it('给的是结构化标签时同样回落（标签不该出现在确认条上）', () => {
    const out = buildToolConfirmText('delete_device', { device_name: '旧传感器' }, '<TASK_LIST>{"tasks":[]}</TASK_LIST>')
    expect(out).toBe('删除设备 · 「旧传感器」')
  })

  it('参数摘要与短标签重复时不复读（实测 delete_device + device_id=0）', () => {
    expect(buildToolConfirmText('delete_device', { device_id: 0 }, '')).toBe('删除设备')
  })

  it('最终文案长度可控（标签 + 40 字说明 + 分隔符）', () => {
    const out = buildToolConfirmText('automation_canvas_apply', {}, '甲'.repeat(200))
    expect(out.length).toBeLessThanOrEqual('应用自动化画布 · '.length + 41)
  })
})
