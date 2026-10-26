"use client"

import { memo, useMemo, useState } from "react"
import { Avatar, Badge, Button, Input, Tooltip } from "antd"
import { cn } from "@/lib/utils"
import type { ChatFriendRequest, ChatGroup, ChatMessage, ChatOrganization, ChatUser } from "@/lib/chat/chat-types"
import { formatChatTime } from "@/lib/chat/chat-types"
import { OrganizationTree } from "./organization-tree"
import { IconAddUser, IconCheck, IconComments, IconGridFour, IconNetworkTree, IconPlus, IconSearch, IconUser } from "@/components/icon";

interface ChatSidebarProps {
  searchQuery: string
  setSearchQuery: (s: string) => void

  friends: ChatUser[]
  groups: ChatGroup[]
  requests: ChatFriendRequest[]

  activeFriendId: number | null
  activeGroupId: number | null
  onSwitchFriend: (friend: ChatUser) => void
  onSwitchGroup: (group: ChatGroup) => void
  onRespondRequest: (requestId: number, action: "accept" | "reject") => void

  onOpenAddFriend: () => void
  onOpenCreateGroup: () => void

  // 外部控制 primaryTab（通讯录/消息模式切换）
  primaryTab: "messages" | "contacts"
  setPrimaryTab: (t: "messages" | "contacts") => void
  // 通讯录选中的联系人（用于详情面板联动）
  selectedContactId: number | null
  onSelectContact: (friend: ChatUser | null) => void
  // 组织架构选中的组织 id（用于右侧详情面板联动）
  selectedOrgId?: number | null
  onSelectOrg?: (org: ChatOrganization | null) => void
  // 当前用户角色（用于 admin 按钮显隐）
  currentUserRole?: string
}

/** 通讯录下的二级 Tab */
type ContactSubTab = "all" | "requests" | "groups" | "org"

const ICON_STROKE = 1.75

/**
 * 左侧栏（蓝聊设计稿严格复刻）
 *
 * 结构：
 * 1. 最左 64px：Logo + 一级导航（消息 / 通讯录）+ 底部「应用」
 * 2. 消息 Tab：280px 会话列表
 * 3. 通讯录 Tab：180px 二级菜单 + 260px 联系人/群聊列表
 */
function ChatSidebarInner(props: ChatSidebarProps) {
  const {
    searchQuery,
    setSearchQuery,
    friends,
    groups,
    requests,
    activeFriendId,
    activeGroupId,
    onSwitchFriend,
    onSwitchGroup,
    onRespondRequest,
    onOpenAddFriend,
    onOpenCreateGroup,
    primaryTab,
    setPrimaryTab,
    selectedContactId,
    onSelectContact,
    selectedOrgId,
    onSelectOrg,
    currentUserRole
  } = props

  const [contactSubTab, setContactSubTab] = useState<ContactSubTab>("all")

  const filteredFriends = useMemo(() =>
    friends.filter(f =>
      f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [friends, searchQuery]
  )

  const filteredGroups = useMemo(() =>
    groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [groups, searchQuery]
  )

  // 总未读数（用于一级 Tab 红点）
  const totalUnread = useMemo(() => {
    const f = friends.reduce((s, x) => s + (x.unread_count || 0), 0)
    const g = groups.reduce((s, x) => s + (x.unread_count || 0), 0)
    const r = requests.length
    return f + g + r
  }, [friends, groups, requests])

  // 点击联系人列表项（通讯录模式）
  const handleContactClick = (friend: ChatUser) => {
    onSelectContact(friend)
  }

  return (
    <div className="flex h-full bg-br-canvas">
      {/* ========== 最左 64px 一级导航 ========== */}
      <div className="w-16 shrink-0 flex flex-col items-center py-4">
        {/* Logo：蓝色聊天气泡 */}
        <div className="shrink-0 mb-5">
          <LogoIcon />
        </div>

        {/* 一级导航图标 */}
        <div className="flex flex-col items-center gap-1">
          <NavIconButton
            active={primaryTab === "messages"}
            onClick={() => {
              setPrimaryTab("messages")
              onSelectContact(null)
            }}
            badge={totalUnread > 0 ? totalUnread : undefined}
            label="消息"
          >
            <IconComments size={22} strokeWidth={2} />
          </NavIconButton>

          <NavIconButton
            active={primaryTab === "contacts"}
            onClick={() => {
              setPrimaryTab("contacts")
              setContactSubTab("all")
            }}
            label="通讯录"
          >
            <IconUser size={22} strokeWidth={2} />
          </NavIconButton>
        </div>

        {/* 底部：应用/更多 */}
        <div className="mt-auto">
          <NavIconButton onClick={() => {}} label="应用">
            <IconGridFour size={22} strokeWidth={2} />
          </NavIconButton>
        </div>
      </div>

      {/* ========== 中间内容区 ========== */}
      {primaryTab === "messages" ? (
        /* 消息 Tab：280px 会话列表 */
        <div className="w-[280px] shrink-0 flex flex-col border-r border-br-line">
          {/* 搜索框 */}
          <div className="shrink-0 px-3 pt-3 pb-2">
            <Input
              prefix={<IconSearch size={14} strokeWidth={2} className="text-br-text-3" />}
              placeholder="搜索"
              size="middle"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="!rounded-lg !bg-br-surface-3 !border-0 hover:!bg-br-surface-4"
              allowClear
            />
          </div>
          {/* 会话列表 */}
          <div className="flex-1 min-h-0 overflow-y-auto" data-lenis-prevent>
            <MessagesListContent
              friends={filteredFriends}
              groups={filteredGroups}
              activeFriendId={activeFriendId}
              activeGroupId={activeGroupId}
              onSwitchFriend={onSwitchFriend}
              onSwitchGroup={onSwitchGroup}
            />
          </div>
        </div>
      ) : (
        /* 通讯录 Tab：180px 二级菜单 + 260px 列表 */
        <>
          {/* 二级菜单列 */}
          <div className="w-[180px] shrink-0 flex flex-col">
            {/* 搜索框 */}
            <div className="shrink-0 px-3 pt-3 pb-2">
              <Input
                prefix={<IconSearch size={14} strokeWidth={2} className="text-br-text-3" />}
                placeholder="搜索"
                size="middle"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="!rounded-lg !bg-br-surface-3 !border-0 hover:!bg-br-surface-4"
                allowClear
              />
            </div>
            {/* 二级菜单项 */}
            <div className="flex-1 min-h-0 overflow-y-auto pt-0.5" data-lenis-prevent>
              <SubMenuItem
                active={contactSubTab === "all"}
                onClick={() => {
                  setContactSubTab("all")
                  onSelectOrg?.(null)
                }}
                color="var(--br-brand)"
                icon={<IconUser size={18} strokeWidth={2} />}
                label="联系人"
              />
              <SubMenuItem
                active={contactSubTab === "requests"}
                onClick={() => {
                  setContactSubTab("requests")
                  onSelectOrg?.(null)
                }}
                color="var(--br-brand)"
                icon={<IconAddUser size={18} strokeWidth={2} />}
                label="新朋友"
                badge={requests.length || undefined}
              />
              <SubMenuItem
                active={contactSubTab === "groups"}
                onClick={() => {
                  setContactSubTab("groups")
                  onSelectOrg?.(null)
                }}
                color="var(--br-text-2)"
                icon={<IconComments size={18} strokeWidth={2} />}
                label="群聊"
              />
              <SubMenuItem
                active={contactSubTab === "org"}
                onClick={() => {
                  setContactSubTab("org")
                  onSelectContact(null)
                }}
                color="var(--br-brand)"
                icon={<IconNetworkTree size={18} strokeWidth={2} />}
                label="组织架构"
              />
            </div>
          </div>

          {/* 列表列 260px */}
          <div className="w-[260px] shrink-0 flex flex-col border-r border-br-line">
            {/* 顶部：添加好友按钮（仅在联系人Tab） */}
            {contactSubTab === "all" && (
              <div className="shrink-0 px-3 pt-3 pb-2">
                <Button
                  block
                  size="middle"
                  className="!rounded-lg !text-br-brand-ink !border-0 !bg-br-brand-soft hover:!bg-br-brand-soft !font-normal !shadow-none"
                  onClick={onOpenAddFriend}
                >
                  添加好友
                </Button>
              </div>
            )}
            {contactSubTab === "groups" && (
              <div className="shrink-0 h-3" />
            )}
            {/* 列表内容 */}
            <div className="flex-1 min-h-0 overflow-y-auto" data-lenis-prevent>
              {contactSubTab === "all" && (
                <ContactsList
                  friends={filteredFriends}
                  selectedContactId={selectedContactId}
                  onSelectContact={handleContactClick}
                />
              )}
              {contactSubTab === "requests" && (
                <RequestsList requests={requests} onRespond={onRespondRequest} />
              )}
              {contactSubTab === "groups" && (
                <GroupsList
                  groups={groups}
                  onSwitchGroup={(g) => {
                    onSwitchGroup(g)
                    onSelectContact(null)
                  }}
                  onCreateGroup={onOpenCreateGroup}
                />
              )}
              {contactSubTab === "org" && (
                <OrganizationTree
                  selectedOrgId={selectedOrgId}
                  onSelectOrg={onSelectOrg}
                  currentUserRole={currentUserRole}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ============== Logo ============== */

function LogoIcon() {
  return (
    <div className="size-10 rounded-2xl bg-br-brand flex items-center justify-center shadow-br-sm">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 3C6.48 3 2 6.86 2 11.5c0 2.52 1.36 4.78 3.5 6.3V21l3.5-2.1c.96.26 1.97.4 3 .4 5.52 0 10-3.86 10-8.5S17.52 3 12 3z"
          fill="white"
        />
        <circle cx="8.5" cy="10.5" r="1" fill="var(--br-brand)" />
        <circle cx="12" cy="10.5" r="1" fill="var(--br-brand)" />
        <circle cx="15.5" cy="10.5" r="1" fill="var(--br-brand)" />
      </svg>
    </div>
  )
}

/* ============== 一级导航图标按钮 ============== */

function NavIconButton({
  active,
  onClick,
  children,
  badge,
  label
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  badge?: number
  label: string
}) {
  return (
    <Tooltip title={label} placement="right">
      <button
        onClick={onClick}
        className={cn(
          "relative size-11 flex items-center justify-center rounded-xl transition-colors",
          active
            ? "text-br-brand-ink"
            : "text-br-text-3 hover:text-br-text-1 hover:bg-br-surface-3"
        )}
      >
        {children}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-br-danger text-[11px] text-white flex items-center justify-center" style={{ fontWeight: 500, lineHeight: 1 }}>
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>
    </Tooltip>
  )
}

/* ============== 消息 Tab 内容 ============== */

function MessagesListContent({
  friends, groups, activeFriendId, activeGroupId, onSwitchFriend, onSwitchGroup
}: {
  friends: ChatUser[]
  groups: ChatGroup[]
  activeFriendId: number | null
  activeGroupId: number | null
  onSwitchFriend: (f: ChatUser) => void
  onSwitchGroup: (g: ChatGroup) => void
}) {
  const hasGroups = groups.length > 0
  const hasFriends = friends.length > 0

  if (!hasGroups && !hasFriends) {
    return <EmptyHint text="暂无会话" />
  }

  return (
    <div className="py-1">
      {hasGroups && groups.map(g => (
        <ConversationRow
          key={`g-${g.id}`}
          name={g.name}
          avatarUrl={g.avatar_url}
          lastMessage={g.last_message}
          unreadCount={g.unread_count}
          isActive={activeGroupId === g.id}
          avatarColor="var(--br-surface-3)"
          avatarTextColor="var(--br-text-2)"
          onClick={() => onSwitchGroup(g)}
        />
      ))}
      {hasFriends && friends.map(f => (
        <ConversationRow
          key={`f-${f.id}`}
          name={f.username}
          avatarUrl={f.avatar_url}
          lastMessage={f.last_message}
          unreadCount={f.unread_count}
          isActive={activeFriendId === f.id}
          avatarColor="var(--br-brand-soft)"
          avatarTextColor="var(--br-brand-ink)"
          onClick={() => onSwitchFriend(f)}
        />
      ))}
    </div>
  )
}

/* ============== 二级菜单项 ============== */

function SubMenuItem({
  active, onClick, color, icon, label, badge
}: {
  active: boolean
  onClick: () => void
  color: string
  icon: React.ReactNode
  label: string
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 transition-colors",
        active ? "bg-br-surface-3" : "hover:bg-br-surface-3"
      )}
    >
      <span
        className="size-9 rounded-full flex items-center justify-center text-white shrink-0"
        style={{ backgroundColor: color }}
      >
        {icon}
      </span>
      <span
        className={cn(
          "text-[14px] flex-1 text-left",
          active
            ? "text-br-text-1"
            : "text-br-text-1"
        )}
        style={{ fontWeight: active ? 500 : 400 }}
      >
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-br-danger text-[11px] text-white flex items-center justify-center" style={{ fontWeight: 500 }}>
          {badge}
        </span>
      )}
    </button>
  )
}

/* ============== 会话/联系人 行 ============== */

function ConversationRow({
  name, avatarUrl, lastMessage, unreadCount, isActive, avatarColor, avatarTextColor, onClick
}: {
  name: string
  avatarUrl: string | null
  lastMessage?: ChatMessage
  unreadCount?: number
  isActive: boolean
  avatarColor: string
  avatarTextColor: string
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
        isActive
          ? "bg-br-brand-soft"
          : "hover:bg-br-surface-3"
      )}
    >
      <Badge
        count={unreadCount && unreadCount > 0 ? unreadCount : 0}
        size="small"
        color="var(--br-danger)"
        offset={[-4, 4]}
        className="shrink-0"
      >
        <Avatar
          size={40}
          src={avatarUrl || undefined}
          className="shrink-0"
          style={{ backgroundColor: avatarColor, color: avatarTextColor, fontWeight: 500 }}
        >
          {name[0]?.toUpperCase()}
        </Avatar>
      </Badge>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex justify-between items-baseline gap-2">
          <span
            className={cn(
              "text-[14px] truncate",
              "text-br-text-1"
            )}
            style={{ fontWeight: 500 }}
          >
            {name}
          </span>
          <span className="text-[11px] text-br-text-3 shrink-0 leading-none">
            {lastMessage ? formatChatTime(lastMessage.created_at) : ""}
          </span>
        </div>
        <div className="text-[12px] text-br-text-3 truncate mt-0.5 leading-snug">
          {lastMessage?.content || ""}
        </div>
      </div>
    </div>
  )
}

/* ============== 联系人列表（字母分组） ============== */

function ContactsList({
  friends, selectedContactId, onSelectContact
}: {
  friends: ChatUser[]
  selectedContactId: number | null
  onSelectContact: (f: ChatUser) => void
}) {
  if (friends.length === 0) return <EmptyHint text="暂无联系人" />

  const grouped = useMemo(() => {
    const map = new Map<string, ChatUser[]>()
    friends.forEach(f => {
      const ch = f.username[0]?.toUpperCase() || "#"
      const key = /[A-Z]/.test(ch) ? ch : "#"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(f)
    })
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [friends])

  return (
    <div>
      {grouped.map(([letter, list]) => (
        <div key={letter}>
          <div className="px-4 pt-3 pb-1 text-[12px] text-br-text-3">
            {letter}
          </div>
          {list.map(f => (
            <div
              key={f.id}
              onClick={() => onSelectContact(f)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
                selectedContactId === f.id
                  ? "bg-br-brand-soft"
                  : "hover:bg-br-surface-3"
              )}
            >
              <Avatar
                size={36}
                src={f.avatar_url || undefined}
                className="shrink-0"
                style={{ backgroundColor: "var(--br-brand-soft)", color: "var(--br-brand-ink)", fontWeight: 500 }}
              >
                {f.username[0]?.toUpperCase()}
              </Avatar>
              <span
                className="text-[14px] text-br-text-1 truncate"
                style={{ fontWeight: 400 }}
              >
                {f.username}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/* ============== 新朋友请求 ============== */

function RequestsList({
  requests, onRespond
}: {
  requests: ChatFriendRequest[]
  onRespond: (id: number, a: "accept" | "reject") => void
}) {
  if (requests.length === 0) return <EmptyHint text="暂无好友请求" />
  return (
    <div className="py-1">
      {requests.map(r => (
        <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
          <Avatar
            size={36}
            src={r.requester.avatar_url || undefined}
            className="shrink-0"
            style={{ backgroundColor: "var(--br-brand-soft)", color: "var(--br-brand-ink)" }}
          >
            {r.requester.username[0]}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] text-br-text-1 truncate" style={{ fontWeight: 500 }}>
              {r.requester.username}
            </div>
            <div className="text-[12px] text-br-text-3 truncate">
              请求添加你为好友
            </div>
          </div>
          <Button
            type="primary"
            size="small"
            shape="circle"
            className="!bg-br-brand !shadow-none"
            icon={<IconCheck size={14} strokeWidth={ICON_STROKE} />}
            onClick={() => onRespond(r.id, "accept")}
          />
        </div>
      ))}
    </div>
  )
}

/* ============== 群聊列表 ============== */

function GroupsList({
  groups, onSwitchGroup, onCreateGroup
}: {
  groups: ChatGroup[]
  onSwitchGroup: (g: ChatGroup) => void
  onCreateGroup: () => void
}) {
  return (
    <div className="py-1">
      {/* 新建群聊入口 */}
      <button
        onClick={onCreateGroup}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-br-surface-3 transition-colors"
      >
        <span className="size-9 rounded-full bg-br-surface-3 flex items-center justify-center text-br-text-3">
          <IconPlus size={18} strokeWidth={ICON_STROKE} />
        </span>
        <span className="text-[14px] text-br-text-2">发起群聊</span>
      </button>

      {groups.length === 0 && <EmptyHint text="暂无群聊" />}
      {groups.map(g => (
        <div
          key={g.id}
          onClick={() => onSwitchGroup(g)}
          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-br-surface-3 transition-colors"
        >
          <Avatar
            size={36}
            src={g.avatar_url || undefined}
            className="shrink-0"
            style={{ backgroundColor: "var(--br-surface-3)", color: "var(--br-text-2)", fontWeight: 500 }}
          >
            {g.name[0]?.toUpperCase()}
          </Avatar>
          <span className="text-[14px] text-br-text-1 truncate" style={{ fontWeight: 400 }}>
            {g.name}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ============== 空提示 ============== */

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center text-[13px] text-br-text-3 py-16">
      {text}
    </div>
  )
}

export const ChatSidebar = memo(ChatSidebarInner)
