"use client"

import React from "react"

/**
 * 光谱图统一实现（Single Source of Truth）
 *
 * 背景：原先 `components/ai/spectral-card.tsx`、`components/dashboard/spectral-card.tsx`、
 * `components/monitor/spectral-popup.tsx` 各自复制了一份几乎相同的 `SpectralChart` +
 * `channels` 常量。此处收敛为唯一实现，三处只保留各自的外壳版式。
 *
 * 通道固定为 11 路：415 / 445 / 480 / 515 / 555 / 590 / 630 / 680 / NIR / Clear / Flicker。
 */

export interface SpectralChannel {
  /** 设备数据字段名 */
  id: string
  /** 波长 / 通道简称，如 "415"、"NIR" */
  name: string
  /** 英文色彩名 */
  label: string
  /** 柱状色 */
  color: string
}

export const SPECTRAL_CHANNELS: SpectralChannel[] = [
  { id: "channel1", name: "415", label: "Violet", color: "#8B00FF" },
  { id: "channel2", name: "445", label: "Blue", color: "#0000FF" },
  { id: "channel3", name: "480", label: "Cyan", color: "#00FFFF" },
  { id: "channel4", name: "515", label: "Green", color: "#00FF00" },
  { id: "channel5", name: "555", label: "Y-G", color: "#ADFF2F" },
  { id: "channel6", name: "590", label: "Yellow", color: "#FFFF00" },
  { id: "channel7", name: "630", label: "Orange", color: "#FFA500" },
  { id: "channel8", name: "680", label: "Red", color: "#FF0000" },
  { id: "channel9", name: "NIR", label: "NIR", color: "#8B0000" },
  { id: "channel10", name: "Clr", label: "Clear", color: "#E0E0E0" },
  { id: "channel11", name: "Fli", label: "Flicker", color: "#808080" },
]

/** 从任意设备数据对象里抽取 11 通道数值，缺失按 0 计 */
export function spectralValuesFrom(
  data: Record<string, unknown> | null | undefined
): number[] {
  return SPECTRAL_CHANNELS.map((c) => (data ? ((data[c.id] as number) || 0) : 0))
}

/** 是否至少有一路读数 */
export function hasSpectralData(values: number[]): boolean {
  return values.some((v) => v > 0)
}

export interface SpectralChartProps {
  values: number[]
  /** 每根柱子的颜色，默认取 SPECTRAL_CHANNELS 的 color */
  colors?: string[]
  /** 纵轴最大值，默认取 values 最大值（为 0 时按 1 兜底） */
  maxValue?: number
  /** 单位高度（viewBox 坐标系，非像素） */
  height?: number
  /** 柱子圆角 */
  rx?: number
  /** 面积渐变 id，同一页面出现多张图时必须唯一 */
  gradientId?: string
}

/** 轻量 SVG 光谱柱状 + 平滑面积图，不依赖任何图表库 */
export function SpectralChart({
  values,
  colors,
  maxValue,
  height = 96,
  rx = 2,
  gradientId = "spectral-area",
}: SpectralChartProps) {
  const W = 100
  const H = height
  const pad = 2
  const barW = (W - pad * (values.length + 1)) / values.length
  const safeMax = (maxValue ?? Math.max(...values, 0)) || 1

  const pts = values.map((v, i) => ({
    x: pad + i * (barW + pad) + barW / 2,
    y: H - (v / safeMax) * (H - 8) - 4,
  }))

  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x},${p.y}`
    const prev = pts[i - 1]
    const cx = prev.x + (p.x - prev.x) / 2
    return `${acc} C ${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`
  }, "")

  const areaPath =
    pts.length > 0
      ? `${linePath} L ${pts[pts.length - 1].x},${H} L ${pts[0].x},${H} Z`
      : ""

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%" }}
      role="img"
      aria-label="光谱通道读数"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(232,121,249,0.2)" />
          <stop offset="100%" stopColor="rgba(232,121,249,0.02)" />
        </linearGradient>
      </defs>
      {pts.map((p, i) => (
        <rect
          key={i}
          x={pad + i * (barW + pad)}
          y={p.y}
          width={barW}
          height={Math.max(H - p.y, 0)}
          rx={rx}
          fill={colors?.[i] ?? SPECTRAL_CHANNELS[i]?.color ?? "#e879f9"}
          opacity={0.85}
        />
      ))}
      {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
      {linePath ? (
        <path
          d={linePath}
          fill="none"
          stroke="#e879f9"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  )
}

export default SpectralChart
