"use client"

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, Loader2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NoticeVariant = 'loading' | 'success' | 'error' | 'info'

export interface NoticeItem {
  id: number
  title: string
  description?: string
  variant?: NoticeVariant
  expanded: boolean
}

const variantConfig: Record<NoticeVariant, {
  icon: React.ReactNode
  gradientId: string
  stops: [string, string, string]
  strokeOpacity: number
  bgOpacity: number
}> = {
  error: {
    icon: <X size={18} className="text-red-400" />,
    gradientId: 'glass-err',
    stops: ['rgba(239,68,68,0.12)', 'rgba(239,68,68,0.06)', 'rgba(239,68,68,0.02)'],
    strokeOpacity: 0.25,
    bgOpacity: 0.08,
  },
  success: {
    icon: <CheckCircle2 size={18} className="text-emerald-400" />,
    gradientId: 'glass-ok',
    stops: ['rgba(16,185,129,0.12)', 'rgba(16,185,129,0.06)', 'rgba(16,185,129,0.02)'],
    strokeOpacity: 0.25,
    bgOpacity: 0.08,
  },
  loading: {
    icon: <Loader2 size={18} className="text-blue-400 animate-spin" />,
    gradientId: 'glass-load',
    stops: ['rgba(59,130,246,0.12)', 'rgba(59,130,246,0.06)', 'rgba(59,130,246,0.02)'],
    strokeOpacity: 0.25,
    bgOpacity: 0.08,
  },
  info: {
    icon: <Info size={18} className="text-blue-300" />,
    gradientId: 'glass-info',
    stops: ['rgba(147,197,253,0.10)', 'rgba(147,197,253,0.05)', 'rgba(147,197,253,0.01)'],
    strokeOpacity: 0.18,
    bgOpacity: 0.06,
  },
}

function GlassCard({ notice, onClose }: { notice: NoticeItem; onClose: (id: number) => void }) {
  const v = (notice.variant || 'info') as NoticeVariant
  const cfg = variantConfig[v]
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (v === 'loading') return
    const t = setTimeout(() => onClose(notice.id), 4500)
    return () => clearTimeout(t)
  }, [notice.id, v, onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -15, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="relative w-[380px] cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ transformOrigin: 'top right' }}
    >
      <svg className="absolute inset-0 w-full h-[80px]" style={{ pointerEvents: 'none' }}>
        <defs>
          <linearGradient id={cfg.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={cfg.stops[0]} />
            <stop offset="50%" stopColor={cfg.stops[1]} />
            <stop offset="100%" stopColor={cfg.stops[2]} />
          </linearGradient>
        </defs>
        <path
          d="M 0,40 C 0,0 0,0 40,0 L 340,0 C 380,0 380,0 380,40 C 380,80 380,80 340,80 L 40,80 C 0,80 0,80 0,40 Z"
          fill={`url(#${cfg.gradientId})`}
          stroke={`rgba(255,255,255,${hovered ? Math.min(cfg.strokeOpacity + 0.1, 0.4) : cfg.strokeOpacity})`}
          strokeWidth={1}
          className="transition-all duration-300"
          style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        />
      </svg>

      <div className="relative flex items-center gap-3 px-5 py-4 h-[80px]">
        <div
          className={cn(
            "w-10 h-10 rounded-[18px] flex items-center justify-center flex-shrink-0 border transition-all duration-300",
            hovered ? "border-white/25" : "border-white/15"
          )}
          style={{
            background: `rgba(255,255,255,${hovered ? cfg.bgOpacity + 0.04 : cfg.bgOpacity})`,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          {cfg.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-semibold text-white/90 leading-tight truncate">
              {notice.title}
            </span>
            <button onClick={(e) => { e.stopPropagation(); onClose(notice.id) }} className="flex-shrink-0 p-0.5 rounded-md hover:bg-white/10 transition-colors">
              <X size={14} className="text-white/40 hover:text-white/70" />
            </button>
          </div>
          {notice.description && (
            <p className="text-[13px] text-white/60 mt-0.5 leading-snug line-clamp-2">{notice.description}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/** 只显示最新一条通知 */
export function GlassNotificationStack({
  notices,
  onClose,
}: {
  notices: NoticeItem[]
  onClose: (id: number) => void
}) {
  const latest = notices.length > 0 ? [notices[notices.length - 1]] : []

  return (
    <div className="fixed top-20 right-5 z-[9999] flex flex-col items-end">
      <AnimatePresence mode="popLayout">
        {latest.map(n => (
          <GlassCard key={n.id} notice={n} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  )
}
