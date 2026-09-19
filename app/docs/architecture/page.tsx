"use client"

import { ArchitectureDiagram } from "@/components/docs/architecture-diagram"
import { LogicalArchitectureDiagram } from "@/components/docs/logical-architecture-diagram"
import { DatabaseArchitectureDiagram } from "@/components/docs/database-architecture-diagram"
import { UserFlowDiagram } from "@/components/docs/user-flow-diagram"
import Link from "next/link"
import { motion } from "framer-motion"
import { IconArrowLeft } from "@/components/icon";

const GridBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none">
    <div className="absolute inset-0 bg-[#020202]" />
    {/* Grid Lines */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
    {/* Noise */}
    <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
         style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
    />
  </div>
)

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen relative overflow-x-hidden text-zinc-100 font-sans selection:bg-primary/30 bg-[#050505]">
      <GridBackground />
      
      {/* Ambient Glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <main className="relative z-10 min-h-screen flex flex-col">
        {/* Nav */}
        <header className="px-6 md:px-12 py-6 flex items-center justify-between backdrop-blur-sm sticky top-0 z-50 border-b border-white/5">
          <Link 
            href="/docs" 
            className="group flex items-center gap-2 text-zinc-500 hover:text-emerald-400 transition-colors text-sm font-mono uppercase tracking-widest"
          >
            <IconArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Docs
          </Link>
          
          <div className="flex items-center gap-2">
             <div className="flex gap-1">
                <span className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                <span className="w-1 h-1 bg-primary rounded-full animate-pulse delay-75" />
                <span className="w-1 h-1 bg-primary rounded-full animate-pulse delay-150" />
             </div>
             <span className="text-xs font-mono text-primary/50 uppercase tracking-widest">System Architecture V4.2</span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-x-auto space-y-24 pb-24">
           {/* Overall Architecture */}
           <section id="overall" className="w-full">
              <ArchitectureDiagram />
           </section>
           
           {/* Divider */}
           <div className="w-full max-w-7xl mx-auto h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

           {/* Logical Architecture */}
           <section id="logical" className="w-full">
              <LogicalArchitectureDiagram />
           </section>

           {/* Divider */}
           <div className="w-full max-w-7xl mx-auto h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

           {/* Database Architecture */}
           <section id="database" className="w-full">
              <DatabaseArchitectureDiagram />
           </section>

           {/* Divider */}
           <div className="w-full max-w-7xl mx-auto h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

           {/* User Flow */}
           <section id="userflow" className="w-full">
              <UserFlowDiagram />
           </section>
        </div>
        
        {/* Footer */}
        <footer className="px-6 md:px-12 py-6 flex justify-between items-center border-t border-white/5 bg-black/20 backdrop-blur-md">
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
            Stravision IoT Platform // Architecture Overview
          </p>
          <p className="text-[10px] text-zinc-700 font-mono uppercase tracking-widest hidden md:block">
            Designed for Precision Agriculture
          </p>
        </footer>
      </main>
    </div>
  )
}
