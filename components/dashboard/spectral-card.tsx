import React from 'react'
import { Typography, Tag, Flex } from "antd"
import { DeviceData } from "@/lib/hooks/use-device-data"
import { IOSWidgetCard } from "./ios-style/ios-widget-card"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { SPECTRAL_CHANNELS, SpectralChart, spectralValuesFrom } from "@/components/charts/spectral-chart"

const { Text } = Typography
const A = BERRY_THEME.apple

interface SpectralCardProps {
  data: DeviceData | null
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
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

  const values = spectralValuesFrom(data as unknown as Record<string, unknown>)
  const colors = SPECTRAL_CHANNELS.map(c => c.color)
  const maxValue = Math.max(...values, 0)

  const Header = (
    <Flex align="center" gap={8}>
      <Flex align="center" justify="center" style={{ width: 28, height: 28, borderRadius: 8, background: '#e879f910' }}>
        <Text style={{ fontSize: 14, color: '#e879f9', fontWeight: 700 }}>S</Text>
      </Flex>
      <Text style={{ fontSize: 12, color: A.labelTertiary, fontWeight: 500 }}>实时光谱</Text>
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
            <Text style={{ fontSize: 32, fontWeight: 600, color: A.label, lineHeight: 1 }}>
              {maxValue}
            </Text>
            <Text style={{ fontSize: 14, color: A.labelQuaternary }}>µmol</Text>
          </Flex>
          <Tag style={{ fontSize: 11, background: '#e879f910', color: '#e879f9', border: 'none', borderRadius: 4, marginInlineStart: 0, alignSelf: 'flex-start' }}>
            Real-time
          </Tag>
        </Flex>
        <div className="flex-1 w-full relative min-h-0">
          <SpectralChart
            values={values}
            colors={colors}
            maxValue={maxValue}
            height={96}
            gradientId="spec-area-dash"
          />
        </div>
      </Flex>
    </IOSWidgetCard>
  )
}
