"use client"

import dynamic from "next/dynamic"
import { Nav } from "@/components/landing-art/hero"
import { CinematicReveal } from "@/components/landing-art/cinematic-reveal"
import { Manifesto } from "@/components/landing-art/manifesto"
import { AIChapters } from "@/components/landing-art/ai-story"
import { Personas } from "@/components/landing-art/personas"
import { Capabilities } from "@/components/landing-art/capabilities"
import { Metrics } from "@/components/landing-art/metrics"

// 落地页专用轻量光标 —— 仅在桌面端加载，不干扰默认交互
const LandingCursor = dynamic(
  () => import("@/components/landing-art/landing-cursor").then((m) => m.LandingCursor),
  { ssr: false }
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
