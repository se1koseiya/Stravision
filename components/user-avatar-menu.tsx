"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserPublic } from "@/lib/db/user-service"
import { useRouter } from "next/navigation"
import { createContext, useContext, useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { useTheme } from "next-themes"
import { toast } from "@/lib/ui/feedback"
import { DESKTOP_CAPABILITIES, IS_DESKTOP_APP } from "@/lib/desktop-mode"
import {
  isDesktopNotifyEnabled,
  setDesktopNotifyEnabled,
  onDesktopNotifyChange,
  notifyDesktop,
} from "@/lib/desktop-notify"
import {
  IconCertificate,
  IconCloudy,
  IconDown,
  IconHeart,
  IconHelp,
  IconHistory,
  IconLocalPin,
  IconLogout,
  IconMoon,
  IconRemind,
  IconRemindDisable,
  IconSetting,
  IconSun,
  IconUser,
} from "@/components/icon"
import { openSettings } from "@/components/settings/global-settings-host"

interface UserAvatarMenuProps {
  user?: UserPublic | null
  variant?: "default" | "pill" | "avatar"
  className?: string
  /**
   * 只留头像、不显示用户名。
   * 桌面端顶栏要同时塞下导航、菜单与 − □ ✕，1440 下右侧只有 294px，
   * 用户名一挤就竖排换行（实测 22×60 的「莓/小/智」三行）—— 桌面端由 PageHeader 传 true。
   */
  hideName?: boolean
}

/**
 * 获取用户名首字母作为头像 fallback
 */
function getInitials(username: string): string {
  if (!username) return "U"
  if (/[\u4e00-\u9fa5]/.test(username)) {
    return username.charAt(0)
  }
  const parts = username.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
  }
  return username.charAt(0).toUpperCase()
}

// 会员徽标配色（克制高级感，单一色调 + 微渐变，避免彩虹）
const membershipStyle = {
  plus: {
    label: "Plus",
    icon: IconCertificate,
    cls: "from-amber-400 to-orange-500 text-white",
    ringCls: "ring-amber-400/30",
    textCls: "text-amber-700 dark:text-amber-300",
  },
  pro: {
    label: "Pro",
    icon: IconCertificate,
    cls: "from-zinc-700 to-zinc-900 text-white",
    ringCls: "ring-zinc-500/30",
    textCls: "text-zinc-700 dark:text-zinc-300",
  },
  free: {
    label: "免费",
    icon: SparkleMini,
    cls: "from-zinc-300 to-zinc-400 text-white",
    ringCls: "ring-zinc-300/30",
    textCls: "text-muted-foreground",
  },
} as const

function SparkleMini(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2z" />
    </svg>
  )
}

// iOS 风格小开关
function Toggle({
  on,
  onChange,
  /**
   * 「开」态底色。默认 = **品牌绿**（bg-br-brand 走 --br-brand：浅色 #059669 / 深色 #34D399，
   * 两态自动适配，不需要 dark: 变体）。
   */
  accent = "bg-br-brand shadow-[0_2px_8px_-2px_rgba(0,148,86,0.55)] dark:shadow-[0_2px_10px_-2px_rgba(52,199,123,0.60)]",
}: {
  on: boolean
  onChange: () => void
  accent?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={(e) => {
        e.preventDefault()
        onChange()
      }}
      className={cn(
        "relative inline-flex h-5 w-[34px] shrink-0 items-center rounded-full transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40",
        /* 「关」态保持中性 —— 未开启就不该有强调色；半透明叠加会与背后的玻璃面板合成，
           白色滑块要靠这层灰做承托，改成更淡的叠加会让滑块糊掉。 */
        on ? accent : "bg-zinc-300/70 dark:bg-zinc-600/70"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-200 ease-out",
          on ? "translate-x-[16px]" : "translate-x-[2px]"
        )}
      />
    </button>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * 菜单行高亮：滑动式（framer-motion layoutId）
 *
 * 21st.dev 版 UserProfileDropdown 的核心交互 —— 悬停时那块淡底不是"淡入淡出"，
 * 而是**一块**高亮从上一行滑到当前行（layoutId 共享布局动画）。
 *
 * ⚠️ 三个实现要点，改动前先读：
 *  1. 高亮是 `absolute inset-0 -z-10` → 必须让 item 自己 `isolate` 建层叠上下文，
 *     否则 -z-10 会跑到 DropdownMenuContent 的背景之后 → 高亮完全不可见。
 *  2. 高亮层**只画淡底**（bg-foreground/[0.05]），不画 border/shadow —— 与 .dc-mat
 *     玻璃材质叠加时，描边会显出"两个方块套在一起"。
 *  3. 既然有这块自绘高亮，item 上就不能再留 `data-[highlighted]:bg-*`
 *     （Radix 键盘导航也会触发 highlighted）→ 否则鼠标 + 键盘会同时亮两块。
 * ──────────────────────────────────────────────────────────────────────────── */
const MenuHighlightContext = createContext<{
  activeId: string | null
  setActiveId: (id: string | null) => void
}>({ activeId: null, setActiveId: () => {} })

const HIGHLIGHT_LAYOUT_ID = "user-menu-highlight"

function MenuRow({
  rowId,
  destructive,
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuItem> & {
  /** 高亮动画的共享 id，必填且在同一次渲染里唯一 */
  rowId: string
  /** 破坏性操作（登出等）：高亮与文字都走语义红 */
  destructive?: boolean
}) {
  const { activeId, setActiveId } = useContext(MenuHighlightContext)
  const isActive = activeId === rowId

  return (
    <DropdownMenuItem
      {...props}
      onPointerEnter={(e) => {
        props.onPointerEnter?.(e)
        setActiveId(rowId)
      }}
      onPointerLeave={(e) => {
        props.onPointerLeave?.(e)
        setActiveId(null)
      }}
      onFocus={(e) => {
        props.onFocus?.(e)
        setActiveId(rowId)
      }}
      onBlur={(e) => {
        props.onBlur?.(e)
        setActiveId(null)
      }}
      className={cn(
        /* dc-ctrl--press = HDS 按压弹性 + 按压点光源（::after 光晕），它自带 position: relative；
           isolate = 给 -z-10 的高亮层建层叠上下文（见上方要点 1）。 */
        "dc-ctrl--press group relative isolate flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none",
        destructive &&
          "text-muted-foreground data-[highlighted]:text-red-500",
        className
      )}
    >
      <AnimatePresence initial={false}>
        {isActive && (
          <motion.span
            layoutId={HIGHLIGHT_LAYOUT_ID}
            className={cn(
              "pointer-events-none absolute inset-0 -z-10 rounded-xl",
              destructive ? "bg-red-500/10" : "bg-foreground/[0.05]"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              layout: { type: "spring", stiffness: 480, damping: 38 },
              opacity: { duration: 0.12 },
            }}
          />
        )}
      </AnimatePresence>
      {children}
    </DropdownMenuItem>
  )
}

/** 菜单右端的极淡右箭头指示（路由型菜单） */
function ChevronRightHint() {
  return (
    <svg
      className="size-3.5 shrink-0 text-muted-foreground/40 transition-transform group-data-[highlighted]:translate-x-0.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
    </svg>
  )
}

/** 快捷操作宫格里的单个格子（图标在上、文字在下） */
function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-16 flex-col items-center justify-center gap-1.5 rounded-xl bg-foreground/[0.04] text-muted-foreground ring-1 ring-inset ring-black/[0.04] transition-colors duration-150 hover:bg-foreground/[0.07] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:bg-white/[0.05] dark:ring-white/[0.06] dark:hover:bg-white/[0.09]"
    >
      <Icon className="size-5 transition-transform duration-150 group-hover:-translate-y-px" />
      <span className="text-[11px] font-medium leading-none tracking-tight">{label}</span>
    </button>
  )
}

/**
 * 顶栏账号菜单（全局唯一入口）。
 *
 * 结构参照 21st.dev `UserProfileDropdown` 三段式，但全部落到本项目设计语言：
 *   ① 用户卡头（头像 / 用户名 / 会员徽标 / 邮箱 / 天气）
 *   ② 快捷操作宫格（3 列：个人中心 · 活动动态 · 设置）
 *   ③ 开关组（长辈模式 / 深色模式 / 桌面通知）→ 更多（帮助中心 / 本地服务配置）→ 登出
 *
 * 2026-10-22 整理（用户要求）：
 *   - 「个人设置」删掉 —— /settings 独立页早已并入统一设置弹窗的「个人资料」分区，
 *     与下面的「设置」入口指向同一个弹窗，两行并存纯属冗余。
 *   - 「偏好设置」→ 改名「设置」，并上提到快捷操作宫格（它是最高频的入口）。
 *   - 「我的 MCP」删掉 —— 那是 AI 助手侧的能力配置，不属于全局账号菜单。
 *     /my-mcp 路由保留，入口仍在 AI 助手侧栏（top-nav-links / capsule-navigation）。
 */
export function UserAvatarMenu({ user, variant = "default", className, hideName = false }: UserAvatarMenuProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  /**
   * 菜单开合受控。
   * 🚨 原因：打开设置弹窗的菜单项在 `onSelect` 里调了 `e.preventDefault()`
   *    （阻止 Radix 把菜单默认关掉 / 抢回焦点），副作用是**菜单会一直浮在设置弹窗上方**，
   *    挡住弹窗右上角的关闭按钮。改成受控后：开设置前先 `setMenuOpen(false)`，
   *    两个世界互不干扰。
   */
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const { weatherData, loading } = useWeatherContext()
  const { isElderFriendlyMode, toggleElderFriendlyMode } = useElderFriendly()
  const { theme, setTheme } = useTheme()

  // 桌面端原生通知开关。localStorage 只能在 effect 里读，否则 SSR/CSR 首帧不一致
  const [notifyOn, setNotifyOn] = useState(true)
  useEffect(() => {
    if (!IS_DESKTOP_APP) return
    setNotifyOn(isDesktopNotifyEnabled())
    return onDesktopNotifyChange(() => setNotifyOn(isDesktopNotifyEnabled()))
  }, [])

  const toggleNotify = () => {
    const next = !notifyOn
    setDesktopNotifyEnabled(next)
    setNotifyOn(next)
    // 开启时立刻发一条，让用户马上确认系统通知确实能弹出来
    if (next) {
      notifyDesktop({
        title: "桌面通知已开启",
        body: "AI 任务跑完时（窗口不在前台）会在这里提醒你。",
        level: "info",
        force: true,
      })
    }
  }

  if (!user) return null

  const membership = (user.membership || "free") as keyof typeof membershipStyle
  const mem = membershipStyle[membership]
  const isDark = theme === "dark"

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" })
      window.location.href = "/login"
    } catch (error) {
      console.error("登出请求发送失败:", error)
      window.location.href = "/login"
    }
  }

  /** 打开统一设置弹窗：先收菜单（否则菜单浮在弹窗之上挡住关闭按钮） */
  const goto = (path: string) => {
    setMenuOpen(false)
    router.push(path)
  }
  const openSettingsSection = (section: "appearance") => {
    setMenuOpen(false)
    openSettings(section)
  }

  return (
    <DropdownMenu
      open={menuOpen}
      onOpenChange={(next) => {
        setMenuOpen(next)
        if (!next) setActiveId(null)
      }}
    >
      <DropdownMenuTrigger asChild>
        {variant === "avatar" ? (
          <button id="user-menu-trigger" className={cn("focus:outline-none", className)}>
            <Avatar className="size-10 cursor-pointer border-2 border-white/60 shadow-sm transition-all hover:scale-105 hover:border-white/80 dark:border-white/20 dark:hover:border-white/40">
              <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
              <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-900 font-semibold text-white">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
          </button>
        ) : variant === "pill" ? (
          <button
            id="user-menu-trigger"
            className={cn(
              /* 与主导航胶囊（components/page-navigation.tsx）同一档：HDS THICK + 按压。
                 两处是同一视觉语言的"顶栏悬浮件"，必须同档，否则一深一浅会显得没设计。 */
              "dc-mat dc-mat--thick dc-ctrl--press flex items-center gap-3 rounded-full px-3 py-1.5 focus:outline-none",
              className
            )}
          >
            <Avatar className="size-9 border border-black/5 dark:border-white/10">
              <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
              <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-900 font-semibold text-white">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[140px] truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {user.username}
            </span>
            <IconDown className="size-4 text-zinc-500 dark:text-zinc-400" />
          </button>
        ) : (
          <button
            id="user-menu-trigger"
            className={cn(
              "flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80 focus:outline-none",
              className
            )}
          >
            <Avatar className="size-9 cursor-pointer border-2 border-white/20 transition-colors hover:border-white/40">
              <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
              <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-900 font-semibold text-white">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
            {!hideName && (
              <span className="hidden whitespace-nowrap text-sm font-medium text-foreground/90 sm:inline">
                {user.username}
              </span>
            )}
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className={cn(
          /* 沉浸光感材质 —— HDS ULTRA 档（弹层/菜单：压在整页之上，模糊最重、底最实）。
             ⚠️ Radix 的菜单是 portal 到 body 的，**只能**消费全局注入的材质
                （components/device/material-css.ts 的 .dc-mat，已在 app/layout.tsx 注入）。
                不要写 bg-popover/95 + backdrop-blur-xl：那是"自造材质"，95% 不透明的实底
                会把背后的色光全冲淡，等于一块白板 + 一点模糊。 */
          "dc-mat dc-mat--ultra w-[328px] rounded-[20px] p-2 text-popover-foreground"
        )}
      >
        <MenuHighlightContext.Provider value={{ activeId, setActiveId }}>
          {/* ── ① 用户卡头 ── */}
          <div className="px-2.5 pb-3 pt-3.5">
            <div className="flex items-start gap-3">
              <Avatar className="size-12 shrink-0 shadow-sm ring-2 ring-background">
                <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-900 text-[15px] font-semibold text-white">
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 pt-0.5">
                {/* 「徽标 + 文字」同行：文字可 truncate，但**不能**给父级 truncate，
                    否则徽标会被一起裁掉（见铁律：同行禁 truncate） */}
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[14px] font-semibold leading-tight tracking-tight text-foreground">
                    {user.username}
                  </span>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-0.5 rounded-full bg-gradient-to-br px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                      mem.cls
                    )}
                  >
                    <mem.icon className="size-2.5" />
                    {mem.label}
                  </span>
                </div>
                {/* 邮箱与「会员权益」并成一行 —— 原来会员入口单独占行，
                    头部三行文字挤在 44px 头像旁边，观感很闷。 */}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <p className="min-w-0 truncate text-[11.5px] leading-none text-muted-foreground/80">
                    {user.email}
                  </p>
                  {/* 桌面端为本地买断式运行，无计费通道 —— 隐藏会员权益/升级入口 */}
                  {DESKTOP_CAPABILITIES.payment && membership !== "free" && (
                    <button
                      onClick={() => goto("/membership")}
                      className="ml-auto shrink-0 whitespace-nowrap text-[11px] font-medium leading-none text-muted-foreground/75 transition-colors hover:text-foreground"
                    >
                      会员权益 ›
                    </button>
                  )}
                </div>
                {DESKTOP_CAPABILITIES.payment && membership === "free" && (
                  <button
                    onClick={() => goto("/membership")}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-foreground/[0.06] px-2 py-1 text-[11px] font-medium leading-none text-foreground transition-colors hover:bg-foreground/10"
                  >
                    升级会员 →
                  </button>
                )}
              </div>
            </div>

            {/* 天气：精致单行（替换原独立蓝色卡） */}
            {!loading && weatherData?.current && (
              <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-foreground/[0.04] px-3 py-2 text-[11px] text-muted-foreground ring-1 ring-inset ring-black/[0.04] dark:bg-white/[0.05] dark:ring-white/[0.06]">
                <IconLocalPin className="size-3 text-muted-foreground/70" />
                <span className="max-w-[100px] truncate">{weatherData.location?.name || "未知"}</span>
                <span className="text-muted-foreground/40">·</span>
                <IconCloudy className="size-3 text-muted-foreground/70" />
                <span className="max-w-[80px] truncate">{weatherData.current?.condition?.text || ""}</span>
                <span className="ml-auto font-semibold tabular-nums text-foreground/80">
                  {weatherData.current?.temp_c?.toFixed(0)}°
                </span>
              </div>
            )}
          </div>

          {/* ── ② 快捷操作宫格（3 列，图标上 / 文字下）── */}
          <div className="grid grid-cols-3 gap-1.5 px-1">
            <QuickAction icon={IconUser} label="个人中心" onClick={() => goto("/profile")} />
            <QuickAction icon={IconHistory} label="活动动态" onClick={() => goto("/activity")} />
            <QuickAction
              icon={IconSetting}
              label="设置"
              onClick={() => openSettingsSection("appearance")}
            />
          </div>

          {/* 宫格本身已是「三块实心卡」，与下方开关组之间不再加分隔线 ——
              原来这里还有一条 hairline，短面板里连着出现三道线，全是横杠。 */}
          {/* ── ③ 开关组：点完不收起菜单，方便连着改 ── */}
          <div className="mt-3 space-y-0.5 px-1">
            <MenuRow
              rowId="elder"
              onSelect={(e) => {
                e.preventDefault()
                toggleElderFriendlyMode()
              }}
            >
              <IconHeart className="size-4 shrink-0 text-muted-foreground transition-colors group-data-[highlighted]:text-pink-500" />
              <span className="flex-1 text-foreground">长辈模式</span>
              {/* 全站约定「唯一强调色 = 品牌绿」：与深色模式开关同档，都用 Toggle 默认值。
                  ⛔ 别再单独传 accent="bg-pink-500"（同一面板两套强调色 = 配色不统一） */}
              <Toggle on={isElderFriendlyMode} onChange={toggleElderFriendlyMode} />
            </MenuRow>

            <MenuRow
              rowId="theme"
              onSelect={(e) => {
                e.preventDefault()
                setTheme(isDark ? "light" : "dark")
              }}
            >
              {isDark ? (
                <IconSun className="size-4 shrink-0 text-muted-foreground transition-colors group-data-[highlighted]:text-amber-500" />
              ) : (
                <IconMoon className="size-4 shrink-0 text-muted-foreground transition-colors group-data-[highlighted]:text-zinc-500" />
              )}
              <span className="flex-1 text-foreground">{isDark ? "浅色模式" : "深色模式"}</span>
              <Toggle on={isDark} onChange={() => setTheme(isDark ? "light" : "dark")} />
            </MenuRow>

            {/* 桌面端专属：AI 任务跑完时弹系统通知（窗口不在前台时才弹） */}
            {IS_DESKTOP_APP && (
              <MenuRow
                rowId="notify"
                onSelect={(event) => {
                  event.preventDefault()
                  toggleNotify()
                }}
              >
                {notifyOn ? (
                  <IconRemind className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <IconRemindDisable className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1 text-foreground">桌面通知</span>
                {/* 这里用 16×28 的迷你开关（比重型 Toggle 轻），避免三行里出现两种尺寸 */}
                <span
                  className={cn(
                    "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-200",
                    notifyOn ? "bg-br-brand" : "bg-foreground/15"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block size-3 rounded-full bg-white shadow-sm transition-transform duration-200",
                      notifyOn ? "translate-x-3.5" : "translate-x-0.5"
                    )}
                  />
                </span>
              </MenuRow>
            )}
          </div>

          <DropdownMenuSeparator className="mx-2.5 my-2 bg-border/50" />

          {/* ── ④ 更多 ── */}
          <div className="space-y-0.5 px-1">
            <MenuRow rowId="help" onSelect={() => goto("/help")}>
              <IconHelp className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-foreground">帮助中心</span>
              <ChevronRightHint />
            </MenuRow>

            {/* 桌面端专属：本地服务（AI / MQTT / 密钥与环境变量）由原生向导配置 */}
            {IS_DESKTOP_APP && (
              <MenuRow
                rowId="desktop-setup"
                onSelect={() => {
                  const api = window.stravisionDesktop
                  if (!api?.openSetup) {
                    // 桥缺失 = preload 没注入成功，明确告知而不是无声失败
                    toast.error("桌面桥未就绪（window.stravisionDesktop 不可用），请重启应用后重试")
                    return
                  }
                  Promise.resolve(api.openSetup())
                    .then((res) => {
                      if (res && res.ok === false) {
                        toast.error(`无法打开本地服务配置：${res.error ?? "未知错误"}`)
                      }
                    })
                    .catch((err) => {
                      toast.error(`无法打开本地服务配置：${err?.message ?? String(err)}`)
                    })
                }}
              >
                <IconCloudy className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-foreground">本地服务配置</span>
                <ChevronRightHint />
              </MenuRow>
            )}
          </div>

          <DropdownMenuSeparator className="mx-2.5 my-2 bg-border/50" />

          {/* ── ⑤ 登出：语义红，与正常行同高 ── */}
          <div className="px-1 pb-0.5">
            <MenuRow
              rowId="logout"
              destructive
              onSelect={handleLogout}
              disabled={isLoggingOut}
              className="data-[highlighted]:text-red-500"
            >
              <IconLogout className="size-4 shrink-0" />
              <span className="flex-1">{isLoggingOut ? "登出中…" : "登出"}</span>
            </MenuRow>
          </div>
        </MenuHighlightContext.Provider>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
