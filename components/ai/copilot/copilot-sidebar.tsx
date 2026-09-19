"use client"

/**
 * CopilotSidebar —— 业务页右侧 AI 助手侧栏
 *
 * 【复用清单】（2026-09-19 用户明确要求：不要重复造轮子）
 *  - 消息列表   → app/ai-assistant/_components/chat-bubble-list.tsx
 *  - 消息渲染   → chat-message-renderer.tsx（经 rendererProps，markdown/工具卡/思考链全支持）
 *  - 输入框     → chat-sender-input.tsx（附件/技能/审批模式全套）
 *  - 会话协议   → ai-last-session-id + /api/sessions
 *  - 对话后端   → /api/chat（请求体对齐主助手，设备工具链可用）
 *
 * 【2026-09-19 欢迎页二次改版】参考阿里云在线服务弹窗（用户指定参考图）：
 *  - 顶部 4px 品牌渐变条；顶栏 = 模型选择器 + 窗口控制（新对话/最小化/窗口放大/全屏/关闭）
 *  - 空态欢迎页：可关闭提示条 + BerryOrb 动画头像（components/smoothui/berry-orb）
 *    +「您好，欢迎使用 / 莓小智」渐变标题 + 推荐问题白卡行（右箭头）+ 跳 AI 助手行 + 三个彩色快捷入口
 *  - 背景 = 蓝色拟态磨砂玻璃（光斑层 + backdrop-filter 玻璃卡，用户定稿）
 *  - 窗口放大：400px ↔ 720px（欢迎内容列限宽 460 居中，对齐参考图放大态版式）
 *  - 全屏 = 跳转 /ai-assistant（完整对话页）；最小化 = 收起为悬浮球
 *
 * 页面差异（欢迎词/推荐问题）只在 page-configs.ts 配置。
 * 本文件只负责：窗口定位与尺寸态、顶栏、空态欢迎页、把三件套拼起来。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { ConfigProvider, theme as antdTheme } from "antd"
import { toast } from "sonner"
import { ChatBubbleList } from "@/app/ai-assistant/_components/chat-bubble-list"
import { ChatSenderInput } from "@/app/ai-assistant/_components/chat-sender-input"
import type { Message } from "@/app/ai-assistant/types"
import { DynamicModelSelector } from "@/components/ai/dynamic-model-selector"
import BerryOrb from "@/components/smoothui/berry-orb"
import {
  IconArrowRight,
  IconClose,
  IconFileText,
  IconFullScreen,
  IconFullScreenOne,
  IconHelp,
  IconMagic,
  IconMinus,
  IconRefresh,
  IconStar,
  type IconProps,
} from "@/components/icon"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { COPILOT_NARROW_CSS } from "./narrow-styles"
import { COPILOT_PAGE_CONFIGS, type CopilotPageKey } from "./page-configs"
import { useCopilotChat } from "./use-copilot-chat"

export interface CopilotSidebarProps {
  /** 业务页标识 → 欢迎词/推荐问题 */
  pageKey: CopilotPageKey
  /** 页面实时上下文（注入 systemPrompt） */
  context?: () => string | null | undefined
  /** 业务页实时设备数据（AI 工具链 + 回复内设备卡片渲染用） */
  deviceData?: Record<string, unknown> | null
  /** 设备在线状态 */
  deviceOnline?: boolean
  /** 暗色模式（可选覆盖：不传则跟随全局 next-themes 主题，与站点其他页面同步） */
  dark?: boolean
  /** 受控展开状态；不传则组件自管（悬浮球切换） */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const GEO = {
  width: 400,
  widthLarge: 720,
  inset: 12,
  radius: 10,
  headerHeight: 48,
} as const

/** 品牌渐变（顶部条 / 标题字共用色系：蓝 → 紫 → 莓粉，呼应蓝玻璃背景） */
const BRAND_GRADIENT = "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)"
const TITLE_GRADIENT = "linear-gradient(92deg, #2563eb 0%, #7c3aed 55%, #ec4899 100%)"
/** 欢迎页氛围底色（浅蓝玻璃基底；光斑 + backdrop-filter 组成拟态磨砂玻璃） */
const heroBgLight = "linear-gradient(180deg, #eaf2fe 0%, #e2eefb 45%, #f4f9ff 100%)"
const heroBgDark = "linear-gradient(180deg, #0d1830 0%, #12203c 45%, #18181b 100%)"

/** 拟态磨砂玻璃卡片（推荐问题行 / 快捷入口 / 提示条共用） */
function glassCard(dark: boolean): React.CSSProperties {
  return dark
    ? {
        background: "rgba(39,39,42,0.55)",
        backdropFilter: "blur(14px) saturate(150%)",
        WebkitBackdropFilter: "blur(14px) saturate(150%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
      }
    : {
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(14px) saturate(150%)",
        WebkitBackdropFilter: "blur(14px) saturate(150%)",
        border: "1px solid rgba(255,255,255,0.75)",
        boxShadow: "0 1px 2px rgba(30,64,175,0.05)",
      }
}

/** 欢迎页装饰光斑（磨砂玻璃的底层色源） */
function HeroBlobs({ dark }: { dark: boolean }) {
  const blobs = dark
    ? ["radial-gradient(circle, rgba(59,130,246,0.30), transparent 70%)", "radial-gradient(circle, rgba(14,165,233,0.20), transparent 70%)", "radial-gradient(circle, rgba(236,72,153,0.14), transparent 70%)"]
    : ["radial-gradient(circle, rgba(147,197,253,0.60), transparent 70%)", "radial-gradient(circle, rgba(125,211,252,0.50), transparent 70%)", "radial-gradient(circle, rgba(244,114,182,0.20), transparent 70%)"]
  const spots: { top?: number; bottom?: number; left?: string; right?: string; size: number; blur: number }[] = [
    { top: -70, left: "-8%", size: 280, blur: 28 },
    { top: 100, right: "-10%", size: 300, blur: 32 },
    { bottom: -50, left: "15%", size: 240, blur: 30 },
  ]
  return (
    <div aria-hidden data-copilot-blobs style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {spots.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: s.top,
            bottom: s.bottom,
            left: s.left,
            right: s.right,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: blobs[i],
            filter: `blur(${s.blur}px)`,
          }}
        />
      ))}
    </div>
  )
}

/** 快捷入口（三宫格，参考图「购买咨询/折扣优惠/售后服务」位） */
const SHORTCUTS: { label: string; to: string; icon: React.ComponentType<IconProps>; color: string }[] = [
  { label: "知识库", to: "/kb-store", icon: IconFileText, color: "#3b82f6" },
  { label: "订阅方案", to: "/subscription", icon: IconStar, color: "#f97316" },
  { label: "使用指南", to: "/docs", icon: IconHelp, color: "#8b5cf6" },
]

export function CopilotSidebar({
  pageKey,
  context,
  deviceData,
  deviceOnline = true,
  dark: darkProp,
  open: controlledOpen,
  onOpenChange,
}: CopilotSidebarProps) {
  // 主题：显式传入 dark 时以传入值为准（dev 调试页）；
  // 不传（automation/dashboard/monitor 等业务页）则跟随全局 next-themes，与站点其他页面同步
  const { resolvedTheme } = useTheme()
  const dark = darkProp ?? resolvedTheme === "dark"
  const cfg = COPILOT_PAGE_CONFIGS[pageKey]
  const router = useRouter()
  const [innerOpen, setInnerOpen] = useState(false)
  const [fabHover, setFabHover] = useState(false)
  const [closing, setClosing] = useState(false)
  const open = controlledOpen ?? innerOpen
  /** 窗口尺寸态：normal(400) / large(720) —— 「窗口放大」按钮切换 */
  const [size, setSize] = useState<"normal" | "large">("normal")
  /** 欢迎页顶部提示条（可关闭，仅空态展示） */
  const [bannerOpen, setBannerOpen] = useState(true)

  const setOpen = useCallback(
    (v: boolean) => {
      if (controlledOpen === undefined) setInnerOpen(v)
      onOpenChange?.(v)
    },
    [controlledOpen, onOpenChange]
  )

  /* 动态模型选择器：初值取 ai-settings（与主助手同源），custom- 模型带凭据 */
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [customModel, setCustomModel] = useState<{ apiKey?: string; apiUrl?: string; modelId?: string } | null>(null)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ai-settings")
      if (raw) setSelectedModel(JSON.parse(raw)?.model || "")
    } catch { /* ignore */ }
  }, [])
  const handleModelChange = useCallback((id: string) => {
    setSelectedModel(id)
    if (id.startsWith("custom-")) {
      try {
        const raw = localStorage.getItem("berry-realm.custom-models.v1")
        const list = raw ? JSON.parse(raw) : []
        const c = list.find((x: { id: string }) => x.id === id)
        setCustomModel(c ? { apiKey: c.apiKey, apiUrl: c.baseUrl, modelId: c.modelId } : null)
      } catch {
        setCustomModel(null)
      }
    } else {
      setCustomModel(null)
    }
  }, [])

  const {
    messages,
    isLoading,
    agentSteps,
    agentStatus,
    send,
    stop,
    reset,
    removeMessage,
  } = useCopilotChat({
    contextProvider: context,
    deviceData,
    deviceOnline,
    restoreSession: true,
    model: selectedModel || undefined,
    customModel: selectedModel?.startsWith("custom-") ? customModel : null,
  })

  const { toggleRelay } = useDeviceControl()

  const [input, setInput] = useState("")
  const [enableSearch, setEnableSearch] = useState(false)
  const [enableReasoning, setEnableReasoning] = useState(false)
  const [enablePlanning, setEnablePlanning] = useState(false)
  const [approvalMode, setApprovalMode] = useState<"request" | "auto" | "full">("request")
  const listWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setClosing(false)
  }, [open])

  const handleClose = useCallback(() => {
    if (closing) return
    setClosing(true)
    setOpen(false)
  }, [closing, setOpen])

  /* Esc 关闭 */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, handleClose])

  const handleSend = useCallback(
    (text: string) => {
      void send(text)
    },
    [send]
  )

  /** 窗口控制：放大/还原 */
  const toggleSize = useCallback(() => {
    setSize(s => (s === "normal" ? "large" : "normal"))
  }, [])

  /** 窗口控制：全屏 → 跳转 AI 助手完整对话页 */
  const goFullAssistant = useCallback(() => {
    router.push("/ai-assistant")
  }, [router])

  /** AI 回复中的设备命令执行（复用业务页 useDeviceControl） */
  const handleExecuteCommand = useCallback(
    async (command: Record<string, unknown>) => {
      try {
        const name = String(command?.name ?? command?.tool ?? "")
        const args = (command?.arguments ?? command?.args ?? {}) as Record<string, unknown>
        if (name.includes("toggle_relay")) {
          const relay = Number(args.relay ?? args.relayNum ?? args.relay_num)
          if (relay >= 1 && relay <= 8) {
            // toggleRelay(relayNum, currentState)：当前状态优先取命令入参，
            // 缺失时用侧栏持有的实时 deviceData 兜底
            const cur = Number(
              args.state ??
                args.currentState ??
                (deviceData as Record<string, unknown> | null)?.[`relay${relay}`] ??
                0
            )
            await toggleRelay(relay, cur === 1 ? 1 : 0)
            toast.success(`已执行：继电器 ${relay}`)
            return
          }
        }
        toast.info("这条命令请到 AI 助手主页执行", {
          description: "工作台侧栏暂未覆盖该工具的执行入口",
        })
      } catch {
        toast.error("命令执行失败")
      }
    },
    [toggleRelay, deviceData]
  )

  /** rendererProps —— ChatMessageRenderer 全家桶的最小可用配置 */
  const rendererProps = useMemo(
    () => ({
      deviceData: deviceData ?? {},
      autoExecuteCommands: false,
      assistantMode: approvalMode,
      enableReasoning,
      isStreaming: isLoading,
      onOpenStudio: (title: string) => {
        toast.info("报告已在主助手中生成", { description: title })
      },
      onOpenStudioFromTask: () => {},
      onExecuteCommand: handleExecuteCommand,
      onRetryCommand: () => {
        toast.info("请重新描述你的问题")
      },
      onSendMessage: handleSend,
      onSetInput: setInput,
    }),
    [deviceData, approvalMode, enableReasoning, isLoading, handleExecuteCommand, handleSend]
  )

  const empty = messages.length === 0

  /* ===== 悬浮球（收起态） ===== */
  const fab = !open && (
    <AnimatePresence>
      <motion.button
        key="copilot-fab"
        type="button"
        aria-label="唤起莓小智"
        title={cfg.title}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: fabHover ? 1.06 : 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => setOpen(true)}
        onMouseEnter={() => setFabHover(true)}
        onMouseLeave={() => setFabHover(false)}
        style={{
          position: "fixed",
          right: GEO.inset + 4,
          bottom: GEO.inset + 4,
          zIndex: 159,
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: `1px solid ${dark ? "#3f3f46" : "#e8e8ea"}`,
          background: dark ? "#18181b" : "#ffffff",
          color: dark ? "#f4f4f5" : "#18181b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
          boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 6px 20px rgba(0,0,0,0.10)",
        }}
      >
        <IconMagic size={20} strokeWidth={1.75} />
      </motion.button>
    </AnimatePresence>
  )

  return (
    <ConfigProvider
      /* 2026-09-19 修复：dashboard/monitor 等业务页把 antd token.borderRadius 设成 22
         （BERRY_THEME.radius.lg），antd X Sender 圆角 = borderRadius × 2 → 44px 巨圆角。
         这里锁成 ai-assistant 主页同款 token（borderRadius 10 → Sender 20px），
         保证 Copilot 侧栏与主助手观感一致，不受宿主页面主题影响。 */
      /* 2026-09-20 修复：宿主页（dashboard/monitor 等）的 ConfigProvider 多为浅色算法，
         深色模式下 Bubble/Sender 的 token（colorText/colorBorder 等）仍是黑字浅边，
         导致 AI 气泡「深底黑字」看不清。这里按 dark 显式切 algorithm，
         让 copilot 子树（@ant-design/x Bubble/Sender、Tooltip 等）与自身配色一致。 */
      theme={{
        token: { colorPrimary: "#1677ff", borderRadius: 10 },
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      {fab}

      <AnimatePresence>
        {open && (
          <motion.aside
            key="copilot-sidebar"
            initial={{ opacity: 0, x: 16 }}
            animate={{
              opacity: closing ? 0 : 1,
              x: closing ? 16 : 0,
              width: size === "normal" ? GEO.width : GEO.widthLarge,
            }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed z-[160] flex flex-col overflow-hidden${dark ? " copilot-dark" : ""}`}
            style={{
              top: GEO.inset,
              right: GEO.inset,
              bottom: GEO.inset,
              maxWidth: `calc(100vw - ${GEO.inset * 2}px)`,
              background: dark ? "#18181b" : "#ffffff",
              border: `1px solid ${dark ? "#3f3f46" : "#e8e8ea"}`,
              borderRadius: GEO.radius,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.06)",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
              pointerEvents: closing ? "none" : "auto",
            }}
            data-copilot-page={pageKey}
            data-copilot-size={size}
          >
            {/* ===== 品牌渐变条（参考阿里云在线服务弹窗顶条） ===== */}
            <div
              data-copilot-gradient
              style={{ height: 4, flexShrink: 0, background: BRAND_GRADIENT }}
            />

            {/* ===== 顶栏：模型选择器 + 窗口控制 ===== */}
            <div
              data-copilot-header
              style={{
                height: GEO.headerHeight,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 2,
                padding: "0 8px 0 12px",
                borderBottom: `1px solid ${dark ? "#27272a" : "#f0f0f1"}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "flex-start" }}>
                <DynamicModelSelector value={selectedModel} onValueChange={handleModelChange} />
              </div>
              <button
                type="button"
                title="新对话"
                onClick={reset}
                style={iconBtnStyle(dark)}
                onMouseEnter={e => (e.currentTarget.style.background = dark ? "#27272a" : "#f4f4f5")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <IconRefresh size={16} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                title="最小化"
                onClick={handleClose}
                style={iconBtnStyle(dark)}
                onMouseEnter={e => (e.currentTarget.style.background = dark ? "#27272a" : "#f4f4f5")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <IconMinus size={16} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                title={size === "normal" ? "窗口放大" : "还原"}
                onClick={toggleSize}
                style={iconBtnStyle(dark)}
                onMouseEnter={e => (e.currentTarget.style.background = dark ? "#27272a" : "#f4f4f5")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <IconFullScreenOne size={15} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                title="全屏"
                onClick={goFullAssistant}
                style={iconBtnStyle(dark)}
                onMouseEnter={e => (e.currentTarget.style.background = dark ? "#27272a" : "#f4f4f5")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <IconFullScreen size={15} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                title="关闭"
                onClick={handleClose}
                style={iconBtnStyle(dark)}
                onMouseEnter={e => (e.currentTarget.style.background = dark ? "#27272a" : "#f4f4f5")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <IconClose size={16} strokeWidth={1.75} />
              </button>
            </div>

            {/* ===== 提示条（仅空态，可关闭 —— 参考图 banner 位） ===== */}
            {empty && bannerOpen && (
              <div
                data-copilot-banner
                style={{
                  flexShrink: 0,
                  position: "relative",
                  zIndex: 1,
                  margin: "10px 12px 0",
                  padding: "9px 12px",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  ...(dark
                    ? {
                        background: "rgba(39,39,42,0.55)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        backdropFilter: "blur(14px) saturate(150%)",
                        WebkitBackdropFilter: "blur(14px) saturate(150%)",
                      }
                    : {
                        background: "rgba(255,255,255,0.6)",
                        border: "1px solid rgba(255,255,255,0.75)",
                        backdropFilter: "blur(14px) saturate(150%)",
                        WebkitBackdropFilter: "blur(14px) saturate(150%)",
                      }),
                  color: dark ? "#c3d4f7" : "#3b4658",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  莓小智已接入当前页面数据，回答会自动结合上下文
                </span>
                <button
                  type="button"
                  title="关闭提示"
                  onClick={() => setBannerOpen(false)}
                  style={{
                    width: 20,
                    height: 20,
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    background: "transparent",
                    color: dark ? "#71717a" : "#98a2b3",
                    cursor: "pointer",
                    borderRadius: 6,
                    padding: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = dark ? "#3f3f46" : "#dbeafe")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <IconClose size={13} strokeWidth={2} />
                </button>
              </div>
            )}

            {/* ===== 消息区 / 欢迎页 ===== */}
            <div
              ref={listWrapRef}
              className={`copilot-scroll copilot-bubbles${size === "normal" ? " copilot-narrow" : ""}`}
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                background: empty ? (dark ? heroBgDark : heroBgLight) : "transparent",
              }}
            >
              <style>{`
                .copilot-scroll::-webkit-scrollbar, .copilot-bubbles ::-webkit-scrollbar { width: 6px; height: 6px; }
                .copilot-scroll::-webkit-scrollbar-thumb, .copilot-bubbles ::-webkit-scrollbar-thumb { background: ${dark ? "#52525b" : "#d4d4d8"}; border-radius: 3px; }
                .copilot-scroll::-webkit-scrollbar-track, .copilot-bubbles ::-webkit-scrollbar-track { background: transparent; }
                /* AI 气泡去壳：内容平铺在面板上，不再有 outlined 大圆角外壳（对齐主助手/落地页观感） */
                .copilot-bubbles .ant-bubble-content-outlined {
                  background: transparent !important;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  border-radius: 0 !important;
                }
                /* 用户气泡：统一灰底 + 16px 圆角 */
                .copilot-bubbles .ant-bubble-content-filled {
                  background: ${dark ? "#27272a" : "#f1f1f3"} !important;
                  border-radius: 16px !important;
                }
                /* 窄栏内富内容（markdown/表格/代码块）不许撑破宽度出粗横向滚动条 */
                .copilot-bubbles .ant-bubble-content { max-width: 100%; overflow-x: hidden; }
                .copilot-bubbles pre, .copilot-bubbles table { max-width: 100%; }
                /* 欢迎页玻璃卡行 / 快捷入口 hover（亮暗分治） */
                .copilot-row, .copilot-tile { transition: border-color .16s ease, transform .16s ease, background .16s ease; }
                .copilot-row:hover { border-color: rgba(147,197,253,0.9) !important; background: rgba(255,255,255,0.78) !important; }
                .copilot-row:hover .copilot-row-arrow { transform: translateX(3px); color: #3b82f6; }
                .copilot-row-arrow { transition: transform .18s ease, color .16s ease; }
                .copilot-tile:hover { border-color: rgba(147,197,253,0.9) !important; background: rgba(255,255,255,0.78) !important; transform: translateY(-1px); }
                .copilot-dark .copilot-row:hover, .copilot-dark .copilot-tile:hover { border-color: #52525b !important; background: rgba(63,63,70,0.7) !important; }
                .copilot-dark .copilot-row:hover .copilot-row-arrow { color: #93c5fd; }
              `}
              {COPILOT_NARROW_CSS}
            </style>

              {empty ? (
                /* ===== 欢迎页（参考阿里云在线服务弹窗版式 · 蓝色拟态磨砂玻璃背景） ===== */
                <>
                  <HeroBlobs dark={dark} />
                  <div
                    data-copilot-hero
                    style={{
                      position: "relative",
                      zIndex: 1,
                      width: "100%",
                      maxWidth: 460,
                      margin: "0 auto",
                      padding: "40px 22px 26px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    {/* 头像：BerryOrb（Grok 风格动画小球） */}
                    <div data-copilot-avatar style={{ flexShrink: 0, display: "flex", justifyContent: "center" }}>
                      <BerryOrb size="84px" theme={dark ? "dark" : "light"} expression="happy" />
                    </div>

                  {/* 标题 */}
                  <div
                    style={{
                      marginTop: 20,
                      fontSize: 25,
                      fontWeight: 800,
                      letterSpacing: 0.5,
                      lineHeight: 1.35,
                      color: dark ? "#f4f4f5" : "#18181b",
                      textAlign: "center",
                    }}
                  >
                    您好，欢迎使用
                  </div>
                  <div
                    data-copilot-brand
                    style={{
                      fontSize: 25,
                      fontWeight: 800,
                      letterSpacing: 0.5,
                      lineHeight: 1.35,
                      background: TITLE_GRADIENT,
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      textAlign: "center",
                    }}
                  >
                    莓小智
                  </div>

                  {/* 页面欢迎词 */}
                  <div
                    data-copilot-greeting
                    style={{
                      marginTop: 12,
                      fontSize: 13,
                      lineHeight: 1.75,
                      color: dark ? "#a1a1aa" : "#7a7a85",
                      textAlign: "center",
                      maxWidth: 320,
                    }}
                  >
                    {cfg.greeting}
                  </div>

                  {/* 推荐问题白卡行 + 跳转 AI 助手 */}
                  <div
                    data-copilot-rows
                    style={{
                      marginTop: 24,
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {cfg.suggestions.map(s => (
                      <button
                        key={s}
                        type="button"
                        className="copilot-row"
                        onClick={() => handleSend(s)}
                        style={{
                          width: "100%",
                          height: 46,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: "0 14px",
                          ...glassCard(dark),
                          borderRadius: 10,
                          fontSize: 13.5,
                          color: dark ? "#f4f4f5" : "#26262b",
                          cursor: "pointer",
                          textAlign: "left",
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s}
                        </span>
                        <span className="copilot-row-arrow" style={{ display: "inline-flex", lineHeight: 0, color: dark ? "#52525b" : "#c9c2d6", flexShrink: 0 }}>
                          <IconArrowRight size={15} strokeWidth={1.75} />
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      className="copilot-row"
                      data-copilot-goto-assistant
                      onClick={goFullAssistant}
                      style={{
                        width: "100%",
                        height: 46,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "0 14px",
                        ...glassCard(dark),
                        borderRadius: 10,
                        fontSize: 13.5,
                        color: dark ? "#f4f4f5" : "#26262b",
                        cursor: "pointer",
                        textAlign: "left",
                        lineHeight: 1.5,
                      }}
                    >
                      <span>去 AI 助手，开启完整对话</span>
                      <span className="copilot-row-arrow" style={{ display: "inline-flex", lineHeight: 0, color: dark ? "#52525b" : "#c9c2d6", flexShrink: 0 }}>
                        <IconArrowRight size={15} strokeWidth={1.75} />
                      </span>
                    </button>
                  </div>

                  {/* 快捷入口三宫格 */}
                  <div
                    data-copilot-shortcuts
                    style={{
                      marginTop: 12,
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 10,
                    }}
                  >
                    {SHORTCUTS.map(sc => (
                      <button
                        key={sc.label}
                        type="button"
                        className="copilot-tile"
                        onClick={() => router.push(sc.to)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 7,
                          padding: "14px 0 12px",
                          ...glassCard(dark),
                          borderRadius: 10,
                          cursor: "pointer",
                        }}
                      >
                        <sc.icon size={20} color={sc.color} strokeWidth={2} />
                        <span style={{ fontSize: 12.5, color: dark ? "#a1a1aa" : "#5f5f6b" }}>{sc.label}</span>
                      </button>
                    ))}
                  </div>
                  </div>
                </>
              ) : (
                /* ✅ 复用 ai-assistant 的消息列表（含思考链/工具卡/markdown 渲染） */
                <ChatBubbleList
                  messages={messages}
                  isLoading={isLoading}
                  agentSteps={agentSteps}
                  agentStatus={agentStatus}
                  showThoughtChain={true}
                  rendererProps={rendererProps as never}
                  darkMode={dark}
                  latestTaskListContent=""
                  newMessageBoundary={0}
                  onDeleteMessage={removeMessage}
                />
              )}
            </div>

            {/* ===== 输入区（✅ 复用 ai-assistant 的输入框组件） ===== */}
            <div
              style={{
                flexShrink: 0,
                borderTop: `1px solid ${dark ? "#27272a" : "#f0f0f1"}`,
              }}
            >
              <ChatSenderInput
                input={input}
                setInput={setInput}
                onSend={handleSend}
                isLoading={isLoading}
                attachments={[]}
                onSelectFiles={() => {}}
                onRemoveAttachment={() => {}}
                onPaste={() => {}}
                enableReasoning={enableReasoning}
                setEnableReasoning={setEnableReasoning}
                enablePlanning={enablePlanning}
                setEnablePlanning={setEnablePlanning}
                enableSearch={enableSearch}
                setEnableSearch={setEnableSearch}
                availableTools={[]}
                onCancel={stop}
                darkMode={dark}
                approvalMode={approvalMode}
                setApprovalMode={setApprovalMode}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </ConfigProvider>
  )
}

function iconBtnStyle(dark: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: dark ? "#a1a1aa" : "#52525b",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  }
}
