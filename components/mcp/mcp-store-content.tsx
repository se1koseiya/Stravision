"use client"

import { useState, useEffect } from "react"
import { Check, Plus, Loader2, ChevronRight, Sprout, Leaf, Sun, Droplets, CloudSun } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { MCPServerDetailDialog } from "@/components/mcp/mcp-server-detail-dialog"
import { CustomMCPDialog } from "@/components/mcp/custom-mcp-dialog"
import type { MCPServer } from "@/lib/data/mcp-servers"

const AppIcon = ({ icon, name, className, isDark }: { icon: string, name: string, className?: string, isDark?: boolean }) => {
  const [error, setError] = useState(false)
  if (error || !icon) {
    const firstLetter = name.charAt(0).toUpperCase()
    return (
      <div className={cn(
        className,
        "text-white font-black flex items-center justify-center text-xl shrink-0 bg-gradient-to-br from-emerald-500 to-green-600"
      )}>
        {firstLetter}
      </div>
    )
  }
  return (
    <div className={cn(className, "relative overflow-hidden flex items-center justify-center")}>
      <img
        src={icon}
        alt={name}
        className="size-[62%] object-contain shrink-0 relative z-10"
        onError={() => setError(true)}
      />
      {/* 统一翠绿色调遮罩，让所有图标视觉配色一致 */}
      <div className={cn(
        "absolute inset-0 z-20 pointer-events-none mix-blend-multiply",
        isDark ? "bg-emerald-900/40" : "bg-emerald-100/50"
      )} />
    </div>
  )
}

export function MCPStoreContent({ searchQuery = "", filter = "all", darkMode = false, onTryInChat }: { searchQuery?: string, filter?: string, darkMode?: boolean, onTryInChat?(toolName: string): void }) {
  const isDark = darkMode
  const [servers, setServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
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
    return matchesSearch
  }).sort((a, b) => (b.official ? 1 : 0) - (a.official ? 1 : 0))

  // 种植场景优先：agriculture 分类的插件作为"种植精选"展示
  const agricultureServers = filteredServers.filter(s => s.category === "agriculture")
  const otherServers = filteredServers.filter(s => s.category !== "agriculture")
  const featured = agricultureServers.slice(0, 4)
  const others = [...agricultureServers.slice(4), ...otherServers]

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

  const handleTryInChat = () => {
    onTryInChat?.("光谱")
  }

  if (loading) {
    return (
      <div className={cn(
        "flex items-center justify-center py-20 font-medium text-sm",
        isDark ? "text-zinc-500" : "text-gray-500"
      )}>
        加载工具列表中...
      </div>
    )
  }

  const renderServerRow = (server: MCPServer) => {
    const isInstalled = installedServers.has(server.id)
    return (
      <div
        key={server.id}
        onClick={() => { setSelectedServer(server); setDetailDialogOpen(true); }}
        className={cn(
          "group flex gap-4 cursor-pointer items-center py-3.5 px-3 -mx-3 rounded-2xl select-none transition-all",
          isDark ? "hover:bg-zinc-800/50" : "hover:bg-emerald-50/60"
        )}
      >
        <AppIcon
          icon={server.icon}
          name={server.displayName}
          isDark={isDark}
          className={cn(
            "size-11 rounded-2xl shadow-sm ring-1 shrink-0",
            isDark
              ? "ring-emerald-700/40 bg-emerald-950/60"
              : "ring-emerald-200/80 bg-emerald-50"
          )}
        />
        <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className={cn(
                "font-bold text-[14px] truncate transition-colors",
                isDark ? "text-zinc-100 group-hover:text-white" : "text-gray-900 group-hover:text-emerald-700"
              )}>{server.displayName}</h4>
              {server.official && <Check className={cn("size-3.5 stroke-[3px]", isDark ? "text-emerald-400" : "text-emerald-500")} />}
            </div>
            <p className={cn(
              "text-xs line-clamp-1 max-w-[280px] md:max-w-[340px]",
              isDark ? "text-zinc-500" : "text-gray-400"
            )}>{server.description}</p>
          </div>
          <div className="shrink-0 flex items-center justify-center">
            {isInstalled ? (
              <Check className={cn("size-4 stroke-[3px]", isDark ? "text-zinc-500" : "text-gray-400")} />
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleInstall(server)
                }}
                disabled={installing === server.id}
                className={cn(
                  "size-7 rounded-full flex items-center justify-center transition-all active:scale-95",
                  isDark
                    ? "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-600/50 hover:bg-zinc-700"
                    : "bg-white border border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50"
                )}
              >
                {installing === server.id ? (
                  <Loader2 size={12} className={cn("animate-spin", isDark ? "text-zinc-400" : "text-gray-400")} />
                ) : (
                  <Plus size={14} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 种植场景能力卡片配置（图标统一翠绿色调）
  const capabilityCards = [
    { icon: Sun, title: "环境感知", desc: "光谱 · 气象 · 光照监测" },
    { icon: Droplets, title: "水肥管控", desc: "土壤 · 灌溉 · 养分调控" },
    { icon: Leaf, title: "植保诊断", desc: "病害识别 · 虫害预警" },
    { icon: CloudSun, title: "数据决策", desc: "农场数据 · 生长分析" },
  ]

  return (
    <div className={cn(
      "w-full flex flex-col",
      isDark ? "text-zinc-200" : "text-gray-800"
    )}>
      <div className="w-full max-w-4xl mx-auto space-y-10">

        {/* 种植场景 Hero Banner */}
        {searchQuery === "" && (
          <div className={cn(
            "w-full relative rounded-3xl overflow-hidden border flex flex-col p-8 gap-6 shadow-lg",
            isDark
              ? "bg-gradient-to-br from-emerald-950/80 via-zinc-900 to-green-950/60 border-emerald-800/40"
              : "bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 border-emerald-200/60"
          )}>
            {/* 装饰光斑 */}
            <div className="absolute -top-16 -left-16 size-56 bg-emerald-400/10 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 size-56 bg-rose-300/10 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* 标题与副标题 */}
            <div className="relative space-y-2">
              <h2 className={cn(
                "text-3xl font-black tracking-tight",
                isDark ? "text-zinc-50" : "text-gray-900"
              )}>
                让每一颗草莓都被精准守护
              </h2>
              <p className={cn(
                "text-sm font-medium max-w-lg",
                isDark ? "text-zinc-400" : "text-gray-500"
              )}>
                集成光谱传感、土壤监测、气象预警与病害诊断，为莓园提供从感知到决策的全链路智能支持。
              </p>
            </div>

            {/* 能力卡片网格 */}
            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3">
              {capabilityCards.map((cap, i) => {
                const Icon = cap.icon
                return (
                  <motion.div
                    key={cap.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={cn(
                      "rounded-2xl p-4 border backdrop-blur-sm",
                      isDark ? "bg-zinc-900/60 border-zinc-800/60" : "bg-white/70 border-emerald-100"
                    )}
                  >
                    <div className={cn(
                      "size-9 rounded-xl flex items-center justify-center mb-2.5",
                      isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-100 text-emerald-600"
                    )}>
                      <Icon size={18} />
                    </div>
                    <div className={cn(
                      "text-sm font-bold mb-0.5",
                      isDark ? "text-zinc-100" : "text-gray-900"
                    )}>{cap.title}</div>
                    <div className={cn(
                      "text-[11px] leading-tight",
                      isDark ? "text-zinc-500" : "text-gray-400"
                    )}>{cap.desc}</div>
                  </motion.div>
                )
              })}
            </div>

            {/* 试用入口 */}
            <div className="relative flex items-center gap-3">
              <button
                onClick={handleTryInChat}
                className={cn(
                  "text-xs font-bold px-5 py-2.5 rounded-full shadow-md transition-all active:scale-95 flex items-center gap-2",
                  isDark
                    ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30"
                )}
              >
                在对话中试用光谱工具
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* 种植精选 Section */}
        {featured.length > 0 && (
          <div className="space-y-4">
            <div className={cn(
              "flex items-center justify-between border-b pb-2.5",
              isDark ? "border-zinc-800" : "border-gray-200"
            )}>
              <div className="flex items-center gap-2">
                <Sprout className={cn("size-4", isDark ? "text-emerald-400" : "text-emerald-600")} />
                <h3 className={cn(
                  "text-[15px] font-black tracking-wide",
                  isDark ? "text-zinc-100" : "text-gray-900"
                )}>种植精选</h3>
              </div>
              <button
                onClick={() => setCustomDialogOpen(true)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg font-bold transition-all active:scale-95",
                  isDark
                    ? "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                    : "bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200"
                )}
              >
                自定义添加
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
              {featured.map(renderServerRow)}
            </div>
          </div>
        )}

        {/* 更多工具 Section */}
        {others.length > 0 && (
          <div className="space-y-4">
            <div className={cn(
              "flex items-center gap-2 border-b pb-2.5",
              isDark ? "border-zinc-800" : "border-gray-200"
            )}>
              <h3 className={cn(
                "text-[15px] font-black tracking-wide",
                isDark ? "text-zinc-100" : "text-gray-900"
              )}>更多工具</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
              {others.map(renderServerRow)}
            </div>
          </div>
        )}

        {filteredServers.length === 0 && (
          <div className={cn(
            "text-center py-20 text-sm font-medium",
            isDark ? "text-zinc-600" : "text-gray-400"
          )}>
            未搜索到匹配的工具插件
          </div>
        )}
      </div>

      <MCPServerDetailDialog server={selectedServer} open={detailDialogOpen} onOpenChange={setDetailDialogOpen} onInstall={handleInstall} />
      <CustomMCPDialog open={customDialogOpen} onOpenChange={setCustomDialogOpen} onSave={(server) => {
          const newCustomServers = [...customServers, server]
          setCustomServers(newCustomServers)
          localStorage.setItem("mcp-custom-servers", JSON.stringify(newCustomServers))
          handleInstall(server)
      }} />
    </div>
  )
}
