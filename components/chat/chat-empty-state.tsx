"use client"

import { EmptyState } from "@/components/illustration"

/**
 * 空状态：未选择会话时展示
 *
 * 2026-10-04：把原先「16px 灰底图标 + 两行字」换成项目自带的 IconPark 插画。
 * `public/illustrations/iconpark/` 下的 25 张插画早就落盘（`components/illustration.tsx`
 * 也早封装好了 `EmptyState`），但此前**全站零使用** —— 空态因此成了最"干巴巴"的一环。
 */
export function ChatEmptyState({ isMobile: _isMobile = false }: { isMobile?: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-br-surface px-8">
      <EmptyState
        illustration="empty-list"
        illustrationWidth={200}
        title="选择一个会话开始聊天"
        description="从左侧选择好友或群组"
      />
    </div>
  )
}
