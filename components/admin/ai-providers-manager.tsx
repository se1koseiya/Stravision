"use client"

import { useState, useEffect, useCallback } from "react"
import type { FormInstance } from 'antd'
import { Button, Input, InputNumber, Switch, Card, Select, Tag, Tabs, Modal, Form, Typography, Space, Badge as AntdBadge } from 'antd'
import type { SizeType } from 'antd/es/config-provider/SizeContext'
import { toast } from "sonner"
import {
  Loader2, Plus, Trash2, Pencil, Check, X, Eye, EyeOff,
  Server, Zap, Globe, Key, Star, ArrowUpDown,
  Sparkles, Brain, Camera, Cpu, Bot, CircleDot, BookOpen, Coins
} from "lucide-react"
// 模型品牌图标（@lobehub/icons：Qwen/DeepSeek/Kimi/智谱/MiniMax/OpenAI/Claude/Gemini/Grok 等）
import {
  Qwen, DeepSeek, Moonshot, Zhipu, Minimax, OpenAI,
  Claude, Gemini, Grok, Mistral, Glama, Gemma, Hunyuan, Doubao, Spark,
} from "@lobehub/icons"

// ====== 类型 ======

export interface ProviderModel {
  id: string
  name: string
  description?: string
  icon?: string
  enabled: boolean
  supportsVision: boolean
  supportsReasoning: boolean
  supportsEmbedding?: boolean
  maxTokens?: number
  contextWindow?: number
  /** 积分倍率（相对基准的计费倍数；未设置按模型名启发式） */
  rateMultiplier?: number
}

export interface AIProvider {
  id: string
  name: string
  type: 'openai' | 'dashscope' | 'custom' | 'glm'
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
  openai: <Bot size={16} />,
  dashscope: <Sparkles size={16} />,
  custom: <Globe size={16} />,
  glm: <Brain size={16} />,
}

// 品牌图标渲染（自动回退 .Color 变体；lobehub 组件可能只有彩色或只有单色）
const brandIcon = (C: any, size: number) => {
  const Comp = C?.Color || C
  return <Comp size={size} />
}

/** 可选模型图标 key（admin 模型编辑器的图标选择器） */
export const MODEL_ICON_KEYS = [
  'qwen', 'deepseek', 'moonshot', 'kimi', 'zhipu', 'minimax', 'openai',
  'claude', 'gemini', 'grok', 'mistral', 'llama', 'gemma',
  'hunyuan', 'doubao', 'spark', 'sparkles',
] as const

const MODEL_ICON_MAP: Record<string, React.ReactNode> = {
  qwen: brandIcon(Qwen, 14),
  deepseek: brandIcon(DeepSeek, 14),
  moonshot: brandIcon(Moonshot, 14),
  kimi: brandIcon(Moonshot, 14),
  zhipu: brandIcon(Zhipu, 14),
  minimax: brandIcon(Minimax, 14),
  openai: brandIcon(OpenAI, 14),
  claude: brandIcon(Claude, 14),
  gemini: brandIcon(Gemini, 14),
  grok: brandIcon(Grok, 14),
  mistral: brandIcon(Mistral, 14),
  llama: brandIcon(Glama, 14),
  gemma: brandIcon(Gemma, 14),
  hunyuan: brandIcon(Hunyuan, 14),
  doubao: brandIcon(Doubao, 14),
  spark: brandIcon(Spark, 14),
  sparkles: <Sparkles size={14} />,
}

const MODEL_ICON_NAMES: Record<string, string> = {
  qwen: '通义千问', deepseek: 'DeepSeek', moonshot: 'Kimi', kimi: 'Kimi',
  zhipu: '智谱', minimax: 'MiniMax', openai: 'OpenAI', claude: 'Claude',
  gemini: 'Gemini', grok: 'Grok', mistral: 'Mistral', llama: 'Glama',
  gemma: 'Gemma', hunyuan: '混元', doubao: '豆包', spark: '讯飞星火',
  sparkles: '通用',
}

function getModelIcon(icon?: string) {
  return MODEL_ICON_MAP[icon || ''] || <CircleDot size={14} />
}

// 飞书极简：统一蓝色系，不再按 provider 类型分色
const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  openai: { bg: '#E8F0FF', text: '#1677ff', border: '#D6E4FF' },
  dashscope: { bg: '#E8F0FF', text: '#1677ff', border: '#D6E4FF' },
  custom: { bg: '#E8F0FF', text: '#1677ff', border: '#D6E4FF' },
  glm: { bg: '#E8F0FF', text: '#1677ff', border: '#D6E4FF' },
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
  {
    // 智谱 AI BigModel 平台 (https://docs.bigmodel.cn/cn/api/introduction)
    id: 'zhipu-glm-preset',
    name: '智谱 GLM (BigModel)',
    type: 'glm' as const,
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4.6',           name: 'GLM-4.6',           description: '最新旗舰，200K 上下文，支持思考',  icon: 'zhipu', enabled: true, supportsVision: false, supportsReasoning: true,  contextWindow: 200000 },
      { id: 'glm-4.5',           name: 'GLM-4.5',           description: '智能体基础模型',                  icon: 'zhipu', enabled: true, supportsVision: false, supportsReasoning: true,  contextWindow: 128000 },
      { id: 'glm-4.5-air',       name: 'GLM-4.5-Air',       description: '轻量智能体模型',                  icon: 'zhipu', enabled: true, supportsVision: false, supportsReasoning: true,  contextWindow: 128000 },
      { id: 'glm-4.5-flash',     name: 'GLM-4.5-Flash',     description: '免费超快模型',                    icon: 'zhipu', enabled: true, supportsVision: false, supportsReasoning: false, contextWindow: 128000 },
      { id: 'glm-4-plus',        name: 'GLM-4-Plus',        description: '上一代旗舰',                      icon: 'zhipu', enabled: true, supportsVision: false, supportsReasoning: false, contextWindow: 128000 },
      { id: 'glm-4-long',        name: 'GLM-4-Long',        description: '超长上下文 1M',                    icon: 'zhipu', enabled: true, supportsVision: false, supportsReasoning: false, contextWindow: 1000000 },
      { id: 'glm-4v-plus',       name: 'GLM-4V-Plus',       description: '视觉语言模型',                    icon: 'zhipu', enabled: true, supportsVision: true,  supportsReasoning: false, contextWindow: 8000 },
      { id: 'glm-4v-flash',      name: 'GLM-4V-Flash',      description: '免费视觉模型',                    icon: 'zhipu', enabled: true, supportsVision: true,  supportsReasoning: false, contextWindow: 8000 },
      { id: 'glm-zero-preview',  name: 'GLM-Zero-Preview',  description: '强化推理模型',                    icon: 'zhipu', enabled: true, supportsVision: false, supportsReasoning: true,  contextWindow: 16000 },
    ],
  },
]

// ====== 空状态 ======

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        textAlign: 'center',
      }}
    >
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '12px',
        backgroundColor: '#F2F3F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
      }}>
        <Server size={28} style={{ color: '#8F959E' }} />
      </div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 600,
        color: '#1F2329',
        marginBottom: '8px',
      }}>
        尚未配置 AI 提供商
      </h3>
      <p style={{
        fontSize: '14px',
        color: '#8F959E',
        marginBottom: '24px',
        maxWidth: '400px',
      }}>
        添加 OpenAI、DashScope、小米 MIMO 等 AI 服务商，为模型池提供多样化的 API 接入能力。
      </p>
      <Button type="primary" icon={<Plus size={16} />} onClick={onAdd}>
        添加提供商
      </Button>
    </div>
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
  const colors = TYPE_COLORS[provider.type] || TYPE_COLORS.custom

  return (
    <Card
      style={{
        opacity: provider.enabled ? 1 : 0.6,
        transition: 'all 0.2s',
        border: '1px solid #EDEEEF',
      }}
      styles={{ body: { padding: '16px' } }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#E8F0FF',
            color: '#1677ff',
            border: '1px solid #D6E4FF',
          }}>
            {PROVIDER_TYPE_ICONS[provider.type]}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Typography.Text strong style={{ fontSize: '16px' }}>{provider.name}</Typography.Text>
              {provider.isDefault && (
                <Tag color="gold" icon={<Star size={12} />} style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  默认
                </Tag>
              )}
              <Tag style={{
                fontSize: '12px',
                backgroundColor: '#E8F0FF',
                color: '#1677ff',
                border: '1px solid #D6E4FF',
              }}>
                {provider.type}
              </Tag>
            </div>
            <Typography.Text type="secondary" style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              {provider.baseUrl}
            </Typography.Text>
          </div>
        </div>
      }
      extra={
        <Space size={4}>
          <Button type="text" size="small" icon={<Pencil size={14} />} onClick={onEdit} />
          <Button type="text" size="small" danger icon={<Trash2 size={14} />} onClick={onDelete} />
        </Space>
      }
    >
      {/* API Key 显示 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        backgroundColor: '#F7F8FA',
        padding: '8px 12px',
        borderRadius: '6px',
        marginBottom: '16px',
      }}>
        <Key size={14} style={{ color: '#8F959E', flexShrink: 0 }} />
        <span style={{ color: '#646A73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {provider.apiKey || '(未设置)'}
        </span>
      </div>

      {/* 模型列表 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
        {provider.models.map(m => (
          <Tag key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            {getModelIcon(m.icon)}
            {m.name}
            {m.supportsVision && <Camera size={12} style={{ color: '#646A73' }} />}
            {m.supportsReasoning && <Brain size={12} style={{ color: '#646A73' }} />}
            {m.supportsEmbedding && <BookOpen size={12} style={{ color: '#646A73' }} />}
          </Tag>
        ))}
        <Tag style={{ fontSize: '12px', color: '#8F959E' }}>
          {provider.models.length} 个模型
        </Tag>
      </div>

      {/* 操作栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '8px',
        borderTop: '1px solid #EDEEEF',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Switch
              checked={provider.enabled}
              onChange={onToggleEnabled}
              size="small"
            />
            <span style={{ fontSize: '12px', color: '#8F959E' }}>
              {provider.enabled ? '已启用' : '已禁用'}
            </span>
          </div>
        </div>
        {!provider.isDefault ? (
          <Button type="text" size="small" icon={<Star size={12} />} onClick={onToggleDefault} style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            设为默认
          </Button>
        ) : (
          <span style={{ fontSize: '12px', color: '#FA8C16', fontWeight: 500 }}>当前默认</span>
        )}
      </div>
    </Card>
  )
}

// ====== 编辑对话框 ======

interface ProviderFormData {
  id: string
  name: string
  type: 'openai' | 'dashscope' | 'custom' | 'glm'
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
  const [form] = Form.useForm<ProviderFormData>()
  const [formState, setFormState] = useState<ProviderFormData>({
    id: '', name: '', type: 'openai', baseUrl: '', apiKey: '',
    isDefault: false, enabled: true, priority: 1, models: [],
  })
  const [saving, setSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const isEdit = !!editing

  useEffect(() => {
    if (editing) {
      const newForm = {
        id: editing.id, name: editing.name, type: editing.type,
        baseUrl: editing.baseUrl, apiKey: editing.apiKey,
        isDefault: !!editing.isDefault, enabled: editing.enabled,
        priority: editing.priority, models: [...editing.models],
      }
      setFormState(newForm)
      form.setFieldsValue(newForm)
    } else {
      const newForm: ProviderFormData = {
        id: '', name: '', type: 'openai', baseUrl: '', apiKey: '',
        isDefault: false, enabled: true, priority: 1, models: [],
      }
      setFormState(newForm)
      form.setFieldsValue(newForm)
    }
    setShowKey(false)
  }, [editing, open, form])

  const addModel = () => {
    const newModels = [...formState.models, { ...EMPTY_MODEL, id: `model-${Date.now()}` }]
    setFormState(prev => ({ ...prev, models: newModels }))
    form.setFieldsValue({ models: newModels })
  }

  const updateModel = (idx: number, field: keyof ProviderModel, value: any) => {
    const newModels = formState.models.map((m, i) => i === idx ? { ...m, [field]: value } : m)
    setFormState(prev => ({ ...prev, models: newModels }))
    form.setFieldsValue({ models: newModels })
  }

  const removeModel = (idx: number) => {
    const newModels = formState.models.filter((_, i) => i !== idx)
    setFormState(prev => ({ ...prev, models: newModels }))
    form.setFieldsValue({ models: newModels })
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!values.id || !values.name || !values.baseUrl) {
        toast.error('请填写必填字段：ID、名称、Base URL')
        return
      }
      if (formState.models.length === 0) {
        toast.error('请至少添加一个模型')
        return
      }
      setSaving(true)
      try {
        await onSave({ ...values, models: formState.models })
        onClose()
      } finally {
        setSaving(false)
      }
    } catch {
      // form validation failed
    }
  }

  const applyTemplate = (templateId: string) => {
    const template = PRESET_TEMPLATES.find(t => t.id === templateId)
    if (!template) return
    const newForm = {
      ...formState,
      id: template.id,
      name: template.name,
      type: template.type,
      baseUrl: template.baseUrl,
      models: template.models.map(m => ({ ...m })),
    }
    setFormState(newForm)
    form.setFieldsValue(newForm)
    toast.success(`已应用模板：${template.name}`)
  }

  const modalFooter = (
    <Space>
      <Button onClick={onClose}>取消</Button>
      <Button type="primary" onClick={handleSave} loading={saving} icon={saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}>
        {isEdit ? '保存修改' : '添加提供商'}
      </Button>
    </Space>
  )

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isEdit ? '编辑提供商' : '添加提供商'}
      footer={modalFooter}
      width={720}
      styles={{ body: { maxHeight: 'calc(85vh - 200px)', overflowY: 'auto' } }}
    >
      <div style={{ marginBottom: '16px' }}>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '12px' }}>
          配置 AI 服务商的 API 连接和可用模型列表
        </Typography.Text>

        {/* 快速模板 */}
        {!isEdit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>快速模板：</Typography.Text>
            {PRESET_TEMPLATES.map(t => (
              <Button key={t.id} variant="outlined" size="small" style={{ fontSize: '12px' }} onClick={() => applyTemplate(t.id)}>
                {t.name}
              </Button>
            ))}
          </div>
        )}

        <Form form={form} layout="vertical" initialValues={formState}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              name="id"
              label="ID"
              rules={[{ required: true, message: '请输入 ID' }]}
            >
              <Input placeholder="如 xiaomi-mimo" style={{ fontFamily: 'monospace', fontSize: '14px' }} disabled={isEdit} />
            </Form.Item>
            <Form.Item
              name="name"
              label="显示名称"
              rules={[{ required: true, message: '请输入显示名称' }]}
            >
              <Input placeholder="如 小米 MIMO" />
            </Form.Item>
            <Form.Item
              name="type"
              label="API 类型"
            >
              <Select
                value={formState.type}
                onChange={(v) => {
                  setFormState(p => ({ ...p, type: v }))
                  form.setFieldsValue({ type: v })
                }}
              >
                <Select.Option value="openai">OpenAI 兼容</Select.Option>
                <Select.Option value="dashscope">阿里云百炼</Select.Option>
                <Select.Option value="glm">智谱 GLM (BigModel)</Select.Option>
                <Select.Option value="custom">自定义</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="priority"
              label="优先级（数字越小越优先）"
            >
              <Input type="number" min={1} max={100} />
            </Form.Item>
            <Form.Item
              name="baseUrl"
              label="Base URL"
              rules={[{ required: true, message: '请输入 Base URL' }]}
              style={{ gridColumn: 'span 2' }}
            >
              <Input
                placeholder={
                  formState.type === 'glm'
                    ? 'https://open.bigmodel.cn/api/paas/v4'
                    : formState.type === 'dashscope'
                    ? 'https://dashscope.aliyuncs.com/compatible-mode/v1'
                    : 'https://api.xiaomi.com/v1'
                }
                style={{ fontFamily: 'monospace', fontSize: '14px' }}
              />
            </Form.Item>
            <Form.Item
              name="apiKey"
              label="API Key"
              style={{ gridColumn: 'span 2' }}
            >
              <Input.Password
                placeholder="sk-..."
                style={{ fontFamily: 'monospace', fontSize: '14px' }}
                iconRender={(visible) => visible ? <EyeOff size={16} /> : <Eye size={16} />}
              />
            </Form.Item>
          </div>

          {/* 开关 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingTop: '8px' }}>
            <Form.Item name="enabled" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch checked={formState.enabled} onChange={(v) => {
                setFormState(p => ({ ...p, enabled: v }))
                form.setFieldsValue({ enabled: v })
              }} />
            </Form.Item>
            <Typography.Text>启用</Typography.Text>
            <Form.Item name="isDefault" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch checked={formState.isDefault} onChange={(v) => {
                setFormState(p => ({ ...p, isDefault: v }))
                form.setFieldsValue({ isDefault: v })
              }} />
            </Form.Item>
            <Typography.Text>设为默认</Typography.Text>
          </div>

          {/* 模型列表 */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #EDEEEF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <Typography.Text strong>模型列表 ({formState.models.length})</Typography.Text>
              <Button variant="outlined" size="small" icon={<Plus size={12} />} onClick={addModel} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                添加模型
              </Button>
            </div>

            {formState.models.map((model, idx) => (
              <div
                key={model.id || idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr auto',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: '#F7F8FA',
                  borderRadius: '6px',
                  marginBottom: '8px',
                }}
              >
                <Input
                  placeholder="模型 ID"
                  value={model.id}
                  onChange={e => updateModel(idx, 'id', e.target.value)}
                  style={{ fontSize: '12px', fontFamily: 'monospace', height: '32px' }}
                />
                <Input
                  placeholder="显示名"
                  value={model.name}
                  onChange={e => updateModel(idx, 'name', e.target.value)}
                  style={{ fontSize: '12px', height: '32px' }}
                />
                <Input
                  placeholder="描述(可选)"
                  value={model.description || ''}
                  onChange={e => updateModel(idx, 'description', e.target.value)}
                  style={{ fontSize: '12px', height: '32px' }}
                />
                <Select
                  value={model.icon || ''}
                  onChange={v => updateModel(idx, 'icon', v || undefined)}
                  placeholder="图标"
                  style={{ width: 108, fontSize: '12px', height: 32 }}
                  options={MODEL_ICON_KEYS.map(k => ({
                    value: k,
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {getModelIcon(k)}
                        <span style={{ fontSize: 12 }}>{MODEL_ICON_NAMES[k]}</span>
                      </span>
                    ),
                  }))}
                  popupMatchSelectWidth={false}
                />
                <InputNumber
                  placeholder="积分倍率"
                  min={0.1} max={10} step={0.1} precision={2}
                  value={model.rateMultiplier ?? undefined}
                  onChange={v => updateModel(idx, 'rateMultiplier', v === null ? undefined : Number(v))}
                  style={{ fontSize: '12px', height: '32px', width: '92px' }}
                  addonAfter="×"
                  title="积分倍率：该模型回复按 token 消耗积分的相对倍数（flash≈0.2 / 标准≈1 / 旗舰≈3）"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <label title="视觉" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={model.supportsVision}
                      onChange={e => updateModel(idx, 'supportsVision', e.target.checked)}
                      style={{ marginRight: '4px' }}
                    />
                  </label>
                  <label title="推理" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={model.supportsReasoning}
                      onChange={e => updateModel(idx, 'supportsReasoning', e.target.checked)}
                      style={{ marginRight: '4px' }}
                    />
                  </label>
                  <label title="可用于 Embedding" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!model.supportsEmbedding}
                      onChange={e => updateModel(idx, 'supportsEmbedding', e.target.checked)}
                      style={{ marginRight: '4px' }}
                    />
                    <span style={{ fontSize: '11px', color: '#FA8C16' }}>Embed</span>
                  </label>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<X size={12} />}
                    onClick={() => removeModel(idx)}
                    style={{ display: 'flex', alignItems: 'center' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Form>
      </div>
    </Modal>
  )
}

// ====== 主组件 ======

export function AIProvidersManager() {
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AIProvider | null>(null)
  const [deleting, setDeleting] = useState<AIProvider | null>(null)

  // 默认/自动选择模型
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null)
  const [defaultModelDraft, setDefaultModelDraft] = useState<string>('')
  const [savingDefault, setSavingDefault] = useState(false)

  // 知识库 embedding 配置
  const [embeddingConfig, setEmbeddingConfig] = useState<{
    providerId: string
    model: string
    dimension?: number
    enabled: boolean
  } | null>(null)
  const [embProviderDraft, setEmbProviderDraft] = useState<string>('')
  const [embModelDraft, setEmbModelDraft] = useState<string>('')
  const [embDimDraft, setEmbDimDraft] = useState<number | null>(null)
  const [embEnabledDraft, setEmbEnabledDraft] = useState<boolean>(true)
  const [savingEmbedding, setSavingEmbedding] = useState(false)
  const [testingEmbedding, setTestingEmbedding] = useState(false)
  const [embedTestResult, setEmbedTestResult] = useState<{ ok: boolean; msg: string; provider?: string; model?: string; dim?: number; preview?: number[] } | null>(null)

  // 联网搜索配置（web_search / deep_research 工具用，provider 不限类型，协议可插拔）
  const [webSearchConfig, setWebSearchConfig] = useState<{
    enabled: boolean
    providerId: string
    protocol?: 'zhipu' | 'exa' | 'anysearch'
    /** 回显的是脱敏值，仅用于展示「已设置」；真实 Key 不会返回前端 */
    apiKey?: string
    /** @deprecated 旧版 Exa 独立 Key 字段，兼容展示 */
    exaApiKey?: string
    engine?: string
    defaultCount?: number
  } | null>(null)
  const [wsProviderDraft, setWsProviderDraft] = useState<string>('')
  const [wsProtocolDraft, setWsProtocolDraft] = useState<'zhipu' | 'exa' | 'anysearch'>('zhipu')
  const [wsExaKeyDraft, setWsExaKeyDraft] = useState<string>('')
  const [wsEngineDraft, setWsEngineDraft] = useState<string>('search_pro_sogou')
  const [wsCountDraft, setWsCountDraft] = useState<number>(8)
  const [wsEnabledDraft, setWsEnabledDraft] = useState<boolean>(true)
  const [savingWebSearch, setSavingWebSearch] = useState(false)

  // AI 助手积分制度配置（每模型倍率在「提供商 → 模型」里配；这里只配通用换算 + 月度额度）
  const [creditConfig, setCreditConfig] = useState<{
    enabled: boolean
    outputWeight: number
    tokensPerCredit: number
    plusMonthlyQuota: number
    proMonthlyQuota: number
  } | null>(null)
  const [creditDraft, setCreditDraft] = useState({
    enabled: true,
    outputWeight: 3,
    tokensPerCredit: 1000,
    plusMonthlyQuota: 2000,
    proMonthlyQuota: 300,
  })
  const [savingCredit, setSavingCredit] = useState(false)
  const setCredit = (k: keyof typeof creditDraft, v: number | boolean) =>
    setCreditDraft(d => ({ ...d, [k]: v }))

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-providers')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setProviders(data.providers || [])
      if (typeof data.defaultModelId === 'string') {
        setDefaultModelId(data.defaultModelId)
        setDefaultModelDraft(data.defaultModelId)
      }
      if (data.embeddingConfig && typeof data.embeddingConfig === 'object') {
        setEmbeddingConfig(data.embeddingConfig)
        setEmbProviderDraft(data.embeddingConfig.providerId || '')
        setEmbModelDraft(data.embeddingConfig.model || '')
        setEmbDimDraft(data.embeddingConfig.dimension ?? null)
        setEmbEnabledDraft(!!data.embeddingConfig.enabled)
      } else {
        setEmbeddingConfig(null)
      }
      // 联网搜索配置
      if (data.webSearchConfig && typeof data.webSearchConfig === 'object') {
        setWebSearchConfig(data.webSearchConfig)
        setWsProviderDraft(data.webSearchConfig.providerId || '')
        const proto = data.webSearchConfig.protocol === 'exa' ? 'exa' : 'zhipu'
        setWsProtocolDraft(proto)
        setWsEngineDraft(data.webSearchConfig.engine || (proto === 'exa' ? 'auto' : 'search_pro_sogou'))
        setWsCountDraft(Number(data.webSearchConfig.defaultCount) || 8)
        setWsEnabledDraft(!!data.webSearchConfig.enabled)
      } else {
        setWebSearchConfig(null)
      }
      // 积分制度配置
      if (data.creditConfig && typeof data.creditConfig === 'object') {
        setCreditConfig(data.creditConfig)
        setCreditDraft({
          enabled: data.creditConfig.enabled !== false,
          outputWeight: Number(data.creditConfig.outputWeight) || 3,
          tokensPerCredit: Number(data.creditConfig.tokensPerCredit) || 1000,
          plusMonthlyQuota: Number(data.creditConfig.plusMonthlyQuota) || 2000,
          proMonthlyQuota: Number(data.creditConfig.proMonthlyQuota) || 300,
        })
      }
    } catch (e) {
      console.error(e)
      toast.error('加载提供商失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSaveEmbedding = async () => {
    setSavingEmbedding(true)
    try {
      const res = await fetch('/api/admin/ai-providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeddingConfig: {
            providerId: embProviderDraft,
            model: embModelDraft,
            dimension: embDimDraft ?? undefined,
            enabled: embEnabledDraft
          }
        })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '保存失败')
        return
      }
      setEmbeddingConfig(data.config.embeddingConfig || null)
      toast.success('Embedding 配置已保存')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSavingEmbedding(false)
    }
  }

  const handleSaveWebSearch = async () => {
    setSavingWebSearch(true)
    try {
      const res = await fetch('/api/admin/ai-providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webSearchConfig: {
            providerId: wsProtocolDraft === 'anysearch' ? '' : wsProviderDraft,
            protocol: wsProtocolDraft,
            // 只在输入了新 Key 时才发送该字段（缺省 = 保留服务端已存的原值）
            ...(wsExaKeyDraft.trim() ? { apiKey: wsExaKeyDraft.trim() } : {}),
            engine: wsEngineDraft || undefined,
            defaultCount: wsCountDraft || undefined,
            enabled: wsEnabledDraft
          }
        })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '保存失败')
        return
      }
      setWebSearchConfig(data.config.webSearchConfig || null)
      setWsExaKeyDraft('') // 保存成功后清空输入框，回显走脱敏占位
      toast.success('联网搜索配置已保存')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSavingWebSearch(false)
    }
  }

  const handleSaveCredit = async () => {
    setSavingCredit(true)
    try {
      const res = await fetch('/api/admin/ai-providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditConfig: creditDraft })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '保存失败')
        return
      }
      setCreditConfig(data.config.creditConfig)
      toast.success('积分制度配置已保存')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSavingCredit(false)
    }
  }

  const handleTestEmbedding = async () => {
    setTestingEmbedding(true)
    setEmbedTestResult(null)
    try {
      const res = await fetch('/api/knowledge/embedding-config', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setEmbedTestResult({
          ok: true,
          msg: `成功生成 ${data.vectorLength} 维向量`,
          provider: data.provider,
          model: data.model,
          dim: data.dimension,
          preview: data.vectorPreview
        })
        toast.success('Embedding 测试成功')
      } else {
        setEmbedTestResult({ ok: false, msg: data.error || '测试失败' })
        toast.error('Embedding 测试失败')
      }
    } catch (e: any) {
      setEmbedTestResult({ ok: false, msg: e.message })
    } finally {
      setTestingEmbedding(false)
    }
  }

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

  // 保存默认/自动选择模型
  const handleSaveDefaultModel = async () => {
    setSavingDefault(true)
    try {
      const res = await fetch('/api/admin/ai-providers/default-model', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: defaultModelDraft }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '保存失败')
      }
      const data = await res.json()
      setDefaultModelId(data.configuredDefaultModelId ?? null)
      toast.success('默认模型已更新')
    } catch (e: any) {
      toast.error(e.message || '保存失败')
    } finally {
      setSavingDefault(false)
    }
  }

  // 构造可选的默认模型列表（来自所有 enabled provider 的 enabled model）
  const availableDefaultModels = providers
    .filter(p => p.enabled)
    .flatMap(p => p.models.filter(m => m.enabled).map(m => ({ p, m })))
    .sort((a, b) => a.p.priority - b.p.priority || a.m.id.localeCompare(b.m.id))

  // 查找当前 effective 默认（与后端 resolveDefaultModelId 一致：configured > 第一项）
  const effectiveDefaultId = (() => {
    if (defaultModelId && availableDefaultModels.some(x => x.m.id === defaultModelId)) {
      return defaultModelId
    }
    return availableDefaultModels[0]?.m.id ?? null
  })()
  const effectiveDefaultLabel = availableDefaultModels.find(x => x.m.id === effectiveDefaultId)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#8F959E' }} />
      </div>
    )
  }

  const totalModels = providers.reduce((sum, p) => sum + p.models.length, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2329', letterSpacing: '-0.025em', marginBottom: '4px' }}>AI 提供商管理</h2>
          <p style={{ fontSize: '14px', color: '#8F959E', marginTop: '4px' }}>
            管理 AI 服务商接入，共 {providers.length} 个提供商 · {totalModels} 个可用模型
          </p>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => { setEditing(null); setDialogOpen(true) }}>
          添加提供商
        </Button>
      </div>

      {/* 默认/自动选择模型 */}
      <Card
        style={{ border: '1px solid #EDEEEF' }}
        styles={{ body: { paddingTop: '24px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F2F3F5',
            color: '#1677ff',
            flexShrink: 0,
          }}>
            <Sparkles size={16} />
          </div>
          <div style={{ flex: 1, minWidth: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <Typography.Text strong>自动选择模型</Typography.Text>
              <Tag style={{
                fontSize: '10px',
                color: '#1677ff',
                border: '1px solid #D6E4FF',
                backgroundColor: '#E8F0FF',
              }}>
                刷新后生效
              </Tag>
            </div>
            <p style={{ fontSize: '12px', color: '#8F959E', marginTop: '4px', marginBottom: '12px' }}>
              每次刷新 AI 助手页面时，未手动选择模型的用户将自动使用该模型。
              {effectiveDefaultLabel
                ? `当前生效：${effectiveDefaultLabel.p.name} · ${effectiveDefaultLabel.m.name}`
                : '当前没有可用的启用模型。'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Select
                value={defaultModelDraft || undefined}
                onChange={(v) => setDefaultModelDraft(v)}
                disabled={availableDefaultModels.length === 0}
                style={{ width: '320px' }}
                placeholder="选择自动选择的模型"
                options={availableDefaultModels.length === 0 ? [] : availableDefaultModels.map(({ p, m }) => ({
                  value: m.id,
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getModelIcon(m.icon)}
                      <span style={{ fontWeight: 500 }}>{m.name}</span>
                      <span style={{ color: '#8F959E', fontSize: '12px' }}>· {p.name}</span>
                    </span>
                  ),
                }))}
              />
              <Button
                size="small"
                type="primary"
                onClick={handleSaveDefaultModel}
                disabled={savingDefault || defaultModelDraft === (defaultModelId ?? '') || availableDefaultModels.length === 0}
                icon={savingDefault ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              >
                保存
              </Button>
              {defaultModelId && defaultModelId !== effectiveDefaultId && (
                <span style={{ fontSize: '12px', color: '#FA8C16' }}>
                  配置的默认模型已失效，将自动回退到当前生效项
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 知识库 Embedding 配置 */}
      <Card style={{ marginBottom: '20px', border: '1px solid #EDEEEF' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#F2F3F5',
            color: '#1677ff',
            flexShrink: 0,
          }}>
            <BookOpen size={16} />
          </div>
          <div style={{ flex: 1, minWidth: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <Typography.Text strong>知识库 Embedding 模型</Typography.Text>
              <Tag color="gold" style={{ fontSize: '10px' }}>
                影响 @知识库:xxx 检索
              </Tag>
            </div>
            <p style={{ fontSize: '12px', color: '#8F959E', marginTop: '4px', marginBottom: '12px' }}>
              知识库对上传文档进行语义检索时，依赖 embedding 模型生成向量。下方选择任一提供商的 embedding 模型（需勾选"作为 Embedding"），保存后下次上传的文档将使用该模型。
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Select
                value={embProviderDraft || undefined}
                onChange={(v) => { setEmbProviderDraft(v); setEmbModelDraft('') }}
                style={{ width: '200px' }}
                placeholder="提供商"
                options={providers.filter(p => p.enabled && p.apiKey).map(p => ({ value: p.id, label: p.name }))}
              />
              <Select
                value={embModelDraft || undefined}
                onChange={(v) => setEmbModelDraft(v)}
                style={{ width: '240px' }}
                placeholder={embProviderDraft ? '选择 embedding 模型' : '先选提供商'}
                disabled={!embProviderDraft}
                options={
                  embProviderDraft
                    ? (() => {
                        const p = providers.find(x => x.id === embProviderDraft)
                        if (!p) return []
                        return p.models
                          .filter(m => m.enabled && (m.supportsEmbedding || /embed/i.test(m.id)))
                          .map(m => ({
                            value: m.id,
                            label: (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {getModelIcon(m.icon)}
                                <span style={{ fontWeight: 500 }}>{m.name}</span>
                                {m.contextWindow && (
                                  <span style={{ color: '#8F959E', fontSize: '11px' }}>
                                    · {m.contextWindow >= 1024 ? `${Math.round(m.contextWindow / 1024)}K` : m.contextWindow} ctx
                                  </span>
                                )}
                              </span>
                            )
                          }))
                      })()
                    : []
                }
              />
              <InputNumber
                value={embDimDraft ?? undefined}
                onChange={(v) => setEmbDimDraft(v ?? null)}
                placeholder="维度（可选）"
                min={64}
                max={4096}
                step={64}
                style={{ width: '120px' }}
              />
              <Switch
                checked={embEnabledDraft}
                onChange={setEmbEnabledDraft}
                checkedChildren="启用"
                unCheckedChildren="关闭"
              />
              <Button
                size="small"
                type="primary"
                onClick={handleSaveEmbedding}
                disabled={savingEmbedding || !embProviderDraft || !embModelDraft}
                icon={savingEmbedding ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              >
                保存
              </Button>
              <Button
                size="small"
                onClick={handleTestEmbedding}
                loading={testingEmbedding}
                icon={<Sparkles size={14} />}
              >
                测试 Embedding
              </Button>
            </div>
            {embedTestResult && (
              <div style={{
                marginTop: '12px',
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: embedTestResult.ok ? '#F6FFED' : '#FFF2F0',
                border: embedTestResult.ok ? '1px solid #B7EB8F' : '1px solid #FFCCC7',
                color: embedTestResult.ok ? '#389E0D' : '#CF1322',
              }}>
                {embedTestResult.ok ? (
                  <div>
                    <div>✅ {embedTestResult.msg}</div>
                    {embedTestResult.provider && <div style={{ marginTop: 4 }}>provider: <code>{embedTestResult.provider}</code> · model: <code>{embedTestResult.model}</code> · dim: <code>{embedTestResult.dim}</code></div>}
                    {embedTestResult.preview && (
                      <div style={{ marginTop: 4, fontFamily: 'monospace', fontSize: '11px' }}>
                        前 8 维: [{embedTestResult.preview.join(', ')}]
                      </div>
                    )}
                  </div>
                ) : (
                  <div>❌ {embedTestResult.msg}</div>
                )}
              </div>
            )}
            {embeddingConfig && !embedTestResult && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#8F959E' }}>
                当前：provider <code>{embeddingConfig.providerId}</code> · model <code>{embeddingConfig.model}</code>
                {embeddingConfig.dimension && <> · {embeddingConfig.dimension} 维</>}
                {embeddingConfig.enabled ? ' · 已启用' : ' · 已关闭'}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 联网搜索配置：web_search / deep_research 工具的检索源 */}
      <Card style={{ border: '1px solid #EDEEEF' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
            background: '#FFF7E6', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Globe size={18} color="#D46B08" />
          </div>
          <div style={{ flex: 1, minWidth: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <Typography.Text strong>联网搜索源</Typography.Text>
              <Tag color="orange" style={{ fontSize: '10px' }}>
                影响 web_search / 深度研究
              </Tag>
            </div>
            <p style={{ fontSize: '12px', color: '#8F959E', marginTop: '4px', marginBottom: '12px' }}>
              AI 助手联网搜索与深度研究（自动检索并沉淀知识）所用的提供商与协议。
              <strong style={{ color: '#1F2329' }}>智谱协议</strong>国内直连（自研引擎 + 搜狗/夸克，复用 GLM Key）；
              <strong style={{ color: '#1F2329' }}>Exa</strong> 语义检索质量高、有免费额度（dashboard.exa.ai 申请）；
              <strong style={{ color: '#1F2329' }}>AnySearch</strong> 统一实时搜索（网页 + 金融/学术等垂直领域 + 并行批量），免 Key 匿名可用。
              未配置时自动回退到 GLM 提供商或 SYSTEM_GLM_API_KEY。
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Select
                value={wsProtocolDraft}
                onChange={(v) => {
                  const proto = v as 'zhipu' | 'exa' | 'anysearch'
                  setWsProtocolDraft(proto)
                  // 切协议时重置引擎为该协议的默认值，避免把智谱引擎值带进其他协议
                  setWsEngineDraft(proto === 'exa' ? 'auto' : proto === 'anysearch' ? '' : 'search_pro_sogou')
                }}
                style={{ width: '170px' }}
                options={[
                  { value: 'zhipu', label: '智谱协议' },
                  { value: 'exa', label: 'Exa（免费额度）' },
                  { value: 'anysearch', label: 'AnySearch（免 Key）' }
                ]}
              />
              {(wsProtocolDraft === 'exa' || wsProtocolDraft === 'anysearch') && (
                <Input.Password
                  value={wsExaKeyDraft}
                  onChange={(e) => setWsExaKeyDraft(e.target.value)}
                  placeholder={
                    (webSearchConfig?.apiKey || webSearchConfig?.exaApiKey)
                      ? `已设置（${(webSearchConfig.apiKey || webSearchConfig.exaApiKey || '').slice(0, 8)}…），输入新值可覆盖`
                      : wsProtocolDraft === 'anysearch'
                        ? 'AnySearch API Key（可选，匿名也可用）'
                        : '粘贴 Exa API Key'
                  }
                  style={{ width: '260px' }}
                  autoComplete="new-password"
                />
              )}
              {wsProtocolDraft !== 'anysearch' && (
                <Select
                  value={wsProviderDraft || undefined}
                  onChange={(v) => setWsProviderDraft(v)}
                  allowClear
                  style={{ width: '200px' }}
                  placeholder={wsProtocolDraft === 'exa' ? '提供商（可选，作兜底）' : '选择提供商'}
                  options={providers.filter(p => p.enabled && p.apiKey).map(p => ({ value: p.id, label: p.name }))}
                />
              )}
              {wsProtocolDraft !== 'anysearch' && (
                <Select
                  value={wsEngineDraft || undefined}
                  onChange={(v) => setWsEngineDraft(v)}
                  style={{ width: '180px' }}
                  placeholder={wsProtocolDraft === 'exa' ? '检索类型' : '搜索引擎'}
                  options={
                    wsProtocolDraft === 'exa'
                      ? [
                          { value: 'auto', label: '自动（Auto）' },
                          { value: 'neural', label: '语义（Neural）' },
                          { value: 'keyword', label: '关键词（Keyword）' }
                        ]
                      : [
                          { value: 'search_std', label: '标准版' },
                          { value: 'search_pro', label: '高级版（智谱自研）' },
                          { value: 'search_pro_sogou', label: '高级版（搜狗）' },
                          { value: 'search_pro_quark', label: '高级版（夸克）' }
                        ]
                  }
                />
              )}
              <InputNumber
                value={wsCountDraft}
                onChange={(v) => setWsCountDraft(v ?? 8)}
                min={1}
                max={50}
                style={{ width: '120px' }}
                addonAfter="条"
              />
              <Switch
                checked={wsEnabledDraft}
                onChange={setWsEnabledDraft}
                checkedChildren="启用"
                unCheckedChildren="关闭"
              />
              <Button
                size="small"
                type="primary"
                onClick={handleSaveWebSearch}
                disabled={
                  savingWebSearch ||
                  (wsProtocolDraft !== 'anysearch' &&
                    !wsProviderDraft &&
                    !((wsProtocolDraft === 'exa') && (wsExaKeyDraft.trim() || webSearchConfig?.apiKey || webSearchConfig?.exaApiKey)))
                }
                icon={savingWebSearch ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              >
                保存
              </Button>
            </div>
            {webSearchConfig && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#8F959E' }}>
                当前：{webSearchConfig.protocol === 'exa' ? 'Exa 协议' : webSearchConfig.protocol === 'anysearch' ? 'AnySearch 协议' : '智谱协议'}
                {(webSearchConfig.apiKey || webSearchConfig.exaApiKey) && (
                  <> · Key <code>{webSearchConfig.apiKey || webSearchConfig.exaApiKey}</code></>
                )}
                {webSearchConfig.providerId && <> · provider <code>{webSearchConfig.providerId}</code></>}
                {webSearchConfig.engine && <> · {webSearchConfig.protocol === 'exa' ? '类型' : '引擎'} <code>{webSearchConfig.engine}</code></>}
                {webSearchConfig.defaultCount && <> · {webSearchConfig.defaultCount} 条</>}
                {webSearchConfig.enabled ? ' · 已启用' : ' · 已关闭'}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 知识库全局行为配置（上传/分块/GLM/检索/UI），所有魔数 admin 可调 */}
      <KnowledgeConfigCard />

      {/* AI 助手积分制度配置（token 计费 × 模型倍率 × 全局倍率） */}
      <Card style={{ border: '1px solid #EDEEEF' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#F2F3F5', color: '#1677ff', flexShrink: 0,
          }}>
            <Coins size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <Typography.Text strong>AI 助手积分制度</Typography.Text>
              <div style={{ flex: 1 }} />
              <Button size="small" type="primary" onClick={handleSaveCredit} loading={savingCredit} icon={!savingCredit ? <Check size={14} /> : null}>
                保存
              </Button>
            </div>
            <p style={{ fontSize: 12, color: '#8F959E', marginTop: 4, marginBottom: 12 }}>
              每次 AI 回复按真实 token 计费：积分 =（输入 tokens + 输出 tokens × 输出权重）÷ 每积分token数 × 该模型倍率。
              <strong style={{ color: '#1F2329' }}>每个模型的倍率</strong>在「提供商 → 模型」里独立配（未配时按模型名启发式：flash/air=0.2、标准=1、旗舰=3）。
              ProPlus 不再无限使用，改为每月固定积分额度。
            </p>

            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#646A73', marginBottom: 6 }}>启用积分制</div>
                <Switch
                  checked={creditDraft.enabled}
                  onChange={(v) => setCredit('enabled', v)}
                  checkedChildren="开启"
                  unCheckedChildren="关闭"
                />
                <div style={{ fontSize: 11, color: '#8F959E', marginTop: 4 }}>关闭时回退旧的按次配额逻辑</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#646A73', marginBottom: 6 }}>输出权重</div>
                <InputNumber
                  min={1} max={20} step={0.5} precision={2}
                  value={creditDraft.outputWeight}
                  onChange={(v) => setCredit('outputWeight', Number(v) || 3)}
                  style={{ width: '100%' }}
                  addonAfter="×"
                />
                <div style={{ fontSize: 11, color: '#8F959E', marginTop: 4 }}>输出 token 按输入 N 倍计价</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#646A73', marginBottom: 6 }}>每积分 token 数</div>
                <InputNumber
                  min={100} max={100000} step={100}
                  value={creditDraft.tokensPerCredit}
                  onChange={(v) => setCredit('tokensPerCredit', Number(v) || 1000)}
                  style={{ width: '100%' }}
                  addonAfter="tok"
                />
                <div style={{ fontSize: 11, color: '#8F959E', marginTop: 4 }}>1 积分 = N 个基准 token</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#646A73', marginBottom: 6 }}>ProPlus 月度额度</div>
                <InputNumber
                  min={10} max={1000000} step={100}
                  value={creditDraft.plusMonthlyQuota}
                  onChange={(v) => setCredit('plusMonthlyQuota', Number(v) || 2000)}
                  style={{ width: '100%' }}
                  addonAfter="积分/月"
                />
                <div style={{ fontSize: 11, color: '#8F959E', marginTop: 4 }}>ProPlus 每月积分（不再无限）</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#646A73', marginBottom: 6 }}>Pro 月度额度</div>
                <InputNumber
                  min={10} max={1000000} step={50}
                  value={creditDraft.proMonthlyQuota}
                  onChange={(v) => setCredit('proMonthlyQuota', Number(v) || 300)}
                  style={{ width: '100%' }}
                  addonAfter="积分/月"
                />
                <div style={{ fontSize: 11, color: '#8F959E', marginTop: 4 }}>Pro 每月积分</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 提供商列表 */}
      {providers.length === 0 ? (
        <EmptyState onAdd={() => { setEditing(null); setDialogOpen(true) }} />
      ) : (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}>
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
      <Modal
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        title="确认删除"
        footer={
          <Space>
            <Button onClick={() => setDeleting(null)}>取消</Button>
            <Button type="primary" danger onClick={handleDelete}>确认删除</Button>
          </Space>
        }
      >
        <Typography.Paragraph>
          确定要删除提供商「{deleting?.name}」吗？此操作不可撤销。
        </Typography.Paragraph>
      </Modal>
    </div>
  )
}

// ============== 知识库全局行为配置 ==============
// 把 KnowledgeConfig（lib/ai/provider-resolver.ts）中所有魔数都暴露给 admin 调整
// 保存走 POST /api/knowledge/config（admin 鉴权），随后客户端 / 后端 getKnowledgeConfig() 自动 reload

const MB = 1024 * 1024

type KCDraft = {
  uploadLimits: { text: number; image: number; document: number; audio: number; video: number; other: number }
  maxExtractedChars: number
  chunking: { chunkSize: number; chunkOverlap: number; minChunkSize: number }
  glm: {
    autoOcr: boolean
    enableRerank: boolean
    ocrMaxPages: number
    ocrMaxChars: number
    rerankTopN: number
    rerankBlend: number
    fileSizeLimits: { image: number; document: number }
  }
  auto: { autoEmbed: boolean; embedTimeout: number }
  search: {
    hybridKeywordWeight: number
    defaultLimit: number
    recommendHistoryLimit: number
    recommendMaxResults: number
    tsVectorWeight: number
    highlightPadding: number
    highlightTailLength: number
    snippetPadding: { before: number; after: number }
    snippetMaxLen: number
    snippetWindowMultiplier: number
    maxCandidate: number
    queryMaxLength: number
    maxHighlights: number
    similarDefaultLimit: number
    minTokenLength: number
    recommendCandidateMultiplier: number
    requestOvershootMultiplier: number
  }
  list: {
    defaultLimit: number
    maxLimit: number
    backupDefaultLimit: number
    recommendationDefaultLimit: number
  }
  limits: {
    itemTitleMax: number
    collectionNameMax: number
    tagNameMax: number
    maxTagsPerItem: number
    summaryMax: number
  }
  ui: {
    listPageSize: number
    searchDebounceMs: number
    maxTagBadges: number
    maxRecommendationCards: number
    contextMaxChunks: number
    contextMaxChunkLength: number
    contextMaxChunksCeilingMin: number
    listPreviewChars: number
    recommendationPreviewChars: number
    createItemTextareaMinRows: number
    createItemTextareaMaxRows: number
    detailEditorTextareaMinRows: number
    detailEditorTextareaMaxRows: number
    backupListMaxHeight: number
    backupPollingIntervals: number[]
  }
  upload: {
    xlsxMaxRows: number
  }
  backup: {
    batchSize: number
  }
  embeddingTest: {
    maxTestTextChars: number
    vectorPreviewCount: number
    previewTextChars: number
  }
}

function toDraft(c: any): KCDraft {
  return {
    uploadLimits: { ...c.uploadLimits },
    maxExtractedChars: c.maxExtractedChars,
    chunking: { chunkSize: c.chunking.chunkSize, chunkOverlap: c.chunking.chunkOverlap, minChunkSize: c.chunking.minChunkSize },
    glm: {
      autoOcr: c.glm.autoOcr,
      enableRerank: c.glm.enableRerank,
      ocrMaxPages: c.glm.ocrMaxPages,
      ocrMaxChars: c.glm.ocrMaxChars,
      rerankTopN: c.glm.rerankTopN,
      rerankBlend: c.glm.rerankBlend,
      fileSizeLimits: { image: c.glm.fileSizeLimits?.image ?? 10 * MB, document: c.glm.fileSizeLimits?.document ?? 50 * MB }
    },
    auto: { autoEmbed: c.auto.autoEmbed, embedTimeout: c.auto.embedTimeout },
    search: {
      hybridKeywordWeight: c.search.hybridKeywordWeight,
      defaultLimit: c.search.defaultLimit,
      recommendHistoryLimit: c.search.recommendHistoryLimit,
      recommendMaxResults: c.search.recommendMaxResults,
      tsVectorWeight: c.search.tsVectorWeight,
      highlightPadding: c.search.highlightPadding,
      highlightTailLength: c.search.highlightTailLength ?? 20,
      snippetPadding: { ...c.search.snippetPadding },
      snippetMaxLen: c.search.snippetMaxLen,
      snippetWindowMultiplier: c.search.snippetWindowMultiplier ?? 10,
      maxCandidate: c.search.maxCandidate,
      queryMaxLength: c.search.queryMaxLength ?? 500,
      maxHighlights: c.search.maxHighlights ?? 2,
      similarDefaultLimit: c.search.similarDefaultLimit ?? 5,
      minTokenLength: c.search.minTokenLength ?? 2,
      recommendCandidateMultiplier: c.search.recommendCandidateMultiplier ?? 2,
      requestOvershootMultiplier: c.search.requestOvershootMultiplier ?? 2
    },
    list: {
      defaultLimit: c.list?.defaultLimit ?? 50,
      maxLimit: c.list?.maxLimit ?? 200,
      backupDefaultLimit: c.list?.backupDefaultLimit ?? 50,
      recommendationDefaultLimit: c.list?.recommendationDefaultLimit ?? 10
    },
    limits: {
      itemTitleMax: c.limits?.itemTitleMax ?? 500,
      collectionNameMax: c.limits?.collectionNameMax ?? 100,
      tagNameMax: c.limits?.tagNameMax ?? 50,
      maxTagsPerItem: c.limits?.maxTagsPerItem ?? 20,
      summaryMax: c.limits?.summaryMax ?? 200
    },
    ui: {
      listPageSize: c.ui.listPageSize,
      searchDebounceMs: c.ui.searchDebounceMs,
      maxTagBadges: c.ui.maxTagBadges,
      maxRecommendationCards: c.ui.maxRecommendationCards,
      contextMaxChunks: c.ui.contextMaxChunks,
      contextMaxChunkLength: c.ui.contextMaxChunkLength,
      contextMaxChunksCeilingMin: c.ui.contextMaxChunksCeilingMin ?? 20,
      listPreviewChars: c.ui.listPreviewChars ?? 100,
      recommendationPreviewChars: c.ui.recommendationPreviewChars ?? 60,
      createItemTextareaMinRows: c.ui.createItemTextareaMinRows ?? 6,
      createItemTextareaMaxRows: c.ui.createItemTextareaMaxRows ?? 20,
      detailEditorTextareaMinRows: c.ui.detailEditorTextareaMinRows ?? 12,
      detailEditorTextareaMaxRows: c.ui.detailEditorTextareaMaxRows ?? 30,
      backupListMaxHeight: c.ui.backupListMaxHeight ?? 280,
      backupPollingIntervals: Array.isArray(c.ui.backupPollingIntervals) ? c.ui.backupPollingIntervals : [1000, 4000]
    },
    upload: { xlsxMaxRows: c.upload?.xlsxMaxRows ?? 2000 },
    backup: { batchSize: c.backup?.batchSize ?? 200 },
    embeddingTest: {
      maxTestTextChars: c.embeddingTest?.maxTestTextChars ?? 1000,
      vectorPreviewCount: c.embeddingTest?.vectorPreviewCount ?? 8,
      previewTextChars: c.embeddingTest?.previewTextChars ?? 100
    }
  }
}

function KnowledgeConfigCard() {
  const [draft, setDraft] = useState<KCDraft | null>(null)
  const [defaults, setDefaults] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge/config")
      if (!res.ok) return
      const data = await res.json()
      if (data.config) setDraft(toDraft(data.config))
      if (data.defaults) setDefaults(data.defaults)
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const update = (mut: (d: KCDraft) => void) => {
    setDraft(prev => {
      if (!prev) return prev
      const next: KCDraft = JSON.parse(JSON.stringify(prev))
      mut(next)
      return next
    })
  }

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const res = await fetch("/api/knowledge/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knowledgeConfig: draft })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "保存失败")
        return
      }
      toast.success("知识库配置已保存")
      if (data.config) setDraft(toDraft(data.config))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!defaults) return
    setDraft(toDraft(defaults))
  }

  if (!draft) {
    return (
      <Card style={{ marginBottom: 20, border: '1px solid #EDEEEF' }}>
        <div style={{ fontSize: 12, color: "#8F959E" }}>加载知识库配置中…</div>
      </Card>
    )
  }

  return (
    <Card style={{ marginBottom: 20, border: '1px solid #EDEEEF' }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "#F2F3F5",
          color: "#1677ff",
          flexShrink: 0,
        }}>
          <BookOpen size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <Typography.Text strong>知识库全局配置</Typography.Text>
            <Tag color="blue" style={{ fontSize: 10 }}>
              所有魔数都可调
            </Tag>
            <div style={{ flex: 1 }} />
            <Button size="small" onClick={() => setExpanded(v => !v)}>
              {expanded ? "收起" : "展开编辑"}
            </Button>
            <Button size="small" onClick={handleReset} disabled={saving || !defaults}>
              恢复默认
            </Button>
            <Button size="small" type="primary" onClick={handleSave} loading={saving} icon={!saving ? <Check size={14} /> : null}>
              保存
            </Button>
          </div>
          <p style={{ fontSize: 12, color: "#8F959E", marginTop: 4, marginBottom: 12 }}>
            上传/分块/GLM-OCR/Rerank/检索/UI 行为全部可在此调整。改动立即对所有用户生效。
          </p>

          {/* 始终可见：核心开关 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 12 }}>
            <FieldSwitch
              label="GLM-OCR"
              hint="PDF/图片自动调用智谱解析"
              checked={draft.glm.autoOcr}
              onChange={(v) => update(d => { d.glm.autoOcr = v })}
            />
            <FieldSwitch
              label="GLM Rerank"
              hint="检索后用智谱重排序提升精度"
              checked={draft.glm.enableRerank}
              onChange={(v) => update(d => { d.glm.enableRerank = v })}
            />
            <FieldSwitch
              label="自动向量化"
              hint="上传后自动调用 embedding"
              checked={draft.auto.autoEmbed}
              onChange={(v) => update(d => { d.auto.autoEmbed = v })}
            />
          </div>

          {expanded && (
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              {/* 上传上限 */}
              <ConfigGroup title="上传大小上限（MB）" icon="📁">
                <FieldNumber label="文本" value={Math.round(draft.uploadLimits.text / MB)} onChange={(v) => update(d => { d.uploadLimits.text = v * MB })} min={1} max={1024} />
                <FieldNumber label="图片" value={Math.round(draft.uploadLimits.image / MB)} onChange={(v) => update(d => { d.uploadLimits.image = v * MB })} min={1} max={1024} />
                <FieldNumber label="文档" value={Math.round(draft.uploadLimits.document / MB)} onChange={(v) => update(d => { d.uploadLimits.document = v * MB })} min={1} max={1024} />
                <FieldNumber label="音频" value={Math.round(draft.uploadLimits.audio / MB)} onChange={(v) => update(d => { d.uploadLimits.audio = v * MB })} min={1} max={1024} />
                <FieldNumber label="视频" value={Math.round(draft.uploadLimits.video / MB)} onChange={(v) => update(d => { d.uploadLimits.video = v * MB })} min={1} max={4096} />
                <FieldNumber label="其他" value={Math.round(draft.uploadLimits.other / MB)} onChange={(v) => update(d => { d.uploadLimits.other = v * MB })} min={1} max={1024} />
                <FieldNumber label="提取最大字符" value={Math.round(draft.maxExtractedChars / 1000)} onChange={(v) => update(d => { d.maxExtractedChars = v * 1000 })} min={10} max={5000} suffix="K" />
              </ConfigGroup>

              {/* 分块 */}
              <ConfigGroup title="Embedding 分块" icon="✂️">
                <FieldNumber label="块大小" value={draft.chunking.chunkSize} onChange={(v) => update(d => { d.chunking.chunkSize = v })} min={50} max={4000} />
                <FieldNumber label="重叠字符" value={draft.chunking.chunkOverlap} onChange={(v) => update(d => { d.chunking.chunkOverlap = v })} min={0} max={500} />
                <FieldNumber label="最小块" value={draft.chunking.minChunkSize} onChange={(v) => update(d => { d.chunking.minChunkSize = v })} min={10} max={500} />
                <FieldNumber label="嵌入超时(秒)" value={draft.auto.embedTimeout} onChange={(v) => update(d => { d.auto.embedTimeout = v })} min={5} max={120} />
              </ConfigGroup>

              {/* GLM 集成 */}
              <ConfigGroup title="GLM 集成" icon="🧠">
                <FieldNumber label="OCR 最大页数" value={draft.glm.ocrMaxPages} onChange={(v) => update(d => { d.glm.ocrMaxPages = v })} min={1} max={500} />
                <FieldNumber label="OCR 截断(K字符)" value={Math.round(draft.glm.ocrMaxChars / 1000)} onChange={(v) => update(d => { d.glm.ocrMaxChars = v * 1000 })} min={50} max={5000} />
                <FieldNumber label="OCR 图片上限(MB)" value={Math.round(draft.glm.fileSizeLimits.image / MB)} onChange={(v) => update(d => { d.glm.fileSizeLimits.image = v * MB })} min={1} max={50} />
                <FieldNumber label="OCR 文档上限(MB)" value={Math.round(draft.glm.fileSizeLimits.document / MB)} onChange={(v) => update(d => { d.glm.fileSizeLimits.document = v * MB })} min={1} max={200} />
                <FieldNumber label="Rerank 候选上限" value={draft.glm.rerankTopN} onChange={(v) => update(d => { d.glm.rerankTopN = v })} min={1} max={128} />
                <FieldNumberFloat label="Rerank 混合权重" value={draft.glm.rerankBlend} onChange={(v) => update(d => { d.glm.rerankBlend = v })} min={0} max={1} step={0.05} />
              </ConfigGroup>

              {/* 检索 */}
              <ConfigGroup title="混合检索" icon="🔍">
                <FieldNumberFloat label="关键词权重" value={draft.search.hybridKeywordWeight} onChange={(v) => update(d => { d.search.hybridKeywordWeight = v })} min={0} max={1} step={0.05} />
                <FieldNumber label="默认 limit" value={draft.search.defaultLimit} onChange={(v) => update(d => { d.search.defaultLimit = v })} min={1} max={200} />
                <FieldNumber label="子检索上限" value={draft.search.maxCandidate} onChange={(v) => update(d => { d.search.maxCandidate = v })} min={5} max={500} />
                <FieldNumber label="tsvector 倍数" value={draft.search.tsVectorWeight} onChange={(v) => update(d => { d.search.tsVectorWeight = v })} min={0} max={10} step={0.1} />
                <FieldNumber label="高亮前缀" value={draft.search.highlightPadding} onChange={(v) => update(d => { d.search.highlightPadding = v })} min={5} max={200} />
                <FieldNumber label="高亮尾部" value={draft.search.highlightTailLength} onChange={(v) => update(d => { d.search.highlightTailLength = v })} min={0} max={200} />
                <FieldNumber label="高亮片段数" value={draft.search.maxHighlights} onChange={(v) => update(d => { d.search.maxHighlights = v })} min={1} max={10} />
                <FieldNumber label="高亮窗口乘数" value={draft.search.snippetWindowMultiplier} onChange={(v) => update(d => { d.search.snippetWindowMultiplier = v })} min={1} max={50} />
                <FieldNumber label="token 最小长度" value={draft.search.minTokenLength} onChange={(v) => update(d => { d.search.minTokenLength = v })} min={1} max={8} />
                <FieldNumber label="相似推荐默认" value={draft.search.similarDefaultLimit} onChange={(v) => update(d => { d.search.similarDefaultLimit = v })} min={1} max={50} />
                <FieldNumber label="摘要最大长度" value={draft.search.snippetMaxLen} onChange={(v) => update(d => { d.search.snippetMaxLen = v })} min={50} max={2000} />
                <FieldNumber label="摘要前缀" value={draft.search.snippetPadding.before} onChange={(v) => update(d => { d.search.snippetPadding.before = v })} min={5} max={500} />
                <FieldNumber label="摘要后缀" value={draft.search.snippetPadding.after} onChange={(v) => update(d => { d.search.snippetPadding.after = v })} min={5} max={500} />
                <FieldNumber label="推荐历史数" value={draft.search.recommendHistoryLimit} onChange={(v) => update(d => { d.search.recommendHistoryLimit = v })} min={1} max={200} />
                <FieldNumber label="推荐最大数" value={draft.search.recommendMaxResults} onChange={(v) => update(d => { d.search.recommendMaxResults = v })} min={1} max={50} />
                <FieldNumber label="推荐候选倍数" value={draft.search.recommendCandidateMultiplier} onChange={(v) => update(d => { d.search.recommendCandidateMultiplier = v })} min={1} max={10} step={1} />
                <FieldNumber label="请求 limit 放大倍数" value={draft.search.requestOvershootMultiplier} onChange={(v) => update(d => { d.search.requestOvershootMultiplier = v })} min={1} max={10} step={1} />
                <FieldNumber label="query 最大长度" value={draft.search.queryMaxLength} onChange={(v) => update(d => { d.search.queryMaxLength = v })} min={10} max={2000} />
              </ConfigGroup>

              {/* 列表分页 */}
              <ConfigGroup title="列表分页" icon="📄">
                <FieldNumber label="items 默认 limit" value={draft.list.defaultLimit} onChange={(v) => update(d => { d.list.defaultLimit = v })} min={5} max={500} />
                <FieldNumber label="items 最大 limit" value={draft.list.maxLimit} onChange={(v) => update(d => { d.list.maxLimit = v })} min={10} max={2000} />
                <FieldNumber label="备份默认 limit" value={draft.list.backupDefaultLimit} onChange={(v) => update(d => { d.list.backupDefaultLimit = v })} min={5} max={500} />
                <FieldNumber label="推荐缓存默认 limit" value={draft.list.recommendationDefaultLimit} onChange={(v) => update(d => { d.list.recommendationDefaultLimit = v })} min={5} max={200} />
              </ConfigGroup>

              {/* 字段长度上限 */}
              <ConfigGroup title="字段长度上限（API 校验）" icon="📏">
                <FieldNumber label="条目 title 最大" value={draft.limits.itemTitleMax} onChange={(v) => update(d => { d.limits.itemTitleMax = v })} min={20} max={2000} />
                <FieldNumber label="集合 name 最大" value={draft.limits.collectionNameMax} onChange={(v) => update(d => { d.limits.collectionNameMax = v })} min={10} max={500} />
                <FieldNumber label="标签 name 最大" value={draft.limits.tagNameMax} onChange={(v) => update(d => { d.limits.tagNameMax = v })} min={5} max={200} />
                <FieldNumber label="单条最大 tag 数" value={draft.limits.maxTagsPerItem} onChange={(v) => update(d => { d.limits.maxTagsPerItem = v })} min={1} max={100} />
                <FieldNumber label="摘要 maxLength" value={draft.limits.summaryMax} onChange={(v) => update(d => { d.limits.summaryMax = v })} min={20} max={2000} />
              </ConfigGroup>

              {/* UI */}
              <ConfigGroup title="UI 行为" icon="🪟">
                <FieldNumber label="列表分页" value={draft.ui.listPageSize} onChange={(v) => update(d => { d.ui.listPageSize = v })} min={10} max={1000} />
                <FieldNumber label="搜索防抖(ms)" value={draft.ui.searchDebounceMs} onChange={(v) => update(d => { d.ui.searchDebounceMs = v })} min={0} max={2000} step={50} />
                <FieldNumber label="标签云上限" value={draft.ui.maxTagBadges} onChange={(v) => update(d => { d.ui.maxTagBadges = v })} min={3} max={100} />
                <FieldNumber label="推荐卡片上限" value={draft.ui.maxRecommendationCards} onChange={(v) => update(d => { d.ui.maxRecommendationCards = v })} min={1} max={20} />
                <FieldNumber label="AI 上下文 chunks" value={draft.ui.contextMaxChunks} onChange={(v) => update(d => { d.ui.contextMaxChunks = v })} min={1} max={50} />
                <FieldNumber label="每 chunk 长度" value={draft.ui.contextMaxChunkLength} onChange={(v) => update(d => { d.ui.contextMaxChunkLength = v })} min={100} max={5000} step={50} />
                <FieldNumber label="context API 硬下限" value={draft.ui.contextMaxChunksCeilingMin} onChange={(v) => update(d => { d.ui.contextMaxChunksCeilingMin = v })} min={1} max={200} />
                <FieldNumber label="列表预览字符" value={draft.ui.listPreviewChars} onChange={(v) => update(d => { d.ui.listPreviewChars = v })} min={20} max={500} step={10} />
                <FieldNumber label="推荐预览字符" value={draft.ui.recommendationPreviewChars} onChange={(v) => update(d => { d.ui.recommendationPreviewChars = v })} min={10} max={300} step={10} />
              </ConfigGroup>

              {/* 详情 / 创建 TextArea 行数 */}
              <ConfigGroup title="编辑 / 创建行数" icon="📝">
                <FieldNumber label="创建-最小行" value={draft.ui.createItemTextareaMinRows} onChange={(v) => update(d => { d.ui.createItemTextareaMinRows = v })} min={2} max={30} />
                <FieldNumber label="创建-最大行" value={draft.ui.createItemTextareaMaxRows} onChange={(v) => update(d => { d.ui.createItemTextareaMaxRows = v })} min={5} max={100} />
                <FieldNumber label="详情-最小行" value={draft.ui.detailEditorTextareaMinRows} onChange={(v) => update(d => { d.ui.detailEditorTextareaMinRows = v })} min={2} max={50} />
                <FieldNumber label="详情-最大行" value={draft.ui.detailEditorTextareaMaxRows} onChange={(v) => update(d => { d.ui.detailEditorTextareaMaxRows = v })} min={5} max={200} />
              </ConfigGroup>

              {/* 备份 */}
              <ConfigGroup title="备份" icon="💾">
                <FieldNumber label="单次拉取 batch" value={draft.backup.batchSize} onChange={(v) => update(d => { d.backup.batchSize = v })} min={10} max={2000} step={50} />
                <FieldNumber label="列表最大高度(px)" value={draft.ui.backupListMaxHeight} onChange={(v) => update(d => { d.ui.backupListMaxHeight = v })} min={120} max={2000} step={20} />
                <FieldIntervals
                  label="轮询刷新间隔(ms)"
                  value={draft.ui.backupPollingIntervals}
                  onChange={(v) => update(d => { d.ui.backupPollingIntervals = v })}
                />
              </ConfigGroup>

              {/* Embedding 测试 */}
              <ConfigGroup title="Embedding 测试" icon="🧪">
                <FieldNumber label="测试文本最大字符" value={draft.embeddingTest.maxTestTextChars} onChange={(v) => update(d => { d.embeddingTest.maxTestTextChars = v })} min={50} max={10000} step={50} />
                <FieldNumber label="向量预览维度数" value={draft.embeddingTest.vectorPreviewCount} onChange={(v) => update(d => { d.embeddingTest.vectorPreviewCount = v })} min={1} max={32} />
                <FieldNumber label="text 预览字符" value={draft.embeddingTest.previewTextChars} onChange={(v) => update(d => { d.embeddingTest.previewTextChars = v })} min={20} max={500} step={10} />
              </ConfigGroup>

              {/* 上传解析 */}
              <ConfigGroup title="上传解析" icon="📥">
                <FieldNumber label="XLSX 每 sheet 行数上限" value={draft.upload.xlsxMaxRows} onChange={(v) => update(d => { d.upload.xlsxMaxRows = v })} min={100} max={50000} step={100} />
              </ConfigGroup>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function ConfigGroup({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: "1px solid #EDEEEF",
      borderRadius: 6,
      padding: 12,
      backgroundColor: "#F7F8FA"
    }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "#646A73", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
        {icon && <span>{icon}</span>}<span>{title}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>{children}</div>
    </div>
  )
}

function FieldNumber({ label, value, onChange, min, max, step, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: "#8F959E" }}>{label}{suffix ? `(${suffix})` : ""}</span>
      <InputNumber
        size="small"
        value={value}
        onChange={(v) => v !== null && onChange(Number(v))}
        min={min}
        max={max}
        step={step ?? 1}
        style={{ width: "100%" }}
      />
    </div>
  )
}

function FieldNumberFloat({ label, value, onChange, min, max, step }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: "#8F959E" }}>{label}</span>
      <InputNumber
        size="small"
        value={value}
        onChange={(v) => v !== null && onChange(Number(v))}
        min={min}
        max={max}
        step={step ?? 0.1}
        style={{ width: "100%" }}
      />
    </div>
  )
}

function FieldSwitch({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Switch size="small" checked={checked} onChange={onChange} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#646A73" }}>{label}</div>
        {hint && <div style={{ fontSize: 10, color: "#8F959E" }}>{hint}</div>}
      </div>
    </div>
  )
}

/**
 * 数组配置（用于 backupPollingIntervals 等 number[] 类型的字段）
 * 逗号分隔输入，新增/删除自动同步
 */
function FieldIntervals({ label, value, onChange }: {
  label: string; value: number[]; onChange: (v: number[]) => void
}) {
  const text = (Array.isArray(value) ? value : []).join(", ")
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, gridColumn: "1 / -1" }}>
      <span style={{ fontSize: 11, color: "#8F959E" }}>{label}</span>
      <Input
        size="small"
        value={text}
        placeholder="例如: 1000, 4000"
        onChange={(e) => {
          const arr = e.target.value
            .split(/[，,]/)
            .map(s => Number(s.trim()))
            .filter(n => Number.isFinite(n) && n >= 0)
          onChange(arr)
        }}
        style={{ width: "100%" }}
      />
    </div>
  )
}
