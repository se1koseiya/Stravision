"use client"

/**
 * 知识库活动流组件
 *
 * 用法：
 *   <ActivityFeed scope="visible" />                  // 当前用户可见的所有活动（默认）
 *   <ActivityFeed scope="collection" collectionId={12} />  // 单库活动
 *   <ActivityFeed scope="all" />                       // 全平台 public 活动
 *   <ActivityFeed scope="user" />                      // 我的活动
 *
 * 特性：
 *   - 初次加载分页 GET /api/knowledge/activity
 *   - SSE 订阅 ?stream=1 实时追加新事件
 *   - action 类型过滤
 *   - 时间线渲染（lucide icon + 用户头像 + 动作描述 + 时间）
 */

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Avatar, Tooltip, Empty, Spin, Tabs, Tag, Button
} from "antd"
import { App as AntApp } from "antd"
import {
  FileText, FilePlus, FileEdit, Trash2, Share2, Download, Upload,
  UserPlus, UserCheck, UserX, Crown, Shield, Edit3, Eye,
  History, FolderPlus, FolderEdit, FolderX, Activity as ActivityIcon,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

// ===== 类型 =====
interface KbOperationLog {
  id: number
  user_id: number
  collection_id: number | null
  item_id: number | null
  action: string
  target_type: string | null
  target_id: number | null
  metadata: string | null
  ip: string | null
  user_agent: string | null
  visibility: string
  created_at: number
  username?: string
  avatar_url?: string | null
  collection_name?: string | null
  item_title?: string | null
}

interface ActivityFeedProps {
  scope?: "visible" | "all" | "public" | "collection" | "user"
  collectionId?: number
  actionFilter?: string
  limit?: number
  showHeader?: boolean
  showFilter?: boolean
  height?: number | string
  className?: string
  onItemCountChange?: (count: number) => void
}

// ===== 动作配置 =====
interface ActionConfig {
  icon: typeof FileText
  color: string
  bg: string
  label: (log: KbOperationLog) => string
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
  create_collection: {
    icon: FolderPlus, color: "#1677ff", bg: "rgba(22,119,255,0.10)",
    label: (l) => `创建了知识库「${l.collection_name || "未命名"}」`
  },
  update_collection: {
    icon: FolderEdit, color: "#1677ff", bg: "rgba(22,119,255,0.10)",
    label: (l) => `更新了知识库「${l.collection_name || "未命名"}」`
  },
  delete_collection: {
    icon: FolderX, color: "#ff4d4f", bg: "rgba(255,77,79,0.10)",
    label: (l) => `删除了知识库「${l.collection_name || "未命名"}」`
  },
  create_item: {
    icon: FilePlus, color: "#52c41a", bg: "rgba(82,196,26,0.10)",
    label: (l) => l.collection_name
      ? `在「${l.collection_name}」创建了文档「${l.item_title || "未命名"}」`
      : `创建了文档「${l.item_title || "未命名"}」`
  },
  update_item: {
    icon: FileEdit, color: "#fa8c16", bg: "rgba(250,140,22,0.10)",
    label: (l) => `编辑了文档「${l.item_title || "未命名"}」`
  },
  delete_item: {
    icon: Trash2, color: "#ff4d4f", bg: "rgba(255,77,79,0.10)",
    label: (l) => `删除了文档「${l.item_title || "未命名"}」`
  },
  restore_version: {
    icon: History, color: "#722ed1", bg: "rgba(114,46,209,0.10)",
    label: (l) => `恢复了文档「${l.item_title || "未命名"}」的版本`
  },
  invite_user: {
    icon: UserPlus, color: "#1677ff", bg: "rgba(22,119,255,0.10)",
    label: (l) => l.collection_name
      ? `邀请了用户加入「${l.collection_name}」`
      : `发送了协作邀请`
  },
  accept_invitation: {
    icon: UserCheck, color: "#52c41a", bg: "rgba(82,196,26,0.10)",
    label: (l) => l.collection_name
      ? `接受了邀请，加入「${l.collection_name}」`
      : `接受了协作邀请`
  },
  reject_invitation: {
    icon: UserX, color: "#fa8c16", bg: "rgba(250,140,22,0.10)",
    label: (l) => `拒绝了加入「${l.collection_name || "知识库"}」的邀请`
  },
  cancel_invitation: {
    icon: UserX, color: "#8c8c8c", bg: "rgba(140,140,140,0.10)",
    label: () => `取消了协作邀请`
  },
  update_role: {
    icon: Shield, color: "#fa8c16", bg: "rgba(250,140,22,0.10)",
    label: (l) => l.collection_name
      ? `变更了「${l.collection_name}」的协作者角色`
      : `变更了协作者角色`
  },
  remove_collaborator: {
    icon: UserX, color: "#ff4d4f", bg: "rgba(255,77,79,0.10)",
    label: (l) => l.collection_name
      ? `移除了「${l.collection_name}」的协作者`
      : `移除了协作者`
  },
  edit_document: {
    icon: Edit3, color: "#1677ff", bg: "rgba(22,119,255,0.10)",
    label: (l) => `编辑了文档「${l.item_title || "未命名"}」`
  },
  export_document: {
    icon: Download, color: "#08979c", bg: "rgba(8,151,156,0.10)",
    label: (l) => `导出了文档「${l.item_title || "未命名"}」`
  },
  import_document: {
    icon: Upload, color: "#722ed1", bg: "rgba(114,46,209,0.10)",
    label: (l) => `从 Word 文档导入了「${l.item_title || "未命名"}」`
  },
  share: {
    icon: Share2, color: "#1677ff", bg: "rgba(22,119,255,0.10)",
    label: (l) => `分享了文档「${l.item_title || "未命名"}」`
  },
  view: {
    icon: Eye, color: "#8c8c8c", bg: "rgba(140,140,140,0.10)",
    label: (l) => `查看了文档「${l.item_title || "未命名"}」`
  }
}

// 5 个一级 Tab（全部 / 编辑 / 创建 / 邀请 / 删除）
// 大厂风格：左侧 lucide 图标 + 文字 + 右侧数字徽标
const FILTER_TABS: Array<{ key: string; label: string; icon: any }> = [
  { key: "all", label: "全部", icon: ActivityIcon },
  { key: "edit", label: "编辑", icon: FileEdit },
  { key: "create", label: "创建", icon: FilePlus },
  { key: "invite", label: "邀请", icon: UserPlus },
  { key: "delete", label: "删除", icon: Trash2 }
]

// 匹配过滤器（"edit" 匹配 update_*/edit_document，"create" 匹配 create_*，"invite" 匹配 *_invitation/invite_user，"delete" 匹配 delete_*/remove_*）
function matchesFilter(action: string, filter: string): boolean {
  if (filter === "all") return true
  if (filter === "edit") return /update_|edit_document|restore_version/.test(action)
  if (filter === "create") return /create_/.test(action)
  if (filter === "invite") return /invitation|invite_user|update_role|remove_collaborator|accept_invitation/.test(action)
  if (filter === "delete") return /delete_|remove_/.test(action)
  return true
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "刚刚"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} 天前`
  const date = new Date(ts)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

// ===== 主组件 =====
export default function ActivityFeed({
  scope = "visible",
  collectionId,
  actionFilter,
  limit = 30,
  showHeader = true,
  showFilter = true,
  height,
  className,
  onItemCountChange
}: ActivityFeedProps) {
  const { message } = AntApp.useApp()
  const [logs, setLogs] = useState<KbOperationLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState<string>("all")
  const [sseConnected, setSseConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const offsetRef = useRef(0)
  const initialLoadedRef = useRef(false)

  // ===== 拉取列表 =====
  const fetchList = useCallback(async (resetOffset: boolean = false) => {
    if (resetOffset) {
      offsetRef.current = 0
      setLoading(true)
    }
    try {
      const params = new URLSearchParams({
        scope,
        limit: String(limit),
        offset: String(offsetRef.current)
      })
      if (collectionId != null) params.set("collection_id", String(collectionId))
      if (actionFilter) params.set("action", actionFilter)
      const res = await fetch(`/api/knowledge/activity?${params.toString()}`, { credentials: "include" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const items: KbOperationLog[] = data.items || []
      setTotal(data.total || 0)
      if (resetOffset) {
        setLogs(items)
      } else {
        setLogs((prev) => {
          // 去重：按 id
          const seen = new Set(prev.map((l) => l.id))
          return [...prev, ...items.filter((l) => !seen.has(l.id))]
        })
      }
      offsetRef.current += items.length
      onItemCountChange?.(data.total || 0)
    } catch (e: any) {
      console.error("[ActivityFeed] fetchList error:", e.message)
      message.error(`加载活动失败：${e.message}`)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [scope, collectionId, actionFilter, limit, onItemCountChange, message])

  // ===== 初始加载 + SSE 订阅 =====
  useEffect(() => {
    fetchList(true)
    initialLoadedRef.current = true

    // 建立 SSE 连接
    const sseParams = new URLSearchParams({
      scope,
      stream: "1"
    })
    if (collectionId != null) sseParams.set("collection_id", String(collectionId))
    const es = new EventSource(`/api/knowledge/activity?${sseParams.toString()}`)
    eventSourceRef.current = es

    es.onopen = () => setSseConnected(true)
    es.onerror = () => setSseConnected(false)
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data)
        if (payload.type === "operation" && payload.log) {
          const log: KbOperationLog = payload.log
          setLogs((prev) => {
            // 去重
            if (prev.some((l) => l.id === log.id)) return prev
            return [log, ...prev].slice(0, 200) // 内存中保留最多 200 条
          })
          setTotal((t) => t + 1)
          onItemCountChange?.(total + 1)
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    return () => {
      es.close()
      eventSourceRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, collectionId, actionFilter])

  // ===== 加载更多 =====
  const handleLoadMore = () => {
    setLoadingMore(true)
    fetchList(false)
  }

  // ===== 渲染 =====
  const filteredLogs = logs.filter((l) => matchesFilter(l.action, filter))
  // 计算每个 Tab 的数量（用于徽标），用所有加载的日志统计（不是 filteredLogs，否则切 tab 后计数会变）
  const countByFilter: Record<string, number> = { all: logs.length }
  for (const k of ["edit", "create", "invite", "delete"]) {
    countByFilter[k] = logs.filter((l) => matchesFilter(l.action, k)).length
  }
  const hasMore = offsetRef.current < total

  return (
    <div
      className={cn("flex flex-col", className)}
      style={{ height }}
    >
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-gray-500 dark:text-zinc-500">共</span>
            <span className="font-semibold text-[15px] text-[#1677ff]">{total}</span>
            <span className="text-gray-500 dark:text-zinc-500">条活动</span>
            {sseConnected && (
              <>
                <span className="text-gray-300 dark:text-zinc-700">·</span>
                <span className="flex items-center gap-1 text-[11px] text-[#52c41a]">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#52c41a] inline-block"
                    style={{ boxShadow: "0 0 0 3px rgba(82,196,26,0.18)" }}
                  />
                  实时
                </span>
              </>
            )}
          </div>
          <Button
            type="text"
            icon={<RefreshCw size={13} />}
            onClick={() => fetchList(true)}
            loading={loading}
            style={{ borderRadius: 4, height: 26, fontSize: 12, padding: "0 8px" }}
          >
            刷新
          </Button>
        </div>
      )}

      {showFilter && (
        <div className="px-4 border-b border-gray-100 dark:border-gray-800">
          <Tabs
            activeKey={filter}
            onChange={(k) => setFilter(k)}
            size="small"
            tabBarStyle={{ margin: 0, borderBottom: "none", paddingTop: 4 }}
            items={FILTER_TABS.map((t) => {
              const Icon = t.icon
              const count = countByFilter[t.key] || 0
              const active = filter === t.key
              return {
                key: t.key,
                label: (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12.5,
                      fontWeight: active ? 500 : 400
                    }}
                  >
                    <Icon
                      size={12}
                      strokeWidth={active ? 2.2 : 1.6}
                      style={{ color: active ? "#1677ff" : "rgba(0,0,0,0.45)" }}
                    />
                    <span>{t.label}</span>
                    {count > 0 && (
                      <span
                        className="rounded-full inline-flex items-center justify-center text-[10px] font-medium"
                        style={{
                          minWidth: 16,
                          height: 16,
                          padding: "0 5px",
                          background: active ? "#1677ff" : "rgba(0,0,0,0.06)",
                          color: active ? "#fff" : "rgba(0,0,0,0.55)"
                        }}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </span>
                )
              }
            })}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Spin />
          </div>
        ) : filteredLogs.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无活动"
            className="!my-12"
          />
        ) : (
          <div className="relative pl-3 pr-2 py-2">
            {/* 时间线竖线 */}
            <div
              className="absolute left-[18px] top-4 bottom-4 w-px bg-gray-200 dark:bg-zinc-700"
              aria-hidden
            />
            <div className="space-y-0.5">
              {filteredLogs.map((log) => {
                const cfg = ACTION_CONFIG[log.action] || {
                  icon: ActivityIcon,
                  color: "#8c8c8c",
                  bg: "rgba(140,140,140,0.10)",
                  label: (l: KbOperationLog) => `执行了操作：${l.action}`
                }
                // 解析 metadata 中的角色
                let roleText: string | null = null
                if (log.metadata) {
                  try {
                    const meta = JSON.parse(log.metadata)
                    if (meta.role && log.action === "invite_user") {
                      roleText = roleLabel(meta.role)
                    }
                  } catch {}
                }
                return (
                  <div
                    key={log.id}
                    className="relative flex items-start gap-2.5 pl-1 pr-2 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    {/* 时间线圆点（带动作色） */}
                    <span
                      className="absolute left-[-5px] top-3 w-2.5 h-2.5 rounded-full z-10 ring-2 ring-white dark:ring-zinc-900"
                      style={{ background: cfg.color }}
                      aria-hidden
                    />

                    {/* 头像（用户身份识别） */}
                    <Avatar size={26} src={log.avatar_url || undefined} className="shrink-0 mt-0.5">
                      {(log.username || "?").slice(0, 1).toUpperCase()}
                    </Avatar>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      {/* 主行：动作描述 + 时间（右对齐） */}
                      <div className="flex items-center gap-1.5 text-[12.5px] leading-snug">
                        <span className="font-medium text-gray-900 dark:text-zinc-100 shrink-0">
                          {log.username || "未知用户"}
                        </span>
                        <span className="text-gray-500 dark:text-zinc-500">·</span>
                        <span className="text-gray-500 dark:text-zinc-500 shrink-0">
                          {timeAgo(log.created_at)}
                        </span>
                        {roleText && (
                          <>
                            <span className="text-gray-300 dark:text-zinc-700">·</span>
                            <span
                              className="h-[16px] px-1.5 rounded text-[10px] font-medium inline-flex items-center"
                              style={{ background: "rgba(22,119,255,0.10)", color: "#1677ff" }}
                            >
                              {roleText}
                            </span>
                          </>
                        )}
                      </div>
                      {/* 副行：动作描述（带动作色关键词） */}
                      <div className="text-[12.5px] text-gray-700 dark:text-zinc-300 mt-0.5 leading-snug truncate">
                        {cfg.label(log)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {!loading && hasMore && filteredLogs.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <Button
            block
            type="default"
            size="small"
            onClick={handleLoadMore}
            loading={loadingMore}
            style={{ borderRadius: 6, height: 30, fontSize: 13 }}
          >
            加载更多（剩余 {Math.max(0, total - offsetRef.current)}）
          </Button>
        </div>
      )}
    </div>
  )
}

function roleLabel(role: string): string {
  if (role === "owner") return "拥有者"
  if (role === "admin") return "管理员"
  if (role === "editor") return "编辑者"
  if (role === "viewer") return "查看者"
  return role
}
