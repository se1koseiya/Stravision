"use client"

/**
 * 宣传片通用元件与时间函数。
 *
 * 核心约束：**一切运动都是 t 的函数**，不依赖 wall clock / rAF / framer-motion 动画。
 * 逐帧截图时喂同一个 t 必须得到同一张像素图，否则成片会闪烁。
 */

export const FONT = '"HarmonyOS Sans SC","PingFang SC","Microsoft YaHei",Inter,system-ui,sans-serif'
export const DISPLAY_FONT = '"Alimama ShuHeiTi","HarmonyOS Sans SC","PingFang SC",sans-serif'

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3)
export const easeIn = (x: number) => Math.pow(clamp(x), 3)
export const easeInOut = (x: number) => {
  const k = clamp(x)
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
}
export const easeOutBack = (x: number) => {
  const k = clamp(x)
  const c1 = 1.70158, c3 = c1 + 1
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2)
}
/** 0→1→0 脉冲 */
export const pulse = (x: number) => Math.sin(clamp(x) * Math.PI)

/** 确定性伪随机：同一个 n 永远得到同一个 [0,1) */
export function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** 阶段区间 */
export type Seg = { start: number; end: number }
export function seg(t: number, s: Seg, fadeIn = 400, fadeOut = 400) {
  const p = clamp((t - s.start) / (s.end - s.start))
  const op = Math.min(clamp((t - s.start) / fadeIn), clamp((s.end - t) / fadeOut))
  return { p, op, local: t - s.start, on: t >= s.start - 60 && t < s.end + 60 }
}

/** 区间内进度 0..1（区间外钳制） */
export const at = (t: number, s: number, e: number) => clamp((t - s) / (e - s))

// ---------------------------------------------------------------------------

/** 底部字幕条 —— 深色玻璃胶囊，与 promo 既有视觉语言一致 */
export function Caption({ text, sub, op, y = 0, tone = "#FAFAFA" }: {
  text: string; sub?: string; op: number; y?: number; tone?: string
}) {
  if (op <= 0.001) return null
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 66 - y, display: "flex", justifyContent: "center", opacity: op, zIndex: 400 }}>
      <div style={{
        padding: "18px 36px", borderRadius: 22,
        background: "rgba(9,9,11,.80)", border: "1px solid rgba(63,63,70,.9)",
        boxShadow: "0 24px 70px rgba(0,0,0,.7)",
        textAlign: "center", maxWidth: 1500,
      }}>
        <div style={{ fontSize: 38, fontWeight: 700, color: tone, letterSpacing: 0.5, lineHeight: 1.25 }}>{text}</div>
        {sub && <div style={{ fontSize: 22, fontWeight: 400, color: "#A1A1AA", marginTop: 9, lineHeight: 1.4 }}>{sub}</div>}
      </div>
    </div>
  )
}

/** 左上角小标签（场景编号 / 关键词） */
export function Tag({ text, op, x = 80, y = 72 }: { text: string; op: number; x?: number; y?: number }) {
  if (op <= 0.001) return null
  return (
    <div style={{
      position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 12,
      opacity: op, zIndex: 400,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: 99, background: "#34D399", boxShadow: "0 0 14px #34D399" }} />
      <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "0.22em", color: "#71717A", textTransform: "uppercase" }}>{text}</span>
    </div>
  )
}

/** 滚动数字（t 驱动，无动画库） */
export function Counter({ from, to, k, decimals = 1, suffix = "", style }: {
  from: number; to: number; k: number; decimals?: number; suffix?: string; style?: React.CSSProperties
}) {
  const v = lerp(from, to, easeOut(k))
  return <span style={style}>{v.toFixed(decimals)}{suffix}</span>
}

/** 线性渐变描边光 —— 场景边缘的「光在动」语言 */
export function EdgeLight({ tone = "cyan", op, p }: { tone?: "cyan" | "green" | "violet"; op: number; p: number }) {
  const colors = {
    cyan: ["#0891B2", "#67E8F9", "#4F46E5"],
    green: ["#059669", "#6EE7B7", "#34D399"],
    violet: ["#6366F1", "#C084FC", "#EC4899"],
  }[tone]
  const g = `linear-gradient(90deg, transparent 0%, ${colors[0]} 22%, ${colors[1]} 50%, ${colors[2]} 78%, transparent 100%)`
  const shift = lerp(-30, 130, clamp(p))
  if (op <= 0.001) return null
  return (
    <div style={{ position: "absolute", inset: 0, opacity: op, pointerEvents: "none", zIndex: 350 }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: g, backgroundSize: "200% 100%", backgroundPosition: `${shift}% 0`, filter: "blur(0.4px)", opacity: .95 }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: g, backgroundSize: "200% 100%", backgroundPosition: `${100 - shift}% 0`, opacity: .95 }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 3, background: `linear-gradient(180deg, transparent, ${colors[1]}, transparent)`, opacity: .8 }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 3, background: `linear-gradient(180deg, transparent, ${colors[1]}, transparent)`, opacity: .8 }} />
      <div style={{ position: "absolute", inset: -60, background: `radial-gradient(ellipse at 50% 50%, transparent 55%, ${colors[0]}22 78%, transparent 92%)`, opacity: .8 }} />
    </div>
  )
}

/** 背景网格 —— 科技感底纹，静态（确定性） */
export function GridBg({ opacity = 0.16, size = 60, color = "#3F3F46" }: { opacity?: number; size?: number; color?: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0, opacity, zIndex: 0, pointerEvents: "none",
      backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
      backgroundSize: `${size}px ${size}px`,
      maskImage: "radial-gradient(ellipse at 50% 45%, #000 12%, transparent 78%)",
      WebkitMaskImage: "radial-gradient(ellipse at 50% 45%, #000 12%, transparent 78%)",
    }} />
  )
}

/** 缓慢推近/平移的真实截图镜头 */
export function Shot({ src, op, p, from = [1, 50, 50], to = [1.08, 50, 50], radius = 22, inset = 64, border = "#27272A" }: {
  src: string; op: number; p: number
  from?: [number, number, number]; to?: [number, number, number]
  radius?: number; inset?: number; border?: string
}) {
  if (op <= 0.001) return null
  const k = easeInOut(p)
  const z = lerp(from[0], to[0], k)
  const ox = lerp(from[1], to[1], k)
  const oy = lerp(from[2], to[2], k)
  return (
    <div style={{
      position: "absolute", inset, borderRadius: radius, overflow: "hidden",
      border: `1px solid ${border}`, background: "#18181B", opacity: op,
      boxShadow: "0 40px 120px rgba(0,0,0,.66)",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{
        width: "100%", height: "100%", objectFit: "cover", objectPosition: "top",
        transform: `scale(${z})`, transformOrigin: `${ox}% ${oy}%`,
      }} />
    </div>
  )
}
