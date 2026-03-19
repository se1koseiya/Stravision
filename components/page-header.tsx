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
      "relative flex items-center px-8 border-b border-black/5 dark:border-white/10 bg-white/50 backdrop-blur-sm dark:bg-slate-900/50 z-20",
      className
    )}>
      <div className="flex items-center gap-4">
        <div className="relative size-12 shrink-0">
          <Image src="/icon.png" alt="logo" fill className="object-contain" />
        </div>
        <div className="leading-tight">
          <div className="text-base font-bold tracking-wide">
            {title}
          </div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <ElderFriendlyToggle showButton={false} className="ml-2" />
      </div>
      
      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
        <PageNavigation />
      </div>
      
      <div className="ml-auto flex items-center gap-3">
        <ElderFriendlyToggle showBadge={false} />
        {children}
        {user && <UserAvatarMenu user={user} />}
      </div>
    </div>
  )
}