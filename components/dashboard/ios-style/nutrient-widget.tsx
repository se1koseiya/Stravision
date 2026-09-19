"use client"

import { Flex } from "antd"
import {
  IOSWidgetCard,
  WidgetHeader,
  WidgetHeroNumber,
  WidgetMiniStats,
  WidgetCompactFooter,
  WidgetTrendChip,
} from "./ios-widget-card"
import { WidgetRingProgress, WidgetLineChart, WidgetBars, WidgetGaugeStrip } from "./widget-visualizations"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { IconAttention, IconCaution, IconCheckOne } from "@/components/icon";

const A = BERRY_THEME.apple
const ICON_STROKE = 1.75

interface NutrientWidgetProps {
  type: 'N' | 'P' | 'K'
  value: number | string
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

function getConfig(type: 'N' | 'P' | 'K') {
  switch (type) {
    case 'N': return {
      color: A.accents.indigo,
      fullName: "氮",
      apiType: "nitrogen",
      accent: A.widgetColors.nitrogen.accent,
      ideal: 150,
      low: 50,
      high: 200,
      desc: "促叶生长",
    }
    case 'P': return {
      color: A.accents.purple,
      fullName: "磷",
      apiType: "phosphorus",
      accent: A.widgetColors.phosphorus.accent,
      ideal: 100,
      low: 30,
      high: 150,
      desc: "促花促根",
    }
    case 'K': return {
      color: A.accents.pink,
      fullName: "钾",
      apiType: "potassium",
      accent: A.widgetColors.potassium.accent,
      ideal: 200,
      low: 80,
      high: 300,
      desc: "增甜抗逆",
    }
  }
}

function getLevel(numValue: number, low: number, ideal: number, high: number) {
  if (numValue < low) return { label: '偏低', color: A.accents.orange, icon: IconCaution }
  if (numValue > high) return { label: '偏高', color: A.accents.red, icon: IconAttention }
  if (numValue >= ideal * 0.8 && numValue <= ideal * 1.2) return { label: '适宜', color: A.accents.green, icon: IconCheckOne }
  return { label: '正常', color: A.accents.teal, icon: IconCheckOne }
}

function valueToRing(value: number, max: number) {
  return Math.max(0, Math.min(100, (value / max) * 100))
}

function useSparkline(current: number) {
  return [
    current * 0.8, current * 0.9, current, current * 1.05,
    current * 0.95, current, current * 1.1, current,
    current * 0.92, current * 0.98, current * 1.02, current,
  ]
}

function LetterBadge({ letter, color, sz }: { letter: string; color: string; sz: number }) {
  return (
    <div style={{
      width: sz,
      height: sz,
      borderRadius: sz * 0.3,
      background: `${color}12`,
      color,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: sz * 0.5,
      fontWeight: 700,
      lineHeight: 1,
      flexShrink: 0,
    }}>{letter}</div>
  )
}

export function NutrientWidget({
  type,
  value,
  size = 'small',
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: NutrientWidgetProps) {
  const { isElderFriendlyMode } = useElderFriendly()
  const config = getConfig(type)
  const isSmall = size === 'small'
  const isLarge = size === 'large'
  const numValue = typeof value === 'number' ? value : parseFloat(value as string) || 0
  const displayValue = typeof value === 'number' ? value.toFixed(0) : value
  const sparkData = useSparkline(numValue)
  const barsData = sparkData.slice(-8)
  const level = getLevel(numValue, config.low, config.ideal, config.high)

  const heroSize = isElderFriendlyMode
    ? (isSmall ? 28 : isLarge ? 44 : 36)
    : (isSmall ? 26 : isLarge ? 40 : 34)

  const ringSize = isSmall ? 48 : isLarge ? 100 : 68
  const maxVal = config.high * 1.2

  if (isSmall) {
    return (
      <IOSWidgetCard
        size={size}
        className={className}
        header={
          <WidgetHeader
            icon={<LetterBadge letter={type} color={config.color} sz={16} />}
            label={config.fullName}
            color={config.color}
            right={<div style={{ width: 6, height: 6, borderRadius: '50%', background: level.color }} />}
          />
        }
        isEditing={isEditing}
        widgetId={widgetId}
        onRemove={onRemove}
        onContextMenu={onContextMenu}
        onLongPress={onLongPress}
        tint={config.accent}
      >
        <Flex vertical justify="space-between" style={{ height: '100%' }}>
          <Flex align="center" justify="space-between" style={{ flex: 1, minHeight: 0 }}>
            <WidgetHeroNumber value={displayValue} fontSize={heroSize} />
            <WidgetBars data={barsData} color={config.color} height={28} barWidth={3} gap={2} />
          </Flex>
          <WidgetGaugeStrip value={numValue} min={0} max={maxVal} color={config.color} segments={8} height={5} />
          <WidgetMiniStats
            stats={[
              { label: '理想', value: `${config.ideal}`, color: A.accents.green },
              { label: '区间', value: `${config.low}-${config.high}`, color: A.labelSecondary },
              { label: level.label, value: `${numValue >= config.ideal ? '✓' : '!'}`, color: level.color },
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
            icon={<LetterBadge letter={type} color={config.color} sz={20} />}
            label={`${type} — ${config.fullName}含量`}
            color={config.color}
          />
        }
        isEditing={isEditing}
        widgetId={widgetId}
        onRemove={onRemove}
        onContextMenu={onContextMenu}
        onLongPress={onLongPress}
        tint={config.accent}
      >
        <Flex vertical gap={12} style={{ height: '100%' }}>
          <Flex align="center" justify="space-between" style={{ flex: 1, minHeight: 0 }}>
            <Flex vertical gap={4}>
              <WidgetHeroNumber value={displayValue} unit="mg/kg" fontSize={heroSize} />
              <span style={{ fontSize: 12, color: A.labelTertiary, fontWeight: 500 }}>{config.fullName}含量 · {config.desc}</span>
            </Flex>
            <WidgetRingProgress
              value={valueToRing(numValue, maxVal)}
              size={ringSize}
              strokeWidth={7}
              color={config.color}
              label={displayValue}
              sublabel="mg"
            />
          </Flex>

          <div style={{ height: 50, minHeight: 50 }}>
            <WidgetLineChart data={sparkData} color={config.color} showGrid />
          </div>

          <WidgetMiniStats
            stats={[
              { label: '理想值', value: `${config.ideal}`, color: A.accents.green, icon: <IconCheckOne size={10} strokeWidth={ICON_STROKE} /> },
              { label: '偏低线', value: `<${config.low}`, color: A.accents.orange, icon: <IconCaution size={10} strokeWidth={ICON_STROKE} /> },
              { label: '偏高线', value: `>${config.high}`, color: A.accents.red, icon: <IconAttention size={10} strokeWidth={ICON_STROKE} /> },
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
          icon={<LetterBadge letter={type} color={config.color} sz={18} />}
          label={`${type} — ${config.fullName}`}
          color={config.color}
        />
      }
      isEditing={isEditing}
      widgetId={widgetId}
      onRemove={onRemove}
      onContextMenu={onContextMenu}
      onLongPress={onLongPress}
      tint={config.accent}
    >
      <Flex vertical justify="space-between" style={{ height: '100%' }}>
        <Flex align="center" style={{ flex: 1, minHeight: 0 }} gap={12}>
          <Flex vertical gap={3} style={{ minWidth: 0, flexShrink: 0 }}>
            <WidgetHeroNumber value={displayValue} unit="mg/kg" fontSize={heroSize} />
            <Flex align="center" gap={6}>
              <WidgetTrendChip direction="flat" value={config.desc} color={config.color} />
            </Flex>
          </Flex>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <WidgetRingProgress
              value={valueToRing(numValue, maxVal)}
              size={ringSize}
              strokeWidth={6}
              color={config.color}
              label={displayValue}
              sublabel="mg"
            />
          </div>
        </Flex>
        <WidgetCompactFooter
          stats={[
            { label: '理想', value: `${config.ideal}`, color: A.accents.green, icon: <IconCheckOne size={10} strokeWidth={ICON_STROKE} /> },
            { label: '低线', value: `<${config.low}`, color: A.accents.orange, icon: <IconCaution size={10} strokeWidth={ICON_STROKE} /> },
            { label: '高线', value: `>${config.high}`, color: A.accents.red, icon: <IconAttention size={10} strokeWidth={ICON_STROKE} /> },
          ]}
        />
      </Flex>
    </IOSWidgetCard>
  )
}
