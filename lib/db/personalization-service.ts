/**
 * 用户个性化设置服务（Personalization Service）
 *
 * 承载「设置 → 个性化」页面的全部配置项，存储于 user_preferences 表
 * （key 前缀 `personal.*`，与记忆提取写入的偏好 key 互不冲突）。
 *
 * ⚠️ 与记忆的区别：
 *   - 记忆（data/user-memory/<uid>.md）= AI 从对话中**自动习得**的事实
 *   - 个性化（本模块）= 用户**显式设置**的对话偏好，优先级更高
 *
 * 对话链路读取顺序见 app/api/chat/route.ts：
 *   个性化（本模块）→ 记忆档案（md）→ 设备模式/成功策略（db 动态统计）
 */

import { getAllUserPreferences, setUserPreference, deleteUserPreference } from '@/lib/db/agent-memory-service'

/** 个性化配置 key（user_preferences.preference_key） */
export const PERSONAL_KEYS = {
  /** 回复风格：default | friendly | blunt | imaginative | efficient */
  responseStyle: 'personal.response_style',
  /** 加载欢迎语（对话等待时的一句问候），空=关闭 */
  loadingGreeting: 'personal.loading_greeting',
  /** 是否在模型输出中展示文件变更过程详情 */
  showChangeDetails: 'personal.show_change_details',
  /** 自定义指令（对所有任务生效，≤1500 字） */
  customInstructions: 'personal.custom_instructions',
  /** AI 对我的称呼 */
  userAddress: 'personal.user_address',
  /** AI 的名字 */
  assistantName: 'personal.assistant_name',
  /** AI 人格描述（人设） */
  personaDescription: 'personal.persona_description',
  /** 是否允许从对话中提取记忆 */
  memoryEnabled: 'personal.memory_enabled',
} as const

export type PersonalKey = (typeof PERSONAL_KEYS)[keyof typeof PERSONAL_KEYS]

/** 回复风格选项（对齐行业惯例的 5 档） */
export interface ResponseStyleOption {
  id: string
  label: string
  description: string
  /** 注入 prompt 的风格指令 */
  prompt: string
}

export const RESPONSE_STYLES: ResponseStyleOption[] = [
  {
    id: 'default',
    label: '默认',
    description: '清晰、准确、值得信赖',
    prompt: '回答清晰准确，专业但不生硬，该展开时展开、该简略时简略。',
  },
  {
    id: 'friendly',
    label: '亲和友善',
    description: '温暖、平易近人、鼓励支持',
    prompt: '语气温暖亲切，多用鼓励性表达，让用户感到被支持；可以适度使用轻松的口吻。',
  },
  {
    id: 'blunt',
    label: '直言不讳',
    description: '简明扼要、不废话、直击要点',
    prompt: '直接给结论和要点，不铺垫不客套，去掉"很好的问题"这类开场白，只说有价值的信息。',
  },
  {
    id: 'imaginative',
    label: '天马行空',
    description: '富有想象力、善用比喻类比',
    prompt: '善于用生动的比喻和类比讲解，思路开阔，鼓励跳出常规的想法，但结论仍需可靠。',
  },
  {
    id: 'efficient',
    label: '高效务实',
    description: '最少文字、最大信息量',
    prompt: '用最短的篇幅承载最大的信息量，优先列表/表格/要点，避免任何冗余修饰词。',
  },
]

/** 个性化配置（前端表单形态，含默认值） */
export interface PersonalizationSettings {
  responseStyle: string
  loadingGreeting: string
  showChangeDetails: boolean
  customInstructions: string
  userAddress: string
  assistantName: string
  personaDescription: string
  memoryEnabled: boolean
}

export const DEFAULT_PERSONALIZATION: PersonalizationSettings = {
  responseStyle: 'default',
  loadingGreeting: '',
  showChangeDetails: true,
  customInstructions: '',
  userAddress: '',
  assistantName: '莓小智',
  personaDescription: '',
  memoryEnabled: true,
}

export const CUSTOM_INSTRUCTIONS_MAX = 1500

/** 读取用户个性化设置（缺失项回落到默认值） */
export async function getPersonalization(userId: number): Promise<PersonalizationSettings> {
  const rows = await getAllUserPreferences(userId).catch(() => [])
  const map = new Map(rows.map((r) => [r.preference_key, r.preference_value]))

  const str = (key: string, fallback: string) => {
    const v = map.get(key)
    return typeof v === 'string' ? v : fallback
  }
  const bool = (key: string, fallback: boolean) => {
    const v = map.get(key)
    if (v === 'true') return true
    if (v === 'false') return false
    return fallback
  }

  return {
    responseStyle: str(PERSONAL_KEYS.responseStyle, DEFAULT_PERSONALIZATION.responseStyle),
    loadingGreeting: str(PERSONAL_KEYS.loadingGreeting, DEFAULT_PERSONALIZATION.loadingGreeting),
    showChangeDetails: bool(PERSONAL_KEYS.showChangeDetails, DEFAULT_PERSONALIZATION.showChangeDetails),
    customInstructions: str(PERSONAL_KEYS.customInstructions, DEFAULT_PERSONALIZATION.customInstructions),
    userAddress: str(PERSONAL_KEYS.userAddress, DEFAULT_PERSONALIZATION.userAddress),
    assistantName: str(PERSONAL_KEYS.assistantName, DEFAULT_PERSONALIZATION.assistantName),
    personaDescription: str(PERSONAL_KEYS.personaDescription, DEFAULT_PERSONALIZATION.personaDescription),
    memoryEnabled: bool(PERSONAL_KEYS.memoryEnabled, DEFAULT_PERSONALIZATION.memoryEnabled),
  }
}

/** 写入用户个性化设置（仅写传入字段，未传的保持不变） */
export async function savePersonalization(
  userId: number,
  patch: Partial<PersonalizationSettings>
): Promise<PersonalizationSettings> {
  const writes: Array<{ key: string; value: string }> = []

  const pushStr = (key: string, v: unknown, max?: number) => {
    if (typeof v !== 'string') return
    let val = v
    if (max != null && val.length > max) val = val.slice(0, max)
    writes.push({ key, value: val })
  }

  if ('responseStyle' in patch) {
    const ok = RESPONSE_STYLES.some((s) => s.id === patch.responseStyle)
    if (!ok) throw new Error(`未知的回复风格：${patch.responseStyle}`)
    writes.push({ key: PERSONAL_KEYS.responseStyle, value: String(patch.responseStyle) })
  }
  if ('loadingGreeting' in patch) pushStr(PERSONAL_KEYS.loadingGreeting, patch.loadingGreeting, 120)
  if ('customInstructions' in patch) pushStr(PERSONAL_KEYS.customInstructions, patch.customInstructions, CUSTOM_INSTRUCTIONS_MAX)
  if ('userAddress' in patch) pushStr(PERSONAL_KEYS.userAddress, patch.userAddress, 50)
  if ('assistantName' in patch) pushStr(PERSONAL_KEYS.assistantName, patch.assistantName, 50)
  if ('personaDescription' in patch) pushStr(PERSONAL_KEYS.personaDescription, patch.personaDescription, 4000)
  if ('showChangeDetails' in patch && typeof patch.showChangeDetails === 'boolean') {
    writes.push({ key: PERSONAL_KEYS.showChangeDetails, value: String(patch.showChangeDetails) })
  }
  if ('memoryEnabled' in patch && typeof patch.memoryEnabled === 'boolean') {
    writes.push({ key: PERSONAL_KEYS.memoryEnabled, value: String(patch.memoryEnabled) })
  }

  const now = Date.now()
  for (const w of writes) {
    await setUserPreference({
      user_id: userId,
      preference_key: w.key,
      preference_value: w.value,
      confidence: 1, // 用户显式设置 = 最高置信度
      created_at: now,
      updated_at: now,
    })
  }

  return getPersonalization(userId)
}

/** 恢复个性化设置为默认（删除本模块写入的所有 key） */
export async function resetPersonalization(userId: number): Promise<PersonalizationSettings> {
  for (const key of Object.values(PERSONAL_KEYS)) {
    await deleteUserPreference(userId, key).catch(() => {})
  }
  return getPersonalization(userId)
}

/**
 * 生成注入 system prompt 的个性化片段。
 * 无任何配置时返回空字符串（不占 token）。
 */
export async function buildPersonalizationPrompt(userId: number): Promise<string> {
  const s = await getPersonalization(userId).catch(() => DEFAULT_PERSONALIZATION)
  const parts: string[] = []

  const style = RESPONSE_STYLES.find((x) => x.id === s.responseStyle)
  // 默认风格不注入（本身即基线行为），避免无谓 token
  if (style && style.id !== 'default') {
    parts.push(`### 回复风格（${style.label}）\n${style.prompt}`)
  }

  if (s.userAddress.trim()) {
    parts.push(`### 称呼\n用户希望你称呼他为「${s.userAddress.trim()}」，请在回复中自然地使用。`)
  }

  if (s.customInstructions.trim()) {
    parts.push(`### 用户自定义指令（必须遵守）\n${s.customInstructions.trim()}`)
  }

  if (s.personaDescription.trim()) {
    parts.push(`### 你的人格设定\n${s.personaDescription.trim()}`)
  }

  if (s.assistantName.trim() && s.assistantName.trim() !== DEFAULT_PERSONALIZATION.assistantName) {
    parts.push(`你的名字是「${s.assistantName.trim()}」，当用户问你是谁时以此作答。`)
  }

  if (parts.length === 0) return ''

  return `\n\n## 🎨 用户个性化设定（用户显式配置，优先级高于默认风格；与安全规则冲突时以安全规则为准）\n${parts.join('\n\n')}`
}
