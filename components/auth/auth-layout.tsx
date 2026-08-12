"use client"

import { ReactNode, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Zap } from "lucide-react"

const FALLBACK_VIDEOS = [
  "/login-video/14361873_2880_2160_30fps.mp4",
  "/login-video/15481545_2880_2160_30fps.mp4",
] as const

const STORAGE_KEY = "auth-layout:last-video"

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const [videoSrc, setVideoSrc] = useState<string>(FALLBACK_VIDEOS[0])
  const [videos, setVideos] = useState<string[]>([...FALLBACK_VIDEOS])
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/login-video/manifest.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((list: string[] | null) => {
        if (cancelled || !Array.isArray(list) || list.length === 0) return
        setVideos(list)
        const lastSrc = sessionStorage.getItem(STORAGE_KEY)
        const candidates = list.filter((v) => v !== lastSrc)
        const pool = candidates.length > 0 ? candidates : list
        const picked = pool[Math.floor(Math.random() * pool.length)]
        sessionStorage.setItem(STORAGE_KEY, picked)
        setVideoSrc(picked)
      })
      .catch(() => {
        // manifest 读不到时,落到 FALLBACK_VIDEOS,仍然保证随机
        if (cancelled) return
        const lastSrc = sessionStorage.getItem(STORAGE_KEY)
        const candidates = FALLBACK_VIDEOS.filter((v) => v !== lastSrc)
        const pool = candidates.length > 0 ? [...candidates] : [...FALLBACK_VIDEOS]
        const picked = pool[Math.floor(Math.random() * pool.length)]
        sessionStorage.setItem(STORAGE_KEY, picked)
        setVideoSrc(picked)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 兜底:某些浏览器/扩展会拦截 autoPlay 属性,这里手动调用一次 play()
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.muted = true
    const tryPlay = () => {
      el.play().catch(() => {
        // 静默失败,等用户交互后再尝试
      })
    }
    if (el.readyState >= 2) tryPlay()
    else el.addEventListener("canplay", tryPlay, { once: true })
    return () => el.removeEventListener("canplay", tryPlay)
  }, [videoSrc])

  // 视频加载失败时,切到 videos 里的下一个
  const handleVideoError = () => {
    const idx = videos.indexOf(videoSrc)
    const next = videos[(idx + 1) % videos.length]
    if (next && next !== videoSrc) {
      sessionStorage.setItem(STORAGE_KEY, next)
      setVideoSrc(next)
    }
  }
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#e4e2dd] relative p-4 lg:p-6 font-sans overflow-x-hidden">

      {/* Inline styles to completely bypass Tailwind compilation/cache bugs */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .exact-main-card {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 1360px;
          height: calc(100vh - 48px);
          background-color: #f4f3ef;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.6);
          z-index: 10;
        }
        .exact-nav-pocket {
          position: absolute;
          top: -1px;
          left: -1px;
          background-color: #e4e2dd;
          padding: 12px 16px 16px 12px;
          border-bottom-right-radius: 24px;
          z-index: 30;
          display: flex;
          align-items: center;
          width: fit-content;
        }
        .exact-nav-pocket-bottom-curve {
          position: absolute;
          bottom: -24px;
          left: 0;
          width: 24px;
          height: 24px;
          background: transparent;
          border-top-left-radius: 24px;
          box-shadow: -10px -10px 0 10px #e4e2dd;
          pointer-events: none;
        }
        .exact-nav-pocket-right-curve {
          position: absolute;
          top: 0;
          right: -24px;
          width: 24px;
          height: 24px;
          background: transparent;
          border-top-left-radius: 24px;
          box-shadow: -10px -10px 0 10px #e4e2dd;
          pointer-events: none;
        }
        
        @media (min-width: 1024px) {
          .exact-nav-pocket {
            padding: 16px 24px 24px 16px !important;
            border-bottom-right-radius: 28px !important;
          }
          .exact-nav-pocket-bottom-curve, .exact-nav-pocket-right-curve {
            width: 28px !important;
            height: 28px !important;
            border-top-left-radius: 28px !important;
            box-shadow: -12px -12px 0 12px #e4e2dd !important;
          }
          .exact-nav-pocket-bottom-curve {
            bottom: -28px !important;
          }
          .exact-nav-pocket-right-curve {
            right: -28px !important;
          }
        }
        .exact-left-panel {
          width: 100%;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          padding: 2rem;
          position: relative;
          z-index: 10;
          overflow-y: auto !important;
          height: calc(100vh - 48px - 2px) !important;
          max-height: calc(100vh - 48px - 2px) !important;
          min-height: 0;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .exact-left-panel::-webkit-scrollbar {
          display: none;
        }
        .exact-right-panel {
          display: none;
        }
        
        @media (min-width: 1024px) {
          .exact-main-card {
            flex-direction: row !important;
          }
          .exact-left-panel {
            width: 38% !important;
            padding: 3rem 4rem !important;
            height: calc(100vh - 48px - 2px) !important;
            max-height: calc(100vh - 48px - 2px) !important;
            min-height: 0 !important;
          }
          .exact-right-panel {
            display: block !important;
            width: 62% !important;
            flex-shrink: 0;
            height: 100%;
            padding: 1rem 1rem 1rem 0 !important;
            position: relative;
          }
        }
      `}} />

      {/* Decorative tech lines in background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
        <svg className="absolute bottom-[10%] left-[5%]" width="300" height="100" viewBox="0 0 300 100" fill="none">
          <path d="M0 50 L50 50 L70 30 L300 30" stroke="#a09e99" strokeWidth="1" />
          <path d="M0 60 L40 60 L60 40 L300 40" stroke="#b0aeaa" strokeWidth="1" />
        </svg>
      </div>

      {/* Main Card */}
      <div className="exact-main-card">

        {/* Navigation Pocket (Carved Out) */}
        <div className="exact-nav-pocket">
          <div className="exact-nav-pocket-bottom-curve" />
          <div className="exact-nav-pocket-right-curve" />

          {/* Top Nav (Black Pill) */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center bg-black rounded-full p-1.5 w-fit shadow-lg"
          >
            <div className="flex items-center gap-2.5 px-4.5 py-1.5 text-white">
              <img src="/logo.png" alt="stravision logo" className="w-5 h-5 rounded-full object-cover" />
              <span className="font-semibold text-sm tracking-wider font-alimama" style={{ fontFamily: "'AlimamaShuHeiTi', sans-serif" }}>stravision</span>
            </div>
            <div className="hidden md:flex items-center gap-1 px-4 text-white/70 text-xs font-medium border-l border-white/20">
              <Link href="/" className="px-3 py-1 hover:text-white transition-colors">首页</Link>
              <Link href="/" className="px-3 py-1 hover:text-white transition-colors">解决方案</Link>
              <Link href="/" className="px-3 py-1 hover:text-white transition-colors">行业应用</Link>
              <Link href="/" className="px-3 py-1 hover:text-white transition-colors">核心技术</Link>
            </div>
          </motion.div>
        </div>

        {/* === LEFT PANEL === */}
        <div className="exact-left-panel" data-lenis-prevent>

          {/* Top spacer to clear the fixed navigation pocket */}
          <div className="h-16 lg:h-20 w-full flex-shrink-0" />

          {/* Heading */}
          <div className="mt-2 lg:mt-3 mb-3">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-[2.2rem] lg:text-[2.6rem] xl:text-[3rem] font-bold leading-[1.18] tracking-tight text-[#111] font-alimama"
              style={{ fontFamily: "'AlimamaShuHeiTi', sans-serif" }}
            >
              <span className="block">用 AI 重塑</span>
              <span className="block mt-0.5">未来的</span>
              <span className="flex items-center gap-2.5 xl:gap-3 mt-2 flex-wrap">
                <span
                  className="relative inline-flex items-center h-[1.15em] rounded-full pl-5 pr-1.5 bg-cover bg-center shadow-inner overflow-hidden align-middle"
                  style={{ backgroundImage: 'url(/images/exact/bg.jpg)' }}
                >
                  {/* Dark overlay to ensure text readability */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/10 to-transparent" />
                  <span
                    className="relative z-10 text-white font-bold text-[0.95em] font-alimama tracking-wide px-1 drop-shadow-md"
                    style={{ fontFamily: "'AlimamaShuHeiTi', sans-serif" }}
                  >
                    智慧
                  </span>

                  {/* AI Powered Pill */}
                  <span className="relative z-10 ml-2 flex items-center gap-1.5 bg-black/90 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/25 shadow-lg">
                    <span className="w-3.5 h-3.5 rounded-full border border-[#a3e635] flex items-center justify-center text-[#a3e635]">
                      <Zap className="w-2 h-2" />
                    </span>
                    <span className="text-white text-[10px] font-medium whitespace-nowrap tracking-wider">AI 驱动</span>
                  </span>
                </span>
                <span>农业系统</span>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-[#666] text-[12px] max-w-[420px] mt-3 leading-relaxed font-medium"
            >
              AI 驱动的物联网草莓种植 management platform，优化种植成本，最大化产量与品质。
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-[380px] mt-3 mb-3"
          >
            <div className="mb-3 pb-3 border-b border-[#e4e2dd]">
              <h2 className="text-[15px] font-bold text-[#111]">{title}</h2>
              <p className="text-[11px] text-[#888] mt-1">{subtitle}</p>
            </div>
            {children}
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 lg:mt-6 pt-2 pb-2"
          >
            <div className="inline-flex p-1.5 rounded-full bg-gradient-to-r from-[#4a8c3f] to-[#7bb96e] shadow-lg">
              <Link href="/" className="flex items-center gap-3 bg-black text-white rounded-full px-5 py-2.5 hover:bg-black/80 transition-colors">
                <span className="text-xs font-medium">探索平台</span>
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-black">
                  <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            </div>
          </motion.div>
          <div className="h-6 lg:h-8 w-full flex-shrink-0" />
        </div>

        {/* === RIGHT PANEL === */}
        <div className="exact-right-panel">

          {/* Top Right Contact Pill - Floating above image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute top-8 right-8 z-20 flex items-center gap-2"
          >
            <Link href="/register" className="flex items-center gap-2 bg-black text-white rounded-full p-1 pl-4 shadow-lg hover:scale-105 transition-transform">
              <span className="text-xs font-medium">联系我们</span>
              <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-black">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/50 shadow-lg bg-black">
              <img src="/logo.png" alt="Avatar" className="w-full h-full object-cover" />
            </div>
          </motion.div>

          {/* Image Container */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="w-full h-full rounded-[24px] overflow-hidden relative shadow-lg bg-black"
          >
            <video
              key={videoSrc}
              ref={videoRef}
              src={videoSrc}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onError={handleVideoError}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Platform Introduction Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col justify-between p-5 lg:p-7 pb-14 lg:pb-16 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="self-start max-w-[80%]"
              >
                <h2 className="text-white font-alimama text-[22px] lg:text-[28px] font-bold leading-[1.15] tracking-tight drop-shadow-lg" style={{ fontFamily: "'AlimamaShuHeiTi', sans-serif" }}>
                  AI × IoT
                  <br />
                  重塑草莓种植
                </h2>
                <p className="mt-2.5 text-white/80 text-[11px] lg:text-xs leading-relaxed max-w-[420px] font-medium">
                  基于多模态感知与边缘智能,实时调控温室光温水气肥,
                  让每一颗草莓都可追溯、可复现、可持续。
                </p>
              </motion.div>
            </div>

            {/* Video Author Attribution */}
            <a
              href="https://www.pexels.com/@jonathan-ellis-2155635081/"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 right-3 z-10 flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 transition-colors group"
            >
              <img
                src="https://images.pexels.com/users/avatars/2155635081/jonathan-ellis-665.jpeg?auto=compress&fit=crop&h=50&w=50&dpr=2"
                alt="Jonathan Ellis"
                className="w-6 h-6 rounded-full object-cover border border-white/30"
              />
              <span className="text-[10px] text-white/90 font-medium tracking-wide group-hover:text-white">
                Video by Jonathan Ellis
              </span>
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
