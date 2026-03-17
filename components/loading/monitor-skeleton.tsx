"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function MonitorSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      {/* Header */}
      <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Model Area */}
        <div className="lg:col-span-2 animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
              <Skeleton className="h-9 w-32 rounded-lg" />
            </div>

            {/* 3D Canvas Area */}
            <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
              {/* Loading Animation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  {/* Animated 3D Cube */}
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <div className="absolute inset-0 animate-spin">
                      <Skeleton className="h-full w-full rounded-2xl" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-48 mx-auto mb-2" />
                  <Skeleton className="h-4 w-64 mx-auto" />
                </div>
              </div>

              {/* Floating Device Markers */}
              <div className="absolute top-4 left-4">
                <Skeleton className="h-11 w-11 rounded-full" />
              </div>
              <div className="absolute top-1/4 right-8">
                <Skeleton className="h-11 w-11 rounded-full" />
              </div>
              <div className="absolute bottom-1/4 left-1/3">
                <Skeleton className="h-11 w-11 rounded-full" />
              </div>
              <div className="absolute bottom-8 right-1/4">
                <Skeleton className="h-11 w-11 rounded-full" />
              </div>
            </div>

            {/* Bottom Info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
          {/* Device Status */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-800/50">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Sensor Data */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-800/50">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <Skeleton className="h-8 w-8 rounded-lg mb-2" />
                  <Skeleton className="h-7 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </div>

          {/* Camera Feed */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-800/50">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="aspect-video w-full rounded-xl" />
            <div className="flex items-center justify-between mt-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
