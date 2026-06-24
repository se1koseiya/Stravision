"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ConfigProvider, App, theme, Segmented, Button as AntButton, Menu, Avatar as AntAvatar, Layout as AntLayout, Space, Tooltip, Dropdown, Modal, Input, Drawer } from "antd"
import type { ConversationsProps } from "@ant-design/x"
import { Conversations, Prompts, Bubble, Sender, Attachments, Think, ThoughtChain, Actions } from "@ant-design/x"
import type { PromptsProps } from "@ant-design/x"
import { BulbOutlined, InfoCircleOutlined, RocketOutlined, SmileOutlined, PlusOutlined, SettingOutlined, MenuOutlined, UserOutlined, HistoryOutlined, DeleteOutlined, EditOutlined, ShareAltOutlined, CheckOutlined, OpenAIOutlined, SyncOutlined, WarningOutlined, FileTextOutlined, ThunderboltOutlined, CrownOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons'
import zhCN from "antd/locale/zh_CN"
import type { UserPublic } from "@/lib/db/user-service"
import { Mic, MicOff, RotateCcw, Copy, Trash, SquarePen, Library, CircleHelp, PanelLeftClose, PanelLeftOpen, CheckCircle2, AlertCircle, Loader2, Globe, ImageIcon, FileText, Sun, Activity, Sprout, Zap, ArrowUpRight, Wand2, Download, Phone, Play, Pause, Volume2, VolumeX, Camera, Signal, Cpu, Home, Brain, House, Compass, MessageSquare, ChevronUp, ChevronRight, Circle, Clock, Info, MoreHorizontal, Pencil, Pin, Share, List, FolderInput, Trash2, FolderOpen, Moon, Eye, Send, Settings, Plus, ArrowRight, ArrowUp, TrendingUp, BarChart3, Sparkles, Smile, ExternalLink, Crown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import dynamic from "next/dynamic"
const MermaidChart = dynamic(() => import("@/components/mermaid-chart"), {
  ssr: false,
  loading: () => <div className="p-4 text-xs text-zinc-400">Loading diagram...</div>
})
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import ChartRenderer from "@/components/chart-renderer"
import { Input as ShadcnInput } from "@/components/ui/input"
import { Button as ShadcnButton } from "@/components/ui/button"
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
} from "@/components/ui/assistant-ui"

import { motion, AnimatePresence } from "framer-motion"

import { AISettingsDialog } from "@/components/ai-settings-dialog"
import { DynamicModelSelector } from "@/components/ai/dynamic-model-selector"
import { MobileMessageContent } from "@/components/ai/mobile-message-content"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { cn } from "@/lib/utils"
import XMarkdown from "@ant-design/x-markdown"
import { toast } from "sonner"
import BerryOrb from "@/components/smoothui/berry-orb"

// 参考来源展示组件（符合Ant Design X设计规范）
function CitationSources({
  citations,
  darkMode,
  expanded = false,
  onToggle,
}: {
  citations?: Citation[]
  darkMode: boolean
  expanded?: boolean
  onToggle?: () => void
}) {
  if (!citations || citations.length === 0) return null
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mt-2 rounded-xl overflow-hidden border",
        darkMode ? "bg-zinc-900 border-zinc-700" : "bg-gray-50 border-gray-200"
      )}
    >
      {/* 参考来源头部 */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 transition-colors",
          darkMode ? "hover:bg-zinc-800" : "hover:bg-gray-100"
        )}
      >
        <div className="flex items-center gap-2">
          <Library size={14} className="text-emerald-500" />
          <span className="text-xs font-medium opacity-70">参考来源</span>
          <span className="text-xs opacity-50">{citations.length}个</span>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
          <ChevronUp size={14} className="opacity-50" />
        </motion.div>
      </button>
      
      {/* 参考来源列表 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3 pb-2 space-y-2"
          >
            {citations.map((citation, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-lg",
                  darkMode ? "bg-zinc-800" : "bg-white"
                )}
              >
                <span className={cn(
                  "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                  darkMode ? "bg-zinc-700 text-zinc-300" : "bg-gray-200 text-gray-600"
                )}>
                  {citation.number}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "text-xs font-medium truncate block",
                      darkMode ? "text-zinc-300 hover:text-emerald-400" : "text-gray-700 hover:text-emerald-600"
                    )}
                  >
                    {citation.title}
                  </a>
                  {citation.description && (
                    <p className={cn(
                      "text-xs mt-0.5 line-clamp-2",
                      darkMode ? "text-zinc-500" : "text-gray-500"
                    )}>
                      {citation.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Interfaces
interface Citation {
  number: string
  title: string
  url: string
  description?: string
  quote?: string
}

interface TaskItemModel { type: "text" | "file"; text: string; file?: { name: string; icon?: string } }
interface TaskModel { title: string; items: TaskItemModel[]; status: "pending" | "in_progress" | "completed" }

interface Message {
  role: "user" | "assistant"
  content: string | Array<{ type: 'text' | 'image_url', text?: string, image_url?: { url: string } }>
  citations?: Citation[]
  reasoning?: { text: string; durationMs?: number }
  tasks?: TaskModel[]
}

interface AISettings {
  apiKey: string
  apiUrl: string
  model: string
  systemPrompt: string
}

interface SessionMeta { id: string; title: string; createdAt: number; updatedAt: number }

// ChatBubbleList组件 - 使用antdesignx的Bubble组件（深度优化版）
function ChatBubbleList({
  messages,
  isLoading,
  darkMode,
  onTtsSpeak,
  onRegenerate,
  onDeleteMessage,
  onQuoteMessage,
  deviceData,
  onExecuteCommand,
  onSendMessage,
  onSetInput,
  onOpenStudio,
}: {
  messages: Message[]
  isLoading: boolean
  darkMode: boolean
  onTtsSpeak?: (text: string) => void
  onRegenerate?: () => void
  onDeleteMessage?: (index: number) => void
  onQuoteMessage?: (text: string) => void
  deviceData?: any
  onExecuteCommand?: (command: any) => Promise<void>
  onSendMessage?: (text: string) => void
  onSetInput?: (text: string) => void
  onOpenStudio?: (title: string, html: string) => void
}) {
  // 状态管理
  const [expandedCitations, setExpandedCitations] = useState<Record<number, boolean>>({})
  const [feedbackState, setFeedbackState] = useState<Record<number, 'like' | 'dislike' | 'default'>>({})
  const [audioStatus, setAudioStatus] = useState<Record<number, 'loading' | 'error' | 'running' | 'default'>>({})
  
  // 角色配置 - 通过 roles 统一定义不同角色的气泡样式（参考 Bubble 文档）
  // 用户气泡：靠右、圆角、品牌绿色，与 AI 明显区分
  const roles = {
    user: {
      placement: 'end' as const,
      variant: 'shadow' as const,
      shape: 'round' as const,
      styles: {
        content: {
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '10px 16px',
          fontSize: 14,
          lineHeight: 1.6,
          borderRadius: 18,
          boxShadow: '0 1px 2px rgba(16,185,129,0.2)',
        },
      },
    },
    ai: {
      placement: 'start' as const,
      variant: 'filled' as const,
      shape: 'default' as const,
      styles: {
        content: {
          backgroundColor: darkMode ? '#27272a' : '#ffffff',
          color: darkMode ? '#f4f4f5' : '#18181b',
          padding: '12px 16px',
          fontSize: 14,
          lineHeight: 1.6,
          borderRadius: 16,
          border: darkMode ? '1px solid #3f3f46' : '1px solid #e4e4e7',
        },
      },
    },
  }

  // AI 消息底部插槽：参考来源 + 操作按钮
  const renderAiFooter = (msg: Message, index: number, content: string) => (
    <div className="space-y-2 mt-2">
      {/* 参考来源展示 */}
      {msg.citations && msg.citations.length > 0 && (
        <CitationSources
          citations={msg.citations}
          darkMode={darkMode}
          expanded={expandedCitations[index]}
          onToggle={() => setExpandedCitations(prev => ({ ...prev, [index]: !prev[index] }))}
        />
      )}
      
      {/* 结果应用操作 - 使用Ant Design X的Actions组件 */}
      <div className="flex flex-wrap gap-2">
        <Actions.Copy text={content} />
        <Actions.Feedback
          value={feedbackState[index] || 'default'}
          onChange={(value) => setFeedbackState(prev => ({ ...prev, [index]: value }))}
        />
        <Actions.Audio
          status={audioStatus[index] || 'default'}
          onClick={() => {
            if (audioStatus[index] === 'running') {
              setAudioStatus(prev => ({ ...prev, [index]: 'default' }))
              onTtsSpeak?.('')
            } else {
              setAudioStatus(prev => ({ ...prev, [index]: 'running' }))
              onTtsSpeak?.(content)
            }
          }}
        />
        {index === messages.length - 1 && onRegenerate && (
          <Actions.Item label="重新生成" icon={<RotateCcw size={14} />} onClick={onRegenerate} />
        )}
        {onQuoteMessage && (
          <Actions.Item label="引用" icon={<SquarePen size={14} />} onClick={() => onQuoteMessage(content)} />
        )}
        {onDeleteMessage && (
          <Actions.Item label="删除" icon={<Trash2 size={14} />} danger onClick={() => onDeleteMessage(index)} />
        )}
      </div>
    </div>
  )

  const items = messages.map((msg, index) => {
    const content = typeof msg.content === 'string' ? msg.content : 
      msg.content.map(c => c.type === 'text' ? c.text : '').join('')
    
    if (msg.role === 'assistant') {
      return {
        key: index.toString(),
        role: 'ai',
        placement: 'start' as const,
        avatar: <BerryOrb size="36px" theme={darkMode ? 'dark' : 'light'} isActive={isLoading && index === messages.length - 1} />,
        // 头部插槽：思考过程
        header: msg.reasoning ? (
          <Think
            title="深度思考"
            loading={isLoading && index === messages.length - 1}
            icon={<OpenAIOutlined />}
            style={{ marginBottom: 8 }}
          >
            {msg.reasoning.text}
          </Think>
        ) : undefined,
        // 主内容：手机端业务卡片 + Markdown 渲染
        content: (
          <MobileMessageContent
            content={content}
            msg={msg}
            deviceData={deviceData}
            isStreaming={isLoading && index === messages.length - 1}
            onExecuteCommand={onExecuteCommand || (async () => {})}
            onRetryCommand={(errMsg) => onSendMessage?.(errMsg)}
            onSendMessage={onSendMessage || (() => {})}
            onSetInput={onSetInput || (() => {})}
            onOpenStudio={onOpenStudio}
          />
        ),
        // 底部插槽：参考来源 + 操作
        footer: renderAiFooter(msg, index, content),
        // 流式加载状态
        loading: isLoading && index === messages.length - 1 && !content,
      }
    }
    
    // 用户消息
    return {
      key: index.toString(),
      role: 'user',
      placement: 'end' as const,
      content,
    }
  })

  // 加载状态：最后一条是用户消息时，追加一个加载中的 AI 气泡（使用 Bubble 原生 loading）
  const showLoadingBubble = isLoading && messages[messages.length - 1]?.role === 'user'
  if (showLoadingBubble) {
    items.push({
      key: 'loading',
      role: 'ai',
      avatar: <BerryOrb size="36px" theme={darkMode ? 'dark' : 'light'} isActive={true} />,
      loading: true,
      content: '',
    } as any)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Bubble.List 
        items={items} 
        roles={roles}
      />
    </div>
  )
}

// ChatSenderInput组件 - 使用antdesignx的Sender组件
function ChatSenderInput({
  input,
  setInput,
  onSend,
  isLoading,
  darkMode,
  attachments,
  onSelectFiles,
  onRemoveAttachment,
  approvalMode,
  setApprovalMode,
  enableReasoning,
  setEnableReasoning,
  enableSearch,
  setEnableSearch,
}: {
  input: string
  setInput: (value: string) => void
  onSend: (text: string) => void
  isLoading: boolean
  darkMode: boolean
  attachments: string[]
  onSelectFiles: React.ChangeEventHandler<HTMLInputElement>
  onRemoveAttachment: (index: number) => void
  approvalMode?: "request" | "auto" | "full"
  setApprovalMode?: (mode: "request" | "auto" | "full") => void
  enableReasoning?: boolean
  setEnableReasoning?: (v: boolean) => void
  enableSearch?: boolean
  setEnableSearch?: (v: boolean) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  
  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  // 权限模式配置
  const approvalModes = [
    { key: "request", label: "请求批准", desc: "执行前确认" },
    { key: "auto", label: "替我审批", desc: "仅高风险确认" },
    { key: "full", label: "完全访问", desc: "自主执行" },
  ]

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50",
      darkMode ? "bg-zinc-900" : "bg-white"
    )}>
      {/* + 展开面板 */}
      <AnimatePresence>
        {plusMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              "mx-4 mb-2 rounded-2xl p-4 shadow-xl border",
              darkMode ? "bg-zinc-800 border-zinc-700" : "bg-gray-50 border-gray-200"
            )}
          >
          {/* 添加照片和文件 */}
          <button
            onClick={() => {
              handleFileClick()
              setPlusMenuOpen(false)
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
              darkMode ? "hover:bg-zinc-700" : "hover:bg-gray-100"
            )}
          >
            <PlusOutlined style={{ fontSize: 16 }} />
            <span className="text-sm font-medium">添加照片和文件</span>
          </button>

          {/* 权限模式切换 */}
          {setApprovalMode && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium opacity-70">权限模式</span>
              </div>
              <div className="flex gap-2">
                {approvalModes.map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setApprovalMode(mode.key as any)}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                      approvalMode === mode.key
                        ? "bg-emerald-500 text-white"
                        : darkMode
                          ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
        )}
      </AnimatePresence>

      {/* 顶部功能徽章 */}
      <div className="flex items-center gap-2 px-4 pt-2 flex-wrap">
        {setEnableReasoning && (
          <Sender.Switch
            icon={<ThunderboltOutlined />}
            checkedChildren="深度推理：开"
            unCheckedChildren="深度推理"
            value={enableReasoning}
            onChange={(checked) => setEnableReasoning(checked)}
          />
        )}
        {setEnableSearch && (
          <Sender.Switch
            icon={<SearchOutlined />}
            checkedChildren="全网搜索：开"
            unCheckedChildren="全网搜索"
            value={enableSearch}
            onChange={(checked) => setEnableSearch(checked)}
          />
        )}
      </div>

      {/* 附件预览 */}
      {attachments.length > 0 && (
        <div className="flex gap-2 px-4 pt-2 overflow-x-auto">
          {attachments.map((url, index) => (
            <div key={index} className="relative size-14 rounded-lg overflow-hidden shrink-0">
              <Image src={url} alt="attachment" fill className="object-cover" />
              <button
                onClick={() => onRemoveAttachment(index)}
                className="absolute top-1 right-1 size-4 rounded-full bg-red-500 text-white flex items-center justify-center"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 输入区域 - 无边框 */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* + 按钮 */}
        <AntButton 
          type="text" 
          icon={<PlusOutlined />} 
          onClick={() => setPlusMenuOpen(!plusMenuOpen)}
          size="middle"
          className={cn(
            plusMenuOpen && "bg-emerald-500/20"
          )}
        />
        
        {/* 输入框 */}
        <div className={cn(
          "flex-1 flex items-center rounded-2xl px-4",
          darkMode ? "bg-zinc-800" : "bg-gray-100"
        )}>
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            className="flex-1 bg-transparent border-0 outline-none text-sm py-2"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend(input)}
          />
        </div>
        
        {/* 发送按钮 */}
        <AntButton 
          type="primary" 
          icon={<Send size={16} />}
          loading={isLoading}
          onClick={() => onSend(input)}
          disabled={!input.trim() && attachments.length === 0}
          size="middle"
          style={{ borderRadius: 20 }}
        />
      </div>

      {/* 底部 AI 生成提示 */}
      <div className="text-center pb-1.5">
        <span className={cn("text-[10px]", darkMode ? "text-zinc-700" : "text-gray-300")}>
          内容由 AI 生成
        </span>
      </div>
      
      <input 
        ref={fileInputRef}
        type="file" 
        multiple 
        accept="image/*"
        className="hidden" 
        onChange={onSelectFiles}
      />
    </div>
  )
}

// MateChatHome组件 - 首页视图（使用Ant Design X的Welcome组件）
function MateChatHome({
  darkMode,
  onSendMessage,
}: {
  darkMode: boolean
  onSendMessage: (msg: string) => void
}) {
  const quickActions = [
    { label: '种植诊断', description: '草莓叶片发黄、果实异常？帮我看看', action: '我的草莓叶片边缘发黄，可能是什么原因？该如何处理？', icon: <BulbOutlined style={{ color: '#FFD700' }} />, color: '#FFD700' },
    { label: '环境调控', description: '温湿度、光照、土壤数据一键分析', action: '帮我分析当前大棚的温湿度和光照数据，给出环境调控建议', icon: <InfoCircleOutlined style={{ color: '#1890FF' }} />, color: '#1890FF' },
    { label: '病虫害防治', description: '识别病虫害并推荐绿色防控方案', action: '最近发现草莓植株上有白色粉末，是什么病害？如何绿色防治？', icon: <RocketOutlined style={{ color: '#722ED1' }} />, color: '#722ED1' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section - 自定义欢迎页面 */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* BerryOrb图标 */}
        <div className="flex justify-center mb-6">
          <BerryOrb size="80px" theme={darkMode ? 'dark' : 'light'} isActive={false} />
        </div>
        
        {/* 标题 */}
        <h2 
          style={{ color: darkMode ? '#ffffff' : '#111827' }}
          className="text-2xl font-bold mb-3"
        >
          莓小智
        </h2>
        
        {/* 描述 */}
        <p 
          style={{ color: darkMode ? '#d4d4d8' : '#4b5563' }}
          className="text-sm leading-relaxed text-center max-w-sm"
        >
          你好，我是莓小智，你的智慧农业环境管家。我可以帮你分析环境数据、检查设备状态、解答病害问题、提供种植建议。
        </p>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-10">
        <Prompts
          title="✨ 灵感火花与小贴士"
          wrap
          styles={{
            item: { padding: '12px 16px', fontSize: 14, borderRadius: 12 },
            title: { fontSize: 14, marginBottom: 8 },
            icon: { fontSize: 16 },
            description: { fontSize: 13 },
          }}
          items={quickActions.map((item, index) => ({
            key: index.toString(),
            icon: item.icon,
            label: item.label,
            description: item.description,
          }))}
          onItemClick={(info) => {
            const action = quickActions[parseInt(info.key)]
            onSendMessage(action.action)
          }}
        />
      </div>
    </div>
  )
}

export default function AIAssistantIOSPage() {
  return (
    <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-zinc-950 text-emerald-400">Loading AI Assistant...</div>}>
      <AIAssistantIOSContent />
    </React.Suspense>
  )
}

function AIAssistantIOSContent() {
  const router = useRouter()
  const [user, setUser] = useState<UserPublic | null>(null)
  
  // Chat State
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>("")
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [enableSearch, setEnableSearch] = useState(false)
  const [enableReasoning, setEnableReasoning] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [attachments, setAttachments] = useState<string[]>([])
  const [approvalMode, setApprovalMode] = useState<"request" | "auto" | "full">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-approval-mode')
      if (saved === 'request' || saved === 'auto' || saved === 'full') {
        return saved
      }
    }
    return 'request'
  })
  
  // UI State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("darkMode") === "true"
    }
    return false
  })

  // 报告查看器状态
  const [reportViewer, setReportViewer] = useState<{ title: string; html: string } | null>(null)
  const onOpenStudio = (title: string, html: string) => {
    setReportViewer({ title, html })
  }

  // 我的报告列表（从 localStorage 读取，与 PC 端共享）
  type SpaceReport = { id: string; title: string; type: string; timestamp: number; html?: string }
  const [spaceReports, setSpaceReports] = useState<SpaceReport[]>(() => {
    if (typeof window === "undefined") return []
    try { return JSON.parse(localStorage.getItem("my-space-reports") || "[]") } catch { return [] }
  })
  const [reportsModalOpen, setReportsModalOpen] = useState(false)
  const [actionsModalOpen, setActionsModalOpen] = useState(false)

  // 打开报告列表时刷新数据
  const openReportsModal = () => {
    try { setSpaceReports(JSON.parse(localStorage.getItem("my-space-reports") || "[]")) } catch {}
    setReportsModalOpen(true)
  }

  // 删除报告
  const deleteSpaceReport = (id: string) => {
    setSpaceReports(prev => {
      const updated = prev.filter(r => r.id !== id)
      localStorage.setItem("my-space-reports", JSON.stringify(updated))
      return updated
    })
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mainScrollRef = useRef<HTMLDivElement>(null)
  const { deviceData } = useDeviceData()
  const { weatherData } = useWeatherContext()
  const [notices, setNotices] = useState<{ id: number; title: string; description?: string; variant?: 'loading'|'success'|'error'; expanded: boolean }[]>([])
  const noticeIdCounter = useRef(0)
  
  // TTS状态
  const [isSpeaking, setIsSpeaking] = useState(false)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  
  // TTS功能
  const handleTtsSpeak = (text: string) => {
    if (!text) {
      // 停止朗读
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }
    
    // 开始朗读
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1
    
    utterance.onend = () => {
      setIsSpeaking(false)
    }
    
    utterance.onerror = () => {
      setIsSpeaking(false)
      toast.error("朗读失败")
    }
    
    window.speechSynthesis.cancel() // 先停止之前的朗读
    window.speechSynthesis.speak(utterance)
    speechSynthesisRef.current = utterance
    setIsSpeaking(true)
    toast.success("开始朗读")
  }
  
  const showNotice = (title: string, description?: string, variant?: 'loading'|'success'|'error') => {
    const id = ++noticeIdCounter.current
    setNotices(prev => [...prev, { id, title, description, variant, expanded: false }])
    
    if (variant && variant !== 'loading') {
      setTimeout(() => {
        setNotices(prev => prev.filter(n => n.id !== id))
      }, 5000)
    }
  }

  const closeNotice = (id: number) => {
    setNotices(prev => prev.filter(n => n.id !== id))
  }

  // Fetch User
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (mounted && data?.authenticated && data?.user) setUser(data.user as UserPublic)
      } catch {}
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
    } catch {}
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
      } catch {}
    })()
  }, [])

  // Load Messages
  useEffect(() => {
    if (!sessionId) return
    localStorage.setItem("ai-last-session-id", sessionId)
    ;(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          const msgs = Array.isArray(data?.messages) ? (data.messages as Message[]) : []
          setMessages(msgs.length > 0 ? msgs : [])
          try {
            const draft = localStorage.getItem(`ai-input-draft-${sessionId}`)
            if (typeof draft === "string") setInput(draft)
          } catch {}
        }
      } catch {}
    })()
  }, [sessionId])

  // Scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current && mainScrollRef.current) {
      mainScrollRef.current.scrollTop = mainScrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // Sync dark mode
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (darkMode) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
      localStorage.setItem("darkMode", darkMode.toString())
    }
  }, [darkMode])

  // Sync approval mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-approval-mode', approvalMode)
    }
  }, [approvalMode])

  const executeCommands = async (commands: any[]) => {
    if (!commands || commands.length === 0) return
    showNotice("正在执行指令...", `共发现 ${commands.length} 个操作`, "loading")

    for (const cmd of commands) {
      try {
        let res: Response
        if (cmd.action === "set_led") {
          res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set_led', r: cmd.r, g: cmd.g, b: cmd.b })
          })
        } else if (cmd.action === "toggle_relay") {
          res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_relay', device: cmd.device, value: cmd.value })
          })
        } else if (cmd.action === "control_camera" || cmd.action === "move_camera_and_look") {
          res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'control_camera', direction: cmd.direction, pulses: cmd.pulses || 1600 })
          })
        } else if (cmd.action === "reset_camera") {
          res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset_camera' })
          })
        } else if (cmd.action === "take_camera_snapshot") {
          res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'take_camera_snapshot' })
          })
        } else {
          continue
        }
        if (res.ok) {
          const deviceName = cmd.device === 5 ? "灌溉水泵" : cmd.device === 6 ? "环境风扇" : cmd.device === 7 ? "补光灯" : "设备"
          showNotice("调控成功 ✅", `${deviceName}操作已完成`, "success")
        } else {
          let err = ''
          try { const j = await res.json(); err = j?.error || '' } catch {}
          showNotice("调控失败", err || `请求错误 ${res.status}`, "error")
        }
      } catch (e) {
        showNotice("调控失败", "网络请求失败", "error")
      }
    }
  }

  const createNewSession = async () => {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `新会话 ${new Date().toLocaleString("zh-CN")}` })
      })
      if (res.ok) {
        const data = await res.json()
        setSessionId(data.id)
        setSessions(prev => [data, ...prev])
        setMessages([])
      }
    } catch {}
  }

  const deleteSession = async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" })
      setSessions(prev => prev.filter(s => s.id !== id))
      if (sessionId === id) {
        if (sessions.length > 1) {
          const nextSession = sessions.find(s => s.id !== id)
          if (nextSession) setSessionId(nextSession.id)
        } else {
          createNewSession()
        }
      }
    } catch {}
  }

  const handleSend = async (overrideText?: any) => {
    const text = typeof overrideText === "string" ? overrideText : input
    if (!text.trim() || isLoading) return
    
    if (!aiSettings) { setSettingsOpen(true); return }

    const userMsg = text.trim()
    setInput("")
    setEnableSearch(false)

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

    // Check for command execution
    if (userMsg === "是" || userMsg === "执行") {
      const lastAssistantMsg = messages[messages.length - 1]
      if (lastAssistantMsg && lastAssistantMsg.role === "assistant") {
        const jsonMatches = [...(lastAssistantMsg.content as string).matchAll(/```json\s*([\s\S]*?)```/g)]
        if (jsonMatches.length > 0) {
          const commands = []
          for (const match of jsonMatches) {
             try { commands.push(JSON.parse(match[1])) } catch {}
          }
          if (commands.length > 0) await executeCommands(commands)
        }
      }
      return
    }

    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      if (ensuredSessionId) {
        const current = sessions.find((s) => s.id === ensuredSessionId)
        if (current && current.title && current.title.startsWith("新会话")) {
           const cand = userMsg.slice(0, 24)
           await fetch(`/api/sessions/${ensuredSessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: cand }) })
           setSessions((prev) => prev.map((s) => (s.id === ensuredSessionId ? { ...s, title: cand } : s)))
        }
        
        await fetch(`/api/sessions/${ensuredSessionId}`, { 
           method: "PUT", 
           headers: { "Content-Type": "application/json" }, 
           body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }) 
        })
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel || aiSettings?.model,
          apiKey: aiSettings?.apiKey,
          apiUrl: aiSettings?.apiUrl,
          systemPrompt: aiSettings?.systemPrompt,
          sessionId: ensuredSessionId,
          enableSearch,
          enableReasoning,
        }),
      })

      if (!res.ok) {
        showNotice("请求失败", `API错误: ${res.status}`, "error")
        setIsLoading(false)
        return
      }

      const data = await res.json()
      const assistantContent = data.choices?.[0]?.message?.content || data.response || ""
      
      const finalMessages: Message[] = [...newMessages, { role: "assistant", content: assistantContent }]
      setMessages(finalMessages)

      if (ensuredSessionId) {
        await fetch(`/api/sessions/${ensuredSessionId}`, { 
          method: "PUT", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ messages: finalMessages.map(m => ({ role: m.role, content: m.content })) }) 
        })
      }

      // Check for commands in response
      const jsonMatches = [...assistantContent.matchAll(/```json\s*([\s\S]*?)```/g)]
      if (jsonMatches.length > 0) {
        const commands = []
        for (const match of jsonMatches) {
          try { commands.push(JSON.parse(match[1])) } catch {}
        }
        if (commands.length > 0) {
          showNotice("发现控制指令", `检测到 ${commands.length} 个设备操作，回复"执行"以确认`, "loading")
        }
      }

    } catch (e) {
      console.error("Chat error", e)
      showNotice("请求失败", "网络请求失败", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const onSelectFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files
    if (!files) return
    const urls: string[] = []
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const url = ev.target?.result as string
        if (url) urls.push(url)
        if (urls.length === files.length) {
          setAttachments(prev => [...prev, ...urls])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const onRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // 按日期分组：今天 / 昨天 / 更早
  const getDateGroup = (timestamp: number): string => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000
    if (timestamp >= startOfToday) return '今天'
    if (timestamp >= startOfYesterday) return '昨天'
    return '更早'
  }

  // Conversations items for antdesignx - 带分组与操作菜单
  const conversationItems = sessions.slice(0, 50).map((s) => ({
    key: s.id,
    label: s.title,
    group: getDateGroup(s.updatedAt || s.createdAt),
  }))

  // 会话操作菜单配置（参考 Conversations 文档 menu 属性）
  const conversationMenu = (conversation: any) => ({
    items: [
      { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'delete') {
        deleteSession(String(conversation.key))
      }
    },
  })

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#10b981',
          borderRadius: 12,
        },
      }}
    >
      <App>
        <div className={cn(
          "h-[100dvh] w-full overflow-hidden font-sans transition-colors duration-500 fixed inset-0",
          darkMode ? "bg-zinc-950 text-zinc-100" : "bg-white text-gray-900"
        )}>
          {/* 简洁背景 - 纯白或深色 */}
          <div className={cn(
            "fixed inset-0 z-0 pointer-events-none",
            darkMode ? "bg-zinc-950" : "bg-white"
          )} />

          {/* Sidebar - 固定左侧，随 drawerOpen 滑入滑出 */}
          <aside
            className={cn(
              "fixed top-0 left-0 bottom-0 z-30 w-[320px] flex flex-col transition-transform duration-300 ease-out pt-12",
              darkMode ? "bg-[#18181b]" : "bg-[#fafafa]",
              drawerOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
          {/* Sidebar 内容：用户信息 + 会话管理 */}
          {/* 用户信息 + 快捷操作 一体化卡片（无边框无阴影） */}
            <div className={cn(
              "shrink-0 mx-3 mt-4 rounded-xl overflow-hidden",
              darkMode ? "bg-zinc-800" : "bg-white"
            )}>
              {/* 用户信息行 - 点击进入设置 */}
              <div
                onClick={() => { setDrawerOpen(false); setSettingsOpen(true) }}
                className={cn(
                  "flex items-center gap-3.5 p-5 cursor-pointer transition-colors active:scale-[0.99]",
                  darkMode ? "hover:bg-zinc-700/50" : "hover:bg-zinc-50"
                )}
              >
                {/* 头像 */}
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                  "ring-2 ring-zinc-200",
                  !user?.avatar_url && "bg-zinc-200 text-zinc-600"
                )}>
                  {user?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-semibold">{user?.username?.[0]?.toUpperCase() || "U"}</span>
                  )}
                </div>
                {/* 用户信息 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-[15px] font-semibold truncate", darkMode ? "text-zinc-100" : "text-zinc-900")}>
                      {user?.username || "用户"}
                    </span>
                  </div>
                  <div className={cn("text-xs mt-1", darkMode ? "text-zinc-500" : "text-zinc-400")}>
                    {user?.membership === 'plus' ? 'Plus 会员 · 无限使用' :
                     user?.membership === 'pro' ? 'Pro 会员 · 70次/天' :
                     '免费用户 · 升级解锁更多'}
                  </div>
                </div>
                <ChevronRight size={16} className={cn("shrink-0", darkMode ? "text-zinc-600" : "text-zinc-400")} />
              </div>

              {/* Divider */}
              <div className={cn("h-px mx-3", darkMode ? "bg-zinc-700" : "bg-zinc-100")} />

              {/* 快捷操作按钮组 - 三列均分，divider 分隔 */}
              <div className="flex items-stretch">
                <button
                  onClick={openReportsModal}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 py-3.5 transition-colors active:bg-zinc-100",
                    darkMode && "active:bg-zinc-700/50 hover:bg-zinc-700/30"
                  )}
                >
                  <FileText size={18} className={cn(darkMode ? "text-zinc-400" : "text-zinc-500")} />
                  <span className={cn("text-[11px]", darkMode ? "text-zinc-300" : "text-zinc-600")}>报告</span>
                </button>
                <div className={cn("w-px my-1.5", darkMode ? "bg-zinc-700" : "bg-zinc-100")} />
                <button
                  onClick={() => setActionsModalOpen(true)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 py-3.5 transition-colors active:bg-zinc-100",
                    darkMode && "active:bg-zinc-700/50 hover:bg-zinc-700/30"
                  )}
                >
                  <Activity size={18} className={cn(darkMode ? "text-zinc-400" : "text-zinc-500")} />
                  <span className={cn("text-[11px]", darkMode ? "text-zinc-300" : "text-zinc-600")}>操作记录</span>
                </button>
                <div className={cn("w-px my-1.5", darkMode ? "bg-zinc-700" : "bg-zinc-100")} />
                <button
                  onClick={() => { setDrawerOpen(false); router.push("/plans") }}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 py-3.5 transition-colors active:bg-zinc-100",
                    darkMode ? "hover:bg-zinc-700/30 active:bg-zinc-700/50" : "hover:bg-zinc-50"
                  )}
                >
                  <Crown size={18} className="text-emerald-600" />
                  <span className={cn("text-[11px]", darkMode ? "text-emerald-400" : "text-emerald-600")}>升级订阅</span>
                </button>
              </div>
            </div>

            {/* 历史对话列表 - 白色卡片（含标题） */}
            <div className={cn(
              "flex-1 overflow-y-auto mx-3 mt-4 mb-3 rounded-xl overflow-hidden flex flex-col",
              darkMode ? "bg-zinc-800" : "bg-white"
            )}>
              {/* 卡片内标题 */}
              <div className={cn(
                "shrink-0 flex items-center gap-2 px-4 pt-3 pb-2",
                darkMode ? "text-zinc-500" : "text-zinc-400"
              )}>
                <span className="text-[11px] font-medium uppercase tracking-wider">会话管理</span>
                <div className={cn("flex-1 h-px", darkMode ? "bg-zinc-700" : "bg-zinc-100")} />
              </div>

              <Conversations
                activeKey={sessionId}
                onActiveChange={(key: string) => {
                  setSessionId(String(key))
                  setDrawerOpen(false)
                }}
                items={conversationItems}
                menu={conversationMenu}
                groupable={{
                  collapsible: true,
                  defaultExpandedKeys: ['今天', '昨天', '更早'],
                }}
                styles={{
                  item: { borderRadius: 8, padding: '10px 12px', margin: '4px 4px' },
                }}
              />
            </div>
          </aside>

          {/* 遮罩层 - 点击关闭 sidebar */}
          {drawerOpen && (
            <div
              className="fixed inset-0 z-20 bg-black/30 transition-opacity"
              onClick={() => setDrawerOpen(false)}
            />
          )}

          {/* 主面板 - 随 sidebar 展开向右滑动 */}
          <div
            className={cn(
              "absolute inset-0 z-10 flex flex-col transition-transform duration-300 ease-out",
              darkMode ? "bg-zinc-950" : "bg-white",
              drawerOpen ? "translate-x-[320px]" : "translate-x-0"
            )}
          >
          {/* Header */}
          <div className={cn(
            "shrink-0 px-4 pt-12 pb-2 z-40",
            darkMode ? "bg-zinc-900/80 backdrop-blur-xl" : "bg-white/80 backdrop-blur-xl"
          )}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <AntButton 
                  type="text" 
                  icon={<MenuOutlined />} 
                  onClick={() => setDrawerOpen(true)}
                  size="large"
                />
                <div className="min-w-0 flex-1 max-w-[180px]">
                  <DynamicModelSelector value={selectedModel || aiSettings?.model || ""} onValueChange={setSelectedModel} />
                </div>
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                <AntButton
                  type="text"
                  icon={<SquarePen size={18} />}
                  onClick={() => createNewSession()}
                  size="large"
                  title="新对话"
                />
                <AntButton
                  type="text"
                  icon={darkMode ? <Sun size={20} /> : <Moon size={20} />}
                  onClick={() => setDarkMode(!darkMode)}
                  size="large"
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div 
            ref={mainScrollRef}
            className="flex-1 overflow-y-auto pt-2 pb-24 relative z-10"
          >
            {messages.length === 0 ? (
              <MateChatHome
                darkMode={darkMode}
                onSendMessage={(msg) => handleSend(msg)}
              />
            ) : (
              <ChatBubbleList
                messages={messages}
                isLoading={isLoading}
                darkMode={darkMode}
                deviceData={deviceData}
                onExecuteCommand={async (cmd) => { await executeCommands([cmd]) }}
                onSendMessage={(msg) => handleSend(msg)}
                onSetInput={(text) => setInput(text)}
                onOpenStudio={onOpenStudio}
                onTtsSpeak={handleTtsSpeak}
                onRegenerate={() => {
                  // 重新生成最后一条AI消息
                  const lastUserMessage = messages.filter(m => m.role === 'user').pop()
                  if (lastUserMessage) {
                    const userContent = typeof lastUserMessage.content === 'string' 
                      ? lastUserMessage.content 
                      : lastUserMessage.content.map(c => c.type === 'text' ? c.text : '').join('')
                    handleSend(userContent)
                  }
                }}
                onDeleteMessage={(index) => {
                  // 删除指定消息
                  setMessages(prev => prev.filter((_, i) => i !== index))
                  toast.success("消息已删除")
                }}
                onQuoteMessage={(text) => {
                  // 引用消息到输入框
                  setInput(prev => prev + `\n> ${text}\n\n`)
                  toast.success("已引用到输入框")
                }}
              />
            )}
            <div ref={messagesEndRef} />
            
            {/* Prompts after assistant message */}
            {messages.length > 0 && !isLoading && messages[messages.length - 1]?.role === "assistant" && (
              <div className="px-4 pb-4">
                <Prompts
                  title="你可能还想问："
                  vertical
                  styles={{
                    item: { padding: '8px 12px', fontSize: 13, borderRadius: 8 },
                    title: { fontSize: 13, marginBottom: 6 },
                    icon: { fontSize: 14 },
                    description: { fontSize: 12 },
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
              </div>
            )}
          </div>

          {/* Input */}
          <ChatSenderInput
            input={input}
            setInput={setInput}
            onSend={(text) => handleSend(text)}
            isLoading={isLoading}
            darkMode={darkMode}
            attachments={attachments}
            onSelectFiles={onSelectFiles}
            onRemoveAttachment={onRemoveAttachment}
            approvalMode={approvalMode}
            setApprovalMode={setApprovalMode}
            enableReasoning={enableReasoning}
            setEnableReasoning={setEnableReasoning}
            enableSearch={enableSearch}
            setEnableSearch={setEnableSearch}
          />

          {/* Settings Modal - 与 PC 端一致 */}
          <AISettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            user={user}
          />

          {/* 报告查看器 - 全屏 Drawer */}
          <Drawer
            title={
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} className="text-emerald-500 shrink-0" />
                <span className="truncate text-sm font-medium">{reportViewer?.title || "报告"}</span>
              </div>
            }
            placement="right"
            open={!!reportViewer}
            onClose={() => setReportViewer(null)}
            width="100%"
            className={cn(darkMode && "dark")}
            styles={{
              body: { padding: 0, background: darkMode ? "#18181b" : "#fff" },
              header: { padding: "12px 16px", borderBottom: `1px solid ${darkMode ? "#27272a" : "#e4e4e7"}` },
            }}
            extra={
              <div className="flex items-center gap-1">
                <AntButton
                  type="text"
                  size="small"
                  icon={<Download size={15} />}
                  onClick={() => {
                    if (!reportViewer) return
                    const blob = new Blob([reportViewer.html], { type: "text/html;charset=utf-8" })
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement("a")
                    link.href = url
                    link.download = `${reportViewer.title}_${Date.now()}.html`
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    URL.revokeObjectURL(url)
                    toast.success("报告已下载")
                  }}
                />
                <AntButton
                  type="text"
                  size="small"
                  icon={<ExternalLink size={15} />}
                  onClick={() => {
                    if (!reportViewer) return
                    const newWindow = window.open("", "_blank")
                    if (newWindow) {
                      newWindow.document.write(reportViewer.html)
                      newWindow.document.close()
                    }
                  }}
                />
              </div>
            }
          >
            {reportViewer && (
              <div className="h-full overflow-y-auto">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none p-4"
                  dangerouslySetInnerHTML={{ __html: reportViewer.html }}
                />
              </div>
            )}
          </Drawer>

          {/* 我的报告列表 Modal */}
          <Modal
            title="我的报告"
            open={reportsModalOpen}
            onCancel={() => setReportsModalOpen(false)}
            footer={null}
            className={cn(darkMode && "dark")}
            width="100%"
            style={{ top: 20, maxWidth: 500, margin: "0 auto" }}
            styles={{
              body: { padding: 0, maxHeight: "70vh", overflow: "auto" },
            }}
          >
            {spaceReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <FileText size={40} className={cn("mb-3", darkMode ? "text-zinc-700" : "text-zinc-300")} />
                <p className={cn("text-sm", darkMode ? "text-zinc-500" : "text-zinc-400")}>
                  暂无报告<br />让莓小智为你生成一份分析报告吧
                </p>
              </div>
            ) : (
              <div className="py-2">
                {spaceReports.map((report) => (
                  <div
                    key={report.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-colors group",
                      darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-100"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      "bg-emerald-500/10"
                    )}>
                      <FileText size={16} className="text-emerald-500" />
                    </div>
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setReportsModalOpen(false)
                        if (report.html) setReportViewer({ title: report.title, html: report.html })
                      }}
                    >
                      <div className={cn("text-sm font-medium truncate", darkMode ? "text-zinc-100" : "text-zinc-900")}>
                        {report.title}
                      </div>
                      <div className={cn("text-[11px] mt-0.5", darkMode ? "text-zinc-500" : "text-zinc-400")}>
                        {new Date(report.timestamp).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </button>
                    <button
                      onClick={() => deleteSpaceReport(report.id)}
                      className={cn(
                        "shrink-0 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity",
                        darkMode ? "hover:bg-zinc-700 text-zinc-500" : "hover:bg-zinc-200 text-zinc-400"
                      )}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Modal>

          {/* AI 操作记录 Modal */}
          <Modal
            title="AI 操作记录"
            open={actionsModalOpen}
            onCancel={() => setActionsModalOpen(false)}
            footer={null}
            className={cn(darkMode && "dark")}
            width="100%"
            style={{ top: 20, maxWidth: 500, margin: "0 auto" }}
            styles={{
              body: { padding: 0, maxHeight: "70vh", overflow: "auto" },
            }}
          >
            {notices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <Activity size={40} className={cn("mb-3", darkMode ? "text-zinc-700" : "text-zinc-300")} />
                <p className={cn("text-sm", darkMode ? "text-zinc-500" : "text-zinc-400")}>
                  暂无操作记录<br />本次会话的工具调用将显示在这里
                </p>
              </div>
            ) : (
              <div className="py-2">
                {notices.slice().reverse().map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 mx-2 rounded-xl",
                      darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-100"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      n.variant === 'error' ? "bg-red-500/10" :
                      n.variant === 'success' ? "bg-emerald-500/10" :
                      "bg-blue-500/10"
                    )}>
                      {n.variant === 'error' ? <AlertCircle size={16} className="text-red-500" /> :
                       n.variant === 'success' ? <CheckCircle2 size={16} className="text-emerald-500" /> :
                       <Loader2 size={16} className="text-blue-500 animate-spin" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-sm font-medium", darkMode ? "text-zinc-100" : "text-zinc-900")}>
                        {n.title}
                      </div>
                      {n.description && (
                        <div className={cn("text-[11px] mt-0.5 break-words", darkMode ? "text-zinc-500" : "text-zinc-400")}>
                          {n.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Modal>

          {/* Notices */}
          <div className="fixed top-20 left-4 right-4 z-50 flex flex-col gap-2">
            <AnimatePresence>
              {notices.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className={cn(
                    "rounded-xl px-4 py-3 shadow-lg backdrop-blur-xl",
                    n.variant === "loading" ? "bg-blue-500/90 text-white" :
                    n.variant === "success" ? "bg-emerald-500/90 text-white" :
                    n.variant === "error" ? "bg-red-500/90 text-white" :
                    darkMode ? "bg-zinc-800/90 text-zinc-100" : "bg-white/90 text-gray-900"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {n.variant === "loading" && <Loader2 className="size-4 animate-spin" />}
                      {n.variant === "success" && <CheckCircle2 className="size-4" />}
                      {n.variant === "error" && <AlertCircle className="size-4" />}
                      <span className="font-medium text-sm">{n.title}</span>
                    </div>
                    <button onClick={() => closeNotice(n.id)} className="text-white/80 hover:text-white">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {n.description && (
                    <p className="text-xs mt-1 opacity-80">{n.description}</p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          </div>
        </div>
      </App>
    </ConfigProvider>
  )
}