"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  Loader2, Plus, Trash2, Pencil, Check, X, Eye, EyeOff,
  Server, Zap, Globe, Key, Star, ArrowUpDown,
  Sparkles, Brain, Camera, Cpu, Bot, CircleDot
} from "lucide-react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

// ====== 类型 ======

export interface ProviderModel {
  id: string
  name: string
  description?: string
  icon?: string
  enabled: boolean
  supportsVision: boolean
  supportsReasoning: boolean
  maxTokens?: number
  contextWindow?: number
}

export interface AIProvider {
  id: string
  name: string
  type: 'openai' | 'dashscope' | 'custom'
  baseUrl: string
  apiKey: string
  models: ProviderModel[]
  enabled: boolean
  isDefault?: boolean
  priority: number
  createdAt?: string
  updatedAt?: string
}

// ====== 图标映射 ======

const PROVIDER_TYPE_ICONS: Record<string, React.ReactNode> = {
  openai: <Bot className="w-4 h-4" />,
  dashscope: <Sparkles className="w-4 h-4" />,
  custom: <Globe className="w-4 h-4" />,
}

const MODEL_ICON_MAP: Record<string, React.ReactNode> = {
  qwen: <Sparkles className="w-3.5 h-3.5" />,
  deepseek: <Brain className="w-3.5 h-3.5" />,
  openai: <Cpu className="w-3.5 h-3.5" />,
  xiaomi: <Zap className="w-3.5 h-3.5" />,
  sparkles: <Sparkles className="w-3.5 h-3.5" />,
}

function getModelIcon(icon?: string) {
  return MODEL_ICON_MAP[icon || ''] || <CircleDot className="w-3.5 h-3.5" />
}

const TYPE_COLORS: Record<string, string> = {
  openai: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  dashscope: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  custom: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
}

// ====== 预设模板 ======

const PRESET_TEMPLATES = [
  {
    id: 'xiaomi-mimo',
    name: '小米 MIMO',
    type: 'openai' as const,
    baseUrl: 'https://api.xiaomi.com/v1',
    models: [
      { id: 'mimo-v1', name: 'MIMO-V1', description: '小米大语言模型', icon: 'xiaomi', enabled: true, supportsVision: true, supportsReasoning: false },
    ],
  },
  {
    id: 'openai-official',
    name: 'OpenAI 官方',
    type: 'openai' as const,
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: '多模态旗舰', icon: 'openai', enabled: true, supportsVision: true, supportsReasoning: false },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '轻量高效', icon: 'openai', enabled: true, supportsVision: true, supportsReasoning: false },
      { id: 'o1', name: 'o1', description: '推理模型', icon: 'openai', enabled: true, supportsVision: false, supportsReasoning: true },
      { id: 'o3-mini', name: 'o3-mini', description: '轻量推理', icon: 'openai', enabled: true, supportsVision: false, supportsReasoning: true },
    ],
  },
  {
    id: 'deepseek-custom',
    name: 'DeepSeek 官方',
    type: 'openai' as const,
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: '通用对话', icon: 'deepseek', enabled: true, supportsVision: false, supportsReasoning: false },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: '推理增强', icon: 'deepseek', enabled: true, supportsVision: false, supportsReasoning: true },
    ],
  },
]

// ====== 空状态 ======

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-6">
        <Server className="w-7 h-7 text-zinc-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        尚未配置 AI 提供商
      </h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-md">
        添加 OpenAI、DashScope、小米 MIMO 等 AI 服务商，为模型池提供多样化的 API 接入能力。
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="w-4 h-4" />
        添加提供商
      </Button>
    </motion.div>
  )
}

// ====== 提供商卡片 ======

function ProviderCard({
  provider,
  onEdit,
  onDelete,
  onToggleDefault,
  onToggleEnabled,
}: {
  provider: AIProvider
  onEdit: () => void
  onDelete: () => void
  onToggleDefault: () => void
  onToggleEnabled: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        "transition-all duration-200 hover:shadow-md",
        !provider.enabled && "opacity-60"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                TYPE_COLORS[provider.type] || TYPE_COLORS.custom
              )}>
                {PROVIDER_TYPE_ICONS[provider.type]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">{provider.name}</CardTitle>
                  {provider.isDefault && (
                    <Badge variant="secondary" className="text-xs gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                      <Star className="w-3 h-3" /> 默认
                    </Badge>
                  )}
                  <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[provider.type])}>
                    {provider.type}
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-0.5 font-mono">
                  {provider.baseUrl}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onDelete}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* API Key 显示 */}
          <div className="flex items-center gap-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-900 px-3 py-2 rounded-lg">
            <Key className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-zinc-500 truncate">{provider.apiKey || '(未设置)'}</span>
          </div>

          {/* 模型列表 */}
          <div className="flex flex-wrap gap-1.5">
            {provider.models.map(m => (
              <Badge key={m.id} variant="outline" className="text-xs gap-1 py-0.5">
                {getModelIcon(m.icon)}
                {m.name}
                {m.supportsVision && <Camera className="w-3 h-3 text-blue-500" />}
                {m.supportsReasoning && <Brain className="w-3 h-3 text-purple-500" />}
              </Badge>
            ))}
            <Badge variant="outline" className="text-xs text-zinc-400">
              {provider.models.length} 个模型
            </Badge>
          </div>

          {/* 操作栏 */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={provider.enabled}
                  onCheckedChange={onToggleEnabled}
                  className="scale-90"
                />
                <span className="text-xs text-zinc-500">{provider.enabled ? '已启用' : '已禁用'}</span>
              </label>
            </div>
            {!provider.isDefault ? (
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={onToggleDefault}>
                <Star className="w-3 h-3" /> 设为默认
              </Button>
            ) : (
              <span className="text-xs text-amber-600 font-medium">当前默认</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ====== 编辑对话框 ======

interface ProviderFormData {
  id: string
  name: string
  type: 'openai' | 'dashscope' | 'custom'
  baseUrl: string
  apiKey: string
  isDefault: boolean
  enabled: boolean
  priority: number
  models: ProviderModel[]
}

const EMPTY_MODEL: ProviderModel = {
  id: '', name: '', description: '', icon: 'sparkles',
  enabled: true, supportsVision: false, supportsReasoning: false,
}

function ProviderDialog({
  open,
  onClose,
  onSave,
  editing,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: ProviderFormData) => Promise<void>
  editing: AIProvider | null
}) {
  const [form, setForm] = useState<ProviderFormData>({
    id: '', name: '', type: 'openai', baseUrl: '', apiKey: '',
    isDefault: false, enabled: true, priority: 1, models: [],
  })
  const [saving, setSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const isEdit = !!editing

  useEffect(() => {
    if (editing) {
      setForm({
        id: editing.id, name: editing.name, type: editing.type,
        baseUrl: editing.baseUrl, apiKey: editing.apiKey,
        isDefault: !!editing.isDefault, enabled: editing.enabled,
        priority: editing.priority, models: [...editing.models],
      })
    } else {
      setForm({
        id: '', name: '', type: 'openai', baseUrl: '', apiKey: '',
        isDefault: false, enabled: true, priority: 1, models: [],
      })
    }
    setShowKey(false)
  }, [editing, open])

  const addModel = () => {
    setForm(prev => ({ ...prev, models: [...prev.models, { ...EMPTY_MODEL, id: `model-${Date.now()}` }] }))
  }

  const updateModel = (idx: number, field: keyof ProviderModel, value: any) => {
    setForm(prev => ({
      ...prev,
      models: prev.models.map((m, i) => i === idx ? { ...m, [field]: value } : m),
    }))
  }

  const removeModel = (idx: number) => {
    setForm(prev => ({ ...prev, models: prev.models.filter((_, i) => i !== idx) }))
  }

  const handleSave = async () => {
    if (!form.id || !form.name || !form.baseUrl) {
      toast.error('请填写必填字段：ID、名称、Base URL')
      return
    }
    if (form.models.length === 0) {
      toast.error('请至少添加一个模型')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const applyTemplate = (templateId: string) => {
    const template = PRESET_TEMPLATES.find(t => t.id === templateId)
    if (!template) return
    setForm(prev => ({
      ...prev,
      id: template.id,
      name: template.name,
      type: template.type,
      baseUrl: template.baseUrl,
      models: template.models.map(m => ({ ...m })),
    }))
    toast.success(`已应用模板：${template.name}`)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑提供商' : '添加提供商'}</DialogTitle>
          <DialogDescription>
            配置 AI 服务商的 API 连接和可用模型列表
          </DialogDescription>
        </DialogHeader>

        {/* 快速模板 */}
        {!isEdit && (
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs text-zinc-500">快速模板：</Label>
            {PRESET_TEMPLATES.map(t => (
              <Button key={t.id} variant="outline" size="sm" className="text-xs h-7"
                onClick={() => applyTemplate(t.id)}>
                {t.name}
              </Button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">ID <span className="text-red-500">*</span></Label>
            <Input placeholder="如 xiaomi-mimo" value={form.id}
              onChange={e => setForm(p => ({ ...p, id: e.target.value.replace(/\s/g, '-') }))}
              disabled={isEdit} className="font-mono text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">显示名称 <span className="text-red-500">*</span></Label>
            <Input placeholder="如 小米 MIMO" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">API 类型</Label>
            <Select value={form.type} onValueChange={(v: any) => setForm(p => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI 兼容</SelectItem>
                <SelectItem value="dashscope">阿里云百炼</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">优先级（数字越小越优先）</Label>
            <Input type="number" min={1} max={100} value={form.priority}
              onChange={e => setForm(p => ({ ...p, priority: parseInt(e.target.value) || 1 }))} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-sm">Base URL <span className="text-red-500">*</span></Label>
            <Input placeholder="https://api.xiaomi.com/v1" value={form.baseUrl}
              onChange={e => setForm(p => ({ ...p, baseUrl: e.target.value }))} className="font-mono text-sm" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-sm">API Key</Label>
            <div className="relative">
              <Input type={showKey ? 'text' : 'password'} placeholder="sk-..." value={form.apiKey}
                onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} className="font-mono text-sm pr-10" />
              <button type="button" onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* 开关 */}
        <div className="flex items-center gap-6 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={form.enabled} onCheckedChange={v => setForm(p => ({ ...p, enabled: v }))} />
            <span className="text-sm">启用</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={form.isDefault} onCheckedChange={v => setForm(p => ({ ...p, isDefault: v }))} />
            <span className="text-sm">设为默认</span>
          </label>
        </div>

        {/* 模型列表 */}
        <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">模型列表 ({form.models.length})</Label>
            <Button variant="outline" size="sm" className="text-xs gap-1 h-7" onClick={addModel}>
              <Plus className="w-3 h-3" /> 添加模型
            </Button>
          </div>

          <AnimatePresence>
            {form.models.map((model, idx) => (
              <motion.div
                key={model.id || idx}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg"
              >
                <Input placeholder="模型 ID" value={model.id}
                  onChange={e => updateModel(idx, 'id', e.target.value)} className="text-xs font-mono h-8" />
                <Input placeholder="显示名" value={model.name}
                  onChange={e => updateModel(idx, 'name', e.target.value)} className="text-xs h-8" />
                <Input placeholder="描述(可选)" value={model.description || ''}
                  onChange={e => updateModel(idx, 'description', e.target.value)} className="text-xs h-8" />
                <div className="flex items-center gap-1">
                  <label title="视觉" className="cursor-pointer">
                    <input type="checkbox" checked={model.supportsVision}
                      onChange={e => updateModel(idx, 'supportsVision', e.target.checked)}
                      className="rounded border-zinc-300" />
                  </label>
                  <label title="推理" className="cursor-pointer">
                    <input type="checkbox" checked={model.supportsReasoning}
                      onChange={e => updateModel(idx, 'supportsReasoning', e.target.checked)}
                      className="rounded border-zinc-300" />
                  </label>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600"
                    onClick={() => removeModel(idx)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {isEdit ? '保存修改' : '添加提供商'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ====== 主组件 ======

export function AIProvidersManager() {
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AIProvider | null>(null)
  const [deleting, setDeleting] = useState<AIProvider | null>(null)

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-providers')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setProviders(data.providers || [])
    } catch (e) {
      console.error(e)
      toast.error('加载提供商失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProviders() }, [fetchProviders])

  // 创建 / 更新
  const handleSave = async (data: ProviderFormData & { apiKey: string; models: ProviderModel[] }) => {
    const url = editing ? '/api/admin/ai-providers' : '/api/admin/ai-providers'
    const method = editing ? 'PUT' : 'POST'

    const body = editing
      ? { ...data }
      : data

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || '操作失败')
    }

    toast.success(editing ? '提供商已更新' : '提供商已添加')
    fetchProviders()
  }

  // 删除
  const handleDelete = async () => {
    if (!deleting) return
    try {
      const res = await fetch(`/api/admin/ai-providers?id=${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success(`已删除 ${deleting.name}`)
      fetchProviders()
    } catch {
      toast.error('删除失败')
    } finally {
      setDeleting(null)
    }
  }

  // 切换默认
  const handleToggleDefault = async (p: AIProvider) => {
    try {
      await fetch('/api/admin/ai-providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, isDefault: true }),
      })
      fetchProviders()
    } catch {
      toast.error('设置默认失败')
    }
  }

  // 切换启用
  const handleToggleEnabled = async (p: AIProvider) => {
    try {
      await fetch('/api/admin/ai-providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, enabled: !p.enabled }),
      })
      fetchProviders()
    } catch {
      toast.error('切换状态失败')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  const totalModels = providers.reduce((sum, p) => sum + p.models.length, 0)

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">AI 提供商管理</h2>
          <p className="text-sm text-zinc-500 mt-1">
            管理 AI 服务商接入，共 {providers.length} 个提供商 · {totalModels} 个可用模型
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true) }} className="gap-2">
          <Plus className="w-4 h-4" /> 添加提供商
        </Button>
      </div>

      {/* 提供商列表 */}
      {providers.length === 0 ? (
        <EmptyState onAdd={() => { setEditing(null); setDialogOpen(true) }} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {providers.map(p => (
              <ProviderCard
                key={p.id}
                provider={p}
                onEdit={() => { setEditing(p); setDialogOpen(true) }}
                onDelete={() => setDeleting(p)}
                onToggleDefault={() => handleToggleDefault(p)}
                onToggleEnabled={() => handleToggleEnabled(p)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 编辑对话框 */}
      <ProviderDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null) }}
        onSave={handleSave}
        editing={editing}
      />

      {/* 删除确认 */}
      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除提供商「{deleting?.name}」吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
