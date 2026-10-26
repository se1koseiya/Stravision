"use client"

import { useState, useCallback, useEffect } from "react"
import { Tooltip, Spin } from "antd"

import { toast } from "@/lib/ui/feedback"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { ScheduledTasksList, type ScheduledTask } from "@/components/ai/scheduled-tasks-list"
import { ManualTaskCreateModal } from "@/components/ai/manual-task-create-modal"
import { IconClose, IconComment, IconLayoutTwo, IconPlus } from "@/components/icon";

interface SchedulerSidebarPanelProps {
  open: boolean
  onClose: () => void
  /** 对话创建回调：将预设提示填入聊天输入框 */
  onConversationalCreate?: (prompt: string) => void
  /** 暗色模式 */
  darkMode?: boolean
  /** sidebar 是否展开；收起时面板 left 收缩到 12px */
  sidebarOpen?: boolean
  /** sidebar 收起时面板内显示的展开按钮回调 */
  onExpandSidebar?: () => void
  /** sidebar 收起时面板内显示的新建对话按钮回调 */
  onNewChat?: () => void
}

export function SchedulerSidebarPanel({ open, onClose, onConversationalCreate, darkMode, sidebarOpen = true, onExpandSidebar, onNewChat }: SchedulerSidebarPanelProps) {
  const isDark = !!darkMode
  const [manualOpen, setManualOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/scheduler/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (e) {
      console.error('[SchedulerSidebarPanel] fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchTasks()
  }, [open, refreshKey, fetchTasks])

  // 🔥 监听 AI 对话中创建的定时任务事件，实时刷新列表
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => {
      console.log('[SchedulerSidebarPanel] Received scheduler:tasks-changed, refreshing...')
      handleRefresh()
    }
    window.addEventListener('scheduler:tasks-changed', handler)
    return () => window.removeEventListener('scheduler:tasks-changed', handler)
  }, [])

  const handleRefresh = () => {
    setRefreshKey(k => k + 1)
  }

  const handleManualCreated = () => {
    handleRefresh()
    toast.success("任务创建成功")
  }

  const handleConversational = (prompt: string) => {
    onConversationalCreate?.(prompt)
    onClose()
  }

  // 关闭中状态：点击 X 立刻给 wrapper 加 pointer-events-none
  // 父组件传 open=true 时重置，避免下次打开时残留
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    if (open) setClosing(false)
  }, [open])
  const handleClose = () => {
    if (closing) return
    setClosing(true)
    onClose()
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: closing ? 0 : 1, scale: closing ? 0.98 : 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "fixed z-[150] flex flex-col font-sans overflow-hidden",
              "top-3 right-3 bottom-3",
              sidebarOpen ? "left-[272px]" : "left-3",
              isDark ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900",
              closing && "pointer-events-none"
            )}
            style={{ borderRadius: 10 }}
          >
            {/* Header - 简洁版：标题+副标题+右上角创建按钮 */}
            <div
              className={cn(
                "px-8 pt-6 pb-2 shrink-0",
                isDark ? "bg-zinc-950" : "bg-white"
              )}
            >
              {/* 展开 + 新建对话（仅 sidebar 收起时显示在最左侧） */}
              {!sidebarOpen && (
                <div className="flex items-center gap-1 mb-3">
                  {onExpandSidebar && (
                    <Tooltip title="展开侧边栏">
                      <button
                        onClick={onExpandSidebar}
                        className={cn(
                          "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
                          isDark
                            ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                        )}
                      >
                        <IconLayoutTwo size={17} />
                      </button>
                    </Tooltip>
                  )}
                  {onNewChat && (
                    <Tooltip title="新建对话">
                      <button
                        onClick={onNewChat}
                        className={cn(
                          "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
                          isDark
                            ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                        )}
                      >
                        <IconPlus size={17} />
                      </button>
                    </Tooltip>
                  )}
                </div>
              )}
              <div className="flex items-start justify-between">
                <div>
                  <h1
                    className={cn(
                      "text-2xl font-semibold tracking-tight",
                      isDark ? "text-zinc-100" : "text-zinc-900"
                    )}
                  >
                    定时任务
                  </h1>
                  <p
                    className={cn(
                      "mt-1 text-sm",
                      isDark ? "text-zinc-500" : "text-zinc-500"
                    )}
                  >
                    让 AI 按计划自动执行任务，并把结果定时送达
                  </p>
                </div>

                {/* 右上角：创建下拉按钮 */}
                <div className="flex items-center gap-2">
                  {/* 关闭按钮 */}
                  <Tooltip title="关闭">
                    <button
                      onClick={handleClose}
                      className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
                        isDark
                          ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                      )}
                    >
                      <IconClose size={17} />
                    </button>
                  </Tooltip>

                  {/* 创建下拉 */}
                  <div className="relative">
                    <button
                      onClick={() => setCreateMenuOpen(v => !v)}
                      onBlur={() => setTimeout(() => setCreateMenuOpen(false), 150)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-medium transition-colors",
                        isDark
                          ? "bg-zinc-100 text-zinc-900 hover:bg-white"
                          : "bg-zinc-900 text-white hover:bg-zinc-800"
                      )}
                    >
                      创建
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={cn("transition-transform", createMenuOpen && "rotate-180")}>
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>

                    <AnimatePresence>
                      {createMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className={cn(
                            "absolute right-0 top-full mt-1 w-48 rounded-lg border shadow-lg overflow-hidden z-10",
                            isDark
                              ? "bg-zinc-900 border-zinc-800"
                              : "bg-white border-zinc-200"
                          )}
                        >
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setCreateMenuOpen(false)
                              setManualOpen(true)
                            }}
                            className={cn(
                              "flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left transition-colors",
                              isDark
                                ? "text-zinc-200 hover:bg-zinc-800"
                                : "text-zinc-700 hover:bg-zinc-50"
                            )}
                          >
                            <IconPlus />
                            <span>手动添加</span>
                          </button>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setCreateMenuOpen(false)
                              handleConversational("我想创建一个定时任务：")
                            }}
                            className={cn(
                              "flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left transition-colors border-t",
                              isDark
                                ? "text-zinc-200 hover:bg-zinc-800 border-zinc-800"
                                : "text-zinc-700 hover:bg-zinc-50 border-zinc-100"
                            )}
                          >
                            <IconComment />
                            <span>通过会话创建</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

            {/* 主体内容区 */}
            <div
              className={cn(
                "flex-1 overflow-y-auto",
                isDark ? "bg-zinc-950" : "bg-white"
              )}
            >
              {loading && tasks.length === 0 ? (
                <div className="flex items-center justify-center py-32">
                  <Spin />
                </div>
              ) : tasks.length === 0 ? (
                /* 空状态 - 居中简洁版 */
                <div className="flex flex-col items-center justify-center py-40">
                  {/* 简约日历图标 */}
                  <svg
                    width="72"
                    height="72"
                    viewBox="0 0 72 72"
                    fill="none"
                    className={cn(isDark ? "text-zinc-700" : "text-zinc-300")}
                  >
                    {/* 日历主体 */}
                    <rect x="12" y="16" width="48" height="44" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    {/* 顶部横线 */}
                    <line x1="12" y1="28" x2="60" y2="28" stroke="currentColor" strokeWidth="1.5" />
                    {/* 两个顶部装订环 */}
                    <line x1="24" y1="10" x2="24" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="48" y1="10" x2="48" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    {/* 时钟圆圈 */}
                    <circle cx="36" cy="46" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    {/* 时钟指针 */}
                    <path d="M36 41V46L39 48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>

                  <p className={cn("mt-6 text-sm", isDark ? "text-zinc-400" : "text-zinc-500")}>
                    创建定时任务
                  </p>
                  <p className={cn("mt-1 text-sm", isDark ? "text-zinc-500" : "text-zinc-400")}>
                    <button
                      onClick={() => setManualOpen(true)}
                      className={cn("hover:underline", isDark ? "text-emerald-400" : "text-emerald-500")}
                    >
                      手动添加
                    </button>
                    <span className="mx-1.5">或</span>
                    <button
                      onClick={() => handleConversational("我想创建一个定时任务：")}
                      className={cn("hover:underline", isDark ? "text-emerald-400" : "text-emerald-500")}
                    >
                      通过会话创建
                    </button>
                  </p>
                </div>
              ) : (
                /* 有任务时：列表 */
                <div className="px-8 py-6">
                  <ScheduledTasksList
                    tasks={tasks}
                    loading={loading}
                    onTasksChange={handleRefresh}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ManualTaskCreateModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onSuccess={handleManualCreated}
      />
    </>
  )
}
