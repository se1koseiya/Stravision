import { initDB, query, queryOne, execute, withTransaction } from "./database"
import { UserPublic, toPublicUser, User } from "./user-service"
import { publishUserEvent, publishUserEventsTo } from "@/lib/server/user-event-bus"

let dbInitPromise: Promise<void> | null = null

async function ensureDB() {
  if (!dbInitPromise) {
    dbInitPromise = initDB()
  }
  await dbInitPromise
}

export interface FriendRequest {
  id: number
  requester_id: number
  addressee_id: number
  status: 'pending' | 'accepted' | 'rejected'
  created_at: number
  updated_at?: number
  requester?: UserPublic
  addressee?: UserPublic
}

export interface Message {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  type: 'text' | 'image' | 'file'
  file_url?: string
  group_id?: number | null
  read_at?: number
  created_at: number
}

export interface Group {
  id: number
  name: string
  owner_id: number
  avatar_url?: string
  created_at: number
  my_role?: 'owner' | 'admin' | 'member'
}

export interface GroupMember {
  group_id: number
  user_id: number
  role: 'owner' | 'admin' | 'member'
  is_muted: boolean // 0 or 1 in DB
  joined_at: number
  user?: UserPublic
}

export class ChatService {
  /**
   * Block or Unblock a user
   */
  static async toggleBlockUser(userId: number, friendId: number, block: boolean): Promise<{ success: boolean; message: string }> {
    await ensureDB()

    if (block) {
      // Check if target is an admin
      const friend = await queryOne<{ role: string }>("SELECT role FROM users WHERE id = $1", [friendId])
      if (friend && (friend.role === 'admin' || friend.role === 'super_admin')) {
        return { success: false, message: 'Cannot block an administrator' }
      }
    }

    try {
      await execute("UPDATE friends SET is_blocked = $1 WHERE user_id = $2 AND friend_id = $3", [
        block ? 1 : 0,
        userId,
        friendId
      ])
      // 通知被影响一方：自己被对方拉黑/取消拉黑
      publishUserEvent({
        type: "chat_block_changed",
        userId: friendId,
        peerId: userId,
        blocked: block
      })
      return { success: true, message: block ? 'User blocked' : 'User unblocked' }
    } catch (error) {
      console.error("Failed to toggle block:", error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * Check if blocked
   */
  static async isBlocked(userId: number, friendId: number): Promise<boolean> {
    await ensureDB()
    const result = await queryOne<{ is_blocked: number }>(
      "SELECT is_blocked FROM friends WHERE user_id = $1 AND friend_id = $2",
      [userId, friendId]
    )
    return result ? !!result.is_blocked : false
  }

  /**
   * Create a group
   */
  static async createGroup(ownerId: number, name: string, initialMemberIds: number[] = []): Promise<{ success: boolean; groupId?: number; message: string }> {
    await ensureDB()
    try {
      const now = Date.now()
      let groupId: number | null = null
      const memberIds: number[] = [ownerId]

      await withTransaction(async (client) => {
        const result = await client.query(
          "INSERT INTO groups (name, owner_id, created_at) VALUES ($1, $2, $3) RETURNING id",
          [name, ownerId, now]
        )
        groupId = Number(result.rows[0]?.id)

        await client.query(
          "INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES ($1, $2, 'owner', $3)",
          [groupId, ownerId, now]
        )

        for (const memberId of initialMemberIds) {
          if (memberId !== ownerId) {
            await client.query(
              "INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES ($1, $2, 'member', $3) ON CONFLICT (group_id, user_id) DO NOTHING",
              [groupId, memberId, now]
            )
            memberIds.push(memberId)
          }
        }
      })

      // 通知被加入的成员：他们已加入此群
      publishUserEventsTo(
        memberIds.filter(id => id !== ownerId),
        (uid) => ({
          type: "chat_group_member_changed",
          userId: uid,
          groupId: groupId as number,
          change: "joined",
          targetUserId: uid
        })
      )

      return { success: true, groupId, message: 'Group created' }
    } catch (error) {
      console.error("Failed to create group:", error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * Get user groups
   */
  static async getUserGroups(userId: number): Promise<Group[]> {
    await ensureDB()
    const groups = await query<(Group & { last_read_at: number, my_role: 'owner' | 'admin' | 'member' })>(`
      SELECT g.*, gm.last_read_at, gm.role as my_role
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = $1
    `, [userId])

    const results: any[] = []
    for (const group of groups) {
      const lastMessage = await queryOne<Message>(
        "SELECT * FROM messages WHERE group_id = $1 ORDER BY created_at DESC LIMIT 1",
        [group.id]
      )

      const unread = await queryOne<{ count: string | number }>(
        "SELECT COUNT(*) as count FROM messages WHERE group_id = $1 AND created_at > $2",
        [group.id, group.last_read_at || 0]
      )

      results.push({
        ...group,
        last_message: lastMessage || undefined,
        unread_count: Number(unread?.count ?? 0),
        my_role: group.my_role
      })
    }

    return results
  }

  /**
   * Delete a group (Only owner)
   */
  static async deleteGroup(groupId: number, userId: number): Promise<{ success: boolean; message: string }> {
    await ensureDB()
    const group = await queryOne<{ owner_id: number; name: string }>("SELECT owner_id, name FROM groups WHERE id = $1", [groupId])
    if (!group) return { success: false, message: 'Group not found' }

    if (group.owner_id !== userId) {
      // Check if user is super_admin (optional, but good for management)
      const user = await queryOne<{ role: string }>("SELECT role FROM users WHERE id = $1", [userId])
      if (user?.role !== 'admin' && user?.role !== 'super_admin') {
          return { success: false, message: 'Unauthorized' }
      }
    }

    // 先收集成员列表，删除后通知他们
    const members = await query<{ user_id: number }>(
      "SELECT user_id FROM group_members WHERE group_id = $1",
      [groupId]
    )
    const memberIds = members.map(m => m.user_id).filter(id => id !== userId)
    const groupName = group.name

    try {
        await withTransaction(async (client) => {
          await client.query("DELETE FROM messages WHERE group_id = $1", [groupId])
          await client.query("DELETE FROM group_members WHERE group_id = $1", [groupId])
          await client.query("DELETE FROM groups WHERE id = $1", [groupId])
        })

        // 通知其他成员群已解散
        publishUserEventsTo(
          memberIds,
          (uid) => ({
            type: "chat_group_disbanded",
            userId: uid,
            groupId,
            groupName
          })
        )

        return { success: true, message: 'Group deleted' }
    } catch (e) {
        console.error("Failed to delete group:", e)
        return { success: false, message: 'Internal error' }
    }
  }

  /**
   * Remove member from group (Kick)
   */
  static async removeGroupMember(groupId: number, adminId: number, targetUserId: number): Promise<{ success: boolean; message: string }> {
      await ensureDB()

      // Check admin rights
      const admin = await queryOne<{ role: string }>(
        "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2",
        [groupId, adminId]
      )

      // Check if user is super_admin globally
      const adminUser = await queryOne<{ role: string }>("SELECT role FROM users WHERE id = $1", [adminId])
      const isSystemAdmin = adminUser && (adminUser.role === 'admin' || adminUser.role === 'super_admin')

      const isGroupOwner = admin?.role === 'owner'
      const isGroupAdmin = admin?.role === 'admin'

      if (!isGroupOwner && !isGroupAdmin && !isSystemAdmin) {
          return { success: false, message: 'Unauthorized' }
      }

      // Check target member
      const targetMember = await queryOne<{ role: string }>(
        "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2",
        [groupId, targetUserId]
      )
      if (!targetMember) return { success: false, message: 'Member not found' }

      // Logic:
      // Owner can kick anyone.
      // Admin can kick Member. Admin cannot kick Owner or Admin.
      // System Admin can kick anyone (optional).

      if (targetMember.role === 'owner') {
          return { success: false, message: 'Cannot kick the owner' }
      }

      if (isGroupAdmin && targetMember.role === 'admin') {
          return { success: false, message: 'Admins cannot kick other admins' }
      }

      try {
          await execute("DELETE FROM group_members WHERE group_id = $1 AND user_id = $2", [groupId, targetUserId])

          // 通知被踢的成员
          publishUserEvent({
            type: "chat_group_member_changed",
            userId: targetUserId,
            groupId,
            change: "kicked",
            targetUserId
          })

          return { success: true, message: 'Member removed' }
      } catch (e) {
          console.error("Failed to remove member:", e)
          return { success: false, message: 'Internal error' }
      }
  }

  /**
   * Get group members
   */
  static async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    await ensureDB()

    const members = await query<any>(`
      SELECT gm.*, u.id as u_id, u.uid as u_uid, u.email as u_email, u.username as u_username, u.avatar_url as u_avatar_url, u.role as u_role
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
    `, [groupId])

    return members.map(m => ({
      group_id: m.group_id,
      user_id: m.user_id,
      role: m.role,
      is_muted: !!m.is_muted,
      joined_at: m.joined_at,
      user: {
        id: m.u_id,
        uid: m.u_uid,
        email: m.u_email,
        username: m.u_username,
        avatar_url: m.u_avatar_url,
        role: m.u_role || 'user',
        permissions: {},
        notification_settings: { alerts: false, status: false, ai: false, updates: false },
        created_at: 0
      }
    }))
  }

  /**
   * Get group member user ids only (for SSE fanout)
   */
  static async getGroupMemberIds(groupId: number, excludeUserId?: number): Promise<number[]> {
    await ensureDB()
    const rows = await query<{ user_id: number }>(
      "SELECT user_id FROM group_members WHERE group_id = $1",
      [groupId]
    )
    return rows
      .map(r => r.user_id)
      .filter(id => id !== excludeUserId)
  }

  /**
   * Send message (updated for group support)
   */
  static async sendMessage(senderId: number, receiverId: number | null, content: string, type: 'text' | 'image' | 'file' = 'text', fileUrl?: string, groupId?: number): Promise<{ success: boolean; message?: Message; error?: string }> {
    await ensureDB()

    // Check block status for 1-on-1
    if (!groupId && receiverId) {
      const isBlockedByReceiver = await this.isBlocked(receiverId, senderId)
      if (isBlockedByReceiver) {
        return { success: false, error: 'You are blocked by this user' }
      }
    }

    // Check mute status for Group
    if (groupId) {
       const member = await queryOne<{ is_muted: number }>(
         "SELECT is_muted FROM group_members WHERE group_id = $1 AND user_id = $2",
         [groupId, senderId]
       )
       if (!member) return { success: false, error: 'Not a member' }
       if (member.is_muted) return { success: false, error: 'You are muted in this group' }
    }

    try {
      // For group messages, receiver_id is not used but the column is NOT NULL.
      // We use sender_id as a placeholder for receiver_id in group messages.
      const actualReceiverId = groupId ? senderId : (receiverId || 0)
      const now = Date.now()

      const result = await queryOne<{ id: number }>(`
        INSERT INTO messages (sender_id, receiver_id, group_id, content, type, file_url, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [senderId, actualReceiverId, groupId || null, content, type, fileUrl, now])

      const message: Message = {
        id: result?.id as number,
        sender_id: senderId,
        receiver_id: actualReceiverId,
        group_id: groupId || null,
        content,
        type,
        file_url: fileUrl,
        created_at: now
      }

      // 推送 SSE 事件
      const sender = await queryOne<{ username: string; avatar_url: string | null }>(
        "SELECT username, avatar_url FROM users WHERE id = $1",
        [senderId]
      )

      if (groupId) {
        // 群消息：广播给除发送者外所有成员
        const memberIds = await this.getGroupMemberIds(groupId, senderId)
        const group = await queryOne<{ name: string }>("SELECT name FROM groups WHERE id = $1", [groupId])
        publishUserEventsTo(
          memberIds,
          (uid) => ({
            type: "chat_message",
            userId: uid,
            message,
            chatKind: "group",
            peerId: groupId,
            senderName: sender?.username,
            senderAvatar: sender?.avatar_url ?? null,
            groupName: group?.name
          })
        )
      } else if (receiverId) {
        // 私聊：推给接收者
        publishUserEvent({
          type: "chat_message",
          userId: receiverId,
          message,
          chatKind: "direct",
          peerId: senderId,
          senderName: sender?.username,
          senderAvatar: sender?.avatar_url ?? null
        })
      }

      return { success: true, message }
    } catch (e) {
      console.error("SendMessage Error:", e);
      return { success: false, error: 'Failed to send' }
    }
  }

  /**
   * Get messages (updated for group support)
   */
  static async getMessages(userId: number, targetId: number, isGroup: boolean = false, limit = 50, offset = 0): Promise<Message[]> {
    await ensureDB()

    let messages;
    if (isGroup) {
      messages = await query<Message>(`
        SELECT * FROM messages
        WHERE group_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [targetId, limit, offset])

      // Mark group as read
      try {
        await execute("UPDATE group_members SET last_read_at = $1 WHERE group_id = $2 AND user_id = $3", [
          Date.now(),
          targetId,
          userId
        ])
      } catch (e) {}

    } else {
      messages = await query<Message>(`
        SELECT * FROM messages
        WHERE group_id IS NULL AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $3 AND receiver_id = $4))
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
      `, [userId, targetId, targetId, userId, limit, offset])

      // Mark direct messages as read
      try {
        await execute("UPDATE messages SET read_at = $1 WHERE sender_id = $2 AND receiver_id = $3 AND read_at IS NULL", [
          Date.now(),
          targetId,
          userId
        ])
      } catch (e) {}
    }

    return messages.reverse()
  }

  /**
   * Toggle mute member in group
   */
  static async toggleGroupMute(groupId: number, adminId: number, targetUserId: number, mute: boolean): Promise<{ success: boolean; message: string }> {
    await ensureDB()

    // Check if operator is System Admin
    const operatorUser = await queryOne<{ role: string }>("SELECT role FROM users WHERE id = $1", [adminId])
    const isSystemAdmin = operatorUser && (operatorUser.role === 'admin' || operatorUser.role === 'super_admin')

    // Check group admin rights
    const admin = await queryOne<{ role: string }>(
      "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2",
      [groupId, adminId]
    )
    const isGroupAdmin = admin && (admin.role === 'owner' || admin.role === 'admin')

    if (!isSystemAdmin && !isGroupAdmin) {
        return { success: false, message: 'Unauthorized' }
    }

    // Check if target is System Admin (cannot be muted)
    if (mute) {
        const targetUser = await queryOne<{ role: string }>("SELECT role FROM users WHERE id = $1", [targetUserId])
        if (targetUser && (targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
             return { success: false, message: 'Cannot mute an administrator' }
        }
    }

    await execute("UPDATE group_members SET is_muted = $1 WHERE group_id = $2 AND user_id = $3", [
      mute ? 1 : 0,
      groupId,
      targetUserId
    ])

    // 通知被操作的成员
    publishUserEvent({
      type: "chat_group_member_changed",
      userId: targetUserId,
      groupId,
      change: mute ? "muted" : "unmuted",
      targetUserId
    })

    return { success: true, message: mute ? 'User muted' : 'User unmuted' }
  }

  /**
   * Add member to group
   */
  static async addGroupMember(groupId: number, adminId: number, targetUserId: number): Promise<{ success: boolean; message: string }> {
      await ensureDB()

      // Check admin rights (optional: currently allow any member to add? No, let's restrict to admin/owner for safety, or allow all)
      // Usually inviting is allowed by everyone, but adding directly might need permission.
      // Let's allow any member to invite for now to keep it simple, OR strictly owner.
      // Let's check if inviter is in group.
      const inviter = await queryOne("SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2", [groupId, adminId])
      if (!inviter) return { success: false, message: 'Not a member' }

      try {
          await execute(
            "INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES ($1, $2, 'member', $3) ON CONFLICT (group_id, user_id) DO NOTHING",
            [groupId, targetUserId, Date.now()]
          )

          // 通知新成员
          publishUserEvent({
            type: "chat_group_member_changed",
            userId: targetUserId,
            groupId,
            change: "joined",
            targetUserId
          })

          return { success: true, message: 'Member added' }
      } catch (e) {
          return { success: false, message: 'Failed to add member' }
      }
  }

  static async sendFriendRequest(requesterId: number, identifier: string): Promise<{ success: boolean; message: string }> {
    await ensureDB()

    // Find addressee by email or uid
    let addressee = await queryOne<User>('SELECT * FROM users WHERE email = $1', [identifier])
    if (!addressee) {
        addressee = await queryOne<User>('SELECT * FROM users WHERE uid = $1', [identifier])
    }

    if (!addressee) {
      return { success: false, message: 'User not found' }
    }

    if (addressee.id === requesterId) {
      return { success: false, message: 'Cannot add yourself as friend' }
    }

    // Check if already friends
    const existingFriend = await queryOne('SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2', [
      requesterId,
      addressee.id
    ])
    if (existingFriend) {
      return { success: false, message: 'Already friends' }
    }

    // Check if request already exists
    const existingRequest = await queryOne<FriendRequest>(
      "SELECT * FROM friend_requests WHERE requester_id = $1 AND addressee_id = $2 AND status = $3",
      [requesterId, addressee.id, 'pending']
    )

    if (existingRequest) {
      return { success: false, message: 'Friend request already sent' }
    }

    // Check if they sent one to us
    const reverseRequest = await queryOne<FriendRequest>(
      "SELECT * FROM friend_requests WHERE requester_id = $1 AND addressee_id = $2 AND status = $3",
      [addressee.id, requesterId, 'pending']
    )

    if (reverseRequest) {
        // Auto accept if they already asked
        return this.acceptFriendRequest(reverseRequest.id, requesterId)
    }

    try {
      const now = Date.now()
      const insertResult = await queryOne<{ id: number }>(`
        INSERT INTO friend_requests (requester_id, addressee_id, status, created_at, updated_at)
        VALUES ($1, $2, 'pending', $3, $4)
        RETURNING id
      `, [requesterId, addressee.id, now, now])

      // 通知接收方有新好友请求
      if (insertResult?.id) {
        publishUserEvent({
          type: "chat_friend_request",
          userId: addressee.id,
          requestId: insertResult.id,
          requester: {
            id: requesterId,
            username: addressee.username, // placeholder, route will fetch fresh
            avatar_url: addressee.avatar_url
          }
        })
      }
      return { success: true, message: 'Friend request sent' }
    } catch (error) {
      console.error('Failed to send friend request:', error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * Get pending friend requests for a user
   */
  static async getFriendRequests(userId: number): Promise<FriendRequest[]> {
    await ensureDB()

    const requests = await query<any>(`
      SELECT fr.*, 
             u.id as u_id, u.email as u_email, u.username as u_username, u.avatar_url as u_avatar_url, u.uid as u_uid
      FROM friend_requests fr
      JOIN users u ON fr.requester_id = u.id
      WHERE fr.addressee_id = $1 AND fr.status = 'pending'
    `, [userId])

    return requests.map(r => ({
      id: r.id,
      requester_id: r.requester_id,
      addressee_id: r.addressee_id,
      status: r.status,
      created_at: r.created_at,
      requester: {
        id: r.u_id,
        uid: r.u_uid,
        email: r.u_email,
        username: r.u_username,
        avatar_url: r.u_avatar_url,
        role: 'user', // Simplified
        permissions: {},
        notification_settings: {
            alerts: false,
            status: false,
            ai: false,
            updates: false
        },
        created_at: 0
      }
    }))
  }

  /**
   * Accept friend request
   */
  static async acceptFriendRequest(requestId: number, userId: number): Promise<{ success: boolean; message: string }> {
    await ensureDB()

    const request = await queryOne<FriendRequest>('SELECT * FROM friend_requests WHERE id = $1', [requestId])
    if (!request) {
      return { success: false, message: 'Request not found' }
    }

    if (request.addressee_id !== userId) {
      return { success: false, message: 'Unauthorized' }
    }

    try {
      const now = Date.now()
      await withTransaction(async (client) => {
        await client.query(
          "UPDATE friend_requests SET status = 'accepted', updated_at = $1 WHERE id = $2",
          [now, requestId]
        )

        await client.query(
          "INSERT INTO friends (user_id, friend_id, created_at) VALUES ($1, $2, $3) ON CONFLICT (user_id, friend_id) DO NOTHING",
          [request.requester_id, request.addressee_id, now]
        )
        await client.query(
          "INSERT INTO friends (user_id, friend_id, created_at) VALUES ($1, $2, $3) ON CONFLICT (user_id, friend_id) DO NOTHING",
          [request.addressee_id, request.requester_id, now]
        )
      })

      // 通知请求方：你发出的请求被接受了
      const responder = await queryOne<{ username: string }>("SELECT username FROM users WHERE id = $1", [userId])
      publishUserEvent({
        type: "chat_friend_request_responded",
        userId: request.requester_id,
        requestId,
        action: "accept",
        responder: {
          id: userId,
          username: responder?.username || ""
        }
      })

      return { success: true, message: 'Friend request accepted' }
    } catch (error) {
      console.error('Failed to accept friend request:', error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * Reject friend request
   */
  static async rejectFriendRequest(requestId: number, userId: number): Promise<{ success: boolean; message: string }> {
    await ensureDB()

    const request = await queryOne<FriendRequest>('SELECT * FROM friend_requests WHERE id = $1', [requestId])
    if (!request) {
        return { success: false, message: 'Request not found' }
    }

    if (request.addressee_id !== userId) {
        return { success: false, message: 'Unauthorized' }
    }

    try {
        await execute("UPDATE friend_requests SET status = 'rejected', updated_at = $1 WHERE id = $2", [
          Date.now(),
          requestId
        ])

        // 通知请求方：你发出的请求被拒绝了
        const responder = await queryOne<{ username: string }>("SELECT username FROM users WHERE id = $1", [userId])
        publishUserEvent({
          type: "chat_friend_request_responded",
          userId: request.requester_id,
          requestId,
          action: "reject",
          responder: {
            id: userId,
            username: responder?.username || ""
          }
        })

        return { success: true, message: 'Friend request rejected' }
    } catch (error) {
        return { success: false, message: 'Internal error' }
    }
  }

  /**
   * Get friends list
   */
  static async getFriends(userId: number): Promise<(UserPublic & { last_message?: Message, unread_count: number })[]> {
    await ensureDB()

    const friends = await query<User>(`
      SELECT u.*
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = $1
    `, [userId])

    const results: Array<UserPublic & { last_message?: Message, unread_count: number }> = []
    for (const friend of friends) {
      const lastMessage = await queryOne<Message>(
        `
        SELECT * FROM messages
        WHERE group_id IS NULL AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $3 AND receiver_id = $4))
        ORDER BY created_at DESC
        LIMIT 1
      `,
        [userId, friend.id, friend.id, userId]
      )

      const unread = await queryOne<{ count: string | number }>(
        `
        SELECT COUNT(*) as count FROM messages
        WHERE group_id IS NULL AND sender_id = $1 AND receiver_id = $2 AND (read_at IS NULL OR read_at = 0)
      `,
        [friend.id, userId]
      )

      results.push({
        ...toPublicUser(friend),
        last_message: lastMessage || undefined,
        unread_count: Number(unread?.count ?? 0)
      })
    }

    return results
  }

  /**
   * Get new messages for user (for notifications)
   */
  static async getNewMessagesForUser(userId: number, since: number): Promise<(Message & { sender_name: string; group_name?: string; sender_avatar?: string })[]> {
    await ensureDB()

    // Get direct messages
    const directMessages = await query<(Message & { sender_name: string; sender_avatar?: string })>(`
      SELECT m.*, u.username as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.receiver_id = $1 AND m.created_at > $2
    `, [userId, since])

    // Get group messages (excluding muted groups and self-sent messages)
    const groupMessages = await query<(Message & { sender_name: string; group_name: string; sender_avatar?: string })>(`
      SELECT m.*, u.username as sender_name, u.avatar_url as sender_avatar, g.name as group_name
      FROM messages m
      JOIN group_members gm ON m.group_id = gm.group_id
      JOIN users u ON m.sender_id = u.id
      JOIN groups g ON m.group_id = g.id
      WHERE gm.user_id = $1 
      AND m.sender_id != $2
      AND m.created_at > $3
      AND m.group_id IS NOT NULL
      AND gm.is_muted = 0
    `, [userId, userId, since])

    return [...directMessages, ...groupMessages].sort((a, b) => b.created_at - a.created_at)
  }

  /**
   * Clear chat history
   */
  static async clearMessages(userId: number, friendId: number): Promise<{ success: boolean; message: string }> {
    await ensureDB()

    try {
      await execute(`
        DELETE FROM messages
        WHERE group_id IS NULL 
        AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $3 AND receiver_id = $4))
      `, [userId, friendId, friendId, userId])
      return { success: true, message: 'Chat history cleared' }
    } catch (error) {
      console.error("Failed to clear messages:", error)
      return { success: false, message: 'Internal error' }
    }
  }

  /**
   * Recall a message (within 2 minutes, sender only).
   * 通知所有相关方：私聊推给接收者，群聊推给所有其他成员。
   */
  static async recallMessage(messageId: number, senderId: number): Promise<{ success: boolean; message: string; error?: string }> {
    await ensureDB()

    const msg = await queryOne<Message>("SELECT * FROM messages WHERE id = $1", [messageId])
    if (!msg) return { success: false, message: 'Message not found', error: 'not_found' }
    if (msg.sender_id !== senderId) return { success: false, message: 'Not authorized', error: 'forbidden' }

    const now = Date.now()
    const twoMinutes = 2 * 60 * 1000
    if (now - msg.created_at > twoMinutes) {
      return { success: false, message: 'Message can only be recalled within 2 minutes', error: 'timeout' }
    }

    try {
      await execute(
        "UPDATE messages SET content = $1, type = $2 WHERE id = $3",
        ['[消息已撤回]', 'recalled', messageId]
      )

      // 推送撤回事件
      if (msg.group_id) {
        const memberIds = await this.getGroupMemberIds(msg.group_id, senderId)
        publishUserEventsTo(
          memberIds,
          (uid) => ({
            type: "chat_message_recalled",
            userId: uid,
            messageId,
            chatKind: "group",
            peerId: msg.group_id as number
          })
        )
      } else if (msg.receiver_id && msg.receiver_id !== senderId) {
        publishUserEvent({
          type: "chat_message_recalled",
          userId: msg.receiver_id,
          messageId,
          chatKind: "direct",
          peerId: senderId
        })
      }

      return { success: true, message: 'Message recalled successfully' }
    } catch (e) {
      console.error("RecallMessage Error:", e)
      return { success: false, message: 'Failed to recall', error: 'internal' }
    }
  }

  /**
   * Typing status upsert（仅写库，不发布 SSE，因为 typing API 走短轮询足够且不会爆数据库。
   * 但为了让 typing 状态能通过 SSE 流转，POST typing 时也会调用 publishTyping。）
   */
  static async upsertTypingStatus(userId: number, targetId: number | null, groupId: number | null): Promise<void> {
    await ensureDB()
    await execute(
      `INSERT INTO typing_status (user_id, target_id, group_id, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, target_id, group_id)
       DO UPDATE SET updated_at = EXCLUDED.updated_at`,
      [userId, targetId || 0, groupId || 0, Date.now()]
    )
  }
}
