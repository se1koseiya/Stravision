"use client"

import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { AnimatePresence } from "framer-motion"
import { Bubble, Actions } from "@ant-design/x"
import type { ActionsFeedbackProps, ActionsItemProps } from "@ant-design/x"
import type { BubbleListProps } from "@ant-design/x"
import { Pagination, message } from "antd"
import { CheckOutlined, ShareAltOutlined } from "@ant-design/icons"
import { Zap, X, CheckCircle2, ClipboardList, Wrench, XCircle, AlertCircle, ArrowDown, Loader2 } from "lucide-react"
import XMarkdown from "@ant-design/x-markdown"
import BerryOrb from "@/components/smoothui/berry-orb"
import { detectOrbExpression, type OrbExpression } from "@/lib/ai/orb-expression"
import type { Message } from "@/app/ai-assistant/types"
import { ChatMessageRenderer } from "@/app/ai-assistant/_components/chat-message-renderer"
import { AgentThoughtChain } from "@/app/ai-assistant/_components/agent-thought-chain"
import type { AgentStep } from "@/app/ai-assistant/_components/agent-thought-chain"
import { AIActionSummaryCard, type AIActionSummary } from "@/app/ai-assistant/_components/ai-action-summary"
import { VisionInspectionAgent } from "@/components/ai/vision-inspection-agent"
import { MemorySummaryCard } from "@/app/ai-assistant/_components/memory-summary-card"
import { DynamicTaskPlanner } from "@/app/ai-assistant/_components/dynamic-task-planner"
import { DecisionCard, parseDecisionTags, stripDecisionTags } from "@/components/ai/decision-card"
import { WorkingIndicator } from "@/app/ai-assistant/_components/working-indicator"
import {
  MessageNavDots,
  useMessageAnchors,
  extractPreview,
  type MessageNavItem,
} from "@/app/ai-assistant/_components/message-nav-dots"

// ---------------------------------------------------------------------------
// Per-bubble actions component (own state for feedback/pagination/share/audio)
// ---------------------------------------------------------------------------

/**
 * 气泡时间戳：显示在 BerryOrb 旁边，自动每分钟刷新
 * - 用于 AI 消息的 header 插槽
 */
function BubbleTime({ darkMode = false }: { darkMode?: boolean }) {
  const [now, setNow] = useState<string>(() => formatTime(Date.now()))

  useEffect(() => {
    setNow(formatTime(Date.now()))
    const timer = setInterval(() => setNow(formatTime(Date.now())), 30_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span
      className={[
        // 🔥 默认隐藏，hover 整条 AI 气泡时才出现
        "text-[12px] leading-none tabular-nums opacity-0 transition-opacity duration-200",
        "group-hover/ai-bubble:opacity-100",
        darkMode ? "text-zinc-500" : "text-zinc-400",
      ].join(" ")}
    >
      {now}
    </span>
  )
}

function formatTime(ts: number) {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

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

// ---------------------------------------------------------------------------
// 检查点确认回执：把用户提交表单/选择后发送的【检查点确认】...文本
// 从裸 markdown 列表渲染为简洁回执卡片
// ---------------------------------------------------------------------------

interface CheckpointReceipt {
  type: "form_submit" | "choice" | "cancel" | "provide_info" | "use_default"
  title?: string
  label?: string
  params?: { label: string; value: string }[]
}

function parseCheckpointReceipt(content: string): CheckpointReceipt | null {
  const text = content.trim()
  if (!text.startsWith("【检查点确认】")) return null

  // 已填写参数：{title}\n{params}\n请按这些参数继续执行。
  const formMatch = text.match(/^【检查点确认】已填写参数：([^\n]+)\n([\s\S]*?)(?:\n?请按这些参数继续执行。?\s*)?$/)
  if (formMatch) {
    const title = formMatch[1].trim()
    const paramsBlock = formMatch[2].trim()
    const params = paramsBlock
      .split("\n")
      .map(l => l.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean)
      .map(l => {
        const idx = l.search(/[:：]/)
        if (idx === -1) return { label: l, value: "" }
        return {
          label: l.slice(0, idx).trim(),
          value: l.slice(idx + 1).replace(/^[:：\s]+/, "").trim(),
        }
      })
      .filter(p => p.label)
    return { type: "form_submit", title, params }
  }

  const cancelMatch = text.match(/^【检查点确认】我选择取消操作：([^\n]+)/)
  if (cancelMatch) return { type: "cancel", title: cancelMatch[1].trim() }

  const provideMatch = text.match(/^【检查点确认】我选择提供信息后执行：([^\n]+)/)
  if (provideMatch) return { type: "provide_info", title: provideMatch[1].trim() }

  const defaultMatch = text.match(/^【检查点确认】我选择使用默认值继续：([^\n]+)/)
  if (defaultMatch) return { type: "use_default", title: defaultMatch[1].trim() }

  const choiceMatch = text.match(/^【检查点确认】我选择：([^\n]+)/)
  if (choiceMatch) return { type: "choice", label: choiceMatch[1].trim() }

  return { type: "choice", label: text.replace(/^【检查点确认】/, "").trim() }
}

const RECEIPT_STATUS: Record<CheckpointReceipt["type"], string> = {
  form_submit: "已提交表单",
  choice: "已选择",
  cancel: "已取消",
  provide_info: "选择提供信息",
  use_default: "选择使用默认值",
}

function CheckpointReceiptCard({ content }: { content: string }) {
  const receipt = parseCheckpointReceipt(content)
  if (!receipt) return <XMarkdown paragraphTag="div">{content}</XMarkdown>

  return (
    <div className="text-[13px] leading-relaxed min-w-[200px]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <CheckCircle2 size={13} strokeWidth={1.75} className="text-[#1677ff] shrink-0" />
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {RECEIPT_STATUS[receipt.type] || "已确认"}
        </span>
      </div>
      {(receipt.title || receipt.label) && (
        <div
          className="text-[13px] text-zinc-800 dark:text-zinc-100 mb-2"
          style={{ fontWeight: 500 }}
        >
          {receipt.title || receipt.label}
        </div>
      )}
      {receipt.params && receipt.params.length > 0 && (
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {receipt.params.map((p, i) => (
            <React.Fragment key={i}>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{p.label}</span>
              <span className="text-[12px] text-zinc-700 dark:text-zinc-200 break-words">
                {p.value || "—"}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 计划批准/拒绝回执：把用户在 PlanApprovalCard 点批准后发送的
// 【计划批准】... 文本渲染为简洁的回执卡片（标题 + 摘要 + 步骤 + 工具标签）
// ---------------------------------------------------------------------------

interface PlanReceiptStep {
  content: string
  tool?: string
}

interface PlanReceipt {
  type: "approved" | "rejected"
  title: string
  summary?: string
  steps?: PlanReceiptStep[]
  modified?: boolean
}

function parsePlanReceipt(content: string): PlanReceipt | null {
  const text = content.trim()

  // 拒绝：【计划拒绝】{title}\n请停止当前任务，不要执行。
  if (text.startsWith("【计划拒绝】")) {
    const rest = text.replace(/^【计划拒绝】/, "").trim()
    const firstLine = rest.split("\n")[0].trim()
    // 标题即首行（若混入了“请停止”提示，裁掉）
    const title = firstLine.replace(/请停止当前任务.*$/, "").trim() || firstLine || "执行计划"
    return { type: "rejected", title }
  }

  if (!text.startsWith("【计划批准】")) return null

  const rest = text.replace(/^【计划批准】/, "").trim()

  // 标题：首行（到第一个 \n 或 \n\n）
  const titleLineMatch = rest.match(/^([^\n]+)/)
  const title = titleLineMatch ? titleLineMatch[1].trim() : "执行计划"

  // 摘要
  let summary: string | undefined
  const summaryMatch = rest.match(/计划摘要：\s*([\s\S]*?)(?=\n\s*\n\s*执行步骤：)/)
  if (summaryMatch) {
    summary = summaryMatch[1].trim()
  }

  // 步骤块
  let steps: PlanReceiptStep[] | undefined
  const stepsMatch = rest.match(/执行步骤：\s*\n([\s\S]*?)(?=\n\s*\n\s*请按以上步骤)/)
  if (stepsMatch) {
    const stepsBlock = stepsMatch[1].trim()
    steps = stepsBlock
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        // 格式：N. content（工具：tool）  或  content（工具：tool）  或  N. content
        const m = line.match(/^(?:\d+\.\s*)?([\s\S]*?)(?:（工具：([^）]+)）)?\s*$/)
        if (!m) return { content: line.replace(/^\d+\.\s*/, "") }
        return { content: m[1].trim(), tool: m[2]?.trim() }
      })
  }

  // 是否修改
  const modified = /注意：用户已对计划进行修改/.test(text)

  return { type: "approved", title, summary, steps, modified }
}

function PlanApprovalReceiptCard({ content }: { content: string }) {
  const receipt = parsePlanReceipt(content)
  if (!receipt) return <XMarkdown paragraphTag="div">{content}</XMarkdown>

  const isApproved = receipt.type === "approved"
  const ICON_STROKE = 1.75

  return (
    <div className="text-[13px] leading-relaxed min-w-[240px]">
      {/* 状态条 */}
      <div className="flex items-center gap-1.5 mb-2">
        {isApproved ? (
          <CheckCircle2 size={13} strokeWidth={ICON_STROKE} className="text-[#1677ff] shrink-0" />
        ) : (
          <XCircle size={13} strokeWidth={ICON_STROKE} className="text-[#ff4d4f] shrink-0" />
        )}
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {isApproved ? "已批准计划" : "已拒绝计划"}
        </span>
      </div>

      {/* 标题 */}
      <div className="flex items-start gap-1.5 mb-2">
        <ClipboardList size={13} strokeWidth={ICON_STROKE} className="text-zinc-400 dark:text-zinc-500 shrink-0 mt-[2px]" />
        <div className="text-[13.5px] text-zinc-800 dark:text-zinc-100 break-words" style={{ fontWeight: 500 }}>
          {receipt.title}
        </div>
      </div>

      {/* 拒绝态：简短提示 */}
      {!isApproved && (
        <div className="text-[12px] text-zinc-500 dark:text-zinc-400 pl-[19px]">
          已终止当前任务
        </div>
      )}

      {/* 批准态：摘要 + 步骤 */}
      {isApproved && (
        <>
          {receipt.summary && (
            <div className="mb-2.5 pl-[19px]">
              <div className="text-[10.5px] text-zinc-400 dark:text-zinc-500 mb-0.5">计划摘要</div>
              <div className="text-[12px] text-zinc-600 dark:text-zinc-300 leading-[1.6] break-words">
                {receipt.summary}
              </div>
            </div>
          )}
          {receipt.steps && receipt.steps.length > 0 && (
            <div className="pl-[19px] space-y-1.5">
              <div className="text-[10.5px] text-zinc-400 dark:text-zinc-500 mb-0.5">执行步骤</div>
              {receipt.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span
                    className="flex items-center justify-center shrink-0 w-[16px] h-[16px] rounded-full bg-[#1677ff] text-white text-[9.5px] mt-[2px]"
                    style={{ fontWeight: 500 }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-zinc-700 dark:text-zinc-200 leading-[1.55] break-words">
                      {step.content}
                    </div>
                    {step.tool && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Wrench size={9.5} strokeWidth={ICON_STROKE} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
                        <span className="text-[10.5px] text-zinc-400 dark:text-zinc-500">{step.tool}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {receipt.modified && (
            <div className="mt-2.5 pl-[19px] flex items-start gap-1.5">
              <AlertCircle size={11} strokeWidth={ICON_STROKE} className="text-[#fa8c16] shrink-0 mt-[2px]" />
              <span className="text-[11px] text-[#fa8c16] leading-[1.5]">
                计划已修改，将按修改后执行
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 新消息分隔线 — 区分历史消息和本次会话新增的消息
// 样式：Ant Design 主色 #1677ff，lucide-react ArrowDown 图标 strokeWidth 1.75
// ---------------------------------------------------------------------------

function NewMessageDivider() {
  return (
    <div
      className="flex items-center gap-2 my-4 px-1"
      role="separator"
      aria-label="新消息"
    >
      <div className="flex-1 h-px" style={{ background: "rgba(22, 119, 255, 0.18)" }} />
      <div
        className="flex items-center gap-1 text-[11px] select-none"
        style={{ color: "#1677ff", fontWeight: 400 }}
      >
        <ArrowDown size={12} strokeWidth={1.75} />
        <span>新消息</span>
      </div>
      <div className="flex-1 h-px" style={{ background: "rgba(22, 119, 255, 0.18)" }} />
    </div>
  )
}

export interface ChatBubbleListProps {
  messages: Message[]
  isLoading: boolean
  agentSteps: AgentStep[]
  agentStatus: string
  /** 是否显示思考链（由父组件控制可见性，完成后保留） */
  showThoughtChain?: boolean
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
  /** 🔥 AI 动作总结（TRAE 风格：任务耗时 + 工具调用次数 + 任务完成状态） */
  aiActionSummary?: AIActionSummary | null
  /** 🔥 页面级 TASK_LIST 内容：跨多轮反馈消息保持任务规划器状态同步 */
  latestTaskListContent?: string
  /**
   * 🔥 本次会话新消息分隔线索引（messages 数组中的原始 index）。
   * 从服务端加载历史消息后设置为当时数量，之后新增的消息（index >= boundary）
   * 会在首条新消息上方渲染"新消息"分隔线。0 或 undefined 时不显示。
   */
  newMessageBoundary?: number
}

export function ChatBubbleList({
  messages,
  isLoading,
  agentSteps,
  agentStatus,
  showThoughtChain = true,
  rendererProps,
  footerContent,
  onTtsSpeak,
  darkMode,
  visionInspection,
  aiActionSummary,
  latestTaskListContent = "",
  newMessageBoundary = 0,
}: ChatBubbleListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // 最近一次 contentRender 算出来的「thought chain 是否可见」，
  // footer 里同一条消息渲染时复用，避免重复算。
  // 反过来也保证"任务执行中"胶囊只在 chain 不可见时出现。
  const chainVisibleRef = useRef<boolean>(false)

  // 🔥 rendererProps 由 page.tsx 内联构造，每次渲染都是新对象（内部闭包也是新引用）。
  // 直接把函数 props 透传给 ChatMessageRenderer 会让其 memo 失效（函数引用每次都变）。
  // 方案：ref 持有最新 rendererProps + 一次性创建的稳定转发函数，
  // 保证函数 prop 引用恒定，调用时永远转发到最新回调（无闭包过期问题）。
  const rendererPropsRef = useRef(rendererProps)
  rendererPropsRef.current = rendererProps
  const [stableRendererFns] = useState(() => ({
    onOpenStudio: ((title: string, html: string) =>
      rendererPropsRef.current.onOpenStudio?.(title, html)) as (title: string, html: string) => void,
    onOpenStudioFromTask: (() =>
      rendererPropsRef.current.onOpenStudioFromTask?.()) as () => void,
    onExecuteCommand: ((command: any) =>
      rendererPropsRef.current.onExecuteCommand(command)) as (command: any) => Promise<void>,
    onRetryCommand: ((errorMsg: string) =>
      rendererPropsRef.current.onRetryCommand(errorMsg)) as (errorMsg: string) => void,
    onSendMessage: ((text: string) =>
      rendererPropsRef.current.onSendMessage(text)) as (text: string) => void,
    onRespondToCheckpoint: ((replyText: string, fallback: (text: string) => void) =>
      rendererPropsRef.current.onRespondToCheckpoint?.(replyText, fallback)) as (
        replyText: string,
        fallback: (text: string) => void
      ) => void,
    onSetInput: ((text: string) =>
      rendererPropsRef.current.onSetInput(text)) as (text: string) => void,
  }))

  const filteredMessages = messages.filter((m) => !m.isSilent)

  // 🔥 Berry Orb 表情：根据对话状态 + AI 回复内容推断
  // - 加载中且正在执行工具/Agent 步骤 → working
  // - 加载中（等待/流式输出）→ 有内容时按内容检测（兜底 speaking），无内容时 thinking
  // - 加载完成 → 按最后一条 AI 消息内容检测（兜底 idle）
  const orbExpression: OrbExpression = useMemo(() => {
    let lastAiText = ""
    for (let i = filteredMessages.length - 1; i >= 0; i--) {
      const m = filteredMessages[i]
      if (m.role === "assistant" && typeof m.content === "string" && m.content.trim()) {
        lastAiText = m.content
        break
      }
    }
    if (isLoading) {
      if (agentStatus) return "working"
      return lastAiText ? detectOrbExpression(lastAiText, "speaking") : "thinking"
    }
    return detectOrbExpression(lastAiText, "idle")
  }, [filteredMessages, isLoading, agentStatus])

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
        // 关闭 Ant Design X 的默认三点 loading，改为下方 contentRender 中的自定义指示器
        loading: false,
        extraInfo: { message: msg, index: i, isLast },
      }
    })

  // 🔥 新消息分隔线：计算过滤后数组中的分割点
  // newMessageBoundary 是 messages 原始数组中的 index，需要映射到过滤后的位置。
  // 过滤后顺序保持不变（只追加不插入），所以首个 origIdx >= boundary 的位置即为分割点。
  const indexedFiltered = messages
    .map((msg, origIdx) => ({ msg, origIdx }))
    .filter(({ msg }) => !msg.isSilent && !isMemorySummary(msg))
  const hasBoundary = newMessageBoundary > 0
  const splitIdx = hasBoundary
    ? indexedFiltered.findIndex(({ origIdx }) => origIdx >= newMessageBoundary)
    : -1
  // 仅当分割点 > 0（存在历史消息）且 < 总数（存在新消息）时显示分隔线
  const showNewMessageDivider = splitIdx > 0 && splitIdx < items.length

  const role: BubbleListProps["role"] = {
    ai: {
      placement: "start" as const,
      variant: "outlined",
      className: "!max-w-[85%]",
      // 🔥 给整条 AI 气泡加 group 标识，用于触发 BubbleTime 的 hover 显示
      rootClassName: "group/ai-bubble",
      avatar: <BerryOrb size="36px" theme={darkMode ? 'dark' : 'light'} isActive={isLoading} expression={orbExpression} />,
      // 🔥 气泡时间：hover 整条 AI 气泡时才显示
      header: <BubbleTime darkMode={!!darkMode} />,
      footer: (content: unknown) => {
        const text = typeof content === "string" ? content : ""
        // 🔥 整合：AI 动作总结 + 操作按钮 同行显示（TRAE 风格：单行紧凑）
        // - 左侧：任务完成状态 + 耗时 + 工具调用次数
        // - 右侧：点赞/点踩/复制/语音
        // 优化：当 thought chain 可见时，"任务执行中"胶囊与 chain 顶部状态条重复，
        // 只保留 chain 入口；仅当 chain 不可见时回退到胶囊。
        return (
          <div className="flex items-center gap-2.5 flex-wrap">
            {aiActionSummary && !chainVisibleRef.current ? (
              <AIActionSummaryCard summary={aiActionSummary} className="!mt-0 flex-1 min-w-0" />
            ) : null}
            <BubbleActions content={text} onSpeak={onTtsSpeak} />
          </div>
        )
      },
      contentRender: (_content: unknown, info: any) => {
        const msg = info?.extraInfo?.message as Message | undefined
        const msgIndex = info?.extraInfo?.index as number | undefined
        const isLastItem = info?.extraInfo?.isLast as boolean | undefined
        if (!msg) return null

        // 🔥 加载态：最后一条 AI 消息且无内容时，用动态图标 + 「正在工作」取代默认三点
        const isWorkingBubble =
          isLastItem && msg.role === "assistant" && isLoading && !msg.content
        if (isWorkingBubble) {
          // 🔥 修复：工具调用/多轮 Agent 执行期间 content 一直为空，
          // 之前直接 return WorkingIndicator（笼统的「正在工作」），把思维链和
          // agentStatus（如「第 N 轮工具调用: xxx」）全部短路，用户完全看不到
          // AI 在调用什么工具；LLM 超时的 llm_error 步骤也会被吞掉。
          // 现在：有思维链步骤时优先渲染思维链；agentStatus 文字始终展示；
          // 只在真正空白（首字节未到）时才退回 WorkingIndicator。
          const hasChainSteps = showThoughtChain && agentSteps.length > 0
          chainVisibleRef.current = !!hasChainSteps
          return (
            <div id={`msg-${msgIndex ?? 0}`} data-msg-anchor={`msg-${msgIndex ?? 0}`}>
              {hasChainSteps && (
                <AgentThoughtChain
                  steps={agentSteps}
                  isActive={isLoading}
                  className="!mt-0 !mb-2"
                />
              )}
              {!hasChainSteps && <WorkingIndicator darkMode={!!darkMode} />}
              {agentStatus && (
                <div className="flex items-center gap-1.5 text-[12.5px] text-slate-500 dark:text-zinc-400 mt-1.5 px-0.5">
                  <Loader2 size={12} className="animate-spin shrink-0 text-[#1677ff]" />
                  <span className="truncate">{agentStatus}</span>
                </div>
              )}
            </div>
          )
        }

        // 只在最后一条 AI 消息的 content 内部展示思考链（贴合对话气泡）
        // 关键：任务完成后 agentSteps 仍存在 → 思维链要保留显示（完成后不自动消失，折叠由内部组件控制）
        // 不要因为 isLoading=false 而卸载整个思维链 DOM
        const showChainInBubble = showThoughtChain
          && isLastItem
          && msg.role === "assistant"
          && agentSteps.length > 0
        // 把 chain 可见性缓存给 footer 复用（强制转 boolean，避免 isLastItem 为 undefined 时类型不匹配）
        chainVisibleRef.current = !!showChainInBubble
        // 🔥 当最后一条 AI 消息包含 <TASK_LIST> 任务规划时，思考链默认折叠
        // 避免和任务规划卡片"打架"（TRAE 风格中两者不会同时展开）
        const msgContent = typeof msg?.content === "string" ? msg.content : ""
        const hasTaskPlan = msgContent.includes("<TASK_LIST>") || !!latestTaskListContent
        // reasoning（深度思考）不再推入 agentSteps，由 DeepThinking 独立渲染
        // hasThinkingInChain 始终为 false，保留字段兼容旧逻辑
        const hasThinkingInChain = agentSteps.some((s) => s.kind === "thinking")
        // 锚点 id：用于右侧导航点定位
        const anchorId = `msg-${msgIndex ?? 0}`

        // 🧭 可解释决策卡片：解析 <DECISION> 标签
        // - 剥离标签后的 msg 传给 ChatMessageRenderer（避免 JSON 裸露在主消息流）
        // - DecisionCard 以独立卡片形式渲染在消息底部
        // - 流式过程中（未闭合 <DECISION>）：从 <DECISION> 标签处截断，避免显示半成品 JSON
        const isStreamingThis = isLastItem && isLoading
        const rawMsgContent = typeof msg.content === "string" ? msg.content : ""
        const decisions = isStreamingThis ? [] : parseDecisionTags(rawMsgContent)
        const hasDecisions = decisions.length > 0
        let cleanedContent = rawMsgContent
        if (isStreamingThis) {
          // 流式中：剥离完整闭合的 + 未闭合的 <DECISION> 开标签及之后内容
          const openIdx = cleanedContent.indexOf('<DECISION>')
          if (openIdx !== -1) {
            cleanedContent = cleanedContent.slice(0, openIdx).replace(/\n+$/, '\n')
          } else {
            cleanedContent = stripDecisionTags(cleanedContent)
          }
        } else if (hasDecisions) {
          cleanedContent = stripDecisionTags(rawMsgContent)
        }
        const cleanedMsg = cleanedContent !== rawMsgContent
          ? { ...msg, content: cleanedContent }
          : msg

        return (
          <div
            className="relative"
            id={anchorId}
            data-msg-anchor={anchorId}
          >
            {showChainInBubble && (
              <AgentThoughtChain
                steps={agentSteps}
                isActive={isLoading}
                defaultCollapsed={hasTaskPlan}
                className="!mt-0 !mb-2"
              />
            )}
            {/* 🔥 页面级任务规划器：只在最后一条 AI 消息渲染，跨反馈消息保持状态同步 */}
            {isLastItem && msg.role === "assistant" && latestTaskListContent && (
              <div className="mb-2">
                <DynamicTaskPlanner content={latestTaskListContent} />
              </div>
            )}
            <ChatMessageRenderer
              msg={cleanedMsg}
              {...rendererProps}
              {...stableRendererFns}
              isStreaming={isLastItem && isLoading}
              hasThinkingInChain={hasThinkingInChain}
              suppressTaskPlanner={isLastItem && !!latestTaskListContent}
            />
            {hasDecisions && (
              <div className="mt-2 space-y-2">
                {decisions.map((d, i) => (
                  <DecisionCard key={`dec-${msgIndex ?? 0}-${i}`} data={d} />
                ))}
              </div>
            )}
            {/* 积分消耗：流式中显示实时估算（~ 前缀），回复完成后用服务端真实值 */}
            {(() => {
              const realCredits = msg.creditUsage?.credits
              const liveCredits = msg.liveCredits
              const display = isStreamingThis
                ? (typeof liveCredits === 'number' ? `~${liveCredits.toFixed(2)}` : null)
                : (typeof realCredits === 'number' ? realCredits.toFixed(2) : null)
              if (!display) return null
              const tip = isStreamingThis
                ? `实时估算（流式输出中，每收到一个 token 重算）。流结束后会显示服务端真实值。`
                : `本次消耗 ${display} 积分`
              return (
                <div
                  className="mt-1.5 flex items-center justify-end gap-1 text-[10.5px] text-slate-300 dark:text-slate-600 select-none"
                  title={tip}
                >
                  <Zap className="w-3 h-3" />
                  <span>消耗 {display} 积分</span>
                </div>
              )
            })()}
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
        const msgIndex = info?.extraInfo?.index as number | undefined
        if (!msg) return null
        const anchorId = `msg-${msgIndex ?? 0}`
        if (typeof msg.content === "string" && msg.content) {
          // 🔥 检查点确认回执：渲染为简洁卡片，而非裸 markdown 文本
          if (msg.content.startsWith("【检查点确认】")) {
            return (
              <div id={anchorId} data-msg-anchor={anchorId}>
                <CheckpointReceiptCard content={msg.content} />
              </div>
            )
          }
          // 🔥 计划批准/拒绝回执：渲染为简洁卡片（标题 + 摘要 + 步骤 + 工具标签）
          if (msg.content.startsWith("【计划批准】") || msg.content.startsWith("【计划拒绝】")) {
            return (
              <div id={anchorId} data-msg-anchor={anchorId}>
                <PlanApprovalReceiptCard content={msg.content} />
              </div>
            )
          }
          // 🔥 澄清回复回执：渲染为简洁卡片，支持参数列表网格展示
          if (msg.content.startsWith("【澄清回复】")) {
            const reply = msg.content.replace(/^【澄清回复】/, "").trim()
            // 解析参数列表（- label: value 格式）
            const paramLines = reply.split("\n").map(l => l.replace(/^[-•]\s*/, "").trim()).filter(Boolean)
            const hasParams = paramLines.length > 0 && paramLines[0].includes(":")
            const params = hasParams ? paramLines.map(l => {
              const idx = l.search(/[:：]/)
              if (idx === -1) return { label: l, value: "" }
              return { label: l.slice(0, idx).trim(), value: l.slice(idx + 1).replace(/^[:：\s]+/, "").trim() }
            }).filter(p => p.label) : []
            return (
              <div id={anchorId} data-msg-anchor={anchorId}>
                <div className="text-[13px] leading-relaxed min-w-[120px]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 size={13} strokeWidth={1.75} className="text-[#1677ff] shrink-0" />
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">澄清回复</span>
                  </div>
                  {params.length > 0 ? (
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                      {params.map((p, i) => (
                        <React.Fragment key={i}>
                          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{p.label}</span>
                          <span className="text-[12px] text-zinc-700 dark:text-zinc-200 break-words">
                            {p.value || "—"}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[13px] text-zinc-800 dark:text-zinc-100" style={{ fontWeight: 500 }}>
                      {reply}
                    </div>
                  )}
                </div>
              </div>
            )
          }
          const { cleanText, toolName } = parseToolTag(msg.content)
          return (
            <div id={anchorId} data-msg-anchor={anchorId}>
              {toolName && <ToolSkillTag toolName={toolName} />}
              <XMarkdown paragraphTag="div">{cleanText || msg.content}</XMarkdown>
            </div>
          )
        }
        return (
          <div id={anchorId} data-msg-anchor={anchorId}>
            <ChatMessageRenderer msg={msg} {...rendererProps} {...stableRendererFns} />
          </div>
        )
      },
    },
  }

  // 抽取所有历史记忆摘要消息（按原始顺序）
  const memorySummaries = filteredMessages.filter(isMemorySummary)

  // 构造导航点：每条消息一个点（包含用户 + AI）
  const navItems: MessageNavItem[] = filteredMessages
    .filter((m) => !isMemorySummary(m))
    .map((m, i) => ({
      id: `msg-${i}`,
      preview: extractPreview(m.content, 50),
    }))

  // 当前可见消息 id
  const activeId = useMessageAnchors(listRef, navItems.map((n) => n.id))

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "row",
        position: "relative",
      }}
    >
      {/* 🔥 消息节点导航：固定在左侧、不随内容滚动（flex 垂直居中） */}
      {navItems.length > 0 && (
        <div
          style={{
            alignSelf: "stretch",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingLeft: 6,
            paddingRight: 6,
            flexShrink: 0,
            zIndex: 5,
          }}
        >
          <MessageNavDots
            items={navItems}
            activeId={activeId}
            scrollContainerRef={listRef}
            darkMode={darkMode}
          />
        </div>
      )}
      {/* 可滚动消息列表 */}
      <div
        ref={listRef}
        data-lenis-prevent
        style={{ flex: 1, overflow: "auto", minHeight: 0 }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px 90px" }}>
          {/* 🔥 历史记忆摘要卡片（紧凑放在最前，区分于普通对话气泡） */}
          {memorySummaries.length > 0 && (
            <div className="mb-4 space-y-2">
              {memorySummaries.map((m, i) => (
                <MemorySummaryCard key={`memory-${i}`} content={m.content as string} />
              ))}
            </div>
          )}
          {showNewMessageDivider ? (
            <>
              <Bubble.List items={items.slice(0, splitIdx)} role={role as any} />
              <NewMessageDivider />
              <Bubble.List items={items.slice(splitIdx)} role={role as any} />
            </>
          ) : (
            <Bubble.List items={items} role={role as any} />
          )}
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
          {footerContent && (
            <AnimatePresence mode="wait">{footerContent}</AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}
