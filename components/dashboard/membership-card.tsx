"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Sparkles, Crown, Zap, Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface QuotaInfo {
  daily_limit: number
  daily_usage: number
  balance: number
  can_use: boolean
}

export function MembershipCard({ className }: { className?: string }) {
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
    <Card className={cn("h-full border-0 shadow-sm bg-muted/20 animate-pulse", className)}>
       <CardHeader><div className="h-6 w-1/3 bg-muted rounded"></div></CardHeader>
       <CardContent><div className="h-20 bg-muted rounded"></div></CardContent>
    </Card>
  )

  const membership = user?.membership || 'free'
  const isPlus = membership === 'plus'
  const isPro = membership === 'pro'
  const isFree = membership === 'free'

  return (
    <Card className={cn("relative overflow-hidden h-full border-0 shadow-md group hover:shadow-lg transition-all duration-300", className)}>
      {/* Background Gradients */}
      <div className={cn(
        "absolute inset-0 z-0 opacity-10 transition-opacity duration-500",
        isPlus ? "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-600 via-indigo-400 to-transparent" :
        isPro ? "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500 via-orange-400 to-transparent" :
        "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-300 via-zinc-100 to-transparent dark:from-zinc-700 dark:via-zinc-800"
      )} />
      
      <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", 
            isPlus ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" : 
            isPro ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" : 
            "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          )}>
            {isPlus ? <Crown className="size-5 fill-current" /> :
             isPro ? <Sparkles className="size-5 fill-current" /> :
             <Zap className="size-5" />}
          </div>
          
          <span className={cn(
            "bg-clip-text text-transparent bg-gradient-to-r font-extrabold tracking-tight",
            isPlus ? "from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400" :
            isPro ? "from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400" :
            "from-zinc-600 to-zinc-800 dark:from-zinc-400 dark:to-zinc-200"
          )}>
            {isPlus ? 'PLUS 尊享会员' : isPro ? 'PRO 专业会员' : '普通用户'}
          </span>
        </CardTitle>
        <Link href="/profile" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
          详情 <ChevronRight className="size-3" />
        </Link>
      </CardHeader>

      <CardContent className="relative z-10 space-y-5">
        {/* Quota Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm items-end">
            <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">今日 AI 额度</span>
            <span className={cn("font-bold text-lg", 
               isPlus ? "text-violet-600 dark:text-violet-400" : 
               isPro ? "text-amber-600 dark:text-amber-400" : 
               "text-zinc-600 dark:text-zinc-400"
            )}>
              {isPlus ? '∞ 无限' : `${quota?.daily_usage || 0} / ${quota?.daily_limit || 0}`}
            </span>
          </div>
          {!isPlus && (
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div 
                 className={cn("h-full transition-all duration-500 ease-out rounded-full",
                    isPro ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-zinc-500"
                 )}
                 style={{ width: `${Math.min(100, quota?.daily_limit ? ((quota.daily_usage / quota.daily_limit) * 100) : 0)}%` }}
              />
            </div>
          )}
          {isPlus && (
             <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500 opacity-20 animate-pulse" />
          )}
        </div>

        {/* Benefits List */}
        <div className="space-y-3 pt-1">
          {isFree && (
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                 <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" /> 基础设备监控
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                 <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" /> 有限历史数据
              </div>
            </div>
          )}
          {isPro && (
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                 <Check className="size-3.5 text-amber-500" /> 每日 70 次 AI 对话
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                 <Check className="size-3.5 text-amber-500" /> 智能农业分析报告
              </div>
            </div>
          )}
          {isPlus && (
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-violet-700 dark:text-violet-300">
                 <Check className="size-3.5 text-violet-500" /> 无限 AI 对话次数
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-violet-700 dark:text-violet-300">
                 <Check className="size-3.5 text-violet-500" /> 全天候智能托管
              </div>
            </div>
          )}
        </div>
        
        {isFree && (
           <Button size="sm" className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-md hover:shadow-lg hover:from-amber-600 hover:to-orange-700 transition-all">
             升级解锁 AI 功能 <Sparkles className="ml-1 size-3.5 fill-white/20" />
           </Button>
        )}
      </CardContent>
    </Card>
  )
}