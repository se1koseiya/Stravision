/**
 * 语音助手共享类型定义
 *
 * 同时被级联架构（ASR-LLM-TTS）与 Omni 一体化架构使用，
 * 保证两种架构对上层 UI 暴露完全一致的契约，可无缝切换。
 */

import type { DeviceData } from "@/lib/contexts/device-context";

/** 语音会话状态机 */
export type VoiceStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

/** 用户配额信息 */
export interface QuotaInfo {
  daily_limit: number;
  daily_usage: number;
  balance: number;
  can_use: boolean;
  membership?: "free" | "pro" | "plus";
}

/** 设备控制命令 */
export interface DeviceCommand {
  action: "toggle_relay" | "set_led" | "control_camera" | "reset_camera";
  device?: number;
  value?: number;
  r?: number;
  g?: number;
  b?: number;
  direction?: number; // 摄像头云台方向: 0=停止, 1=左移, 2=右移
}

/** 页面导航命令 */
export interface NavigateCommand {
  action: "navigate";
  page: "dashboard" | "monitor" | "device-control" | "ai-assistant" | "profile" | "settings";
}

/** 定时任务命令 */
export interface ScheduleTaskCommand {
  action: "schedule_task";
  title: string;
  cron?: string;
  execute_at?: number;
  delay_seconds?: number;
  task_action: "toggle_relay" | "set_led";
  device?: number;
  value?: number;
  params?: { r?: number; g?: number; b?: number };
}

export type AICommand = DeviceCommand | ScheduleTaskCommand | NavigateCommand;

/** 聊天消息 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/**
 * 语音控制器统一契约。
 * 无论底层是级联架构还是 Omni 架构，UI 层只依赖此接口，
 * 从而实现架构的可配置切换。
 */
export interface VoiceController {
  /** 当前状态 */
  status: VoiceStatus;
  /** 当前流式文本（用户正在说 / AI 正在回） */
  transcript: string;
  /** 完整对话历史 */
  history: ChatMessage[];
  /** 当前 transcript 是否来自用户 */
  isUserSpeaking: boolean;
  /** 是否正在执行设备命令 */
  isExecutingCommand: boolean;
  /** 配额信息 */
  quotaInfo: QuotaInfo | null;
  /** 连接 / 开始会话 */
  connect: () => Promise<void>;
  /** 断开 / 结束会话 */
  disconnect: () => void;
  /** 切换连接状态 */
  toggleConnection: () => Promise<void>;
  /** 打断当前 AI 回复 */
  interrupt: () => void;
  /** 刷新配额 */
  refreshQuota: () => Promise<QuotaInfo | null>;
  /** 通话静音（丢弃上行麦克风音频，下行播放不受影响）；旧实现可能未提供 */
  muted?: boolean;
  setMuted?: (v: boolean) => void;
}

/** 两个架构 Hook 共享的入参 */
export interface VoiceControllerOptions {
  /** 系统指令（默认角色提示词） */
  instructions?: string;
  /** 显式系统提示词，优先于 instructions */
  systemPrompt?: string;
  /** TTS 音色 */
  voice?: string;
  /** 是否自动连接 */
  autoConnect?: boolean;
  /** 实时设备数据，用于构建上下文 */
  deviceData?: DeviceData | null;
  /** 是否自动执行 AI 输出的命令 */
  autoExecuteCommands?: boolean;

  // ---- 事件回调 ----
  onStatusChange?: (status: VoiceStatus) => void;
  onTranscript?: (text: string, isUser: boolean) => void;
  onError?: (error: string) => void;
  onDeviceCommand?: (command: DeviceCommand) => void;
  onScheduleTask?: (task: ScheduleTaskCommand) => void;
  onNavigate?: (command: NavigateCommand) => void;
  onQuotaExceeded?: () => void;
}
