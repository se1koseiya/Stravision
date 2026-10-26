/**
 * 小组件「消散成粒子」—— HarmonyOS 删除动作的 Web 复刻
 *
 * 华为那套删除动效有三段节奏，这里一一对应：
 *   ① 收：被删的表面先轻轻内收 + 失焦（约 300ms）—— 不是「啪」地凭空消失
 *   ② 解：表面碎成细颗粒，从原地向外迸开
 *   ③ 散：颗粒带上浮与自旋淡出（约 1s），同时网格回流、其余卡片上移补位
 *
 * ── 为什么用裸 DOM + WAAPI，而不是 React 组件 ──
 *   ① 粒子位置必须与「卡片被删除那一刻的真实矩形」严格对齐，而那一刻它正要被 unmount；
 *   ② 30~40 个粒子若走 setState，每帧都要重渲染整棵 dashboard 树 —— 而这段时间
 *      react-grid-layout 正在做回流，主线程不该再被动画抢占；
 *   ③ 粒子是**一次性的、不可交互的、不参与无障碍**的装饰，没有进入 React 树的价值。
 *   WAAPI 跑在合成线程上，动画期间主线程（网格回流）不受影响。
 *
 * ── 颜色为什么要分亮/暗两套 ──
 *   亮色画布接近纯白：白色粒子在上面**完全看不见**（观感等于没做）。所以亮态粒子走品牌绿系
 *   （在浅底上才可见），暗态走白/薄荷系（在深底上才可见）。这是硬约束，不是审美偏好。
 */

export type DissolveRect = {
  left: number
  top: number
  width: number
  height: number
}

/** 卡片「收」的时长：这段时间内不动布局 —— 先看到卡收掉，再让网格回流，节奏才清楚 */
export const DISSOLVE_HOLD_MS = 300

const LAYER_ID = "__berry_widget_dissolve"
let layerEl: HTMLDivElement | null = null

function ensureLayer(): HTMLDivElement {
  if (layerEl && layerEl.isConnected) return layerEl
  const el = document.createElement("div")
  el.id = LAYER_ID
  el.setAttribute("aria-hidden", "true")
  // fixed + viewport 坐标：getBoundingClientRect 给的就是视口坐标，两者直接对齐
  el.style.cssText =
    "position:fixed;inset:0;z-index:9999;pointer-events:none;overflow:hidden;"
  document.body.appendChild(el)
  layerEl = el
  return el
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  } catch {
    return false
  }
}

/** 低配设备（HDS smooth 档）与「关闭沉浸光感」档都把这套粒子关掉：
    几十个合成层正是那两档要避免的开销，而且关闭档的定义就是"不再有任何光"。 */
function materialSmooth(): boolean {
  const lv = document.documentElement.dataset.matLevel
  return lv === "smooth" || lv === "off"
}

function palette(isDark: boolean) {
  return isDark
    ? {
        core: "rgba(255,255,255,.95)",
        mid: "rgba(150,246,202,.88)",
        brand: "rgba(52,199,123,.92)",
        dust: "rgba(255,255,255,.34)",
        flash: "rgba(52,199,123,.34)",
        ring: "rgba(120,240,180,.55)",
      }
    : {
        // 亮底上不能用白（不可见）→ 走品牌绿系；只有极少数亮点用中性深灰做对比
        core: "rgba(0,148,86,.90)",
        mid: "rgba(16,185,129,.80)",
        brand: "rgba(0,120,70,.75)",
        dust: "rgba(0,148,86,.28)",
        flash: "rgba(0,148,86,.22)",
        ring: "rgba(0,148,86,.45)",
      }
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/**
 * 在给定矩形上播一次粒子消散。
 * @param rect    卡片被删除瞬间的视口矩形（getBoundingClientRect）
 */
export function playWidgetDissolve(rect: DissolveRect): void {
  if (typeof document === "undefined" || typeof Element.prototype.animate !== "function") return
  if (prefersReducedMotion() || materialSmooth()) return

  const isDark = document.documentElement.classList.contains("dark")
  const P = palette(isDark)
  const layer = ensureLayer()

  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const w = Math.max(40, rect.width)
  const h = Math.max(40, rect.height)
  const reach = Math.max(w, h)

  /* ── ① 核心闪光：材质被「解离」时先亮一下（不是白幕，只覆盖卡片范围）── */
  const flash = document.createElement("div")
  flash.style.cssText = `position:absolute;left:${rect.left}px;top:${rect.top}px;width:${w}px;height:${h}px;border-radius:18px;background:radial-gradient(circle at 50% 46%, ${P.flash} 0%, rgba(0,0,0,0) 72%);opacity:0`
  layer.appendChild(flash)
  flash
    .animate(
      [
        { opacity: 0, transform: "scale(.86)" },
        { opacity: 0.9, transform: "scale(1.04)", offset: 0.28 },
        { opacity: 0, transform: "scale(1.2)" },
      ],
      { duration: 560, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" }
    )
    .finished.then(() => flash.remove())
    .catch(() => flash.remove())

  /* ── ② 扩散环：一圈细环向外推开，说明"这个位置的东西没了"── */
  const ring = document.createElement("div")
  const rw = w * 0.7
  const rh = h * 0.7
  ring.style.cssText = `position:absolute;left:${cx - rw / 2}px;top:${cy - rh / 2}px;width:${rw}px;height:${rh}px;border-radius:24px;border:1.5px solid ${P.ring};opacity:0`
  layer.appendChild(ring)
  ring
    .animate(
      [
        { opacity: 0.75, transform: "scale(.72)" },
        { opacity: 0, transform: "scale(1.34)" },
      ],
      { duration: 620, easing: "cubic-bezier(.16,.84,.32,1)", fill: "forwards" }
    )
    .finished.then(() => ring.remove())
    .catch(() => ring.remove())

  /* ── ③ 粒子：数量按面积给，避免大卡稀、小卡糊 ── */
  const count = Math.round(Math.min(46, Math.max(18, (w * h) / 2600)))

  for (let i = 0; i < count; i++) {
    const p = document.createElement("i")
    // 出生点铺满卡面（偏向中上部：华为那套删除是从表面整体解离，不是从中心点喷）
    const sx = rect.left + rand(0.06, 0.94) * w
    const sy = rect.top + rand(0.04, 0.92) * h

    // 方向：水平向外 + 明显向上漂（"飘散"而不是"炸开"的关键就在这 0.35 的抬升）
    const angle = rand(0, Math.PI * 2)
    const dist = reach * rand(0.22, 0.62) + rand(6, 26)
    const dx = Math.cos(angle) * dist
    const dy = Math.sin(angle) * dist - h * rand(0.22, 0.5)

    const big = Math.random() < 0.18
    const size = big ? rand(4.5, 7) : rand(1.8, 3.6)
    const round = Math.random() < 0.72
    const color = big ? P.core : Math.random() < 0.5 ? P.mid : P.brand
    const dur = rand(620, 1120)
    const delay = rand(0, 130)
    const spin = rand(-190, 190)

    p.style.cssText = `position:absolute;left:${sx}px;top:${sy}px;width:${size}px;height:${size}px;border-radius:${round ? "50%" : "2px"};background:${color};opacity:0;will-change:transform,opacity`
    layer.appendChild(p)

    p.animate(
      [
        { opacity: 0, transform: "translate(-50%,-50%) scale(.5)" },
        { opacity: 0.95, transform: "translate(-50%,-50%) scale(1.05)", offset: 0.14 },
        {
          opacity: 0.72,
          transform: `translate(calc(-50% + ${dx * 0.58}px), calc(-50% + ${dy * 0.5}px)) scale(.86) rotate(${spin * 0.5}deg)`,
          offset: 0.5,
        },
        {
          opacity: 0,
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.18) rotate(${spin}deg)`,
        },
      ],
      // 前段快、后段慢：迸开有爆发力，飘散有拖延感（同一曲线撑住两种观感）
      { duration: dur, delay, easing: "cubic-bezier(.16,.84,.32,1)", fill: "forwards" }
    )
      .finished.then(() => p.remove())
      .catch(() => p.remove())
  }

  /* ── ④ 细尘：更小更淡、漂得更远更久，负责"弥散"的尾巴 ── */
  const dustCount = Math.round(count * 0.55)
  for (let i = 0; i < dustCount; i++) {
    const d = document.createElement("i")
    const sx = rect.left + rand(0, 1) * w
    const sy = rect.top + rand(0, 1) * h
    const size = rand(0.8, 1.9)
    const dx = rand(-0.5, 0.5) * reach
    const dy = -rand(0.25, 0.75) * h - rand(4, 22)
    d.style.cssText = `position:absolute;left:${sx}px;top:${sy}px;width:${size}px;height:${size}px;border-radius:50%;background:${P.dust};opacity:0;will-change:transform,opacity`
    layer.appendChild(d)
    d.animate(
      [
        { opacity: 0, transform: "translate(-50%,-50%)" },
        { opacity: 0.7, offset: 0.2 },
        { opacity: 0, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))` },
      ],
      { duration: rand(900, 1500), delay: rand(0, 200), easing: "cubic-bezier(.3,.6,.4,1)", fill: "forwards" }
    )
      .finished.then(() => d.remove())
      .catch(() => d.remove())
  }
}

/**
 * 按 widgetId 播放「收 + 散 + 回流」的完整删除动作。
 *
 * 时序刻意分两段：**先收再删**。
 *   0ms      卡片开始内收 + 失焦，粒子同时迸出
 *   300ms    才把它从 layout 移除 → 网格回流，其余卡片上移补位
 * 若一上来就移除，卡片会"瞬间消失 + 布局跳一下"，两端都看不出材质被解离的过程。
 *
 * @param widgetId  GridLayout 子项上的 data-widget-id
 * @param onRemoved 真正的移除回调（在收完之后调用）
 */
export function dissolveWidget(widgetId: string, onRemoved: () => void): void {
  if (typeof document === "undefined") {
    onRemoved()
    return
  }
  const wrapper = document.querySelector<HTMLElement>(`[data-widget-id="${widgetId}"]`)
  if (!wrapper) {
    onRemoved()
    return
  }

  const r = wrapper.getBoundingClientRect()
  const card = wrapper.querySelector<HTMLElement>(".ios-widget")
  const reduced = prefersReducedMotion() || materialSmooth()

  playWidgetDissolve(r)

  if (card && !reduced) {
    // 编辑态的抖动动画也在动 transform，先摘掉（两条动画抢同一属性，谁生效取决于样式表顺序）
    card.classList.remove("animate-jiggle")
    card.classList.add("wds-card-out")
  }

  window.setTimeout(onRemoved, reduced ? 0 : DISSOLVE_HOLD_MS)
}
