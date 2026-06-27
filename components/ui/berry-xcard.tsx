"use client"

/**
 * 🍓 BerryXCard — 统一 XCard 渲染器
 *
 * 业务卡片统一入口：
 * 1. 优先使用 A2UI 协议（XCard.Box + Catalog）
 * 2. 渲染超时（500ms）自动切换到直接渲染模式（兜底）
 *
 * 所有业务卡片都应通过本组件渲染，保证 A2UI 协议一致性。
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { XCard, registerCatalog } from '@ant-design/x-card'
import type { A2UICommand_v0_9, ActionPayload } from '@ant-design/x-card'
import { motion } from 'framer-motion'
import { BERRY_THEME } from '@/lib/ui/berry-theme'

// ===== 注册统一 catalog =====
import { berryCatalog, BERRY_CATALOG_ID } from '@/lib/a2ui/berry-protocol'
registerCatalog(berryCatalog)

export interface BerryXCardProps {
  /** 业务卡片的 ID（在 A2UI surface 中唯一） */
  surfaceId: string
  /** A2UI 命令队列 */
  commands: A2UICommand_v0_9[]
  /** Action 处理器（接收 A2UI 事件） */
  onAction: (payload: ActionPayload) => void
  /** 直接渲染模式（兜底）的 UI */
  fallback: React.ReactNode
  /** A2UI 组件实现映射（Column / Card / Metric 等） */
  components: Record<string, React.ComponentType<any>>
  /** 容器样式 */
  style?: React.CSSProperties
  /** 容器 className */
  className?: string
  /** 自定义超时时间（ms），默认 500ms */
  timeout?: number
}

export function BerryXCard({
  surfaceId,
  commands,
  onAction,
  fallback,
  components,
  style,
  className,
  timeout = 500,
}: BerryXCardProps) {
  const [useDirectMode, setUseDirectMode] = useState(false)
  const boxMountedRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 监听 x-card 是否成功挂载
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!boxMountedRef.current) {
        setUseDirectMode(true)
      }
    }, timeout)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [timeout])

  // 处理 action 时标记已挂载
  const wrappedAction = useCallback((payload: ActionPayload) => {
    boxMountedRef.current = true
    onAction(payload)
  }, [onAction])

  // 兜底渲染
  if (useDirectMode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={style}
        className={className}
      >
        {fallback}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={style}
      className={className}
    >
      <XCard.Box
        commands={commands}
        onAction={wrappedAction}
        components={components}
      >
        <XCard.Card id={surfaceId} />
      </XCard.Box>
    </motion.div>
  )
}

// ===== 统一容器样式（统一主色，不再按业务域区分）=====
export function getBerryCardStyle(_domain?: string) {
  return {
    background: `linear-gradient(135deg, ${BERRY_THEME.primary}08 0%, transparent 50%)`,
    borderColor: `${BERRY_THEME.primary}30`,
    borderRadius: BERRY_THEME.radius.lg,
  } as React.CSSProperties
}

export default BerryXCard
