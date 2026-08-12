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
 */
export function WeatherVideoBackground({
  src,
  overlayOpacity = 0.4,
  overlayColor = '0,0,0',
}: {
  src: string
  overlayOpacity?: number
  overlayColor?: string
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
        }}
      />
      {/* Dark overlay for readability */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(135deg, rgba(${overlayColor},${overlayOpacity + 0.15}) 0%, rgba(${overlayColor},${overlayOpacity}) 100%)`,
      }} />
    </div>
  )
}
