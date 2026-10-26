/**
 * 🍓 Berry Realm 统一设计系统
 *
 * ⛔ 全站色彩体系 = WorkBuddy（2026-09-26）：
 *   · 中性阶 = c-gray 暖灰（#F4F4F5 → #27272A）
 *   · 强调   = c-teal 青绿（亮 #059669 / 暗 #34D399）
 *   · 语义   = c-green / c-amber / c-blue / c-red 全彩
 *   · 原「黑白灰 + 宝石绿」体系已退役；新代码请直接用本文件 token 或 br-* CSS 变量。
 *
 * 所有业务卡片必须使用本文件定义的 token，保证视觉一致性。
 */

export const BERRY_THEME = {
  // ===== 强调主色（WorkBuddy c-teal）=====
  primary: '#059669',          // teal-600：亮色主按钮/链接
  primaryHover: '#10B981',     // teal-400：渐变另一端 / hover
  primaryActive: '#047857',    // teal 加深档
  primaryLight: '#ECFDF5',     // teal-50 淡铺底
  primaryBg: 'rgba(5,150,105,0.06)',
  primaryBorder: '#6EE7B7',    // teal-100
  primaryText: '#047857',      // 白底可读的强调文字

  // ===== 状态色（WorkBuddy 全彩语义）=====
  status: {
    success: '#16A34A',        // c-green 600
    processing: '#059669',     // 进行中/活跃 → 强调 teal
    warning: '#F59E0B',        // c-amber 400
    error: '#EF4444',          // c-red 400
    pending: '#A1A1AA',        // c-gray 400
  },

  // ===== Editorial 设计系统（保留兼容）=====
  editorial: {
    paper: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceAlt: '#F2F2F7',
    ink: '#1C1C1E',
    inkSecondary: '#3C3C43',
    inkTertiary: '#8E8E93',
    inkQuaternary: '#C7C7CC',
    line: 'rgba(60, 60, 67, 0.08)',
    lineStrong: 'rgba(60, 60, 67, 0.12)',
    type: {
      display: { fontSize: 'clamp(40px, 5vw, 56px)', fontWeight: 700, lineHeight: 1.0, letterSpacing: '-0.02em' },
      hero:    { fontSize: 'clamp(28px, 3vw, 34px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' },
      title:   { fontSize: 17, fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.4px' },
      body:    { fontSize: 15, fontWeight: 400, lineHeight: 1.4, letterSpacing: '-0.2px' },
      caption: { fontSize: 11, fontWeight: 600, lineHeight: 1.2, letterSpacing: '0.06px', textTransform: 'uppercase' as const },
      micro:   { fontSize: 10, fontWeight: 600, lineHeight: 1.2, letterSpacing: '0.08px', textTransform: 'uppercase' as const },
    },
  },

  // ===== Apple Material 设计系统（iOS 级别细腻度）=====
  // ⚠️ 深色模式：中性色/阴影均为 CSS 变量（定义于 app/globals.css 的 :root 与 .dark），
  // 内联 style 引用即可自动适配深浅两态；accents/widgetColors 已按 WorkBuddy 九色阶重映射。
  apple: {
    // 背景 — iOS systemGroupedBackground
    canvas: 'var(--berry-canvas)',
    canvasGradient: 'var(--berry-canvas-gradient)',

    // 卡片表面
    surface: 'var(--berry-surface)',
    surfaceTinted: (hex: string) => hex,  // helper: 传入 accent hex

    // 文字 — iOS label 色阶
    label: 'var(--berry-label)',                     // primary (iOS label)
    labelSecondary: 'var(--berry-label-secondary)',  // iOS secondaryLabel
    labelTertiary: 'var(--berry-label-tertiary)',    // iOS tertiaryLabel
    labelQuaternary: 'var(--berry-label-quaternary)',// iOS quaternaryLabel

    // 分隔线 — iOS separator (半透明，非纯灰)
    separator: 'var(--berry-separator)',
    separatorOpaque: 'var(--berry-separator-opaque)',

    // 仪表轨道 — 可见但柔和（非 hairline）
    track: 'var(--berry-track)',
    trackStrong: 'var(--berry-track-strong)',

    // 重映射到 WorkBuddy 九色阶。
    // ⚠️ key 名保留是为了不炸历史调用点（几十处 A.accents.xxx）。
    // ⚠️ 必须是**真实 hex**——代码里有 `${A.accents.green}40` 这类拼 alpha 的写法，
    //    换成 var(--x) 会生成 `var(--x)40` 这种无效值导致描边静默消失。
    accents: {
      blue: '#0EA5E9',       // c-blue 600 · 数据主系列
      cyan: '#06B6D4',       // c-blue 400
      green: '#16A34A',      // c-green 600 · 健康/达标
      mint: '#10B981',       // c-teal 400
      teal: '#10B981',
      red: '#EF4444',        // c-red 400 · 危险
      orange: '#F97316',     // c-coral 400
      yellow: '#F59E0B',     // c-amber 400
      indigo: '#4F46E5',     // c-purple 600
      purple: '#8B5CF6',     // c-purple 400
      pink: '#EC4899',       // c-pink 400
      brown: '#78716C',      // c-gray 400
    },

    // 每个组件的色彩身份 —— WorkBuddy 九色阶分配
    widgetColors: {
      temperature: { accent: '#F97316', bgTint: 'rgba(249,115,22,0.05)' },   // coral
      humidity:    { accent: '#0EA5E9', bgTint: 'rgba(24,95,165,0.05)' },   // blue
      light:       { accent: '#F59E0B', bgTint: 'rgba(186,117,23,0.05)' },  // amber
      co2:         { accent: '#10B981', bgTint: 'rgba(29,158,117,0.05)' },  // teal
      soil:        { accent: '#16A34A', bgTint: 'rgba(59,109,17,0.05)' },   // green
      fertility:   { accent: '#16A34A', bgTint: 'rgba(59,109,17,0.05)' },   // green
      nitrogen:    { accent: '#4F46E5', bgTint: 'rgba(79,70,229,0.05)' },   // purple 600
      phosphorus:  { accent: '#8B5CF6', bgTint: 'rgba(139,92,246,0.05)' }, // purple 400
      potassium:   { accent: '#EC4899', bgTint: 'rgba(236,72,153,0.05)' },  // pink
      weather:     { accent: '#0EA5E9', bgTint: 'rgba(24,95,165,0.05)' },   // blue
      ai:          { accent: '#059669', bgTint: 'rgba(5,150,105,0.05)' },   // teal（强调）
      membership:  { accent: '#4F46E5', bgTint: 'rgba(79,70,229,0.05)' },   // purple
    },

    // 圆角 — Apple generous
    radius: {
      widget: 22,
      inner: 14,
      small: 10,
      pill: 100,
    },

    // 阴影 — 多层叠加，真实深度感（深浅两态经 CSS 变量切换）
    shadow: {
      // 卡片静止态：环境光 + 方向光
      card: 'var(--berry-shadow-card)',
      // 卡片悬浮态：更强的方向光 + 扩散
      cardHover: 'var(--berry-shadow-card-hover)',
      // 内部元素
      inner: 'var(--berry-shadow-inner)',
    },

    // 内高光 — 模拟材质顶部光线反射
    innerHighlight: 'var(--berry-inner-highlight)',

    // 全站字体唯一源（app/globals.css 的 --font-ui = HarmonyOS 鸿蒙黑体；
    // 落地页作用域内会回退成思源黑体）
    fontFamily: 'var(--font-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif)',

    // SF Pro 风格类型阶
    type: {
      largeTitle: { fontSize: 34, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' },
      title1:     { fontSize: 28, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' },
      title2:     { fontSize: 22, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.01em' },
      title3:     { fontSize: 20, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em' },
      headline:   { fontSize: 17, fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.4px' },
      body:       { fontSize: 15, fontWeight: 400, lineHeight: 1.4, letterSpacing: '-0.2px' },
      subheadline:{ fontSize: 14, fontWeight: 400, lineHeight: 1.4, letterSpacing: '-0.1px' },
      footnote:   { fontSize: 12, fontWeight: 400, lineHeight: 1.3, letterSpacing: '0' },
      caption:    { fontSize: 11, fontWeight: 600, lineHeight: 1.2, letterSpacing: '0.06px', textTransform: 'uppercase' as const },
      micro:      { fontSize: 10, fontWeight: 600, lineHeight: 1.2, letterSpacing: '0.08px', textTransform: 'uppercase' as const },
    },
  },

  // ===== 统一渐变（卡片背景）=====
  // 状态渐变 = WorkBuddy 色阶（50 → 100/200）
  gradients: {
    cardHeader: (primary: string = '#059669') =>
      `linear-gradient(135deg, ${primary}15 0%, transparent 60%)`,
    cardHero: (primary: string = '#059669') =>
      `linear-gradient(135deg, ${primary}08 0%, ${primary}03 100%)`,
    success: 'linear-gradient(135deg, #EAF3DE 0%, #86EFAC 100%)',
    processing: 'linear-gradient(135deg, #ECFDF5 0%, #6EE7B7 100%)',
    warning: 'linear-gradient(135deg, #FAEEDA 0%, #FCD34D 100%)',
  },

  // ===== 统一圆角 =====
  radius: {
    sm: 10,
    md: 14,
    lg: 22,
    xl: 28,
  },

  // ===== 统一阴影 — Apple 多层叠加（CSS 变量，深浅两态自动切换）=====
  shadow: {
    sm: 'var(--berry-shadow-sm)',
    md: 'var(--berry-shadow-md)',
    lg: 'var(--berry-shadow-lg)',
  },
} as const

/**
 * 兼容旧代码：返回统一主色（不再按业务域区分）
 */
export function getDomainColor(_domain?: string): string {
  return BERRY_THEME.primary
}

/**
 * 按状态获取主题色
 */
export function getStatusColor(status: 'success' | 'processing' | 'warning' | 'error' | 'pending'): string {
  return BERRY_THEME.status[status]
}
