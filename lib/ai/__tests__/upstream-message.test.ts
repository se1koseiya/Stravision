import { describe, it, expect } from 'vitest'
import { toUpstreamMessage, downgradeAssistantImages, REASONING_FIELD_NAMES } from '../provider-body-adapter'
import { estimateMessagesTokens } from '@/lib/ai/context/token-estimator'

/**
 * 上游请求体消息契约：thinking 模式的推理字段必须原样回传。
 *
 * 事故背景（2026-10-16）：Agent Loop 每轮把历史消息重建为上游请求体时，
 * 字段白名单只保留 role/content/name/tool_calls/tool_call_id，**把推理字段吃掉了**，
 * 于是工具链跑到后续轮次时上游直接拒掉：
 *   400 invalid_request_error
 *   "The `reasoning_content` in the thinking mode must be passed back to the API."
 * 这里锁死「带 tool_calls 的 assistant 消息必须把 reasoning_content 一起带回」的口径。
 */

describe('toUpstreamMessage：字段白名单', () => {
  it('保留 role / content / name / tool_calls / tool_call_id', () => {
    const out = toUpstreamMessage({
      role: 'tool',
      content: '{"ok":true}',
      tool_call_id: 'call_1',
      extra: '不应带上游',
    })
    expect(out).toEqual({ role: 'tool', content: '{"ok":true}', tool_call_id: 'call_1' })
  })

  it('带 tool_calls 的 assistant 消息必须回传 reasoning_content', () => {
    const assistant = {
      role: 'assistant',
      content: '',
      reasoning_content: '用户要看棚里的画面，先取快照。',
      tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'take_camera_snapshot', arguments: '{}' } }],
    }
    const out = toUpstreamMessage(assistant)
    expect(out.reasoning_content).toBe('用户要看棚里的画面，先取快照。')
    expect(out.tool_calls).toEqual(assistant.tool_calls)
  })

  it('reasoning 字段名按收到的原样回写（OpenRouter 等网关用 reasoning）', () => {
    const out = toUpstreamMessage({ role: 'assistant', content: 'hi', reasoning: '思考中' })
    expect(out.reasoning).toBe('思考中')
    expect(out.reasoning_content).toBeUndefined()
  })

  it('没有推理字段时不凭空造字段（避免给 OpenAI 等塞未知参数）', () => {
    const out = toUpstreamMessage({ role: 'assistant', content: '普通回答' })
    for (const key of REASONING_FIELD_NAMES) expect(key in out).toBe(false)
  })

  it('空字符串 / 空数组不算有推理内容', () => {
    expect('reasoning_content' in toUpstreamMessage({ role: 'assistant', content: 'x', reasoning_content: '' })).toBe(false)
    expect('reasoning' in toUpstreamMessage({ role: 'assistant', content: 'x', reasoning: [] })).toBe(false)
  })

  it('推理内容为数组（部分网关的分片格式）时原样保留', () => {
    const parts = [{ type: 'text', text: 'a' }]
    expect(toUpstreamMessage({ role: 'assistant', content: 'x', reasoning_content: parts }).reasoning_content).toEqual(parts)
  })
})

describe('estimateMessagesTokens：推理字段计入预算', () => {
  it('回灌的 reasoning_content 会被计入 token 占用', () => {
    const base = [{ role: 'assistant', content: '好的' }]
    const withReasoning = [
      { role: 'assistant', content: '好的', reasoning_content: '这是一段很长的推理内容'.repeat(20) },
    ]
    expect(estimateMessagesTokens(withReasoning)).toBeGreaterThan(estimateMessagesTokens(base))
  })
})

/**
 * 摄像头快照投递把画面作为一条 **assistant** 消息写进历史
 * （content = [text, image_url]）。历史每轮原样回传上游 → 上游拒绝：
 *
 *   invalid_request_error: `Image in assistant message is not supported`
 *
 * 用户侧表现 = 发出**第二句话**就「请检查网络或 AI 服务状态后重试」。
 * 这里锁死「非 user 角色的图片一律降级成文本」的口径。
 */
describe('downgradeAssistantImages：assistant 图片降级', () => {
  const SNAP = {
    role: 'assistant' as const,
    content: [
      { type: 'text', text: '针对「看看监控截图」，这是摄像头 A 的实时画面：' },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AAAA' } },
    ],
    snapshot: { camera: 'a', capturedAt: 1 },
  }

  it('🚨 assistant 的 image_url 必须被摘掉，只留文本', () => {
    const out = downgradeAssistantImages([SNAP]) as any[]
    expect(typeof out[0].content).toBe('string')
    expect(out[0].content).toBe('针对「看看监控截图」，这是摄像头 A 的实时画面：')
    expect(JSON.stringify(out[0].content)).not.toContain('image_url')
  })

  it('降级后不再被判定为「有图片内容」（hasImageContent 只看 user）', () => {
    const has = (ms: any[]) =>
      ms.some((m) => Array.isArray(m?.content) && m.content.some((x: any) => x?.type === 'image_url'))
    expect(has([SNAP])).toBe(true)
    expect(has(downgradeAssistantImages([SNAP]) as any[])).toBe(false)
  })

  it('只有图没有文本时降级为 [图片] 占位，不留空串', () => {
    const out = downgradeAssistantImages([
      { role: 'assistant', content: [{ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AA' } }] },
    ]) as any[]
    expect(out[0].content).toBe('[图片]')
  })

  it('🚨 user 自己发的图必须原样保留（多模态问答靠它）', () => {
    const userMsg = { role: 'user', content: [{ type: 'text', text: '看看这片叶子' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,BB' } }] }
    const out = downgradeAssistantImages([userMsg]) as any[]
    expect(Array.isArray(out[0].content)).toBe(true)
    expect(out[0].content[1].image_url.url).toContain('data:image/png')
  })

  it('🚨 tool 消息里的图必须原样保留（视觉巡检的「眼睛」）', () => {
    const toolMsg = { role: 'tool', tool_call_id: 'call_1', content: [{ type: 'text', text: '抓帧结果' }, { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,CC' } }] }
    const out = downgradeAssistantImages([toolMsg]) as any[]
    expect(Array.isArray(out[0].content)).toBe(true)
    expect(out[0].content[1].image_url.url).toContain('data:image/jpeg')
  })

  it('纯字符串 content 的消息原样返回（引用相等，零拷贝）', () => {
    const plain = { role: 'assistant', content: '普通回答' }
    expect(downgradeAssistantImages([plain])[0]).toBe(plain)
  })

  it('保留 snapshot 标记（渲染层据此走快照卡）', () => {
    const out = downgradeAssistantImages([SNAP]) as any[]
    expect(out[0].snapshot).toEqual({ camera: 'a', capturedAt: 1 })
  })

  it('入参不是数组时原样返回（防御 route.ts 上游变量为 undefined）', () => {
    expect(downgradeAssistantImages(undefined as any)).toBeUndefined()
  })
})
