# 语音助手监控截图功能 - 集成指南

## 快速集成

要在现有的语音助手中启用监控截图分析功能，只需要在语音助手的消息处理逻辑中添加命令识别即可。

## 集成步骤

### 步骤 1: 导入命令处理模块

在 `components/xiaozhi/FloatingXiaozhi.tsx` 或 `components/realtime-voice-orb.tsx` 中添加：

```typescript
import { processVoiceCommand, isSpecialCommand } from '@/lib/xiaozhi/voice-commands';
```

### 步骤 2: 在消息处理中添加命令识别

找到处理用户语音输入的地方（通常在 `onTranscript` 回调中），添加：

```typescript
const handleUserTranscript = async (text: string) => {
  // 检查是否是特殊命令
  if (isSpecialCommand(text)) {
    // 处理特殊命令
    const result = await processVoiceCommand(text);
    
    if (result.recognized) {
      // 播报响应
      if (result.response) {
        // 使用语音合成播报
        speak(result.response);
      }
      
      // 如果有错误，也播报
      if (result.error) {
        speak(result.response || `抱歉，${result.error}`);
      }
      
      return; // 不再发送到 AI
    }
  }
  
  // 正常的 AI 对话流程
  // ...
};
```

### 步骤 3: 完成！

就这么简单！现在用户说"看看大棚里的草莓长得怎么样了？"时，系统会自动：
1. 识别命令
2. 截图
3. 跳转到 AI 助手
4. 自动分析

## 详细集成示例

### 在 RealtimeVoiceOrb 中集成

```typescript
// components/realtime-voice-orb.tsx

import { processVoiceCommand, isSpecialCommand } from '@/lib/xiaozhi/voice-commands';

// 在 handleServerEvent 函数中
case 'input_audio_buffer.speech_stopped':
  if (event.transcript) {
    const userText = event.transcript;
    
    // 检查是否是特殊命令
    if (isSpecialCommand(userText)) {
      const result = await processVoiceCommand(userText);
      
      if (result.recognized && result.response) {
        // 创建一个临时的响应事件
        const responseEvent = {
          type: 'response.audio_transcript.done',
          transcript: result.response
        };
        
        // 触发语音合成
        handleServerEvent(responseEvent);
        
        return; // 不发送到 AI
      }
    }
    
    // 正常流程
    onTranscript?.(userText, true);
  }
  break;
```

### 在 FloatingXiaozhi 中集成

```typescript
// components/xiaozhi/FloatingXiaozhi.tsx

import { processVoiceCommand, isSpecialCommand } from '@/lib/xiaozhi/voice-commands';

const handleTranscript = useCallback(async (text: string, isUser: boolean) => {
  if (isUser) {
    // 检查是否是特殊命令
    if (isSpecialCommand(text)) {
      const result = await processVoiceCommand(text);
      
      if (result.recognized) {
        // 添加用户消息
        setMessages(prev => [...prev, {
          role: 'user',
          content: text,
          timestamp: Date.now()
        }]);
        
        // 添加助手响应
        if (result.response) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: result.response,
            timestamp: Date.now()
          }]);
        }
        
        return; // 不发送到 AI
      }
    }
  }
  
  // 正常的消息处理
  setMessages(prev => {
    const last = prev[prev.length - 1];
    const role = isUser ? 'user' : 'assistant';
    
    if (last && last.role === role && last.timestamp > Date.now() - 3000) {
      return [...prev.slice(0, -1), {
        ...last,
        content: last.content + ' ' + text,
        timestamp: Date.now()
      }];
    }
    
    return [...prev, {
      role,
      content: text,
      timestamp: Date.now()
    }];
  });
}, []);
```

## 配置选项

### 自定义命令关键词

如果需要添加更多命令关键词，编辑 `lib/xiaozhi/voice-commands.ts`:

```typescript
const snapshotKeywords = [
  '看看大棚',
  '查看大棚',
  '大棚情况',
  '草莓长得怎么样',
  // 添加你的自定义关键词
  '检查草莓',
  '草莓状态',
  '大棚监控',
];
```

### 自定义分析提示词

修改 `lib/xiaozhi/voice-commands.ts` 中的提示词：

```typescript
const result = await executeSnapshotAnalysisWorkflow(
  '请分析这张监控截图，重点关注：\n' +
  '1. 你关心的内容\n' +
  '2. 其他分析维度\n' +
  '...'
);
```

### 自定义响应文本

修改 `lib/xiaozhi/voice-commands.ts` 中的响应：

```typescript
return {
  recognized: true,
  action: 'snapshot_analysis',
  response: '您的自定义响应文本',
};
```

## 测试

### 1. 单元测试

```typescript
import { processVoiceCommand, isSpecialCommand } from '@/lib/xiaozhi/voice-commands';

test('识别截图命令', async () => {
  const result = await processVoiceCommand('看看大棚里的草莓长得怎么样了');
  expect(result.recognized).toBe(true);
  expect(result.action).toBe('snapshot_analysis');
});

test('识别特殊命令', () => {
  expect(isSpecialCommand('看看大棚')).toBe(true);
  expect(isSpecialCommand('你好')).toBe(false);
});
```

### 2. 集成测试

1. 打开监控页面 `/monitor`
2. 激活语音助手
3. 说："看看大棚里的草莓长得怎么样了？"
4. 验证：
   - ✅ 语音助手识别命令
   - ✅ 自动截图
   - ✅ 跳转到 AI 助手
   - ✅ 自动发送分析请求
   - ✅ 生成分析报告

## 故障排查

### 问题 1: 命令未被识别

**检查**:
```typescript
console.log('User text:', text);
console.log('Is special command:', isSpecialCommand(text));
```

**解决**: 确保关键词匹配，或添加更多关键词

### 问题 2: 截图失败

**检查**:
```typescript
const video = document.querySelector('video');
console.log('Video element:', video);
console.log('Video playing:', !video.paused);
```

**解决**: 确保在监控页面且视频正在播放

### 问题 3: 未自动跳转

**检查**:
```typescript
console.log('Snapshot result:', result);
console.log('SessionStorage:', sessionStorage.getItem('xiaozhi_snapshot_data'));
```

**解决**: 检查 `executeSnapshotAnalysisWorkflow` 的返回值

## 扩展功能

### 添加更多命令

在 `lib/xiaozhi/voice-commands.ts` 中添加新的命令处理：

```typescript
// 天气查询命令
const weatherKeywords = ['天气', '温度', '湿度'];
const isWeatherCommand = weatherKeywords.some(k => text.includes(k));

if (isWeatherCommand) {
  return {
    recognized: true,
    action: 'weather_query',
    response: '当前温度25°C，湿度60%',
  };
}

// 设备控制命令
const deviceKeywords = ['打开', '关闭', '开启'];
const isDeviceCommand = deviceKeywords.some(k => text.includes(k));

if (isDeviceCommand) {
  // 执行设备控制
  return {
    recognized: true,
    action: 'device_control',
    response: '好的，已为您执行',
  };
}
```

### 添加命令历史

```typescript
interface CommandHistory {
  timestamp: number;
  command: string;
  action: string;
  result: string;
}

const commandHistory: CommandHistory[] = [];

// 记录命令
commandHistory.push({
  timestamp: Date.now(),
  command: userText,
  action: result.action,
  result: result.response
});
```

### 添加命令统计

```typescript
const commandStats = {
  snapshot_analysis: 0,
  weather_query: 0,
  device_control: 0,
};

// 统计命令使用
if (result.recognized) {
  commandStats[result.action]++;
}
```

## 性能优化

### 1. 懒加载

```typescript
// 只在需要时加载命令处理模块
const processCommand = async (text: string) => {
  const { processVoiceCommand } = await import('@/lib/xiaozhi/voice-commands');
  return await processVoiceCommand(text);
};
```

### 2. 缓存结果

```typescript
const commandCache = new Map<string, VoiceCommandResult>();

const getCachedResult = async (text: string) => {
  if (commandCache.has(text)) {
    return commandCache.get(text);
  }
  
  const result = await processVoiceCommand(text);
  commandCache.set(text, result);
  return result;
};
```

### 3. 防抖处理

```typescript
import { debounce } from 'lodash';

const debouncedProcessCommand = debounce(async (text: string) => {
  return await processVoiceCommand(text);
}, 300);
```

## 安全考虑

### 1. 权限验证

```typescript
// 检查用户是否有权限执行命令
const hasPermission = await checkUserPermission(user, 'snapshot_analysis');
if (!hasPermission) {
  return {
    recognized: true,
    error: '您没有权限执行此操作',
    response: '抱歉，您没有权限执行此操作'
  };
}
```

### 2. 速率限制

```typescript
const commandRateLimit = new Map<string, number>();

const checkRateLimit = (userId: string): boolean => {
  const lastTime = commandRateLimit.get(userId) || 0;
  const now = Date.now();
  
  if (now - lastTime < 5000) { // 5秒内只能执行一次
    return false;
  }
  
  commandRateLimit.set(userId, now);
  return true;
};
```

### 3. 输入验证

```typescript
const sanitizeInput = (text: string): string => {
  // 移除特殊字符
  return text.replace(/[<>]/g, '');
};

const userText = sanitizeInput(rawText);
```

## 相关文档

- [功能说明](./VOICE_SNAPSHOT_FEATURE.md)
- [详细实现](./docs/voice-snapshot-analysis-workflow.md)
- [API 文档](./docs/api/monitor-snapshot.md)

## 支持

如有问题，请查看：
- [故障排查指南](./docs/troubleshooting.md)
- [常见问题](./docs/faq.md)
- [GitHub Issues](https://github.com/your-repo/issues)

---

**集成完成！现在您的语音助手支持监控截图分析功能了。** 🎉
