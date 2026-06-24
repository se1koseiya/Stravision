"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { getVoiceSettings } from "@/components/ai-settings-dialog"

/**
 * TTS (Text-to-Speech) engine hook.
 * Manages audio queue, pre-fetching, and seamless playback.
 * Extracted from app/ai-assistant/page.tsx
 */
export function useTTSEngine(isStoppedRef: React.MutableRefObject<boolean>) {
  const [isTTSEnabled, setIsTTSEnabled] = useState(true)
  const [isTtsPaused, setIsTtsPaused] = useState(false)

  const ttsQueueRef = useRef<string[]>([])
  const ttsAudioQueueRef = useRef<{ url: string; text: string }[]>([])
  const isFetchingTtsRef = useRef(false)
  const isPlayingTtsRef = useRef(false)
  const audioContextRef = useRef<HTMLAudioElement | null>(null)
  const isTtsPausedRef = useRef(false)

  // Sync isTtsPaused to ref
  useEffect(() => {
    isTtsPausedRef.current = isTtsPaused
  }, [isTtsPaused])

  // Initialize TTS state from stored settings
  useEffect(() => {
    const voiceSettings = getVoiceSettings()
    setIsTTSEnabled(voiceSettings.readAloud)
  }, [])

  // Producer: background pre-fetch audio clips
  const fetchNextTts = useCallback(async () => {
    if (isFetchingTtsRef.current || isStoppedRef.current) return
    isFetchingTtsRef.current = true

    while (
      ttsQueueRef.current.length > 0 &&
      ttsAudioQueueRef.current.length < 3 &&
      !isStoppedRef.current &&
      isTTSEnabled
    ) {
      const text = ttsQueueRef.current.shift()
      if (!text) continue

      try {
        const voiceConfig = getVoiceSettings()
        const res = await fetch("/api/ai/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voice: voiceConfig?.voice || "Cherry",
          }),
        })
        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          ttsAudioQueueRef.current.push({ url, text })

          if (!isPlayingTtsRef.current) {
            playNextTtsAudio()
          }
        }
      } catch (e) {
        console.error("TTS Fetch Error:", e)
      }
    }

    isFetchingTtsRef.current = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStoppedRef, isTTSEnabled])

  // Consumer: seamless playback
  const playNextTtsAudio = useCallback(async () => {
    if (
      isPlayingTtsRef.current ||
      ttsAudioQueueRef.current.length === 0 ||
      isStoppedRef.current ||
      !isTTSEnabled
    )
      return
    isPlayingTtsRef.current = true

    const item = ttsAudioQueueRef.current.shift()
    if (!item) {
      isPlayingTtsRef.current = false
      return
    }

    try {
      const audio = new window.Audio(item.url)
      audioContextRef.current = audio

      await new Promise<void>((resolve) => {
        audio.onended = () => resolve()
        audio.onerror = () => resolve()

        let wasPaused = false
        const interval = setInterval(() => {
          if (isStoppedRef.current || !isTTSEnabled) {
            audio.pause()
            clearInterval(interval)
            resolve()
            return
          }

          if (isTtsPausedRef.current && !wasPaused) {
            audio.pause()
            wasPaused = true
          } else if (!isTtsPausedRef.current && wasPaused) {
            audio.play().catch(resolve)
            wasPaused = false
          }
        }, 80)

        if (!isTtsPausedRef.current) {
          audio.play().catch(resolve)
        } else {
          wasPaused = true
        }
      })

      URL.revokeObjectURL(item.url)
      audioContextRef.current = null
    } catch (e) {
      console.error("TTS Play Error:", e)
    }

    isPlayingTtsRef.current = false

    // Notify producer and chain next clip
    fetchNextTts()
    playNextTtsAudio()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStoppedRef, isTTSEnabled])

  /**
   * Enqueue a sentence for TTS playback.
   */
  const enqueueTts = useCallback(
    (text: string) => {
      if (!isTTSEnabled || isStoppedRef.current) return
      ttsQueueRef.current.push(text)
      fetchNextTts()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isTTSEnabled, isStoppedRef]
  )

  /**
   * Abruptly stop all TTS playback.
   */
  const stopTTS = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.pause()
      audioContextRef.current = null
    }
    ttsQueueRef.current = []
    ttsAudioQueueRef.current = []
    isPlayingTtsRef.current = false
    isFetchingTtsRef.current = false
  }, [])

  /**
   * Reset TTS for a new message (stop + clear state).
   */
  const resetTTS = useCallback(() => {
    stopTTS()
    setIsTtsPaused(false)
  }, [stopTTS])

  return {
    // State
    isTTSEnabled,
    setIsTTSEnabled,
    isTtsPaused,
    setIsTtsPaused,

    // Refs (exposed for direct access in tight loops)
    isTtsPausedRef,
    audioContextRef,
    ttsQueueRef,

    // Actions
    enqueueTts,
    stopTTS,
    resetTTS,
  }
}
