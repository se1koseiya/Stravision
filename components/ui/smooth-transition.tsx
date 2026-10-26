"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface SmoothTransitionProps {
  loading: boolean
  skeleton: React.ReactNode
  children: React.ReactNode
  className?: string
  minLoadingTime?: number
}

export function SmoothTransition({ 
  loading, 
  skeleton, 
  children, 
  className,
  minLoadingTime = 300 
}: SmoothTransitionProps) {
  const [showSkeleton, setShowSkeleton] = useState(loading)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (loading) {
      setShowSkeleton(true)
      setIsTransitioning(false)
    } else {
      // 确保最小加载时间，避免闪烁
      const timer = setTimeout(() => {
        setIsTransitioning(true)
        // 过渡动画完成后隐藏骨架屏
        setTimeout(() => {
          setShowSkeleton(false)
          setIsTransitioning(false)
        }, 300)
      }, minLoadingTime)

      return () => clearTimeout(timer)
    }
  }, [loading, minLoadingTime])

  return (
    <div className={cn("relative", className)}>
      {/* 骨架屏 */}
      <div 
        className={cn(
          "transition-all duration-300 ease-out",
          showSkeleton ? "opacity-100" : "opacity-0 pointer-events-none",
          isTransitioning && "scale-105"
        )}
      >
        {skeleton}
      </div>

      {/* 实际内容 */}
      <div 
        className={cn(
          "transition-all duration-300 ease-out",
          !showSkeleton ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0",
          !showSkeleton && !isTransitioning && "animate-in fade-in slide-in-from-bottom-4 duration-500"
        )}
      >
        {children}
      </div>
    </div>
  )
}

// 简化版本 - 只有淡入淡出
export function FadeTransition({ 
  loading, 
  skeleton, 
  children, 
  className 
}: Omit<SmoothTransitionProps, 'minLoadingTime'>) {
  return (
    <div className={cn("relative", className)}>
      {loading ? (
        <div className="animate-in fade-in duration-300">
          {skeleton}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {children}
        </div>
      )}
    </div>
  )
}

// 页面级过渡
export function PageTransition({ 
  loading, 
  skeleton, 
  children 
}: Omit<SmoothTransitionProps, 'className' | 'minLoadingTime'>) {
  return (
    <div className="min-h-screen">
      {loading ? (
        <div className="animate-in fade-in duration-500">
          {skeleton}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      )}
    </div>
  )
}