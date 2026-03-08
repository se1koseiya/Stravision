"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Volume2, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import SiriOrb from "@/components/smoothui/siri-orb";
import type { DeviceData } from "@/lib/contexts/device-context";

// Types
export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

export interface QuotaInfo {
  daily_limit: number;
  daily_usage: number;
  balance: number;
  can_use: boolean;
}

export interface DeviceCommand {
  action: 'toggle_relay' | 'set_led' | 'control_camera';
  device?: number;
  value?: number;
  r?: number;
  g?: number;
  b?: number;
  direction?: number;  // 摄像头云台方向: 0=停止, 1=左移, 2=右移
}

export interface NavigateCommand {
  action: 'navigate';
  page: 'dashboard' | 'monitor' | 'device-control' | 'ai-assistant' | 'profile' | 'settings';
}

export interface ScheduleTaskCommand {
  action: 'schedule_task';
  title: string;
  cron?: string;
  execute_at?: number;
  delay_seconds?: number;
  task_action: 'toggle_relay' | 'set_led';
  device?: number;
  value?: number;
  params?: { r?: number; g?: number; b?: number };
}

export type AICommand = DeviceCommand | ScheduleTaskCommand | NavigateCommand;

interface RealtimeVoiceOrbProps {
  className?: string;
  size?: number;
  onStatusChange?: (status: VoiceStatus) => void;
  onTranscript?: (text: string, isUser: boolean) => void;
  onError?: (error: string) => void;
  onDeviceCommand?: (command: DeviceCommand) => void;
  onScheduleTask?: (task: ScheduleTaskCommand) => void;
  onNavigate?: (command: NavigateCommand) => void;
  onQuotaExceeded?: () => void;
  instructions?: string;
  voice?: string;
  autoConnect?: boolean;
  deviceData?: DeviceData | null;
  autoExecuteCommands?: boolean;
  initialGreeting?: string;
}

// Fetch user quota
async function fetchQuota(): Promise<QuotaInfo | null> {
  try {
    const res = await fetch('/api/user/settings');
    if (!res.ok) return null;
    const data = await res.json();
    return data?.quota || null;
  } catch {
    return null;
  }
}

// Device names mapping
const DEVICE_NAMES: Record<string, string> = {
  '5': '水泵',
  '6': '风扇',
  '7': '补光灯',
  '8': '白灯'
};

// Page names mapping for navigation
const PAGE_NAMES: Record<string, string> = {
  'dashboard': '数据看板',
  'monitor': '农作物监测',
  'device-control': '设备控制',
  'ai-assistant': 'AI助手',
  'profile': '个人中心',
  'settings': '设置'
};

// Execute device control command
async function executeDeviceCommand(cmd: DeviceCommand): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/ai/device-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd)
    });
    
    if (res.ok) {
      let deviceName: string;
      let actionDesc: string;
      
      if (cmd.action === 'set_led') {
        deviceName = 'RGB补光灯';
        actionDesc = `颜色设置为 R:${cmd.r} G:${cmd.g} B:${cmd.b}`;
      } else if (cmd.action === 'control_camera') {
        deviceName = '摄像头云台';
        const directionNames = ['停止', '左移', '右移'];
        actionDesc = directionNames[cmd.direction ?? 0] || '控制';
      } else {
        deviceName = DEVICE_NAMES[String(cmd.device)] || `设备${cmd.device}`;
        actionDesc = `已${cmd.value === 1 ? '开启' : '关闭'}`;
      }
      return { success: true, message: `${deviceName} ${actionDesc}` };
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err?.error || `请求错误 ${res.status}` };
    }
  } catch (e) {
    return { success: false, message: '网络错误' };
  }
}

// Execute schedule task command
async function executeScheduleTask(cmd: ScheduleTaskCommand): Promise<{ success: boolean; message: string }> {
  try {
    // Build the task DTO
    const taskData: any = {
      title: cmd.title,
      action_type: cmd.task_action === 'set_led' ? 'led' : 'relay',
      params: {}
    };

    // Handle timing
    if (cmd.cron) {
      taskData.cron_expression = cmd.cron;
    } else if (cmd.delay_seconds) {
      // Calculate execute_at from delay
      taskData.execute_at = Date.now() + cmd.delay_seconds * 1000;
    } else if (cmd.execute_at) {
      taskData.execute_at = cmd.execute_at;
    }

    // Handle device/params
    if (cmd.task_action === 'toggle_relay') {
      taskData.device_id = cmd.device;
      taskData.params = { value: cmd.value ?? 1 };
    } else if (cmd.task_action === 'set_led') {
      taskData.params = cmd.params || { r: 255, g: 255, b: 255 };
    }

    const res = await fetch('/api/scheduler/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    
    if (res.ok) {
      return { success: true, message: `任务"${cmd.title}"已创建` };
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err?.error || `创建失败 ${res.status}` };
    }
  } catch (e) {
    return { success: false, message: '网络错误' };
  }
}

// Audio playback helper
class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private readonly sampleRate = 24000;

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate
      });
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Play PCM16 audio (16-bit, little-endian)
  playPCM16(base64: string) {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    // Decode base64 to bytes
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // PCM16 (little-endian, 2 bytes per sample) to Float32
    const sampleCount = Math.floor(bytes.length / 2);
    const float32 = new Float32Array(sampleCount);
    const dataView = new DataView(bytes.buffer);
    
    for (let i = 0; i < sampleCount; i++) {
      const int16 = dataView.getInt16(i * 2, true); // little-endian
      float32[i] = int16 / 32768;
    }

    this.playFloat32(float32);
  }

  // Play PCM24 audio (24-bit, little-endian)
  playPCM24(base64: string) {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    // Decode base64 to bytes
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // PCM24 (little-endian, 3 bytes per sample) to Float32
    const sampleCount = Math.floor(bytes.length / 3);
    const float32 = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      const j = i * 3;
      const b0 = bytes[j];
      const b1 = bytes[j + 1];
      const b2 = bytes[j + 2];
      let int24 = (b0 | (b1 << 8) | (b2 << 16));
      if (int24 & 0x800000) int24 |= 0xff000000;
      float32[i] = int24 / 8388608;
    }

    this.playFloat32(float32);
  }

  private playFloat32(float32: Float32Array) {
    if (!this.audioContext) return;
    
    // Create and schedule buffer
    const buffer = this.audioContext.createBuffer(1, float32.length, this.sampleRate);
    buffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
  }

  clear() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.nextStartTime = 0;
    }
  }

  stop() {
    this.clear();
  }
}

// Audio capture helper
class AudioCapture {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;
  private onData: (base64: string) => void;
  private readonly targetSampleRate = 16000; // DashScope expects 16kHz

  constructor(onData: (base64: string) => void) {
    this.onData = onData;
  }

  async start() {
    if (this.isRecording) return;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });

    this.audioContext = new AudioContext({ sampleRate: this.targetSampleRate });
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Use ScriptProcessor as fallback (AudioWorklet requires HTTPS)
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const float32 = e.inputBuffer.getChannelData(0);
      const pcm16 = this.float32ToPCM16(float32);
      const base64 = this.arrayBufferToBase64(pcm16.buffer);
      this.onData(base64);
    };

    this.sourceNode.connect(processor);
    processor.connect(this.audioContext.destination);
    
    this.isRecording = true;
  }

  stop() {
    this.isRecording = false;
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  private float32ToPCM16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export function RealtimeVoiceOrb({
  className,
  size = 96,
  onStatusChange,
  onTranscript,
  onError,
  onDeviceCommand,
  onScheduleTask,
  onNavigate,
  onQuotaExceeded,
  instructions = "你是莓小智，一个专业、友好的AI语音助手。用中文简洁回答问题。重要：当你需要输出JSON命令时（如设备控制、定时任务、页面导航），请将JSON放在回复末尾，但在语音朗读时完全跳过JSON部分，只朗读自然语言描述。绝不要朗读任何包含大括号、引号、冒号等JSON符号的内容。",
  voice = "Mochi",
  autoConnect = false,
  deviceData,
  autoExecuteCommands = true,
  initialGreeting,
}: RealtimeVoiceOrbProps) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState<string>("");
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(true); // Track if current transcript is from user
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clearTranscriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCommandsRef = useRef<string>(""); // Accumulate AI response for command detection
  const lastUserTranscriptRef = useRef<string>(""); // Store last user transcript for checking in response.created

  // Fetch quota on mount and after each conversation
  const refreshQuota = useCallback(async () => {
    const quota = await fetchQuota();
    setQuotaInfo(quota);
    return quota;
  }, []);

  useEffect(() => {
    refreshQuota();
  }, [refreshQuota]);

  // Build enhanced instructions with device data
  const enhancedInstructions = useMemo(() => {
    let deviceInfo = "";
    
    if (deviceData) {
      const relayStatus = (val: number) => val === 1 ? '开启' : '关闭';
      deviceInfo = `

## 当前设备数据（实时）
- 温度: ${deviceData.temperature?.toFixed(1) ?? '--'}°C
- 湿度: ${deviceData.humidity?.toFixed(1) ?? '--'}%
- 光照: ${deviceData.light ?? '--'} lux
- CO₂: ${deviceData.co2 ?? '--'} ppm
- 土壤温度: ${deviceData.earth_temp?.toFixed(1) ?? '--'}°C
- 土壤湿度: ${deviceData.earth_water?.toFixed(1) ?? '--'}%
- 土壤EC: ${deviceData.earth_ec ?? '--'} μS/cm
- 土壤氮(N): ${deviceData.earth_n ?? '--'} mg/kg
- 土壤磷(P): ${deviceData.earth_p ?? '--'} mg/kg
- 土壤钾(K): ${deviceData.earth_k ?? '--'} mg/kg

## 设备状态
- 水泵(Relay5): ${relayStatus(deviceData.relay5)}
- 风扇(Relay6): ${relayStatus(deviceData.relay6)}
- 补光灯(Relay7): ${relayStatus(deviceData.relay7)}
- 白灯(Relay8): ${relayStatus(deviceData.relay8)}
- RGB灯: R=${deviceData.led1 ?? 0}, G=${deviceData.led2 ?? 0}, B=${deviceData.led3 ?? 0}

## 设备控制能力
你可以控制以下设备，当用户要求控制设备时，请在回复中包含JSON命令：

1. 继电器控制（水泵/风扇/补光灯/白灯）:
\`\`\`json
{"action":"toggle_relay","device":5,"value":1}
\`\`\`
- device: 5=水泵, 6=风扇, 7=补光灯, 8=白灯
- value: 1=开启, 0=关闭

2. RGB灯颜色控制:
\`\`\`json
{"action":"set_led","r":255,"g":100,"b":50}
\`\`\`
- r/g/b: 0-255

3. 摄像头云台控制（步进电机）:
\`\`\`json
{"action":"control_camera","direction":1}
\`\`\`
- direction: 0=停止, 1=左移, 2=右移
- 用于调整摄像头监控视角

## 定时任务能力
你可以创建定时任务，当用户说"每天8点开启风扇"或"5分钟后关闭水泵"时，输出以下格式：

\`\`\`json
{"action":"schedule_task","title":"任务名称","cron":"0 8 * * *","task_action":"toggle_relay","device":6,"value":1}
\`\`\`

参数说明：
- title: 任务描述
- cron: Cron表达式（周期任务），格式: 分 时 日 月 周
- delay_seconds: 延迟秒数（一次性任务，如"5分钟后"用300）
- task_action: toggle_relay 或 set_led
- device: 设备ID（5=水泵, 6=风扇, 7=补光灯, 8=白灯）
- value: 1=开启, 0=关闭
- params: LED参数 {"r":255,"g":0,"b":0}

示例：
- "每天早上8点开风扇": {"action":"schedule_task","title":"每天早上8点开风扇","cron":"0 8 * * *","task_action":"toggle_relay","device":6,"value":1}
- "5分钟后关水泵": {"action":"schedule_task","title":"5分钟后关水泵","delay_seconds":300,"task_action":"toggle_relay","device":5,"value":0}

## 页面导航能力
你可以帮助用户跳转到不同的页面，当用户说"打开数据看板"、"去设备控制页面"、"查看监控"等时，输出以下格式：

\`\`\`json
{"action":"navigate","page":"dashboard"}
\`\`\`

可用页面：
- dashboard: 数据看板（查看历史数据、图表分析）
- monitor: 农作物监测（3D温室模型、摄像头监控）
- device-control: 设备控制（控制继电器、LED、云台）
- ai-assistant: AI助手（文字聊天）
- profile: 个人中心
- settings: 设置

示例：
- "打开数据看板": {"action":"navigate","page":"dashboard"}
- "去监控页面": {"action":"navigate","page":"monitor"}
- "我要控制设备": {"action":"navigate","page":"device-control"}

**重要语音输出规则（必须严格遵守）**: 
1. 你是一个语音助手，用户通过语音与你交互
2. 当需要执行设备控制、定时任务或页面导航时，你必须在回复文本中包含JSON命令
3. **但是，在语音朗读时，你绝对不能朗读JSON内容**
4. JSON命令应该放在回复的末尾，并且在朗读时自动跳过
5. 正确示例：
   - 用户："开启风扇"
   - 你的回复文本："好的，正在为你开启风扇 {"action":"toggle_relay","device":6,"value":1}"
   - 你的语音朗读："好的，正在为你开启风扇"（不朗读JSON部分）
6. 再例如：
   - 用户："把灯调成红色"
   - 你的回复文本："好的，正在把灯光调成红色 {"action":"set_led","r":255,"g":0,"b":0}"
   - 你的语音朗读："好的，正在把灯光调成红色"（不朗读JSON部分）
7. **关键：任何包含大括号{}、引号""、冒号:等JSON符号的内容都不要朗读出来**
8. 只用自然、流畅的中文语音描述你正在做什么，让用户听起来舒服自然

## 特殊命令处理规则
**关键**: 当用户说以下内容时，你**不应该**生成任何设备控制命令或导航命令，这些是系统级特殊命令，会被单独处理：
- "看看大棚"、"查看大棚"、"大棚情况"
- "草莓长得怎么样"、"草莓生长"
- "监控画面"、"截图分析"、"拍个照"

对于这些命令，系统会自动截图并跳转到AI助手进行分析，你**不需要**也**不应该**做任何响应。`;
    }

    return `${instructions}${deviceInfo}`;
  }, [instructions, deviceData]);

  // Track previous device relay states to detect changes
  const prevRelayStatesRef = useRef<string>("");
  
  // Update session when device relay states change (while connected)
  useEffect(() => {
    if (!deviceData) return;
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    if (status === 'idle' || status === 'connecting') return;
    
    // Only track relay states (the things that can be controlled)
    const currentRelayStates = `${deviceData.relay5}-${deviceData.relay6}-${deviceData.relay7}-${deviceData.relay8}`;
    
    // Skip if relay states haven't changed
    if (currentRelayStates === prevRelayStatesRef.current) return;
    
    // Update ref
    prevRelayStatesRef.current = currentRelayStates;
    
    // Send session.update with new instructions
    console.log('[RealtimeVoiceOrb] Device states changed, updating session instructions');
    const sessionUpdateMsg = {
      event_id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
      type: "session.update",
      session: {
        instructions: enhancedInstructions
      }
    };
    wsRef.current.send(JSON.stringify(sessionUpdateMsg));
  }, [deviceData, status, enhancedInstructions]);

  // Update status and notify parent
  const updateStatus = useCallback((newStatus: VoiceStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Handle errors
  const handleError = useCallback((error: string) => {
    console.error('[RealtimeVoiceOrb]', error);
    updateStatus('error');
    onError?.(error);
    toast.error(error);
  }, [updateStatus, onError]);

  // Create event ID
  const createEventId = () => `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;

  // Send WebSocket message
  const sendMessage = useCallback((message: object) => {
    console.log('[RealtimeVoiceOrb] sendMessage called, readyState:', wsRef.current?.readyState, 'type:', (message as any).type);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msgStr = JSON.stringify(message);
      console.log('[RealtimeVoiceOrb] Sending message:', (message as any).type);
      wsRef.current.send(msgStr);
    } else {
      console.warn('[RealtimeVoiceOrb] WebSocket not open, cannot send:', (message as any).type);
    }
  }, []);

  // Initialize session after connection
  const initSession = useCallback(() => {
    console.log('[RealtimeVoiceOrb] Initializing session with voice:', voice);
    sendMessage({
      event_id: createEventId(),
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        voice: voice,
        input_audio_format: "pcm16",
        output_audio_format: "pcm24",  // qwen3-omni-flash-realtime only supports pcm24
        instructions: enhancedInstructions,
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          silence_duration_ms: 800
        },
        input_audio_transcription: {
          model: "gummy-realtime-v1"
        }
      }
    });
    // Reset pending commands
    pendingCommandsRef.current = "";
  }, [sendMessage, voice, enhancedInstructions]);

  // Handle server events
  const handleServerEvent = useCallback((event: any) => {
    switch (event.type) {
      case 'session.created':
        console.log('[RealtimeVoiceOrb] Session created');
        break;
        
      case 'session.updated':
        console.log('[RealtimeVoiceOrb] Session updated, voice:', event.session?.voice);
        updateStatus('listening');
        break;
        
      case 'input_audio_buffer.speech_started':
        console.log('[RealtimeVoiceOrb] User started speaking');
        // Cancel any pending transcript clear
        if (clearTranscriptTimeoutRef.current) {
          clearTimeout(clearTranscriptTimeoutRef.current);
          clearTranscriptTimeoutRef.current = null;
        }
        updateStatus('listening');
        setIsUserSpeaking(true);
        setTranscript("");
        audioPlayerRef.current?.clear();
        break;
        
      case 'input_audio_buffer.speech_stopped':
        console.log('[RealtimeVoiceOrb] User stopped speaking');
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          setIsUserSpeaking(true);
          setTranscript(event.transcript);
          
          // 存储最后的用户转录
          lastUserTranscriptRef.current = event.transcript;
          
          // 检查是否是特殊命令（如截图分析）- 使用同步检查
          const text = event.transcript.toLowerCase().trim();
          const snapshotKeywords = [
            '看看大棚',
            '查看大棚',
            '大棚情况',
            '草莓长得怎么样',
            '草莓生长',
            '监控画面',
            '截图分析',
            '拍个照',
            '看一下大棚',
            '大棚里',
            '草莓',
            '长势',
            '生长情况',
          ];
          
          const isSnapshotCommand = snapshotKeywords.some(keyword => text.includes(keyword));
          
          console.log('[RealtimeVoiceOrb] Transcript:', event.transcript);
          console.log('[RealtimeVoiceOrb] Is snapshot command:', isSnapshotCommand);
          
          if (isSnapshotCommand) {
            console.log('[RealtimeVoiceOrb] Snapshot command detected:', event.transcript);
            
            // 立即取消当前的 AI 响应，防止 AI 生成设备控制命令
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'response.cancel'
              }));
              wsRef.current.send(JSON.stringify({
                type: 'input_audio_buffer.clear'
              }));
            }
            
            // 异步处理特殊命令
            (async () => {
              try {
                const { processVoiceCommand } = await import('@/lib/xiaozhi/voice-commands');
                const result = await processVoiceCommand(event.transcript);
                
                if (result.recognized && result.response) {
                  setIsUserSpeaking(false);
                  setTranscript(result.response);
                  onTranscript?.(result.response, false);
                  
                  // 清除文本
                  setTimeout(() => {
                    setTranscript("");
                    updateStatus('listening');
                  }, 3000);
                }
              } catch (error) {
                console.error('[RealtimeVoiceOrb] Special command error:', error);
                setTranscript("抱歉，执行命令时出现错误");
                setTimeout(() => {
                  setTranscript("");
                  updateStatus('listening');
                }, 2000);
              }
            })();
            
            return; // 不继续处理
          }
          
          onTranscript?.(event.transcript, true);
        }
        break;
        
      case 'response.created':
        // 再次检查是否是特殊命令（双重保护）
        const lastTranscript = lastUserTranscriptRef.current;
        if (lastTranscript) {
          const text = lastTranscript.toLowerCase().trim();
          const snapshotKeywords = [
            '看看大棚', '查看大棚', '大棚情况',
            '草莓长得怎么样', '草莓生长',
            '监控画面', '截图分析', '拍个照', '看一下大棚',
            '大棚里', '草莓', '长势', '生长情况',
          ];
          
          const isSnapshotCommand = snapshotKeywords.some(keyword => text.includes(keyword));
          
          if (isSnapshotCommand) {
            console.log('[RealtimeVoiceOrb] Cancelling response in response.created');
            // 立即取消
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'response.cancel' }));
            }
            
            // 处理特殊命令
            (async () => {
              try {
                const { processVoiceCommand } = await import('@/lib/xiaozhi/voice-commands');
                const result = await processVoiceCommand(lastTranscript);
                
                if (result.recognized && result.response) {
                  setIsUserSpeaking(false);
                  setTranscript(result.response);
                  onTranscript?.(result.response, false);
                  
                  setTimeout(() => {
                    setTranscript("");
                    updateStatus('listening');
                  }, 3000);
                }
              } catch (error) {
                console.error('[RealtimeVoiceOrb] Special command error:', error);
              }
            })();
            
            return;
          }
        }
        
        updateStatus('processing');
        setIsUserSpeaking(false);
        setTranscript("");
        break;
        
      case 'response.audio_transcript.delta':
        if (event.delta) {
          setIsUserSpeaking(false);
          setTranscript(prev => prev + event.delta);
          // Accumulate for command detection
          pendingCommandsRef.current += event.delta;
        }
        break;
        
      case 'response.audio_transcript.done':
        if (event.transcript) {
          onTranscript?.(event.transcript, false);
          // Don't overwrite pendingCommandsRef - it already has the accumulated transcript
          // Only set if it's empty (fallback)
          if (!pendingCommandsRef.current) {
            pendingCommandsRef.current = event.transcript;
          }
        }
        break;
        
      case 'response.audio.delta':
        if (event.delta) {
          updateStatus('speaking');
          // pcm24 means 24kHz sample rate, still 16-bit depth
          audioPlayerRef.current?.playPCM16(event.delta);
        }
        break;
        
      case 'response.done':
        console.log('[RealtimeVoiceOrb] Response complete');
        console.log('[RealtimeVoiceOrb] Pending commands text:', pendingCommandsRef.current);
        updateStatus('listening');
        
        // Check for commands in the response
        if (autoExecuteCommands && pendingCommandsRef.current) {
          // Match device control commands (including control_camera)
          const deviceMatches = [...pendingCommandsRef.current.matchAll(/\{[^{}]*"action"\s*:\s*"(?:toggle_relay|set_led|control_camera)"[^{}]*\}/g)];
          // Match schedule task commands (more complex, may have nested objects)
          const scheduleMatches = [...pendingCommandsRef.current.matchAll(/\{[^{}]*"action"\s*:\s*"schedule_task"[^}]*\}/g)];
          // Match navigate commands
          const navigateMatches = [...pendingCommandsRef.current.matchAll(/\{[^{}]*"action"\s*:\s*"navigate"[^{}]*\}/g)];
          
          console.log('[RealtimeVoiceOrb] Device matches:', deviceMatches.length, 'Schedule matches:', scheduleMatches.length, 'Navigate matches:', navigateMatches.length);
          
          if (deviceMatches.length > 0 || scheduleMatches.length > 0 || navigateMatches.length > 0) {
            (async () => {
              setIsExecutingCommand(true);
              
              // Execute device commands
              for (const match of deviceMatches) {
                try {
                  const cmd = JSON.parse(match[0]) as DeviceCommand;
                  console.log('[RealtimeVoiceOrb] Executing device command:', cmd);
                  onDeviceCommand?.(cmd);
                  const result = await executeDeviceCommand(cmd);
                  if (result.success) {
                    toast.success(result.message);
                  } else {
                    toast.error(`执行失败: ${result.message}`);
                  }
                  await new Promise(r => setTimeout(r, 500));
                } catch (e) {
                  console.error('[RealtimeVoiceOrb] Device command parse error:', e);
                }
              }
              
              // Execute schedule task commands
              for (const match of scheduleMatches) {
                try {
                  // Try to parse, handling potential nested params
                  let jsonStr = match[0];
                  // If params is present but not closed, try to find the full object
                  if (jsonStr.includes('"params"') && !jsonStr.includes('}}')) {
                    const startIdx = pendingCommandsRef.current.indexOf(match[0]);
                    const endIdx = pendingCommandsRef.current.indexOf('}}', startIdx);
                    if (endIdx > startIdx) {
                      jsonStr = pendingCommandsRef.current.slice(startIdx, endIdx + 2);
                    }
                  }
                  const cmd = JSON.parse(jsonStr) as ScheduleTaskCommand;
                  console.log('[RealtimeVoiceOrb] Creating schedule task:', cmd);
                  onScheduleTask?.(cmd);
                  const result = await executeScheduleTask(cmd);
                  if (result.success) {
                    toast.success(result.message);
                  } else {
                    toast.error(`创建失败: ${result.message}`);
                  }
                  await new Promise(r => setTimeout(r, 500));
                } catch (e) {
                  console.error('[RealtimeVoiceOrb] Schedule task parse error:', e);
                }
              }
              
              // Execute navigate commands
              for (const match of navigateMatches) {
                try {
                  const cmd = JSON.parse(match[0]) as NavigateCommand;
                  console.log('[RealtimeVoiceOrb] Executing navigate command:', cmd);
                  const pageName = PAGE_NAMES[cmd.page] || cmd.page;
                  toast.success(`正在跳转到${pageName}...`);
                  onNavigate?.(cmd);
                  await new Promise(r => setTimeout(r, 500));
                } catch (e) {
                  console.error('[RealtimeVoiceOrb] Navigate command parse error:', e);
                }
              }
              
              setIsExecutingCommand(false);
            })();
          }
          pendingCommandsRef.current = "";
        }
        
        // Delay clearing transcript so user can read the full response
        if (clearTranscriptTimeoutRef.current) {
          clearTimeout(clearTranscriptTimeoutRef.current);
        }
        clearTranscriptTimeoutRef.current = setTimeout(() => {
          setTranscript("");
          clearTranscriptTimeoutRef.current = null;
        }, 2500);
        
        // Refresh quota after response
        refreshQuota();
        break;
        
      case 'quota_warning':
        // Server notifies that quota is exhausted after this response
        console.log('[RealtimeVoiceOrb] Quota warning:', event.message);
        toast.warning('语音对话额度即将用完');
        if (event.quota) {
          setQuotaInfo(event.quota);
        }
        break;
        
      case 'error':
        // Check if it's a quota error
        const errorMsg = event?.error?.message || event?.message || 'Unknown error';
        if (errorMsg.includes('Quota')) {
          toast.error('语音对话额度已用完');
          onQuotaExceeded?.();
          // Close connection
          if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
          }
          updateStatus('idle');
        } else {
          handleError(errorMsg);
        }
        break;
    }
  }, [updateStatus, onTranscript, onDeviceCommand, onScheduleTask, onNavigate, handleError, autoExecuteCommands, refreshQuota, onQuotaExceeded]);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    // Check quota before connecting
    const quota = await refreshQuota();
    if (quota && !quota.can_use) {
      toast.error('今日语音对话额度已用完，请明天再来');
      onQuotaExceeded?.();
      return;
    }
    
    updateStatus('connecting');
    
    try {
      // Initialize audio player
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new AudioPlayer();
      }
      audioPlayerRef.current.init();

      // Build WebSocket URL - always use standalone WS server for stability
      const model = 'qwen3-omni-flash-realtime-2025-12-01';
      let wsUrl: string;
      
      // Check for explicit proxy URL first
      const explicitProxy = process.env.NEXT_PUBLIC_XIAOZHI_WS_PROXY?.trim();
      
      if (explicitProxy) {
        wsUrl = `${explicitProxy}?model=${encodeURIComponent(model)}`;
      } else {
        // Use standalone WebSocket server (works for both dev and prod)
        // In production, nginx proxies /ws/voice to the WS server
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;
        
        if (window.location.protocol === 'http:') {
          // Development: direct connection to port 3002
          wsUrl = `ws://${window.location.hostname}:3002?model=${encodeURIComponent(model)}`;
        } else {
          // Production: use nginx proxy path
          wsUrl = `${wsProtocol}//${wsHost}/ws/voice?model=${encodeURIComponent(model)}`;
        }
      }

      console.log('[RealtimeVoiceOrb] Connecting to:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[RealtimeVoiceOrb] Connected successfully!');
        // Send session.update directly here to avoid stale closure issues
        const sessionUpdateMsg = {
          event_id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            voice: voice,
            input_audio_format: "pcm16",
            output_audio_format: "pcm24",
            instructions: enhancedInstructions,
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              silence_duration_ms: 800
            },
            input_audio_transcription: {
              model: "gummy-realtime-v1"
            }
          }
        };
        console.log('[RealtimeVoiceOrb] Sending session.update with voice:', voice);
        ws.send(JSON.stringify(sessionUpdateMsg));
        pendingCommandsRef.current = "";

        // Trigger initial greeting if provided
        if (initialGreeting) {
          console.log('[RealtimeVoiceOrb] Triggering initial greeting:', initialGreeting);
          // Wait a bit for session update to process
          setTimeout(() => {
            const responseCreateMsg = {
              event_id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
              type: "response.create",
              response: {
                modalities: ["text", "audio"],
                instructions: `请直接朗读以下内容：${initialGreeting}`
              }
            };
            ws.send(JSON.stringify(responseCreateMsg));
          }, 500);
        }
      };

      ws.onmessage = async (event) => {
        try {
          let data = event.data;
          if (data instanceof Blob) {
            data = await data.text();
          }
          const json = JSON.parse(data);
          console.log('[RealtimeVoiceOrb] Received:', json.type);
          handleServerEvent(json);
        } catch (e) {
          console.error('[RealtimeVoiceOrb] Parse error:', e);
        }
      };

      ws.onclose = (event) => {
        console.log('[RealtimeVoiceOrb] Disconnected:', event.code, event.reason);
        updateStatus('idle');
        stopCapture();
      };

      ws.onerror = (e) => {
        console.error('[RealtimeVoiceOrb] WebSocket error event:', e);
        // Get more details
        console.error('[RealtimeVoiceOrb] WebSocket readyState:', ws.readyState);
        console.error('[RealtimeVoiceOrb] WebSocket url:', ws.url);
        handleError('连接失败');
      };

    } catch (error: any) {
      handleError(error.message || '连接失败');
    }
  }, [updateStatus, initSession, handleServerEvent, handleError, refreshQuota, onQuotaExceeded]);

  // Start audio capture
  const startCapture = useCallback(async () => {
    if (audioCaptureRef.current) return;
    
    try {
      audioCaptureRef.current = new AudioCapture((base64) => {
        sendMessage({
          event_id: createEventId(),
          type: "input_audio_buffer.append",
          audio: base64
        });
      });
      
      await audioCaptureRef.current.start();
      console.log('[RealtimeVoiceOrb] Audio capture started');
    } catch (error: any) {
      handleError(`麦克风错误: ${error.message}`);
    }
  }, [sendMessage, handleError]);

  // Stop audio capture
  const stopCapture = useCallback(() => {
    if (audioCaptureRef.current) {
      audioCaptureRef.current.stop();
      audioCaptureRef.current = null;
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    stopCapture();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
    }
    
    updateStatus('idle');
  }, [stopCapture, updateStatus]);

  // Toggle connection
  const toggleConnection = useCallback(async () => {
    if (status === 'idle' || status === 'error') {
      await connect();
      await startCapture();
    } else {
      disconnect();
    }
  }, [status, connect, startCapture, disconnect]);

  // Interrupt current response
  const interrupt = useCallback(() => {
    sendMessage({ type: "response.cancel" });
    sendMessage({ type: "input_audio_buffer.clear" });
    audioPlayerRef.current?.clear();
    updateStatus('listening');
  }, [sendMessage, updateStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (clearTranscriptTimeoutRef.current) {
        clearTimeout(clearTranscriptTimeoutRef.current);
      }
    };
  }, [disconnect]);

  // Auto connect if enabled
  useEffect(() => {
    if (autoConnect && status === 'idle') {
      connect().then(() => startCapture());
    }
  }, [autoConnect]);

  // Orb colors based on status
  const orbConfig = useMemo(() => {
    switch (status) {
      case 'listening':
        return {
          colors: {
            bg: "oklch(95% 0.02 30)",
            c1: "oklch(65% 0.25 30)",
            c2: "oklch(70% 0.2 50)",
            c3: "oklch(60% 0.25 0)",
          },
          duration: 5
        };
      case 'speaking':
        return {
          colors: {
            bg: "oklch(95% 0.02 140)",
            c1: "oklch(70% 0.2 140)",
            c2: "oklch(75% 0.15 160)",
            c3: "oklch(80% 0.2 130)",
          },
          duration: 8
        };
      case 'processing':
        return {
          colors: {
            bg: "oklch(95% 0.02 260)",
            c1: "oklch(70% 0.15 200)",
            c2: "oklch(60% 0.2 250)",
            c3: "oklch(50% 0.2 280)",
          },
          duration: 2
        };
      case 'connecting':
        return {
          colors: {
            bg: "oklch(95% 0.02 60)",
            c1: "oklch(75% 0.2 60)",
            c2: "oklch(70% 0.15 80)",
            c3: "oklch(65% 0.2 40)",
          },
          duration: 3
        };
      case 'error':
        return {
          colors: {
            bg: "oklch(95% 0.02 0)",
            c1: "oklch(55% 0.25 0)",
            c2: "oklch(50% 0.2 20)",
            c3: "oklch(45% 0.25 350)",
          },
          duration: 10
        };
      default:
        return {
          colors: undefined,
          duration: 20
        };
    }
  }, [status]);

  const statusText = useMemo(() => {
    switch (status) {
      case 'connecting': return '连接中...';
      case 'listening': return '正在聆听';
      case 'processing': return '思考中...';
      case 'speaking': return '正在回复';
      case 'error': return '连接错误';
      default: return '点击开始';
    }
  }, [status]);

  const isActive = status !== 'idle' && status !== 'error';

  return (
    <div className={cn("relative", className)}>
      {/* Main Orb */}
      <motion.div
        className="relative cursor-pointer"
        style={{ width: size, height: size }}
        onClick={toggleConnection}
        onDoubleClick={isActive ? interrupt : undefined}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Orb Background */}
        <div className="absolute inset-0 rounded-full overflow-hidden shadow-2xl">
          <SiriOrb
            size={`${size}px`}
            colors={orbConfig.colors}
            animationDuration={orbConfig.duration}
            className="w-full h-full"
          />
        </div>

        {/* Center Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {status === 'connecting' ? (
              <motion.div
                key="connecting"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Loader2 className="w-8 h-8 text-white/80 animate-spin" />
              </motion.div>
            ) : status === 'speaking' ? (
              <motion.div
                key="speaking"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Volume2 className="w-8 h-8 text-white/80" />
              </motion.div>
            ) : isActive ? (
              <motion.div
                key="active"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Mic className="w-8 h-8 text-white/80" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Status Ring */}
        {isActive && (
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full border-2",
              status === 'listening' && "border-red-400/50",
              status === 'processing' && "border-blue-400/50",
              status === 'speaking' && "border-green-400/50"
            )}
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.2, 0.5]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </motion.div>

      {/* Status Label */}
      <AnimatePresence>
        {(isActive || status === 'error') && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
            style={{ top: `${size + 12}px` }}
          >
            <span className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm",
              status === 'listening' && "bg-red-500/20 text-red-200 border border-red-500/30",
              status === 'processing' && "bg-blue-500/20 text-blue-200 border border-blue-500/30",
              status === 'speaking' && "bg-green-500/20 text-green-200 border border-green-500/30",
              status === 'connecting' && "bg-yellow-500/20 text-yellow-200 border border-yellow-500/30",
              status === 'error' && "bg-red-500/30 text-red-300 border border-red-500/40"
            )}>
              {status === 'listening' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
              {status === 'processing' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
              {status === 'speaking' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
              {statusText}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quota Display - show when idle */}
      <AnimatePresence>
        {status === 'idle' && quotaInfo && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
            style={{ top: `${size + 12}px` }}
          >
            <span className={cn(
              "inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full backdrop-blur-md shadow-sm",
              quotaInfo.can_use 
                ? "bg-white/10 text-white/60 border border-white/10" 
                : "bg-red-500/20 text-red-300 border border-red-500/30"
            )}>
              {quotaInfo.can_use 
                ? `今日 ${quotaInfo.daily_usage}/${quotaInfo.daily_limit}` 
                : '额度已用完'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript Bubble - visionOS style */}
      <AnimatePresence>
        {transcript && isActive && (
          <motion.div
            key={isUserSpeaking ? 'user' : 'ai'}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="fixed z-50 pointer-events-none"
            style={{ 
              bottom: `${size + 100}px`,
              right: '24px',
            }}
          >
            {/* visionOS glass container */}
            <div
              style={{
                position: 'relative',
                background: 'rgba(30, 30, 35, 0.75)',
                backdropFilter: 'blur(50px) saturate(180%)',
                WebkitBackdropFilter: 'blur(50px) saturate(180%)',
                borderRadius: '20px',
                border: '0.5px solid rgba(255,255,255,0.12)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.35), inset 0 0.5px 0 rgba(255,255,255,0.1)',
                padding: '12px 16px',
                width: '280px',
                maxWidth: '280px',
              }}
            >
              {/* Speaker label */}
              <div 
                style={{ 
                  fontSize: '11px',
                  fontWeight: 500,
                  color: isUserSpeaking ? 'rgba(255,255,255,0.45)' : 'rgba(120,220,180,0.9)',
                  marginBottom: '6px',
                  letterSpacing: '0.02em'
                }}
              >
                {isUserSpeaking ? "你" : "莓小智"}
              </div>
              
              {/* Bubble content */}
              <div 
                style={{ 
                  fontSize: '15px',
                  lineHeight: 1.55,
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 400,
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {transcript}
              </div>
              
              {/* Tail */}
              <div 
                style={{
                  position: 'absolute',
                  right: '24px',
                  bottom: '-6px',
                  width: '12px',
                  height: '12px',
                  background: 'rgba(30, 30, 35, 0.75)',
                  borderRadius: '2px',
                  transform: 'rotate(45deg)',
                  borderRight: '0.5px solid rgba(255,255,255,0.12)',
                  borderBottom: '0.5px solid rgba(255,255,255,0.12)',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RealtimeVoiceOrb;
