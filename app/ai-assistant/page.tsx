"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import type { UserPublic } from "@/lib/db/user-service"
import { Mic, MicOff, RotateCcw, Copy, Trash, SquarePen, Library, CircleHelp, PanelLeftClose, PanelLeftOpen, CheckCircle2, AlertCircle, Loader2, Globe, ImageIcon, FileText, Sun, Activity, Sprout, Zap, ArrowUpRight, Wand2, Download, Phone, Play, Pause, Volume2, VolumeX, Camera, Signal } from "lucide-react";
import { AtSign } from "@/components/animate-ui/icons/at-sign";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false })
const MermaidChart = dynamic(() => import("@/components/mermaid-chart"), {
  ssr: false,
  loading: () => <div className="p-4 text-xs text-zinc-400">Loading diagram...</div>
})

const ChartRenderer = dynamic(() => import("@/components/chart-renderer"), {
  ssr: false,
  loading: () => <div className="p-4 text-xs text-zinc-400">Loading chart...</div>
})

import { Settings } from "@/components/animate-ui/icons/settings";
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
import * as htmlToImage from 'html-to-image'
import jsPDF from "jspdf"
import { toast } from "sonner"

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

import { AISettingsDialog, getVoiceSettings } from "@/components/ai-settings-dialog"
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
import { VoiceChatModal } from "@/components/ai/voice-chat-modal"
import { CalendarTrigger } from "@/components/ai/calendar-trigger"
import { MCPStatusIndicator } from "@/components/mcp/mcp-status-indicator"
import { MCPToolDisplay } from "@/components/ai/mcp-tool-display"
import QwenVoiceInput from "@/components/ui/qwen-voice-input"


import { BrowserActivity } from "@/components/ai/browser-activity"
import { WebPreview, WebPreviewNavigation, WebPreviewNavigationButton, WebPreviewUrl, WebPreviewBody } from "@/components/ai/web-preview"

import { DeviceControlCard } from "@/components/ai/device-control-card"

import { LiveStreamPlayer } from "@/components/live-stream-player"

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
  model?: string // 添加模型字段
  isSilent?: boolean // 是否在 UI 中隐藏
}

interface AISettings {
  apiKey: string
  apiUrl: string
  model: string
  systemPrompt: string
}

function isVLMModel(model: string | undefined): boolean {
  if (!model) return false
  const m = model.toLowerCase()
  return (
    m.includes('vision') ||
    m.includes('-vl-') ||
    /qwen\d*-vl/.test(m) ||
    m.includes('qwen-vl') ||
    m.includes('qwen3-vl') ||
    m.includes('qvq')
  )
}

interface SessionMeta { id: string; title: string; createdAt: number; updatedAt: number }

// 任务列表组件 (Dynamic Task Planner) - 参考设计实现
const DynamicTaskPlanner = ({ content, onOpenStudio, isPaused, onTogglePause }: { content: string, onOpenStudio?: () => void, isPaused?: boolean, onTogglePause?: (paused: boolean) => void }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [elapsedTime, setElapsedTime] = useState(0)

  const tasksData = (() => {
    try {
      const match = content.match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/)
      if (!match) return null
      return JSON.parse(match[1])
    } catch { return null }
  })()

  const tasks = tasksData?.tasks || []
  const allCompleted = tasks.length > 0 && tasks.every((t: any) => t.status === 'completed');

  useEffect(() => {
    if (!isVisible || isPaused || allCompleted) return
    const timer = setInterval(() => setElapsedTime(p => p + 1), 1000)
    return () => clearInterval(timer)
  }, [isVisible, isPaused, allCompleted])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }
  
  if (!isVisible) return null

  try {
    const activeIndex = tasks.findIndex((t: any) => t.status === 'in_progress')
    const currentIndex = activeIndex !== -1 ? activeIndex : tasks.length - 1
    const activeTask = tasks[currentIndex] || tasks[0]

    // 模拟子任务/工具调用列表，如果数据里没有的话
    const getMockSubActions = (title: string, taskStatus: string) => [
      { icon: <Globe size={14} />, text: `正在通过 MCP 工具搜索 "${title}" 相关的最佳实践...`, status: 'completed' },
      { icon: <Activity size={14} />, text: `正在调用大棚传感器获取实时环境数据...`, status: 'completed' },
      { icon: <Zap size={14} />, text: `正在生成控制指令流...`, status: (taskStatus === 'completed' || allCompleted) ? 'completed' : 'in_progress' }
    ]
    
    // 如果任务已完成，强制所有子任务也标记为完成
    const subActions = (activeTask?.subActions || getMockSubActions(activeTask?.title || "任务", activeTask?.status)).map((sa: any) => 
      (allCompleted || activeTask?.status === 'completed') ? { ...sa, status: 'completed' } : sa
    );

    return (
      <div className="my-8 w-full max-w-2xl bg-white/70 backdrop-blur-xl rounded-[28px] border border-zinc-200/50 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] overflow-hidden relative group/planner animate-in fade-in slide-in-from-bottom-8 duration-700 font-sans dark:bg-[#1C1C1E]/80 dark:border-white/5">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-100/80 dark:border-white/5 bg-white/30 dark:bg-black/20">
          <div className="flex items-center gap-3">
             <div className={cn(
               "size-2 rounded-full",
               allCompleted ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-blue-500 animate-pulse"
             )} />
             <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
               <span>
                 {allCompleted ? "任务已全部达成" : "执行中"} | 执行用时: {formatTime(elapsedTime)}
               </span>
             </div>
          </div>
          
          <button 
            onClick={onOpenStudio}
            className="group/btn flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all px-4 py-2 rounded-full bg-zinc-100 hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30"
          >
            <Zap size={14} className="fill-current group-hover/btn:scale-110 transition-transform" />
            <span>打开工作室</span>
            <ArrowUpRight size={14} className="opacity-50 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
          </button>
        </div>
        
        {/* Body */}
        <div className="flex flex-col sm:flex-row">
          {/* Left: Professional Stepper */}
          <div className="w-full sm:w-[200px] md:w-[240px] border-r border-zinc-100 dark:border-white/5 p-6 space-y-7 bg-zinc-50/30 dark:bg-black/10">
            {tasks.map((task: any, idx: number) => {
              const isActive = idx === currentIndex && !allCompleted
              const isPast = idx < currentIndex || task.status === 'completed'
              const isFailed = task.status === 'failed'
              
              return (
                <div key={idx} className="flex items-start gap-4 relative group/item">
                  {idx !== tasks.length - 1 && (
                    <div className={cn(
                        "absolute left-[11px] top-8 bottom-[-28px] w-[1.5px] transition-colors duration-500",
                        isPast ? "bg-blue-500/30 dark:bg-blue-500/20" : "bg-zinc-100 dark:bg-zinc-800"
                    )} />
                  )}
                  
                  <div className={cn(
                    "relative z-10 flex items-center justify-center shrink-0 size-6 rounded-full text-[10px] font-black transition-all duration-500",
                    isActive ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-110" : 
                    isPast ? "bg-emerald-500 text-white" : 
                    isFailed ? "bg-red-500 text-white" :
                    "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-700"
                  )}>
                    {isPast ? <CheckCircle2 size={12} strokeWidth={3} /> : isFailed ? <X size={12} strokeWidth={3} /> : idx + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "text-xs font-bold leading-tight transition-all duration-500 truncate",
                      isActive ? "text-zinc-900 dark:text-white translate-x-1" : 
                      isPast ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-600"
                    )}>
                      {task.title}
                    </div>
                    {isActive && !allCompleted && (
                        <div className="text-[10px] text-blue-500 dark:text-blue-400 font-medium mt-1 truncate animate-in fade-in slide-in-from-left-1 duration-500">
                            正在处理任务...
                        </div>
                    )}
                    {allCompleted && idx === tasks.length - 1 && (
                        <div className="text-[10px] text-emerald-500 font-medium mt-1 truncate animate-in fade-in slide-in-from-left-1 duration-500">
                            任务已圆满完成
                        </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
 
          {/* Right: Modern Activity Feed */}
          <div className="flex-1 p-7 bg-white/20 dark:bg-[#1C1C1E]/20">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                  {activeTask?.title || "核心进程"}
                </h3>
                <div className={cn(
                  "px-2.5 py-1 rounded-lg",
                  allCompleted ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-blue-50 dark:bg-blue-900/20"
                )}>
                    <span className={cn(
                      "text-[10px] font-bold",
                      allCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                    )}>
                      {allCompleted ? "完成 100%" : `步骤 ${currentIndex + 1}/${tasks.length}`}
                    </span>
                </div>
            </div>
            
            <div className="space-y-4">
              {subActions.map((action: any, idx: number) => {
                const isSubActive = action.status === 'in_progress'
                const isSubPast = action.status === 'completed'
                return (
                  <div 
                    key={idx} 
                    className={cn(
                      "group/action flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 border border-transparent",
                      isSubActive ? "bg-white dark:bg-zinc-800/80 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border-zinc-200/50 dark:border-white/5 ring-1 ring-blue-500/10 scale-[1.02]" : "hover:bg-zinc-100/50 dark:hover:bg-white/5"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center size-9 rounded-xl transition-all duration-500",
                      isSubActive ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : 
                      isSubPast ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-500" :
                      "bg-zinc-50 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600"
                    )}>
                      {isSubActive ? <Loader2 size={18} className="animate-spin" /> : React.cloneElement(action.icon as React.ReactElement, { size: 18 })}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className={cn(
                          "text-[13px] transition-colors truncate",
                          isSubActive ? "text-zinc-900 dark:text-white font-bold" : "text-zinc-600 dark:text-zinc-400 font-medium"
                        )}>
                          {action.text}
                        </div>
                        {isSubActive && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-500/80 font-bold uppercase tracking-tighter">
                                <span className="animate-pulse">Active Process</span>
                                <span className="size-1 rounded-full bg-blue-500 animate-bounce" />
                            </div>
                        )}
                    </div>
                    
                    {isSubPast && (
                      <div className="size-5 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-500">
                        <CheckCircle2 size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Elegant Execution Controls */}
            <div className="mt-10 flex items-center justify-between pt-6 border-t border-zinc-100/80 dark:border-white/5">
              <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                  <Activity size={12} />
                  <span>{allCompleted ? "所有自动化任务已圆满完成" : "实时自动化执行流已锁定"}</span>
              </div>
              
              {!allCompleted ? (
                <div className="flex items-center gap-3">
                  {isPaused ? (
                    <button 
                      onClick={() => onTogglePause?.(false)}
                      className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                      <Play size={14} className="fill-current" />
                      继续流水线
                    </button>
                  ) : (
                    <button 
                      onClick={() => onTogglePause?.(true)}
                      className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold text-zinc-700 bg-white border border-zinc-200/50 hover:bg-zinc-50 rounded-2xl transition-all shadow-sm hover:shadow-md active:scale-95 dark:text-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700"
                    >
                      <Pause size={14} className="fill-current" />
                      挂起任务
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100/50 dark:border-emerald-500/20 animate-in zoom-in duration-500">
                   <CheckCircle2 size={16} className="text-emerald-500" />
                   <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">流水线执行完毕</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  } catch (e) {
    console.error("Failed to parse task list", e)
    return null
  }
}

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
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>("")
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [enableSearch, setEnableSearch] = useState(false)
  const [enableReasoning, setEnableReasoning] = useState(false)
  const [isTTSEnabled, setIsTTSEnabled] = useState(true) // TTS Toggle
  const [isTtsPaused, setIsTtsPaused] = useState(false) // 真正的播放暂停
  
  const ttsQueueRef = useRef<string[]>([])
  const ttsAudioQueueRef = useRef<{url: string, text: string}[]>([]) // 声音缓冲池
  const isFetchingTtsRef = useRef(false)
  const isPlayingTtsRef = useRef(false)
  const audioContextRef = useRef<HTMLAudioElement | null>(null)
  const isTtsPausedRef = useRef(false)

  // 视觉巡检状态
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionCamera, setInspectionCamera] = useState<'a' | 'b'>('a');
  const [inspectionStatus, setInspectionStatus] = useState<string>('');
  const [inspectionCameraUrl, setInspectionCameraUrl] = useState<string | null>(null);

  // 1. 生产者：后台无缝预加载声音片段
  const fetchNextTts = async () => {
    if (isFetchingTtsRef.current || isStoppedRef.current) return
    isFetchingTtsRef.current = true

    // 维持缓冲池里始终有3句话在准备，消除网络请求等待带来的顿挫感
    while (ttsQueueRef.current.length > 0 && ttsAudioQueueRef.current.length < 3 && !isStoppedRef.current && isTTSEnabled) {
      const text = ttsQueueRef.current.shift()
      if (!text) continue

      try {
        const voiceConfig = getVoiceSettings()
        const res = await fetch('/api/ai/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: voiceConfig?.voice || "Cherry"
          })
        })
        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          ttsAudioQueueRef.current.push({ url, text })
          
          // 如果系统闲置，立马打火播放
          if (!isPlayingTtsRef.current) {
            playNextTtsAudio()
          }
        }
      } catch (e) {
        console.error('TTS Fetch Error:', e)
      }
    }

    isFetchingTtsRef.current = false
  }

  // 2. 消费者：毫秒级无缝播放缓冲好的声音
  const playNextTtsAudio = async () => {
    if (isPlayingTtsRef.current || ttsAudioQueueRef.current.length === 0 || isStoppedRef.current || !isTTSEnabled) return
    isPlayingTtsRef.current = true
    
    const item = ttsAudioQueueRef.current.shift()
    if (!item) {
       isPlayingTtsRef.current = false
       return
    }

    try {
      const audio = new window.Audio(item.url)
      audioContextRef.current = audio
      
      await new Promise<void>((resolve) => {
        // 当这个音频播放完时立刻 Resolve，下个音频秒接
        audio.onended = () => resolve()
        audio.onerror = () => resolve()
        
        let wasPaused = false
        const interval = setInterval(() => {
          if (isStoppedRef.current || !isTTSEnabled) {
            audio.pause()
            clearInterval(interval)
            resolve()
            return
          }
          
          if (isTtsPausedRef.current && !wasPaused) {
             audio.pause()
             wasPaused = true
          } else if (!isTtsPausedRef.current && wasPaused) {
             audio.play().catch(resolve)
             wasPaused = false
          }
        }, 80) // 高频扫描停止与暂停信号
        
        if (!isTtsPausedRef.current) {
           audio.play().catch(resolve)
        } else {
           wasPaused = true
        }
      })
      
      URL.revokeObjectURL(item.url)
      audioContextRef.current = null
    } catch (e) {
      console.error('TTS Play Error:', e)
    }
    
    isPlayingTtsRef.current = false
    
    // 队列空出一个位置，通知生产者可以继续拉取网络请求
    fetchNextTts()
    
    // 自旋播放下一个
    playNextTtsAudio()
  }

  const [autoExecuteCommands, setAutoExecuteCommands] = useState(true) // AI自动执行设备控制
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
  
  // MCP Tool Mention State
  const [availableTools, setAvailableTools] = useState<{name: string, description: string, displayName?: string}[]>([])
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  
  // Browser Activity State
  const [browsingUrl, setBrowsingUrl] = useState<string | null>(null)
  
  // Studio Panel State
  const [studioOpen, setStudioOpen] = useState(false)
  const [studioData, setStudioData] = useState<any[]>([]) // 存储真实的工具执行结果
  const [currentBrowserUrl, setCurrentBrowserUrl] = useState<string | null>(null) // 工作室内部的浏览器URL
  const [browserScreenshot, setBrowserScreenshot] = useState<string | null>(null) // 新增：浏览器截图数据

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
            // 这里我们模拟一些常见的工具列表，实际上应该从后端或定义文件中获取
            // 暂时根据 config.name 来推断工具
            if (config.name === 'caiyun-weather') {
                tools.push({ name: 'mcp_caiyun_weather', displayName: '彩云天气', description: '查询实时天气和预报' })
            } else if (config.name === 'gaode-weather') {
                tools.push({ name: 'mcp_gaode_weather', displayName: '高德天气', description: '查询实时天气' })
            } else if (config.name === 'hefeng-weather') {
                tools.push({ name: 'mcp_hefeng_weather', displayName: '和风天气', description: '查询全球天气' })
            } else if (config.name === 'amap-route') {
                tools.push({ name: 'mcp_amap_route', displayName: '高德路径规划', description: '驾车/步行/骑行路线规划' })
            } else if (config.name === 'brave-search') {
                tools.push({ name: 'mcp_brave_search', displayName: 'Brave 搜索', description: '联网搜索最新信息' })
            } else if (config.name === 'exa-search') {
                tools.push({ name: 'mcp_exa_search', displayName: 'Exa 搜索', description: '深度语义搜索技术文章与论文' })
            } else if (config.name === 'firecrawl') {
                tools.push({ name: 'mcp_firecrawl_scrape', displayName: '网页抓取', description: '抓取网页内容' })
            } else if (config.name === 'soil-sensor') {
                tools.push({ name: 'mcp_soil_sensor_query', displayName: '土壤传感器', description: '查询土壤墒情数据' })
            } else if (config.name === 'crop-disease') {
                tools.push({ name: 'mcp_crop_disease_diagnose', displayName: '病害诊断', description: '作物病虫害识别与防治' })
            } else if (config.name === 'irrigation-system') {
                tools.push({ name: 'mcp_irrigation_query', displayName: '灌溉系统', description: '智能灌溉控制与查询' })
            } else if (config.name === 'farm-data') {
                tools.push({ name: 'mcp_farm_data_query', displayName: '农场数据', description: '农场运营数据分析' })
            } else if (config.name === 'spectrum-stravision') {
                tools.push({ name: 'get_channel', displayName: '光谱通道', description: '获取指定波长光谱值' })
                tools.push({ name: 'get_all_spectrum', displayName: '全波段光谱', description: '获取所有18通道数据' })
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

  // Agent 状态指示器
  const [agentStatus, setAgentStatus] = useState<string>("")
  
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

  const [notices, setNotices] = useState<{ id: number; title: string; description?: string; variant?: 'loading' | 'success' | 'error'; expanded: boolean }[]>([])
  const noticeIdCounter = useRef(0)

  const showNotice = (title: string, description?: string, variant?: 'loading' | 'success' | 'error') => {
    const id = ++noticeIdCounter.current
    setNotices(prev => [...prev, { id, title, description, variant, expanded: false }])

    if (variant && variant !== 'loading') {
      setTimeout(() => {
        setNotices(prev => prev.filter(n => n.id !== id))
      }, 5000)
    }
  }

  const handleOptimizePrompt = async () => {
    if (!input.trim()) return
    if (!aiSettings?.apiKey) { setSettingsOpen(true); return }
    
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
      if (audioContextRef.current) {
        audioContextRef.current.pause()
        audioContextRef.current = null
      }
      ttsQueueRef.current = []
      ttsAudioQueueRef.current = []
      isPlayingTtsRef.current = false
      isFetchingTtsRef.current = false
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

  const isStoppedRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const feedbackTimeoutIdsRef = useRef<NodeJS.Timeout[]>([])

  const handleStop = () => {
    // 1. 中止网络请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort("Task terminated by user")
      abortControllerRef.current = null
    }
    
    // Stop TTS
    if (audioContextRef.current) {
      audioContextRef.current.pause()
      audioContextRef.current = null
    }
    ttsQueueRef.current = []
    ttsAudioQueueRef.current = []
    isPlayingTtsRef.current = false

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
    
    // 设备名称映射 (Relay 5=水泵, 6=风扇, 7=补光灯, 8=白灯)
    const deviceNames: Record<string, string> = {
      '5': '水泵',
      '6': '风扇', 
      '7': '补光灯',
      '8': '白灯'
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
请立即停止尝试该指令！
请将当前任务标记为 "failed" (超时/无响应) 或 "completed" (假定已执行)，然后**必须**跳到下一步骤。`);
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
          // 循环检测暂停状态
          while (isTaskPausedRef.current) {
            if (isStoppedRef.current) break
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          if (isStoppedRef.current) break

          // 先显示小圆点，再展开
          setExecutingDeviceName("RGB补光灯")
          setTimeout(() => setDevicePillExpanded(true), 150)
          const res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set_led', r: cmd.r, g: cmd.g, b: cmd.b })
          })
          if (res.ok) {
            showNotice("调控成功 ✅", `已开启补光灯 (R:${cmd.r} G:${cmd.g} B:${cmd.b})`, "success")
          } else {
            let err = ''
            try { const j = await res.json(); err = j?.error || '' } catch { }
            showNotice("调控失败", err || `请求错误 ${res.status}`, "error")
          }
        } else if (cmd.action === "toggle_relay") {
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
          
          // 如果是开启补光灯 (relay7)，由于 set_led 也会控制 relay7，这里可以增加一个判断或合并逻辑
          // 但目前保持独立调用以兼容旧设备逻辑
          
          const res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_relay', device: cmd.device, value: cmd.value })
          })
          if (res.ok) {
            showNotice("开关执行成功 ✅", `${devName} 已${cmd.value === 1 ? '开启' : '关闭'}`, "success")
          } else {
            let err = ''
            try { const j = await res.json(); err = j?.error || '' } catch { }
            showNotice("开关执行失败", err || `请求错误 ${res.status}`, "error")
          }
        } else if (cmd.action === "control_camera") {
          // 循环检测暂停状态
          while (isTaskPausedRef.current) {
            if (isStoppedRef.current) break
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          if (isStoppedRef.current) break

          // 摄像头云台控制
          const directionNames = ['停止', '左移', '右移']
          const dirName = directionNames[cmd.direction ?? 0] || '控制'
          setExecutingDeviceName("摄像头云台")
          setTimeout(() => setDevicePillExpanded(true), 150)
          const res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'control_camera', direction: cmd.direction, pulses: cmd.pulses })
          })
          if (res.ok) {
            showNotice("云台控制成功 ✅", `摄像头云台${dirName}`, "success")
          } else {
            let err = ''
            try { const j = await res.json(); err = j?.error || '' } catch { }
            showNotice("云台控制失败", err || `请求错误 ${res.status}`, "error")
          }
        } else if (cmd.action === "move_camera_and_look") {
          // AI 视觉巡检：移动云台 + 截图 + 发送VLM分析
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

          setIsInspecting(true)
          setInspectionCamera(cameraId)
          setInspectionStatus("初始化巡检任务...")

          // Step 1: 移动云台（如果direction不为0）
          if (direction !== 0) {
            const moveMsg = `正在将摄像头云台${direction === 1 ? '左移' : '右移'} ${(pulses / 160).toFixed(1)}mm...`;
            setInspectionStatus(moveMsg);
            showNotice("🔄 视觉巡检", moveMsg, "loading")
            try {
              const moveRes = await fetch('/api/ai/device-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'control_camera', direction, pulses })
              })
              if (!moveRes.ok) {
                const errData = await moveRes.json().catch(() => ({}))
                showNotice("云台移动失败", errData?.error || '未知错误', "error")
                // 即使移动失败，仍然尝试拍照
              }
            } catch (e) {
              console.error('Stepper move failed:', e)
            }
            // 等待电机运动完成
            await new Promise(resolve => setTimeout(resolve, 2000))
            if (isStoppedRef.current) break
          }

          // Step 2: 获取摄像头 URL
          setInspectionStatus("正在建立摄像头连接...");
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
            setIsInspecting(false);
            showNotice("❌ 视觉巡检失败", "摄像头未配置或不可用", "error")
            // 告知 AI 摄像头不可用
            handleSend(`【系统反馈】视觉巡检失败：摄像头${cameraId === 'b' ? 'B' : 'A'}未配置或不可用。管理员尚未在后台设置摄像头地址。请告知用户无法进行视觉巡检，并使用传感器数据替代。`, [], true, true)
            break
          }

          // Step 3: 加载视频流并截图
          setInspectionStatus(`正在捕捉 ${cameraId === 'b' ? 'B' : 'A'} 摄像头实时画面...`);
          showNotice("📷 视觉巡检", "正在加载摄像头画面，请稍候...", "loading")
          
          // 获取与 Monitor 页面一致的可播放 URL
          const getPlayableUrl = (rawUrl: string) => {
            const url = rawUrl.trim()
            if (!url) return ""

            // 如果本来就是代理地址，直接返回
            if (url.includes('/api/stream-proxy')) return url;

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
          setInspectionCameraUrl(playableUrl)

          let capturedImageBase64 = ''
          try {
            capturedImageBase64 = await new Promise<string>((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('摄像头画面加载超时 (20s)，可能原因：网络延迟、摄像头正在初始化、或画面尚未加载完成'))
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
                  }, 6000) // 增加到 6 秒：给流媒体解码和关键帧渲染留足时间，避免截出黑屏
                }
              }, 500)
            })
          } catch (err: any) {
            console.error('Camera capture failed:', err)
            setIsInspecting(false)
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
          setTimeout(() => setIsInspecting(false), 2000);
          showNotice("✅ 视觉巡检", "画面已发送给 AI 分析", "success")

          // 直接调用 handleSend 发送多模态消息 (bypass loading guard via isSilent=true)
          // 注意：这会触发一次新的 AI 推理循环，必须异步调用不阻塞主线程
          // isFeedback=true 确保允许穿透 loading 锁
          // isSilent=true 确保这条包含截图的丑陋 Prompt 消息不会显示在用户的聊天气泡中，仅作为 AI 视角的内部输入
          setTimeout(() => {
            handleSend(visionMessage as any, [], true, true)
          }, 100)
          
          // 重要：完成视觉巡检后立即跳出当前指令执行循环，避免后续代码继续触发全局反馈循环
          break;
        } else if (cmd.action === "take_camera_snapshot") {
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
            if (url.includes('/api/stream-proxy')) return url;
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
          // 摄像头云台复位到中间
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
            showNotice("云台复位成功 ✅", "丝杆滑台已复位到正中间", "success")
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
      const led1 = snapshot.led1 !== undefined ? snapshot.led1 : '未知';
      const led2 = snapshot.led2 !== undefined ? snapshot.led2 : '未知';
      const led3 = snapshot.led3 !== undefined ? snapshot.led3 : '未知';
      
      snapshotText = `
【执行前数据快照】(仅供对比，请以当前最新数据为准)
- 温度: ${temp}
- 湿度: ${hum}
- 光照: ${light}
- CO2: ${co2}
- 补光灯(Relay7): ${relay7}
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

        setAgentStatus("正在分析闭环控制反馈...")
        
        // 如果是自动执行模式，则继续发送反馈给 AI 进行下一步判断
        if (autoExecuteCommands) {
            let taskContext = "";
            if (originalContent) {
                 const match = originalContent.match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/);
                 if (match) {
                     taskContext = `\n\n【当前任务进度快照】\n${match[0]}\n\n请基于上述进度更新任务状态（例如将当前 in_progress 的任务改为 completed，并将下一个任务设为 in_progress）。`;
                 }
            }

            // 这里触发的是一个普通的闭环查询，isFeedback=true 防止这句提示被当成用户提问
            await handleSend(`指令已执行完毕。

请根据系统提供的【当前最新数据】判断执行效果，并决定下一步操作。
${taskContext}
**重要提示：**
1. 我已开启【自动托管模式】，请不要停下来等待我确认。
2. **状态验证与推进**：请先分析当前设备状态是否已符合预期。如果符合，请更新任务状态为 completed。
3. **继续执行**：检查是否还有下一个 pending 的任务。如果有，请先分析该任务对应的设备状态，然后再输出合适的 JSON 控制指令继续执行。
4. **防死循环**：如果多次执行同一指令环境数据仍未变，请判定为“超时/尽力”，自动跳过并执行下一个任务。
5. **结束任务**：直到所有任务完成或不可逆失败，再做最终总结并停止输出 JSON。`, [], true, true)
        } else {
            setAgentStatus("") 
            setIsLoading(false)
        }
    }
    
    await feedbackLoop()
  }

  const handleSend = async (overrideText?: any, overrideAttachments?: string[], isFeedback: boolean = false, isSilent: boolean = false) => {
    // 过滤掉可能作为事件对象传入的 overrideText（如 onClick={handleSend}）
    if (overrideText && typeof overrideText === 'object' && !Array.isArray(overrideText)) {
      overrideText = undefined;
    }

    // 立即打断当前正在进行的 TTS 语音播报
    if (audioContextRef.current) {
      audioContextRef.current.pause()
      audioContextRef.current = null
    }
    ttsQueueRef.current = []
    ttsAudioQueueRef.current = []
    isPlayingTtsRef.current = false
    setIsTtsPaused(false)
    isTtsPausedRef.current = false

    // 重置停止状态
    isStoppedRef.current = false
    
    // 如果是自动触发的调用（传入了 overrideText），则不需要用户输入
    // 这里不再强制将 overrideText 转换为 string，因为它可能是包含图片的数组
    const isAutoTrigger = typeof overrideText !== "undefined";
    const text = isAutoTrigger ? (typeof overrideText === "string" ? overrideText : "【视觉分析请求】") : input;
    
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
    if (!agentStatus && !isFeedback) {
      setAgentStatus("正在建立安全握手...")
      await new Promise(r => setTimeout(r, 200))
      if (isStoppedRef.current) return
      
      // 根据是否有附件判断是否调用视觉模型
      if (currentAttachments.length > 0) {
        setAgentStatus("正在加载视觉编码器 (Qwen-VL-Plus)...")
        await new Promise(r => setTimeout(r, 400))
        if (isStoppedRef.current) return
      } else {
        setAgentStatus("获取遥测数据: DHT11, BH1750, NPK...")
        await new Promise(r => setTimeout(r, 400))
        if (isStoppedRef.current) return
      }
      
      setAgentStatus("注入上下文向量 & 系统提示词...")
      await new Promise(r => setTimeout(r, 400))
      if (isStoppedRef.current) return
    } else if (isFeedback) {
        // 反馈模式下，不显示感知状态，直接显示"正在重新分析"
        setAgentStatus("正在根据反馈重新分析...")
    }
    
    const isSystemMode = !aiSettings?.apiKey && !aiSettings?.apiUrl;
    const isCustomMode = !!aiSettings?.apiKey || !!aiSettings?.apiUrl;
    
    if (!aiSettings || (!isSystemMode && !isCustomMode)) {
        if (!aiSettings) {
             setSettingsOpen(true); 
             return 
        }
    }
    
    if (!aiSettings) { setSettingsOpen(true); return }

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

    const newMessages: Message[] = [...messages, { role: "user", content: userMessageContent, isSilent }]
    setMessages(newMessages)
    // currentAttachments 已在函数开头定义，这里不需要重复
    setAttachments([])

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
        // 过滤掉可能导致循环引用的对象（比如图片对象中的 DOM 元素引用等）
        const messagesToSave = newMessages.map(m => {
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

      // 注入自动模式状态到 System Prompt (通过修改 messages 中的 system prompt 或者在请求体中传递)
      // 这里我们选择直接拼接到用户的最后一条消息中（如果是自动触发的话），或者在 systemPrompt 字段中处理
      // 为了简单有效，我们临时修改 systemPrompt
      let effectiveSystemPrompt = aiSettings?.systemPrompt || "";
      if (autoExecuteCommands) {
        effectiveSystemPrompt += "\n\n【系统状态注入】当前处于：自动托管模式 (Auto-Pilot Mode)。\n严禁提问！严禁等待用户确认！\n必须直接输出 IoT 设备控制指令 JSON (如 toggle_relay)。\n注意：对于 MCP 工具 (如天气、搜索)，仍必须使用 Native Tool Calling！\n如果遇到问题，请自行尝试解决或跳过。";
      }

      // 获取 MCP 配置
      let mcpConfigs = []
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
                // 从 envVars 中提取 API Key
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

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: newMessages, // 直接发送完整的消息对象，包括可能的数组格式内容
          model: selectedModel || aiSettings?.model,
          apiKey: aiSettings?.apiKey,
          apiUrl: aiSettings?.apiUrl,
          systemPrompt: effectiveSystemPrompt,
          sessionId: ensuredSessionId,
          enableSearch,
          enableReasoning,
          deviceData: deviceDataRef.current,
          weatherData: weatherDataRef.current,
          mcpConfigs // 添加 MCP 配置
        })
      })
      
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

      const assistantMsg: Message = { role: "assistant", content: "" }
      let reasoningText = ""
      let reasoningStart = -1
      const startTs = Date.now()
      setMessages(prev => [...prev, assistantMsg])

      const decoder = new TextDecoder()
      let buffer = ""
      let ttsProcessedLength = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
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

              // Handle tool results
              if (data.tool_result) {
                 setStudioData(prev => [...prev, data.tool_result])
                 
                 // 如果是 Firecrawl 的抓取结果，尝试提取截图（如果有）
                 // 注意：目前的 executeFirecrawlScrape 返回的是 { url, content }，没有 screenshot
                 // 如果未来扩展了截图功能，这里可以处理
                 // 为了模拟效果，我们可以根据 URL 动态生成一个网站缩略图服务链接
                 if (data.tool_result.name === 'mcp_firecrawl_scrape' && data.tool_result.result?.url) {
                     // 使用第三方截图服务作为降级方案
                     const targetUrl = data.tool_result.result.url
                     // 使用微缩图服务，例如 screenshot-layer, thum.io 等，这里用一个免费的作为示例
                     // 或者使用 Google Favicon 服务作为最小兜底
                     // 这里为了演示，我们假设后端可能会返回 screenshot 字段，或者我们前端生成一个
                     setBrowserScreenshot(`https://image.thum.io/get/width/800/crop/600/noanimate/${targetUrl}`)
                 }
                 
                 continue
              }

                // Handle tool calls feedback
              if (data.tool_calls) {
                const toolNames = data.tool_calls.map((t: any) => t.function.name).join(", ")
                setAgentStatus(`正在使用工具: ${toolNames}...`)
                setStudioOpen(true) // 主动展开工作室侧边栏

                // 检查是否有网页抓取工具，如果有则显示浏览器动效
                // 支持 Firecrawl 和 Exa (虽然 Exa 通常不是直接抓取，但为了视觉反馈，也可以显示搜索状态)
                const crawlerCall = data.tool_calls.find((t: any) => t.function.name === 'mcp_firecrawl_scrape' || t.function.name === 'mcp_exa_search' || t.function.name === 'mcp_brave_search')
                if (crawlerCall) {
                    try {
                        const args = JSON.parse(crawlerCall.function.arguments)
                        let url = null
                        if (args.url) {
                            url = args.url
                        } else if (args.query) {
                            // 对于 Exa/Brave 搜索，显示搜索关键词作为"虚拟网页"
                            url = `https://search.engine/search?q=${encodeURIComponent(args.query)}`
                        }
                        
                        if (url) {
                             setBrowsingUrl(url)
                             setCurrentBrowserUrl(url) // 同步到工作室内部浏览器状态
                             setStudioOpen(true) // 确保工作室打开
                        }
                    } catch (e) { console.error("Failed to parse crawler args", e) }
                } else if (data.tool_calls.some((t: any) => t.function.name.includes('scrape') || t.function.name.includes('search'))) {
                    // 兜底：如果没匹配到上面的 crawlerCall 但依然是抓取或搜索类工具，也打开工作室
                    setStudioOpen(true)
                }

                // 构造一个临时的 TASK_LIST 以便让用户看到真实的规划器进度
                const tempTasks = data.tool_calls.map((t: any) => {
                    let title = '执行工具调用'
                    if (t.function.name.includes('search') || t.function.name.includes('scrape')) title = '搜索并分析外部知识'
                    else if (t.function.name.includes('weather')) title = '获取实时天气数据'
                    else if (t.function.name.includes('spectrum')) title = '读取并分析光谱传感器'
                    
                    return {
                        title: title,
                        status: 'in_progress',
                        subActions: [
                            { text: `正在调用 ${t.function.name}...`, status: 'in_progress' }
                        ]
                    }
                })
                const tempTaskListStr = `\n<TASK_LIST>\n${JSON.stringify({ status: 'in_progress', tasks: tempTasks })}\n</TASK_LIST>\n`

                // 添加临时的 TASK_LIST 和 TOOL_USED 标记
                if (typeof assistantMsg.content === "string") {
                    if (!assistantMsg.content.includes('<TASK_LIST>')) {
                        assistantMsg.content += tempTaskListStr
                    }
                }

                data.tool_calls.forEach((t: any) => {
                    // 获取中文描述
                    let desc = "正在执行..."
                    if (t.function.name.includes('search')) desc = "搜索最新信息"
                    else if (t.function.name.includes('weather')) desc = "查询天气"
                    else if (t.function.name.includes('scrape')) desc = "读取网页内容"
                    
                    const loadingTag = `<TOOL_USED toolName="${t.function.name}" description="${desc}" result="loading" />`
                    
                    if (typeof assistantMsg.content === "string") {
                         // 避免重复添加相同的 loading tag
                         if (!assistantMsg.content.includes(`toolName="${t.function.name}"`) || !assistantMsg.content.includes(`result="loading"`)) {
                            assistantMsg.content += loadingTag
                         }
                    }
                })
                
                // 更新 UI
                setMessages(prev => {
                  const newMsgs = [...prev]
                  newMsgs[newMsgs.length - 1] = { ...assistantMsg }
                  return newMsgs
                })

                continue
              }

              const content = data.choices?.[0]?.delta?.content ?? data.content
              if (typeof content === "string") {
                // 当开始接收AI的文本回复时，清理工具调用状态
                if (content.trim() && agentStatus.includes("正在使用工具")) {
                  setAgentStatus("")
                }
                
                // Update assistant message content
                if (typeof assistantMsg.content === "string") {
                    // 当 LLM 开始生成最终回复时，移除临时的加载标记
                    if (content.trim()) {
                        assistantMsg.content = assistantMsg.content.replace(/<TOOL_USED[^>]*result="loading"[^>]*\/>/g, '')
                        // 如果有临时的 TASK_LIST，也将其移除，以便被 AI 真实的 TASK_LIST 覆盖
                        if (assistantMsg.content.includes('"subActions":[{"text":"正在调用')) {
                            assistantMsg.content = assistantMsg.content.replace(/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/g, '')
                        }
                    }
                    assistantMsg.content += content
                } else {
                    assistantMsg.content = content
                }

                // TTS 增量片段解析与阅读：自动忽略所有的代码块与特定 XML 元素(如 task)包含的内容
                if (isTTSEnabled) {
                    const getTTSableText = (text: string) => {
                      if (!text) return ""
                      let s = text
                      // Remove reasoning blocks and markdown code blocks completely
                      s = s.replace(/```[\s\S]*?(?:```|$)/g, '')
                      // Remove block tags like task, device_control, chart, TASK_LIST completely along with inner payload
                      s = s.replace(/<(task|device_control|chart|TASK_LIST|TOOL_USED|REASONING|analyze|plan)(?:[\s>][\s\S]*?(?:<\/\1>|$)|$)/gi, '')
                      // Remove incomplete typing of these tags specifically so it doesn't accidentally read them before parsing finishes
                      s = s.replace(/<\/?(?:t|ta|tas|task|d|de|dev|devi|devic|device|device_|device_c|device_co|device_con|device_cont|device_contr|device_contro|device_control|c|ch|cha|char|chart|T|TA|TAS|TASK|TASK_|TASK_L|TASK_LI|TASK_LIS|TASK_LIST|R|RE|REA|REAS|REASO|REASON|REASONI|REASONIN|REASONING|a|an|ana|anal|analy|analyz|analyze|p|pl|pla|plan)$/i, '')
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
                         ttsQueueRef.current.push(spokenSentence)
                         fetchNextTts()
                      }
                      lastMatchEnd = match.index + match[0].length
                    }
                    ttsProcessedLength += lastMatchEnd
                }
                
                // Simplified reasoning parsing
                const combined = assistantMsg.content as string
                // ... reasoning logic ...
                if (reasoningStart === -1) {
                  const sIdx = combined.indexOf("<REASONING>")
                  if (sIdx !== -1) reasoningStart = sIdx
                }
                
                let display = combined
                if (reasoningStart !== -1) {
                  const endIdx = combined.indexOf("</REASONING>", reasoningStart)
                  if (endIdx !== -1) {
                    reasoningText = combined.slice(reasoningStart + 11, endIdx)
                    display = combined.slice(0, reasoningStart) + combined.slice(endIdx + 12)
                  } else {
                    reasoningText = combined.slice(reasoningStart + 11)
                    display = combined.slice(0, reasoningStart)
                  }
                }

                setMessages(prev => {
                  const newMsgs = [...prev]
                  newMsgs[newMsgs.length - 1] = {
                    role: "assistant",
                    content: display,
                    reasoning: { text: reasoningText, durationMs: Date.now() - startTs },
                    model: selectedModel || aiSettings?.model
                  }
                  return newMsgs
                })
              }
            } catch (e) { 
                console.error("Error parsing stream chunk", e)
            }
          }
        }
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
            ttsQueueRef.current.push(remaining)
            fetchNextTts()
         }
      }

      // 确保流结束时关闭浏览器
      setBrowsingUrl(null)
      if (ensuredSessionId) {
        const lastMsg = {  
          ...assistantMsg, 
          reasoning: { text: reasoningText, durationMs: Date.now() - startTs },
          model: selectedModel || aiSettings?.model // 保存使用的模型
        }
        await fetch(`/api/sessions/${ensuredSessionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [...newMessages, lastMsg] })
        })
      }

      // 如果开启了AI自动执行，检测并执行命令
      if (autoExecuteCommands && typeof assistantMsg.content === 'string') {
        const jsonMatches = [...assistantMsg.content.matchAll(/```json\s*([\s\S]*?)```/g)]
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
            // 再次检查是否已停止
            if (isStoppedRef.current) return;
            // 重要：如果在这次调用中已经触发了设备执行，标记本次会话不再需要通用反馈
            // 通过将 hasSentCustomFeedback 置为 true 避免循环嵌套
            await executeCommands(commands, assistantMsg.content as string)
          }
        }
      }

    } catch (e) {
      console.error("Chat error:", e)
      setMessages(prev => [...prev, { role: "assistant", content: "抱歉，发生了一些错误，请稍后再试。" }])
    } finally {
      // 只有在非静默/非反馈模式下，或者没有正在进行的后续任务时才清除状态
      // 避免内部触发的消息（如巡检反馈）在回复还没开始时就被父级的 finally 清除了状态，导致界面“抽搐”
      if (!isFeedback && !isSilent) {
        setAgentStatus("")
        setIsLoading(false)
        // 额外延迟清理一次，确保彻底结束
        setTimeout(() => {
          if (!isStoppedRef.current) {
            setAgentStatus("")
            setIsLoading(false)
          }
        }, 100)
      }
    }
  }

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
    if (!confirm("确定要删除此会话吗？")) return
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



  const renderMessageContent = (msg: Message, onOpenStudio?: () => void) => {
    let content = msg.content
    
    // 渲染思考过程（如果存在）
    const reasoningElement = msg.reasoning?.text ? (
      <Reasoning isStreaming={false} className="mb-4">
        <ReasoningTrigger />
        <ReasoningContent>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ node, inline, className, children, ...props }: any) => (
                <code className={cn("bg-zinc-100 dark:bg-zinc-800 rounded px-1 font-mono text-xs text-zinc-800 dark:text-zinc-200 font-semibold", className)} {...props}>{children}</code>
              )
            }}
          >
            {msg.reasoning.text}
          </ReactMarkdown>
        </ReasoningContent>
      </Reasoning>
    ) : null
    
    // 1. 先提取 TaskList 内容 (Dynamic Task Planner)
    let dynamicTaskContent = "";
    
    // 预处理 content，如果是 string 类型
    if (typeof content === 'string') {
        // 移除原始的 tool_call 标签，防止泄露到 UI
        content = content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "");
        
        // 增强过滤：仅移除看起来像工具调用的 JSON 参数（通常在抓取或搜索时出现）
        // 我们需要小心，不要误删了设备控制指令
        // 只有包含 firecrawl, exa, search 等关键字的 JSON 块才会被移除
        content = content.replace(/```json\s*\{\s*"action":\s*"(?:mcp_firecrawl_scrape|mcp_exa_search|mcp_brave_search|mcp_weather|scrape|search|find)"[\s\S]*?\}\s*```/g, "");
        content = content.replace(/```json\s*\{\s*"function":\s*"(?:mcp_firecrawl_scrape|mcp_exa_search|mcp_brave_search|mcp_weather|scrape|search|find)"[\s\S]*?\}\s*```/g, "");
        
        // 移除孤立的工具调用 JSON 文本
        content = content.replace(/^\s*\{\s*"action":\s*"(?:mcp_firecrawl_scrape|mcp_exa_search|mcp_brave_search|mcp_weather|scrape|search|find)"[\s\S]*?\}\s*$/gm, "");

        const taskListMatch = content.match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/);
        if (taskListMatch) {
          dynamicTaskContent = taskListMatch[0];
          // 从正文中移除 TaskList，稍后手动添加到最底部
          content = content.replace(/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/g, "");
        }
    }

    if (Array.isArray(content)) {
      return (
        <div className="space-y-2">
          {reasoningElement}
          {content.map((part, i) => (
            <div key={i}>
              {part.type === 'image_url' && part.image_url && (
                <div className="relative w-full max-w-[300px] h-auto rounded-lg overflow-hidden border border-zinc-200 my-2">
                  <Image src={part.image_url.url} alt="User upload" width={300} height={200} className="object-cover w-full h-auto" />
                </div>
              )}
              {part.type === 'text' && part.text && renderTextContent(part.text)}
            </div>
          ))}
          {/* Render DynamicTaskPlanner at the very bottom if it exists */}
          {dynamicTaskContent && <DynamicTaskPlanner content={dynamicTaskContent} onOpenStudio={onOpenStudio} />}
        </div>
      )
    }
    return (
      <>
        {reasoningElement}
        {renderTextContent(typeof content === 'string' ? content : "")}
        {/* Render DynamicTaskPlanner at the very bottom if it exists */}
        {dynamicTaskContent && <DynamicTaskPlanner content={dynamicTaskContent} onOpenStudio={onOpenStudio} />}
      </>
    )
  }

  const renderTextContent = (content: string) => {
    // TaskList extraction moved to renderMessageContent to ensure correct scope
    
    // Split content by CHART, REASONING, SOURCES, and TOOL_USED tags
    // Improved regex to handle multiline content correctly using [\s\S]*? non-greedy match
    // Updated to handle streaming REASONING tags (open tag without close tag yet)
    // Updated to handle spaces in tags (e.g. < TASK_LIST >)
    // Added SCHEDULED_TASKS for legacy/scheduled tasks list
    // Added TOOL_USED for tool usage indicators
    // Also split by JSON code blocks to render them as DeviceControlCard
    const parts = content.split(/(<\s*CHART\s+type="echarts"\s*>[\s\S]*?<\/\s*CHART\s*>|<\s*CHART\s+type="vega-lite"\s*>[\s\S]*?<\/\s*CHART\s*>|<\s*REASONING\s*>[\s\S]*?(?:<\/\s*REASONING\s*>|$)|<\s*SOURCES\s*>[\s\S]*?<\/\s*SOURCES\s*>|<\s*MONITOR\s*>[\s\S]*?(?:<\/\s*MONITOR\s*>|$)|<\s*SPECTRAL\s*>[\s\S]*?(?:<\/\s*SPECTRAL\s*>|$)|<\s*TASKS\s*>[\s\S]*?<\/\s*TASKS\s*>|<\s*SCHEDULED_TASKS\s*(?:>[\s\S]*?(?:<\/\s*SCHEDULED_TASKS\s*>|$)|(?:\/>))|<\s*DEVICE_BENTO\s*(?:>[\s\S]*?(?:<\/\s*DEVICE_BENTO\s*>|$)|(?:\/>))|<\s*CONTROL_BENTO\s*(?:>[\s\S]*?(?:<\/\s*CONTROL_BENTO\s*>|$)|(?:\/>))|<\s*TOOL_USED\s+[^>]*(?:\/>|>[\s\S]*?<\/\s*TOOL_USED\s*>)|```json\s*[\s\S]*?```)/g)

    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('```json')) {
            try {
              const jsonContent = part.replace(/^```json\s*/, '').replace(/```$/, '').trim()
              // Try to parse to see if it's an IoT command
              if (jsonContent.startsWith('{') || jsonContent.startsWith('[')) {
                 const parsed = JSON.parse(jsonContent)
                 const isIoTCommand = (obj: any) => obj.action && (
                    obj.action === 'toggle_relay' || 
                    obj.action === 'set_led' || 
                    obj.action === 'control_camera' ||
                    obj.action === 'reset_camera' ||
                    obj.action === 'move_camera_and_look' ||
                    obj.action === 'take_camera_snapshot'
                 )
                 
                 const commands = Array.isArray(parsed) ? parsed : [parsed]
                 if (commands.some(isIoTCommand)) {
                    return (
                        <div key={index} className="my-4 space-y-3">
                            {commands.map((cmd: any, i: number) => (
                                isIoTCommand(cmd) ? (
                                    <DeviceControlCard key={i} command={cmd} />
                                ) : null
                            ))}
                        </div>
                    )
                 }
              }
            } catch (e) {
                // Not valid JSON or not IoT command, fall through to default rendering
            }
          }

          if (part.match(/^<\s*SPECTRAL/)) {
            return (
              <div key={index} className="flex justify-center my-4 w-full">
                <div className="w-full max-w-[400px]">
                  <SpectralCard data={deviceData} />
                </div>
              </div>
            )
          }

          if (part.match(/^<\s*TOOL_USED/)) {
            try {
              // Parse TOOL_USED tag attributes
              const toolUsedMatch = part.match(/<\s*TOOL_USED\s+([^>]*?)(?:\/>|>[\s\S]*?<\/\s*TOOL_USED\s*>)/)
              if (!toolUsedMatch) return null
              
              const attributesStr = toolUsedMatch[1]
              const attributes: Record<string, string> = {}
              
              // Parse attributes like toolName="value" description="value" etc.
              const attrMatches = attributesStr.matchAll(/(\w+)="([^"]*)"/g)
              for (const match of attrMatches) {
                attributes[match[1]] = match[2]
              }
              
              const { toolName, description, result, executionTime, details, input, output } = attributes
              
              if (!toolName) return null
              
              return (
                <div key={index} className="my-3">
                  <MCPToolDisplay
                    toolName={toolName}
                    toolDescription={description}
                    result={result as 'success' | 'error' | 'loading'}
                    executionTime={executionTime ? parseInt(executionTime) : undefined}
                    input={input ? JSON.parse(input) : undefined}
                    output={output ? JSON.parse(output) : undefined}
                    errorText={result === 'error' ? details : undefined}
                  />
                </div>
              )
            } catch (e) {
              console.error("TOOL_USED parsing error", e)
              return null
            }
          }

          if (part.match(/^<\s*SCHEDULED_TASKS/)) {
            return (
              <div key={index} className="my-6">
                <ScheduledTasksList />
              </div>
            )
          }

          if (part.match(/^<\s*CONTROL_BENTO/)) {
            return (
              <div key={index} className="my-6">
                <ControlBentoGrid />
              </div>
            )
          }

          if (part.match(/^<\s*DEVICE_BENTO/)) {
            return (
              <div key={index} className="my-6">
                <DeviceBentoGrid />
              </div>
            )
          }

          if (part.match(/^<\s*TASKS/)) {
            try {
              const jsonStr = part.replace(/<\s*TASKS\s*>/, '').replace(/<\/\s*TASKS\s*>/, '').trim()
              const tasks = JSON.parse(jsonStr) as TaskModel[]

              if (!tasks || tasks.length === 0) return null

              return (
                <div key={index} className="my-4 space-y-4">
                  {tasks.map((task, i) => (
                    <div key={i} className="bg-white dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/10 overflow-hidden shadow-sm">
                      <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{task.title}</h3>
                        <div className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide",
                          task.status === 'completed' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                            task.status === 'in_progress' ? "bg-emerald-100 dark:bg-blue-900/30 text-emerald-700 dark:text-blue-500" :
                              "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        )}>
                          {task.status === 'completed' ? 'Completed' : task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                        </div>
                      </div>
                      <div className="p-0">
                        {task.items.map((item, j) => (
                          <div key={j} className="flex items-start gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                            <div className="mt-0.5 shrink-0 text-zinc-400 dark:text-zinc-500">
                              {item.type === 'file' ? <FileText size={16} /> : <CheckCircle2 size={16} className={cn(task.status === 'completed' ? "text-emerald-500" : "")} />}
                            </div>
                            <div className="flex-1 text-sm text-zinc-600 dark:text-zinc-300">
                              {item.text}
                              {item.file && (
                                <div className="mt-2 flex items-center gap-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700 w-fit">
                                  <div className="size-8 bg-white dark:bg-white/10 rounded border border-zinc-200 dark:border-white/10 flex items-center justify-center text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">
                                    {item.file.name.split('.').pop()}
                                  </div>
                                  <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{item.file.name}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            } catch (e) {
              console.error("Tasks parsing error", e)
              return null
            }
          }

          if (part.match(/^<\s*MONITOR/)) {
            return (
              <div key={index} className="flex justify-center my-4">
                <MonitorCard />
              </div>
            )
          }

          if (part.match(/^<\s*CHART/)) {
            try {
              // Extract type and content
              const isVegaLite = part.includes('type="vega-lite"')
              const tagStartRegex = isVegaLite ? /<\s*CHART\s+type="vega-lite"\s*>/ : /<\s*CHART\s+type="echarts"\s*>/

              // Extract JSON content
              const jsonStr = part.replace(tagStartRegex, '').replace(/<\/\s*CHART\s*>/, '').trim()
              const data = JSON.parse(jsonStr)

              return (
                <div key={index} className="my-4 w-full min-w-[300px] md:min-w-[600px] h-[350px] rounded-lg overflow-hidden bg-white relative z-10 border border-zinc-100 shadow-sm">
                  <ChartRenderer options={data} type={isVegaLite ? 'vega-lite' : 'echarts'} style={{ height: '100%', width: '100%' }} />
                </div>
              )
            } catch (e) {
              // Fallback to showing raw text if parsing fails
              console.error("Chart parsing error", e)
              return (
                <div key={index} className="p-4 bg-red-50 text-red-500 rounded-lg border border-red-100 text-xs overflow-auto">
                  Chart Error: {String(e)}
                </div>
              )
            }
          }

          // Handle Reasoning Content (New <think> tag support)
          if (part.match(/^<\s*(REASONING|think)/)) {
            const reasoningText = part.replace(/^<\s*(REASONING|think)\s*>/, '').replace(/<\/\s*(REASONING|think)\s*>/, '').trim()
            
            // Check if the reasoning block is closed
            const isStreaming = !part.match(/<\/\s*(REASONING|think)\s*>/)

            // If content is empty AND NOT streaming, hide it.
            // But if streaming (even if empty), show it.
            if (!reasoningText && !isStreaming) return null

            return (
              <Reasoning key={index} isStreaming={isStreaming} className="mb-4">
                <ReasoningTrigger />
                <ReasoningContent>
                  {reasoningText ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code: ({ node, inline, className, children, ...props }: any) => (
                          <code className={cn("bg-zinc-100 dark:bg-zinc-800 rounded px-1 font-mono text-xs text-zinc-800 dark:text-zinc-200 font-semibold", className)} {...props}>{children}</code>
                        )
                      }}
                    >
                      {reasoningText}
                    </ReactMarkdown>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                      <span className="size-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="size-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="size-2 bg-current rounded-full animate-bounce"></span>
                    </div>
                  )}
                </ReasoningContent>
              </Reasoning>
            )
          }

          if (part.match(/^<\s*SOURCES/)) {
            try {
              const jsonStr = part.replace(/<\s*SOURCES\s*>/, '').replace(/<\/\s*SOURCES\s*>/, '').trim()
              let sources: Array<{ title: string, url: string, number: number }> = []

              if (jsonStr.startsWith('[')) {
                try {
                  sources = JSON.parse(jsonStr)
                } catch (e) {
                  console.warn("Sources JSON parse failed, attempting regex fallback")
                }
              }

              if (!sources || sources.length === 0) {
                // Fallback for Markdown style links: [Title](URL)
                const regex = /\[([^\]]+)\]\(([^)]+)\)/g
                let match
                let idx = 1
                while ((match = regex.exec(jsonStr)) !== null) {
                  sources.push({
                    title: match[1],
                    url: match[2],
                    number: idx++
                  })
                }
              }

              if (!sources || sources.length === 0) return null

              return (
                <div key={index} className="mt-4 mb-2">
                  <Sources>
                    <SourcesTrigger count={sources.length} />
                    <SourcesContent>
                      {sources.map((s, i) => (
                        <Source
                          key={i}
                          href={s.url}
                          title={s.title}
                          number={s.number}
                          description={(s as any).description}
                          quote={(s as any).quote}
                        />
                      ))}
                    </SourcesContent>
                  </Sources>
                </div>
              )
            } catch (e) {
              console.error("Sources parsing error", e)
              return null
            }
          }

          if (!part.trim()) return null

          const commands: any[] = []
          const matches = part.matchAll(/```json\s*([\s\S]*?)```/g)
          for (const match of matches) {
            try {
              const json = JSON.parse(match[1])
              if (
                json.action === 'toggle_relay' || 
                json.action === 'set_led' || 
                json.action === 'control_camera' ||
                json.action === 'reset_camera' ||
                json.action === 'move_camera_and_look'
              ) {
                commands.push(json)
              }
            } catch { }
          }

          return (
            <div key={index}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: ({ node, inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '')
                    const language = match ? match[1] : ''
                    const isMermaid = language === 'mermaid'

                    if (!inline && isMermaid) {
                      return <MermaidChart chart={String(children).replace(/\n$/, '')} />
                    }

                    // Try to parse JSON and check if it's an ECharts option or Schedule Task
                    if (!inline && (!language || language === 'json')) {
                      try {
                        const content = String(children).replace(/\n$/, '')
                        if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
                          const data = JSON.parse(content)

                          // Check for Schedule Task
                          if (data.action === 'schedule_task') {
                            return <ScheduleCard data={data} />
                          }

                          // Basic check for ECharts structure
                          if (data && (data.series || (data.xAxis && data.yAxis))) {
                            return (
                              <div className="my-4 w-full min-w-[300px] md:min-w-[600px] h-[350px] rounded-lg overflow-hidden bg-white dark:bg-white/5 relative z-10 border border-zinc-100 dark:border-white/10 shadow-sm">
                                <ChartRenderer options={data} type="echarts" style={{ height: '100%', width: '100%' }} />
                              </div>
                            )
                          }
                        }
                      } catch (e) {
                        // Not valid JSON or not a chart, continue to render as code
                      }
                    }

                    return <code className={cn("bg-zinc-100 dark:bg-zinc-800 rounded px-1 font-mono text-sm text-zinc-800 dark:text-zinc-200 font-semibold", className)} {...props}>{children}</code>
                  },
                  pre: ({ node, children, ...props }: any) => <pre className="bg-zinc-50 dark:bg-white/5 p-3 rounded-lg overflow-x-auto my-2 border border-zinc-200 dark:border-white/10" {...props}>{children}</pre>,
                  table: ({ children }: any) => <div className="overflow-x-auto my-4 rounded-lg border border-zinc-200 dark:border-zinc-800"><table className="w-full text-sm text-left text-zinc-600 dark:text-zinc-300">{children}</table></div>,
                  thead: ({ children }: any) => <thead className="text-xs text-zinc-700 uppercase bg-zinc-50 dark:bg-white/5 dark:text-zinc-400 font-semibold">{children}</thead>,
                  tbody: ({ children }: any) => <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-transparent">{children}</tbody>,
                  tr: ({ children }: any) => <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">{children}</tr>,
                  th: ({ children }: any) => <th className="px-6 py-3 whitespace-nowrap">{children}</th>,
                  td: ({ children }: any) => <td className="px-6 py-4">{children}</td>,
                  ul: ({ children }: any) => <ul className="list-disc list-inside my-2 space-y-1 ml-2">{children}</ul>,
                  ol: ({ children }: any) => <ol className="list-decimal list-inside my-2 space-y-1 ml-2">{children}</ol>,
                  li: ({ children }: any) => <li className="text-zinc-700 dark:text-zinc-300">{children}</li>,
                  blockquote: ({ children }: any) => <blockquote className="border-l-4 border-emerald-500 dark:border-blue-600 pl-4 py-1 my-4 italic bg-emerald-50/50 dark:bg-blue-900/10 rounded-r text-zinc-600 dark:text-zinc-400">{children}</blockquote>,
                  h1: ({ children }: any) => <h1 className="text-2xl font-bold mt-6 mb-4 text-zinc-900 dark:text-zinc-100">{children}</h1>,
                  h2: ({ children }: any) => <h2 className="text-xl font-bold mt-5 mb-3 text-zinc-900 dark:text-zinc-100 pb-2 border-b border-zinc-100 dark:border-zinc-800">{children}</h2>,
                  h3: ({ children }: any) => <h3 className="text-lg font-bold mt-4 mb-2 text-zinc-900 dark:text-zinc-100">{children}</h3>,
                  a: ({ href, children }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-500 hover:underline decoration-emerald-300 dark:decoration-emerald-300 underline-offset-2">{children}</a>
                }}
              >
                {part}
              </ReactMarkdown>

              {commands.length > 0 && !autoExecuteCommands && (
                <div className="mt-3 mb-4">
                  <button
                    onClick={() => executeCommands(commands)}
                    className="group relative flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 group-hover:translate-x-[100%] transition-transform duration-700 -skew-x-12 -translate-x-[100%]"></div>
                    <Zap size={18} className="animate-pulse" />
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-bold leading-none">立即执行指令</span>
                      <span className="text-[10px] opacity-80 font-mono mt-0.5">Execute {commands.length} Command{commands.length > 1 ? 's' : ''}</span>
                    </div>
                    <ArrowRight size={16} className="opacity-60 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </>
    )
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
    <div
      className={cn(
        "relative fixed inset-0 w-full h-full text-zinc-900 dark:text-zinc-100 overflow-hidden flex font-sans selection:bg-emerald-500/20 selection:text-emerald-700",
        isExecutingControl && "ai-control-active",
        isElderFriendlyMode && "elder-friendly-text"
      )}
    >
      {/* Background - Minimal & Clean */}
      <div className="absolute inset-0 bg-[#FAFAFA] dark:bg-[#09090B]" />
      
      {/* Subtle Ambient Light */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-emerald-500/5 to-transparent blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-blue-500/5 to-transparent blur-[120px] rounded-full pointer-events-none" />

      {/* Control Execution State - Subtle Top Line Loading */}
      {isExecutingControl && (
        <div className="absolute top-0 left-0 w-full h-1 z-[9999]">
             <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 animate-gradient-x" />
        </div>
      )}

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
               <div className="size-2.5 bg-emerald-500 rounded-full animate-pulse" />
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

      {/* Sidebar */}
      <div className={cn(
        "relative flex-shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-xl flex flex-col transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] border-r border-zinc-200/50 dark:border-zinc-800/50 z-20",
        sidebarOpen ? "w-[280px] translate-x-0 opacity-100" : "w-0 -translate-x-4 opacity-0 overflow-hidden"
      )}>
        {/* Top Nav Items */}
        <div className="p-4 space-y-4">
          {/* Logo Section */}
          <div className="flex items-center gap-3 px-2 mb-2">
            <div className="relative size-8 shrink-0 rounded-lg overflow-hidden shadow-sm">
              <Image src="/icon.png" alt="Logo" fill className="object-cover" />
            </div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">莓小智</span>
            <ElderFriendlyToggle showButton={false} className="ml-auto" />
          </div>

          <div className="space-y-2">
            <button
              onClick={createNewSession}
              className="w-full group flex items-center justify-between gap-3 px-3 py-2.5 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 border border-zinc-200/60 dark:border-zinc-700/50 rounded-xl transition-all shadow-sm hover:shadow text-sm font-medium text-zinc-700 dark:text-zinc-200"
            >
              <div className="flex items-center gap-2.5">
                  <Plus size={16} className="text-zinc-400 group-hover:text-zinc-600" />
                  <span>新会话</span>
              </div>
              <span className="text-[10px] bg-zinc-100 dark:bg-zinc-700/50 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">⌘N</span>
            </button>
          </div>

          {/* Search & Return */}
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition-colors text-left group">
              <Search size={16} className="text-zinc-400 group-hover:text-zinc-600" />
              <span>搜索</span>
            </button>
            <button
              onClick={() => router.push('/mcp-store')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition-colors text-left group"
            >
              <Zap size={16} className="text-zinc-400 group-hover:text-zinc-600" />
              <span>MCP 商店</span>
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition-colors text-left group"
            >
              <ArrowLeft size={16} className="text-zinc-400 group-hover:text-zinc-600" />
              <span>返回看板</span>
            </button>
          </div>
        </div>

        {/* Scrollable Chat History */}
        <div 
          className="flex-1 overflow-y-auto px-4 custom-scrollbar"
        >
          <div className="flex flex-col gap-6 pb-4">
            {groupOrder.map(key => {
              const group = groupedSessions[key]
              if (!group || group.length === 0) return null
              return (
                <div key={key}>
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-2">{key === "Today" ? "今天" : key === "Yesterday" ? "昨天" : key === "Previous 7 Days" ? "近期" : "更早"}</div>
                  <div className="flex flex-col gap-0.5">
                    {group.map(s => (
                      <div
                        key={s.id}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm relative",
                          sessionId === s.id 
                            ? "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium" 
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                        )}
                        onClick={() => { setSessionId(s.id); if (window.innerWidth < 768) setSidebarOpen(false) }}
                      >
                        <div className="flex-1 truncate relative z-10 pr-6">
                          {s.title}
                        </div>
                        {sessionId === s.id && (
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center z-20">
                            <button onClick={(e) => deleteSession(s.id, e)} className="text-zinc-400 hover:text-red-500 p-1.5 rounded-md transition-colors hover:bg-zinc-200/50"><Trash size={13} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom User/Upgrade */}
        <div className="p-4 border-t border-zinc-200/50 dark:border-zinc-800/50 mt-auto space-y-3 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-sm">
           <button 
             onClick={() => router.push('/plans')}
             className="w-full flex items-center gap-3 px-3 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl transition-all shadow-sm group"
           >
             <div className="size-8 rounded-lg bg-zinc-800 dark:bg-zinc-200 flex items-center justify-center text-white dark:text-zinc-900 shrink-0 border border-white/10 dark:border-black/10">
                 <Sparkles size={14} className="text-amber-400" />
              </div>
             <div className="flex-1 text-left">
               <div className="text-sm font-semibold">升级 Pro</div>
               <div className="text-[10px] opacity-70">解锁高级模型</div>
             </div>
           </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-lg transition-colors text-left group">
                <Avatar className="size-7 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback className="bg-zinc-100 text-zinc-500 text-[10px]">{user?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate font-medium text-xs">{user?.username || "User"}</div>
                <Settings size={14} className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start" side="top">
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setSettingsOpen(true)}>
                <Settings size={14} /> AI 设置
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push('/my-mcp')}>
                <Zap size={14} /> MCP 设置
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2 text-red-600" onClick={() => router.push('/login')}>
                <LogOut size={14} /> 退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative z-0">
        {/* 视觉巡检覆盖层 / Viewfinder */}
        {isInspecting && (
          <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden">
            <div className="relative size-64 md:size-80 border-2 border-white/20 rounded-full flex items-center justify-center">
              {/* 四个角的取景器标识 */}
              <div className="absolute top-0 left-0 size-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl" />
              <div className="absolute top-0 right-0 size-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 size-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 size-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl" />
              
              {/* 中心扫描线 */}
              <div className="absolute inset-4 rounded-full overflow-hidden">
                <div className="w-full h-1 bg-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.8)] absolute top-0 animate-[scan_3s_ease-in-out_infinite]" />
              </div>

              {/* 核心内容 */}
              <div className="text-center space-y-4">
                <div className="relative">
                  <Camera className="size-16 text-white/90 mx-auto animate-pulse" />
                  <div className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full animate-ping" />
                </div>
                <div className="space-y-1">
                  <div className="text-white font-bold text-lg tracking-widest uppercase">REC • CAM {inspectionCamera.toUpperCase()}</div>
                  <div className="text-emerald-400 font-mono text-sm h-5">{inspectionStatus}</div>
                </div>
              </div>

              {/* 环境装饰线 */}
              <div className="absolute -inset-8 border border-white/5 rounded-full animate-[spin_20s_linear_infinite]" />
              <div className="absolute -inset-16 border border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
            </div>
            
            <div className="mt-12 text-zinc-500 font-mono text-xs uppercase tracking-[0.3em] flex items-center gap-4">
               <span>LATENCY: 48MS</span>
               <span className="w-px h-3 bg-zinc-800" />
               <span>ISO: 800</span>
               <span className="w-px h-3 bg-zinc-800" />
               <span>RESOLUTION: 1080P</span>
            </div>
            
            <button 
              onClick={() => setIsInspecting(false)}
              className="mt-12 px-6 py-2 border border-white/20 text-white/60 hover:text-white hover:border-white/50 rounded-full text-xs transition-all tracking-widest uppercase"
            >
              取消巡检
            </button>
          </div>
        )}

        {/* Top Bar - Floating & Minimal */}
        <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-20 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-zinc-800 backdrop-blur-md transition-all shadow-sm border border-transparent hover:border-zinc-200/50">
                <PanelLeftOpen size={20} />
              </button>
            )}
            {sidebarOpen && (
              <button id="ai-sidebar-toggle" onClick={() => setSidebarOpen(false)} className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-zinc-800 backdrop-blur-md transition-all md:hidden">
                <PanelLeftClose size={20} />
              </button>
            )}

            <ElderFriendlyToggle showBadge={false} className="ml-2" />

            <div id="ai-model-selector-nav">
            <PromptInputModelSelect value={selectedModel || aiSettings?.model || "qwen-vl-plus"} onValueChange={(val) => {
              setSelectedModel(val)
              if (aiSettings) {
                const newSettings = { ...aiSettings, model: val }
                setAiSettings(newSettings)
                localStorage.setItem("ai-settings", JSON.stringify(newSettings))
              } else {
                const defaultSettings = {
                  apiKey: "",
                  apiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
                  model: val,
                  systemPrompt: ""
                }
                setAiSettings(defaultSettings)
                localStorage.setItem("ai-settings", JSON.stringify(defaultSettings))
              }
            }}>
              <PromptInputModelSelectTrigger className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-700/50 hover:bg-white/80 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 gap-2 px-3 py-1.5 rounded-lg transition-all shadow-sm focus:ring-0 h-auto">
                <Sparkles size={14} className="text-purple-500" />
                <span className="text-zinc-600 dark:text-zinc-400 font-medium text-sm">{
                  (selectedModel || aiSettings?.model) === 'auto' ? "智能模式" : 
                  (selectedModel || aiSettings?.model) === 'qwen3.5-plus' ? "Qwen3.5 Plus" :
                  (selectedModel || aiSettings?.model) === 'qwen3.5-flash' ? "Qwen3.5 Flash" :
                  (selectedModel || aiSettings?.model) === 'qwen3-vl-plus' ? "Qwen3 VL Plus" :
                  (selectedModel || aiSettings?.model) === 'qwen3-vl-flash' ? "Qwen3 VL Flash" :
                  (selectedModel || aiSettings?.model) === 'qwen3-max' ? "Qwen3 Max" :
                  (selectedModel || aiSettings?.model) === 'qwen3-max-2026-01-23' ? "Qwen3 Max (推理)" :
                  (selectedModel || aiSettings?.model) === 'qwen-long' ? "Qwen Long" :
                  (selectedModel || aiSettings?.model) === 'deepseek-v3.2' ? "DeepSeek V3.2" :
                  (selectedModel || aiSettings?.model || "Qwen3.5 Plus")
                }</span>
                <ChevronDown size={14} className="text-zinc-400 ml-1" />
              </PromptInputModelSelectTrigger>
              <PromptInputModelSelectContent className="w-[280px]">
                <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">💡 推荐</div>
                <PromptInputModelSelectItem value="auto">
                  <span className="flex items-center gap-2">
                    <Sparkles className="size-3 text-purple-500" /> 
                    <span>智能模式 (Auto)</span>
                  </span>
                </PromptInputModelSelectItem>
                <PromptInputModelSelectItem value="qwen3.5-plus">
                  <span className="flex items-center justify-between w-full">
                    <span>Qwen3.5 Plus</span>
                    <span className="text-xs text-emerald-500">推荐</span>
                  </span>
                </PromptInputModelSelectItem>
                
                <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-2">🧠 深度思考</div>
                <PromptInputModelSelectItem value="qwen3-max-2026-01-23">
                  <span className="flex items-center justify-between w-full">
                    <span>Qwen3 Max (2026-01-23)</span>
                    <span className="text-xs text-purple-500">推理</span>
                  </span>
                </PromptInputModelSelectItem>
                <PromptInputModelSelectItem value="deepseek-v3.2">
                  <span className="flex items-center justify-between w-full">
                    <span>DeepSeek V3.2</span>
                    <span className="text-xs text-purple-500">推理</span>
                  </span>
                </PromptInputModelSelectItem>
                
                <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-2">📝 文本生成</div>
                <PromptInputModelSelectItem value="qwen3-max">
                  <span className="flex items-center justify-between w-full">
                    <span>Qwen3 Max</span>
                    <span className="text-xs text-orange-500">最强</span>
                  </span>
                </PromptInputModelSelectItem>
                <PromptInputModelSelectItem value="qwen3.5-flash">
                  <span className="flex items-center justify-between w-full">
                    <span>Qwen3.5 Flash</span>
                    <span className="text-xs text-blue-500">快速</span>
                  </span>
                </PromptInputModelSelectItem>
                
                <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-2">👁️ 视觉理解</div>
                <PromptInputModelSelectItem value="qwen3.5-plus">Qwen3.5 Plus</PromptInputModelSelectItem>
                <PromptInputModelSelectItem value="qwen3.5-flash">Qwen3.5 Flash</PromptInputModelSelectItem>
                <PromptInputModelSelectItem value="qwen3-vl-plus">Qwen3 VL Plus</PromptInputModelSelectItem>
                <PromptInputModelSelectItem value="qwen3-vl-flash">Qwen3 VL Flash</PromptInputModelSelectItem>
                
                <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-2">🔧 其他</div>
                <PromptInputModelSelectItem value="qwen-long">Qwen Long (长文本)</PromptInputModelSelectItem>
              </PromptInputModelSelectContent>
            </PromptInputModelSelect>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-2 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-700/50 px-2 py-1.5 rounded-full shadow-sm">
            <CalendarTrigger />
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
            <button
              onClick={() => setVoiceChatOpen(true)}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              title="实时语音对话"
            >
              <Phone size={16} />
            </button>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
            <button
              onClick={() => {
                const newState = !isTtsPaused
                setIsTtsPaused(newState)
                isTtsPausedRef.current = newState
              }}
              className={cn(
                "p-1.5 transition-colors rounded-full",
                isTtsPaused 
                  ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10" 
                  : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10"
              )}
              title={isTtsPaused ? "继续播报" : "暂停当前播报"}
            >
              {isTtsPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              onClick={() => {
                const newState = !isTTSEnabled
                setIsTTSEnabled(newState)
                if (!newState && audioContextRef.current) {
                  audioContextRef.current.pause()
                }
              }}
              className={cn(
                "p-1.5 transition-colors rounded-full",
                isTTSEnabled 
                  ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" 
                  : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10"
              )}
              title={isTTSEnabled ? "全局播报已开启" : "全局播报已静音"}
            >
              {isTTSEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div id="ai-welcome-area" className="flex-1 min-h-0 relative flex flex-col z-0">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center p-4 min-h-[600px] overflow-y-auto custom-scrollbar">
              <div className="w-full max-w-4xl flex flex-col items-center m-auto py-20">
              {/* Header */}
              <div className="text-center mb-12 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="inline-flex items-center justify-center p-1.5 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 mb-4">
                    <div className="relative size-10 rounded-xl overflow-hidden">
                        <Image src="/icon.png" alt="Logo" fill className="object-cover" />
                    </div>
                </div>
                <h1 className="text-3xl md:text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {greeting}，{user?.username || '农场主'}
                </h1>
                <p className="text-lg text-zinc-500 dark:text-zinc-400 font-medium">
                  我是您的智能助手，准备好协助您管理农场了吗？
                </p>
              </div>

              {/* Input Bar in Center for Empty State */}
              <div className="w-full max-w-3xl relative mb-12 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[24px] p-2 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-none hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.15)] transition-all duration-300 border border-zinc-200/60 dark:border-zinc-800 group ring-1 ring-transparent focus-within:ring-zinc-200 dark:focus-within:ring-zinc-700">
                  {attachments.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto py-2 px-3 mb-2">
                      {attachments.map((url, i) => (
                        <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 group/img shrink-0">
                          <Image src={url} alt="upload" fill className="object-cover" />
                          <button onClick={() => removeAttachment(i)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 text-white transition-opacity"><X size={16} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 px-2">
                    <textarea
                      ref={textareaRefInitial}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                      onPaste={handlePaste}
                      placeholder="询问农场状况、生成报告或控制设备..."
                      className="w-full bg-transparent border-0 focus:ring-0 resize-none text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 text-lg leading-relaxed py-3 px-2"
                      rows={1}
                      style={{ minHeight: '52px', maxHeight: '200px' }}
                    />
                    {input.trim() && (
                      <button
                        onClick={() => handleSend()}
                        className="self-end mb-1.5 p-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-95 shadow-sm"
                      >
                        <ArrowUp size={20} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1 px-3 pb-2">
                    <div className="flex items-center gap-1">
                      <MCPStatusIndicator />
                       <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="上传文件"
                      >
                        <Paperclip size={20} />
                      </button>
                      <button
                        onClick={() => setEnableSearch(!enableSearch)}
                        className={cn("p-2 rounded-lg transition-colors", enableSearch ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800")}
                        title="联网搜索"
                      >
                        <Globe size={20} />
                      </button>
                      <button
                        onClick={() => {
                          const newReasoning = !enableReasoning
                          setEnableReasoning(newReasoning)
                          
                          // 如果开启深度思考，随机选择一个推理模型
                          if (newReasoning) {
                            const reasoningModels = [
                              'qwen3-max-2026-01-23',
                              'qwen3.5-plus', 
                              'deepseek-v3.2'
                            ]
                            const randomModel = reasoningModels[Math.floor(Math.random() * reasoningModels.length)]
                            setSelectedModel(randomModel)
                            
                            // 同时更新设置
                            if (aiSettings) {
                              const newSettings = { ...aiSettings, model: randomModel }
                              setAiSettings(newSettings)
                              localStorage.setItem("ai-settings", JSON.stringify(newSettings))
                            }
                          }
                        }}
                        className={cn("p-2 rounded-lg transition-colors", enableReasoning ? "text-purple-500 bg-purple-50 dark:bg-purple-900/20" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800")}
                        title="深度思考 - 自动切换到推理模型"
                      >
                        <Sparkles size={20} />
                      </button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className={cn(
                              "p-2 rounded-lg transition-colors",
                              autoExecuteCommands
                                ? "text-violet-500 bg-violet-50 dark:bg-violet-900/20"
                                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                            title={autoExecuteCommands ? "AI自动托管已开启" : "手动确认执行设备控制"}
                          >
                            <Zap size={20} className={autoExecuteCommands ? "fill-current" : ""} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="start" sideOffset={10}>
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              <Zap size={16} className="text-violet-500 fill-current" />
                              AI 自动托管模式
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                              开启后，AI 将获得执行指令的权限，可以自动控制设备、调节环境，无需您再次确认。
                            </p>
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">启用自动执行</span>
                              <Switch 
                                checked={autoExecuteCommands}
                                onCheckedChange={setAutoExecuteCommands}
                                className="data-[state=checked]:bg-violet-600"
                              />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="text-xs text-zinc-400 font-medium">
                        {input.length}/2000
                    </div>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.md" multiple className="hidden" onChange={onSelectFiles} />
              </div>

              {/* Quick Actions - Bento Style Pills */}
              <div id="ai-quick-actions" className="flex flex-wrap justify-center gap-3 mb-16 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                {[
                  { icon: <Activity size={16} />, text: "分析环境数据", action: "分析当前环境数据", color: "text-blue-500" },
                  { icon: <Sprout size={16} />, text: "制定灌溉计划", action: "制定今日灌溉计划", color: "text-emerald-500" },
                  { icon: <Search size={16} />, text: "诊断病虫害", action: "诊断草莓病害", color: "text-amber-500" },
                  { icon: <Zap size={16} />, text: "检查设备状态", action: "检查设备运行状态", color: "text-purple-500" },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(item.action)}
                    className="flex items-center gap-2.5 px-5 py-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    <span className={item.color}>{item.icon}</span>
                    {item.text}
                  </button>
                ))}
              </div>

              {/* Widgets Grid - Glass Cards */}
              <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300 px-4">
                {/* Weather Widget */}
                <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-zinc-200/60 dark:border-zinc-800 flex flex-col justify-between h-44 relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <div className="flex items-center gap-1.5 text-zinc-500 font-medium mb-1 text-sm">
                        <span>宁波</span>
                        <ChevronDown size={12} />
                      </div>
                      <div className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mt-2">
                        {weatherData?.current?.temp_c || "--"}°
                      </div>
                    </div>
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-full text-amber-600 dark:text-amber-500">
                      <Sun size={20} />
                    </div>
                  </div>
                  <div className="flex justify-between items-end z-10">
                    <div className="text-zinc-400 text-xs font-medium">
                      {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                    <div className="text-right">
                      <div className="text-amber-500 font-medium text-sm">晴朗</div>
                      <div className="text-xs text-zinc-400">H:24° L:18°</div>
                    </div>
                  </div>
                </div>

                {/* Promo Card */}
                <div className="md:col-span-2 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/20 dark:to-teal-950/20 backdrop-blur-md rounded-3xl p-6 border border-emerald-100/50 dark:border-emerald-900/30 relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute top-4 right-4">
                    <span className="bg-white/60 dark:bg-black/20 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border border-emerald-100/50 dark:border-emerald-900/30">New</span>
                  </div>
                  <div className="relative z-10 h-full flex flex-col justify-center items-start max-w-lg">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">智能种植助手 v2.0</h3>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-4">
                      全新升级的推理引擎，能够根据实时传感器数据，自动分析环境状况并提供精准的调控建议。
                    </p>
                    <button onClick={() => handleSend("分析当前环境数据")} className="text-emerald-600 dark:text-emerald-500 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all group-hover:underline">
                      尝试分析环境 <ArrowUpRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </div>
          ) : (
            <>
              <Conversation className="flex-1 h-full min-h-0 overflow-hidden">
                <ConversationContent 
                  id="ai-chat-area" 
                  className="p-0 max-w-4xl mx-auto w-full custom-scrollbar"
                >
                  <div className="flex flex-col pb-48 pt-10 space-y-8 px-4 md:px-0">
                    {messages.map((msg, i) => {
                      if (msg.isSilent) return null;
                      return (
                      <div key={i} className={cn(
                        "group w-full flex gap-5 transition-all duration-300",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}>
                        {msg.role === "assistant" && (
                          <div className="size-8 flex items-center justify-center shrink-0 mt-1 rounded-lg overflow-hidden bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                            <Image src="/icon.png" alt="AI" width={32} height={32} className="object-cover" />
                          </div>
                        )}

                        <div className={cn(
                          "relative max-w-[85%] rounded-2xl px-6 py-4 text-[15px] leading-relaxed shadow-sm",
                          msg.role === "user"
                            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-tr-sm shadow-md"
                            : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-800 rounded-tl-sm"
                        )}>
                          {/* 显示模型标签 */}
                          {msg.role === "assistant" && msg.model && (
                            <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                              <Sparkles size={12} className="text-purple-500" />
                              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                {msg.model === 'auto' ? '智能模式' :
                                 msg.model === 'qwen3.5-plus' ? 'Qwen3.5 Plus' :
                                 msg.model === 'qwen3.5-flash' ? 'Qwen3.5 Flash' :
                                 msg.model === 'qwen3-vl-plus' ? 'Qwen3 VL Plus' :
                                 msg.model === 'qwen3-vl-flash' ? 'Qwen3 VL Flash' :
                                 msg.model === 'qwen3-max' ? 'Qwen3 Max' :
                                 msg.model === 'qwen3-max-2026-01-23' ? 'Qwen3 Max (推理)' :
                                 msg.model === 'deepseek-v3.2' ? 'DeepSeek V3.2' :
                                 msg.model === 'qwen-long' ? 'Qwen Long' :
                                 msg.model}
                              </span>
                            </div>
                          )}
                          <div id={`message-content-${i}`} className="prose prose-zinc dark:prose-invert max-w-none break-words">
                            {renderMessageContent(msg, () => setStudioOpen(true))}
                          </div>

                          {msg.role === "assistant" && (
                            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                              <button onClick={() => copyText(typeof msg.content === 'string' ? msg.content : "")} className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="复制内容"><Copy size={14} /></button>
                              <button className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="重新生成"><RotateCcw size={14} /></button>
                              <button onClick={() => handleDownloadPDF(i)} className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="导出为 PDF"><Download size={14} /></button>
                            </div>
                          )}
                        </div>
                      </div>
                      )
                    })}

                    {/* Inline Agent Status Bubble */}
                    {(isLoading || agentStatus) && (
                      <div className="w-full flex gap-5 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <div className="size-8 flex items-center justify-center shrink-0 mt-1 rounded-lg overflow-hidden bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                            <Image src="/icon.png" alt="AI" width={32} height={32} className="object-cover animate-pulse" />
                          </div>
                          
                          <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-800 rounded-2xl rounded-tl-sm px-5 py-3 shadow-sm flex items-center gap-3">
                            <Loader2 size={16} className="text-emerald-500 animate-spin" />
                            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 animate-pulse">
                              {agentStatus || "AI 正在思考..."}
                            </span>
                          </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ConversationContent>
              </Conversation>

              {/* Floating Input Bar for Chat State */}
              <div id="ai-input-area" className="absolute bottom-6 left-0 w-full bg-transparent px-4 pointer-events-none z-10">
                <div className="max-w-3xl mx-auto w-full relative pointer-events-auto">
                  
                  {/* Quota Display (System Mode) */}
                  {(!aiSettings?.apiKey && !aiSettings?.apiUrl && quotaInfo) && (
                      <div className="absolute -top-10 left-0 right-0 flex justify-center items-center text-xs text-zinc-500 dark:text-zinc-400 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <div className="flex items-center gap-3 bg-white/80 dark:bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm">
                              <div className="flex items-center gap-1.5">
                                  <span className="inline-block size-1.5 rounded-full bg-emerald-500"></span>
                                  <span className="font-medium">系统托管</span>
                              </div>
                              <div className="w-px h-3 bg-zinc-300 dark:bg-zinc-600"></div>
                              <div className="flex items-center gap-3">
                                  <span>今日: <span className={cn("font-medium", (quotaInfo.daily_limit - quotaInfo.daily_usage) <= 0 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400")}>{Math.max(0, quotaInfo.daily_limit - quotaInfo.daily_usage)}</span>/{quotaInfo.daily_limit}</span>
                              </div>
                          </div>
                      </div>
                  )}

                  <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[26px] p-2 flex flex-col gap-1 ring-1 ring-zinc-200 dark:ring-zinc-800 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all duration-300 shadow-2xl shadow-black/5 dark:shadow-black/20">
                    {/* Attachment Preview */}
                    {attachments.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto py-2 px-3 mb-1 scrollbar-none border-b border-zinc-100 dark:border-zinc-800">
                        {attachments.map((url, i) => (
                          <div key={i} className="relative group shrink-0">
                            <div className="w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm">
                              <Image src={url} alt="preview" fill className="object-cover" />
                            </div>
                            <button
                              onClick={() => removeAttachment(i)}
                              className="absolute -top-1.5 -right-1.5 bg-zinc-900 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 shadow-sm"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Input Area */}
                    <div className="space-y-2">
                      {/* Text Input */}
                      <div className="flex items-end gap-2 px-2 pt-2">
                        <textarea
                        ref={textareaRefChat}
                        value={input}
                        onChange={(e) => {
                            const val = e.target.value
                            setInput(val)
                            if (val.endsWith('@')) {
                                setMentionOpen(true)
                            }
                        }}
                        onKeyDown={(e) => { 
                            if (e.key === 'Enter' && !e.shiftKey) { 
                                e.preventDefault(); 
                                handleSend() 
                            }
                            // 如果删除了 @，关闭弹窗
                            if (e.key === 'Backspace' && input.endsWith('@')) {
                                setMentionOpen(false)
                            }
                        }}
                        onPaste={handlePaste}
                        placeholder="发消息给 AI 助手..."
                        className="w-full bg-transparent border-0 focus:ring-0 resize-none text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400/80 text-[15px] leading-relaxed py-3 min-h-[44px] max-h-[200px] font-medium"
                        rows={1}
                        />
                        <div className="pb-1.5">
                            {(isLoading || agentStatus) ? (
                                <button
                                    onClick={handleStop}
                                    className="size-9 rounded-xl flex items-center justify-center transition-all duration-200 bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                                    title="停止生成/执行"
                                >
                                    <div className="size-3 bg-white rounded-sm" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() && attachments.length === 0}
                                    className={cn(
                                        "size-9 rounded-xl flex items-center justify-center transition-all duration-200",
                                        (input.trim() || attachments.length > 0)
                                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                                    )}
                                >
                                    <ArrowUp size={18} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Tools Row */}
                    <div id="ai-input-tools" className="flex items-center justify-between px-2 pb-1">
                      <div className="flex items-center gap-1">
                        <MCPStatusIndicator />
                        
                        <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
                            <PopoverTrigger asChild>
                                <button
                                onClick={() => setMentionOpen(true)}
                                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 group relative"
                                title="提及工具 (@)"
                                >
                                <AtSign size={18} strokeWidth={2} />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-[280px] md:w-[320px]" side="top" align="start" sideOffset={10}>
                                <Command>
                                    <CommandInput placeholder="搜索工具..." value={mentionQuery} onValueChange={setMentionQuery} />
                                    <CommandList>
                                        <CommandEmpty>未找到相关工具</CommandEmpty>
                                        <CommandGroup heading="已安装的 MCP 工具">
                                            {availableTools.map((tool) => (
                                                <CommandItem 
                                                    key={tool.name} 
                                                    value={tool.name}
                                                    onSelect={() => handleInsertTool(tool.name)}
                                                    className="flex flex-col items-start py-2.5 px-3 cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2 w-full">
                                                        <div className="size-6 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                            <Zap size={12} />
                                                        </div>
                                                        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{tool.displayName || tool.name}</span>
                                                    </div>
                                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 ml-8 line-clamp-1">{tool.description}</span>
                                                </CommandItem>
                                            ))}
                                            {availableTools.length === 0 && (
                                                <div className="p-4 text-center text-xs text-zinc-500">
                                                    暂无已启用的 MCP 工具，请前往商店安装
                                                </div>
                                            )}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 group relative"
                          title="上传文件"
                        >
                          <Paperclip size={18} strokeWidth={2} />
                        </button>

                        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1"></div>

                        <button
                          onClick={() => setEnableSearch(!enableSearch)}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium select-none group",
                            enableSearch
                              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                              : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                          title="联网搜索"
                        >
                          <Globe size={14} className={enableSearch ? "text-emerald-500" : ""} />
                          <span>搜索</span>
                        </button>

                        <button
                          onClick={() => {
                            const newReasoning = !enableReasoning
                            setEnableReasoning(newReasoning)
                            
                            // 如果开启深度思考，随机选择一个推理模型
                            if (newReasoning) {
                              const reasoningModels = [
                                'qwen3-max-2026-01-23',
                                'qwen-plus-2025-12-01', 
                                'deepseek-v3.2'
                              ]
                              const randomModel = reasoningModels[Math.floor(Math.random() * reasoningModels.length)]
                              setSelectedModel(randomModel)
                              
                              // 同时更新设置
                              if (aiSettings) {
                                const newSettings = { ...aiSettings, model: randomModel }
                                setAiSettings(newSettings)
                                localStorage.setItem("ai-settings", JSON.stringify(newSettings))
                              }
                            }
                          }}
                          className={cn(
                            "p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors group relative",
                            enableReasoning
                              ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20"
                              : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                          )}
                          title="深度思考 - 自动切换到推理模型"
                        >
                          <Sparkles size={18} strokeWidth={2} className={enableReasoning ? "text-purple-500" : ""} />
                        </button>

                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className={cn(
                                "p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors group relative",
                                autoExecuteCommands
                                  ? "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20"
                                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                              )}
                              title={autoExecuteCommands ? "AI自动托管已开启" : "手动确认执行设备控制"}
                            >
                              <Zap size={18} strokeWidth={2} className={autoExecuteCommands ? "fill-current" : ""} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3" align="start" sideOffset={10}>
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm flex items-center gap-2">
                                <Zap size={16} className="text-violet-500 fill-current" />
                                AI 自动托管模式
                              </h4>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                开启后，AI 将获得执行指令的权限，可以自动控制设备、调节环境，无需您再次确认。
                              </p>
                              <div className="flex items-center justify-between pt-2">
                                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">启用自动执行</span>
                                <Switch 
                                  checked={autoExecuteCommands}
                                  onCheckedChange={setAutoExecuteCommands}
                                  className="data-[state=checked]:bg-violet-600"
                                />
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleOptimizePrompt}
                            disabled={!input.trim() || isOptimizing}
                            className={cn(
                            "p-2 rounded-lg transition-all",
                            isOptimizing
                                ? "text-amber-500 animate-pulse"
                                : input.trim() 
                                ? "text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                : "text-zinc-200 dark:text-zinc-700 cursor-not-allowed"
                            )}
                            title="优化提示词"
                        >
                            <Wand2 size={16} />
                        </button>
                    </div>
                    </div>
                  </div>
                  {/* Hidden file input for Chat State */}
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.md" multiple className="hidden" onChange={onSelectFiles} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Help Button - Bottom Right */}
        <div className="absolute bottom-6 right-6 z-20">
          <button className="size-9 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 shadow-sm transition-colors">
            <CircleHelp size={18} />
          </button>
        </div>
      </div>

      {/* Right Studio Panel */}
      <div className={cn(
        "relative flex-shrink-0 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-20",
        studioOpen ? "w-[400px] lg:w-[480px] xl:w-[550px] translate-x-0" : "w-0 translate-x-full opacity-0"
      )}>
        {studioOpen && (
          <div className="w-full h-full flex flex-col overflow-hidden">
            {/* Studio Header */}
            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Zap size={18} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">工作室</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                    {studioData.length > 0 && studioData[studioData.length - 1].name.includes('weather') ? <Sun size={12} /> : 
                     studioData.length > 0 && studioData[studioData.length - 1].name.includes('spectrum') ? <Activity size={12} /> : 
                     <Globe size={12} />}
                    {studioData.length > 0 ? `正在处理: ${studioData[studioData.length - 1].name}...` : '等待工具执行...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setStudioOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <PanelLeftOpen size={18} className="rotate-180" />
                </button>
                <button 
                  onClick={() => setStudioOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Studio Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50 dark:bg-[#09090B]">
              <div className="space-y-6">
                {/* 如果正在浏览网页，显示浏览器预览 */}
                {currentBrowserUrl && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 mb-4">
                        <WebPreview 
                            defaultUrl={currentBrowserUrl}
                            className="h-[400px] bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm"
                        >
                            <WebPreviewNavigation className="bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
                                <div className="flex gap-1.5 mr-3">
                                    <div className="size-2.5 rounded-full bg-red-400" />
                                    <div className="size-2.5 rounded-full bg-amber-400" />
                                    <div className="size-2.5 rounded-full bg-green-400" />
                                </div>
                                <WebPreviewUrl 
                                    value={currentBrowserUrl}
                                    className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                                    readOnly
                                />
                                <WebPreviewNavigationButton 
                                    tooltip="在新标签页打开"
                                    onClick={() => window.open(currentBrowserUrl, '_blank')}
                                >
                                    <ArrowUpRight className="size-4" />
                                </WebPreviewNavigationButton>
                            </WebPreviewNavigation>
                            <WebPreviewBody 
                                src={currentBrowserUrl}
                            />
                        </WebPreview>
                    </div>
                )}

                {studioData.length > 0 ? (
                   studioData.map((data, idx) => (
                     <MCPToolDisplay
                       key={idx}
                       toolName={data.name}
                       result={data.result?.error ? 'error' : 'success'}
                       input={data.input}
                       output={data.result?.error ? undefined : data.result}
                       errorText={data.result?.error}
                       className="mb-4"
                     />
                   ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-600 pt-20">
                     <Loader2 size={24} className="animate-spin mb-4" />
                     <p className="text-sm">等待工具执行结果...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl overflow-hidden p-0 border-0 shadow-2xl bg-white dark:bg-zinc-900">
           {/* Background Decoration */}
           <div className="absolute inset-0 z-0 pointer-events-none">
             <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-emerald-500/10 to-transparent" />
           </div>
           
           <DialogHeader className="pt-10 px-6 pb-2 relative z-10 flex flex-col items-center">
             <div className="relative mb-6">
               <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl transform scale-110" />
               <div className="relative size-20 rounded-full border-4 border-white dark:border-zinc-800 shadow-xl overflow-hidden bg-emerald-50 dark:bg-emerald-900/20">
                  <Image 
                    src="/icon.png" 
                    alt="莓小智" 
                    fill 
                    className="object-cover scale-110" 
                  />
               </div>
               <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-800 rounded-full p-1.5 shadow-md">
                 <div className="bg-amber-400 rounded-full p-1">
                   <Zap size={10} className="text-white fill-white" />
                 </div>
                 </div>
               </div>

             <DialogTitle className="text-center text-xl font-bold text-zinc-900 dark:text-white">
               今日额度已耗尽
             </DialogTitle>
             <DialogDescription className="text-center text-sm mt-3 text-zinc-500 dark:text-zinc-400 max-w-[280px] leading-relaxed">
               小助手今天已经陪您聊了很久啦，休息一下或者升级专业版继续畅聊吧～
             </DialogDescription>
           </DialogHeader>

           <div className="px-6 py-4 relative z-10">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 space-y-4">
                 <div className="flex items-center gap-3.5">
                    <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                       <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                       <span className="text-sm font-semibold text-zinc-900 dark:text-white block">无限次对话</span>
                       <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">不再受每日额度限制，全天候陪伴</span>
                    </div>
                 </div>
                 <div className="w-full h-px bg-zinc-200/50 dark:bg-zinc-700/50" />
                 <div className="flex items-center gap-3.5">
                    <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                       <Zap size={14} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                       <span className="text-sm font-semibold text-zinc-900 dark:text-white block">高级 AI 模型</span>
                       <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">解锁 Qwen-Max、DeepSeek 等顶级模型</span>
                    </div>
                 </div>
              </div>
           </div>

           <DialogFooter className="px-6 pb-8 pt-2 sm:justify-center relative z-10 flex-col sm:flex-col gap-3">
             <Button 
               onClick={() => router.push('/plans')} 
               className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 border-0 shadow-lg py-6 text-base font-semibold rounded-xl transition-transform active:scale-95"
             >
               立即升级专业版
             </Button>
             <Button 
               variant="ghost" 
               onClick={() => setShowPlanDialog(false)}
               className="w-full text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-transparent text-sm font-medium"
             >
               明天再来
             </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 浏览器活动窗口 - 仅在全屏模式下渲染，小窗口预览不需要此组件 */}
      <BrowserActivity url={browsingUrl || ""} isOpen={!!browsingUrl && !studioOpen} onClose={() => setBrowsingUrl(null)} />

      <AISettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSave={handleSettingsSave}
      />

      <VoiceChatModal
        open={voiceChatOpen}
        onClose={() => setVoiceChatOpen(false)}
        onSendMessage={handleVoiceChatMessage}
        aiSettings={aiSettings}
      />

      {/* 可见的 LiveStreamPlayer 弹窗用于 AI 视觉巡检截图，参考 Monitor 页面样式 */}
      {/* 修复闪烁：增加 key 或移除不必要的重新渲染触发条件，并且移除 pointer-events-none 避免在某些设备上被点击穿透导致关闭，但我们需要它不可点击，所以用 pointer-events-none。 闪烁通常是因为 open 状态瞬间变化，或者组件重复挂载。 */}
      <Dialog open={!!inspectionCameraUrl || isInspecting} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[1000px] p-0 gap-0 overflow-hidden bg-black border-white/10 shadow-2xl rounded-3xl [&>button]:hidden pointer-events-none duration-300">
          <DialogTitle className="sr-only">AI 视觉巡检画面</DialogTitle>
          <div className="relative w-full h-[60vh] bg-black flex flex-col items-center justify-center overflow-hidden">
            {/* Background Video */}
            <div className="absolute inset-0 z-0">
              {/* Keep LiveStreamPlayer mounted always to avoid flicker, just hide it when not ready */}
              <div className={cn("w-full h-full", inspectionCameraUrl ? "opacity-100" : "opacity-0 absolute")}>
                {inspectionCameraUrl && (
                  <LiveStreamPlayer
                    id="hidden-ai-camera"
                    sources={[{ src: inspectionCameraUrl }]}
                    autoplay
                    muted
                    controls={false}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              
              {!inspectionCameraUrl && (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900 absolute inset-0">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 mx-auto rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5">
                      <Signal className="w-8 h-8 text-zinc-600 animate-pulse" />
                    </div>
                    <p className="text-zinc-400 font-medium">连接中...</p>
                  </div>
                </div>
              )}
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none" />
            </div>

            {/* Top Bar (Mock) */}
            <div className="absolute top-0 left-0 right-0 z-20 p-6 flex items-start justify-between">
               {/* Left: Status */}
               <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                     <span className="text-xs font-bold text-white tracking-wide">AI Vision</span>
                  </div>
               </div>

               {/* Center: Title */}
               <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                  <span className="text-sm font-medium text-white">
                    {inspectionCamera === 'a' ? '温室摄像头 A' : '温室摄像头 B'}
                  </span>
               </div>
            </div>

            {/* Center Loading Indicator */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
              <div className="relative size-32 flex items-center justify-center mb-6">
                 {/* 扫描线动画 */}
                 <div className="absolute inset-0 rounded-full border border-emerald-500/30 overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" style={{ animation: 'scan 2s ease-in-out infinite' }} />
                 </div>
                 <div className="size-16 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse backdrop-blur-md border border-emerald-500/30">
                  <Camera className="size-8 text-emerald-400" />
                 </div>
              </div>
              <h3 className="text-white font-bold text-xl mb-2 drop-shadow-md">正在进行视觉巡检</h3>
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                 <Loader2 className="size-4 text-emerald-400 animate-spin" />
                 <p className="text-emerald-400 text-sm font-medium">{inspectionStatus}</p>
              </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes scan {
                0% { transform: translateY(-100%); }
                100% { transform: translateY(32rem); }
              }
            `}} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
  toast.success("已复制到剪贴板")
}
