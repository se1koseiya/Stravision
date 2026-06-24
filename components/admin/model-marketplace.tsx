"use client"

import { useState, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Loader2, Search, Filter, Sparkles, Brain, Camera,
  Bot, Globe, Zap, Cpu, CircleDot, CheckCircle2,
  Eye, Star, ArrowUpDown
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

// 复用类型
import type { AIProvider, ProviderModel } from "./ai-providers-manager"

// ====== 图标映射 ======

const MODEL_ICON_MAP: Record<string, React.ReactNode> = {
  qwen: <Sparkles className="w-4 h-4" />,
  deepseek: <Brain className="w-4 h-4" />,
  openai: <Cpu className="w-4 h-4" />,
  xiaomi: <Zap className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
}

function getModelIcon(icon?: string) {
  return MODEL_ICON_MAP[icon || ''] || <CircleDot className="w-4 h-4" />
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'from-blue-500/10 to-blue-600/5 border-blue-200/50 dark:border-blue-800/30',
  dashscope: 'from-emerald-500/10 to-emerald-600/5 border-emerald-200/50 dark:border-emerald-800/30',
  custom: 'from-violet-500/10 to-violet-600/5 border-violet-200/50 dark:border-violet-800/30',
}

// ====== 模型卡片 ======

function ModelCard({
  model,
  providerName,
  providerType,
  providerEnabled,
  isDefaultProvider,
}: {
  model: ProviderModel
  providerName: string
  providerType: string
  providerEnabled: boolean
  isDefaultProvider: boolean
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      <Card className={cn(
        "group cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden bg-gradient-to-br",
        PROVIDER_COLORS[providerType] || PROVIDER_COLORS.custom,
        !providerEnabled && "opacity-50 pointer-events-none",
        !model.enabled && "opacity-60"
      )}>
        <CardContent className="p-4">
          {/* 顶部：图标 + 名称 + 状态 */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                model.enabled ? "bg-white dark:bg-zinc-800 shadow-sm" : "bg-zinc-100 dark:bg-zinc-900"
              )}>
                {model.enabled ? getModelIcon(model.icon) : (
                  <span className="text-zinc-300">{getModelIcon(model.icon)}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className={cn(
                    "font-semibold text-sm",
                    model.enabled ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"
                  )}>
                    {model.name}
                  </h3>
                  {model.enabled ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-zinc-300 dark:border-zinc-600" />
                  )}
                </div>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{model.id}</p>
              </div>
            </div>

            {isDefaultProvider && (
              <Badge variant="secondary" className="text-[10px] gap-0.5 bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950 dark:text-amber-400">
                <Star className="w-2.5 h-2.5" /> 默认源
              </Badge>
            )}
          </div>

          {/* 描述 */}
          {model.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
              {model.description}
            </p>
          )}

          {/* 标签行 */}
          <div className="flex flex-wrap items-center gap-1.5">
            {model.supportsVision && (
              <Badge variant="outline" className="text-[10px] gap-1 py-0 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400">
                <Camera className="w-2.5 h-2.5" /> 视觉
              </Badge>
            )}
            {model.supportsReasoning && (
              <Badge variant="outline" className="text-[10px] gap-1 py-0 border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400">
                <Brain className="w-2.5 h-2.5" /> 推理
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] text-zinc-500">
              {providerName}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ====== 主组件 ======

export function ModelMarketplace() {
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCapability, setFilterCapability] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('enabled')
  const [sortBy, setSortBy] = useState<string>('provider')

  useEffect(() => {
    fetch('/api/admin/ai-providers')
      .then(r => r.json())
      .then(d => setProviders(d.providers || []))
      .catch(() => toast.error('加载失败'))
      .finally(() => setLoading(false))
  }, [])

  // 展平模型 + 搜索过滤 + 排序
  const flatModels = useMemo(() => {
    let items: (ProviderModel & { providerId: string; providerName: string; providerType: string; providerEnabled: boolean; isDefaultProvider: boolean })[] = []

    providers.forEach(p => {
      p.models.forEach(m => {
        items.push({
          ...m,
          providerId: p.id,
          providerName: p.name,
          providerType: p.type,
          providerEnabled: p.enabled,
          isDefaultProvider: !!p.isDefault,
        })
      })
    })

    // 搜索
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.providerName.toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
      )
    }

    // 类型过滤
    if (filterType !== 'all') {
      items = items.filter(m => m.providerType === filterType)
    }

    // 能力过滤
    if (filterCapability === 'vision') {
      items = items.filter(m => m.supportsVision)
    } else if (filterCapability === 'reasoning') {
      items = items.filter(m => m.supportsReasoning)
    } else if (filterCapability === 'both') {
      items = items.filter(m => m.supportsVision && m.supportsReasoning)
    }

    // 状态过滤
    if (filterStatus === 'enabled') {
      items = items.filter(m => m.enabled)
    } else if (filterStatus === 'disabled') {
      items = items.filter(m => !m.enabled)
    }

    // 排序
    switch (sortBy) {
      case 'name':
        items.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'provider':
        items.sort((a, b) => a.providerName.localeCompare(b.providerName) || a.name.localeCompare(b.name))
        break
      case 'type':
        items.sort((a, b) => a.providerType.localeCompare(b.providerType) || a.name.localeCompare(b.name))
        break
    }

    return items
  }, [providers, search, filterType, filterCapability, filterStatus, sortBy])

  // 统计
  const stats = useMemo(() => ({
    total: providers.reduce((s, p) => s + p.models.length, 0),
    enabled: providers.reduce((s, p) => s + p.models.filter(m => m.enabled).length, 0),
    vision: providers.reduce((s, p) => s + p.models.filter(m => m.enabled && m.supportsVision).length, 0),
    reasoning: providers.reduce((s, p) => s + p.models.filter(m => m.enabled && m.supportsReasoning).length, 0),
    providers: providers.length,
  }), [providers])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部统计 */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">AI 模型市场</h2>
        <p className="text-sm text-zinc-500 mt-1">
          浏览所有已配置提供商的可用模型，共 {stats.total} 个模型（{stats.enabled} 个启用中）
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: '总模型', value: stats.total, icon: <Bot className="w-4 h-4" />, color: 'text-zinc-600' },
          { label: '已启用', value: stats.enabled, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-600' },
          { label: '视觉模型', value: stats.vision, icon: <Camera className="w-4 h-4" />, color: 'text-blue-600' },
          { label: '推理模型', value: stats.reasoning, icon: <Brain className="w-4 h-4" />, color: 'text-purple-600' },
          { label: '提供商', value: stats.providers, icon: <Globe className="w-4 h-4" />, color: 'text-orange-600' },
        ].map(s => (
          <Card key={s.label} className="py-3 px-4">
            <CardContent className="p-0 flex items-center gap-3">
              <div className={cn("shrink-0", s.color)}>{s.icon}</div>
              <div>
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-[11px] text-zinc-500">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 搜索和筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="搜索模型名称、ID、描述..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] text-sm"><SelectValue placeholder="API 类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="openai">OpenAI 兼容</SelectItem>
            <SelectItem value="dashscope">百炼 DashScope</SelectItem>
            <SelectItem value="custom">自定义</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCapability} onValueChange={setFilterCapability}>
          <SelectTrigger className="w-[130px] text-sm"><SelectValue placeholder="能力筛选" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部能力</SelectItem>
            <SelectItem value="vision">视觉</SelectItem>
            <SelectItem value="reasoning">推理</SelectItem>
            <SelectItem value="both">视觉+推理</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[110px] text-sm"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="enabled">已启用</SelectItem>
            <SelectItem value="disabled">已禁用</SelectItem>
            <SelectItem value="all">全部</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[120px] text-sm"><SelectValue placeholder="排序" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="provider">按提供商</SelectItem>
            <SelectItem value="name">按名称</SelectItem>
            <SelectItem value="type">按类型</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 结果计数 */}
      <div className="text-xs text-zinc-500 font-medium">
        显示 {flatModels.length} / {stats.total} 个模型
      </div>

      {/* 模型网格 */}
      {flatModels.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <Filter className="w-10 h-10 text-zinc-300 mb-4" />
          <p className="text-sm text-zinc-500">没有匹配的模型</p>
          <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => {
            setSearch(''); setFilterType('all'); setFilterCapability('all'); setFilterStatus('enabled')
          }}>
            清除所有筛选
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {flatModels.map((m, i) => (
              <ModelCard key={`${m.providerId}-${m.id}`} model={m}
                providerName={m.providerName}
                providerType={m.providerType}
                providerEnabled={m.providerEnabled}
                isDefaultProvider={m.isDefaultProvider}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 按提供商分组视图提示 */}
      {flatModels.length > 0 && (
        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">按提供商分布</h3>
          <div className="space-y-2">
            {providers.map(p => (
              <div key={p.id} className="flex items-center gap-3 text-xs">
                <span className="font-medium text-zinc-700 dark:text-zinc-300 min-w-[160px] truncate">{p.name}</span>
                <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500",
                      p.type === 'dashscope' ? "bg-emerald-400" :
                      p.type === 'openai' ? "bg-blue-400" :
                      "bg-violet-400"
                    )}
                    style={{ width: `${(p.models.length / Math.max(1, stats.total)) * 100}%` }}
                  />
                </div>
                <span className="text-zinc-500 tabular-nums w-8 text-right">
                  {p.models.length}/{p.models.filter(m => m.enabled).length}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
