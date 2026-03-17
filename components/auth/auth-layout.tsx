"use client"

import { ReactNode } from "react"
import { DynamicBackground } from "@/components/landing-art/dynamic-background"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen w-full flex bg-[#050505] text-white selection:bg-emerald-500/30 overflow-hidden font-sans">
      {/* 全局背景 */}
      <DynamicBackground />
      
      {/* 装饰性网格层 - 增加深度 */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20" />
      </div>

      {/* 左侧品牌区域 - 仅在大屏显示 */}
      <div className="hidden lg:flex w-1/2 relative z-10 flex-col justify-between p-12 xl:p-20">
        <div className="flex items-center gap-3">
           <Image src="/logo.svg" alt="莓界" width={48} height={48} className="w-12 h-12" />
           <div className="flex flex-col">
             <span className="text-xl font-jinbuti tracking-widest text-white">莓界</span>
             <span className="text-[10px] font-mono text-emerald-500/60 tracking-[0.3em]">STRAVISION OS</span>
           </div>
        </div>

        <div className="relative">
          {/* 装饰性光晕 */}
          <div className="absolute -left-20 -top-20 w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full animate-pulse" />
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl xl:text-7xl font-jinbuti leading-tight mb-6 relative z-10"
          >
            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">万物互联</span>
            <span className="block text-emerald-500">智慧生长</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg text-white/40 max-w-md font-light leading-relaxed"
          >
            下一代农业物联网操作系统。
            <br />
            连接每一寸土壤，感知每一次呼吸。
          </motion.p>
        </div>

        <div className="flex items-center gap-8 text-xs font-mono text-white/20">
          <span>© 2025 STRAVISION</span>
          <div className="h-px w-8 bg-white/10" />
          <span>V2.4.0 STABLE</span>
        </div>
      </div>

      {/* 右侧表单区域 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-[420px]"
        >
          {/* 移动端 Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12 justify-center">
             <Image src="/icon.png" alt="莓界" width={40} height={40} className="w-10 h-10" />
             <span className="text-xl font-jinbuti tracking-widest text-white">莓界</span>
          </div>

          <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-emerald-900/10 relative overflow-hidden group">
            {/* 卡片顶部的流光 */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-jinbuti text-white mb-2">{title}</h2>
              <p className="text-sm text-white/40">{subtitle}</p>
            </div>

            {children}
            
            {/* 底部装饰 */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
