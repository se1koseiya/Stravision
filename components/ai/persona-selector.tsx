"use client"

import { useState, useEffect, useRef, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { IconCheck, IconDegreeHat, IconDown, IconSeedling, IconSetting } from "@/components/icon";

interface PersonaMeta {
  id: string
  name: string
  tagline: string
  icon: string
  color: string
}

interface PersonaSelectorProps {
  /** 当前选中的 persona id */
  value: string
  /** 切换回调 */
  onChange: (personaId: string) => void
  /** 紧凑模式（用于移动端） */
  compact?: boolean
  className?: string
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  expert: IconSeedling,
  friendly: IconDegreeHat,
  engineer: IconSetting,
}

function PersonaIcon({ id, size = 14, className }: { id: string; size?: number; className?: string }) {
  const Cmp = ICON_MAP[id] ?? IconSeedling
  return <Cmp size={size} className={className} />
}

/**
 * AI 角色切换器
 *
 * 三种角色：草莓种植专家 / 新手友好向导 / 智慧农业工程师
 * 切换后会影响 AI 的回答风格、专业深度和决策偏好
 */
export function PersonaSelector({ value, onChange, compact = false, className }: PersonaSelectorProps) {
  const [personas, setPersonas] = useState<PersonaMeta[]>([
    { id: 'expert', name: '种植专家', tagline: '农艺师视角 · 数据驱动 · 深度专业', icon: '🌿', color: '#52c41a' },
    { id: 'friendly', name: '新手向导', tagline: '通俗易懂 · 循序渐进 · 手把手教', icon: '🌱', color: '#1677ff' },
    { id: 'engineer', name: '农业工程师', tagline: '系统视角 · 设备联动 · 自动化优先', icon: '⚙️', color: '#722ed1' },
  ])
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // 下拉面板位置（fixed 定位时使用）
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  // 从后端加载 personas（确保与后端定义一致）
  useEffect(() => {
    fetch('/api/ai/personas')
      .then(r => r.json())
      .then(data => {
        if (data.personas?.length > 0) setPersonas(data.personas)
      })
      .catch(() => { /* 使用内置默认值 */ })
  }, [])

  // 计算下拉位置（用 fixed + 触发器 boundingClientRect，逃出父容器 overflow:hidden）
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPos(null)
      return
    }
    const update = () => {
      const rect = triggerRef.current!.getBoundingClientRect()
      const panelWidth = 260
      // 优先向右展开，超出右边则向左对齐
      let left = rect.left
      if (left + panelWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - panelWidth - 8)
      }
      setPos({
        top: rect.bottom + 6,
        left,
        width: panelWidth,
      })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  // 点击外部 / Esc 关闭
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = personas.find(p => p.id === value) || personas[0]

  if (compact) {
    // 紧凑模式：触发按钮 + portal 弹层
    return (
      <div ref={triggerRef} className={cn("relative inline-flex", className)}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] transition-colors",
            "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
            open && "border-[#1677ff]/40 bg-[#1677ff]/[0.04] text-[#1677ff]"
          )}
          title={current?.tagline}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <PersonaIcon id={current?.id || ''} size={13} className="text-[#1677ff]" />
          <span className="whitespace-nowrap">{current?.name}</span>
          <IconDown
            size={12}
            className={cn(
              "text-zinc-400 transition-transform duration-200",
              open && "rotate-180 text-[#1677ff]"
            )}
          />
        </button>

        {open && pos && typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={panelRef}
              role="listbox"
              style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                width: pos.width,
                zIndex: 1000,
              }}
              className="rounded-xl border border-zinc-200 bg-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)] p-1 origin-top"
            >
              {personas.map(p => {
                const isCurrent = p.id === value
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    onClick={() => { onChange(p.id); setOpen(false) }}
                    className={cn(
                      "w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
                      isCurrent
                        ? "bg-[#1677ff]/[0.08]"
                        : "hover:bg-zinc-50"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center",
                      isCurrent ? "bg-[#1677ff] text-white" : "bg-zinc-100 text-zinc-500"
                    )}>
                      <PersonaIcon id={p.id} size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "text-[13px] leading-none",
                          isCurrent ? "text-[#1677ff] font-medium" : "text-zinc-800"
                        )}>
                          {p.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] text-[#1677ff] leading-none">
                            · 当前
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11.5px] text-zinc-500 leading-snug">
                        {p.tagline}
                      </p>
                    </div>
                    {isCurrent && (
                      <IconCheck size={14} className="text-[#1677ff] flex-shrink-0 mt-1" />
                    )}
                  </button>
                )
              })}
            </div>,
            document.body
          )
        }
      </div>
    )
  }

  // 完整模式（用于设置面板）—— 保留原卡片式
  return (
    <div ref={triggerRef} className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium">AI 助手角色</span>
        <span className="text-xs text-muted-foreground">切换不同专家视角</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {personas.map(p => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 transition-all",
              p.id === value
                ? "border-[#1677ff] bg-[#1677ff]/[0.04]"
                : "border-border hover:border-[#1677ff]/40 hover:bg-accent/50"
            )}
          >
            <PersonaIcon
              id={p.id}
              size={20}
              className={p.id === value ? "text-[#1677ff]" : "text-zinc-500"}
            />
            <span className="text-xs font-medium text-center">{p.name}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground px-1">{current?.tagline}</p>
    </div>
  )
}
