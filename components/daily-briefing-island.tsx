"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Volume2, X, Loader2 } from "lucide-react"
import { getVoiceSettings } from "@/components/ai-settings-dialog"

interface DailyBriefingIslandProps {
  username?: string
  deviceData?: any
  weatherData?: any
  enabled?: boolean
}

type IslandPhase = "idle" | "loading" | "expanding" | "playing" | "collapsing" | "dismissed"

export function DailyBriefingIsland({
  username,
  deviceData,
  weatherData,
  enabled = true,
}: DailyBriefingIslandProps) {
  const [phase, setPhase] = useState<IslandPhase>("idle")
  const [briefingText, setBriefingText] = useState("")
  const [displayText, setDisplayText] = useState("")
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hasTriggeredRef = useRef(false)
  const animFrameRef = useRef<number | null>(null)

  // Waveform animation state
  const [bars, setBars] = useState<number[]>([3, 5, 7, 4, 6, 8, 3, 5, 7, 4, 6, 3])
  const waveIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
    if (waveIntervalRef.current) {
      clearInterval(waveIntervalRef.current)
      waveIntervalRef.current = null
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Start wave animation
  const startWaveAnimation = useCallback(() => {
    if (waveIntervalRef.current) clearInterval(waveIntervalRef.current)
    waveIntervalRef.current = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * 16 + 2))
    }, 120)
  }, [])

  const stopWaveAnimation = useCallback(() => {
    if (waveIntervalRef.current) {
      clearInterval(waveIntervalRef.current)
      waveIntervalRef.current = null
    }
    setBars([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3])
  }, [])

  // Typewriter effect
  const typewriterEffect = useCallback((text: string) => {
    let i = 0
    setDisplayText("")
    const tick = () => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1))
        i++
        animFrameRef.current = requestAnimationFrame(() => {
          setTimeout(tick, 35)
        })
      }
    }
    tick()
  }, [])

  // Keep latest data in refs so the trigger effect doesn't re-run on every SSE tick
  const deviceDataRef = useRef(deviceData)
  const weatherDataRef = useRef(weatherData)
  useEffect(() => { deviceDataRef.current = deviceData }, [deviceData])
  useEffect(() => { weatherDataRef.current = weatherData }, [weatherData])

  // One-shot flag: becomes true once deviceData is available
  const [dataReady, setDataReady] = useState(false)
  useEffect(() => {
    if (deviceData && !dataReady) setDataReady(true)
  }, [deviceData, dataReady])

  // Main trigger logic — only depends on stable values
  useEffect(() => {
    if (!enabled || !username || !dataReady || hasTriggeredRef.current) return

    // 检查用户是否永久禁用了今日播报
    if (localStorage.getItem('daily_briefing_disabled') === 'true') {
      hasTriggeredRef.current = true
      return
    }

    const today = new Date().toISOString().split("T")[0]
    const storageKey = `daily_briefing_${username}_${today}`
    
    if (localStorage.getItem(storageKey)) {
      hasTriggeredRef.current = true
      return
    }

    hasTriggeredRef.current = true
    localStorage.setItem(storageKey, "triggered")

    const runBriefing = async () => {
      // Phase 1: Loading (compact pill) — shown only during text generation
      setPhase("loading")

      try {
        // Step 1: Generate briefing text
        const textRes = await fetch("/api/ai/daily-briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceData: deviceDataRef.current,
            weatherData: weatherDataRef.current,
            username,
          }),
        })

        if (!textRes.ok) throw new Error("Failed to generate briefing")
        const { text } = await textRes.json()
        setBriefingText(text)

        // Step 2: IMMEDIATELY expand and show text — don't wait for TTS!
        setPhase("expanding")
        await new Promise(r => setTimeout(r, 350))
        setPhase("playing")
        typewriterEffect(text)

        // Step 3: Synthesize voice IN PARALLEL while text is showing
        const voiceConfig = getVoiceSettings()
        const ttsPromise = fetch("/api/ai/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            text: text
              .replace(/°C/gi, '摄氏度')
              .replace(/\blux\b/gi, '勒克斯')
              .replace(/\bppm\b/gi, 'P P M')
              .replace(/CO[2₂]/gi, '二氧化碳')
              .replace(/[！!]/g, '。'),
            voice: voiceConfig?.voice || "Cherry" 
          }),
        })

        // Wait for TTS while typewriter is already running
        const ttsRes = await ttsPromise
        if (ttsRes.ok) {
          const blob = await ttsRes.blob()
          const audioUrl = URL.createObjectURL(blob)

          startWaveAnimation()
          const audio = new Audio(audioUrl)
          audioRef.current = audio

          audio.onended = () => {
            stopWaveAnimation()
            URL.revokeObjectURL(audioUrl)
            setTimeout(() => {
              setPhase("collapsing")
              setTimeout(() => setPhase("dismissed"), 600)
            }, 2000)
          }

          audio.onerror = () => {
            stopWaveAnimation()
            URL.revokeObjectURL(audioUrl)
            setTimeout(() => {
              setPhase("collapsing")
              setTimeout(() => setPhase("dismissed"), 600)
            }, 3000)
          }

          await audio.play().catch(() => {
            console.warn("Autoplay blocked, text-only mode")
            // Still show text, auto-dismiss after 6 seconds
            setTimeout(() => {
              setPhase("collapsing")
              setTimeout(() => setPhase("dismissed"), 600)
            }, 6000)
          })
        } else {
          // TTS failed — just show text, auto-dismiss
          console.warn("TTS synthesis failed, text-only mode")
          setTimeout(() => {
            setPhase("collapsing")
            setTimeout(() => setPhase("dismissed"), 600)
          }, 6000)
        }
      } catch (e) {
        console.error("Daily briefing error:", e)
        setPhase("dismissed")
      }
    }

    // Delay start by 1.5s to let page settle
    const timer = setTimeout(runBriefing, 1500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, username, dataReady])

  const handleDismiss = useCallback(() => {
    cleanup()
    stopWaveAnimation()
    setPhase("collapsing")
    setTimeout(() => setPhase("dismissed"), 600)
  }, [cleanup, stopWaveAnimation])

  const handleDisablePermanently = useCallback(() => {
    // 永久禁用今日播报
    localStorage.setItem('daily_briefing_disabled', 'true')
    cleanup()
    stopWaveAnimation()
    setPhase("collapsing")
    setTimeout(() => setPhase("dismissed"), 600)
  }, [cleanup, stopWaveAnimation])

  if (phase === "idle" || phase === "dismissed") return null

  const isCompact = phase === "loading"
  const isExpanded = phase === "expanding" || phase === "playing"
  const isCollapsing = phase === "collapsing"

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex justify-center pointer-events-none">
      <div
        className={cn(
          "pointer-events-auto relative overflow-hidden transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
          // The pill shape
          "rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.12)]",
          // Background
          "bg-[#1C1C1E] text-white",
          // Sizes
          isCompact && "w-[180px] h-[44px]",
          isExpanded && "w-[420px] min-h-[100px]",
          isCollapsing && "w-[180px] h-[44px] opacity-0 scale-95",
        )}
      >
        {/* Subtle inner glow */}
        <div className="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/[0.08]" />

        {/* Compact state: Loading indicator */}
        {isCompact && (
          <div className="flex items-center justify-center h-full gap-3 px-5 animate-in fade-in duration-300">
            <div className="relative flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-primary flex items-center justify-center">
                <Volume2 size={12} className="text-white" />
              </div>
              <div className="absolute inset-0 w-6 h-6 rounded-full bg-emerald-400/40 animate-ping" />
            </div>
            <span className="text-[13px] font-medium text-white/90 tracking-tight">
              准备今日播报...
            </span>
          </div>
        )}

        {/* Expanded state: Playing audio with text */}
        {isExpanded && (
          <div className="p-5 animate-in fade-in slide-in-from-top-2 duration-500">
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-primary flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Volume2 size={14} className="text-white" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-white/95 tracking-tight leading-tight">今日智能播报</div>
                  <div className="text-[10px] text-white/40 font-medium">莓小智 · AI 管家</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDisablePermanently}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-1 transition-colors group"
                  title="不再显示今日播报"
                >
                  <X size={10} className="text-white/60 group-hover:text-white/80" />
                  <span className="text-[10px] text-white/60 group-hover:text-white/80 font-medium">不再显示</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  title="关闭"
                >
                  <X size={12} className="text-white/60" />
                </button>
              </div>
            </div>

            {/* Audio waveform */}
            <div className="flex items-end gap-[2px] h-5 mb-3 px-1">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-gradient-to-t from-primary to-emerald-300 transition-all duration-100"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>

            {/* Briefing text with typewriter */}
            <div className="text-[13px] leading-relaxed text-white/80 font-medium min-h-[40px]">
              {displayText}
              {displayText.length < briefingText.length && (
                <span className="inline-block w-[2px] h-[14px] bg-emerald-400 ml-[1px] animate-pulse" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
