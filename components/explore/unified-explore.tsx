"use client"

import React, { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronRight, PanelLeftOpen, Plus, Settings, MoreHorizontal, LayoutGrid, Box, ChevronDown, Search, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { SkillStore } from "@/components/ai/skill-store"
import { MCPStoreContent } from "@/components/mcp/mcp-store-content"
import { KBStoreContent, CollectionDetailModal } from "@/components/kb/kb-store-content"
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
import { MCP_SERVERS as MCP_SERVERS_STATIC } from "@/lib/data/mcp-servers"
import type { StoreSkill } from "@/lib/db/skill-store-service"
import type { MarketCollection } from "@/components/kb/kb-store-content"

interface UnifiedExploreProps {
  onClose: () => void
  darkMode?: boolean
  /** sidebar 是否展开；收起时面板 left 收缩到 12px */
  sidebarOpen?: boolean
  /** sidebar 收起时面板内显示的展开按钮回调 */
  onExpandSidebar?: () => void
  /** sidebar 收起时面板内显示的新建对话按钮回调 */
  onNewChat?: () => void
}

type ViewMode = "browse" | "manage"
type ManageTab = "plugins" | "skills"

// 管理视图中的项目项（统一接口）
interface ManageItem {
  id: string
  name: string
  description: string
  icon: string | null
  enabled: boolean
  category: "plugin" | "mcp" | "skill" | "model" | "app"
}

// 管理列表里的图标：图片加载失败时回退到首字母，避免裂开占位符
function ManageItemIcon({ icon, name, darkMode }: { icon: string; name: string; darkMode: boolean }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className={cn(
        "font-bold text-sm",
        darkMode ? "text-zinc-400" : "text-blue-600"
      )} style={{ color: !darkMode ? BERRY_THEME.primary : undefined }}>{name.charAt(0)}</span>
    )
  }
  return (
    <img
      src={icon}
      alt={name}
      className="size-6 object-contain"
      onError={() => setFailed(true)}
    />
  )
}

export function UnifiedExplore({ onClose, darkMode = false, sidebarOpen = true, onExpandSidebar, onNewChat }: UnifiedExploreProps) {
  const [activeTab, setActiveTab] = useState<"plugins" | "skills" | "knowledge">("plugins")
  const [viewMode, setViewMode] = useState<ViewMode>("browse")
  const [manageTab, setManageTab] = useState<ManageTab>("plugins")
  const [searchQuery, setSearchQuery] = useState("")
  // 关闭中状态：点击 X 时立刻给 wrapper 加 pointer-events-none，
  // 避免内部 tab 内容切来切去后 AnimatePresence 卸载外层 wrapper 不及时导致整屏被挡
  const [closing, setClosing] = useState(false)
  const handleClose = () => {
    if (closing) return
    setClosing(true)
    onClose()
  }
  const [manageSearchQuery, setManageSearchQuery] = useState("")
  // KB 详情以覆盖层形式展示在对话区域，与插件/技能详情一致——不再跳到独立页面
  // 初始值兼容 `?explore=kb&id=...` 直接深链打开
  const [kbDetailId, setKbDetailId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null
    const sp = new URLSearchParams(window.location.search)
    const tab = sp.get("explore")
    const id = sp.get("id")
    if (tab === "kb" && id) {
      const n = Number(id)
      return Number.isFinite(n) && n > 0 ? n : null
    }
    return null
  })

  // 真实数据源（先用静态数据兜底，避免 manage 视图空白）
  const [mcpServers, setMcpServers] = useState<MCPServer[]>(MCP_SERVERS_STATIC as MCPServer[])
  const [skills, setSkills] = useState<StoreSkill[]>([])
  const [installedServerIds, setInstalledServerIds] = useState<Set<string>>(new Set())
  const [installedSkillIds, setInstalledSkillIds] = useState<string[]>([])
  const [loadingManage, setLoadingManage] = useState(false)

  // KB 详情覆盖层所需的 collection + subscribedIds + 同类推荐
  const [kbModalCollection, setKbModalCollection] = useState<MarketCollection | null>(null)
  const [kbModalAllCollections, setKbModalAllCollections] = useState<MarketCollection[]>([])
  const [kbModalSubscribedIds, setKbModalSubscribedIds] = useState<Set<number>>(new Set())
  const [kbModalLoading, setKbModalLoading] = useState(false)

  // 加载真实数据（带静态兜底）
  useEffect(() => {
    if (viewMode !== "manage") return

    const loadAll = async () => {
      setLoadingManage(true)
      try {
        // MCP 服务器列表：失败时保留静态数据
        try {
          const mcpRes = await fetch('/api/mcp-store')
          if (mcpRes.ok) {
            const mcpData = await mcpRes.json()
            if (Array.isArray(mcpData) && mcpData.length > 0) {
              setMcpServers(mcpData)
            }
          }
        } catch (e) {
          console.warn("[UnifiedExplore] /api/mcp-store 失败，使用静态数据", e)
        }

        // 技能商店列表：失败时保留静态数据
        try {
          const skillsRes = await fetch('/api/skills/store')
          if (skillsRes.ok) {
            const skillsData = await skillsRes.json()
            if (Array.isArray(skillsData) && skillsData.length > 0) {
              setSkills(skillsData)
            }
          }
        } catch (e) {
          console.warn("[UnifiedExplore] /api/skills/store 失败，使用静态数据", e)
        }

        // 已安装的 MCP 服务器
        const savedServers = localStorage.getItem("mcp-installed-servers")
        if (savedServers) setInstalledServerIds(new Set(JSON.parse(savedServers)))

        // 已安装的技能
        try {
          const userRes = await fetch('/api/skills/user')
          if (userRes.ok) {
            const userData = await userRes.json()
            setInstalledSkillIds(userData?.installedIds || [])
          }
        } catch (e) {
          // 未登录或接口失败，保持空数组
        }
      } catch (e) {
        console.error("[UnifiedExplore] 加载管理数据失败", e)
      } finally {
        setLoadingManage(false)
      }
    }

    loadAll()
  }, [viewMode])

  // Esc 键关闭 explore
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closing) handleClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing])

  // ===== KB 详情覆盖层：按 ID 拉取 collection 详情 + 全量列表用于相关推荐 =====
  useEffect(() => {
    if (kbDetailId === null) {
      setKbModalCollection(null)
      return
    }
    let cancelled = false
    setKbModalLoading(true)
    Promise.all([
      fetch(`/api/knowledge/market/${kbDetailId}`).then(r => r.json()).catch(() => null),
      fetch(`/api/knowledge/market?limit=200`).then(r => r.json()).catch(() => null)
    ]).then(([detail, list]) => {
      if (cancelled) return
      if (detail && !detail.error) setKbModalCollection(detail)
      const all = Array.isArray(list?.list) ? list.list : []
      setKbModalAllCollections(all.filter((c: MarketCollection) => c.id !== kbDetailId))
      setKbModalSubscribedIds(new Set(all.filter((c: MarketCollection) => c.is_subscribed === 1).map((c: MarketCollection) => c.id)))
    }).finally(() => {
      if (!cancelled) setKbModalLoading(false)
    })
    return () => { cancelled = true }
  }, [kbDetailId])

  // 清理 URL 上的 deep-link 参数（保留 ?explore=kb 但移除 id，避免刷新再次弹窗）
  useEffect(() => {
    if (kbDetailId === null) return
    if (typeof window === "undefined") return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get("explore") === "kb" && sp.get("id")) {
      sp.delete("id")
      const qs = sp.toString()
      const url = window.location.pathname + (qs ? `?${qs}` : "")
      window.history.replaceState({}, "", url)
    }
  }, [kbDetailId])

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
    skills: manageItems.filter(i => i.category === "skill").length,
  }), [manageItems])

  // 当前 tab 过滤后的列表
  const filteredManageItems = useMemo(() => {
    let items = manageItems

    // 按 tab 过滤
    if (manageTab === "plugins") items = items.filter(i => i.category === "mcp")
    else if (manageTab === "skills") items = items.filter(i => i.category === "skill")

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
    { key: "skills", label: "技能", count: manageCounts.skills },
  ]

  // ===== 深浅色通用样式 =====
  const isDark = darkMode

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: closing ? 0 : 1, scale: closing ? 0.98 : 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed z-[150] flex flex-col font-sans overflow-hidden",
        "top-3 right-3 bottom-3",
        sidebarOpen ? "left-[272px]" : "left-3",
        isDark ? "bg-zinc-950 text-zinc-100" : "bg-white text-gray-900",
        closing && "pointer-events-none"
      )}
      style={{ borderRadius: 12 }}
    >
      {/* Header */}
      <div className={cn(
        "h-16 flex items-center gap-3 px-8 shrink-0",
        isDark ? "bg-zinc-950" : "bg-white"
      )}>
        {/* 展开 + 新建对话（仅 sidebar 收起时显示在最左侧） */}
        {!sidebarOpen && (
          <div className="flex items-center gap-1">
            {onExpandSidebar && (
              <button
                onClick={onExpandSidebar}
                className={cn(
                  "size-9 rounded-xl flex items-center justify-center transition-colors",
                  isDark ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                )}
                title="展开侧边栏"
              >
                <PanelLeftOpen size={17} />
              </button>
            )}
            {onNewChat && (
              <button
                onClick={onNewChat}
                className={cn(
                  "size-9 rounded-xl flex items-center justify-center transition-colors",
                  isDark ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                )}
                title="新建对话"
              >
                <Plus size={17} />
              </button>
            )}
          </div>
        )}

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
            <button
              onClick={() => { setActiveTab("knowledge"); setSearchQuery("") }}
              className={cn(
                "px-5 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === "knowledge"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              知识库
            </button>
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-3 ml-auto">
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
            onClick={handleClose}
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
      <div className="flex-1 overflow-hidden flex flex-col">
        {viewMode === "manage" ? (
          /* ===== 管理视图 ===== */
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* 工具栏：Tab + 搜索 */}
            <div className={cn(
              "flex items-center justify-between px-6 py-4 shrink-0 border-b",
              isDark ? "border-zinc-800/60 bg-zinc-950/30" : "border-gray-200/80 bg-blue-50/30"
            )}>
              {/* Tab 栏 */}
              <div className="flex items-center gap-1">
                {manageTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setManageTab(tab.key); setManageSearchQuery("") }}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium transition-all",
                      manageTab === tab.key
                        ? (isDark ? "bg-zinc-100 text-zinc-900" : "bg-white text-blue-600 shadow-sm border border-blue-200/60")
                        : (isDark ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40" : "text-gray-500 hover:text-gray-700 hover:bg-white/60")
                    )}
                    style={{ borderRadius: BERRY_THEME.radius.sm }}
                  >
                    <span>{tab.label}</span>
                    <span className={cn(
                      "text-[10px] leading-none px-1.5 py-0.5",
                      manageTab === tab.key
                        ? (isDark ? "bg-zinc-200 text-zinc-600" : "bg-blue-50 text-blue-500")
                        : (isDark ? "bg-zinc-800/60 text-zinc-600" : "bg-gray-200/60 text-gray-400")
                    )} style={{ borderRadius: 6 }}>
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
                    "w-full border pl-9 pr-3 py-1.5 text-xs transition-colors focus:outline-none focus:ring-2",
                    isDark
                      ? "bg-zinc-900 border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:border-zinc-700"
                      : "bg-white border-gray-200 text-gray-700 placeholder-gray-400 focus:border-blue-300"
                  )}
                  style={{ borderRadius: BERRY_THEME.radius.sm, boxShadow: 'none' }}
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
                      "group flex items-center gap-4 px-4 py-3 border transition-colors shadow-sm",
                      isDark ? "bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/60" : "bg-white hover:bg-blue-50/40 border-gray-200/60"
                    )}
                    style={{ borderRadius: BERRY_THEME.radius.md }}
                  >
                    {/* 图标 */}
                    <div
                      className={cn(
                        "size-10 flex items-center justify-center shrink-0 overflow-hidden",
                        isDark ? "bg-zinc-800" : "bg-blue-50"
                      )}
                      style={{ borderRadius: BERRY_THEME.radius.sm }}
                    >
                      {item.icon && item.icon.length <= 2 ? (
                        <span className="text-lg">{item.icon}</span>
                      ) : item.icon ? (
                        <ManageItemIcon icon={item.icon} name={item.name} darkMode={isDark} />
                      ) : (
                        <span className={cn(
                          "font-bold text-sm",
                          isDark ? "text-zinc-400" : "text-blue-600"
                        )} style={{ color: !isDark ? BERRY_THEME.primary : undefined }}>{item.name.charAt(0)}</span>
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
                        "size-7 flex items-center justify-center transition-colors",
                        isDark ? "hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      )} style={{ borderRadius: BERRY_THEME.radius.sm }}>
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
          </div>
        ) : (
          /* ===== 浏览视图（与 skill-store / mcp-store / model-store 统一设计） ===== */
          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <div className="max-w-6xl mx-auto px-6 pt-6 pb-12 flex flex-col">

                {activeTab === "skills" ? (
                  /* 技能 tab：SkillStore 自带标题/插图/标签/搜索/子标签/卡片网格 */
                  <SkillStore />
                ) : activeTab === "knowledge" ? (
                  /* 知识库 tab：KBStoreContent 自带完整页面结构（标题/插图/标签/搜索/子标签/卡片网格/详情） */
                  <KBStoreContent
                    searchQuery={searchQuery}
                    darkMode={isDark}
                    onOpenCollection={(id) => {
                      // 覆盖层展示，与探索/插件详情一致——不再跳转到独立页面
                      setActiveTab("knowledge")
                      setKbDetailId(id)
                    }}
                  />
                ) : (
                  /* 插件 tab：与技能 tab 一致，MCPStoreContent 自带完整页面结构（标题/插图/标签/搜索/子标签/卡片网格/详情） */
                  <MCPStoreContent
                    searchQuery={searchQuery}
                    darkMode={isDark}
                    onTryInChat={(toolName) => {
                      window.dispatchEvent(new CustomEvent('berry:mention-tool', { detail: { toolName } }))
                    }}
                  />
                )}

              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* KB 详情覆盖层——以 Modal 形式居中浮在探索区域上，与新设计一致 */}
      <AnimatePresence>
        {kbDetailId !== null && kbModalCollection && (
          <CollectionDetailModal
            key={`kb-modal-${kbModalCollection.id}`}
            collection={kbModalCollection}
            subscribedIds={kbModalSubscribedIds}
            allCollections={kbModalAllCollections}
            onClose={() => setKbDetailId(null)}
            onSubscribe={async (c) => {
              try {
                const res = await fetch(`/api/knowledge/market/${c.id}/subscribe`, { method: "POST" })
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}))
                  throw new Error(err.error || "订阅失败")
                }
                const next = new Set(kbModalSubscribedIds)
                next.add(c.id)
                setKbModalSubscribedIds(next)
                setKbModalCollection({ ...kbModalCollection, is_subscribed: 1 })
                toast.success(`已订阅「${c.name}」`)
              } catch (e: any) {
                toast.error(e.message || "订阅失败")
              }
            }}
            onUnsubscribe={async (c) => {
              try {
                const res = await fetch(`/api/knowledge/market/${c.id}/subscribe`, { method: "DELETE" })
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}))
                  throw new Error(err.error || "取消失败")
                }
                const next = new Set(kbModalSubscribedIds)
                next.delete(c.id)
                setKbModalSubscribedIds(next)
                setKbModalCollection({ ...kbModalCollection, is_subscribed: 0 })
                toast.success(`已取消订阅「${c.name}」`)
              } catch (e: any) {
                toast.error(e.message || "取消失败")
              }
            }}
            onOpen={(c) => {
              // 关闭探索覆盖层，并通过自定义事件通知 AI 助手载入该知识库进行对话
              setKbDetailId(null)
              onClose()
              window.dispatchEvent(new CustomEvent('berry:open-kb-chat', { detail: { collectionId: c.id, name: c.name } }))
            }}
            onSelect={(c) => {
              // 切换到另一个 KB 的详情（推荐区点击）
              setKbDetailId(c.id)
            }}
          />
        )}
        {kbDetailId !== null && kbModalLoading && !kbModalCollection && (
          <div
            key="kb-modal-loading"
            className="absolute inset-0 z-30 flex items-center justify-center"
            style={{ background: isDark ? "rgba(9,9,11,0.6)" : "rgba(255,255,255,0.6)", backdropFilter: "blur(3px)" }}
          >
            <div className="size-8 rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin" />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
