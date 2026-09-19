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
import { WidgetRingProgress, WidgetLineChart, WidgetBars, WidgetGaugeStrip } from "./widget-visualizations"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { IconLightning, IconSun, IconSunrise, IconSunset, IconTime } from "@/components/icon";

const A = BERRY_THEME.apple
const WC = A.widgetColors.light
const ICON_STROKE = 1.75

interface LightWidgetProps {
  value: number
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

function getStatus(lux: number) {
  if (lux >= 50000) return { label: "强光", color: A.accents.orange }
  if (lux >= 1000) return { label: "适中", color: A.accents.yellow }
  if (lux >= 200) return { label: "柔和", color: A.accents.orange }
  return { label: "昏暗", color: A.accents.indigo }
}

function luxToRing(lux: number) {
  return Math.max(0, Math.min(100, (lux / 80000) * 100))
}

function formatLux(lux: number) {
  if (lux >= 1000) return { value: (lux / 1000).toFixed(1), unit: 'k lux' }
  return { value: lux.toFixed(0), unit: 'lux' }
}

function useSparkline(current: number) {
  return [
    current * 0.3, current * 0.5, current * 0.8, current,
    current * 1.1, current * 0.9, current * 0.7, current * 0.6,
    current * 0.8, current, current * 1.05, current,
  ]
}

// Daily light integral (DLI) approximation from lux
function dli(lux: number) {
  return (lux * 0.00012 * 12).toFixed(1)
}

export function LightWidget({
  value,
  size = 'medium',
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: LightWidgetProps) {
  const { isElderFriendlyMode } = useElderFriendly()
  const status = getStatus(value)
  const isSmall = size === 'small'
  const isLarge = size === 'large'
  const sparkData = useSparkline(value)
  const barsData = sparkData.slice(-8)
  const formatted = formatLux(value)

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
            icon={<IconSun size={12} strokeWidth={ICON_STROKE} />}
            label="光照"
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
            <WidgetHeroNumber value={formatted.value} unit={formatted.unit} fontSize={heroSize} />
            <WidgetBars data={barsData} color={status.color} height={32} barWidth={3} gap={2} />
          </Flex>
          <WidgetGaugeStrip value={value} min={0} max={80000} color={status.color} segments={10} height={5} />
          <WidgetMiniStats
            stats={[
              { label: '峰值', value: '50k', color: A.accents.orange, icon: <IconLightning size={9} strokeWidth={ICON_STROKE} /> },
              { label: 'DLI', value: `${dli(value)}`, color: A.accents.yellow, icon: <IconSun size={9} strokeWidth={ICON_STROKE} /> },
              { label: '时长', value: '8.2h', color: A.labelSecondary, icon: <IconTime size={9} strokeWidth={ICON_STROKE} /> },
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
            icon={<IconSun size={14} strokeWidth={ICON_STROKE} />}
            label="光照强度"
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
              <WidgetHeroNumber value={formatted.value} unit={formatted.unit} fontSize={heroSize} />
              <span style={{ fontSize: 12, color: A.labelTertiary, fontWeight: 500 }}>光合有效辐射</span>
            </Flex>
            <WidgetRingProgress
              value={luxToRing(value)}
              size={ringSize}
              strokeWidth={7}
              color={status.color}
              label={formatted.value}
              sublabel={formatted.unit}
            />
          </Flex>

          <div style={{ height: 60, minHeight: 60 }}>
            <WidgetLineChart data={sparkData} color={status.color} showGrid />
          </div>

          <WidgetMiniStats
            stats={[
              { label: '日出', value: '06:12', color: A.accents.orange, icon: <IconSunrise size={10} strokeWidth={ICON_STROKE} /> },
              { label: '日落', value: '19:45', color: A.accents.indigo, icon: <IconSunset size={10} strokeWidth={ICON_STROKE} /> },
              { label: 'DLI', value: `${dli(value)} mol/m²`, color: status.color, icon: <IconLightning size={10} strokeWidth={ICON_STROKE} /> },
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
          icon={<IconSun size={14} strokeWidth={ICON_STROKE} />}
          label="光照"
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
            <WidgetHeroNumber value={formatted.value} unit={formatted.unit} fontSize={heroSize} />
            <Flex align="center" gap={6}>
              <WidgetTrendChip direction="up" value="+12%" color={status.color} />
              <span style={{ fontSize: 10, color: A.labelTertiary, fontWeight: 500 }}>vs 昨日</span>
            </Flex>
          </Flex>
          <div style={{ flex: 1, height: '100%', minWidth: 0 }}>
            <WidgetLineChart data={sparkData} color={status.color} showGrid={false} />
          </div>
        </Flex>
        <WidgetCompactFooter
          stats={[
            { label: '日出', value: '06:12', color: A.accents.orange, icon: <IconSunrise size={10} strokeWidth={ICON_STROKE} /> },
            { label: '日落', value: '19:45', color: A.accents.indigo, icon: <IconSunset size={10} strokeWidth={ICON_STROKE} /> },
            { label: 'DLI', value: `${dli(value)}`, color: status.color, icon: <IconLightning size={10} strokeWidth={ICON_STROKE} /> },
          ]}
        />
      </Flex>
    </IOSWidgetCard>
  )
}
