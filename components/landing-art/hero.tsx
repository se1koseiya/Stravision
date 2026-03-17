"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import Link from "next/link"
import { useEffect, useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"

export function Hero() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, 200])
  const opacity = useTransform(scrollY, [0, 300], [1, 0])

  // Decoding Text Effect
  const [text, setText] = useState("")
  const targetText = "STRAVISION"
  
  useEffect(() => {
    let iterations = 0
    const interval = setInterval(() => {
      setText(targetText.split("")
        .map((letter, index) => {
          if (index < iterations) {
            return targetText[index]
          }
          return String.fromCharCode(65 + Math.floor(Math.random() * 26))
        })
        .join("")
      )
      
      if (iterations >= targetText.length) {
        clearInterval(interval)
      }
      
      iterations += 1/3
    }, 30)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden pt-20">
      
      {/* Background Typography (Massive) */}
      <motion.div 
        style={{ y, opacity }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
      >
        <h1 className="text-[25vw] font-jinbuti text-[#101010] tracking-tighter leading-none select-none">
          IOT
        </h1>
      </motion.div>

      {/* Top Status Bar - Floating Pill */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      >
        <GlassCard className="flex items-center gap-6 px-6 py-2 rounded-full bg-black/40 border-white/10 pointer-events-auto" hoverEffect={false}>
          <div className="flex gap-4 text-xs font-jinbuti text-emerald-500/80 tracking-wider items-center">
            <span className="text-white/40">V4.0.2</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              已连接
            </span>
          </div>
          <div className="hidden md:flex gap-1.5 opacity-50">
             {[1,2,3,4].map(i => (
               <div key={i} className={`w-1 h-4 rounded-full ${i===4 ? 'bg-emerald-500' : 'bg-emerald-900/40'}`} />
             ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-[90vw] mx-auto flex flex-col items-start md:items-center">

        {/* Hero Title */}
        <div className="relative mb-8">
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: [1, 0.9, 1, 0.8, 1, 0.4, 1, 0.9, 1], // Flickering opacity
              filter: [
                "drop-shadow(0 0 0px rgba(255,255,255,0))",
                "drop-shadow(0 0 10px rgba(255,255,255,0.4))",
                "drop-shadow(0 0 20px rgba(255,255,255,0.6))", 
                "drop-shadow(0 0 5px rgba(255,255,255,0.2))"
              ]
            }}
            transition={{ 
              scale: { duration: 0.8, ease: "easeOut" },
              opacity: {
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse",
                times: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 1],
                ease: "linear"
              },
              filter: {
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse",
                times: [0, 0.05, 0.1, 0.5],
                ease: "linear"
              }
            }}
            className="text-8xl md:text-[12rem] font-jinbuti tracking-tighter leading-[0.8] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50"
          >
            莓界
          </motion.h1>
          
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="h-1 bg-emerald-500 mt-4"
          />
        </div>

        {/* Subtitle / Description */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-xl md:text-3xl font-jinbuti text-white/60 max-w-2xl text-left md:text-center leading-relaxed"
        >
          让大棚开始<span className="text-emerald-400">自己运转</span>。
          <br className="hidden md:block" />
          莓小智正在巡检你的环境数据。
        </motion.p>

        {/* CTA Buttons - Industrial Style */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col md:flex-row gap-6 mt-16 w-full md:w-auto"
        >
          <Link href="/dashboard" className="group relative px-8 py-4 bg-white text-black font-jinbuti tracking-wide overflow-hidden">
            <div className="absolute inset-0 bg-emerald-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative z-10 group-hover:text-black transition-colors flex items-center gap-2">
              进入体验 
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
          </Link>
          
          <Link href="/docs" className="group px-8 py-4 border border-white/20 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-white/80 hover:text-white font-jinbuti text-sm flex items-center justify-center">
            <span className="mr-2 opacity-50 group-hover:opacity-100">&lt;</span>
            查看接入文档
            <span className="ml-2 opacity-50 group-hover:opacity-100">/&gt;</span>
          </Link>
        </motion.div>

      </div>

      {/* Scroll Indicator - Moved outside main content to position relative to viewport */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 z-20"
      >
        <span className="text-[10px] tracking-[0.2em] font-jinbuti text-white/40">向下滚动探索</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-emerald-500 to-transparent" />
      </motion.div>
    </section>
  )
}
