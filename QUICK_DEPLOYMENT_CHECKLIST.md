# 🚀 快速部署检查清单

## 📋 部署前准备

### 1. 安装依赖
```bash
npm install lru-cache
```

### 2. 验证文件已创建
- [ ] `lib/ai/skill-router-cached.ts`
- [ ] `lib/mcp/spectrum-connection-pool.ts`
- [ ] `lib/ai/parallel-tool-executor.ts`
- [ ] `lib/ai/prompt-templates.ts`
- [ ] `AI_ASSISTANT_PERFORMANCE_OPTIMIZATION.md`
- [ ] `OPTIMIZATION_INTEGRATION_GUIDE.md`

## 🎯 阶段1: 低风险优化（推荐立即部署）

### ✅ 优化1: 技能路由缓存

**文件**: `app/api/chat/route.ts`

**位置**: 约第90行，查找 `getEnhancedSystemPrompt`

**修改**:
```typescript
// 添加导入
import { getRelevantSkillsContentCached } from '@/lib/ai/skill-router-cached';

// 替换这行：
// let { prompt: enhancedSystemPrompt, matchedSkills } = 
//   await getEnhancedSystemPrompt(combinedRoutingText, systemPrompt, user.id as number)

// 改为：
const { content: skillContent, matchedSkills, fromCache } = 
  await getRelevantSkillsContentCached(
    combinedRoutingText,
    user.id as number,
    mandatorySkillsEnabled
  );

let enhancedSystemPrompt = systemPrompt + '\n\n' + skillContent;

if (fromCache) {
  console.log('[Chat API] ✅ Skill routing cache hit');
}
```

**预期效果**: 技能路由从 300-500ms 降低到 10-50ms

---

### ✅ 优化2: 减少超时时间

**文件**: `lib/mcp/mcp-tool-executor.ts`

**位置**: 约第30行，`fetchWithTimeout` 函数

**修改**:
```typescript
// 将默认超时从 60000 改为 30000
async function fetchWithTimeout(
  url: string, 
  options: RequestInit = {}, 
  timeoutMs = 30000  // 改这里
): Promise<Response> {
  // ... 保持其他代码不变
}
```

**预期效果**: 失败场景下减少等待时间

---

### ✅ 优化3: Prompt 精简（可选）

**文件**: `app/api/chat/route.ts`

**位置**: 约第200-300行，系统提示词构建部分

**修改**:
```typescript
// 添加导入
import { generateCompactSystemPrompt } from '@/lib/ai/prompt-templates';

// 找到构建 fullMessages 的地方，替换系统提示词
const compactSystemPrompt = generateCompactSystemPrompt({
  basePrompt: finalSystemPrompt,
  enableDeviceControl: mandatorySkillsEnabled !== false,
  enableReasoning: enableReasoning,
  mcpToolNames: mcpToolDefs.map(t => t.function.name),
  contextCompressed: contextCompressed
});

fullMessages = [
  {
    role: "system",
    content: compactSystemPrompt
  },
  ...userMessages,
];
```

**预期效果**: 减少 10-20% 的 LLM 处理时间

---

## 🎯 阶段2: 中等风险优化（测试后部署）

### ✅ 优化4: 光谱工具连接池

**文件**: `lib/mcp/mcp-tool-executor.ts`

**位置**: 约第400行，`executeSpectrumTool` 函数

**修改**:
```typescript
// 添加导入
import { spectrumConnectionPool } from './spectrum-connection-pool';

// 替换整个 executeSpectrumTool 函数
async function executeSpectrumTool(
  toolName: string, 
  args: Record<string, any>, 
  config: MCPConfig
): Promise<ToolCallResult> {
  console.log(`[MCP] Executing Spectrum Tool: ${toolName}`, args);

  try {
    const startTime = Date.now();
    const data = await spectrumConnectionPool.executeToolCall(toolName, args);
    const executionTime = Date.now() - startTime;
    
    console.log(`[MCP] ✅ Spectrum tool completed in ${executionTime}ms`);
    
    return { 
      success: true, 
      data,
      executionTime
    };
  } catch (error: any) {
    console.error(`[MCP] Spectrum tool error:`, error);
    return { 
      success: false, 
      error: `光谱服务连接错误: ${error.message}` 
    };
  }
}
```

**预期效果**: 光谱工具从 8-12s 降低到 1-2s

---

### ✅ 优化5: 并行工具执行

**文件**: `app/api/chat/route.ts`

**位置**: 约第550行，Agent Loop 中的工具执行部分

**修改**:
```typescript
// 添加导入
import { executeToolCallsSmart } from '@/lib/ai/parallel-tool-executor';

// 找到这段代码：
// for (const toolCall of toolCalls) {
//   const fnName = toolCall.function.name
//   ...
// }

// 替换为：
console.log(`[Agent Loop] Round ${iteration} - Executing ${toolCalls.length} tools`);

// 准备工具调用对象
const toolCallObjects = [];
for (const toolCall of toolCalls) {
  let fnArgs = {};
  let parseError = "";
  
  try { 
    fnArgs = JSON.parse(toolCall.function.arguments || '{}') 
  } catch (e: any) { 
    parseError = e.message;
    console.error(`[Agent Loop] Failed to parse tool arguments:`, parseError);
  }

  if (parseError) {
    // 直接添加错误结果
    fullMessages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify({ 
        success: false, 
        error: `JSON解析失败: ${parseError}` 
      })
    });
    continue;
  }
  
  toolCallObjects.push({
    id: toolCall.id,
    name: toolCall.function.name,
    arguments: fnArgs,
    timestamp: Date.now()
  });
}

// 并行执行工具
const toolResults = await executeToolCallsSmart(
  toolCallObjects,
  orchestrator,
  agentContext,
  (completed, total, currentTool) => {
    // 发送进度更新
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      id: `tool-progress-${Date.now()}`,
      object: "chat.completion.chunk",
      created: Date.now(),
      model: effectiveModel,
      tool_progress: { completed, total, current: currentTool }
    })}\n\n`));
  }
);

// 处理结果
for (const [toolCallId, result] of toolResults.entries()) {
  const toolCall = toolCalls.find(tc => tc.id === toolCallId);
  if (!toolCall) continue;

  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    id: `tool-result-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Date.now(),
    model: effectiveModel,
    tool_result: {
      name: toolCall.function.name,
      args: JSON.parse(toolCall.function.arguments || '{}'),
      result: result.success ? result.data : { error: result.error }
    }
  })}\n\n`));

  fullMessages.push({
    role: 'tool',
    tool_call_id: toolCallId,
    content: JSON.stringify(result.success ? result.data : { error: result.error })
  });
}
```

**预期效果**: 3个工具从 12-15s 降低到 4-6s

---

## 🧪 测试验证

### 1. 本地测试

```bash
# 启动开发服务器
npm run dev

# 在浏览器中测试以下场景：
```

**测试场景1: 技能路由缓存**
- 发送消息: "查看设备状态"
- 再次发送: "查看设备状态"
- 检查控制台是否显示 "Skill routing cache hit"

**测试场景2: 光谱工具**
- 发送消息: "获取光谱数据"
- 检查响应时间是否明显缩短
- 再次发送相同消息，检查是否复用连接

**测试场景3: 并行工具执行**
- 发送消息: "搜索草莓种植技术，同时查看当前设备状态"
- 检查控制台是否显示并行执行日志
- 观察响应时间是否缩短

### 2. 性能监控

在浏览器控制台运行：

```javascript
// 监控性能指标
const startTime = performance.now();

// 发送消息后
const endTime = performance.now();
console.log(`Total response time: ${endTime - startTime}ms`);
```

### 3. 回归测试

确保以下功能正常：
- [ ] 设备控制（开关灯、风扇等）
- [ ] 光谱数据查询
- [ ] 搜索功能
- [ ] 多轮对话
- [ ] 工具调用链

---

## 📊 性能对比

### 优化前基准
```
技能路由: 300-500ms
光谱工具: 8-12s
3个工具串行: 12-15s
总响应时间: 15-20s
```

### 优化后目标
```
技能路由: 10-50ms (缓存命中)
光谱工具: 1-2s (连接复用)
3个工具并行: 4-6s
总响应时间: 5-8s
```

### 性能提升
```
技能路由: 90% ↑
光谱工具: 85% ↑
工具执行: 60% ↑
总体: 60-70% ↑
```

---

## ⚠️ 故障排查

### 问题1: 缓存不生效
**症状**: 控制台没有显示 "cache hit"
**解决**: 检查是否正确导入 `getRelevantSkillsContentCached`

### 问题2: 光谱工具连接失败
**症状**: 报错 "无法连接到光谱服务器"
**解决**: 
1. 检查网络连接
2. 验证 SSE URL 是否正确
3. 查看连接池日志

### 问题3: 并行执行报错
**症状**: 工具执行失败或结果丢失
**解决**:
1. 检查工具依赖关系
2. 查看 Promise.allSettled 结果
3. 启用详细日志

### 问题4: TypeScript 类型错误
**症状**: 编译时报类型错误
**解决**:
```bash
# 重新生成类型
npm run build

# 或临时使用 @ts-ignore
```

---

## 🔄 回滚方案

如果遇到严重问题，可以快速回滚：

### 回滚技能路由缓存
```typescript
// 改回原来的调用
let { prompt: enhancedSystemPrompt, matchedSkills } = 
  await getEnhancedSystemPrompt(combinedRoutingText, systemPrompt, user.id as number)
```

### 回滚光谱连接池
```typescript
// 恢复原来的 executeSpectrumTool 函数
// 从 git 历史中恢复
git checkout HEAD -- lib/mcp/mcp-tool-executor.ts
```

### 回滚并行执行
```typescript
// 改回串行执行
for (const toolCall of toolCalls) {
  const result = await orchestrator.executeToolCall(toolCallObj, agentContext);
  // ...
}
```

---

## ✅ 部署完成检查

- [ ] 所有文件已修改
- [ ] 依赖已安装
- [ ] 本地测试通过
- [ ] 性能指标达标
- [ ] 回归测试通过
- [ ] 日志正常输出
- [ ] 错误处理正常
- [ ] 用户体验改善

---

## 📝 部署记录

**部署日期**: ___________
**部署人员**: ___________
**部署版本**: ___________

**性能测试结果**:
- 技能路由: _____ ms
- 光谱工具: _____ s
- 并行工具: _____ s
- 总响应时间: _____ s

**问题记录**:
- 

**备注**:
- 

---

## 🎉 下一步

优化部署成功后：

1. 监控生产环境性能指标
2. 收集用户反馈
3. 根据实际情况调整参数
4. 考虑实施阶段3的高级优化
5. 编写性能优化总结文档
