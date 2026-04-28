"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import type { UserPublic } from "@/lib/db/user-service"
import { Copy, RotateCcw, CircleHelp, CheckCircle2, AlertCircle, Loader2, Globe, FileText, Sun, Activity, Sprout, Zap, ArrowUpRight, Mic, Image as ImageIcon, Camera, Rocket, Trash, History, Home, Droplets, Thermometer, CalendarDays, User, MessageSquare, Bell, Monitor, Search, Menu, Plus, ArrowRight, ArrowUp, TrendingUp, BarChart3, Send, Sparkles, Smile, Settings } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import MermaidChart from "@/components/mermaid-chart"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import ChartRenderer from "@/components/chart-renderer"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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

import { MobileAISettingsModal } from "@/components/mobile-ai-settings-modal"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { cn } from "@/lib/utils"
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai/reasoning"
import { MonitorCard } from "@/components/ai/monitor-card"
import { DeviceBentoGrid } from "@/components/ai/device-bento-grid"
import { ControlBentoGrid } from "@/components/ai/control-bento-grid"
import { ScheduleCard } from "@/components/ai/schedule-card"
import { ScheduledTasksList } from "@/components/ai/scheduled-tasks-list"
import { MobileBackground } from "@/components/mobile-background"
import { useDraggableScroll } from "@/lib/hooks/use-draggable-scroll"
import ToolUsageIndicator from "@/components/ui/tool-usage-indicator"
import QwenVoiceInput from "@/components/ui/qwen-voice-input"
import { CitationGroup } from "@/components/ai/citation-group"

// ... (Interfaces)
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

export default function AIAssistantIOSPage() {
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
  const [sheetOpen, setSheetOpen] = useState(false)
  const [enableSearch, setEnableSearch] = useState(false)
  const [enableReasoning, setEnableReasoning] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [attachments, setAttachments] = useState<string[]>([])
  
  // Quota state
  const [quotaInfo, setQuotaInfo] = useState<{ daily_limit: number, daily_usage: number, balance: number } | null>(null)
  const [showPlanDialog, setShowPlanDialog] = useState(false)

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

  // Stickers
  const stickers = Array.from({ length: 20 }, (_, i) => `/images/sticker/sticker (${i + 1}).png`)
  
  const mainScrollRef = useDraggableScroll<HTMLDivElement>()
  const tagsScrollRef = useDraggableScroll<HTMLDivElement>()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const { deviceData } = useDeviceData()
  const { weatherData } = useWeatherContext()
  const [notices, setNotices] = useState<{ id: number; title: string; description?: string; variant?: 'loading'|'success'|'error'; expanded: boolean }[]>([])
  const noticeIdCounter = useRef(0)
  
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

  const toggleNoticeExpanded = (id: number) => {
    setNotices(prev => prev.map(n => n.id === id ? { ...n, expanded: !n.expanded } : n))
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
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading, autoScroll])

  const executeCommands = async (commands: any[]) => {
    if (!commands || commands.length === 0) return
    showNotice("正在执行指令...", `共发现 ${commands.length} 个操作`, "loading")

    for (const cmd of commands) {
      try {
        if (cmd.action === "set_led") {
          const res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set_led', r: cmd.r, g: cmd.g, b: cmd.b })
          })
          if (res.ok) {
            showNotice("调控成功 ✅", `已开启补光灯 (R:${cmd.r} G:${cmd.g} B:${cmd.b})`, "success")
          } else {
            let err = ''
            try { const j = await res.json(); err = j?.error || '' } catch {}
            showNotice("调控失败", err || `请求错误 ${res.status}`, "error")
          }
        } else if (cmd.action === "toggle_relay") {
          const res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_relay', device: cmd.device, value: cmd.value })
          })
          if (res.ok) {
            showNotice("开关执行成功 ✅", `设备 ${cmd.device} 状态 ${cmd.value === 1 ? '开启' : '关闭'}`, "success")
          } else {
            let err = ''
            try { const j = await res.json(); err = j?.error || '' } catch {}
            showNotice("开关执行失败", err || `请求错误 ${res.status}`, "error")
          }
        }
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (e) {
        console.error("Command execution error", e)
      }
    }
  }

  const handleSend = async (overrideText?: any) => {
    // Check if overrideText is a sticker URL (starts with /images/sticker/)
    const isSticker = typeof overrideText === "string" && overrideText.startsWith("/images/sticker/")
    const text = typeof overrideText === "string" ? overrideText : input
    
    if ((!text.trim() && !isSticker) || isLoading) return
    
    // Check if system managed mode (no custom key/url)
    const isSystemMode = !aiSettings?.apiKey && !aiSettings?.apiUrl;
    const isCustomMode = !!aiSettings?.apiKey || !!aiSettings?.apiUrl;
    
    // Only block if neither system mode nor custom mode (which shouldn't happen if aiSettings is null, but we check)
    // Actually if aiSettings is null, we prompt settings.
    if (!aiSettings) { setSettingsOpen(true); return }
    
    // If custom mode is set but key is missing (e.g. only model set?), check key
    if (isCustomMode && !aiSettings.apiKey && !aiSettings.apiUrl) {
         setSettingsOpen(true); return 
    }

    const userMsg = text.trim()
    if (!isSticker) setInput("")
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

    let userMessageContent: Message['content']
    
    if (isSticker) {
        userMessageContent = [
            { type: "image_url", image_url: { url: userMsg } }
        ]
    } else {
        userMessageContent = attachments.length > 0 
        ? [
            { type: "text", text: userMsg },
            ...attachments.map(url => ({ type: "image_url" as const, image_url: { url } }))
            ]
        : userMsg
    }

    if (!isSticker && (userMsg === "是" || userMsg === "执行")) {
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

    const newMessages: Message[] = [...messages, { role: "user", content: userMessageContent }]
    setMessages(newMessages)
    setIsLoading(true)
    setAutoScroll(true)
    const currentAttachments = [...attachments]
    setAttachments([])

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
          deviceData,
          weatherData
        })
      })

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
                assistantMsg.content = (typeof assistantMsg.content === "string" ? assistantMsg.content : "") + content
                
                const combined = typeof assistantMsg.content === "string" ? assistantMsg.content : ""
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
                    reasoning: { text: reasoningText, durationMs: Date.now() - startTs }
                  }
                  return newMsgs
                })
              }
            } catch {}
          }
        }
      }
      
      if (ensuredSessionId) {
         const lastMsg = { ...assistantMsg, reasoning: { text: reasoningText, durationMs: Date.now() - startTs } }
         await fetch(`/api/sessions/${ensuredSessionId}`, { 
           method: "PUT", 
           headers: { "Content-Type": "application/json" }, 
           body: JSON.stringify({ messages: [...newMessages, lastMsg] }) 
        })
      }

    } catch (e) {
      console.error("Chat error:", e)
      setMessages(prev => [...prev, { role: "assistant", content: "抱歉，发生了一些错误，请稍后再试。" }])
    } finally {
      setIsLoading(false)
      setTimeout(() => setIsLoading(false), 100)
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
        setSheetOpen(false)
      }
    } catch {}
  }

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id))
        if (sessionId === id) {
          setSessionId("")
          setMessages([])
          createNewSession()
        }
        showNotice("会话已删除", undefined, "success")
      }
    } catch {}
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
  
  const handleSettingsSave = (settings: AISettings) => {
    setAiSettings(settings)
    localStorage.setItem("ai-settings", JSON.stringify(settings))
    setSelectedModel(settings.model)
  }

  const renderMessageContent = (msg: Message) => {
    const content = msg.content
    if (Array.isArray(content)) {
      return (
        <div className="space-y-2">
          {content.map((part, i) => (
            <div key={i}>
              {part.type === 'image_url' && part.image_url && (
                <div className="relative w-full max-w-[300px] h-auto rounded-lg overflow-hidden border border-border my-2">
                   <Image src={part.image_url.url} alt="User upload" width={300} height={200} className="object-cover w-full h-auto" />
                </div>
              )}
              {part.type === 'text' && part.text && renderTextContent(part.text)}
            </div>
          ))}
        </div>
      )
    }
    return renderTextContent(content)
  }

  const renderTextContent = (content: string) => {
    const parts = content.split(/(<\s*CHART\s+type="echarts"\s*>[\s\S]*?<\/\s*CHART\s*>|<\s*CHART\s+type="vega-lite"\s*>[\s\S]*?<\/\s*CHART\s*>|<\s*REASONING\s*>[\s\S]*?(?:<\/\s*REASONING\s*>|$)|<\s*SOURCES\s*>[\s\S]*?<\/\s*SOURCES\s*>|<\s*MONITOR\s*>[\s\S]*?(?:<\/\s*MONITOR\s*>|$)|<\s*TASKS\s*>[\s\S]*?<\/\s*TASKS\s*>|<\s*DEVICE_BENTO\s*(?:>[\s\S]*?(?:<\/\s*DEVICE_BENTO\s*>|$)|(?:\/>))|<\s*CONTROL_BENTO\s*(?:>[\s\S]*?(?:<\/\s*CONTROL_BENTO\s*>|$)|(?:\/>))|<\s*TASK_LIST\s*(?:>[\s\S]*?(?:<\/\s*TASK_LIST\s*>|$)|(?:\/>))|<\s*TOOL_USED\s+[^>]*(?:\/>|>[\s\S]*?<\/\s*TOOL_USED\s*>))/g)

    return (
      <>
        {parts.map((part, index) => {
          if (part.match(/^<\s*TOOL_USED/)) {
            // ⚠️ 安全警告：AI 不应该手动输出 TOOL_USED 标签
            // 真实的工具调用会通过系统的 tool_calls 接口处理
            // 这里忽略 AI 手动输出的 TOOL_USED 标签，防止假装调用工具
            console.warn('[Security] AI attempted to manually output TOOL_USED tag, ignoring')
            return null
          }
          if (part.match(/^<\s*TASK_LIST/)) return <div key={index} className="my-6"><ScheduledTasksList /></div>
          if (part.match(/^<\s*CONTROL_BENTO/)) return <div key={index} className="my-6"><ControlBentoGrid /></div>
          if (part.match(/^<\s*DEVICE_BENTO/)) return <div key={index} className="my-6"><DeviceBentoGrid /></div>
          if (part.match(/^<\s*MONITOR/)) return <div key={index} className="flex justify-center my-4"><MonitorCard /></div>

          if (part.match(/^<\s*TASKS/)) {
            try {
              const jsonStr = part.replace(/<\s*TASKS\s*>/, '').replace(/<\/\s*TASKS\s*>/, '').trim()
              const tasks = JSON.parse(jsonStr) as TaskModel[]
              if (!tasks || tasks.length === 0) return null
              return (
                <div key={index} className="my-4 space-y-4">
                  {tasks.map((task, i) => (
                    <div key={i} className="bg-white rounded-lg border border-border overflow-hidden shadow-sm">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-medium text-sm text-gray-900">{task.title}</h3>
                        <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide", task.status === 'completed' ? "bg-green-100 text-green-700" : task.status === 'in_progress' ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground")}>
                          {task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '进行中' : '待处理'}
                        </div>
                      </div>
                      <div className="p-0">
                        {task.items.map((item, j) => (
                           <div key={j} className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                             <div className="mt-0.5 shrink-0 text-muted-foreground">
                               {item.type === 'file' ? <FileText size={16} /> : <CheckCircle2 size={16} className={cn(task.status === 'completed' ? "text-green-500" : "")} />}
                             </div>
                             <div className="flex-1 text-sm text-muted-foreground">
                               {item.text}
                               {item.file && (
                                 <div className="mt-2 flex items-center gap-2 p-2 bg-muted rounded-md border border-border w-fit">
                                    <div className="text-xs font-medium text-gray-700">{item.file.name}</div>
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
            } catch { return null }
          }

          if (part.match(/^<\s*CHART/)) {
            try {
              const isVegaLite = part.includes('type="vega-lite"')
              const tagStartRegex = isVegaLite ? /<\s*CHART\s+type="vega-lite"\s*>/ : /<\s*CHART\s+type="echarts"\s*>/
              const jsonStr = part.replace(tagStartRegex, '').replace(/<\/\s*CHART\s*>/, '').trim()
              const data = JSON.parse(jsonStr)
              return (
                <div key={index} className="my-4 w-full min-w-[300px] h-[300px] rounded-lg overflow-hidden bg-white relative z-10 border border-gray-100 shadow-sm">
                  <ChartRenderer options={data} type={isVegaLite ? 'vega-lite' : 'echarts'} style={{ height: '100%', width: '100%' }} />
                </div>
              )
            } catch { return null }
          }

          if (part.match(/^<\s*REASONING/)) {
             const reasoningText = part.replace(/<\s*REASONING\s*>/, '').replace(/<\/\s*REASONING\s*>/, '').trim()
             const isStreaming = !part.match(/<\/\s*REASONING\s*>/)
             if (!reasoningText && !isStreaming) return null
             return (
               <Reasoning key={index} isStreaming={isStreaming} className="mb-4">
                 <ReasoningTrigger />
                 <ReasoningContent>
                   <ReactMarkdown remarkPlugins={[remarkGfm]}>{reasoningText}</ReactMarkdown>
                 </ReasoningContent>
               </Reasoning>
             )
          }

          if (part.match(/^<\s*SOURCES/)) {
            try {
              const jsonStr = part.replace(/<\s*SOURCES\s*>/, '').replace(/<\/\s*SOURCES\s*>/, '').trim()
              const sources = JSON.parse(jsonStr) as Array<{ title: string, url: string, number: number | string }>
              if (!sources || sources.length === 0) return null
              return <CitationGroup key={index} sources={sources.map(s => ({ ...s, number: String(s.number) }))} />
            } catch { return null }
          }

          if (!part.trim()) return null

          const commands: any[] = []
          const matches = part.matchAll(/```json\s*([\s\S]*?)```/g)
          for (const match of matches) {
             try {
                const json = JSON.parse(match[1])
                if (json.action === 'toggle_relay' || json.action === 'set_led') commands.push(json)
             } catch {}
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
                      if (!inline && isMermaid) return <MermaidChart chart={String(children).replace(/\n$/, '')} />
                      if (!inline && (!language || language === 'json')) {
                        try {
                          const content = String(children).replace(/\n$/, '')
                          if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
                            const data = JSON.parse(content)
                            if (data.action === 'schedule_task') return <ScheduleCard data={data} />
                            if (data && (data.series || (data.xAxis && data.yAxis))) {
                              return (
                                <div className="my-4 w-full min-w-[300px] h-[300px] rounded-lg overflow-hidden bg-white relative z-10 border border-gray-100 shadow-sm">
                                  <ChartRenderer options={data} type="echarts" style={{ height: '100%', width: '100%' }} />
                                </div>
                              )
                            }
                          }
                        } catch {}
                      }
                       return <code className={cn("bg-muted rounded px-1 font-mono text-sm text-gray-800 font-semibold", className)} {...props}>{children}</code>
                    },
                    pre: ({ node, children, ...props }: any) => <pre className="bg-gray-50 p-3 rounded-lg overflow-x-auto my-2 border border-border" {...props}>{children}</pre>
                  }}
                >
                  {part}
                </ReactMarkdown>
                
                {commands.length > 0 && (
                   <div className="mt-3 mb-4">
                      <button 
                        onClick={() => executeCommands(commands)}
                        className="group relative flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 overflow-hidden"
                      >
                         <div className="absolute inset-0 bg-white/20 group-hover:translate-x-[100%] transition-transform duration-700 -skew-x-12 -translate-x-[100%]"></div>
                         <Zap size={18} className="animate-pulse" />
                         <div className="flex flex-col items-start">
                           <span className="text-sm font-bold leading-none">立即执行指令</span>
                           <span className="text-sm opacity-80 font-mono mt-0.5">执行 {commands.length} 个指令</span>
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

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-[#0B1121] text-foreground overflow-hidden font-sans transition-colors duration-500 flex flex-col fixed inset-0">
      <MobileBackground />
      
      {/* Immersive Background Header (Fixed) - Modern Glassmorphism Style */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: messages.length > 0 ? 0 : 1, y: messages.length > 0 ? -40 : 0 }}
        transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
        className={cn(
          "fixed top-0 left-0 right-0 h-[45vh] z-0 pointer-events-none",
          messages.length > 0 && "pointer-events-none"
        )}
      >
         {/* Background Layer - Clean Gradient */}
         <div className="absolute inset-0 overflow-hidden bg-[#E3F9EC]">
            {/* Soft Ambient Gradients */}
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-100/40 rounded-full blur-[100px] mix-blend-multiply" 
            />
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-emerald-100/40 rounded-full blur-[100px] mix-blend-multiply" 
            />
            <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-cyan-50/60 rounded-full blur-[80px] mix-blend-overlay" />
            
            {/* Subtle Texture */}
            <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%2334d399\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
         </div>

         {/* Content Wrapper */}
         <div className="relative h-full flex flex-col pt-32 px-8 pb-12 z-10">
            {/* Title Section */}
            <div className="relative z-20">
               <motion.h2 
                 initial={{ opacity: 0, x: -30 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                 className="text-slate-800 dark:text-slate-900 text-[2.8rem] font-black leading-none tracking-tight" 
                 style={{ fontFamily: 'DingTalkJinBuTi, sans-serif' }}
               >
                  莓小智
               </motion.h2>
               <motion.div 
                 initial={{ opacity: 0, x: -30 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                 className="flex items-center gap-2 mt-1"
               >
                  <div className="h-1 w-8 bg-slate-800 rounded-full" />
                  <span className="text-xl font-medium text-slate-600 tracking-widest uppercase" style={{ fontFamily: 'DingTalkJinBuTi, sans-serif' }}>MeiX</span>
               </motion.div>
            </div>
            
            {/* Modern Glass Bubble */}
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5, type: "spring", stiffness: 100 }}
              className="mt-8 ml-2 max-w-[65%] relative z-20"
            >
               <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-5 rounded-2xl rounded-tl-none shadow-xl shadow-emerald-500/5 relative group cursor-default hover:scale-[1.02] transition-transform">
                   {/* Glass Reflection */}
                   <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/60 to-transparent opacity-50 rounded-t-2xl pointer-events-none" />
                   
                   <p className="text-slate-700 text-sm font-bold leading-relaxed relative z-10" style={{ fontFamily: 'DingTalkJinBuTi, sans-serif' }}>
                      你好，我是<span className="text-primary">莓小智</span>，你的智慧农业环境管家。
                   </p>
                   
                   {/* Tail */}
                   <div className="absolute -top-[8px] left-0 w-4 h-4 bg-white/80 backdrop-blur-xl border-t border-l border-white/60 transform rotate-45 skew-x-12" />
               </div>
            </motion.div>
         </div>

         {/* IP Image - Large & Breaking Bounds */}
         <motion.div 
           initial={{ opacity: 0, x: 50, rotate: 10 }}
           animate={{ opacity: 1, x: 0, rotate: 0 }}
           transition={{ duration: 0.8, delay: 0.3, type: "spring", bounce: 0.4 }}
           className="absolute -right-12 bottom-0 w-[22rem] h-[22rem] z-10 pointer-events-none"
         >
            <Image 
               src="/ip/sayhi.png" 
               alt="IP" 
               fill 
               className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)] scale-110 origin-bottom-right" 
               priority 
            />
         </motion.div>
      </motion.div>

      {/* Header (Top Bar) */}
      <div className="fixed top-0 left-0 right-0 z-40 px-6 pt-14 pb-2 pointer-events-none">
        <div className="flex justify-between items-start pointer-events-auto">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className={cn(
                "hover:opacity-70 transition-all p-2 -ml-2 rounded-full",
                messages.length === 0 ? "text-white hover:bg-white/20" : "text-slate-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/10"
              )}>
                <Menu size={28} strokeWidth={1.5} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-2xl border-r border-white/20">
               <SheetHeader className="sr-only">
                 <SheetTitle>Menu</SheetTitle>
               </SheetHeader>
               <div className="flex flex-col h-full">
                 <div className="p-6 pb-4">
                    <button onClick={() => createNewSession()} className="w-full flex items-center gap-3 px-4 py-3.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-[1.2rem] transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                       <Plus size={20} strokeWidth={2.5} />
                       <span className="font-semibold tracking-wide">新建对话</span>
                    </button>
                 </div>
                 <div className="flex-1 overflow-y-auto px-3 pb-6">
                   <div className="space-y-1">
                      {sessions.map(s => (
                          <div key={s.id} onClick={() => { setSessionId(s.id); setSheetOpen(false) }} className={cn("px-4 py-3 rounded-xl cursor-pointer text-sm transition-all", sessionId === s.id ? "bg-black/5 dark:bg-white/10 text-slate-900 dark:text-white font-medium" : "text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5")}>
                              {s.title}
                          </div>
                      ))}
                   </div>
                 </div>
                 <div className="p-4 border-t border-black/5 dark:border-white/5 flex items-center gap-3">
                    <Avatar className="size-9 ring-2 ring-white/20"><AvatarImage src={user?.avatar_url || undefined} /><AvatarFallback>U</AvatarFallback></Avatar>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{user?.username}</div>
                 </div>
               </div>
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setSettingsOpen(true)}
               className={cn(
                 "p-2 rounded-full transition-all active:scale-95",
                 messages.length === 0 ? "text-white hover:bg-white/20" : "text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10"
               )}
             >
               <Settings size={22} strokeWidth={2} />
             </button>
             <div className={cn(
               "size-10 rounded-full flex items-center justify-center font-medium text-sm border transition-all",
               messages.length === 0 ? "bg-white/20 text-white border-white/30 backdrop-blur-md" : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 border-black/5 dark:border-white/10"
             )}>
                {user?.username?.[0]?.toUpperCase() || 'U'}
             </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10 min-h-0">
         <div ref={mainScrollRef} className="flex-1 h-full overflow-y-auto scrollbar-hide">
           {messages.length === 0 ? (
              <div className="min-h-full flex flex-col">
                 {/* Transparent Spacer for Immersive Header */}
                 <div className="h-[40vh] w-full flex-shrink-0" />
                 
                 {/* White/Glass Sheet Content */}
                 <div className="flex-1 bg-slate-50/95 dark:bg-[#0B1121]/95 backdrop-blur-xl rounded-t-[2.5rem] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] px-6 pt-8 pb-32 animate-in slide-in-from-bottom-12 duration-700">
                    {/* Quick Actions - Sophisticated Glass Cards */}
                    <div>
                       <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 px-1">快速操作</h3>
                       <motion.div 
                         className="flex gap-4 overflow-x-auto pb-8 -mx-6 px-6 scrollbar-hide snap-x snap-mandatory"
                         initial="hidden"
                         animate="visible"
                         variants={{
                           visible: { transition: { staggerChildren: 0.1 } }
                         }}
                       >
                          {[
                            { label: "环境分析", sub: "环境分析", action: "分析当前大棚环境数据", ipImage: "/ip/智慧农业3D图标-数据监测-细线版.png", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
                            { label: "设备检查", sub: "设备检查", action: "检查所有设备运行状态", ipImage: "/ip/智慧农业3D图标-无人机巡检-细线版.png", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
                            { label: "病害咨询", sub: "病害咨询", action: "草莓常见病害有哪些？", ipImage: "/ip/智慧农业3D图标-作物检测-细线版.png", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
                            { label: "生长建议", sub: "生长建议", action: "现在是草莓开花期，有什么建议？", ipImage: "/ip/智慧农业3D图标-浇水灌溉-细线版.png", color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
                            { label: "数据报告", sub: "数据报告", action: "生成本周环境数据报告", ipImage: "/ip/智慧农业3D图标-数据监测-细线版.png", color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
                          ].map((item, i) => (
                             <motion.button 
                                key={i} 
                                variants={{
                                  hidden: { opacity: 0, x: 50 },
                                  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
                                }}
                                onClick={() => handleSend(item.action)}
                                className={`flex-shrink-0 snap-center w-36 h-40 rounded-[2rem] p-0 flex flex-col justify-between shadow-lg shadow-slate-200/50 dark:shadow-none relative group active:scale-95 transition-all duration-300 hover:-translate-y-1`}
                             >
                                {/* Inner Card Body (Clipped for Glass Effect) */}
                                <div className={`absolute inset-0 rounded-[2rem] bg-white/60 dark:bg-white/5 backdrop-blur-xl border ${item.border} overflow-hidden`}>
                                   <div className={`absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50`} />
                                   <div className={`absolute top-0 right-0 w-24 h-24 ${item.bg} blur-3xl rounded-full -mr-10 -mt-10 transition-opacity opacity-50 group-hover:opacity-80`} />
                                </div>
                                
                                {/* Content Layer (Not Clipped) */}
                                <div className="relative z-10 w-full h-full p-5 flex flex-col justify-between">
                                   <div>
                                      <div className="text-slate-900 dark:text-white font-bold text-xl leading-tight tracking-tight text-left">{item.label}</div>
                                      <div className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium text-left">{item.sub}</div>
                                   </div>
                                   
                                   {/* IP Image - Breaking Bounds with Floating Animation */}
                                   <motion.div 
                                     animate={{ y: [0, -5, 0] }}
                                     transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                                     className={`absolute -bottom-9 -right-9 transition-transform duration-300 group-hover:scale-110`}
                                   >
                                      <Image 
                                         src={item.ipImage} 
                                         alt={item.label} 
                                         width={140} 
                                         height={140} 
                                         className="object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.2)]"
                                      />
                                   </motion.div>
                                </div>
                             </motion.button>
                          ))}
                       </motion.div>
                    </div>

                    {/* FAQ - Vision Pro Glass Capsules */}
                    <div>
                       <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 px-1">常见问题</h3>
                       <motion.div 
                         className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide snap-x snap-mandatory"
                         initial="hidden"
                         animate="visible"
                         variants={{
                           visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } }
                         }}
                       >
                          {[
                            "输入关于草莓种植的问题?",
                            "您知道的草莓种植病害咨询吗?",
                            "为什么凭环境感知...",
                            "如何提高草莓甜度?"
                          ].map((q, i) => (
                             <motion.button 
                                key={i}
                                variants={{
                                  hidden: { opacity: 0, x: 50 },
                                  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
                                }}
                                onClick={() => handleSend(q)}
                                className="snap-center flex-shrink-0 bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[1.5rem] p-5 w-44 text-left hover:bg-white/80 dark:hover:bg-white/10 transition-all shadow-lg shadow-slate-200/50 dark:shadow-none group active:scale-95"
                             >
                                <p className="text-slate-700 dark:text-slate-200 text-sm font-medium leading-relaxed line-clamp-3 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                   {q}
                                </p>
                                <div className="mt-4 flex justify-center">
                                   <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-slate-300/50 dark:border-t-white/20" />
                                </div>
                             </motion.button>
                          ))}
                       </motion.div>
                    </div>
                 </div>
              </div>
           ) : (
              <div className="px-4 pt-24 pb-24 flex flex-col gap-6">
                <AnimatePresence initial={false}>
                  {messages.map((msg, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      layout
                      className={cn(
                        "flex gap-3",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="size-10 flex-shrink-0 rounded-full overflow-hidden bg-emerald-100/50 dark:bg-emerald-900/20 border border-white/20 mt-1 shadow-sm backdrop-blur-md relative">
                          <Image src="/ip/ip_chat_avatar.png" alt="AI" fill className="object-cover scale-110 translate-y-1" />
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[85%] min-w-0 break-words rounded-[1.5rem] px-5 py-3.5 text-sm leading-relaxed shadow-sm backdrop-blur-md transition-all",
                        msg.role === "user" 
                          ? "bg-blue-600/90 text-white rounded-tr-sm shadow-blue-500/20 border border-blue-500/20" 
                          : "bg-white/60 dark:bg-[#1A1A1A]/60 text-slate-800 dark:text-slate-200 border border-white/40 dark:border-white/5 rounded-tl-sm shadow-sm"
                      )}>
                        <div className={cn("prose prose-sm max-w-none break-words", msg.role === "user" ? "prose-invert" : "dark:prose-invert")}>
                          {renderMessageContent(msg)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.8 }}
                     className="flex gap-3"
                   >
                      <div className="size-10 flex-shrink-0 rounded-full overflow-hidden bg-emerald-100/50 dark:bg-emerald-900/20 border border-white/20 mt-1 shadow-sm backdrop-blur-md relative">
                        <Image src="/ip/ip_chat_avatar.png" alt="AI" fill className="object-cover scale-110 translate-y-1" />
                      </div>
                      <div className="bg-white/60 dark:bg-[#1A1A1A]/60 backdrop-blur-md border border-white/40 dark:border-white/5 rounded-[1.5rem] rounded-tl-sm px-5 py-4 flex items-center gap-1.5 shadow-sm">
                         <span className="size-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                         <span className="size-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                         <span className="size-2 bg-slate-400 rounded-full animate-bounce"></span>
                      </div>
                   </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
           )}
         </div>
         
         {/* Chat Input - Floating above Bottom Nav */}
         <div className="fixed bottom-[6.5rem] left-6 right-6 z-50">
            {/* Top Bar: Model Selector + Quota Display */}
            <div className="absolute -top-10 left-0 right-0 flex justify-center items-center pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-500 gap-2">
                <div className="pointer-events-auto shadow-sm">
                    <PromptInputModelSelect value={selectedModel || aiSettings?.model || ""} onValueChange={(v) => { setSelectedModel(v); if (aiSettings) handleSettingsSave({ ...aiSettings, model: v }) }}>
                        <PromptInputModelSelectTrigger className="h-8 px-3 bg-white/90 dark:bg-black/60 backdrop-blur-md rounded-full border border-border dark:border-white/10 flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-black/80 transition-all shadow-sm ring-0 focus:ring-0 outline-none">
                            <Sparkles size={12} className="text-purple-500" />
                            <span>{selectedModel === "auto" || !selectedModel ? "智能模式" : selectedModel}</span>
                            <ArrowUp size={10} className="opacity-50" />
                        </PromptInputModelSelectTrigger>
                        <PromptInputModelSelectContent className="w-[240px]">
                            <PromptInputModelSelectItem value="auto"><span className="flex items-center gap-2"><Sparkles className="size-3 text-purple-500" /> 智能模式 (Auto)</span></PromptInputModelSelectItem>
                            <PromptInputModelSelectItem value="qwen3.6-plus"><span className="flex items-center gap-2">🚀 Qwen3.6 Plus</span></PromptInputModelSelectItem>
                            <PromptInputModelSelectItem value="qwen3.6-flash"><span className="flex items-center gap-2">⚡ Qwen3.6 Flash</span></PromptInputModelSelectItem>
                            <PromptInputModelSelectItem value="qwen3-max-2026-01-23"><span className="flex items-center gap-2">🧠 Qwen3 Max</span></PromptInputModelSelectItem>
                            <PromptInputModelSelectItem value="deepseek-v3.2"><span className="flex items-center gap-2">🤖 DeepSeek V3.2</span></PromptInputModelSelectItem>
                        </PromptInputModelSelectContent>
                    </PromptInputModelSelect>
                </div>

                {(!aiSettings?.apiKey && !aiSettings?.apiUrl && quotaInfo) && (
                    <div className="flex items-center gap-3 bg-white/90 dark:bg-black/60 backdrop-blur-md px-3 h-8 rounded-full border border-border dark:border-white/10 shadow-sm text-xs text-muted-foreground dark:text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block size-1.5 rounded-full bg-primary"></span>
                            <span>系统托管</span>
                        </div>
                        <div className="w-px h-3 bg-gray-300 dark:bg-gray-600"></div>
                        <div className="flex items-center gap-3">
                            <span className={cn("font-medium", (quotaInfo.daily_limit - quotaInfo.daily_usage) <= 0 ? "text-red-500" : "text-primary dark:text-emerald-400")}>
                                {Math.max(0, quotaInfo.daily_limit - quotaInfo.daily_usage)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="relative bg-white/75 dark:bg-[#1e1e1e]/75 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[2rem] flex items-center p-1.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] transition-all focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:bg-white/90 dark:focus-within:bg-[#1e1e1e]/90 focus-within:scale-[1.02] duration-300">
               <button className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-3 transition-colors active:scale-90 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                  <Mic size={22} strokeWidth={2} />
               </button>
               
               <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-3 transition-colors active:scale-90 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                        <Smile size={22} strokeWidth={2} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-80 p-0 bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-xl border-white/20 shadow-xl rounded-2xl overflow-hidden">
                     <div className="p-4 grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                        {stickers.map((url, i) => (
                           <button 
                             key={i} 
                             onClick={() => handleSend(url)}
                             className="aspect-square relative hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors active:scale-90"
                           >
                              <Image src={url} alt={`Sticker ${i+1}`} fill className="object-contain p-1" />
                           </button>
                        ))}
                     </div>
                  </PopoverContent>
               </Popover>

               {/* Voice Input and Text Input */}
               <div className="flex-1 space-y-2">
                 <QwenVoiceInput
                   onTranscript={(text) => {
                     setInput(prev => prev + (prev ? ' ' : '') + text)
                   }}
                   onError={(error) => {
                     console.error('Voice recognition error:', error)
                   }}
                   className="w-full"
                   placeholder="支持台州话等多种方言识别"
                 />
                 
                 <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="输入关于草莓种植的问题..."
                    className="bg-transparent border-0 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 w-full text-base px-2 h-10 font-medium"
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                 />
               </div>
               
               <button 
                 onClick={() => handleSend()} 
                 className={cn(
                   "p-3 rounded-full transition-all duration-300 active:scale-90 ml-1",
                   input.trim() 
                     ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-100" 
                     : "bg-slate-100 dark:bg-white/10 text-slate-300 dark:text-slate-600 scale-95"
                 )}
                 disabled={!input.trim()}
               >
                  <Send size={20} strokeWidth={2.5} className={cn(input.trim() && "translate-x-0.5 translate-y-[-1px]")} />
               </button>
            </div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onSelectFiles} />
         </div>
      </div>

      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl overflow-hidden p-0 border-0 shadow-2xl bg-white dark:bg-zinc-900">
           {/* Background Decoration */}
           <div className="absolute inset-0 z-0 pointer-events-none">
             <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/10 to-transparent" />
             <div className="absolute -top-10 -right-10 size-40 bg-primary/10 rounded-full blur-3xl" />
             <div className="absolute -top-10 -left-10 size-40 bg-teal-500/10 rounded-full blur-3xl" />
           </div>
           
           <DialogHeader className="pt-10 px-6 pb-2 relative z-10 flex flex-col items-center">
             {/* IP Avatar Container */}
             <div className="relative mb-6">
               <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl transform scale-110" />
               <div className="relative size-24 rounded-full border-4 border-white dark:border-zinc-800 shadow-xl overflow-hidden bg-emerald-50 dark:bg-emerald-900/20">
                  <Image 
                    src="/icon.png" 
                    alt="AI Assistant" 
                    fill 
                    className="object-cover scale-110" 
                  />
               </div>
               <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-800 rounded-full p-1.5 shadow-md">
                 <div className="bg-amber-400 rounded-full p-1">
                   <Zap size={12} className="text-white fill-white" />
                 </div>
               </div>
             </div>

             <DialogTitle className="text-center text-xl font-bold text-slate-900 dark:text-white">
               今日额度已耗尽
             </DialogTitle>
             <DialogDescription className="text-center text-sm mt-3 text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed">
               小助手今天已经陪您聊了很久啦，休息一下或者升级专业版继续畅聊吧～
             </DialogDescription>
           </DialogHeader>

           <div className="px-6 py-4 relative z-10">
              <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-slate-100 dark:border-white/5 space-y-4">
                 <div className="flex items-center gap-3.5">
                    <div className="size-8 rounded-full bg-emerald-100 dark:bg-primary/20 flex items-center justify-center shrink-0">
                       <Sparkles size={14} className="text-primary dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                       <span className="text-sm font-semibold text-slate-900 dark:text-white block">无限次对话</span>
                       <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">不再受每日额度限制，全天候陪伴</span>
                    </div>
                 </div>
                 <div className="w-full h-px bg-slate-200/50 dark:bg-white/5" />
                 <div className="flex items-center gap-3.5">
                    <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                       <Zap size={14} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                       <span className="text-sm font-semibold text-slate-900 dark:text-white block">高级 AI 模型</span>
                       <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">解锁 Qwen-Max、DeepSeek 等顶级模型</span>
                    </div>
                 </div>
              </div>
           </div>

           <DialogFooter className="px-6 pb-8 pt-2 sm:justify-center relative z-10 flex-col sm:flex-col gap-3">
             <Button 
               onClick={() => router.push('/plans')} 
               className="w-full bg-gradient-to-r from-primary to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 shadow-lg shadow-emerald-500/25 py-6 text-base font-semibold rounded-2xl transition-transform active:scale-95"
             >
               立即升级专业版
             </Button>
             <Button 
               variant="ghost" 
               onClick={() => setShowPlanDialog(false)}
               className="w-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-transparent text-sm font-medium"
             >
               明天再来
             </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileAISettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSave={handleSettingsSave}
      />
      
      {/* Notifications */}
      <div className="fixed top-20 right-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
        {notices.map(notice => (
          <div key={notice.id} className="pointer-events-auto bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 dark:border-white/10 p-4 flex items-start gap-3 animate-in slide-in-from-top-2 fade-in">
             {notice.variant === 'loading' && <Loader2 size={20} className="text-blue-500 animate-spin mt-0.5" />}
             {notice.variant === 'success' && <CheckCircle2 size={20} className="text-green-500 mt-0.5" />}
             {notice.variant === 'error' && <AlertCircle size={20} className="text-red-500 mt-0.5" />}
             <div className="flex-1">
                <h3 className="font-medium text-sm text-gray-900 dark:text-white">{notice.title}</h3>
                {notice.description && <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">{notice.description}</p>}
             </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
}
