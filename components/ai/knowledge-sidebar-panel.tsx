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

import { useFeedback } from "@/lib/ui/feedback"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Dropdown, Tooltip, Modal, Input as AntInput, Select, Empty, Spin, Tabs } from "antd"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import CollaboratorsPanel from "@/components/kb/collaborators-panel"
import ActivityFeed from "@/components/kb/activity-feed"
import { IconArrowLeft, IconAttention, IconBookOpen, IconChartLine, IconCheckOne, IconClose, IconCloudStorage, IconCopy, IconDatabaseNetwork, IconDelete, IconDown, IconDownload, IconEdit, IconFileCode, IconFileText, IconFilter, IconFolder, IconFolderOpen, IconFolderPlus, IconGlobe, IconHardDisk, IconHashtagKey, IconHistory, IconLayoutTwo, IconLink, IconLinkOut, IconLoading, IconLock, IconMagic, IconMore, IconMusic, IconPeoples, IconPicture, IconPlus, IconPreviewOpen, IconRefresh, IconRight, IconSave, IconSearch, IconSetting, IconShare, IconShield, IconStar, IconTag, IconTime, IconUndo, IconUpload, IconVideo } from "@/components/icon";

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
  note:     { label: "笔记",   color: "#059669", icon: IconFileText },
  text:     { label: "文本",   color: "#52525b", icon: IconFileText },
  image:    { label: "图片",   color: "#52525b", icon: IconPicture },
  document: { label: "文档",   color: "#059669", icon: IconFileText },
  pdf:      { label: "PDF",   color: "#DC2626", icon: IconFileText },
  audio:    { label: "音频",   color: "#52525B", icon: IconMusic },
  video:    { label: "视频",   color: "#71717a", icon: IconVideo },
  web_clip: { label: "网页",   color: "#059669", icon: IconLink },
  link:     { label: "链接",   color: "#52525b", icon: IconLink }
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
  const { message } = useFeedback()
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
  const [collaborations, setCollaborations] = useState<any[]>([])
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
  // AI 深度研究：输入主题 → 联网检索融合 → 自动入库向量化（约 1-3 分钟）
  const [showResearch, setShowResearch] = useState(false)
  const [researchTopic, setResearchTopic] = useState("")
  const [researching, setResearching] = useState(false)
  // 协作管理：当前用户 + 选中的集合
  const [currentUserId, setCurrentUserId] = useState<number>(0)
  const [currentUserRole, setCurrentUserRole] = useState<"user" | "admin" | "super_admin">("user")
  const [manageCollection, setManageCollection] = useState<KnowledgeCollection | null>(null)
  // 当前选中集合是否为协作集合
  const [selectedIsCollaboration, setSelectedIsCollaboration] = useState<boolean>(false)
  const [selectedCollabRole, setSelectedCollabRole] = useState<string | null>(null)
  // 当前选中集合上用户的角色（决定 canManage 权限）—— 必须从协作 API 计算，**不能用 currentUserRole（系统级）**
  const [selectedCollectionRole, setSelectedCollectionRole] = useState<string | null>(null)
  const [stats, setStats] = useState<{ total_items: number; total_collections: number; storage_bytes: number } | null>(null)
  const [recommendations, setRecommendations] = useState<KnowledgeItem[]>([])
  // 用户上传时的临时覆盖（admin 开关 + 用户 toggle 决定是否走 GLM-OCR）
  const [useGLMOCRToggle, setUseGLMOCRToggle] = useState<boolean | null>(null) // null=跟随 admin
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ============== 数据加载 ==============

  const loadCollections = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge/collections")
      const text = await res.text().catch(() => "")
      let data: any = { items: [], collaborations: [] }
      try { data = text ? JSON.parse(text) : data } catch {}
      if (res.ok) {
        setCollections(data.items || [])
        setCollaborations(data.collaborations || [])
        if (typeof selectedCollection === "number") {
          const collab = (data.collaborations || []).find((c: any) => c.id === selectedCollection)
          if (collab) {
            setSelectedIsCollaboration(true)
            setSelectedCollabRole(collab.my_role)
          } else {
            setSelectedIsCollaboration(false)
            setSelectedCollabRole(null)
          }
        }
      } else if (text) {
        console.warn(`[loadCollections] HTTP ${res.status}:`, text.slice(0, 200))
      }
    } catch (e) { console.warn("loadCollections failed", e) }
  }, [selectedCollection])

  // 切换选中集合（同步协作状态）
  const selectCollection = useCallback((id: number | null | "all" | "favorites") => {
    setSelectedCollection(id)
    setSelectedItem(null)
    if (typeof id === "number") {
      const collab = collaborations.find((c) => c.id === id)
      if (collab) {
        setSelectedIsCollaboration(true)
        setSelectedCollabRole(collab.my_role)
        // 我是协作者：直接用 collab.my_role
        setSelectedCollectionRole(collab.my_role || null)
      } else {
        setSelectedIsCollaboration(false)
        setSelectedCollabRole(null)
        // 在自己的集合列表里：判断是否 owner
        // 用 collections 列表中该集合的 user_id 与 currentUserId 比对
        // （如果 currentUserId 还没加载，给 null 保守拒绝所有管理操作）
        setSelectedCollectionRole(currentUserId > 0 ? "owner" : null)
      }
    } else {
      setSelectedIsCollaboration(false)
      setSelectedCollabRole(null)
      setSelectedCollectionRole(null)
    }
  }, [collaborations, currentUserId])

  // 打开 manageCollection 时同步 selectedCollectionRole（用于协作者 modal 的 canManage）
  useEffect(() => {
    if (!manageCollection) return
    const collab = collaborations.find((c) => c.id === manageCollection.id)
    if (collab) {
      setSelectedCollectionRole(collab.my_role || null)
    } else {
      // 自己的 KB：保守认 owner
      setSelectedCollectionRole(currentUserId > 0 ? "owner" : null)
    }
  }, [manageCollection, collaborations, currentUserId])

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
      // 防御：服务端可能返回非 JSON（5xx HTML、空 body），用 .catch 降级
      const text = await res.text().catch(() => "")
      let data: any = { items: [], total: 0 }
      try { data = text ? JSON.parse(text) : data } catch {}
      if (res.ok) setItems(data.items || [])
      else if (text) console.warn(`[loadItems] HTTP ${res.status}:`, text.slice(0, 200))
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
    // 拉取当前用户身份（用于协作者管理 Modal 的权限判断）
    fetch("/api/auth/me", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data?.authenticated && data?.user) {
          setCurrentUserId(data.user.id)
          setCurrentUserRole(data.user.role)
        }
      })
      .catch(() => { /* ignore */ })

    // 监听协作变化事件（接受/拒绝邀请后立即刷新协作集合列表）
    const handleCollabChanged = () => void loadCollections()
    window.addEventListener("kb:collaboration-changed", handleCollabChanged)
    return () => window.removeEventListener("kb:collaboration-changed", handleCollabChanged)
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
          if (selectedCollection === id) {
            setSelectedCollection("all")
            setSelectedIsCollaboration(false)
            setSelectedCollabRole(null)
          }
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

  /** AI 深度研究：联网检索 → 多源融合 → 入库向量化（服务端约 1-3 分钟） */
  const handleResearch = async () => {
    const topic = researchTopic.trim()
    if (!topic) {
      message.warning("请输入研究主题")
      return
    }
    setResearching(true)
    message.info("研究已开始，AI 正在联网检索并融合知识，约需 1-3 分钟…", 5)
    try {
      const res = await fetch("/api/knowledge/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, collectionId: typeof selectedCollection === "number" ? selectedCollection : undefined })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        message.error(data?.error || `研究失败（HTTP ${res.status}）`)
        return
      }
      message.success(
        data.embed
          ? `已完成「${data.title}」：${data.sources?.length ?? 0} 条来源，${data.embed.chunkCount} 个分块已向量化`
          : `已完成「${data.title}」：${data.sources?.length ?? 0} 条来源（向量化失败，可在条目详情重试）`,
        6
      )
      setShowResearch(false)
      setResearchTopic("")
      await loadItems()
      await loadStats()
    } catch (e: any) {
      message.error(e?.message || "研究请求失败")
    } finally {
      setResearching(false)
    }
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
        isDark ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900"
      )}
      style={{ borderRadius: 10 }}
    >
      {/* ============== 左侧：分类/标签栏 ============== */}
      <div
        className={cn(
          "w-[220px] flex-shrink-0 flex flex-col border-r",
          isDark ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-100"
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
                  isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"
                )}
              >
                <IconLayoutTwo size={15} strokeWidth={2} />
              </button>
            </Tooltip>
          )}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <IconBookOpen size={15} strokeWidth={2} style={{ color: "#059669" }} />
            <span className="text-sm font-medium truncate">知识库</span>
          </div>
          <Tooltip title="关闭">
            <button
              onClick={onClose}
              className={cn(
                "p-1.5 rounded transition-colors",
                isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"
              )}
            >
              <IconClose size={14} strokeWidth={2} />
            </button>
          </Tooltip>
        </div>

        {/* 集合列表 */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {/* 全部 / 收藏 / 根目录 */}
          <CollectionNavItem
            icon={IconDatabaseNetwork}
            label="全部"
            count={stats?.total_items}
            active={selectedCollection === "all"}
            onClick={() => selectCollection("all")}
            darkMode={isDark}
          />
          <CollectionNavItem
            icon={IconStar}
            label="收藏"
            count={stats ? undefined : undefined}
            active={selectedCollection === "favorites"}
            onClick={() => selectCollection("favorites")}
            darkMode={isDark}
          />
          <CollectionNavItem
            icon={IconFolderOpen}
            label="未分类"
            count={undefined}
            active={selectedCollection === null}
            onClick={() => selectCollection(null)}
            darkMode={isDark}
          />

          {/* 分隔 */}
          <div className={cn("my-2 h-px", isDark ? "bg-zinc-800" : "bg-zinc-100")} />

          {/* 集合列表 */}
          <div className="px-2 mb-1.5 flex items-center justify-between">
            <span className={cn("text-[11px] font-medium uppercase tracking-wide", isDark ? "text-zinc-500" : "text-zinc-400")}>
              分类
            </span>
            <Tooltip title="新建分类">
              <button
                onClick={() => setShowCreateCollection(true)}
                className={cn(
                  "p-1 rounded transition-colors",
                  isDark ? "hover:bg-zinc-800 text-zinc-500" : "hover:bg-zinc-100 text-zinc-400"
                )}
              >
                <IconFolderPlus size={12} strokeWidth={2} />
              </button>
            </Tooltip>
          </div>
          {collections.length === 0 ? (
            <div className={cn("px-3 py-2 text-[11px]", isDark ? "text-zinc-600" : "text-zinc-400")}>
              还没有分类
            </div>
          ) : (
            collections.map(c => (
              <CollectionNavItem
                key={c.id}
                icon={IconFolder}
                label={c.name}
                count={c.item_count}
                color={c.color}
                active={selectedCollection === c.id}
                onClick={() => selectCollection(c.id)}
                onDelete={() => handleDeleteCollection(c.id)}
                onManage={() => setManageCollection(c)}
                darkMode={isDark}
              />
            ))
          )}

          {/* 协作中的知识库（被邀请加入的） */}
          {collaborations.length > 0 && (
            <>
              <div className={cn("my-2 h-px", isDark ? "bg-zinc-800" : "bg-zinc-100")} />
              <div className="px-2 mb-1.5 flex items-center gap-1.5">
                <IconPeoples size={11} className={isDark ? "text-zinc-500" : "text-zinc-400"} strokeWidth={2} />
                <span className={cn("text-[11px] font-medium uppercase tracking-wide", isDark ? "text-zinc-500" : "text-zinc-400")}>
                  协作中 · {collaborations.length}
                </span>
              </div>
              {collaborations.map(c => (
                <CollectionNavItem
                  key={`collab-${c.id}`}
                  icon={IconFolder}
                  label={c.name}
                  count={c.item_count}
                  color={c.color}
                  active={selectedCollection === c.id}
                  badge={
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 500,
                        padding: "1px 5px",
                        borderRadius: 4,
                        background: "rgba(0,148,86,0.10)",
                        color: "#059669",
                        lineHeight: "14px",
                        whiteSpace: "nowrap"
                      }}
                    >
                      协作
                    </span>
                  }
                  onClick={() => selectCollection(c.id)}
                  onManage={() => setManageCollection(c)}
                  darkMode={isDark}
                />
              ))}
            </>
          )}

          {/* 标签 */}
          {tags.length > 0 && (
            <>
              <div className={cn("my-2 h-px", isDark ? "bg-zinc-800" : "bg-zinc-100")} />
              <div className="px-2 mb-1.5">
                <span className={cn("text-[11px] font-medium uppercase tracking-wide", isDark ? "text-zinc-500" : "text-zinc-400")}>
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
              isDark ? "border-zinc-800 text-zinc-500" : "border-zinc-100 text-zinc-400"
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
                    isDark ? "hover:bg-zinc-800" : "hover:bg-zinc-200"
                  )}
                >
                  <IconSetting size={11} className={isDark ? "text-zinc-500" : "text-zinc-400"} />
                </button>
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      {/* ============== 中部：列表区 ============== */}
      <div className={cn("flex-1 flex flex-col min-w-0", isDark ? "bg-zinc-900" : "bg-white")}>
        {/* 搜索栏 + 操作（两行：搜索独占一行，下一行是工具栏） */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          {/* 第一行：搜索框 + 搜索模式 */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex-1 flex items-center gap-2 px-2.5 h-8 rounded-lg border",
                isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
              )}
            >
              <IconSearch size={13} className={isDark ? "text-zinc-500" : "text-zinc-400"} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索知识库"
                className={cn(
                  "flex-1 bg-transparent text-[13px] outline-none min-w-0",
                  isDark ? "text-zinc-100 placeholder:text-zinc-600" : "text-zinc-900 placeholder:text-zinc-400"
                )}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="p-0.5">
                  <IconClose size={11} className={isDark ? "text-zinc-500" : "text-zinc-400"} />
                </button>
              )}
            </div>
            <Select
              size="small"
              value={searchMode}
              onChange={(v) => setSearchMode(v as SearchMode)}
              style={{ width: 76, height: 32 }}
              options={[
                { value: "hybrid", label: "混合" },
                { value: "keyword", label: "关键词" },
                { value: "semantic", label: "语义" }
              ]}
            />
          </div>

          {/* 第二行：工具栏（左：图标组 ｜ 中：数据条 ｜ 右：主操作） */}
          <div className="flex items-center mt-2.5 gap-2">
            {/* 左侧图标组（统一 32px 方形按钮） */}
            <div className={cn("flex items-center gap-0.5 p-0.5 rounded-lg", isDark ? "" : "")}>
              <Tooltip title={uploading ? "上传中..." : "上传文件"}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                    isDark
                      ? "hover:bg-zinc-800 text-zinc-400 disabled:opacity-50"
                      : "hover:bg-zinc-100 text-zinc-500 disabled:opacity-50"
                  )}
                >
                  {uploading ? <IconLoading size={15} className="animate-spin" /> : <IconUpload size={15} strokeWidth={1.6} />}
                </button>
              </Tooltip>

              <Tooltip
                title={
                  useGLMOCRToggle === null
                    ? `OCR：跟随 admin（${adminGLMAutoOcr ? "已启用" : "已禁用"}）`
                    : useGLMOCRToggle ? "OCR：已强制启用" : "OCR：已禁用"
                }
              >
                <button
                  onClick={() => {
                    if (useGLMOCRToggle === null) setUseGLMOCRToggle(true)
                    else if (useGLMOCRToggle === true) setUseGLMOCRToggle(false)
                    else setUseGLMOCRToggle(null)
                  }}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center transition-colors relative",
                    useGLMOCRToggle === true
                      ? isDark ? "bg-emerald-950/40 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                      : isDark ? "hover:bg-zinc-800 text-zinc-500" : "hover:bg-zinc-100 text-zinc-500"
                  )}
                >
                  <IconMagic size={15} strokeWidth={1.6} />
                  <span
                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full ring-2"
                    style={{
                      background:
                        useGLMOCRToggle === true ? "#059669" :
                        useGLMOCRToggle === false ? "rgba(0,0,0,0.25)" :
                        "#059669",
                      boxShadow: `0 0 0 2px ${isDark ? "#18181b" : "#ffffff"}`
                    }}
                  />
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

              <Tooltip title="刷新">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                    isDark ? "hover:bg-zinc-800 text-zinc-400 disabled:opacity-50" : "hover:bg-zinc-100 text-zinc-500 disabled:opacity-50"
                  )}
                >
                  <IconRefresh size={15} className={refreshing ? "animate-spin" : ""} strokeWidth={1.6} />
                </button>
              </Tooltip>

              <Tooltip title="AI 研究：联网检索并沉淀为知识条目">
                <button
                  onClick={() => setShowResearch(true)}
                  disabled={researching}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                    showResearch || researching
                      ? isDark ? "bg-emerald-950/40 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                      : isDark ? "hover:bg-zinc-800 text-zinc-400 disabled:opacity-50" : "hover:bg-zinc-100 text-zinc-500 disabled:opacity-50"
                  )}
                >
                  {researching ? <IconLoading size={15} className="animate-spin" /> : <IconGlobe size={15} strokeWidth={1.6} />}
                </button>
              </Tooltip>
            </div>

            {/* 中部：数据条 / 状态文字（不抢戏，weight 400 灰色） */}
            <div className="flex-1 min-w-0 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
              {searchResults ? (
                <>
                  <span style={{ color: "#059669", fontWeight: 500 }}>{searchResults.length}</span>
                  <span>条搜索结果</span>
                </>
              ) : items.length > 0 ? (
                <>
                  <span style={{ color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)", fontWeight: 500 }}>
                    {items.length}
                  </span>
                  <span>篇文档</span>
                </>
              ) : null}
            </div>

            {/* 右侧：主操作「新建」（32px 紧凑按钮，强调主蓝色） */}
            <Tooltip title="新建笔记">
              <button
                onClick={() => setShowCreateItem(true)}
                className="h-8 px-3 rounded-lg text-[13px] font-medium flex items-center gap-1 text-white shrink-0 transition-opacity hover:opacity-90 active:opacity-80"
                style={{ background: "#059669" }}
              >
                <IconPlus size={13} strokeWidth={2.4} />
                <span>新建</span>
              </button>
            </Tooltip>
          </div>

          {/* 协作 banner：单行 chip + 文字（无背景块、无分割线） */}
          {selectedIsCollaboration && (
            <div className="flex items-center gap-2 mt-2.5 text-[12px]">
              <span
                className="flex items-center gap-1 h-5 px-1.5 rounded text-[11px] font-medium text-white shrink-0"
                style={{ background: "#059669" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                协作中
              </span>
              <span className={cn(isDark ? "text-zinc-500" : "text-zinc-500")}>·</span>
              <span
                style={{ color: "#059669", fontWeight: 500 }}
              >
                {selectedCollabRole === "admin" ? "管理员" :
                 selectedCollabRole === "editor" ? "编辑者" :
                 selectedCollabRole === "viewer" ? "查看者" : "协作者"}
              </span>
              <span className="flex-1" />
              {manageCollection?.id !== selectedCollection && (
                <Tooltip title="协作者与活动">
                  <button
                    onClick={() => {
                      const collab = collaborations.find((c) => c.id === selectedCollection)
                      if (collab) setManageCollection(collab)
                    }}
                    className={cn(
                      "h-6 px-2 rounded text-[11px] font-medium shrink-0 transition-colors",
                      isDark ? "text-emerald-400 hover:bg-emerald-950/30" : "text-emerald-600 hover:bg-emerald-50"
                    )}
                  >
                    管理
                  </button>
                </Tooltip>
              )}
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
              <IconBookOpen size={48} strokeWidth={1} className={isDark ? "text-zinc-700" : "text-zinc-300"} />
              <p className={cn("mt-4 text-sm", isDark ? "text-zinc-500" : "text-zinc-400")}>
                {searchQuery ? "没有找到匹配的知识" : "知识库还是空的"}
              </p>
              <p className={cn("mt-1 text-xs", isDark ? "text-zinc-600" : "text-zinc-400")}>
                {searchQuery ? "试试调整关键词或切换搜索模式" : "上传文件或新建笔记开始构建你的知识库"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateItem(true)}
                  className="mt-4 h-8 px-4 rounded-lg text-xs text-white"
                  style={{ background: "#059669" }}
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
                <IconMagic size={12} style={{ color: "#059669" }} />
                <span className={cn("text-[11px] font-medium uppercase tracking-wide", isDark ? "text-zinc-500" : "text-zinc-500")}>
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

      {/* ============== Modal：AI 深度研究 ============== */}
      <Modal
        open={showResearch}
        onCancel={() => { if (!researching) setShowResearch(false) }}
        onOk={handleResearch}
        okText={researching ? "研究中…" : "开始研究"}
        cancelText="取消"
        okButtonProps={{ disabled: researching || !researchTopic.trim() }}
        cancelButtonProps={{ disabled: researching }}
        closable={!researching}
        maskClosable={false}
        keyboard={!researching}
        width={480}
        title={
          <span className="flex items-center gap-2">
            <IconGlobe size={16} strokeWidth={1.8} style={{ color: "#059669" }} />
            AI 深度研究
          </span>
        }
      >
        <p className={cn("text-[13px] leading-relaxed mb-3", isDark ? "text-zinc-400" : "text-zinc-500")}>
          AI 自动拆解多视角子查询 → 联网检索并阅读网页 → 分析缺口补搜 → 融合为带引用的知识条目，
          自动存入知识库并完成向量化。整个流程约需 1-3 分钟。
        </p>
        <AntInput.TextArea
          value={researchTopic}
          onChange={(e) => setResearchTopic(e.target.value)}
          placeholder="输入研究主题，例如：草莓白粉病的综合防治方案"
          rows={3}
          maxLength={300}
          showCount
          disabled={researching}
          onPressEnter={(e) => { if (!researching && researchTopic.trim() && !(e as any).shiftKey) handleResearch() }}
        />
        {typeof selectedCollection === "number" && (
          <p className={cn("text-[12px] mt-2", isDark ? "text-zinc-500" : "text-zinc-400")}>
            研究结果将存入当前选中的集合
          </p>
        )}
      </Modal>

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

      {/* ============== Modal：集合协作管理（协作者 + 活动） ============== */}
      <CollectionManageModal
        open={!!manageCollection}
        collection={manageCollection}
        currentUserId={currentUserId}
        // canManage 严格基于"该集合上我的角色"，**禁止**用 currentUserRole（系统级）做判定
        canManage={
          (selectedCollectionRole === "owner" || selectedCollectionRole === "admin") &&
          !!currentUserId
        }
        onClose={() => setManageCollection(null)}
        darkMode={isDark}
      />
    </motion.div>
  )
}

// ============== 子组件：集合导航项 ==============

function CollectionNavItem({
  icon: Icon, label, count, color, active, onClick, onDelete, onManage, darkMode, badge
}: {
  icon: any
  label: string
  count?: number
  color?: string
  active: boolean
  onClick: () => void
  onDelete?: () => void
  onManage?: () => void
  darkMode?: boolean
  badge?: React.ReactNode
}) {
  const isDark = darkMode
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-sm",
        // 不再用背景块做 active，靠左侧 2px 色条 + 文字色变化
        isDark ? "hover:bg-zinc-800/40" : "hover:bg-zinc-50/60"
      )}
    >
      {/* 左侧 2px 蓝色色条：唯一 active 锚点 */}
      {active && (
        <span
          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
          style={{ background: "#059669" }}
        />
      )}
      <Icon
        size={13}
        strokeWidth={2}
        style={{ color: active ? "#059669" : color || (isDark ? "#a1a1aa" : "#A1A1AA") }}
      />
      <span
        className={cn(
          "flex-1 truncate text-[13px]",
          active ? (isDark ? "text-zinc-100 font-medium" : "text-zinc-900 font-medium") : (isDark ? "text-zinc-400" : "text-zinc-600")
        )}
      >
        {label}
      </span>
      {badge}
      {typeof count === "number" && count > 0 && (
        <span
          className={cn(
            "text-[11px] px-1.5 py-0.5 rounded",
            active
              ? isDark ? "bg-emerald-950/40 text-emerald-400" : "bg-emerald-50 text-emerald-600"
              : isDark ? "text-zinc-500" : "text-zinc-400"
          )}
        >
          {count}
        </span>
      )}
      {/* 协作管理入口：hover 时显示 */}
      {onManage && (
        <Tooltip title="协作者与活动">
          <button
            onClick={(e) => { e.stopPropagation(); onManage() }}
            className={cn(
              "opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all",
              isDark ? "hover:bg-zinc-700" : "hover:bg-zinc-200"
            )}
          >
            <IconPeoples size={11} className={isDark ? "text-zinc-500" : "text-zinc-400"} />
          </button>
        </Tooltip>
      )}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className={cn(
            "opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all",
            isDark ? "hover:bg-zinc-700" : "hover:bg-zinc-200"
          )}
        >
          <IconDelete size={11} className={isDark ? "text-zinc-500" : "text-zinc-400"} />
        </button>
      )}
    </div>
  )
}

// ============== 子组件：集合协作管理 Modal ==============

function CollectionManageModal({
  open, collection, currentUserId, canManage, onClose, darkMode
}: {
  open: boolean
  collection: KnowledgeCollection | null
  currentUserId: number
  canManage: boolean
  onClose: () => void
  darkMode?: boolean
}) {
  const isDark = darkMode
  const [activeKey, setActiveKey] = useState<string>("collaborators")
  // 协作者实时统计
  const [collabCount, setCollabCount] = useState<number>(0)
  const [pendingCount, setPendingCount] = useState<number>(0)

  // 拉取协作者 + 待处理数（仅统计用，列表由 CollaboratorsPanel 自身渲染）
  useEffect(() => {
    if (!open || !collection) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/knowledge/collaborators?collection_id=${collection.id}`, {
          credentials: "include"
        })
        const text = await res.text().catch(() => "")
        const data: any = text ? JSON.parse(text) : {}
        if (cancelled) return
        if (res.ok) setCollabCount((data.collaborators || []).length)
      } catch {}
      try {
        const res = await fetch(`/api/knowledge/invitations?collection_id=${collection.id}`, {
          credentials: "include"
        })
        const text = await res.text().catch(() => "")
        const data: any = text ? JSON.parse(text) : {}
        if (cancelled) return
        if (res.ok) setPendingCount((data.invitations || []).filter((i: any) => i.status === "pending").length)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [open, collection?.id])

  // 监听子组件上报的列表变化，刷新统计
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.kind === "collaborators" && e.detail?.collectionId === collection?.id) {
        if (typeof e.detail?.count === "number") setCollabCount(e.detail.count)
        if (typeof e.detail?.pending === "number") setPendingCount(e.detail.pending)
      }
    }
    window.addEventListener("kb:collab-stats", handler)
    return () => window.removeEventListener("kb:collab-stats", handler)
  }, [collection?.id])

  if (!collection) return null
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      closable={false}
      styles={{
        header: { padding: "16px 20px 0", borderBottom: "none" },
        body: { padding: 0 },
        content: {
          padding: 0,
          borderRadius: 10,
          overflow: "hidden"
        },
        /* 遮罩模糊接全站「材质厚度」档位（--dc-mat-scale 由 <html data-mat-level> 提供） */
        mask: { backdropFilter: "blur(calc(2px * var(--dc-mat-scale, 1)))" }
      }}
      // 极简头部：单行面包屑 + 单行标题 + Tab，零装饰
      title={
        <div className="relative pr-8">
          {/* 面包屑：单行小字 */}
          <div
            className="flex items-center gap-1 text-[11px] mb-1"
            style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}
          >
            <span>知识库</span>
            <IconRight style={{ width: 10, height: 10 }} strokeWidth={2} />
            <span>{collection.name}</span>
            <IconRight style={{ width: 10, height: 10 }} strokeWidth={2} />
            <span>协作管理</span>
          </div>

          {/* 主标题 + 关闭按钮 */}
          <div className="flex items-center justify-between">
            <h2
              className="text-[14px] font-semibold leading-tight m-0"
              style={{ color: isDark ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.88)" }}
            >
              {collection.name} · 协作管理
            </h2>
            <div className="flex items-center gap-3 text-[12px]">
              {pendingCount > 0 && (
                <span style={{ color: "#52525B" }}>{pendingCount} 条待处理</span>
              )}
              <span style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>
                {collabCount} 位协作者
              </span>
            </div>
          </div>

          {/* 关闭按钮（绝对定位右上） */}
          <button
            onClick={onClose}
            className="absolute right-0 top-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{
              color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
              e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)"
            }}
            aria-label="关闭"
          >
            <IconClose size={14} strokeWidth={1.8} />
          </button>
        </div>
      }
    >
      {/* Tab：融入内容区，无独立分割线 */}
      <div className="px-5">
        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          size="small"
          tabBarGutter={20}
          tabBarStyle={{
            margin: 0,
            borderBottom: "none"
          }}
          items={[
            {
              key: "collaborators",
              label: (
                <span
                  className="text-[13px] font-medium transition-colors"
                  style={{
                    color: activeKey === "collaborators" ? "#059669" : isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)"
                  }}
                >
                  协作者
                </span>
              ),
              children: (
                <div className="pt-3 pb-1">
                  <CollaboratorsPanel
                    collectionId={collection.id}
                    currentUserId={currentUserId}
                    canManage={canManage}
                  />
                </div>
              )
            },
            {
              key: "activity",
              label: (
                <span
                  className="text-[13px] font-medium transition-colors"
                  style={{
                    color: activeKey === "activity" ? "#059669" : isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)"
                  }}
                >
                  活动动态
                </span>
              ),
              children: (
                <div className="pt-3 pb-1">
                  <ActivityFeed
                    scope="collection"
                    collectionId={collection.id}
                    limit={30}
                    height={520}
                    showHeader={false}
                  />
                </div>
              )
            }
          ]}
        />
      </div>
    </Modal>
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
          : isDark ? "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      )}
      style={active ? { background: color || "#059669" } : undefined}
    >
      <IconHashtagKey size={9} strokeWidth={2} />
      <span className="truncate max-w-[60px]">{name}</span>
      {typeof count === "number" && count > 0 && !active && (
        <span className={isDark ? "text-zinc-600" : "text-zinc-400"}>{count}</span>
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
        "group relative flex items-start gap-2.5 pl-3 pr-2.5 py-2 rounded-lg cursor-pointer transition-colors",
        // 不再用背景块做 active
        isDark ? "hover:bg-zinc-800/30" : "hover:bg-zinc-50/60"
      )}
    >
      {/* 左侧 2px 蓝色色条：active 唯一锚点 */}
      {active && (
        <span
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
          style={{ background: "#059669" }}
        />
      )}
      {/* 类型图标：始终使用 meta.color 浅色背景，active 不变色（让色条做唯一锚点） */}
      <div
        className="w-7 h-7 rounded flex items-center justify-center shrink-0 transition-colors"
        style={{
          background: `${meta.color}15`,
          color: meta.color
        }}
      >
        <Icon size={13} strokeWidth={1.8} />
      </div>
      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-[13px] truncate transition-colors",
              active ? "font-semibold" : "font-medium",
              isDark
                ? (active ? "text-emerald-400" : "text-zinc-100")
                : (active ? "text-[#059669]" : "text-zinc-900")
            )}
          >
            {item.title}
          </span>
          {item.is_favorite ? (
            <IconStar size={10} className="shrink-0" style={{ color: "#52525B", fill: "#52525B" }} />
          ) : null}
        </div>
        {item.summary ? (
          <p className={cn("text-[11px] mt-0.5 line-clamp-1", isDark ? "text-zinc-500" : "text-zinc-500")}>
            {item.summary}
          </p>
        ) : item.content ? (
          <p className={cn("text-[11px] mt-0.5 line-clamp-1", isDark ? "text-zinc-600" : "text-zinc-400")}>
            {item.content.replace(/\n+/g, " ").slice(0, listPreviewChars)}
          </p>
        ) : null}
        <div className={cn("flex items-center gap-1.5 mt-0.5 text-[11px]", isDark ? "text-zinc-600" : "text-zinc-400")}>
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
                <IconMagic size={9} style={{ color: "#059669" }} />
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
              isDark ? "hover:bg-zinc-700" : "hover:bg-zinc-200"
            )}
          >
            {item.is_favorite
              ? <IconStar size={11} className="text-amber-500" theme="filled" />
              : <IconStar size={11} className={isDark ? "text-zinc-500" : "text-zinc-400"} />}
          </button>
        </Tooltip>
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              ...(onInsertToChat ? [{
                key: "insert",
                label: "引用到对话",
                icon: <IconCopy size={12} />,
                onClick: (e: any) => { e.domEvent.stopPropagation(); onInsertToChat() }
              }] : []),
              {
                key: "copy",
                label: "复制标题",
                icon: <IconCopy size={12} />,
                onClick: (e: any) => { e.domEvent.stopPropagation(); navigator.clipboard.writeText(item.title); message.success("已复制") }
              },
              { type: "divider" },
              {
                key: "delete",
                label: <span style={{ color: "#DC2626" }}>删除</span>,
                icon: <IconDelete size={12} style={{ color: "#DC2626" }} />,
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
              isDark ? "hover:bg-zinc-700" : "hover:bg-zinc-200"
            )}
          >
            <IconMore size={11} className={isDark ? "text-zinc-500" : "text-zinc-400"} />
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
        "p-2.5 rounded-lg text-left transition-colors border",
        isDark ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700" : "bg-white border-zinc-100 hover:border-zinc-200"
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} style={{ color: meta.color }} />
        <span className={cn("text-[11px] font-medium truncate flex-1", isDark ? "text-zinc-200" : "text-zinc-700")}>
          {item.title}
        </span>
      </div>
      <p className={cn("text-[11px] line-clamp-2", isDark ? "text-zinc-500" : "text-zinc-500")}>
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
  const { message } = useFeedback()
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
        isDark ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-100"
      )}
    >
      {/* 头部 */}
      <div className={cn("px-5 pt-4 pb-3 border-b flex items-center gap-2 shrink-0", isDark ? "border-zinc-800" : "border-zinc-100")}>
        <button
          onClick={onClose}
          className={cn(
            "p-1.5 rounded transition-colors",
            isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"
          )}
        >
          <IconArrowLeft size={14} strokeWidth={2} />
        </button>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${meta.color}15`, color: meta.color }}
        >
          <Icon size={14} strokeWidth={2} />
        </div>
        <span className={cn("text-[11px] px-1.5 py-0.5 rounded", isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-500")}>
          {meta.label}
        </span>
        <span className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-zinc-400")}>
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
                icon: <IconEdit size={12} />,
                onClick: () => setEditing(!editing)
              },
              {
                key: "history",
                label: "查看历史",
                icon: <IconHistory size={12} />,
                onClick: () => setShowVersions(true)
              },
              {
                key: "reembed",
                label: "重新向量化",
                icon: <IconRefresh size={12} />,
                onClick: () => void handleReEmbed()
              },
              ...(item.file_url ? [{
                key: "download",
                label: "下载原文件",
                icon: <IconDownload size={12} />,
                onClick: () => window.open(item.file_url!, "_blank")
              }] : []),
              ...(onInsertToChat ? [{
                key: "insert",
                label: "引用到对话",
                icon: <IconCopy size={12} />,
                onClick: () => onInsertToChat()
              }] : []),
              { type: "divider" },
              {
                key: "delete",
                label: <span style={{ color: "#DC2626" }}>删除</span>,
                icon: <IconDelete size={12} style={{ color: "#DC2626" }} />,
                danger: true,
                onClick: () => onDelete()
              }
            ]
          }}
        >
          <button className={cn(
            "p-1.5 rounded transition-colors",
            isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"
          )}>
            <IconMore size={14} strokeWidth={2} />
          </button>
        </Dropdown>
        <button
          onClick={onClose}
          className={cn(
            "p-1.5 rounded transition-colors",
            isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"
          )}
        >
          <IconClose size={14} strokeWidth={2} />
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
                className="flex-1 h-9 rounded-lg text-white text-sm flex items-center justify-center gap-1.5"
                style={{ background: "#059669" }}
              >
                {saving ? <IconLoading size={13} className="animate-spin" /> : <IconSave size={13} />}
                保存（创建新版本）
              </button>
              <button
                onClick={() => setEditing(false)}
                className={cn(
                  "h-9 px-4 rounded-lg text-sm border",
                  isDark ? "border-zinc-800 text-zinc-300" : "border-zinc-200 text-zinc-700"
                )}
              >
                取消
              </button>
            </div>
          </div>
        ) : previewVersion ? (
          <div className="p-5">
            <div className={cn("flex items-center gap-2 mb-3 p-2 rounded text-xs", isDark ? "bg-amber-950/30 text-amber-200" : "bg-amber-50 text-amber-800")}>
              <IconAttention size={12} />
              <span>正在预览 v{previewVersion.version_number}（{previewVersion.change_summary}）</span>
              <div className="flex-1" />
              <button
                onClick={() => handleRestoreVersion(previewVersion.id)}
                className="text-[11px] px-2 py-0.5 rounded"
                style={{ background: "#059669", color: "white" }}
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
            <h2 className={cn("text-lg font-semibold mb-2", isDark ? "text-zinc-100" : "text-zinc-900")}>
              {previewVersion.title}
            </h2>
            <pre className={cn("whitespace-pre-wrap text-sm leading-relaxed", isDark ? "text-zinc-300" : "text-zinc-700")}>
              {previewVersion.content || "（无内容）"}
            </pre>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* 标题 */}
            <div>
              <h2 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>
                {item.title}
              </h2>
              <div className={cn("flex items-center gap-3 mt-2 text-[11px]", isDark ? "text-zinc-500" : "text-zinc-400")}>
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
                      isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-600"
                    )}
                  >
                    <IconHashtagKey size={9} /> {t}
                  </span>
                ))}
              </div>
            )}

            {/* 文件预览 */}
            {item.file_url && (
              <div className={cn("rounded-lg overflow-hidden border", isDark ? "border-zinc-800" : "border-zinc-200")}>
                {item.content_type === "image" ? (
                  <img src={item.file_url} alt={item.title} className="w-full h-auto max-h-[300px] object-contain bg-black/5" />
                ) : item.content_type === "video" ? (
                  <video src={item.file_url} controls className="w-full max-h-[300px]" />
                ) : item.content_type === "audio" ? (
                  <audio src={item.file_url} controls className="w-full" />
                ) : (
                  <div className={cn("flex items-center gap-3 p-3", isDark ? "bg-zinc-900" : "bg-zinc-50")}>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${meta.color}15`, color: meta.color }}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-[12px] font-medium truncate", isDark ? "text-zinc-200" : "text-zinc-700")}>
                        {item.title}
                      </div>
                      <div className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-zinc-400")}>
                        {item.mime_type} · {formatSize(item.file_size)}
                      </div>
                    </div>
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "p-1.5 rounded transition-colors",
                        isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-200 text-zinc-500"
                      )}
                    >
                      <IconLinkOut size={13} />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* 文本内容 */}
            {item.content && (
              <div className={cn("rounded-lg p-3 text-[13px] leading-relaxed whitespace-pre-wrap", isDark ? "bg-zinc-900 text-zinc-300" : "bg-zinc-50 text-zinc-700")}>
                {item.content}
              </div>
            )}

            {/* 摘要 */}
            {item.summary && !item.content && (
              <div className={cn("rounded-lg p-3 text-[13px] leading-relaxed", isDark ? "bg-zinc-900 text-zinc-300" : "bg-zinc-50 text-zinc-700")}>
                {item.summary}
              </div>
            )}

            {/* 元数据 */}
            <div className={cn("rounded-lg p-3 text-[11px] space-y-1.5", isDark ? "bg-zinc-900/50" : "bg-zinc-50/50")}>
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
                className="w-full h-9 rounded-lg text-sm flex items-center justify-center gap-1.5 text-white"
                style={{ background: "#059669" }}
              >
                <IconCopy size={13} /> 引用到对话
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
            <div className={cn("px-5 py-3 border-b flex items-center gap-2", isDark ? "border-zinc-800" : "border-zinc-100")}>
              <button
                onClick={() => { setShowVersions(false); setPreviewVersion(null) }}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"
                )}
              >
                <IconArrowLeft size={14} strokeWidth={2} />
              </button>
              <IconHistory size={14} strokeWidth={2} style={{ color: "#059669" }} />
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
                    "p-3 rounded-lg cursor-pointer transition-colors",
                    previewVersion?.id === v.id
                      ? isDark ? "bg-zinc-800" : "bg-emerald-50"
                      : isDark ? "hover:bg-zinc-800/50" : "hover:bg-zinc-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] px-1.5 py-0.5 rounded font-mono"
                      style={{ background: "#05966915", color: "#059669" }}
                    >
                      v{v.version_number}
                    </span>
                    <span className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-zinc-500")}>
                      {formatFullTime(v.created_at)}
                    </span>
                    <div className="flex-1" />
                    {v.version_number !== item.current_version && (
                      <Tooltip title="恢复此版本">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRestoreVersion(v.id) }}
                          className={cn(
                            "p-1 rounded transition-colors",
                            isDark ? "hover:bg-zinc-700 text-zinc-400" : "hover:bg-zinc-200 text-zinc-500"
                          )}
                        >
                          <IconUndo size={11} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                  <p className={cn("text-[12px] mt-1 truncate", isDark ? "text-zinc-200" : "text-zinc-700")}>
                    {v.title}
                  </p>
                  <p className={cn("text-[11px] mt-0.5", isDark ? "text-zinc-500" : "text-zinc-500")}>
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
      <span className={cn("shrink-0", isDark ? "text-zinc-600" : "text-zinc-400")}>{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer" className="truncate text-emerald-500 hover:underline">
          {value}
        </a>
      ) : (
        <span className={cn("truncate", isDark ? "text-zinc-300" : "text-zinc-700")}>{value}</span>
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
  const [color, setColor] = useState("#059669")
  const colors = ["#059669", "#52525b", "#71717a", "#52525B", "#059669", "#52525b", "#52525b", "#DC2626"]
  return (
    <Modal
      open={open}
      onCancel={() => { setName(""); setColor("#059669"); onClose() }}
      title="新建分类"
      okText="创建"
      cancelText="取消"
      onOk={() => name.trim() && onConfirm(name.trim(), color)}
      okButtonProps={{ disabled: !name.trim() }}
    >
      <div className="space-y-3 py-2">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">名称</label>
          <AntInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：草莓种植资料"
            autoFocus
            maxLength={collectionNameMax}
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">颜色</label>
          <div className="flex gap-2">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  "w-7 h-7 rounded-full transition-all",
                  color === c ? "ring-2 ring-offset-2 ring-emerald-500" : ""
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
  const { message } = useFeedback()
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
          <label className="text-xs text-zinc-500 mb-1 block">标题 <span className="text-red-500">*</span></label>
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
            <label className="text-xs text-zinc-500 mb-1 block">类型</label>
            <Select
              value={contentType}
              onChange={(v) => setContentType(v)}
              className="w-full"
              options={Object.entries(TYPE_META).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">分类</label>
            <Select
              value={collectionId ?? undefined}
              onChange={(v) => setCollectionId(v ?? null)}
              className="w-full"
              allowClear
              placeholder="选择分类"
              options={[
                { value: undefined, label: "未分类" },
                ...collections.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">标签（逗号分隔）</label>
          <AntInput
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="如：草莓, 病害, 防治"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">摘要（可选）</label>
          <AntInput
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="一句话概括"
            maxLength={summaryMax}
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">内容</label>
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
  const { message } = useFeedback()
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
          <IconSetting size={16} style={{ color: "#059669" }} />
          <span>知识库管理</span>
        </div>
      }
    >
      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: "overview",
            label: <span className="text-sm"><IconDatabaseNetwork size={12} className="inline mr-1" />概览</span>,
            children: stats ? (
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="条目总数" value={stats.total_items} darkMode={isDark} />
                  <StatCard label="分类数" value={stats.total_collections} darkMode={isDark} />
                  <StatCard label="存储占用" value={formatSize(stats.storage_bytes)} darkMode={isDark} />
                  <StatCard label="加密状态" value="默认私有" darkMode={isDark} icon={Lock} />
                </div>
                <div className={cn("p-3 rounded-lg text-xs space-y-1.5", isDark ? "bg-zinc-900 text-zinc-400" : "bg-zinc-50 text-zinc-500")}>
                  <div className="flex items-center gap-1.5"><IconShield size={12} style={{ color: "#059669" }} /><span>所有数据仅本人可见（access_level = private）</span></div>
                  <div className="flex items-center gap-1.5"><IconCheckOne size={12} style={{ color: "#059669" }} /><span>API 路由全部经过 getCurrentUser 鉴权</span></div>
                  <div className="flex items-center gap-1.5"><IconCheckOne size={12} style={{ color: "#059669" }} /><span>文件存储于 /public/uploads/knowledge/[uid]/（受 Web 鉴权保护）</span></div>
                </div>
                <button
                  onClick={onRefresh}
                  className={cn(
                    "w-full h-8 rounded-lg text-sm flex items-center justify-center gap-1.5 border",
                    isDark ? "border-zinc-800 text-zinc-300 hover:bg-zinc-800" : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  <IconRefresh size={12} /> 刷新统计
                </button>
              </div>
            ) : <Spin />
          },
          {
            key: "backup",
            label: <span className="text-sm"><IconCloudStorage size={12} className="mr-1" />备份</span>,
            children: (
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between">
                  <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-zinc-500")}>
                    备份为 JSON 格式，包含条目元数据、版本历史、标签（不含文件二进制）
                  </p>
                  <button
                    onClick={handleCreateBackup}
                    disabled={creatingBackup}
                    className="h-7 px-3 rounded-lg text-xs text-white flex items-center gap-1.5"
                    style={{ background: "#059669" }}
                  >
                    {creatingBackup ? <IconLoading size={11} className="animate-spin" /> : <IconCloudStorage size={11} />}
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
                          "p-2.5 rounded-lg flex items-center gap-2 text-xs",
                          isDark ? "bg-zinc-900" : "bg-zinc-50"
                        )}
                      >
                        <IconHardDisk size={12} className={isDark ? "text-zinc-500" : "text-zinc-400"} />
                        <div className="flex-1 min-w-0">
                          <div className={cn("font-medium truncate", isDark ? "text-zinc-200" : "text-zinc-700")}>
                            {b.name || `备份 #${b.id}`}
                          </div>
                          <div className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-zinc-400")}>
                            {formatFullTime(b.created_at)} · {b.item_count} 条 · {formatSize(b.file_size)}
                          </div>
                        </div>
                        {b.status === "completed" && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "#16A34A20", color: "#059669" }}>
                            完成
                          </span>
                        )}
                        {b.status === "running" && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded flex items-center gap-1" style={{ background: "#05966920", color: "#059669" }}>
                            <IconLoading size={9} className="animate-spin" /> 进行中
                          </span>
                        )}
                        {b.status === "failed" && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "#DC262620", color: "#DC2626" }}>
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
                                isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-200 text-zinc-500"
                              )}
                            >
                              <IconDownload size={11} />
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
            label: <span className="text-sm"><IconShare size={12} className="mr-1" />共享</span>,
            children: (
              <div className="py-2">
                <Empty
                  description={
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-500">共享功能允许你将知识条目授权给其他用户</p>
                      <p className="text-[11px] text-zinc-400">支持 read / write / admin 三级权限</p>
                    </div>
                  }
                />
                <p className={cn("text-[11px] mt-2 text-center", isDark ? "text-zinc-500" : "text-zinc-400")}>
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
      "p-3 rounded-lg",
      isDark ? "bg-zinc-900" : "bg-zinc-50"
    )}>
      <div className={cn("text-[11px] uppercase tracking-wide mb-1", isDark ? "text-zinc-500" : "text-zinc-400")}>
        {label}
      </div>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={12} className="text-emerald-500" />}
        <div className={cn("text-base font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>
          {value}
        </div>
      </div>
    </div>
  )
}
