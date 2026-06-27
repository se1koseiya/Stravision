"use client"

import { Sun, Moon, Sunrise, Sunset } from "lucide-react"
import { cn } from "@/lib/utils"
import { IOSWidgetCard } from "./ios-widget-card"
import { WidgetTrendChart } from "./widget-trend-chart"

interface LightWidgetProps {
  value: number
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

export function LightWidget({ 
  value, 
  size = 'medium', 
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: LightWidgetProps) {
  const getLightConfig = (lux: number) => {
    if (lux >= 50000) return {
      status: "明亮",
      label: "强光",
      colorClass: "text-amber-500",
      bgClass: "bg-amber-50 dark:bg-amber-900/30",
      hexColor: "#f59e0b"
    }
    if (lux >= 1000) return {
      status: "适中",
      label: "适中",
      colorClass: "text-yellow-500",
      bgClass: "bg-yellow-50 dark:bg-yellow-900/30",
      hexColor: "#eab308"
    }
    return {
      status: "昏暗",
      label: "昏暗",
      colorClass: "text-indigo-500",
      bgClass: "bg-indigo-50 dark:bg-indigo-900/30",
      hexColor: "#6366f1"
    }
  }

  const config = getLightConfig(value)
  const isSmall = size === 'small'
  const isDark = value < 1000

  const Header = (
    <div className="flex items-center gap-2">
      <div className={cn("p-2 rounded-full", config.bgClass)}>
        {isDark ? <Moon className={cn("w-4 h-4", config.colorClass)} /> : <Sun className={cn("w-4 h-4", config.colorClass)} />}
      </div>
      {!isSmall && (
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">光照强度</span>
      )}
    </div>
  )

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
                 {isDark ? <Moon className={cn("w-5 h-5", config.colorClass)} /> : <Sun className={cn("w-5 h-5", config.colorClass)} />}
              </div>
            </div>
            
            <div className="mt-auto">
              <div className="flex items-start">
                <span className="text-4xl font-bold tracking-tighter text-slate-900 dark:text-white">
                    {value >= 1000 ? (value / 1000).toFixed(1) : value}
                </span>
                <span className="text-sm font-medium mt-1 text-slate-400 ml-1">
                    {value >= 1000 ? 'k' : ''} lux
                </span>
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1 truncate">
                {config.status}
              </div>
            </div>
          </>
        )}

        {/* Medium Size - Trend Chart */}
        {size === 'medium' && (
          <div className="flex flex-col h-full w-full">
            <div className="flex items-end gap-2 mb-2">
                <div className="flex items-start">
                    <span className="text-5xl font-bold tracking-tighter text-slate-900 dark:text-white">
                         {value >= 1000 ? (value / 1000).toFixed(1) : value}
                    </span>
                    <span className="text-xl font-medium mt-1 text-slate-400 ml-2">
                         {value >= 1000 ? 'k lux' : 'lux'}
                    </span>
                </div>
                <div className="mb-2">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", config.bgClass, config.colorClass)}>
                      {config.label}
                    </span>
                </div>
            </div>
            
            <div className="flex-1 w-full relative min-h-0">
               <WidgetTrendChart type="light" color={config.hexColor} unit="lux" />
            </div>
          </div>
        )}

        {/* Large Size - Trend Chart + Details */}
        {size === 'large' && (
          <div className="flex flex-col h-full w-full">
             <div className="flex items-end justify-between mb-4">
                <div className="flex flex-col">
                    <div className="flex items-start">
                        <span className="text-6xl font-bold tracking-tighter text-slate-900 dark:text-white">
                             {value >= 1000 ? (value / 1000).toFixed(1) : value}
                        </span>
                        <span className="text-2xl font-medium mt-1 text-slate-400 ml-2">
                             {value >= 1000 ? 'k lux' : 'lux'}
                        </span>
                    </div>
                    <span className={cn("mt-1 text-sm font-medium", config.colorClass)}>{config.status} • {config.label}</span>
                </div>
                
                <div className="flex flex-col gap-2">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2 px-3 flex items-center gap-3">
                        <Sunrise className="w-4 h-4 text-amber-500" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">日出</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none">06:12 AM</span>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2 px-3 flex items-center gap-3">
                        <Sunset className="w-4 h-4 text-indigo-500" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">日落</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none">07:45 PM</span>
                        </div>
                    </div>
                </div>
             </div>
             
             <div className="flex-1 w-full relative min-h-0">
                <WidgetTrendChart type="light" color={config.hexColor} unit="lux" />
             </div>
          </div>
        )}
      </div>
    </IOSWidgetCard>
  )
}
