"use client"

/**
 * 预览三态：加载 / 失败 / 空
 *
 * 三个态共用同一套"居中 + 一行说明"的形态，因为它们在同一个位置交替出现 ——
 * 形态不一致会让浮层在解析完成时"跳一下"。
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { IconClose } from "@/components/icon"

function centerShell(className?: string) {
  return cn(
    "flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 py-10 text-center",
    className,
  )
}

/** 解析中：转圈 + 一句"在做什么"（解析 20MB 的 xlsx 可能要几秒，得说清楚） */
export function PreviewLoading({ label }: { label: string }) {
  return (
    <div data-preview-state="loading" className={centerShell()}>
      <span
        aria-hidden
        className={cn(
          "h-5 w-5 animate-spin rounded-full border-2 border-zinc-200",
          "border-t-emerald-600 dark:border-white/15 dark:border-t-emerald-400",
        )}
      />
      <p className="text-[12px] text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  )
}

/** 失败：说清"哪一步失败 + 下一步能做什么"，不给裸错误码 */
export function PreviewError({ message }: { message: string }) {
  return (
    <div data-preview-state="error" className={centerShell()}>
      <IconClose size={16} className="text-zinc-400 dark:text-zinc-500" />
      <p className="max-w-[420px] text-[12px] leading-5 text-zinc-500 dark:text-zinc-400">
        {message}
      </p>
    </div>
  )
}

/** 空：文件能打开但没内容（不是错误，只是没什么可看） */
export function PreviewEmpty({ message }: { message: string }) {
  return (
    <div data-preview-state="empty" className={centerShell()}>
      <p className="max-w-[420px] text-[12px] leading-5 text-zinc-500 dark:text-zinc-400">
        {message}
      </p>
    </div>
  )
}
