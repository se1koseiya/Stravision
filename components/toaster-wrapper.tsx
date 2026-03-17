"use client"

import { Toaster } from "sonner"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export function ToasterWrapper() {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if current path indicates a mobile page (ending with -ios)
    // OR if the viewport is mobile width
    const isMobilePath = pathname?.includes('-ios')
    const isMobileWidth = window.innerWidth < 768

    setIsMobile(!!(isMobilePath || isMobileWidth))

    // Optional: Add resize listener if we want to be responsive to window resizing
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768 || (pathname?.includes('-ios') ?? false))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [pathname])

  return (
    <Toaster 
      position={isMobile ? "top-center" : "bottom-right"} 
      closeButton
      theme="system"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-white/75 group-[.toaster]:dark:bg-[#1c1c1e]/75 group-[.toaster]:backdrop-blur-2xl group-[.toaster]:border group-[.toaster]:border-white/20 group-[.toaster]:dark:border-white/10 group-[.toaster]:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)] group-[.toaster]:rounded-[2rem] group-[.toaster]:p-4",
          title: "group-[.toast]:font-bold group-[.toast]:text-sm group-[.toast]:text-slate-900 group-[.toast]:dark:text-white",
          description: "group-[.toast]:text-xs group-[.toast]:text-slate-600 group-[.toast]:dark:text-slate-300 group-[.toast]:font-medium",
          actionButton: "group-[.toast]:bg-slate-900 group-[.toast]:dark:bg-white group-[.toast]:text-white group-[.toast]:dark:text-slate-900",
          cancelButton: "group-[.toast]:bg-slate-100 group-[.toast]:dark:bg-slate-800 group-[.toast]:text-slate-500 group-[.toast]:dark:text-slate-400",
        }
      }}
    />
  )
}
