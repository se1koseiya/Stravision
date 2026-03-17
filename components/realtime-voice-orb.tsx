"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Volume2, Loader2, Sparkles, Lightbulb, Fan, Droplets, Video, Calendar, ArrowRight, Zap, Navigation } from "lucide-react";
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
  membership?: 'free' | 'pro' | 'plus';
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

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
}

// Fetch user quota
async function fetchQuota(): Promise<QuotaInfo | null> {
  try {
    const res = await fetch('/api/user/settings');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.quota) return null;
    return {
      ...data.quota,
      membership: data.user?.membership
    };
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

function extractCommands(content: string) {
  const commands: AICommand[] = [];
  let cleanText = content;

  // Regex for JSON objects containing "action"
  // We use a non-greedy match for the content inside braces
  const jsonRegex = /\{[^{}]*"action"\s*:\s*"[^"]+"[^{}]*\}/g;
  const matches = [...content.matchAll(jsonRegex)];

  for (const match of matches) {
    try {
      const cmd = JSON.parse(match[0]);
      commands.push(cmd);
      // Remove the JSON string from the text
      cleanText = cleanText.replace(match[0], "");
    } catch (e) {
      console.error("Failed to parse command JSON:", match[0], e);
    }
  }

  return { text: cleanText.trim(), commands };
}

function CommandCard({ command }: { command: AICommand }) {
  if (command.action === 'toggle_relay') {
    const deviceName = DEVICE_NAMES[String(command.device)] || `设备${command.device}`;
    const isOn = command.value === 1;
    const Icon = command.device === 5 ? Droplets : command.device === 6 ? Fan : (command.device === 7 || command.device === 8) ? Lightbulb : Zap;
    
    return (
      <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md shadow-sm overflow-hidden">
        <div className={cn("flex items-center justify-center w-10 h-10 rounded-full", isOn ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400")}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white/90 truncate">{deviceName}</div>
          <div className="text-xs text-white/60 truncate">{isOn ? "已开启" : "已关闭"}</div>
        </div>
        <div className={cn("w-2 h-2 rounded-full mr-2", isOn ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-500")} />
      </div>
    );
  }

  if (command.action === 'set_led') {
    return (
      <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20 text-orange-400">
          <Lightbulb size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white/90 truncate">RGB氛围灯</div>
          <div className="text-xs text-white/60 truncate">颜色已调整</div>
        </div>
        <div 
          className="w-6 h-6 rounded-full border-2 border-white/20 shadow-sm mr-1"
          style={{ backgroundColor: `rgb(${command.r},${command.g},${command.b})` }}
        />
      </div>
    );
  }
  
  if (command.action === 'control_camera') {
    const direction = command.direction === 1 ? "左转" : command.direction === 2 ? "右转" : "停止";
    return (
      <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20 text-blue-400">
          <Video size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white/90 truncate">摄像头云台</div>
          <div className="text-xs text-white/60 truncate">正在{direction}</div>
        </div>
      </div>
    );
  }

  if (command.action === 'schedule_task') {
    return (
      <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/20 text-purple-400">
          <Calendar size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white/90 truncate">定时任务已创建</div>
          <div className="text-xs text-white/60 truncate">{command.title}</div>
        </div>
      </div>
    );
  }

  if (command.action === 'navigate') {
     const pageName = PAGE_NAMES[command.page] || command.page;
     return (
      <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md shadow-sm cursor-pointer hover:bg-white/20 transition-colors overflow-hidden">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400">
          <Navigation size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white/90 truncate">页面跳转</div>
          <div className="text-xs text-white/60 truncate">前往 {pageName}</div>
        </div>
        <ArrowRight size={16} className="text-white/40 mr-1" />
      </div>
    );
  }

  return null;
}

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
}: RealtimeVoiceOrbProps) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState<string>("");
  const [history, setHistory] = useState<ChatMessage[]>([]); // Chat history
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
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Handle server events
  const handleServerEvent = useCallback((event: any) => {
    switch (event.type) {
      case 'session.created':
        console.log('[RealtimeVoiceOrb] Session created');
        // Session created, now we send session.update
        const sessionUpdateMsg = {
          event_id: createEventId(),
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            voice: voice,
            input_audio_format: "pcm16",
            output_audio_format: "pcm24",
            instructions: enhancedInstructions,
            turn_detection: {
              type: "server_vad",
              threshold: 0.8,
              silence_duration_ms: 1200
            }
          }
        };
        sendMessage(sessionUpdateMsg);
        
        // Then start capturing audio and trigger greeting
        if (audioCaptureRef.current) {
          audioCaptureRef.current.start();
        } else {
          const capture = new AudioCapture((base64) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                event_id: createEventId(),
                type: 'input_audio_buffer.append',
                audio: base64
              }));
            }
          });
          audioCaptureRef.current = capture;
          capture.start();
        }
        break;
        
      case 'session.updated':
        console.log('[RealtimeVoiceOrb] Session updated');
        updateStatus('listening');
        break;
        
      case 'input_audio_buffer.speech_started':
        console.log('[RealtimeVoiceOrb] User started speaking');
        updateStatus('listening');
        setIsUserSpeaking(true);
        // Clear streaming transcript when new speech starts
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
          
          // Store user transcript in history immediately
          // But only if it's not empty
          const text = event.transcript.trim();
          if (text) {
            lastUserTranscriptRef.current = text;
            
            // Check for special commands
            const snapshotKeywords = ['看看大棚', '查看大棚', '大棚情况', '草莓长得怎么样', '草莓生长', '监控画面', '截图分析', '拍个照', '看一下大棚', '大棚里', '草莓', '长势', '生长情况'];
            const isSnapshotCommand = snapshotKeywords.some(keyword => text.toLowerCase().includes(keyword));
            
            if (isSnapshotCommand) {
              // Cancel AI response
              sendMessage({ type: 'response.cancel' });
              sendMessage({ type: 'input_audio_buffer.clear' });
              
              // Add to history
              setHistory(prev => [...prev, { id: createEventId(), role: 'user', content: text }]);
              
              // Handle special command logic (async)
              (async () => {
                try {
                  const { processVoiceCommand } = await import('@/lib/xiaozhi/voice-commands');
                  const result = await processVoiceCommand(text);
                  if (result.recognized && result.response) {
                    setHistory(prev => [...prev, { id: createEventId(), role: 'assistant', content: result.response }]);
                  }
                } catch (error) {
                  console.error('Special command error:', error);
                }
              })();
              
              setTranscript(""); // Clear active transcript since it's now in history
              return;
            }
          }
          
          onTranscript?.(event.transcript, true);
        }
        break;
        
      case 'response.created':
        // User turn ended, AI turn starting. 
        // Move current user transcript to history if it hasn't been moved yet
        // (Though usually we rely on input_audio_transcription.completed)
        if (isUserSpeaking && transcript) {
           setHistory(prev => [...prev, { id: createEventId(), role: 'user', content: transcript }]);
           setTranscript(""); // Clear active transcript
        }
        
        updateStatus('processing');
        setIsUserSpeaking(false);
        break;
        
      case 'response.audio_transcript.delta':
        if (event.delta) {
          setIsUserSpeaking(false);
          setTranscript(prev => prev + event.delta);
          pendingCommandsRef.current += event.delta;
        }
        break;
        
      case 'response.audio_transcript.done':
        if (event.transcript) {
          onTranscript?.(event.transcript, false);
          if (!pendingCommandsRef.current) {
            pendingCommandsRef.current = event.transcript;
          }
        }
        break;
        
      case 'response.audio.delta':
        if (event.delta) {
          updateStatus('speaking');
          audioPlayerRef.current?.playPCM16(event.delta);
        }
        break;
        
      case 'response.done':
        console.log('[RealtimeVoiceOrb] Response complete');
        updateStatus('listening');
        
        // Add AI response to history
        if (transcript) {
           setHistory(prev => [...prev, { id: createEventId(), role: 'assistant', content: transcript }]);
           setTranscript(""); // Clear active transcript
        }
        
        // Execute commands
        if (autoExecuteCommands && pendingCommandsRef.current) {
          const commandsText = pendingCommandsRef.current;
          // ... (Command parsing logic same as before) ...
          const deviceMatches = [...commandsText.matchAll(/\{[^{}]*"action"\s*:\s*"(?:toggle_relay|set_led|control_camera)"[^{}]*\}/g)];
          const scheduleMatches = [...commandsText.matchAll(/\{[^{}]*"action"\s*:\s*"schedule_task"[^}]*\}/g)];
          const navigateMatches = [...commandsText.matchAll(/\{[^{}]*"action"\s*:\s*"navigate"[^{}]*\}/g)];
          
          if (deviceMatches.length > 0 || scheduleMatches.length > 0 || navigateMatches.length > 0) {
            (async () => {
              setIsExecutingCommand(true);
              // Execute all found commands
              for (const match of deviceMatches) {
                try {
                  const cmd = JSON.parse(match[0]) as DeviceCommand;
                  onDeviceCommand?.(cmd);
                  const result = await executeDeviceCommand(cmd);
                  if (result.success) toast.success(result.message);
                  else toast.error(`执行失败: ${result.message}`);
                } catch {}
              }
              for (const match of scheduleMatches) {
                try {
                  let jsonStr = match[0];
                  if (jsonStr.includes('"params"') && !jsonStr.includes('}}')) {
                    const start = commandsText.indexOf(match[0]);
                    const end = commandsText.indexOf('}}', start);
                    if (end > start) jsonStr = commandsText.slice(start, end + 2);
                  }
                  const cmd = JSON.parse(jsonStr) as ScheduleTaskCommand;
                  onScheduleTask?.(cmd);
                  const result = await executeScheduleTask(cmd);
                  if (result.success) toast.success(result.message);
                  else toast.error(`创建失败: ${result.message}`);
                } catch {}
              }
              for (const match of navigateMatches) {
                try {
                  const cmd = JSON.parse(match[0]) as NavigateCommand;
                  toast.success(`正在跳转...`);
                  onNavigate?.(cmd);
                } catch {}
              }
              setIsExecutingCommand(false);
            })();
          }
          pendingCommandsRef.current = "";
        }
        
        refreshQuota();
        break;
        
      case 'quota_warning':
        toast.warning('语音对话额度即将用完');
        if (event.quota) setQuotaInfo(event.quota);
        break;
        
      case 'error':
        const errorMsg = event?.error?.message || event?.message || 'Unknown error';
        if (errorMsg.includes('Quota')) {
          toast.error('语音对话额度已用完');
          onQuotaExceeded?.();
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
  }, [updateStatus, onTranscript, onDeviceCommand, onScheduleTask, onNavigate, handleError, autoExecuteCommands, refreshQuota, onQuotaExceeded, sendMessage, voice, enhancedInstructions, transcript, isUserSpeaking]);

  // Connect logic
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const quota = await refreshQuota();
    if (quota && !quota.can_use) {
      if (quota.membership === 'free') {
        toast.error('AI助手功能仅限Pro及以上会员使用');
      } else {
        toast.error('今日语音对话额度已用完，请明天再来');
      }
      onQuotaExceeded?.();
      return;
    }
    
    updateStatus('connecting');
    
    try {
      if (!audioPlayerRef.current) audioPlayerRef.current = new AudioPlayer();
      audioPlayerRef.current.init();

      const model = 'qwen3-omni-flash-realtime-2025-12-01';
      let wsUrl: string;
      const explicitProxy = process.env.NEXT_PUBLIC_XIAOZHI_WS_PROXY?.trim();
      
      if (explicitProxy) {
        wsUrl = `${explicitProxy}?model=${encodeURIComponent(model)}`;
      } else {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;
        if (window.location.protocol === 'http:') {
          wsUrl = `ws://${window.location.hostname}:3002?model=${encodeURIComponent(model)}`;
        } else {
          wsUrl = `${wsProtocol}//${wsHost}/ws/voice?model=${encodeURIComponent(model)}`;
        }
      }

      console.log('[RealtimeVoiceOrb] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Wait for session.created from server
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          handleServerEvent(data);
        } catch (e) {
          console.error('[RealtimeVoiceOrb] Parse error:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('[RealtimeVoiceOrb] WebSocket error:', e);
        handleError('连接错误，请检查网络');
      };

      ws.onclose = (e) => {
        console.log('[RealtimeVoiceOrb] WebSocket closed:', e.code, e.reason);
        if (status !== 'idle' && status !== 'error') {
          updateStatus('idle');
        }
        audioCaptureRef.current?.stop();
      };
    } catch (e) {
      handleError('初始化失败');
    }
  }, [refreshQuota, updateStatus, handleError, onQuotaExceeded, handleServerEvent, status]);

  // Disconnect logic
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    audioCaptureRef.current?.stop();
    audioPlayerRef.current?.stop();
    updateStatus('idle');
    setTranscript("");
    setHistory([]); // Optional: clear history on disconnect? Maybe keep it.
  }, [updateStatus]);

  // Toggle connection
  const toggleConnection = useCallback(async () => {
    if (status === 'idle' || status === 'error') {
      await connect();
    } else {
      disconnect();
    }
  }, [status, connect, disconnect]);

  // Interrupt
  const interrupt = useCallback(() => {
    sendMessage({ type: "response.cancel" });
    sendMessage({ type: "input_audio_buffer.clear" });
    audioPlayerRef.current?.clear();
    updateStatus('listening');
  }, [sendMessage, updateStatus]);

  // Cleanup
  useEffect(() => {
    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (clearTranscriptTimeoutRef.current) clearTimeout(clearTranscriptTimeoutRef.current);
    };
  }, [disconnect]);

  // Auto connect
  useEffect(() => {
    if (autoConnect && status === 'idle') {
      connect();
    }
  }, [autoConnect]);

  // Orb colors
  const orbConfig = useMemo(() => {
    switch (status) {
      case 'listening':
        return { colors: { bg: "oklch(95% 0.02 30)", c1: "oklch(65% 0.25 30)", c2: "oklch(70% 0.2 50)", c3: "oklch(60% 0.25 0)" }, duration: 5 };
      case 'speaking':
        return { colors: { bg: "oklch(95% 0.02 140)", c1: "oklch(70% 0.2 140)", c2: "oklch(75% 0.15 160)", c3: "oklch(80% 0.2 130)" }, duration: 8 };
      case 'processing':
        return { colors: { bg: "oklch(95% 0.02 260)", c1: "oklch(70% 0.15 200)", c2: "oklch(60% 0.2 250)", c3: "oklch(50% 0.2 280)" }, duration: 2 };
      case 'connecting':
        return { colors: { bg: "oklch(95% 0.02 60)", c1: "oklch(75% 0.2 60)", c2: "oklch(70% 0.15 80)", c3: "oklch(65% 0.2 40)" }, duration: 3 };
      case 'error':
        return { colors: { bg: "oklch(95% 0.02 0)", c1: "oklch(55% 0.25 0)", c2: "oklch(50% 0.2 20)", c3: "oklch(45% 0.25 350)" }, duration: 10 };
      default:
        return { colors: undefined, duration: 20 };
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
    <div className={cn("fixed bottom-6 left-6 z-50 font-sans", className)}>
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
              <motion.div key="connecting" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                <Loader2 className="w-8 h-8 text-white/80 animate-spin" />
              </motion.div>
            ) : status === 'speaking' ? (
              <motion.div key="speaking" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                <Volume2 className="w-8 h-8 text-white/80" />
              </motion.div>
            ) : isActive ? (
              <motion.div key="active" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                <Mic className="w-8 h-8 text-white/80" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Status Ring */}
        {isActive && (
          <motion.div
            className={cn("absolute inset-0 rounded-full border-2", status === 'listening' && "border-red-400/50", status === 'processing' && "border-blue-400/50", status === 'speaking' && "border-green-400/50")}
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
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
              "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border",
              status === 'listening' && "bg-red-100/80 text-red-600 border-red-200",
              status === 'processing' && "bg-blue-100/80 text-blue-600 border-blue-200",
              status === 'speaking' && "bg-green-100/80 text-green-600 border-green-200",
              status === 'connecting' && "bg-yellow-100/80 text-yellow-600 border-yellow-200",
              status === 'error' && "bg-red-100/90 text-red-700 border-red-300",
              (status === 'idle') && "bg-white/80 text-gray-600 border-gray-200"
            )}>
              {statusText}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat History Container */}
      <div 
        className="absolute left-0 bottom-full mb-6 w-[90vw] md:w-[400px] flex flex-col justify-end pointer-events-none gap-3 z-40"
        style={{ maxHeight: '60vh' }}
      >
        <AnimatePresence initial={false}>
          {history.map((msg) => {
            const { text, commands } = extractCommands(msg.content);
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "flex w-full pointer-events-auto",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "relative max-w-[85%] px-5 py-3 rounded-3xl border backdrop-blur-xl shadow-lg transition-all",
                    msg.role === 'user' 
                      ? "bg-blue-600/90 border-blue-500/50 text-white rounded-br-none shadow-blue-500/20" 
                      : "bg-white/80 border-white/40 text-gray-800 rounded-bl-none shadow-black/5"
                  )}
                >
                  <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap font-medium tracking-wide">
                    {text}
                  </div>
                  {commands.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-bold opacity-60 mb-2 ml-1 flex items-center gap-1">
                        <Sparkles size={12} />
                        执行指令
                      </div>
                      <div className="space-y-2">
                        {commands.map((cmd, i) => (
                          <CommandCard key={i} command={cmd} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Current Streaming Transcript */}
          {transcript && isActive && (
            <motion.div
              key="current-transcript"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "flex w-full pointer-events-auto",
                isUserSpeaking ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "relative max-w-[85%] px-5 py-3 rounded-3xl border backdrop-blur-xl shadow-lg",
                  isUserSpeaking
                    ? "bg-blue-600/90 border-blue-500/50 text-white rounded-br-none shadow-blue-500/20" 
                    : "bg-white/80 border-white/40 text-gray-800 rounded-bl-none shadow-black/5"
                )}
              >
                <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap font-medium tracking-wide flex items-end gap-1">
                  {(() => {
                    const { text, commands } = extractCommands(transcript);
                    return (
                      <div className="w-full">
                        <span>{text}</span>
                        {!isUserSpeaking && <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-600 animate-pulse mb-1 ml-1" />}
                        {commands.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-bold opacity-60 mb-2 ml-1 flex items-center gap-1">
                              <Sparkles size={12} />
                              执行指令
                            </div>
                            <div className="space-y-2">
                              {commands.map((cmd, i) => (
                                <CommandCard key={i} command={cmd} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default RealtimeVoiceOrb;
