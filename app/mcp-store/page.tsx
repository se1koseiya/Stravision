"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { 
  ArrowLeft, Search, Download, Check, ExternalLink, Filter, Sparkles, Zap, 
  Database, Globe, FileText, Code, MessageSquare, Calendar, Github, Slack, 
  Info, Plus, Activity, Sprout, ShieldCheck, ArrowRight, Settings, Grid, Layout
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
import { MCP_SERVERS, type MCPServer } from "@/lib/data/mcp-servers"

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

const CATEGORIES = [
  { id: "all", name: "全部", icon: Sparkles },
  { id: "agriculture", name: "农业", icon: Sprout },
  { id: "web", name: "网络工具", icon: Globe },
  { id: "development", name: "开发工具", icon: Code },
  { id: "database", name: "数据库", icon: Database },
  { id: "productivity", name: "生产力", icon: FileText },
  { id: "communication", name: "通讯", icon: MessageSquare },
  { id: "testing", name: "测试", icon: Zap },
  { id: "deployment", name: "部署", icon: Calendar },
  { id: "ai-enhancement", name: "AI 增强", icon: Sparkles },
  { id: "monitoring", name: "监控", icon: Activity },
  { id: "business", name: "商业", icon: Zap }
]

export default function MCPStorePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isScrolled, setIsScrolled] = useState(false)
  const [installedServers, setInstalledServers] = useState<Set<string>>(new Set())

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // 加载已安装列表
  const [installing, setInstalling] = useState<string | null>(null)
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [customServers, setCustomServers] = useState<MCPServer[]>([])

  useEffect(() => {
    // 从 localStorage 加载已安装的服务器
    const installed = localStorage.getItem("mcp-installed-servers")
    if (installed) {
      setInstalledServers(new Set(JSON.parse(installed)))
    }

    // 加载自定义服务器
    const custom = localStorage.getItem("mcp-custom-servers")
    if (custom) {
      setCustomServers(JSON.parse(custom))
    }
  }, [])

  const filteredServers = [...MCP_SERVERS, ...customServers]
    .filter(server => {
      const matchesSearch = server.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory = selectedCategory === "all" || server.category === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => b.popularity - a.popularity)

  const handleInstall = async (server: MCPServer, config?: Record<string, string>) => {
    setInstalling(server.id)

    try {
      // 模拟安装过程
      await new Promise(resolve => setTimeout(resolve, 1500))

      // 合并环境变量配置
      const finalEnvVars = { ...server.envVars, ...config }

      // 保存到 localStorage
      const newInstalled = new Set(installedServers)
      newInstalled.add(server.id)
      setInstalledServers(newInstalled)
      localStorage.setItem("mcp-installed-servers", JSON.stringify([...newInstalled]))

      // 保存配置到 MCP 配置文件
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

      toast.success(`${server.displayName} 安装成功！`, {
        description: server.requiresApiKey ? "配置已保存" : "已可以使用"
      })
    } catch (error) {
      toast.error("安装失败", {
        description: "请稍后重试"
      })
    } finally {
      setInstalling(null)
    }
  }

  const handleQuickInstall = (server: MCPServer) => {
    if (server.requiresApiKey) {
      setSelectedServer(server)
      setDetailDialogOpen(true)
    } else {
      handleInstall(server)
    }
  }

  const handleSaveCustomServer = (server: MCPServer) => {
    // 保存到自定义服务器列表
    const newCustomServers = [...customServers, server]
    setCustomServers(newCustomServers)
    localStorage.setItem("mcp-custom-servers", JSON.stringify(newCustomServers))

    // 自动安装
    handleInstall(server)

    toast.success("自定义服务器已添加！")
  }

  const handleUninstall = (serverId: string) => {
    const newInstalled = new Set(installedServers)
    newInstalled.delete(serverId)
    setInstalledServers(newInstalled)
    localStorage.setItem("mcp-installed-servers", JSON.stringify([...newInstalled]))
    localStorage.removeItem(`mcp-config-${serverId}`)
    toast.success("已卸载")
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      
      {/* Navigation */}
      <motion.nav 
        initial={false}
        animate={isScrolled ? {
          width: "auto",
          top: 24,
          left: "50%",
          x: "-50%",
          padding: "8px 24px",
          borderRadius: "9999px",
          backgroundColor: "rgba(10, 10, 10, 0.8)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        } : {
          width: "100%",
          top: 0,
          left: 0,
          x: 0,
          padding: "20px 48px",
          borderRadius: "0px",
          backgroundColor: "rgba(255, 255, 255, 0)", // transparent initially
          backdropFilter: "blur(0px)",
          border: "1px solid rgba(255, 255, 255, 0)"
        }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
        className="fixed flex items-center justify-between z-50 shadow-2xl shadow-black/20"
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
               className="text-white/60 hover:text-white hover:bg-white/10 h-8 px-2 gap-2"
               onClick={() => router.push('/ai-assistant')}
             >
               <ArrowLeft className="size-4" />
               <span className="hidden sm:inline-block font-medium">AI Assistant</span>
             </Button>
           </motion.div>

           <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push('/')}>
              <div className="size-8 relative shrink-0">
                 <Image src="/icon.png" alt="Logo" fill className="object-contain grayscale hover:grayscale-0 transition-all duration-500" />
              </div>
              {/* Logo Text - Always render but control opacity/width */}
              <motion.div
                animate={{ 
                  width: isScrolled ? 0 : "auto", 
                  opacity: isScrolled ? 0 : 1,
                  marginRight: isScrolled ? 0 : 16 // Prevent margin collapse
                }}
                style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-xs font-bold tracking-[0.2em] uppercase opacity-40">Stravision OS</span>
              </motion.div>
           </div>
        </div>

        {/* Center Links - Only visible when scrolled */}
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

        {/* Center Links - Visible when NOT scrolled (absolute center) */}
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
             className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full size-9"
             onClick={() => router.push('/my-mcp')}
             title="Settings"
           >
              <Settings className="size-4" />
           </Button>
           
           {/* Language & Theme Toggles (Simulated) */}
           <motion.div 
             animate={{ 
               width: isScrolled ? 0 : "auto", 
               opacity: isScrolled ? 0 : 1
             }}
             style={{ overflow: 'hidden' }}
             transition={{ duration: 0.3 }}
             className="flex items-center gap-2 mr-2"
           >
              <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/10 shrink-0">
                 <div className="size-6 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-bold">EN</div>
                 <div className="size-6 rounded-full flex items-center justify-center text-white/40"><Globe className="size-3" /></div>
              </div>
           </motion.div>

           <Button 
             className="rounded-full px-4 h-9 bg-white text-black hover:bg-white/90 shadow-lg shadow-white/5"
             onClick={() => setCustomDialogOpen(true)}
           >
             <Plus className="size-3.5 mr-1.5" />
             <span className="font-bold text-xs">添加自定义</span>
           </Button>
        </div>
      </motion.nav>

      {/* Hero Header */}
      <header className="pt-32 pb-16 px-8 md:px-12 bg-black border-b border-white/10 relative overflow-hidden">
         <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
            <motion.div 
               initial="hidden" 
               animate="visible" 
               variants={staggerContainer}
               className="w-full max-w-4xl"
            >
               <motion.div variants={fadeInUp} className="mb-6">
                 <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="h-px w-8 bg-white/20"></span>
                    <span className="text-xs font-medium tracking-[0.2em] text-white/60 uppercase">MCP 广场</span>
                    <span className="h-px w-8 bg-white/20"></span>
                 </div>
                 <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
                    探索海量可用的 MCP Servers
                 </h1>
                 <p className="text-lg text-white/60 mb-10">
                    当前已收录 <span className="text-white font-bold">{MCP_SERVERS.length}</span> 个，持续更新中...
                 </p>
               </motion.div>

               <motion.div variants={fadeInUp} className="relative max-w-2xl mx-auto group">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-center bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm overflow-hidden focus-within:ring-1 focus-within:ring-white/20 focus-within:bg-white/10 transition-all">
                     <Search className="absolute left-4 size-5 text-white/40" />
                     <Input 
                       placeholder="输入关键词或者使用深度搜索输入需求，获取你想要的MCP Servers" 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="pl-12 h-14 bg-transparent border-0 text-white placeholder:text-white/30 focus-visible:ring-0 text-base"
                     />
                     <Button 
                       className="mr-2 h-10 px-6 bg-white/10 hover:bg-white/20 text-white border-0"
                     >
                       搜索
                     </Button>
                  </div>
                  <div className="absolute left-0 -bottom-12 flex gap-3">
                     <Button size="sm" variant="outline" className="h-8 bg-transparent border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-xs">
                        <Sparkles className="size-3 mr-1.5" />
                        深度搜索
                     </Button>
                  </div>
               </motion.div>
            </motion.div>
         </div>
         
         {/* Background Elements */}
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
         <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      </header>

      {/* Content Area */}
      <main className="min-h-screen bg-black text-white relative">
         <div className="max-w-[1600px] mx-auto px-6 md:px-8 py-12">
            <div className="flex flex-col lg:flex-row gap-10">
            
            {/* Sidebar Navigation / Filters */}
            <aside className="w-full lg:w-64 shrink-0 space-y-6">
               <div className="sticky top-24 space-y-6">
                  {/* Stats Card */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                     <div className="flex justify-between items-center text-sm text-white/60 mb-1">
                        <span className="flex items-center gap-2"><Grid className="size-4" /> 全部</span>
                        <span>{MCP_SERVERS.length}</span>
                     </div>
                  </div>

                  <div className="space-y-1">
                     <button 
                        onClick={() => setSelectedCategory("all")}
                        className={cn(
                           "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-between group",
                           selectedCategory === "all" 
                             ? "bg-white/10 text-white" 
                             : "text-white/60 hover:bg-white/5 hover:text-white"
                        )}
                     >
                        <span className="flex items-center gap-3">
                           <Grid className="size-4" />
                           全部
                        </span>
                        <span className="text-xs opacity-50">{MCP_SERVERS.length}</span>
                     </button>
                     <button className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-all duration-200 flex items-center justify-between">
                        <span className="flex items-center gap-3">
                           <Sparkles className="size-4" />
                           平台精选
                        </span>
                        <span className="text-xs opacity-50">24</span>
                     </button>
                     <button className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-all duration-200 flex items-center justify-between">
                        <span className="flex items-center gap-3">
                           <Activity className="size-4" />
                           站内最热
                        </span>
                        <span className="text-xs opacity-50">237</span>
                     </button>
                     <button className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-all duration-200 flex items-center justify-between">
                        <span className="flex items-center gap-3">
                           <Calendar className="size-4" />
                           最近更新
                        </span>
                        <span className="text-xs opacity-50">5134</span>
                     </button>
                  </div>

                  <div className="pt-6 border-t border-white/10">
                     <p className="px-4 text-xs font-bold text-white/40 uppercase tracking-wider mb-3">功能分类</p>
                     <div className="space-y-1 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                        {CATEGORIES.filter(c => c.id !== 'all').map((cat) => {
                           const Icon = cat.icon
                           return (
                             <button 
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={cn(
                                   "w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors duration-200 flex items-center justify-between",
                                   selectedCategory === cat.id 
                                     ? "text-white bg-white/10" 
                                     : "text-white/60 hover:text-white hover:bg-white/5"
                                )}
                             >
                                <span className="flex items-center gap-3">
                                   <Icon className="size-4 opacity-70" />
                                   {cat.name}
                                </span>
                                <span className="text-xs opacity-30">{MCP_SERVERS.filter(s => s.category === cat.id).length}</span>
                             </button>
                           )
                        })}
                     </div>
                  </div>
               </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
               <motion.div
                  key={selectedCategory}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="min-h-[60vh]"
               >
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                     {filteredServers.map((server) => {
                       const isInstalled = installedServers.has(server.id)
                       const isInstalling = installing === server.id
                       
                       return (
                          <div key={server.id} className="group relative bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col h-[240px]">
                             {/* Card Header */}
                             <div className="p-5 flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                   <div className={cn("size-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-white/5", server.iconBg)}>
                                     <img src={server.icon} alt={server.name} className="size-full object-cover" onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                        e.currentTarget.parentElement!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box text-white"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>`
                                     }} />
                                   </div>
                                   <div>
                                      <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">{server.displayName}</h3>
                                      <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                                         <span>By {server.provider}</span>
                                         {server.official && (
                                            <span className="flex items-center gap-1 text-indigo-400 bg-indigo-500/10 px-1.5 py-px rounded border border-indigo-500/20">
                                               <ShieldCheck className="size-3" /> 平台精选
                                            </span>
                                         )}
                                      </div>
                                   </div>
                                </div>
                                <a href="#" className="text-white/20 hover:text-white transition-colors">
                                   <Github className="size-5" />
                                </a>
                             </div>
                             
                             {/* Card Body */}
                             <div className="px-5 pb-4 flex-1">
                                <p className="text-sm text-white/60 line-clamp-2 leading-relaxed">
                                   {server.description}
                                </p>
                             </div>

                             {/* Card Footer */}
                             <div className="px-5 pb-5 mt-auto flex items-center justify-between border-t border-white/5 pt-4">
                                <div className="flex gap-2">
                                   <Badge variant="secondary" className="bg-white/5 hover:bg-white/10 text-white/60 border-0 rounded-md text-[10px] h-6 px-2 font-normal">
                                      A- 优质
                                   </Badge>
                                   <Badge variant="secondary" className="bg-white/5 hover:bg-white/10 text-white/60 border-0 rounded-md text-[10px] h-6 px-2 font-normal">
                                      {server.category === 'web' ? '网页抓取' : server.category === 'database' ? '数据库' : '本地部署'}
                                   </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-white/40 font-mono">
                                   <span className="flex items-center gap-1"><Download className="size-3" /> {server.popularity}</span>
                                   
                                   {isInstalled ? (
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        className="h-7 px-3 text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                                        onClick={() => { setSelectedServer(server); setDetailDialogOpen(true); }}
                                      >
                                         已安装
                                      </Button>
                                   ) : (
                                      <Button 
                                        size="sm" 
                                        className="h-7 px-3 text-xs bg-white text-black hover:bg-white/90"
                                        onClick={() => handleQuickInstall(server)}
                                        disabled={isInstalling}
                                      >
                                         {isInstalling ? "安装中..." : "安装"}
                                      </Button>
                                   )}
                                </div>
                             </div>
                          </div>
                       )
                     })}
                  </div>
               </motion.div>
            </div>
            </div>
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
