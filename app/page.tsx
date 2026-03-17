"use client"

import { useState } from "react"
import { AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import { DynamicBackground } from "@/components/landing-art/dynamic-background"
import { Hero } from "@/components/landing-art/hero"
import { Monitor } from "@/components/landing-art/monitor"
import { Warning } from "@/components/landing-art/warning"
import { Logic } from "@/components/landing-art/logic"
import { Topology } from "@/components/landing-art/topology"
import { Game } from "@/components/landing-art/game"
import { CustomCursor } from "@/components/custom-cursor"
import { LoadingScreen } from "@/components/landing-art/loading-screen"
import { Footer } from "@/components/landing-art/footer"

export default function ArtPage() {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <main className="relative bg-[#050505] text-white selection:bg-emerald-500/30 font-jinbuti overflow-x-hidden cursor-none min-h-screen">
      <CustomCursor />

      <AnimatePresence mode="wait">
        {isLoading && <LoadingScreen onFinished={() => setIsLoading(false)} />}
      </AnimatePresence>
      
      {/* Global Perspective Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [transform:perspective(1000px)_rotateX(60deg)_translateY(-200px)] origin-top opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
      </div>

      {/* Content Layer */}
      {!isLoading && (
        <div className="relative z-20 flex flex-col gap-32 pb-32">
          <Hero />
          
          <Monitor />
          
          <Warning />
          
          <Logic />
          
          <Topology />
          
          <Game />

          <Footer />
        </div>
      )}

      {/* Global Background */}
      <DynamicBackground />
    </main>
  )
}
