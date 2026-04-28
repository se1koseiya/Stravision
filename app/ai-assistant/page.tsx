"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import type { UserPublic } from "@/lib/db/user-service"
import { Mic, MicOff, RotateCcw, Copy, Trash, SquarePen, Library, CircleHelp, PanelLeftClose, PanelLeftOpen, CheckCircle2, AlertCircle, Loader2, Globe, ImageIcon, FileText, Sun, Activity, Sprout, Zap, ArrowUpRight, Wand2, Download, Phone, Play, Pause, Volume2, VolumeX, Camera, Signal, Cpu, Home, Brain, House, Compass, MessageSquare, ChevronUp, Circle, Clock } from "lucide-react";
import { SkillStore } from "@/components/ai/skill-store"
import { UnifiedExplore } from "@/components/explore/unified-explore"
import { AtSign } from "@/components/animate-ui/icons/at-sign";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandInput as CommandInputUI, CommandItem, CommandList } from "@/components/ui/command"
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
import { VoiceChatModal } from "@/components/ai/voice-chat-modal"
import { CalendarTrigger } from "@/components/ai/calendar-trigger"
import SiriOrb from "@/components/smoothui/siri-orb"
import { MCPStatusIndicator } from "@/components/mcp/mcp-status-indicator"
import { MCPToolDisplay } from "@/components/ai/mcp-tool-display"
import { useAIFeatures } from "@/lib/hooks/use-ai-features"
import { DeviceControlDisplay } from "@/components/studio/device-control-display"
import { AgentExecutionChain, type AgentStep } from "@/components/ai/agent-execution-chain"
import QwenVoiceInput from "@/components/ui/qwen-voice-input"
import { Qwen, DeepSeek, Moonshot, Zhipu, Minimax } from '@lobehub/icons';
import { parseScheduleTask, removeScheduleTaskTag, getScheduleTaskSystemPrompt } from '@/lib/ai/schedule-task-parser'
import { filterDisabledFeatures } from '@/lib/ai/prompt-templates'

import { BrowserActivity } from "@/components/ai/browser-activity"
import { WebPreview, WebPreviewNavigation, WebPreviewNavigationButton, WebPreviewUrl, WebPreviewBody } from "@/components/ai/web-preview"

import { DeviceControlCard } from "@/components/ai/device-control-card"
import { HTMLPreviewCard } from "@/components/ai/html-preview-card"
import { AIControlBorderEffect } from "@/components/ai/ai-control-border-effect"
import { DynamicModelSelector } from "@/components/ai/dynamic-model-selector"

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
  commandErrors?: Record<number, string> // 存储命令执行错误，key为命令索引
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
  const [isCollapsed, setIsCollapsed] = useState(true) // 默认折叠
  const [autoCollapse, setAutoCollapse] = useState(() => {
    // 从 localStorage 读取用户的自动折叠偏好
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('task-planner-auto-collapse')
      return saved === 'true'
    }
    return false
  })
  const [elapsedTime, setElapsedTime] = useState(0)
  
  // 持久化 autoCollapse 状态到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('task-planner-auto-collapse', String(autoCollapse))
    }
  }, [autoCollapse])

  const tasksData = (() => {
    try {
      const match = content.match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/)
      if (!match) return null
      return JSON.parse(match[1])
    } catch { return null }
  })()

  const tasks = tasksData?.tasks || []
  const allCompleted = tasks.length > 0 && tasks.every((t: any) => t.status === 'completed');
  
  // 自动折叠逻辑：当任务完成且启用自动折叠时
  useEffect(() => {
    console.log('[DynamicTaskPlanner] State:', { autoCollapse, allCompleted, isCollapsed })
    if (autoCollapse && allCompleted && !isCollapsed) {
      const timer = setTimeout(() => {
        console.log('[DynamicTaskPlanner] Auto-collapsing...')
        setIsCollapsed(true)
      }, 2000) // 2秒后自动折叠
      return () => clearTimeout(timer)
    }
  }, [autoCollapse, allCompleted, isCollapsed])
  
  // 移除了自动展开逻辑，保持默认折叠状态，由用户手动展开

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
        <div 
          className={cn(
            "px-6 py-4 flex items-center justify-between border-b border-zinc-100/80 dark:border-white/5 bg-white/30 dark:bg-black/20 cursor-pointer select-none transition-colors hover:bg-zinc-50/50 dark:hover:bg-white/5",
            isCollapsed && "border-b-0"
          )}
          onClick={() => {
            console.log('[DynamicTaskPlanner] Header click toggle, current:', isCollapsed, '-> new:', !isCollapsed)
            setIsCollapsed(!isCollapsed)
          }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
             <div className={cn(
                "size-2 rounded-full shrink-0",
                allCompleted ? "bg-primary shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-blue-500 animate-pulse"
              )} />
             <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500 shrink-0">
                <span>
                  {allCompleted ? "任务已全部达成" : "执行中"} | 执行用时: {formatTime(elapsedTime)}
                </span>
              </div>
              {/* 折叠时显示当前任务进度 */}
              {isCollapsed && !allCompleted && activeTask && (
                <div className="flex items-center gap-2 ml-2 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Loader2 size={11} className="text-blue-500 animate-spin shrink-0" />
                    <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 truncate">
                      {activeTask.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 shrink-0 tabular-nums">
                    {currentIndex + 1}/{tasks.length}
                  </span>
                </div>
              )}
              {isCollapsed && allCompleted && (
                <div className="flex items-center gap-2 ml-2 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={11} className="text-primary shrink-0" />
                    <span className="text-[11px] font-semibold text-primary dark:text-emerald-400">
                      全部完成
                    </span>
                  </div>
                </div>
              )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
            {/* 自动折叠开关 */}
            <button
              onClick={() => setAutoCollapse(!autoCollapse)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all",
                autoCollapse 
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
              title={autoCollapse ? "已启用自动折叠" : "点击启用自动折叠"}
            >
              {autoCollapse ? <CheckCircle2 size={12} /> : <Circle size={12} />}
              <span>自动折叠</span>
            </button>
            
            {/* 手动折叠按钮 */}
            <button
              onClick={() => {
                console.log('[DynamicTaskPlanner] Manual toggle, current:', isCollapsed, '-> new:', !isCollapsed)
                setIsCollapsed(!isCollapsed)
              }}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              title={isCollapsed ? "展开任务" : "折叠任务"}
            >
              {isCollapsed ? <ChevronDown size={16} className="text-zinc-600 dark:text-zinc-400" /> : <ChevronUp size={16} className="text-zinc-600 dark:text-zinc-400" />}
            </button>
            
            <button 
              onClick={onOpenStudio}
              className="group/btn flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all px-4 py-2 rounded-full bg-zinc-100 hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30"
            >
              <Zap size={14} className="fill-current group-hover/btn:scale-110 transition-transform" />
              <span>打开工作室</span>
              <ArrowUpRight size={14} className="opacity-50 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
        
        {/* Body - 可折叠 */}
        <div className={cn(
          "transition-all duration-500 ease-in-out overflow-hidden",
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
        )}>
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
                    isPast ? "bg-primary text-white" : 
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
                        <div className="text-[10px] text-primary font-medium mt-1 truncate animate-in fade-in slide-in-from-left-1 duration-500">
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
                      allCompleted ? "text-primary dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
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
                      isSubPast ? "bg-emerald-100 text-primary dark:bg-emerald-950/30 dark:text-primary" :
                      "bg-zinc-50 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600"
                    )}>
                      {isSubActive ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : action.icon ? (
                        React.cloneElement(action.icon as React.ReactElement, { size: 18 })
                      ) : (
                        <Zap size={18} />
                      )}
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
                      <div className="size-5 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-primary">
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
                      className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold text-white bg-primary hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
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
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100/50 dark:border-primary/20 animate-in zoom-in duration-500">
                   <CheckCircle2 size={16} className="text-primary" />
                   <span className="text-xs font-bold text-primary dark:text-emerald-400">流水线执行完毕</span>
                </div>
              )}
            </div>
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
  const [agentStatus, setAgentStatus] = useState("")
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([])
  const [isTTSEnabled, setIsTTSEnabled] = useState(true) // TTS Toggle
  const [isTtsPaused, setIsTtsPaused] = useState(false) // 真正的播放暂停
  const [enableMcp, setEnableMcp] = useState(true) // MCP Toggle

  // Initialize TTS state from stored settings
  useEffect(() => {
    const voiceSettings = getVoiceSettings()
    setIsTTSEnabled(voiceSettings.readAloud)
  }, [])
  
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

  // 自动执行命令已整合到助手模式中，不再需要单独的状态
  const [isExecutingControl, setIsExecutingControl] = useState(false) // 正在执行设备控制（用于发光动效）
  const [executingDeviceName, setExecutingDeviceName] = useState<string>("") // 正在操作的设备名称
  const [devicePillExpanded, setDevicePillExpanded] = useState(false) // 控制胶囊展开动画
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [assistantMode, setAssistantMode] = useState<'chat' | 'automation' | 'expert'>(() => {
    // 从localStorage读取上次选择的模式，默认为chat
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-assistant-mode')
      if (saved === 'chat' || saved === 'automation' || saved === 'expert') {
        return saved
      }
    }
    return 'chat'
  })
  const [attachments, setAttachments] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // 持久化assistantMode到localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-assistant-mode', assistantMode)
      console.log('[Mode Debug] Current assistantMode:', assistantMode, 'autoExecuteCommands:', assistantMode === 'automation' || assistantMode === 'expert')
    }
  }, [assistantMode])
  const [voiceChatOpen, setVoiceChatOpen] = useState(false)
  const [showPlanDialog, setShowPlanDialog] = useState(false)
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ open: boolean; session: { id: number; title: string } | null }>({ open: false, session: null })
  const [greeting, setGreeting] = useState("晚上好")
  
  // 自动执行命令 - 只有自动化和专家模式才自动执行
  // 对话模式下AI会输出JSON，但需要用户手动点击执行按钮
  const autoExecuteCommands = assistantMode === 'automation' || assistantMode === 'expert'
  
  // MCP Tool Mention State
  const [availableTools, setAvailableTools] = useState<{name: string, description: string, displayName?: string}[]>([])
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
  console.log('[AI Features] Current config:', aiFeatures)
  
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
  const [studioTab, setStudioTab] = useState<'tools' | 'tasks'>('tools') // 新增：Studio 标签页状态
  const [currentBrowserUrl, setCurrentBrowserUrl] = useState<string | null>(null) // 工作室内部的浏览器URL
  const [browserScreenshot, setBrowserScreenshot] = useState<string | null>(null) // 新增：浏览器截图数据
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
  
  // 🔥 当 AI 功能配置变化时，重新过滤所有消息
  useEffect(() => {
    if (!aiFeatures) return
    
    setMessages(prev => prev.map(msg => {
      if (msg.role === 'assistant' && typeof msg.content === 'string') {
        const filtered = filterDisabledFeatures(msg.content, aiFeatures)
        if (filtered !== msg.content) {
          console.log('[AI Features] Re-filtered message due to config change')
          return { ...msg, content: filtered }
        }
      }
      return msg
    }))
  }, [aiFeatures])
  
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

            // 将反馈过程记录到 Agent 执行链中，而不是显示在聊天气泡里（用户觉得丑）
            const feedbackStepId = `feedback-${Date.now()}`
            setAgentSteps(prev => [...prev, {
                id: feedbackStepId,
                type: "observation",
                status: "active",
                title: "意图溯源与结果审视",
                detail: "正在核对原始意图并采样设备最新状态...",
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
4. **决策下发**：如果任务未完成且不冲突，请继续下发 JSON；如果已完成，请总结并停止。`, [], true, true)

            // 更新步骤为已完成
            setAgentSteps(prev => prev.map(s => s.id === feedbackStepId ? { ...s, status: "completed", durationMs: Date.now() - s.startedAt } : s))
        } else {
            setAgentStatus("") 
            setIsLoading(false)
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
      
      // 根据助手模式调整系统提示词 - 让每个模式有明显区别
      if (assistantMode === 'automation') {
        effectiveSystemPrompt += `\n\n【自动化模式 - 执行优先】
- 目标：快速执行，减少对话
- 行为准则：
  1. 收到指令后立即分析并执行，不要询问确认
  2. 直接输出 JSON 控制指令，不要解释太多
  3. 如果参数不明确，使用合理的默认值
  4. 执行完成后简短汇报结果即可
  5. 遇到问题时自动尝试替代方案
- 禁止：长篇解释、反复确认、等待用户回复
- 示例：用户说"开灯" → 直接输出 JSON 开灯指令`;
      } else if (assistantMode === 'expert') {
        effectiveSystemPrompt += `\n\n【专家模式 - 分析优先】
- 目标：深度分析，科学决策
- 行为准则：
  1. 先分析环境数据和历史趋势
  2. 给出专业的诊断和建议
  3. 解释为什么要这样做（科学依据）
  4. 提供多个方案供参考
  5. 执行前说明预期效果和风险
  6. 使用 <TASK_LIST> 规划复杂任务
  7. 可以调用多个工具进行综合分析
- 特点：详细、专业、有理有据
- 示例：用户说"草莓叶子发黄" → 分析可能原因（缺氮/病害/光照）→ 建议检测方案 → 给出治疗方案`;
      } else {
        effectiveSystemPrompt += `\n\n【对话模式 - 交流优先】
- 目标：友好交流，帮助理解
- 行为准则：
  1. 用自然语言回答问题和提供建议
  2. 如果用户需要控制设备，先解释操作的作用和影响
  3. 然后输出 JSON 控制指令（用户需要手动点击"执行"按钮确认）
  4. 提供建议但让用户做最终决定
  5. 如果不确定用户意图，主动询问
- 重要：你可以输出 JSON 控制指令，但系统会等待用户手动确认后才执行
- 示例：用户说"温度有点高" → 解释"当前32°C偏高，建议开启风扇降温" → 输出JSON风扇控制指令 → 用户点击"执行"按钮后才会真正执行`;
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

      // Agent execution chain steps - 初始化第一个“深度思考”步骤
      const currentAgentSteps: AgentStep[] = [
        {
          id: `initial-thinking-${Date.now()}`,
          type: "thinking",
          status: "active",
          title: "正在智能识别用户意图...",
          detail: "解析上下文并进行模型深度推理",
          startedAt: Date.now()
        }
      ]
      setAgentSteps(currentAgentSteps)

      const decoder = new TextDecoder()
      let buffer = ""
      let ttsProcessedLength = 0
      let latestHistoryFromBackend: Message[] | null = null

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
                 currentAgentSteps.push({
                   id: `obs-${Date.now()}`,
                   type: "observation",
                   status: hasError ? "error" : "completed",
                   title: hasError ? `${data.tool_result.name} 调用失败` : `获取到 ${data.tool_result.name} 结果`,
                   detail: hasError ? String(data.tool_result.result.error).slice(0, 100) : '数据已注入上下文',
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
                
                // Update the initial thinking step
                const thinkingIdx = currentAgentSteps.findIndex(s => s.type === 'thinking' && s.status === 'active')
                if (thinkingIdx !== -1) {
                   currentAgentSteps[thinkingIdx].status = 'completed'
                   currentAgentSteps[thinkingIdx].title = `意图识别 → ${skillNames}`
                   currentAgentSteps[thinkingIdx].detail = `智能路由匹配到 ${data.skill_selection.length} 个知识模块`
                   currentAgentSteps[thinkingIdx].duration = Date.now() - (currentAgentSteps[thinkingIdx].startedAt || startTs)
                   
                   // Start a NEW active step for subsequent reasoning
                   currentAgentSteps.push({
                      id: `reasoning-${Date.now()}`,
                      type: "thinking",
                      status: "active",
                      title: "莓小智思考中...",
                      detail: "正在构思后续行动计划",
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
                    id: `action-${tc.id || Date.now()}`,
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
                setMessages(prev => {
                  const newMsgs = [...prev]
                  newMsgs[newMsgs.length - 1] = { ...assistantMsg }
                  return newMsgs
                })

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
                      id: `answer-${Date.now()}`,
                      type: "answer",
                      status: "active",
                      title: "生成最终回答",
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

                // 实时清理 TASK_LIST 和 SCHEDULE_TASK 标签，防止在流式输出时裸露
                if (typeof assistantMsg.content === "string") {
                    // 注意：不要移除正确包裹的 <TASK_LIST>...</TASK_LIST>
                    // 只移除裸露的 JSON 和错误的标签
                    
                    // 1. 拦截裸露的 TASK_LIST JSON（没有标签包裹的）
                    // 先检查是否有完整的标签对
                    const hasCompleteTag = /<TASK_LIST>[\s\S]*?<\/TASK_LIST>/.test(assistantMsg.content)
                    
                    if (!hasCompleteTag) {
                        // 只有在没有完整标签的情况下才过滤裸露的 JSON
                        
                        // 匹配模式：{ "status": "in_progress", "tasks": [...]
                        const taskListJsonPattern = /\{\s*"status"\s*:\s*"(?:in_progress|completed|pending)"\s*,\s*"tasks"\s*:\s*\[[\s\S]*?\]\s*\}/g
                        assistantMsg.content = assistantMsg.content.replace(taskListJsonPattern, '')
                        
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
                         ttsQueueRef.current.push(spokenSentence)
                         fetchNextTts()
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

                // 🔥 强制过滤被禁用的功能标签（前端最后一道防线）
                display = filterDisabledFeatures(display, aiFeatures)
                console.log('[Frontend Filter] Applied to streaming content')

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

      // ✅ Fix #1: 流结束时，标记 Final Answer 步骤完成，并在短暂延迟后清空执行链
      const answerIdx = currentAgentSteps.findIndex(s => s.type === 'answer')
      if (answerIdx !== -1) {
        currentAgentSteps[answerIdx].status = 'completed'
        currentAgentSteps[answerIdx].duration = Date.now() - (currentAgentSteps[answerIdx].startedAt || startTs)
        setAgentSteps([...currentAgentSteps])
      }
      // 延迟清除执行链，让用户能看到完整流程
      setTimeout(() => setAgentSteps([]), 3000)

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
        setMessages(prev => {
          const newMsgs = [...prev]
          newMsgs[newMsgs.length - 1] = { ...assistantMsg }
          return newMsgs
        })
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
    
    // 🔥 前端最后一道防线：强制过滤被禁用的功能标签
    if (typeof content === 'string') {
      content = filterDisabledFeatures(content, aiFeatures)
    }
    
    // 过滤掉 SCHEDULE_TASK 标记（不显示在聊天中）
    if (typeof content === 'string') {
      content = content.replace(/<SCHEDULE_TASK>[\s\S]*?<\/SCHEDULE_TASK>/g, '').trim()
    }
    
    // 渲染思考过程（仅在开启深度思考模式时显示）
    const reasoningElement = (msg.reasoning?.text && enableReasoning) ? (
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
        
        // 增强过滤：移除所有看起来像工具调用的 JSON 块
        // 保留设备控制指令（toggle_relay, control_camera 等）
        
        // 1. 移除 MCP 工具调用的 JSON 块（以 mcp_ 开头的）
        content = content.replace(/```json\s*\{\s*"(?:action|function|name)":\s*"mcp_[^"]*"[\s\S]*?\}\s*```/g, "");
        
        // 2. 移除常见工具调用的 JSON 块
        content = content.replace(/```json\s*\{\s*"(?:action|function)":\s*"(?:scrape|search|find|fetch|get|query|analyze)"[\s\S]*?\}\s*```/g, "");
        
        // 3. 移除包含 tool_calls 或 function_call 的 JSON 块
        content = content.replace(/```json\s*\{[\s\S]*?"tool_calls"[\s\S]*?\}\s*```/g, "");
        content = content.replace(/```json\s*\{[\s\S]*?"function_call"[\s\S]*?\}\s*```/g, "");
        
        // 4. 移除孤立的工具调用 JSON 文本（不在代码块中的）
        content = content.replace(/^\s*\{\s*"(?:action|function|name)":\s*"mcp_[^"]*"[\s\S]*?\}\s*$/gm, "");
        
        // 5. 移除包含 arguments 字段的工具调用 JSON（通常是 OpenAI function calling 格式）
        content = content.replace(/```json\s*\{[\s\S]*?"arguments":\s*\{[\s\S]*?\}[\s\S]*?\}\s*```/g, "");

        // 6. 🔥 新增：拦截裸露的 TASK_LIST JSON（最重要的过滤）
        // 但要保留正确包裹在 <TASK_LIST> 标签内的 JSON
        
        // 先检查是否有完整的 TASK_LIST 标签对
        const hasCompleteTaskListTag = /<TASK_LIST>[\s\S]*?<\/TASK_LIST>/.test(content)
        
        if (!hasCompleteTaskListTag) {
            // 只有在没有完整标签的情况下才过滤裸露的 JSON
            
            // 匹配完整的 TASK_LIST JSON 对象
            const taskListJsonPattern = /\{\s*"status"\s*:\s*"(?:in_progress|completed|pending)"\s*,\s*"tasks"\s*:\s*\[[\s\S]*?\]\s*\}/g
            content = content.replace(taskListJsonPattern, (match) => {
                console.warn('[TASK_LIST Filter] Intercepted bare TASK_LIST JSON:', match.slice(0, 100))
                return '' // 完全移除
            });
            
            // 7. 🔥 新增：拦截不完整的 TASK_LIST JSON 片段
            // 匹配模式：{ "status": "in_progress", "tasks": [{ "id": "task-1"...
            const incompleteTaskPattern = /\{\s*"status"\s*:\s*"(?:in_progress|completed|pending)"[\s\S]*?(?:"tasks"\s*:\s*\[[\s\S]*)?$/
            if (incompleteTaskPattern.test(content)) {
                const lastBrace = content.lastIndexOf('{')
                if (lastBrace !== -1) {
                    const potentialJson = content.slice(lastBrace)
                    if (potentialJson.includes('"tasks"') || (potentialJson.includes('"status"') && potentialJson.includes('"in_progress"'))) {
                        console.warn('[TASK_LIST Filter] Intercepted incomplete TASK_LIST JSON')
                        content = content.slice(0, lastBrace).trim()
                    }
                }
            }
        }

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
              {part.type === 'text' && part.text && renderTextContent(part.text, msg)}
            </div>
          ))}
          {/* Render DynamicTaskPlanner at the very bottom if it exists */}
          {dynamicTaskContent && aiFeatures.enableTaskList !== false && <DynamicTaskPlanner content={dynamicTaskContent} onOpenStudio={onOpenStudio} />}
        </div>
      )
    }
    return (
      <>
        {reasoningElement}
        {renderTextContent(typeof content === 'string' ? content : "", msg)}
        {/* Render DynamicTaskPlanner at the very bottom if it exists */}
        {dynamicTaskContent && aiFeatures.enableTaskList !== false && <DynamicTaskPlanner content={dynamicTaskContent} onOpenStudio={onOpenStudio} />}
      </>
    )
  }

  const renderTextContent = (content: string, msg?: Message) => {
    // TaskList extraction moved to renderMessageContent to ensure correct scope
    
    // Split content by CHART, REASONING, SOURCES, and TOOL_USED tags
    // Improved regex to handle multiline content correctly using [\s\S]*? non-greedy match
    // Updated to handle streaming REASONING tags (open tag without close tag yet)
    // Updated to handle spaces in tags (e.g. < TASK_LIST >)
    // Added SCHEDULED_TASKS for legacy/scheduled tasks list
    // Added TOOL_USED for tool usage indicators
    // Added AUTOMATION_STRATEGY for automation strategy cards
    // Also split by JSON code blocks to render them as DeviceControlCard
    const parts = content.split(/(<\s*CHART\s+type="echarts"\s*>[\s\S]*?<\/\s*CHART\s*>|<\s*CHART\s+type="vega-lite"\s*>[\s\S]*?<\/\s*CHART\s*>|<\s*REASONING\s*>[\s\S]*?(?:<\/\s*REASONING\s*>|$)|<\s*SOURCES\s*>[\s\S]*?<\/\s*SOURCES\s*>|<\s*MONITOR\s*>[\s\S]*?(?:<\/\s*MONITOR\s*>|$)|<\s*SPECTRAL\s*>[\s\S]*?(?:<\/\s*SPECTRAL\s*>|$)|<\s*TASKS\s*>[\s\S]*?<\/\s*TASKS\s*>|<\s*SCHEDULED_TASKS\s*(?:>[\s\S]*?(?:<\/\s*SCHEDULED_TASKS\s*>|$)|(?:\/>))|<\s*DEVICE_BENTO\s*(?:>[\s\S]*?(?:<\/\s*DEVICE_BENTO\s*>|$)|(?:\/>))|<\s*CONTROL_BENTO\s*(?:>[\s\S]*?(?:<\/\s*CONTROL_BENTO\s*>|$)|(?:\/>))|<\s*TOOL_USED\s+[^>]*(?:\/>|>[\s\S]*?<\/\s*TOOL_USED\s*>)|<\s*ACTION_PROMPT\s*>[\s\S]*?<\/\s*ACTION_PROMPT\s*>|<\s*CONTEXT_COMPRESSED\s*\/?>|<\s*PAST_MEMORY\s*>[\s\S]*?<\/\s*PAST_MEMORY\s*>|<\s*AUTOMATION_STRATEGY\s*>[\s\S]*?<\/\s*AUTOMATION_STRATEGY\s*>|```json\s*[\s\S]*?```)/g)

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
                 
                 // 只渲染 IoT 命令，其他 JSON 都隐藏
                 if (commands.some(isIoTCommand)) {
                    // 调试信息
                    console.log('[Device Control Debug]', {
                      assistantMode,
                      autoExecuteCommands,
                      commandsCount: commands.length,
                      expectedStatus: autoExecuteCommands ? 'executed' : 'pending'
                    })
                    
                    return (
                        <div key={index} className="my-4 space-y-3">
                            {commands.map((cmd: any, i: number) => (
                                isIoTCommand(cmd) ? (
                                    <DeviceControlCard 
                                        key={i} 
                                        command={cmd} 
                                        status={autoExecuteCommands ? 'executed' : 'pending'}
                                        error={msg && msg.commandErrors ? msg.commandErrors[i] : undefined}
                                        onExecute={async (c) => {
                                            console.log('[Manual Execute] User clicked execute button:', c)
                                            await executeCommands([c])
                                        }}
                                        onRetry={msg ? () => {
                                            // 重试：让AI重新思考
                                            const errorMsg = (msg.commandErrors && msg.commandErrors[i]) || '操作失败'
                                            const retryPrompt = `上一次设备控制失败了。错误信息：${errorMsg}。请重新分析情况并给出正确的控制指令。`
                                            handleSend(retryPrompt, [], false, false)
                                        } : undefined}
                                    />
                                ) : null
                            ))}
                        </div>
                    )
                 } else {
                    // 不是 IoT 命令的 JSON，完全隐藏（工具调用等）
                    console.log('[JSON Filter] Hiding non-IoT JSON block:', jsonContent.substring(0, 50) + '...')
                    return null
                 }
              }
              // 如果不是有效的 JSON 对象/数组，也隐藏
              return null
            } catch (e) {
                // 解析失败的 JSON，隐藏
                console.log('[JSON Filter] Hiding invalid JSON block')
                return null
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
            // ⚠️ 安全警告：AI 不应该手动输出 TOOL_USED 标签
            // 真实的工具调用会通过 agentSteps 系统显示
            // 这里忽略 AI 手动输出的 TOOL_USED 标签，防止假装调用工具
            console.warn('[Security] AI attempted to manually output TOOL_USED tag, ignoring:', part.slice(0, 100))
            return null
          }

          if (part.match(/^<\s*ACTION_PROMPT/)) {
            try {
              const innerHtml = part.replace(/^<\s*ACTION_PROMPT\s*>/, '').replace(/<\/\s*ACTION_PROMPT\s*>$/, '').trim()
              const actionRegex = /<\s*ACTION\s+value="([^"]+)"\s*>([\s\S]*?)<\/\s*ACTION\s*>/g;
              const actions: {value: string, label: string}[] = [];
              let match;
              while ((match = actionRegex.exec(innerHtml)) !== null) {
                 actions.push({ value: match[1], label: match[2].trim() });
              }

              return (
                <div key={index} className="my-4 space-y-3">
                   <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">系统提示：您需要决定下一步操作</div>
                   <div className="flex flex-col sm:flex-row gap-2">
                     {actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(act.value)}
                          className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-sm text-left flex-1"
                        >
                          {act.label}
                        </button>
                     ))}
                   </div>
                </div>
              )
            } catch (e) {
                console.error("Action Prompt parsing error", e)
                return null;
            }
          }

          if (part.match(/^<\s*CONTEXT_COMPRESSED/)) {
            return (
              <div key={index} className="my-2 animate-in fade-in slide-in-from-top-1 duration-500">
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  <Activity size={12} className="text-primary" />
                  <span>为了维持响应速度，较早的对话历史已自动提炼并压缩</span>
                </div>
              </div>
            )
          }

          if (part.match(/^<\s*PAST_MEMORY/)) {
            const memoryText = part.replace(/^<\s*PAST_MEMORY\s*>/, '').replace(/<\/\s*PAST_MEMORY\s*>/, '').trim()
            return (
              <div key={index} className="my-4 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-800/30 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Library size={48} className="text-amber-600" />
                </div>
                <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <Activity size={14} />
                  <span>历史记忆摘要 (已折叠)</span>
                </div>
                <div className="text-sm text-amber-800/80 dark:text-amber-200/70 leading-relaxed italic pr-8">
                  {memoryText}
                </div>
              </div>
            )
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

          if (part.match(/^<\s*AUTOMATION_STRATEGY/)) {
            try {
              const strategyContent = part.replace(/^<\s*AUTOMATION_STRATEGY\s*>/, '').replace(/<\/\s*AUTOMATION_STRATEGY\s*>$/, '').trim();
              
              // Extract description if present
              const descMatch = strategyContent.match(/description="([^"]*)"/);
              const description = descMatch ? descMatch[1] : undefined;
              
              // Extract JSON strategy
              const jsonMatch = strategyContent.match(/```json\s*([\s\S]*?)\s*```/);
              if (!jsonMatch) {
                console.error('No JSON found in AUTOMATION_STRATEGY');
                return null;
              }
              
              const strategy = JSON.parse(jsonMatch[1]);
              
              return (
                <div key={index}>
                  <AutomationStrategyCard 
                    strategy={strategy} 
                    description={description}
                  />
                </div>
              );
            } catch (e) {
              console.error('AUTOMATION_STRATEGY parsing error:', e);
              return null;
            }
          }

          if (part.match(/^<\s*DEVICE_BENTO/)) {
            return (
              <div key={index} className="my-6">
                <DeviceBentoGrid />
              </div>
            )
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

                    // Try to parse JSON and check if it's an ECharts option, Schedule Task, or IoT Command
                    if (!inline && (!language || language === 'json')) {
                      try {
                        const content = String(children).replace(/\n$/, '')
                        if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
                          const data = JSON.parse(content)

                          // Check for IoT Command - don't display JSON, it's already shown as DeviceControlCard
                          if (data.action && (
                            data.action === 'toggle_relay' || 
                            data.action === 'set_led' || 
                            data.action === 'control_camera' ||
                            data.action === 'reset_camera' ||
                            data.action === 'move_camera_and_look' ||
                            data.action === 'take_camera_snapshot'
                          )) {
                            return null // Don't show JSON for IoT commands
                          }

                          // Check for Schedule Task with validation
                          if (data.action === 'schedule_task') {
                            console.log('[ScheduleCard] 🔍 Detected schedule_task JSON:', data)
                            
                            // Validate required fields
                            const errors: string[] = []
                            if (!data.title) errors.push('缺少 title 字段')
                            if (!data.task_action) errors.push('缺少 task_action 字段')
                            if (!data.delay_seconds && !data.cron) errors.push('缺少 delay_seconds 或 cron 字段')
                            if (data.delay_seconds && typeof data.delay_seconds !== 'number') {
                              errors.push(`delay_seconds 必须是数字类型，当前是: ${typeof data.delay_seconds}`)
                            }
                            if (data.task_action === 'toggle_relay' && (!data.device || data.value === undefined)) {
                              errors.push('toggle_relay 任务缺少 device 或 value 字段')
                            }
                            
                            if (errors.length > 0) {
                              console.error('[ScheduleCard] ❌ JSON 格式错误:', errors)
                              toast.error('定时任务格式错误', { 
                                description: errors.join('; '),
                                duration: 5000
                              })
                              // Still try to render the card, it will show error state
                            } else {
                              console.log('[ScheduleCard] ✅ JSON 格式验证通过')
                            }
                            
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
                        console.error('[JSON Parse] Failed to parse JSON code block:', e)
                      }
                    }

                    if (!inline && (language === 'html' || language === 'javascript' || language === 'typescript' || language === 'js' || language === 'ts')) {
                      return <HTMLPreviewCard code={String(children).replace(/\n$/, '')} language={language} />
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
                  blockquote: ({ children }: any) => <blockquote className="border-l-4 border-primary dark:border-blue-600 pl-4 py-1 my-4 italic bg-emerald-50/50 dark:bg-blue-900/10 rounded-r text-zinc-600 dark:text-zinc-400">{children}</blockquote>,
                  h1: ({ children }: any) => <h1 className="text-2xl font-bold mt-6 mb-4 text-zinc-900 dark:text-zinc-100">{children}</h1>,
                  h2: ({ children }: any) => <h2 className="text-xl font-bold mt-5 mb-3 text-zinc-900 dark:text-zinc-100 pb-2 border-b border-zinc-100 dark:border-zinc-800">{children}</h2>,
                  h3: ({ children }: any) => <h3 className="text-lg font-bold mt-4 mb-2 text-zinc-900 dark:text-zinc-100">{children}</h3>,
                  a: ({ href, children }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary dark:text-primary hover:underline decoration-emerald-300 dark:decoration-emerald-300 underline-offset-2">{children}</a>
                }}
              >
                {part}
              </ReactMarkdown>
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
    <>
    <div
      className={cn(
        "relative fixed inset-0 w-full h-full text-zinc-900 dark:text-zinc-100 overflow-hidden flex font-sans selection:bg-primary/20 selection:text-emerald-700",
        isExecutingControl && "ai-control-active",
        isElderFriendlyMode && "elder-friendly-text"
      )}
    >
      {/* AI Control Border Effect - 渐变边框效果 */}
      <AIControlBorderEffect isActive={isExecutingControl} duration={2000} />
      
      {/* Background - Minimal & Clean */}
      <div className="absolute inset-0 bg-[#FAFAFA] dark:bg-[#09090B]" />

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

      {/* Refined Minimalist Sidebar (BeeBot Style) */}
      <div className={cn(
        "relative flex-shrink-0 bg-[#F9F9F9] dark:bg-[#09090B] border-r border-zinc-200/50 dark:border-zinc-800/50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden z-20 group/sidebar",
        sidebarOpen ? "w-[260px]" : "w-0 shadow-none border-none"
      )}>
        <div className="w-[260px] h-full flex flex-col pt-6 pb-4">
           {/* Logo Section */}
           <div className="px-6 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative size-8 shrink-0">
                  <Image 
                    src="/icon.png" 
                    alt="莓小智" 
                    fill 
                    className="object-cover rounded-xl shadow-lg shadow-blue-500/20" 
                  />
                </div>
                <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">莓小智</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                <PanelLeftClose size={18} />
              </button>
           </div>

           {/* Back Button */}
           <div className="px-3 mb-4">
              <button
                onClick={() => router.back()}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-100 group"
              >
                <ArrowLeft size={18} className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-all group-hover:-translate-x-0.5" />
                <span>返回上一页</span>
              </button>
           </div>

           {/* New Chat Trigger */}
           <div className="px-3 mb-6">
              <button
                onClick={createNewSession}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-sm transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div className="flex items-center gap-2">
                  <Plus size={16} />
                  <span>新对话</span>
                </div>
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-zinc-50 border-zinc-200 px-1.5 font-mono text-[10px] font-medium text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </button>
           </div>

           {/* Navigation Section */}
           <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
              {[
                { icon: <Home size={18} />, text: "主页", id: "home", active: true },
                { icon: <Compass size={18} />, text: "探索", id: "explore" },
                { icon: <Library size={18} />, text: "能力库", id: "library" },
                { icon: <RotateCcw size={18} />, text: "历史", id: "history" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === "explore") {
                      setExploreOpen(true)
                    } else if (item.id === "library") {
                      setStoreOpen(true)
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all group",
                    item.active 
                      ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm" 
                      : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  <span className={cn(item.active ? "text-blue-600" : "text-zinc-400 group-hover:text-zinc-600 transition-colors")}>{item.icon}</span>
                  {item.text}
                </button>
              ))}

              {/* History placeholder */}
              <div className="mt-8 px-4 mb-2">
                 <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">最近会话</h3>
              </div>
              <div className="space-y-0.5">
                {sessions.slice(0, 8).map((session) => (
                   <div
                     key={session.id}
                     className={cn(
                       "w-full flex items-center gap-2 px-4 py-2 text-[13px] rounded-xl transition-all group relative",
                       sessionId === session.id ? "bg-zinc-100 dark:bg-zinc-900" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                     )}
                   >
                     <button
                       onClick={() => {
                          setSessionId(session.id)
                          loadSessionMessages(session.id)
                       }}
                       className="flex-1 flex items-center gap-3 text-left min-w-0"
                     >
                       <CircleHelp size={14} className={cn(
                         "shrink-0 opacity-40 group-hover:text-blue-500 transition-colors",
                         sessionId === session.id ? "text-blue-500 opacity-100" : ""
                       )} />
                       <span className={cn(
                         "truncate",
                         sessionId === session.id ? "text-zinc-900 dark:text-zinc-100 font-medium" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                       )}>{session.title}</span>
                     </button>
                     <button
                       onClick={(e) => {
                         e.stopPropagation()
                         setDeleteConfirmDialog({ open: true, session: { id: session.id, title: session.title } })
                       }}
                       className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                       title="删除会话"
                     >
                       <X size={14} />
                     </button>
                   </div>
                ))}
              </div>
           </div>

           {/* User Section */}
           <div className="px-3 pt-4 mt-auto border-t border-zinc-200/50 dark:border-zinc-800/50">
              <button 
                onClick={() => setSettingsOpen(true)}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all text-left group"
              >
                <Avatar className="size-8 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-transform group-hover:scale-105">
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback className="bg-blue-600 text-white rounded-lg text-xs font-bold">{user?.username?.[0]?.toUpperCase() || "B"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate leading-none mb-1">{user?.username || "管理员"}</p>
                  <p className="text-[10px] text-zinc-400 truncate tracking-tight uppercase font-medium">Pro 订阅用户</p>
                </div>
                <Settings size={14} className="text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
              </button>
           </div>
        </div>
      </div>

      {/* Main Interface Content Area */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#0C0C0E] transition-colors duration-500 overflow-hidden relative">
        
        {/* Stationary Integrated Header (BeeBot style) */}
        <div className="h-[72px] flex items-center justify-between px-8 shrink-0 z-10 transition-all border-b border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all text-zinc-500">
                <PanelLeftOpen size={18} />
              </button>
            )}
            
            {/* 助手模式选择器 */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm">
              <button
                onClick={() => setAssistantMode('chat')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  assistantMode === 'chat' 
                    ? "bg-blue-500 text-white shadow-sm" 
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <MessageSquare size={14} />
                对话模式
              </button>
              <button
                onClick={() => setAssistantMode('automation')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  assistantMode === 'automation' 
                    ? "bg-primary text-white shadow-sm" 
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <Zap size={14} />
                自动化模式
              </button>
              <button
                onClick={() => setAssistantMode('expert')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  assistantMode === 'expert' 
                    ? "bg-purple-500 text-white shadow-sm" 
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <Brain size={14} />
                专家模式
              </button>
            </div>

            {(() => {
              const currentModelId = (selectedModel || aiSettings?.model || "qwen3.6-plus") as string;
              return (
                <DynamicModelSelector 
                  value={currentModelId}
                  onValueChange={(val) => {
                    setSelectedModel(val)
                    if (aiSettings) {
                      const newSettings = { ...aiSettings, model: val }
                      setAiSettings(newSettings)
                      localStorage.setItem("ai-settings", JSON.stringify(newSettings))
                    }
                  }}
                />
              )
            })()}
          </div>

          <div className="flex items-center gap-4">
             <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
                <button className="px-4 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/10 transition-all flex items-center gap-1.5">
                  <Cpu size={14} /> 助手
                </button>
                <button onClick={() => setStudioOpen(true)} className="px-4 py-1.5 text-xs font-bold rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all flex items-center gap-1.5 group">
                  <Activity size={14} className="group-hover:text-blue-500 transition-colors" /> 工作室
                </button>
             </div>
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVoiceChatOpen(true)}
                className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900"
                title="实时语音对话"
              >
                <Phone size={18} />
              </button>

              <button
                onClick={() => {
                  const newState = !isTtsPaused
                  setIsTtsPaused(newState)
                  isTtsPausedRef.current = newState
                }}
                className={cn(
                  "p-2 transition-all rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900",
                  isTtsPaused 
                    ? "text-amber-500" 
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                )}
                title={isTtsPaused ? "继续播报" : "暂停当前播报"}
              >
                {isTtsPaused ? <Play size={18} /> : <Pause size={18} />}
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
                  "p-2 transition-all rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900",
                  isTTSEnabled 
                    ? "text-primary" 
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                )}
                title={isTTSEnabled ? "全局播报已开启" : "全局播报已静音"}
              >
                {isTTSEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
            </div>

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
            <CalendarTrigger />
          </div>
        </div>

        {/* Chat Content Container */}
        <div id="ai-chat-main-container" className="flex-1 flex flex-col relative overflow-hidden">

          {/* Chat/Welcome Scrollable Area */}
          <div id="ai-welcome-area" className="flex-1 overflow-y-auto custom-scrollbar pt-12">
             {messages.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-4xl mx-auto relative z-10 animate-in fade-in zoom-in-95 duration-1000">
                {/* Subtle Dynamic Mesh Background Background */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-40 dark:opacity-20 blur-[100px]">
                  <motion.div 
                    animate={{ 
                      x: [0, 50, 0],
                      y: [0, 30, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-1/4 -left-1/4 size-[150%] bg-gradient-to-br from-blue-500/10 via-transparent to-transparent rounded-full"
                  />
                  <motion.div 
                    animate={{ 
                      x: [0, -40, 0],
                      y: [0, -50, 0],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-1/4 -right-1/4 size-[150%] bg-gradient-to-tl from-primary/10 via-transparent to-transparent rounded-full"
                  />
                </div>

                {/* Premium Floating Orb */}
                {/* Siri-style Voice Orb Implementation */}
                <div className="relative mb-6 pt-4">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ 
                      duration: 1.5, 
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    className="relative flex items-center justify-center"
                  >
                    <SiriOrb size="160px" className="shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-transform duration-700" />
                  </motion.div>
                </div>

              {/* Elegant Greeting Typography */}
              <div className="text-center space-y-2 mb-8">
                <motion.h1 
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight"
                >
                  {greeting}, {user?.username || '农场主'}
                </motion.h1>
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-xl md:text-2xl font-medium text-zinc-500 dark:text-zinc-400"
                >
                  我今天能为您 <span className="text-blue-600 dark:text-blue-500 font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">做点什么？</span>
                </motion.div>
                
                {/* 模式说明卡片 */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="mt-6 inline-flex items-start gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-100 dark:border-blue-900/50"
                >
                  {assistantMode === 'chat' && (
                    <>
                      <MessageSquare size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div className="text-left">
                        <div className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-1">对话模式：友好交流</div>
                        <div className="text-xs text-blue-600/80 dark:text-blue-400/80">AI会详细解释并提供控制指令，您需要点击"执行"按钮确认</div>
                      </div>
                    </>
                  )}
                  {assistantMode === 'automation' && (
                    <>
                      <Zap size={20} className="text-primary dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-left">
                        <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-1">自动化模式：快速执行</div>
                        <div className="text-xs text-primary/80 dark:text-emerald-400/80">AI会立即执行您的指令，无需确认，适合批量操作</div>
                      </div>
                    </>
                  )}
                  {assistantMode === 'expert' && (
                    <>
                      <Brain size={20} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                      <div className="text-left">
                        <div className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-1">专家模式：深度分析</div>
                        <div className="text-xs text-purple-600/80 dark:text-purple-400/80">AI会进行科学分析，提供专业建议并自动执行方案</div>
                      </div>
                    </>
                  )}
                </motion.div>
              </div>

              {/* Large Centered Input Area (BeeBot v4 Style) */}
              <div className="w-full max-w-3xl relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
                <div className="bg-white/80 dark:bg-zinc-900/40 backdrop-blur-2xl rounded-[36px] p-4 border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.12)] focus-within:shadow-[0_40px_100px_-15px_rgba(0,0,0,0.18)] focus-within:ring-2 focus-within:ring-blue-500/10 transition-all duration-700">
                  
                  {attachments.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto py-3 px-4 mb-2 scrollbar-none">
                      {attachments.map((url, i) => (
                        <div key={i} className="relative group/att shrink-0">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-zinc-200/50 dark:border-zinc-700 shadow-sm transition-transform group-hover/att:scale-105">
                            <Image src={url} alt="upload" fill className="object-cover" />
                          </div>
                          <button onClick={() => removeAttachment(i)} className="absolute -top-2 -right-2 size-6 bg-zinc-900 text-white rounded-full flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-all hover:bg-red-500 shadow-lg border-2 border-white"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea
                    ref={textareaRefInitial}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder="输入您的指令，或开启一段深度的农业经营对话..."
                    className="w-full bg-transparent border-0 focus:ring-0 resize-none text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400/80 text-[17px] leading-relaxed py-4 px-5 min-h-[100px] font-medium"
                  />
                  
                  {/* Bottom Persistent Toolbar */}
                  <div className="mt-4 flex items-center justify-between px-3 pb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                       <button onClick={() => fileInputRef.current?.click()} className="p-3.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl"><Paperclip size={20} /></button>
                       
                       <button onClick={() => setEnableReasoning(!enableReasoning)} className={cn("flex items-center gap-2.5 px-5 py-2.5 rounded-2xl transition-all text-sm font-bold border border-transparent shadow-none hover:shadow-md", enableReasoning ? "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800")}>
                          <Brain size={18} className={cn("transition-colors", enableReasoning ? "text-purple-500" : "text-zinc-400")} />
                          深度推理
                       </button>

                       <button onClick={() => handleSend("帮我草莓画一张漫画风格的宣传图")} className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl transition-all text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                          <ImageIcon size={18} className="text-blue-500" />
                          生成图像
                       </button>

                       <button onClick={() => {
                         // 检查是否安装了搜索工具
                         const hasSearchTool = availableTools.some(t => 
                           t.name.includes('search') || 
                           t.name.includes('exa') || 
                           t.name.includes('brave')
                         )
                         
                         if (!hasSearchTool && !enableSearch) {
                           // 如果没有搜索工具且要开启搜索，显示提示
                           toast.error('未安装搜索工具', {
                             description: '请先在设置中安装 Exa Search 或 Brave Search 等 MCP 工具'
                           })
                           return
                         }
                         
                         setEnableSearch(!enableSearch)
                       }} className={cn("flex items-center gap-2.5 px-5 py-2.5 rounded-2xl transition-all text-sm font-bold border border-transparent shadow-none hover:shadow-md", enableSearch ? "bg-emerald-50 text-primary border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800")}>
                          <Globe size={18} className={cn("transition-colors", enableSearch ? "text-primary" : "text-zinc-400")} />
                          全网检索
                       </button>

                       <Popover>
                         <PopoverTrigger asChild>
                           <button className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl transition-all text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                              <Settings size={18} className="text-zinc-400" />
                              工具设置
                           </button>
                         </PopoverTrigger>
                         <PopoverContent className="w-64 p-4 rounded-3xl border-zinc-200/50 dark:border-zinc-800 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-zinc-900/90" align="start">
                            <div className="space-y-4">
                               <div className="font-bold text-zinc-900 dark:text-zinc-100 px-1 py-1">工具配置</div>
                               
                               <div className="flex items-center justify-between px-1">
                                  <div className="flex flex-col">
                                     <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">MCP 服务集</span>
                                     <span className="text-[10px] text-zinc-500">连接外部上下文与数据源</span>
                                  </div>
                                  <Switch checked={enableMcp} onCheckedChange={setEnableMcp} />
                               </div>

                               <div className="flex items-center justify-between px-1">
                                  <div className="flex flex-col">
                                     <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">自动化技能</span>
                                     <span className="text-[10px] text-zinc-500">执行预设的农场操作脚本</span>
                                  </div>
                                  <Switch checked={mandatorySkillsEnabled} onCheckedChange={setMandatorySkillsEnabled} />
                               </div>

                               <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                               
                               <div className="px-1 pt-2">
                                  <button onClick={() => setStoreOpen(true)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group">
                                     <div className="flex items-center gap-2">
                                        <Library size={16} className="text-blue-500" />
                                        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">技能商店</span>
                                     </div>
                                     <ArrowRight size={14} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                                  </button>
                               </div>
                            </div>
                         </PopoverContent>
                       </Popover>
                    </div>
                    
                    <button 
                      onClick={() => handleSend()}
                      disabled={!input.trim() && attachments.length === 0}
                      className={cn(
                        "size-14 rounded-3xl flex items-center justify-center transition-all duration-500 shadow-2xl",
                        (input.trim() || attachments.length > 0)
                          ? "bg-blue-600 text-white shadow-blue-500/40 hover:scale-105 active:scale-95" 
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600"
                      )}
                    >
                      <ArrowUp size={24} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Action Bento Chips */}
              <div id="ai-quick-actions" className="mt-8 flex flex-wrap justify-center gap-4 px-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700">
                {/* 根据模式显示不同的快捷操作 */}
                {assistantMode === 'chat' && [
                  { icon: <CircleHelp size={18} />, text: "草莓种植建议", action: "现在这个季节草莓种植需要注意什么？", color: "bg-primary/10 text-primary dark:text-emerald-400" },
                  { icon: <Activity size={18} />, text: "查看环境数据", action: "帮我看看现在大棚的环境怎么样", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                  { icon: <Compass size={18} />, text: "病害咨询", action: "如果草莓叶子发黄该怎么办？", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(item.action)}
                    className="flex items-center gap-3 px-6 py-3.5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800 rounded-2xl hover:bg-white dark:hover:bg-zinc-800 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 group"
                  >
                    <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", item.color)}>
                      {item.icon}
                    </div>
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 tracking-tight">{item.text}</span>
                  </button>
                ))}
                
                {assistantMode === 'automation' && [
                  { icon: <Zap size={18} />, text: "快速巡检", action: "立即巡检所有设备状态", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
                  { icon: <Sun size={18} />, text: "优化环境", action: "根据当前数据自动优化大棚环境", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
                  { icon: <Activity size={18} />, text: "生成报告", action: "生成今天的环境监测报告", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(item.action)}
                    className="flex items-center gap-3 px-6 py-3.5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800 rounded-2xl hover:bg-white dark:hover:bg-zinc-800 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 group"
                  >
                    <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", item.color)}>
                      {item.icon}
                    </div>
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 tracking-tight">{item.text}</span>
                  </button>
                ))}
                
                {assistantMode === 'expert' && [
                  { icon: <Brain size={18} />, text: "深度诊断", action: "分析最近一周的数据，诊断可能存在的问题", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
                  { icon: <Sprout size={18} />, text: "优化方案", action: "基于当前生长阶段，制定科学的管理方案", color: "bg-primary/10 text-primary dark:text-emerald-400" },
                  { icon: <Activity size={18} />, text: "趋势分析", action: "分析环境数据趋势，预测未来变化", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(item.action)}
                    className="flex items-center gap-3 px-6 py-3.5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800 rounded-2xl hover:bg-white dark:hover:bg-zinc-800 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 group"
                  >
                    <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", item.color)}>
                      {item.icon}
                    </div>
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 tracking-tight">{item.text}</span>
                  </button>
                ))}
                
                {/* Agent编排入口 - 仅在专家模式显示 */}
                {assistantMode === 'expert' && (
                  <button
                    onClick={() => router.push('/admin/agent-orchestration')}
                    className="flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-900/20 dark:to-blue-900/20 backdrop-blur-md border border-purple-200/50 dark:border-purple-800/50 rounded-2xl hover:from-purple-500/20 hover:to-blue-500/20 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 group"
                  >
                    <div className="size-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                      <Brain size={18} />
                    </div>
                    <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 tracking-tight">多Agent协作编排</span>
                  </button>
                )}
              </div>
            </div>

          ) : (
            <>
              <Conversation className="flex-1 h-full min-h-0 overflow-hidden">
                <ConversationContent 
                  id="ai-chat-area" 
                  className="p-0 max-w-4xl mx-auto w-full custom-scrollbar"
                >
                  <div className="flex flex-col pb-48 pt-10 space-y-8 px-8 md:px-4">
                    {messages.map((msg, i) => {
                      if (msg.isSilent) return null;
                      
                      // 根据消息内容判断状态并设置颜色
                      const getOrbColors = () => {
                        if (msg.role !== 'assistant') return undefined
                        
                        const content = typeof msg.content === 'string' ? msg.content : ''
                        const isLastMessage = i === messages.length - 1
                        const isCurrentlyLoading = isLastMessage && isLoading
                        
                        // 思考中 - 紫色
                        if (content.includes('<think>') || content.includes('让我想想') || content.includes('分析')) {
                          return {
                            colors: {
                              c1: '#a855f7',
                              c2: '#c084fc',
                              c3: '#d8b4fe',
                            },
                            bgColor: 'rgba(168, 85, 247, 0.1)',
                            status: 'thinking'
                          }
                        }
                        
                        // 执行中 - 黄色/橙色
                        if (content.includes('```json') || content.includes('"action"') || content.includes('正在执行')) {
                          return {
                            colors: {
                              c1: '#f59e0b',
                              c2: '#fbbf24',
                              c3: '#fcd34d',
                            },
                            bgColor: 'rgba(245, 158, 11, 0.1)',
                            status: 'executing'
                          }
                        }
                        
                        // 输出中 - 蓝色（正在加载的最后一条消息）
                        if (isCurrentlyLoading) {
                          return {
                            colors: {
                              c1: '#3b82f6',
                              c2: '#60a5fa',
                              c3: '#93c5fd',
                            },
                            bgColor: 'rgba(59, 130, 246, 0.1)',
                            status: 'speaking'
                          }
                        }
                        
                        // 输出完成 - 绿色
                        return {
                          colors: {
                            c1: '#10b981',
                            c2: '#34d399',
                            c3: '#6ee7b7',
                          },
                          bgColor: 'rgba(16, 185, 129, 0.08)',
                          status: 'completed'
                        }
                      }
                      
                      const orbConfig = msg.role === 'assistant' ? getOrbColors() : null
                      
                      return (
                      <div key={i} className={cn(
                        "group w-full flex gap-4 transition-all duration-300",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}>
                        {/* 助手 Orb 球 */}
                        {msg.role === "assistant" && orbConfig && (
                          <div className="relative shrink-0 mt-1.5 w-[48px] h-[32px] flex items-center justify-center">
                            <style>{`
                              @keyframes orb-breathe {
                                0%, 100% { 
                                  transform: scale(1);
                                  opacity: 1;
                                }
                                50% { 
                                  transform: scale(1.08);
                                  opacity: 0.95;
                                }
                              }
                              
                              @keyframes orb-glow {
                                0%, 100% { 
                                  filter: drop-shadow(0 0 4px ${orbConfig.colors.c1}40) drop-shadow(0 0 8px ${orbConfig.colors.c2}20);
                                }
                                50% { 
                                  filter: drop-shadow(0 0 8px ${orbConfig.colors.c1}60) drop-shadow(0 0 12px ${orbConfig.colors.c2}30);
                                }
                              }
                            `}</style>
                            <div 
                              className="transition-all duration-700 ease-out"
                              style={{
                                animation: orbConfig.status === 'speaking' || orbConfig.status === 'executing' 
                                  ? `orb-breathe ${orbConfig.status === 'executing' ? '1.2s' : '1.5s'} ease-in-out infinite, orb-glow ${orbConfig.status === 'executing' ? '1.2s' : '1.5s'} ease-in-out infinite`
                                  : orbConfig.status === 'thinking'
                                  ? 'orb-glow 2s ease-in-out infinite'
                                  : 'none'
                              }}
                            >
                              <SiriOrb 
                                size="32px"
                                colors={orbConfig.colors}
                                animationDuration={
                                  orbConfig.status === 'executing' ? 3 : 
                                  orbConfig.status === 'thinking' ? 8 : 
                                  orbConfig.status === 'speaking' ? 4 : 12
                                }
                              />
                            </div>
                          </div>
                        )}
                        
                        <div className={cn(
                          "relative max-w-[85%] text-[16px] leading-[1.6]",
                          msg.role === "user"
                            ? "bg-[#f4f4f4] dark:bg-[#2f2f2f] text-zinc-900 dark:text-zinc-100 rounded-3xl px-5 py-2.5"
                            : "bg-transparent text-zinc-800 dark:text-zinc-200 px-0 py-1"
                        )}>
                          {/* 显示模型标签 */}
                          {msg.role === "assistant" && msg.model && (
                            <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                              <Sparkles size={12} className="text-purple-500" />
                              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                {msg.model === 'auto' ? '智能模型' :
                                 msg.model === 'qwen3.6-plus' ? 'Qwen3.6 Plus' :
                                 msg.model === 'qwen3.6-flash' ? 'Qwen3.6 Flash' :
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

                    {/* Agent Execution Chain - Live Status */}
                    {(agentSteps.length > 0 || agentStatus || isLoading) && (
                      <div className="w-full flex justify-start px-0 py-0 animate-in fade-in duration-300">
                          {agentSteps.length > 0 ? (
                            <AgentExecutionChain steps={agentSteps} isActive={isLoading} />
                          ) : (
                            <div className="flex items-center gap-4 px-3 py-6">
                              <div className="relative flex items-center justify-center">
                                <span className="absolute inline-flex size-6 animate-ping rounded-full bg-emerald-400 dark:bg-primary opacity-20"></span>
                                <span className="absolute inline-flex size-4 animate-pulse rounded-full bg-primary/40"></span>
                                <span className="relative inline-flex size-2 rounded-full bg-primary shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
                              </div>
                              {agentStatus && (
                                <span className="text-[14px] text-zinc-500 dark:text-zinc-400 font-medium tracking-tight animate-in fade-in slide-in-from-left-2 duration-700">
                                  {agentStatus}
                                  <span className="inline-flex ml-1">
                                    <span className="animate-[bounce_1.4s_infinite_0ms] opacity-60">.</span>
                                    <span className="animate-[bounce_1.4s_infinite_200ms] opacity-60">.</span>
                                    <span className="animate-[bounce_1.4s_infinite_400ms] opacity-60">.</span>
                                  </span>
                                </span>
                              )}
                            </div>
                          )}
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
                                  <span className="inline-block size-1.5 rounded-full bg-primary"></span>
                                  <span className="font-medium">系统托管</span>
                              </div>
                              <div className="w-px h-3 bg-zinc-300 dark:bg-zinc-600"></div>
                              <div className="flex items-center gap-3">
                                  <span>今日: <span className={cn("font-medium", (quotaInfo.daily_limit - quotaInfo.daily_usage) <= 0 ? "text-red-500" : "text-primary dark:text-emerald-400")}>{Math.max(0, quotaInfo.daily_limit - quotaInfo.daily_usage)}</span>/{quotaInfo.daily_limit}</span>
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
                                                        <div className="size-6 rounded bg-emerald-100 dark:bg-emerald-900/30 text-primary dark:text-emerald-400 flex items-center justify-center shrink-0">
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

                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    className={cn(
                                        "p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors group relative",
                                        (mandatorySkillsEnabled || selectedStoreSkillIds.length > 0)
                                            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                                            : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                    )}
                                    title="技能管理"
                                >
                                    <Library size={18} strokeWidth={2} className={cn(
                                        (mandatorySkillsEnabled || selectedStoreSkillIds.length > 0) && "fill-current"
                                    )} />
                                    {(mandatorySkillsEnabled || selectedStoreSkillIds.length > 0) && (
                                        <span className="absolute -top-0.5 -right-0.5 size-2 bg-blue-500 rounded-full border-2 border-white dark:border-zinc-900" />
                                    )}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0 rounded-2xl shadow-2xl border-zinc-200 dark:border-zinc-800" align="start" sideOffset={12}>
                                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-bold text-sm text-zinc-900 dark:text-white">AI 技能中心</h4>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setStoreOpen(true)}
                                            className="h-7 px-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                        >
                                            进入商店
                                        </Button>
                                    </div>
                                    <p className="text-[11px] text-zinc-500">管理助手的能力模块与行为逻辑</p>
                                </div>
                                <div className="p-2 space-y-4 max-h-[400px] overflow-y-auto">
                                    {/* Built-in Skills Group */}
                                    <div className="px-2 pt-2">
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                                            <div className="flex items-center gap-2.5">
                                                <div className="size-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900">
                                                    <Zap size={14} className="fill-current" />
                                                </div>
                                                <div>
                                                    <span className="text-[13px] font-bold block leading-none">系统核心技能</span>
                                                    <span className="text-[10px] text-zinc-500 mt-1 block">身份/风格/农业/设备</span>
                                                </div>
                                            </div>
                                            <Switch 
                                                checked={mandatorySkillsEnabled}
                                                onCheckedChange={setMandatorySkillsEnabled}
                                                className="scale-90 data-[state=checked]:bg-zinc-900 dark:data-[state=checked]:bg-zinc-100"
                                            />
                                        </div>
                                    </div>

                                    {/* Downloaded Skills */}
                                    <div className="px-2 pb-2">
                                        <div className="flex items-center gap-2 px-2 pb-2">
                                            <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800"></div>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2">已安装扩展</span>
                                            <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800"></div>
                                        </div>
                                        <div className="space-y-1">
                                            {installedStoreSkills.length > 0 ? installedStoreSkills.map((skill) => (
                                                <div 
                                                    key={skill.skill_id}
                                                    onClick={() => {
                                                        const isSelected = selectedStoreSkillIds.includes(skill.skill_id)
                                                        if (isSelected) {
                                                            setSelectedStoreSkillIds(prev => prev.filter(id => id !== skill.skill_id))
                                                        } else {
                                                            setSelectedStoreSkillIds(prev => [...prev, skill.skill_id])
                                                        }
                                                    }}
                                                    className={cn(
                                                        "group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200",
                                                        selectedStoreSkillIds.includes(skill.skill_id)
                                                            ? "bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 shadow-none hover:shadow-sm" 
                                                            : "hover:bg-zinc-50 dark:hover:bg-zinc-900 border border-transparent"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="text-xl shrink-0 group-hover:scale-110 transition-transform">{skill.icon}</div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className={cn(
                                                                "text-xs font-bold truncate pr-2",
                                                                selectedStoreSkillIds.includes(skill.skill_id) ? "text-blue-700 dark:text-blue-400" : "text-zinc-600 dark:text-zinc-400"
                                                            )}>{skill.name}</span>
                                                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate pr-2">{skill.description}</span>
                                                        </div>
                                                    </div>
                                                    <Switch 
                                                        checked={selectedStoreSkillIds.includes(skill.skill_id)}
                                                        onCheckedChange={(checked) => {
                                                            if (!checked) {
                                                                setSelectedStoreSkillIds(prev => prev.filter(id => id !== skill.skill_id))
                                                            } else {
                                                                setSelectedStoreSkillIds(prev => [...prev, skill.skill_id])
                                                            }
                                                        }}
                                                        className="scale-[0.8] data-[state=checked]:bg-blue-600 shrink-0"
                                                    />
                                                </div>
                                            )) : (
                                                <div className="py-8 text-center bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                                    <Library size={24} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-2 opacity-50" />
                                                    <p className="text-[10px] text-zinc-400 tracking-tight">前往商店探索更多技能</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 text-center">
                                    <p className="text-[9px] text-zinc-400">选择完成后，发送消息将携带相应技能上下文</p>
                                </div>
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
                          onClick={() => {
                            // 检查是否安装了搜索工具
                            const hasSearchTool = availableTools.some(t => 
                              t.name.includes('search') || 
                              t.name.includes('exa') || 
                              t.name.includes('brave')
                            )
                            
                            if (!hasSearchTool && !enableSearch) {
                              // 如果没有搜索工具且要开启搜索，显示提示
                              toast.error('未安装搜索工具', {
                                description: '请先在设置中安装 Exa Search 或 Brave Search 等 MCP 工具'
                              })
                              return
                            }
                            
                            setEnableSearch(!enableSearch)
                          }}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium select-none group",
                            enableSearch
                              ? "bg-emerald-50 dark:bg-emerald-900/20 text-primary dark:text-emerald-400"
                              : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                          title="联网搜索"
                        >
                          <Globe size={14} className={enableSearch ? "text-primary" : ""} />
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
                              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 group relative"
                              title="模式指示器"
                            >
                              {assistantMode === 'automation' && <Zap size={18} strokeWidth={2} className="text-primary fill-current" />}
                              {assistantMode === 'expert' && <Brain size={18} strokeWidth={2} className="text-purple-500" />}
                              {assistantMode === 'chat' && <MessageSquare size={18} strokeWidth={2} className="text-blue-500" />}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3" align="start" sideOffset={10}>
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm flex items-center gap-2">
                                {assistantMode === 'automation' && <><Zap size={16} className="text-primary fill-current" />自动化模式</>}
                                {assistantMode === 'expert' && <><Brain size={16} className="text-purple-500" />专家模式</>}
                                {assistantMode === 'chat' && <><MessageSquare size={16} className="text-blue-500" />对话模式</>}
                              </h4>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                {assistantMode === 'automation' && 'AI 将自动执行设备控制指令，无需确认。'}
                                {assistantMode === 'expert' && 'AI 将进行深度分析和多步骤推理，自动执行复杂任务。'}
                                {assistantMode === 'chat' && 'AI 将提供控制指令，您需要点击"执行"按钮确认后才会真正执行。'}
                              </p>
                              <div className="pt-2 text-xs text-zinc-400">
                                在顶部工具栏切换模式
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
            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-primary dark:text-emerald-400 flex items-center justify-center">
                    <Zap size={18} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 dark:text-white">工作室</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                      {studioTab === 'tools' ? (
                        <>
                          {studioData.length > 0 && studioData[studioData.length - 1].name.includes('weather') ? <Sun size={12} /> : 
                           studioData.length > 0 && studioData[studioData.length - 1].name.includes('spectrum') ? <Activity size={12} /> : 
                           <Globe size={12} />}
                          {studioData.length > 0 ? `正在处理: ${studioData[studioData.length - 1].name}...` : '等待工具执行...'}
                        </>
                      ) : (
                        <>
                          <Clock size={12} />
                          定时任务管理
                        </>
                      )}
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
              
              {/* 标签页切换 */}
              <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                <button
                  onClick={() => setStudioTab('tools')}
                  className={cn(
                    "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all",
                    studioTab === 'tools'
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Zap size={14} />
                    工具执行
                  </div>
                </button>
                <button
                  onClick={() => setStudioTab('tasks')}
                  className={cn(
                    "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all",
                    studioTab === 'tasks'
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Clock size={14} />
                    定时任务
                  </div>
                </button>
              </div>
            </div>

            {/* Studio Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50 dark:bg-[#09090B]">
              {studioTab === 'tools' ? (
                <div className="space-y-6">
                {/* AI 视觉巡检区域 */}
                <AnimatePresence mode="wait">
                  {visionInspectionUrl && (
                    <motion.div
                      key={visionInspectionUrl} // 添加 key 避免重复渲染导致闪烁
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }} // 添加退出动画
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="mb-6"
                    >
                    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200/50 dark:border-white/5 shadow-2xl shadow-black/5 dark:shadow-black/20">
                      {/* Background Gradient Accent */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-cyan-500/5 dark:from-primary/10 dark:to-cyan-500/5" />
                      
                      {/* Status Indicator Dot */}
                      <div className="absolute top-6 right-6 z-20">
                        <div className="size-3 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
                      </div>

                      <div className="relative p-6 space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                              <Camera className="size-5 text-primary" />
                              AI 视觉巡检
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                              {inspectionCamera === 'a' ? '温室摄像头 A' : '温室摄像头 B'}
                            </p>
                          </div>
                          
                          <div className="px-3 py-1.5 rounded-full bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30 flex items-center gap-2">
                            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-bold text-red-600 dark:text-red-400 tracking-wide uppercase">Live</span>
                          </div>
                        </div>

                        {/* Video Container */}
                        <div className="relative rounded-2xl overflow-hidden bg-black shadow-xl">
                          <div className="relative w-full h-[280px]">
                            {/* 视频流 */}
                            <LiveStreamPlayer
                              id="studio-vision-camera"
                              sources={[{ src: visionInspectionUrl }]}
                              autoplay
                              muted
                              controls={false}
                              className="w-full h-full object-cover"
                            />
                            
                            {/* 覆盖层渐变 */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
                          </div>
                        </div>

                        {/* Status Message */}
                        {visionInspectionStatus && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 p-4 backdrop-blur-sm"
                          >
                            <div className="flex items-center gap-3">
                              <Loader2 className="size-4 text-primary dark:text-emerald-400 animate-spin flex-shrink-0" />
                              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                {visionInspectionStatus}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                  )}
                </AnimatePresence>
                
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
                   studioData.map((data, idx) => {
                     // 判断是否是设备控制类型
                     const isDeviceControl = ['set_led', 'toggle_relay', 'control_camera'].includes(data.name)
                     
                     if (isDeviceControl) {
                       return (
                         <DeviceControlDisplay
                           key={idx}
                           toolName={data.name}
                           input={data.input}
                           result={data.result}
                           className="mb-4"
                         />
                       )
                     }
                     
                     // 其他工具使用原有的 MCPToolDisplay
                     return (
                       <MCPToolDisplay
                         key={idx}
                         toolName={data.name}
                         result={data.result?.error ? 'error' : 'success'}
                         input={data.input}
                         output={data.result?.error ? undefined : data.result}
                         errorText={data.result?.error}
                         className="mb-4"
                       />
                     )
                   })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-600 pt-20">
                     <Loader2 size={24} className="animate-spin mb-4" />
                     <p className="text-sm">等待工具执行结果...</p>
                  </div>
                )}
              </div>
              ) : (
                // 定时任务标签页
                <ScheduledTasksList />
              )}
            </div>
          </div>
        )}
      </div>
    </div>

      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl overflow-hidden p-0 border-0 shadow-2xl bg-white dark:bg-zinc-900">
           {/* Background Decoration */}
           <div className="absolute inset-0 z-0 pointer-events-none">
             <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/10 to-transparent" />
           </div>
           
           <DialogHeader className="pt-10 px-6 pb-2 relative z-10 flex flex-col items-center">
             <div className="relative mb-6">
               <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl transform scale-110" />
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
                    <div className="size-8 rounded-full bg-emerald-100 dark:bg-primary/20 flex items-center justify-center shrink-0">
                       <Sparkles size={14} className="text-primary dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                       <span className="text-sm font-semibold text-zinc-900 dark:text-white block">无限次对话</span>
                       <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">不再受每日额度限制，全天候陪伴</span>
                    </div>
                 </div>
                 <div className="w-full h-px bg-zinc-200/50 dark:bg-zinc-700/50" />
                 <div className="flex items-center gap-3.5">
                    <div className="size-8 rounded-full bg-emerald-100 dark:bg-primary/20 flex items-center justify-center shrink-0">
                       <Zap size={14} className="text-primary dark:text-emerald-400" />
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialog.open} onOpenChange={(open) => setDeleteConfirmDialog({ open, session: null })}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl overflow-hidden p-0 border-0 shadow-2xl bg-white dark:bg-zinc-900">
           {/* Background Decoration */}
           <div className="absolute inset-0 z-0 pointer-events-none">
             <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />
           </div>
           
           <DialogHeader className="pt-10 px-6 pb-2 relative z-10 flex flex-col items-center">
             <div className="relative mb-6">
               <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl transform scale-110" />
               <div className="relative size-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                 <Trash size={32} className="text-white" />
               </div>
             </div>

             <DialogTitle className="text-center text-xl font-bold text-zinc-900 dark:text-white">
               确认删除会话
             </DialogTitle>
             <DialogDescription className="text-center text-sm mt-3 text-zinc-500 dark:text-zinc-400 max-w-[280px] leading-relaxed">
               确定要删除会话 <span className="font-semibold text-zinc-700 dark:text-zinc-300">"{deleteConfirmDialog.session?.title}"</span> 吗？此操作无法撤销。
             </DialogDescription>
           </DialogHeader>

           <DialogFooter className="px-6 pb-8 pt-6 sm:justify-center relative z-10 flex-col sm:flex-col gap-3">
             <Button 
               onClick={async () => {
                 if (!deleteConfirmDialog.session) return
                 
                 try {
                   const res = await fetch(`/api/sessions/${deleteConfirmDialog.session.id}`, { method: 'DELETE' })
                   if (res.ok) {
                     setSessions(prev => prev.filter(s => s.id !== deleteConfirmDialog.session!.id))
                     if (sessionId === deleteConfirmDialog.session.id) {
                       await createNewSession()
                     }
                     setDeleteConfirmDialog({ open: false, session: null })
                   } else {
                     alert('删除失败，请重试')
                   }
                 } catch (err) {
                   console.error('Delete session error:', err)
                   alert('删除失败，请重试')
                 }
               }}
               className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300 rounded-2xl h-12 font-bold text-base"
             >
               确认删除
             </Button>
             <Button 
               variant="ghost" 
               onClick={() => setDeleteConfirmDialog({ open: false, session: null })}
               className="w-full text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-transparent text-sm font-medium"
             >
               取消
             </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

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
            className="fixed inset-0 z-[200] bg-white dark:bg-[#09090B] flex flex-col pt-12"
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

      {/* Unified Explore Overlay */}
      <AnimatePresence>
        {exploreOpen && (
          <UnifiedExplore onClose={() => setExploreOpen(false)} />
        )}
      </AnimatePresence>

      {/* AI Settings Dialog */}
      <AISettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSave={(settings) => {
          setAiSettings(settings)
        }}
        onVoiceSettingsChange={(voice) => {
          setIsTTSEnabled(voice.readAloud)
        }}
      />
    </>
  )
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
  toast.success("已复制到剪贴板")
}
