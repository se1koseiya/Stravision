import React from 'react'
import { Typography, Tag, Flex } from "antd"
import { DeviceData } from "@/lib/hooks/use-device-data"
import { IOSWidgetCard } from "./ios-style/ios-widget-card"

const { Text } = Typography

interface SpectralCardProps {
  data: DeviceData | null
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

const channels = [
  { id: 'channel1', name: '415', label: 'Violet', color: '#8B00FF' },
  { id: 'channel2', name: '445', label: 'Blue', color: '#0000FF' },
  { id: 'channel3', name: '480', label: 'Cyan', color: '#00FFFF' },
  { id: 'channel4', name: '515', label: 'Green', color: '#00FF00' },
  { id: 'channel5', name: '555', label: 'Y-G', color: '#ADFF2F' },
  { id: 'channel6', name: '590', label: 'Yellow', color: '#FFFF00' },
  { id: 'channel7', name: '630', label: 'Orange', color: '#FFA500' },
  { id: 'channel8', name: '680', label: 'Red', color: '#FF0000' },
  { id: 'channel9', name: 'NIR', label: 'NIR', color: '#8B0000' },
  { id: 'channel10', name: 'Clr', label: 'Clear', color: '#E0E0E0' },
  { id: 'channel11', name: 'Fli', label: 'Flicker', color: '#808080' },
]

/** Lightweight SVG spectral chart — no chart library needed */
function SpectralChart({ values, colors, maxValue, height = 96 }: { values: number[]; colors: string[]; maxValue: number; height?: number }) {
  const W = 100, H = height, pad = 2
  const barW = (W - pad * (values.length + 1)) / values.length
  const safeMax = maxValue || 1
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
  const areaPath = `${linePath} L ${pts[pts.length - 1].x},${H} L ${pts[0].x},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="spec-area-dash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(232,121,249,0.2)" />
          <stop offset="100%" stopColor="rgba(232,121,249,0.02)" />
        </linearGradient>
      </defs>
      {pts.map((p, i) => (
        <rect key={i} x={pad + i * (barW + pad)} y={p.y} width={barW} height={H - p.y} rx={2} fill={colors[i]} opacity={0.85} />
      ))}
      <path d={areaPath} fill="url(#spec-area-dash)" />
      <path d={linePath} fill="none" stroke="#e879f9" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SpectralCard({
  data,
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: SpectralCardProps) {

  const values = channels.map(c => data ? (data[c.id as keyof DeviceData] as number) || 0 : 0)
  const colors = channels.map(c => c.color)
  const maxValue = Math.max(...values, 0)

  const Header = (
    <Flex align="center" gap={8}>
      <Flex align="center" justify="center" style={{ width: 28, height: 28, borderRadius: 8, background: '#e879f910' }}>
        <Text style={{ fontSize: 14, color: '#e879f9', fontWeight: 700 }}>S</Text>
      </Flex>
      <Text style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>实时光谱</Text>
    </Flex>
  )

  return (
    <IOSWidgetCard
      size="large"
      className={className}
      header={Header}
      isEditing={isEditing}
      widgetId={widgetId}
      onRemove={onRemove}
      onContextMenu={onContextMenu}
      onLongPress={onLongPress}
    >
      <Flex vertical style={{ height: '100%' }} gap={8}>
        <Flex vertical gap={4}>
          <Flex align="baseline" gap={4}>
            <Text style={{ fontSize: 32, fontWeight: 600, color: '#262626', lineHeight: 1 }}>
              {maxValue}
            </Text>
            <Text style={{ fontSize: 14, color: '#bfbfbf' }}>µmol</Text>
          </Flex>
          <Tag style={{ fontSize: 11, background: '#e879f910', color: '#e879f9', border: 'none', borderRadius: 4, marginInlineStart: 0, alignSelf: 'flex-start' }}>
            Real-time
          </Tag>
        </Flex>
        <div className="flex-1 w-full relative min-h-0">
          <SpectralChart values={values} colors={colors} maxValue={maxValue} height={96} />
        </div>
      </Flex>
    </IOSWidgetCard>
  )
}
