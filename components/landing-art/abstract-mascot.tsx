"use client"

import { motion, useSpring, useTransform } from "framer-motion"
import { useEffect, useState } from "react"

export type MascotMood = "calm" | "alert" | "happy" | "thinking"

interface AbstractMascotProps {
  mood: MascotMood
  onClick?: () => void
}

export function AbstractMascot({ mood, onClick }: AbstractMascotProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  
  // Eye tracking logic
  const springConfig = { damping: 25, stiffness: 150 }
  const x = useSpring(0, springConfig)
  const y = useSpring(0, springConfig)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window
      const xPct = (e.clientX / innerWidth - 0.8) * 20 // Target mostly right side
      const yPct = (e.clientY / innerHeight - 0.8) * 20
      setMousePos({ x: xPct, y: yPct })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  useEffect(() => {
    x.set(mousePos.x)
    y.set(mousePos.y)
  }, [mousePos, x, y])

  // Variants for eye shapes
  const eyeVariants = {
    calm: { scaleY: 1, height: 20 },
    alert: { scaleY: 1.5, height: 25 },
    happy: { scaleY: 0.2, height: 10 }, // Squint
    thinking: { scaleY: 0.8, height: 18 }
  }

  return (
    <div className="fixed right-0 bottom-0 w-[40vw] h-[50vh] pointer-events-none z-50 flex items-end justify-end overflow-hidden">
      <motion.svg
        viewBox="0 0 400 400"
        className="w-full h-full pointer-events-auto cursor-pointer"
        onClick={onClick}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Abstract Strawberry Body (Outline) */}
        <motion.path
          d="M200,380 C100,380 50,250 50,150 C50,80 120,50 200,50 C280,50 350,80 350,150 C350,250 300,380 200,380 Z"
          fill="none"
          stroke="url(#grad1)"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        
        {/* Gradient Definition */}
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#E11D48", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#3F3F46", stopOpacity: 0.5 }} />
          </linearGradient>
        </defs>

        {/* Leaf (Abstract) */}
        <motion.path
          d="M200,50 C180,20 150,20 140,40 M200,50 C220,20 250,20 260,40 M200,50 C200,10 200,10 200,30"
          stroke="#3F3F46"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          animate={{ rotate: mood === "alert" ? [0, 5, -5, 0] : 0 }}
          transition={{ duration: 0.5 }}
        />

        {/* Eyes Container */}
        <g transform="translate(200, 180)">
          {/* Left Eye */}
          <motion.g style={{ x, y }}>
            <motion.ellipse
              cx="-60"
              cy="0"
              rx="15"
              fill="#E11D48"
              variants={eyeVariants}
              animate={mood}
            />
          </motion.g>
          
          {/* Right Eye */}
          <motion.g style={{ x, y }}>
            <motion.ellipse
              cx="60"
              cy="0"
              rx="15"
              fill="#E11D48"
              variants={eyeVariants}
              animate={mood}
            />
          </motion.g>
        </g>

        {/* Blush (Only when happy) */}
        <motion.g animate={{ opacity: mood === "happy" ? 0.6 : 0 }}>
          <circle cx="120" cy="220" r="20" fill="#E11D48" filter="url(#blur)" />
          <circle cx="280" cy="220" r="20" fill="#E11D48" filter="url(#blur)" />
        </motion.g>

        <defs>
          <filter id="blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" />
          </filter>
        </defs>

      </motion.svg>
    </div>
  )
}
