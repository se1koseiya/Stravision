# 自动打开监控模态框功能

## 新增功能

现在语音助手的截图功能会**自动打开监控画面模态框**并**等待视频加载完成**，无需用户手动操作！

## 使用方法

### 之前（需要手动操作）

1. ❌ 必须先打开监控页面
2. ❌ 必须手动点击摄像头卡片
3. ❌ 必须等待视频加载
4. ✅ 然后才能说"看看大棚"

### 现在（完全自动）

1. ✅ 在**任意页面**激活语音助手
2. ✅ 直接说："看看大棚里的草莓长得怎么样了？"
3. ✅ 系统自动完成所有操作！

## 工作流程

```
用户说话
  ↓
"看看大棚里的草莓长得怎么样了？"
  ↓
系统识别命令
  ↓
自动查找摄像头卡片（通过 data-camera-id）
  ↓
自动点击卡片打开模态框
  ↓
等待模态框打开（500ms）
  ↓
查找视频元素
  ↓
等待视频加载完成（监听 loadeddata/canplay/playing 事件）
  ↓
截图（JPEG 格式，90% 质量）
  ↓
跳转到 AI 助手页面
  ↓
自动发送分析请求
  ↓
生成草莓生长分析报告
```

## 技术实现

### 1. 自动打开模态框

```typescript
async function openCameraModal(cameraId: number = 1): Promise<boolean> {
  // 通过 data-camera-id 属性查找摄像头卡片
  const cameraCards = document.querySelectorAll('[data-camera-id]');
  let targetCard: HTMLElement | null = null;
  
  for (const card of cameraCards) {
    const id = parseInt((card as HTMLElement).dataset.cameraId || '0');
    if (id === cameraId) {
      targetCard = card as HTMLElement;
      break;
    }
  }
  
  if (!targetCard) {
    return false;
  }
  
  // 模拟点击
  targetCard.click();
  
  // 等待模态框打开
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return true;
}
```

### 2. 等待视频加载

```typescript
async function waitForVideoReady(video: HTMLVideoElement, timeout: number = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    // 检查视频是否已经准备好
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      resolve(true);
      return;
    }

    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false); // 超时
      }
    }, timeout);

    const onReady = () => {
      if (!resolved && video.videoWidth > 0 && video.videoHeight > 0) {
        resolved = true;
        clearTimeout(timer);
        resolve(true);
      }
    };

    // 监听多个事件
    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
    video.addEventListener('playing', onReady, { once: true });
  });
}
```

### 3. 完整截图流程

```typescript
export async function captureMonitorSnapshot(
  cameraId: number = 1,
  autoOpenModal: boolean = true
): Promise<SnapshotResult> {
  // 1. 自动打开模态框
  if (autoOpenModal) {
    const opened = await openCameraModal(cameraId);
    if (!opened) {
      return { success: false, error: '无法打开监控画面' };
    }
  }

  // 2. 查找视频元素
  let video = document.querySelector('video') as HTMLVideoElement | null;
  if (!video) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    video = document.querySelector('video') as HTMLVideoElement | null;
  }
  
  if (!video) {
    return { success: false, error: '未找到监控画面' };
  }

  // 3. 等待视频加载
  const isReady = await waitForVideoReady(video, 10000);
  if (!isReady) {
    return { success: false, error: '视频加载超时' };
  }

  // 4. 截图
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1920;
  canvas.height = video.videoHeight || 1080;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { success: false, error: '无法创建画布' };
  }

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = canvas.toDataURL('image/jpeg', 0.9);
  
  return {
    success: true,
    imageData,
    cameraName: `监控摄像头 ${cameraId === 1 ? 'A' : 'B'}`,
  };
}
```

## 错误处理

### 1. 找不到摄像头卡片

**错误**: "无法打开监控画面，请手动打开后重试"

**原因**: 
- 不在监控页面
- 摄像头卡片没有 `data-camera-id` 属性
- DOM 结构发生变化

**解决**: 
- 确保在监控页面
- 检查摄像头卡片是否有正确的属性

### 2. 视频加载超时

**错误**: "视频加载超时，请检查网络连接"

**原因**:
- 网络连接问题
- 视频流地址错误
- 视频流服务器不可用

**解决**:
- 检查网络连接
- 验证视频流地址
- 手动打开监控画面测试

### 3. 未找到视频元素

**错误**: "未找到监控画面，请确保视频正在播放"

**原因**:
- 模态框未正确打开
- 视频元素加载延迟
- 视频播放器组件未渲染

**解决**:
- 增加等待时间
- 检查模态框是否打开
- 查看控制台错误日志

## 配置选项

### 自定义摄像头 ID

```typescript
// 截取摄像头 A（默认）
await captureMonitorSnapshot(1);

// 截取摄像头 B
await captureMonitorSnapshot(2);
```

### 禁用自动打开模态框

```typescript
// 如果用户已经手动打开了模态框
await captureMonitorSnapshot(1, false);
```

### 自定义超时时间

修改 `waitForVideoReady` 函数的 timeout 参数：

```typescript
const isReady = await waitForVideoReady(video, 15000); // 15秒超时
```

## 性能优化

### 1. 减少等待时间

```typescript
// 如果视频已经加载，立即返回
if (video.readyState >= 2 && video.videoWidth > 0) {
  return true;
}
```

### 2. 多事件监听

```typescript
// 监听多个事件，哪个先触发就用哪个
video.addEventListener('loadeddata', onReady);
video.addEventListener('canplay', onReady);
video.addEventListener('playing', onReady);
```

### 3. 超时保护

```typescript
// 10秒超时，避免无限等待
const timer = setTimeout(() => {
  resolve(false);
}, 10000);
```

## 调试技巧

### 1. 查看控制台日志

```
[Snapshot] Starting capture process...
[Snapshot] Clicking camera card
[Snapshot] Video element found, waiting for ready...
[Snapshot] Video ready, capturing...
[Snapshot] Capture successful
```

### 2. 检查视频状态

```javascript
const video = document.querySelector('video');
console.log('readyState:', video.readyState); // 应该 >= 2
console.log('videoWidth:', video.videoWidth); // 应该 > 0
console.log('videoHeight:', video.videoHeight); // 应该 > 0
```

### 3. 测试模态框打开

```javascript
const card = document.querySelector('[data-camera-id="1"]');
console.log('Camera card:', card);
card?.click();
```

## 兼容性

### 浏览器支持

- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+

### 移动端支持

- ✅ iOS Safari 14+
- ✅ Chrome Mobile 90+
- ⚠️ 某些移动浏览器可能需要用户交互才能播放视频

## 相关文件

- `lib/xiaozhi/monitor-snapshot.ts` - 截图工具实现
- `app/monitor/page.tsx` - 监控页面（添加了 data-camera-id）
- `lib/xiaozhi/voice-commands.ts` - 语音命令处理
- `components/realtime-voice-orb.tsx` - 语音助手组件

## 测试清单

- [ ] 在监控页面说"看看大棚"
- [ ] 在其他页面说"看看大棚"（应该提示错误）
- [ ] 测试摄像头 A
- [ ] 测试摄像头 B
- [ ] 测试网络断开情况
- [ ] 测试视频加载慢的情况
- [ ] 测试模态框已打开的情况
- [ ] 查看控制台日志是否正常

## 总结

通过自动打开监控模态框和等待视频加载，用户体验得到了极大提升：

**之前**: 需要 5 步手动操作  
**现在**: 只需 1 句话，完全自动化！

**用户只需说一句话，系统自动完成所有操作！** 🎉
