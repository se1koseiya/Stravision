"use client"

import { cn } from "@/lib/utils"
import { ReactNode, useState, useRef } from "react"
import { Flex } from "antd"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { IconMinus } from "@/components/icon";

const ICON_STROKE = 1.75
const A = BERRY_THEME.apple

interface IOSWidgetCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onContextMenu'> {
  children: ReactNode
  header?: ReactNode
  footer?: ReactNode
  background?: ReactNode
  /** Per-widget color identity — applies subtle tint + colored glow */
  tint?: string
  size?: 'small' | 'medium' | 'large'
  widgetId?: string
  isEditing?: boolean
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

export function IOSWidgetCard({
  className,
  size = 'medium',
  isEditing = false,
  tint,
  children,
  header,
  footer,
  background,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress,
  ...props
}: IOSWidgetCardProps) {

  const { isElderFriendlyMode } = useElderFriendly()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditing) return;
    timerRef.current = setTimeout(() => {
      if (onLongPress && widgetId) {
        onLongPress(e, widgetId);
      }
    }, 500);
  }

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onContextMenu && widgetId) {
      onContextMenu(e, widgetId);
    }
  }

  const padding = size === 'small' ? 14 : size === 'large' ? 20 : 16

  // Subtle, clean shadow — reference fitness dashboard
  const baseShadow = isEditing
    ? 'none'
    : isHovered
      ? '0 4px 16px rgba(0,0,0,0.06), 0 12px 32px -8px rgba(0,0,0,0.08)'
      : '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px -4px rgba(0,0,0,0.05)'

  const tintGlow = tint && !isEditing && isHovered
    ? `, 0 8px 24px -6px ${tint}20`
    : ''

  return (
    <div
      className={cn(
        "relative w-full h-full overflow-hidden select-none transition-all duration-200 ease-out",
        isEditing && "animate-jiggle cursor-pointer",
        className
      )}
      style={{
        borderRadius: 18,
        background: A.surface,
        boxShadow: baseShadow + tintGlow,
        border: `1px solid var(--berry-card-border)`,
      }}
      onMouseEnter={() => !isEditing && setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); handleTouchEnd(); }}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      {...props}
    >
      <style jsx global>{`
        @keyframes jiggle {
          0% { transform: rotate(-1deg); }
          50% { transform: rotate(1deg); }
          100% { transform: rotate(-1deg); }
        }
        .animate-jiggle {
          animation: jiggle 0.3s infinite ease-in-out;
        }
      `}</style>

      {isEditing && (
        <div
          className="cancel-drag absolute -top-2 -left-2 z-[100] size-7 flex items-center justify-center cursor-pointer transition-colors pointer-events-auto"
          style={{
            background: BERRY_THEME.status.error,
            borderRadius: '50%',
            boxShadow: '0 2px 6px rgba(255,77,79,0.4)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (onRemove && widgetId) onRemove(widgetId);
          }}
          onMouseDown={(e) => { e.stopPropagation(); }}
          onTouchStart={(e) => { e.stopPropagation(); }}
          onPointerDown={(e) => { e.stopPropagation(); }}
        >
          <IconMinus className="size-3.5 text-white" strokeWidth={2.5} />
        </div>
      )}

      <div className={cn(
        "relative flex flex-col h-full w-full",
        isEditing && "pointer-events-none",
        isElderFriendlyMode && "elder-friendly-text"
      )} style={{ borderRadius: 18, fontFamily: A.fontFamily, padding }}>
        {background && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            {background}
          </div>
        )}

        {header && (
          <div className="relative z-10 flex items-center justify-between w-full shrink-0 mb-2" style={{ minHeight: 20 }}>
            {header}
          </div>
        )}

        <div className="relative z-10 flex-1 flex flex-col w-full min-h-0">
          {children}
        </div>

        {footer && (
          <div className="relative z-10 shrink-0 w-full mt-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shared sub-components for consistent widget styling ───

/** Widget header: icon + label on left, optional right slot */
export function WidgetHeader({
  icon,
  label,
  right,
  color,
}: {
  icon?: ReactNode
  label: string
  right?: ReactNode
  color?: string
}) {
  return (
    <>
      <Flex align="center" gap={6} style={{ minWidth: 0, flex: 1 }}>
        {icon && (
          <span style={{ color: color || A.labelTertiary, display: 'inline-flex', flexShrink: 0 }}>
            {icon}
          </span>
        )}
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: A.labelSecondary,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {label}
        </span>
      </Flex>
      {right && <div style={{ flexShrink: 0, marginLeft: 8 }}>{right}</div>}
    </>
  )
}

/** Uppercase tracking label — editorial caption style */
export function WidgetLabel({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.04em',
      color: A.labelTertiary,
      lineHeight: 1.2,
      ...style,
    }}>
      {children}
    </span>
  )
}

/** Status pill — colored dot + label */
export function WidgetStatusPill({
  label,
  color,
  style,
}: {
  label: string
  color: string
  style?: React.CSSProperties
}) {
  return (
    <Flex align="center" gap={5} style={{
      padding: '3px 8px',
      borderRadius: 100,
      background: `${color}12`,
      ...style,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 11, fontWeight: 600, color, lineHeight: 1 }}>{label}</span>
    </Flex>
  )
}

/** Hero number — the visual focus of each widget */
export function WidgetHeroNumber({
  value,
  unit,
  fontSize,
  color = A.label,
  style,
}: {
  value: string | number
  unit?: string
  fontSize: number
  color?: string
  style?: React.CSSProperties
}) {
  return (
    <Flex align="baseline" gap={3} style={style}>
      <span style={{
        fontSize,
        fontWeight: 700,
        color,
        lineHeight: 0.95,
        letterSpacing: '-0.03em',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</span>
      {unit && (
        <span style={{
          fontSize: Math.max(12, fontSize * 0.35),
          fontWeight: 500,
          color: A.labelTertiary,
          lineHeight: 1,
        }}>{unit}</span>
      )}
    </Flex>
  )
}

/** Bottom stat row — Current/Average/Max pattern from reference */
export function WidgetStatRow({
  stats,
}: {
  stats: Array<{ label: string; value: ReactNode; icon?: ReactNode; color?: string }>
}) {
  return (
    <Flex
      justify="space-between"
      style={{
        borderTop: `1px solid ${A.separator}`,
        paddingTop: 10,
      }}
    >
      {stats.map((s, i) => (
        <Flex key={i} vertical gap={3} style={{ flex: 1, minWidth: 0 }}>
          <WidgetLabel style={{ fontSize: 10 }}>{s.label}</WidgetLabel>
          <Flex align="center" gap={3}>
            {s.icon && <span style={{ display: 'inline-flex', color: s.color || A.labelTertiary }}>{s.icon}</span>}
            <span style={{
              fontSize: 16,
              fontWeight: 600,
              color: s.color || A.label,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>{s.value}</span>
          </Flex>
        </Flex>
      ))}
    </Flex>
  )
}

/** Icon badge — colored rounded square with icon inside */
export function WidgetIconBadge({
  icon,
  color,
  size = 28,
}: {
  icon: ReactNode
  color: string
  size?: number
}) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 8,
      background: `${color}12`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color,
      flexShrink: 0,
    }}>
      {icon}
    </div>
  )
}

/** Trend chip — arrow + delta value, compact inline */
export function WidgetTrendChip({
  direction,
  value,
  color,
  style,
}: {
  direction: 'up' | 'down' | 'flat'
  value?: string
  color?: string
  style?: React.CSSProperties
}) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const c = color || (direction === 'up' ? A.accents.red : direction === 'down' ? A.accents.blue : A.labelTertiary)
  return (
    <Flex align="center" gap={2} style={{
      fontSize: 11,
      fontWeight: 600,
      color: c,
      lineHeight: 1,
      fontVariantNumeric: 'tabular-nums',
      ...style,
    }}>
      <span style={{ fontSize: 13, lineHeight: 1 }}>{arrow}</span>
      {value && <span>{value}</span>}
    </Flex>
  )
}

/** Compact mini stat row — no top border, denser than WidgetStatRow */
export function WidgetMiniStats({
  stats,
  style,
}: {
  stats: Array<{ label: string; value: ReactNode; color?: string; icon?: ReactNode }>
  style?: React.CSSProperties
}) {
  return (
    <Flex justify="space-between" style={style}>
      {stats.map((s, i) => (
        <Flex key={i} vertical gap={2} style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.03em',
            color: A.labelTertiary,
            textTransform: 'uppercase',
            lineHeight: 1,
          }}>{s.label}</span>
          <Flex align="center" gap={2}>
            {s.icon && <span style={{ color: s.color || A.labelTertiary, display: 'inline-flex' }}>{s.icon}</span>}
            <span style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: s.color || A.labelSecondary,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>{s.value}</span>
          </Flex>
        </Flex>
      ))}
    </Flex>
  )
}

/** Compact footer divider + stats for medium widgets */
export function WidgetCompactFooter({
  stats,
  style,
}: {
  stats: Array<{ label: string; value: ReactNode; color?: string; icon?: ReactNode }>
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      borderTop: `1px solid ${A.separator}`,
      paddingTop: 8,
      ...style,
    }}>
      <WidgetMiniStats stats={stats} />
    </div>
  )
}

/** Dot density indicator — segmented dots showing level within range */
export function WidgetDotDensity({
  value,
  min = 0,
  max = 100,
  count = 8,
  color,
  trackColor,
}: {
  value: number
  min?: number
  max?: number
  count?: number
  color: string
  trackColor?: string
}) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const filled = Math.round(pct * count)
  return (
    <Flex gap={3} align="center">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: i < filled ? color : (trackColor || A.trackStrong),
          transition: 'background 0.4s ease',
        }} />
      ))}
    </Flex>
  )
}
