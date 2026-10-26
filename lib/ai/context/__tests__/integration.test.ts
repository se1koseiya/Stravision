/**
 * 上下文工程层 · 端到端积分测试
 *
 * 单测验证的是「每个部件行为正确」，这里验证的是「装到一起后
 * 一次真实请求的上下文账本是否成立」——即验收标准里的核心诉求：
 *   ① 工具结果不再无限制膨胀
 *   ② 历史压缩按 token 预算触发、且近段原文不丢
 *   ③ 埋点能真实反映各段占用
 */

import { describe, it, expect } from 'vitest'

import { buildContext } from '../context-builder'
import { compactToolResult } from '../tool-result-compactor'
import { planCompression, buildCompressedMessages } from '../history-compressor'
import { buildTelemetry, snapshotContext } from '../telemetry'
import { estimateContextTokens, estimateMessagesTokens } from '../token-estimator'
import { getInputBudget, buildContextBudget } from '../budget'

describe('端到端：一次真实请求的上下文账本', () => {
  it('工具结果进上下文前被压到可控规模', () => {
    // 模拟一次 get_sensor_history：7 天 × 每小时 = 168 个点，每点带若干字段
    const rawResult = {
      success: true,
      summary: '返回最近 7 天温湿度记录，共 168 个数据点',
      count: 168,
      points: Array.from({ length: 168 }, (_, i) => ({
        timestamp: `2026-10-0${(i % 7) + 1}T${String(i % 24).padStart(2, '0')}:00:00Z`,
        temperature: 20 + (i % 10),
        humidity: 60 + (i % 20),
        co2: 400 + (i % 100),
      })),
    }

    const before = estimateContextTokens(rawResult)
    const { content, beforeTokens, afterTokens } = compactToolResult(rawResult, {
      toolName: 'get_sensor_history',
    })

    // 压缩后必须显著变小，且摘要/总数这类「能继续推理」的信息必须还在
    expect(afterTokens).toBeLessThan(before)
    expect(beforeTokens).toBe(before)
    const text = JSON.stringify(content)
    expect(text).toContain('返回最近 7 天温湿度记录')
  })

  it('整轮装配的 token 不超输入预算，且埋点可读', () => {
    const assembled = buildContext({
      modelId: 'deepseek-v3.2',
      basePrompt: '你是莓小智，智慧农业平台助手。'.repeat(50),
      memory: '用户叫小朱，种红颜草莓，1 号棚。',
      skill: '## 草莓种植技能\n温湿度调控要点…'.repeat(30),
      envSnapshot: '{"temperature":"22°C","humidity":"65%"}',
      tasksList: '[{"title":"每天浇水","cron":"0 8 * * *"}]',
      toolsIndex: Array.from({ length: 60 }, (_, i) => `- \`tool_${i}\` — 用途说明`).join('\n'),
      knowledge: '知识库检索结果…'.repeat(20),
      forcedTool: '强制调用 X 工具',
    })

    // 装配结果的 token 必须能被独立复算出来（账本自洽）
    expect(estimateContextTokens(assembled.systemPrompt)).toBe(assembled.totalTokens)

    const tel = buildTelemetry('e2e', assembled)
    expect(tel.totalTokens).toBeGreaterThan(0)
    expect(tel.budgetTokens).toBe(128_000)
    expect(tel.topSections.length).toBeGreaterThan(0)
    // 埋点里最占 token 的段排在最前
    if (tel.topSections.length > 1) {
      expect(tel.topSections[0].tokens).toBeGreaterThanOrEqual(tel.topSections[1].tokens)
    }

    const snap = snapshotContext(assembled) as { utilization: number }
    expect(snap.utilization).toBeGreaterThan(0)
    expect(snap.utilization).toBeLessThan(1)
  })

  it('长对话触发的压缩把上下文拉回安全区，且保留近段原文', () => {
    // 模拟 60 轮长对话。每轮 assistant 回复较长，且夹杂工具结果回灌
    // （真实对话里长上下文主要就是被这些撑起来的）
    const longAnswer =
      `1 号棚当前土壤湿度 62%，红颜草莓结果期适宜 60-70%，暂时不需要灌溉。` +
      `最近三天温度 18-26°C、湿度 55-72%，整体平稳，未出现极端值。` +
      `建议明天早上 8 点复查土壤湿度，若低于 60% 再补水 3 分钟并观察回流情况。` +
      `补充说明：结果期要保持适度干燥以利糖分积累，但不可低于 55%，否则易出现日灼与裂果；` +
      `同时注意夜间湿度不要长期高于 80%，否则灰霉病风险显著上升。`
    const toolDump = `[工具结果] get_sensor_history: ` +
      Array.from({ length: 40 }, (_, k) => `{"t":"10-0${(k % 7) + 1} ${String(k % 24).padStart(2, '0')}:00","temp":${20 + (k % 9)},"hum":${58 + (k % 15)}}`).join(', ')

    const messages = Array.from({ length: 160 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: i % 2 === 0
        ? `第 ${i} 轮：我想知道 1 号棚的红颜草莓现在需不需要灌溉？顺便看看最近三天的温湿度趋势。`
        : `${longAnswer.repeat(3)}\n${toolDump}`,
    }))

    const plan = planCompression(messages, 'deepseek-v3.2')
    expect(plan.needed).toBe(true)
    expect(plan.currentTokens).toBeGreaterThan(plan.triggerTokens)

    // 压缩后：一条记忆摘要 + 近段原文
    const compressed = buildCompressedMessages('{"timeframe":"今天","key_facts":["1号棚红颜草莓"]}', plan.recent)
    expect(compressed[0].content).toContain('<PAST_MEMORY>')

    const before = estimateMessagesTokens(messages)
    const after = estimateMessagesTokens(compressed)
    expect(after).toBeLessThan(before)

    // 近段必须逐字保留（连贯性保证）
    const lastOriginal = messages[messages.length - 1]
    expect(compressed[compressed.length - 1]).toEqual(lastOriginal)
  })

  it('同样内容在小窗口模型上先触发压缩（自适应）', () => {
    const messages = Array.from({ length: 60 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: '这是一段中等长度的历史对话内容，用于验证阈值随模型窗口自适应。'.repeat(12),
    }))
    const small = planCompression(messages, 'gpt-4')
    const large = planCompression(messages, 'deepseek-v3.2')
    const smallRatio = small.currentTokens / small.triggerTokens
    const largeRatio = large.currentTokens / large.triggerTokens
    // 同样内容在小窗口上更接近/超过阈值
    expect(smallRatio).toBeGreaterThan(largeRatio)
  })

  it('预算随模型窗口变化：小窗口下同样的上下文占比更高', () => {
    const big = buildContextBudget('deepseek-v3.2')
    const small = buildContextBudget('gpt-4')
    const ratioBig = getInputBudget(big) / big.windowTokens
    const ratioSmall = getInputBudget(small) / small.windowTokens
    // 两者都留出了输出余量
    expect(ratioBig).toBeLessThan(1)
    expect(ratioSmall).toBeLessThan(1)
    // 小窗口的输出预留占比更高（保护输出不被挤没）
    expect(1 - ratioSmall).toBeGreaterThan(1 - ratioBig)
  })
})
