"use client"

import dynamic from "next/dynamic"
import { LandingThemeProvider } from "@/components/landing-v4/theme-provider"
import {
  HeroSkeleton,
  BentoSkeleton,
  ScenariosSkeleton,
  ChatDemoSkeleton,
  PlatformsSkeleton,
  VoicesSkeleton,
  PricingSkeleton,
  DownloadCtaSkeleton,
  FooterSkeleton,
} from "@/components/landing-v4/skeletons"
/* ============================================================
   莓界 · 落地页 v4
   完全按 Loomy 官网（loomy.xunfei.cn）的区块顺序与设计语言重做：
     1 LandingNavbar      → 悬浮胶囊导航
     2 HeroGradientBackground → 双光斑首屏 + 真实 App 窗口
     3 CapabilityOverview → 卖点 bento（左侧两卡 + 右侧跨行卡 + 整行模型卡）
     4 BusinessNeedsSection → 场景卡切换器 + 详情面板（左流程 / 右真组件预览台）
     5 对话演示（Loomy 预览台语言包裹真实对话窗）
     6 PlatformSection    → 绿底四卡（#7DE9AC / #E6FDEE）
     7 UserVoicesSection  → 圆盘轨道口碑区（#EDFDFF）
     8 定价区（沿用同一套令牌自建，Loomy 无此块）
     9 DownloadCta + LandingFooter → 居中尾屏 + 五列页脚
   首屏只加载 Nav + Hero，其余区块进视口再懒加载。
   ============================================================ */

/* 注意：next/dynamic 的 options 必须是内联对象字面量，
   抽成共享常量（如 const lazy = {...}）会被编译器拒绝：
   "next/dynamic options must be an object literal." */
const LandingNav = dynamic(
  () => import("@/components/landing-v4/nav").then((m) => m.LandingNav),
  { ssr: false }
)

const Hero = dynamic(
  () => import("@/components/landing-v4/hero").then((m) => m.Hero),
  { ssr: false, loading: () => <HeroSkeleton /> }
)

const Bento = dynamic(
  () => import("@/components/landing-v4/bento").then((m) => m.Bento),
  { ssr: false, loading: () => <BentoSkeleton /> }
)

const Scenarios = dynamic(
  () => import("@/components/landing-v4/scenario").then((m) => m.Scenarios),
  { ssr: false, loading: () => <ScenariosSkeleton /> }
)

const ChatDemo = dynamic(
  () => import("@/components/landing-v4/chat-demo").then((m) => m.ChatDemo),
  { ssr: false, loading: () => <ChatDemoSkeleton /> }
)

const Platforms = dynamic(
  () => import("@/components/landing-v4/platforms").then((m) => m.Platforms),
  { ssr: false, loading: () => <PlatformsSkeleton /> }
)

const Voices = dynamic(
  () => import("@/components/landing-v4/voices").then((m) => m.Voices),
  { ssr: false, loading: () => <VoicesSkeleton /> }
)

const Pricing = dynamic(
  () => import("@/components/landing-v4/pricing").then((m) => m.Pricing),
  { ssr: false, loading: () => <PricingSkeleton /> }
)

const DownloadCta = dynamic(
  () => import("@/components/landing-v4/download-cta").then((m) => m.DownloadCta),
  { ssr: false, loading: () => <DownloadCtaSkeleton /> }
)

const LandingFooter = dynamic(
  () => import("@/components/landing-v4/download-cta").then((m) => m.LandingFooter),
  { ssr: false, loading: () => <FooterSkeleton /> }
)

export default function HomePage() {
  return (
    <LandingThemeProvider>
      <main className="min-h-[100dvh] bg-white text-[#222222] antialiased selection:bg-[#7DE9AC]/40 dark:bg-[#0C110E] dark:text-[#F2F4F1]">
        <style>{`html { scroll-behavior: smooth; }`}</style>

        <LandingNav />
        <Hero />
        <Bento />
        <Scenarios />
        <ChatDemo />
        <Platforms />
        <Voices />
        <Pricing />
        <DownloadCta />
        <LandingFooter />
      </main>
    </LandingThemeProvider>
  )
}
