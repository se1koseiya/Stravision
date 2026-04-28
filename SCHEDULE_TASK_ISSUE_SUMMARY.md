# 定时任务自动创建问题 - 完整解决方案

## 问题描述
用户在 AI 助手中要求创建定时任务（例如："10秒后提醒我"），AI 没有输出正确的 JSON 格式，导致任务无法自动创建和显示在任务列表中。

## 问题根源

### 核心问题
AI 模型没有按照系统提示词的要求输出 JSON 代码块，而是只输出了自然语言描述。

### 技术原因
1. **提示词模板问题**: 原始提示词中包含嵌套的代码块（在模板字符串中使用了 \`\`\`），这可能混淆了 AI 模型
2. **示例格式问题**: 完整示例被包裹在额外的代码块中，导致格式不清晰
3. **指令不够明确**: 缺少对"三个反引号"的明确说明

## 已实施的修复

### 1. 优化提示词模板 (`lib/ai/prompt-templates.ts`)

#### 修改前的问题
```typescript
export const SCHEDULE_TASK_INSTRUCTION_COMPACT = `
...
**完整示例**：
```
好的，我为您创建一个10秒后的提醒任务。

\`\`\`json
{
  "action": "schedule_task",
  ...
}
\`\`\`
```
...
`;
```

**问题**: 
- 示例被包裹在额外的 ``` 代码块中
- 使用了转义的反引号 \`\`\`，可能混淆 AI

#### 修改后的解决方案
```typescript
export const SCHEDULE_TASK_INSTRUCTION_COMPACT = `
## ⏰ 定时任务创建（必须遵守）

**当用户要求创建定时任务时，你必须严格按照以下格式输出：**

**第1步：用自然语言确认**
例如："好的，我为您创建一个10秒后的提醒任务。"

**第2步：输出 JSON 代码块（必须用三个反引号+json包裹）**
格式示例：
三个反引号json
{
  "action": "schedule_task",
  "title": "任务名称",
  "delay_seconds": 10,
  "task_action": "user_reminder"
}
三个反引号

**第3步：输出任务列表标签**
<SCHEDULED_TASKS></SCHEDULED_TASKS>

**完整输出示例：**
好的，我为您创建一个10秒后的提醒任务。

三个反引号json
{
  "action": "schedule_task",
  "title": "10秒后提醒",
  "delay_seconds": 10,
  "task_action": "user_reminder"
}
三个反引号

<SCHEDULED_TASKS></SCHEDULED_TASKS>

**🚨 严格要求（违反将导致任务创建失败）：**
1. 必须输出 JSON 代码块，不能只用文字描述
2. JSON 必须用三个反引号+json包裹（不是单反引号）
3. JSON 必须是有效的格式，不能有语法错误
4. 必须在最后输出 <SCHEDULED_TASKS></SCHEDULED_TASKS> 标签
5. 禁止在 "🔔 定时任务提醒" 消息中再次创建任务
6. action 字段必须是 "schedule_task"（不是其他值）
...
`;
```

**改进点**:
- ✅ 移除了嵌套的代码块
- ✅ 使用"三个反引号"文字描述代替实际反引号
- ✅ 分步骤说明（第1步、第2步、第3步）
- ✅ 增强了严格要求说明（6条明确规则）
- ✅ 添加了设备控制任务示例
- ✅ 明确了 action 字段必须是 "schedule_task"

### 2. 系统架构确认

#### 数据流
```
用户输入 "10秒后提醒我"
    ↓
AI 模型处理（使用优化后的提示词）
    ↓
输出 JSON 代码块:
```json
{
  "action": "schedule_task",
  "title": "10秒后提醒",
  "delay_seconds": 10,
  "task_action": "user_reminder"
}
```
    ↓
前端解析 (app/ai-assistant/page.tsx:3872-3874)
检测到 action === 'schedule_task'
    ↓
渲染 <ScheduleCard data={parsedJson} />
    ↓
ScheduleCard 组件自动创建任务 (useEffect on mount)
    ↓
POST /api/scheduler/tasks
    ↓
保存到数据库
    ↓
显示成功状态 + Toast 通知
    ↓
<SCHEDULED_TASKS> 标签渲染任务列表
```

#### 关键代码位置

**1. 前端 JSON 解析** (`app/ai-assistant/page.tsx:3872-3874`)
```typescript
// Check for Schedule Task
if (data.action === 'schedule_task') {
  return <ScheduleCard data={data} />
}
```

**2. 自动创建逻辑** (`components/ai/schedule-card.tsx`)
```typescript
// 🔥 自动创建任务：当组件挂载时自动保存到数据库
useEffect(() => {
  if (!autoCreated && status === 'idle' && !creatingRef.current) {
    console.log('[ScheduleCard] Auto-creating task on mount')
    setAutoCreated(true)
    handleConfirm()
  }
}, [])
```

**3. 系统提示词构建** (`app/api/chat/route.ts:927-935`)
```typescript
const compactSystemPrompt = generateCompactSystemPrompt({
  basePrompt: finalSystemPrompt,
  enableDeviceControl: mandatorySkillsEnabled !== false,
  enableReasoning: enableReasoning,
  mcpToolNames: mcpToolDefs.map(t => t.function.name),
  contextCompressed: contextCompressed,
  aiFeatures: aiFeatures  // ← 包含 enableScheduleTask: true
});
```

**4. 配置文件** (`data/ai-features-config.json`)
```json
{
  "enableScheduleTask": true,
  ...
}
```

## 测试验证

### 测试步骤

1. **重启开发服务器** (已完成 ✅)
   ```bash
   # 停止当前服务器
   Ctrl+C
   # 重新启动
   npm run dev
   ```

2. **打开浏览器开发者工具** (F12)
   - 切换到 Console 标签
   - 准备查看日志输出

3. **测试用例 1: 简单提醒**
   - 输入: "10秒后提醒我"
   - 预期: AI 输出 JSON 代码块 + <SCHEDULED_TASKS> 标签
   - 验证: 任务自动创建并显示在列表中

4. **测试用例 2: 设备控制**
   - 输入: "10秒后打开水泵"
   - 预期: AI 输出包含 device:5, value:1 的 JSON
   - 验证: 任务创建成功，10秒后水泵自动开启

5. **测试用例 3: Cron 定时**
   - 输入: "每天早上8点提醒我"
   - 预期: AI 输出包含 cron:"0 8 * * *" 的 JSON
   - 验证: 任务创建成功，显示为周期性任务

### 调试检查点

#### 浏览器控制台日志

**1. 系统提示词检查**
```
[Schedule Task] ✅ System prompt includes SCHEDULE_TASK instructions
```
如果看到 `⚠️ System prompt does NOT include`，说明提示词未加载。

**2. 内容解析检查**
```
[Schedule Task] 🔍 Checking content for SCHEDULE_TASK tag...
[Schedule Task] Content length: XXX
[Schedule Task] Has <SCHEDULE_TASK> tag: false
```
注意：新版本不再使用 `<SCHEDULE_TASK>` 标签，而是直接解析 JSON。

**3. ScheduleCard 创建日志**
```
[ScheduleCard] Auto-creating task on mount
[ScheduleCard] Creating task: 10秒后提醒
[ScheduleCard] Task created successfully
```

**4. API 请求日志**
在 Network 标签中查看:
- Request: `POST /api/scheduler/tasks`
- Status: `200 OK`
- Response: `{ "id": 123, "title": "10秒后提醒", ... }`

### 预期行为

#### 成功场景
1. AI 输出包含 ```json 代码块
2. JSON 包含 `"action": "schedule_task"`
3. 页面显示 "正在创建定时任务..." (加载状态)
4. 页面显示 "✅ 定时任务已创建：10秒后提醒" (成功状态)
5. Toast 通知弹出，显示"定时任务已创建"，带"查看列表"按钮
6. 右侧任务列表自动更新，显示新任务
7. 倒计时开始（如果是短期任务）

#### 失败场景及排查

**场景 A: AI 不输出 JSON**
- 症状: AI 只输出文字描述
- 原因: 
  - 开发服务器未重启
  - AI 模型不支持结构化输出
  - 提示词被覆盖
- 解决: 
  - 重启服务器 ✅
  - 检查控制台日志
  - 尝试更明确的指令

**场景 B: JSON 格式错误**
- 症状: 有 JSON 但格式不对
- 原因:
  - 缺少 action 字段
  - action 值不是 "schedule_task"
  - JSON 语法错误
- 解决:
  - 检查 JSON 结构
  - 查看浏览器控制台错误

**场景 C: 任务未创建**
- 症状: JSON 正确但任务未出现
- 原因:
  - API 调用失败
  - 数据库错误
  - ScheduleCard 未渲染
- 解决:
  - 检查 Network 标签
  - 查看服务器日志
  - 检查数据库连接

**场景 D: 任务列表不显示**
- 症状: 任务创建成功但列表不更新
- 原因:
  - 未输出 <SCHEDULED_TASKS> 标签
  - 组件渲染错误
- 解决:
  - 确认 AI 输出包含标签
  - 刷新页面
  - 检查控制台错误

## 下一步行动

### 立即测试 (用户需要执行)
1. ⏳ 在 AI 助手中输入: "10秒后提醒我"
2. ⏳ 观察 AI 是否输出 JSON 代码块
3. ⏳ 检查任务是否自动创建
4. ⏳ 验证任务列表是否显示
5. ⏳ 等待10秒，验证提醒是否触发

### 如果问题仍然存在

#### 方案 A: 增强提示词
在用户输入前添加明确指令：
```
请创建一个10秒后的定时任务，并严格按照以下格式输出 JSON 代码块：
```json
{
  "action": "schedule_task",
  "title": "10秒后提醒",
  "delay_seconds": 10,
  "task_action": "user_reminder"
}
```
```

#### 方案 B: 前端辅助按钮
添加"创建任务"按钮，让用户手动触发任务创建：
```typescript
<button onClick={() => createTaskFromText(userInput)}>
  创建定时任务
</button>
```

#### 方案 C: 服务端解析
在后端使用 NLP 解析用户输入：
```typescript
// 解析 "10秒后提醒我" → { delay_seconds: 10, task_action: "user_reminder" }
const parsedTask = parseNaturalLanguage(userInput)
await createTask(parsedTask)
```

#### 方案 D: 模型微调
如果 AI 模型持续不输出 JSON，考虑：
1. 切换到更强的模型（如 GPT-4）
2. 使用 Function Calling 而不是文本输出
3. 训练自定义模型

## 技术架构总结

### 组件关系
```
AI 助手页面 (app/ai-assistant/page.tsx)
    ├── 消息渲染
    │   ├── Markdown 解析
    │   └── JSON 代码块检测 (action === 'schedule_task')
    │       └── <ScheduleCard> 组件
    │           ├── 自动创建任务 (useEffect)
    │           ├── API 调用 (POST /api/scheduler/tasks)
    │           └── 状态显示 (loading/success/error)
    └── 任务列表
        └── <SCHEDULED_TASKS> 标签
            └── <ScheduledTasksList> 组件
                └── 显示所有已创建的任务
```

### 数据模型
```typescript
interface ScheduleData {
  action: "schedule_task"  // 必须
  title: string            // 任务标题
  delay_seconds?: number   // 延迟秒数（与 cron 二选一）
  cron?: string           // Cron 表达式（与 delay_seconds 二选一）
  task_action: string     // 任务类型
  device?: number         // 设备 ID（toggle_relay 需要）
  value?: number          // 设备值（toggle_relay 需要）
  params?: any            // 其他参数（set_led 需要）
}
```

### API 端点
```
POST /api/scheduler/tasks
Request Body:
{
  "title": "10秒后提醒",
  "execute_at": 1776928900000,  // 时间戳
  "action_type": "reminder",
  "device_id": null,
  "params": {}
}

Response:
{
  "id": 123,
  "title": "10秒后提醒",
  "execute_at": 1776928900000,
  "is_active": 1,
  ...
}
```

## 文件清单

### 已修改的文件
- ✅ `lib/ai/prompt-templates.ts` - 优化了 SCHEDULE_TASK_INSTRUCTION_COMPACT

### 相关文件（未修改）
- `app/ai-assistant/page.tsx` - JSON 解析和 ScheduleCard 渲染
- `components/ai/schedule-card.tsx` - 自动创建任务逻辑
- `components/ai/scheduled-tasks-list.tsx` - 任务列表显示
- `app/api/scheduler/tasks/route.ts` - 任务 CRUD API
- `app/api/chat/route.ts` - AI 聊天 API，构建系统提示词
- `data/ai-features-config.json` - 功能开关配置

### 新创建的文件
- ✅ `SCHEDULE_TASK_FIX_GUIDE.md` - 详细的修复指南
- ✅ `SCHEDULE_TASK_ISSUE_SUMMARY.md` - 本文件，完整解决方案总结

## 总结

### 问题本质
AI 模型没有按照提示词要求输出 JSON 格式，导致前端无法解析和创建任务。

### 解决方案
优化提示词模板，移除混淆的嵌套代码块，使用更清晰的分步说明和严格要求。

### 当前状态
- ✅ 提示词已优化
- ✅ 开发服务器已重启
- ⏳ 等待用户测试验证

### 成功标准
1. AI 输出包含 ```json 代码块
2. JSON 包含正确的 action 和必需字段
3. 任务自动创建并保存到数据库
4. 任务列表自动更新显示新任务
5. Toast 通知正确显示
6. 定时任务按时执行

### 后续优化建议
1. 添加更多示例到提示词中
2. 实现前端辅助按钮作为备选方案
3. 添加自然语言解析器
4. 考虑使用 Function Calling 代替文本输出
5. 添加任务创建失败的友好提示

---

**更新时间**: 2026-04-23 15:30
**状态**: 修复已实施，等待测试验证
**下一步**: 用户测试并反馈结果
