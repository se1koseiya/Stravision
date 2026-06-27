"use client"

import { Wind, AlertTriangle, CheckCircle, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { IOSWidgetCard } from "./ios-widget-card"
import { WidgetTrendChart } from "./widget-trend-chart"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"

interface CO2WidgetProps {
  value: number
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

export function CO2Widget({ 
  value, 
  size = 'medium', 
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: CO2WidgetProps) {
  const { isElderFriendlyMode } = useElderFriendly()
  
  const getCO2Config = (ppm: number) => {
    if (ppm >= 1500) return {
      status: "较差",
      label: "空气差",
      icon: AlertTriangle,
      colorClass: "text-red-500",
      bgClass: "bg-red-50 dark:bg-red-900/30",
      hexColor: "#ef4444"
    }
    if (ppm >= 1000) return {
      status: "警告",
      label: "需通风",
      icon: AlertTriangle,
      colorClass: "text-orange-500",
      bgClass: "bg-orange-50 dark:bg-orange-900/30",
      hexColor: "#f97316"
    }
    if (ppm >= 800) return {
      status: "一般",
      label: "一般",
      icon: Wind,
      colorClass: "text-yellow-500",
      bgClass: "bg-yellow-50 dark:bg-yellow-900/30",
      hexColor: "#eab308"
    }
    return {
      status: "优良",
      label: "优良",
      icon: CheckCircle,
      colorClass: "text-primary",
      bgClass: "bg-emerald-50 dark:bg-emerald-900/30",
      hexColor: "#10b981"
    }
  }

  const config = getCO2Config(value)
  const isSmall = size === 'small'
  const Icon = config.icon

  const Header = (
    <div className="flex items-center gap-2">
      <div className={cn("p-2 rounded-full", config.bgClass)}>
        <Wind className={cn("w-4 h-4", config.colorClass)} />
      </div>
      {!isSmall && (
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">二氧化碳浓度</span>
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
                <Icon className={cn("w-5 h-5", config.colorClass)} />
              </div>
            </div>
            
            <div className="mt-auto">
              <div className="flex items-start">
                <span className={cn(
                  "font-bold tracking-tighter text-slate-900 dark:text-white",
                  isElderFriendlyMode ? "text-4xl" : "text-3xl"
                )}>{value}</span>
                <span className={cn(
                  "font-medium mt-1 text-slate-400 ml-1",
                  isElderFriendlyMode ? "text-sm" : "text-xs"
                )}>ppm</span>
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
                <span className="text-5xl font-bold tracking-tighter text-slate-900 dark:text-white">{value}</span>
                <span className="text-xl font-medium mt-1 text-slate-400 ml-2">ppm</span>
              </div>
              <div className="mb-2">
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", config.bgClass, config.colorClass)}>
                  {config.label}
                </span>
              </div>
            </div>
            
            <div className="flex-1 w-full relative min-h-0">
               <WidgetTrendChart type="co2" color={config.hexColor} unit="ppm" />
            </div>
          </div>
        )}

        {/* Large Size - Trend Chart + Details */}
        {size === 'large' && (
          <div className="flex flex-col h-full w-full">
             <div className="flex items-end justify-between mb-4">
                <div className="flex flex-col">
                    <div className="flex items-start">
                        <span className="text-6xl font-bold tracking-tighter text-slate-900 dark:text-white">{value}</span>
                        <span className="text-3xl font-medium mt-1 text-slate-400 ml-2">ppm</span>
                    </div>
                    <span className={cn("mt-1 text-sm font-medium", config.colorClass)}>{config.status} • {config.label}</span>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 w-40">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs text-slate-500 dark:text-slate-400">空气质量</span>
                     <span className="text-xs font-bold text-slate-700 dark:text-slate-200">优良</span>
                   </div>
                   <div className="w-full h-1.5 bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500 rounded-full opacity-80" />
                   <div
                      className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-slate-600 dark:border-b-slate-300 mt-1 transition-all duration-500"
                      style={{ marginLeft: `${Math.min(100, (value / 2000) * 100)}%` }}
                   />
                </div>
             </div>
             
             <div className="flex-1 w-full relative min-h-0">
                <WidgetTrendChart type="co2" color={config.hexColor} unit="ppm" />
             </div>
          </div>
        )}
      </div>
    </IOSWidgetCard>
  )
}
