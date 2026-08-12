/**
 * 聊天前端共享类型
 *
 * 与 lib/db/chat-service.ts 的接口保持兼容，但去除了 UserPublic 上前端不关心的字段。
 */

export type ChatMessage = {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  type?: string
  file_url?: string | null
  group_id?: number | null
  read_at?: number | null
  created_at: number
}

export type ChatUser = {
  id: number
  uid?: string
  username: string
  email: string
  avatar_url: string | null
  role?: string
  is_blocked?: boolean
  last_message?: ChatMessage
  unread_count?: number
}

export type ChatFriendRequest = {
  id: number
  requester: ChatUser
  status: string
  created_at: number
}

export type ChatGroup = {
  id: number
  name: string
  owner_id: number
  avatar_url: string | null
  created_at: number
  last_message?: ChatMessage
  unread_count?: number
  my_role?: "owner" | "admin" | "member"
}

export type ChatGroupMember = {
  group_id: number
  user_id: number
  role: "owner" | "admin" | "member"
  is_muted: boolean
  user: ChatUser
}

export type ChatTarget =
  | { kind: "direct"; friend: ChatUser }
  | { kind: "group"; group: ChatGroup }

export type ChatOrganization = {
  id: number
  name: string
  parent_id: number | null
  owner_id: number
  description: string | null
  created_at: number
  updated_at: number
  member_count?: number
  child_count?: number
  owner?: { id: number; username: string; avatar_url: string | null } | null
}

export type ChatOrganizationMember = {
  id: number
  org_id: number
  user_id: number
  role: "owner" | "admin" | "member"
  invited_by: number | null
  joined_at: number
  user?: ChatUser
}

export function targetKey(t: ChatTarget | null): string {
  if (!t) return ""
  return t.kind === "direct" ? `d:${t.friend.id}` : `g:${t.group.id}`
}

/**
 * 从任意 timestamp（秒或毫秒）安全格式化时间。
 */
export function formatChatTime(timestamp: number | undefined | null): string {
  if (!timestamp) return ""
  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return ""
  const date = new Date(ts < 1e12 ? ts * 1000 : ts)
  if (isNaN(date.getTime())) return ""

  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
  return date.toLocaleDateString()
}
