"use client"

import { Droplets, Waves } from "lucide-react"
import { cn } from "@/lib/utils"
import { IOSWidgetCard } from "./ios-widget-card"
import { WidgetTrendChart } from "./widget-trend-chart"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"

interface HumidityWidgetProps {
  value: number
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

export function HumidityWidget({ 
  value, 
  size = 'medium', 
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: HumidityWidgetProps) {
  const { isElderFriendlyMode } = useElderFriendly()
  
  const getHumidityConfig = (humidity: number) => {
    if (humidity >= 60) return {
      status: "潮湿",
      label: "潮湿",
      colorClass: "text-blue-500",
      bgClass: "bg-blue-50",
      hexColor: "#3b82f6"
    }
    if (humidity >= 40) return {
      status: "舒适",
      label: "舒适",
      colorClass: "text-sky-500",
      bgClass: "bg-sky-50",
      hexColor: "#0ea5e9"
    }
    if (humidity >= 20) return {
      status: "偏干",
      label: "偏干",
      colorClass: "text-cyan-500",
      bgClass: "bg-cyan-50",
      hexColor: "#06b6d4"
    }
    return {
      status: "干燥",
      label: "干燥",
      colorClass: "text-amber-500",
      bgClass: "bg-amber-50",
      hexColor: "#f59e0b"
    }
  }

  const config = getHumidityConfig(value)
  const isSmall = size === 'small'

  const Header = (
    <div className="flex items-center gap-2">
      <div className={cn("p-2 rounded-full", config.bgClass)}>
        <Droplets className={cn("w-4 h-4", config.colorClass)} />
      </div>
      {!isSmall && (
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">环境湿度</span>
      )}
    </div>
  )

  return (
    <IOSWidgetCard
      size={size}
      className={cn("bg-white text-slate-900 shadow-sm border-0", className)}
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
                <Droplets className={cn("w-5 h-5", config.colorClass)} />
              </div>
            </div>
            
            <div className="mt-auto">
              <div className="flex items-start">
                <span className={cn(
                  "font-bold tracking-tighter text-slate-900",
                  isElderFriendlyMode ? "text-5xl" : "text-4xl"
                )}>{value.toFixed(0)}</span>
                <span className={cn(
                  "font-medium mt-1 text-slate-400",
                  isElderFriendlyMode ? "text-2xl" : "text-xl"
                )}>%</span>
              </div>
              <div className={cn(
                "font-medium text-slate-500 mt-1 truncate",
                isElderFriendlyMode ? "text-base" : "text-xs"
              )}>
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
                    <span className="text-5xl font-bold tracking-tighter text-slate-900">{value.toFixed(1)}</span>
                    <span className="text-2xl font-medium mt-1 text-slate-400">%</span>
                </div>
                <div className="mb-2">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", config.bgClass, config.colorClass)}>
                    {config.label}
                    </span>
                </div>
            </div>
            
            <div className="flex-1 w-full relative min-h-0">
               <WidgetTrendChart type="humidity" color={config.hexColor} unit="%" />
            </div>
          </div>
        )}

        {/* Large Size - Trend Chart + Details */}
        {size === 'large' && (
          <div className="flex flex-col h-full w-full">
             <div className="flex items-end justify-between mb-4">
                <div className="flex flex-col">
                    <div className="flex items-start">
                        <span className="text-6xl font-bold tracking-tighter text-slate-900">{value.toFixed(1)}</span>
                        <span className="text-3xl font-medium mt-1 text-slate-400">%</span>
                    </div>
                    <span className={cn("mt-1 text-sm font-medium", config.colorClass)}>{config.status} • {config.label}</span>
                </div>
                <div className="flex flex-col items-end gap-1 text-sm text-slate-500 bg-slate-50 p-3 rounded-2xl">
                    <span className="flex items-center gap-1 font-medium">露点 <span className="text-slate-900">12°C</span></span>
                    <span className="flex items-center gap-1 text-xs">目标范围 <span className="text-slate-900">45-55%</span></span>
                </div>
             </div>
            
            <div className="flex-1 w-full relative min-h-0">
               <WidgetTrendChart type="humidity" color={config.hexColor} unit="%" />
            </div>
          </div>
        )}
      </div>
    </IOSWidgetCard>
  )
}
