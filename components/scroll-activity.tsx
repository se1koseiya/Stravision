"use client"

import { useEffect } from "react"

/**
 * 全站滚动条「正在滚动」标记（唯一来源，2026-10-11）
 * ---------------------------------------------------------------------------
 * 配套 app/globals.css 的 Unified Scrollbar 段：滚动条默认完全不可见，
 * **只有容器正在滚动时**才浮现（本组件打的 data-scrolling），停手后自动摘掉。
 *
 * 为什么不纯 CSS 做：
 *   `:hover` 只能表达「鼠标在上面」，表达不了「正在滚」。而滚动事件不冒泡
 *   （元素上的 scroll 只在自身触发），所以必须在 document 的**捕获阶段**统一收口。
 *
 * 为什么标记打在实际滚动的那个元素上，而不是 documentElement 一刀切：
 *   打过标记的元素的**自己的**滚动条才会亮（CSS 是 [data-scrolling]::-webkit-scrollbar-thumb）。
 *   挂在 html 上会让全站每一根滚动条同时亮起来。
 *
 * ⚠️ 根滚动（Lenis 的 ReactLenis root 走 window.scrollTo）事件 target 是 document，
 *    真正的滚动容器是 <html>，所以 target 不是元素时一律落到 documentElement ——
 *    根滚动条靠的就是这一条。
 */

/** 停止滚动后滑块再停留多久（ms）。太长显得「甩不掉」，太短会一闪一闪 */
const HOLD_MS = 550

export function ScrollActivity() {
  useEffect(() => {
    let active: Element | null = null
    let timer: ReturnType<typeof setTimeout> | undefined

    const release = () => {
      if (active) active.removeAttribute("data-scrolling")
      active = null
      timer = undefined
    }

    const onScroll = (e: Event) => {
      // document（根滚动）不是 Element，落到 documentElement
      const el = e.target instanceof Element ? e.target : document.documentElement
      if (!el) return

      // 同一时刻只允许一根亮着：换目标时先把上一个摘掉
      if (active !== el) {
        if (active) active.removeAttribute("data-scrolling")
        active = el
        el.setAttribute("data-scrolling", "1")
      }

      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(release, HOLD_MS)
    }

    // capture：scroll 不冒泡，只有捕获阶段能收齐所有内层容器
    // passive：不阻塞 Lenis / 原生滚动
    document.addEventListener("scroll", onScroll, { capture: true, passive: true })
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true })
      if (timer !== undefined) clearTimeout(timer)
      if (active) active.removeAttribute("data-scrolling")
    }
  }, [])

  return null
}
