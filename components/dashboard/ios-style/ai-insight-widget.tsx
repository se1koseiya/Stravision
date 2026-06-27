"use client"

import { Button } from "@/components/ui/button"
import { Sparkles, Brain, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Zap, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { IOSWidgetCard } from "./ios-widget-card"

interface AIInsightWidgetProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

interface InsightData {
  riskLevel: 'low' | 'medium' | 'high'
  insight: string
  recommendation: string
  confidence: number
}

export function AIInsightWidget({ 
  size = 'large', 
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress 
}: AIInsightWidgetProps) {
  const [data, setData] = useState<InsightData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchInsight = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/ai/daily-insight')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsight()
  }, [])

  const getRiskConfig = (level: string) => {
    switch (level) {
      case 'high':
        return {
          status: '高风险',
          icon: AlertTriangle,
          colorClass: 'text-red-500',
          bgClass: 'bg-red-50 dark:bg-red-900/30'
        }
      case 'medium':
        return {
          status: '警告',
          icon: TrendingUp,
          colorClass: 'text-orange-500',
          bgClass: 'bg-orange-50 dark:bg-orange-900/30'
        }
      case 'low':
        return {
          status: '健康',
          icon: CheckCircle,
          colorClass: 'text-primary',
          bgClass: 'bg-emerald-50 dark:bg-emerald-900/30'
        }
      default:
        return {
          status: '分析中',
          icon: Brain,
          colorClass: 'text-purple-500',
          bgClass: 'bg-purple-50 dark:bg-purple-900/30'
        }
    }
  }

  const config = getRiskConfig(data?.riskLevel || 'low')
  const Icon = config.icon
  const isSmall = size === 'small'

  const Header = (
    <div className="flex items-center gap-2 w-full">
      <div className={cn("p-2 rounded-full", config.bgClass)}>
        <Sparkles className={cn("w-4 h-4", config.colorClass)} />
      </div>
      {!isSmall && (
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">AI 洞察</span>
      )}
      <div className="ml-auto">
         <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
              onClick={fetchInsight}
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
         </Button>
      </div>
    </div>
  )

  if (error) {
     return (
        <IOSWidgetCard
          size={size}
          className={cn("bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border-0", className)}
          header={Header}
          isEditing={isEditing}
          widgetId={widgetId}
          onRemove={onRemove}
          onContextMenu={onContextMenu}
          onLongPress={onLongPress}
        >
           <div className="flex flex-col items-center justify-center h-full gap-2">
              <AlertTriangle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <span className="text-sm text-slate-500 dark:text-slate-400">服务不可用</span>
              <Button variant="outline" size="sm" onClick={fetchInsight} className="mt-2 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                 重试
              </Button>
           </div>
        </IOSWidgetCard>
     )
  }

  return (
    <IOSWidgetCard
      size={size}
      className={cn("bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border-0", className)}
      header={size !== 'small' ? Header : null}
      isEditing={isEditing}
      widgetId={widgetId}
      onRemove={onRemove}
      onContextMenu={onContextMenu}
      onLongPress={onLongPress}
    >
      <div className="flex flex-col h-full justify-between">
         {/* Small Size */}
         {size === 'small' && (
            <>
               <div className="flex justify-between items-start">
                  <div className={cn("p-2 rounded-full", config.bgClass)}>
                     <Brain className={cn("w-5 h-5", config.colorClass)} />
                  </div>
               </div>
               <div className="mt-auto">
                  <div className="text-lg font-bold leading-tight line-clamp-2 text-slate-900 dark:text-white">
                     {data?.riskLevel === 'low' ? '系统状态良好' : '需要处理'}
                  </div>
                  <div className="text-xs font-medium text-slate-500 mt-1">
                     {config.status}
                  </div>
               </div>
            </>
         )}

         {/* Medium Size */}
         {size === 'medium' && (
            <div className="flex flex-col h-full">
               <div className="flex items-center gap-3 mb-2">
                  <div className={cn("p-2 rounded-xl", config.bgClass)}>
                     <Icon className={cn("w-6 h-6", config.colorClass)} />
                  </div>
                  <div>
                     <h3 className="font-bold text-lg leading-none text-slate-900 dark:text-white">{data?.riskLevel === 'low' ? '一切正常' : '需要关注'}</h3>
                     <span className="text-xs text-slate-500 dark:text-slate-400">{config.status} • 置信度 {data?.confidence}%</span>
                  </div>
               </div>
               <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 line-clamp-3">
                     {data?.insight || "正在分析系统数据..."}
                  </p>
               </div>
            </div>
         )}

         {/* Large Size */}
         {size === 'large' && (
            <div className="flex flex-col h-full">
               <div className="flex flex-col items-center justify-center py-4">
                  <div className="relative">
                     <div className={cn("absolute inset-0 rounded-full blur-xl animate-pulse opacity-30", config.bgClass.replace('bg-', 'bg-'))} />
                     <Icon className={cn("w-16 h-16 relative z-10", config.colorClass)} />
                  </div>
                  <h3 className="text-2xl font-bold mt-4 text-slate-900 dark:text-white">{config.status}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">系统分析</p>
               </div>

               <div className="space-y-2 mt-2">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                     <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">分析洞察</span>
                     </div>
                     <p className="text-sm leading-snug text-slate-600 dark:text-slate-300">
                        {data?.insight || "正在收集数据以进行分析..."}
                     </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                     <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-3 h-3 text-blue-500" />
                        <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">建议方案</span>
                     </div>
                     <p className="text-sm leading-snug text-slate-600 dark:text-slate-300">
                        {data?.recommendation || "系统运行状况良好。"}
                     </p>
                  </div>
               </div>
            </div>
         )}
      </div>
    </IOSWidgetCard>
  )
}
