# Agent 编排器快速入门

## 5 分钟快速上手

### 1. 基本使用

```typescript
import { createOrchestrator } from '@/lib/ai/agent-orchestrator';

// 创建编排器
const orchestrator = createOrchestrator('session-123');

// 执行工具
const result = await orchestrator.executeToolCall(
  {
    id: 'tool-1',
    name: 'mcp_weather_get',
    arguments: { location: '北京' },
    timestamp: Date.now()
  },
  {
    userId: 1,
    sessionId: 'session-123',
    conversationHistory: [],
    mcpConfigs: [],
    appUrl: 'http://localhost:3000'
  }
);

// 清理
orchestrator.cleanup();
```

### 2. 记忆管理

```typescript
// 设置目标
orchestrator.setGoal('控制温室环境');

// 添加子目标
orchestrator.addSubGoal('检查温度');
orchestrator.addSubGoal('调整风扇');

// 标记完成
orchestrator.completeStep('检查温度');

// 获取摘要（可注入到 prompt）
const summary = orchestrator.getMemorySummary();
```

### 3. 性能监控

```typescript
// 获取指标
const metrics = orchestrator.getMetrics();
console.log('成功率:', metrics.successRate);
console.log('平均响应时间:', metrics.metrics.avgResponseTime);

// 获取工具统计
const toolStats = orchestrator.getToolStats();
console.log('工具统计:', toolStats);

// 生成报告
const report = orchestrator.generateReport();
```

## 配置选项

### 完整配置

```typescript
const orchestrator = createOrchestrator('session-123', {
  // 启用记忆系统
  enableMemory: true,
  
  // 启用性能监控
  enableMonitoring: true,
  
  // 启用数据库日志
  enableLogging: true,
  
  // 工具配置
  toolConfig: {
    maxRetries: 2,      // 最大重试次数
    retryDelay: 1000,   // 初始延迟（毫秒）
    timeout: 60000      // 超时时间（毫秒）
  }
});
```

### 最小配置

```typescript
// 使用默认配置
const orchestrator = createOrchestrator('session-123');
```

## 常见场景

### 场景 1: 工具调用失败自动重试

```typescript
// 编排器会自动处理重试
try {
  const result = await orchestrator.executeToolCall(toolCall, context);
  console.log('成功:', result.data);
} catch (error) {
  console.error('失败（已重试2次）:', error.message);
}
```

### 场景 2: 监控工具性能

```typescript
// 执行多个工具后
const stats = orchestrator.getToolStats();

// 输出：
// {
//   "mcp_weather_get": {
//     "total": 5,
//     "success": 4,
//     "failed": 1,
//     "avgTime": 1200
//   }
// }
```

### 场景 3: 记住用户偏好

```typescript
// 在工具执行后
orchestrator.addObservation({
  id: 'obs-1',
  type: 'user_feedback',
  timestamp: Date.now(),
  data: { preference: 'user_likes_detailed_weather' },
  importance: 0.8
});

// 获取重要观察
const important = orchestrator.getMemoryManager()
  .getImportantObservations();
```

### 场景 4: 异常告警

```typescript
const orchestrator = createOrchestrator('session-123', {
  enableMonitoring: true,
  monitorConfig: {
    errorRateThreshold: 0.3,
    onAlert: (alert) => {
      // 发送通知
      console.warn(`告警: ${alert.message}`);
      // 可以发送邮件、推送等
    }
  }
});
```

## 数据库查询

### 查看执行日志

```sql
-- 最近的执行
SELECT * FROM agent_execution_logs 
WHERE user_id = 1 
ORDER BY created_at DESC 
LIMIT 20;

-- 失败的执行
SELECT * FROM agent_execution_logs 
WHERE user_id = 1 AND status = 'failed'
ORDER BY created_at DESC;
```

### 查看统计数据

```sql
-- 工具使用统计
SELECT 
  action_type,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
  AVG(execution_time) as avg_time
FROM agent_execution_logs
WHERE user_id = 1
GROUP BY action_type
ORDER BY total DESC;

-- 每日统计
SELECT 
  DATE(created_at / 1000, 'unixepoch') as date,
  COUNT(*) as total,
  AVG(execution_time) as avg_time
FROM agent_execution_logs
WHERE user_id = 1
GROUP BY date
ORDER BY date DESC;
```

### 查看用户偏好

```sql
-- 所有偏好
SELECT * FROM user_preferences 
WHERE user_id = 1 
ORDER BY confidence DESC;

-- 高置信度偏好
SELECT * FROM user_preferences 
WHERE user_id = 1 AND confidence > 0.7
ORDER BY confidence DESC;
```

## 调试技巧

### 1. 启用详细日志

```typescript
// 编排器会自动输出日志
// 查看控制台：
// [Orchestrator] Initialized for session xxx
// [ToolManager] Executing tool_name, attempt 1/3
// [MemoryManager] Added action: tool_call
// [AgentMonitor] Recorded action: tool_call, success: true
```

### 2. 查看记忆状态

```typescript
const memory = orchestrator.getMemoryManager().getMemory();
console.log('完整记忆:', JSON.stringify(memory, null, 2));
```

### 3. 查看性能指标

```typescript
const metrics = orchestrator.getMetrics();
console.log('详细指标:', JSON.stringify(metrics, null, 2));
```

### 4. 生成性能报告

```typescript
const report = orchestrator.generateReport();
console.log(report);

// 输出：
// # Agent Performance Report
// Generated at: 2026/4/15 20:37:05
// ## Overall Metrics
// - Total Actions: 10
// - Successful: 8
// - Failed: 2
// - Success Rate: 80.0%
// - Error Rate: 20.0%
// - Avg Response Time: 1250ms
```

## 最佳实践

### 1. 会话管理

```typescript
// ✅ 好的做法：每个会话创建一个编排器
const sessionId = `session-${userId}-${Date.now()}`;
const orchestrator = createOrchestrator(sessionId);

// ❌ 不好的做法：多个会话共用一个编排器
// 会导致记忆混乱
```

### 2. 资源清理

```typescript
// ✅ 好的做法：会话结束时清理
try {
  // ... 执行工具
} finally {
  orchestrator.cleanup();
}

// ❌ 不好的做法：不清理
// 会导致内存泄漏
```

### 3. 错误处理

```typescript
// ✅ 好的做法：捕获并处理错误
try {
  const result = await orchestrator.executeToolCall(toolCall, context);
} catch (error) {
  console.error('工具执行失败:', error.message);
  // 向用户显示友好的错误信息
}

// ❌ 不好的做法：不处理错误
// 会导致用户体验差
```

### 4. 性能监控

```typescript
// ✅ 好的做法：定期检查性能
const metrics = orchestrator.getMetrics();
if (metrics.metrics.errorRate > 0.3) {
  console.warn('错误率过高，需要检查');
}

// ✅ 好的做法：记录性能报告
console.log(orchestrator.generateReport());
```

## 常见问题

### Q: 工具调用失败后会重试几次？

A: 默认重试 2 次，可以通过配置修改：

```typescript
const orchestrator = createOrchestrator('session-123', {
  toolConfig: {
    maxRetries: 3  // 修改为 3 次
  }
});
```

### Q: 如何禁用某个功能？

A: 通过配置禁用：

```typescript
const orchestrator = createOrchestrator('session-123', {
  enableMemory: false,      // 禁用记忆
  enableMonitoring: false,  // 禁用监控
  enableLogging: false      // 禁用日志
});
```

### Q: 记忆会保存多久？

A: 
- 短期记忆：会话期间（最多 10 个动作）
- 工作记忆：会话期间
- 长期记忆：永久保存在数据库中

### Q: 如何查看工具执行历史？

A: 查询数据库：

```sql
SELECT * FROM agent_execution_logs 
WHERE user_id = 1 
ORDER BY created_at DESC;
```

### Q: 性能监控会影响性能吗？

A: 影响很小（< 1ms），可以放心使用。如果需要极致性能，可以禁用：

```typescript
const orchestrator = createOrchestrator('session-123', {
  enableMonitoring: false
});
```

## 进阶用法

### 1. 自定义告警处理

```typescript
const orchestrator = createOrchestrator('session-123', {
  enableMonitoring: true,
  monitorConfig: {
    onAlert: async (alert) => {
      // 发送邮件
      await sendEmail({
        to: 'admin@example.com',
        subject: `告警: ${alert.type}`,
        body: alert.message
      });
      
      // 记录到日志系统
      await logToSystem(alert);
    }
  }
});
```

### 2. 记忆摘要注入到 Prompt

```typescript
// 获取记忆摘要
const memorySummary = orchestrator.getMemorySummary();

// 注入到系统提示词
const systemPrompt = `
你是一个智能助手。

${memorySummary}

请根据上述记忆和当前对话回答用户问题。
`;
```

### 3. 批量工具执行

```typescript
const toolCalls = [
  { id: '1', name: 'tool1', arguments: {}, timestamp: Date.now() },
  { id: '2', name: 'tool2', arguments: {}, timestamp: Date.now() },
  { id: '3', name: 'tool3', arguments: {}, timestamp: Date.now() }
];

// 并发执行
const results = await Promise.all(
  toolCalls.map(tc => orchestrator.executeToolCall(tc, context))
);
```

### 4. 自定义重试策略

```typescript
// 修改重试配置
const orchestrator = createOrchestrator('session-123', {
  toolConfig: {
    maxRetries: 3,
    retryDelay: 500,   // 更短的初始延迟
    timeout: 30000     // 更短的超时时间
  }
});
```

## 相关文档

- [完整集成文档](./AGENT_ORCHESTRATOR_INTEGRATION.md)
- [集成总结](./INTEGRATION_SUMMARY.md)
- [优化计划](./AI_ASSISTANT_OPTIMIZATION_PLAN.md)

## 支持

如有问题，请查看：
1. 控制台日志（编排器会输出详细日志）
2. 数据库日志（`agent_execution_logs` 表）
3. 性能报告（`orchestrator.generateReport()`）

---

**最后更新：** 2026年4月15日
