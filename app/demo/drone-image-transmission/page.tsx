"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { 
  Plane, Server, Zap, 
  Wifi, Battery, Crosshair, Cpu, ArrowRight, Bot, 
  Activity, Radio, Scan, Camera, Upload, ChevronRight,
  Maximize
} from "lucide-react"

// Decorative Corner SVG for Sci-Fi borders
const CornerSVG = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M0 20L0 0L20 0" stroke="currentColor" strokeWidth="2" />
  </svg>
)

export default function DroneImageTransmission() {
  const router = useRouter()
  const [stage, setStage] = useState<"idle" | "scanning" | "transmitting" | "received" | "analyzing">("idle")
  const [progress, setProgress] = useState(0)
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1200&auto=format&fit=crop")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Real-time fake data
  const [telemetry, setTelemetry] = useState({ alt: 120, speed: 15, signal: 98, bat: 85 })

  useEffect(() => {
    if (stage === "scanning" || stage === "transmitting") {
      const interval = setInterval(() => {
        setTelemetry(prev => ({
          alt: prev.alt + (Math.random() > 0.5 ? 1 : -1),
          speed: prev.speed + (Math.random() > 0.5 ? 0.5 : -0.5),
          signal: Math.min(100, Math.max(80, prev.signal + (Math.random() > 0.5 ? 2 : -2))),
          bat: Math.max(0, prev.bat - 0.1)
        }))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [stage])

  const startMission = () => {
    setStage("scanning")
    setTimeout(() => {
      setStage("transmitting")
      let p = 0
      const interval = setInterval(() => {
        p += 5
        setProgress(p)
        if (p >= 100) {
          clearInterval(interval)
          setStage("received")
        }
      }, 100)
    }, 3000)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageUrl(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const askAI = () => {
    setStage("analyzing")
    const prompt = "请对这张无人机传回的农业遥感图像进行深度分析，识别作物健康状况、水分分布及潜在的病虫害风险。"
    
    // 强制存储图片，确保 AI 助手能获取到
    sessionStorage.setItem("pending_ai_image", imageUrl)
    
    setTimeout(() => {
      // 始终通过 useSessionImage=true 标记让 AI 助手从 sessionStorage 读取，这样更稳定
      router.push(`/ai-assistant?prompt=${encodeURIComponent(prompt)}&useSessionImage=true`)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-mono selection:bg-emerald-500/30 overflow-hidden relative flex flex-col uppercase tracking-wider">
      {/* Sci-Fi Background Elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#000_100%)] z-0 pointer-events-none" />
      
      {/* HUD Lines */}
      <div className="absolute left-10 top-0 bottom-0 w-px bg-zinc-900 z-0" />
      <div className="absolute right-10 top-0 bottom-0 w-px bg-zinc-900 z-0" />
      
      {/* Header */}
      <header className="relative z-10 px-12 py-6 flex items-center justify-between border-b border-zinc-800/50 bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 flex items-center justify-center relative border border-emerald-500/30 skew-x-[-10deg]">
            <Radio className="w-6 h-6 text-emerald-400 skew-x-[10deg]" />
            <CornerSVG className="absolute -top-1 -left-1 text-emerald-500 w-3 h-3" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-zinc-100 tracking-[0.2em] flex items-center gap-2">
              UAV_COMMAND_NEXUS
              <span className="w-2 h-5 bg-emerald-500 animate-pulse" />
            </h1>
            <p className="text-[10px] text-emerald-500/70 tracking-[0.3em] mt-1">SYS.OP.MODE // SECURE_LINK_ESTABLISHED</p>
          </div>
        </div>
        
        <div className="flex items-center gap-8 text-xs">
          <div className="flex flex-col">
            <span className="text-zinc-600 text-[9px] mb-1">ALTITUDE</span>
            <span className="text-emerald-400 font-bold">{telemetry.alt.toFixed(0)}M</span>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-600 text-[9px] mb-1">VELOCITY</span>
            <span className="text-amber-400 font-bold">{telemetry.speed.toFixed(1)}M/S</span>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-600 text-[9px] mb-1">SIGNAL_STR</span>
            <span className="text-cyan-400 font-bold">{telemetry.signal.toFixed(0)}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-600 text-[9px] mb-1">POWER_CELL</span>
            <span className="text-emerald-400 font-bold">{telemetry.bat.toFixed(0)}%</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 p-12 flex items-stretch gap-8">
        
        {/* Left Panel: UAV Feed */}
        <div className="flex-[2] relative flex flex-col">
          {/* Decorative frame */}
          <div className="absolute inset-0 border border-zinc-800 pointer-events-none" />
          <CornerSVG className="absolute -top-px -left-px text-emerald-500 w-6 h-6 z-20" />
          <CornerSVG className="absolute -top-px -right-px text-emerald-500 w-6 h-6 rotate-90 z-20" />
          <CornerSVG className="absolute -bottom-px -left-px text-emerald-500 w-6 h-6 -rotate-90 z-20" />
          <CornerSVG className="absolute -bottom-px -right-px text-emerald-500 w-6 h-6 rotate-180 z-20" />
          
          <div className="flex justify-between items-center px-4 py-2 border-b border-zinc-800 bg-zinc-900/30">
            <div className="flex items-center gap-3">
              <Camera className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] text-zinc-400 tracking-[0.2em]">OPTICAL_FEED // CAM_PRIME</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-red-500 tracking-widest">REC</span>
            </div>
          </div>
          
          <div className="flex-1 relative bg-[#0a0a0a] overflow-hidden group">
            {stage === "idle" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700">
                <Scan className="w-24 h-24 mb-4 opacity-20" />
                <p className="text-xs tracking-[0.3em]">AWAITING_INITIALIZATION</p>
              </div>
            ) : (
              <>
                <img 
                  src={imageUrl} 
                  alt="UAV Feed" 
                  className={`w-full h-full object-cover transition-all duration-1000 ${stage === "scanning" ? "scale-105 filter contrast-125 saturate-150 grayscale-[20%]" : "scale-100"} opacity-80 mix-blend-luminosity`}
                />
                
                {/* Crosshair Overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-30 flex items-center justify-center">
                   <Maximize className="w-64 h-64 text-emerald-500 stroke-1" />
                </div>
                
                {/* HUD Data Overlay */}
                <div className="absolute top-6 left-6 text-[10px] text-emerald-500/70 flex flex-col gap-1">
                   <span>LAT: 31.2304 N</span>
                   <span>LNG: 121.4737 E</span>
                   <span>AZI: 145° SE</span>
                </div>

                {/* Scanning Effect */}
                {stage === "scanning" && (
                  <>
                    <div className="absolute inset-0 bg-emerald-900/10 mix-blend-color-dodge" />
                    <motion.div 
                      initial={{ top: "-10%" }}
                      animate={{ top: "110%" }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                      className="absolute left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,1)] z-20"
                    />
                    <div className="absolute bottom-6 right-6 text-emerald-400 text-[10px] bg-black/80 px-2 py-1 border border-emerald-500/30">
                      ANALYZING_TERRAIN_TOPOLOGY...
                    </div>
                  </>
                )}
                
                {/* Flash */}
                {stage === "transmitting" && progress === 0 && (
                  <motion.div 
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 bg-white z-30"
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Panel: Controls & Data Link */}
        <div className="flex-1 flex flex-col gap-8">
          
          {/* Data Link Monitor */}
          <div className="relative border border-zinc-800 bg-zinc-900/20 p-6 flex flex-col">
            <CornerSVG className="absolute -top-px -left-px text-zinc-600 w-4 h-4" />
            <h3 className="text-[10px] text-zinc-500 mb-6 tracking-[0.2em] flex items-center gap-2">
              <Activity className="w-3 h-3" /> DATA_LINK_STATUS
            </h3>
            
            <div className="relative h-1 bg-zinc-900 mb-4">
              <motion.div 
                className="absolute top-0 left-0 bottom-0 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-600 mb-1">PACKET_LOSS</span>
                <span className="text-xs text-zinc-300">0.02%</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[9px] text-zinc-600 mb-1">TRANSFER_RATE</span>
                <span className="text-xs text-emerald-400">{progress > 0 ? "1.2 GB/S" : "IDLE"}</span>
              </div>
            </div>
          </div>

          {/* Command Terminal */}
          <div className="relative border border-zinc-800 bg-black/40 p-6 flex-1 flex flex-col">
             <CornerSVG className="absolute -top-px -right-px text-zinc-600 w-4 h-4 rotate-90" />
             <CornerSVG className="absolute -bottom-px -right-px text-zinc-600 w-4 h-4 rotate-180" />
             
             <h3 className="text-[10px] text-zinc-500 mb-8 tracking-[0.2em] flex items-center gap-2">
              <Cpu className="w-3 h-3" /> COMMAND_TERMINAL
            </h3>

            <div className="flex-1 flex flex-col justify-center gap-4">
              {stage === "idle" && (
                <>
                  <button 
                    onClick={startMission} 
                    className="group relative w-full bg-emerald-950/30 border border-emerald-500/50 text-emerald-400 py-4 text-xs tracking-[0.2em] hover:bg-emerald-900/50 hover:text-emerald-300 transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(16,185,129,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_2s_infinite]" />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Crosshair className="w-4 h-4" /> INIT_CAPTURE_SEQ
                    </span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border border-zinc-800 bg-zinc-900/30 text-zinc-400 py-4 text-xs tracking-[0.2em] hover:bg-zinc-800 hover:text-zinc-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" /> OVERRIDE_FEED_DATA
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                  />
                </>
              )}

              {(stage === "scanning" || stage === "transmitting") && (
                <div className="w-full border border-zinc-800 bg-zinc-900/50 text-zinc-500 py-4 text-xs tracking-[0.2em] flex items-center justify-center gap-3">
                  <Activity className="w-4 h-4 animate-spin text-emerald-500" />
                  PROCESSING_DATA_STREAM...
                </div>
              )}

              {stage === "received" && (
                <motion.button 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={askAI} 
                  className="group relative w-full bg-blue-950/30 border border-blue-500/50 text-blue-400 py-6 text-xs tracking-[0.2em] hover:bg-blue-900/50 hover:text-blue-300 transition-all overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Bot className="w-4 h-4 group-hover:animate-pulse" /> 
                    ENGAGE_AI_ANALYSIS
                    <ChevronRight className="w-4 h-4 ml-2 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </span>
                </motion.button>
              )}

              {stage === "analyzing" && (
                <div className="w-full border border-blue-900/50 bg-blue-950/20 text-blue-500 py-6 text-xs tracking-[0.2em] flex items-center justify-center gap-3">
                  <Bot className="w-4 h-4 animate-pulse" />
                  HANDING_OVER_TO_AI_CORE...
                </div>
              )}
            </div>

            {/* System logs / status text at bottom */}
            <div className="mt-8 pt-4 border-t border-zinc-800/50 text-[9px] text-zinc-600 font-mono flex flex-col gap-1">
              <span>&gt; SYS_STATUS: {stage.toUpperCase()}</span>
              <span>&gt; {
                stage === "idle" ? "READY_FOR_COMMAND" :
                stage === "scanning" ? "ACQUIRING_TARGET_DATA..." :
                stage === "transmitting" ? "DOWNLINK_IN_PROGRESS..." :
                stage === "received" ? "DATA_SECURED_WAITING_FOR_AI" :
                "AI_ROUTING_INITIATED..."
              }</span>
              {stage !== "idle" && stage !== "analyzing" && (
                <button 
                  onClick={() => {setStage("idle"); setProgress(0)}}
                  className="mt-2 text-zinc-500 hover:text-zinc-300 text-left w-fit"
                >
                  &gt; [SYS_RESET]
                </button>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}