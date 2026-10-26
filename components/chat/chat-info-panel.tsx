"use client"

import { memo } from "react"
import { Avatar, Button, Dropdown, Tooltip } from "antd"
import { cn } from "@/lib/utils"
import type { ChatGroup, ChatGroupMember, ChatTarget, ChatUser } from "@/lib/chat/chat-types"
import { IconCloseRemind, IconComments, IconCrown, IconDelete, IconDown, IconLogout, IconMore, IconPeopleDelete, IconSearch, IconShield, IconVolumeMute, IconVolumeNotice } from "@/components/icon";

interface ChatInfoPanelProps {
  target: ChatTarget | null
  currentUser: ChatUser | null
  groupMembers: ChatGroupMember[]
  onSwitchToChat?: (friend: ChatUser) => void
  onToggleBlock: (userId: number, block: boolean) => void
  onClearHistory: () => void
  onDisbandGroup: (groupId: number) => void
  onLeaveGroup: (groupId: number) => void
  onToggleMute: (groupId: number, userId: number, mute: boolean) => void
  onKickMember: (groupId: number, userId: number) => void
  onClose?: () => void
}

const ICON_STROKE = 1.75

/**
 * 右侧详情面板（蓝聊设计稿严格复刻 - 图1/图3）
 *
 * 视觉结构（图3）：
 * - 白色背景，宽度固定 280px
 * - 顶部 56px 与聊天顶栏齐平：右侧头像+下拉箭头
 * - 三点菜单 "..." 右对齐
 * - 大头像居中（80px）、名字居中、签名灰色居中
 * - 细分隔线
 * - 信息字段：标签灰色在上，值黑色在下，左对齐
 * - 底部蓝色渐变"发消息"按钮（仅联系人模式/非当前聊天时显示）
 */
function ChatInfoPanelInner({
  target,
  currentUser,
  groupMembers,
  onSwitchToChat,
  onToggleBlock,
  onClearHistory,
  onDisbandGroup,
  onLeaveGroup,
  onToggleMute,
  onKickMember,
  onClose
}: ChatInfoPanelProps) {
  if (!target) {
    return (
      <div className="w-full h-full bg-br-surface flex items-center justify-center text-[13px] text-br-text-3">
        选择一个联系人开始聊天
      </div>
    )
  }

  const isDirect = target.kind === "direct"
  const friend = isDirect ? target.friend : null
  const group = !isDirect ? target.group : null

  const avatarUrl = isDirect ? friend?.avatar_url : group?.avatar_url
  const displayName = isDirect ? friend?.username : group?.name
  /* 副标题：私聊显示邮箱（唯一稳定有值的身份信息），群聊显示成员数。
     原来显示朋友的 signature，但那个字段后端从来没有返回过。 */
  const subtitle = isDirect ? (friend?.email || "好友") : `${groupMembers.length} 位成员`

  const avatarBg = isDirect ? "var(--br-brand-soft)" : "var(--br-surface-3)"
  const avatarTextColor = isDirect ? "var(--br-brand-ink)" : "var(--br-text-2)"

  // 三点菜单
  const moreMenuItems = isDirect && friend
    ? [
        { key: "search", label: "查找聊天记录", icon: <IconSearch size={14} strokeWidth={ICON_STROKE} /> },
        { key: "mute", label: "消息免打扰", icon: <IconCloseRemind size={14} strokeWidth={ICON_STROKE} /> },
        friend.is_blocked
          ? { key: "unblock", label: "解除拉黑", icon: <IconShield size={14} strokeWidth={ICON_STROKE} />, onClick: () => onToggleBlock(friend.id, false) }
          : { key: "block", label: "拉黑好友", icon: <IconPeopleDelete size={14} strokeWidth={ICON_STROKE} />, onClick: () => onToggleBlock(friend.id, true) },
        { type: "divider" as const },
        { key: "clear", label: "清空聊天记录", icon: <IconDelete size={14} strokeWidth={ICON_STROKE} />, danger: true, onClick: onClearHistory }
      ]
    : group
      ? [
          { key: "search", label: "查找聊天记录", icon: <IconSearch size={14} strokeWidth={ICON_STROKE} /> },
          { key: "mute", label: "消息免打扰", icon: <IconCloseRemind size={14} strokeWidth={ICON_STROKE} /> },
          { type: "divider" as const },
          { key: "clear", label: "清空聊天记录", icon: <IconDelete size={14} strokeWidth={ICON_STROKE} />, danger: true, onClick: onClearHistory },
          { key: "leave", label: "退出群聊", icon: <IconLogout size={14} strokeWidth={ICON_STROKE} />, danger: true, onClick: () => onLeaveGroup(group.id) }
        ]
      : []

  return (
    <div className="w-full h-full bg-br-surface flex flex-col">
      {/* 顶栏 56px：仅在消息模式侧滑面板（有onClose）时显示，与聊天顶栏齐平 */}
      {onClose && (
        <div className="h-14 shrink-0 flex items-center justify-between px-5">
          <span className="text-[14px] font-medium text-br-text-1">详情</span>
          <div className="flex items-center gap-2">
            {isDirect && friend && (
              <Dropdown menu={{ items: moreMenuItems }} trigger={["click"]} placement="bottomRight">
                <button className="flex items-center gap-1 p-0.5 rounded-full hover:bg-br-surface-3 transition-colors">
                  <Avatar
                    size={36}
                    src={avatarUrl || undefined}
                    className="shrink-0"
                    style={{ backgroundColor: avatarBg, color: avatarTextColor, fontWeight: 500 }}
                  >
                    {displayName?.[0]?.toUpperCase()}
                  </Avatar>
                  <IconDown size={14} strokeWidth={ICON_STROKE} className="text-br-text-3" />
                </button>
              </Dropdown>
            )}
            {!isDirect && group && (
              <Dropdown menu={{ items: moreMenuItems }} trigger={["click"]} placement="bottomRight">
                <button className="flex items-center gap-1 p-0.5 rounded-full hover:bg-br-surface-3 transition-colors">
                  <Avatar
                    size={36}
                    src={avatarUrl || undefined}
                    className="shrink-0"
                    style={{ backgroundColor: avatarBg, color: avatarTextColor, fontWeight: 500 }}
                  >
                    {displayName?.[0]?.toUpperCase()}
                  </Avatar>
                  <IconDown size={14} strokeWidth={ICON_STROKE} className="text-br-text-3" />
                </button>
              </Dropdown>
            )}
          </div>
        </div>
      )}

      {/* 内容区（可滚动） */}
      <div className="flex-1 min-h-0 overflow-y-auto" data-lenis-prevent>
        {/* 三点菜单（右对齐） - 通讯录模式时顶部更宽间距 */}
        <div className={cn("flex justify-end px-4 pb-1", onClose ? "pt-3" : "pt-5")}>
          <Tooltip title="更多">
            <button className="size-9 flex items-center justify-center rounded-full text-br-text-3 hover:text-br-text-1 hover:bg-br-surface-3 transition-colors">
              <IconMore size={20} strokeWidth={ICON_STROKE} />
            </button>
          </Tooltip>
        </div>

        {/* 头像 + 名字 + 副标题 */}
        <div className="flex flex-col items-center px-6 pb-5">
          <Avatar
            size={90}
            src={avatarUrl || undefined}
            className="shrink-0"
            style={{ backgroundColor: avatarBg, color: avatarTextColor, fontWeight: 500 }}
          >
            {displayName?.[0]?.toUpperCase()}
          </Avatar>
          <h3
            className="mt-4 text-[20px] text-br-text-1 leading-none"
            style={{ fontWeight: 500 }}
          >
            {displayName}
          </h3>
          <p className="mt-2 text-[14px] text-br-text-3 text-center leading-snug">
            {subtitle}
          </p>
        </div>

        <div className="h-5" />

        {/* 信息字段（标签在上，值在下，左对齐 - 图3风格）
            ⚠️ 2026-10-22：这里原来还读 phone / birthday / region / signature，
               但这四个字段 users 表里根本不存在 —— 类型检查一直报错、界面永远空白。
               现在只展示真实有值的三项：邮箱 / UID / 身份。 */}
        {isDirect && friend && (
          <div className="px-6 py-4 space-y-4">
            {friend.email && <InfoRow label="邮箱" value={friend.email} />}
            {friend.uid && <InfoRow label="UID" value={friend.uid} />}
            <InfoRow label="身份" value={roleLabel(friend.role)} />
          </div>
        )}

        {!isDirect && group && (
          <GroupMembersPanel
            group={group}
            currentUser={currentUser}
            members={groupMembers}
            onToggleMute={onToggleMute}
            onKickMember={onKickMember}
          />
        )}

        {/* 发消息按钮（通讯录模式显示，聊天模式时点击跳转） */}
        {isDirect && friend && onSwitchToChat && (
          <div className="px-6 pt-4 pb-6 flex justify-center">
            <Button
              type="primary"
              size="large"
              className="!h-11 !w-[220px] !rounded-lg !font-medium !border-0 !shadow-br-sm !bg-br-brand hover:!bg-br-brand-hover"
              icon={<IconComments size={16} strokeWidth={ICON_STROKE} />}
              onClick={() => {
                onSwitchToChat(friend)
                onClose?.()
              }}
            >
              发消息
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ========== 信息行（图3风格：标签灰在上，值黑在下） ========== */

/** 账号身份的中文展示（users.role 的取值是英文枚举） */
const ROLE_LABELS: Record<string, string> = {
  super_admin: "超级管理员",
  admin: "管理员",
  user: "普通用户",
  guest: "访客",
}
function roleLabel(role?: string) {
  if (!role) return "普通用户"
  return ROLE_LABELS[role] || role
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[14px] text-br-text-3">{label}</span>
      <span className="text-[18px] text-br-text-1">{value}</span>
    </div>
  )
}

/* ========== 群组成员面板 ========== */

function GroupMembersPanel({
  group, currentUser, members, onToggleMute, onKickMember
}: {
  group: ChatGroup
  currentUser: ChatUser | null
  members: ChatGroupMember[]
  onToggleMute: (gid: number, uid: number, mute: boolean) => void
  onKickMember: (gid: number, uid: number) => void
}) {
  const isSystemAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin"
  const myRecord = members.find(m => m.user_id === currentUser?.id)
  const canManage = isSystemAdmin || myRecord?.role === "owner" || myRecord?.role === "admin"

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-[13px] text-br-text-2" style={{ fontWeight: 500 }}>
          群成员
        </span>
        <span className="text-[12px] text-br-text-3">{members.length}</span>
      </div>
      <div className="max-h-[200px] overflow-y-auto space-y-0.5" data-lenis-prevent>
        {members.map(m => {
          const isMe = m.user_id === currentUser?.id
          const targetIsAdmin = m.user.role === "admin" || m.user.role === "super_admin"
          const canAct = canManage && !isMe && !targetIsAdmin
          return (
            <div
              key={m.user_id}
              className="group/member flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-br-surface-3"
            >
              <Avatar
                size={32}
                src={m.user.avatar_url || undefined}
                style={{ backgroundColor: "var(--br-brand-soft)", color: "var(--br-brand-ink)" }}
              >
                {m.user.username[0]?.toUpperCase()}
              </Avatar>
              <span className="flex-1 text-[14px] text-br-text-1 truncate" style={{ fontWeight: 400 }}>
                {m.user.username}
                {m.role === "owner" && <IconCrown size={12} className="inline ml-1 text-br-text-2" />}
              </span>
              <div className="flex gap-0.5 opacity-0 group-hover/member:opacity-100 transition-opacity">
                {canAct && (
                  <>
                    <Tooltip title={m.is_muted ? "解除禁言" : "禁言"}>
                      <button
                        onClick={() => onToggleMute(group.id, m.user_id, !m.is_muted)}
                        className={cn("size-7 rounded-full flex items-center justify-center hover:bg-br-surface-4",
                          m.is_muted ? "text-red-500" : "text-br-text-3"
                        )}
                      >
                        {m.is_muted
                          ? <IconVolumeMute size={14} strokeWidth={ICON_STROKE} />
                          : <IconVolumeNotice size={14} strokeWidth={ICON_STROKE} />}
                      </button>
                    </Tooltip>
                    <Tooltip title="移出群组">
                      <button
                        onClick={() => onKickMember(group.id, m.user_id)}
                        className="size-7 rounded-full flex items-center justify-center text-br-text-3 hover:text-red-500 hover:bg-br-surface-4"
                      >
                        <IconLogout size={14} strokeWidth={ICON_STROKE} />
                      </button>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const ChatInfoPanel = memo(ChatInfoPanelInner)
