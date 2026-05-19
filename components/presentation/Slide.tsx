"use client"

import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface SlideProps {
  children: React.ReactNode
  className?: string
  title?: string
  subtitle?: string
  step?: number
  hideFooter?: boolean
  noPadding?: boolean
  current?: number
  total?: number
  onNext?: () => void
  onPrev?: () => void
}

export function Slide({ 
  children, 
  className, 
  title, 
  subtitle, 
  step, 
  hideFooter = false,
  noPadding = false,
  current,
  total,
  onNext,
  onPrev
}: SlideProps) {
  return (
    <div className={cn("w-full h-full flex flex-col relative overflow-hidden font-jinbuti bg-[#050505] text-white selection:bg-primary/30", className)}>
      
      {/* --- Dynamic Background Layer --- */}
      {!noPadding && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
           {/* 1. Global Perspective Grid - Refined */}
           <div className="absolute inset-0 z-0 opacity-10">
             <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:100px_100px] [transform:perspective(1000px)_rotateX(60deg)_translateY(-100px)] origin-top" />
             <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent" />
           </div>

           {/* 2. Technical Accents - Dashed Lines & Markers */}
           <div className="absolute inset-0 z-0 opacity-20">
              <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="absolute left-1/4 top-0 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />
              <div className="absolute left-3/4 top-0 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />
              
              {/* Corner Markers */}
              {[
                { top: 20, left: 20 }, { top: 20, right: 20 },
                { bottom: 20, left: 20 }, { bottom: 20, right: 20 }
              ].map((pos, i) => (
                <div key={i} className="absolute text-base font-mono text-white/20 select-none" style={pos}>
                  {`[${Object.keys(pos)[0].charAt(0).toUpperCase()}${Object.keys(pos)[1].charAt(0).toUpperCase()}_0${i}]`}
                </div>
              ))}
           </div>

           {/* 3. Ambient Orbs */}
           <div className="absolute inset-0 z-0">
             <motion.div 
               animate={{ 
                 scale: [1, 1.2, 1],
                 opacity: [0.1, 0.2, 0.1],
                 x: [0, 50, 0]
               }}
               transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-[-10%] left-[-5%] w-[60vw] h-[60vw] rounded-full bg-primary/10 blur-[120px]" 
             />
             <motion.div 
               animate={{ 
                 scale: [1, 1.1, 1],
                 opacity: [0.05, 0.15, 0.05],
                 x: [0, -30, 0]
               }}
               transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
               className="absolute bottom-[-10%] right-[-5%] w-[70vw] h-[70vw] rounded-full bg-blue-500/10 blur-[150px]" 
             />
           </div>

           {/* 4. Global Noise Texture */}
           <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay z-[1] bg-[url('/noise.svg')]" />
        </div>
      )}

      {/* --- Header --- */}
      {(title || step) && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "circOut" }}
          className="relative z-30 flex justify-between items-start pt-16 px-16 md:px-24"
        >
          <div className="relative">
            {subtitle && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3 mb-4"
              >
                <div className="flex gap-1">
                   <div className="w-1 h-1 rounded-full bg-primary" />
                   <div className="w-8 h-px bg-primary/30 self-center" />
                </div>
                <p className="text-primary/80 text-base font-mono uppercase tracking-[0.4em]">
                  {subtitle}
                </p>
              </motion.div>
            )}
            {title && (
              <div className="relative">
                <h2 className="text-7xl md:text-8xl font-bold tracking-tighter leading-tight text-white">
                  {title}
                </h2>
                <div className="absolute -bottom-4 left-0 w-24 h-1 bg-primary/50" />
              </div>
            )}
          </div>
          {step && (
            <div className="flex flex-col items-end pt-2">
               <div className="text-base font-mono text-white/20 tracking-[0.5em] uppercase mb-2">Phase</div>
               <div className="text-8xl md:text-9xl font-bold text-white/5 font-mono leading-none tracking-tighter select-none">
                 {step.toString().padStart(2, '0')}
               </div>
            </div>
          )}
        </motion.div>
      )}

      {/* --- Content --- */}
      <div className={cn(
        "flex-1 relative z-30 flex flex-col overflow-hidden",
        noPadding ? "p-0" : "px-16 md:px-24 py-12"
      )}>
        {children}
      </div>

      {/* --- Footer --- */}
      {!hideFooter && (
        <div className="absolute bottom-10 left-16 right-16 z-30 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-8 pointer-events-auto">
             <div className="flex flex-col gap-1">
                <span className="text-base font-mono text-zinc-700 tracking-[0.3em] uppercase">System Status</span>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                   <span className="text-base font-mono text-zinc-400 tracking-widest uppercase">Stravision AIoT Operational</span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-12 pointer-events-auto">
             <div className="flex flex-col items-end gap-1">
                <span className="text-base font-mono text-zinc-700 tracking-[0.3em] uppercase">Navigation</span>
                {(onPrev || onNext) && (
                  <div className="flex items-center gap-6 bg-white/[0.02] border border-white/5 px-6 py-3 rounded-sm backdrop-blur-md">
                    <button 
                      onClick={onPrev}
                      className="p-1 text-zinc-500 hover:text-white transition-colors disabled:opacity-10"
                      disabled={!onPrev}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    {(current && total) && (
                      <div className="flex items-baseline gap-1 font-mono text-base">
                        <span className="text-primary font-bold">{current.toString().padStart(2, '0')}</span>
                        <span className="text-zinc-800">/</span>
                        <span className="text-zinc-600">{total.toString().padStart(2, '0')}</span>
                      </div>
                    )}

                    <button 
                      onClick={onNext}
                      className="p-1 text-zinc-500 hover:text-white transition-colors disabled:opacity-10"
                      disabled={!onNext}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
