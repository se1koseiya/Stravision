"use client"

import { memo, useCallback, useEffect, useRef, useState } from "react"
import { App, Avatar, Button, Input, Tooltip } from "antd"
import {
  Building2,
  Users as UsersIcon,
  Shield,
  ShieldCheck,
  Crown,
  UserPlus,
  Trash2,
  RefreshCw,
  Mail,
  Network,
  X,
  MessageCircle
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { chatClient } from "@/lib/chat/chat-client"
import type {
  ChatOrganization,
  ChatOrganizationMember,
  ChatUser
} from "@/lib/chat/chat-types"
import { formatChatTime } from "@/lib/chat/chat-types"

interface OrganizationDetailPanelProps {
  org: ChatOrganization | null
  currentUser?: { id: number; role?: string } | null
  onClose?: () => void
  onSwitchToChat?: (friend: ChatUser) => void
  onFriendsUpdated?: () => void
}

const ROLE_LABELS: Record<string, string> = {
  owner: "所有者",
  admin: "管理员",
  member: "成员"
}

function RoleBadge({ role }: { role: string }) {
  const label = ROLE_LABELS[role] || role
  if (role === "owner") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-[#1677ff]" style={{ fontWeight: 500 }}>
        <Crown size={11} strokeWidth={1.75} />
        {label}
      </span>
    )
  }
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-[#1677ff]" style={{ fontWeight: 500 }}>
        <ShieldCheck size={11} strokeWidth={1.75} />
        {label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-[rgba(0,0,0,0.45)]">
      <Shield size={11} strokeWidth={1.75} />
      {label}
    </span>
  )
}

function OrganizationDetailPanelInner({
  org,
  currentUser,
  onClose,
  onSwitchToChat,
  onFriendsUpdated
}: OrganizationDetailPanelProps) {
  const { modal } = App.useApp()
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin"
  const [members, setMembers] = useState<ChatOrganizationMember[]>([])
  const [loading, setLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(false)

  const syncedOrgIdRef = useRef<number | null>(null)

  const fetchMembers = useCallback(async (orgId: number) => {
    setLoading(true)
    const r = await chatClient.getOrganization(orgId)
    setLoading(false)
    if (r.ok && r.members) {
      setMembers(r.members)
    } else if (!r.ok) {
      toast.error(r.error || "获取组织成员失败")
      setMembers([])
    }
  }, [])

  useEffect(() => {
    if (!org?.id) {
      setMembers([])
      syncedOrgIdRef.current = null
      return
    }
    fetchMembers(org.id)
    if (syncedOrgIdRef.current !== org.id) {
      syncedOrgIdRef.current = org.id
      chatClient.syncOrgFriends(org.id).then(r => {
        if (r.ok && r.added && r.added > 0) {
          toast.success(r.message || `已加入 ${r.added} 位成员到通讯录`)
          onFriendsUpdated?.()
        }
      })
    }
  }, [org?.id, fetchMembers, onFriendsUpdated])

  const handleInvite = async () => {
    const email = inviteEmail.trim()
    if (!email) {
      toast.error("请输入邮箱地址")
      return
    }
    if (!org) return
    setInviting(true)
    const r = await chatClient.inviteOrganizationMember(org.id, email, "member")
    setInviting(false)
    if (r.ok) {
      toast.success(r.message || "邀请成功")
      setInviteEmail("")
      fetchMembers(org.id)
      chatClient.syncOrgFriends(org.id).then(() => onFriendsUpdated?.())
    } else {
      toast.error(r.error || "邀请失败")
    }
  }

  const handleRemoveMember = (userId: number, username: string) => {
    if (!org) return
    modal.confirm({
      title: "移除成员",
      content: `确定将 ${username} 从「${org.name}」移除？若该用户不在任何组织中，将同时撤销其大棚操作权限。`,
      okText: "移除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        setRemovingId(userId)
        const r = await chatClient.removeOrganizationMember(org.id, userId)
        setRemovingId(null)
        if (r.ok) {
          toast.success(r.message || "成员已移除")
          fetchMembers(org.id)
        } else {
          toast.error(r.error || "移除失败")
        }
      }
    })
  }

  const handleSync = async () => {
    if (!org) return
    setSyncing(true)
    const r = await chatClient.syncOrganizationMembers(org.id)
    setSyncing(false)
    if (r.ok) {
      toast.success(r.message || "同步完成")
      fetchMembers(org.id)
      chatClient.syncOrgFriends(org.id).then(() => onFriendsUpdated?.())
    } else {
      toast.error(r.error || "同步失败")
    }
  }

  const handleMemberClick = (member: ChatOrganizationMember) => {
    if (!member.user) return
    if (member.user_id === currentUser?.id) {
      toast.info("不能给自己发消息")
      return
    }
    onSwitchToChat?.(member.user)
    onClose?.()
  }

  if (!org) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center text-[14px] text-[rgba(0,0,0,0.3)]">
        选择一个组织查看详情
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* 顶栏 */}
      <div className="h-14 shrink-0 flex items-center justify-between px-6">
        <span className="text-[15px] text-[rgba(0,0,0,0.88)]" style={{ fontWeight: 500 }}>
          组织详情
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="size-7 flex items-center justify-center rounded-full hover:bg-black/[0.04] text-[rgba(0,0,0,0.45)]"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* 滚动区 */}
      <div className="flex-1 min-h-0 overflow-y-auto" data-lenis-prevent>
        <div className="px-8 pb-8">
          {/* 头部：头像 + 名称 + 统计 */}
          <div className="flex items-start gap-5 pt-2 pb-6">
            <div className="size-[72px] rounded-2xl bg-[#f0f5ff] flex items-center justify-center text-[#2f54eb] shrink-0 ring-1 ring-black/[0.04]">
              <Building2 size={32} strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-[20px] text-[rgba(0,0,0,0.88)] leading-tight truncate" style={{ fontWeight: 500 }}>
                {org.name}
              </h2>
              <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.4)] flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <UsersIcon size={12} strokeWidth={1.75} />
                  {members.length} 位成员
                </span>
                {org.child_count ? (
                  <span className="flex items-center gap-1">
                    <Network size={12} strokeWidth={1.75} />
                    {org.child_count} 个子组织
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          {/* 信息字段（横排两列，减少纵向冗余） */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 pb-6">
            <InfoRow label="组织 ID" value={`#${org.id}`} />
            <InfoRow label="所有者" value={org.owner?.username || "未知"} />
            <InfoRow label="创建时间" value={formatChatTime(org.created_at) || "—"} />
            {org.description && (
              <div className="col-span-2">
                <InfoRow label="描述" value={org.description} multiline />
              </div>
            )}
          </div>

          {/* 管理员操作区 */}
          {isAdmin && (
            <div className="pb-6 flex gap-2">
              <Button
                className="!rounded-lg !shadow-none !h-9"
                icon={<RefreshCw size={14} strokeWidth={1.75} className={syncing ? "animate-spin" : ""} />}
                loading={syncing}
                onClick={handleSync}
              >
                同步大棚成员
              </Button>
            </div>
          )}

          {/* 邀请成员（管理员） */}
          {isAdmin && (
            <div className="pb-6">
              <div className="flex items-center gap-2 mb-2">
                <Mail size={13} strokeWidth={1.75} className="text-[rgba(0,0,0,0.45)]" />
                <span className="text-[13px] text-[rgba(0,0,0,0.65)]" style={{ fontWeight: 500 }}>
                  邀请成员
                </span>
                <span className="text-[11px] text-[rgba(0,0,0,0.35)]">
                  · 自动加入大棚与通讯录
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="输入邮箱地址"
                  prefix={<Mail size={14} strokeWidth={1.75} className="text-[rgba(0,0,0,0.3)]" />}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onPressEnter={handleInvite}
                  className="!rounded-lg flex-1"
                />
                <Button
                  type="primary"
                  className="!rounded-lg !shadow-none"
                  loading={inviting}
                  icon={<UserPlus size={14} strokeWidth={1.75} />}
                  onClick={handleInvite}
                >
                  邀请
                </Button>
              </div>
            </div>
          )}

          {/* 成员列表 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] text-[rgba(0,0,0,0.65)]" style={{ fontWeight: 500 }}>
                成员列表
              </span>
              <span className="text-[11px] text-[rgba(0,0,0,0.35)]">
                共 {members.length} 人 · 点击发消息
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-[12px] text-[rgba(0,0,0,0.35)]">
                加载中...
              </div>
            ) : members.length === 0 ? (
              <div className="py-8 flex flex-col items-center text-[12px] text-[rgba(0,0,0,0.35)]">
                <Network size={28} strokeWidth={1.5} className="mb-2 opacity-40" />
                <span>暂无成员</span>
                {isAdmin && (
                  <span className="text-[11px] text-[rgba(0,0,0,0.3)] mt-1">
                    邀请成员或同步大棚成员
                  </span>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {members.map(m => {
                  const user = m.user
                  const username = user?.username || `用户${m.user_id}`
                  const avatarUrl = user?.avatar_url || null
                  const isOwner = m.role === "owner"
                  const isSelf = m.user_id === currentUser?.id
                  const canRemove =
                    isAdmin &&
                    !isOwner &&
                    !isSelf &&
                    user?.role !== "super_admin"

                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "group flex items-center gap-3 px-2 py-2 rounded-md transition-colors",
                        isSelf
                          ? "cursor-default"
                          : "cursor-pointer hover:bg-black/[0.03]"
                      )}
                      onClick={() => !isSelf && handleMemberClick(m)}
                    >
                      <Avatar
                        size={40}
                        src={avatarUrl || undefined}
                        className="shrink-0 ring-1 ring-black/[0.04]"
                        style={{ backgroundColor: "#e6f4ff", color: "#1677ff", fontWeight: 500 }}
                      >
                        {username[0]?.toUpperCase()}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] text-[rgba(0,0,0,0.88)] truncate" style={{ fontWeight: 500 }}>
                            {username}
                            {isSelf && (
                              <span className="text-[11px] text-[rgba(0,0,0,0.35)] ml-1">（我）</span>
                            )}
                          </span>
                          <RoleBadge role={m.role} />
                        </div>
                        {user?.email && (
                          <div className="text-[12px] text-[rgba(0,0,0,0.4)] truncate">
                            {user.email}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!isSelf && (
                          <Tooltip title="发消息">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMemberClick(m)
                              }}
                              className="size-7 flex items-center justify-center rounded-full text-[rgba(0,0,0,0.45)] hover:text-[#1677ff] hover:bg-[#e6f4ff] transition-colors"
                            >
                              <MessageCircle size={14} strokeWidth={1.75} />
                            </button>
                          </Tooltip>
                        )}
                        {canRemove && (
                          <Tooltip title="移除成员">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveMember(m.user_id, username)
                              }}
                              disabled={removingId === m.user_id}
                              className="size-7 flex items-center justify-center rounded-full text-[rgba(0,0,0,0.45)] hover:text-[#ff4d4f] hover:bg-[#fff1f0] opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                            >
                              <Trash2 size={13} strokeWidth={1.75} />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] text-[rgba(0,0,0,0.45)]">{label}</span>
      <span className={cn(
        "text-[15px] text-[rgba(0,0,0,0.88)]",
        multiline ? "whitespace-pre-wrap break-words" : ""
      )}>
        {value}
      </span>
    </div>
  )
}

export const OrganizationDetailPanel = memo(OrganizationDetailPanelInner)
