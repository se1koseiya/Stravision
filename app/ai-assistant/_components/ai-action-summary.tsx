"use client"

import React from "react"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  StopCircle,
  AlertCircle,
  Loader2,
  ArrowUpRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// 数据模型
// ---------------------------------------------------------------------------

export type AIActionStatus = "running" | "completed" | "stopped" | "error"

export interface AIActionSummary {
  /** 状态 */
  status: AIActionStatus
  /** 任务规划是否完成 */
  taskPlanCompleted?: boolean
  /** 任务规划进度 "2/3" */
  taskPlanProgress?: string
  /** 跳转链接（TRAE 风格：右上角 ↗） */
  onOpenStudio?: () => void
}

// ---------------------------------------------------------------------------
// 主组件：AI 动作总结（TRAE 风格：单行紧凑卡片，灰色边 + 状态点 + 标题）
// ---------------------------------------------------------------------------

export interface AIActionSummaryCardProps {
  summary: AIActionSummary | null
  className?: string
}

export function AIActionSummaryCard({ summary, className }: AIActionSummaryCardProps) {
  if (!summary) return null

  const {
    status,
    taskPlanCompleted,
    taskPlanProgress,
    onOpenStudio,
  } = summary

  // 状态头部
  const statusConfig = {
    running: {
      icon: Loader2,
      iconClass: "text-[#1677ff] animate-spin",
      label: "任务执行中",
      labelClass: "text-[#1677ff]",
      barClass: "bg-[#1677ff]",
    },
    completed: {
      icon: CheckCircle2,
      iconClass: "text-[#52c41a]",
      label: taskPlanProgress ? `任务完成 · ${taskPlanProgress}` : "任务完成",
      labelClass: "text-[#52c41a]",
      barClass: "bg-[#52c41a]",
    },
    stopped: {
      icon: StopCircle,
      iconClass: "text-[#8c8c8c]",
      label: "任务已停止",
      labelClass: "text-[#595959]",
      barClass: "bg-[#d9d9d9]",
    },
    error: {
      icon: AlertCircle,
      iconClass: "text-[#ff4d4f]",
      label: "任务出错",
      labelClass: "text-[#ff4d4f]",
      barClass: "bg-[#ff4d4f]",
    },
  }[status]

  const StatusIcon = statusConfig.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "mt-2.5 relative flex items-stretch rounded-md overflow-hidden bg-white border border-[#f0f0f0] hover:border-[#d9d9d9] transition-colors",
        className
      )}
    >
      {/* 左侧色条 */}
      <div className={cn("w-[3px] flex-shrink-0", statusConfig.barClass)} />

      {/* 内容区 */}
      <div className="flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2">
        {/* 状态点 + 标题 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StatusIcon size={13} className={statusConfig.iconClass} />
          <span
            className={cn("text-[12.5px] leading-none", statusConfig.labelClass)}
            style={{ fontWeight: 500 }}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* 跳转按钮（TRAE 风格：右上角 ↗） */}
        {onOpenStudio && (
          <button
            onClick={onOpenStudio}
            className="ml-auto flex-shrink-0 text-[#bfbfbf] hover:text-[#595959] transition-colors"
            aria-label="在工作室中打开"
            title="在工作室中查看"
          >
            <ArrowUpRight size={13} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default AIActionSummaryCard
