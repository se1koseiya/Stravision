"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { ConfigProvider, App, theme, Segmented, Button as AntButton, Menu, Avatar as AntAvatar, Layout as AntLayout, Space, Tooltip, Dropdown, Modal, Input, Drawer } from "antd"
import type { ConversationsProps } from "@ant-design/x"
import { Conversations, Prompts, Bubble, Sender, Attachments, Think, ThoughtChain, Actions } from "@ant-design/x"
import type { PromptsProps } from "@ant-design/x"
import zhCN from "antd/locale/zh_CN"
import type { UserPublic } from "@/lib/db/user-service"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import dynamic from "next/dynamic"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input as ShadcnInput } from "@/components/ui/input"
import { Button as ShadcnButton } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
} from "@/components/ui/assistant-ui"

import { motion, AnimatePresence } from "framer-motion"

import { AISettingsDialog } from "@/components/ai-settings-dialog"
import { DynamicModelSelector } from "@/components/ai/dynamic-model-selector"
import { MobileMessageContent } from "@/components/ai/mobile-message-content"
import { MedicalRecordsPanel } from "@/components/ai/medical-records-panel"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { useAIModels } from "@/lib/hooks/use-ai-models"
import { cn } from "@/lib/utils"
import { sanitizeHtml } from "@/lib/security/sanitize-html"
import XMarkdown from "@ant-design/x-markdown"
import { toast } from "@/lib/ui/feedback"
import BerryOrb from "@/components/smoothui/berry-orb"
import { IconArrowDown, IconArrowRight, IconArrowRightUp, IconArrowUp, IconAttention, IconBookshelf, IconBrain, IconCamera, IconCaution, IconChartHistogram, IconChartLine, IconCheck, IconCheckOne, IconComment, IconCompass, IconCopy, IconCpu, IconCrown, IconDelete, IconDownload, IconEdit, IconEmotionHappy, IconFileText, IconFolderOpen, IconFolderUpload, IconGlobe, IconHamburgerButton, IconHelp, IconHistory, IconHome, IconInfo, IconLayoutTwo, IconLight, IconLightning, IconLinkOut, IconList, IconLoading, IconMagic, IconMagicWand, IconMicrophone, IconMoon, IconMore, IconNotebook, IconPause, IconPencil, IconPhone, IconPicture, IconPin, IconPlay, IconPlus, IconPreviewOpen, IconRefresh, IconRight, IconRocket, IconRound, IconSearch, IconSeedling, IconSend, IconSetting, IconShare, IconSignal, IconSun, IconThunderbolt, IconTime, IconTrendingUp, IconUndo, IconUp, IconUser, IconVoiceOff, IconVolumeMute, IconVolumeNotice } from "@/components/icon";

// 参考来源展示组件（符合Ant Design X设计规范）
function CitationSources({
  citations,
  darkMode,
  expanded = false,
  onToggle,
}: {
  citations?: Citation[]
  darkMode: boolean
  expanded?: boolean
  onToggle?: () => void
}) {
  if (!citations || citations.length === 0) return null
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mt-2 rounded-xl overflow-hidden border",
        darkMode ? "bg-zinc-900 border-zinc-700" : "bg-zinc-50 border-zinc-200"
      )}
    >
      {/* 参考来源头部 */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 transition-colors",
          darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-100"
        )}
      >
        <div className="flex items-center gap-2">
          <IconBookshelf size={14} className="text-emerald-500" />
          <span className="text-xs font-medium opacity-70">参考来源</span>
          <span className="text-xs opacity-50">{citations.length}个</span>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
          <IconUp size={14} className="opacity-50" />
        </motion.div>
      </button>
      
      {/* 参考来源列表 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3 pb-2 space-y-2"
          >
            {citations.map((citation, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-lg",
                  darkMode ? "bg-zinc-800" : "bg-white"
                )}
              >
                <span className={cn(
                  "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                  darkMode ? "bg-zinc-700 text-zinc-300" : "bg-zinc-200 text-zinc-600"
                )}>
                  {citation.number}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "text-xs font-medium truncate block",
                      darkMode ? "text-zinc-300 hover:text-emerald-400" : "text-zinc-700 hover:text-emerald-600"
                    )}
                  >
                    {citation.title}
                  </a>
                  {citation.description && (
                    <p className={cn(
                      "text-xs mt-0.5 line-clamp-2",
                      darkMode ? "text-zinc-500" : "text-zinc-500"
                    )}>
                      {citation.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Interfaces
interface Citation {
  number: string
  title: string
  url: string
  description?: string
  quote?: string
}

interface TaskItemModel { type: "text" | "file"; text: string; file?: { name: string; icon?: string } }
interface TaskModel { title: string; items: TaskItemModel[]; status: "pending" | "in_progress" | "completed" }

interface Message {
  role: "user" | "assistant"
  content: string | Array<{ type: 'text' | 'image_url', text?: string, image_url?: { url: string } }>
  citations?: Citation[]
  reasoning?: { text: string; durationMs?: number }
  /** 思考块是否仍在流式（`<REASONING>` 未闭合）—— 对齐 PC 端：思考期间正文不上屏 */
  reasoningStreaming?: boolean
  tasks?: TaskModel[]
}

interface AISettings {
  apiKey: string
  apiUrl: string
  model: string
  systemPrompt: string
}

interface SessionMeta { id: string; title: string; createdAt: number; updatedAt: number }

// ---------------------------------------------------------------------------
// 新消息分隔线 — 与 PC 端一致，区分历史消息和本次会话新增的消息
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

// ChatBubbleList组件 - 使用antdesignx的Bubble组件（深度优化版）
// ---------------------------------------------------------------------------
// MobileDeepThinking — 移动端推理过程展示（对齐 PC 端 DeepThinking：灰底胶囊 + 左侧细线）
// 折叠策略（2026-10-22 串行化）：思考流式中展开跟随；**思考一闭合立刻折叠** ——
// 正文此刻才开始上屏，思考与正文永不同屏。用户手动点过的选择永久优先。
// ---------------------------------------------------------------------------
function MobileDeepThinking({
  reasoning,
  isThinking,
}: {
  reasoning?: { text: string; durationMs?: number }
  /** 思考块是否仍在流式（未闭合） */
  isThinking?: boolean
}) {
  // null = 用户未手动干预（此时由"思考流式展开 / 闭合即折叠"驱动）
  const [userChoice, setUserChoice] = useState<boolean | null>(null)
  const [scrollable, setScrollable] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // 思考开始流式 → 重置用户选择
  useEffect(() => {
    if (isThinking) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserChoice(null)
    }
  }, [isThinking])

  // 展开态 = 思考是否正在流式（纯派生值，避免 effect 落地慢一帧导致同屏）
  const expanded = userChoice ?? isThinking === true

  const toggle = () => setUserChoice((prev) => !(prev ?? expanded))

  // 自动滚到底部：跟随流式最新思考，完成后停在末尾便于回看
  useEffect(() => {
    if (!expanded) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [reasoning?.text, expanded, isThinking])

  // 内容超出限高时才启用上下渐隐遮罩
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !expanded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScrollable(false)
      return
    }
    const check = () => setScrollable(el.scrollHeight > el.clientHeight + 1)
    check()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [expanded, reasoning?.text])

  if (!reasoning?.text) return null

  const isDone = !isThinking && reasoning.text.length > 0
  const duration = reasoning.durationMs ? `${(reasoning.durationMs / 1000).toFixed(1)}s` : null

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={toggle}
        title={expanded ? "折叠思考过程" : "展开思考过程"}
        className="group/think inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3.5 py-2 text-[13px] leading-5 text-zinc-700 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700/70 transition-colors"
        style={{ fontWeight: 400 }}
      >
        <IconRound
          size={14}
          className={cn("shrink-0 text-zinc-500 dark:text-zinc-400", isThinking && "animate-pulse")}
        />
        <span>深度思考</span>
        {duration && isDone && (
          <span className="text-zinc-400 dark:text-zinc-500">· {duration}</span>
        )}
        <IconUp
          size={14}
          className={cn(
            "shrink-0 text-zinc-500 dark:text-zinc-400 transition-transform duration-200",
            !expanded && "rotate-180"
          )}
        />
      </button>
      {expanded && (
        <div
          ref={scrollRef}
          className={cn(
            "berry-think-panel mt-2 ml-1.5 pl-3.5 pr-1.5 overflow-y-auto overscroll-contain text-[14px] leading-[1.8] text-[#8f959e] dark:text-zinc-400 whitespace-pre-wrap break-words",
            scrollable && "berry-think-panel--faded"
          )}
          style={{ maxHeight: 280 }}
          data-lenis-prevent
        >
          {reasoning.text}
          {isThinking && (
            <span className="inline-block w-1.5 h-4 bg-[#059669]/70 animate-pulse rounded-lg ml-0.5 align-middle" />
          )}
        </div>
      )}
    </div>
  )
}

// 深度思考兜底：content 里若残留 <REASONING> 原始块（标签式思考未被剥离），
// 抽出来交给 MobileDeepThinking 渲染，并从正文剥离（与 PC 端 ChatMessageRenderer 同逻辑）
function splitReasoningFromContent(
  rawContent: string,
  reasoning?: { text: string; durationMs?: number }
): { content: string; reasoning?: { text: string; durationMs?: number }; streaming: boolean } {
  if (!rawContent || !rawContent.includes("<REASONING>")) {
    return { content: rawContent, reasoning, streaming: false }
  }
  // 最后一个 <REASONING> 还没等到 </REASONING> ⇒ 思考仍在流式
  const streaming = rawContent.lastIndexOf("<REASONING>") > rawContent.lastIndexOf("</REASONING>")
  const blocks: string[] = []
  const stripped = rawContent.replace(
    /<REASONING>([\s\S]*?)(?:<\/REASONING>|$)/g,
    (_m, inner: string) => {
      blocks.push(inner)
      return ""
    }
  )
  const clean = stripped.replace(/<\/?REASONING>/g, "").replace(/^\s*\n+/, "").trim()
  const innerText = blocks.join("\n\n").trim()
  return {
    content: clean,
    reasoning:
      innerText && !reasoning?.text
        ? { text: innerText, durationMs: reasoning?.durationMs }
        : reasoning,
    streaming,
  }
}

function ChatBubbleList({
  messages,
  isLoading,
  darkMode,
  onTtsSpeak,
  onRegenerate,
  onDeleteMessage,
  onQuoteMessage,
  deviceData,
  onExecuteCommand,
  onSendMessage,
  onSetInput,
  onOpenStudio,
  newMessageBoundary = 0,
  sessionId,
}: {
  messages: Message[]
  isLoading: boolean
  darkMode: boolean
  onTtsSpeak?: (text: string) => void
  onRegenerate?: () => void
  onDeleteMessage?: (index: number) => void
  onQuoteMessage?: (text: string) => void
  deviceData?: any
  onExecuteCommand?: (command: any) => Promise<void>
  onSendMessage?: (text: string) => void
  onSetInput?: (text: string) => void
  onOpenStudio?: (title: string, html: string) => void
  /** 🔥 本次会话新消息分隔线索引（messages 数组中的原始 index） */
  newMessageBoundary?: number
  /** 当前会话 id。诊断卡据此入病历档案；没有就不入档（不影响卡片显示） */
  sessionId?: string
}) {
  // 状态管理
  const [expandedCitations, setExpandedCitations] = useState<Record<number, boolean>>({})
  const [feedbackState, setFeedbackState] = useState<Record<number, 'like' | 'dislike' | 'default'>>({})
  const [audioStatus, setAudioStatus] = useState<Record<number, 'loading' | 'error' | 'running' | 'default'>>({})
  
  // 角色配置 - 通过 roles 统一定义不同角色的气泡样式（参考 Bubble 文档）
  // 用户气泡：靠右、圆角、品牌绿色，与 AI 明显区分
  const roles = {
    user: {
      placement: 'end' as const,
      variant: 'shadow' as const,
      shape: 'round' as const,
      styles: {
        content: {
          backgroundColor: '#059669',
          color: '#ffffff',
          padding: '10px 16px',
          fontSize: 14,
          lineHeight: 1.6,
          borderRadius: 18,
          boxShadow: '0 1px 2px rgba(0,148,86,0.2)',
        },
      },
    },
    ai: {
      placement: 'start' as const,
      variant: 'filled' as const,
      shape: 'default' as const,
      styles: {
        content: {
          backgroundColor: darkMode ? '#27272a' : '#ffffff',
          color: darkMode ? '#f4f4f5' : '#18181b',
          padding: '12px 16px',
          fontSize: 14,
          lineHeight: 1.6,
          borderRadius: 16,
          border: darkMode ? '1px solid #3f3f46' : '1px solid #e4e4e7',
        },
      },
    },
  }

  // AI 消息底部插槽：参考来源 + 操作按钮
  const renderAiFooter = (msg: Message, index: number, content: string) => (
    <div className="space-y-2 mt-2">
      {/* 参考来源展示 */}
      {msg.citations && msg.citations.length > 0 && (
        <CitationSources
          citations={msg.citations}
          darkMode={darkMode}
          expanded={expandedCitations[index]}
          onToggle={() => setExpandedCitations(prev => ({ ...prev, [index]: !prev[index] }))}
        />
      )}
      
      {/* 结果应用操作 - 使用Ant Design X的Actions组件 */}
      <div className="flex flex-wrap gap-2">
        <Actions.Copy text={content} />
        <Actions.Feedback
          value={feedbackState[index] || 'default'}
          onChange={(value) => setFeedbackState(prev => ({ ...prev, [index]: value }))}
        />
        <Actions.Audio
          status={audioStatus[index] || 'default'}
          onClick={() => {
            if (audioStatus[index] === 'running') {
              setAudioStatus(prev => ({ ...prev, [index]: 'default' }))
              onTtsSpeak?.('')
            } else {
              setAudioStatus(prev => ({ ...prev, [index]: 'running' }))
              onTtsSpeak?.(content)
            }
          }}
        />
        {index === messages.length - 1 && onRegenerate && (
          <Actions.Item label="重新生成" icon={<IconUndo size={14} />} onClick={onRegenerate} />
        )}
        {onQuoteMessage && (
          <Actions.Item label="引用" icon={<IconEdit size={14} />} onClick={() => onQuoteMessage(content)} />
        )}
        {onDeleteMessage && (
          <Actions.Item label="删除" icon={<IconDelete size={14} />} danger onClick={() => onDeleteMessage(index)} />
        )}
      </div>
    </div>
  )

  /**
   * 回溯「本条 AI 消息之前最近的一条带图用户消息」，取它的第一张图。
   *
   * 用途：`<DIAGNOSIS>` 诊断卡要拿这张原图当底图，才能在病害部位上画检测框与遮罩。
   * 拿不到图 → `imageSrc` 为 undefined → `DetectionOverlay` 整块不渲染 →
   * 用户只看到文字结论，等于没标。
   *
   * 🚨 索引口径：移动端不过滤 silent / PAST_MEMORY（boundary 直接对应 items 索引），
   *    所以这里的 index 就是原始 messages 下标，与 PC 端 `nearestUserImageBefore` 口径一致。
   */
  const nearestUserImageBefore = React.useCallback(
    (fromIndex: number): string | undefined => {
      for (let i = fromIndex - 1; i >= 0; i--) {
        const m = messages[i]
        if (!m || m.role !== "user") continue
        const c: any = m.content
        if (Array.isArray(c)) {
          const hit = c.find(
            (p: any) => p?.type === "image_url" && typeof p?.image_url?.url === "string"
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
    [messages]
  )

  const items = messages.map((msg, index) => {
    const rawContent = typeof msg.content === 'string' ? msg.content : 
      msg.content.map(c => c.type === 'text' ? c.text : '').join('')
    // 深度思考兜底：content 里若残留 <REASONING> 原始块，抽出来交给 MobileDeepThinking
    const normalized = splitReasoningFromContent(rawContent, msg.reasoning)
    const reasoning = normalized.reasoning
    // 🧠 串行化：思考未闭合 ⇒ 正文不上屏（与 PC 端一致：先思考、后主文本）
    const reasoningStreaming =
      isLoading && index === messages.length - 1
        ? (msg.reasoningStreaming ?? normalized.streaming)
        : false
    const content = reasoningStreaming ? "" : normalized.content
    
    if (msg.role === 'assistant') {
      return {
        key: index.toString(),
        role: 'ai',
        placement: 'start' as const,
        avatar: <BerryOrb size="36px" theme={darkMode ? 'dark' : 'light'} isActive={isLoading && index === messages.length - 1} />,
        // 头部插槽：思考过程（对齐 PC 端：流式展开、完成折叠、显示耗时）
        header: reasoning ? (
          <MobileDeepThinking
            reasoning={reasoning}
            isThinking={reasoningStreaming}
          />
        ) : undefined,
        // 主内容：手机端业务卡片 + Markdown 渲染
        content: (
          <MobileMessageContent
            content={content}
            msg={msg}
            deviceData={deviceData}
            isStreaming={isLoading && index === messages.length - 1}
            onExecuteCommand={onExecuteCommand || (async () => {})}
            onRetryCommand={(errMsg) => onSendMessage?.(errMsg)}
            onSendMessage={onSendMessage || (() => {})}
            onSetInput={onSetInput || (() => {})}
            onOpenStudio={onOpenStudio}
            /* 只有这条消息真含诊断结论时才回溯原图 —— 其余消息保持无谓渲染最小化。
               ⚠️ 必须传 messages 原始下标 index，不能传别处的相对序号。 */
            diagnosisImageSrc={rawContent.includes("<DIAGNOSIS") ? nearestUserImageBefore(index) : undefined}
            diagnosisSessionId={sessionId}
            diagnosisMessageKey={rawContent.includes("<DIAGNOSIS") ? String(index) : undefined}
          />
        ),
        // 底部插槽：参考来源 + 操作
        footer: renderAiFooter(msg, index, content),
        // 流式加载状态（有思考面板时不显示 loading，避免和思考面板抢位置）
        loading: isLoading && index === messages.length - 1 && !content && !reasoning,
      }
    }
    
    // 用户消息
    return {
      key: index.toString(),
      role: 'user',
      placement: 'end' as const,
      content,
    }
  })

  // 加载状态：最后一条是用户消息时，追加一个加载中的 AI 气泡（使用 Bubble 原生 loading）
  const showLoadingBubble = isLoading && messages[messages.length - 1]?.role === 'user'
  if (showLoadingBubble) {
    items.push({
      key: 'loading',
      role: 'ai',
      avatar: <BerryOrb size="36px" theme={darkMode ? 'dark' : 'light'} isActive={true} />,
      loading: true,
      content: '',
    } as any)
  }

  // 🔥 新消息分隔线：移动端不过滤 silent 消息，boundary 直接对应 items 索引
  const hasBoundary = newMessageBoundary > 0
  const splitIdx = hasBoundary ? newMessageBoundary : -1
  // 仅当分割点 > 0（存在历史消息）且 < 总数（存在新消息）时显示分隔线
  const showNewMessageDivider = splitIdx > 0 && splitIdx < items.length

  return (
    <div className="flex flex-col gap-4 p-4">
      {showNewMessageDivider ? (
        <>
          <Bubble.List items={items.slice(0, splitIdx)} roles={roles} />
          <NewMessageDivider />
          <Bubble.List items={items.slice(splitIdx)} roles={roles} />
        </>
      ) : (
        <Bubble.List items={items} roles={roles} />
      )}
    </div>
  )
}

// ChatSenderInput组件 - 使用antdesignx的Sender组件
function ChatSenderInput({
  input,
  setInput,
  onSend,
  isLoading,
  darkMode,
  attachments,
  onSelectFiles,
  onRemoveAttachment,
  approvalMode,
  setApprovalMode,
  enableReasoning,
  setEnableReasoning,
  enableSearch,
  setEnableSearch,
}: {
  input: string
  setInput: (value: string) => void
  onSend: (text: string) => void
  isLoading: boolean
  darkMode: boolean
  attachments: string[]
  onSelectFiles: React.ChangeEventHandler<HTMLInputElement>
  onRemoveAttachment: (index: number) => void
  approvalMode?: "request" | "auto" | "full"
  setApprovalMode?: (mode: "request" | "auto" | "full") => void
  enableReasoning?: boolean
  setEnableReasoning?: (v: boolean) => void
  enableSearch?: boolean
  setEnableSearch?: (v: boolean) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  
  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  // 权限模式配置
  const approvalModes = [
    { key: "request", label: "请求批准", desc: "执行前确认" },
    { key: "auto", label: "替我审批", desc: "仅高风险确认" },
    { key: "full", label: "完全访问", desc: "自主执行" },
  ]

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50",
      // 🚨 底部吃掉 Home Indicator（viewport-fit=cover 后 env() 才有值）
      "pb-[max(env(safe-area-inset-bottom),8px)]",
      darkMode ? "bg-zinc-900" : "bg-white"
    )}>
      {/* + 展开面板 */}
      <AnimatePresence>
        {plusMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              "mx-4 mb-2 rounded-2xl p-4 shadow-lg border",
              darkMode ? "bg-zinc-800 border-zinc-700" : "bg-zinc-50 border-zinc-200"
            )}
          >
          {/* 添加照片和文件 */}
          <button
            onClick={() => {
              handleFileClick()
              setPlusMenuOpen(false)
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
              darkMode ? "hover:bg-zinc-700" : "hover:bg-zinc-100"
            )}
          >
            <IconPlus style={{ fontSize: 16 }} />
            <span className="text-sm font-medium">添加照片和文件</span>
          </button>

          {/* 权限模式切换 */}
          {setApprovalMode && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium opacity-70">权限模式</span>
              </div>
              <div className="flex gap-2">
                {approvalModes.map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setApprovalMode(mode.key as any)}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                      approvalMode === mode.key
                        ? "bg-emerald-500 text-white"
                        : darkMode
                          ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
        )}
      </AnimatePresence>

      {/* 顶部功能徽章 */}
      <div className="flex items-center gap-2 px-4 pt-2 flex-wrap">
        {setEnableReasoning && (
          <Sender.Switch
            icon={<IconThunderbolt />}
            checkedChildren="深度推理：开"
            unCheckedChildren="深度推理"
            value={enableReasoning}
            onChange={(checked) => setEnableReasoning(checked)}
          />
        )}
        {setEnableSearch && (
          <Sender.Switch
            icon={<IconSearch />}
            checkedChildren="全网搜索：开"
            unCheckedChildren="全网搜索"
            value={enableSearch}
            onChange={(checked) => setEnableSearch(checked)}
          />
        )}
      </div>

      {/* 附件预览 */}
      {attachments.length > 0 && (
        <div className="flex gap-2 px-4 pt-2 overflow-x-auto">
          {attachments.map((url, index) => (
            <div key={index} className="relative size-14 rounded-lg overflow-hidden shrink-0">
              <Image src={url} alt="attachment" fill className="object-cover" />
              <button
                onClick={() => onRemoveAttachment(index)}
                className="absolute top-1 right-1 size-4 rounded-full bg-red-500 text-white flex items-center justify-center"
              >
                <IconDelete size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 输入区域 - 无边框 */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* + 按钮 */}
        <AntButton 
          type="text" 
          icon={<IconPlus />} 
          onClick={() => setPlusMenuOpen(!plusMenuOpen)}
          size="middle"
          className={cn(
            plusMenuOpen && "bg-emerald-500/20"
          )}
        />
        
        {/* 输入框 */}
        <div className={cn(
          "flex-1 flex items-center rounded-2xl px-4",
          darkMode ? "bg-zinc-800" : "bg-zinc-100"
        )}>
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            className="flex-1 bg-transparent border-0 outline-none text-sm py-2"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend(input)}
          />
        </div>
        
        {/* 发送按钮 */}
        <AntButton 
          type="primary" 
          icon={<IconSend size={16} />}
          loading={isLoading}
          onClick={() => onSend(input)}
          disabled={!input.trim() && attachments.length === 0}
          size="middle"
          style={{ borderRadius: 20 }}
        />
      </div>

      {/* 底部 AI 生成提示 */}
      <div className="text-center pb-1.5">
        <span className={cn("text-[11px]", darkMode ? "text-zinc-700" : "text-zinc-300")}>
          内容由 AI 生成
        </span>
      </div>
      
      <input 
        ref={fileInputRef}
        type="file" 
        multiple 
        accept="image/*"
        className="hidden" 
        onChange={onSelectFiles}
      />
    </div>
  )
}

// MateChatHome组件 - 首页视图（使用Ant Design X的Welcome组件）
function MateChatHome({
  darkMode,
  onSendMessage,
}: {
  darkMode: boolean
  onSendMessage: (msg: string) => void
}) {
  const quickActions = [
    { label: '种植诊断', description: '草莓叶片发黄、果实异常？帮我看看', action: '我的草莓叶片边缘发黄，可能是什么原因？该如何处理？', icon: <IconLight style={{ color: '#FFD700' }} />, color: '#FFD700' },
    { label: '环境调控', description: '温湿度、光照、土壤数据一键分析', action: '帮我分析当前大棚的温湿度和光照数据，给出环境调控建议', icon: <IconInfo style={{ color: '#1890FF' }} />, color: '#1890FF' },
    { label: '病虫害防治', description: '识别病虫害并推荐绿色防控方案', action: '最近发现草莓植株上有白色粉末，是什么病害？如何绿色防治？', icon: <IconRocket style={{ color: '#059669' }} />, color: '#059669' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section - 自定义欢迎页面 */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* BerryOrb图标 */}
        <div className="flex justify-center mb-6">
          <BerryOrb size="80px" theme={darkMode ? 'dark' : 'light'} isActive={false} />
        </div>
        
        {/* 标题 */}
        <h2 
          style={{ color: darkMode ? '#ffffff' : '#18181B' }}
          className="text-2xl font-bold mb-3"
        >
          莓小智
        </h2>
        
        {/* 描述 */}
        <p 
          style={{ color: darkMode ? '#d4d4d8' : '#52525b' }}
          className="text-sm leading-relaxed text-center max-w-sm"
        >
          你好，我是莓小智，你的智慧农业环境管家。我可以帮你分析环境数据、检查设备状态、解答病害问题、提供种植建议。
        </p>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-10">
        <Prompts
          title="✨ 灵感火花与小贴士"
          wrap
          styles={{
            item: { padding: '12px 16px', fontSize: 14, borderRadius: 12 },
            title: { fontSize: 14, marginBottom: 8 },
            icon: { fontSize: 16 },
            description: { fontSize: 13 },
          }}
          items={quickActions.map((item, index) => ({
            key: index.toString(),
            icon: item.icon,
            label: item.label,
            description: item.description,
          }))}
          onItemClick={(info) => {
            const action = quickActions[parseInt(info.key)]
            onSendMessage(action.action)
          }}
        />
      </div>
    </div>
  )
}

export default function AIAssistantIOSPage() {
  return (
    <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-zinc-950 text-emerald-400">Loading AI Assistant...</div>}>
      <AIAssistantIOSContent />
    </React.Suspense>
  )
}

function AIAssistantIOSContent() {
  const router = useRouter()
  // 「我的」页的病历入口跳到 ?panel=records；读一次即用，不必留在 URL 上
  const searchParams = useSearchParams()
  const [user, setUser] = useState<UserPublic | null>(null)
  // 配额状态
  const [quotaInfo, setQuotaInfo] = useState<{ daily_limit: number; daily_usage: number; balance: number; reason?: string } | null>(null)
  
  // Chat State
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  // 🔥 本次会话新消息分隔线：与 PC 端一致，区分历史消息和本次新增消息
  const [newMessageBoundary, setNewMessageBoundary] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>("")
  // 病历面板（诊断自动归档 + 复诊闭环）。手机端全屏浮层，与 PC 同一组件同一数据源。
  const [medicalRecordsOpen, setMedicalRecordsOpen] = useState(false)
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  // 与 PC 端一致：拉取一次 providers 配置作为自动选择模型的兜底数据源
  const { config: aiConfig, loading: aiConfigLoading, getDefaultModelId } = useAIModels()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [enableSearch, setEnableSearch] = useState(false)
  // 🔥 深度思考默认开启（与 PC 端一致）：无需用户手动启用
  const [enableReasoning, setEnableReasoning] = useState(true)
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [attachments, setAttachments] = useState<string[]>([])
  const [approvalMode, setApprovalMode] = useState<"request" | "auto" | "full">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-approval-mode')
      if (saved === 'request' || saved === 'auto' || saved === 'full') {
        return saved
      }
    }
    return 'request'
  })
  
  // UI State
  // ===== 主题统一走全局 next-themes（与其他页面同一主题系统，2026-09-20）=====
  const { resolvedTheme, setTheme } = useTheme()
  const darkMode = resolvedTheme === "dark"

  // 一次性迁移：旧版页私有 localStorage["darkMode"]（boolean）→ next-themes["theme"]
  useEffect(() => {
    try {
      const legacy = localStorage.getItem("darkMode")
      if (legacy === null) return
      if (legacy === "true" && localStorage.getItem("theme") === null) {
        setTheme("dark")
      }
      localStorage.removeItem("darkMode")
    } catch { /* ignore */ }
  }, [setTheme])

  // 报告查看器状态
  const [reportViewer, setReportViewer] = useState<{ title: string; html: string } | null>(null)
  const onOpenStudio = (title: string, html: string) => {
    setReportViewer({ title, html })
  }

  // 我的报告列表（从 localStorage 读取，与 PC 端共享）
  type SpaceReport = { id: string; title: string; type: string; timestamp: number; html?: string }
  const [spaceReports, setSpaceReports] = useState<SpaceReport[]>(() => {
    if (typeof window === "undefined") return []
    try { return JSON.parse(localStorage.getItem("my-space-reports") || "[]") } catch { return [] }
  })
  const [reportsModalOpen, setReportsModalOpen] = useState(false)
  const [actionsModalOpen, setActionsModalOpen] = useState(false)

  // 打开报告列表时刷新数据
  const openReportsModal = () => {
    try { setSpaceReports(JSON.parse(localStorage.getItem("my-space-reports") || "[]")) } catch {}
    setReportsModalOpen(true)
  }

  // 删除报告
  const deleteSpaceReport = (id: string) => {
    setSpaceReports(prev => {
      const updated = prev.filter(r => r.id !== id)
      localStorage.setItem("my-space-reports", JSON.stringify(updated))
      return updated
    })
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mainScrollRef = useRef<HTMLDivElement>(null)
  const { deviceData } = useDeviceData()
  const { weatherData } = useWeatherContext()
  const [notices, setNotices] = useState<{ id: number; title: string; description?: string; variant?: 'loading'|'success'|'error'; expanded: boolean }[]>([])
  const noticeIdCounter = useRef(0)
  
  // TTS状态
  const [isSpeaking, setIsSpeaking] = useState(false)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  
  // TTS功能
  const handleTtsSpeak = (text: string) => {
    if (!text) {
      // 停止朗读
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }
    
    // 开始朗读
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1
    
    utterance.onend = () => {
      setIsSpeaking(false)
    }
    
    utterance.onerror = () => {
      setIsSpeaking(false)
      toast.error("朗读失败")
    }
    
    window.speechSynthesis.cancel() // 先停止之前的朗读
    window.speechSynthesis.speak(utterance)
    speechSynthesisRef.current = utterance
    setIsSpeaking(true)
    toast.success("开始朗读")
  }
  
  const showNotice = (title: string, description?: string, variant?: 'loading'|'success'|'error') => {
    const id = ++noticeIdCounter.current
    setNotices(prev => [...prev, { id, title, description, variant, expanded: false }])
    
    if (variant && variant !== 'loading') {
      setTimeout(() => {
        setNotices(prev => prev.filter(n => n.id !== id))
      }, 5000)
    }
  }

  const closeNotice = (id: number) => {
    setNotices(prev => prev.filter(n => n.id !== id))
  }

  // Fetch User + Quota
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (mounted && data?.authenticated && data?.user) setUser(data.user as UserPublic)
      } catch {}
      // 获取配额信息
      try {
        const qRes = await fetch("/api/user/settings")
        const qData = await qRes.json()
        if (mounted && qData?.quota) setQuotaInfo(qData.quota)
      } catch {}
    })()
    return () => { mounted = false }
  }, [])

  // Load Settings
  useEffect(() => {
    try {
      const s = localStorage.getItem("ai-settings")
      if (s) {
        const parsed = JSON.parse(s)
        setAiSettings(parsed)
        // 🚨 "auto" 是历史遗留值（模型选择器已无该入口），不要恢复成选中模型
        if (!selectedModel && parsed?.model && parsed.model !== "auto") setSelectedModel(parsed.model)
      }
      const es = localStorage.getItem("ai-enable-search")
      if (es) setEnableSearch(es === "true")
    } catch {}
  }, [])

  // 自动选择模型回退：admin 配置的 defaultModelId > useAIModels 第一个 enabled 模型
  // 触发时机：
  //   1) 用户刷新后 aiSettings?.model / selectedModel 均为空
  //   2) 已保存的 aiSettings?.model 不在 enabled 模型列表中（被禁用/删除）
  useEffect(() => {
    if (aiConfigLoading) return
    if (!aiConfig) return
    const enabledIds = new Set(aiConfig.models.filter(m => m.enabled).map(m => m.id))
    if (enabledIds.size === 0) return

    // localStorage 里残留的历史 "auto" 就地纠正为具体模型，避免每次冷启动都走一遍回退
    if (aiSettings?.model === "auto") {
      const fb = getDefaultModelId()
      if (fb) {
        try {
          const s = localStorage.getItem("ai-settings")
          const parsed = s ? JSON.parse(s) : {}
          parsed.model = fb
          localStorage.setItem("ai-settings", JSON.stringify(parsed))
          setAiSettings(parsed)
        } catch { }
      }
    }

    const current = selectedModel || aiSettings?.model || ""
    // "auto" 是历史遗留值：模型选择器已不再提供该入口（2026-10-27），一律纠正为具体模型
    if (current && current !== "auto" && enabledIds.has(current)) return

    const fallback = getDefaultModelId()
    if (!fallback || current === fallback) return
    console.log('[iOS AI Assistant] Fallback to default model:', fallback, '(was:', current || '<empty>', ')')
    setSelectedModel(fallback)
    if (typeof window !== 'undefined') {
      try {
        const s = localStorage.getItem("ai-settings")
        const parsed = s ? JSON.parse(s) : {}
        parsed.model = fallback
        localStorage.setItem("ai-settings", JSON.stringify(parsed))
        setAiSettings(parsed)
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiConfig, aiConfigLoading])

  // Load Sessions
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sessions")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data?.sessions)) {
            setSessions(data.sessions)
            const lastId = localStorage.getItem("ai-last-session-id")
            if (lastId && data.sessions.find((s: SessionMeta) => s.id === lastId)) {
              setSessionId(lastId)
            } else if (data.sessions.length > 0) {
              setSessionId(data.sessions[0].id)
            } else {
              createNewSession()
            }
          }
        }
      } catch {}
    })()
  }, [])

  // Load Messages
  useEffect(() => {
    if (!sessionId) return
    localStorage.setItem("ai-last-session-id", sessionId)
    ;(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          const msgs = Array.isArray(data?.messages) ? (data.messages as Message[]) : []
          setMessages(msgs.length > 0 ? msgs : [])
          // 🔥 历史消息加载完成：以当前数量为边界，之后新增的消息视为"新消息"
          setNewMessageBoundary(msgs.length)
          try {
            const draft = localStorage.getItem(`ai-input-draft-${sessionId}`)
            if (typeof draft === "string") setInput(draft)
          } catch {}
        }
      } catch {}
    })()
  }, [sessionId])

  // 深链接：?panel=records 直接开病历面板（「我的」页的病历入口就走这条）
  // 读一次就把 query 抹掉，避免用户关掉面板后又被路由变更重新弹出来。
  useEffect(() => {
    if (searchParams?.get("panel") !== "records") return
    setMedicalRecordsOpen(true)
    router.replace("/ai-assistant-ios", { scroll: false })
  }, [searchParams, router])

  // 深链接：?prompt=xxx 预填输入框（首页宫格「病害防治」等入口用）
  // 只填不发 —— 用户多半要补一张图，直接发出去等于发一条空消息。
  useEffect(() => {
    const p = searchParams?.get("prompt")
    if (!p) return
    const text = p === "diagnose" ? "请帮我诊断这张照片里的病虫害" : p
    setInput(text)
    router.replace("/ai-assistant-ios", { scroll: false })
  }, [searchParams, router])

  // Scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current && mainScrollRef.current) {
      mainScrollRef.current.scrollTop = mainScrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // 主题的 html.dark 类由 next-themes 统一管理，页面不再手动同步

  // Sync approval mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-approval-mode', approvalMode)
    }
  }, [approvalMode])

  const executeCommands = async (commands: any[]) => {
    if (!commands || commands.length === 0) return
    showNotice("正在执行指令...", `共发现 ${commands.length} 个操作`, "loading")

    for (const cmd of commands) {
      try {
        let res: Response
        if (cmd.action === "set_led") {
          res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set_led', r: cmd.r, g: cmd.g, b: cmd.b })
          })
        } else if (cmd.action === "toggle_relay") {
          res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_relay', device: cmd.device, value: cmd.value })
          })
        } else if (cmd.action === "control_camera" || cmd.action === "move_camera_and_look") {
          res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'control_camera', direction: cmd.direction, pulses: cmd.pulses || 1600 })
          })
        } else if (cmd.action === "reset_camera") {
          res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset_camera' })
          })
        } else if (cmd.action === "take_camera_snapshot") {
          res = await fetch('/api/ai/device-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'take_camera_snapshot' })
          })
        } else {
          continue
        }
        if (res.ok) {
          const deviceName = cmd.device === 5 ? "灌溉水泵" : cmd.device === 6 ? "环境风扇" : cmd.device === 7 ? "补光灯" : "设备"
          showNotice("调控成功 ✅", `${deviceName}操作已完成`, "success")
        } else {
          let err = ''
          try { const j = await res.json(); err = j?.error || '' } catch {}
          showNotice("调控失败", err || `请求错误 ${res.status}`, "error")
        }
      } catch (e) {
        showNotice("调控失败", "网络请求失败", "error")
      }
    }
  }

  const createNewSession = async () => {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `新会话 ${new Date().toLocaleString("zh-CN")}` })
      })
      if (res.ok) {
        const data = await res.json()
        setSessionId(data.id)
        setSessions(prev => [data, ...prev])
        setMessages([])
        // 🔥 新建会话：无历史消息，边界为 0
        setNewMessageBoundary(0)
      }
    } catch {}
  }

  const deleteSession = async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" })
      setSessions(prev => prev.filter(s => s.id !== id))
      if (sessionId === id) {
        if (sessions.length > 1) {
          const nextSession = sessions.find(s => s.id !== id)
          if (nextSession) setSessionId(nextSession.id)
        } else {
          createNewSession()
        }
      }
    } catch {}
  }

  const handleSend = async (overrideText?: any) => {
    const text = typeof overrideText === "string" ? overrideText : input
    if (!text.trim() || isLoading) return
    
    if (!aiSettings) { setSettingsOpen(true); return }

    const userMsg = text.trim()
    setInput("")
    setEnableSearch(false)

    let ensuredSessionId = sessionId
    if (!ensuredSessionId) {
      await createNewSession()
      const r = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `新会话 ${new Date().toLocaleString("zh-CN")}` }) })
      if (r.ok) {
        const s = await r.json()
        ensuredSessionId = s.id
        setSessionId(s.id)
        setSessions(prev => [s, ...prev])
      }
    }

    // Check for command execution
    if (userMsg === "是" || userMsg === "执行") {
      const lastAssistantMsg = messages[messages.length - 1]
      if (lastAssistantMsg && lastAssistantMsg.role === "assistant") {
        const jsonMatches = [...(lastAssistantMsg.content as string).matchAll(/```json\s*([\s\S]*?)```/g)]
        if (jsonMatches.length > 0) {
          const commands = []
          for (const match of jsonMatches) {
             try { commands.push(JSON.parse(match[1])) } catch {}
          }
          if (commands.length > 0) await executeCommands(commands)
        }
      }
      return
    }

    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      if (ensuredSessionId) {
        const current = sessions.find((s) => s.id === ensuredSessionId)
        if (current && current.title && current.title.startsWith("新会话")) {
           const cand = userMsg.slice(0, 24)
           await fetch(`/api/sessions/${ensuredSessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: cand }) })
           setSessions((prev) => prev.map((s) => (s.id === ensuredSessionId ? { ...s, title: cand } : s)))
        }
        
        await fetch(`/api/sessions/${ensuredSessionId}`, { 
           method: "PUT", 
           headers: { "Content-Type": "application/json" }, 
           body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }) 
        })
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel || aiSettings?.model,
          apiKey: aiSettings?.apiKey,
          apiUrl: aiSettings?.apiUrl,
          systemPrompt: aiSettings?.systemPrompt,
          sessionId: ensuredSessionId,
          enableSearch,
          enableReasoning,
        }),
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => "")
        let errorMsg = `API错误: ${res.status}`
        try {
          const errData = JSON.parse(errorText)
          if (errData?.error) errorMsg = typeof errData.error === "string" ? errData.error : JSON.stringify(errData.error)
          // 配额耗尽时同步更新配额状态并提示
          if (res.status === 403 && errData?.quota) {
            setQuotaInfo(errData.quota)
          }
        } catch {}
        showNotice("请求失败", errorMsg, "error")
        setIsLoading(false)
        return
      }

      // ⚠️ /api/chat 返回 SSE 流式响应（text/event-stream），不能用 res.json() 解析
      // 否则 JSON.parse 失败 → 抛错 → 显示“网络请求失败”
      const reader = res.body?.getReader()
      if (!reader) {
        showNotice("请求失败", "无响应数据", "error")
        setIsLoading(false)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let assistantContent = ""
      let reasoningText = ""
      let reasoningStartTs = 0
      const startTs = Date.now()

      // 先插入一条空的 assistant 消息，后续逐字更新实现流式效果
      setMessages(prev => [...prev, { role: "assistant", content: "" }])
      let lastRenderTs = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(":")) continue // skip keep-alive comments

          if (trimmed === "data: [DONE]") {
            continue
          }
          if (!trimmed.startsWith("data:")) continue

          const payload = trimmed.replace(/^data:\s*/, "")
          try {
            const data = JSON.parse(payload)

            // 后端显式错误
            if (data.error) {
              const errMsg = typeof data.error === "string" ? data.error : JSON.stringify(data.error)
              assistantContent += `\n\n⚠️ ${errMsg}`
              continue
            }

            // 推理过程（DeepSeek-R1 等）
            const reasoningDelta =
              data.choices?.[0]?.delta?.reasoning ||
              data.choices?.[0]?.delta?.reasoning_content ||
              data.reasoning
            if (reasoningDelta) {
              if (!reasoningStartTs) reasoningStartTs = Date.now()
              reasoningText += reasoningDelta
            }

            // 主内容增量
            const delta =
              data.choices?.[0]?.delta?.content ??
              data.choices?.[0]?.message?.content ??
              data.response ??
              data.content ??
              ""
            if (delta) {
              assistantContent += delta
              // 🧠 思考块是否仍未闭合（决定正文要不要上屏）
              const thinkingNow =
                assistantContent.lastIndexOf("<REASONING>") > assistantContent.lastIndexOf("</REASONING>")
              // 节流渲染（~30fps），避免每个 token 都触发 React 重渲染
              const now = Date.now()
              if (now - lastRenderTs > 33) {
                lastRenderTs = now
                setMessages(prev => {
                  const next = [...prev]
                  next[next.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                    reasoning: reasoningText
                      ? { text: reasoningText, durationMs: Date.now() - (reasoningStartTs || startTs) }
                      : undefined,
                    reasoningStreaming: thinkingNow,
                  }
                  return next
                })
              }
            }
          } catch {
            // 单行 JSON 解析失败时跳过，避免整段流中断
          }
        }
      }

      // 最终一次同步渲染，确保完整内容落地
      const finalReasoning = reasoningText
        ? { text: reasoningText, durationMs: Date.now() - (reasoningStartTs || startTs) }
        : undefined
      const finalMessages: Message[] = [
        ...newMessages,
        { role: "assistant", content: assistantContent || "（无内容）", reasoning: finalReasoning },
      ]
      setMessages(finalMessages)

      if (ensuredSessionId) {
        await fetch(`/api/sessions/${ensuredSessionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: finalMessages.map(m => ({ role: m.role, content: m.content })) })
        })
      }

      // Check for commands in response
      const jsonMatches = [...assistantContent.matchAll(/```json\s*([\s\S]*?)```/g)]
      if (jsonMatches.length > 0) {
        const commands = []
        for (const match of jsonMatches) {
          try { commands.push(JSON.parse(match[1])) } catch {}
        }
        if (commands.length > 0) {
          showNotice("发现控制指令", `检测到 ${commands.length} 个设备操作，回复"执行"以确认`, "loading")
        }
      }

    } catch (e) {
      console.error("Chat error", e)
      showNotice("请求失败", "网络请求失败", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const onSelectFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files
    if (!files) return
    const urls: string[] = []
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const url = ev.target?.result as string
        if (url) urls.push(url)
        if (urls.length === files.length) {
          setAttachments(prev => [...prev, ...urls])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const onRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // 按日期分组：今天 / 昨天 / 更早
  const getDateGroup = (timestamp: number): string => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000
    if (timestamp >= startOfToday) return '今天'
    if (timestamp >= startOfYesterday) return '昨天'
    return '更早'
  }

  // Conversations items for antdesignx - 带分组与操作菜单
  const conversationItems = sessions.slice(0, 50).map((s) => ({
    key: s.id,
    label: s.title,
    group: getDateGroup(s.updatedAt || s.createdAt),
  }))

  // 会话操作菜单配置（参考 Conversations 文档 menu 属性）
  const conversationMenu = (conversation: any) => ({
    items: [
      { key: 'delete', icon: <IconDelete />, label: '删除', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'delete') {
        deleteSession(String(conversation.key))
      }
    },
  })

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#059669',
          borderRadius: 12,
        },
      }}
    >
      <App>
        <div className={cn(
          "h-[100dvh] w-full overflow-hidden font-sans transition-colors duration-500 fixed inset-0",
          darkMode ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900"
        )}>
          {/* 简洁背景 - 纯白或深色 */}
          <div className={cn(
            "fixed inset-0 z-0 pointer-events-none",
            darkMode ? "bg-zinc-950" : "bg-white"
          )} />

          {/* Sidebar - 固定左侧，随 drawerOpen 滑入滑出 */}
          <aside
            className={cn(
              "fixed top-0 left-0 bottom-0 z-30 w-[320px] flex flex-col transition-transform duration-300 ease-out pt-[max(env(safe-area-inset-top),12px)]",
              darkMode ? "bg-[#18181b]" : "bg-[#fafafa]",
              drawerOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
          {/* Sidebar 内容：用户信息 + 会话管理 */}
          {/* 用户信息 + 快捷操作 一体化卡片（无边框无阴影） */}
            <div className={cn(
              "shrink-0 mx-3 mt-4 rounded-xl overflow-hidden",
              darkMode ? "bg-zinc-800" : "bg-white"
            )}>
              {/* 用户信息行 - 点击进入设置 */}
              <div
                onClick={() => { setDrawerOpen(false); setSettingsOpen(true) }}
                className={cn(
                  "flex items-center gap-3.5 p-5 cursor-pointer transition-colors active:scale-[0.99]",
                  darkMode ? "hover:bg-zinc-700/50" : "hover:bg-zinc-50"
                )}
              >
                {/* 头像 */}
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                  "ring-2 ring-zinc-200",
                  !user?.avatar_url && "bg-zinc-200 text-zinc-600"
                )}>
                  {user?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-semibold">{user?.username?.[0]?.toUpperCase() || "U"}</span>
                  )}
                </div>
                {/* 用户信息 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-[14px] font-semibold truncate", darkMode ? "text-zinc-100" : "text-zinc-900")}>
                      {user?.username || "用户"}
                    </span>
                  </div>
                  <div className={cn("text-xs mt-1", darkMode ? "text-zinc-500" : "text-zinc-400")}>
                    {user?.membership === 'plus' ? 'Plus 会员 · 无限使用' :
                     user?.membership === 'pro' ? 'Pro 会员 · 70次/天' :
                     '免费用户 · 升级解锁更多'}
                    {quotaInfo && quotaInfo.reason !== 'membership_required' && quotaInfo.daily_limit < 999999 && (
                      <span className="ml-1.5">
                        （今日 {quotaInfo.daily_usage}/{quotaInfo.daily_limit}
                        {quotaInfo.balance > 0 && <span className="text-[#059669]"> +{quotaInfo.balance}</span>}）
                      </span>
                    )}
                  </div>
                </div>
                <IconRight size={16} className={cn("shrink-0", darkMode ? "text-zinc-600" : "text-zinc-400")} />
              </div>

              {/* Divider */}
              <div className={cn("h-px mx-3", darkMode ? "bg-zinc-700" : "bg-zinc-100")} />

              {/* 快捷操作按钮组 - 三列均分，divider 分隔 */}
              <div className="flex items-stretch">
                <button
                  onClick={openReportsModal}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 py-3.5 transition-colors active:bg-zinc-100",
                    darkMode && "active:bg-zinc-700/50 hover:bg-zinc-700/30"
                  )}
                >
                  <IconFileText size={18} className={cn(darkMode ? "text-zinc-400" : "text-zinc-500")} />
                  <span className={cn("text-[11px]", darkMode ? "text-zinc-300" : "text-zinc-600")}>报告</span>
                </button>
                <div className={cn("w-px my-1.5", darkMode ? "bg-zinc-700" : "bg-zinc-100")} />
                <button
                  onClick={() => setActionsModalOpen(true)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 py-3.5 transition-colors active:bg-zinc-100",
                    darkMode && "active:bg-zinc-700/50 hover:bg-zinc-700/30"
                  )}
                >
                  <IconChartLine size={18} className={cn(darkMode ? "text-zinc-400" : "text-zinc-500")} />
                  <span className={cn("text-[11px]", darkMode ? "text-zinc-300" : "text-zinc-600")}>操作记录</span>
                </button>
                <div className={cn("w-px my-1.5", darkMode ? "bg-zinc-700" : "bg-zinc-100")} />
                <button
                  onClick={() => { setDrawerOpen(false); router.push("/farm-plans") }}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 py-3.5 transition-colors active:bg-zinc-100",
                    darkMode ? "hover:bg-zinc-700/30 active:bg-zinc-700/50" : "hover:bg-zinc-50"
                  )}
                >
                  <IconCrown size={18} className="text-emerald-600" />
                  <span className={cn("text-[11px]", darkMode ? "text-emerald-400" : "text-emerald-600")}>升级订阅</span>
                </button>
              </div>
            </div>

            {/* 历史对话列表 - 白色卡片（含标题） */}
            <div
              className={cn(
                "flex-1 overflow-y-auto mx-3 mt-4 mb-3 rounded-xl overflow-hidden flex flex-col",
                darkMode ? "bg-zinc-800" : "bg-white"
              )}
              data-lenis-prevent
            >
              {/* 卡片内标题 */}
              <div className={cn(
                "shrink-0 flex items-center gap-2 px-4 pt-3 pb-2",
                darkMode ? "text-zinc-500" : "text-zinc-400"
              )}>
                <span className="text-[11px] font-medium uppercase tracking-wider">会话管理</span>
                <div className={cn("flex-1 h-px", darkMode ? "bg-zinc-700" : "bg-zinc-100")} />
              </div>

              <Conversations
                activeKey={sessionId}
                onActiveChange={(key: string) => {
                  setSessionId(String(key))
                  setDrawerOpen(false)
                }}
                items={conversationItems}
                menu={conversationMenu}
                groupable={{
                  collapsible: true,
                  defaultExpandedKeys: ['今天', '昨天', '更早'],
                }}
                styles={{
                  item: { borderRadius: 8, padding: '10px 12px', margin: '4px 4px' },
                }}
              />
            </div>
          </aside>

          {/* 遮罩层 - 点击关闭 sidebar */}
          {drawerOpen && (
            <div
              className="fixed inset-0 z-20 bg-black/30 transition-opacity"
              onClick={() => setDrawerOpen(false)}
            />
          )}

          {/* 主面板 - 随 sidebar 展开向右滑动 */}
          <div
            className={cn(
              "absolute inset-0 z-10 flex flex-col transition-transform duration-300 ease-out",
              darkMode ? "bg-zinc-950" : "bg-white",
              drawerOpen ? "translate-x-[320px]" : "translate-x-0"
            )}
          >
          {/* Header —— 顶部吃掉灵动岛/状态栏（依赖根布局 viewport-fit=cover） */}
          <div className={cn(
            "shrink-0 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2 z-40",
            darkMode ? "bg-zinc-900/80 backdrop-blur-xl" : "bg-white/80 backdrop-blur-xl"
          )}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <AntButton 
                  type="text" 
                  icon={<IconHamburgerButton />} 
                  onClick={() => setDrawerOpen(true)}
                  size="large"
                />
                <div className="min-w-0 flex-1 max-w-[180px]">
                  <DynamicModelSelector value={selectedModel || aiSettings?.model || ""} onValueChange={setSelectedModel} />
                </div>
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                {/* 病历入口：诊断自动归档在这里，复诊时可回填疗效。
                    ⛔ 别删——移动端没有 PC 的侧边栏，这是它唯一的入口。 */}
                <AntButton
                  type="text"
                  icon={<IconNotebook size={18} />}
                  onClick={() => setMedicalRecordsOpen(true)}
                  size="large"
                  title="病历档案"
                />
                <AntButton
                  type="text"
                  icon={<IconEdit size={18} />}
                  onClick={() => createNewSession()}
                  size="large"
                  title="新对话"
                />
                <AntButton
                  type="text"
                  icon={darkMode ? <IconSun size={20} /> : <IconMoon size={20} />}
                  onClick={() => setTheme(darkMode ? "light" : "dark")}
                  size="large"
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div
            ref={mainScrollRef}
            className="flex-1 overflow-y-auto pt-2 pb-24 relative z-10"
            // 全站滚轮由 React Lenis 接管，它会 preventDefault 吞掉未标注容器的滚轮。
            // 聊天区是本页唯一的滚动容器，必须声明放行，否则手机上滚不动历史消息。
            data-lenis-prevent
          >
            {messages.length === 0 ? (
              <MateChatHome
                darkMode={darkMode}
                onSendMessage={(msg) => handleSend(msg)}
              />
            ) : (
              <ChatBubbleList
                messages={messages}
                isLoading={isLoading}
                darkMode={darkMode}
                newMessageBoundary={newMessageBoundary}
                sessionId={sessionId}
                deviceData={deviceData}
                onExecuteCommand={async (cmd) => { await executeCommands([cmd]) }}
                onSendMessage={(msg) => handleSend(msg)}
                onSetInput={(text) => setInput(text)}
                onOpenStudio={onOpenStudio}
                onTtsSpeak={handleTtsSpeak}
                onRegenerate={() => {
                  // 重新生成最后一条AI消息
                  const lastUserMessage = messages.filter(m => m.role === 'user').pop()
                  if (lastUserMessage) {
                    const userContent = typeof lastUserMessage.content === 'string' 
                      ? lastUserMessage.content 
                      : lastUserMessage.content.map(c => c.type === 'text' ? c.text : '').join('')
                    handleSend(userContent)
                  }
                }}
                onDeleteMessage={(index) => {
                  // 删除指定消息
                  setMessages(prev => prev.filter((_, i) => i !== index))
                  toast.success("消息已删除")
                }}
                onQuoteMessage={(text) => {
                  // 引用消息到输入框
                  setInput(prev => prev + `\n> ${text}\n\n`)
                  toast.success("已引用到输入框")
                }}
              />
            )}
            <div ref={messagesEndRef} />
            
            {/* Prompts after assistant message */}
            {messages.length > 0 && !isLoading && messages[messages.length - 1]?.role === "assistant" && (
              <div className="px-4 pb-4">
                <Prompts
                  title="你可能还想问："
                  vertical
                  styles={{
                    item: { padding: '8px 12px', fontSize: 13, borderRadius: 8 },
                    title: { fontSize: 13, marginBottom: 6 },
                    icon: { fontSize: 14 },
                    description: { fontSize: 12 },
                  }}
                  items={[
                    { key: "1", icon: <IconLight style={{ color: '#FFD700' }} />, description: "对上面的内容做进一步分析" },
                    { key: "2", icon: <IconInfo style={{ color: '#1890FF' }} />, description: "当前环境适合采取什么设备操作" },
                    { key: "3", icon: <IconRocket style={{ color: '#059669' }} />, description: "将分析结果生成可视化报告" },
                    { key: "4", icon: <IconEmotionHappy style={{ color: '#059669' }} />, description: "用几句话概括重点内容" },
                  ]}
                  onItemClick={(info) => {
                    handleSend(info.data.description || "")
                  }}
                />
              </div>
            )}
          </div>

          {/* Input */}
          <ChatSenderInput
            input={input}
            setInput={setInput}
            onSend={(text) => handleSend(text)}
            isLoading={isLoading}
            darkMode={darkMode}
            attachments={attachments}
            onSelectFiles={onSelectFiles}
            onRemoveAttachment={onRemoveAttachment}
            approvalMode={approvalMode}
            setApprovalMode={setApprovalMode}
            enableReasoning={enableReasoning}
            setEnableReasoning={setEnableReasoning}
            enableSearch={enableSearch}
            setEnableSearch={setEnableSearch}
          />

          {/* Settings Modal - 与 PC 端一致 */}
          <AISettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            user={user}
          />

          {/* 报告查看器 - 全屏 Drawer */}
          <Drawer
            title={
              <div className="flex items-center gap-2 min-w-0">
                <IconFileText size={16} className="text-emerald-500 shrink-0" />
                <span className="truncate text-sm font-medium">{reportViewer?.title || "报告"}</span>
              </div>
            }
            placement="right"
            open={!!reportViewer}
            onClose={() => setReportViewer(null)}
            width="100%"
            className={cn(darkMode && "dark")}
            styles={{
              body: { padding: 0, background: darkMode ? "#18181b" : "#fff" },
              header: { padding: "12px 16px", borderBottom: `1px solid ${darkMode ? "#27272a" : "#e4e4e7"}` },
            }}
            extra={
              <div className="flex items-center gap-1">
                <AntButton
                  type="text"
                  size="small"
                  icon={<IconDownload size={15} />}
                  onClick={() => {
                    if (!reportViewer) return
                    const blob = new Blob([reportViewer.html], { type: "text/html;charset=utf-8" })
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement("a")
                    link.href = url
                    link.download = `${reportViewer.title}_${Date.now()}.html`
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    URL.revokeObjectURL(url)
                    toast.success("报告已下载")
                  }}
                />
                <AntButton
                  type="text"
                  size="small"
                  icon={<IconLinkOut size={15} />}
                  onClick={() => {
                    if (!reportViewer) return
                    const newWindow = window.open("", "_blank")
                    if (newWindow) {
                      newWindow.document.write(reportViewer.html)
                      newWindow.document.close()
                    }
                  }}
                />
              </div>
            }
          >
            {reportViewer && (
              <div className="h-full overflow-y-auto">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none p-4"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(reportViewer.html) }}
                />
              </div>
            )}
          </Drawer>

          {/* 我的报告列表 Modal */}
          <Modal
            title="我的报告"
            open={reportsModalOpen}
            onCancel={() => setReportsModalOpen(false)}
            footer={null}
            className={cn(darkMode && "dark")}
            width="100%"
            style={{ top: 20, maxWidth: 500, margin: "0 auto" }}
            styles={{
              body: { padding: 0, maxHeight: "70vh", overflow: "auto" },
            }}
          >
            {spaceReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <IconFileText size={40} className={cn("mb-3", darkMode ? "text-zinc-700" : "text-zinc-300")} />
                <p className={cn("text-sm", darkMode ? "text-zinc-500" : "text-zinc-400")}>
                  暂无报告<br />让莓小智为你生成一份分析报告吧
                </p>
              </div>
            ) : (
              <div className="py-2">
                {spaceReports.map((report) => (
                  <div
                    key={report.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-colors group",
                      darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-100"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      "bg-emerald-500/10"
                    )}>
                      <IconFileText size={16} className="text-emerald-500" />
                    </div>
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setReportsModalOpen(false)
                        if (report.html) setReportViewer({ title: report.title, html: report.html })
                      }}
                    >
                      <div className={cn("text-sm font-medium truncate", darkMode ? "text-zinc-100" : "text-zinc-900")}>
                        {report.title}
                      </div>
                      <div className={cn("text-[11px] mt-0.5", darkMode ? "text-zinc-500" : "text-zinc-400")}>
                        {new Date(report.timestamp).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </button>
                    <button
                      onClick={() => deleteSpaceReport(report.id)}
                      className={cn(
                        "shrink-0 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity",
                        darkMode ? "hover:bg-zinc-700 text-zinc-500" : "hover:bg-zinc-200 text-zinc-400"
                      )}
                    >
                      <IconDelete size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Modal>

          {/* AI 操作记录 Modal */}
          <Modal
            title="AI 操作记录"
            open={actionsModalOpen}
            onCancel={() => setActionsModalOpen(false)}
            footer={null}
            className={cn(darkMode && "dark")}
            width="100%"
            style={{ top: 20, maxWidth: 500, margin: "0 auto" }}
            styles={{
              body: { padding: 0, maxHeight: "70vh", overflow: "auto" },
            }}
          >
            {notices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <IconChartLine size={40} className={cn("mb-3", darkMode ? "text-zinc-700" : "text-zinc-300")} />
                <p className={cn("text-sm", darkMode ? "text-zinc-500" : "text-zinc-400")}>
                  暂无操作记录<br />本次会话的工具调用将显示在这里
                </p>
              </div>
            ) : (
              <div className="py-2">
                {notices.slice().reverse().map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 mx-2 rounded-xl",
                      darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-100"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      n.variant === 'error' ? "bg-red-500/10" :
                      n.variant === 'success' ? "bg-emerald-500/10" :
                      "bg-emerald-500/10"
                    )}>
                      {n.variant === 'error' ? <IconAttention size={16} className="text-red-500" /> :
                       n.variant === 'success' ? <IconCheckOne size={16} className="text-emerald-500" /> :
                       <IconLoading size={16} className="text-emerald-500 animate-spin" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-sm font-medium", darkMode ? "text-zinc-100" : "text-zinc-900")}>
                        {n.title}
                      </div>
                      {n.description && (
                        <div className={cn("text-[11px] mt-0.5 break-words", darkMode ? "text-zinc-500" : "text-zinc-400")}>
                          {n.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Modal>

          {/* 病历档案面板 —— 与 PC 端同一组件、同一数据源（诊断自动沉淀 + 复诊闭环）。
              手机上 sidebar 永远收起，所以不传 sidebarOpen / onExpandSidebar：
              传了会在左上角多出一排 PC 才有的按钮。 */}
          <MedicalRecordsPanel
            open={medicalRecordsOpen}
            onClose={() => setMedicalRecordsOpen(false)}
            darkMode={darkMode}
          />

          {/* Notices */}
          <div className="fixed top-20 left-4 right-4 z-50 flex flex-col gap-2">
            <AnimatePresence>
              {notices.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className={cn(
                    "rounded-xl px-4 py-3 shadow-lg backdrop-blur-xl",
                    n.variant === "loading" ? "bg-emerald-500/90 text-white" :
                    n.variant === "success" ? "bg-emerald-500/90 text-white" :
                    n.variant === "error" ? "bg-red-500/90 text-white" :
                    darkMode ? "bg-zinc-800/90 text-zinc-100" : "bg-white/90 text-zinc-900"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {n.variant === "loading" && <IconLoading className="size-4 animate-spin" />}
                      {n.variant === "success" && <IconCheckOne className="size-4" />}
                      {n.variant === "error" && <IconAttention className="size-4" />}
                      <span className="font-medium text-sm">{n.title}</span>
                    </div>
                    <button onClick={() => closeNotice(n.id)} className="text-white/80 hover:text-white">
                      <IconDelete size={14} />
                    </button>
                  </div>
                  {n.description && (
                    <p className="text-xs mt-1 opacity-80">{n.description}</p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          </div>
        </div>
      </App>
    </ConfigProvider>
  )
}