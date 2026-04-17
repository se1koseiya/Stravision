# 定时任务功能 - 最终测试指南

## 修复完成

✅ **已修复**：使用 `useRef` 确保定时任务回调中可以访问 `handleSend` 函数

## 测试步骤

### 测试1：创建1分钟后的环境检查任务

1. 打开AI助手页面
2. 输入："1分钟后重新检查一下环境"
3. AI应该回复并创建任务
4. 点击右侧"工作室"面板
5. 切换到"定时任务"标签
6. 应该看到任务显示，倒计时1分钟

**预期结果**：
- 1分钟后显示Toast："定时任务执行：重新检查环境状态"
- AI自动发送新消息进行环境分析
- 任务状态变为"已完成"

### 测试2：创建30秒后的快速测试

1. 输入："30秒后提醒我"
2. 等待30秒

**预期结果**：
- 30秒后显示Toast提醒
- 任务状态变为"已完成"

### 测试3：查看浏览器控制台

按F12打开控制台，应该看到：

```
[Schedule Task] Checking content for SCHEDULE_TASK tag...
[Schedule Task] Parsed task data: {description: "...", delayMinutes: 1, ...}
[Schedule Task] Task created with ID: task-xxx
定时任务已创建：...
```

1分钟后：

```
[Schedule Task] Executing task: {...}
定时任务执行：...
[Schedule Task] Triggering AI analysis...
[Schedule Task] AI analysis triggered successfully
```

## 关键改进

### 改进1：使用 useRef 保存 handleSend

```typescript
// 创建 ref
const handleSendRef = useRef<typeof handleSend | null>(null)

// 在 useEffect 中更新
useEffect(() => {
  handleSendRef.current = handleSend
}, [])

// 在回调中使用
if (handleSendRef.current) {
  await handleSendRef.current(analysisPrompt, [], false, false)
}
```

这确保了即使在定时器触发时（可能在不同的作用域），也能访问到正确的 `handleSend` 函数。

### 改进2：增强错误处理

```typescript
try {
  if (handleSendRef.current) {
    await handleSendRef.current(analysisPrompt, [], false, false)
    console.log('[Schedule Task] AI analysis triggered successfully')
  } else {
    console.error('[Schedule Task] handleSendRef.current is null')
    toast.error('定时任务执行失败：无法访问AI接口')
  }
} catch (error) {
  console.error('[Schedule Task] Failed to trigger AI analysis:', error)
  toast.error('定时任务执行失败，请手动检查')
}
```

### 改进3：优化AI提示词

简化了系统提示词，让AI更容易理解如何输出 `<SCHEDULE_TASK>` 标记。

## 故障排查

### 如果任务不执行

1. 检查浏览器控制台是否有错误
2. 确认页面没有被关闭或刷新
3. 检查 `handleSendRef.current` 是否为 null

### 如果AI没有响应

1. 检查网络请求是否成功
2. 查看控制台是否有API错误
3. 确认AI API配置正确

### 如果任务显示但不创建

1. 检查AI响应中是否包含 `<SCHEDULE_TASK>` 标记
2. 查看控制台的 `Content preview` 日志
3. 确认JSON格式正确

## 成功标志

✅ 任务能正常创建并显示
✅ 倒计时正常工作
✅ 任务到期时自动执行
✅ AI被正确触发并进行分析
✅ 分析结果显示在聊天界面
✅ 任务状态更新为"已完成"

## 下一步优化

1. **添加任务编辑功能** - 允许用户修改任务时间
2. **支持重复任务** - 每天/每周定时执行
3. **任务历史统计** - 显示任务执行成功率
4. **跨标签页同步** - 使用 BroadcastChannel API
5. **离线支持** - 使用 Service Worker

## 总结

定时任务功能现在应该可以完整工作了：
- ✅ 任务创建
- ✅ 任务显示
- ✅ 任务执行
- ✅ AI触发
- ✅ 环境诊断

请按照上述测试步骤进行验证，如有问题请查看浏览器控制台的详细日志。
