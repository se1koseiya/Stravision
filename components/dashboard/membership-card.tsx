"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Crown, Zap, Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { IOSWidgetCard } from "./ios-style/ios-widget-card"

interface QuotaInfo {
  daily_limit: number
  daily_usage: number
  balance: number
  can_use: boolean
}

interface MembershipCardProps {
  className?: string
  size?: 'small' | 'medium' | 'large'
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

export function MembershipCard({ 
  className, 
  size = 'medium',
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: MembershipCardProps) {
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/user/settings')
        const data = await res.json()
        if (data.user) setUser(data.user)
        if (data.quota) setQuota(data.quota)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return (
    <IOSWidgetCard 
      size={size} 
      className={cn("animate-pulse bg-slate-100", className)}
      isEditing={isEditing}
      widgetId={widgetId}
      onRemove={onRemove}
      onContextMenu={onContextMenu}
      onLongPress={onLongPress}
    >
       <div className="h-full flex flex-col justify-center items-center">
          <div className="h-6 w-1/3 bg-slate-200 rounded mb-4"></div>
          <div className="h-10 w-2/3 bg-slate-200 rounded"></div>
       </div>
    </IOSWidgetCard>
  )

  const membership = user?.membership || 'free'
  const isPlus = membership === 'plus'
  const isPro = membership === 'pro'
  const isFree = membership === 'free'
  const isSmall = size === 'small'

  // Update styles to match the White/Emerald theme
  const cardStyle = isPlus 
      ? "bg-white border-2 border-violet-100 text-slate-900" 
      : isPro 
      ? "bg-white border-2 border-amber-100 text-slate-900" 
      : "bg-white text-slate-900"

  const iconBg = isPlus ? "bg-violet-50 text-violet-600" : isPro ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-600"

  const Header = (
    <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-full", iconBg)}>
            {isPlus ? <Crown className="size-4 fill-current" /> :
             isPro ? <Sparkles className="size-4 fill-current" /> :
             <Zap className="size-4" />}
          </div>
          {!isSmall && (
            <span className="font-bold tracking-tight text-slate-900">
                {isPlus ? 'PLUS 会员' : isPro ? 'PRO 会员' : '免费计划'}
            </span>
          )}
        </div>
        {!isSmall && (
            <Link href="/profile" className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-0.5 transition-colors pointer-events-auto z-50 relative">
            详情 <ChevronRight className="size-3" />
            </Link>
        )}
    </div>
  )

  return (
    <IOSWidgetCard 
        size={size} 
        className={cn("shadow-sm border-0", cardStyle, className)}
        header={Header}
        isEditing={isEditing}
        widgetId={widgetId}
        onRemove={onRemove}
        onContextMenu={onContextMenu}
        onLongPress={onLongPress}
    >
      <div className="flex flex-col h-full justify-between">
         {/* Small Size */}
         {isSmall && (
             <>
                <div className="mt-auto">
                    <div className="text-2xl font-bold text-slate-900">
                        {isPlus ? 'PLUS' : isPro ? 'PRO' : '基础'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {isPlus ? '无限制' : `${quota?.daily_usage || 0}/${quota?.daily_limit || 0}`} 次AI调用
                    </div>
                </div>
             </>
         )}

         {/* Medium/Large Size */}
         {!isSmall && (
             <div className="flex flex-col h-full">
                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">每日 AI 额度</span>
                        <span className="font-bold text-2xl text-slate-900">
                        {isPlus ? '∞' : `${quota?.daily_usage || 0} / ${quota?.daily_limit || 0}`}
                        </span>
                    </div>
                    
                    {!isPlus && (
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div 
                            className={cn("h-full transition-all duration-500 ease-out rounded-full", isPro ? "bg-amber-500" : "bg-slate-800")}
                            style={{ width: `${Math.min(100, quota?.daily_limit ? ((quota.daily_usage / quota.daily_limit) * 100) : 0)}%` }}
                        />
                        </div>
                    )}
                    {isPlus && (
                        <div className="h-2 w-full rounded-full bg-violet-100 animate-pulse" />
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-2">
                        {isFree ? (
                            <>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> 基础监测
                                </div>
                                <Button size="sm" variant="secondary" className="w-full h-8 text-xs bg-slate-900 text-white hover:bg-slate-800 shadow-none col-span-2 mt-1 rounded-full">
                                    升级 <Sparkles className="ml-1 size-3" />
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                    <Check className={cn("size-3", isPlus ? "text-violet-500" : "text-amber-500")} /> {isPlus ? '无限制 AI' : '70次 AI/天'}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                    <Check className={cn("size-3", isPlus ? "text-violet-500" : "text-amber-500")} /> {isPlus ? '全天候自动' : '数据分析'}
                                </div>
                            </>
                        )}
                    </div>
                </div>
             </div>
         )}
      </div>
    </IOSWidgetCard>
  )
}
