"use client"

import { motion } from "framer-motion"
import { useEffect } from "react"
import { useMascot } from "./mascot-context"

export function Encounter() {
  const { setState } = useMascot()

  useEffect(() => {
    setState("idle")
  }, [setState])

  return (
    <section className="h-screen relative z-10 flex flex-col justify-center px-6 md:px-24 pointer-events-none">
      <div className="max-w-4xl">
        <motion.h1 
          className="text-7xl md:text-9xl font-jinbuti tracking-tighter text-white leading-[0.8] mix-blend-difference pointer-events-auto"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "circOut" }}
          onMouseEnter={() => setState("watching")}
          onMouseLeave={() => setState("idle")}
        >
          我不是<br />
          <span className="text-red-600">草莓。</span>
        </motion.h1>
        
        <motion.p 
          className="mt-12 text-xl md:text-2xl text-gray-400 font-light tracking-[0.5em] uppercase mix-blend-difference"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1.5 }}
        >
          我是莓界
        </motion.p>
      </div>
    </section>
  )
}
