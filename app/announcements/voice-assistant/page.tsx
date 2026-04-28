"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { toPng } from "html-to-image"
import { toast } from "sonner"
import { Mic, Zap, Clock, Activity, Download, ChevronRight, Terminal } from "lucide-react"

// --- Visual Primitives ---

function GlitchText({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`relative group inline-block ${className}`}>
      <span className="relative z-10">{children}</span>
      <span className="absolute top-0 left-0 -ml-[2px] text-emerald-300 opacity-0 group-hover:opacity-70 animate-pulse z-0 mix-blend-screen">{children}</span>
      <span className="absolute top-0 left-0 ml-[2px] text-emerald-700 opacity-0 group-hover:opacity-70 animate-pulse delay-75 z-0 mix-blend-screen">{children}</span>
    </div>
  )
}

function ImpactBorder({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`relative bg-black border border-primary/30 ${className}`}>
       {/* Heavy Corners */}
       <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-l-4 border-t-4 border-primary" />
       <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-r-4 border-t-4 border-primary" />
       <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-l-4 border-b-4 border-primary" />
       <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-r-4 border-b-4 border-primary" />
       
       {/* Scanline Overlay */}
       <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
       
       {children}
    </div>
  )
}

function NeonGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
       {/* Radical Gradient */}
       <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-emerald-900/40 via-black to-black z-0" />
       
       {/* Perspective Grid */}
       <div className="absolute inset-0 opacity-30 z-0 transform perspective-[1000px] rotate-x-[60deg] scale-150 origin-top">
         <div className="w-full h-full bg-[linear-gradient(90deg,rgba(16,185,129,0.3)_1px,transparent_1px),linear-gradient(rgba(16,185,129,0.3)_1px,transparent_1px)] bg-[size:60px_60px]" />
       </div>

       {/* Floating Particles */}
       <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/20 blur-[80px] rounded-full mix-blend-screen animate-pulse" />
       <div className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-primary/10 blur-[100px] rounded-full mix-blend-screen animate-pulse delay-1000" />
    </div>
  )
}

export default function VoiceAssistantAnnouncement() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = async () => {
    if (!contentRef.current) return
    setIsGenerating(true)
    try {
      await new Promise(r => setTimeout(r, 100))
      const dataUrl = await toPng(contentRef.current, { 
        cacheBust: true, 
        pixelRatio: 2,
        backgroundColor: '#000000'
      })
      const link = document.createElement('a')
      link.download = 'stravision-impact-poster.png'
      link.href = dataUrl
      link.click()
      toast.success("海报已生成")
    } catch (err) {
      console.error(err)
      toast.error("生成失败")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <NeonGrid />
      
      {/* Control */}
      <button 
        onClick={handleDownload}
        disabled={isGenerating}
        className="fixed top-6 right-6 z-50 flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary text-black font-black italic tracking-tighter uppercase transform hover:scale-105 transition-all shadow-[0_0_30px_rgba(16,185,129,0.6)] skew-x-[-10deg]"
      >
        <Download className="w-5 h-5 skew-x-[10deg]" />
        <span className="skew-x-[10deg]">{isGenerating ? "RENDERING..." : "GET POSTER"}</span>
      </button>

      {/* CANVAS AREA */}
      <div 
        ref={contentRef}
        className="w-full max-w-[440px] bg-black relative overflow-hidden border-x-2 border-emerald-900 shadow-[0_0_100px_rgba(0,0,0,0.8)]"
      >
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[url('/images/noise.svg')] opacity-20 mix-blend-overlay z-[1]" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent z-50 opacity-50" />

        {/* --- HEADER: OVERSIZED TYPOGRAPHY --- */}
        <header className="relative z-10 pt-16 px-6 pb-6 overflow-hidden">
          <div className="absolute top-4 right-4 flex flex-col items-end opacity-50">
             <div className="h-1 w-20 bg-primary mb-1" />
             <div className="h-1 w-12 bg-primary/50" />
          </div>

          <div className="relative">
            <h2 className="text-primary font-mono text-xs tracking-[0.4em] mb-2 uppercase">System Upgrade</h2>
            <h1 className="text-7xl font-black italic tracking-tighter leading-[0.85] text-white mix-blend-screen relative z-20">
              <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">VOICE</span>
              <span className="block text-primary drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">CONTROL</span>
            </h1>
            {/* Outline Text Decoration */}
            <h1 className="absolute top-1 left-1 text-7xl font-black italic tracking-tighter leading-[0.85] text-transparent stroke-white stroke-1 opacity-20 pointer-events-none z-10" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)' }}>
              <span className="block">VOICE</span>
              <span className="block">CONTROL</span>
            </h1>
          </div>
          
          <div className="mt-6 flex items-center gap-4">
             <div className="bg-primary text-black text-xs font-bold px-3 py-1 -skew-x-12">
               <span className="skew-x-12 block">BETA V1.0</span>
             </div>
             <div className="h-px flex-1 bg-primary/30" />
          </div>
        </header>

        {/* --- HERO IMAGE: BREAKING OUT --- */}
        <div className="relative z-20 mt-[-20px] mb-[-40px]">
           <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-20" />
           
           {/* Energy Ring */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] border-[20px] border-primary/10 rounded-full animate-pulse z-0" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] border border-primary/50 rounded-full animate-[spin_4s_linear_infinite] border-t-transparent z-0" />
           
           <div className="relative w-full aspect-square scale-110 z-10">
             <Image 
               src="/ip/sayhi.png" 
               alt="IP" 
               fill
               className="object-contain drop-shadow-[0_0_40px_rgba(16,185,129,0.4)]"
             />
           </div>

           {/* Floating Dialogue Bubble - HUD Style */}
           <div className="absolute top-0 right-0 z-30 transform translate-x-2 translate-y-4">
             {/* Connection Line */}
             <svg className="absolute top-full right-full w-12 h-12 pointer-events-none opacity-60" style={{ transform: 'translate(20%, -20%)' }}>
               <path d="M48,0 L0,48" stroke="#10b981" strokeWidth="1" fill="none" />
               <circle cx="0" cy="48" r="2" fill="#10b981" />
             </svg>

             <div className="bg-black/80 backdrop-blur-xl border border-primary/30 p-4 w-[180px] shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden group">
               {/* Animated Scanline */}
               <div className="absolute top-0 left-0 w-full h-[2px] bg-primary/50 animate-[scan_2s_linear_infinite]" />
               
               {/* Waveform Animation */}
               <div className="flex items-center gap-[2px] h-4 mb-3 opacity-80">
                 {[...Array(12)].map((_, i) => (
                   <div 
                     key={i} 
                     className="w-1 bg-emerald-400 rounded-full animate-pulse"
                     style={{ 
                       height: `${Math.random() * 100}%`,
                       animationDelay: `${i * 0.1}s`,
                       animationDuration: '0.8s'
                     }} 
                   />
                 ))}
               </div>

               {/* Text Content */}
               <div className="relative z-10">
                 <p className="text-[10px] text-primary/60 font-mono mb-1 tracking-wider">RECOGNIZING...</p>
                 <p className="text-sm font-bold text-white leading-tight">
                   "打开<span className="text-emerald-400 bg-primary/10 px-1 rounded">所有风扇</span>，温度调到25度"
                 </p>
               </div>

               {/* Decorative Corners */}
               <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary" />
               <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary" />
             </div>
           </div>
        </div>

        {/* --- FEATURES: AGGRESSIVE GRID --- */}
        <div className="relative z-30 px-6 pb-12 bg-gradient-to-b from-transparent to-black">
          <div className="flex flex-col gap-4">
            
            {/* Row 1: Hands Free (Full Width) */}
            <ImpactBorder className="p-6 bg-zinc-900/80 backdrop-blur-sm relative overflow-hidden group">
               <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
               <div className="flex justify-between items-start mb-4">
                 <div className="p-3 bg-primary/20 rounded-lg border border-primary/30 text-emerald-400">
                   <Mic className="w-8 h-8" />
                 </div>
                 <span className="text-5xl font-black text-white/5 font-mono">01</span>
               </div>
               <h3 className="text-2xl font-black italic text-white uppercase mb-2 tracking-wide">Hands Free</h3>
               <p className="text-sm text-muted-foreground font-medium leading-relaxed">无需触控，全语音自然交互<br/>彻底解放你的双手</p>
            </ImpactBorder>

            {/* Row 2: Instant Control + Smart Schedule (2 Cols) */}
            <div className="grid grid-cols-2 gap-4">
               {/* Instant Control */}
               <div className="bg-zinc-900/60 border border-primary/20 p-5 flex flex-col items-center text-center hover:bg-zinc-900/80 transition-colors group relative overflow-hidden">
                 <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                 <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center border border-primary/30 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6 text-emerald-400" />
                 </div>
                 <h3 className="font-bold text-white text-sm leading-tight">设备<br/>瞬时控制</h3>
               </div>
               
               {/* Smart Schedule */}
               <div className="bg-zinc-900/60 border border-primary/20 p-5 flex flex-col items-center text-center hover:bg-zinc-900/80 transition-colors group relative overflow-hidden">
                 <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500 delay-75" />
                 <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center border border-primary/30 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:scale-110 transition-transform">
                    <Clock className="w-6 h-6 text-emerald-400" />
                 </div>
                 <h3 className="font-bold text-white text-sm leading-tight">智能<br/>任务编排</h3>
               </div>
            </div>

            {/* Row 3: Terminal (Full Width) */}
            <div className="bg-black border-l-2 border-primary/50 p-4 font-mono text-[10px] relative overflow-hidden">
               <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
               <div className="flex items-center gap-2 border-b border-primary/10 pb-2 mb-2 opacity-50">
                 <Terminal className="w-3 h-3" />
                 <span>AI_REASONING_ENGINE.log</span>
               </div>
               <div className="space-y-1.5">
                 <p className="text-zinc-500">&gt; <span className="text-primary/80">User Input:</span> "现在温度多少？"</p>
                 <p className="text-zinc-500">&gt; <span className="text-emerald-400 font-bold">Analysis:</span> Intent detected [QUERY_ENV]</p>
                 <p className="text-white">&gt; System: "当前温度 24.5°C，湿度适宜"</p>
                 <p className="text-primary animate-pulse">_</p>
               </div>
            </div>

          </div>
        </div>

        {/* --- FOOTER: CALL TO ACTION --- */}
        <div className="relative z-30 px-6 pb-8 text-center">
           <div className="inline-flex items-center justify-center w-full py-4 border-y border-white/10 relative">
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
              <span className="absolute right-0 top-0 bottom-0 w-1 bg-primary" />
              
              <div className="flex flex-col items-center">
                <p className="text-xs font-bold text-primary tracking-[0.3em] uppercase mb-1">01.16 13:00 AVAILABLE</p>
                <div className="flex items-center gap-2 text-white font-black italic text-lg">
                   OPEN <ChevronRight className="w-5 h-5 text-primary" /> AI ASSISTANT
                </div>
              </div>
           </div>
           
           <p className="mt-6 text-[10px] text-zinc-600 font-mono">
             STRAVISION IOT PLATFORM © 2026<br/>
             POWERED BY QWEN LARGE MODEL
           </p>
        </div>

      </div>
    </div>
  )
}
