# Agent 监控面板运行时错误修复

## 📅 修复日期
2026-04-16

## 🐛 问题描述

### 错误信息
```
Runtime TypeError
Cannot convert undefined or null to object
components/admin/agent-performance-monitor.tsx (87:32)

const toolUsageData = Object.entries(metrics.toolUsageStats)
```

### 错误原因
1. API 返回的 `metrics.toolUsageStats` 可能为 `undefined` 或 `null`
2. 临时创建的编排器实例没有历史数据
3. 缺少空值检查和默认值处理

## ✅ 修复方案

### 修复 1: API 端点添加默认值

**文件**: `app/api/admin/agent-metrics/route.ts`

**修改内容**:
```typescript
// 确保返回完整的指标结构，包含默认值
const metrics = {
  totalActions: rawMetrics.totalActions || 0,
  successfulActions: rawMetrics.successfulActions || 0,
  failedActions: rawMetrics.failedActions || 0,
  avgResponseTime: rawMetrics.avgResponseTime || 0,
  errorRate: rawMetrics.errorRate || 0,
  toolUsageStats: rawMetrics.toolUsageStats || {},
  recentActions: rawMetrics.recentActions || []
};
```

**效果**: 确保 API 始终返回完整的数据结构，即使没有数据也返回空对象/数组。

### 修复 2: 前端组件添加空值检查

**文件**: `components/admin/agent-performance-monitor.tsx`

**修改内容**:
```typescript
const toolUsageData = metrics.toolUsageStats 
  ? Object.entries(metrics.toolUsageStats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  : [];
```

**效果**: 在调用 `Object.entries()` 之前检查 `toolUsageStats` 是否存在。

### 修复 3: 添加空状态提示

**文件**: `components/admin/agent-performance-monitor.tsx`

**新增内容**:
```typescript
// 检查是否有数据
const hasData = metrics.totalActions > 0 || toolUsageData.length > 0;

// 空状态提示
{!hasData && (
  <Card className="border-dashed">
    <CardContent className="flex flex-col items-center justify-center py-12">
      <Activity className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">暂无监控数据</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        当前没有 Agent 活动数据。请先使用 AI 助手创建一些会话，然后返回查看性能指标。
      </p>
      <Badge variant="outline" className="mt-4">
        数据每 5 秒自动刷新
      </Badge>
    </CardContent>
  </Card>
)}
```

**效果**: 当没有数据时显示友好的提示信息，引导用户如何生成数据。

## 📊 修复后的行为

### 场景 1: 首次访问（无数据）
```
┌─────────────────────────────────────────────────────────┐
│  Agent 监控中心                                          │
├─────────────────────────────────────────────────────────┤
│  [性能监控] [告警管理]                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              📊                                         │
│         暂无监控数据                                     │
│                                                         │
│  当前没有 Agent 活动数据。请先使用 AI 助手               │
│  创建一些会话，然后返回查看性能指标。                     │
│                                                         │
│         [数据每 5 秒自动刷新]                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 场景 2: 有数据后
```
┌─────────────────────────────────────────────────────────┐
│  📊 性能概览                                             │
│  ┌──────────┬──────────┬──────────┬──────────┐         │
│  │ 总请求数  │ 成功率   │ 响应时间  │ 错误率   │         │
│  │ 0        │ 0%      │ 0ms      │ 0%      │         │
│  └──────────┴──────────┴──────────┴──────────┘         │
│                                                         │
│  📈 性能趋势图                                           │
│  [图表显示]                                             │
└─────────────────────────────────────────────────────────┘
```

## 🔍 技术细节

### 空值检查模式

**问题代码**:
```typescript
// ❌ 直接使用可能为 undefined 的对象
const data = Object.entries(metrics.toolUsageStats)
```

**修复代码**:
```typescript
// ✅ 先检查是否存在
const data = metrics.toolUsageStats 
  ? Object.entries(metrics.toolUsageStats)
  : [];
```

### 默认值处理

**API 层面**:
```typescript
// 确保所有字段都有默认值
const metrics = {
  totalActions: rawMetrics.totalActions || 0,
  toolUsageStats: rawMetrics.toolUsageStats || {},
  recentActions: rawMetrics.recentActions || []
};
```

**前端层面**:
```typescript
// 使用可选链和空值合并
const count = metrics?.toolUsageStats?.['tool-name'] ?? 0;
```

## 🎯 根本原因分析

### 为什么会出现这个问题？

1. **临时实例问题**: 
   - API 创建临时编排器实例
   - 新实例没有历史数据
   - `getMetrics()` 返回的对象可能缺少某些字段

2. **类型定义不完整**:
   - TypeScript 接口定义了字段
   - 但运行时数据可能不完整
   - 需要在运行时进行防御性检查

3. **缺少空状态处理**:
   - 没有考虑"无数据"的场景
   - 用户体验不友好

## 🚀 长期解决方案

### 建议 1: 全局编排器管理
创建一个全局的编排器管理器来跟踪所有活跃的会话：

```typescript
// lib/ai/agent-orchestrator/manager.ts
class OrchestratorManager {
  private orchestrators = new Map<string, AgentOrchestrator>();
  
  register(sessionId: string, orchestrator: AgentOrchestrator) {
    this.orchestrators.set(sessionId, orchestrator);
  }
  
  getAggregatedMetrics() {
    // 聚合所有活跃编排器的指标
    const allMetrics = Array.from(this.orchestrators.values())
      .map(o => o.getMetrics());
    
    return this.aggregateMetrics(allMetrics);
  }
}

export const orchestratorManager = new OrchestratorManager();
```

### 建议 2: 持久化指标数据
将指标数据保存到数据库：

```typescript
// lib/db/agent-metrics-service.ts
export async function saveMetrics(metrics: AgentMetrics) {
  await db.run(
    'INSERT INTO agent_metrics (timestamp, data) VALUES (?, ?)',
    [Date.now(), JSON.stringify(metrics)]
  );
}

export async function getHistoricalMetrics(timeRange: number) {
  return await db.all(
    'SELECT * FROM agent_metrics WHERE timestamp > ?',
    [Date.now() - timeRange]
  );
}
```

### 建议 3: 使用 Zod 进行运行时验证
```typescript
import { z } from 'zod';

const MetricsSchema = z.object({
  totalActions: z.number().default(0),
  successfulActions: z.number().default(0),
  failedActions: z.number().default(0),
  avgResponseTime: z.number().default(0),
  errorRate: z.number().default(0),
  toolUsageStats: z.record(z.number()).default({}),
  recentActions: z.array(z.any()).default([])
});

// 使用
const metrics = MetricsSchema.parse(rawMetrics);
```

## ✅ 验证清单

- [x] API 返回完整的数据结构
- [x] 前端组件添加空值检查
- [x] 添加空状态提示
- [x] 错误不再出现
- [x] 用户体验改善

## 📝 测试步骤

### 测试 1: 无数据场景
1. 清空所有 Agent 会话
2. 访问 `/admin/agent-monitor`
3. 应该看到"暂无监控数据"提示
4. 不应该有任何错误

### 测试 2: 有数据场景
1. 使用 AI 助手创建一些会话
2. 访问 `/admin/agent-monitor`
3. 应该看到性能指标
4. 图表正常显示

### 测试 3: 数据刷新
1. 保持监控页面打开
2. 在另一个标签页使用 AI 助手
3. 5 秒后监控数据应该自动更新

## 🎉 总结

成功修复了 Agent 监控面板的运行时错误：

1. ✅ API 端点添加了完整的默认值处理
2. ✅ 前端组件添加了空值检查
3. ✅ 添加了友好的空状态提示
4. ✅ 改善了用户体验

现在监控面板可以正常工作，即使在没有数据的情况下也能优雅地显示。

---

**修复日期**: 2026-04-16  
**状态**: ✅ 已修复  
**影响范围**: Agent 监控面板
