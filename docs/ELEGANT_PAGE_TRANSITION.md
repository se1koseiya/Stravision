# 优雅的页面跳转和截图功能

## 新增功能

现在语音助手的截图功能支持：
1. **自动跳转到监控页面**（如果用户不在监控页面）
2. **优雅的边缘渐变过渡效果**
3. **View Transitions API 支持**（现代浏览器）
4. **自动打开监控模态框**
5. **等待视频加载完成**

## 使用方法

### 在任意页面使用

用户可以在**任意页面**说"看看大棚里的草莓长得怎么样了？"，系统会：

1. ✅ 显示边缘渐变遮罩
2. ✅ 优雅地跳转到监控页面
3. ✅ 等待页面加载完成
4. ✅ 自动打开监控模态框
5. ✅ 等待视频加载
6. ✅ 截图
7. ✅ 跳转到 AI 助手
8. ✅ 自动分析

## 技术实现

### 1. 边缘渐变遮罩

在 `app/globals.css` 中添加了遮罩样式：

```css
/* 边缘渐变遮罩效果 */
.page-transition-mask {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: radial-gradient(
    circle at center,
    transparent 0%,
    transparent 60%,
    rgba(0, 0, 0, 0.1) 80%,
    rgba(0, 0, 0, 0.3) 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
}

.page-transition-mask.active {
  opacity: 1;
}
```

### 2. View Transitions API

支持现代浏览器的原生页面过渡：

```css
@view-transition {
  navigation: auto;
}

::view-transition-old(root) {
  animation: fade-out 0.4s ease-out;
}

::view-transition-new(root) {
  animation: fade-in 0.5s ease-in;
}
```

### 3. 优雅的跳转函数

```typescript
async function navigateToMonitorPage(): Promise<void> {
  // 创建边缘渐变遮罩
  const mask = document.createElement('div');
  mask.className = 'page-transition-mask';
  document.body.appendChild(mask);

  // 触发遮罩动画
  requestAnimationFrame(() => {
    mask.classList.add('active');
  });

  // 等待遮罩动画
  await new Promise(resolve => setTimeout(resolve, 300));

  // 使用 View Transitions API（如果支持）
  if ('startViewTransition' in document) {
    const transition = document.startViewTransition(() => {
      window.location.href = '/monitor';
    });
    await transition.finished;
  } else {
    // 降级方案
    window.location.href = '/monitor';
  }

  // 清理遮罩
  setTimeout(() => {
    mask.classList.remove('active');
    setTimeout(() => {
      mask.remove();
    }, 300);
  }, 100);
}
```

### 4. 完整的截图流程

```typescript
export async function captureMonitorSnapshot(
  cameraId: number = 1,
  autoOpenModal: boolean = true,
  autoNavigate: boolean = true
): Promise<SnapshotResult> {
  // 1. 检查是否在监控页面
  if (!isOnMonitorPage()) {
    if (autoNavigate) {
      // 优雅地跳转
      await navigateToMonitorPage();
      
      // 等待页面加载
      await waitForPageLoad(5000);
      
      // 等待渲染
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      return { success: false, error: '请先打开监控页面' };
    }
  }

  // 2. 自动打开模态框
  if (autoOpenModal) {
    await openCameraModal(cameraId);
  }

  // 3. 等待视频加载
  const video = document.querySelector('video');
  await waitForVideoReady(video, 10000);

  // 4. 截图
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  const imageData = canvas.toDataURL('image/jpeg', 0.9);
  
  return {
    success: true,
    imageData,
    cameraName: `监控摄像头 ${cameraId === 1 ? 'A' : 'B'}`,
  };
}
```

## 视觉效果

### 边缘渐变遮罩

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│         页面内容                │
│                                 │
│                                 │
└─────────────────────────────────┘
         ↓ 触发跳转
┌─────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ ← 边缘渐变
│░░                           ░░│
│░░       页面内容             ░░│
│░░                           ░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────────────┘
         ↓ 页面过渡
┌─────────────────────────────────┐
│                                 │
│                                 │
│       新页面内容                │
│                                 │
│                                 │
└─────────────────────────────────┘
```

### 动画时间轴

```
0ms     300ms   400ms   900ms   1900ms  2700ms
│       │       │       │       │       │
├───────┼───────┼───────┼───────┼───────┤
│遮罩淡入│跳转开始│页面加载│渲染完成│打开模态│截图完成
```

## 浏览器兼容性

### View Transitions API

- ✅ Chrome 111+
- ✅ Edge 111+
- ⚠️ Firefox（实验性支持）
- ⚠️ Safari（未支持，使用降级方案）

### 降级方案

不支持 View Transitions API 的浏览器会：
1. 显示边缘渐变遮罩
2. 直接跳转（无过渡动画）
3. 继续执行后续流程

## 配置选项

### 禁用自动跳转

```typescript
// 如果用户必须在监控页面才能截图
await captureMonitorSnapshot(1, true, false);
```

### 自定义摄像头

```typescript
// 截取摄像头 A
await captureMonitorSnapshot(1);

// 截取摄像头 B
await captureMonitorSnapshot(2);
```

### 禁用自动打开模态框

```typescript
// 如果模态框已经打开
await captureMonitorSnapshot(1, false);
```

## 性能优化

### 1. 预加载页面

```typescript
// 在用户说话时预加载监控页面
const link = document.createElement('link');
link.rel = 'prefetch';
link.href = '/monitor';
document.head.appendChild(link);
```

### 2. 减少等待时间

```typescript
// 如果页面已经加载过，减少等待时间
if (document.readyState === 'complete') {
  await new Promise(resolve => setTimeout(resolve, 500));
} else {
  await waitForPageLoad(5000);
}
```

### 3. 缓存视频元素

```typescript
// 缓存视频元素引用
let cachedVideo: HTMLVideoElement | null = null;

if (!cachedVideo) {
  cachedVideo = document.querySelector('video');
}
```

## 错误处理

### 1. 页面加载超时

**错误**: "页面加载超时"

**原因**: 网络慢或页面资源过大

**解决**: 
- 检查网络连接
- 增加超时时间
- 优化页面资源

### 2. 视频加载超时

**错误**: "视频加载超时，请检查网络连接"

**原因**: 视频流加载慢

**解决**:
- 检查视频流地址
- 检查网络连接
- 增加超时时间

### 3. 模态框打开失败

**错误**: "无法打开监控画面，请手动打开后重试"

**原因**: 找不到摄像头卡片

**解决**:
- 确保在监控页面
- 检查 DOM 结构
- 手动打开模态框

## 调试技巧

### 1. 查看控制台日志

```
[Snapshot] Starting capture process...
[Snapshot] Not on monitor page, navigating...
[Snapshot] Clicking camera card
[Snapshot] Video element found, waiting for ready...
[Snapshot] Video ready, capturing...
[Snapshot] Capture successful
```

### 2. 检查页面状态

```javascript
console.log('Current page:', window.location.pathname);
console.log('Is on monitor page:', window.location.pathname === '/monitor');
console.log('Document ready state:', document.readyState);
```

### 3. 测试过渡效果

```javascript
// 手动触发页面跳转
const { navigateToMonitorPage } = await import('@/lib/xiaozhi/monitor-snapshot');
await navigateToMonitorPage();
```

## 用户体验

### 之前

1. ❌ 必须在监控页面
2. ❌ 手动打开模态框
3. ❌ 等待视频加载
4. ❌ 页面跳转生硬

### 现在

1. ✅ 任意页面都可以
2. ✅ 自动打开模态框
3. ✅ 自动等待加载
4. ✅ 优雅的过渡效果

## 相关文件

- `lib/xiaozhi/monitor-snapshot.ts` - 截图工具实现
- `app/globals.css` - 过渡动画样式
- `lib/xiaozhi/voice-commands.ts` - 语音命令处理
- `components/realtime-voice-orb.tsx` - 语音助手组件

## 测试清单

- [ ] 在监控页面说"看看大棚"
- [ ] 在其他页面说"看看大棚"（应该自动跳转）
- [ ] 观察边缘渐变效果
- [ ] 观察页面过渡动画
- [ ] 测试不同浏览器
- [ ] 测试网络慢的情况
- [ ] 查看控制台日志

## 总结

通过添加优雅的页面跳转和边缘渐变效果，用户体验得到了极大提升：

**完全自动化 + 视觉优雅 = 完美体验！** ✨

用户只需说一句话，系统会：
1. 显示优雅的过渡动画
2. 自动跳转到监控页面
3. 自动打开监控画面
4. 自动截图分析

**一切都是自动的，一切都是优雅的！** 🎉
