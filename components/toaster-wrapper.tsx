"use client"

import { Toaster } from "sonner"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ToasterWrapper() {
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 确定当前实际主题
  const currentTheme = mounted ? (theme === 'system' ? systemTheme : theme) : 'dark'
  const isDark = currentTheme === 'dark'

  return (
    <>
      <style jsx global>{`
        [data-sonner-toast] {
          display: flex !important;
          align-items: flex-start !important;
          gap: 0.875rem !important;
        }
        [data-sonner-toast] [data-icon] {
          margin-top: 0.125rem !important;
        }
        [data-sonner-toast] [data-content] {
          flex: 1 !important;
        }
      `}</style>
      <Toaster 
        position="top-center"
        closeButton
        toastOptions={{
          style: {
            background: isDark 
              ? 'linear-gradient(135deg, #3a4556 0%, #2d3748 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            backdropFilter: 'blur(20px)',
            border: isDark ? 'none' : '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '1.25rem',
            padding: '1.25rem 1.5rem',
            minWidth: '420px',
            maxWidth: '600px',
            boxShadow: isDark 
              ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
              : '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          },
          classNames: {
            toast: 'group',
            title: isDark 
              ? 'text-white font-semibold text-base tracking-tight'
              : 'text-slate-900 font-semibold text-base tracking-tight',
            description: isDark
              ? 'text-slate-300/90 text-sm font-normal leading-relaxed mt-1.5'
              : 'text-slate-600 text-sm font-normal leading-relaxed mt-1.5',
            actionButton: isDark
              ? 'bg-white/10 hover:bg-white/20 text-white border-0 rounded-lg px-4 py-2 font-medium transition-all hover:scale-105'
              : 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-900 border-0 rounded-lg px-4 py-2 font-medium transition-all hover:scale-105',
            cancelButton: isDark
              ? 'bg-white/5 hover:bg-white/10 text-slate-400 border-0 rounded-lg px-4 py-2 transition-all'
              : 'bg-slate-900/5 hover:bg-slate-900/10 text-slate-600 border-0 rounded-lg px-4 py-2 transition-all',
            closeButton: isDark
              ? 'bg-white/5 hover:bg-white/15 border-0 text-slate-400 hover:text-white transition-all rounded-lg w-7 h-7'
              : 'bg-slate-900/5 hover:bg-slate-900/15 border-0 text-slate-600 hover:text-slate-900 transition-all rounded-lg w-7 h-7',
          },
        }}
        icons={{
          success: (
            <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 shadow-sm ${
              isDark 
                ? 'bg-emerald-500/15 border-[2px] border-emerald-500 shadow-emerald-500/20'
                : 'bg-emerald-50 border-[2px] border-emerald-500 shadow-emerald-500/10'
            }`}>
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ),
          error: (
            <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 shadow-sm ${
              isDark
                ? 'bg-red-500/15 border-[2px] border-red-500 shadow-red-500/20'
                : 'bg-red-50 border-[2px] border-red-500 shadow-red-500/10'
            }`}>
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          ),
          warning: (
            <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 shadow-sm ${
              isDark
                ? 'bg-amber-500/15 border-[2px] border-amber-500 shadow-amber-500/20'
                : 'bg-amber-50 border-[2px] border-amber-500 shadow-amber-500/10'
            }`}>
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          ),
          info: (
            <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 shadow-sm ${
              isDark
                ? 'bg-emerald-500/15 border-[2px] border-emerald-500 shadow-emerald-500/20'
                : 'bg-emerald-50 border-[2px] border-emerald-500 shadow-emerald-500/10'
            }`}>
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ),
        }}
      />
    </>
  )
}
