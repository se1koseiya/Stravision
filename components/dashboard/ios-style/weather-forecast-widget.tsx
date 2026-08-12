"use client"

import { useMemo } from "react"
import { CalendarDays, CloudRain, Wind, Thermometer, Sunrise, Sunset } from "lucide-react"
import { Flex } from "antd"
import { IOSWidgetCard } from "./ios-widget-card"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import {
  WidgetForecastList,
  type ForecastDay,
} from "./weather-visualizations"
import { WeatherEffects } from "./weather-effects"
import { useWeatherVideo, WeatherVideoBackground } from "./weather-video"

const A = BERRY_THEME.apple
const WC = A.widgetColors.weather
const ICON_STROKE = 1.75

interface WeatherForecastWidgetProps {
  temperature?: number
  condition?: string
  windSpeed?: number
  windDirection?: number | string
  dailyForecast?: Array<{
    date: string
    day: {
      maxtemp_c: number
      mintemp_c: number
      avgtemp_c?: number
      condition: { text: string; code?: number }
      maxwind_kph: number
      avghumidity?: number
      totalprecip_mm?: number
      daily_chance_of_rain?: number
    }
    astro?: {
      sunrise?: string
      sunset?: string
    }
  }>
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

function getGradient(condition: string): [string, string, string] {
  const c = condition.toLowerCase()
  if (c.includes('thunder') || c.includes('雷')) return ['#3730a3', '#4338ca', '#6366f1']
  if (c.includes('snow') || c.includes('雪')) return ['#7dd3fc', '#bae6fd', '#e0f2fe']
  if (c.includes('rain') || c.includes('drizzle') || c.includes('雨')) return ['#1e40af', '#3b82f6', '#60a5fa']
  if (c.includes('cloud') || c.includes('overcast') || c.includes('阴') || c.includes('多云')) return ['#475569', '#64748b', '#94a3b8']
  return ['#0ea5e9', '#38bdf8', '#7dd3fc']
}

function generateFallbackDays(temp: number, condition: string, windSpeed: number, windDir: number | string): ForecastDay[] {
  const dayNames = ['今天', '明天', '周三', '周四', '周五', '周六', '周日']
  return dayNames.map((day, i) => ({
    day,
    condition,
    windSpeed: windSpeed * (0.8 + Math.random() * 0.4),
    windDir,
    high: Math.round(temp + 2 + Math.random() * 3 - i * 0.3),
    low: Math.round(temp - 4 - Math.random() * 2 + i * 0.2),
  }))
}

export function WeatherForecastWidget({
  temperature = 24,
  condition = '晴朗',
  windSpeed = 3,
  windDirection = 0,
  dailyForecast,
  size = 'large',
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress,
}: WeatherForecastWidgetProps) {
  const isLarge = size === 'large'
  const gradient = getGradient(condition)

  const forecastDays = useMemo<ForecastDay[]>(() => {
    if (dailyForecast && dailyForecast.length > 0) {
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return dailyForecast.slice(0, isLarge ? 7 : 5).map((d, i) => {
        const date = new Date(d.date)
        return {
          day: i === 0 ? '今天' : i === 1 ? '明天' : dayNames[date.getDay()],
          condition: d.day.condition.text,
          windSpeed: d.day.maxwind_kph / 3.6,
          windDir: windDirection,
          high: Math.round(d.day.maxtemp_c),
          low: Math.round(d.day.mintemp_c),
          rainChance: d.day.daily_chance_of_rain,
        }
      })
    }
    return generateFallbackDays(temperature, condition, windSpeed, windDirection)
  }, [dailyForecast, isLarge, temperature, condition, windSpeed, windDirection])

  const avgHigh = Math.round(forecastDays.reduce((s, d) => s + d.high, 0) / forecastDays.length)
  const avgLow = Math.round(forecastDays.reduce((s, d) => s + d.low, 0) / forecastDays.length)
  const maxWind = Math.max(...forecastDays.map(d => d.windSpeed))
  const sunrise = dailyForecast?.[0]?.astro?.sunrise || '05:42'
  const sunset = dailyForecast?.[0]?.astro?.sunset || '18:56'

  // Randomly use weather video background (70% chance)
  const video = useWeatherVideo(condition, 0.7)

  const gradientBg = (
    <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden', background: `linear-gradient(145deg, ${gradient[0]} 0%, ${gradient[1]} 50%, ${gradient[2]} 100%)` }}>
      {video.enabled && <WeatherVideoBackground src={video.src} overlayOpacity={0.45} />}
      <div style={{
        position: 'absolute', top: -30, right: -20, width: 120, height: 120,
        borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(20px)',
      }} />
      <div style={{
        position: 'absolute', bottom: -20, left: -15, width: 90, height: 90,
        borderRadius: '50%', background: 'rgba(255,255,255,0.06)', filter: 'blur(16px)',
      }} />
      {!video.enabled && <WeatherEffects condition={condition} reduced />}
    </div>
  )

  // ─── MEDIUM ───
  if (!isLarge) {
    return (
      <IOSWidgetCard
        size={size}
        className={className}
        background={gradientBg}
        isEditing={isEditing}
        widgetId={widgetId}
        onRemove={onRemove}
        onContextMenu={onContextMenu}
        onLongPress={onLongPress}
        tint={WC.accent}
      >
        <Flex vertical style={{ height: '100%' }}>
          <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
            <Flex align="center" gap={6}>
              <CalendarDays size={14} strokeWidth={1.75} color="rgba(255,255,255,0.8)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>未来预报</span>
            </Flex>
            <Flex align="center" gap={8}>
              <Flex align="center" gap={3}>
                <Thermometer size={10} strokeWidth={2} color="rgba(255,255,255,0.5)" />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>
                  {avgLow}° / {avgHigh}°
                </span>
              </Flex>
            </Flex>
          </Flex>
          <div style={{ flex: 1, minHeight: 0 }}>
            <WidgetForecastList days={forecastDays.slice(0, 4)} maxTemp={avgHigh + 3} minTemp={avgLow - 3} />
          </div>
        </Flex>
      </IOSWidgetCard>
    )
  }

  // ─── LARGE ───
  return (
    <IOSWidgetCard
      size={size}
      className={className}
      background={gradientBg}
      isEditing={isEditing}
      widgetId={widgetId}
      onRemove={onRemove}
      onContextMenu={onContextMenu}
      onLongPress={onLongPress}
      tint={WC.accent}
    >
      <Flex vertical gap={8} style={{ height: '100%' }}>
        {/* Header */}
        <Flex align="center" justify="space-between">
          <Flex align="center" gap={6}>
            <CalendarDays size={15} strokeWidth={1.75} color="rgba(255,255,255,0.9)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>7日预报</span>
          </Flex>
          <Flex gap={10}>
            <Flex align="center" gap={3}>
              <Sunrise size={11} strokeWidth={2} color="rgba(255,255,255,0.6)" />
              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums' }}>{sunrise}</span>
            </Flex>
            <Flex align="center" gap={3}>
              <Sunset size={11} strokeWidth={2} color="rgba(255,255,255,0.6)" />
              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums' }}>{sunset}</span>
            </Flex>
          </Flex>
        </Flex>

        {/* Forecast list */}
        <div style={{
          flex: 1,
          minHeight: 0,
          padding: '4px 6px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
        }}>
          <WidgetForecastList days={forecastDays} maxTemp={avgHigh + 3} minTemp={avgLow - 3} />
        </div>

        {/* Summary stats */}
        <Flex gap={5}>
          <SummaryChip icon={<Thermometer size={12} strokeWidth={ICON_STROKE} />} label="平均高温" value={`${avgHigh}°`} />
          <SummaryChip icon={<Thermometer size={12} strokeWidth={ICON_STROKE} />} label="平均低温" value={`${avgLow}°`} />
          <SummaryChip icon={<Wind size={12} strokeWidth={ICON_STROKE} />} label="最大风速" value={`${maxWind.toFixed(1)} m/s`} />
          <SummaryChip
            icon={<CloudRain size={12} strokeWidth={ICON_STROKE} />}
            label="降水概率"
            value={`${Math.round(forecastDays.reduce((s, d) => s + (d.rainChance || 0), 0) / forecastDays.length)}%`}
          />
        </Flex>
      </Flex>
    </IOSWidgetCard>
  )
}

function SummaryChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      padding: '6px 2px',
      borderRadius: 10,
      background: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.12)',
    }}>
      <span style={{ color: 'rgba(255,255,255,0.7)', display: 'inline-flex' }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <span style={{ fontSize: 8, fontWeight: 500, color: 'rgba(255,255,255,0.5)', lineHeight: 1, whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  )
}
