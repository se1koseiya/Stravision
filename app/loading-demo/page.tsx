"use client"

import { useState } from "react"
import { 
  Skeleton, 
  LoadingScreen, 
  LoadingSpinner, 
  InlineLoading,
  DashboardSkeleton,
  MonitorSkeleton,
  AIAssistantSkeleton
} from "@/components/loading"

export default function LoadingDemoPage() {
  const [showFullScreen, setShowFullScreen] = useState(false)
  const [activeDemo, setActiveDemo] = useState<string>("basic")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">骨架屏加载演示</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          查看不同场景下的加载状态展示
        </p>

        {/* Demo Selector */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {[
            { id: "basic", label: "基础组件" },
            { id: "dashboard", label: "仪表盘" },
            { id: "monitor", label: "监控页面" },
            { id: "ai", label: "AI 助手" },
          ].map((demo) => (
            <button
              key={demo.id}
              onClick={() => setActiveDemo(demo.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeDemo === demo.id
                  ? "bg-emerald-500 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              {demo.label}
            </button>
          ))}
        </div>

        {/* Demo Content */}
        <div className="space-y-8">
          {activeDemo === "basic" && <BasicDemo />}
          {activeDemo === "dashboard" && <DashboardSkeleton />}
          {activeDemo === "monitor" && <MonitorSkeleton />}
          {activeDemo === "ai" && <AIAssistantSkeleton />}
        </div>
      </div>

      {showFullScreen && (
        <LoadingScreen message="加载中..." showProgress={true} />
      )}
    </div>
  )
}

function BasicDemo() {
  return (
    <div className="space-y-8">
      {/* Skeleton Examples */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">基础 Skeleton 组件</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium mb-3 text-slate-600 dark:text-slate-400">文本骨架</h3>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-3 text-slate-600 dark:text-slate-400">卡片骨架</h3>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </section>

      {/* Loading Spinners */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">加载指示器</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <h3 className="text-sm font-medium mb-3">小尺寸</h3>
            <LoadingSpinner size="sm" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-medium mb-3">中尺寸</h3>
            <LoadingSpinner size="md" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-medium mb-3">大尺寸</h3>
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </section>

      {/* Inline Loading */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">行内加载</h2>
        <InlineLoading text="正在加载数据..." />
      </section>
    </div>
  )
}
