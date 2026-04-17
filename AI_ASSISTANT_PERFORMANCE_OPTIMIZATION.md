# AI助手性能优化方案

## 📊 当前性能瓶颈分析

### 1. 串行工具调用链（最大影响）
- **问题**：多个工具调用完全串行执行，每次都要等待LLM响应
- **影响**：如果有3个工具调用，总延迟 = 3 × (LLM延迟 + 工具执行时间)
- **典型场景**：搜索 → 分析 → 控制设备，可能需要10-15秒

### 2. 光谱工具SSE连接开销
- **问题**：每次调用都建立新的SSE连接并完成MCP握手
- **当前超时**：5s(连接) + 3s(init) + 3s(initialized) + 8s(工具) = 19秒
- **影响**：即使数据很小，也要等待多次网络往返

### 3. 技能路由重复计算
- **问题**：每次请求都遍历所有技能文件进行关键词匹配
- **影响**：增加200-500ms延迟

### 4. 上下文压缩的额外LLM调用
- **问题**：长对话时触发额外的总结请求
- **影响**：增加2-3秒延迟

### 5. Prompt过于冗长
- **问题**：系统提示词包含大量指令、示例、规则
- **当前长度**：估计5000+ tokens
- **影响**：增加LLM处理时间和成本

## 🎯 优化方案（按优先级排序）

### 优先级1：并行化工具调用 ⭐⭐⭐⭐⭐

**收益**：减少50-70%的工具调用延迟

```typescript
// 当前（串行）
for (const toolCall of toolCalls) {
  await orchestrator.executeToolCall(toolCallObj, agentContext);
}

// 优化（并行）
const toolResults = await Promise.allSettled(
  toolCalls.map(toolCall => 
    orchestrator.executeToolCall({
      id: toolCall.id,
      name: toolCall.function.name,
      arguments: JSON.parse(toolCall.function.arguments || '{}'),
      timestamp: Date.now()
    }, agentContext)
  )
);
```

**注意事项**：
- 需要确保工具之间没有依赖关系
- 如果有依赖，可以分组并行执行

### 优先级2：光谱工具连接池 ⭐⭐⭐⭐⭐

**收益**：减少80%的光谱工具延迟

```typescript
// 创建持久化的SSE连接池
class SpectrumConnectionPool {
  private connections: Map<string, {
    endpoint: string;
    reader: ReadableStreamDefaultReader;
    lastUsed: number;
  }> = new Map();

  async getConnection(url: string) {
    const existing = this.connections.get(url);
    if (existing && Date.now() - existing.lastUsed < 60000) {
      existing.lastUsed = Date.now();
      return existing;
    }
    
    // 建立新连接并完成握手
    const { endpoint, reader } = await this.initializeConnection(url);
    this.connections.set(url, { endpoint, reader, lastUsed: Date.now() });
    return this.connections.get(url)!;
  }
}
```

**实施位置**：`lib/mcp/mcp-tool-executor.ts`

### 优先级3：技能路由缓存 ⭐⭐⭐⭐

**收益**：减少200-500ms延迟

```typescript
// 添加LRU缓存
import { LRUCache } from 'lru-cache';

const skillRouteCache = new LRUCache<string, {
  matchedSkills: any[];
  prompt: string;
}>({
  max: 100,
  ttl: 1000 * 60 * 5 // 5分钟过期
});

export async function getEnhancedSystemPrompt(
  userMessage: string,
  systemPrompt: string,
  userId: number
) {
  // 生成缓存键（基于消息的语义指纹）
  const cacheKey = `${userId}:${generateSemanticHash(userMessage)}`;
  
  const cached = skillRouteCache.get(cacheKey);
  if (cached) {
    console.log('[SkillRouter] Cache hit');
    return cached;
  }
  
  // 原有逻辑...
  const result = await performSkillMatching(...);
  skillRouteCache.set(cacheKey, result);
  return result;
}

// 简单的语义哈希（提取关键词）
function generateSemanticHash(text: string): string {
  const keywords = text.toLowerCase()
    .match(/[\u4e00-\u9fa5]+|[a-z]+/g) || [];
  return keywords.slice(0, 5).sort().join('-');
}
```

### 优先级4：减少超时时间 ⭐⭐⭐⭐

**收益**：失败场景下减少等待时间

```typescript
// 当前超时设置过于保守
async function executeSpectrumTool(...) {
  // 从 10s → 3s
  const sseRes = await fetchWithTimeout(sseUrl, {...}, 3000);
  
  // 从 5s → 2s
  while (Date.now() - startTime < 2000) {...}
  
  // 从 15s → 5s
  while (Date.now() - responseStartTime < 5000) {...}
}
```

### 优先级5：Prompt精简 ⭐⭐⭐

**收益**：减少10-20%的LLM处理时间

**当前问题**：
- 设备控制指令重复说明
- 大量示例代码
- 冗余的规则说明

**优化策略**：
```typescript
// 1. 将静态指令移到单独的文件
// 2. 根据用户意图动态加载相关指令
// 3. 使用更简洁的表达

// 示例：设备控制指令从 ~800 tokens 压缩到 ~200 tokens
const deviceControlInstruction = `
## 设备控制
硬件ID: 5=水泵, 6=风扇, 7=RGB灯, 8=白光灯
格式: {"action":"toggle_relay","device":5,"value":1}
⚠️ 严格执行用户原始意图（开=1，关=0）
`;
```

### 优先级6：流式响应优化 ⭐⭐⭐

**收益**：改善用户感知速度

```typescript
// 在工具调用期间，发送进度更新
controller.enqueue(encoder.encode(`data: ${JSON.stringify({
  type: 'tool_progress',
  tool: fnName,
  status: 'executing',
  message: '正在执行工具...'
})}\n\n`));

// 工具执行完成后立即发送部分结果
controller.enqueue(encoder.encode(`data: ${JSON.stringify({
  type: 'tool_progress',
  tool: fnName,
  status: 'completed',
  preview: result.data?.summary // 发送摘要而非完整数据
})}\n\n`));
```

### 优先级7：智能预加载 ⭐⭐

**收益**：特定场景下减少延迟

```typescript
// 根据用户输入预测可能需要的工具，提前预热连接
async function predictAndPreheat(userMessage: string) {
  const predictions = {
    '光谱|NDVI|植物': ['get_all_spectrum'],
    '搜索|查找': ['mcp_exa_search', 'mcp_brave_search'],
    '天气': ['mcp_caiyun_weather']
  };
  
  for (const [pattern, tools] of Object.entries(predictions)) {
    if (new RegExp(pattern).test(userMessage)) {
      // 预热连接（不等待结果）
      tools.forEach(tool => preheatTool(tool));
    }
  }
}
```

## 📈 预期性能提升

| 优化项 | 当前耗时 | 优化后 | 提升 |
|--------|---------|--------|------|
| 3个工具串行调用 | 12-15s | 4-6s | 60% |
| 光谱工具单次调用 | 8-12s | 1-2s | 85% |
| 技能路由 | 300-500ms | 10-50ms | 90% |
| Prompt处理 | 2-3s | 1.5-2s | 30% |
| **总体响应时间** | **15-20s** | **5-8s** | **60%** |

## 🛠️ 实施计划

### 第一阶段（立即实施，1-2天）
1. ✅ 并行化工具调用
2. ✅ 减少超时时间
3. ✅ 技能路由缓存

### 第二阶段（本周内，3-5天）
4. ✅ 光谱工具连接池
5. ✅ Prompt精简
6. ✅ 流式响应优化

### 第三阶段（可选，下周）
7. ⭐ 智能预加载
8. ⭐ 更激进的缓存策略

## 🔧 监控指标

优化后需要监控的关键指标：

```typescript
// 在 agent-orchestrator/monitor.ts 中添加
interface PerformanceMetrics {
  // 端到端延迟
  totalResponseTime: number;
  
  // 各阶段耗时
  skillRoutingTime: number;
  llmFirstTokenTime: number;
  toolExecutionTime: number;
  
  // 工具调用统计
  parallelToolCalls: number;
  toolCacheHits: number;
  
  // 用户感知
  timeToFirstToken: number; // 最重要！
}
```

## ⚠️ 注意事项

1. **并行工具调用的依赖处理**
   - 如果工具B依赖工具A的结果，需要分组执行
   - 可以通过依赖图分析自动分组

2. **连接池的资源管理**
   - 需要定期清理空闲连接
   - 设置最大连接数限制

3. **缓存失效策略**
   - 技能更新时需要清空缓存
   - 用户偏好变化时需要失效相关缓存

4. **降级策略**
   - 并行调用失败时回退到串行
   - 连接池不可用时直接建立新连接

## 📝 代码示例

完整的优化代码将在以下文件中实现：
- `lib/mcp/mcp-tool-executor-optimized.ts` - 连接池实现
- `lib/ai/skill-router-cached.ts` - 缓存版本
- `app/api/chat/route-optimized.ts` - 并行化逻辑
