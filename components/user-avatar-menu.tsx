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
import {
  UserIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  QuestionMarkCircleIcon,
  SunIcon,
  MoonIcon,
  MapPinIcon,
  CloudIcon,
  HeartIcon,
  ArrowTopRightOnSquareIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline"
import { Activity as ActivityIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { useTheme } from "next-themes"

interface UserAvatarMenuProps {
  user?: UserPublic | null
  variant?: "default" | "pill" | "avatar"
  className?: string
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
    icon: CheckBadgeIcon,
    cls: "from-amber-400 to-orange-500 text-white",
    ringCls: "ring-amber-400/30",
    textCls: "text-amber-700 dark:text-amber-300",
  },
  pro: {
    label: "Pro",
    icon: CheckBadgeIcon,
    cls: "from-slate-700 to-slate-900 text-white",
    ringCls: "ring-slate-500/30",
    textCls: "text-slate-700 dark:text-slate-300",
  },
  free: {
    label: "免费",
    icon: SparkleMini,
    cls: "from-slate-300 to-slate-400 text-white",
    ringCls: "ring-slate-300/30",
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
  accent = "bg-slate-900 dark:bg-slate-200",
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
        "relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40",
        on ? accent : "bg-slate-300/70 dark:bg-slate-600/70"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.18)] transition-transform duration-200 ease-out",
          on ? "translate-x-[18px]" : "translate-x-[2px]"
        )}
      />
    </button>
  )
}

export function UserAvatarMenu({ user, variant = "default", className }: UserAvatarMenuProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { weatherData, loading } = useWeatherContext()
  const { isElderFriendlyMode, toggleElderFriendlyMode } = useElderFriendly()
  const { theme, setTheme } = useTheme()

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

  // 统一菜单行容器样式（Apple HIG：最小 44px 触控、充足留白）
  const itemBase =
    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer outline-none select-none transition-colors duration-150 focus:bg-foreground/[0.04] data-[highlighted]:bg-foreground/[0.04]"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "avatar" ? (
          <button
            id="user-menu-trigger"
            className={cn("focus:outline-none", className)}
          >
            <Avatar className="size-10 border-2 border-white/60 shadow-md cursor-pointer hover:border-white/80 transition-all hover:scale-105 dark:border-white/20 dark:hover:border-white/40">
              <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
              <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-900 text-white font-semibold">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
          </button>
        ) : variant === "pill" ? (
          <button
            id="user-menu-trigger"
            className={cn(
              "flex items-center gap-3 rounded-full bg-white/70 backdrop-blur-xl border border-white/60 px-3 py-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:bg-white/85 transition-colors focus:outline-none dark:bg-slate-900/45 dark:border-white/10 dark:hover:bg-slate-900/60",
              className
            )}
          >
            <Avatar className="size-9 border border-black/5 dark:border-white/10">
              <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
              <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-900 text-white font-semibold">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold text-slate-900 max-w-[140px] truncate dark:text-slate-100">
              {user.username}
            </span>
            <ChevronDownIcon className="size-4 text-slate-500 dark:text-slate-400" />
          </button>
        ) : (
          <button id="user-menu-trigger" className={cn("flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none", className)}>
            <Avatar className="size-9 border-2 border-white/20 cursor-pointer hover:border-white/40 transition-colors">
              <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
              <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-900 text-white font-semibold">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-foreground/90 font-medium hidden sm:inline">
              {user.username}
            </span>
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className={cn(
          // 精致容器：Apple 风阴影 + 模糊 + 圆角
          "w-[300px] rounded-2xl border border-border/60 bg-popover/95 backdrop-blur-xl p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35),0_8px_20px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)]",
          "text-popover-foreground"
        )}
      >
        {/* ── 用户卡片头：头像 + 名称 + 会员徽标（同行精致化）── */}
        <div className="px-3 pt-3 pb-2.5">
          <div className="flex items-start gap-3">
            <Avatar className="size-11 shrink-0 ring-2 ring-background shadow-sm">
              <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
              <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-900 text-white font-semibold text-base">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[15px] font-semibold leading-tight tracking-tight text-foreground">
                  {user.username}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full bg-gradient-to-br px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                    mem.cls
                  )}
                >
                  <mem.icon className="size-2.5" />
                  {mem.label}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground/80">{user.email}</p>
              {membership !== "free" && (
                <button
                  onClick={() => router.push("/membership")}
                  className="mt-1.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  查看会员权益
                  <ArrowTopRightOnSquareIcon className="size-3" />
                </button>
              )}
              {membership === "free" && (
                <button
                  onClick={() => router.push("/membership")}
                  className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-foreground/10 transition-colors"
                >
                  升级会员 →
                </button>
              )}
            </div>
          </div>

          {/* 天气：精致单行（替换原独立蓝色卡） */}
          {!loading && weatherData?.current && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-foreground/[0.03] px-2.5 py-1.5 text-[11px] text-muted-foreground">
              <MapPinIcon className="size-3 text-muted-foreground/70" />
              <span className="truncate max-w-[100px]">{weatherData.location?.name || "未知"}</span>
              <span className="text-muted-foreground/40">·</span>
              <CloudIcon className="size-3 text-muted-foreground/70" />
              <span className="truncate max-w-[80px]">{weatherData.current?.condition?.text || ""}</span>
              <span className="ml-auto font-semibold tabular-nums text-foreground/80">
                {weatherData.current?.temp_c?.toFixed(0)}°
              </span>
            </div>
          )}
        </div>

        <DropdownMenuSeparator className="mx-2 my-0 bg-border/60" />

        {/* ── 模式切换：精致开关 ── */}
        <div className="px-1.5 py-1.5 space-y-0.5">
          <DropdownMenuItem
            className={itemBase}
            onSelect={(e) => {
              e.preventDefault()
              toggleElderFriendlyMode()
            }}
          >
            <HeartIcon className="size-4 shrink-0 text-muted-foreground group-data-[highlighted]:text-pink-500 transition-colors" />
            <span className="flex-1 text-foreground">长辈模式</span>
            <Toggle on={isElderFriendlyMode} onChange={toggleElderFriendlyMode} accent="bg-pink-500" />
          </DropdownMenuItem>

          <DropdownMenuItem
            className={itemBase}
            onSelect={(e) => {
              e.preventDefault()
              setTheme(isDark ? "light" : "dark")
            }}
          >
            {isDark ? (
              <SunIcon className="size-4 shrink-0 text-muted-foreground group-data-[highlighted]:text-amber-500 transition-colors" />
            ) : (
              <MoonIcon className="size-4 shrink-0 text-muted-foreground group-data-[highlighted]:text-slate-500 transition-colors" />
            )}
            <span className="flex-1 text-foreground">{isDark ? "浅色模式" : "深色模式"}</span>
            <Toggle on={isDark} onChange={() => setTheme(isDark ? "light" : "dark")} />
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="mx-2 my-0 bg-border/60" />

        {/* ── 路由菜单：统一图标 + 标签 + 右箭头 ── */}
        <div className="px-1.5 py-1.5 space-y-0.5">
          <DropdownMenuItem className={itemBase} onClick={() => router.push("/profile")}>
            <UserIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-foreground">个人中心</span>
            <ChevronRightHint />
          </DropdownMenuItem>
          <DropdownMenuItem className={itemBase} onClick={() => router.push("/activity")}>
            <ActivityIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-foreground">活动动态</span>
            <ChevronRightHint />
          </DropdownMenuItem>
          <DropdownMenuItem className={itemBase} onClick={() => router.push("/settings")}>
            <Cog6ToothIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-foreground">个人设置</span>
            <ChevronRightHint />
          </DropdownMenuItem>
          <DropdownMenuItem className={itemBase} onClick={() => router.push("/my-mcp")}>
            <MyMcpIcon />
            <span className="flex-1 text-foreground">我的 MCP</span>
            <ChevronRightHint />
          </DropdownMenuItem>
          <DropdownMenuItem className={itemBase} onClick={() => router.push("/help")}>
            <QuestionMarkCircleIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-foreground">帮助中心</span>
            <ChevronRightHint />
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="mx-2 my-0 bg-border/60" />

        {/* ── 登出：温和暗红色，与正常行同高 ── */}
        <div className="px-1.5 py-1.5">
          <DropdownMenuItem
            className={cn(
              itemBase,
              "text-muted-foreground hover:text-red-500 data-[highlighted]:text-red-500 focus:text-red-500"
            )}
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <ArrowRightOnRectangleIcon className="size-4 shrink-0" />
            <span className="flex-1">{isLoggingOut ? "登出中…" : "登出"}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// 菜单右端的极淡右箭头指示（路由型菜单）
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

// 我的 MCP 图标（与原 SVG 保持一致，作为独立组件便于上色）
function MyMcpIcon() {
  return (
    <svg
      className="size-4 shrink-0 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}