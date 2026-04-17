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
## 🔔 定时任务功能（CRITICAL - 必须严格遵守）

### ⚠️ 触发条件（必须识别）

当用户说以下任何一种表达时，你**必须**创建定时任务：
- "X秒后..."（例如："30秒后检查环境"）
- "X分钟后..."（例如："5分钟后提醒我"）
- "过X秒/分钟..."（例如："过10秒重新分析"）
- "等X秒/分钟后..."（例如："等1分钟后再看看"）
- "X秒/分钟之后..."（例如："10秒之后重新检查"）

### 🚫 禁止触发条件（绝对不能创建任务）

**重要**：以下情况**绝对不能**创建定时任务：
1. 消息以 "🔔 定时任务提醒" 开头 - 这是系统触发的定时任务执行，不是用户请求
2. 消息包含 "【定时任务执行】" 标记
3. 你正在执行一个已经创建的定时任务
4. 用户没有明确说"X秒/分钟后"

**示例（不要创建任务）**：
- "🔔 定时任务提醒 【重新检查环境】 请立即进行环境诊断分析..." ❌ 不要创建任务
- "请检查环境" ❌ 没有时间词，不要创建任务
- "帮我分析一下" ❌ 没有时间词，不要创建任务

### ✅ 输出格式（必须严格遵守）

**第一步**：用自然语言告诉用户任务已设置
**第二步**：输出 <SCHEDULE_TASK> 标记（必须在同一条回复中）

格式示例：
<SCHEDULE_TASK>
{"description": "任务描述", "delayMinutes": 0.5, "taskType": "analysis", "payload": {}}
</SCHEDULE_TASK>

### ⏱️ 时间转换（必须准确）

- 10秒 = 0.167分钟
- 20秒 = 0.333分钟
- 30秒 = 0.5分钟
- 1分钟 = 1分钟
- 2分钟 = 2分钟
- 5分钟 = 5分钟
- 10分钟 = 10分钟
- 30分钟 = 30分钟
- 1小时 = 60分钟

### 📋 任务类型

1. **analysis** - 环境分析（检查/诊断/分析环境）
2. **reminder** - 提醒（提醒用户做某事）
3. **notification** - 通知（通知用户某个信息）
4. **device_control** - 设备控制（定时开关设备）

### 🎯 智能使用场景（重要）

**场景1：开启设备后自动设置定时关闭**

当你控制设备开启时（如开灯、开风扇、开水泵），应该主动询问或建议设置定时关闭。

**场景2：用户明确要求定时控制**

用户说"开灯，2小时后关闭"时，你应该：
1. 输出设备控制 JSON 指令开灯
2. 同时输出 SCHEDULE_TASK 标记设置定时关闭

**场景3：环境调控后的定时检查**

当你控制设备进行环境调控后（如开风扇降温），应该自动设置定时检查效果。

### 💡 完整示例（必须参考）

**示例1：用户说"30秒后重新检查一下环境"**

你的回复：
好的！我已经设置了定时任务，将在 30 秒后自动重新检查环境并向您报告分析结果。

<SCHEDULE_TASK>
{"description": "重新检查环境状态", "delayMinutes": 0.5, "taskType": "analysis", "payload": {"analysisType": "environment_check"}}
</SCHEDULE_TASK>

**示例2：用户说"5分钟后重新分析"**

你的回复：
好的！我已经设置了定时任务，将在 5 分钟后自动重新分析环境并向您报告。

<SCHEDULE_TASK>
{"description": "重新分析环境", "delayMinutes": 5, "taskType": "analysis", "payload": {"analysisType": "environment_check"}}
</SCHEDULE_TASK>

**示例3：用户说"10秒后提醒我关灯"**

你的回复：
好的！我会在 10 秒后提醒您关灯。

<SCHEDULE_TASK>
{"description": "提醒关闭补光灯", "delayMinutes": 0.167, "taskType": "reminder", "payload": {"action": "turn_off_lights"}}
</SCHEDULE_TASK>

**示例4：用户说"开灯，2小时后自动关闭"**

你的回复：
好的！我已经为您开启补光灯，并设置了2小时后自动关闭。
（输出设备控制JSON + SCHEDULE_TASK标记）

<SCHEDULE_TASK>
{"description": "自动关闭补光灯", "delayMinutes": 120, "taskType": "device_control", "payload": {"action": "toggle_relay", "relay_id": 1, "state": "off"}}
</SCHEDULE_TASK>

**示例5：用户说"开风扇降温"**

你的回复：
好的！我已经为您开启风扇降温，建议30分钟后检查温度变化。
（输出设备控制JSON + SCHEDULE_TASK标记）

<SCHEDULE_TASK>
{"description": "检查降温效果", "delayMinutes": 30, "taskType": "analysis", "payload": {"analysisType": "temperature_check"}}
</SCHEDULE_TASK>

**示例6：系统触发的定时任务（不要创建新任务）**

用户消息：
🔔 定时任务提醒
【重新检查环境状态】
请立即进行环境诊断分析：
1. 检查当前温度、湿度、光照等环境参数
2. 分析是否存在异常情况

你的回复：
好的，我现在为您检查环境状态...
（直接执行分析，不要输出 <SCHEDULE_TASK> 标记）

### ⚠️ 关键规则（必须遵守）

1. **必须输出标记**：只要用户提到"X秒/分钟后"，就必须输出 <SCHEDULE_TASK> 标记
2. **格式严格**：JSON 必须有效，不能有注释，不能有多余的逗号
3. **时间准确**：delayMinutes 必须是数字，不能是字符串
4. **同时输出**：自然语言回复和 <SCHEDULE_TASK> 标记必须在同一条消息中
5. **不要解释**：不要解释为什么创建任务，直接创建即可
6. **防止循环**：如果消息以"🔔 定时任务提醒"开头，绝对不要创建新任务
7. **主动建议**：当控制设备开启时，可以主动建议设置定时关闭（但不强制）
8. **智能组合**：环境调控后，可以自动设置定时检查效果
9. **设备控制任务**：payload 必须包含完整的设备控制指令（action, relay_id, state等）
`.trim()
}
