"use client"

import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
  Droplets,
  Gauge,
  Thermometer,
  Leaf,
  Sprout,
  Zap,
  CloudDrizzle,
  CloudFog,
} from "lucide-react"
import { motion } from "framer-motion"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { usePlantGrowth } from "@/lib/hooks/use-plant-growth"
import { useRef, useState } from "react"

interface DeviceData {
  temperature: number
  humidity: number
  light: number
  co2: number
  earth_temp: number
  earth_water: number
  earth_ec: number
  earth_n: number
  earth_p: number
  earth_k: number
  relay5: number
  relay6: number
  relay7: number
  relay8: number
  led1: number
  led2: number
  led3: number
  led4: number
  timestamp?: number
}

interface WeatherCardProps {
  deviceData?: DeviceData | null
}

export function WeatherCard({ deviceData }: WeatherCardProps) {
  const { weatherData, loading, requestLocation } = useWeatherContext()
  const { plantData } = usePlantGrowth()
  
  // 拖动滚动状态
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    setStartY(e.pageY - scrollRef.current.offsetTop)
    setScrollTop(scrollRef.current.scrollTop)
    scrollRef.current.style.cursor = 'grabbing'
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab'
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const y = e.pageY - scrollRef.current.offsetTop
    const walk = (y - startY) * 1.5
    scrollRef.current.scrollTop = scrollTop - walk
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab'
    }
  }

  const getWeatherType = (code: number): "sun" | "cloud" | "rain" | "snow" | "drizzle" | "fog" => {
    if (code === 1000) return "sun"
    if ([1003, 1006, 1009].includes(code)) return "cloud"
    if ([1030, 1135, 1147].includes(code)) return "fog"
    if ([1150, 1153, 1168, 1171].includes(code)) return "drizzle"
    if ([1063, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246, 1273, 1276].includes(code)) return "rain"
    if ([1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258, 1279, 1282].includes(code)) return "snow"
    return "cloud"
  }

  const now = new Date()
  const weekday = now.toLocaleDateString("zh-CN", { weekday: "short" })
  const dateStr = now.toLocaleDateString("zh-CN", { month: "long", day: "numeric" })

  const tomorrowForecast = weatherData?.forecast?.forecastday?.[1]

  // 渲染天气图标
  const renderWeatherIcon = (type?: string, size: "large" | "small" = "large") => {
    const weatherType = type || (weatherData?.current ? getWeatherType(weatherData.current.condition.code) : "cloud")
    const isLarge = size === "large"
    const iconSize = isLarge ? "w-28 h-28" : "w-10 h-10"
    
    if (loading && isLarge) {
      return <Cloud className={`${iconSize} text-muted-foreground/30 animate-pulse`} />
    }

    switch (weatherType) {
      case "sun":
        if (isLarge) {
          return (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-radial from-yellow-200/40 via-orange-100/20 to-transparent rounded-full blur-xl scale-150" />
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400 shadow-[0_0_60px_rgba(251,191,36,0.4)]" />
              <div className="absolute -top-2 right-4 w-2 h-2 rounded-full bg-yellow-300" />
              <div className="absolute top-2 -right-1 w-1.5 h-1.5 rounded-full bg-yellow-300" />
              <div className="absolute top-8 -right-3 w-2 h-2 rounded-full bg-yellow-300" />
              <div className="absolute -top-4 right-12 w-1.5 h-1.5 rounded-full bg-yellow-300" />
            </div>
          )
        }
        return <Sun className={`${iconSize} text-yellow-500`} />
      
      case "cloud":
        if (isLarge) {
          return (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-radial from-slate-300/30 to-transparent rounded-full blur-xl scale-125" />
              <Cloud className="w-28 h-28 text-slate-400 dark:text-slate-300" strokeWidth={1.2} />
            </div>
          )
        }
        return <Cloud className={`${iconSize} text-slate-400`} />
      
      case "rain":
        if (isLarge) {
          return (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-radial from-blue-300/30 to-transparent rounded-full blur-xl scale-125" />
              <CloudRain className="w-28 h-28 text-blue-400" strokeWidth={1.2} />
            </div>
          )
        }
        return <CloudRain className={`${iconSize} text-blue-400`} />
      
      case "drizzle":
        if (isLarge) {
          return (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-radial from-blue-200/30 to-transparent rounded-full blur-xl scale-125" />
              <CloudDrizzle className="w-28 h-28 text-blue-300" strokeWidth={1.2} />
            </div>
          )
        }
        return <CloudDrizzle className={`${iconSize} text-blue-300`} />
      
      case "snow":
        if (isLarge) {
          return (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-radial from-blue-100/40 to-transparent rounded-full blur-xl scale-125" />
              <CloudSnow className="w-28 h-28 text-blue-200" strokeWidth={1.2} />
            </div>
          )
        }
        return <CloudSnow className={`${iconSize} text-blue-200`} />
      
      case "fog":
        if (isLarge) {
          return (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-radial from-slate-200/30 to-transparent rounded-full blur-xl scale-125" />
              <CloudFog className="w-28 h-28 text-slate-300" strokeWidth={1.2} />
            </div>
          )
        }
        return <CloudFog className={`${iconSize} text-slate-300`} />
      
      default:
        return <Cloud className={`${iconSize} text-muted-foreground/30`} />
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-hide cursor-grab select-none"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        
        {/* 主天气区域 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          {/* 位置和日期 */}
          <div 
            className="mb-4 cursor-pointer"
            onClick={requestLocation}
            title="点击重新定位"
          >
            <h2 className="text-2xl font-bold text-foreground">
              {weatherData?.location?.name === "Ningbo" ? "宁波" : weatherData?.location?.name || "定位中..."},
            </h2>
            <p className="text-muted-foreground">{weekday}, {dateStr}</p>
          </div>

          {/* 天气图标和温度 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-7xl font-light text-foreground mb-1">
                {weatherData?.current ? Math.round(weatherData.current.temp_c) : '--'}°c
              </div>
              <div className="text-xl text-muted-foreground">
                {weatherData?.current?.condition?.text || '加载中...'}
              </div>
            </div>
            <div className="flex-shrink-0">
              {renderWeatherIcon()}
            </div>
          </div>

          {/* 最高最低温度 */}
          <div className="inline-flex items-center gap-4 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-sm">
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground">↑ 最高:</span>
              <span className="font-medium text-foreground">
                {weatherData?.forecast?.forecastday?.[0]?.day?.maxtemp_c 
                  ? Math.round(weatherData.forecast.forecastday[0].day.maxtemp_c) 
                  : '--'}°
              </span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground">↓ 最低:</span>
              <span className="font-medium text-foreground">
                {weatherData?.forecast?.forecastday?.[0]?.day?.mintemp_c 
                  ? Math.round(weatherData.forecast.forecastday[0].day.mintemp_c) 
                  : '--'}°
              </span>
            </span>
          </div>
        </motion.div>

        {/* 室外天气参数 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6"
        >
          <div className="flex items-center gap-3">
            <Droplets className="w-5 h-5 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">空气湿度</div>
              <div className="text-lg font-semibold text-foreground">
                {weatherData?.current?.humidity ?? '--'}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Wind className="w-5 h-5 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">风速</div>
              <div className="text-lg font-semibold text-foreground">
                {weatherData?.current?.wind_kph ? Math.round(weatherData.current.wind_kph) : '--'}km/h
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Gauge className="w-5 h-5 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">大气压强</div>
              <div className="text-lg font-semibold text-foreground">
                {weatherData?.current?.pressure_mb ? Math.round(weatherData.current.pressure_mb / 10) : '--'}hPa
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Wind className="w-5 h-5 text-primary rotate-45" />
            <div>
              <div className="text-xs text-muted-foreground">风向</div>
              <div className="text-lg font-semibold text-foreground">
                {weatherData?.current?.wind_dir || '--'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* 明日预报 */}
        {tomorrowForecast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-6"
          >
            <div>
              <div className="text-sm text-muted-foreground">明日预报</div>
              <div className="text-xl font-semibold text-foreground">
                {Math.round(tomorrowForecast.day.maxtemp_c)}°c / {Math.round(tomorrowForecast.day.mintemp_c)}°c
              </div>
            </div>
            {renderWeatherIcon(getWeatherType(tomorrowForecast.day.condition.code), "small")}
          </motion.div>
        )}

        {/* 七天天气预报 */}
        {weatherData?.forecast?.forecastday && weatherData.forecast.forecastday.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mb-6"
          >
            <div className="text-sm font-medium text-muted-foreground mb-3">未来天气预报</div>
            <div className="space-y-2">
              {weatherData.forecast.forecastday.slice(0, 7).map((day: any, index: number) => {
                const date = new Date(day.date)
                const isToday = index === 0
                const dayName = isToday ? '今天' : date.toLocaleDateString('zh-CN', { weekday: 'short' })
                const dateStr = date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
                
                return (
                  <div 
                    key={day.date}
                    className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10"
                  >
                    <div className="flex items-center gap-3 min-w-[80px]">
                      <div className="text-sm font-medium text-foreground">{dayName}</div>
                      <div className="text-xs text-muted-foreground">{dateStr}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderWeatherIcon(getWeatherType(day.day.condition.code), "small")}
                      <span className="text-xs text-muted-foreground w-12">{day.day.condition.text}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-foreground font-medium">{Math.round(day.day.maxtemp_c)}°</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-muted-foreground">{Math.round(day.day.mintemp_c)}°</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* 分隔线 */}
        <div className="border-t border-border/50 my-4" />

        {/* 大棚环境参数标题 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <h3 className="text-lg font-bold text-foreground">大棚环境参数</h3>
        </motion.div>

        {/* 大棚核心参数 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-2 gap-3 mb-4"
        >
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">室内温度</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {deviceData ? deviceData.temperature.toFixed(1) : '--'}
              <span className="text-sm font-normal text-muted-foreground ml-1">°C</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">室内湿度</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {deviceData ? (deviceData.humidity / 10).toFixed(1) : '--'}
              <span className="text-sm font-normal text-muted-foreground ml-1">%</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Wind className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">二氧化碳浓度</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {deviceData ? deviceData.co2 : '--'}
              <span className="text-sm font-normal text-muted-foreground ml-1">ppm</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">光照强度</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {deviceData ? deviceData.light : '--'}
              <span className="text-sm font-normal text-muted-foreground ml-1">lux</span>
            </div>
          </div>
        </motion.div>

        {/* 土壤参数 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-4"
        >
          <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Sprout className="w-4 h-4 text-primary" />
            土壤参数
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
              <div className="text-xs text-muted-foreground mb-1">土壤温度</div>
              <div className="text-lg font-bold text-foreground">
                {deviceData?.earth_temp ? deviceData.earth_temp.toFixed(1) : '--'}°C
              </div>
            </div>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
              <div className="text-xs text-muted-foreground mb-1">土壤湿度</div>
              <div className="text-lg font-bold text-foreground">
                {deviceData?.earth_water ? deviceData.earth_water.toFixed(1) : '--'}%
              </div>
            </div>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
              <div className="text-xs text-muted-foreground mb-1">电导率</div>
              <div className="text-lg font-bold text-foreground">
                {deviceData?.earth_ec ?? '--'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* 土壤养分 NPK */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-4"
        >
          <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary" />
            土壤养分
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
              <div className="text-xs text-muted-foreground mb-1">氮 (N)</div>
              <div className="text-lg font-bold text-foreground">
                {deviceData?.earth_n ?? '--'}
                <span className="text-xs font-normal text-muted-foreground ml-0.5">mg/kg</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
              <div className="text-xs text-muted-foreground mb-1">磷 (P)</div>
              <div className="text-lg font-bold text-foreground">
                {deviceData?.earth_p ?? '--'}
                <span className="text-xs font-normal text-muted-foreground ml-0.5">mg/kg</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
              <div className="text-xs text-muted-foreground mb-1">钾 (K)</div>
              <div className="text-lg font-bold text-foreground">
                {deviceData?.earth_k ?? '--'}
                <span className="text-xs font-normal text-muted-foreground ml-0.5">mg/kg</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 生长阶段 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 rounded-2xl bg-primary/5 border border-primary/10"
        >
          <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            草莓生长阶段
          </div>
          <div className="flex items-center justify-between mb-2">
            {["🌱", "🌿", "🌸", "🍓", "🍓"].map((emoji, i) => {
              const stage = i + 1
              const isActive = plantData && stage <= plantData.stage
              const isCurrent = plantData && stage === plantData.stage
              return (
                <div
                  key={i}
                  className={`text-2xl transition-all ${
                    isActive
                      ? isCurrent
                        ? "opacity-100 scale-125"
                        : "opacity-100"
                      : "opacity-30 grayscale"
                  }`}
                >
                  {emoji}
                </div>
              )
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            当前：{plantData
              ? ["幼苗期", "生长期", "花芽分化期", "开花结果期", "果实成熟期"][plantData.stage - 1] || `第${plantData.stage}阶段`
              : "等待数据..."}
          </div>
          {plantData?.healthScore && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">健康度</span>
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${plantData.healthScore}%` }}
                />
              </div>
              <span className="text-xs font-medium text-primary">{plantData.healthScore}</span>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}
