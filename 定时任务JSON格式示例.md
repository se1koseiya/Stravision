# 定时任务 JSON 格式示例

## 正确的 JSON 格式

### 1. 用户提醒任务（最简单）

```json
{
  "action": "schedule_task",
  "title": "10秒后提醒",
  "delay_seconds": 10,
  "task_action": "user_reminder"
}
```

**必需字段**:
- `action`: 必须是 `"schedule_task"`
- `title`: 任务标题
- `delay_seconds` 或 `cron`: 时间参数（二选一）
- `task_action`: 任务类型

### 2. 智能分析任务

```json
{
  "action": "schedule_task",
  "title": "5分钟后复查CO2浓度",
  "delay_seconds": 300,
  "task_action": "agent_analysis"
}
```

### 3. 设备控制任务

```json
{
  "action": "schedule_task",
  "title": "10秒后打开水泵",
  "delay_seconds": 10,
  "task_action": "toggle_relay",
  "device": 5,
  "value": 1
}
```

**额外字段**（仅设备控制需要）:
- `device`: 设备 ID（5=水泵, 6=风扇, 7=RGB灯, 8=白光灯）
- `value`: 设备值（1=开启, 0=关闭）

### 4. 周期性任务

```json
{
  "action": "schedule_task",
  "title": "每天早上8点提醒",
  "cron": "0 8 * * *",
  "task_action": "user_reminder"
}
```

## 常见错误格式

### ❌ 错误 1: action 字段错误

```json
{
  "action": "create_task",  // ❌ 错误！应该是 "schedule_task"
  "title": "提醒",
  "delay_seconds": 10,
  "task_action": "user_reminder"
}
```

### ❌ 错误 2: 缺少必需字段

```json
{
  "action": "schedule_task",
  "title": "提醒"
  // ❌ 缺少 delay_seconds 或 cron
  // ❌ 缺少 task_action
}
```

### ❌ 错误 3: 时间参数格式错误

```json
{
  "action": "schedule_task",
  "title": "10秒后提醒",
  "delay_seconds": "10",  // ❌ 错误！应该是数字 10，不是字符串 "10"
  "task_action": "user_reminder"
}
```

### ❌ 错误 4: task_action 拼写错误

```json
{
  "action": "schedule_task",
  "title": "提醒",
  "delay_seconds": 10,
  "task_action": "reminder"  // ❌ 错误！应该是 "user_reminder"
}
```

### ❌ 错误 5: 设备控制任务缺少 device 字段

```json
{
  "action": "schedule_task",
  "title": "10秒后打开水泵",
  "delay_seconds": 10,
  "task_action": "toggle_relay"
  // ❌ 缺少 device 和 value 字段
}
```

## 完整示例（带输出格式）

### 示例 1: 简单提醒

**用户输入**: "10秒后提醒我"

**AI 应该输出**:

```
好的，我为您创建一个10秒后的提醒任务。

```json
{
  "action": "schedule_task",
  "title": "10秒后提醒",
  "delay_seconds": 10,
  "task_action": "user_reminder"
}
```

<SCHEDULED_TASKS></SCHEDULED_TASKS>
```

**关键点**:
- ✅ 使用了 \`\`\`json 包裹
- ✅ action 是 "schedule_task"
- ✅ delay_seconds 是数字 10（不是字符串 "10"）
- ✅ task_action 使用下划线（user_reminder）
- ✅ 最后有 <SCHEDULED_TASKS></SCHEDULED_TASKS>

---

### 示例 2: 环境复查（专家模式）

**用户输入**: "二氧化碳浓度太高了"

**AI 应该输出**:

```
好的，我检测到当前CO2浓度为1200ppm，已超过适宜范围。我将立即打开风扇进行通风换气，同时创建一个5分钟后的环境复查任务。

```json
{
  "action": "toggle_relay",
  "device": 6,
  "value": 1
}
```

```json
{
  "action": "schedule_task",
  "title": "5分钟后复查CO2浓度",
  "delay_seconds": 300,
  "task_action": "agent_analysis"
}
```

<SCHEDULED_TASKS></SCHEDULED_TASKS>
```

**关键点**:
- ✅ 先执行设备控制（开风扇）
- ✅ 再创建定时任务（5分钟后复查）
- ✅ 两个 JSON 都用 \`\`\`json 包裹
- ✅ delay_seconds 是数字 300
- ✅ task_action 是 "agent_analysis"（让AI自动复查）

---

### 示例 3: 浇水任务

**用户输入**: "给草莓浇水30秒"

**AI 应该输出**:

```
好的，我将开启水泵浇水，30秒后自动关闭。

```json
{
  "action": "toggle_relay",
  "device": 5,
  "value": 1
}
```

```json
{
  "action": "schedule_task",
  "title": "30秒后关闭水泵",
  "delay_seconds": 30,
  "task_action": "toggle_relay",
  "device": 5,
  "value": 0
}
```

<SCHEDULED_TASKS></SCHEDULED_TASKS>
```

**关键点**:
- ✅ 立即开启水泵（value: 1）
- ✅ 创建定时任务30秒后关闭（value: 0）
- ✅ task_action 是 "toggle_relay"
- ✅ 包含了 device 和 value 字段

---

### 示例 4: 周期性任务

**用户输入**: "每天早上8点提醒我检查大棚"

**AI 应该输出**:

```
好的，我为您创建一个每天早上8点的定时提醒。

```json
{
  "action": "schedule_task",
  "title": "每天早上8点检查大棚",
  "cron": "0 8 * * *",
  "task_action": "user_reminder"
}
```

<SCHEDULED_TASKS></SCHEDULED_TASKS>
```

**关键点**:
- ✅ 使用 cron 而不是 delay_seconds
- ✅ cron 是字符串格式
- ✅ 其他字段格式正确

## 字段说明

### action (必需)
- 类型: `string`
- 值: `"schedule_task"`
- 说明: 标识这是一个定时任务

### title (必需)
- 类型: `string`
- 说明: 任务标题，简短描述任务内容

### delay_seconds (可选)
- 类型: `number`
- 说明: 延迟秒数
- 示例: 
  - 10秒 = 10
  - 5分钟 = 300
  - 1小时 = 3600
  - 2小时 = 7200

### cron (可选)
- 类型: `string`
- 说明: Cron 表达式
- 示例:
  - "0 8 * * *" = 每天早上8点
  - "0 */2 * * *" = 每2小时
  - "0 0 * * 0" = 每周日午夜

**注意**: `delay_seconds` 和 `cron` 二选一，不能同时使用

### task_action (必需)
- 类型: `string`
- 可选值:
  - `"user_reminder"`: 用户提醒
  - `"agent_analysis"`: 智能分析
  - `"toggle_relay"`: 开关设备
  - `"set_led"`: 调节灯光

### device (可选)
- 类型: `number`
- 说明: 设备 ID，仅 `toggle_relay` 需要
- 可选值:
  - 5 = 水泵
  - 6 = 风扇
  - 7 = RGB 补光灯
  - 8 = 白光灯

### value (可选)
- 类型: `number`
- 说明: 设备值，仅 `toggle_relay` 需要
- 可选值:
  - 1 = 开启
  - 0 = 关闭

### params (可选)
- 类型: `object`
- 说明: 其他参数，用于 `set_led` 等

## 调试技巧

### 1. 检查 JSON 是否有效

在浏览器控制台中：

```javascript
const json = '你的JSON字符串'
try {
  const parsed = JSON.parse(json)
  console.log('✅ JSON 有效:', parsed)
} catch (e) {
  console.error('❌ JSON 无效:', e.message)
}
```

### 2. 检查必需字段

```javascript
const data = JSON.parse(json)
const required = ['action', 'title', 'task_action']
const missing = required.filter(field => !data[field])
if (missing.length > 0) {
  console.error('❌ 缺少字段:', missing)
} else {
  console.log('✅ 所有必需字段都存在')
}
```

### 3. 检查 action 字段

```javascript
if (data.action !== 'schedule_task') {
  console.error('❌ action 字段错误:', data.action)
} else {
  console.log('✅ action 字段正确')
}
```

---

**更新时间**: 2026-04-23
**用途**: 帮助 AI 输出正确的定时任务 JSON 格式
