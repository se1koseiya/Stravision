"use client"

import { useEffect, useMemo, useState } from "react"
import { Flex, Button, Segmented } from "antd"
import { IOSWidgetCard, WidgetHeader, WidgetStatusPill } from "./ios-widget-card"
import {
  HeatmapGrid,
  DEFAULT_HEATMAP_STOPS,
  type HeatmapCell,
} from "@/components/charts/heatmap-grid"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { IconLoading } from "@/components/icon"

const A = BERRY_THEME.apple
const ICON_STROKE = 1.75

/** 7 天 × 6 个 4 小时时段 —— 与 device-history 7d 档的 4h 聚合粒度对齐，不撒谎 */
const DAYS = 7
const SLOTS = 6
const SLOT_HOURS = 4

const SLOT_LABELS = ["0-4", "4-8", "8-12", "12-16", "16-20", "20-24"]

interface MetricDef {
  key: string
  label: string
  unit: string
  /** 色标：冷 → 热 */
  stops: string[]
  /** 越界告警阈值（用于摘要里标红） */
  format: (v: number) => string
}

const METRICS: MetricDef[] = [
  {
    key: "temperature",
    label: "温度",
    unit: "°C",
    stops: ["#BFDBFE", "#A7F3D0", "#FCD34D", "#FB923C", "#EF4444"],
    format: (v) => v.toFixed(1),
  },
  {
    key: "humidity",
    label: "湿度",
    unit: "%",
    stops: ["#FDE68A", "#A7F3D0", "#34D399", "#0EA5E9", "#1D4ED8"],
    format: (v) => v.toFixed(0),
  },
  {
    key: "co2",
    label: "CO₂",
    unit: "ppm",
    stops: DEFAULT_HEATMAP_STOPS,
    format: (v) => v.toFixed(0),
  },
  {
    key: "light",
    label: "光照",
    unit: "lux",
    stops: DEFAULT_HEATMAP_STOPS,
    format: (v) => Math.round(v).toString(),
  },
]

interface HistoryPoint {
  timestamp: number
  value: number
}

interface HeatmapWidgetProps {
  size?: "small" | "medium" | "large"
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/**
 * 时段热力图小组件 —— 回答「什么时候环境不对」，而不是「现在是多少」。
 * 数据源：/api/device-history（真实历史），无数据时明确留白。
 */
export function HeatmapWidget({
  size = "large",
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress,
}: HeatmapWidgetProps) {
  const [metricKey, setMetricKey] = useState<string>(METRICS[0].key)
  const [points, setPoints] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(true)

  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0]

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/device-history?type=${metricKey}&range=7d`)
        const json = await res.json()
        const list: HistoryPoint[] = json?.success && Array.isArray(json.data) ? json.data : []
        if (!cancelled) setPoints(list)
      } catch (e) {
        console.error("[HeatmapWidget] fetch history failed", e)
        if (!cancelled) setPoints([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [metricKey])

  /** 按「星期 × 时段」归入 7×6 网格 */
  const { cells, rowLabels, peak } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 生成从 6 天前到今天的日期轴
    const dayList: Date[] = []
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      dayList.push(d)
    }
    const dayIndex = new Map(dayList.map((d, i) => [dayKey(d), i]))

    // 每个 (day, slot) 取该桶内的平均值
    const buckets = new Map<string, { sum: number; n: number }>()
    for (const p of points) {
      if (!Number.isFinite(p?.value)) continue
      const d = new Date(p.timestamp)
      const di = dayIndex.get(dayKey(d))
      if (di === undefined) continue
      const slot = Math.min(SLOTS - 1, Math.floor(d.getHours() / SLOT_HOURS))
      const key = `${di}:${slot}`
      const b = buckets.get(key) ?? { sum: 0, n: 0 }
      b.sum += p.value
      b.n += 1
      buckets.set(key, b)
    }

    const out: HeatmapCell[] = []
    let peakCell: { row: number; col: number; value: number } | null = null
    buckets.forEach((b, key) => {
      const [row, col] = key.split(":").map(Number)
      const value = b.sum / b.n
      out.push({ row, col, value })
      if (!peakCell || value > peakCell.value) peakCell = { row, col, value }
    })

    const wk = ["日", "一", "二", "三", "四", "五", "六"]
    return {
      cells: out,
      rowLabels: dayList.map((d, i) => (i === DAYS - 1 ? "今天" : `周${wk[d.getDay()]}`)),
      peak: peakCell as { row: number; col: number; value: number } | null,
    }
  }, [points])

  const hasData = cells.length > 0
  const summary = hasData && peak
    ? `${rowLabels[peak.row]} ${SLOT_LABELS[peak.col]} 时最高 ${metric.format(peak.value)}${metric.unit}`
    : "暂无历史数据"

  return (
    <IOSWidgetCard
      size={size}
      className={className}
      header={
        <WidgetHeader
          icon={<span style={{ fontSize: 13 }}>▦</span>}
          label="环境时段热力图"
          color={A.accents.green}
          right={
            !isEditing ? (
              <Segmented
                size="small"
                value={metricKey}
                onChange={(v) => setMetricKey(String(v))}
                options={METRICS.map((m) => ({ label: m.label, value: m.key }))}
                style={{ fontSize: 11 }}
              />
            ) : (
              <WidgetStatusPill label={metric.label} color={A.accents.green} />
            )
          }
        />
      }
      isEditing={isEditing}
      widgetId={widgetId}
      onRemove={onRemove}
      onContextMenu={onContextMenu}
      onLongPress={onLongPress}
    >
      <Flex vertical gap={10} style={{ height: "100%", minHeight: 0 }}>
        {loading ? (
          <Flex align="center" justify="center" gap={8} style={{ flex: 1, color: A.labelTertiary }}>
            <IconLoading size={16} />
            <span style={{ fontSize: 12 }}>加载历史数据…</span>
          </Flex>
        ) : !hasData ? (
          <Flex vertical align="center" justify="center" gap={6} style={{ flex: 1 }}>
            <span style={{ fontSize: 12, color: A.labelTertiary }}>暂无历史数据</span>
            <span style={{ fontSize: 11, color: A.labelQuaternary, textAlign: "center" }}>
              设备上报后，这里会显示过去 7 天的时段分布
            </span>
          </Flex>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <HeatmapGrid
              rows={DAYS}
              cols={SLOTS}
              cells={cells}
              stops={metric.stops}
              rowLabels={rowLabels}
              colLabels={SLOT_LABELS}
              unit={metric.unit}
              formatValue={metric.format}
              cellRadius={4}
              cellGap={3}
              ariaLabel={`过去 7 天${metric.label}时段热力图`}
            />
          </div>
        )}

        <Flex align="center" justify="space-between" style={{ borderTop: `1px solid ${A.separator}`, paddingTop: 8 }}>
          <span style={{ fontSize: 11, color: A.labelSecondary }}>{summary}</span>
          <span style={{ fontSize: 10.5, color: A.labelQuaternary }}>7 天 · 4 小时/格</span>
        </Flex>
      </Flex>
    </IOSWidgetCard>
  )
}

export default HeatmapWidget
