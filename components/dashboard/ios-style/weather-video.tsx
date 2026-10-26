"use client"

import { useMemo, useRef } from "react"

export type WeatherVideoCategory =
  | 'sun'
  | 'cloudy'
  | 'lightrain'
  | 'heavyrain'
  | 'snow'
  | 'fog'
  | 'forecast'
  | 'none'

// Multiple video variants per category — one is picked at random
const VIDEO_VARIANTS: Record<Exclude<WeatherVideoCategory, 'none'>, string[]> = {
  sun: ['/weathervideo/sun.mp4'],
  cloudy: ['/weathervideo/cloudy.mp4'],
  lightrain: ['/weathervideo/lightrain.mp4'],
  heavyrain: ['/weathervideo/heavyrain.mp4'],
  snow: ['/weathervideo/snow.mp4'],
  fog: ['/weathervideo/fog.mp4', '/weathervideo/fog2.mp4'],
  forecast: ['/weathervideo/forecast.mp4'],
}

export function conditionToVideoCategory(condition: string): WeatherVideoCategory {
  const c = condition.toLowerCase()
  if (c.includes('thunder') || c.includes('storm') || c.includes('雷') || c.includes('暴雨') || c.includes('大暴雨')) return 'heavyrain'
  if (c.includes('heavy') && c.includes('rain')) return 'heavyrain'
  if (c.includes('snow') || c.includes('blizzard') || c.includes('雪')) return 'snow'
  if (c.includes('fog') || c.includes('mist') || c.includes('haze') || c.includes('雾') || c.includes('霾')) return 'fog'
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle') || c.includes('雨')) return 'lightrain'
  if (c.includes('overcast') || c.includes('cloud') || c.includes('阴') || c.includes('多云')) return 'cloudy'
  if (c.includes('clear') || c.includes('sunny') || c.includes('晴')) return 'sun'
  return 'none'
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function seededRandom(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/**
 * Hook that returns a video URL with a given probability.
 *
 * - A per-mount random seed ensures different page loads get different outcomes.
 * - The seed is combined with `condition` so that when real weather data arrives
 *   (condition changes from the default '晴朗' to the actual condition), the
 *   video background recomputes and updates immediately.
 * - useMemo deps include `condition`, so the transition is reactive.
 */
export function useWeatherVideo(
  condition: string,
  probability: number = 0.7,
  categoryOverride?: WeatherVideoCategory
): { src: string; category: WeatherVideoCategory; enabled: boolean } {
  // Generate a per-mount random seed once (stable across re-renders)
  const sessionSeedRef = useRef<number>(0)
  if (sessionSeedRef.current === 0) {
    sessionSeedRef.current = Math.floor(Math.random() * 2147483647) + 1
  }

  return useMemo(() => {
    const category = categoryOverride ?? conditionToVideoCategory(condition)
    if (category === 'none') return { src: '', category, enabled: false }

    const variants = VIDEO_VARIANTS[category]
    if (!variants || variants.length === 0) return { src: '', category, enabled: false }

    // Seed = per-mount random + condition → changes when condition changes
    const seed = hashString(sessionSeedRef.current + condition + category)
    const rng = seededRandom(seed)
    const enabled = rng() < probability

    if (!enabled) return { src: '', category, enabled: false }

    // Pick a random variant
    const variantIndex = Math.floor(rng() * variants.length)
    return { src: variants[variantIndex], category, enabled: true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condition, probability, categoryOverride])
}

/**
 * Video background layer — covers parent absolutely.
 *
 * Uses `key={src}` on the <video> element to force React to remount the
 * element when the source changes. This is critical: when weather data
 * arrives after initial page load and `condition` changes, the browser
 * would otherwise NOT reload a video whose <source> src attribute was
 * mutated. A key change forces a clean unmount/mount cycle.
 *
 * ══ 2026-10-04 改版：视频从「背景主体」降级为「动态纹理」══
 * 旧实现把不透明实拍视频直接铺在卡上，再盖一层 0.4 黑 —— 结果是
 * **天空色相板完全失效**：同一场雨和晴天的卡片看起来一模一样（实测截图确认）。
 * 视频是「实拍纹理」，色相与我们的天气色板毫无关系；让它当底色主体，
 * 等于把「这张卡是什么天气」这个最关键的信息交给了随机素材。
 *
 * 现在：视频只提供**动态感**，色相与明度仍由 weather-sky 的色相板说了算 ——
 *   ① 视频整体降到低透明度（像材质里透出的一点纹理）
 *   ② 用色相板的**最深一档**做一层染色覆盖，等于把视频「染」成当前天气的颜色
 *   ③ 顶部再压一层同色相的上缘受光，与天空层的受光方向一致
 * 这样晴是蓝紫、雨是青蓝、雷是深紫、雪是冷灰 —— 视频只在同色相内提供动态。
 */
export function WeatherVideoBackground({
  src,
  overlayOpacity = 0.4,
  overlayColor = '0,0,0',
  /** 色相板最深一档：用于把视频染成当前天气色。缺省则退化为中性黑覆盖 */
  tintDeep,
}: {
  src: string
  overlayOpacity?: number
  overlayColor?: string
  tintDeep?: string
}) {
  if (!src) return null

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none' }}>
      <video
        key={src}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        src={src}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          minWidth: '100%',
          minHeight: '100%',
          width: 'auto',
          height: 'auto',
          transform: 'translate(-50%, -50%)',
          objectFit: 'cover',
          // 降级为纹理：只留一点动态，画面主体交给色相板
          opacity: 0.38,
        }}
      />
      {/* 用天气色染色（而非纯黑）—— 视频因此「属于」这个天气，而不是盖住它 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: tintDeep
          ? `linear-gradient(160deg, ${tintDeep}E6 0%, ${tintDeep}F2 100%)`
          : `linear-gradient(135deg, rgba(${overlayColor},${overlayOpacity + 0.15}) 0%, rgba(${overlayColor},${overlayOpacity}) 100%)`,
      }} />
    </div>
  )
}
