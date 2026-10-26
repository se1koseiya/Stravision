"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// 非首屏关键组件 — 使用 dynamic import 延迟加载，减少首次打开的 JS 体积
const SchedulerInit = dynamic(() => import("@/components/scheduler-init").then(m => ({ default: m.SchedulerInit })), { ssr: false })
const SmoothScroll = dynamic(() => import("@/components/smooth-scroll").then(m => ({ default: m.SmoothScroll })), { ssr: false })
// 全站滚动条「滚动中」标记：给正在滚的容器打 data-scrolling，配合 globals.css 的
// Unified Scrollbar 段实现「不滚动就隐藏」。纯副作用、渲染 null、不区分页面（向导窗口也要）。
const ScrollActivity = dynamic(() => import("@/components/scroll-activity").then(m => ({ default: m.ScrollActivity })), { ssr: false })
// 果冻开关（Jelly Toggle）触发层：全站开关的 440ms 弹簧位移 + 胶囊拉伸 + 灰→主 token 渐变。
// 样式本体在 app/globals.css「果冻开关」段；这里只负责在 pointerdown 时打 data-jelly。
const JellySwitchMotion = dynamic(() => import("@/components/ui/jelly-switch-motion").then(m => ({ default: m.JellySwitchMotion })), { ssr: false })
// 滚轮归属仲裁：Lenis 会把未标 data-lenis-prevent 的内层容器的滚轮整个吃掉
// （window 冒泡 + 无条件 preventDefault）→ 这里在 window 捕获阶段把滚轮让回可滚容器。
const WheelScrollGuard = dynamic(() => import("@/components/wheel-scroll-guard").then(m => ({ default: m.WheelScrollGuard })), { ssr: false })
// 根滚动条的自绘 overlay 胶囊：<html> 的原生条已在 globals.css「Root Scrollbar」段
// 彻底隐藏（经典条的槽会露出画布底色，与满幅氛围层形成一条硬边）→ 由它补回
// 「看得见位置 + 能拖」这两件事。纯视觉浮层，渲染即定位，不占布局宽度。
const RootScrollbar = dynamic(() => import("@/components/root-scrollbar").then(m => ({ default: m.RootScrollbar })), { ssr: false })
const EnvironmentAlert = dynamic(() => import("@/components/environment-alert").then(m => ({ default: m.EnvironmentAlert })), { ssr: false })
const ToasterWrapper = dynamic(() => import("@/components/toaster-wrapper").then(m => ({ default: m.ToasterWrapper })), { ssr: false })
/**
 * 全局提示宿主（2026-10-21）：全站**唯一**的 antd `message` 实例来源。
 * 之前项目没有全局 ConfigProvider/App —— `<App>` 只在两个 AI 助手页和设置弹窗里各包一层，
 * 于是同一句提示在 AI 助手页是绿主题、换到 admin 就掉回 antd 默认蓝。
 * 它只生成 message/notification 的 holder + 把自己的实例登记进 `lib/ui/feedback.ts`，
 * 不包 children（不改变全站 antd 默认外观），渲染上只有一个 display:contents 容器。
 */
const FeedbackHost = dynamic(() => import("@/components/ui/feedback-host").then(m => ({ default: m.FeedbackHost })), { ssr: false })
const MessageNotificationListener = dynamic(() => import("@/components/message-notification-listener").then(m => ({ default: m.MessageNotificationListener })), { ssr: false })
const SWRegister = dynamic(() => import("@/components/sw-register").then(m => ({ default: m.SWRegister })), { ssr: false })
const DesktopInstallPrompt = dynamic(() => import("@/components/desktop-install-prompt").then(m => ({ default: m.DesktopInstallPrompt })), { ssr: false })
/**
 * 🚨 2026-09-24：FloatingXiaozhi（96px 语音球）已从全局移除。
 * 原因：它与右下角 Copilot 莓果球抢同一块位置，且两者系统提示词都是「莓小智」
 * —— 一个 persona 两个身体，是过度设计的根源。
 * 现在语音是 Copilot 的一种状态（Call 态，见 components/ai/copilot/copilot-call.tsx），
 * 仍然走 Omni 实时链路，能力（设备命令/定时任务/导航）一分没少。
 */
const FeatureAnnouncementDialog = dynamic(() => import("@/components/dashboard/feature-announcement-dialog").then(m => ({ default: m.FeatureAnnouncementDialog })), { ssr: false })

/**
 * 全站设置弹窗宿主（2026-09-27）：让「设置」在**任意页面**都能打开，不再只有 AI 助手页有入口。
 * 放在这里而不是 layout 里，是跟上面这批"全局浮层"同一套路 —— 副作用型、非首屏关键。
 * 弹窗本体在宿主内部再走一次 dynamic：没点开设置的用户不会下载它那个大 chunk。
 * 打开方式：任何地方调 `openSettings(section?)`（components/settings/global-settings-host.tsx）。
 */
const GlobalSettingsHost = dynamic(() => import("@/components/settings/global-settings-host").then(m => ({ default: m.GlobalSettingsHost })), { ssr: false })

/**
 * 桌面端配置向导窗口（/desktop-setup）**不是"应用内的一个页面"**，而是跑在
 * 独立无边框窗口里的设置级界面（首启引导 / 应用内打开）。它必须与整站浮层、
 * 后台副作用隔开，否则首启就会出事故 —— 2026-10-07 无头探针实测：
 *   · <EnvironmentAlert/>            → 向导上直接弹「光照不足预警」黑胶囊，压住表单；
 *   · <MessageNotificationListener/> → 在向导窗口里请求系统通知权限 + 弹消息 toast，
 *                                      且主窗口已有一份 → 同一条消息弹两次；
 *   · <SchedulerInit/>               → 第二个调度心跳（主窗口已有一个）；
 *   · <SWRegister/> / <DesktopInstallPrompt/> → 与该窗口无关的注册与提示；
 *   · <FeatureAnnouncementDialog autoFetch/>  → 首启有概率弹「新功能」弹窗盖住向导。
 * 这里统一短路，只保留 children —— 本文件正是全站浮层的唯一汇聚点（见文件头注释）。
 *
 * ⚠️ 判定写在 effect 里而不是首帧直接算：全站都是客户端渲染（children 被包在
 *    ssr:false 的 SmoothScroll 里），首帧改结构会让 React 认为 hydration 失败。
 *    effect 里切换只影响这几个"渲染 null"的浮层，children 位置不变、不会重挂载。
 * ❌ 别顺手把 SmoothScroll 也短路掉：向导页的滚动容器自带 data-lenis-prevent，
 *    留着 Lenis 与全站约定一致，也不会抢走它的滚轮。
 */
const SETUP_ROUTE = "/desktop-setup"

export function LazyProviders({ children }: { children: React.ReactNode }) {
  const [isSetupWindow, setIsSetupWindow] = useState(false)
  useEffect(() => {
    setIsSetupWindow(window.location.pathname === SETUP_ROUTE)
  }, [])

  return (
    <>
      {!isSetupWindow && <SchedulerInit />}
      <ScrollActivity />
      <JellySwitchMotion />
      <WheelScrollGuard />
      <RootScrollbar />
      <SmoothScroll>
        {!isSetupWindow && <EnvironmentAlert />}
        {children}
        <FeedbackHost />
        <ToasterWrapper />
        {!isSetupWindow && <MessageNotificationListener />}
        {!isSetupWindow && <SWRegister />}
        {!isSetupWindow && <DesktopInstallPrompt />}
        {!isSetupWindow && <FeatureAnnouncementDialog autoFetch />}
        <GlobalSettingsHost />
      </SmoothScroll>
    </>
  )
}
