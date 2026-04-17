# AI 功能禁用 - 前端过滤修复

## 问题描述

用户在管理员后台禁用了 AI 功能（如任务列表 `<TASK_LIST>`），但 AI 仍然在输出中包含这些被禁用的标签。尽管已经实现了三层防护（系统提示词、后端过滤、前端过滤），但前端过滤层没有被正确应用。

## 根本原因

前端虽然导入了 `useAIFeatures` hook 和 `filterDisabledFeatures` 函数，但：
1. **未调用 hook**：`useAIFeatures` hook 被导入但从未在组件中调用
2. **未应用过滤**：`filterDisabledFeatures` 函数未在消息处理流程中使用
3. **缺少组件级检查**：`DynamicTaskPlanner` 等组件没有检查功能是否被禁用

## 解决方案

### 1. 调用 useAIFeatures Hook

在 `AIAssistantContent` 组件中添加：

```typescript
// AI Features Configuration Hook
const { config: aiFeatures } = useAIFeatures()
console.log('[AI Features] Current config:', aiFeatures)
```

### 2. 导入过滤函数

```typescript
import { filterDisabledFeatures } from '@/lib/ai/prompt-templates'
```

### 3. 在消息流处理中应用过滤

在流式响应处理部分（约 2797 行）：

```typescript
// 🔥 强制过滤被禁用的功能标签（前端最后一道防线）
display = filterDisabledFeatures(display, aiFeatures)
console.log('[Frontend Filter] Applied to streaming content')
```

### 4. 在消息渲染时应用过滤

在 `renderMessageContent` 函数开头（约 3353 行）：

```typescript
// 🔥 前端最后一道防线：强制过滤被禁用的功能标签
if (typeof content === 'string') {
  content = filterDisabledFeatures(content, aiFeatures)
}
```

### 5. 添加组件级检查

在渲染 `DynamicTaskPlanner` 时添加条件检查：

```typescript
{dynamicTaskContent && aiFeatures.enableTaskList !== false && 
  <DynamicTaskPlanner content={dynamicTaskContent} onOpenStudio={onOpenStudio} />}
```

### 6. 配置变化时重新过滤

添加 `useEffect` 在配置变化时重新过滤所有历史消息：

```typescript
// 🔥 当 AI 功能配置变化时，重新过滤所有消息
useEffect(() => {
  if (!aiFeatures) return
  
  setMessages(prev => prev.map(msg => {
    if (msg.role === 'assistant' && typeof msg.content === 'string') {
      const filtered = filterDisabledFeatures(msg.content, aiFeatures)
      if (filtered !== msg.content) {
        console.log('[AI Features] Re-filtered message due to config change')
        return { ...msg, content: filtered }
      }
    }
    return msg
  }))
}, [aiFeatures])
```

## 防护层级总结

现在系统有**四层防护**确保被禁用的功能不会显示：

### 第一层：系统提示词（Backend）
- 位置：`lib/ai/prompt-templates.ts` - `generateDisabledFeaturesInstruction()`
- 作用：在系统提示词最顶部添加强烈警告，告诉 AI 不要输出被禁用的标签
- 优先级：最高（放在提示词最前面）

### 第二层：后端流过滤（Backend）
- 位置：`app/api/chat/route.ts` - 流式响应处理
- 作用：在 AI 输出流中实时过滤被禁用的标签
- 代码：`filteredContent = filterDisabledFeatures(filteredContent, aiFeatures)`

### 第三层：前端流过滤（Frontend - 新增）
- 位置：`app/ai-assistant/page.tsx` - 消息流处理（约 2797 行）
- 作用：在前端接收流时再次过滤
- 代码：`display = filterDisabledFeatures(display, aiFeatures)`

### 第四层：渲染时过滤（Frontend - 新增）
- 位置：`app/ai-assistant/page.tsx` - `renderMessageContent` 函数
- 作用：在渲染消息前最后一次过滤
- 代码：`content = filterDisabledFeatures(content, aiFeatures)`

### 第五层：组件级检查（Frontend - 新增）
- 位置：`app/ai-assistant/page.tsx` - 组件渲染条件
- 作用：即使标签通过了过滤，组件也不会渲染
- 代码：`{dynamicTaskContent && aiFeatures.enableTaskList !== false && ...}`

### 第六层：配置变化响应（Frontend - 新增）
- 位置：`app/ai-assistant/page.tsx` - `useEffect` hook
- 作用：当配置变化时，重新过滤所有历史消息
- 触发：`aiFeatures` 配置对象变化时

## 测试步骤

1. **验证配置文件**：
   ```bash
   cat data/ai-features-config.json
   ```
   确认 `enableTaskList: false`

2. **重启开发服务器**：
   ```bash
   npm run dev
   ```

3. **打开浏览器控制台**，查看日志：
   - `[AI Features] Current config:` - 确认配置已加载
   - `[Frontend Filter] Applied to streaming content` - 确认流过滤生效
   - `[Filter] Removed TASK_LIST tags` - 确认标签被移除

4. **测试对话**：
   - 向 AI 发送会触发任务列表的请求（如"帮我规划一下今天的工作"）
   - 确认 AI 回复中**没有**出现 `<TASK_LIST>` 标签
   - 确认 `DynamicTaskPlanner` 组件**没有**渲染

5. **测试配置切换**：
   - 在管理员后台启用任务列表功能
   - 刷新页面
   - 发送相同请求，确认任务列表正常显示

## 修改的文件

1. **app/ai-assistant/page.tsx**
   - 添加 `useAIFeatures` hook 调用
   - 导入 `filterDisabledFeatures` 函数
   - 在流处理中应用过滤
   - 在渲染函数中应用过滤
   - 添加组件级条件检查
   - 添加配置变化响应 useEffect

2. **lib/ai/prompt-templates.ts**（已存在，无需修改）
   - `filterDisabledFeatures` 函数
   - `generateDisabledFeaturesInstruction` 函数

3. **app/api/chat/route.ts**（已存在，无需修改）
   - 后端过滤逻辑

4. **data/ai-features-config.json**（已存在，无需修改）
   - 配置文件

## 预期结果

- ✅ 当 `enableTaskList: false` 时，AI 不会输出 `<TASK_LIST>` 标签
- ✅ 即使 AI 违反指令输出了标签，也会被前端过滤掉
- ✅ `DynamicTaskPlanner` 组件不会渲染
- ✅ 控制台会显示过滤日志
- ✅ 用户界面完全看不到被禁用的功能

## 调试技巧

如果问题仍然存在：

1. **检查配置加载**：
   ```javascript
   console.log('[AI Features] Current config:', aiFeatures)
   ```

2. **检查过滤执行**：
   ```javascript
   console.log('[Frontend Filter] Before:', content)
   console.log('[Frontend Filter] After:', filtered)
   ```

3. **检查组件渲染**：
   ```javascript
   console.log('[DynamicTaskPlanner] Should render?', 
     dynamicTaskContent && aiFeatures.enableTaskList !== false)
   ```

4. **清除缓存**：
   - 清除浏览器缓存
   - 重启开发服务器
   - 使用无痕模式测试

## 总结

通过在前端添加三个关键点的过滤（流处理、渲染、组件级），配合后端的两层防护（提示词、流过滤），以及配置变化响应机制，现在系统有**六层防护**确保被禁用的功能不会显示给用户。这是一个深度防御策略，即使某一层失效，其他层也能保证功能正常工作。
