"use client"

import { memo } from "react"
import { ChangelogCard } from "./changelog-card"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/lib/chat/chat-types"

interface MessageContentProps {
  message: ChatMessage
  onImageClick: (url: string) => void
}

/**
 * 消息正文渲染器
 *
 * 仅负责渲染消息体（文本 / 图片 / 视频 / 音频 / 更新日志 / 撤回），
 * 头像、发送者名称、时间戳、右键菜单等由 antdx Bubble.List 的 role 配置接管。
 */
export const MessageContent = memo(function MessageContent({
  message,
  onImageClick
}: MessageContentProps) {
  if (message.type === "image") {
    const url = message.file_url || message.content
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="图片"
        className="max-w-full rounded-[6px] cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => onImageClick(url)}
        loading="lazy"
      />
    )
  }

  if (message.type === "video") {
    return (
      <video
        controls
        src={message.file_url || message.content}
        className="max-w-full rounded-[6px] border border-black/[0.06] dark:border-white/[0.08]"
        preload="metadata"
      />
    )
  }

  if (message.type === "audio") {
    return (
      <audio
        controls
        src={message.file_url || message.content}
        className="max-w-full"
        preload="metadata"
      />
    )
  }

  if (message.type === "changelog") {
    return <ChangelogCard content={message.content} />
  }

  // 文本 / 撤回 / 默认
  return (
    <div
      className={cn(
        "whitespace-pre-wrap break-words",
        message.type === "recalled" && "italic opacity-60"
      )}
    >
      {message.content}
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.type === nextProps.message.type
  )
})
