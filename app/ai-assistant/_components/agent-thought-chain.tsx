"use client"

/* ------------------------------------------------------------
   AgentThoughtChain —— AI 助手的「工具调用链」
   ─────────────────────────────────────────────────────────────
   2026-10-14 改版：视觉从 antd-x `ThoughtChain` 切换到
   `components/ui/tool-calls-section`（外部参考实现的原生移植版）——
   折叠头「分类图标斜叠 + 调用了 N 个工具 + 箭头」，展开后是竖向链路：
   图标列（含连接线） + 工具名 / 分类名 / 可点开的参数与结果面板。

   数据契约**完全不变**（`AgentStep[]` + `isActive` + `defaultCollapsed`），
   page.tsx / copilot / landing-v4 演示三处调用方零改动。

   与旧实现的行为差异（有意为之）：
     · 每个 step 都成为链路上一行（旧的 narrative 会被塞进"下一个任务"的
       折叠内容里或聚合成"执行总结"，看不见要展开才知道）；
       现在 narrative 自己就是一行，文案 = 原文，滚动即可读到。
     · 不再有按钮式的「自动折叠」开关（旧实现里那个开关与链本身无关）。
     · 进行中的步骤**首次进入 active 时自动展开**（旧的 defaultExpandedKeys 行为）。
   ------------------------------------------------------------ */

import { useCallback, useMemo } from "react"

import { IconLoading } from "@/components/icon"
import { cn } from "@/lib/utils"
import {
  ToolCallsSection,
  type ToolCallEntry,
  type ToolCallStatus,
} from "@/components/ui/tool-calls-section"
import {
  getCategoryMeta,
  resolveToolCategory,
  type ToolCategoryMeta,
  type ToolCategoryId,
} from "@/components/ui/tool-calls-section-utils/tool-icons"

// ---------------------------------------------------------------------------
// 数据模型（向后兼容 page.tsx 中已有的 setAgentSteps 写法 —— 勿改名勿删字段）
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

/** 毫秒 → 链路右侧的耗时文本（< 1s 也给一位小数，与旧版一致） */
function formatDuration(ms: number): string | undefined {
  if (!ms || ms <= 0) return undefined
  return `${(ms / 1000).toFixed(1)}s`
}

function mapStatus(status: AgentStepStatus): ToolCallStatus {
  switch (status) {
    case "active":
      return "active"
    case "completed":
      return "completed"
    case "error":
      return "error"
    default:
      return "pending"
  }
}

/** 子步骤类型 → 分类（标题里能识别出工具名时优先用工具名） */
const CHILD_TYPE_CATEGORY: Record<AgentChildItem["type"], ToolCategoryId> = {
  search: "search",
  scrape: "scrape",
  read: "history",
  command: "code",
  edit: "code",
  thinking: "thinking",
  tool: "general",
}

function resolveChildCategory(child: AgentChildItem): ToolCategoryMeta {
  const byTitle = resolveToolCategory(child.title)
  if (byTitle.id !== "general") return byTitle
  return getCategoryMeta(CHILD_TYPE_CATEGORY[child.type] ?? "general")
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

/** 结果面板里的一行子步骤（工具名 + 附加说明 + 耗时） */
function ChildRow({ child }: { child: AgentChildItem }) {
  const meta = resolveChildCategory(child)
  const Icon = meta.Icon
  const isError = child.status === "error"
  const isActive = child.status === "active"

  return (
    <div className="flex w-full items-center gap-2">
      <Icon
        size={13}
        className={cn(
          "shrink-0",
          isError
            ? "text-red-500 dark:text-red-400"
            : isActive
              ? "text-[#059669] dark:text-emerald-400"
              : "text-zinc-400 dark:text-zinc-500",
        )}
      />
      <span
        className={cn(
          "text-[11px] break-words",
          isError
            ? "text-red-600 dark:text-red-400"
            : "text-zinc-600 dark:text-zinc-300",
        )}
      >
        {child.title}
      </span>
      {child.detail && (
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {child.detail}
        </span>
      )}
      {child.badge && (
        <span className="rounded-md bg-zinc-200/70 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
          {child.badge}
        </span>
      )}
      {child.meta && (
        <span className="ml-auto shrink-0 pl-2 font-mono text-[10px] text-zinc-400 tabular-nums dark:text-zinc-500">
          {child.meta}
        </span>
      )}
    </div>
  )
}

interface ChainEntry {
  id: string
  /** 是否计入折叠头的「N 个工具」（narrative / 思考段不计） */
  isTool: boolean
  call: ToolCallEntry
  /** 挂在展开面板顶部的说明段（旧版是 narrative，现在 narrative 自己成行，这里只留补充信息） */
  notes: string[]
  detailText?: string
  children: AgentChildItem[]
}

/** 展开面板：说明 + 参数 + 结果 */
function ChainDetail({ entry }: { entry: ChainEntry }) {
  const hasNotes = entry.notes.length > 0
  const hasChildren = entry.children.length > 0
  return (
    <>
      {hasNotes && (
        <div className="flex flex-col gap-1">
          {entry.notes.map((note, i) => (
            <p
              key={`${entry.id}-note-${i}`}
              className="m-0 text-[12px] leading-relaxed break-words text-zinc-500 dark:text-zinc-400"
            >
              {note}
            </p>
          ))}
        </div>
      )}
      {entry.detailText && (
        <div className="flex flex-col">
          <span className="mb-1 font-medium text-zinc-400 dark:text-zinc-500">
            参数
          </span>
          <p className="m-0 text-[11px] leading-relaxed break-words text-zinc-600 dark:text-zinc-300">
            {entry.detailText}
          </p>
        </div>
      )}
      {hasChildren && (
        <div className="flex flex-col">
          <span className="mb-1 font-medium text-zinc-400 dark:text-zinc-500">
            结果
          </span>
          <div className="flex flex-col gap-1.5">
            {entry.children.map((child) => (
              <ChildRow key={child.id} child={child} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// AgentStep[] → ChainEntry[]
// ---------------------------------------------------------------------------

function buildEntries(steps: AgentStep[]): ChainEntry[] {
  const entries: ChainEntry[] = []

  for (const step of steps) {
    const kind = step.kind || "narrative"
    const text = getStepText(step)
    if (!text && !step.toolName) continue

    const isTask = kind === "task"
    const duration = getStepDuration(step)
    const category = isTask
      ? resolveToolCategory(step.toolName || text)
      : kind === "microStep" || kind === "tool_result"
        ? resolveToolCategory(text || step.toolName)
        : getCategoryMeta("thinking")

    const call: ToolCallEntry = {
      tool_call_id: step.id,
      tool_name: step.toolName || (isTask ? "tool" : kind),
      tool_category: category.id,
      message: text || step.toolName || category.label,
      // narrative / 思考段的语义不是"工具分类"，不显示第二行
      show_category: isTask || kind === "microStep" || kind === "tool_result",
      integration_name: isTask ? undefined : category.label,
      status: mapStatus(step.status),
      meta: step.status === "active" ? undefined : formatDuration(duration),
    }

    entries.push({
      id: step.id,
      isTool: isTask || kind === "microStep" || kind === "tool_result",
      call,
      notes: [],
      detailText: isTask ? step.subnote || step.detail || step.meta : step.detail,
      children: step.children ? [...step.children] : [],
    })
  }

  return entries
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

export interface AgentThoughtChainProps {
  steps: AgentStep[]
  isActive?: boolean
  className?: string
  /**
   * 当有"任务规划"卡片同时展示时，思考链默认折叠。
   */
  defaultCollapsed?: boolean
  /**
   * 本轮执行结束后自动折叠整条链（默认 true）。
   * landing-v4 的演示台要"完整展示执行全过程" → 传 false 保持常开。
   */
  autoCollapse?: boolean
}

export function AgentThoughtChain({
  steps,
  isActive,
  className,
  defaultCollapsed = false,
  autoCollapse = true,
}: AgentThoughtChainProps) {
  const entries = useMemo(() => buildEntries(steps), [steps])

  const isWorking = useMemo(
    () => !!isActive && steps.some((s) => s.status === "active"),
    [isActive, steps],
  )

  const toolCount = useMemo(
    () => entries.filter((e) => e.isTool).length,
    [entries],
  )

  const calls = useMemo(() => entries.map((e) => e.call), [entries])

  const detailSlot = useCallback(
    (_call: ToolCallEntry, index: number) => {
      const entry = entries[index]
      if (!entry) return null
      const hasContent =
        entry.notes.length > 0 || !!entry.detailText || entry.children.length > 0
      if (!hasContent) return null
      return <ChainDetail entry={entry} />
    },
    [entries],
  )

  const label = isWorking ? (
    <span className="flex items-center gap-1.5">
      <IconLoading size={11} className="animate-spin text-[#059669]" />
      {toolCount > 0 ? `正在调用 ${toolCount} 个工具` : "思考中"}
    </span>
  ) : toolCount > 0 ? (
    `调用了 ${toolCount} 个工具`
  ) : (
    "执行总结"
  )

  if (entries.length === 0) return null

  return (
    <ToolCallsSection
      toolCalls={calls}
      defaultExpanded={!defaultCollapsed}
      /* 🔥 本轮执行结束（isWorking 转 false）→ 延迟一会儿自动折叠整条链，
         把版面让给正文；新一轮工具调用（isWorking 转 true / 内容变化）会自动展开 */
      autoCollapseWhen={autoCollapse && !isWorking}
      detailSlot={detailSlot}
      label={label}
      iconSize={18}
      className={cn("my-1.5", className)}
    />
  )
}

export default AgentThoughtChain
