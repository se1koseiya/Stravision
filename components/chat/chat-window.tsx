"use client"

import { memo, useCallback, useRef, useState } from "react"
import type { ChatGroupMember, ChatMessage, ChatTarget, ChatUser } from "@/lib/chat/chat-types"
import { toast } from "@/lib/ui/feedback"
import { ChatHeader } from "./chat-header"
import { ChatMessageList } from "./chat-message-list"
import { ChatInputBar, type SendMessageFn } from "./chat-input-bar"

/** 拖拽上传只放行这三类（与 /api/chat/upload 白名单对齐，避免拖进 zip 后吃 400） */
const DROP_ACCEPT = /^(image|video|audio)\//

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
  /* 拖拽投放（2026-10-22）：把图片/视频拖进对话区就能发，
     省掉「点回形针 → 找文件 → 确认」三步。dragenter/dragleave 会随子元素冒泡
     反复触发，用计数器消抖，否则提示层会闪。 */
  const [dragOver, setDragOver] = useState(false)
  const dragDepth = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return
    e.preventDefault()
    dragDepth.current += 1
    setDragOver(true)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  const handleDragLeave = useCallback(() => {
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return
    e.preventDefault()
    dragDepth.current = 0
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files || [])
    const accepted = files.filter(f => DROP_ACCEPT.test(f.type))
    if (accepted.length === 0) {
      toast.error("只支持发送图片、视频或语音文件")
      return
    }
    if (files.length > accepted.length) toast.error("部分文件类型不支持，已跳过")
    accepted.forEach(f => onSend({ file: f }))
  }, [onSend])

  return (
    <div
      className="relative flex-1 min-h-0 flex flex-col bg-br-surface h-full"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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

      {/* 拖拽提示层：仅在拖入文件时出现，pointer-events-none 不挡住投放 */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-3 z-30 rounded-2xl border-2 border-dashed border-br-brand bg-br-brand-soft flex items-center justify-center">
          <span className="text-[14px] text-br-brand-ink" style={{ fontWeight: 500 }}>
            松开即可发送
          </span>
        </div>
      )}
    </div>
  )
}

export const ChatWindow = memo(ChatWindowInner)
