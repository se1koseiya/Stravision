"use client"

/**
 * 🔍 对话内搜索
 *
 * 形态对齐 WorkBuddy：平时只是顶栏一枚放大镜；点开后整条顶栏被一枚
 * 圆角胶囊接管 —— 🔍 + 输入框 + ↑ ↓（上一个/下一个命中）+ ✕（关闭）。
 *
 * 命中定位用现成的 `data-msg-anchor`（chat-bubble-list 已给每条消息打锚点），
 * 所以这里**不需要**新的滚动容器 ref：scrollIntoView 自己会找最近的可滚祖先。
 * 命中后给气泡一个 emerald 光圈淡出，让"搜到了"看得见 —— 只滚不闪等于没找到。
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { IconClose, IconDown, IconSearch, IconUp } from "@/components/icon"

export interface SearchableMessage {
  role?: string
  content?: string
}

export function ConversationSearch({
  open,
  onClose,
  messages,
  className,
}: {
  open: boolean
  onClose: () => void
  messages: SearchableMessage[]
  className?: string
}) {
  const [query, setQuery] = React.useState("")
  const [idx, setIdx] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const hits = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as number[]
    const out: number[] = []
    messages.forEach((m, i) => {
      if (String(m?.content ?? "").toLowerCase().includes(q)) out.push(i)
    })
    return out
  }, [query, messages])

  React.useEffect(() => {
    setIdx(0)
  }, [query])

  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [open])

  const jump = React.useCallback((i: number) => {
    const el = document.querySelector<HTMLElement>(`[data-msg-anchor="msg-${i}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    // emerald 光圈淡出：只滚不闪，用户分不清"跳到了"还是"本来就在这"
    try {
      el.animate?.(
        [
          { boxShadow: "0 0 0 3px rgba(5, 150, 105, 0.55)" },
          { boxShadow: "0 0 0 3px rgba(5, 150, 105, 0)" },
        ],
        { duration: 1300, easing: "ease-out" },
      )
    } catch {}
  }, [])

  const go = React.useCallback(
    (dir: 1 | -1) => {
      if (!hits.length) return
      const next = (idx + dir + hits.length) % hits.length
      setIdx(next)
      jump(hits[next])
    },
    [hits, idx, jump],
  )

  // 新的命中集出现时先跳第一处（含清空再输入）
  React.useEffect(() => {
    if (hits.length) jump(hits[0])
  }, [hits, jump])

  if (!open) return null

  return (
    <div
      data-conversation-search
      className={cn(
        "flex h-10 w-full max-w-[560px] items-center gap-2 rounded-full px-3.5",
        "bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300",
        className,
      )}
    >
      <IconSearch size={15} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault()
            go(e.shiftKey ? -1 : 1)
          } else if (e.key === "Escape") {
            e.preventDefault()
            onClose()
          }
        }}
        placeholder="搜索对话内容"
        className={cn(
          "min-w-0 flex-1 bg-transparent text-[13px] outline-none",
          "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
        )}
      />

      {query.trim() ? (
        <span className="shrink-0 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
          {hits.length ? `${idx + 1}/${hits.length}` : "无结果"}
        </span>
      ) : null}

      <button
        type="button"
        onClick={() => go(-1)}
        disabled={!hits.length}
        title="上一处（Shift+Enter）"
        className={cn(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500",
          "transition-colors hover:bg-zinc-900/[0.06] hover:text-zinc-700 disabled:opacity-35",
          "dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-zinc-200",
        )}
      >
        <IconUp size={13} />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        disabled={!hits.length}
        title="下一处（Enter）"
        className={cn(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500",
          "transition-colors hover:bg-zinc-900/[0.06] hover:text-zinc-700 disabled:opacity-35",
          "dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-zinc-200",
        )}
      >
        <IconDown size={13} />
      </button>
      <button
        type="button"
        onClick={onClose}
        title="关闭搜索（Esc）"
        className={cn(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500",
          "transition-colors hover:bg-zinc-900/[0.06] hover:text-zinc-700",
          "dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-zinc-200",
        )}
      >
        <IconClose size={13} />
      </button>
    </div>
  )
}
