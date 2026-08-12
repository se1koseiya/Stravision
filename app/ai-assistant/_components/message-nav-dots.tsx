"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { Tooltip } from "antd"

export interface MessageNavItem {
  /** 唯一标识（通常是消息索引或 message.id） */
  id: string
  /** 悬停时显示的预览（截取纯文本） */
  preview: string
}

export interface MessageNavDotsProps {
  /** 消息导航项列表（通常每个 AI 消息一项） */
  items: MessageNavItem[]
  /** 当前可见的消息 id（IntersectionObserver 回调更新） */
  activeId: string | null
  /** 滚动容器 ref（用于 scrollIntoView 定位） */
  scrollContainerRef: React.RefObject<HTMLElement | null>
  /** 主题 */
  darkMode?: boolean
  /** 自定义类名（用于外层定位） */
  className?: string
  /** 自定义样式 */
  style?: React.CSSProperties
}

/**
 * AI 消息左侧导航点：
 * - 每个 AI 消息对应一个圆点
 * - 当前可见的消息点变为蓝色实心
 * - 悬停显示消息预览
 * - 点击平滑滚动到对应消息
 *
 * 该组件作为 flex item 渲染，由父容器（ChatBubbleList）通过 align-self/align-items
 * 将其固定在垂直方向中央，不随消息列表滚动。
 */
export function MessageNavDots({
  items,
  activeId,
  scrollContainerRef,
  darkMode,
  className,
  style,
}: MessageNavDotsProps) {
  const handleJump = useCallback(
    (id: string) => {
      const container = scrollContainerRef.current
      if (!container) return
      const target = container.querySelector<HTMLElement>(`[data-msg-anchor="${id}"]`)
      if (!target) return
      // 平滑滚动到该消息
      const containerRect = container.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const offset = targetRect.top - containerRect.top + container.scrollTop - 24
      container.scrollTo({ top: offset, behavior: "smooth" })
    },
    [scrollContainerRef]
  )

  if (items.length === 0) return null

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "8px 4px",
        ...style,
      }}
    >
      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <Tooltip
            key={item.id}
            title={item.preview || " "}
            placement="right"
            mouseEnterDelay={0.15}
            color={darkMode ? "#1f1f23" : "#1f1f23"}
            overlayStyle={{ maxWidth: 280 }}
            overlayInnerStyle={{ fontSize: 12, lineHeight: 1.5, padding: "6px 10px" }}
          >
            <button
              type="button"
              aria-label={item.preview || "跳转到该消息"}
              onClick={(e) => {
                e.stopPropagation()
                handleJump(item.id)
              }}
              style={{
                width: isActive ? 14 : 6,
                height: 6,
                borderRadius: 999,
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: isActive
                  ? "#1677ff"
                  : darkMode
                  ? "rgba(161, 161, 170, 0.5)"
                  : "rgba(161, 161, 170, 0.55)",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: isActive ? "0 0 0 3px rgba(22, 119, 255, 0.15)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = darkMode ? "#a1a1aa" : "#71717a"
                  e.currentTarget.style.width = "10px"
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = darkMode
                    ? "rgba(161, 161, 170, 0.5)"
                    : "rgba(161, 161, 170, 0.55)"
                  e.currentTarget.style.width = "6px"
                }
              }}
            />
          </Tooltip>
        )
      })}
    </div>
  )
}

/**
 * 跟踪当前可见消息的 hook
 * - 使用 IntersectionObserver 监听 data-msg-anchor 元素
 * - 返回当前在视口最顶部附近的消息 id
 */
export function useMessageAnchors(
  scrollContainerRef: React.RefObject<HTMLElement | null>,
  ids: string[]
): string | null {
  const [activeId, setActiveId] = useState<string | null>(null)
  const visibilityMap = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    if (typeof IntersectionObserver === "undefined") return

    // 找到所有锚点
    const anchors: HTMLElement[] = []
    ids.forEach((id) => {
      const el = container.querySelector<HTMLElement>(`[data-msg-anchor="${id}"]`)
      if (el) anchors.push(el)
    })
    if (anchors.length === 0) return

    // 重置可见度
    visibilityMap.current.clear()
    setActiveId(ids[ids.length - 1] ?? null)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-msg-anchor")
          if (!id) return
          if (entry.isIntersecting) {
            visibilityMap.current.set(id, entry.intersectionRatio)
          } else {
            visibilityMap.current.delete(id)
          }
        })

        // 选择最靠近视口顶部、且可见度最高的
        let bestId: string | null = null
        let bestRatio = -1
        for (const [id, ratio] of visibilityMap.current.entries()) {
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestId = id
          }
        }

        // 如果都没有可见的，找离视口顶部最近的那个
        if (!bestId) {
          const containerRect = container.getBoundingClientRect()
          let nearestId: string | null = null
          let nearestDist = Infinity
          ids.forEach((id) => {
            const el = container.querySelector<HTMLElement>(`[data-msg-anchor="${id}"]`)
            if (!el) return
            const rect = el.getBoundingClientRect()
            const dist = Math.abs(rect.top - containerRect.top)
            if (dist < nearestDist) {
              nearestDist = dist
              nearestId = id
            }
          })
          bestId = nearestId
        }

        if (bestId) setActiveId(bestId)
      },
      {
        root: container,
        // 把视口上下各留 40% 的 margin，让靠近视口顶部的更容易被识别为 active
        rootMargin: "-20% 0px -50% 0px",
        threshold: [0, 0.1, 0.3, 0.6, 1],
      }
    )

    anchors.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
      visibilityMap.current.clear()
    }
  }, [scrollContainerRef, ids.join("|")])

  return activeId
}

/** 从消息内容中提取纯文本预览 */
export function extractPreview(content: unknown, max = 40): string {
  if (typeof content === "string") {
    // 去掉 markdown、html 标签、换行
    return content
      .replace(/<[^>]+>/g, " ")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[#*_`~>\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max)
  }
  if (Array.isArray(content)) {
    const textPart = content
      .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
      .join(" ")
    return extractPreview(textPart, max)
  }
  return ""
}
