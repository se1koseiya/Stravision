# 搜索工具错误修复指南

## 问题描述

当用户启用"全网检索"功能但未安装相应的MCP搜索工具时，AI会尝试调用不存在的搜索工具，导致出现以下错误：

```
search.engine 意外终止了连接
```

## 根本原因

1. 用户点击了"全网检索"按钮
2. AI收到 `enableSearch: true` 标志
3. AI尝试调用 `mcp_exa_search` 或 `mcp_brave_search` 工具
4. 但用户未安装这些MCP工具
5. 工具调用失败，显示连接错误

## 解决方案

### 1. 前端预检查（已实现）

在用户点击"全网检索"按钮时，检查是否安装了搜索工具：

```typescript
onClick={() => {
  // 检查是否安装了搜索工具
  const hasSearchTool = availableTools.some(t => 
    t.name.includes('search') || 
    t.name.includes('exa') || 
    t.name.includes('brave')
  )
  
  if (!hasSearchTool && !enableSearch) {
    // 如果没有搜索工具且要开启搜索，显示提示
    toast.error('未安装搜索工具', {
      description: '请先在设置中安装 Exa Search 或 Brave Search 等 MCP 工具'
    })
    return
  }
  
  setEnableSearch(!enableSearch)
}}
```

### 2. 后端友好提示（已存在）

在 `app/api/chat/route.ts` 中，当检测到用户需要搜索但未安装工具时，会自动添加提示：

```typescript
if (needsSearch) {
  const hasSearchTool = mcpToolDefs.some(t => 
    t.function.name.includes('search') || 
    t.function.name.includes('exa') || 
    t.function.name.includes('brave')
  )
  if (!hasSearchTool) {
    missingTools.push('搜索工具 (Exa Search / Brave Search)')
  }
}
```

### 3. 工具执行器错误处理（已存在）

在 `lib/mcp/mcp-tool-executor.ts` 中，所有工具调用都有完善的错误处理：

```typescript
try {
  // 工具执行逻辑
} catch (error: any) {
  console.error(`[MCP Executor] Error executing ${functionName}:`, error)
  return { success: false, error: error.message || '工具执行失败' }
}
```

## 用户操作指南

### 如何安装搜索工具

1. **打开设置**
   - 点击右上角的设置图标 ⚙️

2. **进入MCP工具商店**
   - 在设置对话框中，找到"MCP工具商店"标签页

3. **搜索并安装工具**
   - 搜索 "Exa Search" 或 "Brave Search"
   - 点击"安装"按钮

4. **配置API Key**
   - Exa Search: 需要从 https://exa.ai 获取API Key
   - Brave Search: 需要从 https://brave.com/search/api/ 获取API Key

5. **启用工具**
   - 安装后，确保工具处于"已启用"状态
   - 刷新页面使配置生效

### 推荐的搜索工具

#### Exa Search
- **优点**: 专业的AI搜索引擎，适合技术文档和知识查询
- **价格**: 有免费额度
- **官网**: https://exa.ai

#### Brave Search
- **优点**: 隐私友好，通用搜索引擎
- **价格**: 有免费额度
- **官网**: https://brave.com/search/api/

## 技术细节

### 搜索工具检测逻辑

```typescript
// 检测是否有可用的搜索工具
const hasSearchTool = availableTools.some(t => 
  t.name.includes('search') ||  // 通用搜索工具
  t.name.includes('exa') ||      // Exa Search
  t.name.includes('brave')       // Brave Search
)
```

### 错误提示时机

1. **点击按钮时**: 前端立即检查并提示
2. **发送消息时**: 后端检测需求并在系统提示词中添加说明
3. **工具调用时**: 执行器捕获错误并返回友好消息

## 预防措施

### 1. 默认禁用搜索按钮

如果未安装搜索工具，可以考虑默认禁用按钮：

```typescript
<button
  disabled={!hasSearchTool}
  className={cn(
    "...",
    !hasSearchTool && "opacity-50 cursor-not-allowed"
  )}
  title={!hasSearchTool ? "请先安装搜索工具" : "联网搜索"}
>
```

### 2. 添加安装引导

在按钮旁边添加提示链接：

```typescript
{!hasSearchTool && (
  <button onClick={() => setSettingsOpen(true)}>
    <Plus size={14} />
    安装搜索工具
  </button>
)}
```

### 3. 智能降级

当搜索工具不可用时，AI应该：
- 明确告知用户限制
- 基于已有知识回答
- 建议用户安装工具以获得更好体验

## 测试清单

- [ ] 未安装搜索工具时，点击"全网检索"按钮显示提示
- [ ] 已安装搜索工具时，按钮正常工作
- [ ] 搜索工具调用失败时，显示友好错误消息
- [ ] AI能够识别缺少搜索工具并给出建议
- [ ] 错误不会导致整个对话中断

## 相关文件

- `app/ai-assistant/page.tsx` - 前端搜索按钮和检查逻辑
- `app/api/chat/route.ts` - 后端搜索需求检测
- `lib/mcp/mcp-tool-executor.ts` - 工具执行和错误处理
- `lib/mcp/mcp-tool-definitions.ts` - MCP工具定义

## 总结

通过前端预检查、后端友好提示和完善的错误处理，我们可以有效避免搜索工具调用失败导致的用户体验问题。关键是在用户尝试使用功能之前就明确告知需要安装相应的工具。
