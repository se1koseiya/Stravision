"use client"

import { useAIModels, type AIProvider } from '@/lib/hooks/use-ai-models'
import { Sparkles } from "@/components/animate-ui/icons/sparkles"
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down"
import { Qwen, DeepSeek, Moonshot, Zhipu, Minimax, OpenAI } from '@lobehub/icons'
import { Loader2, Eye, Brain } from 'lucide-react'
import {
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
} from "@/components/ui/assistant-ui"
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

// 提供商类型对应的颜色
const getProviderColor = (providerId: string, type?: string) => {
  const colorMap: Record<string, string> = {
    dashscope: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/30',
    openai: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30',
    xiaomi: 'text-orange-500 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/30',
  }
  if (type && colorMap[type]) return colorMap[type]
  // 根据 ID 推断
  if (providerId.includes('dashscope') || providerId.includes('qwen')) return colorMap.dashscope
  if (providerId.includes('openai') || providerId.includes('gpt')) return colorMap.openai
  if (providerId.includes('xiaomi') || providerId.includes('mimo')) return colorMap.xiaomi
  return 'text-gray-600 bg-gray-50 dark:text-zinc-400 dark:bg-zinc-800/40'
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
  const { config, loading, error, getCategories, getModelsByCategory, getProviders, getModelsByProvider } = useAIModels()

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
  const hasProviders = providers.length > 0

  return (
    <PromptInputModelSelect value={value} onValueChange={onValueChange}>
      <PromptInputModelSelectTrigger className="flex items-center gap-2 px-2 py-1 rounded-lg bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors font-medium text-sm h-auto focus:ring-0 border-0 shadow-none group">
        <div className="flex items-center justify-center">
          {getModelIcon(currentModelIcon, 16)}
        </div>
        <span className="text-gray-700 dark:text-zinc-200 font-medium">
          {getModelDisplayName(value, allModels)}
        </span>
        <ChevronDown size={12} className="text-gray-400" />
      </PromptInputModelSelectTrigger>

      <PromptInputModelSelectContent className={cn(
        "w-[300px] p-1 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-lg max-h-[360px] overflow-y-auto",
        !hasProviders && "w-[280px]"
      )}>
        {hasProviders ? (
          // ====== 按提供商分组显示 ======
          providers.map((provider: AIProvider) => {
            const providerModels = getModelsByProvider(provider.id)

            if (providerModels.length === 0) return null

            return (
              <div key={provider.id} className="mb-1 last:mb-0">
                {/* 提供商标题 */}
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 mt-1 first:mt-0",
                  "text-[11px] font-semibold uppercase tracking-wider",
                  getProviderColor(provider.id, provider.type)
                )}>
                  {getModelIcon(provider.models[0]?.icon || 'sparkles', 14)}
                  <span>{provider.name}</span>
                  {provider.isDefault && (
                    <span className="ml-auto text-[10px] font-normal opacity-60">默认</span>
                  )}
                </div>

                {/* 该提供商下的模型列表 */}
                {providerModels.map(model => (
                  <PromptInputModelSelectItem
                    key={model.id}
                    value={model.id}
                    className="rounded-lg px-3 py-2 ml-3 mr-1"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex items-center justify-center flex-shrink-0">
                        {getModelIcon(model.icon || 'sparkles', 20)}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-900 dark:text-zinc-100 truncate">
                            {model.name}
                          </span>
                          {/* 视觉能力标签 */}
                          {model.supportsVision && (
                            <Eye size={11} className="text-violet-500 flex-shrink-0" title="支持视觉" />
                          )}
                          {/* 推理能力标签 */}
                          {model.supportsReasoning && (
                            <Brain size={11} className="text-blue-500 flex-shrink-0" title="支持深度推理" />
                          )}
                        </div>
                        {model.description && (
                          <span className="text-[11px] text-gray-400 dark:text-zinc-400 truncate">
                            {model.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </PromptInputModelSelectItem>
                ))}
              </div>
            )
          })
        ) : (
          // ====== 兼容旧版：按 category 分组 ======
          getCategories().map(category => {
            const categoryModels = getModelsByCategory(category.id)
            if (categoryModels.length === 0) return null

            return (
              <div key={category.id}>
                <div className="px-3 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide mt-1 first:mt-0">
                  {category.name}
                </div>
                {categoryModels.map(model => (
                  <PromptInputModelSelectItem
                    key={model.id}
                    value={model.id}
                    className="rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex items-center justify-center">
                        {getModelIcon(model.icon, 20)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">{model.name}</span>
                        {model.description && (
                          <span className="text-[11px] text-gray-400 dark:text-zinc-400">{model.description}</span>
                        )}
                      </div>
                    </div>
                  </PromptInputModelSelectItem>
                ))}
              </div>
            )
          })
        )}
      </PromptInputModelSelectContent>
    </PromptInputModelSelect>
  )
}
