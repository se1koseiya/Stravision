/**
 * 用户记忆文件服务 (User Memory File Service)
 *
 * 每个用户一个独立的 Markdown 文件，作为该用户被 AI 记住的信息的"唯一真相源"。
 *
 * 为什么用文件而非数据库：
 * - 直接、可靠、可读、可手动编辑 —— 跨会话/跨对话/重启服务都不丢
 * - 用户能直接打开看 AI 记住了什么，也能自己改
 * - 避免数据库查询/排序/截断等中间环节出错导致的"失忆"
 *
 * 文件路径：data/user-memory/<userId>.md
 * 文件格式（人类可读的 Markdown）：
 *   # 用户记忆档案
 *   最后更新：...
 *
 *   ## 称呼
 *   小朱
 *
 *   ## 大棚/场地
 *   1号棚
 *
 *   ## 草莓品种
 *   红颜
 *
 *   ...（其余按 key 分组）
 */

import fs from 'node:fs/promises'
import path from 'node:path'

// 记忆 key → 中文标题（与 memory-prompt-enhancer 保持一致）
const MEMORY_KEY_TITLES: Record<string, string> = {
  user_name: '称呼',
  greenhouse_info: '大棚/场地',
  strawberry_variety: '草莓品种',
  growth_stage: '生育期',
  focus_area: '关注重点',
  preferred_temperature: '偏好温度',
  preferred_humidity: '偏好湿度',
  preferred_light: '偏好光照',
  preferred_watering_time: '习惯浇水时间',
  preferred_watering_duration: '习惯浇水时长',
  watering_habit: '浇水习惯',
  preferred_strawberry_variety: '草莓品种',
  notification_preference: '通知偏好',
  response_detail_level: '回复详细度',
  response_style: '回复风格',
  automation_preference: '自动化倾向',
  language_style: '语言风格',
  preference: '其他偏好',
}

// key 归一化：把同义 key 归一到标准 key（避免标题冲突导致解析错乱）
// 例如 preferred_strawberry_variety 与 strawberry_variety 都指"草莓品种"
const KEY_ALIASES: Record<string, string> = {
  preferred_strawberry_variety: 'strawberry_variety',
}

/** 记忆条目 */
export interface UserMemoryEntry {
  key: string
  value: string
}

/**
 * 获取记忆 key 的中文标签（供前端展示用）
 */
export function getMemoryKeyLabel(key: string): string {
  return MEMORY_KEY_TITLES[key] || key
}

/**
 * 获取用户记忆文件路径
 */
function getMemoryFilePath(userId: number): string {
  return path.join(process.cwd(), 'data', 'user-memory', `${userId}.md`)
}

/**
 * 确保记忆目录存在
 */
async function ensureMemoryDir(): Promise<void> {
  const dir = path.join(process.cwd(), 'data', 'user-memory')
  await fs.mkdir(dir, { recursive: true })
}

/**
 * 读取用户记忆文件，解析为「key → value」映射
 * 文件不存在或解析失败时返回空对象（不抛异常）
 */
export async function readUserMemory(userId: number): Promise<Record<string, string>> {
  try {
    const filePath = getMemoryFilePath(userId)
    const raw = await fs.readFile(filePath, 'utf-8')
    return parseMemoryMarkdown(raw)
  } catch {
    return {} // 文件不存在或无权限，视为无记忆
  }
}

/**
 * 解析记忆 Markdown，提取「## 标题」段下的值
 */
function parseMemoryMarkdown(raw: string): Record<string, string> {
  const result: Record<string, string> = {}

  // 建立 title → key 的反向映射（用"第一个匹配"，避免同义标题覆盖）
  const titleToKey: Record<string, string> = {}
  for (const [key, title] of Object.entries(MEMORY_KEY_TITLES)) {
    if (!titleToKey[title]) {
      titleToKey[title] = key
    }
  }

  // 按「## 标题」切分，提取每段的值
  const lines = raw.split('\n')
  let currentTitle = ''
  let currentValues: string[] = []

  const flush = () => {
    if (currentTitle && currentValues.length > 0) {
      const key = titleToKey[currentTitle] || currentTitle
      result[key] = currentValues.join('；')
    }
    currentValues = []
  }

  for (const line of lines) {
    const titleMatch = line.match(/^##\s+(.+)$/)
    if (titleMatch) {
      flush()
      currentTitle = titleMatch[1].trim()
      currentValues = []
    } else if (currentTitle) {
      const trimmed = line.trim()
      // 跳过列表标记、空行、分隔线、表头
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---') && !trimmed.startsWith('最后更新')) {
        currentValues.push(trimmed.replace(/^[-*]\s+/, '').trim())
      }
    }
  }
  flush()

  return result
}

/**
 * 将记忆写入用户 md 文件（合并更新，而非覆盖）
 *
 * @param memories 要写入的记忆条目。相同 key 会覆盖旧值，不同 key 保留。
 */
export async function writeUserMemory(userId: number, memories: UserMemoryEntry[]): Promise<void> {
  if (memories.length === 0) return

  await ensureMemoryDir()

  // 先读已有记忆，合并
  const existing = await readUserMemory(userId)
  for (const m of memories) {
    if (m.key && m.value) {
      // 归一化 key（同义 key 归一到标准 key）
      const normalizedKey = KEY_ALIASES[m.key] || m.key
      existing[normalizedKey] = m.value
    }
  }

  // 生成 Markdown
  const lines: string[] = []
  lines.push('# 用户记忆档案')
  lines.push('')
  lines.push(`最后更新：${new Date().toLocaleString('zh-CN', { hour12: false })}`)
  lines.push('')

  // 优先输出「称呼」（用户姓名最重要，置顶）
  const orderedKeys = Object.keys(existing)
  const nameKey = 'user_name'
  const ordered = [nameKey, ...orderedKeys.filter(k => k !== nameKey && existing[k])].filter(k => existing[k])

  for (const key of ordered) {
    const title = MEMORY_KEY_TITLES[key] || key
    lines.push(`## ${title}`)
    lines.push(existing[key])
    lines.push('')
  }

  const filePath = getMemoryFilePath(userId)
  await fs.writeFile(filePath, lines.join('\n'), 'utf-8')
}

/**
 * 将记忆 md 文件内容转成可注入 prompt 的文本片段
 *
 * 直接读 md 文件内容（而非解析），让 AI 看到完整的人类可读档案
 */
export async function getUserMemoryForPrompt(userId: number): Promise<string> {
  try {
    const filePath = getMemoryFilePath(userId)
    const raw = await fs.readFile(filePath, 'utf-8')
    if (!raw.trim()) return ''
    return raw.trim()
  } catch {
    return '' // 无记忆文件
  }
}

/**
 * 删除用户记忆文件（供"清空记忆"功能使用）
 */
export async function clearUserMemory(userId: number): Promise<void> {
  try {
    const filePath = getMemoryFilePath(userId)
    await fs.unlink(filePath)
  } catch {
    // 文件不存在，忽略
  }
}
