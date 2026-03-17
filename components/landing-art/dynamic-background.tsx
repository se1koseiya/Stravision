"use client"

import { motion } from "framer-motion"

export function DynamicBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#050505] pointer-events-none">
      
      {/* 1. Global Perspective Grid */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [transform:perspective(1000px)_rotateX(60deg)_translateY(-200px)] origin-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
      </div>

      {/* 2. Ambient Orbs (Subtle Coloring) */}
      <div className="absolute inset-0 z-0">
        {/* Primary Emerald Glow - Top Left */}
        <motion.div 
          className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-emerald-900/10 blur-[120px] mix-blend-screen"
          animate={{ 
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Secondary Teal Glow - Bottom Right */}
        <motion.div 
          className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-teal-900/10 blur-[140px] mix-blend-screen"
          animate={{ 
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />

        {/* Floating Cyan Accent - Middle */}
        <motion.div 
          className="absolute top-[30%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-cyan-900/5 blur-[100px] mix-blend-screen"
          animate={{ 
            x: [0, 100, -50, 0],
            y: [0, -50, 50, 0],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        />
      </div>

      {/* 3. Global Noise Texture */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay z-[1]" 
           style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} 
      />

      {/* 4. Scanline Effect */}
      <div className="absolute inset-0 z-[2] bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_3px,3px_100%] pointer-events-none" />
      
      {/* 5. Vignette */}
      <div className="absolute inset-0 z-[3] bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,5,5,0.8)_100%)] pointer-events-none" />

    </div>
  )
}
