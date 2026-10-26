"use client"

import React, { useEffect, useRef, useState } from "react"
import { IconCaution, IconDownload, IconEdit, IconFullScreen } from "@/components/icon";

/**
 * MermaidCard — 渲染 AI 输出的 ```mermaid 代码块
 *
 * 背景：AI 习惯用 mermaid 画流程图/判断图，而此前渲染链路
 * （TAG_REGEX 只认 ```json；XMarkdown 对 mermaid 处理不稳定）会导致图静默消失。
 * 这里绕开 XMarkdown，直接用 mermaid.js 渲染，并附放大与下载。
 *
 * 手绘风格：mermaid v11 内置 look: "handDrawn"（底层 rough.js 抖动线条），
 * 默认手绘风让图示更亲和易读；用户可在卡片上切换回标准工程风，偏好存 localStorage。
 */

interface MermaidCardProps {
  code: string
  /** 深色模式（SVG 主题切换） */
  darkMode?: boolean
  className?: string
}

type MermaidLook = "handDrawn" | "classic"

const LOOK_STORAGE_KEY = "mermaid-look-preference"

/** 手写感字体栈：Windows(Segoe Print) / macOS(Bradley Hand/Marker Felt) / 兜底 cursive */
const HANDWRITTEN_FONT =
  '"Segoe Print", "Bradley Hand", "Marker Felt", "Comic Sans MS", "Comic Neue", cursive'

let mermaidCounter = 0
/** 记录上次 initialize 的 (theme, look) 组合；变化时才重新 initialize（全局配置，可安全重复调用） */
let lastInitKey = ""

function readStoredLook(): MermaidLook {
  if (typeof window === "undefined") return "handDrawn"
  try {
    return window.localStorage.getItem(LOOK_STORAGE_KEY) === "classic" ? "classic" : "handDrawn"
  } catch {
    return "handDrawn"
  }
}

async function renderMermaid(code: string, dark: boolean, look: MermaidLook): Promise<string> {
  const mermaid = (await import("mermaid")).default
  const initKey = `${dark ? "dark" : "default"}:${look}`
  if (lastInitKey !== initKey) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: dark ? "dark" : "default",
      look,
      handDrawnSeed: 42, // 固定抖动种子：同图多次渲染线条一致，避免闪烁
      flowchart: { htmlLabels: true, curve: "basis" },
      themeVariables: look === "handDrawn" ? { fontFamily: HANDWRITTEN_FONT } : undefined,
    })
    lastInitKey = initKey
  }
  const id = `mermaid-card-${++mermaidCounter}-${Date.now()}`
  const { svg } = await mermaid.render(id, code)
  return svg
}

export function MermaidCard({ code, darkMode, className }: MermaidCardProps) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [zoomed, setZoomed] = useState(false)
  const [look, setLook] = useState<MermaidLook>("handDrawn")
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 挂载后从 localStorage 校正用户偏好（默认手绘）
  useEffect(() => {
    setLook(readStoredLook())
    setMounted(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    setSvg(null)
    setError(null)
    renderMermaid(code, !!darkMode, look)
      .then((s) => {
        if (!cancelled) setSvg(s)
      })
      .catch((e: any) => {
        if (!cancelled) setError(String(e?.message || e))
      })
    return () => {
      cancelled = true
    }
  }, [code, darkMode, look])

  const toggleLook = () => {
    const next: MermaidLook = look === "handDrawn" ? "classic" : "handDrawn"
    setLook(next)
    try {
      window.localStorage.setItem(LOOK_STORAGE_KEY, next)
    } catch {
      /* 隐私模式等存储失败时静默忽略 */
    }
  }

  const handleDownload = () => {
    if (!svg) return
    const blob = new Blob([svg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "diagram.svg"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <div className="my-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-3">
        <div className="flex items-center gap-1.5 text-[12px] text-amber-600 dark:text-amber-400 mb-1.5">
          <IconCaution size={13} strokeWidth={2} />
          <span>示意图语法有误，已显示原始代码</span>
        </div>
        <pre className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300 overflow-x-auto whitespace-pre-wrap">{code}</pre>
      </div>
    )
  }

  return (
    <div
      className={`my-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden ${className || ""}`}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
          示意图{mounted && look === "handDrawn" ? " · 手绘风" : ""}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleLook}
            className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
              look === "handDrawn"
                ? "text-zinc-600 dark:text-zinc-300"
                : "text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400"
            }`}
            title={look === "handDrawn" ? "当前：手绘风，点击切换为标准风格" : "当前：标准风格，点击切换为手绘风"}
            aria-label="切换示意图风格"
          >
            <IconEdit size={13} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            title="放大查看"
          >
            <IconFullScreen size={13} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!svg}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors disabled:opacity-40"
            title="下载 SVG"
          >
            <IconDownload size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="p-3 overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
        style={{ minHeight: svg ? undefined : 80 }}
      >
        {svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="h-20 flex items-center justify-center text-[12px] text-zinc-400">正在渲染示意图…</div>
        )}
      </div>

      {zoomed && svg && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-xl p-4 max-w-[95vw] max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
        </div>
      )}
    </div>
  )
}
