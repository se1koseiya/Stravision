"use client"

import { useState, useEffect } from "react"
import { Globe, Lock, RotateCw, X, ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface BrowserActivityProps {
  url: string
  isOpen: boolean
  onClose: () => void
}

export function BrowserActivity({ url, isOpen, onClose }: BrowserActivityProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [displayUrl, setDisplayUrl] = useState(url)
  const [iframeKey, setIframeKey] = useState(0)

  useEffect(() => {
    setDisplayUrl(url)
    setIsLoading(true)
    setIframeKey(prev => prev + 1)
  }, [url])

  // 提取域名用于标题
  const getDomain = (u: string) => {
    try {
      return new URL(u).hostname
    } catch {
      return u
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-24 right-6 w-[400px] md:w-[480px] h-[320px] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden z-50 flex flex-col ring-1 ring-black/5"
        >
          {/* Browser Toolbar */}
          <div className="flex flex-col gap-2 p-2 bg-zinc-100/50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            {/* Window Controls & Title */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                    <div className="flex gap-1.5 group">
                        <button onClick={onClose} className="size-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors shadow-sm" />
                        <div className="size-3 rounded-full bg-amber-400 shadow-sm" />
                        <div className="size-3 rounded-full bg-emerald-400 shadow-sm" />
                    </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-400">
                    <Globe size={10} />
                    <span>AI Browsing Session</span>
                </div>
            </div>

            {/* Address Bar */}
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2 py-1.5 shadow-sm">
              <div className="flex gap-1 text-zinc-400">
                 <Lock size={12} className="text-emerald-500" />
              </div>
              <div className="flex-1 text-xs truncate font-mono text-zinc-600 dark:text-zinc-300 selection:bg-blue-100">
                {displayUrl}
              </div>
              <div className="flex items-center gap-1">
                 {isLoading ? (
                    <Loader2 size={12} className="animate-spin text-blue-500" />
                 ) : (
                    <RotateCw 
                        size={12} 
                        className="text-zinc-400 hover:text-zinc-600 cursor-pointer" 
                        onClick={() => {
                            setIsLoading(true)
                            setIframeKey(prev => prev + 1)
                        }}
                    />
                 )}
              </div>
            </div>
          </div>

          {/* Browser Content Area */}
          <div className="flex-1 relative bg-white dark:bg-zinc-950 relative group">
            {/* Background Placeholder with Domain Info */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400">
                <Globe size={48} className="mb-3 opacity-20" />
                <div className="text-sm font-medium opacity-50">{getDomain(url)}</div>
                <div className="text-xs opacity-30 mt-1">正在加载预览...</div>
            </div>

            {/* Try using Microlink API for better screenshots */}
            <img
              key={iframeKey}
              src={`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`}
              alt="Page Preview"
              className="absolute inset-0 w-full h-full object-cover object-top opacity-0 transition-opacity duration-500"
              onLoad={(e) => {
                  setIsLoading(false);
                  (e.target as HTMLImageElement).classList.remove('opacity-0');
              }}
              onError={(e) => {
                  // Fallback to Google Favicon + Domain Card if screenshot fails
                  setIsLoading(false);
                  e.currentTarget.style.display = 'none';
              }}
            />
            
            {/* "AI is Reading" Overlay Effect */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-blue-500/5 to-transparent opacity-50" />
            
            {/* Scanning Line Animation */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-scan" />
            
            {/* Interactive Overlay */}
            <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors" />

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto transform translate-y-2 group-hover:translate-y-0 duration-200">
                <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-black text-white text-xs px-4 py-2 rounded-full backdrop-blur-md shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                    <ExternalLink size={12} />
                    在浏览器中打开
                </a>
            </div>
          </div>
          
          <style jsx>{`
            @keyframes scan {
                0% { top: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
            }
            .animate-scan {
                animation: scan 2s linear infinite;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
