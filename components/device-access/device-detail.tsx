"use client"

/**
 * 设备详情 / 控制面板
 *
 * 展示：实时属性值、动作按钮、上报地址、物模型摘要
 * 控制：可写属性直接输入下发；动作按参数定义弹表单（参数定义来自物模型，不是硬编码）
 */

import { useEffect, useMemo, useState } from "react"
import { Alert, Button, Descriptions, Empty, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Tag } from "antd"

import { toast } from "@/lib/ui/feedback"
import {
  IconCheckOne,
  IconCopy,
  IconDelete,
  IconInfo,
  IconPlay,
  IconRefresh,
  IconCpu,
} from "@/components/icon"
import type { ThingModel, ThingAction, ThingProperty } from "@/lib/devices/thing-model"
import { protocolIcon, type ConnectionView } from "./connection-form"
import { AccessModal, ACCESS_RADIUS } from "./access-modal"

export interface DeviceValue {
  key: string
  valueNum: number | null
  valueText: string | null
  valueBool: boolean | null
  quality: string
  createdAt: number
}

export interface DeviceView {
  id: number
  name: string
  type: string
  category: string
  external_id: string | null
  connection_id: number | null
  protocol: string | null
  ingest_key: string | null
  thing_model: ThingModel
  last_seen_at: number | null
  is_enabled: boolean
  icon: string
  color: string
  latest?: DeviceValue[]
}

interface Props {
  open: boolean
  device: DeviceView | null
  connection?: ConnectionView | null
  onClose: () => void
  onChanged: () => void
}

function formatValue(prop: ThingProperty | undefined, v: DeviceValue | undefined): string {
  if (!v) return "—"
  if (v.valueBool !== null) return v.valueBool ? "开" : "关"
  if (v.valueNum !== null) {
    const num = prop?.decimals !== undefined ? v.valueNum.toFixed(prop.decimals) : String(v.valueNum)
    return prop?.unit ? `${num} ${prop.unit}` : num
  }
  return v.valueText ?? "—"
}

function timeAgo(ts: number | null): string {
  if (!ts) return "从未上报"
  const diff = Date.now() - ts
  if (diff < 60_000) return "刚刚"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return `${Math.floor(diff / 86_400_000)} 天前`
}

export function DeviceDetail({ open, device, connection, onClose, onChanged }: Props) {
  const [values, setValues] = useState<DeviceValue[]>([])
  const [loading, setLoading] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [actionModal, setActionModal] = useState<ThingAction | null>(null)
  const [actionForm] = Form.useForm()
  const [draftValues, setDraftValues] = useState<Record<string, unknown>>({})
  const [ingestKey, setIngestKey] = useState<string | null>(null)

  const model: ThingModel | null = device?.thing_model ?? null
  const propMap = useMemo(() => {
    const map = new Map<string, ThingProperty>()
    for (const p of model?.properties || []) map.set(p.key, p)
    return map
  }, [model])

  const loadValues = async () => {
    if (!device) return
    setLoading(true)
    try {
      const res = await fetch(`/api/device-platform/devices/${device.id}/properties?latest=1`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setValues(data.values || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open || !device) return
    setIngestKey(device.ingest_key)
    setDraftValues({})
    void loadValues()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, device?.id])

  // 详情打开时每 8 秒刷新一次数值，让用户直接看到数据在流动
  useEffect(() => {
    if (!open || !device) return
    const timer = setInterval(() => { void loadValues() }, 8000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, device?.id])

  const valueOf = (key: string) => values.find((v) => v.key === key)

  const ingestUrl =
    device && ingestKey && typeof window !== "undefined"
      ? `${window.location.origin}/api/device-platform/ingest/${ingestKey}`
      : ""

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label}已复制`)
    } catch {
      toast.warning("复制失败，请手动复制")
    }
  }

  const runAction = async (action: ThingAction, params?: Record<string, unknown>) => {
    if (!device) return
    setBusyKey(action.key)
    try {
      const res = await fetch(`/api/device-platform/devices/${device.id}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action.key, params }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        toast.success(`${action.name} 已下发${data.durationMs ? `（${data.durationMs}ms）` : ""}`)
        setActionModal(null)
        actionForm.resetFields()
        void loadValues()
        onChanged()
      } else {
        toast.error(data.error || "下发失败")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "下发失败")
    } finally {
      setBusyKey(null)
    }
  }

  const writeProperty = async (prop: ThingProperty) => {
    if (!device) return
    const raw = draftValues[prop.key]
    if (raw === undefined || raw === null || raw === "") {
      toast.warning(`请先填写「${prop.name}」的目标值`)
      return
    }
    setBusyKey(prop.key)
    try {
      const res = await fetch(`/api/device-platform/devices/${device.id}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property: prop.key, value: raw }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        toast.success(`${prop.name} 写入已下发`)
        void loadValues()
        onChanged()
      } else {
        toast.error(data.error || "写入失败")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "写入失败")
    } finally {
      setBusyKey(null)
    }
  }

  const rotateKey = async () => {
    if (!device) return
    const res = await fetch(`/api/device-platform/devices/${device.id}/rotate-key`, { method: "POST" })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.ingest_key) {
      setIngestKey(data.ingest_key)
      toast.success("上报凭证已重置，旧地址立即失效")
      onChanged()
    } else {
      toast.error(data.error || "重置失败")
    }
  }

  const removeDevice = async () => {
    if (!device) return
    const res = await fetch(`/api/device-platform/devices/${device.id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("设备已移除")
      onChanged()
      onClose()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "移除失败")
    }
  }

  return (
    <>
      <AccessModal
        open={open}
        onClose={onClose}
        width={620}
        title={
          <>
            <span
              style={{
                display: "inline-flex",
                width: 26,
                height: 26,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: ACCESS_RADIUS.control,
                background: "var(--acc-tile-active-bg)",
                color: "#059669",
              }}
            >
              {protocolIcon(device?.protocol || "", 15)}
            </span>
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {device?.name || "设备详情"}
            </span>
            {device?.last_seen_at && Date.now() - device.last_seen_at < 300_000 ? (
              <Tag color="green">在线</Tag>
            ) : (
              <Tag>离线</Tag>
            )}
          </>
        }
        subtitle={connection ? `${connection.name}（${connection.protocol}）` : "第三方接入设备"}
        footer={
          <>
            <Popconfirm
              title="移除这台设备？"
              description="设备与历史数据都会被删除，且不可恢复。"
              onConfirm={removeDevice}
              okText="移除"
              cancelText="取消"
            >
              <Button danger type="text" icon={<IconDelete size={15} />}>
                移除设备
              </Button>
            </Popconfirm>
            <div style={{ flex: 1 }} />
            <Button icon={<IconRefresh size={15} />} loading={loading} onClick={loadValues}>
              刷新
            </Button>
            <Button type="primary" onClick={onClose}>
              关闭
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Descriptions size="small" column={2} items={[
            { key: "conn", label: "接入连接", children: connection ? `${connection.name}（${connection.protocol}）` : "—" },
            { key: "ext", label: "外部设备 ID", children: device?.external_id || "—" },
            { key: "seen", label: "最后上报", children: timeAgo(device?.last_seen_at ?? null) },
            { key: "count", label: "属性 / 动作", children: `${model?.properties.length || 0} / ${model?.actions.length || 0}` },
          ]} />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-200">属性</span>
              <span className="text-[11px] text-zinc-500">每 8 秒自动刷新</span>
            </div>
            {(!model || model.properties.length === 0) && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有定义属性" />}
            <div className="space-y-2">
              {(model?.properties || []).map((p) => {
                const v = valueOf(p.key)
                const writable = p.access !== "r"
                return (
                  <div key={p.key} className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 px-3 py-2 dark:border-zinc-700/70">
                    <div className="min-w-[120px] flex-1">
                      <div className="text-[13px] text-zinc-800 dark:text-zinc-100">{p.name}</div>
                      <div className="text-[11px] text-zinc-500">{p.key} · {p.dataType}{p.unit ? ` · ${p.unit}` : ""}</div>
                    </div>
                    <div className="min-w-[90px] text-right text-[13px] font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatValue(p, v)}
                    </div>
                    {writable && (
                      <div className="flex items-center gap-1">
                        {p.dataType === "boolean" ? (
                          <Switch
                            size="small"
                            checked={Boolean(draftValues[p.key])}
                            onChange={(checked) => setDraftValues((prev) => ({ ...prev, [p.key]: checked }))}
                          />
                        ) : p.dataType === "enum" ? (
                          <Select
                            size="small"
                            className="w-[120px]"
                            placeholder="选择"
                            value={draftValues[p.key] as string | undefined}
                            onChange={(v2) => setDraftValues((prev) => ({ ...prev, [p.key]: v2 }))}
                            options={(p.enum || []).map((o) => ({ label: o.label, value: String(o.value) }))}
                          />
                        ) : p.dataType === "number" ? (
                          <InputNumber
                            size="small"
                            className="w-[100px]"
                            placeholder="目标值"
                            min={p.min}
                            max={p.max}
                            value={draftValues[p.key] as number | undefined}
                            onChange={(v2) => setDraftValues((prev) => ({ ...prev, [p.key]: v2 }))}
                          />
                        ) : (
                          <Input
                            size="small"
                            className="w-[110px]"
                            placeholder="目标值"
                            value={draftValues[p.key] as string | undefined}
                            onChange={(e) => setDraftValues((prev) => ({ ...prev, [p.key]: e.target.value }))}
                          />
                        )}
                        <Button
                          size="small"
                          type="text"
                          loading={busyKey === p.key}
                          onClick={() => writeProperty(p)}
                          icon={<IconCheckOne size={14} />}
                        >
                          写入
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {(model?.actions.length || 0) > 0 && (
            <div>
              <div className="mb-2 text-[13px] font-medium text-zinc-700 dark:text-zinc-200">动作</div>
              <div className="flex flex-wrap gap-2">
                {(model?.actions || []).map((a) => (
                  <Button
                    key={a.key}
                    icon={<IconPlay size={14} />}
                    loading={busyKey === a.key}
                    onClick={() => {
                      if (a.params.length === 0) void runAction(a)
                      else {
                        setActionModal(a)
                        actionForm.resetFields()
                      }
                    }}
                  >
                    {a.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {connection?.protocol !== "modbus_tcp" && ingestUrl && (
            <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-900/60">
              <div className="mb-1 flex items-center gap-2 text-[12px] font-medium text-zinc-600 dark:text-zinc-300">
                <IconInfo size={14} /> 上报地址
              </div>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 break-all rounded-lg bg-white px-2 py-1.5 font-mono text-[11px] text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                  {ingestUrl}
                </div>
                <Button size="small" icon={<IconCopy size={13} />} onClick={() => copy(ingestUrl, "上报地址")}>复制</Button>
                <Popconfirm title="重置上报凭证？" description="设备需要用新地址上报，旧地址立即失效。" onConfirm={rotateKey} okText="重置" cancelText="取消">
                  <Button size="small" danger icon={<IconRefresh size={13} />}>重置</Button>
                </Popconfirm>
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">该地址含设备专属凭证，请勿发到公开场合。</div>
            </div>
          )}

          <Alert
            type="info"
            showIcon
            icon={<IconCpu size={16} />}
            title="物模型"
            description={
              <div className="text-[11px] leading-relaxed">
                属性 {model?.properties.length || 0} 个、动作 {model?.actions.length || 0} 个、事件 {model?.events.length || 0} 个。
                新增或修改能力请在设备接入向导里配置，平台据此自动生成上报解析与控制入口。
              </div>
            }
          />
        </div>
      </AccessModal>

      <Modal
        open={!!actionModal}
        onCancel={() => setActionModal(null)}
        title={actionModal ? `执行：${actionModal.name}` : ""}
        okText="下发"
        cancelText="取消"
        confirmLoading={!!busyKey}
        /* 关 focus trap：与 AccessModal 同因（弹窗 × Copilot 并用），详见 access-modal.tsx */
        focusable={{ trap: false }}
        onOk={async () => {
          if (!actionModal) return
          const values = await actionForm.validateFields().catch(() => null)
          if (!values) return
          await runAction(actionModal, values)
        }}
        destroyOnHidden
      >
        <Form form={actionForm} layout="vertical" className="pt-2">
          {(actionModal?.params || []).map((p) => (
            <Form.Item
              key={p.key}
              name={p.key}
              label={`${p.name}${p.unit ? `（${p.unit}）` : ""}`}
              rules={p.required ? [{ required: true, message: `请填写${p.name}` }] : undefined}
            >
              {p.dataType === "number" ? (
                <InputNumber className="w-full" min={p.min} max={p.max} />
              ) : p.dataType === "boolean" ? (
                <Switch />
              ) : p.dataType === "enum" ? (
                <Select options={(p.enum || []).map((o) => ({ label: o.label, value: String(o.value) }))} />
              ) : (
                <Input />
              )}
            </Form.Item>
          ))}
          {(actionModal?.params.length || 0) === 0 && (
            <div className="text-[12px] text-zinc-600 dark:text-zinc-400">该动作没有参数，确认后立即下发。</div>
          )}
        </Form>
      </Modal>
    </>
  )
}
