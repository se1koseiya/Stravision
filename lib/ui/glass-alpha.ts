/**
 * 桌面端「窗口不透明度」—— 用户可调的唯一出口（2026-10-23）
 *
 * ── 它到底调的是什么 ──
 *   桌面端窗口背后挂的是系统的 acrylic 材质（见 desktop/main.js#detectGlassShell）：
 *   窗口背后那层内容被 DWM 采样 + 高斯模糊后透上来，所以「模糊感」由系统给，
 *   本文件只决定**这层磨砂被画布压掉多少**：
 *     .58 = 58% 画布 + 42% 磨砂层
 *   本文件管的正是这个百分比（CSS 变量 `--glass-a`，消费方 = app/globals.css 的
 *   「窗口玻璃壳」一节）。数值越小越透、越大越实，1 等于关了透视。
 *
 * ── 为什么是内联变量而不是 data-* 属性 ──
 *   画布 token 里要用 `rgba(247,247,248, var(--glass-a))` 做 alpha 运算，
 *   只有变量能参与；写成 data 属性就得为每个档位枚举一条规则。
 *   内联写在 <html> 上，优先级天然高过 light/dark 两条规则，不用 !important。
 *
 * ── 默认值按主题给 ──
 *   亮色默认 .58、暗色默认 .60（见 globals.css）：亮色画布本来就白，压得太透会发灰；
 *   暗色底子深，可以再放一点。用户没拖过滑杆时**不写内联变量**，两种主题各用各的默认值；
 *   一旦拖过，一个值同时作用于两种主题（用户意图明确，不该被主题偷偷改掉）。
 *
 * ── 为什么要有 BOOT 脚本 ──
 *   和 MATERIAL_PREF_BOOT 同理：React 水合前先把值写上，否则桌面端冷启动会先按默认
 *   透明度画一帧、随后跳到用户设置 —— 那种"闪一下"比不生效还难受。
 */

export const GLASS_ALPHA_KEY = "stravision.glass.alpha"

/** 下限 .25：再低文字对比度就破了（深色壁纸下画布会接近壁纸本身） */
export const GLASS_ALPHA_MIN = 0.25
export const GLASS_ALPHA_MAX = 1

/** 与 globals.css 里两条默认值保持一致（只有"没设置过"时才用到） */
export const GLASS_ALPHA_DEFAULT_LIGHT = 0.58
export const GLASS_ALPHA_DEFAULT_DARK = 0.6

/** 读用户设置；没设置过 / 值非法 → null（= 交给主题默认） */
export function readGlassAlpha(): number | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(GLASS_ALPHA_KEY)
    if (!raw) return null
    const n = Number(raw)
    if (!Number.isFinite(n)) return null
    if (n < GLASS_ALPHA_MIN || n > GLASS_ALPHA_MAX) return null
    return n
  } catch {
    return null
  }
}

/**
 * 应用 / 清除（null = 回到主题默认）。
 * 只碰 `<html>` 上的一个内联变量 —— 不触发任何 React 重渲染，拖动滑杆时逐帧调用无压力。
 */
export function applyGlassAlpha(alpha: number | null): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  if (alpha == null) {
    root.style.removeProperty("--glass-a")
    try {
      window.localStorage.removeItem(GLASS_ALPHA_KEY)
    } catch {
      /* ignore */
    }
    return
  }
  const clamped = Math.min(GLASS_ALPHA_MAX, Math.max(GLASS_ALPHA_MIN, alpha))
  root.style.setProperty("--glass-a", String(clamped))
  try {
    window.localStorage.setItem(GLASS_ALPHA_KEY, String(clamped))
  } catch {
    /* ignore */
  }
}

/**
 * 当前窗口是不是真的"透传桌面"。
 * false 时滑杆没有意义 —— 浏览器部署 / Linux / 玻璃壳未启用，画布本来就是实色。
 */
export function glassShellActive(): boolean {
  if (typeof window === "undefined") return false
  const bridge = (window as unknown as { stravisionDesktop?: { glassShell?: boolean } }).stravisionDesktop
  return bridge?.glassShell === true
}

/** 水合前预置（放进 app/layout.tsx 的 <script>） */
export const GLASS_ALPHA_BOOT = `(function(){try{var v=localStorage.getItem("${GLASS_ALPHA_KEY}");if(!v)return;var n=parseFloat(v);if(!(n>=${GLASS_ALPHA_MIN}&&n<=${GLASS_ALPHA_MAX}))return;document.documentElement.style.setProperty("--glass-a",String(n));}catch(e){}})()`
