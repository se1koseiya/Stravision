"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { App as AntApp, ConfigProvider, theme as antdTheme } from "antd"
import { XProvider } from "@ant-design/x"
import { useTheme } from "next-themes"
import zhCN from "antd/locale/zh_CN"
import { toast, message } from "@/lib/ui/feedback"
import { cn } from "@/lib/utils"
import { chatClient } from "@/lib/chat/chat-client"
import type {
  ChatGroup,
  ChatGroupMember,
  ChatOrganization,
  ChatTarget,
  ChatUser
} from "@/lib/chat/chat-types"
import { useChatBootstrap } from "@/hooks/chat/use-chat-bootstrap"
import { useContacts } from "@/hooks/chat/use-contacts"
import { useChatMessages } from "@/hooks/chat/use-chat-messages"
import { useTypingStatus } from "@/hooks/chat/use-typing-status"
import { useVoiceRecorder } from "@/hooks/chat/use-voice-recorder"

import { PageHeader } from "@/components/page-header"
import { InvitationNotifier } from "@/components/kb/invitation-notifier"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatWindow } from "@/components/chat/chat-window"
import { ChatEmptyState } from "@/components/chat/chat-empty-state"
import { ChatInfoPanel } from "@/components/chat/chat-info-panel"
import { OrganizationDetailPanel } from "@/components/chat/organization-detail-panel"
import { AddFriendDialog } from "@/components/chat/add-friend-dialog"
import { CreateGroupDialog } from "@/components/chat/create-group-dialog"
import { ImagePreviewDialog } from "@/components/chat/image-preview-dialog"
import { MessageSearchDialog } from "@/components/chat/message-search-dialog"
import type { SendMessageFn } from "@/components/chat/chat-input-bar"

export default function ChatPage() {
  // ===== 0. 主题（antd 必须跟随，否则暗色下弹窗/下拉/骨架仍是白底） =====
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  // ===== 1. Bootstrap =====
  const { currentUser, isMobile } = useChatBootstrap()

  // ===== 2. Contacts =====
  const {
    friends,
    groups,
    requests,
    refreshFriends,
    refreshGroups,
    refreshAll,
    clearUnread,
    removeGroup
  } = useContacts()

  // ===== 3. Active target =====
  const [activeFriend, setActiveFriend] = useState<ChatUser | null>(null)
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null)
  const target: ChatTarget | null = activeFriend
    ? { kind: "direct", friend: activeFriend }
    : activeGroup
      ? { kind: "group", group: activeGroup }
      : null

  const [searchQuery, setSearchQuery] = useState("")
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [primaryTab, setPrimaryTab] = useState<"messages" | "contacts">("messages")
  const [selectedContact, setSelectedContact] = useState<ChatUser | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<ChatOrganization | null>(null)

  // 通讯录模式下显示的target（选中的联系人）
  const contactTarget: ChatTarget | null = selectedContact && primaryTab === "contacts"
    ? { kind: "direct", friend: selectedContact }
    : null
  // 实际详情面板显示的target
  const detailsTarget = target || contactTarget

  // ===== 4. Messages =====
  const {
    messages,
    loading: messagesLoading,
    sendMessage,
    recallMessage,
    clearHistory
  } = useChatMessages(target)

  // ===== 5. Typing =====
  const { isTyping, notifyTyping } = useTypingStatus(target)

  // ===== 6. Group members =====
  const [groupMembers, setGroupMembers] = useState<ChatGroupMember[]>([])
  const activeGroupIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (!activeGroup) {
      activeGroupIdRef.current = null
      setGroupMembers([])
      return
    }
    activeGroupIdRef.current = activeGroup.id
    chatClient.listGroupMembers(activeGroup.id).then(r => {
      if (activeGroupIdRef.current !== activeGroup.id) return
      if (r.ok && r.members) setGroupMembers(r.members)
    })
  }, [activeGroup])

  // ===== 7. Send handler (适配新 SendMessageFn 签名) =====
  /**
   * 附件必须**先上传再落库**（2026-10-22 修）
   *
   * 旧实现把 `URL.createObjectURL(file)` 直接当 file_url 存进数据库 —— 那是个
   * `blob:http://host/uuid` 的一次性内存地址，只活在发送者当前标签页里：
   *   · 接收方拿到这串 URL 必然裂图/无法播放；
   *   · 发送者自己刷新或换设备，历史消息全部失效。
   * 后端 `/api/chat/upload` 早就写好了（鉴权 + 类型/体积校验 + 落 public/uploads/chat），
   * 只是一直没人调。这里补上，并且在等待期间给一条 loading 提示。
   */
  const handleSend: SendMessageFn = useCallback(async ({ text, file }) => {
    if (file) {
      const type = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
            ? "audio"
            : "file"
      const hide = message.loading(type === "image" ? "图片上传中…" : "文件上传中…", 0)
      try {
        const up = await chatClient.uploadFile(file)
        if (!up.ok || !up.url) {
          toast.error(up.error || "上传失败，请重试")
          return
        }
        const result = await sendMessage({
          content: text || file.name || (type === "audio" ? "[语音]" : "[文件]"),
          type,
          fileUrl: up.url
        })
        if (result.ok) {
          refreshFriends()
          refreshGroups()
        } else {
          toast.error(result.error || "发送失败")
        }
      } finally {
        hide()
      }
      return
    }
    if (!text) return
    const result = await sendMessage({ content: text, type: "text" })
    if (result.ok) {
      refreshFriends()
      refreshGroups()
    } else {
      toast.error(result.error || "发送失败")
    }
  }, [sendMessage, refreshFriends, refreshGroups])

  // ===== 8. Voice recorder =====
  const { isRecording, startRecording, stopRecording, cancelRecording } = useVoiceRecorder({
    onAudioReady: async (url) => {
      // 同上：录音给的是 blob URL，必须先转成服务端地址才能被对方听见
      try {
        const blob = await fetch(url).then(r => r.blob())
        const ext = blob.type.includes("mp4") ? "m4a" : "webm"
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type || "audio/webm" })
        const hide = message.loading("语音上传中…", 0)
        try {
          const up = await chatClient.uploadFile(file)
          if (!up.ok || !up.url) {
            toast.error(up.error || "语音上传失败")
            return
          }
          const r = await sendMessage({ content: "[语音]", type: "audio", fileUrl: up.url })
          if (!r.ok) toast.error(r.error || "语音发送失败")
        } finally {
          hide()
        }
      } catch {
        toast.error("语音处理失败")
      } finally {
        URL.revokeObjectURL(url)
      }
    },
    onError: (msg) => toast.error(msg)
  })

  const handleRecall = useCallback(
    async (messageId: number) => {
      const ok = await recallMessage(messageId)
      if (ok) {
        toast.success("消息已撤回")
        refreshFriends()
        refreshGroups()
      } else {
        toast.error("撤回失败")
      }
    },
    [recallMessage, refreshFriends, refreshGroups]
  )

  const handleRespondRequest = useCallback(
    async (requestId: number, action: "accept" | "reject") => {
      const r = await chatClient.respondFriendRequest(requestId, action)
      if (r.ok) {
        toast.success(action === "accept" ? "已接受好友请求" : "已拒绝好友请求")
        refreshAll()
      } else {
        toast.error(r.error || "操作失败")
      }
    },
    [refreshAll]
  )

  const handleBlockUser = useCallback(
    async (userId: number, block: boolean) => {
      const r = await chatClient.toggleBlock(userId, block)
      if (r.ok) {
        toast.success(r.message || (block ? "已拉黑" : "已解除拉黑"))
        refreshFriends()
        if (activeFriend?.id === userId) {
          setActiveFriend({ ...activeFriend, is_blocked: block })
        }
      } else {
        toast.error(r.error || "操作失败")
      }
    },
    [refreshFriends, activeFriend]
  )

  const handleClearHistory = useCallback(
    async () => {
      const ok = await clearHistory()
      if (ok) {
        toast.success("聊天记录已清空")
        refreshFriends()
      } else {
        toast.error("清空失败")
      }
    },
    [clearHistory, refreshFriends]
  )

  const handleDisbandGroup = useCallback(
    async (groupId: number) => {
      if (!confirm("确定要解散该群组吗？此操作不可恢复。")) return
      const r = await chatClient.disbandGroup(groupId)
      if (r.ok) {
        toast.success("群组已解散")
        removeGroup(groupId)
        if (activeGroup?.id === groupId) setActiveGroup(null)
      } else {
        toast.error(r.error || "解散失败")
      }
    },
    [removeGroup, activeGroup]
  )

  const handleLeaveGroup = useCallback(
    async (groupId: number) => {
      if (!confirm("确定要退出该群组吗？")) return
      const r = await chatClient.leaveGroup(groupId)
      if (r.ok) {
        toast.success("已退出群组")
        removeGroup(groupId)
        if (activeGroup?.id === groupId) setActiveGroup(null)
      } else {
        toast.error(r.error || "退出失败")
      }
    },
    [removeGroup, activeGroup]
  )

  const handleToggleMute = useCallback(
    async (groupId: number, userId: number, mute: boolean) => {
      const r = await chatClient.toggleMute(groupId, userId, mute)
      if (r.ok) {
        toast.success(mute ? "已禁言" : "已解除禁言")
        const mr = await chatClient.listGroupMembers(groupId)
        if (mr.ok && mr.members) setGroupMembers(mr.members)
      } else {
        toast.error(r.error || "操作失败")
      }
    },
    []
  )

  const handleKickMember = useCallback(
    async (groupId: number, userId: number) => {
      if (!confirm("确定要将该成员移出群组吗？")) return
      const r = await chatClient.kickMember(groupId, userId)
      if (r.ok) {
        toast.success("成员已移出")
        setGroupMembers(prev => prev.filter(m => m.user_id !== userId))
      } else {
        toast.error(r.error || "移除失败")
      }
    },
    []
  )

  const switchToFriend = useCallback((friend: ChatUser) => {
    setActiveFriend(friend)
    setActiveGroup(null)
    setShowDetails(false)
    setPrimaryTab("messages")
    clearUnread("direct", friend.id)
  }, [clearUnread])

  const switchToGroup = useCallback((group: ChatGroup) => {
    setActiveGroup(group)
    setActiveFriend(null)
    setShowDetails(false)
    setPrimaryTab("messages")
    clearUnread("group", group.id)
  }, [clearUnread])

  const backToList = useCallback(() => {
    setActiveFriend(null)
    setActiveGroup(null)
    setShowDetails(false)
  }, [])

  const toggleDetails = useCallback(() => {
    setShowDetails(prev => !prev)
  }, [])

  const handleTabChange = useCallback((tab: "messages" | "contacts") => {
    setPrimaryTab(tab)
    setShowDetails(false)
    if (tab === "messages") {
      setSelectedContact(null)
      setSelectedOrg(null)
    }
  }, [])

  // 切换到组织架构时清空联系人选择，反之亦然（互斥）
  const handleSelectOrg = useCallback((org: ChatOrganization | null) => {
    setSelectedOrg(org)
    if (org) {
      setSelectedContact(null)
    }
  }, [])

  // 从组织详情面板点击成员「发消息」：切换到消息 Tab 并打开与该成员的私聊
  const handleOrgMemberChat = useCallback((friend: ChatUser) => {
    setSelectedOrg(null)
    switchToFriend(friend)
    // 刷新好友列表，确保该成员出现在会话列表
    refreshFriends()
  }, [switchToFriend, refreshFriends])

  // 组织成员同步到通讯录后刷新好友列表
  const handleOrgFriendsUpdated = useCallback(() => {
    refreshFriends()
  }, [refreshFriends])

  // ===== Render =====
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: isDark ? "#34D399" : "#059669",
          borderRadius: 8,
        },
      }}
    >
    <AntApp>
    <XProvider theme={{ algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm, token: { colorPrimary: isDark ? "#34D399" : "#059669" } }}>
    <div className="h-[100dvh] w-screen bg-br-surface font-sans overflow-hidden flex flex-col">
      {/* 顶部 PageHeader */}
      <div className="border-b border-br-line shrink-0">
        <PageHeader user={currentUser}>
          <InvitationNotifier />
        </PageHeader>
      </div>

      {/* 主区域 */}
      <div className="flex-1 min-h-0 overflow-hidden flex bg-br-canvas">
        {/* 左侧：侧边栏（消息模式64+280=344px，通讯录模式64+180+260=504px） */}
        <div
          className={cn(
            "flex h-full shrink-0",
            primaryTab === "messages" ? "w-[344px]" : "w-[504px]",
            isMobile && target ? "hidden" : "flex"
          )}
        >
          <ChatSidebar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            friends={friends}
            groups={groups}
            requests={requests}
            activeFriendId={activeFriend?.id ?? null}
            activeGroupId={activeGroup?.id ?? null}
            onSwitchFriend={switchToFriend}
            onSwitchGroup={switchToGroup}
            onRespondRequest={handleRespondRequest}
            onOpenAddFriend={() => setIsAddFriendOpen(true)}
            onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
            primaryTab={primaryTab}
            setPrimaryTab={handleTabChange}
            selectedContactId={selectedContact?.id ?? null}
            onSelectContact={setSelectedContact}
            selectedOrgId={selectedOrg?.id ?? null}
            onSelectOrg={handleSelectOrg}
            currentUserRole={currentUser?.role}
          />
        </div>

        {/* 通讯录模式：右侧直接显示详情面板（占满剩余空间） */}
        {primaryTab === "contacts" ? (
          !isMobile && (
            <div className="flex-1 min-w-0 h-full bg-br-surface">
              {selectedOrg ? (
                <OrganizationDetailPanel
                  org={selectedOrg}
                  currentUser={currentUser}
                  onClose={() => setSelectedOrg(null)}
                  onSwitchToChat={handleOrgMemberChat}
                  onFriendsUpdated={handleOrgFriendsUpdated}
                />
              ) : selectedContact && contactTarget ? (
                <div className="w-[320px] h-full mx-auto">
                  <ChatInfoPanel
                    target={contactTarget}
                    currentUser={currentUser}
                    groupMembers={[]}
                    onSwitchToChat={(f) => {
                      switchToFriend(f)
                      setSelectedContact(null)
                    }}
                    onToggleBlock={handleBlockUser}
                    onClearHistory={handleClearHistory}
                    onDisbandGroup={handleDisbandGroup}
                    onLeaveGroup={handleLeaveGroup}
                    onToggleMute={handleToggleMute}
                    onKickMember={handleKickMember}
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-[14px] text-br-text-3">
                  选择一个联系人或组织查看详情
                </div>
              )}
            </div>
          )
        ) : (
          /* 消息模式：聊天窗口 + 可折叠详情面板 */
          <div
            className={cn(
              "flex-1 min-w-0 flex flex-col relative",
              isMobile && !target ? "hidden" : "flex"
            )}
          >
            {target ? (
              <ChatWindow
                target={target}
                isMobile={isMobile}
                isTyping={isTyping}
                messages={messages}
                loadingMessages={messagesLoading}
                hasMoreMessages={false}
                currentUser={currentUser}
                groupMembers={groupMembers}
                isRecording={isRecording}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                onCancelRecording={cancelRecording}
                onSend={handleSend}
                onTyping={notifyTyping}
                onBack={backToList}
                onOpenSearch={() => setShowSearch(true)}
                onImageClick={setPreviewImage}
                onToggleDetails={toggleDetails}
                onLoadMoreMessages={() => {}}
              />
            ) : (
              <ChatEmptyState isMobile={isMobile} />
            )}

            {/* 可折叠详情面板（点击顶栏头像展开/收起） */}
            {!isMobile && target && (
              <div
                className={cn(
                  "absolute top-0 right-0 h-full w-[300px] bg-br-surface z-20",
                  "transition-transform duration-300 ease-in-out shadow-[-4px_0_16px_rgba(0,0,0,0.04)] dark:shadow-[-4px_0_16px_rgba(0,0,0,0.4)]",
                  showDetails
                    ? "translate-x-0"
                    : "translate-x-full pointer-events-none"
                )}
              >
                <ChatInfoPanel
                  target={target}
                  currentUser={currentUser}
                  groupMembers={target.kind === "group" ? groupMembers : []}
                  onSwitchToChat={undefined}
                  onToggleBlock={handleBlockUser}
                  onClearHistory={handleClearHistory}
                  onDisbandGroup={handleDisbandGroup}
                  onLeaveGroup={handleLeaveGroup}
                  onToggleMute={handleToggleMute}
                  onKickMember={handleKickMember}
                  onClose={() => setShowDetails(false)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddFriendDialog
        open={isAddFriendOpen}
        onOpenChange={setIsAddFriendOpen}
        onSent={refreshAll}
      />
      <CreateGroupDialog
        open={isCreateGroupOpen}
        onOpenChange={setIsCreateGroupOpen}
        friends={friends}
        onCreated={refreshAll}
      />
      <ImagePreviewDialog
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
        imageUrl={previewImage || ""}
      />
      <MessageSearchDialog
        open={showSearch}
        onOpenChange={setShowSearch}
        messages={messages}
        onSelectMessage={() => {}}
      />
    </div>
    </XProvider>
    </AntApp>
    </ConfigProvider>
  )
}
