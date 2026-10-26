"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { IconArrowRightUp, IconAttention, IconCheckOne, IconLoading, IconPause } from "@/components/icon";

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
      icon: IconLoading,
      iconClass: "text-[#059669] animate-spin",
      label: "任务执行中",
      labelClass: "text-[#059669]",
      barClass: "bg-[#059669]",
    },
    completed: {
      icon: IconCheckOne,
      iconClass: "text-[#059669]",
      label: taskPlanProgress ? `任务完成 · ${taskPlanProgress}` : "任务完成",
      labelClass: "text-[#059669]",
      barClass: "bg-[#059669]",
    },
    stopped: {
      icon: IconPause,
      iconClass: "text-[#8f959e]",
      label: "任务已停止",
      labelClass: "text-[#52525B]",
      barClass: "bg-[#d4d4d8]",
    },
    error: {
      icon: IconAttention,
      iconClass: "text-[#DC2626]",
      label: "任务出错",
      labelClass: "text-[#DC2626]",
      barClass: "bg-[#DC2626]",
    },
  }[status]

  const StatusIcon = statusConfig.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        /* 沉浸光感：bg-white + border-[#F4F4F5] → .dc-mat--neutral 中性灰膜（白画布上仍保轮廓）。
           布局类全保留：mt-2.5 / relative / flex / items-stretch / rounded-lg / overflow-hidden。
           hover:border-[#d4d4d8] 保留 —— 材质只定边框初始色，Tailwind hover 类仍可覆盖。 */
        "mt-2.5 relative flex items-stretch rounded-lg overflow-hidden dc-mat dc-mat--regular dc-mat--neutral hover:border-[#d4d4d8] transition-colors",
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
            className={cn("text-[13px] leading-none", statusConfig.labelClass)}
            style={{ fontWeight: 500 }}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* 跳转按钮（TRAE 风格：右上角 ↗） */}
        {onOpenStudio && (
          <button
            onClick={onOpenStudio}
            className="ml-auto flex-shrink-0 text-[#b4b2a9] hover:text-[#52525B] transition-colors"
            aria-label="在工作室中打开"
            title="在工作室中查看"
          >
            <IconArrowRightUp size={13} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default AIActionSummaryCard
