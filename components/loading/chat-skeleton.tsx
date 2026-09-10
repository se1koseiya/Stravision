"use client"

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Chat 骨架屏 — 完全匹配真实页面布局
 * 真实布局：顶部 PageHeader(72px) + 左侧会话侧栏(64px 图标轨 + 280px 列表) + 右侧聊天区
 * （旧版是翡翠蓝渐变底 + 悬浮气泡，与真页面白底三栏完全对不上，已废弃）
 */
export function ChatSkeleton() {
  return (
    <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-white font-sans dark:bg-[#0a0a0a]">
      {/* ===== 顶部 PageHeader (72px) ===== */}
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-black/[0.06] px-4 md:px-8 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-[10px]" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="size-9 rounded-full" />
        </div>
      </div>

      {/* ===== 主区域 ===== */}
      <div className="flex min-h-0 flex-1">
        {/* 图标轨 (64px) */}
        <div className="flex w-16 shrink-0 flex-col items-center gap-3 border-r border-black/[0.06] pt-4 dark:border-white/[0.06]">
          <Skeleton className="size-10 rounded-xl" />
          <Skeleton className="size-10 rounded-xl opacity-70" />
          <Skeleton className="size-10 rounded-xl opacity-70" />
          <Skeleton className="mt-auto mb-4 size-10 rounded-full" />
        </div>

        {/* 会话列表 (280px) */}
        <div className="flex w-[280px] shrink-0 flex-col border-r border-black/[0.06] dark:border-white/[0.06]">
          {/* 搜索框 */}
          <div className="px-3 pb-2 pt-3">
            <Skeleton className="h-9 w-full rounded-lg bg-[#f2f3f5] dark:bg-white/[0.06]" />
          </div>
          {/* 会话项：头像 + 双行 */}
          <div className="min-h-0 flex-1 space-y-1 overflow-hidden px-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5" style={{ width: `${58 - (i % 3) * 8}%` }} />
                    <Skeleton className="h-2.5 w-8 opacity-60" />
                  </div>
                  <Skeleton className="h-3 w-[75%] opacity-60" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 聊天区 */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* 窗口顶栏 */}
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-black/[0.06] px-5 dark:border-white/[0.06]">
            <Skeleton className="size-9 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16 opacity-60" />
            </div>
            <div className="flex-1" />
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="size-8 rounded-lg" />
          </div>

          {/* 消息流 */}
          <div className="min-h-0 flex-1 space-y-5 overflow-hidden p-6">
            {/* 对方消息 */}
            <div className="flex items-start gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-9 w-64 rounded-2xl bg-[#f2f3f5] dark:bg-white/[0.06]" />
                <Skeleton className="h-9 w-48 rounded-2xl bg-[#f2f3f5] dark:bg-white/[0.06]" />
              </div>
            </div>
            {/* 自己消息 */}
            <div className="flex items-start justify-end gap-3">
              <Skeleton className="h-9 w-56 rounded-2xl" />
              <Skeleton className="size-9 shrink-0 rounded-full" />
            </div>
            {/* 对方消息 + 卡片 */}
            <div className="flex items-start gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-9 w-40 rounded-2xl bg-[#f2f3f5] dark:bg-white/[0.06]" />
                <Skeleton className="h-28 w-72 rounded-2xl bg-[#f2f3f5] dark:bg-white/[0.06]" />
              </div>
            </div>
            {/* 自己消息 */}
            <div className="flex items-start justify-end gap-3">
              <Skeleton className="h-9 w-36 rounded-2xl" />
              <Skeleton className="size-9 shrink-0 rounded-full" />
            </div>
          </div>

          {/* 输入区 */}
          <div className="shrink-0 border-t border-black/[0.06] p-4 dark:border-white/[0.06]">
            <div className="rounded-2xl border border-slate-200 p-3 dark:border-white/[0.08]">
              <Skeleton className="h-4 w-[55%]" />
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <Skeleton className="size-7 rounded-lg" />
                  <Skeleton className="size-7 rounded-lg" />
                </div>
                <Skeleton className="size-8 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
