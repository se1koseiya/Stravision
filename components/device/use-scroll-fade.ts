"use client"

import { useEffect, type RefObject } from "react"

/**
 * 滚动边缘渐隐 —— HDS `scrollEffectOpts.scrollEffectType = ScrollEffectType.GRADIENT_BLUR` 的 Web 等价
 *
 * 规范里的场景是：悬浮材质（标题栏 / 页签）压在滚动内容上，内容滚到材质边缘时被渐变模糊掉，
 * 而不是硬切一条直线。Web 端没有「材质边缘」，等价物就是给滚动容器打一层 mask：
 * 只有**真的还有内容藏在后面**的那一侧才渐隐，滚到顶/底时渐隐自动消失。
 *
 * 落点：把 data-scroll-edge="start|end|both|none" 写到容器上，CSS 按这个属性切换 mask。
 * 用 ref 直接写 DOM 属性（不进 React state）—— 滚动是高频事件，重渲染会把滚动搞卡。
 */
export type ScrollEdge = "none" | "start" | "end" | "both"

function syncEdge(el: HTMLElement) {
  const EPS = 2
  const hidesStart = el.scrollTop > EPS
  const hidesEnd = el.scrollTop + el.clientHeight < el.scrollHeight - EPS
  const edge: ScrollEdge = hidesStart && hidesEnd ? "both" : hidesStart ? "start" : hidesEnd ? "end" : "none"
  if (el.dataset.scrollEdge !== edge) el.dataset.scrollEdge = edge
}

export function useScrollEdge<T extends HTMLElement>(ref: RefObject<T | null>, dep?: unknown) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    syncEdge(el)
    const onScroll = () => syncEdge(el)
    el.addEventListener("scroll", onScroll, { passive: true })
    // 内容/尺寸变化（换设备、切视图、字体缩放）后要重新判断是否还有隐藏内容
    const ro = new ResizeObserver(() => syncEdge(el))
    ro.observe(el)
    for (const child of Array.from(el.children)) ro.observe(child)
    const mo = new MutationObserver(() => syncEdge(el))
    mo.observe(el, { childList: true, subtree: true, characterData: true })
    return () => {
      el.removeEventListener("scroll", onScroll)
      ro.disconnect()
      mo.disconnect()
    }
  }, [ref, dep])
}
