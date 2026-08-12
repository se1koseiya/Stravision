"use client"

import { memo, useMemo, useState } from "react"
import { Avatar, Badge, Button, Input, Tooltip } from "antd"
import {
  MessageCircle,
  UserRound,
  UserPlus,
  Network,
  LayoutGrid,
  Search,
  Plus,
  Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChatFriendRequest, ChatGroup, ChatMessage, ChatOrganization, ChatUser } from "@/lib/chat/chat-types"
import { formatChatTime } from "@/lib/chat/chat-types"
import { OrganizationTree } from "./organization-tree"

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
    <div className="flex h-full bg-white dark:bg-[#1a1a1f]">
      {/* ========== 最左 64px 一级导航 ========== */}
      <div className="w-16 shrink-0 flex flex-col items-center py-4 border-r border-black/[0.04] dark:border-white/[0.04]">
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
            <MessageCircle size={22} strokeWidth={1.75} />
          </NavIconButton>

          <NavIconButton
            active={primaryTab === "contacts"}
            onClick={() => {
              setPrimaryTab("contacts")
              setContactSubTab("all")
            }}
            label="通讯录"
          >
            <UserRound size={22} strokeWidth={1.75} />
          </NavIconButton>
        </div>

        {/* 底部：应用/更多 */}
        <div className="mt-auto">
          <NavIconButton onClick={() => {}} label="应用">
            <LayoutGrid size={22} strokeWidth={1.75} />
          </NavIconButton>
        </div>
      </div>

      {/* ========== 中间内容区 ========== */}
      {primaryTab === "messages" ? (
        /* 消息 Tab：280px 会话列表 */
        <div className="w-[280px] shrink-0 flex flex-col border-r border-black/[0.06] dark:border-white/[0.06]">
          {/* 搜索框 */}
          <div className="shrink-0 px-3 pt-3 pb-2">
            <Input
              prefix={<Search size={14} strokeWidth={1.75} className="text-[rgba(0,0,0,0.3)]" />}
              placeholder="搜索"
              size="middle"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="!rounded-lg !bg-[#f2f3f5] dark:!bg-white/[0.06] !border-0 hover:!bg-[#ececec] dark:hover:!bg-white/[0.08]"
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
          <div className="w-[180px] shrink-0 flex flex-col border-r border-black/[0.06] dark:border-white/[0.06]">
            {/* 搜索框 */}
            <div className="shrink-0 px-3 pt-3 pb-2">
              <Input
                prefix={<Search size={14} strokeWidth={1.75} className="text-[rgba(0,0,0,0.3)]" />}
                placeholder="搜索"
                size="middle"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="!rounded-lg !bg-[#f2f3f5] dark:!bg-white/[0.06] !border-0 hover:!bg-[#ececec] dark:hover:!bg-white/[0.08]"
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
                color="#1677ff"
                icon={<UserRound size={18} strokeWidth={1.75} />}
                label="联系人"
              />
              <SubMenuItem
                active={contactSubTab === "requests"}
                onClick={() => {
                  setContactSubTab("requests")
                  onSelectOrg?.(null)
                }}
                color="#52c41a"
                icon={<UserPlus size={18} strokeWidth={1.75} />}
                label="新朋友"
                badge={requests.length || undefined}
              />
              <SubMenuItem
                active={contactSubTab === "groups"}
                onClick={() => {
                  setContactSubTab("groups")
                  onSelectOrg?.(null)
                }}
                color="#fa8c16"
                icon={<MessageCircle size={18} strokeWidth={1.75} />}
                label="群聊"
              />
              <SubMenuItem
                active={contactSubTab === "org"}
                onClick={() => {
                  setContactSubTab("org")
                  onSelectContact(null)
                }}
                color="#2f54eb"
                icon={<Network size={18} strokeWidth={1.75} />}
                label="组织架构"
              />
            </div>
          </div>

          {/* 列表列 260px */}
          <div className="w-[260px] shrink-0 flex flex-col border-r border-black/[0.06] dark:border-white/[0.06]">
            {/* 顶部：添加好友按钮（仅在联系人Tab） */}
            {contactSubTab === "all" && (
              <div className="shrink-0 px-3 pt-3 pb-2">
                <Button
                  block
                  size="middle"
                  className="!rounded-lg !text-[#1677ff] !border-[#1677ff] !bg-white hover:!bg-[#e6f4ff] !font-normal"
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
    <div className="size-10 rounded-2xl bg-gradient-to-br from-[#1677ff] to-[#4c9cff] flex items-center justify-center shadow-sm">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 3C6.48 3 2 6.86 2 11.5c0 2.52 1.36 4.78 3.5 6.3V21l3.5-2.1c.96.26 1.97.4 3 .4 5.52 0 10-3.86 10-8.5S17.52 3 12 3z"
          fill="white"
        />
        <circle cx="8.5" cy="10.5" r="1" fill="#1677ff" />
        <circle cx="12" cy="10.5" r="1" fill="#1677ff" />
        <circle cx="15.5" cy="10.5" r="1" fill="#1677ff" />
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
            ? "text-[#1677ff]"
            : "text-[rgba(0,0,0,0.45)] dark:text-slate-400 hover:text-[rgba(0,0,0,0.7)] dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
        )}
      >
        {children}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#ff4d4f] text-[10px] text-white flex items-center justify-center" style={{ fontWeight: 500, lineHeight: 1 }}>
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
          avatarColor="#fff7e6"
          avatarTextColor="#fa8c16"
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
          avatarColor="#e6f4ff"
          avatarTextColor="#1677ff"
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
        active ? "bg-black/[0.04] dark:bg-white/[0.06]" : "hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
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
            ? "text-[rgba(0,0,0,0.88)] dark:text-white"
            : "text-[rgba(0,0,0,0.75)] dark:text-slate-200"
        )}
        style={{ fontWeight: active ? 500 : 400 }}
      >
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#ff4d4f] text-[10px] text-white flex items-center justify-center" style={{ fontWeight: 500 }}>
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
          ? "bg-[#f0f2f5] dark:bg-white/[0.06]"
          : "hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
      )}
    >
      <Badge
        count={unreadCount && unreadCount > 0 ? unreadCount : 0}
        size="small"
        color="#ff4d4f"
        offset={[-4, 4]}
        className="shrink-0"
      >
        <Avatar
          size={40}
          src={avatarUrl || undefined}
          className="shrink-0 ring-1 ring-black/[0.04]"
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
              "text-[rgba(0,0,0,0.88)] dark:text-white"
            )}
            style={{ fontWeight: 500 }}
          >
            {name}
          </span>
          <span className="text-[11px] text-[rgba(0,0,0,0.35)] dark:text-slate-500 shrink-0 leading-none">
            {lastMessage ? formatChatTime(lastMessage.created_at) : ""}
          </span>
        </div>
        <div className="text-[12px] text-[rgba(0,0,0,0.4)] dark:text-slate-500 truncate mt-0.5 leading-snug">
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
          <div className="px-4 pt-3 pb-1 text-[12px] text-[rgba(0,0,0,0.35)] dark:text-slate-500">
            {letter}
          </div>
          {list.map(f => (
            <div
              key={f.id}
              onClick={() => onSelectContact(f)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
                selectedContactId === f.id
                  ? "bg-[#f0f2f5] dark:bg-white/[0.06]"
                  : "hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
              )}
            >
              <Avatar
                size={36}
                src={f.avatar_url || undefined}
                className="shrink-0 ring-1 ring-black/[0.04]"
                style={{ backgroundColor: "#e6f4ff", color: "#1677ff", fontWeight: 500 }}
              >
                {f.username[0]?.toUpperCase()}
              </Avatar>
              <span
                className="text-[14px] text-[rgba(0,0,0,0.88)] dark:text-white truncate"
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
            style={{ backgroundColor: "#e6f4ff", color: "#1677ff" }}
          >
            {r.requester.username[0]}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] text-[rgba(0,0,0,0.88)] dark:text-white truncate" style={{ fontWeight: 500 }}>
              {r.requester.username}
            </div>
            <div className="text-[12px] text-[rgba(0,0,0,0.4)] dark:text-slate-500 truncate">
              请求添加你为好友
            </div>
          </div>
          <Button
            type="primary"
            size="small"
            shape="circle"
            className="!bg-[#52c41a] !shadow-none"
            icon={<Check size={14} strokeWidth={ICON_STROKE} />}
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
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
      >
        <span className="size-9 rounded-full bg-[#f2f3f5] dark:bg-white/[0.06] flex items-center justify-center text-[rgba(0,0,0,0.45)]">
          <Plus size={18} strokeWidth={ICON_STROKE} />
        </span>
        <span className="text-[14px] text-[rgba(0,0,0,0.7)] dark:text-slate-300">发起群聊</span>
      </button>

      {groups.length === 0 && <EmptyHint text="暂无群聊" />}
      {groups.map(g => (
        <div
          key={g.id}
          onClick={() => onSwitchGroup(g)}
          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
        >
          <Avatar
            size={36}
            src={g.avatar_url || undefined}
            className="shrink-0 ring-1 ring-black/[0.04]"
            style={{ backgroundColor: "#fff7e6", color: "#fa8c16", fontWeight: 500 }}
          >
            {g.name[0]?.toUpperCase()}
          </Avatar>
          <span className="text-[14px] text-[rgba(0,0,0,0.88)] dark:text-white truncate" style={{ fontWeight: 400 }}>
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
    <div className="flex items-center justify-center text-[13px] text-[rgba(0,0,0,0.3)] dark:text-slate-600 py-16">
      {text}
    </div>
  )
}

export const ChatSidebar = memo(ChatSidebarInner)
