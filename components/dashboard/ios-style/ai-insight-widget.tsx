"use client"

import { Typography, Button, Flex } from "antd"
import { useState, useEffect } from "react"
import {
  IOSWidgetCard,
  WidgetHeader,
  WidgetStatusPill,
  WidgetLabel,
} from "./ios-widget-card"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { IconCaution, IconMagic, IconRefresh, IconShield, IconTrendingUp } from "@/components/icon";

const { Paragraph } = Typography
const A = BERRY_THEME.apple
const WC = A.widgetColors.ai
const ICON_STROKE = 1.75

interface AIInsightWidgetProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

interface InsightData {
  riskLevel: 'low' | 'medium' | 'high'
  insight: string
  recommendation: string
  confidence: number
}

export function AIInsightWidget({
  size = 'large',
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: AIInsightWidgetProps) {
  const [data, setData] = useState<InsightData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchInsight = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/ai/daily-insight')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsight()
  }, [])

  const getRiskConfig = (level: string) => {
    switch (level) {
      case 'high': return { label: '高风险', color: A.accents.red, icon: IconCaution }
      case 'medium': return { label: '关注', color: A.accents.orange, icon: IconTrendingUp }
      case 'low': return { label: '健康', color: A.accents.green, icon: IconShield }
      default: return { label: '分析中', color: A.accents.blue, icon: IconMagic }
    }
  }

  const config = getRiskConfig(data?.riskLevel || 'low')
  const isSmall = size === 'small'
  const RiskIcon = config.icon

  if (error) {
    return (
      <IOSWidgetCard
        size={size}
        className={className}
        header={
          <WidgetHeader
            icon={<IconMagic size={14} strokeWidth={ICON_STROKE} />}
            label="AI 洞察"
            color={config.color}
          />
        }
        isEditing={isEditing}
        widgetId={widgetId}
        onRemove={onRemove}
        onContextMenu={onContextMenu}
        onLongPress={onLongPress}
        tint={WC.accent}
      >
        <Flex vertical align="center" justify="center" gap={8} style={{ height: '100%' }}>
          <IconCaution size={24} strokeWidth={1.5} color={A.labelQuaternary} />
          <span style={{ fontSize: 12, color: A.labelTertiary }}>服务不可用</span>
          <Button size="small" onClick={fetchInsight} style={{ fontSize: 11 }}>重试</Button>
        </Flex>
      </IOSWidgetCard>
    )
  }

  if (isSmall) {
    return (
      <IOSWidgetCard
        size={size}
        className={className}
        isEditing={isEditing}
        widgetId={widgetId}
        onRemove={onRemove}
        onContextMenu={onContextMenu}
        onLongPress={onLongPress}
        tint={WC.accent}
      >
        <Flex vertical align="center" justify="center" gap={6} style={{ height: '100%' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: `${config.color}12`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: config.color,
          }}>
            <RiskIcon size={18} strokeWidth={ICON_STROKE} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: A.label, lineHeight: 1 }}>
            {data?.riskLevel === 'low' ? '良好' : '关注'}
          </span>
          <WidgetStatusPill label={config.label} color={config.color} />
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
          icon={<IconMagic size={14} strokeWidth={ICON_STROKE} />}
          label="AI 智能洞察"
          color={config.color}
          right={
            <Flex align="center" gap={6}>
              <WidgetStatusPill label={config.label} color={config.color} />
              <Button
                type="text"
                size="small"
                icon={<IconRefresh size={12} strokeWidth={ICON_STROKE} className={loading ? 'animate-spin' : ''} />}
                onClick={fetchInsight}
                disabled={loading}
                style={{ width: 24, height: 24, minWidth: 24, padding: 0 }}
              />
            </Flex>
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
      <Flex vertical gap={10} style={{ height: '100%' }}>
        <Flex align="flex-start" gap={10}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${config.color}10`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: config.color,
            flexShrink: 0,
          }}>
            <RiskIcon size={18} strokeWidth={ICON_STROKE} />
          </div>
          <Flex vertical gap={2} style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: size === 'large' ? 17 : 15,
              fontWeight: 700,
              color: A.label,
              lineHeight: 1.25,
            }}>
              {data?.riskLevel === 'low' ? '系统运行状态良好' : data?.riskLevel === 'medium' ? '检测到潜在风险' : '需要立即处理'}
            </span>
            <span style={{ fontSize: 11, color: A.labelTertiary, fontWeight: 500 }}>
              置信度 {data?.confidence || 0}%
            </span>
          </Flex>
        </Flex>

        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Paragraph style={{
            fontSize: size === 'large' ? 13 : 12,
            color: A.labelSecondary,
            marginBottom: 0,
            lineHeight: 1.6,
          }} ellipsis={size === 'medium' ? { rows: 3 } : false}>
            {data?.insight || "正在分析系统数据..."}
          </Paragraph>
        </div>

        {size === 'large' && data?.recommendation && (
          <Flex gap={8} style={{
            borderTop: `1px solid ${A.separator}`,
            paddingTop: 10,
          }}>
            <WidgetLabel style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11, flexShrink: 0, color: config.color }}>
              建议
            </WidgetLabel>
            <span style={{ fontSize: 12, color: A.labelSecondary, lineHeight: 1.5, flex: 1 }}>
              {data.recommendation}
            </span>
          </Flex>
        )}
      </Flex>
    </IOSWidgetCard>
  )
}
