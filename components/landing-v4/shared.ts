/* ------------------------------------------------------------
   莓界落地页 v4 · 设计令牌
   ─────────────────────────────────────────────────────────────
   全部取自 Loomy 官网（loomy.xunfei.cn）真实在跑的 CSS 变量，
   oklch → hex 精确换算，不是凭感觉调的：

     --landing-ink        oklch(.252 0 0)               → #222222
     --landing-muted      oklch(.52  0 0)               → #646A73
     --landing-surface    oklch(1 0 0)                  → #FFFFFF
     --landing-accent     oklch(.853 .133 157.3)        → #6EE7B7
     --landing-accent-strong oklch(.773 .15 157.7)      → #059669
     --landing-mint       oklch(.959 .045 157.1)        → #DAFBE6
     --landing-hero-mint  oklch(.9425 .0533 164.7)      → #CCF8E3
     --landing-cyan       oklch(.973 .028 206.8)        → #E2FCFF
     --landing-blue       oklch(.947 .036 245.3)        → #DAF1FF
     --landing-chip       oklch(.977 .057 158.1)        → #D8FFE9
     --landing-glow-solid oklch(.8886 .1997 152.855)    → #53FF98
     --brand-primary      oklch(.8348 .1302 160.908)    → #72E3AD
     --brand-secondary    oklch(.6231 .188 259.815)     → #059669
     --hero-static-yellow oklch(.96 .17 105)            → #FFF85E
     --hero-static-green  oklch(.90 .18 151)            → #75FF9F
     --color-emerald-300  oklch(.845 .143 164.978)      → #5EE9B5
     --color-neutral-950  oklch(14.5% 0 0)              → #0A0A0A
   ------------------------------------------------------------ */

export const L = {
  /** 正文墨色 / 次级文字 —— 值为 CSS 变量，浅色定义见 globals.css 的 :root，.dark 下整组切换深色 */
  ink: "var(--lg-ink)",
  muted: "var(--lg-muted)",
  surface: "var(--lg-surface)",

  /** 主题绿三阶 */
  accent: "var(--lg-accent)",
  accentStrong: "var(--lg-accent-strong)",
  /** 导航 hover 绿 */
  navHover: "var(--lg-nav-hover)",

  /** 浅色底（卡片 tone） */
  mint: "var(--lg-mint)",
  heroMint: "var(--lg-hero-mint)",
  cyan: "var(--lg-cyan)",
  blue: "var(--lg-blue)",
  chip: "var(--lg-chip)",

  /** 环境光 / 品牌副色 */
  glow: "var(--lg-glow)",
  brandPrimary: "var(--lg-brand-primary)",
  brandSecondary: "var(--lg-brand-secondary)",

  /** 首屏双光斑 */
  heroYellow: "var(--lg-hero-yellow)",
  heroGreen: "var(--lg-hero-green)",

  /** 中性 */
  emerald300: "var(--lg-emerald300)",
  emerald400: "var(--lg-emerald400)",
  neutral950: "var(--lg-neutral950)",
  neutral800: "var(--lg-neutral800)",

  /** 文字阶 */
  desc: "var(--lg-desc)",
  eyebrowGray: "var(--lg-eyebrow-gray)",
  nearWhite: "var(--lg-near-white)",
  dark3: "var(--lg-dark3)",

  /** 薄荷底上的绿 */
  greenMid: "var(--lg-green-mid)",
  greenInk: "var(--lg-green-ink)",

  /** 描边 */
  line: "var(--lg-line)",
  hairline: "var(--lg-hairline)",

  /** 场景面板 / 图标底的特殊描边 */
  panelBorder: "var(--lg-panel-border)",
  iconBorder: "var(--lg-icon-border)",
  previewHalo: "var(--lg-preview-halo)",

  /** 主按钮对（深色模式下翻转为白底墨字） */
  btnBg: "var(--lg-btn-bg)",
  btnFg: "var(--lg-btn-fg)",

  /** 卡片表面 */
  card: "var(--lg-card)",
} as const;

/** Loomy 用 color-mix 表达的派生底色（同样走 CSS 变量） */
export const L_MIX = {
  /** 平台区卡片底 */
  platformCard: "var(--lg-mix-platform-card)",
  /** 业务面板底 */
  panel: "var(--lg-mix-panel)",
  /** 业务预览台底 */
  preview: "var(--lg-mix-preview)",
  /** 收起态卡底 */
  idle: "var(--lg-mix-idle)",
  /** 口碑区底 */
  voices: "var(--lg-mix-voices)",
  /** 流程图标底 */
  workflowIcon: "var(--lg-mix-workflow-icon)",
  /** 下载区两个 radial 光斑 */
  downloadBlue: "var(--lg-mix-download-blue)",
  downloadMint: "var(--lg-mix-download-mint)",
} as const;

export const SHADOW = {
  /** 小元件投影 */
  soft: "0 0.35rem 0.8rem rgba(34,34,34,0.07)",
  /** 卡片 hover */
  card: "0 1.5rem 3.5rem rgba(34,34,34,0.14)",
  /** --landing-shadow */
  token: "10px 10px 50px rgba(99,186,138,0.18)",
  /** 导航收胶囊后 */
  nav: "0 0.75rem 2.5rem rgba(0,0,0,0.12), inset 0 1px 0 rgba(34,34,34,0.08)",
  /** 口碑圆盘：外投影 + 内白描边（白描边走变量，深色下收淡） */
  disc: "0 2.5rem 4rem rgba(34,34,34,0.07), 0 0 1rem var(--lg-ghost)",
  /** 口碑底部胶囊 */
  audience: "0 1.25rem 2.5rem rgba(34,34,34,0.09)",
  /** 预览窗口绿色光环（深色下光环色随 --lg-preview-halo 收暗） */
  halo: "0 0 0 0.72rem var(--lg-preview-halo)",
  /** 深色主按钮 */
  dark: "0 1rem 2.75rem rgba(10,10,10,0.18)",
} as const;

/** 区块大标题（Loomy --landing-type-section-title：1440px 下实测 45px/60px） */
export const SECTION_TITLE = {
  color: L.ink,
  fontSize: "clamp(2.125rem, 3.125vw, 2.8125rem)",
  fontWeight: 700,
  lineHeight: 1.3333,
  letterSpacing: "0.0167em",
} as const;

/** 区块内的小标题（面板 h3：1440px 下实测 31.68px/41.184px） */
export const PANEL_TITLE = {
  color: L.ink,
  fontSize: "clamp(1.5rem, 2.2vw, 1.98rem)",
  fontWeight: 700,
  lineHeight: 1.3,
  letterSpacing: "0.01em",
} as const;

/** eyebrow / 标签行（13px/800 + 2.08px 字距） */
export const EYEBROW = {
  color: L.greenInk,
  fontSize: "0.8125rem",
  fontWeight: 800,
  lineHeight: 1.4,
  letterSpacing: "0.16em",
} as const;

/** 区块容器的左右安全边（80rem + 2rem 内缩） */
export const CONTAINER = "mx-auto w-[min(100%-2rem,80rem)]";

/** 首屏双光斑：左黄右绿大椭圆 + 强模糊（Loomy HeroGradientBackground） */
export const HERO_GLOW_BLUR = "clamp(3.5rem, 7vw, 7rem)";

export const HERO_GLOWS = [
  {
    background: L.heroYellow,
    opacity: 0.82,
    transform: "rotate(8deg)",
    style: { top: "34%", left: "-16%", width: "clamp(32rem,58vw,64rem)", aspectRatio: "1.45" },
  },
  {
    background: L.heroGreen,
    opacity: 0.76,
    transform: "rotate(-9deg)",
    style: { top: "42%", right: "-17%", width: "clamp(34rem,60vw,66rem)", aspectRatio: "1.5" },
  },
] as const;

export const EASE = [0.16, 1, 0.3, 1] as const;

/** 统一的进场动画参数 */
export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, delay, ease: EASE },
});

/** @deprecated 旧令牌，保留仅为兼容；新代码请用 L / L_MIX */
export const BRAND = {
  green: "#6EE7B7",
  greenDeep: "#059669",
  greenInk: "#059669",
  tint: "#E6FCEE",
  tintStrong: "#5EE9B5",
} as const;

/** @deprecated 旧令牌，保留仅为兼容；新代码请用 L / L_MIX */
export const NEUTRAL = {
  ink: "#222222",
  ink2: "#646A73",
  ink3: "#A9A9A9",
  line: "rgba(34,34,34,0.10)",
} as const;

/** @deprecated 用 HERO_GLOWS（Loomy 首屏用的是左右两个大椭圆光斑） */
export const GLOW_BLOBS = HERO_GLOWS.map((g, i) => ({
  style: `radial-gradient(circle, ${g.background} 0%, transparent 68%)`,
  className: i === 0 ? "-left-[16%] top-[34%] size-[760px]" : "right-[-17%] top-[42%] size-[720px]",
}));

export const NAV_LINKS = [
  { href: "/", label: "主页" },
  { href: "/mcp-store", label: "技能广场" },
  { href: "/whats-new", label: "新功能" },
  { href: "/changelog", label: "更新日志" },
  { href: "/docs", label: "产品文档" },
] as const;
