"use client"

import { usePathname } from "next/navigation"
import { MobilePwaPrompt } from "@/components/mobile-pwa-prompt"
import { MobileBottomNav } from "@/components/mobile/mobile-shell"

/**
 * 移动端根布局（2026-10-05 原型重写）
 *
 * 底部导航统一由 `components/mobile/mobile-shell.tsx` 的 `MobileBottomNav` 提供，
 * 4 个 tab：首页 / AI 助手 / 扫一扫 / 我的。
 *
 * 🚨 旧版 `components/mobile-bottom-nav.tsx`（5 tab、玻璃药丸、「消息」指向 /chat）
 *    已被本布局取代：原型第 2 tab 是「消息」，按需求改造成 **AI 助手**。
 *    旧文件暂留（仅供历史引用），不要再挂载。
 */

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  // 🚨 usePathname() 类型是 `string | null`，兜成空串再 startsWith
  const pathname = usePathname() ?? ""

  /**
   * AI 助手是沉浸式对话页：自带顶部栏与底部输入区，
   * 再叠一层浮动 tab bar 会压住输入框，所以整页隐藏。
   * 其余页面（含二级页：地块 / 计划 / 设备 / 扫一扫）都保留 tab bar。
   */
  const immersive = pathname.startsWith("/ai-assistant-ios")

  return (
    <>
      {children}
      {!immersive && <MobileBottomNav />}
      <MobilePwaPrompt />
    </>
  )
}
