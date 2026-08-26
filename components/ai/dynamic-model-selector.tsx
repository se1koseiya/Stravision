"use client"

import { useEffect, useMemo, useState } from 'react'
import { useAIModels, type AIProvider } from '@/lib/hooks/use-ai-models'
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down"
import { Qwen, DeepSeek, Moonshot, Zhipu, Minimax, OpenAI } from '@lobehub/icons'
import { Sparkles, Loader2, Check, Pencil, Plus, X } from "lucide-react"
import {
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
} from "@/components/ui/assistant-ui"
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface DynamicModelSelectorProps {
  value: string
  onValueChange: (value: string) => void
}

interface CustomModel {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  modelId: string
  rateMultiplier?: number
}

const CUSTOM_MODELS_KEY = 'berry-realm.custom-models.v1'
const MAX_MODE_KEY = 'berry-realm.max-mode.v1'

function getModelIcon(iconType: string, size: number = 18) {
  switch (iconType) {
    case 'qwen': return <Qwen.Color size={size} />
    case 'deepseek': return <DeepSeek.Color size={size} />
    case 'moonshot': return <Moonshot size={size} />
    case 'zhipu': return <Zhipu.Color size={size} />
    case 'minimax': return <Minimax size={size} />
    case 'openai': return <OpenAI.Color size={size} />
    case 'sparkles': return <Sparkles size={size * 0.7} className="text-blue-500" />
    default: return <Qwen.Color size={size} />
  }
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

  // 用户自配模型（localStorage 持久化）
  const [customModels, setCustomModels] = useState<CustomModel[]>([])
  const [maxMode, setMaxMode] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [editingCustom, setEditingCustom] = useState<CustomModel | null>(null)

  // 从 localStorage 加载
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_MODELS_KEY)
      if (raw) setCustomModels(JSON.parse(raw))
      const m = localStorage.getItem(MAX_MODE_KEY)
      if (m === '1') setMaxMode(true)
    } catch { /* ignore */ }
  }, [])

  const persistCustom = (list: CustomModel[]) => {
    setCustomModels(list)
    try { localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(list)) } catch {}
  }
  const toggleMax = (v: boolean) => {
    setMaxMode(v)
    try { localStorage.setItem(MAX_MODE_KEY, v ? '1' : '0') } catch {}
  }

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
  const globalMultiplier = typeof config.creditMultiplier === 'number' && config.creditMultiplier > 0 ? config.creditMultiplier : 1
  const effectiveRate = (rate?: number) => {
    const r = typeof rate === 'number' && rate > 0 ? rate : 1
    return Number((r * globalMultiplier).toFixed(2))
  }
  const currentModelIcon = getModelIcon2(value, allModels)

  // 扁平化所有启用的模型（按提供商顺序）
  const flatModels = providers.length > 0
    ? providers.flatMap((p: AIProvider) => getModelsByProvider(p.id))
    : allModels

  // Max 模式：只显示支持推理的模型（reasoning）
  const visibleModels = maxMode
    ? flatModels.filter((m: any) => m.supportsReasoning)
    : flatModels

  // 当前选中模型的展示名（trigger 显示）
  const currentDisplayName = (() => {
    if (value === 'auto') return 'Auto'
    const m = visibleModels.find((x: any) => x.id === value)
    if (m) return m.name
    const c = customModels.find(x => x.id === value)
    if (c) return c.name
    const anyM = flatModels.find((x: any) => x.id === value) || allModels.find((x: any) => x.id === value)
    return anyM?.name || customModels.find(x => x.id === value)?.name || value
  })()

  const renderRow = (id: string, icon: React.ReactNode, name: string, rate: number, badges?: string[]) => (
    <DropdownMenuItem
      key={id}
      onSelect={(e) => { e.preventDefault(); onValueChange(id) }}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer outline-none",
        "transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/60",
        "focus:bg-gray-50 dark:focus:bg-zinc-800/60"
      )}
    >
      <div className="flex-shrink-0">{icon}</div>
      <span className="flex-1 text-[13.5px] font-medium text-gray-900 dark:text-zinc-100 truncate">{name}</span>
      {badges && badges.length > 0 && (
        <div className="flex items-center gap-1 mr-1">
          {badges.map((b, i) => (
            <span
              key={i}
              className={cn(
                "px-1.5 py-0.5 rounded-md text-[10px] font-medium",
                i % 2 === 0
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                  : "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
              )}
            >{b}</span>
          ))}
        </div>
      )}
      <span className="flex-shrink-0 text-[12px] font-mono tabular-nums text-gray-400 dark:text-zinc-500">
        {rate.toFixed(2)}x
      </span>
      {value === id && (
        <Check size={14} strokeWidth={2.5} className="flex-shrink-0 text-blue-500" />
      )}
    </DropdownMenuItem>
  )

  return (
    <PromptInputModelSelect value={value} onValueChange={onValueChange}>
      <PromptInputModelSelectTrigger className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors font-medium text-sm h-auto focus:ring-0 border-0 shadow-none group">
        {currentModelIcon && currentModelIcon !== 'sparkles' && (
          <span className="w-4 h-4 inline-flex items-center justify-center">
            {getModelIcon(currentModelIcon, 16)}
          </span>
        )}
        <span className="text-gray-700 dark:text-zinc-200 font-medium">
          {currentDisplayName}
        </span>
        <ChevronDown size={12} className="text-gray-400" />
      </PromptInputModelSelectTrigger>

      <PromptInputModelSelectContent
        align="start"
        sideOffset={8}
        className={cn(
          "w-[380px] p-0 rounded-2xl bg-white dark:bg-zinc-900",
          "border border-gray-100 dark:border-zinc-800",
          "shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
          "overflow-hidden"
        )}
      >
        {/* 顶部：Max 模式 + Auto 行 */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center justify-between py-1.5 px-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500/15 to-blue-500/15 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              </div>
              <span className="text-[13.5px] font-medium text-gray-900 dark:text-zinc-100">Max 模式</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={maxMode}
              onClick={(e) => { e.preventDefault(); toggleMax(!maxMode) }}
              className={cn(
                "relative w-9 h-5 rounded-full transition-colors",
                maxMode ? "bg-blue-500" : "bg-gray-200 dark:bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                  maxMode ? "translate-x-[18px]" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {renderRow('auto', <Sparkles className="w-4 h-4 text-blue-500" />, 'Auto', effectiveRate(0.6))}
        </div>

        {/* 分隔线 */}
        {(visibleModels.length > 0 || customModels.length > 0) && (
          <div className="h-px bg-gray-100 dark:bg-zinc-800 mx-3" />
        )}

        {/* 模型列表（max 模式时显示推理模型） */}
        {maxMode ? (
          <div className="py-1 max-h-[320px] overflow-y-auto">
            {visibleModels.length > 0 ? visibleModels.map((m: any) => renderRow(
              m.id,
              getModelIcon(m.icon || 'qwen', 16),
              m.name,
              effectiveRate(m.rateMultiplier),
              m.badges,
            )) : (
              <div className="px-3 py-4 text-[12.5px] text-gray-400 dark:text-zinc-500 text-center">
                暂无可用推理模型
              </div>
            )}
          </div>
        ) : (
          <>
            {visibleModels.length > 0 && (
              <div className="py-1 max-h-[320px] overflow-y-auto">
                {visibleModels.map((m: any) => renderRow(
                  m.id,
                  getModelIcon(m.icon || 'qwen', 16),
                  m.name,
                  effectiveRate(m.rateMultiplier),
                  m.badges,
                ))}
              </div>
            )}
            {/* 用户自配模型（"我的模型"分组） */}
            {customModels.length > 0 && (
              <div className="py-1">
                {customModels.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer outline-none transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/60"
                    onClick={(e) => { e.preventDefault(); onValueChange(c.id) }}
                  >
                    <div className="flex-shrink-0 w-4 h-4 inline-flex items-center justify-center rounded bg-gray-100 dark:bg-zinc-800">
                      <Pencil className="w-2.5 h-2.5 text-gray-500 dark:text-zinc-400" />
                    </div>
                    <span className="flex-1 text-[13.5px] font-medium text-gray-900 dark:text-zinc-100 truncate">{c.name}</span>
                    <span className="flex-shrink-0 text-[12px] font-mono tabular-nums text-gray-400 dark:text-zinc-500">
                      {effectiveRate(c.rateMultiplier ?? 1).toFixed(2)}x
                    </span>
                    {value === c.id && (
                      <Check size={14} strokeWidth={2.5} className="flex-shrink-0 text-blue-500" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingCustom(c) }}
                      className="flex-shrink-0 p-1 rounded hover:bg-gray-200/60 dark:hover:bg-zinc-700/60"
                      title="编辑"
                    >
                      <Pencil className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 底部：配置自定义模型 */}
        <div className="h-px bg-gray-100 dark:bg-zinc-800 mx-3" />
        <div className="p-2">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setEditingCustom({ id: `custom-${Date.now()}`, name: '', baseUrl: '', apiKey: '', modelId: '' }); setConfigOpen(true) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13.5px] font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>配置自定义模型</span>
          </button>
        </div>
      </PromptInputModelSelectContent>

      {/* 自定义模型编辑对话框 */}
      {editingCustom && (
        <CustomModelDialog
          open={configOpen || !!editingCustom}
          initial={editingCustom}
          onClose={() => { setEditingCustom(null); setConfigOpen(false) }}
          onSave={(m) => {
            const exists = customModels.find(x => x.id === m.id)
            const next = exists
              ? customModels.map(x => x.id === m.id ? m : x)
              : [...customModels, m]
            persistCustom(next)
            setEditingCustom(null)
            setConfigOpen(false)
          }}
        />
      )}
    </PromptInputModelSelect>
  )
}

function CustomModelDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  initial: CustomModel
  onClose: () => void
  onSave: (m: CustomModel) => void
}) {
  const [name, setName] = useState(initial.name)
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl)
  const [apiKey, setApiKey] = useState(initial.apiKey)
  const [modelId, setModelId] = useState(initial.modelId)
  const [rateMultiplier, setRateMultiplier] = useState<number | undefined>(initial.rateMultiplier)

  if (!open) return null

  const handleSave = () => {
    if (!name.trim() || !baseUrl.trim() || !modelId.trim()) return
    onSave({
      id: initial.id,
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      modelId: modelId.trim(),
      rateMultiplier: rateMultiplier,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[440px] max-w-[92vw] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-100">配置自定义模型</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
            title="关闭"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <p className="text-[12px] text-gray-500 dark:text-zinc-400 mb-4 leading-relaxed">
          配置任意 OpenAI 兼容的 API 端点（如 OpenRouter、Moonshot、自建部署等）。仅保存在本设备。
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-[12px] font-medium text-gray-700 dark:text-zinc-300 block mb-1">显示名称</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：我的 Moonshot"
              className="h-9"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-gray-700 dark:text-zinc-300 block mb-1">Base URL</label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="h-9 font-mono text-[12px]"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-gray-700 dark:text-zinc-300 block mb-1">API Key</label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="h-9 font-mono text-[12px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-gray-700 dark:text-zinc-300 block mb-1">模型 ID</label>
              <Input
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="kimi-k2-0711-preview"
                className="h-9 font-mono text-[12px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-gray-700 dark:text-zinc-300 block mb-1">积分倍率（可选）</label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={rateMultiplier ?? ''}
                onChange={(e) => setRateMultiplier(e.target.value === '' ? undefined : Number(e.target.value))}
                placeholder="默认 1"
                className="h-9"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!name.trim() || !baseUrl.trim() || !modelId.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            保存
          </Button>
        </div>
      </div>
    </div>
  )
}
