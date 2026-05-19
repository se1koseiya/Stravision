"use client"

import { useState, useEffect } from "react"
import { Search, Check } from "lucide-react"
import { motion } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { MCPServerDetailDialog } from "@/components/mcp/mcp-server-detail-dialog"
import { CustomMCPDialog } from "@/components/mcp/custom-mcp-dialog"
import type { MCPServer } from "@/lib/data/mcp-servers"

const CATEGORIES = [
  { id: "精选", name: "今日精选" },
  { id: "已安装", name: "已安装" },
  { id: "agriculture", name: "农业专用" },
  { id: "web", name: "网络搜索" },
  { id: "productivity", name: "办公增强" },
  { id: "development", name: "开发者" },
  { id: "ai-enhancement", name: "AI 实验室" }
]

const AppIcon = ({ icon, name, className }: { icon: string, name: string, className?: string }) => {
  const [error, setError] = useState(false)
  if (error || !icon) {
    const firstLetter = name.charAt(0).toUpperCase()
    const colors = ["bg-blue-500", "bg-rose-500", "bg-primary", "bg-amber-500", "bg-violet-500", "bg-indigo-500"]
    const color = colors[name.length % colors.length]
    return (
      <div className={cn(className, color, "text-white font-black flex items-center justify-center text-xl shrink-0")}>
        {firstLetter}
      </div>
    )
  }
  return (
    <img 
      src={icon} 
      alt={name} 
      className={cn(className, "object-cover shrink-0")} 
      onError={() => setError(true)} 
    />
  )
}

export function MCPStoreContent() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("精选")
  const [installedServers, setInstalledServers] = useState<Set<string>>(new Set())
  const [installing, setInstalling] = useState<string | null>(null)
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [customServers, setCustomServers] = useState<MCPServer[]>([])

  useEffect(() => {
    fetchServers()
    const installed = localStorage.getItem("mcp-installed-servers")
    if (installed) setInstalledServers(new Set(JSON.parse(installed)))
    const custom = localStorage.getItem("mcp-custom-servers")
    if (custom) setCustomServers(JSON.parse(custom))
  }, [])

  const fetchServers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mcp-store')
      const data = await res.json()
      setServers(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error("加载工具商店失败")
    } finally {
      setLoading(false)
    }
  }

  const filteredServers = [...servers, ...customServers].filter(server => {
    const matchesSearch = server.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          server.description.toLowerCase().includes(searchQuery.toLowerCase())
    if (activeCategory === "精选") return matchesSearch
    if (activeCategory === "已安装") return matchesSearch && installedServers.has(server.id)
    return matchesSearch && server.category === activeCategory
  }).sort((a, b) => (b.official ? 1 : 0) - (a.official ? 1 : 0))

  const featured = filteredServers.slice(0, 2)
  const others = filteredServers.slice(2)

  const gradients = [
    "from-indigo-600 to-blue-700",
    "from-primary to-teal-700",
    "from-purple-600 to-pink-800",
    "from-orange-500 to-red-600"
  ]

  const handleInstall = async (server: MCPServer, config?: Record<string, string>) => {
    setInstalling(server.id)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      const newInstalled = new Set(installedServers)
      newInstalled.add(server.id)
      setInstalledServers(newInstalled)
      localStorage.setItem("mcp-installed-servers", JSON.stringify([...newInstalled]))
      
      const serverConfig = { ...server, envVars: { ...server.envVars, ...config } }
      localStorage.setItem(`mcp-config-${server.id}`, JSON.stringify(serverConfig))
      toast.success(`${server.displayName} 已准备就绪`)
    } catch (e) {
      toast.error("安装失败")
    } finally {
      setInstalling(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#000] relative overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="px-8 pt-10 pb-4 shrink-0 flex items-end justify-between max-w-7xl mx-auto w-full z-20">
           <div className="space-y-0.5">
              <span className="text-zinc-500 text-[13px] font-bold uppercase tracking-tight">
                {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight">探索莓小智的工具潜力</h1>
           </div>
           
           <div className="flex items-center gap-6 mb-1">
              <div className="bg-zinc-100 dark:bg-zinc-900/50 backdrop-blur-3xl px-1 py-1 rounded-2xl flex items-center shadow-sm border border-black/5 dark:border-white/5 overflow-x-auto max-w-[600px] no-scrollbar">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "text-[13px] font-bold transition-all px-5 py-2 rounded-xl whitespace-nowrap",
                      activeCategory === cat.id
                        ? "bg-white dark:bg-zinc-800 text-blue-500 shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
           </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-8 pb-32 space-y-16 max-w-7xl mx-auto">
            {activeCategory === "精选" && (
              <div className="flex flex-col md:flex-row gap-6 pt-4 h-[550px]">
                {featured.map((server, idx) => (
                  <motion.div
                    key={server.id}
                    onClick={() => { setSelectedServer(server); setDetailDialogOpen(true); }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "relative h-full rounded-[2.5rem] overflow-hidden cursor-pointer shadow-2xl group border border-black/5 dark:border-white/5",
                      idx === 0 ? "flex-[2.2]" : "flex-[1]"
                    )}
                  >
                    <div className={cn("absolute inset-0 bg-gradient-to-br", gradients[idx % gradients.length])} />
                    <div className="absolute inset-x-0 top-0 p-8 pt-10 z-10 bg-gradient-to-b from-black/30 to-transparent">
                       <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/70">{server.category.toUpperCase()}</span>
                       <h2 className="text-4xl font-extrabold mt-2 leading-[1.1] text-white drop-shadow-lg max-w-[80%]">{server.displayName}</h2>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-6 z-10 bg-black/20 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between group-hover:bg-black/30 transition-all gap-4">
                       <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                          <AppIcon icon={server.icon} name={server.displayName} className="size-12 rounded-xl shadow-xl ring-1 ring-black/5" />
                          <div className="space-y-0.5 min-w-0">
                             <p className="font-bold text-sm text-white truncate">{server.displayName}</p>
                             <p className="text-[10px] text-white/60 truncate font-medium">{server.description}</p>
                          </div>
                       </div>
                       <Button 
                         onClick={(e) => { e.stopPropagation(); handleInstall(server); }}
                         disabled={installing === server.id}
                         className="rounded-full px-5 py-1.5 h-8 bg-white/20 hover:bg-white/30 text-white font-bold text-xs shadow-sm backdrop-blur-md transition-all uppercase tracking-tight shrink-0"
                       >
                         {installedServers.has(server.id) ? "打开" : (installing === server.id ? "安装中" : "获取")}
                       </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="space-y-8">
               <div className="flex items-center justify-between border-b pb-5 border-zinc-100 dark:border-zinc-800/50">
                  <h3 className="text-2xl font-extrabold tracking-tight">
                    {activeCategory === "精选" ? "为您推荐" : activeCategory === "已安装" ? "已安装工具" : `${activeCategory} 工具列表`}
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                      <Input 
                        placeholder="搜索工具..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 border-none bg-zinc-100 dark:bg-zinc-900 rounded-xl text-sm"
                      />
                    </div>
                    <Button 
                      onClick={() => setCustomDialogOpen(true)}
                      className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-9 px-4 font-bold text-sm"
                    >
                      自定义添加
                    </Button>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-12">
                  {(activeCategory === "精选" ? others : filteredServers).map((server) => {
                    const isInstalled = installedServers.has(server.id)
                    return (
                      <div
                        key={server.id}
                        onClick={() => { setSelectedServer(server); setDetailDialogOpen(true); }}
                        className="group flex gap-5 cursor-pointer items-center border-b border-zinc-100 dark:border-zinc-800/50 pb-8 last:border-0"
                      >
                         <AppIcon icon={server.icon} name={server.displayName} className="size-20 rounded-[1.35rem] shadow-sm group-hover:shadow-md transition-all shrink-0" />
                         <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                            <div className="space-y-1">
                               <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-lg truncate leading-tight tracking-tight">{server.displayName}</h4>
                                  {server.official && <Check className="size-3 text-blue-500 stroke-[4px]" />}
                               </div>
                               <p className="text-sm text-zinc-500 dark:text-zinc-500 line-clamp-1 font-medium italic">{server.description}</p>
                            </div>
                            <div className="flex flex-col items-center gap-1.5 shrink-0">
                               <Button 
                                 size="sm"
                                 className={cn(
                                   "rounded-full px-6 py-2 h-8 font-extrabold text-[13px] shadow-sm transition-all active:scale-95",
                                   isInstalled ? "bg-zinc-100 dark:bg-zinc-800 text-blue-500" : "bg-zinc-100 dark:bg-zinc-900 text-blue-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                 )}
                               >
                                 {isInstalled ? "打开" : "获取"}
                               </Button>
                               <span className="text-[10px] font-bold text-zinc-400/60 uppercase tracking-tighter">免费使用</span>
                            </div>
                         </div>
                      </div>
                    )
                  })}
               </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <MCPServerDetailDialog server={selectedServer} open={detailDialogOpen} onOpenChange={setDetailDialogOpen} onInstall={handleInstall} />
      <CustomMCPDialog open={customDialogOpen} onOpenChange={setCustomDialogOpen} onSave={(server) => {
          const newCustomServers = [...customServers, server]
          setCustomServers(newCustomServers)
          localStorage.setItem("mcp-custom-servers", JSON.stringify(newCustomServers))
          handleInstall(server)
      }} />
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-blue-500/[0.03] to-transparent pointer-events-none -z-10" />
    </div>
  )
}
