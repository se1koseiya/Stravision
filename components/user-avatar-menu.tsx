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
import { UserIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon, ChevronDownIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"

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
      <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-popover-foreground">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.username}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
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
