"use client"

import { memo, useCallback, useEffect, useRef, useState } from "react"
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
 * - 画布底色走 --br-surface / --br-canvas（亮暗同源）
 * - 大圆角气泡（20px左右）
 * - 自己：品牌实色气泡（--br-bubble / --br-bubble-ink），头像在右
 * - 对方：surface-3 浅底气泡 + text-1 文字，头像在左
 *   （2026-10-22 用户要求「聊天页去掉所有渐变」：原 #059669→#4cabff 斜向渐变已删）
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
      className="flex-1 min-h-0 overflow-y-auto bg-br-surface"
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
          // 判断是否需要显示时间分隔：第一条 / 间隔超 5 分钟 / 跨天
          const gap = prevMsg ? toMs(msg.created_at) - toMs(prevMsg.created_at) : Infinity
          const crossedDay = prevMsg
            ? new Date(toMs(msg.created_at)).toDateString() !== new Date(toMs(prevMsg.created_at)).toDateString()
            : false
          const shouldShowTime = !prevMsg || crossedDay || gap > 5 * 60 * 1000
          // 连续同一发送者不重复显示名字
          const showSenderName = !isDirect && !self && sender && (!prevMsg || Number(prevMsg.sender_id) !== Number(msg.sender_id) || shouldShowTime)

          return (
            <div key={msg.id}>
              {shouldShowTime && (
                <div className="flex justify-center py-4">
                  <span className="text-[13px] text-br-text-3">
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
        <div className="max-w-[70%] px-4 py-2.5 text-[14px] leading-[1.5] break-words text-br-bubble-ink bg-br-bubble rounded-[20px] shadow-br-sm">
          <MessageBody message={message} self={true} onImageClick={onImageClick} />
        </div>
        {/* 头像 */}
        {showAvatar ? (
          <Avatar
            size={40}
            src={avatarUrl || undefined}
            className="shrink-0"
            style={{
              backgroundColor: "var(--br-brand-soft)",
              color: "var(--br-brand-ink)",
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
            backgroundColor: "var(--br-surface-3)",
            color: "var(--br-text-2)",
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
          <span className="text-[12px] text-br-text-3 px-1">
            {sender?.username}
          </span>
        )}
        <div
          className="px-4 py-2.5 text-[14px] leading-[1.5] break-words text-br-text-1 bg-br-surface-3 dark:bg-br-surface-4 rounded-[20px]"
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
    return <ChatImage url={url} onOpen={onImageClick} />
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
    const src = message.file_url || message.content
    /* 只有 http(s)/相对路径才是可播放源。历史数据里存过 blob: / data: 的一次性地址，
       那些必然播不出来 —— 直接给「语音已过期」文案，好过让用户点一个死按钮。 */
    const playable = /^(https?:|\/(?!\/))/.test(src || "")
    if (!playable) {
      return (
        <div className="flex items-center gap-2 min-w-[120px] opacity-70">
          <WaveIcon playing={false} />
          <span className={cn("text-[14px]", self ? "text-white/85" : "text-br-text-3")}>
            语音已失效
          </span>
        </div>
      )
    }
    return <VoiceBubble src={src} self={self} fallbackDuration={(message as ChatMessage & { duration?: number }).duration} />
  }

  if (message.type === "changelog") {
    return <ChangelogCard content={message.content} />
  }

  /* 文件消息：旧实现落到默认分支只显示一行「[文件]」文字，链接全丢。
     有 file_url 就渲染成可下载的文件条，没有才退回纯文本。 */
  if (message.type === "file") {
    const url = message.file_url
    if (!url) {
      return <span className="whitespace-pre-wrap break-words">{message.content}</span>
    }
    const name = message.content && !message.content.startsWith("[")
      ? message.content
      : decodeURIComponent(url.split("/").pop() || "文件")
    return (
      <a
        href={url}
        download={name}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "flex items-center gap-2 min-w-[150px] py-0.5 transition-opacity hover:opacity-80",
          self ? "text-white" : "text-br-text-1"
        )}
      >
        <span className={cn(
          "size-8 shrink-0 rounded-lg flex items-center justify-center",
          self ? "bg-white/20" : "bg-br-brand-soft text-br-brand-ink"
        )}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M14 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 3h8l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] truncate max-w-[180px]">{name}</span>
          <span className={cn("block text-[11px]", self ? "text-white/70" : "text-br-text-3")}>点击下载</span>
        </span>
      </a>
    )
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

/* ========== 语音气泡（可播放） ==========
 * 之前 audio 类型只渲染一行「语音」文字，点不动 —— 上传播放链路改好后
 * 顺手把播放器补上：点击播放/暂停，波形跳动，右侧显示时长。
 */
function VoiceBubble({
  src, self, fallbackDuration
}: {
  src: string
  self: boolean
  fallbackDuration?: number
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(fallbackDuration ? fallbackDuration / 1000 : 0)

  const toggle = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      void el.play()
    } else {
      el.pause()
    }
  }, [])

  return (
    <div className="flex items-center gap-2 min-w-[96px]">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "暂停语音" : "播放语音"}
        className={cn(
          "size-7 shrink-0 rounded-full flex items-center justify-center transition-colors",
          self
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-br-brand-soft hover:bg-br-brand/20 text-br-brand-ink"
        )}
      >
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" rx="1.2" />
            <rect x="14" y="5" width="4" height="14" rx="1.2" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5.5v13a1 1 0 0 0 1.5.87l10-6.5a1 1 0 0 0 0-1.74l-10-6.5A1 1 0 0 0 8 5.5z" />
          </svg>
        )}
      </button>
      <span className={cn("shrink-0", self ? "text-white" : "text-br-brand-ink")}>
        <WaveIcon playing={playing} />
      </span>
      <span className={cn("text-[13px] tabular-nums", self ? "text-white/85" : "text-br-text-2")}>
        {duration > 0 ? `${Math.max(1, Math.round(duration))}"` : "语音"}
      </span>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d) && d > 0) setDuration(d)
        }}
      />
    </div>
  )
}

/* ========== 图片消息（失败兜底） ==========
 * 旧实现 src 死链时浏览器只剩一个破图标，用户完全不知道发生了什么
 * （历史上发过的 blob: 消息、文件被清理后的老消息都会命中）。
 */
function ChatImage({ url, onOpen }: { url: string; onOpen: (url: string) => void }) {
  const [broken, setBroken] = useState(false)

  if (broken) {
    return (
      <div className="-mx-2 -my-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-[16px] text-[13px] text-br-text-3 bg-br-surface-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <path d="M3 15l4-4 4 4 3-3 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          图片已失效
        </div>
      </div>
    )
  }

  return (
    <div className="-mx-2 -my-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="图片"
        className="max-w-full max-h-[300px] rounded-[16px] cursor-pointer hover:opacity-95 transition-opacity block"
        onClick={() => onOpen(url)}
        onError={() => setBroken(true)}
        loading="lazy"
      />
    </div>
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

const pad2 = (n: number) => n.toString().padStart(2, "0")

/**
 * created_at 可能是「秒级时间戳 / 毫秒级时间戳 / ISO 字符串」三种形态之一
 * （后端 pg 的 timestamptz 走 JSON 会变 ISO，历史数据里还有纯数字）。
 * 统一归一成毫秒再算，否则秒级会被当成 1970 年 —— 与 formatChatTime 保持同一套判据。
 */
function toMs(ts: string | number): number {
  if (typeof ts === "number") return ts < 1e12 ? ts * 1000 : ts
  const asNum = Number(ts)
  if (Number.isFinite(asNum) && /^\d+$/.test(ts)) return asNum < 1e12 ? asNum * 1000 : asNum
  return new Date(ts).getTime()
}

/**
 * 时间分隔标签：只印「14:32」时，翻到昨天的消息完全看不出是哪天。
 * 这里按「今天 / 昨天 / 今年 / 往年」四档给出可辨识的日期。
 */
function formatMessageTime(iso: string | number) {
  const ms = toMs(iso)
  if (!Number.isFinite(ms)) return ""
  const d = new Date(ms)
  const now = new Date()
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dayDiff = Math.floor((startOfToday - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000)

  if (dayDiff === 0) return hm
  if (dayDiff === 1) return `昨天 ${hm}`
  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
}

export const ChatMessageList = memo(ChatMessageListInner)
