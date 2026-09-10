/**
 * LLM 记忆提取服务
 *
 * 核心亮点：让 AI 从自然语言对话中"真正记住用户"。
 *
 * 现有 extractPreferencesFromMessage 用正则硬匹配，只能识别
 * "我喜欢温度25度"这类模板句，对自然表达（"我在1号棚种了红颜草莓"、
 * "这批苗是9月初定植的"、"最近白粉病有点多"）完全失效。
 *
 * 本服务用 LLM 从对话中抽取结构化记忆，覆盖：
 * - 大棚信息（棚号、数量、面积）
 * - 品种（红颜/章姬/白雪公主…）
 * - 生育期/定植时间
 * - 种植目标（增产/控病害/降成本…）
 * - 用户偏好（温度/湿度/回复风格/自动化倾向…）
 * - 当前关注点（最近在忙什么、担心什么）
 *
 * 抽取结果落库到 user_preferences（复用现有表），
 * 由 generateMemoryEnhancedPrompt 在后续对话中注入，形成"越用越懂你"闭环。
 */

import { resolveProvider, resolveDefaultModelId, readProvidersConfig } from '@/lib/ai/provider-resolver'
import { setUserPreference } from '@/lib/db/agent-memory-service'

// === 记忆抽取结果类型 ===

export interface ExtractedMemory {
  /** 记忆条目：key 为偏好键，value 为中文可读内容，confidence 0-1 */
  memories: Array<{ key: string; value: string; confidence: number }>
  /** 供日志/调试用的一句话摘要 */
  summary: string
}

// === 系统提示词 ===

const EXTRACTION_SYSTEM_PROMPT = `你是一个记忆提取器。从用户的对话中识别出"值得长期记住"的稳定信息，这些信息能帮助 AI 在未来的对话中提供更个性化的服务。

只提取"稳定、跨对话仍有价值"的信息，不要提取临时性的任务指令（如"帮我开风扇"）。

需要识别的信息类型及对应的 key：
- 用户姓名/称呼：user_name（如"小朱""老王""张工"——用户说"我叫X""你可以叫我X"时提取）
- 大棚/种植场地：greenhouse_info（如"1号棚""有两个棚共3亩"）
- 草莓品种：strawberry_variety（如"红颜""章姬"）
- 生育期/定植时间：growth_stage（如"苗期""9月初定植"）
- 种植目标/关注重点：focus_area（如"增产""控白粉病""降成本"）
- 温度偏好：preferred_temperature（数值，如 25）
- 湿度偏好：preferred_humidity（数值，如 70）
- 浇水习惯：watering_habit（如"每天早上8点浇水10分钟"）
- 回复风格偏好：response_style（如"简短直接"或"详细专业"）
- 自动化倾向：automation_preference（high=希望AI自动执行 / low=希望先确认）
- 其他稳定偏好：preference（自定义，key 用英文 snake_case）

规则：
1. value 用简短中文短语（≤20字），数字保留单位。**不要带主语前缀**——用户说"我叫小朱"时 value 应为"小朱"，而非"我小朱"；"我种的是红颜草莓"应为"红颜"
2. confidence 按确定程度打分：用户明确陈述=0.9，可推断=0.6-0.7，模糊=0.5以下（低于0.5不要输出）
3. 没有可提取的信息就返回空数组
4. 只输出 JSON，不要输出任何其他文字

特别重要 —— 纠错/更正识别：
当用户在"纠正"之前记住的信息时（例如"你记错了，我叫小朱不叫小张"、"我改名了，现在叫老王"、"不是1号棚，是2号棚"），
必须提取【纠正后的正确值】（小朱、老王、2号棚），而不是被否定的旧值（小张、1号棚）。
判断依据：紧跟"不叫/不是/记错/改名/搞错/其实/应该是"后面的才是正确值；被"不叫/不是"否定的值是错的，不要提取。`

// === 主函数 ===

/**
 * 从最近若干条用户消息中提取结构化记忆
 * 失败或无可提取时返回空数组（不抛异常，不阻塞主流程）
 *
 * @param userMessages 最近若干条用户消息文本（按时间升序，最后一条为最新）。
 *                     传多条可避免"同一轮连发多句、只有最后一句被提取"的遗漏。
 * @param aiResponse   AI 回复文本（可选，仅作上下文参考）
 */
export async function extractMemoriesFromConversation(
  userMessages: string[],
  aiResponse: string
): Promise<ExtractedMemory> {
  // 归一化：兼容调用方传单个字符串的旧写法
  const list = (Array.isArray(userMessages) ? userMessages : [userMessages])
    .map(m => String(m ?? '').trim())
    .filter(Boolean)

  if (list.length === 0) {
    return { memories: [], summary: '' }
  }

  // 合并最近消息，总长控制在 1500 字内（防止 token 膨胀）
  let combined = ''
  for (let i = list.length - 1; i >= 0; i--) {
    const candidate = combined ? `${list[i]}\n${combined}` : list[i]
    if (candidate.length > 1500) break
    combined = candidate
  }
  const trimmed = combined.trim()

  // 极短消息（<4字）通常是问候或单字指令，跳过 LLM 调用省 token
  if (trimmed.length < 4) {
    return { memories: [], summary: '' }
  }

  try {
    // 解析默认模型（admin 默认 deepseek-v4-pro，与平台非流式调用约定一致）
    const providersConfig = await readProvidersConfig()
    const defaultModelId = resolveDefaultModelId(providersConfig) || 'auto'
    const resolved = await resolveProvider(defaultModelId)

    if (!resolved) {
      console.warn('[MemoryExtraction] No provider available, skip extraction')
      return { memories: [], summary: '' }
    }

    const aiText = (aiResponse || '').slice(0, 800)

    const response = await fetch(`${resolved.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resolved.apiKey}`,
      },
      body: JSON.stringify({
        model: resolved.model,
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `用户最近的若干条消息（按时间先后，最后一条最新）：\n${trimmed.slice(0, 1500)}\n\nAI 回复（节选）：${aiText}\n\n请提取值得长期记住的信息。`,
          },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      console.warn(`[MemoryExtraction] LLM returned ${response.status}`)
      return { memories: [], summary: '' }
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content || '{}'
    const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- LLM 返回结构不固定，需宽松解析
    let parsed: any
    try {
      parsed = JSON.parse(clean)
    } catch {
      // 尝试抽取 JSON 块
      const m = clean.match(/\{[\s\S]*\}/)
      if (!m) return { memories: [], summary: '' }
      try {
        parsed = JSON.parse(m[0])
      } catch {
        return { memories: [], summary: '' }
      }
    }

    // 兼容多种返回结构：{memories:[...]} / {items:[...]} / 直接数组
    const rawList = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.memories)
        ? parsed.memories
        : Array.isArray(parsed?.items)
          ? parsed.items
          : []

    const memories: ExtractedMemory['memories'] = []
    for (const item of rawList) {
      const key = String(item?.key || '').trim()
      const value = String(item?.value || '').trim()
      const confidence = Number(item?.confidence) || 0
      if (!key || !value || confidence < 0.5) continue
      // 限制 key 长度和格式，防止脏数据
      if (key.length > 60) continue
      memories.push({ key, value: value.slice(0, 60), confidence: Math.min(confidence, 1) })
    }

    const summary = memories.length > 0
      ? memories.map(m => `${m.key}=${m.value}`).join('; ')
      : ''

    return { memories, summary }
  } catch (e) {
    console.error('[MemoryExtraction] Failed:', e)
    return { memories: [], summary: '' }
  }
}

/**
 * 将提取的记忆落库（复用 user_preferences 表）
 * 只写入高置信度（≥0.6）的记忆，避免污染
 */
export async function persistMemories(
  userId: number,
  extracted: ExtractedMemory
): Promise<number> {
  let saved = 0
  for (const mem of extracted.memories) {
    if (mem.confidence < 0.6) continue
    try {
      await setUserPreference({
        user_id: userId,
        preference_key: mem.key,
        preference_value: mem.value,
        confidence: mem.confidence,
      })
      saved++
    } catch (e) {
      console.error(`[MemoryExtraction] Failed to persist ${mem.key}:`, e)
    }
  }
  return saved
}
