"use client"

import { Hero } from "@/components/landing-art/hero"
import { Monitor } from "@/components/landing-art/monitor"
import { Warning } from "@/components/landing-art/warning"
import { Logic } from "@/components/landing-art/logic"
import { Topology } from "@/components/landing-art/topology"
import { Footer } from "@/components/landing-art/footer"

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

