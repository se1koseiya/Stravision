"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import {
  Camera, CameraOff, ChevronLeft, ChevronRight, Square,
  ScanLine, Send, Loader2, CheckCircle2, XCircle,
  Video, VideoOff, RotateCcw, Zap, Eye
} from 'lucide-react'
import { Button, Tooltip, message } from 'antd'
import { cn } from '@/lib/utils'

// 动态导入 LiveStreamPlayer（避免 SSR 问题）
const LiveStreamPlayer = dynamic(
  () => import('@/components/live-stream-player').then((mod) => mod.LiveStreamPlayer),
  { ssr: false }
)

// ====== 类型定义 ======

interface VisionInspectionCardProps {
  onCaptureAndAnalyze?: (imageBase64: string, query?: string) => void
  onCameraControl?: (direction: number) => Promise<void>
  className?: string
}

interface CameraInfo {
  id: 'a' | 'b'
  name: string
  url: string | null
  available: boolean
}

// ====== 子组件实现 ======

/** 视觉巡检头部 */
function VisionHeader({ title, status }: { title?: string; status?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500/8 to-amber-500/8 border border-orange-200/40 dark:border-orange-500/15"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20">
          <Eye size={18} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">{title || 'AI 视觉巡检'}</h3>
          {status && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              {status}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300">
          LIVE
        </span>
      </div>
    </motion.div>
  )
}

/** 摄像头画面视图 */
function CameraView({
  cameraUrl,
  isActive,
  isMuted,
  onToggleMute,
  videoId,
}: {
  cameraUrl: string | null
  isActive: boolean
  isMuted: boolean
  onToggleMute: () => void
  videoId: string
}) {
  if (!cameraUrl || !isActive) {
    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 flex items-center justify-center border border-zinc-700/50">
            <CameraOff size={28} className="text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-500 font-medium">
            {!cameraUrl ? '摄像头未配置' : '点击下方按钮启动巡检'}
          </p>
          <p className="text-xs text-zinc-600">请在后台设置摄像头地址</p>
        </div>
        {/* 网格背景 */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />
      </div>
    )
  }

  const sources = [{ src: cameraUrl }]

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black group">
      {/* 摄像头视频流 */}
      <LiveStreamPlayer
        id={videoId}
        sources={sources}
        autoplay
        muted={isMuted}
        controls={false}
        className="w-full h-full object-cover"
      />

      {/* 顶部状态栏 */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 flex items-start justify-between pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 pointer-events-auto">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[11px] font-bold text-white tracking-wider">REC</span>
        </div>

        {/* 静音切换 */}
        <button
          onClick={onToggleMute}
          className="p-2 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-black/50 transition-all pointer-events-auto"
        >
          {isMuted ? <VideoOff size={14} /> : <Video size={14} />}
        </button>
      </div>

      {/* 底部渐变 */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10" />

      {/* 角标装饰 */}
      <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-orange-400/60 rounded-tl-lg z-10" />
      <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-orange-400/60 rounded-tr-lg z-10" />
      <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-orange-400/60 rounded-bl-lg z-10" />
      <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-orange-400/60 rounded-br-lg z-10" />
    </div>
  )
}

/** PTZ 云台控制条 */
function PTZControls({
  onMoveLeft,
  onMoveRight,
  onStop,
  isMoving,
  disabled,
}: {
  onMoveLeft: () => void
  onMoveRight: () => void
  onStop: () => void
  isMoving: boolean
  disabled?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-white/5"
    >
      <Tooltip title="云台左移">
        <button
          onMouseDown={onMoveLeft}
          onMouseUp={onStop}
          onMouseLeave={onStop}
          onTouchStart={onMoveLeft}
          onTouchEnd={onStop}
          disabled={disabled}
          className={cn(
            "flex items-center justify-center w-11 h-11 rounded-xl transition-all",
            "border border-zinc-200/60 dark:border-white/10",
            "bg-white dark:bg-zinc-800 shadow-sm",
            "hover:bg-orange-50 hover:border-orange-300 hover:shadow-md hover:shadow-orange-500/10",
            "active:scale-95 active:bg-orange-100",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          <ChevronLeft size={20} className={cn("transition-colors", isMoving === 'left' ? "text-orange-500" : "text-zinc-600")} />
        </button>
      </Tooltip>

      {/* 中间状态指示 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 min-w-[80px] justify-center">
        <Zap size={12} className={cn(
          "transition-colors",
          isMoving ? "text-orange-500 animate-pulse" : "text-zinc-400"
        )} />
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {isMoving ? (isMoving === 'left' ? '左移中...' : '右移中...') : '云台就绪'}
        </span>
      </div>

      <Tooltip title="云台右移">
        <button
          onMouseDown={onMoveRight}
          onMouseUp={onStop}
          onMouseLeave={onStop}
          onTouchStart={onMoveRight}
          onTouchEnd={onStop}
          disabled={disabled}
          className={cn(
            "flex items-center justify-center w-11 h-11 rounded-xl transition-all",
            "border border-zinc-200/60 dark:border-white/10",
            "bg-white dark:bg-zinc-800 shadow-sm",
            "hover:bg-orange-50 hover:border-orange-300 hover:shadow-md hover:shadow-orange-500/10",
            "active:scale-95 active:bg-orange-100",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          <ChevronRight size={20} className={cn("transition-colors", isMoving === 'right' ? "text-orange-500" : "text-zinc-600")} />
        </button>
      </Tooltip>
    </motion.div>
  )
}

/** 截图与分析面板 */
function CapturePanel({
  capturedImage,
  status,
  onCapture,
  onSendToAI,
  onClearCapture,
  isCapturing,
  isAnalyzing,
}: {
  capturedImage: string | null
  status: string
  onCapture: () => void
  onSendToAI: () => void
  onClearCapture: () => void
  isCapturing: boolean
  isAnalyzing: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-zinc-200/50 dark:border-white/5 bg-white dark:bg-zinc-900/80 overflow-hidden"
    >
      {/* 截图预览区 */}
      <div className="relative">
        {capturedImage ? (
          <div className="relative aspect-video bg-black rounded-t-2xl overflow-hidden">
            <img
              src={capturedImage}
              alt="巡检截图"
              className="w-full h-full object-contain"
            />
            {/* 截图角标 */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-emerald-500/90 backdrop-blur-sm flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-white" />
              <span className="text-[11px] font-bold text-white">已捕获</span>
            </div>
            {/* 清除按钮 */}
            <button
              onClick={onClearCapture}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/70 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="aspect-video rounded-t-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 flex flex-col items-center justify-center gap-3 border-b border-dashed border-zinc-200/60 dark:border-white/5">
            <ScanLine size={32} className="text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-400 font-medium">等待截图</p>
            <p className="text-xs text-zinc-400">点击下方按钮捕捉摄像头画面</p>
          </div>
        )}
      </div>

      {/* 操作按钮区 */}
      <div className="p-4 flex items-center gap-3">
        <button
          onClick={onCapture}
          disabled={isCapturing || isAnalyzing}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all",
            "border border-orange-300/60 dark:border-orange-500/25",
            "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300",
            "hover:bg-orange-100 dark:hover:bg-orange-500/20 hover:shadow-md hover:shadow-orange-500/10",
            "active:scale-[0.98]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isCapturing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              截图中...
            </>
          ) : (
            <>
              <Camera size={16} />
              截取当前帧
            </>
          )}
        </button>

        <button
          onClick={onSendToAI}
          disabled={!capturedImage || isAnalyzing}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all",
            capturedImage && !isAnalyzing
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-[0.98]"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
          )}
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              AI 分析中...
            </>
          ) : (
            <>
              <Send size={16} />
              发送给 AI 分析
            </>
          )}
        </button>
      </div>

      {/* 状态文字 */}
      {status && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
            <Loader2 size={12} className={cn("animate-spin", status.includes('完成') || status.includes('失败') ? "hidden" : "")} />
            {status.includes('失败') ? (
              <XCircle size={12} className="text-red-500 shrink-0" />
            ) : status.includes('完成') ? (
              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
            ) : null}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{status}</p>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ====== 主组件 ======

export function VisionInspectionCard({
  onCaptureAndAnalyze,
  onCameraControl,
  className,
}: VisionInspectionCardProps) {
  // 状态
  const [isActive, setIsActive] = useState(false)
  const [cameras, setCameras] = useState<CameraInfo[]>([
    { id: 'a', name: '温室摄像头 A', url: null, available: false },
    { id: 'b', name: '温室摄像头 B', url: null, available: false },
  ])
  const [selectedCameraId, setSelectedCameraId] = useState<'a' | 'b'>('a')
  const [cameraStatus, setCameraStatus] = useState('')
  const [isMuted, setIsMuted] = useState(true)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [captureStatus, setCaptureStatus] = useState('')
  const [isCapturing, setIsCapturing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [movingDirection, setMovingDirection] = useState<'left' | 'right' | null>(null)

  const moveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoId = `vision-inspect-camera`

  // 加载摄像头信息
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const res = await fetch('/api/ai/camera-capture')
        if (res.ok) {
          const data = await res.json()
          setCameras([
            {
              id: 'a',
              name: data.cameras?.a?.name || '温室摄像头 A',
              url: data.cameras?.a?.available ? data.cameras?.a?.url : null,
              available: !!data.cameras?.a?.available,
            },
            {
              id: 'b',
              name: data.cameras?.b?.name || '温室摄像头 B',
              url: data.cameras?.b?.available ? data.cameras?.b?.url : null,
              available: !!data.cameras?.b?.available,
            },
          ])
        }
      } catch (e) {
        console.error('[VisionInspection] Failed to load cameras:', e)
      }
    }
    loadCameras()
  }, [])

  // 获取当前选中摄像头的 URL
  const currentCameraUrl = cameras.find(c => c.id === selectedCameraId)?.url ?? null

  // 启动巡检
  const startInspection = useCallback(async () => {
    if (!currentCameraUrl) {
      message.warning('当前摄像头未配置')
      return
    }
    setIsActive(true)
    setCameraStatus('正在连接摄像头...')
  }, [currentCameraUrl])

  // 停止巡检
  const stopInspection = useCallback(() => {
    setIsActive(false)
    setCameraStatus('')
    setCapturedImage(null)
    setCaptureStatus('')
  }, [])

  // PTZ 控制 - 左移
  const handleMoveLeft = useCallback(async () => {
    setMovingDirection('left')
    try {
      await onCameraControl?.(1) // 1=左移
    } catch (e) {
      console.error('[VisionInspection] Move left failed:', e)
    }
  }, [onCameraControl])

  // PTZ 控制 - 右移
  const handleMoveRight = useCallback(async () => {
    setMovingDirection('right')
    try {
      await onCameraControl?.(2) // 2=右移
    } catch (e) {
      console.error('[VisionInspection] Move right failed:', e)
    }
  }, [onCameraControl])

  // 停止移动
  const handleStopMove = useCallback(async () => {
    setMovingDirection(null)
    try {
      await onCameraControl?.(0) // 0=停止
    } catch (e) {
      console.error('[VisionInspection] Stop failed:', e)
    }
  }, [onCameraControl])

  // 截图
  const handleCapture = useCallback(() => {
    if (isCapturing) return
    setIsCapturing(true)
    setCaptureStatus('正在截取画面...')

    setTimeout(() => {
      const video = document.getElementById(videoId) as HTMLVideoElement | null
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth || 640
          canvas.height = video.videoHeight || 480
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
            setCapturedImage(dataUrl)
            setCaptureStatus('截图成功！可发送给 AI 分析')
          } else {
            throw new Error('Canvas context 创建失败')
          }
        } catch (err: any) {
          setCaptureStatus(`截图失败：${err.message}`)
        }
      } else {
        setCaptureStatus('截图失败：视频尚未加载完成，请稍后再试')
      }
      setIsCapturing(false)
    }, 300)
  }, [isCapturing, videoId])

  // 发送给 AI 分析
  const handleSendToAI = useCallback(() => {
    if (!capturedImage || isAnalyzing) return
    setIsAnalyzing(true)
    setCaptureStatus('正在发送给 AI 进行视觉分析...')

    // 延迟调用，让用户看到状态变化
    setTimeout(() => {
      onCaptureAndAnalyze?.(capturedImage, '请描述你在画面中看到的内容，包括植物状态、环境情况、是否有异常等。')
      setCaptureStatus('已发送，等待 AI 回复...')
      setIsAnalyzing(false)
    }, 500)
  }, [capturedImage, isAnalyzing, onCaptureAndAnalyze])

  // 清除截图
  const handleClearCapture = useCallback(() => {
    setCapturedImage(null)
    setCaptureStatus('')
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn("my-6 w-full max-w-3xl", className)}
    >
      {/* Header */}
      <VisionHeader
        title="AI 视觉巡检"
        status={cameraStatus || (isActive ? '巡检进行中' : '')}
      />

      {/* 摄像头画面 */}
      <CameraView
        cameraUrl={currentCameraUrl}
        isActive={isActive}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        videoId={videoId}
      />

      {/* PTZ 云台控制 */}
      <PTZControls
        onMoveLeft={handleMoveLeft}
        onMoveRight={handleMoveRight}
        onStop={handleStopMove}
        isMoving={movingDirection}
        disabled={!isActive}
      />

      {/* 截图与分析面板 */}
      <CapturePanel
        capturedImage={capturedImage}
        status={captureStatus}
        onCapture={handleCapture}
        onSendToAI={handleSendToAI}
        onClearCapture={handleClearCapture}
        isCapturing={isCapturing}
        isAnalyzing={isAnalyzing}
      />

      {/* 底部操作栏 */}
      <div className="mt-4 flex items-center justify-between px-2">
        {/* 摄像头选择器 */}
        <div className="flex items-center gap-2">
          {cameras.map((cam) => (
            <button
              key={cam.id}
              onClick={() => setSelectedCameraId(cam.id)}
              disabled={!cam.available}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                selectedCameraId === cam.id
                  ? "bg-orange-50 dark:bg-orange-500/15 border-orange-300/60 dark:border-orange-500/30 text-orange-700 dark:text-orange-300"
                  : cam.available
                    ? "bg-white dark:bg-zinc-800 border-zinc-200/60 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-orange-200"
                    : "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-white/5 text-zinc-300 dark:text-zinc-600 cursor-not-allowed opacity-50"
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  cam.available ? (selectedCameraId === cam.id ? "bg-orange-500" : "bg-emerald-500") : "bg-zinc-300"
                )} />
                {cam.name}
              </span>
            </button>
          ))}
        </div>

        {/* 主开关 */}
        <button
          onClick={isActive ? stopInspection : startInspection}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm",
            isActive
              ? "bg-red-500/10 text-red-600 border border-red-200/60 hover:bg-red-500/20"
              : currentCameraUrl
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.98]"
                : "bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed"
          )}
          disabled={!currentCameraUrl && !isActive}
        >
          {isActive ? (
            <>
              <Square size={14} />
              结束巡检
            </>
          ) : (
            <>
              <Eye size={14} />
              开始巡检
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}

export default VisionInspectionCard
