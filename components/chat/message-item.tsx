"use client"

import { memo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCheck } from "@/components/animate-ui/icons/check-check"
import { MessageContextMenu } from "./message-context-menu"
import { ChangelogCard } from "./changelog-card"
import { cn } from "@/lib/utils"

interface User {
  id: number
  username: string
  avatar_url: string | null
}

interface Message {
  id: number
  sender_id: number
  content: string
  type?: string
  file_url?: string | null
  created_at: number
}

interface MessageItemProps {
  message: Message
  isMe: boolean
  sender?: User | null
  showSenderName?: boolean
  onRecall: (messageId: number) => void
  onImageClick: (url: string) => void
}

const formatTime = (timestamp: number) => {
  if (!timestamp) return ""
  const date = new Date(Number(timestamp))
  if (isNaN(date.getTime())) return ""

  const now = new Date()

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString()
}

export const MessageItem = memo(function MessageItem({
  message,
  isMe,
  sender,
  showSenderName = false,
  onRecall,
  onImageClick
}: MessageItemProps) {
  return (
    <MessageContextMenu
      message={message}
      isMe={isMe}
      onRecall={onRecall}
    >
      <div
        id={`msg-${message.id}`}
        className={cn("flex w-full gap-3 transition-all", isMe ? "flex-row-reverse" : "flex-row")}
      >
        {!isMe && (
          <Avatar className="h-8 w-8 mt-1 flex-shrink-0 border border-black/10 dark:border-white/10">
            <AvatarImage src={sender?.avatar_url || undefined} />
            <AvatarFallback>{sender?.username?.[0]}</AvatarFallback>
          </Avatar>
        )}
        <div className={cn("flex flex-col max-w-[75%]", isMe ? "items-end" : "items-start")}>
          {!isMe && showSenderName && (
            <span className="text-xs text-muted-foreground ml-1 mb-1">{sender?.username}</span>
          )}
          <div className={cn(
            "relative text-[16px] leading-[1.6]",
            message.type === 'recalled' && "italic opacity-60",
            isMe
              ? "bg-[#f4f4f4] dark:bg-[#2f2f2f] text-zinc-900 dark:text-zinc-100 rounded-3xl px-5 py-2.5 shadow-none min-w-[80px]"
              : "bg-transparent text-zinc-800 dark:text-zinc-200 px-2 py-1"
          )}>
            {message.type === 'image' ? (
              <img
                src={message.file_url || message.content}
                alt="Image"
                className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onImageClick(message.file_url || message.content)}
                loading="lazy"
              />
            ) : message.type === 'video' ? (
              <video
                controls
                src={message.file_url || message.content}
                className="max-w-full rounded-lg shadow-sm border border-black/5 dark:border-white/5"
                preload="metadata"
              />
            ) : message.type === 'audio' ? (
              <audio controls src={message.file_url || message.content} className="max-w-full" preload="metadata" />
            ) : message.type === 'changelog' ? (
              <ChangelogCard content={message.content} />
            ) : (
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
            )}

            <div className={cn("flex items-center gap-1 mt-1 text-[10px]", isMe ? "text-blue-100 justify-end" : "text-slate-400")}>
              <span>{formatTime(message.created_at)}</span>
              {isMe && <CheckCheck className="h-3 w-3" />}
            </div>
          </div>
        </div>
      </div>
    </MessageContextMenu>
  )
}, (prevProps, nextProps) => {
  // 自定义比较函数，只在这些属性变化时才重新渲染
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.type === nextProps.message.type &&
    prevProps.isMe === nextProps.isMe &&
    prevProps.sender?.id === nextProps.sender?.id
  )
})
