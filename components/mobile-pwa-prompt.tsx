"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { IconClose, IconMore, IconPlusCross, IconShare } from "@/components/icon";

export function MobilePwaPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null)

  useEffect(() => {
    // 1. Check platform
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIos = /iphone|ipad|ipod/.test(userAgent)
    const isAndroid = /android/.test(userAgent)

    if (!isIos && !isAndroid) return

    // 2. Check if already in standalone mode (PWA installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true

    // 3. Check if prompt was already dismissed
    const hasSeenPrompt = localStorage.getItem("pwa-prompt-seen") || localStorage.getItem("ios-pwa-prompt-seen")

    // Show prompt only if: Mobile + Not Standalone + Not Seen Before
    if (!isStandalone && !hasSeenPrompt) {
      setPlatform(isIos ? 'ios' : 'android')
      // Small delay for better UX
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("pwa-prompt-seen", "true")
  }

  if (!showPrompt || !platform) return null

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          {/* Prompt Card */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[101] p-4 pb-8"
          >
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl border border-black/5 dark:border-white/10 relative overflow-hidden">
              {/* Close Button */}
              <button 
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <IconClose className="w-5 h-5 text-slate-400" />
              </button>

              <div className="flex flex-col items-center text-center space-y-4">
                {/* Icon */}
                <div className="w-16 h-16 bg-white rounded-[1.2rem] shadow-md border border-slate-100 dark:border-slate-800 p-1 mb-2">
                    <img src="/logo.png" alt="App Icon" className="w-full h-full object-contain rounded-[0.8rem]" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    添加到主屏幕
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                    为了获得最佳的全屏体验，请将 Stravision 添加到您的主屏幕。
                  </p>
                </div>

                {/* Steps */}
                <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mt-2 text-left space-y-3 border border-slate-100 dark:border-white/5">
                  {platform === 'ios' ? (
                    <>
                      <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-xs font-bold shrink-0">1</span>
                        <span>点击浏览器底部的 <IconShare className="w-4 h-4 inline mx-1 text-blue-500" /> 分享按钮</span>
                      </div>
                      <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 ml-3" />
                      <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-xs font-bold shrink-0">2</span>
                        <span>向下滑动并选择 <span className="font-bold">"添加到主屏幕"</span></span>
                      </div>
                      <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 ml-3" />
                      <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-xs font-bold shrink-0">3</span>
                        <span>点击右上角的 <span className="font-bold text-blue-500">添加</span> 即可完成</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-xs font-bold shrink-0">1</span>
                        <span>点击浏览器右上角的 <IconMore className="w-4 h-4 inline mx-1 text-slate-500" /> 菜单按钮</span>
                      </div>
                      <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 ml-3" />
                      <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-xs font-bold shrink-0">2</span>
                        <span>选择 <span className="font-bold">"安装应用"</span> 或 <span className="font-bold">"添加到主屏幕"</span></span>
                      </div>
                      <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 ml-3" />
                      <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-xs font-bold shrink-0">3</span>
                        <span>点击 <span className="font-bold text-blue-500">安装</span> 即可完成</span>
                      </div>
                    </>
                  )}
                </div>

                <Button 
                  variant="ghost" 
                  onClick={handleDismiss}
                  className="w-full rounded-xl h-12 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  暂不添加
                </Button>
              </div>
              
              {/* Arrow pointing to share button (approximate position for iOS) */}
              {platform === 'ios' && (
                <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-6 h-6 bg-white dark:bg-slate-900 rotate-45 border-r border-b border-black/5 dark:border-white/10 hidden md:hidden" />
              )}
              {/* Arrow for Android (top right) - usually not easy to point to, so omitting */}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
