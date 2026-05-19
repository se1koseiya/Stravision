"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Zap, 
  Globe, 
  Terminal, 
  ArrowUpRight, 
  ChevronRight, 
  Cpu, 
  Search, 
  Activity, 
  CheckCircle2, 
  Play, 
  RotateCcw,
  Maximize2,
  Trash2,
  LayoutDashboard,
  Sprout,
  Thermometer,
  Droplets,
  Sun,
  Loader2,
  ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import BerryOrb from "@/components/smoothui/berry-orb"

// --- Mock Data & Constants ---

const DEMO_STEPS = [
  {
    id: 1,
    title: "语义分析与需求建模",
    description: "提取关键词：[徐州], [大棚草莓], [气象影响], [补光策略]",
    status: "pending",
    type: "brain"
  },
  {
    id: 2,
    title: "调用 MCP [Brave Search] 获取气象数据",
    description: "检索徐州未来72小时风速、温度、云层覆盖率...",
    status: "pending",
    type: "search"
  },
  {
    id: 3,
    title: "获取大棚传感器实时状态",
    description: "调用 [Irrigation System] 与 [Soil Sensor] 接口...",
    status: "pending",
    type: "sensor"
  },
  {
    id: 4,
    title: "多模态视觉诊断 (VLM)",
    description: "分析昨日监控快照：识别叶片边缘卷曲程度 (灰霉病风险评估)",
    status: "pending",
    type: "vision"
  },
  {
    id: 5,
    title: "智能控制策略生成与执行",
    description: "自动调整补光灯 R:120 G:45 B:200, 开启内循环风扇",
    status: "pending",
    type: "action"
  }
]

const TERMINAL_LOGS = [
  { type: "cmd", content: "mcp tool call brave_search --query '徐州未来三天天气'" },
  { type: "success", content: ">> [STATUS: 200 OK] 气象数据包已接收 (1.2MB)" },
  { type: "json", content: { status: "cloudy", temp: "12-18℃", humidity: "78%" } },
  { type: "cmd", content: "mcp tool call strawberry_growth_model --stage 'bloom'" },
  { type: "success", content: ">> [ANALYSIS COMPLETE] 建议增加 20% 蓝光比例以抑制徒长" },
  { type: "cmd", content: "iot control set_led --device 'id_8' --r 120 --g 45 --b 200" },
  { type: "success", content: ">> [EXECUTION SUCCESS] 设备响应耗时 42ms" }
]

const SEARCH_RESULTS = [
  { title: "徐州气象分中心：未来三日连阴雨天警报", url: "https://weather.gov.cn/xz", snippet: "受江淮气旋北抬影响，22-24日徐州地区将出现持续弱降水，累计日照不足..."},
  { title: "大棚草莓弱光环境下补光最佳实践", url: "https://agri.tech/strawberry-light", snippet: "红蓝比例 4:1 可有效提高草莓授粉成功率，建议在阴天全天开启..."},
  { title: "草莓灰霉病病症识别与物理防治", url: "https://vlm.ai/crop-check", snippet: "阴雨天气湿度大是诱发主因，需加强通风并配合特定波段补光抑制孢子萌发..."}
]

// --- Components ---

const TerminalLine = ({ type, content }: { type: string, content: any }) => {
  if (type === "json") {
    return (
      <div className="pl-4 font-mono text-[11px] text-amber-400">
        {JSON.stringify(content, null, 2)}
      </div>
    )
  }
  return (
    <div className={cn(
      "pl-2 font-mono text-[11px] mb-1 flex gap-2",
      type === "cmd" ? "text-blue-400" : "text-emerald-400"
    )}>
      <span className="opacity-50">{type === "cmd" ? "$" : ">>"}</span>
      <span>{content}</span>
    </div>
  )
}

const SearchResultItem = ({ title, url, snippet, index }: any) => (
  <motion.div 
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.1 }}
    className="p-4 border-b border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
  >
    <div className="flex items-center justify-between mb-1">
      <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 group-hover:underline underline-offset-4">{title}</h4>
      <ExternalLink size={12} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <div className="text-[10px] text-primary dark:text-emerald-400/80 mb-2 truncate opacity-70">{url}</div>
    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">{snippet}</p>
  </motion.div>
)

export default function AgentShowcase() {
  const [demoState, setDemoState] = useState<"idle" | "running" | "finished">("idle")
  const [currentStep, setCurrentStep] = useState(0)
  const [visibleLogs, setVisibleLogs] = useState<typeof TERMINAL_LOGS>([])
  const [visibleResults, setVisibleResults] = useState<typeof SEARCH_RESULTS>([])
  const [thoughtText, setThoughtText] = useState("")
  const [showTerminal, setShowTerminal] = useState(false)
  const [showBrowser, setShowBrowser] = useState(false)
  const [isVlmActive, setIsVlmActive] = useState(false)
  
  const terminalEndRef = useRef<HTMLDivElement>(null)

  const fullThought = "根据最新的气象预测，未来三天徐州将有连绵阴雨。当前大棚湿度 78%，处于草莓灰霉病高发区间。我将联动补光系统强制开启红蓝补光以模拟日照，并启动内循环排湿。同时通过 VLM 分析昨日监控快照，确认目前暂无真菌感染迹象。"

  useEffect(() => {
    if (demoState === "running") {
      const runDemo = async () => {
        // Step 1: Parsing
        setCurrentStep(1)
        await sleep(1500)
        
        // Step 2: Search
        setCurrentStep(2)
        setShowTerminal(true)
        for (let i = 0; i < 3; i++) {
          setVisibleLogs(prev => [...prev, TERMINAL_LOGS[i]])
          await sleep(600)
        }
        setShowBrowser(true)
        await sleep(500)
        for (let i = 0; i < SEARCH_RESULTS.length; i++) {
          setVisibleResults(prev => [...prev, SEARCH_RESULTS[i]])
          await sleep(800)
        }
        
        // Step 3: Sensors
        setCurrentStep(3)
        setVisibleLogs(prev => [...prev, TERMINAL_LOGS[3]])
        await sleep(1200)

        // Step 4: Vision (VLM)
        setCurrentStep(4)
        setIsVlmActive(true)
        await sleep(1500)
        
        // Thought typing effect
        for (let i = 0; i <= fullThought.length; i++) {
          setThoughtText(fullThought.substring(0, i))
          await sleep(20)
        }
        
        // Step 5: Action
        setCurrentStep(5)
        for (let i = 4; i < TERMINAL_LOGS.length; i++) {
          setVisibleLogs(prev => [...prev, TERMINAL_LOGS[i]])
          await sleep(800)
        }
        
        await sleep(1000)
        setDemoState("finished")
      }
      runDemo()
    }
  }, [demoState])

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [visibleLogs])

  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

  const handleStart = () => {
    setDemoState("running")
    setCurrentStep(0)
    setVisibleLogs([])
    setVisibleResults([])
    setThoughtText("")
    setShowBrowser(false)
    setShowTerminal(false)
    setIsVlmActive(false)
  }

  const handleReset = () => {
    setDemoState("idle")
    setCurrentStep(0)
    setVisibleLogs([])
    setVisibleResults([])
    setThoughtText("")
    setShowBrowser(false)
    setShowTerminal(false)
    setIsVlmActive(false)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] text-slate-900 dark:text-slate-100 font-sans selection:bg-primary/30 overflow-hidden flex flex-col relative">
      
      {/* --- Aesthetic Background Mesh --- */}
      <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* --- Fixed Header --- */}
      <header className="h-16 border-b border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl z-50 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <div className="size-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap className="text-white size-5 fill-current" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight flex items-center gap-2">
              Stravision <span className="text-zinc-400 font-normal">|</span> <span className="text-primary">Agent Studio</span>
            </h1>
            <p className="text-[10px] font-mono text-zinc-400 tracking-widest uppercase">Autonomous Management Pro</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="font-mono text-[10px] bg-white/50 dark:bg-white/5 border-zinc-200 dark:border-white/10 px-3 py-1">
            v3.2.0-STABLE
          </Badge>
          <div className="h-4 w-px bg-zinc-200 dark:bg-white/10" />
          <Button variant="ghost" size="sm" className="hidden sm:flex text-primary hover:text-primary hover:bg-emerald-50 text-xs font-bold gap-2">
            <LayoutDashboard size={14} />
            返回仪表盘
          </Button>
        </div>
      </header>

      {/* --- Main Workspace --- */}
      <main className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
        
        {/* --- LEFT: Mission Control --- */}
        <section className="flex-1 flex flex-col overflow-y-auto p-6 lg:p-10 border-r border-zinc-100 dark:border-white/5 bg-white dark:bg-[#09090B]">
          
          <div className="max-w-3xl mx-auto w-full space-y-12">
            
            {/* User Goal Bubble */}
            <div className="flex justify-end pr-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-zinc-900 dark:bg-primary text-white dark:text-white px-6 py-4 rounded-[2rem] rounded-tr-none shadow-xl max-w-md"
              >
                <p className="text-sm font-medium leading-relaxed">
                  分析未来三天徐州的天气对大棚草莓的影响并给出建议，如果是弱光环境自动联动光照系统调优。
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] opacity-60 font-mono">
                  <Activity size={10} />
                  <span>PRESENTATION_MODE_ACTIVE</span>
                </div>
              </motion.div>
            </div>

            {/* Task Chain */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                   <div className="size-4 relative">
                     <BerryOrb size="16px" isActive={true} />
                   </div>
                  Mission Execution Chain
                </h3>
                {demoState === "running" && (
                   <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary animate-pulse bg-primary/10 px-2 py-0.5 rounded">
                     <span className="size-1 bg-primary rounded-full" />
                     LIVE PROCESSING
                   </span>
                )}
              </div>

              <div className="space-y-1 p-1">
                {DEMO_STEPS.map((step, idx) => {
                  const isActive = currentStep === idx + 1
                  const isDone = currentStep > idx + 1
                  
                  return (
                    <motion.div 
                      key={step.id}
                      animate={{ 
                        opacity: currentStep >= idx + 1 ? 1 : 0.4,
                        x: isActive ? 10 : 0
                      }}
                      className={cn(
                        "relative flex gap-4 p-4 rounded-2xl transition-all duration-500",
                        isActive ? "bg-emerald-50 dark:bg-primary/10 border border-emerald-100 dark:border-primary/20 shadow-sm" : "border border-transparent"
                      )}
                    >
                      {/* Line */}
                      {idx !== DEMO_STEPS.length - 1 && (
                        <div className="absolute left-[27px] top-[44px] bottom-[-4px] w-px bg-zinc-100 dark:bg-white/5" />
                      )}

                      <div className={cn(
                        "relative z-10 size-7 rounded-full flex items-center justify-center shrink-0 border text-[10px] font-black transition-all duration-500",
                        isActive ? "bg-primary text-white border-emerald-400 scale-110 shadow-lg shadow-emerald-500/40" : 
                        isDone ? "bg-emerald-100 dark:bg-primary/20 text-primary dark:text-emerald-400 border-emerald-200 dark:border-primary/40" :
                        "bg-zinc-50 dark:bg-white/5 text-zinc-300 dark:text-zinc-600 border-zinc-200 dark:border-white/10"
                      )}>
                        {isDone ? <CheckCircle2 size={14} /> : idx + 1}
                      </div>

                      <div className="flex-1 pr-6">
                        <h4 className={cn(
                          "text-sm font-bold transition-colors duration-500",
                          isActive ? "text-primary dark:text-emerald-400" : 
                          isDone ? "text-zinc-600 dark:text-zinc-300" : "text-zinc-400 dark:text-zinc-600"
                        )}>
                          {step.title}
                        </h4>
                        <p className={cn(
                          "text-[11px] mt-1 line-clamp-1 transition-colors duration-500",
                          isActive ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-700"
                        )}>
                          {step.description}
                        </p>
                      </div>

                      {isActive && (
                        <div className="flex items-center">
                          <Loader2 size={16} className="animate-spin text-primary/50" />
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Agent Thought Panel */}
            <AnimatePresence>
              {thoughtText && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/80 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-3xl p-8 relative overflow-hidden group shadow-2xl backdrop-blur-sm"
                >
                  <div className="absolute top-[-40px] right-[-40px] p-4 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <BerryOrb size="300px" isActive={demoState === 'running'} />
                  </div>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="size-16 rounded-2xl bg-black dark:bg-primary/10 flex items-center justify-center p-1 border border-white/5 overflow-hidden">
                       <BerryOrb 
                         size="64px" 
                         isActive={demoState === 'running'}
                       />
                    </div>
                    <div>
                      <h4 className="text-base font-black tracking-tighter italic uppercase text-primary dark:text-emerald-400">Agent Mind Studio</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">STV-ORB_CLUSTER-8821 / ACTIVE</p>
                    </div>
                  </div>

                  <div className="min-h-[80px]">
                    <p className="text-base leading-relaxed text-zinc-800 dark:text-zinc-200 font-bold italic">
                      {thoughtText ? `"${thoughtText}"` : "等待任务启动，系统将自动展示多模态推理链..."}
                      <span className={cn(
                        "inline-block w-1.5 h-4 bg-primary ml-1 align-middle",
                        demoState === 'running' ? "animate-pulse" : "opacity-0"
                      )} />
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer Control */}
            <div className="pt-10 flex items-center gap-4">
              {demoState === "idle" ? (
                <Button 
                  onClick={handleStart} 
                  className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary text-white font-bold text-base shadow-xl shadow-emerald-500/20 group gap-4 active:scale-95 transition-all"
                >
                  <Play className="fill-current" />
                  运行演示脚本
                  <ChevronRight size={20} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  className="h-14 px-8 rounded-2xl border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 font-bold text-sm gap-3 active:scale-95 transition-all"
                >
                  <RotateCcw size={18} />
                  重置演示
                </Button>
              )}
              
              <div className="flex-1" />
              
              <div className="hidden lg:flex flex-col items-end gap-1 px-4 border-r border-zinc-100 dark:border-white/5">
                <span className="text-[10px] font-black uppercase text-zinc-300 dark:text-zinc-700 tracking-tighter">Powered By</span>
                <span className="text-xs font-bold text-primary/60">Stravision DeepSeek v3</span>
              </div>
            </div>

          </div>
        </section>

        {/* --- RIGHT: Execution Studio --- */}
        <section className="w-full md:w-[450px] lg:w-[550px] xl:w-[650px] bg-[#F1F5F9]/50 dark:bg-[#09090B] flex flex-col border-l border-zinc-200 dark:border-white/5">
          
          {/* Internal Navigation */}
          <div className="h-14 border-b border-zinc-200 dark:border-white/5 px-6 flex items-center justify-between bg-white/40 dark:bg-white/5 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Live Studio Feed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 rounded bg-zinc-900/10 dark:bg-white/10 text-[10px] font-mono text-zinc-500">REALTIME_TOOLS</div>
              <Button variant="ghost" size="icon" className="size-8 text-zinc-400"><Maximize2 size={14} /></Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-6">
            
            {/* Realtime Terminal */}
            <AnimatePresence>
              {showTerminal && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col flex-1 min-h-[240px] max-h-[30%]"
                >
                  <div className="bg-[#1E1E1E] rounded-xl overflow-hidden shadow-2xl flex flex-col h-full border border-white/5">
                    <div className="h-9 px-4 flex items-center justify-between border-b border-white/5 bg-white/5">
                       <div className="flex items-center gap-4">
                          <Terminal size={14} className="text-zinc-500" />
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">MCP Execution Logs</span>
                       </div>
                       <div className="flex gap-1.5">
                          <div className="size-2 rounded-full bg-red-500/20" />
                          <div className="size-2 rounded-full bg-amber-500/20" />
                          <div className="size-2 rounded-full bg-primary/20" />
                       </div>
                    </div>
                    <ScrollArea className="flex-1 p-4 font-mono text-xs whitespace-pre-wrap">
                       {visibleLogs.map((log, i) => (
                         <TerminalLine key={i} type={log.type} content={log.content} />
                       ))}
                       <div ref={terminalEndRef} />
                    </ScrollArea>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Browser Preview (Search Mode) */}
            <AnimatePresence>
              {showBrowser && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col flex-2 h-full min-h-0"
                >
                  <div className="flex-1 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col">
                    <div className="h-10 bg-zinc-50 dark:bg-zinc-800/50 flex items-center px-4 gap-4 border-b border-zinc-100 dark:border-white/5">
                      <div className="flex gap-1.5">
                        <div className="size-2.5 rounded-full bg-red-400" />
                        <div className="size-2.5 rounded-full bg-amber-400" />
                        <div className="size-2.5 rounded-full bg-green-400" />
                      </div>
                      <div className="flex-1 bg-white dark:bg-zinc-950 rounded-md border border-zinc-200 dark:border-white/5 px-3 py-1 text-[10px] text-zinc-400 flex items-center gap-2">
                        <Search size={10} />
                        exa.ai/search?q=xuzhou_strawberry_weather_advisory
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950">
                      {visibleResults.length > 0 ? (
                        <div className="divide-y divide-zinc-50 dark:divide-white/5">
                          {visibleResults.map((res, i) => (
                            <SearchResultItem key={i} {...res} index={i} />
                          ))}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center p-10 text-center gap-4">
                          <div className="size-16 rounded-full bg-emerald-50 dark:bg-primary/10 flex items-center justify-center text-primary border border-emerald-100 dark:border-primary/20">
                            <Globe size={32} className="animate-pulse" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">正在通过 MCP 连接 Exa 联网检索...</p>
                            <p className="text-xs text-zinc-400 mt-1">Connecting to exa-search-1.deepseek.v3</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Greenhouse Device Status (Action Mode) */}
            <AnimatePresence>
              {isVlmActive && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="size-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <Thermometer size={20} />
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-400">大棚温度</div>
                        <div className="text-xl font-bold">18.4℃</div>
                      </div>
                    </div>
                    <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "65%" }}
                        className="h-full bg-orange-500" 
                      />
                    </div>
                  </div>

                  <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Droplets size={20} />
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-400">土壤湿度</div>
                        <div className="text-xl font-bold">78%</div>
                      </div>
                    </div>
                    <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "78%" }}
                        className="h-full bg-blue-500" 
                      />
                    </div>
                  </div>

                  <div className="col-span-2 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-xl flex items-center justify-between group overflow-hidden relative">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={cn(
                        "size-12 rounded-2xl flex items-center justify-center transition-all duration-1000",
                        currentStep >= 5 ? "bg-amber-400 text-white shadow-lg shadow-amber-400/40" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                      )}>
                        <Sun size={24} className={currentStep >= 5 ? "animate-pulse" : ""} />
                      </div>
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          智能化补光策略
                          {currentStep >= 5 && <CheckCircle2 size={14} className="text-primary" />}
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {currentStep >= 5 ? "联动执行中: RGB(120,45,200)" : "等待气象分析完毕..."}
                        </div>
                      </div>
                    </div>
                    {currentStep >= 5 && (
                      <div className="flex gap-2">
                         <div className="size-6 rounded-full bg-[#782DC8] shadow-inner" />
                      </div>
                    )}
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </section>

      </main>

      {/* --- Performance Overlay --- */}
      <footer className="h-10 border-t border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/80 backdrop-blur-md z-40 px-8 flex items-center justify-between text-[10px] uppercase font-mono tracking-widest text-zinc-400">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
             <div className="size-1.5 rounded-full bg-primary" />
             AGENT_V3_ONLINE
          </div>
          <div>MCP_LATENCY: 42MS</div>
          <div>VLM_CONFIDENCE: 98.4%</div>
        </div>
        <div className="hidden sm:block underline decoration-emerald-500/50 underline-offset-4 cursor-pointer hover:text-primary transition-colors">
          View Raw Logic Manifest
        </div>
      </footer>

    </div>
  )
}
