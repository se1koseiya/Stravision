"use client"

/**
 * 设备接入向导（三步）
 *
 * 1. 基础信息：挂在哪个连接下、设备名、外部 ID、上下行 topic
 * 2. 物模型：属性（可增删的简表）+ 动作（高级 JSON），支持从模板一键填充
 * 3. 上报地址：拿到 ingest key、示例报文与 curl，直接贴到设备/网关里
 *
 * 物模型校验复用 lib/devices/thing-model 的纯函数，前端所见即后端所验。
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { Alert, Button, Form, Input, InputNumber, Select, Steps, Tag } from "antd"
import { toast } from "@/lib/ui/feedback"
import { IconCheckOne, IconCopy, IconPlus, IconDelete, IconArrowRight, IconLeft, IconMagic } from "@/components/icon"
import type { ProtocolMeta } from "@/lib/devices/protocols/types"
import {
  normalizeThingModel,
  validateThingModel,
  type ThingModel,
  type ThingProperty,
} from "@/lib/devices/thing-model"
import type { DeviceAccessDraft } from "@/lib/devices/access-draft"
import {
  registerFormHost,
  type FormSnapshot,
  type PatchOutcome,
} from "@/lib/devices/form-state"
import type { ConnectionView } from "./connection-form"
import { AccessModal, AiGlow, Collapsible, SectionLabel, Tile, ACCESS_RADIUS } from "./access-modal"

/**
 * 属性行的编辑模型 = 物模型属性本体。
 * 🚨 不要另立一套精简类型：Copilot 生成的草稿里常带 enum / decimals / offset / write 这些
 *    精简类型装不下的字段，一旦另立类型就只能丢掉，等于「AI 扩展的参数填不进来」。
 */
type DraftProp = ThingProperty

const TEMPLATES: Array<{ id: string; name: string; hint: string; props: DraftProp[]; actions: unknown[] }> = [
  {
    id: "env",
    name: "温湿度传感器",
    hint: "温度 + 湿度，只上报",
    props: [
      { key: "temperature", name: "温度", unit: "°C", dataType: "number", path: "temperature", access: "r" },
      { key: "humidity", name: "湿度", unit: "%", dataType: "number", path: "humidity", access: "r" },
    ],
    actions: [],
  },
  {
    id: "switch",
    name: "开关 / 继电器",
    hint: "可读可写的开关状态 + 开/关动作",
    props: [
      { key: "power", name: "开关", dataType: "boolean", path: "power", access: "rw" },
    ],
    actions: [
      { key: "turn_on", name: "开启", params: [], transport: { payload: '{"power":true}' } },
      { key: "turn_off", name: "关闭", params: [], transport: { payload: '{"power":false}' } },
    ],
  },
  {
    id: "meter",
    name: "电力仪表",
    hint: "电压/电流/功率/电量",
    props: [
      { key: "voltage", name: "电压", unit: "V", dataType: "number", path: "voltage", access: "r" },
      { key: "current", name: "电流", unit: "A", dataType: "number", path: "current", access: "r" },
      { key: "power", name: "功率", unit: "W", dataType: "number", path: "power", access: "r" },
      { key: "energy", name: "电量", unit: "kWh", dataType: "number", path: "energy", access: "r" },
    ],
    actions: [],
  },
]

interface Props {
  open: boolean
  connections: ConnectionView[]
  protocols: ProtocolMeta[]
  defaultConnectionId?: number | null
  /**
   * Copilot 生成的接入草稿：打开时用它预填（连接 / 设备信息 / 物模型）。
   * 🚨 只是「预填」——用户仍然要自己点「完成接入」，AI 无法直接写设备表。
   */
  draft?: DeviceAccessDraft | null
  onClose: () => void
  onCreated: () => void
}

/** 向导三步的标题（快照里回传给 Copilot，让它知道「第 2 步」在问什么） */
const STEP_TITLES = ["基础信息", "设备能力", "上报接入"]

/**
 * 按 key 合并两条同构列表：已存在就打补丁，不存在才追加。
 *
 * 🚨 这是「不再乱填」的关键：老通道 `device_access_apply_draft` 是整包
 *    `form.setFieldsValue`，用户改过的属性会被整片覆盖回去；增量通道只动传进来的键。
 */
function mergeByKey<T extends { key?: string }>(prev: T[], incoming: T[]): T[] {
  const out = prev.map((p) => ({ ...p }))
  for (const inc of incoming) {
    const k = inc?.key
    if (!k) continue
    const idx = out.findIndex((p) => p?.key === k)
    if (idx >= 0) out[idx] = { ...out[idx], ...inc }
    else out.push({ ...inc })
  }
  return out
}

/** 把模型给的属性收敛成数组：兼容 [{key:…}] 与 { temperature: {…} } 两种写法 */
function normalizePropsInput(raw: unknown): DraftProp[] | null {
  if (raw === undefined || raw === null) return []
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === "object") as DraftProp[]
  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(([k, v]) => {
      if (v && typeof v === "object") {
        return { ...(v as Record<string, unknown>), key: (v as { key?: string }).key || k } as unknown as DraftProp
      }
      return { key: k } as unknown as DraftProp
    })
  }
  return null
}

/** 安全解析动作 JSON（用户手改坏了也不能让整张表崩掉） */
function parseActions(text: string): unknown[] {
  try {
    const parsed = JSON.parse(text || "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function buildSamplePayload(props: DraftProp[]): string {
  const root: Record<string, unknown> = {}
  for (const p of props) {
    const path = (p.path || p.key).trim()
    if (!path) continue
    const sample =
      p.dataType === "number" ? 25.4 : p.dataType === "boolean" ? true : "示例值"
    const parts = path.split(".")
    let cur = root
    parts.forEach((part, i) => {
      if (i === parts.length - 1) cur[part] = sample
      else {
        if (typeof cur[part] !== "object" || cur[part] === null) cur[part] = {}
        cur = cur[part] as Record<string, unknown>
      }
    })
  }
  return JSON.stringify(root, null, 2)
}

export function DeviceWizard({ open, connections, protocols, defaultConnectionId, draft, onClose, onCreated }: Props) {
  const [form] = Form.useForm()
  const [step, setStep] = useState(0)
  const [props, setProps] = useState<DraftProp[]>(TEMPLATES[0].props)
  const [actionsJson, setActionsJson] = useState<string>("[]")
  const [templateId, setTemplateId] = useState<string>("env")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ id: number; name: string; ingestKey: string } | null>(null)
  /** 本次打开是从 Copilot 草稿预填的（决定顶部提示条是否显示） */
  const [fromDraft, setFromDraft] = useState(false)
  /**
   * 「哪些格子是 Copilot 用 device_form_patch 增量填过的」。
   * 🚨 与 `fromDraft`（整包预填）是两条独立通道，光圈要同时认这两条，
   *    否则用户只看到「AI 说填了但界面没反应」。
   */
  const [aiTouched, setAiTouched] = useState<Record<string, boolean>>({})

  const connectionId = Form.useWatch("connection_id", form) as number | undefined
  const connection = useMemo(
    () => connections.find((c) => c.id === connectionId) || null,
    [connections, connectionId]
  )
  const meta = useMemo(
    () => protocols.find((p) => p.id === connection?.protocol) || null,
    [protocols, connection]
  )

  /**
   * 预填只做一次。
   * 🚨 `connections` 必须走 ref：它每次 `loadGeneric()` 都会换新数组，
   *    若进依赖会把用户刚改的属性/名称整片覆盖回去（表现为「填一半突然被重置」）。
   */
  const connectionsRef = useRef(connections)
  connectionsRef.current = connections
  const defaultConnRef = useRef(defaultConnectionId)
  defaultConnRef.current = defaultConnectionId

  useEffect(() => {
    if (!open) return
    setStep(0)
    setError(null)
    setCreated(null)
    setFromDraft(false)
    setAiTouched({})

    const conns = connectionsRef.current
    let nextProps: DraftProp[] = TEMPLATES[0].props.map((p) => ({ ...p }))
    let nextActions = "[]"
    let nextTemplate = "env"
    let connectionId: number | undefined = defaultConnRef.current || conns[0]?.id
    let name = ""
    let externalId = ""
    let subTopic = ""
    let pubTopic = ""

    if (draft) {
      const d = draft.device
      // 连接：优先按 id 复用；否则按「协议 + 名称」在已有连接里找最像的那条
      const byId = draft.connection?.id ? conns.find((c) => c.id === draft.connection?.id) : undefined
      const byProtocol = !byId && draft.connection?.protocol
        ? conns.find(
            (c) =>
              c.protocol === draft.connection?.protocol &&
              (!draft.connection?.name || c.name === draft.connection.name)
          ) || conns.find((c) => c.protocol === draft.connection?.protocol)
        : undefined
      const matched = byId || byProtocol
      if (matched) connectionId = matched.id
      name = d.name || ""
      externalId = d.external_id || ""
      subTopic = d.subscribe_topic || ""
      pubTopic = d.publish_topic || ""
      nextProps = d.thing_model.properties.map((p) => ({ ...p }))
      nextActions = JSON.stringify(d.thing_model.actions || [], null, 2)
      nextTemplate = ""
      setFromDraft(true)
    }

    setProps(nextProps)
    setActionsJson(nextActions)
    setTemplateId(nextTemplate)
    form.setFieldsValue({
      connection_id: connectionId,
      name,
      external_id: externalId,
      subscribe_topic: subTopic,
      publish_topic: pubTopic,
    })
    // 依赖只有「打开」与「草稿换了」——见上方 connectionsRef 的说明
  }, [open, draft, form])

  /**
   * Copilot 草稿填进来的字段 → 亮「框外光圈」（2026-10-21 用户要求）。
   * 判据只看「草稿里这个值非空」，不猜；`fromDraft` 已经把范围限死在预填场景。
   */
  const aiFilled = useMemo(() => {
    const d = fromDraft ? draft?.device : undefined
    // 两条通道都认：整包预填（draft）+ 增量补丁（aiTouched）
    const t = aiTouched
    return {
      name: !!d?.name || !!t.name,
      externalId: !!d?.external_id || !!t.external_id,
      subscribe: !!d?.subscribe_topic || !!t.subscribe_topic,
      publish: !!d?.publish_topic || !!t.publish_topic,
      props: !!(d && d.thing_model.properties.length > 0) || !!t.properties,
    }
  }, [fromDraft, draft, aiTouched])

  /** 物模型与校验：既给界面用，也给 Copilot 快照里的 issues 用（必须排在上面读它之前） */
  const thingModel: ThingModel = useMemo(() => {
    return normalizeThingModel({ schemaVersion: 1, properties: props, actions: parseActions(actionsJson) })
  }, [props, actionsJson])

  const validation = useMemo(() => validateThingModel(thingModel), [thingModel])
  const actionsParseError = useMemo(() => {
    try {
      const parsed = JSON.parse(actionsJson || "[]")
      return Array.isArray(parsed) ? null : "动作必须是数组"
    } catch {
      return "动作 JSON 格式不正确"
    }
  }, [actionsJson])

  /* ------------------------------------------------------------------ */
  /* Copilot 表单通道：读快照 + 增量打补丁                                */
  /* ------------------------------------------------------------------ */

  /** 单值字段白名单 —— 模型只能改这五个，其余一律忽略并回报 */
  const PLAIN_FIELDS = ["connection_id", "name", "external_id", "subscribe_topic", "publish_topic"]

  /**
   * 每次渲染刷新 ref，保证注册表里存的是「最新闭包」。
   * 🚨 不能把 read/patch 直接进 useEffect 依赖：props/validation 每敲一个字就变，
   *    会导致反复注册注销（注册表抖动，其它表单的优先级判定跟着乱）。
   */
  const readRef = useRef<() => FormSnapshot>(() => ({} as FormSnapshot))
  const patchRef = useRef<(f: Record<string, unknown>) => PatchOutcome>(() => ({
    ok: false,
    applied: [],
    ignored: [],
    issues: [],
    summary: "",
  }))
  const activeRef = useRef<() => boolean>(() => false)

  readRef.current = (): FormSnapshot => {
    const values = form.getFieldsValue() as Record<string, unknown>
    const str = (v: unknown) => (v === undefined || v === null ? "" : String(v))
    const connLabel = connection ? `${connection.name}（${connection.protocol}）` : ""

    const fields = [
      {
        key: "connection_id",
        label: "接入连接",
        value: connLabel,
        required: true,
        filled: !!values.connection_id,
        hint: "已有连接的 id；不知道就留空让用户自己选",
      },
      { key: "name", label: "设备名称", value: str(values.name), required: true, filled: !!str(values.name) },
      {
        key: "external_id",
        label: "外部设备 ID",
        value: str(values.external_id),
        required: false,
        filled: !!str(values.external_id),
        hint: "设备序列号 / devEUI / 从站号，同一连接下不可重复",
      },
      { key: "subscribe_topic", label: "上报 topic", value: str(values.subscribe_topic), required: false, filled: !!str(values.subscribe_topic) },
      { key: "publish_topic", label: "下发 topic", value: str(values.publish_topic), required: false, filled: !!str(values.publish_topic) },
    ]

    const propDetail =
      props.length === 0
        ? "还没有任何属性（平台不知道该收什么数据）"
        : props
            .map((p, i) => {
              const bits = [`${p.key || "(缺标识)"}`, p.name || "(缺中文名)", p.dataType, p.access]
              if (p.unit) bits.push(`单位${p.unit}`)
              if (p.path && p.path !== p.key) bits.push(`路径${p.path}`)
              if (p.scale) bits.push(`÷${p.scale}`)
              return `${i + 1}. ${bits.join(" / ")}`
            })
            .join("；")

    const actionList = parseActions(actionsJson)
    const blocks = [
      { key: "properties", label: `属性（${props.length} 条）`, detail: propDetail },
      {
        key: "actions",
        label: `动作（${actionList.length} 个）`,
        detail: actionList.length
          ? actionList.map((a) => String((a as { key?: string })?.key || "?")).join("、")
          : "没有可下发动作（纯上报设备可以不配）",
      },
    ]

    const missing: string[] = []
    for (const f of fields) if (f.required && !f.filled) missing.push(f.label)
    if (props.length === 0) missing.push("至少一个属性")
    const badProp = props.findIndex((p) => !p.key || !p.name)
    if (badProp >= 0) missing.push(`第 ${badProp + 1} 个属性缺「标识」或「中文名」`)
    if (actionsParseError) missing.push("动作 JSON 格式不正确")

    const issues = validation.issues.filter((i) => i.level === "error").map((i) => i.message)

    const summary =
      `用户在「接入第三方设备」向导第 ${step + 1}/3 步「${STEP_TITLES[step] || "?"}」；` +
      `已填 ${fields.filter((f) => f.filled).length}/${fields.length} 个基础字段、` +
      `${props.length} 条属性、${actionList.length} 个动作。`

    const hint =
      step === 0
        ? "当前在填基础信息。用 device_form_patch 补缺失字段即可，不要重复提交用户已填好的值。"
        : step === 1
          ? "当前在定义设备能力。属性按 key 增量合并（同名覆盖、异名追加），不会清掉用户已改的属性。"
          : "这一页是接入结果（上报地址/示例报文），不要再改表单。"

    return {
      kind: "access-wizard",
      title: "接入第三方设备",
      step,
      steps: [...STEP_TITLES],
      stepTitle: STEP_TITLES[step] || "",
      fields,
      blocks,
      missing,
      issues,
      summary,
      hint,
    }
  }

  patchRef.current = (fields: Record<string, unknown>): PatchOutcome => {
    const applied: string[] = []
    const ignored: string[] = []
    const issues: string[] = []

    /* ① 单值字段：只写传了的键 */
    const plain: Record<string, unknown> = {}
    for (const k of PLAIN_FIELDS) {
      if (!(k in fields)) continue
      const v = fields[k]
      if (v === undefined || v === null || v === "") {
        ignored.push(k)
        continue
      }
      plain[k] = k === "connection_id" ? Number(v) : String(v)
      applied.push(k)
    }
    if (Object.keys(plain).length > 0) form.setFieldsValue(plain)

    /* ② 属性：按 key 增量合并 */
    const rawProps =
      "properties" in fields
        ? fields.properties
        : (fields.thing_model as { properties?: unknown } | undefined)?.properties
    if (rawProps !== undefined) {
      const incoming = normalizePropsInput(rawProps)
      if (incoming === null) {
        issues.push("properties 格式不对：应为数组或 { key: {...} } 映射")
      } else if (incoming.length > 0) {
        setProps((prev) => mergeByKey(prev, incoming))
        applied.push("properties")
      } else {
        ignored.push("properties")
      }
    }

    /* ③ 动作：同样按 key 增量合并 */
    const rawActions =
      "actions" in fields
        ? fields.actions
        : (fields.thing_model as { actions?: unknown } | undefined)?.actions
    if (rawActions !== undefined) {
      if (!Array.isArray(rawActions)) {
        issues.push("actions 必须是数组")
      } else if (rawActions.length > 0) {
        const merged = mergeByKey(
          parseActions(actionsJson) as Array<{ key?: string }>,
          rawActions as Array<{ key?: string }>,
        )
        setActionsJson(JSON.stringify(merged, null, 2))
        applied.push("actions")
      } else {
        ignored.push("actions")
      }
    }

    for (const k of Object.keys(fields)) {
      if (!PLAIN_FIELDS.includes(k) && k !== "properties" && k !== "actions" && k !== "thing_model") {
        ignored.push(k)
      }
    }

    if (applied.length > 0) {
      setAiTouched((prev) => {
        const next = { ...prev }
        for (const k of applied) next[k] = true
        return next
      })
      // 属性被改过之后就不再是任何模板了
      if (applied.includes("properties")) setTemplateId("")
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
          : `写了 ${applied.join("、")}，但有 ${issues.length} 个问题需要修正`,
    }
  }

  activeRef.current = () => open && step < 2

  useEffect(
    () =>
      registerFormHost({
        kind: "access-wizard",
        isActive: () => activeRef.current(),
        read: () => readRef.current(),
        patch: (f) => patchRef.current(f),
        gotoStep: (s) => {
          if (!open || s < 0 || s > 1) return false
          setStep(s)
          return true
        },
      }),
    [open],
  )

  const applyTemplate = (id: string) => {
    const tpl = TEMPLATES.find((t) => t.id === id)
    if (!tpl) return
    setTemplateId(id)
    setProps(tpl.props.map((p) => ({ ...p })))
    setActionsJson(JSON.stringify(tpl.actions, null, 2))
  }

  const updateProp = (index: number, patch: Partial<DraftProp>) => {
    setProps((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  const submit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      setError(null)
      const res = await fetch("/api/device-platform/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          connection_id: values.connection_id,
          external_id: values.external_id || undefined,
          subscribe_topic: values.subscribe_topic || undefined,
          publish_topic: values.publish_topic || undefined,
          thing_model: { schemaVersion: 1, properties: props, actions: JSON.parse(actionsJson || "[]") },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const issues = Array.isArray(data?.issues)
          ? data.issues.filter((i: { level: string }) => i.level === "error").map((i: { message: string }) => i.message)
          : []
        setError(data?.error ? `${data.error}${issues.length ? `：${issues.join("；")}` : ""}` : "接入失败")
        return
      }
      setCreated({
        id: data.device.id,
        name: data.device.name,
        ingestKey: data.device.ingest_key,
      })
      setStep(2)
      onCreated()
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) {
        setStep(0)
        return
      }
      setError(e instanceof Error ? e.message : "接入失败")
    } finally {
      setSubmitting(false)
    }
  }

  const ingestUrl = created
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/device-platform/ingest/${created.ingestKey}`
    : ""
  const sample = buildSamplePayload(props)
  const curl =
    created && connection?.protocol !== "modbus_tcp"
      ? `curl -X POST '${ingestUrl}' \\\n  -H 'Content-Type: application/json' \\\n  -d '${sample.replace(/\n\s*/g, "")}'`
      : ""

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label}已复制`)
    } catch {
      toast.warning("复制失败，请手动选中复制")
    }
  }

  /** 一行两列的表单项容器（抽屉比弹窗窄，两列已是最密） */
  const grid2 = (children: React.ReactNode) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 16 }}>{children}</div>
  )

  return (
    <AccessModal
      open={open}
      onClose={onClose}
      width={620}
      title={
        <>
          <IconPlus size={15} style={{ color: "#059669" }} />
          接入第三方设备
        </>
      }
      subtitle={
        connection
          ? `连接：${connection.name}（${meta?.name || connection.protocol}）`
          : "先选一条接入连接，再定义这台设备能上报什么、能被控制什么"
      }
      top={
        <Steps
          current={step}
          size="small"
          items={[{ title: "基础信息" }, { title: "设备能力" }, { title: "上报接入" }]}
        />
      }
      footer={
        <>
          <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: "var(--set-text-tertiary)" }}>
            {step === 0 ? "填写设备标识与上下行 topic" : step === 1 ? "至少一个属性，否则收不到数据" : "把上报地址填到设备端"}
          </div>
          {step > 0 && step < 2 && (
            <Button icon={<IconLeft size={14} />} onClick={() => setStep((s) => s - 1)}>
              上一步
            </Button>
          )}
          {step === 0 && (
            <Button type="primary" onClick={() => setStep(1)} icon={<IconArrowRight size={14} />}>
              下一步：定义能力
            </Button>
          )}
          {step === 1 && (
            <Button type="primary" loading={submitting} onClick={submit} icon={<IconCheckOne size={16} />}>
              完成接入
            </Button>
          )}
          {step === 2 && (
            <Button type="primary" onClick={onClose}>
              完成
            </Button>
          )}
        </>
      }
    >
      {step === 0 && (
        <Form form={form} layout="vertical" requiredMark="optional">
          {/* Copilot 预填提示：告诉用户「哪些是 AI 猜的、哪些还缺」，
              而不是让他对着一堆已填好的框猜为什么这么填 */}
          {fromDraft && draft && (
            <div
              style={{
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: ACCESS_RADIUS.card,
                border: "1px solid rgba(5,150,105,.35)",
                background: "var(--acc-tile-active-bg)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: "#059669" }}>
                <IconMagic size={14} />
                已按你的描述预填，核对后点「完成接入」
              </div>
              {draft.notes && draft.notes.length > 0 && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 11.5, lineHeight: "18px", color: "var(--set-text-secondary)" }}>
                  {draft.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
              {draft.missing && draft.missing.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: "18px", color: "var(--set-text-tertiary)" }}>
                  还需要你补：{draft.missing.join("、")}
                </div>
              )}
            </div>
          )}
          {grid2(
            <>
              <Form.Item name="connection_id" label="接入连接" rules={[{ required: true, message: "请选择连接" }]}>
                <Select
                  placeholder="选择一条连接"
                  options={connections.map((c) => ({
                    label: `${c.name}（${c.protocol}）`,
                    value: c.id,
                  }))}
                />
              </Form.Item>
              <Form.Item name="name" label="设备名称" rules={[{ required: true, message: "请填写设备名称" }]}>
                <AiGlow on={aiFilled.name}>
                  <Input placeholder="如：3 号棚温湿度计" maxLength={60} />
                </AiGlow>
              </Form.Item>
            </>
          )}

          <Form.Item
            name="external_id"
            label="外部设备 ID"
            extra={
              <span style={{ fontSize: 11, lineHeight: "16px", color: "var(--set-text-tertiary)" }}>
                设备在第三方平台 / 网关里的唯一标识（deviceId、devEUI、序列号）。同一连接下不可重复，用于把上报数据分给正确设备。
              </span>
            }
          >
            <AiGlow on={aiFilled.externalId}>
              <Input placeholder="如：SN-000123 / dev_eui:AB12" maxLength={120} />
            </AiGlow>
          </Form.Item>

          {grid2(
            <>
              <Form.Item
                name="subscribe_topic"
                label="上报 topic"
                extra={
                  <span style={{ fontSize: 11, lineHeight: "16px", color: "var(--set-text-tertiary)" }}>
                    MQTT 用，支持通配与 {"{{device.external_id}}"} 占位符
                  </span>
                }
              >
                <AiGlow on={aiFilled.subscribe}>
                  <Input placeholder="sensors/+/data" maxLength={200} />
                </AiGlow>
              </Form.Item>
              <Form.Item
                name="publish_topic"
                label="下发 topic"
                extra={
                  <span style={{ fontSize: 11, lineHeight: "16px", color: "var(--set-text-tertiary)" }}>
                    动作未单独配 topic 时走这里
                  </span>
                }
              >
                <AiGlow on={aiFilled.publish}>
                  <Input placeholder={"sensors/{{device.external_id}}/cmd"} maxLength={200} />
                </AiGlow>
              </Form.Item>
            </>
          )}

          {meta && <Alert type="info" showIcon title={`${meta.name} 上报方式`} description={meta.inboundHint} />}
        </Form>
      )}

      {step === 1 && (
        <div>
          <SectionLabel>从模板开始</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {TEMPLATES.map((t) => (
              <Tile
                key={t.id}
                active={templateId === t.id}
                onClick={() => applyTemplate(t.id)}
                label={t.name}
                desc={t.hint}
              />
            ))}
          </div>

          <SectionLabel
            extra={
              <Button
                size="small"
                type="text"
                icon={<IconPlus size={14} />}
                onClick={() =>
                  setProps((prev) => [...prev, { key: "", name: "", dataType: "number", path: "", access: "r" }])
                }
              >
                添加
              </Button>
            }
          >
            属性（会上报 / 可被控制的状态）
          </SectionLabel>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {props.map((p, i) => (
              /* Copilot 生成/扩展的属性卡 → 整卡外圈光圈（tone="card" 跟到 16 圆角） */
              <AiGlow key={i} tone="card" on={aiFilled.props}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: 12,
                    borderRadius: ACCESS_RADIUS.card,
                    border: "1px solid var(--set-card-border)",
                    background: "var(--set-card-bg)",
                  }}
                >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Input
                    size="small"
                    placeholder="标识 temperature"
                    value={p.key}
                    onChange={(e) => updateProp(i, { key: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <Input
                    size="small"
                    placeholder="中文名 温度"
                    value={p.name}
                    onChange={(e) => updateProp(i, { name: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<IconDelete size={14} />}
                    aria-label="删除属性"
                    onClick={() => setProps((prev) => prev.filter((_, idx) => idx !== i))}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Select
                    size="small"
                    style={{ width: 92 }}
                    value={p.dataType}
                    onChange={(v: DraftProp["dataType"]) => updateProp(i, { dataType: v })}
                    options={[
                      { label: "数值", value: "number" },
                      { label: "布尔", value: "boolean" },
                      { label: "文本", value: "string" },
                      { label: "枚举", value: "enum" },
                    ]}
                  />
                  <Input
                    size="small"
                    style={{ width: 76 }}
                    placeholder="单位"
                    value={p.unit}
                    onChange={(e) => updateProp(i, { unit: e.target.value })}
                  />
                  <Input
                    size="small"
                    style={{ width: 168 }}
                    placeholder="上报字段 temperature"
                    value={p.path}
                    onChange={(e) => updateProp(i, { path: e.target.value })}
                  />
                  <Select
                    size="small"
                    style={{ width: 92 }}
                    value={p.access}
                    onChange={(v: DraftProp["access"]) => updateProp(i, { access: v })}
                    options={[
                      { label: "只读", value: "r" },
                      { label: "可读写", value: "rw" },
                      { label: "只写", value: "w" },
                    ]}
                  />
                  <InputNumber
                    size="small"
                    style={{ width: 108 }}
                    placeholder="换算除数"
                    value={p.scale}
                    onChange={(v) => updateProp(i, { scale: v === null ? undefined : Number(v) })}
                  />
                </div>
                </div>
              </AiGlow>
            ))}
            {props.length === 0 && (
              <div
                style={{
                  padding: 16,
                  textAlign: "center",
                  fontSize: 12,
                  color: "var(--set-text-secondary)",
                  borderRadius: ACCESS_RADIUS.card,
                  border: "1px dashed var(--set-card-border)",
                }}
              >
                还没有属性。至少添加一个，否则平台不知道该收什么数据。
              </div>
            )}
            <div style={{ fontSize: 11.5, lineHeight: "17px", color: "var(--set-text-tertiary)" }}>
              换算除数：原始值 ÷ 除数 = 真实值（设备报 235、想要 23.5 就填 10）
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <Collapsible title="动作（可选）" hint={actionsParseError ? "JSON 有误" : `${thingModel.actions.length} 个`}>
              <div style={{ paddingTop: 12 }}>
                <Input.TextArea
                  rows={5}
                  value={actionsJson}
                  onChange={(e) => setActionsJson(e.target.value)}
                  style={{ fontFamily: "var(--ant-font-family-code)", fontSize: 12 }}
                  placeholder={'[{"key":"turn_on","name":"开启","params":[],"transport":{"payload":"{\\"power\\":true}"}}]'}
                />
                <div style={{ marginTop: 8, fontSize: 11.5, lineHeight: "17px", color: "var(--set-text-tertiary)" }}>
                  参数 params 支持 required / min / max；transport 可指定 topic / url / payload 模板（{"{{value}}"}、
                  {"{{params.x}}"}、{"{{device.external_id}}"}）。留空则用设备的「下发 topic」+ 自动报文。
                </div>
                {actionsParseError && (
                  <div style={{ marginTop: 6, fontSize: 11.5, color: "#DC2626" }}>{actionsParseError}</div>
                )}
              </div>
            </Collapsible>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: "10px 12px",
              borderRadius: ACCESS_RADIUS.card,
              background: "var(--set-subcard-bg)",
              border: "1px solid var(--set-subcard-border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <span style={{ color: "var(--set-text-secondary)" }}>物模型校验</span>
              {validation.ok ? (
                <Tag color="green">通过</Tag>
              ) : (
                <Tag color="red">{validation.issues.filter((i) => i.level === "error").length} 个错误</Tag>
              )}
              {validation.issues.filter((i) => i.level === "warning").length > 0 && (
                <Tag color="orange">{validation.issues.filter((i) => i.level === "warning").length} 个提醒</Tag>
              )}
            </div>
            {validation.issues.length > 0 && (
              <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 11.5, lineHeight: "18px", color: "var(--set-text-secondary)" }}>
                {validation.issues.slice(0, 5).map((i, idx) => (
                  <li key={idx} style={i.level === "error" ? { color: "#DC2626" } : undefined}>
                    {i.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <Alert type="error" showIcon title={error} style={{ marginTop: 14 }} />}
        </div>
      )}

      {step === 2 && created && (
        <div>
          <Alert
            type="success"
            showIcon
            title={`设备「${created.name}」已接入`}
            description={
              connection?.protocol === "modbus_tcp"
                ? "Modbus 设备由平台主动读写，不需要上报地址；可直接在设备清单里下发动作。"
                : "把下面的地址填到设备 / 网关的上报配置里，或让它在同一个 topic 上发数据。"
            }
          />

          {connection?.protocol !== "modbus_tcp" && (
            <>
              <SectionLabel
                extra={
                  <Button size="small" type="text" icon={<IconCopy size={13} />} onClick={() => copy(ingestUrl, "上报地址")}>
                    复制
                  </Button>
                }
              >
                上报地址（HTTP）
              </SectionLabel>
              <div
                style={{
                  wordBreak: "break-all",
                  borderRadius: ACCESS_RADIUS.card,
                  background: "var(--acc-code-bg)",
                  padding: "10px 12px",
                  fontFamily: "var(--ant-font-family-code)",
                  fontSize: 12,
                  color: "#34D399",
                }}
              >
                {ingestUrl}
              </div>
              <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--set-text-tertiary)" }}>
                这个地址带设备专属凭证，泄露后可在设备详情里「重置凭证」立即作废。
              </div>

              <SectionLabel
                extra={
                  <Button size="small" type="text" icon={<IconCopy size={13} />} onClick={() => copy(sample, "示例报文")}>
                    复制
                  </Button>
                }
              >
                示例报文
              </SectionLabel>
              <pre
                style={{
                  margin: 0,
                  overflowX: "auto",
                  borderRadius: ACCESS_RADIUS.card,
                  background: "var(--acc-code-bg)",
                  padding: "10px 12px",
                  fontFamily: "var(--ant-font-family-code)",
                  fontSize: 12,
                  color: "var(--acc-code-text)",
                }}
              >
                {sample}
              </pre>

              <SectionLabel
                extra={
                  <Button size="small" type="text" icon={<IconCopy size={13} />} onClick={() => copy(curl, "自测命令")}>
                    复制
                  </Button>
                }
              >
                自测命令
              </SectionLabel>
              <pre
                style={{
                  margin: 0,
                  overflowX: "auto",
                  borderRadius: ACCESS_RADIUS.card,
                  background: "var(--acc-code-bg)",
                  padding: "10px 12px",
                  fontFamily: "var(--ant-font-family-code)",
                  fontSize: 11.5,
                  color: "var(--acc-code-text)",
                }}
              >
                {curl}
              </pre>
            </>
          )}

          {connection?.protocol === "mqtt" && (
            <Alert style={{ marginTop: 14 }} type="info" showIcon title="MQTT 设备无需上报地址" description={meta?.inboundHint} />
          )}
        </div>
      )}
    </AccessModal>
  )
}
