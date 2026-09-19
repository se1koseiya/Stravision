"use client"

import React, { useMemo, useState } from "react"
import { IconBackgroundColor, IconCaution, IconDownload, IconFullScreen } from "@/components/icon";

/**
 * SvgCard — 渲染 AI 输出的 <ILLU>…</ILLU> 内的 SVG 插画
 *
 * 背景：Mermaid 只能画流程/结构图，对种植户来说太"工程视角"，
 * 且画不了病虫害症状、场景示意这类画面型内容。
 * 让模型亲手绘制扁平科普插画风 SVG（提示词见 SVG_ILLU_INSTRUCTION_COMPACT），
 * 前端 sanitize 后直接渲染为图片卡片。
 *
 * 安全：模型生成的 SVG 属不可信内容，必须先 sanitize ——
 * 移除 <script>/<foreignObject>/on* 事件属性/javascript: 与外部链接，
 * 再 dangerouslySetInnerHTML（innerHTML 语义下 on* 内联事件仍会被触发，不能省）。
 */

interface SvgCardProps {
  /** ILLU 标签内的原始 SVG 文本（应含 <svg…>…</svg>） */
  code: string
  /** 流式未闭合：只显示骨架，不尝试渲染 */
  streaming?: boolean
  /** 深色模式（插画自带白底配色，仅影响卡片边框/工具栏配色） */
  darkMode?: boolean
  className?: string
}

/** 清洗不可信 SVG：去脚本/事件/外链，防 XSS 与外部资源加载 */
function sanitizeSvg(svg: string): string {
  return svg
    // 整段移除危险元素
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script[^>]*\/>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, "")
    .replace(/<foreignObject[^>]*\/>/gi, "")
    .replace(/<(animate|animateTransform|animateMotion|set)[\s\S]*?>/gi, "")
    // 事件属性（onload=/onclick=…，单双引号与无引号三种形态）
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    // 危险与外部引用（href / xlink:href）
    .replace(/\s(xlink:)?href\s*=\s*"(javascript:[^"]*)"/gi, "")
    .replace(/\s(xlink:)?href\s*=\s*'javascript:[^']*'/gi, "")
    .replace(/\s(xlink:)?href\s*=\s*"(?:https?:|\/\/)[^"]*"/gi, "")
    .replace(/\s(xlink:)?href\s*=\s*'(?:https?:|\/\/)[^']*'/gi, "")
    // style 里的 url(...) 外部加载
    .replace(/style\s*=\s*"[^"]*url\([^)]*\)[^"]*"/gi, "")
}

/** 校验 SVG 基本结构：有 <svg 开头，且（流式或）有闭合 */
function isRenderableSvg(code: string, streaming: boolean): boolean {
  return /<svg[\s>]/i.test(code) && (streaming || /<\/svg\s*>/i.test(code))
}

export function SvgCard({ code, streaming, darkMode, className }: SvgCardProps) {
  const [zoomed, setZoomed] = useState(false)

  const sanitized = useMemo(() => sanitizeSvg(code), [code])
  const renderable = isRenderableSvg(sanitized, false)

  const handleDownload = () => {
    const blob = new Blob([sanitized], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "illustration.svg"
    a.click()
    URL.revokeObjectURL(url)
  }

  // 流式未闭合：骨架占位，等闭合后一次性渲染
  if (streaming) {
    return (
      <div
        className={`my-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 ${className || ""}`}
      >
        <div className="flex items-center gap-2 text-[12px] text-zinc-400 dark:text-zinc-500 mb-2">
          <IconBackgroundColor size={13} strokeWidth={1.75} className="animate-pulse" />
          <span>正在绘制插画…</span>
        </div>
        <div className="h-40 rounded-md bg-zinc-50 dark:bg-zinc-800/50 animate-pulse" />
      </div>
    )
  }

  // 流结束但内容不是合法 SVG：降级显示源码，保留排查证据
  if (!renderable) {
    return (
      <div className="my-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-3">
        <div className="flex items-center gap-1.5 text-[12px] text-amber-600 dark:text-amber-400 mb-1.5">
          <IconCaution size={13} strokeWidth={1.75} />
          <span>插画内容有误（未找到有效 SVG），已显示原始代码</span>
        </div>
        <pre className="text-[12.5px] leading-relaxed text-zinc-600 dark:text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-60">{code}</pre>
      </div>
    )
  }

  return (
    <div
      className={`my-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden ${className || ""}`}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">插画</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            title="放大查看"
          >
            <IconFullScreen size={13} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            title="下载 SVG"
          >
            <IconDownload size={13} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      {/* 插画自带白底配色，深色模式下也保持白底展示，避免深底黑字不可读 */}
      <div
        className="p-3 bg-white overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
        data-dark-mode={darkMode ? "1" : undefined}
      >
        <div dangerouslySetInnerHTML={{ __html: sanitized }} />
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <div
            className="bg-white rounded-xl p-4 max-w-[95vw] max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div dangerouslySetInnerHTML={{ __html: sanitized }} />
          </div>
        </div>
      )}
    </div>
  )
}
