"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home, AlertTriangle, Terminal, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

// Animation variants similar to profile page
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black flex flex-col relative overflow-hidden">
      
      {/* Background Grid - Very Subtle */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
           style={{ 
             backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
             backgroundSize: '40px 40px' 
           }}
      />
      
      {/* Top Status Bar */}
      <nav className="w-full h-20 px-8 md:px-12 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-900 bg-[#FAFAFA]/80 dark:bg-[#050505]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3 opacity-60">
           <Activity className="w-4 h-4 text-zinc-500" />
           <span className="text-xs font-mono tracking-widest uppercase">System Status: Error</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-xs font-mono text-zinc-400">
           <span>ERR_CODE: 404_NOT_FOUND</span>
           <span>TIMESTAMP: {new Date().toISOString().split('T')[0]}</span>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center px-8 md:px-24 relative z-10">
        <motion.div 
           initial="hidden" 
           animate="visible" 
           variants={staggerContainer}
           className="max-w-4xl"
        >
          {/* Error Display */}
          <motion.div variants={fadeInUp} className="flex items-baseline gap-4 mb-6">
             <span className="text-primary font-mono text-sm tracking-wider">● SYSTEM_ALERT</span>
             <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
          </motion.div>

          <motion.h1 
            variants={fadeInUp}
            className="text-8xl md:text-[12rem] leading-none font-bold tracking-tighter text-zinc-900 dark:text-white mb-8 -ml-1"
          >
            404
          </motion.h1>

          <motion.div variants={fadeInUp} className="space-y-8 max-w-2xl">
             <div className="border-l-2 border-primary pl-6 py-2">
                <h2 className="text-2xl md:text-3xl font-light mb-2 text-zinc-800 dark:text-zinc-200">
                   页面不存在或已被移除
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 font-mono text-sm leading-relaxed">
                   The requested resource could not be found on this server. <br/>
                   Please check your URL or return to the system dashboard.
                </p>
             </div>

             {/* Actions */}
             <div className="flex flex-wrap items-center gap-6 pt-4">
                <Button 
                   onClick={() => router.push('/')}
                   className="h-12 px-8 rounded-none border border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all text-sm font-medium tracking-wide uppercase"
                >
                   <Home className="w-4 h-4 mr-2" />
                   Return Home
                </Button>

                <Button 
                   variant="ghost"
                   onClick={() => router.back()}
                   className="h-12 px-8 rounded-none border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all text-sm font-medium tracking-wide uppercase"
                >
                   <ArrowLeft className="w-4 h-4 mr-2" />
                   Back Previous
                </Button>
             </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer / System Info */}
      <footer className="h-24 px-8 md:px-12 border-t border-zinc-200 dark:border-zinc-900 flex items-center justify-between text-zinc-400 text-xs font-mono bg-[#FAFAFA] dark:bg-[#050505]">
         <div className="flex items-center gap-8">
            <div className="flex flex-col">
               <span className="uppercase tracking-wider text-zinc-500 mb-1">Platform</span>
               <span>STRAVISION OS v2.0</span>
            </div>
            <div className="hidden md:flex flex-col">
               <span className="uppercase tracking-wider text-zinc-500 mb-1">Region</span>
               <span>CN-EAST-1</span>
            </div>
         </div>
         <div className="flex items-center gap-2 opacity-50">
             <Terminal className="w-4 h-4" />
             <span>root@stravision:~$ _</span>
         </div>
      </footer>
    </div>
  )
}
