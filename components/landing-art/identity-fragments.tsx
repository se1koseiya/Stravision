"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef, useEffect } from "react"
import { useMascot } from "./mascot-context"
import Image from "next/image"

interface FragmentProps {
  text: string
  subText: string
  iconPath: string
  index: number
}

function FragmentItem({ text, subText, iconPath, index }: FragmentProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { setState } = useMascot()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.4, 1], [0, 1, 1])
  const y = useTransform(scrollYProgress, [0, 1], [100, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1])
  
  // Icon animation transforms
  const iconY = useTransform(scrollYProgress, [0, 1], [150, -20])
  const iconRotate = useTransform(scrollYProgress, [0, 1], [index % 2 === 0 ? -15 : 15, 0])

  return (
    <motion.div
      ref={ref}
      style={{ opacity, y, scale }}
      className="min-h-[90vh] flex items-center justify-center relative pointer-events-auto w-full"
      onViewportEnter={() => setState("thinking")}
    >
      <div className={`flex items-center gap-12 md:gap-24 w-full max-w-6xl mx-auto px-6 ${index % 2 !== 0 ? 'flex-row-reverse' : ''}`}>
        
        {/* Text Section */}
        <div className="flex-1 space-y-4 mix-blend-difference z-10">
          <h2 className="text-6xl md:text-8xl font-jinbuti font-bold text-white tracking-tighter leading-none">
            {text}
          </h2>
          <p className="text-xl text-muted-foreground font-jinbuti tracking-widest uppercase">
            {subText}
          </p>
        </div>

        {/* 3D Icon Section */}
        <motion.div 
          className="flex-1 relative h-[300px] md:h-[500px] hidden md:block"
          style={{ y: iconY, rotate: iconRotate }}
        >
          <div className="relative w-full h-full">
            <Image
              src={iconPath}
              alt={text}
              fill
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function IdentityFragments() {
  const fragments = [
    {
      text: "我在看",
      subText: "Visual Data Processing",
      iconPath: "/ip/智慧农业3D图标-数据监测-细线版.png"
    },
    {
      text: "我在想",
      subText: "Growth Model Analysis",
      iconPath: "/ip/智慧农业3D图标-作物检测-细线版.png"
    },
    {
      text: "我在执行",
      subText: "Autonomous Intervention",
      iconPath: "/ip/智慧农业3D图标-无人机巡检-细线版.png"
    }
  ]

  return (
    <section className="relative z-10 py-20">
      {fragments.map((f, i) => (
        <FragmentItem key={i} {...f} index={i} />
      ))}
    </section>
  )
}
