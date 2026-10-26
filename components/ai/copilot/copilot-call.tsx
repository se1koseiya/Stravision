"use client";

/**
 * CopilotCall —— Copilot 的「打电话」态（语音 = Copilot 的一种状态，不是另一个助手）
 *
 * 架构：纯 Omni（qwen3-omni-flash 实时全模态），ASR+LLM+TTS 一体化：
 *   麦克风 PCM16 → WS(ws-proxy 3002) → DashScope Realtime → 语音播报
 *   API key 在服务端 env(DASHSCOPE_API_KEY)，前端零配置。
 * 通话期间由 Omni 直管理解与回答（低延迟、可打断），设备命令复用 onDeviceCommand
 * （能力与原 FloatingXiaozhi 完全一致，只是不再有自己的球）。
 *
 * 挂断后：通话记录回写进当前会话（appendMessages），之后继续用文字聊同一条会话。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useVoiceController } from "@/lib/voice";
import type {
  DeviceCommand,
  NavigateCommand,
  ScheduleTaskCommand,
  VoiceStatus,
} from "@/lib/voice";
import type { DeviceData } from "@/lib/contexts/device-context";
import { IconMicrophone, IconPhoneOff } from "@/components/icon";
import { useMaterialCss } from "@/components/device/immersive-card";
import type { Message } from "@/app/ai-assistant/types";

export type CallState = "idle" | "connecting" | "active";

export interface CallTurn {
  role: "user" | "assistant";
  text: string;
}

const CALL_INSTRUCTIONS = `你是莓小智，莓界智慧农业平台的大棚智能管家，现在正在和用户「通电话」。

## 语气
- 口语化、简短，像打电话一样一轮一轮说，不要输出 Markdown、不要列长清单
- 中文，每轮控制在 2~3 句话

## 能力
- 解读实时环境数据、给出种植建议
- 控制设备：水泵(Relay5)、风扇(Relay6)、植物全光谱补光灯(Relay7)、光照补光灯(Relay8)

## 设备命令
需要控制设备时在回复末尾输出 JSON，例如 {"action":"toggle_relay","device":6,"value":1}
朗读时必须跳过 JSON 部分，只说自然语言。`;

export interface UseCopilotCallOptions {
  deviceData?: DeviceData | null;
  onDeviceCommand?: (command: DeviceCommand) => void;
  onScheduleTask?: (task: ScheduleTaskCommand) => void;
  onNavigate?: (command: NavigateCommand) => void;
  /** 挂断后把通话记录回写进会话 */
  onHangUp?: (turns: CallTurn[]) => void;
}

export function useCopilotCall(options: UseCopilotCallOptions) {
  const { deviceData, onDeviceCommand, onScheduleTask, onNavigate, onHangUp } = options;

  const [callState, setCallState] = useState<CallState>("idle");
  const [seconds, setSeconds] = useState(0);
  const turnsRef = useRef<CallTurn[]>([]);
  const [live, setLive] = useState<{ text: string; isUser: boolean }>({ text: "", isUser: true });

  const voice = useVoiceController({
    instructions: CALL_INSTRUCTIONS,
    deviceData,
    autoExecuteCommands: true,
    onStatusChange: (s: VoiceStatus) => {
      if (s === "listening" || s === "processing" || s === "speaking") {
        setCallState("active");
      } else if (s === "connecting") {
        setCallState("connecting");
      } else if (s === "idle") {
        setCallState("idle");
        setSeconds(0);
      }
    },
    onTranscript: (text, isUser) => {
      setLive({ text, isUser });
      const trimmed = text.trim();
      if (!trimmed) return;
      const last = turnsRef.current[turnsRef.current.length - 1];
      if (last && last.role === (isUser ? "user" : "assistant")) {
        last.text = trimmed;
      } else {
        turnsRef.current.push({ role: isUser ? "user" : "assistant", text: trimmed });
      }
    },
    onDeviceCommand: cmd => onDeviceCommand?.(cmd),
    onScheduleTask: task => onScheduleTask?.(task),
    onNavigate: cmd => onNavigate?.(cmd),
  });

  /* 通话计时 */
  useEffect(() => {
    if (callState !== "active") return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [callState]);

  const start = useCallback(async () => {
    turnsRef.current = [];
    setLive({ text: "", isUser: true });
    setSeconds(0);
    setCallState("connecting");
    await voice.connect();
    setCallState("active");
  }, [voice]);

  const hangUp = useCallback(() => {
    voice.disconnect();
    setCallState("idle");
    setSeconds(0);
    setLive({ text: "", isUser: true });
    const turns = turnsRef.current.filter(t => t.text.trim());
    if (turns.length) onHangUp?.(turns);
    turnsRef.current = [];
  }, [voice, onHangUp]);

  return { callState, seconds, live, start, hangUp, voice, muted: !!voice.muted, setMuted: voice.setMuted };
}

/** 通话记录 → 会话消息（挂断回写，保证打字和通话是同一条会话） */
export function callTurnsToMessages(turns: CallTurn[]): Message[] {
  const head = {
    role: "assistant",
    content: `📞 语音通话记录（${turns.filter(t => t.role === "user").length} 轮）`,
  } as Message;
  const body = turns.map(
    t =>
      ({
        role: t.role,
        content: t.role === "user" ? `🎙️ ${t.text}` : t.text,
      }) as Message
  );
  return [head, ...body];
}


/**
 * 通话态底部条 —— HDS 沉浸光感 THICK 档（官方定义 = 聚合面板 / 工具条：
 * 承载多行内容、需要更实的底保证可读）。
 *
 * 为什么是 THICK 而不是手写玻璃：
 *   这里原先写死 rgba(255,255,255,.62) + blur(18px) saturate(160%)，与 dashboard / monitor /
 *   device-control 的共享材质各写一套 —— 同一份「沉浸式」语义分裂成了五种值。
 *   现在统一读 components/device/material-css.ts，自适应降档（<html data-mat-level>）也能盖到这里。
 *   蓝色柔光（「正在聆听」的氛围光）保留在材质层**之上**：它是通话态的表情，不是材质的一部分。
 */
export function CopilotCallFooter({
  dark,
  isUser,
  muted,
  onToggleMute,
  onHangUp,
}: {
  dark: boolean;
  isUser: boolean;
  muted?: boolean;
  onToggleMute?: () => void;
  onHangUp: () => void;
}) {
  /* HDS 沉浸光感：保证材质 CSS 在文档中（幂等；app/layout 已全局注入一份）。
     通话底条也可能被其它宿主（独立的语音入口）渲染，不能假设宿主已经挂过。 */
  useMaterialCss()

  return (
    <div
      data-copilot-call-footer
      className="dc-mat dc-mat--thick"
      /* ⚠️ background / border / backdropFilter / box-shadow 一律交给材质：
         inline 的优先级高于类规则，任一条写死都会把对应的材质属性整条盖掉，
         表现为「类挂上了但没效果」，而 CSS 不报错。这里只留盒模型与裁切。 */
      style={{
        flexShrink: 0,
        position: "relative",
        margin: "4px 12px 12px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: 18,
      }}
    >
      {/* 底部蓝色柔光（正在聆听的氛围光） */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          bottom: -60,
          transform: "translateX(-50%)",
          width: 380,
          height: 130,
          borderRadius: "50%",
          background: dark
            ? "radial-gradient(closest-side, rgba(59,130,246,0.40), rgba(59,130,246,0.10) 55%, transparent 75%)"
            : "radial-gradient(closest-side, rgba(96,165,250,0.50), rgba(147,197,253,0.18) 55%, transparent 75%)",
          filter: "blur(8px)",
          pointerEvents: "none",
        }}
      />

      {/* 左：静音（玻璃圆钮） */}
      <motion.button
        type="button"
        title={muted ? "取消静音" : "静音"}
        onClick={onToggleMute}
        whileTap={{ scale: 0.9 }}
        style={{
          position: "relative",
          zIndex: 1,
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          flexShrink: 0,
          ...(muted
            ? {
                background: "rgba(239,68,68,0.14)",
                color: "#ef4444",
              }
            : dark
              ? { background: "rgba(255,255,255,0.10)", color: "#d4d4d8" }
              : { background: "rgba(255,255,255,0.85)", color: "#52525b" }),
        }}
      >
        <IconMicrophone size={15} strokeWidth={2} />
      </motion.button>

      {/* 中：点阵声波（中间高、两端低；用户说话起伏大，AI 说话平缓呼吸） */}
      <div
        data-copilot-call-wave
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          maxWidth: 180,
          margin: "0 14px",
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
      >
        {Array.from({ length: 15 }).map((_, i) => {
          const env = 1 - Math.abs(i - 7) / 8;
          return (
            <motion.span
              key={i}
              style={{
                width: 3.5,
                borderRadius: 2,
                display: "block",
                background: isUser
                  ? dark
                    ? "#a1a1aa"
                    : "#52525b"
                  : dark
                    ? "#6ee7b7"
                    : "#10b981",
              }}
              animate={
                muted
                  ? { height: 4, opacity: 0.35 }
                  : isUser
                    ? { height: [4, 4 + 14 * env, 4 + 5 * env, 4 + 12 * env, 4], opacity: 1 }
                    : { height: [4, 4 + 6 * env, 4], opacity: [0.55, 0.95, 0.55] }
              }
              transition={
                muted
                  ? { duration: 0.25 }
                  : isUser
                    ? { duration: 0.85, repeat: Infinity, ease: "easeInOut", delay: i * 0.045 }
                    : { duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.06 }
              }
            />
          );
        })}
      </div>

      {/* 右：挂断（红圆钮） */}
      <motion.button
        type="button"
        title="挂断"
        onClick={onHangUp}
        whileTap={{ scale: 0.9 }}
        style={{
          position: "relative",
          zIndex: 1,
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "none",
          background: "rgba(239,68,68,0.92)",
          color: "#fff",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          flexShrink: 0,
          boxShadow: "0 2px 12px rgba(239,68,68,0.45)",
        }}
      >
        <IconPhoneOff size={15} strokeWidth={2} />
      </motion.button>
    </div>
  );
}
