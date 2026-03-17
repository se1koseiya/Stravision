# 骨架屏加载指南

## 概述

骨架屏（Skeleton Screen）是一种提升用户体验的加载状态展示方式，通过显示页面结构的占位符，让用户感知内容正在加载，减少等待焦虑。

## 已实现的骨架屏组件

### 1. 基础组件

#### Skeleton
基础骨架屏组件，可用于任何需要加载状态的元素。

```tsx
import { Skeleton } from "@/components/ui/skeleton"

<Skeleton className="h-4 w-full" />
<Skeleton className="h-10 w-32 rounded-lg" />
```

### 2. 页面级骨架屏

#### PageSkeleton
通用页面骨架屏，适用于大多数页面。

```tsx
import { PageSkeleton } from "@/components/loading/page-skeleton"

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <YourContent />
    </Suspense>
  )
}
```

#### DashboardSkeleton
仪表盘专用骨架屏，包含统计卡片、图表等元素。

```tsx
import { DashboardSkeleton } from "@/components/loading/dashboard-skeleton"

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
```

#### MonitorSkeleton
监控页面专用骨架屏，包含 3D 模型区域、设备状态等。

```tsx
import { MonitorSkeleton } from "@/components/loading/monitor-skeleton"

export default function MonitorPage() {
  return (
    <Suspense fallback={<MonitorSkeleton />}>
      <MonitorContent />
    </Suspense>
  )
}
```

#### AIAssistantSkeleton
AI 助手页面专用骨架屏，包含聊天界面、侧边栏等。

```tsx
import { AIAssistantSkeleton } from "@/components/loading/ai-assistant-skeleton"

export default function AIAssistantPage() {
  return (
    <Suspense fallback={<AIAssistantSkeleton />}>
      <AIAssistantContent />
    </Suspense>
  )
}
```

### 3. 全屏加载组件

#### LoadingScreen
全屏加载界面，带进度条和动画。

```tsx
import { LoadingScreen } from "@/components/loading/loading-screen"

<LoadingScreen message="正在加载数据..." showProgress={true} />
```

#### LoadingSpinner
简单的加载旋转器。

```tsx
import { LoadingSpinner } from "@/components/loading/loading-screen"

<LoadingSpinner size="md" />
```

#### InlineLoading
行内加载指示器。

```tsx
import { InlineLoading } from "@/components/loading/loading-screen"

<InlineLoading text="加载中..." />
```

### 4. 3D 模型加载骨架屏

3D 模型组件已内置骨架屏，自动在加载时显示。

```tsx
import { GreenhouseModel } from "@/components/monitor/greenhouse-model"

// 自动显示骨架屏，无需额外配置
<GreenhouseModel 
  theme="dark"
  deviceData={data}
  onToggleRelay={handleToggle}
/>
```

## 使用场景

### 场景 1: 页面初始加载

```tsx
// app/dashboard/page.tsx
import { Suspense } from "react"
import { DashboardSkeleton } from "@/components/loading/dashboard-skeleton"
import DashboardContent from "@/components/dashboard/content"

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
```

### 场景 2: 数据加载

```tsx
"use client"

import { useState, useEffect } from "react"
import { InlineLoading } from "@/components/loading/loading-screen"

export function DataList() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData().then(result => {
      setData(result)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <InlineLoading text="加载数据中..." />
  }

  return <div>{/* 渲染数据 */}</div>
}
```

### 场景 3: 组件级加载

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export function UserCard({ loading, user }) {
  if (loading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <img src={user.avatar} className="h-12 w-12 rounded-full" />
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  )
}
```

### 场景 4: 列表加载

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export function ListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

## 最佳实践

### 1. 匹配实际布局

骨架屏应该尽可能接近实际内容的布局和尺寸。

```tsx
// ❌ 不好的做法
<Skeleton className="h-20 w-full" />

// ✅ 好的做法 - 匹配实际卡片布局
<div className="p-4 border rounded-lg">
  <Skeleton className="h-6 w-32 mb-2" />
  <Skeleton className="h-4 w-full mb-1" />
  <Skeleton className="h-4 w-3/4" />
</div>
```

### 2. 使用动画

添加脉冲动画让用户知道正在加载。

```tsx
// Skeleton 组件已内置 animate-pulse
<Skeleton className="h-4 w-full" />

// 自定义动画延迟
<Skeleton 
  className="h-4 w-full" 
  style={{ animationDelay: '200ms' }} 
/>
```

### 3. 渐进式加载

对于复杂页面，使用分阶段的骨架屏。

```tsx
export function ComplexPage() {
  const [headerLoaded, setHeaderLoaded] = useState(false)
  const [contentLoaded, setContentLoaded] = useState(false)

  return (
    <div>
      {!headerLoaded ? (
        <Skeleton className="h-16 w-full mb-4" />
      ) : (
        <Header />
      )}
      
      {!contentLoaded ? (
        <PageSkeleton />
      ) : (
        <Content />
      )}
    </div>
  )
}
```

### 4. 避免过度使用

不要在所有地方都使用骨架屏，对于快速加载的内容（< 200ms），直接显示即可。

```tsx
// ❌ 不必要的骨架屏
const [loading, setLoading] = useState(true)
useEffect(() => {
  // 同步操作，立即完成
  const data = localStorage.getItem('data')
  setLoading(false)
}, [])

// ✅ 直接显示
const data = localStorage.getItem('data')
```

### 5. 响应式设计

确保骨架屏在不同屏幕尺寸下都能正常显示。

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {[1, 2, 3, 4].map(i => (
    <Skeleton key={i} className="h-32 w-full rounded-lg" />
  ))}
</div>
```

## 性能优化

### 1. 懒加载骨架屏

对于大型骨架屏组件，使用动态导入。

```tsx
import dynamic from 'next/dynamic'

const DashboardSkeleton = dynamic(
  () => import('@/components/loading/dashboard-skeleton').then(mod => mod.DashboardSkeleton),
  { ssr: false }
)
```

### 2. 减少 DOM 节点

对于重复的骨架屏元素，使用循环而不是硬编码。

```tsx
// ❌ 不好
<Skeleton className="h-4 w-full mb-2" />
<Skeleton className="h-4 w-full mb-2" />
<Skeleton className="h-4 w-full mb-2" />

// ✅ 好
{[1, 2, 3].map(i => (
  <Skeleton key={i} className="h-4 w-full mb-2" />
))}
```

### 3. 使用 CSS 动画

优先使用 CSS 动画而不是 JavaScript 动画。

```tsx
// Skeleton 组件使用 Tailwind 的 animate-pulse
// 这是基于 CSS 的，性能更好
<Skeleton className="animate-pulse" />
```

## 自定义骨架屏

### 创建自定义骨架屏

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export function CustomCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      
      {/* Content */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      
      {/* Footer */}
      <div className="flex items-center gap-2 mt-4">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  )
}
```

### 带动画的自定义骨架屏

```tsx
export function AnimatedSkeleton() {
  return (
    <div className="relative overflow-hidden">
      <Skeleton className="h-32 w-full" />
      
      {/* 扫光效果 */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  )
}

// 在 tailwind.config.ts 中添加动画
{
  animation: {
    shimmer: 'shimmer 2s infinite'
  },
  keyframes: {
    shimmer: {
      '100%': { transform: 'translateX(100%)' }
    }
  }
}
```

## 故障排查

### 问题 1: 骨架屏闪烁

**原因**: 加载时间太短，骨架屏一闪而过。

**解决方案**: 添加最小显示时间。

```tsx
const [loading, setLoading] = useState(true)
const [minTimeElapsed, setMinTimeElapsed] = useState(false)

useEffect(() => {
  const timer = setTimeout(() => setMinTimeElapsed(true), 500)
  return () => clearTimeout(timer)
}, [])

const showSkeleton = loading || !minTimeElapsed
```

### 问题 2: 布局偏移

**原因**: 骨架屏和实际内容尺寸不匹配。

**解决方案**: 确保骨架屏尺寸与实际内容一致。

```tsx
// 使用相同的容器类名
<div className="h-64 w-full">
  {loading ? (
    <Skeleton className="h-full w-full" />
  ) : (
    <Content className="h-full w-full" />
  )}
</div>
```

### 问题 3: 性能问题

**原因**: 骨架屏组件过于复杂。

**解决方案**: 简化骨架屏结构。

```tsx
// ❌ 过于复杂
<div className="space-y-2">
  {Array.from({ length: 100 }).map(i => (
    <ComplexSkeleton key={i} />
  ))}
</div>

// ✅ 简化
<div className="space-y-2">
  {Array.from({ length: 10 }).map(i => (
    <Skeleton key={i} className="h-12 w-full" />
  ))}
</div>
```

## 总结

骨架屏是提升用户体验的重要工具，合理使用可以：
- ✅ 减少用户等待焦虑
- ✅ 提供视觉反馈
- ✅ 改善感知性能
- ✅ 减少布局偏移

记住：骨架屏应该简单、快速、匹配实际布局。

---

**相关文档**:
- [Next.js Suspense](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [React Suspense](https://react.dev/reference/react/Suspense)
- [Tailwind CSS Animation](https://tailwindcss.com/docs/animation)
