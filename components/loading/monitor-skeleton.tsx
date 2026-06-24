"use client"

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Monitor 骨架屏 — 完全匹配真实页面布局
 * 真实布局：三栏 — 左侧设备控制(320px) + 中间3D模型(flex-1) + 右侧系统信息(360px)
 * 背景：#F1EFEA + 渐变光晕 + DailyBriefingIsland
 */
export function MonitorSkeleton() {
  return (
    <div className="relative min-h-screen w-full text-foreground overflow-hidden">
      {/* 背景层 */}
      <div className="absolute inset-0 bg-[#F1EFEA] dark:bg-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(255,255,255,0.75),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(209,250,229,0.55),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(224,231,255,0.55),transparent_60%)] dark:bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(30,41,59,0.75),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(20,83,45,0.3),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(49,46,129,0.3),transparent_60%)]" />

      {/* DailyBriefingIsland 占位 */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50">
        <Skeleton className="h-9 w-64 rounded-full" />
      </div>

      {/* Logo 左上角 */}
      <div className="fixed top-4 left-6 z-50 flex items-center gap-4">
        <Skeleton className="size-12 rounded-xl" />
        <div>
          <Skeleton className="h-3.5 w-20 mb-1" />
          <Skeleton className="h-2.5 w-28" />
        </div>
      </div>

      {/* 三栏布局 */}
      <div className="relative flex min-h-screen w-full gap-6 px-4 pb-4 pt-16 lg:px-6 lg:pb-6 lg:pt-20">

        {/* ===== 左栏：设备控制 (320px) ===== */}
        <div className="w-[320px] flex flex-col gap-8 shrink-0 h-[calc(100vh-100px)] overflow-y-auto pr-2">
          {/* 监控设备 */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="size-8 rounded" />
            </div>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-[22px] bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/60 dark:border-slate-700/60 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-4">
                      <Skeleton className="size-12 rounded-2xl" />
                      <div>
                        <Skeleton className="h-4 w-20 mb-1" />
                        <div className="flex items-center gap-2 mt-1">
                          <Skeleton className="size-1.5 rounded-full" />
                          <Skeleton className="h-3 w-10" />
                        </div>
                        <Skeleton className="h-3 w-16 mt-2" />
                      </div>
                    </div>
                    <Skeleton className="size-8 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 环境控制 */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="size-8 rounded" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-[28px] bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/60 dark:border-slate-700/60 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-[1fr_64px]">
                    <div className="p-5">
                      <div className="flex flex-col gap-4">
                        <Skeleton className="size-12 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-3 w-12 mt-1" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="size-8 rounded-full" />
                          <Skeleton className="size-8 rounded-full" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-between py-3 border-l border-white/60 dark:border-slate-700/60">
                      <Skeleton className="h-5 w-8" />
                      <Skeleton className="h-3 w-10" />
                      <Skeleton className="h-28 w-10 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== 中栏：3D 模型 (flex-1) ===== */}
        <div className="flex-1 flex flex-col relative rounded-[44px] bg-[#EDEBE6]/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-start p-6 pb-0 z-10">
            <div>
              <Skeleton className="h-10 w-36 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-16 rounded-full" />
              <Skeleton className="h-9 w-16 rounded-full" />
              <Skeleton className="h-9 w-16 rounded-full" />
            </div>
          </div>

          {/* 3D 模型占位 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="relative size-16 mx-auto">
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                  <Skeleton className="size-full rounded-2xl opacity-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
          </div>

          {/* 底部传感器信息 */}
          <div className="absolute bottom-6 left-6 rounded-[18px] bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/70 dark:border-slate-700/70 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-10" />
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-600" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>

          {/* 底部导航栏 */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center items-end">
            <div className="flex items-center gap-4">
              <div className="bg-white/75 dark:bg-slate-800/75 backdrop-blur-xl rounded-full p-1.5 shadow-lg border border-white/70 dark:border-slate-700/70 flex gap-1">
                <Skeleton className="h-10 w-16 rounded-full" />
                <Skeleton className="h-10 w-16 rounded-full" />
                <Skeleton className="h-10 w-16 rounded-full" />
              </div>
              <Skeleton className="size-12 rounded-2xl" />
            </div>
          </div>
        </div>

        {/* ===== 右栏：系统信息 (360px) ===== */}
        <div className="w-[360px] flex flex-col gap-8 shrink-0 rounded-[44px] bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/60 dark:border-slate-700/60 p-8 shadow-lg h-[calc(100vh-120px)] overflow-y-auto">
          {/* 顶部：主题切换 + 用户头像 */}
          <div className="flex items-center justify-between shrink-0">
            <Skeleton className="h-10 w-[72px] rounded-full" />
            <Skeleton className="size-10 rounded-full" />
          </div>

          {/* 传感器数据 */}
          <div>
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="grid grid-cols-2 gap-3">
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
          </div>

          {/* 成员面板 */}
          <div>
            <Skeleton className="h-5 w-16 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-16 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* 活动面板 */}
          <div>
            <Skeleton className="h-5 w-20 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="size-8 rounded-lg mt-0.5" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
