"use client"

/**
 * 全站设置弹窗宿主（2026-09-27）
 *
 * ── 起因 ──
 *   `AISettingsDialog` 原先只在 `app/ai-assistant/page.tsx` 与 `app/(mobile)/ai-assistant-ios/page.tsx`
 *   里挂载 —— 也就是说**设置只有 AI 助手页能打开**。用户在看板 / 监控 / 设备页想改「沉浸光感」
 *   这类全局外观项时，压根找不到入口（用户原话：「我无法在除了 ai-assistant 以外的页面打开设置」）。
 *
 * ── 做法 ──
 *   把弹窗挂到一个**全局宿主**上，任何页面只要派发 `berry:open-settings` 事件就能打开它，
 *   并可指定落地分区。这样：
 *     ① 设置只有一份实例（不会出现两个弹窗互相盖住、状态打架）；
 *     ② 入口可以散落在各处（头像菜单 / Copilot 顶栏 / 未来的快捷键），都指向同一个目标；
 *     ③ AI 助手页内既有的 `settingsOpen` 状态**不受影响**，它仍然用自己的那份（页面内联的
 *        交互更紧：设置项要回写页面状态）。两处同名不同实例是**有意为之** —— 别试图合并。
 *
 * ── 为什么必须懒加载 ──
 *   宿主挂在根布局上 = 每个页面都会渲染到它。设置弹窗本身相当大（8 个分区 + antd 组件），
 *   直接静态 import 会把它塞进所有页面的首屏包里。用 next/dynamic({ ssr: false }) 让它在
 *   **第一次真正被打开时**才去拉 chunk —— 没点开设置的用户一个字节都不下载。
 */

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { App, ConfigProvider, theme as antdTheme } from "antd"
import { useTheme } from "next-themes"
import type { SettingsSection } from "@/components/ai-settings-dialog"
import { ANTD_FONT_FAMILY } from "@/lib/theme/antd-scope-theme"

/** 打开设置弹窗的事件名（与全站其它 `berry:*` 事件同一命名习惯） */
export const OPEN_SETTINGS_EVENT = "berry:open-settings"

/**
 * 任何地方都能调用：打开设置弹窗，可选直达某个分区。
 *
 * ⚠️ 只能在浏览器里调（`window.dispatchEvent`）。宿主不在场时事件会被丢掉、
 *    不会报错，也不会打开任何东西 —— 所以**新加入口时确认根布局里挂着 `<GlobalSettingsHost />`**。
 */
export function openSettings(section?: SettingsSection) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT, { detail: { section } }))
}

const LazyAISettingsDialog = dynamic(
  () => import("@/components/ai-settings-dialog").then((m) => m.AISettingsDialog),
  { ssr: false },
)

export function GlobalSettingsHost() {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<SettingsSection | undefined>(undefined)
  // 主题令牌必须由**外层** ConfigProvider 提供：下面 <App> 生成的 message / modal 实例
  // 读取的是它自己所在分支的 ConfigProvider，若把 ConfigProvider 留在弹窗内部，
  // 提示条就会掉回 antd 默认蓝，与设置里的绿色开关不搭。
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ section?: SettingsSection }>).detail
      setSection(detail?.section)
      setOpen(true)
    }
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen)
  }, [])

  /**
   * 🚨 这里必须包 antd `<App>`（2026-10-05 修）：
   *   设置弹窗里到处用 `App.useApp()` 的 message / modal（未保存确认、上传失败提示、保存成功…），
   *   而 `<App>` 之前**只在 AI 助手页内联**—— 从任何其它页面打开全局设置弹窗时，
   *   `App.useApp()` 拿不到实例，`modal.confirm is not a function` 直接抛错、提示条也全哑。
   *   包上之后：全局这份实例与 AI 助手页那份等价。
   */
  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : undefined,
        /* fontFamily 见 ai-settings-dialog.tsx 同名说明：antd v6 默认 --ant-font-family 是系统栈，
           不指回全站字体设置弹窗就会与全站两副面孔。取值走 ANTD_FONT_FAMILY（antd 侧唯一源）。 */
        token: { colorPrimary: "#12B76A", fontFamily: ANTD_FONT_FAMILY },
      }}
    >
      <App>
        <LazyAISettingsDialog open={open} onOpenChange={setOpen} initialSection={section} />
      </App>
    </ConfigProvider>
  )
}
