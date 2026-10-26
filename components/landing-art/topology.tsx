"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useRef } from "react"
import { IconArrowRightUp } from "@/components/icon";

export function Topology() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })

  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "20%"])
  const yContent = useTransform(scrollYProgress, [0, 1], ["20%", "0%"])

  return (
    <section ref={ref} className="relative w-full px-4 pb-4 bg-white flex flex-col items-center justify-center z-20">

      {/* Massive Dark Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.8 }}
        className="relative w-full max-w-[1400px] mx-auto rounded-t-[3rem] rounded-b-[2rem] overflow-hidden min-h-[500px] flex items-center border border-zinc-800 shadow-lg"
      >

        {/* Background Image (Space/Starburst) */}
        <motion.div style={{ y: yBg }} className="absolute inset-0 z-0 pointer-events-none w-full h-[120%] -top-[10%]">
          <Image
            src="/images/grass_water.png"
            alt="Space Background"
            fill
            className="object-cover"
            priority
          />
          {/* Dark Overlays to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </motion.div>

        {/* Content Area */}
        <motion.div style={{ y: yContent }} className="relative z-10 w-full px-10 md:px-24 py-20 flex flex-col md:flex-row items-center justify-between gap-16">

          {/* Left Title */}
          <div className="flex-1 w-full text-center md:text-left">
            <h2 className="text-4xl md:text-5xl lg:text-[3.5rem] font-medium tracking-tight text-white leading-[1.1] font-alimama">
              释放<br />
              AI+IoT的<br />
              无限潜能
            </h2>
          </div>

          {/* Right Content */}
          <div className="flex-1 w-full max-w-sm ml-auto flex flex-col items-center md:items-start text-center md:text-left">
            <p className="text-zinc-300 font-medium text-sm leading-relaxed mb-8 font-alimama">
              从手动管理IoT设备到AI自主编排，我们正站在智慧农业的起点，让每一台设备都有AI大脑。
            </p>

            <Link href="/dashboard" className="px-6 py-3 bg-emerald-500 text-white rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-[0_0_20px_rgba(59,130,246,0.4)]">
              开启未来 <IconArrowRightUp className="w-4 h-4" />
            </Link>
          </div>

        </motion.div>

        {/* Decorative Bottom Elements */}
        <div className="absolute bottom-0 left-0 w-full h-1 z-20 flex justify-center items-end">
          <div className="w-1/2 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_20px_rgba(59,130,246,1)]" />
        </div>

        {/* Glowing Orbs at the bottom */}
        <div className="absolute bottom-[-20px] left-[30%] w-10 h-10 bg-emerald-500 rounded-full blur-xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-[-10px] left-[70%] w-8 h-8 bg-teal-400 rounded-full blur-lg opacity-60 pointer-events-none" />
        <div className="absolute bottom-[-30px] left-[50%] w-20 h-20 bg-green-500 rounded-full blur-2xl opacity-50 pointer-events-none" />

      </motion.div>

    </section>
  )
}
