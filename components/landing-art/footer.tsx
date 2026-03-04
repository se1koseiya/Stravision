"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"

export function Footer() {
  const [latency, setLatency] = useState(12)
  const [buildId, setBuildId] = useState("INIT")

  // 模拟延迟数据跳动
  useEffect(() => {
    const timer = setInterval(() => {
      setLatency(prev => Math.floor(Math.max(8, Math.min(24, prev + (Math.random() - 0.5) * 8))))
    }, 2000)
    return () => clearInterval(timer)
  }, [])

  // 模拟构建ID生成
  useEffect(() => {
    setBuildId(`V2.4.${Math.floor(Math.random() * 999)}`)
  }, [])

  return (
    <footer className="w-full relative mt-32 pointer-events-auto overflow-hidden">
      {/* 顶部渐变分割线 */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-30" />
      
      {/* 装饰性光点，在分割线上移动 */}
      <motion.div 
        className="absolute top-0 w-20 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#34d399]"
        animate={{ left: ["-10%", "110%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-8 text-[10px] md:text-xs font-mono tracking-wider text-white/20">
        
        {/* 左侧：版权信息 */}
        <div className="flex flex-col items-center md:items-start gap-2 group">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors duration-500" />
            <span className="group-hover:text-white/40 transition-colors duration-300">© 2025 STRAVISION IOT</span>
          </div>
          <span className="text-[9px] opacity-50 scale-90 origin-left">ALL RIGHTS RESERVED.</span>
        </div>

        {/* 中间：备案号 */}
        <div className="flex flex-col items-center gap-4">
           {/* 装饰性垂直线 */}
           <div className="h-8 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent md:hidden" />
           
           <a 
              href="https://beian.miit.gov.cn/" 
              target="_blank" 
              rel="noreferrer"
              className="group relative px-4 py-2 flex items-center gap-2"
            >
              <span className="w-1 h-1 bg-white/10 rounded-full group-hover:bg-emerald-500 transition-colors duration-300" />
              <span className="relative z-10 group-hover:text-emerald-500/60 transition-colors duration-500 uppercase">
                浙ICP备2025182918号-1
              </span>
              
              {/* 左右括号装饰，Hover时显现 */}
              <span className="absolute left-0 opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 text-emerald-500/40">[</span>
              <span className="absolute right-0 opacity-0 translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 text-emerald-500/40">]</span>
            </a>
        </div>

        {/* 右侧：系统状态 */}
        <div className="flex flex-col items-center md:items-end gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="uppercase text-white/10">System</span>
              <span className="text-emerald-500/60">ONLINE</span>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="uppercase text-white/10">Latency</span>
              <span className="tabular-nums w-8 text-right hover:text-emerald-500/60 transition-colors cursor-crosshair">{latency}ms</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[9px] opacity-30">
             <span>BUILD: {buildId}</span>
             <span>//</span>
             <span>LOC: HANGZHOU</span>
          </div>
        </div>

      </div>
      
      {/* 底部微弱背景装饰 */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-emerald-900/5 to-transparent pointer-events-none" />
    </footer>
  )
}
