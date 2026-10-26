/**
 * 上下文工程层 · 单测
 *
 * 这些函数此前在 route.ts 里要么不存在（无预算/无截断），
 * 要么与文件耦合到无法测试（压缩逻辑内联在 3544 行里）。
 * 抽出来后按行为锁定关键性质：
 *   - token 估算：单调、稳定、能剥离 base64
 *   - 预算：小窗口不派出负数、总份额不超过输入预算
 *   - 装配：identity 段永不截断、超预算段会降级
 *   - 工具结果：分级阈值准确、截断后仍保留关键字段
 *   - 历史压缩：阈值随窗口自适应、近段原文保留、实体信息能进摘要
 */

import { describe, it, expect } from 'vitest'

import {
  estimateContextTokens,
  estimateMessagesTokens,
  stripBinaryPayload,
} from '../token-estimator'
import {
  buildContextBudget,
  getInputBudget,
  getTierBudget,
  resolveModelWindow,
  truncateToBudget,
} from '../budget'
import { buildContext } from '../context-builder'
import { compactToolResult, COMPACTION_THRESHOLDS } from '../tool-result-compactor'
import {
  planCompression,
  normalizeSummary,
  extractPastMemory,
  buildCompressedMessages,
  stringifyMessages,
} from '../history-compressor'

describe('estimateContextTokens', () => {
  it('空输入为 0', () => {
    expect(estimateContextTokens('')).toBe(0)
    expect(estimateContextTokens(null)).toBe(0)
    expect(estimateContextTokens(undefined)).toBe(0)
  })

  it('中文按约 1 字 1 token', () => {
    const t = estimateContextTokens('今天土壤湿度百分之六十五')
    expect(t).toBeGreaterThan(10)
    expect(t).toBeLessThan(16)
  })

  it('文本变长 token 必增（单调性）', () => {
    const a = estimateContextTokens('温度')
    const b = estimateContextTokens('温度温度温度温度')
    expect(b).toBeGreaterThan(a)
  })

  it('同一文本多次调用结果稳定', () => {
    const s = '草莓灰霉病防治：保持通风、降低湿度。'
    expect(estimateContextTokens(s)).toBe(estimateContextTokens(s))
  })

  it('dataURL 被剥离，不计入爆炸性 token', () => {
    const b64 = 'A'.repeat(5000)
    const text = `已抓图 data:image/png;base64,${b64}`
    const tokens = estimateContextTokens(text)
    // 若未剥离，5000 字符会算成 ~1400 token；剥离后应远小于此
    expect(tokens).toBeLessThan(100)
  })

  it('stripBinaryPayload 把「大小写混合」的裸 base64 换成占位', () => {
    const realB64 = Buffer.from('x'.repeat(600)).toString('base64')
    const out = stripBinaryPayload(`image: ${realB64}`)
    expect(out).toContain('<bin:')
    expect(out).not.toContain(realB64)
  })

  it('纯重复字符（合法文本）不会被误判成 base64 —— 修复过 50000 A → 4 token 的失真', () => {
    const repeated = 'A'.repeat(50_000)
    expect(stripBinaryPayload(repeated)).toBe(repeated)
    // 50k latin 字符 ≈ 14000 token，绝不能是 4
    expect(estimateContextTokens(repeated)).toBeGreaterThan(10_000)
  })
})

describe('estimateMessagesTokens', () => {
  it('跳过 image_url 的 base64 本体', () => {
    const msgs = [
      {
        role: 'user',
        content: [
          { type: 'text', text: '看看这张图' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${'A'.repeat(8000)}` } },
        ],
      },
    ]
    // 只该算上文字部分
    expect(estimateMessagesTokens(msgs)).toBeLessThan(50)
  })

  it('计入 tool_calls 参数', () => {
    const msgs = [{ role: 'assistant', content: '', tool_calls: [{ function: { name: 'toggle_relay', arguments: '{"device":5,"value":1}' } }] }]
    expect(estimateMessagesTokens(msgs)).toBeGreaterThan(10)
  })
})

describe('resolveModelWindow / budget', () => {
  it('识别常见模型窗口', () => {
    expect(resolveModelWindow('deepseek-v3.2')).toBe(128_000)
    expect(resolveModelWindow('qwen3.8-flash')).toBe(128_000)
    expect(resolveModelWindow('gpt-4')).toBe(8_192)
  })

  it('未知模型回退到保守窗口', () => {
    expect(resolveModelWindow('some-unknown-model')).toBe(32_000)
    expect(resolveModelWindow(undefined)).toBe(32_000)
  })

  it('输入预算 = 窗口 − 输出预留 − 安全余量', () => {
    const budget = buildContextBudget('deepseek-v3.2')
    const input = getInputBudget(budget)
    expect(input).toBeLessThan(budget.windowTokens)
    expect(input).toBeGreaterThan(0)
  })

  it('小窗口也不派出负数或过小预算', () => {
    const budget = buildContextBudget('gpt-4')
    expect(getInputBudget(budget)).toBeGreaterThan(1_000)
  })

  it('各段位预算之和不超过输入预算', () => {
    const budget = buildContextBudget('deepseek-v3.2')
    const input = getInputBudget(budget)
    const sum =
      getTierBudget(budget, 'identity') +
      getTierBudget(budget, 'pinned') +
      getTierBudget(budget, 'working') +
      getTierBudget(budget, 'history')
    expect(sum).toBeLessThanOrEqual(input)
  })
})

describe('truncateToBudget', () => {
  it('未超预算时原样返回', () => {
    const { text, truncated } = truncateToBudget('短文本', 100)
    expect(truncated).toBe(false)
    expect(text).toBe('短文本')
  })

  it('超预算时按行截断并标注省略', () => {
    const text = Array.from({ length: 200 }, (_, i) => `第 ${i} 行内容`).join('\n')
    const { text: out, truncated } = truncateToBudget(text, 50)
    expect(truncated).toBe(true)
    expect(out).toContain('已截断')
    expect(estimateContextTokens(out)).toBeLessThanOrEqual(80)
  })

  it('单行超长时按字符硬截', () => {
    const text = 'A'.repeat(50_000)
    const { text: out, truncated } = truncateToBudget(text, 100)
    expect(truncated).toBe(true)
    expect(estimateContextTokens(out)).toBeLessThanOrEqual(150)
  })
})

describe('buildContext', () => {
  it('空段被丢弃，产出干净的 systemPrompt', () => {
    const ctx = buildContext({ basePrompt: '你是助手', skill: '', memory: undefined })
    expect(ctx.systemPrompt).toBe('你是助手')
    expect(ctx.sections).toHaveLength(1)
  })

  it('段落顺序：identity 在前，volatile 在最后', () => {
    const ctx = buildContext({
      basePrompt: 'BASE',
      persona: 'PERSONA',
      memory: 'MEMORY',
      skill: 'SKILL',
      envSnapshot: 'ENV',
      forcedTool: 'FORCED',
    })
    const ids = ctx.sections.map((s) => s.id)
    expect(ids.indexOf('persona')).toBeLessThan(ids.indexOf('base-prompt'))
    expect(ids.indexOf('memory')).toBeLessThan(ids.indexOf('skill'))
    expect(ids[ids.length - 1]).toBe('forced-tool')
  })

  it('段位用量被正确汇总', () => {
    const ctx = buildContext({ basePrompt: '你是助手', memory: '用户叫小朱', skill: '技能文档' })
    expect(ctx.tierUsage.identity).toBeGreaterThan(0)
    expect(ctx.tierUsage.pinned).toBeGreaterThan(0)
    expect(ctx.tierUsage.working).toBeGreaterThan(0)
    expect(ctx.totalTokens).toBeGreaterThan(0)
  })

  it('identity 段即便超预算也不被截断', () => {
    const hugeBase = '规则'.repeat(20_000)
    const ctx = buildContext({ basePrompt: hugeBase, modelId: 'gpt-4' })
    const base = ctx.sections.find((s) => s.id === 'base-prompt')
    expect(base?.content).toBe(hugeBase)
    expect(ctx.truncatedSections).not.toContain('base-prompt')
  })

  it('超预算的 working 段会被降级', () => {
    const hugeSkill = Array.from({ length: 3000 }, (_, i) => `技能条目 ${i}`).join('\n')
    const ctx = buildContext({ basePrompt: '你是助手', skill: hugeSkill, modelId: 'gpt-4' })
    expect(ctx.truncatedSections).toContain('skill')
    expect(ctx.truncated).toBe(true)
  })
})

describe('compactToolResult', () => {
  it('小结果原样保留', () => {
    const data = { success: true, message: '设备已开启' }
    const r = compactToolResult(data, { toolName: 'toggle_relay' })
    expect(r.level).toBe('none')
    expect(r.compacted).toBe(false)
  })

  it('中等结果保留结构骨架并折叠数组', () => {
    const data = {
      success: true,
      items: Array.from({ length: 200 }, (_, i) => ({ id: i, name: `记录 ${i}`, desc: 'x'.repeat(60) })),
    }
    const r = compactToolResult(data, { toolName: 'get_sensor_history' })
    expect(r.compacted).toBe(true)
    expect(r.afterTokens).toBeLessThan(r.beforeTokens)
    const content = r.content as { items: { count: number; items: unknown[] } }
    // 骨架保留：既能知道总数，也能看到前几项
    expect(content.items.count).toBe(200)
    expect(Array.isArray(content.items.items)).toBe(true)
  })

  it('超大结果只留摘要与关键字段', () => {
    const data = {
      success: true,
      summary: '返回 7 天历史数据',
      count: 5000,
      rows: Array.from({ length: 5000 }, (_, i) => ({ t: i, v: 'x'.repeat(50) })),
    }
    const r = compactToolResult(data, { toolName: 'get_sensor_history' })
    expect(['summary', 'pointer']).toContain(r.level)
    const content = r.content as { summary?: string }
    expect(content.summary).toBe('返回 7 天历史数据')
    // 长数组必须被折叠，不能原样保留
    expect(JSON.stringify(content).length).toBeLessThan(2000)
  })

  it('失败结果保留 error 字段', () => {
    const data = { success: false, error: '设备离线，无法执行' }
    const r = compactToolResult(data, { toolName: 'control_camera' })
    expect(JSON.stringify(r.content)).toContain('设备离线')
  })

  it('分级阈值边界：刚好超 tiny 触发结构级', () => {
    // 构造略超 tiny 阈值的内容（latin 约 0.28 token/字符 → 需 ~6k 字符）
    const data = { success: true, blob: 'x'.repeat(COMPACTION_THRESHOLDS.tiny * 5) }
    expect(estimateContextTokens(data)).toBeGreaterThan(COMPACTION_THRESHOLDS.tiny)
    const r = compactToolResult(data, { toolName: 'test_tool' })
    expect(r.compacted).toBe(true)
  })

  it('剥离 base64 后的图片元数据不会被误判为超大结果', () => {
    const data = { success: true, summary: '已抓取 1 张图片', image: `data:image/png;base64,${'AqBcDeFg'.repeat(4000)}` }
    const r = compactToolResult(data, { toolName: 'take_camera_snapshot' })
    // base64 不参与估算 → 不该被判定为超大
    expect(r.level).toBe('none')
  })
})

describe('planCompression', () => {
  const mkMessages = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: `消息 ${i} 内容` }))

  it('历史很短时不触发压缩', () => {
    const plan = planCompression(mkMessages(4), 'deepseek-v3.2')
    expect(plan.needed).toBe(false)
  })

  it('历史超阈值时触发，且近段原文保留', () => {
    const long = Array.from({ length: 60 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: '这是一段很长的历史对话内容用来撑大 token 占用。'.repeat(20),
    }))
    const plan = planCompression(long, 'gpt-4')
    expect(plan.needed).toBe(true)
    expect(plan.recent).toHaveLength(6)
    expect(plan.recent[plan.recent.length - 1]).toEqual(long[long.length - 1])
    expect(plan.toCompress.length).toBe(long.length - 6)
  })

  it('阈值随模型窗口自适应：小窗口更容易触发', () => {
    const messages = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: '中等长度的历史内容。'.repeat(15),
    }))
    const small = planCompression(messages, 'gpt-4')
    const large = planCompression(messages, 'deepseek-v3.2')
    expect(small.triggerTokens).toBeLessThan(large.triggerTokens)
  })

  it('已有记忆 token 计入当前占用', () => {
    const messages = mkMessages(20).map((m) => ({ ...m, content: m.content.repeat(50) }))
    const without = planCompression(messages, 'gpt-4', 0)
    const with_ = planCompression(messages, 'gpt-4', 5_000)
    expect(with_.currentTokens).toBeGreaterThan(without.currentTokens)
  })
})

describe('normalizeSummary', () => {
  it('标准 JSON 被规范化并截断数组', () => {
    const raw = JSON.stringify({
      timeframe: '今天',
      user_intent: '想问灌溉',
      key_facts: ['1', '2', '3', '4', '5', '6'],
      actions_taken: [],
      decisions: [],
      pending_tasks: [],
      current_state: '进行中',
    })
    const out = JSON.parse(normalizeSummary(raw))
    expect(out.key_facts).toHaveLength(4)
    expect(out.timeframe).toBe('今天')
  })

  it('被 markdown 包裹时能抽出 JSON 块', () => {
    const raw = '```json\n{"timeframe":"昨天","key_facts":[],"user_intent":""}\n```'
    const parsed = JSON.parse(normalizeSummary(raw))
    expect(parsed.timeframe).toBe('昨天')
  })

  it('完全不是 JSON 时原样返回', () => {
    expect(normalizeSummary('就是一段普通文字')).toBe('就是一段普通文字')
  })
})

describe('extractPastMemory / buildCompressedMessages', () => {
  it('能定位并抽取已有记忆', () => {
    const messages = [
      { role: 'user', content: '你好' },
      { role: 'assistant', content: '[系统消息]\n<PAST_MEMORY>\n{"timeframe":"上周"}\n</PAST_MEMORY>' },
      { role: 'user', content: '继续' },
    ]
    const found = extractPastMemory(messages)
    expect(found?.index).toBe(1)
    expect(found?.text).toContain('上周')
  })

  it('没有记忆时返回 null', () => {
    expect(extractPastMemory([{ role: 'user', content: '你好' }])).toBeNull()
  })

  it('压缩后消息保持 <PAST_MEMORY> 协议且近段在后', () => {
    const recent = [{ role: 'user', content: '最新消息' }]
    const out = buildCompressedMessages('{"timeframe":"早先"}', recent)
    expect(out).toHaveLength(2)
    expect(out[0].content).toContain('<PAST_MEMORY>')
    expect(out[1]).toEqual(recent[0])
  })
})

describe('stringifyMessages', () => {
  it('渲染中文角色名并跳过空内容', () => {
    const out = stringifyMessages([
      { role: 'user', content: '开灯' },
      { role: 'assistant', content: '' },
    ])
    expect(out).toContain('用户: 开灯')
    expect(out).not.toContain('助手: ')
  })
})
