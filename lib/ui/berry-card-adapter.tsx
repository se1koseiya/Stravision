/**
 * 🍓 业务卡片统一接入层
 *
 * 提供：
 * 1. 统一色系应用（与 AI 助手页主色一致 #1677ff）
 * 2. 统一 A2UI 命令构建
 * 3. 统一 XCard 渲染（通过 BerryXCard）
 *
 * 用法示例：
 * ```tsx
 * import { useBerryCard } from '@/lib/ui/berry-card-adapter'
 *
 * export function MyCard() {
 *   const { BerryCard } = useBerryCard({
 *     surfaceId: 'my-card',
 *     commands: [...],
 *     components: {...},
 *     onAction: handleAction,
 *     fallback: <OldUI />,
 *   })
 *   return <BerryCard />
 * }
 * ```
 */

import { useMemo } from 'react'
import { BerryXCard } from '@/components/ui/berry-xcard'
import { BERRY_THEME } from '@/lib/ui/berry-theme'
import type { A2UICommand_v0_9, ActionPayload } from '@ant-design/x-card'
import type { ReactNode } from 'react'

export interface UseBerryCardOptions {
  surfaceId: string
  commands: A2UICommand_v0_9[]
  components: Record<string, React.ComponentType<any>>
  onAction: (payload: ActionPayload) => void
  fallback: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function useBerryCard(opts: UseBerryCardOptions) {
  const themeColor = BERRY_THEME.primary

  const BerryCard = useMemo(() => {
    return function BerryCardWrapper() {
      return (
        <BerryXCard
          surfaceId={opts.surfaceId}
          commands={opts.commands}
          onAction={opts.onAction}
          fallback={opts.fallback}
          components={opts.components}
          className={opts.className}
          style={{
            ...opts.style,
            borderColor: `${themeColor}30`,
            background: `linear-gradient(135deg, ${themeColor}08 0%, transparent 50%)`,
          }}
        />
      )
    }
  }, [opts, themeColor])

  return { BerryCard, themeColor }
}
