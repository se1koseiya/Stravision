"use client"

import { MessageSquare } from "lucide-react"

const ICON_STROKE = 1.75

/**
 * 空状态：未选择会话时展示
 */
export function ChatEmptyState({ isMobile: _isMobile = false }: { isMobile?: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-[#f5f6f7] flex items-center justify-center mb-4">
        <MessageSquare size={28} strokeWidth={ICON_STROKE} className="text-[rgba(0,0,0,0.25)]" />
      </div>
      <h2 className="text-base font-medium text-[rgba(0,0,0,0.65)] mb-1" style={{ fontWeight: 500 }}>
        选择一个会话开始聊天
      </h2>
      <p className="text-sm text-[rgba(0,0,0,0.45)]">
        从左侧选择好友或群组
      </p>
    </div>
  )
}
