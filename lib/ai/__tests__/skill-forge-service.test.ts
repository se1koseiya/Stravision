/**
 * 技能工坊（Skill Forge）单元测试
 *
 * 覆盖纯逻辑部分（不触发 LLM / DB）：
 * - extractJson：LLM 输出的稳健 JSON 提取
 * - validateSkillDraft：技能草稿结构校验
 * - runMatchTests：关键词路由自测
 */

import { describe, it, expect } from 'vitest'
import {
  extractJson,
  validateSkillDraft,
  runMatchTests,
  isAnalysisInsufficient,
  buildFollowUpQuestions,
  type SkillDraft,
  type DocumentAnalysis,
} from '../skill-forge-service'

function makeDraft(overrides: Partial<SkillDraft> = {}): SkillDraft {
  return {
    skill_id: 'soil-sensor-npk',
    name: '土壤氮磷钾传感器',
    description: '让助手掌握土壤氮磷钾传感器的字段规则与查询回答方式',
    icon: '🌱',
    category: '设备',
    keywords: ['土壤', '氮磷钾', '肥力', '传感器', 'NPK'],
    examples: ['查一下当前土壤氮含量', '土壤肥力数据正常吗'],
    effects: '回答土壤肥力相关问题并解读传感器数据',
    content: `# 土壤氮磷钾传感器技能

## 适用场景
用户询问土壤肥力、氮磷钾含量、传感器数据含义时加载本技能。

## 关键参数与字段表
| 字段 | 类型 | 单位 | 说明 |
| --- | --- | --- | --- |
| nitrogen | number | mg/kg | 土壤氮含量 |
| phosphorus | number | mg/kg | 土壤磷含量 |
| potassium | number | mg/kg | 土壤钾含量 |

## 操作与回答指南
你应当按上表解读传感器上报数据，并给出肥力水平评价（偏低/正常/偏高）。

## 注意事项
避免编造数值；传感器离线时明确告知用户当前无数据。`,
    ...overrides,
  }
}

describe('extractJson', () => {
  it('直接解析纯 JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 })
  })

  it('解析 ```json 围栏包裹的输出', () => {
    const raw = '好的，结果如下：\n```json\n{"skill_id":"x","keywords":["a"]}\n```\n以上。'
    expect(extractJson<{ skill_id: string }>(raw)?.skill_id).toBe('x')
  })

  it('解析前后夹杂杂文字的 JSON', () => {
    const raw = '输出：{"ok":true,"list":[1,2]} 完毕'
    expect(extractJson<{ ok: boolean }>(raw)?.ok).toBe(true)
  })

  it('无效输入返回 null', () => {
    expect(extractJson('完全不是 JSON')).toBeNull()
    expect(extractJson('')).toBeNull()
  })
})

describe('validateSkillDraft', () => {
  it('合格草稿通过校验', () => {
    const result = validateSkillDraft(makeDraft(), new Set(['other-skill']))
    expect(result.passed).toBe(true)
    expect(result.issues.filter(i => i.level === 'error')).toHaveLength(0)
  })

  it('skill_id 与已有技能冲突时报错', () => {
    const result = validateSkillDraft(makeDraft(), new Set(['soil-sensor-npk']))
    expect(result.passed).toBe(false)
    expect(result.issues.some(i => i.field === 'skill_id' && i.level === 'error')).toBe(true)
  })

  it('非法 slug 报错', () => {
    const result = validateSkillDraft(makeDraft({ skill_id: '土壤传感器' }), new Set())
    expect(result.passed).toBe(false)
    expect(result.issues.some(i => i.field === 'skill_id')).toBe(true)
  })

  it('关键词过少报错', () => {
    const result = validateSkillDraft(makeDraft({ keywords: ['土壤'] }), new Set())
    expect(result.passed).toBe(false)
    expect(result.issues.some(i => i.field === 'keywords')).toBe(true)
  })

  it('正文过短报错', () => {
    const result = validateSkillDraft(makeDraft({ content: '太短' }), new Set())
    expect(result.passed).toBe(false)
    expect(result.issues.some(i => i.field === 'content' && i.message.includes('200'))).toBe(true)
  })

  it('正文包含"参见原文档"类引用报错（技能必须自包含）', () => {
    const content = '# 技能\n\n## 场景\n见文档。\n\n## 参数\n参见原文档附录A。\n\n## 指南\n照做。\n\n## 注意\n别编造。'
    const result = validateSkillDraft(makeDraft({ content }), new Set())
    expect(result.passed).toBe(false)
    expect(result.issues.some(i => i.field === 'content' && i.message.includes('自包含'))).toBe(true)
  })

  it('正文含 frontmatter 报错', () => {
    const content = '---\nname: bad\n---\n\n# 技能\n\n## 场景\nA。\n\n## 参数\nB。\n\n## 指南\nC。'
    const result = validateSkillDraft(makeDraft({ content }), new Set())
    expect(result.issues.some(i => i.field === 'content' && i.message.includes('frontmatter'))).toBe(true)
  })

  it('正文缺少章节结构报错', () => {
    const longContent = '没有章节结构的超长正文。'.repeat(30)
    const result = validateSkillDraft(makeDraft({ content: longContent }), new Set())
    expect(result.issues.some(i => i.field === 'content' && i.message.includes('章节'))).toBe(true)
  })
})

describe('信息充分性判断（isAnalysisInsufficient / buildFollowUpQuestions）', () => {
  function makeAnalysis(overrides: Partial<DocumentAnalysis> = {}): DocumentAnalysis {
    return {
      subject_name: '土壤传感器',
      summary: '一份协议文档',
      capabilities: [{ name: '数据上报', description: '周期性上报' }],
      properties: [
        { name: '土壤温度', type: 'int16' },
        { name: '土壤湿度', type: 'uint16' },
      ],
      rules: ['温湿度 ÷10 缩放'],
      missing_info: [],
      test_questions: ['土壤温度单位是什么？'],
      ...overrides,
    }
  }

  it('功能与字段都充足时不阻断', () => {
    expect(isAnalysisInsufficient(makeAnalysis())).toBe(false)
  })

  it('仅 missing_info 非空不阻断（小缺口在卡片提示即可）', () => {
    expect(isAnalysisInsufficient(makeAnalysis({ missing_info: ['未给出固件版本'] }))).toBe(false)
  })

  it('无功能且字段不足 2 个时判定为信息不足', () => {
    expect(isAnalysisInsufficient(makeAnalysis({ capabilities: [], properties: [] }))).toBe(true)
    expect(isAnalysisInsufficient(makeAnalysis({
      capabilities: [],
      properties: [{ name: '温度', type: 'int16' }],
    }))).toBe(true)
  })

  it('有功能但字段少时不阻断（功能足够生成技能骨架）', () => {
    expect(isAnalysisInsufficient(makeAnalysis({ properties: [] }))).toBe(false)
  })

  it('buildFollowUpQuestions 优先列出文档缺失项并补齐追问', () => {
    const questions = buildFollowUpQuestions(makeAnalysis({
      capabilities: [],
      properties: [],
      rules: [],
      missing_info: ['未说明波特率', '未给出异常码表'],
    }))
    // 前两项应来自 missing_info
    expect(questions[0]).toBe('未说明波特率')
    expect(questions[1]).toBe('未给出异常码表')
    // 剩余为按缺口类型生成的追问
    expect(questions.length).toBeGreaterThanOrEqual(4)
    expect(questions.length).toBeLessThanOrEqual(6)
  })

  it('missing_info 为空时也能构造完整追问清单', () => {
    const questions = buildFollowUpQuestions(makeAnalysis({
      capabilities: [], properties: [], rules: [], missing_info: [],
    }))
    expect(questions.length).toBe(3)
    expect(questions.every(q => q.length > 10)).toBe(true)
  })
})

describe('runMatchTests', () => {
  it('examples 命中关键词时全部通过', () => {
    const tests = runMatchTests(makeDraft())
    expect(tests.length).toBe(2)
    expect(tests.every(t => t.passed)).toBe(true)
    expect(tests[0].score).toBeGreaterThanOrEqual(60)
  })

  it('examples 无法命中关键词时不通过（触发自动修订）', () => {
    const tests = runMatchTests(makeDraft({
      keywords: ['完全无关的关键词甲', '完全无关的关键词乙', '完全无关的关键词丙', '无关丁', '无关戊'],
    }))
    expect(tests.some(t => !t.passed)).toBe(true)
  })

  it('无 examples 时回退用名称/描述做测试', () => {
    const tests = runMatchTests(makeDraft({ examples: [] }))
    expect(tests.length).toBeGreaterThan(0)
  })
})
