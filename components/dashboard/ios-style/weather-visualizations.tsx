"use client"

import { useMemo } from "react"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import {
  IconCloudy,
  IconCloudyNight,
  IconFog,
  IconHeavyRain,
  IconLightRain,
  IconSnow,
  IconSunny,
  IconSun,
  IconThunderstorm,
} from "@/components/icon";
import { skyDataBar, getSkyRamp, type SkyRamp } from "./weather-sky";

const A = BERRY_THEME.apple

// ─── Weather condition to icon + color mapping ───
//
// ⚠️ 历史 bug：这里每个分支都返回 IconCloudStorage（IconPark.CloudStorage，
// 一个"云上硬盘"图标），所以任何天气渲染出来都是一朵带硬盘的云。
// 现在改用 lucide 的真实天气图标族，并按「夜间 / 量级」细分。

/**
 * 天气条件 → 图标 + 色彩。
 *
 * ⚠️ 这里的 gradient / color 曾是「糖果色」来源，与卡片天空底完全不是一套色：
 *    暴雨 #1e40af→#059669（蓝绿对撞）、晴 #f6d365→#fda085（暖橙）、
 *    雷 #667eea→#764ba2（糖果紫）、雪 #a8edea→#fed6e3（粉蓝）…
 *    消费方 device-control 拿它当沉浸光感的「环境光源」--wx-1/--wx-2，
 *    结果是同一场雨在设备页与看板卡上是两个颜色。
 * 现在统一从 ./weather-sky 取色：color = 该色相的强调色（图标唯一色彩点），
 * gradient = 同色相两个色标（材质染色用，色相差恒定 → 读起来是一块介质）。
 */
export function getWeatherConfig(condition: string, isNight = false) {
  const ramp = getSkyRamp(condition, isNight)
  // 材质环境染色要比天空底更亮一档：backdrop-filter 的 saturate 会把底色吸上来，
  // 给同值会得到「染了个寂寞」；这里用 stops[0]（最亮档）配 stops[1]。
  const gradient = [ramp.stops[0], ramp.stops[1]] as const
  const c = (condition || '').toLowerCase()
  // 雷暴
  if (c.includes('thunder') || c.includes('storm') || c.includes('雷')) {
    return { icon: IconThunderstorm, color: ramp.accent, gradient }
  }
  // 雪
  if (c.includes('snow') || c.includes('sleet') || c.includes('blizzard') || c.includes('雪')) {
    return { icon: IconSnow, color: ramp.accent, gradient }
  }
  // 雨：按量级区分暴雨 / 小到中雨
  if (c.includes('heavy') || c.includes('暴雨') || c.includes('大雨') || c.includes('torrential')) {
    return { icon: IconHeavyRain, color: ramp.accent, gradient }
  }
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower') || c.includes('雨')) {
    return { icon: IconLightRain, color: ramp.accent, gradient }
  }
  // 雾 / 霾 / 沙尘
  if (c.includes('fog') || c.includes('mist') || c.includes('haze') || c.includes('雾') || c.includes('霾')) {
    return { icon: IconFog, color: ramp.accent, gradient }
  }
  // 阴天（全云，无太阳）
  if (c.includes('overcast') || c.includes('阴')) {
    return { icon: isNight ? IconCloudyNight : IconCloudy, color: ramp.accent, gradient }
  }
  // 多云 / 局部多云
  if (c.includes('cloud') || c.includes('partly') || c.includes('多云')) {
    return { icon: isNight ? IconCloudyNight : IconCloudy, color: ramp.accent, gradient }
  }
  // 晴：夜间用月亮，白天用太阳
  if (isNight) {
    return { icon: IconCloudyNight, color: ramp.accent, gradient }
  }
  if (c.includes('clear') || c.includes('sun') || c.includes('晴')) {
    return { icon: IconSunny, color: ramp.accent, gradient }
  }
  // 未知：白天给太阳
  return { icon: IconSun, color: ramp.accent, gradient }
}

// ─── Wind Arrow — shows wind direction with rotation ───

export function WidgetWindArrow({
  direction,
  size = 16,
  color = A.labelSecondary,
  strokeWidth = 2,
}: {
  direction: number | string
  size?: number
  color?: string
  strokeWidth?: number
}) {
  const deg = typeof direction === 'number'
    ? direction
    : dirToDegrees(direction)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${deg}deg)`, transition: 'transform 0.6s ease' }}
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  )
}

function dirToDegrees(dir: string): number {
  const map: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5,
    SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  }
  return map[dir.toUpperCase()] ?? 0
}

// ─── Wind Rose — polar area chart for wind direction distribution ───

interface WindRoseProps {
  data?: Array<{ direction: string; speed: number; frequency: number }>
  size?: number
  color?: string
}

export function WidgetWindRose({
  data,
  size = 160,
  color = A.accents.blue,
}: WindRoseProps) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const segments = 16

  const chartData = useMemo(() => {
    if (data && data.length > 0) return data
    // Generate realistic sample data with prevailing wind
    return Array.from({ length: segments }, (_, i) => {
      const angle = (i / segments) * 360
      const dirIndex = Math.round(i / 2) % 8
      // Create a prevailing wind from SW (225deg = index 10)
      const base = Math.max(0, Math.cos((angle - 225) * Math.PI / 180))
      const freq = 0.2 + base * 0.6 + Math.random() * 0.2
      const speed = 2 + base * 8 + Math.random() * 4
      return { direction: directions[dirIndex], speed, frequency: freq }
    })
  }, [data])

  const maxFreq = Math.max(...chartData.map(d => d.frequency))
  const center = size / 2
  const maxRadius = size / 2 - 28
  const innerRadius = 4

  // Wind speed bands for legend
  const bands = [
    { label: '< 5 m/s', max: 5, opacity: 0.3 },
    { label: '5-10 m/s', max: 10, opacity: 0.5 },
    { label: '10-20 m/s', max: 20, opacity: 0.75 },
    { label: '> 20 m/s', max: Infinity, opacity: 1 },
  ]

  function polarToCartesian(angleDeg: number, r: number) {
    const rad = (angleDeg - 90) * Math.PI / 180
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    }
  }

  function createArcSlice(startAngle: number, endAngle: number, r1: number, r2: number) {
    const p1 = polarToCartesian(startAngle, r2)
    const p2 = polarToCartesian(endAngle, r2)
    const p3 = polarToCartesian(endAngle, r1)
    const p4 = polarToCartesian(startAngle, r1)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    return `M ${p1.x} ${p1.y} A ${r2} ${r2} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${r1} ${r1} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid circles */}
        {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={maxRadius * ratio}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={0.5}
          />
        ))}
        {/* Direction lines */}
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * 360
          const p1 = polarToCartesian(angle, innerRadius)
          const p2 = polarToCartesian(angle, maxRadius)
          return (
            <line
              key={i}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={0.5}
            />
          )
        })}
        {/* Data slices */}
        {chartData.map((d, i) => {
          const startAngle = (i / segments) * 360
          const endAngle = ((i + 1) / segments) * 360
          const r1 = innerRadius
          const r2 = innerRadius + (d.frequency / maxFreq) * (maxRadius - innerRadius)
          const band = bands.find(b => d.speed < b.max) || bands[bands.length - 1]
          return (
            <path
              key={i}
              d={createArcSlice(startAngle + 1, endAngle - 1, r1, r2)}
              fill={color}
              fillOpacity={band.opacity}
              stroke={color}
              strokeWidth={0.3}
              strokeOpacity={0.3}
            />
          )
        })}
        {/* Direction labels */}
        {directions.map((dir, i) => {
          const angle = (i / 8) * 360
          const p = polarToCartesian(angle, maxRadius + 14)
          return (
            <text
              key={dir}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.7)"
              fontSize={9}
              fontWeight={600}
            >
              {dir}
            </text>
          )
        })}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {bands.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 14, height: 14, borderRadius: 4,
              background: color,
              opacity: b.opacity,
            }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Hourly Forecast Strip — horizontal scrollable hourly data ───

export interface HourlyData {
  time: string
  temp: number
  condition: string
  windSpeed: number
  windDir: number | string
  isNow?: boolean
  /** 24 小时制的整点小时数（0-23）：用于判断该时段是否夜间，决定渲染太阳还是月亮 */
  hour?: number
}

export function WidgetHourlyStrip({
  hours,
  accentColor = '#fff',
}: {
  hours: HourlyData[]
  accentColor?: string
}) {
  return (
    <div style={{
      display: 'flex',
      gap: 4,
      overflowX: 'auto',
      overflowY: 'hidden',
      paddingBottom: 2,
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }}
      className="hide-scrollbar"
    >
      {hours.map((h, i) => {
        // 夜间（19:00–06:00）晴天渲染月亮而不是太阳
        const isNight = h.hour !== undefined
          ? (h.hour >= 19 || h.hour < 6)
          : false
        const cfg = getWeatherConfig(h.condition, isNight)
        const WeatherIcon = cfg.icon
        const isActive = h.isNow
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '8px 10px',
              borderRadius: 14,
              background: isActive
                ? 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))'
                : 'transparent',
              border: isActive ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
              minWidth: 56,
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
              lineHeight: 1,
            }}>{h.time}</span>
            <WeatherIcon size={18} strokeWidth={2} color={isActive ? '#fff' : 'rgba(255,255,255,0.8)'} />
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>{h.temp}°</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WidgetWindArrow direction={h.windDir} size={10} color="rgba(255,255,255,0.6)" strokeWidth={2} />
              <span style={{
                fontSize: 9,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>{h.windSpeed.toFixed(1)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Multi-day Forecast List ───

export interface ForecastDay {
  day: string
  condition: string
  windSpeed: number
  windDir: number | string
  high: number
  low: number
  rainChance?: number
}

/**
 * 7 日预报列表
 *
 * ⚠️ `ramp` 是可选的：调用方（天气卡）传入当前天气色相板，让温度区间条
 *    与卡片天空底色同属一个色相。**不给就退回中性灰蓝**（不再用旧版那条
 *    蓝→白→黄彩虹 —— 三个色相横插在同色相背景上，是"廉价感"的主要来源；
 *    而且彩虹条把"温度高低"和"配色"混成了一件事，读数反而失真。）
 */
export function WidgetForecastList({
  days,
  maxTemp,
  minTemp,
  ramp,
}: {
  days: ForecastDay[]
  maxTemp?: number
  minTemp?: number
  ramp?: SkyRamp
}) {
  const globalMax = maxTemp ?? Math.max(...days.map(d => d.high))
  const globalMin = minTemp ?? Math.min(...days.map(d => d.low))
  const range = globalMax - globalMin || 1
  /* 未传色相时的中性兜底（冷灰蓝，非纯灰） */
  const barFill = ramp ? skyDataBar(ramp) : 'linear-gradient(90deg, #7C93A8 0%, #4A5D6E 100%)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {days.map((d, i) => {
        const cfg = getWeatherConfig(d.condition)
        const WeatherIcon = cfg.icon
        const barLeft = ((d.low - globalMin) / range) * 100
        const barWidth = ((d.high - d.low) / range) * 100

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 8px',
              borderRadius: 12,
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            {/* Day name + condition */}
            <div style={{ width: 50, flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>{d.day}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', lineHeight: 1.2 }}>{d.condition}</div>
            </div>

            {/* Weather icon */}
            <WeatherIcon size={14} strokeWidth={2} color="rgba(255,255,255,0.8)" />

            {/* Wind */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, width: 40, flexShrink: 0 }}>
              <WidgetWindArrow direction={d.windDir} size={10} color="rgba(255,255,255,0.6)" strokeWidth={2} />
              <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>
                {d.windSpeed.toFixed(1)}
              </span>
            </div>

            {/* Temp range bar */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', width: 26, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {d.low}°
              </span>
              <div style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.15)',
                position: 'relative',
                minWidth: 20,
              }}>
                <div style={{
                  position: 'absolute',
                  left: `${barLeft}%`,
                  width: `${barWidth}%`,
                  height: '100%',
                  borderRadius: 2,
                  background: barFill,
                }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', width: 26, fontVariantNumeric: 'tabular-nums' }}>
                {d.high}°
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Glass Stat Chip — small translucent metric chip ───

export function GlassStatChip({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  unit?: string
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      padding: '8px 6px',
      borderRadius: 12,
      background: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.12)',
      flex: 1,
      minWidth: 0,
    }}>
      <span style={{ color: 'rgba(255,255,255,0.7)', display: 'inline-flex' }}>{icon}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        {unit && <span style={{ fontSize: 9, fontWeight: 500, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>{unit}</span>}
      </div>
      <span style={{ fontSize: 9, fontWeight: 500, color: 'rgba(255,255,255,0.5)', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</span>
    </div>
  )
}
