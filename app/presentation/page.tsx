"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ChevronLeft, ChevronRight, 
  BarChart3, Globe, Users, 
  Zap, Brain, ShieldCheck, 
  TrendingUp, Award, Target,
  LayoutGrid, ArrowRight, Activity, Layers,
  Leaf, CloudSun, Sprout, Smartphone,
  Database, LineChart, Coins, Briefcase,
  AlertTriangle, Clock, Thermometer,
  List, CheckCircle2, XCircle, Search, AlertCircle,
  MessageSquare, Network, Lock, UserCheck,
  MapPin, Rocket, Box, RefreshCw, GraduationCap, Router, Monitor, Sparkles
} from "lucide-react"
import { Slide } from "@/components/presentation/Slide"
import { BentoCard } from "@/components/presentation/BentoCard"
import { Mascot } from "@/components/presentation/Mascot"
import { ArchitectureDiagram } from "@/components/docs/architecture-diagram"
import { cn } from "@/lib/utils"

// --- Helper Components ---

const ArtisticContainer = ({ children, className, title, delay = 0 }: { children: React.ReactNode, className?: string, title?: string, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, delay: delay * 0.1, ease: [0.22, 1, 0.36, 1] }}
    className={cn("relative group", className)}
  >
    {/* Corner Brackets */}
    <div className="absolute -top-2 -left-2 w-4 h-4 border-t border-l border-white/20" />
    <div className="absolute -top-2 -right-2 w-4 h-4 border-t border-r border-white/20" />
    <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b border-l border-white/20" />
    <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b border-r border-white/20" />
    
    {/* Glass Content */}
    <div className="relative overflow-hidden bg-white/[0.02] border border-white/5 backdrop-blur-sm p-8">
      {title && (
        <div className="flex items-center gap-4 mb-6">
          <div className="w-1 h-1 rounded-full bg-emerald-500" />
          <h4 className="text-base font-mono uppercase tracking-[0.3em] text-white/40">{title}</h4>
          <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
        </div>
      )}
      {children}
    </div>
  </motion.div>
)

const Dots = () => {
  const [dots, setDots] = useState<{x: number, y: number, size: number, delay: number, duration: number}[]>([])

  useEffect(() => {
    setDots(Array.from({ length: 15 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 2,
      duration: Math.random() * 2 + 2,
    })))
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute bg-emerald-500 rounded-full opacity-40"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
          }}
          animate={{
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            delay: dot.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

const StatDisplay = ({ value, label, sub, color = "emerald" }: { value: string, label: string, sub?: string, color?: "emerald" | "blue" | "purple" }) => {
  const colors = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    purple: "text-purple-400"
  }
  return (
    <div className="flex flex-col">
      <div className={cn("text-7xl md:text-9xl font-bold font-jinbuti tracking-tighter mb-2 leading-none", colors[color])}>
        {value}
      </div>
      <div className="text-2xl font-medium text-white/80">{label}</div>
      {sub && <div className="text-lg text-zinc-500 mt-1 font-mono tracking-wider uppercase">{sub}</div>}
    </div>
  )
}

const Highlight = ({ children, color = "emerald" }: { children: React.ReactNode, color?: "emerald" | "blue" | "purple" | "rose" }) => {
  const colors = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    rose: "text-rose-400"
  }
  return <span className={cn("font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80", colors[color])}>{children}</span>
}

export default function PresentationPage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [supportTab, setSupportTab] = useState("awards")
  const [isExportMode, setIsExportMode] = useState(false)
  const [hideUI, setHideUI] = useState(false)
  
  const slides = [
    // 1. Cover
    <Slide key="cover" className="items-center justify-center text-center p-0" hideFooter>
       <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
          <h1 className="text-[20vw] font-bold text-white/5 tracking-tighter select-none leading-none">
             FUTURE
          </h1>
       </div>
       
       <div className="relative z-10 grid grid-cols-12 gap-12 w-full h-full px-16 items-center">
          <div className="col-span-7 flex flex-col justify-center text-left space-y-10 pl-8">
             <motion.div 
               initial={{ x: -50, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               transition={{ duration: 1, ease: "easeOut" }}
             >
               <div className="flex items-center gap-4 mb-8">
                  <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-lg font-mono tracking-widest uppercase">
                     Stravision AIoT
                  </div>
                  <div className="h-px w-24 bg-emerald-500/30" />
               </div>
               
               <h1 className="text-[10rem] md:text-[11rem] font-bold text-white font-jinbuti tracking-tighter leading-[0.8] mb-8">
                 莓界<span className="text-emerald-500">.</span>
               </h1>
               
               <p className="text-zinc-400 text-5xl max-w-2xl leading-relaxed font-light">
                 AI 驱动的物联网大棚种植平台
                 <span className="block text-2xl text-zinc-600 font-mono mt-3">AI-Driven IoT Platform for Smart Greenhouse</span>
               </p>
             </motion.div>

             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.5 }}
               className="flex gap-16 pt-10"
             >
                <div>
                   <div className="text-zinc-500 text-base font-mono uppercase tracking-widest mb-1">Presenter</div>
                   <div className="text-white font-bold text-2xl">Stravision Team</div>
                </div>
                <div>
                   <div className="text-zinc-500 text-base font-mono uppercase tracking-widest mb-1">Date</div>
                   <div className="text-white font-bold text-2xl">2026.01</div>
                </div>
             </motion.div>
          </div>
          
          <div className="col-span-5 relative h-full flex items-center justify-center">
             <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse-slow" />
             <Mascot pose="hello" className="w-full h-full max-h-[800px] object-contain scale-125 relative z-10" glowColor="emerald" />
             
             {/* Orbiting Elements */}
             <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 border border-white/5 rounded-full border-dashed"
             />
             <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute inset-16 border border-white/5 rounded-full border-dashed"
             />
             
             <motion.div 
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-32 right-12 p-5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl z-20"
             >
                <Zap className="w-8 h-8 text-emerald-400" />
             </motion.div>
             
             <motion.div 
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-40 -left-8 p-5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl z-20"
             >
                <Database className="w-8 h-8 text-blue-400" />
             </motion.div>
          </div>
       </div>
    </Slide>,

    // 2. Agenda
    <Slide key="agenda" title="目录" subtitle="Agenda" step={1}>
       <div className="grid grid-cols-2 gap-12 h-full items-center px-12">
          <div className="space-y-6">
             {['项目概述', '市场痛点', '解决方案', '产品演示', '商业模式', '实施计划', '团队介绍'].map((item, i) => (
                <motion.div 
                   key={item}
                   initial={{ x: -20, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   transition={{ delay: i * 0.1 }}
                   className="flex items-center gap-6 group cursor-pointer"
                   onClick={() => setCurrentSlide(i + 2)}
                >
                   <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-zinc-500 font-mono group-hover:bg-emerald-500 group-hover:text-black group-hover:border-emerald-500 transition-all">
                      {String(i + 1).padStart(2, '0')}
                   </div>
                   <div className="text-4xl text-zinc-300 group-hover:text-white group-hover:translate-x-2 transition-all">
                      {item}
                   </div>
                </motion.div>
             ))}
          </div>
          <div className="relative h-full flex items-center justify-center">
             <Mascot pose="sit" className="w-[400px] h-[400px]" glowColor="blue" />
          </div>
       </div>
    </Slide>,

    // 3. Executive Summary
    <Slide key="summary" title="项目概述" subtitle="Executive Summary" step={2}>
       <div className="grid grid-cols-12 gap-12 h-full items-center px-12">
          <div className="col-span-7 space-y-12">
             <motion.div
               initial={{ opacity: 0, x: -30 }}
               whileInView={{ opacity: 1, x: 0 }}
               transition={{ duration: 1 }}
             >
                <div className="text-6xl font-light text-white leading-[1.4] tracking-tight">
                  Stravision 莓界以<Highlight>“感知—传输—平台—应用”</Highlight>构建闭环，致力于解决中小农户“想升级但不敢用”的痛点。
                </div>
             </motion.div>

             <div className="grid grid-cols-2 gap-8">
                <ArtisticContainer title="CORE VALUE 01" delay={1}>
                   <h4 className="text-2xl text-emerald-400 font-bold mb-3 font-jinbuti">助农增收</h4>
                   <p className="text-zinc-400 text-lg leading-relaxed">从“凭经验”走向“按数据”，提升管理稳定性与抗风险能力，促进稳产、稳质、节本。</p>
                </ArtisticContainer>
                <ArtisticContainer title="CORE VALUE 02" delay={2}>
                   <h4 className="text-2xl text-blue-400 font-bold mb-3 font-jinbuti">绿色减投</h4>
                   <p className="text-zinc-400 text-lg leading-relaxed">精准水肥与环境调控，推动投入更克制、过程更可追溯的绿色生产方式。</p>
                </ArtisticContainer>
             </div>
          </div>
          <div className="col-span-5 relative flex justify-center items-center h-full">
             <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-transparent rounded-full blur-[120px] opacity-40 animate-pulse-slow" />
             <Mascot pose="run" className="w-full h-full max-h-[600px] object-contain relative z-10" glowColor="emerald" />
             
             {/* Decorative Elements */}
             <div className="absolute top-1/4 right-0 w-32 h-px bg-gradient-to-l from-emerald-500/20 to-transparent" />
             <div className="absolute bottom-1/4 left-0 w-32 h-px bg-gradient-to-r from-blue-500/20 to-transparent" />
          </div>
       </div>
    </Slide>,

    // 4. Market Background
    <Slide key="market" title="市场背景" subtitle="Market Analysis" step={3}>
       <div className="relative w-full h-full flex flex-col justify-center px-12">
          
          {/* Background Elements */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-emerald-500/10 to-transparent rounded-full blur-[120px] pointer-events-none" />

          {/* Main Headline - Floating Top Left */}
          <div className="mb-16 max-w-4xl">
             <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <span className="text-emerald-400 font-mono tracking-widest uppercase text-base mb-4 block">Analysis Phase 03</span>
                <h3 className="text-7xl font-bold text-white leading-tight font-jinbuti">
                   政策红利与行业痛点<br/>
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">并存的时代</span>
                </h3>
             </motion.div>
          </div>

          <div className="grid grid-cols-12 gap-16 w-full">
             
             {/* Left Column: Policy Opportunities (The "Push") */}
             <div className="col-span-5 space-y-10">
                <div className="text-zinc-500 text-base font-mono uppercase tracking-widest border-b border-white/10 pb-4 mb-8">Macro Environment</div>
                
                {[
                   { icon: CheckCircle2, title: "中央一号文件", desc: "强化智慧农业战略地位" },
                   { icon: Coins, title: "设备采购补贴", desc: "数字乡村发展配套资金" },
                   { icon: Leaf, title: "绿色生产标准", desc: "倒逼传统农场转型升级" }
                ].map((item, i) => (
                   <div key={i} className="flex items-start gap-6 group">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                         <item.icon className="w-6 h-6" />
                      </div>
                      <div>
                         <h4 className="text-2xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">{item.title}</h4>
                         <p className="text-zinc-400 text-lg">{item.desc}</p>
                      </div>
                   </div>
                ))}
             </div>

             {/* Right Column: Market Gap Data (The "Pull") */}
             <div className="col-span-7 relative">
                <div className="text-zinc-500 text-base font-mono uppercase tracking-widest border-b border-white/10 pb-4 mb-8">Market Reality</div>
                
                <div className="grid grid-cols-2 gap-12">
                   {/* Big Stat 1 */}
                   <div>
                      <div className="text-6xl font-bold text-white font-mono mb-2">70%</div>
                      <div className="text-zinc-400 text-lg mb-4">中小规模种植户占比</div>
                      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                         <motion.div 
                            initial={{ width: 0 }} 
                            whileInView={{ width: "70%" }} 
                            transition={{ duration: 1, delay: 0.2 }} 
                            className="h-full bg-blue-500" 
                         />
                      </div>
                   </div>

                   {/* Big Stat 2 */}
                   <div>
                      <div className="text-6xl font-bold text-white font-mono mb-2">72%</div>
                      <div className="text-zinc-400 text-lg mb-4">传统地栽模式占比</div>
                      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                         <motion.div 
                            initial={{ width: 0 }} 
                            whileInView={{ width: "72%" }} 
                            transition={{ duration: 1, delay: 0.4 }} 
                            className="h-full bg-purple-500" 
                         />
                      </div>
                   </div>
                </div>

                {/* The Gap Highlight */}
                <div className="mt-12 p-0 relative">
                   <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent blur-2xl -z-10" />
                   <div className="flex items-end gap-6">
                      <div className="text-[8rem] font-bold text-emerald-400 leading-none font-jinbuti tracking-tighter">54.5%</div>
                      <div className="pb-4 max-w-xs">
                         <div className="text-emerald-500 font-mono uppercase tracking-widest mb-1">Market Gap</div>
                         <p className="text-white text-lg leading-tight">
                            现有技术无法覆盖的中小农户缺口，正是<span className="text-emerald-400 font-bold">“莓界”</span>的蓝海机遇。
                         </p>
                      </div>
                   </div>
                </div>

             </div>
          </div>

       </div>
    </Slide>,

    // 5. User & Pain Points (Merged)
    <Slide key="user_pain" title="用户与痛点" subtitle="User & Pain Points" step={4}>
       <div className="grid grid-cols-12 gap-12 h-full items-center px-12 relative">
          {/* Background Decor */}
          <div className="absolute left-20 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[100px] -z-10" />

          {/* Left: User Persona (Floating, No Box) */}
          <div className="col-span-5 flex flex-col items-center justify-center relative h-full">
             <div className="relative w-64 h-64 mb-8 shrink-0 group">
                {/* Rotating Rings */}
                <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                   className="absolute inset-[-20px] rounded-full border border-white/5 border-t-rose-500/30 border-r-rose-500/10"
                />
                <motion.div 
                   animate={{ rotate: -360 }}
                   transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                   className="absolute inset-[-40px] rounded-full border border-white/5 border-b-blue-500/30 border-l-blue-500/10"
                />
                
                {/* Avatar */}
                <div className="absolute inset-0 rounded-full overflow-hidden bg-zinc-900 border-4 border-[#050505] shadow-2xl relative z-10">
                   <img src="/images/user_default_avatar/avatar1.png" className="w-full h-full object-cover scale-110 group-hover:scale-105 transition-transform duration-700" alt="User" />
                </div>
                
                {/* Status Tag */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-[#050505] border border-rose-500/30 rounded-full flex items-center gap-2 shadow-xl z-20 whitespace-nowrap">
                   <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                   <span className="text-rose-400 font-bold text-lg">"想升级但不敢用"</span>
                </div>
             </div>
             
             <div className="text-center space-y-2 mb-10 shrink-0">
                <h3 className="text-5xl font-bold text-white font-jinbuti">经验型农户</h3>
                <p className="text-zinc-500 font-mono text-lg tracking-widest uppercase">41-50 years | 10+ exp | 5-15 mu</p>
             </div>

             <div className="w-full grid grid-cols-2 gap-8 text-center shrink-0">
                <div>
                   <div className="text-zinc-500 text-base font-mono uppercase tracking-widest mb-2">Decision Style</div>
                   <div className="text-2xl text-white font-bold">
                      <span className="text-emerald-400">“省事”</span> & <span className="text-blue-400">“可靠”</span>
                   </div>
                </div>
                <div>
                   <div className="text-zinc-500 text-base font-mono uppercase tracking-widest mb-2">Pain Point</div>
                   <div className="text-2xl text-zinc-300 font-bold">怕操作复杂</div>
                </div>
             </div>
          </div>
          
          {/* Right: Pain Points (List Style) */}
          <div className="col-span-7 flex flex-col justify-center gap-10 h-full pl-8">
             {[
                { 
                   title: "经验依赖", 
                   en: "EXPERIENCE",
                   value: "78%", 
                   desc: "浇水施肥全凭感觉，新人上手慢，技术传承断层严重。",
                   result: "产量品质波动大",
                   color: "purple"
                },
                { 
                   title: "劳力密集", 
                   en: "LABOR",
                   value: "70%", 
                   desc: "时间花在巡棚、开关设备上，效率极低且容易出错。",
                   result: "无法扩大种植规模",
                   color: "blue"
                },
                { 
                   title: "风险不可控", 
                   en: "RISK",
                   value: "HIGH", 
                   desc: "气候异常导致高温频发，人工反应滞后，一次失误可能绝收。",
                   result: "看天吃饭，收入不稳",
                   color: "rose"
                }
             ].map((item, i) => (
                <div key={i} className="group relative pl-8 border-l border-white/10 hover:border-white/30 transition-colors">
                   <div className={`absolute -left-[1px] top-0 h-full w-[3px] bg-gradient-to-b from-${item.color}-500 to-transparent scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-top`} />
                   
                   <div className="flex items-baseline justify-between mb-2">
                      <h3 className="text-4xl font-bold text-white group-hover:text-white/90 transition-colors">{item.title}</h3>
                      <div className={`text-5xl font-bold font-mono text-${item.color}-500/20 group-hover:text-${item.color}-500 transition-colors duration-500`}>{item.value}</div>
                   </div>
                   
                   <p className="text-zinc-400 text-xl leading-relaxed mb-3 group-hover:text-zinc-300 transition-colors max-w-xl">
                      {item.desc}
                   </p>
                   
                   <div className="flex items-center gap-2">
                      <AlertCircle className={`w-4 h-4 text-${item.color}-500`} />
                      <span className={`text-base font-bold text-${item.color}-400`}>{item.result}</span>
                   </div>
                </div>
             ))}
          </div>
       </div>
    </Slide>,

    // 7. SWOT Analysis
    <Slide key="swot" title="SWOT 战略分析" subtitle="Strategic Analysis" step={6}>
       <div className="relative w-full h-full px-16 flex flex-col justify-center">
          
          {/* Background Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-b from-blue-500/5 via-purple-500/5 to-transparent rounded-full blur-[120px] pointer-events-none" />

          {/* Center Divider */}
          <div className="absolute left-1/2 top-20 bottom-20 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

          <div className="grid grid-cols-2 gap-32 h-full">
             
             {/* Left Column: Internal Factors (S & W) */}
             <div className="flex flex-col justify-center space-y-20 relative pl-8">
                 {/* Section Label */}
                 <div className="absolute -left-4 top-0 bottom-0 flex flex-col justify-center">
                    <div className="-rotate-90 text-zinc-700 font-mono tracking-[0.5em] text-base uppercase whitespace-nowrap origin-center opacity-50">
                       Internal Factors
                    </div>
                 </div>

                 {/* Strengths */}
                 <div>
                    <div className="relative mb-8 group">
                       <span className="absolute -top-10 left-0 text-[5rem] font-bold font-mono text-emerald-500/5 pointer-events-none select-none">STRENGTHS</span>
                       <h3 className="text-6xl font-bold text-white font-jinbuti group-hover:text-emerald-400 transition-colors relative z-10">优势</h3>
                    </div>
                    <div className="space-y-8 pl-2">
                       {[
                          { title: "技术闭环", desc: "感知-分析-控制全链条，集成多维光谱分析能力" },
                          { title: "模式创新", desc: "“技术+服务+数据”一体化，配套 SOP 与培训" },
                          { title: "团队实力", desc: "校企协同，产学研高效联动" }
                       ].map((item, i) => (
                          <div key={i} className="flex items-start gap-5 group/item">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5 shrink-0 group-hover/item:scale-150 transition-transform" />
                             <div>
                                <span className="text-white text-xl font-bold mr-3">{item.title}</span>
                                <span className="text-zinc-400 text-lg leading-relaxed">{item.desc}</span>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Weaknesses */}
                 <div>
                    <div className="relative mb-8 group">
                       <span className="absolute -top-10 left-0 text-[5rem] font-bold font-mono text-rose-500/5 pointer-events-none select-none">WEAKNESSES</span>
                       <h3 className="text-6xl font-bold text-white font-jinbuti group-hover:text-rose-400 transition-colors relative z-10">劣势</h3>
                    </div>
                    <div className="space-y-8 pl-2">
                       {[
                          { title: "市场教育", desc: "农户认知不足，初期推广成本高" },
                          { title: "资产投入", desc: "繁育工厂等重资产投入门槛较高" }
                       ].map((item, i) => (
                          <div key={i} className="flex items-start gap-5 group/item">
                             <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2.5 shrink-0 group-hover/item:scale-150 transition-transform" />
                             <div>
                                <span className="text-white text-xl font-bold mr-3">{item.title}</span>
                                <span className="text-zinc-400 text-lg leading-relaxed">{item.desc}</span>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
             </div>

             {/* Right Column: External Factors (O & T) */}
             <div className="flex flex-col justify-center space-y-20 relative pr-8">
                 {/* Section Label */}
                 <div className="absolute -right-4 top-0 bottom-0 flex flex-col justify-center">
                    <div className="rotate-90 text-zinc-700 font-mono tracking-[0.5em] text-base uppercase whitespace-nowrap origin-center opacity-50">
                       External Factors
                    </div>
                 </div>

                 {/* Opportunities */}
                 <div>
                    <div className="relative mb-8 group">
                       <span className="absolute -top-10 left-0 text-[5rem] font-bold font-mono text-blue-500/5 pointer-events-none select-none">OPPORTUNITIES</span>
                       <h3 className="text-6xl font-bold text-white font-jinbuti group-hover:text-blue-400 transition-colors relative z-10">机会</h3>
                    </div>
                    <div className="space-y-8 pl-2">
                       {[
                          { title: "政策红利", desc: "中央一号文件支持与设备采购补贴" },
                          { title: "消费升级", desc: "高品质草莓需求增长，品牌溢价空间大" },
                          { title: "技术出海", desc: "“一带一路”沿线国家的农业现代化需求" }
                       ].map((item, i) => (
                          <div key={i} className="flex items-start gap-5 group/item">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 shrink-0 group-hover/item:scale-150 transition-transform" />
                             <div>
                                <span className="text-white text-xl font-bold mr-3">{item.title}</span>
                                <span className="text-zinc-400 text-lg leading-relaxed">{item.desc}</span>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Threats */}
                 <div>
                    <div className="relative mb-8 group">
                       <span className="absolute -top-10 left-0 text-[5rem] font-bold font-mono text-yellow-500/5 pointer-events-none select-none">THREATS</span>
                       <h3 className="text-6xl font-bold text-white font-jinbuti group-hover:text-yellow-400 transition-colors relative z-10">威胁</h3>
                    </div>
                    <div className="space-y-8 pl-2">
                       {[
                          { title: "行业竞争", desc: "传统农企转型带来的市场挤压" },
                          { title: "气候风险", desc: "极端天气可能超出系统调控阈值" }
                       ].map((item, i) => (
                          <div key={i} className="flex items-start gap-5 group/item">
                             <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2.5 shrink-0 group-hover/item:scale-150 transition-transform" />
                             <div>
                                <span className="text-white text-xl font-bold mr-3">{item.title}</span>
                                <span className="text-zinc-400 text-lg leading-relaxed">{item.desc}</span>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
             </div>

          </div>
       </div>
    </Slide>,

    // 8. Solution Overview (Dual Engine: OS + Hardware)
    <Slide key="solution_overview" title="核心产品矩阵" subtitle="Core Product Matrix" step={7}>
       <div className="grid grid-cols-2 gap-0 h-full w-full relative">
          
          {/* Divider Line */}
          <div className="absolute left-1/2 top-10 bottom-10 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent z-10" />

          {/* Left: Stravision OS */}
          <div className="relative h-full flex flex-col justify-center px-16 group">
             {/* Background Glow */}
             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] -z-10 group-hover:bg-blue-500/10 transition-colors duration-700" />
             
             <div className="mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-base font-mono tracking-wider mb-6">
                   <Brain className="w-4 h-4" />
                   THE BRAIN
                </div>
                <h3 className="text-6xl font-bold text-white mb-4 font-jinbuti tracking-tight">
                   Stravision <br/>
                   <span className="text-blue-400">AIoT OS</span>
                </h3>
                <p className="text-zinc-400 text-xl leading-relaxed max-w-md">
                   基于云原生的智能农业操作系统，提供从数据接入到决策执行的全链路托管服务。
                </p>
             </div>

             <div className="space-y-8">
                {[
                   { title: "AI 种植模型", desc: "Qwen-Plus 驱动的专家决策系统", icon: Sparkles },
                   { title: "数字孪生看板", desc: "实时映射现实世界的生长状态", icon: Monitor },
                   { title: "多端协同控制", desc: "Web / App / 小程序无缝切换", icon: Smartphone }
                ].map((item, i) => (
                   <div key={i} className="flex items-center gap-6 group/item">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover/item:scale-110 transition-transform border border-blue-500/20">
                         <item.icon className="w-6 h-6" />
                      </div>
                      <div>
                         <div className="text-2xl font-bold text-white mb-1">{item.title}</div>
                         <div className="text-zinc-500 text-lg">{item.desc}</div>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          {/* Right: Hardware Kit */}
          <div className="relative h-full flex flex-col justify-center px-16 group border-l border-white/5 bg-white/[0.01]">
             {/* Background Glow */}
             <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] -z-10 group-hover:bg-emerald-500/10 transition-colors duration-700" />

             <div className="mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-base font-mono tracking-wider mb-6">
                   <Box className="w-4 h-4" />
                   THE BODY
                </div>
                <h3 className="text-6xl font-bold text-white mb-4 font-jinbuti tracking-tight">
                   Intelligent <br/>
                   <span className="text-emerald-400">Hardware Kit</span>
                </h3>
                <p className="text-zinc-400 text-xl leading-relaxed max-w-md">
                   标准化、模块化的智能硬件套件，即插即用，快速构建农业物联网基础设施。
                </p>
             </div>

             <div className="space-y-8">
                {[
                   { title: "工业级传感器", desc: "温湿度 / 光照 / 土壤 / CO₂", icon: Thermometer },
                   { title: "边缘计算网关", desc: "断网续传，本地逻辑执行", icon: Router },
                   { title: "智能控制器", desc: "精准控制水肥机、风机、卷帘", icon: Zap }
                ].map((item, i) => (
                   <div key={i} className="flex items-center gap-6 group/item">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover/item:scale-110 transition-transform border border-emerald-500/20">
                         <item.icon className="w-6 h-6" />
                      </div>
                      <div>
                         <div className="text-2xl font-bold text-white mb-1">{item.title}</div>
                         <div className="text-zinc-500 text-lg">{item.desc}</div>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          {/* Business Model Footer */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center">
             <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <span className="text-zinc-400 text-base">商业模式：</span>
                <span className="text-white font-bold text-lg">SaaS 订阅</span>
                <span className="text-zinc-600">+</span>
                <span className="text-white font-bold text-lg">硬件售卖</span>
             </div>
          </div>
       </div>
    </Slide>,

    // 9. Sensing Layer
    <Slide key="sensing" title="感知层" subtitle="Sensing Layer" step={8}>
       <div className="grid grid-cols-12 gap-16 h-full items-center px-8">
          <div className="col-span-6 space-y-12">
             <div className="relative">
                <span className="text-emerald-500 font-mono tracking-widest uppercase text-base mb-4 block">Data Input</span>
                <h3 className="text-7xl font-bold text-white leading-tight font-jinbuti">
                   让环境变化<br/>
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">“看得见”</span>
                </h3>
             </div>
             
             <p className="text-zinc-400 text-xl leading-relaxed max-w-xl">
                监测不止停留在温湿度与 CO₂，而是进一步把光质纳入评估，使“补光是否补对”成为可量化的决策指标。
             </p>

             <div className="space-y-8">
                {/* Sensor Item 1 */}
                <div className="group">
                   <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4">
                         <Thermometer className="w-8 h-8 text-rose-400" />
                         <span className="text-2xl font-bold text-white">基础环境感知</span>
                      </div>
                      <span className="font-mono text-rose-400/50 text-lg">BASICS</span>
                   </div>
                   <div className="h-px w-full bg-white/10 mb-4 group-hover:bg-rose-500/50 transition-colors" />
                   <div className="flex gap-8 text-zinc-500 font-mono text-base">
                      <span>TEMP</span>
                      <span>HUMIDITY</span>
                      <span>SOIL</span>
                      <span>CO2</span>
                   </div>
                </div>

                {/* Sensor Item 2 */}
                <div className="group">
                   <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4">
                         <Zap className="w-8 h-8 text-emerald-400" />
                         <span className="text-2xl font-bold text-white">全光谱分析</span>
                      </div>
                      <span className="font-mono text-emerald-400/50 text-lg">ADVANCED</span>
                   </div>
                   <div className="h-px w-full bg-white/10 mb-4 group-hover:bg-emerald-500/50 transition-colors" />
                   <div className="flex gap-8 text-zinc-500 font-mono text-base">
                      <span>UVA</span>
                      <span>BLUE</span>
                      <span>GREEN</span>
                      <span>RED</span>
                      <span>IR</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="col-span-6 relative h-full flex items-center justify-center">
             {/* Abstract Sensor Visual */}
             <div className="absolute inset-0 bg-emerald-500/5 rounded-full blur-3xl" />
             <div className="relative z-10 w-full max-w-md aspect-square rounded-full border border-white/5 flex items-center justify-center">
                <div className="absolute inset-0 border border-emerald-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-8 border border-white/10 rounded-full border-dashed animate-[spin_15s_linear_infinite_reverse]" />
                <Mascot pose="sit" className="w-full h-full object-contain scale-110" glowColor="emerald" />
                
                {/* Floating Data Points */}
                <motion.div 
                   animate={{ opacity: [0, 1, 0], y: -20 }}
                   transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                   className="absolute top-0 right-10 text-emerald-400 font-mono text-sm"
                >
                   PPFD: 450
                </motion.div>
                <motion.div 
                   animate={{ opacity: [0, 1, 0], y: -20 }}
                   transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                   className="absolute bottom-10 left-0 text-rose-400 font-mono text-sm"
                >
                   24.5°C
                </motion.div>
             </div>
          </div>
       </div>
    </Slide>,

    // 10. Network Layer
    <Slide key="network" title="传输层" subtitle="Network Layer" step={9}>
       <div className="w-full h-full flex flex-col justify-center px-8 relative">
          
          {/* Background Flow Lines */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
             <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
             <div className="absolute top-[40%] left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent dashed" />
             <div className="absolute top-[60%] left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent dashed" />
          </div>

          <div className="grid grid-cols-3 gap-12 relative z-10">
             
             {/* Node 1: Edge */}
             <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-32 h-32 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center relative group">
                   <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-colors" />
                   <Router className="w-12 h-12 text-blue-400" />
                   <div className="absolute -bottom-2 px-3 py-1 bg-blue-500 text-black font-bold text-base rounded-full">USR-N510</div>
                </div>
                <div>
                   <h3 className="text-3xl font-bold text-white mb-2">边缘汇聚</h3>
                   <p className="text-zinc-400 text-lg">Modbus RTU / RS485</p>
                </div>
             </div>

             {/* Node 2: Transmission (Center) */}
             <div className="flex flex-col items-center justify-center space-y-6 pt-10">
                <div className="flex items-center gap-4 text-emerald-400 font-mono text-xl tracking-widest animate-pulse">
                   <Network className="w-6 h-6" />
                   MQTT STREAM
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                   <motion.div 
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
                   />
                </div>
                <p className="text-zinc-500 text-base">5G / 4G / WiFi High Speed Link</p>
             </div>

             {/* Node 3: Cloud */}
             <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-32 h-32 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center relative group">
                   <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-colors" />
                   <CloudSun className="w-12 h-12 text-purple-400" />
                   <div className="absolute -bottom-2 px-3 py-1 bg-purple-500 text-white font-bold text-base rounded-full">Aliyun IoT</div>
                </div>
                <div>
                   <h3 className="text-3xl font-bold text-white mb-2">云端大脑</h3>
                   <p className="text-zinc-400 text-lg">Data Lake / AI Engine</p>
                </div>
             </div>

          </div>

          <div className="mt-24 grid grid-cols-3 gap-8">
             {[
                { title: "双向通信", desc: "毫秒级指令下发，实时状态反馈" },
                { title: "断点续传", desc: "本地缓存机制，弱网环境不丢包" },
                { title: "安全加密", desc: "全链路 TLS 加密，设备独立鉴权" }
             ].map((item, i) => (
                <div key={i} className="text-center">
                   <h4 className="text-xl font-bold text-white mb-2">{item.title}</h4>
                   <p className="text-zinc-500 text-base">{item.desc}</p>
                </div>
             ))}
          </div>

       </div>
    </Slide>,

    // 11. Platform Layer
    <Slide key="platform" title="平台层" subtitle="Platform Layer" step={10}>
       <div className="w-full h-full flex flex-col items-center justify-center relative">
          
          {/* Central Core Visual */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
             <div className="relative w-64 h-64 flex items-center justify-center">
                <div className="absolute inset-0 border border-emerald-500/30 rounded-full animate-[spin_20s_linear_infinite]" />
                <div className="absolute inset-4 border border-blue-500/30 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                <Brain className="w-24 h-24 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]" />
                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
                   <div className="text-2xl font-bold text-white tracking-widest">AI ENGINE</div>
                   <div className="text-base text-zinc-500 font-mono">Qwen-Plus + YOLOv8</div>
                </div>
             </div>
          </div>

          {/* Radiating Features */}
          <div className="grid grid-cols-3 gap-8 w-full h-full relative z-10 pointer-events-none">
             {/* Left: Data Fusion */}
             <div className="flex flex-col justify-center items-start pl-20 pointer-events-auto">
                <div className="flex items-center gap-4 mb-4 group">
                   <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Layers className="w-8 h-8 text-blue-400" />
                   </div>
                   <div className="h-px flex-1 bg-gradient-to-r from-blue-500/50 to-transparent" />
                </div>
                <h3 className="text-4xl font-bold text-white mb-2">多维数据融合</h3>
                <p className="text-zinc-400 text-lg max-w-xs leading-relaxed">
                   打破数据孤岛，将温湿度、土壤、光照与历史生长数据进行交叉分析。
                </p>
             </div>

             {/* Middle: Empty for Core */}
             <div />

             {/* Right: Execution */}
             <div className="flex flex-col justify-center items-end pr-20 text-right pointer-events-auto">
                <div className="flex items-center gap-4 mb-4 group flex-row-reverse">
                   <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Zap className="w-8 h-8 text-emerald-400" />
                   </div>
                   <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/50 to-transparent" />
                </div>
                <h3 className="text-4xl font-bold text-white mb-2">闭环决策执行</h3>
                <p className="text-zinc-400 text-lg max-w-xs leading-relaxed">
                   识别结果毫秒级转化为控制指令，自动调节风机、卷帘与补光灯。
                </p>
             </div>
          </div>

          {/* Bottom Center: AI Vision (Floating) */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center pointer-events-auto">
             <div className="inline-flex flex-col items-center group">
                <div className="w-px h-16 bg-gradient-to-b from-transparent to-purple-500/50 mb-4" />
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <Monitor className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-4xl font-bold text-white mb-2">视觉病害识别</h3>
                <p className="text-zinc-400 text-lg max-w-md leading-relaxed">
                   基于 YOLOv8 的实时病斑检测，准确率 &gt; 98%。
                </p>
             </div>
          </div>

       </div>
    </Slide>,

    // 12. App Layer - Dashboard
    <Slide key="app_dashboard" title="统一导航 & 看板" subtitle="Dashboard" step={11}>
       <div className="w-full h-full relative flex items-center justify-center">
          
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="grid grid-cols-12 gap-12 w-full px-8 h-full items-center">
             
             {/* Left: Text & Features */}
             <div className="col-span-4 flex flex-col justify-center space-y-10 z-10">
                 <div>
                    <h3 className="text-6xl font-bold text-white mb-6 leading-tight">
                       全局态势<br/>
                       <span className="text-blue-400">一屏尽览</span>
                    </h3>
                    <p className="text-zinc-400 text-xl leading-relaxed">
                       顶部统一导航设计，从“看数据”到“下指令”再到“问助手”无需跳转，沉浸式交互体验。
                    </p>
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-start gap-4">
                       <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                          <LayoutGrid className="w-6 h-6 text-blue-400" />
                       </div>
                       <div>
                          <h4 className="text-2xl font-bold text-white mb-2">卡片化指标</h4>
                          <p className="text-zinc-500 text-lg">扫一眼就知道哪里不对，支持 1h/24h 粒度切换。</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-4">
                       <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Activity className="w-6 h-6 text-emerald-400" />
                       </div>
                       <div>
                          <h4 className="text-2xl font-bold text-white mb-2">实时健康度</h4>
                          <p className="text-zinc-500 text-lg">基于多维数据的作物生长健康评分。</p>
                       </div>
                    </div>
                 </div>
             </div>

             {/* Right: Immersive UI Showcase */}
             <div className="col-span-8 h-[80%] relative group perspective-1000">
                <motion.div 
                   initial={{ rotateY: 10, opacity: 0, x: 50 }}
                   whileInView={{ rotateY: 0, opacity: 1, x: 0 }}
                   transition={{ duration: 0.8 }}
                   className="w-full h-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-900 transform-style-3d"
                >
                   <img src="/ui/dashboard-pc.png" className="w-full h-full object-cover object-top" alt="Dashboard" />
                   
                   {/* HUD Overlay */}
                   <div className="absolute top-8 left-8 flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                   </div>
                   
                   {/* Floating Label */}
                   <motion.div 
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute bottom-10 right-10 px-6 py-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl"
                   >
                      <div className="text-base font-mono text-blue-400 mb-1">VIEW MODE</div>
                      <div className="text-xl font-bold text-white">Dashboard Overview</div>
                   </motion.div>
                </motion.div>
             </div>

          </div>
       </div>
    </Slide>,

    // 13. App Layer - Control
    <Slide key="app_control" title="硬件控制" subtitle="Device Control" step={12}>
       <div className="w-full h-full relative flex items-center justify-center">
          
          <div className="grid grid-cols-12 gap-12 w-full px-8 h-full items-center">
             
             {/* Left: UI Showcase */}
             <div className="col-span-8 h-[80%] relative group perspective-1000 order-last md:order-first">
                <motion.div 
                   initial={{ rotateY: -10, opacity: 0, x: -50 }}
                   whileInView={{ rotateY: 0, opacity: 1, x: 0 }}
                   transition={{ duration: 0.8 }}
                   className="w-full h-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-900 transform-style-3d"
                >
                   <img src="/ui/device-control-pc.png" className="w-full h-full object-cover object-top" alt="Control" />
                   
                   {/* Interactive Overlay Hint */}
                   <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent pointer-events-none" />
                </motion.div>
             </div>

             {/* Right: Features */}
             <div className="col-span-4 flex flex-col justify-center space-y-10 z-10 pl-8">
                 <div>
                    <h3 className="text-6xl font-bold text-white mb-6 leading-tight">
                       所见即所得<br/>
                       <span className="text-purple-400">精准调控</span>
                    </h3>
                    <p className="text-zinc-400 text-xl leading-relaxed">
                       告别复杂的工业参数，像控制智能家居一样管理农业设备。
                    </p>
                 </div>

                 <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-colors group">
                       <Zap className="w-8 h-8 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
                       <h4 className="text-2xl font-bold text-white mb-2">卡片式交互</h4>
                       <p className="text-zinc-500 text-lg">清晰的开关状态反馈，降低误操作风险。</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                       <div className="flex justify-between items-center mb-4">
                          <h4 className="text-2xl font-bold text-white">RGB 补光</h4>
                          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                       </div>
                       <div className="w-full h-2 bg-zinc-800 rounded-full mb-4 overflow-hidden">
                          <div className="w-3/4 h-full bg-gradient-to-r from-red-500 via-green-500 to-blue-500" />
                       </div>
                       <p className="text-zinc-400 text-lg">光谱颜色与亮度无级调节，满足不同生长阶段需求。</p>
                    </div>
                 </div>
             </div>

          </div>
       </div>
    </Slide>,

    // 14. App Layer - Digital Twin
    <Slide key="app_twin" title="数字孪生 & 监控" subtitle="Digital Twin" step={13}>
       <div className="w-full h-full relative flex flex-col justify-center px-12">
          
          <div className="flex items-end justify-between mb-8">
             <div>
                <h3 className="text-5xl font-bold text-white mb-2">3D 全景漫游</h3>
                <p className="text-zinc-400 text-xl">Real-time Digital Twin & AI Monitoring</p>
             </div>
             <div className="flex gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                   <span className="text-red-400 font-bold">LIVE STREAM</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                   <Globe className="w-4 h-4 text-emerald-400" />
                   <span className="text-emerald-400 font-bold">3D VIEW</span>
                </div>
             </div>
          </div>

          <div className="relative w-full flex-1 rounded-3xl overflow-hidden border border-white/10 bg-black group">
             <img src="/ui/monitor-pc.png" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-[1.02]" alt="Monitor" />
             
             {/* HUD Overlays */}
             <div className="absolute inset-0 pointer-events-none">
                {/* Crosshairs */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border border-white/5 rounded-3xl" />
                <div className="absolute top-1/2 left-0 w-8 h-px bg-white/20" />
                <div className="absolute top-1/2 right-0 w-8 h-px bg-white/20" />
                <div className="absolute top-0 left-1/2 w-px h-8 bg-white/20" />
                <div className="absolute bottom-0 left-1/2 w-px h-8 bg-white/20" />

                {/* AI Detection Box */}
                <motion.div 
                   initial={{ opacity: 0, scale: 0.8 }}
                   whileInView={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.5 }}
                   className="absolute top-[30%] right-[20%] w-64 p-4 bg-red-500/10 border border-red-500/50 rounded-xl backdrop-blur-md"
                >
                   <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                         <AlertTriangle className="w-4 h-4 text-red-500" />
                         <span className="text-red-400 font-bold text-base">RISK DETECTED</span>
                      </div>
                      <span className="text-red-500/70 font-mono text-base">98% CONFIDENCE</span>
                   </div>
                   <div className="text-white font-bold text-lg mb-1">白粉病风险</div>
                   <div className="text-zinc-400 text-base">建议立即进行局部喷洒处理</div>
                </motion.div>

                {/* Status Log */}
                <div className="absolute bottom-8 left-8 bg-black/60 backdrop-blur-md rounded-xl p-6 border border-white/10 max-w-sm">
                   <div className="text-base font-mono text-zinc-500 mb-4 uppercase tracking-widest">System Logs</div>
                   <div className="space-y-3 font-mono text-base">
                      <div className="flex gap-4 text-zinc-300">
                         <span className="text-zinc-600">10:42:01</span>
                         <span>Camera_01 connected</span>
                      </div>
                      <div className="flex gap-4 text-zinc-300">
                         <span className="text-zinc-600">10:42:05</span>
                         <span>AI Analysis started...</span>
                      </div>
                      <div className="flex gap-4 text-emerald-400">
                         <span className="text-zinc-600">10:42:12</span>
                         <span>Environment optimal</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

       </div>
    </Slide>,

    // 15. AI Assistant
    <Slide key="ai" title="AI 助手" subtitle="Intelligence" step={14}>
       <div className="w-full h-full relative flex items-center justify-center">
          
          <div className="grid grid-cols-12 gap-16 w-full px-12 h-full items-center">
             
             {/* Left: Conversational UI */}
             <div className="col-span-7 h-[75%] relative flex flex-col justify-end">
                {/* Chat History */}
                <div className="absolute top-0 left-0 right-0 bottom-32 overflow-hidden mask-linear-fade">
                   <div className="flex flex-col justify-end h-full gap-6 pb-4">
                      {/* User Msg 1 */}
                      <motion.div 
                         initial={{ opacity: 0, x: -20 }}
                         whileInView={{ opacity: 1, x: 0 }}
                         className="self-start bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-6 py-4 max-w-lg backdrop-blur-md"
                      >
                         <p className="text-zinc-300 text-lg">这周三号棚的湿度情况怎么样？</p>
                      </motion.div>

                      {/* AI Msg 1 */}
                      <motion.div 
                         initial={{ opacity: 0, x: 20 }}
                         whileInView={{ opacity: 1, x: 0 }}
                         transition={{ delay: 0.2 }}
                         className="self-end bg-emerald-500/10 border border-emerald-500/20 rounded-2xl rounded-tr-none px-6 py-4 max-w-xl backdrop-blur-md"
                      >
                         <div className="flex items-center gap-3 mb-2">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400 font-bold text-base">AI ANALYSIS</span>
                         </div>
                         <p className="text-white text-lg leading-relaxed">
                            过去 7 天，3号棚平均湿度为 78%，周二夜间出现过一次 <span className="text-red-400 font-bold">92%</span> 的高湿峰值。建议调整夜间排风策略。
                         </p>
                         
                         {/* Mini Chart */}
                         <div className="mt-4 h-24 w-full bg-black/20 rounded-lg flex items-end gap-1 p-2">
                            {[40, 60, 45, 92, 55, 65, 50].map((h, i) => (
                               <div key={i} className={`flex-1 rounded-sm ${h > 80 ? 'bg-red-500' : 'bg-emerald-500/50'}`} style={{ height: `${h}%` }} />
                            ))}
                         </div>
                      </motion.div>

                      {/* User Msg 2 */}
                      <motion.div 
                         initial={{ opacity: 0, x: -20 }}
                         whileInView={{ opacity: 1, x: 0 }}
                         transition={{ delay: 0.4 }}
                         className="self-start bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-6 py-4 max-w-lg backdrop-blur-md"
                      >
                         <p className="text-zinc-300 text-lg">帮我生成一份下周的灌溉计划。</p>
                      </motion.div>
                   </div>
                </div>

                {/* Input Area */}
                <div className="h-20 bg-zinc-900/80 border border-white/10 rounded-full flex items-center px-8 gap-4 shadow-2xl relative z-10 backdrop-blur-xl">
                   <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Sparkles className="w-5 h-5 text-black" />
                   </div>
                   <div className="flex-1 text-zinc-500 text-xl font-light">
                      Ask AI anything about your farm...
                   </div>
                   <div className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                      <ArrowRight className="w-6 h-6 text-white" />
                   </div>
                </div>
             </div>

             {/* Right: Feature Highlights */}
             <div className="col-span-5 flex flex-col justify-center space-y-12 pl-12">
                <div>
                   <span className="text-emerald-500 font-mono tracking-widest uppercase text-base mb-4 block">Intelligence</span>
                   <h3 className="text-7xl font-bold text-white mb-6 leading-tight font-jinbuti">
                      不仅仅是工具<br/>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">更是专家</span>
                   </h3>
                   <p className="text-zinc-400 text-xl leading-relaxed">
                      集成 Qwen-Plus 等多模态大模型，无需学习复杂操作，用自然语言即可完成数据查询、诊断与决策。
                   </p>
                </div>

                <div className="space-y-8">
                   <div className="flex items-start gap-6 group">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                         <List className="w-8 h-8 text-emerald-400" />
                      </div>
                      <div>
                         <h4 className="text-2xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">任务化执行</h4>
                         <p className="text-zinc-500 text-lg">"生成周报"、"诊断病害"、"制定计划"，一句话搞定。</p>
                      </div>
                   </div>

                   <div className="flex items-start gap-6 group">
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                         <Brain className="w-8 h-8 text-blue-400" />
                      </div>
                      <div>
                         <h4 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">多模型调度</h4>
                         <p className="text-zinc-500 text-lg">动态调用 Qwen-Plus / DeepSeek / GPT-4o，平衡成本与效能。</p>
                      </div>
                   </div>
                </div>
             </div>

          </div>
       </div>
    </Slide>,

    // 16. Security
    <Slide key="security" title="安全与可靠性" subtitle="Security Architecture" step={15}>
       <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
          
          {/* Background Elements */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
          
          {/* IP Mascot: The Guardian (Left Side) */}
          <div className="absolute left-24 bottom-12 z-10 w-[450px] h-[450px] flex items-center justify-center pointer-events-none">
             {/* Holographic Shield Effect */}
             <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-3xl animate-pulse-slow" />
             <div className="absolute inset-[-20px] border border-emerald-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
             <div className="absolute inset-[-40px] border border-blue-500/10 rounded-full animate-[spin_15s_linear_infinite_reverse] border-dashed" />
             
             {/* Mascot */}
             <Mascot pose="run" className="w-full h-full object-contain drop-shadow-[0_0_50px_rgba(16,185,129,0.4)] relative z-10" glowColor="emerald" />
             
             {/* Floating Badge */}
             <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 right-10 bg-zinc-900/80 backdrop-blur-md border border-emerald-500/30 px-5 py-2 rounded-xl flex items-center gap-3 shadow-xl z-20"
             >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 font-bold text-base tracking-wider">SECURITY GUARD</span>
             </motion.div>
          </div>

          {/* Main Container: 3D Exploded View (Shifted Right) */}
          <div className="relative w-full h-full flex items-center justify-center perspective-[2000px] ml-32">
             
             {/* The Security Stack */}
             <div className="relative transform-style-3d rotate-x-12 -rotate-y-12 rotate-z-0 w-[600px] h-[600px] flex flex-col justify-center items-center gap-16">
                
                {/* Layer 3: Cloud (Top) */}
                <motion.div 
                   initial={{ y: -50, opacity: 0 }}
                   whileInView={{ y: 0, opacity: 1 }}
                   transition={{ delay: 0.4 }}
                   className="relative w-[500px] h-[120px] bg-purple-500/10 border border-purple-500/30 backdrop-blur-md rounded-2xl flex items-center px-8 shadow-[0_20px_50px_rgba(168,85,247,0.15)] group hover:translate-z-10 transition-transform duration-500"
                >
                   <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-16 bg-purple-500 rounded-full" />
                   <div className="w-16 h-16 rounded-xl bg-purple-500/20 flex items-center justify-center mr-6 border border-purple-500/30">
                      <UserCheck className="w-8 h-8 text-purple-400" />
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                         <h3 className="text-2xl font-bold text-white">云端行为审计</h3>
                         <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-base font-mono rounded">CLOUD LAYER</span>
                      </div>
                      <p className="text-zinc-400 text-base">操作日志 100% 留痕，异常行为智能阻断</p>
                   </div>
                   
                   {/* Connection Line Up */}
                   <div className="absolute bottom-0 left-1/2 w-px h-16 bg-gradient-to-b from-purple-500/30 to-blue-500/30 -z-10 translate-y-full" />
                </motion.div>

                {/* Layer 2: Network (Middle) */}
                <motion.div 
                   initial={{ opacity: 0 }}
                   whileInView={{ opacity: 1 }}
                   transition={{ delay: 0.2 }}
                   className="relative w-[500px] h-[120px] bg-blue-500/10 border border-blue-500/30 backdrop-blur-md rounded-2xl flex items-center px-8 shadow-[0_20px_50px_rgba(59,130,246,0.15)] group hover:translate-z-10 transition-transform duration-500"
                >
                   <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-16 bg-blue-500 rounded-full" />
                   <div className="w-16 h-16 rounded-xl bg-blue-500/20 flex items-center justify-center mr-6 border border-blue-500/30">
                      <Lock className="w-8 h-8 text-blue-400" />
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                         <h3 className="text-2xl font-bold text-white">全链路传输加密</h3>
                         <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-base font-mono rounded">NETWORK LAYER</span>
                      </div>
                      <p className="text-zinc-400 text-base">TLS 1.3 隧道加密，杜绝中间人攻击</p>
                   </div>

                   {/* Connection Line Down */}
                   <div className="absolute bottom-0 left-1/2 w-px h-16 bg-gradient-to-b from-blue-500/30 to-emerald-500/30 -z-10 translate-y-full" />
                </motion.div>

                {/* Layer 1: Device (Bottom) */}
                <motion.div 
                   initial={{ y: 50, opacity: 0 }}
                   whileInView={{ y: 0, opacity: 1 }}
                   transition={{ delay: 0 }}
                   className="relative w-[500px] h-[120px] bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md rounded-2xl flex items-center px-8 shadow-[0_20px_50px_rgba(16,185,129,0.15)] group hover:translate-z-10 transition-transform duration-500"
                >
                   <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-16 bg-emerald-500 rounded-full" />
                   <div className="w-16 h-16 rounded-xl bg-emerald-500/20 flex items-center justify-center mr-6 border border-emerald-500/30">
                      <Activity className="w-8 h-8 text-emerald-400" />
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                         <h3 className="text-2xl font-bold text-white">设备健康监测</h3>
                         <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-base font-mono rounded">DEVICE LAYER</span>
                      </div>
                      <p className="text-zinc-400 text-base">心跳实时检测，故障自动降级与熔断保护</p>
                   </div>
                </motion.div>

             </div>

             {/* Right Side: Description */}
             <div className="absolute right-20 top-1/2 -translate-y-1/2 w-80">
                <h3 className="text-5xl font-bold text-white mb-6 leading-tight font-jinbuti">
                   纵深防御<br/>
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-purple-400">立体架构</span>
                </h3>
                <p className="text-zinc-400 text-lg leading-relaxed mb-8">
                   摒弃单点防御，构建从端侧硬件到云端数据的三位一体安全体系。
                </p>
                
                <div className="flex items-center gap-4">
                   <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-xs text-emerald-400">端</div>
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center text-xs text-blue-400">管</div>
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center text-xs text-purple-400">云</div>
                   </div>
                   <div className="text-zinc-500 text-base">Full-Stack Security</div>
                </div>
             </div>

          </div>

       </div>
    </Slide>,

    // 17. Business Model
    <Slide key="business" title="商业模式" subtitle="Business Model" step={16}>
       <div className="w-full h-full relative flex flex-col justify-center overflow-hidden px-8">
          
          {/* Fluid Background */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-b from-emerald-500/10 to-blue-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px]" />

          <div className="mb-12 relative z-10">
             <h3 className="text-6xl font-bold text-white mb-4 font-jinbuti">
                <span className="text-zinc-600">从</span> 硬件销售
                <span className="text-zinc-600"> 到</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">持续服务</span>
             </h3>
             <p className="text-zinc-400 text-xl">构建 "SaaS + Hardware" 双螺旋增长模型</p>
          </div>

          {/* Value Ladder Flow */}
          <div className="relative z-10 grid grid-cols-4 gap-6">
             
             {/* Step 1 */}
             <div className="group relative p-6 rounded-3xl bg-zinc-900/50 border border-white/10 hover:bg-zinc-900 hover:border-blue-500/50 transition-all duration-500">
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-zinc-900 rounded-full border border-white/10 flex items-center justify-center text-xl font-bold text-zinc-500 group-hover:text-blue-400 group-hover:border-blue-500 transition-colors">01</div>
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                   <Box className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">硬件交付</h4>
                <p className="text-zinc-400 text-base leading-relaxed">标准化物联网套件销售，获取一次性硬件收入。</p>
                <div className="mt-4 text-base font-mono text-blue-500 uppercase tracking-wider">Base Revenue</div>
             </div>

             {/* Step 2 */}
             <div className="group relative p-6 rounded-3xl bg-zinc-900/50 border border-white/10 hover:bg-zinc-900 hover:border-emerald-500/50 transition-all duration-500 mt-12">
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-zinc-900 rounded-full border border-white/10 flex items-center justify-center text-xl font-bold text-zinc-500 group-hover:text-emerald-400 group-hover:border-emerald-500 transition-colors">02</div>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                   <RefreshCw className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">软件订阅</h4>
                <p className="text-zinc-400 text-base leading-relaxed">平台年费 + 高级 AI 功能订阅，构建持续现金流。</p>
                <div className="mt-4 text-base font-mono text-emerald-500 uppercase tracking-wider">Recurring</div>
             </div>

             {/* Step 3 */}
             <div className="group relative p-6 rounded-3xl bg-zinc-900/50 border border-white/10 hover:bg-zinc-900 hover:border-purple-500/50 transition-all duration-500 mt-24">
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-zinc-900 rounded-full border border-white/10 flex items-center justify-center text-xl font-bold text-zinc-500 group-hover:text-purple-400 group-hover:border-purple-500 transition-colors">03</div>
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                   <GraduationCap className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">增值服务</h4>
                <p className="text-zinc-400 text-base leading-relaxed">SOP 培训课程、专家远程诊断，提升客户粘性。</p>
                <div className="mt-4 text-base font-mono text-purple-500 uppercase tracking-wider">Value Add</div>
             </div>

             {/* Step 4 */}
             <div className="group relative p-6 rounded-3xl bg-zinc-900/50 border border-white/10 hover:bg-zinc-900 hover:border-rose-500/50 transition-all duration-500 mt-36">
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-zinc-900 rounded-full border border-white/10 flex items-center justify-center text-xl font-bold text-zinc-500 group-hover:text-rose-400 group-hover:border-rose-500 transition-colors">04</div>
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 mb-6 group-hover:scale-110 transition-transform">
                   <TrendingUp className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">数据变现</h4>
                <p className="text-zinc-400 text-base leading-relaxed">行业数据报告、品牌溢价合作，挖掘数据价值。</p>
                <div className="mt-4 text-base font-mono text-rose-500 uppercase tracking-wider">Ecosystem</div>
             </div>

             {/* Connecting Line */}
             <svg className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10 opacity-20" style={{ overflow: 'visible' }}>
                <path d="M100,100 Q400,150 600,300 T1100,500" fill="none" stroke="url(#gradient)" strokeWidth="4" strokeDasharray="10,10" />
                <defs>
                   <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#f43f5e" />
                   </linearGradient>
                </defs>
             </svg>

          </div>
          
          {/* Revenue Mix Indicator */}
          <div className="absolute bottom-8 right-8 flex items-center gap-8 bg-zinc-900/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
             <div className="text-base font-mono text-zinc-500 uppercase tracking-widest mr-4">Revenue Mix Target (2030)</div>
             <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-blue-500" />
                 <span className="text-zinc-400 text-base">Hardware 30%</span>
             </div>
             <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-emerald-500" />
                 <span className="text-emerald-400 font-bold text-base">SaaS & Services 70%</span>
             </div>
          </div>

       </div>
    </Slide>,

    // 18. Finance & Marketing
    <Slide key="finance" title="财务与营销" subtitle="Finance & Strategy" step={17}>
       <div className="w-full h-full relative flex items-center justify-center px-12">
          {/* Background */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-b from-emerald-500/5 to-blue-500/5 rounded-full blur-[120px]" />

          <div className="grid grid-cols-12 gap-16 w-full h-full items-center">
             
             {/* Left: Financial Projections (Hero Style) */}
             <div className="col-span-5 flex flex-col justify-center relative">
                {/* Hero Metric */}
                <div className="mb-12">
                   <div className="text-zinc-500 text-base font-mono uppercase tracking-widest mb-2">Annual Value Per User</div>
                   <div className="flex items-baseline gap-2">
                      <span className="text-8xl font-bold text-white tracking-tighter font-jinbuti">¥12,000</span>
                      <span className="text-4xl text-emerald-400 font-bold">+</span>
                   </div>
                   <div className="h-px w-32 bg-emerald-500/50 mt-6 mb-6" />
                   <p className="text-zinc-400 text-xl leading-relaxed">
                      通过精准水肥与病害减少，<br/>为每户农户带来的直接年增收。
                   </p>
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 gap-8">
                   <div>
                      <div className="text-5xl font-bold text-white mb-1">2027</div>
                      <div className="text-zinc-500 text-sm uppercase tracking-wider">Break-even Point</div>
                   </div>
                   <div>
                      <div className="text-5xl font-bold text-white mb-1">20%<span className="text-2xl align-top text-blue-400">+</span></div>
                      <div className="text-zinc-500 text-sm uppercase tracking-wider">Net Profit Margin</div>
                   </div>
                </div>

                {/* Decorative Trend Line */}
                <svg className="absolute -bottom-20 -left-20 w-[150%] h-[300px] pointer-events-none opacity-20" viewBox="0 0 400 200">
                   <path d="M0,200 Q100,150 200,100 T400,0" fill="none" stroke="url(#finance-gradient)" strokeWidth="2" />
                   <defs>
                      <linearGradient id="finance-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                         <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                         <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
                      </linearGradient>
                   </defs>
                </svg>
             </div>

             {/* Divider */}
             <div className="col-span-1 h-2/3 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent mx-auto" />

             {/* Right: 4P Strategy (Apple Spec Sheet Style) */}
             <div className="col-span-6 flex flex-col justify-center">
                <div className="mb-10">
                   <h3 className="text-4xl font-bold text-white mb-2">Go-to-Market Strategy</h3>
                   <p className="text-zinc-500 text-lg">基于 4P 理论的市场切入路径</p>
                </div>

                <div className="space-y-0">
                   {[
                      { label: "Product", title: "极致易用", desc: "零学习成本，像家电一样简单可靠", icon: Box, color: "text-blue-400" },
                      { label: "Price", title: "高性价比", desc: "补贴后千元级投入，一季回本", icon: Coins, color: "text-emerald-400" },
                      { label: "Place", title: "贴近终端", desc: "村级服务站驻点，手把手教学", icon: MapPin, color: "text-purple-400" },
                      { label: "Promotion", title: "信任传递", desc: "示范户带动 + 免费试用策略", icon: Users, color: "text-rose-400" }
                   ].map((item, i) => (
                      <div key={i} className="group flex items-center gap-8 py-8 border-b border-white/5 hover:bg-white/[0.02] transition-colors px-4 -mx-4 rounded-xl">
                         <div className={`w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${item.color}`}>
                            <item.icon className="w-6 h-6" />
                         </div>
                         <div className="w-32 shrink-0">
                            <div className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-1">{item.label}</div>
                            <div className="text-xl font-bold text-white">{item.title}</div>
                         </div>
                         <div className="flex-1 text-zinc-400 text-lg leading-relaxed group-hover:text-zinc-300 transition-colors">
                            {item.desc}
                         </div>
                      </div>
                   ))}
                </div>
             </div>

          </div>
       </div>
    </Slide>,

    // 19. Roadmap
    <Slide key="roadmap" title="实施计划" subtitle="Roadmap" step={18}>
       <div className="grid grid-cols-12 gap-8 h-full items-center">
          <div className="col-span-8 relative pl-10">
             <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
             
             <div className="space-y-12">
                <motion.div initial={{ x: -20, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="relative">
                   <div className="absolute -left-[45px] top-1 w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-black shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                   <div className="text-lg text-emerald-400 font-mono mb-2">2025 - 2027</div>
                   <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <h3 className="text-4xl font-bold text-white mb-2">第一阶段：深耕浙江，打造样板</h3>
                      <p className="text-zinc-400">验证技术模型，建立行业标准，覆盖 1.5 万亩。</p>
                   </div>
                </motion.div>
                
                <motion.div initial={{ x: -20, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="relative">
                   <div className="absolute -left-[45px] top-1 w-5 h-5 rounded-full bg-blue-500 ring-4 ring-black shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
                   <div className="text-lg text-blue-400 font-mono mb-2">2027 - 2029</div>
                   <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <h3 className="text-4xl font-bold text-white mb-2">第二阶段：北上南下，全域复制</h3>
                      <p className="text-zinc-400">跨区域扩张，覆盖长三角、珠三角，目标 8 万亩。</p>
                   </div>
                </motion.div>
                
                <motion.div initial={{ x: -20, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="relative">
                   <div className="absolute -left-[45px] top-1 w-5 h-5 rounded-full bg-purple-500 ring-4 ring-black shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
                   <div className="text-lg text-purple-400 font-mono mb-2">2029 - Future</div>
                   <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <h3 className="text-4xl font-bold text-white mb-2">第三阶段：一带一路，技术出海</h3>
                      <p className="text-zinc-400">输出行业标准，全球布局，目标 25 万亩。</p>
                   </div>
                </motion.div>
             </div>
          </div>
          
          <div className="col-span-4 flex items-center justify-center relative">
             <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-3xl scale-75" />
             <Mascot pose="run" className="w-full h-full object-contain scale-110" glowColor="blue" />
          </div>
       </div>
    </Slide>,

    // 19. Supporting Materials
    <Slide key="supporting" title="实力佐证" subtitle="Credentials" step={18}>
       <div className="flex h-full gap-8">
          {/* Left: Navigation */}
          <div className="w-64 flex flex-col gap-2 shrink-0">
             {[
                { id: "awards", label: "荣誉奖项", icon: Award },
                { id: "copyrights", label: "软著专利", icon: ShieldCheck },
                { id: "partners", label: "合作意向", icon: Users },
                { id: "research", label: "调研实证", icon: Search }
             ].map(tab => (
                <button
                   key={tab.id}
                   onClick={() => setSupportTab(tab.id)}
                   className={`
                      flex items-center gap-3 px-4 py-4 rounded-xl text-left transition-all border
                      ${supportTab === tab.id 
                         ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20" 
                         : "bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white"}
                   `}
                >
                   <tab.icon className="w-5 h-5" />
                   <span className="font-bold">{tab.label}</span>
                </button>
             ))}
             
             <div className="mt-auto p-4 rounded-xl bg-gradient-to-br from-zinc-900 to-black border border-white/5 text-center">
                <div className="text-5xl font-bold text-white font-jinbuti mb-1">20+</div>
                <div className="text-base text-zinc-500">累计获得奖项与认证</div>
             </div>
          </div>

          {/* Right: Content Area */}
          <div className="flex-1 bg-zinc-900/50 rounded-2xl border border-white/10 p-6 relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('/ip/noise.png')] opacity-20 pointer-events-none" />
             
             <AnimatePresence mode="wait">
                {supportTab === "awards" && (
                   <motion.div 
                      key="awards"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-3 gap-6 h-full"
                   >
                      {[
                         { src: "/作证材料/一、团队成员竞赛获奖证书/2025 年全国大学生物联网设计竞赛全国总决赛一等奖证书.jpg", title: "物联网设计竞赛一等奖" },
                         { src: "/作证材料/一、团队成员竞赛获奖证书/中国移动杯・第一届浙江省大学生人工智能竞赛二等奖证书.jpg", title: "人工智能竞赛二等奖" },
                         { src: "/作证材料/一、团队成员竞赛获奖证书/全国大学生物联网设计竞赛广和通赛题方向企业现金奖证书.jpg", title: "广和通企业特别奖" }
                      ].map((img, i) => (
                         <div key={i} className="group relative rounded-xl overflow-hidden border border-white/10 bg-black">
                            <img src={img.src} className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" alt={img.title} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                               <div className="text-lg font-bold text-white">{img.title}</div>
                            </div>
                         </div>
                      ))}
                   </motion.div>
                )}

                {supportTab === "copyrights" && (
                   <motion.div 
                      key="copyrights"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-2 gap-8 h-full"
                   >
                      {[
                         { src: "/作证材料/二、软件著作权登记受理通知书/基于 Node-RED 的草莓智慧种植监控系统 V1.0 软件著作权登记受理通知书.jpg", title: "Node-RED 监控系统 V1.0" },
                         { src: "/作证材料/二、软件著作权登记受理通知书/草莓农场 AI 管理系统 V1.3 软件著作权登记受理通知书.jpg", title: "AI 管理系统 V1.3" }
                      ].map((img, i) => (
                         <div key={i} className="group relative rounded-xl overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                            <img src={img.src} className="h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" alt={img.title} />
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-black/80 backdrop-blur-sm border-t border-white/10">
                               <div className="text-center font-bold text-white">{img.title}</div>
                            </div>
                         </div>
                      ))}
                   </motion.div>
                )}

                {supportTab === "partners" && (
                   <motion.div 
                      key="partners"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-3 gap-4 h-full overflow-y-auto pr-2 custom-scrollbar"
                   >
                      {[
                         "宁波中易电子科技有限公司(1)haoliang_01.png",
                         "宁波中易电子科技有限公司(1)haoliang_02.png",
                         "宁波中易电子科技有限公司(1)haoliang_03.png",
                         "宁波皓量云擎网络科技有限公司_01.png",
                         "宁波皓量云擎网络科技有限公司_02.png",
                         "宁波皓量云擎网络科技有限公司_03.png",
                         "湖州市迁奕软件科技有限责任公司(1)haoliang_01.png",
                         "湖州市迁奕软件科技有限责任公司(1)haoliang_02.png",
                         "湖州市迁奕软件科技有限责任公司(1)haoliang_03.png"
                      ].map((file, i) => (
                         <div key={i} className="aspect-[3/4] rounded-lg overflow-hidden border border-white/10 bg-white hover:border-emerald-500 transition-colors">
                            <img src={`/作证材料/三、合作意向书/${file}`} className="w-full h-full object-contain" alt="Partner" />
                         </div>
                      ))}
                   </motion.div>
                )}

                {supportTab === "research" && (
                   <motion.div 
                      key="research"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-2 gap-8 h-full pb-4"
                   >
                      <div className="flex flex-col gap-6 h-full">
                         <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 relative group">
                            <img src="/作证材料/六、项目调研/宁波大龙农业科技园调研1.jpg" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Research" />
                            <div className="absolute bottom-4 left-4 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10">
                               <div className="text-lg font-bold text-white">宁波大龙农业科技园调研</div>
                            </div>
                         </div>
                         <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 relative group">
                             <img src="/作证材料/六、项目调研/trae线下交流学习2.jpg" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Research" />
                             <div className="absolute bottom-4 left-4 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10">
                                <div className="text-lg font-bold text-white">Trae 线下交流学习</div>
                             </div>
                         </div>
                      </div>
                      <div className="h-full rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/50 p-4 relative">
                         <div className="w-full h-full bg-white rounded-xl overflow-hidden flex items-center justify-center">
                            <img src="/作证材料/四、草莓种植农户技术调研问卷/草莓种植农户技术调研问卷_01.png" className="w-full h-full object-contain" alt="Survey" />
                         </div>
                      </div>
                   </motion.div>
                )}
             </AnimatePresence>
          </div>
       </div>
    </Slide>,

        // 20. Team & Advisors
    <Slide key="team" title="核心团队 & 顾问" subtitle="Team & Advisors" step={19} hideFooter>
       <div className="h-full flex flex-col justify-center items-center gap-12 px-12">
          
          <div className="grid grid-cols-3 gap-10 w-full max-w-7xl">
             {/* 1. Project Lead */}
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5 }}
               className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 rounded-3xl p-8 transition-all duration-500"
             >
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                   <div className="w-40 h-40 rounded-full p-1 border-2 border-emerald-500/30 mb-6 relative group-hover:scale-105 transition-transform duration-500">
                      <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                         <img src="/顾问团队/weng-tianfang.png" className="w-full h-full object-cover" alt="Weng Tianfang" />
                      </div>
                      <div className="absolute bottom-2 right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-black border-2 border-[#050505]">
                         <Rocket className="w-5 h-5" />
                      </div>
                   </div>
                   
                   <h3 className="text-4xl font-bold text-white mb-2">翁天芳</h3>
                   <p className="text-emerald-400 font-mono uppercase tracking-widest text-base mb-6">天能控股集团产融事业部总裁</p>
                   
                   <div className="w-full h-px bg-white/10 mb-6" />
                   
                   <div className="space-y-4 w-full text-left">
                      <div>
                         <p className="text-zinc-500 text-base font-mono uppercase mb-1">Focus Area</p>
                         <p className="text-zinc-300 text-lg">产业金融与战略投资</p>
                      </div>
                      <div>
                         <p className="text-zinc-500 text-base font-mono uppercase mb-1">Description</p>
                         <p className="text-zinc-400 text-base leading-relaxed">
                            拥有丰富的集团化管理经验，主导多项重大产业投资与金融布局，为 Stravision 提供宏观战略指引与资源赋能。
                         </p>
                      </div>
                   </div>
                </div>
             </motion.div>

             {/* 2. Advisor */}
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, delay: 0.2 }}
               className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-3xl p-8 transition-all duration-500"
             >
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                   <div className="w-40 h-40 rounded-full p-1 border-2 border-blue-500/30 mb-6 relative group-hover:scale-105 transition-transform duration-500">
                      <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                         <img src="/顾问团队/joanne-zhou.jpg" className="w-full h-full object-cover" alt="Joanne Zhou" />
                      </div>
                      <div className="absolute bottom-2 right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-black border-2 border-[#050505]">
                         <Award className="w-5 h-5" />
                      </div>
                   </div>
                   
                   <h3 className="text-4xl font-bold text-white mb-2">Joanne Zhou</h3>
                   <p className="text-blue-400 font-mono uppercase tracking-widest text-base mb-6">巴西Corttex集团亚洲区总经理</p>
                   
                   <div className="w-full h-px bg-white/10 mb-6" />
                   
                   <div className="space-y-4 w-full text-left">
                      <div>
                         <p className="text-zinc-500 text-base font-mono uppercase mb-1">Focus Area</p>
                         <p className="text-zinc-300 text-lg">全球供应链与跨国贸易</p>
                      </div>
                      <div>
                         <p className="text-zinc-500 text-base font-mono uppercase mb-1">Description</p>
                         <p className="text-zinc-400 text-base leading-relaxed">
                            深耕跨国贸易与供应链管理多年，具备卓越的全球视野与市场开拓能力，助力项目拓展国际市场版图。
                         </p>
                      </div>
                   </div>
                </div>
             </motion.div>

             {/* 3. R&D Team */}
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, delay: 0.4 }}
               className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-3xl p-8 transition-all duration-500"
             >
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                   <div className="w-40 h-40 rounded-full p-1 border-2 border-purple-500/30 mb-6 relative group-hover:scale-105 transition-transform duration-500">
                      <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
                         <Users className="w-16 h-16 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                      </div>
                      <div className="absolute bottom-2 right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-black border-2 border-[#050505]">
                         <Zap className="w-5 h-5" />
                      </div>
                   </div>
                   
                   <h3 className="text-4xl font-bold text-white mb-2">Stravision Team</h3>
                   <p className="text-purple-400 font-mono uppercase tracking-widest text-base mb-6">Student Innovation Team</p>
                   
                   <div className="w-full h-px bg-white/10 mb-6" />
                   
                   <div className="space-y-4 w-full text-left">
                      <div>
                         <p className="text-zinc-500 text-base font-mono uppercase mb-1">Focus Area</p>
                         <p className="text-zinc-300 text-lg">软硬件协同与创新实践</p>
                      </div>
                      <div>
                         <p className="text-zinc-500 text-base font-mono uppercase mb-1">Description</p>
                         <p className="text-zinc-400 text-base leading-relaxed">
                            来自计算机网络技术的学生团队，怀揣用技术改变农业的梦想，在实践中探索 AIoT 的无限可能。
                         </p>
                      </div>
                   </div>
                </div>
             </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex justify-between items-end w-full max-w-7xl border-t border-white/10 pt-8"
          >
             <div>
                <div className="text-5xl font-bold text-white mb-2">Thank You</div>
                <div className="text-zinc-500 text-lg">for your attention</div>
             </div>
             <div className="text-right">
                <div className="text-emerald-400 font-mono text-3xl">contact@stravision.com</div>
                <div className="text-zinc-600 text-lg mt-2">© 2026 Stravision TEAM.</div>
             </div>
          </motion.div>
       </div>
    </Slide>
  ]

  const totalSlides = slides.length

  const nextSlide = () => setCurrentSlide(prev => Math.min(prev + 1, totalSlides - 1))
  const prevSlide = () => setCurrentSlide(prev => Math.max(prev - 1, 0))

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") nextSlide()
      if (e.key === "ArrowLeft") prevSlide()
      if (e.key === "e") setIsExportMode(prev => !prev)
      if (e.key === "h") setHideUI(prev => !prev)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  if (isExportMode) {
    return (
      <div className="bg-black min-h-screen flex flex-col items-center py-10 gap-10">
         {slides.map((slide, index) => (
            <div key={index} className="w-[1920px] h-[1080px] relative bg-black border border-zinc-800 overflow-hidden shrink-0 shadow-2xl">
               {slide}
            </div>
         ))}
      </div>
    )
  }

  return (
    <div className={`w-screen h-screen bg-black overflow-hidden relative ${hideUI ? 'cursor-none' : ''}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          className="w-full h-full"
          initial={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
          transition={{ duration: 0.6, ease: "circOut" }}
        >
          {slides[currentSlide]}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      {!hideUI && (
        <div className="absolute bottom-8 right-12 z-50 flex gap-4">
          <button 
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white disabled:opacity-30 transition-all backdrop-blur-md border border-white/5"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextSlide}
            disabled={currentSlide === totalSlides - 1}
            className="p-3 rounded-full bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 hover:text-emerald-300 disabled:opacity-30 transition-all backdrop-blur-md border border-emerald-500/20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
      
      {/* Progress Bar */}
      {!hideUI && (
        <div className="absolute bottom-0 left-0 h-1 bg-zinc-900 w-full z-50">
           <motion.div 
             className="h-full bg-emerald-500"
             initial={{ width: "0%" }}
             animate={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
             transition={{ duration: 0.5 }}
           />
        </div>
      )}
    </div>
  )
}
