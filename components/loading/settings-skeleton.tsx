"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <Skeleton className="h-12 w-48 mb-3" />
          <Skeleton className="h-5 w-80" />
        </div>

        {/* Settings Form */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl shadow-lg border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          {/* Tabs */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-24 rounded-lg" />
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="p-8 space-y-8">
            {/* Profile Section */}
            <div className="space-y-6">
              <Skeleton className="h-7 w-32" />
              
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-9 w-32 rounded-lg" />
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </div>

            {/* Preferences Section */}
            <div className="space-y-6 pt-8 border-t border-zinc-200 dark:border-zinc-800">
              <Skeleton className="h-7 w-40" />
              
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* API Keys Section */}
            <div className="space-y-6 pt-8 border-t border-zinc-200 dark:border-zinc-800">
              <Skeleton className="h-7 w-32" />
              
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <Skeleton className="h-5 w-24 mb-3" />
                    <div className="flex gap-3">
                      <Skeleton className="h-12 flex-1 rounded-lg" />
                      <Skeleton className="h-12 w-24 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-8 border-t border-zinc-200 dark:border-zinc-800">
              <Skeleton className="h-14 w-32 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}