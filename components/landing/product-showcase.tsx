"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"

export function ProductShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  const rotateX = useTransform(scrollYProgress, [0, 0.3], [15, 0])
  const scale = useTransform(scrollYProgress, [0, 0.3], [0.9, 1])
  const opacity = useTransform(scrollYProgress, [0, 0.2], [0, 1])
  const y = useTransform(scrollYProgress, [0, 0.3], [100, 0])

  return (
    <section ref={containerRef} id="products" className="py-32 px-4 relative overflow-hidden min-h-[150vh]">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 sticky top-20" style={{ perspective: "1000px" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
            全方位的管理平台
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            无论是在桌面端还是移动端，都能轻松掌控您的农业基地
          </p>
        </motion.div>

        <div className="relative">
          {/* Browser Mockup */}
          <motion.div
            style={{ rotateX, scale, opacity, y }}
            className="relative mx-auto max-w-5xl rounded-xl border border-gray-800 bg-[#0A0A0A] shadow-2xl overflow-hidden z-10"
          >
            {/* Browser Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-[#0f0f0f]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
              <div className="flex-1 text-center">
                <div className="inline-block px-3 py-1 rounded-md bg-gray-800/50 text-xs text-gray-500 font-mono">
                  dashboard.stravision.com
                </div>
              </div>
            </div>

            {/* Content Mockup - Simplified Dashboard View */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#02040a]">
              {/* Sidebar Mockup */}
              <div className="hidden md:block col-span-1 space-y-4">
                <div className="h-8 w-32 bg-gray-800/50 rounded-lg animate-pulse" />
                <div className="space-y-2 pt-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-10 w-full bg-gray-800/20 rounded-lg" />
                  ))}
                </div>
              </div>

              {/* Main Content Mockup */}
              <div className="col-span-2 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-32 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-4">
                      <div className="h-6 w-6 rounded-full bg-blue-500/20 mb-2" />
                      <div className="h-4 w-20 bg-gray-700/50 rounded mb-2" />
                      <div className="h-8 w-16 bg-blue-500/20 rounded" />
                  </div>
                  <div className="h-32 rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 p-4">
                      <div className="h-6 w-6 rounded-full bg-purple-500/20 mb-2" />
                      <div className="h-4 w-20 bg-gray-700/50 rounded mb-2" />
                      <div className="h-8 w-16 bg-purple-500/20 rounded" />
                  </div>
                </div>
                <div className="h-64 rounded-xl bg-gray-800/10 border border-gray-800 p-4">
                  <div className="flex items-end gap-2 h-full pb-4 px-4">
                      {[40, 60, 45, 70, 50, 80, 65, 85, 75, 90, 60, 50].map((h, i) => (
                          <div key={i} className="flex-1 bg-blue-500/20 rounded-t-sm hover:bg-blue-500/40 transition-colors" style={{ height: `${h}%` }} />
                      ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-transparent to-transparent pointer-events-none" />
          </motion.div>

          {/* Mobile Phone Mockup */}
          <motion.div
            style={{ y: useTransform(scrollYProgress, [0, 0.5], [200, -50]), x: "50%", opacity }}
            className="absolute -bottom-20 right-20 w-[280px] h-[580px] rounded-[3rem] border-8 border-gray-800 bg-[#02040a] shadow-2xl z-20 overflow-hidden hidden md:block"
          >
             {/* Notch */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-gray-800 rounded-b-2xl z-20" />
             
             {/* Mobile Content */}
             <div className="p-4 pt-12 h-full flex flex-col gap-4">
                <div className="h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 p-3">
                   <div className="h-4 w-12 bg-blue-500/20 rounded mb-2" />
                   <div className="h-8 w-24 bg-gray-700/50 rounded" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="aspect-square rounded-2xl bg-gray-800/30 p-3">
                      <div className="h-8 w-8 rounded-full bg-purple-500/20 mb-2" />
                   </div>
                   <div className="aspect-square rounded-2xl bg-gray-800/30 p-3">
                      <div className="h-8 w-8 rounded-full bg-green-500/20 mb-2" />
                   </div>
                </div>
                <div className="flex-1 rounded-2xl bg-gray-800/10 border border-gray-800 p-3">
                   <div className="space-y-2">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-12 w-full bg-gray-800/30 rounded-xl" />
                      ))}
                   </div>
                </div>
             </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
