"use client"

import dynamic from "next/dynamic"

// 非首屏关键组件 — 使用 dynamic import 延迟加载，减少首次打开的 JS 体积
const SchedulerInit = dynamic(() => import("@/components/scheduler-init").then(m => ({ default: m.SchedulerInit })), { ssr: false })
const SmoothScroll = dynamic(() => import("@/components/smooth-scroll").then(m => ({ default: m.SmoothScroll })), { ssr: false })
const EnvironmentAlert = dynamic(() => import("@/components/environment-alert").then(m => ({ default: m.EnvironmentAlert })), { ssr: false })
const ToasterWrapper = dynamic(() => import("@/components/toaster-wrapper").then(m => ({ default: m.ToasterWrapper })), { ssr: false })
const MessageNotificationListener = dynamic(() => import("@/components/message-notification-listener").then(m => ({ default: m.MessageNotificationListener })), { ssr: false })
const SWRegister = dynamic(() => import("@/components/sw-register").then(m => ({ default: m.SWRegister })), { ssr: false })
const DesktopInstallPrompt = dynamic(() => import("@/components/desktop-install-prompt").then(m => ({ default: m.DesktopInstallPrompt })), { ssr: false })
const FloatingXiaozhi = dynamic(() => import("@/components/xiaozhi/FloatingXiaozhi").then(m => ({ default: m.FloatingXiaozhi })), { ssr: false })
const FeatureAnnouncementDialog = dynamic(() => import("@/components/dashboard/feature-announcement-dialog").then(m => ({ default: m.FeatureAnnouncementDialog })), { ssr: false })

export function LazyProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SchedulerInit />
      <SmoothScroll>
        <EnvironmentAlert />
        {children}
        <ToasterWrapper />
        <MessageNotificationListener />
        <SWRegister />
        <DesktopInstallPrompt />
        <FloatingXiaozhi />
        <FeatureAnnouncementDialog autoFetch />
      </SmoothScroll>
    </>
  )
}
