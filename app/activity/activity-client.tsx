"use client"

/**
 * 全平台活动流页面
 *
 * - 顶部导航（PageHeader 模式）
 * - Hero 区：标题 + 简介 + 关键统计
 * - 主体两栏布局：
 *   - 左：ActivityFeed scope="visible"（当前用户可见的全部活动）
 *   - 右：InvitationList（待处理邀请）
 */

import { useState, useCallback } from "react"
import Image from "next/image"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { App as AntApp } from "antd"
import ActivityFeed from "@/components/kb/activity-feed"
import InvitationList from "@/components/kb/invitation-list"
import type { UserPublic } from "@/lib/db/user-service"
import { cn } from "@/lib/utils"
import { IconChartLine, IconMail, IconRefresh, IconRemind } from "@/components/icon";

interface ActivityPageClientProps {
  user: UserPublic
}

export default function ActivityPageClient({ user }: ActivityPageClientProps) {
  const { message } = AntApp.useApp()
  const [activityCount, setActivityCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

  const handleActivityCountChange = useCallback((count: number) => {
    setActivityCount(count)
  }, [])

  const handlePendingCountChange = useCallback((count: number) => {
    setPendingCount(count)
  }, [])

  const handleInvitationChange = useCallback(() => {
    // InvitationList 内部会自动刷新；此处仅做提示
    // 也可在此处触发 ActivityFeed 的刷新（通过 key 状态）
  }, [])

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full h-[72px] px-4 md:px-8 flex items-center justify-between z-50 bg-[#FAFAFA]/80 dark:bg-[#050505]/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative size-9 shrink-0">
            <Image src="/logo.png" alt="Logo" fill className="object-contain" />
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="text-base font-semibold tracking-wide">活动动态</div>
            <div className="text-xs text-muted-foreground">莓界 · 协作与知识库活动</div>
          </div>
        </div>

        <div className="hidden lg:flex justify-center flex-none">
          <PageNavigation />
        </div>

        <div className="flex items-center justify-end gap-2 md:gap-3 flex-1 min-w-0 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-zinc-500 hover:text-[#1677ff]"
            title="通知"
          >
            <IconRemind className="size-4" />
          </Button>
          <UserAvatarMenu user={user} />
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-32 pb-8 px-4 md:px-8 bg-white dark:bg-black/20 border-b border-zinc-100 dark:border-zinc-900">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-px w-6 bg-[#1677ff]/40" />
                <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#1677ff]">
                  Activity Feed
                </span>
              </div>
              <h1 className="text-3xl md:text-[40px] font-semibold tracking-tight leading-tight">
                活动动态
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-xl">
                实时跟踪你在知识库与协作中的全部操作动态，包括文档编辑、邀请、协作者变更等。
              </p>
            </div>

            <div className="flex items-center gap-4 md:gap-6 pb-1">
              <StatCard
                icon={<IconChartLine size={16} className="text-[#1677ff]" />}
                label="可见活动"
                value={activityCount}
              />
              <Divider />
              <StatCard
                icon={<IconMail size={16} className="text-[#fa8c16]" />}
                label="待处理邀请"
                value={pendingCount}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左：活动流 */}
          <section className="lg:col-span-8">
            <div
              className="bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 overflow-hidden"
              style={{ borderRadius: 12 }}
            >
              <ActivityFeed
                scope="visible"
                limit={30}
                height="calc(100vh - 320px)"
                onItemCountChange={handleActivityCountChange}
              />
            </div>
          </section>

          {/* 右：邀请列表 */}
          <aside className="lg:col-span-4">
            <div
              className="bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 overflow-hidden sticky top-[88px]"
              style={{ borderRadius: 12 }}
            >
              <InvitationList
                showTabs
                defaultTab="pending"
                limit={20}
                inline
                onInvitationChange={handleInvitationChange}
                onPendingCountChange={handlePendingCountChange}
                onOpenCollection={(collectionId) => {
                  message.info(`已接受邀请，前往知识库 #${collectionId}`)
                }}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

// ===== 内部组件 =====

function StatCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="size-9 rounded-full bg-[#1677ff]/8 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-[11px] text-zinc-500 uppercase tracking-wider">
          {label}
        </div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
}
