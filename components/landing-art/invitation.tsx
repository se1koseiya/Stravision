"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useMascot } from "./mascot-context"

export function Invitation() {
  const { setState } = useMascot()

  return (
    <section className="h-[50vh] relative z-10 flex flex-col justify-end pb-32 items-center pointer-events-none">
      <div className="flex flex-col md:flex-row gap-16 md:gap-32 pointer-events-auto mix-blend-difference">
        <Link 
          href="/dashboard"
          onMouseEnter={() => setState("active")}
          onMouseLeave={() => setState("idle")}
          className="group relative"
        >
          <span className="text-3xl md:text-4xl text-white font-jinbuti tracking-tighter transition-colors group-hover:text-red-500">
            进入莓界
          </span>
          <motion.div 
            className="absolute -bottom-4 left-0 w-full h-px bg-red-600 origin-left"
            initial={{ scaleX: 0 }}
            whileHover={{ scaleX: 1 }}
            transition={{ duration: 0.5 }}
          />
        </Link>

        <Link 
          href="/demo"
          onMouseEnter={() => setState("thinking")}
          onMouseLeave={() => setState("idle")}
          className="group relative"
        >
          <span className="text-3xl md:text-4xl text-muted-foreground font-jinbuti tracking-tighter transition-colors group-hover:text-white">
            让我管一次
          </span>
          <motion.div 
            className="absolute -bottom-4 left-0 w-full h-px bg-white origin-left"
            initial={{ scaleX: 0 }}
            whileHover={{ scaleX: 1 }}
            transition={{ duration: 0.5 }}
          />
        </Link>
      </div>

      <footer className="absolute bottom-12 text-[10px] text-gray-800 tracking-[0.3em] uppercase">
        Stravision © 2026 // Consciousness V1.0
      </footer>
    </section>
  )
}
