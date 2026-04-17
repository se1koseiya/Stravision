# 定时任务调试指南

## 当前状态

### ✅ 已完成的工作

1. **系统提示词增强** (lib/ai/schedule-task-parser.ts)
   - 添加了更明确的触发条件说明
   - 添加了完整的示例对话
   - 强调了必须输出 `<SCHEDULE_TASK>` 标记的规则
   - 添加了时间转换表（10秒 = 0.167分钟）

2. **系统提示词位置优化** (app/ai-assistant/page.tsx)
   - 将定时任务提示词移到更早的位置（第2267行）
   - 确保在模式特定提示词之前加载
   - 移除了重复的提示词添加

3. **解析和执行逻辑** (app/ai-assistant/page.tsx)
   - 第2838行：解析 AI 响应中的 `<SCHEDULE_TASK>` 标记
   - 第2850行：创建定时任务并设置回调
   - 第2870行：使用 `handleSend` 触发完整的 AI 对话流程
   - 第3258行：过滤掉 `<SCHEDULE_TASK>` 标记避免显示

4. **UI 组件** (components/ai/client-scheduled-tasks.tsx)
   - 完整的定时任务管理界面
   - 支持手动创建、删除、暂停任务
   - 显示任务状态和倒计时

5. **Studio 面板集成** (app/ai-assistant/page.tsx)
   - 第5306行：添加了"定时任务"标签页
   - 第5472行：渲染 ClientScheduledTasks 组件

### ❌ 当前问题

**AI 不输出 `<SCHEDULE_TASK>` 标记**

- 控制台显示：`Found JSON blocks: 0`
- 系统提示词已正确加载
- 解析逻辑已就绪
- 但 AI 模型没有输出预期的标记

## 调试步骤

### 1. 验证系统提示词是否加载

在浏览器控制台运行：

```javascript
// 在 AI 助手页面，发送消息前打开控制台
// 查看网络请求中的 system prompt
```

### 2. 测试 AI 理解能力

尝试以下测试消息：

```
测试1："30秒后重新检查环境"
预期：AI 应该输出 <SCHEDULE_TASK> 标记

测试2："5分钟后提醒我关灯"
预期：AI 应该输出 <SCHEDULE_TASK> 标记

测试3："10秒后重新分析"
预期：AI 应该输出 <SCHEDULE_TASK> 标记
```

### 3. 检查 API 响应

在浏览器控制台查看：

```javascript
// 查看 /api/chat 的响应
// 检查是否包含 <SCHEDULE_TASK> 标记
```

### 4. 手动测试解析器

在浏览器控制台运行：

```javascript
// 测试解析器是否正常工作
const testContent = `好的，我已经设置了定时任务。

<SCHEDULE_TASK>
{
  "description": "重新检查环境",
  "delayMinutes": 0.5,
  "taskType": "analysis",
  "payload": {}
}
</SCHEDULE_TASK>`;

// 应该能够成功解析
```

## 可能的原因

### 1. AI 模型限制

- Claude 可能不理解或不遵守自定义标记格式
- 需要更明确的指令或示例

### 2. 系统提示词被截断

- 如果系统提示词太长，可能被截断
- 需要检查完整的系统提示词长度

### 3. 模式冲突

- 不同的助手模式可能影响 AI 的行为
- 需要在每个模式下测试

## 备选方案

如果 AI 始终无法输出 `<SCHEDULE_TASK>` 标记，可以考虑：

### 方案 A：使用 JSON 命令格式

类似设备控制的格式：

```json
{
  "action": "schedule_task",
  "description": "重新检查环境",
  "delayMinutes": 0.5,
  "taskType": "analysis"
}
```

### 方案 B：使用工具调用

将定时任务作为一个 MCP 工具：

```typescript
{
  name: "schedule_task",
  description: "创建定时任务",
  inputSchema: {
    type: "object",
    properties: {
      description: { type: "string" },
      delayMinutes: { type: "number" },
      taskType: { type: "string", enum: ["analysis", "reminder", "notification"] }
    }
  }
}
```

### 方案 C：简化标记格式

使用更简单的标记：

```
SCHEDULE: 30秒后重新检查环境
```

然后用正则表达式解析。

## 下一步行动

1. ✅ 增强系统提示词（已完成）
2. ✅ 优化提示词位置（已完成）
3. ⏳ 测试 AI 是否输出标记
4. ⏳ 如果不行，考虑备选方案

## 相关文件

- `lib/ai/schedule-task-parser.ts` - 解析器和系统提示词
- `app/ai-assistant/page.tsx` - 主要集成逻辑
- `lib/ai/client-scheduler.ts` - 客户端调度器
- `components/ai/client-scheduled-tasks.tsx` - UI 组件
