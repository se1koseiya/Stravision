"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface UseSpeechRecognitionOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onEnd?: () => void
}

interface SpeechRecognitionResult {
  isListening: boolean
  transcript: string
  interimTranscript: string
  isSupported: boolean
  error: string | null
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: {
    isFinal: boolean
    [index: number]: {
      transcript: string
      confidence: number
    }
  }
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}): SpeechRecognitionResult {
  const {
    lang = "zh-CN",
    continuous = true,
    interimResults = true,
    onResult,
    onError,
    onEnd,
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSupported] = useState(() => {
    if (typeof window === "undefined") return false
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isManualStop = useRef(false)
  const isListeningRef = useRef(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI()
        recognition.continuous = continuous
        recognition.interimResults = interimResults
        recognition.lang = lang

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = ""
          let interim = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            const text = result[0].transcript
            if (result.isFinal) {
              finalTranscript += text
            } else {
              interim += text
            }
          }

          if (finalTranscript) {
            setTranscript((prev) => prev + finalTranscript)
            onResult?.(finalTranscript, true)
          }
          setInterimTranscript(interim)
          if (interim) {
            onResult?.(interim, false)
          }
        }

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          const errorMsg = event.error === "no-speech" 
            ? "未检测到语音" 
            : event.error === "audio-capture"
            ? "无法访问麦克风"
            : event.error === "not-allowed"
            ? "麦克风权限被拒绝"
            : `语音识别错误: ${event.error}`
          
          setError(errorMsg)
          onError?.(errorMsg)
          setIsListening(false)
          isListeningRef.current = false
        }

        recognition.onend = () => {
          // Auto restart if not manually stopped and continuous mode
          if (!isManualStop.current && continuous && isListeningRef.current) {
            try {
              recognition.start()
            } catch {
              setIsListening(false)
              isListeningRef.current = false
              onEnd?.()
            }
          } else {
            setIsListening(false)
            isListeningRef.current = false
            onEnd?.()
          }
        }

        recognition.onstart = () => {
          setIsListening(true)
          setError(null)
          isListeningRef.current = true
        }

        recognitionRef.current = recognition
      }
    }

    return () => {
      if (recognitionRef.current) {
        isManualStop.current = true
        recognitionRef.current.abort()
      }
    }
  }, [lang, continuous, interimResults])

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      isManualStop.current = false
      setError(null)
      setInterimTranscript("")
      try {
        recognitionRef.current.start()
      } catch (e: any) {
        // Ignore "already started" error
        if (e.name === 'InvalidStateError' || e.message?.includes('already started')) {
          console.warn("Speech recognition already started.")
          return
        }
        console.error("Speech recognition start error:", e)
        setError("无法启动语音识别")
      }
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      isManualStop.current = true
      recognitionRef.current.stop()
      setIsListening(false)
      isListeningRef.current = false
    }
  }, [isListening])

  const resetTranscript = useCallback(() => {
    setTranscript("")
    setInterimTranscript("")
  }, [])

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  }
}
