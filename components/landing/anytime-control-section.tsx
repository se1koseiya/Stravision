"use client"

import { DeviceControlIOSMock } from "./device-control-ios-mock"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import { Smartphone, Wifi, ShieldCheck } from "lucide-react"

export function AnytimeControlSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.8, 1], [0, 1, 1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.8, 1])

  return (
    <section ref={containerRef} className="py-32 px-4 relative z-10 overflow-hidden bg-gradient-to-b from-transparent to-[#050a15]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Interactive Visual - Map/Connection */}
        <div className="order-2 lg:order-1 relative flex justify-center">
          <motion.div 
            style={{ scale, opacity }}
            className="relative"
          >
             {/* Phone Frame - Titanium Style */}
             <div className="relative w-[300px] h-[600px] bg-black rounded-[3.5rem] p-[5px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-[4px] border-[#3a3a3c] ring-1 ring-[#1a1a1c] mx-auto transform rotate-[-5deg] hover:rotate-0 transition-all duration-700 ease-out">
                
                {/* Inner Bezel */}
                <div className="relative w-full h-full bg-black rounded-[3.2rem] border-[6px] border-black overflow-hidden ring-1 ring-white/10">
                   
                   {/* Screen Content */}
                   <div className="w-full h-full bg-white rounded-[2.8rem] overflow-hidden relative">
                      <DeviceControlIOSMock />
                      
                      {/* Dynamic Island */}
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[90px] h-[26px] bg-black rounded-full z-50 flex items-center justify-between px-3">
                          <div className="size-2 bg-[#1a1a1a] rounded-full opacity-60"></div>
                          <div className="size-1.5 bg-[#0a0a0a] rounded-full opacity-60"></div>
                      </div>
                      
                      {/* Screen Reflections */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none z-40 opacity-40 rounded-[2.8rem]" />
                      <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/20 blur-[80px] pointer-events-none z-40 mix-blend-overlay" />
                   </div>
                </div>
                
                {/* Side Buttons (Refined) */}
                <div className="absolute top-28 -left-[5px] w-[3px] h-7 bg-[#2a2a2a] rounded-l-md shadow-sm border-r border-[#1a1a1a]"></div>
                <div className="absolute top-40 -left-[5px] w-[3px] h-12 bg-[#2a2a2a] rounded-l-md shadow-sm border-r border-[#1a1a1a]"></div>
                <div className="absolute top-44 -left-[5px] w-[3px] h-12 bg-[#2a2a2a] rounded-l-md shadow-sm border-r border-[#1a1a1a]"></div>
                <div className="absolute top-32 -right-[5px] w-[3px] h-20 bg-[#2a2a2a] rounded-r-md shadow-sm border-l border-[#1a1a1a]"></div>
             </div>
          </motion.div>
        </div>

        {/* Text Content */}
        <motion.div 
          style={{ opacity, x: useTransform(scrollYProgress, [0, 0.5], [50, 0]) }}
          className="order-1 lg:order-2 space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
            <Smartphone className="w-4 h-4" />
            <span>随时随地</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            哪怕远在千里之外，<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              农场尽在掌握
            </span>
          </h2>
          
          <p className="text-gray-400 text-lg leading-relaxed">
            不管您是在家中休息，还是外出度假，拿出手机即可查看实时监控画面。
            低延迟的视频流传输，让您仿佛身临其境。
          </p>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-2xl bg-gray-900/50 border border-gray-800">
                <ShieldCheck className="w-8 h-8 text-blue-400 mb-2" />
                <h3 className="font-semibold text-white">安全加密</h3>
                <p className="text-sm text-gray-500">银行级数据传输加密</p>
             </div>
             <div className="p-4 rounded-2xl bg-gray-900/50 border border-gray-800">
                <Wifi className="w-8 h-8 text-green-400 mb-2" />
                <h3 className="font-semibold text-white">极速连接</h3>
                <p className="text-sm text-gray-500">全球节点加速网络</p>
             </div>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
