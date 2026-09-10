"use client"

import { Skeleton } from "@/components/ui/skeleton"

/**
 * 根路由骨架屏 — 对齐 landing-v4 的真实布局与配色
 * 真实布局：悬浮胶囊导航 + Hero（白底、居中标题 + 双 CTA + App 窗口）
 * （旧版是蓝色渐变 hero，跳转其它无 loading 的路由时会闪出风格割裂的骨架，已废弃）
 */
export function PageSkeleton() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-white font-sans text-[#222222] dark:bg-[#0C110E] dark:text-slate-100">
      {/* 悬浮胶囊导航 */}
      <header className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-between px-6 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-[10px]" />
          <Skeleton className="h-4 w-12 hidden sm:block" />
        </div>
        {/* 居中胶囊菜单 */}
        <div className="hidden items-center gap-1 rounded-full bg-white/80 px-2 py-1.5 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-xl lg:flex dark:bg-[#161B17] dark:ring-white/[0.06]">
          <Skeleton className="h-8 w-14 rounded-full" />
          <Skeleton className="h-8 w-14 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-8 hidden sm:block" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </header>

      {/* Hero：居中标题 + CTA + App 窗口 */}
      <section className="flex flex-col items-center px-6 pb-24 pt-36">
        <Skeleton className="mb-4 h-3 w-24 rounded-full" />
        <Skeleton className="mb-3 h-12 w-[30rem] max-w-full rounded-xl" />
        <Skeleton className="mb-8 h-12 w-[22rem] max-w-full rounded-xl" />
        <div className="mb-14 flex items-center justify-center gap-4">
          <Skeleton className="h-12 w-40 rounded-full" />
          <Skeleton className="h-12 w-36 rounded-full" />
        </div>
        {/* App 窗口占位：交通灯 + 侧栏 + 对话区 */}
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-100 shadow-[0_32px_80px_-20px_rgba(15,23,42,0.15)] dark:border-white/[0.06]">
          <div className="flex h-10 items-center gap-2 px-4">
            <Skeleton className="size-2.5 rounded-full" />
            <Skeleton className="size-2.5 rounded-full" />
            <Skeleton className="size-2.5 rounded-full" />
          </div>
          <div className="grid h-[26rem] grid-cols-[10rem_1fr] gap-3 p-4">
            <div className="space-y-2 rounded-xl bg-slate-50 p-2.5 dark:bg-white/[0.04]">
              <Skeleton className="h-8 w-full rounded-lg" />
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full rounded-lg opacity-80" />
              ))}
            </div>
            <div className="space-y-4 rounded-xl border border-slate-100 p-4 dark:border-white/[0.05]">
              <div className="flex items-center justify-end gap-2">
                <Skeleton className="h-8 w-[46%] rounded-[18px]" />
                <Skeleton className="size-8 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="size-[30px] rounded-full" />
                <div className="flex-1 space-y-2.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-2.5 w-24" />
                  <Skeleton className="h-2.5 w-[90%]" />
                  <Skeleton className="h-2.5 w-[70%]" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Skeleton className="h-8 w-[38%] rounded-[18px]" />
                <Skeleton className="size-8 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="size-[30px] rounded-full" />
                <div className="flex-1 space-y-2.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-2.5 w-[85%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 后续 section 简单占位（与页面同底色，不闪块） */}
      <div className="h-[40rem] bg-white dark:bg-[#0C110E]" />
      <div className="h-[40rem] bg-slate-50/60 dark:bg-white/[0.02]" />
    </main>
  )
}
