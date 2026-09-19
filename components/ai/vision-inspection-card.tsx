"use client"

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { App, Button, Card, Segmented, Space, Tag, Tooltip, Typography } from 'antd'
import dynamic from 'next/dynamic'
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { IconCamera, IconDelete, IconLeft, IconPause, IconPower, IconRight, IconScan, IconSend } from "@/components/icon";

const { Text } = Typography

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

// ====== 主组件 ======

export function VisionInspectionCard({
  onCaptureAndAnalyze,
  onCameraControl,
  className,
}: VisionInspectionCardProps) {
  const { message } = App.useApp()

  // 状态
  const [isActive, setIsActive] = useState(false)
  const [cameras, setCameras] = useState<CameraInfo[]>([
    { id: 'a', name: '摄像头 A', url: null, available: false },
    { id: 'b', name: '摄像头 B', url: null, available: false },
  ])
  const [selectedCameraId, setSelectedCameraId] = useState<'a' | 'b'>('a')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [statusText, setStatusText] = useState('')
  const [isCapturing, setIsCapturing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [movingDirection, setMovingDirection] = useState<'left' | 'right' | null>(null)

  // PTZ 长按最大持续时间限制：防止鼠标松开事件丢失导致滑台持续移动撞击机械限位
  const PTZ_MAX_HOLD_MS = 10000 // 单次长按最多 10 秒
  const ptzAutoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const videoId = 'vision-inspect-camera'

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
              name: data.cameras?.a?.name || '摄像头 A',
              url: data.cameras?.a?.available ? data.cameras?.a?.url : null,
              available: !!data.cameras?.a?.available,
            },
            {
              id: 'b',
              name: data.cameras?.b?.name || '摄像头 B',
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

  const currentCameraUrl = cameras.find((c) => c.id === selectedCameraId)?.url ?? null

  // 启动 / 停止巡检
  const toggleInspection = useCallback(() => {
    if (isActive) {
      setIsActive(false)
      setStatusText('')
      setCapturedImage(null)
      return
    }
    if (!currentCameraUrl) {
      message.warning('当前摄像头未配置')
      return
    }
    setIsActive(true)
    setStatusText('正在连接摄像头…')
  }, [isActive, currentCameraUrl, message])

  // PTZ 控制
  const handleMove = useCallback(
    async (direction: 'left' | 'right') => {
      setMovingDirection(direction)
      // 清除上一次残留的自动停止定时器
      if (ptzAutoStopTimer.current) {
        clearTimeout(ptzAutoStopTimer.current)
        ptzAutoStopTimer.current = null
      }
      // 设定最大持续时长，超时自动停止，防止撞击机械限位
      ptzAutoStopTimer.current = setTimeout(() => {
        console.warn('[VisionInspection] PTZ hold exceeded max duration, auto-stopping')
        setMovingDirection(null)
        onCameraControl?.(0).catch(e => console.error('[VisionInspection] Auto-stop failed:', e))
        ptzAutoStopTimer.current = null
      }, PTZ_MAX_HOLD_MS)
      try {
        await onCameraControl?.(direction === 'left' ? 1 : 2)
      } catch (e) {
        console.error('[VisionInspection] Move failed:', e)
      }
    },
    [onCameraControl, PTZ_MAX_HOLD_MS]
  )

  const handleStopMove = useCallback(async () => {
    // 用户主动松开 → 清除自动停止定时器
    if (ptzAutoStopTimer.current) {
      clearTimeout(ptzAutoStopTimer.current)
      ptzAutoStopTimer.current = null
    }
    setMovingDirection(null)
    try {
      await onCameraControl?.(0)
    } catch (e) {
      console.error('[VisionInspection] Stop failed:', e)
    }
  }, [onCameraControl])

  // 截图
  const handleCapture = useCallback(() => {
    if (isCapturing) return
    setIsCapturing(true)
    setStatusText('正在截取画面…')

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
            setStatusText('截图完成，可发送给 AI 分析')
          } else {
            throw new Error('Canvas context 创建失败')
          }
        } catch (err: any) {
          setStatusText(`截图失败：${err.message}`)
        }
      } else {
        setStatusText('截图失败：视频尚未加载完成，请稍后再试')
      }
      setIsCapturing(false)
    }, 300)
  }, [isCapturing])

  // 发送给 AI 分析
  const handleSendToAI = useCallback(() => {
    if (!capturedImage || isAnalyzing) return
    setIsAnalyzing(true)
    setStatusText('正在发送给 AI 进行视觉分析…')

    setTimeout(() => {
      onCaptureAndAnalyze?.(
        capturedImage,
        '请描述你在画面中看到的内容，包括植物状态、环境情况、是否有异常等。'
      )
      setStatusText('已发送，等待 AI 回复…')
      setIsAnalyzing(false)
    }, 500)
  }, [capturedImage, isAnalyzing, onCaptureAndAnalyze])

  const handleClearCapture = useCallback(() => {
    setCapturedImage(null)
    setStatusText('')
  }, [])

  // 组件卸载时清理 PTZ 自动停止定时器，避免泄漏
  useEffect(() => {
    return () => {
      if (ptzAutoStopTimer.current) {
        clearTimeout(ptzAutoStopTimer.current)
        ptzAutoStopTimer.current = null
      }
    }
  }, [])

  // 摄像头选择选项
  const cameraOptions = cameras.map((cam) => ({
    label: (
      <Space size={6}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            display: 'inline-block',
            background: cam.available
              ? selectedCameraId === cam.id
                ? '#1677ff'
                : '#52c41a'
              : '#d9d9d9',
          }}
        />
        {cam.name}
      </Space>
    ),
    value: cam.id,
    disabled: !cam.available,
  }))

  return (
    <Card
      className={className}
      style={{
        background: BERRY_THEME.gradients.cardHero(BERRY_THEME.primary),
        borderColor: `${BERRY_THEME.primary}30`,
      }}
      styles={{ body: { padding: 16 } }}
      title={
        <Space size={8} align="center">
          <IconCamera style={{ color: BERRY_THEME.primary }} />
          <Text strong>视觉巡检</Text>
          {isActive && (
            <Tag color="processing" style={{ marginInlineStart: 4 }}>
              实时
            </Tag>
          )}
        </Space>
      }
      extra={
        <Button
          type={isActive ? 'default' : 'primary'}
          danger={isActive}
          icon={<IconPower />}
          onClick={toggleInspection}
          disabled={!currentCameraUrl && !isActive}
          size="small"
        >
          {isActive ? '结束' : '开始巡检'}
        </Button>
      }
      style={{ maxWidth: 720, margin: '16px auto' }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* 摄像头选择 */}
        <Segmented
          options={cameraOptions}
          value={selectedCameraId}
          onChange={(val) => setSelectedCameraId(val as 'a' | 'b')}
          block
        />

        {/* 视频画面 / 截图预览 */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            background: '#000',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {isActive && currentCameraUrl ? (
            <LiveStreamPlayer
              id={videoId}
              sources={[{ src: currentCameraUrl }]}
              autoplay
              muted
              controls={false}
              className="w-full h-full object-cover"
            />
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="巡检截图"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: 'rgba(255, 255, 255, 0.45)',
              }}
            >
              <IconCamera style={{ fontSize: 32 }} />
              <Text style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 13 }}>
                {!currentCameraUrl ? '摄像头未配置' : '点击「开始巡检」启动'}
              </Text>
            </div>
          )}

          {/* 截图角标 */}
          {capturedImage && (
            <Tag
              color="success"
              style={{ position: 'absolute', top: 8, left: 8, margin: 0 }}
            >
              已捕获
            </Tag>
          )}
        </div>

        {/* 操作区 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Tooltip title="云台左移（按住）">
            <Button
              icon={<IconLeft />}
              onMouseDown={() => handleMove('left')}
              onMouseUp={handleStopMove}
              onMouseLeave={handleStopMove}
              onTouchStart={() => handleMove('left')}
              onTouchEnd={handleStopMove}
              disabled={!isActive}
              loading={movingDirection === 'left'}
            />
          </Tooltip>
          <Tooltip title="停止">
            <Button
              icon={<IconPause />}
              onClick={handleStopMove}
              disabled={!movingDirection}
            />
          </Tooltip>
          <Tooltip title="云台右移（按住）">
            <Button
              icon={<IconRight />}
              onMouseDown={() => handleMove('right')}
              onMouseUp={handleStopMove}
              onMouseLeave={handleStopMove}
              onTouchStart={() => handleMove('right')}
              onTouchEnd={handleStopMove}
              disabled={!isActive}
              loading={movingDirection === 'right'}
            />
          </Tooltip>

          <span style={{ flex: 1 }} />

          <Button
            icon={<IconScan />}
            onClick={handleCapture}
            loading={isCapturing}
            disabled={!isActive || isAnalyzing}
          >
            截取当前帧
          </Button>

          {capturedImage && (
            <Button
              type="primary"
              icon={<IconSend />}
              onClick={handleSendToAI}
              loading={isAnalyzing}
            >
              发送给 AI
            </Button>
          )}
          {capturedImage && (
            <Tooltip title="清除截图">
              <Button
                icon={<IconDelete />}
                onClick={handleClearCapture}
                disabled={isAnalyzing}
              />
            </Tooltip>
          )}
        </div>

        {/* 状态文本 */}
        {statusText && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {statusText}
          </Text>
        )}
      </Space>
    </Card>
  )
}

export default VisionInspectionCard
