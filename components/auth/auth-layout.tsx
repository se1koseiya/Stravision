"use client"

import { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Leaf, Zap, Droplets, Eye, BarChart3, Thermometer, Network, Compass, Cpu } from "lucide-react"

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
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
            width: 55% !important;
            padding: 3rem 4rem !important;
            height: calc(100vh - 48px - 2px) !important;
            max-height: calc(100vh - 48px - 2px) !important;
            min-height: 0 !important;
          }
          .exact-right-panel {
            display: block !important;
            width: 45% !important;
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
          <div className="mt-4 lg:mt-6 mb-2">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-[2.8rem] lg:text-[3.2rem] xl:text-[3.8rem] font-bold leading-[1.15] tracking-tight text-[#111] font-alimama"
              style={{ fontFamily: "'AlimamaShuHeiTi', sans-serif" }}
            >
              <span className="block mb-2">用 AI 重塑</span>
              <span className="flex items-center gap-2 xl:gap-3 mb-2 flex-wrap">
                未来的
                <span
                  className="relative flex items-center h-[1.2em] rounded-full pl-6 pr-2 bg-cover bg-center shadow-inner overflow-hidden"
                  style={{ backgroundImage: 'url(/images/exact/bg.jpg)' }}
                >
                  {/* Dark overlay to ensure text readability */}
                  <div className="absolute inset-0 bg-black/15" />
                  <span className="relative z-10 text-white font-bold text-[0.85em] font-alimama" style={{ fontFamily: "'AlimamaShuHeiTi', sans-serif" }}>智慧</span>

                  {/* AI Powered Pill */}
                  <span className="relative z-10 ml-3 flex items-center gap-1.5 bg-black rounded-full px-3 py-1.5 border border-white/20 shadow-md">
                    <span className="w-4 h-4 rounded-full border border-[#a3e635] flex items-center justify-center text-[#a3e635]">
                      <Zap className="w-2.5 h-2.5" />
                    </span>
                    <span className="text-white text-[10px] font-medium whitespace-nowrap">AI 驱动</span>
                  </span>
                </span>
              </span>
              <span className="block">农业系统</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-[#666] text-xs max-w-[420px] mt-2.5 leading-relaxed font-medium"
            >
              AI 驱动的物联网草莓种植 management platform，优化种植成本，最大化产量与品质。
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-[380px] mt-1 mb-4"
          >
            <div className="mb-4">
              <h2 className="text-lg font-bold text-[#111]">{title}</h2>
              <p className="text-xs text-[#888]">{subtitle}</p>
            </div>
            {children}
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 lg:mt-10 pt-4 pb-2"
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
            className="w-full h-full rounded-[20px] overflow-hidden relative shadow-lg"
          >
            <img src="/images/exact/bg.jpg" alt="Hero" className="w-full h-full object-cover" />

            {/* Badges layer */}
            <div className="absolute inset-0 pointer-events-none">

              {/* Line 1 - Smart Grid Ready */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="absolute top-[28%] left-[22%] flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,1)]" />
                <div className="h-[1px] w-8 bg-white/40" />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/50">
                    <Network className="w-3 h-3" />
                  </div>
                  <span className="text-xs text-white/60 font-light">Smart Grid Ready</span>
                </div>
              </motion.div>

              {/* Line 2 - Energy Optimization */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="absolute top-[38%] left-[26%] flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,1)]" />
                <div className="h-[1px] w-6 bg-white/40" />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/30 backdrop-blur-md border border-white/20">
                  <div className="w-5 h-5 rounded-full bg-[#5b6a55]/30 flex items-center justify-center text-[#c2f352]">
                    <Zap className="w-3 h-3" />
                  </div>
                  <span className="text-xs text-[#1c2e17] font-medium">Energy Optimization</span>
                </div>
              </motion.div>

              {/* Line 3 - Sustainable Systems (Solid White) */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute top-[48%] left-[16%] flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-black shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
                <div className="h-[1.5px] w-10 bg-white/80" />
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-xl">
                  <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-[#c2f352]">
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs text-black font-bold tracking-wide">Sustainable Systems</span>
                </div>
              </motion.div>

              {/* Line 4 - Autonomous Control */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
                className="absolute top-[60%] left-[24%] flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,1)]" />
                <div className="h-[1px] w-6 bg-white/40" />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7c8f74]/30 backdrop-blur-md border border-white/10">
                  <div className="w-5 h-5 rounded-full bg-[#1c2e17] flex items-center justify-center text-[#9fe635]">
                    <Cpu className="w-3 h-3" />
                  </div>
                  <span className="text-xs text-[#1c2e17] font-semibold">Autonomous Control</span>
                </div>
              </motion.div>

              {/* Line 5 - Carbon Aware */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
                className="absolute top-[72%] left-[18%] flex items-center gap-2 opacity-60"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,1)]" />
                <div className="h-[1px] w-8 bg-white/40" />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/5">
                  <div className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-white/50">
                    <Leaf className="w-3 h-3" />
                  </div>
                  <span className="text-xs text-[#2b3a26] font-medium">Carbon Aware</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
