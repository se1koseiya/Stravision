"use client"

import { memo } from "react"
import type { ChatGroupMember, ChatMessage, ChatTarget, ChatUser } from "@/lib/chat/chat-types"
import { ChatHeader } from "./chat-header"
import { ChatMessageList } from "./chat-message-list"
import { ChatInputBar, type SendMessageFn } from "./chat-input-bar"

interface ChatWindowProps {
  target: ChatTarget
  isMobile: boolean
  isTyping: boolean
  messages: ChatMessage[]
  loadingMessages: boolean
  hasMoreMessages: boolean
  currentUser: ChatUser | null
  groupMembers: ChatGroupMember[]
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onCancelRecording?: () => void
  onSend: SendMessageFn
  onTyping: () => void
  onBack: () => void
  onOpenSearch: () => void
  onImageClick: (url: string) => void
  onToggleDetails: () => void
  onLoadMoreMessages: () => void
}

/**
 * 聊天窗口：Header + 消息列表 + 输入栏（蓝聊设计稿）
 */
function ChatWindowInner({
  target,
  isMobile,
  isTyping,
  messages,
  loadingMessages,
  hasMoreMessages,
  currentUser,
  groupMembers,
  isRecording,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onSend,
  onTyping,
  onBack,
  onOpenSearch,
  onImageClick,
  onToggleDetails,
  onLoadMoreMessages
}: ChatWindowProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white h-full">
      <ChatHeader
        target={target}
        isMobile={isMobile}
        isTyping={isTyping}
        groupMembers={groupMembers}
        onBack={onBack}
        onOpenSearch={onOpenSearch}
        onToggleDetails={onToggleDetails}
      />

      <ChatMessageList
        messages={messages}
        loading={loadingMessages}
        hasMore={hasMoreMessages}
        target={target}
        currentUser={currentUser}
        groupMembers={groupMembers}
        onLoadMore={onLoadMoreMessages}
        onImageClick={onImageClick}
      />

      <ChatInputBar
        isMobile={isMobile}
        isRecording={isRecording}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        onCancelRecording={onCancelRecording}
        onSend={onSend}
        onTyping={onTyping}
      />
    </div>
  )
}

export const ChatWindow = memo(ChatWindowInner)
