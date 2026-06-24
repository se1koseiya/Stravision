"use client"

import React, { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Search, ChevronDown, Settings, MoreHorizontal, LayoutGrid, Box, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { SkillStore } from "@/components/ai/skill-store"
import { MCPStoreContent } from "@/components/mcp/mcp-store-content"
import { ModelStoreContent } from "@/components/model-store/model-store-content"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { MCPServer } from "@/lib/data/mcp-servers"
import type { StoreSkill } from "@/lib/db/skill-store-service"

interface UnifiedExploreProps {
  onClose: () => void
  darkMode?: boolean
}

type ViewMode = "browse" | "manage"
type ManageTab = "plugins" | "apps" | "mcp" | "skills" | "market"

// 管理视图中的项目项（统一接口）
interface ManageItem {
  id: string
  name: string
  description: string
  icon: string | null
  enabled: boolean
  category: "plugin" | "mcp" | "skill" | "model" | "app"
}

export function UnifiedExplore({ onClose, darkMode = false }: UnifiedExploreProps) {
  const [activeTab, setActiveTab] = useState<"plugins" | "skills">("plugins")
  const [viewMode, setViewMode] = useState<ViewMode>("browse")
  const [manageTab, setManageTab] = useState<ManageTab>("plugins")
  const [searchQuery, setSearchQuery] = useState("")
  const [manageSearchQuery, setManageSearchQuery] = useState("")
  const [pluginFilter, setPluginFilter] = useState<"all" | "mcp" | "models">("all")
  const [skillFilter, setSkillFilter] = useState<"all" | "builtin" | "installed">("all")

  // ===== 真实数据源 =====
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([])
  const [skills, setSkills] = useState<StoreSkill[]>([])
  const [installedServerIds, setInstalledServerIds] = useState<Set<string>>(new Set())
  const [installedSkillIds, setInstalledSkillIds] = useState<string[]>([])
  const [loadingManage, setLoadingManage] = useState(true)

  // 加载真实数据
  useEffect(() => {
    if (viewMode !== "manage") return

    const loadAll = async () => {
      setLoadingManage(true)
      try {
        // MCP 服务器列表
        const mcpRes = await fetch('/api/mcp-store')
        const mcpData = await mcpRes.json()
        setMcpServers(Array.isArray(mcpData) ? mcpData : [])

        // 技能商店列表
        const skillsRes = await fetch('/api/skills/store')
        const skillsData = await skillsRes.json()
        setSkills(Array.isArray(skillsData) ? skillsData : [])

        // 已安装的 MCP 服务器
        const savedServers = localStorage.getItem("mcp-installed-servers")
        if (savedServers) setInstalledServerIds(new Set(JSON.parse(savedServers)))

        // 已安装的技能
        const userRes = await fetch('/api/skills/user')
        if (userRes.ok) {
          const userData = await userRes.json()
          setInstalledSkillIds(userData?.installedIds || [])
        }
      } catch (e) {
        console.error("[UnifiedExplore] 加载管理数据失败", e)
      } finally {
        setLoadingManage(false)
      }
    }

    loadAll()
  }, [viewMode])

  // ===== 从真实数据构建管理列表 =====
  const manageItems = useMemo<ManageItem[]>(() => {
    const items: ManageItem[] = []

    // MCP 服务器 → plugins + mcp 分类
    for (const server of mcpServers) {
      items.push({
        id: `mcp-${server.id}`,
        name: server.displayName,
        description: server.description,
        icon: server.icon || null,
        enabled: installedServerIds.has(server.id),
        category: "mcp",
      })
    }

    // 技能 → skills 分类
    for (const skill of skills) {
      items.push({
        id: `skill-${skill.skill_id}`,
        name: skill.name,
        description: skill.description,
        icon: skill.icon || null,
        enabled: installedSkillIds.includes(skill.skill_id),
        category: "skill",
      })
    }

    return items
  }, [mcpServers, skills, installedServerIds, installedSkillIds])

  // 启用/禁用操作
  const updateItemEnabled = async (id: string, enabled: boolean) => {
    if (id.startsWith("mcp-")) {
      const serverId = id.replace("mcp-", "")
      if (enabled) {
        const next = new Set(installedServerIds)
        next.add(serverId)
        setInstalledServerIds(next)
        localStorage.setItem("mcp-installed-servers", JSON.stringify([...next]))
        toast.success(`${mcpServers.find(s => s.id === serverId)?.displayName || serverId} 已启用`)
      } else {
        const next = new Set(installedServerIds)
        next.delete(serverId)
        setInstalledServerIds(next)
        localStorage.setItem("mcp-installed-servers", JSON.stringify([...next]))
      }
    } else if (id.startsWith("skill-")) {
      const skillId = id.replace("skill-", "")
      try {
        if (enabled) {
          await fetch('/api/skills/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skill_id: skillId })
          })
          setInstalledSkillIds(prev => [...prev, skillId])
          toast.success(`${skills.find(s => s.skill_id === skillId)?.name || skillId} 已启用`)
        } else {
          await fetch('/api/skills/user', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skill_id: skillId })
          })
          setInstalledSkillIds(prev => prev.filter(sid => sid !== skillId))
        }
      } catch (e) {
        toast.error("操作失败")
      }
    }
  }

  // 各 tab 计数
  const manageCounts = useMemo(() => ({
    plugins: manageItems.filter(i => i.category === "mcp").length,
    apps: 0,
    mcp: manageItems.filter(i => i.category === "mcp").length,
    skills: manageItems.filter(i => i.category === "skill").length,
    market: 0,
  }), [manageItems])

  // 当前 tab 过滤后的列表
  const filteredManageItems = useMemo(() => {
    let items = manageItems

    // 按 tab 过滤
    if (manageTab === "plugins") items = items.filter(i => i.category === "mcp")
    else if (manageTab === "apps") return []
    else if (manageTab === "mcp") items = items.filter(i => i.category === "mcp")
    else if (manageTab === "skills") items = items.filter(i => i.category === "skill")
    else if (manageTab === "market") return []

    // 搜索过滤
    if (manageSearchQuery) {
      const q = manageSearchQuery.toLowerCase()
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
      )
    }

    return items
  }, [manageItems, manageTab, manageSearchQuery])

  const manageTabs: { key: ManageTab; label: string; count: number }[] = [
    { key: "plugins", label: "插件", count: manageCounts.plugins },
    { key: "apps", label: "应用", count: manageCounts.apps },
    { key: "mcp", label: "MCP", count: manageCounts.mcp },
    { key: "skills", label: "技能", count: manageCounts.skills },
    { key: "market", label: "市场", count: manageCounts.market },
  ]

  // ===== 深浅色通用样式 =====
  const isDark = darkMode

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "absolute inset-0 z-[100] flex flex-col font-sans rounded-tr-xl",
        isDark ? "bg-zinc-950 text-zinc-100" : "bg-white text-gray-900"
      )}
    >
      {/* Header */}
      <div className={cn(
        "h-16 border-b flex items-center justify-between px-8 shrink-0",
        isDark ? "border-zinc-800/60 bg-zinc-950" : "border-gray-200/60 bg-white"
      )}>
        {/* Left Tabs / Breadcrumb */}
        {viewMode === "manage" ? (
          <div className="flex items-center gap-1.5 text-sm">
            <button
              onClick={() => setViewMode("browse")}
              className={cn(
                "font-medium transition-colors",
                isDark ? "text-zinc-500 hover:text-zinc-200" : "text-gray-500 hover:text-gray-900"
              )}
            >
              插件
            </button>
            <ChevronRight size={14} className={isDark ? "text-zinc-600" : "text-gray-300"} />
            <span className={cn("font-semibold", isDark ? "text-zinc-100" : "text-gray-900")}>管理</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
            <button
              onClick={() => { setActiveTab("plugins"); setSearchQuery("") }}
              className={cn(
                "px-5 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === "plugins"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              插件
            </button>
            <button
              onClick={() => { setActiveTab("skills"); setSearchQuery("") }}
              className={cn(
                "px-5 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === "skills"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              技能
            </button>
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode(viewMode === "manage" ? "browse" : "manage")}
            className={cn(
              "flex items-center gap-1.5 border rounded-xl px-4 py-2 text-xs font-bold transition-colors",
              viewMode === "manage"
                ? (isDark ? "bg-zinc-800 text-zinc-100 border-zinc-700" : "bg-gray-900 text-white border-gray-900")
                : (isDark ? "bg-zinc-800/60 hover:bg-zinc-700 border-zinc-700/50 text-zinc-400" : "bg-gray-100/60 hover:bg-gray-200 border-gray-200/50 text-gray-600")
            )}
          >
            <Settings size={13} />
            <span>管理</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex items-center gap-1.5 border rounded-xl px-4 py-2 text-xs font-bold transition-colors outline-none",
                isDark
                  ? "bg-zinc-800/60 hover:bg-zinc-700 border-zinc-700/50 text-zinc-400"
                  : "bg-gray-100/60 hover:bg-gray-200 border-gray-200/50 text-gray-600"
              )}>
                <span>创建</span>
                <ChevronDown size={13} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className={cn(
              "w-44 p-1.5 rounded-xl",
              isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200 shadow-lg"
            )}>
              <DropdownMenuItem
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer",
                  isDark ? "text-zinc-200 hover:bg-zinc-800 focus:bg-zinc-800" : "text-gray-700 hover:bg-gray-100 focus:bg-gray-100"
                )}
                onSelect={() => toast("创建插件功能开发中...")}
              >
                <LayoutGrid size={16} className={isDark ? "text-zinc-400" : "text-gray-400"} />
                <span>创建插件</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer",
                  isDark ? "text-zinc-200 hover:bg-zinc-800 focus:bg-zinc-800" : "text-gray-700 hover:bg-gray-100 focus:bg-gray-100"
                )}
                onSelect={() => toast("创建技能功能开发中...")}
              >
                <Box size={16} className={isDark ? "text-zinc-400" : "text-gray-400"} />
                <span>创建技能</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button className={cn(
            "size-9 rounded-xl flex items-center justify-center transition-colors",
            isDark ? "hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300" : "hover:bg-gray-100 text-gray-400 hover:text-gray-700"
          )}>
            <MoreHorizontal size={16} />
          </button>
          <div className={cn("w-px h-5", isDark ? "bg-zinc-800" : "bg-gray-200")} />
          <button
            onClick={onClose}
            className={cn(
              "size-9 rounded-xl flex items-center justify-center transition-colors",
              isDark ? "hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200" : "hover:bg-gray-100 text-gray-400 hover:text-gray-900"
            )}
            title="关闭"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {viewMode === "manage" ? (
          /* ===== 管理视图 ===== */
          <motion.div
            key="manage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            {/* 工具栏：Tab + 搜索 */}
            <div className={cn(
              "flex items-center justify-between px-6 py-4 shrink-0 border-b",
              isDark ? "border-zinc-800/60" : "border-gray-200/80 bg-gray-50/30"
            )}>
              {/* Tab 栏 */}
              <div className="flex items-center gap-1">
                {manageTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setManageTab(tab.key); setManageSearchQuery("") }}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                      manageTab === tab.key
                        ? (isDark ? "bg-zinc-800 text-zinc-100" : "bg-gray-900 text-white")
                        : (isDark ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/60")
                    )}
                  >
                    <span>{tab.label}</span>
                    <span className={cn(
                      "text-[10px] leading-none px-1.5 py-0.5 rounded-md",
                      manageTab === tab.key
                        ? (isDark ? "bg-zinc-700 text-zinc-400" : "bg-black/10 text-gray-500")
                        : (isDark ? "bg-zinc-800/60 text-zinc-600" : "bg-gray-200/60 text-gray-400")
                    )}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* 搜索框 */}
              <div className="relative w-56">
                <Search className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 size-3.5",
                  isDark ? "text-zinc-500" : "text-gray-400"
                )} />
                <input
                  type="text"
                  placeholder="搜索"
                  value={manageSearchQuery}
                  onChange={(e) => setManageSearchQuery(e.target.value)}
                  className={cn(
                    "w-full border rounded-lg pl-9 pr-3 py-1.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                    isDark
                      ? "bg-zinc-900 border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:border-zinc-700"
                      : "bg-white border-gray-200 text-gray-700 placeholder-gray-400 focus:border-gray-300"
                  )}
                />
              </div>
            </div>

            {/* 列表内容 */}
            <ScrollArea className="flex-1">
              <div className="px-6 py-4 space-y-1">
                {loadingManage && (
                  <div className={cn(
                    "text-center py-20 text-sm font-medium",
                    isDark ? "text-zinc-600" : "text-gray-400"
                  )}>
                    加载中...
                  </div>
                )}

                {!loadingManage && filteredManageItems.length === 0 && (
                  <div className={cn(
                    "text-center py-20 text-sm",
                    isDark ? "text-zinc-600" : "text-gray-400"
                  )}>
                    暂无{manageTabs.find(t => t.key === manageTab)?.label || ""}项目
                  </div>
                )}

                {!loadingManage && filteredManageItems.map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      "group flex items-center gap-4 px-4 py-3 rounded-xl transition-colors",
                      isDark ? "hover:bg-zinc-900/60" : "hover:bg-gray-50"
                    )}
                  >
                    {/* 图标 */}
                    <div className={cn(
                      "size-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden",
                      isDark ? "bg-zinc-800" : "bg-gray-100"
                    )}>
                      {item.icon ? (
                        item.icon.length <= 2 ? (
                          <span className="text-lg">{item.icon}</span>
                        ) : (
                          <img src={item.icon} alt={item.name} className="size-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        )
                      ) : (
                        <span className={cn(
                          "font-bold text-sm",
                          isDark ? "text-zinc-400" : "text-gray-500"
                        )}>{item.name.charAt(0)}</span>
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className={cn("font-semibold text-sm", isDark ? "text-zinc-200" : "text-gray-900")}>{item.name}</div>
                      <div className={cn("text-xs truncate max-w-[480px] mt-0.5", isDark ? "text-zinc-500" : "text-gray-400")}>{item.description}</div>
                    </div>

                    {/* 操作区 */}
                    <div className={cn(
                      "flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    )}>
                      <button className={cn(
                        "size-7 rounded-md flex items-center justify-center transition-colors",
                        isDark ? "hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      )}>
                        <MoreHorizontal size={14} />
                      </button>
                    </div>

                    {/* 开关 */}
                    <Switch
                      checked={item.enabled}
                      onCheckedChange={(checked) => updateItemEnabled(item.id, checked)}
                      className={cn(
                        "data-[state=checked]:bg-blue-500",
                        isDark ? "data-[state=unchecked]:bg-zinc-700" : "data-[state=unchecked]:bg-gray-300"
                      )}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        ) : (
          /* ===== 浏览视图（原有内容） ===== */
          <motion.div
            key="browse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <ScrollArea className="flex-1">
              <div className="max-w-6xl mx-auto px-8 pt-16 pb-32 flex flex-col items-center">

                {/* Centered Title */}
                <h1 className={cn(
                  "text-4.5xl font-black tracking-tight mb-8 font-alimama",
                  isDark ? "text-zinc-100" : "text-gray-900"
                )}>
                  让 BerryZ 按你的方式工作
                </h1>

                {/* Search and Filter Bar */}
                <div className="flex items-center gap-3 mb-12 w-full max-w-2xl justify-center">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={activeTab === "plugins" ? "搜索插件" : "搜索技能"}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-gray-50/80 border border-gray-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-blue-500/10 transition-colors"
                    />
                  </div>

                  {activeTab === "plugins" ? (
                    <div className="relative">
                      <select
                        value={pluginFilter}
                        onChange={(e) => setPluginFilter(e.target.value as any)}
                        className="appearance-none bg-gray-50/80 border border-gray-200/80 text-gray-600 rounded-xl pl-4 pr-10 py-2.5 text-sm font-semibold cursor-pointer hover:bg-gray-100 transition-colors focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-blue-500/10"
                      >
                        <option value="all">全部插件</option>
                        <option value="mcp">MCP 工具</option>
                        <option value="models">模型引擎</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={skillFilter}
                        onChange={(e) => setSkillFilter(e.target.value as any)}
                        className="appearance-none bg-gray-50/80 border border-gray-200/80 text-gray-600 rounded-xl pl-4 pr-10 py-2.5 text-sm font-semibold cursor-pointer hover:bg-gray-100 transition-colors focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-blue-500/10"
                      >
                        <option value="all">全部</option>
                        <option value="builtin">系统</option>
                        <option value="installed">个人</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  )}
                </div>

                {/* Content Lists */}
                <div className="w-full">
                  <AnimatePresence mode="wait">
                    {activeTab === "skills" ? (
                      <motion.div
                        key="skills"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                      >
                        <SkillStore searchQuery={searchQuery} filter={skillFilter} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="plugins"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full space-y-12"
                      >
                        {pluginFilter !== "models" ? (
                          <MCPStoreContent searchQuery={searchQuery} filter={pluginFilter} darkMode={isDark} onTryInChat={(toolName) => {
                            window.dispatchEvent(new CustomEvent('berry:mention-tool', { detail: { toolName } }))
                          }} />
                        ) : (
                          <ModelStoreContent searchQuery={searchQuery} />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
