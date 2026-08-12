"use client"

import { useState, useMemo, useEffect } from "react"
import { X, Share2, MoreHorizontal, Search, Filter, Play, FileText, FileType, Music, Image as ImageIcon, Download, Trash2, Eye, Star, StarOff, FolderOpen, Clock, Sparkles, PanelLeftOpen, Plus, BrainCircuit } from "lucide-react"
import { Dropdown, Tooltip, message } from "antd"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export type SpaceItemType = "report" | "video" | "task" | "file" | "audio" | "creation" | "image"

export interface SpaceItem {
  id: string
  title: string
  type: SpaceItemType | string
  /** 分类标签（用于 tab 过滤） */
  category?: "recent" | "favorite" | "creation" | "file" | "audio"
  timestamp: number
  html?: string
  /** 收藏 */
  favorite?: boolean
  /** 缩略图 base64/url（可选） */
  thumbnail?: string
}

interface MySpaceSidebarPanelProps {
  open: boolean
  onClose: () => void
  darkMode?: boolean
  items: SpaceItem[]
  onDelete?: (id: string) => void
  onToggleFavorite?: (id: string) => void
  onOpenItem?: (item: SpaceItem) => void
  onDownload?: (item: SpaceItem) => void
  onItemsChange?: () => void
  /** sidebar 是否展开；收起时面板 left 收缩到 12px */
  sidebarOpen?: boolean
  /** sidebar 收起时面板内显示的展开按钮回调 */
  onExpandSidebar?: () => void
  /** sidebar 收起时面板内显示的新建对话按钮回调 */
  onNewChat?: () => void
}

const TYPE_META: Record<string, { label: string; color: string; icon: any }> = {
  report:    { label: "报告",   color: "#6366f1", icon: FileText },
  video:     { label: "视频",   color: "#ec4899", icon: Play },
  task:      { label: "任务助理", color: "#10b981", icon: Sparkles },
  file:      { label: "文件",   color: "#3b82f6", icon: FileType },
  audio:     { label: "音频",   color: "#f59e0b", icon: Music },
  creation:  { label: "创作",   color: "#8b5cf6", icon: Sparkles },
  image:     { label: "图片",   color: "#06b6d4", icon: ImageIcon },
}

const pad2 = (n: number) => n.toString().padStart(2, "0")

/** 格式化为 "2026-05-21 23:07" 风格 */
const formatFullTime = (timestamp: number): string => {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** 缩略图：根据 html 智能截取 / 退化到类型图标 */
const Thumbnail = ({ item, darkMode }: { item: SpaceItem; darkMode: boolean }) => {
  const meta = TYPE_META[item.type] || TYPE_META.file
  const Icon = meta.icon

  // 尝试从 HTML 抽取第一张图片
  const firstImage = useMemo(() => {
    if (!item.html) return null
    const m = item.html.match(/<img[^>]+src=["']([^"']+)["']/i)
    return m?.[1] || null
  }, [item.html])

  if (firstImage) {
    return (
      <div className="relative w-[72px] h-[54px] rounded-md overflow-hidden flex-shrink-0 border border-black/5 dark:border-white/5">
        <img src={firstImage} alt={item.title} className="w-full h-full object-cover" />
        <div
          className="absolute top-1 left-1 w-4 h-4 rounded flex items-center justify-center"
          style={{ background: meta.color }}
        >
          <Icon size={9} className="text-white" />
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative w-[72px] h-[54px] rounded-md flex items-center justify-center flex-shrink-0"
      style={{ background: darkMode ? "rgba(255,255,255,0.04)" : "#f3f4f6" }}
    >
      <div
        className="absolute top-1 left-1 w-4 h-4 rounded flex items-center justify-center"
        style={{ background: meta.color }}
      >
        <Icon size={9} className="text-white" />
      </div>
      <Icon size={22} style={{ color: darkMode ? "#52525b" : "#cbd5e1" }} />
    </div>
  )
}

const ItemRow = ({
  item,
  darkMode,
  onOpen,
  onDownload,
  onDelete,
  onToggleFavorite,
}: {
  item: SpaceItem
  darkMode: boolean
  onOpen: () => void
  onDownload?: () => void
  onDelete?: () => void
  onToggleFavorite?: () => void
}) => {
  const meta = TYPE_META[item.type] || TYPE_META.file
  const isDark = darkMode

  return (
    <div
      onClick={onOpen}
      className={cn(
        "group flex items-center gap-4 py-3.5 px-2 rounded-lg cursor-pointer transition-colors border-b",
        isDark
          ? "hover:bg-zinc-900/60 border-zinc-900"
          : "hover:bg-gray-50 border-gray-100"
      )}
    >
      <Thumbnail item={item} darkMode={isDark} />

      {/* 标题（占主要空间） */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-[14.5px] font-medium truncate leading-tight",
            isDark ? "text-zinc-100" : "text-gray-900"
          )}
        >
          {item.title}
        </div>
        {item.html && item.type === "task" && (
          <div className={cn("text-[12px] truncate mt-0.5", isDark ? "text-zinc-500" : "text-gray-400")}>
            {/* 子描述：解析出 html 中的第一行纯文本作为摘要 */}
            {extractFirstLine(item.html)}
          </div>
        )}
      </div>

      {/* 类型标签 */}
      <div
        className="text-[12.5px] flex-shrink-0 w-16 text-right"
        style={{ color: isDark ? "#71717a" : "#9ca3af" }}
      >
        {meta.label}
      </div>

      {/* 时间戳 */}
      <div
        className={cn(
          "text-[12.5px] flex-shrink-0 w-[120px] text-right tabular-nums",
          isDark ? "text-zinc-500" : "text-gray-400"
        )}
      >
        {formatFullTime(item.timestamp)}
      </div>

      {/* 操作按钮组 */}
      <div
        className={cn(
          "flex items-center gap-1 flex-shrink-0 transition-opacity",
          isDark ? "text-zinc-500" : "text-gray-400"
        )}
      >
        <Tooltip title="分享">
          <button
            onClick={(e) => { e.stopPropagation() }}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-md transition-colors",
              isDark ? "hover:bg-zinc-800 hover:text-zinc-200" : "hover:bg-gray-100 hover:text-gray-700"
            )}
          >
            <Share2 size={14} />
          </button>
        </Tooltip>
        <Dropdown
          trigger={["click"]}
          menu={{
            items: buildMenuItems({
              item,
              onOpen,
              onDownload,
              onToggleFavorite,
              onDelete,
            }),
          }}
        >
          <button
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-md transition-colors",
              isDark ? "hover:bg-zinc-800 hover:text-zinc-200" : "hover:bg-gray-100 hover:text-gray-700"
            )}
          >
            <MoreHorizontal size={14} />
          </button>
        </Dropdown>
      </div>
    </div>
  )
}

/** 从 HTML 抽取第一行纯文本 */
function extractFirstLine(html: string): string {
  try {
    const text = html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    return text.length > 60 ? text.slice(0, 60) + "…" : text
  } catch {
    return ""
  }
}

type MenuHandlers = {
  item: SpaceItem
  onOpen: () => void
  onDownload?: () => void
  onToggleFavorite?: () => void
  onDelete?: () => void
}

function buildMenuItems({ item, onOpen, onDownload, onToggleFavorite, onDelete }: MenuHandlers) {
  const stopAndRun = (fn: () => void) => ({ domEvent }: any) => {
    domEvent.stopPropagation()
    fn()
  }
  const items: any[] = [
    { key: "open", label: "打开查看", icon: <Eye size={13} />, onClick: stopAndRun(onOpen) },
  ]
  if (onDownload) {
    items.push({ key: "download", label: "下载", icon: <Download size={13} />, onClick: stopAndRun(onDownload) })
  }
  if (onToggleFavorite) {
    items.push({ type: "divider" })
    items.push({
      key: "fav",
      label: item.favorite ? "取消收藏" : "收藏",
      icon: item.favorite ? <StarOff size={13} /> : <Star size={13} />,
      onClick: stopAndRun(onToggleFavorite),
    })
  }
  if (onDelete) {
    items.push({ type: "divider" })
    items.push({
      key: "delete",
      label: <span style={{ color: "#ef4444" }}>删除</span>,
      icon: <Trash2 size={13} style={{ color: "#ef4444" }} />,
      danger: true,
      onClick: stopAndRun(onDelete),
    })
  }
  return items
}

export function MySpaceSidebarPanel({
  open,
  onClose,
  darkMode = false,
  items,
  onDelete,
  onToggleFavorite,
  onOpenItem,
  onDownload,
  onItemsChange,
  sidebarOpen = true,
  onExpandSidebar,
  onNewChat,
}: MySpaceSidebarPanelProps) {
  const isDark = darkMode
  const [activeTab, setActiveTab] = useState<string>("recent")
  const [keyword, setKeyword] = useState("")
  const [generatingMemory, setGeneratingMemory] = useState(false)

  // 生成记忆档案并保存到"我的空间"
  const handleGenerateMemoryReport = async () => {
    if (generatingMemory) return
    setGeneratingMemory(true)
    try {
      const res = await fetch("/api/ai/memory-report", {
        method: "POST",
        credentials: "include"
      })
      const data = await res.json()
      if (!res.ok) {
        message.error(data?.error || "生成记忆档案失败")
      } else {
        message.success("记忆档案已生成并保存到我的空间")
        onItemsChange?.()
      }
    } catch {
      message.error("网络错误，请稍后重试")
    } finally {
      setGeneratingMemory(false)
    }
  }

  // 按时间倒序
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => b.timestamp - a.timestamp)
  }, [items])

  // 按 tab 过滤
  const filteredByTab = useMemo(() => {
    if (activeTab === "recent") return sortedItems
    if (activeTab === "favorite") return sortedItems.filter(i => i.favorite)
    if (activeTab === "creation") return sortedItems.filter(i => i.category === "creation" || i.type === "report" || i.type === "video" || i.type === "image")
    if (activeTab === "file") return sortedItems.filter(i => i.category === "file" || i.type === "file")
    if (activeTab === "audio") return sortedItems.filter(i => i.category === "audio" || i.type === "audio")
    return sortedItems
  }, [sortedItems, activeTab])

  // 关键词过滤
  const filteredItems = useMemo(() => {
    if (!keyword.trim()) return filteredByTab
    const k = keyword.toLowerCase()
    return filteredByTab.filter(i => i.title.toLowerCase().includes(k))
  }, [filteredByTab, keyword])

  const handleOpen = (item: SpaceItem) => {
    if (onOpenItem) {
      onOpenItem(item)
    } else if (item.html) {
      const blob = new Blob([item.html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    }
  }

  const handleDownload = (item: SpaceItem) => {
    if (onDownload) {
      onDownload(item)
      return
    }
    if (!item.html) {
      message.warning("该条目没有可下载内容")
      return
    }
    const blob = new Blob([item.html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${item.title}_${formatFullTime(item.timestamp).replace(/[: ]/g, '-')}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 关闭中状态：点击 X 立刻给 wrapper 加 pointer-events-none
  // 父组件传 open=true 时重置，避免下次打开时残留
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    if (open) setClosing(false)
  }, [open])
  const handleClose = () => {
    if (closing) return
    setClosing(true)
    onClose()
  }
  // Esc 键关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closing) handleClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closing])

  return (
    <AnimatePresence>
      {open && (
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
          <div
            className={cn(
              "px-8 pt-6 pb-3 shrink-0",
              isDark ? "bg-zinc-950" : "bg-white"
            )}
          >
            {/* 展开 + 新建对话（仅 sidebar 收起时显示在最左侧） */}
            {!sidebarOpen && (
              <div className="flex items-center gap-1 mb-4">
                {onExpandSidebar && (
                  <Tooltip title="展开侧边栏">
                    <button
                      onClick={onExpandSidebar}
                      className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
                        isDark
                          ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <PanelLeftOpen size={17} />
                    </button>
                  </Tooltip>
                )}
                {onNewChat && (
                  <Tooltip title="新建对话">
                    <button
                      onClick={onNewChat}
                      className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
                        isDark
                          ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <Plus size={17} />
                    </button>
                  </Tooltip>
                )}
              </div>
            )}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1
                  className={cn(
                    "text-2xl font-semibold tracking-tight",
                    isDark ? "text-zinc-100" : "text-gray-900"
                  )}
                >
                  我的空间
                </h1>
                <p
                  className={cn(
                    "mt-1 text-sm",
                    isDark ? "text-zinc-500" : "text-gray-500"
                  )}
                >
                  你生成的所有内容都会保存在这里
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip title="关闭">
                  <button
                    onClick={handleClose}
                    className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
                      isDark
                        ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <X size={17} />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* 搜索框 */}
            <div
              className={cn(
                "flex items-center gap-2 px-3 h-9 rounded-lg border transition-colors",
                isDark
                  ? "bg-zinc-900 border-zinc-800 focus-within:border-zinc-700"
                  : "bg-gray-50 border-gray-200 focus-within:border-gray-300"
              )}
            >
              <Search size={14} className={isDark ? "text-zinc-500" : "text-gray-400"} />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索内容…"
                className={cn(
                  "flex-1 bg-transparent outline-none text-[13.5px]",
                  isDark ? "text-zinc-200 placeholder:text-zinc-600" : "text-gray-800 placeholder:text-gray-400"
                )}
              />
            </div>
          </div>

          {/* 主体内容区 */}
          <div
            className={cn(
              "flex-1 overflow-y-auto",
              isDark ? "bg-zinc-950" : "bg-white"
            )}
          >
            {/* Tabs 行 */}
            <div
              className={cn(
                "sticky top-0 z-10 flex items-center justify-between px-8 pt-2 pb-3 border-b",
                isDark ? "bg-zinc-950 border-zinc-900" : "bg-white border-gray-100"
              )}
            >
              <div className="flex items-center gap-6">
                {[
                  { key: "recent", label: "最近" },
                  { key: "favorite", label: "收藏" },
                  { key: "creation", label: "创作" },
                  { key: "file", label: "文件" },
                  { key: "audio", label: "音频" },
                ].map(tab => {
                  const active = activeTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        "relative py-2 text-[14.5px] font-medium transition-colors",
                        active
                          ? (isDark ? "text-zinc-100" : "text-gray-900")
                          : (isDark ? "text-zinc-500 hover:text-zinc-300" : "text-gray-500 hover:text-gray-800")
                      )}
                    >
                      {tab.label}
                      <span
                        className={cn(
                          "absolute -bottom-[13px] left-0 right-0 h-[2px] rounded-full transition-all duration-200",
                          active
                            ? (isDark ? "bg-zinc-100 opacity-100 scale-x-100" : "bg-gray-900 opacity-100 scale-x-100")
                            : "bg-transparent opacity-0 scale-x-0"
                        )}
                        style={{ pointerEvents: "none", transformOrigin: "center" }}
                      />
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-1">
                <Tooltip title="导出记忆档案">
                  <button
                    onClick={handleGenerateMemoryReport}
                    disabled={generatingMemory}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                      isDark
                        ? "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                        : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    )}
                  >
                    <BrainCircuit size={15} className={generatingMemory ? "animate-pulse" : ""} />
                  </button>
                </Tooltip>
                <Tooltip title="筛选">
                  <button
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                      isDark
                        ? "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                        : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    )}
                  >
                    <Filter size={15} />
                  </button>
                </Tooltip>
                <Tooltip title="刷新">
                  <button
                    onClick={onItemsChange}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                      isDark
                        ? "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                        : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    )}
                  >
                    <Clock size={15} />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* 列表 */}
            <div className="px-8">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center mb-4",
                      isDark ? "bg-zinc-900" : "bg-gray-50"
                    )}
                  >
                    <FolderOpen size={28} className={isDark ? "text-zinc-700" : "text-gray-300"} />
                  </div>
                  <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-400")}>
                    {keyword ? "没有匹配的内容" : "暂无内容"}
                  </p>
                  <p className={cn("text-xs mt-1", isDark ? "text-zinc-600" : "text-gray-300")}>
                    与 AI 对话生成的内容会自动保存到这里
                  </p>
                </div>
              ) : (
                <div>
                  {filteredItems.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      darkMode={isDark}
                      onOpen={() => handleOpen(item)}
                      onDownload={() => handleDownload(item)}
                      onDelete={onDelete ? () => onDelete(item.id) : undefined}
                      onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(item.id) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
