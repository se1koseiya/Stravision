"use client"

import React, { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * 通用热力图（全库首个 heatmap 组件）
 *
 * 纯 CSS Grid + 颜色插值，零图表库依赖。用于把「一个数字」变成「一眼看出哪里/何时不对」。
 *
 * 与「空间热力图」的取舍：平台当前只有单点传感器，没有分区数据，
 * 所以**默认用法是时间轴热力图**（7 天 × 每天 6 个 4 小时时段），
 * 数据全部来自真实 `/api/device-history`，不做任何插值造假坐标。
 * 未来接入多分区探头时，同一组件传 `rowLabels`（分区名）即可复用为空间热力图。
 */

export interface HeatmapCell {
  row: number
  col: number
  /** null = 无数据（渲染为空白格，不参与色阶） */
  value: number | null
}

/** 冷 → 热 默认色标（起于品牌 emerald，终于告警红） */
export const DEFAULT_HEATMAP_STOPS = ["#A7F3D0", "#34D399", "#FCD34D", "#FB923C", "#EF4444"]

function clamp01(t: number) {
  return Math.max(0, Math.min(1, t))
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** 在色标之间线性插值，t ∈ [0,1] */
export function colorFromStops(stops: string[], t: number): string {
  if (!stops.length) return "#e4e4e7"
  if (stops.length === 1) return stops[0]
  const p = clamp01(t) * (stops.length - 1)
  const i = Math.min(Math.floor(p), stops.length - 2)
  const f = p - i
  const [r1, g1, b1] = hexToRgb(stops[i])
  const [r2, g2, b2] = hexToRgb(stops[i + 1])
  const r = Math.round(r1 + (r2 - r1) * f)
  const g = Math.round(g1 + (g2 - g1) * f)
  const b = Math.round(b1 + (b2 - b1) * f)
  return `rgb(${r}, ${g}, ${b})`
}

export interface HeatmapGridProps {
  rows: number
  cols: number
  /** 稀疏单元格数组，未出现的坐标视为无数据 */
  cells: HeatmapCell[]
  /** 色阶下界；缺省取数据最小值 */
  min?: number
  /** 色阶上界；缺省取数据最大值 */
  max?: number
  /** 色标：由冷到热 */
  stops?: string[]
  rowLabels?: string[]
  colLabels?: string[]
  /** 单元格圆角 */
  cellRadius?: number
  /** 单元格间距 */
  cellGap?: number
  /** 数值单位（tooltip / 图例用） */
  unit?: string
  /** 数值展示格式化（默认保留 1 位小数） */
  formatValue?: (v: number) => string
  /** 点击单元格 */
  onSelectCell?: (cell: HeatmapCell) => void
  /** 高亮某一行（例如鼠标悬停在大棚某个区域） */
  highlightRow?: number
  className?: string
  /** 无障碍描述 */
  ariaLabel?: string
}

export function HeatmapGrid({
  rows,
  cols,
  cells,
  min,
  max,
  stops = DEFAULT_HEATMAP_STOPS,
  rowLabels,
  colLabels,
  cellRadius = 4,
  cellGap = 3,
  unit = "",
  formatValue = (v) => v.toFixed(1),
  onSelectCell,
  highlightRow,
  className,
  ariaLabel = "数据热力图",
}: HeatmapGridProps) {
  const [active, setActive] = useState<HeatmapCell | null>(null)

  const { lo, hi } = useMemo(() => {
    const nums = cells.map((c) => c.value).filter((v): v is number => v !== null && Number.isFinite(v))
    const dataMin = nums.length ? Math.min(...nums) : 0
    const dataMax = nums.length ? Math.max(...nums) : 1
    return {
      lo: min ?? dataMin,
      hi: max ?? (dataMax === dataMin ? dataMin + 1 : dataMax),
    }
  }, [cells, min, max])

  const byKey = useMemo(() => {
    const m = new Map<string, HeatmapCell>()
    cells.forEach((c) => m.set(`${c.row}:${c.col}`, c))
    return m
  }, [cells])

  const range = hi - lo || 1
  const hasRowLabels = !!rowLabels?.length
  const hasColLabels = !!colLabels?.length

  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-1.5">
        {/* 行标签 */}
        {hasRowLabels && (
          <div
            className="flex flex-col justify-between shrink-0 text-[10px] leading-none text-zinc-400 dark:text-zinc-500"
            style={{ rowGap: cellGap }}
          >
            {Array.from({ length: rows }, (_, r) => (
              <div key={r} className="flex items-center" style={{ flex: 1 }}>
                <span className="truncate">{rowLabels![r] ?? ""}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div
            role="img"
            aria-label={ariaLabel}
            className="grid w-full"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gap: cellGap,
            }}
          >
            {Array.from({ length: rows }, (_, r) =>
              Array.from({ length: cols }, (_, c) => {
                const cell = byKey.get(`${r}:${c}`)
                const v = cell?.value ?? null
                const t = v === null ? 0 : (v - lo) / range
                const isActive = active?.row === r && active?.col === c
                const dimmed = highlightRow !== undefined && highlightRow !== r
                return (
                  // 注意：这里**不能**用 disabled —— 禁用按钮在 Chrome 里不派发鼠标事件，
                  // 于是 title 提示永远不出现（「几点的温度是多少」这个最关键的信息就没了）。
                  // 所以始终可悬停，只在传入 onSelectCell 时才变成可点击。
                  <button
                    type="button"
                    key={`${r}:${c}`}
                    tabIndex={onSelectCell ? 0 : -1}
                    aria-disabled={onSelectCell ? undefined : true}
                    onMouseEnter={() => setActive({ row: r, col: c, value: v })}
                    onMouseLeave={() => setActive(null)}
                    onClick={() => cell && onSelectCell?.(cell)}
                    title={
                      v === null
                        ? "无数据"
                        : `${rowLabels?.[r] ?? ""} ${colLabels?.[c] ?? ""}：${formatValue(v)}${unit}`
                    }
                    className={cn(
                      "relative aspect-square w-full transition-[transform,opacity,box-shadow] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/40 dark:focus-visible:ring-white/50",
                      onSelectCell && "cursor-pointer hover:scale-[1.12] hover:z-10",
                      !onSelectCell && "cursor-default",
                      isActive && "ring-2 ring-zinc-900/40 dark:ring-white/50 z-10",
                      dimmed && "opacity-35"
                    )}
                    style={{
                      borderRadius: cellRadius,
                      background:
                        v === null
                          ? "repeating-linear-gradient(45deg, rgba(120,120,120,0.10) 0 3px, transparent 3px 6px)"
                          : colorFromStops(stops, t),
                    }}
                  />
                )
              })
            )}
          </div>

          {/* 列标签 */}
          {hasColLabels && (
            <div
              className="mt-1.5 grid text-[10px] leading-none text-zinc-400 dark:text-zinc-500"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: cellGap }}
            >
              {Array.from({ length: cols }, (_, c) => (
                <span key={c} className="truncate text-center">{colLabels![c] ?? ""}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-zinc-400 dark:text-zinc-500">
        <span className="tabular-nums">{formatValue(lo)}{unit}</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden flex">
          {stops.map((s, i) => (
            <span key={i} className="flex-1" style={{ background: s }} />
          ))}
        </div>
        <span className="tabular-nums">{formatValue(hi)}{unit}</span>
      </div>
    </div>
  )
}

export default HeatmapGrid
