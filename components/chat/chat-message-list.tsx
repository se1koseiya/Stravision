"use client"

import { memo, useEffect, useRef } from "react"
import { Avatar, Skeleton } from "antd"
import { cn } from "@/lib/utils"
import type { ChatGroupMember, ChatMessage, ChatTarget, ChatUser } from "@/lib/chat/chat-types"
import { ChangelogCard } from "./changelog-card"

interface ChatMessageListProps {
  messages: ChatMessage[]
  loading: boolean
  hasMore: boolean
  target: ChatTarget
  currentUser: ChatUser | null
  groupMembers: ChatGroupMember[]
  onLoadMore: () => void
  onImageClick: (url: string) => void
}

/**
 * 消息列表（蓝聊设计稿严格复刻 - 图2）
 *
 * - 纯白背景
 * - 大圆角气泡（20px左右）
 * - 自己：蓝色渐变 #1677ff → #4cabff，白字，头像在右
 * - 对方：浅灰 #f0f0f0，黑字，头像在左
 * - 时间：纯文字居中灰色
 * - 头像 40px，底部与气泡对齐
 */
function ChatMessageListInner({
  messages,
  loading,
  hasMore,
  target,
  currentUser,
  groupMembers,
  onLoadMore,
  onImageClick
}: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isDirect = target.kind === "direct"

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length])

  // 加载更多（滚动到顶部附近触发）
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollTop < 50 && hasMore && !loading) {
      onLoadMore()
    }
  }

  const getSender = (msg: ChatMessage): ChatUser | null => {
    if (Number(msg.sender_id) === Number(currentUser?.id)) return currentUser
    if (isDirect) {
      return target.friend
    }
    const member = groupMembers.find(m => Number(m.user_id) === Number(msg.sender_id))
    return member?.user || null
  }

  const isSelf = (msg: ChatMessage) => !!currentUser && Number(msg.sender_id) === Number(currentUser.id)

  const getAvatarText = (sender: ChatUser | null): string => {
    if (!sender) return "?"
    const name = sender.username || ""
    if (!name) return "?"
    // 取第一个字符，支持中文和英文
    return name[0]?.toUpperCase() || "?"
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto bg-white"
      data-lenis-prevent
    >
      <div className="px-5 py-4 flex flex-col gap-2">
        {loading && messages.length === 0 && (
          <div className="space-y-3 py-4">
            {[0, 1, 2].map(i => (
              <div key={i} className={cn("flex items-end gap-2.5", i % 2 === 0 ? "justify-start" : "justify-end")}>
                {i % 2 === 0 && <Skeleton.Avatar active size={40} shape="circle" />}
                <Skeleton.Input active size="small" style={{ width: 140 + i * 40, height: 40, borderRadius: 20 }} />
                {i % 2 === 1 && <Skeleton.Avatar active size={40} shape="circle" />}
              </div>
            ))}
          </div>
        )}

        {messages.map((msg, idx) => {
          const self = isSelf(msg)
          const sender = getSender(msg)
          const prevMsg = idx > 0 ? messages[idx - 1] : null
          // 判断是否需要显示时间分隔（和上一条间隔超过5分钟，或第一条）
          const shouldShowTime = !prevMsg ||
            (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000)
          // 连续同一发送者不重复显示名字
          const showSenderName = !isDirect && !self && sender && (!prevMsg || Number(prevMsg.sender_id) !== Number(msg.sender_id) || shouldShowTime)

          return (
            <div key={msg.id}>
              {shouldShowTime && (
                <div className="flex justify-center py-4">
                  <span className="text-[13px] text-[rgba(0,0,0,0.35)]">
                    {formatMessageTime(msg.created_at)}
                  </span>
                </div>
              )}
              <MessageBubble
                message={msg}
                self={self}
                sender={sender}
                showAvatar
                showSenderName={!!showSenderName}
                avatarUrl={sender?.avatar_url}
                avatarText={getAvatarText(sender)}
                isGroup={!isDirect}
                onImageClick={onImageClick}
              />
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

/* ========== 单条消息气泡 ========== */

function MessageBubble({
  message, self, sender, showAvatar, showSenderName, avatarUrl, avatarText, onImageClick
}: {
  message: ChatMessage
  self: boolean
  sender: ChatUser | null
  showAvatar: boolean
  showSenderName: boolean
  avatarUrl?: string | null
  avatarText: string
  isGroup: boolean
  onImageClick: (url: string) => void
}) {
  if (self) {
    // 自己的消息：气泡在左，头像在右，整体靠右对齐
    return (
      <div className="flex items-end gap-2.5 py-1 justify-end">
        {/* 气泡 */}
        <div
          className="max-w-[70%] px-4 py-2.5 text-[15px] leading-[1.5] break-words text-white rounded-[20px] shadow-sm"
          style={{ background: "linear-gradient(135deg, #1677ff 0%, #4cabff 100%)" }}
        >
          <MessageBody message={message} self={true} onImageClick={onImageClick} />
        </div>
        {/* 头像 */}
        {showAvatar ? (
          <Avatar
            size={40}
            src={avatarUrl || undefined}
            className="shrink-0"
            style={{
              backgroundColor: "#e6f4ff",
              color: "#1677ff",
              fontWeight: 500
            }}
          >
            {avatarText.toUpperCase()}
          </Avatar>
        ) : (
          <span className="size-10 shrink-0" />
        )}
      </div>
    )
  }

  // 对方的消息：头像在左，气泡在右，整体靠左对齐
  return (
    <div className="flex items-end gap-2.5 py-1 justify-start">
      {/* 头像 */}
      {showAvatar ? (
        <Avatar
          size={40}
          src={avatarUrl || undefined}
          className="shrink-0"
          style={{
            backgroundColor: "#f5f5f5",
            color: "#666",
            fontWeight: 500
          }}
        >
          {avatarText.toUpperCase()}
        </Avatar>
      ) : (
        <span className="size-10 shrink-0" />
      )}
      {/* 气泡 + 名字（群组时显示） */}
      <div className="flex flex-col gap-0.5 max-w-[70%]">
        {showSenderName && (
          <span className="text-[12px] text-[rgba(0,0,0,0.4)] px-1">
            {sender?.username}
          </span>
        )}
        <div
          className="px-4 py-2.5 text-[15px] leading-[1.5] break-words text-[rgba(0,0,0,0.88)] bg-[#f0f0f0] rounded-[20px]"
        >
          <MessageBody message={message} self={false} onImageClick={onImageClick} />
        </div>
      </div>
    </div>
  )
}

/* ========== 消息内容 ========== */

function MessageBody({
  message, self, onImageClick
}: {
  message: ChatMessage
  self: boolean
  onImageClick: (url: string) => void
}) {
  if (message.type === "image") {
    const url = message.file_url || message.content
    return (
      <div className="-mx-2 -my-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="图片"
          className="max-w-full max-h-[300px] rounded-[16px] cursor-pointer hover:opacity-95 transition-opacity block"
          onClick={() => onImageClick(url)}
          loading="lazy"
        />
      </div>
    )
  }

  if (message.type === "video") {
    return (
      <div className="-mx-2 -my-1">
        <video
          controls
          src={message.file_url || message.content}
          className="max-w-full max-h-[300px] rounded-[16px] block"
          preload="metadata"
        />
      </div>
    )
  }

  if (message.type === "audio") {
    return (
      <div className="flex items-center gap-2 min-w-[120px]">
        <WaveIcon playing={false} />
        <span className={cn("text-[14px]", self ? "text-white/90" : "text-[rgba(0,0,0,0.6)]")}>
          {(message as ChatMessage & { duration?: number }).duration
            ? `${Math.ceil(((message as ChatMessage & { duration?: number }).duration || 0) / 1000)}''`
            : "语音"}
        </span>
      </div>
    )
  }

  if (message.type === "changelog") {
    return <ChangelogCard content={message.content} />
  }

  if (message.type === "recalled") {
    return (
      <span className="italic opacity-70">
        {message.content}
      </span>
    )
  }

  return (
    <span className="whitespace-pre-wrap break-words">
      {message.content}
    </span>
  )
}

/* ========== 语音波形图标 ========== */

function WaveIcon({ playing }: { playing: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="2.5" height="8" rx="1.25" fill="currentColor" opacity={playing ? 1 : 0.7} />
      <rect x="9" y="5" width="2.5" height="14" rx="1.25" fill="currentColor" opacity={playing ? 1 : 0.85} />
      <rect x="14" y="7" width="2.5" height="10" rx="1.25" fill="currentColor" opacity={playing ? 1 : 1} />
      <rect x="19" y="9" width="2.5" height="6" rx="1.25" fill="currentColor" opacity={playing ? 1 : 0.7} />
    </svg>
  )
}

/* ========== 时间格式化 ========== */

function formatMessageTime(iso: string) {
  const d = new Date(iso)
  const h = d.getHours().toString().padStart(2, "0")
  const m = d.getMinutes().toString().padStart(2, "0")
  return `${h}:${m}`
}

export const ChatMessageList = memo(ChatMessageListInner)
