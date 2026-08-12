"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { convertBlobToWav } from "@/lib/voice/voice-utils"

interface QwenSpeechRecognitionOptions {
  language?: string
  dialect?: string
  /** 是否优先使用浏览器原生 SpeechRecognition（零延迟、免费，Edge/Chrome 国内可用） */
  preferBrowser?: boolean
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
    preferBrowser = false,
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
  // 浏览器原生 SpeechRecognition 实例引用（preferBrowser 模式）
  const browserRecognitionRef = useRef<any>(null)

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
    setError(null)
    setTranscript("")
    setConfidence(0)
    setIsRecording(true)
    onStart?.()

    // 优先使用浏览器原生 SpeechRecognition（零延迟、免费）
    // Chrome 在国内可能无法访问 Google 语音服务，Edge 浏览器可用微软自家服务
    if (preferBrowser) {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognitionAPI) {
        setError('浏览器不支持原生语音识别，请使用 Edge/Chrome 或切换到服务器 ASR')
        setIsRecording(false)
        onEnd?.()
        return
      }
      try {
        const recognition = new SpeechRecognitionAPI()
        recognition.continuous = false
        recognition.interimResults = true // 开启中间结果，实时显示文字
        recognition.maxAlternatives = 1

        // 语言映射
        const langMap: Record<string, string> = {
          'zh-CN': 'zh-CN', 'zh-WU': 'zh-CN', 'zh-HK': 'zh-HK', 'zh-TW': 'zh-TW',
          'en-US': 'en-US', 'ja-JP': 'ja-JP', 'ko-KR': 'ko-KR',
        }
        recognition.lang = langMap[language] || 'zh-CN'

        recognition.onresult = (event: any) => {
          const lastResult = event.results[event.results.length - 1]
          const transcript = lastResult[0].transcript
          const confidence = lastResult[0].confidence || 0.9

          setTranscript(transcript)
          setConfidence(confidence)
          setDetectedLanguage(language)
          setDetectedDialect(dialect)

          // 仅在最终结果时回调（避免多次触发）
          if (lastResult.isFinal) {
            onResult?.(transcript, confidence, [])
          }
        }

        recognition.onerror = (event: any) => {
          const errMap: Record<string, string> = {
            'no-speech': '未检测到语音',
            'audio-capture': '麦克风访问失败',
            'not-allowed': '麦克风权限被拒绝',
            'network': '网络错误（Chrome 国内可能无法访问 Google 语音服务，建议使用 Edge）',
            'service-not-allowed': '浏览器语音服务不可用',
          }
          const msg = errMap[event.error] || `浏览器语音识别失败: ${event.error}`
          setError(msg)
          onError?.(msg)
        }

        recognition.onend = () => {
          setIsRecording(false)
          setIsProcessing(false)
          onEnd?.()
        }

        browserRecognitionRef.current = recognition
        recognition.start()
        return
      } catch (err) {
        const msg = err instanceof Error ? err.message : '浏览器语音识别启动失败'
        setError(msg)
        onError?.(msg)
        setIsRecording(false)
        onEnd?.()
        return
      }
    }

    try {
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
          // 直接使用 webm/opus 压缩格式上传（体积仅 WAV 的 1/10，大幅提速）
          const webmBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

          // 首先尝试服务器端ASR（直接上传 webm）
          try {
            await tryServerASR(webmBlob, 'webm')
          } catch (firstErr) {
            // 如果是格式不支持错误，回退转 WAV 重试
            const errMsg = firstErr instanceof Error ? firstErr.message : ''
            if (errMsg.includes('格式不支持') || errMsg.includes('format') || errMsg.includes('InvalidParameter')) {
              console.warn('webm 格式不被支持，回退转 WAV 重试...')
              try {
                const wavBlob = await convertBlobToWav(webmBlob)
                await tryServerASR(wavBlob, 'wav')
              } catch (retryErr) {
                throw retryErr
              }
            } else {
              throw firstErr
            }
          }

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
  const tryServerASR = async (audioBlob: Blob, format: 'webm' | 'wav' = 'webm') => {
    const formData = new FormData()
    formData.append('audio', audioBlob, `recording.${format}`)
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
    // 停止浏览器原生语音识别
    if (browserRecognitionRef.current) {
      try {
        browserRecognitionRef.current.stop()
      } catch { /* ignore */ }
      browserRecognitionRef.current = null
    }

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