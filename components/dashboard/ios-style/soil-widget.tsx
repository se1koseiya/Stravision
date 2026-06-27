"use client"

import { Droplets, Sprout, Leaf } from "lucide-react"
import { cn } from "@/lib/utils"
import { IOSWidgetCard } from "./ios-widget-card"
import { WidgetTrendChart } from "./widget-trend-chart"

interface SoilWidgetProps {
  moisture: number
  fertility?: number
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

export function SoilWidget({ 
  moisture, 
  fertility = 0, 
  size = 'medium', 
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: SoilWidgetProps) {
  const getSoilConfig = (moisture: number, fertility: number) => {
    const avgHealth = (moisture + fertility) / 2
    if (avgHealth >= 60) return {
      status: "健康",
      label: "土壤健康",
      colorClass: "text-primary",
      bgClass: "bg-emerald-50 dark:bg-emerald-900/30",
      hexColor: "#10b981"
    }
    if (avgHealth >= 30) return {
      status: "一般",
      label: "一般",
      colorClass: "text-amber-500",
      bgClass: "bg-amber-50 dark:bg-amber-900/30",
      hexColor: "#f59e0b"
    }
    return {
      status: "较差",
      label: "贫瘠",
      colorClass: "text-stone-500",
      bgClass: "bg-stone-100 dark:bg-stone-800/50",
      hexColor: "#78716c"
    }
  }

  const config = getSoilConfig(moisture, fertility)
  const isSmall = size === 'small'

  const Header = (
    <div className="flex items-center gap-2">
      <div className={cn("p-2 rounded-full", config.bgClass)}>
        <Leaf className={cn("w-4 h-4", config.colorClass)} />
      </div>
      {!isSmall && (
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">土壤水分</span>
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
                <Leaf className={cn("w-5 h-5", config.colorClass)} />
              </div>
            </div>
            
            <div className="mt-auto">
              <div className="flex items-start">
                <span className="text-3xl font-bold tracking-tighter text-slate-900 dark:text-white">{moisture}</span>
                <span className="text-xs font-medium mt-1 text-slate-400 ml-1">%</span>
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1 truncate">
                水分
              </div>
            </div>
          </>
        )}

        {/* Medium Size - Trend Chart */}
        {size === 'medium' && (
          <div className="flex flex-col h-full w-full">
             <div className="flex items-end gap-2 mb-2">
              <div className="flex items-start">
                <span className="text-5xl font-bold tracking-tighter text-slate-900 dark:text-white">{moisture}</span>
                <span className="text-xl font-medium mt-1 text-slate-400 ml-2">%</span>
              </div>
              <div className="mb-2">
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", config.bgClass, config.colorClass)}>
                  {config.label}
                </span>
              </div>
            </div>
            
            <div className="flex-1 w-full relative min-h-0">
               <WidgetTrendChart type="soilMoisture" color={config.hexColor} unit="%" />
            </div>
          </div>
        )}

        {/* Large Size - Trend Chart + Details */}
        {size === 'large' && (
          <div className="flex flex-col h-full w-full">
             <div className="flex items-end justify-between mb-4">
                <div className="flex flex-col">
                    <div className="flex items-start">
                        <span className="text-6xl font-bold tracking-tighter text-slate-900 dark:text-white">{moisture}</span>
                        <span className="text-3xl font-medium mt-1 text-slate-400 ml-2">%</span>
                    </div>
                    <span className={cn("mt-1 text-sm font-medium", config.colorClass)}>{config.status} • {config.label}</span>
                </div>

                <div className="flex gap-4 bg-slate-50 dark:bg-slate-800 rounded-2xl p-3">
                   <div className="flex flex-col items-center">
                      <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">水分</span>
                      <span className="text-lg font-bold text-primary">{moisture}%</span>
                   </div>
                   <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-700" />
                   <div className="flex flex-col items-center">
                      <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">肥力</span>
                      <span className="text-lg font-bold text-amber-500">{fertility}%</span>
                   </div>
                </div>
             </div>
             
             <div className="flex-1 w-full relative min-h-0">
                <WidgetTrendChart type="soilMoisture" color={config.hexColor} unit="%" />
             </div>
          </div>
        )}
      </div>
    </IOSWidgetCard>
  )
}
