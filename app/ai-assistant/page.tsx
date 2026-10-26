"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Image } from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { ConfigProvider, App, theme, Segmented, Button as AntButton, Menu, Avatar as AntAvatar, Layout as AntLayout, Space, Tooltip, Dropdown, Modal, Input, Drawer, Flex, Progress, Popover, Divider, notification } from "antd"
import type { ConversationsProps } from "@ant-design/x"
import { Conversations } from "@ant-design/x"
import zhCN from "antd/locale/zh_CN"
import type { UserPublic } from "@/lib/db/user-service"
import { deviceForgeStore, parseDeviceForgeCardData } from "@/lib/state/device-forge-store"
import { AtSign } from "@/components/animate-ui/icons/at-sign";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandInput as CommandInputUI, CommandItem, CommandList } from "@/components/ui/command"
import { IconArrowRightUp, IconAttention, IconBackgroundColor, IconBookOpen, IconBookshelf, IconBrain, IconCamera, IconCaution, IconChartHistogram, IconChartLine, IconCheckOne, IconCommentAdd, IconCommentDashed, IconCompass, IconCopy, IconCpu, IconCrown, IconDelete, IconDown, IconDownload, IconFileSearch, IconFileText, IconFolderOpen, IconFolderUpload, IconFullScreen, IconGlobe, IconGridFour, IconHelp, IconInfo, IconLayoutTwo, IconLightning, IconLinkOut, IconList, IconListCheckbox, IconLoading, IconLock, IconMagicWand, IconMonitor, IconMoon, IconMore, IconNotebook, IconPause, IconPencil, IconPhone, IconPicture, IconPin, IconPlay, IconPlusCross, IconPreviewOpen, IconRefresh, IconRight, IconRound, IconSearch, IconSeedling, IconSettingTwo, IconShare, IconSignal, IconSun, IconThunderbolt, IconTime, IconTool, IconUndo, IconUp, IconVoiceOff, IconVolumeMute, IconVolumeNotice, IconWallet } from "@/components/icon";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false })
const MessageWithReport = dynamic(() => import("@/components/ai/message-with-report").then(mod => ({ default: mod.MessageWithReport })), { ssr: false })

// 额外的重型组件 — 延迟加载
const SkillStore = dynamic(() => import("@/components/ai/skill-store").then(m => ({ default: m.SkillStore })), { ssr: false })
const UnifiedExplore = dynamic(() => import("@/components/explore/unified-explore").then(m => ({ default: m.UnifiedExplore })), { ssr: false })
const VoiceChatModal = dynamic(() => import("@/components/ai/voice-chat-modal").then(m => ({ default: m.VoiceChatModal })), { ssr: false })
const LiveStreamPlayer = dynamic(() => import("@/components/live-stream-player").then(m => ({ default: m.LiveStreamPlayer })), { ssr: false })
const WebPreview = dynamic(() => import("@/components/ai/web-preview").then(m => ({ default: m.WebPreview })), { ssr: false })
const DeviceControlCard = dynamic(() => import("@/components/ai/device-control-card").then(m => ({ default: m.DeviceControlCard })), { ssr: false })
// HTMLPreviewCard 已废弃（代码产物改用 antd X 代码块交付，见 chat-message-renderer.tsx#EnhancedCodeBlock）
const BrowserActivity = dynamic(() => import("@/components/ai/browser-activity").then(m => ({ default: m.BrowserActivity })), { ssr: false })
// 对话区背景：WebGL 流动雾（three 片元着色器）—— 只在客户端跑，不参与 SSR。
// 2026-10-22 用户「不行引入那个 webgl 吧，舍弃 pixel」：PixelBlast 像素抖动已撤出本页
// （组件文件仍在，desktop-setup 的 aurora-backdrop 还在用，不要删）。
const AuroraBg = dynamic(() => import("@/components/ai/aurora-bg").then(m => ({ default: m.AuroraBg })), { ssr: false })

import { Settings as SettingsIcon } from "@/components/animate-ui/icons/settings";
import { Plus } from "@/components/animate-ui/icons/plus";
import { LogOut } from "@/components/animate-ui/icons/log-out";
// 🚨 必须 import：本文件 4 处直接使用 IS_DESKTOP_APP（2894/6416/6441/6500），
// 漏 import 编译不报错、运行时 ReferenceError 炸整页（2026-09-16 用户卡面板崩溃根因）
import { IS_DESKTOP_APP } from "@/lib/desktop-mode";
// 🪟 桌面端自绘窗口 chrome（2026-10-06 顶栏重做）：把原生菜单与 − □ ✕ 内联进本页顶栏。
// 见 components/desktop/desktop-window-chrome.tsx 顶部注释。
import {
  DESKTOP_DRAG,
  DESKTOP_NO_DRAG,
  DesktopWindowControls,
  DesktopWindowMenu,
  useDesktopHeaderHost,
} from "@/components/desktop/desktop-window-chrome";

/**
 * sender「能力 / 模式行」清单 —— 参考稿输入框那排事物的本地化对应物：
 *   快速回答 / AI 生图 / 写作 / 解题 / 深度研究 / PPT 生成 / 数据分析 / 更多
 *   ↓
 *   巡检分析 / 病虫害识别 / 环境监测 / 种植策略 / 研究
 *
 * 放模块级（而不是组件里的 useMemo）：它**完全不依赖任何 state**，写成常量
 * 就不会每次渲染新建一个数组、让 sender 里的 find 白算。
 *
 * 想「去掉一两个」（用户原话）＝直接从 `farmSkillsToModes()` 的返回里 slice，
 * 或者在这里显式列 key —— 只动这一处，sender 那边零改动。
 */
const SENDER_MODES: SenderModeItem[] = [
  ...farmSkillsToModes(),
  {
    key: "research",
    label: "研究",
    icon: <IconFileSearch size={14} />,
    /* 对齐参考稿「解题 → 输入题目，或上传题目图片」：进模式后 placeholder 就该说清楚
       这条输入要干嘛，而不是继续挂一句通用的「发送消息」。 */
    placeholder: "描述你想研究的问题，莓小智会联网检索并给出带来源的结论",
    /* 进研究模式顺带打开 web_search / deep_research 工具组（退出时自动关掉）。 */
    search: true,
  },
]
import { X } from "@/components/animate-ui/icons/x";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { Search } from "@/components/animate-ui/icons/search";
import { Sparkles } from "@/components/animate-ui/icons/sparkles";
import { ArrowUp } from "@/components/animate-ui/icons/arrow-up";
import { Paperclip } from "@/components/animate-ui/icons/paperclip";
import { ArrowRight } from "@/components/animate-ui/icons/arrow-right";
import { ArrowLeft } from "@/components/animate-ui/icons/arrow-left";
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import remarkGfm from "remark-gfm"
// html-to-image 和 jspdf 仅在下载 PDF 时使用，延迟加载
// import * as htmlToImage from 'html-to-image'
// import jsPDF from "jspdf"
import { toast } from "@/lib/ui/feedback"
// Toaster 已在全局 layout.tsx 的 ToasterWrapper 中提供，此处不再重复创建
import { motion, AnimatePresence } from "framer-motion"
import { useUserReports, type LocalSpaceReport } from "@/hooks/use-user-reports"
import {
  hasReportIntent,
  looksLikeReportHtml,
  looksLikeCodeArtifact,
  isBareHtmlArtifact,
  extractReportTitle,
} from "@/lib/ai/deliverable-classifier"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

import {
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  Conversation,
  ConversationContent,
  Loader,
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ui/assistant-ui"

import { getVoiceSettings, AISettingsDialog } from "@/components/ai-settings-dialog"
import {
  toCameraSnapshotMessages,
  type PendingCameraSnapshot,
} from "@/lib/ai/camera-snapshot"
import { OPEN_CONTEXT_PREFS_EVENT } from "@/app/ai-assistant/_components/context-compression-notice"
import type { SettingsSection } from "@/components/ai-settings-dialog"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { cn } from "@/lib/utils"
import { sanitizeHtml as sanitizeReportHtml } from "@/lib/security/sanitize-html"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { SmartPrompts } from "@/components/ai/smart-prompts"
import { ElderFriendlyToggle } from "@/components/elder-friendly-toggle"
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai/reasoning"
import { MonitorCard } from "@/components/ai/monitor-card"
import { DeviceBentoGrid } from "@/components/ai/device-bento-grid"
import { ControlBentoGrid } from "@/components/ai/control-bento-grid"
import { ScheduleCard } from "@/components/ai/schedule-card"
import { SpectralCard } from "@/components/ai/spectral-card"
import { ScheduledTasksList } from "@/components/ai/scheduled-tasks-list"
import { PageNavigation } from "@/components/page-navigation"
// VoiceChatModal — 已改为 dynamic import
import BerryOrb from "@/components/smoothui/berry-orb"
import {
  captureVideoFrame,
  getPlayableUrl,
  CameraCaptureError,
  VISION_CAMERA_ELEMENT_ID,
  type CaptureStage,
} from "@/app/ai-assistant/_utils/camera-capture"
import { MCPStatusIndicator } from "@/components/mcp/mcp-status-indicator"
import { MCPToolDisplay } from "@/components/ai/mcp-tool-display"
import { useAIFeatures } from "@/lib/hooks/use-ai-features"
import { DeviceControlDisplay } from "@/components/studio/device-control-display"
import { AutomationStrategyCard } from "@/components/automation-strategy-card"
import { type AgentStep } from "@/app/ai-assistant/_components/agent-thought-chain"
import { tryParseJsonWithRepair } from "@/components/ai/checkpoint-confirm"
import QwenVoiceInput from "@/components/ui/qwen-voice-input"
import { Qwen, DeepSeek, Moonshot, Zhipu, Minimax } from '@lobehub/icons';
import { parseScheduleTask, removeScheduleTaskTag } from '@/lib/ai/schedule-task-parser'
import { SchedulerSidebarPanel } from "@/components/ai/scheduler-sidebar-panel"
import { MySpaceSidebarPanel } from "@/components/ai/my-space-sidebar-panel"
import { KnowledgeSidebarPanel } from "@/components/ai/knowledge-sidebar-panel"
import { MedicalRecordsPanel } from "@/components/ai/medical-records-panel"
import { DeviceForgeSidebarPanel } from "@/components/ai/device-forge-sidebar-panel"
import { filterDisabledFeatures } from '@/lib/ai/prompt-templates'

// BrowserActivity, WebPreview — 已改为 dynamic import

// DeviceControlCard — 已改为 dynamic import
// HTMLPreviewCard — 已废弃删除（代码产物交付 = antd X 代码块）
import { AIControlBorderEffect } from "@/components/ai/ai-control-border-effect"
import { DynamicModelSelector } from "@/components/ai/dynamic-model-selector"
/* 能力 / 模式行：4 条种植能力与落地页首屏**同源**（farm-skills.tsx 的提示词只有一份），
   「研究」是本页特有的一条（它要顺带打开联网检索 / 深度研究工具组）。 */
import { farmSkillsToModes } from "@/components/ai/farm-skills"
import type { SenderModeItem } from "@/components/ai/sender-modes"
/* 顶栏胶囊 = 对话总结（取代原「趋势预测」入口）：
   用户开始一轮新对话时，用**他当前选择的模型**把意图压成一句话，
   既当标题（侧栏「最近对话」列表）也在顶栏常驻展示。见 lib/ai/conversation-title.ts */
import { ConversationSummary } from "@/components/ai/conversation-summary"
import { summarizeConversationTitle, fallbackConversationTitle } from "@/lib/ai/conversation-title"
import { GuardianAlertBell } from "@/components/ai/guardian-alert-bell"
import { useAIModels } from "@/lib/hooks/use-ai-models"

// LiveStreamPlayer — 已改为 dynamic import
import { ModernHomeView } from "@/components/ai/modern-home-view"
import { MateChatHome } from "@/components/ai/matechat-home"
import { CapabilitiesCard } from "@/components/ai/capabilities-card"
import type { Citation, TaskItemModel, TaskModel, Message, AISettings, SessionMeta, ChatAttachment, DocumentRef } from "@/app/ai-assistant/types"
import {
  MAX_SENDER_IMAGES,
  isImageFile,
  pickFilesFromClipboard,
  prepareImageFile,
  readFileAsDataUrl,
} from "@/app/ai-assistant/_utils/paste-image"
import { uploadDocumentFile, toDocumentRefs } from "@/app/ai-assistant/_utils/upload-document"
/** 文档产物引用（artifacts → DocumentRef）唯一源：Copilot 侧栏共用同一套口径 */
import { collectDocumentRefs, mergeDocumentRefs } from "@/lib/ai/document-artifact"
import { isVLMModel, getCanonicalSignature, isIoTCommand as checkIoTCommand, filterDisabledFeatures as filterFeatures, DEVICE_NAMES, MCP_SERVER_TOOLS, getGreetingByHour } from "@/app/ai-assistant/_utils/helpers"
import { DynamicTaskPlanner } from "@/app/ai-assistant/_components/dynamic-task-planner"
import { PremiumReportLoader } from "@/app/ai-assistant/_components/premium-report-loader"
import { ChatMessageRenderer } from "@/app/ai-assistant/_components/chat-message-renderer"
import { ChatBubbleList } from "@/app/ai-assistant/_components/chat-bubble-list"
import { ChatSenderInput } from "@/app/ai-assistant/_components/chat-sender-input"
import { DocumentPreviewDock, PreviewPanelToggle } from "@/app/ai-assistant/_components/document-preview"
import { ConversationSearch } from "@/app/ai-assistant/_components/conversation-search"
import { ShareConversationButton } from "@/app/ai-assistant/_components/share-conversation"
import { ContextUsageMeter, type ContextUsageInfo } from "@/app/ai-assistant/_components/context-usage-meter"
import { ToastConfirm } from "@/components/ui/toast-confirm"
// 🛑 高风险工具执行前确认：裁决令牌（与后端同一份常量，勿在本地另写字符串字面量）
import {
  TOOL_CONFIRM_APPROVE_REPLY,
  TOOL_CONFIRM_REJECT_REPLY,
  TOOL_CONFIRM_APPROVE_TEXT,
  TOOL_CONFIRM_REJECT_TEXT,
  TOOL_CONFIRM_RUNNING_TEXT,
  TOOL_CONFIRM_DONE_TEXT,
} from "@/lib/ai/tool-confirmation"
import { useTTSEngine } from "@/app/ai-assistant/_hooks/use-tts-engine"
import { handleDownloadPDF, createSelectFilesHandler, createPasteHandler, handleSettingsSave as saveSettings, copyMessageText } from "@/app/ai-assistant/_utils/message-actions"
import { type AIActionSummary } from "@/app/ai-assistant/_components/ai-action-summary"
import { notifyDesktop, summarizeForNotification } from "@/lib/desktop-notify"

/** 从消息列表中提取最后一条用户/助手消息，包装 SmartPrompts 避免每次重渲染重新计算。 */
function SmartPromptsWrapper({
  messages,
  aiSettings,
  model,
  enableReasoning,
  darkMode,
  onPick,
}: {
  messages: Message[]
  aiSettings: AISettings | null
  /** 🎯 用户当前选择的模型（与发给 /api/chat 的 model 同一个值） */
  model?: string
  /** 与发给 /api/chat 的深度思考开关同源 —— auto 模式下要靠它挑到同一个模型 */
  enableReasoning?: boolean
  darkMode: boolean
  onPick: (text: string) => void
}) {
  const { lastUser, lastAssistant } = React.useMemo(() => {
    const extract = (c: Message["content"]): string => {
      if (typeof c === "string") return c
      if (Array.isArray(c)) return c.filter((p) => p?.type === "text").map((p) => p.text || "").join("\n")
      return ""
    }
    let lastUser: string | undefined
    let lastAssistant: string | undefined
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role === "assistant" && !lastAssistant) lastAssistant = extract(m.content)
      else if (m.role === "user" && !lastUser) lastUser = extract(m.content)
      if (lastUser && lastAssistant) break
    }
    return { lastUser, lastAssistant }
  }, [messages])

  return (
    <SmartPrompts
      lastUser={lastUser}
      lastAssistant={lastAssistant}
      model={model}
      enableReasoning={enableReasoning}
      aiSettings={aiSettings}
      darkMode={darkMode}
      onPick={onPick}
    />
  )
}

/**
 * 检测内容中 CLARIFY/DECISION/PLAN 标签的 JSON 是否解析失败
 * 返回失败的标签名（如 "CLARIFY"），未失败返回 null
 * 用于流式结束后自动打回给 AI 重新生成
 */
function detectFailedTag(content: string): string | null {
  const tags = ["CLARIFY", "DECISION", "PLAN"] as const
  for (const tag of tags) {
    const openTag = `<${tag}>`
    if (!content.includes(openTag)) continue
    // 提取标签内 JSON 文本（兼容流式未闭合）
    const regex = new RegExp(`<\\s*${tag}\\s*>([\\s\\S]*?)(?:<\\/\\s*${tag}\\s*>|$)`, "i")
    const match = content.match(regex)
    if (!match) continue
    const jsonText = match[1].replace(new RegExp(`<\\/\\s*${tag}\\s*>`, "i"), "").trim()
    if (!jsonText) return tag
    const parsed = tryParseJsonWithRepair(jsonText)
    if (!parsed) return tag
  }
  return null
}

/** 把后端工具内部 stage 标识翻译成用户可读的中文标题（用于 thought chain 展示） */
function stageToLabel(stage: string | undefined): string {
  if (!stage) return "处理中"
  const map: Record<string, string> = {
    analyze: "阅读文档，提取能力与字段",
    generate: "生成技能内容",
    validate: "校验技能结构",
    "self-test": "自测：彩排 + 评分",
    revise: "自动修订技能",
    register: "注册并发布技能",
    "plan": "规划研究步骤",
    "search": "检索资料",
    "scrape": "抓取网页",
    "extract": "提炼要点",
    "synthesize": "融合多源信息",
    "ingest": "沉淀入库",
    "decompose": "拆解问题",
    "gap_search": "补搜缺失信息",
  }
  return map[stage] || stage
}

/**
 * 🔥 会话作用域快照（Session Scope）
 * 用于「切换对话后任务继续在后台执行」：一条会话的流式生成状态不再寄存在页面级 state 上，
 * 而是按会话归属保存在 sessionScopesRef 中；只有该会话仍是当前激活会话时才渲染到 UI。
 */
type SessionScope = {
  key: string
  /** 该会话是否有任务正在执行（会话列表圆点 + 切回时的 loading 恢复都依赖它） */
  running: boolean
  messages: Message[]
  agentStatus: string
  agentSteps: AgentStep[]
  isLoading: boolean
  aiActionSummary: AIActionSummary | null
  latestTaskListContent: string
  browsingUrl: string | null
  currentBrowserUrl: string | null
  browserScreenshot: string | null
  studioData: any[]
  /** 本会话最近一轮请求的上下文容量（用于 footer 的「已用 / 窗口」指示器） */
  contextUsage: ContextUsageInfo | null
}

export default function AIAssistantPage() {
  return (
    <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-zinc-950 text-[#059669]">Loading AI Assistant...</div>}>
      <AIAssistantContent />
    </React.Suspense>
  )
}

function AIAssistantContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<UserPublic | null>(null)
  const { isElderFriendlyMode } = useElderFriendly()
  const [loadingUser, setLoadingUser] = useState(true)

  // Chat State
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const messagesRef = useRef<Message[]>(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])
  // 🔥 本次会话新消息分隔线：记录从服务端加载的历史消息数量，
  // 之后新增的消息（用户提问 + AI 回答）会在该索引处显示"新消息"分隔线。
  // 切换会话 / 新建会话 / 退出登录时重置。
  const [newMessageBoundary, setNewMessageBoundary] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>("")
  /** 当前对话的上下文容量（后端每轮请求经 SSE `context_usage` 上报；切会话时按快照恢复） */
  const [contextUsage, setContextUsage] = useState<ContextUsageInfo | null>(null)

  // ===== 🔥 会话作用域运行时（切换对话后任务继续在后台执行）=====
  // activeSessionIdRef：实时记录当前激活会话（组件 state 在流式闭包里是旧快照，不可用）
  const activeSessionIdRef = useRef<string>("")
  // sessionScopesRef：各会话的流式状态快照，切走时任务写入此处、切回时从此恢复
  const sessionScopesRef = useRef<Record<string, SessionScope>>({})
  // 各会话独立的流控制句柄，支持"一个会话跑着、另一个会话继续发问"的并发场景
  const streamControllersRef = useRef<Record<string, AbortController>>({})
  const streamStopRefs = useRef<Record<string, { current: boolean }>>({})
  // runningSessions：用于会话列表旁的"任务进行中"圆点
  const [runningSessions, setRunningSessions] = useState<Record<string, boolean>>({})

  /** 切换激活会话：同步 ref（供后台流判定前台/后台），再更新 state 触发消息加载 */
  const switchActiveSession = useCallback((id: string) => {
    const next = String(id)
    const prev = activeSessionIdRef.current
    // 🔒 离开临时对话 → 立刻丢弃它的内存快照（"临时"语义：切走即弃）
    if (prev && prev !== next && prev.startsWith("__temp__")) {
      delete sessionScopesRef.current[prev]
    }
    activeSessionIdRef.current = next
    setSessionId(next)
  }, [])

  // ===== 🔒 临时对话（不落库、不进列表、仅在内存中存活）=====
  // 语义：点「临时对话」开一个孤立会话，消息只留在内存；切走/新建即丢弃，
  // 不写入 sessions 表，也不出现在侧栏列表里。
  const TEMP_SESSION_PREFIX = "__temp__"
  /** 当前激活的是否为临时会话 */
  const isTempSession = (id: string | null | undefined) => !!id && String(id).startsWith(TEMP_SESSION_PREFIX)
  /** 新建一个临时会话（不发请求、不落库） */
  const createTempSession = useCallback(() => {
    const id = `${TEMP_SESSION_PREFIX}${Date.now()}`
    // 清掉上一个临时会话的内存快照，避免堆积
    Object.keys(sessionScopesRef.current).forEach(k => {
      if (k.startsWith(TEMP_SESSION_PREFIX) && k !== id) delete sessionScopesRef.current[k]
    })
    sessionScopesRef.current[id] = {
      messages: [], agentStatus: "", agentSteps: [],
      aiActionSummary: null, latestTaskListContent: "", running: false,
      contextUsage: null,
    } as any
    activeSessionIdRef.current = id
    setSessionId(id)
    setMessages([])
    messagesRef.current = []
    setInput("")
    setNewMessageBoundary(0)
    setAgentStatus("")
    setAgentSteps([])
    setAiActionSummary(null)
    setLatestTaskListContent("")
    setContextUsage(null)
    setIsLoading(false)
  }, [])

  /** 当前是否处于临时对话（用于侧栏按钮高亮） */
  const tempSessionActive = isTempSession(sessionId)

  // 兜底同步：任何路径改动 sessionId 后，ref 都能跟上
  useEffect(() => { activeSessionIdRef.current = sessionId }, [sessionId])
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  /* ── 对话总结（= 会话标题）──────────────────────────────────────────────
     顶栏胶囊（ConversationSummary）与侧栏「最近对话」列表**共用同一个值**：
     都取自 `sessions.find(当前会话).title`，唯一数据源，不会出现两处说法不一致。
     生成时机：用户发出第一轮消息时用其**当前选择的模型**总结意图（见 ensureConversationTitle）。 */
  const [convSummary, setConvSummary] = useState("")
  const [summarizing, setSummarizing] = useState(false)
  /** 已进入「生成标题」流程的会话 id —— 防用户连发两条导致重复总结 */
  const titledSessionsRef = useRef<Set<string>>(new Set())
  /* 会话切换 / 标题变化 → 同步顶栏总结胶囊 */
  useEffect(() => {
    if (!sessionId || isTempSession(sessionId)) {
      setConvSummary("")
      return
    }
    const s = sessions.find((x) => x.id === sessionId)
    const t = s?.title || ""
    // 「新会话 <时间>」是占位标题，还没总结出来 → 显示占位态
    setConvSummary(t.startsWith("新会话") ? "" : t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessions])
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  const [enableSearch, setEnableSearch] = useState(false)
  const [searchPanelOpen, setSearchPanelOpen] = useState(false)
  /** 🔍 对话内搜索（顶栏胶囊，区别于侧栏的全局搜索面板） */
  const [convSearchOpen, setConvSearchOpen] = useState(false)
  /* ── 能力 / 模式行（2026-10-01 用户：「把这些放到 sender」+「你看看人家的」）──
     参考稿里输入框的行为：未选中 = 一排扁平图文胶囊；选中 = 整排收起，
     只留那一枚「淡绿底 + 墨绿字 + ×」的小胶囊。这里只存「当前进了哪个模式」，
     模式清单是静态的（见下面的 senderModes）。
     与 enableSearch 的关系：进「研究」模式会顺带开检索工具，退出时关掉；
     进种植能力模式不动它 —— 两件事不再互相绑死（旧版把研究绑死在 enableSearch 上）。 */
  const [activeModeKey, setActiveModeKey] = useState<string | null>(null)
  // 提供商/模型的推理能力缓存：{ [modelId]: boolean | undefined }
  const [modelSupportsReasoning, setModelSupportsReasoning] = useState<Record<string, boolean | undefined>>({})
  // 记录是否已尝试加载（避免重复请求）
  const [providerConfigLoaded, setProviderConfigLoaded] = useState(false)
  const [searchTab, setSearchTab] = useState<"history" | "space" | "agent">("history")
  const [searchKeyword, setSearchKeyword] = useState("")
  // 🔥 深度思考默认开启（2026-09-25 用户要求）：AI 助手无需用户手动启用，默认就走深度思考。
  // 服务端仍会二次判定 —— 仅当模型 supportsReasoning 时才真正生效（app/api/chat/route.ts: shouldEnableReasoning）。
  const [enableReasoning, setEnableReasoning] = useState(true)
  // 用 useAIModels 拉取一次 providers 配置（与下拉框共用同一份数据），保证 modelSupportsReasoning 与下拉框完全一致
  const { config: aiConfig, loading: aiConfigLoading, refetch: aiConfigRefetch, getDefaultModelId } = useAIModels()

  /**
   * 实时积分估算：拿到某模型的倍率（admin 在「提供商 → 模型」里配；未配时与 credit-service 启发式一致）
   */
  const getModelRate = (modelId: string): number => {
    if (!aiConfig?.models) return 1
    const m = aiConfig.models.find(x => x.id === modelId)
    if (m && typeof (m as any).rateMultiplier === 'number' && (m as any).rateMultiplier > 0) {
      return (m as any).rateMultiplier
    }
    const id = (modelId || '').toLowerCase()
    if (/(flash|air|free|turbo|lite|mini)/.test(id)) return 0.2
    if (/(max|ultra|flagship|o1|opus)/.test(id)) return 3
    return 1
  }
  /**
   * 客户端实时积分估算（流式输出中：累计 input + output 字符数 → 估算 tokens → 算积分）
   * 与服务端 credit-service 公式保持一致：credits = (input + output × outputWeight) / tokensPerCredit × modelRate
   */
  const estimateLiveCredits = (inputChars: number, outputChars: number, modelId: string) => {
    const modelRate = getModelRate(modelId)
    const outputWeight = 3
    const tokensPerCredit = 1000
    // 字符近似 token：中英混排加权 0.5（与 credit-service.estimateTokens 同量级）
    const estInputTokens = inputChars * 0.5
    const estOutputTokens = outputChars * 0.5
    const weighted = estInputTokens + estOutputTokens * outputWeight
    const raw = (weighted / tokensPerCredit) * modelRate
    return Math.max(0.01, Math.ceil(raw * 100) / 100)
  }
  const [enablePlanning, setEnablePlanning] = useState(false) // 计划模式：生成任务规划
  const [approvalMode, setApprovalMode] = useState<"request" | "auto" | "full">(() => {
    // 从localStorage读取上次选择的权限模式，默认为request
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-approval-mode')
      if (saved === 'request' || saved === 'auto' || saved === 'full') {
        return saved
      }
    }
    return 'request'
  })
  const [agentStatus, setAgentStatus] = useState("")
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([])
  // 🔥 页面级 TASK_LIST 追踪：跨多轮反馈消息保持任务规划器状态同步
  const [latestTaskListContent, setLatestTaskListContent] = useState<string>("")
  // 🔥 防止流式输出中的 <TASK_LIST> 覆盖 update_task 工具的更新结果
  // 当 update_task 已设置最新任务列表后，同一轮流式输出内的原始 TASK_LIST 不再覆盖
  const taskUpdatedByToolRef = useRef(false)

  // 🔥 AI 动作总结（TRAE 风格）：任务耗时 + 工具调用次数 + 任务完成状态
  const [aiActionSummary, setAiActionSummary] = useState<AIActionSummary | null>(null)
  const aiActionStatsRef = useRef({
    startTs: 0,
    toolCallCount: 0,
    fileChanges: { added: 0, removed: 0, count: 0 },
    lastTaskPlanProgress: undefined as string | undefined,
    lastTaskPlanCompleted: false,
  })
  const [enableMcp, setEnableMcp] = useState(true) // MCP Toggle

  // ===== 智能提示集显示逻辑 =====
  // 🚨 用户要求（2026-10-04）：对话结束后**常驻显示**，不做自动隐藏 ——
  //    一直保留，直到用户开始下一句（打字/发送）才收起。
  const [showSmartPrompts, setShowSmartPrompts] = useState(false)

  // ===== 思考链可见性（完成后保留，不自动消失） =====
  const [showThoughtChain, setShowThoughtChain] = useState(false)

  // 监听最后一条消息：assistant 且不在 loading / agent status 中 → 显示并**常驻**
  useEffect(() => {
    if (isLoading || agentStatus) {
      setShowSmartPrompts(false)
      return
    }
    const last = messages[messages.length - 1]
    if (!last || last.role !== "assistant") {
      setShowSmartPrompts(false)
      return
    }
    setShowSmartPrompts(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isLoading, agentStatus])

  // 用户开始敲下一句 → 收起（这就是「保留到下一句」的终点）
  useEffect(() => {
    if (input.trim().length > 0) {
      setShowSmartPrompts(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input])

  // 思考链：AI 正在处理或存在步骤时显示；完成后保留，不自动消失
  useEffect(() => {
    setShowThoughtChain(agentSteps.length > 0 || isLoading || !!agentStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, agentStatus, agentSteps.length])

  const [useModernView, setUseModernView] = useState(true) // 使用现代化首页视图

  // 对话菜单功能状态
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renameSessionId, setRenameSessionId] = useState("")
  const [renameValue, setRenameValue] = useState("")
  const [batchMode, setBatchMode] = useState(false)
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set())

  // ===== 分组功能状态 =====
  type GroupItem = { id: string; name: string }
  const [groups, setGroups] = useState<GroupItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("conv-groups") || "[]") } catch { return [] }
  })
  const [sessionGroupMap, setSessionGroupMap] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("session-group-map") || "{}") } catch { return {} }
  })
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("collapsed-groups") || "[]")) } catch { return new Set() }
  })
  // ===== 侧栏分区折叠（2026-09-19 用户要求：工作台/对话分组/最近对话可折叠）=====
  // key: workspace | groups | recent；持久化到 localStorage，展开为默认态
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("ai-sidebar-collapsed-sections") || "[]")) } catch { return new Set() }
  })
  const toggleSection = useCallback((key: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      try { localStorage.setItem("ai-sidebar-collapsed-sections", JSON.stringify([...next])) } catch {}
      return next
    })
  }, [])
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState("")
  const [showNewGroupInput, setShowNewGroupInput] = useState(false)
  
  // ===== 我的空间 - 报告列表（后端化：跨设备同步 + 实时通知） =====
  const [mySpaceNewBadge, setMySpaceNewBadge] = useState(0)
  const {
    reports: spaceReports,
    loading: spaceReportsLoading,
    connected: spaceEventsConnected,
    refresh: refreshSpaceReports,
    saveReport: saveSpaceReport,
    deleteReport: deleteSpaceReportRemote,
    toggleFavorite: toggleSpaceReportFavorite
  } = useUserReports({
    onNewReport: (r) => {
      // 新报告到达时若我的空间面板未打开，把 sidebar 角标 + 状态标记
      try {
        setMySpaceNewBadge((prev) => prev + 1)
        const badgeKey = "my-space-new-badge"
        const prev2 = Number(sessionStorage.getItem(badgeKey) || 0)
        sessionStorage.setItem(badgeKey, String(prev2 + 1))
        window.dispatchEvent(new CustomEvent("user-report:new", { detail: r }))
      } catch {}
    }
  })
  // ===== 主题统一走全局 next-themes（与其他页面同一主题系统，2026-09-20）=====
  // resolvedTheme 驱动 antd algorithm / 内联色值；html.dark 类由 next-themes 统一管理
  const { resolvedTheme, setTheme } = useTheme()
  const darkMode = resolvedTheme === "dark"

  // 一次性迁移：旧版页私有 localStorage["darkMode"]（boolean）→ next-themes["theme"]
  // 仅在用户从未设置过全局主题时迁移深色偏好，避免覆盖「跟随系统」语义
  useEffect(() => {
    try {
      const legacy = localStorage.getItem("darkMode")
      if (legacy === null) return
      if (legacy === "true" && localStorage.getItem("theme") === null) {
        setTheme("dark")
      }
      localStorage.removeItem("darkMode")
    } catch { /* ignore */ }
  }, [setTheme])

  // 分组操作函数
  const toggleGroupCollapse = (id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem("collapsed-groups", JSON.stringify([...next]))
      return next
    })
  }

  // ===== 搜索面板：根据当前 tab + 关键词过滤 =====
  const getFilteredItems = () => {
    const kw = searchKeyword.trim().toLowerCase()
    if (searchTab === "history") {
      return sessions
        .filter(s => !kw || (s.title || "").toLowerCase().includes(kw))
        .map(s => ({ id: s.id, title: s.title || "新对话" }))
    }
    if (searchTab === "space") {
      return spaceReports
        .filter(r => !kw || (r.title || "").toLowerCase().includes(kw))
        .map(r => ({ id: r.id, title: r.title || "未命名报告" }))
    }
    return []
  }

  const handlePickSearchItem = (item: { id: string; title: string }) => {
    if (searchTab === "history") {
      // 🔥 切换会话不再中断正在执行的任务（后台继续跑，切回可见进度）
      switchActiveSession(item.id)
    } else if (searchTab === "space") {
      const report = spaceReports.find(r => r.id === item.id)
      if (report?.html) {
        // 打开我的空间并展示该报告
        setMySpaceOpen(true)
      }
    }
    setSearchPanelOpen(false)
    setSearchKeyword("")
  }

  // ===== 我的空间 - 报告操作函数 =====

  /** 删除我的空间中的报告 */
  const deleteSpaceReport = (id: string) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除此报告吗？",
      okText: "删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk() {
        deleteSpaceReportRemote(id)
      }
    })
  }

  // 注：打开我的空间面板时清零未读角标、跨 tab 同步 mySpaceNewBadge 的 effect
  // 已在 mySpaceOpen useState 声明之后挂载（见下方），避免 "used before declaration" 错误。

  const addGroup = (name: string) => {
    if (!name.trim()) return
    const id = `group-${Date.now()}`
    const newGroup: GroupItem = { id, name: name.trim() }
    setGroups(prev => {
      const updated = [...prev, newGroup]
      localStorage.setItem("conv-groups", JSON.stringify(updated))
      return updated
    })
    setNewGroupName("")
    setShowNewGroupInput(false)
  }

  const moveSessionToGroup = (sessionId: string, groupId: string | null) => {
    setSessionGroupMap(prev => {
      const updated = { ...prev }
      if (groupId) updated[sessionId] = groupId
      else delete updated[sessionId]
      localStorage.setItem("session-group-map", JSON.stringify(updated))
      return updated
    })
  }

  const deleteGroup = (groupId: string) => {
    setGroups(prev => {
      const updated = prev.filter(g => g.id !== groupId)
      localStorage.setItem("conv-groups", JSON.stringify(updated))
      return updated
    })
    // 将该分组下的对话移回"最近对话"
    setSessionGroupMap(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(k => { if (updated[k] === groupId) delete updated[k] })
      localStorage.setItem("session-group-map", JSON.stringify(updated))
      return updated
    })
  }

  // 获取按分组分类的会话
  const { grouped: sessionsByGroup, ungrouped: recentSessions } = React.useMemo(() => {
    const grouped: Record<string, typeof sessions> = {}
    const ungrouped: typeof sessions = []
    sessions.forEach(s => {
      const gId = sessionGroupMap[s.id]
      if (gId && groups.find(g => g.id === gId)) {
        if (!grouped[gId]) grouped[gId] = []
        grouped[gId].push(s)
      } else {
        ungrouped.push(s)
      }
    })
    return { grouped, ungrouped }
  }, [sessions, sessionGroupMap, groups])

  // 对话项渲染函数（复用：最近对话 + 自定义分组共用）
  const renderConvItem = (s: any) => {
    const key = s.id
    const label = s.title
    // 🔥 该会话是否有任务正在后台执行（含当前会话）→ 标题旁显示进行中圆点
    const isRunning = !!runningSessions[key]
    return {
      key,
      label: (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", paddingRight: 2 }}>
          <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>{label}</span>
            {isRunning && (
              <span
                className="conv-running-dot"
                title="任务进行中"
                aria-label="任务进行中"
              />
            )}
          </span>
          {batchMode && (
            <input type="checkbox" checked={batchSelected.has(key)} onChange={() => toggleBatchSelect(key)}
              onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
              style={{ marginRight: 4, cursor: "pointer" }}
            />
          )}
          <Dropdown trigger={["click"]} placement="bottomRight"
            menu={{
              items: [
                { key: "rename", icon: <IconPencil size={13} />, label: "重命名" },
                { key: "pin", icon: <IconPin size={13} />, label: "置顶此对话" },
                { type: "divider" },
                { key: "share", icon: <IconShare size={13} />, label: "分享此对话" },
                { key: "batch", icon: <IconList size={13} />, label: batchMode ? "退出批量管理" : "批量管理" },
                { type: "divider" },
                {
                  key: "move", icon: <IconFolderUpload size={13} />, label: "移动到分组",
                  children: [
                    ...groups.map(g => ({ key: `move-${g.id}`, label: g.name })),
                    { type: "divider" },
                    { key: "move-none", label: "移出分组（回到最近对话）" },
                  ],
                },
                { key: "export", icon: <IconDownload size={13} />, label: "导出对话",
                  children: [
                    { key: "export-md", label: "导出为 Markdown" },
                    { key: "export-json", label: "导出为 JSON" },
                    { key: "export-txt", label: "导出为文本" },
                  ],
                },
                { type: "divider" },
                { key: "delete", icon: <IconDelete size={13} />,
                  label: <span style={{ color: "#DC2626" }}>删除此对话</span>, danger: true,
                },
              ],
              onClick: (menuInfo) => handleConvMenuClick(menuInfo as any, key),
            }}
          >
            <button onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
              className="conv-more-btn"
              style={{ display: "flex", alignItems: "center", justifyContent: "center",
                width: 22, height: 22, borderRadius: 6, border: "none", background: "transparent",
                cursor: "pointer", color: darkMode ? "#71717a" : "#c4c8cf", opacity: 0,
                transition: "opacity 0.15s, background 0.15s", flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = darkMode ? "#27272a" : "#F4F4F5" }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = ""; e.currentTarget.style.background = "transparent" }}
            >
              <IconMore size={14} />
            </button>
          </Dropdown>
        </div>
      ),
      style: { position: "relative" } as React.CSSProperties,
    }
  }

  // 缓存渲染的会话项列表，避免在 AI 消息流式输出时频繁重建 DOM，解决侧边栏卡顿
  const recentSessionItems = React.useMemo(() => {
    return recentSessions.slice(0, 20).map((s: any) => renderConvItem(s))
  }, [recentSessions, batchMode, batchSelected, groups, runningSessions])

  const groupedSessionItems = React.useMemo(() => {
    const itemsMap: Record<string, any[]> = {}
    Object.keys(sessionsByGroup).forEach(groupId => {
      itemsMap[groupId] = (sessionsByGroup[groupId] || []).slice(0, 20).map((s: any) => renderConvItem(s))
    })
    return itemsMap
  }, [sessionsByGroup, batchMode, batchSelected, groups, runningSessions])

  // TTS Engine (extracted hook)
  const isStoppedRef = useRef(false)
  const {
    isTTSEnabled, setIsTTSEnabled,
    isTtsPaused, setIsTtsPaused,
    isTtsPausedRef, audioContextRef,
    enqueueTts, stopTTS: ttsStop, resetTTS: ttsReset,
  } = useTTSEngine(isStoppedRef)

  // 视觉巡检状态
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionCamera, setInspectionCamera] = useState<'a' | 'b'>('a');
  const [inspectionStatus, setInspectionStatus] = useState<string>('');
  const [inspectionCameraUrl, setInspectionCameraUrl] = useState<string | null>(null);

  // 自动执行命令已整合到助手模式中，不再需要单独的状态
  const [isExecutingControl, setIsExecutingControl] = useState(false) // 正在执行设备控制（用于发光动效）
  const [executingDeviceName, setExecutingDeviceName] = useState<string>("") // 正在操作的设备名称
  const [devicePillExpanded, setDevicePillExpanded] = useState(false) // 控制胶囊展开动画
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>("")
  /* 切换模型：原顶栏 DynamicModelSelector 的 onValueChange 逻辑**逐字搬**到 sender footer
     （2026-10-01 用户：「将 ai 模型选择器放入 sender 参考 workbuddy」）。
     没做任何语义改动 —— 只是换了个摆放位置，别在这里顺手"优化"业务逻辑。 */
  const handleModelChange = (id: string) => {
    setSelectedModel(id)
    // 切换到用户自配模型时，把 baseUrl/apiKey/modelId 写入 aiSettings
    if (id.startsWith('custom-')) {
      try {
        const raw = localStorage.getItem('berry-realm.custom-models.v1')
        const list = raw ? JSON.parse(raw) : []
        const c = list.find((x: any) => x.id === id)
        if (c) {
          setAiSettings(prev => prev
            ? { ...prev, apiKey: c.apiKey, apiUrl: c.baseUrl, model: c.modelId }
            : { apiKey: c.apiKey, apiUrl: c.baseUrl, model: c.modelId }
          )
        }
      } catch {}
    }
  }
  const [selectedPersona, setSelectedPersona] = useState<string>(() => {
    // 从 localStorage 读取上次选择的 persona
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ai-persona') || 'expert'
    }
    return 'expert'
  })
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [voiceChatOpen, setVoiceChatOpen] = useState(false)

  /* 对话区背景（WebGL 雾 + 白点阵）生命周期：进入即亮 → 保持 20s → 淡出 → 卸载。
     🚨 必须与 CSS 动画 pb-aura-lifecycle 的总时长（21.8s）严格对齐：
     0→0.9s 淡入 · 0.9~20s 保持 · 20~21.8s 淡出。改一处必须改另一处。
     卸载不是为了省内存，是为了**释放 WebGL 上下文**（见 aurora-bg.tsx 顶部注释）。 */
  const [auraMounted, setAuraMounted] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setAuraMounted(false), 21800)
    return () => clearTimeout(t)
  }, [])
  const [showExhaustedDialog, setShowExhaustedDialog] = useState(false)
  // 后端 403 返回的具体拒绝原因（如"积分余额不足（剩余 0.45…）"），弹窗内透出
  const [quotaDenyMsg, setQuotaDenyMsg] = useState<string | null>(null)
  const [showUserPopover, setShowUserPopover] = useState(false)
  const [greeting, setGreeting] = useState("晚上好")
  
  // 持久化approvalMode到localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-approval-mode', approvalMode)
      console.log('[Mode Debug] Current approvalMode:', approvalMode, 'autoExecuteCommands:', approvalMode === 'auto' || approvalMode === 'full')
    }
  }, [approvalMode])
  
  // 基于权限模式决定自动执行行为：
  // - request: 不自动执行任何操作
  // - auto: 自动执行低风险操作（如开灯、读传感器），高风险操作需确认
  // - full: 自动执行所有操作
  const autoExecuteCommands = approvalMode === 'auto' || approvalMode === 'full'
  
  // MCP Tool Mention State
  const [availableTools, setAvailableTools] = useState<{name: string, description: string, displayName?: string, icon?: string, iconBg?: string}[]>([])
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  
  // Browser Activity State
  const [browsingUrl, setBrowsingUrl] = useState<string | null>(null)
  
  // Unified Scheduler: Replacing client-side hook with a direct API call wrapper
  const scheduleTask = async (description: string, delayMinutes: number, taskType: string, payload: any) => {
    const execute_at = Date.now() + delayMinutes * 60 * 1000
    try {
      const res = await fetch('/api/scheduler/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: description,
          execute_at,
          action_type: taskType === 'analysis' ? 'agent' : taskType === 'reminder' ? 'reminder' : taskType,
          params: payload || {}
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      console.log('[Unified Scheduler] Legacy tag task saved to DB:', description)
      // 🔥 通知前端所有监听者（包括 SidebarPanel）立即刷新任务列表
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('scheduler:tasks-changed', { detail: { source: 'ai-scheduleTask' } }))
        }
      } catch {}
    } catch (e) {
      console.error('[Unified Scheduler] Failed to save legacy tag task:', e)
      throw e
    }
  }

  // 自动化任务执行检查 (Unified Scheduler - Agent & Reminder support)
  useEffect(() => {
    const checkScheduledTasks = async () => {
      try {
        const res = await fetch('/api/scheduler/tasks')
        if (!res.ok) return
        const { tasks } = await res.json()
        if (!tasks || !Array.isArray(tasks)) return

        const now = Date.now()
        for (const task of tasks) {
          // 只处理活跃的 agent 或 reminder 任务
          if (task.is_active === 1 && (task.action_type === 'agent' || task.action_type === 'reminder')) {
            const executeTime = task.execute_at
            // 如果已到执行时间（容忍 7 天过期）
            if (executeTime && executeTime <= now && (now - executeTime < 7 * 24 * 60 * 60 * 1000)) {
              console.log('[Unified Scheduler] Executing due task:', task.title)
              
              // 1. 先标记为已完成（删除），防止重复触发
              await fetch(`/api/scheduler/tasks?id=${task.id}`, { method: 'DELETE' })

              // 2. 执行逻辑
              if (task.action_type === 'agent') {
                const analysisPrompt = `🔔 定时任务提醒\n\n【${task.title}】\n\n请立即进行环境诊断分析：\n1. 检查当前环境参数并分析是否存在异常\n2. 给出具体的改善建议。`
                if (handleSendRef.current) {
                  console.log('[Unified Scheduler] Triggering AI handleSend for agent task')
                  handleSendRef.current(analysisPrompt, [], false, false, true)
                }
              } else if (task.action_type === 'reminder') {
                toast.info(`🔔 定时提醒：${task.title}`, {
                  duration: 10000
                })
                // 桌面端：窗口不在前台时 toast 是看不见的，补一条系统通知
                notifyDesktop({
                  title: "定时提醒",
                  body: task.title,
                  tag: `reminder:${task.id}`,
                  level: "info",
                  route: "/ai-assistant",
                })
              }
            } else if (executeTime && now - executeTime >= 7 * 24 * 60 * 60 * 1000) {
              // 已经过期太久的任务（超过 7 天），才直接删除
              console.log('[Unified Scheduler] Deleting stale task (>7d):', task.title)
              await fetch(`/api/scheduler/tasks?id=${task.id}`, { method: 'DELETE' })
            }
          }
        }
      } catch (e) {
        console.error('[Unified Scheduler] Check error:', e)
      }
    }

    const interval = setInterval(checkScheduledTasks, 15000)
    return () => clearInterval(interval)
  }, [])
  
  // AI Features Configuration Hook
  const { config: aiFeatures } = useAIFeatures()
  
  // 创建 handleSend 的 ref，确保在定时任务回调中可以访问最新的 handleSend
  const handleSendRef = useRef<typeof handleSend | null>(null)
  
  // Store State
  const [storeOpen, setStoreOpen] = useState(false)
  
  // Explore State
  const [exploreOpen, setExploreOpen] = useState(false)
  // 每次重开 explore 时递增 key，强制 AnimatePresence 创建全新实例，
  // 避免复用上次关闭中残留 closing=true 的旧实例
  const [exploreKey, setExploreKey] = useState(0)
  const exploreWasOpen = useRef(false)
  useEffect(() => {
    if (exploreOpen && !exploreWasOpen.current) {
      setExploreKey(k => k + 1)
    }
    exploreWasOpen.current = exploreOpen
  }, [exploreOpen])

  // Scheduler Sidebar Panel State
  const [schedulerPanelOpen, setSchedulerPanelOpen] = useState(false)
  const [mySpaceOpen, setMySpaceOpen] = useState(false)
  const [knowledgeOpen, setKnowledgeOpen] = useState(false)
  // 病历侧边面板（视觉诊断沉淀 + 复诊闭环；2026-10-04 从独立页迁进 AI 助手）
  const [medicalRecordsOpen, setMedicalRecordsOpen] = useState(false)

  /**
   * 侧栏浮层面板**互斥**开关。
   * 这五个面板都占同一块区域（fixed z-[150]），同时打开只会互相压盖 ——
   * 之前只有"哪个后挂载哪个在上面"的隐式行为，用户看起来像"点了个没反应"。
   * 统一走这个 helper，语义变成"一次只开一个"。
   */
  const openSidebarPanel = useCallback(
    (which: "explore" | "space" | "scheduler" | "knowledge" | "records") => {
      setExploreOpen(which === "explore")
      setMySpaceOpen(which === "space")
      setSchedulerPanelOpen(which === "scheduler")
      setKnowledgeOpen(which === "knowledge")
      setMedicalRecordsOpen(which === "records")
    },
    [],
  )

  // 打开我的空间面板时清零未读角标
  useEffect(() => {
    if (mySpaceOpen) {
      setMySpaceNewBadge(0)
      try { sessionStorage.setItem("my-space-new-badge", "0") } catch {}
    }
  }, [mySpaceOpen])

  // 跨 tab 同步：其他 tab 收到新报告时同步更新本 tab 角标
  useEffect(() => {
    if (typeof window === "undefined") return
    const onStorage = (e: StorageEvent) => {
      if (e.key === "my-space-new-badge" && e.newValue) {
        const n = Number(e.newValue)
        if (Number.isFinite(n)) setMySpaceNewBadge(n)
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  // Settings State
  const [settingsOpen, setSettingsOpen] = useState(false)
  // 🆕 打开设置弹窗时定位到哪个分区（桌面端「管理设置」直达「模型」）
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("personalization")

  /**
   * 「已自动整理对话上下文」卡片里的「调整容量与触发点」按钮 → 直达
   * 设置弹窗的「助理设置」分区（消息渲染层在很深的树里，用全局事件解耦，
   * 不需要逐层 prop drilling）。
   */
  useEffect(() => {
    const handler = () => {
      setSettingsSection("assistant")
      setSettingsOpen(true)
    }
    window.addEventListener(OPEN_CONTEXT_PREFS_EVENT, handler)
    return () => window.removeEventListener(OPEN_CONTEXT_PREFS_EVENT, handler)
  }, [])

  // Skill State
  const [mandatorySkillsEnabled, setMandatorySkillsEnabled] = useState(true)
  const [selectedStoreSkillIds, setSelectedStoreSkillIds] = useState<string[]>([])
  const [installedStoreSkills, setInstalledStoreSkills] = useState<any[]>([])
  const [builtinSkills, setBuiltinSkills] = useState<any[]>([])

  const loadSkills = async () => {
    try {
      const res = await fetch('/api/skills/user')
      if (res.ok) {
        const data = await res.json()
        const allSkills = data.skills || []
        const builtins = allSkills.filter((s: any) => s.is_builtin === 1)
        const stores = allSkills.filter((s: any) => s.is_builtin === 0)
        
        setBuiltinSkills(builtins)
        setInstalledStoreSkills(stores)
        
        // Only initialize if empty or if needed. 
        // Actually, let's keep previous selections if they still exist.
        setSelectedStoreSkillIds(prev => {
          const validIds = stores.map((s: any) => s.skill_id)
          return prev.filter(id => validIds.includes(id))
        })
      }
    } catch (e) {
      console.error('Failed to load skills:', e)
    }
  }

  useEffect(() => {
    loadSkills()
    
    // Initialize greeting based on time of day
    const hour = new Date().getHours()
    const currentGreeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
    setGreeting(currentGreeting)
  }, [])

  // 每次关闭商店时重新加载已安装技能
  useEffect(() => {
    if (!storeOpen) {
      loadSkills()
    }
  }, [storeOpen])

  // Studio Panel State
  const [studioOpen, setStudioOpen] = useState(false)
  const [studioData, setStudioData] = useState<any[]>([]) // 存储真实的工具执行结果
  const [studioTab, setStudioTab] = useState<'tools' | 'tasks' | 'report'>('tools') // 新增：Studio 标签页状态，添加report选项
  const [currentBrowserUrl, setCurrentBrowserUrl] = useState<string | null>(null) // 工作室内部的浏览器URL
  const [browserScreenshot, setBrowserScreenshot] = useState<string | null>(null) // 新增：浏览器截图数据
  const [reportData, setReportData] = useState<{title: string, html: string, timestamp: number} | null>(null) // 报告数据
  
  // 打开Studio并显示报告（仅打开，不保存）— 通过 Drawer 真正展示报告内容
  const onOpenStudio = (reportTitle: string, reportHtml: string) => {
    console.log('[onOpenStudio] Called with:', { reportTitle, htmlLength: reportHtml.length })
    setReportData({
      title: reportTitle,
      html: reportHtml,
      timestamp: Date.now()
    })
  }

  // 生成报告时调用：打开 + 自动保存到我的空间（服务端去重）
  const generateAndSaveReport = (reportTitle: string, reportHtml: string) => {
    onOpenStudio(reportTitle, reportHtml)

    // 异步保存到后端（user-reports-service 已做 5s 内同 user+source+title 去重）
    void saveSpaceReport({
      title: reportTitle,
      html: reportHtml,
      source: "chat",
      type: "report"
    })
  }

  // 监听报告数据并自动打开Studio
  useEffect(() => {
    const checkPendingReport = () => {
      const pending = sessionStorage.getItem('pendingReport')
      if (pending) {
        try {
          const data = JSON.parse(pending)
          generateAndSaveReport(data.title, data.html)
          sessionStorage.removeItem('pendingReport')
        } catch (e) {
          console.error('Failed to parse pending report:', e)
        }
      }
    }

    // 检查是否有待显示的报告
    checkPendingReport()

    // 监听storage事件（如果从其他标签页触发）
    window.addEventListener('storage', checkPendingReport)
    return () => window.removeEventListener('storage', checkPendingReport)
  }, [])
  
  const [visionInspectionUrl, setVisionInspectionUrl] = useState<string | null>(null) // AI 视觉巡检的摄像头 URL
  const [visionInspectionStatus, setVisionInspectionStatus] = useState<string>('') // 巡检状态文本
  const [visionCapturedImage, setVisionCapturedImage] = useState<string | null>(null) // 巡检截获的画面（用于 Agent 展示）
  const [visionVideoElementId, setVisionVideoElementId] = useState<string>(VISION_CAMERA_ELEMENT_ID) // 当前巡检使用的视频元素 ID

  // 全局任务暂停状态 (Real Execution Pause)
  const [isTaskPaused, setIsTaskPaused] = useState(false)
  const isTaskPausedRef = useRef(false)

  // 同步 Ref 以便在异步循环中即时访问
  useEffect(() => {
      isTaskPausedRef.current = isTaskPaused
  }, [isTaskPaused])

  // Load MCP Tools
  useEffect(() => {
    try {
      const installedStr = localStorage.getItem('mcp-installed-servers')
      if (installedStr) {
        const serverIds = JSON.parse(installedStr)
        const tools: any[] = []
        
        serverIds.forEach((id: string) => {
          const configStr = localStorage.getItem(`mcp-config-${id}`)
          const enabled = localStorage.getItem(`mcp-enabled-${id}`) !== "false"
          
          if (configStr && enabled) {
            const config = JSON.parse(configStr)
            const toolIcon = config.icon || undefined
            const toolIconBg = config.iconBg || undefined
            // 暂时根据 config.name 来推断工具
            if (config.name === 'caiyun-weather') {
                tools.push({ name: 'mcp_caiyun_weather', displayName: '彩云天气', description: '查询实时天气和预报', icon: toolIcon, iconBg: toolIconBg })
            } else if (config.name === 'gaode-weather') {
                tools.push({ name: 'mcp_gaode_weather', displayName: '高德天气', description: '查询实时天气', icon: toolIcon, iconBg: toolIconBg })
            } else if (config.name === 'hefeng-weather') {
                tools.push({ name: 'mcp_hefeng_weather', displayName: '和风天气', description: '查询全球天气', icon: toolIcon, iconBg: toolIconBg })
            } else if (config.name === 'amap-route') {
                tools.push({ name: 'mcp_amap_route', displayName: '高德路径规划', description: '驾车/步行/骑行路线规划', icon: toolIcon, iconBg: toolIconBg })
            } else if (config.name === 'brave-search') {
                tools.push({ name: 'mcp_brave_search', displayName: 'Brave 搜索', description: '联网搜索最新信息', icon: toolIcon, iconBg: toolIconBg })
            } else if (config.name === 'exa-search') {
                tools.push({ name: 'mcp_exa_search', displayName: 'Exa 搜索', description: '深度语义搜索技术文章与论文', icon: toolIcon, iconBg: toolIconBg })
            } else if (config.name === 'anysearch') {
                tools.push({ name: 'mcp_anysearch_search', displayName: 'AnySearch 搜索', description: '实时网络搜索与垂直领域检索', icon: toolIcon, iconBg: toolIconBg })
                tools.push({ name: 'mcp_anysearch_batch_search', displayName: 'AnySearch 批量搜索', description: '并行执行多个独立搜索查询', icon: toolIcon, iconBg: toolIconBg })
                tools.push({ name: 'mcp_anysearch_extract', displayName: 'AnySearch 网页提取', description: '抓取网页全文并转为 Markdown', icon: toolIcon, iconBg: toolIconBg })
            } else if (config.name === 'firecrawl') {
                tools.push({ name: 'mcp_firecrawl_scrape', displayName: '网页抓取', description: '抓取网页内容', icon: toolIcon, iconBg: toolIconBg })
            } else if (config.name === 'spectrum-stravision') {
                tools.push({ name: 'get_channel', displayName: '光谱通道', description: '获取指定波长光谱值', icon: toolIcon, iconBg: toolIconBg })
                tools.push({ name: 'get_all_spectrum', displayName: '全波段光谱', description: '获取所有18通道数据', icon: toolIcon, iconBg: toolIconBg })
            }
          }
        })
        setAvailableTools(tools)
      }
    } catch (e) {
      console.error('Failed to load MCP tools:', e)
    }
  }, [])

  const handleInsertTool = (toolName: string) => {
    const mentionText = `@${toolName} `
    // 如果是通过输入 @ 触发的，替换掉 @
    // 如果是点击按钮触发的，直接追加
    if (input.endsWith('@')) {
        setInput(prev => prev + toolName + ' ')
    } else {
        setInput(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + mentionText)
    }
    setMentionOpen(false)
    textareaRefChat.current?.focus()
  }

  
  // 处理从语音助手传来的截图分析请求
  const handleSnapshotAnalysis = async () => {
    try {
      const snapshotDataStr = sessionStorage.getItem('xiaozhi_snapshot_data')
      if (!snapshotDataStr) return
      
      const snapshotData = JSON.parse(snapshotDataStr)
      const { imageData, prompt, timestamp } = snapshotData
      
      // 清除数据
      sessionStorage.removeItem('xiaozhi_snapshot_data')
      
      // 检查数据是否过期（5分钟）
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        toast.error('截图数据已过期')
        return
      }
      
      // 设置附件
      setAttachments([{ name: 'camera-capture.png', type: 'image/png', dataUrl: imageData }])
      
      // 设置输入框内容
      setInput(prompt)
      
      // 自动发送消息
      setTimeout(() => {
        handleSend(prompt, [{ name: 'camera-capture.png', type: 'image/png', dataUrl: imageData }])
      }, 500)
      
    } catch (error) {
      console.error('Handle snapshot analysis error:', error)
    }
  }

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) setGreeting("早上好")
    else if (hour >= 12 && hour < 18) setGreeting("下午好")
    else setGreeting("晚上好")
    
    // 检查是否从语音助手跳转过来并携带截图数据
    const urlParams = new URLSearchParams(window.location.search)
    const fromXiaozhi = urlParams.get('from') === 'xiaozhi'
    const action = urlParams.get('action')
    
    if (fromXiaozhi && action === 'analyze_snapshot') {
      handleSnapshotAnalysis()
    }
  }, [])
  
  // Quota state
  const [quotaInfo, setQuotaInfo] = useState<{ daily_limit: number, daily_usage: number, balance: number, reason?: string } | null>(null)
  // 积分视图（积分制度：token 计费 × 模型倍率 × 全局倍率）
  const [creditInfo, setCreditInfo] = useState<{
    membership?: string
    monthlyRemaining: number
    monthlyUsed: number
    monthlyQuota: number
    balance: number
    totalRemaining: number
    canUse: boolean
    reason?: string
  } | null>(null)

  useEffect(() => {
    // 每次页面加载或发送消息后刷新配额
    const fetchQuota = async () => {
        try {
            const res = await fetch("/api/user/settings")
            if (!res.ok) return // Silently fail if endpoint error
            const data = await res.json()
            if (data && data.quota) {
                setQuotaInfo(data.quota)
            }
            if (data && data.credit) {
                setCreditInfo(data.credit)
            }
        } catch (e) {
            console.error("Failed to load quota", e)
        }
    }
    fetchQuota()
  }, [isLoading]) // isLoading 变为 false 时（即对话结束时）刷新配额

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRefInitial = useRef<HTMLTextAreaElement>(null)
  const textareaRefChat = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const adjustHeight = (el: HTMLTextAreaElement | null) => {
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`
    }
    adjustHeight(textareaRefInitial.current)
    adjustHeight(textareaRefChat.current)
  }, [input])
  const { deviceData, connectionStatus } = useDeviceData()
  const { weatherData } = useWeatherContext()

  // 使用 Ref 追踪最新的数据，避免闭包陷阱
  const deviceDataRef = useRef(deviceData)
  const weatherDataRef = useRef(weatherData)
  const deviceOnlineRef = useRef(connectionStatus.connected)

  useEffect(() => { deviceDataRef.current = deviceData }, [deviceData])
  useEffect(() => { weatherDataRef.current = weatherData }, [weatherData])
  useEffect(() => { deviceOnlineRef.current = connectionStatus.connected }, [connectionStatus.connected])

  // 命令执行历史记录，用于防抖和循环检测
  const commandHistoryRef = useRef<{ signature: string, timestamp: number }[]>([])
  const executionLoopCountRef = useRef(0)
  const rootIntentRef = useRef<string>("")
  // CLARIFY/DECISION 标签解析失败时的自动重试计数（防止无限循环）
  const tagRetryCountRef = useRef(0)
  // 🔥 等待用户输入状态：后端 Agent Loop 挂起时，前端表单提交走 /api/chat/respond
  // 而非触发新对话。SSE 流结束时清空，超时也会清空。
  const waitingForUserInputRef = useRef<{
    checkpointId: string
    /**
     * 🛑 `'tool_confirm'` = 高风险工具的执行前确认（设备启停 / 删除 / 自动化部署等）。
     * 与 checkpoint / clarify 的关键差异：**不问消息内容**，而是在 sender 上方浮出
     * 一枚确认胶囊（见 toolConfirm state），只回传同意/拒绝两个哨兵值。
     */
    type: 'checkpoint' | 'clarify' | 'tool_confirm'
    title: string
    timeoutMs: number
    startedAt: number
  } | null>(null)

  /**
   * 🛑 高风险工具的执行前确认条（2026-10-14 用户：「改成在 sender 上方出现确认」）
   *
   * 非空即在输入框正上方浮出一枚 ToastConfirm 胶囊。
   * 数据完全由后端 SSE 驱动（`tool_confirmation_required` / `tool_confirmation_resolved`），
   * 文案也由后端拼好（优先取 AI 自己那句说明）—— 前端不参与判定「哪些工具要确认」。
   */
  const [toolConfirm, setToolConfirm] = useState<{
    id: string
    toolName: string
    text: string
    state: 'initial' | 'loading' | 'success'
    successText?: string
  } | null>(null)
  /** SSE 回调里要读最新值（回调闭包捕获的是旧 state） */
  const toolConfirmRef = useRef<typeof toolConfirm>(null)
  useEffect(() => { toolConfirmRef.current = toolConfirm }, [toolConfirm])

  /** 点「执行」→ loading → 完成后展示终态文案再淡出 */
  const finishToolConfirm = useCallback((successText: string, delay = 1600) => {
    setToolConfirm(prev => (prev ? { ...prev, state: 'success', successText } : prev))
    window.setTimeout(() => {
      setToolConfirm(prev => (prev?.state === 'success' ? null : prev))
    }, delay)
  }, [])

  // 🔥 DEVICE_FORGE 卡片直推兜底：connect_device_from_doc 工具返回的 ui_card 先暂存，
  // 流结束时若模型没有按 note 复述 <DEVICE_FORGE> 标签（偶发幻觉 → 卡片"出现又消失"），
  // 则自动把卡片补进消息内容，保证可编辑接入表单一定渲染且随历史持久化。
  const pendingForgeCardRef = useRef<{ card: Record<string, unknown>; sig: string } | null>(null)

  /**
   * 📷 摄像头截图投递队列（2026-10-16）
   *
   * 背景：`take_camera_snapshot` / `move_camera_and_look` 由**服务端 ffmpeg** 抓帧，
   * 结果随 SSE `tool_result.result.images` 送到浏览器 —— 但此前只进了 studioData，
   * 前端从没渲染过，用户问"给我看看棚里"时图抓到了却看不到（工具结果里还写着
   * "图片已转发给用户"，等于谎报）。
   *
   * 为什么**不能**收到就插消息：流式期间助手消息永远写 `messages[last]`
   * （见 handleSend 里 `newMsgs[newMsgs.length-1] = {...assistantMsg}`），
   * 中途插入的截图消息会被下一段正文直接覆盖。这里先入队，流收尾时（finally，见
   * flushPendingCameraSnapshots）再一次性插进对话流并落库 —— 与 DEVICE_FORGE
   * 卡片"先暂存、收尾补位"同一套路。
   */
  const pendingCameraSnapshotsRef = useRef<PendingCameraSnapshot[]>([])

  /**
   * 📎 本轮 AI 产出/修改的文档（`document_create` / `document_edit` 的产物）。
   *
   * 与截图队列同构：工具结果随 SSE 到达时先入队，流收尾时再合并进**最后一条助手消息**
   * 的 `documents` 字段 —— 流式期间助手消息对象每段正文都在重建，直接改会被覆盖。
   *
   * 为什么不拼进正文文本：一旦成了自然语言，渲染层就再也拿不到 downloadUrl 画下载卡，
   * 用户只能手动复制链接（且长链接会被 markdown 拆断）。
   */
  const pendingDocArtifactsRef = useRef<DocumentRef[]>([])

  /**
   * 响应 CHECKPOINT / CLARIFY 表单提交
   *
   * - 若 SSE 流处于挂起等待状态（waitingForUserInputRef 有值）：
   *   POST /api/chat/respond → 后端 resolve promise → Agent Loop 继续
   * - 否则（兜底，比如 SSE 已结束）：走 onSendMessage 触发新对话
   */
  const respondToCheckpoint = useCallback(async (replyText: string, fallbackToSendMessage: (text: string) => void) => {
    const waiting = waitingForUserInputRef.current
    if (!waiting) {
      // 没有挂起的 Agent Loop，走旧逻辑兜底
      console.log('[Chat] No pending checkpoint, falling back to new conversation')
      // 🔥 即使是兜底也显示 loading 通知，给用户即时反馈
      showNotice('已提交，AI 正在继续处理', replyText?.slice(0, 60) || undefined, 'loading')
      fallbackToSendMessage(replyText)
      return
    }

    console.log(`[Chat] Responding to checkpoint ${waiting.checkpointId}, type=${waiting.type}`)
    // 🔥 立即给用户提交反馈：loading 通知，等待 user_input_received 事件到达后由该事件处理逻辑清除
    showNotice('已提交，AI 正在继续处理', replyText?.slice(0, 60) || undefined, 'loading')

    try {
      const res = await fetch('/api/chat/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkpoint_id: waiting.checkpointId,
          reply: replyText,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.warn('[Chat] Respond failed:', data?.error)
        // 失败兜底：清除所有 loading 通知，显示错误，触发新对话
        setNotices(prev => prev.filter(n => n.variant !== 'loading'))
        showNotice('回复送达失败', data?.error || '将作为新消息发送', 'error')
        fallbackToSendMessage(replyText)
      } else {
        // 成功：Agent Loop 将自行恢复，前端不需要触发新对话
        // 注意：不要清空 waitingForUserInputRef，要等 user_input_received 事件到达时再清
        // loading 通知保留，由 user_input_received 事件处理时清除
        console.log('[Chat] Respond succeeded, Agent Loop will resume')

        // 🔥 看门狗：respond 返回 200 只代表"回复已送达后端并 resolve 了挂起 promise"，
        // 但若后端流已异常关闭/进程重启，user_input_received 可能永远不来 ——
        // 此时 waitingForUserInputRef 与 loading 通知会永久残留，用户看到的就是
        // "提交完一直转圈、AI 不响应"。兜底：超时后主动清理状态并提示，让用户能继续操作。
        const watchdogId = waiting.checkpointId
        window.setTimeout(() => {
          if (waitingForUserInputRef.current?.checkpointId !== watchdogId) return // 已正常恢复
          console.warn('[Chat] Respond sent but no resume event received; clearing stale waiting state')
          waitingForUserInputRef.current = null
          setNotices(prev => prev.filter(n => n.variant !== 'loading'))
          showNotice(
            'AI 未继续响应',
            '回复已送达但长时间未收到后续，请重新发送消息继续。',
            'warning'
          )
        }, 45000)
      }
    } catch (e: any) {
      console.error('[Chat] Respond error:', e)
      setNotices(prev => prev.filter(n => n.variant !== 'loading'))
      showNotice('回复送达失败', e?.message || '网络错误，将作为新消息发送', 'error')
      fallbackToSendMessage(replyText)
    }
  }, [])

  /**
   * 🛑 响应「高风险工具执行前确认」胶囊的点击
   *
   * 与 `respondToCheckpoint` 走**同一条恢复通道**（POST /api/chat/respond），
   * 区别只在 reply 是机器哨兵而不是自然语言 —— 后端据此判定批准/拒绝。
   *
   *  - 批准：胶囊转 `loading`（执行中）；后端执行完发 `tool_result` 时再收尾成「已执行」。
   *  - 拒绝：立即收起胶囊（不做假动的"处理中"），后端会把「用户拒绝」交回模型。
   *  - 送达失败：**清掉挂起态并把胶囊退回可点**，否则用户会对着一个点了没反应的胶囊干等。
   */
  const respondToolConfirm = useCallback(async (approved: boolean) => {
    const pending = toolConfirmRef.current
    if (!pending || (pending.state !== 'initial' && pending.state !== 'loading')) return
    if (approved) setToolConfirm(prev => (prev ? { ...prev, state: 'loading' } : prev))

    try {
      const res = await fetch('/api/chat/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkpoint_id: pending.id,
          reply: approved ? TOOL_CONFIRM_APPROVE_REPLY : TOOL_CONFIRM_REJECT_REPLY,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `请求失败（${res.status}）`)
      }
      console.log(`[Chat] Tool confirm sent: ${pending.toolName} → ${approved ? 'APPROVED' : 'REJECTED'}`)
      if (!approved) {
        waitingForUserInputRef.current = null
        setToolConfirm(null)
      }
    } catch (e: any) {
      console.error('[Chat] Tool confirm respond failed:', e)
      waitingForUserInputRef.current = null
      setToolConfirm(prev => (prev ? { ...prev, state: 'initial' } : prev))
      showNotice('确认未送达', e?.message || '请重试', 'error')
    }
  }, [])

  const [notices, setNotices] = useState<{ id: number; title: string; description?: string; variant?: 'loading' | 'success' | 'error' | 'warning'; expanded: boolean }[]>([])
  const noticeIdCounter = useRef(0)
  
  // 🔥 修复：跟踪已显示通知的报告，避免重复弹窗
  const notifiedReportsRef = useRef<Set<string>>(new Set())

  const showNotice = (title: string, description?: string, variant?: 'loading' | 'success' | 'error' | 'warning') => {
    const id = ++noticeIdCounter.current
    setNotices(prev => [...prev, { id, title, description, variant, expanded: false }])

    if (variant && variant !== 'loading') {
      setTimeout(() => {
        setNotices(prev => prev.filter(n => n.id !== id))
      }, 5000)
    }
  }

  // 加载会话消息
  // 🔥 已废弃：原实现在切换会话时 abort() 掉正在进行的流并清空消息，是「切走任务就断」的根因，
  //    且其请求的 /api/chat/sessions/:id/messages 端点并不存在（永远 404）。
  //    现在切换会话统一走 switchActiveSession → setSessionId → Load Messages effect：
  //    有内存快照的会话直接用快照恢复（后台任务不中断），否则回源服务端拉历史。

  const handleOptimizePrompt = async () => {
    if (!input.trim()) return
    if (!aiSettings?.apiKey) { router.push('/model-store'); return }
    
    setIsOptimizing(true)
    showNotice("正在优化提示词...", "AI 正在思考如何改进您的输入...", "loading")
    try {
      const res = await fetch('/api/ai/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          apiKey: aiSettings.apiKey,
          apiUrl: aiSettings.apiUrl,
          model: aiSettings.model
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.optimizedPrompt) {
          setInput(data.optimizedPrompt)
          showNotice("提示词已优化", "已为您重写了更清晰的提示词", "success")
        }
      } else {
        showNotice("优化失败", "请求出错", "error")
      }
    } catch (e) {
      console.error("Optimize error", e)
      showNotice("优化失败", "发生未知错误", "error")
    } finally {
      setIsOptimizing(false)
    }
  }

  const closeNotice = (id: number) => {
    setNotices(prev => prev.filter(n => n.id !== id))
  }

  const toggleNoticeExpanded = (id: number) => {
    setNotices(prev => prev.map(n => n.id === id ? { ...n, expanded: !n.expanded } : n))
  }

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      isStoppedRef.current = true
      ttsStop()
    }
  }, [])

  // Fetch User
  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          const res = await fetch("/api/auth/me")
          const data = await res.json()
          if (mounted && data?.authenticated && data?.user) setUser(data.user as UserPublic)
        } catch { }
        if (mounted) setLoadingUser(false)
      })()
    return () => { mounted = false }
  }, [])

  // Load Settings
  useEffect(() => {
    try {
      const s = localStorage.getItem("ai-settings")
      if (s) {
        const parsed = JSON.parse(s)
        setAiSettings(parsed)
        // 🚨 "auto" 是历史遗留值（模型选择器已无该入口），不要恢复成选中模型
        if (!selectedModel && parsed?.model && parsed.model !== "auto") setSelectedModel(parsed.model)
      }
      const es = localStorage.getItem("ai-enable-search")
      if (es) setEnableSearch(es === "true")
    } catch { }
  }, [])

  // 自动选择模型回退：admin 配置的 defaultModelId > useAIModels 第一个 enabled 模型
  // 触发时机：
  //   1) 用户刷新后 aiSettings?.model / selectedModel 均为空
  //   2) 已保存的 aiSettings?.model 不在 enabled 模型列表中（被禁用/删除）
  // 一次性回退，避免覆盖用户后续手动选择
  useEffect(() => {
    if (aiConfigLoading) return
    if (!aiConfig) return
    const enabledIds = new Set(aiConfig.models.filter(m => m.enabled).map(m => m.id))
    if (enabledIds.size === 0) return

    // localStorage 里残留的历史 "auto" 就地纠正为具体模型，避免每次冷启动都走一遍回退
    if (aiSettings?.model === "auto") {
      const fb = getDefaultModelId()
      if (fb) {
        try {
          const s = localStorage.getItem("ai-settings")
          const parsed = s ? JSON.parse(s) : {}
          parsed.model = fb
          localStorage.setItem("ai-settings", JSON.stringify(parsed))
          setAiSettings(parsed)
        } catch { }
      }
    }

    const current = selectedModel || aiSettings?.model || ""
    // "auto" 是历史遗留值：模型选择器已不再提供该入口（2026-10-27），一律纠正为具体模型
    if (current && current !== "auto" && enabledIds.has(current)) {
      // 当前模型有效，无需回退
      return
    }
    // 当前模型为空或已失效 → 使用 admin 默认
    const fallback = getDefaultModelId()
    if (!fallback) return
    if (current === fallback) return
    console.log('[AI Assistant] Fallback to default model:', fallback, '(was:', current || '<empty>', ')')
    setSelectedModel(fallback)
    // 同步写入 aiSettings.model，避免被其它 effect 反复重置
    if (typeof window !== 'undefined') {
      try {
        const s = localStorage.getItem("ai-settings")
        const parsed = s ? JSON.parse(s) : {}
        parsed.model = fallback
        localStorage.setItem("ai-settings", JSON.stringify(parsed))
        setAiSettings(parsed)
      } catch { }
    }
    // 仅在 aiConfig 加载完成时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiConfig, aiConfigLoading])

  // 加载 admin 配置的模型推理能力缓存
  // 复用 useAIModels 的数据源，与下拉框保持完全一致
  useEffect(() => {
    if (aiConfigLoading) return
    if (providerConfigLoaded) return
    const map: Record<string, boolean> = {}
    const providers = aiConfig?.providers || []
    // 注意：aiConfig.providers 来自 /api/ai/providers（getPublicProviders），
    // 该接口已经预先过滤掉未启用的 provider，返回的对象不含 enabled 字段。
    // 因此此处不能再判断 p.enabled，否则所有 provider 都会被跳过，导致
    // modelSupportsReasoning 永远为空 map，用户端会误判所有非启发式命名的模型不支持深度思考。
    for (const p of providers) {
      for (const m of (p.models || [])) {
        if (m && m.id) {
          map[m.id] = !!m.supportsReasoning
        }
      }
    }
    setModelSupportsReasoning(map)
    setProviderConfigLoaded(true)
    if (typeof window !== 'undefined' && (window as any).__berryDebugReasoning) {
      console.log('[Reasoning] map built from useAIModels, keys =', Object.keys(map), 'map =', map)
    }
  }, [aiConfig, aiConfigLoading, providerConfigLoaded])

  // 页面回到前台时重新拉一次 providers 配置，兼容用户在 admin 改完回来
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        aiConfigRefetch()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [aiConfigRefetch])

  // 判断指定 modelId 是否支持深度推理
  // 优先级：admin 配置 > 模型名启发式
  // 返回值：
  //   true  - 支持
  //   false - 不支持
  //   null  - 未知（配置未加载完成或无法确定），调用方应放行
  const checkModelSupportsReasoning = useCallback(
    (modelId: string | undefined | null): boolean | null => {
      if (!modelId) return null
      // 1) 配置已加载：优先用 admin 配置（含 false 也算确定结果）
      if (providerConfigLoaded) {
        // 同时按 id 和 name 双向匹配，兼容不同来源的 selectedModel
        const idHit = modelId in modelSupportsReasoning
        if (idHit) {
          const v = modelSupportsReasoning[modelId]
          if (typeof window !== 'undefined' && (window as any).__berryDebugReasoning) {
            console.log('[Reasoning] hit by id:', modelId, '=>', v)
          }
          return v === true
        }
        // 反向匹配：如果 selectedModel 是 name，而 map 的 key 是 id，按 name 查一次
        for (const key of Object.keys(modelSupportsReasoning)) {
          if (key === modelId) {
            const v = modelSupportsReasoning[key]
            if (typeof window !== 'undefined' && (window as any).__berryDebugReasoning) {
              console.log('[Reasoning] hit by key:', key, '=>', v)
            }
            return v === true
          }
        }
        // 配置已加载但没记录该模型：走兜底启发式
        const m = String(modelId).toLowerCase()
        const heuristic =
          m.includes('deepseek') ||
          m.includes('reasoner') ||
          m.includes('thinking') ||
          /qwen3.*-r1/.test(m) ||
          /\bqwq\b/.test(m) ||
          /\bo1\b/.test(m) ||
          /\bo3\b/.test(m) ||
          m.includes('r1-')
        if (typeof window !== 'undefined' && (window as any).__berryDebugReasoning) {
          console.log('[Reasoning] miss, fallback heuristic for', modelId, '=>', heuristic)
        }
        return heuristic
      }
      // 2) 配置未加载：返回 null，调用方应放行
      return null
    },
    [modelSupportsReasoning, providerConfigLoaded],
  )

  // Load Sessions
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sessions")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data?.sessions)) {
            setSessions(data.sessions)
            const lastId = localStorage.getItem("ai-last-session-id")
            if (lastId && data.sessions.find((s: SessionMeta) => s.id === lastId)) {
              switchActiveSession(lastId)
            } else if (data.sessions.length > 0) {
              switchActiveSession(data.sessions[0].id)
            } else {
              createNewSession()
            }
          }
        }
      } catch { }
    })()
  }, [])

  // Load Messages
  useEffect(() => {
    if (!sessionId) return
    activeSessionIdRef.current = sessionId

    // 🔒 临时会话：不写 last-session-id（下次打开应用不该恢复它），也不回源服务端
    if (isTempSession(sessionId)) {
      const live = sessionScopesRef.current[sessionId]
      if (live) {
        setMessages([...live.messages])
        messagesRef.current = [...live.messages]
      }
      return
    }

    localStorage.setItem("ai-last-session-id", sessionId)

    // 🔥 关键修复：若该会话已有内存快照（任务正在后台执行，或刚执行完），
    // 直接用快照恢复 —— 既不打断后台流，也能立刻看到实时进度/完整结果。
    // 只有从未在本页运行过任务的会话才回源到服务端拉取历史。
    const live = sessionScopesRef.current[sessionId]
    if (live) {
      setMessages([...live.messages])
      messagesRef.current = [...live.messages]
      setAgentStatus(live.agentStatus)
      setAgentSteps([...live.agentSteps])
      setAiActionSummary(live.aiActionSummary)
      setLatestTaskListContent(live.latestTaskListContent)
      setContextUsage(live.contextUsage ?? null)
      setIsLoading(!!live.running)
      try {
        const draft = localStorage.getItem(`ai-input-draft-${sessionId}`)
        if (typeof draft === "string") setInput(draft)
      } catch { }
      return
    }

    // 切换会话时重置上一会话残留的思考链 / 状态，避免串台
    setAgentStatus("")
    setAgentSteps([])
    setAiActionSummary(null)
    setLatestTaskListContent("")
    setContextUsage(null)
    setIsLoading(false)

      ; (async () => {
        try {
          const res = await fetch(`/api/sessions/${sessionId}`)
          if (res.ok) {
            const data = await res.json()
            const msgs = Array.isArray(data?.messages) ? (data.messages as Message[]) : []
            // 若异步返回时用户已切到别的会话，丢弃这次结果（避免覆盖）
            if (activeSessionIdRef.current !== sessionId) return
            setMessages(msgs.length > 0 ? msgs : [])
            // 🔥 历史消息加载完成：以当前数量为边界，之后新增的消息视为"新消息"
            setNewMessageBoundary(msgs.length)
            try {
              const draft = localStorage.getItem(`ai-input-draft-${sessionId}`)
              if (typeof draft === "string") setInput(draft)
            } catch { }
          }
        } catch { }
      })()
  }, [sessionId])

  // Scroll to bottom - Let ConversationContent handle scrolling internally
  // useEffect(() => {
  //   if (autoScroll && scrollAreaRef.current) {
  //     const scrollContainer = scrollAreaRef.current
  //     scrollContainer.scrollTo({
  //       top: scrollContainer.scrollHeight,
  //       behavior: "smooth"
  //     })
  //   }
  // }, [messages, isLoading, autoScroll])

  const abortControllerRef = useRef<AbortController | null>(null)
  const feedbackTimeoutIdsRef = useRef<NodeJS.Timeout[]>([])

  const handleStop = () => {
    const cid = activeSessionIdRef.current || sessionId

    // 1. 只中止「当前会话」的流（其他会话的后台任务不受影响）
    const ctrl = cid ? streamControllersRef.current[cid] : undefined
    if (ctrl) {
      try { ctrl.abort("Task terminated by user") } catch { }
      delete streamControllersRef.current[cid]
    }
    if (abortControllerRef.current === ctrl) abortControllerRef.current = null

    // Stop TTS
    ttsStop()

    // 2. 标记该会话停止，阻止其后续执行
    const stopFlag = cid ? streamStopRefs.current[cid] : undefined
    if (stopFlag) stopFlag.current = true
    isStoppedRef.current = true

    // 清除所有未执行的反馈回调
    feedbackTimeoutIdsRef.current.forEach(id => clearTimeout(id))
    feedbackTimeoutIdsRef.current = []

    // 🔥 清理挂起的等待用户输入状态
    // 后端 Agent Loop 因 SSE 断开也会 reject promise（req.signal abort）
    if (waitingForUserInputRef.current) {
      console.log('[Chat] Stop: clearing waiting state')
      waitingForUserInputRef.current = null
    }

    // 3. 清除所有状态（同时同步会话快照，保证切走再切回状态一致）
    const scope = cid ? sessionScopesRef.current[cid] : undefined
    if (scope) { scope.running = false; scope.isLoading = false; scope.agentStatus = "" }
    if (cid) {
      const flag = streamStopRefs.current[cid]
      if (flag) flag.current = true
      setRunningSessions(prev => { const n = { ...prev }; delete n[cid]; return n })
    }
    setIsLoading(false)
    setAgentStatus("")
    setIsExecutingControl(false)
    setDevicePillExpanded(false)
    setExecutingDeviceName("")

    // 🔥 用户停止：把 AI 动作总结标记为 stopped
    setAiActionSummary((prev) => prev ? { ...prev, status: "stopped" } : null)

    // 4. 添加一条系统消息提示（同步写快照，切走后回来仍能看到）
    const stopMsg: Message = { role: "assistant", content: "🛑 已响应您的请求，立即停止所有操作 (Generation & Execution Terminated)。" }
    if (scope) scope.messages = [...scope.messages, stopMsg]
    setMessages(prev => [...prev, stopMsg])

    // 5. 短暂显示通知
    showNotice("操作已强制终止", "AI 生成与设备控制已中断", "error")
  }

  // -------------------------------------------------------------------------
  // 视觉巡检共享逻辑
  // -------------------------------------------------------------------------
  // 原先 move_camera_and_look 与 take_camera_snapshot 各自复制了一整套
  // 「取流地址 → 解析可播放地址 → 轮询抓帧」逻辑（含两份 70 行的 getPlayableUrl），
  // 且抓帧用「20s 硬超时 + 6s 截图延迟」两个互不知情的定时器，
  // 导致画面明明抓到了却报超时、超时了却照样截图。这里统一收敛为单一实现。

  /** 清空视觉巡检相关状态（含播放器卸载） */
  const resetVisionInspection = useCallback(() => {
    setVisionInspectionUrl(null)
    setVisionInspectionStatus('')
    setVisionCapturedImage(null)
    setInspectionCameraUrl(null)
    setIsInspecting(false)
  }, [])

  /**
   * 把截图以「用户可见的助手消息」插入对话流（仅展示，不触发 AI 新的一轮推理）。
   *
   * 调用方 = `finishVisionCapture` ← `executeCommands` ← 设备控制卡上用户手动点「截图」。
   * （AI 自己抓帧的那条链路走 `pendingCameraSnapshotsRef` + `__flushCameraSnapshots`，
   *  不经过这里。）
   *
   * 🚨 必须带 `snapshot` 标记（2026-10-18 补）：渲染层靠它决定走**快照卡**
   * 还是 **168px 小预览**（chat-message-renderer 的 `msg.snapshot ? … : …` 分支）。
   * 缺了它，同一张画面从设备卡手动触发时用户只能看到一个小缩略图 —— 与
   * "AI 抓帧投递"两条链路形态不一致，看起来就像"卡片出了问题"。
   */
  const appendCameraSnapshotMessage = useCallback((cameraId: 'a' | 'b', dataUrl: string, query?: string) => {
    setMessages((prev: Message[]) => {
      const label = cameraId === 'b' ? 'B' : 'A'
      const text = query
        ? `针对「${query}」，这是从摄像头 ${label} 获取的实时截图：`
        : `这是从摄像头 ${label} 获取的实时截图：`
      const newMsgs = [...prev, {
        role: "assistant",
        content: [
          { type: "text", text },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
        snapshot: { camera: cameraId, capturedAt: Date.now() },
      } as Message]
      if (sessionId && !isTempSession(sessionId)) {
        fetch(`/api/sessions/${sessionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMsgs }),
        }).catch(console.error)
      }
      return newMsgs
    })
  }, [sessionId])

  /**
   * 视觉巡检通用流程：取流地址 → 挂载播放器 → 抓帧。
   * 失败时内部已完成状态清理与错误提示，返回 null，调用方应 break。
   */
  const runVisionCapture = useCallback(async (
    cameraId: 'a' | 'b',
    options: { errorTitle: string; busyText: string }
  ) => {
    setVisionVideoElementId(VISION_CAMERA_ELEMENT_ID)
    setVisionCapturedImage(null)
    setVisionInspectionStatus('正在建立摄像头连接...')
    showNotice("📷 视觉巡检", options.busyText, "loading")

    // 1. 取摄像头地址
    let cameraUrl = ''
    try {
      const camRes = await fetch('/api/ai/camera-capture')
      if (camRes.ok) {
        const camData = await camRes.json()
        const cam = cameraId === 'b' ? camData.cameras?.b : camData.cameras?.a
        if (cam?.available && cam?.url) cameraUrl = cam.url
      }
    } catch (e) {
      console.error('[Vision] Failed to get camera URL:', e)
    }

    if (!cameraUrl) {
      resetVisionInspection()
      showNotice("❌ 视觉巡检失败", "摄像头未配置或不可用", "error")
      return null
    }

    // 2. 解析为浏览器可播放地址并挂载播放器
    const playableUrl = getPlayableUrl(cameraUrl)
    console.log("[AI Vision] Playable URL resolved to:", playableUrl)
    if (!playableUrl) {
      resetVisionInspection()
      showNotice("❌ 视觉巡检失败", "摄像头流地址无效，无法解析", "error")
      return null
    }
    setVisionInspectionUrl(playableUrl)

    // 3. 抓帧。抓帧工具每 250ms 回调一次进度，这里做文案去重避免高频 setState
    const cameraLabel = cameraId === 'b' ? 'B' : 'A'
    let lastProgress = ''
    const onProgress = (stage: CaptureStage, detail?: string) => {
      if (!detail) return
      const msg = stage === 'retrying' ? detail : `${cameraLabel} 摄像头：${detail}`
      if (msg === lastProgress) return
      lastProgress = msg
      setVisionInspectionStatus(msg)
    }

    try {
      return await captureVideoFrame(VISION_CAMERA_ELEMENT_ID, {
        onProgress,
        // 用户点停止时立即放弃，不再空等满超时
        shouldAbort: () => isStoppedRef.current,
        retries: 1,
      })
    } catch (err) {
      console.error('[Vision] Camera capture failed:', err)

      // 用户主动停止：不再弹错误提示（handleStop 已统一提示）
      if (err instanceof CameraCaptureError && err.code === 'ABORTED') {
        resetVisionInspection()
        return null
      }

      const message = err instanceof Error ? err.message : '未知错误'
      resetVisionInspection()
      showNotice(`❌ ${options.errorTitle}`, message, "error")
      return null
    }
  }, [resetVisionInspection, showNotice])

  /** 抓帧成功后的收尾：展示截图、插入对话流、延时收起 */
  const finishVisionCapture = useCallback((
    cameraId: 'a' | 'b',
    dataUrl: string,
    meta: { width: number; height: number; waitedMs: number },
    query?: string
  ) => {
    setVisionCapturedImage(dataUrl)
    // 立刻释放播放器，停止继续拉流占用带宽（组件会在有截图后自动切到静态图）
    setVisionInspectionUrl(null)
    // 「完成」是步骤推断的关键字，放在句首卡片才会正确显示为已完成
    setVisionInspectionStatus(
      `巡检完成，已捕获 ${cameraId.toUpperCase()} 摄像头画面（${meta.width}×${meta.height}，耗时 ${(meta.waitedMs / 1000).toFixed(1)}s）`
    )
    showNotice(
      "✅ 视觉巡检",
      `已捕获画面（耗时 ${(meta.waitedMs / 1000).toFixed(1)}s）`,
      "success"
    )

    appendCameraSnapshotMessage(cameraId, dataUrl, query)

    // 保留一段时间让用户看到截图，再收起巡检卡片
    window.setTimeout(() => resetVisionInspection(), 6000)
  }, [appendCameraSnapshotMessage, resetVisionInspection, showNotice])

  const executeCommands = async (commands: any[], originalContent?: string) => {
    if (!commands || commands.length === 0) {
      // 兜底：若上层 finally 因 hasFollowupCommands 未清理 isLoading，此处补清理
      setIsLoading(false)
      setAgentStatus("")
      return
    }
    if (isStoppedRef.current) return // 如果已停止，直接不执行
    
    // 重置停止标志
    isStoppedRef.current = false
    
    // 设备名称映射 (Relay 5=水泵, 6=风扇, 7=补光灯, 8=光照植物补光灯)
    const deviceNames: Record<string, string> = {
      '5': '水泵',
      '6': '风扇', 
      '7': '补光灯',
      '8': '光照植物补光灯'
    }

    // --- 客户端防抖与循环检测逻辑 ---
    const now = Date.now();
    
    // 提取命令的关键特征，忽略无关字段（如 timestamp, reason 等）
    const getCanonicalSignature = (cmd: any) => {
      const { action, device, value, r, g, b, direction } = cmd;
      // 过滤掉 undefined 的字段，确保 key 顺序一致
      const cleanObj: any = { action };
      if (device !== undefined) cleanObj.device = device;
      if (value !== undefined) cleanObj.value = value;
      if (r !== undefined) cleanObj.r = r;
      if (g !== undefined) cleanObj.g = g;
      if (b !== undefined) cleanObj.b = b;
      if (direction !== undefined) cleanObj.direction = direction;
      return JSON.stringify(cleanObj);
    };

    const commandSignatures = commands.map(getCanonicalSignature).sort().join('|');
    
    // 清理超过 60 秒的历史记录
    commandHistoryRef.current = commandHistoryRef.current.filter(h => now - h.timestamp < 60000);
    
    // 检查是否在短时间内（30秒内）执行过完全相同的命令集
    const recentIdenticalExecution = commandHistoryRef.current.find(h => h.signature === commandSignatures && now - h.timestamp < 30000);
    
    if (recentIdenticalExecution) {
        executionLoopCountRef.current += 1;
        console.warn(`Duplicate command detected! Loop count: ${executionLoopCountRef.current}`);
        
        if (executionLoopCountRef.current >= 2) { // 连续重复 2 次以上（即第 3 次尝试）就拦截
            showNotice("循环熔断触发", "检测到 AI 重复执行无效指令，已强制拦截。", "error");
            
            // 构造一个虚拟的助手消息，告知 AI 停止
            if (autoExecuteCommands) {
                 // 延迟发送，避免状态更新冲突
                 setTimeout(() => {
                    handleSend(`【系统警告】检测到指令死循环！
你刚刚在 30 秒内连续尝试执行了相同的指令：${JSON.stringify(commands)}
但这并没有改变环境状态（可能是传感器延迟或设备故障）。

**强制熔断机制已触发**。
请在使用 <TASK_LIST> 推进进度前，向用户寻求指示。告诉用户发生了什么，并将当前任务设为暂停(或者保持不动)，并**直接原样**输出以下代码块（不要做任何修改，它将在前端渲染为按钮），让用户决定是否跳过此任务或继续重试：

<ACTION_PROMPT>
  <ACTION value="由于设备响应迟缓，跳过重试该任务，直接将当前任务标记为 completed 或 failed，进入下一个步骤">跳过任务，直接执行下一步</ACTION>
  <ACTION value="忽略系统警告，我认为设备会响应，再次向设备发送刚才的 JSON 控制指令重试">继续执行重试</ACTION>
</ACTION_PROMPT>`);
                 }, 1000);
            }
            return; // 终止执行
        }
    } else {
        // 如果是新指令，重置计数器
        executionLoopCountRef.current = 0;
    }
    
    // 记录本次执行
    commandHistoryRef.current.push({ signature: commandSignatures, timestamp: now });
    // --------------------------------
    
    setIsExecutingControl(true) // 开启发光动效
    showNotice("正在执行指令...", `共发现 ${commands.length} 个操作`, "loading")

    for (const cmd of commands) {
      // 检查是否已停止
      if (isStoppedRef.current) {
        showNotice("执行中断", "用户已停止操作", "error")
        break
      }

      try {
        if (cmd.action === "set_led") {
          // 🔥 检查设备控制功能是否被禁用
          if (aiFeatures.enableDeviceControl === false) {
            console.log('[Device Control] Feature disabled by admin')
            showNotice("❌ 功能已禁用", "管理员已禁用设备控制功能", "error")
            // 🔥 架构变更：不再通过 silent message 告知 AI（showNotice 已向用户提示）

            continue // 跳过此命令
          }
          
          // 循环检测暂停状态
          while (isTaskPausedRef.current) {
            if (isStoppedRef.current) break
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          if (isStoppedRef.current) break

          // 先显示小圆点，再展开
          setExecutingDeviceName("植物全光谱补光灯")
          setTimeout(() => setDevicePillExpanded(true), 150)
          
          // 打开工作室并添加到工作室数据
          setStudioOpen(true)
          setStudioData(prev => [...prev, {
            name: 'set_led',
            input: { r: cmd.r, g: cmd.g, b: cmd.b },
            result: { status: 'executing', message: '正在设置补光灯...' }
          }])
          
          const res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set_led', r: cmd.r, g: cmd.g, b: cmd.b })
          })
          
          // 更新工作室状态
          if (res.ok) {
            setStudioData(prev => {
              const newData = [...prev]
              const lastIdx = newData.findLastIndex(d => d.name === 'set_led')
              if (lastIdx >= 0) {
                newData[lastIdx].result = { 
                  status: 'success', 
                  message: `补光灯已设置 (R:${cmd.r} G:${cmd.g} B:${cmd.b})`,
                  color: { r: cmd.r, g: cmd.g, b: cmd.b }
                }
              }
              return newData
            })
            showNotice("调控成功 ✅", `已开启补光灯 (R:${cmd.r} G:${cmd.g} B:${cmd.b})`, "success")
          } else {
            let err = ''
            try { const j = await res.json(); err = j?.error || '' } catch { }
            setStudioData(prev => {
              const newData = [...prev]
              const lastIdx = newData.findLastIndex(d => d.name === 'set_led')
              if (lastIdx >= 0) {
                newData[lastIdx].result = { status: 'error', error: err || `请求错误 ${res.status}` }
              }
              return newData
            })
            showNotice("调控失败", err || `请求错误 ${res.status}`, "error")
          }
        } else if (cmd.action === "toggle_relay") {
          // 🔥 检查设备控制功能是否被禁用
          if (aiFeatures.enableDeviceControl === false) {
            console.log('[Device Control] Feature disabled by admin')
            showNotice("❌ 功能已禁用", "管理员已禁用设备控制功能", "error")
            // 🔥 架构变更：不再通过 silent message 告知 AI（showNotice 已向用户提示）

            continue // 跳过此命令
          }
          
          // 循环检测暂停状态
          while (isTaskPausedRef.current) {
            if (isStoppedRef.current) break
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          if (isStoppedRef.current) break

          const devName = deviceNames[String(cmd.device)] || `设备${cmd.device}`
          // 先显示小圆点，再展开
          setExecutingDeviceName(devName)
          setTimeout(() => setDevicePillExpanded(true), 150)
          
          // 打开工作室并添加到工作室数据
          setStudioOpen(true)
          setStudioData(prev => [...prev, {
            name: 'toggle_relay',
            input: { device: cmd.device, value: cmd.value, deviceName: devName },
            result: { status: 'executing', message: `正在${cmd.value === 1 ? '开启' : '关闭'}${devName}...` }
          }])
          
          // 如果是开启补光灯 (relay7)，由于 set_led 也会控制 relay7，这里可以增加一个判断或合并逻辑
          // 但目前保持独立调用以兼容旧设备逻辑
          
          const res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_relay', device: cmd.device, value: cmd.value })
          })
          
          // 更新工作室状态
          if (res.ok) {
            setStudioData(prev => {
              const newData = [...prev]
              const lastIdx = newData.findLastIndex(d => d.name === 'toggle_relay')
              if (lastIdx >= 0) {
                newData[lastIdx].result = { 
                  status: 'success', 
                  message: `${devName} 已${cmd.value === 1 ? '开启' : '关闭'}`,
                  device: cmd.device,
                  value: cmd.value
                }
              }
              return newData
            })
            showNotice("开关执行成功 ✅", `${devName} 已${cmd.value === 1 ? '开启' : '关闭'}`, "success")
          } else {
            let err = ''
            try { const j = await res.json(); err = j?.error || '' } catch { }
            setStudioData(prev => {
              const newData = [...prev]
              const lastIdx = newData.findLastIndex(d => d.name === 'toggle_relay')
              if (lastIdx >= 0) {
                newData[lastIdx].result = { status: 'error', error: err || `请求错误 ${res.status}` }
              }
              return newData
            })
            showNotice("开关执行失败", err || `请求错误 ${res.status}`, "error")
          }
        } else if (cmd.action === "control_camera") {
          // 🔥 检查设备控制功能是否被禁用
          if (aiFeatures.enableDeviceControl === false) {
            console.log('[Device Control] Feature disabled by admin')
            showNotice("❌ 功能已禁用", "管理员已禁用设备控制功能", "error")
            // 🔥 架构变更：不再通过 silent message 告知 AI（showNotice 已向用户提示）

            continue // 跳过此命令
          }
          
          // 循环检测暂停状态
          while (isTaskPausedRef.current) {
            if (isStoppedRef.current) break
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          if (isStoppedRef.current) break

          // 边界检查 - 防止无效移动
          const currentPos = (deviceDataRef.current?.stepper_position || 0) / 160 // 转换为mm
          const direction = cmd.direction ?? 0
          
          // 检查左边界
          if (direction === 1 && currentPos <= 10) {
            showNotice("云台控制失败", `已经在最左侧（${currentPos.toFixed(1)}mm），无法继续左移`, "error")
            continue // 跳过这个命令
          }

          // 检查右边界
          if (direction === 2 && currentPos >= 690) {
            showNotice("云台控制失败", `已经在最右侧（${currentPos.toFixed(1)}mm），无法继续右移`, "error")
            continue // 跳过这个命令
          }

          // 摄像头云台控制
          const directionNames = ['停止', '左移', '右移']
          const dirName = directionNames[direction] || '控制'
          setExecutingDeviceName("摄像头云台")
          setTimeout(() => setDevicePillExpanded(true), 150)
          
          // 打开工作室并添加到工作室数据
          setStudioOpen(true)
          setStudioData(prev => [...prev, {
            name: 'control_camera',
            input: { 
              direction: cmd.direction, 
              pulses: cmd.pulses, 
              distance_mm: cmd.distance_mm || (cmd.pulses ? (cmd.pulses / 160).toFixed(1) : undefined),
              currentPos: currentPos.toFixed(1)
            },
            result: { status: 'executing', message: `正在${dirName}摄像头云台...` }
          }])
          
          const res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'control_camera', 
              direction: cmd.direction, 
              pulses: cmd.pulses,
              distance_mm: cmd.distance_mm  // 添加distance_mm支持
            })
          })
          
          // 更新工作室状态
          if (res.ok) {
            setStudioData(prev => {
              const newData = [...prev]
              const lastIdx = newData.findLastIndex(d => d.name === 'control_camera')
              if (lastIdx >= 0) {
                newData[lastIdx].result = { 
                  status: 'success', 
                  message: `摄像头云台${dirName}完成`,
                  direction: cmd.direction,
                  pulses: cmd.pulses
                }
              }
              return newData
            })
            showNotice("云台控制成功 ✅", `摄像头云台${dirName}`, "success")
          } else {
            let err = ''
            try { const j = await res.json(); err = j?.error || '' } catch { }

            setStudioData(prev => {
              const newData = [...prev]
              const lastIdx = newData.findLastIndex(d => d.name === 'control_camera')
              if (lastIdx >= 0) {
                newData[lastIdx].result = { status: 'error', error: err || `请求错误 ${res.status}` }
              }
              return newData
            })
            showNotice("云台控制失败", err || `请求错误 ${res.status}`, "error")
          }
        } else if (cmd.action === "move_camera_and_look") {
          // AI 视觉巡检：移动云台 + 截图 + 发送VLM分析
          
          // 🔥 检查视觉巡检功能是否被禁用
          if (aiFeatures.enableVisionInspection === false) {
            console.log('[Vision Inspection] Feature disabled by admin')
            showNotice("❌ 功能已禁用", "管理员已禁用视觉巡检功能", "error")
            // 🔥 架构变更：不再通过 silent message 告知 AI（showNotice 已向用户提示）

            continue // 跳过此命令
          }
          
          while (isTaskPausedRef.current) {
            if (isStoppedRef.current) break
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          if (isStoppedRef.current) break

          setExecutingDeviceName("视觉巡检")
          setTimeout(() => setDevicePillExpanded(true), 150)
          
          const direction = cmd.direction ?? 0
          const pulses = cmd.pulses ?? 1600
          const cameraId = (cmd.camera || 'a') as 'a' | 'b'
          const query = cmd.query || '请描述你在画面中看到的内容'

          // 打开工作室面板
          setStudioOpen(true)
          setIsInspecting(true)
          setInspectionCamera(cameraId)
          setVisionInspectionStatus("初始化巡检任务...")
          setVisionVideoElementId('studio-vision-camera')
          setVisionCapturedImage(null)

          // Step 1: 移动云台（如果direction不为0）- 通过 Agent Loop 调用
          if (direction !== 0) {
            const moveMsg = `正在将摄像头云台${direction === 1 ? '左移' : '右移'} ${(pulses / 160).toFixed(1)}mm...`;
            setVisionInspectionStatus(moveMsg);
            showNotice("🔄 视觉巡检", moveMsg, "loading")
            
            // 将云台移动作为工具调用添加到工作室
            setStudioData(prev => [...prev, {
              name: 'control_camera',
              input: { direction, pulses, distance_mm: (pulses / 160).toFixed(1) },
              result: { status: 'moving', message: moveMsg }
            }])
            
            try {
              const moveRes = await fetch('/api/ai/device-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'control_camera', direction, pulses })
              })
              if (!moveRes.ok) {
                const errData = await moveRes.json().catch(() => ({}))
                const errorMsg = errData?.error || '未知错误'
                showNotice("云台移动失败", errorMsg, "error")
                
                // 更新工作室状态
                setStudioData(prev => {
                  const newData = [...prev]
                  const lastIdx = newData.findIndex(d => d.name === 'control_camera')
                  if (lastIdx >= 0) {
                    newData[lastIdx].result = { status: 'error', error: errorMsg }
                  }
                  return newData
                })
                
                // 如果是边界错误，发送反馈给AI让它重新思考
                if (errorMsg.includes('已经到达') || errorMsg.includes('原点') || errorMsg.includes('边界') || errorMsg.includes('limit')) {
                  // 更新最后一条助手消息，添加错误信息
                  setMessages(prev => {
                    const newMsgs = [...prev]
                    const lastAssistantIdx = newMsgs.length - 1
                    if (lastAssistantIdx >= 0 && newMsgs[lastAssistantIdx].role === 'assistant') {
                      newMsgs[lastAssistantIdx] = {
                        ...newMsgs[lastAssistantIdx],
                        commandErrors: {
                          ...(newMsgs[lastAssistantIdx].commandErrors || {}),
                          0: errorMsg // 假设云台控制是第一个命令
                        }
                      }
                    }
                    return newMsgs
                  })

                  break // 停止当前执行流程
                }
              } else {
                // 更新工作室状态为成功
                setStudioData(prev => {
                  const newData = [...prev]
                  const lastIdx = newData.findIndex(d => d.name === 'control_camera')
                  if (lastIdx >= 0) {
                    newData[lastIdx].result = { status: 'success', message: '云台移动完成' }
                  }
                  return newData
                })
              }
            } catch (e) {
              console.error('Stepper move failed:', e)
            }
            
            // 等待云台移动完成（考虑物理延迟）
            const moveTime = Math.max(2000, pulses / 80) // 根据脉冲数计算移动时间，最少2秒
            setVisionInspectionStatus(`云台移动中，预计需要 ${(moveTime / 1000).toFixed(1)} 秒...`)
            await new Promise(resolve => setTimeout(resolve, moveTime))
            if (isStoppedRef.current) break
          }

          // Step 2: 取流地址 → 挂载播放器 → 抓帧（超时/重试/黑屏检测均在 captureVideoFrame 内处理）
          const capture = await runVisionCapture(cameraId, {
            errorTitle: "截图失败",
            busyText: "正在连接摄像头...",
          })
          if (isStoppedRef.current) break
          if (!capture) {
            // 失败原因与状态清理已在 runVisionCapture 内完成
            setInspectionStatus("视觉巡检失败")
            break
          }

          // Step 3: 展示截图。
          // 注意：截图只作用户可见的结果展示，不会再静默回流给 AI ——
          // AI 侧的图像由后端 ffmpeg 抓帧通道（move_camera_and_look MCP 工具）在同一轮内提供。
          finishVisionCapture(cameraId, capture.dataUrl, capture, query)

          // 重要：完成视觉巡检后立即跳出当前指令执行循环，避免后续代码继续触发全局反馈循环
          break;
        } else if (cmd.action === "take_camera_snapshot") {
          // 🔥 检查视觉巡检功能是否被禁用
          if (aiFeatures.enableVisionInspection === false) {
            console.log('[Camera Snapshot] Feature disabled by admin')
            showNotice("❌ 功能已禁用", "管理员已禁用摄像头截图功能", "error")
            // 🔥 架构变更：不再通过 silent message 告知 AI（showNotice 已向用户提示）

            continue // 跳过此命令
          }
          
          while (isTaskPausedRef.current) {
            if (isStoppedRef.current) break
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          if (isStoppedRef.current) break

          setExecutingDeviceName("获取截图")
          setTimeout(() => setDevicePillExpanded(true), 150)
          
          const cameraId = (cmd.camera || 'a') as 'a' | 'b'

          setIsInspecting(true)
          setInspectionCamera(cameraId)
          setInspectionStatus("正在获取摄像头实时画面...")

          const capture = await runVisionCapture(cameraId, {
            errorTitle: "获取截图失败",
            busyText: "正在连接摄像头...",
          })
          if (isStoppedRef.current) break
          if (!capture) {
            setInspectionStatus("获取截图失败")
            break
          }

          // 截图只作用户可见展示，不再静默回流给 AI（AI 侧图像由后端 ffmpeg 抓帧通道提供）
          finishVisionCapture(cameraId, capture.dataUrl, capture)

          break;
        } else if (cmd.action === "reset_camera") {
          // 🔥 检查设备控制功能是否被禁用
          if (aiFeatures.enableDeviceControl === false) {
            console.log('[Device Control] Feature disabled by admin')
            showNotice("❌ 功能已禁用", "管理员已禁用设备控制功能", "error")
            // 🔥 架构变更：不再通过 silent message 告知 AI（showNotice 已向用户提示）

            continue // 跳过此命令
          }
          
          // 摄像头云台复位到最左侧原点
          while (isTaskPausedRef.current) {
            if (isStoppedRef.current) break
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          if (isStoppedRef.current) break

          setExecutingDeviceName("云台复位")
          setTimeout(() => setDevicePillExpanded(true), 150)
          const res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset_camera' })
          })
          if (res.ok) {
            showNotice("云台复位成功 ✅", "丝杆滑台已复位到最左侧原点", "success")
          } else {
            let err = ''
            try { const j = await res.json(); err = j?.error || '' } catch { }
            showNotice("云台复位失败", err || `请求错误 ${res.status}`, "error")
          }
        }
        // Add a small delay between commands to avoid flooding
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 再次检查停止
        if (isStoppedRef.current) break;

        // 保持显示一段时间让用户看到
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // 再次检查停止
        if (isStoppedRef.current) break;

        // 先收起胶囊，再清除设备名称
        setDevicePillExpanded(false)
        await new Promise(resolve => setTimeout(resolve, 300))
        setExecutingDeviceName("")
      } catch (e) {
        console.error("Command execution error", e)
      }
    }
    // 关闭动效
    setDevicePillExpanded(false)
    await new Promise(resolve => setTimeout(resolve, 300))
    setExecutingDeviceName("")
    // 延迟关闭发光
    setTimeout(() => {
      if (!isStoppedRef.current) setIsExecutingControl(false)
    }, 2000)

    // 捕获执行前的快照 (从 deviceDataRef 中获取，因为 deviceData 可能因为闭包不是最新的)
    // 但这里的 deviceDataRef.current 实际上可能已经是执行后的部分状态了（取决于推送速度），
    // 理想情况下应该在 executeCommands 开头捕获。
    // 不过考虑到 MQTT 延迟，现在的 deviceDataRef.current 可能还没有变，这正是我们想要的“执行前”快照。
    // 如果想要更严谨，应该在函数入口处捕获。
    
    // 检查停止
    if (isStoppedRef.current) return;

    // 这里我们构建一个包含快照的消息
    const snapshot = deviceDataRef.current;
    let snapshotText = "";
    if (snapshot) {
      // 检查属性是否存在，避免 undefined 错误
      const temp = snapshot.temperature !== undefined ? snapshot.temperature.toFixed(1) + '°C' : '未知';
      const hum = snapshot.humidity !== undefined ? snapshot.humidity.toFixed(1) + '%' : '未知';
      const light = snapshot.light !== undefined ? snapshot.light + ' lux' : '未知';
      const co2 = snapshot.co2 !== undefined ? snapshot.co2 + ' ppm' : '未知';
      const relay7 = snapshot.relay7 === 1 ? '开启' : '关闭';
      const relay8 = snapshot.relay8 === 1 ? '开启' : '关闭';
      const led1 = snapshot.led1 !== undefined ? snapshot.led1 : '未知';
      const led2 = snapshot.led2 !== undefined ? snapshot.led2 : '未知';
      const led3 = snapshot.led3 !== undefined ? snapshot.led3 : '未知';
      
      snapshotText = `
【执行前数据快照】(仅供对比，请以当前最新数据为准)
- 温度: ${temp}
- 湿度: ${hum}
- 光照: ${light}
- CO2: ${co2}
- 植物全光谱补光灯(Relay7): ${relay7}
- 光照植物补光灯(Relay8): ${relay8}
- LED光谱(RGB): R:${led1} G:${led2} B:${led3}
- 丝杆滑台位置: ${snapshot.stepper_position !== undefined ? (snapshot.stepper_position / 160).toFixed(1) + 'mm (' + snapshot.stepper_position + '脉冲)' : '未知'}
- 丝杆滑台状态: ${snapshot.stepper_direction === 1 ? '正在左移' : snapshot.stepper_direction === 2 ? '正在右移' : '已停止'}
`;
    }

    // 自动发送反馈消息，形成 Agent 闭环
    // 增加延迟到 5秒，等待设备响应和数据刷新
    if (isStoppedRef.current) return;
    
    // 🔥 架构变更（重要）：原 feedbackLoop 静默消息回流机制已移除。
    // 旧机制：executeCommands 末尾会等待设备响应 → 更新 TASK_LIST → 通过 isSilent=true
    //   调用 handleSend 把"指令已执行完毕"塞回 AI，让 AI 决定下一步 → 形成 agent 闭环。
    // 新机制：AI 在 Agent Loop 内直接调用 toggle_relay/control_camera 等原生 MCP 工具，
    //   工具内部阻塞等待物理动作完成并返回真实结果，AI 在同一轮请求内继续推理。
    //   因此前端不再需要发送任何静默消息来"告知 AI 设备已执行"。
    //
    // executeCommands 现仅用于：DeviceControlCard 上用户手动点击按钮时执行设备控制。
    // 此路径与 AI 无关，用户点击按钮 → 调 /api/ai/device-control → 更新 UI 状态 → 结束。
    //
    // 短暂等待设备响应（让 UI 显示设备状态变化），然后清理 loading 状态。
    setAgentStatus("等待下位机响应: ESP32-S3...")
    await new Promise(r => setTimeout(r, 1500))
    if (isStoppedRef.current) {
      setAgentStatus("")
      setIsLoading(false)
      return
    }

    // 等待传感器重新采样（与原 feedbackLoop 的等待时长一致，保持 UI 行为兼容）
    setAgentStatus("重新采样: DHT11, BH1750, MH-Z19...")
    await new Promise(r => setTimeout(r, 1500))
    if (isStoppedRef.current) {
      setAgentStatus("")
      setIsLoading(false)
      return
    }

    // 客户端 TASK_LIST 状态更新：手动点击执行后，若消息中包含 TASK_LIST，
    // 将当前 in_progress 任务标记为 completed 并提升下一个 pending 任务。
    // 这部分逻辑保留，因为它只是 UI 端的状态同步，不涉及向 AI 发送静默消息。
    if (originalContent) {
      const match = originalContent.match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          const tasks = parsed?.tasks || [];
          let updated = false;
          tasks.forEach((t: any) => {
            if (t.status === "in_progress") {
              t.status = "completed";
              updated = true;
            }
          });
          if (updated) {
            // 将下一个 pending 任务提升为 in_progress
            for (const t of tasks) {
              if (t.status === "pending") {
                t.status = "in_progress";
                break;
              }
            }
            const newTaskListStr = `<TASK_LIST>${JSON.stringify(parsed)}</TASK_LIST>`;
            setLatestTaskListContent(newTaskListStr);

            setMessages(prev => {
              const next = [...prev];
              const idx = next.findLastIndex(m => m.role === 'assistant');
              if (idx !== -1) {
                const nextContent = (next[idx].content as string).replace(
                  /<TASK_LIST>[\s\S]*?<\/TASK_LIST>/,
                  newTaskListStr
                );
                next[idx] = { ...next[idx], content: nextContent };
              }
              // 保存到本地数据库
              if (sessionId) {
                fetch(`/api/sessions/${sessionId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ messages: next })
                }).catch(console.error);
              }
              return next;
            });
          }
        } catch (e) {
          console.error('[executeCommands] Client-side task status update failed:', e);
        }
      }
    }

    // 清理状态，结束本次手动执行（不再发送任何静默消息给 AI）
    setAgentStatus("")
    setIsLoading(false)
    console.log('[executeCommands] Manual device execution finished (no silent feedback to AI).')
  }

  /**
   * 🏷️ 对话总结（= 对话标题）——「用户开始对话就总结其意图」的唯一入口。
   *
   * · 每个会话只跑一次：`titledSessionsRef` 去重；且只在标题仍是占位（「新会话 …」）
   *   时才动它 —— 用户手动改过名 / 已经总结过的会话不会被覆盖。
   * · 用的是**用户当前选择的模型**（`selectedModel` 优先，其次 `aiSettings.model`）。
   * · 结果同时落到两处，保证「顶栏胶囊」和「侧栏最近对话」说法一致：
   *     PATCH /api/sessions/:id  → 持久化
   *     setSessions              → 顶栏 ConversationSummary 胶囊（见上面的同步 effect）
   */
  const ensureConversationTitle = async (sid: string, msgs: Message[]) => {
    if (!sid || isTempSession(sid)) return
    if (titledSessionsRef.current.has(sid)) return

    const titleMessages = msgs
      .filter((m) => !(m as Message & { isSilent?: boolean }).isSilent)
      .map((m) => ({ role: m.role, content: m.content }))

    // 兜底标题所需的「首条用户消息纯文本」（含多模态数组时取其中的 text 片段）
    const firstUserText = (() => {
      for (const m of titleMessages) {
        if (m.role !== "user") continue
        if (typeof m.content === "string" && m.content.trim()) return m.content
        if (Array.isArray(m.content)) {
          const part = m.content.find((p) => p.type === "text" && p.text)
          if (part?.text) return part.text
        }
      }
      return ""
    })()
    const flatFirstUser = firstUserText.replace(/\s+/g, " ").trim()

    /**
     * 判断一个标题是不是「机器生成的」→ 允许被总结覆盖。
     *  · 「新会话 <时间>」= 新建会话时的占位
     *  · 首条用户消息的前缀（≤30 字）= 旧版 `userMsg.slice(0, 24/30)` 的机械截断
     *    —— 用户手动改名几乎不可能刚好等于原话前缀，所以这两类可以放心覆盖；
     *      真正被用户改过名的标题不会被碰。
     */
    const isAutoTitle = (t: string) => {
      const title = (t || "").trim()
      if (!title) return true
      if (title.startsWith("新会话")) return true
      return !!flatFirstUser && title.length <= 30 && flatFirstUser.startsWith(title)
    }

    const cur = sessions.find((s) => s.id === sid)
    if (!isAutoTitle(cur?.title || "")) return
    // 先占坑再发请求：用户连发两条时，第二条会在这里直接返回，不会重复调用模型
    titledSessionsRef.current.add(sid)

    const stillActive = () => activeSessionIdRef.current === sid
    if (stillActive()) setSummarizing(true)
    try {
      const title = await summarizeConversationTitle(titleMessages, {
        model: selectedModel || aiSettings?.model,
        apiKey: aiSettings?.apiKey,
        apiUrl: aiSettings?.apiUrl,
      })
      const finalTitle = (title || fallbackConversationTitle(firstUserText, 24)).trim()
      if (!finalTitle) return
      await fetch(`/api/sessions/${sid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: finalTitle }),
      })
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sid) return s
          // 生成期间用户手动改名了（或已是总结标题）→ 尊重现状，不覆盖
          if (!isAutoTitle(s.title || "")) return s
          return { ...s, title: finalTitle }
        })
      )
    } catch {
      /* 标题生成失败不影响主对话：保留占位标题即可 */
    } finally {
      if (stillActive()) setSummarizing(false)
    }
  }

  const handleSend = async (
    overrideText?: any, 
    overrideAttachments?: ChatAttachment[], 
    isFeedback: boolean = false, 
    isSilent: boolean = false,
    useSystemApi: boolean = false // 新参数：强制使用系统API（用于定时任务）
  ) => {
    // =========================================================================
    // 🔥 会话作用域绑定层（Session Scope Binding）
    // 目标：用户切换对话时，本任务继续在后台完整执行；切回后无缝恢复实时进度。
    // 做法：把「属于本会话的 UI 状态」写进会话作用域快照（sessionScopesRef），
    //       仅当该会话仍是当前激活会话（前台）时才同步到 React state。
    //       因此下方所有 __commitXxx(...) 调用都无需关心「用户是否已切走」。
    // =========================================================================
    let __scopeKey = ""                                  // 绑定到本任务的会话 id（确定后赋值）
    let __scopeObj: SessionScope | null = null           // 本任务的会话快照
    const __stopRef = { current: false }                 // 本任务专属的停止标志（替代页面级 isStoppedRef）
    const __isFg = () => !!__scopeKey && activeSessionIdRef.current === __scopeKey
    let __taskError = ""                                 // 本任务的失败原因（用于收尾时的桌面端通知）

    /** 取（或惰性创建）本任务的会话快照 */
    const __getScope = (): SessionScope => {
      if (__scopeObj) return __scopeObj
      __scopeObj = {
        key: __scopeKey,
        running: false,
        messages: [...messagesRef.current],
        agentStatus: "",
        agentSteps: [],
        isLoading: false,
        aiActionSummary: null,
        latestTaskListContent: "",
        browsingUrl: null,
        currentBrowserUrl: null,
        browserScreenshot: null,
        studioData: [],
        contextUsage: null,
      }
      return __scopeObj
    }

    /**
     * 会话作用域 setter 工厂：写快照 → 仅前台时同步渲染。
     * 说明：会话 id 尚未确定时（发送前几行）视为前台，行为与改造前一致。
     */
    const __scopedSetter = <T,>(field: keyof SessionScope, commit: (v: T) => void) =>
      (v: React.SetStateAction<T>) => {
        const s = __getScope()
        const prev = s[field] as unknown as T
        const next = (typeof v === "function" ? (v as (p: T) => T)(prev) : v) as T
        ;(s as any)[field] = next
        if (!__scopeKey || __isFg()) commit(next)
      }

    const __commitMessages = __scopedSetter<Message[]>("messages", setMessages)
    const __commitAgentStatus = __scopedSetter<string>("agentStatus", setAgentStatus)
    const __commitAgentSteps = __scopedSetter<AgentStep[]>("agentSteps", setAgentSteps)
    const __commitIsLoading = __scopedSetter<boolean>("isLoading", setIsLoading)
    const __commitAiActionSummary = __scopedSetter<AIActionSummary | null>("aiActionSummary", setAiActionSummary)
    const __commitTaskListContent = __scopedSetter<string>("latestTaskListContent", setLatestTaskListContent)
    const __commitBrowsingUrl = __scopedSetter<string | null>("browsingUrl", setBrowsingUrl)
    const __commitCurrentBrowserUrl = __scopedSetter<string | null>("currentBrowserUrl", setCurrentBrowserUrl)
    const __commitBrowserScreenshot = __scopedSetter<string | null>("browserScreenshot", setBrowserScreenshot)
    const __commitStudioData = __scopedSetter<any[]>("studioData", setStudioData)
    const __commitContextUsage = __scopedSetter<ContextUsageInfo | null>("contextUsage", setContextUsage)

    // 过滤掉可能作为事件对象传入的 overrideText（如 onClick={handleSend}）
    if (overrideText && typeof overrideText === 'object' && !Array.isArray(overrideText)) {
      overrideText = undefined;
    }

    // 立即打断当前正在进行的 TTS 语音播报
    ttsReset()

    // 重置停止状态
    __stopRef.current = false
    
    // 如果是自动触发的调用（传入了 overrideText），则不需要用户输入
    // 这里不再强制将 overrideText 转换为 string，因为它可能是包含图片的数组
    const isAutoTrigger = typeof overrideText !== "undefined";
    const text = isAutoTrigger ? (typeof overrideText === "string" ? overrideText : "【视觉分析请求】") : input;

    // 记录原始意图：如果不是反馈或静默消息，我们就将其定为本次会话链条的“根意图”
    if (!isFeedback && !isSilent && typeof text === 'string' && text.trim()) {
      rootIntentRef.current = text;
      // 用户主动发送新消息时重置标签解析重试计数
      tagRetryCountRef.current = 0;
    }

    // 🔥 计划模式自动收尾：检测到计划批准/拒绝消息时，自动关闭 enablePlanning
    // PlanApprovalCard 的 onApprove/onReject 会发送带前缀的消息，此处统一收尾
    if (typeof text === 'string' && (text.startsWith('【计划批准】') || text.startsWith('【计划拒绝】'))) {
      if (enablePlanning) {
        setEnablePlanning(false)
        console.log(`[Plan Mode] Auto-disabled enablePlanning after ${text.startsWith('【计划批准】') ? 'approval' : 'rejection'}`)
      }
    }
    
    const currentAttachments = overrideAttachments || attachments
    
    // 只有在非自动触发且无输入时才拦截
    if (!isAutoTrigger && !text.trim() && currentAttachments.length === 0) return
    
    // 🔥 澄清卡 / 检查点 / 计划审批的回复必须能穿透 loading 守卫。
    //    原因：Agent Loop 挂起等待用户输入时 isLoading 恒为 true，而这几种回复
    //    （【澄清回复】【检查点确认】【计划批准】【计划拒绝】）属于「延续当前这一轮」。
    //    一旦被守卫拦下，用户看到的就是「卡片提交完，AI 半天不响应」的静默卡死 ——
    //    这是 respondToCheckpoint 兜底路径（如 /api/chat/respond 返回 404）唯一的出口。
    const isCheckpointReply =
      typeof text === 'string' && /^【(澄清回复|检查点确认|计划批准|计划拒绝)】/.test(text)
    // 强制允许视觉截图等内部反馈消息穿透 loading 拦截
    if (isLoading && !isFeedback && !isSilent && !isCheckpointReply) {
        console.log("[handleSend] Blocked by isLoading guard")
        return
    }
    
    __commitIsLoading(true) // 立即锁定，防止重复发送导致“抽搐”
    
    // 模拟感知阶段（仅当是用户主动发送或Agent自动闭环时，且不是简单的反馈重试）
    // 模拟感知阶段（显示简洁的思考状态）
    if (!agentStatus && !isFeedback) {
      __commitAgentStatus("莓小智正在深入思考...")
      await new Promise(r => setTimeout(r, 600)) // 略微保留一点感知感
      if (__stopRef.current) return
    } else if (isFeedback) {
        __commitAgentStatus("正在根据反馈重新分析...")
    }
    
    const isSystemMode = !aiSettings?.apiKey && !aiSettings?.apiUrl;
    const isCustomMode = !!aiSettings?.apiKey || !!aiSettings?.apiUrl;
    
    // 如果是定时任务调用（useSystemApi=true），跳过配置检查，直接使用系统API
    if (!useSystemApi) {
      if (!aiSettings || (!isSystemMode && !isCustomMode)) {
          if (!aiSettings) {
               router.push('/model-store'); 
               return 
          }
      }
      
      if (!aiSettings) { router.push('/model-store'); return }
    }

    const userMsg = text.trim()
    setInput("")
    setEnableSearch(false) // Reset search state after sending

    let ensuredSessionId = sessionId
    if (!ensuredSessionId) {
      await createNewSession()
      const r = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `新会话 ${new Date().toLocaleString("zh-CN")}` }) })
      if (r.ok) {
        const s = await r.json()
        ensuredSessionId = s.id
        switchActiveSession(s.id)
        setSessions(prev => [s, ...prev])
      }
    }

    // 🔥 绑定本任务的会话作用域：注册停止标志句柄，并在会话列表打上「任务进行中」圆点。
    //    此后即使用户切走，本任务仍会把进度写进该快照并在跑完后落库。
    {
      __scopeKey = ensuredSessionId || sessionId
      const sc = __getScope()
      sc.key = __scopeKey
      sc.running = true
      if (__scopeKey) {
        sessionScopesRef.current[__scopeKey] = sc
        streamStopRefs.current[__scopeKey] = __stopRef
        setRunningSessions(prev => (prev[__scopeKey] ? prev : { ...prev, [__scopeKey]: true }))
      }
    }

    const userMessageContent: Message['content'] = (() => {
      // overrideText 是数组（已包含图片等结构）时直接使用
      if (Array.isArray(overrideText)) return overrideText
      // 取基础文本：overrideText 优先（自动触发场景），否则用输入框文本
      const baseText = typeof overrideText === "string" ? overrideText : userMsg
      // 合并附件图片（覆盖自动触发和手动发送两种场景）
      // ⚠️ 只合并**图片**：文档附件的 dataUrl 为空（它们以 fileId 走服务端），
      //    若照旧全量 map 成 image_url，上游会收到 `url: ""` 直接 400。
      const imageAtts = currentAttachments.filter((att) => (att.dataUrl || "").startsWith("data:image/"))
      if (imageAtts.length > 0) {
        return [
          { type: "text", text: baseText },
          ...imageAtts.map((att) => ({ type: "image_url" as const, image_url: { url: att.dataUrl } }))
        ]
      }
      return baseText
    })()

    if (userMsg === "是" || userMsg === "执行") {
      // 🔥 架构变更：设备控制已迁移为原生 MCP 工具调用（toggle_relay / control_camera 等），
      // AI 不再输出 JSON 代码块形式的控制指令，因此不再需要"用户确认执行"的特殊路径。
      // 用户如需控制设备，可直接在对话中描述需求，AI 会自动调用对应工具。
      // 此分支保留为兜底但不再解析 JSON（避免误执行残留的旧格式输出）。
      console.log('[handleSend] "是/执行" 确认路径已废弃（设备控制改为工具调用）')
      return
    }

    // 本轮附带的文档（只带引用，不带内容）：服务端据此把「有哪些文件」注入上下文，
    // AI 再用 document_read 按需读取正文 —— 一份 80 页 PDF 不该在发送时被全量塞进请求体
    const docRefs = toDocumentRefs(currentAttachments)

    const userMessage: Message = {
      role: "user",
      content: userMessageContent,
      isSilent,
      ...(docRefs.length ? { documents: docRefs.map((d) => ({ ...d, origin: "uploaded" as const })) } : {}),
    }

    // 🔥 用户主动发新消息时重置页面级 TASK_LIST（反馈消息不重置，保持任务规划连续性）
    if (!isFeedback && !isSilent) {
      __commitTaskListContent("")
      // 🔥 重置工具更新标记，新一轮对话允许流式 TASK_LIST 写入
      taskUpdatedByToolRef.current = false
    }

    // 使用 Ref 获取并立即更新最新的消息列表，彻底解决闭包导致的异步状态回滚问题
    const currentMessagesForApi = [...messagesRef.current, userMessage]
    __commitMessages(currentMessagesForApi)
    messagesRef.current = currentMessagesForApi // 同步更新 Ref 为下一轮调用提供正确基准
    
    setAttachments([])

    let assistantMsg: Message = { role: "assistant", content: "" }

    /**
     * 📷 收尾投递：把本轮抓到的摄像头画面插进对话流（用户可见）并落库。
     *
     * 时机刻意放在 `finally`：图**已经抓到手了**，没道理因为后续某一轮模型报错、
     * 用户中途点停止而把它吞掉 —— 那正是"AI 说在截图、用户什么都没看到"的来源。
     *
     * 落库一次性写全量 messages（而不是分两次 PUT）：收尾时助手正文那条已落库，
     * 这里把 [全量 + 截图消息] 一起写，避免两次 PUT 竞态把正文冲掉。
     */
    const __flushCameraSnapshots = async () => {
      const pendingSnaps = pendingCameraSnapshotsRef.current
      if (!pendingSnaps || pendingSnaps.length === 0) return
      pendingCameraSnapshotsRef.current = []

      const snapMsgs = toCameraSnapshotMessages(pendingSnaps) as unknown as Message[]
      const nextMsgs = [...(__getScope().messages as Message[]), ...snapMsgs]
      __commitMessages(nextMsgs)
      console.log(`[Camera Snapshot] delivered ${snapMsgs.length} snapshot message(s) to chat`)

      if (ensuredSessionId && !isTempSession(ensuredSessionId)) {
        try {
          await fetch(`/api/sessions/${ensuredSessionId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: nextMsgs }),
          })
    } catch (e) {
      console.warn('[Camera Snapshot] persist failed:', e)
        }
      }
    }

    /**
     * 📎 收尾投递：把本轮生成/修改的文档挂到最后一条助手消息上并落库。
     *
     * 合并而不是新插消息：产物是「这条回复的附件」，用户读的是一段话 + 若干可下载文件，
     * 而不是被拆成两条（一条讲、一条只放文件）。
     * 若本轮没有任何助手消息（用户中途停止且模型没吐字），才单独插一条纯附件消息。
     */
    const __flushDocArtifacts = async () => {
      const pending = pendingDocArtifactsRef.current
      if (!pending || pending.length === 0) return
      pendingDocArtifactsRef.current = []

      const msgs = [...(__getScope().messages as Message[])]
      let idx = -1
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          idx = i
          break
        }
      }

      let nextMsgs: Message[]
      if (idx < 0) {
        nextMsgs = [...msgs, { role: 'assistant', content: '', documents: pending }]
      } else {
        const merged = mergeDocumentRefs(msgs[idx].documents, pending)
        nextMsgs = [...msgs]
        nextMsgs[idx] = { ...msgs[idx], documents: merged }
      }

      __commitMessages(nextMsgs)
      console.log(`[Document Artifacts] delivered ${pending.length} file(s) to chat`)

      if (ensuredSessionId && !isTempSession(ensuredSessionId)) {
        try {
          await fetch(`/api/sessions/${ensuredSessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: nextMsgs.filter(m => !(m as Message & { isSilent?: boolean }).isSilent) }),
          })
        } catch (e) {
          console.warn('[Document Artifacts] persist failed:', e)
        }
      }
    }

    try {
      // 每次新请求时清空工作室旧数据，并确保流结束时关闭浏览器
      __commitBrowsingUrl(null)
      __commitCurrentBrowserUrl(null)
      __commitBrowserScreenshot(null)
      __commitStudioData([])
      // 📷 截图投递队列同样按请求清空（上一轮已投递完毕，避免跨轮串味）
      pendingCameraSnapshotsRef.current = []
      // 📎 文档产物队列同上
      pendingDocArtifactsRef.current = []
      
      // 🔒 临时会话：整块落库（PATCH 标题 + PUT 消息）跳过，消息只留在内存
      if (ensuredSessionId && !isTempSession(ensuredSessionId)) {
        // 🏷️ 对话总结（= 标题）：首轮消息到达时，用**用户当前选择的模型**把用户意图压成
        //    一句话 —— 它同时是侧栏「最近对话」的标题和顶栏 ConversationSummary 胶囊。
        //    （原先这里是 `userMsg.slice(0, 24)` 的机械截断。）
        //    🚨 刻意不 await：总结要走一次模型请求（1~3s），await 会把首字延迟一起拖长。
        void ensureConversationTitle(ensuredSessionId, currentMessagesForApi)

        /**
         * 保存消息到会话：只过滤掉 isSilent 内部反馈消息（避免重新加载时污染对话历史），
         * **原样透传消息对象**。
         *
         * 🚨 修复（2026-10-16）：「怎么没发图给我」的真凶在这里 ——
         * 此前这里是 `.map(m => ({ role: m.role, content: safeContent }))`，一个只保留
         * `role`/`content` 的**对象重建**。它把 `snapshot` 标记整个削掉了：
         *   · 内存里卡片正常，一刷新就退化成 168px 小预览 —— 用户看到的正是"图没了"；
         *   · 且回传上游时 `downgradeAssistantImages()` 认不出它（见 provider-body-adapter），
         *     又会踩 assistant 图片 400。
         * 落库字段白名单**唯一源**已收敛到服务端 `app/api/sessions/[id]/route.ts` 的 PUT
         * （它也负责把多模态数组规范化为 [{type:'image_url'},{type:'text'}]，前端不必也不该再抄一遍）。
         * 此后新增任何「渲染层/上游层要读」的消息字段，只需改服务端那一处。
         */
        const messagesToSave = currentMessagesForApi
          .filter(m => !(m as Message & { isSilent?: boolean }).isSilent)

        await fetch(`/api/sessions/${ensuredSessionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messagesToSave })
        })
      }

      // 创建 AbortController
      const controller = new AbortController()
      abortControllerRef.current = controller
      if (__scopeKey) streamControllersRef.current[__scopeKey] = controller

      // 注入自动模式状态到 System Prompt
      let effectiveSystemPrompt = aiSettings?.systemPrompt || "";

      // ⚠️ Skills 注入已由后端 chat/route.ts 的 getRelevantSkillsContentCached 统一处理
      // （基于智能路由 + 缓存），前端不再重复注入以避免 token 浪费和潜在冲突

      // ⚠️ 定时任务功能说明已由 generateCompactSystemPrompt 中的 SCHEDULE_TASK_INSTRUCTION_COMPACT 统一提供
      // 不再追加旧的 getScheduleTaskSystemPrompt()，避免新旧格式指令冲突导致 AI 输出错误

      if (autoExecuteCommands) {
        effectiveSystemPrompt += "\n\n【系统状态注入】当前处于：自动执行模式。\n严禁提问！严禁等待用户确认！\n必须直接调用设备控制工具（toggle_relay / set_led / control_camera / reset_camera / take_camera_snapshot / move_camera_and_look）执行物理动作。\n所有工具（含设备控制、天气、搜索等）统一通过 Native Function Calling 调用，严禁输出 JSON 代码块形式的设备控制指令。\n如果遇到问题，请自行尝试解决或跳过。";
      }
      
      // 根据权限模式调整系统提示词 - 让每个模式有明显区别
      if (approvalMode === 'auto') {
        effectiveSystemPrompt += `\n\n【替我审批模式 - 智能执行】
- 目标：平衡自动化和安全性
- 行为准则：
  1. 低风险操作（如查询、读取传感器、开关单个设备）直接调用工具执行
  2. 高风险操作（如批量控制、系统配置、数据删除）需主动征求用户确认
  3. 调用设备控制工具前简要说明操作内容
  4. 如果参数不明确，使用合理的默认值
  5. 执行完成后简短汇报结果
- 示例：用户说"开灯" → 说明"即将开启照明灯" → 调用 toggle_relay 工具开灯（自动执行）
- 高风险示例：用户说"关闭所有设备" → 说明"这将关闭所有设备，确认吗？" → 等待用户确认`;
      } else if (approvalMode === 'full') {
        effectiveSystemPrompt += `\n\n【完全访问权限模式 - 深度分析】
- 目标：深度分析，科学决策，全自动执行
- 行为准则：
  1. 先分析环境数据和历史趋势
  2. 给出专业的诊断和建议
  3. 解释为什么要这样做（科学依据）
  4. 提供多个方案或直接执行最优方案
  5. 执行前说明预期效果和风险
  6. 使用 <TASK_LIST> 规划复杂任务
  7. 可以调用多个工具进行综合分析
  8. 所有操作全自动执行，无需等待确认
- 特点：详细、专业、有理有据、自主执行
- 示例：用户说"草莓叶子发黄" → 分析可能原因（缺氮/病害/光照）→ 建议检测方案 → 自动执行传感器读取 → 给出治疗方案并自动执行`;
      } else {
        effectiveSystemPrompt += `\n\n【请求批准模式 - 交流优先】
- 目标：友好交流，帮助理解，用户完全掌控
- 行为准则：
  1. 用自然语言回答问题和提供建议
  2. 如果需要动设备/删数据/部署自动化，**先写一句自然语言说明**（作用与影响），再调用对应工具
  3. 系统会自动在输入框上方弹出确认条等你确认，**你不需要自己问"要不要执行"**
  4. 提供建议但让用户做最终决定
  5. 如果不确定用户意图，主动询问
- 重要：你可以调用设备控制等工具，但真正下发要等用户点确认条上的"执行"
- 🚨 严禁输出设备控制卡片，严禁在正文里写 JSON 形式的设备指令 —— 一律走原生工具调用
- 🚨 你调用工具前写的那句话会**原样显示在确认条上**，所以务必具体、简短（如"即将开启 1 号继电器"）
- 🚨 用户拒绝后工具会返回失败，**不要重试同一动作**，改为说明情况或提出替代方案
- 示例：用户说"温度有点高" → "当前 32°C 偏高，建议开启风扇降温" → 调用 toggle_relay → 用户在确认条上点"执行"后才真正执行`;
      }

      // 计划模式：用户手动启用时，通过请求体 enablePlanning 传给后端
      // 后端会初始化 planMode=true 并在 system prompt 附加引导（无需前端注入 <TASK_LIST> 指令）
      // 旧版 <TASK_LIST> 注入逻辑已废弃，统一由 enter_plan_mode/exit_plan_mode 工具机制接管

      // 获取 MCP 配置
      let mcpConfigs = []
      if (enableMcp) {
        try {
          const installedStr = localStorage.getItem('mcp-installed-servers')
          if (installedStr) {
            const serverIds = JSON.parse(installedStr)
            mcpConfigs = serverIds
              .map((id: string) => {
                const configStr = localStorage.getItem(`mcp-config-${id}`)
                const enabled = localStorage.getItem(`mcp-enabled-${id}`) !== "false"
                
                if (configStr && enabled) {
                  const config = JSON.parse(configStr)
                  const apiKey = config.envVars ? Object.values(config.envVars)[0] : null
                  return {
                    id: config.id,
                    name: config.name,
                    displayName: config.displayName || config.name,
                    enabled: true,
                    apiKey: apiKey,
                    description: config.description || ''
                  }
                }
                return null
              })
              .filter(Boolean)
          }
        } catch (e) {
          console.error('Failed to load MCP configs:', e)
        }
      }

      /**
       * === 前端感知：本轮是否可能触发上下文压缩 ===
       *
       * 压缩发生在服务端、且**在 SSE 流建立之前**（摘要要先用本轮完整历史生成），
       * 所以这段等待期前端拿不到任何后端信号 —— 但可以基于上一轮上报的真实计量预判：
       *   usedTokens（上轮实际占用） ≥ 压缩触发线 × 0.9  →  本轮极可能触发压缩
       *
       * 🚨 口径必须与后端一致：触发线来自 SSE `context_usage.compressionTriggerTokens`
       *    （= 输入预算 × 用户自定义比例）。旧实现用「字符数 > 50000」猜，与 token 预算
       *    脱钩 —— 中文长文早就超了却不提示，英文长文远没到却乱提示。
       */
      if (
        contextUsage &&
        typeof contextUsage.compressionTriggerTokens === 'number' &&
        contextUsage.compressionTriggerTokens > 0 &&
        contextUsage.usedTokens >= contextUsage.compressionTriggerTokens * 0.9
      ) {
        __commitAgentStatus("上下文接近容量上限，正在整理较早的对话…")
      }

      console.log(`[Stream] 🚀 Fetching /api/chat, model=${selectedModel || aiSettings?.model}, msgLen=${currentMessagesForApi.length}`)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: currentMessagesForApi, // 使用最新的消息列表
          // 如果是定时任务（useSystemApi=true），不传递用户配置，让后端使用系统API
          model: useSystemApi ? undefined : (selectedModel || aiSettings?.model),
          apiKey: useSystemApi ? undefined : aiSettings?.apiKey,
          apiUrl: useSystemApi ? undefined : aiSettings?.apiUrl,
          systemPrompt: effectiveSystemPrompt,
          sessionId: ensuredSessionId,
          enableSearch,
          enableReasoning,
          deviceData: deviceDataRef.current,
          deviceOnline: deviceOnlineRef.current,
          weatherData: weatherDataRef.current,
          mcpConfigs, // 添加 MCP 配置
          mandatorySkillsEnabled, // 传递核心技能开启状态
          enableMcp,
          persona: selectedPersona, // 传递当前选中的 AI 角色
          enablePlanning, // 传递计划模式开关，后端据此初始化 planMode
          // 🛑 声明「本前端挂了执行前确认胶囊，可以接住高风险工具的挂起」。
          //
          // 只由**请求批准模式**开启：在「替我审批 / 完全访问」下用户已明确授权自动执行，
          // 再弹确认条等于把用户的授权又拿走（且与那两个模式的提示词直接矛盾）。
          // 于是口径是：request 模式 + 所有高风险工具（见 CONFIRMATION_REQUIRED_TOOLS）。
          //
          // 为什么是「显式声明」而不是让后端看 approvalMode：Copilot 侧栏同样传
          // approvalMode='request'，但它没有确认 UI —— 后端若按模式判定会在那边挂到
          // 5 分钟超时。传这个字段 = 「我这边有 UI 能接住」（同 clientCapabilities 的思路）。
          // ⚠️ 不要删：删掉后后端退回「直接执行」，确认条再也不会出现。
          toolConfirmation: approvalMode === 'request',
          // 📎 本轮附带的文档（只传引用）：服务端把它注入上下文「有哪些文件」，
          // 正文由 document_read 工具按需分段读取。
          documents: docRefs.length ? docRefs : undefined,
          // 用户自配模型列表（让服务端用对应倍率计算积分）
          customModels: (() => {
            try {
              const raw = typeof window !== 'undefined' ? localStorage.getItem('berry-realm.custom-models.v1') : null
              if (!raw) return undefined
              const list = JSON.parse(raw)
              return Array.isArray(list) ? list.map((c: any) => ({ id: c.id, rateMultiplier: c.rateMultiplier })) : undefined
            } catch { return undefined }
          })()
        })
      })
      
      // 🔍 调试：检查系统提示词是否包含定时任务说明
      if (effectiveSystemPrompt.includes('SCHEDULE_TASK')) {
        console.log('[Schedule Task] ✅ System prompt includes SCHEDULE_TASK instructions')
      } else {
        console.warn('[Schedule Task] ⚠️ System prompt does NOT include SCHEDULE_TASK instructions')
      }
      
      abortControllerRef.current = null // 请求结束，清空 controller

      if (!res.ok) {
        const errorText = await res.text()
        // 1) 配额耗尽/会员限制：弹升级提示
        //    兼容两类上游返回：
        //    - 中文平台：error 含 "额度"/"余额"/"升级"
        //    - DashScope 等英文返回：{"error":"AI API Error: 403 - {\"error\":{...\"code\":\"insufficient_quota\"...}}"}
        //      （error 是嵌套了 JSON 的字符串，需用正则整体检测）
        try {
          const errorData = JSON.parse(errorText)
          const errStr = typeof errorData.error === "string"
            ? errorData.error
            : (errorData.error?.message ? String(errorData.error.message) : "")
          const quotaExhausted = res.status === 403 && (
            (errStr && /额度|余额|升级/.test(errStr)) ||
            /insufficient_quota|Free quota exhausted|add funds|use free tier|quota.{0,20}exhaust/i.test(errorText)
          )
          // 桌面端 BYOK：无平台积分/会员概念，不弹升级/充值弹窗，
          // 让错误落入下方 throw 分支渲染到对话气泡（多半是用户自己的 Key 额度问题）
          if (quotaExhausted && !IS_DESKTOP_APP) {
            if (errorData.quota) setQuotaInfo(errorData.quota)
            setQuotaDenyMsg(errStr || null)
            setShowExhaustedDialog(true)
            __commitIsLoading(false)
            return
          }
          // 2) 其它非 2xx：直接展示后端 `error` 字段（格式与项目里其它 API 一致：
          //    `AI API Error: <code> - <details>` 或简短中文描述）。
          //    抛出后由外层 catch 渲染到对话气泡。
          //    429 速率限制：附 status，方便 catch 块识别并渲染 RateLimitErrorCard
          const apiError = new Error(errorData.error || `Request failed: ${res.status}`)
          if (res.status === 429) {
            ;(apiError as any).status = 429
            ;(apiError as any).isRateLimit = true
          }
          throw apiError
        } catch (parseErr) {
          // 解析失败时回退到状态码
          if (parseErr instanceof Error && parseErr.message.startsWith("Request failed")) throw parseErr
          const fallbackErr = new Error(`Request failed: ${res.status} - ${errorText}`)
          if (res.status === 429) {
            ;(fallbackErr as any).status = 429
            ;(fallbackErr as any).isRateLimit = true
          }
          throw fallbackErr
        }
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")

      assistantMsg = { role: "assistant", content: "" }
      // 上一轮若因异常中断残留了未注入的 DEVICE_FORGE 卡片，本轮重新开始前清空
      pendingForgeCardRef.current = null
      let reasoningText = ""
      const startTs = Date.now()
      __commitMessages(prev => [...prev, assistantMsg])

      // 🔥 初始化 AI 动作统计：开始计时
      aiActionStatsRef.current = {
        startTs,
        toolCallCount: 0,
        fileChanges: { added: 0, removed: 0, count: 0 },
        lastTaskPlanProgress: undefined,
        lastTaskPlanCompleted: false,
      }
      __commitAiActionSummary({
        status: "running",
        totalDurationMs: 0,
        toolCallCount: 0,
        fileChanges: { added: 0, removed: 0, count: 0 },
      })

      // Agent execution chain steps - 初始化"深度思考"步骤
      // 唯一 ID 计数器，避免 flushSync 快速渲染时 Date.now() 撞车
      let _stepIdCounter = 0
      const nextStepId = (prefix: string) => `${prefix}-${Date.now()}-${_stepIdCounter++}`

      // 根据工具名与结果生成"真实"摘要，避免千篇一律的"数据已注入上下文"
      const summarizeToolResult = (toolName: string, result: any): string => {
        if (!result) return '无返回内容'
        const t = toolName.toLowerCase()
        // 搜索类
        if (t.includes('search') || t.includes('exa') || t.includes('brave')) {
          const arr = Array.isArray(result?.results) ? result.results
            : Array.isArray(result?.data) ? result.data : null
          if (arr) return `找到 ${arr.length} 条结果`
          return '搜索完成'
        }
        // 抓取类
        if (t.includes('scrape') || t.includes('crawl') || t.includes('fetch') || t.includes('firecrawl')) {
          const text = result?.markdown || result?.content || result?.text || ''
          if (typeof text === 'string' && text.length) return `抓取到 ${text.length} 字符内容`
          return '网页内容已获取'
        }
        // 天气类
        if (t.includes('weather')) {
          const w = result?.current || result?.weather || result
          const parts: string[] = []
          if (w?.temperature != null) parts.push(`温度 ${w.temperature}°C`)
          if (w?.humidity != null) parts.push(`湿度 ${w.humidity}%`)
          if (w?.description) parts.push(w.description)
          return parts.length ? parts.join('，') : '天气数据已获取'
        }
        // 光谱类
        if (t.includes('spectrum')) {
          const bands = result?.bands || result?.data || result?.wavelengths
          const len = Array.isArray(bands) ? bands.length : (result?.count ?? null)
          if (len != null) return `采集到 ${len} 个波段光谱数据`
          return '光谱数据已采集'
        }
        // 设备/控制类
        if (t.includes('device') || t.includes('relay') || t.includes('control')) {
          if (result?.state != null) return `设备状态: ${result.state}`
          if (result?.success) return '指令已下发'
          return '设备控制完成'
        }
        // 路线类
        if (t.includes('route') || t.includes('amap') || t.includes('map')) {
          if (result?.distance != null && result?.duration != null)
            return `距离 ${(result.distance/1000).toFixed(1)}km，约 ${Math.round(result.duration/60)} 分钟`
          return '路线规划完成'
        }
        // 兜底：提取有意义的字符串字段，而非裸 JSON
        if (typeof result === 'string') return result.slice(0, 120)
        const candidates = ['summary', 'message', 'content', 'text', 'data', 'result']
        for (const k of candidates) {
          const v = result?.[k]
          if (typeof v === 'string' && v.trim()) return v.slice(0, 120)
          if (Array.isArray(v)) return `${k}: ${v.length} 项`
        }
        // 最后兜底：用键名构造简短描述
        try {
          const keys = Object.keys(result).slice(0, 4)
          return keys.length ? `返回字段: ${keys.join(', ')}` : '结果已注入上下文'
        } catch { return '结果已注入上下文' }
      }

      const currentAgentSteps: AgentStep[] = [
        {
          id: nextStepId("initial-narrative"),
          kind: "narrative",
          status: "active",
          text: "我先理解一下你的问题，准备调用最合适的工具。",
          startedAt: Date.now()
        }
      ]
      __commitAgentSteps(currentAgentSteps)

      /**
       * 🧠 深度思考解析（串行化唯一入口）
       *
       * 需求：**先输出思考，思考输出完成后才输出主文本** —— 两者永不同屏。
       * 规则：
       *   1. `streaming === true`（存在未闭合的 `<REASONING>`）⇒ 正文一律不上屏；
       *   2. 已闭合的思考块**全部**抽出（多轮工具链会产生多个块，只取第一个是旧 bug：
       *      第 2 轮的思考会连带标签漏进正文）；
       *   3. 正文 = 所有标签外的文本 —— 顺序不变，只是等思考闭合后才放出。
       */
      const splitReasoningBlocks = (raw: string): { text: string; body: string; streaming: boolean } => {
        if (!enableReasoning) {
          // 未开启深度思考：标签连同内容整体丢弃（与旧行为一致）
          return {
            text: "",
            body: raw
              .replace(/<REASONING>[\s\S]*?<\/REASONING>/g, "")
              .replace(/<REASONING>[\s\S]*$/g, ""),
            streaming: false,
          }
        }
        const blocks: string[] = []
        let body = ""
        let cursor = 0
        let streaming = false
        while (cursor < raw.length) {
          const start = raw.indexOf("<REASONING>", cursor)
          if (start === -1) {
            body += raw.slice(cursor)
            break
          }
          body += raw.slice(cursor, start)
          const end = raw.indexOf("</REASONING>", start + 11)
          if (end === -1) {
            // 半截闭合标签（chunk 切在 "</REASON"）不能算进思考正文
            blocks.push(raw.slice(start + 11).replace(/<\/?[A-Z_]{0,10}$/, ""))
            streaming = true
            break
          }
          blocks.push(raw.slice(start + 11, end))
          cursor = end + 12
        }
        // 半截标签（chunk 正好切在 "<REASON"）不能漏到正文里
        if (!streaming) body = body.replace(/<[A-Z_]{0,9}$/, "")
        return { text: blocks.join("\n\n").trim(), body, streaming }
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let ttsProcessedLength = 0
      let latestHistoryFromBackend: Message[] | null = null
      // 说明：原先这里用 `streamSessionId` + `streamSessionId !== sessionId` 守卫来"检测切换"，
      // 但 sessionId 是本次调用的闭包快照，切走后判断永远为 false，守卫实际失效；
      // 现在统一由上面的 __isFg()（读 activeSessionIdRef 实时值）在提交器内部判定前台/后台。

      while (true) {
        // 🔥 会话切换不再中断任务：SSE 流继续在后台完整消费，UI 更新由 __commitXxx
        //    按「当前激活会话」分流；用户切回时从会话作用域快照无缝恢复实时进度。
        //    （原实现在此处 break、并在上层 abort() 掉请求，会把正在跑的任务掐断，已移除）
        //

        // 🔥 关键修复：检查用户是否请求停止，立即中断流式循环
        if (__stopRef.current) {
          console.log('[Stream Guard] User requested stop, aborting stream loop')
          __commitIsLoading(false)
          __commitAgentStatus("")
          break
        }

        const { done, value } = await reader.read()
        if (done) {
          console.log(`[Stream] Reader done, total buffer processed`)
          break
        }
        
        // 诊断：追踪chunk到达时间和大小
        const chunkSize = value ? value.length : 0
        if (chunkSize > 0) {
          console.log(`[Stream Chunk] size=${chunkSize} bytes, t=${Date.now() - startTs}ms`)
        }
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue
          
          if (trimmedLine === "data: [DONE]") {
            // 流结束时，确保清理所有状态
            __commitAgentStatus("")
            __commitBrowsingUrl(null)
            // 🔥 修复：立即清理 isLoading 状态，避免显示"思考中"
            __commitIsLoading(false)
            // 🔥 清除残留的"已提交"loading 通知（流已结束，不再需要）
            setNotices(prev => prev.filter(n => n.variant !== 'loading'))
            continue
          }
          
          if (trimmedLine.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmedLine.slice(6))
              
              // Handle explicit error from backend
              if (data.error) {
                 // 与项目里其它 API 路由（automation/generate、ai/*、monitor/snapshot 等）一致：
                 // 后端返回 `AI API Error: <code> - <details>` 或简短中文描述，直接展示原始内容即可。
                 const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : String(data.error)
                 assistantMsg.content = errorMsg
                 // 会话切换保护：避免把旧会话的错误写入新会话
                 /* 会话隔离：由 __commitXxx 内部按当前激活会话分流 */ {
                   __commitMessages(prev => {
                      const newMsgs = [...prev]
                      newMsgs[newMsgs.length - 1] = { ...assistantMsg }
                      return newMsgs
                   })
                 }
                 // 错误后必须清理加载状态并退出循环（后端可能不再发 [DONE]）
                 __commitIsLoading(false)
                 __commitAgentStatus("")
                 break
              }

              // 🧮 上下文容量事件：后端每轮请求上报「已用 token / 模型窗口 / 输入预算 / 分项明细」
              // → 驱动输入框 footer 的容量指示器（走会话作用域提交，切走再切回结果一致）
              if (data.type === 'context_usage' && typeof data.usedTokens === 'number') {
                __commitContextUsage({
                  usedTokens: data.usedTokens,
                  windowTokens: typeof data.windowTokens === 'number' ? data.windowTokens : 0,
                  inputBudgetTokens: typeof data.inputBudgetTokens === 'number' ? data.inputBudgetTokens : 0,
                  model: typeof data.model === 'string' ? data.model : '',
                  compressed: !!data.compressed,
                  breakdown: Array.isArray(data.breakdown) ? data.breakdown : undefined,
                  // 用户自定义的上下文偏好（设置 → 助理设置 → 上下文与压缩）
                  windowIsCustom: !!data.windowIsCustom,
                  compressionTriggerRatio:
                    typeof data.compressionTriggerRatio === 'number' ? data.compressionTriggerRatio : undefined,
                  compressionTriggerTokens:
                    typeof data.compressionTriggerTokens === 'number' ? data.compressionTriggerTokens : undefined,
                })
                continue
              }

              // 上下文整理失败（服务端压缩未成功）—— 必须让用户知道，
              // 否则观感就是「卡了一下，历史没变，也没人说为什么」。
              if (data.type === 'context_compress_failed') {
                notification.open({
                  key: 'context-compress-failed',
                  message: '上下文整理未完成',
                  description:
                    '本轮对话已接近上下文容量上限，但自动整理没有成功，较早的对话仍按原样保留。'
                    + '可在「设置 → 助理设置 → 上下文与压缩」调大容量，或把触发比例调低一些。',
                  duration: 7,
                  placement: 'bottomRight',
                })
                continue
              }

              // 处理上下文更新事件 (持久化记忆压缩结果)
              if (data.type === 'context_update' && Array.isArray(data.messages)) {
                 // 会话切换保护
                /* 后台会话也要接收 context_update：写入快照由 __commitMessages 处理 */
                 // 强制同步主消息列表，让历史消息被压缩后的摘要替代
                 latestHistoryFromBackend = data.messages
                 __commitMessages(data.messages)
                 // 将当前正在生成的回复占位符重新追加回去
                 __commitMessages(prev => [...prev, assistantMsg])
                 continue
              }

              // 积分消耗事件：回复完成后在气泡下方显示本次消耗
              if (data.type === 'credit_usage' && data.credit) {
                assistantMsg.creditUsage = data.credit
                /* 会话隔离：由 __commitXxx 内部按当前激活会话分流 */ {
                  __commitMessages(prev => {
                    const newMsgs = [...prev]
                    if (newMsgs.length > 0) {
                      newMsgs[newMsgs.length - 1] = { ...assistantMsg }
                    }
                    return newMsgs
                  })
                }
                continue
              }

              // 🍓 记忆保存事件：AI 记住了用户信息时，弹 antd 提示
              if (data.type === 'memory_saved' && Array.isArray(data.memories) && data.memories.length > 0) {
                /* 会话隔离：由 __commitXxx 内部按当前激活会话分流 */ {
                  const memList = data.memories as Array<{ key: string; label: string; value: string }>
                  const text = memList.map(m => `${m.label}「${m.value}」`).join('、')
                  notification.open({
                    key: `memory-saved-${Date.now()}`,
                    message: (
                      <span style={{ fontWeight: 600 }}>
                        已记入记忆
                      </span>
                    ),
                    description: text,
                    icon: (
                      <span style={{ color: '#059669' }}>
                        <IconSeedling size={18} />
                      </span>
                    ),
                    placement: 'bottomRight',
                    duration: 4,
                  })
                }
                continue
              }

              // Handle tool results
              if (data.tool_result) {
                 // 🛑 刚被用户批准执行的高风险工具跑完了 → 让 sender 上方的确认胶囊收尾。
                 //    不这样做的话胶囊会永远停在「执行中」转圈（用户只能干看）。
                 {
                   const confirmed = toolConfirmRef.current
                   if (confirmed && confirmed.state === 'loading' && confirmed.toolName === data.tool_result.name) {
                     finishToolConfirm(TOOL_CONFIRM_DONE_TEXT)
                   }
                 }
                 __commitStudioData(prev => [...prev, data.tool_result])

                 // 📷 摄像头截图：服务端 ffmpeg 抓的帧随 tool_result 一起到了 → 入队等收尾投递给用户。
                 //    判据只看**结果里真有图**（result.images），不按工具名硬编码 ——
                 //    take_camera_snapshot 与 move_camera_and_look 走的是同一条多模态回传链路，
                 //    将来任何返回 _multimodal 画面的工具都能自动获得"发给用户"的能力。
                 //    ⛔ 不能在这里直接插消息：流式期间助手消息永远写 messages[last]，
                 //       插进去会被下一段正文覆盖（见 pendingCameraSnapshotsRef 注释）。
                 {
                   const snapImages = data.tool_result.result?.images
                   if (Array.isArray(snapImages) && snapImages.length > 0) {
                     const snapTool = String(data.tool_result.name || '')
                     const snapArgs = data.tool_result.args || {}
                     const cameraId: 'a' | 'b' = snapArgs.camera_id === 'b' ? 'b' : 'a'
                     // 同一轮里模型偶尔会重复调用同一工具同一参数（实测 take_camera_snapshot 连调两次）
                     // → 去重，别把两张几乎一样的画面都塞给用户
                     const snapKey = `${snapTool}:${JSON.stringify(snapArgs)}`
                     const snapUrl = snapImages[0]?.url
                     if (
                       typeof snapUrl === 'string' && snapUrl &&
                       !pendingCameraSnapshotsRef.current.some(s => s.key === snapKey)
                     ) {
                       pendingCameraSnapshotsRef.current.push({
                         key: snapKey,
                         cameraId,
                         dataUrl: snapUrl,
                         query: (typeof overrideText === 'string' ? overrideText : userMsg) || '',
                       })
                       console.log(`[Camera Snapshot] queued for user delivery (${snapTool}, camera=${cameraId})`)
                     }
                   }
                 }

                 // 📎 文档产物：`document_create` / `document_edit` 返回的 artifacts 入队，
                 //    收尾时挂到最后一条助手消息上（见 __flushDocArtifacts）。
                 //    判据同样只看**结果里真有 artifacts**，不按工具名硬编码 ——
                 //    将来任何产出文件的工具都能自动获得下载卡。
                 {
                   const arts = data.tool_result.result?.artifacts
                   const refs = collectDocumentRefs(arts, pendingDocArtifactsRef.current)
                   if (refs.length > 0) {
                     pendingDocArtifactsRef.current.push(...refs)
                     console.log(`[Document Artifacts] queued ${refs.length} file(s) for delivery`)
                   }
                 }

                 // 🔥 connect_device_from_doc：设备接入卡片「直推」——不再依赖模型复述 <DEVICE_FORGE> 标签。
                 // 1) 立即把 ui_card 注册进全局 store 并打开右侧面板（生成完成瞬间用户就能看到/编辑表单）；
                 // 2) 把 card 暂存到 pendingForgeCardRef，若流结束时模型没按 note 输出标签（偶发幻觉），
                 //    由收尾逻辑自动把 <DEVICE_FORGE> 补进消息内容（见 handleSend 收尾段）。
                 // session 签名与 DeviceForgeCard 组件保持同一算法，避免两侧互相重置编辑/装入状态。
                 if (data.tool_result.name === 'connect_device_from_doc') {
                   const uiCard = data.tool_result.result?.ui_card
                   if (uiCard && typeof uiCard === 'object' && uiCard.status) {
                     try {
                       const forgeData = parseDeviceForgeCardData(JSON.stringify(uiCard))
                       if (forgeData) {
                         const sig = `${forgeData.status}:${forgeData.draft?.name || ''}:${forgeData.draft?.subscribe_topic || ''}:${forgeData.draft?.metrics?.length ?? -1}:${forgeData.subject || ''}`
                         deviceForgeStore.registerCard(sig, forgeData)
                         deviceForgeStore.setPanelOpen(true)
                         pendingForgeCardRef.current = { card: uiCard, sig }
                         console.log(`[Chat] connect_device_from_doc → DEVICE_FORGE card registered (status=${forgeData.status}, sig=${sig})`)
                       }
                     } catch (e) {
                       console.warn('[Chat] Failed to register device forge card from tool result', e)
                     }
                   }
                 }

                 // 🔥 update_task 工具结果：用返回的 task_list_tag 更新 latestTaskListContent
                 // 这样 DynamicTaskPlanner 卡片会立即刷新，无需 AI 重新输出 <TASK_LIST> 标签
                 if (data.tool_result.name === 'update_task') {
                   const result = data.tool_result.result
                   if (result?.success !== false && result?.task_list_tag) {
                     console.log('[Chat] update_task result received, refreshing task planner card')
                     __commitTaskListContent(result.task_list_tag)
                     // 🔥 标记此轮已通过工具更新任务列表，防止后续流式输出的原始 TASK_LIST 覆盖
                     taskUpdatedByToolRef.current = true
                   }
                 }

                 // 🔥 AI 通过 cron_create / cron_delete 创建或删除定时任务后，
                 // 通知侧边栏 ScheduledTasksList 立即刷新（不必等 30s 轮询）
                 if (typeof window !== 'undefined') {
                   const fn = data.tool_result.name
                   if (fn === 'cron_create' || fn === 'cron_delete' || fn === 'task_create' || fn === 'task_update') {
                     const result = data.tool_result.result
                     // 仅在操作成功时派发（失败时无任务变化）
                     if (!result?.error && (result?.success !== false)) {
                       window.dispatchEvent(new CustomEvent('scheduler:tasks-changed', {
                         detail: { source: `ai-tool-${fn}`, task_id: result?.task_id }
                       }))
                     }
                   }
                 }

                 if (data.tool_result.name === 'mcp_firecrawl_scrape' && data.tool_result.result?.url) {
                     const targetUrl = data.tool_result.result.url
                     __commitBrowserScreenshot(`https://image.thum.io/get/width/800/crop/600/noanimate/${targetUrl}`)
                 }

                 // Update execution chain: mark corresponding action as completed, add observation
                 const actionIdx = currentAgentSteps.findIndex(s => s.kind === 'task' && s.status === 'active' && s.toolName === data.tool_result.name)

                 const hasError = data.tool_result.result?.error
                 const resultSummary = hasError
                   ? String(data.tool_result.result.error).slice(0, 120)
                   : summarizeToolResult(data.tool_result.name, data.tool_result.result)

                 if (actionIdx !== -1) {
                   const step = currentAgentSteps[actionIdx]
                   step.status = 'completed'
                   step.duration = Date.now() - (step.startedAt || startTs)

                   // ✅ TRAE 风格：把工具结果作为带色条的子卡片附加到对应 task step 下
                   // 🔥 简化：只显示工具名 + 耗时，不重复 result summary
                   // （result summary 会被 AI 整理到 markdown 正文中，避免重复展示）
                   const fnName = data.tool_result.name
                   let childType: "search" | "scrape" | "command" | "read" | "tool" = "tool"
                   if (fnName.includes('search')) childType = "search"
                   else if (fnName.includes('scrape') || fnName.includes('firecrawl') || fnName.includes('crawl')) childType = "scrape"
                   else if (fnName.includes('spectrum') || fnName.includes('sensor_history') || fnName.includes('history')) childType = "read"

                   if (!step.children) step.children = []
                   step.children.push({
                     id: nextStepId("result"),
                     type: childType,
                     title: fnName,
                     meta: step.duration ? `${(step.duration / 1000).toFixed(1)}s` : undefined,
                     status: hasError ? "error" : "completed",
                     tone: hasError ? "error" : "success",
                   })
                 } else {
                   // 找不到对应 task 时，单独 push 一个独立 step（向后兼容）
                   currentAgentSteps.push({
                     id: nextStepId("obs"),
                     kind: "microStep",
                     status: hasError ? "error" : "completed",
                     text: hasError ? resultSummary : `${data.tool_result.name} 完成 · ${resultSummary}`,
                     duration: 0
                   })
                 }
                 __commitAgentSteps([...currentAgentSteps])

                 continue
              }

              // 处理深度研究阶段进度（对话式研究：拆解 → 检索 → 补搜 → 融合 → 入库，逐阶段汇报）
              // 修复：之前 push 成 kind="narrative" 会被 AgentThoughtChain 吞掉（只进 pendingTexts，
              //       要等下一个 task step 才会 flush；如果一直没有 task 就完全看不到），
              //       改为 kind="task" 强制产出可见的 ThoughtChain item。
              if (data.research_progress) {
                const { stage, detail } = data.research_progress
                const stageLabel = stageToLabel(stage)
                // 🔥 性能修复：必须用「stage 稳定 id」复用同一条 step。
                // 之前用 Date.now()+random，每条 progress 都 push 一个新 item——
                // deep_research 一次能推几十条（每个子查询/每个网页一条），
                // 于是几十个 ThoughtChain.Item（各带动画+折叠内容）被反复全量重建，
                // 渲染成本 O(N²) 直接把回复拖慢。
                // 现在：同一阶段的多条进度只更新 subnote，step 总数恒定在 stage 种类数。
                const stageId = `research-stage-${stage || "unknown"}`
                // 先把其它已推进过的阶段标记完成，保证只有一个 active
                for (const s of currentAgentSteps) {
                  if (
                    s.kind === "task" &&
                    s.status === "active" &&
                    typeof s.id === "string" &&
                    s.id.startsWith("research-stage-")
                  ) {
                    s.status = "completed"
                  }
                }
                const existIdx = currentAgentSteps.findIndex(s => s.id === stageId)
                if (existIdx === -1) {
                  currentAgentSteps.push({
                    id: stageId,
                    kind: "task",
                    status: "active",
                    toolName: undefined,
                    title: stageLabel,
                    subnote: detail || stage,
                    startedAt: Date.now(),
                  })
                } else {
                  currentAgentSteps[existIdx].status = "active"
                  currentAgentSteps[existIdx].subnote = detail || stage
                }
                __commitAgentSteps([...currentAgentSteps])
                continue
              }

              // Handle tool progress (parallel execution feedback)
              // 同样改为 kind="task"，避免被吞
              if (data.tool_progress) {
                const { completed, total, current } = data.tool_progress
                // 🔥 Bug 修复：去重 id 必须和 push 时用的 id 一致，否则去重失效
                const progressId = `progress-${current || completed}`
                const existingIdx = currentAgentSteps.findIndex(
                  s => s.id === progressId
                )
                if (existingIdx === -1) {
                  currentAgentSteps.push({
                    id: progressId,
                    kind: "task",
                    status: "active",
                    title: `并行调用 ${completed}/${total}`,
                    subnote: current ? `正在执行 ${current}` : '执行中...',
                    startedAt: Date.now(),
                  })
                  __commitAgentSteps([...currentAgentSteps])
                }
                continue
              }

              // 🛑 处理「高风险工具执行前确认」事件（2026-10-14 用户：「改成在 sender 上方出现确认」）
              // 后端命中 CONFIRMATION_REQUIRED_TOOLS 后**不执行**，推这个事件并挂起。
              // 前端在输入框正上方浮出一枚 ToastConfirm 胶囊；点「执行」才回传批准。
              // 注意：与 user_input_required 是两个不同事件 —— 这条不走消息内容渲染，
              // 也不渲染任何表单，只驱动 sender 上方那枚浮层。
              if (data.tool_confirmation_required) {
                const { id, tool_name, text, timeout_ms } = data.tool_confirmation_required
                console.log(`[Chat] Tool confirmation required: ${tool_name} (id=${id})`)
                waitingForUserInputRef.current = {
                  checkpointId: id,
                  type: 'tool_confirm',
                  title: text || tool_name,
                  timeoutMs: timeout_ms || 5 * 60 * 1000,
                  startedAt: Date.now(),
                }
                setToolConfirm({
                  id,
                  toolName: tool_name,
                  text: text || tool_name,
                  state: 'initial',
                })
                __commitAgentStatus(`等待确认：${text || tool_name}`)
                continue
              }

              // 🛑 用户裁决已送达后端（批准则紧接着开始执行；拒绝则后端把「用户拒绝」交回模型）
              if (data.tool_confirmation_resolved) {
                const { id, approved } = data.tool_confirmation_resolved
                console.log(`[Chat] Tool confirmation resolved: id=${id} approved=${approved}`)
                waitingForUserInputRef.current = null
                __commitAgentStatus(approved ? '正在执行...' : 'AI 思考中...')
                // 批准：胶囊保持「执行中」，等 tool_result 到了再收尾成「已执行」。
                // 拒绝：胶囊由 respondToolConfirm 收起；这里只兜底处理「别的端点了忽略」的情况。
                if (!approved) {
                  setToolConfirm(prev => (prev && prev.id === id ? null : prev))
                }
                continue
              }

              // 🔥 处理「等待用户输入」事件（CHECKPOINT / CLARIFY 挂起）
              // 后端 Agent Loop 检测到 <CHECKPOINT> / <CLARIFY> 后不 break，而是挂起等待。
              // 这里标记 SSE 流处于「等待用户输入」状态，前端表单提交时走 /api/chat/respond
              // 而非触发新对话。
              if (data.user_input_required) {
                const { type, checkpoint_id, title, timeout_ms } = data.user_input_required
                console.log(`[Chat] User input required: type=${type}, id=${checkpoint_id}, title=${title}`)
                waitingForUserInputRef.current = {
                  checkpointId: checkpoint_id,
                  type,
                  title,
                  timeoutMs: timeout_ms || 5 * 60 * 1000,
                  startedAt: Date.now(),
                }
                __commitAgentStatus(`等待用户输入：${title}`)
                continue
              }

              // 🔥 处理「用户输入已收到」事件（Agent Loop 从挂起中恢复）
              if (data.user_input_received) {
                console.log(`[Chat] User input received, resuming Agent Loop: ${data.user_input_received.reply_preview}`)
                waitingForUserInputRef.current = null
                __commitAgentStatus("AI 思考中...")
                // 🔥 清除"已提交"loading 通知，AI 已开始继续处理
                setNotices(prev => prev.filter(n => n.variant !== 'loading'))
                continue
              }

              // 🔥 处理「用户输入超时」事件（5 分钟未回复，Agent Loop 已退出）
              if (data.user_input_timeout) {
                console.warn(`[Chat] User input timeout: ${data.user_input_timeout.reason}`)
                waitingForUserInputRef.current = null
                // 🔥 清除残留的"已提交"loading 通知
                setNotices(prev => prev.filter(n => n.variant !== 'loading'))
                showNotice(
                  "⏰ 等待超时",
                  "你 5 分钟内未回复，AI 已结束本次对话。请重新提问以继续。",
                  "warning"
                )
                continue
              }

              // 🔥 Bug 修复：处理 LLM 调用失败事件（超时/网络错误/非2xx状态）
              // 后端发送 llm_error 后会尝试强制总结，这里只显示状态提示，不污染消息内容
              if (data.llm_error) {
                const reason = data.llm_error.reason || 'LLM 调用失败'
                __commitAgentStatus(`⚠️ ${reason}，正在尝试生成总结...`)
                currentAgentSteps.push({
                  id: nextStepId("llm-error"),
                  kind: "narrative",
                  status: "completed",
                  text: `⚠️ ${reason}`,
                  duration: 0
                })
                __commitAgentSteps([...currentAgentSteps])
                continue
              }

              // 🌱 后端状态提示（如"莓小智正在挑选工具…"）：首字出现前先给用户一个可见的进展状态
              if (data.agent_status && typeof data.agent_status.text === "string") {
                __commitAgentStatus(data.agent_status.text)
                continue
              }

                // Handle tool calls feedback
              // 处理知识模块选取通知 (AI Skill Routing)
              if (data.skill_selection) {
                const skillNames = data.skill_selection.map((s: any) => s.name).join(", ")
                __commitAgentStatus(`智能识别意图，由 [${skillNames}] 模块提供支持...`)

                // ✅ TRAE 风格：把路由结果转为 narrative 段
                const initialIdx = currentAgentSteps.findIndex(s => s.status === 'active' && s.kind === 'narrative')
                if (initialIdx !== -1) {
                  currentAgentSteps[initialIdx].status = 'completed'
                  currentAgentSteps[initialIdx].duration = Date.now() - (currentAgentSteps[initialIdx].startedAt || startTs)
                }
                // 添加路由结果陈述
                currentAgentSteps.push({
                  id: nextStepId("route"),
                  kind: "narrative",
                  status: "completed",
                  text: `已路由到 ${skillNames}，匹配到 ${data.skill_selection.length} 个知识模块。`,
                  duration: 0
                })
                __commitAgentSteps([...currentAgentSteps])
                continue
              }

              if (data.tool_calls) {
                const toolNames = data.tool_calls.map((t: any) => t.function.name).join(", ")
                const round = data.agent_iteration || 1

                // 🔥 累计工具调用次数到 AI 动作总结
                aiActionStatsRef.current.toolCallCount += data.tool_calls.length
                __commitAiActionSummary((prev) =>
                  prev
                    ? {
                        ...prev,
                        toolCallCount: aiActionStatsRef.current.toolCallCount,
                        totalDurationMs: Date.now() - aiActionStatsRef.current.startTs,
                      }
                    : prev
                )
                __commitAgentStatus(`第 ${round} 轮工具调用: ${toolNames}...`)
                setStudioOpen(true) // 主动展开工作室侧边栏

                // ✅ TRAE 风格：把每个 tool_call 转为粗体 task 段（带绿色对勾 / 旋转）
                for (const tc of data.tool_calls) {
                  const fnName = tc.function.name
                  let actionTitle = `调用 ${fnName}`
                  if (fnName.includes('search')) actionTitle = '搜索外部知识'
                  else if (fnName.includes('scrape') || fnName.includes('firecrawl')) actionTitle = '抓取网页内容'
                  else if (fnName.includes('weather')) actionTitle = '查询天气数据'
                  else if (fnName.includes('spectrum')) actionTitle = '读取光谱传感器'
                  else if (fnName.includes('sensor_history') || fnName.includes('history')) actionTitle = '查询历史传感器数据'
                  else if (fnName.includes('route') || fnName.includes('amap')) actionTitle = '路线规划'
                  else if (fnName.includes('soil')) actionTitle = '查询土壤数据'
                  else if (fnName.includes('irrigation')) actionTitle = '查询灌溉数据'

                  // 多轮时加上轮次标签
                  if (round > 1) actionTitle = `[第${round}轮] ${actionTitle}`

                  let argsSummary = ''
                  try {
                    const args = JSON.parse(tc.function.arguments || '{}')
                    if (args.query) argsSummary = `查询: "${args.query}"`
                    else if (args.url) argsSummary = `URL: ${args.url}`
                    else if (args.location) argsSummary = `位置: ${args.location}`
                    else if (args.metrics) argsSummary = `指标: ${Array.isArray(args.metrics) ? args.metrics.join(', ') : args.metrics}${args.range ? ` · 时间范围: ${args.range}` : ''}`
                  } catch {}

                  currentAgentSteps.push({
                    id: nextStepId("action"),
                    kind: "task",
                    status: "active",
                    text: actionTitle,
                    subnote: argsSummary || `工具: ${fnName}`,
                    toolName: fnName,
                    startedAt: Date.now()
                  })
                }
                __commitAgentSteps([...currentAgentSteps])

                // 检查是否有网页抓取工具，如果有则显示浏览器动效
                // 支持 Firecrawl 和 Exa (虽然 Exa 通常不是直接抓取，但为了视觉反馈，也可以显示搜索状态)
                const crawlerCall = data.tool_calls.find((t: any) => t.function.name === 'mcp_firecrawl_scrape' || t.function.name === 'mcp_exa_search' || t.function.name === 'mcp_brave_search')
                if (crawlerCall) {
                    try {
                        const args = JSON.parse(crawlerCall.function.arguments)
                        let url = null
                        
                        // 只有真正的网页抓取工具才显示浏览器预览
                        // 搜索工具（Exa、Brave）不显示预览
                        const isScrapeTool = crawlerCall.function.name.includes('scrape') || 
                                           crawlerCall.function.name.includes('crawl') ||
                                           crawlerCall.function.name.includes('fetch')
                        
                        if (isScrapeTool && args.url) {
                            url = args.url
                            __commitBrowsingUrl(url)
                            __commitCurrentBrowserUrl(url) // 同步到工作室内部浏览器状态
                            setStudioOpen(true) // 确保工作室打开
                        }
                        // 搜索工具不设置 browsingUrl，不显示网页预览
                    } catch (e) { console.error("Failed to parse crawler args", e) }
                } else if (data.tool_calls.some((t: any) => {
                    const name = t.function.name
                    // 只有抓取类工具才打开工作室，搜索类工具不打开
                    return name.includes('scrape') || name.includes('crawl') || name.includes('fetch')
                })) {
                    // 兜底：如果是抓取类工具，打开工作室
                    setStudioOpen(true)
                }


                // ✅ Fix #3: 不再往 content 中注入 TASK_LIST / TOOL_USED 标签
                // 执行链完全由 agentSteps 状态驱动，消息体保持纯净
                /* 会话隔离：由 __commitXxx 内部按当前激活会话分流 */ {
                  __commitMessages(prev => {
                    const newMsgs = [...prev]
                    newMsgs[newMsgs.length - 1] = { ...assistantMsg }
                    return newMsgs
                  })
                }

                continue
              }

              const content = data.choices?.[0]?.delta?.content ?? data.content
              if (typeof content === "string") {
                // 当开始接收AI的文本回复时：清理 agentStatus，并在链上加 Final Answer 步骤
                if (content.trim() && agentStatus) {
                  __commitAgentStatus("")
                  // ✅ 关闭所有仍处于 active 的步骤（如未被 skill_selection / tool_calls 关闭的 initial thinking）
                  for (const s of currentAgentSteps) {
                    if (s.status === "active") {
                      s.status = "completed"
                      s.duration = Date.now() - (s.startedAt || startTs)
                    }
                  }
                  // ✅ TRAE 风格：Final Answer 转为 narrative 段（"现在我整理结果..."）
                  if (currentAgentSteps.length > 0 && !currentAgentSteps.some(s => s.kind === 'narrative' && s.id.startsWith('answer-'))) {
                    const obsCount = currentAgentSteps.filter(s => s.kind === 'microStep').length
                    const actionCount = currentAgentSteps.filter(s => s.kind === 'task').length
                    const answerText = actionCount > 0
                      ? `现在我整理 ${actionCount} 个工具的 ${obsCount} 条结果，准备生成回复。`
                      : '结合知识库与上下文，准备生成回复。'
                    currentAgentSteps.push({
                      id: nextStepId("answer"),
                      kind: "narrative",
                      status: "active",
                      text: answerText,
                      startedAt: Date.now()
                    })
                    __commitAgentSteps([...currentAgentSteps])
                  }
                }
                
                // Update assistant message content - 保持消息体纯净，不再注入 TOOL_USED/TASK_LIST
                if (typeof assistantMsg.content === "string") {
                    // 清理任何残留的临时标记（向后兼容旧会话记录）
                    if (content.trim()) {
                        assistantMsg.content = assistantMsg.content.replace(/<TOOL_USED[^>]*result="loading"[^>]*\/>/g, '')
                    }
                    assistantMsg.content += content
                } else {
                    assistantMsg.content = content
                }

                // 实时积分估算（流式过程中：累计 chars × 公式 → 气泡实时显示消耗）
                {
                    const creditsModelId = selectedModel || aiSettings?.model || 'auto'
                    const inputChars = JSON.stringify(currentMessagesForApi || []).length
                    const outputChars = (assistantMsg.content?.length) || 0
                    assistantMsg.liveCredits = estimateLiveCredits(inputChars, outputChars, creditsModelId)
                }

                // 实时清理 TASK_LIST、SCHEDULE_TASK 和 TOOL_USED 标签，防止在流式输出时裸露
                if (typeof assistantMsg.content === "string") {
                    // 🔥 首先过滤 TOOL_USED 标签（这些不应该显示给用户）
                    assistantMsg.content = assistantMsg.content.replace(/<\s*TOOL_USED\s+[^>]*(?:\/>|>[\s\S]*?<\/\s*TOOL_USED\s*>)/g, '')

                    // 🔥 过滤空的 AUTOMATION_STRATEGY 标签（只有开始+结束，没有内容）
                    assistantMsg.content = assistantMsg.content.replace(/<\s*AUTOMATION_STRATEGY\s+[^>]*>\s*<\/\s*AUTOMATION_STRATEGY\s*>/g, (match) => {
                        console.warn('[Stream Filter] Removed empty AUTOMATION_STRATEGY tag')
                        return ''
                    })

                    // 🔥 检测并移除孤立的 </AUTOMATION_STRATEGY> 结束标签（开场被过滤后残留的）
                    // ⚠️ 不要移除孤立的开始标签 — 它会与流末尾到达的 JSON 一起渲染
                    assistantMsg.content = assistantMsg.content.replace(/<\/\s*AUTOMATION_STRATEGY\s*>/g, (match, offset, full) => {
                        // 只移除没有对应开始标签的结束标签
                        const before = full.substring(0, offset)
                        if (!/<\s*AUTOMATION_STRATEGY[\s>][^>]*>/.test(before)) {
                            console.warn('[Stream Filter] Removed orphan </AUTOMATION_STRATEGY> closing tag')
                            return ''
                        }
                        return match
                    })

                    // 🔥 关键修复：早期包裹（与报告同款）
                    // 一旦流中出现完整的 ```json ... ``` 代码块且含 triggerNode/logicNode/actionNode
                    // 立即包裹为 <AUTOMATION_STRATEGY> 标签，避免后续 chunk 到来时被部分过滤
                    if (!assistantMsg.content.includes('<AUTOMATION_STRATEGY')) {
                        // 鲁棒的描述提取：1) 标题格式  2) "X策略"中的核心名词  3) 回退
                        const extractStrategyDescription = (before: string): string => {
                          if (!before) return 'AI 生成的自动化策略'
                          // 1) Markdown 标题/粗体：### 标题：xxx / **策略名称**：xxx
                          const m1 = before.match(/(?:#{1,6}\s*)?(?:\*\*|__)?(?:策略名称|方案名称|名称|标题|主题)[：:]\s*[\*\*「]?([^\*\*「」\n。]{2,40})[\*\*」]?/)
                          if (m1 && m1[1]) return m1[1].trim()
                          // 2) 抓取最后一个"策略"/"方案"前的核心名词
                          const m2 = before.match(/(?:是|为|的|了|，|：|:)\s*([^\n。\s，：:]{2,40}?)\s*(?:策略|方案)/)
                          if (m2 && m2[1]) return m2[1].trim()
                          return 'AI 生成的自动化策略'
                        }

                        // ① 优先匹配完整的 fenced JSON 代码块（含 triggerNode/logicNode/actionNode）
                        const fencedJsonRegex = /```json\s*([\s\S]*?)\s*```/g
                        const fencedMatches: { full: string; body: string; index: number }[] = []
                        let m
                        while ((m = fencedJsonRegex.exec(assistantMsg.content)) !== null) {
                            const body = m[1]
                            if (body.includes('"triggerNode"') || body.includes('"logicNode"') || body.includes('"actionNode"')) {
                                fencedMatches.push({ full: m[0], body, index: m.index })
                            }
                        }
                        if (fencedMatches.length > 0) {
                            // 取第一个匹配的代码块并包裹
                            const target = fencedMatches[0]
                            // 尝试从代码块前的文本中提取描述
                            const beforeText = assistantMsg.content.substring(0, target.index).trim()
                            const description = extractStrategyDescription(beforeText)
                            const wrapped = `<AUTOMATION_STRATEGY description="${description}">\n${target.full}\n</AUTOMATION_STRATEGY>`
                            assistantMsg.content =
                                beforeText
                                    ? `${beforeText}\n\n${wrapped}`
                                    : wrapped
                            console.log(`[Stream Filter] ✅ Early-wrapped automation strategy: "${description}"`)
                        } else {
                            // ② 兜底：检测未闭合的 ```json ... （流式过程中 fence 还没到）但 JSON 已平衡且含策略标记
                            // 用花括号平衡匹配：找到第一个 ```json 后的 {，向后扫描到匹配的 }
                            const openFenceIdx = assistantMsg.content.indexOf('```json')
                            if (openFenceIdx !== -1) {
                                const afterFence = assistantMsg.content.substring(openFenceIdx + '```json'.length)
                                const firstBrace = afterFence.indexOf('{')
                                if (firstBrace !== -1) {
                                    let depth = 0
                                    let inString = false
                                    let escape = false
                                    let endIdx = -1
                                    for (let i = firstBrace; i < afterFence.length; i++) {
                                        const ch = afterFence[i]
                                        if (escape) { escape = false; continue }
                                        if (inString) {
                                            if (ch === '\\') escape = true
                                            else if (ch === '"') inString = false
                                            continue
                                        }
                                        if (ch === '"') { inString = true; continue }
                                        if (ch === '{') depth++
                                        else if (ch === '}') { depth--; if (depth === 0) { endIdx = i; break } }
                                    }
                                    // 平衡 + 含策略标记 + 后面没有紧跟 ```（避免重复包裹）
                                    if (endIdx !== -1) {
                                        const jsonBody = afterFence.substring(firstBrace, endIdx + 1)
                                        if (jsonBody.includes('"triggerNode"') || jsonBody.includes('"logicNode"') || jsonBody.includes('"actionNode"')) {
                                            const rest = afterFence.substring(endIdx + 1)
                                            // 跳过空白后若已有关闭 fence 则不重复处理
                                            if (!/^\s*```/.test(rest)) {
                                                const fenceStart = openFenceIdx
                                                const fenceEnd = openFenceIdx + '```json'.length + firstBrace + endIdx + 1
                                                const fencedJson = assistantMsg.content.substring(fenceStart, fenceEnd)
                                                const beforeText = assistantMsg.content.substring(0, fenceStart).trim()
                                                const description = extractStrategyDescription(beforeText)
                                                const wrapped = `<AUTOMATION_STRATEGY description="${description}">\n${fencedJson}\n</AUTOMATION_STRATEGY>`
                                                assistantMsg.content =
                                                    beforeText
                                                        ? `${beforeText}\n\n${wrapped}\n${rest}`
                                                        : `${wrapped}\n${rest}`
                                                console.log(`[Stream Filter] ✅ Early-wrapped unclosed-fence strategy: "${description}"`)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 🔥 交付物分流：报告 vs 代码产物（2026-10-11 重做）
                    //
                    // 旧实现在这里有两个致命缺陷：
                    //   ① 只要 HTML 带 style 就自动包成 [REPORT:...]，关键词表里还含 `数据` /
                    //      `font-family` / `gradient` / `padding` → 任何前端代码都会被判成"报告"；
                    //   ② 连 ```html 代码块也被整体替换成报告卡 → 源码消失、用户拿不到代码。
                    //
                    // 新口径：只有「用户确实要报告」且「内容不是程序型代码」才包报告；
                    //         代码围栏（html / ts / py …）内的内容一律不动，交给代码卡交付。
                    // 判定口径唯一来源：lib/ai/deliverable-classifier.ts
                    const hasReportTag =
                        assistantMsg.content.includes('[REPORT:') ||
                        /\[REPORT:[^\]]+\][\s\S]*?\[\/REPORT\]/.test(assistantMsg.content)

                    if (!hasReportTag && hasReportIntent(text, rootIntentRef.current)) {
                        // 先剥掉代码围栏，避免把代码产物卷进报告判定
                        const contentWithoutCodeBlocks = assistantMsg.content.replace(/```[\s\S]*?```/g, '')
                        const bareHtmlMatch =
                            contentWithoutCodeBlocks.match(/<!DOCTYPE[^>]*>[\s\S]*?<\/html>/i) ||
                            contentWithoutCodeBlocks.match(/<div\s+style\s*=\s*["'][^"']*["'][^>]*>[\s\S]*/i) ||
                            contentWithoutCodeBlocks.match(/<p\s+style\s*=\s*["'][^"']*["'][^>]*>[\s\S]*/i)

                        if (bareHtmlMatch && !looksLikeCodeArtifact(bareHtmlMatch[0])) {
                            const reportTitle = extractReportTitle(bareHtmlMatch[0])
                            const wrappedReport = `[REPORT:${reportTitle}]\n${bareHtmlMatch[0]}\n[/REPORT]`
                            assistantMsg.content = assistantMsg.content.replace(bareHtmlMatch[0], wrappedReport)
                            console.log(`[Stream Filter] 识别为报告并包裹: "${reportTitle}"`)
                        }
                    }
                    // 注意：不要移除正确包裹的 <TASK_LIST>...</TASK_LIST>
                    // 只移除裸露的 JSON 和错误的标签

                    // 1. 拦截裸露的 TASK_LIST JSON（没有标签包裹的）
                    // 检查是否有开标签（流式输出时闭标签可能还没到，只要有开标签就说明 JSON 在 TASK_LIST 块内）
                    const hasOpenTag = assistantMsg.content.includes('<TASK_LIST>')
                    const hasCloseTag = assistantMsg.content.includes('</TASK_LIST>')

                    if (!hasOpenTag && !hasCloseTag) {
                        // 只有在完全没有 TASK_LIST 标签的情况下才过滤裸露的 JSON

                        // 🔥 关键修复：先识别并保留 schedule_task JSON
                        // schedule_task JSON 是 markdown 代码块，**绝不**能被 TASK_LIST 过滤器误删
                        // 临时移除所有 schedule_task 代码块，过滤完后再恢复
                        const scheduleTaskBlocks: string[] = []
                        let stashedContent = assistantMsg.content
                        stashedContent = stashedContent.replace(/```json\s*[\s\S]*?"action"\s*:\s*"schedule_task"[\s\S]*?(?:```|$)/g, (match) => {
                            scheduleTaskBlocks.push(match)
                            return `\x00SCHEDULE_TASK_BLOCK_${scheduleTaskBlocks.length - 1}\x00`
                        })

                        // 🔥 关键修复：同时识别并保留自动化策略 JSON
                        // 自动化策略 JSON 是含 nodes/edges 的图结构代码块
                        // 使用非贪婪匹配直到遇到 ``` 或字符串结尾；不要求 JSON 已闭合（流式支持）
                        const automationBlocks: string[] = []
                        stashedContent = stashedContent.replace(/```json\s*[\s\S]*?(?:```|$)/g, (match) => {
                            // 提取 JSON 文本，检测是否含 triggerNode / logicNode / actionNode
                            const jsonText = match.replace(/^```json\s*/, "").replace(/```$/, "").trim()
                            if (jsonText.includes('"triggerNode"') || jsonText.includes('"logicNode"') || jsonText.includes('"actionNode"')) {
                                automationBlocks.push(match)
                                return `\x00AUTOMATION_BLOCK_${automationBlocks.length - 1}\x00`
                            }
                            return match
                        })

                        // 🔥 关键修复：保护无 fence 的裸策略 JSON（如 { "nodes": [...], "edges": [...] }）
                        // 避免被下方的 TASK_LIST 模式误识别（虽然一般不会匹配，但作为保险）
                        stashedContent = stashedContent.replace(/\{\s*"(?:nodes|edges)"[\s\S]*?"nodes"\s*:\s*\[[\s\S]*?\}\s*(?=\n|$)/g, (match) => {
                            if (match.includes('"triggerNode"') || match.includes('"logicNode"') || match.includes('"actionNode"')) {
                                automationBlocks.push('```json\n' + match + '\n```')
                                return `\x00AUTOMATION_BLOCK_${automationBlocks.length - 1}\x00`
                            }
                            return match
                        })

                        // 匹配包含 "tasks" 数组和 "status" 字段的 JSON 对象 - 增强版
                        const taskListJsonPattern = /\{\s*"(?:status|tasks)"[\s\S]*?"(?:tasks|status)"[\s\S]*?\}/g
                        stashedContent = stashedContent.replace(taskListJsonPattern, (match) => {
                            // 🔥 二次防御：必须同时包含 "status" 和 "tasks" 才过滤
                            // 防止误删带 "status" 字段的 schedule_task JSON
                            if (match.includes('"tasks"') && match.includes('"status"') && !match.includes('"action": "schedule_task"')) {
                                console.warn('[Stream Filter] Intercepted bare TASK_LIST JSON')
                                return '' // 完全移除
                            }
                            return match // 保留其他 JSON
                        })

                        // 拦截不完整的 TASK_LIST JSON（流式输出时）
                        const incompleteTaskPattern = /\{\s*"status"\s*:\s*"(?:in_progress|completed|pending)"[\s\S]*?(?:"tasks"\s*:\s*\[[\s\S]*)?$/
                        if (incompleteTaskPattern.test(stashedContent)) {
                            const lastBrace = stashedContent.lastIndexOf('{')
                            if (lastBrace !== -1) {
                                const potentialJson = stashedContent.slice(lastBrace)
                                if (potentialJson.includes('"tasks"') || (potentialJson.includes('"status"') && potentialJson.includes('"in_progress"'))) {
                                    // 🔥 二次防御：确保不是 schedule_task JSON
                                    if (!potentialJson.includes('"action": "schedule_task"')) {
                                        stashedContent = stashedContent.slice(0, lastBrace).trim()
                                    }
                                }
                            }
                        }

                        // 还原 schedule_task 代码块
                        stashedContent = stashedContent.replace(/\x00SCHEDULE_TASK_BLOCK_(\d+)\x00/g, (_, idx) => {
                            return scheduleTaskBlocks[Number(idx)] || ''
                        })
                        // 还原自动化策略代码块
                        stashedContent = stashedContent.replace(/\x00AUTOMATION_BLOCK_(\d+)\x00/g, (_, idx) => {
                            return automationBlocks[Number(idx)] || ''
                        })
                        assistantMsg.content = stashedContent
                    }
                    
                    // 2. 移除孤立的开始或结束标签（不成对的）
                    // 检查标签是否成对
                    const openTagCount = (assistantMsg.content.match(/<TASK_LIST>/g) || []).length
                    const closeTagCount = (assistantMsg.content.match(/<\/TASK_LIST>/g) || []).length
                    
                    if (openTagCount !== closeTagCount) {
                        // 标签不成对，移除孤立的标签
                        if (openTagCount > closeTagCount) {
                            // 有多余的开始标签，移除不完整的
                            assistantMsg.content = assistantMsg.content.replace(/<TASK_LIST[^>]*$/g, '')
                        }
                        if (closeTagCount > openTagCount) {
                            // 有多余的结束标签
                            assistantMsg.content = assistantMsg.content.replace(/<\/TASK_LIST>/g, '')
                        }
                    }
                    
                    // 3. 隐藏 SCHEDULE_TASK 标记（但不删除，因为后面需要解析）
                    // 使用CSS隐藏而不是删除内容
                    // 注意：这里只是临时隐藏显示，实际内容保留用于后续解析
                    // 在流式输出完成后会正式移除
                }

                // TTS 增量片段解析与阅读：自动忽略所有的代码块与特定 XML 元素(如 task)包含的内容
                if (isTTSEnabled) {
                    const getTTSableText = (text: string) => {
                      if (!text) return ""
                      let s = text
                      // Remove reasoning blocks and markdown code blocks completely
                      s = s.replace(/```[\s\S]*?(?:```|$)/g, '')
                      // Remove block tags like task, device_control, chart, TASK_LIST, SCHEDULE_TASK completely along with inner payload
                      s = s.replace(/<(task|device_control|chart|TASK_LIST|SCHEDULE_TASK|TOOL_USED|REASONING|analyze|plan)(?:[\s>][\s\S]*?(?:<\/\1>|$)|$)/gi, '')
                      // Remove incomplete typing of these tags specifically so it doesn't accidentally read them before parsing finishes
                      s = s.replace(/<\/?(?:t|ta|tas|task|d|de|dev|devi|devic|device|device_|device_c|device_co|device_con|device_cont|device_contr|device_contro|device_control|c|ch|cha|char|chart|T|TA|TAS|TASK|TASK_|TASK_L|TASK_LI|TASK_LIS|TASK_LIST|S|SC|SCH|SCHE|SCHED|SCHEDU|SCHEDUL|SCHEDULE|SCHEDULE_|SCHEDULE_T|SCHEDULE_TA|SCHEDULE_TAS|SCHEDULE_TASK|R|RE|REA|REAS|REASO|REASON|REASONI|REASONIN|REASONING|a|an|ana|anal|analy|analyz|analyze|p|pl|pla|plan)$/i, '')
                      // Only strip generic styling tags like <b> themselves but keep their inner text reading
                      s = s.replace(/<\/?(?:b|i|strong|em|p|div|span|h[1-6]|ul|li|ol|br|hr|a|img)[^>]*>/gi, '')
                      return s
                    }

                    const cleanContent = getTTSableText(assistantMsg.content as string)
                    const unprocessed = cleanContent.slice(ttsProcessedLength)
                    
                    const splitRegex = /([^.!?。；！？\n]+[.!?。；！？\n]+)/g
                    let match
                    let lastMatchEnd = 0
                    
                    const normalizeIoTUnitsForTTS = (text: string) => {
                      if (!text) return "";
                      return text
                        .replace(/°C/gi, '摄氏度')
                        .replace(/\blux\b/gi, '勒克斯')
                        .replace(/\bppm\b/gi, 'P P M')
                        .replace(/CO[2₂]/gi, '二氧化碳')
                        .replace(/\bmg\/m3\b/gi, '毫克每立方米')
                        .replace(/\bmg\/l\b/gi, '毫克每升')
                        .replace(/\bm\/s\b/gi, '米每秒')
                        .replace(/\+([0-9.]+)/g, '上升$1')
                    }

                    while ((match = splitRegex.exec(unprocessed)) !== null) {
                      const sentence = match[0].trim()
                      // 经过上面的处理去除了业务标签，最后再安全过滤所有遗漏HTML避免读出尖括号
                      // 重点优化：剥离感叹号强制转为句号，压制 Qwen3 语音模型容易过于激昂的情绪
                      // 专门优化 IoT 单位发音
                      const spokenSentence = normalizeIoTUnitsForTTS(sentence.replace(/<[^>]+>/g, '').replace(/[！!]/g, '。').trim())
                      if (spokenSentence.length > 1 && !spokenSentence.includes('"action":')) {
                         enqueueTts(spokenSentence)
                      }
                      lastMatchEnd = match.index + match[0].length
                    }
                    ttsProcessedLength += lastMatchEnd
                }
                
                // Simplified reasoning parsing (仅在开启深度思考模式时解析)
                const combined = assistantMsg.content as string
                // 🧠 串行化：思考未闭合 ⇒ streaming=true（渲染层据此先只放思考面板，见下方注释）
                const parsedReasoning = splitReasoningBlocks(combined)
                reasoningText = parsedReasoning.text
                
                // 正文 = 所有思考块之外的文本（含多轮工具链里第 2、3 个思考块之后的内容）。
                // ⚠️ 这里**不**把思考期间的正文置空：正文上屏与否由渲染层按 reasoningStreaming 裁决
                //    （page 层置空会连带把「这条气泡已经有内容」的事实抹掉，触发 isWorkingBubble 短路）。
                const display = parsedReasoning.body

                // 🔥 用普通setState（不flushSync），让React自然批处理渲染
                // XMarkdown的streaming={{hasNextChunk:true}}会自动处理增量动画
                /* 会话隔离：由 __commitXxx 内部按当前激活会话分流 */ {
                  __commitMessages(prev => {
                    const newMsgs = [...prev]
                    newMsgs[newMsgs.length - 1] = {
                      role: "assistant",
                      content: display,
                      reasoning: enableReasoning ? { text: reasoningText, durationMs: Date.now() - startTs } : undefined,
                      // 🧠 思考仍在流式 ⇒ 渲染层只放思考面板，正文等到闭合后才上屏
                      reasoningStreaming: parsedReasoning.streaming,
                      model: selectedModel || aiSettings?.model
                    }
                    return newMsgs
                  })

                  // 🔥 页面级 TASK_LIST 追踪：流式输出中检测到完整 TASK_LIST 时更新
                  // 这样即使后续反馈消息不含 TASK_LIST，任务规划器也能保持最新状态
                  // ⚠️ 但若 update_task 工具已更新过任务列表，则跳过覆盖（避免回退到 0 进度）
                  const tlMatchLive = (typeof display === "string" ? display : "").match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/)
                  if (tlMatchLive && !taskUpdatedByToolRef.current) {
                    __commitTaskListContent(tlMatchLive[0])
                  }
                }
              }
            } catch (e) { 
                console.error("Error parsing stream chunk", e)
                // 🔥 修复：解析错误时也要清理状态
                __commitIsLoading(false)
                __commitAgentStatus("")
            }
          }
        }
      }

      // 🔥 关键修复：如果用户已请求停止，跳过所有后处理（保存消息、执行命令、解析任务等）
      if (__stopRef.current) {
        console.log('[Stream Guard] Stopped by user, skipping all post-processing')
        return
      }

      // 🔥 深度思考归一化：把 content 里的 <REASONING> 块抽出为 reasoning 字段，并从正文剥离。
      // 背景：assistantMsg.content 累积的是原始流（含 <REASONING>），且 assistantMsg 不带 reasoning；
      // 流结束后多处用 `{ ...assistantMsg }` 回写消息 → reasoning 丢失（思考面板消失、思考文本裸露在回答里），
      // 同时原始 REASONING 会随 content 一起落库。这里在回写/落库前统一修正。
      if (enableReasoning && typeof assistantMsg.content === "string" && assistantMsg.content.includes("<REASONING>")) {
        const reasoningBlocks: string[] = []
        const strippedContent = assistantMsg.content.replace(
          /<REASONING>([\s\S]*?)(?:<\/REASONING>|$)/g,
          (_m, inner: string) => {
            reasoningBlocks.push(inner)
            return ""
          }
        )
        assistantMsg.content = strippedContent.replace(/<\/?REASONING>/g, "").replace(/^\s*\n+/, "").trim()
        const innerText = reasoningBlocks.join("\n\n").trim()
        if (innerText) reasoningText = innerText
      }
      if (enableReasoning && reasoningText) {
        assistantMsg.reasoning = { text: reasoningText, durationMs: Date.now() - startTs }
      }

      // Read remaining buffer if any
      if (isTTSEnabled) {
         const getTTSableText = (text: string) => {
             if (!text) return ""
             let s = text
             s = s.replace(/```[\s\S]*?(?:```|$)/g, '')
             s = s.replace(/<(task|device_control|chart|TASK_LIST|TOOL_USED|REASONING|analyze|plan)(?:[\s>][\s\S]*?(?:<\/\1>|$)|$)/gi, '')
             s = s.replace(/<\/?(?:t|ta|tas|task|d|de|dev|devi|devic|device|device_|device_c|device_co|device_con|device_cont|device_contr|device_contro|device_control|c|ch|cha|char|chart|T|TA|TAS|TASK|TASK_|TASK_L|TASK_LI|TASK_LIS|TASK_LIST|R|RE|REA|REAS|REASO|REASON|REASONI|REASONIN|REASONING|a|an|ana|anal|analy|analyz|analyze|p|pl|pla|plan)$/i, '')
             s = s.replace(/<\/?(?:b|i|strong|em|p|div|span|h[1-6]|ul|li|ol|br|hr|a|img)[^>]*>/gi, '')
             return s
         }
         const cleanContent = getTTSableText(assistantMsg.content as string)
         const normalizeIoTUnitsForTTS = (text: string) => {
             if (!text) return "";
             return text
                 .replace(/°C/gi, '摄氏度')
                 .replace(/\blux\b/gi, '勒克斯')
                 .replace(/\bppm\b/gi, 'P P M')
                 .replace(/CO[2₂]/gi, '二氧化碳')
                 .replace(/\bmg\/m3\b/gi, '毫克每立方米')
                 .replace(/\bmg\/l\b/gi, '毫克每升')
                 .replace(/\bm\/s\b/gi, '米每秒')
                 .replace(/\+([0-9.]+)/g, '上升$1')
         }
         const unprocessed = cleanContent.slice(ttsProcessedLength)
         const remaining = normalizeIoTUnitsForTTS(unprocessed.replace(/<[^>]+>/g, '').replace(/[！!]/g, '。').trim())
         if (remaining.length > 2) {
            enqueueTts(remaining)
         }
      }

      // Mark answer as completed (the ThoughtChain stays visible; collapsing is handled internally)
      // 🚨 字段错位修复（2026-10-14）：上面 push 的是 `kind:"narrative"` + `id:"answer-N"`，
      //    从不写 `type` 字段 → 老写法 `s.type === 'answer'` 恒为 -1，这一行永远停在 active，
      //    工具调用链因此永远等不到"本轮已结束"（也就永远不会自动折叠）。
      const answerIdx = currentAgentSteps.findIndex(
        (s) =>
          s.type === 'answer' ||
          (typeof s.id === 'string' && s.id.startsWith('answer-')),
      )
      if (answerIdx !== -1) {
        currentAgentSteps[answerIdx].status = 'completed'
        currentAgentSteps[answerIdx].duration = Date.now() - (currentAgentSteps[answerIdx].startedAt || startTs)
        __commitAgentSteps([...currentAgentSteps])
      }

      // 🔥 修复：流式输出结束后立即清理状态
      console.log('[Stream End] Cleaning up loading state')
      __commitIsLoading(false)
      __commitAgentStatus("")

      // 🔥 SSE 流结束时清理挂起等待状态
      // 正常情况下 user_input_received 或 user_input_timeout 事件会清空，
      // 但如果流意外中断（如网络断开、服务器错误），这里作为兜底清理
      if (waitingForUserInputRef.current) {
        console.warn('[Stream End] SSE closed while waiting for user input, clearing state')
        waitingForUserInputRef.current = null
      }
      // 🛑 同理兜底：流结束时收起残留的确认胶囊（后端异常关闭 / 5 分钟未点 / 页面切走）。
      //    留着一枚点不动的胶囊比不显示更糟 —— 用户会以为界面卡死了。
      if (toolConfirmRef.current) {
        console.warn('[Stream End] SSE closed while a tool confirmation was pending, dismissing')
        setToolConfirm(null)
      }

      // 🔥 标签解析失败自动打回：检测 CLARIFY/DECISION 标签 JSON 是否解析失败
      // 失败时自动发送 isSilent 系统纠正消息让 AI 重新生成（最多重试 2 次，防循环）
      const tagRetryCheckContent = typeof assistantMsg.content === "string" ? assistantMsg.content : ""
      if (tagRetryCheckContent && tagRetryCountRef.current < 2) {
        const failedTag = detectFailedTag(tagRetryCheckContent)
        if (failedTag) {
          tagRetryCountRef.current += 1
          console.log(`[Tag Retry] ${failedTag} 解析失败，自动打回重试 (${tagRetryCountRef.current}/2)`)
          const correctionMsg = `【系统纠正】你上一次输出的 <${failedTag}> 标签内 JSON 格式错误，解析失败。请重新输出格式正确的 <${failedTag}> 标签。要求：1) JSON 必须使用双引号；2) 所有对象和数组括号必须闭合；3) 字符串值内的双引号必须用 \\" 转义；4) 只输出标签和必要的简短文字，不要重复之前的回答。`
          // 异步触发，避免在 cleanup 阶段阻塞
          setTimeout(() => {
            handleSend(correctionMsg, undefined, false, true)
          }, 100)
        }
      }

      // 🔥 reasoning（深度思考）不再推入 agentSteps
      // 思考过程是独立概念，由 ChatMessageRenderer 中的 DeepThinking 组件渲染
      // agentSteps 只包含任务执行步骤（工具调用、任务状态等）

      // 🔥 完成 AI 动作总结：计算任务耗时、提取任务规划进度
      const finalDurationMs = Date.now() - aiActionStatsRef.current.startTs
      // 提取任务规划进度
      let taskPlanProgress: string | undefined
      let taskPlanCompleted = false
      const tlMatch = (typeof assistantMsg.content === "string" ? assistantMsg.content : "").match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/)
      if (tlMatch) {
        try {
          const parsed = JSON.parse(tlMatch[1])
          const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : []
          if (tasks.length > 0) {
            const done = tasks.filter((t: any) => t.status === "completed").length
            taskPlanProgress = `${done}/${tasks.length}`
            taskPlanCompleted = done === tasks.length
          }
        } catch {}
      }
      __commitAiActionSummary({
        status: taskPlanCompleted ? "completed" : "completed",
        totalDurationMs: finalDurationMs,
        toolCallCount: aiActionStatsRef.current.toolCallCount,
        fileChanges: aiActionStatsRef.current.fileChanges,
        taskPlanCompleted,
        taskPlanProgress,
        onOpenStudio: () => setStudioOpen(true),
      })

      // 确保流结束时关闭浏览器
      __commitBrowsingUrl(null)
      
      // ⚠️ 重要：先保存原始内容用于解析，因为后面会删除SCHEDULE_TASK标记
      const originalContent = typeof assistantMsg.content === 'string' ? assistantMsg.content : ''
      
      // 解析并创建定时任务（如果AI响应中包含SCHEDULE_TASK标记）
      if (originalContent) {
        console.log('[Schedule Task] 🔍 Checking content for SCHEDULE_TASK tag...')
        console.log('[Schedule Task] Content length:', originalContent.length)
        console.log('[Schedule Task] Content preview:', originalContent.substring(0, 500))
        
        // 检查是否包含标记
        const hasTag = originalContent.includes('<SCHEDULE_TASK>')
        console.log('[Schedule Task] Has <SCHEDULE_TASK> tag:', hasTag)
        
        if (hasTag) {
          console.log('[Schedule Task] ✅ Found SCHEDULE_TASK tag, attempting to parse...')
        } else {
          console.log('[Schedule Task] ❌ No SCHEDULE_TASK tag found in response')
        }
        
        const taskData = parseScheduleTask(originalContent)
        if (taskData) {
          console.log('[Schedule Task] ✅ Successfully parsed task data:', taskData)
          
          // 创建定时任务 (Legacy Tag Support - now saved to DB)
          await scheduleTask(
            taskData.description,
            taskData.delayMinutes,
            taskData.taskType,
            taskData.payload
          )
          toast.success("定时任务已加入计划", { description: taskData.description })
        }
      }

      // Check for SCHEDULE_TASK tag regardless of previous structure
      const tagCheckContent = typeof assistantMsg.content === 'string' ? assistantMsg.content : ''
      if (tagCheckContent.includes('<SCHEDULE_TASK>')) {
        assistantMsg.content = removeScheduleTaskTag(tagCheckContent)
        
        // 更新消息显示
        // 🔥 关键修复：只有当前会话才更新消息
        /* 会话隔离：由 __commitXxx 内部按当前激活会话分流 */ {
          __commitMessages(prev => {
            const newMsgs = [...prev]
            newMsgs[newMsgs.length - 1] = { ...assistantMsg }
            return newMsgs
          })
        }
      }
      
      // 🔥 流结束后的最终交付物分流（兜底方案）
      //
      // 与流式阶段共用同一套判定（lib/ai/deliverable-classifier.ts）：
      //   - 报告特征双证成立（语义 + 结构，且非程序型代码）→ 包 [REPORT:] 交付报告卡
      //   - 裸 HTML 代码产物（无围栏）→ 补 html 语言围栏，交付代码卡（源码 + 预览 + 下载）
      //     原因：无围栏的裸 HTML 会被 Markdown 渲染器当未知 HTML 静默吞掉，
      //     表现为"AI 说写好了，界面上什么都没有"。
      //   - 其余一律不动
      const finalContent = typeof assistantMsg.content === 'string' ? assistantMsg.content : ''
      if (finalContent && !finalContent.includes('[REPORT:')) {
        const htmlStartPatterns = [
          /<div\s+style\s*=/i,
          /<p\s+style\s*=/i,
          /<!DOCTYPE/i,
          /<html/i,
        ]

        let htmlStartIndex = -1
        for (const pattern of htmlStartPatterns) {
          const match = finalContent.match(pattern)
          if (match && match.index !== undefined) {
            htmlStartIndex = match.index
            break
          }
        }

        if (htmlStartIndex !== -1) {
          // 分离前面的文本说明与后面的 HTML 内容
          const beforeHtml = finalContent.substring(0, htmlStartIndex).trim()
          const htmlContent = finalContent.substring(htmlStartIndex).trim()

          if (looksLikeReportHtml(htmlContent)) {
            const reportTitle = extractReportTitle(htmlContent)
            assistantMsg.content = beforeHtml
              ? `${beforeHtml}\n\n[REPORT:${reportTitle}]\n${htmlContent}\n[/REPORT]`
              : `[REPORT:${reportTitle}]\n${htmlContent}\n[/REPORT]`
            console.log('[Final Delivery Check] ✅ 识别为报告:', reportTitle)
          } else if (isBareHtmlArtifact(htmlContent) || looksLikeCodeArtifact(htmlContent)) {
            assistantMsg.content = beforeHtml
              ? `${beforeHtml}\n\n\`\`\`html\n${htmlContent}\n\`\`\``
              : `\`\`\`html\n${htmlContent}\n\`\`\``
            console.log('[Final Delivery Check] ✅ 识别为代码产物，转为 html 代码块交付')
          } else {
            console.log('[Final Delivery Check] 内容既非报告也非代码产物，保持原样')
          }

          /* 会话隔离：由 __commitXxx 内部按当前激活会话分流 */ {
            __commitMessages(prev => {
              const newMsgs = [...prev]
              newMsgs[newMsgs.length - 1] = { ...assistantMsg }
              return newMsgs
            })
          }
        }
      }
      // 🔥 流结束后的最终自动化策略检测和包裹（兜底方案）
      // 处理两种情况：
      //  1. 裸 ```json ... ``` 代码块（早期包裹失败）
      //  2. 裸无 fence 的 JSON { "nodes": [...], "edges": [...] }（如用户截图所示）
      if (typeof assistantMsg.content === 'string' && !assistantMsg.content.includes('<AUTOMATION_STRATEGY')) {
        console.log('[Final Automation Check] Checking for bare automation strategy in completed response...')
        let finalContent2 = assistantMsg.content

        // 🔥 更鲁棒的描述提取：
        // 优先级：1) 标题/粗体格式  2) "X策略"中的核心名词  3) 通用回退
        const extractDescription = (before: string): string => {
          if (!before) return 'AI 生成的自动化策略'
          // 1) Markdown 标题/粗体：### 标题：xxx / **策略名称**：xxx
          const m1 = before.match(/(?:#{1,6}\s*)?(?:\*\*|__)?(?:策略名称|方案名称|名称|标题|主题)[：:]\s*[\*\*「]?([^\*\*「」\n。]{2,40})[\*\*」]?/)
          if (m1 && m1[1]) return m1[1].trim()
          // 2) 抓取最后一个"策略"/"方案"前的核心名词（"草莓大棚自动化控制策略" → "草莓大棚自动化控制"）
          //    要求前面有"是"/"为"/"的"/"了"/"，"，避免抓取到修饰词
          const m2 = before.match(/(?:是|为|的|了|，|：|:)\s*([^\n。\s，：:]{2,40}?)\s*(?:策略|方案)/)
          if (m2 && m2[1]) return m2[1].trim()
          return 'AI 生成的自动化策略'
        }

        // 检测函数
        const containsStrategyMarker = (s: string) =>
          s.includes('"triggerNode"') || s.includes('"logicNode"') || s.includes('"actionNode"')

        // 情况 1: 裸 ```json ... ``` 代码块
        const fencedRegex = /```json\s*([\s\S]*?)\s*```/g
        let hasStrategy = false
        finalContent2 = finalContent2.replace(fencedRegex, (full, body) => {
          if (containsStrategyMarker(body)) {
            hasStrategy = true
            return full // 暂不替换，最后整体包裹
          }
          return full
        })

        // 情况 2: 裸无 fence 的 JSON（平衡花括号扫描）
        if (!hasStrategy && containsStrategyMarker(finalContent2)) {
          // 找到第一个 { 之后，向后扫描直到匹配的 }
          const firstBrace = finalContent2.indexOf('{')
          if (firstBrace !== -1) {
            let depth = 0
            let inString = false
            let escape = false
            let endIdx = -1
            for (let i = firstBrace; i < finalContent2.length; i++) {
              const ch = finalContent2[i]
              if (escape) { escape = false; continue }
              if (inString) {
                if (ch === '\\') escape = true
                else if (ch === '"') inString = false
                continue
              }
              if (ch === '"') { inString = true; continue }
              if (ch === '{') depth++
              else if (ch === '}') { depth--; if (depth === 0) { endIdx = i; break } }
            }
            if (endIdx !== -1) {
              const jsonText = finalContent2.substring(firstBrace, endIdx + 1)
              if (containsStrategyMarker(jsonText)) {
                hasStrategy = true
                // 重新组合：说明文字 + 包裹的 ```json```
                const before = finalContent2.substring(0, firstBrace).trim()
                const description = extractDescription(before)
                const wrappedJson = '```json\n' + jsonText + '\n```'
                finalContent2 = before
                  ? `${before}\n\n<AUTOMATION_STRATEGY description="${description}">\n${wrappedJson}\n</AUTOMATION_STRATEGY>`
                  : `<AUTOMATION_STRATEGY description="${description}">\n${wrappedJson}\n</AUTOMATION_STRATEGY>`
                console.log(`[Final Automation Check] ✅ Wrapped bare strategy: "${description}"`)
              }
            }
          }
        }

        // 情况 1 的处理：把首个含标记的代码块包裹
        if (hasStrategy && !finalContent2.includes('<AUTOMATION_STRATEGY')) {
          finalContent2 = finalContent2.replace(fencedRegex, (full, body) => {
            if (containsStrategyMarker(body)) {
              const beforeMatchIdx = assistantMsg.content.indexOf(full)
              const before = beforeMatchIdx > 0 ? assistantMsg.content.substring(0, beforeMatchIdx).trim() : ''
              const description = extractDescription(before)
              return before
                ? `${before}\n\n<AUTOMATION_STRATEGY description="${description}">\n${full}\n</AUTOMATION_STRATEGY>`
                : `<AUTOMATION_STRATEGY description="${description}">\n${full}\n</AUTOMATION_STRATEGY>`
            }
            return full
          })
        }

        if (hasStrategy && finalContent2 !== assistantMsg.content) {
          assistantMsg.content = finalContent2
          // 更新消息显示
          /* 会话隔离：由 __commitXxx 内部按当前激活会话分流 */ {
            __commitMessages(prev => {
              const newMsgs = [...prev]
              newMsgs[newMsgs.length - 1] = { ...assistantMsg }
              return newMsgs
            })
          }
        } else {
          console.log('[Final Automation Check] No bare automation strategy detected')
        }
      }

      // 🔥 最终兜底：处理 AUTOMATION_STRATEGY 标签不完整或纯文本策略的情况
      if (typeof assistantMsg.content === 'string') {
        const finalContent3 = assistantMsg.content
        let modified3 = false

        // 情况 A：有开始标签但没结束标签（流被截断或 AI 忘记关闭）
        if (finalContent3.includes('<AUTOMATION_STRATEGY') && !finalContent3.includes('</AUTOMATION_STRATEGY>')) {
          assistantMsg.content = finalContent3 + '\n</AUTOMATION_STRATEGY>'
          modified3 = true
          console.log('[Final Automation Fix] Added missing </AUTOMATION_STRATEGY> closing tag')
        }

        // 情况 B：完全没有 AUTOMATION_STRATEGY 标签，但内容是纯文本策略描述
        // 检测特征：包含 2+ 个策略段头（触发条件/动作执行/诊断逻辑/联动控制 等）
        if (!assistantMsg.content.includes('<AUTOMATION_STRATEGY')) {
          const text = assistantMsg.content
          const sectionHeaders = text.match(/(?:^|\n)\s*(?:#{1,6}\s*|\*\*)?\s*(?:策略说明|触发条件|触发|监测条件|诊断逻辑|诊断|判断条件|判断|逻辑判断|动作执行|执行动作|动作|联动控制|联动|控制步骤|控制|响应措施|响应)\s*[:：]?/g) || []
          if (sectionHeaders.length >= 2) {
            // 提取描述
            const descMatch = text.match(/(?:是|为|的|了|，|：|:)\s*([^\n。\s，：:]{2,40}?)\s*(?:策略|方案)/)
            const description = descMatch ? descMatch[1].trim() : 'AI 生成的自动化策略'
            assistantMsg.content = `<AUTOMATION_STRATEGY description="${description}">\n${text}\n</AUTOMATION_STRATEGY>`
            modified3 = true
            console.log(`[Final Automation Fix] ✅ Wrapped text-based strategy (${sectionHeaders.length} sections): "${description}"`)
          }
        }

        if (modified3) { /* 会话隔离同上 */
          __commitMessages(prev => {
            const newMsgs = [...prev]
            newMsgs[newMsgs.length - 1] = { ...assistantMsg }
            return newMsgs
          })
        }
      }

      // 🔥 DEVICE_FORGE 收尾兜底：connect_device_from_doc 已产出 ui_card（已注册右面板），
      // 但模型最终回复没有复述 <DEVICE_FORGE> 标签时（此前 bug：AI 只写了"在草稿表单里补全/点装入"
      // 这类幻觉话术，标签根本没输出 → 对话内卡片"出现一秒就消失"甚至根本不渲染）。
      // 这里把卡片补到消息末尾（与模型正常输出位置一致），随消息一起持久化，历史回放也能显示。
      if (pendingForgeCardRef.current && typeof assistantMsg.content === 'string') {
        const pending = pendingForgeCardRef.current
        const contentStr = assistantMsg.content
        const openIdx = contentStr.indexOf('<DEVICE_FORGE')
        const hasCloseTag = /<\/\s*DEVICE_FORGE\s*>/.test(contentStr)
        const tag = `<DEVICE_FORGE>${JSON.stringify(pending.card)}</DEVICE_FORGE>`
        if (openIdx === -1) {
          // 情况 A：完全没有标签 → 直接把完整卡片补到消息末尾
          assistantMsg.content = contentStr
            ? `${contentStr.replace(/\s+$/, '')}\n\n${tag}`
            : tag
          console.log('[Final DeviceForge] ✅ ui_card auto-injected as DEVICE_FORGE tag (model did not echo)')
        } else if (!hasCloseTag) {
          // 情况 B：模型开始复述但流被截断/忘记闭合 → 切掉残缺的开标签片段，替换为完整卡片
          assistantMsg.content = `${contentStr.slice(0, openIdx).replace(/\s+$/, '')}\n\n${tag}`
          console.log('[Final DeviceForge] ✅ Replaced dangling DEVICE_FORGE open tag with complete card')
        } else {
          // 情况 C：模型已正确输出完整标签 → 无需注入
          console.log('[Final DeviceForge] Model already echoed complete DEVICE_FORGE tag, skip injection')
        }
        /* 会话隔离：由 __commitXxx 内部按当前激活会话分流 */ {
          __commitMessages(prev => {
            const newMsgs = [...prev]
            newMsgs[newMsgs.length - 1] = { ...assistantMsg }
            return newMsgs
          })
        }
        pendingForgeCardRef.current = null
      }

      if (ensuredSessionId && !isTempSession(ensuredSessionId)) {
        const lastMsg = {  
          ...assistantMsg, 
          reasoning: enableReasoning ? { text: reasoningText, durationMs: Date.now() - startTs } : undefined,
          model: selectedModel || aiSettings?.model // 保存使用的模型
        }
        await fetch(`/api/sessions/${ensuredSessionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: latestHistoryFromBackend ? [...latestHistoryFromBackend, lastMsg] : [...currentMessagesForApi, lastMsg] })
        })
      }

      // 如果开启了AI自动执行，检测并执行命令
      console.log('[Auto Execute Check]', { autoExecuteCommands, hasContent: typeof assistantMsg.content === 'string' })
      // 🔥 架构变更：设备控制已迁移为原生 MCP 工具调用（toggle_relay / control_camera 等），
      // AI 在 Agent Loop 内直接调用工具，工具内部阻塞等待物理动作完成并返回结果给 AI。
      // 因此不再需要前端解析 JSON 代码块 + 调 /api/ai/device-control + 静默消息反馈的旧链路。
      // 旧的 auto-execute JSON parsing 已移除。如发现 AI 仍输出 JSON 控制指令，应通过
      // prompt-templates.ts 的 DEVICE_CONTROL_INSTRUCTION_COMPACT 纠正，而不是在这里兜底。
      if (autoExecuteCommands && typeof assistantMsg.content === 'string') {
        // 仅做日志检测：发现 toggle_relay/control_camera 等 JSON 输出时记录 warning（不执行）
        const legacyJsonMatch = assistantMsg.content.match(/```json\s*\{\s*"action"\s*:\s*"(?:toggle_relay|set_led|control_camera|reset_camera)"[\s\S]*?\}\s*```/)
        if (legacyJsonMatch) {
          console.warn('[Auto Execute] ⚠️ 检测到 AI 输出了旧格式 JSON 设备控制指令（已废弃），请检查 prompt-templates.ts 配置。内容片段:', legacyJsonMatch[0].slice(0, 120))
        }
      }

    } catch (e: any) {
      // 忽略用户主动停止任务的"错误"
      if (e?.message === "Task terminated by user" || e === "Task terminated by user") {
        console.log("[Chat] Task terminated by user (expected)")
        return
      }

      console.error("Chat error:", e)
      // 与项目里其它 API 错误风格一致：后端 `error` 字段是友好描述（中文/AI API Error: code - details），
      // 直接显示，不要再额外包一个静态的"抱歉"占位文案。
      const rawMsg: string = e?.message || ""
      const isGeneric = !rawMsg || rawMsg === "No response body"
      const errMsg = isGeneric ? "抱歉，发生了一些错误，请稍后再试。" : rawMsg
      __taskError = errMsg

      // 429 速率限制：渲染为业务卡片（RateLimitErrorCard），而不是裸文本
      const isRateLimit = e?.isRateLimit === true || e?.status === 429
        || /HTTP 429|status["']?\s*:\s*"?429|速率限制|访问量过大|rate.?limit/i.test(rawMsg)
      if (isRateLimit) {
        __commitMessages(prev => [...prev, {
          role: "assistant",
          content: errMsg,
          errorType: "rate_limit",
          errorRaw: rawMsg,
          errorStatus: 429,
        }])
      } else {
        __commitMessages(prev => [...prev, { role: "assistant", content: errMsg }])
      }
    } finally {
      // 📷 先把本轮抓到的摄像头画面投递给用户（成功/报错/被停止三种收尾都投递）
      await __flushCameraSnapshots()
      // 📎 再把本轮生成/修改的文档挂到最后一条助手消息（同样三种收尾都投递）
      await __flushDocArtifacts()

      // 🔥 架构变更后：AI 通过 Agent Loop 内的工具调用完成设备控制，前端不再有
      // "解析 JSON + 触发 executeCommands + 静默消息反馈" 的后续任务链。
      // 直接清理 loading 状态即可（除非处于 isFeedback/isSilent 内部触发的子调用）。
      const content = typeof assistantMsg.content === 'string' ? assistantMsg.content : '';
      // 仍保留对 schedule_task JSON 的检测：定时任务由 ScheduleCard 组件单独处理，
      // 不影响 isLoading 生命周期，但避免在 ScheduleCard 渲染期间过早清理状态
      const hasScheduleTask = autoExecuteCommands && content.includes('"action": "schedule_task"');

      __commitAgentStatus("")
      if (!hasScheduleTask) {
        __commitIsLoading(false)
      }

      // 🔥 任务收尾：注销本会话的流控制句柄，并清掉会话列表上的「任务进行中」圆点。
      //    注意：会话快照（sessionScopesRef）刻意保留 —— 用户切回该会话时可直接
      //    从内存快照看到完整结果，不必等落库后再回源拉取。
      if (__scopeKey) {
        const sc = __getScope()
        sc.running = false
        delete streamControllersRef.current[__scopeKey]
        delete streamStopRefs.current[__scopeKey]
        setRunningSessions(prev => {
          if (!prev[__scopeKey]) return prev
          const next = { ...prev }
          delete next[__scopeKey]
          return next
        })
      }

      // 额外延迟清理一次，确保彻底结束（防止竞态条件）
      setTimeout(() => {
        if (!__stopRef.current && !hasScheduleTask) {
          __commitAgentStatus("")
          __commitIsLoading(false)
        }
      }, 300)

      // =====================================================================
      // 桌面端原生通知：任务收尾提醒（见 lib/desktop-notify.ts）
      //
      // 三种时机共用这一处收口：
      //   · AI 任务完成   —— 正常跑完
      //   · 任务失败/出错 —— catch 里记了 __taskError
      //   · 后台会话完成 —— 用户切到了别的会话，本任务在其后台跑完
      //
      // 弹不弹由 helper 决定：桌面端 + 用户开着通知开关 + （窗口不在前台
      // 或者本任务属于非当前会话）三者同时满足才弹 —— 用户正盯着这个会话看时
      // 再弹一条系统通知纯属打扰。
      // isFeedback / isSilent 是内部子调用（工具回喂、静默补话），不打扰用户。
      // =====================================================================
      if (!isFeedback && !isSilent && !__stopRef.current) {
        const __notifyBody = summarizeForNotification(
          __taskError || (typeof assistantMsg.content === "string" ? assistantMsg.content : "")
        )
        const __scheduled = useSystemApi
        notifyDesktop({
          title: __taskError
            ? (__scheduled ? "定时任务执行失败" : "AI 任务执行失败")
            : (__scheduled ? "定时任务已完成" : "AI 任务已完成"),
          body: __notifyBody || sessions.find((s) => s.id === __scopeKey)?.title || "点击查看结果",
          tag: `ai-task:${__scopeKey || "default"}`,
          level: __taskError ? "error" : "success",
          // 深链到具体会话：点通知回来直接落在刚跑完任务的对话里，
          // 而不是上次停留的会话（页面用 ?session= 消费）
          route: __scopeKey
            ? `/ai-assistant?session=${encodeURIComponent(__scopeKey)}`
            : "/ai-assistant",
          // 不在当前会话里跑完的，即使窗口就在前台也值得提醒（同 Slack 的频道提醒）
          force: !__isFg(),
        })
      }
    }
  }
  
  // 更新 handleSendRef，确保定时任务回调中可以访问最新的 handleSend
  useEffect(() => {
    handleSendRef.current = handleSend
  }, [])

  // ===== 速率限制错误卡片的"重试"事件 =====
  // 找到最后一条用户消息并重新发送，并移除"速率限制"错误卡片
  useEffect(() => {
    const handler = () => {
      // 从末尾往前找最后一条 user 消息
      let lastUserText = ""
      let lastUserIndex = -1
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i]?.role === "user") {
          const c: any = messages[i].content
          lastUserText = typeof c === "string" ? c : (Array.isArray(c) ? (c.find((p: any) => p.type === "text")?.text || "") : "")
          lastUserIndex = i
          break
        }
      }
      if (!lastUserText) return

      // 移除最后那条"速率限制"错误卡片（同步内存快照，切走再切回不会回滚）
      setMessages(prev => {
        if (prev.length === 0) return prev
        const last = prev[prev.length - 1]
        const next = last?.errorType === "rate_limit" ? prev.slice(0, -1) : prev
        const sc = sessionScopesRef.current[activeSessionIdRef.current]
        if (sc && next !== prev) sc.messages = next
        return next
      })

      // 重新发送（短暂延迟以让 messages 更新生效）
      setTimeout(() => {
        handleSend(lastUserText, undefined, false, false)
      }, 50)
    }
    if (typeof window !== "undefined") {
      window.addEventListener("berry:retry-last-message", handler)
      return () => window.removeEventListener("berry:retry-last-message", handler)
    }
  }, [messages])

  const createNewSession = async () => {
    try {
      const r = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `新会话 ${new Date().toLocaleString("zh-CN")}` })
      })
      if (r.ok) {
        const s = await r.json()
        switchActiveSession(s.id)
        setSessions(prev => [s, ...prev])
        setMessages([])
        setInput("")
        // 🔥 新建会话：无历史消息，边界为 0（所有消息都是"新消息"，无需分隔线）
        setNewMessageBoundary(0)
      }
    } catch { }
  }

  const deleteSession = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" })
      // 会话被删除：同时清掉它的内存快照与运行标记，避免残留
      delete sessionScopesRef.current[id]
      delete streamControllersRef.current[id]
      delete streamStopRefs.current[id]
      setRunningSessions(prev => { const n = { ...prev }; delete n[id]; return n })
      const nextSessions = sessions.filter(s => s.id !== id)
      setSessions(nextSessions)
      if (id === sessionId) {
        if (nextSessions.length > 0) switchActiveSession(nextSessions[0].id)
        else createNewSession()
      }
    } catch { }
  }

  // ===== 对话菜单功能 =====

  /** 重命名对话 */
  const handleRename = (id: string) => {
    const session = sessions.find(s => s.id === id)
    setRenameSessionId(id)
    setRenameValue(session?.title || "")
    setRenameModalOpen(true)
  }

  const confirmRename = async () => {
    if (!renameValue.trim() || !renameSessionId) return
    try {
      await fetch(`/api/sessions/${renameSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameValue.trim() })
      })
      setSessions(prev => prev.map(s => s.id === renameSessionId ? { ...s, title: renameValue.trim() } : s))
      setRenameModalOpen(false)
      showNotice("重命名成功", "对话标题已更新", "success")
    } catch { showNotice("重命名失败", "请重试", "error") }
  }

  /** 置顶对话（移到列表最前） */
  const handlePin = (id: string) => {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === id)
      if (idx <= 0) return prev
      const [item] = prev.splice(idx, 1)
      return [item, ...prev]
    })
    showNotice("已置顶", "对话已移至顶部", "success")
  }

  /** 分享对话（复制链接到剪贴板） */
  const handleShare = async (id: string) => {
    const url = `${window.location.origin}/ai-assistant?session=${id}`
    try {
      await navigator.clipboard.writeText(url)
      showNotice("链接已复制", "分享链接已复制到剪贴板", "success")
    } catch { showNotice("复制失败", "无法访问剪贴板", "error") }
  }

  /** 切换批量管理模式 */
  const toggleBatchMode = () => {
    setBatchMode(prev => {
      if (!prev) setBatchSelected(new Set())
      else setBatchSelected(new Set())
      return !prev
    })
  }

  /** 批量选择/取消 */
  const toggleBatchSelect = (id: string) => {
    setBatchSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  /** 移动到分组（客户端标记，暂存 localStorage） */
  const handleMoveGroup = (id: string, groupId: string) => {
    const g = groups.find(g => g.id === groupId)
    if (g) {
      moveSessionToGroup(id, groupId)
      showNotice("已移动", `对话已移至「${g.name}」`, "success")
    }
  }

  /** 导出对话 */
  const handleExport = async (id: string, format: "md" | "json" | "txt") => {
    try {
      const res = await fetch(`/api/sessions/${id}`)
      if (!res.ok) throw new Error("加载失败")
      const data = await res.json()
      const msgs = data.messages || []
      const sessionTitle = sessions.find(s => s.id === id)?.title || "对话"
      let content = ""
      let filename = ""
      let mimeType = ""

      switch (format) {
        case "md":
          content = `# ${sessionTitle}\n\n${msgs.map((m: any) =>
            `## ${m.role === "user" ? "用户" : "助手"}\n\n${m.content}\n`
          ).join("\n---\n\n")}`
          filename = `${sessionTitle}.md`
          mimeType = "text/markdown"
          break
        case "json":
          content = JSON.stringify({ title: sessionTitle, messages: msgs }, null, 2)
          filename = `${sessionTitle}.json`
          mimeType = "application/json"
          break
        case "txt":
          content = `${sessionTitle}\n${"=".repeat(30)}\n\n${msgs.map((m: any) =>
            `[${m.role === "user" ? "用户" : "助手"}]\n${m.content}\n`
          ).join("\n\n")}`
          filename = `${sessionTitle}.txt`
          mimeType = "text/plain"
          break
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      showNotice("导出成功", `文件 ${filename} 已下载`, "success")
    } catch { showNotice("导出失败", "无法加载对话内容", "error") }
  }

  /** 删除对话（带确认） */
  const handleDeleteConfirm = (id: string) => {
    Modal.confirm({
      title: "确认删除",
      content: "删除后无法恢复，确定要删除此对话吗？",
      okText: "删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => deleteSession(id),
    })
  }

  /** 深色模式切换（写全局 next-themes，其他页面同步跟随） */
  const toggleDarkMode = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  /** 用户菜单点击 */
  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case "settings":
        setSettingsOpen(true)
        break
      case "darkMode":
        toggleDarkMode()
        break
      case "logout":
        localStorage.removeItem("token")
        window.location.href = "/login"
        break
    }
  }

  /** 统一处理菜单点击 */
  const handleConvMenuClick = ({ key }: { key: string }, sessionId: string) => {
    switch (key) {
      case "rename": handleRename(sessionId); break
      case "pin": handlePin(sessionId); break
      case "share": handleShare(sessionId); break
      case "batch": toggleBatchMode(); break
      case "export-md": handleExport(sessionId, "md"); break
      case "export-json": handleExport(sessionId, "json"); break
      case "export-txt": handleExport(sessionId, "txt"); break
      case "delete": handleDeleteConfirm(sessionId); break
      default:
        // 动态分组：move-{groupId} 或 move-none
        if (key.startsWith("move-")) {
          const gId = key.replace("move-", "")
          if (gId === "none") {
            moveSessionToGroup(sessionId, null)
            showNotice("已移出", "对话已回到最近对话", "success")
          } else {
            handleMoveGroup(sessionId, gId)
          }
        }
        break
    }
  }

  /**
   * 文件 / 图片 → 受控体积的附件，落进 sender 的常显缩略图行。
   *
   * 粘贴（Ctrl/⌘+V）与「+」里选文件走**同一条**通路 —— 以前两边各自 FileReader，
   * 粘贴那份还不压缩，行为必然漂移。
   *
   * 压缩是刚需：剪贴板里的全屏截图在 Windows 上常是 2560×1440 的 PNG，
   * base64 能到 3–8 MB，直接塞 `image_url` 会把请求体打爆（上游 413 / 网关超时）。
   */
  const appendFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return

      // 图片受张数限制（每张都进请求体）；文档走服务端落盘，只带 fileId，不占图片配额
      const imageCount = attachments.filter((a) => !a.fileId).length
      const room = MAX_SENDER_IMAGES - imageCount

      const added: ChatAttachment[] = []
      let skipped = 0
      let imagesAdded = 0
      let docsAdded = 0

      for (const file of files) {
        try {
          if (isImageFile(file)) {
            if (imagesAdded >= room) {
              skipped += 1
              continue
            }
            const img = await prepareImageFile(file)
            added.push({ name: img.name, type: img.type, dataUrl: img.dataUrl })
            imagesAdded += 1
          } else {
            // 非图片一律走文档通道：服务端嗅探真实格式（不信后缀），
            // 不支持的格式会带回准确原因（如「这是旧版 .doc，请另存为 .docx」）
            added.push(await uploadDocumentFile(file, sessionId || undefined))
            docsAdded += 1
          }
        } catch (err) {
          // 单个失败（损坏 / 网络）不拖累其余，静默跳过并计数
          skipped += 1
          console.warn("[appendFiles] 跳过无法处理的文件:", file.name, err)
        }
      }

      if (added.length) {
        setAttachments((prev) => [...prev, ...added])
        const failed = added.filter((a) => a.status === "error")
        const ready = added.filter((a) => a.status !== "error")
        if (failed.length) {
          showNotice(
            `${failed.length} 个文件无法添加`,
            failed.map((f) => `${f.name}：${f.error || "格式不支持"}`).join("；").slice(0, 120),
            "error",
          )
        } else if (docsAdded > 0 && imagesAdded > 0) {
          showNotice(`已添加 ${imagesAdded} 张图片、${docsAdded} 个文档`, "文档已解析，可直接提问内容", "success")
        } else if (docsAdded > 0) {
          showNotice(`已添加 ${docsAdded} 个文档`, ready[0]?.sizeText ? `首个：${ready[0].name}（${ready[0].sizeText}）` : "可直接提问内容", "success")
        } else {
          showNotice(`已添加 ${imagesAdded} 张图片`, "可继续补充说明，或点缩略图右上角 × 移除", "success")
        }
      }
      if (skipped > 0) {
        showNotice("部分文件已跳过", `${skipped} 个文件无法读取或超出图片数量上限`, "error")
      }
    },
    [attachments, sessionId, showNotice],
  )

  const onSelectFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.currentTarget.files || [])
    // 先清空 value：同一张图连选两次也要触发 change
    e.currentTarget.value = ""
    void appendFiles(files)
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  /**
   * 粘贴：剪贴板里带文件时才接管，否则**必须放浏览器过去** ——
   * 否则粘贴一段文字会被吞掉（e.preventDefault 会连文本一起拦）。
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = pickFilesFromClipboard(e.clipboardData)
    if (files.length === 0) return
    e.preventDefault()
    void appendFiles(files)
  }

  const handleDownloadPDF = async (messageIndex: number) => {
    const element = document.getElementById(`message-content-${messageIndex}`)
    if (!element) return

    showNotice("正在生成 PDF...", "请稍候，这可能需要几秒钟", "loading")

    try {
      const htmlToImage = await import('html-to-image')
      const { default: jsPDF } = await import('jspdf')

      const dataUrl = await htmlToImage.toPng(element, {
        backgroundColor: '#ffffff',
        style: {
          // 强制覆盖可能出问题的颜色属性，虽然 html-to-image 对 lab 支持更好，但防患于未然
          color: '#000000',
        }
      })

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const img = new window.Image()
      img.src = dataUrl
      await new Promise((resolve) => { img.onload = resolve })

      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (img.height * imgWidth) / img.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`MeiXiaozhi-Report-${new Date().toISOString().slice(0, 10)}.pdf`)
      showNotice("PDF 生成成功", "文件已开始下载", "success")
    } catch (error) {
      console.error("PDF Generation Error:", error)
      showNotice("PDF 生成失败", "请重试或检查内容是否包含复杂元素", "error")
    }
  }

  const handleSettingsSave = (settings: AISettings) => {
    setAiSettings(settings)
    localStorage.setItem("ai-settings", JSON.stringify(settings))
    setSelectedModel(settings.model)
  }

  // Handle initial prompt and image from URL
  useEffect(() => {
    const prompt = searchParams.get("prompt")
    let image = searchParams.get("image")
    const useSessionImage = searchParams.get("useSessionImage")
    const autoSend = searchParams.get("autoSend") !== "false" // default true

    if (useSessionImage === "true") {
      const sessionImage = sessionStorage.getItem("pending_ai_image")
      if (sessionImage) {
        image = sessionImage
        sessionStorage.removeItem("pending_ai_image")
      }
    }

    if (prompt && !isLoading && !isInspecting && aiSettings) {
      // Small timeout to ensure everything is initialized
      const timer = setTimeout(() => {
        if (image) {
          handleSend(prompt, [image])
        } else {
          handleSend(prompt)
        }
        
        // Remove params from URL to prevent re-sending on refresh
        const url = new URL(window.location.href)
        url.searchParams.delete("prompt")
        url.searchParams.delete("image")
        url.searchParams.delete("useSessionImage")
        url.searchParams.delete("autoSend")
        window.history.replaceState({}, '', url.toString())
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [searchParams, aiSettings]) // Dependency on aiSettings ensures it fires after settings are loaded

  // 探索覆盖层深链：?explore=kb&id=<id> → 自动打开 UnifiedExplore 并由其内部
  // 渲染 KB 详情覆盖层。KB 详情关闭后清掉 URL 上的 explore/id 参数。
  useEffect(() => {
    const exploreTab = searchParams.get("explore")
    const exploreId = searchParams.get("id")
    if (exploreTab === "kb" && exploreId) {
      setExploreOpen(true)
      // URL 由 UnifiedExplore 内部消费（kbDetailId 初始化时已读取），
      // 关闭时无需主动清，保持可深链分享能力
    }
  }, [searchParams])

  // 会话深链：?session=<id> → 自动切到该会话。
  // 主要服务桌面端"点通知直达对话"：主进程把窗口拉到前台后，
  // 根布局的 DesktopNotificationBridge 用 router.push('/ai-assistant?session=<id>') 进来，
  // 如果不带参数，用户会被留在上次的会话里，找不到刚跑完任务的那个。
  useEffect(() => {
    const target = searchParams.get("session")
    if (!target) return
    switchActiveSession(target)
    // 用完即清，避免之后每次 searchParams 变化都把用户硬拽回这个会话
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete("session")
      window.history.replaceState({}, "", url.toString())
    } catch { }
  }, [searchParams, switchActiveSession])

  // 语音对话消息处理
  const handleVoiceChatMessage = async (text: string): Promise<string> => {
    if (!aiSettings?.apiKey) {
      return "请先配置 AI 设置"
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          model: selectedModel || aiSettings?.model,
          apiKey: aiSettings?.apiKey,
          apiUrl: aiSettings?.apiUrl,
          systemPrompt: aiSettings?.systemPrompt,
          deviceData,
          deviceOnline: connectionStatus.connected,
          weatherData,
          stream: false // 语音对话不使用流式响应
        })
      })

      if (!res.ok) {
        throw new Error("请求失败")
      }

      // 处理流式响应
      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")

      let fullContent = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split("\n")
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              const content = data.choices?.[0]?.delta?.content ?? data.content
              if (typeof content === "string") {
                fullContent += content
              }
            } catch { }
          }
        }
      }

      // 清理特殊标签
      const cleanContent = fullContent
        .replace(/<REASONING>[\s\S]*?<\/REASONING>/g, "")
        .replace(/<MONITOR\s*\/?>/g, "")
        .replace(/<DEVICE_BENTO\s*\/?>/g, "")
        .replace(/<CONTROL_BENTO\s*\/?>/g, "")
        .replace(/<SPECTRAL\s*\/?>/g, "")
        .replace(/<TASK_LIST\s*\/?>/g, "")
        .replace(/<SCHEDULED_TASKS\s*\/?>/g, "")
        .replace(/<CHART[\s\S]*?<\/CHART>/g, "")
        .replace(/<SOURCES>[\s\S]*?<\/SOURCES>/g, "")
        .trim()

      return cleanContent || "抱歉，我没有理解您的问题"
    } catch (error) {
      console.error("Voice chat API error:", error)
      return "抱歉，处理您的请求时出现了问题"
    }
  }



  const groupedSessions = sessions.reduce((acc, session) => {
    const date = new Date(session.createdAt)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let key = "Earlier"
    if (date.toDateString() === today.toDateString()) key = "Today"
    else if (date.toDateString() === yesterday.toDateString()) key = "Yesterday"
    else if (today.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) key = "Previous 7 Days"

    if (!acc[key]) acc[key] = []
    acc[key].push(session)
    return acc
  }, {} as Record<string, SessionMeta[]>)

  const groupOrder = ["Today", "Yesterday", "Previous 7 Days", "Earlier"]

  /* ============================================================================
     侧栏版式 token（2026-10-01 · 按设计参考稿重做）
     ----------------------------------------------------------------------------
     量测来源：用户给的设计参考图 570×1638（@2x），逐行游程 + 连通域取值：
       侧栏净宽 260 · 底色 #fafafa（无描边、无分割线）
       行高 32 · 行距 2（行距 34）· 行圆角 10 · 行左右内衬 = 面板 14 + 行内 8
       图标墨迹 14~15px（≈17px 图标）· 图标↔文字 9 · 行文字 14
       选中/悬停底色 #f1f1f1（对 #fafafa 底 Δ≈9）· 分区标题 13.5 #a6a6a6
       顶部三枚 28×28 幽灵图标钮（间距 8、图标 18）· 品牌名 20px/700 在图标行之下
     本平台沿用既有色系（晨雾松 emerald×zinc），只把「版式 + 对比层级」对齐参考稿。
     ========================================================================== */
  const SB = { padX: 12, rowH: 32, rowGap: 2, rowR: 10, rowPadX: 8, icon: 17, iconGap: 9, label: 14, head: 13.5 }

  /**
   * 🪟 桌面端自绘窗口 chrome（2026-10-06 顶栏重做）。
   *
   * 本页不用 `PageHeader`，是自绘布局，所以窗口 chrome 的接线要在这里自己做：
   *   ① `useDesktopHeaderHost()` —— 告诉全局兜底层「本页已有自绘顶栏」，
   *      否则兜底拖拽带会继续渲染并盖住侧栏顶部图标（本次 bug 的直接成因）；
   *   ② `desktopChrome` —— 下面顶栏的 drag/no-drag、菜单、控制键都靠它 gate，
   *      浏览器部署下这些一律不渲染，行为与改动前一致。
   */
  useDesktopHeaderHost()
  const desktopChrome = IS_DESKTOP_APP

  /**
   * 窗口是否真的在透传桌面（玻璃壳）。2026-10-23 用户：
   * 「AI 助手浅色模式下的磨砂区域跟深色一样」——
   * 根因就在侧栏那行 `background: darkMode ? "transparent" : "#f7f7f9"`：
   * 暗色是 transparent（吃到了画布/桌面的磨砂），浅色却写死一块不透明的灰白，
   * 于是同一套材质只有暗色成立。玻璃壳打开时两侧统一走 transparent，
   * 由 globals.css 的 --br-canvas（已按 --glass-a 半透明）负责底色。
   */
  const [glassShell, setGlassShell] = useState(false)
  useEffect(() => {
    const bridge = (window as unknown as { stravisionDesktop?: { glassShell?: boolean } }).stravisionDesktop
    setGlassShell(bridge?.glassShell === true)
  }, [])
  const sbTone = {
    hover: darkMode ? "rgba(255,255,255,0.06)" : "rgba(13,13,13,0.045)",
    active: darkMode ? "rgba(255,255,255,0.10)" : "rgba(13,13,13,0.07)",
    text: darkMode ? "#d4d4d8" : "#0d0d0d",
    textOn: darkMode ? "#fafafa" : "#09090b",
    icon: darkMode ? "#a1a1aa" : "#71717a",
    iconOn: darkMode ? "#e4e4e7" : "#18181b",
    head: darkMode ? "#71717a" : "#a1a1aa",
  }

  /** 侧栏统一行：图标 + 文字 + 右侧插槽（徽标/更多）。全侧栏只有这一种行规格。 */
  const sbRow = (o: {
    key: string
    icon: React.ReactNode
    label: string
    active?: boolean
    onClick?: () => void
    tail?: React.ReactNode
    badge?: number
    dot?: boolean
  }) => (
    <div
      key={o.key}
      onClick={o.onClick}
      title={o.label}
      style={{
        display: "flex", alignItems: "center", gap: SB.iconGap,
        height: SB.rowH, padding: `0 ${SB.rowPadX}px`, marginBottom: SB.rowGap,
        borderRadius: SB.rowR, cursor: "pointer", userSelect: "none",
        background: o.active ? sbTone.active : "transparent",
        color: o.active ? sbTone.textOn : sbTone.text,
        fontSize: SB.label,
        fontWeight: o.active ? 500 : 400,
        transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => { if (!o.active) e.currentTarget.style.background = sbTone.hover }}
      onMouseLeave={(e) => { if (!o.active) e.currentTarget.style.background = "transparent" }}
    >
      <span style={{ display: "inline-flex", flexShrink: 0, color: o.active ? sbTone.iconOn : sbTone.icon }}>{o.icon}</span>
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
      {o.badge !== undefined && o.badge > 0 && (
        <span style={{
          fontSize: 10.5, lineHeight: "16px", height: 16, minWidth: 16, padding: "0 5px",
          textAlign: "center", borderRadius: 999, flexShrink: 0,
          color: darkMode ? "#a1a1aa" : "#71717a",
          background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(13,13,13,0.06)",
        }}>{o.badge > 99 ? "99+" : o.badge}</span>
      )}
      {o.dot && (
        <span style={{
          width: 7, height: 7, borderRadius: 999, flexShrink: 0, background: "#059669",
        }} />
      )}
      {o.tail}
    </div>
  )

  /** 侧栏分区标题：可折叠 + 右侧可选动作（小标题 + 右侧动作插槽版式）。 */
  const sbHead = (key: string, label: string, action?: React.ReactNode) => (
    <div
      onClick={() => toggleSection(key)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 30, marginTop: 12, padding: `0 ${SB.rowPadX}px`,
        borderRadius: 8, cursor: "pointer", userSelect: "none",
        color: sbTone.head, fontSize: SB.head, transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = sbTone.hover }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
    >
      <span>{label}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {action}
        <IconDown size={12} strokeWidth={2} style={{
          opacity: 0.6,
          transition: "transform 0.2s ease",
          transform: collapsedSections.has(key) ? "rotate(-90deg)" : "rotate(0deg)",
        }} />
      </span>
    </div>
  )

  /** 侧栏顶部幽灵图标钮（三枚 28×28 同排、图标 18）。 */
  const sbIconBtn = (o: { key: string; title: string; icon: React.ReactNode; onClick: () => void; on?: boolean; onColor?: string }) => (
    <button
      key={o.key}
      onClick={o.onClick}
      title={o.title}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 28, height: 28, borderRadius: 8, border: "none", flexShrink: 0,
        background: o.on ? sbTone.active : "transparent",
        cursor: "pointer",
        color: o.on ? (o.onColor || sbTone.iconOn) : sbTone.icon,
        transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => { if (!o.on) e.currentTarget.style.background = sbTone.hover }}
      onMouseLeave={(e) => { if (!o.on) e.currentTarget.style.background = "transparent" }}
    >
      {o.icon}
    </button>
  )

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#059669",
          borderRadius: 10,
        },
      }}
    >
      {/* 对话项悬停显示 ... 按钮 */}
      <style>{`
        [class*="conversations-item"]:hover .conv-more-btn,
        [class*="conversation-item"]:hover .conv-more-btn,
        li[class*="item"]:hover .conv-more-btn {
          opacity: 1 !important;
        }
        /* 2026-09-19 用户反馈「新对话这些字没跟新分组图标对齐」：
           antd-x Conversations 的 ul.ant-conversations 自带 padding: 0 12px，
           把整列右推 12px（实测 li 左缘 22px vs 功能项图标 18px）。
           置 0 后 li 自身 padding-left 8px 恰好让文字落在 18px，与图标列对齐。 */
        .sidebar-scroll .ant-conversations {
          padding: 0 !important;
        }
        /* 2026-09-19 用户反馈「整个页面的图标都细」：
           页面级统一图标描边。CSS stroke-width 优先级高于 SVG presentation
           attribute（lucide 把 strokeWidth 写在 attribute 上），故可整体覆盖。
           按渲染尺寸分层，保证"都细但不发虚"：
           - ≥15px 图标 → 1.9（16px 下笔画 1.27px，介于用户认可的 1.24 与嫌粗的 1.33 之间）
           - 13-14px 小图标 → 1.75（≈1.0px 笔画，维持原有的纤细观感）
           - 12px 折叠箭头 → 2（12px 下仅 1px，本就是最细档，且过细会糊）
           antd 自带图标（1em stroke 风格）同步被 1.9 兜底统一。 */
        .ai-assistant-page svg { stroke-width: 1.9; }
        .ai-assistant-page svg[width="13"],
        .ai-assistant-page svg[width="14"] { stroke-width: 1.75; }
        .ai-assistant-page svg[width="12"] { stroke-width: 2; }

        /* 对话区背景生命周期：淡入 → 保持 20s → 淡出 → 卸载。
           --pb-max 由容器内联样式按明暗主题注入。
           时间轴（总 21.8s）：0→0.9s 淡入 · 0.9~20s 保持 · 20~21.8s 淡出
           （0.9s / 20s 落在 4% / 92% 两个关键帧上）。
           ⚠️ 改总时长必须同步 page.tsx 里 auraMounted 的卸载定时器（21800ms）。 */
        /* ===== 对话区氛围层（.pb-aura）—— 2026-10-22 第三版：WebGL 雾 + 白点阵 =====
           演进史（别再走回头路）：
             v1 CSS 斜向色带          → 用户「好丑」（有形状、有方向，一眼看见带子在斜着走）
             v2 CSS radial 雾 + 点阵  → 用户「参考人家这个」「有动起来的雾」「底下有白色点」
             v3 本版                  → 用户「不行引入那个 webgl 吧，舍弃 pixel」
           判据：参考稿那块背景是**全屏 canvas 用片元着色器实时画的雾**，
           不是 CSS 渐变。CSS 只能整体平移一张固定图案，
           做不出"雾在有机翻涌"；给它加 animation 得到的是一张纸在滑。
           ── 分工依据（为什么雾用 WebGL、点阵还用 CSS）──
             雾   = 低频、大块、必须有机变化 → WebGL 半分辨率 + 30fps 封顶最省
             点阵 = 高频、必须像素级锐利   → CSS gradient（半分辨率渲染会把 1px 的点糊掉）
           ── 参考图实测（2520×1004，2x DPR ⇒ CSS 1260×502）──
             雾：顶部中间最浓 (220,253,239)，左上 (243,254,249)，中部 (247,255,251)，底部 (253,255,254)
                反解叠加色 ≈ rgb(22,242,148)，峰值 alpha ≈ .20
             点阵：沿一行扫像素得**稳定 16 物理 px 周期**（= 8 CSS px），点在浅绿底上比底色更白，
                点径约 2 物理 px ⇒ 1 CSS px，正方形网格
           ── 三层结构（自下而上）──
             .pb-aura-scene   裁切 + 淡出容器（z0，pointer-events:none，绝不挡点击与滚轮）
             .pb-aura-canvas  AuroraBg 挂载点（WebGL 雾）
             .pb-aura-dots    白点阵（8px 网格，**静止** —— 网格纹跟着动就像电视雪花）
           ⚠️ 只在上半部可见、向下渐隐（mask）——「清透」而非「糊一层」的决定性一步：
              参考稿顶部是淡薄荷 (≈rgb(240,254,248))，到中部就回到纯白。
           ⚠️ 本层在内容层**之下**（内容层 zIndex:1）。 */
        .pb-aura-scene{
          position: absolute; inset: 0; z-index: 0;
          overflow: hidden; pointer-events: none;
          /* 用户要求「20 秒后要消失的」—— 背景是"进入这一屏"的开场，不是常驻装饰；
             久留会让正文一直压在一层纹理上（也正是 v1 被嫌脏的原因之一）。
             ⚠️ 只写 opacity，不写 display/visibility —— 淡出必须连续，且保持 GPU 合成。 */
          opacity: 0;
          animation: pb-aura-lifecycle 21.8s ease-in-out forwards;
          -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 26%, rgba(0,0,0,.60) 46%, rgba(0,0,0,.17) 64%, transparent 78%);
          mask-image: linear-gradient(to bottom, #000 0%, #000 26%, rgba(0,0,0,.60) 46%, rgba(0,0,0,.17) 64%, transparent 78%);
        }
        .pb-aura-canvas{
          position: absolute; inset: 0;
        }
        .pb-aura-dots{
          position: absolute; inset: 0;
          background-image: radial-gradient(circle at 50% 50%, rgba(255,255,255,.95) 0 .55px, rgba(255,255,255,0) .95px);
          background-size: 8px 8px;
        }
        /* 暗色：白点阵在暗底上会变成"满天星"，压到几乎只剩质感。
           雾的暗色配色不走 CSS —— 由 AuroraBg 的 uTone uniform 切 #10B981。 */
        .dark .pb-aura-dots{
          background-image: radial-gradient(circle at 50% 50%, rgba(255,255,255,.07) 0 .55px, rgba(255,255,255,0) .95px);
        }
        @keyframes pb-aura-lifecycle {
          0%   { opacity: 0; }
          4%   { opacity: var(--pb-max, 1); }
          92%  { opacity: var(--pb-max, 1); }
          100% { opacity: 0; }
        }
        /* 2026-10-22：这里的「三团 emerald 光晕 + 18s 漂移」（.pb-aurora）已按用户要求删除。
           判据：对话区的背后没有任何需要被透出来的东西（气泡是裸文本、没有玻璃卡），
           所以它不是沉浸光感的「景」，只是一层会呼吸的彩色渐变 —— 正是用户说的"好丑"。 */
        @media (prefers-reduced-motion: reduce) {
          /* 尊重系统「减少动态效果」：不播开场动画即视为不显示（氛围层是纯装饰） */
          .pb-aura-scene { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
    <App>
    <>
    {/* Sonner Toast 已在全局 layout.tsx 的 ToasterWrapper 中统一提供 (position: top-center) */}
    
    <div
      className={cn(
        "ai-assistant-page",
        "fixed inset-0 w-full h-full overflow-hidden flex font-sans transition-colors duration-300",
        /* 画布底色走 --berry-canvas（暗态 #09090B），**不要把这里改回 bg-zinc-900**：
           2026-10-22 用户先要求「PixelBlast 绿色点阵完全保留原本的不要修改」，
           我一度把底色也一并还原成 zinc-900(#18181B)，用户随即反馈「颜色没有之前的深了」——
           也就是说：**要的是更深的底，不是更浅的底**。两件事拆开看：
             · 画布  → --berry-canvas（暗 #09090B / 亮 #F7F7F8），与全站统一，玻璃壳下可透传
             · 背景层 → WebGL 雾 + 白点阵（见 .pb-aura），21.8s 生命周期后自动卸载
           为什么底色深一档背景层会更好看：雾和点都是极淡的叠色，底色越深对比越清晰；
           原来的 zinc-900 是"半灰半黑"，浅绿的雾浮在上面反而发闷。 */
        "bg-[var(--berry-canvas)]",
        darkMode ? "text-zinc-100" : "text-zinc-900",
        isExecutingControl && "ai-control-active",
        isElderFriendlyMode && "elder-friendly-text"
      )}
    >
      {/* AI Control Border Effect - 渐变边框效果 */}
      <AIControlBorderEffect isActive={isExecutingControl} duration={2000} />

      {/* Device Operation Indicator - Dynamic Island Style */}
      {executingDeviceName && (
        <div className="pointer-events-none fixed top-6 left-1/2 -translate-x-1/2 z-[10000]">
          <div
            className="pointer-events-auto overflow-hidden flex items-center shadow-lg shadow-black/5 dark:shadow-black/20"
            style={{
              height: "48px",
              padding: "0 6px",
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(calc(20px * var(--dc-mat-scale, 1)))",
              border: "1px solid rgba(0,0,0,0.05)",
              color: "#18181b",
              width: devicePillExpanded ? "auto" : "48px",
              minWidth: devicePillExpanded ? "240px" : "48px",
              transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            <div className="size-9 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
               <div className="size-2.5 bg-primary rounded-full animate-pulse" />
            </div>
            
            <div 
                className="flex flex-col ml-3 mr-4 overflow-hidden whitespace-nowrap"
                style={{
                    opacity: devicePillExpanded ? 1 : 0,
                    maxWidth: devicePillExpanded ? "200px" : "0px",
                    transition: "all 0.3s ease 0.1s"
                }}
            >
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Executing</span>
                <span className="text-sm font-medium text-zinc-900 leading-none mt-0.5">{executingDeviceName}</span>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes gradient-x {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0; }
          10%, 90% { opacity: 1; }
          50% { top: 100%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>

      {/* Top Bar — light, side-by-side with sidebar */}
      <AntLayout style={{ flex: 1, background: "transparent" }}>
        {/* Sidebar — 统一侧栏版式 */}
        <AntLayout.Sider
          width={260}
          collapsedWidth={0}
          collapsed={!sidebarOpen}
          trigger={null}
          collapsible
          style={{
            /* 2026-09-19 抓千问 design token 对齐：
               侧栏底色走 --ty-background-pc-sidebar #f7f7f9（中性灰，去蓝调），
               与主区 #fff 形成克制的层级差；此前侧栏是 transparent，
               靠整页 #fafafa 透出，底色偏蓝且与主区对比过重。
               同日追加（用户反馈）：**不要边界线**——纯靠底色差分层级，
               不用 --ty-line-border 描边。 */
            /* 玻璃壳（窗口透传桌面）时两侧都透明 —— 让浅色也吃到和深色同一层磨砂；
               浏览器部署仍走 #f7f7f9 的中性灰分层。 */
            background: glassShell || darkMode ? "transparent" : "#f7f7f9",
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            minHeight: "100vh",
            overflow: "hidden",
            borderRight: "none",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* ===== 顶部图标行（2026-10-01 按参考稿重做）=====
                版式：三枚幽灵图标钮同排、左对齐、图标 18、间距 8；
                品牌名从「与按钮同排」下移成独立大字标题。
                参考稿量测：图标行中心 y=24 → 品牌名中心 y=65 → 首个列表行中心 y=110。
                ⚠️ 「临时对话」从原「新建对话右侧的 40×40 方按钮」迁到此处（顶栏第三枚
                   本就是新建类图标），原位置的实心大按钮一并撤掉，侧栏不再有大色块。
                🚨 桌面端必须显式 no-drag：本行 y=10~38 落在窗口顶部，
                   父级/兜底层一旦是 drag，三枚图标会被拖拽区吞掉而点不动
                   （2026-10-06 用户反馈「有些 icon 点不了」的直接现象）。 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 0 18px", ...(desktopChrome ? DESKTOP_NO_DRAG : {}) }}>
              {sbIconBtn({ key: "collapse", title: "收起侧边栏", icon: <IconLayoutTwo size={18} strokeWidth={1.9} />, onClick: () => setSidebarOpen(false) })}
              {sbIconBtn({ key: "search", title: "搜索", icon: <IconSearch size={18} strokeWidth={1.9} />, onClick: () => setSearchPanelOpen(true) })}
              {sbIconBtn({
                key: "temp",
                title: "临时对话（不保存记录）",
                icon: <IconCommentDashed size={18} strokeWidth={1.9} />,
                on: tempSessionActive,
                onColor: "#059669",
                onClick: () => {
                  if (isTempSession(sessionId)) { showNotice("临时对话", "当前已在临时对话中", "success"); return }
                  createTempSession()
                },
              })}
            </div>

            {/* ===== 品牌名（20px/700 大字，左缘与列表行图标列对齐）===== */}
            <div style={{ padding: "14px 12px 0 12px" }}>
              <span style={{
                display: "block", paddingLeft: SB.rowPadX,
                fontFamily: "var(--font-ui-strong)",
                fontSize: 20, fontWeight: 700, lineHeight: "26px", letterSpacing: "-0.01em",
                color: darkMode ? "#fafafa" : "#09090b",
                whiteSpace: "nowrap",
              }}>莓小智</span>
            </div>

            {/* ===== 分组与列表区域 ===== */}
            <div data-lenis-prevent className="sidebar-scroll" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px " + SB.padX + "px 0" }}>
              {/* 隐藏滚动条 */}
              <style>{`
                /* 滚动条已交回全站统一段（原 5px + opacity 0/1 的私有实现已删，2026-10-11）：
                   那套只在亮色下给了 #d4d4d8，暗色底下等于没有 —— 「不滚动就隐藏」现在由
                   components/scroll-activity.tsx + globals.css 统一负责，这里不要再写。 */
                /* 会话条目（antd-x Conversations）统一到侧栏行规格（2026-10-01）：
                   圆角 10 / 文字 14 / 悬停与选中同层浅底。
                   原来条目底色与手写行不是一套（悬停 #f4f4f5 vs rgba(13,13,13,0.045)），
                   同一个列表里两种悬停观感。 */
                .sidebar-scroll .ant-conversations-item {
                  border-radius: 10px !important;
                  font-size: 14px !important;
                  transition: background-color 0.15s;
                }
                .sidebar-scroll .ant-conversations-item:hover { background-color: ${sbTone.hover} !important; }
                .sidebar-scroll .ant-conversations-item-active {
                  background-color: ${sbTone.active} !important;
                  font-weight: 500;
                }
              `}</style>

              {/* ===== 新建对话：列表首行（2026-10-01 按参考稿重做）=====
                  原来是跟「临时对话」并排的 40px 实心材质大按钮；参考稿里
                  「新建对话」就是列表第一行（悬停/选中垫一层浅底），侧栏因此
                  不再有任何大色块。临时对话已上移到顶部第三枚图标钮。 */}
              {sbRow({
                key: "new-chat",
                icon: <IconCommentAdd size={SB.icon} strokeWidth={1.9} />,
                label: "新建对话",
                onClick: () => createNewSession(),
              })}

              {/* ===== 功能导航（保留 2026-09-19 定的这组功能项，行规格统一）=====
                  2026-10-01 按参考稿统一：行高 32 / 行距 2 / 圆角 10 / 图标 17 /
                  图标↔文字 9 / 文字 14 / 悬停与选中都走同一层浅底。
                  本轮补上「面板打开 = 该行高亮」——原来功能项完全没有选中态，
                  点开「我的空间」后从列表里看不出当前停在哪个面板。 */}
              {[
                { key: "explore", label: "探索", icon: <IconCompass size={SB.icon} strokeWidth={1.9} />, onClick: () => openSidebarPanel("explore"), active: exploreOpen },
                { key: "space", label: "我的空间", icon: <IconFolderOpen size={SB.icon} strokeWidth={1.9} />, onClick: () => openSidebarPanel("space"), active: mySpaceOpen, badge: spaceReports.length > 0 ? spaceReports.length : undefined, dot: mySpaceNewBadge > 0 },
                { key: "records", label: "病历", icon: <IconNotebook size={SB.icon} strokeWidth={1.9} />, onClick: () => openSidebarPanel("records"), active: medicalRecordsOpen },
                { key: "scheduler", label: "定时任务", icon: <IconTime size={SB.icon} strokeWidth={1.9} />, onClick: () => openSidebarPanel("scheduler"), active: schedulerPanelOpen },
                { key: "knowledge", label: "知识库", icon: <IconBookOpen size={SB.icon} strokeWidth={1.9} />, onClick: () => openSidebarPanel("knowledge"), active: knowledgeOpen },
                { key: "settings", label: "更多", icon: <IconGridFour size={SB.icon} strokeWidth={1.9} />, onClick: () => setSettingsOpen(true), active: settingsOpen },
              ].map((item) => sbRow({
                key: item.key,
                icon: item.icon,
                label: item.label,
                onClick: item.onClick,
                active: item.active,
                badge: (item as any).badge,
                dot: (item as any).dot,
              }))}

              {/* ===== 工作台分组（2026-09-19 新增）：真实路由跳转，去业务页当宿主，
                    AI 助手在那里以 Copilot 抽屉 + 悬浮球形态常驻。
                    2026-09-19 追加：分区标题可折叠（同日用户要求）===== */}
              {sbHead("workspace", "工作台")}

              {!collapsedSections.has("workspace") && [
                {
                  key: "ws-monitor",
                  label: "实时监控",
                  icon: <IconMonitor size={SB.icon} strokeWidth={1.9} />,
                  href: "/monitor",
                },
                {
                  key: "ws-dashboard",
                  label: "数据看板",
                  icon: <IconChartHistogram size={SB.icon} strokeWidth={1.9} />,
                  href: "/dashboard",
                },
                {
                  key: "ws-automation",
                  label: "自动化",
                  icon: <IconThunderbolt size={SB.icon} strokeWidth={1.9} />,
                  href: "/automation",
                },
                {
                  key: "ws-device",
                  label: "设备控制",
                  icon: <IconSettingTwo size={SB.icon} strokeWidth={1.9} />,
                  href: "/device-control",
                },
              ].map((item) => sbRow({
                key: item.key,
                icon: item.icon,
                label: item.label,
                onClick: () => router.push(item.href),
              }))}

              {/* ===== 对话分组（2026-10-01 按参考稿：标题右侧「+」直接新建分组）=====
                  参考稿量测：「分组」标题右端 x=224.5~235.5 有一枚 ≈16px 的「+」，
                  与「分组示例」右侧铃铛同列 —— 即「小标题 + 右侧动作插槽」版式。
                  ⚠️ 原来「新分组」是独立整行（2026-09-19 用户要求）；本轮按参考稿收进
                     标题行右插槽，列表少一行、且「+」与分组项右缘天然对齐。
                     「+」自身 stopPropagation —— 标题行整体仍是分区折叠开关。 */}
              {sbHead("groups", "对话分组",
                <span
                  onClick={(e) => { e.stopPropagation(); setShowNewGroupInput(true) }}
                  title="新建分组"
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 20, height: 20, borderRadius: 6, cursor: "pointer",
                    color: sbTone.head, transition: "background 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = sbTone.active; e.currentTarget.style.color = darkMode ? "#e4e4e7" : "#18181b" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = sbTone.head }}
                >
                  <Plus size={15} strokeWidth={1.9} />
                </span>
              )}

              {!collapsedSections.has("groups") && (<>
              {showNewGroupInput && (
                <div style={{ display: "flex", gap: 6, marginBottom: 6, padding: "0 " + SB.rowPadX + "px" }}>
                  <input autoFocus value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addGroup(newGroupName); if (e.key === "Escape") { setShowNewGroupInput(false); setNewGroupName("") } }}
                    onBlur={() => { if (newGroupName.trim()) addGroup(newGroupName); else setShowNewGroupInput(false) }}
                    placeholder="输入分组名…"
                    style={{
                      flex: 1, height: SB.rowH, fontSize: 13,
                      border: darkMode ? "1px solid #3f3f46" : "1px solid #e4e4e7",
                      borderRadius: SB.rowR, padding: "0 10px", outline: "none",
                      background: darkMode ? "#27272a" : "#fff",
                      color: darkMode ? "#e4e4e7" : "#3f3f46",
                    }}
                  />
                </div>
              )}

              {/* 自定义分组列表 */}
              {groups.map(g => {
                const isActiveGroup = activeGroupId === g.id
                return (
                <div key={g.id}>
                  <div
                    onClick={() => { toggleGroupCollapse(g.id); setActiveGroupId(g.id) }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: SB.iconGap,
                      height: SB.rowH, padding: "0 " + SB.rowPadX + "px", marginBottom: SB.rowGap,
                      cursor: "pointer", userSelect: "none",
                      borderRadius: SB.rowR,
                      background: isActiveGroup ? sbTone.active : "transparent",
                      color: isActiveGroup ? sbTone.textOn : sbTone.text,
                      fontSize: SB.label,
                      transition: "background 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!isActiveGroup) e.currentTarget.style.background = sbTone.hover }}
                    onMouseLeave={(e) => { if (!isActiveGroup) e.currentTarget.style.background = "transparent" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: SB.iconGap, minWidth: 0 }}>
                      <IconFolderOpen size={SB.icon} strokeWidth={1.9} style={{ flexShrink: 0, color: isActiveGroup ? sbTone.iconOn : sbTone.icon }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
                      {collapsedGroups.has(g.id) ? (
                        <IconRight size={12} strokeWidth={2} style={{ opacity: 0.5, flexShrink: 0 }} />
                      ) : (
                        <ChevronDown size={12} strokeWidth={2} style={{ opacity: 0.5, flexShrink: 0 }} />
                      )}
                    </div>
                    <Dropdown trigger={["click"]} placement="bottomLeft"
                      menu={{
                        items: [
                          { key: "del-group", icon: <IconDelete size={12} />,
                            label: <span style={{ color: "#DC2626" }}>删除分组</span> },
                        ],
                        onClick: () => deleteGroup(g.id),
                      }}
                    >
                      <button onClick={(e) => e.stopPropagation()}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center",
                          width: 20, height: 20, borderRadius: 6, border: "none", background: "transparent",
                          cursor: "pointer", color: darkMode ? "#71717a" : "#a1a1aa",
                          opacity: isActiveGroup ? 1 : 0,
                          transition: "opacity 0.15s", flexShrink: 0 }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                        onMouseLeave={(e) => { if (!isActiveGroup) e.currentTarget.style.opacity = "0" }}
                      >
                        <IconMore size={13} />
                      </button>
                    </Dropdown>
                  </div>
                  {!collapsedGroups.has(g.id) && (sessionsByGroup[g.id] || []).length > 0 && (
                    <Conversations
                      menuable
                      onActiveChange={(key: string) => { switchActiveSession(String(key)) }}
                      onDelete={(info: any) => deleteSession(String(info.key))}
                      items={groupedSessionItems[g.id] || []}
                      styles={{ item: { borderRadius: SB.rowR, padding: "6px " + SB.rowPadX + "px", marginBottom: SB.rowGap } }}
                    />
                  )}
                </div>
                )
              })}
              </>)}

              {/* 最近对话（小标题可折叠，列表项直接跟在下面） */}
              {sbHead("recent", "最近对话")}

              {!collapsedSections.has("recent") && (<>
              {/* 临时对话条目：仅在临时态出现，提示"这条不保存"并提供返回入口 */}
              {tempSessionActive && (
                <div
                  onClick={() => { /* 已在临时态，无操作 */ }}
                  style={{
                    display: "flex", alignItems: "center", gap: SB.iconGap,
                    height: SB.rowH, padding: "0 " + SB.rowPadX + "px", marginBottom: SB.rowGap,
                    borderRadius: SB.rowR, userSelect: "none",
                    background: sbTone.active,
                    color: "#059669",
                    fontSize: SB.label,
                  }}
                >
                  <IconCommentDashed size={SB.icon} strokeWidth={1.9} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    临时对话
                  </span>
                  <span style={{
                    fontSize: 10.5, padding: "0 6px", height: 16, lineHeight: "16px",
                    borderRadius: 999, flexShrink: 0,
                    color: darkMode ? "#a1a1aa" : "#71717a",
                    background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(5,150,105,0.10)",
                  }}>不保存</span>
                </div>
              )}

              {/* 最近对话列表 */}
              <Conversations
                menuable
                onActiveChange={(key: string) => { switchActiveSession(String(key)) }}
                onDelete={(info: any) => deleteSession(String(info.key))}
                items={recentSessionItems}
                styles={{ item: { borderRadius: SB.rowR, padding: "6px " + SB.rowPadX + "px", marginBottom: SB.rowGap } }}
              />
              </>)}

              {/* 底部留白（探索入口已移至上方侧边栏） */}

            </div>
            {/* ===== 用户区（点击头像触发 Popover 浅色面板） =====
                2026-09-22：AI 守护铃铛从对话卡顶栏挪到用户卡右边（用户截图反馈：跟 WorkBuddy 一样，
                头像 + 昵称一行，通知铃铛紧随其右）。侧栏收起时铃铛回落到顶栏最右 ——
                与「侧栏收起 → 展开/新建按钮上浮到顶栏」同一套行为，保证铃铛不会被藏死。
                2026-10-01 按参考稿收口：头像 30→32、昵称 13→13.5、去掉尾部右箭头
                （参考稿「用户aoWj」只有一个圆头像 + 昵称），点击区规格与列表行统一。 */}
            <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "0 " + SB.padX + "px 14px 12px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
            <Popover
              trigger="click"
              open={showUserPopover}
              onOpenChange={setShowUserPopover}
              placement="rightTop"
              arrow={false}
              content={
                <UserPanelContent
                  user={user}
                  creditInfo={creditInfo}
                  darkMode={darkMode}
                  router={router}
                  setShowUserPopover={setShowUserPopover}
                  setSettingsOpen={setSettingsOpen}
                  setSettingsSection={setSettingsSection}
                  handleUserMenuClick={handleUserMenuClick}
                  toggleDarkMode={toggleDarkMode}
                />
              }
              overlayInnerStyle={{ padding: 0, borderRadius: 16, width: 296, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.14)' }}
            >
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  height: 46, padding: "0 " + SB.rowPadX + "px", margin: 0,
                  borderRadius: SB.rowR, cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = sbTone.hover }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
              >
                <AntAvatar size={32} src={user?.avatar_url} style={{ backgroundColor: darkMode ? "rgba(0,148,86,0.18)" : "#ECFDF5", color: "#059669", flexShrink: 0, fontSize: 13, fontWeight: 600 }}>
                  {user?.username?.[0]?.toUpperCase() || "B"}
                </AntAvatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: darkMode ? "#fafafa" : "#09090b", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user?.username || "管理员"}
                  </div>
                  <div style={{ fontSize: 10.5, color: sbTone.head, marginTop: 2, letterSpacing: 0.3 }}>
                    {(creditInfo?.membership || user?.membership || 'free').toUpperCase()}
                  </div>
                </div>
              </div>
            </Popover>
            </div>
            {/* 🔔 AI 主动守护通知铃铛 —— 紧贴用户卡右侧（用户 2026-09-22 反馈）。
                收起态由顶栏那份接管，这里就卸载，避免同一个铃铛渲染两份（各自 30s 轮询）。 */}
            {sidebarOpen && <GuardianAlertBell placement="topLeft" iconSize={18} />}
            </div>
          </div>
        </AntLayout.Sider>

        {/* 重命名 Modal */}
        <Modal
          title="重命名对话"
          open={renameModalOpen}
          onOk={confirmRename}
          onCancel={() => setRenameModalOpen(false)}
          okText="保存"
          cancelText="取消"
          destroyOnClose
        >
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="输入新标题"
            onPressEnter={confirmRename}
            autoFocus
            style={{ marginTop: 12 }}
          />
        </Modal>

        {/* Main — 对话区域卡片浮在 sidebar 背景之上 */}
        <AntLayout.Content style={{ display: "flex", flexDirection: "column", position: "relative", background: "transparent", padding: 12 }}>
          {/* 卡片容器：圆角 + 白色背景。
              🚨 flexDirection 是 **row**：本容器是一行两列 ——
              左列 = 对话（顶栏 + 气泡 + sender），右列 = 文档预览停靠面板（见文件末尾）。
              三段式布局（WorkBuddy 同款）：预览不是浮层，是对话列的兄弟节点，
              打开时对话列自己变窄，没有遮罩、没有层级抢占。 */}
          <div style={{
            position: "relative",
            flex: 1, display: "flex", flexDirection: "row",
            /* ⚠️ 必须是 backgroundColor（不是 background 简写）：背景简写会连子层
               背景层（.pb-aura 的雾与点阵）的叠色关系一起重置，且这类"静默失效"
               在 DevTools 里只表现为"类在、但没效果"。 */
            /* 2026-10-22：原来写死 darkMode ? "#0a0a0c" : "#fff"，暗色下这块白底是整页
               最刺眼的一片（且和全站浅色 token 不同源）。改成 --br-canvas：
               亮 #FAFAFA（几乎看不出与纯白的差）、暗 #08080A（比原值更深，雾与点阵对比更好）。 */
            backgroundColor: "var(--br-canvas)",
            borderRadius: 10, overflow: "hidden",
            minHeight: 0,
          }}>
            {/* ===== 对话区氛围层：WebGL 流动雾 + 白点阵 =====
                雾 = <AuroraBg>（片元着色器：三团高斯光斑被 fbm 噪声推着走，半分辨率 30fps）；
                点阵 = CSS 8px 网格。两者一起被 .pb-aura-scene 的 mask 收在上半部、向下渐隐。
                🚨 生命周期：同一个 auraMounted 开关 + 同一条 pb-aura-lifecycle
                   （21.8s：淡入 → 保持 20s → 淡出 → 卸载）—— 用户要求「20 秒后要消失的」。
                   卸载会 dispose + forceContextLoss 释放 WebGL 上下文：浏览器同时存活的
                   上下文有上限（通常 16 个），反复进出对话页不释放会把监控页的 3D 一起拖死。
                ⚠️ pointer-events:none 由 CSS 保证，绝不能吃掉对话区的点击与滚轮。
                ⚠️ PixelBlast 已于 2026-10-22 按用户要求从本页撤掉（「舍弃 pixel」）——
                   组件文件保留给 desktop-setup 的 aurora-backdrop 用，别删文件。 */}
            {auraMounted && (
              <div
                aria-hidden
                className="pb-aura-scene"
                style={{ ["--pb-max" as string]: darkMode ? 0.9 : 1 }}
              >
                <AuroraBg className="pb-aura-canvas" tone={darkMode ? "dark" : "light"} />
                <div className="pb-aura-dots" />
              </div>
            )}

            {/* ===== 内容层（浮在背景之上） =====
                🚨 minWidth:0 —— 本层现在是行方向的「对话列」，预览面板展开时它要能
                被压窄。没有这个，气泡里的宽内容会把 flex:1 撑爆，预览列被挤出视口。 */}
            <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
            {/* ===== 对话卡顶栏（2026-10-06 重做：48px → 72px，对齐主站顶栏） =====
                用户反馈「ai助手的顶部窗口要重做，有些 icon 点不了」。

                重做前的问题（CDP 实测）：
                  ① 这条 h-12(48px) 完全**没有声明拖拽区** —— 无边框窗口在这一页的
                     对话区顶部整条拖不动；
                  ② 全局兜底拖拽带（fixed top-0 h-10 z-100，pointerEvents:auto）盖住了
                     侧栏顶部那排图标（y=10~38），点「收起侧边栏」侧栏宽度 260 → 260 毫无反应；
                  ③ 窗口控制键 − □ ✕ 只有全局兜底层提供，本页没有自己的。

                重做后（对齐 components/page-header.tsx 的既有做法）：
                  - 高度 72px，与主站其它页面顶栏统一；
                  - 整条声明 drag（窗口可拖），内部每个可交互件显式 no-drag；
                  - 左侧内联 DesktopWindowMenu（编辑/窗口/帮助/关于）——原来挂在
                    Electron 默认菜单上，主进程已 setApplicationMenu(null) 摘掉；
                  - 右侧内联 DesktopWindowControls（− □ ✕），贴右上角；
                  - 调用 useDesktopHeaderHost() 告知全局兜底层「本页有自绘顶栏」，
                    避免同一组控制键渲染两份。

                🚨 这里必须调 useDesktopHeaderHost()：本页是自绘布局（不用 PageHeader），
                   漏调会让兜底层继续渲染并盖住内容 —— 正是本次 bug 的成因之一。 */}
            <div
              className={cn(
                "h-[72px] flex items-center gap-3 px-4 shrink-0",
                /* @container：让下面的 DesktopWindowMenu 按**这条顶栏实际拿到多宽**决定显隐，
                   而不是按视口断点猜（顶栏宽度≠视口宽度）。只在桌面端加：
                   container-type 会带一层 containment，浏览器部署不必沾这个风险。 */
                desktopChrome && "@container",
                /* 本页顶栏在**圆角卡片内部**（不是窗口级顶栏），所以不挂 .desktop-chrome-bar ——
                   在卡片里再压一条带子会和卡面拉出接缝。窗框层的处理见 components/page-header.tsx。 */
                darkMode ? "bg-transparent text-zinc-100" : "bg-transparent text-zinc-900"
              )}
              style={desktopChrome ? DESKTOP_DRAG : undefined}
            >
              {!sidebarOpen && (
                <div className="flex items-center gap-0.5" style={desktopChrome ? DESKTOP_NO_DRAG : undefined}>
                  <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(true)}
                    className={cn(
                      "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      darkMode ? "text-zinc-300" : "text-zinc-600"
                    )}
                    title="展开侧边栏"
                  >
                    <IconLayoutTwo size={16} strokeWidth={1.9} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={createNewSession}
                    className={cn(
                      "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      darkMode ? "text-zinc-300" : "text-zinc-600"
                    )}
                    title="新建对话"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              )}
              {/* 桌面端：原生菜单已摘除，这几组功能内联到这里（自带 no-drag）。
                  仅在窗口够宽时显示，避免挤占中间的对话总结。
                  ⚠️ 放在展开/新建按钮右边 —— 左侧段本来就窄，菜单优先。 */}
              {desktopChrome && <DesktopWindowMenu className="hidden @min-[520px]:flex" />}
              <div className="flex items-center justify-center gap-2 min-w-0" style={desktopChrome ? DESKTOP_NO_DRAG : undefined}>
                {/* 🚨 模型选择器已迁入底部 sender 的 footer（2026-10-01 用户：
                    「将 ai 模型选择器放入 sender 参考 workbuddy」）——
                    这里**刻意不放第二份**，否则同屏两个模型选择器，改一个另一个不跟着变。 */}
                {/* 🏷️ 对话总结（2026-10-01 用户：「去掉趋势预测，换成对话的总结」）——
                    用**用户当前选择的模型**在对话开始时总结其意图，这句话既是顶栏这里的
                    胶囊文案，也是侧栏「最近对话」列表里的标题（同源，不会两处不一致）。 */}
                {!convSearchOpen && <ConversationSummary summary={convSummary} loading={summarizing} darkMode={darkMode} />}
              </div>
              <div className="flex-1" />
              {/* 顶栏右侧三件套：🔍 对话内搜索 · ↗ 分享对话 · ▣ 折叠/展开预览面板。
                  三枚并排是刻意的 —— ▣ 若跟着面板一起收进窄边，折叠后就再也展不开了。
                  搜索打开时胶囊占满顶栏中段（ConversationSummary 让位）。 */}
              <div className="flex shrink-0 items-center gap-1.5" style={desktopChrome ? DESKTOP_NO_DRAG : undefined}>
                {convSearchOpen ? (
                  <ConversationSearch
                    open
                    onClose={() => setConvSearchOpen(false)}
                    messages={messages}
                    className="flex-1"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setConvSearchOpen(true)}
                    data-conversation-search-trigger
                    title="搜索对话内容"
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500",
                      "transition-colors hover:bg-zinc-900/[0.06] hover:text-zinc-700",
                      "dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-zinc-200",
                    )}
                  >
                    <IconSearch size={16} />
                  </button>
                )}
                <ShareConversationButton messages={messages} sessionId={sessionId} darkMode={darkMode} />
                <PreviewPanelToggle />
              </div>
              {/* 🔔 AI 主动守护通知铃铛：常驻位置已挪到侧栏用户卡右边（用户 2026-09-22 反馈）。
                  侧栏收起时（用户卡整体不可见）才回落到顶栏最右，避免铃铛被藏死。 */}
              {!sidebarOpen && <div style={desktopChrome ? DESKTOP_NO_DRAG : undefined}><GuardianAlertBell /></div>}
              {/* 👤 账户入口统一收口到侧栏底部用户卡（原顶栏 UserAvatarMenu 浮层信息过载，
                  天气/长辈模式等与 AI 助手场景无关 —— 用户 2026-09-16 反馈过度设计，已移除） */}
              {/* 🪟 桌面端窗口控制键：贴右上角（原生 caption button 心智）。 */}
              {desktopChrome && <DesktopWindowControls className="-mr-2" />}
            </div>

            {/* Chat area */}
            <div id="ai-chat-main-container" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
               {messages.length === 0 ? (
                 <MateChatHome
                darkMode={darkMode}
                onSendMessage={(msg) => handleSend(msg)}
                input={input}
                setInput={setInput}
                isLoading={isLoading}
                /* 🚨 composer={false}：本组件不再自带输入框 —— 输入框统一到下方
                   那份唯一的 ChatSenderInput（空态 / 会话态共用同一个实例，
                   见文件底部「唯一 sender」注释块）。思考/研究/权限/语音/模型
                   这些开关本来就在 ChatSenderInput 的工具条上，不再重复传。 */
                composer={false}
              />
             ) : (
              <ChatBubbleList
                messages={messages}
                isLoading={isLoading}
                agentSteps={agentSteps}
                agentStatus={agentStatus}
                showThoughtChain={showThoughtChain}
                darkMode={darkMode}
                aiActionSummary={aiActionSummary}
                latestTaskListContent={latestTaskListContent}
                newMessageBoundary={newMessageBoundary}
                onDeleteMessage={(idx) => setMessages((prev) => prev.filter((_, i) => i !== idx))}
                visionInspection={{
                  isActive: isInspecting,
                  status: visionInspectionStatus,
                  cameraUrl: visionInspectionUrl,
                  cameraId: inspectionCamera,
                  videoElementId: visionVideoElementId,
                  capturedImage: visionCapturedImage,
                }}
                rendererProps={{
                  deviceData,
                  autoExecuteCommands,
                  assistantMode: approvalMode,
                  enableReasoning,
                  /* 病历归档的会话维度（与 chat-bubble-list 提供的消息键拼成幂等键）。
                     ⚠️ 临时对话（__temp__）刻意不传 —— 它的语义就是「不落库、切走即弃」，
                     在用户明确选择不留痕的会话里偷偷写病历会破坏信任。 */
                  diagnosisSessionId: isTempSession(sessionId) ? undefined : sessionId,
                  onOpenStudioFromTask: () => setStudioOpen(true),
                  onOpenStudio,
                  onExecuteCommand: async (c) => { await executeCommands([c]) },
                  onRetryCommand: (errorMsg) => {
                    const retryPrompt = `上一次设备控制失败了。错误信息：${errorMsg}。请重新分析情况并给出正确的控制指令。`
                    handleSend(retryPrompt, [], false, false)
                  },
                  onSendMessage: (text) => handleSend(text),
                  onRespondToCheckpoint: respondToCheckpoint,
                  onSetInput: (text) => setInput(text),
                }}
                onTtsSpeak={enqueueTts}
                footerContent={
                  showSmartPrompts ? (
                    <motion.div
                      className="origin-top-left -mb-10"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                      <SmartPromptsWrapper
                        messages={messages}
                        aiSettings={aiSettings}
                        model={selectedModel || aiSettings?.model}
                        enableReasoning={enableReasoning}
                        darkMode={darkMode}
                        onPick={(text) => handleSend(text)}
                      />
                    </motion.div>
                  ) : undefined
                }
              />
             )}
            {/* 🔥 计划模式状态指示条：用户启用计划模式时显示，提示当前仅调研不执行 */}
            {enablePlanning && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "6px 12px", marginBottom: 6,
                background: darkMode ? "rgba(0,148,86,0.12)" : "rgba(0,148,86,0.08)",
                border: `1px solid ${darkMode ? "rgba(0,148,86,0.25)" : "rgba(0,148,86,0.20)"}`,
                borderRadius: 8,
                fontSize: 12, color: darkMode ? "#b3d9ff" : "#059669",
              }}>
                <span style={{ fontWeight: 500 }}>
                  计划模式中 · AI 将先调研并提交计划，你审批后才会执行
                </span>
                <button
                  onClick={() => setEnablePlanning(false)}
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    color: darkMode ? "#b3d9ff" : "#059669", fontSize: 12,
                    padding: "2px 8px", borderRadius: 6,
                  }}
                >
                  退出
                </button>
              </div>
            )}
            {/* ===== 唯一 sender（2026-10-01 用户：「统一 sender」）=================
                空态与会话态共用这一份实例，恒挂对话区底部 —— 于是两件事同时消失：
                  · 「同屏两个输入框」（原来首页自带一个 + 这里再挂一个）
                  · 「发完第一条消息输入框换了个样子」（原来是两套完全不同的组件）
                欢迎区交给 MateChatHome composer={false}，它现在只管招呼语 /
                推荐问法 / 4 个种植能力入口，一根输入框线都不碰。
                ⚠️ 别再给它加任何 `messages.length > 0 &&` 条件 —— 那正是老 bug 的成因。 */}
            <div style={{ flexShrink: 0 }}>
            {/* 🛑 高风险工具执行前确认条（2026-10-14 用户：「改成在 sender 上方出现确认」）——
                由后端 SSE `tool_confirmation_required` 驱动，浮在输入框**正上方**。
                刻意不塞进消息流：它不是一条对话消息，而是「此刻要不要下发这条指令」的
                瞬时裁决；贴着 sender 才能做到「看完就点」，不必跟随消息滚走后回翻。
                ⚠️ 文案 / 工具名单全由后端决定（见 lib/ai/tool-confirmation.ts），
                   前端在这里不做任何判定，只负责画出来 + 回传哨兵值。
                ⚠️ 不要给它套死宽高：ToastConfirm 是内容驱动的浮层（见组件内注释）。
                🚨 2026-10-16 两次修正（均由用户反馈截图驱动）：
                   ① 「歪了」—— 原先直接挂在 sender 外面那层是**全宽容器**（无宽度约束），
                      胶囊贴在容器最左边、比输入卡凸出约 60px。改为走 ChatSenderInput 的
                      `overlay` 插槽 —— 它渲染在 `.sender-morph-host`（`maxWidth: 1120` +
                      `margin: 0 auto`）**内部**，于是有了与输入卡完全一致的水平基准。
                   ② 「让他居中」—— 在 ① 的基准之上再做水平居中：overlay 里包一层 flex 居中。
                      ⚠️ 居中容器只负责摆位置，⛔ 不给胶囊定宽（宽度仍由 ToastConfirm 的
                      inline-flex 内容驱动 —— 见组件内注释）。
                   ⛔ 别再把它挪回外面自己套宽度约束（会变成第四处 1120 字面量）。 */}
            <ChatSenderInput
                overlay={
                  <div className="flex justify-center">
                    <AnimatePresence initial={false}>
                      {toolConfirm && (
                        <motion.div
                          key={toolConfirm.id}
                          className="mb-2 max-w-full"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                          <ToastConfirm
                            state={toolConfirm.state}
                            initialText={toolConfirm.text}
                            loadingText={TOOL_CONFIRM_RUNNING_TEXT}
                            successText={toolConfirm.successText || TOOL_CONFIRM_DONE_TEXT}
                            resetText={TOOL_CONFIRM_REJECT_TEXT}
                            saveText={TOOL_CONFIRM_APPROVE_TEXT}
                            onReset={() => respondToolConfirm(false)}
                            onSave={() => respondToolConfirm(true)}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                }
                darkMode={darkMode}
                /* ── 常开态（2026-10-22 用户：「ai 助手页面的 sender 就给我正常敞开，
                   不要给我搞那个伸缩，那个伸缩是 copilot 专用的」）──────────────
                   主助手 = 固定展开的沉浸光感卡：多行输入 + 整条业务工具条，
                   没有胶囊折叠、没有高度补间。伸缩动画只活在 Copilot 自己的
                   sender（components/ai/copilot/copilot-sender.tsx）里。 */
                input={input}
                setInput={setInput}
                /* 语音输入（2026-10-24）：本地 sherpa-onnx 识别，说话直接变草稿。
                   与右簇那枚「语音通话」不是一回事 —— 那个是实时对话，这个是语音打字。 */
                enableVoiceInput
                onSend={(text) => handleSend(text)}
                isLoading={isLoading}
                attachments={attachments}
                onSelectFiles={onSelectFiles}
                onRemoveAttachment={removeAttachment}
                onPaste={handlePaste}
                onDropFiles={(files) => void appendFiles(files)}
                enableReasoning={enableReasoning}
                setEnableReasoning={(v) => {
                  if (v) {
                    // 开启思考时：检查当前模型是否支持深度推理
                    const currentModel = selectedModel || aiSettings?.model || ""
                    const supported = checkModelSupportsReasoning(currentModel)
                    if (supported === false) {
                      toast.warning("当前模型不支持深度思考", {
                        description: `模型「${currentModel}」不具备深度推理能力，请到模型库选择支持思考的模型。`,
                        duration: 4500,
                      })
                      return
                    }
                  }
                  setEnableReasoning(v)
                }}
                enablePlanning={enablePlanning}
                setEnablePlanning={(v) => {
                  setEnablePlanning(v)
                  if (v) {
                    // 启用计划模式时，同时启用推理模式
                    const currentModel = selectedModel || aiSettings?.model || ""
                    const supported = checkModelSupportsReasoning(currentModel)
                    if (supported === false) {
                      toast.warning("当前模型不支持深度思考", {
                        description: `计划模式需要深度推理能力，模型「${currentModel}」不支持。`,
                        duration: 4500,
                      })
                      // 阻止启用计划模式
                      return
                    }
                    setEnableReasoning(true)
                  }
                }}
                enableSearch={enableSearch}
                setEnableSearch={setEnableSearch}
                /* 能力 / 模式：4 条种植能力（数据源与落地页首屏同源）+ 「研究」。
                   2026-10-21 工具栏精简后，这一排**不再铺在工具条上**，而是收进
                   sender 的「连接器 → 技能」组；已选中时工具条仍留一枚绿色 × 胶囊。
                   modes 照传 —— 连接器面板与选中态胶囊都靠它渲染。
                   「位置紧张就去掉一两个」的开关仍是这里：往 SENDER_MODES 里少放一条即可。 */
                modes={SENDER_MODES}
                activeMode={activeModeKey}
                setActiveMode={setActiveModeKey}
                availableTools={availableTools}
                onCancel={handleStop}
                approvalMode={approvalMode}
                setApprovalMode={setApprovalMode}
                /* 上下文容量指示器（2026-10-10 用户：「让用户看到当前对话的上下文窗口容量」）——
                   数据来自后端 SSE 的 `context_usage` 事件（已用 token 唯一真相源），
                   窗口容量/输入预算在组件内按当前模型推断，与后端共用同一套口径。 */
                contextMeter={
                  <ContextUsageMeter
                    usage={contextUsage}
                    model={selectedModel || aiSettings?.model || ""}
                    hasMessages={messages.length > 0}
                    darkMode={darkMode}
                  />
                }
                /* 模型选择器：从顶栏搬进 footer 右侧（发送键左边），参考 WorkBuddy 的摆放 ——
                   就在输入框里、手指自然落点，不再跑到页面顶部去够。 */
                modelSelector={
                  <DynamicModelSelector
                    value={selectedModel || aiSettings?.model || ""}
                    onValueChange={handleModelChange}
                  />
                }
                /* ── 工具栏业务化精简（2026-10-21）────────────────────────────────
                   参考图给的是结构，内容按业务切：
                     ＋        → 加素材（照片 / 文件）
                     连接器⌄   → 能力（种植场景技能 + 已装插件 + 内置开关）
                     🛡 权限⌄  → 设备控制的授权档位
                   右簇保留容量 / 模型 / 语音输入 / 发送。
                   skillCount 是「已启用技能数」（内建 + 商店安装），面板里明说
                   「AI 会按问题自动匹配」—— 技能不需要用户逐条挑。 */
                toolbarMode="minimal"
                skillCount={builtinSkills.length + installedStoreSkills.length}
                onManageSkills={() => setStoreOpen(true)}
                onManagePlugins={() => setExploreOpen(true)}
                /* 2026-10-24（用户定）：撤掉「语音通话」入口，语音只留发送键左边那枚
                   「语音输入」（说话转文字进草稿）。VoiceChatModal 相关代码先留着不删 ——
                   入口一旦恢复就能接回来，不必重挖一遍弹窗逻辑。 */
              />
              {/* 免责说明：统一后两种状态都有（之前只有首页有）——对齐参考稿 */}
              <div
                style={{
                  textAlign: "center",
                  fontSize: 11.5,
                  marginTop: -4,
                  paddingBottom: 8,
                  color: darkMode ? "#6b6b74" : "#a1a1aa",
                  letterSpacing: 0.2,
                }}
              >
                内容由 AI 提供，请仔细甄别
              </div>
            </div>
        </div>

        {/* Unified Explore — 覆盖对话区域 */}
        <AnimatePresence>
          {exploreOpen && (
            <UnifiedExplore
              key={exploreKey}
              onClose={() => setExploreOpen(false)}
              darkMode={darkMode}
              sidebarOpen={sidebarOpen}
              onExpandSidebar={() => setSidebarOpen(true)}
              onNewChat={createNewSession}
            />
          )}
        </AnimatePresence>

        {/* 定时任务侧边面板 */}
        <SchedulerSidebarPanel
          open={schedulerPanelOpen}
          onClose={() => setSchedulerPanelOpen(false)}
          darkMode={darkMode}
          sidebarOpen={sidebarOpen}
          onExpandSidebar={() => setSidebarOpen(true)}
          onNewChat={createNewSession}
          onConversationalCreate={(prompt) => {
            // 将预设提示填入输入框并聚焦
            setInput(prompt)
          }}
        />

        {/* 我的空间侧边面板 */}
        <MySpaceSidebarPanel
          open={mySpaceOpen}
          onClose={() => setMySpaceOpen(false)}
          darkMode={darkMode}
          sidebarOpen={sidebarOpen}
          onExpandSidebar={() => setSidebarOpen(true)}
          onNewChat={createNewSession}
          items={spaceReports.map(r => ({ ...r, category: r.type === "report" ? "creation" : "file" }))}
          onDelete={(id) => deleteSpaceReport(id)}
          onToggleFavorite={(id) => toggleSpaceReportFavorite(id)}
          onItemsChange={() => {
            // 触发后端重新拉取（如有）
            void refreshSpaceReports()
          }}
        />

        {/* 知识库侧边面板 */}
        <KnowledgeSidebarPanel
          open={knowledgeOpen}
          onClose={() => setKnowledgeOpen(false)}
          darkMode={darkMode}
          sidebarOpen={sidebarOpen}
          onExpandSidebar={() => setSidebarOpen(true)}
          onNewChat={createNewSession}
          onInsertToChat={(item) => {
            // 将知识条目作为上下文插入到当前输入框
            const mention = `@知识库:${item.title}`
            setInput((prev) => (prev ? `${prev}\n${mention} ` : `${mention} `))
            setKnowledgeOpen(false)
            toast.success(`已引用《${item.title}》，AI 将基于此内容回答`)
          }}
        />

        {/* 病历史侧边面板 —— 诊断沉淀 + 复诊闭环（与「我的空间 / 知识库」同一块区域，靠 openSidebarPanel 互斥） */}
        <MedicalRecordsPanel
          open={medicalRecordsOpen}
          onClose={() => setMedicalRecordsOpen(false)}
          darkMode={darkMode}
          sidebarOpen={sidebarOpen}
          onExpandSidebar={() => setSidebarOpen(true)}
          onNewChat={createNewSession}
        />

        {/* 设备接入实时面板 — DEVICE_FORGE 卡片出现时自动弹出，
            展示 AI 生成设备接入配置的步骤/失败原因与可编辑表单 */}
        <DeviceForgeSidebarPanel
          darkMode={darkMode}
          sidebarOpen={sidebarOpen}
          onSendMessage={(text) => handleSend(text)}
        />

        {/* 报告查看 Drawer — 点击"查看报告"按钮真正展示报告内容 */}
        <Drawer
          open={!!reportData}
          onClose={() => setReportData(null)}
          placement="right"
          width="min(520px, 92vw)"
          destroyOnClose
          closeIcon={<X size={14} strokeWidth={2} style={{ color: '#8f959e' }} />}
          title={
            <Flex align="center" gap={8}>
              <IconFileText size={15} strokeWidth={2} style={{ color: '#059669' }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(0,0,0,0.88)' }}>
                {reportData?.title || "AI 智能生成报告"}
              </span>
            </Flex>
          }
          styles={{
            body: { padding: 0, background: darkMode ? '#0A0A0A' : '#fafafa' },
            header: {
              padding: '12px 16px',
              borderBottom: `1px solid ${darkMode ? '#27272a' : '#F4F4F5'}`,
            },
          }}
        >
          {reportData && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* ============ 内容区 ============ */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: 'auto',
                  padding: '20px 24px',
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: darkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
                }}
                className="berry-report-content"
                dangerouslySetInnerHTML={{ __html: sanitizeReportHtml(reportData.html) }}
              />

              {/* ============ 底部操作条 ============ */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '10px 16px',
                  borderTop: `1px solid ${darkMode ? '#27272a' : '#F4F4F5'}`,
                  background: darkMode ? '#0f0f10' : '#fff',
                }}
              >
                {/* 左侧：辅助操作 */}
                <Flex gap={4} align="center">
                  <Tooltip title="下载 HTML">
                    <AntButton
                      type="text"
                      size="small"
                      icon={<IconDownload size={14} strokeWidth={2} />}
                      onClick={() => {
                        const blob = new Blob([reportData.html], { type: 'text/html;charset=utf-8' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `${reportData.title}_${reportData.timestamp}.html`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                        toast.success("HTML 已下载")
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="下载 PDF">
                    <AntButton
                      type="text"
                      size="small"
                      icon={<IconFileText size={14} strokeWidth={2} />}
                      onClick={async () => {
                        const toastId = toast.loading("正在生成 PDF...")
                        try {
                          const htmlToImage = await import('html-to-image')
                          const { default: jsPDF } = await import('jspdf')

                          // 创建临时容器渲染报告 HTML，避免受 Drawer 内样式干扰
                          const container = document.createElement('div')
                          container.style.cssText = 'position:absolute;left:-9999px;top:0;width:794px;padding:40px;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;'
                          container.innerHTML = reportData.html
                          document.body.appendChild(container)

                          try {
                            const dataUrl = await htmlToImage.toPng(container, { backgroundColor: '#ffffff' })

                            const img = new window.Image()
                            img.src = dataUrl
                            await new Promise((resolve) => { img.onload = resolve })

                            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
                            const imgWidth = 210 // A4 width in mm
                            const pageHeight = 297 // A4 height in mm
                            const imgHeight = (img.height * imgWidth) / img.width
                            let heightLeft = imgHeight
                            let position = 0

                            pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight)
                            heightLeft -= pageHeight

                            while (heightLeft >= 0) {
                              position = heightLeft - imgHeight
                              pdf.addPage()
                              pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight)
                              heightLeft -= pageHeight
                            }

                            pdf.save(`${reportData.title}_${reportData.timestamp}.pdf`)
                            toast.success("PDF 已下载", { id: toastId })
                          } finally {
                            document.body.removeChild(container)
                          }
                        } catch (error) {
                          console.error('PDF生成错误:', error)
                          toast.error("PDF 下载失败", { id: toastId })
                        }
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="新窗口打开">
                    <AntButton
                      type="text"
                      size="small"
                      icon={<IconLinkOut size={14} strokeWidth={2} />}
                      onClick={() => {
                        const w = window.open('', '_blank')
                        if (w) {
                          w.document.write(reportData.html)
                          w.document.close()
                        }
                      }}
                    />
                  </Tooltip>
                </Flex>

                {/* 右侧：主操作 */}
                <AntButton
                  type="primary"
                  size="small"
                  icon={<IconFolderUpload size={13} strokeWidth={2} />}
                  onClick={async () => {
                    const exists = spaceReports.some(
                      (r) => r.title === reportData.title && r.html === reportData.html
                    )
                    if (exists) {
                      toast.info("该报告已在我的空间中")
                      return
                    }
                    await saveSpaceReport({
                      title: reportData.title,
                      html: reportData.html,
                      source: "chat",
                      type: "report"
                    })
                  }}
                >
                  保存到我的空间
                </AntButton>
              </div>
            </div>
          )}
        </Drawer>
            </div>

            {/* ===== 右列：文档预览停靠面板（三段式的第三段） =====
                平时 width:0 完全收起；卡片点「预览」→ 总线通知 → 对话列变窄、本列展开。
                它必须放在「内容层」的**外面**（作为卡片容器的第二个子节点），
                否则会被对话列的 flex:1 压扁，也盖不到整卡高度。 */}
            <DocumentPreviewDock />
          </div>
        </AntLayout.Content>
      </AntLayout>
    </div>

      {/* 浏览器活动窗口 */}
      {/* 浏览器活动窗口 - 仅在全屏模式下渲染，小窗口预览不需要此组件 */}
      <BrowserActivity url={browsingUrl || ""} isOpen={!!browsingUrl && !studioOpen} onClose={() => setBrowsingUrl(null)} />

      {/* 搜索面板（点击顶部放大镜弹出） */}
      <AnimatePresence>
        {searchPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setSearchPanelOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 300,
              background: "rgba(0,0,0,0.2)", backdropFilter: "blur(calc(2px * var(--dc-mat-scale, 1)))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 560, maxWidth: "calc(100vw - 48px)",
                background: darkMode ? "#1c1c1f" : "#fff",
                borderRadius: 16, overflow: "hidden",
                boxShadow: darkMode
                  ? "0 20px 50px rgba(0,0,0,0.5)"
                  : "0 20px 50px rgba(0,0,0,0.12)",
              }}
            >
              {/* 标签栏 */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 20px 0",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  {([
                    { key: "history", label: "历史对话" },
                    { key: "space", label: "我的空间" },
                    { key: "agent", label: "智能体" },
                  ] as const).map(t => {
                    const active = searchTab === t.key
                    return (
                      <button key={t.key} onClick={() => setSearchTab(t.key)}
                        style={{
                          position: "relative", padding: "4px 0 10px",
                          fontSize: 14, fontWeight: active ? 600 : 400,
                          color: active
                            ? (darkMode ? "#e4e4e7" : "#18181B")
                            : (darkMode ? "#71717a" : "#A1A1AA"),
                          background: "none", border: "none", cursor: "pointer",
                        }}
                      >
                        {t.label}
                        {active && (
                          <span style={{
                            position: "absolute", left: "50%", bottom: 0,
                            transform: "translateX(-50%)",
                            width: 20, height: 2, borderRadius: 1,
                            background: darkMode ? "#e4e4e7" : "#18181B",
                          }} />
                        )}
                      </button>
                    )
                  })}
                </div>
                <button onClick={() => setSearchPanelOpen(false)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center",
                    width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent",
                    cursor: "pointer", color: darkMode ? "#a1a1aa" : "#71717A" }}
                  title="关闭"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 搜索输入框 */}
              <div style={{ padding: "14px 20px 10px" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 12px",
                  border: darkMode ? "1px solid #3f3f46" : "1px solid #e4e4e7",
                  borderRadius: 10,
                }}>
                  <Search size={15} style={{ color: darkMode ? "#a1a1aa" : "#A1A1AA" }} />
                  <input autoFocus value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        // 简单回车跳转第一个匹配
                        const first = getFilteredItems()[0]
                        if (first) handlePickSearchItem(first)
                      }
                    }}
                    placeholder="搜索"
                    style={{
                      flex: 1, fontSize: 14, outline: "none", border: "none",
                      background: "transparent", color: darkMode ? "#e4e4e7" : "#18181B",
                    }}
                  />
                </div>
              </div>

              {/* 列表 */}
              <div style={{ maxHeight: 360, overflowY: "auto", padding: "0 12px 12px" }}>
                {searchTab === "history" && getFilteredItems().length === 0 && (
                  <div style={{ padding: "32px 0", textAlign: "center", color: darkMode ? "#71717a" : "#A1A1AA", fontSize: 13 }}>
                    {searchKeyword ? "没有匹配的对话" : "暂无历史对话"}
                  </div>
                )}
                {searchTab === "space" && getFilteredItems().length === 0 && (
                  <div style={{ padding: "32px 0", textAlign: "center", color: darkMode ? "#71717a" : "#A1A1AA", fontSize: 13 }}>
                    {searchKeyword ? "没有匹配的空间文件" : "暂无空间文件"}
                  </div>
                )}
                {searchTab === "agent" && (
                  <div style={{ padding: "32px 0", textAlign: "center", color: darkMode ? "#71717a" : "#A1A1AA", fontSize: 13 }}>
                    智能体功能开发中
                  </div>
                )}
                {getFilteredItems().map((item: any) => (
                  <div key={item.id} onClick={() => handlePickSearchItem(item)}
                    style={{
                      padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                      color: darkMode ? "#e4e4e7" : "#3F3F46", fontSize: 13,
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "#27272a" : "#f4f4f5"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {item.title}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <VoiceChatModal
        open={voiceChatOpen}
        onClose={() => setVoiceChatOpen(false)}
        onSendMessage={handleVoiceChatMessage}
        aiSettings={aiSettings}
      />

      {/* Skill Store Overlay */}
      <AnimatePresence>
        {storeOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[200] flex flex-col pt-12"
            style={{ background: "var(--ant-color-bg-container, #fff)" }}
          >
            <div className="absolute top-6 left-8 z-[210]">
               <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setStoreOpen(false)}
                className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 group"
               >
                 <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                 <span className="font-bold tracking-tight">退出商店</span>
               </Button>
            </div>
            <div className="flex-1 overflow-hidden">
               <SkillStore />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Settings Dialog */}
      <AISettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialSection={settingsSection}
        user={user}
        persona={selectedPersona}
        onPersonaChange={(id: string) => {
          setSelectedPersona(id)
          if (typeof window !== 'undefined') {
            localStorage.setItem('ai-persona', id)
          }
        }}
        onSave={(settings) => {
          setAiSettings(settings)
        }}
        onVoiceSettingsChange={(voice) => {
          setIsTTSEnabled(voice.readAloud)
        }}
      />

      {/* 配额耗尽 / 升级提示弹窗（WorkBuddy 产品语言：扁平 · metric card · 深色主按钮） */}
      <Modal
        open={showExhaustedDialog}
        onCancel={() => setShowExhaustedDialog(false)}
        footer={null}
        width={380}
        centered
        title={null}
        closable={false}
        className="!rounded-2xl overflow-hidden [&_.ant-modal-content]:!rounded-2xl [&_.ant-modal-content]:overflow-hidden [&_.ant-modal-content]:!shadow-[0_16px_48px_rgba(15,23,42,0.14)]"
        styles={{
          body: { padding: "24px 24px 20px" },
        }}
      >
        {/* 头部：图标 chip + 标题 + 会员徽章（左对齐，产品卡片式） */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
            {quotaInfo?.reason === 'membership_required' ? (
              <IconLock className="w-5 h-5 text-rose-500 dark:text-rose-400" />
            ) : (
              <IconWallet className="w-5 h-5 text-rose-500 dark:text-rose-400" />
            )}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
              {quotaInfo?.reason === 'membership_required' ? '会员专属功能' : '积分不足'}
            </h3>
            {creditInfo?.membership === 'plus' || creditInfo?.membership === 'pro' ? (
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[11px] font-semibold text-white ${
                  creditInfo?.membership === 'plus' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              >
                <IconCrown className="w-2.5 h-2.5" />
                {creditInfo?.membership.toUpperCase()}
              </span>
            ) : null}
          </div>
        </div>

        {/* 描述：一句讲清现状 + 出路 */}
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-3">
          {quotaInfo?.reason === 'membership_required'
            ? '当前账号暂未开通会员，升级 Pro / Plus 后即可继续使用 AI 功能。'
            : '当前余额不足以发起新一轮对话，充值后立即恢复，或等待每月 1 日自动刷新。'}
        </p>

        {/* metric 双卡：label 在上、数字在下（tabular-nums 等宽数字） */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/70 px-3.5 py-3">
            <div className="text-[12px] text-zinc-500 dark:text-zinc-400">剩余积分</div>
            <div className="text-[20px] leading-tight font-semibold text-zinc-900 dark:text-zinc-50 mt-1 [font-variant-numeric:tabular-nums]">
              {(creditInfo?.totalRemaining ?? 0).toFixed(2)}
            </div>
          </div>
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/70 px-3.5 py-3">
            <div className="text-[12px] text-zinc-500 dark:text-zinc-400">本月用量</div>
            <div className="text-[20px] leading-tight font-semibold text-zinc-900 dark:text-zinc-50 mt-1 [font-variant-numeric:tabular-nums]">
              {(creditInfo?.monthlyUsed ?? 0).toFixed(0)}
              <span className="text-[13px] font-normal text-zinc-400 dark:text-zinc-500">
                {' / '}{(creditInfo?.monthlyQuota ?? 0).toFixed(0)}
              </span>
            </div>
            <div className="h-[3px] w-full rounded-full bg-zinc-200 dark:bg-zinc-700 mt-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-rose-500 dark:bg-rose-400"
                style={{
                  width: `${Math.min(
                    100,
                    (creditInfo?.monthlyQuota ?? 0) > 0
                      ? ((creditInfo?.monthlyUsed ?? 0) / creditInfo!.monthlyQuota) * 100
                      : 0
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* 刷新提示 */}
        <div className="flex items-center gap-1.5 mt-3 text-[12px] text-zinc-400 dark:text-zinc-500">
          <IconRefresh className="w-3 h-3" />
          <span>积分每月 1 日自动刷新</span>
        </div>

        {/* 按钮：深色主按钮 + 描边次按钮（产品标准层级） */}
        <div className="flex items-center gap-2 mt-5">
          <AntButton
            type="primary"
            block
            className="!h-10 !rounded-[10px] !border-none !text-white !text-[14px] !font-medium !bg-zinc-900 hover:!bg-zinc-800 dark:!bg-zinc-100 dark:!text-zinc-900 dark:hover:!bg-zinc-200 !shadow-none"
            onClick={() => {
              setShowExhaustedDialog(false)
              router.push('/subscription')
            }}
          >
            {quotaInfo?.reason === 'membership_required' ? '升级会员' : '充值积分'}
          </AntButton>
          <AntButton
            className="!h-10 !rounded-[10px] !px-5 !text-[14px] !border-zinc-200 dark:!border-zinc-700 !text-zinc-600 dark:!text-zinc-300 !shadow-none"
            onClick={() => setShowExhaustedDialog(false)}
          >
            我知道了
          </AntButton>
        </div>
      </Modal>


    </>
    </App>
    </ConfigProvider>
  )
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
  toast.success("已复制到剪贴板")
}

/** 用户面板（点击头像触发的 Popover 内容） */
function UserPanelContent({
  user,
  creditInfo,
  darkMode,
  router,
  setShowUserPopover,
  setSettingsOpen,
  setSettingsSection,
  handleUserMenuClick,
  toggleDarkMode,
}: {
  user: UserPublic | null
  creditInfo: {
    membership?: string
    monthlyRemaining: number
    monthlyUsed: number
    monthlyQuota: number
    balance: number
    totalRemaining: number
    canUse: boolean
    reason?: string
  } | null
  darkMode: boolean
  router: ReturnType<typeof useRouter>
  setShowUserPopover: (v: boolean) => void
  setSettingsOpen: (v: boolean) => void
  setSettingsSection: (s: SettingsSection) => void
  handleUserMenuClick: (e: { key: string }) => void
  toggleDarkMode: () => void
}) {
  const tier = (creditInfo?.membership || user?.membership || 'free').toLowerCase()
  const tierLabel = tier === 'plus' ? 'Plus 版' : tier === 'pro' ? 'Pro 版' : '体验版'
  const close = () => setShowUserPopover(false)
  const tx = darkMode ? '#a0a0a8' : '#71717A'

  return (
    <div style={{ background: darkMode ? '#1f1f23' : '#ffffff' }}>
      {/* Header：头像 + 用户名 + 关闭 */}
      <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AntAvatar size={36} src={user?.avatar_url} style={{ backgroundColor: '#ECFDF5', color: '#059669', flexShrink: 0 }}>
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </AntAvatar>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: darkMode ? '#f4f4f5' : '#18181B' }}>
              {user?.username || '未登录'}
            </div>
            <div style={{ fontSize: 11.5, color: tx, marginTop: 2 }}>
              {user?.email || (user?.uid ? `UID: ${user.uid.slice(0, 8)}` : '')}
            </div>
          </div>
        </div>
        <AntButton type="text" size="small" icon={<X size={14} />} onClick={close} />
      </div>

      {/* 体验版 / Pro / Plus + 升级按钮（桌面端 BYOK：本地买断，无会员/积分概念） */}
      {!IS_DESKTOP_APP && (
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: tier === 'plus' ? '#f0b429' : tier === 'pro' ? '#059669' : '#71717A',
          }}
        >
          {tierLabel}
        </span>
        {tier !== 'plus' && (
          <AntButton
            type="primary"
            size="small"
            icon={<IconCrown size={12} />}
            onClick={() => { close(); router.push('/subscription') }}
          >
            升级
          </AntButton>
        )}
      </div>
      )}

      {/* 积分余额（厚实卡片：总额 / 本月剩余 / 充值余额 / 进度条；桌面端 BYOK 不显示） */}
      {!IS_DESKTOP_APP && (
      <div style={{ padding: '10px 12px' }}>
        <div
          onClick={() => { close(); router.push('/subscription') }}
          onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? '#27272c' : '#f4f4f5' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = darkMode ? '#25262b' : '#fafafa' }}
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: darkMode ? '#25262b' : '#fafafa',
            border: darkMode ? '0.5px solid #34353a' : '0.5px solid #e4e4e7',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconWallet size={14} style={{ color: tx }} />
              <span style={{ fontSize: 12.5, color: tx }}>积分余额</span>
            </div>
            <IconRight size={12} style={{ color: tx }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
            <span style={{
              fontSize: 22, fontWeight: 600,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              color: darkMode ? '#059669' : '#059669',
              letterSpacing: -0.3,
            }}>
              {(creditInfo?.totalRemaining ?? 0).toFixed(2)}
            </span>
            <span style={{ fontSize: 12, color: tx }}>积分</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: darkMode ? '#3a3a40' : '#e4e4e7', overflow: 'hidden', marginBottom: 8 }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, (creditInfo?.monthlyQuota ?? 0) > 0 ? ((creditInfo?.monthlyUsed ?? 0) / creditInfo!.monthlyQuota) * 100 : 0)}%`,
              background: '#059669',
              borderRadius: 2, transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: tx }}>
            <span>本月剩余 <strong style={{ color: darkMode ? '#e4e4e7' : '#3F3F46', fontWeight: 500 }}>{(creditInfo?.monthlyRemaining ?? 0).toFixed(1)}</strong></span>
            <span>充值 <strong style={{ color: darkMode ? '#e4e4e7' : '#3F3F46', fontWeight: 500 }}>+{(creditInfo?.balance ?? 0).toFixed(2)}</strong></span>
          </div>
        </div>
      </div>
      )}

      {/* 设置 / 管理设置 / 外观 / 帮助与反馈 / 检查更新 */}
      <div style={{ padding: '4px 6px' }}>
        <PanelRow
          darkMode={darkMode}
          icon={<SettingsIcon size={15} />}
          label="设置"
          onClick={() => { close(); setSettingsSection("personalization"); setSettingsOpen(true) }}
        />
        {/* 桌面端：管理设置 —— 打开同一套设置弹窗并直达「AI 服务」分区
            （服务商增删改 / API Key / 模型清单 / 默认模型；知识库与积分等运维配置
             收在该分区内的「高级设置」里。老 key "model" 仍兼容，见 SECTION_ALIAS） */}
        {IS_DESKTOP_APP && (
          <PanelRow
            darkMode={darkMode}
            icon={<IconTool size={15} />}
            label="管理设置"
            onClick={() => { close(); setSettingsSection("ai-services"); setSettingsOpen(true) }}
          />
        )}
        <PanelRow
          darkMode={darkMode}
          icon={<IconBackgroundColor size={15} />}
          label="外观"
          right={
            <Segmented
              size="small"
              value={darkMode ? 'dark' : 'light'}
              onChange={(v) => {
                if ((v === 'dark') !== darkMode) toggleDarkMode()
              }}
              options={[
                { label: '浅色', value: 'light' },
                { label: '深色', value: 'dark' },
              ]}
              style={{ fontSize: 11 }}
            />
          }
        />
        <PanelRow
          darkMode={darkMode}
          icon={<IconHelp size={15} />}
          label="帮助与反馈"
          onClick={() => { close(); router.push('/help') }}
        />
        {/* 检查更新：桌面端真调主进程 electron-updater（2026-09-17 修复：此前是写死"已是最新版本"的假按钮，
            有新版本也只会误报，用户无法主动触发检查）；Web 端无桌面桥，引导刷新即可 */}
        <PanelRow
          darkMode={darkMode}
          icon={<IconRefresh size={15} />}
          label="检查更新"
          onClick={() => {
            close();
            if (!IS_DESKTOP_APP) {
              toast.info("在线更新为桌面端功能，网页版刷新页面即可获取最新版本");
              return;
            }
            const tid = toast.loading("正在检查更新…");
            window.stravisionDesktop
              ?.checkForUpdate()
              .then((r) => {
                if (!r?.ok) {
                  toast.error(`检查更新失败：${r?.error ?? "未知错误"}`, { id: tid });
                  return;
                }
                if (r.ready) {
                  // 新版本已下载完成（用户可能错过了弹框）→ 直接给"立即安装"
                  toast.success(`新版本 v${r.latestVersion ?? ""} 已下载完成，可立即安装`, {
                    id: tid,
                    duration: 20000,
                    action: { label: "立即重启安装", onClick: () => { void window.stravisionDesktop?.installUpdate() } },
                  });
                } else if (r.latestVersion && r.latestVersion !== r.currentVersion) {
                  toast.success(`发现新版本 v${r.latestVersion}，正在后台下载，完成后会弹出安装提示`, { id: tid, duration: 10000 });
                } else {
                  toast.success(`已是最新版本（v${r.currentVersion ?? ""}）`, { id: tid });
                }
              })
              .catch((e: unknown) => {
                const msg = e instanceof Error ? e.message : String(e);
                toast.error(`检查更新失败：${msg}`, { id: tid });
              });
          }}
        />
      </div>

      {/* 退出登录 */}
      <div style={{ padding: '8px 14px 12px' }}>
        <AntButton
          block
          icon={<LogOut size={14} />}
          onClick={() => { close(); handleUserMenuClick({ key: 'logout' }) }}
        >
          退出登录
        </AntButton>
      </div>
    </div>
  )
}

/** 用户面板单行（避免每次 render 重建组件） */
function PanelRow({
  darkMode,
  icon,
  label,
  right,
  onClick,
}: {
  darkMode: boolean
  icon: React.ReactNode
  label: string
  right?: React.ReactNode
  onClick?: () => void
}) {
  const tx = darkMode ? '#a0a0a8' : '#71717A'
  const hoverBg = darkMode ? '#27272c' : '#f4f4f5'
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: 8, cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = hoverBg }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: tx, display: 'flex' }}>{icon}</span>
        <span style={{ fontSize: 13, color: darkMode ? '#e4e4e7' : '#27272a' }}>{label}</span>
      </div>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: tx }}>{right}</div>}
    </div>
  )
}
