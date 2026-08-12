"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { chatClient } from "@/lib/chat/chat-client"

/**
 * 语音录制 hook
 *
 * - startRecording() / stopRecording() / cancelRecording()
 * - stopRecording: 录制完成后自动上传到 /api/chat/upload 并触发 onAudioReady(url)
 * - cancelRecording: 丢弃当前录音
 */
export function useVoiceRecorder({
  onAudioReady,
  onError
}: {
  onAudioReady: (url: string) => void
  onError: (msg: string) => void
}) {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" })
        try {
          const r = await chatClient.uploadFile(file)
          if (r.ok && r.url) {
            onAudioReady(r.url)
          } else {
            onError(r.error || "上传失败")
          }
        } catch (err) {
          console.error("[useVoiceRecorder] upload error", err)
          onError("上传失败")
        }
        cleanup()
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch (err) {
      console.error("[useVoiceRecorder] start error", err)
      onError("无法访问麦克风")
    }
  }, [onAudioReady, onError, cleanup])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== "inactive") {
      recorder.stop()
    }
    setIsRecording(false)
  }, [])

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== "inactive") {
      // 移除 onstop 回调，避免取消后仍上传
      recorder.onstop = null
      recorder.stop()
    }
    cleanup()
    setIsRecording(false)
  }, [cleanup])

  return {
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording
  }
}
