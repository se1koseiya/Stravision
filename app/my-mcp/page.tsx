"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { 
  ArrowLeft, Search, Download, Check, ExternalLink, Filter, Sparkles, Zap, 
  Database, Globe, FileText, Code, MessageSquare, Calendar, Github, Slack, 
  Info, Plus, Activity, Sprout, ShieldCheck, ArrowRight, Settings, Grid, Trash2, Power
} from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { MCPServerDetailDialog } from "@/components/mcp/mcp-server-detail-dialog"
import { CustomMCPDialog } from "@/components/mcp/custom-mcp-dialog"
import { CapsuleNavigation } from "@/components/capsule-navigation"
import { TopNavLinks } from "@/components/top-nav-links"
import { MCP_SERVERS as MCP_SERVERS_DB, type MCPServer } from "@/lib/data/mcp-servers"
import { CustomCursor } from "@/components/custom-cursor"

// --- Animations ---
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

export default function MyMCPPage() {
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [installedServers, setInstalledServers] = useState<MCPServer[]>([])
  const [customServers, setCustomServers] = useState<MCPServer[]>([])
  
  // Dialog States
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [customDialogOpen, setCustomDialogOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Load Data
  useEffect(() => {
    // 1. Load Installed IDs
    const savedInstalledStr = localStorage.getItem("mcp-installed-servers")
    const installedIds = new Set(savedInstalledStr ? JSON.parse(savedInstalledStr) : [])

    // 2. Load Custom Servers
    const savedCustomStr = localStorage.getItem("mcp-custom-servers")
    const loadedCustomServers: MCPServer[] = savedCustomStr ? JSON.parse(savedCustomStr) : []
    setCustomServers(loadedCustomServers)

    // 3. Combine Data
    const allKnownServers = [...MCP_SERVERS_DB, ...loadedCustomServers]
    const myServers = allKnownServers.filter(s => installedIds.has(s.id))
    setInstalledServers(myServers)
  }, [])

  const handleInstall = (server: MCPServer, envVars: Record<string, string> = {}) => {
    try {
        // 保存配置
        // 这里的逻辑其实是 update 配置，因为只有安装了才会出现在这个页面
        // 但我们还是复用 handleInstall 的命名
        const finalEnvVars = { ...server.envVars, ...envVars }
        const serverConfig = {
            id: server.id,
            name: server.name,
            displayName: server.displayName,
            description: server.description,
            command: server.command,
            args: server.args,
            envVars: finalEnvVars
        }
        localStorage.setItem(`mcp-config-${server.id}`, JSON.stringify(serverConfig))

        toast.success(`${server.displayName} 配置已更新！`)
        
        // 刷新列表（虽然这里不需要，因为配置是在详情页改的）
    } catch (error) {
        toast.error("保存配置失败")
    }
  }

  const handleUninstall = (serverId: string) => {
    const savedInstalledStr = localStorage.getItem("mcp-installed-servers")
    const currentIds = new Set(savedInstalledStr ? JSON.parse(savedInstalledStr) : [])
    
    currentIds.delete(serverId)
    localStorage.setItem("mcp-installed-servers", JSON.stringify([...currentIds]))
    localStorage.removeItem(`mcp-config-${serverId}`)
    
    // Update State
    setInstalledServers(prev => prev.filter(s => s.id !== serverId))
    
    toast.success("已卸载")
  }

  const handleSaveCustomServer = (server: MCPServer) => {
    // 这个页面主要用于管理，添加通常在 Store
    // 但为了方便，这里也允许添加
    const newCustomServers = [...customServers, server]
    setCustomServers(newCustomServers)
    localStorage.setItem("mcp-custom-servers", JSON.stringify(newCustomServers))

    // 自动安装
    const savedInstalledStr = localStorage.getItem("mcp-installed-servers")
    const currentIds = new Set(savedInstalledStr ? JSON.parse(savedInstalledStr) : [])
    currentIds.add(server.id)
    localStorage.setItem("mcp-installed-servers", JSON.stringify([...currentIds]))
    
    // 更新当前视图
    setInstalledServers(prev => [...prev, server])

    toast.success("自定义服务器已添加！")
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-jinbuti selection:bg-primary/30 selection:text-emerald-50 cursor-none">
      <CustomCursor />

      {/* Background Elements - Matching Main Site */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [transform:perspective(1000px)_rotateX(60deg)_translateY(-200px)] origin-top opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
      </div>
      
      {/* Navigation (Same as MCP Store) */}
      <motion.nav 
        initial={false}
        animate={isScrolled ? {
          width: "auto",
          top: 24,
          left: "50%",
          x: "-50%",
          padding: "8px 24px",
          backgroundColor: "rgba(10, 10, 10, 0.9)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(16, 185, 129, 0.3)"
        } : {
          width: "100%",
          top: 0,
          left: 0,
          x: 0,
          padding: "20px 48px",
          backgroundColor: "rgba(5, 5, 5, 0)", 
          backdropFilter: "blur(0px)",
          border: "1px solid rgba(255, 255, 255, 0)"
        }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
        className="fixed flex items-center justify-between z-50 shadow-2xl shadow-emerald-900/10"
        style={{ maxWidth: isScrolled ? '90vw' : '100%' }}
      >
        <div className="flex items-center gap-2">
           <motion.div
             animate={{ 
               width: isScrolled ? 0 : "auto", 
               opacity: isScrolled ? 0 : 1,
               marginRight: isScrolled ? 0 : 8
             }}
             style={{ overflow: 'hidden' }}
             transition={{ duration: 0.3 }}
           >
             <Button 
               variant="ghost" 
               size="sm" 
               className="text-white/60 hover:text-emerald-400 hover:bg-primary/10 h-8 px-2 gap-2 font-jinbuti rounded-none border border-transparent hover:border-primary/30"
               onClick={() => router.push('/ai-assistant')}
             >
               <ArrowLeft className="size-4" />
               <span className="hidden sm:inline-block">AI Assistant</span>
             </Button>
           </motion.div>
           
           <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push('/')}>
              <div className="size-8 relative shrink-0">
                 <Image src="/icon.png" alt="Logo" fill className="object-contain grayscale hover:grayscale-0 transition-all duration-500" />
              </div>
              <motion.div
                animate={{ 
                  width: isScrolled ? 0 : "auto", 
                  opacity: isScrolled ? 0 : 1,
                  marginRight: isScrolled ? 0 : 16
                }}
                style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-xs font-bold tracking-[0.2em] uppercase opacity-40 font-jinbuti">Stravision OS</span>
              </motion.div>
           </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, width: 0 }}
          animate={{ 
            opacity: isScrolled ? 1 : 0, 
            width: isScrolled ? "auto" : 0,
            scale: isScrolled ? 1 : 0.95
          }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-1 mx-4 overflow-hidden"
        >
           <CapsuleNavigation />
        </motion.div>

        <motion.div 
          initial={{ opacity: 1 }}
          animate={{ opacity: isScrolled ? 0 : 1, pointerEvents: isScrolled ? 'none' : 'auto' }}
          transition={{ duration: 0.2 }}
          className="absolute left-1/2 -translate-x-1/2 z-50"
        >
           <TopNavLinks />
        </motion.div>

        <div className="flex items-center gap-3 shrink-0">
           <Button
             variant="ghost"
             size="icon"
             className="text-zinc-400 hover:text-emerald-400 hover:bg-primary/10 rounded-none border border-transparent hover:border-primary/30 size-9"
             onClick={() => router.push('/my-mcp')}
             title="Settings"
           >
              <Settings className="size-4" />
           </Button>
           
           <motion.div 
             animate={{ 
               width: isScrolled ? 0 : "auto", 
               opacity: isScrolled ? 0 : 1
             }}
             style={{ overflow: 'hidden' }}
             transition={{ duration: 0.3 }}
             className="flex items-center gap-2 mr-2"
           >
              <div className="flex items-center gap-1 bg-white/5 p-1 border border-white/10 shrink-0">
                 <div className="size-6 bg-white text-black flex items-center justify-center text-[10px] font-bold">EN</div>
                 <div className="size-6 flex items-center justify-center text-white/40"><Globe className="size-3" /></div>
              </div>
           </motion.div>

           <Button 
             className="rounded-none px-4 h-9 bg-primary text-white hover:bg-primary shadow-lg shadow-emerald-500/20 font-jinbuti tracking-wide border border-primary/50 clip-path-slant"
             onClick={() => setCustomDialogOpen(true)}
             style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
           >
             <Plus className="size-3.5 mr-1.5" />
             <span className="font-bold text-xs">添加自定义</span>
           </Button>
        </div>
      </motion.nav>

      {/* Hero Header */}
      <header className="pt-32 pb-16 px-8 md:px-12 relative overflow-hidden">
         <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
            <motion.div 
               initial="hidden" 
               animate="visible" 
               variants={staggerContainer}
               className="w-full max-w-4xl"
            >
               <motion.div variants={fadeInUp} className="mb-6">
                 <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="h-px w-8 bg-primary/50"></span>
                    <span className="text-xs font-medium tracking-[0.2em] text-emerald-400 uppercase font-mono">已安装服务</span>
                    <span className="h-px w-8 bg-primary/50"></span>
                 </div>
                 <div className="relative inline-block">
                    <h1 className="text-4xl md:text-7xl font-bold tracking-tight text-white mb-6 font-jinbuti mix-blend-difference">
                        莓小智的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">随身工具包</span>
                    </h1>
                    {/* Meixiaozhi Character */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, rotate: 10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ delay: 0.5, type: "spring" }}
                        className="absolute -left-32 -top-20 w-48 h-48 hidden md:block pointer-events-none"
                    >
                        <Image 
                            src="/ip/草莓头IP-坐姿玩手机.png" 
                            alt="Meixiaozhi" 
                            width={192} 
                            height={192} 
                            className="object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                        />
                    </motion.div>
                 </div>
                 <p className="text-lg text-white/40 mb-10 font-light max-w-2xl mx-auto">
                    这里是您的专属装备库，已装备 <span className="text-emerald-400 font-bold">{installedServers.length}</span> 个强力组件
                 </p>
               </motion.div>
            </motion.div>
         </div>
         
         {/* Background Elements */}
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
         <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />
      </header>

      {/* Content Area */}
      <main className="min-h-[60vh] relative px-6 md:px-8 py-12 z-10">
         <div className="max-w-[1600px] mx-auto">
            {installedServers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 bg-white/5 backdrop-blur-sm">
                    <Grid className="size-16 text-primary/20 mb-6" />
                    <h3 className="text-xl font-bold mb-2 font-jinbuti">暂无已安装的 MCP Server</h3>
                    <p className="text-white/40 mb-8 max-w-md text-center font-light">
                        前往 MCP 广场探索并安装您需要的插件，它们将在这里显示。
                    </p>
                    <Button 
                        onClick={() => router.push('/mcp-store')}
                        className="bg-primary text-white hover:bg-primary px-8 font-jinbuti rounded-none border border-primary/50"
                    >
                        去逛逛广场
                    </Button>
                </div>
            ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                   {installedServers.map((server) => (
                      <div key={server.id} className="group relative bg-[#0A0A0A]/80 backdrop-blur-sm border border-white/5 overflow-hidden hover:border-primary/30 transition-all duration-500 flex flex-col h-[260px]">
                         {/* Corner Accents */}
                         <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-white/10 group-hover:border-primary/50 transition-colors" />
                         <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-white/10 group-hover:border-primary/50 transition-colors" />
                         <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-white/10 group-hover:border-primary/50 transition-colors" />
                         <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-white/10 group-hover:border-primary/50 transition-colors" />

                         {/* Card Header */}
                             <div className="p-5 flex items-start justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                   <div className={cn("size-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-white/5 border border-white/5 shadow-lg shadow-emerald-900/20", server.iconBg)}>
                                     <img src={server.icon} alt={server.name} className="size-full object-cover" onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                        e.currentTarget.parentElement!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box text-white"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>`
                                     }} />
                                   </div>
                               <div>
                                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1 font-jinbuti">{server.displayName}</h3>
                                  <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5 font-mono">
                                     <span className="flex items-center gap-1"><div className="size-1.5 rounded-full bg-primary animate-pulse" /> 运行中</span>
                                  </div>
                               </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="size-8 text-white/40 hover:text-emerald-400 hover:bg-primary/10 rounded-none" onClick={() => { setSelectedServer(server); setDetailDialogOpen(true); }}>
                                    <Settings className="size-4" />
                                </Button>
                            </div>
                         </div>
                         
                         {/* Card Body */}
                         <div className="px-5 pb-4 flex-1 relative z-10">
                            <p className="text-sm text-white/60 line-clamp-2 leading-relaxed font-light">
                               {server.description}
                            </p>
                            
                            <div className="mt-4 flex flex-wrap gap-2">
                                {server.features.slice(0, 3).map(f => (
                                    <Badge key={f} variant="secondary" className="bg-white/5 hover:bg-white/10 text-white/40 border-0 text-[10px] font-normal font-mono tracking-wide rounded-none">
                                        {f}
                                    </Badge>
                                ))}
                            </div>
                         </div>

                         {/* Card Footer */}
                         <div className="px-5 pb-5 mt-auto flex items-center justify-between border-t border-white/5 pt-4 relative z-10">
                            <div className="flex items-center gap-2 text-xs text-white/30 font-mono">
                               ID: {server.id}
                            </div>
                            <div className="flex items-center gap-2">
                               <Button 
                                 size="sm" 
                                 variant="ghost"
                                 className="h-8 px-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 font-jinbuti rounded-none border border-red-500/20"
                                 onClick={() => handleUninstall(server.id)}
                               >
                                  <Trash2 className="size-3 mr-1.5" /> 卸载
                               </Button>
                               <Button 
                                 size="sm" 
                                 className="h-8 px-4 text-xs bg-primary/10 text-emerald-400 hover:bg-primary/20 border border-primary/20 font-jinbuti rounded-none"
                                 onClick={() => { setSelectedServer(server); setDetailDialogOpen(true); }}
                               >
                                  配置
                               </Button>
                            </div>
                         </div>
                      </div>
                   ))}
                </motion.div>
            )}
         </div>
      </main>

      {/* Detail Dialog */}
      <MCPServerDetailDialog
        server={selectedServer}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onInstall={handleInstall}
      />

      {/* Custom Server Dialog */}
      <CustomMCPDialog
        open={customDialogOpen}
        onOpenChange={setCustomDialogOpen}
        onSave={handleSaveCustomServer}
      />
    </div>
  )
}
