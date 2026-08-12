"use client"

/**
 * 协作者管理面板
 *
 * 用法：
 *   <CollaboratorsPanel collectionId={12} currentUserId={user.id} canManage={true} />
 *
 * 功能：
 *   - 列出某集合的协作者（含 owner）
 *   - 邀请新协作者（用户搜索 + 角色 + 留言）
 *   - 变更协作者角色
 *   - 移除协作者
 *   - 显示待处理邀请列表（可取消）
 */

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Avatar, Button, Modal, Input, Select, Empty, Spin, Tag,
  Dropdown, App as AntApp, Tooltip
} from "antd"
import {
  UserPlus, MoreHorizontal, Trash2, Crown, Shield, Edit3, Eye,
  X, Search, Loader2, Mail, ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Collaborator {
  id: number
  collection_id: number
  user_id: number
  role: "owner" | "admin" | "editor" | "viewer"
  invited_by: number | null
  joined_at: number
  created_at: number
  username?: string
  avatar_url?: string | null
  email?: string
  uid?: string
}

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
  invitee_name?: string
  invitee_avatar?: string | null
}

interface SearchUser {
  id: number
  uid: string
  username: string
  email: string
  avatar_url: string | null
}

interface CollaboratorsPanelProps {
  collectionId: number
  currentUserId: number
  canManage?: boolean // 是否可邀请/变更/移除（owner/admin）
  className?: string
  onInvitationChange?: () => void
}

const ROLE_OPTIONS = [
  { label: "管理员", value: "admin" },
  { label: "编辑者", value: "editor" },
  { label: "查看者", value: "viewer" }
]

function roleLabel(role: string): string {
  if (role === "owner") return "拥有者"
  if (role === "admin") return "管理员"
  if (role === "editor") return "编辑者"
  if (role === "viewer") return "查看者"
  return role
}

function roleColor(role: string): string {
  if (role === "owner") return "#fa8c16"
  if (role === "admin") return "#1677ff"
  if (role === "editor") return "#52c41a"
  if (role === "viewer") return "#8c8c8c"
  return "#8c8c8c"
}

function roleIcon(role: string) {
  if (role === "owner") return Crown
  if (role === "admin") return Shield
  if (role === "editor") return Edit3
  if (role === "viewer") return Eye
  return Eye
}

export default function CollaboratorsPanel({
  collectionId,
  currentUserId,
  canManage = false,
  className,
  onInvitationChange
}: CollaboratorsPanelProps) {
  const { message, modal } = AntApp.useApp()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)

  // 邀请 Modal 状态
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null)
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("editor")
  const [inviteMessage, setInviteMessage] = useState("")
  const [sending, setSending] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectOpen, setSelectOpen] = useState(false)

  // ===== 拉取协作者 + 待处理邀请 =====
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [collRes, invRes] = await Promise.all([
        fetch(`/api/knowledge/collaborators?collection_id=${collectionId}`, { credentials: "include" }),
        fetch(`/api/knowledge/invitations?direction=sent&status=pending&collection_id=${collectionId}`, { credentials: "include" })
      ])
      const collText = await collRes.text().catch(() => "")
      const invText = await invRes.text().catch(() => "")
      const collData: any = collText ? JSON.parse(collText) : { items: [] }
      const invData: any = invText ? JSON.parse(invText) : { items: [] }
      setCollaborators(collData.items || [])
      setInvitations(invData.items || [])
      // 上报统计给父 Modal
      window.dispatchEvent(new CustomEvent("kb:collab-stats", {
        detail: {
          kind: "collaborators",
          collectionId,
          count: (collData.items || []).length,
          pending: (invData.items || []).length
        }
      }))
    } catch (e: any) {
      console.error("[CollaboratorsPanel] refresh error:", e.message)
    } finally {
      setLoading(false)
    }
  }, [collectionId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // ===== 用户搜索 =====
  const performSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/knowledge/users/search?q=${encodeURIComponent(q.trim())}`, { credentials: "include" })
      const data = await res.json().catch(() => ({ items: [] }))
      setSearchResults(data.items || [])
    } catch (e: any) {
      console.error("[CollaboratorsPanel] search error:", e.message)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    searchTimerRef.current = setTimeout(() => {
      performSearch(val)
    }, 300) as any
  }

  // ===== 发送邀请 =====
  const handleSendInvite = async () => {
    if (!selectedUser) {
      message.warning("请先选择被邀请用户")
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/knowledge/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          collection_id: collectionId,
          invitee_id: selectedUser.id,
          role: inviteRole,
          message: inviteMessage || null
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      if (data.status === "already_member") {
        message.info("该用户已是协作者")
      } else if (data.status === "already_pending") {
        message.info("已有待处理邀请，已忽略重复发送")
      } else {
        message.success("邀请已发送")
      }
      // 关闭并重置
      setInviteModalOpen(false)
      setSelectedUser(null)
      setSearchQuery("")
      setSearchResults([])
      setInviteMessage("")
      setInviteRole("editor")
      refresh()
      onInvitationChange?.()
    } catch (e: any) {
      console.error("[CollaboratorsPanel] sendInvite error:", e.message)
      message.error(`发送邀请失败：${e.message}`)
    } finally {
      setSending(false)
    }
  }

  // ===== 变更角色 =====
  const handleChangeRole = async (userId: number, newRole: "admin" | "editor" | "viewer") => {
    try {
      const res = await fetch(
        `/api/knowledge/collaborators?collection_id=${collectionId}&user_id=${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ role: newRole })
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      message.success(`角色已变更为「${roleLabel(newRole)}」`)
      refresh()
    } catch (e: any) {
      console.error("[CollaboratorsPanel] changeRole error:", e.message)
      message.error(`变更角色失败：${e.message}`)
    }
  }

  // ===== 移除协作者 =====
  const handleRemove = (userId: number, username: string) => {
    modal.confirm({
      title: "确认移除协作者",
      content: `确定要移除「${username}」吗？该用户将立即失去对此知识库的访问权限。`,
      okText: "移除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await fetch(
            `/api/knowledge/collaborators?collection_id=${collectionId}&user_id=${userId}`,
            { method: "DELETE", credentials: "include" }
          )
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
          message.success("已移除")
          refresh()
        } catch (e: any) {
          console.error("[CollaboratorsPanel] remove error:", e.message)
          message.error(`移除失败：${e.message}`)
        }
      }
    })
  }

  // ===== 取消邀请 =====
  const handleCancelInvitation = async (invId: number) => {
    try {
      const res = await fetch(`/api/knowledge/invitations/${invId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "cancel" })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      message.success("已取消邀请")
      refresh()
      onInvitationChange?.()
    } catch (e: any) {
      console.error("[CollaboratorsPanel] cancelInvite error:", e.message)
      message.error(`取消邀请失败：${e.message}`)
    }
  }

  // ===== 渲染 =====
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* 待处理邀请：分组区（无分割线，靠背景 + 间距区分） */}
      {invitations.length > 0 && (
        <div className="mb-3 pb-3">
          <div className="text-[11px] text-[#fa8c16] mb-1.5 flex items-center gap-1 font-medium">
            <Mail size={11} />
            <span>待处理邀请 · {invitations.length}</span>
          </div>
          <div className="space-y-1.5">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded bg-white dark:bg-gray-900"
              >
                <Avatar size={24} src={inv.invitee_avatar || undefined}>
                  {(inv.invitee_name || "?").slice(0, 1).toUpperCase()}
                </Avatar>
                <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[12px]">
                  <span className="font-medium truncate">{inv.invitee_name || "未知用户"}</span>
                  <span className="text-gray-300 dark:text-zinc-700">·</span>
                  <span style={{ color: "#fa8c16" }}>{roleLabel(inv.role)}</span>
                  <span className="text-gray-300 dark:text-zinc-700">·</span>
                  <span className="text-gray-500 dark:text-zinc-500">{timeAgo(inv.created_at)}</span>
                </div>
                {canManage && (
                  <Button
                    size="small"
                    type="text"
                    onClick={() => handleCancelInvitation(inv.id)}
                    style={{ borderRadius: 4, height: 22, fontSize: 11, padding: "0 6px", color: "#ff4d4f" }}
                  >
                    撤销
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 协作者列表（无独立头部，由 Modal 头部统一提供统计） */}
      <div className="flex-1 overflow-y-auto">
        {collaborators.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无协作者"
            className="!my-12"
          />
        ) : (
          <div className="space-y-0.5">
            {collaborators.map((c) => {
              const RoleIcon = roleIcon(c.role)
              const isSelf = c.user_id === currentUserId
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <Avatar size={28} src={c.avatar_url || undefined}>
                    {(c.username || "?").slice(0, 1).toUpperCase()}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[12.5px] leading-tight">
                      <span className="font-medium truncate">{c.username || "未知用户"}</span>
                      {isSelf && (
                        <span className="text-[10px] text-gray-400">（你）</span>
                      )}
                    </div>
                    <div className="text-[10.5px] text-gray-500 dark:text-zinc-500 truncate leading-tight mt-0.5">
                      {c.email}
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center gap-0.5 h-[18px] px-1.5 rounded text-[10.5px] font-medium shrink-0"
                    style={(() => {
                      const map: Record<string, { bg: string; color: string }> = {
                        owner:   { bg: "rgba(250,140,22,0.10)", color: "#fa8c16" },
                        admin:   { bg: "rgba(22,119,255,0.10)", color: "#1677ff" },
                        editor:  { bg: "rgba(82,196,26,0.10)",  color: "#52c41a" },
                        viewer:  { bg: "rgba(0,0,0,0.06)",      color: "rgba(0,0,0,0.55)" }
                      }
                      const s = map[c.role] || map.viewer
                      return { background: s.bg, color: s.color }
                    })()}
                  >
                    <RoleIcon size={10} strokeWidth={2} />
                    {roleLabel(c.role)}
                  </span>
                  {canManage && c.role !== "owner" && !isSelf && (
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: "admin",
                            label: "设为管理员",
                            disabled: c.role === "admin",
                            onClick: () => handleChangeRole(c.user_id, "admin")
                          },
                          {
                            key: "editor",
                            label: "设为编辑者",
                            disabled: c.role === "editor",
                            onClick: () => handleChangeRole(c.user_id, "editor")
                          },
                          {
                            key: "viewer",
                            label: "设为查看者",
                            disabled: c.role === "viewer",
                            onClick: () => handleChangeRole(c.user_id, "viewer")
                          },
                          { type: "divider" as const },
                          {
                            key: "remove",
                            label: "移除协作者",
                            danger: true,
                            icon: <Trash2 size={12} />,
                            onClick: () => handleRemove(c.user_id, c.username || "该用户")
                          }
                        ]
                      }}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<MoreHorizontal size={14} />}
                        style={{ borderRadius: 4, height: 24, width: 24, padding: 0, color: "rgba(0,0,0,0.45)" }}
                      />
                    </Dropdown>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 邀请 Modal */}
      <Modal
        title="邀请协作者"
        open={inviteModalOpen}
        onOk={handleSendInvite}
        onCancel={() => setInviteModalOpen(false)}
        okText="发送邀请"
        okButtonProps={{ style: { borderRadius: 6, height: 36, padding: "0 16px" } }}
        cancelButtonProps={{ style: { borderRadius: 6, height: 36, padding: "0 16px" } }}
        cancelText="取消"
        confirmLoading={sending}
        destroyOnHidden
        width={480}
      >
        <div className="space-y-4 py-2">
          {/* 用户选择（下拉列表 + 远程搜索） */}
          <div>
            <div className="text-[12px] text-gray-600 dark:text-gray-400 mb-1">
              选择用户（按邮箱、UID 或用户名搜索）
            </div>
            <Select
              showSearch
              placeholder="输入至少 2 个字符搜索用户"
              filterOption={false}
              onSearch={handleSearchChange}
              loading={searching}
              open={selectOpen}
              onDropdownVisibleChange={(open) => setSelectOpen(open)}
              value={selectedUser ? selectedUser.id : undefined}
              onChange={(val, option) => {
                const u = (option as any)?.user as SearchUser | undefined
                if (u) {
                  setSelectedUser(u)
                  setSelectOpen(false)
                }
              }}
              onClear={() => {
                setSelectedUser(null)
                setSearchQuery("")
                setSearchResults([])
              }}
              allowClear
              notFoundContent={
                searching ? (
                  <div className="flex items-center justify-center py-3">
                    <Spin size="small" />
                  </div>
                ) : searchQuery ? (
                  <div className="py-3 text-center text-[12px] text-gray-400">
                    无匹配用户
                  </div>
                ) : (
                  <div className="py-3 text-center text-[12px] text-gray-400">
                    输入至少 2 个字符开始搜索
                  </div>
                )
              }
              options={searchResults.map((u) => ({
                label: (
                  <div className="flex items-center gap-2 py-0.5">
                    <Avatar size={24} src={u.avatar_url || undefined}>
                      {(u.username || "?").slice(0, 1).toUpperCase()}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">
                        {u.username}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {u.email} · {u.uid}
                      </div>
                    </div>
                  </div>
                ),
                value: u.id,
                user: u
              }))}
              optionRender={(option) => option.label as React.ReactNode}
              style={{ width: "100%" }}
            />
            {selectedUser && (
              <div className="mt-2 text-[12px] text-[#1677ff] flex items-center gap-1">
                <span>已选择：</span>
                <span className="font-medium">{selectedUser.username}</span>
                <Button
                  type="text"
                  size="small"
                  icon={<X size={11} />}
                  onClick={() => {
                    setSelectedUser(null)
                    setSearchQuery("")
                    setSearchResults([])
                  }}
                />
              </div>
            )}
          </div>

          {/* 角色 */}
          <div>
            <div className="text-[12px] text-gray-600 dark:text-gray-400 mb-1">
              角色
            </div>
            <Select
              value={inviteRole}
              onChange={(v) => setInviteRole(v)}
              options={ROLE_OPTIONS}
              className="w-full"
            />
            <div className="text-[11px] text-gray-400 mt-1">
              {inviteRole === "admin" && "管理员：可邀请/移除其他协作者，可编辑所有文档"}
              {inviteRole === "editor" && "编辑者：可创建/编辑文档，不能管理协作者"}
              {inviteRole === "viewer" && "查看者：只能查看，不能编辑"}
            </div>
          </div>

          {/* 留言 */}
          <div>
            <div className="text-[12px] text-gray-600 dark:text-gray-400 mb-1">
              邀请留言（可选）
            </div>
            <Input.TextArea
              rows={3}
              maxLength={500}
              placeholder="给被邀请者留个言…"
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
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
