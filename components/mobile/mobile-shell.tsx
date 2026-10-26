"use client"

/**
 * 移动端「 agriOS 原型」设计基座（2026-10-05）
 * ---------------------------------------------------------------------------
 * 目标：把 4 张原型稿（首页 / 消息→AI 助手 / 我的 / 地块 / 农事计划 / 设备四页）
 *       变成一套可复用壳层，而不是每个页面各写一套玻璃卡。
 *
 * 设计铁律（来自项目记忆，硬约束）：
 *  - 色系只有「晨雾松 emerald × zinc」：#059669 / #34D399，禁止暖灰米色、禁止蓝紫对撞。
 *  - 「一层容器」：原型里的白卡是唯一层，内部不再套圆角容器，分区用 hairline。
 *  - 圆角阶梯：4 标签 / 8 图标图片 / 16 卡片 / 20 按钮 / 32 半模态。
 *  - 间距 8vp 基线；字阶 11 caption / 12 body3 / 14 body2 / 16 body1 / 18-20 subtitle。
 *  - 语义色一对一：ok=翠绿 / warn=琥珀 / danger=红。正常态一律中性，只有异常档染色。
 *  - 图标唯一源 `@/components/icon`，不要引 lucide 直连。
 *  - 图标与文字同行必须 `self-start`（icon.tsx 的 className 落在外层 span，
 *    flex 默认 stretch 会把图标拉满行高 → 视觉下沉一整行）。
 *  - 任何 `overflow-y-auto` 容器必须带 `data-lenis-prevent`（全站 React Lenis 接管滚轮，
 *    没标的容器 scrollTop 恒 0；createPortal 浮层不在宿主树内，要自己再声明一次）。
 */

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  IconHome,
  IconMagic,
  IconScan,
  IconUser,
  IconSearch,
  IconPlus,
  IconLeft,
  IconClose,
  IconArrowRight,
} from "@/components/icon"

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

/**
 * 品牌色 token（2026-10-05 改版：全移动端去渐变绿）。
 * 用户明确要求「不要渐变绿」→ 头部/按钮/刻度线一律实色 #059669，
 * 视觉层次改由 dc-mat 白卡 + 发丝边 + 投影承担（与 PC 同一语言）。
 * `head` 字段保留导出名兼容历史引用，值已收敛为实色。
 */
export const MOBILE_GRADIENT = {
  head: "#059669",
  headSolid: "#059669",
  /** 选中态宫格 / 强调按钮用的实色（与 #059669 同源） */
  brand: "#059669",
  brandSoft: "#D1FAE5",
  brandInk: "#047857",
} as const

export const MOBILE_RADIUS = {
  tag: "rounded", // 4
  icon: "rounded-lg", // 8
  card: "rounded-2xl", // 16
  button: "rounded-[20px]", // 20
  sheet: "rounded-3xl", // 32
} as const

/** 页面纵向节奏：所有移动端页面统一用这个 padding，避免各页各写一套 */
export const MOBILE_PAGE = "px-4 pb-28 pt-3"

/** 卡片基座：一层容器（白底 + 发丝边 + 极轻投影），不再嵌套 */
export function mobileCard(extra?: string) {
  return cn(
    "rounded-2xl bg-white dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10",
    "shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
    extra
  )
}

/** 发丝线分区（唯一允许的「内部分隔」手段） */
export function hairline(extra?: string) {
  return cn("h-px w-full bg-zinc-200/70 dark:bg-white/8", extra)
}

// ---------------------------------------------------------------------------
// 顶部绿头
// ---------------------------------------------------------------------------

/**
 * 二级页头部：返回 + 居中标题 + 右侧动作。
 * v2（2026-10-05 去渐变绿）：从「绿头白字」改为 iOS 设置页风格 ——
 * 画布色毛玻璃 + 深色文字 + 发丝底边，内容从它下面滚过（sticky）。
 * 顶部 padding 吃掉状态栏/灵动岛（env(safe-area-inset-top)，依赖根布局
 * viewport-fit=cover，缺了它这里恒为 0 → 灵动岛机型内容顶到岛后面）。
 */
export function MobileHeader({
  title,
  onBack,
  action,
  className,
}: {
  title: string
  onBack?: () => void
  action?: React.ReactNode
  className?: string
}) {
  const router = useRouter()
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center gap-2 px-2 pb-2.5",
        "pt-[max(env(safe-area-inset-top),12px)]",
        "bg-[#F4F5F6]/88 dark:bg-[#0B0B0C]/88 backdrop-blur-xl",
        className
      )}
    >
      <button
        type="button"
        aria-label="返回"
        onClick={() => (onBack ? onBack() : router.back())}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-zinc-700 shadow-[0_1px_2px_rgba(16,24,40,0.06)] active:scale-95 transition-transform dark:bg-white/10 dark:text-zinc-200"
      >
        <IconLeft className="size-5" />
      </button>
      <h1 className="flex-1 truncate text-center text-[17px] font-semibold leading-none text-zinc-900 dark:text-white">{title}</h1>
      <div className="grid size-9 shrink-0 place-items-center text-zinc-700 dark:text-zinc-200">{action}</div>
    </header>
  )
}

/** 二级页头部右侧的「+」动作 */
export function HeaderAddButton({ onClick, label = "新增" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-full text-emerald-600 dark:text-emerald-400 active:scale-95 transition-transform"
    >
      <IconPlus className="size-5" />
    </button>
  )
}

/**
 * 首页 / 我的 页的「大绿头」：内容自定义，children 自绘。
 * v3（2026-10-05 去渐变绿）：默认实色品牌绿；`background` 可注入 PC 端
 * `weather-sky.ts` 的天空渐变（天空色相是「天气语义」，不属于品牌渐变绿）。
 */
export function MobileHero({
  children,
  className,
  withCurve = true,
  background,
}: {
  children: React.ReactNode
  className?: string
  withCurve?: boolean
  /** CSS background 值；不传 = 品牌绿实色。传天空渐变时受光层仍然生效。 */
  background?: string
}) {
  return (
    <div className="relative">
      <div
        className={cn("relative overflow-hidden px-4 pb-6 pt-[max(env(safe-area-inset-top),16px)] text-white", className)}
        style={{ background: background ?? MOBILE_GRADIENT.head }}
      >
        {/* 同色相内的受光层：左上一枚光源，呼应「光从上方来」 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(120% 70% at 12% -10%, rgba(255,255,255,0.42), rgba(255,255,255,0) 62%)",
          }}
        />
        <div className="relative">{children}</div>
      </div>
      {/* 头部与内容的交界：白色内容区圆角上翻，压在绿头上（原型的形态） */}
      {withCurve && (
        <div className="relative -mt-5 h-5 rounded-t-2xl bg-[#F4F5F6] dark:bg-[#0B0B0C]" />
      )}
    </div>
  )
}

/**
 * Hero 上的玻璃读数药丸 —— 温室环境数据浮在天空渐变上。
 * 沉浸光感铁律：只给「背后有内容可透」的层上材质。这里背后是天空渐变，
 * backdrop-blur 让药丸读起来是"被天空光染透的磨砂介质"（与 PC 的 dc-mat 同一思路）。
 */
export function HeroChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-2xl border border-white/18 bg-white/12 px-3 py-2.5 backdrop-blur-md">
      <span className="flex items-center gap-1.5 text-[11px] leading-none text-white/72">
        <span className="self-center [&>svg]:size-3.5">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className="truncate text-[17px] font-semibold leading-tight tabular-nums tracking-tight">
        {value}
      </span>
    </div>
  )
}

/** 内容区底色（与 MobileHero withCurve 的上翻圆角配套） */
export const MOBILE_CANVAS = "bg-[#F4F5F6] dark:bg-[#0B0B0C]"

// ---------------------------------------------------------------------------
// 搜索框（原型每个列表页顶部都有）
// ---------------------------------------------------------------------------

export function MobileSearch({
  value,
  onChange,
  placeholder = "搜索名称",
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2.5 dark:bg-white/[0.06]",
        className
      )}
    >
      <IconSearch className="size-4 shrink-0 self-start mt-0.5 text-zinc-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14px] text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
      />
      {value && (
        <button
          type="button"
          aria-label="清空"
          onClick={() => onChange("")}
          className="grid size-4 shrink-0 place-items-center rounded-full bg-zinc-300/80 dark:bg-white/20"
        >
          <IconClose className="size-2.5 text-white dark:text-zinc-900" />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 列表行 / 分区标题 / 空态
// ---------------------------------------------------------------------------

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-2.5 mt-5 flex items-end justify-between px-0.5", className)}>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
        {/* 品牌刻度线：给每个分区一个统一的视觉锚点（实色，去渐变） */}
        <span aria-hidden className="h-3.5 w-1 rounded-full bg-emerald-500" />
        {children}
      </h2>
      {action}
    </div>
  )
}

/** 列表行：左图标（8 圆角）+ 标题 + 可选副标题/右值 + 右箭头 */
export function ListRow({
  icon,
  title,
  subtitle,
  value,
  onClick,
  chevron = true,
  tone = "neutral",
  className,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  value?: React.ReactNode
  onClick?: () => void
  chevron?: boolean
  tone?: "neutral" | "ok" | "warn" | "danger" | "brand"
  className?: string
}) {
  const toneIcon = {
    neutral: "bg-zinc-100 text-zinc-500 dark:bg-white/8 dark:text-zinc-400",
    brand: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    ok: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    warn: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    danger: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  }[tone]

  const Comp = onClick ? "button" : "div"
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "flex w-full items-center gap-3 px-3.5 py-3 text-left",
        onClick && "active:bg-zinc-50 dark:active:bg-white/5 transition-colors",
        className
      )}
    >
      {icon && (
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", toneIcon)}>{icon}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-zinc-800 dark:text-zinc-100">{title}</span>
        {subtitle && (
          <span className="mt-0.5 block truncate text-[12px] text-zinc-500 dark:text-zinc-400">{subtitle}</span>
        )}
      </span>
      {value && (
        <span className="shrink-0 text-[12px] text-zinc-400 dark:text-zinc-500 tabular-nums">{value}</span>
      )}
      {chevron && <IconArrowRight className="size-4 shrink-0 self-center text-zinc-300 dark:text-zinc-600" />}
    </Comp>
  )
}

export function EmptyHint({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      {icon && <div className="text-zinc-300 dark:text-zinc-600">{icon}</div>}
      <p className="text-[13px] text-zinc-400 dark:text-zinc-500">{text}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 小组件：开关 / 标签 / 统计格
// ---------------------------------------------------------------------------

export function MiniSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      // 🚨 不用 `disabled`：Chrome 对 disabled button 不派发鼠标事件，title 永不显示。
      // 需要「看起来禁用」就用 aria-disabled + 样式，事件仍可拦截。
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700",
        disabled && "opacity-50"
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 34 }}
        className={cn(
          "absolute top-[2px] size-[18px] rounded-full bg-white shadow-sm",
          checked ? "left-[18px]" : "left-[2px]"
        )}
      />
    </button>
  )
}

/** 4 圆角标签：状态/计数徽标 */
export function Tag({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode
  tone?: "neutral" | "brand" | "ok" | "warn" | "danger" | "solid"
  className?: string
}) {
  const tones = {
    neutral: "bg-zinc-100 text-zinc-600 dark:bg-white/8 dark:text-zinc-300",
    brand: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    warn: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    danger: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    solid: "bg-emerald-500 text-white",
  }[tone]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium leading-4",
        tones,
        className
      )}
    >
      {children}
    </span>
  )
}

/** 原型的四格指标（定位 / 温度 / 湿度 / AQI）—— 裸排 + 细分隔线，不套容器 */
export function StatStrip({
  items,
  className,
}: {
  items: { icon?: React.ReactNode; label: string; value: string }[]
  className?: string
}) {
  return (
    <div className={cn("flex items-stretch", className)}>
      {items.map((it, i) => (
        <div
          key={it.label}
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1",
            i > 0 && "border-l border-white/25"
          )}
        >
          {it.icon}
          <span className="truncate text-[15px] font-semibold leading-tight tabular-nums">{it.value}</span>
          <span className="truncate text-[11px] leading-tight text-white/75">{it.label}</span>
        </div>
      ))}
    </div>
  )
}

/** 宫格入口（首页 3×3）：图标 + 标签，命中态染品牌绿 */
export function GridEntry({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-2.5 active:scale-95 transition-transform"
    >
      <span
        className={cn(
          "grid size-[42px] place-items-center rounded-xl transition-colors",
          active
            ? "bg-emerald-500 text-white shadow-[0_6px_16px_rgba(5,150,105,0.28)]"
            : "bg-white text-emerald-600 shadow-[0_1px_2px_rgba(16,24,40,0.06)] dark:bg-white/[0.06] dark:text-emerald-400"
        )}
      >
        {icon}
      </span>
      <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// 底部导航 —— 原型 4 tab：首页 / AI 助手 / 扫一扫 / 我的
// ---------------------------------------------------------------------------

interface NavItem {
  href: string
  label: string
  Icon: any
  /** 该 tab 内还有子页时（如 /ai-assistant-ios 之外的会话），命中前缀也算选中 */
  match: string[]
}

export const MOBILE_NAV: NavItem[] = [
  { href: "/home", label: "首页", Icon: IconHome, match: ["/home"] },
  // 🚨 原型第 2 tab 是「消息」，按用户要求改造成 **AI 助手**（对话 + 诊断 + 病历），
  //    不再指向 /chat 消息中心。
  { href: "/ai-assistant-ios", label: "AI 助手", Icon: IconMagic, match: ["/ai-assistant-ios", "/assistant"] },
  { href: "/scan", label: "扫一扫", Icon: IconScan, match: ["/scan"] },
  { href: "/profile-ios", label: "我的", Icon: IconUser, match: ["/profile-ios"] },
]

export function MobileBottomNav({ position = "fixed" }: { position?: "fixed" | "sticky" }) {
  // 🚨 `usePathname()` 在 Next 的类型签名里是 `string | null`（静态导出/未匹配路由时为 null）。
  //    这里统一兜成空串，否则每次 startsWith 都要写一遍判空。
  const pathname = usePathname() ?? ""

  return (
    <div
      className={cn(
        position === "fixed" ? "fixed" : "sticky",
        "inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 pointer-events-none"
      )}
    >
      <nav className="pointer-events-auto flex w-full max-w-md items-end justify-around rounded-[24px] border border-zinc-200/70 bg-white/90 px-2 py-1.5 shadow-[0_8px_32px_rgba(16,24,40,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[#121212]/92">
        {MOBILE_NAV.map((item) => {
          const active = item.match.some((m) => pathname === m || pathname.startsWith(m + "/"))
          // 扫一扫 = 中央凸起圆钮（视觉主角）：品牌绿实色 + 受光 ring + 上浮 14px。
          // 扫码是田间作业的高频动作，值得一个「不用找」的入口。
          if (item.href === "/scan") {
            return (
              <Link key={item.href} href={item.href} className="relative -mt-7 flex flex-1 flex-col items-center">
                <span
                  className={cn(
                    "grid size-[52px] place-items-center rounded-full bg-emerald-600 text-white transition-transform active:scale-95",
                    "shadow-[0_10px_24px_rgba(5,150,105,0.38),inset_0_1px_0_rgba(255,255,255,0.35)]",
                    "ring-4 ring-[#F4F5F6] dark:ring-[#0B0B0C]"
                  )}
                >
                  <item.Icon className="size-6" />
                </span>
                <span
                  className={cn(
                    "mt-1 text-[10px] leading-3",
                    active ? "font-semibold text-emerald-700 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-[14px] py-1.5 transition-colors",
                active ? "" : "active:bg-zinc-100 dark:active:bg-white/5"
              )}
            >
              <span className="relative grid place-items-center">
                <item.Icon
                  className={cn(
                    "size-[22px] self-center transition-colors",
                    active ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"
                  )}
                />
                {/* 选中态：图标下的墨点（比整块底色轻，不把导航条切成碎块） */}
                {active && (
                  <span aria-hidden className="absolute -bottom-1 size-1 rounded-full bg-emerald-500" />
                )}
              </span>
              <span
                className={cn(
                  "text-[10px] leading-3",
                  active
                    ? "font-semibold text-emerald-700 dark:text-emerald-400"
                    : "text-zinc-400 dark:text-zinc-500"
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
