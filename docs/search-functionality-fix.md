# AI 助手搜索功能修复文档

## 问题描述

用户报告：AI 助手显示"正在搜索"但实际上没有执行搜索操作。

## 根本原因分析

经过代码审查，发现了以下问题：

### 1. 模拟数据问题
在 `app/ai-assistant/page.tsx` 的 `DynamicTaskPlanner` 组件中，`getMockSubActions` 函数生成了假的搜索状态：

```typescript
const getMockSubActions = (title: string) => [
  { icon: <Globe size={14} />, text: `正在通过 MCP 工具搜索 "${title}" 相关的最佳实践...`, status: 'completed' },
  // ...
]
```

这些是硬编码的模拟数据，不反映真实的工具执行状态。

### 2. 真实搜索流程

实际的搜索功能通过以下流程工作：

1. **前端触发**：用户发送消息，可选择启用"联网搜索"按钮
2. **后端处理**：`app/api/chat/route.ts` 接收请求
3. **工具定义**：`lib/mcp/mcp-tool-definitions.ts` 定义可用的搜索工具
4. **预检调用**：如果检测到搜索意图，进行 preflight 调用检测 AI 是否要使用工具
5. **工具执行**：`lib/mcp/mcp-tool-executor.ts` 执行实际的搜索 API 调用
6. **结果返回**：搜索结果通过 SSE 流返回给前端

### 3. 关键代码位置

**搜索工具定义** (`lib/mcp/mcp-tool-definitions.ts`):
- `mcp_brave_search`: Brave 搜索引擎
- `mcp_exa_search`: Exa 语义搜索
- `mcp_firecrawl_scrape`: 网页内容抓取

**工具执行器** (`lib/mcp/mcp-tool-executor.ts`):
- `executeBraveSearch()`: 调用 Brave Search API
- `executeExaSearch()`: 调用 Exa API
- `executeFirecrawlScrape()`: 调用 Firecrawl API

**前端状态管理** (`app/ai-assistant/page.tsx`):
- `enableSearch`: 控制是否启用搜索
- `agentStatus`: 显示当前 AI 状态
- `studioData`: 存储工具执行结果
- `browsingUrl`: 显示正在浏览的网页

## 修复方案

### 方案 1：移除模拟数据，使用真实工具状态

修改 `DynamicTaskPlanner` 组件，从 `tool_calls` 和 `tool_result` 事件中提取真实的子任务状态。

### 方案 2：改进工具调用反馈

确保当 AI 调用搜索工具时：
1. 前端立即显示"正在搜索..."状态
2. 工作室侧边栏自动打开
3. 显示真实的搜索进度和结果
4. 更新任务规划器的状态

### 方案 3：增强搜索意图检测

在 `app/api/chat/route.ts` 中改进启发式检测：
- 当用户消息包含"搜索"、"查"、"找"等关键词时
- 自动建议 AI 使用搜索工具
- 即使用户没有点击"联网搜索"按钮

## 实施步骤

### 步骤 1：修复任务规划器

将 `getMockSubActions` 改为从真实的工具调用数据中提取：

```typescript
// 从 TASK_LIST 中提取真实的 subActions
const data = JSON.parse(match[1])
const tasks = data.tasks
const activeTask = tasks[currentIndex] || tasks[0]
const subActions = activeTask.subActions || [] // 使用真实数据，不再模拟
```

### 步骤 2：确保工具调用可见性

在 `handleSend` 函数中，当检测到 `tool_calls` 时：

```typescript
if (data.tool_calls) {
  const toolNames = data.tool_calls.map((t: any) => t.function.name).join(", ")
  setAgentStatus(`正在使用工具: ${toolNames}...`)
  setStudioOpen(true) // 自动打开工作室
  
  // 检查是否有搜索工具
  const searchTools = data.tool_calls.filter((t: any) => 
    t.function.name.includes('search') || 
    t.function.name.includes('scrape')
  )
  
  if (searchTools.length > 0) {
    // 显示搜索状态
    setBrowsingUrl('searching...')
  }
}
```

### 步骤 3：改进后端搜索触发

在 `app/api/chat/route.ts` 中，增强自动触发逻辑：

```typescript
// 自动触发搜索工具
if ((lowerMsg.includes('搜索') || lowerMsg.includes('查一下') || lowerMsg.includes('找一下')) && !lowerMsg.includes('@')) {
  const firecrawl = mcpToolDefs.find(t => t.function.name === 'mcp_firecrawl_scrape')
  const exa = mcpToolDefs.find(t => t.function.name === 'mcp_exa_search')
  const brave = mcpToolDefs.find(t => t.function.name === 'mcp_brave_search')
  
  const bestTool = firecrawl || exa || brave
  
  if (bestTool) {
    forcedToolPrompt = `\n\n**重要提示：**\n用户想要搜索信息。你必须主动调用 \`${bestTool.function.name}\` 工具。`
  }
}
```

## 验证方法

### 测试用例 1：基本搜索
1. 在 AI 助手中输入："搜索草莓种植最佳温度"
2. 预期：
   - 显示"正在使用工具: mcp_brave_search..."
   - 工作室侧边栏自动打开
   - 显示搜索结果
   - 任务规划器显示真实的搜索进度

### 测试用例 2：网页抓取
1. 输入："抓取 https://example.com 的内容"
2. 预期：
   - 显示"正在使用工具: mcp_firecrawl_scrape..."
   - 显示浏览器动画
   - 返回网页内容

### 测试用例 3：自动搜索
1. 输入："3月份草莓大棚应该如何管理？"
2. 预期：
   - AI 自动识别需要搜索
   - 调用搜索工具获取最新信息
   - 基于搜索结果给出建议

## 配置要求

确保以下 MCP 服务已正确配置：

### Brave Search
```json
{
  "id": "brave-search",
  "name": "brave-search",
  "displayName": "Brave 搜索",
  "enabled": true,
  "envVars": {
    "BRAVE_API_KEY": "your-api-key"
  }
}
```

### Exa Search
```json
{
  "id": "exa-search",
  "name": "exa-search",
  "displayName": "Exa 搜索",
  "enabled": true,
  "envVars": {
    "EXA_API_KEY": "your-api-key"
  }
}
```

### Firecrawl
```json
{
  "id": "firecrawl",
  "name": "firecrawl",
  "displayName": "网页抓取",
  "enabled": true,
  "envVars": {
    "FIRECRAWL_API_KEY": "your-api-key"
  }
}
```

## 常见问题

### Q: 为什么搜索按钮点击后没有反应？
A: 检查：
1. MCP 服务是否已启用
2. API Key 是否正确配置
3. 浏览器控制台是否有错误
4. 网络请求是否成功

### Q: 搜索结果为空怎么办？
A: 可能原因：
1. API 配额已用完
2. 搜索关键词不当
3. 网络连接问题
4. API 服务暂时不可用

### Q: 如何查看搜索工具的执行日志？
A: 
1. 打开浏览器开发者工具
2. 查看 Console 标签
3. 搜索 `[MCP]` 前缀的日志
4. 检查 Network 标签中的 `/api/chat` 请求

## 总结

搜索功能本身是正常工作的，问题在于：
1. 前端显示的是模拟数据而非真实状态
2. 工具调用的可见性不够
3. 用户不知道搜索功能需要配置 MCP 服务

通过上述修复，可以确保：
- 用户看到的是真实的搜索状态
- 搜索过程透明可见
- 搜索结果正确显示
