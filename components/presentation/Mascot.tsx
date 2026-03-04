"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { cn } from "@/lib/utils"

type MascotPose = "hello" | "run" | "sit" | "dance" | "jump" | "sayhi" | "phone"

const POSE_MAP: Record<MascotPose, string> = {
  hello: "/ip/hello.png",
  sayhi: "/ip/sayhi.png",
  run: "/ip/草莓头IP-奔跑姿势.png",
  sit: "/ip/草莓头IP-坐姿玩手机.png",
  phone: "/ip/草莓头IP-坐姿玩手机.png", // Alias
  dance: "/ip/草莓头IP-舞蹈姿势.png",
  jump: "/ip/草莓头IP-跳跃姿势.png"
}

interface MascotProps {
  pose?: MascotPose
  className?: string
  animate?: boolean
  delay?: number
  glowColor?: string
}

export function Mascot({ 
  pose = "hello", 
  className, 
  animate = true,
  delay = 0,
  glowColor = "emerald"
}: MascotProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "backOut", delay }}
      className={cn("relative z-20 flex items-center justify-center", className)}
    >
      {/* Background Glow */}
      <div 
        className={cn(
          "absolute inset-0 blur-[60px] rounded-full opacity-60 animate-pulse-slow",
          glowColor === "emerald" && "bg-emerald-500/30",
          glowColor === "blue" && "bg-blue-500/30",
          glowColor === "purple" && "bg-purple-500/30",
          glowColor === "rose" && "bg-rose-500/30"
        )} 
      />
      
      {/* Image Container */}
      <motion.div
        animate={animate ? { y: [0, -15, 0] } : {}}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "easeInOut",
          delay: Math.random() // Randomize phase
        }}
        className="relative z-10 w-full h-full"
      >
        <Image
          src={POSE_MAP[pose]}
          alt={`Mascot ${pose}`}
          fill
          className="object-contain drop-shadow-2xl"
          priority
        />
      </motion.div>
    </motion.div>
  )
}
