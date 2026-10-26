"use client"

/**
 * 📎 文档卡（对话流里的文件行）
 *
 * 一个组件覆盖两种语义：
 *   · 用户上传（origin=uploaded）：告诉用户"这份文件 AI 已经收下了"，
 *     没有下载链接 —— 文件本来就在用户手里，再给个下载按钮只是噪音；
 *   · AI 产物（origin=generated/edited）：必须能拿走，所以右侧给一枚裸下载图标，
 *     `download` 走服务端鉴权路由（见 app/api/documents/[id]/download）。
 *
 * 形态刻意**不做厚卡片**：和摄像头快照卡同一套语言（裸元素 + 一行元信息 + 裸图标），
 * 因为它经常和正文并排出现，加边框底纹只会让对话流变成一堆方框。
 * 这里唯一的框是「文件行」自身的淡边 —— 文件条目本来就是一个可点对象。
 *
 * ## 预览（2026-10-21）
 *
 * 之前只有下载链接：用户得下载、用 Office 打开才知道 AI 做了什么。
 * 现在卡片右侧多一枚「预览」裸图标，点开是就地浮层（PDF 走浏览器原生渲染，
 * 我们生成的 PPTX 走结构化幻灯片视图，其余走服务端 Digest 结构视图）。
 * 下载链接保留在主区域 —— 两件事不互相挤占。
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import type { DocumentRef } from "@/app/ai-assistant/types"
import {
  IconDownload,
} from "@/components/icon"
import { formatIcon } from "./format-icon"
import { DocumentPreviewModal, PreviewIconButton } from "./document-preview"
import { hasPreviewHost, openDocumentPreview } from "./preview-bus"

/**
 * 皮肤（不是两种组件，只是同一张卡的两种落点）：
 *   · `card`    —— 直接贴在对话底色上的 AI 产出（有自己的淡边，否则"浮"在空中）；
 *   · `onFilled`—— 落在用户气泡**里面**（filled 变体自带灰底），
 *                  这时再加边框就是"卡里套卡"，改成半透明内嵌块。
 */
export type DocumentCardVariant = "card" | "onFilled"

/** 来源 → 一行说明（用户最想知道的其实只有两种：我传的 / AI 给的） */
function originLabel(doc: DocumentRef): string {
  if (doc.origin === "edited") return "已修改"
  if (doc.origin === "generated") return "已生成"
  return "已上传"
}

export function DocumentCard({
  doc,
  className,
  variant = "card",
  onPreview,
}: {
  doc: DocumentRef
  className?: string
  variant?: DocumentCardVariant
  onPreview?: (doc: DocumentRef) => void
}) {
  const Icon = formatIcon(doc.format)
  const downloadable = Boolean(doc.downloadUrl)
  const previewable = Boolean(onPreview)

  const body = (
    <>
      <Icon
        size={18}
        className={cn(
          "shrink-0",
          variant === "onFilled" ? "text-zinc-500 dark:text-zinc-300" : "text-zinc-500 dark:text-zinc-400",
        )}
      />
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-[13px] font-medium leading-5 text-zinc-800 dark:text-zinc-100"
          title={doc.fileName}
        >
          {doc.fileName}
        </span>
        <span className="block truncate text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
          {(doc.format || "").toUpperCase()}
          {doc.sizeText ? ` · ${doc.sizeText}` : ""}
          {` · ${originLabel(doc)}`}
        </span>
      </span>
    </>
  )

  const shell = cn(
    "flex w-full max-w-[360px] items-center gap-2.5 rounded-xl px-2.5 py-2 text-left",
    variant === "onFilled"
      // 气泡内部：只留一层极淡的内嵌底，不加边框不叠圆角阴影
      ? "bg-zinc-900/[0.055] dark:bg-white/[0.09]"
      : "border border-zinc-900/[0.07] bg-zinc-50/60 dark:border-white/10 dark:bg-white/[0.04]",
    "transition-colors",
    className,
  )

  const iconBtn = cn(
    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
    "text-zinc-400 transition-colors",
    variant === "onFilled"
      ? "hover:bg-zinc-900/[0.08] dark:text-zinc-400 dark:hover:bg-white/[0.10]"
      : "hover:bg-zinc-900/[0.05] dark:text-zinc-500 dark:hover:bg-white/[0.06]",
  )

  return (
    <div className={shell} data-document-card-root={doc.fileId}>
      {/* 主区域：产物可下载时整块是链接（点哪儿都能拿走）；
          上传件没有链接，整块改为「打开预览」的按钮。 */}
      {downloadable ? (
        <a
          href={doc.downloadUrl}
          download={doc.fileName}
          data-document-card="download"
          className="flex min-w-0 flex-1 items-center gap-2.5"
          title={`下载 ${doc.fileName}`}
        >
          {body}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => (previewable ? onPreview?.(doc) : undefined)}
          data-document-card="open-preview"
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          title={`预览 ${doc.fileName}`}
        >
          {body}
        </button>
      )}

      {/* 操作区：预览在前、下载在后。两枚都是裸图标，hover 才起淡底。 */}
      <div className="flex shrink-0 items-center gap-0.5">
        {previewable ? (
          <PreviewIconButton onClick={() => onPreview?.(doc)} title={`预览 ${doc.fileName}`} />
        ) : null}
        {downloadable ? (
          <a
            href={doc.downloadUrl}
            download={doc.fileName}
            data-document-card="download-icon"
            className={cn(iconBtn, "hover:text-zinc-600 dark:hover:text-zinc-300")}
            title={`下载 ${doc.fileName}`}
          >
            <IconDownload size={14} />
          </a>
        ) : null}
      </div>
    </div>
  )
}

/**
 * 一组文件（消息级）
 *
 * 预览浮层由**列表自己**持有，而不是每个卡片各起一个：
 * 同一条消息里点开任意一份都是同一个浮层，也避免多份文件同时弹出。
 * 预览走**页面级总线**：AI 助手页挂了停靠面板（三段式第三列），点卡片 → 展开右列；
 * 没有面板的宿主（Copilot 侧栏所在页）退回本列表自带的 Sheet 浮层。
 * 判定在点击瞬间问 `hasPreviewHost()`，于是两种宿主零配置、也不用层层传 prop。
 */
export function DocumentCardList({
  documents,
  className,
  variant = "card",
}: {
  documents?: DocumentRef[]
  className?: string
  variant?: DocumentCardVariant
}) {
  const [fallbackDoc, setFallbackDoc] = React.useState<DocumentRef | null>(null)

  const requestPreview = React.useCallback((doc: DocumentRef) => {
    if (hasPreviewHost()) openDocumentPreview(doc)
    else setFallbackDoc(doc)
  }, [])

  if (!documents?.length) return null
  return (
    <div data-document-list className={cn("flex flex-col gap-1.5", className)}>
      {documents.map(doc => (
        <DocumentCard key={doc.fileId} doc={doc} variant={variant} onPreview={requestPreview} />
      ))}

      {/* 兜底浮层：只有「页面没有停靠面板」时才会被打开 */}
      <DocumentPreviewModal
        doc={fallbackDoc}
        open={Boolean(fallbackDoc)}
        onClose={() => setFallbackDoc(null)}
      />
    </div>
  )
}
