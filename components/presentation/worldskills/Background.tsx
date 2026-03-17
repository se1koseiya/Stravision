"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface BackgroundProps {
  mode?: "default" | "crisis" | "hope" | "tech" | "future"
}

export const StoryBackground = ({ mode = "default" }: BackgroundProps) => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#030303] transition-colors duration-1000">
      
      {/* Base Gradient - Subtle Ambient Light */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/20 to-black" />

      {/* Mode: Default (Clean Deep Space) */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-1000",
        mode === "default" ? "opacity-100" : "opacity-0"
      )}>
        {/* Top Center Light Source */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] h-[40vw] bg-white/[0.03] blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-900/10 blur-[150px] rounded-full" />
      </div>

      {/* Mode: Crisis (Red Alert - But Elegant) */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-1000",
        mode === "crisis" ? "opacity-100" : "opacity-0"
      )}>
        {/* Subtle red wash from bottom */}
        <div className="absolute bottom-0 inset-x-0 h-[60vh] bg-gradient-to-t from-red-950/30 to-transparent" />
        {/* Pulse orb, not too aggressive */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-red-900/10 blur-[120px] rounded-full animate-pulse-slow" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.02] mix-blend-overlay" />
      </div>

      {/* Mode: Hope (Emerald - Organic) */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-1000",
        mode === "hope" ? "opacity-100" : "opacity-0"
      )}>
        <div className="absolute top-[-30%] left-[-20%] w-[90vw] h-[90vw] bg-emerald-900/20 blur-[180px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-teal-900/10 blur-[150px] rounded-full" />
        {/* Very subtle organic particles */}
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.015]" />
      </div>

      {/* Mode: Tech (Blue/Purple - Precision) */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-1000",
        mode === "tech" ? "opacity-100" : "opacity-0"
      )}>
        {/* Clean dark background */}
        <div className="absolute inset-0 bg-[#020408]" />
        {/* Grid is now extremely subtle and only on the floor */}
        <div className="absolute bottom-0 w-full h-[50vh] bg-[linear-gradient(to_bottom,transparent,rgba(59,130,246,0.03))] [mask-image:linear-gradient(to_bottom,transparent,black)]" />
        <div className="absolute bottom-0 inset-x-0 h-[40vh] bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [perspective:1000px] [transform:rotateX(60deg)] origin-bottom opacity-30" />
        
        {/* Center Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-indigo-900/10 blur-[120px] rounded-full" />
      </div>

      {/* Mode: Future (Violet/Magenta - Dreamy) */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-1000",
        mode === "future" ? "opacity-100" : "opacity-0"
      )}>
        <div className="absolute top-[-20%] right-[-10%] w-[80vw] h-[80vw] bg-purple-900/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-fuchsia-900/10 blur-[150px] rounded-full" />
        {/* Stars */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(white_1px,transparent_1px)] [background-size:30px_30px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />
      </div>
    </div>
  )
}
