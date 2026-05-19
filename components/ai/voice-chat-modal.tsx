"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Mic, MicOff, Volume2, VolumeX, X, Loader2, Phone, PhoneOff } from "lucide-react"
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition"
import { useSpeechSynthesis } from "@/lib/hooks/use-speech-synthesis"
import { cn } from "@/lib/utils"

interface VoiceChatModalProps {
  open: boolean
  onClose: () => void
  onSendMessage: (text: string) => Promise<string>
  aiSettings?: {
    apiKey: string
    apiUrl: string
    model: string
    systemPrompt: string
  } | null
}

export function VoiceChatModal({ open, onClose, onSendMessage, aiSettings }: VoiceChatModalProps) {
  const [isActive, setIsActive] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: "user" | "ai"; text: string }>>([])
  
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTranscriptRef = useRef("")

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported: speechRecognitionSupported,
    error: recognitionError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    lang: "zh-CN",
    continuous: true,
    interimResults: true,
  })

  const {
    isSpeaking,
    isSupported: speechSynthesisSupported,
    speak,
    cancel: cancelSpeech,
  } = useSpeechSynthesis({
    lang: "zh-CN",
    rate: 1.1,
  })

  // Handle transcript changes - detect silence and send message
  useEffect(() => {
    if (!isActive || isProcessing) return

    const fullTranscript = transcript + interimTranscript
    setCurrentTranscript(fullTranscript)

    // Clear previous timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
    }

    // If we have new transcript content, set a timeout to detect end of speech
    if (transcript && transcript !== lastTranscriptRef.current) {
      silenceTimeoutRef.current = setTimeout(async () => {
        if (transcript && transcript.trim()) {
          lastTranscriptRef.current = transcript
          await handleSendVoiceMessage(transcript.trim())
        }
      }, 1500) // 1.5 seconds of silence triggers send
    }

    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
    }
  }, [transcript, interimTranscript, isActive, isProcessing])

  const handleSendVoiceMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return

    setIsProcessing(true)
    stopListening()
    
    // Add user message to history
    setConversationHistory(prev => [...prev, { role: "user", text }])
    setCurrentTranscript("")
    resetTranscript()

    try {
      const response = await onSendMessage(text)
      
      // Clean response for speech (remove markdown, special tags, etc.)
      const cleanResponse = cleanTextForSpeech(response)
      setAiResponse(cleanResponse)
      
      // Add AI response to history
      setConversationHistory(prev => [...prev, { role: "ai", text: cleanResponse }])

      // Speak the response if not muted
      if (!isMuted && cleanResponse) {
        speak(cleanResponse)
      }
    } catch (error) {
      console.error("Voice chat error:", error)
      const errorMsg = "抱歉，处理您的请求时出现了问题"
      setAiResponse(errorMsg)
      if (!isMuted) speak(errorMsg)
    } finally {
      setIsProcessing(false)
      // Resume listening after AI finishes speaking
      if (isActive && !isSpeaking) {
        setTimeout(() => {
          if (isActive) startListening()
        }, 500)
      }
    }
  }

  // Resume listening after AI finishes speaking
  useEffect(() => {
    if (isActive && !isSpeaking && !isProcessing && !isListening) {
      const timer = setTimeout(() => {
        if (isActive && !isSpeaking && !isProcessing) {
          startListening()
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isSpeaking, isActive, isProcessing, isListening])

  const cleanTextForSpeech = (text: string): string => {
    return text
      // Remove markdown code blocks
      .replace(/```[\s\S]*?```/g, "代码块已省略")
      // Remove inline code
      .replace(/`[^`]+`/g, "")
      // Remove special XML-like tags
      .replace(/<[A-Z_]+[^>]*>[\s\S]*?<\/[A-Z_]+>/g, "")
      .replace(/<[A-Z_]+[^>]*\/>/g, "")
      // Remove markdown links
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove markdown formatting
      .replace(/[*_~]+/g, "")
      // Remove headers
      .replace(/^#+\s*/gm, "")
      // Clean up extra whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  }

  const handleStartConversation = () => {
    setIsActive(true)
    setConversationHistory([])
    setCurrentTranscript("")
    setAiResponse("")
    resetTranscript()
    startListening()
  }

  const handleEndConversation = () => {
    setIsActive(false)
    stopListening()
    cancelSpeech()
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
    }
  }

  const handleClose = () => {
    handleEndConversation()
    onClose()
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (!isMuted && isSpeaking) {
      cancelSpeech()
    }
  }

  if (!open) return null

  const isNotSupported = !speechRecognitionSupported || !speechSynthesisSupported

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-gradient-to-b from-zinc-900 to-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-8 flex flex-col items-center min-h-[500px]">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">语音对话</h2>
            <p className="text-white/60 text-sm">
              {isNotSupported 
                ? "您的浏览器不支持语音功能" 
                : isActive 
                  ? "正在聆听..." 
                  : "点击开始与 AI 助手对话"}
            </p>
          </div>

          {/* Voice Visualization */}
          <div className="relative flex-1 flex items-center justify-center w-full">
            {/* Animated rings */}
            <div className={cn(
              "absolute inset-0 flex items-center justify-center",
              isActive && "animate-pulse"
            )}>
              {isActive && (
                <>
                  <div className={cn(
                    "absolute w-48 h-48 rounded-full border-2 transition-all duration-300",
                    isListening 
                      ? "border-primary/40 animate-ping" 
                      : isSpeaking 
                        ? "border-blue-500/40 animate-ping"
                        : "border-white/20"
                  )} />
                  <div className={cn(
                    "absolute w-36 h-36 rounded-full border-2 transition-all duration-500",
                    isListening 
                      ? "border-primary/60" 
                      : isSpeaking 
                        ? "border-blue-500/60"
                        : "border-white/30"
                  )} />
                </>
              )}
            </div>

            {/* Main button */}
            <button
              onClick={isActive ? handleEndConversation : handleStartConversation}
              disabled={isNotSupported || isProcessing}
              className={cn(
                "relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                isNotSupported
                  ? "bg-gray-700 cursor-not-allowed"
                  : isActive
                    ? isListening
                      ? "bg-gradient-to-br from-primary to-primary hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/30"
                      : isSpeaking
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30"
                        : isProcessing
                          ? "bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/30"
                          : "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-red-500/30"
                    : "bg-gradient-to-br from-primary to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/30"
              )}
            >
              {isProcessing ? (
                <Loader2 size={40} className="text-white animate-spin" />
              ) : isActive ? (
                isListening ? (
                  <Mic size={40} className="text-white" />
                ) : isSpeaking ? (
                  <Volume2 size={40} className="text-white animate-pulse" />
                ) : (
                  <PhoneOff size={40} className="text-white" />
                )
              ) : (
                <Phone size={40} className="text-white" />
              )}
            </button>
          </div>

          {/* Status & Transcript */}
          <div className="w-full mt-8 space-y-4">
            {/* Current transcript */}
            {isActive && (currentTranscript || interimTranscript) && (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs text-white/50 uppercase tracking-wide">您说</span>
                </div>
                <p className="text-white/90 text-sm leading-relaxed">
                  {currentTranscript || interimTranscript}
                </p>
              </div>
            )}

            {/* AI Response */}
            {isActive && aiResponse && (
              <div className="bg-blue-500/10 rounded-2xl p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isSpeaking ? "bg-blue-500 animate-pulse" : "bg-blue-500/50"
                  )} />
                  <span className="text-xs text-blue-400/70 uppercase tracking-wide">AI 回复</span>
                </div>
                <p className="text-white/90 text-sm leading-relaxed line-clamp-4">
                  {aiResponse}
                </p>
              </div>
            )}

            {/* Error message */}
            {recognitionError && (
              <div className="bg-red-500/10 rounded-2xl p-4 border border-red-500/20">
                <p className="text-red-400 text-sm">{recognitionError}</p>
              </div>
            )}
          </div>

          {/* Controls */}
          {isActive && (
            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={toggleMute}
                className={cn(
                  "p-3 rounded-full transition-colors",
                  isMuted 
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                    : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                )}
                title={isMuted ? "取消静音" : "静音 AI 语音"}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>
          )}

          {/* Instructions */}
          {!isActive && !isNotSupported && (
            <div className="mt-6 text-center">
              <p className="text-white/40 text-xs">
                点击上方按钮开始语音对话<br />
                说完后稍等片刻，AI 会自动回复
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
