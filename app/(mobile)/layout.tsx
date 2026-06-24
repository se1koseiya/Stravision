"use client"

import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { MobilePwaPrompt } from "@/components/mobile-pwa-prompt"
import { usePathname } from "next/navigation"

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // 在AI助手页面隐藏底部导航栏，提供沉浸式聊天体验
  const hideBottomNav = pathname === "/ai-assistant-ios"
  
  return (
    <>
      {children}
      {!hideBottomNav && <MobileBottomNav />}
      <MobilePwaPrompt />
    </>
  )
}
