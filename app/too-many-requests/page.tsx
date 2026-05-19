"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Check, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"

// --- UTILS ---
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min

// --- COMPONENT: OSCILLOSCOPE (Pro Version) ---
const Oscilloscope = ({ quality, isLocked }: { quality: number, isLocked: boolean }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const timeRef = useRef(0)
    
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number

        const render = () => {
            timeRef.current += 0.05
            const width = canvas.width
            const height = canvas.height
            const centerY = height / 2

            // Clear with trail effect
            ctx.fillStyle = 'rgba(0, 5, 2, 0.2)'
            ctx.fillRect(0, 0, width, height)

            // Grid Line
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.1)'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(0, centerY)
            ctx.lineTo(width, centerY)
            ctx.stroke()

            // Vertical Grid Lines
            for (let i = 0; i < width; i += 40) {
                ctx.beginPath()
                ctx.moveTo(i, 0)
                ctx.lineTo(i, height)
                ctx.stroke()
            }

            // Wave Style
            ctx.lineWidth = isLocked ? 3 : 2
            ctx.strokeStyle = isLocked ? '#10b981' : `rgba(16, 185, 129, ${0.4 + quality * 0.6})`
            ctx.shadowBlur = isLocked ? 20 : 5
            ctx.shadowColor = '#10b981'
            ctx.lineJoin = 'round'
            ctx.lineCap = 'round'

            ctx.beginPath()
            
            for (let x = 0; x < width; x++) {
                // Base wave (Signal)
                const frequency = 0.05
                // As quality increases, noise decreases and phase aligns
                const noiseAmount = (1 - quality) * 60
                const noise = (Math.random() - 0.5) * noiseAmount
                
                // Signal becomes clearer and amplitude stabilizes
                const baseAmp = height * 0.35
                const signal = Math.sin(x * frequency + timeRef.current * (1 + (1-quality)*3)) * baseAmp
                
                // Secondary harmonic (adds complexity)
                const harmonic = Math.sin(x * frequency * 2.5 - timeRef.current) * (baseAmp * 0.2)

                // Mixed output
                const y = centerY + signal + harmonic + noise
                
                if (x === 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
            }
            
            ctx.stroke()
            animationFrameId = requestAnimationFrame(render)
        }

        render()
        return () => cancelAnimationFrame(animationFrameId)
    }, [quality, isLocked])

    return (
        <div className="relative w-full h-full bg-[#020502] overflow-hidden rounded-md border border-white/5 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
            <canvas 
                ref={canvasRef} 
                width={600} 
                height={300} 
                className="w-full h-full object-cover mix-blend-screen opacity-90"
            />
            {/* Screen Overlay Effects */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_3px,3px_100%] opacity-60" />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/5 to-transparent opacity-20" />
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]" />
        </div>
    )
}

// --- COMPONENT: KNOB (High Fidelity SVG) ---
const Knob = ({ value, onChange, isLocked }: { value: number, onChange: (v: number) => void, isLocked: boolean }) => {
    const [isDragging, setIsDragging] = useState(false)
    const startY = useRef(0)
    const startVal = useRef(0)

    const handlePointerDown = (e: React.PointerEvent) => {
        if (isLocked) return
        setIsDragging(true)
        startY.current = e.clientY
        startVal.current = value
        ;(e.target as Element).setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || isLocked) return
        const deltaY = startY.current - e.clientY
        const sensitivity = 0.4
        const newValue = Math.min(100, Math.max(0, startVal.current + deltaY * sensitivity))
        onChange(newValue)
    }

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false)
        ;(e.target as Element).releasePointerCapture(e.pointerId)
    }

    const rotation = value * 2.7 - 135

    return (
        <div 
            className={cn(
                "relative w-48 h-48 flex items-center justify-center cursor-ns-resize touch-none select-none",
                isLocked && "cursor-not-allowed opacity-90"
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {/* SVG Knob */}
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
                <defs>
                    <linearGradient id="metal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#333" />
                        <stop offset="50%" stopColor="#111" />
                        <stop offset="100%" stopColor="#222" />
                    </linearGradient>
                    <linearGradient id="ring-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#444" />
                        <stop offset="100%" stopColor="#111" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                {/* Base Ring / Ticks Container */}
                <circle cx="100" cy="100" r="90" fill="url(#ring-grad)" stroke="#ffffff05" strokeWidth="1" />
                
                {/* Ticks */}
                {Array.from({ length: 40 }).map((_, i) => {
                    const angle = (i * 9) - 135 - 90 // Adjust start angle
                    if (angle > 135 - 90) return null // Clip bottom part
                    const rad = angle * (Math.PI / 180)
                    const x1 = 100 + 75 * Math.cos(rad)
                    const y1 = 100 + 75 * Math.sin(rad)
                    const x2 = 100 + 85 * Math.cos(rad)
                    const y2 = 100 + 85 * Math.sin(rad)
                    const isActive = (i * 9 - 135) <= (value * 2.7 - 135) + 5 // +5 tolerance
                    
                    return (
                        <line 
                            key={i} 
                            x1={x1} y1={y1} x2={x2} y2={y2} 
                            stroke={isActive ? "#10b981" : "#ffffff20"} 
                            strokeWidth={isActive ? 2 : 1}
                            strokeLinecap="round"
                            className="transition-colors duration-200"
                        />
                    )
                })}

                {/* Knob Body */}
                <g transform={`rotate(${rotation}, 100, 100)`}>
                    <circle cx="100" cy="100" r="60" fill="url(#metal-grad)" className="shadow-lg" />
                    {/* Inner texture rings */}
                    <circle cx="100" cy="100" r="55" fill="none" stroke="#ffffff05" strokeWidth="1" />
                    <circle cx="100" cy="100" r="40" fill="none" stroke="#ffffff05" strokeWidth="1" />
                    
                    {/* Indicator */}
                    <circle cx="100" cy="55" r="4" fill={isLocked ? "#10b981" : "#10b98180"} filter={isLocked ? "url(#glow)" : ""} />
                    <line x1="100" y1="55" x2="100" y2="70" stroke={isLocked ? "#10b981" : "#10b98140"} strokeWidth="2" strokeLinecap="round" />
                </g>
            </svg>

            {/* Label in center (HTML overlay) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="font-jinbuti text-[10px] text-zinc-500 tracking-widest mt-16">GAIN</span>
            </div>
        </div>
    )
}

// --- MAIN PAGE ---
export default function TooManyRequestsPage() {
    const [targetFreq] = useState(() => Math.floor(randomRange(20, 80)))
    const [currentFreq, setCurrentFreq] = useState(0)
    const [isLocked, setIsLocked] = useState(false)
    
    const diff = Math.abs(targetFreq - currentFreq)
    const quality = Math.max(0, 1 - diff / 15) // Slightly harder
    
    useEffect(() => {
        if (quality > 0.98 && !isLocked) {
            const timer = setTimeout(() => {
                setIsLocked(true)
                setCurrentFreq(targetFreq)
            }, 600) // Longer delay for suspense
            return () => clearTimeout(timer)
        }
    }, [quality, targetFreq, isLocked])

    const handleBack = () => {
        // 返回上一页
        window.history.back()
    }

    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden py-12 bg-[#050505]">
            
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-red-900/10 to-transparent opacity-50" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-red-500/5 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 w-full max-w-6xl mx-auto px-6 grid lg:grid-cols-[1.2fr_0.8fr] gap-16 items-center">
                
                {/* LEFT: The Instrument Panel */}
                <div className="order-2 lg:order-1">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        {/* Glass Panel Body */}
                        <GlassCard className="rounded-3xl p-0 overflow-hidden bg-[#0a0a0a]/80 border-red-500/20" hoverEffect={false}>
                            
                            {/* Top Bar */}
                            <div className="h-10 bg-white/5 border-b border-white/5 flex items-center justify-between px-6">
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500/40 shadow-[0_0_5px_rgba(239,68,68,0.4)]" />
                                    <div className="w-2 h-2 rounded-full bg-yellow-500/40 shadow-[0_0_5px_rgba(234,179,8,0.4)]" />
                                    <div className="w-2 h-2 rounded-full bg-primary/40 shadow-[0_0_5px_rgba(16,185,129,0.4)]" />
                                </div>
                                <span className="font-jinbuti text-[10px] text-red-500/60 tracking-[0.2em] uppercase">Traffic Control // Active</span>
                            </div>

                            {/* Main Display Area */}
                            <div className="p-8 space-y-8">
                                
                                {/* Screen & Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
                                    {/* Oscilloscope Screen */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end px-1">
                                            <span className="font-jinbuti text-[10px] text-primary/60 uppercase">Signal Input</span>
                                            <span className="font-jinbuti text-[10px] text-primary/60">{isLocked ? "LOCKED" : "SEARCHING"}</span>
                                        </div>
                                        <div className="h-40 md:h-56 relative group-hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-500">
                                            <Oscilloscope quality={quality} isLocked={isLocked} />
                                            
                                            {/* Locked Pop-up */}
                                            <AnimatePresence>
                                                {isLocked && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20"
                                                    >
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="w-12 h-12 rounded-full border-2 border-primary flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)] bg-emerald-950/50">
                                                                <Lock className="w-5 h-5 text-primary" />
                                                            </div>
                                                            <span className="font-jinbuti text-primary tracking-widest text-sm font-bold shadow-black drop-shadow-md">SIGNAL LOCKED</span>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Vertical Stats */}
                                    <div className="flex flex-col justify-between py-2 border-l border-white/5 pl-6">
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <div className="text-[10px] font-jinbuti text-zinc-500 uppercase">Target Freq</div>
                                                <div className="text-xl font-jinbuti text-white tabular-nums tracking-wider">
                                                    {isLocked ? targetFreq.toFixed(2) : <span className="animate-pulse text-white/30">--.--</span>} <span className="text-xs text-zinc-600">MHz</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[10px] font-jinbuti text-zinc-500 uppercase">Current</div>
                                                <div className={cn("text-xl font-jinbuti tabular-nums tracking-wider transition-colors", 
                                                    quality > 0.9 ? "text-emerald-400" : "text-white/60"
                                                )}>
                                                    {currentFreq.toFixed(2)} <span className="text-xs text-zinc-600">MHz</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="text-[10px] font-jinbuti text-zinc-500 uppercase">Signal Quality</div>
                                            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                                <motion.div 
                                                    className="h-full bg-primary shadow-[0_0_10px_#10b981]"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${quality * 100}%` }}
                                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Controls */}
                                <div className="pt-6 border-t border-white/5 flex items-center justify-between gap-8">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", isLocked ? "bg-primary shadow-[0_0_8px_#10b981]" : "bg-zinc-600")} />
                                            <span className="text-xs font-jinbuti text-zinc-400 uppercase tracking-wider">Manual Tuning</span>
                                        </div>
                                        <p className="text-[10px] font-jinbuti text-zinc-600 leading-relaxed max-w-[200px]">
                                            请上下拖动旋钮调节频率，使波形同步以解锁访问限制。
                                        </p>
                                    </div>
                                    <Knob value={currentFreq} onChange={setCurrentFreq} isLocked={isLocked} />
                                </div>

                            </div>
                        </GlassCard>
                    </motion.div>
                </div>

                {/* RIGHT: Narrative & Action */}
                <div className="order-1 lg:order-2 space-y-10">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 mb-6 backdrop-blur-md">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] font-jinbuti text-red-400 uppercase tracking-widest">Traffic Overflow</span>
                        </div>
                        
                        <h2 className="text-5xl md:text-6xl font-jinbuti text-white mb-6 leading-[1.1] tracking-tight">
                            请求 <span className="text-red-500">过于频繁</span>
                        </h2>
                        
                        <p className="text-lg text-zinc-400 leading-relaxed font-jinbuti border-l-2 border-red-500/30 pl-6">
                            检测到您的访问频率异常。为了保护系统的稳定性，我们暂时锁定了通信通道。请完成左侧的频率校准挑战以证明您不是机器人。
                        </p>
                    </motion.div>

                    <div className="relative">
                         <AnimatePresence mode="wait">
                            {isLocked ? (
                                <motion.div 
                                    key="unlocked"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-4"
                                >
                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 backdrop-blur-sm">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-1 rounded-full bg-primary/20 text-primary">
                                                <Check className="w-3 h-3" />
                                            </div>
                                            <span className="font-jinbuti text-sm font-bold text-emerald-400 tracking-wide">通道已恢复</span>
                                        </div>
                                        <p className="text-xs font-jinbuti text-primary/60 pl-8">
                                            验证通过。您可以继续之前的操作。
                                        </p>
                                    </div>

                                    <Button 
                                        onClick={handleBack}
                                        className="w-full h-14 bg-white hover:bg-zinc-200 text-black rounded-xl font-jinbuti font-bold tracking-wide flex items-center justify-between px-6 group"
                                    >
                                        <span>返回继续</span>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="locked"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="p-5 rounded-xl border border-dashed border-red-500/20 bg-red-500/5 flex items-center gap-4 text-red-400/60"
                                >
                                    <Lock className="w-5 h-5" />
                                    <span className="font-jinbuti text-xs tracking-wider">调节频率至目标值以解锁</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

            </div>
        </section>
    )
}
