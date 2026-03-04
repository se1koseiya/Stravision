"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { toPng } from "html-to-image"
import { toast } from "sonner"
import { Download, Zap, TrendingUp, Layers } from "lucide-react"

export default function PlatformBannerPage() {
  const bannerRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = async () => {
    if (!bannerRef.current) return
    setIsGenerating(true)
    try {
      await new Promise(r => setTimeout(r, 100))
      const dataUrl = await toPng(bannerRef.current, { 
        cacheBust: true, 
        pixelRatio: 2,
        width: 1065,
        height: 360,
        backgroundColor: '#000000'
      })
      const link = document.createElement('a')
      link.download = 'stravision-impact-banner.png'
      link.href = dataUrl
      link.click()
      toast.success("Banner 已生成")
    } catch (err) {
      console.error(err)
      toast.error("生成失败")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 font-sans">
      
      <div className="mb-8 text-center">
        <h1 className="text-white text-2xl font-bold mb-2">High Impact Banner Generator</h1>
        <p className="text-zinc-500 font-mono">1065 x 360 px // CYBERPUNK STYLE</p>
      </div>

      <button 
        onClick={handleDownload}
        disabled={isGenerating}
        className="mb-12 flex items-center gap-2 px-8 py-3 bg-white text-black font-black italic uppercase tracking-wider hover:bg-emerald-400 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)] skew-x-[-10deg]"
      >
        <Download className="w-5 h-5 skew-x-[10deg]" />
        <span className="skew-x-[10deg]">{isGenerating ? "RENDERING..." : "EXPORT BANNER"}</span>
      </button>

      {/* Banner Container - Exact Size */}
      <div 
        ref={bannerRef}
        style={{ width: '1065px', height: '360px' }}
        className="relative bg-black overflow-hidden shadow-2xl flex-shrink-0 border-y-4 border-emerald-500"
      >
        {/* --- Background Elements --- */}
        
        {/* 1. Dynamic Grid Floor */}
        <div className="absolute inset-0 z-0 opacity-40">
           <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.2)_1px,transparent_1px)] bg-[size:60px_60px] [transform:perspective(500px)_rotateX(60deg)_scale(2)] origin-top" />
        </div>

        {/* 2. Radical Gradients */}
        <div className="absolute top-[-100px] left-[-100px] w-[600px] h-[600px] bg-emerald-600/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen" />
        
        {/* 3. Speed Lines Overlay */}
        <div className="absolute inset-0 z-[1] opacity-20 bg-[url('/images/noise.svg')] mix-blend-overlay" />
        <div className="absolute inset-0 z-[1] bg-[linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.8)_50%,transparent_100%)]" />


        {/* --- Foreground Content --- */}
        <div className="relative z-10 w-full h-full flex items-center justify-between px-16">
          
          {/* Left: Typography Explosion */}
          <div className="relative z-20 flex flex-col justify-center w-[60%]">
             
             {/* Top Label */}
             <div className="flex items-center gap-3 mb-2">
               <div className="px-3 py-1 bg-emerald-500 text-black font-black text-xs uppercase -skew-x-12">
                 <span className="block skew-x-12">Platform V4.0</span>
               </div>
               <div className="h-px w-20 bg-emerald-500/50" />
               <span className="text-emerald-500/80 font-mono text-xs tracking-widest">SYSTEM_ONLINE</span>
             </div>

             {/* Main Title - Stacked & Glitched */}
             <div className="relative leading-[0.85]">
               <h1 className="text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 z-10 relative">
                 STRAVISION
               </h1>
               {/* Outline Echo */}
               <h1 className="absolute top-1 left-1 text-8xl font-black italic tracking-tighter text-transparent z-0 opacity-30 select-none" style={{ WebkitTextStroke: '2px #10b981' }}>
                 STRAVISION
               </h1>
             </div>
             
             <h2 className="text-4xl font-black text-emerald-500 mt-2 tracking-wide uppercase">
               IoT Agriculture
             </h2>
             
             <p className="mt-4 text-gray-400 text-lg max-w-md font-medium">
               让大棚开始<span className="text-white border-b-2 border-emerald-500">自己运转</span>。
               <br/>AI 驱动的下一代智慧种植管理系统。
             </p>

             {/* Stats Row */}
             <div className="flex gap-8 mt-8">
               <StatItem value="99.9%" label="UPTIME" />
               <div className="w-px h-10 bg-white/10" />
               <StatItem value="0ms" label="LATENCY" />
               <div className="w-px h-10 bg-white/10" />
               <StatItem value="AI" label="POWERED" />
             </div>
          </div>

          {/* Right: Action Figure & UI Elements */}
          <div className="absolute right-0 top-0 bottom-0 w-[50%] z-10">
             
             {/* 1. Abstract UI Elements in Background */}
             <div className="absolute top-10 right-20 w-[400px] h-[240px] border border-emerald-500/20 bg-emerald-900/5 backdrop-blur-sm rounded-lg transform rotate-[-5deg] scale-90 z-0 flex flex-col overflow-hidden">
                <div className="h-6 bg-emerald-500/10 border-b border-emerald-500/10 flex items-center px-2 gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                  <div className="w-2 h-2 rounded-full bg-green-500/50" />
                </div>
                <div className="flex-1 p-4 grid grid-cols-2 gap-2 opacity-50">
                  <div className="bg-emerald-500/10 rounded h-20" />
                  <div className="bg-emerald-500/10 rounded h-20" />
                  <div className="bg-emerald-500/10 rounded h-full col-span-2" />
                </div>
             </div>

             {/* 2. Character - Running Pose (Dynamic) */}
             <div className="absolute bottom-[-20px] right-[50px] w-[380px] h-[380px] z-20">
                {/* Speed Lines behind character */}
                <div className="absolute top-1/2 left-0 w-full h-2 bg-emerald-500/50 blur-sm transform -skew-x-12 translate-x-[-100px]" />
                
                <Image 
                  src="/ip/草莓头IP-奔跑姿势.png" 
                  alt="Stravision Action" 
                  fill
                  className="object-contain drop-shadow-[0_0_50px_rgba(16,185,129,0.4)] transform scale-x-[-1]" // Flip horizontally to run towards text
                  priority
                />
             </div>

             {/* 3. Floating HUD Card (Foreground) */}
             <div className="absolute bottom-12 right-12 bg-black/80 backdrop-blur-xl border-l-4 border-emerald-500 p-4 z-30 shadow-2xl max-w-[200px]">
               <div className="flex items-center gap-2 mb-2">
                 <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                 <span className="text-white font-bold text-sm italic">ENERGY SAVING</span>
               </div>
               <div className="text-3xl font-black text-white leading-none">
                 35<span className="text-sm text-gray-500 font-normal">%</span>
               </div>
               <p className="text-[10px] text-gray-400 mt-1">Efficiency Boost</p>
             </div>

          </div>

        </div>

        {/* Overlay Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,black_100%)] z-20" />

      </div>
    </div>
  )
}

function StatItem({ value, label }: { value: string, label: string }) {
  return (
    <div>
      <div className="text-2xl font-black text-white italic leading-none mb-1">{value}</div>
      <div className="text-[10px] font-bold text-emerald-500 tracking-widest">{label}</div>
    </div>
  )
}
