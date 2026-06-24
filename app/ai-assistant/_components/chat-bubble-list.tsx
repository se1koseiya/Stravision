"use client"

import React, { useRef, useState, type ReactNode } from "react"
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
  rendererProps: Omit<React.ComponentProps<typeof ChatMessageRenderer>, "msg">
  footerContent?: ReactNode
  onTtsSpeak?: (text: string) => void
  darkMode?: boolean
}

export function ChatBubbleList({
  messages,
  isLoading,
  agentSteps,
  agentStatus,
  rendererProps,
  footerContent,
  onTtsSpeak,
  darkMode,
}: ChatBubbleListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  const filteredMessages = messages.filter((m) => !m.isSilent)
  const items: BubbleListProps["items"] = filteredMessages.map((msg, i) => {
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

  return (
    <div ref={listRef} style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px 90px" }}>
        <Bubble.List items={items} role={role as any} />
        {(agentSteps.length > 0 || (agentStatus && isLoading)) && (
          <AgentThoughtChain steps={agentSteps} isActive={isLoading} />
        )}
        {footerContent}
      </div>
    </div>
  )
}
