/**
 * 语音助手共享工具：音频捕获/播放、命令解析与执行、配额查询。
 *
 * 这些能力与具体架构无关，级联架构与 Omni 架构均复用，
 * 避免重复实现并保证行为一致。
 */

import type {
  AICommand,
  DeviceCommand,
  NavigateCommand,
  QuotaInfo,
  ScheduleTaskCommand,
} from "./voice-types";

// ---------------------------------------------------------------------------
// 设备 / 页面映射
// ---------------------------------------------------------------------------

export const DEVICE_NAMES: Record<string, string> = {
  "5": "水泵",
  "6": "风扇",
  "7": "补光灯",
  "8": "光照植物补光灯",
};

export const PAGE_NAMES: Record<string, string> = {
  dashboard: "数据看板",
  monitor: "农作物监测",
  "device-control": "设备控制",
  "ai-assistant": "AI助手",
  profile: "个人中心",
  settings: "设置",
};

// ---------------------------------------------------------------------------
// 命令解析
// ---------------------------------------------------------------------------

/**
 * 从 AI 回复文本中提取 JSON 命令，并返回剔除命令后的纯文本。
 * 用于：1) UI 展示纯文本；2) TTS 只朗读纯文本，跳过 JSON。
 */
export function extractCommands(content: string): {
  text: string;
  commands: AICommand[];
} {
  const commands: AICommand[] = [];
  let cleanText = content;

  const jsonRegex = /\{[^{}]*"action"\s*:\s*"[^"]+"[^{}]*\}/g;
  const matches = [...content.matchAll(jsonRegex)];

  for (const match of matches) {
    try {
      const cmd = JSON.parse(match[0]);
      commands.push(cmd);
      cleanText = cleanText.replace(match[0], "");
    } catch (e) {
      console.error("Failed to parse command JSON:", match[0], e);
    }
  }

  return { text: cleanText.trim(), commands };
}

// ---------------------------------------------------------------------------
// 命令执行
// ---------------------------------------------------------------------------

export async function executeDeviceCommand(cmd: DeviceCommand): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const res = await fetch("/api/ai/device-control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cmd),
    });

    if (res.ok) {
      let deviceName: string;
      let actionDesc: string;

      if (cmd.action === "set_led") {
        deviceName = "植物全光谱补光灯";
        actionDesc = `颜色设置为 R:${cmd.r} G:${cmd.g} B:${cmd.b}`;
      } else if (cmd.action === "control_camera") {
        deviceName = "摄像头云台";
        const directionNames = ["停止", "左移", "右移"];
        actionDesc = directionNames[cmd.direction ?? 0] || "控制";
      } else if (cmd.action === "reset_camera") {
        deviceName = "摄像头云台";
        actionDesc = "复位居中";
      } else {
        const deviceMap: Record<string, string> = {
          "5": "水泵",
          "6": "风扇",
          "7": "植物全光谱补光灯",
          "8": "光照植物补光灯",
        };
        deviceName =
          deviceMap[String(cmd.device)] ||
          DEVICE_NAMES[String(cmd.device)] ||
          `设备${cmd.device}`;
        actionDesc = `已${cmd.value === 1 ? "开启" : "关闭"}`;
      }
      return { success: true, message: `${deviceName} ${actionDesc}` };
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err?.error || `请求错误 ${res.status}` };
    }
  } catch {
    return { success: false, message: "网络错误" };
  }
}

export async function executeScheduleTask(cmd: ScheduleTaskCommand): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const taskData: any = {
      title: cmd.title,
      action_type: cmd.task_action === "set_led" ? "led" : "relay",
      params: {},
    };

    if (cmd.cron) {
      taskData.cron_expression = cmd.cron;
    } else if (cmd.delay_seconds) {
      taskData.execute_at = Date.now() + cmd.delay_seconds * 1000;
    } else if (cmd.execute_at) {
      taskData.execute_at = cmd.execute_at;
    }

    if (cmd.task_action === "toggle_relay") {
      taskData.device_id = cmd.device;
      taskData.params = { value: cmd.value ?? 1 };
    } else if (cmd.task_action === "set_led") {
      taskData.params = cmd.params || { r: 255, g: 255, b: 255 };
    }

    const res = await fetch("/api/scheduler/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });

    if (res.ok) {
      return { success: true, message: `任务"${cmd.title}"已创建` };
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err?.error || `创建失败 ${res.status}` };
    }
  } catch {
    return { success: false, message: "网络错误" };
  }
}

// ---------------------------------------------------------------------------
// 配额
// ---------------------------------------------------------------------------

export async function fetchQuota(): Promise<QuotaInfo | null> {
  try {
    const res = await fetch("/api/user/settings");
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.quota) return null;
    return { ...data.quota, membership: data.user?.membership };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 音频播放：Omni 架构专用（PCM16 / PCM24 原始流播放）
// 级联架构使用 HTMLAudioElement 播放 MP3，不使用此类。
// ---------------------------------------------------------------------------

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private readonly sampleRate = 24000;
  private activeSources: Set<AudioBufferSourceNode> = new Set();

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate,
      });
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }

  playPCM16(base64: string) {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const sampleCount = Math.floor(bytes.length / 2);
    const float32 = new Float32Array(sampleCount);
    const dataView = new DataView(bytes.buffer);
    for (let i = 0; i < sampleCount; i++) {
      const int16 = dataView.getInt16(i * 2, true);
      float32[i] = int16 / 32768;
    }
    this.playFloat32(float32);
  }

  playPCM24(base64: string) {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const sampleCount = Math.floor(bytes.length / 3);
    const float32 = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      const j = i * 3;
      const b0 = bytes[j];
      const b1 = bytes[j + 1];
      const b2 = bytes[j + 2];
      let int24 = b0 | (b1 << 8) | (b2 << 16);
      if (int24 & 0x800000) int24 |= 0xff000000;
      float32[i] = int24 / 8388608;
    }
    this.playFloat32(float32);
  }

  /** 直接播放 Float32 数据（零拷贝，最高性能） */
  playFloat32Array(float32: Float32Array) {
    this.playFloat32(float32);
  }

  private playFloat32(float32: Float32Array) {
    if (!this.audioContext) return;
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

    // 跟踪活跃 source，clear 时可精确停止
    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
    };
  }

  /** 停止所有播放但不关闭 AudioContext（复用，减少重连延迟） */
  clear() {
    for (const src of this.activeSources) {
      try { src.stop(); } catch {}
    }
    this.activeSources.clear();
    this.nextStartTime = 0;
  }

  stop() {
    this.clear();
  }

  /** 彻底销毁，释放 AudioContext */
  destroy() {
    this.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// ---------------------------------------------------------------------------
// 音频捕获：使用 AudioWorklet（高性能，不阻塞主线程）
// 输出 PCM16 二进制 ArrayBuffer，用于 WebSocket 二进制帧或 base64 编码。
// ---------------------------------------------------------------------------

// AudioWorklet 模块 URL（从 public/ 加载）
const AUDIO_WORKLET_URL = "/audio-processor.js";

export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private ownsStream = false;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  // fallback: ScriptProcessor（AudioWorklet 不可用时）
  private scriptProcessor: ScriptProcessorNode | null = null;
  private isRecording = false;
  private onData: (data: string | ArrayBuffer) => void;
  private readonly targetSampleRate = 16000;
  private readonly binaryMode: boolean;
  private workletReady = false;

  constructor(onData: (data: string | ArrayBuffer) => void, binaryMode = true) {
    this.onData = onData;
    this.binaryMode = binaryMode;
  }

  /**
   * 启动音频采集。优先使用 AudioWorklet（高性能），降级到 ScriptProcessor。
   */
  async start(externalStream?: MediaStream) {
    if (this.isRecording) return;

    if (externalStream) {
      this.mediaStream = externalStream;
      this.ownsStream = false;
    } else {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.ownsStream = true;
    }

    // stop() 可能在 await getUserMedia 期间被调用
    if (!this.mediaStream) return;

    this.audioContext = new AudioContext({ sampleRate: this.targetSampleRate });
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    // stop() 可能在 await resume 期间被调用，导致 audioContext 被关闭置 null
    if (!this.audioContext) return;

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // 尝试使用 AudioWorklet（高性能，不阻塞主线程）
    try {
      await this.audioContext.audioWorklet.addModule(AUDIO_WORKLET_URL);
      this.workletNode = new AudioWorkletNode(this.audioContext, "audio-recorder-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 1,
      });

      this.workletNode.port.onmessage = (e: MessageEvent) => {
        if (!this.isRecording) return;
        const float32: Float32Array = e.data;
        const pcm16 = this.float32ToPCM16(float32);
        if (this.binaryMode) {
          this.onData(pcm16.buffer.slice(0));
        } else {
          this.onData(this.arrayBufferToBase64(pcm16.buffer));
        }
      };

      this.sourceNode.connect(this.workletNode);
      this.workletReady = true;
    } catch {
      // 降级：ScriptProcessor（兼容旧浏览器或 file:// 协议）
      // 注意：start() 是 async，stop() 可能在 await 间隙被调用导致 audioContext=null
      this.workletNode = null;
      if (!this.audioContext) return;
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const pcm16 = this.float32ToPCM16(float32);
        if (this.binaryMode) {
          this.onData(pcm16.buffer.slice(0));
        } else {
          this.onData(this.arrayBufferToBase64(pcm16.buffer));
        }
      };
      this.sourceNode.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
    }

    this.isRecording = true;
  }

  stop() {
    this.isRecording = false;
    if (this.workletNode) {
      try { this.workletNode.port.onmessage = null; this.workletNode.disconnect(); } catch {}
      this.workletNode = null;
    }
    if (this.scriptProcessor) {
      try { this.scriptProcessor.onaudioprocess = null; this.scriptProcessor.disconnect(); } catch {}
      this.scriptProcessor = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.ownsStream && this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
    }
    this.mediaStream = null;
    this.ownsStream = false;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.workletReady = false;
  }

  private float32ToPCM16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16;
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000; // 32KB 分块，避免 String.fromCharCode 栈溢出
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return window.btoa(binary);
  }
}

// ---------------------------------------------------------------------------
// 生成事件 ID
// ---------------------------------------------------------------------------

export const createEventId = () =>
  `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;

// ---------------------------------------------------------------------------
// TTS 文本清洗：移除业务卡片标签，避免朗读 XML 标签和 JSON payload
// ---------------------------------------------------------------------------

/**
 * 需要整块移除（含内部内容）的业务标签。
 * 覆盖项目中所有 AI 可输出的业务卡片标签：
 * TASK_LIST / CHECKPOINT / DECISION / PLAN / CLARIFY / REASONING
 * DEVICE_BENTO / CONTROL_BENTO / MONITOR / VISION_INSPECTION / SPECTRAL
 * SCHEDULED_TASKS / CHART / AUTOMATION_STRATEGY / TOOL_USED
 * ACTION_PROMPT / CAPABILITIES / REPORT_GENERATING / PAST_MEMORY / CONTEXT_COMPRESSED
 * SOURCES
 */
const BLOCK_TAGS = [
  "TASK_LIST", "CHECKPOINT", "DECISION", "PLAN", "CLARIFY", "REASONING",
  "DEVICE_BENTO", "CONTROL_BENTO", "MONITOR", "VISION_INSPECTION", "SPECTRAL",
  "SCHEDULED_TASKS", "CHART", "AUTOMATION_STRATEGY", "TOOL_USED",
  "ACTION_PROMPT", "CAPABILITIES", "REPORT_GENERATING", "PAST_MEMORY",
  "CONTEXT_COMPRESSED", "SOURCES",
].join("|");

/**
 * 流式输入中标签名的逐字符前缀（如 "TA"、"TASK_LI" 等），
 * 防止 TTS 在标签尚未输入完整时朗读半截标签名。
 */
const TAG_TYPING_PREFIXES = [
  // TASK_LIST
  "T","TA","TAS","TASK","TASK_","TASK_L","TASK_LI","TASK_LIS","TASK_LIST",
  // CHECKPOINT
  "C","CH","CHE","CHEC","CHECK","CHECKP","CHECKPO","CHECKPOI","CHECKPOIN","CHECKPOINT",
  // DECISION
  "D","DE","DEC","DECI","DECIS","DECISI","DECISIO","DECISION",
  // PLAN
  "P","PL","PLA","PLAN",
  // CLARIFY
  "CL","CLA","CLAR","CLARI","CLARIF","CLARIFY",
  // REASONING
  "R","RE","REA","REAS","REASO","REASON","REASONI","REASONIN","REASONING",
  // DEVICE_BENTO
  "DEVICE_B","DEVICE_BE","DEVICE_BEN","DEVICE_BENT","DEVICE_BENTO",
  // CONTROL_BENTO
  "CONTROL_B","CONTROL_BE","CONTROL_BEN","CONTROL_BENT","CONTROL_BENTO",
  // MONITOR
  "M","MO","MON","MONI","MONIT","MONITO","MONITOR",
  // VISION_INSPECTION
  "VISION_I","VISION_IN","VISION_INS","VISION_INSP","VISION_INSPE","VISION_INSPEC","VISION_INSPECT","VISION_INSPECTI","VISION_INSPECTIO","VISION_INSPECTION",
  // SPECTRAL
  "SPECTR","SPECTRA","SPECTRAL",
  // SCHEDULED_TASKS
  "SCHEDULED_T","SCHEDULED_TA","SCHEDULED_TAS","SCHEDULED_TASK","SCHEDULED_TASKS",
  // CHART
  "CHAR","CHART",
  // AUTOMATION_STRATEGY
  "AUTOMATION_S","AUTOMATION_ST","AUTOMATION_STR","AUTOMATION_STRA","AUTOMATION_STRAT","AUTOMATION_STRATE","AUTOMATION_STRATEG","AUTOMATION_STRATEGY",
  // TOOL_USED
  "TOOL","TOOL_","TOOL_U","TOOL_US","TOOL_USE","TOOL_USED",
  // ACTION_PROMPT
  "ACTION_P","ACTION_PR","ACTION_PRO","ACTION_PROM","ACTION_PROMP","ACTION_PROMPT",
  // CAPABILITIES
  "CAPAB","CAPABI","CAPABIL","CAPABILI","CAPABILIT","CAPABILITI","CAPABILITIE","CAPABILITIES",
  // REPORT_GENERATING
  "REPORT_G","REPORT_GE","REPORT_GEN","REPORT_GENE","REPORT_GENER","REPORT_GENERA","REPORT_GENERAT","REPORT_GENERATI","REPORT_GENERATIN","REPORT_GENERATING",
  // PAST_MEMORY
  "PAST_M","PAST_ME","PAST_MEM","PAST_MEMO","PAST_MEMOR","PAST_MEMORY",
  // CONTEXT_COMPRESSED
  "CONTEXT_C","CONTEXT_CO","CONTEXT_COM","CONTEXT_COMP","CONTEXT_COMPR","CONTEXT_COMPRE","CONTEXT_COMPRES","CONTEXT_COMPRESS","CONTEXT_COMPRESSE","CONTEXT_COMPRESSED",
  // SOURCES
  "SO","SOU","SOUR","SOURC","SOURCE","SOURCES",
].join("|");

/**
 * 清洗文本用于 TTS 朗读：
 * 1. 移除 markdown 代码块（```...```）
 * 2. 整块移除业务标签及其内容（支持流式未闭合兜底）
 * 3. 移除方括号报告标签 [REPORT:...]...[/REPORT]
 * 4. 移除流式输入中未完整的标签名前缀
 * 5. 剥离通用样式标签本身，保留内部文本
 * 6. 移除残留的尖括号标签
 * 7. IoT 单位归一化（°C→摄氏度, lux→勒克斯 等）
 */
export function stripCardTagsForTts(text: string): string {
  if (!text) return "";
  let s = text;

  // 1. 移除 markdown 代码块
  s = s.replace(/```[\s\S]*?(?:```|$)/g, "");

  // 2. 整块移除业务标签及其内容（含未闭合兜底）
  //    匹配 <TAG>...</TAG> 或 <TAG/> 或 <TAG>...（流式未闭合）
  const blockTagRegex = new RegExp(
    `<\\/?(?:${BLOCK_TAGS})\\b[^>]*\\/?>` + // 自闭合或开标签
    `[\\s\\S]*?(?:<\\/\\s*(?:${BLOCK_TAGS})\\s*>|$)`,
    "gi"
  );
  s = s.replace(blockTagRegex, "");
  // 再次清理残留的开/闭标签（如自闭合标签单独出现）
  s = s.replace(new RegExp(`<(?:${BLOCK_TAGS})\\b[^>]*\\/?>`, "gi"), "");
  s = s.replace(new RegExp(`<\\/\\s*(?:${BLOCK_TAGS})\\s*>`, "gi"), "");

  // 3. 移除方括号报告标签 [REPORT:标题]...[/REPORT]
  s = s.replace(/\[REPORT:[^\]]+\][\s\S]*?(?:\[\/REPORT\]|$)/gi, "");

  // 4. 移除流式输入中未完整的标签名前缀
  s = s.replace(new RegExp(`</?(?:${TAG_TYPING_PREFIXES})$`, "i"), "");

  // 5. 剥离通用样式标签本身，保留内部文本
  s = s.replace(/<\/?(?:b|i|strong|em|p|div|span|h[1-6]|ul|li|ol|br|hr|a|img)[^>]*>/gi, "");

  // 6. 移除残留的尖括号标签
  s = s.replace(/<[^>]+>/g, "");

  // 7. IoT 单位归一化
  s = s
    .replace(/°C/gi, "摄氏度")
    .replace(/\blux\b/gi, "勒克斯")
    .replace(/\bppm\b/gi, "P P M")
    .replace(/CO[2₂]/gi, "二氧化碳")
    .replace(/\bmg\/m3\b/gi, "毫克每立方米")
    .replace(/\bmg\/l\b/gi, "毫克每升")
    .replace(/\bm\/s\b/gi, "米每秒");

  return s.trim();
}

// ---------------------------------------------------------------------------
// WAV 编码：将 MediaRecorder 录制的 Blob（webm/opus）转为 16kHz 单声道 PCM WAV
// DashScope / 百度 / OpenAI 等 ASR 均原生支持 WAV。
// ---------------------------------------------------------------------------

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/** 将 AudioBuffer 编码为 16kHz 单声道 PCM WAV Blob。 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const targetSampleRate = 16000;
  const numChannels = 1;

  // 手动重采样到 16kHz 单声道（线性插值）
  const originalData = buffer.getChannelData(0);
  const ratio = buffer.sampleRate / targetSampleRate;
  const newLength = Math.round(originalData.length / ratio);
  const resampled = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcLow = Math.floor(srcIndex);
    const srcHigh = Math.min(srcLow + 1, originalData.length - 1);
    const fraction = srcIndex - srcLow;
    resampled[i] =
      originalData[srcLow] * (1 - fraction) +
      originalData[srcHigh] * fraction;
  }

  // 编码 WAV
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = resampled.length * bytesPerSample;
  const bufferLength = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // 写入 PCM 采样数据（16-bit little-endian）
  let offset = 44;
  for (let i = 0; i < resampled.length; i++) {
    const s = Math.max(-1, Math.min(1, resampled[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/**
 * 将 Float32Array PCM 数据直接编码为 WAV Blob（零中间步骤，最高性能）。
 * 用于 Silero VAD 的 onSpeechEnd 音频数据 → ASR。
 * @param samples Float32Array PCM 数据（-1.0 ~ 1.0）
 * @param sampleRate 采样率（Silero VAD 默认 16000）
 */
export function float32ToWavBlob(samples: Float32Array, sampleRate = 16000): Blob {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const bufferLength = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // PCM 采样数据
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/**
 * 将 MediaRecorder 录制的 Blob（webm/opus）解码为 WAV Blob。
 * 使用 Web Audio API 解码 → 手动重采样到 16kHz → 编码 PCM WAV。
 * 解码失败时返回原始 Blob（由服务器自行处理）。
 */
export async function convertBlobToWav(inputBlob: Blob): Promise<Blob> {
  const arrayBuffer = await inputBlob.arrayBuffer();
  const AudioCtx =
    window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtx();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBufferToWavBlob(audioBuffer);
  } finally {
    audioCtx.close();
  }
}
