"use client"

import { useState, useEffect } from "react"
import React from "react"
import { Globe, Activity, Zap, CheckCircle2, Loader2, ChevronDown, ChevronUp, Play, Pause, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatTime } from "@/app/ai-assistant/_utils/helpers"

interface SubAction {
  icon: React.ReactNode
  text: string
  status: string
}

interface TaskData {
  tasks: Array<{
    id: string
    title: string
    status: string
    subActions?: SubAction[]
  }>
}

/**
 * Dynamic Task Planner — rendered inside AI messages to show task execution progress.
 * Extracted from app/ai-assistant/page.tsx
 */
export function DynamicTaskPlanner({
  content,
  onOpenStudio,
  isPaused,
  onTogglePause,
}: {
  content: string
  onOpenStudio?: () => void
  isPaused?: boolean
  onTogglePause?: (paused: boolean) => void
}) {
  const [isVisible] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [autoCollapse, setAutoCollapse] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("task-planner-auto-collapse")
      return saved === "true"
    }
    return false
  })
  const [elapsedTime, setElapsedTime] = useState(0)

  // Persist autoCollapse
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("task-planner-auto-collapse", String(autoCollapse))
    }
  }, [autoCollapse])

  const tasksData: TaskData | null = (() => {
    try {
      const match = content.match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/)
      if (!match) return null
      return JSON.parse(match[1])
    } catch {
      return null
    }
  })()

  const tasks = tasksData?.tasks || []
  const allCompleted = tasks.length > 0 && tasks.every((t) => t.status === "completed")

  // Auto-collapse when tasks complete
  useEffect(() => {
    if (autoCollapse && allCompleted && !isCollapsed) {
      const timer = setTimeout(() => {
        setIsCollapsed(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [autoCollapse, allCompleted, isCollapsed])

  // Elapsed time timer
  useEffect(() => {
    if (!isVisible || isPaused || allCompleted) return
    const timer = setInterval(() => setElapsedTime((p) => p + 1), 1000)
    return () => clearInterval(timer)
  }, [isVisible, isPaused, allCompleted])

  if (!isVisible) return null

  try {
    const activeIndex = tasks.findIndex((t) => t.status === "in_progress")
    const currentIndex = activeIndex !== -1 ? activeIndex : tasks.length - 1
    const activeTask = tasks[currentIndex] || tasks[0]

    const getMockSubActions = (title: string, _taskStatus: string): SubAction[] => [
      { icon: <Globe size={14} />, text: `正在通过 MCP 工具搜索 "${title}" 相关的最佳实践...`, status: "completed" },
      { icon: <Activity size={14} />, text: `正在调用大棚传感器获取实时环境数据...`, status: "completed" },
      { icon: <Zap size={14} />, text: `正在生成控制指令流...`, status: _taskStatus === "completed" || allCompleted ? "completed" : "in_progress" },
    ]

    const subActions = (activeTask?.subActions || getMockSubActions(activeTask?.title || "任务", activeTask?.status)).map(
      (sa: SubAction) =>
        allCompleted || activeTask?.status === "completed" ? { ...sa, status: "completed" } : sa
    )

    return (
      <div className="my-8 w-full max-w-2xl bg-white/70 backdrop-blur-xl rounded-[28px] border border-zinc-200/50 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] overflow-hidden relative group/planner animate-in fade-in slide-in-from-bottom-8 duration-700 font-sans dark:bg-[#1C1C1E]/90 dark:border-white/10 dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div
          className={cn(
            "px-6 py-4 flex items-center justify-between border-b border-zinc-100/80 dark:border-white/5 bg-white/30 dark:bg-black/20 cursor-pointer select-none transition-colors hover:bg-zinc-50/50 dark:hover:bg-white/5",
            isCollapsed && "border-b-0"
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={cn(
                "size-2 rounded-full shrink-0",
                allCompleted ? "bg-primary shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-blue-500 animate-pulse"
              )}
            />
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500 shrink-0">
              <span>
                {allCompleted ? "任务已全部达成" : "执行中"} | 执行用时: {formatTime(elapsedTime)}
              </span>
            </div>
            {isCollapsed && !allCompleted && activeTask && (
              <div className="flex items-center gap-2 ml-2 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                <div className="flex items-center gap-1.5 min-w-0">
                  <Loader2 size={11} className="text-blue-500 animate-spin shrink-0" />
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 truncate">
                    {activeTask.title}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 shrink-0 tabular-nums">
                  {currentIndex + 1}/{tasks.length}
                </span>
              </div>
            )}
            {isCollapsed && allCompleted && (
              <div className="flex items-center gap-2 ml-2 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={11} className="text-primary shrink-0" />
                  <span className="text-[11px] font-semibold text-primary dark:text-emerald-400">全部完成</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setAutoCollapse(!autoCollapse)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all",
                autoCollapse
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
              title={autoCollapse ? "已启用自动折叠" : "点击启用自动折叠"}
            >
              {autoCollapse ? <CheckCircle2 size={12} /> : <Circle size={12} />}
              <span>自动折叠</span>
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              title={isCollapsed ? "展开任务" : "折叠任务"}
            >
              {isCollapsed ? (
                <ChevronDown size={16} className="text-zinc-600 dark:text-zinc-400" />
              ) : (
                <ChevronUp size={16} className="text-zinc-600 dark:text-zinc-400" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Body */}
        {!isCollapsed && (
          <div className="p-6 pt-2 animate-in slide-in-from-top-2 fade-in duration-300">
            {/* Progress Timeline */}
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 flex-1">
                  {tasks.map((task, idx) => (
                    <div
                      key={task.id || idx}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all duration-500",
                        task.status === "completed"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : task.status === "in_progress"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                          : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                      )}
                    >
                      <div
                        className={cn(
                          "size-1.5 rounded-full",
                          task.status === "completed"
                            ? "bg-emerald-500"
                            : task.status === "in_progress"
                            ? "bg-blue-500 animate-pulse"
                            : "bg-zinc-300 dark:bg-zinc-600"
                        )}
                      />
                      {task.title}
                    </div>
                  ))}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold tabular-nums shrink-0",
                    allCompleted ? "text-emerald-500" : "text-blue-500"
                  )}
                >
                  {allCompleted ? "完成 100%" : `步骤 ${currentIndex + 1}/${tasks.length}`}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {subActions.map((action: SubAction, idx: number) => {
                const isSubActive = action.status === "in_progress"
                const isSubPast = action.status === "completed"
                return (
                  <div
                    key={idx}
                    className={cn(
                      "group/action flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 border border-transparent",
                      isSubActive
                        ? "bg-white dark:bg-zinc-800/80 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border-zinc-200/50 dark:border-white/5 ring-1 ring-blue-500/10 scale-[1.02]"
                        : "hover:bg-zinc-100/50 dark:hover:bg-white/5"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center size-9 rounded-xl transition-all duration-500",
                        isSubActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                          : isSubPast
                          ? "bg-emerald-100 text-primary dark:bg-emerald-950/30 dark:text-primary"
                          : "bg-zinc-50 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600"
                      )}
                    >
                      {isSubActive ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : action.icon ? (
                        React.cloneElement(action.icon as React.ReactElement<{ size: number }>, { size: 18 })
                      ) : (
                        <Zap size={18} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "text-[13px] transition-colors truncate",
                          isSubActive
                            ? "text-zinc-900 dark:text-white font-bold"
                            : "text-zinc-600 dark:text-zinc-400 font-medium"
                        )}
                      >
                        {action.text}
                      </div>
                      {isSubActive && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-500/80 font-bold uppercase tracking-tighter">
                          <span className="animate-pulse">Active Process</span>
                          <span className="size-1 rounded-full bg-blue-500 animate-bounce" />
                        </div>
                      )}
                    </div>

                    {isSubPast && (
                      <div className="size-5 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-primary">
                        <CheckCircle2 size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Execution Controls */}
            <div className="mt-10 flex items-center justify-between pt-6 border-t border-zinc-100/80 dark:border-white/5">
              <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                <Activity size={12} />
                <span>{allCompleted ? "所有自动化任务已圆满完成" : "实时自动化执行流已锁定"}</span>
              </div>

              {!allCompleted ? (
                <div className="flex items-center gap-3">
                  {isPaused ? (
                    <button
                      onClick={() => onTogglePause?.(false)}
                      className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold text-white bg-primary hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                      <Play size={14} className="fill-current" />
                      继续流水线
                    </button>
                  ) : (
                    <button
                      onClick={() => onTogglePause?.(true)}
                      className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold text-zinc-700 bg-white border border-zinc-200/50 hover:bg-zinc-50 rounded-2xl transition-all shadow-sm hover:shadow-md active:scale-95 dark:text-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700"
                    >
                      <Pause size={14} className="fill-current" />
                      挂起任务
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100/50 dark:border-primary/20 animate-in zoom-in duration-500">
                  <CheckCircle2 size={16} className="text-primary" />
                  <span className="text-xs font-bold text-primary dark:text-emerald-400">流水线执行完毕</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  } catch (e) {
    console.error("Failed to parse task list", e)
    return null
  }
}
