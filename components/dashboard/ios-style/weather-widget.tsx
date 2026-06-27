"use client"

import { Cloud, CloudRain, Sun, CloudSnow, Wind, MapPin, Droplets } from "lucide-react"
import { cn } from "@/lib/utils"
import { IOSWidgetCard } from "./ios-widget-card"

interface WeatherWidgetProps {
  temperature: number
  condition: string
  humidity: number
  windSpeed?: number
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

export function WeatherWidget({ 
  temperature, 
  condition, 
  humidity, 
  windSpeed = 0, 
  size = 'medium',
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: WeatherWidgetProps) {
  const getWeatherConfig = (condition: string, temp: number) => {
    const conditionLower = condition.toLowerCase()
    
    if (conditionLower.includes('rain') || conditionLower.includes('雨')) {
      return {
        icon: CloudRain,
        status: "雨天",
        colorClass: "text-blue-500",
        bgClass: "bg-blue-50 dark:bg-blue-900/30"
      }
    }
    if (conditionLower.includes('cloud') || conditionLower.includes('阴') || conditionLower.includes('多云')) {
      return {
        icon: Cloud,
        status: "多云",
        colorClass: "text-slate-500",
        bgClass: "bg-slate-100 dark:bg-slate-800"
      }
    }
    if (conditionLower.includes('snow') || conditionLower.includes('雪')) {
      return {
        icon: CloudSnow,
        status: "雪天",
        colorClass: "text-sky-400",
        bgClass: "bg-sky-50 dark:bg-sky-900/30"
      }
    }
    if (conditionLower.includes('wind') || conditionLower.includes('风')) {
      return {
        icon: Wind,
        status: "大风",
        colorClass: "text-teal-500",
        bgClass: "bg-teal-50 dark:bg-teal-900/30"
      }
    }
    // Default sunny
    return {
      icon: Sun,
      status: "晴天",
      colorClass: "text-orange-500",
      bgClass: "bg-orange-50 dark:bg-orange-900/30"
    }
  }

  const config = getWeatherConfig(condition, temperature)
  const Icon = config.icon
  const isSmall = size === 'small'

  const Header = (
    <div className="flex items-center gap-2">
      <div className={cn("p-2 rounded-full", config.bgClass)}>
        <Icon className={cn("w-4 h-4", config.colorClass)} />
      </div>
      {!isSmall && (
        <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide leading-none">天气</span>
            <div className="flex items-center gap-1 mt-0.5 text-slate-400">
                <MapPin className="w-2 h-2" />
                <span className="text-[10px]">本地</span>
            </div>
        </div>
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
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                {temperature}°
              </div>
            </div>

            <div className="mt-auto">
              <div className="text-lg font-bold tracking-tight leading-tight text-slate-900 dark:text-white">
                {condition}
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 truncate flex items-center gap-1">
                 <Droplets className="w-3 h-3" /> {humidity}%
              </div>
            </div>
          </>
        )}

        {/* Medium Size */}
        {size === 'medium' && (
          <div className="flex items-center justify-between w-full h-full">
            <div>
              <div className="flex items-start">
                <span className="text-6xl font-bold tracking-tighter text-slate-900 dark:text-white">{temperature}°</span>
              </div>
              <div className="mt-1 text-lg font-medium text-slate-600 dark:text-slate-300">
                 {condition}
              </div>
              <div className="mt-2 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                 <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> {humidity}%</span>
                 <span className="flex items-center gap-1"><Wind className="w-3 h-3" /> {windSpeed}m/s</span>
              </div>
            </div>

            {/* Weather Icon Visual */}
            <div className="relative w-32 h-32 flex items-center justify-center">
               <div className={cn("absolute inset-0 rounded-full blur-xl opacity-20", config.bgClass.replace('bg-', 'bg-'))} />
               <Icon className={cn("w-20 h-20 drop-shadow-sm relative z-10", config.colorClass)} />
            </div>
          </div>
        )}

        {/* Large Size */}
        {size === 'large' && (
          <div className="flex flex-col h-full">
             <div className="flex-1 flex flex-col items-center justify-center relative">
                <Icon className={cn("w-32 h-32 drop-shadow-sm mb-4", config.colorClass)} />
                <span className="text-6xl font-bold tracking-tighter text-slate-900 dark:text-white">{temperature}°</span>
                <span className="text-xl text-slate-500 dark:text-slate-400 mt-2">{condition}</span>
             </div>

             <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mt-4 grid grid-cols-3 gap-2">
                 <div className="flex flex-col items-center">
                    <span className="text-xs text-slate-400 dark:text-slate-500 mb-1">湿度</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{humidity}%</span>
                 </div>
                 <div className="flex flex-col items-center border-l border-r border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-400 dark:text-slate-500 mb-1">风速</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{windSpeed}m/s</span>
                 </div>
                 <div className="flex flex-col items-center">
                    <span className="text-xs text-slate-400 dark:text-slate-500 mb-1">紫外线</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">低</span>
                 </div>
             </div>

             {/* Hourly Forecast Mockup */}
             <div className="flex justify-between mt-4 px-2">
                {[1,2,3,4].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{i+12}:00</span>
                        <Icon className={cn("w-4 h-4 opacity-70", config.colorClass)} />
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{temperature - i}°</span>
                    </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </IOSWidgetCard>
  )
}
