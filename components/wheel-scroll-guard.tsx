"use client"

import { useEffect } from "react"

/**
 * 滚轮归属仲裁（全站唯一，2026-10-11）
 * ---------------------------------------------------------------------------
 * 症状：**很多地方鼠标滚轮滚不动**（内层滚动容器 scrollTop 恒 0）。
 *
 * 根因（@studio-freight/lenis@1.0.42 源码实读，不是猜的）：
 *   · Lenis 把 wheel 监听挂在 `window` 冒泡阶段：`window.addEventListener("wheel", ..., { passive: false })`
 *   · 收事件后它先 `composedPath()` 向上找有没有 `data-lenis-prevent`，
 *     **找不到就无条件 `preventDefault()`**，然后把滚动接管成自己的平滑滚动（滚的是整页）。
 *   · 也就是说：任何内层容器只要没手动标 `data-lenis-prevent`，
 *     它的滚轮就永远被 Lenis 吃掉 —— 这就是「滚轮滚不了」的全部原因。
 *   （实测 /device-control 的设备栅格、/docs/api 的左侧目录都没标 → scrollTop 恒 0。）
 *
 * 修法（不是一个个补属性 —— 那是治标，新增容器还会再犯）：
 *   在 **window 捕获阶段** 抢在 Lenis 前面判定一次：如果指针底下最近的可滚祖先
 *   在这一方向上真的还能滚，就 `stopPropagation()` 把这一下滚轮让给原生滚动。
 *   Lenis 收不到事件 → 不 preventDefault → 浏览器自己滚那个容器（含自然的滚动链）。
 *   容器滚到头时不拦截 → 事件继续交给 Lenis → 整页照旧平滑滚动，边界不卡死。
 *
 * 为什么是捕获阶段 stopPropagation 而不是别的：
 *   · 不能用 preventDefault —— 我们要的正是「原生滚动照常发生」。
 *   · 不能只在某个容器上补属性 —— 覆盖不到动态弹层/未来新增的容器。
 *   · 捕获阶段挂 window：比 Lenis 的冒泡监听更早，且无视 Lenis 把监听挂到哪一层。
 *   · 全仓没有任何其它 wheel 监听（已 grep 核实 onWheel / addEventListener("wheel") 均无），
 *     所以掐断传播不会误伤别的事件订阅者。
 *
 * ⚠️ 两处刻意放行（不拦截）：
 *   1. `input` / antd 数值框 / 滑块：它们自带「滚轮改值」语义，抢过来会让功能失效。
 *   2. `ctrlKey`（触控板缩放）与已被别人 preventDefault 的事件。
 */

/** overflow 里只有这三档是「用户能用滚轮滚」的 */
const SCROLLABLE_OVERFLOW = /(auto|scroll|overlay)/

/** 该元素在这一方向上是否真的还能滚（滚到头 = 不能再滚，交回 Lenis 滚整页） */
function canScrollIn(el: Element, dx: number, dy: number): boolean {
  const node = el as HTMLElement
  const canY = node.scrollHeight - node.clientHeight > 1
  const canX = node.scrollWidth - node.clientWidth > 1
  if (!canY && !canX) return false

  const cs = getComputedStyle(node)
  if (dy !== 0 && canY && SCROLLABLE_OVERFLOW.test(cs.overflowY)) {
    const room = dy > 0 ? node.scrollHeight - node.clientHeight - node.scrollTop : node.scrollTop
    if (room > 1) return true
  }
  if (dx !== 0 && canX && SCROLLABLE_OVERFLOW.test(cs.overflowX)) {
    const room = dx > 0 ? node.scrollWidth - node.clientWidth - node.scrollLeft : node.scrollLeft
    if (room > 1) return true
  }
  return false
}

export function WheelScrollGuard() {
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return
      const dx = e.deltaX
      const dy = e.deltaY
      if (!dx && !dy) return

      const target = e.target instanceof Element ? e.target : null
      if (!target) return
      // 自带滚轮语义的控件先放行（antd 数值框滚轮改值、Slider 等）
      if (target.closest("input, .ant-input-number, .ant-slider, [data-wheel-native]")) return

      let el: Element | null = target
      const root = document.documentElement
      while (el && el !== root) {
        if (canScrollIn(el, dx, dy)) {
          e.stopPropagation() // 让这一下滚轮走原生：Lenis 收不到，就不会 preventDefault
          return
        }
        el = el.parentElement
      }
    }

    // capture：必须早于 Lenis 的 window 冒泡监听；passive：我们从不 preventDefault
    window.addEventListener("wheel", onWheel, { capture: true, passive: true })
    return () => window.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions)
  }, [])

  return null
}
