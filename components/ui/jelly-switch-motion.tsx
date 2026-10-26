"use client"

import { useEffect } from "react"

/**
 * 果冻开关（Jelly Toggle）的**触发层** —— 全站唯一，渲染 null。
 *
 * 为什么不写在样式里（`:active` / `.ant-switch-checked`）：
 *   · `:active` 只在按住期间成立，松手就断，做不出「滑到终点再回弹」的完整 440ms；
 *   · `.ant-switch-checked` 一进页面就匹配，首屏所有开关会齐刷刷抖一遍（尤其是
 *     设备控制页那种一屏 8 颗的列表，非常明显）。
 * 所以改成「按下那一刻打 `data-jelly="on|off"`，动画结束摘掉」：
 *   动画由 app/globals.css 的 jelly-thumb-squash 提供，这里只管**何时开始**与**朝哪边**。
 *
 * 方向判定必须在 pointerdown（状态尚未翻转）时读当前值再取反 —— 此刻读到的还是旧态。
 *
 * 覆盖对象：
 *   · antd `<Switch>`   → `.ant-switch`（判 `.ant-switch-checked`）
 *   · radix `<Switch>`  → `[data-slot="switch"]`（判 `data-state` / `aria-checked`）
 */

/** 与 CSS 的 --jelly-dur 同步；留 60ms 余量给 animationend 迟到的情况 */
const JELLY_MS = 440
const CLEANUP_MS = JELLY_MS + 60

const SWITCH_SELECTOR = '.ant-switch, [data-slot="switch"]'

function isSwitch(el: Element | null): el is HTMLElement {
  return !!el && el.matches(SWITCH_SELECTOR)
}

function isDisabled(el: Element): boolean {
  if (el.classList.contains("ant-switch-disabled")) return true
  if (el.getAttribute("data-disabled") !== null) return true
  const aria = el.getAttribute("aria-disabled")
  return aria === "true"
}

/** 当前是否处于「开」—— 两套框架各自的真值来源 */
function isOn(el: Element): boolean {
  if (el.classList.contains("ant-switch-checked")) return true
  if (el.getAttribute("data-state") === "checked") return true
  return el.getAttribute("aria-checked") === "true"
}

export function JellySwitchMotion() {
  useEffect(() => {
    const timers = new WeakMap<Element, number>()

    const play = (el: Element) => {
      if (isDisabled(el)) return
      // 0. 先摘旧标记并强制回流：连点时同名 animation 不会自动重播
      el.removeAttribute("data-jelly")
      void (el as HTMLElement).offsetWidth
      el.setAttribute("data-jelly", isOn(el) ? "off" : "on")

      const prev = timers.get(el)
      if (prev) window.clearTimeout(prev)
      timers.set(
        el,
        window.setTimeout(() => {
          el.removeAttribute("data-jelly")
          timers.delete(el)
        }, CLEANUP_MS),
      )
    }

    // 指针按下即开始 —— 早于 click 的状态翻转，方向判定才准
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      const el = target?.closest?.(SWITCH_SELECTOR) ?? null
      if (el) play(el)
    }

    // 键盘可达：Space / Enter 在开关上是原生切换，补一条同款动效
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return
      if (isSwitch(document.activeElement)) play(document.activeElement)
    }

    // 动画自然结束就走清理，不必等 timeout（异常中断仍由 timeout 兜底）
    const onAnimationEnd = (e: AnimationEvent) => {
      if (e.animationName !== "jelly-thumb-squash") return
      const host = (e.target as Element | null)?.closest?.(SWITCH_SELECTOR) ?? null
      if (host) host.removeAttribute("data-jelly")
    }

    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("keydown", onKeyDown, true)
    document.addEventListener("animationend", onAnimationEnd, true)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("keydown", onKeyDown, true)
      document.removeEventListener("animationend", onAnimationEnd, true)
    }
  }, [])

  return null
}
