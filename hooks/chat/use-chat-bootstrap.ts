"use client"

import { useEffect, useState } from "react"
import type { UserPublic } from "@/lib/db/user-service"

/**
 * 当前登录用户 + 移动端判断
 *
 * 直接调用 /api/auth/me 拿到完整 UserPublic（PageHeader 等组件需要
 * membership/permissions 等字段），不经过 chatClient。
 */
export function useChatBootstrap() {
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data?.user) setCurrentUser(data.user as UserPublic)
      })
      .catch(() => {
        // 静默忽略：未登录或网络错误
      })

    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return { currentUser, isMobile }
}
