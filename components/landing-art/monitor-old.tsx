"use client"

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { ReactNode, useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { cn } from "@/lib/utils"

// 3D Tilt Card Wrapper (Industrial Version)
function IndustrialCard({ children, className, delay = 0 }: { children: ReactNode, className?: string, delay?: number }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  const mouseX = useSpring(x, { stiffness: 500, damping: 100 })
  const mouseY = useSpring(y, { stiffness: 500, damping: 100 })
  
  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["5deg", "-5deg"])
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-5deg", "5deg"])

  function onMouseMove(e: React.MouseEvent) {
    const rect = e.currentTarget.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseXVal = e.clientX - rect.left
    const mouseYVal = e.clientY - rect.top
    const xPct = mouseXVal / width - 0.5
    const yPct = mouseYVal / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => {
        x.set(0)
        y.set(0)
      }}
      className={cn("perspective-1000 group relative", className)}
    >
      <GlassCard 
        className="h-full w-full bg-[#0a0a0a]/80 border-white/10 p-6 overflow-hidden transition-all duration-300 group-hover:border-emerald-500/50"
        style={{ transform: "translateZ(20px)" }}
        hoverEffect={false}
      >
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-white/30 group-hover:border-emerald-500 transition-colors" />
        <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-white/30 group-hover:border-emerald-500 transition-colors" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-white/30 group-hover:border-emerald-500 transition-colors" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-white/30 group-hover:border-emerald-500 transition-colors" />
        
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

        {children}
      </GlassCard>
    </motion.div>
  )
}

export function Monitor() {
  const [activeTab, setActiveTab] = useState(0)

  // Simulated live data
  const [temp, setTemp] = useState(24.5)
  useEffect(() => {
    const interval = setInterval(() => {
      setTemp(prev => prev + (Math.random() - 0.5) * 0.2)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="min-h-screen w-full flex items-center justify-center px-4 md:px-24 py-24 relative">
      <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-16 items-start">
        
        {/* Left Side: Typography & Description */}
        <div className="flex-1 space-y-12 sticky top-24">
          <div>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 mb-6"
            >
              <div className="w-12 h-[1px] bg-emerald-500" />
              <span className="text-emerald-500 font-jinbuti text-sm tracking-widest">环境监测系统</span>
            </motion.div>
            
            <h2 className="text-5xl md:text-7xl font-jinbuti leading-[1.1] mb-8">
              温度、光、空气。<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-200">
                数据即状态。
              </span>
            </h2>
            
            <p className="text-xl font-jinbuti text-white/60 max-w-lg leading-relaxed">
              实时监控环境指标，当数据异常时，系统会自动触发警报并执行预设逻辑。这不是简单的仪表盘，而是整个农场的神经中枢。
            </p>
          </div>

          <div className="flex gap-4">
            {["概览", "详情", "日志"].map((tab, i) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(i)}
                className={cn(
                  "px-6 py-2 border font-jinbuti text-sm transition-all",
                  activeTab === i 
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" 
                    : "border-white/10 text-white/40 hover:border-white/30"
                )}
              >
                0{i+1} // {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Dashboard Grid */}
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Module 1: Temperature */}
          <IndustrialCard className="md:col-span-2">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-lg font-jinbuti font-bold tracking-wide">温度</h3>
                <span className="text-xs text-emerald-500/60 font-jinbuti">传感器ID: T-2049</span>
              </div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
            </div>
            
            <div className="flex items-end gap-4">
              <span className="text-7xl font-jinbuti text-white tracking-tighter">
                {temp.toFixed(1)}
              </span>
              <span className="text-xl text-white/40 mb-2 font-jinbuti">°C</span>
            </div>
            
            {/* Graph Visualization */}
            <div className="h-16 w-full mt-6 flex items-end gap-[2px] opacity-50">
               {Array.from({ length: 40 }).map((_, i) => (
                 <motion.div 
                   key={i}
                   className="flex-1 bg-emerald-500"
                   initial={{ height: "20%" }}
                   animate={{ height: `${20 + Math.random() * 60}%` }}
                   transition={{ duration: 1, repeat: Infinity, repeatType: "reverse", delay: i * 0.05 }}
                 />
               ))}
            </div>
          </IndustrialCard>

          {/* Module 2: Humidity */}
          <IndustrialCard delay={0.2}>
             <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-jinbuti font-bold tracking-wide text-white/80">湿度</h3>
                <span className="text-[10px] text-white/40 font-jinbuti">H-102</span>
             </div>
             <div className="relative w-full aspect-square flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                  <motion.circle 
                    cx="50" cy="50" r="40" 
                    stroke="#10b981" 
                    strokeWidth="8" 
                    fill="none" 
                    strokeDasharray="251.2"
                    strokeDashoffset="251.2"
                    whileInView={{ strokeDashoffset: 251.2 * 0.4 }} // 60%
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-jinbuti font-bold">62%</span>
                  <span className="text-[10px] text-white/40 font-jinbuti">最佳</span>
                </div>
             </div>
          </IndustrialCard>

          {/* Module 3: CO2 */}
          <IndustrialCard delay={0.4}>
             <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-jinbuti font-bold tracking-wide text-white/80">二氧化碳浓度</h3>
                <span className="text-[10px] text-white/40 font-jinbuti">C-882</span>
             </div>
             <div className="space-y-4 mt-8">
               <div className="flex justify-between text-xs font-jinbuti">
                 <span className="text-white/40">当前值</span>
                 <span>420 PPM</span>
               </div>
               <div className="w-full h-1 bg-white/10">
                 <motion.div 
                   className="h-full bg-emerald-500"
                   initial={{ width: 0 }}
                   whileInView={{ width: "40%" }}
                   transition={{ duration: 1 }}
                 />
               </div>
               
               <div className="flex justify-between text-xs font-jinbuti">
                 <span className="text-white/40">峰值</span>
                 <span>450 PPM</span>
               </div>
               <div className="w-full h-1 bg-white/10">
                 <motion.div 
                   className="h-full bg-white/30"
                   initial={{ width: 0 }}
                   whileInView={{ width: "45%" }}
                   transition={{ duration: 1 }}
                 />
               </div>
             </div>
          </IndustrialCard>

        </div>
      </div>
    </section>
  )
}