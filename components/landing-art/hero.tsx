"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { ChevronRight, Sparkles } from "lucide-react"
import { useRef } from "react"
import React from "react"
import GlassSurface from "@/components/ui/glass-surface"

export function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  })

  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const yText = useTransform(scrollYProgress, [0, 1], ["0%", "80%"])
  const yCharacter = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])

  // Header scroll effect
  const [isScrolled, setIsScrolled] = React.useState(false)
  
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Top Navigation - Sticky Header */}
      <header className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 md:px-8 py-4 w-full transition-all duration-300 ${
        isScrolled 
          ? 'bg-transparent' 
          : 'bg-transparent'
      }`}>
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 flex items-center justify-center">
              <Image src="/icon.png" alt="StraVision Logo" width={40} height={40} className="group-hover:scale-110 transition-transform" />
            </div>
            <span className={`font-bold text-lg tracking-tight hidden sm:inline transition-colors font-alimama ${
              isScrolled ? 'text-black' : 'text-black'
            }`}>StraVision</span>
          </Link>

          {/* Center Navigation */}
          <div className="hidden lg:block">
            <GlassSurface 
              width="auto" 
              height="auto" 
              borderRadius={9999}
              backgroundOpacity={0.15}
              borderWidth={0.05}
              blur={15}
              className="px-2 py-1.5"
            >
              <nav className="flex items-center gap-1 font-alimama">
                <Link href="/dashboard" className="px-4 py-2 text-sm rounded-full font-bold shadow-sm transition-all hover:shadow-md text-blue-600 bg-white">
                  控制台
                </Link>
                <Link href="/device-control" className="px-4 py-2 text-sm transition-colors font-bold text-black hover:text-black/70">
                  设备管理
                </Link>
                <Link href="/monitor" className="px-4 py-2 text-sm transition-colors font-bold text-black hover:text-black/70">
                  数据监控
                </Link>
                <Link href="/automation" className="px-4 py-2 text-sm transition-colors font-bold text-black hover:text-black/70">
                  自动化
                </Link>
                <Link href="/docs" className="px-4 py-2 text-sm transition-colors font-bold text-black hover:text-black/70">
                  文档
                </Link>
              </nav>
            </GlassSurface>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <Link href="/login" className={`text-sm font-bold transition-colors hidden sm:inline font-alimama ${
              isScrolled ? 'text-black hover:text-black/70' : 'text-black hover:text-black/70'
            }`}>
              登录
            </Link>
            <Link href="/dashboard" className="px-4 py-2.5 rounded-full bg-black/90 text-white text-sm font-medium hover:bg-black transition-all flex items-center gap-2 shadow-lg hover:shadow-xl">
              立即开启 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <section
        ref={ref}
        className="relative w-full flex flex-col pt-24 pb-32 bg-gradient-to-b from-[#6fbcf8] via-[#85c8f9] to-[#b4defb] overflow-hidden z-20"
      >
        {/* Decorative Background Clouds & Parallax Orbs */}
        <motion.div style={{ y: yBg }} className="absolute inset-0 z-0 pointer-events-none">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-[5%] left-[5%] w-[400px] h-[400px] bg-white/40 blur-[80px] rounded-full" />
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 10, repeat: Infinity, delay: 1 }} className="absolute top-[15%] right-[10%] w-[500px] h-[500px] bg-blue-300/40 blur-[100px] rounded-full" />
          <motion.div animate={{ x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 12, repeat: Infinity }} className="absolute bottom-[20%] left-[20%] w-[350px] h-[350px] bg-cyan-200/40 blur-[60px] rounded-full" />

          {/* Floating little particles */}
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"
              initial={{ x: Math.random() * 100 + "%", y: Math.random() * 100 + "%", opacity: Math.random() }}
              animate={{
                y: [null, Math.random() * -100 - 50],
                opacity: [null, 0]
              }}
              transition={{ duration: Math.random() * 5 + 5, repeat: Infinity, ease: "linear" }}
            />
          ))}
        </motion.div>

        {/* Main Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start pt-16 px-4">

        <motion.div
          style={{ y: yText }}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, type: "spring", bounce: 0.4 }}
          className="flex flex-col items-center text-center max-w-5xl relative z-20"
        >


          <h1 className="text-6xl md:text-[6rem] lg:text-[7.5rem] font-black tracking-tighter mb-6 leading-[1.05] text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/70 drop-shadow-xl font-alimama">
            让AI接管<br />
            你的大棚
          </h1>

          <p className="text-xl md:text-2xl text-white/95 max-w-2xl mx-auto mb-12 font-medium drop-shadow-md font-alimama">
            AI智能体 + IoT设备协同，用自然语言对话即可掌控整个温室。
          </p>

          <div className="flex items-center gap-4 mb-16">
            <Link href="/dashboard" className="px-6 py-3 rounded-full bg-black text-white hover:bg-black/80 transition-colors flex items-center gap-2 text-sm font-medium shadow-lg">
              <span className="w-4 h-4 bg-white text-black rounded-full flex items-center justify-center text-[10px] font-bold">W</span>
              进入网页控制台
            </Link>
            <a href="https://mp.weixin.qq.com/s/your-article-link" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-lg">
              <span className="w-4 h-4 bg-white text-blue-500 rounded-full flex items-center justify-center text-[10px]">↗</span>
              关注微信公众号
            </a>
          </div>
        </motion.div>

        {/* Central Visual (3D Scene) */}
        <div className="relative w-full max-w-6xl h-[650px] flex items-center justify-center mt-10 pointer-events-none" style={{ perspective: '2000px' }}>

          <motion.div style={{ y: yCharacter }} className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>

            {/* Main Portrait (Static in center) */}
            <div className="absolute bottom-[-150px] w-[800px] h-[900px] mask-image-b" style={{ transform: 'translateZ(0)', clipPath: 'polygon(0% 0%, 100% 0%, 100% 93.5%, 0% 93.5%)' }}>
              <Image
                src="/ip/sit.png"
                alt="Hero portrait"
                fill
                className="object-contain object-bottom"
                priority
              />
            </div>

            {/* Floating Cards Array (Rotating Carousel) */}
            <motion.div
              className="absolute top-[40%] mt-[-120px] w-[240px] h-[300px]"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{ rotateY: [0, -360] }}
              transition={{ repeat: Infinity, duration: 35, ease: "linear" }}
            >

              {/* Card 1: AI感知 */}
              <div
                className="absolute top-0 left-0 w-full h-full bg-white/60 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-[0_32px_64px_rgba(0,0,0,0.15)] p-6 flex flex-col pointer-events-auto transition-transform hover:scale-105"
                style={{ transform: 'rotateY(0deg) translateZ(650px)' }}
              >
                <div className="text-xs text-gray-500 font-medium mb-1">AI 感知层</div>
                <div className="text-lg font-bold mb-4 leading-tight">多维传感<br />实时融合</div>
                <div className="flex-1 w-full flex items-end justify-between gap-1.5 mb-2">
                  {[40, 60, 30, 80, 50, 70, 40].map((h, i) => <div key={i} className={`w-full rounded-sm ${i === 3 ? 'bg-rose-400' : 'bg-gray-200'}`} style={{ height: `${h}%` }} />)}
                </div>
                <div className="text-lg font-bold text-gray-800">6路 <span className="text-[10px] text-gray-400 font-normal">传感器在线</span></div>
              </div>

              {/* Card 2: AI决策 */}
              <div
                className="absolute top-0 left-0 w-full h-full bg-black/40 backdrop-blur-2xl border border-white/30 rounded-[2rem] shadow-[0_32px_64px_rgba(0,0,0,0.25)] p-6 flex flex-col pointer-events-auto transition-transform hover:scale-105"
                style={{ transform: 'rotateY(60deg) translateZ(650px)' }}
              >
                <div className="text-lg font-bold text-white mb-4 leading-tight">AI决策<br />自主推理<br />精准执行</div>
                <div className="mt-auto">
                  <div className="text-[10px] text-white/60 mb-1">AI推理置信度</div>
                  <div className="text-xl font-bold text-white">97.8% <span className="text-[10px] text-white/60 font-normal">/ 已执行</span></div>
                </div>
              </div>

              {/* Card 3: 自然语言控制 */}
              <div
                className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-pink-500/70 to-rose-600/70 backdrop-blur-2xl border border-white/50 rounded-[2rem] shadow-[0_32px_64px_rgba(225,29,72,0.4)] p-6 flex flex-col pointer-events-auto transition-transform hover:scale-105"
                style={{ transform: 'rotateY(120deg) translateZ(650px)' }}
              >
                <div className="text-lg font-bold text-white leading-tight">"帮我降温"</div>
                <div className="text-[10px] text-white/80 mb-4">自然语言 → IoT指令</div>
                <div className="mt-auto bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/20">
                  <div className="text-[10px] text-white/80 mb-1">AI已理解并执行</div>
                  <div className="text-xl font-bold text-white">风机已开启</div>
                </div>
              </div>

              {/* Card 4: AI预测模型 */}
              <div
                className="absolute top-0 left-0 w-full h-full bg-white/60 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-[0_32px_64px_rgba(0,0,0,0.15)] p-6 flex flex-col pointer-events-auto transition-transform hover:scale-105"
                style={{ transform: 'rotateY(180deg) translateZ(650px)' }}
              >
                <div className="text-xs text-gray-500 font-medium mb-4">AI 预测模型</div>
                <div className="mb-4">
                  <div className="text-[10px] font-medium text-gray-500 mb-2">模型训练进度</div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full relative mb-2">
                    <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full" style={{ width: '80%' }} />
                    <div className="absolute top-1/2 left-[80%] -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-sm" />
                  </div>
                  <div className="flex justify-between text-[8px] text-gray-400">
                    <span>数据</span><span>特征</span><span>训练</span><span>验证</span><span>部署</span>
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="text-3xl font-bold text-gray-800">R² 0.96</div>
                </div>
              </div>

              {/* Card 5: AI诊断 */}
              <div
                className="absolute top-0 left-0 w-full h-full bg-white/60 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-[0_32px_64px_rgba(0,0,0,0.15)] p-6 flex flex-col pointer-events-auto transition-transform hover:scale-105"
                style={{ transform: 'rotateY(240deg) translateZ(650px)' }}
              >
                <div className="text-xs text-gray-500 font-medium mb-4">AI 视觉诊断</div>
                <div className="flex-1 w-full flex items-end justify-between gap-1.5 mb-2">
                  {[30, 45, 60, 40, 70, 85].map((h, i) => (
                    <div key={i} className="w-full bg-blue-100 rounded-sm relative" style={{ height: '100%' }}>
                      <div className="absolute bottom-0 w-full bg-blue-500 rounded-sm shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ height: `${h}%` }} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-gray-400 mt-1 font-medium">
                  <span>灰霉</span><span>白粉</span><span>蚜虫</span><span>红蜘蛛</span><span>炭疽</span><span>健康</span>
                </div>
              </div>

              {/* Card 6: IoT设备矩阵 */}
              <div
                className="absolute top-0 left-0 w-full h-full bg-blue-500/60 backdrop-blur-2xl border border-white/50 rounded-[2rem] shadow-[0_32px_64px_rgba(59,130,246,0.4)] p-6 flex flex-col pointer-events-auto transition-transform hover:scale-105"
                style={{ transform: 'rotateY(300deg) translateZ(650px)' }}
              >
                <div className="text-lg font-bold text-white mb-2 leading-tight">IoT 设备矩阵</div>
                <div className="text-xs text-white/80 mb-4">12台设备 · AI统一调度</div>
                <div className="mt-auto flex items-center gap-2 bg-white/20 p-3 rounded-xl border border-white/20 backdrop-blur-md">
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-blue-500 text-xs font-bold">✓</div>
                  <span className="text-sm text-white font-medium">全链路在线</span>
                </div>
              </div>

            </motion.div>
          </motion.div>
        </div>

      </main>

      {/* ================= FUTURISTIC 3D BORDERLESS GLASSMORPHIC PORTAL SEPARATOR ================= */}
      <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-30 pointer-events-none">
        <svg className="relative block w-full h-[100px] md:h-[140px]" viewBox="0 0 1440 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          {/* Layer 1: Borderless Translucent Fade Wave Body with heavy backdrop blur */}
          <path d="M0,30 Q720,120 1440,30 L1440,120 L0,120 Z" fill="url(#wave-glass-fade)" className="backdrop-blur-2xl" />
          
          <defs>
            {/* Extremely soft, borderless linear gradient going from transparent to solid white */}
            <linearGradient id="wave-glass-fade" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="75%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <style jsx>{`
        .mask-image-b {
          mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
        }
      `}</style>
    </section>
  </>
  )
}
