"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowRight } from "@/components/animate-ui/icons/arrow-right";
import { Button } from "@/components/ui/button"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"

export function HeroSection() {
  const router = useRouter()
  const handleMonitorClick = () => {
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(navigator.userAgent)
    router.push(isMobile ? "/home" : "/monitor")
  }
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9])
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 50])

  // Mascot Parallax
  const mascotY = useTransform(scrollYProgress, [0, 1], [0, 200])
  const mascotX = useTransform(scrollYProgress, [0, 0.5], [0, 100])
  const mascotRotate = useTransform(scrollYProgress, [0, 1], [0, 45])
  const mascotScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.2])

  return (
    <section ref={containerRef} className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] px-4 text-center max-w-5xl mx-auto pt-20">
      <div className="flex flex-col items-center w-full relative">
        {/* Placeholder for layout stability if needed, or just remove */}
        <div className="h-32 sm:h-40 mb-8" /> 

        {/* Content Group - Fades out together */}
        <motion.div style={{ opacity, scale, y }} className="flex flex-col items-center w-full">
          {/* Badge */}
          <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-500/20 backdrop-blur-sm">
            AI 驱动的智慧农业解决方案
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] mb-8"
        >
          <span className="block text-gray-300">智慧感知.</span>
          <span className="block text-gray-200">万物互联.</span>
          <span className="block bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
            面向未来
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl text-base sm:text-lg md:text-xl text-gray-400 mb-12 leading-relaxed px-4"
        >
          Stravision 是您的一站式精准农业物联网平台。
          利用人工智能的力量，实时监测、分析并精准调控您的温室环境。
        </motion.p>

        {/* CTA Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col w-full sm:w-auto sm:flex-row items-center gap-4 px-4 sm:px-0"
        >
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button 
              size="lg" 
              className="w-full sm:w-auto group h-14 px-8 rounded-full bg-white text-black hover:bg-gray-200 transition-all text-base font-semibold"
            >
              进入控制台
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <div className="w-full sm:w-auto">
            <Button 
              size="lg" 
              variant="outline"  
              onClick={handleMonitorClick}
              className="w-full sm:w-auto group h-14 px-8 rounded-full border-gray-700 bg-transparent text-white hover:bg-white/5 hover:border-gray-500 transition-all text-base"
            >
              实时监控
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
      </div>
    </section>
  )
}
