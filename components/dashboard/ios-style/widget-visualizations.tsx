"use client"

import { useMemo } from "react"
import { BERRY_THEME } from "@/lib/ui/berry-theme"

const A = BERRY_THEME.apple

// ─── Ring Progress — like the steps ring in reference ───

interface RingProgressProps {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  label?: string
  sublabel?: string
  startAngle?: number // -90 = top
}

export function WidgetRingProgress({
  value,
  size = 80,
  strokeWidth = 8,
  color = A.accents.blue,
  trackColor = A.track,
  label,
  sublabel,
  startAngle = -90,
}: RingProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference - (clamped / 100) * circumference
  const center = size / 2

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: `rotate(${startAngle}deg)` }}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {(label || sublabel) && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}>
          {label && (
            <span style={{
              fontSize: size * 0.26,
              fontWeight: 700,
              color: A.label,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}>{label}</span>
          )}
          {sublabel && (
            <span style={{
              fontSize: size * 0.13,
              fontWeight: 500,
              color: A.labelTertiary,
              lineHeight: 1,
            }}>{sublabel}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Radial Gauge — semicircle gauge with ticks ───

interface RadialGaugeProps {
  value: number
  min?: number
  max?: number
  size?: number
  color?: string
  label?: string
  unit?: string
  optimalMin?: number
  optimalMax?: number
}

export function WidgetRadialGauge({
  value,
  min = 0,
  max = 100,
  size = 120,
  color = A.accents.blue,
  label,
  unit,
  optimalMin,
  optimalMax,
}: RadialGaugeProps) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const startAngle = -220 // degrees
  const endAngle = 40
  const angleRange = endAngle - startAngle

  const clamped = Math.max(min, Math.min(max, value))
  const progress = (clamped - min) / (max - min)
  const currentAngle = startAngle + progress * angleRange

  const polarToCartesian = (angleDeg: number, r: number = radius) => {
    const rad = (angleDeg * Math.PI) / 180
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    }
  }

  const describeArc = (start: number, end: number, r: number = radius) => {
    const s = polarToCartesian(start, r)
    const e = polarToCartesian(end, r)
    const largeArc = end - start > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`
  }

  // Optimal range arc
  const optimalArc = useMemo(() => {
    if (optimalMin === undefined || optimalMax === undefined) return null
    const optStart = startAngle + ((optimalMin - min) / (max - min)) * angleRange
    const optEnd = startAngle + ((optimalMax - min) / (max - min)) * angleRange
    return describeArc(optStart, optEnd, radius)
  }, [optimalMin, optimalMax, min, max, radius, startAngle, angleRange])

  // Ticks
  const ticks = useMemo(() => {
    const count = 11
    return Array.from({ length: count }, (_, i) => {
      const angle = startAngle + (i / (count - 1)) * angleRange
      const inner = polarToCartesian(angle, radius - 2)
      const outer = polarToCartesian(angle, radius - 8)
      return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, major: i % 2 === 0 }
    })
  }, [startAngle, angleRange, radius, center])

  const needle = polarToCartesian(currentAngle, radius - 10)

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        {/* Track */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke={A.track}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Optimal range */}
        {optimalArc && (
          <path
            d={optimalArc}
            fill="none"
            stroke={`${A.accents.green}40`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {/* Progress */}
        <path
          d={describeArc(startAngle, currentAngle)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{ transition: 'all 0.6s ease' }}
        />
        {/* Ticks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.major ? A.labelQuaternary : A.trackStrong}
            strokeWidth={t.major ? 1.5 : 1}
            strokeLinecap="round"
          />
        ))}
        {/* Needle */}
        <line
          x1={center}
          y1={center}
          x2={needle.x}
          y2={needle.y}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={center} cy={center} r={4} fill={color} />
      </svg>
      <div style={{
        position: 'absolute',
        bottom: size * 0.12,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}>
        <span style={{
          fontSize: size * 0.2,
          fontWeight: 700,
          color: A.label,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}>{typeof value === 'number' ? value.toFixed(0) : value}</span>
        {unit && <span style={{ fontSize: size * 0.1, fontWeight: 500, color: A.labelTertiary }}>{unit}</span>}
        {label && <span style={{ fontSize: size * 0.09, fontWeight: 500, color: A.labelTertiary, marginTop: 2 }}>{label}</span>}
      </div>
    </div>
  )
}

// ─── Line Chart with Grid — like heart rate / weight chart ───

interface LineChartGridProps {
  data: number[]
  width?: number | string
  height?: number | string
  color?: string
  fillGradient?: boolean
  showGrid?: boolean
  showDots?: boolean
  strokeWidth?: number
  className?: string
}

export function WidgetLineChart({
  data,
  width = '100%',
  height = '100%',
  color = A.accents.blue,
  fillGradient = true,
  showGrid = true,
  showDots = false,
  strokeWidth = 2,
  className,
}: LineChartGridProps) {
  const padding = { top: 8, right: 4, bottom: 8, left: 4 }

  if (!data || data.length < 2) {
    return <div style={{ width, height }} className={className} />
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const W = 100
  const H = 40
  const innerW = W - padding.left - padding.right
  const innerH = H - padding.top - padding.bottom

  const points = data.map((v, i) => ({
    x: padding.left + (i / (data.length - 1)) * innerW,
    y: padding.top + innerH - ((v - min) / range) * innerH,
  }))

  const linePath = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x},${p.y}`
    const prev = points[i - 1]
    const cpx = (prev.x + p.x) / 2
    return `${acc} C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`
  }, '')

  const areaPath = `${linePath} L ${points[points.length - 1].x},${H - padding.bottom} L ${points[0].x},${H - padding.bottom} Z`
  const gradId = `grad-${color.replace('#', '')}`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      width={width}
      height={height}
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0.01} />
        </linearGradient>
      </defs>

      {showGrid && (
        <>
          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75].map((ratio, i) => (
            <line
              key={i}
              x1={padding.left}
              y1={padding.top + innerH * ratio}
              x2={W - padding.right}
              y2={padding.top + innerH * ratio}
              stroke="rgba(0,0,0,0.05)"
              strokeWidth={0.3}
            />
          ))}
        </>
      )}

      {fillGradient && <path d={areaPath} fill={`url(#${gradId})`} />}
      <path d={linePath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />

      {showDots && points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1} fill={color} />
      ))}
    </svg>
  )
}

// ─── Horizontal Level Bar — for CO2 / light levels ───

interface LevelBarProps {
  value: number
  min?: number
  max?: number
  color?: string
  markers?: Array<{ value: number; label?: string; color?: string }>
  height?: number
}

export function WidgetLevelBar({
  value,
  min = 0,
  max = 100,
  color = A.accents.blue,
  markers = [],
  height = 8,
}: LevelBarProps) {
  const clamped = Math.max(min, Math.min(max, value))
  const progress = ((clamped - min) / (max - min)) * 100

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <div style={{
        width: '100%',
        height,
        borderRadius: height / 2,
        background: A.track,
        position: 'relative',
        overflow: 'visible',
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          borderRadius: height / 2,
          background: color,
          transition: 'width 0.6s ease',
        }} />
        {markers.map((m, i) => {
          const pos = ((m.value - min) / (max - min)) * 100
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${pos}%`,
                top: -2,
                bottom: -2,
                width: 2,
                borderRadius: 1,
                background: m.color || A.labelQuaternary,
                transform: 'translateX(-1px)',
              }}
            />
          )
        })}
      </div>
      {markers.length > 0 && (
        <div style={{ position: 'relative', width: '100%', height: 14, marginTop: 4 }}>
          {markers.map((m, i) => {
            const pos = ((m.value - min) / (max - min)) * 100
            return (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${pos}%`,
                  transform: 'translateX(-50%)',
                  fontSize: 9,
                  fontWeight: 600,
                  color: m.color || A.labelTertiary,
                  whiteSpace: 'nowrap',
                }}
              >
                {m.label}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Dual Bar — for soil moisture + fertility ───

interface DualBarProps {
  values: Array<{ value: number; label: string; color: string }>
  max?: number
}

export function WidgetDualBars({ values, max = 100 }: DualBarProps) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {values.map((v, i) => {
        const pct = Math.min(100, (v.value / max) * 100)
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: A.labelTertiary }}>{v.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: v.color }}>{v.value.toFixed(0)}%</span>
            </div>
            <div style={{ width: '100%', height: 6, borderRadius: 3, background: A.track }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 3,
                background: v.color,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Compact Vertical Bar Chart — for small/medium widget sparkbars ───

interface BarsProps {
  data: number[]
  color?: string
  height?: number
  barWidth?: number
  gap?: number
}

export function WidgetBars({
  data,
  color = A.accents.blue,
  height = 36,
  barWidth = 4,
  gap = 2,
}: BarsProps) {
  if (!data || data.length === 0) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap, height }}>
      {data.map((v, i) => {
        const h = Math.max(2, ((v - min) / range) * height)
        const isLast = i === data.length - 1
        return (
          <div
            key={i}
            style={{
              width: barWidth,
              height: h,
              borderRadius: barWidth / 2,
              background: isLast ? color : `${color}55`,
              transition: 'height 0.4s ease, background 0.3s ease',
            }}
          />
        )
      })}
    </div>
  )
}

// ─── Compact Gauge Strip — horizontal segmented threshold bar ───

interface GaugeStripProps {
  value: number
  min: number
  max: number
  color: string
  segments?: number
  height?: number
}

export function WidgetGaugeStrip({
  value,
  min,
  max,
  color,
  segments = 12,
  height = 6,
}: GaugeStripProps) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const filled = Math.round(pct * segments)
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: segments }, (_, i) => {
        const active = i < filled
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height,
              borderRadius: 2,
              background: active ? color : A.track,
              transition: 'background 0.4s ease',
            }}
          />
        )
      })}
    </div>
  )
}
