"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2, ArrowLeft, Image as ImageIcon, FileText } from "lucide-react"
import Link from "next/link"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { toast } from "sonner"
import Image from "next/image"

export default function ProposalCoverPage() {
  const coverRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleExportPDF = async () => {
    if (!coverRef.current) return
    setIsExporting(true)
    const toastId = toast.loading("Generating PDF...")
    try {
      const canvas = await html2canvas(coverRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#050505",
        logging: false, // Turn off logging
        imageTimeout: 15000,
      })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      pdf.addImage(imgData, "PNG", 0, 0, 210, 297)
      pdf.save("Stravision-Proposal-Bold.pdf")
      toast.success("Cover downloaded successfully!", { id: toastId })
    } catch (error) {
      console.error("PDF Generation Error:", error)
      toast.error("Failed to generate PDF.", { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportImage = async () => {
    if (!coverRef.current) return
    setIsExporting(true)
    const toastId = toast.loading("Generating PNG...")
    try {
      const canvas = await html2canvas(coverRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#050505",
        logging: false,
        imageTimeout: 15000,
      })
      const imgData = canvas.toDataURL("image/png")
      const link = document.createElement('a')
      link.href = imgData
      link.download = 'Stravision-Proposal-Bold.png'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Image downloaded!", { id: toastId })
    } catch (error) {
      console.error("Image Generation Error:", error)
      toast.error("Failed to generate Image.", { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
      {/* Toolbar */}
      <div className="fixed top-6 right-6 z-50 flex gap-3">
        <Link href="/">
            <Button variant="ghost" className="text-white/50 hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
            </Button>
        </Link>
        <div className="flex gap-2">
            <Button onClick={handleExportImage} disabled={isExporting} className="bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md">
               {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />} PNG
            </Button>
            <Button onClick={handleExportPDF} disabled={isExporting} className="bg-primary hover:bg-primary text-black border-none font-medium">
               {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />} PDF
            </Button>
        </div>
      </div>

      {/* A4 Container - BOLD IMPACT DESIGN */}
      <div 
        className="relative bg-black shadow-2xl overflow-hidden"
        style={{ width: "210mm", height: "297mm", maxWidth: "100%", aspectRatio: "210/297" }}
      >
        <div ref={coverRef} className="w-full h-full relative flex flex-col overflow-hidden bg-black">
          
          {/* 1. Dramatic Background - Noise & Spotlights */}
          <div className="absolute inset-0 z-0">
             {/* Refined Noise Texture - Ultra Fine */}
             <div 
                className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat',
                }}
             />
             
             {/* Top Spotlight (Emerald) */}
             <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-primary/30 blur-[150px] rounded-full mix-blend-screen animate-pulse-slow" />
             
             {/* Bottom Backlight (Deep Blue) */}
             <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-700/20 blur-[120px] rounded-full mix-blend-screen" />

             {/* Giant Stroke Typography Background */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none select-none">
                <h1 className="text-[180px] font-black tracking-tighter leading-none text-transparent opacity-10 font-jinbuti" 
                    style={{ WebkitTextStroke: '2px rgba(255,255,255,0.3)' }}>
                   STRA<br/>VISION
                </h1>
             </div>
          </div>

          {/* 2. Content Layer */}
          <div className="relative z-10 flex flex-col h-full p-[18mm] justify-between">
             
             {/* Top Bar: High Contrast Brand */}
             <header className="flex justify-between items-center border-b border-white/20 pb-6">
                <div className="flex items-center gap-3">
                   {/* Logo: Transparent Background, Pure Shape */}
                   <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center backdrop-blur-md">
                      <div className="w-4 h-4 bg-primary rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                   </div>
                   <div className="flex flex-col">
                      <span className="font-bold text-xl tracking-tight leading-none text-white">STRAVISION</span>
                      <span className="text-[10px] font-mono text-primary tracking-widest">IOT PLATFORM</span>
                   </div>
                </div>
                <div className="text-right">
                   <div className="text-[40px] font-jinbuti leading-none text-white/90">2026</div>
                   <div className="text-[8px] font-mono tracking-[0.3em] text-white/50 text-right">STRATEGY PROPOSAL</div>
                </div>
             </header>

             {/* Center: Hero Visual - The "Impact" Zone */}
             <main className="flex-1 relative flex flex-col items-center justify-center -mt-10">
                
                {/* Visual Anchor: Holographic Platform */}
                <div className="relative w-full flex justify-center items-center">
                   
                   {/* Background Circle */}
                   <div className="absolute w-[500px] h-[500px] border border-primary/20 rounded-full flex items-center justify-center animate-[spin_60s_linear_infinite]">
                      <div className="w-[480px] h-[480px] border border-dashed border-white/10 rounded-full" />
                   </div>
                   
                   {/* IP Image - Large & Center */}
                   <div className="relative z-20 transform transition-transform hover:scale-105 duration-700">
                      {/* Added unoptimized prop to prevent CORS issues with Next.js image optimization during html2canvas export */}
                      <Image 
                        src="/ip/草莓头IP-坐姿玩手机.png" 
                        alt="Stravision IP" 
                        width={650} 
                        height={650}
                        className="object-contain drop-shadow-[0_50px_80px_rgba(16,185,129,0.25)]"
                        priority
                        unoptimized 
                      />
                      
                      {/* Glass Cards - Asymmetric Floating UI */}
                      <div className="absolute top-[15%] left-[-10%] bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl rotate-[-5deg]">
                         <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] font-mono text-white/80">LIVE MONITORING</span>
                         </div>
                         <div className="text-2xl font-bold font-mono">24.5°C</div>
                         <div className="h-1 w-20 bg-white/10 rounded-full mt-2 overflow-hidden">
                            <div className="h-full w-[70%] bg-primary" />
                         </div>
                      </div>

                      <div className="absolute bottom-[15%] right-[-12%] bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl rotate-[5deg]">
                         <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-[10px] font-mono text-white/80">YIELD PREDICTION</span>
                         </div>
                         <div className="text-2xl font-bold font-mono">+18.5%</div>
                         <div className="flex gap-1 mt-2">
                            {[1,2,3,4,5].map(i => (
                               <div key={i} className="w-1 h-3 bg-blue-500" style={{ opacity: i * 0.2 }} />
                            ))}
                         </div>
                      </div>
                   </div>

                </div>

                {/* Typography: Bold & Direct */}
                <div className="relative z-30 text-center -mt-10 mix-blend-hard-light">
                   <h1 className="font-jinbuti text-[80px] leading-[0.9] text-white tracking-wide drop-shadow-2xl mb-6">
                      莓界·智能
                   </h1>
                   <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-[2px] w-20 bg-primary mb-4" />
                      <h2 className="text-3xl font-bold tracking-wide text-white font-jinbuti drop-shadow-lg">
                         AI 驱动的物联网大棚种植管理平台
                      </h2>
                      <p className="text-[10px] font-mono text-emerald-400 tracking-[0.3em] uppercase mt-2 opacity-80">
                         Intelligent Greenhouse Management System
                      </p>
                   </div>
                </div>

             </main>

             {/* Footer: Tech Specs style */}
             <footer className="grid grid-cols-3 gap-8 border-t border-white/20 pt-8">
                <div>
                   <h3 className="text-[10px] font-mono text-primary mb-2">PLATFORM VERSION</h3>
                   <p className="text-sm font-bold leading-tight text-white/80 font-jinbuti">V 2.0.0<br/>Enterprise Edition</p>
                </div>
                <div>
                   <h3 className="text-[10px] font-mono text-primary mb-2">DOCUMENT TYPE</h3>
                   <p className="text-sm font-bold leading-tight text-white/80 font-jinbuti">内部战略<br/>规划白皮书</p>
                </div>
                <div className="text-right">
                   <h3 className="text-[10px] font-mono text-primary mb-2">CONFIDENTIALITY</h3>
                   <div className="flex justify-end gap-1">
                      <div className="w-10 h-3 bg-white/20 skew-x-[-20deg]" />
                      <div className="w-2 h-3 bg-primary skew-x-[-20deg]" />
                   </div>
                </div>
             </footer>

          </div>
        </div>
      </div>

      <style jsx global>{`
        @font-face {
          font-family: 'DingTalk JinBuTi';
          src: url('/fonts/DingTalkJinBuTi.ttf');
        }
        .font-jinbuti {
          font-family: 'DingTalk JinBuTi', sans-serif;
        }
        .animate-pulse-slow {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  )
}
