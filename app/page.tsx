"use client"

import dynamic from "next/dynamic"
import { Nav } from "@/components/landing-art/hero"
import { CinematicReveal } from "@/components/landing-art/cinematic-reveal"

// 首屏性能优化：视口以下的区块全部懒加载（ssr:false + 骨架屏），
// 避免 antd 等重库（约 5MB JS）进入首屏初始包，大幅降低首屏加载/解析时间。
// 首屏仅保留 Nav + CinematicReveal（开场），其余区块在 hydration 后按需加载。

const sectionSkeleton = (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
  </div>
)

// 落地页专用轻量光标 —— 仅在桌面端加载，不干扰默认交互
const LandingCursor = dynamic(
  () => import("@/components/landing-art/landing-cursor").then((m) => m.LandingCursor),
  { ssr: false }
)

// 序章（滚动叙事）
const Manifesto = dynamic(
  () => import("@/components/landing-art/manifesto").then((m) => m.Manifesto),
  { ssr: false, loading: () => sectionSkeleton }
)

// 推理章节（含 antd 重型 AI 卡片 —— 初始包体积大头）
const AIChapters = dynamic(
  () => import("@/components/landing-art/ai-story").then((m) => m.AIChapters),
  { ssr: false, loading: () => sectionSkeleton }
)

// 三重人格
const Personas = dynamic(
  () => import("@/components/landing-art/personas").then((m) => m.Personas),
  { ssr: false, loading: () => sectionSkeleton }
)

// 系统能力
const Capabilities = dynamic(
  () => import("@/components/landing-art/capabilities").then((m) => m.Capabilities),
  { ssr: false, loading: () => sectionSkeleton }
)

// 数据指标
const Metrics = dynamic(
  () => import("@/components/landing-art/metrics").then((m) => m.Metrics),
  { ssr: false, loading: () => sectionSkeleton }
)

// Footer 滚动到时才加载 JS
const Footer = dynamic(
  () => import("@/components/landing-art/footer").then((m) => ({ default: m.Footer })),
  { ssr: false }
)

export default function ArtPage() {
  return (
    <main className="relative bg-[#08080A] text-white selection:bg-[#1677ff] selection:text-white font-sans overflow-x-clip">
      <LandingCursor />
      <Nav />
      {/* 电影级编辑叙事流：
          开场虹膜 → 序章 → 信仰 → 推理 → 三重人格 → 系统 → 数据 → 邀请 */}
      <div className="relative z-10 flex flex-col">
        <CinematicReveal />
        <Manifesto />
        <AIChapters />
        <Personas />
        <Capabilities />
        <Metrics />
        <Footer />
      </div>
    </main>
  )
}
