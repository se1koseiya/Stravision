"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import { 
  ArrowRight, Sparkles, Zap, Shield, Share2, Globe, Database, 
  Cpu, Activity, Check, Code, Rocket, Terminal, Box, Layers
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CustomCursor } from "@/components/custom-cursor"
import { cn } from "@/lib/utils"

// --- Animations ---
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3
    }
  }
}

const BentoCard = ({ children, className, delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.5, delay }}
    className={cn(
      "bg-white/5 border border-white/10 backdrop-blur-sm p-6 relative overflow-hidden group hover:border-primary/30 transition-all duration-500",
      className
    )}
  >
    {/* Noise Texture */}
    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay pointer-events-none" />
    
    {/* Hover Glow */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

    {children}
  </motion.div>
)

export default function MCPPromoPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-[#020202] text-white font-jinbuti selection:bg-primary/30 selection:text-emerald-50 cursor-none overflow-x-hidden">
      <CustomCursor />

      {/* Global Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] opacity-20" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center mix-blend-difference">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
           <div className="size-8 relative">
              <Image src="/logo.png" alt="Logo" fill className="object-contain grayscale" />
           </div>
           <span className="font-bold tracking-[0.2em] text-sm text-white/80 font-mono hidden sm:inline-block">STRAVISION OS</span>
        </div>
        <Button 
          variant="outline"
          className="rounded-full border-white/20 bg-white/5 hover:bg-white/10 hover:text-white backdrop-blur-md px-6 font-mono text-xs"
          onClick={() => router.push('/mcp-store')}
        >
          OPEN STORE
        </Button>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 pt-20 pb-10 z-10 overflow-hidden">
         <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Content */}
            <motion.div 
               initial="hidden" 
               animate="visible" 
               variants={staggerContainer}
               className="space-y-8 relative z-20"
            >
               <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-emerald-400 text-xs font-mono backdrop-blur-md">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  MCP PROTOCOL LIVE
               </motion.div>

               <motion.h1 variants={fadeInUp} className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 font-jinbuti">
                  BREAK <br/>
                  THE <br/>
                  <span className="text-primary">LIMITS.</span>
               </motion.h1>

               <motion.p variants={fadeInUp} className="text-xl text-white/60 max-w-lg font-light leading-relaxed border-l-2 border-primary/50 pl-6">
                  Model Context Protocol (MCP) 让 AI 真正拥有了双手。
                  <br/>
                  打破应用孤岛，构建属于未来的智能互联生态。
               </motion.p>

               <motion.div variants={fadeInUp} className="flex flex-wrap gap-4 pt-4">
                  <Button 
                    size="lg" 
                    className="h-16 px-10 bg-primary hover:bg-primary text-white font-bold text-lg rounded-none w-full sm:w-auto transition-all group relative overflow-hidden"
                    onClick={() => router.push('/mcp-store')}
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative z-10 flex items-center gap-2">
                       EXPLORE MCP <ArrowRight className="size-5" />
                    </span>
                  </Button>
               </motion.div>
            </motion.div>

            {/* Right Visual */}
            <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ duration: 1, ease: "easeOut" }}
               className="relative h-[600px] w-full hidden lg:flex items-center justify-center"
            >
               {/* Abstract Tech Circle */}
               <div className="absolute inset-0 border border-white/5 rounded-full animate-[spin_60s_linear_infinite]" />
               <div className="absolute inset-[10%] border border-white/5 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
               <div className="absolute inset-[20%] border border-primary/10 rounded-full animate-[spin_20s_linear_infinite]" />
               
               {/* IP Character - Jumping Out */}
               <div className="relative w-[500px] h-[500px] z-10">
                  <Image 
                     src="/ip/草莓头IP-跳跃姿势.png" 
                     alt="Jumping IP" 
                     fill 
                     className="object-contain drop-shadow-[0_20px_50px_rgba(16,185,129,0.3)] animate-float"
                     priority
                  />
                  
                  {/* Floating UI Elements around IP */}
                  <motion.div 
                     animate={{ y: [0, -20, 0] }} 
                     transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                     className="absolute -right-10 top-20 bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl"
                  >
                     <Database className="size-6 text-emerald-400 mb-2" />
                     <div className="h-1 w-12 bg-white/20 rounded-full mb-1" />
                     <div className="h-1 w-8 bg-white/10 rounded-full" />
                  </motion.div>

                  <motion.div 
                     animate={{ y: [0, 20, 0] }} 
                     transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                     className="absolute -left-0 bottom-20 bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl"
                  >
                     <Code className="size-6 text-blue-400 mb-2" />
                     <div className="h-1 w-16 bg-white/20 rounded-full mb-1" />
                     <div className="h-1 w-10 bg-white/10 rounded-full" />
                  </motion.div>
               </div>
            </motion.div>
         </div>
         
         {/* Scroll Indicator */}
         <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20"
         >
            <span className="text-[10px] font-mono tracking-widest uppercase">Scroll</span>
            <div className="w-px h-12 bg-gradient-to-b from-white/0 via-white/50 to-white/0" />
         </motion.div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-32 px-6 relative z-10">
         <div className="max-w-7xl mx-auto">
            <div className="mb-16">
               <h2 className="text-4xl md:text-5xl font-bold mb-6 font-jinbuti">生态核心</h2>
               <div className="h-1 w-20 bg-primary" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-auto md:h-[600px]">
               {/* Main Large Card */}
               <BentoCard className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-white/5 to-emerald-900/10">
                  <div className="h-full flex flex-col justify-between relative z-10">
                     <div>
                        <div className="size-12 bg-primary text-black flex items-center justify-center rounded-lg mb-6">
                           <Globe className="size-6" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4">万物互联协议</h3>
                        <p className="text-white/60 max-w-md leading-relaxed">
                           MCP 就像是 AI 时代的 USB 标准。无论您的数据存储在本地文件、数据库，还是云端服务中，MCP 都能让 AI 安全、受控地访问它们。
                        </p>
                     </div>
                     <div className="relative mt-8 h-48 w-full bg-black/40 rounded-lg border border-white/5 overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="relative size-32">
                              <div className="absolute inset-0 border-2 border-primary/30 rounded-full animate-ping-slow" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="size-4 bg-primary rounded-full shadow-[0_0_20px_rgba(16,185,129,0.8)]" />
                              </div>
                              {/* Orbiting dots */}
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-3 bg-white rounded-full animate-orbit" />
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 size-3 bg-blue-500 rounded-full animate-orbit animation-delay-1000" />
                              <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 size-3 bg-purple-500 rounded-full animate-orbit animation-delay-2000" />
                           </div>
                        </div>
                     </div>
                  </div>
               </BentoCard>

               {/* Side Card 1 */}
               <BentoCard delay={0.2} className="bg-[#0A0A0A]">
                  <Zap className="size-8 text-yellow-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2">毫秒级响应</h3>
                  <p className="text-sm text-white/50">
                     基于本地管道的高速通信，告别网络延迟，体验实时的 AI 交互快感。
                  </p>
               </BentoCard>

               {/* Side Card 2 */}
               <BentoCard delay={0.3} className="bg-[#0A0A0A]">
                  <Shield className="size-8 text-blue-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2">隐私安全</h3>
                  <p className="text-sm text-white/50">
                     您的数据从未离开本地环境。AI 仅在您授权的范围内进行操作，安全可控。
                  </p>
               </BentoCard>

                {/* Wide Bottom Card */}
               <BentoCard delay={0.4} className="md:col-span-3 bg-gradient-to-r from-purple-900/10 to-blue-900/10 flex items-center justify-between group">
                  <div className="max-w-xl">
                     <div className="flex items-center gap-3 mb-3">
                        <Code className="size-6 text-purple-400" />
                        <h3 className="text-2xl font-bold">开发者友好</h3>
                     </div>
                     <p className="text-white/60">
                        只需简单的几行代码，即可将您的 API 转换为 MCP Server。支持 TypeScript, Python 等主流语言。
                     </p>
                  </div>
                  <Button variant="ghost" className="hidden md:flex gap-2 group-hover:translate-x-2 transition-transform">
                     查看文档 <ArrowRight className="size-4" />
                  </Button>
               </BentoCard>
            </div>
         </div>
      </section>

      {/* Tech Showcase */}
      <section className="py-20 px-6 relative z-10 bg-white/[0.02]">
         <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1 relative">
               {/* Terminal Window */}
               <div className="bg-[#1e1e1e] rounded-lg shadow-2xl border border-white/10 overflow-hidden font-mono text-sm relative z-10">
                  <div className="bg-[#2d2d2d] px-4 py-2 flex items-center gap-2 border-b border-white/5">
                     <div className="flex gap-1.5">
                        <div className="size-3 rounded-full bg-[#ff5f56]" />
                        <div className="size-3 rounded-full bg-[#ffbd2e]" />
                        <div className="size-3 rounded-full bg-[#27c93f]" />
                     </div>
                     <div className="ml-4 text-white/40 text-xs">spectrum-mcp — zsh — 80x24</div>
                  </div>
                  <div className="p-6 text-white/80 space-y-2">
                     <div className="flex gap-2">
                        <span className="text-emerald-400">➜</span>
                        <span className="text-blue-400">~</span>
                        <span>uvx mcp-server-spectrum-stravision</span>
                     </div>
                     <div className="text-white/50 pt-2">
                        [INFO] Starting Spectrum MCP Server...<br/>
                        [INFO] Connected to device: Stravision-X1<br/>
                        [INFO] Server listening on stdio<br/>
                        <span className="text-emerald-400">[SUCCESS] Ready to process requests</span>
                     </div>
                     <div className="flex gap-2 pt-4 animate-pulse">
                        <span className="text-emerald-400">➜</span>
                        <span className="text-blue-400">~</span>
                        <span className="w-2 h-5 bg-white/50 block" />
                     </div>
                  </div>
               </div>

               {/* Decorative Elements */}
               <div className="absolute -top-10 -right-10 size-40 bg-primary/20 rounded-full blur-3xl -z-10" />
               <div className="absolute -bottom-10 -left-10 size-40 bg-blue-500/20 rounded-full blur-3xl -z-10" />
               
               {/* IP Character - Sitting */}
               <div className="absolute -right-20 -bottom-20 w-64 h-64 pointer-events-none hidden md:block">
                  <Image 
                     src="/ip/草莓头IP-坐姿玩手机.png" 
                     alt="Sitting IP" 
                     fill 
                     className="object-contain drop-shadow-2xl"
                  />
               </div>
            </div>

            <div className="order-1 lg:order-2">
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 text-purple-400 text-xs font-mono border border-purple-500/20 mb-6">
                  <Terminal className="size-3" />
                  <span>LIVE DEMO</span>
               </div>
               <h2 className="text-4xl md:text-5xl font-bold font-jinbuti mb-6 leading-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">一行命令</span> <br/>
                  即可启动无限能力
               </h2>
               <p className="text-lg text-white/60 mb-8 leading-relaxed">
                  Stravision 光谱传感器现已全面接入 MCP 生态。
                  您不再需要编写繁琐的驱动代码，只需安装 MCP Server，即可让 AI 助手直接读取光谱数据、分析物质成分。
               </p>
               
               <div className="grid grid-cols-2 gap-6">
                  <div>
                     <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <Box className="size-4 text-primary" /> 开箱即用
                     </h4>
                     <p className="text-sm text-white/40">标准化协议，兼容所有支持 MCP 的 AI 客户端（如 Claude Desktop, Cursor）。</p>
                  </div>
                  <div>
                     <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <Layers className="size-4 text-blue-500" /> 多模态支持
                     </h4>
                     <p className="text-sm text-white/40">支持文本、图像、二进制数据流的混合传输。</p>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 relative z-10 text-center">
         <div className="max-w-3xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-bold font-jinbuti mb-8 tracking-tighter">
               READY TO <span className="text-primary">CONNECT?</span>
            </h2>
            <p className="text-xl text-white/60 mb-12 font-light">
               探索数百个现成的 MCP 工具，或构建您自己的。<br/>
               未来已来，就在您的指尖。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
               <Button 
                  size="lg" 
                  className="h-16 px-12 bg-white text-black hover:bg-emerald-400 hover:text-black font-bold text-lg rounded-full shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all hover:scale-105"
                  onClick={() => router.push('/mcp-store')}
               >
                  进入商店
               </Button>
               <Button 
                  size="lg" 
                  variant="outline"
                  className="h-16 px-12 bg-transparent border-white/10 text-white hover:bg-white/10 font-bold text-lg rounded-full backdrop-blur-md"
               >
                  阅读文档
               </Button>
            </div>
         </div>
         
         {/* Footer Info */}
         <div className="mt-32 border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-white/20 font-mono">
            <div>STRAVISION OS © 2026</div>
            <div className="flex gap-6 mt-4 md:mt-0">
               <a href="#" className="hover:text-white transition-colors">PRIVACY</a>
               <a href="#" className="hover:text-white transition-colors">TERMS</a>
               <a href="#" className="hover:text-white transition-colors">GITHUB</a>
            </div>
         </div>
      </section>
    </div>
  )
}
