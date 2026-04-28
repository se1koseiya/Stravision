"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, GripVertical, Save, RotateCcw } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AIModel {
  id: string
  name: string
  description: string
  category: string
  icon: string
  enabled: boolean
  order: number
}

interface Category {
  id: string
  name: string
  order: number
}

interface ModelsConfig {
  models: AIModel[]
  categories: Category[]
}

export function AIModelsManager() {
  const [config, setConfig] = useState<ModelsConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingModel, setEditingModel] = useState<AIModel | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/ai-models')
      if (!res.ok) throw new Error('Failed to fetch config')
      const data = await res.json()
      setConfig(data)
    } catch (error) {
      console.error(error)
      toast.error('加载模型配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!config) return
    
    setSaving(true)
    try {
      const res = await fetch('/api/admin/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      if (!res.ok) throw new Error('Failed to save config')
      
      toast.success('模型配置已保存')
    } catch (error) {
      console.error(error)
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleModel = (modelId: string) => {
    if (!config) return
    
    setConfig({
      ...config,
      models: config.models.map(m =>
        m.id === modelId ? { ...m, enabled: !m.enabled } : m
      )
    })
  }

  const handleDeleteModel = (modelId: string) => {
    if (!config) return
    
    if (confirm('确定要删除这个模型吗？')) {
      setConfig({
        ...config,
        models: config.models.filter(m => m.id !== modelId)
      })
      toast.success('模型已删除')
    }
  }

  const handleAddModel = () => {
    setEditingModel({
      id: '',
      name: '',
      description: '',
      category: 'other',
      icon: 'qwen',
      enabled: true,
      order: config?.models.length || 0
    })
    setDialogOpen(true)
  }

  const handleEditModel = (model: AIModel) => {
    setEditingModel({ ...model })
    setDialogOpen(true)
  }

  const handleSaveModel = () => {
    if (!editingModel || !config) return
    
    if (!editingModel.id || !editingModel.name) {
      toast.error('请填写模型 ID 和名称')
      return
    }
    
    const existingIndex = config.models.findIndex(m => m.id === editingModel.id)
    
    if (existingIndex >= 0) {
      // 更新现有模型
      setConfig({
        ...config,
        models: config.models.map((m, i) =>
          i === existingIndex ? editingModel : m
        )
      })
      toast.success('模型已更新')
    } else {
      // 添加新模型
      setConfig({
        ...config,
        models: [...config.models, editingModel]
      })
      toast.success('模型已添加')
    }
    
    setDialogOpen(false)
    setEditingModel(null)
  }

  const handleMoveModel = (modelId: string, direction: 'up' | 'down') => {
    if (!config) return
    
    const index = config.models.findIndex(m => m.id === modelId)
    if (index === -1) return
    
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= config.models.length) return
    
    const newModels = [...config.models]
    const temp = newModels[index]
    newModels[index] = newModels[newIndex]
    newModels[newIndex] = temp
    
    // 更新 order
    newModels.forEach((m, i) => {
      m.order = i
    })
    
    setConfig({ ...config, models: newModels })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="p-12 text-center text-zinc-500">
        加载配置失败
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            AI 模型管理
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            管理 AI 助手页面的模型列表
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchConfig}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            重新加载
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddModel}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            添加模型
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            保存配置
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {config.categories.map(category => {
          const categoryModels = config.models.filter(m => m.category === category.id)
          
          if (categoryModels.length === 0) return null
          
          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="text-base">{category.name}</CardTitle>
                <CardDescription>
                  {categoryModels.length} 个模型
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {categoryModels.map((model, index) => (
                  <div
                    key={model.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50"
                  >
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleMoveModel(model.id, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <GripVertical className="h-3 w-3 text-zinc-400" />
                      </button>
                      <button
                        onClick={() => handleMoveModel(model.id, 'down')}
                        disabled={index === categoryModels.length - 1}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <GripVertical className="h-3 w-3 text-zinc-400" />
                      </button>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {model.name}
                        </span>
                        <code className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                          {model.id}
                        </code>
                      </div>
                      {model.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {model.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={model.enabled}
                        onCheckedChange={() => handleToggleModel(model.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditModel(model)}
                        className="h-8 w-8 p-0"
                      >
                        <span className="sr-only">编辑</span>
                        ✏️
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteModel(model.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 编辑/添加模型对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingModel?.id && config.models.find(m => m.id === editingModel.id)
                ? '编辑模型'
                : '添加模型'}
            </DialogTitle>
            <DialogDescription>
              配置模型的基本信息
            </DialogDescription>
          </DialogHeader>
          
          {editingModel && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="model-id">模型 ID *</Label>
                <Input
                  id="model-id"
                  value={editingModel.id}
                  onChange={(e) => setEditingModel({ ...editingModel, id: e.target.value })}
                  placeholder="例如: qwen-max"
                  disabled={!!config.models.find(m => m.id === editingModel.id)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="model-name">显示名称 *</Label>
                <Input
                  id="model-name"
                  value={editingModel.name}
                  onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                  placeholder="例如: Qwen Max"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="model-description">描述</Label>
                <Input
                  id="model-description"
                  value={editingModel.description}
                  onChange={(e) => setEditingModel({ ...editingModel, description: e.target.value })}
                  placeholder="例如: 通义千问最强生产力工具"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="model-category">分类</Label>
                <Select
                  value={editingModel.category}
                  onValueChange={(value) => setEditingModel({ ...editingModel, category: value })}
                >
                  <SelectTrigger id="model-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="model-icon">图标</Label>
                <Select
                  value={editingModel.icon}
                  onValueChange={(value) => setEditingModel({ ...editingModel, icon: value })}
                >
                  <SelectTrigger id="model-icon">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qwen">Qwen</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="moonshot">Moonshot (Kimi)</SelectItem>
                    <SelectItem value="zhipu">Zhipu (GLM)</SelectItem>
                    <SelectItem value="minimax">Minimax</SelectItem>
                    <SelectItem value="sparkles">Sparkles (自动)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="model-enabled"
                  checked={editingModel.enabled}
                  onCheckedChange={(checked) => setEditingModel({ ...editingModel, enabled: checked })}
                />
                <Label htmlFor="model-enabled">启用此模型</Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveModel}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
