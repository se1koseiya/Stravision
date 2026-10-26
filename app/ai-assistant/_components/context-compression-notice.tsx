"use client"

/**
 * 「已自动整理对话上下文」提示卡（2026-10-11）
 *
 * 起因（用户原话）：「压缩过程怎么没给用户看。用户不明不白地」
 *
 * 此前的问题：
 *   - 服务端压缩是**静默**的（历史消息被摘要替换，没有任何说明）；
 *   - 前端其实**早就有** `<CONTEXT_COMPRESSED>` 渲染分支，但服务端从未下发过该标签
 *     → 一直是死代码，用户从头到尾看不到任何压缩反馈；
 *   - 唯一的线索是指示器气泡里一行 11px 小字，用户不会点开也不会注意。
 *
 * 现在：服务端在压缩时插入一条带**真实计量**的提示消息（见 history-compressor.ts
 * 的 buildCompressionNoticeMessage），这里渲染成一张可展开的卡片，回答三件事：
 *   ① 为什么折叠 —— 用量到了触发线（输入预算 × 用户自定义比例）
 *   ② 折叠了什么 —— 多少条并入摘要、多少条保留原文
 *   ③ 能不能调 —— 指向 设置 → 助理设置 → 上下文与压缩
 *
 * 双层兼容：拿不到计量（旧数据 / 自闭合标签）时退化为一句说明文案。
 */

import React, { useState } from "react"
import { IconCompression, IconDown, IconUp } from "@/components/icon"
import { parseCompressionStats } from "@/lib/ai/context"
import { formatTokens } from "./context-usage-meter"

/** 打开「设置 → 助理设置 → 上下文与压缩」的全局事件（由 ai-assistant 页面监听） */
export const OPEN_CONTEXT_PREFS_EVENT = "berry:open-context-prefs"

function openContextPrefs() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(OPEN_CONTEXT_PREFS_EVENT))
}

export function ContextCompressionNotice({ content }: { content: string }) {
  const stats = parseCompressionStats(content)
  const [open, setOpen] = useState(false)

  return (
    <div
      className="my-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12.5px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400"
      data-context-compression-notice={stats ? "detailed" : "plain"}
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-emerald-600 dark:text-emerald-400">
          <IconCompression size={13} />
        </span>
        <span className="flex-1 font-medium text-zinc-600 dark:text-zinc-300">
          已自动整理对话上下文
        </span>
        {stats && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="-mr-1 flex h-6 items-center gap-1 rounded-md px-1.5 text-[11.5px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700/60 dark:hover:text-zinc-200"
            aria-expanded={open}
          >
            {open ? "收起" : "详情"}
            {open ? <IconUp size={10} /> : <IconDown size={10} />}
          </button>
        )}
      </div>

      {stats ? (
        <>
          <div className="mt-1 leading-relaxed">
            较早的 <b className="text-zinc-700 dark:text-zinc-200">{stats.foldedMessages}</b> 条对话已折叠为摘要，
            最近 <b className="text-zinc-700 dark:text-zinc-200">{stats.keptMessages}</b> 条保留原文
          </div>

          {open && (
            <div className="mt-2 space-y-1.5 border-t border-zinc-200 pt-2 dark:border-zinc-700">
              <Row
                label="触发原因"
                value={`用量 ${formatTokens(stats.beforeTokens)} 达到输入预算的 ${Math.round(stats.triggerRatio * 100)}%（触发线 ${formatTokens(stats.triggerTokens)}）`}
              />
              <Row
                label="占用变化"
                value={`${formatTokens(stats.beforeTokens)} → ${formatTokens(stats.afterTokens)}`}
              />
              <Row
                label="当前容量"
                value={`窗口 ${formatTokens(stats.windowTokens)} · 输入预算 ${formatTokens(stats.inputBudgetTokens)}`}
              />
              <div className="pt-1 text-[11.5px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                折叠的内容已提炼为结构化摘要（见下方「历史记忆摘要」卡片，可展开查看）。
                <button
                  type="button"
                  onClick={openContextPrefs}
                  className="ml-1 text-emerald-600 underline decoration-dotted underline-offset-2 transition-colors hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  调整容量与触发点
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mt-1 leading-relaxed">较早的对话历史已自动提炼并压缩</div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-[52px] shrink-0 text-zinc-400 dark:text-zinc-500">{label}</span>
      <span className="flex-1 text-zinc-600 dark:text-zinc-300">{value}</span>
    </div>
  )
}

export default ContextCompressionNotice
