"use client"

/**
 * 语音输入按钮（本地 sherpa-onnx 识别）
 *
 * 四态：
 *   idle         麦克风（灰）
 *   listening    主题色声波条 + 外圈扩散光环（说明麦克风确实开着）
 *   transcribing 转圈（录音已停、服务端正在转写，通常 300ms 内）
 *   unavailable  置灰禁用，title 说明原因（模型未装 / 环境不支持）
 *
 * 🚨 位置：**右簇、发送键左边**（2026-10-24 用户定）。
 *    原先挂在左簇「＋」旁边，但「说话」和「打字」其实是同一个动作的两个输入方式 ——
 *    手指不该横跨整条工具条才能按到它。
 *    同一次改动里把「语音通话」（实时双向对话，sender 的 onVoiceCall）入口撤掉了：
 *    语音只留这一个，别再并存两个麦克风让人猜哪个是干嘛的。
 */

import { useEffect, useRef } from "react"
import { IconMicrophone } from "@/components/icon"
import { useVoiceInput } from "@/lib/voice/asr/use-voice-input"
import { isDesktopApp } from "@/lib/desktop-mode"
import { toast } from "@/lib/ui/feedback"

export interface VoiceInputButtonProps {
  /** 读取当前草稿 */
  getDraft: () => string
  /** 回写全量草稿 */
  onDraft: (text: string) => void
  darkMode?: boolean
  /** 外部禁用（如消息正在生成中） */
  disabled?: boolean
  size?: number
}

/** 录音中：三根错峰起伏的声波条（纯 CSS 动画，不依赖音频采样） */
function VoiceBars({ color }: { color: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 2, height: 13 }}>
      {[
        { duration: "900ms", delay: "0ms" },
        { duration: "620ms", delay: "120ms" },
        { duration: "820ms", delay: "260ms" },
      ].map((bar, i) => (
        <span
          key={i}
          style={{
            width: 2.5,
            height: 13,
            borderRadius: 2,
            background: color,
            transformOrigin: "center",
            animation: `voice-input-bar ${bar.duration} ease-in-out ${bar.delay} infinite alternate`,
          }}
        />
      ))}
    </span>
  )
}

/** 转写中：一圈缺口旋转（12px，比整颗按钮小，不撑破 28px 的圆） */
function Spinner({ color }: { color: string }) {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 16 16"
      aria-hidden
      style={{ animation: "voice-input-spin 760ms linear infinite", display: "block" }}
    >
      <circle cx="8" cy="8" r="6.2" fill="none" stroke={color} strokeOpacity="0.24" strokeWidth="2" />
      <path d="M8 1.8a6.2 6.2 0 0 1 6.2 6.2" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function VoiceInputButton({
  getDraft,
  onDraft,
  darkMode = false,
  disabled = false,
  size = 28,
}: VoiceInputButtonProps) {
  const lastErrorRef = useRef<string | null>(null)

  const voice = useVoiceInput({
    getDraft,
    onDraft,
    onError: (message) => {
      // 同一条错误只弹一次（连续重试会反复触发）
      if (lastErrorRef.current === message) return
      lastErrorRef.current = message
      toast.error(message)
    },
  })

  useEffect(() => {
    if (!voice.error) lastErrorRef.current = null
  }, [voice.error])

  /* 只对"确定没救"的情况禁用：
     · 模型文件根本没装（跑 pnpm asr:model 才能修）
     其余 ready===false（探活超时、模型加载抖动）**不禁用** —— 点一下会真打 POST，
     服务端会顺手 ensureModel()，抖一下就自愈了；禁死反而要用户刷新页面。
     「环境不支持麦克风」也不再前置禁用了：那需要在 effect 里 setState 判断能力，
     而 React 的 set-state-in-effect 规则不允许；改成点击时实时判断、给明确提示。
     🚨 也不能因为 isTranscribing 就禁用：持续转写时几乎一直有句子在识别，
        那个状态禁掉的话，用户就再也点不到"结束"了。 */
  const hardBlocked = voice.readyReason === "MODEL_NOT_INSTALLED"
  const blocked = disabled || hardBlocked

  const idleColor = darkMode ? "#a1a1aa" : "#71717A"
  const hoverBg = darkMode ? "#323232" : "#f4f4f5"

  /* 聆听/转写态的统一色（2026-10-24 二改：用户要 WorkBuddy 那种「通透、干净」）。
     🚨 从原来的红 #EF4444 换成**主题 emerald 的亮调**：
        · 红在成片绿色系的界面里像"报错"，而且饱和高、显脏；
        · 亮调 emerald（#10B981 / 暗色 #34D399）与输入框外圈那道光环同宗，
          语音态在整页里只有一个颜色，读起来干净。
     底衬 alpha 也压到 0.10/0.16 —— 只要"点亮"，不要"刷一层色块"。 */
  const accent = darkMode ? "#34D399" : "#10B981"
  const activeBg = darkMode ? "rgba(52,211,153,0.16)" : "rgba(16,185,129,0.10)"
  const ringColor = darkMode ? "rgba(52,211,153,0.45)" : "rgba(16,185,129,0.38)"

  const title = voice.isListening
    ? voice.isTranscribing
      ? `正在听 ${voice.elapsed}s · 已上屏 ${voice.segmentCount} 句（停顿约 10s 自动结束）`
      : `正在听 ${voice.elapsed}s · 说完停一下就会转成文字（点这里结束）`
    : voice.readyReason === "MODEL_NOT_INSTALLED"
      ? isDesktopApp()
        ? "语音模型缺失 · 请重新安装最新版桌面端"
        : "语音模型未安装 · 运行 pnpm asr:model"
      : voice.isTranscribing
        ? "正在转写…"
        : voice.ready === false
          ? `语音服务未就绪（${voice.readyReason ?? "未知原因"}）· 点一下重试`
          : "语音输入（持续转写，说完停一下即可）"

  const tint = voice.isListening || voice.isTranscribing ? accent : idleColor

  /* 录音中才铺底；转写中只换图标不铺底（否则一句接一句时底色一直亮着，显脏） */
  const listeningBg = voice.isListening ? activeBg : "transparent"

  return (
    <button
      type="button"
      onClick={() => {
        if (blocked) return
        if (!voice.isListening) lastErrorRef.current = null
        voice.toggle()
      }}
      // 悬停即预热：用户决定按下之前，240MB 模型已经开始加载
      onPointerEnter={() => {
        if (!blocked) voice.warmup()
      }}
      onFocus={() => {
        if (!blocked) voice.warmup()
      }}
      disabled={blocked}
      title={title}
      aria-label={voice.isListening ? "停止语音输入" : "语音输入"}
      className="sender-chip sender-chip--icon"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        padding: 0,
        borderRadius: 999,
        border: "none",
        background: listeningBg,
        color: tint,
        cursor: blocked ? "not-allowed" : "pointer",
        opacity: disabled || hardBlocked ? 0.42 : 1,
        transition: "background 160ms ease, color 160ms ease, opacity 160ms ease",
      }}
      onMouseEnter={(e) => {
        if (!blocked && !voice.isListening) e.currentTarget.style.background = hoverBg
      }}
      onMouseLeave={(e) => {
        if (!blocked && !voice.isListening) e.currentTarget.style.background = "transparent"
      }}
    >
      {/* 外圈扩散：只在聆听时出现，提示"麦克风是开着的" */}
      {voice.isListening && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            border: `1px solid ${ringColor}`,
            animation: "voice-input-ring 1.8s ease-out infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {voice.isListening ? (
        <VoiceBars color={accent} />
      ) : voice.isTranscribing ? (
        <Spinner color={accent} />
      ) : (
        <IconMicrophone size={16} />
      )}
    </button>
  )
}
