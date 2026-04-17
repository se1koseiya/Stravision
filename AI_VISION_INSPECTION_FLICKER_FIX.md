# AI 视觉巡检消息闪烁修复

## 问题描述
在 AI 视觉巡检 (`move_camera_and_look`) 过程中，会出现多条消息体闪烁的问题。

## 根本原因
1. **多个 setTimeout 延迟**：
   - `setTimeout(() => handleSend(...), 100)` - 100ms 延迟发送消息
   - `setTimeout(() => setIsInspecting(false), 2000)` - 2秒后清理检查状态
   - `setTimeout(() => { setVisionInspectionUrl(null); setVisionInspectionStatus('') }, 3000)` - 3秒后清理视觉状态

2. **状态清理时机不当**：
   - 视觉状态清理在消息发送**之后**，导致 UI 显示不同步
   - 如果 AI 响应快速，新消息在清理完成前到达，造成闪烁

3. **延迟累积效应**：
   - 100ms + 2000ms + 3000ms 的多层延迟
   - 在这期间 UI 状态不稳定，容易出现闪烁

## 解决方案

### 优化策略
1. **移除不必要的 setTimeout 包装**
   - 直接调用 `handleSend`，无需 100ms 延迟
   - 消息发送应该是即时的

2. **调整状态清理顺序**
   - 在发送消息**之前**清理视觉状态
   - 确保 UI 状态与实际操作同步

3. **缩短清理延迟**
   - 将 `isInspecting` 清理延迟从 2000ms 降至 500ms
   - 移除 3000ms 的额外清理延迟

### 代码变更

**修改前：**
```typescript
hasSentCustomFeedback = true

setInspectionStatus("完成巡检分析。");
setTimeout(() => setIsInspecting(false), 2000);
showNotice("✅ 视觉巡检", "画面已发送给 AI 分析", "success")

setTimeout(() => {
  handleSend(visionMessage as any, [], true, true)
}, 100)

setTimeout(() => {
  setVisionInspectionUrl(null)
  setVisionInspectionStatus('')
}, 3000)
```

**修改后：**
```typescript
hasSentCustomFeedback = true

setInspectionStatus("完成巡检分析。");
showNotice("✅ 视觉巡检", "画面已发送给 AI 分析", "success")

// 立即清理视觉巡检状态，避免闪烁
setVisionInspectionUrl(null)
setVisionInspectionStatus('')

// 直接调用 handleSend 发送多模态消息
handleSend(visionMessage as any, [], true, true)

// 延迟清理 isInspecting 状态
setTimeout(() => setIsInspecting(false), 500)
```

## 改进效果

### 时间线对比

**修改前：**
```
T+0ms:    设置状态
T+100ms:  发送消息
T+2000ms: 清理 isInspecting
T+3000ms: 清理视觉状态
```

**修改后：**
```
T+0ms:    设置状态 → 清理视觉状态 → 发送消息
T+500ms:  清理 isInspecting
```

### 优势
1. **消除闪烁**：状态清理与消息发送同步，无延迟差
2. **响应更快**：总延迟从 3000ms 降至 500ms
3. **逻辑更清晰**：状态管理顺序符合直觉

## 测试验证

### 测试步骤
1. 在 AI 助手中触发视觉巡检命令
2. 观察消息发送过程
3. 确认无多条消息闪烁
4. 验证 AI 正常接收并处理视觉消息

### 预期结果
- ✅ 消息发送流畅，无闪烁
- ✅ 视觉状态清理及时
- ✅ AI 正常分析画面并回复

## 相关文件
- `app/ai-assistant/page.tsx` (lines ~1730-1750)

## 日期
2026-04-17
