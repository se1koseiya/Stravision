# 聊天界面滚动优化

## 问题描述

用户在查看历史消息时，当 AI 生成新内容或有新消息时，界面会自动滚动到底部，导致用户无法正常浏览历史消息。

## 解决方案

实现智能滚动逻辑：
- **用户在底部时**：自动滚动到最新消息（保持原有体验）
- **用户在查看历史时**：不自动滚动（让用户继续浏览）

## 实现细节

### 1. 添加状态跟踪

```typescript
const [isUserScrolling, setIsUserScrolling] = useState(false)
const messagesEndRef = useRef<HTMLDivElement>(null)
```

- `isUserScrolling`: 标记用户是否正在查看历史消息
- `messagesEndRef`: 用于标记消息列表的末尾位置

### 2. 滚动检测

```typescript
useEffect(() => {
  const conversationElement = scrollAreaRef.current
  if (!conversationElement) return
  
  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = conversationElement
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
    setIsUserScrolling(!isAtBottom)
  }
  
  conversationElement.addEventListener('scroll', handleScroll)
  return () => conversationElement.removeEventListener('scroll', handleScroll)
}, [])
```

**逻辑说明**:
- 监听滚动事件
- 计算用户是否在底部（距离底部小于 100px 视为在底部）
- 更新 `isUserScrolling` 状态

### 3. 智能自动滚动

```typescript
useEffect(() => {
  if (!isUserScrolling && messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }
}, [messages, isUserScrolling])
```

**逻辑说明**:
- 当消息更新时触发
- 只有当用户在底部（`!isUserScrolling`）时才滚动
- 使用平滑滚动效果

### 4. 添加滚动标记

```tsx
{isLoading && (
  <Message from="assistant">
    {/* ... */}
  </Message>
)}
<div ref={messagesEndRef} />
```

在消息列表末尾添加一个不可见的 div 作为滚动目标。

## 用户体验

### 场景 1: 用户在底部
```
用户发送消息
    ↓
AI 开始回复
    ↓
自动滚动到底部 ✓
    ↓
用户可以实时看到 AI 的回复
```

### 场景 2: 用户在查看历史
```
用户向上滚动查看历史消息
    ↓
isUserScrolling = true
    ↓
AI 继续生成内容
    ↓
不自动滚动 ✓
    ↓
用户可以继续浏览历史消息
```

### 场景 3: 用户返回底部
```
用户滚动到底部
    ↓
isUserScrolling = false
    ↓
恢复自动滚动 ✓
```

## 阈值说明

```typescript
const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
```

- **100px 阈值**: 当用户距离底部小于 100px 时，视为"在底部"
- **为什么是 100px**: 
  - 太小（如 10px）：用户稍微滚动就会停止自动滚动
  - 太大（如 500px）：用户向上滚动很多还会自动滚动
  - 100px 是一个平衡值，提供良好的用户体验

## 优势

1. **不打断用户**: 查看历史消息时不会被强制拉回底部
2. **保持便利性**: 在底部时仍然自动滚动，方便查看最新消息
3. **平滑过渡**: 使用 `smooth` 滚动行为，视觉效果更好
4. **性能优化**: 只在必要时滚动，减少不必要的 DOM 操作

## 测试场景

### 自动化测试辅助工具

为了方便测试，我们提供了一个浏览器控制台测试脚本：

1. 打开聊天界面
2. 按 F12 打开浏览器开发者工具
3. 复制 `.kiro/specs/chat-scroll-control/scroll-test-helper.js` 的内容
4. 粘贴到控制台并回车
5. 使用以下命令进行测试：

```javascript
// 查看当前滚动状态
getScrollInfo()

// 测试阈值边界（自动测试 99px, 100px, 101px）
testThreshold()

// 滚动到指定距离
scrollToDistance(99)   // 应该启用自动滚动
scrollToDistance(101)  // 应该禁用自动滚动

// 检查"回到底部"按钮是否显示
checkBackToBottomButton()

// 测试滚动性能
testScrollPerformance()

// 运行所有检查
runAllChecks()
```

### 手动测试场景

### 测试 1: 自动滚动
1. 打开聊天界面
2. 发送一条消息
3. **预期**: 自动滚动到 AI 回复

### 测试 2: 历史浏览
1. 有多条历史消息
2. 向上滚动查看历史（超过 100px）
3. 发送新消息或 AI 回复
4. **预期**: 不自动滚动，停留在当前位置
5. **预期**: 显示"回到底部"按钮

### 测试 3: 返回底部
1. 向上滚动查看历史
2. 手动滚动到底部
3. 发送新消息
4. **预期**: 恢复自动滚动
5. **预期**: "回到底部"按钮消失

### 测试 4: "回到底部"按钮
1. 向上滚动查看历史
2. 点击右下角的"回到底部"按钮
3. **预期**: 平滑滚动到底部
4. **预期**: 按钮消失

### 详细测试文档

完整的测试场景和验证清单请参考：
`.kiro/specs/chat-scroll-control/test-verification.md`

## 兼容性

- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ 移动端浏览器

## 未来改进

可以考虑添加：
1. **"回到底部"按钮**: 当用户在查看历史时显示
2. **未读消息提示**: 显示有多少条新消息
3. **滚动位置记忆**: 刷新页面后恢复滚动位置
