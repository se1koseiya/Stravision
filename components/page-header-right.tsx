"use client"

import { cn } from "@/lib/utils"
import type { MembershipTier } from "@/lib/db/user-service"

interface PageHeaderRightProps {
  // 连接状态
  connectionStatus?: {
    connected: boolean
    error?: string
  }
  
  // 会员信息（保留但不显示，用于后续可能的功能）
  membership?: MembershipTier
  
  // 额外的操作按钮/组件
  children?: React.ReactNode
  
  className?: string
}

export function PageHeaderRight({
  connectionStatus,
  children,
  className
}: PageHeaderRightProps) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 shrink-0",
      className
    )}>
      {/* 连接状态指示器 - 极简小圆点 */}
      {connectionStatus && (
        <div 
          className={cn(
            "size-2 rounded-full shrink-0",
            connectionStatus.connected 
              ? "bg-green-500 animate-pulse" 
              : "bg-red-500"
          )}
          title={connectionStatus.connected ? "设备已连接" : connectionStatus.error || "设备未连接"}
        />
      )}
      
      {/* 页面特定的元素 */}
      {children}
    </div>
  )
}