"use client"

import { useAIModels, type AIProvider } from '@/lib/hooks/use-ai-models'
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down"
import { Qwen, DeepSeek, Moonshot, Zhipu, Minimax, OpenAI } from '@lobehub/icons'
import { Sparkles } from "lucide-react"
import { Loader2, Check } from 'lucide-react'
import {
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
} from "@/components/ui/assistant-ui"
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils'

interface DynamicModelSelectorProps {
  value: string
  onValueChange: (value: string) => void
}

const getModelIcon = (iconType: string, size: number = 24) => {
  switch (iconType) {
    case 'qwen':
      return <Qwen.Color size={size} />
    case 'deepseek':
      return <DeepSeek.Color size={size} />
    case 'moonshot':
      return <Moonshot size={size} />
    case 'zhipu':
      return <Zhipu.Color size={size} />
    case 'minimax':
      return <Minimax size={size} />
    case 'openai':
      return <OpenAI.Color size={size} />
    case 'sparkles':
      return <Sparkles size={size * 0.75} className="text-blue-500" />
    default:
      return <Qwen.Color size={size} />
  }
}

const getModelDisplayName = (modelId: string, models: any[]) => {
  const model = models.find(m => m.id === modelId)
  return model?.name || modelId
}

const getModelIcon2 = (modelId: string, models: any[]) => {
  const model = models.find(m => m.id === modelId)
  if (!model) {
    if (modelId === 'auto') return 'sparkles'
    if (modelId.includes('qwen')) return 'qwen'
    if (modelId.includes('deepseek')) return 'deepseek'
    if (modelId.includes('kimi')) return 'moonshot'
    if (modelId.includes('gpt') || modelId.includes('o1') || modelId.includes('o3')) return 'openai'
    return 'qwen'
  }
  return model.icon
}

export function DynamicModelSelector({ value, onValueChange }: DynamicModelSelectorProps) {
  const { config, loading, error, getProviders, getModelsByProvider } = useAIModels()

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400">加载中...</span>
      </div>
    )
  }

  if (error || !config) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-lg">
        <span className="text-sm text-red-500">加载失败</span>
      </div>
    )
  }

  const providers = getProviders()
  const allModels = config.models.filter(m => m.enabled)
  const currentModelIcon = getModelIcon2(value, allModels)

  // 积分倍率显示：生效倍率 = 模型倍率 × 全局倍率
  const globalMultiplier = typeof config.creditMultiplier === 'number' && config.creditMultiplier > 0 ? config.creditMultiplier : 1
  const effectiveRate = (rate?: number) => {
    const r = typeof rate === 'number' && rate > 0 ? rate : 1
    const e = r * globalMultiplier
    return Number(e.toFixed(2))
  }

  // 扁平化所有启用的模型（按提供商顺序）
  const flatModels = providers.length > 0
    ? providers.flatMap((p: AIProvider) => getModelsByProvider(p.id))
    : allModels

  return (
    <PromptInputModelSelect value={value} onValueChange={onValueChange}>
      <PromptInputModelSelectTrigger className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors font-medium text-sm h-auto focus:ring-0 border-0 shadow-none group">
        <span className="text-gray-700 dark:text-zinc-200 font-medium">
          {getModelDisplayName(value, allModels)}
        </span>
        <ChevronDown size={12} className="text-gray-400" />
      </PromptInputModelSelectTrigger>

      <PromptInputModelSelectContent
        align="start"
        sideOffset={8}
        className={cn(
          "w-[340px] p-0 rounded-2xl bg-white dark:bg-zinc-900",
          "border border-gray-100 dark:border-zinc-800",
          "shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
          "overflow-hidden"
        )}
      >
        {/* 标题 */}
        <div className="px-5 pt-4 pb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100">模型</h3>
        </div>

        {/* 模型列表 */}
        <div className="px-2 py-1 max-h-[420px] overflow-y-auto">
          {flatModels.map((model) => {
            const isSelected = value === model.id
            return (
              <DropdownMenuItem
                key={model.id}
                onSelect={(e) => {
                  e.preventDefault()
                  onValueChange(model.id)
                }}
                className={cn(
                  "flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer",
                  "transition-colors outline-none",
                  "hover:bg-gray-50 dark:hover:bg-zinc-800/60",
                  "focus:bg-gray-50 dark:focus:bg-zinc-800/60"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100 leading-tight truncate">
                      {model.name}
                    </span>
                    {/* 积分倍率徽章（×N = 消耗积分的相对倍数） */}
                    <span
                      className="flex-shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                      title={`积分倍率：模型 ×${typeof (model as any).rateMultiplier === 'number' ? (model as any).rateMultiplier : 1} 全局 ×${globalMultiplier}，回复按 token 消耗此倍率的积分`}
                    >
                      ×{effectiveRate((model as any).rateMultiplier)}
                    </span>
                  </div>
                  {model.description && (
                    <div className="mt-1 text-[12px] text-gray-400 dark:text-zinc-500 leading-relaxed line-clamp-2">
                      {model.description}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <div className="flex-shrink-0 mt-0.5">
                    <Check size={16} strokeWidth={2.5} className="text-blue-500" />
                  </div>
                )}
              </DropdownMenuItem>
            )
          })}
        </div>
      </PromptInputModelSelectContent>
    </PromptInputModelSelect>
  )
}
