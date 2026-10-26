"use client"

/**
 * 轻提示（toast）宿主 —— **右下角**，与顶部居中的全局提示（antd message）分屏。
 *
 * ── 2026-10-21 位置迁移 ──
 *   原先 `position="top-center"`，与 antd `message` 抢同一块屏幕位置、样式却完全不同：
 *   同一个操作里两个都触发时，用户会在顶部居中看到两条长得不一样的提示叠在一起。
 *   现在职责切开（见 `lib/ui/feedback.ts` 文件头）：
 *     · toast    → 右下角，操作级即时反馈（复制、保存、开关、校验）
 *     · message  → 顶部居中，系统级 / 跨页面事件（登录、网络、权限、后台任务）
 *
 *   ⚠️ 右下角有两处已被占用，offset 必须让它俩：
 *     · Copilot 莓果球：52px 直径、距底/右各 16 → 占到 bottom 68
 *       （`components/ai/copilot/copilot-berry.tsx#COPILOT_FAB`，只有部分页面挂）
 *     · 移动端底部导航：`bottom-8` + 内边距 → 占到 bottom 约 92
 *   所以桌面 bottom=80、移动端 bottom=96（叠 safe-area），否则 toast 会直接压住它们。
 *
 * ⛔ 别再改回 top-center：那样 message / toast 又会撞在一起。
 */

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

        /* === 轻提示（右下角） ===
           刻意比「全局提示」小一号：它只是角落里说一句就走，不该抢占注意力。
           尺寸口径：min 240 / max 380，内衬 10×14，字号 13。 */

        [data-sonner-toast] {
          background: #fff !important;
          border: 1px solid rgba(0,0,0,0.06) !important;
          border-radius: 12px !important;
          padding: 10px 14px !important;
          min-width: 240px !important;
          max-width: 380px !important;
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
          color: #27272a !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          line-height: 1.4 !important;
        }

        /* 描述 */
        [data-sonner-toast] [data-description] {
          color: #71717a !important;
          font-size: 12px !important;
          line-height: 1.4 !important;
          margin-top: 2px !important;
        }

        /* 关闭按钮 */
        [data-sonner-toast] [data-close-button] {
          background: none !important;
          border: none !important;
          border-radius: 6px !important;
          color: #a1a1aa !important;
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
          color: #52525B !important;
        }

        /* 操作按钮 */
        [data-sonner-toast] [data-button] {
          background: #f4f4f5 !important;
          border: 1px solid #e4e4e7 !important;
          border-radius: 8px !important;
          color: #3F3F46 !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          padding: 5px 12px !important;
          margin-top: 6px !important;
        }
        [data-sonner-toast] [data-button]:hover {
          background: #e4e4e7 !important;
        }

        /* 进度条 */
        [data-sonner-toast] [data-loading-bar] {
          background: #e4e4e7 !important;
          height: 2px !important;
          bottom: 0 !important;
        }
        [data-sonner-toast] [data-loading-bar] > div {
          background: #059669 !important;
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
        position="bottom-right"
        /* 让位给右下角既有浮层：桌面 = 莓果球（占到 68），移动端 = 底部导航（占到约 92） */
        offset={{ bottom: 80, right: 16 }}
        mobileOffset={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)", right: 12 }}
        closeButton
        gap={10}
        toastOptions={{
          style: {
            background: 'transparent',
            padding: 0,
          },
        }}
        icons={{
          success: (
            <svg width={18} height={18} fill="none" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" stroke="#059669" strokeWidth="1.8" />
              <path d="M7 10l2.5 2.5L13 8" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
          error: (
            <svg width={18} height={18} fill="none" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" stroke="#DC2626" strokeWidth="1.8" />
              <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" stroke="#DC2626" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ),
          warning: (
            <svg width={18} height={18} fill="none" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" stroke="#52525B" strokeWidth="1.8" />
              <path d="M10 6v5M10 13v.5" stroke="#52525B" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ),
          info: (
            <svg width={18} height={18} fill="none" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" stroke="#059669" strokeWidth="1.8" />
              <path d="M10 6v5M10 13v.5" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ),
          loading: (
            <svg width={18} height={18} fill="none" viewBox="0 0 24 24" style={{ animation: 'sonner-spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="9" stroke="#d4d4d8" strokeWidth="2.2" opacity={0.6} />
              <path d="M12 3a9 9 0 0 1 9 9" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          ),
        }}
      />
    </>
  )
}
