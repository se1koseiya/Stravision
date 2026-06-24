"use client"

import Image from "next/image"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { cn } from "@/lib/utils"
import type { UserPublic } from "@/lib/db/user-service"

interface PageHeaderProps {
  user?: UserPublic | null
  title?: string
  subtitle?: string
  children?: React.ReactNode // 右侧额外元素
  className?: string
}

export function PageHeader({ 
  user, 
  title = "STRAVISION", 
  subtitle = "莓界 · 智慧农业平台",
  children,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn(
      "flex items-center justify-between px-4 md:px-8 bg-transparent z-20 h-[72px] w-full gap-2",
      className
    )}>
      {/* 左侧：Logo + 标题 */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="relative size-8 md:size-9 shrink-0">
          <Image src="/logo.png" alt="logo" fill className="object-contain" />
        </div>
        <div className="leading-tight hidden sm:block truncate">
          <div className="text-base font-bold tracking-wide truncate">
            {title}
          </div>
          <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
        </div>
      </div>
      
      {/* 中间：导航 */}
      <div className="hidden lg:flex justify-center flex-none">
        <PageNavigation />
      </div>
      
      {/* 右侧：统一结构 */}
      <div className="flex items-center justify-end gap-2 md:gap-3 flex-1 min-w-0 flex-nowrap shrink-0">
        {/* 页面特定的右侧元素 */}
        {children}
        
        {/* 用户头像菜单 */}
        {user && <UserAvatarMenu user={user} />}
      </div>
    </div>
  )
}
