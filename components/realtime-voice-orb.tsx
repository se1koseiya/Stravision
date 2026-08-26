"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Volume2,
  Loader2,
  Lightbulb,
  Fan,
  Droplets,
  Video,
  Calendar,
  ArrowRight,
  Zap,
  Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import BerryOrb from "@/components/smoothui/berry-orb";
import { detectOrbExpression, type OrbExpression } from "@/lib/ai/orb-expression";
import type { DeviceData } from "@/lib/contexts/device-context";
import {
  useVoiceController,
  type VoiceStatus,
  type QuotaInfo,
  type DeviceCommand,
  type NavigateCommand,
  type ScheduleTaskCommand,
  type AICommand,
  type ChatMessage,
} from "@/lib/voice";
import {
  DEVICE_NAMES,
  PAGE_NAMES,
  extractCommands,
} from "@/lib/voice/voice-utils";

// 类型再导出，保持现有 import 兼容（FloatingXiaozhi / top-banner 等依赖）
export type {
  VoiceStatus,
  QuotaInfo,
  DeviceCommand,
  NavigateCommand,
  ScheduleTaskCommand,
  AICommand,
  ChatMessage,
};

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
  systemPrompt?: string;
  voice?: string;
  autoConnect?: boolean;
  deviceData?: DeviceData | null;
  autoExecuteCommands?: boolean;
  bubblePosition?: "bottom" | "top" | "left" | "right";
}

function CommandCard({ command, isUser }: { command: AICommand; isUser: boolean }) {
  const cardBase = isUser
    ? "bg-white/15 border-white/25"
    : "bg-slate-50 border-slate-200";
  const titleColor = isUser ? "text-white/95" : "text-slate-800";
  const subColor = isUser ? "text-white/65" : "text-slate-500";

  if (command.action === "toggle_relay") {
    const deviceName = DEVICE_NAMES[String(command.device)] || `设备${command.device}`;
    const isOn = command.value === 1;
    const Icon =
      command.device === 5
        ? Droplets
        : command.device === 6
        ? Fan
        : command.device === 7 || command.device === 8
        ? Lightbulb
        : Zap;

    const iconBg = isUser
      ? isOn ? "bg-green-400/20 text-green-300" : "bg-white/10 text-white/60"
      : isOn ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400";
    const dotColor = isOn
      ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"
      : isUser ? "bg-white/40" : "bg-slate-300";

    return (
      <div className={cn("mt-2.5 flex items-center gap-3 p-2.5 rounded-xl border shadow-sm overflow-hidden", cardBase)}>
        <div className={cn("flex items-center justify-center w-9 h-9 rounded-full shrink-0", iconBg)}>
          <Icon size={18} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("text-[13px] font-medium truncate", titleColor)}>{deviceName}</div>
          <div className={cn("text-[11px] truncate", subColor)}>{isOn ? "已开启" : "已关闭"}</div>
        </div>
        <div className={cn("w-2 h-2 rounded-full mr-1 shrink-0", dotColor)} />
      </div>
    );
  }

  if (command.action === "set_led") {
    const iconBg = isUser ? "bg-orange-400/20 text-orange-300" : "bg-orange-50 text-orange-500";
    return (
      <div className={cn("mt-2.5 flex items-center gap-3 p-2.5 rounded-xl border shadow-sm overflow-hidden", cardBase)}>
        <div className={cn("flex items-center justify-center w-9 h-9 rounded-full shrink-0", iconBg)}>
          <Lightbulb size={18} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("text-[13px] font-medium truncate", titleColor)}>RGB氛围灯</div>
          <div className={cn("text-[11px] truncate", subColor)}>颜色已调整</div>
        </div>
        <div
          className="w-5 h-5 rounded-full border-2 shadow-sm mr-1 shrink-0"
          style={{
            borderColor: isUser ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.1)",
            backgroundColor: `rgb(${command.r},${command.g},${command.b})`,
          }}
        />
      </div>
    );
  }

  if (command.action === "control_camera" || command.action === "reset_camera") {
    const isReset = command.action === "reset_camera";
    const direction = isReset ? "复位居中" : command.direction === 1 ? "左转" : command.direction === 2 ? "右转" : "停止";
    const iconBg = isUser ? "bg-blue-400/20 text-blue-300" : "bg-blue-50 text-blue-500";
    return (
      <div className={cn("mt-2.5 flex items-center gap-3 p-2.5 rounded-xl border shadow-sm overflow-hidden", cardBase)}>
        <div className={cn("flex items-center justify-center w-9 h-9 rounded-full shrink-0", iconBg)}>
          <Video size={18} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("text-[13px] font-medium truncate", titleColor)}>摄像头云台</div>
          <div className={cn("text-[11px] truncate", subColor)}>正在{direction}</div>
        </div>
      </div>
    );
  }

  if (command.action === "schedule_task") {
    const iconBg = isUser ? "bg-purple-400/20 text-purple-300" : "bg-purple-50 text-purple-500";
    return (
      <div className={cn("mt-2.5 flex items-center gap-3 p-2.5 rounded-xl border shadow-sm overflow-hidden", cardBase)}>
        <div className={cn("flex items-center justify-center w-9 h-9 rounded-full shrink-0", iconBg)}>
          <Calendar size={18} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("text-[13px] font-medium truncate", titleColor)}>定时任务已创建</div>
          <div className={cn("text-[11px] truncate", subColor)}>{command.title}</div>
        </div>
      </div>
    );
  }

  if (command.action === "navigate") {
    const pageName = PAGE_NAMES[command.page] || command.page;
    const iconBg = isUser ? "bg-indigo-400/20 text-indigo-300" : "bg-indigo-50 text-indigo-500";
    const arrowColor = isUser ? "text-white/40" : "text-slate-400";
    return (
      <div className={cn("mt-2.5 flex items-center gap-3 p-2.5 rounded-xl border shadow-sm overflow-hidden", cardBase)}>
        <div className={cn("flex items-center justify-center w-9 h-9 rounded-full shrink-0", iconBg)}>
          <Navigation size={18} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("text-[13px] font-medium truncate", titleColor)}>页面跳转</div>
          <div className={cn("text-[11px] truncate", subColor)}>前往 {pageName}</div>
        </div>
        <ArrowRight size={15} className={cn("mr-1 shrink-0", arrowColor)} />
      </div>
    );
  }

  return null;
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
  instructions,
  systemPrompt,
  voice,
  autoConnect = false,
  deviceData,
  autoExecuteCommands = true,
  bubblePosition = "bottom",
}: RealtimeVoiceOrbProps) {
  // 纯 Omni 语音控制器
  const voiceController = useVoiceController({
    instructions,
    systemPrompt,
    voice,
    autoConnect,
    deviceData,
    autoExecuteCommands,
    onStatusChange,
    onTranscript,
    onError,
    onDeviceCommand,
    onScheduleTask,
    onNavigate,
    onQuotaExceeded,
  });

  const { status, transcript, history, isUserSpeaking, toggleConnection, interrupt } =
    voiceController;

  // ========================================================================
  // 可见消息管理：限制数量 + 自动消失
  // ========================================================================
  const MAX_VISIBLE = 4;
  const AUTO_DISMISS_MS = 12000;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // 当新消息到达时，重置消失计时
  useEffect(() => {
    if (history.length > 0) {
      setDismissed(false);
    }
  }, [history.length]);

  // 当 AI 回复完毕（回到 listening）后开始倒计时自动消失
  useEffect(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    if (status === "listening" && history.length > 0) {
      dismissTimerRef.current = setTimeout(() => {
        setDismissed(true);
      }, AUTO_DISMISS_MS);
    }

    // 断开连接 / 出错时立即清除
    if (status === "idle" || status === "error") {
      setDismissed(true);
    }

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [status, history.length]);

  // 只展示最近 N 条；dismissed 时隐藏历史（但保留当前流式 transcript）
  const visibleHistory = useMemo(() => {
    if (dismissed) return [];
    return history.slice(-MAX_VISIBLE);
  }, [history, dismissed]);

  const orbConfig = useMemo(() => {
    switch (status) {
      case "listening":
        return {
          colors: { bg: "oklch(95% 0.02 30)", c1: "oklch(65% 0.25 30)", c2: "oklch(70% 0.2 50)", c3: "oklch(60% 0.25 0)" },
          duration: 5,
        };
      case "speaking":
        return {
          colors: { bg: "oklch(95% 0.02 140)", c1: "oklch(70% 0.2 140)", c2: "oklch(75% 0.15 160)", c3: "oklch(80% 0.2 130)" },
          duration: 8,
        };
      case "processing":
        return {
          colors: { bg: "oklch(95% 0.02 260)", c1: "oklch(70% 0.15 200)", c2: "oklch(60% 0.2 250)", c3: "oklch(50% 0.2 280)" },
          duration: 2,
        };
      case "connecting":
        return {
          colors: { bg: "oklch(95% 0.02 60)", c1: "oklch(75% 0.2 60)", c2: "oklch(70% 0.15 80)", c3: "oklch(65% 0.2 40)" },
          duration: 3,
        };
      case "error":
        return {
          colors: { bg: "oklch(95% 0.02 0)", c1: "oklch(55% 0.25 0)", c2: "oklch(50% 0.2 20)", c3: "oklch(45% 0.25 350)" },
          duration: 10,
        };
      default:
        return { colors: undefined, duration: 20 };
    }
  }, [status]);

  const statusText = useMemo(() => {
    switch (status) {
      case "connecting":
        return "连接中...";
      case "listening":
        return "正在聆听";
      case "processing":
        return "思考中...";
      case "speaking":
        return "正在回复";
      case "error":
        return "连接错误";
      default:
        return "点击开始";
    }
  }, [status]);

  const isActive = status !== "idle" && status !== "error";

  // 🔥 Berry Orb 表情：跟随语音状态机 + AI 说话内容
  const orbExpression: OrbExpression = useMemo(() => {
    switch (status) {
      case "connecting":
      case "processing":
        return "thinking";
      case "speaking": {
        // 根据 AI 正在说的内容推断情绪（优先当前流式 transcript）
        const lastAi = [...history].reverse().find((m) => m.role === "assistant")?.content ?? "";
        return detectOrbExpression(transcript || lastAi, "speaking");
      }
      case "error":
        return "angry";
      case "listening":
      default:
        return "idle";
    }
  }, [status, transcript, history]);

  return (
    <div className={cn("relative font-sans", className)}>
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
        <div className="absolute inset-0 rounded-full shadow-2xl">
          <BerryOrb size={`${size}px`} isActive={isActive} expression={orbExpression} className="w-full h-full" />
        </div>

        {/* Center Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {status === "connecting" ? (
              <motion.div key="connecting" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                <Loader2 className="w-8 h-8 text-white/80 animate-spin" />
              </motion.div>
            ) : status === "speaking" ? (
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
            className={cn(
              "absolute inset-0 rounded-full border-2",
              status === "listening" && "border-red-400/50",
              status === "processing" && "border-blue-400/50",
              status === "speaking" && "border-green-400/50"
            )}
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </motion.div>

      {/* Status Label */}
      <AnimatePresence>
        {(isActive || status === "error") && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap z-10"
            style={{ top: `${size + 12}px` }}
          >
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border",
                status === "listening" && "bg-red-100/80 text-red-600 border-red-200",
                status === "processing" && "bg-blue-100/80 text-blue-600 border-blue-200",
                status === "speaking" && "bg-green-100/80 text-green-600 border-green-200",
                status === "connecting" && "bg-yellow-100/80 text-yellow-600 border-yellow-200",
                status === "error" && "bg-red-100/90 text-red-700 border-red-300"
              )}
            >
              {statusText}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat History Container */}
      <div
        className={cn(
          "absolute w-[88vw] md:w-[380px] flex flex-col pointer-events-none z-40",
          bubblePosition === "bottom" && "left-0 bottom-full mb-4 justify-end",
          bubblePosition === "top" && "left-0 top-full mt-4 justify-start",
          bubblePosition === "left" && "right-full mr-4 top-0 justify-start",
          bubblePosition === "right" && "left-full ml-4 top-0 justify-start"
        )}
        style={{ maxHeight: "55vh" }}
      >
        {/* 顶部渐隐遮罩：当消息被截断时提供视觉提示 */}
        {visibleHistory.length >= MAX_VISIBLE && (
          <div
            className="absolute top-0 left-0 right-0 h-8 z-10 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, rgba(248,250,252,0.95), transparent)",
              borderRadius: "inherit",
            }}
          />
        )}

        <div className="flex flex-col gap-2.5 overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            {visibleHistory.map((msg) => {
              const { text, commands } = extractCommands(msg.content);
              const isUser = msg.role === "user";
              return (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  className={cn(
                    "flex w-full pointer-events-auto",
                    isUser ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "relative max-w-[85%] px-4 py-2.5 rounded-2xl border shadow-md",
                      isUser
                        ? "bg-[#1677ff] border-[#1677ff] text-white rounded-br-md shadow-[#1677ff]/15"
                        : "bg-white border-slate-200/80 text-slate-800 rounded-bl-md shadow-slate-300/30"
                    )}
                  >
                    <div className="text-[14px] leading-relaxed break-words whitespace-pre-wrap font-normal tracking-normal">
                      {text}
                    </div>
                    {commands.length > 0 && (
                      <div className="mt-1">
                        {commands.map((cmd, i) => (
                          <CommandCard key={i} command={cmd} isUser={isUser} />
                        ))}
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
                layout
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className={cn(
                  "flex w-full pointer-events-auto",
                  isUserSpeaking ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "relative max-w-[85%] px-4 py-2.5 rounded-2xl border shadow-md",
                    isUserSpeaking
                      ? "bg-[#1677ff] border-[#1677ff] text-white rounded-br-md shadow-[#1677ff]/15"
                      : "bg-white border-slate-200/80 text-slate-800 rounded-bl-md shadow-slate-300/30"
                  )}
                >
                  <div className="text-[14px] leading-relaxed break-words whitespace-pre-wrap font-normal tracking-normal flex items-end gap-1">
                    {(() => {
                      const { text: streamText, commands: streamCommands } = extractCommands(transcript);
                      return (
                        <div className="w-full">
                          <span>{streamText}</span>
                          {!isUserSpeaking && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse mb-0.5 ml-0.5" />
                          )}
                          {streamCommands.length > 0 && (
                            <div className="mt-1">
                              {streamCommands.map((cmd, i) => (
                                <CommandCard key={i} command={cmd} isUser={isUserSpeaking} />
                              ))}
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
    </div>
  );
}

export default RealtimeVoiceOrb;
