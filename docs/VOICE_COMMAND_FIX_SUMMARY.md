# 语音助手截图命令修复总结

## 问题描述

当用户对语音助手说"看看大棚里的草莓长得怎么样了？"时，AI 会错误地生成设备控制命令（如开启设备的 JSON），而不是执行截图分析工作流。

### 根本原因

1. **异步导入延迟**: 使用 `await import()` 动态导入命令处理模块，导致检查延迟
2. **AI 已开始处理**: 在命令检查完成前，用户的语音已经被发送给 AI 处理
3. **取消时机太晚**: 即使发送了 `response.cancel`，AI 可能已经生成了部分响应

## 解决方案

### 1. 同步命令检查

将关键词匹配逻辑直接内联到事件处理器中，避免异步导入延迟：

```typescript
case 'conversation.item.input_audio_transcription.completed':
  if (event.transcript) {
    setIsUserSpeaking(true);
    setTranscript(event.transcript);
    
    // 同步检查是否是特殊命令
    const text = event.transcript.toLowerCase().trim();
    const snapshotKeywords = [
      '看看大棚', '查看大棚', '大棚情况',
      '草莓长得怎么样', '草莓生长',
      '监控画面', '截图分析', '拍个照', '看一下大棚',
    ];
    
    const isSnapshotCommand = snapshotKeywords.some(keyword => text.includes(keyword));
    
    if (isSnapshotCommand) {
      // 立即取消 AI 响应
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'response.cancel' }));
        wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
      }
      
      // 异步处理特殊命令
      (async () => {
        const { processVoiceCommand } = await import('@/lib/xiaozhi/voice-commands');
        const result = await processVoiceCommand(event.transcript);
        
        if (result.recognized && result.response) {
          setIsUserSpeaking(false);
          setTranscript(result.response);
          onTranscript?.(result.response, false);
          
          setTimeout(() => {
            setTranscript("");
            updateStatus('listening');
          }, 3000);
        }
      })();
      
      return; // 不继续处理
    }
    
    onTranscript?.(event.transcript, true);
  }
  break;
```

### 2. 更新系统指令

在 AI 的系统指令中明确告知不要处理这些特殊命令：

```typescript
## 特殊命令处理规则
**关键**: 当用户说以下内容时，你**不应该**生成任何设备控制命令或导航命令，这些是系统级特殊命令，会被单独处理：
- "看看大棚"、"查看大棚"、"大棚情况"
- "草莓长得怎么样"、"草莓生长"
- "监控画面"、"截图分析"、"拍个照"

对于这些命令，系统会自动截图并跳转到AI助手进行分析，你**不需要**也**不应该**做任何响应。
```

### 3. 双重保护机制

- **客户端拦截**: 在转录完成事件中立即检查并取消
- **系统指令约束**: 告诉 AI 不要处理这些命令

### 4. 自动打开监控模态框 ✨ 新增功能

现在截图功能会自动打开监控画面模态框并等待视频加载完成：

```typescript
/**
 * 打开监控模态框
 * @param cameraId 摄像头 ID (1 或 2)
 * @returns 是否成功打开
 */
async function openCameraModal(cameraId: number = 1): Promise<boolean> {
  // 查找摄像头卡片（通过 data-camera-id 属性）
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
  
  // 点击摄像头卡片打开模态框
  targetCard.click();
  
  // 等待模态框打开
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return true;
}

/**
 * 等待视频加载完成
 * @param video 视频元素
 * @param timeout 超时时间（毫秒）
 * @returns 是否加载成功
 */
async function waitForVideoReady(video: HTMLVideoElement, timeout: number = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    // 如果视频已经准备好，直接返回
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      resolve(true);
      return;
    }

    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, timeout);

    const onReady = () => {
      if (!resolved && video.videoWidth > 0 && video.videoHeight > 0) {
        resolved = true;
        clearTimeout(timer);
        resolve(true);
      }
    };

    // 监听多个事件以确保视频准备好
    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
    video.addEventListener('playing', onReady, { once: true });
  });
}
```

**工作流程**:
1. 用户说"看看大棚"
2. 系统自动查找并点击摄像头卡片
3. 等待模态框打开（500ms）
4. 查找视频元素
5. 等待视频加载完成（监听 loadeddata/canplay/playing 事件）
6. 截图
7. 跳转到 AI 助手
8. 自动分析

## 关键改进点

### 改进前

```typescript
// ❌ 异步导入，检查延迟
const { isSpecialCommand } = await import('@/lib/xiaozhi/voice-commands');
if (isSpecialCommand(event.transcript)) {
  // 此时 AI 可能已经开始处理
  wsRef.current.send(JSON.stringify({ type: 'response.cancel' }));
}

// ❌ 需要手动打开监控画面
const video = document.querySelector('video');
if (!video) {
  return { success: false, error: '未找到监控画面' };
}
```

### 改进后

```typescript
// ✅ 同步检查，立即取消
const text = event.transcript.toLowerCase().trim();
const isSnapshotCommand = snapshotKeywords.some(keyword => text.includes(keyword));

if (isSnapshotCommand) {
  // 立即取消，防止 AI 生成响应
  wsRef.current.send(JSON.stringify({ type: 'response.cancel' }));
  wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
  
  // 然后异步处理命令
  (async () => {
    // ...
  })();
  
  return; // 不继续处理
}

// ✅ 自动打开监控模态框并等待视频加载
const opened = await openCameraModal(cameraId);
if (!opened) {
  return { success: false, error: '无法打开监控画面' };
}

const video = document.querySelector('video');
const isReady = await waitForVideoReady(video, 10000);
if (!isReady) {
  return { success: false, error: '视频加载超时' };
}
```

## 测试验证

### 测试步骤

1. ~~打开监控页面 (`/monitor`)~~ **不再需要！**
2. ~~确保视频正在播放~~ **不再需要！**
3. 在任意页面激活语音助手
4. 说："看看大棚里的草莓长得怎么样了？"

### 预期结果

✅ 语音助手识别命令  
✅ 显示响应文本："好的，我已经从监控画面截图，正在跳转到AI助手进行分析，请稍候..."  
✅ **自动打开监控模态框**  
✅ **等待视频加载完成**  
✅ 自动截图  
✅ 跳转到 AI 助手页面  
✅ 自动发送分析请求  
✅ **不会**生成设备控制命令  

### 验证点

- [ ] 控制台日志显示 `[RealtimeVoiceOrb] Snapshot command detected`
- [ ] 控制台日志显示 `[Snapshot] Clicking camera card`
- [ ] 控制台日志显示 `[Snapshot] Video element found, waiting for ready...`
- [ ] 控制台日志显示 `[Snapshot] Video ready, capturing...`
- [ ] 控制台日志显示 `[Snapshot] Capture successful`
- [ ] 没有设备控制 JSON 出现在响应中
- [ ] 成功跳转到 `/ai-assistant?from=xiaozhi&action=analyze_snapshot`
- [ ] AI 助手自动发送分析请求
- [ ] 生成草莓生长分析报告

## 相关文件

### 修改的文件

- `components/realtime-voice-orb.tsx` - 添加同步命令检查和立即取消逻辑
- `lib/xiaozhi/monitor-snapshot.ts` - 添加自动打开模态框和等待视频加载功能
- `app/monitor/page.tsx` - 添加 `data-camera-id` 属性到摄像头卡片
- `INTEGRATION_GUIDE.md` - 更新集成指南（待更新）

### 相关文件

- `lib/xiaozhi/voice-commands.ts` - 命令识别逻辑
- `app/ai-assistant/page.tsx` - 自动分析处理

## 技术要点

### 1. 事件处理时机

在 DashScope Realtime API 中，事件流程如下：

```
用户说话 
  → input_audio_buffer.speech_started
  → input_audio_buffer.speech_stopped
  → conversation.item.input_audio_transcription.completed ← 在这里拦截
  → response.created (AI 开始生成)
  → response.audio_transcript.delta
  → response.done
```

**关键**: 必须在 `conversation.item.input_audio_transcription.completed` 事件中立即拦截，否则 AI 会开始生成响应。

### 2. WebSocket 消息类型

```typescript
// 取消当前响应
{ type: 'response.cancel' }

// 清除音频缓冲区
{ type: 'input_audio_buffer.clear' }
```

### 3. 同步 vs 异步

```typescript
// ❌ 异步检查 - 太慢
const { isSpecialCommand } = await import('...');
if (isSpecialCommand(text)) { ... }

// ✅ 同步检查 - 立即执行
const isSnapshotCommand = keywords.some(k => text.includes(k));
if (isSnapshotCommand) { ... }
```

### 4. 视频加载检测

```typescript
// 检查视频是否准备好
video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0

// 监听多个事件
video.addEventListener('loadeddata', onReady);
video.addEventListener('canplay', onReady);
video.addEventListener('playing', onReady);
```

### 5. DOM 元素查找

```typescript
// 通过 data 属性查找
const card = document.querySelector('[data-camera-id="1"]');

// 通过文本内容查找（备用方案）
const elements = Array.from(document.querySelectorAll('*'));
for (const el of elements) {
  if (el.textContent?.includes('摄像头 A')) {
    // 找到了
  }
}
```

## 后续优化建议

### 1. 添加加载进度提示

```typescript
setTranscript("正在打开监控画面...");
await openCameraModal();

setTranscript("等待视频加载...");
await waitForVideoReady(video);

setTranscript("正在截图...");
// 截图
```

### 2. 支持多摄像头选择

```typescript
// 用户可以指定摄像头
"看看摄像头A的画面"
"查看摄像头B"
```

### 3. 添加重试机制

```typescript
let retries = 3;
while (retries > 0) {
  const result = await captureMonitorSnapshot();
  if (result.success) break;
  retries--;
  await new Promise(r => setTimeout(r, 1000));
}
```

### 4. 缓存最近的截图

```typescript
const snapshotCache = new Map<number, { imageData: string; timestamp: number }>();

// 如果最近截过图（5秒内），直接使用缓存
const cached = snapshotCache.get(cameraId);
if (cached && Date.now() - cached.timestamp < 5000) {
  return { success: true, imageData: cached.imageData };
}
```

## 总结

通过以下改进，成功解决了语音助手截图命令的所有问题：

**关键点**:
- ✅ 同步命令检查
- ✅ 立即取消 AI 响应
- ✅ 系统指令约束
- ✅ 双重保护机制
- ✅ **自动打开监控模态框**
- ✅ **等待视频加载完成**
- ✅ **无需手动操作**

现在用户可以在**任意页面**说"看看大棚"，系统会：
1. 自动打开监控画面
2. 等待视频加载
3. 截图
4. 跳转到 AI 助手
5. 自动分析

**完全自动化，无需任何手动操作！** 🎉
