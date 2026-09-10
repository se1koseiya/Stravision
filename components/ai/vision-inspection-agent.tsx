"use client"

import React, { memo, useMemo } from "react"
import { Card, Progress, Steps, Tag, Typography } from "antd"
import {
  CameraOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons"
import dynamic from "next/dynamic"

const { Text } = Typography

// 动态导入 LiveStreamPlayer（避免 SSR 问题）
const LiveStreamPlayer = dynamic(
  () => import("@/components/live-stream-player").then((mod) => mod.LiveStreamPlayer),
  { ssr: false }
)

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export interface VisionInspectionAgentProps {
  /** 是否正在巡检 */
  isActive: boolean
  /** 当前状态文本（来自 visionInspectionStatus 或 inspectionStatus） */
  status: string
  /** 摄像头播放地址 */
  cameraUrl: string | null
  /** 当前摄像头 ID */
  cameraId: 'a' | 'b'
  /** 视频元素 ID（用于截图抓帧，必须与 page.tsx 中 getElementById 一致） */
  videoElementId: string
  /** 已捕获的图片 base64（可选，用于展示） */
  capturedImage?: string | null
  /** 暗色模式（由 ConfigProvider 接管，此处仅用于黑色背景视频区） */
  darkMode?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// 步骤定义（与 antd Steps 对齐）
// ---------------------------------------------------------------------------

type StepKey = "init" | "move" | "connect" | "capture" | "analyze" | "done"

const STEP_ITEMS: { key: StepKey; title: string; description: string }[] = [
  { key: "init", title: "初始化巡检", description: "准备巡检任务" },
  { key: "move", title: "云台定位", description: "移动摄像头到目标位置" },
  { key: "connect", title: "建立连接", description: "连接摄像头视频流" },
  { key: "capture", title: "画面捕捉", description: "截取实时画面帧" },
  { key: "analyze", title: "AI 视觉分析", description: "VLM 多模态分析中" },
  { key: "done", title: "巡检完成", description: "分析结果已生成" },
]

/** 根据状态文本推断当前步骤 */
function inferStep(status: string): StepKey {
  if (!status) return "init"
  // 注意顺序：「完成」必须最先判断，否则「巡检完成，已捕获…」会被下面的「捕获」命中
  if (status.includes("完成")) return "done"
  if (status.includes("分析") || status.includes("AI") || status.includes("发送")) return "analyze"
  // 抓帧中 / 已抓到
  if (
    status.includes("已捕获") ||
    status.includes("捕捉到") ||
    status.includes("截取") ||
    status.includes("截图") ||
    status.includes("捕捉") ||
    status.includes("解码") ||
    status.includes("稳定") ||
    status.includes("优化")
  ) {
    return "capture"
  }
  // 建连：等待播放器挂载、缓冲画面数据、重试
  if (
    status.includes("连接") ||
    status.includes("获取") ||
    status.includes("缓冲") ||
    status.includes("挂载") ||
    status.includes("重试") ||
    status.includes("等待")
  ) {
    return "connect"
  }
  if (status.includes("移动") || status.includes("云台")) return "move"
  if (status.includes("初始化")) return "init"
  return "init"
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

function VisionInspectionAgentImpl({
  isActive,
  status,
  cameraUrl,
  cameraId,
  videoElementId,
  capturedImage,
  darkMode = false,
  className,
}: VisionInspectionAgentProps) {
  const currentStep = useMemo(() => inferStep(status), [status])
  const currentIndex = STEP_ITEMS.findIndex((s) => s.key === currentStep)

  // 抓帧期间绝不能卸载 <video>：一旦卸载，抓帧逻辑就永远等不到元素，
  // 只能白白耗到超时。因此只要在抓到图之前，摄像头常驻挂载。
  const showCaptured = !!capturedImage
  const showCamera = !!cameraUrl && !showCaptured

  // 关键：LiveStreamPlayer 的 useEffect 依赖 sources。
  // 若每次渲染都传入新的数组字面量，播放器会被反复 destroy + 重建，
  // 流永远缓冲不完 —— 这正是「摄像头加载超时」的根因。
  const sources = useMemo(
    () => (cameraUrl ? [{ src: cameraUrl }] : []),
    [cameraUrl]
  )

  const progress = Math.round(((currentIndex + 1) / STEP_ITEMS.length) * 100)
  const isDone = currentStep === "done"
  const isAnalyzing = currentStep === "analyze"

  return (
    <Card
      className={className}
      styles={{ body: { padding: 16 } }}
      style={{ maxWidth: 640, margin: "12px auto" }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CameraOutlined style={{ color: "#1677ff" }} />
          <Text strong>视觉巡检</Text>
          {isActive && !isDone && (
            <Tag color="processing" style={{ marginInlineStart: 4 }}>
              进行中
            </Tag>
          )}
          {isDone && (
            <Tag color="success" style={{ marginInlineStart: 4 }}>
              已完成
            </Tag>
          )}
        </div>
      }
      extra={
        <Progress
          type="circle"
          percent={progress}
          size={40}
          strokeColor="#1677ff"
          format={(p) => `${p}%`}
        />
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* 摄像头 / 截图预览 */}
        {showCamera && cameraUrl && (
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16 / 9",
              background: "#000",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <LiveStreamPlayer
              id={videoElementId}
              sources={sources}
              autoplay
              muted
              controls={false}
              className="w-full h-full object-cover"
            />
            <Tag
              color="processing"
              style={{ position: "absolute", top: 8, left: 8, margin: 0 }}
            >
              LIVE · CAM {cameraId.toUpperCase()}
            </Tag>
          </div>
        )}

        {showCaptured && capturedImage && (
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16 / 9",
              background: "#000",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <img
              src={capturedImage}
              alt="巡检截图"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
            <Tag
              color="success"
              style={{ position: "absolute", top: 8, left: 8, margin: 0 }}
            >
              已捕获
            </Tag>
          </div>
        )}

        {/* 步骤时间线 */}
        <Steps
          size="small"
          direction="vertical"
          current={currentIndex}
          status={isDone ? "finish" : "process"}
          items={STEP_ITEMS.map((s, i) => {
            const isCurrent = i === currentIndex
            const isFinished = i < currentIndex
            return {
              title: s.title,
              description: isCurrent && status ? status : s.description,
              icon:
                isCurrent && !isDone ? (
                  <LoadingOutlined />
                ) : isFinished || isDone ? (
                  <CheckCircleOutlined />
                ) : undefined,
            }
          })}
        />

        {/* 实时状态文本 */}
        {status && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              background: isDone
                ? "rgba(82, 196, 26, 0.08)"
                : isAnalyzing
                  ? "rgba(114, 46, 209, 0.08)"
                  : "rgba(22, 119, 255, 0.08)",
            }}
          >
            <Text
              type="secondary"
              style={{
                fontSize: 12,
                color: isDone
                  ? "#52c41a"
                  : isAnalyzing
                    ? "#722ed1"
                    : "#1677ff",
              }}
            >
              {isDone ? <CheckCircleOutlined style={{ marginInlineEnd: 6 }} /> : <LoadingOutlined style={{ marginInlineEnd: 6 }} />}
              {status}
            </Text>
          </div>
        )}
      </div>
    </Card>
  )
}

// 巡检过程中 status 会高频更新，memo 避免无关的父级渲染波及播放器子树
export const VisionInspectionAgent = memo(VisionInspectionAgentImpl)

export default VisionInspectionAgent
