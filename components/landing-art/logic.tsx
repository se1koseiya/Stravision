"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Qwen, DeepSeek, Moonshot, Zhipu, Minimax } from '@lobehub/icons'
import { useRef } from "react"
import { IconArrowRightUp } from "@/components/icon";

export function Logic() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })

  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const yContent = useTransform(scrollYProgress, [0, 1], ["10%", "-10%"])

  return (
    <section ref={ref} className="relative w-full py-24 bg-white flex flex-col items-center justify-center z-20 overflow-hidden">

      {/* Background Glow Blobs for Glass Effect */}
      <motion.div style={{ y: yBg }} className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full" />
      </motion.div>

      {/* Header Area */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-3xl px-4 mb-16 flex flex-col items-center relative z-10"
      >



        <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-[#1a202c] leading-[1.1] font-alimama">
          你的IoT设备已就位<br />
          但它们需要 <span className="text-blue-500 border-b-2 border-blue-500/30 pb-1">一个AI大脑</span><br />
          来统一指挥。
        </h2>
      </motion.div>

      {/* Two Cards Grid */}
      <motion.div
        style={{ y: yContent }}
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10"
      >

        {/* Left Card - Text & Coins */}
        <div className="relative bg-[#0b1021]/80 backdrop-blur-2xl rounded-3xl p-10 overflow-hidden flex flex-col min-h-[400px] shadow-[0_32px_64px_rgba(0,0,0,0.3)] border border-white/10">

          {/* Top Badge */}
          <div className="flex justify-center mb-8 relative z-10">
            <div className="bg-white/10 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-2 border border-white/10">
              <span className="text-[10px] text-white font-medium uppercase tracking-wider">AI 智能体</span>
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px]">↗</div>
            </div>
          </div>

          {/* Text */}
          <div className="text-center relative z-10 mb-8">
            <p className="text-xl md:text-2xl text-white font-medium leading-snug font-alimama">
              AI智能体 <span className="text-blue-400">实时分析传感器数据</span><br />
              自主推理后 <span className="border-b border-white/30 pb-0.5">直接调度IoT设备<br />
                完成执行</span>，无需人工干预。
            </p>
          </div>

          {/* Button */}
          <div className="flex justify-center relative z-10 mt-auto mb-16">
            <Link href="/ai-assistant" className="px-5 py-2 bg-blue-500 text-white rounded-full text-xs font-semibold flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:bg-blue-600 transition-colors">
              了解详情 <IconArrowRightUp className="w-3 h-3" />
            </Link>
          </div>

          {/* Bottom Row (AI Model Provider Icons) */}
          <div className="absolute bottom-6 left-0 w-full flex justify-center items-center gap-4 z-10">
            {/* Connection line behind */}
            <div className="absolute top-1/2 left-10 right-10 h-[2px] bg-white/10 -translate-y-1/2 z-0" />

            <div className="transform hover:-translate-y-2 transition-transform z-10 hover:scale-110">
              <Qwen.Color size={40} />
            </div>
            <div className="transform hover:-translate-y-2 transition-transform z-10 hover:scale-110">
              <DeepSeek.Color size={48} />
            </div>
            <div className="transform hover:-translate-y-2 transition-transform z-20 scale-125 hover:scale-[1.35]">
              <Moonshot size={56} className="text-white drop-shadow-lg" />
            </div>
            <div className="transform hover:-translate-y-2 transition-transform z-10 hover:scale-110">
              <Zhipu.Color size={48} />
            </div>
            <div className="transform hover:-translate-y-2 transition-transform z-10 hover:scale-110">
              <Minimax.Color size={40} />
            </div>
          </div>

          {/* Background Glows */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/20 blur-[60px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-500/20 blur-[60px] rounded-full" />
          </div>
        </div>

        {/* Right Card - Image & Stats */}
        <div className="relative bg-[#1a1c23]/80 backdrop-blur-2xl rounded-3xl overflow-hidden flex flex-col min-h-[400px] shadow-[0_32px_64px_rgba(0,0,0,0.3)] group border border-white/10">

          <Image
            src="/images/exact/ability.png"
            alt="Woman holding phone"
            fill
            className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 filter contrast-125 saturate-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-[#0a0f1a]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1a]/80 to-transparent" />

          <div className="relative z-10 p-8 flex flex-col h-full justify-between">

            {/* Top left mini-nav */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/20 backdrop-blur-md rounded-md flex items-center justify-center border border-white/30">
                <div className="w-3 h-3 border-2 border-white rounded-sm" />
              </div>
              <span className="text-white/80 font-medium text-sm tracking-wide font-alimama">AI Agent</span>
            </div>

            {/* Bottom Info */}
            <div className="mt-auto">
              <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2 font-alimama">健康指数</div>
              <div className="text-white text-3xl font-bold mb-1 tracking-tight flex items-end gap-2 font-alimama">
                98<span className="text-xl text-white/50">.5</span>
                <span className="text-xs text-green-400 mb-1 ml-1 font-normal font-alimama">最优区间</span>
              </div>
              <div className="text-blue-400 font-medium text-sm font-alimama">
                运行极佳 <span className="text-blue-400/60 text-xs font-alimama">无告警</span>
              </div>

              {/* Decorative line */}
              <div className="w-full h-[1px] bg-white/10 mt-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2/3 h-full bg-green-500" />
              </div>
            </div>

          </div>
        </div>

      </motion.div>

    </section>
  )
}
