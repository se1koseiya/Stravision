"use client"

import { Toaster } from "sonner"
import { useEffect, useState } from "react"

export function ToasterWrapper() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <>
      <style jsx global>{`
        /* === 简洁通知 === */

        [data-sonner-toast] {
          background: #fff !important;
          border: 1px solid rgba(0,0,0,0.06) !important;
          border-radius: 12px !important;
          padding: 12px 16px !important;
          min-width: 280px !important;
          max-width: 420px !important;
          box-shadow:
            0 4px 24px rgba(0,0,0,0.08),
            0 1px 3px rgba(0,0,0,0.04) !important;
          overflow: hidden !important;
          transition: all 0.25s ease !important;
        }

        [data-sonner-toast]:hover {
          box-shadow:
            0 8px 32px rgba(0,0,0,0.11),
            0 2px 6px rgba(0,0,0,0.05) !important;
          transform: translateY(-1px) !important;
        }

        /* 图标 - 小巧内联 */
        [data-sonner-toast] [data-icon] {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 22px !important;
          height: 22px !important;
          min-width: 22px !important;
          margin: 2px 10px 0 0 !important;
          flex-shrink: 0 !important;
          border-radius: 6px !important;
          background: transparent !important;
          border: none !important;
          overflow: hidden !important;
        }
        [data-sonner-toast] [data-icon] svg {
          width: 18px !important;
          height: 18px !important;
          max-width: 100% !important;
          max-height: 100% !important;
        }

        /* 内容 */
        [data-sonner-toast] [data-content] {
          flex: 1 !important;
          min-width: 0 !important;
          padding: 1px 8px 1px 0 !important;
        }

        /* 标题 */
        [data-sonner-toast] [data-title] {
          color: #1e293b !important;
          font-size: 13.5px !important;
          font-weight: 500 !important;
          line-height: 1.4 !important;
        }

        /* 描述 */
        [data-sonner-toast] [data-description] {
          color: #64748b !important;
          font-size: 12.5px !important;
          line-height: 1.4 !important;
          margin-top: 2px !important;
        }

        /* 关闭按钮 */
        [data-sonner-toast] [data-close-button] {
          background: none !important;
          border: none !important;
          border-radius: 6px !important;
          color: #94a3b8 !important;
          width: 22px !important;
          height: 22px !important;
          margin: 0 0 0 auto !important;
          flex-shrink: 0 !important;
          align-self: center !important;
          transition: all 0.15s ease !important;
          order: 3 !important;
        }
        [data-sonner-toast] [data-close-button]:hover {
          background: rgba(0,0,0,0.05) !important;
          color: #475569 !important;
        }

        /* 操作按钮 */
        [data-sonner-toast] [data-button] {
          background: #f1f5f9 !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          color: #334155 !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          padding: 5px 12px !important;
          margin-top: 6px !important;
        }
        [data-sonner-toast] [data-button]:hover {
          background: #e2e8f0 !important;
        }

        /* 进度条 */
        [data-sonner-toast] [data-loading-bar] {
          background: #e2e8f0 !important;
          height: 2px !important;
          bottom: 0 !important;
        }
        [data-sonner-toast] [data-loading-bar] > div {
          background: #10b981 !important;
        }

        @keyframes sonner-spin { to { transform: rotate(360deg); } }

        /* === 深色模式适配 === */
        .dark [data-sonner-toast] {
          background: #27272a !important;
          border-color: rgba(255,255,255,0.08) !important;
          box-shadow:
            0 4px 24px rgba(0,0,0,0.3),
            0 1px 3px rgba(0,0,0,0.15) !important;
        }
        .dark [data-sonner-toast]:hover {
          box-shadow:
            0 8px 32px rgba(0,0,0,0.35),
            0 2px 6px rgba(0,0,0,0.2) !important;
        }
        .dark [data-sonner-toast] [data-title] {
          color: #f4f4f5 !important;
        }
        .dark [data-sonner-toast] [data-description] {
          color: #a1a1aa !important;
        }
        .dark [data-sonner-toast] [data-close-button] {
          color: #71717a !important;
        }
        .dark [data-sonner-toast] [data-close-button]:hover {
          background: rgba(255,255,255,0.06) !important;
          color: #d4d4d8 !important;
        }
        .dark [data-sonner-toast] [data-button] {
          background: #3f3f46 !important;
          border-color: #52525b !important;
          color: #e4e4e7 !important;
        }
        .dark [data-sonner-toast] [data-button]:hover {
          background: #52525b !important;
        }
        .dark [data-sonner-toast] [data-loading-bar] {
          background: #3f3f46 !important;
        }
      `}</style>
      <Toaster
        position="top-center"
        closeButton
        gap={12}
        toastOptions={{
          style: {
            background: 'transparent',
            padding: 0,
          },
        }}
        icons={{
          success: (
            <svg width={18} height={18} fill="none" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" stroke="#10b981" strokeWidth="1.8" />
              <path d="M7 10l2.5 2.5L13 8" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
          error: (
            <svg width={18} height={18} fill="none" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" stroke="#ef4444" strokeWidth="1.8" />
              <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ),
          warning: (
            <svg width={18} height={18} fill="none" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" stroke="#f59e0b" strokeWidth="1.8" />
              <path d="M10 6v5M10 13v.5" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ),
          info: (
            <svg width={18} height={18} fill="none" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" stroke="#3b82f6" strokeWidth="1.8" />
              <path d="M10 6v5M10 13v.5" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ),
          loading: (
            <svg width={18} height={18} fill="none" viewBox="0 0 24 24" style={{ animation: 'sonner-spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="9" stroke="#cbd5e1" strokeWidth="2.2" opacity={0.6} />
              <path d="M12 3a9 9 0 0 1 9 9" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          ),
        }}
      />
    </>
  )
}
