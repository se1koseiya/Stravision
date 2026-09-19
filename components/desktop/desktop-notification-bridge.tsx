"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { IS_DESKTOP_APP } from "@/lib/desktop-mode"
import { onDesktopNotificationActivate } from "@/lib/desktop-notify"

/**
 * 桌面端桥接组件（无 UI）。
 *
 * 只做一件事：用户点击原生系统通知后，主进程已经把窗口还原并聚焦，
 * 这里负责把页面导航到通知携带的路由。
 *
 * 为什么放在根布局：这条监听必须**全局常驻**。
 * 通知只在窗口不在前台时弹，用户点它的时候很可能已经不在发通知的那个页面
 * （那个页面的组件早卸载了），页面级监听收不到事件。
 */
export function DesktopNotificationBridge() {
  const router = useRouter()

  useEffect(() => {
    if (!IS_DESKTOP_APP) return
    onDesktopNotificationActivate(({ route }) => {
      if (!route) return
      router.push(route)
    })
  }, [router])

  return null
}
