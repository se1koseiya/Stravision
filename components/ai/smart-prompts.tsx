"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { IconLoading, IconRefresh } from "@/components/icon";

export interface SuggestFollowupItem {
  key: string
  description: string
}

export interface SmartPromptsProps {
  /** 最近一条用户消息 */
  lastUser?: string
  /** 最近一条 AI 回复（用于推断上下文） */
  lastAssistant?: string
  /** 用户的 AI 配置；为 null 时服务端会用系统 key */
  aiSettings: { apiKey?: string; apiUrl?: string; model?: string } | null
  /** 静态兜底：API 失败 / 还在加载时使用 */
  fallback: SuggestFollowupItem[]
  /** 点击某条追问时触发 */
  onPick: (text: string) => void
  /** 暗色模式 */
  darkMode?: boolean
}

/**
 * 根据最近一次 AI 回复 + 用户上一条提问，调用 LLM 实时推断 3 条用户最可能想问的追问。
 * - 默认高亮第一条，键盘方向键可切换
 * - 失败或加载中时使用 fallback 兜底
 */
export function SmartPrompts({
  lastUser,
  lastAssistant,
  aiSettings,
  fallback,
  onPick,
  darkMode = false,
}: SmartPromptsProps) {
  const isDark = darkMode
  const [items, setItems] = useState<SuggestFollowupItem[]>(fallback)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [sign, setSign] = useState(0) // 触发刷新
  const fetchedRef = useRef<string>("")
  const interactedRef = useRef(false)

  // 拉取建议
  const fetchSuggestions = useCallback(async () => {
    if (!lastUser && !lastAssistant) {
      setItems(fallback)
      return
    }
    setLoading(true)
    setError(null)
    const ctrl = new AbortController()
    try {
      const res = await fetch("/api/ai/suggest-followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: aiSettings?.apiKey,
          apiUrl: aiSettings?.apiUrl,
          model: aiSettings?.model,
          lastUser,
          lastAssistant,
        }),
        signal: ctrl.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`status ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}`)
      }
      const data = await res.json()
      const list: string[] = Array.isArray(data?.suggestions) ? data.suggestions : []
      if (list.length === 0) throw new Error("empty suggestions")
      if (!interactedRef.current) {
        setItems(list.slice(0, 3).map((s, i) => ({ key: `s-${i}`, description: s })))
        setActiveIndex(0)
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(e?.message || "fetch failed")
        setItems((prev) => (prev.length > 0 ? prev : fallback))
      }
    } finally {
      setLoading(false)
      ctrl.abort()
    }
  }, [lastUser, lastAssistant, aiSettings?.apiKey, aiSettings?.apiUrl, aiSettings?.model, fallback])

  // 当上下文变化时重新拉取
  useEffect(() => {
    const key = `${lastUser || ""}::${(lastAssistant || "").slice(0, 200)}`
    if (!key.trim()) return
    if (key === fetchedRef.current && sign === 0) return
    fetchedRef.current = key
    interactedRef.current = false
    setActiveIndex(0)
    setItems(fallback) // 先用兜底显示，体验更顺滑
    const timer = setTimeout(() => {
      fetchSuggestions()
    }, 300) // 轻微防抖

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUser, lastAssistant, aiSettings?.apiKey, aiSettings?.apiUrl, aiSettings?.model, sign])

  // 键盘导航
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (items.length === 0) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % items.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + items.length) % items.length)
      } else if (e.key === "Enter") {
        e.preventDefault()
        const picked = items[activeIndex]
        if (picked) {
          interactedRef.current = true
          onPick(picked.description)
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [items, activeIndex, onPick])

  const handleClick = (idx: number, text: string) => {
    interactedRef.current = true
    setActiveIndex(idx)
    onPick(text)
  }

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation()
    interactedRef.current = false
    setSign((s) => s + 1)
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <div
          className={cn(
            "flex items-center gap-1.5 text-[12px]",
            isDark ? "text-zinc-500" : "text-zinc-400"
          )}
        >
          {loading && <IconLoading size={11} className="animate-spin" />}
          <span>
            {loading
              ? "正在推断你可能想问的…"
              : error
                ? "未能推断（点击重试）"
                : "你可能还想问"}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          className={cn(
            "p-1 rounded transition-colors",
            isDark ? "text-zinc-500 hover:text-zinc-300 hover:bg-white/5" : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
          )}
          title="换一批"
          aria-label="换一批"
        >
          <IconRefresh size={11} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="flex flex-col gap-0.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((item, idx) => {
            const isActive = idx === activeIndex
            return (
              <motion.button
                key={`${item.key}-${items.length}-${sign}`}
                layout
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 3 }}
                transition={{ duration: 0.18, delay: idx * 0.02 }}
                onClick={() => handleClick(idx, item.description)}
                onMouseEnter={() => setActiveIndex(idx)}
                onFocus={() => setActiveIndex(idx)}
                className={cn(
                  "group w-full text-left px-2.5 py-1.5 rounded-md text-[13px] leading-snug",
                  "transition-colors duration-150 outline-none",
                  "flex items-center gap-2",
                  isActive
                    ? isDark
                      ? "bg-white/5 text-zinc-100"
                      : "bg-zinc-100/80 text-zinc-900"
                    : isDark
                      ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                      : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                )}
              >
                <span
                  className={cn(
                    "inline-block w-1 h-1 rounded-full flex-shrink-0 transition-colors",
                    isActive
                      ? isDark ? "bg-zinc-200" : "bg-zinc-700"
                      : isDark ? "bg-zinc-600" : "bg-zinc-300"
                  )}
                />
                <span className="line-clamp-2 flex-1">{item.description}</span>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

