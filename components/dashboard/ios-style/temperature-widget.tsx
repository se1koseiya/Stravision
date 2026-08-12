"use client"

import { Thermometer, TrendingUp, TrendingDown } from "lucide-react"
import { Flex } from "antd"
import {
  IOSWidgetCard,
  WidgetHeader,
  WidgetStatusPill,
  WidgetHeroNumber,
  WidgetMiniStats,
  WidgetCompactFooter,
  WidgetTrendChip,
} from "./ios-widget-card"
import { WidgetRingProgress, WidgetLineChart, WidgetBars } from "./widget-visualizations"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { BERRY_THEME } from "@/lib/ui/berry-theme"

const A = BERRY_THEME.apple
const WC = A.widgetColors.temperature
const ICON_STROKE = 1.75

interface TemperatureWidgetProps {
  value: number
  trend?: 'up' | 'down' | 'stable'
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

function getStatus(temp: number) {
  if (temp >= 30) return { label: "高温", color: A.accents.orange }
  if (temp >= 25) return { label: "偏热", color: A.accents.red }
  if (temp >= 18) return { label: "适宜", color: A.accents.green }
  return { label: "偏冷", color: A.accents.blue }
}

function tempToRing(temp: number) {
  return Math.max(0, Math.min(100, (temp / 40) * 100))
}

function useSparkline(current: number) {
  return [
    current - 1.2, current - 0.8, current - 1.5, current - 0.5,
    current - 0.3, current + 0.2, current + 0.5, current,
    current + 0.3, current - 0.2, current + 0.1, current,
  ]
}

const high = (v: number) => v + 5
const low = (v: number) => v - 3
const feelsLike = (v: number) => v + 2

export function TemperatureWidget({
  value,
  size = 'medium',
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: TemperatureWidgetProps) {
  const { isElderFriendlyMode } = useElderFriendly()
  const status = getStatus(value)
  const isSmall = size === 'small'
  const isLarge = size === 'large'
  const sparkData = useSparkline(value)
  const barsData = sparkData.slice(-8)

  const heroSize = isElderFriendlyMode
    ? (isSmall ? 30 : isLarge ? 48 : 40)
    : (isSmall ? 28 : isLarge ? 44 : 38)

  const ringSize = isSmall ? 52 : isLarge ? 110 : 76

  // ── Small: header + hero + bars + mini stats ──
  if (isSmall) {
    return (
      <IOSWidgetCard
        size={size}
        className={className}
        header={
          <WidgetHeader
            icon={<Thermometer size={12} strokeWidth={ICON_STROKE} />}
            label="温度"
            color={status.color}
            right={
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: status.color }} />
            }
          />
        }
        isEditing={isEditing}
        widgetId={widgetId}
        onRemove={onRemove}
        onContextMenu={onContextMenu}
        onLongPress={onLongPress}
        tint={WC.accent}
      >
        <Flex vertical justify="space-between" style={{ height: '100%' }}>
          <Flex align="center" justify="space-between" style={{ flex: 1, minHeight: 0 }}>
            <WidgetHeroNumber value={value.toFixed(1)} unit="°" fontSize={heroSize} />
            <WidgetBars data={barsData} color={status.color} height={32} barWidth={3} gap={2} />
          </Flex>
          <WidgetMiniStats
            stats={[
              { label: '高', value: `${high(value).toFixed(0)}°`, color: A.accents.red },
              { label: '低', value: `${low(value).toFixed(0)}°`, color: A.accents.blue },
              { label: '体感', value: `${feelsLike(value).toFixed(0)}°`, color: A.labelSecondary },
            ]}
          />
        </Flex>
      </IOSWidgetCard>
    )
  }

  // ── Large: header + hero+ring + chart + stat row ──
  if (isLarge) {
    return (
      <IOSWidgetCard
        size={size}
        className={className}
        header={
          <WidgetHeader
            icon={<Thermometer size={14} strokeWidth={ICON_STROKE} />}
            label="温度"
            color={status.color}
            right={<WidgetStatusPill label={status.label} color={status.color} />}
          />
        }
        isEditing={isEditing}
        widgetId={widgetId}
        onRemove={onRemove}
        onContextMenu={onContextMenu}
        onLongPress={onLongPress}
        tint={WC.accent}
      >
        <Flex vertical gap={12} style={{ height: '100%' }}>
          <Flex align="center" justify="space-between" style={{ flex: 1, minHeight: 0 }}>
            <Flex vertical gap={4}>
              <WidgetHeroNumber value={value.toFixed(1)} unit="°C" fontSize={heroSize} />
              <span style={{ fontSize: 12, color: A.labelTertiary, fontWeight: 500 }}>环境温度</span>
            </Flex>
            <WidgetRingProgress
              value={tempToRing(value)}
              size={ringSize}
              strokeWidth={7}
              color={status.color}
              label={value.toFixed(0)}
              sublabel="°"
            />
          </Flex>

          <div style={{ height: 60, minHeight: 60 }}>
            <WidgetLineChart data={sparkData} color={status.color} showGrid />
          </div>

          <WidgetMiniStats
            stats={[
              { label: '体感', value: `${feelsLike(value).toFixed(0)}°`, color: A.label },
              { label: '最高', value: `${high(value).toFixed(0)}°`, color: A.accents.red, icon: <TrendingUp size={10} strokeWidth={ICON_STROKE} /> },
              { label: '最低', value: `${low(value).toFixed(0)}°`, color: A.accents.blue, icon: <TrendingDown size={10} strokeWidth={ICON_STROKE} /> },
            ]}
            style={{ borderTop: `1px solid ${A.separator}`, paddingTop: 10 }}
          />
        </Flex>
      </IOSWidgetCard>
    )
  }

  // ── Medium: header + hero+chart + compact footer ──
  return (
    <IOSWidgetCard
      size={size}
      className={className}
      header={
        <WidgetHeader
          icon={<Thermometer size={14} strokeWidth={ICON_STROKE} />}
          label="温度"
          color={status.color}
          right={<WidgetStatusPill label={status.label} color={status.color} />}
        />
      }
      isEditing={isEditing}
      widgetId={widgetId}
      onRemove={onRemove}
      onContextMenu={onContextMenu}
      onLongPress={onLongPress}
      tint={WC.accent}
    >
      <Flex vertical justify="space-between" style={{ height: '100%' }}>
        <Flex align="center" style={{ flex: 1, minHeight: 0 }} gap={12}>
          <Flex vertical gap={3} style={{ minWidth: 0, flexShrink: 0 }}>
            <WidgetHeroNumber value={value.toFixed(1)} unit="°C" fontSize={heroSize} />
            <Flex align="center" gap={6}>
              <WidgetTrendChip direction="up" value="+1.2°" />
              <span style={{ fontSize: 10, color: A.labelTertiary, fontWeight: 500 }}>vs 昨日</span>
            </Flex>
          </Flex>
          <div style={{ flex: 1, height: '100%', minWidth: 0 }}>
            <WidgetLineChart data={sparkData} color={status.color} showGrid={false} />
          </div>
        </Flex>
        <WidgetCompactFooter
          stats={[
            { label: '体感', value: `${feelsLike(value).toFixed(0)}°`, color: A.label },
            { label: '最高', value: `${high(value).toFixed(0)}°`, color: A.accents.red, icon: <TrendingUp size={10} strokeWidth={ICON_STROKE} /> },
            { label: '最低', value: `${low(value).toFixed(0)}°`, color: A.accents.blue, icon: <TrendingDown size={10} strokeWidth={ICON_STROKE} /> },
          ]}
        />
      </Flex>
    </IOSWidgetCard>
  )
}
