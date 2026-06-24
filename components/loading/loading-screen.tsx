"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface LoadingScreenProps {
  message?: string
  showProgress?: boolean
}

export function LoadingScreen({ message = "正在准备", showProgress = true }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!showProgress) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 10
      })
    }, 300)

    return () => clearInterval(interval)
  }, [showProgress])

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center z-50">
      <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        {/* Logo Animation */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 animate-pulse" />
          <div className="absolute inset-2 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Loading" 
              className="w-12 h-12 object-contain"
            />
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {message}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            正在为您准备最佳体验
          </p>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="w-64 mx-auto space-y-2">
            <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Loading Dots */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

// Minimal Loading Spinner
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4"
  }

  return (
    <div className={`${sizeClasses[size]} border-slate-200 dark:border-slate-700 border-t-emerald-500 rounded-full animate-spin`} />
  )
}

// Inline Loading
export function InlineLoading({ text = "正在加载" }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <LoadingSpinner size="sm" />
      <span className="text-sm text-slate-600 dark:text-slate-400">{text}</span>
    </div>
  )
}
