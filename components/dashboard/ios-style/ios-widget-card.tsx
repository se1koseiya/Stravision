"use client"

import { cn } from "@/lib/utils"
import { ReactNode, useRef } from "react"
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
  const rootRef = useRef<HTMLDivElement | null>(null)

  /* —— 按压点光源的坐标（HDS 六特性 ④）——
     光晕位置 = 触点位置，所以按下那一刻把触点换算成百分比写进 --imv-gx/--imv-gy。
     ① 为什么写 inline 自定义属性而不是 setState：这两个值每按一次才变一次，且**不参与渲染**
        （CSS 直接读），进 state 只会让整张卡白重渲染一次；
     ② 为什么不用 React 的 style prop：那样每次重渲染都会重写变量、把用户按下的值冲掉。
        自定义属性只在事件里命令式写入，React 不碰它。 */
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = rootRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    el.style.setProperty("--imv-gx", `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty("--imv-gy", `${((e.clientY - r.top) / r.height) * 100}%`)
  }

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

  /* —— 沉浸光感材质（HDS 组件材质）——
     ⚠️ 卡面不能再走内联实色 + 内联阴影：**内联样式优先级高于任何 CSS 类**，
        留着 background/boxShadow 的内联值，材质就永远不生效（改了等于没改）。
        所以材质/描边/阴影统一交给 .ios-widget（HDS REGULAR 档，定义见
        components/dashboard/ios-style/widget-material.ts 的 DASHBOARD_MATERIAL_CSS
        + components/device/material-css.ts），这里只做两件事：
          ① 保留 borderRadius（几何不属于材质）；
          ② 把「每个小组件的色彩身份」以 --w-tint 传下去（自定义属性不是内联"属性"，
             CSS 里的 box-shadow 可以读到它 → 彩色光晕仍然只在 hover 出现）。
     ⚠️ 按压**只上光、不上缩放**：小组件是可拖拽网格的单元，transform 要留给拖拽手势。
        所以光晕走独立的 .ios-widget-glow 子层（:::active 触发），卡片本体不参与 transform
        —— 与 device-control 的 ImmersiveCard（缩放 + 光晕）有意区别。 */
  const tintStyle = tint
    ? ({ "--w-tint": `${tint}20` } as React.CSSProperties)
    : undefined

  return (
    <div
      ref={rootRef}
      className={cn(
        // .dc-mat + .dc-mat--regular = HDS 沉浸光感材质本体（REGULAR 档：内容区卡片）。
        // 材质数值来自 components/device/material-css.ts，本组件不写任何 --mat-* 数值。
        "dc-mat dc-mat--regular ios-widget relative w-full h-full overflow-hidden select-none transition-all duration-200 ease-out",
        isEditing && "animate-jiggle cursor-pointer ios-widget--editing",
        className
      )}
      style={{
        borderRadius: 18,
        ...tintStyle,
      }}
      /* hover 阴影由 CSS :hover 驱动（不再用 state：每次进出都 setState 会让整张卡重渲染，
         而且内联阴影会盖掉 CSS 里的材质阴影） */
      onPointerDown={handlePointerDown}
      onMouseLeave={handleTouchEnd}
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

      {/* 按压点光源层：静止态 opacity:0（看不见），:active 时才亮一下。
          亮/暗两套光色在 DASHBOARD_MATERIAL_CSS 里给（亮底必须换成中性灰光，
          纯白在近白画布上等于没做）。 */}
      <div className="ios-widget-glow" aria-hidden />

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
