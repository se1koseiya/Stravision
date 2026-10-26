"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ReactNode } from "react"

export type CardVariant = "default" | "emerald" | "blue" | "rose" | "purple"

interface BentoCardProps {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
  icon?: ReactNode
  visual?: ReactNode
  colSpan?: number
  delay?: number
  variant?: CardVariant
}

const VARIANTS = {
  default: {
    bg: "bg-zinc-900/40 hover:bg-zinc-900/60",
    border: "border-white/5 hover:border-white/10",
    glow: "from-zinc-500/10 via-transparent to-transparent",
    iconBg: "bg-zinc-800/50",
    iconColor: "text-zinc-400"
  },
  emerald: {
    bg: "bg-emerald-950/20 hover:bg-emerald-900/30",
    border: "border-primary/10 hover:border-primary/20",
    glow: "from-primary/20 via-transparent to-transparent",
    iconBg: "bg-primary/10",
    iconColor: "text-emerald-400"
  },
  blue: {
    bg: "bg-emerald-950/20 hover:bg-emerald-900/30",
    border: "border-emerald-500/10 hover:border-emerald-500/20",
    glow: "from-emerald-500/20 via-transparent to-transparent",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400"
  },
  rose: {
    bg: "bg-rose-950/20 hover:bg-rose-900/30",
    border: "border-rose-500/10 hover:border-rose-500/20",
    glow: "from-rose-500/20 via-transparent to-transparent",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-400"
  },
  purple: {
    bg: "bg-purple-950/20 hover:bg-purple-900/30",
    border: "border-purple-500/10 hover:border-purple-500/20",
    glow: "from-purple-500/20 via-transparent to-transparent",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400"
  }
}

export function BentoCard({ 
  children, 
  className, 
  title, 
  subtitle, 
  icon,
  visual,
  colSpan = 1,
  delay = 0,
  variant = "default"
}: BentoCardProps) {
  const styles = VARIANTS[variant]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: delay * 0.1, ease: "circOut" }}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl transition-all duration-500",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.24)] hover:-translate-y-1",
        "border",
        styles.bg,
        styles.border,
        colSpan === 2 && "col-span-2",
        colSpan === 3 && "col-span-3",
        className
      )}
    >
      {/* Dynamic Glow Effect */}
      <div className={cn(
        "absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0 bg-gradient-to-br blur-2xl",
        styles.glow
      )} />

      {/* Noise Texture for Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 bg-[url('/noise.svg')]" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        {(title || icon) && (
          <div className="flex items-start justify-between mb-5">
            <div className="space-y-1 w-full">
              {icon && (
                <div className={cn(
                  "mb-4 w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-300 shadow-inner",
                  styles.iconBg,
                  styles.iconColor
                )}>
                  {icon}
                </div>
              )}
              {title && <h3 className="text-xl font-bold text-white leading-tight tracking-tight">{title}</h3>}
              {subtitle && <p className="text-base text-zinc-500 uppercase tracking-widest font-mono mt-1">{subtitle}</p>}
            </div>
          </div>
        )}
        
        {/* Visual Slot (Optional, e.g. Chart or Image) */}
        {visual && (
          <div className="mb-6 flex-1 min-h-[120px] rounded-xl overflow-hidden bg-black/20 border border-white/5 relative group-hover:border-white/10 transition-colors shadow-inner">
            {visual}
          </div>
        )}

        {/* Main Content */}
        <div className="text-zinc-300 leading-relaxed text-base flex-1 font-light">
          {children}
        </div>
      </div>
    </motion.div>
  )
}
