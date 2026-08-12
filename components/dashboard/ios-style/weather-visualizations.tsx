"use client"

import { useMemo } from "react"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle,
} from "lucide-react"

const A = BERRY_THEME.apple

// ─── Weather condition to icon + color mapping ───

export function getWeatherConfig(condition: string) {
  const c = condition.toLowerCase()
  if (c.includes('thunder') || c.includes('雷')) return { icon: CloudLightning, color: '#6366f1', gradient: ['#667eea', '#764ba2'] }
  if (c.includes('snow') || c.includes('雪')) return { icon: CloudSnow, color: '#7dd3fc', gradient: ['#a8edea', '#fed6e3'] }
  if (c.includes('rain') || c.includes('drizzle') || c.includes('雨')) return { icon: CloudRain, color: '#60a5fa', gradient: ['#4facfe', '#00f2fe'] }
  if (c.includes('drizzle') || c.includes('毛毛雨')) return { icon: CloudDrizzle, color: '#7dd3fc', gradient: ['#89f7fe', '#66a6ff'] }
  if (c.includes('cloud') || c.includes('overcast') || c.includes('阴') || c.includes('多云')) return { icon: Cloud, color: '#94a3b8', gradient: ['#c9d6ff', '#e2e2e2'] }
  if (c.includes('fog') || c.includes('mist') || c.includes('雾')) return { icon: Cloud, color: '#94a3b8', gradient: ['#d7dde8', '#e9e9e9'] }
  return { icon: Sun, color: '#fbbf24', gradient: ['#f6d365', '#fda085'] }
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
        const cfg = getWeatherConfig(h.condition)
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
            <WeatherIcon size={18} strokeWidth={1.75} color={isActive ? '#fff' : 'rgba(255,255,255,0.8)'} />
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

export function WidgetForecastList({
  days,
  maxTemp,
  minTemp,
}: {
  days: ForecastDay[]
  maxTemp?: number
  minTemp?: number
}) {
  const globalMax = maxTemp ?? Math.max(...days.map(d => d.high))
  const globalMin = minTemp ?? Math.min(...days.map(d => d.low))
  const range = globalMax - globalMin || 1

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
            <WeatherIcon size={14} strokeWidth={1.75} color="rgba(255,255,255,0.8)" />

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
                  background: 'linear-gradient(90deg, rgba(147,197,253,0.8), rgba(255,255,255,0.9), rgba(251,191,36,0.8))',
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
