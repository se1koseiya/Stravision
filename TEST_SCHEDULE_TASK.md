# 定时任务测试指南

## 问题诊断

当前问题：AI说会创建定时任务，但实际上没有生成任务。

## 可能的原因

1. **AI没有输出 `<SCHEDULE_TASK>` 标记**
   - AI可能没有理解系统提示词
   - AI可能输出了错误的格式

2. **解析逻辑在流式输出时被清理**
   - 在流式输出过程中，`<SCHEDULE_TASK>` 标记可能被过滤掉了
   - 检查是否有代码在流式输出时移除了这个标记

3. **时机问题**
   - 解析逻辑可能在内容完整之前就执行了

## 调试步骤

### 1. 检查浏览器控制台

打开浏览器开发者工具（F12），查看控制台输出：

```
[Schedule Task] Checking content for SCHEDULE_TASK tag...
[Schedule Task] Content length: XXX
[Schedule Task] Content preview: ...
[parseScheduleTask] Starting to parse content...
```

如果看到这些日志，说明代码执行了。

### 2. 检查AI响应内容

在控制台中查看 `Content preview`，看看是否包含 `<SCHEDULE_TASK>` 标记。

如果**没有**看到标记，说明AI没有输出正确的格式。

如果**看到**了标记，但任务没有创建，说明解析逻辑有问题。

### 3. 手动测试调度器

在浏览器控制台中运行以下代码：

```javascript
// 导入调度器
import { clientScheduler } from '@/lib/ai/client-scheduler'

// 创建一个1分钟后的测试任务
const taskId = clientScheduler.scheduleTask(
  '测试任务 - 1分钟后提醒',
  1,
  'reminder',
  { test: true },
  (task) => {
    console.log('任务执行了！', task)
    alert('定时任务执行：' + task.description)
  }
)

console.log('任务已创建，ID:', taskId)

// 查看所有任务
console.log('所有任务:', clientScheduler.getAllTasks())
```

如果这个测试成功，说明调度器本身没问题，问题在于AI响应解析。

### 4. 检查流式输出过滤逻辑

在 `app/ai-assistant/page.tsx` 中搜索以下代码：

```typescript
// 实时清理 TASK_LIST 标签，防止在流式输出时裸露
```

这段代码可能也在过滤 `SCHEDULE_TASK` 标记。需要确保它不会误删 `SCHEDULE_TASK`。

## 修复方案

### 方案1：确保 SCHEDULE_TASK 不被过滤

在流式输出的清理逻辑中，添加对 `SCHEDULE_TASK` 的保护：

```typescript
// 只清理 TASK_LIST，不要清理 SCHEDULE_TASK
const taskListJsonPattern = /\{\s*"status"\s*:\s*"(?:in_progress|completed|pending)"\s*,\s*"tasks"\s*:\s*\[[\s\S]*?\]\s*\}/g
assistantMsg.content = assistantMsg.content.replace(taskListJsonPattern, '')
```

### 方案2：在流式输出完成后再解析

确保解析逻辑在流式输出**完全结束**后才执行。当前代码已经是这样做的，但需要验证。

### 方案3：简化AI输出格式

如果AI总是无法正确输出 `<SCHEDULE_TASK>` 标记，可以考虑使用更简单的格式：

```json
{
  "action": "schedule_task",
  "description": "检查水泵状态",
  "delayMinutes": 5,
  "taskType": "analysis"
}
```

然后在设备控制命令解析逻辑中处理这个特殊的 action。

## 测试用例

### 测试1：简单提醒
**输入**: "1分钟后提醒我喝水"
**预期**: 创建一个reminder类型的任务，1分钟后显示提醒

### 测试2：设备检查
**输入**: "2分钟后检查一下温度"
**预期**: 创建一个analysis类型的任务，2分钟后重新调用AI分析温度

### 测试3：通知
**输入**: "3分钟后通知我关灯"
**预期**: 创建一个notification类型的任务，3分钟后显示通知

## 下一步

1. 先在浏览器控制台查看日志
2. 确认AI是否输出了 `<SCHEDULE_TASK>` 标记
3. 如果没有输出，需要调整系统提示词或使用方案3
4. 如果输出了但被过滤，需要修改过滤逻辑
