# AI 助手深度思考模式修复

## 问题描述

### 问题 1：未开启深度思考时输出思维链
在未开启深度思考模式的情况下，AI 助手仍然会输出 `<REASONING>` 标签和思维链内容，导致用户界面显示不必要的思考过程。

### 问题 2：把所有内容都放进 REASONING 标签
AI 助手错误地将所有回答内容（包括最终结论）都放在 `<REASONING>` 标签内，导致用户看不到最终答案，只能看到一个可折叠的思考过程卡片。

## 问题原因

1. **后端问题 1**：系统提示词中没有明确禁止 AI 在未开启深度思考模式时输出思维链
2. **后端问题 2**：系统提示词中没有明确说明 `<REASONING>` 标签的正确使用方式
3. **前端问题**：前端会解析并显示所有 `<REASONING>` 标签内容，无论用户是否开启了深度思考模式

## 修复方案

### 1. 后端修复 (`lib/ai/prompt-templates.ts`)

#### 新增禁止思维链指令

```typescript
export const NO_REASONING_INSTRUCTION_COMPACT = `
## 重要：禁止输出思维链
**严禁**在回复中输出 <REASONING> 标签或任何形式的思考过程。
用户未开启深度思考模式，请直接给出答案，不要展示中间推理步骤。
`;
```

#### 修改思维链使用指令（重点修复）

```typescript
export const REASONING_INSTRUCTION_COMPACT = `
## 思考过程（深度思考模式）
**重要：正确使用 REASONING 标签**

<REASONING> 标签**仅用于展示思考过程**，不是用来放最终答案的！

**正确格式：**
<REASONING>
1. 问题分析：用户想要...
2. 解决思路：我需要先...再...
3. 关键步骤：第一步...第二步...
</REASONING>

基于以上分析，我的建议是...（这里是最终答案，放在标签外面）

**错误示例（严禁）：**
❌ 把所有内容都放在 <REASONING> 里
❌ 把最终结论放在 <REASONING> 里
❌ 不输出标签外的内容

**记住：**
- <REASONING> 里面 = 思考过程（用户可以折叠隐藏）
- <REASONING> 外面 = 最终答案（用户必须看到的）
`;
```

#### 修改系统提示词生成逻辑

```typescript
export function generateCompactSystemPrompt(options: {
  basePrompt: string;
  enableDeviceControl: boolean;
  enableReasoning: boolean;
  mcpToolNames: string[];
  contextCompressed: boolean;
}): string {
  const parts = [options.basePrompt];

  if (options.enableDeviceControl) {
    parts.push(DEVICE_CONTROL_INSTRUCTION_COMPACT);
  }

  // 明确控制思维链输出
  if (options.enableReasoning) {
    parts.push(REASONING_INSTRUCTION_COMPACT);
  } else {
    // 未开启深度思考时，明确禁止输出思维链
    parts.push(NO_REASONING_INSTRUCTION_COMPACT);
  }

  // ... 其他指令
}
```

### 2. 前端修复 (`app/ai-assistant/page.tsx`)

#### 修复流式输出中的 reasoning 解析

```typescript
// Simplified reasoning parsing (仅在开启深度思考模式时解析)
const combined = assistantMsg.content as string
if (enableReasoning && reasoningStart === -1) {
  const sIdx = combined.indexOf("<REASONING>")
  if (sIdx !== -1) reasoningStart = sIdx
}

let display = combined
if (enableReasoning && reasoningStart !== -1) {
  const endIdx = combined.indexOf("</REASONING>", reasoningStart)
  if (endIdx !== -1) {
    reasoningText = combined.slice(reasoningStart + 11, endIdx)
    display = combined.slice(0, reasoningStart) + combined.slice(endIdx + 12)
  } else {
    reasoningText = combined.slice(reasoningStart + 11)
    display = combined.slice(0, reasoningStart)
  }
} else if (!enableReasoning) {
  // 未开启深度思考时，移除所有 REASONING 标签
  display = display.replace(/<REASONING>[\s\S]*?<\/REASONING>/g, '')
  display = display.replace(/<REASONING>[\s\S]*$/g, '') // 移除未闭合的标签
}

setMessages(prev => {
  const newMsgs = [...prev]
  newMsgs[newMsgs.length - 1] = {
    role: "assistant",
    content: display,
    reasoning: enableReasoning ? { text: reasoningText, durationMs: Date.now() - startTs } : undefined,
    model: selectedModel || aiSettings?.model
  }
  return newMsgs
})
```

#### 修复消息渲染逻辑

```typescript
// 渲染思考过程（仅在开启深度思考模式时显示）
const reasoningElement = (msg.reasoning?.text && enableReasoning) ? (
  <Reasoning isStreaming={false} className="mb-4">
    <ReasoningTrigger />
    <ReasoningContent>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ node, inline, className, children, ...props }: any) => (
            <code className={cn("bg-zinc-100 dark:bg-zinc-800 rounded px-1 font-mono text-xs text-zinc-800 dark:text-zinc-200 font-semibold", className)} {...props}>{children}</code>
          )
        }}
      >
        {msg.reasoning.text}
      </ReactMarkdown>
    </ReasoningContent>
  </Reasoning>
) : null
```

#### 修复会话保存逻辑

```typescript
if (ensuredSessionId) {
  const lastMsg = {  
    ...assistantMsg, 
    reasoning: enableReasoning ? { text: reasoningText, durationMs: Date.now() - startTs } : undefined,
    model: selectedModel || aiSettings?.model
  }
  await fetch(`/api/sessions/${ensuredSessionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: latestHistoryFromBackend ? [...latestHistoryFromBackend, lastMsg] : [...currentMessagesForApi, lastMsg] })
  })
}
```

## 修复效果

### 修复前
- ❌ 未开启深度思考模式时，AI 仍然输出 `<REASONING>` 标签
- ❌ AI 把所有内容（包括最终答案）都放在 `<REASONING>` 标签里
- ❌ 用户看不到最终答案，只能看到一个可折叠的思考过程卡片
- ❌ 前端显示不必要的思考过程
- ❌ 用户体验极差

### 修复后
- ✅ 未开启深度思考模式时，系统提示词明确禁止 AI 输出思维链
- ✅ 开启深度思考模式时，系统提示词明确说明 `<REASONING>` 的正确使用方式
- ✅ AI 正确地将思考过程放在 `<REASONING>` 标签内，最终答案放在标签外
- ✅ 前端在解析时检查 `enableReasoning` 状态，过滤掉意外的思维链内容
- ✅ 前端渲染时只在开启深度思考模式时显示 reasoning 组件
- ✅ 会话保存时只在开启深度思考模式时保存 reasoning 数据
- ✅ 用户可以看到完整的最终答案，同时可以选择性查看思考过程
- ✅ 用户体验得到极大改善

## 测试建议

1. **关闭深度思考模式测试**
   - 关闭深度思考开关
   - 发送各种类型的问题
   - 验证 AI 回复中不包含 `<REASONING>` 标签
   - 验证前端不显示思考过程组件
   - 验证用户可以直接看到完整的答案

2. **开启深度思考模式测试**
   - 开启深度思考开关
   - 发送复杂问题
   - 验证 AI 正确输出思考过程（在 `<REASONING>` 标签内）
   - 验证 AI 在标签外输出最终答案
   - 验证前端正确显示可折叠的思考过程卡片
   - 验证用户可以看到完整的最终答案
   - 验证用户可以展开/折叠思考过程

3. **模式切换测试**
   - 在同一会话中切换深度思考模式
   - 验证历史消息的显示正确
   - 验证新消息按照当前模式处理

4. **边界情况测试**
   - 测试 AI 是否会违反指令把答案放在 `<REASONING>` 里
   - 如果发生，验证前端是否正确处理（用户仍能看到内容）
   - 测试长文本回答的显示效果

## 相关文件

- `lib/ai/prompt-templates.ts` - 系统提示词模板（主要修复）
- `app/api/chat/route.ts` - 聊天 API 路由（同步更新 reasoningInstruction）
- `app/ai-assistant/page.tsx` - AI 助手前端页面（添加过滤和检查）

## 使用示例

### ✅ 正确示例（开启深度思考模式）

**AI 输出：**
```
<REASONING>
1. 问题分析：用户询问草莓大棚的温度控制策略
2. 解决思路：需要考虑当前季节、时段和草莓生长阶段
3. 关键步骤：
   - 查询当前环境数据
   - 对比标准温度范围
   - 制定调控方案
</REASONING>

根据当前的环境数据分析，您的草莓大棚温度为 28°C，略高于适宜范围（20-25°C）。

建议采取以下措施：
1. 立即开启风扇进行通风降温
2. 适当遮阳，减少直射光照
3. 增加喷雾频率，利用蒸发降温

预计通过以上措施，可在 30 分钟内将温度降至 25°C 左右。
```

**用户看到：**
- 一个可折叠的"思考过程"卡片（默认折叠）
- 完整的最终答案和建议（始终可见）

---

### ❌ 错误示例（把所有内容都放在 REASONING 里）

**AI 输出：**
```
<REASONING>
1. 问题分析：用户询问草莓大棚的温度控制策略
2. 解决思路：需要考虑当前季节、时段和草莓生长阶段
3. 关键步骤：
   - 查询当前环境数据
   - 对比标准温度范围
   - 制定调控方案

根据当前的环境数据分析，您的草莓大棚温度为 28°C，略高于适宜范围（20-25°C）。

建议采取以下措施：
1. 立即开启风扇进行通风降温
2. 适当遮阳，减少直射光照
3. 增加喷雾频率，利用蒸发降温

预计通过以上措施，可在 30 分钟内将温度降至 25°C 左右。
</REASONING>
```

**用户看到：**
- 只有一个可折叠的"思考过程"卡片
- 如果不展开卡片，看不到任何答案
- 用户体验极差 ❌

---

### ✅ 正确示例（关闭深度思考模式）

**AI 输出：**
```
根据当前的环境数据分析，您的草莓大棚温度为 28°C，略高于适宜范围（20-25°C）。

建议采取以下措施：
1. 立即开启风扇进行通风降温
2. 适当遮阳，减少直射光照
3. 增加喷雾频率，利用蒸发降温

预计通过以上措施，可在 30 分钟内将温度降至 25°C 左右。
```

**用户看到：**
- 直接看到完整的答案
- 没有思考过程卡片
- 简洁明了 ✅

## 相关文件

- `lib/ai/prompt-templates.ts` - 系统提示词模板
- `app/ai-assistant/page.tsx` - AI 助手前端页面
- `app/api/chat/route.ts` - 聊天 API 路由（使用 `generateCompactSystemPrompt`）

## 注意事项

1. 这个修复采用了**双重保护**机制：
   - 后端通过系统提示词明确禁止 AI 输出思维链
   - 前端通过检查 `enableReasoning` 状态过滤和隐藏思维链内容

2. 即使 AI 违反指令输出了思维链，前端也会将其过滤掉，确保用户不会看到不应该显示的内容

3. 修复保持了向后兼容性，不影响已有的深度思考功能

## 修复日期

2026-04-16
