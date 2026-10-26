"use client"

import React, { useState, useRef, useEffect } from "react"
import { ConfigProvider, theme } from "antd"
import dynamic from "next/dynamic"
import {
  IconArrowUpSolid,
  IconBrain,
  IconCheck,
  IconDown,
  IconGlobe,
  IconMicrophone,
  IconPlus,
  IconShieldCheck,
} from "@/components/icon"
import { FarmSkillChips, type FarmSkill } from "@/components/ai/farm-skills"
import { EMERALD_ORB_PALETTE as EMERALD_ORB } from "@/components/smoothui/berry-orb"

/* 招呼语左侧那枚「绿色莓小智球」—— 复用项目自带 BerryOrb，只换 emerald 配色。
   ⚠️ 色板统一走 `EMERALD_ORB_PALETTE`（berry-orb.tsx 导出）：2026-10-18 之前这里是
   一份手抄的副本，和 AI 气泡头像各写各的 → 用户看到「一个绿球一个白球」。
   同一套色必须只有一个来源，别再抄第二遍。 */
const BerryOrb = dynamic(() => import("@/components/smoothui/berry-orb"), { ssr: false })

interface MateChatHomeProps {
  onSendMessage: (msg: string) => void
  input: string
  setInput: (value: string) => void
  isLoading: boolean
  darkMode?: boolean
  approvalMode?: "request" | "auto" | "full"
  setApprovalMode?: (mode: "request" | "auto" | "full") => void
  /** 深度思考模式 */
  enableReasoning?: boolean
  setEnableReasoning?: (v: boolean) => void
  /** 联网搜索模式 */
  enableSearch?: boolean
  setEnableSearch?: (v: boolean) => void
  /** 当前是否具备联网搜索工具 */
  hasSearchTool?: boolean
  /** 语音通话入口（由页面注入；不传则不显示麦克风按钮） */
  onOpenVoice?: () => void
  /**
   * ── 是否自带输入卡（2026-10-01「统一 sender」）────────────────────────────
   *
   * `true`（默认，**落地页首屏演示**用）：本组件底部自带一整套输入卡
   *     （textarea + 工具条 + 权限面板 + 语音/发送），自成闭环。
   *
   * `false`（**真实应用 /ai-assistant** 用）：不再自带任何输入框 —— 空态与
   *     会话态**共用同一份** `ChatSenderInput`（挂在 page.tsx 里、恒在底部），
   *     从根上杜绝「两个 sender / 两套外观」。此时本组件只负责欢迎区
   *     （品牌标 + 招呼语 + 推荐问法 + 4 个种植能力入口）。
   */
  composer?: boolean
}

// 权限模式配置 — 与 chat-sender-input 统一
const APPROVAL_MODES = [
  { key: "request" as const, icon: <IconShieldCheck size={14} />, label: "请求批准", desc: "执行设备控制、文件编辑等操作前始终确认" },
  { key: "auto" as const, icon: <IconShieldCheck size={14} />, label: "替我审批", desc: "仅对高风险操作（如删除文件、修改配置）请求确认" },
  { key: "full" as const, icon: <IconShieldCheck size={14} />, label: "完全访问权限", desc: "莓小智可自主执行所有工具操作，无需逐一确认" },
]

// 推荐问法 — 招呼语下方的短句胶囊（对齐参考稿：两行居中、无边框、浅灰底）
const SUGGESTIONS: { key: string; text: string }[] = [
  { key: "s1", text: "大棚湿度 90% 要不要放风？" },
  { key: "s2", text: "白粉病早期怎么判断？" },
  { key: "s3", text: "草莓花期夜间温度控多少？" },
  { key: "s4", text: "什么时候该开补光灯？" },
  { key: "s5", text: "果实着色不匀是什么原因？" },
]

export function MateChatHome({
  onSendMessage,
  input,
  setInput,
  isLoading,
  darkMode = false,
  approvalMode = "request",
  setApprovalMode,
  enableReasoning = false,
  setEnableReasoning,
  enableSearch = false,
  setEnableSearch,
  hasSearchTool = true,
  onOpenVoice,
  composer = true,
}: MateChatHomeProps) {
  const [innerInput, setInnerInput] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const displayValue = input || innerInput
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [focused, setFocused] = useState(false)

  // 招呼语：记忆档案里有「称呼」时用名字打招呼（等记忆接口返回或 500ms 超时再开始打字）
  const DEFAULT_GREETING = "莓园今天怎么样？我来帮你打理。"
  const [greeting, setGreeting] = useState(DEFAULT_GREETING)
  const [greetingReady, setGreetingReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => setGreetingReady(true), 500)
    fetch("/api/ai/memory-profile")
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        const memories: { key?: string; label?: string; value?: string }[] =
          Array.isArray(data?.memories) ? data.memories : []
        const nick = memories.find(m => (m.label === "称呼" || m.key === "nickname") && m.value)?.value
        if (!cancelled && nick) setGreeting(`${nick}，${DEFAULT_GREETING}`)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          clearTimeout(timer)
          setGreetingReady(true)
        }
      })
    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  // 招呼语打字机效果
  const [typed, setTyped] = useState("")
  const [typingDone, setTypingDone] = useState(false)
  useEffect(() => {
    if (!greetingReady) return
    setTyped("")
    setTypingDone(false)
    let i = 0
    const id = setInterval(() => {
      i += 1
      setTyped(greeting.slice(0, i))
      if (i >= greeting.length) {
        clearInterval(id)
        setTypingDone(true)
      }
    }, 80)
    return () => clearInterval(id)
  }, [greeting, greetingReady])

  // 当前选中的权限模式信息
  const currentMode = APPROVAL_MODES.find(m => m.key === approvalMode) ?? APPROVAL_MODES[0]

  const handleSend = () => {
    const text = (input || innerInput).trim()
    if (!text || isLoading) return
    onSendMessage(text)
    setInnerInput("")
    setInput?.("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (val: string) => {
    setInnerInput(val)
    setInput?.(val)
  }

  // 点击能力胶囊：把提示词注入输入框并获得焦点
  //
  // 🚨 2026-10-01 两轮演进后本组件只负责「自带输入卡」那条路径（composer=true，
  //    落地页首屏演示窗）。真实应用 /ai-assistant 传 composer={false}，能力胶囊
  //    已搬进 page.tsx 那份唯一的 ChatSenderInput（用户：「把这些放到 sender」），
  //    本组件不再渲染它们 —— 所以下面只需处理自带 textarea 的焦点。
  const focusUnifiedSender = () => {
    if (composer) {
      inputRef.current?.focus()
      const el = inputRef.current
      if (el) {
        const len = el.value.length
        el.setSelectionRange(len, len)
      }
      return
    }
    requestAnimationFrame(() => {
      const ta = document.querySelector<HTMLTextAreaElement>(".ant-sender textarea")
      if (!ta) return
      ta.focus()
      const len = ta.value.length
      try { ta.setSelectionRange(len, len) } catch {}
    })
  }

  const handleSkillAction = (skill: FarmSkill) => {
    handleChange(skill.prompt)
    requestAnimationFrame(focusUnifiedSender)
  }

  // 推荐问法：直接当作消息发出（参考稿里点了就提问）
  const handleSuggestion = (text: string) => {
    if (isLoading) return
    setInnerInput("")
    setInput?.("")
    onSendMessage(text)
  }

  const adjustHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + "px"
    }
  }

  /* ---------------- 主题色板 ---------------- */
  const C = darkMode
    ? {
        title: "#fafafa",
        chipBg: "rgba(255,255,255,0.055)",
        chipBgHover: "rgba(255,255,255,0.10)",
        chipText: "#d4d4d8",
        cardBg: "rgba(22,22,26,0.86)",
        cardBorder: focused ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.10)",
        cardShadow: focused
          ? "0 6px 28px rgba(0,0,0,0.45), 0 0 0 3px rgba(5,150,105,0.12)"
          : "0 6px 24px rgba(0,0,0,0.34)",
        placeholder: "#6b6b74",
        toolText: "#a1a1aa",
        toolHover: "rgba(255,255,255,0.08)",
        toolOnBg: "rgba(0,148,86,0.20)",
        divider: "rgba(255,255,255,0.09)",
        sendOff: "rgba(255,255,255,0.10)",
        sendOffIcon: "#6b6b74",
        note: "#6b6b74",
      }
    : {
        title: "#18181b",
        chipBg: "rgba(24,24,27,0.05)",
        chipBgHover: "rgba(24,24,27,0.085)",
        chipText: "#3F3F46",
        cardBg: "rgba(255,255,255,0.96)",
        cardBorder: focused ? "rgba(5,150,105,0.42)" : "rgba(24,24,27,0.085)",
        cardShadow: focused
          ? "0 10px 30px rgba(15,23,42,0.08), 0 0 0 3px rgba(5,150,105,0.09)"
          : "0 6px 22px rgba(15,23,42,0.055)",
        placeholder: "#a1a1aa",
        toolText: "#52525b",
        toolHover: "rgba(24,24,27,0.05)",
        toolOnBg: "rgba(0,148,86,0.10)",
        divider: "rgba(24,24,27,0.08)",
        sendOff: "rgba(24,24,27,0.07)",
        sendOffIcon: "#a1a1aa",
        note: "#a1a1aa",
      }

  const ACCENT = darkMode ? "#34D399" : "#059669"

  const pillStyle = (on: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    height: 30,
    padding: "5px 9px",
    borderRadius: 8,
    border: "none",
    background: on ? C.toolOnBg : "transparent",
    color: on ? ACCENT : C.toolText,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 400,
    whiteSpace: "nowrap",
    transition: "background 0.15s, color 0.15s",
    flexShrink: 0,
  })

  return (
    <ConfigProvider theme={{ algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <style>{`
        .home-welcome-textarea:focus,
        .home-welcome-textarea:focus-visible,
        .home-welcome-textarea:focus-within {
          outline: none !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }
        @keyframes approval-panel-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .approval-panel-animate {
          animation: approval-panel-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes type-blink {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
        @keyframes hero-rise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-rise { animation: hero-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .hero-chip-press:active { transform: scale(0.975); }
      `}</style>

      <div
        data-hero-root
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          /* 透出对话区背景层（PixelBlast + 渐变）—— 这里必须是透明 */
          background: "transparent",
        }}
      >
        {/* ===== 上区：品牌标 + 招呼语 + 推荐问法（在剩余空间里垂直居中） ===== */}
        <div
          data-lenis-prevent
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "40px 24px 20px",
          }}
        >
          {/* 2026-10-14：随对话区加宽（960 → 1120）同步放宽，保持「欢迎区比输入卡
              略窄一点」的既有收进关系（原 880 : 960，现 1000 : 1120）。 */}
          <div style={{ width: "100%", maxWidth: 1000, margin: "0 auto" }}>
            {/* ---- 1. 绿色莓小智球 + 招呼语（居中） ---- */}
            <div
              data-hero-brand
              className="hero-rise"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                marginBottom: 26,
              }}
            >
              {/* GrokBot 球体：32px + 视觉外扩，实际占位 40。
                  ⚠️ `variant="orb"` 不能省：BerryOrb 默认形态已改成吉祥物短片，
                  而短片**不读 palette**（颜色烘焙在视频里）—— 2026-10-18 之前这里
                  传的是 EMERALD_ORB 想拿绿球，实际渲染出一枚**红色**草莓静态海报
                  （32px < clipTooSmall 门槛 40，连动画都没有）。
                  GrokOrbBody 是 SVG + rAF：palette 真正生效、且无任何尺寸门控。 */}
              <div style={{ flexShrink: 0, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BerryOrb variant="orb" size="32px" theme={darkMode ? "dark" : "light"} palette={EMERALD_ORB} />
              </div>

              {/* 招呼语 —— 「隐形量宽 + 绝对定位覆盖」保证打字时整行不抖动 */}
              <h1
                style={{
                  position: "relative",
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: -0.3,
                  lineHeight: 1.35,
                  color: C.title,
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                <span style={{ visibility: "hidden" }} aria-hidden>{greeting}</span>
                <span style={{ position: "absolute", inset: 0 }}>
                  {typed}
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: "1em",
                      marginLeft: 2,
                      verticalAlign: "-0.15em",
                      background: C.title,
                      animation: typingDone ? "none" : "type-blink 0.9s steps(1) infinite",
                      opacity: typingDone ? 0 : 1,
                    }}
                  />
                </span>
              </h1>
            </div>

            {/* ---- 2. 推荐问法（两行居中胶囊） ---- */}
            <div
              data-hero-suggestions
              className="hero-rise"
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 10,
                animationDelay: "0.08s",
              }}
            >
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleSuggestion(s.text)}
                  disabled={isLoading}
                  className="hero-chip-press"
                  style={{
                    padding: "9px 16px",
                    borderRadius: 999,
                    border: "none",
                    background: C.chipBg,
                    color: C.chipText,
                    fontSize: 13.5,
                    fontWeight: 400,
                    lineHeight: 1.3,
                    cursor: isLoading ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    transition: "background 0.18s, transform 0.12s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.chipBgHover }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = C.chipBg }}
                >
                  {s.text}
                </button>
              ))}
            </div>

                      </div>
        </div>

        {/* ===== 下区：输入卡片 + 免责 =====
             🚨 仅当 composer=true（落地页首屏那台「应用演示窗」）才渲染。
             真实应用 /ai-assistant 传 composer={false}，输入框由 page.tsx 里
             那份唯一的 ChatSenderInput 承担 —— 空态/会话态共用同一个实例。 */}
        {composer && (
        <>
        <div
          style={{
            flexShrink: 0,
            width: "100%",
            /* 2026-10-14：随对话区加宽同步（928 → 1088），与上区 1000 的
               既有间距关系保持一致。注意：仅落地页演示窗（composer=true）走到，
               真实 /ai-assistant 由 ChatSenderInput 承担。 */
            maxWidth: 1088,
            margin: "0 auto",
            padding: "0 24px 14px",
          }}
        >
          <div
            data-hero-card
            className="hero-rise"
            style={{
              borderRadius: 18,
              padding: "14px 16px 10px",
              background: C.cardBg,
              border: `1px solid ${C.cardBorder}`,
              boxShadow: C.cardShadow,
              backdropFilter: "blur(calc(14px * var(--dc-mat-scale, 1)))",
              WebkitBackdropFilter: "blur(calc(14px * var(--dc-mat-scale, 1)))",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              animationDelay: "0.14s",
            }}
            onFocusCapture={() => setFocused(true)}
            onBlurCapture={() => setFocused(false)}
          >
            {/* 文本输入区 */}
            <textarea
              ref={inputRef}
              className="home-welcome-textarea"
              value={displayValue}
              onChange={(e) => { handleChange(e.target.value); adjustHeight() }}
              onKeyDown={handleKeyDown}
              placeholder="发送消息"
              rows={1}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: 15,
                color: C.title,
                background: "transparent",
                lineHeight: 1.6,
                fontFamily: "inherit",
                minHeight: 30,
                maxHeight: 140,
                overflowY: "auto",
                padding: "4px 2px 2px",
              }}
            />
            <style>{`
              .home-welcome-textarea::placeholder { color: ${C.placeholder}; }
            `}</style>

            {/* ---- 工具条 ---- */}
            <div
              data-hero-toolbar
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginTop: 8,
                flexWrap: "wrap",
              }}
            >
              {/* 左：附件 | 思考 / 研究 | 能力胶囊 */}
              <div style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", minWidth: 0 }}>
                <button
                  title="更多选项"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 30, height: 30, borderRadius: 8,
                    border: "none", background: "transparent",
                    cursor: "pointer", color: C.toolText,
                    flexShrink: 0, transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.toolHover }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                >
                  <IconPlus size={16} />
                </button>

                <span style={{ width: 1, height: 16, background: C.divider, margin: "0 6px", flexShrink: 0 }} />

                {setEnableReasoning && (
                  <button
                    onClick={() => setEnableReasoning(!enableReasoning)}
                    title="深度思考：让模型进行更深入的推理"
                    style={pillStyle(enableReasoning)}
                    onMouseEnter={(e) => { if (!enableReasoning) e.currentTarget.style.background = C.toolHover }}
                    onMouseLeave={(e) => { if (!enableReasoning) e.currentTarget.style.background = "transparent" }}
                  >
                    <IconBrain size={14} strokeWidth={2} />
                    <span>思考</span>
                  </button>
                )}

                {setEnableSearch && hasSearchTool && (
                  <button
                    onClick={() => setEnableSearch(!enableSearch)}
                    title="联网搜索：让模型检索最新信息"
                    style={pillStyle(enableSearch)}
                    onMouseEnter={(e) => { if (!enableSearch) e.currentTarget.style.background = C.toolHover }}
                    onMouseLeave={(e) => { if (!enableSearch) e.currentTarget.style.background = "transparent" }}
                  >
                    <IconGlobe size={14} strokeWidth={2} />
                    <span>研究</span>
                  </button>
                )}

                {/* 种植能力胶囊（4 条）—— 与 /ai-assistant 的 sender 工具条**同源**
                    （components/ai/farm-skills.tsx 的 FARM_SKILLS + FarmSkillChips），
                    保证两处提示词永不发散。落地页这张卡够宽，4 条全上、不裁。 */}
                <FarmSkillChips darkMode={darkMode} disabled={isLoading} onPick={handleSkillAction} />
              </div>

              {/* 右：权限模式 + 语音 + 发送 */}
              <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                {setApprovalMode && (
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => setApprovalOpen(!approvalOpen)}
                      title="应如何批准操作？"
                      style={pillStyle(false)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.toolHover }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                    >
                      <IconShieldCheck size={14} />
                      <span>{currentMode.label}</span>
                      <IconDown size={12} style={{ opacity: 0.65 }} />
                    </button>

                    {approvalOpen && (
                      <div
                        className="approval-panel-animate"
                        onMouseDown={(e) => e.preventDefault()}
                        style={{
                          position: "absolute",
                          bottom: "calc(100% + 8px)",
                          right: 0,
                          zIndex: 1000,
                          width: 320,
                          borderRadius: 16,
                          padding: "16px 12px 10px",
                          background: darkMode ? "#27272a" : "#fff",
                          border: darkMode ? "1px solid #3f3f46" : "1px solid #e4e4e7",
                          boxShadow: darkMode
                            ? "0 20px 50px rgba(0,0,0,0.5)"
                            : "0 10px 40px rgba(0,0,0,0.15)",
                          transformOrigin: "bottom right",
                        }}
                      >
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          marginBottom: 14, padding: "0 6px",
                        }}>
                          <span style={{ fontSize: 13.5, fontWeight: 500, color: darkMode ? "#d4d4d8" : "#3F3F46" }}>
                            应如何批准 BerryZ 操作？
                          </span>
                          <button
                            onClick={() => window.open("#", "_blank")}
                            style={{
                              border: "none", background: "transparent", cursor: "pointer",
                              fontSize: 12, color: darkMode ? "#a1a1aa" : "#71717A",
                              textDecoration: "underline",
                            }}
                          >
                            了解更多
                          </button>
                        </div>
                        {APPROVAL_MODES.map((mode) => {
                          const isActive = approvalMode === mode.key
                          return (
                            <button
                              key={mode.key}
                              onClick={() => { setApprovalMode(mode.key); setApprovalOpen(false) }}
                              style={{
                                display: "flex", alignItems: "flex-start", gap: 10,
                                width: "100%", padding: "9px 10px", borderRadius: 10,
                                border: "none",
                                background: isActive ? (darkMode ? "#3f3f46" : "#e4e4e7") : "transparent",
                                cursor: "pointer", marginBottom: 2,
                                transition: "background 0.2s ease",
                              }}
                            >
                              <span style={{ marginTop: 1.5, flexShrink: 0, color: darkMode ? "#a1a1aa" : "#71717A" }}>
                                {React.cloneElement(mode.icon as React.ReactElement<any>, { size: 17 })}
                              </span>
                              <div style={{ flex: 1, textAlign: "left" }}>
                                <div style={{
                                  fontSize: 13.5, fontWeight: 500,
                                  color: darkMode ? "#e4e4e7" : "#18181b", lineHeight: 1.35,
                                }}>
                                  {mode.label}
                                </div>
                                <div style={{
                                  fontSize: 11.5, marginTop: 2,
                                  color: darkMode ? "#71717a" : "#71717A", lineHeight: 1.4,
                                }}>
                                  {mode.desc}
                                </div>
                              </div>
                              <span style={{
                                flexShrink: 0, marginTop: 2, width: 16,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                opacity: isActive ? 1 : 0,
                              }}>
                                {isActive && <IconCheck size={16} style={{ color: darkMode ? "#e4e4e7" : "#3F3F46" }} />}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {onOpenVoice && (
                  <button
                    onClick={onOpenVoice}
                    title="语音通话"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 30, height: 30, borderRadius: 8, border: "none",
                      background: "transparent", cursor: "pointer",
                      color: C.toolText, flexShrink: 0, transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.toolHover }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                  >
                    <IconMicrophone size={16} />
                  </button>
                )}

                <button
                  onClick={handleSend}
                  disabled={!displayValue.trim() || isLoading}
                  title="发送"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 32, height: 32, borderRadius: "50%",
                    border: "none", marginLeft: 4, flexShrink: 0,
                    background: displayValue.trim() ? ACCENT : C.sendOff,
                    cursor: displayValue.trim() ? "pointer" : "not-allowed",
                    color: displayValue.trim() ? "#fff" : C.sendOffIcon,
                    transition: "all 0.2s",
                  }}
                >
                  <IconArrowUpSolid size={16} strokeWidth={2.25} />
                </button>
              </div>
            </div>
          </div>

          {/* 免责说明 */}
          <div
            style={{
              marginTop: 10,
              textAlign: "center",
              fontSize: 11.5,
              color: C.note,
              letterSpacing: 0.2,
            }}
          >
            内容由 AI 生成，仅供参考
          </div>
        </div>
        </>
        )}
      </div>
    </ConfigProvider>
  )
}
