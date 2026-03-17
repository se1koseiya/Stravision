"use client"

import { ReactNode, useRef } from "react"
import { motion, useInView, HTMLMotionProps, useScroll, useTransform } from "framer-motion"

// Premium Section with Parallax
export function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef(null)
  // Parallax effect for content
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })
  const y = useTransform(scrollYProgress, [0, 1], [100, -100])

  return (
    <section ref={ref} className={`min-h-screen w-full flex items-center px-8 md:px-24 relative overflow-hidden ${className}`}>
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {children}
      </div>
    </section>
  )
}

// Masked Text Reveal Component
function MaskedReveal({ children, className, delay = 0, as: Component = "h1" }: any) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-10%" })
  
  return (
    <Component ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.span
        initial={{ y: "110%" }}
        animate={isInView ? { y: "0%" } : { y: "110%" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
        className="block"
      >
        {children}
      </motion.span>
    </Component>
  )
}

export function H1({ children, className = "", ...props }: HTMLMotionProps<"h1">) {
  return (
    <MaskedReveal 
      as="h1"
      className={`text-6xl md:text-8xl font-jinbuti tracking-tight text-white leading-[1.1] mix-blend-difference ${className}`} 
      {...props}
    >
      {children}
    </MaskedReveal>
  )
}

export function H2({ children, className = "", ...props }: HTMLMotionProps<"h2">) {
  return (
    <MaskedReveal 
      as="h2"
      className={`text-4xl md:text-6xl font-jinbuti tracking-tight text-white leading-[1.1] mix-blend-difference ${className}`}
      {...props}
    >
      {children}
    </MaskedReveal>
  )
}

export function Caption({ children, className = "", ...props }: HTMLMotionProps<"p">) {
  return (
    <MaskedReveal 
      as="p"
      className={`text-lg md:text-xl font-jinbuti text-white/60 mt-6 tracking-wide ${className}`}
      delay={0.2}
      {...props}
    >
      {children}
    </MaskedReveal>
  )
}
