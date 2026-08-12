"use client"

import { useEffect, useState } from "react"
import { Sparkles, Crown, Zap, Check, ChevronRight } from "lucide-react"
import { Typography, Flex, Progress, Button } from "antd"
import Link from "next/link"
import { IOSWidgetCard } from "./ios-style/ios-widget-card"
import { BERRY_THEME } from "@/lib/ui/berry-theme"

const { Text } = Typography
const ICON_STROKE = 1.75
const E = BERRY_THEME.editorial

interface QuotaInfo {
  daily_limit: number
  daily_usage: number
  balance: number
  can_use: boolean
}

interface MembershipCardProps {
  className?: string
  size?: 'small' | 'medium' | 'large'
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

export function MembershipCard({
  className,
  size = 'medium',
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress
}: MembershipCardProps) {
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/user/settings')
        const data = await res.json()
        if (data.user) setUser(data.user)
        if (data.quota) setQuota(data.quota)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return (
    <IOSWidgetCard
      size={size}
      className={className}
      isEditing={isEditing}
      widgetId={widgetId}
      onRemove={onRemove}
      onContextMenu={onContextMenu}
      onLongPress={onLongPress}
    >
      <div className="h-full w-full animate-pulse" style={{ background: E.surfaceAlt, borderRadius: 8 }} />
    </IOSWidgetCard>
  )

  const membership = user?.membership || 'free'
  const isPlus = membership === 'plus'
  const isPro = membership === 'pro'
  const isFree = membership === 'free'
  const isSmall = size === 'small'

  const config = isPlus
    ? { icon: Crown, color: '#9333ea', title: 'PLUS 会员', label: 'PLUS' }
    : isPro
      ? { icon: Sparkles, color: '#d97706', title: 'PRO 会员', label: 'PRO' }
      : { icon: Zap, color: '#8c8c8c', title: '免费计划', label: '基础' }

  const Icon = config.icon

  const Caption = ({ text, color }: { text: string; color?: string }) => (
    <span style={{ ...E.type.caption, color: color || E.inkTertiary, fontSize: isSmall ? 9 : 10 }}>{text}</span>
  )

  const Header = !isSmall ? (
    <Flex align="center" justify="space-between" style={{ width: '100%' }}>
      <Caption text="MEMBERSHIP" />
      <Link
        href="/profile"
        style={{ fontSize: 10, color: E.inkTertiary, display: 'flex', alignItems: 'center', gap: 2, pointerEvents: 'auto', zIndex: 50, position: 'relative', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}
      >
        详情 <ChevronRight size={12} strokeWidth={ICON_STROKE} color={E.inkTertiary} />
      </Link>
    </Flex>
  ) : null

  return (
    <IOSWidgetCard
      size={size}
      className={className}
      header={Header}
      isEditing={isEditing}
      widgetId={widgetId}
      onRemove={onRemove}
      onContextMenu={onContextMenu}
      onLongPress={onLongPress}
    >
      {/* Small Size — giant label */}
      {isSmall && (
        <Flex vertical justify="space-between" style={{ height: '100%' }}>
          <Icon size={20} strokeWidth={1.5} color={config.color} style={{ opacity: 0.6 }} />
          <Flex vertical gap={2}>
            <span style={{ fontSize: 22, fontWeight: 200, color: E.ink, lineHeight: 0.9, letterSpacing: '-0.02em' }}>{config.label}</span>
            <span style={{ ...E.type.caption, color: E.inkTertiary, fontSize: 9 }}>
              {isPlus ? '无限制' : `${quota?.daily_usage || 0}/${quota?.daily_limit || 0}`} AI/天
            </span>
          </Flex>
        </Flex>
      )}

      {/* Medium/Large Size */}
      {!isSmall && (
        <Flex vertical style={{ height: '100%' }} gap={8}>
          <Flex vertical gap={6}>
            <Flex align="baseline" justify="space-between">
              <Caption text="每日 AI 额度" />
              <span style={{ fontSize: isSmall ? 24 : 28, fontWeight: 200, color: E.ink, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {isPlus ? '∞' : `${quota?.daily_usage || 0} / ${quota?.daily_limit || 0}`}
              </span>
            </Flex>
            {!isPlus ? (
              <Progress
                percent={Math.min(100, quota?.daily_limit ? (quota.daily_usage / quota.daily_limit) * 100 : 0)}
                strokeColor={isPro ? '#d97706' : BERRY_THEME.primary}
                showInfo={false}
                size="small"
                style={{ margin: 0 }}
              />
            ) : (
              <div style={{ height: 4, width: '100%', borderRadius: 2, background: `${config.color}20` }} />
            )}
          </Flex>

          <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: `1px solid ${E.line}` }}>
            {isFree ? (
              <Flex vertical gap={8}>
                <Flex align="center" gap={6}>
                  <Check size={12} strokeWidth={ICON_STROKE} color={config.color} />
                  <span style={{ fontSize: 12, color: E.inkSecondary }}>基础监测</span>
                </Flex>
                <Button
                  type="primary"
                  size="small"
                  block
                  icon={<Sparkles size={12} strokeWidth={ICON_STROKE} />}
                >
                  升级
                </Button>
              </Flex>
            ) : (
              <Flex vertical gap={6}>
                <Flex align="center" gap={6}>
                  <Check size={12} strokeWidth={ICON_STROKE} color={config.color} />
                  <span style={{ fontSize: 12, color: E.inkSecondary }}>{isPlus ? '无限制 AI' : '70次 AI/天'}</span>
                </Flex>
                <Flex align="center" gap={6}>
                  <Check size={12} strokeWidth={ICON_STROKE} color={config.color} />
                  <span style={{ fontSize: 12, color: E.inkSecondary }}>{isPlus ? '全天候自动' : '数据分析'}</span>
                </Flex>
              </Flex>
            )}
          </div>
        </Flex>
      )}
    </IOSWidgetCard>
  )
}
