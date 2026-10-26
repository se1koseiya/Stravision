/**
 * 上游请求体适配器（Provider Request-Body Adapter）
 *
 * ── 为什么需要它（2026-10-01）──
 * 平台内部只维护「一套通用 OpenAI 兼容请求体」，默认写死 `temperature: 0.7`。
 * 但不同厂商对参数的宽容度完全不同：**Kimi（Moonshot）把采样参数钉死了**，
 * 显式传入不同值会直接被上游以 `400 invalid_request_error` 拒绝。
 *
 * 官方参数表（https://platform.kimi.com/docs/api/models-overview）：
 *
 *   | 参数                 | kimi-k3 | kimi-k2.7-code | kimi-k2.6        |
 *   |----------------------|---------|----------------|------------------|
 *   | temperature          | 固定 1.0| 固定 1.0       | 思考 1.0/非思考 0.6 |
 *   | top_p                | 固定 .95| 固定 .95       | 固定 .95         |
 *   | n                    | 固定 1  | 固定 1         | 固定 1           |
 *   | presence_penalty     | 固定 0  | 固定 0         | 固定 0           |
 *   | frequency_penalty    | 固定 0  | 固定 0         | 固定 0           |
 *   | reasoning_effort     | low/high/max | 不支持     | 不支持           |
 *   | tool_choice=required | 支持    | 不支持         | 不支持           |
 *
 * 原文：「表中“固定”表示该参数不可修改：传入其他值会报错，建议不要显式传入。」
 *
 * ── 设计原则 ──
 * 1. **纯函数、零依赖**：只吃 baseUrl + model 字符串，不 import 任何业务模块，
 *    避免被 route.ts 反向依赖造成循环引用。
 * 2. **只删不改**：对受限参数一律 `delete`，绝不改成「我们以为对的值」——
 *    上游默认值才是唯一正确值。
 * 3. **返回新对象**：不原地改调用方的 body，调用方自己决定要不要替换。
 */

/**
 * 推理字段（thinking / reasoning 模式）在 assistant 消息上的字段名。
 *
 * 大多数厂商用 `reasoning_content`（DeepSeek 全系、Moonshot/Kimi K3、Qwen 兼容模式）；
 * OpenRouter 一类网关用 `reasoning`。回传时**按收到的原字段名原样回写**，
 * 不做跨厂商改名 —— 名字写错等于没传。
 */
export const REASONING_FIELD_NAMES = ['reasoning_content', 'reasoning'] as const

/**
 * 内部消息 → 上游请求体消息（字段白名单）。
 *
 * ── 为什么必须过这一层（2026-10-16）──
 * Agent Loop 每轮都要把历史消息重建成上游请求体。此前白名单只保留
 * `role / content / name / tool_calls / tool_call_id`，**把 thinking 模式的推理字段吃掉了**，
 * 于是工具调用到第 N 轮时上游直接 400：
 *
 *   invalid_request_error: The `reasoning_content` in the thinking mode must be
 *   passed back to the API.
 *
 * 官方契约：
 * - DeepSeek thinking 模式：多轮对话（含工具调用）时 assistant 消息必须带回 `reasoning_content`；
 * - Kimi K3：多轮对话与工具调用必须把 API 返回的**完整 assistant message 原样回传**，
 *   包括 `reasoning_content` 与 `tool_calls`（见 platform.moonshot.cn/docs/guide/use-reasoning-effort）。
 *
 * 只透传**确实有值**的推理字段：非 thinking 模型/轮次不会凭空多出字段，
 * 也就不会把未知参数塞给不认识它的上游（OpenAI 等会直接拒绝未知字段）。
 */
export function toUpstreamMessage(m: any): Record<string, any> {
  const out: Record<string, any> = { role: m?.role, content: m?.content }
  if (m?.name) out.name = m.name
  if (m?.tool_calls) out.tool_calls = m.tool_calls
  if (m?.tool_call_id) out.tool_call_id = m.tool_call_id
  for (const key of REASONING_FIELD_NAMES) {
    const v = m?.[key]
    if (typeof v === 'string' && v.length > 0) out[key] = v
    else if (Array.isArray(v) && v.length > 0) out[key] = v
  }
  return out
}

/**
 * 把 **assistant** 消息里的图片降级成文本（唯一入口，2026-10-16 建立）。
 *
 * ── 为什么必须做（真实事故）──
 * 「摄像头快照投递」（`lib/ai/camera-snapshot.ts`）会把抓到的画面作为一条
 * **assistant** 消息存进对话历史，`content` 是 `[text, image_url]` 数组。
 * 历史每轮都要原样回传上游，而绝大多数模型明确拒绝「assistant 携带图片」：
 *
 *   invalid_request_error: `Image in assistant message is not supported`
 *
 * 前端表现 = 用户发出**第二句话**就弹「请检查网络或 AI 服务状态后重试」
 * （第一轮正常，因为那条 assistant 消息还没进历史）。
 *
 * ── 顺带修掉一个连带误判 ──
 * route.ts 的 `hasImageContent` 只看「有没有 image_url」不看角色，会被这条
 * assistant 图片消息骗到 → 误判「用户发了图」→ 强制切换到视觉模型。
 * 归一化放在它之前，两个问题一起消失（所以调用点必须早于 hasImageContent）。
 *
 * ── ⛔ 只动 assistant，别扩大范围 ──
 * - `tool` 消息里的图片是**工具结果回灌的眼睛**（视觉巡检靠它让模型真看到画面），
 * - `user` 消息里的图片是用户自己发的多模态输入，
 * 两者都必须原样上行。历史里除 assistant 外，也不该有其他角色的裸图。
 */
export function downgradeAssistantImages<T extends Record<string, any>>(messages: T): T {
  if (!Array.isArray(messages)) return messages
  return messages.map((m: any) => {
    if (!m || m.role !== 'assistant' || !Array.isArray(m.content)) return m
    const hasImage = m.content.some(
      (c: any) => c?.type === 'image_url' || c?.image_url || c?.image,
    )
    if (!hasImage) return m
    const texts = m.content
      .filter((c: any) => c?.type === 'text' && typeof c.text === 'string')
      .map((c: any) => c.text)
      .join('\n')
      .trim()
    return { ...m, content: texts || '[图片]' }
  }) as unknown as T
}

/** 采样参数：Kimi 全系列固定，不能显式传 */
const MOONSHOT_FIXED_PARAMS = [
  'temperature',
  'top_p',
  'n',
  'presence_penalty',
  'frequency_penalty',
] as const

/**
 * 判断目标是否属于 Moonshot（Kimi）。
 *
 * 双通道识别，任一命中即算：
 * - **端点**：api.moonshot.cn / api.moonshot.ai、或代理 URL 里带 moonshot 关键字；
 * - **模型**：kimi-* / moonshot-* 前缀（用户常用第三方聚合网关跑 kimi-k3，
 *   端点不是官方域名，只能靠模型名兜底）。
 */
export function isMoonshotTarget(
  baseUrl?: string | null,
  modelId?: string | null,
): boolean {
  const url = (baseUrl || '').toLowerCase()
  if (url.includes('api.moonshot.cn') || url.includes('api.moonshot.ai') || url.includes('moonshot')) {
    return true
  }
  const m = (modelId || '').toLowerCase()
  return m.startsWith('kimi-') || m.startsWith('kimi_') || m.startsWith('moonshot-')
}

/** K3 系列：支持顶层 reasoning_effort，且已弃用 max_tokens */
function isK3Model(modelId: string): boolean {
  return /^kimi-k3/.test((modelId || '').toLowerCase())
}

export interface AdaptChatBodyOptions {
  /** 目标端点（用于识别厂商） */
  baseUrl?: string | null
  /** 最终使用的模型 ID（用于识别厂商与型号差异） */
  model?: string | null
  /**
   * 是否开启深度思考。
   * Kimi K3 始终推理，此处只影响 `reasoning_effort` 档位：
   * 开 → `max`（官方默认，能力最强）；关 → `low`（更快、更省）。
   */
  enableReasoning?: boolean
}

/**
 * 按目标厂商的硬约束改写 chat/completions 请求体。
 *
 * 非 Moonshot 目标原样返回（引用相等），调用方可据此判断是否有改动。
 *
 * @example
 *   requestBody = adaptChatRequestBody(requestBody, {
 *     baseUrl: targetUrl, model: effectiveModel, enableReasoning: shouldEnableReasoning,
 *   })
 */
export function adaptChatRequestBody<T extends Record<string, any>>(
  body: T,
  opts: AdaptChatBodyOptions,
): T {
  if (!body || typeof body !== 'object') return body

  const model = String(opts.model || (body as any).model || '')
  if (!isMoonshotTarget(opts.baseUrl, model)) return body

  const out: Record<string, any> = { ...body }

  // ① 固定采样参数一律不传（传了就是 400）
  for (const key of MOONSHOT_FIXED_PARAMS) {
    if (key in out) delete out[key]
  }

  // ② K3 已弃用 max_tokens → 换成 max_completion_tokens
  if (isK3Model(model) && out.max_tokens !== undefined) {
    out.max_completion_tokens = out.max_tokens
    delete out.max_tokens
  }

  // ③ reasoning_effort 仅 K3 支持；k3 始终推理，用档位控制强度
  if (isK3Model(model)) {
    out.reasoning_effort = opts.enableReasoning === false ? 'low' : 'max'
  }

  // ④ k2.x 不支持 tool_choice: "required"
  if (out.tool_choice === 'required' && !isK3Model(model)) {
    delete out.tool_choice
  }

  return out as T
}
