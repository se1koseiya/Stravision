"use client"
import { useState, useEffect } from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

export function DesktopInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) return

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Check if dismissed recently (e.g., 7 days)
      const lastDismissed = localStorage.getItem("desktop-install-dismissed")
      if (lastDismissed) {
        const days = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24)
        if (days < 7) return
      }

      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("desktop-install-dismissed", Date.now().toString())
  }

  if (!showPrompt) return null

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 pr-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white/20 dark:border-white/10 ring-1 ring-black/5"
        >
          <div className="flex items-center gap-3.5">
             <div className="size-11 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                <img src="/icon.png" alt="App Icon" className="w-full h-full object-cover" />
             </div>
             <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight mb-0.5">安装桌面应用</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">获得原生应用般的流畅体验</p>
             </div>
          </div>
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700 ml-1">
            <Button 
              size="sm" 
              onClick={handleInstall} 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-8 px-4 text-xs font-bold shadow-sm shadow-blue-500/20"
            >
               安装
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={handleDismiss} 
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
               <X className="size-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
