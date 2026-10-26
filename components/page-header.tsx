"use client"

import Image from "next/image"
import { useEffect } from "react"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import {
  DESKTOP_DRAG,
  DESKTOP_NO_DRAG,
  DesktopWindowControls,
  DesktopWindowMenu,
  useDesktopHeaderHost,
} from "@/components/desktop/desktop-window-chrome"
import { IS_DESKTOP_APP } from "@/lib/desktop-mode"
import { cn } from "@/lib/utils"
import type { UserPublic } from "@/lib/db/user-service"

interface PageHeaderProps {
  user?: UserPublic | null
  children?: React.ReactNode // 右侧额外元素
  className?: string
}

/**
 * 全站顶栏（单一来源）。
 *
 * 🖥️ 桌面端：主窗口是无边框的（见 desktop/main.js 的 openMainWindow），
 * 所以这一条顶栏**同时承担标题栏职责** ——
 *   - 整条声明 `-webkit-app-region: drag` 作为窗口拖拽区；
 *     内部可交互的部分（导航、右侧元素、菜单、窗口控制键）逐个声明 no-drag，
 *     否则它们会被拖拽区吞掉，表现为"看得见点不动"；
 *   - 左侧内联「编辑 / 窗口 / 帮助 / 关于」（原来挂在 Electron 默认菜单上，
 *     主进程已用 Menu.setApplicationMenu(null) 摘掉）；
 *   - 最右侧内联 − □ ✕，取代原生标题栏的窗口按钮。
 * 浏览器部署下这些一律不渲染，顶栏结构与改动前完全一致。
 *
 * ── 2026-10-23 两次返工的结论（别再走回头路）──
 *   ① **不要**给顶栏铺一层"窗框表面"（模糊 + 受光边 + 下投影）：用户原话「而不是做这个窗框」。
 *   ② **不要**把工具拆成顶栏上面的独立一行：做过一版 24px 工具行，实测那条带子贴在
 *      窗口最上沿、12px 灰字悬空，用户判定「好丑的顶部」；而同期的 monitor 页
 *      （单行：logo + 导航 + 控制键）反而被认可。所以最终回到**单行 72px**，
 *      靠「分隔件 + 间距」区分三组（HDS 规则②：层级不同才拉开距离，同级之间收紧）：
 *         品牌 ─ 菜单   │   导航（居中）   │   页面按钮 ┊ 竖线 ┊ − □ ✕
 *   菜单 = 12px 次级字色；导航 = 唯一视觉重心；窗口键用 1px 竖线隔开 —— 三组各归各位。
 */
export function PageHeader({ 
  user, 
  children,
  className 
}: PageHeaderProps) {
  // 告诉全局兜底层"这一页有自绘顶栏"，避免登录页那套顶部控制键在这里重复渲染
  useDesktopHeaderHost()

  const desktop = IS_DESKTOP_APP

  /* 顶栏高度对外暴露成变量：页面栅格用 var(--header-h, 72px) 取，
     不要在页面里再写死数字（agent 页、看板页、设备控制页都吃过这个亏）。 */
  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.style.setProperty("--header-h", "72px")
  }, [])

  return (
    <div
      className={cn(
        "relative flex h-[72px] w-full items-center justify-between gap-2 px-4 md:px-8",
        "bg-transparent z-20",
        className
      )}
      style={desktop ? DESKTOP_DRAG : undefined}
    >
      {/* 顶部悬浮 = Ultra_Thin + 渐变蒙层（HDS 场景规范第一条：组件在顶部悬浮时用
          ULTRA_THIN，结合渐变颜色蒙层「延展顶部内容展示空间」）。
          它是一层**雾**，不是一条带子：没有投影、没有受光边，靠 mask 向下化开。
          ⚠️ 只做雾，不要再给它加边框/底色 —— 加过一次「窗框」，用户当场否掉。 */}
      {desktop && (
        <div
          aria-hidden
          className="dc-mat--ultra-thin pointer-events-none absolute inset-x-0 top-0 -z-10 h-24"
          style={{
            maskImage: "linear-gradient(to bottom, #000 30%, rgba(0,0,0,.55) 62%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 30%, rgba(0,0,0,.55) 62%, transparent 100%)",
          }}
        />
      )}
      {/* 左侧：品牌 + 菜单 */}
      <div className={cn("flex min-w-0 flex-1 items-center", desktop ? "@container gap-3" : "gap-4")}>
        {/* 暗色主题下原图为纯黑字，需反相 + 色相回补，避免在深色画布上不可见 */}
        <Image
          src="/guiderlogo-trim.png"
          alt="STRAVISION 莓界"
          width={104}
          height={36}
          priority
          className="h-8 md:h-9 w-auto shrink-0 dark:invert dark:hue-rotate-180"
        />
        {desktop && (
          <div className="ml-1 hidden items-center @min-[268px]:flex" style={DESKTOP_NO_DRAG}>
            <DesktopWindowMenu />
          </div>
        )}
      </div>

      {/* 中间：导航（全站唯一的视觉重心） */}
      <div className="hidden lg:flex justify-center flex-none" style={desktop ? DESKTOP_NO_DRAG : undefined}>
        <PageNavigation />
      </div>

      {/* 右侧：页面按钮 + 头像 │ 竖线 │ 窗口控制键。
          页面按钮属于「应用层」，− □ ✕ 属于「窗口层」，中间那条 1px 竖线就是两层分界。 */}
      <div
        className="flex items-center justify-end gap-2 md:gap-3 flex-1 min-w-0 flex-nowrap shrink-0"
        style={desktop ? DESKTOP_NO_DRAG : undefined}
      >
        {children}
        {user && <UserAvatarMenu user={user} hideName={desktop} />}
        {desktop && (
          <>
            <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-black/10 dark:bg-white/[0.12]" />
            <DesktopWindowControls className="-mr-2 md:-mr-4" />
          </>
        )}
      </div>
    </div>
  )
}
