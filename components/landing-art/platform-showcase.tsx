"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import Image from "next/image"

const screenshots = [
  { src: "/ui/dashboard-pc.png", title: "Global Command", subtitle: "Real-time Monitoring" },
  { src: "/ui/ai-assistant-pc.png", title: "Berry Intelligence", subtitle: "Conversational AI" },
  { src: "/ui/device-control-pc.png", title: "Precision Control", subtitle: "IoT Management" },
  { src: "/ui/monitor-pc.png", title: "Visual Analytics", subtitle: "Deep Data Insights" },
]

export function PlatformShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  // Horizontal scroll effect
  const x = useTransform(scrollYProgress, [0.1, 0.9], ["20%", "-80%"])
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])

  return (
    <section ref={containerRef} className="h-[300vh] relative z-20 pointer-events-none">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        
        {/* Background Title */}
        <div className="absolute top-12 left-12 text-white/10 font-jinbuti text-9xl tracking-tighter whitespace-nowrap select-none">
          SYSTEM INTERFACE
        </div>

        <motion.div 
          style={{ x, opacity }}
          className="flex gap-12 px-[10vw] pointer-events-auto"
        >
          {screenshots.map((shot, index) => (
            <div 
              key={index}
              className="relative flex-shrink-0 w-[80vw] md:w-[60vw] aspect-video rounded-xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-[#0A0A0A] group"
            >
              <Image
                src={shot.src}
                alt={shot.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                quality={90}
              />
              
              {/* Overlay UI */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-8 md:p-12 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <h3 className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                  {shot.title}
                </h3>
                <p className="text-lg text-red-500 font-jinbuti tracking-widest uppercase">
                  {shot.subtitle}
                </p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2">
          {screenshots.map((_, i) => (
             <div key={i} className="w-2 h-2 rounded-full bg-white/20" />
          ))}
        </div>
      </div>
    </section>
  )
}
