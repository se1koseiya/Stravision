# 定时任务创建问题修复指南

## 问题描述
用户在 AI 助手中要求创建定时任务时，AI 没有输出正确的 JSON 格式，导致任务无法自动创建。

## 根本原因分析

### 1. 系统架构
- **前端解析**: `app/ai-assistant/page.tsx` 第 3872-3874 行检测 `action === 'schedule_task'` 的 JSON
- **自动创建**: `components/ai/schedule-card.tsx` 组件在挂载时自动调用 API 创建任务
- **API 端点**: `/api/scheduler/tasks` (POST) 保存任务到数据库
- **任务列表**: `<SCHEDULED_TASKS>` 标签渲染 `ScheduledTasksList` 组件显示已创建的任务

### 2. 正确的输出格式
AI 必须输出以下格式：

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

### 3. 当前问题
AI 只输出文字描述，没有输出 JSON 代码块，例如：
```
好的，我为您创建了一个10秒后的提醒任务。
```

## 已实施的修复

### 修复 1: 优化提示词模板 (lib/ai/prompt-templates.ts)
- ✅ 移除了嵌套的代码块（避免混淆）
- ✅ 使用"三个反引号"文字描述代替实际反引号
- ✅ 增强了严格要求说明
- ✅ 添加了更多示例
- ✅ 明确了 action 字段必须是 "schedule_task"

### 修复 2: 提高指令优先级
- ✅ 定时任务指令放在系统提示词的前部（第2优先级，仅次于禁用功能警告）
- ✅ 在设备控制指令之前

### 修复 3: 自动创建机制
- ✅ `ScheduleCard` 组件在挂载时自动创建任务（无需用户点击）
- ✅ 显示创建状态：加载中 → 成功/失败
- ✅ 成功后显示 Toast 通知，带"查看列表"按钮

## 测试步骤

### 1. 重启开发服务器
```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm run dev
```

### 2. 测试用例

#### 测试 1: 简单提醒任务
**输入**: "10秒后提醒我"
**预期输出**:
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

**预期行为**:
1. 显示 "正在创建定时任务..." 加载状态
2. 显示 "✅ 定时任务已创建：10秒后提醒" 成功消息
3. Toast 通知显示，带"查看列表"按钮
4. 右侧任务列表自动显示新任务

#### 测试 2: 设备控制任务
**输入**: "10秒后打开水泵"
**预期输出**:
```
好的，我为您创建一个10秒后打开水泵的任务。

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

<SCHEDULED_TASKS></SCHEDULED_TASKS>
```

#### 测试 3: Cron 定时任务
**输入**: "每天早上8点提醒我"
**预期输出**:
```
好的，我为您创建一个每天早上8点的提醒任务。

```json
{
  "action": "schedule_task",
  "title": "每天早上8点提醒",
  "cron": "0 8 * * *",
  "task_action": "user_reminder"
}
```

<SCHEDULED_TASKS></SCHEDULED_TASKS>
```

### 3. 调试检查点

#### 浏览器控制台
打开浏览器开发者工具 (F12)，查看以下日志：

1. **系统提示词检查**:
```
[Schedule Task] ✅ System prompt includes SCHEDULE_TASK instructions
```
如果看到 `⚠️ System prompt does NOT include SCHEDULE_TASK instructions`，说明提示词未正确加载。

2. **内容检查**:
```
[Schedule Task] 🔍 Checking content for SCHEDULE_TASK tag...
[Schedule Task] Content length: XXX
[Schedule Task] Content preview: ...
```

3. **ScheduleCard 日志**:
```
[ScheduleCard] Auto-creating task on mount
[ScheduleCard] Creating task: 10秒后提醒
[ScheduleCard] Task created successfully
```

#### Network 标签
检查 POST 请求到 `/api/scheduler/tasks`:
- **Status**: 200 OK
- **Response**: 包含创建的任务 ID

### 4. 常见问题排查

#### 问题 A: AI 不输出 JSON
**症状**: AI 只输出文字，没有 JSON 代码块
**可能原因**:
1. 开发服务器未重启（提示词更改未生效）
2. AI 模型不支持结构化输出
3. 提示词被其他指令覆盖

**解决方案**:
1. 重启开发服务器
2. 检查浏览器控制台是否有 `System prompt includes SCHEDULE_TASK` 日志
3. 尝试更明确的指令："请创建一个10秒后的定时任务，并输出 JSON 格式"

#### 问题 B: JSON 格式错误
**症状**: AI 输出了 JSON，但格式不正确
**可能原因**:
1. 缺少 `action` 字段
2. `action` 值不是 `"schedule_task"`
3. JSON 语法错误

**解决方案**:
检查 JSON 是否包含必需字段：
- `action`: "schedule_task"
- `title`: 任务标题
- `delay_seconds` 或 `cron`: 时间参数
- `task_action`: 任务类型

#### 问题 C: 任务未创建
**症状**: JSON 输出正确，但任务未出现在列表中
**可能原因**:
1. API 调用失败
2. 数据库错误
3. ScheduleCard 组件未渲染

**解决方案**:
1. 检查浏览器控制台的 `[ScheduleCard]` 日志
2. 检查 Network 标签的 API 请求
3. 检查是否有错误消息

#### 问题 D: 任务列表不显示
**症状**: 任务创建成功，但右侧列表不显示
**可能原因**:
1. AI 未输出 `<SCHEDULED_TASKS>` 标签
2. 组件渲染错误

**解决方案**:
1. 确认 AI 输出包含 `<SCHEDULED_TASKS></SCHEDULED_TASKS>`
2. 手动刷新页面
3. 检查浏览器控制台错误

## 下一步行动

### 立即执行
1. ✅ 重启开发服务器
2. ⏳ 测试简单提醒任务
3. ⏳ 测试设备控制任务
4. ⏳ 验证任务列表显示

### 如果问题仍然存在
1. 检查 AI 模型是否支持结构化输出
2. 考虑在前端添加"创建任务"按钮作为备选方案
3. 考虑使用自然语言解析器提取任务信息
4. 考虑在服务端解析自然语言并创建任务

## 技术细节

### 代码位置
- **提示词模板**: `lib/ai/prompt-templates.ts` (SCHEDULE_TASK_INSTRUCTION_COMPACT)
- **前端解析**: `app/ai-assistant/page.tsx` (第 3872-3874 行)
- **任务卡片**: `components/ai/schedule-card.tsx`
- **任务列表**: `components/ai/scheduled-tasks-list.tsx`
- **API 路由**: `app/api/scheduler/tasks/route.ts`
- **配置文件**: `data/ai-features-config.json` (enableScheduleTask: true)

### 数据流
```
用户输入 → AI 模型 → JSON 输出 → 前端解析 → ScheduleCard 渲染 → 
自动调用 API → 保存到数据库 → Toast 通知 → 任务列表更新
```

### 关键检查点
1. ✅ `enableScheduleTask: true` in config
2. ✅ `SCHEDULE_TASK_INSTRUCTION_COMPACT` in prompt
3. ⏳ AI 输出包含 ```json 代码块
4. ⏳ JSON 包含 `"action": "schedule_task"`
5. ⏳ ScheduleCard 自动创建任务
6. ⏳ API 返回 200 OK
7. ⏳ 任务出现在列表中

## 更新日志
- 2026-04-23: 优化提示词模板，移除嵌套代码块
- 2026-04-23: 创建此修复指南
