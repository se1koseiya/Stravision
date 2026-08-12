"use client"

import { useState } from "react"
import { TrendingUp, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PredictiveInsightTriggerProps {
  /** 点击触发回调（由父组件接入 handleSend，走主对话路线） */
  onTrigger?: (prompt: string) => void
  className?: string
}

/** 趋势预测预设 prompt（注入到主对话，由 AI 基于上下文历史数据生成） */
const PREDICTIVE_PROMPT = `请基于最近 7 天的传感器历史数据，为我做一次完整的趋势预测和风险分析：

1. **趋势识别**：各环境指标（温度/湿度/CO2/光照/土壤湿度）的变化趋势和速率
2. **风险预测**：未来 3-7 天可能出现的风险（病害/环境胁迫/设备异常），按严重程度排序
3. **具体预测**：给出具体的数值预测（如"预计 2 天后温度突破 30°C"）及置信度
4. **前瞻建议**：预防性操作建议（在问题发生前介入），标注优先级和执行时机

请用表格和结构化方式呈现，让风险和应对方案一目了然。`

/**
 * AI 趋势预测触发器
 *
 * 设计与 DynamicModelSelector 对齐（紧凑 pill 按钮）。
 * 点击后走主对话路线（/api/chat），结果直接进对话区，
 * 自动复用配额预扣/退还/会员判断逻辑，避免独立 API 的 403 问题。
 */
export function PredictiveInsightCard({ onTrigger, className }: PredictiveInsightTriggerProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = () => {
    if (loading || !onTrigger) return
    setLoading(true)
    onTrigger(PREDICTIVE_PROMPT)
    // loading 状态保持一小段（实际发送由父组件 handleSend 接管）
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-lg bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors font-medium text-sm h-auto border-0 shadow-none disabled:opacity-50 cursor-pointer",
        className
      )}
      title="基于 7 天历史数据进行 AI 趋势预测"
    >
      {loading ? (
        <Loader2 size={14} strokeWidth={2} className="animate-spin text-gray-500" />
      ) : (
        <TrendingUp size={14} strokeWidth={2} className="text-gray-500" />
      )}
      <span className="text-gray-700 dark:text-zinc-200 font-medium">
        {loading ? '分析中' : '趋势预测'}
      </span>
    </button>
  )
}
