"use client"

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
import { WidgetRingProgress, WidgetLevelBar, WidgetLineChart, WidgetBars, WidgetGaugeStrip } from "./widget-visualizations"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { IconCaution, IconCheckOne, IconFan, IconTree, IconWind } from "@/components/icon";

const A = BERRY_THEME.apple
const WC = A.widgetColors.co2
const ICON_STROKE = 1.75

interface CO2WidgetProps {
  value: number
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

function getStatus(ppm: number) {
  if (ppm >= 1500) return { label: "较差", color: A.accents.red }
  if (ppm >= 1000) return { label: "警告", color: A.accents.orange }
  if (ppm >= 800) return { label: "一般", color: A.accents.yellow }
  return { label: "优良", color: A.accents.green }
}

function ppmToRing(ppm: number) {
  return Math.max(0, Math.min(100, (ppm / 2000) * 100))
}

function useSparkline(current: number) {
  return [
    current - 80, current - 50, current - 30, current + 20,
    current, current + 40, current + 60, current + 30,
    current - 20, current, current + 10, current,
  ]
}

const OUTDOOR = 420

export function CO2Widget({
  value,
  size = 'medium',
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: CO2WidgetProps) {
  const { isElderFriendlyMode } = useElderFriendly()
  const status = getStatus(value)
  const isSmall = size === 'small'
  const isLarge = size === 'large'
  const sparkData = useSparkline(value)
  const barsData = sparkData.slice(-8)
  const diff = value - OUTDOOR

  const heroSize = isElderFriendlyMode
    ? (isSmall ? 28 : isLarge ? 44 : 36)
    : (isSmall ? 26 : isLarge ? 40 : 34)

  const ringSize = isSmall ? 52 : isLarge ? 110 : 76

  if (isSmall) {
    return (
      <IOSWidgetCard
        size={size}
        className={className}
        header={
          <WidgetHeader
            icon={<IconWind size={12} strokeWidth={ICON_STROKE} />}
            label="CO₂"
            color={status.color}
            right={<div style={{ width: 6, height: 6, borderRadius: '50%', background: status.color }} />}
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
            <WidgetHeroNumber value={value} fontSize={heroSize} />
            <WidgetBars data={barsData} color={status.color} height={32} barWidth={3} gap={2} />
          </Flex>
          <WidgetGaugeStrip value={value} min={400} max={2000} color={status.color} segments={10} height={5} />
          <WidgetMiniStats
            stats={[
              { label: '室外', value: '420', color: A.accents.green, icon: <IconTree size={9} strokeWidth={ICON_STROKE} /> },
              { label: '阈值', value: '1k', color: A.accents.orange, icon: <IconCaution size={9} strokeWidth={ICON_STROKE} /> },
              { label: '差值', value: `+${diff}`, color: status.color },
            ]}
          />
        </Flex>
      </IOSWidgetCard>
    )
  }

  if (isLarge) {
    return (
      <IOSWidgetCard
        size={size}
        className={className}
        header={
          <WidgetHeader
            icon={<IconWind size={14} strokeWidth={ICON_STROKE} />}
            label="CO₂ 浓度"
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
              <WidgetHeroNumber value={value} unit="ppm" fontSize={heroSize} />
              <span style={{ fontSize: 12, color: A.labelTertiary, fontWeight: 500 }}>二氧化碳浓度</span>
            </Flex>
            <WidgetRingProgress
              value={ppmToRing(value)}
              size={ringSize}
              strokeWidth={7}
              color={status.color}
              label={value.toFixed(0)}
              sublabel="ppm"
            />
          </Flex>

          <WidgetLevelBar
            value={value}
            min={400}
            max={2000}
            color={status.color}
            markers={[
              { value: 800, label: '800', color: A.accents.green },
              { value: 1000, label: '1k', color: A.accents.orange },
              { value: 1500, label: '1.5k', color: A.accents.red },
            ]}
          />

          <div style={{ height: 50, minHeight: 50 }}>
            <WidgetLineChart data={sparkData} color={status.color} showGrid />
          </div>

          <WidgetMiniStats
            stats={[
              { label: '室外', value: '420', color: A.accents.green, icon: <IconCheckOne size={10} strokeWidth={ICON_STROKE} /> },
              { label: '阈值', value: '1000', color: A.accents.orange, icon: <IconCaution size={10} strokeWidth={ICON_STROKE} /> },
              { label: '建议', value: '<800', color: status.color, icon: <IconFan size={10} strokeWidth={ICON_STROKE} /> },
            ]}
            style={{ borderTop: `1px solid ${A.separator}`, paddingTop: 10 }}
          />
        </Flex>
      </IOSWidgetCard>
    )
  }

  return (
    <IOSWidgetCard
      size={size}
      className={className}
      header={
        <WidgetHeader
          icon={<IconWind size={14} strokeWidth={ICON_STROKE} />}
          label="CO₂"
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
            <WidgetHeroNumber value={value} unit="ppm" fontSize={heroSize} />
            <Flex align="center" gap={6}>
              <WidgetTrendChip direction="up" value={`+${diff}`} color={status.color} />
              <span style={{ fontSize: 10, color: A.labelTertiary, fontWeight: 500 }}>vs 室外</span>
            </Flex>
          </Flex>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <WidgetLevelBar
              value={value}
              min={400}
              max={2000}
              color={status.color}
              markers={[
                { value: 800, color: A.accents.green },
                { value: 1000, color: A.accents.orange },
              ]}
            />
          </div>
        </Flex>
        <WidgetCompactFooter
          stats={[
            { label: '室外', value: '420', color: A.accents.green, icon: <IconTree size={10} strokeWidth={ICON_STROKE} /> },
            { label: '阈值', value: '1000', color: A.accents.orange, icon: <IconCaution size={10} strokeWidth={ICON_STROKE} /> },
            { label: '理想', value: '<800', color: status.color, icon: <IconFan size={10} strokeWidth={ICON_STROKE} /> },
          ]}
        />
      </Flex>
    </IOSWidgetCard>
  )
}
