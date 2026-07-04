"use client"

/**
 * 知识库侧边面板
 *
 * 嵌入在 AI 助手对话区内的右侧抽屉面板（fixed 定位，12px 圆角，无阴影，Ant Design 蓝主色）。
 *
 * 功能：
 * - 左侧：分类（集合）树 + 标签筛选
 * - 中部：条目列表 / 搜索结果
 * - 右侧：条目详情（多格式预览 + 元数据 + 版本）
 *
 * 与我的空间/定时任务风格保持一致：top-3 right-3 bottom-3 left-[272px]
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import {
  X, Search, Plus, FolderPlus, FileText, Image as ImageIcon, FileType, Music, Video,
  Star, StarOff, Trash2, MoreHorizontal, ChevronRight, ChevronDown, Folder, FolderOpen,
  Tag, Clock, History, RotateCcw, Download, Eye, Edit3, Upload, Sparkles, BookOpen,
  Link2, FileCode, Database, RefreshCw, Settings, Share2, Lock, Filter, PanelLeftOpen,
  ArrowLeft, AlertCircle, CheckCircle2, Loader2, Hash, Copy, ExternalLink, Save,
  ShieldCheck, HardDrive, Cloud
} from "lucide-react"
import { Dropdown, Tooltip, App, Modal, Input as AntInput, Select, Empty, Spin, Tabs } from "antd"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// ============== 类型定义 ==============

export type ContentType = "note" | "text" | "image" | "document" | "pdf" | "audio" | "video" | "web_clip" | "link"
export type SearchMode = "hybrid" | "keyword" | "semantic"

export interface KnowledgeCollection {
  id: number
  user_id: number
  name: string
  description: string | null
  parent_id: number | null
  color: string
  icon: string
  sort_order: number
  is_archived: 0 | 1
  item_count: number
  created_at: number
  updated_at: number
}

export interface KnowledgeItem {
  id: number
  user_id: number
  collection_id: number | null
  title: string
  content: string | null
  content_type: ContentType
  file_url: string | null
  file_size: number
  mime_type: string | null
  source_url: string | null
  source_metadata: string | null
  summary: string | null
  tags_cache: string
  is_favorite: 0 | 1
  is_archived: 0 | 1
  access_level: string
  current_version: number
  view_count: number
  search_count: number
  last_accessed_at: number | null
  embedding_model: string | null
  embedding_status: string
  created_at: number
  updated_at: number
  tags?: string[]
  collection_name?: string | null
}

export interface KnowledgeVersion {
  id: number
  item_id: number
  version_number: number
  title: string
  content: string | null
  file_url: string | null
  change_summary: string | null
  change_type: string
  created_by: number | null
  created_at: number
}

interface KnowledgeSidebarPanelProps {
  open: boolean
  onClose: () => void
  darkMode?: boolean
  sidebarOpen?: boolean
  onExpandSidebar?: () => void
  onNewChat?: () => void
  /** 当点击条目时回调（用于在对话中 @ 引用） */
  onInsertToChat?: (item: KnowledgeItem) => void
}

// ============== 常量 ==============

const TYPE_META: Record<ContentType, { label: string; color: string; icon: any }> = {
  note:     { label: "笔记",   color: "#1677ff", icon: FileText },
  text:     { label: "文本",   color: "#6366f1", icon: FileText },
  image:    { label: "图片",   color: "#06b6d4", icon: ImageIcon },
  document: { label: "文档",   color: "#3b82f6", icon: FileType },
  pdf:      { label: "PDF",   color: "#ef4444", icon: FileType },
  audio:    { label: "音频",   color: "#f59e0b", icon: Music },
  video:    { label: "视频",   color: "#ec4899", icon: Video },
  web_clip: { label: "网页",   color: "#10b981", icon: Link2 },
  link:     { label: "链接",   color: "#8b5cf6", icon: Link2 }
}

const pad2 = (n: number) => n.toString().padStart(2, "0")
/**
 * 智能归一 timestamp：兼容秒级（10 位）和毫秒级（13 位）输入
 * 1e12 ≈ 33658-09-27 的毫秒值，超过这个值说明已经是毫秒级
 */
const toMs = (ts: number) => {
  if (!Number.isFinite(ts)) return NaN
  return ts < 1e12 ? ts * 1000 : ts
}
const formatTime = (ts: number) => {
  const d = new Date(toMs(ts))
  if (isNaN(d.getTime())) return ""
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
const formatFullTime = (ts: number) => {
  const d = new Date(toMs(ts))
  if (isNaN(d.getTime())) return ""
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
const formatSize = (bytes: number) => {
  if (!bytes) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

// ============== 配置 Hook ==============

/**
 * 从 /api/knowledge/config 读取知识库配置（admin 可在后台调整）
 * 提供：上传限制、GLM 开关、UI 行为（防抖、分页）等
 * 未加载完成时使用保守的本地默认值，避免阻塞 UI
 */
function useKnowledgeConfig() {
  const [config, setConfig] = useState<any>(null)
  useEffect(() => {
    let cancelled = false
    fetch("/api/knowledge/config")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data?.config) setConfig(data.config)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  return config
}

// ============== 主组件 ==============

export function KnowledgeSidebarPanel({
  open,
  onClose,
  darkMode = false,
  sidebarOpen = true,
  onExpandSidebar,
  onNewChat,
  onInsertToChat
}: KnowledgeSidebarPanelProps) {
  const isDark = darkMode
  // 必须用 App.useApp() 拿到 context 绑定的 message，
  // 否则静态 message.warning 无法消费 dynamic theme
  const { message } = App.useApp()
  const kc = useKnowledgeConfig()
  // 解析后的配置：未加载时使用保守本地默认值（保证 UI 正常）
  // 所有默认值都尽量与 provider-resolver 的 DEFAULT_KNOWLEDGE_CONFIG 对齐
  const cfg = useMemo(() => ({
    listPageSize: 100,
    searchDebounceMs: 300,
    maxTagBadges: 12,
    maxRecommendationCards: 4,
    recommendMaxResults: 5,
    glmAutoOcr: true,
    glmEnableRerank: true,
    listPreviewChars: 100,
    recommendationPreviewChars: 60,
    createItemTextareaMinRows: 6,
    createItemTextareaMaxRows: 20,
    detailEditorTextareaMinRows: 12,
    detailEditorTextareaMaxRows: 30,
    backupListMaxHeight: 280,
    backupPollingIntervals: [1000, 4000] as number[],
    summaryMax: 200,
  }), []) // 静态默认；真实值在下方覆盖
  // 真实配置（覆盖默认值）
  const listPageSize = (kc?.ui?.listPageSize as number) ?? cfg.listPageSize
  const searchDebounceMs = (kc?.ui?.searchDebounceMs as number) ?? cfg.searchDebounceMs
  const maxTagBadges = (kc?.ui?.maxTagBadges as number) ?? cfg.maxTagBadges
  const maxRecommendationCards = (kc?.ui?.maxRecommendationCards as number) ?? cfg.maxRecommendationCards
  const recommendMaxResults = (kc?.search?.recommendMaxResults as number) ?? cfg.recommendMaxResults
  const adminGLMAutoOcr = (kc?.glm?.autoOcr as boolean) ?? cfg.glmAutoOcr
  const adminGLMRerank = (kc?.glm?.enableRerank as boolean) ?? cfg.glmEnableRerank
  const listPreviewChars = (kc?.ui?.listPreviewChars as number) ?? cfg.listPreviewChars
  const recommendationPreviewChars = (kc?.ui?.recommendationPreviewChars as number) ?? cfg.recommendationPreviewChars
  const createItemTextareaMinRows = (kc?.ui?.createItemTextareaMinRows as number) ?? cfg.createItemTextareaMinRows
  const createItemTextareaMaxRows = (kc?.ui?.createItemTextareaMaxRows as number) ?? cfg.createItemTextareaMaxRows
  const detailEditorTextareaMinRows = (kc?.ui?.detailEditorTextareaMinRows as number) ?? cfg.detailEditorTextareaMinRows
  const detailEditorTextareaMaxRows = (kc?.ui?.detailEditorTextareaMaxRows as number) ?? cfg.detailEditorTextareaMaxRows
  const backupListMaxHeight = (kc?.ui?.backupListMaxHeight as number) ?? cfg.backupListMaxHeight
  const backupPollingIntervals = (kc?.ui?.backupPollingIntervals as number[]) ?? cfg.backupPollingIntervals
  const summaryMax = (kc?.limits?.summaryMax as number) ?? cfg.summaryMax

  const [collections, setCollections] = useState<KnowledgeCollection[]>([])
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [tags, setTags] = useState<{ name: string; usage_count: number; color: string }[]>([])
  const [selectedCollection, setSelectedCollection] = useState<number | null | "all" | "favorites">("all")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchMode, setSearchMode] = useState<SearchMode>("hybrid")
  const [searchResults, setSearchResults] = useState<KnowledgeItem[] | null>(null)
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateCollection, setShowCreateCollection] = useState(false)
  const [showCreateItem, setShowCreateItem] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [stats, setStats] = useState<{ total_items: number; total_collections: number; storage_bytes: number } | null>(null)
  const [recommendations, setRecommendations] = useState<KnowledgeItem[]>([])
  // 用户上传时的临时覆盖（admin 开关 + 用户 toggle 决定是否走 GLM-OCR）
  const [useGLMOCRToggle, setUseGLMOCRToggle] = useState<boolean | null>(null) // null=跟随 admin
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ============== 数据加载 ==============

  const loadCollections = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge/collections")
      const data = await res.json()
      if (res.ok) setCollections(data.items || [])
    } catch (e) { console.warn("loadCollections failed", e) }
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCollection === "all") {
        // 不传 collectionId
      } else if (selectedCollection === "favorites") {
        params.set("favorite", "1")
      } else if (selectedCollection === null) {
        params.set("collectionId", "root")
      } else {
        params.set("collectionId", String(selectedCollection))
      }
      if (selectedTag) params.set("tag", selectedTag)
      params.set("limit", String(listPageSize))
      const res = await fetch(`/api/knowledge/items?${params}`)
      const data = await res.json()
      if (res.ok) setItems(data.items || [])
    } catch (e) { console.warn("loadItems failed", e) }
    finally { setLoading(false) }
  }, [selectedCollection, selectedTag, listPageSize])

  const loadTags = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge/tags")
      const data = await res.json()
      if (res.ok) setTags(data.tags || [])
    } catch {}
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge/stats")
      const data = await res.json()
      if (res.ok) setStats(data.stats || null)
    } catch {}
  }, [])

  const loadRecommendations = useCallback(async () => {
    try {
      const res = await fetch(`/api/knowledge/recommendations?limit=${recommendMaxResults}&type=history`)
      const data = await res.json()
      if (res.ok) setRecommendations(data.items || [])
    } catch {}
  }, [recommendMaxResults])

  useEffect(() => {
    if (!open) return
    void loadCollections()
    void loadTags()
    void loadStats()
    void loadRecommendations()
  }, [open, loadCollections, loadTags, loadStats, loadRecommendations])

  useEffect(() => {
    if (!open) return
    setSearchResults(null)
    void loadItems()
  }, [open, loadItems])

  // 搜索防抖（延迟走 config.ui.searchDebounceMs）
  useEffect(() => {
    if (!open) return
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: searchQuery,
          mode: searchMode,
          limit: String(kc?.search?.defaultLimit ?? 20)
        })
        const res = await fetch(`/api/knowledge/search?${params}`)
        const data = await res.json()
        if (res.ok) {
          setSearchResults((data.hits || []).map((h: any) => h.item))
        }
      } catch (e) { console.warn("search failed", e) }
    }, searchDebounceMs)
    return () => clearTimeout(timer)
  }, [searchQuery, searchMode, open, searchDebounceMs, kc])

  // ============== 操作函数 ==============

  const handleCreateCollection = async (name: string, color: string) => {
    try {
      const res = await fetch("/api/knowledge/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color })
      })
      if (res.ok) {
        message.success("集合已创建")
        setShowCreateCollection(false)
        await loadCollections()
      } else {
        const err = await res.json()
        message.error(err.error || "创建失败")
      }
    } catch (e: any) { message.error(e.message) }
  }

  const handleDeleteCollection = async (id: number) => {
    Modal.confirm({
      title: "删除集合",
      content: "删除后该集合下的条目会移动到根目录，集合本身会被移除。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        const res = await fetch(`/api/knowledge/collections?id=${id}`, { method: "DELETE" })
        if (res.ok) {
          message.success("集合已删除")
          if (selectedCollection === id) setSelectedCollection("all")
          await loadCollections()
          await loadItems()
        }
      }
    })
  }

  const handleCreateItem = async (data: {
    title: string
    content: string
    content_type: ContentType
    collection_id: number | null
    tags: string[]
    summary?: string
  }) => {
    try {
      const res = await fetch("/api/knowledge/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        message.success("条目已创建")
        setShowCreateItem(false)
        await loadItems()
        await loadStats()
      } else {
        const err = await res.json()
        message.error(err.error || "创建失败")
      }
    } catch (e: any) { message.error(e.message) }
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      if (selectedCollection && typeof selectedCollection === "number") {
        formData.append("collection_id", String(selectedCollection))
      }
      if (selectedTag) formData.append("tags", selectedTag)
      // GLM-OCR 解析：优先级 用户 toggle > admin 配置 > 客户端默认（true）
      // admin 已统一在服务端用 kc.glm.autoOcr 默认走 OCR，但允许用户 per-upload 覆盖
      const isPdfOrImage = file.type === "application/pdf" || file.type.startsWith("image/")
      const wantsOCR = isPdfOrImage && (useGLMOCRToggle ?? adminGLMAutoOcr)
      if (isPdfOrImage) {
        // 显式传值：true=用户/admin 启用，false=用户明确禁用
        formData.append("use_glm_ocr", wantsOCR ? "true" : "false")
      }
      const res = await fetch("/api/knowledge/upload", { method: "POST", body: formData })
      // 即使 body 解析失败也降级为空对象，避免因网络/JSON 问题误报"上传失败"
      const data = await res.json().catch(() => ({} as any))
      // 只要 HTTP 200 就视为服务端成功（即使 data.success 字段缺失）
      // 解决"上传失败但刷新后能看到条目"的 bug：服务端 catch 在 createItem 之后仍可能返回 5xx
      if (res.ok) {
        let msg = `已上传「${file.name}」`
        if (data?.extractionMethod === "glm-ocr") {
          msg += `（GLM-OCR 解析，${data.extractedLength} 字符）`
        } else if (data?.extractionMethod && data.extractionMethod !== "none") {
          msg += `（${data.extractionMethod} 解析）`
        }
        if (data?.embedding?.status === "ready") {
          msg += ` · ${data.embedding.chunkCount} 个分块已向量化`
        } else if (data?.embedding?.status === "failed") {
          // 向量化失败不算"上传失败"——文件已经入库，提示用户稍后重试向量化即可
          message.warning(`已上传「${file.name}」，但向量化失败：${data.embedding.error}（可在详情页手动重试）`)
          await loadItems()
          await loadStats()
          return
        }
        message.success(msg)
        await loadItems()
        await loadStats()
      } else {
        // 真正的 4xx/5xx：可能是权限/类型/大小限制
        console.error("[knowledge/upload] failed:", res.status, data)
        message.error(data?.error || `上传失败（HTTP ${res.status}）`)
      }
    } catch (e: any) {
      console.error("[knowledge/upload] exception:", e)
      message.error(e?.message || "上传失败")
    }
    finally { setUploading(false) }
  }

  const handleDeleteItem = async (id: number) => {
    Modal.confirm({
      title: "删除条目",
      content: "此操作不可恢复，确定要删除吗？",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        const res = await fetch(`/api/knowledge/items/${id}`, { method: "DELETE" })
        if (res.ok) {
          message.success("条目已删除")
          if (selectedItem?.id === id) setSelectedItem(null)
          await loadItems()
          await loadStats()
        }
      }
    })
  }

  const handleToggleFavorite = async (item: KnowledgeItem) => {
    try {
      const res = await fetch(`/api/knowledge/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: !item.is_favorite, create_version: false })
      })
      if (res.ok) {
        const updated = { ...item, is_favorite: (item.is_favorite ? 0 : 1) as 0 | 1 }
        setItems(prev => prev.map(i => i.id === item.id ? updated : i))
        if (selectedItem?.id === item.id) setSelectedItem(updated)
      }
    } catch (e: any) { message.error(e.message) }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([loadItems(), loadCollections(), loadTags(), loadStats(), loadRecommendations()])
    setRefreshing(false)
    message.success("已刷新")
  }

  const handleItemClick = async (item: KnowledgeItem) => {
    setSelectedItem(item)
    // 后台获取完整数据
    try {
      const res = await fetch(`/api/knowledge/items/${item.id}`)
      const data = await res.json()
      if (res.ok) setSelectedItem(data.item)
    } catch {}
  }

  // ============== 渲染 ==============

  if (!open) return null

  const displayItems = searchResults ?? items

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed z-[150] flex font-sans overflow-hidden",
        "top-3 right-3 bottom-3",
        sidebarOpen ? "left-[272px]" : "left-3",
        isDark ? "bg-zinc-950 text-zinc-100" : "bg-white text-gray-900"
      )}
      style={{ borderRadius: 12 }}
    >
      {/* ============== 左侧：分类/标签栏 ============== */}
      <div
        className={cn(
          "w-[220px] flex-shrink-0 flex flex-col border-r",
          isDark ? "bg-zinc-950 border-zinc-800" : "bg-white border-gray-100"
        )}
      >
        {/* 顶部操作条 */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-2 shrink-0">
          {!sidebarOpen && onExpandSidebar && (
            <Tooltip title="展开侧边栏">
              <button
                onClick={onExpandSidebar}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-gray-100 text-gray-500"
                )}
              >
                <PanelLeftOpen size={15} strokeWidth={1.5} />
              </button>
            </Tooltip>
          )}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <BookOpen size={15} strokeWidth={1.5} style={{ color: "#1677ff" }} />
            <span className="text-sm font-medium truncate">知识库</span>
          </div>
          <Tooltip title="关闭">
            <button
              onClick={onClose}
              className={cn(
                "p-1.5 rounded transition-colors",
                isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-gray-100 text-gray-500"
              )}
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </Tooltip>
        </div>

        {/* 集合列表 */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {/* 全部 / 收藏 / 根目录 */}
          <CollectionNavItem
            icon={Database}
            label="全部"
            count={stats?.total_items}
            active={selectedCollection === "all"}
            onClick={() => { setSelectedCollection("all"); setSelectedItem(null) }}
            darkMode={isDark}
          />
          <CollectionNavItem
            icon={Star}
            label="收藏"
            count={stats ? undefined : undefined}
            active={selectedCollection === "favorites"}
            onClick={() => { setSelectedCollection("favorites"); setSelectedItem(null) }}
            darkMode={isDark}
          />
          <CollectionNavItem
            icon={FolderOpen}
            label="未分类"
            count={undefined}
            active={selectedCollection === null}
            onClick={() => { setSelectedCollection(null); setSelectedItem(null) }}
            darkMode={isDark}
          />

          {/* 分隔 */}
          <div className={cn("my-2 h-px", isDark ? "bg-zinc-800" : "bg-gray-100")} />

          {/* 集合列表 */}
          <div className="px-2 mb-1.5 flex items-center justify-between">
            <span className={cn("text-[11px] font-medium uppercase tracking-wide", isDark ? "text-zinc-500" : "text-gray-400")}>
              分类
            </span>
            <Tooltip title="新建分类">
              <button
                onClick={() => setShowCreateCollection(true)}
                className={cn(
                  "p-1 rounded transition-colors",
                  isDark ? "hover:bg-zinc-800 text-zinc-500" : "hover:bg-gray-100 text-gray-400"
                )}
              >
                <FolderPlus size={12} strokeWidth={1.5} />
              </button>
            </Tooltip>
          </div>
          {collections.length === 0 ? (
            <div className={cn("px-3 py-2 text-[11px]", isDark ? "text-zinc-600" : "text-gray-400")}>
              还没有分类
            </div>
          ) : (
            collections.map(c => (
              <CollectionNavItem
                key={c.id}
                icon={Folder}
                label={c.name}
                count={c.item_count}
                color={c.color}
                active={selectedCollection === c.id}
                onClick={() => { setSelectedCollection(c.id); setSelectedItem(null) }}
                onDelete={() => handleDeleteCollection(c.id)}
                darkMode={isDark}
              />
            ))
          )}

          {/* 标签 */}
          {tags.length > 0 && (
            <>
              <div className={cn("my-2 h-px", isDark ? "bg-zinc-800" : "bg-gray-100")} />
              <div className="px-2 mb-1.5">
                <span className={cn("text-[11px] font-medium uppercase tracking-wide", isDark ? "text-zinc-500" : "text-gray-400")}>
                  标签
                </span>
              </div>
              <div className="px-2 flex flex-wrap gap-1">
                <TagBadge
                  name="全部"
                  active={!selectedTag}
                  onClick={() => setSelectedTag(null)}
                  darkMode={isDark}
                />
                {tags.slice(0, maxTagBadges).map(t => (
                  <TagBadge
                    key={t.name}
                    name={t.name}
                    color={t.color}
                    count={t.usage_count}
                    active={selectedTag === t.name}
                    onClick={() => setSelectedTag(selectedTag === t.name ? null : t.name)}
                    darkMode={isDark}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* 底部统计 */}
        {stats && (
          <div
            className={cn(
              "px-4 py-2 text-[11px] flex items-center justify-between border-t shrink-0",
              isDark ? "border-zinc-800 text-zinc-500" : "border-gray-100 text-gray-400"
            )}
          >
            <span>{stats.total_items} 个条目</span>
            <div className="flex items-center gap-1.5">
              <span>{formatSize(stats.storage_bytes)}</span>
              <Tooltip title="备份与权限设置">
                <button
                  onClick={() => setShowSettings(true)}
                  className={cn(
                    "p-0.5 rounded transition-colors",
                    isDark ? "hover:bg-zinc-800" : "hover:bg-gray-200"
                  )}
                >
                  <Settings size={11} className={isDark ? "text-zinc-500" : "text-gray-400"} />
                </button>
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      {/* ============== 中部：列表区 ============== */}
      <div className={cn("flex-1 flex flex-col min-w-0", isDark ? "bg-zinc-900" : "bg-white")}>
        {/* 搜索栏 + 操作 */}
        <div className={cn("px-5 pt-4 pb-3 border-b shrink-0", isDark ? "border-zinc-800" : "border-gray-100")}>
          <div className="flex items-center gap-2">
            {/* 搜索框 */}
            <div
              className={cn(
                "flex-1 flex items-center gap-2 px-3 h-9 rounded-md border",
                isDark ? "bg-zinc-950 border-zinc-800" : "bg-gray-50 border-gray-200"
              )}
            >
              <Search size={14} className={isDark ? "text-zinc-500" : "text-gray-400"} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索知识库（关键词 / 语义）"
                className={cn(
                  "flex-1 bg-transparent text-sm outline-none",
                  isDark ? "text-zinc-100 placeholder:text-zinc-600" : "text-gray-900 placeholder:text-gray-400"
                )}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="p-0.5">
                  <X size={12} className={isDark ? "text-zinc-500" : "text-gray-400"} />
                </button>
              )}
            </div>

            {/* 搜索模式切换 */}
            <Select
              size="small"
              value={searchMode}
              onChange={(v) => setSearchMode(v as SearchMode)}
              style={{ width: 88 }}
              options={[
                { value: "hybrid", label: "混合" },
                { value: "keyword", label: "关键词" },
                { value: "semantic", label: "语义" }
              ]}
            />

            {/* 上传 */}
            <Tooltip title="上传文件">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "h-9 px-2.5 rounded-md border text-xs flex items-center gap-1.5 transition-colors",
                  isDark
                    ? "border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                    : "border-gray-200 hover:bg-gray-50 text-gray-700"
                )}
              >
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} strokeWidth={1.5} />}
                <span>上传</span>
              </button>
            </Tooltip>

            {/* GLM-OCR 用户覆盖（per-upload）：跟随 admin / 启用 / 禁用 */}
            <Tooltip
              title={
                useGLMOCRToggle === null
                  ? `跟随 admin：${adminGLMAutoOcr ? "已启用" : "已禁用"}`
                  : useGLMOCRToggle
                  ? "本地上传：已强制启用 GLM-OCR"
                  : "本地上传：已禁用 GLM-OCR，走本地解析"
              }
            >
              <button
                onClick={() => {
                  // null → true → false → null 循环
                  if (useGLMOCRToggle === null) setUseGLMOCRToggle(true)
                  else if (useGLMOCRToggle === true) setUseGLMOCRToggle(false)
                  else setUseGLMOCRToggle(null)
                }}
                className={cn(
                  "h-9 px-2 rounded-md border text-xs flex items-center gap-1 transition-colors",
                  useGLMOCRToggle === null
                    ? isDark ? "border-zinc-800 text-zinc-500" : "border-gray-200 text-gray-400"
                    : useGLMOCRToggle
                    ? isDark ? "border-blue-700 text-blue-400 bg-blue-950/30" : "border-blue-300 text-blue-600 bg-blue-50"
                    : isDark ? "border-zinc-700 text-zinc-500" : "border-gray-200 text-gray-400 line-through"
                )}
                style={useGLMOCRToggle === true ? { color: "#1677ff", borderColor: "#91caff" } : undefined}
              >
                <Sparkles size={11} strokeWidth={1.5} />
                <span>
                  {useGLMOCRToggle === null
                    ? "OCR·跟随"
                    : useGLMOCRToggle ? "OCR·开" : "OCR·关"}
                </span>
              </button>
            </Tooltip>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              multiple
              accept=".txt,.md,.csv,.json,.xml,.html,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*,audio/*,video/*"
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                files.forEach(f => void handleFileUpload(f))
                e.target.value = ""
              }}
            />

            {/* 新建条目 */}
            <Tooltip title="新建笔记">
              <button
                onClick={() => setShowCreateItem(true)}
                className="h-9 px-2.5 rounded-md text-xs flex items-center gap-1.5 text-white"
                style={{ background: "#1677ff" }}
              >
                <Plus size={13} strokeWidth={1.5} />
                <span>新建</span>
              </button>
            </Tooltip>

            {/* 刷新 */}
            <Tooltip title="刷新">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={cn(
                  "h-9 w-9 rounded-md border flex items-center justify-center transition-colors",
                  isDark ? "border-zinc-800 hover:bg-zinc-800 text-zinc-400" : "border-gray-200 hover:bg-gray-50 text-gray-500"
                )}
              >
                <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} strokeWidth={1.5} />
              </button>
            </Tooltip>
          </div>

          {/* 搜索状态提示 */}
          {searchResults && (
            <div className={cn("mt-2 text-[11px]", isDark ? "text-zinc-500" : "text-gray-500")}>
              找到 <span style={{ color: "#1677ff" }}>{searchResults.length}</span> 条结果 ·
              <span className="ml-1">模式: {searchMode === "hybrid" ? "混合" : searchMode === "keyword" ? "关键词" : "语义"}</span>
            </div>
          )}
        </div>

        {/* 列表内容 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Spin size="small" />
            </div>
          ) : displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-8 py-12">
              <BookOpen size={48} strokeWidth={1} className={isDark ? "text-zinc-700" : "text-gray-300"} />
              <p className={cn("mt-4 text-sm", isDark ? "text-zinc-500" : "text-gray-400")}>
                {searchQuery ? "没有找到匹配的知识" : "知识库还是空的"}
              </p>
              <p className={cn("mt-1 text-xs", isDark ? "text-zinc-600" : "text-gray-400")}>
                {searchQuery ? "试试调整关键词或切换搜索模式" : "上传文件或新建笔记开始构建你的知识库"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateItem(true)}
                  className="mt-4 h-8 px-4 rounded-md text-xs text-white"
                  style={{ background: "#1677ff" }}
                >
                  新建第一条知识
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {displayItems.map(item => (
                <ItemListRow
                  key={item.id}
                  item={item}
                  active={selectedItem?.id === item.id}
                  onClick={() => handleItemClick(item)}
                  onToggleFavorite={() => handleToggleFavorite(item)}
                  onDelete={() => handleDeleteItem(item.id)}
                  onInsertToChat={onInsertToChat ? () => onInsertToChat(item) : undefined}
                  darkMode={isDark}
                />
              ))}
            </div>
          )}

          {/* 推荐（仅在无搜索时显示） */}
          {!searchQuery && recommendations.length > 0 && displayItems.length > 0 && (
            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={12} style={{ color: "#1677ff" }} />
                <span className={cn("text-[11px] font-medium uppercase tracking-wide", isDark ? "text-zinc-500" : "text-gray-500")}>
                  基于历史的推荐
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {recommendations.slice(0, maxRecommendationCards).map(r => (
                  <RecommendationCard
                    key={r.id}
                    item={r}
                    onClick={() => handleItemClick(r)}
                    darkMode={isDark}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============== 右侧：详情面板 ============== */}
      <AnimatePresence>
        {selectedItem && (
          <ItemDetailPanel
            key={selectedItem.id}
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onUpdate={async () => {
              await loadItems()
              if (selectedItem) {
                const res = await fetch(`/api/knowledge/items/${selectedItem.id}`)
                const data = await res.json()
                if (res.ok) setSelectedItem(data.item)
              }
            }}
            onDelete={() => {
              handleDeleteItem(selectedItem.id)
              setSelectedItem(null)
            }}
            onInsertToChat={onInsertToChat ? () => onInsertToChat(selectedItem) : undefined}
            darkMode={isDark}
          />
        )}
      </AnimatePresence>

      {/* ============== Modal：新建集合 ============== */}
      <CreateCollectionModal
        open={showCreateCollection}
        onClose={() => setShowCreateCollection(false)}
        onConfirm={handleCreateCollection}
        darkMode={isDark}
      />

      {/* ============== Modal：新建条目 ============== */}
      <CreateItemModal
        open={showCreateItem}
        onClose={() => setShowCreateItem(false)}
        onConfirm={handleCreateItem}
        collections={collections}
        defaultCollectionId={typeof selectedCollection === "number" ? selectedCollection : null}
        defaultTags={selectedTag ? [selectedTag] : []}
        darkMode={isDark}
      />

      {/* ============== Modal：设置（备份/权限/统计） ============== */}
      <KnowledgeSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        darkMode={isDark}
        stats={stats}
        onRefresh={() => void handleRefresh()}
      />
    </motion.div>
  )
}

// ============== 子组件：集合导航项 ==============

function CollectionNavItem({
  icon: Icon, label, count, color, active, onClick, onDelete, darkMode
}: {
  icon: any
  label: string
  count?: number
  color?: string
  active: boolean
  onClick: () => void
  onDelete?: () => void
  darkMode?: boolean
}) {
  const isDark = darkMode
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-sm",
        active
          ? isDark ? "bg-zinc-800 text-zinc-100" : "bg-blue-50 text-gray-900"
          : isDark ? "hover:bg-zinc-800/50 text-zinc-400" : "hover:bg-gray-50 text-gray-600"
      )}
    >
      <Icon
        size={13}
        strokeWidth={1.5}
        style={{ color: active ? "#1677ff" : color || (isDark ? "#a1a1aa" : "#9ca3af") }}
      />
      <span className="flex-1 truncate text-[13px]">{label}</span>
      {typeof count === "number" && count > 0 && (
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded", isDark ? "bg-zinc-800 text-zinc-500" : "bg-gray-100 text-gray-400")}>
          {count}
        </span>
      )}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className={cn(
            "opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all",
            isDark ? "hover:bg-zinc-700" : "hover:bg-gray-200"
          )}
        >
          <Trash2 size={11} className={isDark ? "text-zinc-500" : "text-gray-400"} />
        </button>
      )}
    </div>
  )
}

// ============== 子组件：标签 ==============

function TagBadge({
  name, color, count, active, onClick, darkMode
}: {
  name: string
  color?: string
  count?: number
  active: boolean
  onClick: () => void
  darkMode?: boolean
}) {
  const isDark = darkMode
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-colors",
        active
          ? "text-white"
          : isDark ? "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      )}
      style={active ? { background: color || "#1677ff" } : undefined}
    >
      <Hash size={9} strokeWidth={1.5} />
      <span className="truncate max-w-[60px]">{name}</span>
      {typeof count === "number" && count > 0 && !active && (
        <span className={isDark ? "text-zinc-600" : "text-gray-400"}>{count}</span>
      )}
    </button>
  )
}

// ============== 子组件：列表行 ==============

function ItemListRow({
  item, active, onClick, onToggleFavorite, onDelete, onInsertToChat, darkMode
}: {
  item: KnowledgeItem
  active: boolean
  onClick: () => void
  onToggleFavorite: () => void
  onDelete: () => void
  onInsertToChat?: () => void
  darkMode?: boolean
}) {
  const isDark = darkMode
  const kc = useKnowledgeConfig()
  // 走 admin knowledgeConfig 暴露的可配置项（未加载时使用兜底默认值）
  const listPreviewChars = (kc?.ui?.listPreviewChars as number) ?? 100
  const meta = TYPE_META[item.content_type] || TYPE_META.note
  const Icon = meta.icon
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-start gap-3 p-2.5 rounded-md cursor-pointer transition-colors",
        active
          ? isDark ? "bg-zinc-800" : "bg-blue-50"
          : isDark ? "hover:bg-zinc-800/50" : "hover:bg-gray-50"
      )}
    >
      {/* 类型图标 */}
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `${meta.color}15`, color: meta.color }}
      >
        <Icon size={15} strokeWidth={1.5} />
      </div>
      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[13px] font-medium truncate", isDark ? "text-zinc-100" : "text-gray-900")}>
            {item.title}
          </span>
          {item.is_favorite ? (
            <Star size={10} className="shrink-0" style={{ color: "#f59e0b", fill: "#f59e0b" }} />
          ) : null}
        </div>
        {item.summary ? (
          <p className={cn("text-[11px] mt-0.5 line-clamp-2", isDark ? "text-zinc-500" : "text-gray-500")}>
            {item.summary}
          </p>
        ) : item.content ? (
          <p className={cn("text-[11px] mt-0.5 line-clamp-1", isDark ? "text-zinc-600" : "text-gray-400")}>
            {item.content.replace(/\n+/g, " ").slice(0, listPreviewChars)}
          </p>
        ) : null}
        <div className={cn("flex items-center gap-2 mt-1 text-[10px]", isDark ? "text-zinc-600" : "text-gray-400")}>
          <span>{formatTime(item.updated_at)}</span>
          {item.collection_name && (
            <>
              <span>·</span>
              <span className="truncate max-w-[80px]">{item.collection_name}</span>
            </>
          )}
          {item.embedding_status === "ready" && (
            <>
              <span>·</span>
              <Tooltip title="已向量化">
                <Sparkles size={9} style={{ color: "#1677ff" }} />
              </Tooltip>
            </>
          )}
          {item.embedding_status === "pending" && (
            <>
              <span>·</span>
              <span>向量化中</span>
            </>
          )}
        </div>
      </div>
      {/* 操作 */}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
        <Tooltip title={item.is_favorite ? "取消收藏" : "收藏"}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
            className={cn(
              "p-1 rounded transition-colors",
              isDark ? "hover:bg-zinc-700" : "hover:bg-gray-200"
            )}
          >
            {item.is_favorite
              ? <Star size={11} className="text-amber-500" fill="currentColor" />
              : <Star size={11} className={isDark ? "text-zinc-500" : "text-gray-400"} />}
          </button>
        </Tooltip>
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              ...(onInsertToChat ? [{
                key: "insert",
                label: "引用到对话",
                icon: <Copy size={12} />,
                onClick: (e: any) => { e.domEvent.stopPropagation(); onInsertToChat() }
              }] : []),
              {
                key: "copy",
                label: "复制标题",
                icon: <Copy size={12} />,
                onClick: (e: any) => { e.domEvent.stopPropagation(); navigator.clipboard.writeText(item.title); message.success("已复制") }
              },
              { type: "divider" },
              {
                key: "delete",
                label: <span style={{ color: "#ef4444" }}>删除</span>,
                icon: <Trash2 size={12} style={{ color: "#ef4444" }} />,
                danger: true,
                onClick: (e: any) => { e.domEvent.stopPropagation(); onDelete() }
              }
            ]
          }}
        >
          <button
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "p-1 rounded transition-colors",
              isDark ? "hover:bg-zinc-700" : "hover:bg-gray-200"
            )}
          >
            <MoreHorizontal size={11} className={isDark ? "text-zinc-500" : "text-gray-400"} />
          </button>
        </Dropdown>
      </div>
    </div>
  )
}

// ============== 子组件：推荐卡片 ==============

function RecommendationCard({
  item, onClick, darkMode
}: { item: KnowledgeItem; onClick: () => void; darkMode?: boolean }) {
  const isDark = darkMode
  const kc = useKnowledgeConfig()
  // 走 admin knowledgeConfig 暴露的可配置项（未加载时使用兜底默认值）
  const recommendationPreviewChars = (kc?.ui?.recommendationPreviewChars as number) ?? 60
  const meta = TYPE_META[item.content_type] || TYPE_META.note
  const Icon = meta.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2.5 rounded-md text-left transition-colors border",
        isDark ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700" : "bg-white border-gray-100 hover:border-gray-200"
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} style={{ color: meta.color }} />
        <span className={cn("text-[11px] font-medium truncate flex-1", isDark ? "text-zinc-200" : "text-gray-700")}>
          {item.title}
        </span>
      </div>
      <p className={cn("text-[10px] line-clamp-2", isDark ? "text-zinc-500" : "text-gray-500")}>
        {item.summary || item.content?.replace(/\n+/g, " ").slice(0, recommendationPreviewChars) || "点击查看详情"}
      </p>
    </button>
  )
}

// ============== 子组件：详情面板 ==============

function ItemDetailPanel({
  item, onClose, onUpdate, onDelete, onInsertToChat, darkMode
}: {
  item: KnowledgeItem
  onClose: () => void
  onUpdate: () => Promise<void> | void
  onDelete: () => void
  onInsertToChat?: () => void
  darkMode?: boolean
}) {
  const isDark = darkMode
  // 必须用 App.useApp() 拿到 context 绑定的 message
  const { message } = App.useApp()
  const kc = useKnowledgeConfig()
  // 走 admin knowledgeConfig 暴露的可配置项（未加载时使用兜底默认值）
  const detailEditorTextareaMinRows = (kc?.ui?.detailEditorTextareaMinRows as number) ?? 12
  const detailEditorTextareaMaxRows = (kc?.ui?.detailEditorTextareaMaxRows as number) ?? 30
  const itemTitleMax = (kc?.limits?.itemTitleMax as number) ?? 500
  const [versions, setVersions] = useState<KnowledgeVersion[]>([])
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title)
  const [editContent, setEditContent] = useState(item.content || "")
  const [editTags, setEditTags] = useState((item.tags || []).join(", "))
  const [saving, setSaving] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [previewVersion, setPreviewVersion] = useState<KnowledgeVersion | null>(null)
  const meta = TYPE_META[item.content_type] || TYPE_META.note
  const Icon = meta.icon

  useEffect(() => {
    setEditTitle(item.title)
    setEditContent(item.content || "")
    setEditTags((item.tags || []).join(", "))
  }, [item.id])

  useEffect(() => {
    if (showVersions) {
      void (async () => {
        try {
          const res = await fetch(`/api/knowledge/items/${item.id}/versions`)
          const data = await res.json()
          if (res.ok) setVersions(data.versions || [])
        } catch {}
      })()
    }
  }, [showVersions, item.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const tags = editTags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
      const res = await fetch(`/api/knowledge/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          tags,
          change_summary: "手动编辑"
        })
      })
      if (res.ok) {
        message.success("已保存")
        setEditing(false)
        await onUpdate()
      } else {
        const err = await res.json()
        message.error(err.error || "保存失败")
      }
    } catch (e: any) { message.error(e.message) }
    finally { setSaving(false) }
  }

  const handleRestoreVersion = async (versionId: number) => {
    Modal.confirm({
      title: "恢复历史版本",
      content: "恢复后当前内容会作为新版本保存到历史中，确定要恢复吗？",
      okText: "恢复",
      cancelText: "取消",
      onOk: async () => {
        try {
          const res = await fetch(`/api/knowledge/items/${item.id}/restore`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ versionId })
          })
          if (res.ok) {
            message.success("已恢复")
            setShowVersions(false)
            setPreviewVersion(null)
            await onUpdate()
          } else {
            const err = await res.json()
            message.error(err.error || "恢复失败")
          }
        } catch (e: any) { message.error(e.message) }
      }
    })
  }

  const handleReEmbed = async () => {
    try {
      const res = await fetch(`/api/knowledge/items/${item.id}/embed`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        message.success(`重新生成了 ${data.chunkCount} 个分块`)
        await onUpdate()
      } else {
        const err = await res.json()
        message.error(err.error || "失败")
      }
    } catch (e: any) { message.error(e.message) }
  }

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "w-[480px] flex-shrink-0 flex flex-col border-l",
        isDark ? "bg-zinc-950 border-zinc-800" : "bg-white border-gray-100"
      )}
    >
      {/* 头部 */}
      <div className={cn("px-5 pt-4 pb-3 border-b flex items-center gap-2 shrink-0", isDark ? "border-zinc-800" : "border-gray-100")}>
        <button
          onClick={onClose}
          className={cn(
            "p-1.5 rounded transition-colors",
            isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-gray-100 text-gray-500"
          )}
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
        </button>
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: `${meta.color}15`, color: meta.color }}
        >
          <Icon size={14} strokeWidth={1.5} />
        </div>
        <span className={cn("text-[11px] px-1.5 py-0.5 rounded", isDark ? "bg-zinc-800 text-zinc-400" : "bg-gray-100 text-gray-500")}>
          {meta.label}
        </span>
        <span className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-gray-400")}>
          v{item.current_version}
        </span>
        <div className="flex-1" />
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              {
                key: "edit",
                label: editing ? "取消编辑" : "编辑",
                icon: <Edit3 size={12} />,
                onClick: () => setEditing(!editing)
              },
              {
                key: "history",
                label: "查看历史",
                icon: <History size={12} />,
                onClick: () => setShowVersions(true)
              },
              {
                key: "reembed",
                label: "重新向量化",
                icon: <RefreshCw size={12} />,
                onClick: () => void handleReEmbed()
              },
              ...(item.file_url ? [{
                key: "download",
                label: "下载原文件",
                icon: <Download size={12} />,
                onClick: () => window.open(item.file_url!, "_blank")
              }] : []),
              ...(onInsertToChat ? [{
                key: "insert",
                label: "引用到对话",
                icon: <Copy size={12} />,
                onClick: () => onInsertToChat()
              }] : []),
              { type: "divider" },
              {
                key: "delete",
                label: <span style={{ color: "#ef4444" }}>删除</span>,
                icon: <Trash2 size={12} style={{ color: "#ef4444" }} />,
                danger: true,
                onClick: () => onDelete()
              }
            ]
          }}
        >
          <button className={cn(
            "p-1.5 rounded transition-colors",
            isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-gray-100 text-gray-500"
          )}>
            <MoreHorizontal size={14} strokeWidth={1.5} />
          </button>
        </Dropdown>
        <button
          onClick={onClose}
          className={cn(
            "p-1.5 rounded transition-colors",
            isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-gray-100 text-gray-500"
          )}
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto">
        {editing ? (
          <div className="p-5 space-y-3">
            <AntInput
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="标题"
              size="large"
              maxLength={itemTitleMax}
            />
            <AntInput.TextArea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="内容"
              autoSize={{ minRows: detailEditorTextareaMinRows, maxRows: detailEditorTextareaMaxRows }}
            />
            <AntInput
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="标签（用逗号分隔）"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-9 rounded-md text-white text-sm flex items-center justify-center gap-1.5"
                style={{ background: "#1677ff" }}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                保存（创建新版本）
              </button>
              <button
                onClick={() => setEditing(false)}
                className={cn(
                  "h-9 px-4 rounded-md text-sm border",
                  isDark ? "border-zinc-800 text-zinc-300" : "border-gray-200 text-gray-700"
                )}
              >
                取消
              </button>
            </div>
          </div>
        ) : previewVersion ? (
          <div className="p-5">
            <div className={cn("flex items-center gap-2 mb-3 p-2 rounded text-xs", isDark ? "bg-amber-950/30 text-amber-200" : "bg-amber-50 text-amber-800")}>
              <AlertCircle size={12} />
              <span>正在预览 v{previewVersion.version_number}（{previewVersion.change_summary}）</span>
              <div className="flex-1" />
              <button
                onClick={() => handleRestoreVersion(previewVersion.id)}
                className="text-[11px] px-2 py-0.5 rounded"
                style={{ background: "#1677ff", color: "white" }}
              >
                恢复此版本
              </button>
              <button
                onClick={() => setPreviewVersion(null)}
                className="text-[11px] underline opacity-70 hover:opacity-100"
              >
                关闭预览
              </button>
            </div>
            <h2 className={cn("text-lg font-semibold mb-2", isDark ? "text-zinc-100" : "text-gray-900")}>
              {previewVersion.title}
            </h2>
            <pre className={cn("whitespace-pre-wrap text-sm leading-relaxed", isDark ? "text-zinc-300" : "text-gray-700")}>
              {previewVersion.content || "（无内容）"}
            </pre>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* 标题 */}
            <div>
              <h2 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-gray-900")}>
                {item.title}
              </h2>
              <div className={cn("flex items-center gap-3 mt-2 text-[11px]", isDark ? "text-zinc-500" : "text-gray-400")}>
                <span>创建 {formatFullTime(item.created_at)}</span>
                <span>·</span>
                <span>更新 {formatFullTime(item.updated_at)}</span>
                <span>·</span>
                <span>浏览 {item.view_count}</span>
              </div>
            </div>

            {/* 标签 */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map(t => (
                  <span
                    key={t}
                    className={cn(
                      "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px]",
                      isDark ? "bg-zinc-800 text-zinc-400" : "bg-gray-100 text-gray-600"
                    )}
                  >
                    <Hash size={9} /> {t}
                  </span>
                ))}
              </div>
            )}

            {/* 文件预览 */}
            {item.file_url && (
              <div className={cn("rounded-md overflow-hidden border", isDark ? "border-zinc-800" : "border-gray-200")}>
                {item.content_type === "image" ? (
                  <img src={item.file_url} alt={item.title} className="w-full h-auto max-h-[300px] object-contain bg-black/5" />
                ) : item.content_type === "video" ? (
                  <video src={item.file_url} controls className="w-full max-h-[300px]" />
                ) : item.content_type === "audio" ? (
                  <audio src={item.file_url} controls className="w-full" />
                ) : (
                  <div className={cn("flex items-center gap-3 p-3", isDark ? "bg-zinc-900" : "bg-gray-50")}>
                    <div
                      className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: `${meta.color}15`, color: meta.color }}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-[12px] font-medium truncate", isDark ? "text-zinc-200" : "text-gray-700")}>
                        {item.title}
                      </div>
                      <div className={cn("text-[10px]", isDark ? "text-zinc-500" : "text-gray-400")}>
                        {item.mime_type} · {formatSize(item.file_size)}
                      </div>
                    </div>
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "p-1.5 rounded transition-colors",
                        isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-gray-200 text-gray-500"
                      )}
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* 文本内容 */}
            {item.content && (
              <div className={cn("rounded-md p-3 text-[13px] leading-relaxed whitespace-pre-wrap", isDark ? "bg-zinc-900 text-zinc-300" : "bg-gray-50 text-gray-700")}>
                {item.content}
              </div>
            )}

            {/* 摘要 */}
            {item.summary && !item.content && (
              <div className={cn("rounded-md p-3 text-[13px] leading-relaxed", isDark ? "bg-zinc-900 text-zinc-300" : "bg-gray-50 text-gray-700")}>
                {item.summary}
              </div>
            )}

            {/* 元数据 */}
            <div className={cn("rounded-md p-3 text-[11px] space-y-1.5", isDark ? "bg-zinc-900/50" : "bg-gray-50/50")}>
              <MetaRow label="类型" value={meta.label} darkMode={isDark} />
              {item.collection_name && <MetaRow label="分类" value={item.collection_name} darkMode={isDark} />}
              {item.embedding_model && <MetaRow label="Embedding" value={item.embedding_model} darkMode={isDark} />}
              {item.embedding_status && <MetaRow label="向量化状态" value={item.embedding_status} darkMode={isDark} />}
              {item.file_size > 0 && <MetaRow label="文件大小" value={formatSize(item.file_size)} darkMode={isDark} />}
              {item.source_url && <MetaRow label="来源" value={item.source_url} darkMode={isDark} link />}
            </div>

            {/* 引用按钮 */}
            {onInsertToChat && (
              <button
                onClick={onInsertToChat}
                className="w-full h-9 rounded-md text-sm flex items-center justify-center gap-1.5 text-white"
                style={{ background: "#1677ff" }}
              >
                <Copy size={13} /> 引用到对话
              </button>
            )}
          </div>
        )}
      </div>

      {/* 历史版本侧栏 */}
      <AnimatePresence>
        {showVersions && (
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 50, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute inset-y-0 right-0 w-full flex flex-col",
              isDark ? "bg-zinc-950" : "bg-white"
            )}
            style={{ zIndex: 10 }}
          >
            <div className={cn("px-5 py-3 border-b flex items-center gap-2", isDark ? "border-zinc-800" : "border-gray-100")}>
              <button
                onClick={() => { setShowVersions(false); setPreviewVersion(null) }}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-gray-100 text-gray-500"
                )}
              >
                <ArrowLeft size={14} strokeWidth={1.5} />
              </button>
              <History size={14} strokeWidth={1.5} style={{ color: "#1677ff" }} />
              <span className="text-sm font-medium">历史版本</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {versions.length === 0 ? (
                <Empty description="暂无历史版本" />
              ) : versions.map(v => (
                <div
                  key={v.id}
                  onClick={() => setPreviewVersion(v)}
                  className={cn(
                    "p-3 rounded-md cursor-pointer transition-colors",
                    previewVersion?.id === v.id
                      ? isDark ? "bg-zinc-800" : "bg-blue-50"
                      : isDark ? "hover:bg-zinc-800/50" : "hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] px-1.5 py-0.5 rounded font-mono"
                      style={{ background: "#1677ff15", color: "#1677ff" }}
                    >
                      v{v.version_number}
                    </span>
                    <span className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-gray-500")}>
                      {formatFullTime(v.created_at)}
                    </span>
                    <div className="flex-1" />
                    {v.version_number !== item.current_version && (
                      <Tooltip title="恢复此版本">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRestoreVersion(v.id) }}
                          className={cn(
                            "p-1 rounded transition-colors",
                            isDark ? "hover:bg-zinc-700 text-zinc-400" : "hover:bg-gray-200 text-gray-500"
                          )}
                        >
                          <RotateCcw size={11} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                  <p className={cn("text-[12px] mt-1 truncate", isDark ? "text-zinc-200" : "text-gray-700")}>
                    {v.title}
                  </p>
                  <p className={cn("text-[11px] mt-0.5", isDark ? "text-zinc-500" : "text-gray-500")}>
                    {v.change_summary || v.change_type}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function MetaRow({ label, value, link, darkMode }: { label: string; value: string; link?: boolean; darkMode?: boolean }) {
  const isDark = darkMode
  return (
    <div className="flex items-center gap-2">
      <span className={cn("shrink-0", isDark ? "text-zinc-600" : "text-gray-400")}>{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer" className="truncate text-blue-500 hover:underline">
          {value}
        </a>
      ) : (
        <span className={cn("truncate", isDark ? "text-zinc-300" : "text-gray-700")}>{value}</span>
      )}
    </div>
  )
}

// ============== Modal：新建集合 ==============

function CreateCollectionModal({
  open, onClose, onConfirm, darkMode
}: { open: boolean; onClose: () => void; onConfirm: (name: string, color: string) => void; darkMode?: boolean }) {
  const isDark = darkMode
  const kc = useKnowledgeConfig()
  // 走 admin knowledgeConfig 暴露的可配置项（未加载时使用兜底默认值）
  const collectionNameMax = (kc?.limits?.collectionNameMax as number) ?? 100
  const [name, setName] = useState("")
  const [color, setColor] = useState("#1677ff")
  const colors = ["#1677ff", "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6", "#ef4444"]
  return (
    <Modal
      open={open}
      onCancel={() => { setName(""); setColor("#1677ff"); onClose() }}
      title="新建分类"
      okText="创建"
      cancelText="取消"
      onOk={() => name.trim() && onConfirm(name.trim(), color)}
      okButtonProps={{ disabled: !name.trim() }}
    >
      <div className="space-y-3 py-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">名称</label>
          <AntInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：草莓种植资料"
            autoFocus
            maxLength={collectionNameMax}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">颜色</label>
          <div className="flex gap-2">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  "w-7 h-7 rounded-full transition-all",
                  color === c ? "ring-2 ring-offset-2 ring-blue-500" : ""
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ============== Modal：新建条目 ==============

function CreateItemModal({
  open, onClose, onConfirm, collections, defaultCollectionId, defaultTags, darkMode
}: {
  open: boolean
  onClose: () => void
  onConfirm: (data: any) => void
  collections: KnowledgeCollection[]
  defaultCollectionId: number | null
  defaultTags: string[]
  darkMode?: boolean
}) {
  // 必须用 App.useApp() 拿到 context 绑定的 message
  const { message } = App.useApp()
  const kc = useKnowledgeConfig()
  // 走 admin knowledgeConfig 暴露的可配置项（未加载时使用兜底默认值）
  const summaryMax = (kc?.limits?.summaryMax as number) ?? 200
  const itemTitleMax = (kc?.limits?.itemTitleMax as number) ?? 500
  const createItemTextareaMinRows = (kc?.ui?.createItemTextareaMinRows as number) ?? 6
  const createItemTextareaMaxRows = (kc?.ui?.createItemTextareaMaxRows as number) ?? 20
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [summary, setSummary] = useState("")
  const [contentType, setContentType] = useState<ContentType>("note")
  const [collectionId, setCollectionId] = useState<number | null>(defaultCollectionId)
  const [tagsStr, setTagsStr] = useState(defaultTags.join(", "))

  useEffect(() => {
    if (open) {
      setCollectionId(defaultCollectionId)
      setTagsStr(defaultTags.join(", "))
    }
  }, [open, defaultCollectionId, defaultTags])

  return (
    <Modal
      open={open}
      onCancel={() => { setTitle(""); setContent(""); setSummary(""); onClose() }}
      title="新建知识条目"
      okText="创建"
      cancelText="取消"
      width={600}
      onOk={() => {
        if (!title.trim()) {
          message.error("标题必填")
          return
        }
        const tags = tagsStr.split(/[,，]/).map(t => t.trim()).filter(Boolean)
        onConfirm({
          title: title.trim(),
          content: content || null,
          summary: summary || null,
          content_type: contentType,
          collection_id: collectionId,
          tags
        })
        setTitle(""); setContent(""); setSummary("")
      }}
      okButtonProps={{ disabled: !title.trim() }}
    >
      <div className="space-y-3 py-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">标题 <span className="text-red-500">*</span></label>
          <AntInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给这条知识起个名字"
            autoFocus
            maxLength={itemTitleMax}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">类型</label>
            <Select
              value={contentType}
              onChange={(v) => setContentType(v)}
              className="w-full"
              options={Object.entries(TYPE_META).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">分类</label>
            <Select
              value={collectionId}
              onChange={(v) => setCollectionId(v)}
              className="w-full"
              allowClear
              placeholder="选择分类"
              options={[
                { value: null, label: "未分类" },
                ...collections.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">标签（逗号分隔）</label>
          <AntInput
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="如：草莓, 病害, 防治"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">摘要（可选）</label>
          <AntInput
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="一句话概括"
            maxLength={summaryMax}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">内容</label>
          <AntInput.TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="支持纯文本/Markdown（自动分块并生成 embedding）"
            autoSize={{ minRows: createItemTextareaMinRows, maxRows: createItemTextareaMaxRows }}
          />
        </div>
      </div>
    </Modal>
  )
}

// ============== Modal：设置（备份/权限/统计） ==============

interface KnowledgeSettingsModalProps {
  open: boolean
  onClose: () => void
  darkMode?: boolean
  stats: { total_items: number; total_collections: number; storage_bytes: number } | null
  onRefresh: () => void
}

function KnowledgeSettingsModal({ open, onClose, darkMode, stats, onRefresh }: KnowledgeSettingsModalProps) {
  const isDark = darkMode
  // 必须用 App.useApp() 拿到 context 绑定的 message
  const { message } = App.useApp()
  const kc = useKnowledgeConfig()
  // 走 admin knowledgeConfig 暴露的可配置项（未加载时使用兜底默认值）
  const backupListMaxHeight = (kc?.ui?.backupListMaxHeight as number) ?? 280
  const backupPollingIntervals = (kc?.ui?.backupPollingIntervals as number[]) ?? [1000, 4000]
  const [backups, setBackups] = useState<any[]>([])
  const [loadingBackups, setLoadingBackups] = useState(false)
  const [creatingBackup, setCreatingBackup] = useState(false)

  const loadBackups = useCallback(async () => {
    setLoadingBackups(true)
    try {
      const res = await fetch("/api/knowledge/backup")
      const data = await res.json()
      if (res.ok) setBackups(data.backups || [])
    } catch (e) { console.warn("loadBackups failed", e) }
    finally { setLoadingBackups(false) }
  }, [])

  useEffect(() => {
    if (open) {
      void loadBackups()
    }
  }, [open, loadBackups])

  const handleCreateBackup = async () => {
    setCreatingBackup(true)
    try {
      const res = await fetch("/api/knowledge/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "full", include_files: false })
      })
      if (res.ok) {
        message.success("备份任务已创建，正在后台执行")
        // 备份后轮询刷新：间隔由 admin knowledgeConfig.ui.backupPollingIntervals 控制
        for (const ms of backupPollingIntervals) {
          setTimeout(() => void loadBackups(), ms)
        }
      } else {
        const err = await res.json()
        message.error(err.error || "备份失败")
      }
    } catch (e: any) { message.error(e.message) }
    finally { setCreatingBackup(false) }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      title={
        <div className="flex items-center gap-2">
          <Settings size={16} style={{ color: "#1677ff" }} />
          <span>知识库管理</span>
        </div>
      }
    >
      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: "overview",
            label: <span className="text-sm"><Database size={12} className="inline mr-1" />概览</span>,
            children: stats ? (
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="条目总数" value={stats.total_items} darkMode={isDark} />
                  <StatCard label="分类数" value={stats.total_collections} darkMode={isDark} />
                  <StatCard label="存储占用" value={formatSize(stats.storage_bytes)} darkMode={isDark} />
                  <StatCard label="加密状态" value="默认私有" darkMode={isDark} icon={Lock} />
                </div>
                <div className={cn("p-3 rounded-md text-xs space-y-1.5", isDark ? "bg-zinc-900 text-zinc-400" : "bg-gray-50 text-gray-500")}>
                  <div className="flex items-center gap-1.5"><ShieldCheck size={12} style={{ color: "#10b981" }} /><span>所有数据仅本人可见（access_level = private）</span></div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 size={12} style={{ color: "#10b981" }} /><span>API 路由全部经过 getCurrentUser 鉴权</span></div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 size={12} style={{ color: "#10b981" }} /><span>文件存储于 /public/uploads/knowledge/[uid]/（受 Web 鉴权保护）</span></div>
                </div>
                <button
                  onClick={onRefresh}
                  className={cn(
                    "w-full h-8 rounded-md text-sm flex items-center justify-center gap-1.5 border",
                    isDark ? "border-zinc-800 text-zinc-300 hover:bg-zinc-800" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <RefreshCw size={12} /> 刷新统计
                </button>
              </div>
            ) : <Spin />
          },
          {
            key: "backup",
            label: <span className="text-sm"><Cloud size={12} className="inline mr-1" />备份</span>,
            children: (
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between">
                  <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-gray-500")}>
                    备份为 JSON 格式，包含条目元数据、版本历史、标签（不含文件二进制）
                  </p>
                  <button
                    onClick={handleCreateBackup}
                    disabled={creatingBackup}
                    className="h-7 px-3 rounded-md text-xs text-white flex items-center gap-1.5"
                    style={{ background: "#1677ff" }}
                  >
                    {creatingBackup ? <Loader2 size={11} className="animate-spin" /> : <Cloud size={11} />}
                    创建备份
                  </button>
                </div>
                {loadingBackups ? (
                  <div className="flex justify-center py-4"><Spin size="small" /></div>
                ) : backups.length === 0 ? (
                  <Empty description="暂无备份" />
                ) : (
                  <div
                    className="space-y-1.5 overflow-y-auto"
                    style={{ maxHeight: backupListMaxHeight }}
                  >
                    {backups.map((b: any) => (
                      <div
                        key={b.id}
                        className={cn(
                          "p-2.5 rounded-md flex items-center gap-2 text-xs",
                          isDark ? "bg-zinc-900" : "bg-gray-50"
                        )}
                      >
                        <HardDrive size={12} className={isDark ? "text-zinc-500" : "text-gray-400"} />
                        <div className="flex-1 min-w-0">
                          <div className={cn("font-medium truncate", isDark ? "text-zinc-200" : "text-gray-700")}>
                            {b.name || `备份 #${b.id}`}
                          </div>
                          <div className={cn("text-[10px]", isDark ? "text-zinc-500" : "text-gray-400")}>
                            {formatFullTime(b.created_at)} · {b.item_count} 条 · {formatSize(b.file_size)}
                          </div>
                        </div>
                        {b.status === "completed" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#10b98120", color: "#10b981" }}>
                            完成
                          </span>
                        )}
                        {b.status === "running" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1" style={{ background: "#1677ff20", color: "#1677ff" }}>
                            <Loader2 size={9} className="animate-spin" /> 进行中
                          </span>
                        )}
                        {b.status === "failed" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#ef444420", color: "#ef4444" }}>
                            失败
                          </span>
                        )}
                        {b.file_path && (
                          <Tooltip title="下载备份">
                            <a
                              href={b.file_path}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                "p-1 rounded transition-colors",
                                isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-gray-200 text-gray-500"
                              )}
                            >
                              <Download size={11} />
                            </a>
                          </Tooltip>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          },
          {
            key: "permissions",
            label: <span className="text-sm"><Share2 size={12} className="inline mr-1" />共享</span>,
            children: (
              <div className="py-2">
                <Empty
                  description={
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">共享功能允许你将知识条目授权给其他用户</p>
                      <p className="text-[11px] text-gray-400">支持 read / write / admin 三级权限</p>
                    </div>
                  }
                />
                <p className={cn("text-[11px] mt-2 text-center", isDark ? "text-zinc-500" : "text-gray-400")}>
                  API 已就绪（/api/knowledge/permissions），UI 调用可在条目详情 → 共享中发起
                </p>
              </div>
            )
          }
        ]}
      />
    </Modal>
  )
}

function StatCard({ label, value, darkMode, icon: Icon }: { label: string; value: string | number; darkMode?: boolean; icon?: any }) {
  const isDark = darkMode
  return (
    <div className={cn(
      "p-3 rounded-md",
      isDark ? "bg-zinc-900" : "bg-gray-50"
    )}>
      <div className={cn("text-[10px] uppercase tracking-wide mb-1", isDark ? "text-zinc-500" : "text-gray-400")}>
        {label}
      </div>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={12} className="text-blue-500" />}
        <div className={cn("text-base font-semibold", isDark ? "text-zinc-100" : "text-gray-900")}>
          {value}
        </div>
      </div>
    </div>
  )
}
