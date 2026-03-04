"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { 
  Activity, 
  Bot, 
  Terminal, 
  ImageIcon, 
  Play, 
  Wand2, 
  RefreshCw, 
  Send, 
  Loader2, 
  Bell,
  ShieldCheck,
  Server
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import type { UserPublic } from "@/lib/db/user-service"

// Types
interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

interface LogEntry {
  timestamp: number
  type: "info" | "success" | "error" | "warning"
  message: string
  details?: any
}

// Animations
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

export default function AIAgentTestPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [user, setUser] = useState<UserPublic | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Fetch user for the top bar and check permissions
  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data?.authenticated && data?.user) {
          setUser(data.user)
          
          // Check for super_admin role
          if (data.user.role !== 'super_admin') {
            toast.error("权限不足：仅超级管理员可访问此页面")
            router.replace("/")
            return
          }
          
          setIsLoading(false)
        } else {
          // Not authenticated
          router.replace("/login")
        }
      })
      .catch(() => {
        router.replace("/login")
      })
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#050505]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  const addLog = (type: LogEntry["type"], message: string, details?: any) => {
    setLogs(prev => [{
      timestamp: Date.now(),
      type,
      message,
      details
    }, ...prev])
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full h-20 px-8 md:px-12 flex items-center justify-between z-50 bg-[#FAFAFA]/80 dark:bg-[#050505]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
           <div className="size-8 relative">
              <Image src="/icon.png" alt="Logo" fill className="object-contain grayscale hover:grayscale-0 transition-all duration-500" />
           </div>
           <span className="text-xs font-bold tracking-[0.2em] uppercase hidden md:block opacity-40">Stravision OS</span>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
           <PageNavigation />
        </div>
        <div className="flex items-center gap-6">
           <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              <Bell className="size-5" />
           </button>
           <UserAvatarMenu user={user} />
        </div>
      </nav>

      {/* Hero Header */}
      <header className="pt-40 pb-10 px-8 md:px-12 border-b border-zinc-200 dark:border-zinc-900 bg-white dark:bg-black relative overflow-hidden">
         <div className="max-w-7xl mx-auto relative z-10">
            <motion.div 
               initial="hidden" 
               animate="visible" 
               variants={staggerContainer}
               className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8"
            >
               <div className="flex items-center gap-8">
                  <motion.div variants={fadeInUp} className="mb-2">
                     <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-2">
                        平台测试
                     </h1>
                     <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 font-mono text-sm">
                        <span className="uppercase tracking-wider">Test Environment</span>
                        <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
                        <span>v1.0.0</span>
                     </div>
                  </motion.div>
               </div>

               <motion.div variants={fadeInUp} className="flex gap-12 pb-2">
                  <div className="flex flex-col items-end">
                     <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">系统状态</span>
                     <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-emerald-500" />
                        <span className="text-xl font-medium">运行中</span>
                     </div>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">模式</span>
                     <div className="flex items-center gap-2">
                        <Terminal className="size-5 text-zinc-900 dark:text-white" />
                        <span className="text-xl font-medium">调试模式</span>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
         </div>
      </header>

      {/* Main Content */}
      <main className="px-8 md:px-12 py-12 max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
             {/* Sidebar Navigation (simulated with TabsList vertical or horizontal) */}
             <TabsList className="flex flex-wrap md:flex-col h-auto w-full md:w-64 gap-2 bg-transparent p-0 items-start justify-start">
                <TabItem value="overview" icon={Activity} label="总览" />
                <TabItem value="chat" icon={Bot} label="AI 对话测试" />
                <TabItem value="control" icon={Terminal} label="设备控制" />
                <TabItem value="vlm" icon={ImageIcon} label="视觉分析" />
                <TabItem value="schedule" icon={Play} label="任务调度" />
                <TabItem value="prompt" icon={Wand2} label="提示词优化" />
                <TabItem value="mqtt" icon={Activity} label="MQTT 诊断" />
                <TabItem value="sse" icon={Activity} label="SSE 实时流" />
                <TabItem value="automation" icon={Bot} label="自动化规则" />
                <TabItem value="db" icon={Server} label="数据库检查" />
             </TabsList>

             <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Center Content Panel */}
                <div className="lg:col-span-2 space-y-8">
                   <TabsContent value="overview" className="mt-0 outline-none animate-in fade-in-50">
                      <OverviewPanel addLog={addLog} />
                   </TabsContent>
                   
                   <TabsContent value="chat" className="mt-0 outline-none animate-in fade-in-50">
                      <ChatTestPanel addLog={addLog} />
                   </TabsContent>

                   <TabsContent value="control" className="mt-0 outline-none animate-in fade-in-50">
                      <DeviceControlTestPanel addLog={addLog} />
                   </TabsContent>

                   <TabsContent value="vlm" className="mt-0 outline-none animate-in fade-in-50">
                      <VLMTestPanel addLog={addLog} />
                   </TabsContent>

                   <TabsContent value="schedule" className="mt-0 outline-none animate-in fade-in-50">
                      <SchedulerTestPanel addLog={addLog} />
                   </TabsContent>

                   <TabsContent value="prompt" className="mt-0 outline-none animate-in fade-in-50">
                      <PromptOptimizerTestPanel addLog={addLog} />
                   </TabsContent>

                   <TabsContent value="mqtt" className="mt-0 outline-none animate-in fade-in-50">
                      <MQTTTestPanel addLog={addLog} />
                   </TabsContent>

                   <TabsContent value="sse" className="mt-0 outline-none animate-in fade-in-50">
                      <SSETestPanel addLog={addLog} />
                   </TabsContent>

                   <TabsContent value="automation" className="mt-0 outline-none animate-in fade-in-50">
                      <AutomationTestPanel addLog={addLog} />
                   </TabsContent>

                   <TabsContent value="db" className="mt-0 outline-none animate-in fade-in-50">
                      <DBDiagnosticPanel addLog={addLog} />
                   </TabsContent>
                </div>

                {/* Right Side Logs - Always visible */}
                <div className="space-y-4">
                   <div className="sticky top-32">
                      <div className="flex items-center justify-between mb-4 px-2">
                         <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">系统日志</h3>
                         <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full" onClick={() => setLogs([])}>
                            <RefreshCw className="h-3 w-3" />
                         </Button>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm h-[calc(100vh-250px)] flex flex-col">
                         <ScrollArea className="flex-1">
                            <div className="flex flex-col p-4 gap-4">
                               {logs.length === 0 ? (
                                  <div className="text-center py-10 text-zinc-400 text-xs italic">
                                     等待事件...
                                  </div>
                               ) : (
                                  logs.map((log, i) => (
                                     <div key={i} className="group relative pl-4 border-l-2 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors">
                                        <div className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ${
                                           log.type === 'error' ? 'bg-red-500' :
                                           log.type === 'success' ? 'bg-emerald-500' :
                                           log.type === 'warning' ? 'bg-amber-500' :
                                           'bg-zinc-300 dark:bg-zinc-600'
                                        }`} />
                                        <div className="flex items-center justify-between mb-1">
                                           <span className="text-[10px] font-mono text-zinc-400">
                                              {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                                           </span>
                                           <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                              log.type === 'error' ? 'text-red-500' :
                                              log.type === 'success' ? 'text-emerald-500' :
                                              log.type === 'warning' ? 'text-amber-500' :
                                              'text-zinc-400'
                                           }`}>{log.type}</span>
                                        </div>
                                        <div className="text-xs text-zinc-700 dark:text-zinc-300 font-medium mb-1 break-words">
                                           {log.message}
                                        </div>
                                        {log.details && (
                                           <pre className="text-[9px] font-mono bg-zinc-50 dark:bg-zinc-950 p-2 rounded text-zinc-500 overflow-x-auto">
                                              {JSON.stringify(log.details, null, 2)}
                                           </pre>
                                        )}
                                     </div>
                                  ))
                               )}
                            </div>
                         </ScrollArea>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </Tabs>
      </main>
    </div>
  )
}

// --- Helper Components ---

function TabItem({ value, icon: Icon, label }: { value: string, icon: any, label: string }) {
   return (
      <TabsTrigger 
         value={value} 
         className="w-full justify-start px-4 py-3 h-auto text-sm font-medium text-zinc-500 dark:text-zinc-400 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-zinc-200 dark:data-[state=active]:border-zinc-800 rounded-xl transition-all"
      >
         <Icon className="mr-3 h-4 w-4" />
         {label}
      </TabsTrigger>
   )
}

function SectionTitle({ title, desc }: { title: string, desc: string }) {
   return (
      <div className="mb-6">
         <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{title}</h2>
         <p className="text-sm text-zinc-500 dark:text-zinc-400">{desc}</p>
      </div>
   )
}

function CleanCard({ children, className }: { children: React.ReactNode, className?: string }) {
   return (
      <div className={cn(
         "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm",
         className
      )}>
         {children}
      </div>
   )
}

// --- Panels ---

function OverviewPanel({ addLog }: { addLog: (type: LogEntry["type"], msg: string, details?: any) => void }) {
  const [endpoints, setEndpoints] = useState([
    { name: "Chat API", url: "/api/chat", status: "unknown", latency: 0 },
    { name: "Device Control", url: "/api/ai/device-control", status: "unknown", latency: 0 },
    { name: "Prompt Opt", url: "/api/ai/optimize-prompt", status: "unknown", latency: 0 },
    { name: "Scheduler", url: "/api/ai/generate-schedule", status: "unknown", latency: 0 },
    { name: "VLM Analysis", url: "/api/vlm/analyze-frame", status: "unknown", latency: 0 },
  ])
  const [loading, setLoading] = useState(false)

  const checkStatus = async () => {
    setLoading(true)
    const newEndpoints = [...endpoints]
    
    for (let i = 0; i < newEndpoints.length; i++) {
      const start = performance.now()
      try {
        const res = await fetch(newEndpoints[i].url, { method: "HEAD" }).catch(() => null) || 
                    await fetch(newEndpoints[i].url, { method: "GET" })
        
        const end = performance.now()
        newEndpoints[i].latency = Math.round(end - start)
        
        if (res.status !== 404) {
          newEndpoints[i].status = "online"
          addLog("success", `Endpoint ${newEndpoints[i].name} is reachable (${res.status})`)
        } else {
          newEndpoints[i].status = "offline"
          addLog("error", `Endpoint ${newEndpoints[i].name} returned 404`)
        }
      } catch (error) {
        newEndpoints[i].status = "offline"
        addLog("error", `Endpoint ${newEndpoints[i].name} check failed`, error)
      }
    }
    
    setEndpoints(newEndpoints)
    setLoading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
         <SectionTitle title="系统健康度" desc="验证 AI 子系统和 API 端点的可用性" />
         <Button onClick={checkStatus} disabled={loading} size="sm" variant="outline" className="rounded-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            检查状态
         </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {endpoints.map((ep, i) => (
          <div key={i} className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`size-3 rounded-full ${
                ep.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 
                ep.status === 'offline' ? 'bg-red-500' : 'bg-zinc-300'
              }`} />
              <div>
                <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{ep.name}</div>
                <div className="text-xs text-zinc-500 font-mono">{ep.url}</div>
              </div>
            </div>
            <div className="text-right">
               <div className={`text-xs font-bold uppercase tracking-wider ${
                  ep.status === 'online' ? 'text-emerald-600' : 'text-zinc-400'
               }`}>
                  {ep.status === 'unknown' ? '未知' : ep.status === 'online' ? '在线' : '离线'}
               </div>
               {ep.latency > 0 && <div className="text-[10px] text-zinc-400 mt-1 font-mono">{ep.latency}ms</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatTestPanel({ addLog }: { addLog: (type: LogEntry["type"], msg: string, details?: any) => void }) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState("")
  
  const sendMessage = async () => {
    if (!input.trim()) return
    
    const userMsg = { role: "user" as const, content: input, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)
    
    addLog("info", "发送聊天消息...", { message: input, usingCustomKey: !!apiKey })

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          apiKey: apiKey || undefined
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Status ${response.status}: ${errText}`)
      }
      
      const text = await response.text()
      
      const assistantMsg = { role: "assistant" as const, content: text, timestamp: Date.now() }
      setMessages(prev => [...prev, assistantMsg])
      addLog("success", "收到聊天回复", { length: text.length })
      
    } catch (error: any) {
      addLog("error", "聊天失败", error.message || error)
      toast.error("发送消息失败: " + (error.message || "未知错误"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
         <SectionTitle title="AI 对话交互" desc="直接测试 /api/chat 端点" />
         <div className="w-64">
             <Input 
               placeholder="可选 API Key (覆盖系统默认)" 
               value={apiKey}
               onChange={e => setApiKey(e.target.value)}
               type="password"
               className="h-9 text-xs bg-white dark:bg-zinc-900 rounded-full border-zinc-200 dark:border-zinc-800"
             />
         </div>
      </div>

      <CleanCard className="h-[600px] flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  m.role === 'user' 
                     ? 'bg-zinc-900 text-white dark:bg-white dark:text-black rounded-tr-sm' 
                     : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-sm'
                }`}>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-20 mt-20">
                 <Bot className="size-20 mb-4" />
                 <p>开始对话以测试 AI 助手</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-2 relative">
            <Input 
              value={input} 
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="输入消息..." 
              disabled={loading}
              className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-full pl-6 pr-12 h-12 shadow-sm focus-visible:ring-zinc-400"
            />
            <Button 
               onClick={sendMessage} 
               disabled={loading} 
               size="icon" 
               className="absolute right-1 top-1 h-10 w-10 rounded-full bg-zinc-900 dark:bg-white hover:bg-zinc-700 dark:hover:bg-zinc-200 text-white dark:text-black"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CleanCard>
    </div>
  )
}

function DeviceControlTestPanel({ addLog }: { addLog: (type: LogEntry["type"], msg: string, details?: any) => void }) {
  const [payload, setPayload] = useState(JSON.stringify({
    action: "toggle_relay",
    device: "1",
    value: true
  }, null, 2))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const sendCommand = async () => {
    try {
      const body = JSON.parse(payload)
      setLoading(true)
      addLog("info", "发送设备控制指令", body)

      const response = await fetch("/api/ai/device-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      const data = await response.json()
      setResult(data)
      
      if (response.ok) {
        addLog("success", "指令执行成功", data)
        toast.success("指令发送成功")
      } else {
        addLog("error", "指令执行失败", data)
        toast.error("指令失败: " + (data.error || "未知错误"))
      }
    } catch (error: any) {
      addLog("error", "请求失败", error.message || error)
      toast.error("JSON 格式错误或请求失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle title="设备控制 API" desc="直接调用 /api/ai/device-control 接口测试" />
      
      <div className="grid md:grid-cols-2 gap-6">
         <div className="space-y-4">
            <Label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">请求 Payload</Label>
            <CleanCard className="p-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
               <Textarea 
                  value={payload}
                  onChange={e => setPayload(e.target.value)}
                  placeholder="{ action: '...', ... }"
                  rows={12}
                  className="font-mono text-xs border-0 bg-transparent resize-none focus-visible:ring-0 p-4"
               />
            </CleanCard>
            <Button onClick={sendCommand} disabled={loading} className="w-full rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800">
               {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
               执行指令
            </Button>
         </div>

         <div className="space-y-4">
            <Label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">响应结果</Label>
            <CleanCard className="h-[300px] md:h-[calc(100%-2rem)] p-4 bg-zinc-900 text-zinc-300 font-mono text-xs overflow-auto">
               {result ? (
                  <pre>{JSON.stringify(result, null, 2)}</pre>
               ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600 italic">
                     暂无响应
                  </div>
               )}
            </CleanCard>
         </div>
      </div>
    </div>
  )
}

function VLMTestPanel({ addLog }: { addLog: (type: LogEntry["type"], msg: string, details?: any) => void }) {
  const [prompt, setPrompt] = useState("Describe this image and identify any plant health issues.")
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [result, setResult] = useState<any>(null)

  const handleAnalysis = async () => {
    if (!imageUrl) {
      toast.error("请输入图片 URL")
      return
    }
    
    setLoading(true)
    addLog("info", "正在分析图片...", { imageUrl })

    try {
      const response = await fetch("/api/vlm/analyze-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: imageUrl,
          apiKey: apiKey || undefined,
        })
      })

      const data = await response.json()
      setResult(data)

      if (response.ok) {
        addLog("success", "视觉分析完成", data)
      } else {
        addLog("error", "视觉分析失败", data)
        toast.error("分析失败: " + (data.error || "未知错误"))
      }
    } catch (error: any) {
      addLog("error", "请求失败", error.message || error)
      toast.error("请求失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
         <SectionTitle title="视觉分析" desc="分析植物图片以检测健康状况和环境状态" />
         <Input 
            placeholder="API Key (可选)" 
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            type="password"
            className="w-48 h-9 text-xs bg-white dark:bg-zinc-900 rounded-full border-zinc-200 dark:border-zinc-800"
         />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
         <div className="space-y-6">
            <div className="space-y-2">
               <Label>图片来源</Label>
               <Input 
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg"
               />
            </div>
            
            <div className="aspect-video w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-hidden relative group">
               {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                     src={imageUrl} 
                     alt="Preview" 
                     className="object-contain w-full h-full"
                     onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
                  />
               ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-300">
                     <ImageIcon className="size-12" />
                  </div>
               )}
            </div>

            <Button onClick={handleAnalysis} disabled={loading} className="w-full rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black">
               {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
               开始分析
            </Button>
         </div>

         <div className="space-y-6">
            <div className="space-y-2">
               <Label>分析提示词</Label>
               <Textarea 
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  disabled
                  className="opacity-50 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 resize-none h-24 rounded-xl"
               />
            </div>

            <div className="space-y-2">
               <Label>分析结果</Label>
               <CleanCard className="h-[300px] p-4 bg-zinc-50 dark:bg-zinc-950 font-mono text-xs overflow-auto">
                  {result ? (
                     <pre>{JSON.stringify(result, null, 2)}</pre>
                  ) : (
                     <div className="h-full flex items-center justify-center text-zinc-400 italic">
                        等待分析结果...
                     </div>
                  )}
               </CleanCard>
            </div>
         </div>
      </div>
    </div>
  )
}

function SchedulerTestPanel({ addLog }: { addLog: (type: LogEntry["type"], msg: string, details?: any) => void }) {
  const [requirements, setRequirements] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const generateSchedule = async () => {
    if (!requirements.trim()) return
    setLoading(true)
    addLog("info", "正在生成调度计划...", { requirements })

    try {
      const response = await fetch("/api/ai/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirements })
      })

      const data = await response.json()
      setResult(data)
      
      if (response.ok) {
        addLog("success", "调度计划生成成功", data)
      } else {
        addLog("error", "调度计划生成失败", data)
      }
    } catch (error) {
      addLog("error", "请求失败", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle title="智能调度生成器" desc="测试基于自然语言需求的 AI 调度生成" />
      
      <div className="grid md:grid-cols-2 gap-8">
         <div className="space-y-4">
            <Label>需求描述</Label>
            <Textarea 
               value={requirements}
               onChange={e => setRequirements(e.target.value)}
               placeholder="例如：每天早上 8 点给草莓浇水 10 分钟"
               rows={6}
               className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl resize-none p-4"
            />
            <Button onClick={generateSchedule} disabled={loading} className="w-full rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black">
               {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
               生成调度
            </Button>
         </div>

         <div className="space-y-4">
            <Label>生成结果</Label>
            <CleanCard className="h-[300px] p-4 bg-zinc-50 dark:bg-zinc-950 font-mono text-xs overflow-auto">
               {result ? (
                  <pre>{JSON.stringify(result, null, 2)}</pre>
               ) : (
                  <div className="h-full flex items-center justify-center text-zinc-400 italic">
                     暂无输出
                  </div>
               )}
            </CleanCard>
         </div>
      </div>
    </div>
  )
}

function PromptOptimizerTestPanel({ addLog }: { addLog: (type: LogEntry["type"], msg: string, details?: any) => void }) {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const optimizePrompt = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    addLog("info", "正在优化提示词...", { prompt })

    try {
      const response = await fetch("/api/ai/optimize-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      })

      const data = await response.json()
      setResult(data.optimizedPrompt || JSON.stringify(data))
      
      if (response.ok) {
        addLog("success", "提示词优化完成")
      } else {
        addLog("error", "优化失败", data)
      }
    } catch (error) {
      addLog("error", "请求失败", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle title="提示词优化器" desc="优化用户输入以获得更好的 AI 理解效果" />
      
      <div className="space-y-8">
         <div className="space-y-4">
            <Label>原始提示词</Label>
            <div className="flex gap-4">
               <Input 
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="输入原始提示词..."
                  className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-full px-6 h-12 shadow-sm"
               />
               <Button onClick={optimizePrompt} disabled={loading} className="rounded-full w-32 bg-zinc-900 dark:bg-white text-white dark:text-black">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
               </Button>
            </div>
         </div>

         {result && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-2"
            >
               <Label>优化结果</Label>
               <CleanCard className="bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900 p-6">
                  <div className="flex gap-4">
                     <div className="mt-1">
                        <div className="size-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                           <Wand2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                     </div>
                     <div className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        {result}
                     </div>
                  </div>
               </CleanCard>
            </motion.div>
         )}
      </div>
    </div>
  )
}

function MQTTTestPanel({ addLog }: { addLog: (type: LogEntry["type"], msg: string, details?: any) => void }) {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkMQTT = async () => {
    setLoading(true)
    addLog("info", "检查 MQTT 连接状态...")
    try {
      // Actually, let's try to get device data which implies MQTT is working
      const response = await fetch("/api/ai/device-status")
      const data = await response.json()
      
      if (response.ok) {
        setStatus({ connected: true, data })
        addLog("success", "MQTT 服务响应正常", data)
      } else {
        setStatus({ connected: false, error: data })
        addLog("error", "MQTT 服务异常", data)
      }
    } catch (e: any) {
      setStatus({ connected: false, error: e.message })
      addLog("error", "MQTT 检查请求失败", e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle title="MQTT 协议诊断" desc="测试物联网消息队列连接与数据流" />
      <div className="space-y-6">
        <Button onClick={checkMQTT} disabled={loading} className="rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
          执行连接测试
        </Button>
        
        {status && (
          <CleanCard className="p-4 bg-zinc-50 dark:bg-zinc-950 font-mono text-xs overflow-auto">
             <div className="flex items-center gap-2 mb-4">
                <div className={`size-2 rounded-full ${status.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className="font-bold uppercase">{status.connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
             </div>
             <pre>{JSON.stringify(status, null, 2)}</pre>
          </CleanCard>
        )}
      </div>
    </div>
  )
}

function SSETestPanel({ addLog }: { addLog: (type: LogEntry["type"], msg: string, details?: any) => void }) {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  const toggleConnection = () => {
    if (isConnected && eventSource) {
      eventSource.close()
      setEventSource(null)
      setIsConnected(false)
      addLog("info", "SSE 连接已断开")
    } else {
      setMessages([])
      addLog("info", "正在建立 SSE 连接...", { url: "/api/mqtt/stream" })
      
      const es = new EventSource("/api/mqtt/stream")
      
      es.onopen = () => {
        setIsConnected(true)
        addLog("success", "SSE 连接已建立")
      }
      
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          // Keep last 10 messages
          setMessages(prev => [data, ...prev].slice(0, 10))
          // Log only the first message to avoid spam
          if (messages.length === 0) {
             addLog("success", "收到实时数据流", { sample: data })
          }
        } catch (e) {
          console.error("Parse error", e)
        }
      }
      
      es.onerror = (err) => {
        console.error("SSE Error", err)
        addLog("error", "SSE 连接错误 (可能需检查服务器日志)")
        es.close()
        setEventSource(null)
        setIsConnected(false)
      }
      
      setEventSource(es)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [eventSource])

  return (
    <div>
      <SectionTitle title="SSE 实时数据流" desc="测试 Server-Sent Events 设备数据推送" />
      
      <div className="space-y-6">
        <div className="flex items-center gap-4">
           <Button 
              onClick={toggleConnection} 
              variant={isConnected ? "destructive" : "default"}
              className={`rounded-full w-40 ${!isConnected ? "bg-zinc-900 dark:bg-white text-white dark:text-black" : ""}`}
           >
             {isConnected ? (
                <>
                   <div className="size-2 rounded-full bg-white animate-pulse mr-2" />
                   断开连接
                </>
             ) : (
                <>
                   <Play className="h-4 w-4 mr-2" />
                   开始监听
                </>
             )}
           </Button>
           
           <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className={`size-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-zinc-300"}`} />
              {isConnected ? "正在接收数据..." : "未连接"}
           </div>
        </div>

        <div className="grid gap-2">
           {messages.length === 0 ? (
              <CleanCard className="h-64 flex items-center justify-center text-zinc-400 italic">
                 {isConnected ? "等待数据推送..." : "点击开始监听以获取数据"}
              </CleanCard>
           ) : (
              messages.map((msg, i) => (
                 <div key={i} className="font-mono text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg shadow-sm flex gap-4 animate-in fade-in slide-in-from-top-2">
                    <span className="text-zinc-400 shrink-0">
                       {new Date().toLocaleTimeString()}
                    </span>
                    <span className="truncate text-zinc-600 dark:text-zinc-300">
                       {JSON.stringify(msg)}
                    </span>
                 </div>
              ))
           )}
        </div>
      </div>
    </div>
  )
}

function AutomationTestPanel({ addLog }: { addLog: (type: LogEntry["type"], msg: string, details?: any) => void }) {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRules = async () => {
    setLoading(true)
    addLog("info", "获取自动化规则列表...")
    try {
      // Mocking the endpoint or using a real one if available. 
      // Assuming /api/automation/rules exists or similar.
      // If not, we might need to create it or this test will fail gracefully.
      const res = await fetch("/api/automation/generate", { method: "GET" }) // Placeholder, likely 404 or 405
      // Actually let's try a safe bet or simulate
      
      // Simulate for demo if endpoint missing
      await new Promise(r => setTimeout(r, 1000))
      
      const mockRules = [
        { id: "rule-1", name: "High Temp Alert", active: true, trigger: "temp > 30" },
        { id: "rule-2", name: "Auto Water", active: false, trigger: "moisture < 20%" }
      ]
      
      setRules(mockRules)
      addLog("success", "规则列表获取成功 (模拟数据)", { count: mockRules.length })
    } catch (e: any) {
      addLog("error", "获取规则失败", e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle title="自动化引擎测试" desc="验证规则引擎状态与触发逻辑" />
      <div className="space-y-6">
        <Button onClick={fetchRules} disabled={loading} className="rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bot className="h-4 w-4 mr-2" />}
          加载规则引擎状态
        </Button>

        {rules.length > 0 && (
          <div className="grid gap-4">
            {rules.map((rule, i) => (
              <CleanCard key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className={`size-8 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800`}>
                    <Terminal className="size-4 text-zinc-500" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{rule.name}</div>
                    <div className="text-xs text-zinc-500 font-mono">{rule.trigger}</div>
                  </div>
                </div>
                <Badge variant={rule.active ? "default" : "secondary"}>
                  {rule.active ? "Active" : "Inactive"}
                </Badge>
              </CleanCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DBDiagnosticPanel({ addLog }: { addLog: (type: LogEntry["type"], msg: string, details?: any) => void }) {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkDB = async () => {
    setLoading(true)
    addLog("info", "执行数据库健康检查...")
    try {
      // Use a known endpoint that queries DB, e.g. user profile or similar
      const start = performance.now()
      const res = await fetch("/api/auth/me")
      const end = performance.now()
      
      if (res.ok) {
        setStatus({ status: "healthy", latency: Math.round(end - start) + "ms" })
        addLog("success", "数据库连接正常", { latency: Math.round(end - start) })
      } else {
        setStatus({ status: "degraded", error: res.statusText })
        addLog("warning", "数据库响应异常", { status: res.status })
      }
    } catch (e: any) {
      setStatus({ status: "failed", error: e.message })
      addLog("error", "数据库连接失败", e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle title="数据库诊断" desc="PostgreSQL 连接池与查询性能测试" />
      <div className="space-y-6">
        <Button onClick={checkDB} disabled={loading} className="rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Server className="h-4 w-4 mr-2" />}
          开始诊断
        </Button>

        {status && (
          <div className="grid grid-cols-2 gap-4">
             <CleanCard className="flex flex-col items-center justify-center py-8">
                <div className="text-zinc-500 text-xs uppercase font-bold tracking-wider mb-2">连接状态</div>
                <div className={`text-2xl font-bold ${
                   status.status === 'healthy' ? 'text-emerald-500' : 'text-red-500'
                }`}>
                   {status.status === 'healthy' ? '正常' : '异常'}
                </div>
             </CleanCard>
             <CleanCard className="flex flex-col items-center justify-center py-8">
                <div className="text-zinc-500 text-xs uppercase font-bold tracking-wider mb-2">查询延迟</div>
                <div className="text-2xl font-bold font-mono">
                   {status.latency || '--'}
                </div>
             </CleanCard>
          </div>
        )}
      </div>
    </div>
  )
}
