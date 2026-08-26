"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Image } from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { ConfigProvider, App, theme, Segmented, Button as AntButton, Menu, Avatar as AntAvatar, Layout as AntLayout, Space, Tooltip, Dropdown, Modal, Input, Drawer, Flex } from "antd"
import type { ConversationsProps } from "@ant-design/x"
import { Conversations } from "@ant-design/x"
import zhCN from "antd/locale/zh_CN"
import type { UserPublic } from "@/lib/db/user-service"
import { Mic, MicOff, RotateCcw, Copy, Trash, SquarePen, Library, CircleHelp, PanelLeftClose, PanelLeftOpen, CheckCircle2, AlertCircle, Loader2, Globe, ImageIcon, FileText, Sun, Activity, Sprout, Zap, ArrowUpRight, Wand2, Download, Phone, Play, Pause, Volume2, VolumeX, Camera, Signal, Cpu, Home, Brain, House, Compass, MessageSquare, ChevronUp, ChevronRight, Circle, Clock, Info, MoreHorizontal, Pencil, Pin, Share, List, FolderInput, Trash2, FolderOpen, Moon, Eye, CalendarClock, ExternalLink, Maximize2, BookOpen } from "lucide-react";
import { AtSign } from "@/components/animate-ui/icons/at-sign";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandInput as CommandInputUI, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false })
const MessageWithReport = dynamic(() => import("@/components/ai/message-with-report").then(mod => ({ default: mod.MessageWithReport })), { ssr: false })

// 额外的重型组件 — 延迟加载
const SkillStore = dynamic(() => import("@/components/ai/skill-store").then(m => ({ default: m.SkillStore })), { ssr: false })
const UnifiedExplore = dynamic(() => import("@/components/explore/unified-explore").then(m => ({ default: m.UnifiedExplore })), { ssr: false })
const VoiceChatModal = dynamic(() => import("@/components/ai/voice-chat-modal").then(m => ({ default: m.VoiceChatModal })), { ssr: false })
const LiveStreamPlayer = dynamic(() => import("@/components/live-stream-player").then(m => ({ default: m.LiveStreamPlayer })), { ssr: false })
const WebPreview = dynamic(() => import("@/components/ai/web-preview").then(m => ({ default: m.WebPreview })), { ssr: false })
const DeviceControlCard = dynamic(() => import("@/components/ai/device-control-card").then(m => ({ default: m.DeviceControlCard })), { ssr: false })
const HTMLPreviewCard = dynamic(() => import("@/components/ai/html-preview-card").then(m => ({ default: m.HTMLPreviewCard })), { ssr: false })
const BrowserActivity = dynamic(() => import("@/components/ai/browser-activity").then(m => ({ default: m.BrowserActivity })), { ssr: false })

import { Settings as SettingsIcon } from "@/components/animate-ui/icons/settings";
import { Plus } from "@/components/animate-ui/icons/plus";
import { LogOut } from "@/components/animate-ui/icons/log-out";
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
import { toast } from "sonner"
// Toaster 已在全局 layout.tsx 的 ToasterWrapper 中提供，此处不再重复创建
import { motion, AnimatePresence } from "framer-motion"
import { useUserReports, type LocalSpaceReport } from "@/hooks/use-user-reports"

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
import { filterDisabledFeatures } from '@/lib/ai/prompt-templates'

// BrowserActivity, WebPreview — 已改为 dynamic import

// DeviceControlCard, HTMLPreviewCard — 已改为 dynamic import
import { AIControlBorderEffect } from "@/components/ai/ai-control-border-effect"
import { DynamicModelSelector } from "@/components/ai/dynamic-model-selector"
import { PredictiveInsightCard } from "@/components/ai/predictive-insight-card"
import { GuardianAlertBell } from "@/components/ai/guardian-alert-bell"
import { useAIModels } from "@/lib/hooks/use-ai-models"

// LiveStreamPlayer — 已改为 dynamic import
import { ModernHomeView } from "@/components/ai/modern-home-view"
import { MateChatHome } from "@/components/ai/matechat-home"
import { CapabilitiesCard } from "@/components/ai/capabilities-card"
import type { Citation, TaskItemModel, TaskModel, Message, AISettings, SessionMeta, ChatAttachment } from "@/app/ai-assistant/types"
import { isVLMModel, getCanonicalSignature, isIoTCommand as checkIoTCommand, filterDisabledFeatures as filterFeatures, DEVICE_NAMES, MCP_SERVER_TOOLS, getGreetingByHour } from "@/app/ai-assistant/_utils/helpers"
import { DynamicTaskPlanner } from "@/app/ai-assistant/_components/dynamic-task-planner"
import { PremiumReportLoader } from "@/app/ai-assistant/_components/premium-report-loader"
import { ChatMessageRenderer } from "@/app/ai-assistant/_components/chat-message-renderer"
import { ChatBubbleList } from "@/app/ai-assistant/_components/chat-bubble-list"
import { ChatSenderInput } from "@/app/ai-assistant/_components/chat-sender-input"
import { useTTSEngine } from "@/app/ai-assistant/_hooks/use-tts-engine"
import { handleDownloadPDF, createSelectFilesHandler, createPasteHandler, handleSettingsSave as saveSettings, copyMessageText } from "@/app/ai-assistant/_utils/message-actions"
import { type AIActionSummary } from "@/app/ai-assistant/_components/ai-action-summary"

/** 从消息列表中提取最后一条用户/助手消息，包装 SmartPrompts 避免每次重渲染重新计算。 */
function SmartPromptsWrapper({
  messages,
  aiSettings,
  darkMode,
  onPick,
}: {
  messages: Message[]
  aiSettings: AISettings | null
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
      aiSettings={aiSettings}
      darkMode={darkMode}
      onPick={onPick}
      fallback={[
        { key: "f1", description: "对上面的内容做进一步分析" },
        { key: "f2", description: "当前环境适合采取什么设备操作" },
        { key: "f3", description: "将分析结果生成可视化报告" },
      ]}
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

export default function AIAssistantPage() {
  return (
    <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-zinc-950 text-[#1677ff]">Loading AI Assistant...</div>}>
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
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  const [enableSearch, setEnableSearch] = useState(false)
  const [searchPanelOpen, setSearchPanelOpen] = useState(false)
  // 提供商/模型的推理能力缓存：{ [modelId]: boolean | undefined }
  const [modelSupportsReasoning, setModelSupportsReasoning] = useState<Record<string, boolean | undefined>>({})
  // 记录是否已尝试加载（避免重复请求）
  const [providerConfigLoaded, setProviderConfigLoaded] = useState(false)
  const [searchTab, setSearchTab] = useState<"history" | "space" | "agent">("history")
  const [searchKeyword, setSearchKeyword] = useState("")
  const [enableReasoning, setEnableReasoning] = useState(false)
  // 用 useAIModels 拉取一次 providers 配置（与下拉框共用同一份数据），保证 modelSupportsReasoning 与下拉框完全一致
  const { config: aiConfig, loading: aiConfigLoading, refetch: aiConfigRefetch, getDefaultModelId } = useAIModels()
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

  // ===== 智能提示集自动隐藏逻辑 =====
  const [showSmartPrompts, setShowSmartPrompts] = useState(false)
  const hidePromptsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const SMART_PROMPTS_HIDE_DELAY_MS = 8000
  const clearHidePromptsTimer = () => {
    if (hidePromptsTimerRef.current) {
      clearTimeout(hidePromptsTimerRef.current)
      hidePromptsTimerRef.current = null
    }
  }

  // ===== 思考链可见性（完成后保留，不自动消失） =====
  const [showThoughtChain, setShowThoughtChain] = useState(false)

  // 卸载时清理所有计时器
  useEffect(() => {
    return () => {
      if (hidePromptsTimerRef.current) clearTimeout(hidePromptsTimerRef.current)
    }
  }, [])

  // 监听最后一条消息：如果是 assistant 且不在 loading / agent status 中，则显示并开始倒计时
  useEffect(() => {
    if (isLoading || agentStatus) {
      clearHidePromptsTimer()
      setShowSmartPrompts(false)
      return
    }
    const last = messages[messages.length - 1]
    if (!last || last.role !== "assistant") {
      setShowSmartPrompts(false)
      return
    }
    setShowSmartPrompts(true)
    clearHidePromptsTimer()
    hidePromptsTimerRef.current = setTimeout(() => {
      setShowSmartPrompts(false)
      hidePromptsTimerRef.current = null
    }, SMART_PROMPTS_HIDE_DELAY_MS)
    return clearHidePromptsTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isLoading, agentStatus])

  // 用户在输入框打字时立刻隐藏
  useEffect(() => {
    if (input.trim().length > 0) {
      clearHidePromptsTimer()
      setShowSmartPrompts(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input])

  // 悬停时暂停倒计时，移开后重新计时
  const onPromptsHoverStart = () => clearHidePromptsTimer()
  const onPromptsHoverEnd = () => {
    if (!showSmartPrompts) return
    clearHidePromptsTimer()
    hidePromptsTimerRef.current = setTimeout(() => {
      setShowSmartPrompts(false)
      hidePromptsTimerRef.current = null
    }, SMART_PROMPTS_HIDE_DELAY_MS)
  }

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
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("darkMode") === "true"
    }
    return false
  })

  // 同步 dark 类到 html 根节点以触发 tailwind 的 dark: 样式
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (darkMode) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
  }, [darkMode])

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
      setSessionId(item.id)
      loadSessionMessages(item.id as any)
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
    return {
      key,
      label: (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", paddingRight: 2 }}>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>{label}</span>
          {batchMode && (
            <input type="checkbox" checked={batchSelected.has(key)} onChange={() => toggleBatchSelect(key)}
              onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
              style={{ marginRight: 4, cursor: "pointer" }}
            />
          )}
          <Dropdown trigger={["click"]} placement="bottomRight"
            menu={{
              items: [
                { key: "rename", icon: <Pencil size={13} />, label: "重命名" },
                { key: "pin", icon: <Pin size={13} />, label: "置顶此对话" },
                { type: "divider" },
                { key: "share", icon: <Share size={13} />, label: "分享此对话" },
                { key: "batch", icon: <List size={13} />, label: batchMode ? "退出批量管理" : "批量管理" },
                { type: "divider" },
                {
                  key: "move", icon: <FolderInput size={13} />, label: "移动到分组",
                  children: [
                    ...groups.map(g => ({ key: `move-${g.id}`, label: g.name })),
                    { type: "divider" },
                    { key: "move-none", label: "移出分组（回到最近对话）" },
                  ],
                },
                { key: "export", icon: <Download size={13} />, label: "导出对话",
                  children: [
                    { key: "export-md", label: "导出为 Markdown" },
                    { key: "export-json", label: "导出为 JSON" },
                    { key: "export-txt", label: "导出为文本" },
                  ],
                },
                { type: "divider" },
                { key: "delete", icon: <Trash2 size={13} />,
                  label: <span style={{ color: "#ef4444" }}>删除此对话</span>, danger: true,
                },
              ],
              onClick: (menuInfo) => handleConvMenuClick(menuInfo as any, key),
            }}
          >
            <button onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
              className="conv-more-btn"
              style={{ display: "flex", alignItems: "center", justifyContent: "center",
                width: 22, height: 22, borderRadius: 5, border: "none", background: "transparent",
                cursor: "pointer", color: darkMode ? "#71717a" : "#c4c8cf", opacity: 0,
                transition: "opacity 0.15s, background 0.15s", flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = darkMode ? "#27272a" : "#f0f0f0" }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = ""; e.currentTarget.style.background = "transparent" }}
            >
              <MoreHorizontal size={14} />
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
  }, [recentSessions, batchMode, batchSelected, groups])

  const groupedSessionItems = React.useMemo(() => {
    const itemsMap: Record<string, any[]> = {}
    Object.keys(sessionsByGroup).forEach(groupId => {
      itemsMap[groupId] = (sessionsByGroup[groupId] || []).slice(0, 20).map((s: any) => renderConvItem(s))
    })
    return itemsMap
  }, [sessionsByGroup, batchMode, batchSelected, groups])

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
  const [showPlanDialog, setShowPlanDialog] = useState(false)
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
  const [visionVideoElementId, setVisionVideoElementId] = useState<string>('studio-vision-camera') // 当前巡检使用的视频元素 ID

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
            } else if (config.name === 'firecrawl') {
                tools.push({ name: 'mcp_firecrawl_scrape', displayName: '网页抓取', description: '抓取网页内容', icon: toolIcon, iconBg: toolIconBg })
            } else if (config.name === 'soil-sensor') {
                tools.push({ name: 'mcp_soil_sensor_query', displayName: '土壤传感器', description: '查询土壤墒情数据', icon: toolIcon, iconBg: toolIconBg })
            } else if (config.name === 'crop-disease') {
                tools.push({ name: 'mcp_crop_disease_diagnose', displayName: '病害诊断', description: '作物病虫害识别与防治', icon: toolIcon, iconBg: toolIconBg })
            } else if (config.name === 'irrigation-system') {
                tools.push({ name: 'mcp_irrigation_query', displayName: '灌溉系统', description: '智能灌溉控制与查询', icon: toolIcon, iconBg: toolIconBg })
            } else if (config.name === 'farm-data') {
                tools.push({ name: 'mcp_farm_data_query', displayName: '农场数据', description: '农场运营数据分析', icon: toolIcon, iconBg: toolIconBg })
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
  const [quotaInfo, setQuotaInfo] = useState<{ daily_limit: number, daily_usage: number, balance: number } | null>(null)
  // 积分视图（积分制度：token 计费 × 模型倍率 × 全局倍率）
  const [creditInfo, setCreditInfo] = useState<{
    monthlyRemaining: number
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
    type: 'checkpoint' | 'clarify'
    title: string
    timeoutMs: number
    startedAt: number
  } | null>(null)

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
      }
    } catch (e: any) {
      console.error('[Chat] Respond error:', e)
      setNotices(prev => prev.filter(n => n.variant !== 'loading'))
      showNotice('回复送达失败', e?.message || '网络错误，将作为新消息发送', 'error')
      fallbackToSendMessage(replyText)
    }
  }, [])

  const [notices, setNotices] = useState<{ id: number; title: string; description?: string; variant?: 'loading' | 'success' | 'error'; expanded: boolean }[]>([])
  const noticeIdCounter = useRef(0)
  
  // 🔥 修复：跟踪已显示通知的报告，避免重复弹窗
  const notifiedReportsRef = useRef<Set<string>>(new Set())

  const showNotice = (title: string, description?: string, variant?: 'loading' | 'success' | 'error') => {
    const id = ++noticeIdCounter.current
    setNotices(prev => [...prev, { id, title, description, variant, expanded: false }])

    if (variant && variant !== 'loading') {
      setTimeout(() => {
        setNotices(prev => prev.filter(n => n.id !== id))
      }, 5000)
    }
  }

  // 加载会话消息
  const loadSessionMessages = async (sessionId: number) => {
    // 🔥 关键修复：切换会话时，中止正在进行的流式输出
    if (abortControllerRef.current) {
      console.log('[Session Switch] Aborting ongoing stream...')
      abortControllerRef.current.abort("Session switched")
      abortControllerRef.current = null
    }
    
    // 重置加载状态
    setIsLoading(false)
    isStoppedRef.current = false
    
    // 清空当前消息，避免闪烁
    setMessages([])
    setLatestTaskListContent("")
    // 🔥 重置新消息分隔线边界（加载完成后重新设置）
    setNewMessageBoundary(0)
    // 🔥 重置工具更新标记，新会话允许流式 TASK_LIST 写入
    taskUpdatedByToolRef.current = false

    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`)
      if (res.ok) {
        const data = await res.json()
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages)
          // 🔥 历史消息加载完成：以当前数量为边界，之后新增的消息视为"新消息"
          setNewMessageBoundary(data.messages.length)
        }
      } else {
        console.error('Failed to load session messages:', res.status)
        showNotice("加载失败", "无法加载会话消息", "error")
      }
    } catch (error) {
      console.error('Error loading session messages:', error)
      showNotice("加载失败", "发生未知错误", "error")
    }
  }

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
        if (!selectedModel && parsed?.model) setSelectedModel(parsed.model)
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

    const current = selectedModel || aiSettings?.model || ""
    if (current && enabledIds.has(current)) {
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
              setSessionId(lastId)
            } else if (data.sessions.length > 0) {
              setSessionId(data.sessions[0].id)
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
    localStorage.setItem("ai-last-session-id", sessionId)
      ; (async () => {
        try {
          const res = await fetch(`/api/sessions/${sessionId}`)
          if (res.ok) {
            const data = await res.json()
            const msgs = Array.isArray(data?.messages) ? (data.messages as Message[]) : []
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
    // 1. 中止网络请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort("Task terminated by user")
      abortControllerRef.current = null
    }
    
    // Stop TTS
    ttsStop()

    // 2. 标记停止，阻止后续执行
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

    // 3. 清除所有状态
    setIsLoading(false)
    setAgentStatus("")
    setIsExecutingControl(false)
    setDevicePillExpanded(false)
    setExecutingDeviceName("")

    // 🔥 用户停止：把 AI 动作总结标记为 stopped
    setAiActionSummary((prev) => prev ? { ...prev, status: "stopped" } : null)
    
    // 4. 添加一条系统消息提示
    setMessages(prev => [...prev, { role: "assistant", content: "🛑 已响应您的请求，立即停止所有操作 (Generation & Execution Terminated)。" }])
    
    // 5. 短暂显示通知
    showNotice("操作已强制终止", "AI 生成与设备控制已中断", "error")
  }

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

          // Step 2: 获取摄像头 URL
          setVisionInspectionStatus("正在建立摄像头连接...");
          showNotice("📷 视觉巡检", "正在连接摄像头...", "loading")
          let cameraUrl = ''
          try {
            const camRes = await fetch('/api/ai/camera-capture')
            if (camRes.ok) {
              const camData = await camRes.json()
              const cam = cameraId === 'b' ? camData.cameras?.b : camData.cameras?.a
              if (cam?.available && cam?.url) {
                cameraUrl = cam.url
              }
            }
          } catch (e) {
            console.error('Failed to get camera URL:', e)
          }

          if (!cameraUrl) {
            setVisionInspectionUrl(null)
            setVisionInspectionStatus('')
            setVisionCapturedImage(null)
            setIsInspecting(false)
            showNotice("❌ 视觉巡检失败", "摄像头未配置或不可用", "error")
            // 🔥 架构变更：不再通过 silent message 告知 AI（showNotice 已向用户提示）
            break
          }

          // Step 3: 加载视频流并截图
          setVisionInspectionStatus(`正在捕捉 ${cameraId === 'b' ? 'B' : 'A'} 摄像头实时画面...`);
          showNotice("📷 视觉巡检", "正在加载摄像头画面，请稍候...", "loading")
          
          // 获取与 Monitor 页面一致的可播放 URL
          const getPlayableUrl = (rawUrl: string) => {
            const url = rawUrl.trim()
            if (!url) return ""

            // 如果本来就是代理地址，直接返回
            if (url.includes('/api/stream-proxy') || url.includes('/api/stream-rtmp')) return url;

            // Handle RTMP protocol → route through FFmpeg proxy
            if (url.startsWith("rtmp://") || url.startsWith("rtmps://")) {
              return `/api/stream-rtmp?url=${encodeURIComponent(url)}`
            }

            if (/player\.xstrive\.com\/video\/live/i.test(url)) {
              const safeDecode = (value: string) => {
                try {
                  return decodeURIComponent(value)
                } catch {
                  return value
                }
              }
              const extractVideoUrlLoosely = (playerUrl: string) => {
                const qIndex = playerUrl.indexOf("?")
                if (qIndex < 0) return ""
                const query = playerUrl.slice(qIndex + 1)
                const lower = query.toLowerCase()
                let start = lower.indexOf("videourl=")
                while (start !== -1 && start > 0 && query[start - 1] !== "&") {
                  start = lower.indexOf("videourl=", start + 1)
                }
                if (start === -1) return ""
                const valueStart = start + "videourl=".length
                const after = query.slice(valueStart)
                const parts = after.split("&")
                const stopKeys = new Set(["islive", "ismute", "aspect", "lang", "autoplay", "from", "player", "t", "ts"])
                const videoParts: string[] = []
                for (let i = 0; i < parts.length; i++) {
                  const p = parts[i]
                  const eq = p.indexOf("=")
                  const key = eq >= 0 ? p.slice(0, eq).toLowerCase() : ""
                  if (i > 0 && key && stopKeys.has(key)) break
                  videoParts.push(p)
                }
                return videoParts.join("&")
              }
              try {
                const u = new URL(url)
                const videoUrl = u.searchParams.get("videoUrl") ?? ""
                const loose = extractVideoUrlLoosely(url)
                const picked = loose.length > videoUrl.length ? loose : videoUrl
                if (!picked) return ""
                
                const decoded = safeDecode(picked)
                // Wrap in proxy for cross-origin issues
                return `/api/stream-proxy?url=${encodeURIComponent(decoded)}`
              } catch {
                const loose = extractVideoUrlLoosely(url)
                if (!loose) return ""
                const decoded = safeDecode(loose)
                return `/api/stream-proxy?url=${encodeURIComponent(decoded)}`
              }
            }

            try {
              const u = new URL(url)
              if (u.protocol === "http:" || u.protocol === "https:") {
                return `/api/stream-proxy?url=${encodeURIComponent(url)}`
              }
            } catch {}

            return url
          }

          const playableUrl = getPlayableUrl(cameraUrl)
          console.log("[AI Vision] Playable URL resolved to:", playableUrl);
          setVisionInspectionUrl(playableUrl)

          let capturedImageBase64 = ''
          try {
            capturedImageBase64 = await new Promise<string>((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('摄像头画面加载超时 (20s)，可能原因：网络延迟、摄像头正在初始化、或画面尚未加载完成'))
              }, 20000)

              const checkFrame = setInterval(() => {
                const video = document.getElementById('studio-vision-camera') as HTMLVideoElement | null
                if (video && video.readyState >= 3 && video.videoWidth > 0) {
                  clearInterval(checkFrame)
                  setVisionInspectionStatus(`捕捉到 ${cameraId === 'b' ? 'B' : 'A'} 画面，正在优化成像...`);
                  
                  // Wait a bit longer to ensure video is clearly rendering
                  setTimeout(() => {
                    try {
                      const canvas = document.createElement('canvas')
                      canvas.width = video.videoWidth || 640
                      canvas.height = video.videoHeight || 480
                      const ctx = canvas.getContext('2d')
                      if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
                        clearTimeout(timeout)
                        resolve(dataUrl)
                      } else {
                        throw new Error('Canvas context 创建失败')
                      }
                    } catch (err: any) {
                      clearTimeout(timeout)
                      reject(err)
                    }
                  }, 6000) // 增加到 6 秒：给流媒体解码和关键帧渲染留足时间，避免截出黑屏
                }
              }, 500)
            })
          } catch (err: any) {
            console.error('Camera capture failed:', err)
            setVisionInspectionUrl(null)
            setVisionInspectionStatus('')
            setVisionCapturedImage(null)
            setIsInspecting(false)
            showNotice("❌ 截图失败", err?.message || '未知错误', "error")
            // 🔥 架构变更：不再通过 silent message 告知 AI（showNotice 已向用户提示）
            break
          } finally {
            setInspectionCameraUrl(null)
          }

          if (!capturedImageBase64) {
            setIsInspecting(false)
            setVisionCapturedImage(null)
            setVisionInspectionStatus('')
            showNotice("❌ 截图为空", "未能获取到摄像头画面", "error")
            // 🔥 架构变更：不再通过 silent message 告知 AI（showNotice 已向用户提示）
            break
          }

          // Step 4: 发送截图给 AI (VLM 多模态消息)
          showNotice("🧠 视觉巡检", "正在让 AI 分析画面...", "loading")

          // 🔥 架构变更（重要）：原逻辑通过 silent handleSend 把截图作为多模态消息
          // 偷偷塞给 AI 让其分析画面，这是"静默消息回流"反模式的典型代表。
          // 新架构下，AI 通过 move_camera_and_look / take_camera_snapshot 原生 MCP 工具
          // 在 Agent Loop 内直接调用，后端用 ffmpeg 抓帧并把 image_url 回灌给 AI，
          // AI 在同一轮请求内即可看到图片并继续推理。
          // 此处仅保留 UI 端的截图展示（用户可见），不再向 AI 发送任何静默消息。
          setVisionCapturedImage(capturedImageBase64)
          setVisionInspectionStatus("画面已捕获（如需 AI 分析，请在对话中询问）")
          setInspectionStatus("完成巡检截图。");
          showNotice("✅ 视觉巡检", "画面已捕获（如需 AI 分析请直接在对话中询问）", "success")
          // hasSentCustomFeedback 已废弃（不再有 silent feedback 机制需要去重）
          
          // 延迟清理视觉巡检状态，让用户看到分析阶段和已捕获的画面
          setTimeout(() => {
            setVisionInspectionUrl(null)
            setVisionInspectionStatus('')
            setVisionCapturedImage(null)
            setIsInspecting(false)
          }, 3000)
          
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
          setVisionInspectionStatus("正在获取摄像头实时画面...")
          setVisionVideoElementId('hidden-ai-camera')
          setVisionCapturedImage(null)
          showNotice("📷 获取截图", "正在连接摄像头...", "loading")

          let cameraUrl = ''
          try {
            const camRes = await fetch('/api/ai/camera-capture')
            if (camRes.ok) {
              const camData = await camRes.json()
              const cam = cameraId === 'b' ? camData.cameras?.b : camData.cameras?.a
              if (cam?.available && cam?.url) {
                cameraUrl = cam.url
              }
            }
          } catch (e) {
            console.error('Failed to get camera URL:', e)
          }

          if (!cameraUrl) {
            setIsInspecting(false);
            showNotice("❌ 获取截图失败", "摄像头未配置或不可用", "error")
            // 🔥 架构变更：不再通过 silent message 告知 AI（showNotice 已向用户提示）
            break
          }

          const getPlayableUrl = (rawUrl: string) => {
            const url = rawUrl.trim()
            if (!url) return ""
            if (url.includes('/api/stream-proxy') || url.includes('/api/stream-rtmp')) return url;
            // Handle RTMP protocol → route through FFmpeg proxy
            if (url.startsWith("rtmp://") || url.startsWith("rtmps://")) {
              return `/api/stream-rtmp?url=${encodeURIComponent(url)}`
            }
            if (/player\.xstrive\.com\/video\/live/i.test(url)) {
              const safeDecode = (value: string) => { try { return decodeURIComponent(value) } catch { return value } }
              const extractVideoUrlLoosely = (playerUrl: string) => {
                const qIndex = playerUrl.indexOf("?")
                if (qIndex < 0) return ""
                const query = playerUrl.slice(qIndex + 1)
                const lower = query.toLowerCase()
                let start = lower.indexOf("videourl=")
                while (start !== -1 && start > 0 && query[start - 1] !== "&") { start = lower.indexOf("videourl=", start + 1) }
                if (start === -1) return ""
                const valueStart = start + "videourl=".length
                const after = query.slice(valueStart)
                const parts = after.split("&")
                const stopKeys = new Set(["islive", "ismute", "aspect", "lang", "autoplay", "from", "player", "t", "ts"])
                const videoParts: string[] = []
                for (let i = 0; i < parts.length; i++) {
                  const p = parts[i]
                  const eq = p.indexOf("=")
                  const key = eq >= 0 ? p.slice(0, eq).toLowerCase() : ""
                  if (i > 0 && key && stopKeys.has(key)) break
                  videoParts.push(p)
                }
                return videoParts.join("&")
              }
              try {
                const u = new URL(url)
                const videoUrl = u.searchParams.get("videoUrl") ?? ""
                const loose = extractVideoUrlLoosely(url)
                const picked = loose.length > videoUrl.length ? loose : videoUrl
                if (!picked) return ""
                return `/api/stream-proxy?url=${encodeURIComponent(safeDecode(picked))}`
              } catch {
                const loose = extractVideoUrlLoosely(url)
                if (!loose) return ""
                return `/api/stream-proxy?url=${encodeURIComponent(safeDecode(loose))}`
              }
            }
            try {
              const u = new URL(url)
              if (u.protocol === "http:" || u.protocol === "https:") {
                return `/api/stream-proxy?url=${encodeURIComponent(url)}`
              }
            } catch {}
            return url
          }

          const playableUrl = getPlayableUrl(cameraUrl)
          setInspectionCameraUrl(playableUrl)
          setVisionInspectionUrl(playableUrl)

          let capturedImageBase64 = ''
          try {
            capturedImageBase64 = await new Promise<string>((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('画面加载超时'))
              }, 20000)

              const checkFrame = setInterval(() => {
                const video = document.getElementById('hidden-ai-camera') as HTMLVideoElement | null
                if (video && video.readyState >= 3 && video.videoWidth > 0) {
                  clearInterval(checkFrame)
                  setInspectionStatus(`捕捉到 ${cameraId === 'b' ? 'B' : 'A'} 画面，正在优化成像...`);
                  setVisionInspectionStatus(`捕捉到 ${cameraId === 'b' ? 'B' : 'A'} 画面，正在优化成像...`);
                  
                  // Wait a bit longer to ensure video is clearly rendering
                  setTimeout(() => {
                    try {
                      const canvas = document.createElement('canvas')
                      canvas.width = video.videoWidth || 640
                      canvas.height = video.videoHeight || 480
                      const ctx = canvas.getContext('2d')
                      if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
                        clearTimeout(timeout)
                        resolve(dataUrl)
                      } else {
                        throw new Error('Canvas context 创建失败')
                      }
                    } catch (err: any) {
                      clearTimeout(timeout)
                      reject(err)
                    }
                  }, 6000) // 增加延迟，确保画面不再是黑屏闪烁
                }
              }, 500)
            })
          } catch (err: any) {
            console.error('Camera capture failed:', err)
            setIsInspecting(false)
            setVisionInspectionUrl(null)
            setVisionInspectionStatus('')
            showNotice("❌ 截图失败", err?.message || '未知错误', "error")
            // 🔥 架构变更：不再通过 silent message 告知 AI（showNotice 已向用户提示）
            break
          } finally {
            // 延迟一点关闭，避免 UI 突然消失造成闪烁
            setTimeout(() => {
               setInspectionCameraUrl(null)
               setVisionInspectionUrl(null)
               setIsInspecting(false);
            }, 1000)
          }

          if (!capturedImageBase64) {
            showNotice("❌ 截图为空", "未能获取到摄像头画面", "error")
            // 🔥 架构变更：不再通过 silent message 告知 AI（showNotice 已向用户提示）
            break
          }

          setInspectionStatus("完成截图。");
          setVisionCapturedImage(capturedImageBase64)
          setVisionInspectionStatus("截图完成，已获取画面")
          showNotice("✅ 截图成功", "已获取摄像头画面", "success")

          // 1. 先把图片像以前一样以 assistant 的身份直接显示在对话流里
          setMessages(prev => {
             const newMsgs = [...prev, { 
                 role: "assistant", 
                 content: [
                     { type: "text", text: `这是从摄像头 ${cameraId === 'b' ? 'B' : 'A'} 获取的实时截图：` },
                     { type: "image_url", image_url: { url: capturedImageBase64 } }
                 ] 
             } as Message]
             if (sessionId) {
                 fetch(`/api/sessions/${sessionId}`, {
                     method: "PUT",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ messages: newMsgs })
                 }).catch(console.error)
             }
             return newMsgs
          })

          // 🔥 架构变更（重要）：原逻辑通过 silent handleSend 把截图作为多模态消息
          // 偷偷塞给 AI 让其分析画面，这是"静默消息回流"反模式的典型代表。
          // 新架构下，AI 通过 take_camera_snapshot / move_camera_and_look 原生 MCP 工具
          // 在 Agent Loop 内直接调用，后端用 ffmpeg 抓帧并把 image_url 回灌给 AI，
          // AI 在同一轮请求内即可看到图片并继续推理。
          // 此处仅保留 UI 端的截图展示（用户可见），不再向 AI 发送任何静默消息。
          // hasSentCustomFeedback 已废弃（不再有 silent feedback 机制需要去重）

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

  const handleSend = async (
    overrideText?: any, 
    overrideAttachments?: ChatAttachment[], 
    isFeedback: boolean = false, 
    isSilent: boolean = false,
    useSystemApi: boolean = false // 新参数：强制使用系统API（用于定时任务）
  ) => {
    // 过滤掉可能作为事件对象传入的 overrideText（如 onClick={handleSend}）
    if (overrideText && typeof overrideText === 'object' && !Array.isArray(overrideText)) {
      overrideText = undefined;
    }

    // 立即打断当前正在进行的 TTS 语音播报
    ttsReset()

    // 重置停止状态
    isStoppedRef.current = false
    
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
    
    // 强制允许视觉截图等内部反馈消息穿透 loading 拦截
    if (isLoading && !isFeedback && !isSilent) {
        console.log("[handleSend] Blocked by isLoading guard")
        return
    }
    
    setIsLoading(true) // 立即锁定，防止重复发送导致“抽搐”
    
    // 模拟感知阶段（仅当是用户主动发送或Agent自动闭环时，且不是简单的反馈重试）
    // 模拟感知阶段（显示简洁的思考状态）
    if (!agentStatus && !isFeedback) {
      setAgentStatus("莓小智正在深入思考...")
      await new Promise(r => setTimeout(r, 600)) // 略微保留一点感知感
      if (isStoppedRef.current) return
    } else if (isFeedback) {
        setAgentStatus("正在根据反馈重新分析...")
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
        setSessionId(s.id)
        setSessions(prev => [s, ...prev])
      }
    }

    const userMessageContent: Message['content'] = (() => {
      // overrideText 是数组（已包含图片等结构）时直接使用
      if (Array.isArray(overrideText)) return overrideText
      // 取基础文本：overrideText 优先（自动触发场景），否则用输入框文本
      const baseText = typeof overrideText === "string" ? overrideText : userMsg
      // 合并附件图片（覆盖自动触发和手动发送两种场景）
      if (currentAttachments.length > 0) {
        return [
          { type: "text", text: baseText },
          ...currentAttachments.map((att) => ({ type: "image_url" as const, image_url: { url: att.dataUrl } }))
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

    const userMessage: Message = { role: "user", content: userMessageContent, isSilent }

    // 🔥 用户主动发新消息时重置页面级 TASK_LIST（反馈消息不重置，保持任务规划连续性）
    if (!isFeedback && !isSilent) {
      setLatestTaskListContent("")
      // 🔥 重置工具更新标记，新一轮对话允许流式 TASK_LIST 写入
      taskUpdatedByToolRef.current = false
    }

    // 使用 Ref 获取并立即更新最新的消息列表，彻底解决闭包导致的异步状态回滚问题
    const currentMessagesForApi = [...messagesRef.current, userMessage]
    setMessages(currentMessagesForApi)
    messagesRef.current = currentMessagesForApi // 同步更新 Ref 为下一轮调用提供正确基准
    
    setAttachments([])

    let assistantMsg: Message = { role: "assistant", content: "" }

    try {
      // 每次新请求时清空工作室旧数据，并确保流结束时关闭浏览器
      setBrowsingUrl(null)
      setCurrentBrowserUrl(null)
      setBrowserScreenshot(null)
      setStudioData([])
      
      if (ensuredSessionId) {
        const current = sessions.find((s) => s.id === ensuredSessionId)
        if (current && current.title && current.title.startsWith("新会话")) {
          const cand = userMsg.slice(0, 24)
          await fetch(`/api/sessions/${ensuredSessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: cand }) })
          setSessions((prev) => prev.map((s) => (s.id === ensuredSessionId ? { ...s, title: cand } : s)))
        }

        // 保存消息到会话时，过滤掉 isSilent 内部反馈消息（避免重新加载时污染对话历史）
        // 同时确保正确序列化消息内容
        const messagesToSave = currentMessagesForApi
          .filter(m => !(m as Message & { isSilent?: boolean }).isSilent)
          .map(m => {
          let safeContent = m.content;
          if (Array.isArray(safeContent)) {
            // 如果是数组格式的多模态消息，我们需要深拷贝并清理它
            safeContent = safeContent.map(part => {
              if (part.type === 'image_url') {
                return {
                  type: 'image_url',
                  image_url: {
                    url: typeof part.image_url === 'string' ? part.image_url : (part.image_url?.url || '')
                  }
                };
              }
              return {
                type: part.type || 'text',
                text: part.text || ''
              };
            });
          }
          return {
            role: m.role,
            content: safeContent
          };
        })

        await fetch(`/api/sessions/${ensuredSessionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messagesToSave })
        })
      }

      // 创建 AbortController
      const controller = new AbortController()
      abortControllerRef.current = controller

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
  2. 如果用户需要控制设备，先解释操作的作用和影响
  3. 然后调用设备控制工具（系统会等待用户手动点击"执行"按钮确认）
  4. 提供建议但让用户做最终决定
  5. 如果不确定用户意图，主动询问
  6. 所有设备操作都需要用户手动确认
- 重要：你可以调用设备控制工具，但系统会等待用户手动确认后才执行
- 示例：用户说"温度有点高" → 解释"当前32°C偏高，建议开启风扇降温" → 调用 toggle_relay 工具 → 用户点击"执行"按钮后才会真正执行`;
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

      // === 前端感知：检测是否需要上下文压缩 (Frontend Pre-perception) ===
      const nonMemoryMsgs = currentMessagesForApi.filter(m => {
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        return !content.includes('<PAST_MEMORY>')
      })
      const overflowStringified = nonMemoryMsgs.map(m => m.role + (typeof m.content === 'string' ? m.content : JSON.stringify(m.content))).join('\n')
      
      const historyToSummarizeLength = nonMemoryMsgs.slice(0, Math.max(0, nonMemoryMsgs.length - 4))
          .map(m => m.role + (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
          .join('\n').length

      if (overflowStringified.length > 50000 && nonMemoryMsgs.length > 5 && historyToSummarizeLength > 1000) {
        setAgentStatus("对话记录过长，莓小智正在提炼并压缩记忆...")
        await new Promise(r => setTimeout(r, 800)) // 给用户一点看到提示的时间
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
        try {
          const errorData = JSON.parse(errorText)
          if (res.status === 403 && errorData.error && (errorData.error.includes("额度") || errorData.error.includes("余额") || errorData.error.includes("升级"))) {
            if (errorData.quota) setQuotaInfo(errorData.quota)
            setShowPlanDialog(true)
            setIsLoading(false)
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
      let reasoningText = ""
      let reasoningStart = -1
      const startTs = Date.now()
      setMessages(prev => [...prev, assistantMsg])

      // 🔥 初始化 AI 动作统计：开始计时
      aiActionStatsRef.current = {
        startTs,
        toolCallCount: 0,
        fileChanges: { added: 0, removed: 0, count: 0 },
        lastTaskPlanProgress: undefined,
        lastTaskPlanCompleted: false,
      }
      setAiActionSummary({
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
      setAgentSteps(currentAgentSteps)

      const decoder = new TextDecoder()
      let buffer = ""
      let ttsProcessedLength = 0
      let latestHistoryFromBackend: Message[] | null = null
      
      // 🔥 关键修复：保存当前会话ID，用于验证流式输出是否应该继续
      const streamSessionId = ensuredSessionId

      while (true) {
        // 🔥 关键修复：检查会话是否已切换
        if (streamSessionId !== sessionId) {
          console.log('[Stream Guard] Session switched, aborting stream update')
          break
        }

        // 🔥 关键修复：检查用户是否请求停止，立即中断流式循环
        if (isStoppedRef.current) {
          console.log('[Stream Guard] User requested stop, aborting stream loop')
          setIsLoading(false)
          setAgentStatus("")
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
            setAgentStatus("")
            setBrowsingUrl(null)
            // 🔥 修复：立即清理 isLoading 状态，避免显示"思考中"
            setIsLoading(false)
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
                 if (streamSessionId === sessionId) {
                   setMessages(prev => {
                      const newMsgs = [...prev]
                      newMsgs[newMsgs.length - 1] = { ...assistantMsg }
                      return newMsgs
                   })
                 }
                 // 错误后必须清理加载状态并退出循环（后端可能不再发 [DONE]）
                 setIsLoading(false)
                 setAgentStatus("")
                 break
              }

              // 处理上下文更新事件 (持久化记忆压缩结果)
              if (data.type === 'context_update' && Array.isArray(data.messages)) {
                 // 会话切换保护
                 if (streamSessionId !== sessionId) break
                 // 强制同步主消息列表，让历史消息被压缩后的摘要替代
                 latestHistoryFromBackend = data.messages
                 setMessages(data.messages)
                 // 将当前正在生成的回复占位符重新追加回去
                 setMessages(prev => [...prev, assistantMsg])
                 continue
              }

              // 积分消耗事件：回复完成后在气泡下方显示本次消耗
              if (data.type === 'credit_usage' && data.credit) {
                assistantMsg.creditUsage = data.credit
                if (streamSessionId === sessionId) {
                  setMessages(prev => {
                    const newMsgs = [...prev]
                    if (newMsgs.length > 0) {
                      newMsgs[newMsgs.length - 1] = { ...assistantMsg }
                    }
                    return newMsgs
                  })
                }
                continue
              }

              // Handle tool results
              if (data.tool_result) {
                 setStudioData(prev => [...prev, data.tool_result])

                 // 🔥 update_task 工具结果：用返回的 task_list_tag 更新 latestTaskListContent
                 // 这样 DynamicTaskPlanner 卡片会立即刷新，无需 AI 重新输出 <TASK_LIST> 标签
                 if (data.tool_result.name === 'update_task') {
                   const result = data.tool_result.result
                   if (result?.success !== false && result?.task_list_tag) {
                     console.log('[Chat] update_task result received, refreshing task planner card')
                     setLatestTaskListContent(result.task_list_tag)
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
                     setBrowserScreenshot(`https://image.thum.io/get/width/800/crop/600/noanimate/${targetUrl}`)
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
                 setAgentSteps([...currentAgentSteps])

                 continue
              }

              // Handle tool progress (parallel execution feedback)
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
                    kind: "narrative",
                    status: "active",
                    // 🔥 Bug 修复：后端发的 completed 已经是递增后的值（1-based），
                    // 不需要再 +1，否则 4 个工具会显示成 2/4, 3/4, 4/4, 5/4
                    text: `并行调用 ${completed}/${total}：${current ? `正在执行 ${current}` : '执行中...'}`,
                  })
                  setAgentSteps([...currentAgentSteps])
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
                setAgentStatus(`等待用户输入：${title}`)
                continue
              }

              // 🔥 处理「用户输入已收到」事件（Agent Loop 从挂起中恢复）
              if (data.user_input_received) {
                console.log(`[Chat] User input received, resuming Agent Loop: ${data.user_input_received.reply_preview}`)
                waitingForUserInputRef.current = null
                setAgentStatus("AI 思考中...")
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
                setAgentStatus(`⚠️ ${reason}，正在尝试生成总结...`)
                currentAgentSteps.push({
                  id: nextStepId("llm-error"),
                  kind: "narrative",
                  status: "completed",
                  text: `⚠️ ${reason}`,
                  duration: 0
                })
                setAgentSteps([...currentAgentSteps])
                continue
              }

                // Handle tool calls feedback
              // 处理知识模块选取通知 (AI Skill Routing)
              if (data.skill_selection) {
                const skillNames = data.skill_selection.map((s: any) => s.name).join(", ")
                setAgentStatus(`智能识别意图，由 [${skillNames}] 模块提供支持...`)

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
                setAgentSteps([...currentAgentSteps])
                continue
              }

              if (data.tool_calls) {
                const toolNames = data.tool_calls.map((t: any) => t.function.name).join(", ")
                const round = data.agent_iteration || 1

                // 🔥 累计工具调用次数到 AI 动作总结
                aiActionStatsRef.current.toolCallCount += data.tool_calls.length
                setAiActionSummary((prev) =>
                  prev
                    ? {
                        ...prev,
                        toolCallCount: aiActionStatsRef.current.toolCallCount,
                        totalDurationMs: Date.now() - aiActionStatsRef.current.startTs,
                      }
                    : prev
                )
                setAgentStatus(`第 ${round} 轮工具调用: ${toolNames}...`)
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
                setAgentSteps([...currentAgentSteps])

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
                            setBrowsingUrl(url)
                            setCurrentBrowserUrl(url) // 同步到工作室内部浏览器状态
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
                if (streamSessionId === sessionId) {
                  setMessages(prev => {
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
                  setAgentStatus("")
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
                    setAgentSteps([...currentAgentSteps])
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

                    // 🔥 检测并自动包裹裸露的 HTML 报告代码
                    // 检查是否已经有 [REPORT:...] 标签包裹或已有开始标记（避免在AI已经原生输出[REPORT:时进行干扰）
                    const hasReportTag = assistantMsg.content.includes('[REPORT:') || /\[REPORT:[^\]]+\][\s\S]*?\[\/REPORT\]/.test(assistantMsg.content)
                    
                    if (!hasReportTag) {
                        // 🔥 增强的 HTML 检测模式 - 更激进地捕获各种 HTML 结构
                        // 1. 完整的 HTML 文档
                        const fullHtmlPattern = /<!DOCTYPE[^>]*>[\s\S]*?<html[\s\S]*?<\/html>/gi
                        // 2. 带 style 属性的 div 容器（更宽松的匹配）
                        const styledDivPattern = /<div\s+style\s*=\s*["'][^"']*["'][^>]*>[\s\S]*?<\/div>/gi
                        // 3. 带 style 属性的 p 标签（某些模型可能用 p 标签）
                        const styledPPattern = /<p\s+style\s*=\s*["'][^"']*["'][^>]*>[\s\S]*?<\/p>/gi
                        // 4. 任何以 < 开头并包含多个 HTML 标签的内容
                        const multiTagPattern = /(?:<(?:div|p|h[1-6]|section|article)\s+[^>]*>[\s\S]*?){3,}/gi
                        
                        // 🔥 首先处理可能被包裹在 markdown 代码块中的 HTML
                        const markdownHtmlPattern = /```(?:html)?\s*(<!DOCTYPE[\s\S]*?<\/html>|<(?:div|p|section|article)\s+[\s\S]*?<\/(?:div|p|section|article)>)\s*```/gi
                        const markdownMatches = assistantMsg.content.match(markdownHtmlPattern)
                        
                        if (markdownMatches && markdownMatches.length > 0) {
                            console.log('[Stream Filter] Found HTML in markdown code blocks:', markdownMatches.length)
                            markdownMatches.forEach((codeBlock) => {
                                // 提取代码块中的 HTML
                                const htmlMatch = codeBlock.match(/```(?:html)?\s*([\s\S]*?)\s*```/)
                                if (htmlMatch && htmlMatch[1]) {
                                    const htmlCode = htmlMatch[1].trim()
                                    const isReportHtml = /(?:报告|分析|监测|数据|统计|环境|设备|温度|湿度|Report|Analysis|gradient|font-family)/i.test(htmlCode)
                                    
                                    if (isReportHtml && htmlCode.length > 150) { // 降低最小长度要求
                                        console.log('[Stream Filter] Detected HTML report in markdown code block, extracting and wrapping...')
                                        
                                        // 提取标题
                                        let reportTitle = "AI生成报告"
                                        const h1Match = htmlCode.match(/<h1[^>]*>(.*?)<\/h1>/i)
                                        if (h1Match && h1Match[1]) {
                                            reportTitle = h1Match[1].replace(/<[^>]+>/g, '').trim()
                                        }
                                        
                                        // 包裹并替换
                                        const wrappedReport = `[REPORT:${reportTitle}]\n${htmlCode}\n[/REPORT]`
                                        assistantMsg.content = assistantMsg.content.replace(codeBlock, wrappedReport)
                                        console.log(`[Stream Filter] Extracted from markdown and wrapped: "${reportTitle}"`)
                                    }
                                }
                            })
                        }
                        
                        // 🔥 查找裸露的 HTML 报告代码（不在代码块和 REPORT 标签中的）
                        // 先移除已经在代码块中的内容，避免重复检测
                        let contentWithoutCodeBlocks = assistantMsg.content.replace(/```[\s\S]*?```/g, '')
                        
                        // 尝试所有检测模式
                        const allPatterns = [fullHtmlPattern, styledDivPattern, styledPPattern]
                        let foundHtml = false
                        
                        for (const pattern of allPatterns) {
                            const htmlMatches = contentWithoutCodeBlocks.match(pattern)
                            
                            if (htmlMatches && htmlMatches.length > 0) {
                                console.log(`[Stream Filter] Found ${htmlMatches.length} bare HTML blocks with pattern:`, pattern.source.substring(0, 50))
                                htmlMatches.forEach((htmlCode) => {
                                    // 验证这是否真的是报告 HTML（包含报告特征关键词或样式特征）
                                    const isReportHtml = /(?:报告|分析|监测|数据|统计|环境|设备|温度|湿度|Report|Analysis|gradient|font-family|max-width|padding|border-radius)/i.test(htmlCode)
                                    
                                    if (isReportHtml && htmlCode.length > 150) { // 降低最小长度要求
                                        console.log('[Stream Filter] Detected bare HTML report code, auto-wrapping...')
                                        console.log('[Stream Filter] HTML preview:', htmlCode.substring(0, 100) + '...')
                                        
                                        // 尝试从 HTML 中提取标题
                                        let reportTitle = "AI生成报告"
                                        
                                        // 尝试从 <h1> 标签提取
                                        const h1Match = htmlCode.match(/<h1[^>]*>(.*?)<\/h1>/i)
                                        if (h1Match && h1Match[1]) {
                                            reportTitle = h1Match[1].replace(/<[^>]+>/g, '').trim()
                                        } else {
                                            // 尝试从 <title> 标签提取
                                            const titleMatch = htmlCode.match(/<title[^>]*>(.*?)<\/title>/i)
                                            if (titleMatch && titleMatch[1]) {
                                                reportTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim()
                                            } else {
                                                // 尝试从内容中查找"报告"相关文字
                                                const reportTextMatch = htmlCode.match(/([^<>]*?(?:报告|分析|监测)[^<>]*?)(?:<|$)/i)
                                                if (reportTextMatch && reportTextMatch[1]) {
                                                    reportTitle = reportTextMatch[1].trim().substring(0, 30)
                                                }
                                            }
                                        }
                                        
                                        // 自动包裹为标准格式
                                        const wrappedReport = `[REPORT:${reportTitle}]\n${htmlCode}\n[/REPORT]`
                                        
                                        // 替换原始 HTML 为包裹后的版本
                                        assistantMsg.content = assistantMsg.content.replace(htmlCode, wrappedReport)
                                        foundHtml = true
                                        
                                        console.log(`[Stream Filter] Auto-wrapped report: "${reportTitle}"`)
                                    }
                                })
                                
                                if (foundHtml) break // 找到并处理后就退出循环
                            }
                        }
                        
                        // 🔥 最后的兜底检测：如果内容很长且包含大量 HTML 标签，但还没被包裹
                        if (!foundHtml && contentWithoutCodeBlocks.length > 300) {
                            const htmlTagCount = (contentWithoutCodeBlocks.match(/<[^>]+>/g) || []).length
                            const hasStyleAttr = /style\s*=\s*["'][^"']*["']/.test(contentWithoutCodeBlocks)
                            const hasReportKeywords = /(?:报告|分析|监测|数据|统计|环境|设备)/i.test(contentWithoutCodeBlocks)
                            
                            if (htmlTagCount > 10 && hasStyleAttr && hasReportKeywords) {
                                console.log('[Stream Filter] Fallback detection: Found complex HTML structure with report keywords')
                                console.log('[Stream Filter] HTML tag count:', htmlTagCount)
                                
                                // 尝试提取整个 HTML 内容
                                const firstTagIndex = contentWithoutCodeBlocks.indexOf('<')
                                if (firstTagIndex !== -1) {
                                    const htmlContent = contentWithoutCodeBlocks.substring(firstTagIndex)
                                    
                                    let reportTitle = "AI生成报告"
                                    const h1Match = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i)
                                    if (h1Match && h1Match[1]) {
                                        reportTitle = h1Match[1].replace(/<[^>]+>/g, '').trim()
                                    }
                                    
                                    const wrappedReport = `[REPORT:${reportTitle}]\n${htmlContent}\n[/REPORT]`
                                    assistantMsg.content = assistantMsg.content.replace(htmlContent, wrappedReport)
                                    console.log(`[Stream Filter] Fallback wrapped report: "${reportTitle}"`)
                                }
                            }
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
                // ... reasoning logic ...
                if (enableReasoning && reasoningStart === -1) {
                  const sIdx = combined.indexOf("<REASONING>")
                  if (sIdx !== -1) reasoningStart = sIdx
                }
                
                let display = combined
                if (enableReasoning && reasoningStart !== -1) {
                  const endIdx = combined.indexOf("</REASONING>", reasoningStart)
                  if (endIdx !== -1) {
                    reasoningText = combined.slice(reasoningStart + 11, endIdx)
                    display = combined.slice(0, reasoningStart) + combined.slice(endIdx + 12)
                  } else {
                    reasoningText = combined.slice(reasoningStart + 11)
                    display = combined.slice(0, reasoningStart)
                  }
                } else if (!enableReasoning) {
                  // 未开启深度思考时，移除所有 REASONING 标签
                  display = display.replace(/<REASONING>[\s\S]*?<\/REASONING>/g, '')
                  display = display.replace(/<REASONING>[\s\S]*$/g, '') // 移除未闭合的标签
                }

                // 🔥 用普通setState（不flushSync），让React自然批处理渲染
                // XMarkdown的streaming={{hasNextChunk:true}}会自动处理增量动画
                if (streamSessionId === sessionId) {
                  setMessages(prev => {
                    const newMsgs = [...prev]
                    newMsgs[newMsgs.length - 1] = {
                      role: "assistant",
                      content: display,
                      reasoning: enableReasoning ? { text: reasoningText, durationMs: Date.now() - startTs } : undefined,
                      model: selectedModel || aiSettings?.model
                    }
                    return newMsgs
                  })

                  // 🔥 页面级 TASK_LIST 追踪：流式输出中检测到完整 TASK_LIST 时更新
                  // 这样即使后续反馈消息不含 TASK_LIST，任务规划器也能保持最新状态
                  // ⚠️ 但若 update_task 工具已更新过任务列表，则跳过覆盖（避免回退到 0 进度）
                  const tlMatchLive = (typeof display === "string" ? display : "").match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/)
                  if (tlMatchLive && !taskUpdatedByToolRef.current) {
                    setLatestTaskListContent(tlMatchLive[0])
                  }
                }
              }
            } catch (e) { 
                console.error("Error parsing stream chunk", e)
                // 🔥 修复：解析错误时也要清理状态
                setIsLoading(false)
                setAgentStatus("")
            }
          }
        }
      }

      // 🔥 关键修复：如果用户已请求停止，跳过所有后处理（保存消息、执行命令、解析任务等）
      if (isStoppedRef.current) {
        console.log('[Stream Guard] Stopped by user, skipping all post-processing')
        return
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
      const answerIdx = currentAgentSteps.findIndex(s => s.type === 'answer')
      if (answerIdx !== -1) {
        currentAgentSteps[answerIdx].status = 'completed'
        currentAgentSteps[answerIdx].duration = Date.now() - (currentAgentSteps[answerIdx].startedAt || startTs)
        setAgentSteps([...currentAgentSteps])
      }

      // 🔥 修复：流式输出结束后立即清理状态
      console.log('[Stream End] Cleaning up loading state')
      setIsLoading(false)
      setAgentStatus("")

      // 🔥 SSE 流结束时清理挂起等待状态
      // 正常情况下 user_input_received 或 user_input_timeout 事件会清空，
      // 但如果流意外中断（如网络断开、服务器错误），这里作为兜底清理
      if (waitingForUserInputRef.current) {
        console.warn('[Stream End] SSE closed while waiting for user input, clearing state')
        waitingForUserInputRef.current = null
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
      setAiActionSummary({
        status: taskPlanCompleted ? "completed" : "completed",
        totalDurationMs: finalDurationMs,
        toolCallCount: aiActionStatsRef.current.toolCallCount,
        fileChanges: aiActionStatsRef.current.fileChanges,
        taskPlanCompleted,
        taskPlanProgress,
        onOpenStudio: () => setStudioOpen(true),
      })

      // 确保流结束时关闭浏览器
      setBrowsingUrl(null)
      
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
        if (streamSessionId === sessionId) {
          setMessages(prev => {
            const newMsgs = [...prev]
            newMsgs[newMsgs.length - 1] = { ...assistantMsg }
            return newMsgs
          })
        }
      }
      
      // 🔥 流结束后的最终HTML检测和包裹（兜底方案）
      const finalContent = typeof assistantMsg.content === 'string' ? assistantMsg.content : ''
      if (finalContent && !finalContent.includes('[REPORT:')) {
        console.log('[Final HTML Check] Checking for bare HTML in completed response...')
        
        // 检测是否包含大量HTML标签和报告特征
        const htmlTagCount = (finalContent.match(/<[^>]+>/g) || []).length
        const hasStyleAttr = /style\s*=\s*["'][^"']*["']/.test(finalContent)
        const hasReportKeywords = /(?:报告|分析|监测|数据|统计|环境|设备|温度|湿度)/i.test(finalContent)
        
        console.log('[Final HTML Check] HTML tags:', htmlTagCount, 'Has styles:', hasStyleAttr, 'Has keywords:', hasReportKeywords)
        
        if (htmlTagCount > 5 && hasStyleAttr && hasReportKeywords) {
          console.log('[Final HTML Check] ⚠️ Detected bare HTML report in final output!')
          
          // 查找HTML内容的起始位置
          const htmlStartPatterns = [
            /<div\s+style\s*=/i,
            /<p\s+style\s*=/i,
            /<!DOCTYPE/i,
            /<html/i
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
            // 分离前面的文本说明和HTML代码
            const beforeHtml = finalContent.substring(0, htmlStartIndex).trim()
            const htmlContent = finalContent.substring(htmlStartIndex).trim()
            
            console.log('[Final HTML Check] Before HTML:', beforeHtml.substring(0, 100))
            console.log('[Final HTML Check] HTML content length:', htmlContent.length)
            
            // 提取报告标题
            let reportTitle = "AI生成报告"
            const h1Match = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i)
            if (h1Match && h1Match[1]) {
              reportTitle = h1Match[1].replace(/<[^>]+>/g, '').trim()
            } else {
              const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i)
              if (titleMatch && titleMatch[1]) {
                reportTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim()
              }
            }
            
            // 重新组合：说明文字 + 包裹的HTML
            const wrappedContent = beforeHtml 
              ? `${beforeHtml}\n\n[REPORT:${reportTitle}]\n${htmlContent}\n[/REPORT]`
              : `[REPORT:${reportTitle}]\n${htmlContent}\n[/REPORT]`
            
            assistantMsg.content = wrappedContent
            console.log('[Final HTML Check] ✅ Wrapped HTML report:', reportTitle)
            
            // 更新消息显示
            if (streamSessionId === sessionId) {
              setMessages(prev => {
                const newMsgs = [...prev]
                newMsgs[newMsgs.length - 1] = { ...assistantMsg }
                return newMsgs
              })
            }
          }
        } else {
          console.log('[Final HTML Check] No bare HTML detected in final output')
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
          if (streamSessionId === sessionId) {
            setMessages(prev => {
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

        if (modified3 && streamSessionId === sessionId) {
          setMessages(prev => {
            const newMsgs = [...prev]
            newMsgs[newMsgs.length - 1] = { ...assistantMsg }
            return newMsgs
          })
        }
      }

      if (ensuredSessionId) {
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

      // 429 速率限制：渲染为业务卡片（RateLimitErrorCard），而不是裸文本
      const isRateLimit = e?.isRateLimit === true || e?.status === 429
        || /HTTP 429|status["']?\s*:\s*"?429|速率限制|访问量过大|rate.?limit/i.test(rawMsg)
      if (isRateLimit) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: errMsg,
          errorType: "rate_limit",
          errorRaw: rawMsg,
          errorStatus: 429,
        }])
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: errMsg }])
      }
    } finally {
      // 🔥 架构变更后：AI 通过 Agent Loop 内的工具调用完成设备控制，前端不再有
      // "解析 JSON + 触发 executeCommands + 静默消息反馈" 的后续任务链。
      // 直接清理 loading 状态即可（除非处于 isFeedback/isSilent 内部触发的子调用）。
      const content = typeof assistantMsg.content === 'string' ? assistantMsg.content : '';
      // 仍保留对 schedule_task JSON 的检测：定时任务由 ScheduleCard 组件单独处理，
      // 不影响 isLoading 生命周期，但避免在 ScheduleCard 渲染期间过早清理状态
      const hasScheduleTask = autoExecuteCommands && content.includes('"action": "schedule_task"');

      setAgentStatus("")
      if (!hasScheduleTask) {
        setIsLoading(false)
      }

      // 额外延迟清理一次，确保彻底结束（防止竞态条件）
      setTimeout(() => {
        if (!isStoppedRef.current && !hasScheduleTask) {
          setAgentStatus("")
          setIsLoading(false)
        }
      }, 300)
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

      // 移除最后那条"速率限制"错误卡片
      setMessages(prev => {
        if (prev.length === 0) return prev
        const last = prev[prev.length - 1]
        if (last?.errorType === "rate_limit") return prev.slice(0, -1)
        return prev
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
        setSessionId(s.id)
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
      const nextSessions = sessions.filter(s => s.id !== id)
      setSessions(nextSessions)
      if (id === sessionId) {
        if (nextSessions.length > 0) setSessionId(nextSessions[0].id)
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

  /** 深色模式切换 */
  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev
      localStorage.setItem("darkMode", String(next))
      if (next) document.documentElement.classList.add("dark")
      else document.documentElement.classList.remove("dark")
      return next
    })
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

  const onSelectFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.currentTarget.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const url = typeof reader.result === "string" ? reader.result : ""
        if (url) setAttachments((prev) => [...prev, { name: file.name, type: file.type || "application/octet-stream", dataUrl: url }])
      }
      reader.readAsDataURL(file)
    })
    e.currentTarget.value = ""
    if (files.length > 0) {
      showNotice("附件已添加", `共 ${files.length} 个`, "success")
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items
    const files: File[] = []
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile()
        if (file) {
          files.push(file)
        }
      }
    }
    
    if (files.length > 0) {
      e.preventDefault()
      files.forEach((file) => {
        const reader = new FileReader()
        reader.onload = () => {
          const url = typeof reader.result === "string" ? reader.result : ""
          if (url) setAttachments((prev) => [...prev, { name: file.name || `pasted-${Date.now()}.png`, type: file.type || "image/png", dataUrl: url }])
        }
        reader.readAsDataURL(file)
      })
      showNotice("已粘贴附件", `共 ${files.length} 个文件`, "success")
    }
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

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 12,
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
      `}</style>
    <App>
    <>
    {/* Sonner Toast 已在全局 layout.tsx 的 ToasterWrapper 中统一提供 (position: top-center) */}
    
    <div
      className={cn(
        "fixed inset-0 w-full h-full overflow-hidden flex font-sans transition-colors duration-300",
        darkMode ? "bg-zinc-900 text-zinc-100" : "bg-[#f7f8fa] text-zinc-900",
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
            className="pointer-events-auto overflow-hidden flex items-center shadow-2xl shadow-black/5 dark:shadow-black/20"
            style={{
              height: "48px",
              padding: "0 6px",
              borderRadius: "24px",
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(20px)",
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
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Executing</span>
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
        {/* Sidebar — 千问风格 */}
        <AntLayout.Sider
          width={260}
          collapsedWidth={0}
          collapsed={!sidebarOpen}
          trigger={null}
          collapsible
          style={{
            background: "transparent",
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            minHeight: "100vh",
            overflow: "hidden",
            borderRight: "none",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* ===== 顶部：标题（阿里妈妈数黑体）+ 搜索 + 折叠 ===== */}
            <div style={{ display: "flex", alignItems: "center", padding: "18px 16px 14px" }}>
              <span style={{ fontFamily: "AlimamaShuHeiTi, sans-serif", fontSize: 22, fontWeight: 700, color: darkMode ? "#e4e4e7" : "#111827" }}>莓小智</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => setSearchPanelOpen(true)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center",
                  width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent",
                  cursor: "pointer", color: darkMode ? "#a1a1aa" : "#6b7280" }}
                title="搜索"
              >
                <Search size={17} />
              </button>
              <AntButton type="text" size="small" icon={<PanelLeftClose size={17} />} onClick={() => setSidebarOpen(false)}
                style={{ color: darkMode ? "#a1a1aa" : "#6b7280", padding: 0, minWidth: 32, height: 32 }}
              />
            </div>

            {/* ===== 新建对话按钮 ===== */}
            <div style={{ padding: "0 12px 10px" }}>
              <button
                onClick={createNewSession}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", height: 40, border: darkMode ? "1px solid #27272a" : "1px solid #e5e7eb",
                  borderRadius: 10, background: darkMode ? "#27272a" : "#fff", cursor: "pointer", padding: "0 12px",
                  fontSize: 13, fontWeight: 500, color: darkMode ? "#e4e4e7" : "#374151",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.borderColor = darkMode ? "#3f3f46" : "#d1d5db"; 
                  e.currentTarget.style.boxShadow = darkMode ? "none" : "0 1px 3px rgba(0,0,0,0.04)" 
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.borderColor = darkMode ? "#27272a" : "#e5e7eb"; 
                  e.currentTarget.style.boxShadow = "none" 
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <SquarePen size={15} strokeWidth={1.8} />
                  新建对话
                </span>
                <MessageSquare size={15} style={{ color: darkMode ? "#71717a" : "#9ca3af" }} />
              </button>
            </div>

            {/* ===== 分组与列表区域 ===== */}
            <div data-lenis-prevent className="sidebar-scroll" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "2px 10px 0" }}>
              {/* 隐藏滚动条 */}
              <style>{`
                .sidebar-scroll::-webkit-scrollbar { width: 5px; }
                .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
                .sidebar-scroll::-webkit-scrollbar-thumb {
                  background: #d1d5db;
                  border-radius: 3px;
                  transition: opacity 0.2s;
                  opacity: 0;
                }
                .sidebar-scroll:hover::-webkit-scrollbar-thumb,
                .sidebar-scroll:active::-webkit-scrollbar-thumb { opacity: 1; }
                .sidebar-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }
                .sidebar-scroll:hover, .sidebar-scroll:active { scrollbar-color: #d1d5db transparent; }
              `}</style>

              {/* 探索入口 */}
              <div>
                <div
                  onClick={() => setExploreOpen(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "10px 4px 6px", cursor: "pointer", userSelect: "none",
                    color: darkMode ? "#a1a1aa" : "#4b5563",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#1677ff" }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = darkMode ? "#a1a1aa" : "#4b5563" }}
                >
                  <Compass size={15} strokeWidth={1.5} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: darkMode ? "#e4e4e7" : "#374151" }}>探索</span>
                </div>
              </div>

              {/* 我的空间 - 点击右侧面板占满对话区 */}
              <div>
                <div
                  onClick={() => setMySpaceOpen(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "10px 4px 6px", cursor: "pointer", userSelect: "none",
                    color: darkMode ? "#a1a1aa" : "#4b5563",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#1677ff" }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = darkMode ? "#a1a1aa" : "#4b5563" }}
                >
                  <FolderOpen size={15} strokeWidth={1.5} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: darkMode ? "#e4e4e7" : "#374151" }}>我的空间</span>
                  {spaceReports.length > 0 && (
                    <span style={{
                      fontSize: 10,
                      color: darkMode ? "#a1a1aa" : "#9ca3af",
                      background: darkMode ? "#27272a" : "#f3f4f6",
                      padding: "0 5px",
                      borderRadius: 8,
                      minWidth: 16,
                      textAlign: "center",
                      lineHeight: "16px",
                      height: 16,
                    }}>{spaceReports.length}</span>
                  )}
                  {/* 新报告小红点：SSE 收到 new_report 时点亮，面板打开后清零 */}
                  {mySpaceNewBadge > 0 && (
                    <span
                      title={`${mySpaceNewBadge} 份新简报`}
                      style={{
                        width: 7, height: 7, borderRadius: 999, background: "#1677ff",
                        boxShadow: "0 0 0 2px " + (darkMode ? "#0a0a0c" : "#f7f8fa"),
                        marginLeft: 2
                      }}
                    />
                  )}
                </div>
              </div>

              {/* 定时任务入口 */}
              <div>
                <div
                  onClick={() => setSchedulerPanelOpen(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "8px 4px 6px", cursor: "pointer", userSelect: "none",
                    color: darkMode ? "#a1a1aa" : "#4b5563",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#1677ff" }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = darkMode ? "#a1a1aa" : "#4b5563" }}
                >
                  <CalendarClock size={15} strokeWidth={1.5} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: darkMode ? "#e4e4e7" : "#374151" }}>定时任务</span>
                </div>
              </div>

              {/* 知识库入口 */}
              <div>
                <div
                  onClick={() => setKnowledgeOpen(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "8px 4px 6px", cursor: "pointer", userSelect: "none",
                    color: darkMode ? "#a1a1aa" : "#4b5563",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#1677ff" }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = darkMode ? "#a1a1aa" : "#4b5563" }}
                >
                  <BookOpen size={15} strokeWidth={1.5} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: darkMode ? "#e4e4e7" : "#374151" }}>知识库</span>
                </div>
              </div>

              {/* 对话分组标题（紧贴左侧，无 icon 占位） */}
              <div style={{ padding: "12px 4px 4px" }}>
                <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>对话分组</span>
              </div>

              {/* 新分组（独立行，与分组项同 icon x） */}
              <div
                onClick={() => setShowNewGroupInput(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "6px 4px", cursor: "pointer", userSelect: "none",
                  color: darkMode ? "#a1a1aa" : "#6b7280",
                  borderRadius: 6,
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#27272a" : "#f3f4f6"; e.currentTarget.style.color = "#1677ff" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = darkMode ? "#a1a1aa" : "#6b7280" }}
              >
                <Plus size={14} strokeWidth={1.5} />
                <span style={{ fontSize: 12 }}>新分组</span>
              </div>
                {showNewGroupInput && (
                  <div style={{ display: "flex", gap: 4, marginTop: 4, padding: "0 4px" }}>
                    <input autoFocus value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addGroup(newGroupName); if (e.key === "Escape") { setShowNewGroupInput(false); setNewGroupName("") } }}
                      onBlur={() => { if (newGroupName.trim()) addGroup(newGroupName); else setShowNewGroupInput(false) }}
                      placeholder="输入分组名..."
                      style={{
                        flex: 1, height: 28, fontSize: 12,
                        border: darkMode ? "1px solid #3f3f46" : "1px solid #d1d5db",
                        borderRadius: 6, padding: "0 8px", outline: "none",
                        background: darkMode ? "#27272a" : "#fff",
                        color: darkMode ? "#e4e4e7" : "#374151"
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
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 7,
                      padding: "6px 4px", cursor: "pointer", userSelect: "none",
                      borderRadius: 6,
                      background: isActiveGroup
                        ? (darkMode ? "rgba(99,102,241,0.12)" : "rgba(22,119,255,0.08)")
                        : "transparent",
                      color: isActiveGroup
                        ? "#1677ff"
                        : (darkMode ? "#e4e4e7" : "#4b5563"),
                      transition: "background 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!isActiveGroup) e.currentTarget.style.background = darkMode ? "#27272a" : "#f3f4f6" }}
                    onMouseLeave={(e) => { if (!isActiveGroup) e.currentTarget.style.background = "transparent" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      {collapsedGroups.has(g.id) ? (
                        <ChevronRight size={14} style={{ opacity: 0.7 }} />
                      ) : (
                        <ChevronDown size={14} style={{ opacity: 0.7 }} />
                      )}
                      <FolderOpen size={15} strokeWidth={1.5} />
                      <span style={{ fontSize: 12, fontWeight: isActiveGroup ? 600 : 500 }}>{g.name}</span>
                    </div>
                    <Dropdown trigger={["click"]} placement="bottomLeft"
                      menu={{
                        items: [
                          { key: "del-group", icon: <Trash2 size={12} />,
                            label: <span style={{ color: "#ef4444" }}>删除分组</span> },
                        ],
                        onClick: () => deleteGroup(g.id),
                      }}
                    >
                      <button onClick={(e) => e.stopPropagation()}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center",
                          width: 20, height: 20, borderRadius: 4, border: "none", background: "transparent",
                          cursor: "pointer", color: isActiveGroup ? "#1677ff" : (darkMode ? "#71717a" : "#9ca3af"),
                          opacity: isActiveGroup ? 1 : 0,
                          transition: "opacity 0.15s" }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                        onMouseLeave={(e) => { if (!isActiveGroup) e.currentTarget.style.opacity = "0" }}
                      >
                        <MoreHorizontal size={12} />
                      </button>
                    </Dropdown>
                  </div>
                  {!collapsedGroups.has(g.id) && (sessionsByGroup[g.id] || []).length > 0 && (
                    <Conversations
                      menuable
                      onActiveChange={(key: string) => { setSessionId(String(key)); loadSessionMessages(String(key) as any) }}
                      onDelete={(info: any) => deleteSession(String(info.key))}
                      items={groupedSessionItems[g.id] || []}
                      styles={{ item: { borderRadius: 8, padding: "6px 10px 6px 32px", marginBottom: 1 } }}
                    />
                  )}
                </div>
                )
              })}

              {/* 最近对话（未分组的）- 紧贴左侧 */}
              <div style={{ padding: "10px 4px 4px" }}>
                <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>最近对话</span>
              </div>

              {/* 最近对话列表 */}
              <Conversations
                menuable
                onActiveChange={(key: string) => { setSessionId(String(key)); loadSessionMessages(String(key) as any) }}
                onDelete={(info: any) => deleteSession(String(info.key))}
                items={recentSessionItems}
                styles={{ item: { borderRadius: 8, padding: "7px 10px 7px 32px", marginBottom: 1 } }}
              />

              {/* 底部留白（探索入口已移至上方侧边栏） */}

            </div>
            {/* ===== 配额指示器（积分制度） ===== */}
            {(quotaInfo || creditInfo) && (
              <div
                onClick={() => setShowPlanDialog(true)}
                style={{
                  padding: "8px 14px",
                  cursor: "pointer",
                  borderTop: darkMode ? "1px solid #27272a" : "1px solid #f0f0f0",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#27272a" : "#f5f5f5" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
              >
                {creditInfo ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: darkMode ? "#a1a1aa" : "#6b7280", fontWeight: 500 }}>
                        本月积分
                      </span>
                      <span style={{ fontSize: 11, color: darkMode ? "#d4d4d8" : "#374151", fontWeight: 600 }}>
                        {creditInfo.canUse
                          ? `${creditInfo.totalRemaining.toFixed(1)} 积分`
                          : <span style={{ color: "#ef4444" }}>积分不足</span>}
                        {creditInfo.balance > 0 && (
                          <span style={{ color: "#1677ff", marginLeft: 6 }}>+{creditInfo.balance.toFixed(1)}</span>
                        )}
                      </span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: darkMode ? "#27272a" : "#e5e7eb", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${Math.min(100, creditInfo.canUse ? 100 : 100)}%`,
                        background: creditInfo.canUse ? "#1677ff" : "#ef4444",
                        borderRadius: 2,
                        transition: "width 0.3s",
                        opacity: 0.7,
                      }} />
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: darkMode ? "#a1a1aa" : "#6b7280", fontWeight: 500 }}>
                        AI 配额
                      </span>
                      <span style={{ fontSize: 11, color: darkMode ? "#d4d4d8" : "#374151" }}>
                        {quotaInfo!.reason === 'membership_required'
                          ? <span style={{ color: "#1677ff" }}>升级解锁</span>
                          : quotaInfo!.daily_limit >= 999999
                            ? "无限"
                            : `${quotaInfo!.daily_usage}/${quotaInfo!.daily_limit}`
                        }
                        {quotaInfo!.reason !== 'membership_required' && quotaInfo!.balance > 0 && (
                          <span style={{ color: "#1677ff", marginLeft: 6 }}>+{quotaInfo!.balance}</span>
                        )}
                      </span>
                    </div>
                    {quotaInfo!.reason !== 'membership_required' && quotaInfo!.daily_limit < 999999 && quotaInfo!.daily_limit > 0 && (
                      <div style={{ height: 3, borderRadius: 2, background: darkMode ? "#27272a" : "#e5e7eb", overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${Math.min(100, (quotaInfo!.daily_usage / quotaInfo!.daily_limit) * 100)}%`,
                          background: quotaInfo!.daily_usage >= quotaInfo!.daily_limit ? "#ef4444" : "#1677ff",
                          borderRadius: 2,
                          transition: "width 0.3s",
                        }} />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ===== 底部用户区 ===== */}
            <Dropdown
              menu={{
                items: [
                  { key: "settings", icon: <SettingsIcon size={14} />, label: "设置" },
                  { type: "divider" as const },
                  { key: "darkMode", icon: <Moon size={14} />, label: darkMode ? "浅色模式" : "深色模式" },
                  { type: "divider" as const },
                  { key: "logout", icon: <LogOut size={14} />, label: "退出登录" },
                ],
                onClick: handleUserMenuClick,
              }}
              trigger={["click"]}
              placement="topRight"
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px",
                cursor: "pointer",
              }}>
                <AntAvatar size={32} src={user?.avatar_url} style={{ backgroundColor: darkMode ? "rgba(22,119,255,0.18)" : "#e6f4ff", color: "#1677ff", flexShrink: 0, fontSize: 14 }}>
                  {user?.username?.[0]?.toUpperCase() || "B"}
                </AntAvatar>
                <span style={{ fontSize: 13, fontWeight: 500, color: darkMode ? "#e4e4e7" : "#374151" }}>
                  {user?.username || "管理员"}
                </span>
              </div>
            </Dropdown>
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
          {/* 卡片容器：圆角 + 白色背景 */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            background: darkMode ? "#0a0a0c" : "#fff",
            borderRadius: 12, overflow: "hidden",
            minHeight: 0,
          }}>
            {/* Top bar */}
            <div className={cn(
              "h-12 flex items-center gap-3 px-4 shrink-0",
              darkMode ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900"
            )}>
              {!sidebarOpen && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}
                    className={cn(
                      "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      darkMode ? "text-zinc-300" : "text-zinc-600"
                    )}
                    title="展开侧边栏"
                  >
                    <PanelLeftOpen size={17} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={createNewSession}
                    className={cn(
                      "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      darkMode ? "text-zinc-300" : "text-zinc-600"
                    )}
                    title="新建对话"
                  >
                    <Plus size={17} />
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-center gap-2">
                <DynamicModelSelector
                  value={selectedModel || aiSettings?.model || ""}
                  onValueChange={(id) => {
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
                  }}
                />
                <PredictiveInsightCard onTrigger={(prompt) => handleSend(prompt)} />
              </div>
              <div className="flex-1" />
              {/* 🔔 AI 主动守护通知铃铛 */}
              <GuardianAlertBell />
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
                approvalMode={approvalMode}
                setApprovalMode={setApprovalMode}
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
                enableSearch={enableSearch}
                setEnableSearch={setEnableSearch}
                hasSearchTool={availableTools.some(t => t.name.includes("search") || t.name.includes("exa") || t.name.includes("brave"))}
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
                      onMouseEnter={onPromptsHoverStart}
                      onMouseLeave={onPromptsHoverEnd}
                    >
                      <SmartPromptsWrapper
                        messages={messages}
                        aiSettings={aiSettings}
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
                background: darkMode ? "rgba(22,119,255,0.12)" : "rgba(22,119,255,0.08)",
                border: `1px solid ${darkMode ? "rgba(22,119,255,0.25)" : "rgba(22,119,255,0.20)"}`,
                borderRadius: 8,
                fontSize: 12, color: darkMode ? "#b3d9ff" : "#1677ff",
              }}>
                <span style={{ fontWeight: 500 }}>
                  计划模式中 · AI 将先调研并提交计划，你审批后才会执行
                </span>
                <button
                  onClick={() => setEnablePlanning(false)}
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    color: darkMode ? "#b3d9ff" : "#1677ff", fontSize: 12,
                    padding: "2px 8px", borderRadius: 6,
                  }}
                >
                  退出
                </button>
              </div>
            )}
            <ChatSenderInput
                darkMode={darkMode}
                input={input}
                setInput={setInput}
                onSend={(text) => handleSend(text)}
                isLoading={isLoading}
                attachments={attachments}
                onSelectFiles={onSelectFiles}
                onRemoveAttachment={removeAttachment}
                onPaste={handlePaste}
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
                availableTools={availableTools}
                onCancel={handleStop}
                approvalMode={approvalMode}
                setApprovalMode={setApprovalMode}
              />
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

        {/* 报告查看 Drawer — 点击"查看报告"按钮真正展示报告内容 */}
        <Drawer
          open={!!reportData}
          onClose={() => setReportData(null)}
          placement="right"
          width="min(520px, 92vw)"
          destroyOnClose
          closeIcon={<X size={14} strokeWidth={1.5} style={{ color: '#8c8c8c' }} />}
          title={
            <Flex align="center" gap={8}>
              <FileText size={15} strokeWidth={1.75} style={{ color: '#1677ff' }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(0,0,0,0.88)' }}>
                {reportData?.title || "AI 智能生成报告"}
              </span>
            </Flex>
          }
          styles={{
            body: { padding: 0, background: darkMode ? '#0a0a0a' : '#fafafa' },
            header: {
              padding: '12px 16px',
              borderBottom: `1px solid ${darkMode ? '#27272a' : '#f0f0f0'}`,
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
                  borderTop: `1px solid ${darkMode ? '#27272a' : '#f0f0f0'}`,
                  background: darkMode ? '#0f0f10' : '#fff',
                }}
              >
                {/* 左侧：辅助操作 */}
                <Flex gap={4} align="center">
                  <Tooltip title="下载 HTML">
                    <AntButton
                      type="text"
                      size="small"
                      icon={<Download size={14} strokeWidth={1.5} />}
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
                      icon={<FileText size={14} strokeWidth={1.5} />}
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
                      icon={<ExternalLink size={14} strokeWidth={1.5} />}
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
                  icon={<FolderInput size={13} strokeWidth={1.75} />}
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
              background: "rgba(0,0,0,0.2)", backdropFilter: "blur(2px)",
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
                            ? (darkMode ? "#e4e4e7" : "#111827")
                            : (darkMode ? "#71717a" : "#9ca3af"),
                          background: "none", border: "none", cursor: "pointer",
                        }}
                      >
                        {t.label}
                        {active && (
                          <span style={{
                            position: "absolute", left: "50%", bottom: 0,
                            transform: "translateX(-50%)",
                            width: 20, height: 2, borderRadius: 1,
                            background: darkMode ? "#e4e4e7" : "#111827",
                          }} />
                        )}
                      </button>
                    )
                  })}
                </div>
                <button onClick={() => setSearchPanelOpen(false)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center",
                    width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent",
                    cursor: "pointer", color: darkMode ? "#a1a1aa" : "#6b7280" }}
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
                  border: darkMode ? "1px solid #3f3f46" : "1px solid #e5e7eb",
                  borderRadius: 10,
                }}>
                  <Search size={15} style={{ color: darkMode ? "#a1a1aa" : "#9ca3af" }} />
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
                      background: "transparent", color: darkMode ? "#e4e4e7" : "#111827",
                    }}
                  />
                </div>
              </div>

              {/* 列表 */}
              <div style={{ maxHeight: 360, overflowY: "auto", padding: "0 12px 12px" }}>
                {searchTab === "history" && getFilteredItems().length === 0 && (
                  <div style={{ padding: "32px 0", textAlign: "center", color: darkMode ? "#71717a" : "#9ca3af", fontSize: 13 }}>
                    {searchKeyword ? "没有匹配的对话" : "暂无历史对话"}
                  </div>
                )}
                {searchTab === "space" && getFilteredItems().length === 0 && (
                  <div style={{ padding: "32px 0", textAlign: "center", color: darkMode ? "#71717a" : "#9ca3af", fontSize: 13 }}>
                    {searchKeyword ? "没有匹配的空间文件" : "暂无空间文件"}
                  </div>
                )}
                {searchTab === "agent" && (
                  <div style={{ padding: "32px 0", textAlign: "center", color: darkMode ? "#71717a" : "#9ca3af", fontSize: 13 }}>
                    智能体功能开发中
                  </div>
                )}
                {getFilteredItems().map((item: any) => (
                  <div key={item.id} onClick={() => handlePickSearchItem(item)}
                    style={{
                      padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                      color: darkMode ? "#e4e4e7" : "#374151", fontSize: 13,
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "#27272a" : "#f3f4f6"}
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

      {/* 配额耗尽 / 升级提示弹窗 */}
      <Modal
        open={showPlanDialog}
        onCancel={() => setShowPlanDialog(false)}
        footer={null}
        width={420}
        centered
        title={null}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ textAlign: "center", padding: "32px 24px 24px" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: quotaInfo?.reason === 'membership_required'
              ? (darkMode ? "rgba(22,119,255,0.12)" : "#eff6ff")
              : (darkMode ? "rgba(239,68,68,0.12)" : "#fef2f2"),
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <span style={{ fontSize: 26 }}>{quotaInfo?.reason === 'membership_required' ? '🔒' : '⚠'}</span>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: darkMode ? "#e4e4e7" : "#111827" }}>
            {quotaInfo?.reason === 'membership_required' ? '升级会员解锁 AI 功能' : 'AI 配额已用尽'}
          </h3>
          <p style={{ fontSize: 13, color: darkMode ? "#a1a1aa" : "#6b7280", marginBottom: 20, lineHeight: 1.6 }}>
            {quotaInfo?.reason === 'membership_required'
              ? 'AI 功能仅限 Pro/Plus 会员使用，升级会员后即可解锁全部 AI 能力。'
              : quotaInfo?.reason === 'no_balance'
                ? '您的每日额度和额外余额均已用完。额度将在每日 0:00 重置，或联系管理员充值。'
                : '您的每日额度已用完。额度将在每日 0:00 重置，或联系管理员充值。'}
          </p>

          {/* 配额详情（仅非会员限制时显示） */}
          {quotaInfo && quotaInfo.reason !== 'membership_required' && (
            <div style={{
              display: "flex", justifyContent: "center", gap: 24,
              padding: "16px 0", marginBottom: 20,
              borderTop: `1px solid ${darkMode ? "#27272a" : "#f0f0f0"}`,
              borderBottom: `1px solid ${darkMode ? "#27272a" : "#f0f0f0"}`,
            }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#1677ff" }}>
                  {quotaInfo.daily_limit >= 999999 ? "∞" : quotaInfo.daily_limit}
                </div>
                <div style={{ fontSize: 11, color: darkMode ? "#71717a" : "#9ca3af", marginTop: 2 }}>每日限额</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: darkMode ? "#e4e4e7" : "#374151" }}>
                  {quotaInfo.daily_usage}
                </div>
                <div style={{ fontSize: 11, color: darkMode ? "#71717a" : "#9ca3af", marginTop: 2 }}>今日已用</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#52c41a" }}>
                  {quotaInfo.balance}
                </div>
                <div style={{ fontSize: 11, color: darkMode ? "#71717a" : "#9ca3af", marginTop: 2 }}>额外余额</div>
              </div>
            </div>
          )}

          {/* 会员等级说明 */}
          <div style={{
            background: darkMode ? "#18181b" : "#f9fafb",
            borderRadius: 8, padding: "12px 16px", marginBottom: 20,
            textAlign: "left",
          }}>
            <div style={{ fontSize: 12, color: darkMode ? "#71717a" : "#9ca3af", marginBottom: 6, fontWeight: 500 }}>会员等级</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: darkMode ? "#d4d4d8" : "#374151" }}>免费用户</span>
                <span style={{ color: darkMode ? "#71717a" : "#9ca3af" }}>不可使用 AI</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#1677ff", fontWeight: 500 }}>Pro 会员</span>
                <span style={{ color: "#1677ff" }}>70 次/天</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#1677ff", fontWeight: 500 }}>Plus 会员</span>
                <span style={{ color: "#1677ff" }}>无限使用</span>
              </div>
            </div>
          </div>

          <AntButton
            type="primary"
            block
            onClick={() => setShowPlanDialog(false)}
            style={{ height: 38, borderRadius: 8, fontWeight: 500 }}
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
