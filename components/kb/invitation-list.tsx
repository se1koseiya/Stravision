"use client"

/**
 * 邀请列表（Ant Design 规范 · 通知中心风格）
 *
 * 设计原则：
 * - 列表项无边框、无圆角、无背景，纯 1px 分割线分隔（避免圆角套圆角）
 * - hover 整行变浅灰 #fafafa，待处理项左侧 2px 蓝色色条
 * - 字号层级 14/13/12/11，间距 8/12/16
 * - 颜色全部使用 AntD token
 */

import { useState, useEffect, useCallback } from "react"
import { Avatar, Button, Empty, Spin, Tag, Tabs } from "antd"

import { toast } from "@/lib/ui/feedback"
import type { CSSProperties } from "react"
import { IconBook, IconCheck, IconClose, IconInbox, IconMail, IconRight, IconTime } from "@/components/icon";

interface Invitation {
  id: number
  collection_id: number
  inviter_id: number
  invitee_id: number
  role: "owner" | "admin" | "editor" | "viewer"
  status: "pending" | "accepted" | "rejected" | "cancelled" | "expired"
  message: string | null
  expires_at: number | null
  created_at: number
  responded_at: number | null
  collection_name?: string
  inviter_name?: string
  inviter_avatar?: string | null
}

interface InvitationListProps {
  showTabs?: boolean
  defaultTab?: "pending" | "history"
  limit?: number
  inline?: boolean
  className?: string
  onInvitationChange?: () => void
  onOpenCollection?: (collectionId: number) => void
  onPendingCountChange?: (count: number) => void
}

// AntD 颜色 token
const COLOR = {
  primary: "#059669",
  primaryBg: "rgba(0,148,86,0.06)",
  primaryBorder: "rgba(0,148,86,0.20)",
  text: "rgba(0,0,0,0.88)",
  secondary: "rgba(0,0,0,0.65)",
  tertiary: "rgba(0,0,0,0.45)",
  quaternary: "rgba(0,0,0,0.25)",
  divider: "#F4F4F5",
  fillHover: "#fafafa",
  fillQuaternary: "rgba(0,0,0,0.02)",
  bgContainer: "#ffffff",
  success: "#059669",
  warning: "#52525B",
  error: "#DC2626"
}

const ROLE_COLOR: Record<string, string> = {
  owner: "orange",
  admin: "blue",
  editor: "green",
  viewer: "default"
}

const ROLE_LABEL: Record<string, string> = {
  owner: "拥有者",
  admin: "管理员",
  editor: "编辑者",
  viewer: "查看者"
}

const STATUS_INFO: Record<string, { text: string; color: string }> = {
  accepted: { text: "已接受", color: COLOR.success },
  rejected: { text: "已拒绝", color: COLOR.warning },
  cancelled: { text: "已取消", color: COLOR.tertiary },
  expired: { text: "已过期", color: COLOR.error },
  pending: { text: "待处理", color: COLOR.primary }
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
  if (day < 30) return `${day} 天前`
  const date = new Date(ts)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export default function InvitationList({
  showTabs = true,
  defaultTab = "pending",
  limit = 50,
  inline = false,
  className,
  onInvitationChange,
  onOpenCollection,
  onPendingCountChange
}: InvitationListProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "history">(defaultTab)
  const [pending, setPending] = useState<Invitation[]>([])
  const [history, setHistory] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<Set<number>>(new Set())

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [pendRes, histRes] = await Promise.all([
        fetch(`/api/knowledge/invitations?direction=received&status=pending&limit=${limit}`, { credentials: "include" }),
        fetch(`/api/knowledge/invitations?direction=received&status=all&limit=${limit}`, { credentials: "include" })
      ])
      const pendData = await pendRes.json().catch(() => ({ items: [] }))
      const histData = await histRes.json().catch(() => ({ items: [] }))
      const pendingItems: Invitation[] = pendData.items || []
      setPending(pendingItems)
      setHistory((histData.items || []).filter((i: Invitation) => i.status !== "pending"))
      onPendingCountChange?.(pendingItems.length)
    } catch (e: any) {
      console.error("[InvitationList] refresh error:", e.message)
    } finally {
      setLoading(false)
    }
  }, [limit, onPendingCountChange])

  useEffect(() => {
    refresh()
  }, [refresh])

  const setRespondingFor = (id: number, val: boolean) => {
    setResponding((prev) => {
      const next = new Set(prev)
      if (val) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleAccept = async (id: number) => {
    setRespondingFor(id, true)
    try {
      const res = await fetch(`/api/knowledge/invitations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "accept" })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // not_yours 时显示详细对比，便于排查身份不匹配
        if (data?.detail) {
          const d = data.detail
          throw new Error(
            `${data.error}（当前用户: ${d.current_username} #${d.current_user_id}, 邀请 invitee_id: ${d.invitee_id}）`
          )
        }
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      toast.success("已接受邀请")
      refresh()
      onInvitationChange?.()
      // 通知侧边栏/活动流等组件刷新协作集合列表
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("kb:collaboration-changed"))
      }
    } catch (e: any) {
      toast.error(`接受失败：${e.message}`, { duration: 6000 })
    } finally {
      setRespondingFor(id, false)
    }
  }

  const handleReject = async (id: number) => {
    setRespondingFor(id, true)
    try {
      const res = await fetch(`/api/knowledge/invitations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "reject" })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.detail) {
          const d = data.detail
          throw new Error(
            `${data.error}（当前用户: ${d.current_username} #${d.current_user_id}, 邀请 invitee_id: ${d.invitee_id}）`
          )
        }
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      toast.success("已拒绝邀请")
      refresh()
      onInvitationChange?.()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("kb:collaboration-changed"))
      }
    } catch (e: any) {
      toast.error(`拒绝失败：${e.message}`, { duration: 6000 })
    } finally {
      setRespondingFor(id, false)
    }
  }

  // === 渲染单条邀请（列表项风格，无圆角无卡片） ===
  const renderItem = (inv: Invitation, index: number, total: number) => {
    const isPending = inv.status === "pending"
    const isExpired =
      inv.status === "expired" ||
      (isPending && inv.expires_at != null && inv.expires_at < Date.now())
    const status = isExpired && inv.status === "pending" ? "expired" : inv.status
    const statusInfo = STATUS_INFO[status] || STATUS_INFO.pending
    const isLast = index === total - 1

    const rowStyle: CSSProperties = {
      position: "relative",
      padding: "12px 16px",
      borderBottom: isLast ? "none" : `1px solid ${COLOR.divider}`,
      transition: "background 0.15s",
      cursor: "default"
    }

    return (
      <div
        key={inv.id}
        style={rowStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = COLOR.fillHover
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent"
        }}
      >
        {/* 待处理项左侧色条 */}
        {isPending && !isExpired && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 12,
              bottom: 12,
              width: 2,
              background: COLOR.primary,
              borderRadius: 1
            }}
          />
        )}

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* 头像 */}
          <Avatar
            size={32}
            src={inv.inviter_avatar || undefined}
            style={{ background: COLOR.primary, flexShrink: 0, fontSize: 13 }}
          >
            {(inv.inviter_name || "?").slice(0, 1).toUpperCase()}
          </Avatar>

          {/* 主体内容 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 标题行：用户名 + 动作 */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: COLOR.text,
                  lineHeight: 1.4
                }}
              >
                {inv.inviter_name || "未知用户"}
              </span>
              <span style={{ fontSize: 12, color: COLOR.tertiary }}>邀请你协作</span>
            </div>

            {/* 知识库名 */}
            <div
              style={{
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              <IconBook style={{ fontSize: 12, color: COLOR.primary }} />
              <span
                style={{
                  fontSize: 13,
                  color: COLOR.primary,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {inv.collection_name || "未知知识库"}
              </span>
            </div>

            {/* 元信息标签 */}
            <div
              style={{
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap"
              }}
            >
              <Tag
                color={ROLE_COLOR[inv.role]}
                style={{
                  marginInlineEnd: 0,
                  fontSize: 11,
                  lineHeight: "16px",
                  padding: "0 6px",
                  borderRadius: 4
                }}
              >
                {ROLE_LABEL[inv.role]}
              </Tag>
              <span
                style={{
                  fontSize: 12,
                  color: COLOR.quaternary,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <IconTime style={{ fontSize: 11 }} />
                {timeAgo(inv.created_at)}
              </span>
              {inv.expires_at != null && isPending && !isExpired && (
                <span style={{ fontSize: 12, color: COLOR.warning }}>
                  {Math.max(0, Math.ceil((inv.expires_at - Date.now()) / (24 * 3600 * 1000)))} 天后过期
                </span>
              )}
              {!isPending && (
                <Tag
                  style={{
                    marginInlineEnd: 0,
                    fontSize: 11,
                    lineHeight: "16px",
                    padding: "0 6px",
                    borderRadius: 4,
                    color: statusInfo.color,
                    borderColor: statusInfo.color,
                    background: "transparent"
                  }}
                >
                  {statusInfo.text}
                </Tag>
              )}
            </div>

            {/* 留言 */}
            {inv.message && (
              <div
                style={{
                  marginTop: 8,
                  padding: "6px 10px",
                  background: COLOR.fillQuaternary,
                  borderRadius: 4,
                  border: "none"
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: COLOR.secondary,
                    lineHeight: 1.6,
                    fontStyle: "italic"
                  }}
                >
                  {inv.message}
                </span>
              </div>
            )}

            {/* 操作区 */}
            {isPending && !isExpired && (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <Button
                  type="primary"
                  size="small"
                  icon={<IconCheck />}
                  loading={responding.has(inv.id)}
                  onClick={() => handleAccept(inv.id)}
                  style={{ borderRadius: 6, height: 28, fontSize: 13, fontWeight: 500, padding: "0 14px" }}
                >
                  接受邀请
                </Button>
                <Button
                  size="small"
                  icon={<IconClose />}
                  disabled={responding.has(inv.id)}
                  onClick={() => handleReject(inv.id)}
                  style={{ borderRadius: 6, height: 28, fontSize: 13, padding: "0 14px" }}
                >
                  拒绝
                </Button>
                {onOpenCollection && (
                  <Button
                    type="text"
                    size="small"
                    onClick={() => onOpenCollection(inv.collection_id)}
                    style={{
                      marginLeft: "auto",
                      height: 28,
                      fontSize: 13,
                      padding: "0 8px",
                      color: COLOR.primary
                    }}
                  >
                    查看知识库 <IconRight style={{ fontSize: 11 }} />
                  </Button>
                )}
              </div>
            )}
            {isExpired && inv.status === "pending" && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: COLOR.error,
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <IconTime style={{ fontSize: 11 }} />
                邀请已过期
              </div>
            )}
            {/* 已接受邀请的查看入口 */}
            {!isPending && inv.status === "accepted" && onOpenCollection && (
              <div style={{ marginTop: 12 }}>
                <Button
                  type="default"
                  size="small"
                  icon={<IconBook />}
                  onClick={() => onOpenCollection(inv.collection_id)}
                  style={{ borderRadius: 6, height: 28, fontSize: 13, padding: "0 12px" }}
                >
                  进入知识库
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // === 列表容器 ===
  const renderList = (items: Invitation[], emptyText: string) => {
    if (loading) {
      return (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Spin size="small" />
        </div>
      )
    }
    if (items.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={emptyText}
          style={{ margin: "40px 0" }}
        />
      )
    }
    return (
      <div
        style={{
          borderTop: `1px solid ${COLOR.divider}`
        }}
      >
        {items.map((inv, i) => renderItem(inv, i, items.length))}
      </div>
    )
  }

  // === 主渲染 ===
  return (
    <div style={!inline ? { padding: "0 16px 8px" } : undefined} className={className}>
      {showTabs ? (
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as "pending" | "history")}
          size="small"
          style={{ paddingLeft: 16, paddingRight: 16, marginBottom: 0 }}
          items={[
            {
              key: "pending",
              label: (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <IconInbox style={{ fontSize: 12 }} />
                  <span>待处理</span>
                  {pending.length > 0 && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 16,
                        height: 16,
                        padding: "0 4px",
                        fontSize: 10,
                        fontWeight: 500,
                        color: "#ffffff",
                        background: COLOR.primary,
                        borderRadius: 8,
                        lineHeight: 1
                      }}
                    >
                      {pending.length}
                    </span>
                  )}
                </span>
              ),
              children: renderList(pending, "暂无待处理邀请")
            },
            {
              key: "history",
              label: (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <IconMail style={{ fontSize: 12 }} />
                  <span>历史</span>
                </span>
              ),
              children: renderList(history, "暂无历史记录")
            }
          ]}
        />
      ) : (
        renderList(pending, "暂无待处理邀请")
      )}
    </div>
  )
}
