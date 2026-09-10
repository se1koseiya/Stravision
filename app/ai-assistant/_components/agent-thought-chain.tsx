"use client"

import React, { useMemo } from "react"
import { ThoughtChain } from "@ant-design/x"
import type { ThoughtChainProps } from "@ant-design/x"
import { Flex, Typography } from "antd"
import {
  Search,
  Globe,
  CloudSun,
  Activity,
  History,
  MapPin,
  Sprout,
  Droplets,
  Wrench,
  Brain,
  CheckCircle2,
  AlertCircle,
  FileText,
  Code,
  Edit,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const { Text } = Typography

// ---------------------------------------------------------------------------
// 数据模型（向后兼容 page.tsx 中已有的 setAgentSteps 写法）
// ---------------------------------------------------------------------------

export type AgentStepKind =
  | "narrative"   // 普通描述段
  | "task"        // 工具调用/任务
  | "tool_result" // 工具结果
  | "thinking"    // 思考块
  | "microStep"   // 向后兼容

export type AgentStepStatus = "pending" | "active" | "completed" | "error"

export type AgentChildTone = "success" | "error" | "info" | "neutral" | "accent"

export interface AgentChildItem {
  id: string
  type: "edit" | "read" | "command" | "search" | "scrape" | "thinking" | "tool"
  title: string
  detail?: string
  meta?: string
  badge?: string
  tone?: AgentChildTone
  status: "active" | "completed" | "error"
}

export interface AgentStep {
  id: string
  kind: AgentStepKind
  /** 兼容旧字段名 type */
  type?: string
  status: AgentStepStatus
  /** 兼容旧字段：title 优先；没有 title 时取 text */
  title?: string
  text?: string
  detail?: string
  subnote?: string
  bullets?: string[]
  meta?: string
  children?: AgentChildItem[]
  duration?: number
  durationMs?: number
  startedAt?: number
  toolName?: string
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function getStepText(s: AgentStep): string {
  return s.text || s.title || ""
}

function getStepDuration(s: AgentStep): number {
  if (typeof s.duration === "number") return s.duration
  if (typeof s.durationMs === "number") return s.durationMs
  return 0
}

// AgentStepStatus → ThoughtChain item status
// ThoughtChain 仅支持 'loading' | 'success' | 'error' | 'abort'，没有 'pending'
// pending 视为 "未开始"，不展示状态色 → 返回 undefined
function mapStatus(
  status: AgentStepStatus
): ThoughtChainProps["items"][number]["status"] {
  switch (status) {
    case "active":
      return "loading"
    case "completed":
      return "success"
    case "error":
      return "error"
    default:
      return undefined
  }
}

function mapChildStatus(
  status: AgentChildItem["status"]
): ThoughtChainProps["items"][number]["status"] {
  switch (status) {
    case "completed":
      return "success"
    case "error":
      return "error"
    case "active":
      return "loading"
    default:
      return undefined
  }
}

// 根据工具名挑选 lucide-react 线性图标（strokeWidth 1.75，Trae Work 风格）
function getIconForTool(toolName?: string): React.ReactNode {
  const STROKE = 1.75
  if (!toolName) return <Wrench size={14} strokeWidth={STROKE} />
  const n = toolName.toLowerCase()
  if (n.includes("search")) return <Search size={14} strokeWidth={STROKE} />
  if (n.includes("scrape") || n.includes("firecrawl") || n.includes("crawl") || n.includes("fetch"))
    return <Globe size={14} strokeWidth={STROKE} />
  if (n.includes("weather")) return <CloudSun size={14} strokeWidth={STROKE} />
  if (n.includes("spectrum")) return <Activity size={14} strokeWidth={STROKE} />
  if (n.includes("sensor_history") || n.includes("history"))
    return <History size={14} strokeWidth={STROKE} />
  if (n.includes("route") || n.includes("amap")) return <MapPin size={14} strokeWidth={STROKE} />
  if (n.includes("soil")) return <Sprout size={14} strokeWidth={STROKE} />
  if (n.includes("irrigation")) return <Droplets size={14} strokeWidth={STROKE} />
  return <Wrench size={14} strokeWidth={STROKE} />
}

function getIconForChildType(type: AgentChildItem["type"]): React.ReactNode {
  const STROKE = 1.75
  switch (type) {
    case "edit":
      return <Edit size={14} strokeWidth={STROKE} />
    case "read":
      return <FileText size={14} strokeWidth={STROKE} />
    case "command":
      return <Code size={14} strokeWidth={STROKE} />
    case "search":
      return <Search size={14} strokeWidth={STROKE} />
    case "scrape":
      return <Globe size={14} strokeWidth={STROKE} />
    case "thinking":
      return <Brain size={14} strokeWidth={STROKE} />
    default:
      return <Wrench size={14} strokeWidth={STROKE} />
  }
}

// ---------------------------------------------------------------------------
// 折叠内容区样式（对齐官方示例 contentStyles：浅色背景 + 圆角 + 细边框）
// ---------------------------------------------------------------------------
const itemContentStyles: ThoughtChainProps['styles'] = {
  itemContent: {
    // 中性灰：浅色下是浅灰面板、深色下是微亮面板，两种主题都可读
    backgroundColor: 'rgba(128,128,128,.08)',
    borderRadius: 8,
    padding: 10,
    marginBlockStart: 8,
    border: '1px solid rgba(128,128,128,.16)',
  },
}

// ---------------------------------------------------------------------------
// 将 AgentStep[] 转换为 ThoughtChain items
// 分组策略：
//   - 每个 task 步骤作为一个顶层 item（collapsible）
//   - task 之前的 narrative/thinking 步骤作为该 task 内容里的 <Text type="secondary">
//   - task 的 children（工具结果）作为内容里的 ThoughtChain.Item
//   - microStep / tool_result 归入最近一个 task 的内容
//   - 末尾若还有未归类的 narrative，单独形成一个"执行总结" item
// ---------------------------------------------------------------------------

function buildItems(
  steps: AgentStep[],
  isWorking: boolean
): { items: ThoughtChainProps["items"]; activeKeys: string[] } {
  const items: ThoughtChainProps["items"] = []
  const activeKeys: string[] = []

  let pendingTexts: string[] = []
  let pendingMicro: AgentStep[] = []

  const flushPending = (contentParts: React.ReactNode[]) => {
    for (const t of pendingTexts) {
      contentParts.push(
        <Text key={`text-${contentParts.length}`} type="secondary" style={{ fontSize: 12.5 }}>
          {t}
        </Text>
      )
    }
    pendingTexts = []
    for (const ms of pendingMicro) {
      const msStatus = mapStatus(ms.status)
      const msDuration = getStepDuration(ms)
      contentParts.push(
        <ThoughtChain.Item
          key={ms.id}
          variant="solid"
          icon={
            ms.status === "error" ? (
              <AlertCircle size={14} strokeWidth={1.75} />
            ) : (
              <CheckCircle2 size={14} strokeWidth={1.75} />
            )
          }
          title={getStepText(ms) || "工具结果"}
          description={ms.detail || (msDuration > 0 ? `${(msDuration / 1000).toFixed(1)}s` : undefined)}
          status={msStatus}
        />
      )
    }
    pendingMicro = []
  }

  for (const step of steps) {
    const kind = step.kind || "narrative"

    if (kind === "narrative" || kind === "thinking") {
      const text = getStepText(step)
      if (text) pendingTexts.push(text)
      continue
    }

    if (kind === "microStep" || kind === "tool_result") {
      pendingMicro.push(step)
      continue
    }

    if (kind === "task") {
      const contentParts: React.ReactNode[] = []
      flushPending(contentParts)

      // 工具结果子项
      if (step.children && step.children.length > 0) {
        for (const child of step.children) {
          contentParts.push(
            <ThoughtChain.Item
              key={child.id}
              variant="solid"
              icon={getIconForChildType(child.type)}
              title={child.title}
              description={
                child.detail ||
                child.meta ||
                (child.badge ? `· ${child.badge}` : undefined)
              }
              status={mapChildStatus(child.status)}
            />
          )
        }
      }

      const taskStatus = mapStatus(step.status)
      const duration = getStepDuration(step)
      // 描述：优先 subnote，其次 detail，最后加上耗时
      const description =
        step.subnote ||
        step.detail ||
        step.meta ||
        (duration > 0 && step.status !== "active"
          ? `耗时 ${(duration / 1000).toFixed(1)}s`
          : undefined)

      items.push({
        key: step.id,
        icon: getIconForTool(step.toolName),
        title: getStepText(step) || step.toolName || "调用工具",
        description,
        collapsible: true,
        content: (
          <Flex gap="small" vertical>
            {contentParts}
          </Flex>
        ),
        status: taskStatus,
      })

      if (step.status === "active") {
        activeKeys.push(step.id)
      }
    }
  }

  // 末尾剩余的 narrative / microStep 没有归属 task：单独形成一个总结 item
  if (pendingTexts.length > 0 || pendingMicro.length > 0) {
    const contentParts: React.ReactNode[] = []
    flushPending(contentParts)
    const summaryKey = `summary-${items.length}`
    // 🔥 标题语义：出现过 task → 工作状态是"整理结果中"；
    // 只有 narrative（LLM 首字节前的初始思考阶段）→ 显示"思考中"更贴切
    const hasTask = steps.some((s) => (s.kind || "narrative") === "task")
    items.push({
      key: summaryKey,
      title: isWorking ? (hasTask ? "整理结果中" : "思考中") : "执行总结",
      collapsible: true,
      content: (
        <Flex gap="small" vertical>
          {contentParts}
        </Flex>
      ),
      status: isWorking ? "loading" : "success",
    })
    if (isWorking) activeKeys.push(summaryKey)
  }

  return { items, activeKeys }
}

// ---------------------------------------------------------------------------
// 主组件（使用 @ant-design/x 官方 ThoughtChain）
// ---------------------------------------------------------------------------

export interface AgentThoughtChainProps {
  steps: AgentStep[]
  isActive?: boolean
  className?: string
  /**
   * 当有"任务规划"卡片同时展示时，思考链默认折叠。
   */
  defaultCollapsed?: boolean
}

export function AgentThoughtChain({
  steps,
  isActive,
  className,
  defaultCollapsed = false,
}: AgentThoughtChainProps) {
  const isWorking = !!isActive && steps.some((s) => s.status === "active")

  const { items, activeKeys } = useMemo(() => buildItems(steps, isWorking), [steps, isWorking])

  // 默认展开：工作状态下展开所有 active 任务；非工作状态下展开第一个 task（若有）
  // 使用 uncontrolled 模式（defaultExpandedKeys），由 ThoughtChain 内部管理展开状态，
  // 避免受控 expandedKeys + setState 在流式更新时触发 Maximum update depth 循环。
  const defaultExpanded = useMemo(() => {
    if (defaultCollapsed) return [] as string[]
    if (isWorking && activeKeys.length > 0) return activeKeys
    // 默认展开第一个 task，让用户能看到细节
    const firstTaskKey = items.find((it) => it.collapsible)?.key
    return firstTaskKey ? [firstTaskKey] : []
  }, [defaultCollapsed, isWorking, activeKeys, items])

  if (items.length === 0) return null

  return (
    <div className={cn("my-1.5", className)}>
      {isWorking && (
        <div className="flex items-center gap-1 text-[12px] text-[#1677ff] mb-1.5 px-0.5">
          <Loader2 size={11} className="animate-spin" />
          <span style={{ fontWeight: 400 }}>
            任务执行中{items.length > 0 && ` · ${items.length} 步`}
          </span>
        </div>
      )}
      <ThoughtChain
        items={items}
        defaultExpandedKeys={defaultExpanded}
        collapsible
        styles={itemContentStyles}
      />
    </div>
  )
}

export default AgentThoughtChain
