"use client"

import { cn } from "@/lib/utils"
import { IOSWidgetCard } from "./ios-widget-card"
import { WidgetTrendChart } from "./widget-trend-chart"

interface NutrientWidgetProps {
  type: 'N' | 'P' | 'K'
  value: number | string
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

export function NutrientWidget({ 
  type, 
  value, 
  size = 'small', 
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: NutrientWidgetProps) {
  const getConfig = (type: 'N' | 'P' | 'K') => {
    switch (type) {
      case 'N':
        return {
          colorClass: "text-purple-600",
          bgClass: "bg-purple-50",
          label: "氮",
          symbol: "N",
          fullName: "氮含量",
          apiType: "nitrogen",
          hexColor: "#9333ea"
        }
      case 'P':
        return {
          colorClass: "text-pink-600",
          bgClass: "bg-pink-50",
          label: "磷",
          symbol: "P",
          fullName: "磷含量",
          apiType: "phosphorus",
          hexColor: "#db2777"
        }
      case 'K':
        return {
          colorClass: "text-amber-600",
          bgClass: "bg-amber-50",
          label: "钾",
          symbol: "K",
          fullName: "钾含量",
          apiType: "potassium",
          hexColor: "#d97706"
        }
    }
  }

  const config = getConfig(type)
  const isSmall = size === 'small'
  
  const displayValue = typeof value === 'number' ? value.toFixed(0) : value

  const Header = (
    <div className="flex items-center gap-2">
      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs", config.bgClass, config.colorClass)}>
        {config.symbol}
      </div>
      {!isSmall && (
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{config.label}</span>
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
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", config.bgClass, config.colorClass)}>
                {config.symbol}
              </div>
            </div>
            
            <div className="mt-auto">
              <div className="flex items-start">
                <span className="text-3xl font-bold tracking-tighter text-slate-900">{displayValue}</span>
                <span className="text-xs font-medium mt-1 text-slate-400 ml-1">mg/kg</span>
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1 truncate">
                {config.label}
              </div>
            </div>
          </>
        )}

        {/* Medium Size - Trend Chart */}
        {size === 'medium' && (
          <div className="flex flex-col h-full w-full">
            <div className="flex items-end gap-2 mb-2">
               <div className="flex items-start">
                <span className="text-5xl font-bold tracking-tighter text-slate-900">{displayValue}</span>
                <span className="text-xl font-medium mt-2 text-slate-400 ml-2">mg/kg</span>
              </div>
              <div className="mb-2">
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", config.bgClass, config.colorClass)}>
                  {config.fullName}
                </span>
              </div>
            </div>
            
            <div className="flex-1 w-full relative min-h-0">
               <WidgetTrendChart type={config.apiType} color={config.hexColor} unit="mg/kg" />
            </div>
          </div>
        )}
        
        {/* Large Size - Trend Chart + Details */}
        {size === 'large' && (
           <div className="flex flex-col h-full w-full">
              <div className="flex items-end justify-between mb-4">
                 <div className="flex flex-col">
                     <div className="flex items-start">
                         <span className="text-6xl font-bold tracking-tighter text-slate-900">{displayValue}</span>
                         <span className="text-3xl font-medium mt-1 text-slate-400 ml-2">mg/kg</span>
                     </div>
                     <span className={cn("mt-1 text-sm font-medium", config.colorClass)}>{config.fullName}</span>
                 </div>
                 
                 <div className={cn("w-16 h-16 rounded-full flex items-center justify-center font-bold text-3xl", config.bgClass, config.colorClass)}>
                    {config.symbol}
                 </div>
              </div>
              
              <div className="flex-1 w-full relative min-h-0">
                 <WidgetTrendChart type={config.apiType} color={config.hexColor} unit="mg/kg" />
              </div>
           </div>
        )}
      </div>
    </IOSWidgetCard>
  )
}
