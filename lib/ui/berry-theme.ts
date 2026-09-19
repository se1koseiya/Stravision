/**
 * 🍓 Berry Realm 统一设计系统
 *
 * 与 AI 助手页面（app/ai-assistant/page.tsx ConfigProvider）保持一致：
 * 主色 = Ant Design 默认蓝 #1677ff
 *
 * 所有业务卡片必须使用本文件定义的 token，保证视觉一致性。
 */

export const BERRY_THEME = {
  // ===== 品牌主色（Ant Design 默认蓝，与 AI 助手页一致）=====
  primary: '#1677ff',
  primaryHover: '#4096ff',
  primaryActive: '#0958d9',
  primaryLight: '#e6f4ff',     // blue-1
  primaryBg: '#f0f7ff',        // blue-0 浅背景
  primaryBorder: '#91caff',    // blue-3
  primaryText: '#002c8c',      // blue-9

  // ===== 状态色（沿用 antd 算法）=====
  status: {
    success: '#52c41a',
    processing: '#1677ff',
    warning: '#faad14',
    error: '#ff4d4f',
    pending: '#9ca3af',
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
  // 内联 style 引用即可自动适配深浅两态；accents/widgetColors 为主题无关的饱和色，保持原值。
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

    // iOS 系统色 — 鲜活但克制
    accents: {
      blue: '#0A84FF',       // iOS systemBlue
      green: '#30D158',      // iOS systemGreen
      indigo: '#5856D6',     // iOS systemIndigo
      orange: '#FF9500',     // iOS systemOrange
      pink: '#FF375F',       // iOS systemPink
      purple: '#BF5AF2',     // iOS systemPurple
      teal: '#40C8E0',       // iOS systemTeal
      yellow: '#FFD60A',     // iOS systemYellow
      red: '#FF453A',        // iOS systemRed
      mint: '#66D4CF',       // iOS systemMint
      cyan: '#64D2FF',       // iOS systemCyan
      brown: '#AC8E68',      // iOS systemBrown
    },

    // 每个组件的色彩身份 — accent + 背景着色
    widgetColors: {
      temperature: { accent: '#FF9500', bgTint: 'rgba(255, 149, 0, 0.04)' },
      humidity:    { accent: '#0A84FF', bgTint: 'rgba(10, 132, 255, 0.04)' },
      light:       { accent: '#FFD60A', bgTint: 'rgba(255, 214, 10, 0.04)' },
      co2:         { accent: '#40C8E0', bgTint: 'rgba(64, 200, 224, 0.04)' },
      soil:        { accent: '#30D158', bgTint: 'rgba(48, 209, 88, 0.04)' },
      fertility:   { accent: '#30D158', bgTint: 'rgba(48, 209, 88, 0.04)' },
      nitrogen:    { accent: '#5856D6', bgTint: 'rgba(88, 86, 214, 0.04)' },
      phosphorus:  { accent: '#BF5AF2', bgTint: 'rgba(191, 90, 242, 0.04)' },
      potassium:   { accent: '#FF375F', bgTint: 'rgba(255, 55, 95, 0.04)' },
      weather:     { accent: '#0A84FF', bgTint: 'rgba(10, 132, 255, 0.04)' },
      ai:          { accent: '#5856D6', bgTint: 'rgba(88, 86, 214, 0.04)' },
      membership:  { accent: '#5856D6', bgTint: 'rgba(88, 86, 214, 0.04)' },
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

    // SF Pro 风格字体
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", system-ui, sans-serif',

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
  gradients: {
    cardHeader: (primary: string = '#1677ff') =>
      `linear-gradient(135deg, ${primary}15 0%, transparent 60%)`,
    cardHero: (primary: string = '#1677ff') =>
      `linear-gradient(135deg, ${primary}08 0%, ${primary}03 100%)`,
    success: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
    processing: 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)',
    warning: 'linear-gradient(135deg, #fffbe6 0%, #ffe58f 100%)',
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
