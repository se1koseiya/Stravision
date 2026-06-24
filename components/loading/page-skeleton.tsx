"use client"

import { Skeleton } from "@/components/ui/skeleton"

/**
 * 首页 Landing 骨架屏 — 匹配 Hero section 布局
 * 真实布局：固定导航栏 + Hero section (蓝色渐变背景 + 标题 + CTA)
 */
export function PageSkeleton() {
  return (
    <main className="relative bg-white dark:bg-slate-950 text-[#0a0a0a] dark:text-slate-100 font-sans overflow-x-clip min-h-screen">
      {/* 固定导航栏 */}
      <header className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 md:px-8 py-4 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-5 w-20 hidden sm:block" />
          </div>

          {/* Center Nav */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-1 bg-white/15 dark:bg-slate-800/50 backdrop-blur-xl rounded-full px-2 py-1.5">
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-12 rounded-full" />
              <Skeleton className="h-8 w-12 rounded-full" />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-8 hidden sm:block" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>
      </header>

      {/* Hero Section — 蓝色渐变背景 */}
      <section className="relative w-full flex flex-col pt-24 pb-32 bg-gradient-to-b from-[#6fbcf8] via-[#85c8f9] to-[#b4defb] dark:from-slate-800 dark:via-slate-700 dark:to-slate-900 overflow-hidden">
        <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
          {/* 标题 */}
          <Skeleton className="h-16 w-[500px] mx-auto mb-4" />
          <Skeleton className="h-8 w-[400px] mx-auto mb-8" />

          {/* CTA 按钮 */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <Skeleton className="h-12 w-40 rounded-full" />
            <Skeleton className="h-12 w-32 rounded-full" />
          </div>

          {/* 产品截图/预览 */}
          <Skeleton className="h-[400px] w-full max-w-4xl mx-auto rounded-2xl" />
        </div>
      </section>

      {/* 后续 section 简单占位 */}
      <div className="h-[600px] bg-white dark:bg-slate-950" />
      <div className="h-[600px] bg-gray-50 dark:bg-slate-900" />
      <div className="h-[600px] bg-white dark:bg-slate-950" />
    </main>
  )
}
