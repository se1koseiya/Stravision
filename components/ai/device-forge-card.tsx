"use client"

import React, { useEffect, useRef, useSyncExternalStore } from "react"
import {
  CheckCircle2, AlertTriangle, ChevronDown, Loader2, Cpu, PlugZap,
  Send, Trash2, Plus, ExternalLink, Pencil,
} from "lucide-react"
import {
  Alert, Button, Card, Flex, Input, InputNumber, Select, Skeleton, Space, Spin, Steps, Tag, Typography, theme,
} from "antd"
import { deviceForgeStore, type DeviceForgeCardData, type DeviceForgeSnapshot, type ForgeDraftForm, type ForgeDraftMetric } from "@/lib/state/device-forge-store"
export { parseDeviceForgeCardData } from "@/lib/state/device-forge-store"

/**
 * DeviceForgeCard — AI 输出 <DEVICE_FORGE> 标签时的设备接入表单卡片（Ant Design 实现）
 *
 * 三段式交互（生成草稿 → 用户编辑确认 → 装入平台 / 发布技能工坊）：
 *   1. 顶部：识别摘要 + 四段步骤时间线，失败原因逐条红显（用户能看到卡在哪一步、为什么）
 *   2. 中部：可编辑接入表单（ForgeFormFields，与右侧面板共用同一组件与 store）
 *   3. 底部：「装入莓小智」→ POST /api/devices 落库；「发布技能工坊」→ usageDoc 交给 AI
 *
 * 排版基调（v2 反拥挤）：16px 网格、控件默认高度(32px)、正文 13px、行高 1.6，
 * 区块间 14~16px 留白 —— 消息流内紧凑但不过度压缩。
 */

const TYPE_LABELS: Record<string, string> = { relay: '继电器', sensor: '传感器', camera: '摄像头', stepper: '位控电机' }
const TYPE_OPTIONS: Array<{ v: string; label: string }> = [
  { v: 'sensor', label: '传感器（上报数据）' },
  { v: 'relay', label: '继电器（开关控制）' },
  { v: 'camera', label: '摄像头' },
  { v: 'stepper', label: '位控电机' },
]

export function useDeviceForgeSnapshot(): DeviceForgeSnapshot {
  return useSyncExternalStore(deviceForgeStore.subscribe, deviceForgeStore.getSnapshot)
}

/** 标题文字：卡片头部设备名（超长省略，不挤掉右侧状态） */
function TitleText({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden' }}>
      <Typography.Text strong ellipsis style={{ fontSize: 13.5, lineHeight: '20px', color }}>
        {children}
      </Typography.Text>
    </span>
  )
}

/** 生成过程步骤时间线（antd Steps · 供卡片/面板复用） */
export function ForgeStepsTimeline({ steps }: { steps: DeviceForgeSnapshot['steps'] }) {
  const { token } = theme.useToken()
  if (!steps.length) return null

  const items = steps.map(s => {
    const isFail = s.state === 'fail'
    const isWarn = s.state === 'warn'
    const isRun = s.state === 'running'
    const status = isFail ? 'error' as const : (isRun ? 'process' as const : 'finish' as const)
    const icon = isRun
      ? <Loader2 size={14} className="animate-spin" style={{ color: token.colorPrimary }} />
      : isWarn
        ? <AlertTriangle size={14} style={{ color: token.colorWarning }} />
        : undefined
    return {
      key: s.id,
      status,
      icon,
      title: (
        <span style={{ display: 'block', marginTop: -1 }}>
          <Typography.Text
            style={{ fontSize: 13, fontWeight: 600, lineHeight: '20px' }}
            type={isFail ? 'danger' : undefined}
          >
            {s.label}
          </Typography.Text>
        </span>
      ),
      description: (
        <Typography.Text
          type="secondary"
          style={{
            fontSize: 12, lineHeight: '20px',
            color: isFail ? token.colorError : isWarn ? token.colorWarning : undefined,
            display: 'block', marginTop: 1,
          }}
        >
          {s.detail}
        </Typography.Text>
      ),
    }
  })

  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${token.colorSplit}`,
        background: token.colorFillQuaternary,
        padding: '14px 16px',
      }}
    >
      <Steps size="small" direction="vertical" items={items} />
    </div>
  )
}

/** 小节标题（antd 风格 caption） */
function SectionCaption({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  const { token } = theme.useToken()
  return (
    <Flex align="center" gap={6} style={{ fontSize: 12, color: token.colorTextTertiary, fontWeight: 600, letterSpacing: '0.01em' }}>
      {icon}
      <span>{children}</span>
    </Flex>
  )
}

/** 字段单元：label + 控件（模块级，避免渲染中创建组件） */
function FormField({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <Flex vertical gap={6} style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: '16px' }}>{label}</Typography.Text>
      {children}
    </Flex>
  )
}

/**
 * ForgeFormFields — 可编辑接入配置表单（基础 + 数据点映射 + 高级 config）。
 * 卡片与右侧面板共用；编辑全部走 store.patchForm 实现双向同步。
 */
export function ForgeFormFields({
  form,
  onPatch,
}: {
  form: ForgeDraftForm
  onPatch: (f: ForgeDraftForm) => void
}) {
  const { token } = theme.useToken()
  const patchMetric = (idx: number, field: keyof ForgeDraftMetric, value: string | number | undefined) => {
    const metrics = form.metrics ? form.metrics.map((m, i) => (i === idx ? { ...m } : { ...m })) : []
    const target = metrics[idx]
    if (field === 'scale') target.scale = value === '' || value === undefined ? undefined : Number(value)
    else (target as Record<string, unknown>)[field] = String(value ?? '')
    onPatch({ ...form, metrics })
  }

  const fullWidth: React.CSSProperties = { width: '100%' }

  return (
    <Flex vertical gap={16}>
      {/* 基础字段 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px 14px' }}>
        <FormField label="设备名称 *">
          <Input value={form.name} style={fullWidth} onChange={e => onPatch({ ...form, name: e.target.value })} placeholder="如：CO2浓度传感器" />
        </FormField>
        <FormField label="类型">
          <Select style={fullWidth} value={form.type} onChange={v => onPatch({ ...form, type: v as ForgeDraftForm['type'] })} options={TYPE_OPTIONS.map(o => ({ value: o.v, label: o.label }))} />
        </FormField>
        <FormField label="分类">
          <Input value={form.category} style={fullWidth} onChange={e => onPatch({ ...form, category: e.target.value })} placeholder="环境监测 / 灌溉…" />
        </FormField>
        <FormField label="节点标识 node_id">
          <Input value={form.node_id || ''} style={fullWidth} onChange={e => onPatch({ ...form, node_id: e.target.value })} placeholder="如 node0601（可选）" />
        </FormField>
        {form.type === 'sensor' && (
          <FormField label="订阅 topic（上行数据） *" wide>
            <Input value={form.subscribe_topic || ''} style={fullWidth} onChange={e => onPatch({ ...form, subscribe_topic: e.target.value })} placeholder="如 dev/co2/sensor/data" />
          </FormField>
        )}
        {(form.type === 'relay' || form.type === 'stepper') && (
          <>
            <FormField label="下行控制 topic *" wide>
              <Input value={form.publish_topic || ''} style={fullWidth} onChange={e => onPatch({ ...form, publish_topic: e.target.value })} placeholder="如 data/set" />
            </FormField>
            {form.type === 'relay' && (
              <FormField label="继电器通道号 relay_num">
                <InputNumber min={0} style={fullWidth} value={form.relay_num ?? null} onChange={v => onPatch({ ...form, relay_num: v === null ? undefined : Number(v) })} placeholder="如 5" />
              </FormField>
            )}
          </>
        )}
      </div>

      {/* 数据点映射表（sensor） */}
      {form.type === 'sensor' && (
        <div style={{ borderTop: `1px dashed ${token.colorSplit}`, paddingTop: 14 }}>
          <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>数据点映射（metrics → 报文字段）</Typography.Text>
            <Button type="link" size="small" icon={<Plus size={13} />} style={{ padding: 0, height: 'auto', fontSize: 12.5 }}
              onClick={() => onPatch({ ...form, metrics: [...(form.metrics || []), { key: '', label: '', unit: '', mqtt_field: '' }] })}>
              添加数据点
            </Button>
          </Flex>
          <Flex vertical gap={10}>
            {(form.metrics || []).map((m, i) => (
              <Space.Compact key={i} block>
                <Input style={{ width: '22%' }} value={m.key} placeholder="key" onChange={e => patchMetric(i, 'key', e.target.value)} />
                <Input style={{ width: '26%' }} value={m.label} placeholder="中文名" onChange={e => patchMetric(i, 'label', e.target.value)} />
                <Input style={{ width: '16%' }} value={m.unit} placeholder="单位" onChange={e => patchMetric(i, 'unit', e.target.value)} />
                <Input style={{ width: '30%' }} value={m.mqtt_field} placeholder="报文字段 data.t" onChange={e => patchMetric(i, 'mqtt_field', e.target.value)} />
                <Button type="text" danger icon={<Trash2 size={14} />} aria-label="删除数据点" onClick={() => onPatch({ ...form, metrics: (form.metrics || []).filter((_, j) => j !== i) })} />
              </Space.Compact>
            ))}
            {(form.metrics || []).length === 0 && (
              <Typography.Text type="secondary" style={{ fontSize: 12.5 }}>暂无数据点，点击「添加数据点」定义上报字段映射</Typography.Text>
            )}
          </Flex>
        </div>
      )}

      {/* 高级 config */}
      <details style={{ borderTop: `1px dashed ${token.colorSplit}`, paddingTop: 10 }}>
        <summary style={{ cursor: 'pointer', userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6, color: token.colorTextTertiary, fontSize: 12, fontWeight: 500 }}>
          <ChevronDown size={12} />
          其他参数（config JSON，可选）
        </summary>
        <div style={{ marginTop: 12 }}>
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 8 }}
            style={{ fontSize: 12, lineHeight: '20px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
            value={JSON.stringify(form.extra_config || {}, null, 2)}
            onChange={e => {
              try {
                const parsed = e.target.value.trim() ? JSON.parse(e.target.value) : {}
                onPatch({ ...form, extra_config: parsed })
              } catch { /* JSON 不完整时静默，不打断输入 */ }
            }}
            placeholder='{"命令前缀": "prefix", ...}'
          />
        </div>
      </details>
    </Flex>
  )
}

/** 行动逻辑：装入平台 / 发布技能（卡片与面板共用；执行状态存 store 双向同步） */
export function useDeviceForgeActions(data: DeviceForgeCardData, onSendMessage?: (text: string) => void) {
  const snap = useDeviceForgeSnapshot()
  const { installStatus, installedDevice } = snap
  const installingBool = installStatus === 'loading'
  const installedBool = installStatus === 'success' && !!installedDevice
  const errorStr = installStatus === 'error' ? snap.installError : null

  const validateForm = (form: ForgeDraftForm): string | null => {
    if (!form) return '配置为空，请先生成接入配置'
    if (!form.name.trim()) return '设备名称不能为空'
    if (form.type === 'sensor') {
      if (!form.subscribe_topic?.trim()) return '传感器需要填写订阅 topic（设备上报数据的主题）'
      if (!form.metrics || form.metrics.length === 0) return '传感器至少需要 1 个数据点映射'
      const empty = form.metrics.find(m => !m.key.trim() || !m.mqtt_field.trim())
      if (empty) return `数据点「${empty.label || empty.key}」缺少 key 或报文取值字段 mqtt_field`
      const dup = form.metrics.find((m, i) => form.metrics!.findIndex(x => x.key === m.key) !== i)
      if (dup) return `数据点 key「${dup.key}」重复，请改为唯一标识`
    }
    if ((form.type === 'relay' || form.type === 'stepper') && !form.publish_topic?.trim()) {
      return '开关/位控设备需要填写下行控制 topic'
    }
    return null
  }

  const handleInstall = async (form: ForgeDraftForm) => {
    deviceForgeStore.setInstall('idle')
    const err = validateForm(form)
    if (err) { deviceForgeStore.setInstall('error', { error: err }); return }
    deviceForgeStore.setInstall('loading')
    try {
      const extra: Record<string, unknown> = { ...(form.extra_config || {}) }
      if (form.type === 'sensor') {
        extra.metrics = form.metrics || []
        extra.use_legacy_table = false
      } else if (form.type === 'relay') {
        extra.relay_num = form.relay_num ?? 0
      }
      const body = {
        name: form.name.trim(),
        type: form.type,
        category: form.category || '通用',
        icon: form.icon || 'Cpu',
        color: form.color || '#1677ff',
        subscribe_topic: form.subscribe_topic?.trim() || undefined,
        publish_topic: form.publish_topic?.trim() || undefined,
        node_id: form.node_id?.trim() || undefined,
        config: extra,
        is_enabled: true,
      }
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try { msg = (await res.json())?.error || msg } catch { /* ignore */ }
        if (res.status === 403) msg = '需要管理员权限才能装入设备（admin/super_admin）'
        if (res.status === 401) msg = '登录已过期，请刷新页面后重试'
        deviceForgeStore.setInstall('error', { error: msg })
        return
      }
      const json = await res.json()
      const device = json?.device
      deviceForgeStore.setInstall('success', { device: { id: device?.id ?? 0, name: device?.name || form.name } })
      // 广播给 DeviceProvider 刷新设备列表 → 各页面立即出现新设备卡片
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('berry:devices-changed'))
      }
    } catch (e) {
      deviceForgeStore.setInstall('error', { error: e instanceof Error ? e.message : '装入失败，请重试' })
    }
  }

  const handlePublishSkill = () => {
    if (!onSendMessage || !data.usageDoc) return false
    onSendMessage(
      `请把以下「设备接入能力说明」发布到技能工坊（调用 create_skill_from_doc，把这段说明作为文档输入），让 AI 助手学会该设备：\n\n${data.usageDoc}`
    )
    return true
  }

  return { installing: installingBool, installed: installedBool, actionError: errorStr, handleInstall, handlePublishSkill }
}

/** 主卡片组件（antd Card · 宽松排版） */
export function DeviceForgeCard({
  data,
  onSendMessage,
}: {
  data: DeviceForgeCardData
  onSendMessage?: (text: string) => void
}) {
  const { token } = theme.useToken()
  const snap = useDeviceForgeSnapshot()
  const form = snap.form
  const signatureRef = useRef('')
  const actions = useDeviceForgeActions(data, onSendMessage)

  // 注册到全局 store：同一会话签名（内容未变化）不覆盖编辑中的表单
  const sig = `${data.status}:${data.draft?.name || ''}:${data.draft?.subscribe_topic || ''}:${data.draft?.metrics?.length ?? -1}:${data.subject || ''}`
  useEffect(() => {
    if (signatureRef.current === sig) return
    signatureRef.current = sig
    if (data.draft) deviceForgeStore.registerCard(sig, data)
  }, [sig, data])

  // —— 无草稿（生成失败 / 信息不足未产出表单）——
  if (!form || !data.draft) {
    return (
      <Card
        variant="outlined"
        className="forge-card my-3"
        styles={{ body: { padding: '16px 20px' } }}
        title={
          <Flex align="center" gap={8}>
            <Cpu size={15} style={{ color: token.colorTextTertiary }} />
            <Typography.Text strong style={{ fontSize: 13.5 }}>设备接入</Typography.Text>
          </Flex>
        }
        extra={<Tag color={data.status === 'failed' ? 'error' : 'warning'} style={{ marginInlineEnd: 0 }}>{data.status === 'failed' ? '生成失败' : '待配置'}</Tag>}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 0, whiteSpace: 'pre-wrap' }}>
          {data.error || '未生成有效的接入配置'}
        </Typography.Paragraph>
      </Card>
    )
  }

  const { installing, installed, actionError, handleInstall, handlePublishSkill } = actions
  const installedDeviceName = snap.installedDevice?.name
  const hasIssues = data.issues.some(i => i.level === 'error') || (data.dryRun?.metrics || []).some(m => !m.ok)

  return (
    <Card
      variant="outlined"
      className="forge-card my-3"
      styles={{ body: { padding: '16px 20px 18px' } }}
      title={
        <Flex align="center" gap={10}>
          <Cpu size={15} style={{ color: token.colorPrimary, flexShrink: 0 }} />
          <TitleText>{data.subject ? `接入设备 · ${data.subject}` : '设备接入'}</TitleText>
          <Tag color="blue" style={{ marginInlineEnd: 0, flexShrink: 0, fontSize: 11, lineHeight: '18px', paddingInline: 8 }}>
            {TYPE_LABELS[data.draft.type] || data.draft.type}
          </Tag>
        </Flex>
      }
      extra={
        installed ? (
          <Tag color="success" icon={<CheckCircle2 size={12} />} style={{ marginInlineEnd: 0 }}>已装入平台</Tag>
        ) : (
          <Tag color={hasIssues ? 'error' : 'warning'} style={{ marginInlineEnd: 0 }}>{hasIssues ? '存在未达标项' : '草稿待确认'}</Tag>
        )
      }
    >
      <Flex vertical gap={16}>
        {data.description && (
          <Typography.Paragraph type="secondary" style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 0 }}>
            {data.description}
          </Typography.Paragraph>
        )}

        {/* 生成过程时间线 */}
        <ForgeStepsTimeline steps={snap.steps} />

        {/* 可编辑接入配置表单 */}
        <Flex vertical gap={8}>
          <SectionCaption icon={<Pencil size={12} />}>接入配置（可直接修改）</SectionCaption>
          <div style={{ borderRadius: 10, border: `1px solid ${token.colorSplit}`, padding: '16px', background: token.colorBgContainer }}>
            <ForgeFormFields form={form} onPatch={f => deviceForgeStore.patchForm(f)} />
          </div>
        </Flex>

        {/* 操作区 */}
        <Flex gap={10} wrap="wrap" align="center" style={{ paddingTop: 2 }}>
          <Button
            type="primary"
            icon={installed ? <CheckCircle2 size={14} /> : <PlugZap size={14} />}
            loading={installing}
            disabled={!!installed}
            onClick={() => handleInstall(form)}
            style={{ fontWeight: 600 }}
          >
            {installed ? '已装入莓小智' : installing ? '正在写入…' : '装入莓小智'}
          </Button>
          {onSendMessage && data.usageDoc && !installing && (
            <Button icon={<Send size={14} />} onClick={handlePublishSkill}>发布到技能工坊</Button>
          )}
          {!installed && onSendMessage && (
            <Button
              type="link"
              icon={<ExternalLink size={13} />}
              style={{ marginLeft: 'auto', fontSize: 12.5, color: token.colorTextTertiary }}
              onClick={() => deviceForgeStore.setPanelOpen(true)}
            >
              右侧面板查看编辑
            </Button>
          )}
        </Flex>

        {actionError && (
          <Alert type="error" showIcon message={<span style={{ fontSize: 12.5 }}>{actionError}</span>} />
        )}
        {installed && (
          <Alert
            type="success"
            showIcon
            message={
              <span style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                设备「{installedDeviceName || data.draft.name}」已写入平台设备注册表。刷新后可在 <b>设备控制 / 监控 / 数据看板</b> 看到它
                {data.draft.type === 'sensor' ? '；MQTT 订阅已即时生效，收到首条数据后即可出数' : ''}。
              </span>
            }
          />
        )}
      </Flex>
    </Card>
  )
}

/** 流式骨架（antd Skeleton · 未闭合 / 渲染前占位） */
export function DeviceForgeSkeleton() {
  return (
    <Card variant="outlined" className="forge-card my-3" styles={{ body: { padding: '20px' } }}>
      <Flex align="center" gap={8} style={{ marginBottom: 14 }}>
        <Spin size="small" />
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>AI 正在生成设备接入配置…</Typography.Text>
      </Flex>
      <Skeleton active title={false} paragraph={{ rows: 4 }} />
    </Card>
  )
}
