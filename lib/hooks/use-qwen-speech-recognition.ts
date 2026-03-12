"use client"

import { useState, useRef, useCallback, useEffect } from "react"

interface QwenSpeechRecognitionOptions {
  language?: string
  dialect?: string
  onResult?: (transcript: string, confidence: number, segments?: any[]) => void
  onError?: (error: string) => void
  onStart?: () => void
  onEnd?: () => void
  maxDuration?: number // 最大录音时长（秒）
  chunkSize?: number // 音频块大小（毫秒）
}

interface QwenSpeechRecognitionResult {
  isRecording: boolean
  isProcessing: boolean
  transcript: string
  confidence: number
  detectedLanguage: string
  detectedDialect?: string
  error: string | null
  supportedLanguages: Record<string, string>
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  resetTranscript: () => void
}

interface RecognitionResponse {
  success: boolean
  transcript: string
  confidence: number
  detectedLanguage: string
  detectedDialect?: string
  segments?: any[]
  duration?: number
  supportedLanguages?: Record<string, string>
  error?: string
}

export function useQwenSpeechRecognition(options: QwenSpeechRecognitionOptions = {}): QwenSpeechRecognitionResult {
  const {
    language = 'zh-CN',
    dialect = 'auto',
    onResult,
    onError,
    onStart,
    onEnd,
    maxDuration = 60, // 默认最大60秒
    chunkSize = 1000, // 默认1秒块
  } = options

  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [confidence, setConfidence] = useState(0)
  const [detectedLanguage, setDetectedLanguage] = useState("")
  const [detectedDialect, setDetectedDialect] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [supportedLanguages, setSupportedLanguages] = useState<Record<string, string>>({})

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 获取支持的语言列表
  const fetchSupportedLanguages = useCallback(async () => {
    try {
      const response = await fetch('/api/speech/recognize', {
        credentials: 'include' // 包含cookies（虽然GET不需要认证，但保持一致性）
      })
      if (response.ok) {
        const data = await response.json()
        setSupportedLanguages(data.supportedLanguages || {})
      } else {
        console.error('Failed to fetch supported languages:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch supported languages:', error)
    }
  }, [])

  // 初始化时获取支持的语言
  useEffect(() => {
    fetchSupportedLanguages()
  }, [fetchSupportedLanguages])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setIsRecording(true)
      onStart?.()

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000, // Qwen3-ASR 推荐的采样率
          channelCount: 1,   // 单声道
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      })
      
      streamRef.current = stream
      audioChunksRef.current = []

      // 创建 MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus', // 优先使用 opus 编码
      })
      
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        setIsRecording(false)
        setIsProcessing(true)

        try {
          // 合并音频数据
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          
          // 首先尝试服务器端ASR
          await tryServerASR(audioBlob)
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Network error'
          
          // 如果服务器ASR失败，尝试浏览器内置语音识别
          if (errorMsg.includes('API key') || errorMsg.includes('欠费') || errorMsg.includes('Arrearage')) {
            console.log('Server ASR failed, trying browser speech recognition...')
            await tryBrowserSpeechRecognition()
          } else {
            setError(errorMsg)
            onError?.(errorMsg)
          }
        } finally {
          setIsProcessing(false)
          onEnd?.()
        }
      }

      mediaRecorder.onerror = (event) => {
        const errorMsg = `Recording error: ${event}`
        setError(errorMsg)
        onError?.(errorMsg)
        setIsRecording(false)
        setIsProcessing(false)
      }

      // 开始录音
      mediaRecorder.start(chunkSize)

      // 设置最大录音时长
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, maxDuration * 1000)

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start recording'
      setError(errorMsg)
      onError?.(errorMsg)
      setIsRecording(false)
      setIsProcessing(false)
    }
  }, [language, dialect, onStart, onResult, onError, onEnd, maxDuration, chunkSize])

  // 尝试服务器端ASR
  const tryServerASR = async (audioBlob: Blob) => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('language', language)
    formData.append('dialect', dialect)

    const response = await fetch('/api/speech/recognize', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) {
      let errorMessage = `API 错误: ${response.status}`
      try {
        const errorData = await response.json()
        if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    const result: RecognitionResponse = await response.json()

    if (result.success) {
      setTranscript(result.transcript)
      setConfidence(result.confidence)
      setDetectedLanguage(result.detectedLanguage)
      setDetectedDialect(result.detectedDialect)
      
      if (result.supportedLanguages) {
        setSupportedLanguages(result.supportedLanguages)
      }

      onResult?.(result.transcript, result.confidence, result.segments)
    } else {
      const errorMsg = result.error || 'Speech recognition failed'
      throw new Error(errorMsg)
    }
  }

  // 浏览器内置语音识别备用方案
  const tryBrowserSpeechRecognition = async () => {
    return new Promise<void>((resolve, reject) => {
      // 检查浏览器是否支持语音识别
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      
      if (!SpeechRecognition) {
        reject(new Error('浏览器不支持语音识别功能'))
        return
      }

      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      
      // 设置语言
      if (language === 'zh-WU' || language === 'zh-CN') {
        recognition.lang = 'zh-CN'
      } else if (language === 'zh-HK') {
        recognition.lang = 'zh-HK'
      } else if (language === 'en-US') {
        recognition.lang = 'en-US'
      } else {
        recognition.lang = 'zh-CN' // 默认中文
      }

      recognition.onresult = (event: any) => {
        const result = event.results[0][0]
        const transcript = result.transcript
        const confidence = result.confidence || 0.8

        setTranscript(transcript)
        setConfidence(confidence)
        setDetectedLanguage(language)
        setDetectedDialect(dialect)

        onResult?.(transcript, confidence, [])
        resolve()
      }

      recognition.onerror = (event: any) => {
        reject(new Error(`浏览器语音识别失败: ${event.error}`))
      }

      recognition.onend = () => {
        // 识别结束
      }

      // 开始识别（重新录音）
      recognition.start()
    })
  }

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    // 清理资源
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript("")
    setConfidence(0)
    setDetectedLanguage("")
    setDetectedDialect(undefined)
    setError(null)
  }, [])

  return {
    isRecording,
    isProcessing,
    transcript,
    confidence,
    detectedLanguage,
    detectedDialect,
    error,
    supportedLanguages,
    startRecording,
    stopRecording,
    resetTranscript,
  }
}