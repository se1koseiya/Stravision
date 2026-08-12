"use client"

import { Droplets, Target, ThermometerSun } from "lucide-react"
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
const WC = A.widgetColors.humidity
const ICON_STROKE = 1.75

interface HumidityWidgetProps {
  value: number
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

function getStatus(h: number) {
  if (h >= 70) return { label: "潮湿", color: A.accents.blue }
  if (h >= 50) return { label: "舒适", color: A.accents.cyan }
  if (h >= 30) return { label: "偏干", color: A.accents.teal }
  return { label: "干燥", color: A.accents.yellow }
}

function useSparkline(current: number) {
  return [
    current - 3, current - 1, current - 4, current - 2,
    current + 1, current, current + 2, current - 1,
    current, current + 1, current - 2, current,
  ]
}

// Dew point approximation: Td = T - (100 - RH)/5
function dewPoint(h: number, temp = 22) {
  return temp - (100 - h) / 5
}

export function HumidityWidget({
  value,
  size = 'medium',
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: HumidityWidgetProps) {
  const { isElderFriendlyMode } = useElderFriendly()
  const status = getStatus(value)
  const isSmall = size === 'small'
  const isLarge = size === 'large'
  const sparkData = useSparkline(value)
  const barsData = sparkData.slice(-8)
  const dp = dewPoint(value)

  const heroSize = isElderFriendlyMode
    ? (isSmall ? 30 : isLarge ? 48 : 40)
    : (isSmall ? 28 : isLarge ? 44 : 38)

  const ringSize = isSmall ? 52 : isLarge ? 110 : 76

  if (isSmall) {
    return (
      <IOSWidgetCard
        size={size}
        className={className}
        header={
          <WidgetHeader
            icon={<Droplets size={12} strokeWidth={ICON_STROKE} />}
            label="湿度"
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
            <WidgetHeroNumber value={value.toFixed(0)} unit="%" fontSize={heroSize} />
            <WidgetBars data={barsData} color={status.color} height={32} barWidth={3} gap={2} />
          </Flex>
          <WidgetMiniStats
            stats={[
              { label: '露点', value: `${dp.toFixed(0)}°`, color: A.accents.blue, icon: <ThermometerSun size={9} strokeWidth={ICON_STROKE} /> },
              { label: '目标', value: '45-55', color: A.accents.green, icon: <Target size={9} strokeWidth={ICON_STROKE} /> },
              { label: '偏差', value: `${value >= 50 ? '-' : '+'}${Math.abs(value - 50).toFixed(0)}`, color: status.color },
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
            icon={<Droplets size={14} strokeWidth={ICON_STROKE} />}
            label="湿度"
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
              <WidgetHeroNumber value={value.toFixed(0)} unit="%" fontSize={heroSize} />
              <span style={{ fontSize: 12, color: A.labelTertiary, fontWeight: 500 }}>环境湿度</span>
            </Flex>
            <WidgetRingProgress
              value={value}
              size={ringSize}
              strokeWidth={7}
              color={status.color}
              label={value.toFixed(0)}
              sublabel="%"
            />
          </Flex>

          <div style={{ height: 60, minHeight: 60 }}>
            <WidgetLineChart data={sparkData} color={status.color} showGrid />
          </div>

          <WidgetMiniStats
            stats={[
              { label: '露点', value: `${dp.toFixed(0)}°C`, color: A.accents.blue, icon: <ThermometerSun size={10} strokeWidth={ICON_STROKE} /> },
              { label: '目标', value: '45-55%', color: A.accents.green, icon: <Target size={10} strokeWidth={ICON_STROKE} /> },
              { label: '偏差', value: `${value >= 50 ? '-' : '+'}${Math.abs(value - 50).toFixed(0)}%`, color: status.color },
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
          icon={<Droplets size={14} strokeWidth={ICON_STROKE} />}
          label="湿度"
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
            <WidgetHeroNumber value={value.toFixed(0)} unit="%" fontSize={heroSize} />
            <Flex align="center" gap={6}>
              <WidgetTrendChip direction="down" value="-2%" color={A.accents.blue} />
              <span style={{ fontSize: 10, color: A.labelTertiary, fontWeight: 500 }}>vs 昨日</span>
            </Flex>
          </Flex>
          <div style={{ flex: 1, height: '100%', minWidth: 0 }}>
            <WidgetLineChart data={sparkData} color={status.color} showGrid={false} />
          </div>
        </Flex>
        <WidgetCompactFooter
          stats={[
            { label: '露点', value: `${dp.toFixed(0)}°C`, color: A.accents.blue, icon: <ThermometerSun size={10} strokeWidth={ICON_STROKE} /> },
            { label: '目标', value: '45-55%', color: A.accents.green, icon: <Target size={10} strokeWidth={ICON_STROKE} /> },
            { label: '偏差', value: `${value >= 50 ? '-' : '+'}${Math.abs(value - 50).toFixed(0)}%`, color: status.color },
          ]}
        />
      </Flex>
    </IOSWidgetCard>
  )
}
