# AI 视觉巡检改进

## 改进内容

### 1. 将视觉巡检显示移至工作室面板

之前的实现使用独立的全屏弹窗显示视觉巡检画面，现在改为在工作室（Studio）侧边栏中显示，提供更好的用户体验：

- 视觉巡检画面在工作室面板顶部显示
- 保留实时视频流、状态指示器和进度文本
- 用户可以同时查看巡检画面和其他工具执行结果
- 自动打开工作室面板当巡检开始时

### 2. 云台移动集成到 Agent Loop

将云台控制从简单的 API 调用改为完整的工具执行流程：

**之前的实现：**
```typescript
// 直接调用 API，不在工作室中显示
await fetch('/api/ai/device-control', {
  method: 'POST',
  body: JSON.stringify({ action: 'control_camera', direction, pulses })
})
```

**改进后的实现：**
```typescript
// 作为工具调用添加到工作室
setStudioData(prev => [...prev, {
  name: 'control_camera',
  input: { direction, pulses, distance_mm: (pulses / 160).toFixed(1) },
  result: { status: 'moving', message: moveMsg }
}])

// 执行移动
const moveRes = await fetch('/api/ai/device-control', ...)

// 更新工作室状态
setStudioData(prev => {
  const newData = [...prev]
  const lastIdx = newData.findIndex(d => d.name === 'control_camera')
  if (lastIdx >= 0) {
    newData[lastIdx].result = { status: 'success', message: '云台移动完成' }
  }
  return newData
})
```

### 3. 智能延迟等待

根据云台移动距离动态计算等待时间：

```typescript
// 根据脉冲数计算移动时间，最少2秒
const moveTime = Math.max(2000, pulses / 80)
setVisionInspectionStatus(`云台移动中，预计需要 ${(moveTime / 1000).toFixed(1)} 秒...`)
await new Promise(resolve => setTimeout(resolve, moveTime))
```

**计算逻辑：**
- 基础延迟：2000ms（2秒）
- 动态延迟：脉冲数 / 80 毫秒
- 例如：1600 脉冲 = 20ms，使用最小值 2000ms
- 例如：16000 脉冲 = 200ms，使用 2000ms
- 例如：160000 脉冲 = 2000ms，使用 2000ms

这确保了云台有足够时间完成物理移动，避免在移动未完成时就开始截图。

## 技术实现

### 新增状态变量

```typescript
const [visionInspectionUrl, setVisionInspectionUrl] = useState<string | null>(null)
const [visionInspectionStatus, setVisionInspectionStatus] = useState<string>('')
```

### 工作室面板集成

在工作室面板的内容区域添加视觉巡检显示：

```tsx
{/* AI 视觉巡检区域 */}
{visionInspectionUrl && (
  <div className="animate-in fade-in slide-in-from-bottom-2 mb-4">
    <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="relative w-full h-[300px] bg-black flex items-center justify-center">
        {/* 视频流 */}
        <LiveStreamPlayer
          id="studio-vision-camera"
          sources={[{ src: visionInspectionUrl }]}
          autoplay
          muted
          controls={false}
          className="w-full h-full object-cover"
        />
        
        {/* 状态覆盖层 */}
        {/* ... */}
      </div>
    </div>
  </div>
)}
```

### 执行流程

1. **初始化** - 打开工作室面板，设置初始状态
2. **云台移动**（如果需要）
   - 添加到工作室数据
   - 调用 API 执行移动
   - 更新状态为成功/失败
   - 智能等待物理移动完成
3. **获取摄像头 URL** - 从后台配置获取
4. **加载视频流** - 在工作室中显示实时画面
5. **截图** - 等待视频加载完成后截取画面
6. **AI 分析** - 将截图发送给 AI 进行多模态分析
7. **清理** - 3秒后清理视觉巡检状态

## 用户体验改进

1. **更好的上下文** - 用户可以在工作室中看到完整的执行流程
2. **减少干扰** - 不再使用全屏弹窗遮挡主界面
3. **状态可见** - 云台移动、视频加载、AI 分析等所有步骤都在工作室中可见
4. **自动管理** - 工作室面板自动打开和关闭，无需手动操作

## 后续优化建议

1. **进度条** - 为云台移动添加可视化进度条
2. **历史记录** - 保存巡检历史，支持回看之前的截图
3. **多摄像头** - 支持同时显示多个摄像头的画面
4. **手动控制** - 在工作室中添加手动云台控制按钮
5. **截图标注** - 支持在截图上添加标注和注释
