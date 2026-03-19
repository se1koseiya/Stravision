"use client"

import { memo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Message {
  id: number
  content: string
  created_at: number
}

interface ChatListItemProps {
  id: number
  name: string
  avatarUrl: string | null
  lastMessage?: Message
  unreadCount?: number
  isActive: boolean
  isGroup?: boolean
  isMobile?: boolean
  onClick: () => void
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

export const ChatListItem = memo(function ChatListItem({
  id,
  name,
  avatarUrl,
  lastMessage,
  unreadCount,
  isActive,
  isGroup = false,
  isMobile = false,
  onClick
}: ChatListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-3 rounded-2xl text-left transition-all duration-200",
        isMobile 
          ? "bg-white/50 dark:bg-white/5 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-white/60 dark:border-white/10 mb-3 active:scale-[0.98]" 
          : (isActive ? "bg-black/5 dark:bg-white/5 shadow-inner" : "hover:bg-black/5 dark:hover:bg-white/5")
      )}
    >
      <div className="relative">
        <Avatar className="h-12 w-12 border border-black/10 dark:border-white/10">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className={cn(
            "font-bold",
            isGroup 
              ? "bg-orange-100 text-orange-600" 
              : "bg-blue-100 text-blue-600"
          )}>
            {name[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <span className="font-bold text-foreground truncate">{name}</span>
          <span className="text-xs text-muted-foreground">
            {lastMessage ? formatTime(lastMessage.created_at) : ''}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground truncate block max-w-[180px]">
            {lastMessage ? lastMessage.content : (isGroup ? "暂无消息" : "")}
          </span>
          {unreadCount ? (
            <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
              {unreadCount}
            </Badge>
          ) : null}
        </div>
      </div>
    </button>
  )
}, (prevProps, nextProps) => {
  // 只在这些关键属性变化时才重新渲染
  return (
    prevProps.id === nextProps.id &&
    prevProps.name === nextProps.name &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.unreadCount === nextProps.unreadCount &&
    prevProps.lastMessage?.id === nextProps.lastMessage?.id &&
    prevProps.lastMessage?.content === nextProps.lastMessage?.content
  )
})
