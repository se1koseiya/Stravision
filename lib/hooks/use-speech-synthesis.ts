"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface UseSpeechSynthesisOptions {
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
  voiceName?: string
  onEnd?: () => void
  onError?: (error: string) => void
}

interface SpeechSynthesisResult {
  isSpeaking: boolean
  isPaused: boolean
  isSupported: boolean
  voices: SpeechSynthesisVoice[]
  speak: (text: string) => void
  pause: () => void
  resume: () => void
  cancel: () => void
}

export function useSpeechSynthesis(options: UseSpeechSynthesisOptions = {}): SpeechSynthesisResult {
  const {
    lang = "zh-CN",
    rate = 1,
    pitch = 1,
    volume = 1,
    voiceName,
    onEnd,
    onError,
  } = options

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isSupported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      let cancelled = false
      const loadVoices = () => {
        if (cancelled) return
        const availableVoices = window.speechSynthesis.getVoices()
        setVoices(availableVoices)
      }

      setTimeout(loadVoices, 0)
      window.speechSynthesis.onvoiceschanged = loadVoices

      return () => {
        cancelled = true
        window.speechSynthesis.onvoiceschanged = null
        window.speechSynthesis.cancel()
      }
    }
    return
  }, [])

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume

    // Find preferred voice
    if (voiceName) {
      const voice = voices.find((v) => v.name === voiceName)
      if (voice) utterance.voice = voice
    } else {
      // Try to find a Chinese voice
      const chineseVoice = voices.find(
        (v) => v.lang.includes("zh") || v.lang.includes("CN")
      )
      if (chineseVoice) utterance.voice = chineseVoice
    }

    utterance.onstart = () => {
      setIsSpeaking(true)
      setIsPaused(false)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      setIsPaused(false)
      onEnd?.()
    }

    utterance.onerror = (event) => {
      setIsSpeaking(false)
      setIsPaused(false)
      onError?.(event.error)
    }

    utterance.onpause = () => {
      setIsPaused(true)
    }

    utterance.onresume = () => {
      setIsPaused(false)
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [isSupported, lang, rate, pitch, volume, voiceName, voices, onEnd, onError])

  const pause = useCallback(() => {
    if (isSupported && isSpeaking) {
      window.speechSynthesis.pause()
    }
  }, [isSupported, isSpeaking])

  const resume = useCallback(() => {
    if (isSupported && isPaused) {
      window.speechSynthesis.resume()
    }
  }, [isSupported, isPaused])

  const cancel = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
    }
  }, [isSupported])

  return {
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    speak,
    pause,
    resume,
    cancel,
  }
}
