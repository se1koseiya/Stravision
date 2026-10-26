"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { XCard, registerCatalog } from "@ant-design/x-card"
import type { A2UICommand_v0_9, ActionPayload, Catalog } from "@ant-design/x-card"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { formatTime } from "@/app/ai-assistant/_utils/helpers"
import { IconCheck, IconDown, IconLoading, IconRound, IconTime, IconUp } from "@/components/icon";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskItem {
  type?: string
  text: string
}

interface Task {
  id?: string
  title: string
  status: "pending" | "in_progress" | "completed" | "failed"
  items?: TaskItem[]
}

interface TaskListData {
  status?: string
  tasks: Task[]
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseTaskList(content: string): TaskListData | null {
  if (!content) return null
  try {
    const match = content.match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/)
    if (!match) return null
    const parsed = JSON.parse(match[1])
    if (!parsed || !Array.isArray(parsed.tasks)) return null
    return parsed as TaskListData
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// A2UI Catalog 注册
// ---------------------------------------------------------------------------

const CATALOG_ID = "berry-task-planner-catalog-v1"

const catalog: Catalog = {
  catalogId: CATALOG_ID,
  components: {
    Column: { type: "object", properties: {}, required: [] as string[] },
    Card: { type: "object", properties: { id: { type: "string" } }, required: ["id"] as string[] },
    CardHeader: {
      type: "object",
      properties: {
        title: { type: "string" },
        status: { type: "string" },
        progress: { type: "number" },
        elapsed: { type: "string" },
        collapsible: { type: "boolean" },
      },
      required: ["title"] as string[],
    },
    TaskList: {
      type: "object",
      properties: { tasks: { type: "array", items: { type: "object" } } },
      required: ["tasks"] as string[],
    },
    TaskNode: {
      type: "object",
      properties: {
        index: { type: "number" },
        title: { type: "string" },
        status: { type: "string" },
        items: { type: "array", items: { type: "object" } },
        isLast: { type: "boolean" },
      },
      required: ["title", "status"] as string[],
    },
    StatusBadge: {
      type: "object",
      properties: { status: { type: "string" }, text: { type: "string" } },
      required: ["status", "text"] as string[],
    },
  },
}
registerCatalog(catalog)

// ---------------------------------------------------------------------------
// 主题色（统一 Ant Design 蓝）
// ---------------------------------------------------------------------------
const PRIMARY = BERRY_THEME.primary
const PRIMARY_BG = `${PRIMARY}0a`
const PRIMARY_BORDER = `${PRIMARY}30`

// ---------------------------------------------------------------------------
// A2UI 组件实现
// ---------------------------------------------------------------------------

function Column({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div className={className || "flex flex-col"}>{children}</div>
}

function StatusBadge({ status, text }: { status?: string; text?: string }) {
  const cfg: Record<string, { bg: string; color: string; dot: string }> = {
    in_progress: { bg: `${PRIMARY}14`, color: PRIMARY, dot: PRIMARY },
    completed: { bg: "#16A34A14", color: "#059669", dot: "#059669" },
    pending: { bg: "#A1A1AA14", color: "#A1A1AA", dot: "#A1A1AA" },
    failed: { bg: "#DC262614", color: "#DC2626", dot: "#DC2626" },
  }
  const c = cfg[status || "pending"] || cfg.pending
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium leading-none"
      style={{ background: c.bg, color: c.color }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: c.dot }}
      />
      {text}
    </span>
  )
}

function TaskNodeComponent({
  index,
  title,
  status,
  items,
  isLast,
}: {
  index?: number
  title?: string
  status?: string
  items?: TaskItem[]
  isLast?: boolean
}) {
  const isCompleted = status === "completed"
  const isInProgress = status === "in_progress"
  const isFailed = status === "failed"

  const indicator = isCompleted ? (
    <span
      className="relative z-10 flex items-center justify-center w-4 h-4 rounded-full text-white"
      style={{ background: "#059669" }}
    >
      <IconCheck size={10} strokeWidth={3} />
    </span>
  ) : isInProgress ? (
    <span
      className="relative z-10 flex items-center justify-center w-4 h-4 rounded-full"
      style={{ background: PRIMARY }}
    >
      <IconLoading size={10} className="animate-spin text-white" />
    </span>
  ) : isFailed ? (
    <span
      className="relative z-10 flex items-center justify-center w-4 h-4 rounded-full"
      style={{ background: "#DC2626" }}
    >
      <span className="text-white text-[11px] font-bold">!</span>
    </span>
  ) : (
    <span
      className="relative z-10 flex items-center justify-center w-4 h-4 rounded-full"
      style={{ background: "transparent", border: "1.5px solid #d4d4d8" }}
    >
      <IconRound size={6} className="text-zinc-400" />
    </span>
  )

  const titleColor = isCompleted
    ? "text-zinc-400 line-through"
    : isInProgress
    ? "text-zinc-900 dark:text-white"
    : isFailed
    ? "text-red-500"
    : "text-zinc-500 dark:text-zinc-400"

  return (
    <div className="relative flex gap-3 pb-3.5 last:pb-0">
      {/* 左侧时间线 */}
      <div className="flex flex-col items-center shrink-0">
        {indicator}
        {!isLast && (
          <span
            className="flex-1 w-px mt-1"
            style={{
              background: isCompleted ? "#059669" : isInProgress ? `${PRIMARY}40` : "#e4e4e7",
            }}
          />
        )}
      </div>

      {/* 右侧内容 */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2">
          {typeof index === "number" && (
            <span
              className="text-[11px] font-mono tabular-nums"
              style={{ color: isInProgress ? PRIMARY : "#A1A1AA" }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
          )}
          <span className={`text-[13px] font-medium leading-tight ${titleColor}`}>
            {title}
          </span>
        </div>

        {items && items.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {items.map((item, i) => {
              const subCompleted = isCompleted
              const subInProgress = isInProgress && i === (items.length - 1)
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-[12px] leading-relaxed"
                >
                  {subCompleted ? (
                    <IconCheck size={10} className="text-green-500 shrink-0" strokeWidth={2.5} />
                  ) : subInProgress ? (
                    <IconLoading size={10} className="text-emerald-500 animate-spin shrink-0" />
                  ) : (
                    <IconTime size={10} className="text-zinc-300 shrink-0" />
                  )}
                  <span
                    className={
                      subCompleted
                        ? "text-zinc-400 line-through"
                        : subInProgress
                        ? "text-zinc-700 dark:text-zinc-300"
                        : "text-zinc-400"
                    }
                  >
                    {item.text}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskListComponent({ tasks }: { tasks?: Task[] }) {
  if (!tasks || tasks.length === 0) return null
  return (
    <div className="py-1">
      {tasks.map((t, idx) => (
        <TaskNodeComponent
          key={t.id || idx}
          index={idx}
          title={t.title}
          status={t.status}
          items={t.items}
          isLast={idx === tasks.length - 1}
        />
      ))}
    </div>
  )
}

function CardHeaderComponent({
  title,
  status,
  progress,
  elapsed,
  collapsible,
  collapsed,
  onToggleCollapsed,
  onToggleCollapse,
}: {
  title?: string
  status?: string
  progress?: number
  elapsed?: string
  collapsible?: boolean
  collapsed?: boolean
  onToggleCollapsed?: () => void
  onToggleCollapse?: (collapsed: boolean) => void
}) {
  const isCompleted = status === "completed"
  return (
    <button
      onClick={onToggleCollapsed}
      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-zinc-50/60 dark:hover:bg-white/[0.02]"
    >
      {/* 状态点 */}
      <span className="relative flex items-center justify-center shrink-0">
        <span
          className={`block w-1.5 h-1.5 rounded-full ${isCompleted ? "" : "animate-pulse"}`}
          style={{ background: isCompleted ? "#059669" : PRIMARY }}
        />
      </span>

      {/* 标题 */}
      <span className="text-[13px] font-medium text-zinc-900 dark:text-white shrink-0">
        {title}
      </span>

      {/* 状态标签 */}
      <StatusBadge
        status={status || "in_progress"}
        text={isCompleted ? "已完成" : "执行中"}
      />

      {/* 进度条 + 时间（折叠态） */}
      {collapsed && (
        <>
          <div className="flex-1 flex items-center gap-2 min-w-0 ml-1">
            <div className="flex-1 h-1 rounded-full bg-zinc-100 dark:bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress || 0}%`,
                  background: isCompleted ? "#059669" : PRIMARY,
                }}
              />
            </div>
            <span
              className="text-[11px] font-mono tabular-nums shrink-0"
              style={{ color: PRIMARY }}
            >
              {progress || 0}%
            </span>
          </div>
          <span className="text-[11px] font-mono tabular-nums text-zinc-400 shrink-0">
            {elapsed}
          </span>
        </>
      )}

      {/* 折叠/展开箭头 */}
      {collapsible && (
        <span className="ml-auto text-zinc-400 shrink-0">
          {collapsed ? <IconDown size={14} /> : <IconUp size={14} />}
        </span>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// 直接渲染的兜底 UI（不依赖 x-card 命令管道）
// ---------------------------------------------------------------------------

function DirectRenderFallback({
  taskData,
  isCollapsed,
  setIsCollapsed,
  elapsedTime,
  isPaused,
  onTogglePause,
}: {
  taskData: TaskListData
  isCollapsed: boolean
  setIsCollapsed: (v: boolean) => void
  elapsedTime: number
  isPaused?: boolean
  onTogglePause?: (paused: boolean) => void
}) {
  const tasks = taskData.tasks || []
  const completedCount = tasks.filter((t) => t.status === "completed").length
  const allCompleted = tasks.length > 0 && completedCount === tasks.length
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length
  const currentIndex = tasks.findIndex((t) => t.status === "in_progress")
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  return (
    <div
      /* 沉浸光感：bg-white/暗态实底 → .dc-mat--neutral 中性灰膜（纯白画布上仍保轮廓）。
         inline borderColor 保留 = 品牌绿 0x30 alpha 描边（材质只提供 1px 宽度）。 */
      className="my-4 w-full rounded-xl overflow-hidden dc-mat dc-mat--regular dc-mat--neutral"
      style={{ borderColor: PRIMARY_BORDER }}
    >
      <CardHeaderComponent
        title="任务规划"
        status={allCompleted ? "completed" : "in_progress"}
        progress={progressPercent}
        elapsed={formatTime(elapsedTime)}
        collapsible
        collapsed={isCollapsed}
        onToggleCollapsed={() => setIsCollapsed(!isCollapsed)}
      />

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3">
              {/* 进度条 + 统计 */}
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-lg mb-3"
                style={{ background: PRIMARY_BG }}
              >
                <div className="flex-1 h-1 rounded-full bg-white/80 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPercent}%`,
                      background: allCompleted ? "#059669" : PRIMARY,
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-mono tabular-nums shrink-0"
                  style={{ color: PRIMARY }}
                >
                  {progressPercent}%
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0 tabular-nums">
                  {completedCount}/{tasks.length}
                </span>
              </div>

              {/* 任务列表（时间线） */}
              <TaskListComponent tasks={tasks} />

              {/* 底部状态 */}
              <div
                className="flex items-center justify-between pt-2.5 mt-1"
                style={{ borderTop: "1px solid #F4F4F5" }}
              >
                <span className="text-[11px] text-zinc-400">
                  {allCompleted
                    ? "所有任务已完成"
                    : isPaused
                    ? "任务已暂停"
                    : inProgressCount > 0
                    ? `正在执行第 ${currentIndex + 1} 项`
                    : "等待开始"}
                </span>
                {!allCompleted && onTogglePause && (
                  <button
                    onClick={() => onTogglePause?.(!isPaused)}
                    className="text-[11px] font-medium px-2 py-0.5 rounded transition-colors"
                    style={{
                      background: isPaused ? PRIMARY : "transparent",
                      color: isPaused ? "#fff" : PRIMARY,
                      border: `1px solid ${isPaused ? PRIMARY : PRIMARY_BORDER}`,
                    }}
                  >
                    {isPaused ? "继续" : "挂起"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

/**
 * Dynamic Task Planner — 任务规划器（XCard / A2UI 协议 + 极简版式）
 *
 * 优化点：
 * 1. 全图标缩到 10-14px（原 24px 过大）
 * 2. 移除渐变背景与厚重 Tag，采用单色描边 + 轻量 Badge
 * 3. 任务节点使用时间线样式（圆形指示器 + 连接线），更紧凑
 * 4. 优先 A2UI 协议渲染，500ms 超时自动切换直接渲染兜底
 * 5. 统一 Ant Design 蓝 #059669，零渐变、零阴影
 */
export function DynamicTaskPlanner({
  content,
  isPaused,
  onTogglePause,
}: {
  content: string
  onOpenStudio?: () => void
  isPaused?: boolean
  onTogglePause?: (paused: boolean) => void
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  // 🔥 优先走 XCard + A2UI 协议，500ms 超时未挂载才降级到 DirectRenderFallback
  const [useDirectMode, setUseDirectMode] = useState(false)
  const boxMountedRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  // 解析任务数据
  const taskData = useMemo(() => parseTaskList(content), [content])
  const tasks = taskData?.tasks || []
  const completedCount = tasks.filter((t) => t.status === "completed").length
  const allCompleted = tasks.length > 0 && completedCount === tasks.length
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  // 🔥 关键：所有任务完成后自动折叠为紧凑头部（TRAE 风格）
  useEffect(() => {
    if (allCompleted) {
      setIsCollapsed(true)
    }
  }, [allCompleted])

  // 计时器
  useEffect(() => {
    if (isPaused || allCompleted || tasks.length === 0) return
    const timer = setInterval(() => setElapsedTime((p) => p + 1), 1000)
    return () => clearInterval(timer)
  }, [isPaused, allCompleted, tasks.length])

  // 🔥 关键修复：taskData 签名变化时重置挂载状态 + 重启超时检测
  // 这样 XCard.Box 会被 key 强制重新挂载，重新处理 commands
  const taskSignature = useMemo(
    () => tasks.map((t) => `${t.id || t.title}:${t.status}`).join("|"),
    [tasks]
  )

  useEffect(() => {
    if (!taskData || tasks.length === 0) return
    // 🔥 任务数据变化时重置挂载标志，让超时检测重新生效
    boxMountedRef.current = false
    timeoutRef.current = setTimeout(() => {
      if (!boxMountedRef.current) {
        setUseDirectMode(true)
      }
    }, 500)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [taskData, tasks.length, taskSignature])

  const handleAction = useCallback((_payload: ActionPayload) => {
    boxMountedRef.current = true
  }, [])

  if (!taskData || tasks.length === 0) return null

  // 构建 A2UI 命令
  const commands: A2UICommand_v0_9[] = useMemo(
    () => [
      { version: "v0.9", createSurface: { surfaceId: "task-planner", catalogId: CATALOG_ID } },
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "task-planner",
          components: [
            { id: "root", component: "Column", children: ["header", "list"] },
            {
              id: "header",
              component: "CardHeader",
              title: "任务规划",
              status: allCompleted ? "completed" : "in_progress",
              progress: progressPercent,
              elapsed: formatTime(elapsedTime),
              collapsible: true,
            },
            {
              id: "list",
              component: "TaskList",
              tasks: tasks.map((t) => ({ ...t, _index: 0 })),
            },
          ],
        },
      },
    ],
    [allCompleted, progressPercent, elapsedTime, tasks]
  )

  // ===== 优先 x-card 协议渲染 =====
  if (!useDirectMode) {
    return (
      <div className="my-4 w-full">
        {/* 🔥 key 绑定 taskSignature：任务状态变化时强制重新挂载 XCard.Box
            解决 XCard.Box 不响应 commands prop 变化的 bug */}
        <XCard.Box
          key={taskSignature}
          commands={commands}
          onAction={handleAction}
          components={{
            Column,
            Card: (props: any) => (
              <div
                className="rounded-xl overflow-hidden dc-mat dc-mat--regular dc-mat--neutral"
                style={{ borderColor: PRIMARY_BORDER }}
                {...props}
              />
            ),
            CardHeader: (props: any) => (
              <CardHeaderComponent
                {...props}
                collapsed={isCollapsed}
                onToggleCollapsed={() => setIsCollapsed(!isCollapsed)}
              />
            ),
            TaskList: TaskListComponent,
            TaskNode: TaskNodeComponent,
            StatusBadge,
          }}
        >
          <XCard.Card id="task-planner" />
        </XCard.Box>
      </div>
    )
  }

  // ===== 直接渲染兜底 =====
  return (
    <DirectRenderFallback
      taskData={taskData}
      isCollapsed={isCollapsed}
      setIsCollapsed={setIsCollapsed}
      elapsedTime={elapsedTime}
      isPaused={isPaused}
      onTogglePause={onTogglePause}
    />
  )
}

export default DynamicTaskPlanner
