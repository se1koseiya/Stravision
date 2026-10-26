"use client"

import React, { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { simulatedHistory, useSimulatedValues } from "@/lib/demo/simulated-metrics"

/**
 * 迷你趋势线（sparkline）—— 把「一个数字」变成「一条走势」的最小可视化单元。
 *
 * 用途：业务页的传感器读数旁边挂一条真实历史走势（数据源 /api/device-history）。
 * 纯 SVG，零依赖；描边走 `currentColor`，因此自动跟随明暗主题与所在容器的文字色。
 */

const historyCache = new Map<string, Promise<number[]>>()

async function fetchHistory(type: string, range: string): Promise<number[]> {
  const key = `${type}:${range}`
  const hit = historyCache.get(key)
  if (hit) return hit
  const p = (async () => {
    try {
      const res = await fetch(`/api/device-history?type=${encodeURIComponent(type)}&range=${range}`)
      const json = await res.json()
      const list = json?.success && Array.isArray(json.data) ? json.data : []
      return list
        .map((d: { value?: unknown }) => Number(d?.value))
        .filter((v: number) => Number.isFinite(v))
    } catch {
      return []
    }
  })()
  historyCache.set(key, p)
  // 60s 内复用同一份结果，避免同一屏 4 个探针各拉一次
  setTimeout(() => historyCache.delete(key), 60_000)
  return p
}

export interface SparklineProps {
  values: number[]
  /** 线宽（viewBox 单位） */
  strokeWidth?: number
  /** 是否填充面积渐变 */
  area?: boolean
  className?: string
  /** 无障碍描述 */
  ariaLabel?: string
}

export function Sparkline({
  values,
  strokeWidth = 1.6,
  area = true,
  className,
  ariaLabel = "趋势",
}: SparklineProps) {
  const W = 100
  const H = 32
  const gradientId = React.useId()

  if (!values.length) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden>
        <line
          x1={0}
          y1={H - 2}
          x2={W}
          y2={H - 2}
          stroke="currentColor"
          strokeWidth={0.8}
          strokeDasharray="3 3"
          opacity={0.3}
        />
      </svg>
    )
  }

  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const step = values.length > 1 ? W / (values.length - 1) : W
  const pad = strokeWidth
  const toY = (v: number) => H - pad - ((v - lo) / span) * (H - pad * 2)
  const pts = values.map((v, i) => [i * step, toY(v)] as const)
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ")
  const areaPath = `${line} L ${W},${H} L 0,${H} Z`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      {area && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* 末端点：强调「现在」 */}
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={1.9} fill="currentColor" />
    </svg>
  )
}

export interface SensorSparklineProps extends Omit<SparklineProps, "values"> {
  /** 传感器类型（temperature / humidity / co2 / light / soilMoisture …） */
  type: string
  /** 时间范围（10m / 1h / 7h / 1d / 7d） */
  range?: string
  /** 自绘时的容器类（默认给一个紧凑高度） */
  className?: string
}

/** 自拉历史数据的传感器走势线（内部带 60s 请求去重缓存） */
export function SensorSparkline({
  type,
  range = "7h",
  className,
  ...rest
}: SensorSparklineProps) {
  const [values, setValues] = useState<number[]>([])
  /**
   * 模拟数值开启时不打 `/api/device-history`：那台机器上既没有硬件也没有历史表，
   * 拉回来的是空数组 → 走势线退化成一条虚线，正是模拟数值要消除的东西。
   * 这里直接用同一套波形生成，末端与页面上的读数天然对齐。
   */
  const simulated = useSimulatedValues()

  useEffect(() => {
    let alive = true
    if (simulated) {
      const load = () => {
        if (alive) setValues(simulatedHistory(type, range).map((point) => point.value))
      }
      load()
      // 30s 推进一次，"现在"那个点才会往右走（不刷新会定格在打开开关的那一刻）
      const timer = setInterval(load, 30_000)
      return () => {
        alive = false
        clearInterval(timer)
      }
    }
    fetchHistory(type, range).then((v) => {
      if (alive) setValues(v)
    })
    return () => {
      alive = false
    }
  }, [type, range, simulated])

  return <Sparkline values={values} className={cn("h-3.5 w-full", className)} {...rest} />
}

export default Sparkline
