"use client"

import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { AnimatePresence } from "framer-motion"
import { Bubble, Actions } from "@ant-design/x"
import type { ActionsFeedbackProps, ActionsProps } from "@ant-design/x"
import type { BubbleListProps } from "@ant-design/x"
import { Modal } from "antd"

import { toast } from "@/lib/ui/feedback"
import XMarkdown from "@ant-design/x-markdown"
import BerryOrb, { EMERALD_ORB_PALETTE } from "@/components/smoothui/berry-orb"
import { detectOrbExpression, parseOrbExpressionTag, stripOrbExpressionTag, type OrbExpression } from "@/lib/ai/orb-expression"
import { IS_DESKTOP_APP } from "@/lib/desktop-mode"
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
import { DocumentCardList } from "@/app/ai-assistant/_components/document-card"
import {
  MessageNavDots,
  extractPreview,
  type MessageNavItem,
} from "@/app/ai-assistant/_components/message-nav-dots"
import {
  IconArrowDown, IconAttention, IconCheck, IconCheckOne, IconClose, IconCloseOne,
  IconCopy, IconDelete, IconEdit, IconLightning, IconListCheckbox, IconLoading,
  IconMore, IconRefresh, IconShare, IconTool, IconVolumeNotice,
} from "@/components/icon";

// ---------------------------------------------------------------------------
// Per-bubble actions component (own state for feedback/pagination/share/audio)
// ---------------------------------------------------------------------------

/**
 * 气泡时间戳：显示在 AI 消息上方（hover 整条气泡时），自动每分钟刷新
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

/**
 * 气泡动作行（2026-09-19 对齐 antd X 官方 Actions 范式：items + subItems + danger）
 *  - 顶层：重试 / 编辑 / 复制 / 点赞点踩 / 更多
 *  - 更多：朗读 / 分享 / 删除（danger，二次确认）
 */
function BubbleActions({
  content,
  onSpeak,
  onDelete,
  onRetry,
  onEdit,
}: {
  content: string
  onSpeak?: (text: string) => void
  onDelete?: () => void
  onRetry?: () => void
  onEdit?: (text: string) => void
}) {
  const [feedbackStatus, setFeedbackStatus] = useState<ActionsFeedbackProps["value"]>("default")
  const [copied, setCopied] = useState(false)

  const writeClipboard = (text: string, okMsg: string) => {
    const done = () => {
      setCopied(true)
      toast.success(okMsg)
      setTimeout(() => setCopied(false), 1600)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => toast.error("复制失败"))
    } else {
      toast.error("当前环境不支持复制")
    }
  }

  const confirmDelete = () => {
    Modal.confirm({
      title: "确定删除这条消息？",
      content: "删除后无法恢复，对话上下文也会一起丢掉。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        onDelete?.()
        toast.success("已删除")
      },
    })
  }

  const moreSubItems: ActionsProps["items"][number]["subItems"] = [
    {
      key: "audio",
      label: "朗读",
      icon: <IconVolumeNotice size={14} />,
      onItemClick: () => {
        if (!onSpeak) {
          toast.info("当前未开启语音播报")
          return
        }
        onSpeak(content)
      },
    },
    {
      key: "share",
      label: "分享",
      icon: <IconShare size={14} />,
      onItemClick: () => writeClipboard(content, "内容已复制，可粘贴分享"),
    },
    // 父组件没接删除回调时不显示该项（避免出现点了没反应的假按钮）
    ...(onDelete
      ? [
          {
            key: "delete",
            label: "删除",
            icon: <IconDelete size={14} />,
            danger: true,
            onItemClick: confirmDelete,
          },
        ]
      : []),
  ]

  const items: ActionsProps["items"] = [
    ...(onRetry
      ? [{ key: "retry", label: "重试", icon: <IconRefresh size={14} />, onItemClick: () => onRetry() }]
      : []),
    ...(onEdit
      ? [{ key: "edit", label: "编辑", icon: <IconEdit size={14} />, onItemClick: () => onEdit(content) }]
      : []),
    {
      key: "copy",
      label: "复制",
      icon: copied ? <IconCheck size={14} /> : <IconCopy size={14} />,
      onItemClick: () => writeClipboard(content, "已复制"),
    },
    {
      key: "feedback",
      actionRender: () => (
        <Actions.Feedback
          value={feedbackStatus}
          styles={{ liked: { color: "#f759ab" } }}
          onChange={(val) => {
            setFeedbackStatus(val)
            toast.success(`反馈: ${val}`)
          }}
        />
      ),
    },
    { key: "more", icon: <IconMore size={14} />, subItems: moreSubItems },
  ]

  return <Actions items={items} />
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
      <IconLightning size={12} />
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
        <IconCheckOne size={13} strokeWidth={2} className="text-[#059669] shrink-0" />
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
          <IconCheckOne size={13} strokeWidth={ICON_STROKE} className="text-[#059669] shrink-0" />
        ) : (
          <IconCloseOne size={13} strokeWidth={ICON_STROKE} className="text-[#DC2626] shrink-0" />
        )}
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {isApproved ? "已批准计划" : "已拒绝计划"}
        </span>
      </div>

      {/* 标题 */}
      <div className="flex items-start gap-1.5 mb-2">
        <IconListCheckbox size={13} strokeWidth={ICON_STROKE} className="text-zinc-400 dark:text-zinc-500 shrink-0 mt-[2px]" />
        <div className="text-[13px] text-zinc-800 dark:text-zinc-100 break-words" style={{ fontWeight: 500 }}>
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
              <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-0.5">计划摘要</div>
              <div className="text-[12px] text-zinc-600 dark:text-zinc-300 leading-[1.6] break-words">
                {receipt.summary}
              </div>
            </div>
          )}
          {receipt.steps && receipt.steps.length > 0 && (
            <div className="pl-[19px] space-y-1.5">
              <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-0.5">执行步骤</div>
              {receipt.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span
                    className="flex items-center justify-center shrink-0 w-[16px] h-[16px] rounded-full bg-[#059669] text-white text-[11px] mt-[2px]"
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
                        <IconTool size={9.5} strokeWidth={ICON_STROKE} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{step.tool}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {receipt.modified && (
            <div className="mt-2.5 pl-[19px] flex items-start gap-1.5">
              <IconAttention size={11} strokeWidth={ICON_STROKE} className="text-[#52525B] shrink-0 mt-[2px]" />
              <span className="text-[11px] text-[#52525B] leading-[1.5]">
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
// 样式：Ant Design 主色 #059669，lucide-react ArrowDown 图标 strokeWidth 1.75
// ---------------------------------------------------------------------------

function NewMessageDivider() {
  return (
    <div
      className="flex items-center gap-2 my-4 px-1"
      role="separator"
      aria-label="新消息"
    >
      <div className="flex-1 h-px" style={{ background: "rgba(0,148,86, 0.18)" }} />
      <div
        className="flex items-center gap-1 text-[11px] select-none"
        style={{ color: "#059669", fontWeight: 400 }}
      >
        <IconArrowDown size={12} strokeWidth={2} />
        <span>新消息</span>
      </div>
      <div className="flex-1 h-px" style={{ background: "rgba(0,148,86, 0.18)" }} />
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
  /**
   * 🔥 删除单条消息回调（参数是 messages 原始数组下标）。
   * 气泡动作行「更多 → 删除」触发，二次确认后才调用。不传则不显示删除项。
   */
  onDeleteMessage?: (index: number) => void
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
  onDeleteMessage,
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

  /* 2026-10-18：AI 气泡头像改回 **Grok Orb**（`variant="orb"`，纯 SVG + rAF 的蓝白球体）。
     2026-10-16 曾按外部参考稿换成吉祥物短片，用户否决两次后回退；
     本次按用户要求「回退使用 grokbot」恢复 Grok Orb 形态。
     选它的关键原因：吉祥物短片有 `clipTooSmall` 尺寸门槛，32/36px 头像位只会显示
     静态海报（用户原话「根本不是动态的」）；而 GrokOrbBody 是 SVG + requestAnimationFrame，
     **没有任何尺寸门控**，36px 下照样眨眼 / 身体起伏 / 光晕呼吸。
     OrbExpression / detectOrbExpression 同时服务于其它看板（Copilot 悬浮球、landing 演示台），
     不要因为某处不用了就从 lib 里删。 */

  // 🔥 Grok Orb 表情：**AI 显式标签优先**，没有标签才回落到文本推断
  // - 2026-10-27：改成「AI 自己报表情」—— 回复开头带 `<EMO:id/>`（协议见 lib/ai/orb-expression.ts）
  //   命中白名单 id 就直接切，正则推断只作为老消息 / 模型忘写标签时的兜底
  // - 加载中且正在执行工具/Agent 步骤 → working（执行态压过表情，代表"在干活"）
  // - 加载中（等待/流式输出）→ 有内容且有标签用标签；无标签按内容检测（兜底 speaking）；无内容 thinking
  // - 加载完成 → 标签 > 内容检测（兜底 idle）
  const orbExpression: OrbExpression = useMemo(() => {
    let lastAiText = ""
    for (let i = filteredMessages.length - 1; i >= 0; i--) {
      const m = filteredMessages[i]
      if (m.role === "assistant" && typeof m.content === "string" && m.content.trim()) {
        lastAiText = m.content
        break
      }
    }
    const explicit = parseOrbExpressionTag(lastAiText).expression
    if (isLoading) {
      if (agentStatus) return "working"
      return explicit ?? (lastAiText ? detectOrbExpression(lastAiText, "speaking") : "thinking")
    }
    return explicit ?? detectOrbExpression(lastAiText, "idle")
  }, [filteredMessages, isLoading, agentStatus])

  // 🔥 历史记忆摘要（PAST_MEMORY）消息：单独抽出，用卡片组件渲染（不进入 Bubble.List）
  const isMemorySummary = (m: Message) =>
    m.role === "assistant" && typeof m.content === "string" && m.content.includes("<PAST_MEMORY>")

  // 🔥 保留原始数组下标：删除消息要按原始 messages 索引操作（必须在 isMemorySummary 之后）
  const indexedFiltered = messages
    .map((msg, origIdx) => ({ msg, origIdx }))
    .filter(({ msg }) => !msg.isSilent && !isMemorySummary(msg))

  const items: BubbleListProps["items"] = indexedFiltered
    .map(({ msg, origIdx }, i) => {
      const isLast = i === indexedFiltered.length - 1
      return {
        key: `${msg.role}-${i}`,
        role: (msg.role === "user" ? "user" : "ai") as string,
        content: typeof msg.content === "string" ? msg.content : "",
        // 关闭 Ant Design X 的默认三点 loading，改为下方 contentRender 中的自定义指示器
        loading: false,
        extraInfo: { message: msg, index: i, origIdx, isLast },
      }
    })

  // 🔥 新消息分隔线：计算过滤后数组中的分割点
  // newMessageBoundary 是 messages 原始数组中的 index，需要映射到过滤后的位置。
  // 过滤后顺序保持不变（只追加不插入），所以首个 origIdx >= boundary 的位置即为分割点。
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
      /* 2026-10-14 用户：「AI 文本区域太窄」→ 由 85% 放开到满宽。
         AI 是裸文本（无外框、无头像），本来就没有「气泡感」要保留，
         85% 只是沿用 antd 的默认缩进；配合上面清掉的 15% 内衬，
         文本区从 750px 涨到 1072px（+43%）。
         ⚠️ 用户气泡的 75% 不动 —— 那是「右对齐短消息」的版式语言。 */
      className: "!max-w-full",
      // 🔥 给整条 AI 气泡加 group 标识，用于触发 BubbleTime 的 hover 显示
      /* 2026-10-18 恢复 Grok Orb 头像（`variant="orb"`）。2026-10-16 曾换成吉祥物短片，
         因 32px 尺寸门槛退化成静态海报被用户否决；GrokOrbBody 是 SVG + rAF，无尺寸门控。
         保留的部分：antd X 的 variant:"outlined" 默认会给内容加一圈边 + 白底 + 内距，
         这里靠 ai-bubble-bare 全部抹平（见下方内联 <style>）—— AI 回复直接贴在
         对话底色上，没有气泡外框，只有左侧一枚 36px 球体头像和底部操作条。 */
      rootClassName: "group/ai-bubble ai-bubble-bare",
      /* ── Grok Orb 头像（2026-10-18 按用户要求恢复）──────────────────────
         `variant="orb"` 必须显式写：吉祥物短片已是 BerryOrb 的默认形态，
         不传就会拿到有 `clipTooSmall` 门槛的短片，36px 下退化成静态海报。
         ⚠️ `alignSelf: "flex-start"` 不能省：flex 默认 stretch，长消息里头像会被
            拉到垂直居中，贴顶对齐才和正文首行齐平。
         🎨 配色必须显式传 `EMERALD_ORB_PALETTE`：不传会用 `GROK_PALETTES` 默认的
            **白/浅蓝身体 + 蓝光晕**，和 matechat 招呼语那枚绿球不是一套色
            （2026-10-18 用户：「这里也要换成跟 matechat 一样的颜色」）。 */
      avatar: (
        <BerryOrb
          variant="orb"
          size="36px"
          theme={darkMode ? "dark" : "light"}
          isActive={isLoading}
          expression={orbExpression}
          palette={EMERALD_ORB_PALETTE}
        />
      ),
      styles: {
        avatar: { alignSelf: "flex-start" },
      },
      // 🔥 气泡时间：hover 整条 AI 气泡时才显示（Message 上没有真实发送时间字段，
      //    BubbleTime 取的是当前时刻，常显会对历史消息显示错的时间）
      header: <BubbleTime darkMode={!!darkMode} />,
      footer: (content: unknown, info: any) => {
        // 🍓 剥离 `<EMO:id/>`：复制 / 朗读 / 重试都得拿到干净正文，标签不外泄
        const text = stripOrbExpressionTag(typeof content === "string" ? content : "")
        const idx = (info?.extraInfo?.index as number | undefined) ?? -1
        const origIdx = info?.extraInfo?.origIdx as number | undefined
        // 重试 = 重发本条 AI 消息之前最近的一条用户消息
        let retryText = ""
        for (let k = idx - 1; k >= 0; k--) {
          const m = indexedFiltered[k]?.msg
          if (m?.role === "user") {
            retryText = typeof m.content === "string" ? m.content : ""
            break
          }
        }
        // 🔥 整合：AI 动作总结 + 操作按钮 同行显示（TRAE 风格：单行紧凑）
        // - 左侧：任务完成状态 + 耗时 + 工具调用次数
        // - 右侧：重试/编辑/复制/点赞点踩/更多
        // 优化：当 thought chain 可见时，"任务执行中"胶囊与 chain 顶部状态条重复，
        // 只保留 chain 入口；仅当 chain 不可见时回退到胶囊。
        return (
          <div className="flex items-center gap-2.5 flex-wrap">
            {aiActionSummary && !chainVisibleRef.current ? (
              <AIActionSummaryCard summary={aiActionSummary} className="!mt-0 flex-1 min-w-0" />
            ) : null}
            <BubbleActions
              content={text}
              onSpeak={onTtsSpeak}
              onDelete={onDeleteMessage && origIdx != null ? () => onDeleteMessage(origIdx) : undefined}
              onEdit={rendererPropsRef.current.onSetInput ? (t) => rendererPropsRef.current.onSetInput?.(t) : undefined}
              onRetry={retryText ? () => rendererPropsRef.current.onSendMessage?.(retryText) : undefined}
            />
          </div>
        )
      },
      contentRender: (_content: unknown, info: any) => {
        const msg = info?.extraInfo?.message as Message | undefined
        const msgIndex = info?.extraInfo?.index as number | undefined
        const msgOrigIdx = info?.extraInfo?.origIdx as number | undefined
        const isLastItem = info?.extraInfo?.isLast as boolean | undefined
        if (!msg) return null

        // 🔥 加载态：最后一条 AI 消息且无内容时，用动态图标 + 「正在工作」取代默认三点。
        // 🚨 有思考内容时必须**放行**给 ChatMessageRenderer：思考期间正文按设计还没上屏
        //    （content 可能是空串），若这里短路成「正在工作」，思考面板永远不挂载
        //    → 用户看到的是「没有思考、直接出正文」（2026-10-22 修复）。
        const isWorkingBubble =
          isLastItem && msg.role === "assistant" && isLoading && !msg.content
          && !msg.reasoning?.text && !msg.reasoningStreaming
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
                <div className="flex items-center gap-1.5 text-[13px] text-zinc-500 dark:text-zinc-400 mt-1.5 px-0.5">
                  <IconLoading size={12} className="animate-spin shrink-0 text-[#059669]" />
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
        // 🍓 表情标签 `<EMO:id/>` 只用来驱动 GrokBot 头像，属于"协议层"内容，对用户不可见。
        // 流式中还要掐掉文末未闭合的 `<EMO:hap` —— 否则用户会看到半截标签闪一下。
        const orbStrippedContent = stripOrbExpressionTag(rawMsgContent, { streaming: isStreamingThis })
        const decisions = isStreamingThis ? [] : parseDecisionTags(rawMsgContent)
        const hasDecisions = decisions.length > 0
        let cleanedContent = orbStrippedContent
        if (isStreamingThis) {
          // 流式中：剥离完整闭合的 + 未闭合的 <DECISION> 开标签及之后内容
          const openIdx = cleanedContent.indexOf('<DECISION>')
          if (openIdx !== -1) {
            cleanedContent = cleanedContent.slice(0, openIdx).replace(/\n+$/, '\n')
          } else {
            cleanedContent = stripDecisionTags(cleanedContent)
          }
        } else if (hasDecisions) {
          cleanedContent = stripDecisionTags(orbStrippedContent)
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
              /* 只有这条消息里真的含诊断结论时才回溯原图 ——
                 其余消息的 props 保持逐字稳定，不破坏 React.memo。
                 ⚠️ 必须传 origIdx（原始 messages 下标），不能传 items 的 index ——
                 两者在存在 PAST_MEMORY 消息时会错位，详见 nearestUserImageBefore 注释。 */
              diagnosisImageSrc={
                typeof rawMsgContent === "string" && rawMsgContent.includes("<DIAGNOSIS")
                  ? nearestUserImageBefore(msgOrigIdx ?? msgIndex ?? 0)
                  : undefined
              }
              /* 病历归档的消息键：Message 本身没有 id，用「原始数组下标」当稳定标识
                 （和 anchorId 同源，但刻意用 origIdx —— items 下标在含 PAST_MEMORY 时会错位）。 */
              diagnosisMessageKey={
                typeof rawMsgContent === "string" && rawMsgContent.includes("<DIAGNOSIS")
                  ? String(msgOrigIdx ?? msgIndex ?? 0)
                  : undefined
              }
            />
            {hasDecisions && (
              <div className="mt-2 space-y-2">
                {decisions.map((d, i) => (
                  <DecisionCard key={`dec-${msgIndex ?? 0}-${i}`} data={d} />
                ))}
              </div>
            )}
            {/* 积分消耗：流式中显示实时估算（~ 前缀），回复完成后用服务端真实值（桌面端 BYOK 无积分概念） */}
            {(() => {
              if (IS_DESKTOP_APP) return null
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
                  className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-zinc-300 dark:text-zinc-600 select-none"
                  title={tip}
                >
                  <IconLightning className="w-3 h-3" />
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
                    <IconCheckOne size={13} strokeWidth={2} className="text-[#059669] shrink-0" />
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
              {/* 📎 用户上传的文档：放在正文之上，作为「这条消息的对象」先亮出来。
                  没有它，用户只会看到一句「帮我改一下这份报告」，却看不到自己到底传了哪份。 */}
              {msg.documents?.length ? (
                <DocumentCardList documents={msg.documents} className="mb-2" variant="onFilled" />
              ) : null}
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

  /**
   * 回溯「本条 AI 消息之前最近的一条带图用户消息」，取它的第一张图。
   *
   * 用途：`<DIAGNOSIS>` 诊断卡要拿这张原图当底图，才能在病害部位上画检测框与遮罩。
   * 之前卡片拿不到图，于是只有文字结论 —— 用户看不出病在哪，等于没标。
   *
   * 🚨 索引口径（2026-10-04 修）：入参必须是 **原始 messages 数组的下标**（origIdx），
   *    不能传 `items`/`extraInfo.index`。后者是按 `indexedFiltered`（剔除 isSilent +
   *    PAST_MEMORY）重新编号的，而这里原先拿 `filteredMessages`（只剔除 isSilent）去索引 ——
   *    只要会话里存在一条历史记忆摘要消息，两边就错位：轻则取到别的图，
   *    重则整个找不到 → `DiagnosisCard` 的 `imageSrc` 为 undefined →
   *    卡片里的 `DetectionOverlay` 整块不渲染 → **用户只看到文字结论，一张图都没有**。
   */
  const nearestUserImageBefore = React.useCallback(
    (fromOrigIndex: number): string | undefined => {
      for (let i = fromOrigIndex - 1; i >= 0; i--) {
        const m = messages[i]
        if (!m || m.role !== "user") continue
        const c: any = m.content
        if (Array.isArray(c)) {
          const hit = c.find(
            (p: any) => p?.type === "image_url" && typeof p?.image_url?.url === "string",
          )
          if (hit) return hit.image_url.url as string
        } else if (typeof c === "string") {
          // 兜底：少数路径把整条多模态内容 JSON 化塞进了字符串
          const matched = c.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/)
          if (matched) return matched[0]
        }
      }
      return undefined
    },
    [messages],
  )

  // 构造导航项：每条消息一项（包含用户 + AI）
  const navItems: MessageNavItem[] = filteredMessages
    .filter((m) => !isMemorySummary(m))
    .map((m, i) => ({
      id: `msg-${i}`,
      preview: extractPreview(m.content, 50),
    }))

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
      {/* AI 回复「裸文本」化（2026-10-01）：抹掉 outlined 变体的边框 / 底色 /
          阴影 / 内距 / 圆角。作用域锁在 .ai-bubble-bare 上，不影响用户气泡
          （用户侧是 filled，另一套类名）也不影响落地页里其他 Bubble.List。 */}
      <style>{`
        .ai-bubble-bare .ant-bubble-content-outlined {
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }
        /* 🔥 2026-10-14 用户：「AI 文本区域太窄，容纳不了多少字」——
           元凶不是容器宽度，是 antd X Bubble.List 内置给 start/end 气泡预留的
           15% 内侧留白（见 @ant-design/x/es/bubble/style/list.js）：
           它在 AI 气泡右侧白扔了约 161px（1072 × 15%），
           于是 AI 气泡看着有 911px，真正能落字的只有 750px。
           只清 AI 侧（start）；用户气泡（end）的左侧留白是「右对齐短气泡」的
           设计感来源，保留不动。 */
        .ant-bubble-list .ant-bubble-start:not(.ant-bubble-divider):not(.ant-bubble-system) {
          padding-inline-end: 0 !important;
        }
      `}</style>
      {/* 🔥 消息节点导轨（重做 2026-10-22）：贴对话区右缘的绝对定位浮层。
          之所以不再是 flex item —— 旧版是左侧一列会被 active 宽度撑开的圆点，
          每次切换节点整列宽度就变，对话区被推来推去导致文字重排（用户报的「抖动」）。
          现在是浮层：收起时只有一缕短横线，悬停向左展开成预览卡片，不占布局。 */}
      {navItems.length > 1 && (
        <MessageNavDots
          items={navItems}
          scrollContainerRef={listRef}
          darkMode={darkMode}
        />
      )}
      {/* 可滚动消息列表 */}
      <div
        ref={listRef}
        data-lenis-prevent
        style={{ flex: 1, overflow: "auto", minHeight: 0 }}
      >
        {/* 2026-10-14 用户：「把对话区域拉宽一点，这样可以容纳更多文字，
            就不用频繁上下滑」。960 → 1120（+17% 行容量）：
            960 是旧参考稿的卡宽基准，但宽屏（≥1440，侧栏 260）下主区实测还有
            ~820px 白白空着，纯属浪费。1120 在 1280 视口仍受父容器自然约束，
            不会溢出；窄视口下 maxWidth 只是上限，自动回退，无副作用。
            ⚠️ 与 ChatSenderInput 的 1120 必须保持一致（两处同源，改一处必改另一处）。 */}
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 16px 90px" }}>
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
