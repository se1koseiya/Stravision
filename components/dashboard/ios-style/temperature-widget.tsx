"use client"

import { Thermometer, TrendingUp, TrendingDown, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { IOSWidgetCard } from "./ios-widget-card"
import { WidgetTrendChart } from "./widget-trend-chart"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"

interface TemperatureWidgetProps {
  value: number
  trend?: 'up' | 'down' | 'stable'
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

export function TemperatureWidget({ 
  value, 
  trend = 'stable', 
  size = 'medium', 
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: TemperatureWidgetProps) {
  const { isElderFriendlyMode } = useElderFriendly()
  
  const getTemperatureConfig = (temp: number) => {
    if (temp >= 30) return {
      status: "高温",
      label: "高温警报",
      colorClass: "text-red-500",
      bgClass: "bg-red-50",
      hexColor: "#ef4444"
    }
    if (temp >= 25) return {
      status: "偏热",
      label: "温暖舒适",
      colorClass: "text-orange-500",
      bgClass: "bg-orange-50",
      hexColor: "#f97316"
    }
    if (temp >= 18) return {
      status: "适宜",
      label: "适宜温度",
      colorClass: "text-primary",
      bgClass: "bg-emerald-50",
      hexColor: "#10b981"
    }
    return {
      status: "偏冷",
      label: "凉爽低温",
      colorClass: "text-blue-500",
      bgClass: "bg-blue-50",
      hexColor: "#3b82f6"
    }
  }

  const config = getTemperatureConfig(value)
  const isSmall = size === 'small'
  
  // Header component
  const Header = (
    <div className="flex items-center gap-2">
      <div className={cn("p-2 rounded-full", config.bgClass)}>
        <Thermometer className={cn("w-4 h-4", config.colorClass)} />
      </div>
      {!isSmall && (
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">环境温度</span>
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
        {/* Small Size Layout - Minimalist */}
        {size === 'small' && (
          <>
            <div className="flex justify-between items-start">
              <div className={cn("p-2 rounded-full", config.bgClass)}>
                <Thermometer className={cn("w-5 h-5", config.colorClass)} />
              </div>
              {trend !== 'stable' && (
                <div className={cn("flex items-center p-1 rounded-full bg-slate-50", 
                  trend === 'up' ? "text-primary" : "text-red-500")}>
                   {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                </div>
              )}
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
                )}>°</span>
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

        {/* Medium Size Layout - Trend Chart */}
        {size === 'medium' && (
          <div className="flex flex-col h-full w-full">
            <div className="flex items-end gap-2 mb-2">
                <div className="flex items-start">
                    <span className={cn(
                      "font-bold tracking-tighter text-slate-900",
                      isElderFriendlyMode ? "text-6xl" : "text-5xl"
                    )}>{value.toFixed(1)}</span>
                    <span className={cn(
                      "font-medium mt-1 text-slate-400",
                      isElderFriendlyMode ? "text-3xl" : "text-2xl"
                    )}>°C</span>
                </div>
                <div className="mb-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full font-medium", 
                      config.bgClass, 
                      config.colorClass,
                      isElderFriendlyMode ? "text-sm" : "text-xs"
                    )}>
                    {config.label}
                    </span>
                </div>
            </div>
            
            <div className="flex-1 w-full relative min-h-0">
               <WidgetTrendChart type="temperature" color={config.hexColor} unit="°C" />
            </div>
          </div>
        )}

        {/* Large Size Layout - Trend Chart + Details */}
        {size === 'large' && (
          <div className="flex flex-col h-full w-full">
             <div className="flex items-end justify-between mb-4">
                <div className="flex flex-col">
                    <div className="flex items-start">
                        <span className={cn(
                          "font-bold tracking-tighter text-slate-900",
                          isElderFriendlyMode ? "text-7xl" : "text-6xl"
                        )}>{value.toFixed(1)}</span>
                        <span className={cn(
                          "font-medium mt-1 text-slate-400",
                          isElderFriendlyMode ? "text-4xl" : "text-3xl"
                        )}>°C</span>
                    </div>
                    <span className={cn(
                      "mt-1 font-medium", 
                      config.colorClass,
                      isElderFriendlyMode ? "text-base" : "text-sm"
                    )}>{config.status} • {config.label}</span>
                </div>
                <div className={cn(
                  "flex flex-col items-end gap-1 text-slate-500 bg-slate-50 p-3 rounded-2xl",
                  isElderFriendlyMode ? "text-base" : "text-sm"
                )}>
                    <span className="flex items-center gap-1 font-medium">体感 <span className="text-slate-900">{(value + 2).toFixed(1)}°</span></span>
                    <span className={cn(
                      "flex items-center gap-1",
                      isElderFriendlyMode ? "text-sm" : "text-xs"
                    )}><TrendingUp className="w-3 h-3 text-red-400"/> 最高 {(value + 5).toFixed(0)}°</span>
                    <span className={cn(
                      "flex items-center gap-1",
                      isElderFriendlyMode ? "text-sm" : "text-xs"
                    )}><TrendingDown className="w-3 h-3 text-blue-400"/> 最低 {(value - 3).toFixed(0)}°</span>
                </div>
             </div>
            
            <div className="flex-1 w-full relative min-h-0">
               <WidgetTrendChart type="temperature" color={config.hexColor} unit="°C" />
            </div>
          </div>
        )}
      </div>
    </IOSWidgetCard>
  )
}
