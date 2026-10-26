"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import Image from "next/image"
import { APP_VERSION_TAG } from "@/lib/app-meta"

const loaders = [
  "/ip/loader1.png",
  "/ip/loader2.png",
  "/ip/loader3.png"
]

export function LoadingScreen({ onFinished }: { onFinished: () => void }) {
  const [currentLoader, setCurrentLoader] = useState(0)
  const [progress, setProgress] = useState(0)

  // 模拟加载进度
  useEffect(() => {
    // 快速加载到 70%
    const fastPhase = setInterval(() => {
      setProgress(prev => {
        if (prev >= 70) {
          clearInterval(fastPhase)
          return 70
        }
        return prev + 2
      })
    }, 50)

    // 慢速加载剩余部分
    const slowPhase = setTimeout(() => {
      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer)
            return 100
          }
          return prev + 1
        })
      }, 30)
      return () => clearInterval(timer)
    }, 1500)

    return () => {
      clearInterval(fastPhase)
      clearTimeout(slowPhase)
    }
  }, [])

  // 图片切换动画
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentLoader(prev => (prev + 1) % loaders.length)
    }, 600) // 切换速度

    return () => clearInterval(timer)
  }, [])

  // 完成回调
  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        onFinished()
      }, 800) // 100% 后稍微停留一下
      return () => clearTimeout(timer)
    }
  }, [progress, onFinished])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(20px)" }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent opacity-50" />
      
      {/* 居中动画容器 */}
      <div className="relative w-64 h-64 md:w-96 md:h-96 flex items-center justify-center mb-8">
         {/* 辉光效果 */}
        <div className="absolute inset-0 bg-primary/10 blur-[80px] rounded-full animate-pulse" />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLoader}
            initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(4px)" }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center"
          >
             <Image 
                src={loaders[currentLoader]} 
                alt="Loading..." 
                width={320} 
                height={320}
                className="object-contain drop-shadow-[0_0_20px_rgba(0,148,86,0.3)]"
                priority
             />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 进度条与文字 */}
      <div className="flex flex-col items-center gap-6 z-10 w-full max-w-md px-8">
        <div className="flex items-center justify-between w-full text-primary/80 font-jinbuti tracking-widest">
          <span className="text-lg animate-pulse">系统初始化中...</span>
          <span className="text-xl font-mono">{Math.floor(progress)}%</span>
        </div>
        
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_15px_#059669]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
          {/* 进度条上的光效 */}
          <motion.div 
             className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/50 to-transparent"
             style={{ left: `${progress}%`, x: '-50%' }}
          />
        </div>
        
        <div className="flex justify-between w-full text-[11px] font-mono text-primary/30 uppercase tracking-[0.2em]">
          <span>Loading Assets</span>
          <span>Stravision IOT</span>
          <span>{APP_VERSION_TAG}</span>
        </div>
      </div>

      {/* 扫描线效果 */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.8)_50%)] bg-[size:100%_4px] opacity-10" />
    </motion.div>
  )
}
