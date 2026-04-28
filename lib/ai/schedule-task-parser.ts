/**
 * 解析 AI 响应中的定时任务标记
 */

export interface ScheduleTaskData {
  description: string
  delayMinutes: number
  taskType: 'analysis' | 'notification' | 'reminder' | 'custom' | 'device_control'
  payload: any
}

/**
 * 从 AI 响应中提取定时任务
 */
export function parseScheduleTask(content: string): ScheduleTaskData | null {
  console.log('[parseScheduleTask] Starting to parse content...')
  const match = content.match(/<SCHEDULE_TASK>([\s\S]*?)<\/SCHEDULE_TASK>/)
  
  if (!match) {
    console.log('[parseScheduleTask] No SCHEDULE_TASK tag found')
    return null
  }
  
  console.log('[parseScheduleTask] Found SCHEDULE_TASK tag, content:', match[1])
  
  try {
    const data = JSON.parse(match[1])
    console.log('[parseScheduleTask] Parsed JSON:', data)
    
    // 验证必需字段
    if (!data.description || !data.delayMinutes || !data.taskType) {
      console.warn('[Schedule Task Parser] Missing required fields:', data)
      return null
    }
    
    // 验证延迟时间范围（最小10秒 = 0.167分钟，最大24小时 = 1440分钟）
    if (data.delayMinutes < 0.167 || data.delayMinutes > 1440) {
      console.warn('[Schedule Task Parser] Invalid delay minutes:', data.delayMinutes, '(must be >= 0.167 and <= 1440)')
      return null
    }
    
    console.log('[parseScheduleTask] Validation passed, returning task data')
    return {
      description: data.description,
      delayMinutes: data.delayMinutes,
      taskType: data.taskType,
      payload: data.payload || {}
    }
  } catch (error) {
    console.error('[Schedule Task Parser] Failed to parse:', error)
    return null
  }
}

/**
 * 从内容中移除定时任务标记
 */
export function removeScheduleTaskTag(content: string): string {
  return content.replace(/<SCHEDULE_TASK>[\s\S]*?<\/SCHEDULE_TASK>/g, '').trim()
}

/**
 * 生成定时任务的 System Prompt
 */
export function getScheduleTaskSystemPrompt(): string {
  return `
## 🔔 自动化定时任务指令 (Unified Scheduler)

当用户要求在未来某个时间执行任务时（如“X分钟后...”、“每天几点...”），你必须输出一个 \`schedule_task\` 动作的 JSON 代码块。系统会自动将其存入后端数据库。

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
3. **确认语**：在输出 JSON 之前，请用自然语言友好地告知用户：“好的，已为您设定任务，将在...执行”。
`;
}
