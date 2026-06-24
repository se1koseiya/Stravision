"use client"

import React, { useState, useEffect, useRef } from "react"
import { Image } from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { ConfigProvider, App, theme, Segmented, Button as AntButton, Menu, Avatar as AntAvatar, Layout as AntLayout, Space, Tooltip, Dropdown, Modal, Input } from "antd"
import type { ConversationsProps } from "@ant-design/x"
import { Conversations, Prompts } from "@ant-design/x"
import type { PromptsProps } from "@ant-design/x"
import { BulbOutlined, InfoCircleOutlined, RocketOutlined, SmileOutlined } from '@ant-design/icons'
import zhCN from "antd/locale/zh_CN"
import type { UserPublic } from "@/lib/db/user-service"
import { Mic, MicOff, RotateCcw, Copy, Trash, SquarePen, Library, CircleHelp, PanelLeftClose, PanelLeftOpen, CheckCircle2, AlertCircle, Loader2, Globe, ImageIcon, FileText, Sun, Activity, Sprout, Zap, ArrowUpRight, Wand2, Download, Phone, Play, Pause, Volume2, VolumeX, Camera, Signal, Cpu, Home, Brain, House, Compass, MessageSquare, ChevronUp, ChevronRight, Circle, Clock, Info, MoreHorizontal, Pencil, Pin, Share, List, FolderInput, Trash2, FolderOpen, Moon, Eye } from "lucide-react";
import { AtSign } from "@/components/animate-ui/icons/at-sign";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandInput as CommandInputUI, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false })
const MessageWithReport = dynamic(() => import("@/components/ai/message-with-report").then(mod => ({ default: mod.MessageWithReport })), { ssr: false })
const ReportRenderer = dynamic(() => import("@/components/ai/report-renderer"), { ssr: false })
const MermaidChart = dynamic(() => import("@/components/mermaid-chart"), {
  ssr: false,
  loading: () => <div className="p-4 text-xs text-zinc-400">Loading diagram...</div>
})

const ChartRenderer = dynamic(() => import("@/components/chart-renderer"), {
  ssr: false,
  loading: () => <div className="p-4 text-xs text-zinc-400">Loading chart...</div>
})

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
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
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
import { AgentThoughtChain, type AgentStep } from "@/app/ai-assistant/_components/agent-thought-chain"
import QwenVoiceInput from "@/components/ui/qwen-voice-input"
import { Qwen, DeepSeek, Moonshot, Zhipu, Minimax } from '@lobehub/icons';
import { parseScheduleTask, removeScheduleTaskTag, getScheduleTaskSystemPrompt } from '@/lib/ai/schedule-task-parser'
import { filterDisabledFeatures } from '@/lib/ai/prompt-templates'

// BrowserActivity, WebPreview — 已改为 dynamic import

// DeviceControlCard, HTMLPreviewCard — 已改为 dynamic import
import { AIControlBorderEffect } from "@/components/ai/ai-control-border-effect"
import { DynamicModelSelector } from "@/components/ai/dynamic-model-selector"

// LiveStreamPlayer — 已改为 dynamic import
import { ModernHomeView } from "@/components/ai/modern-home-view"
import { MateChatHome } from "@/components/ai/matechat-home"
import { CapabilitiesCard } from "@/components/ai/capabilities-card"
import type { Citation, TaskItemModel, TaskModel, Message, AISettings, SessionMeta } from "@/app/ai-assistant/types"
import { isVLMModel, getCanonicalSignature, isIoTCommand as checkIoTCommand, filterDisabledFeatures as filterFeatures, DEVICE_NAMES, MCP_SERVER_TOOLS, getGreetingByHour } from "@/app/ai-assistant/_utils/helpers"
import { DynamicTaskPlanner } from "@/app/ai-assistant/_components/dynamic-task-planner"
import { PremiumReportLoader } from "@/app/ai-assistant/_components/premium-report-loader"
import { ChatMessageRenderer } from "@/app/ai-assistant/_components/chat-message-renderer"
import { ChatBubbleList } from "@/app/ai-assistant/_components/chat-bubble-list"
import { ChatSenderInput } from "@/app/ai-assistant/_components/chat-sender-input"
import { useTTSEngine } from "@/app/ai-assistant/_hooks/use-tts-engine"
import { handleDownloadPDF, createSelectFilesHandler, createPasteHandler, handleSettingsSave as saveSettings, copyMessageText } from "@/app/ai-assistant/_utils/message-actions"

export default function AIAssistantPage() {
  return (
    <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-zinc-950 text-emerald-400">Loading AI Assistant...</div>}>
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
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>("")
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  const [enableSearch, setEnableSearch] = useState(false)
  const [enableReasoning, setEnableReasoning] = useState(false)
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
  const [enableMcp, setEnableMcp] = useState(true) // MCP Toggle
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
  const [newGroupName, setNewGroupName] = useState("")
  const [showNewGroupInput, setShowNewGroupInput] = useState(false)
  
  // ===== 我的空间 - 报告列表 =====
  type SpaceReport = { id: string; title: string; type: string; timestamp: number; html?: string }
  const [spaceReports, setSpaceReports] = useState<SpaceReport[]>(() => {
    try { return JSON.parse(localStorage.getItem("my-space-reports") || "[]") } catch { return [] }
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

  // ===== 我的空间 - 报告操作函数 =====
  
  /** 格式化报告时间 */
  const formatReportTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    if (isToday) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }).replace(/:/g, '-')
    }
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + 
           ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }).replace(/:/g, '-')
  }

  /** 下载报告为HTML文件 */
  const downloadReport = (report: SpaceReport) => {
    if (!report.html) return
    const blob = new Blob([report.html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.title}_${formatReportTime(report.timestamp)}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /** 在新标签页中打开查看报告 */
  const openReportInNewWindow = (report: SpaceReport) => {
    if (!report.html) return
    const blob = new Blob([report.html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  /** 删除我的空间中的报告 */
  const deleteSpaceReport = (id: string) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除此报告吗？",
      okText: "删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk() {
        setSpaceReports(prev => {
          const updated = prev.filter(r => r.id !== id)
          localStorage.setItem("my-space-reports", JSON.stringify(updated))
          return updated
        })
      }
    })
  }

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
  const [attachments, setAttachments] = useState<string[]>([])
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
      await fetch('/api/scheduler/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: description,
          execute_at,
          action_type: taskType === 'analysis' ? 'agent' : taskType === 'reminder' ? 'reminder' : taskType,
          params: payload || {}
        })
      })
      console.log('[Unified Scheduler] Legacy tag task saved to DB:', description)
    } catch (e) {
      console.error('[Unified Scheduler] Failed to save legacy tag task:', e)
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
            // 如果已到执行时间（容忍2分钟过期）
            if (executeTime && executeTime <= now && (now - executeTime < 120000)) {
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
            } else if (executeTime && now - executeTime >= 120000) {
              // 已经过期太久的任务，直接删除
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
  
  // 打开Studio并显示报告（仅打开，不保存）
  const onOpenStudio = (reportTitle: string, reportHtml: string) => {
    console.log('[onOpenStudio] Called with:', { reportTitle, htmlLength: reportHtml.length })
    setReportData({
      title: reportTitle,
      html: reportHtml,
      timestamp: Date.now()
    })
    setStudioTab('report')
    setStudioOpen(true)
  }

  // 生成报告时调用：打开 + 自动保存到我的空间（去重）
  const generateAndSaveReport = (reportTitle: string, reportHtml: string) => {
    onOpenStudio(reportTitle, reportHtml)

    // 去重检查：相同标题不重复添加
    setSpaceReports(prev => {
      const exists = prev.some(r => r.title === reportTitle)
      if (exists) return prev

      const newReport: SpaceReport = {
        id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: reportTitle,
        type: "报告",
        timestamp: Date.now(),
        html: reportHtml
      }
      const updated = [newReport, ...prev].slice(0, 50)
      localStorage.setItem("my-space-reports", JSON.stringify(updated))
      return updated
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
      setAttachments([imageData])
      
      // 设置输入框内容
      setInput(prompt)
      
      // 自动发送消息
      setTimeout(() => {
        handleSend(prompt, [imageData])
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
  const { deviceData } = useDeviceData()
  const { weatherData } = useWeatherContext()

  // 使用 Ref 追踪最新的数据，避免闭包陷阱
  const deviceDataRef = useRef(deviceData)
  const weatherDataRef = useRef(weatherData)

  useEffect(() => { deviceDataRef.current = deviceData }, [deviceData])
  useEffect(() => { weatherDataRef.current = weatherData }, [weatherData])

  // 命令执行历史记录，用于防抖和循环检测
  const commandHistoryRef = useRef<{ signature: string, timestamp: number }[]>([])
  const executionLoopCountRef = useRef(0)
  const rootIntentRef = useRef<string>("")

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
    
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`)
      if (res.ok) {
        const data = await res.json()
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages)
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
    
    // 3. 清除所有状态
    setIsLoading(false)
    setAgentStatus("")
    setIsExecutingControl(false)
    setDevicePillExpanded(false)
    setExecutingDeviceName("")
    
    // 4. 添加一条系统消息提示
    setMessages(prev => [...prev, { role: "assistant", content: "🛑 已响应您的请求，立即停止所有操作 (Generation & Execution Terminated)。" }])
    
    // 5. 短暂显示通知
    showNotice("操作已强制终止", "AI 生成与设备控制已中断", "error")
  }

  const executeCommands = async (commands: any[], originalContent?: string) => {
    if (!commands || commands.length === 0) return
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
    let hasSentCustomFeedback = false

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
            handleSend('【系统反馈】设备控制功能已被管理员禁用，无法执行此操作。', [], true, true)
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
            handleSend('【系统反馈】设备控制功能已被管理员禁用，无法执行此操作。', [], true, true)
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
            handleSend('【系统反馈】设备控制功能已被管理员禁用，无法执行此操作。', [], true, true)
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
            const feedbackMsg = `【系统反馈】云台已经在最左侧（${currentPos.toFixed(1)}mm / 700mm），无法继续左移。请选择右移（direction: 2）或停止（direction: 0）。`
            handleSend(feedbackMsg, [], true, true)
            hasSentCustomFeedback = true
            continue // 跳过这个命令
          }
          
          // 检查右边界
          if (direction === 2 && currentPos >= 690) {
            showNotice("云台控制失败", `已经在最右侧（${currentPos.toFixed(1)}mm），无法继续右移`, "error")
            const feedbackMsg = `【系统反馈】云台已经在最右侧（${currentPos.toFixed(1)}mm / 700mm），无法继续右移。请选择左移（direction: 1）或停止（direction: 0）。`
            handleSend(feedbackMsg, [], true, true)
            hasSentCustomFeedback = true
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
            
            // 检查是否是边界错误，如果是则发送反馈给AI
            if (err.includes('边界') || err.includes('limit') || err.includes('已经到达') || err.includes('原点')) {
              const feedbackMsg = `【系统反馈】云台移动失败：${err}。当前位置：${currentPos.toFixed(1)}mm / 700mm。请重新分析位置并选择正确的移动方向，或停止移动。`
              handleSend(feedbackMsg, [], true, true)
              hasSentCustomFeedback = true
            }
            
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
            handleSend('【系统反馈】视觉巡检功能已被管理员禁用，无法执行此操作。', [], true, true)
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
          setVisionInspectionStatus("初始化巡检任务...")

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
                  
                  const feedbackMsg = `【系统反馈】云台移动失败：${errorMsg}。请重新分析当前位置和目标位置，选择正确的移动方向。`
                  handleSend(feedbackMsg, [], true, true)
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
            showNotice("❌ 视觉巡检失败", "摄像头未配置或不可用", "error")
            // 告知 AI 摄像头不可用
            handleSend(`【系统反馈】视觉巡检失败：摄像头${cameraId === 'b' ? 'B' : 'A'}未配置或不可用。管理员尚未在后台设置摄像头地址。请告知用户无法进行视觉巡检，并使用传感器数据替代。`, [], true, true)
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
            showNotice("❌ 截图失败", err?.message || '未知错误', "error")
            // 告知 AI 截图失败
            handleSend(`【系统反馈】视觉巡检截图失败：${err?.message || '未知错误'}。摄像头画面可能尚未加载完成或网络问题。请告知用户截图失败，并建议稍后重试或使用传感器数据。严禁编造画面内容。`, [], true, true)
            hasSentCustomFeedback = true
            break
          } finally {
            setInspectionCameraUrl(null)
          }

          if (!capturedImageBase64) {
            setIsInspecting(false)
            showNotice("❌ 截图为空", "未能获取到摄像头画面", "error")
            handleSend('【系统反馈】视觉巡检截图为空，摄像头可能未正常工作。严禁编造画面内容。', [], true, true)
            hasSentCustomFeedback = true
            break
          }

          // Step 4: 发送截图给 AI (VLM 多模态消息)
          showNotice("🧠 视觉巡检", "正在让 AI 分析画面...", "loading")
          
          let taskContext = "";
          if (originalContent && autoExecuteCommands) {
               const match = originalContent.match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/);
               if (match) {
                   taskContext = `\n\n【当前任务进度快照】\n${match[0]}\n\n请基于上述进度更新任务状态（例如将当前 in_progress 的任务改为 completed，并将下一个任务设为 in_progress）。这是任务驱动式巡检的一部分，请继续生成下一步的指令。`;
               }
          }

          const visionMessage = [
            { type: "image_url", image_url: { url: capturedImageBase64 } },
            { type: "text", text: `【系统反馈】这是从摄像头 ${cameraId === 'b' ? 'B' : 'A'} 捕获的实时画面。\n请基于该图片回答问题：${query}${taskContext}\n\n**重要指令**：\n1. 请分析上述画面，并向用户提供最终的总结报告。\n2. **验证与推进**：请评估当前任务是否达成，若达成请将其设为 completed。如果还有下一个任务，请继续思考并输出下一个操作的 JSON 指令；如果所有任务已完成，请停止操作，严禁再次输出任何 JSON 控制指令。` }
          ]

          // 如果当前批次中包含视觉巡检，将其标记为 hasSentCustomFeedback = true
          // 这将阻止 executeCommands 末尾再次发送“指令已执行完毕”的闭环反馈
          hasSentCustomFeedback = true
          
          setInspectionStatus("完成巡检分析。");
          showNotice("✅ 视觉巡检", "画面已发送给 AI 分析", "success")

          // 立即清理视觉巡检状态，避免闪烁
          setVisionInspectionUrl(null)
          setVisionInspectionStatus('')
          
          // 直接调用 handleSend 发送多模态消息 (bypass loading guard via isSilent=true)
          // isFeedback=true 确保允许穿透 loading 锁
          // isSilent=true 确保这条包含截图的丑陋 Prompt 消息不会显示在用户的聊天气泡中，仅作为 AI 视角的内部输入
          handleSend(visionMessage as any, [], true, true)
          
          // 延迟清理 isInspecting 状态
          setTimeout(() => setIsInspecting(false), 500)
          
          // 重要：完成视觉巡检后立即跳出当前指令执行循环，避免后续代码继续触发全局反馈循环
          break;
        } else if (cmd.action === "take_camera_snapshot") {
          // 🔥 检查视觉巡检功能是否被禁用
          if (aiFeatures.enableVisionInspection === false) {
            console.log('[Camera Snapshot] Feature disabled by admin')
            showNotice("❌ 功能已禁用", "管理员已禁用摄像头截图功能", "error")
            handleSend('【系统反馈】摄像头截图功能已被管理员禁用，无法执行此操作。', [], true, true)
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
            handleSend(`【系统反馈】截图失败：摄像头${cameraId === 'b' ? 'B' : 'A'}未配置或不可用。`, [], true, true)
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
            showNotice("❌ 截图失败", err?.message || '未知错误', "error")
            handleSend(`【系统反馈】截图失败：${err?.message || '未知错误'}。`, [], true, true)
            hasSentCustomFeedback = true
            break
          } finally {
            // 延迟一点关闭，避免 UI 突然消失造成闪烁
            setTimeout(() => {
               setInspectionCameraUrl(null)
               setIsInspecting(false);
            }, 1000)
          }

          if (!capturedImageBase64) {
            showNotice("❌ 截图为空", "未能获取到摄像头画面", "error")
            handleSend('【系统反馈】截图为空，摄像头可能未正常工作。', [], true, true)
            hasSentCustomFeedback = true
            break
          }

          setInspectionStatus("完成截图。");
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

          // 对于 take_camera_snapshot，原本只是把图片塞给用户看，现在我们也触发一次 AI 内部的思考和总结
          // 这样用户问“长得咋样”时，AI 除了展示截图，还能紧接着输出分析文本。
          
          let taskContext = "";
          if (originalContent && autoExecuteCommands) {
               const match = originalContent.match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/);
               if (match) {
                   taskContext = `\n\n【当前任务进度快照】\n${match[0]}\n\n请基于上述进度更新任务状态（例如将当前 in_progress 的任务改为 completed，并将下一个任务设为 in_progress）。`;
               }
          }

          // 将系统反馈伪装成一条 user 消息发给 AI，这样 AI 就能通过视觉模型看到图片
          // 因为只有 user 角色的消息才允许包含多模态图片
          const snapshotMessage = [
            { type: "image_url", image_url: { url: capturedImageBase64 } },
            { type: "text", text: `【系统反馈】这是你刚刚请求获取的摄像头 ${cameraId === 'b' ? 'B' : 'A'} 实时截图。\n刚才图片已经展示给用户看了。现在，请你**仔细观察这张真实的画面，分析其中的作物生长情况、设备状态或任何异常**，并给出专业的分析描述。${taskContext}\n\n**重要指令**：\n1. 你必须真实地描述这张图片里的内容，不要编造！如果画面是黑的或者空的，请如实回答。\n2. **验证与推进**：请评估当前任务是否达成，若达成请将其设为 completed。如果还有下一个任务，请继续思考并输出下一个操作的 JSON 指令；如果所有任务已完成，请停止操作。` }
          ]

          // 标记已发送闭环反馈，阻止执行队列底部的默认反馈
          hasSentCustomFeedback = true

          // 静默发送给大模型，让大模型自己输出分析文本
          // handleSend(overrideText, overrideAttachments, isFeedback, isSilent)
          setTimeout(() => {
            handleSend(snapshotMessage as any, [], true, true)
          }, 100)
          
          break;
        } else if (cmd.action === "reset_camera") {
          // 🔥 检查设备控制功能是否被禁用
          if (aiFeatures.enableDeviceControl === false) {
            console.log('[Device Control] Feature disabled by admin')
            showNotice("❌ 功能已禁用", "管理员已禁用设备控制功能", "error")
            handleSend('【系统反馈】设备控制功能已被管理员禁用，无法执行此操作。', [], true, true)
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
    
    // 如果该批次指令已经由特定操作（如视觉巡检截图）触发了它自己的 AI 闭环反馈，
    // 则跳过底部的全局状态反馈，避免产生两个并发对话流从而导致死循环。
    if (hasSentCustomFeedback) {
        setAgentStatus("")
        setIsLoading(false)
        return;
    }
    
    setAgentStatus("等待下位机响应: ESP32-S3 (超时 5000ms)...")
    
    // 异步执行反馈循环，以便可以被暂停
    const feedbackLoop = async () => {
        // Step 1: 等待设备响应
        const step1Start = Date.now()
        while (Date.now() - step1Start < 1500) {
            if (isStoppedRef.current) return
            while (isTaskPausedRef.current) {
                if (isStoppedRef.current) return
                await new Promise(r => setTimeout(r, 500))
                setAgentStatus("任务已暂停: 等待恢复...")
            }
            await new Promise(r => setTimeout(r, 100))
        }
        if (isStoppedRef.current) return
        
        setAgentStatus("重新采样: DHT11, BH1750, MH-Z19...")

        // Step 2: 等待重新采样
        const step2Start = Date.now()
        while (Date.now() - step2Start < 3500) {
            if (isStoppedRef.current) return
            while (isTaskPausedRef.current) {
                if (isStoppedRef.current) return
                await new Promise(r => setTimeout(r, 500))
                setAgentStatus("任务已暂停: 等待恢复...")
            }
            await new Promise(r => setTimeout(r, 100))
        }
        if (isStoppedRef.current) return

        // 自动更新客户端的 Task List 状态为 completed
        let hasPendingTasks = false;
        let nextContent = originalContent;
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
                } else if (t.status === "pending") {
                  hasPendingTasks = true;
                }
              });
              if (updated) {
                const newTaskListStr = `<TASK_LIST>${JSON.stringify(parsed)}</TASK_LIST>`;
                nextContent = originalContent.replace(/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/, newTaskListStr);
                
                setMessages(prev => {
                  const next = [...prev];
                  const idx = next.findLastIndex(m => m.role === 'assistant');
                  if (idx !== -1) {
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

        setAgentStatus("正在分析闭环控制反馈...")
        
        // 如果是自动执行模式，并且计划任务列表中仍有未完成的待执行任务（pending 状态），则继续发送反馈给 AI 进行下一步推进
        // 如果没有后续 pending 任务或没有任务列表，说明这是一键单次操作，执行完毕后直接结束，无需再循环请求 AI 浪费 token
        if (autoExecuteCommands && hasPendingTasks) {
            let taskContext = "";
            if (nextContent) {
                 const match = nextContent.match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/);
                 if (match) {
                     taskContext = `\n\n【当前任务进度快照】\n${match[0]}\n\n请基于上述进度更新任务状态（例如将当前 in_progress 的任务改为 completed，并将下一个任务设为 in_progress）。`;
                 }
            }

            // 将反馈过程记录到 Agent 执行链中，而不是显示在聊天气泡里
            const feedbackStepId = `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
            setAgentSteps(prev => [...prev, {
                id: feedbackStepId,
                type: "observation",
                status: "active",
                title: "任务推进中",
                detail: "正在推进到下一个任务步骤...",
                startedAt: Date.now()
            }])

            const rootIntent = rootIntentRef.current || "刚才的指令";
            
            // 恢复使用静默模式 (isSilent: true)，保持聊天记录整洁
            await handleSend(`指令已执行完毕。

请根据系统提供的【当前最新数据】判断执行效果，并决定下一步操作。
${taskContext}
**核心原则与原始意图回顾：**
1. 我已开启【自动托管模式】，请直接继续。
2. **遵守原始指令（最高优先级）**：用户的初始意图是：“${rootIntent}”。必须严格回顾此意图，严禁违背！
3. **状态验证**：分析当前设备状态是否已符合预期。
4. **决策下发**：请将刚才完成的任务标记为 completed。发现列表中仍有 pending 的任务步骤，请继续执行下一个任务步骤，输出相应的 JSON 指令。`, [], true, true)

            // 更新步骤为已完成
            setAgentSteps(prev => prev.map(s => s.id === feedbackStepId ? { ...s, status: "completed", durationMs: Date.now() - s.startedAt } : s))
        } else {
            // 没有后续待执行任务步骤，直接结束流式控制并解锁状态
            setAgentStatus("") 
            setIsLoading(false)
            console.log('[Agent Flow] No pending tasks or single command. Finished executing commands directly to save tokens and avoid loops.')
        }
    }
    
    await feedbackLoop()
  }

  const handleSend = async (
    overrideText?: any, 
    overrideAttachments?: string[], 
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

    const userMessageContent: Message['content'] = typeof overrideText !== "undefined"
      ? overrideText // 如果有 overrideText，直接使用它（可能已经是包含图片的数组）
      : (currentAttachments.length > 0
        ? [
          { type: "text", text: userMsg },
          ...currentAttachments.map(url => ({ type: "image_url" as const, image_url: { url } }))
        ]
        : userMsg)

    if (userMsg === "是" || userMsg === "执行") {
      const lastAssistantMsg = messages[messages.length - 1]
      if (lastAssistantMsg && lastAssistantMsg.role === "assistant") {
        const jsonMatches = [...(lastAssistantMsg.content as string).matchAll(/```json\s*([\s\S]*?)```/g)]
        if (jsonMatches.length > 0) {
          const commands = []
          for (const match of jsonMatches) {
            try { commands.push(JSON.parse(match[1])) } catch { }
          }
          if (commands.length > 0) await executeCommands(commands)
        }
      }
      return
    }

    const userMessage: Message = { role: "user", content: userMessageContent, isSilent }
    
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

        // 保存消息到会话时，确保正确序列化消息内容
        // 这里使用 currentMessagesForApi 确保包含了刚刚插入的那条消息
        const messagesToSave = currentMessagesForApi.map(m => {
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
      
      // 注入技能 (Skills) 数据
      if (mandatorySkillsEnabled && builtinSkills.length > 0) {
        const builtinPrompt = builtinSkills
          .map(s => `[${s.name} 模块]\n${s.content}`)
          .join('\n\n');
        effectiveSystemPrompt += `\n\n### 核心系统知识与行为规范 ###\n${builtinPrompt}`;
      }

      const activeStoreSkills = installedStoreSkills.filter(s => selectedStoreSkillIds.includes(s.skill_id));
      if (activeStoreSkills.length > 0) {
        const storePrompt = activeStoreSkills
          .map(s => `[${s.name} 增强模块]\n${s.content}`)
          .join('\n\n');
        effectiveSystemPrompt += `\n\n### 用户扩展功能模块 ###\n${storePrompt}`;
      }

      // ⚠️ 添加定时任务功能说明（放在前面，确保AI能看到）
      effectiveSystemPrompt += `\n\n${getScheduleTaskSystemPrompt()}`;

      if (autoExecuteCommands) {
        effectiveSystemPrompt += "\n\n【系统状态注入】当前处于：自动执行模式。\n严禁提问！严禁等待用户确认！\n必须直接输出 IoT 设备控制指令 JSON (如 toggle_relay)。\n注意：对于 MCP 工具 (如天气、搜索)，仍必须使用 Native Tool Calling！\n如果遇到问题，请自行尝试解决或跳过。";
      }
      
      // 根据权限模式调整系统提示词 - 让每个模式有明显区别
      if (approvalMode === 'auto') {
        effectiveSystemPrompt += `\n\n【替我审批模式 - 智能执行】
- 目标：平衡自动化和安全性
- 行为准则：
  1. 低风险操作（如查询、读取传感器、开关单个设备）直接执行
  2. 高风险操作（如批量控制、系统配置、数据删除）需主动征求用户确认
  3. 输出 JSON 控制指令前简要说明操作内容
  4. 如果参数不明确，使用合理的默认值
  5. 执行完成后简短汇报结果
- 示例：用户说"开灯" → 说明"即将开启照明灯" → 输出 JSON 开灯指令（自动执行）
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
  3. 然后输出 JSON 控制指令（系统会等待用户手动点击"执行"按钮确认）
  4. 提供建议但让用户做最终决定
  5. 如果不确定用户意图，主动询问
  6. 所有设备操作都需要用户手动确认
- 重要：你可以输出 JSON 控制指令，但系统会等待用户手动确认后才执行
- 示例：用户说"温度有点高" → 解释"当前32°C偏高，建议开启风扇降温" → 输出JSON风扇控制指令 → 用户点击"执行"按钮后才会真正执行`;
      }

      // 计划模式：生成详细的任务规划
      if (enablePlanning) {
        effectiveSystemPrompt += `\n\n【计划模式已启用】
- 对于复杂任务，必须先生成详细的执行计划
- 使用 <TASK_LIST> 标签输出任务规划，格式示例：

<TASK_LIST>
{
  "status": "in_progress",
  "tasks": [
    {
      "title": "分析环境数据",
      "items": [
        { "type": "text", "text": "读取温湿度传感器数据" },
        { "type": "text", "text": "读取光照传感器数据" }
      ],
      "status": "in_progress"
    },
    {
      "title": "制定调节方案",
      "items": [
        { "type": "text", "text": "根据数据分析最优参数" },
        { "type": "text", "text": "生成设备控制策略" }
      ],
      "status": "pending"
    },
    {
      "title": "执行环境调节",
      "items": [
        { "type": "text", "text": "调节灯光亮度" },
        { "type": "text", "text": "调节风扇转速" }
      ],
      "status": "pending"
    }
  ]
}
</TASK_LIST>

- 任务列表应该清晰展示执行步骤
- 第一个任务的 status 应设为 "in_progress"，其余为 "pending"
- 每个任务完成后，在下一次响应中更新状态
- 示例：用户说"优化草莓生长环境" → 先输出完整的 TASK_LIST 规划 → 然后逐步执行`;
      }

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

      if (overflowStringified.length > 25000 && nonMemoryMsgs.length > 5 && historyToSummarizeLength > 1000) {
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
          weatherData: weatherDataRef.current,
          mcpConfigs, // 添加 MCP 配置
          mandatorySkillsEnabled, // 传递核心技能开启状态
          enableMcp
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
        try {
          const errorData = JSON.parse(errorText)
          if (res.status === 403 && errorData.error && errorData.error.includes("今日免费额度已用完")) {
            setShowPlanDialog(true)
            setIsLoading(false)
            return
          }
        } catch (e) {
          // Ignore JSON parse error
        }
        throw new Error(`Failed to send message: ${res.status} - ${errorText}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")

      assistantMsg = { role: "assistant", content: "" }
      let reasoningText = ""
      let reasoningStart = -1
      const startTs = Date.now()
      setMessages(prev => [...prev, assistantMsg])

      // Agent execution chain steps - 初始化"深度思考"步骤
      // 唯一 ID 计数器，避免 flushSync 快速渲染时 Date.now() 撞车
      let _stepIdCounter = 0
      const nextStepId = (prefix: string) => `${prefix}-${Date.now()}-${_stepIdCounter++}`

      const currentAgentSteps: AgentStep[] = [
        {
          id: nextStepId("initial-thinking"),
          type: "thinking",
          status: "active",
          title: enablePlanning 
            ? "📋 规划任务中" 
            : approvalMode === "full" 
              ? "🧠 深度分析中" 
              : "💬 智能识别意图中",
          detail: enablePlanning
            ? "生成详细的任务执行计划和步骤分解"
            : approvalMode === "full" 
              ? "结合设备数据与历史经验进行多维度诊断" 
              : "解析上下文并匹配最佳知识模块",
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
            continue
          }
          
          if (trimmedLine.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmedLine.slice(6))
              
              // Handle explicit error from backend
              if (data.error) {
                 const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : String(data.error)
                 assistantMsg.content = `⚠️ Error: ${errorMsg}`
                 setMessages(prev => {
                    const newMsgs = [...prev]
                    newMsgs[newMsgs.length - 1] = { ...assistantMsg }
                    return newMsgs
                 })
                 continue
              }

              // 处理上下文更新事件 (持久化记忆压缩结果)
              if (data.type === 'context_update' && Array.isArray(data.messages)) {
                 // 强制同步主消息列表，让历史消息被压缩后的摘要替代
                 latestHistoryFromBackend = data.messages
                 setMessages(data.messages)
                 // 将当前正在生成的回复占位符重新追加回去
                 setMessages(prev => [...prev, assistantMsg])
                 continue
              }

              // Handle tool results
              if (data.tool_result) {
                 setStudioData(prev => [...prev, data.tool_result])
                 
                 if (data.tool_result.name === 'mcp_firecrawl_scrape' && data.tool_result.result?.url) {
                     const targetUrl = data.tool_result.result.url
                     setBrowserScreenshot(`https://image.thum.io/get/width/800/crop/600/noanimate/${targetUrl}`)
                 }

                 // Update execution chain: mark corresponding action as completed, add observation
                 const actionIdx = currentAgentSteps.findIndex(s => s.type === 'action' && s.status === 'active' && s.toolName === data.tool_result.name)
                 if (actionIdx !== -1) {
                   const step = currentAgentSteps[actionIdx]
                   step.status = 'completed'
                   step.duration = Date.now() - (step.startedAt || startTs)
                 }

                 const hasError = data.tool_result.result?.error
                 const resultSummary = hasError
                   ? String(data.tool_result.result.error).slice(0, 100)
                   : typeof data.tool_result.result === 'object'
                     ? JSON.stringify(data.tool_result.result).slice(0, 80)
                     : '数据已注入上下文'

                 currentAgentSteps.push({
                   id: nextStepId("obs"),
                   type: "observation",
                   status: hasError ? "error" : "completed",
                   title: hasError ? `${data.tool_result.name} 调用失败` : `${data.tool_result.name} 完成`,
                   detail: resultSummary,
                   duration: 0
                 })
                 setAgentSteps([...currentAgentSteps])
                 
                 continue
              }

              // Handle tool progress (parallel execution feedback)
              if (data.tool_progress) {
                const { completed, total, current } = data.tool_progress
                const existingIdx = currentAgentSteps.findIndex(
                  s => s.type === "thinking" && s.status === "active" && s.id === `progress-${current}`
                )
                if (existingIdx === -1) {
                  currentAgentSteps.push({
                    id: nextStepId("progress"),
                    type: "thinking",
                    status: "active",
                    title: `并行调用 ${completed + 1}/${total}`,
                    detail: current ? `正在执行: ${current}` : `工具调用进度 ${completed + 1}/${total}`,
                  })
                  setAgentSteps([...currentAgentSteps])
                }
                continue
              }

                // Handle tool calls feedback
              // 处理知识模块选取通知 (AI Skill Routing)
              if (data.skill_selection) {
                const skillNames = data.skill_selection.map((s: any) => s.name).join(", ")
                setAgentStatus(`智能识别意图，由 [${skillNames}] 模块提供支持...`)
                
                // Update the initial thinking step
                const thinkingIdx = currentAgentSteps.findIndex(s => s.type === 'thinking' && s.status === 'active')
                if (thinkingIdx !== -1) {
                   currentAgentSteps[thinkingIdx].status = 'completed'
                   currentAgentSteps[thinkingIdx].title = `🎯 路由到 ${skillNames}`
                   currentAgentSteps[thinkingIdx].detail = `匹配到 ${data.skill_selection.length} 个知识模块`
                   currentAgentSteps[thinkingIdx].duration = Date.now() - (currentAgentSteps[thinkingIdx].startedAt || startTs)
                   
                   // Start a NEW active step for subsequent reasoning
                   currentAgentSteps.push({
                      id: nextStepId("reasoning"),
                      type: "thinking",
                      status: "active",
                      title: "🤔 规划执行策略",
                      detail: "分析最佳行动路径与工具选择",
                      startedAt: Date.now()
                   })
                }
                
                setAgentSteps([...currentAgentSteps])
                continue
              }

              if (data.tool_calls) {
                const toolNames = data.tool_calls.map((t: any) => t.function.name).join(", ")
                const round = data.agent_iteration || 1
                setAgentStatus(`第 ${round} 轮工具调用: ${toolNames}...`)
                setStudioOpen(true) // 主动展开工作室侧边栏
                
                // 确保之前的 Thinking Step 或上一个 Action 已结束
                const prevActive = currentAgentSteps.find(s => s.status === 'active')
                if (prevActive) {
                   prevActive.status = 'completed'
                   prevActive.duration = Date.now() - (prevActive.startedAt || startTs)
                }

                // Add action steps to the execution chain (with round label)
                for (const tc of data.tool_calls) {
                  const fnName = tc.function.name
                  let actionTitle = `调用 ${fnName}`
                  if (fnName.includes('search')) actionTitle = '搜索外部知识'
                  else if (fnName.includes('scrape') || fnName.includes('firecrawl')) actionTitle = '抓取网页内容'
                  else if (fnName.includes('weather')) actionTitle = '查询天气数据'
                  else if (fnName.includes('spectrum')) actionTitle = '读取光谱传感器'
                  else if (fnName.includes('route') || fnName.includes('amap')) actionTitle = '路线规划'

                  // 多轮时加上轮次标签
                  if (round > 1) actionTitle = `[第${round}轮] ${actionTitle}`

                  let argsSummary = ''
                  try {
                    const args = JSON.parse(tc.function.arguments || '{}')
                    if (args.query) argsSummary = `查询: "${args.query}"`
                    else if (args.url) argsSummary = `URL: ${args.url}`
                    else if (args.location) argsSummary = `位置: ${args.location}`
                  } catch {}

                  currentAgentSteps.push({
                    id: nextStepId("action"),
                    type: "action",
                    status: "active",
                    title: actionTitle,
                    detail: argsSummary || `工具: ${fnName}`,
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
                  // ✅ Fix #1: 添加 Final Answer 步骤到执行链
                  if (currentAgentSteps.length > 0 && !currentAgentSteps.some(s => s.type === 'answer')) {
                    currentAgentSteps.push({
                      id: nextStepId("answer"),
                      type: "answer",
                      status: "active",
                      title: "📝 生成回复中",
                      detail: "基于分析结果组织语言输出",
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
                    
                    // 🔥 过滤空的或不完整的 AUTOMATION_STRATEGY 标签
                    // 检测空的 AUTOMATION_STRATEGY 标签（没有 JSON 内容的）
                    assistantMsg.content = assistantMsg.content.replace(/<\s*AUTOMATION_STRATEGY\s+[^>]*>\s*<\/\s*AUTOMATION_STRATEGY\s*>/g, (match) => {
                        console.warn('[Stream Filter] Removed empty AUTOMATION_STRATEGY tag')
                        return '' // 移除空标签
                    })
                    
                    // 检测不完整的 AUTOMATION_STRATEGY 标签（只有开始标签，没有结束标签或内容）
                    const hasCompleteAutomationTag = /<\s*AUTOMATION_STRATEGY\s+[^>]*>[\s\S]*?<\/\s*AUTOMATION_STRATEGY\s*>/.test(assistantMsg.content)
                    if (!hasCompleteAutomationTag) {
                        // 移除孤立的开始标签
                        assistantMsg.content = assistantMsg.content.replace(/<\s*AUTOMATION_STRATEGY\s+[^>]*>(?![\s\S]*?<\/\s*AUTOMATION_STRATEGY\s*>)/g, (match) => {
                            console.warn('[Stream Filter] Removed incomplete AUTOMATION_STRATEGY opening tag')
                            return ''
                        })
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
                    // 先检查是否有完整的标签对
                    const hasCompleteTag = /<TASK_LIST>[\s\S]*?<\/TASK_LIST>/.test(assistantMsg.content)
                    
                    if (!hasCompleteTag) {
                        // 只有在没有完整标签的情况下才过滤裸露的 JSON
                        
                        // 匹配包含 "tasks" 数组和 "status" 字段的 JSON 对象 - 增强版
                        const taskListJsonPattern = /\{\s*"(?:status|tasks)"[\s\S]*?"(?:tasks|status)"[\s\S]*?\}/g
                        assistantMsg.content = assistantMsg.content.replace(taskListJsonPattern, (match) => {
                            // 只移除包含 tasks 数组和 status 字段的 JSON
                            if (match.includes('"tasks"') && match.includes('"status"')) {
                                console.warn('[Stream Filter] Intercepted bare TASK_LIST JSON')
                                return '' // 完全移除
                            }
                            return match // 保留其他 JSON
                        })
                        
                        // 拦截不完整的 TASK_LIST JSON（流式输出时）
                        const incompleteTaskPattern = /\{\s*"status"\s*:\s*"(?:in_progress|completed|pending)"[\s\S]*?(?:"tasks"\s*:\s*\[[\s\S]*)?$/
                        if (incompleteTaskPattern.test(assistantMsg.content)) {
                            const lastBrace = assistantMsg.content.lastIndexOf('{')
                            if (lastBrace !== -1) {
                                const potentialJson = assistantMsg.content.slice(lastBrace)
                                if (potentialJson.includes('"tasks"') || potentialJson.includes('"status"')) {
                                    assistantMsg.content = assistantMsg.content.slice(0, lastBrace).trim()
                                }
                            }
                        }
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

      // Mark answer as completed (the ThoughtChain auto-collapses 2.5s later)
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
      if (autoExecuteCommands && typeof assistantMsg.content === 'string') {
        const jsonMatches = [...assistantMsg.content.matchAll(/```json\s*([\s\S]*?)```/g)]
        console.log('[Auto Execute] Found JSON blocks:', jsonMatches.length)
        if (jsonMatches.length > 0) {
          const commands = []
          for (const match of jsonMatches) {
            try { 
              const parsed = JSON.parse(match[1])
              if (Array.isArray(parsed)) {
                // 处理数组形式的命令
                parsed.forEach(cmd => {
                  if (cmd.action) commands.push(cmd)
                })
              } else if (parsed.action) {
                // 处理单个对象形式的命令
                commands.push(parsed)
              }
            } catch { }
          }
          if (commands.length > 0) {
            console.log('[Auto Execute] Executing commands automatically:', commands)
            // 再次检查是否已停止
            if (isStoppedRef.current) return;
            // 重要：如果在这次调用中已经触发了设备执行，标记本次会话不再需要通用反馈
            // 通过将 hasSentCustomFeedback 置为 true 避免循环嵌套
            await executeCommands(commands, assistantMsg.content as string)
          }
        }
      }

    } catch (e: any) {
      // 忽略用户主动停止任务的"错误"
      if (e?.message === "Task terminated by user" || e === "Task terminated by user") {
        console.log("[Chat] Task terminated by user (expected)")
        return
      }
      
      console.error("Chat error:", e)
      setMessages(prev => [...prev, { role: "assistant", content: "抱歉，发生了一些错误，请稍后再试。" }])
    } finally {
      // 只有在非静默/非反馈模式下，或者没有正在进行的后续任务时才清除状态
      // 避免内部触发的消息（如巡检反馈）在回复还没开始时就被父级的 finally 清除了状态，导致界面“抽搐”
      // 无论是否是静默模式，如果这是流的最后一点（最后没有触发 executeCommands）或者发生了错误，都应该尝试清理状态
      // 这里增加一层判断：如果 assistantMsg.content 里没找到 JSON 块，说明没有后续的 executeCommands，则必须清除状态
      const content = typeof assistantMsg.content === 'string' ? assistantMsg.content : '';
      const hasFollowupCommands = autoExecuteCommands && (content.includes('```json') || content.includes('"action":'));

      // 🔥 修复：立即清理状态，无论是否有后续命令
      // 后续命令的执行会在executeCommands中单独管理状态
      setAgentStatus("")
      setIsLoading(false)
      
      // 额外延迟清理一次，确保彻底结束（防止竞态条件）
      setTimeout(() => {
        if (!isStoppedRef.current && !hasFollowupCommands) {
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
        if (url) setAttachments((prev) => [...prev, url])
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
          if (url) setAttachments((prev) => [...prev, url])
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
          colorPrimary: "#10b981",
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
        darkMode ? "bg-zinc-950 text-zinc-100" : "bg-gray-50 text-zinc-900",
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
            background: darkMode ? "#18181b" : "#f7f8fa",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
            borderRight: darkMode ? "1px solid #27272a" : "none",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* ===== 顶部：标题（阿里妈妈数黑体）+ 搜索 + 折叠 ===== */}
            <div style={{ display: "flex", alignItems: "center", padding: "18px 16px 14px" }}>
              <span style={{ fontFamily: "AlimamaShuHeiTi, sans-serif", fontSize: 22, fontWeight: 700, color: darkMode ? "#e4e4e7" : "#111827" }}>莓小智</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => setEnableSearch(!enableSearch)}
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
            <div className="sidebar-scroll" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "2px 10px 0" }}>
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

              {/* 我的空间（可折叠） - 报告列表 */}
              <div>
                <div onClick={() => toggleGroupCollapse("my-space")}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 4px 6px", cursor: "pointer", userSelect: "none", color: darkMode ? "#a1a1aa" : "#4b5563" }}
                >
                  {collapsedGroups.has("my-space") ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  <FolderOpen size={15} strokeWidth={1.5} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: darkMode ? "#e4e4e7" : "#374151" }}>我的空间</span>
                </div>
                
                {/* 报告列表 */}
                {!collapsedGroups.has("my-space") && spaceReports.length > 0 && (
                  <div style={{ marginLeft: 8, marginTop: 2 }}>
                    {spaceReports.map((report) => (
                      <div key={report.id}
                        onClick={() => openReportInNewWindow(report)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "7px 8px", borderRadius: 6,
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "#27272a" : "#f3f4f6"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        {/* 左侧：图标 + 标题 + 标签 */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                          <FileText size={13} strokeWidth={1.5} className="text-indigo-500 flex-shrink-0" />
                          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                            <span style={{
                              fontSize: 12.5,
                              color: darkMode ? "#e4e4e7" : "#374151",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 140
                            }}>{report.title}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{
                                fontSize: 10,
                                color: darkMode ? "#a1a1aa" : "#9ca3af",
                                background: darkMode ? "#27272a" : "#f3f4f6",
                                padding: "1px 5px",
                                borderRadius: 3
                              }}>{report.type}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 右侧：时间 + 操作 */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: darkMode ? "#71717a" : "#bbb", whiteSpace: "nowrap" }}>
                            {formatReportTime(report.timestamp)}
                          </span>
                          
                          {/* 下载按钮 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (report.html) {
                                downloadReport(report)
                              }
                            }}
                            style={{
                              width: 22, height: 22,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              border: "none", background: "none",
                              cursor: "pointer", borderRadius: 4,
                              color: darkMode ? "#71717a" : "#9ca3af"
                            }}
                            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = darkMode ? "#a1a1aa" : "#6b7280"}
                            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = darkMode ? "#71717a" : "#9ca3af"}
                            title="下载报告"
                          >
                            <Download size={12} strokeWidth={1.5} />
                          </button>
                          
                          {/* 更多操作 */}
                          <Dropdown menu={{ items: [
                            {
                              key: 'open',
                              label: '打开查看',
                              icon: <Eye size={12} />,
                              onClick: () => openReportInNewWindow(report)
                            },
                            {
                              key: 'download',
                              label: '下载报告',
                              icon: <Download size={12} />,
                              onClick: () => report.html && downloadReport(report)
                            },
                            { type: 'divider' },
                            {
                              key: 'delete',
                              label: <span style={{ color: '#ef4444' }}>删除</span>,
                              icon: <Trash2 size={12} style={{ color: '#ef4444' }} />,
                              danger: true,
                              onClick: () => deleteSpaceReport(report.id)
                            }
                          ]}} trigger={['click']}>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: 22, height: 22,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                border: "none", background: "none",
                                cursor: "pointer", borderRadius: 4,
                                color: darkMode ? "#71717a" : "#9ca3af"
                              }}
                              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = darkMode ? "#a1a1aa" : "#6b7280"}
                              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = darkMode ? "#71717a" : "#9ca3af"}
                            >
                              <MoreHorizontal size={13} />
                            </button>
                          </Dropdown>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 空状态提示 */}
                {!collapsedGroups.has("my-space") && spaceReports.length === 0 && (
                  <div style={{
                    marginLeft: 8, marginTop: 4, padding: "16px 12px",
                    textAlign: "center", fontSize: 11, color: "#c4c4c4"
                  }}>
                    暂无生成内容
                  </div>
                )}
              </div>

              {/* 智能体（可折叠） */}
              <div>
                <div onClick={() => toggleGroupCollapse("agents")}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 4px 6px", cursor: "pointer", userSelect: "none" }}
                >
                  {collapsedGroups.has("agents") ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  <List size={15} strokeWidth={1.5} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: darkMode ? "#e4e4e7" : "#374151" }}>智能体</span>
                </div>
              </div>

              {/* 对话分组标题 + 新建 */}
              <div style={{ padding: "12px 4px 6px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>对话分组</span>
                  <button onClick={() => setShowNewGroupInput(true)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 2,
                      fontSize: 11, color: "#9ca3af", background: "none",
                      border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: 4 }}
                  >
                    <Plus size={11} /><span>新分组</span>
                  </button>
                </div>
                {showNewGroupInput && (
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
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
              </div>

              {/* 自定义分组列表 */}
              {groups.map(g => (
                <div key={g.id}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
                    padding: "6px 4px 4px", cursor: "pointer", userSelect: "none" }}
                    onClick={() => toggleGroupCollapse(g.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {collapsedGroups.has(g.id) ? (
                        <ChevronRight size={13} style={{ color: darkMode ? "#a1a1aa" : "#6b7280" }} />
                      ) : (
                        <ChevronDown size={13} style={{ color: darkMode ? "#a1a1aa" : "#6b7280" }} />
                      )}
                      <FolderOpen size={13} strokeWidth={1.5} style={{ color: darkMode ? "#a1a1aa" : "#6b7280" }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: darkMode ? "#e4e4e7" : "#4b5563" }}>{g.name}</span>
                      <span style={{ fontSize: 10, color: darkMode ? "#71717a" : "#9ca3af" }}>({sessionsByGroup[g.id]?.length || 0})</span>
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
                          cursor: "pointer", color: darkMode ? "#71717a" : "#c4c8cf", opacity: 0,
                          transition: "opacity 0.15s" }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = ""}
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
                      styles={{ item: { borderRadius: 8, padding: "6px 10px 6px 22px", marginBottom: 1 } }}
                    />
                  )}
                </div>
              ))}

              {/* 最近对话（未分组的） */}
              <div style={{ padding: "10px 4px 6px" }}>
                <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>最近对话</span>
              </div>

              {/* 最近对话列表 */}
              <Conversations
                menuable
                onActiveChange={(key: string) => { setSessionId(String(key)); loadSessionMessages(String(key) as any) }}
                onDelete={(info: any) => deleteSession(String(info.key))}
                items={recentSessionItems}
                styles={{ item: { borderRadius: 8, padding: "7px 10px", marginBottom: 1 } }}
              />

              {/* 底部操作：探索 / 能力库 */}
              <div style={{ display: "flex", gap: 2, padding: "12px 6px 4px", borderTop: darkMode ? "1px solid #27272a" : "1px solid #f0f0f0" }}>
                <AntButton type="text" size="small" icon={<Compass size={13} />} onClick={() => setExploreOpen(true)}
                  style={{ fontSize: 12, color: darkMode ? "#a1a1aa" : "#6b7280", flex: 1, justifyContent: "start", paddingLeft: 4 }}>探索</AntButton>
              </div>

            </div>
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
                padding: "12px 14px", borderTop: darkMode ? "1px solid #27272a" : "1px solid #efefef",
                cursor: "pointer",
              }}>
                <AntAvatar size={32} src={user?.avatar_url} style={{ backgroundColor: "#e0e7ff", color: "#4f46e5", flexShrink: 0, fontSize: 14 }}>
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

        {/* Main */}
        <AntLayout.Content style={{ display: "flex", flexDirection: "column", position: "relative", background: darkMode ? "#09090b" : "#f7f8fa" }}>
          {/* Top bar */}
          <div className={cn(
            "h-12 flex items-center gap-3 px-4 shrink-0 rounded-tr-xl border-b",
            darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-gray-100 text-zinc-900"
          )}>
            {!sidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <PanelLeftOpen size={18} />
              </Button>
            )}
            <div className="flex items-center justify-center">
              <DynamicModelSelector value={selectedModel || aiSettings?.model || ""} onValueChange={setSelectedModel} />
            </div>
            <div className="flex-1" />
          </div>

          {/* Chat area */}
          <div id="ai-chat-main-container" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: darkMode ? "#09090b" : "#fff", margin: 0, borderRadius: "0 12px 0 0" }}>
             {messages.length === 0 ? (
               <MateChatHome
                darkMode={darkMode}
                onSendMessage={(msg) => handleSend(msg)}
                input={input}
                setInput={setInput}
                isLoading={isLoading}
                approvalMode={approvalMode}
                setApprovalMode={setApprovalMode}
              />
             ) : (
              <ChatBubbleList
                messages={messages}
                isLoading={isLoading}
                agentSteps={agentSteps}
                agentStatus={agentStatus}
                darkMode={darkMode}
                rendererProps={{
                  deviceData,
                  autoExecuteCommands,
                  assistantMode: approvalMode,
                  enableReasoning,
                  onOpenStudioFromTask: () => setStudioOpen(true),
                  onOpenStudio: (title, html) => generateAndSaveReport(title, html),
                  onExecuteCommand: async (c) => { await executeCommands([c]) },
                  onRetryCommand: (errorMsg) => {
                    const retryPrompt = `上一次设备控制失败了。错误信息：${errorMsg}。请重新分析情况并给出正确的控制指令。`
                    handleSend(retryPrompt, [], false, false)
                  },
                  onSendMessage: (text) => handleSend(text),
                  onSetInput: (text) => setInput(text),
                }}
                onTtsSpeak={enqueueTts}
                footerContent={
                  messages.length > 0 && !isLoading && messages[messages.length - 1]?.role === "assistant" ? (
                    <motion.div
                      className="scale-[0.82] origin-top-left -mb-10"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                    >
                    <Prompts
                      title="🤔 你可能还想问："
                      vertical
                      styles={{
                        item: { padding: '6px 12px', fontSize: 13 },
                        title: { fontSize: 13, marginBottom: 6 },
                        icon: { fontSize: 14 },
                        description: { fontSize: 13 },
                      }}
                      items={[
                        { key: "1", icon: <BulbOutlined style={{ color: '#FFD700' }} />, description: "对上面的内容做进一步分析" },
                        { key: "2", icon: <InfoCircleOutlined style={{ color: '#1890FF' }} />, description: "当前环境适合采取什么设备操作" },
                        { key: "3", icon: <RocketOutlined style={{ color: '#722ED1' }} />, description: "将分析结果生成可视化报告" },
                        { key: "4", icon: <SmileOutlined style={{ color: '#52C41A' }} />, description: "用几句话概括重点内容" },
                      ]}
                      onItemClick={(info) => {
                        handleSend(info.data.description || "")
                      }}
                    />
                    </motion.div>
                  ) : undefined
                }
              />
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
                  setEnableReasoning(v)
                  if (v) {
                    const reasoningModels = ['qwen3-max-2026-01-23', 'qwen-plus-2025-12-01', 'deepseek-v3.2']
                    const randomModel = reasoningModels[Math.floor(Math.random() * reasoningModels.length)]
                    setSelectedModel(randomModel)
                    if (aiSettings) {
                      const newSettings = { ...aiSettings, model: randomModel }
                      setAiSettings(newSettings)
                      localStorage.setItem("ai-settings", JSON.stringify(newSettings))
                    }
                  }
                }}
                enablePlanning={enablePlanning}
                setEnablePlanning={(v) => {
                  setEnablePlanning(v)
                  if (v) {
                    // 启用计划模式时，同时启用推理模式
                    setEnableReasoning(true)
                    const reasoningModels = ['qwen3-max-2026-01-23', 'qwen-plus-2025-12-01', 'deepseek-v3.2']
                    const randomModel = reasoningModels[Math.floor(Math.random() * reasoningModels.length)]
                    setSelectedModel(randomModel)
                    if (aiSettings) {
                      const newSettings = { ...aiSettings, model: randomModel }
                      setAiSettings(newSettings)
                      localStorage.setItem("ai-settings", JSON.stringify(newSettings))
                    }
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
            <UnifiedExplore onClose={() => setExploreOpen(false)} darkMode={darkMode} />
          )}
        </AnimatePresence>
        </AntLayout.Content>
      </AntLayout>
    </div>

      {/* 浏览器活动窗口 */}
      {/* 浏览器活动窗口 - 仅在全屏模式下渲染，小窗口预览不需要此组件 */}
      <BrowserActivity url={browsingUrl || ""} isOpen={!!browsingUrl && !studioOpen} onClose={() => setBrowsingUrl(null)} />

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
        onSave={(settings) => {
          setAiSettings(settings)
        }}
        onVoiceSettingsChange={(voice) => {
          setIsTTSEnabled(voice.readAloud)
        }}
      />
    </>
    </App>
    </ConfigProvider>
  )
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
  toast.success("已复制到剪贴板")
}
