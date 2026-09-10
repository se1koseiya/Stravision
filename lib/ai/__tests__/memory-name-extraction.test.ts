import { describe, it, expect } from 'vitest'
import { extractPreferencesFromMessage } from '../memory-prompt-enhancer'

describe('extractPreferencesFromMessage - 用户姓名提取', () => {
  it('识别"我叫小朱"', () => {
    const prefs = extractPreferencesFromMessage('我叫小朱', '好的')
    const name = prefs.find(p => p.key === 'user_name')
    expect(name).toBeDefined()
    expect(name?.value).toBe('小朱')
    expect(name?.confidence).toBeGreaterThanOrEqual(0.9)
  })

  it('识别"你可以叫我老王"', () => {
    const prefs = extractPreferencesFromMessage('你可以叫我老王', '好')
    const name = prefs.find(p => p.key === 'user_name')
    expect(name?.value).toBe('老王')
  })

  it('识别"我是张三"', () => {
    const prefs = extractPreferencesFromMessage('我是张三', '你好')
    const name = prefs.find(p => p.key === 'user_name')
    expect(name?.value).toBe('张三')
  })

  it('过滤"我是新手/种植户"这类非姓名', () => {
    const prefs = extractPreferencesFromMessage('我是新手，想种草莓', '好')
    const name = prefs.find(p => p.key === 'user_name')
    expect(name).toBeUndefined()
  })

  it('不误报普通陈述', () => {
    const prefs = extractPreferencesFromMessage('帮我看看温度', '好')
    const name = prefs.find(p => p.key === 'user_name')
    expect(name).toBeUndefined()
  })

  // ─── 纠错/更正场景 ───

  it('纠错"我叫小朱不叫小张"→ 提取小朱（非小张）', () => {
    const prefs = extractPreferencesFromMessage('我叫小朱不叫小张', '好')
    const name = prefs.find(p => p.key === 'user_name')
    expect(name?.value).toBe('小朱')
    expect(name?.value).not.toContain('小张')
  })

  it('纠错"你记错了，我叫小朱"→ 提取小朱', () => {
    const prefs = extractPreferencesFromMessage('你记错了，我叫小朱', '抱歉')
    const name = prefs.find(p => p.key === 'user_name')
    expect(name?.value).toBe('小朱')
  })

  it('纠错"不是小张，是小朱"→ 提取小朱', () => {
    const prefs = extractPreferencesFromMessage('不是小张，是小朱', '好')
    const name = prefs.find(p => p.key === 'user_name')
    expect(name?.value).toBe('小朱')
  })

  it('纠错"我改名了，现在叫老王"→ 提取老王', () => {
    const prefs = extractPreferencesFromMessage('我改名了，现在叫老王', '好')
    const name = prefs.find(p => p.key === 'user_name')
    expect(name?.value).toBe('老王')
  })

  it('纠错"我是小朱不是小张"→ 提取小朱', () => {
    const prefs = extractPreferencesFromMessage('我是小朱不是小张', '好')
    const name = prefs.find(p => p.key === 'user_name')
    expect(name?.value).toBe('小朱')
  })
})
