/**
 * 解析 AI 响应中的定时任务标记
 * 支持两种格式：
 *  1. 旧格式：<SCHEDULE_TASK>{...}</SCHEDULE_TASK>（已废弃，保留兼容）
 *  2. 新格式：```json { "action": "schedule_task", ... } ``` （当前唯一正确格式）
 */

export interface ScheduleTaskData {
  description: string
  delayMinutes: number
  taskType: 'analysis' | 'notification' | 'reminder' | 'custom' | 'device_control'
  payload: any
}

/**
 * 从 AI 响应中提取定时任务
 * 优先尝试新格式（markdown 代码块），回退旧格式（XML 标签）
 */
export function parseScheduleTask(content: string): ScheduleTaskData | null {
  console.log('[parseScheduleTask] Starting to parse content...')

  // 🔥 优先：新格式 — 从 markdown 代码块中提取 schedule_task JSON
  const newFormat = parseScheduleTaskFromCodeBlock(content)
  if (newFormat) {
    console.log('[parseScheduleTask] ✅ Found new-format schedule_task JSON in code block')
    return newFormat
  }

  // 旧格式：<SCHEDULE_TASK>...</SCHEDULE_TASK>（已废弃，仅作兼容）
  const match = content.match(/<SCHEDULE_TASK>([\s\S]*?)<\/SCHEDULE_TASK>/)
  if (!match) {
    console.log('[parseScheduleTask] ❌ No schedule_task found (new or old format)')
    return null
  }

  console.log('[parseScheduleTask] ⚠️ Found deprecated <SCHEDULE_TASK> tag, parsing legacy format')
  try {
    const data = JSON.parse(match[1])
    return validateAndNormalize(data)
  } catch (error) {
    console.error('[parseScheduleTask] Failed to parse legacy tag:', error)
    return null
  }
}

/**
 * 从 markdown 代码块中提取 schedule_task JSON
 * 匹配：```json\n{ "action": "schedule_task", ... }\n```
 */
function parseScheduleTaskFromCodeBlock(content: string): ScheduleTaskData | null {
  if (!content) return null

  // 匹配所有 ```json ... ``` 代码块（支持换行符和不完整闭合）
  const codeBlockRegex = /```json\s*([\s\S]*?)(?:```|$)/g
  let match: RegExpExecArray | null

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const jsonText = match[1].trim()
    if (!jsonText) continue

    // 必须是 { 开头的对象
    if (!jsonText.startsWith('{')) continue

    let parsed: any
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      // 流式输出时 JSON 可能未完整闭合，尝试用栈匹配
      parsed = tryParseIncompleteJson(jsonText)
      if (!parsed) continue
    }

    // 找到 schedule_task 对象
    const obj = Array.isArray(parsed)
      ? parsed.find((p) => p && p.action === 'schedule_task')
      : parsed.action === 'schedule_task'
        ? parsed
        : null

    if (obj) {
      return validateAndNormalize(obj)
    }
  }

  return null
}

/**
 * 尝试从不完整的 JSON 中提取（流式输出时 JSON 可能在尾部被截断）
 */
function tryParseIncompleteJson(text: string): any {
  // 从右往左找 }，逐个尝试
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === '}') {
      try {
        return JSON.parse(text.substring(0, i + 1))
      } catch {
        continue
      }
    }
  }
  return null
}

/**
 * 统一验证和规范化 schedule_task 数据
 * 接受旧字段（description/delayMinutes/taskType）和新字段（title/delay_seconds/task_action），
 * 输出旧格式（保持兼容），新格式字段映射到旧格式字段
 */
function validateAndNormalize(data: any): ScheduleTaskData | null {
  if (!data) return null

  // 验证必需字段（新格式）
  const isNewFormat = data.action === 'schedule_task'
  if (isNewFormat) {
    if (!data.title) {
      console.warn('[Schedule Task Parser] New format: missing title')
      return null
    }
    if (!data.task_action) {
      console.warn('[Schedule Task Parser] New format: missing task_action')
      return null
    }
    if (!data.delay_seconds && !data.cron && !data.execute_at) {
      console.warn('[Schedule Task Parser] New format: missing time field (delay_seconds/cron/execute_at)')
      return null
    }

    // 新格式 → 旧格式字段映射
    let delayMinutes = 0
    if (typeof data.delay_seconds === 'number') {
      delayMinutes = data.delay_seconds / 60
    } else if (data.cron) {
      // cron 表达式：取最近一分钟的近似值（粗略估算）
      delayMinutes = 1
    } else if (data.execute_at) {
      const executeAt = new Date(data.execute_at).getTime()
      delayMinutes = Math.max(0.167, (executeAt - Date.now()) / 60000)
    }

    // 映射 task_action → taskType
    const taskTypeMap: Record<string, ScheduleTaskData['taskType']> = {
      'toggle_relay': 'device_control',
      'set_led': 'device_control',
      'agent_analysis': 'analysis',
      'user_reminder': 'reminder',
    }
    const taskType = taskTypeMap[data.task_action] || 'custom'

    // 构建 payload
    const payload: any = { ...data }
    delete payload.description
    delete payload.delayMinutes
    delete payload.taskType

    return {
      description: data.title,
      delayMinutes,
      taskType,
      payload,
    }
  }

  // 旧格式校验
  if (!data.description || !data.delayMinutes || !data.taskType) {
    console.warn('[Schedule Task Parser] Legacy format: missing required fields:', data)
    return null
  }
  if (data.delayMinutes < 0.167 || data.delayMinutes > 1440) {
    console.warn('[Schedule Task Parser] Legacy format: invalid delay minutes:', data.delayMinutes)
    return null
  }

  return {
    description: data.description,
    delayMinutes: data.delayMinutes,
    taskType: data.taskType,
    payload: data.payload || {},
  }
}

/**
 * 从内容中移除定时任务标记
 * 同时清理旧 <SCHEDULE_TASK> 标签和新的 ```json ... ``` 代码块
 */
export function removeScheduleTaskTag(content: string): string {
  if (!content) return content

  // 1. 移除旧 <SCHEDULE_TASK>...</SCHEDULE_TASK> 标签
  let result = content.replace(/<SCHEDULE_TASK>[\s\S]*?<\/SCHEDULE_TASK>/g, '').trim()

  // 2. 移除包含 schedule_task 的 markdown 代码块
  result = result.replace(/```json\s*[\s\S]*?"action"\s*:\s*"schedule_task"[\s\S]*?```/g, '').trim()

  // 3. 移除 <SCHEDULED_TASKS></SCHEDULED_TASKS> 占位标签
  result = result.replace(/<SCHEDULED_TASKS\s*\/?>(?:<[\s\S]*?<\/SCHEDULED_TASKS>)?/g, '').trim()

  return result
}

/**
 * 生成定时任务的 System Prompt（旧格式，保留兼容但不再使用）
 */
export function getScheduleTaskSystemPrompt(): string {
  return `
## 🔔 自动化定时任务指令 (Unified Scheduler)

当用户要求在未来某个时间执行任务时（如"X分钟后..."、"每天几点..."），你必须输出一个 \`schedule_task\` 动作的 JSON 代码块。系统会自动将其存入后端数据库。

### ✅ 统一格式
\`\`\`json
{
  "action": "schedule_task",
  "title": "任务展示名称",
  "delay_seconds": 300,
  "cron": "0 8 * * *",
  "task_action": "toggle_relay | set_led | agent_analysis | user_reminder",
  "device": 5,
  "value": 1,
  "params": {}
}
\`\`\`
*注：delay_seconds（延时执行）与 cron（周期性执行）二选一。*

### 📋 任务类型 (task_action)
1. **toggle_relay**: 开关继电器设备（需提供 device 和 value）。
2. **set_led**: 调节 RGB 灯光（需提供 params: {r, g, b, w}）。
3. **agent_analysis**: 触发智能分析任务（将在指定时间自动重新运行 AI 分析环境）。
4. **user_reminder**: 发送用户提醒。

### ⏱️ 时间设置
- **delay_seconds**: 从现在起延迟的秒数（如 1小时后 = 3600）。
- **cron**: 标准 Cron 表达式（分 时 日 月 周）。

### ⚠️ 重要规则
1. **持久化存储**：所有通过此格式创建的任务都会保存至数据库，即使刷新页面也不会丢失。
2. **禁止重复创建**：如果消息开头包含 "🔔 定时任务提醒"，说明当前正是任务执行中，严禁再次创建相同的定时任务，避免死循环。
3. **确认语**：在输出 JSON 之前，请用自然语言友好地告知用户："好的，已为您设定任务，将在...执行"。
`;
}
