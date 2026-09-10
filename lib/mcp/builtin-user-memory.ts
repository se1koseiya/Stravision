/**
 * 内置用户记忆工具（builtin-user-memory）
 *
 * 设计目标：把"记忆"从隐式提取（LLM/正则自动猜）改为**显式工具**，让 AI 在对话中
 * 自主判断何时调用——用户说"我叫小朱"就记住，说"记错了，我叫小朱不叫小张"就更新，
 * 说"别记我名字了"就删除。这比穷举正则句式可靠得多。
 *
 * 3 个工具：
 *   - remember_user_info   记住/更新用户的一条信息（同 key 覆盖，即天然支持纠错）
 *   - list_user_memory     列出已记住的用户信息（AI 可先查再决定要不要改）
 *   - forget_user_info     删除用户的一条信息（用户说"别记了/删掉/别叫我XX"时）
 *
 * 底层复用 lib/ai/user-memory-file-service.ts 的 md 文件读写（每个用户一个 md），
 * 并同步落库到 user_preferences（保留原有 db 备份/报告能力）。
 */

import { readUserMemory, writeUserMemory, clearUserMemory, getMemoryKeyLabel } from '@/lib/ai/user-memory-file-service'
import { setUserPreference, deleteUserPreference } from '@/lib/db/agent-memory-service'
import type { AgentToolContext, ToolCallResult } from './mcp-tool-executor'

/**
 * 清洗 value：去掉主语前缀（"我""我的""我叫"等），避免写入"我小朱"这类脏值
 */
function cleanValue(raw: string): string {
  return String(raw ?? '')
    .trim()
    .replace(/^(我叫|我是|我的名字是|我的名字叫|你可以叫我|喊我|称呼我|我姓|我名|我的|我)/, '')
    .trim()
}

// 允许 AI 写入的 key 白名单（与 memory-prompt-enhancer 的 MEMORY_KEY_TITLES 对齐）
const KNOWN_KEYS: Record<string, string> = {
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
  notification_preference: '通知偏好',
  response_detail_level: '回复详细度',
  response_style: '回复风格',
  automation_preference: '自动化倾向',
  language_style: '语言风格',
  preference: '其他偏好',
}

// 支持用户用中文口语描述 key（"名字/称呼"→user_name），AI 也可能直接传中文
const KEY_ALIAS_INPUT: Record<string, string> = {
  称呼: 'user_name',
  名字: 'user_name',
  姓名: 'user_name',
  叫我: 'user_name',
  大棚: 'greenhouse_info',
  场地: 'greenhouse_info',
  棚: 'greenhouse_info',
  品种: 'strawberry_variety',
  草莓: 'strawberry_variety',
  生育期: 'growth_stage',
  定植: 'growth_stage',
  关注: 'focus_area',
  目标: 'focus_area',
  温度: 'preferred_temperature',
  湿度: 'preferred_humidity',
  浇水: 'watering_habit',
}

function normalizeKey(raw: string): string {
  const key = String(raw || '').trim()
  // 直接命中白名单
  if (KNOWN_KEYS[key]) return key
  // 中文别名归一
  if (KEY_ALIAS_INPUT[key]) return KEY_ALIAS_INPUT[key]
  // 传入的本身就是合法 snake_case key（不在白名单也放行，作为自定义偏好）
  if (/^[a-z][a-z0-9_]{0,59}$/.test(key)) return key
  return key
}

async function execRemember(args: Record<string, any>, ctx?: AgentToolContext): Promise<ToolCallResult> {
  if (!ctx?.userId) return { success: false, error: '无法获取用户信息，请重新登录' }

  const key = normalizeKey(args.key)
  const value = cleanValue(args.value)
  if (!key || !value) return { success: false, error: '缺少参数：需要 key（信息类型）和 value（具体内容）' }
  if (value.length > 60) return { success: false, error: 'value 过长（>60 字），请精简' }

  try {
    // 写 md 文件（唯一真相源，同 key 覆盖 = 天然支持纠错）
    await writeUserMemory(ctx.userId, [{ key, value }])

    // 同步落库（保留 db 备份）
    try {
      await setUserPreference({
        user_id: ctx.userId,
        preference_key: key,
        preference_value: value,
        confidence: 0.95,
      })
    } catch (e) {
      console.warn('[UserMemory] db 落库失败（md 已写入，不影响记忆）:', e)
    }

    return {
      success: true,
      data: {
        key,
        label: getMemoryKeyLabel(key),
        value,
        message: `已记住：${getMemoryKeyLabel(key)}「${value}」`,
      },
    }
  } catch (e: any) {
    return { success: false, error: `记忆写入失败: ${e.message}` }
  }
}

async function execListMemory(args: Record<string, any>, ctx?: AgentToolContext): Promise<ToolCallResult> {
  if (!ctx?.userId) return { success: false, error: '无法获取用户信息，请重新登录' }

  try {
    const memory = await readUserMemory(ctx.userId)
    const entries = Object.entries(memory)
      .filter(([k, v]) => k && v)
      .map(([k, v]) => ({ key: k, label: getMemoryKeyLabel(k), value: v }))

    if (entries.length === 0) {
      return { success: true, data: { total: 0, entries: [], message: '目前还没有记住关于该用户的任何信息。' } }
    }

    return {
      success: true,
      data: {
        total: entries.length,
        entries,
        message: entries.map(e => `${e.label}：${e.value}`).join('；'),
      },
    }
  } catch (e: any) {
    return { success: false, error: `读取记忆失败: ${e.message}` }
  }
}

async function execForget(args: Record<string, any>, ctx?: AgentToolContext): Promise<ToolCallResult> {
  if (!ctx?.userId) return { success: false, error: '无法获取用户信息，请重新登录' }

  const key = normalizeKey(args.key)

  // 支持"清空全部"：传 key='*' 或 key='all'
  if (key === '*' || key === 'all') {
    try {
      await clearUserMemory(ctx.userId)
      return { success: true, data: { cleared: true, message: '已清空该用户的所有记忆。' } }
    } catch (e: any) {
      return { success: false, error: `清空记忆失败: ${e.message}` }
    }
  }

  if (!key) return { success: false, error: '缺少参数：需要 key（要删除的信息类型），或传 "*" 清空全部' }

  try {
    const existing = await readUserMemory(ctx.userId)
    const had = !!existing[key]

    if (!had) {
      return { success: true, data: { key, deleted: false, message: `本来就没有记住「${getMemoryKeyLabel(key)}」这一项。` } }
    }

    // 从 md 里删除该 key：读出剩余项后重写
    delete existing[key]
    const remaining = Object.entries(existing).map(([k, v]) => ({ key: k, value: v }))
    // writeUserMemory 会先读旧文件再合并，无法"删除"；这里直接清空后重写剩余项
    await clearUserMemory(ctx.userId)
    if (remaining.length > 0) {
      await writeUserMemory(ctx.userId, remaining)
    }

    // 同步删 db
    try {
      await deleteUserPreference(ctx.userId, key)
    } catch (e) {
      console.warn('[UserMemory] db 删除失败（md 已删，不影响）:', e)
    }

    return { success: true, data: { key, label: getMemoryKeyLabel(key), deleted: true, message: `已忘记「${getMemoryKeyLabel(key)}」。` } }
  } catch (e: any) {
    return { success: false, error: `删除记忆失败: ${e.message}` }
  }
}

/**
 * 主分发函数
 */
export async function executeUserMemoryTool(
  functionName: string,
  args: Record<string, any>,
  agentContext?: AgentToolContext
): Promise<ToolCallResult> {
  console.log(`[UserMemory] Calling tool: ${functionName}, userId: ${agentContext?.userId || 'none'}, args:`, args)
  switch (functionName) {
    case 'remember_user_info':
      return await execRemember(args, agentContext)
    case 'list_user_memory':
      return await execListMemory(args, agentContext)
    case 'forget_user_info':
      return await execForget(args, agentContext)
    default:
      return { success: false, error: `未知的记忆工具: ${functionName}` }
  }
}
