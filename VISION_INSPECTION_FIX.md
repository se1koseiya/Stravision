# 视觉巡检闪烁问题修复

## 问题描述

AI 视觉巡检面板在完成巡检后会一直显示，导致界面闪烁和用户体验不佳。

## 问题原因

1. **状态未清理**：在视觉巡检完成后，只清理了 `setInspectionStatus` 和 `setIsInspecting`，但没有清理 `setVisionInspectionUrl` 和 `setVisionInspectionStatus`
2. **缺少退出动画**：面板没有平滑的退出动画，导致突然消失
3. **重复渲染**：没有使用 `key` 属性，可能导致组件重复渲染

## 修复方案

### 1. 添加状态清理逻辑

在视觉巡检完成后，延迟 3 秒清理状态，给用户足够时间看到完成状态：

```typescript
// 清理视觉巡检状态，避免面板一直显示
setTimeout(() => {
  setVisionInspectionUrl(null)
  setVisionInspectionStatus('')
}, 3000) // 3秒后清理，给用户足够时间看到完成状态
```

**位置**：`app/ai-assistant/page.tsx` 第 1548 行

### 2. 添加 AnimatePresence 和退出动画

使用 Framer Motion 的 `AnimatePresence` 组件包裹视觉巡检面板，添加平滑的进入和退出动画：

```tsx
<AnimatePresence mode="wait">
  {visionInspectionUrl && (
    <motion.div
      key={visionInspectionUrl} // 添加 key 避免重复渲染
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }} // 添加退出动画
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6"
    >
      {/* 视觉巡检面板内容 */}
    </motion.div>
  )}
</AnimatePresence>
```

**位置**：`app/ai-assistant/page.tsx` 第 4703-4782 行

### 3. 添加唯一 key

为 motion.div 添加 `key={visionInspectionUrl}`，确保每次 URL 变化时都会创建新的组件实例，避免重复渲染导致的闪烁。

## 修改文件

- `app/ai-assistant/page.tsx`
  - 第 1548-1552 行：添加状态清理逻辑
  - 第 4703 行：添加 AnimatePresence 包裹
  - 第 4705 行：添加 key 属性
  - 第 4708 行：添加 exit 动画
  - 第 4782 行：关闭 AnimatePresence 标签

## 效果

修复后的效果：

1. ✅ 视觉巡检完成后，面板会在 3 秒后自动消失
2. ✅ 面板消失时有平滑的淡出和向上移动动画
3. ✅ 避免了重复渲染导致的闪烁
4. ✅ 用户体验更流畅

## 时间线

- **进入动画**：0.4 秒（淡入 + 向下移动）
- **显示时间**：视觉巡检过程中持续显示
- **完成提示**：显示 "画面已发送给 AI 分析" 3 秒
- **退出动画**：0.4 秒（淡出 + 向上移动）

## 测试建议

1. 触发一次视觉巡检
2. 观察面板的进入动画是否流畅
3. 等待巡检完成
4. 观察面板是否在 3 秒后平滑消失
5. 多次触发巡检，确认没有闪烁或重复渲染

## 相关代码

### 视觉巡检触发代码

```typescript
// Step 3: 加载视频流并截图
setVisionInspectionStatus(`正在捕捉 ${cameraId === 'b' ? 'B' : 'A'} 摄像头实时画面...`);
setVisionInspectionUrl(playableUrl)

// ... 截图逻辑 ...

// Step 4: 发送截图给 AI
showNotice("✅ 视觉巡检", "画面已发送给 AI 分析", "success")

// 清理状态
setTimeout(() => {
  setVisionInspectionUrl(null)
  setVisionInspectionStatus('')
}, 3000)
```

### 视觉巡检面板渲染

```tsx
<AnimatePresence mode="wait">
  {visionInspectionUrl && (
    <motion.div
      key={visionInspectionUrl}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* 面板内容 */}
    </motion.div>
  )}
</AnimatePresence>
```

## 注意事项

1. **延迟时间**：3 秒的延迟是为了让用户看到完成状态，可以根据需要调整
2. **动画时长**：0.4 秒的动画时长与其他面板保持一致
3. **mode="wait"**：确保退出动画完成后再显示新的面板
4. **key 属性**：使用 URL 作为 key，确保每次 URL 变化都会重新渲染

## 总结

通过添加状态清理逻辑、AnimatePresence 包裹和退出动画，成功修复了视觉巡检面板一直闪烁的问题。现在面板会在完成后平滑消失，用户体验更加流畅。

---

**修复时间**：2026年4月15日  
**修复人员**：Kiro AI Assistant  
**状态**：✅ 已完成
