"use client"

import { useMemo } from "react"

type EffectType = 'rain' | 'drizzle' | 'snow' | 'thunder' | 'cloudy' | 'sunny' | 'fog' | 'none'

export function getWeatherEffectType(condition: string): EffectType {
  const c = condition.toLowerCase()
  if (c.includes('thunder') || c.includes('雷')) return 'thunder'
  if (c.includes('snow') || c.includes('blizzard') || c.includes('雪')) return 'snow'
  if (c.includes('drizzle') || c.includes('毛毛雨')) return 'drizzle'
  if (c.includes('rain') || c.includes('shower') || c.includes('雨')) return 'rain'
  if (c.includes('fog') || c.includes('mist') || c.includes('雾')) return 'fog'
  if (c.includes('overcast') || c.includes('cloud') || c.includes('阴') || c.includes('多云')) return 'cloudy'
  if (c.includes('clear') || c.includes('sunny') || c.includes('晴')) return 'sunny'
  return 'none'
}

// ─── Rain ───
function RainEffect({ count = 40, intensity = 1 }: { count?: number; intensity?: number }) {
  const drops = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      duration: 0.5 + Math.random() * 0.6 / intensity,
      delay: Math.random() * 2,
      height: 8 + Math.random() * 14,
      opacity: 0.3 + Math.random() * 0.4,
    })), [count, intensity])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {drops.map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: d.left,
            top: -20,
            width: 1.5,
            height: d.height,
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.8))',
            borderRadius: 1,
            opacity: d.opacity,
            animation: `weather-rain-fall ${d.duration}s linear infinite`,
            animationDelay: `${d.delay}s`,
            transform: 'rotate(-12deg)',
          }}
        />
      ))}
    </div>
  )
}

// ─── Drizzle (lighter, slower) ───
function DrizzleEffect({ count = 25 }: { count?: number }) {
  const drops = useMemo(() =>
    Array.from({ length: count }, () => ({
      left: `${Math.random() * 100}%`,
      duration: 1.2 + Math.random() * 1,
      delay: Math.random() * 3,
      opacity: 0.2 + Math.random() * 0.3,
    })), [count])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {drops.map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: d.left,
            top: -10,
            width: 1,
            height: 8,
            background: 'rgba(255,255,255,0.6)',
            borderRadius: 1,
            opacity: d.opacity,
            animation: `weather-drizzle ${d.duration}s linear infinite`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Snow ───
function SnowEffect({ count = 35 }: { count?: number }) {
  const flakes = useMemo(() =>
    Array.from({ length: count }, () => ({
      left: `${Math.random() * 100}%`,
      duration: 4 + Math.random() * 6,
      delay: Math.random() * 5,
      size: 2 + Math.random() * 4,
      opacity: 0.4 + Math.random() * 0.5,
      sway: Math.random() * 30 - 15,
    })), [count])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {flakes.map((f, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: f.left,
            top: -10,
            width: f.size,
            height: f.size,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)',
            boxShadow: '0 0 4px rgba(255,255,255,0.5)',
            opacity: f.opacity,
            animation: `weather-snow-fall ${f.duration}s linear infinite`,
            animationDelay: `${f.delay}s`,
            // @ts-expect-error CSS custom property
            '--sway': `${f.sway}px`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Thunder (rain + lightning flash) ───
function ThunderEffect() {
  return (
    <>
      <RainEffect count={50} intensity={1.4} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255,255,255,0.9)',
          pointerEvents: 'none',
          animation: 'weather-lightning 5s linear infinite',
        }}
      />
      {/* Secondary flash at different timing */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(200,210,255,0.7)',
          pointerEvents: 'none',
          animation: 'weather-lightning 7s linear infinite',
          animationDelay: '2.5s',
        }}
      />
    </>
  )
}

// ─── Clouds (drifting) ───
function CloudyEffect() {
  const clouds = useMemo(() => [
    { top: '12%', duration: 28, delay: 0, scale: 1.2, opacity: 0.18 },
    { top: '30%', duration: 35, delay: -10, scale: 0.9, opacity: 0.12 },
    { top: '55%', duration: 40, delay: -20, scale: 1.4, opacity: 0.1 },
    { top: '72%', duration: 32, delay: -5, scale: 0.7, opacity: 0.14 },
  ], [])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {clouds.map((c, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: c.top,
            left: 0,
            width: 120 * c.scale,
            height: 50 * c.scale,
            animation: `weather-cloud-drift ${c.duration}s linear infinite`,
            animationDelay: `${c.delay}s`,
          }}
        >
          {/* Cloud shape built from overlapping circles */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: `rgba(255,255,255,${c.opacity})`,
            borderRadius: '50%',
            filter: 'blur(12px)',
          }} />
          <div style={{
            position: 'absolute',
            width: '60%',
            height: '80%',
            left: '20%',
            top: '-30%',
            background: `rgba(255,255,255,${c.opacity * 0.8})`,
            borderRadius: '50%',
            filter: 'blur(10px)',
          }} />
        </div>
      ))}
    </div>
  )
}

// ─── Sunny (sun glow + rays) ───
function SunnyEffect() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Sun glow orb in top-right */}
      <div style={{
        position: 'absolute',
        top: -30,
        right: -20,
        width: 140,
        height: 140,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,240,180,0.5) 0%, rgba(255,200,100,0.2) 40%, transparent 70%)',
        animation: 'weather-sun-glow 4s ease-in-out infinite',
      }} />
      {/* Rotating rays */}
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        style={{
          position: 'absolute',
          top: -20,
          right: -10,
          animation: 'weather-sun-ray 20s linear infinite',
        }}
      >
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * 360
          return (
            <line
              key={i}
              x1="60"
              y1="60"
              x2="60"
              y2="15"
              stroke="rgba(255,240,180,0.25)"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${angle} 60 60)`}
            />
          )
        })}
      </svg>
      {/* Light shimmer particles */}
      {Array.from({ length: 6 }, (_, i) => ({
        left: 10 + Math.random() * 80,
        top: 20 + Math.random() * 60,
        duration: 3 + Math.random() * 3,
        delay: Math.random() * 3,
        size: 2 + Math.random() * 3,
      })).map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.8)',
            boxShadow: '0 0 6px rgba(255,255,255,0.6)',
            animation: `weather-sun-glow ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Fog (drifting mist bands) ───
function FogEffect() {
  const bands = useMemo(() => [
    { top: '25%', duration: 18, delay: 0, height: 40, opacity: 0.15 },
    { top: '50%', duration: 22, delay: -8, height: 50, opacity: 0.12 },
    { top: '70%', duration: 25, delay: -15, height: 35, opacity: 0.1 },
  ], [])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {bands.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: b.top,
            left: 0,
            width: '60%',
            height: b.height,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
            filter: 'blur(16px)',
            opacity: b.opacity,
            animation: `weather-fog-drift ${b.duration}s linear infinite`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Main Weather Effects ───
export function WeatherEffects({
  condition,
  reduced = false,
}: {
  condition: string
  reduced?: boolean
}) {
  const type = getWeatherEffectType(condition)

  if (type === 'none') return null

  const intensity = reduced ? 0.5 : 1

  return (
    <>
      {type === 'rain' && <RainEffect count={Math.round(40 * intensity)} intensity={1} />}
      {type === 'drizzle' && <DrizzleEffect count={Math.round(25 * intensity)} />}
      {type === 'snow' && <SnowEffect count={Math.round(35 * intensity)} />}
      {type === 'thunder' && <ThunderEffect />}
      {type === 'cloudy' && <CloudyEffect />}
      {type === 'sunny' && <SunnyEffect />}
      {type === 'fog' && <FogEffect />}
    </>
  )
}
