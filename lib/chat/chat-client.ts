/**
 * 聊天 API 客户端（浏览器端）
 *
 * 收口所有 /api/* chat 相关的 fetch 调用，提供类型化的方法。
 * 所有方法都返回 { ok: boolean; data?; error? }，调用方按 ok 分支处理。
 */

import type {
  ChatFriendRequest,
  ChatGroup,
  ChatGroupMember,
  ChatMessage,
  ChatOrganization,
  ChatOrganizationMember,
  ChatUser,
} from "./chat-types"

export type SendMsgPayload = {
  friendId?: number
  groupId?: number
  content: string
  type?: "text" | "image" | "audio" | "video" | "file"
  fileUrl?: string
}

/** 服务端统一错误响应：{ error: string } 或 { message: string } */
type ErrorBody = { error?: string; message?: string }

async function safeJson<T = unknown>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T
  } catch {
    return {} as T
  }
}

function extractError(data: unknown, fallback: string): string | undefined {
  if (typeof data !== "object" || data === null) return fallback
  const err = (data as ErrorBody).error
  const msg = (data as ErrorBody).message
  return err || msg || fallback
}

async function wrap<T>(
  res: Response,
  fallback: T,
  errorMessage = "网络错误"
): Promise<{ ok: boolean; data: T; status: number; error?: string }> {
  const data = await safeJson<T>(res)
  if (res.ok) {
    return { ok: true, data, status: res.status }
  }
  return {
    ok: false,
    data: fallback,
    status: res.status,
    error: extractError(data, errorMessage)
  }
}

export const chatClient = {
  // ===== Friends / Groups / Requests =====

  async listFriends(): Promise<{ ok: boolean; friends?: ChatUser[]; error?: string }> {
    const res = await fetch("/api/friends", { credentials: "include" })
    const r = await wrap<{ friends?: ChatUser[] }>(res, {})
    return { ok: r.ok, friends: r.data.friends, error: r.error }
  },

  async listGroups(): Promise<{ ok: boolean; groups?: ChatGroup[]; error?: string }> {
    const res = await fetch("/api/groups", { credentials: "include" })
    const r = await wrap<{ groups?: ChatGroup[] }>(res, {})
    return { ok: r.ok, groups: r.data.groups, error: r.error }
  },

  async listRequests(): Promise<{ ok: boolean; requests?: ChatFriendRequest[]; error?: string }> {
    const res = await fetch("/api/friends/requests", { credentials: "include" })
    const r = await wrap<{ requests?: ChatFriendRequest[] }>(res, {})
    return { ok: r.ok, requests: r.data.requests, error: r.error }
  },

  async sendFriendRequest(identifier: string): Promise<{ ok: boolean; message?: string; error?: string }> {
    const payload = identifier.includes("@")
      ? { email: identifier }
      : { uid: identifier }
    const res = await fetch("/api/friends/requests", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    const r = await wrap<{ message?: string }>(res, {})
    return { ok: r.ok, message: r.data.message, error: r.error }
  },

  async respondFriendRequest(
    requestId: number,
    action: "accept" | "reject"
  ): Promise<{ ok: boolean; message?: string; error?: string }> {
    const res = await fetch("/api/friends/respond", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action })
    })
    const r = await wrap<{ message?: string }>(res, {})
    return { ok: r.ok, message: r.data.message, error: r.error }
  },

  async createGroup(name: string, memberIds: number[]): Promise<{ ok: boolean; groupId?: number; error?: string }> {
    const res = await fetch("/api/groups", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, members: memberIds })
    })
    const r = await wrap<{ groupId?: number; message?: string }>(res, {})
    return { ok: r.ok, groupId: r.data.groupId, error: r.error }
  },

  async disbandGroup(groupId: number): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE", credentials: "include" })
    const r = await wrap<{ message?: string }>(res, {})
    return { ok: r.ok, error: r.error }
  },

  async listGroupMembers(groupId: number): Promise<{ ok: boolean; members?: ChatGroupMember[]; error?: string }> {
    const res = await fetch(`/api/groups/members?groupId=${groupId}`, { credentials: "include" })
    const r = await wrap<{ members?: ChatGroupMember[] }>(res, {})
    return { ok: r.ok, members: r.data.members, error: r.error }
  },

  async kickMember(groupId: number, userId: number): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/groups/members?groupId=${groupId}&userId=${userId}`, {
      method: "DELETE",
      credentials: "include"
    })
    const r = await wrap<{ message?: string }>(res, {})
    return { ok: r.ok, error: r.error }
  },

  async leaveGroup(groupId: number): Promise<{ ok: boolean; error?: string }> {
    // 复用 removeGroupMember：当 targetUserId === self 时即视为退出
    const me = await this.getCurrentUser()
    if (!me.ok || !me.user) return { ok: false, error: "未登录" }
    return this.kickMember(groupId, me.user.id)
  },

  async toggleMute(groupId: number, userId: number, mute: boolean): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/groups/members", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, userId, action: mute ? "mute" : "unmute" })
    })
    const r = await wrap<{ message?: string }>(res, {})
    return { ok: r.ok, error: r.error }
  },

  // ===== Messages =====

  async listMessages(opts: { friendId?: number; groupId?: number }): Promise<{ ok: boolean; messages?: ChatMessage[]; error?: string }> {
    const url = opts.friendId
      ? `/api/direct-messages?friendId=${opts.friendId}`
      : `/api/groups/messages?groupId=${opts.groupId}`
    const res = await fetch(url, { credentials: "include" })
    const r = await wrap<{ messages?: ChatMessage[] }>(res, {})
    return { ok: r.ok, messages: r.data.messages, error: r.error }
  },

  async sendMessage(payload: SendMsgPayload): Promise<{ ok: boolean; message?: ChatMessage; error?: string }> {
    const url = payload.groupId ? "/api/groups/messages" : "/api/direct-messages"
    const body = payload.groupId
      ? { groupId: payload.groupId, content: payload.content, type: payload.type ?? "text", fileUrl: payload.fileUrl }
      : { friendId: payload.friendId, content: payload.content, type: payload.type ?? "text", fileUrl: payload.fileUrl }
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
    const r = await wrap<{ message?: ChatMessage }>(res, {})
    return { ok: r.ok, message: r.data.message, error: r.error }
  },

  async recallMessage(messageId: number): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/messages/${messageId}`, { method: "DELETE", credentials: "include" })
    const r = await wrap<{ message?: string }>(res, {})
    return { ok: r.ok, error: r.error }
  },

  async clearHistory(friendId: number): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/direct-messages/clear", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId })
    })
    const r = await wrap<{ message?: string }>(res, {})
    return { ok: r.ok, error: r.error }
  },

  // ===== Block / Typing / Upload =====

  async toggleBlock(friendId: number, block: boolean): Promise<{ ok: boolean; message?: string; error?: string }> {
    const res = await fetch("/api/users/block", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId, block })
    })
    const r = await wrap<{ message?: string }>(res, {})
    return { ok: r.ok, message: r.data.message, error: r.error }
  },

  async pingTyping(payload: { targetId?: number; groupId?: number }): Promise<void> {
    try {
      await fetch("/api/chat/typing", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
    } catch {
      // typing 失败可忽略
    }
  },

  async getTyping(payload: { targetId?: number; groupId?: number }): Promise<boolean> {
    try {
      const params = new URLSearchParams()
      if (payload.targetId) params.append("targetId", String(payload.targetId))
      if (payload.groupId) params.append("groupId", String(payload.groupId))
      const res = await fetch(`/api/chat/typing?${params.toString()}`, { credentials: "include" })
      const data = await safeJson<{ isTyping?: boolean }>(res)
      return !!data.isTyping
    } catch {
      return false
    }
  },

  async uploadFile(file: File): Promise<{ ok: boolean; url?: string; error?: string }> {
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/chat/upload", {
        method: "POST",
        credentials: "include",
        body: formData
      })
      const data = await safeJson<{ success?: boolean; url?: string; error?: string }>(res)
      if (res.ok && data.success) {
        return { ok: true, url: data.url }
      }
      return { ok: false, error: data.error || `Upload failed (${res.status})` }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed"
      return { ok: false, error: msg }
    }
  },

  // ===== Current user =====

  async getCurrentUser(): Promise<{ ok: boolean; user?: ChatUser; error?: string }> {
    const res = await fetch("/api/auth/me", { credentials: "include" })
    const r = await wrap<{ user?: ChatUser }>(res, {})
    return { ok: r.ok, user: r.data.user, error: r.error }
  },

  // ===== Organizations (组织架构) =====

  async listOrganizations(): Promise<{ ok: boolean; organizations?: ChatOrganization[]; error?: string }> {
    const res = await fetch("/api/organizations", { credentials: "include" })
    const r = await wrap<{ organizations?: ChatOrganization[] }>(res, {})
    return { ok: r.ok, organizations: r.data.organizations, error: r.error }
  },

  async getOrganization(id: number): Promise<{ ok: boolean; organization?: ChatOrganization; members?: ChatOrganizationMember[]; error?: string }> {
    const res = await fetch(`/api/organizations/${id}`, { credentials: "include" })
    const r = await wrap<{ organization?: ChatOrganization; members?: ChatOrganizationMember[] }>(res, {})
    return { ok: r.ok, organization: r.data.organization, members: r.data.members, error: r.error }
  },

  async createOrganization(input: {
    name: string
    parentId?: number | null
    description?: string | null
  }): Promise<{ ok: boolean; organizationId?: number; message?: string; error?: string }> {
    const res = await fetch("/api/organizations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    })
    const r = await wrap<{ organizationId?: number; message?: string }>(res, {})
    return { ok: r.ok, organizationId: r.data.organizationId, message: r.data.message, error: r.error }
  },

  async updateOrganization(id: number, input: {
    name?: string
    parentId?: number | null
    description?: string | null
  }): Promise<{ ok: boolean; message?: string; error?: string }> {
    const res = await fetch(`/api/organizations/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    })
    const r = await wrap<{ message?: string }>(res, {})
    return { ok: r.ok, message: r.data.message, error: r.error }
  },

  async deleteOrganization(id: number): Promise<{ ok: boolean; message?: string; error?: string }> {
    const res = await fetch(`/api/organizations/${id}`, {
      method: "DELETE",
      credentials: "include"
    })
    const r = await wrap<{ message?: string }>(res, {})
    return { ok: r.ok, message: r.data.message, error: r.error }
  },

  async inviteOrganizationMember(
    orgId: number,
    email: string,
    role?: "member" | "admin"
  ): Promise<{ ok: boolean; message?: string; userId?: number; error?: string }> {
    const res = await fetch(`/api/organizations/${orgId}/members`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: role ?? "member" })
    })
    const r = await wrap<{ message?: string; userId?: number }>(res, {})
    return { ok: r.ok, message: r.data.message, userId: r.data.userId, error: r.error }
  },

  async removeOrganizationMember(orgId: number, userId: number): Promise<{ ok: boolean; message?: string; error?: string }> {
    const res = await fetch(`/api/organizations/${orgId}/members/${userId}`, {
      method: "DELETE",
      credentials: "include"
    })
    const r = await wrap<{ message?: string }>(res, {})
    return { ok: r.ok, message: r.data.message, error: r.error }
  },

  async syncOrganizationMembers(orgId: number): Promise<{ ok: boolean; message?: string; added?: number; skipped?: number; error?: string }> {
    const res = await fetch(`/api/organizations/${orgId}/sync-members`, {
      method: "POST",
      credentials: "include"
    })
    const r = await wrap<{ message?: string; added?: number; skipped?: number }>(res, {})
    return { ok: r.ok, message: r.data.message, added: r.data.added, skipped: r.data.skipped, error: r.error }
  },

  /**
   * 将组织内所有成员与当前用户建立双向 friends 关系（自动加入通讯录）
   * 用户查看组织详情时调用，使组织成员可直接发起聊天
   */
  async syncOrgFriends(orgId: number): Promise<{ ok: boolean; message?: string; added?: number; skipped?: number; error?: string }> {
    const res = await fetch(`/api/organizations/${orgId}/sync-friends`, {
      method: "POST",
      credentials: "include"
    })
    const r = await wrap<{ message?: string; added?: number; skipped?: number }>(res, {})
    return { ok: r.ok, message: r.data.message, added: r.data.added, skipped: r.data.skipped, error: r.error }
  }
}
