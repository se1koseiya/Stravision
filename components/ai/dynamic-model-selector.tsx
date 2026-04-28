"use client"

import { useAIModels } from '@/lib/hooks/use-ai-models'
import { Sparkles } from "@/components/animate-ui/icons/sparkles"
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down"
import { Qwen, DeepSeek, Moonshot, Zhipu, Minimax } from '@lobehub/icons'
import { Loader2 } from 'lucide-react'
import {
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
} from "@/components/ui/assistant-ui"

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
      return <Minimax.Color size={size} />
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
    // Fallback logic
    if (modelId === 'auto') return 'sparkles'
    if (modelId.includes('qwen')) return 'qwen'
    if (modelId.includes('deepseek')) return 'deepseek'
    if (modelId.includes('kimi')) return 'moonshot'
    return 'qwen'
  }
  return model.icon
}

export function DynamicModelSelector({ value, onValueChange }: DynamicModelSelectorProps) {
  const { config, loading, error, getCategories, getModelsByCategory } = useAIModels()

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        <span className="text-xs text-zinc-500">加载中...</span>
      </div>
    )
  }

  if (error || !config) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80">
        <span className="text-xs text-red-500">加载失败</span>
      </div>
    )
  }

  const categories = getCategories()
  const allModels = config.models.filter(m => m.enabled)
  const currentModelIcon = getModelIcon2(value, allModels)

  return (
    <PromptInputModelSelect value={value} onValueChange={onValueChange}>
      <PromptInputModelSelectTrigger className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all font-bold text-xs h-auto shadow-sm focus:ring-0 group">
        <div className="size-6 rounded-lg overflow-hidden flex items-center justify-center transition-transform group-hover:scale-110">
          {getModelIcon(currentModelIcon, 16)}
        </div>
        <span className="text-zinc-700 dark:text-zinc-300 tracking-tight font-black">
          {getModelDisplayName(value, allModels)}
        </span>
        <ChevronDown size={12} className="text-zinc-400 group-hover:text-zinc-600 transition-all" />
      </PromptInputModelSelectTrigger>
      
      <PromptInputModelSelectContent className="w-[320px] p-2 rounded-3xl border-zinc-200/60 dark:border-zinc-800 shadow-2xl backdrop-blur-xl bg-white/95 dark:bg-zinc-900/95">
        {categories.map(category => {
          const categoryModels = getModelsByCategory(category.id)
          
          if (categoryModels.length === 0) return null
          
          return (
            <div key={category.id}>
              <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2 first:mt-0">
                {category.name}
              </div>
              {categoryModels.map(model => (
                <PromptInputModelSelectItem 
                  key={model.id} 
                  value={model.id} 
                  className="rounded-xl px-3 py-2.5"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className={`size-8 rounded-xl flex items-center justify-center overflow-hidden ${
                      model.id === 'auto' 
                        ? 'bg-blue-50 dark:bg-blue-900/20' 
                        : model.category === 'reasoning'
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'bg-muted'
                    }`}>
                      {getModelIcon(model.icon, model.id === 'auto' ? 18 : 24)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 italic">
                        {model.name}
                      </span>
                      {model.description && (
                        <span className="text-[10px] text-zinc-500">
                          {model.description}
                        </span>
                      )}
                    </div>
                  </div>
                </PromptInputModelSelectItem>
              ))}
            </div>
          )
        })}
      </PromptInputModelSelectContent>
    </PromptInputModelSelect>
  )
}
