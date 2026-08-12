"use client"

import { useMemo } from "react"
import { Wind, Droplets, Thermometer, Eye, Gauge, Navigation, MapPin } from "lucide-react"
import { Flex } from "antd"
import { IOSWidgetCard } from "./ios-widget-card"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import {
  getWeatherConfig,
  WidgetWindArrow,
  WidgetWindRose,
  WidgetHourlyStrip,
  GlassStatChip,
  type HourlyData,
} from "./weather-visualizations"
import { WeatherEffects } from "./weather-effects"
import { useWeatherVideo, WeatherVideoBackground } from "./weather-video"

const A = BERRY_THEME.apple
const WC = A.widgetColors.weather
const ICON_STROKE = 1.75

interface WeatherWidgetProps {
  temperature: number
  condition: string
  humidity: number
  windSpeed?: number
  windDirection?: number | string
  pressure?: number
  visibility?: number
  feelsLike?: number
  location?: string
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
  if (c.includes('fog') || c.includes('mist') || c.includes('雾')) return ['#64748b', '#94a3b8', '#cbd5e1']
  // Clear/sunny — warm sunset gradient
  return ['#0ea5e9', '#38bdf8', '#7dd3fc']
}

function generateHourlyData(temp: number, condition: string, windSpeed: number, windDir: number | string): HourlyData[] {
  const hours: HourlyData[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const h = new Date(now.getTime() + i * 3600000)
    const hourNum = h.getHours()
    // Temperature curve: cooler at night, warmer in afternoon
    const tempVariation = Math.sin((hourNum - 6) / 24 * Math.PI * 2) * 4
    const hourTemp = Math.round(temp + tempVariation + (Math.random() - 0.5) * 1.5)
    hours.push({
      time: i === 0 ? '现在' : `${hourNum}:00`,
      temp: hourTemp,
      condition: i > 4 && i < 8 ? (condition.includes('晴') ? '多云' : condition) : condition,
      windSpeed: windSpeed * (0.7 + Math.random() * 0.6),
      windDir: windDir,
      isNow: i === 0,
    })
  }
  return hours
}

export function WeatherWidget({
  temperature,
  condition,
  humidity,
  windSpeed = 0,
  windDirection = 0,
  pressure = 1013,
  visibility = 10,
  feelsLike,
  location,
  size = 'medium',
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress,
}: WeatherWidgetProps) {
  const { isElderFriendlyMode } = useElderFriendly()
  const config = getWeatherConfig(condition)
  const WeatherIcon = config.icon
  const isSmall = size === 'small'
  const isLarge = size === 'large'
  const gradient = getGradient(condition)

  const heroSize = isElderFriendlyMode
    ? (isSmall ? 32 : isLarge ? 52 : 44)
    : (isSmall ? 30 : isLarge ? 48 : 40)

  const hourlyData = useMemo(
    () => generateHourlyData(temperature, condition, windSpeed, windDirection),
    [temperature, condition, windSpeed, windDirection]
  )

  const fl = feelsLike ?? Math.round(temperature + (humidity > 70 ? 2 : humidity < 30 ? -2 : 0))

  // Randomly use weather video background (80% chance)
  const video = useWeatherVideo(condition, 0.8)

  // ─── Gradient / video background with decorative elements ───
  const gradientBg = (
    <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden', background: `linear-gradient(145deg, ${gradient[0]} 0%, ${gradient[1]} 50%, ${gradient[2]} 100%)` }}>
      {video.enabled && <WeatherVideoBackground src={video.src} overlayOpacity={0.4} />}
      {/* Decorative blurred orbs */}
      <div style={{
        position: 'absolute',
        top: isLarge ? -40 : -20,
        right: isLarge ? -30 : -15,
        width: isLarge ? 160 : 90,
        height: isLarge ? 160 : 90,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.12)',
        filter: 'blur(20px)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: isLarge ? -30 : -15,
        left: isLarge ? -20 : -10,
        width: isLarge ? 120 : 70,
        height: isLarge ? 120 : 70,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        filter: 'blur(16px)',
      }} />
      {!video.enabled && <WeatherEffects condition={condition} reduced={isSmall} />}
    </div>
  )

  // ─── SMALL ───
  if (isSmall) {
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
        <Flex vertical justify="space-between" style={{ height: '100%' }}>
          <Flex align="center" justify="space-between">
            <WeatherIcon size={20} strokeWidth={1.5} color="rgba(255,255,255,0.9)" />
            <Flex align="center" gap={3}>
              <WidgetWindArrow direction={windDirection} size={11} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums' }}>
                {windSpeed.toFixed(1)}
              </span>
            </Flex>
          </Flex>

          <Flex vertical align="center" gap={0}>
            <span style={{
              fontSize: heroSize,
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1,
              letterSpacing: '-0.03em',
              fontVariantNumeric: 'tabular-nums',
            }}>{temperature}°</span>
            <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{condition}</span>
          </Flex>

          <Flex gap={4}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '4px 0',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.12)',
            }}>
              <Droplets size={9} strokeWidth={2} color="rgba(255,255,255,0.7)" />
              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums' }}>{humidity}%</span>
            </div>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '4px 0',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.12)',
            }}>
              <Thermometer size={9} strokeWidth={2} color="rgba(255,255,255,0.7)" />
              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums' }}>{fl}°</span>
            </div>
          </Flex>
        </Flex>
      </IOSWidgetCard>
    )
  }

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
        <Flex vertical justify="space-between" style={{ height: '100%' }}>
          {/* Top: icon + condition + location */}
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={6}>
              <WeatherIcon size={18} strokeWidth={1.5} color="rgba(255,255,255,0.9)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{condition}</span>
            </Flex>
            {location && (
              <Flex align="center" gap={3}>
                <MapPin size={10} strokeWidth={2} color="rgba(255,255,255,0.5)" />
                <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>{location}</span>
              </Flex>
            )}
          </Flex>

          {/* Center: temp + hourly preview */}
          <Flex align="center" justify="space-between" gap={12} style={{ flex: 1, minHeight: 0 }}>
            <Flex vertical gap={1}>
              <span style={{
                fontSize: heroSize,
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1,
                letterSpacing: '-0.04em',
                fontVariantNumeric: 'tabular-nums',
              }}>{temperature}°</span>
              <Flex align="center" gap={4}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>体感</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums' }}>{fl}°</span>
              </Flex>
            </Flex>
            <div style={{ flex: 1, minWidth: 0 }}>
              <WidgetHourlyStrip hours={hourlyData.slice(0, 6)} />
            </div>
          </Flex>

          {/* Bottom: stat chips */}
          <Flex gap={6}>
            <GlassStatChip
              icon={<Droplets size={13} strokeWidth={ICON_STROKE} />}
              label="湿度"
              value={humidity}
              unit="%"
            />
            <GlassStatChip
              icon={<Wind size={13} strokeWidth={ICON_STROKE} />}
              label="风速"
              value={windSpeed.toFixed(1)}
              unit="m/s"
            />
            <GlassStatChip
              icon={<Gauge size={13} strokeWidth={ICON_STROKE} />}
              label="气压"
              value={Math.round(pressure)}
              unit="hPa"
            />
          </Flex>
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
      <Flex vertical justify="space-between" style={{ height: '100%' }}>
        {/* Top row: current conditions + wind rose */}
        <Flex gap={12}>
          {/* Left: main temp */}
          <Flex vertical gap={4} style={{ flex: 1 }}>
            <Flex align="center" gap={8}>
              <WeatherIcon size={26} strokeWidth={1.5} color="rgba(255,255,255,0.95)" />
              <Flex vertical gap={1}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{condition}</span>
                {location && (
                  <Flex align="center" gap={3}>
                    <MapPin size={9} strokeWidth={2} color="rgba(255,255,255,0.5)" />
                    <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>{location}</span>
                  </Flex>
                )}
              </Flex>
            </Flex>
            <Flex align="flex-start" gap={4} style={{ marginTop: 6 }}>
              <span style={{
                fontSize: 52,
                fontWeight: 200,
                color: '#fff',
                lineHeight: 1,
                letterSpacing: '-0.04em',
                fontVariantNumeric: 'tabular-nums',
              }}>{temperature}</span>
              <span style={{
                fontSize: 22,
                fontWeight: 300,
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1,
                marginTop: 6,
              }}>°C</span>
            </Flex>
            <Flex align="center" gap={12} style={{ marginTop: 4 }}>
              <Flex align="center" gap={3}>
                <Thermometer size={11} strokeWidth={2} color="rgba(255,255,255,0.6)" />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>体感</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontVariantNumeric: 'tabular-nums' }}>{fl}°</span>
              </Flex>
              <Flex align="center" gap={3}>
                <Navigation size={10} strokeWidth={2} color="rgba(255,255,255,0.6)" />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums' }}>{windSpeed.toFixed(1)} m/s</span>
              </Flex>
            </Flex>
          </Flex>

          {/* Right: wind rose */}
          <div style={{
            flexShrink: 0,
            padding: '6px 10px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <WidgetWindRose size={108} color="rgba(255,255,255,0.9)" />
          </div>
        </Flex>

        {/* Hourly forecast */}
        <div style={{
          padding: '8px 10px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <WidgetHourlyStrip hours={hourlyData} />
        </div>

        {/* Bottom stat chips */}
        <Flex gap={5}>
          <GlassStatChip
            icon={<Droplets size={12} strokeWidth={ICON_STROKE} />}
            label="湿度"
            value={humidity}
            unit="%"
          />
          <GlassStatChip
            icon={<Wind size={12} strokeWidth={ICON_STROKE} />}
            label="风速"
            value={windSpeed.toFixed(1)}
            unit="m/s"
          />
          <GlassStatChip
            icon={<Eye size={12} strokeWidth={ICON_STROKE} />}
            label="能见度"
            value={visibility}
            unit="km"
          />
          <GlassStatChip
            icon={<Gauge size={12} strokeWidth={ICON_STROKE} />}
            label="气压"
            value={Math.round(pressure)}
            unit="hPa"
          />
        </Flex>
      </Flex>
    </IOSWidgetCard>
  )
}
