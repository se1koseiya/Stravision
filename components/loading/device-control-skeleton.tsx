"use client"

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Device Control 骨架屏 — 完全匹配真实页面布局
 * 真实布局：全屏 + 渐变背景 + PageHeader(72px) + 两栏(设备卡片 1fr + 右侧面板 440px)
 */
export function DeviceControlSkeleton() {
  return (
    <div className="relative min-h-screen w-screen h-screen overflow-hidden text-foreground">
      {/* 背景层 */}
      <div className="absolute inset-0 bg-[#F1EFEA] dark:bg-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(255,255,255,0.75),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(209,250,229,0.55),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(224,231,255,0.55),transparent_60%)] dark:bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(30,41,59,0.75),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(20,83,45,0.3),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(49,46,129,0.3),transparent_60%)]" />

      <div className="relative z-10 grid grid-rows-[72px_1fr] h-full w-full">
        {/* ===== PageHeader (72px) ===== */}
        <div className="flex items-center justify-between px-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="size-2 rounded-full" />
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="size-9 rounded-full" />
          </div>
        </div>

        {/* ===== Content ===== */}
        <div className="relative px-8 pb-8 pt-6 overflow-hidden h-full w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6 h-full">
            {/* 左栏：设备卡片 */}
            <div className="space-y-6 overflow-y-auto pr-2 pb-16">
              {/* Row 1: 3 设备卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="relative rounded-2xl border border-white/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-sm overflow-hidden h-[200px]">
                    <div className="absolute inset-0 opacity-20 dark:opacity-10" style={{ background: "radial-gradient(circle at 30% 30%, rgba(100,150,255,0.4) 0%, transparent 70%)" }} />
                    <div className="relative z-10 p-8 h-full flex flex-col justify-between">
                      <div>
                        <Skeleton className="h-5 w-12 rounded mb-3" />
                        <Skeleton className="h-6 w-32 mb-1" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Skeleton className="size-16 rounded-xl" />
                        <Skeleton className="size-12 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Row 2: 1 设备卡片 + RGB 控制 (2列宽) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative rounded-2xl border border-white/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-sm overflow-hidden h-[200px]">
                  <div className="absolute inset-0 opacity-20 dark:opacity-10" style={{ background: "radial-gradient(circle at 30% 30%, rgba(138,124,243,0.4) 0%, transparent 70%)" }} />
                  <div className="relative z-10 p-8 h-full flex flex-col justify-between">
                    <div>
                      <Skeleton className="h-5 w-12 rounded mb-3" />
                      <Skeleton className="h-6 w-36 mb-1" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="size-16 rounded-xl" />
                      <Skeleton className="size-12 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* RGB 控制 — 占2列 */}
                <div className="md:col-span-2 relative rounded-2xl border border-white/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-sm overflow-hidden min-h-[200px]">
                  <div className="absolute inset-0 opacity-20 dark:opacity-10" style={{ background: "radial-gradient(circle at 30% 30%, rgba(76,128,255,0.4) 0%, transparent 70%)" }} />
                  <div className="relative z-10 p-8 h-full flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1 space-y-4">
                      <Skeleton className="h-5 w-24 rounded mb-3" />
                      <Skeleton className="h-6 w-28 mb-4" />
                      <Skeleton className="w-full h-24 rounded-xl" />
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                      {[1, 2, 3].map((i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-8" />
                          </div>
                          <Skeleton className="h-3 w-full rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: 自动化策略 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="relative rounded-2xl border border-white/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-sm p-6 min-h-[180px]">
                    <div className="flex items-center gap-2 mb-3">
                      <Skeleton className="size-5 rounded" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-5 w-28 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-3/4 mb-4" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="size-8 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 右栏：440px 面板 */}
            <div className="rounded-[28px] bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/60 dark:border-slate-700/60 p-6 shadow-lg overflow-y-auto">
              {/* 实时数据标题 */}
              <Skeleton className="h-5 w-24 mb-4" />

              {/* 传感器数据卡片 */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-2xl bg-slate-50/80 dark:bg-slate-700/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="size-4 rounded" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    <Skeleton className="h-7 w-16 mb-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>

              {/* 设备状态 */}
              <Skeleton className="h-5 w-20 mb-4" />
              <div className="space-y-3 mb-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 dark:bg-slate-700/50">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-lg" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                ))}
              </div>

              {/* 快捷操作 */}
              <Skeleton className="h-5 w-20 mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
