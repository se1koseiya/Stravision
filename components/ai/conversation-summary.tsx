"use client"

import { cn } from "@/lib/utils"

export interface ConversationSummaryProps {
  /**
   * 当前对话的总结 —— 就是这次对话的标题。
   * 由“用户开始对话时用其当前选择的模型总结意图”产出，与侧栏「最近对话」列表同源。
   */
  summary: string
  /** 正在用模型生成总结（首轮消息发出后的一小段时间） */
  loading?: boolean
  darkMode?: boolean
  className?: string
}

/**
 * 对话总结（顶栏）—— 取代原先的「趋势预测」入口。
 *
 * 🚫 **不要图标**（2026-10-01 用户明确要求：截图里带魔法棒图标的版本被否掉）——
 *    这里是纯文字的一行标题，靠字号/字色表达层级，不再挂任何 svg。
 *
 * 规格沿用原趋势预测按钮那一格：14px / 常规字重 / 行内 pill，
 * 保证顶栏高度（48）与左基线不因换了个入口而跳动。
 *
 * 三态：
 *  · 空态（还没开始对话）→ 「新对话」占位，弱化色
 *  · 生成中             → 「正在总结…」+ 呼吸
 *  · 就绪               → 一句话总结（超长省略号截断，hover 出全文）
 *
 * 🚨 只做展示，不自己发请求 —— 请求在页面层（首轮消息时）发起，
 *    这里收 summary prop 即可。这样顶栏标题、侧栏列表用的是**同一个值**，
 *    不会出现「顶栏说 A、侧栏说 B」的错位。
 */
export function ConversationSummary({
  summary,
  loading = false,
  darkMode = false,
  className,
}: ConversationSummaryProps) {
  const text = summary?.trim() || ""
  const placeholder = !text && !loading
  const textOnly = !text && loading
  const label = textOnly ? "正在总结…" : text || "新对话"

  return (
    <span
      data-conversation-summary
      data-summary-state={placeholder ? "empty" : textOnly ? "loading" : "ready"}
      title={text || (loading ? "正在用当前模型总结这次对话的意图" : "开始对话后，这里会自动总结你的意图")}
      className={cn(
        "inline-flex min-w-0 max-w-[320px] items-center px-2 py-1",
        "rounded-[10px] text-sm font-medium leading-none truncate",
        "transition-colors select-none",
        placeholder
          ? darkMode
            ? "text-zinc-500"
            : "text-zinc-400"
          : darkMode
            ? "text-zinc-200"
            : "text-zinc-700",
        textOnly && "animate-pulse",
        className
      )}
    >
      {label}
    </span>
  )
}
