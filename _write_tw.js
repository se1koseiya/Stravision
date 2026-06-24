const fs = require('fs');
const path = require('path');

const content = `"use client"

import { Toaster, type Toast } from "sonner"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { X, CheckCircle2, AlertCircle, Info, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

const toastConfig: Record<ToastType, {
  icon: React.ReactNode
  gradientStops: [string, string, string]
  strokeColor: string
  avatarBg: string
  avatarBorder: string
}> = {
  success: {
    icon: <CheckCircle2 size={18} className="text-emerald-400" />,
    gradientStops: ['rgba(16,185,129,0.10)', 'rgba(16,185,129,0.05)', 'rgba(16,185,129,0.01)'],
    strokeColor: 'rgba(16,185,129,0.20)',
    avatarBg: 'rgba(16,185,129,0.08)',
    avatarBorder: 'rgba(16,185,129,0.25)',
  },
  error: {
    icon: <AlertCircle size={18} className="text-red-400" />,
    gradientStops: ['rgba(239,68,68,0.10)', 'rgba(239,68,68,0.05)', 'rgba(239,68,68,0.01)'],
    strokeColor: 'rgba(239,68,68,0.20)',
    avatarBg: 'rgba(239,68,68,0.08)',
    avatarBorder: 'rgba(239,68,68,0.25)',
  },
  warning: {
    icon: <AlertTriangle size={18} className="text-amber-400" />,
    gradientStops: ['rgba(245,158,11,0.10)', 'rgba(245,158,11,0.05)', 'rgba(245,158,11,0.01)'],
    strokeColor: 'rgba(245,158,11,0.20)',
    avatarBg: 'rgba(245,158,11,0.08)',
    avatarBorder: 'rgba(245,158,11,0.25)',
  },
  info: {
    icon: <Info size={18} className="text-blue-400" />,
    gradientStops: ['rgba(59,130,246,0.10)', 'rgba(59,130,246,0.05)', 'rgba(59,130,246,0.01)'],
    strokeColor: 'rgba(59,130,246,0.20)',
    avatarBg: 'rgba(59,130,246,0.08)',
    avatarBorder: 'rgba(59,130,246,0.25)',
  },
  loading: {
    icon: <Loader2 size={18} className="text-blue-400 animate-spin" />,
    gradientStops: ['rgba(59,130,246,0.10)', 'rgba(59,130,246,0.05)', 'rgba(59,130,246,0.01)'],
    strokeColor: 'rgba(59,130,246,0.20)',
    avatarBg: 'rgba(59,130,246,0.08)',
    avatarBorder: 'rgba(59,130,246,0.25)',
  },
}

function getToastType(t: Toast): ToastType {
  if (t.type === 'success') return 'success'
  if (t.type === 'error') return 'error'
  if (t.type === 'warning') return 'warning'
  if (t.type === 'loading') return 'loading'
  return 'info'
}

let gradientCounter = 0

function GlassToast({ t }: { t: Toast }) {
  const [hovered, setHovered] = useState(false)
  const type = getToastType(t)
  const cfg = toastConfig[type]
  const [gradId] = useState(() => 'glass-toast-grad-' + (++gradientCounter))

  return (
    <div
      className={cn(
        "relative w-[380px] cursor-pointer transition-all duration-300",
        hovered && "translate-y-[-4px] scale-[1.01]"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ transformOrigin: 'top center' }}
    >
      {/* SVG Glass Background */}
      <svg className="absolute inset-0 w-full h-[80px]" style={{ pointerEvents: 'none' }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={cfg.gradientStops[0]} />
            <stop offset="50%" stopColor={cfg.gradientStops[1]} />
            <stop offset="100%" stopColor={cfg.gradientStops[2]} />
          </linearGradient>
        </defs>
        <path
          d="M 0,40 C 0,0 0,0 40,0 L 340,0 C 380,0 380,0 380,40 C 380,80 380,80 340,80 L 40,80 C 0,80 0,80 0,40 Z"
          fill={\`url(#\${gradId})\`}
          stroke={hovered ? 'rgba(255,255,255,0.25)' : cfg.strokeColor}
          strokeWidth={1}
          className="transition-all duration-300"
        />
      </svg>

      {/* Content */}
      <div className="relative flex items-center gap-3 px-5 py-4 h-[80px]">
        {/* Avatar / Icon */}
        <div
          className="w-10 h-10 rounded-[18px] flex items-center justify-center flex-shrink-0 border transition-all duration-300"
          style={{
            background: hovered ? cfg.avatarBg.replace('0.08', '0.12') : cfg.avatarBg,
            borderColor: hovered ? 'rgba(255,255,255,0.25)' : cfg.avatarBorder,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          {cfg.icon}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-semibold text-white/90 leading-tight truncate">
              {t.title}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); t.dismiss?.() }}
              className="flex-shrink-0 p-0.5 rounded-md hover:bg-white/10 transition-colors"
            >
              <X size={14} className="text-white/40 hover:text-white/70" />
            </button>
          </div>
          {t.description && (
            <p className="text-[13px] text-white/60 mt-0.5 leading-snug line-clamp-2">
              {String(t.description)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function ToasterWrapper() {
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const currentTheme = mounted ? (theme === 'system' ? systemTheme : theme) : 'dark'
  const isDark = currentTheme === 'dark'

  if (!isDark) {
    return (
      <Toaster
        position="top-center"
        closeButton
        richColors
        toastOptions={{
          style: { borderRadius: '1.25rem', padding: '1rem 1.25rem', minWidth: '380px' },
        }}
      />
    )
  }

  return (
    <>
      <style jsx global>{\`
        [data-sonner-toaster][data-sonner-toaster] { --z-index: 9999 !important; }
        [data-sonner-toast][data-sonner-toast] {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
          backdrop-filter: none !important;
          min-width: unset !important;
          max-width: unset !important;
        }
        [data-sonner-toast] [data-content] { flex: 1 !important; }
        [data-sonner-toast] [data-close-button] { display: none !important; }
      \`}</style>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 },
          unstyled: true,
          classNames: { toast: '' },
        }}
        components={{ Toast: GlassToast as any }}
      />
    </>
  )
}
`;

const target = path.join(__dirname, 'components', 'toaster-wrapper.tsx');
fs.writeFileSync(target, content, 'utf8');
console.log('Written to', target);
