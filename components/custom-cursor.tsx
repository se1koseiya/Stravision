"use client"

import { useEffect, useState } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"

export function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false)
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  
  const springConfig = { damping: 40, stiffness: 400 } // Tighter, more robotic
  const cursorXSpring = useSpring(cursorX, springConfig)
  const cursorYSpring = useSpring(cursorY, springConfig)

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)
    }
    
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.closest('a') || target.closest('button')) {
        setIsHovering(true)
      } else {
        setIsHovering(false)
      }
    }

    window.addEventListener("mousemove", moveCursor)
    window.addEventListener("mouseover", handleMouseOver)

    return () => {
      window.removeEventListener("mousemove", moveCursor)
      window.removeEventListener("mouseover", handleMouseOver)
    }
  }, [cursorX, cursorY])

  return (
    <>
      {/* Main Cursor Container */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          translateX: "-50%",
          translateY: "-50%",
        }}
      >
        {/* Center Dot */}
        <motion.div 
          className="w-1 h-1 bg-emerald-500 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        />

        {/* Outer Ring / Brackets */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-emerald-500/50 rounded-full"
          animate={{
            width: isHovering ? 60 : 20,
            height: isHovering ? 60 : 20,
            opacity: isHovering ? 1 : 0.5,
            rotate: isHovering ? 90 : 0,
            borderRadius: isHovering ? "10%" : "50%"
          }}
          transition={{ duration: 0.3 }}
        >
            {/* Crosshair Lines (Only visible when hovering) */}
            <motion.div 
                className="absolute top-1/2 left-0 w-full h-[1px] bg-emerald-500/30"
                animate={{ scaleX: isHovering ? 1 : 0 }}
            />
            <motion.div 
                className="absolute top-0 left-1/2 h-full w-[1px] bg-emerald-500/30"
                animate={{ scaleY: isHovering ? 1 : 0 }}
            />
        </motion.div>
        
        {/* Label (Optional) */}
        <motion.div 
            className="absolute top-4 left-4 text-[8px] font-mono text-emerald-500 whitespace-nowrap"
            animate={{ opacity: isHovering ? 1 : 0 }}
        >
            TARGET_LOCKED
        </motion.div>

      </motion.div>
    </>
  )
}
