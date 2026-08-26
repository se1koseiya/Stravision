"use client"

import { useEffect, useState } from "react"
import { useAIModels, type AIProvider } from "@/lib/hooks/use-ai-models"
import { Qwen, DeepSeek, Moonshot, Zhipu, Minimax, OpenAI, Claude, Gemini, Grok, Mistral, Glama, Gemma, Hunyuan, Doubao, Spark } from "@lobehub/icons"
import { Sparkles } from "lucide-react"
import { Dropdown, Button, Switch, Divider, Modal, Form, Input, Tag, Tooltip } from "antd"
import {
  DownOutlined,
  CheckOutlined,
  EditOutlined,
  RobotOutlined,
  CloseOutlined,
} from "@ant-design/icons"
import { cn } from "@/lib/utils"

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

const CUSTOM_MODELS_KEY = "berry-realm.custom-models.v1"
const MAX_MODE_KEY = "berry-realm.max-mode.v1"

const brandIcon = (C: any, size: number) => {
  const Comp = C?.Color || C
  return <Comp size={size} />
}

const getModelIcon = (iconType: string, size: number = 16) => {
  switch (iconType) {
    case "qwen": return brandIcon(Qwen, size)
    case "deepseek": return brandIcon(DeepSeek, size)
    case "moonshot": return brandIcon(Moonshot, size)
    case "kimi": return brandIcon(Moonshot, size)
    case "zhipu": return brandIcon(Zhipu, size)
    case "minimax": return brandIcon(Minimax, size)
    case "openai": return brandIcon(OpenAI, size)
    case "claude": return brandIcon(Claude, size)
    case "gemini": return brandIcon(Gemini, size)
    case "grok": return brandIcon(Grok, size)
    case "mistral": return brandIcon(Mistral, size)
    case "llama": return brandIcon(Glama, size)
    case "gemma": return brandIcon(Gemma, size)
    case "hunyuan": return brandIcon(Hunyuan, size)
    case "doubao": return brandIcon(Doubao, size)
    case "spark": return brandIcon(Spark, size)
    case "sparkles": return <Sparkles size={size * 0.7} className="text-blue-500" />
    default: return <RobotOutlined style={{ fontSize: size * 0.8, color: "#8F959E" }} />
  }
}

const getModelIcon2 = (modelId: string, models: any[]) => {
  const model = models.find(m => m.id === modelId)
  if (!model) {
    if (modelId === "auto") return "sparkles"
    if (modelId.includes("qwen")) return "qwen"
    if (modelId.includes("deepseek")) return "deepseek"
    if (modelId.includes("kimi")) return "moonshot"
    if (modelId.includes("gpt") || modelId.includes("o1") || modelId.includes("o3")) return "openai"
    return ""
  }
  return model.icon
}

/**
 * 动态模型选择器（antd 风格，飞书式克制设计）
 * - 触发：antd Text Button（图标 + 名称 + 下箭头）
 * - 下拉：Max 模式开关 / Auto / 模型列表（右侧灰字倍率）/ 配置自定义模型
 * - 自定义模型：localStorage 持久化，OpenAI 兼容 API
 */
export function DynamicModelSelector({ value, onValueChange }: DynamicModelSelectorProps) {
  const { config, loading, error, getProviders, getModelsByProvider } = useAIModels()

  const [customModels, setCustomModels] = useState<CustomModel[]>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_MODELS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  const [maxMode, setMaxMode] = useState(() => {
    try { return localStorage.getItem(MAX_MODE_KEY) === "1" } catch { return false }
  })
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCustom, setEditingCustom] = useState<CustomModel | null>(null)

  const persistCustom = (list: CustomModel[]) => {
    setCustomModels(list)
    try { localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(list)) } catch {}
  }
  const toggleMax = (v: boolean) => {
    setMaxMode(v)
    try { localStorage.setItem(MAX_MODE_KEY, v ? "1" : "0") } catch {}
  }

  if (loading) {
    return (
      <Button type="text" size="small" className="!h-7 !px-2">
        <span className="text-[13px] text-gray-400">加载中...</span>
      </Button>
    )
  }
  if (error || !config) {
    return (
      <Button type="text" size="small" className="!h-7 !px-2">
        <span className="text-[13px] text-red-400">加载失败</span>
      </Button>
    )
  }

  const providers = getProviders()
  const allModels = config.models.filter(m => m.enabled)
  const effectiveRate = (rate?: number) => {
    const r = typeof rate === "number" && rate > 0 ? rate : 1
    return Number(r.toFixed(2))
  }

  const flatModels = providers.length > 0
    ? providers.flatMap((p: AIProvider) => getModelsByProvider(p.id))
    : allModels
  const visibleModels = maxMode ? flatModels.filter((m: any) => m.supportsReasoning) : flatModels

  // 当前选中模型展示名
  const currentDisplayName = (() => {
    if (value === "auto") return "Auto"
    const m = flatModels.find((x: any) => x.id === value)
    if (m) return m.name
    const c = customModels.find(x => x.id === value)
    if (c) return c.name
    const legacy = allModels.find((x: any) => x.id === value)
    return legacy?.name || value
  })()
  const currentIconType = value === "auto" ? "sparkles" : getModelIcon2(value, flatModels)

  const pick = (id: string) => {
    onValueChange(id)
    setOpen(false)
  }

  const renderRow = (id: string, icon: React.ReactNode, name: string, rate: number, badges?: string[]) => {
    const selected = value === id
    return (
      <div
        key={id}
        onClick={() => pick(id)}
        className={cn(
          "flex items-center gap-2 px-2.5 py-[7px] rounded-md cursor-pointer transition-colors",
          selected ? "bg-[#1677ff]/[0.06]" : "hover:bg-gray-100 dark:hover:bg-zinc-800"
        )}
      >
        <span className="flex-shrink-0 w-4 inline-flex justify-center text-gray-500 dark:text-zinc-400">{icon}</span>
        <span className={cn(
          "flex-1 text-[13px] truncate",
          selected ? "font-medium text-[#1677ff]" : "text-gray-700 dark:text-zinc-300"
        )}>
          {name}
        </span>
        {badges && badges.length > 0 && (
          <span className="flex items-center gap-1">
            {badges.map((b, i) => (
              <Tag key={i} bordered={false} className={cn(
                "!text-[10px] !leading-4 !px-1.5 !m-0",
                i % 2 === 0 ? "!bg-[#E8F3FF] !text-[#1677ff]" : "!bg-[#FFF7E8] !text-[#FF7D00]"
              )}>{b}</Tag>
            ))}
          </span>
        )}
        <span className="flex-shrink-0 text-[12px] tabular-nums text-gray-400 dark:text-zinc-500">
          {rate.toFixed(2)}x
        </span>
        {selected && <CheckOutlined className="flex-shrink-0 !text-[12px] !text-[#1677ff]" />}
      </div>
    )
  }

  const customRow = (c: CustomModel) => {
    const selected = value === c.id
    return (
      <div
        key={c.id}
        onClick={() => pick(c.id)}
        className={cn(
          "flex items-center gap-2 px-2.5 py-[7px] rounded-md cursor-pointer transition-colors group",
          selected ? "bg-[#1677ff]/[0.06]" : "hover:bg-gray-100 dark:hover:bg-zinc-800"
        )}
      >
        <span className="flex-shrink-0 w-4 inline-flex justify-center text-gray-400">
          <RobotOutlined style={{ fontSize: 13 }} />
        </span>
        <span className={cn(
          "flex-1 text-[13px] truncate",
          selected ? "font-medium text-[#1677ff]" : "text-gray-700 dark:text-zinc-300"
        )}>
          {c.name}
        </span>
        <span className="flex-shrink-0 text-[12px] tabular-nums text-gray-400 dark:text-zinc-500">
          {effectiveRate(c.rateMultiplier ?? 1).toFixed(2)}x
        </span>
        {selected && <CheckOutlined className="flex-shrink-0 !text-[12px] !text-[#1677ff]" />}
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); setEditingCustom(c); setModalOpen(true) }}
          className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200/70 dark:hover:bg-zinc-700/70 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <EditOutlined style={{ fontSize: 11 }} />
        </span>
      </div>
    )
  }

  const listContent = (
    <div className="w-[360px] max-w-[92vw] rounded-lg border border-gray-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.10)]">
      {/* Max 模式 */}
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <span className="text-[13px] text-gray-700 dark:text-zinc-300">Max 模式</span>
        <Switch size="small" checked={maxMode} onChange={toggleMax} />
      </div>
      <Divider className="!my-1" />

      {/* Auto */}
      {renderRow("auto", <Sparkles className="w-3.5 h-3.5 text-blue-500" />, "Auto", effectiveRate(0.6))}

      {/* 模型列表 */}
      {(visibleModels.length > 0 || customModels.length > 0) && (
        <>
          <Divider className="!my-1" />
          <div className="max-h-[300px] overflow-y-auto py-0.5">
            {visibleModels.map((m: any) => renderRow(
              m.id,
              getModelIcon(m.icon || "qwen", 15),
              m.name,
              effectiveRate(m.rateMultiplier),
              m.badges,
            ))}
            {customModels.map(customRow)}
            {visibleModels.length === 0 && customModels.length === 0 && (
              <div className="px-2.5 py-4 text-center text-[12.5px] text-gray-400 dark:text-zinc-500">
                暂无可用模型
              </div>
            )}
          </div>
        </>
      )}

      <Divider className="!my-1" />

      {/* 配置自定义模型 */}
      <div
        role="button"
        onClick={() => { setEditingCustom(null); setModalOpen(true) }}
        className="flex items-center gap-2 px-2.5 py-[7px] rounded-md cursor-pointer text-[13px] text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <EditOutlined className="!text-[13px]" />
        <span>配置自定义模型</span>
      </div>
    </div>
  )

  return (
    <>
      <Dropdown
        open={open}
        onOpenChange={setOpen}
        trigger={["click"]}
        placement="bottomLeft"
        dropdownRender={() => listContent}
      >
        <Button
          type="text"
          size="small"
          className="!h-7 !px-2 !rounded-md hover:!bg-black/[0.05] dark:hover:!bg-white/[0.08]"
        >
          <span className="flex items-center gap-1.5 text-[13px] text-gray-700 dark:text-zinc-200">
            {currentIconType && currentIconType !== "sparkles" && (
              <span className="inline-flex">{getModelIcon(currentIconType, 15)}</span>
            )}
            {(!currentIconType || currentIconType === "sparkles") && (
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            )}
            <span className="font-medium">{currentDisplayName}</span>
            <DownOutlined className="!text-[9px] !text-gray-400" />
          </span>
        </Button>
      </Dropdown>

      {/* 配置自定义模型对话框 */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => {}}
        footer={null}
        width={480}
        title={
          <span className="!text-[15px] !font-medium">配置自定义模型</span>
        }
        closeIcon={<CloseOutlined className="!text-[12px] !text-gray-400" />}
      >
        <CustomModelForm
          initial={editingCustom}
          onSave={(m) => {
            const exists = customModels.find(x => x.id === m.id)
            const next = exists ? customModels.map(x => x.id === m.id ? m : x) : [...customModels, m]
            persistCustom(next)
            setModalOpen(false)
            // 保存后如果编辑的是当前选中的，刷新选中
            if (editingCustom && value === editingCustom.id) onValueChange(m.id)
          }}
          onDelete={editingCustom ? (m) => {
            persistCustom(customModels.filter(x => x.id !== m.id))
            if (value === m.id) onValueChange("auto")
            setModalOpen(false)
          } : undefined}
          editing={!!editingCustom}
        />
      </Modal>
    </>
  )
}

function CustomModelForm({
  initial,
  onSave,
  onDelete,
  editing,
}: {
  initial: CustomModel | null
  onSave: (m: CustomModel) => void
  onDelete?: (m: CustomModel) => void
  editing: boolean
}) {
  const [form] = Form.useForm<CustomModel>()

  useEffect(() => {
    if (initial) {
      form.setFieldsValue(initial)
    } else {
      form.resetFields()
    }
  }, [initial, form])

  const handleOk = async () => {
    const values = await form.validateFields()
    onSave({
      id: initial?.id || `custom-${Date.now()}`,
      name: values.name.trim(),
      baseUrl: values.baseUrl.trim(),
      apiKey: values.apiKey.trim(),
      modelId: values.modelId.trim(),
      rateMultiplier: values.rateMultiplier ?? undefined,
    })
  }

  return (
    <Form form={form} layout="vertical" requiredMark={false} className="!mt-1">
      <Form.Item
        name="name"
        label={<span className="!text-[13px] !text-gray-600">显示名称</span>}
        rules={[{ required: true, message: "请输入显示名称" }]}
      >
        <Input placeholder="如：我的 Moonshot" className="!h-8 !text-[13px]" />
      </Form.Item>
      <Form.Item
        name="baseUrl"
        label={<span className="!text-[13px] !text-gray-600">Base URL</span>}
        rules={[{ required: true, message: "请输入 Base URL" }]}
        extra={<span className="!text-[11px] !text-gray-400">OpenAI 兼容端点，如 https://api.example.com/v1</span>}
      >
        <Input placeholder="https://api.example.com/v1" className="!h-8 !text-[13px] !font-mono" />
      </Form.Item>
      <Form.Item
        name="apiKey"
        label={<span className="!text-[13px] !text-gray-600">API Key</span>}
        rules={[{ required: true, message: "请输入 API Key" }]}
      >
        <Input.Password placeholder="sk-..." className="!h-8 !text-[13px] !font-mono" />
      </Form.Item>
      <div className="grid grid-cols-2 gap-3">
        <Form.Item
          name="modelId"
          label={<span className="!text-[13px] !text-gray-600">模型 ID</span>}
          rules={[{ required: true, message: "请输入模型 ID" }]}
        >
          <Input placeholder="kimi-k2-0711-preview" className="!h-8 !text-[13px] !font-mono" />
        </Form.Item>
        <Form.Item
          name="rateMultiplier"
          label={
            <Tooltip title="该模型回复按 token 消耗积分的相对倍数（不填默认 1）">
              <span className="!text-[13px] !text-gray-600">积分倍率（可选）</span>
            </Tooltip>
          }
        >
          <Input type="number" step={0.1} min={0.1} placeholder="默认 1" className="!h-8 !text-[13px]" />
        </Form.Item>
      </div>
      <div className="flex items-center justify-between mt-1">
        <div>
          {editing && onDelete && initial && (
            <Button type="text" danger size="small" className="!text-[12px] !px-2" onClick={() => onDelete(initial)}>
              删除该模型
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="small" className="!text-[13px]" onClick={() => form.resetFields()}>重置</Button>
          <Button type="primary" size="small" className="!text-[13px]" onClick={handleOk}>保存</Button>
        </div>
      </div>
    </Form>
  )
}
