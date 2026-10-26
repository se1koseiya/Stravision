"use client"

/**
 * 接入连接表单（新增 / 编辑）
 *
 * 表单字段完全由协议元数据驱动（/api/device-platform/protocols 下发），
 * 因此新增一种协议时这个组件一行都不用改：
 *   · `advanced` → 收进「高级参数」折叠区（不改也能跑的那批）
 *   · `secret`   → 进「凭证」区，编辑时留空 = 不改
 *   · `showWhen` → 按同组字段的值条件显示（HTTP 的 5 种凭证不会同时铺满表单）
 *
 * 版式：右侧抽屉（AccessModal），底部操作栏固定，长表单也不挤。
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { Alert, Button, Form, Input, InputNumber, Select, Switch } from "antd"

import { message } from "@/lib/ui/feedback"
import { IconCheckOne, IconLock, IconServer, IconWifi, IconLink, IconCpu } from "@/components/icon"
import type { ProtocolField, ProtocolMeta } from "@/lib/devices/protocols/types"
import {
  registerFormHost,
  type FormSnapshot,
  type PatchOutcome,
} from "@/lib/devices/form-state"
import {
  AccessModal,
  AiGlow,
  Collapsible,
  SectionLabel,
  Tile,
  ACCESS_RADIUS,
} from "./access-modal"

export interface ConnectionView {
  id: number
  name: string
  protocol: string
  description: string | null
  config: Record<string, unknown>
  secretKeys: string[]
  is_enabled: boolean
  allow_private_network: boolean
  last_ok_at: number | null
  last_error: string | null
  deviceCount?: number
}

interface Props {
  open: boolean
  protocols: ProtocolMeta[]
  initial?: ConnectionView | null
  /**
   * Copilot 草稿里的连接信息（新建时预填）。
   * 只填协议 / 名称 / 非敏感 config —— 凭证永远要用户自己输入。
   */
  preset?: {
    name?: string
    protocol?: string
    description?: string
    config?: Record<string, unknown>
    allow_private_network?: boolean
  } | null
  onClose: () => void
  onSaved: (connection: ConnectionView) => void
}

const PROTOCOL_ICON: Record<string, React.ReactNode> = {
  mqtt: <IconWifi size={15} />,
  http: <IconLink size={15} />,
  modbus_tcp: <IconServer size={15} />,
}

export function protocolIcon(protocol: string, size = 18): React.ReactNode {
  const node = PROTOCOL_ICON[protocol]
  if (node) return node
  return <IconCpu size={size} />
}

/** 把协议字段的默认值铺进 config（切换协议时也要重算，否则会残留上一个协议的字段） */
function defaultsOf(meta: ProtocolMeta | undefined, existing?: Record<string, unknown>): Record<string, unknown> {
  const cfg: Record<string, unknown> = { ...(existing || {}) }
  for (const f of meta?.fields || []) {
    if (f.secret) continue
    if (cfg[f.key] === undefined && f.default !== undefined) cfg[f.key] = f.default
  }
  return cfg
}

/** 字段是否该显示（showWhen 依赖同组 config 的另一个字段） */
function isVisible(f: ProtocolField, config: Record<string, unknown> | undefined): boolean {
  if (!f.showWhen) return true
  const cur = config?.[f.showWhen.key]
  return f.showWhen.in.includes(String(cur ?? ""))
}

export function ConnectionForm({ open, protocols, initial, preset, onClose, onSaved }: Props) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editing = !!initial
  const [protocol, setProtocol] = useState<string>(initial?.protocol || preset?.protocol || "mqtt")
  /** 条件字段要看当前 config 的值（如 authType），用 watch 而不是 getFieldValue，才能跟着输入重渲染 */
  const configValues = Form.useWatch("config", form) as Record<string, unknown> | undefined

  const meta = useMemo(
    () => protocols.find((p) => p.id === protocol) || protocols[0],
    [protocols, protocol]
  )

  /** preset 只按「内容快照」变化，避免父组件每次渲染新建对象都重置表单 */
  const presetKey = preset ? JSON.stringify(preset) : ""
  /** 🚨 用 ref 读 preset：直接进依赖会让 eslint 认成「少写依赖」，
   *  而把整个对象放进依赖又会因为父组件每渲染新建对象而无限重置表单。 */
  const presetRef = useRef(preset)
  presetRef.current = preset

  useEffect(() => {
    if (!open) return
    setError(null)
    setAiTouched({})
    const nextPreset = presetRef.current
    // 🚨 优先级：编辑已有连接 > Copilot 草稿预填 > 空白新建
    const base = initial
      ? { protocol: initial.protocol, name: initial.name, description: initial.description, config: initial.config, allow: initial.allow_private_network }
      : nextPreset
        ? {
            protocol: nextPreset.protocol || "mqtt",
            name: nextPreset.name || "",
            description: nextPreset.description || "",
            config: nextPreset.config,
            allow: nextPreset.allow_private_network ?? false,
          }
        : { protocol: "mqtt", name: "", description: "", config: undefined, allow: false }
    setProtocol(base.protocol)
    const nextMeta = protocols.find((p) => p.id === base.protocol)
    form.setFieldsValue({
      name: base.name,
      description: base.description,
      protocol: base.protocol,
      is_enabled: initial?.is_enabled ?? true,
      allow_private_network: base.allow,
      config: defaultsOf(nextMeta, base.config),
      secrets: {},
    })
  }, [open, initial, presetKey, form, protocols])

  const visibleFields = (meta?.fields || []).filter((f) => isVisible(f, configValues))
  const basicFields = visibleFields.filter((f) => !f.secret && !f.advanced)
  const secretFields = visibleFields.filter((f) => f.secret)
  const advancedFields = visibleFields.filter((f) => !f.secret && f.advanced)

  /**
   * 「哪些值是 Copilot 替我填的」—— 唯一判据 = 草稿里带了非空值。
   * 只在这三处亮光圈：连接名称 / 备注 / 协议 config 的对应键（凭证永远不由 AI 填）。
   * 依赖用 presetKey（内容快照）而不是 preset 对象：父组件每渲染新建对象会让光圈
   * 反复重启（视觉上像卡住一直闪）。
   */
  /**
   * 「哪些值是 Copilot 增量填过的（device_form_patch）」。
   * 与 `preset`（整包预填）并列成第二条通道 —— 用户改过的值不会被覆盖，
   * 所以必须单独记住「AI 动过哪些键」，否则光圈认不出来。
   */
  const [aiTouched, setAiTouched] = useState<Record<string, boolean>>({})

  const aiFilled = useMemo(() => {
    const p = presetRef.current
    const keys = new Set<string>()
    let name = false
    let description = false
    if (!editing && p) {
      for (const [k, v] of Object.entries(p.config || {})) {
        if (v !== undefined && v !== null && v !== "") keys.add(k)
      }
      name = !!p.name
      description = !!p.description
    }
    // 增量通道：config 子键用 `config.xxx` 记，顶层字段直接记
    for (const [k, on] of Object.entries(aiTouched)) {
      if (!on) continue
      if (k.startsWith("config.")) keys.add(k.slice("config.".length))
      if (k === "name") name = true
      if (k === "description") description = true
    }
    return { keys, name, description }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, presetKey, aiTouched])

  /* ------------------------------------------------------------------ */
  /* Copilot 表单通道：读快照 + 增量打补丁                                */
  /* ------------------------------------------------------------------ */

  /** 每次渲染刷新 ref —— 见 device-wizard 的同款说明（避免注册表反复注册注销） */
  const readRef = useRef<() => FormSnapshot>(() => ({} as FormSnapshot))
  const patchRef = useRef<(f: Record<string, unknown>) => PatchOutcome>(() => ({
    ok: false,
    applied: [],
    ignored: [],
    issues: [],
    summary: "",
  }))

  readRef.current = (): FormSnapshot => {
    const values = form.getFieldsValue() as {
      name?: string
      description?: string
      config?: Record<string, unknown>
      secrets?: Record<string, unknown>
      allow_private_network?: boolean
    }
    const cfg = values.config || {}
    const secrets = values.secrets || {}
    const str = (v: unknown) => (v === undefined || v === null ? "" : String(v))

    const fields = [
      { key: "name", label: "连接名称", value: str(values.name), required: true, filled: !!str(values.name) },
      { key: "description", label: "备注", value: str(values.description), required: false, filled: !!str(values.description) },
      {
        key: "protocol",
        label: "协议",
        value: protocol,
        required: true,
        filled: !!protocol,
        hint: "mqtt / http / modbus_tcp；换协议会重置下面的接入参数",
      },
      ...(meta?.fields || [])
        .filter((f) => !f.secret)
        .map((f) => ({
          key: `config.${f.key}`,
          label: f.label,
          value: str(cfg[f.key]),
          required: !!f.required,
          filled: cfg[f.key] !== undefined && cfg[f.key] !== null && cfg[f.key] !== "",
          hint: f.help || (f.advanced ? "高级参数，不填也能跑" : undefined),
        })),
      ...(meta?.fields || [])
        .filter((f) => f.secret)
        .map((f) => ({
          key: `secrets.${f.key}`,
          label: f.label,
          // 🚨 凭证绝不回传值，只回传「填没填」
          value: secrets[f.key] ? "（用户已填写，内容不下发）" : "",
          required: !!f.required,
          filled: !!secrets[f.key],
          secret: true,
          hint: "凭证类：必须由用户自己输入，不要向他索要明文",
        })),
    ]

    const missing = fields.filter((f) => f.required && !f.filled).map((f) => f.label)
    const summary =
      `用户在「${editing ? "编辑" : "新增"}接入连接」表单（协议 ${protocol}）；` +
      `已填 ${fields.filter((f) => f.filled).length}/${fields.length} 个字段。`

    return {
      kind: "access-connection",
      title: editing ? "编辑接入连接" : "新增接入连接",
      step: null,
      steps: [],
      stepTitle: "",
      fields,
      blocks: [],
      missing,
      issues: error ? [error] : [],
      summary,
      hint:
        "只补用户没填的非敏感项；config 用 { config: { 键: 值 } } 增量合并，凭证（secrets.*）永远不要填。",
    }
  }

  patchRef.current = (fields: Record<string, unknown>): PatchOutcome => {
    const applied: string[] = []
    const ignored: string[] = []
    const issues: string[] = []

    const asText = (v: unknown) => (typeof v === "string" ? v.trim() : v === undefined || v === null ? "" : String(v))
    if ("name" in fields && asText(fields.name)) {
      form.setFieldValue("name", asText(fields.name))
      applied.push("name")
    }
    if ("description" in fields && asText(fields.description)) {
      form.setFieldValue("description", asText(fields.description))
      applied.push("description")
    }

    /* config：增量合并到现有 config（不动用户已填的其它键） */
    const cfgIn = fields.config
    if (cfgIn && typeof cfgIn === "object") {
      const cur = (form.getFieldValue("config") || {}) as Record<string, unknown>
      const known = new Set((meta?.fields || []).filter((f) => !f.secret).map((f) => f.key))
      const next: Record<string, unknown> = { ...cur }
      for (const [k, v] of Object.entries(cfgIn as Record<string, unknown>)) {
        if (v === undefined || v === null || v === "") continue
        if (!known.has(k)) {
          issues.push(`config.${k} 不是「${protocol}」协议的字段，请用 device_access_catalog 核对键名`)
          continue
        }
        next[k] = v
        applied.push(`config.${k}`)
      }
      form.setFieldValue("config", next)
    }

    /* 凭证：一律拒收（回给模型，让它知道边界而不是默默丢弃） */
    if ("secrets" in fields) {
      ignored.push("secrets")
      issues.push("凭证（secrets.*）不可由 AI 填写，必须由用户自己输入")
    }

    if ("allow_private_network" in fields) {
      form.setFieldValue("allow_private_network", fields.allow_private_network === true)
      applied.push("allow_private_network")
    }

    for (const k of Object.keys(fields)) {
      if (!["name", "description", "config", "secrets", "allow_private_network", "protocol"].includes(k)) {
        ignored.push(k)
      }
    }
    if ("protocol" in fields) {
      ignored.push("protocol")
      issues.push("协议由用户在界面上点选（换协议会重置参数），本工具不接受 protocol")
    }

    if (applied.length > 0) {
      setAiTouched((prev) => {
        const next = { ...prev }
        for (const k of applied) next[k] = true
        return next
      })
    }

    const ok = applied.length > 0 && issues.length === 0
    return {
      ok,
      applied,
      ignored,
      issues,
      summary: ok
        ? `已增量填写：${applied.join("、")}（其余字段保持原样）`
        : applied.length === 0
          ? "没有可识别的字段被写入，表单未改动"
          : `写了 ${applied.join("、")}，但有 ${issues.length} 个问题`,
    }
  }

  useEffect(
    () =>
      registerFormHost({
        kind: "access-connection",
        isActive: () => open,
        read: () => readRef.current(),
        patch: (f) => patchRef.current(f),
      }),
    [open],
  )

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      setError(null)

      const config: Record<string, unknown> = {}
      for (const f of (meta?.fields || []).filter((f) => !f.secret)) {
        const v = values.config?.[f.key]
        if (v === undefined || v === null || v === "") continue
        config[f.key] = f.type === "number" ? Number(v) : v
      }
      const secrets: Record<string, unknown> = {}
      for (const f of secretFields) {
        const v = values.secrets?.[f.key]
        if (v === undefined || v === null || v === "") continue
        secrets[f.key] = v
      }

      const payload: Record<string, unknown> = {
        name: values.name,
        description: values.description || "",
        config,
        allow_private_network: !!values.allow_private_network,
        is_enabled: !!values.is_enabled,
      }
      // 编辑时 secrets 只提交本次填写的键（后端增量合并），不提交 = 不改
      if (!editing || Object.keys(secrets).length > 0) payload.secrets = secrets
      if (!editing) payload.protocol = protocol

      const res = await fetch(
        editing
          ? `/api/device-platform/connections/${initial!.id}`
          : "/api/device-platform/connections",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const issues = Array.isArray(data?.issues) ? data.issues.map((i: { message: string }) => i.message) : []
        setError(data?.error || issues.join("；") || "保存失败")
        return
      }
      message.success(editing ? "连接已更新" : "连接已创建")
      onSaved(data.connection as ConnectionView)
      onClose()
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) return // 表单校验失败，antd 已高亮
      setError(e instanceof Error ? e.message : "保存失败")
    } finally {
      setSubmitting(false)
    }
  }

  const renderField = (f: ProtocolField) => {
    const name = f.secret ? ["secrets", f.key] : ["config", f.key]
    const alreadySet = f.secret && initial?.secretKeys?.includes(f.key)
    const common = {
      placeholder: f.secret && alreadySet ? "已配置，留空则不修改" : f.placeholder,
      autoComplete: "off" as const,
    }
    let control: React.ReactNode = <Input {...common} />
    if (f.type === "password") control = <Input.Password {...common} />
    if (f.type === "number") control = <InputNumber min={0} style={{ width: "100%" }} placeholder={f.placeholder} />
    if (f.type === "textarea") control = <Input.TextArea rows={2} placeholder={f.placeholder} />
    if (f.type === "boolean") control = <Switch />
    if (f.type === "select") {
      control = (
        <Select
          options={(f.options || []).map((o) => ({ label: o.label, value: o.value }))}
          placeholder={f.placeholder}
          allowClear={false}
        />
      )
    }
    return (
      <Form.Item
        key={f.key}
        name={name}
        label={f.label}
        extra={f.help ? <span style={{ fontSize: 11, lineHeight: "16px", color: "var(--set-text-tertiary)" }}>{f.help}</span> : undefined}
        valuePropName={f.type === "boolean" ? "checked" : "value"}
        rules={f.required && !(f.secret && alreadySet) ? [{ required: true, message: `请填写${f.label}` }] : undefined}
      >
        {/* AI 填过的字段亮「框外光圈」；Switch 走 inline，否则光圈横铺整行 */}
        <AiGlow on={aiFilled.keys.has(f.key)} inline={f.type === "boolean"}>
          {control}
        </AiGlow>
      </Form.Item>
    )
  }

  /** 开关行：与设置弹窗的 Row 同款（左标题右开关） */
  const switchRow = (title: string, desc: string, node: React.ReactNode) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 14px",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--set-text)", lineHeight: "20px" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--set-text-secondary)", lineHeight: "16px", marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{node}</div>
    </div>
  )

  return (
    <AccessModal
      open={open}
      onClose={onClose}
      width={560}
      title={
        <>
          <IconLock size={15} style={{ color: "#059669" }} />
          {editing ? "编辑接入连接" : "新增接入连接"}
        </>
      }
      subtitle={
        editing
          ? "改动立即作用于这条连接下的所有设备"
          : "一条连接可以挂多台设备；凭证只加密存在平台侧，不会下发给前端"
      }
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit} icon={<IconCheckOne size={16} />}>
            {editing ? "保存" : "创建连接"}
          </Button>
        </>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        {!editing && (
          <>
            <div style={{ margin: "0 0 8px", fontSize: 12.5, color: "var(--set-text-secondary)" }}>协议</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {protocols.map((p) => (
                <Tile
                  key={p.id}
                  active={p.id === protocol}
                  onClick={() => {
                    if (p.id === protocol) return
                    setProtocol(p.id)
                    form.setFieldValue("config", defaultsOf(p))
                    form.setFieldValue("secrets", {})
                  }}
                  icon={protocolIcon(p.id, 15)}
                  label={p.name}
                  desc={p.inbound ? "可上报" : "仅下发"}
                />
              ))}
            </div>
            {meta && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11.5,
                  lineHeight: "17px",
                  color: "var(--set-text-secondary)",
                  padding: "8px 10px",
                  borderRadius: ACCESS_RADIUS.control,
                  background: "var(--set-chip-bg)",
                }}
              >
                {meta.summary}
              </div>
            )}
          </>
        )}

        <SectionLabel>基本信息</SectionLabel>
        <Form.Item name="name" label="连接名称" rules={[{ required: true, message: "请填写连接名称" }]}>
          <AiGlow on={aiFilled.name}>
            <Input placeholder="如：一号温室 EMQX / 涂鸦云 / 西门子 PLC" maxLength={60} />
          </AiGlow>
        </Form.Item>
        <Form.Item name="description" label="备注" style={{ marginBottom: 4 }}>
          <AiGlow on={aiFilled.description}>
            <Input placeholder="选填：这个连接接的是哪片区域 / 哪批设备" maxLength={200} />
          </AiGlow>
        </Form.Item>

        {basicFields.length > 0 && (
          <>
            <SectionLabel>{meta?.name} 接入参数</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: basicFields.length > 1 ? "1fr 1fr" : "1fr", columnGap: 16 }}>
              {basicFields.map(renderField)}
            </div>
          </>
        )}

        {secretFields.length > 0 && (
          <>
            <SectionLabel extra={<span style={{ fontSize: 11, color: "var(--set-text-tertiary)" }}>加密保存</span>}>凭证</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: secretFields.length > 1 ? "1fr 1fr" : "1fr", columnGap: 16 }}>
              {secretFields.map(renderField)}
            </div>
          </>
        )}

        {advancedFields.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Collapsible title="高级参数" hint={`${advancedFields.length} 项`}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 16, paddingTop: 12 }}>
                {advancedFields.map(renderField)}
              </div>
            </Collapsible>
          </div>
        )}

        <SectionLabel>行为</SectionLabel>
        <div
          style={{
            borderRadius: ACCESS_RADIUS.card,
            border: "1px solid var(--set-card-border)",
            background: "var(--set-card-bg)",
            overflow: "hidden",
          }}
        >
          {meta?.id === "http" &&
            switchRow(
              "允许访问内网地址",
              "设备在局域网（192.168.x / 10.x）时必须打开；只连公网服务请关闭，以防 SSRF。",
              <Form.Item name="allow_private_network" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            )}
          {switchRow(
            "启用这条连接",
            "关闭后停止接收上报与下发指令，配置保留。",
            <Form.Item name="is_enabled" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
          )}
        </div>

        {error && <Alert type="error" showIcon title={error} style={{ marginTop: 14 }} />}
      </Form>
    </AccessModal>
  )
}
