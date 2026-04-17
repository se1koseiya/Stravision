# AI 功能禁用 - 调试指南

## 问题：AI 仍然输出被禁用的标签

### 解决方案：三层防护机制

我们实现了**三层防护**来确保被禁用的功能真正不可用：

```
第一层：系统提示词（最前面，最高优先级）
    ↓
第二层：流式输出过滤器（实时过滤）
    ↓
第三层：前端过滤器（最后保护）
```

## 第一层：加强的系统提示词

### 位置
`lib/ai/prompt-templates.ts` - `generateDisabledFeaturesInstruction()`

### 特点
- 🔴 放在系统提示词的**最前面**（最高优先级）
- 🔴 使用多个 🚫 符号和红色警告
- 🔴 详细列出每个被禁用的功能
- 🔴 明确说明"绝对不要"、"严格禁止"
- 🔴 重复强调禁用的标签列表

### 示例输出

```
## 🚫🚫🚫 严格禁用的功能 - 必须遵守！🚫🚫🚫

**⚠️ 系统管理员已禁用以下功能，你必须严格遵守！**

### 禁用的标签列表：
- 任务规划器（<TASK_LIST>）：不要输出任何任务列表或执行计划

### 🔴 绝对禁止的行为：
1. ❌ **绝对不要**输出上述任何标签（<TASK_LIST>）
2. ❌ **绝对不要**尝试使用这些功能
3. ❌ **绝对不要**在回复中提及或暗示这些功能
4. ❌ **绝对不要**输出这些标签的开始标记（如 <TASK_LIST>）
5. ❌ **绝对不要**输出这些标签的结束标记（如 </TASK_LIST>）
6. ❌ **绝对不要**输出这些标签的任何变体或相似形式

### ✅ 正确的做法：
1. ✅ 使用纯文字描述代替被禁用的功能
2. ✅ 如果用户明确要求使用被禁用的功能，礼貌地告知："抱歉，该功能当前不可用，我将用文字描述的方式为您提供信息。"
3. ✅ 用其他可用的方式完成用户的请求

### ⚡ 重要提醒：
- 这是系统级别的强制要求，不是建议
- 违反此规则将导致你的回复被系统过滤
- 请在生成回复前再次检查是否包含被禁用的标签

**记住：<TASK_LIST> 这些标签已被完全禁用，绝对不要输出！**
```

## 第二层：流式输出过滤器

### 位置
`app/api/chat/route.ts` - 流式输出处理

### 代码
```typescript
if (delta?.content) {
  accumulatedContent += delta.content
  
  // 🔥 应用智能过滤器，拦截裸露的 TASK_LIST JSON
  let filteredContent = filterBareTaskListJson(delta.content)
  
  // 🔥 应用功能禁用过滤器
  filteredContent = filterDisabledFeatures(filteredContent, aiFeatures)
  
  // 只有在过滤后还有内容时才发送
  if (filteredContent) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(cleanJson)}\n\n`))
  }
}
```

### 特点
- ✅ 实时过滤每个流式输出块
- ✅ 使用正则表达式移除被禁用的标签
- ✅ 处理完整标签和未闭合标签
- ✅ 记录过滤日志

## 第三层：前端过滤器（可选）

### 位置
`app/ai-assistant/page.tsx` - 使用 `useAIFeatures` hook

### 代码示例
```typescript
const { config: aiFeatures } = useAIFeatures()

// 过滤内容
let processedContent = content

if (!aiFeatures.enableTaskList) {
  processedContent = processedContent.replace(/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/g, '')
}

// 条件渲染
{aiFeatures.enableTaskList && content.includes('<TASK_LIST>') && (
  <DynamicTaskPlanner content={content} />
)}
```

## 调试步骤

### 步骤 1：检查配置文件

```bash
# Windows PowerShell
Get-Content data/ai-features-config.json

# 应该看到
{
  "enableTaskList": false,
  ...
}
```

### 步骤 2：检查后端日志

在服务器控制台中应该看到：

```
[Chat API] AI Features Config: Loaded
[Filter] Removed TASK_LIST tags
```

### 步骤 3：检查系统提示词

在 `app/api/chat/route.ts` 中添加临时日志：

```typescript
const compactSystemPrompt = generateCompactSystemPrompt({
  basePrompt: finalSystemPrompt,
  enableDeviceControl: mandatorySkillsEnabled !== false,
  enableReasoning: enableReasoning,
  mcpToolNames: mcpToolDefs.map(t => t.function.name),
  contextCompressed: contextCompressed,
  aiFeatures: aiFeatures
});

// 临时调试日志
console.log('[System Prompt Preview]', compactSystemPrompt.substring(0, 500))
```

应该看到禁用指令在最前面。

### 步骤 4：测试 AI 回复

1. 访问 AI 助手页面
2. 发送测试消息："帮我制定一个温度调控方案"
3. 观察 AI 的回复

**预期结果：**
- ✅ AI 不输出 `<TASK_LIST>` 标签
- ✅ AI 用文字描述方案
- ✅ 或者 AI 说明该功能不可用

**如果仍然输出：**
- 检查配置文件是否正确
- 检查后端日志是否有过滤记录
- 刷新浏览器（Ctrl+F5）

### 步骤 5：查看网络请求

在浏览器开发者工具中：

1. 打开 Network 标签
2. 发送消息
3. 查看 `/api/chat` 请求
4. 检查响应中是否包含被禁用的标签

## 常见问题

### Q1: 配置文件已经设置为 false，但 AI 仍然输出？

**可能原因：**
1. 配置文件未正确保存
2. 服务器未重启（Node.js 缓存）
3. AI 模型非常固执

**解决方法：**
1. 检查配置文件内容
2. 重启开发服务器
3. 查看后端日志确认配置已加载
4. 流式过滤器会强制移除

### Q2: 后端日志显示已过滤，但前端仍然显示？

**可能原因：**
1. 前端缓存了旧的消息
2. 前端没有应用过滤

**解决方法：**
1. 刷新浏览器（Ctrl+F5）
2. 清除浏览器缓存
3. 在前端也应用过滤器

### Q3: 系统提示词太长，AI 忽略了？

**解决方法：**
- 禁用指令已经放在最前面（最高优先级）
- 使用了多个警告符号和强调
- 流式过滤器会强制移除

### Q4: 某些 AI 模型不遵守指令？

**解决方法：**
- 这是正常的，不同模型的遵守程度不同
- 流式过滤器会强制移除违规输出
- 前端也可以添加额外过滤

## 测试清单

- [ ] 配置文件正确创建
- [ ] 配置文件内容正确
- [ ] 后端日志显示配置已加载
- [ ] 系统提示词包含禁用指令
- [ ] 禁用指令在最前面
- [ ] 流式过滤器正常工作
- [ ] 后端日志显示过滤记录
- [ ] AI 不输出被禁用的标签
- [ ] 前端不显示被禁用的组件

## 强制测试

如果你想强制测试过滤器是否工作，可以：

1. **手动构造包含被禁用标签的响应**

```typescript
// 在 chat API 中临时添加
const testContent = "这是测试 <TASK_LIST>test</TASK_LIST> 内容"
const filtered = filterDisabledFeatures(testContent, aiFeatures)
console.log('[Test]', filtered) // 应该不包含 <TASK_LIST>
```

2. **使用不同的 AI 模型测试**

某些模型更容易违反指令，可以用来测试过滤器。

## 最终验证

如果所有步骤都正确，你应该看到：

1. ✅ 配置文件存在且正确
2. ✅ 后端日志：`[Chat API] AI Features Config: Loaded`
3. ✅ 系统提示词包含禁用警告（在最前面）
4. ✅ AI 不输出被禁用的标签
5. ✅ 如果 AI 违规输出，后端日志：`[Filter] Removed TASK_LIST tags`
6. ✅ 前端不显示被禁用的组件

## 紧急修复

如果以上都不工作，最后的手段：

### 在前端强制过滤

```typescript
// app/ai-assistant/page.tsx
useEffect(() => {
  if (!aiFeatures.enableTaskList) {
    // 强制移除所有 TASK_LIST 标签
    setMessages(prev => prev.map(msg => ({
      ...msg,
      content: typeof msg.content === 'string' 
        ? msg.content.replace(/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/g, '')
        : msg.content
    })))
  }
}, [messages, aiFeatures])
```

## 联系支持

如果问题仍然存在，请提供：

1. 配置文件内容
2. 后端日志
3. AI 的实际输出
4. 使用的 AI 模型
5. 测试消息内容

这将帮助我们诊断问题。
