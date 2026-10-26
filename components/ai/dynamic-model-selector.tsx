"use client"

import { useEffect, useMemo, useState } from "react"
import { useAIModels, type AIProvider } from "@/lib/hooks/use-ai-models"
import { Qwen, DeepSeek, Moonshot, Zhipu, Minimax, OpenAI, Claude, Gemini, Grok, Mistral, Glama, Gemma, Hunyuan, Doubao, Spark } from "@lobehub/icons"
import { Dropdown, Button, Switch, Divider, Modal, Form, Input, Tag, Tooltip } from "antd"
import { cn } from "@/lib/utils"
import { IS_DESKTOP_APP } from "@/lib/desktop-mode"
import { IconCheck, IconClose, IconDown, IconEdit, IconMagic, IconRobot } from "@/components/icon";

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
    case "sparkles": return <IconMagic size={size * 0.7} className="text-emerald-500" />
    default: return <IconRobot style={{ fontSize: size * 0.8, color: "#8F959E" }} />
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
 * - 下拉：Max 模式开关 / 模型列表（右侧灰字倍率）/ 配置自定义模型
 * - 自定义模型：localStorage 持久化，OpenAI 兼容 API
 * - 🚨 没有 Auto 入口（2026-10-27 用户要求）：下拉里不再提供「自动」这一项，
 *   选中值无效（空 / 遗留的 "auto" / 模型已被禁用或删除）时，自动落到
 *   **用户配置好的模型**（admin 后台配的 defaultModelId > 列表第一个 > 第一个自定义模型）。
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

  /* 「用户配置好的模型」候选集 —— 也是 value 失效时的自动回退依据。
     依赖故意不列 getProviders / getModelsByProvider：它们只是 config 的纯读取器。 */
  const computed = useMemo(() => {
    if (!config) return null
    const providers = getProviders()
    const allModels = config.models.filter(m => m.enabled)
    const flatModels: any[] = providers.length > 0
      ? providers.flatMap((p: AIProvider) => getModelsByProvider(p.id))
      : allModels
    const visibleModels: any[] = maxMode ? flatModels.filter((m: any) => m.supportsReasoning) : flatModels
    const candidateIds = [...visibleModels.map((m: any) => m.id), ...customModels.map(c => c.id)]
    // 优先级：admin 配的 defaultModelId（在候选里）> 列表第一个可见模型 > 第一个自定义模型
    const fallbackId = config.defaultModelId && candidateIds.includes(config.defaultModelId)
      ? config.defaultModelId
      : (candidateIds[0] ?? null)
    return { providers, allModels, flatModels, visibleModels, candidateIds, fallbackId }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, maxMode, customModels])

  /* 自动选择：value 为空 / 是遗留的 "auto" / 已不在可用列表里 → 落到用户配置好的模型。
     幂等（value 已是 fallback 时不再回调），所以 onValueChange 引用变化也不会抖动。 */
  useEffect(() => {
    if (!computed?.fallbackId) return
    if (value && value !== "auto" && computed.candidateIds.includes(value)) return
    if (value === computed.fallbackId) return
    onValueChange(computed.fallbackId)
  }, [computed, value, onValueChange])

  if (loading) {
    return (
      <Button type="text" size="small" className="!h-7 !px-2">
        <span className="text-[13px] text-zinc-400">加载中...</span>
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

  const { allModels, flatModels, visibleModels, candidateIds, fallbackId } = computed!
  const effectiveRate = (rate?: number) => {
    const r = typeof rate === "number" && rate > 0 ? rate : 1
    return Number(r.toFixed(2))
  }

  // 「真正生效的选中值」：value 无效（含遗留 "auto"）时按 fallback 展示，避免闪一下 Auto
  const effectiveValue =
    value && value !== "auto" && candidateIds.includes(value) ? value : (fallbackId ?? "")

  // 当前选中模型展示名
  const currentDisplayName = (() => {
    const m = flatModels.find((x: any) => x.id === effectiveValue)
    if (m) return m.name
    const c = customModels.find(x => x.id === effectiveValue)
    if (c) return c.name
    const legacy = allModels.find((x: any) => x.id === effectiveValue)
    return legacy?.name || effectiveValue || "选择模型"
  })()
  const currentIconType = effectiveValue === "auto" ? "sparkles" : getModelIcon2(effectiveValue, flatModels)

  const pick = (id: string) => {
    onValueChange(id)
    setOpen(false)
  }

  const renderRow = (id: string, icon: React.ReactNode, name: string, rate: number, badges?: string[]) => {
    const selected = effectiveValue === id
    return (
      <div
        key={id}
        onClick={() => pick(id)}
        className={cn(
          "flex items-center gap-2 px-2.5 py-[7px] rounded-lg cursor-pointer transition-colors",
          selected ? "bg-[#059669]/[0.06]" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
        )}
      >
        <span className="flex-shrink-0 w-4 inline-flex justify-center text-zinc-500 dark:text-zinc-400">{icon}</span>
        <span className={cn(
          "flex-1 text-[13px] truncate",
          selected ? "font-medium text-[#059669]" : "text-zinc-700 dark:text-zinc-300"
        )}>
          {name}
        </span>
        {badges && badges.length > 0 && (
          <span className="flex items-center gap-1">
            {badges.map((b, i) => (
              <Tag key={i} bordered={false} className={cn(
                "!text-[11px] !leading-4 !px-1.5 !m-0",
                i % 2 === 0 ? "!bg-[#E8F3FF] !text-[#059669]" : "!bg-[#FFF7E8] !text-[#FF7D00]"
              )}>{b}</Tag>
            ))}
          </span>
        )}
        {/* 积分倍率角标（桌面端 BYOK 无积分概念，不显示） */}
        {!IS_DESKTOP_APP && (
          <span className="flex-shrink-0 text-[12px] tabular-nums text-zinc-400 dark:text-zinc-500">
            {rate.toFixed(2)}x
          </span>
        )}
        {selected && <IconCheck className="flex-shrink-0 !text-[12px] !text-[#059669]" />}
      </div>
    )
  }

  const customRow = (c: CustomModel) => {
    const selected = effectiveValue === c.id
    return (
      <div
        key={c.id}
        onClick={() => pick(c.id)}
        className={cn(
          "flex items-center gap-2 px-2.5 py-[7px] rounded-lg cursor-pointer transition-colors group",
          selected ? "bg-[#059669]/[0.06]" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
        )}
      >
        <span className="flex-shrink-0 w-4 inline-flex justify-center text-zinc-400">
          <IconRobot style={{ fontSize: 13 }} />
        </span>
        <span className={cn(
          "flex-1 text-[13px] truncate",
          selected ? "font-medium text-[#059669]" : "text-zinc-700 dark:text-zinc-300"
        )}>
          {c.name}
        </span>
        <span className="flex-shrink-0 text-[12px] tabular-nums text-zinc-400 dark:text-zinc-500">
          {effectiveRate(c.rateMultiplier ?? 1).toFixed(2)}x
        </span>
        {selected && <IconCheck className="flex-shrink-0 !text-[12px] !text-[#059669]" />}
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); setEditingCustom(c); setModalOpen(true) }}
          className="flex-shrink-0 p-0.5 rounded hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <IconEdit style={{ fontSize: 11 }} />
        </span>
      </div>
    )
  }

  const listContent = (
    <div className="w-[360px] max-w-[92vw] rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.10)]">
      {/* Max 模式 */}
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <span className="text-[13px] text-zinc-700 dark:text-zinc-300">Max 模式</span>
        <Switch size="small" checked={maxMode} onChange={toggleMax} />
      </div>
      <Divider className="!my-1" />

      {/* 模型列表（🚨 无 Auto 入口：选中值无效时自动落到用户配置好的模型，见文件头说明） */}
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
          <div className="px-2.5 py-4 text-center text-[13px] text-zinc-400 dark:text-zinc-500">
            {maxMode ? "Max 模式下暂无可用模型" : "暂无可用模型"}
          </div>
        )}
      </div>

      <Divider className="!my-1" />

      {/* 配置自定义模型 */}
      <div
        role="button"
        onClick={() => { setEditingCustom(null); setModalOpen(true) }}
        className="flex items-center gap-2 px-2.5 py-[7px] rounded-lg cursor-pointer text-[13px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <IconEdit className="!text-[13px]" />
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
          /* 稳定测试锚点：验收探针靠它确认「模型选择器确实在 sender 里」
             （2026-10-01 用户要求把它从顶栏搬进输入框）。纯标记，无样式副作用。 */
          data-model-selector
          className="!h-7 !px-2 !rounded-lg hover:!bg-black/[0.05] dark:hover:!bg-white/[0.08]"
        >
          <span className="flex items-center gap-1.5 text-[13px] text-zinc-700 dark:text-zinc-200">
            {currentIconType && currentIconType !== "sparkles" && (
              <span className="inline-flex">{getModelIcon(currentIconType, 15)}</span>
            )}
            {(!currentIconType || currentIconType === "sparkles") && (
              <IconMagic className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span className="font-medium">{currentDisplayName}</span>
            <IconDown className="!text-[11px] !text-zinc-400" />
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
          <span className="!text-[14px] !font-medium">配置自定义模型</span>
        }
        closeIcon={<IconClose className="!text-[12px] !text-zinc-400" />}
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
            // 🚨 删掉后不再回落到 "auto"：切到仍然可用的下一个（admin 默认 > 列表第一个）
            const rest = candidateIds.filter(id => id !== m.id)
            onValueChange(config?.defaultModelId && rest.includes(config.defaultModelId) ? config.defaultModelId : (rest[0] ?? ""))
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
        label={<span className="!text-[13px] !text-zinc-600">显示名称</span>}
        rules={[{ required: true, message: "请输入显示名称" }]}
      >
        <Input placeholder="如：我的 Moonshot" className="!h-8 !text-[13px]" />
      </Form.Item>
      <Form.Item
        name="baseUrl"
        label={<span className="!text-[13px] !text-zinc-600">Base URL</span>}
        rules={[{ required: true, message: "请输入 Base URL" }]}
        extra={<span className="!text-[11px] !text-zinc-400">OpenAI 兼容端点，如 https://api.example.com/v1</span>}
      >
        <Input placeholder="https://api.example.com/v1" className="!h-8 !text-[13px] !font-mono" />
      </Form.Item>
      <Form.Item
        name="apiKey"
        label={<span className="!text-[13px] !text-zinc-600">API Key</span>}
        rules={[{ required: true, message: "请输入 API Key" }]}
      >
        <Input.Password placeholder="sk-..." className="!h-8 !text-[13px] !font-mono" />
      </Form.Item>
      {/* 积分倍率（桌面端 BYOK 无积分概念，隐藏该字段；未提交时上游按默认 1 计） */}
      <div className={IS_DESKTOP_APP ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
        <Form.Item
          name="modelId"
          label={<span className="!text-[13px] !text-zinc-600">模型 ID</span>}
          rules={[{ required: true, message: "请输入模型 ID" }]}
        >
          <Input placeholder="kimi-k2-0711-preview" className="!h-8 !text-[13px] !font-mono" />
        </Form.Item>
        {!IS_DESKTOP_APP && (
          <Form.Item
            name="rateMultiplier"
            label={
              <Tooltip title="该模型回复按 token 消耗积分的相对倍数（不填默认 1）">
                <span className="!text-[13px] !text-zinc-600">积分倍率（可选）</span>
              </Tooltip>
            }
          >
            <Input type="number" step={0.1} min={0.1} placeholder="默认 1" className="!h-8 !text-[13px]" />
          </Form.Item>
        )}
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
