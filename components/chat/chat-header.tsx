"use client"

import { memo } from "react"
import { Avatar } from "antd"
import { ChevronDown, ChevronLeft } from "lucide-react"
import type { ChatGroup, ChatGroupMember, ChatTarget, ChatUser } from "@/lib/chat/chat-types"

interface ChatHeaderProps {
  target: ChatTarget
  isMobile: boolean
  isTyping: boolean
  groupMembers: ChatGroupMember[]
  onBack: () => void
  onOpenSearch: () => void
  onToggleDetails: () => void
  onClearHistory?: () => void
  onToggleBlock?: (userId: number, block: boolean) => void
}

const ICON_STROKE = 1.75

/**
 * 聊天区顶栏（蓝聊设计稿严格复刻）
 *
 * 结构：
 * - 左侧：名称（20px字重500），移动端显示返回箭头
 * - 右侧：对方头像 + 下拉箭头（点击展开/收起详情面板）
 */
function ChatHeaderInner({
  target,
  isMobile,
  isTyping: _isTyping,
  groupMembers: _groupMembers,
  onBack,
  onToggleDetails
}: ChatHeaderProps) {
  const isDirect = target.kind === "direct"
  const friend: ChatUser | undefined = isDirect ? target.friend : undefined
  const group: ChatGroup | undefined = !isDirect ? target.group : undefined

  const avatarUrl = isDirect ? friend?.avatar_url : group?.avatar_url
  const displayName = isDirect ? friend?.username : group?.name

  return (
    <div className="flex items-center justify-between shrink-0 h-14 px-5 border-b border-black/[0.06] bg-white">
      {/* 左侧：移动端返回 + 名称 */}
      <div className="flex items-center gap-2 min-w-0">
        {isMobile && (
          <button
            onClick={onBack}
            className="-ml-1 size-8 flex items-center justify-center rounded-full hover:bg-black/[0.04] shrink-0"
          >
            <ChevronLeft size={20} strokeWidth={ICON_STROKE} className="text-[rgba(0,0,0,0.65)]" />
          </button>
        )}
        <h2
          className="text-[20px] text-[rgba(0,0,0,0.88)] leading-none truncate"
          style={{ fontWeight: 500 }}
        >
          {displayName}
        </h2>
      </div>

      {/* 右侧：对方头像 + 下拉箭头（点击展开详情面板） */}
      <button
        onClick={onToggleDetails}
        className="flex items-center gap-1 px-1 py-1 rounded-full hover:bg-black/[0.04] transition-colors"
      >
        <Avatar
          size={40}
          src={avatarUrl || undefined}
          className="shrink-0"
          style={{
            backgroundColor: isDirect ? "#e6f4ff" : "#fff7e6",
            color: isDirect ? "#1677ff" : "#fa8c16",
            fontWeight: 500
          }}
        >
          {displayName?.[0]?.toUpperCase()}
        </Avatar>
        <ChevronDown size={14} strokeWidth={ICON_STROKE} className="text-[rgba(0,0,0,0.4)] mr-0.5" />
      </button>
    </div>
  )
}

export const ChatHeader = memo(ChatHeaderInner)
