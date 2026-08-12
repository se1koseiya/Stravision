"use client"

import { Droplets, Leaf, Target, Sprout, Thermometer } from "lucide-react"
import { Flex } from "antd"
import {
  IOSWidgetCard,
  WidgetHeader,
  WidgetStatusPill,
  WidgetHeroNumber,
  WidgetMiniStats,
  WidgetCompactFooter,
} from "./ios-widget-card"
import { WidgetRingProgress, WidgetDualBars, WidgetLineChart, WidgetBars } from "./widget-visualizations"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { BERRY_THEME } from "@/lib/ui/berry-theme"

const A = BERRY_THEME.apple
const WC = A.widgetColors.soil
const ICON_STROKE = 1.75

interface SoilWidgetProps {
  moisture: number
  fertility?: number
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

function getStatus(m: number, f: number) {
  const avg = (m + f) / 2
  if (avg >= 60) return { label: "健康", color: A.accents.green }
  if (avg >= 30) return { label: "一般", color: A.accents.orange }
  return { label: "贫瘠", color: A.accents.brown }
}

function useSparkline(current: number) {
  return [
    current - 5, current - 3, current - 6, current - 2,
    current + 1, current, current + 2, current - 1,
    current, current + 1, current - 2, current,
  ]
}

export function SoilWidget({
  moisture,
  fertility = 0,
  size = 'medium',
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: SoilWidgetProps) {
  const { isElderFriendlyMode } = useElderFriendly()
  const status = getStatus(moisture, fertility)
  const isSmall = size === 'small'
  const isLarge = size === 'large'
  const sparkData = useSparkline(moisture)
  const barsData = sparkData.slice(-8)

  const heroSize = isElderFriendlyMode
    ? (isSmall ? 28 : isLarge ? 46 : 38)
    : (isSmall ? 26 : isLarge ? 42 : 36)

  const ringSize = isSmall ? 48 : isLarge ? 100 : 72

  if (isSmall) {
    return (
      <IOSWidgetCard
        size={size}
        className={className}
        header={
          <WidgetHeader
            icon={<Leaf size={12} strokeWidth={ICON_STROKE} />}
            label="土壤"
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
            <Flex vertical gap={2}>
              <WidgetHeroNumber value={moisture} unit="%" fontSize={heroSize} />
              <span style={{ fontSize: 10, color: A.labelTertiary, fontWeight: 500 }}>水分</span>
            </Flex>
            <WidgetBars data={barsData} color={A.accents.blue} height={28} barWidth={3} gap={2} />
          </Flex>
          <WidgetDualBars
            values={[
              { value: moisture, label: '水', color: A.accents.blue },
              { value: fertility, label: '肥', color: A.accents.green },
            ]}
          />
          <WidgetMiniStats
            stats={[
              { label: '肥', value: `${fertility.toFixed(0)}%`, color: A.accents.green, icon: <Sprout size={9} strokeWidth={ICON_STROKE} /> },
              { label: '状态', value: status.label, color: status.color },
              { label: 'EC', value: '1.8', color: A.labelSecondary },
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
            icon={<Leaf size={14} strokeWidth={ICON_STROKE} />}
            label="土壤监测"
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
              <WidgetHeroNumber value={moisture} unit="%" fontSize={heroSize} />
              <span style={{ fontSize: 12, color: A.labelTertiary, fontWeight: 500 }}>土壤水分</span>
            </Flex>
            <WidgetRingProgress
              value={moisture}
              size={ringSize}
              strokeWidth={7}
              color={A.accents.blue}
              label={moisture.toFixed(0)}
              sublabel="%"
            />
          </Flex>

          <WidgetDualBars
            values={[
              { value: moisture, label: '水分', color: A.accents.blue },
              { value: fertility, label: '肥力', color: A.accents.green },
            ]}
          />

          <div style={{ height: 50, minHeight: 50 }}>
            <WidgetLineChart data={sparkData} color={status.color} showGrid />
          </div>

          <WidgetMiniStats
            stats={[
              { label: '理想水分', value: '50-70%', color: A.accents.blue, icon: <Droplets size={10} strokeWidth={ICON_STROKE} /> },
              { label: '理想肥力', value: '≥60%', color: A.accents.green, icon: <Target size={10} strokeWidth={ICON_STROKE} /> },
              { label: '综合', value: status.label, color: status.color, icon: <Sprout size={10} strokeWidth={ICON_STROKE} /> },
            ]}
            style={{ borderTop: `1px solid ${A.separator}`, paddingTop: 10 }}
          />
        </Flex>
      </IOSWidgetCard>
    )
  }

  // Medium
  return (
    <IOSWidgetCard
      size={size}
      className={className}
      header={
        <WidgetHeader
          icon={<Leaf size={14} strokeWidth={ICON_STROKE} />}
          label="土壤"
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
            <WidgetHeroNumber value={moisture} unit="%" fontSize={heroSize} />
            <span style={{ fontSize: 11, color: A.labelTertiary, fontWeight: 500 }}>土壤水分</span>
          </Flex>
          <div style={{ flex: 1, minWidth: 0 }}>
            <WidgetDualBars
              values={[
                { value: moisture, label: '水分', color: A.accents.blue },
                { value: fertility, label: '肥力', color: A.accents.green },
              ]}
            />
          </div>
        </Flex>
        <WidgetCompactFooter
          stats={[
            { label: '肥力', value: `${fertility.toFixed(0)}%`, color: A.accents.green, icon: <Sprout size={10} strokeWidth={ICON_STROKE} /> },
            { label: '理想', value: '50-70%', color: A.accents.blue, icon: <Target size={10} strokeWidth={ICON_STROKE} /> },
            { label: 'EC值', value: '1.8 mS', color: A.labelSecondary, icon: <Thermometer size={10} strokeWidth={ICON_STROKE} /> },
          ]}
        />
      </Flex>
    </IOSWidgetCard>
  )
}
