"use client"

import { Section, H2, Caption } from "./ui-primitives"
import { motion, useAnimation, AnimatePresence } from "framer-motion"
import { useState } from "react"

import { RainEffect } from "./rain-effect"
import { GrowthEffect } from "./growth-effect"

export function Logic({ onAction }: { onAction?: () => void }) {
  const [activeStep, setActiveStep] = useState(0)
  const [activeDevice, setActiveDevice] = useState<string | null>(null)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [log, setLog] = useState<string | null>(null)
  const controls = useAnimation()

  const handleToggle = (device: string) => {
    setHasInteracted(true)
    // Toggle off if clicking same device
    if (activeDevice === device) {
      setActiveDevice(null)
      setLog(null)
      return
    }

    setActiveDevice(device)
    setActiveStep(0)
    setLog(null)
    
    // Trigger Glitch Effect
    controls.start({
      x: [0, -2, 2, -2, 2, 0], // Subtle shake
      filter: ["none", "hue-rotate(90deg) blur(1px)", "none"],
      transition: { duration: 0.2 }
    })
    
    // Simulate chain reaction
    setTimeout(() => setActiveStep(1), 200)
    setTimeout(() => setActiveStep(2), 500)
    setTimeout(() => {
      setActiveStep(3)
      setLog(`cmd/set ${device}:on / rule: manual_override`)
      onAction?.()
    }, 800)
  }

  return (
    <Section className="!overflow-visible"> 
      {/* Immersive Background Effects */}
      <AnimatePresence>
        {activeDevice === "灯光" && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="fixed inset-0 z-0 pointer-events-none"
          >
            {/* 1. Top Source Glow (The "Bulb" feel without seeing the bulb) */}
            <motion.div 
              className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[60vw] h-[60vh] bg-amber-100/20 blur-[120px] rounded-full mix-blend-screen"
              animate={{ opacity: [0.6, 0.8, 0.6], scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* 2. The Volumetric Haze (Subtle Cone) */}
            <div 
              className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] h-[120vh]"
              style={{
                background: "conic-gradient(from 180deg at 50% 0%, transparent 45%, rgba(255,250,240,0.08) 50%, transparent 55%)",
                filter: "blur(60px)",
                mixBlendMode: "screen"
              }}
            />

            {/* 3. Floor Reflection (The "Stage" feel) */}
            <motion.div 
              className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[80vw] h-[40vh] bg-amber-500/10 blur-[80px] rounded-[100%] mix-blend-screen"
              animate={{ opacity: [0.3, 0.5, 0.3], width: ["80vw", "85vw", "80vw"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />

            {/* 4. Elegant Dust Particles (Few & Slow) */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(15)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full bg-white/40 blur-[1px]"
                  style={{
                    width: Math.random() * 3 + 1,
                    height: Math.random() * 3 + 1,
                    left: `${20 + Math.random() * 60}%`, // Concentrated in middle 60%
                    top: `${Math.random() * 100}%`
                  }}
                  animate={{
                    y: [0, -60],
                    opacity: [0, Math.random() * 0.5 + 0.1, 0],
                  }}
                  transition={{
                    duration: Math.random() * 8 + 8, // Very slow (8-16s)
                    repeat: Infinity,
                    ease: "linear",
                    delay: Math.random() * 10
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
        {activeDevice === "风扇" && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-0 pointer-events-none mix-blend-plus-lighter"
          >
             <svg className="w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
               <defs>
                 {/* Cyberpunk Wind Gradient */}
                 <linearGradient id="cyber-wind" x1="0%" y1="0%" x2="100%" y2="0%">
                   <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                   <stop offset="30%" stopColor="rgba(255,255,255,0.05)" />
                   <stop offset="50%" stopColor="rgba(255,255,255,0.6)" />
                   <stop offset="70%" stopColor="rgba(255,255,255,0.05)" />
                   <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                 </linearGradient>
                 <filter id="motion-blur" x="-50%" y="-50%" width="200%" height="200%">
                   <feGaussianBlur in="SourceGraphic" stdDeviation="4 0" />
                 </filter>
               </defs>

               {/* Streamline 1: Top Curve - Fast & Sharp */}
               <motion.path
                 d="M -100 200 C 300 200, 600 150, 750 100 S 1100 50, 1300 50"
                 fill="none" stroke="url(#cyber-wind)" strokeWidth="2"
                 strokeDasharray="400 1000"
                 initial={{ strokeDashoffset: 1400 }}
                 animate={{ strokeDashoffset: -1400 }}
                 transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
               />

               {/* Streamline 2: Middle Wrap - The Main Flow */}
               <motion.path
                 d="M -200 350 C 200 350, 500 350, 650 320 S 900 250, 1200 280"
                 fill="none" stroke="url(#cyber-wind)" strokeWidth="4"
                 strokeDasharray="600 1200"
                 initial={{ strokeDashoffset: 1800 }}
                 animate={{ strokeDashoffset: -1800 }}
                 transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.2 }}
                 filter="url(#motion-blur)"
               />

               {/* Streamline 3: Bottom Sweep - Heavy & Slow */}
               <motion.path
                 d="M -150 500 C 250 500, 550 550, 700 580 S 1000 650, 1300 650"
                 fill="none" stroke="url(#cyber-wind)" strokeWidth="3"
                 strokeDasharray="500 1000"
                 initial={{ strokeDashoffset: 1500 }}
                 animate={{ strokeDashoffset: -1500 }}
                 transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: 0.5 }}
                 style={{ opacity: 0.6 }}
               />

                {/* Streamline 4: Upper Mid - Quick Dart */}
               <motion.path
                 d="M -50 280 C 300 280, 550 250, 700 220 S 1000 180, 1300 180"
                 fill="none" stroke="url(#cyber-wind)" strokeWidth="1.5"
                 strokeDasharray="200 800"
                 initial={{ strokeDashoffset: 1000 }}
                 animate={{ strokeDashoffset: -1000 }}
                 transition={{ duration: 1.2, repeat: Infinity, ease: "linear", delay: 0.8 }}
               />
             </svg>
          </motion.div>
        )}
        {activeDevice === "水泵" && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="fixed inset-0 z-0 pointer-events-none"
            >
              <RainEffect />
            </motion.div>
            
            {/* Plant Growth Effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="fixed inset-0 z-0 pointer-events-none"
            >
              <GrowthEffect />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full">
        <motion.div animate={controls}>
          <H2>灯亮之前，</H2>
          <H2 className="text-emerald-500">逻辑已经跑完了。</H2>
          <Caption>策略生效，设备只是结果。</Caption>
        </motion.div>

        <div className="space-y-16 mt-16">
          {/* Strategy Chain - Minimal Line */}
          <div className="flex justify-between items-center relative h-12 px-4">
            {/* Background Trace */}
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5" />
            
            {["状态异常", "策略判断", "指令下发", "设备响应"].map((step, i) => {
              const isActive = activeDevice && i <= activeStep
              return (
                <motion.div 
                  key={step}
                  className="relative z-10 flex flex-col items-center gap-4"
                >
                  <motion.div 
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] scale-150" : "bg-white/10"}`}
                  />
                  <span className={`text-[10px] tracking-widest font-jinbuti transition-colors ${isActive ? "text-white" : "text-white/20"}`}>
                    {step}
                  </span>
                </motion.div>
              )
            })}
            
            {/* Active Pulse Trace */}
            {activeDevice && (
              <motion.div 
                className="absolute top-1/2 left-0 h-[1px] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                animate={{ width: `${(activeStep / 3) * 100}%` }}
                transition={{ type: "spring", stiffness: 100 }}
              />
            )}
          </div>

          {/* Minimal Switches */}
          <div className="flex gap-16 justify-center">
            {["灯光", "风扇", "水泵"].map(device => {
              const isOn = activeDevice === device
              return (
                <div key={device} className="flex flex-col items-center gap-6">
                  <button 
                    className="group relative w-8 h-24 cursor-pointer"
                    onClick={() => handleToggle(device)}
                  >
                    {/* Track */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px] bg-white/10 group-hover:bg-white/20 transition-colors" />
                    
                    {/* Active Track Fill */}
                    <motion.div 
                      className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[1px] bg-white shadow-[0_0_10px_white]"
                      initial={{ height: 0 }}
                      animate={{ height: isOn ? "100%" : "0%" }}
                      transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    />

                    {/* Knob */}
                    <motion.div 
                      className={`absolute left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full border transition-colors ${isOn ? "bg-white border-white shadow-[0_0_15px_white]" : "bg-[#0a0a0a] border-white/30 group-hover:border-white"}`}
                      initial={{ bottom: "0%", scale: 1 }}
                      animate={{ 
                        bottom: isOn ? "100%" : "0%", 
                        scale: isOn ? 1.2 : 1
                      }}
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    />
                  </button>
                  <span className={`text-xs font-jinbuti tracking-widest transition-colors ${isOn ? "text-white" : "text-white/30"}`}>
                    {device}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Minimal Hint (Log Removed) */}
          <div className="h-6 flex justify-center">
            <AnimatePresence mode="wait">
              {!hasInteracted && (
                <motion.div
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-jinbuti text-white tracking-widest animate-pulse"
                >
                  点击开关 · 测试环境联动
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Section>
  )
}
