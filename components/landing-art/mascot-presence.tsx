"use client"

import { motion, AnimatePresence, useSpring } from "framer-motion"
import Image from "next/image"
import { useEffect, useRef } from "react"
import { useMascot } from "./mascot-context"

export function MascotPresence() {
  const { state, mousePosition } = useMascot()
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Smooth mouse follow effect
  const springConfig = { damping: 20, stiffness: 100 }
  const x = useSpring(0, springConfig)
  const y = useSpring(0, springConfig)

  useEffect(() => {
    // Subtle parallax based on mouse position
    if (typeof window !== "undefined") {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      const moveX = (mousePosition.x - centerX) * 0.03
      const moveY = (mousePosition.y - centerY) * 0.03
      x.set(moveX)
      y.set(moveY)
    }
  }, [mousePosition, x, y])

  // Determine which image to show based on state
  // "sit.png" for passive states (Idle, Thinking, Waiting)
  // "sayhi.png" for active states (Watching, Active)
  const isActivePose = state === "watching" || state === "active"
  const currentImage = isActivePose ? "/ip/hello.png" : "/ip/sit.png"

  return (
    <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
      {/* Dynamic Background Aura */}
      <motion.div 
        className="absolute w-[120vh] h-[120vh] rounded-full opacity-20 blur-[100px]"
        animate={{
          background: state === "active" 
            ? "radial-gradient(circle, rgba(220,38,38,0.3) 0%, rgba(0,0,0,0) 70%)" // Red when active
            : "radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0) 70%)", // White/Neutral otherwise
          scale: state === "thinking" ? 1.1 : 1,
        }}
        transition={{ duration: 2 }}
      />

      <motion.div
        ref={containerRef}
        className="relative w-[80vw] h-[80vw] md:w-[45vw] md:h-[45vw] max-w-[700px] max-h-[700px]"
        style={{ x, y }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage}
            className="relative w-full h-full"
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              filter: "blur(0px)",
              y: [0, -15, 0] // Breathing float animation
            }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ 
              opacity: { duration: 0.8 },
              scale: { duration: 0.8 },
              filter: { duration: 0.8 },
              y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <Image
              src={currentImage}
              alt="Mascot Presence"
              fill
              className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              priority
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
