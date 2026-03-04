# 实时语音交互集成文档

## 概述

本项目集成了阿里云 DashScope Qwen-Omni-Realtime API，实现了实时语音交互功能。

## 架构

```
┌─────────────────┐     WebSocket      ┌──────────────────┐     WebSocket     ┌─────────────────┐
│  RealtimeVoice  │ ◄──────────────► │  Next.js API     │ ◄──────────────► │  DashScope      │
│  Orb (Browser)  │                   │  Proxy           │                   │  Realtime API   │
└─────────────────┘                   └──────────────────┘                   └─────────────────┘
        │                                                                            │
        │ PCM16 Audio                                                    PCM24 Audio │
        │ (16kHz, Mono)                                                 (24kHz, Mono)│
        ▼                                                                            ▼
   麦克风输入                                                                    音频播放
```

## 核心组件

### 1. RealtimeVoiceOrb (`components/realtime-voice-orb.tsx`)

独立的语音交互 Orb 组件，封装了完整的语音交互逻辑。

```tsx
import { RealtimeVoiceOrb } from '@/components/realtime-voice-orb';

<RealtimeVoiceOrb
  size={96}
  onStatusChange={(status) => console.log('Status:', status)}
  onTranscript={(text, isUser) => console.log(isUser ? 'User:' : 'AI:', text)}
  onError={(error) => console.error(error)}
  instructions="你是一个AI助手"
  voice="Cherry"
/>
```

Props:
- `size`: Orb 大小 (默认 96px)
- `onStatusChange`: 状态变化回调
- `onTranscript`: 转录文本回调
- `onError`: 错误回调
- `instructions`: AI 系统提示词
- `voice`: 音色选择 (Cherry, Ethan, Serena 等)
- `autoConnect`: 是否自动连接

### 2. RealtimeClient (`lib/xiaozhi/realtimeClient.ts`)

底层 WebSocket 客户端，处理与 DashScope API 的通信。

```typescript
import { RealtimeClient } from '@/lib/xiaozhi/realtimeClient';

const client = new RealtimeClient({
  onStatusChange: (status) => {},
  onTextDelta: (text) => {},
  onAudioDelta: (base64) => {},
  onError: (error) => {},
  onTranscript: (text, isUser) => {},
}, {
  voice: 'Cherry',
  instructions: '你是AI助手',
  model: 'qwen3-omni-flash-realtime',
});

await client.connect();
await client.startListening();
```

### 3. WebSocket 代理 (`pages/api/xiaozhi/realtime.ts`)

Next.js API 路由，代理浏览器与 DashScope 之间的 WebSocket 连接。

功能:
- 用户认证
- API Key 保护
- 配额管理
- 消息转发

## 音频格式

### 输入 (麦克风 → 服务器)
- 格式: PCM16
- 采样率: 16kHz
- 声道: 单声道
- 编码: Base64

### 输出 (服务器 → 扬声器)
- 格式: PCM24
- 采样率: 24kHz
- 声道: 单声道
- 编码: Base64

## 状态流转

```
idle → connecting → listening ⇄ processing ⇄ speaking
                        ↓
                      error
```

- `idle`: 空闲状态
- `connecting`: 正在连接
- `listening`: 正在聆听用户语音
- `processing`: AI 正在处理
- `speaking`: AI 正在回复
- `error`: 发生错误

## 可用音色

| ID | 名称 | 描述 |
|---|---|---|
| Cherry | 芊悦 | 阳光积极、亲切自然小姐姐 |
| Serena | 苏瑶 | 温柔小姐姐 |
| Ethan | 晨煦 | 阳光、温暖、活力男声 |
| Chelsie | 千雪 | 二次元虚拟女友 |
| Momo | 茉兔 | 撒娇搞怪 |
| Vivian | 十三 | 拽拽的、可爱的小暴躁 |
| Moon | 月白 | 率性帅气 |
| Maia | 四月 | 知性与温柔 |
| Kai | 凯 | 耳朵的一场SPA |
| Nofish | 不吃鱼 | 不会翘舌音的设计师 |

## 环境变量

```env
# DashScope API Key (必需)
DASHSCOPE_API_KEY=sk-xxx

# 可选: 自定义 WebSocket 代理地址
NEXT_PUBLIC_XIAOZHI_WS_PROXY=wss://your-proxy.com/ws
```

## 开发模式

开发模式下，如果使用 HTTP，WebSocket 会连接到 `ws://localhost:3002`。

可以启动独立的 Python 服务:

```bash
cd python_service
pip install -r requirements.txt
python main.py
```

## 参考文档

- [阿里云 DashScope Realtime API](https://help.aliyun.com/zh/model-studio/realtime)
- [FastRTC](https://github.com/gradio-app/fastrtc)
