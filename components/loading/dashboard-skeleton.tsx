"use client"

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Dashboard 骨架屏 — 完全匹配真实页面布局
 * 真实布局：全屏 + 渐变背景 + DailyBriefingIsland + PageHeader(72px) + TopBanner + GridLayout(12列)
 */
export function DashboardSkeleton() {
  return (
    <div className="relative min-h-screen w-screen h-screen overflow-hidden text-foreground">
      {/* 背景层 */}
      <div className="absolute inset-0 bg-[#F5F7FA] dark:bg-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(255,255,255,0.8),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(240,253,244,0.6),transparent_55%)] dark:bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(30,41,59,0.8),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(20,83,45,0.3),transparent_55%)]" />

      {/* DailyBriefingIsland 占位 */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
        <Skeleton className="h-9 w-64 rounded-full" />
      </div>

      {/* Grid: Header + Content */}
      <div className="relative grid grid-rows-[72px_1fr] h-full w-full">
        {/* ===== PageHeader (72px) ===== */}
        <div className="flex items-center justify-between px-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex items-center gap-3">
            {/* 连接状态 */}
            <Skeleton className="size-2 rounded-full" />
            {/* 视图切换 */}
            <Skeleton className="size-8 rounded-lg" />
            {/* 编辑按钮 */}
            <Skeleton className="size-8 rounded-lg" />
            {/* 用户头像 */}
            <Skeleton className="size-9 rounded-full" />
          </div>
        </div>

        {/* ===== Dashboard Content ===== */}
        <div className="relative px-8 pb-8 pt-6 overflow-y-auto h-full w-full">
          <div className="w-full max-w-[1600px] mx-auto mb-6">
            {/* TopBanner */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm p-5 flex items-center gap-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-xl" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="flex-1" />
              {/* 天气/环境指标 */}
              <div className="flex items-center gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="size-5 rounded" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* GridLayout — 12列 widget 网格骨架 */}
          <div className="w-full min-h-full" style={{ position: "relative" }}>
            {/* 模拟 GridLayout 的 widget 布局 */}
            <div className="grid grid-cols-12 gap-4">
              {/* AI Insight — 宽4格 高1格 */}
              <div className="col-span-4 row-span-1">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm p-4 h-32">
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="size-5 rounded" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>

              {/* Temperature — 宽3格 */}
              <div className="col-span-3 row-span-1">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm p-4 h-32">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="size-5 rounded" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>

              {/* Humidity — 宽3格 */}
              <div className="col-span-3 row-span-1">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm p-4 h-32">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="size-5 rounded" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>

              {/* Membership — 宽2格 */}
              <div className="col-span-2 row-span-1">
                <div className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-indigo-500/20 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm p-4 h-32">
                  <Skeleton className="size-6 rounded-full mb-2" />
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>

              {/* Light — 宽3格 */}
              <div className="col-span-3 row-span-1">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm p-4 h-32">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="size-5 rounded" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>

              {/* CO2 — 宽3格 */}
              <div className="col-span-3 row-span-1">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm p-4 h-32">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="size-5 rounded" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>

              {/* Soil — 宽3格 */}
              <div className="col-span-3 row-span-1">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm p-4 h-32">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="size-5 rounded" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>

              {/* Weather — 宽3格 */}
              <div className="col-span-3 row-span-1">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm p-4 h-32">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="size-5 rounded" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>

              {/* DashboardChartCard — 宽6格 高2格 */}
              <div className="col-span-6 row-span-2">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm p-5 h-[232px]">
                  <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-7 w-24 rounded-lg" />
                  </div>
                  <Skeleton className="h-40 w-full rounded-xl" />
                </div>
              </div>

              {/* SpectralCard — 宽6格 高2格 */}
              <div className="col-span-6 row-span-2">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm p-5 h-[232px]">
                  <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-7 w-24 rounded-lg" />
                  </div>
                  <Skeleton className="h-40 w-full rounded-xl" />
                </div>
              </div>

              {/* Nutrient — 宽4格 */}
              <div className="col-span-4 row-span-1">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm p-4 h-32">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="size-5 rounded" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>

              {/* IOS Widget — 宽4格 */}
              <div className="col-span-4 row-span-1">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm p-4 h-32">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="size-5 rounded" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>

              {/* IOS Widget — 宽4格 */}
              <div className="col-span-4 row-span-1">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm p-4 h-32">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="size-5 rounded" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
