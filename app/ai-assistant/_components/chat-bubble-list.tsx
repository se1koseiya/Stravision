"use client"

import React, { useRef, useState, type ReactNode } from "react"
import { AnimatePresence } from "framer-motion"
import { Bubble, Actions } from "@ant-design/x"
import type { ActionsFeedbackProps, ActionsItemProps } from "@ant-design/x"
import type { BubbleListProps } from "@ant-design/x"
import { Pagination, message } from "antd"
import { CheckOutlined, ShareAltOutlined } from "@ant-design/icons"
import { Zap, X } from "lucide-react"
import XMarkdown from "@ant-design/x-markdown"
import BerryOrb from "@/components/smoothui/berry-orb"
import type { Message } from "@/app/ai-assistant/types"
import { ChatMessageRenderer } from "@/app/ai-assistant/_components/chat-message-renderer"
import { AgentThoughtChain } from "@/app/ai-assistant/_components/agent-thought-chain"
import type { AgentStep } from "@/app/ai-assistant/_components/agent-thought-chain"
import { VisionInspectionAgent } from "@/components/ai/vision-inspection-agent"
import { MemorySummaryCard } from "@/app/ai-assistant/_components/memory-summary-card"

// ---------------------------------------------------------------------------
// Per-bubble actions component (own state for feedback/pagination/share/audio)
// ---------------------------------------------------------------------------

function BubbleActions({ content, onSpeak }: { content: string; onSpeak?: (text: string) => void }) {
  const [curPage, setCurPage] = useState(1)
  const [feedbackStatus, setFeedbackStatus] = useState<ActionsFeedbackProps["value"]>("default")
  const [shareStatus, setShareStatus] = useState<ActionsItemProps["status"]>("default")
  const [audioStatus, setAudioStatus] = useState<ActionsItemProps["status"]>("default")

  const toggleShare = () => {
    setShareStatus((prev) => (prev === "default" ? "running" : "default"))
  }

  return (
    <Actions
      items={[
        {
          key: "pagination",
          actionRender: () => (
            <Pagination simple current={curPage} onChange={setCurPage} total={5} pageSize={1} />
          ),
        },
        {
          key: "feedback",
          actionRender: () => (
            <Actions.Feedback
              value={feedbackStatus}
              styles={{ liked: { color: "#f759ab" } }}
              onChange={(val) => {
                setFeedbackStatus(val)
                message.success(`反馈: ${val}`)
              }}
            />
          ),
        },
        {
          key: "copy",
          label: "copy",
          actionRender: () => <Actions.Copy text={content} />,
        },
        {
          key: "audio",
          label: "audio",
          actionRender: () => (
            <Actions.Audio
              onClick={() => {
                if (onSpeak) {
                  setAudioStatus("running")
                  onSpeak(content)
                  setTimeout(() => setAudioStatus("default"), 2000)
                }
              }}
              status={audioStatus}
            />
          ),
        },
        {
          key: "share",
          label: "share",
          actionRender: () => (
            <Actions.Item
              onClick={toggleShare}
              label={shareStatus}
              status={shareStatus}
              defaultIcon={<ShareAltOutlined />}
              runningIcon={<CheckOutlined />}
            />
          ),
        },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// 解析消息中的 [tool:xxx] 标记，渲染为 skill 标签
// ---------------------------------------------------------------------------

function parseToolTag(content: string): { cleanText: string; toolName: string | null } {
  const match = content.match(/\s*\[tool:([^\]]+)\]\s*$/)
  if (match) {
    return { cleanText: content.slice(0, match.index).trimEnd(), toolName: match[1] }
  }
  return { cleanText: content, toolName: null }
}

function ToolSkillTag({ toolName }: { toolName: string }) {
  // 将 snake_case 转为可读名称
  const displayName = toolName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium mb-2">
      <Zap size={12} />
      <span>{displayName}</span>
    </div>
  )
}

export interface ChatBubbleListProps {
  messages: Message[]
  isLoading: boolean
  agentSteps: AgentStep[]
  agentStatus: string
  /** 是否显示思考链（由父组件控制可见性 + 自动隐藏） */
  showThoughtChain?: boolean
  onThoughtChainHoverStart?: () => void
  onThoughtChainHoverEnd?: () => void
  rendererProps: Omit<React.ComponentProps<typeof ChatMessageRenderer>, "msg">
  footerContent?: ReactNode
  onTtsSpeak?: (text: string) => void
  darkMode?: boolean
  /** 视觉巡检 Agent 显示状态 */
  visionInspection?: {
    isActive: boolean
    status: string
    cameraUrl: string | null
    cameraId: 'a' | 'b'
    videoElementId: string
    capturedImage?: string | null
  }
}

export function ChatBubbleList({
  messages,
  isLoading,
  agentSteps,
  agentStatus,
  showThoughtChain = true,
  onThoughtChainHoverStart,
  onThoughtChainHoverEnd,
  rendererProps,
  footerContent,
  onTtsSpeak,
  darkMode,
  visionInspection,
}: ChatBubbleListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  const filteredMessages = messages.filter((m) => !m.isSilent)
  // 🔥 历史记忆摘要（PAST_MEMORY）消息：单独抽出，用卡片组件渲染（不进入 Bubble.List）
  const isMemorySummary = (m: Message) =>
    m.role === "assistant" && typeof m.content === "string" && m.content.includes("<PAST_MEMORY>")

  const items: BubbleListProps["items"] = filteredMessages
    .filter((m) => !isMemorySummary(m))
    .map((msg, i) => {
      const isLast = i === filteredMessages.length - 1
      return {
        key: `${msg.role}-${i}`,
        role: (msg.role === "user" ? "user" : "ai") as string,
        content: typeof msg.content === "string" ? msg.content : "",
        loading: msg.role === "assistant" && isLast && isLoading && !msg.content,
        extraInfo: { message: msg, index: i, isLast },
      }
    })

  const role: BubbleListProps["role"] = {
    ai: {
      placement: "start" as const,
      variant: "outlined",
      className: "!max-w-[85%]",
      avatar: <BerryOrb size="36px" theme={darkMode ? 'dark' : 'light'} isActive={isLoading} />,
      footer: (content: unknown) => {
        const text = typeof content === "string" ? content : ""
        return <BubbleActions content={text} onSpeak={onTtsSpeak} />
      },
      contentRender: (_content: unknown, info: any) => {
        const msg = info?.extraInfo?.message as Message | undefined
        const isLastItem = info?.extraInfo?.isLast as boolean | undefined
        if (!msg) return null
        return (
          <div className="relative">
            <ChatMessageRenderer msg={msg} {...rendererProps} isStreaming={isLastItem && isLoading} />
          </div>
        )
      },
    },
    user: {
      placement: "end" as const,
      variant: "filled",
      shape: "round" as const,
      className: "!max-w-[75%]",
      contentRender: (_content: unknown, info: any) => {
        const msg = info?.extraInfo?.message as Message | undefined
        if (!msg) return null
        if (typeof msg.content === "string" && msg.content) {
          const { cleanText, toolName } = parseToolTag(msg.content)
          return (
            <div>
              {toolName && <ToolSkillTag toolName={toolName} />}
              <XMarkdown paragraphTag="div">{cleanText || msg.content}</XMarkdown>
            </div>
          )
        }
        return <ChatMessageRenderer msg={msg} {...rendererProps} />
      },
    },
  }

  // 抽取所有历史记忆摘要消息（按原始顺序）
  const memorySummaries = filteredMessages.filter(isMemorySummary)

  return (
    <div ref={listRef} data-lenis-prevent style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px 90px" }}>
        {/* 🔥 历史记忆摘要卡片（紧凑放在最前，区分于普通对话气泡） */}
        {memorySummaries.length > 0 && (
          <div className="mb-4 space-y-2">
            {memorySummaries.map((m, i) => (
              <MemorySummaryCard key={`memory-${i}`} content={m.content as string} />
            ))}
          </div>
        )}
        <Bubble.List items={items} role={role as any} />
        {visionInspection?.isActive && (
          <VisionInspectionAgent
            isActive={visionInspection.isActive}
            status={visionInspection.status}
            cameraUrl={visionInspection.cameraUrl}
            cameraId={visionInspection.cameraId}
            videoElementId={visionInspection.videoElementId}
            capturedImage={visionInspection.capturedImage}
            darkMode={darkMode}
          />
        )}
        {showThoughtChain && (agentSteps.length > 0 || (agentStatus && isLoading)) && (
          <div
            onMouseEnter={onThoughtChainHoverStart}
            onMouseLeave={onThoughtChainHoverEnd}
          >
            <AgentThoughtChain steps={agentSteps} isActive={isLoading} />
          </div>
        )}
        {footerContent && (
          <AnimatePresence mode="wait">{footerContent}</AnimatePresence>
        )}
      </div>
    </div>
  )
}
