"use client"

import { useState, useEffect } from "react"
import { Button, Input, Switch, Card, Select, Modal, Typography, Spin, Form } from "antd"
import { PlusOutlined, DeleteOutlined, EditOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons"
import { toast } from "sonner"

const { Text } = Typography

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
      setConfig({
        ...config,
        models: config.models.map((m, i) =>
          i === existingIndex ? editingModel : m
        )
      })
      toast.success('模型已更新')
    } else {
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
    
    newModels.forEach((m, i) => {
      m.order = i
    })
    
    setConfig({ ...config, models: newModels })
  }

  const handleModalOk = () => {
    handleSaveModel()
  }

  const handleModalCancel = () => {
    setDialogOpen(false)
    setEditingModel(null)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!config) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#8c8c8c' }}>
        加载配置失败
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 'bold', color: '#262626', margin: 0 }}>
            AI 模型管理
          </h3>
          <p style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
            管理 AI 助手页面的模型列表
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchConfig}
          >
            重新加载
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddModel}
          >
            添加模型
          </Button>
          <Button
            type="primary"
            icon={saving ? <Spin size="small" /> : <SaveOutlined />}
            onClick={handleSave}
            disabled={saving}
          >
            保存配置
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {config.categories.map(category => {
          const categoryModels = config.models.filter(m => m.category === category.id)
          
          if (categoryModels.length === 0) return null
          
          return (
            <Card
              key={category.id}
              title={<Text strong style={{ fontSize: 14 }}>{category.name}</Text>}
              extra={<Text type="secondary" style={{ fontSize: 12 }}>{categoryModels.length} 个模型</Text>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categoryModels.map((model, index) => (
                  <div
                    key={model.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderRadius: 6,
                      border: '1px solid #f0f0f0',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Button
                        type="text"
                        size="small"
                        onClick={() => handleMoveModel(model.id, 'up')}
                        disabled={index === 0}
                        style={{ padding: '2px 4px', height: 'auto', opacity: index === 0 ? 0.3 : 1 }}
                      >
                        ▲
                      </Button>
                      <Button
                        type="text"
                        size="small"
                        onClick={() => handleMoveModel(model.id, 'down')}
                        disabled={index === categoryModels.length - 1}
                        style={{ padding: '2px 4px', height: 'auto', opacity: index === categoryModels.length - 1 ? 0.3 : 1 }}
                      >
                        ▼
                      </Button>
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text strong style={{ fontSize: 13, color: '#262626' }}>
                          {model.name}
                        </Text>
                        <code style={{
                          fontSize: 11,
                          color: '#8c8c8c',
                          backgroundColor: '#f5f5f5',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontFamily: 'monospace'
                        }}>
                          {model.id}
                        </code>
                      </div>
                      {model.description && (
                        <p style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2, marginBottom: 0 }}>
                          {model.description}
                        </p>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Switch
                        checked={model.enabled}
                        onChange={() => handleToggleModel(model.id)}
                      />
                      <Button
                        type="text"
                        size="small"
                        onClick={() => handleEditModel(model)}
                        icon={<EditOutlined />}
                      />
                      <Button
                        type="text"
                        size="small"
                        danger
                        onClick={() => handleDeleteModel(model.id)}
                        icon={<DeleteOutlined />}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      <Modal
        open={dialogOpen}
        title={editingModel?.id && config.models.find(m => m.id === editingModel.id) ? '编辑模型' : '添加模型'}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        footer={[
          <Button key="cancel" onClick={handleModalCancel}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={handleModalOk}>
            保存
          </Button>
        ]}
      >
        {editingModel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
            <Form.Item label="模型 ID *" style={{ marginBottom: 8 }}>
              <Input
                value={editingModel.id}
                onChange={(e) => setEditingModel({ ...editingModel, id: e.target.value })}
                placeholder="例如: qwen-max"
                disabled={!!config.models.find(m => m.id === editingModel.id)}
              />
            </Form.Item>
            
            <Form.Item label="显示名称 *" style={{ marginBottom: 8 }}>
              <Input
                value={editingModel.name}
                onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                placeholder="例如: Qwen Max"
              />
            </Form.Item>
            
            <Form.Item label="描述" style={{ marginBottom: 8 }}>
              <Input
                value={editingModel.description}
                onChange={(e) => setEditingModel({ ...editingModel, description: e.target.value })}
                placeholder="例如: 通义千问最强生产力工具"
              />
            </Form.Item>
            
            <Form.Item label="分类" style={{ marginBottom: 8 }}>
              <Select
                value={editingModel.category}
                onChange={(value) => setEditingModel({ ...editingModel, category: value })}
              >
                {config.categories.map(cat => (
                  <Select.Option key={cat.id} value={cat.id}>
                    {cat.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item label="图标" style={{ marginBottom: 8 }}>
              <Select
                value={editingModel.icon}
                onChange={(value) => setEditingModel({ ...editingModel, icon: value })}
              >
                <Select.Option value="qwen">Qwen</Select.Option>
                <Select.Option value="deepseek">DeepSeek</Select.Option>
                <Select.Option value="moonshot">Moonshot (Kimi)</Select.Option>
                <Select.Option value="zhipu">Zhipu (GLM)</Select.Option>
                <Select.Option value="minimax">Minimax</Select.Option>
                <Select.Option value="sparkles">Sparkles (自动)</Select.Option>
              </Select>
            </Form.Item>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Switch
                checked={editingModel.enabled}
                onChange={(checked) => setEditingModel({ ...editingModel, enabled: checked })}
              />
              <Text>启用此模型</Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
