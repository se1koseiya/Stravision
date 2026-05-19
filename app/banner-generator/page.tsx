"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { toPng } from "html-to-image"
import { Sprout, Activity, Zap, Cpu, Wind, Droplets, Sun, Wifi } from "lucide-react"
import { toast } from "sonner"

export default function BannerGenerator() {
  const bannerRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleDownload = async () => {
    if (!bannerRef.current) return
    setIsExporting(true)
    
    try {
      const dataUrl = await toPng(bannerRef.current, { 
        quality: 1.0,
        pixelRatio: 2,
        cacheBust: true,
      })
      
      const link = document.createElement('a')
      link.download = 'stravision-readme-banner.png'
      link.href = dataUrl
      link.click()
      toast.success("Banner 下载成功！")
    } catch (err) {
      console.error(err)
      toast.error("导出失败")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-8 gap-8 font-sans">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">GitHub Readme Banner</h1>
        <p className="text-zinc-400">Dark Mode · Glassmorphism · Industrial Design</p>
      </div>

      {/* Banner Area - 1280x640 */}
      <div 
        ref={bannerRef}
        className="relative w-[1280px] h-[640px] overflow-hidden bg-[#09090b] text-white flex flex-col shadow-2xl"
      >
        {/* --- Background Effects --- */}
        {/* Gradient Orbs */}
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/20 blur-[150px] rounded-full mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full mix-blend-screen" />
        
        {/* Grid Texture */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03] scale-150" />
        
        {/* Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

        {/* --- Content Layout --- */}
        <div className="relative z-10 w-full h-full flex items-center justify-between px-24">
            
            {/* Left Column: Typography & Badges */}
            <div className="flex flex-col gap-10 max-w-[640px] pt-8">
                {/* Top Badge */}
                <div className="flex items-center gap-3">
                    <div className="h-[1px] w-8 bg-primary/50" />
                    <span className="text-emerald-400 font-mono text-sm tracking-[0.2em] uppercase">
                        AI-Driven Agriculture Platform
                    </span>
                </div>
                
                {/* Main Title */}
                <div className="space-y-4">
                    <h1 className="text-[6.5rem] font-bold tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-500">
                        STRAVISION
                    </h1>
                    <div className="flex items-center gap-6">
                        <h2 className="text-5xl font-bold text-white/90 tracking-tight">
                            莓界 · 智慧农业
                        </h2>
                        <div className="px-4 py-1 rounded-full border border-white/10 bg-white/5 text-sm font-mono text-zinc-400 backdrop-blur-md">
                            v2.0.0
                        </div>
                    </div>
                </div>
                
                {/* Description */}
                <p className="text-xl text-zinc-400 font-light leading-relaxed max-w-lg border-l-2 border-white/10 pl-6">
                    Next.js 全栈物联网解决方案。
                    <span className="block mt-2 text-zinc-500">
                    集成实时监控、3D 可视化、AI 助手与自动化控制系统。
                    </span>
                </p>

                {/* Tech Stack - Glass Pills */}
                <div className="flex flex-wrap gap-3 mt-2">
                    {['Next.js 15', 'TypeScript', 'Tailwind', 'Three.js', 'IoT/MQTT', 'LLM'].map((tech, i) => (
                        <div key={tech} className="group relative">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500" />
                            <span className="relative block px-5 py-2.5 bg-zinc-900/80 border border-white/10 rounded-full text-zinc-300 font-medium text-sm backdrop-blur-md hover:border-white/20 hover:text-white transition-colors">
                                {tech}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column: Visual Composition */}
            <div className="relative w-[500px] h-[600px] flex items-center justify-center">
                
                {/* Background Glow for IP */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-b from-primary/10 to-transparent rounded-full blur-3xl" />

                {/* Main IP Image */}
                <div className="relative z-20 w-[620px] h-[620px] animate-float-slow">
                    <Image 
                        src="/ip/ip-banner.png" 
                        alt="Mascot" 
                        fill 
                        className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                        priority
                    />
                </div>

                {/* Floating Glass Bento Cards */}
                
                {/* Card 1: Monitor Status */}
                <div className="absolute top-20 right-[-20px] z-30 w-52 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl animate-float-delayed-1 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs text-zinc-500 font-mono">LIVE STATUS</span>
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500/20" />
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/20" />
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-emerald-400">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-lg font-bold text-white">24.5°C</div>
                            <div className="text-xs text-zinc-500">生长环境适宜</div>
                        </div>
                    </div>
                </div>

                {/* Card 2: AI Analysis */}
                <div className="absolute bottom-32 left-[-60px] z-30 w-48 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl animate-float-delayed-2">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                            <Cpu className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-white">AI 智脑</span>
                    </div>
                    <div className="space-y-2">
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full w-[70%] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                            <span>ANALYZING</span>
                            <span>70%</span>
                        </div>
                    </div>
                </div>

                {/* Card 3: Control Icons */}
                <div className="absolute top-[45%] right-[-50px] z-10 p-3 bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col gap-3 animate-float-delayed-3">
                    <div className="p-2 bg-white/5 rounded-lg text-zinc-400"><Wind className="w-4 h-4" /></div>
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Droplets className="w-4 h-4" /></div>
                    <div className="p-2 bg-white/5 rounded-lg text-zinc-400"><Sun className="w-4 h-4" /></div>
                </div>

            </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="absolute bottom-0 w-full h-12 border-t border-white/5 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-between px-8 text-xs font-mono text-zinc-600">
            <div className="flex gap-6">
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-primary rounded-full animate-pulse" /> SYSTEM ONLINE</span>
                <span className="flex items-center gap-2"><Wifi className="w-3 h-3" /> IOT CONNECTED</span>
            </div>
            <div>
                DESIGNED BY STRAVISION TEAM
            </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button onClick={handleDownload} size="lg" disabled={isExporting} className="bg-white text-black hover:bg-zinc-200 font-bold px-8">
            {isExporting ? "Rendering..." : "Export 2x PNG"}
        </Button>
      </div>

      <style jsx global>{`
        @keyframes float-slow {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
        }
        @keyframes float-delayed-1 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        @keyframes float-delayed-2 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
        }
        @keyframes pulse-slow {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.15; }
        }
        .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
        .animate-float-delayed-1 { animation: float-delayed-1 7s ease-in-out infinite 1s; }
        .animate-float-delayed-2 { animation: float-delayed-2 8s ease-in-out infinite 2s; }
        .animate-float-delayed-3 { animation: float-slow 9s ease-in-out infinite 0.5s; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
