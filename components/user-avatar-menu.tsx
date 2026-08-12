"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserPublic } from "@/lib/db/user-service"
import { UserIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon, ChevronDownIcon, QuestionMarkCircleIcon, SunIcon, MoonIcon } from "@heroicons/react/24/outline"
import { Activity as ActivityIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { useTheme } from "next-themes"
import { MapPinIcon, CloudIcon, HeartIcon } from "@heroicons/react/24/solid"
import { Crown, Sparkles } from "lucide-react"

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

  // 如果是中文名,取第一个字
  if (/[\u4e00-\u9fa5]/.test(username)) {
    return username.charAt(0)
  }

  // 如果是英文名,取首字母
  const parts = username.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
  }

  return username.charAt(0).toUpperCase()
}

export function UserAvatarMenu({ user, variant = "default", className }: UserAvatarMenuProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { weatherData, loading } = useWeatherContext()
  const { isElderFriendlyMode, toggleElderFriendlyMode } = useElderFriendly()
  const { theme, setTheme } = useTheme()

  if (!user) return null

  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    
    try {
      // 先等待请求完成，再跳转，确保 cookie 已被服务端清除指令覆盖
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store"
      })
      
      // 强制刷新并跳转到登录页，清除客户端缓存
      window.location.href = "/login"
    } catch (error) {
      console.error("登出请求发送失败:", error)
      // 即使失败也强制跳转
      window.location.href = "/login"
    } finally {
      // 不需要 setIsLoggingOut(false) 因为页面会跳转
    }
  }

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
              <AvatarFallback className="bg-green-500 text-white font-semibold">
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
              <AvatarFallback className="bg-green-500 text-white font-semibold">
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
              <AvatarFallback className="bg-green-500 text-white font-semibold">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-foreground/90 font-medium hidden sm:inline">
              {user.username}
            </span>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 bg-popover border-border text-popover-foreground">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.username}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        
        {/* 会员卡片 */}
        <div className={cn(
          "mx-1 my-1.5 rounded-xl p-3 relative overflow-hidden",
          user.membership === 'plus'
            ? "bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800"
            : user.membership === 'pro'
            ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
            : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
        )}>
          {/* 背景装饰 */}
          {user.membership && user.membership !== 'free' && (
            <div className="absolute -right-2 -top-2 size-12 opacity-20">
              {user.membership === 'plus' ? (
                <Crown className="size-full text-violet-600 dark:text-violet-400" />
              ) : (
                <Sparkles className="size-full text-blue-600 dark:text-blue-400" />
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {user.membership === 'plus' ? (
                <Crown className="size-5 text-violet-600 dark:text-violet-400" />
              ) : user.membership === 'pro' ? (
                <Sparkles className="size-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <UserIcon className="size-5 text-slate-500 dark:text-slate-400" />
              )}
              <span className={cn(
                "text-sm font-semibold",
                user.membership === 'plus' 
                  ? "text-violet-700 dark:text-violet-300"
                  : user.membership === 'pro'
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-slate-600 dark:text-slate-400"
              )}>
                {user.membership === 'plus' ? 'Plus会员' : user.membership === 'pro' ? 'Pro会员' : '免费用户'}
              </span>
            </div>
            {user.membership === 'free' && (
              <button
                onClick={() => router.push('/membership')}
                className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                升级
              </button>
            )}
          </div>
          
          {/* 会员权益提示 */}
          {user.membership && user.membership !== 'free' && (
            <div className="mt-2 text-xs opacity-70">
              {user.membership === 'plus' ? '解锁高级AI助手 · 专属数据报告' : '解锁全部功能 · 优先技术支持'}
            </div>
          )}
        </div>
        
        {/* 天气信息 */}
        {!loading && weatherData && (
          <div className="px-2 py-2 mx-1 my-1 rounded-lg bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-100/50 dark:border-blue-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="size-3.5 text-blue-500 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300 truncate max-w-[100px]">
                  {weatherData.location?.name || '未知'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {weatherData.current?.condition?.icon && (
                  <img 
                    src={weatherData.current.condition.icon} 
                    alt={weatherData.current.condition.text}
                    className="size-5"
                  />
                )}
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  {weatherData.current?.temp_c?.toFixed(0)}°
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-blue-600/70 dark:text-blue-400/70">
              <CloudIcon className="size-3" />
              <span className="truncate">{weatherData.current?.condition?.text || '未知天气'}</span>
            </div>
          </div>
        )}
        
        <DropdownMenuSeparator className="bg-border" />
        
        {/* 长辈模式切换 */}
        <DropdownMenuItem
          className="cursor-pointer focus:bg-green-50 focus:text-green-900 dark:focus:bg-green-900/20 dark:focus:text-green-100"
          onClick={toggleElderFriendlyMode}
        >
          <HeartIcon className={cn("mr-2 size-4", isElderFriendlyMode ? "text-pink-500" : "")} />
          <span className="flex items-center gap-2">
            长辈模式
            {isElderFriendlyMode && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">已开启</span>
            )}
          </span>
        </DropdownMenuItem>
        
        {/* 深浅色切换 */}
        <DropdownMenuItem
          className="cursor-pointer focus:bg-green-50 focus:text-green-900 dark:focus:bg-green-900/20 dark:focus:text-green-100"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <SunIcon className="mr-2 size-4" />
          ) : (
            <MoonIcon className="mr-2 size-4" />
          )}
          <span>{theme === "dark" ? "浅色模式" : "深色模式"}</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          className="cursor-pointer focus:bg-green-50 focus:text-green-900 dark:focus:bg-green-900/20 dark:focus:text-green-100"
          onClick={() => router.push("/profile")}
        >
          <UserIcon className="mr-2 size-4" />
          <span>个人中心</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer focus:bg-green-50 focus:text-green-900 dark:focus:bg-green-900/20 dark:focus:text-green-100"
          onClick={() => router.push("/activity")}
        >
          <ActivityIcon className="mr-2 size-4" />
          <span>活动动态</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer focus:bg-green-50 focus:text-green-900 dark:focus:bg-green-900/20 dark:focus:text-green-100"
          onClick={() => router.push("/settings")}
        >
          <Cog6ToothIcon className="mr-2 size-4" />
          <span>个人设置</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer focus:bg-green-50 focus:text-green-900 dark:focus:bg-green-900/20 dark:focus:text-green-100"
          onClick={() => router.push("/my-mcp")}
        >
          <svg className="mr-2 size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>我的 MCP</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer focus:bg-green-50 focus:text-green-900 dark:focus:bg-green-900/20 dark:focus:text-green-100"
          onClick={() => router.push("/help")}
        >
          <QuestionMarkCircleIcon className="mr-2 size-4" />
          <span>帮助中心</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-red-500 focus:text-red-500"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <ArrowRightOnRectangleIcon className="mr-2 size-4" />
          <span>{isLoggingOut ? "登出中..." : "登出"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
