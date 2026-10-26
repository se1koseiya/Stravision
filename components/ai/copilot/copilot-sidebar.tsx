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
 *  - 顶部 4px 品牌渐变条；顶栏 = 模型选择器 + 窗口控制
 *  - 空态欢迎页：可关闭提示条 + BerryOrb 动画头像（components/smoothui/berry-orb）
 *    +「您好，欢迎使用 / 莓小智」渐变标题 + 推荐问题白卡行（右箭头）+ 跳 AI 助手行 + 三个彩色快捷入口
 *  - 背景 = 蓝色拟态磨砂玻璃（光斑层 + backdrop-filter 玻璃卡，用户定稿）
 *  - 窗口放大：400px ↔ 720px（欢迎内容列限宽 460 居中，对齐参考图放大态版式）
 *  - 全屏 = 跳转 /ai-assistant（完整对话页）；最小化 = 收起为悬浮球
 *
 * 【2026-09-25 顶栏操作区改版】用户给定华为鸿蒙系统窗口参考截图，右上角四键定为：
 *   新建对话（气泡+号）/ 历史记录（时钟+箭头）/ 面板开关（圆角矩形+内嵌块）/ 关闭（灰底圆 + 叉）
 *   - 图标全部取自 HarmonyOS Symbol（华为鸿蒙图标库）→ 见 components/icon.tsx
 *   - 尺寸/配色按参考稿实测等比落位，常量见 HEADER_ICON_SIZE 一组
 *   - 原「最小化」（与关闭同义）「全屏」两键取消：全屏能力并入「历史记录」
 *     （跳转 /ai-assistant 完整助手，那里带会话历史侧栏）
 *
 * 页面差异（欢迎词/推荐问题）只在 page-configs.ts 配置。
 * 本文件只负责：窗口定位与尺寸态、顶栏、空态欢迎页、把三件套拼起来。
 *
 * 【2026-09-24 悬浮球 → 莓果 IP 状态机】参考「小莓果四态」动效稿：
 *  - 收起态 = 莓果悬浮球（copilot-berry.tsx）：Idle 呼吸 → 近距感知转向 → Hover 醒来
 *    （上浮 + 「问问我 / 需要帮忙？」）→ Pressed 软压缩
 *  - Opening：点击先压软，随后面板以 clip-path 从球所在位置（右下角）向左上「长出来」
 *    （只裁切不形变，圆角 26 → 10 同步收敛，起始半透明），球本体同时收缩消散 —— 球就是窗口的来源
 *  - Closing：完全反向，面板沿同一路径缩回球位，球再弹回右下角
 *  - 内容错峰淡入：顶栏 → 消息区 → 输入区（跟着揭示走，不整块闪现）
 *  - Thinking：AI 生成中悬浮球内部柔光旋转 + 呼吸光环加速（脸保持原本表情不动）
 *  - Answered：回复完成，悬浮球轻 boop 一下（上浮 3px + 叶尖轻弹），不闪红点
 *  - 开合编排总时长 300~420ms，与参考稿节奏一致
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { ConfigProvider, theme as antdTheme } from "antd"
import { toast } from "@/lib/ui/feedback"
import { ChatBubbleList } from "@/app/ai-assistant/_components/chat-bubble-list"
import { CopilotSender } from "@/components/ai/copilot/copilot-sender"
import type { Message, ChatAttachment } from "@/app/ai-assistant/types"
/* 截图 → 附件：与主助手共用同一条「拍图 → 压缩 → 附件」通路。
   ⛔ 别在这层另写 html-to-image / getDisplayMedia / FileReader —— 见两个 util 的文件头注释。 */
import {
  captureScreen,
  cropRegionToFile,
  freezePageScroll,
  snapshotPage,
  type PageSnapshot,
  type RegionRect,
} from "@/app/ai-assistant/_utils/screenshot"
import {
  MAX_SENDER_IMAGES,
  isImageFile,
  pickFilesFromClipboard,
  prepareImageFile,
} from "@/app/ai-assistant/_utils/paste-image"
import { uploadDocumentFile } from "@/app/ai-assistant/_utils/upload-document"
import { isVLMModel } from "@/app/ai-assistant/_utils/helpers"
import { DynamicModelSelector } from "@/components/ai/dynamic-model-selector"
import { RegionScreenshotOverlay } from "@/components/ui/region-screenshot-overlay"
import {
  IconCamera,
  IconClose,
  IconCommentAdd,
  IconFullScreen,
  IconHistory,
  IconSetting,
  IconSidebarPanel,
  type IconProps,
} from "@/components/icon"
import { openSettings } from "@/components/settings/global-settings-host"
import {
  CopilotBerryFab,
  COPILOT_FAB,
} from "./copilot-berry"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { useOptionalDeviceContext, type RegistryDevice } from "@/lib/contexts/device-context"
import { COPILOT_NARROW_CSS } from "./narrow-styles"
import { COPILOT_PAGE_CONFIGS, type CopilotPageKey } from "./page-configs"
import { useCopilotChat, type CopilotClientTools } from "./use-copilot-chat"
import {
  callTurnsToMessages,
  CopilotCallFooter,
  useCopilotCall,
  type CallTurn,
} from "./copilot-call"
import { CanvasActivityGlow } from "./canvas-activity-glow"
import { useMaterialCss } from "@/components/device/immersive-card"
import { useAdaptiveMaterialLevel } from "@/components/device/use-material-level"

const DEVICE_TYPE_LABEL: Record<RegistryDevice["type"], string> = {
  relay: "继电器",
  sensor: "传感器",
  camera: "摄像头",
  stepper: "步进电机",
}

/**
 * 设备注册表快照 → 注入 systemPrompt。
 *
 * 🚨 「全局同步包括 AI 助手」的关键一环：注册表是 app/layout 里 DeviceProvider 的
 * 全局单例，「设备管理」弹窗 / 设备控制页 / 这里读的是同一份数据。
 * 每次发消息实时取快照，因此在弹窗里改名/新增/禁用设备后，AI 助手立刻按新清单作答。
 */
function buildRegistryContext(devices: RegistryDevice[]): string | null {
  if (!devices.length) return null
  const lines = ["【设备注册表（与「设备管理」弹窗同源，实时快照）】"]
  for (const d of devices) {
    const bits: string[] = [DEVICE_TYPE_LABEL[d.type] ?? d.type]
    if (d.category && d.category !== "general") bits.push(`分类=${d.category}`)
    if (typeof d.config?.relay_num === "number") bits.push(`通道=relay${d.config.relay_num}`)
    if (d.node_id) bits.push(`node=${d.node_id}`)
    if (d.subscribe_topic) bits.push(`订阅=${d.subscribe_topic}`)
    if (d.publish_topic) bits.push(`发布=${d.publish_topic}`)
    if (d.is_critical) bits.push("关键设备")
    if (!d.is_enabled) bits.push("已禁用")
    lines.push(`- ${d.name}：${bits.join(" · ")}`)
  }
  return lines.join("\n")
}

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
  /**
   * 前端工具宿主（可选）：声明本页支持的前端能力 + 提供执行器。
   *
   * 例如画布编辑器传 `{ capabilities: ['automation-canvas'], handlers: { automation_canvas_apply } }`，
   * 后端就会把 automation_canvas_apply 注入给模型，模型调用后由本页在浏览器里执行，
   * 执行期间屏幕边缘会亮起「正在改画布」的光效。
   */
  clientTools?: CopilotClientTools
}

const GEO = {
  width: 400,
  widthLarge: 720,
  inset: 12,
  radius: 10,
  headerHeight: 48,
} as const

/* ────────────────────────────────────────────────────────────────
 * 顶栏右侧操作区（2026-09-25 改版：对齐用户给的华为鸿蒙系统窗口参考截图）
 *
 * 参考稿实测（原始截图 1:1 像素）→ 本处尺寸（等比 0.528 = 19 / 36）：
 *   普通图标墨迹  36px → 19px，图标色 #666666（实测 rgb(102,102,102)）
 *   关闭键图标    24px → 13px，颜色更深 #18181b
 *   关闭键灰底圆  52px → 27px，底色 #f2f2f2（实测 rgb(242,242,242)）
 *   图标中心间距  72px → 38px ⇒ 28px 按钮盒 + 10px 间距
 *
 * 五个键（前四个顺序与参考稿一致，「全屏」为项目保留能力追加于关闭键之前）：
 *   新建对话 / 历史记录 / 面板开关 / 全屏 / 关闭
 * 图标全部取自 HarmonyOS Symbol（华为鸿蒙图标库），见 components/icon.tsx。
 *
 * 交互：点击后图标染品牌绿并保持一段时间（面板/全屏为状态型，按状态常亮）。
 * ──────────────────────────────────────────────────────────────── */
/** 普通操作键的图标尺寸（参考稿 36px × 0.528） */
const HEADER_ICON_SIZE = 19
/** 关闭键图标尺寸（参考稿 24px × 0.528） */
const HEADER_CLOSE_ICON_SIZE = 13
/** 关闭键灰底圆直径（参考稿 56px × 0.528 ≈ 29.6 → 取 28 与普通键同盒） */
const HEADER_CLOSE_BOX = 28
/** 相邻操作键中心距（参考稿 72px × 0.528 = 38 ⇒ 28px 盒 + 10px 间距）；
 *  本处为 5 键，收到 7 保持整体宽度不超参考稿的视觉占比 */
const HEADER_ACTION_GAP = 7
/** 点击染色：品牌宝石绿 */
const HEADER_TINT = "#059669"
/** 点击染色保持时长（ms） */
const HEADER_TINT_HOLD = 700

/**
 * 截图期间必须临时隐藏的元素 —— 侧栏面板本体 + 收起态的悬浮球。
 *
 * 不藏的后果：底图 / 截图里会带上"发起截图的那块 UI"，
 * 用户拉框时看到的是一张压着侧栏的页面，截给 AI 看也全是噪声。
 * 划选与屏幕捕获两条路径共用这一份，避免只改一处。
 */
const CAPTURE_HIDE_SELECTORS = ["aside[data-copilot-page]", "[data-copilot-fab]"]

/** 品牌渐变（顶部条 / 标题字共用色系：蓝 → 紫 → 莓粉，呼应蓝玻璃背景） */
const BRAND_GRADIENT = "linear-gradient(90deg, #059669 0%, #52525b 50%, #71717a 100%)"
const TITLE_GRADIENT = "linear-gradient(92deg, #52525b 0%, #3f3f46 55%, #71717a 100%)"
/** 欢迎页氛围底色（浅蓝玻璃基底；光斑 + backdrop-filter 组成拟态磨砂玻璃） */
/**
 * 空态氛围底（实测对齐参考稿）：**顶白 → 下浅蓝**的竖直渐变。
 * 参考稿逐点采样（面板内区）：10%→(255,255,255) / 40%→(248,249,250) /
 * 60%→(240,245,252) / 80%→(212,232,248)。旧值顶部偏蓝紫，与参考稿不符。
 */
/**
 * 空态氛围底 —— 「顶白 → 下浅灰」的竖直渐变（纯中性）。
 *
 * 2026-09-26 全站色彩铁律：黑白灰 + 品牌绿。原本这里是第三方参考稿实测的蓝调渐变，
 * 现统一转中性 —— 参考稿色只保留在下面这段注释里，需要还原时整行替换即可。
 *   light: "linear-gradient(180deg, rgba(255,255,255,.86) 0%, rgba(248,249,250,.84) 38%, rgba(240,245,252,.80) 62%, rgba(212,232,248,.72) 84%, rgba(201,226,247,.70) 100%)"
 *   dark:  "linear-gradient(180deg, rgba(24,24,27,.72) 0%, rgba(23,27,35,.72) 40%, rgba(18,32,60,.74) 78%, rgba(13,24,48,.76) 100%)"
 *
 * ⚠️ alpha 必须留在 .70~.86：面板本体挂了 HDS 沉浸光感 ULTRA 材质（.dc-mat--ultra），
 *    而 inline 的 background 会**整块盖住**材质的 backdrop-filter —— 写实色等于材质没开。
 *    （暗态同理：原来 #18181b 实色，现在让位给 .dark .dc-mat--ultra 的叠白光感。）
 */
const heroBgLight = "linear-gradient(180deg, rgba(255,255,255,.86) 0%, rgba(249,249,250,.84) 38%, rgba(244,244,245,.80) 62%, rgba(237,237,238,.72) 84%, rgba(232,232,234,.70) 100%)"
const heroBgDark = "linear-gradient(180deg, rgba(24,24,27,.72) 0%, rgba(22,22,25,.72) 40%, rgba(17,17,20,.74) 78%, rgba(12,12,14,.76) 100%)"

/* ────────────────────────────────────────────────────────────────
 * AI 助手的「沉浸光感」接入范围（2026-09-26）
 *
 * 共享材质源：components/device/material-css.ts（.dc-mat 四件套 + 档位）
 *             components/device/immersive-card.tsx（useMaterialCss 单例注入）
 *
 * ⚠️ 为什么**只有这几处**上材质，其余一律保持实色 —— 「适当」是有定量理由的：
 *   沉浸光感的观感来自「背后的内容被柔化透上来」。侧栏内部的一切（顶栏、消息、
 *   推荐条、输入框）背后都是**面板自己的实色底**，给它们上 backdrop-filter
 *   采样不到任何东西，只会白白多一个合成层。真正底下有内容的只有两类：
 *     ① 悬浮球提示气泡（压在业务页之上）
 *     ② 面板本体「与其内部能透到页面内容的浮层」（空态 banner / 通话底条）
 *   对话区是长文本载体，面板一旦太透就会拖垮对比度 —— 所以面板选 HDS 官方
 *   的 ULTRA_THICK 档（几乎不透明，官方定义就是「浮层 / 对话框」那一档），
 *   只取它的模糊 + 饱和度增益 + 内缘光，把可读性留在原水平。
 * ──────────────────────────────────────────────────────────────── */

/** 欢迎页装饰光斑（磨砂玻璃的底层色源） */
function HeroBlobs({ dark }: { dark: boolean }) {
  /* 光斑色源同步全站铁律：一律中性灰 + 品牌绿，蓝斑/粉斑全部退役
     （原为参考稿色：rgba(147,197,253) / rgba(125,211,252) / rgba(125,185,240) 三团浅蓝）。 */
  const blobs = dark
    ? ["radial-gradient(circle, rgba(52,211,153,0.12), transparent 70%)", "radial-gradient(circle, rgba(255,255,255,0.05), transparent 70%)", "radial-gradient(circle, rgba(52,211,153,0.20), transparent 70%)"]
    : ["radial-gradient(circle, rgba(0,148,86,0.10), transparent 70%)", "radial-gradient(circle, rgba(24,24,27,0.05), transparent 70%)", "radial-gradient(circle, rgba(0,148,86,0.14), transparent 70%)"]
  const spots: { top?: number; bottom?: number; left?: string; right?: string; size: number; blur: number }[] = [
    { top: -120, left: "-10%", size: 260, blur: 40 },
    { top: 60, right: "-12%", size: 260, blur: 44 },
    { bottom: -90, left: "2%", size: 420, blur: 46 },
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

export function CopilotSidebar({
  pageKey,
  context,
  deviceData,
  deviceOnline = true,
  dark: darkProp,
  open: controlledOpen,
  onOpenChange,
  clientTools,
}: CopilotSidebarProps) {
  // 主题：显式传入 dark 时以传入值为准（dev 调试页）；
  // 不传（automation/dashboard/monitor 等业务页）则跟随全局 next-themes，与站点其他页面同步
  const { resolvedTheme } = useTheme()
  const dark = darkProp ?? resolvedTheme === "dark"
  /**
   * HDS 沉浸光感：① 保证材质 CSS 在文档中（app/layout 已全局注入一份，这里是幂等兜底，
   * 也让 HMR 能跟随更新）；② 挂上自适应材质等级（<html data-mat-level>）——
   * AI 助手常驻在 dashboard / monitor / landing 等页面，它自己也该参与
   * 「设备算力 → 材质等级」的自适应，而不是只有业务页带上那一档。
   */
  useMaterialCss()
  useAdaptiveMaterialLevel()

  const cfg = COPILOT_PAGE_CONFIGS[pageKey]
  const router = useRouter()
  const [innerOpen, setInnerOpen] = useState(false)
  /**
   * 开合编排状态机（对齐参考稿：球 ↔ 面板是同一个东西的两种状态）：
   *  closed → (点击悬浮球) → opening（面板从球位长出 + 飞行球飞向标题栏，~400ms）
   *         → open → (关闭/最小化/Esc) → closing（面板缩回球位 + 飞行球落回，~320ms）→ closed
   * phaseRef 兜底防止 effect 依赖抖动导致重跑。
   */
  const [phase, setPhase] = useState<"closed" | "opening" | "open" | "closing">("closed")
  const phaseRef = useRef(phase)
  const open = controlledOpen ?? innerOpen
  /** 窗口尺寸态：normal(400) / large(720) —— 「窗口放大」按钮切换 */
  const [size, setSize] = useState<"normal" | "large">("normal")
  /** 欢迎页顶部提示条（可关闭，仅空态展示） */
  const [bannerOpen, setBannerOpen] = useState(true)
  /** 回复完成 boop 信号（isLoading 下降沿 +1，驱动悬浮球轻弹） */
  const [boopKey, setBoopKey] = useState(0)
  /** 视口高度：开合编排的 clip-path 需要像素级面板高度（0 = SSR/首帧，退化为纯淡入） */
  const [viewportH, setViewportH] = useState(0)
  useEffect(() => {
    if (typeof window === "undefined") return
    const update = () => setViewportH(window.innerHeight)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

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

  /* 设备注册表（全局单例）→ 拼进页面上下文，让 AI 助手与「设备管理」弹窗同源 */
  const deviceCtx = useOptionalDeviceContext()
  const registryContext = useCallback(
    () => buildRegistryContext(deviceCtx?.devices ?? []),
    [deviceCtx?.devices]
  )
  const mergedContextProvider = useCallback(() => {
    const merged = [context?.()?.trim(), registryContext()]
      .filter((s): s is string => !!s && s.length > 0)
      .join("\n\n")
    return merged || null
  }, [context, registryContext])

  const {
    messages,
    isLoading,
    agentSteps,
    agentStatus,
    clientToolActivity,
    awaitingInput,
    respondToInput,
    send,
    stop,
    reset,
    removeMessage,
    appendMessages,
    sessionId,
  } = useCopilotChat({
    contextProvider: mergedContextProvider,
    deviceData,
    deviceOnline,
    restoreSession: true,
    model: selectedModel || undefined,
    customModel: selectedModel?.startsWith("custom-") ? customModel : null,
    clientTools,
  })

  const { toggleRelay } = useDeviceControl()

  /* ===== 语音 = Copilot 的「打电话」态（Omni 直管；挂断回写同一会话） ===== */
  const handleCallDeviceCommand = useCallback(
    async (command: { device?: number | string; value?: number; action?: string }) => {
      const relay = Number(command?.device)
      if (command?.action === "toggle_relay" && relay >= 1 && relay <= 8) {
        await toggleRelay(relay, Number(command?.value ?? 0) === 1 ? 1 : 0)
      }
    },
    [toggleRelay]
  )
  const handleCallHangUp = useCallback(
    (turns: CallTurn[]) => {
      void appendMessages(callTurnsToMessages(turns))
    },
    [appendMessages]
  )
  const call = useCopilotCall({
    deviceData: (deviceData as never) ?? null,
    onDeviceCommand: handleCallDeviceCommand,
    onHangUp: handleCallHangUp,
  })
  const inCall = call.callState !== "idle"
  const callMuted = call.muted

  const [input, setInput] = useState("")
  /* 截图 / 选图的附件：结构与主助手**完全同构**（ChatAttachment）。
     有附件时 useCopilotChat.send 会把这条用户消息的 content 升级成多模态数组
     （text + image_url），所以侧栏的「看板截图问一句」和主助手是同一条链路。 */
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  /** 屏幕捕获进行中（授权弹窗 + 抓帧期间按钮要禁用，避免连点开两个共享流） */
  const [capturing, setCapturing] = useState(false)
  /**
   * 划选截图状态：非 null = 遮罩已挂起，等用户拉框。
   * 存的是「冻结底图 + 铺放参数」，不是 dataURL —— 裁剪要拿原始画布像素，不能用显示用的压缩图。
   */
  const [regionShot, setRegionShot] = useState<{ snapshot: PageSnapshot; backgroundImage: string } | null>(null)
  /**
   * 页面滚动冻结的释放句柄。
   * 🚨 冻结必须在拍底图**之前**就生效、并一直持到遮罩关闭：根滚动条消失会让视口变宽
   *    （经典滚动条 ~15px），若底图与遮罩量的宽度不同，遮罩右缘就会多出一条没底图的缝。
   */
  const freezeReleaseRef = useRef<(() => void) | null>(null)
  /** 侧栏自己卸载（比如用户按 Esc 关面板）也要解冻，否则整页滚不动了 */
  useEffect(
    () => () => {
      freezeReleaseRef.current?.()
      freezeReleaseRef.current = null
    },
    [],
  )
  const [enableSearch, setEnableSearch] = useState(false)
  // 🔥 深度思考默认开启（与 AI 助手页保持一致）：无需用户手动启用
  const [enableReasoning, setEnableReasoning] = useState(true)
  const [enablePlanning, setEnablePlanning] = useState(false)
  const [approvalMode, setApprovalMode] = useState<"request" | "auto" | "full">("request")
  const listWrapRef = useRef<HTMLDivElement>(null)

  /* 开合编排：open 翻转时驱动 opening/closing，动画播完落位 */
  useEffect(() => {
    if (open) {
      if (phaseRef.current === "open") return
      phaseRef.current = "opening"
      setPhase("opening")
      const t = setTimeout(() => {
        phaseRef.current = "open"
        setPhase("open")
      }, 420)
      return () => clearTimeout(t)
    }
    if (phaseRef.current === "closed") return
    phaseRef.current = "closing"
    setPhase("closing")
    /* 关闭动画 340ms（面板缩放淡出），留 20ms 让球在面板散尽后弹回 */
    const t = setTimeout(() => {
      phaseRef.current = "closed"
      setPhase("closed")
    }, 360)
    return () => clearTimeout(t)
  }, [open])

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  /* 回复完成 → boop 一下（Answered 态） */
  const prevLoadingRef = useRef(false)
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) setBoopKey(k => k + 1)
    prevLoadingRef.current = isLoading
  }, [isLoading])

  /* Esc 关闭 */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, handleClose])

  /* ────────────────────────────────────────────────────────────────
   * 截图 / 图片附件（2026-10-14）
   *
   * 侧栏常驻在看板、实时监控、设备控制这些「画面信息远多于文字」的页面上 ——
   * 让用户把眼前那张图直接甩给莓小智看，比手打一段描述有效得多。
   *
   * 截图与「+」选图、Ctrl+V 粘贴走**同一条通路**（都收敛到 appendFiles），
   * 压缩口径也与主助手 app/ai-assistant/page.tsx#appendFiles 一致：
   * 一张 2560×1440 的全屏 PNG base64 能到 3–8MB，直接塞 image_url 会把请求体打爆。
   * ──────────────────────────────────────────────────────────────── */
  const appendFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return

      /* 图片受张数限制（每张都进请求体）；文档走服务端落盘、只带 fileId，不占图片配额。
         与主助手 `app/ai-assistant/page.tsx#appendFiles` 同一口径。 */
      const imageCount = attachments.filter(a => !a.fileId).length
      const room = MAX_SENDER_IMAGES - imageCount
      if (room <= 0 && files.every(isImageFile)) {
        toast.error("图片数量已达上限", {
          description: `单条消息最多 ${MAX_SENDER_IMAGES} 张，请先移除几张`,
        })
        return
      }

      const added: ChatAttachment[] = []
      let skipped = 0
      let imagesAdded = 0
      let imagesDropped = 0
      for (const file of files) {
        try {
          if (isImageFile(file)) {
            if (imagesAdded >= room) {
              imagesDropped += 1
              continue
            }
            const img = await prepareImageFile(file)
            added.push({ name: img.name, type: img.type, dataUrl: img.dataUrl })
            imagesAdded += 1
          } else {
            /* 🚨 文档**不能**读成 dataURL 塞进 `image_url`：
               非图片的 base64 上游会直接 400（且 5MB 的 PPT 转 base64 就有 6.7MB）。
               走 `/api/documents/upload` 落盘拿 fileId，正文由 `document_read` 按需读取。 */
            added.push(await uploadDocumentFile(file, sessionId || undefined))
          }
        } catch {
          /* 单张失败（损坏 / 非图片）不拖累其余，静默跳过并计数 */
          skipped += 1
        }
      }

      if (added.length) setAttachments(prev => [...prev, ...added])
      if (imagesDropped > 0) {
        toast.error("图片超出数量上限", {
          description: `本轮仅添加 ${imagesAdded} 张（上限 ${MAX_SENDER_IMAGES}），请先移除几张再试`,
        })
      }
      if (skipped > 0) {
        toast.error("部分图片已跳过", { description: `${skipped} 张无法读取` })
      }
    },
    [attachments, sessionId]
  )

  const onSelectFiles: React.ChangeEventHandler<HTMLInputElement> = e => {
    const files = Array.from(e.currentTarget.files || [])
    // 先清空 value：同一张图连选两次也要触发 change
    e.currentTarget.value = ""
    void appendFiles(files)
  }

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }, [])

  /** 粘贴：剪贴板里带图才接管；纯文字**必须放行**给 textarea（preventDefault 会连文字一起吞掉） */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files = pickFilesFromClipboard(e.clipboardData)
      if (files.length === 0) return
      e.preventDefault()
      void appendFiles(files)
    },
    [appendFiles]
  )

  /** 当前生效的模型名（判断"这个模型看不看得懂图"）—— 与发消息时的解析口径一致 */
  const currentModelName = useCallback(() => {
    if (selectedModel) {
      return selectedModel.startsWith("custom-") ? customModel?.modelId || "" : selectedModel
    }
    try {
      return JSON.parse(localStorage.getItem("ai-settings") || "null")?.model || ""
    } catch {
      return ""
    }
  }, [selectedModel, customModel])

  /** 非视觉模型就直接说清楚：否则图发出去、模型只看到一句空文本，用户会以为"AI 不肯看图"。
      服务端也有一层降级（/api/chat 的 isVLMModel 分支），这里只是提前告知，不阻断发送。 */
  const notifyIfModelBlind = useCallback(() => {
    const modelName = currentModelName()
    if (modelName && !isVLMModel(modelName)) {
      toast.info("图片已加入，但当前模型可能不支持看图", {
        description: "可在顶栏切换到视觉模型（如 qwen-vl 系列）后再发送",
      })
    }
  }, [currentModelName])

  /**
   * 屏幕捕获 —— **兜底路径**，只在划选截图拍不出底图时才走。
   * 拍的是真实合成像素（连 `<video>` 当前帧都在），代价是要过一次浏览器原生
   * 「选择要共享的内容」弹窗 —— 正是用户不想要的那一步，所以不做默认。
   */
  const handleScreenCapture = useCallback(async () => {
    const res = await captureScreen({ name: "screenshot", hideSelectors: CAPTURE_HIDE_SELECTORS })
    if (res.ok) {
      await appendFiles([res.file])
      notifyIfModelBlind()
      return
    }
    if (res.reason === "unsupported") {
      toast.error("当前浏览器不支持屏幕捕获", { description: "请使用 Chrome / Edge 桌面浏览器" })
    } else if (res.reason === "failed") {
      toast.error("屏幕捕获失败，请重试")
    }
    /* cancelled：用户自己按的取消，静默 */
  }, [appendFiles, notifyIfModelBlind])

  /** 收起遮罩（确认 / 取消 / Esc 共用）—— 顺便把滚动冻结还回去 */
  const closeRegionShot = useCallback(() => {
    setRegionShot(null)
    freezeReleaseRef.current?.()
    freezeReleaseRef.current = null
  }, [])

  /**
   * 截图（主路径）：先把页面拍成一张「冻住的底图」，再交给划选遮罩
   * —— 点一下就能直接拉框，没有授权弹窗。裁剪与坐标换算全在 util 里，
   * 这里只负责"拍图 → 挂遮罩 → 收矩形"。
   */
  const handleScreenshot = useCallback(async () => {
    if (capturing || regionShot) return
    setCapturing(true)
    // 先冻住滚动（见 freezeReleaseRef 注释）：必须在拍图之前，让底图与遮罩同宽
    freezeReleaseRef.current?.()
    freezeReleaseRef.current = freezePageScroll()
    try {
      const snapshot = await snapshotPage({ hideSelectors: CAPTURE_HIDE_SELECTORS })
      if (!snapshot) {
        /* 拍不出底图（跨域图片污染画布等）→ 别只报错了事，给一条走得通的路 */
        closeRegionShot()
        toast.error("这个页面没法像素级截图", {
          description: "页面含跨域内容，重绘会被浏览器拦下。可改用屏幕捕获。",
          action: { label: "屏幕捕获", onClick: () => void handleScreenCapture() },
        })
        return
      }
      setRegionShot({
        snapshot,
        /* 底图在遮罩上只当"冻住的页面"看，JPEG 足够；真正的裁剪用原始画布，不吃这份压缩 */
        backgroundImage: snapshot.canvas.toDataURL("image/jpeg", 0.86),
      })
    } catch (e) {
      /* snapshotPage 自己已经把失败原因吞掉并返回 null；能落到这里说明是更外层的意外
         （比如 canvas.toDataURL 抛异常）。别把异常抛回 onClick —— 那会变成
         unhandled rejection，用户只看到"点了没反应"。 */
      closeRegionShot()
      console.warn("[copilot] 划选截图进入失败：", e)
      toast.error("截图失败，请重试")
    } finally {
      setCapturing(false)
    }
  }, [capturing, regionShot, handleScreenCapture, closeRegionShot])

  /** 划选完成（双击 / ✓）→ 裁剪选区 → 进附件 */
  const handleRegionConfirm = useCallback(
    async (rect: RegionRect) => {
      const shot = regionShot
      // 先收遮罩：裁剪是同步的像素操作，没必要让用户盯着暗屏等
      closeRegionShot()
      if (!shot) return
      const file = await cropRegionToFile(shot.snapshot, rect)
      if (!file) {
        toast.error("裁剪失败，请重试")
        return
      }
      await appendFiles([file])
      notifyIfModelBlind()
    },
    [regionShot, appendFiles, notifyIfModelBlind, closeRegionShot]
  )

  const handleSend = useCallback(
    (text: string) => {
      // 有图就算有内容（截完直接发是常态，不该被"请输入内容"挡住）
      if (!text.trim() && attachments.length === 0) return
      /* 🛑 后端正挂起等用户输入（澄清表单 / 检查点）：
         用户在输入框里打字 = 对那张表单的回答 → 必须送回同一条 SSE，
         否则 Agent Loop 会干等到 5 分钟超时（这正是「回答完需求后 AI 不说话」）。
         注意闸门顺序：awaitingInput 要排在 isLoading 之前 —— 等待期间 isLoading 恒为 true。 */
      if (awaitingInput) {
        void respondToInput(text, { echo: true })
        setInput("")
        setAttachments([])
        return
      }
      if (isLoading) return
      void send(text, attachments)
      setInput("")
      /* 附件此刻已经进了 userMsg 的 content，输入区的缩略图可以撤了 */
      setAttachments([])
    },
    [send, respondToInput, awaitingInput, attachments, isLoading]
  )

  /** 窗口控制：放大/还原 */
  const toggleSize = useCallback(() => {
    setSize(s => (s === "normal" ? "large" : "normal"))
  }, [])

  /** 窗口控制：全屏 → 跳转 AI 助手完整对话页 */
  const goFullAssistant = useCallback(() => {
    router.push("/ai-assistant")
  }, [router])

  /* ── 顶栏图标点击染色（点一下亮绿，短暂保持后褪回） ── */
  const [tintKey, setTintKey] = useState<string | null>(null)
  const tintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTint = useCallback((key: string) => {
    setTintKey(key)
    if (tintTimerRef.current) clearTimeout(tintTimerRef.current)
    tintTimerRef.current = setTimeout(() => setTintKey(null), HEADER_TINT_HOLD)
  }, [])
  useEffect(() => () => { if (tintTimerRef.current) clearTimeout(tintTimerRef.current) }, [])

  /**
   * 顶栏操作键清单（顺序对齐参考稿；「全屏」为项目保留能力追加于关闭键之前）。
   *
   * `active` 有值是「状态型」键 —— 染色跟随状态常亮；无值是「动作型」，点击后短暂染色。
   */
  const headerActions: {
    key: string
    title: string
    icon: React.ComponentType<IconProps>
    onClick: () => void
    active?: boolean
    close?: boolean
  }[] = [
    { key: "new", title: "新对话", icon: IconCommentAdd, onClick: () => { flashTint("new"); reset() } },
    { key: "history", title: "历史对话", icon: IconHistory, onClick: () => { flashTint("history"); goFullAssistant() } },
    {
      key: "panel",
      title: size === "normal" ? "放大面板" : "还原面板",
      icon: IconSidebarPanel,
      onClick: toggleSize,
      active: size === "large",
    },
    { key: "full", title: "全屏", icon: IconFullScreen, onClick: () => { flashTint("full"); goFullAssistant() } },
    /* 设置入口（2026-09-27 加）：侧栏常驻在 看板/监控/设备控制 三页，用户在这儿想让 AI
       干活、顺手想调「沉浸光感」的时候，不必再绕去 AI 助手页。落地在「外观」分区。
       —— 弹窗本体是全局宿主里那一份（components/settings/global-settings-host.tsx），
          本组件不持有它的开关状态。 */
    { key: "settings", title: "设置", icon: IconSetting, onClick: () => { flashTint("settings"); openSettings("appearance") } },
    { key: "close", title: "关闭", icon: IconClose, onClick: handleClose, close: true },
  ]

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
      /**
       * 🛑 澄清卡 / 检查点卡的提交通道 → 送回**挂起中的 Agent Loop**（同一条 SSE）。
       *
       * 缺这一项时 renderer 会降级成 `onSendMessage`：而等待输入期间 isLoading 恒为 true，
       * handleSend 第一道闸门就把调用丢掉 —— 卡片点了等于没点，后端挂到 5 分钟超时。
       * 用户报的「ask_user_question 答完 AI 不继续」就是这个断点。
       */
      onRespondToCheckpoint: (replyText: string) => {
        void respondToInput(replyText)
      },
      onSetInput: setInput,
    }),
    [deviceData, approvalMode, enableReasoning, isLoading, handleExecuteCommand, handleSend, respondToInput]
  )

  const empty = messages.length === 0

  /* ===== 悬浮球（收起态）—— 莓果 IP 状态机入口 ===== */
  /* opening 阶段球继续存在但收缩消散：视觉上「面板是从球里长出来的」，不是球消失+窗口凭空出现 */
  const fab = (phase === "closed" || phase === "opening") && (
    <CopilotBerryFab
      dark={dark}
      /* 通话中 / AI 生成中 → 球体内部流光 + 呼吸光环加速（脸保持不动） */
      thinking={isLoading || inCall}
      boopKey={boopKey}
      leaving={phase === "opening"}
      onActivate={() => setOpen(true)}
    />
  )

  /**
   * ===== 开合编排：clip-path 从球心（面板右下角）向左上揭示 =====
   * 不用整体 scale：全高侧栏被 scale 会把内容一起拉扁，观感廉价。
   * clip-path inset 只裁切不形变，内容原地渐显，圆角 26 → 10 同步收敛。
   */
  const panelW = size === "normal" ? GEO.width : GEO.widthLarge
  const panelH = Math.max(viewportH - GEO.inset * 2, 0)
  const clipAtBall = viewportH
    ? `inset(${Math.max(panelH - (COPILOT_FAB.SIZE - 6), 0)}px 0px 0px ${Math.max(panelW - (COPILOT_FAB.SIZE - 6), 0)}px round 26px)`
    : undefined
  const clipFull = viewportH ? "inset(0px 0px 0px 0px round 10px)" : undefined

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
        token: {
          colorPrimary: "#059669",
          borderRadius: 10,
          /**
           * 🚨 面板本身是 `z-[1290]`（必须压过 antd Modal 1000 / 接入弹窗 1100），
           * 而 antd 的 Tooltip / Select / Dropdown / Suggestion 弹层是 **portal 到 body** 的，
           * 默认 `zIndexPopupBase = 1050` → 全部落在面板**后面**：hover 没提示、点「模型 / 斜杠命令」
           * 看着像「点不开」。这里整体抬到 1300（panel + 10），面板内所有浮层才在面板之上。
           */
          zIndexPopupBase: 1300,
        },
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      {fab}

      {/* 划选截图遮罩（拉框 → 截那一块）。组件内部 portal 到 body —— 侧栏根节点的
          backdrop-filter 会另建包含块，就地渲染的全屏 fixed 层会被裁成侧栏那一小块。 */}
      {regionShot && (
        <RegionScreenshotOverlay
          snapshot={regionShot.snapshot}
          backgroundImage={regionShot.backgroundImage}
          dark={dark}
          onCancel={closeRegionShot}
          onConfirm={(rect) => void handleRegionConfirm(rect)}
        />
      )}

      {/* ===== AI 正在操作画布/设备的屏幕边缘光效（不遮挡内容，pointer-events:none）
          组件挂在**当前页**的侧栏上 → 「用户所在的页面」自然就是被点亮的那一页。
          tone：改画布=思维蓝紫粉；控设备=电光青蓝渐变（刻意避开品牌绿，见组件注释）===== */}
      <CanvasActivityGlow
        active={!!clientToolActivity}
        label={clientToolActivity?.label}
        phase={clientToolActivity?.phase}
        tone={clientToolActivity?.kind === "device" ? "device" : "think"}
        dark={dark}
      />

      <AnimatePresence>
        {open && (
          <motion.aside
            key="copilot-sidebar"
            initial={{
              opacity: clipAtBall ? 0.55 : 0,
              clipPath: clipAtBall ?? "inset(0px 0px 0px 0px round 10px)",
            }}
            /* 开：clip-path 从球位揭示（内容原地渐显，零形变）
               关：clip-path 反向塌缩会在主线程逐帧重绘整块面板、并把内容裁成一条 → 卡顿感。
                   改为 transform + opacity 向球心缩放淡出（合成器直出），clipPath 保持全开。 */
            animate={{ opacity: 1, clipPath: clipFull ?? "inset(0px 0px 0px 0px round 10px)" }}
            exit={{
              /* opacity 走关键帧：前 60% 保持不透，最后 40% 才淡尽，
                 让「缩到接近球位」先发生，避免面板先消失再缩完 */
              opacity: [1, 1, 0],
              scale: 0.9,
              x: 6,
              clipPath: clipFull ?? "inset(0px 0px 0px 0px round 10px)",
              transition: {
                duration: 0.34,
                ease: [0.4, 0, 0.2, 1],
                opacity: { duration: 0.34, times: [0, 0.6, 1], ease: "easeOut" },
              },
            }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            /* 2026-09-26：接 HDS 沉浸光感 ULTRA 档（官方定义 = 弹层 / 对话框那一档：
               最实的一档，先把可读性钉死，再谈通透）。有内容的对话态直接吃材质的
               --mat-bg / 边光 / 阴影；空态额外叠一层带 alpha 的氛围渐变（见 heroBg* 注释）。
               ⚠️ 别改成 regular/thick：那是给「铺在页面内容上的卡片」用的，
                  套在满屏高、又承载长对话的浮层上，背景一流动字就糊了。 */
            className={`dc-mat dc-mat--ultra fixed z-[1290] flex flex-col overflow-hidden${dark ? " copilot-dark" : ""}`}
            style={{
              top: GEO.inset,
              right: GEO.inset,
              bottom: GEO.inset,
              width: size === "normal" ? GEO.width : GEO.widthLarge,
              maxWidth: `calc(100vw - ${GEO.inset * 2}px)`,
              /* 空态：参考稿那支「顶白 → 下浅蓝」渐变（已降 alpha 让材质透出来）；
                 对话态：不写 inline background —— 交给 dc-mat--ultra 的半透材质底，
                 面板底色由此随主题走（浅色 .62 白 / 暗色 rgba(66,66,76,.78) 叠白）。 */
              background: empty ? (dark ? heroBgDark : heroBgLight) : undefined,
              /* 2026-09-25 用户反馈「sender 后面还有一层白底」：那是欢迎页渐变只铺在
                 消息区、输入区露出面板白底造成的「白卡」观感。现在渐变上移到面板根
                 节点铺满全高，sender 直接浮在氛围渐变上（对齐参考稿，无白色断层）。 */
              /* 参考稿实测的「内容左右留白」= 22px，下方 = 14px。
                 挂在面板根节点上 → 欢迎页标题 / 推荐条 / 输入胶囊三者共用同一左边缘，
                 做到参考稿那种严格对齐（下传给 ChatSenderInput 的两个变量）。 */
              ["--sender-inset" as string]: "22px",
              ["--sender-inset-y" as string]: "14px",
              /* 描边与阴影交给 dc-mat--ultra：它自带 1px 受光边 + 浮起阴影 + 内缘光
                 （「环境光沿边缘柔和流转」）。这里若再写 inline border / box-shadow，
                 inline 优先级高会把材质的边光整条盖掉 —— 材质等于白挂。 */
              borderRadius: GEO.radius,
              fontFamily:
                'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
              pointerEvents: phase === "closing" ? "none" : "auto",
              /* Closing：缩放锚在悬浮球球心（右下角），面板被吸回球里 */
              transformOrigin: "calc(100% - 42px) calc(100% - 42px)",
              willChange: "transform, opacity",
            }}
            data-copilot-page={pageKey}
            data-copilot-size={size}
            data-copilot-closing={phase === "closing" ? "true" : undefined}
          >
            {/* 2026-09-27 用户要求：去掉面板顶部那条 4px 品牌渐变条。
                顶栏改为直接与面板同底 —— 面板已挂 dc-mat--ultra 材质（自带 1px 受光边），
                再叠一条实色渐变条会把那道受光边整条盖掉，视觉上「窗框」感过重。
                BRAND_GRADIENT 常量保留：欢迎页标题字（TITLE_GRADIENT）仍属同一色系，
                需要还原时把下面这段注释放开即可。
              <div data-copilot-gradient style={{ height: 4, flexShrink: 0, background: BRAND_GRADIENT }} />
            */}

            {/* 关闭动画期间摘掉玻璃模糊：backdrop-filter 在 transform 收拢时逐帧重采样最贵，会拖慢收拢。
                ⚠️ 2026-09-26：面板自身也挂了 ULTRA 材质后必须连它一起禁 —— 原来只写了
                   `[closing] *`（后代选择器），而面板是那个**带 64px 模糊的最大一层**，
                   收拢时它仍在逐帧重采样整屏，正是最贵的那一个。 */}
            <style>{`
              [data-copilot-closing="true"], [data-copilot-closing="true"] * { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
            `}</style>

            {/* ===== 顶栏：模型选择器 + 窗口控制 ===== */}
            <motion.div
              data-copilot-header
              /* 内容错峰淡入：顶栏 → 消息区 → 输入区，跟着 clip-path 揭示走 */
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2, transition: { duration: 0.14, ease: "easeOut" } }}
              transition={{ duration: 0.26, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              style={{
                height: GEO.headerHeight,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: HEADER_ACTION_GAP,
                padding: "0 10px 0 12px",
                /* 2026-09-27 用户要求：去掉顶栏底下那条分割线。
                   去掉后顶栏与消息区之间靠间距与内容自身分组区分
                   （面板整体是同一层容器 —— 见「一层容器」原则 rule 42）。 */
              }}
            >
              <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
                <DynamicModelSelector value={selectedModel} onValueChange={handleModelChange} />
              </div>
              {headerActions.map(a => {
                /**
                 * 染色规则：
                 * - 状态型（面板放大中 / 全屏页）：跟着状态常亮，让用户一眼看出「现在是这个态」
                 * - 动作型（新对话 / 历史 / 关闭）：点击后保持 HEADER_TINT_HOLD 再褪回
                 */
                const steady = a.active === true
                const tinted = steady || tintKey === a.key
                return (
                  <button
                    key={a.key}
                    type="button"
                    title={a.title}
                    aria-label={a.title}
                    aria-pressed={a.active === undefined ? undefined : a.active}
                    data-header-action={a.key}
                    data-tinted={tinted ? "true" : undefined}
                    onClick={a.onClick}
                    style={a.close ? closeBtnStyle(dark) : actionBtnStyle(dark, tinted)}
                    onMouseEnter={e => {
                      if (a.close) { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.16)" : "#e8e8e8"; return }
                      if (!tinted) e.currentTarget.style.background = dark ? "#27272a" : "#f4f4f5"
                    }}
                    onMouseLeave={e => {
                      if (a.close) { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.10)" : "#f2f2f2"; return }
                      if (!tinted) e.currentTarget.style.background = "transparent"
                      e.currentTarget.style.transform = "scale(1)"
                    }}
                    onMouseDown={e => { e.currentTarget.style.transform = "scale(0.88)" }}
                    onMouseUp={e => { e.currentTarget.style.transform = "scale(1)" }}
                  >
                    {a.close ? (
                      <a.icon size={HEADER_CLOSE_ICON_SIZE} />
                    ) : (
                      <a.icon size={HEADER_ICON_SIZE} />
                    )}
                  </button>
                )
              })}
            </motion.div>

            {/* ===== 提示条（仅空态，可关闭 —— 参考图 banner 位） ===== */}
            {empty && bannerOpen && !inCall && (
              <div
                data-copilot-banner
                /* HDS 沉浸光感 THIN 档：面板内的薄浮层 / 小控件层。
                   它压在已半透的面板之上，能一路透到业务页内容 → 这里是整个面板里
                   「吸光」最明显的一处。替代原先手写的 rgba(255,255,255,.6) + blur(14px)
                   （各页手写玻璃已全部收敛到共享材质源，别再复制粘贴那一套）。 */
                className="dc-mat dc-mat--thin"
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
            <motion.div
              ref={listWrapRef}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4, transition: { duration: 0.16, ease: "easeOut" } }}
              transition={{ duration: 0.28, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className={`copilot-scroll copilot-bubbles${size === "normal" ? " copilot-narrow" : ""}`}
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                /* 渐变已上移到面板根节点（见 aside background 注释），这里保持透明即可透上来 */
                background: "transparent",
              }}
            >
              <style>{`
                /* 滚动条交回全站统一段（原 6px / #d4d4d8 私有定义已删，2026-10-11） */
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
                .copilot-row:hover { background: #EEF0F4 !important; }
                .copilot-row:hover .copilot-row-arrow { transform: translateX(3px); color: #059669; }
                .copilot-row-arrow { transition: transform .18s ease, color .16s ease; }
                .copilot-tile:hover { border-color: rgba(147,197,253,0.9) !important; background: rgba(255,255,255,0.78) !important; transform: translateY(-1px); }
                .copilot-dark .copilot-row:hover { background: rgba(255,255,255,0.11) !important; }
                .copilot-dark .copilot-tile:hover { border-color: #52525b !important; background: rgba(63,63,70,0.7) !important; }
                .copilot-dark .copilot-row:hover .copilot-row-arrow { color: #a1a1aa; }
              `}
              {COPILOT_NARROW_CSS}
            </style>

              {empty ? (
                /* ===== 欢迎页（参考阿里云在线服务弹窗版式 · 蓝色拟态磨砂玻璃背景） ===== */
                <>
                  <HeroBlobs dark={dark} />
                  <div
                    data-copilot-hero
                    /* 2026-09-25 三轮像素量测后 1:1 对齐用户参考稿（华为 AI 助手开屏）：
                       实测结论（DPR=2 折算 CSS px）——
                         · hero 区**没有头像**，直接从大标题第一行开始
                         · 标题距面板顶 124px（= 4px 渐变条 + 48px 顶栏 + 51px 空态提示条 + 21px 留白）
                         · 标题 28px/800、行高 35.5px、两行、左对齐、纯深色
                         · 标题第二行底 → 推荐条顶 = 27px
                         · 推荐条 42px 高 / 间距 8px / 圆角 8px / 字号 15px / 左内距 14px
                         · 标题、推荐条、sender 三者**左边缘对齐**（同为容器 16px 内距）
                       内容一个不少（欢迎词 / 推荐问题 / 跳转行 / 三宫格全保留）。 */
                    style={{
                      position: "relative",
                      zIndex: 1,
                      width: "100%",
                      maxWidth: 460,
                      margin: "0 auto",
                      /* 21px = 124 − (4 渐变条 + 48 顶栏 + 51 提示条)：默认态（提示条在）
                         标题正好落在参考稿的 124px；关掉提示条后上留白变 72px，仍然透气。
                         🚨 2026-09-27 去掉 4px 渐变条 → 参考稿的 124px 首行基线要减 4：
                         从 21px 收到 17px，让标题仍落在面板顶往下约 124px 处。
                         左右也用 --sender-inset(22px) → 标题 / 推荐条 / 输入胶囊严格同一条左边缘。 */
                      padding: "17px var(--sender-inset, 16px) 26px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                    }}
                  >
                  {/* 标题：两行同字号（对齐参考稿「嗨，xxx / 请问有什么可以帮您?」版式） */}
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      letterSpacing: 0.2,
                      lineHeight: 1.27,
                      color: dark ? "#f4f4f5" : "#0A0A0A",
                      textAlign: "left",
                    }}
                  >
                    您好，欢迎使用
                    <span
                      data-copilot-brand
                      style={{
                        background: TITLE_GRADIENT,
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      莓小智
                    </span>
                  </div>
                  <div
                    data-copilot-question
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      letterSpacing: 0.2,
                      lineHeight: 1.27,
                      color: dark ? "#f4f4f5" : "#0A0A0A",
                      textAlign: "left",
                    }}
                  >
                    请问有什么可以帮您?
                  </div>

                  {/* 推荐问题浅色条 + 跳转 AI 助手 */}
                  <div
                    data-copilot-rows
                    style={{
                      marginTop: 27,
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {cfg.suggestions.map(s => (
                      <button
                        key={s}
                        type="button"
                        className="copilot-row"
                        onClick={() => handleSend(s)}
                        /* 参考稿版式：无边框、浅色玻璃底的纯文字圆角条（不带箭头） */
                        style={{
                          width: "100%",
                          minHeight: 42,
                          display: "flex",
                          alignItems: "center",
                          padding: "0 14px",
                          /* 参考稿实测：条底 rgb(248,248,250) 压在 rgb(253,254,255) 氛围底上 —— 比底略暗一层。
                             用**实色**而非半透灰：否则本页的紫蓝氛围底会透上来把条染成紫色（参考稿是中性灰白）。 */
                          background: dark ? "rgba(255,255,255,0.06)" : "#F6F7F9",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 15,
                          color: dark ? "#f4f4f5" : "#191919",
                          cursor: "pointer",
                          textAlign: "left",
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s}
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
                        minHeight: 42,
                        display: "flex",
                        alignItems: "center",
                        padding: "0 14px",
                        background: dark ? "rgba(255,255,255,0.06)" : "#F6F7F9",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 15,
                        color: dark ? "#f4f4f5" : "#191919",
                        cursor: "pointer",
                        textAlign: "left",
                        lineHeight: 1.5,
                      }}
                    >
                      <span>去 AI 助手，开启完整对话</span>
                    </button>
                  </div>

                  {/* 页面欢迎词：参考稿顶部只有「问候 + 提问」两行，为保持 1:1 版式，
                      把页面专属欢迎词下沉到「去 AI 助手」行之后（内容不丢，只是不占标题位）。
                      2026-09-25 用户要求：删掉知识库/订阅方案/使用指南三宫格，欢迎页只留
                      标题 + 推荐条 + 跳转行 + 欢迎词。 */}
                  <div
                    data-copilot-greeting
                    style={{
                      marginTop: 14,
                      fontSize: 12.5,
                      lineHeight: 1.75,
                      color: dark ? "#71717a" : "#8b8b95",
                      textAlign: "left",
                      maxWidth: 340,
                    }}
                  >
                    {cfg.greeting}
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
            </motion.div>

            {/* ===== 输入区（✅ 复用 ai-assistant 的输入框组件）／通话态换成点阵声波条 ===== */}
            {inCall ? (
              <CopilotCallFooter
                dark={dark}
                isUser={call.live.isUser}
                muted={callMuted}
                onToggleMute={() => call.setMuted?.(!callMuted)}
                onHangUp={call.hangUp}
              />
            ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6, transition: { duration: 0.18, ease: "easeOut" } }}
              transition={{ duration: 0.28, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
              /* 2026-09-25 用户要求：去掉输入区上方那条全宽分割线（以及它带来的「直角矩形」外壳感）。
                 现在输入区**没有自己的背景、没有边框**，sender 直接浮在面板上，
                 靠自身的玻璃/柔光与上方内容区分（对齐参考稿：悬浮胶囊，不是嵌进一条栏里）。 */
              /* 左右/下留白由面板根节点的 --sender-inset(22px)/--sender-inset-y(14px) 统一注入 */
              style={{ flexShrink: 0 }}
            >
              {/* ── 窄面板（400px）下的 sender 工具栏微缩（2026-09-27）───────────────
                  病因（历史）：展开态工具栏在 400px 侧栏里「+ 深度思考 研究 权限 通话 发送」
                  五键合计吃掉整条胶囊宽度（实测左侧簇 298.9px + 右簇 31px / 可用 330px
                  = 0 余量），控件互相顶死、贴到外壳边，观感就是「UI 被挤出去」。
                  🚨 2026-10-14：真正的病根已从源头摘掉 —— 侧栏传了 hideAbilityToggles
                  （「深度思考 / 研究」不再渲染）+ voicePlacement="right"（语音变纯图标挪到
                  右簇），现在左簇只剩 `+ / 截图 / 权限`，余量充足。下面这条微缩规则只对
                  「权限」这类非 icon chip 生效，留作兜底（将来有人再往左簇加件也不会顶死）。
                  处方：只在「normal 尺寸面板」内把每个 chip 的字号/内距微缩一档
                  （13px → 12.5px、横向内距 9 → 7px），四颗共省约 20px 余量；
                  放大态（720px）完全不受影响，主助手页也零影响。
                  🚨 只缩视觉，不动任何功能节点/props/handler。 */}
              <style>{`
                /* 🚨 2026-09-29 「+」加了 sender-chip 后会被这条规则左右各吃 7px 内距，
                   28px 圆里只剩 14px 内容宽 —— 实测把 16px 的加号挤成 14×16（非等比变形）。
                   所以这里排除纯图标钮（.sender-chip--icon），内距由它自己的 28×28 决定。 */
                aside[data-copilot-page][data-copilot-size="normal"] .sender-immersive .ant-sender-footer .sender-chip:not(.sender-chip--icon) {
                  padding-left: 7px !important;
                  padding-right: 7px !important;
                  font-size: 12.5px !important;
                  gap: 4px !important;
                }
                /* 🚨 2026-09-29 排除纯图标钮（「+」没有文字，13px 会在 28px 圆里发虚） */
                aside[data-copilot-page][data-copilot-size="normal"] .sender-immersive .ant-sender-footer .sender-chip:not(.sender-chip--icon) svg {
                  width: 13px !important;
                  height: 13px !important;
                }
              `}</style>
              <CopilotSender
                input={input}
                setInput={setInput}
                /* 语音输入（2026-10-24）：本地/浏览器识别，说话变草稿。
                   与右簇那枚「语音通话」不是一回事 —— 那个是实时对话，这个是语音打字。 */
                enableVoiceInput
                onSend={handleSend}
                /* 🛑 等用户填表期间**不算 streaming**：发送键要回到「发送」，
                   用户才能直接在输入框里回答（走 respondToInput 送回同一条流）。
                   若这里仍传 true，发送键会变成「停止」，打字回答的路径就被堵死了。 */
                isLoading={isLoading && !awaitingInput}
                attachments={attachments}
                onSelectFiles={onSelectFiles}
                onRemoveAttachment={removeAttachment}
                onPaste={handlePaste}
                onDropFiles={(files) => void appendFiles(files)}
                enableReasoning={enableReasoning}
                setEnableReasoning={setEnableReasoning}
                enablePlanning={enablePlanning}
                setEnablePlanning={setEnablePlanning}
                enableSearch={enableSearch}
                setEnableSearch={setEnableSearch}
                onCancel={stop}
                darkMode={dark}
                approvalMode={approvalMode}
                setApprovalMode={setApprovalMode}
                /* 截图入口（2026-10-14）—— 紧挨「+」，两者同族：都是「往这条消息里加一张图」。
                   形态刻意做成**纯图标钮**（.sender-chip--icon）：
                   ① 窄面板（400px）的工具栏本就零余量，加文字必挤爆；
                   ② 「+」就是 28px 纯图标，两枚并排成一组，观感上是「加东西」的两兄弟。
                   点击后进入**划选截图**：页面冻住变暗，拖拽划出区域再双击确认。 */
                screenshotSlot={
                  <button
                    type="button"
                    title={capturing ? "正在生成底图…" : "截图：拖拽划选要截的区域"}
                    aria-label="截图"
                    data-copilot-screenshot
                    data-capturing={capturing ? "true" : undefined}
                    disabled={capturing}
                    onClick={() => void handleScreenshot()}
                    className="sender-chip sender-chip--icon"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      padding: 0,
                      borderRadius: 999,
                      border: "none",
                      background: "transparent",
                      flexShrink: 0,
                      /* 正在生成底图期间图标转品牌绿：拍图要几百毫秒，给一个静默反馈 */
                      color: capturing
                        ? (dark ? "#34D399" : "#059669")
                        : dark ? "#a1a1aa" : "#71717A",
                      cursor: capturing ? "default" : "pointer",
                      transition: "color 0.2s ease",
                    }}
                  >
                    <IconCamera size={16} strokeWidth={2} />
                  </button>
                }
                /* 语音入口：给莓小智打电话
                   🚨 2026-10-14 工具栏精简（用户：「sender 太乱太丑了」+ 参考稿）：
                   ① 不再渲染「深度思考 / 研究」两枚 chip —— 联网检索改由
                      「+ → 联网搜索」切换，深度思考本就默认常开；
                   ② 语音用**麦克风纯图标钮**，落在右簇、发送键左侧 —— 对齐参考稿
                      （一排只剩「加东西 / 语音 / 发送」，右侧麦克风 + 发送同组）。
                   ⚠️ 语音 icon 必须挂 .sender-chip--icon：窄面板那条压缩规则会把
                   非 icon chip 的 padding/font-size 各压一档，28px 圆里图标会发虚。

                   🚨 2026-10-24 **这个入口已撤**（用户：「你没发现给他打电话的那个按钮
                   跟语音转写的按钮是一样的吗？」）：
                   右簇里并排两枚 28px 麦克风 —— 一枚打电话、一枚语音打字 ——
                   长得一模一样，用户没法分辨该点哪个。与 AI 助手同一条定调：
                   语音只留一个入口，那个是 `enableVoiceInput`（本地持续转写）。
                   所以这里不再传 voiceSlot：右簇只剩「语音输入 + 发送」两件。
                   ⛔ 别把麦克风加回来 —— 要恢复通话请换成 IconPhone 之类的**另一种**图标，
                      并先想清楚它跟语音打字在观感上怎么区分。
                   ✅ `useCopilotCall()` 与通话浮层（本文件上方 ~1337 行）逻辑一行未动，
                      通话状态机仍然完整，将来挂新入口即可复用。 */
              />
            </motion.div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </ConfigProvider>
  )
}

/**
 * 顶栏普通操作键（新对话 / 历史 / 面板 / 全屏）。
 * 尺寸与配色对齐参考稿：图标色 #666666（实测），悬停出现浅灰圆角底。
 *
 * `tinted` = 点击染色态 / 状态常亮态：图标转品牌宝石绿并带极淡绿底，
 * 让「刚点了这个」和「当前处于这个态」在一眼之内可辨。
 */
function actionBtnStyle(dark: boolean, tinted: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "none",
    background: tinted ? (dark ? "rgba(0,148,86,0.22)" : "rgba(0,148,86,0.10)") : "transparent",
    color: tinted ? (dark ? "#34D399" : HEADER_TINT) : dark ? "#a1a1aa" : "#666666",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
    transform: "scale(1)",
    transition: "background 0.18s ease, color 0.18s ease, transform 0.12s cubic-bezier(0.16,1,0.3,1)",
  }
}

/**
 * 顶栏关闭键 —— 参考稿为「浅灰圆底 + 深色叉」，且灰底常驻（非仅悬停）。
 * 底色 #f2f2f2（实测 rgb(242,242,242)）/ 暗色下用 10% 白。
 */
function closeBtnStyle(dark: boolean): React.CSSProperties {
  return {
    width: HEADER_CLOSE_BOX,
    height: HEADER_CLOSE_BOX,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    border: "none",
    background: dark ? "rgba(255,255,255,0.10)" : "#f2f2f2",
    color: dark ? "#fafafa" : "#18181b",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
    transition: "background 0.15s ease",
  }
}
