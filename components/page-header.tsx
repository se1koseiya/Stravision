"use client"

import Image from "next/image"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { ElderFriendlyToggle } from "@/components/elder-friendly-toggle"
import { cn } from "@/lib/utils"
import type { UserPublic } from "@/lib/db/user-service"

interface PageHeaderProps {
  user?: UserPublic | null
  title?: string
  subtitle?: string
  children?: React.ReactNode
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
      "flex items-center justify-between px-4 md:px-8 border-b border-black/5 dark:border-white/10 bg-white/50 backdrop-blur-sm dark:bg-slate-900/50 z-20 h-[72px] w-full gap-2",
      className
    )}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="relative size-10 md:size-12 shrink-0">
          <Image src="/icon.png" alt="logo" fill className="object-contain" />
        </div>
        <div className="leading-tight hidden sm:block truncate">
          <div className="text-base font-bold tracking-wide truncate">
            {title}
          </div>
          <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
        </div>
        <ElderFriendlyToggle showButton={false} className="ml-2 hidden xl:flex" />
      </div>
      
      <div className="hidden lg:flex justify-center flex-none">
        <PageNavigation />
      </div>
      
      <div className="flex items-center justify-end gap-2 md:gap-4 flex-1 min-w-0 flex-nowrap shrink-0 overflow-x-auto hide-scrollbar pb-1 -mb-1">
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <ElderFriendlyToggle showBadge={false} className="hidden sm:flex" />
          {children}
          {user && <UserAvatarMenu user={user} />}
        </div>
      </div>
    </div>
  )
}