# 定时任务调试指南

## 🔍 问题诊断

### 当前问题
AI 创建定时任务时：
1. ❌ 没有输出 JSON 格式的任务定义
2. ❌ 没有自动显示任务列表
3. ❌ 任务没有被保存到数据库

### 调试步骤

#### 1. 检查浏览器控制台

打开浏览器开发者工具（F12），查看：

**Console 标签**：
```
搜索关键词：
- [ScheduleCard]
- [Schedule Task]
- schedule_task
```

**Network 标签**：
```
查看请求：
- POST /api/scheduler/tasks
- 状态码应该是 200
```

#### 2. 测试 AI 输出

**测试输入**：
```
请创建一个10秒后的提醒任务，标题是"测试任务"
```

**期望的 AI 输出**：
```
好的，我为您创建一个10秒后的提醒任务。

```json
{
  "action": "schedule_task",
  "title": "测试任务",
  "delay_seconds": 10,
  "task_action": "user_reminder"
}
```

<SCHEDULED_TASKS></SCHEDULED_TASKS>
```

**实际输出**：
[记录 AI 实际输出的内容]

#### 3. 手动测试 API

在浏览器控制台执行：

```javascript
// 测试创建任务
fetch('/api/scheduler/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "手动测试任务",
    execute_at: Date.now() + 10000,
    action_type: "reminder",
    params: {}
  })
}).then(r => r.json()).then(console.log)

// 测试获取任务列表
fetch('/api/scheduler/tasks')
  .then(r => r.json())
  .then(console.log)
```

#### 4. 检查系统提示词

在 AI 助手中输入：
```
请告诉我，当我要求你创建定时任务时，你应该输出什么格式的内容？
```

AI 应该回答包含 JSON 格式和 `<SCHEDULED_TASKS>` 标签的说明。

#### 5. 检查 AI 功能配置

查看文件：`data/ai-features-config.json`

确认：
```json
{
  "enableScheduleTask": true,
  "enableScheduledTasks": true
}
```

如果这些值是 `false`，需要改为 `true`。

## 🔧 可能的解决方案

### 方案 1：重启开发服务器

```bash
# 停止当前服务器
Ctrl + C

# 重新启动
npm run dev
```

### 方案 2：清除浏览器缓存

1. 打开开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

### 方案 3：检查 AI 模型

某些 AI 模型可能不擅长输出结构化的 JSON。尝试：
1. 切换到 `qwen-plus` 或 `qwen-max` 模型
2. 确保没有使用本地模型

### 方案 4：简化测试

使用最简单的命令测试：
```
10秒后提醒我
```

AI 应该输出：
```json
{
  "action": "schedule_task",
  "title": "10秒后提醒",
  "delay_seconds": 10,
  "task_action": "user_reminder"
}
```

## 📋 检查清单

- [ ] 浏览器控制台没有错误
- [ ] `/api/scheduler/tasks` API 可以正常访问
- [ ] AI 功能配置中 `enableScheduleTask` 为 true
- [ ] 开发服务器已重启
- [ ] 浏览器缓存已清除
- [ ] AI 模型支持 JSON 输出
- [ ] 系统提示词包含定时任务指令

## 🐛 常见错误

### 错误 1：AI 只输出文字描述

**原因**：系统提示词没有生效

**解决**：
1. 检查 `lib/ai/prompt-templates.ts` 中的 `SCHEDULE_TASK_INSTRUCTION_COMPACT`
2. 确认 `generateCompactSystemPrompt` 函数包含了这个指令
3. 重启开发服务器

### 错误 2：JSON 没有被解析

**原因**：JSON 格式不正确或没有被 Markdown 解析器识别

**解决**：
1. 确保 JSON 被包裹在 ````json` 代码块中
2. 检查 JSON 格式是否正确（使用 JSONLint 验证）

### 错误 3：ScheduleCard 不显示

**原因**：组件返回了 null

**解决**：
1. 检查 `components/ai/schedule-card.tsx`
2. 确认组件在 loading 和 success 状态下有正确的返回值

### 错误 4：任务没有保存到数据库

**原因**：API 调用失败

**解决**：
1. 检查浏览器 Network 标签
2. 查看 API 响应的错误信息
3. 检查数据库连接

## 📞 需要帮助？

如果以上步骤都无法解决问题，请提供：

1. 浏览器控制台的完整日志
2. Network 标签中的 API 请求/响应
3. AI 的完整输出内容
4. `data/ai-features-config.json` 的内容

---

**最后更新**：2024年
