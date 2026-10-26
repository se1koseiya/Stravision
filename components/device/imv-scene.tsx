"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/**
 * 沉浸光感「场景轴」的声明入口（2026-10-22）
 *
 * ── 一句话判据 ──
 *   沉浸光感 = backdrop-filter 把**背后的光**吸上来。所以只有当屏幕背后真的有一片景，
 *   这套材质才成立；否则它就是一块「比画布略亮的板」，既不好看、又白付每帧重采样。
 *
 * ── 三类「有景」的场景 ──
 *   ① 氛围光    路由白名单里的页面（目前只有 /device-control）铺了斜向色带 + 径向柔光；
 *   ② 桌面壁纸  桌面端窗口透传（Windows 11 acrylic / macOS vibrancy，见 desktop/main.js）；
 *   ③ 真实内容  弹层/侧栏压在内容上 —— 这类不走本轴，由 ULTRA 档与 .dc-glass 自己兜住。
 *
 * ── 为什么是「白名单」而不是「黑名单」──
 *   用户 2026-10-22 的原话是「全站除了设备控制页面不要再用这种渐变背景了」。
 *   默认关闭 = 以后新增页面不会又悄悄长出一层彩色渐变（黑名单必然漏）。
 *   要让某页重新拥有氛围光，只需在下面 SCENES 里加一条正则 —— 一处改动，全站生效。
 *
 * ── 为什么写在 <html> 上 ──
 *   antd / Radix 的浮层 portal 到 body，只认 html 上的继承（与 data-mat-level 同理）。
 *   CSS 消费方：components/device/material-css.ts 的「场景轴」一节。
 */
const SCENES: readonly RegExp[] = [
  /* 设备控制：唯一允许铺氛围光的页面 ——
     它是本项目的「控制台」：卡片密、层级深、需要一眼分出浮起与压住，
     玻璃在这里不是装饰，而是层级语言；氛围光则是玻璃「有东西可透」的前提。 */
  /^\/device-control(?:[/?]|$)/,
]

/**
 * 声明当前这一屏有没有「景」。
 * 桌面端窗口一旦真的透传桌面壁纸（main.js 会按平台能力置 glassShell），
 * 全站就都有景了 —— 此时不应再按白名单收缩，否则会出现「窗口是玻璃、里面全是实色板」。
 */
export function useImvScene() {
  const pathname = usePathname()
  useEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    const bridge = typeof window !== "undefined" ? window.stravisionDesktop : undefined
    const glassShell = bridge?.glassShell === true

    /* 窗口玻璃壳：桌面端真的能透传桌面壁纸时才写 —— 它同时做两件事：
       ① 让 app/globals.css 的「窗口玻璃壳」一节接管画布 token（body 透明 + 画布半透明），
       ② 反过来把场景轴固定成 on（背后是壁纸 = 有景，全站玻璃材质成立）。 */
    if (glassShell) root.dataset.glassShell = "on"
    else delete root.dataset.glassShell

    const on = glassShell || SCENES.some((re) => re.test(pathname || ""))
    if (on) root.dataset.imvScene = "on"
    else delete root.dataset.imvScene
  }, [pathname])
}

/** 无 UI 的挂载点：放进根布局即可，随路由自动切换场景标记。 */
export function ImvSceneBridge() {
  useImvScene()
  return null
}

export default ImvSceneBridge
