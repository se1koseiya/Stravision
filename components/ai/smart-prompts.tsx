"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { IconRefresh } from "@/components/icon";

export interface SuggestFollowupItem {
  key: string
  description: string
}

export interface SmartPromptsProps {
  /** 最近一条用户消息 */
  lastUser?: string
  /** 最近一条 AI 回复（用于推断上下文） */
  lastAssistant?: string
  /**
   * 🎯 用户**当前选择的模型**（与主对话 `/api/chat` 同一个值：`selectedModel || aiSettings.model`）。
   * 为空 / `auto` 时由服务端按与主对话一致的规则挑模型。
   */
  model?: string
  /** 与主对话 `enableReasoning` 同源；决定 `auto` 模式最终挑哪个模型 */
  enableReasoning?: boolean
  /** 用户的 AI 配置；为 null 时服务端会用系统 key */
  aiSettings: { apiKey?: string; apiUrl?: string; model?: string } | null
  /** 点击某条追问时触发 */
  onPick: (text: string) => void
  /** 暗色模式 */
  darkMode?: boolean
}

/**
 * 根据最近一次 AI 回复 + 用户上一条提问，调用 LLM 实时推断 3 条用户最可能想问的追问。
 *
 * 🎯 生成用的模型 = 用户当前选的模型（`model` prop），与主对话同源；为 `auto` 时由
 *    `lib/ai/effective-model` 的共享决策挑模型，保证和主对话**挑到同一个**。
 *
 * 🎨 形态（2026-10-01）：对齐参考稿 —— 无标题栏、无「换一批」图标按钮，
 *    每条 = 宽度自适应的圆角气泡（浅灰底 + 左侧 ↳ 引导符号），左对齐堆叠。
 *
 * 🚨 三种状态必须**在视觉上可区分**（2026-10-04 修）：
 *    · 加载中 → 同形骨架气泡（表示"正在照这轮回答生成"）
 *    · 成功   → 气泡列表
 *    · 失败   → 明确写出失败原因 + 重试入口
 *    绝不能再拿一份静态通用问题去冒充"生成结果" —— 那会让人误以为
 *    "提示集没有跟随我的模型和回答"，而实际上是请求失败了。（历史 bug）
 */
export function SmartPrompts({
  lastUser,
  lastAssistant,
  model,
  enableReasoning,
  aiSettings,
  onPick,
  darkMode = false,
}: SmartPromptsProps) {
  const isDark = darkMode
  // 🌟 与主对话用的是同一个模型选择：显式 model > aiSettings.model
  const effectiveModel = (model || aiSettings?.model || "").trim()
  // 🚨 初值必须是空数组：曾经用静态兜底文案填充，导致"请求失败"和"生成成功"长得一模一样
  const [items, setItems] = useState<SuggestFollowupItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 🎨 初始 = -1（无高亮）：参考稿里几条气泡同色，默认不该有一条先变深；
  //    鼠标悬停 / 方向键选中后才出现 active 反馈。
  const [activeIndex, setActiveIndex] = useState(-1)
  const [sign, setSign] = useState(0) // 触发重试
  const fetchedRef = useRef<string>("")

  // 拉取建议
  const fetchSuggestions = useCallback(async () => {
    if (!lastUser && !lastAssistant) {
      setItems([])
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
          // 🎯 提示集必须用「用户当前选择的模型」生成，而不是服务端写死的某个小模型
          model: effectiveModel || undefined,
          // auto 模式下要靠它和主对话挑到同一个模型（AI 助手默认开启深度思考）
          enableReasoning: enableReasoning !== false,
          lastUser,
          lastAssistant,
        }),
        signal: ctrl.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`status ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`)
      }
      const data = await res.json()
      const list: string[] = Array.isArray(data?.suggestions) ? data.suggestions : []
      if (list.length === 0) throw new Error("empty suggestions")
      setItems(list.slice(0, 3).map((s, i) => ({ key: `s-${i}`, description: s })))
      setActiveIndex(-1)
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(e?.message || "fetch failed")
        setItems([])
      }
    } finally {
      setLoading(false)
      ctrl.abort()
    }
  }, [lastUser, lastAssistant, effectiveModel, enableReasoning, aiSettings?.apiKey, aiSettings?.apiUrl])

  // 当上下文变化时重新拉取
  useEffect(() => {
    // 🎯 key 里必须带上模型：换模型 = 换生成结果，不能因为「对话内容没变」就跳过重拉
    const key = `${effectiveModel}::${lastUser || ""}::${(lastAssistant || "").slice(0, 200)}`
    if (!key.trim()) return
    if (key === fetchedRef.current && sign === 0) return
    setActiveIndex(-1)
    setItems([])
    const timer = setTimeout(() => {
      // 🚨 `fetchedRef` 必须**等真正发起请求时**才落值。
      //    曾把它写在 effect 体内 → React StrictMode 下 effect 跑两遍：
      //    第一遍落值并挂 timer → 被 cleanup 清掉 → 第二遍因 key 命中而直接 return
      //    → 请求永远发不出去（表现为列表恒为兜底/空白，看起来"没跟随上下文生成"）。
      fetchedRef.current = key
      fetchSuggestions()
    }, 300) // 轻微防抖

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUser, lastAssistant, effectiveModel, enableReasoning, aiSettings?.apiKey, aiSettings?.apiUrl, sign])

  // 键盘导航
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (items.length === 0) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => (i < 0 ? 0 : (i + 1) % items.length))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1))
      } else if (e.key === "Enter") {
        // activeIndex < 0 = 没选中任何一条 → 不抢 Enter（避免误发第一条）
        if (activeIndex < 0) return
        e.preventDefault()
        const picked = items[activeIndex]
        if (picked) onPick(picked.description)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [items, activeIndex, onPick])

  const handleClick = (idx: number, text: string) => {
    setActiveIndex(idx)
    onPick(text)
  }

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSign((s) => s + 1)
  }

  /** 把原始错误压成一行人能读的原因（优先取 HTTP 状态码） */
  const errorHint = (() => {
    if (!error) return ""
    const m = error.match(/status\s+(\d+)/) || error.match(/API Error:\s*(\d+)/)
    if (m) return `HTTP ${m[1]}`
    return error.slice(0, 48)
  })()

  const skeletonClass = cn("h-[40px] animate-pulse rounded-xl", isDark ? "bg-white/[0.05]" : "bg-zinc-100")

  return (
    <div
      className="flex w-full flex-col items-start gap-2"
      // 鼠标移出整个提示区 → 收回高亮，回到参考稿的「几条同色」静态观感
      onMouseLeave={() => setActiveIndex(-1)}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item, idx) => {
          const isActive = idx === activeIndex
          return (
            <motion.button
              key={`${item.key}-${items.length}-${sign}`}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, delay: idx * 0.03 }}
              onClick={() => handleClick(idx, item.description)}
              onMouseEnter={() => setActiveIndex(idx)}
              onFocus={() => setActiveIndex(idx)}
              className={cn(
                "group inline-flex max-w-full items-start gap-2 text-left",
                "rounded-xl px-3.5 py-[11px] text-[13px] leading-snug",
                "transition-colors duration-200 outline-none",
                "focus-visible:ring-2 focus-visible:ring-emerald-500/30",
                isActive
                  ? isDark
                    ? "bg-white/[0.08] text-zinc-100"
                    : "bg-zinc-200/70 text-zinc-900"
                  : isDark
                    ? "bg-white/[0.05] text-zinc-300 hover:bg-white/[0.08] hover:text-zinc-100"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "select-none text-[13px] leading-snug",
                  isActive
                    ? isDark ? "text-zinc-400" : "text-zinc-500"
                    : isDark ? "text-zinc-500" : "text-zinc-400"
                )}
              >
                ↳
              </span>
              <span className="line-clamp-2">{item.description}</span>
            </motion.button>
          )
        })}
      </AnimatePresence>

      {/* 加载中：三条与气泡同形的骨架（表达"正在照这轮回答生成"） */}
      {loading && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={cn(skeletonClass, "w-44")}
          />
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.12 } }} exit={{ opacity: 0 }}
            className={cn(skeletonClass, "w-56")}
          />
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.24 } }} exit={{ opacity: 0 }}
            className={cn(skeletonClass, "w-40")}
          />
        </>
      )}

      {/* 失败：明确写出原因并给重试入口（绝不用静态通用问题冒充结果） */}
      {!loading && error && (
        <button
          onClick={handleRefresh}
          title={error}
          className={cn(
            "inline-flex max-w-full items-center gap-1.5 rounded-lg px-1 py-0.5 text-[11px] leading-4 transition-colors",
            isDark ? "text-amber-400/80 hover:text-amber-300" : "text-amber-600/80 hover:text-amber-700"
          )}
        >
          <IconRefresh size={11} className="flex-shrink-0" />
          <span className="truncate">未能生成建议（{errorHint}）· 点此重试</span>
        </button>
      )}
    </div>
  )
}
