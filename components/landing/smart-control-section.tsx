"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import { Cpu, Wind, Droplets, Sun, CheckCircle2 } from "lucide-react"

export function SmartControlSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  const y = useTransform(scrollYProgress, [0, 1], [100, -100])
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.8, 1], [0, 1, 1, 0])

  return (
    <section ref={containerRef} className="py-32 px-4 relative z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Text Content */}
        <motion.div 
          style={{ opacity, x: useTransform(scrollYProgress, [0, 0.5], [-50, 0]) }}
          className="space-y-8"
        >

          
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            把农场交给 AI，<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              让种植更省心
            </span>
          </h2>
          
          <p className="text-gray-400 text-lg leading-relaxed">
            Stravision 的智能大脑会根据环境数据自动调节设备。
            无论是开启风机降温，还是自动补光，一切都在毫秒间完成。
            您只需设定目标，剩下的交给我们。
          </p>

          <div className="space-y-4">
            {[
              "自适应环境调控算法",
              "异常情况实时预警",
              "多设备协同工作策略",
              "节能优化运行模式"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-gray-300">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Interactive Visual */}
        <div className="relative">
          <motion.div 
            style={{ y }}
            className="relative bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-3xl p-8 shadow-2xl"
          >
            {/* Simulation Header */}
            <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
              <span className="text-sm text-gray-400 font-mono">AI_CORE_STATUS</span>
              <span className="flex items-center gap-2 text-xs text-green-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                RUNNING
              </span>
            </div>

            {/* Metrics Simulation */}
            <div className="space-y-6">
              {[
                { label: "温度 (Temperature)", icon: Wind, color: "text-blue-400", bg: "bg-blue-500" },
                { label: "湿度 (Humidity)", icon: Droplets, color: "text-cyan-400", bg: "bg-cyan-500" },
                { label: "光照 (Light)", icon: Sun, color: "text-yellow-400", bg: "bg-yellow-500" },
              ].map((metric, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-300">
                      <metric.icon className={`w-4 h-4 ${metric.color}`} />
                      {metric.label}
                    </span>
                    <span className="text-gray-500 font-mono">OPTIMIZING...</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${metric.bg}`}
                      initial={{ width: "30%" }}
                      whileInView={{ width: ["30%", "85%", "60%"] }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        repeatType: "reverse",
                        delay: i * 0.5 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Central Processing Node Visual */}
            <div className="mt-8 flex justify-center">
              <div className="relative">
                 <div className="absolute inset-0 bg-purple-500/30 blur-xl rounded-full" />
                 <Cpu className="w-16 h-16 text-purple-400 relative z-10 animate-pulse" />
              </div>
            </div>
          </motion.div>
          
          {/* Decorative Elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
      </div>
    </section>
  )
}
