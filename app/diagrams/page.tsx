"use client"

import { motion } from "framer-motion"
import { SystemArchitectureDiagram } from "@/components/diagrams/system-architecture-diagram"
import { AIAgentFlowDiagram } from "@/components/diagrams/ai-agent-flow-diagram"
import Link from "next/link"
import { ArrowLeft, Layout, Bot, Info, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from "react"

const GridBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none">
    <div className="absolute inset-0 bg-[#020202]" />
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
    <div 
      className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
      style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
      }} 
    />
  </div>
)

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
}

export default function DiagramsPage() {
  const [activeTab, setActiveTab] = useState("architecture")

  return (
    <div className="min-h-screen relative overflow-x-hidden text-zinc-100 font-sans selection:bg-primary/30 bg-[#050505]">
      <GridBackground />
      
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed top-[30%] right-[-20%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <main className="relative z-10 min-h-screen flex flex-col">
        <header className="px-6 md:px-12 py-6 flex items-center justify-between backdrop-blur-sm sticky top-0 z-50 border-b border-white/5 bg-black/20">
          <Link 
            href="/docs" 
            className="group flex items-center gap-2 text-zinc-500 hover:text-emerald-400 transition-colors text-sm font-mono uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            返回文档
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              <span className="w-1 h-1 bg-primary rounded-full animate-pulse" />
              <span className="w-1 h-1 bg-primary rounded-full animate-pulse delay-75" />
              <span className="w-1 h-1 bg-primary rounded-full animate-pulse delay-150" />
            </div>
            <span className="text-xs font-mono text-primary/50 uppercase tracking-widest hidden md:block">
              Interactive Diagrams
            </span>
          </div>
        </header>

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="flex-1 flex flex-col items-center justify-start p-4 md:p-8 space-y-8"
        >
          <motion.div variants={fadeInUp} className="text-center max-w-4xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Badge variant="outline" className="bg-primary/10 text-emerald-400 border-primary/30">
                v1.0
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                Interactive
              </Badge>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">
              系统可视化图表
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              交互式系统架构图与 AI Agent 流程图，支持缩放、平移与流程模拟
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className="w-full max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <div className="flex justify-center">
                <TabsList className="bg-zinc-900/60 border border-white/10 backdrop-blur-xl p-1 rounded-xl">
                  <TabsTrigger 
                    value="architecture"
                    className="data-[state=active]:bg-primary/20 data-[state=active]:text-emerald-400 px-6 py-3 rounded-lg transition-all"
                  >
                    <Layout className="w-4 h-4 mr-2" />
                    系统架构图
                  </TabsTrigger>
                  <TabsTrigger 
                    value="agent"
                    className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 px-6 py-3 rounded-lg transition-all"
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    AI Agent 流程图
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="architecture" className="mt-0 outline-none animate-in fade-in-50 duration-300">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="mb-4 flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Info className="w-4 h-4" />
                      <span>支持鼠标滚轮缩放、拖拽平移</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs text-zinc-500">实时状态</span>
                    </div>
                  </div>
                  <SystemArchitectureDiagram />
                </motion.div>
              </TabsContent>

              <TabsContent value="agent" className="mt-0 outline-none animate-in fade-in-50 duration-300">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="mb-4 flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Info className="w-4 h-4" />
                      <span>点击"模拟流程"按钮查看 Agent 执行路径</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                      <span className="text-xs text-zinc-500">可交互</span>
                    </div>
                  </div>
                  <AIAgentFlowDiagram />
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.div>

          <motion.div variants={fadeInUp} className="w-full max-w-7xl mx-auto mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Layout className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">系统架构图说明</h3>
                </div>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>展示平台六层架构：前端、网关、服务、数据、外部服务、设备层</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>彩色连线表示数据流向与依赖关系</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>支持缩放、平移、小地图导航</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <Bot className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">AI Agent 流程图说明</h3>
                </div>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                    <span>展示 AI Agent 从触发到输出的完整决策路径</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                    <span>包含条件分支、错误处理、会话循环等关键逻辑</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                    <span>支持流程模拟动画，直观展示执行过程</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="w-full max-w-7xl mx-auto">
            <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          </motion.div>
        </motion.div>
        
        <footer className="px-6 md:px-12 py-6 flex justify-between items-center border-t border-white/5 bg-black/20 backdrop-blur-md">
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
            Stravision IoT Platform // Interactive Diagrams
          </p>
          <p className="text-[10px] text-zinc-700 font-mono uppercase tracking-widest hidden md:block">
            Powered by @xyflow/react
          </p>
        </footer>
      </main>
    </div>
  )
}
