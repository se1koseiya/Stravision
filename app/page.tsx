"use client"

import { Hero } from "@/components/landing-art/hero"
import dynamic from "next/dynamic"

// 首屏以下的 section 使用 dynamic import，滚动到时才加载 JS
const Monitor = dynamic(() => import("@/components/landing-art/monitor").then(m => ({ default: m.Monitor })), { ssr: false })
const Warning = dynamic(() => import("@/components/landing-art/warning").then(m => ({ default: m.Warning })), { ssr: false })
const Logic = dynamic(() => import("@/components/landing-art/logic").then(m => ({ default: m.Logic })), { ssr: false })
const Topology = dynamic(() => import("@/components/landing-art/topology").then(m => ({ default: m.Topology })), { ssr: false })
const Footer = dynamic(() => import("@/components/landing-art/footer").then(m => ({ default: m.Footer })), { ssr: false })

export default function ArtPage() {
  return (
    <main className="relative bg-white text-[#0a0a0a] selection:bg-blue-500/30 font-sans overflow-x-clip min-h-screen">
      {/* Content Layer */}
      <div className="relative z-20 flex flex-col">
        <Hero />
        <Monitor />
        <Warning />
        <Logic />
        <Topology />
        <Footer />
      </div>
    </main>
  )
}

