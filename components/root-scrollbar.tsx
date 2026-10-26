"use client"

import { useEffect, useRef } from "react"

/**
 * 根滚动条（<html>）· 自绘 overlay 胶囊 —— 唯一来源（2026-10-11）
 * ---------------------------------------------------------------------------
 * 起因（用户原话）：「dashboard 页面旁边还是有一条很明显的。」
 * ---------------------------------------------------------------------------
 * 根因（真实滚轮 + 像素取证坐实，不是猜的）：
 *   经典滚动条（::-webkit-scrollbar）是**占位式**的 —— 它把根滚动容器 <html> 的
 *   内容盒右侧切掉 --sb-size(10px)。而这条槽区显示的是**画布底色**（html 无背景
 *   → 由 body 的 --background #FAFAFA 上提），于是只要页面内容里有一层「满幅氛围层」
 *   （.dash-atmos / .dc-backdrop 这类铺满视口的浅色渐变），右侧就出现一条
 *   **内容色 → #FAFAFA 的硬边**。
 *     像素取证（合成页，DPR1）：x=786..789 = 205,231,171 ｜ x=790..799 = 250,250,250
 *     用户截图同一模式（截图 DPR≈1.8，同一条边即 18px 的 250,250,250 竖条）。
 *   页面元素**画不进**这条槽（根滚动容器的内容裁在 padding box 内 ——
 *   实测内容层 width:100vw 无效；overflow-y:overlay 在 Chrome 114+ 已等价 auto），
 *   所以唯一解是**让这条槽根本不存在**。
 *
 * 做法：<html> 的原生条彻底隐藏（globals.css「Root Scrollbar」段），改由本组件画
 *   一根 fixed overlay 胶囊 —— 不占布局宽度，满幅层于是铺到真正的右缘。
 *
 * ── 结构：视觉与可点区域**分开**（这是本组件唯一的设计要点）──
 *   [data-root-scrollbar]  固定右缘 10px、pointer-events:none（空闲时对鼠标完全透明）
 *   ├─ [data-root-thumb]   视觉胶囊，按真实滚动位置定位；**永不接 pointer-events**
 *   └─ [data-root-hit]     交互条，从 HOVER_TOP 往下；悬停时才 pointer-events:auto
 *   为什么分开：胶囊在 scrollTop=0 时会落在 y=0 附近，正好压住桌面端自绘标题栏的
 *   − □ ✕。若让"胶囊本身"可点，就等于把窗口关闭键挡住；所以可点区域一律从
 *   HOVER_TOP 起算，胶囊只负责好看。
 *
 * ── 交互（对齐"原生条本来能干什么"，别只做一半）──
 *   · 正在滚动 → 浮现（复用 html[data-scrolling]，scroll-activity.tsx 打点，
 *     停手 550ms 后摘掉）；贴右边 12px 悬停也显形 —— 否则"想拖才发现抓不到"。
 *   · 在胶囊上按下 → 连续拖拽；在空白处按下 → 先跳到该位置，再继续拖（原生行为）。
 *
 * ⚠️ 颜色一律取 --sb-thumb / --sb-thumb-active（globals.css 唯一变量源），
 *    ⛔ 别在这里写死任何颜色，否则又变成"两套滚动条"。
 * ⚠️ 只改根滚动条，**内层容器一律保持原生经典滚动条**（它们的槽显示的是容器
 *    自己的背景，与紧邻内容同色，不会出现这条硬边）—— 回归面最小。
 * ⚠️ 隐藏根条后 `100vw == clientWidth`：`w-screen` 不再横向溢出、居中容器不再
 *    被 10px 顶偏、body 锁滚动开弹窗时也不再跳 10px（顺带收益）。
 */

/** 胶囊最小高度，避免长页面缩成一条看不见的线 */
const MIN_THUMB = 32
/** 命中区宽度（px）—— 与旧的原生槽同宽，不会比改造前更侵占内容 */
const TRACK_W = 10
/** 可见胶囊宽度（px）= TRACK_W - gap*2，与 globals.css 的 --sb-gap 对齐 */
const THUMB_W = 4
/** 贴边悬停热区宽度（px） */
const HOVER_ZONE = 12
/** 交互条上边界（px）—— 让开桌面端自绘标题栏的 − □ ✕，视觉胶囊不受此限 */
const HOVER_TOP = 80

export function RootScrollbar() {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const thumbRef = useRef<HTMLDivElement | null>(null)
  const hitRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const de = document.documentElement
    const track = trackRef.current
    const thumb = thumbRef.current
    const hit = hitRef.current
    if (!track || !thumb || !hit) return

    let raf = 0
    /** 最近一次量到的几何 + 画到的位置；统一在 paint 里更新，别处只读 */
    let geo = { ch: 0, max: 0, th: 0 }
    let lastTop = 0

    const paint = () => {
      raf = 0
      if (!geo.max) return
      const y = window.scrollY || de.scrollTop || 0
      const travel = Math.max(1, geo.ch - geo.th)
      lastTop = Math.max(0, Math.min(travel, (y / geo.max) * travel))
      thumb.style.height = geo.th + "px"
      thumb.style.transform = `translate3d(0, ${Math.round(lastTop)}px, 0)`
    }

    const schedule = () => { if (!raf) raf = requestAnimationFrame(paint) }

    const measure = () => {
      const ch = de.clientHeight
      const sh = de.scrollHeight
      const max = sh - ch
      // 页面没得滚 → 整根隐藏（不留空条、也不吃悬停）
      track.style.display = max > 1 ? "" : "none"
      geo = max > 1
        ? { ch, max, th: Math.max(MIN_THUMB, Math.round(ch * (ch / sh))) }
        : { ch: 0, max: 0, th: 0 }
      paint()   // 先量再画：尺寸变化后位置立刻跟上
    }

    /** 把 clientY 换算成 scrollTop（让胶囊中心对准指针） */
    const scrollToClientY = (clientY: number) => {
      if (!geo.max) return
      const travel = Math.max(1, geo.ch - geo.th)
      const top = Math.max(0, Math.min(travel, clientY - HOVER_TOP - geo.th / 2))
      window.scrollTo(0, Math.round((top / travel) * geo.max))
      schedule()
    }

    measure()

    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", measure)
    // 内容高度会被异步数据 / 图片改变（根滚动条只在"能滚"时才该出现）
    const ro = new ResizeObserver(() => measure())
    ro.observe(de)
    if (document.body) ro.observe(document.body)

    // ── 拖拽 / 点空白 ──
    let dragging = false
    let startY = 0
    let startScroll = 0
    let pointerId = -1

    const onDown = (e: PointerEvent) => {
      if (!geo.max) return
      const onThumb = e.clientY >= lastTop - 2 && e.clientY <= lastTop + geo.th + 2
      if (!onThumb) scrollToClientY(e.clientY)   // 点空白 = 跳到该位置（原生行为），随后仍可继续拖
      dragging = true
      pointerId = e.pointerId
      startY = e.clientY
      startScroll = window.scrollY || de.scrollTop || 0
      track.setAttribute("data-dragging", "1")
      try { hit.setPointerCapture(e.pointerId) } catch { /* 忽略：pointerId 已失效 */ }
      e.preventDefault()
    }

    const onMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return
      const travel = Math.max(1, geo.ch - geo.th)
      const next = startScroll + ((e.clientY - startY) / travel) * geo.max
      // Lenis 空闲时会同步原生滚动位置，这里直接写 window 即可
      window.scrollTo(0, Math.max(0, Math.min(geo.max, next)))
      schedule()
    }

    const onUp = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return
      dragging = false
      track.removeAttribute("data-dragging")
      try { hit.releasePointerCapture(e.pointerId) } catch { /* 忽略 */ }
      schedule()
    }

    // ── 贴边悬停（JS 判定：空闲时那 10px 对鼠标完全透明）──
    let hovering = false
    const onHover = (e: PointerEvent) => {
      if (dragging) return
      const near = e.clientX >= window.innerWidth - HOVER_ZONE && e.clientY >= HOVER_TOP
      if (near === hovering) return
      hovering = near
      if (near) track.setAttribute("data-hover", "1")
      else track.removeAttribute("data-hover")
    }
    const onLeave = () => {
      if (dragging || !hovering) return
      hovering = false
      track.removeAttribute("data-hover")
    }

    window.addEventListener("pointermove", onHover, { passive: true })
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    window.addEventListener("pointerleave", onLeave)
    window.addEventListener("blur", onLeave)
    hit.addEventListener("pointerdown", onDown)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", measure)
      ro.disconnect()
      window.removeEventListener("pointermove", onHover)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      window.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("blur", onLeave)
      hit.removeEventListener("pointerdown", onDown)
    }
  }, [])

  const gap = (TRACK_W - THUMB_W) / 2

  return (
    <div ref={trackRef} data-root-scrollbar aria-hidden style={{ width: TRACK_W, display: "none" }}>
      <div ref={thumbRef} data-root-thumb style={{ paddingLeft: gap, paddingRight: gap }} />
      <div ref={hitRef} data-root-hit style={{ top: HOVER_TOP }} />
    </div>
  )
}
