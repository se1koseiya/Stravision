"use client"

import { useState, useEffect } from "react"
import {
  Table,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Button,
  Tag,
  Space,
  Popconfirm,
  App,
  Card,
  ColorPicker,
  Typography
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { IconChartLine, IconCompass, IconCpu, IconDelete, IconFan, IconLight, IconPencil, IconPlus, IconRefresh, IconSun, IconThermometer, IconVideo, IconWater } from "@/components/icon";

const { Text } = Typography
const { TextArea } = Input

// ─── 类型定义 ───

type DeviceType = "relay" | "sensor" | "camera" | "stepper"

interface Device {
  id: number
  name: string
  type: DeviceType
  category: string
  subscribe_topic: string | null
  publish_topic: string | null
  node_id: string | null
  icon: string
  color: string
  config: Record<string, any>
  is_critical: boolean
  is_enabled: boolean
  sort_order: number
  created_at: number
  updated_at: number
}

interface FormValues {
  name: string
  type: DeviceType
  category: string
  subscribe_topic?: string
  publish_topic?: string
  node_id?: string
  icon: string
  is_critical: boolean
  is_enabled: boolean
  sort_order: number
  config: string
}

// ─── 常量 ───

const DEVICE_TYPE_OPTIONS: Array<{ value: DeviceType; label: string }> = [
  { value: "relay", label: "继电器 (Relay)" },
  { value: "sensor", label: "传感器 (Sensor)" },
  { value: "camera", label: "摄像头 (Camera)" },
  { value: "stepper", label: "步进电机 (Stepper)" }
]

const TYPE_TAG_COLOR: Record<DeviceType, string> = {
  relay: "blue",
  sensor: "green",
  camera: "purple",
  stepper: "orange"
}

const TYPE_LABEL: Record<DeviceType, string> = {
  relay: "继电器",
  sensor: "传感器",
  camera: "摄像头",
  stepper: "步进电机"
}

// 设备图标映射（lucide-react），未命中回退到 Cpu
const DEVICE_ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  IconWater,
  IconFan,
  IconLight,
  IconSun,
  IconThermometer,
  IconVideo,
  IconCompass,
  IconChartLine,
  Cpu
}

const DEFAULT_FORM: FormValues = {
  name: "",
  type: "relay",
  category: "",
  subscribe_topic: "",
  publish_topic: "",
  node_id: "",
  icon: "Cpu",
  is_critical: false,
  is_enabled: true,
  sort_order: 0,
  config: "{}"
}

// ─── 工具函数 ───

function formatTime(ts: number): string {
  if (!ts || isNaN(new Date(ts).getTime())) return "—"
  const d = new Date(ts < 1e12 ? ts * 1000 : ts)
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function renderDeviceIcon(iconName: string, color: string, box: number = 28) {
  const Icon = DEVICE_ICON_MAP[iconName] || IconCpu
  return (
    <div
      style={{
        width: box,
        height: box,
        borderRadius: 6,
        background: color || "#1677ff",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }}
    >
      <Icon size={Math.floor(box * 0.5)} strokeWidth={1.75} />
    </div>
  )
}

// ─── 组件 ───

export default function DeviceManager() {
  const { message } = App.useApp()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [color, setColor] = useState<string>("#1677ff")
  const [form] = Form.useForm<FormValues>()
  const typeValue = Form.useWatch("type", form) as DeviceType | undefined

  const fetchDevices = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/devices?includeDisabled=true")
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setDevices(Array.isArray(data.devices) ? data.devices : [])
    } catch (e: any) {
      console.error("[device-manager FETCH]", e)
      message.error(e.message || "加载设备列表失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue(DEFAULT_FORM)
    setColor("#1677ff")
    setModalOpen(true)
  }

  const handleEdit = (device: Device) => {
    setEditingId(device.id)
    form.setFieldsValue({
      name: device.name,
      type: device.type,
      category: device.category || "",
      subscribe_topic: device.subscribe_topic || "",
      publish_topic: device.publish_topic || "",
      node_id: device.node_id || "",
      icon: device.icon || "Cpu",
      is_critical: !!device.is_critical,
      is_enabled: !!device.is_enabled,
      sort_order: device.sort_order ?? 0,
      config: JSON.stringify(device.config || {}, null, 2)
    })
    setColor(device.color || "#1677ff")
    setModalOpen(true)
  }

  const handleSave = async () => {
    let values: FormValues
    try {
      values = await form.validateFields()
    } catch {
      // antd 校验失败，已由 Form 内联提示
      return
    }

    // 解析 config JSON
    let configObj: Record<string, any> = {}
    const configStr = (values.config || "").trim()
    if (configStr) {
      try {
        const parsed = JSON.parse(configStr)
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("config 必须是 JSON 对象")
        }
        configObj = parsed as Record<string, any>
      } catch (e: any) {
        console.error("[device-manager CONFIG PARSE]", e)
        message.error("config 不是合法的 JSON：" + (e.message || ""))
        return
      }
    }

    const payload = {
      name: (values.name || "").trim(),
      type: values.type,
      category: (values.category || "").trim() || "general",
      subscribe_topic: (values.subscribe_topic || "").trim() || undefined,
      publish_topic: (values.publish_topic || "").trim() || undefined,
      node_id: (values.node_id || "").trim() || undefined,
      icon: (values.icon || "").trim() || "Cpu",
      color,
      is_critical: values.type === "relay" ? !!values.is_critical : false,
      is_enabled: !!values.is_enabled,
      sort_order: values.sort_order ?? 0,
      config: configObj
    }

    setSaving(true)
    try {
      const url = editingId ? `/api/devices/${editingId}` : "/api/devices"
      const method = editingId ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      message.success(editingId ? "设备已更新" : "设备已创建")
      setModalOpen(false)
      fetchDevices()
    } catch (e: any) {
      console.error("[device-manager SAVE]", e)
      message.error(e.message || "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (device: Device) => {
    try {
      const res = await fetch(`/api/devices/${device.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      message.success(`已删除设备「${device.name}」`)
      fetchDevices()
    } catch (e: any) {
      console.error("[device-manager DELETE]", e)
      message.error(e.message || "删除失败")
    }
  }

  const handleToggleEnabled = async (device: Device, enabled: boolean) => {
    setTogglingId(device.id)
    try {
      const res = await fetch(`/api/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: enabled })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      message.success(`${device.name} 已${enabled ? "启用" : "禁用"}`)
      fetchDevices()
    } catch (e: any) {
      console.error("[device-manager TOGGLE]", e)
      message.error(e.message || "更新失败")
    } finally {
      setTogglingId(null)
    }
  }

  const columns: ColumnsType<Device> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 70,
      render: (id: number) => (
        <Text style={{ fontFamily: "monospace", fontSize: 12 }}>#{id}</Text>
      )
    },
    {
      title: "设备",
      key: "device",
      render: (_: unknown, record: Device) => (
        <Space size={10}>
          {renderDeviceIcon(record.icon, record.color)}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 500, lineHeight: 1.3, color: "#1F2329" }}>
              {record.name}
            </div>
            {record.category && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.category}
              </Text>
            )}
          </div>
        </Space>
      )
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 110,
      render: (type: DeviceType) => (
        <Tag color={TYPE_TAG_COLOR[type]}>{TYPE_LABEL[type]}</Tag>
      )
    },
    {
      title: "Node ID",
      dataIndex: "node_id",
      key: "node_id",
      width: 110,
      render: (nodeId: string | null) =>
        nodeId ? (
          <Text style={{ fontFamily: "monospace", fontSize: 12 }}>{nodeId}</Text>
        ) : (
          <Text type="disabled">—</Text>
        )
    },
    {
      title: "MQTT Topics",
      key: "topics",
      width: 230,
      render: (_: unknown, record: Device) => (
        <Space direction="vertical" size={2} style={{ minWidth: 0 }}>
          {record.subscribe_topic && (
            <div style={{ fontSize: 12 }}>
              <Text type="secondary">sub:</Text>{" "}
              <Text style={{ fontFamily: "monospace", fontSize: 12 }}>
                {record.subscribe_topic}
              </Text>
            </div>
          )}
          {record.publish_topic && (
            <div style={{ fontSize: 12 }}>
              <Text type="secondary">pub:</Text>{" "}
              <Text style={{ fontFamily: "monospace", fontSize: 12 }}>
                {record.publish_topic}
              </Text>
            </div>
          )}
          {!record.subscribe_topic && !record.publish_topic && (
            <Text type="disabled">—</Text>
          )}
        </Space>
      )
    },
    {
      title: "排序",
      dataIndex: "sort_order",
      key: "sort_order",
      width: 70,
      align: "center",
      render: (v: number) => (
        <Text style={{ fontFamily: "monospace" }}>{v}</Text>
      )
    },
    {
      title: "关键",
      dataIndex: "is_critical",
      key: "is_critical",
      width: 70,
      align: "center",
      render: (critical: boolean) =>
        critical ? (
          <Tag color="red" style={{ fontSize: 11 }}>
            关键
          </Tag>
        ) : (
          <Text type="disabled">—</Text>
        )
    },
    {
      title: "启用",
      dataIndex: "is_enabled",
      key: "is_enabled",
      width: 80,
      render: (enabled: boolean, record: Device) => (
        <Switch
          size="small"
          checked={enabled}
          loading={togglingId === record.id}
          onChange={(v) => handleToggleEnabled(record, v)}
        />
      )
    },
    {
      title: "更新时间",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 150,
      render: formatTime
    },
    {
      title: "操作",
      key: "actions",
      width: 110,
      align: "right",
      fixed: "right",
      render: (_: unknown, record: Device) => (
        <Space size={0}>
          <Button
            type="text"
            size="small"
            icon={<IconPencil size={14} strokeWidth={1.75} />}
            onClick={() => handleEdit(record)}
            title="编辑"
          />
          <Popconfirm
            title="删除设备"
            description={`确定要删除设备「${record.name}」吗？此操作不可恢复。`}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<IconDelete size={14} strokeWidth={1.75} />}
              title="删除"
            />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ border: "1px solid #EDEEEF" }} styles={{ body: { padding: 16 } }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 16
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#1F2329" }}>
              设备注册表
            </div>
            <div style={{ fontSize: 12, color: "#8F959E", marginTop: 2 }}>
              共 {devices.length} 台设备 · 启用 {devices.filter((d) => d.is_enabled).length} ·
              禁用 {devices.filter((d) => !d.is_enabled).length}
            </div>
          </div>
          <Space>
            <Button
              icon={<IconRefresh size={14} strokeWidth={1.75} />}
              onClick={fetchDevices}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<IconPlus size={14} strokeWidth={1.75} />}
              onClick={handleAdd}
            >
              新增设备
            </Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={devices}
          loading={loading}
          size="middle"
          pagination={{ pageSize: 20, showSizeChanger: false }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: "暂无设备，点击「新增设备」开始配置 IoT 设备注册表" }}
        />
      </Card>

      <Modal
        open={modalOpen}
        onCancel={() => !saving && setModalOpen(false)}
        title={
          <Space>
            <IconCpu size={16} strokeWidth={1.75} style={{ color: "#1677ff" }} />
            <span>{editingId ? "编辑设备" : "新增设备"}</span>
          </Space>
        }
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)} disabled={saving}>
            取消
          </Button>,
          <Button key="save" type="primary" loading={saving} onClick={handleSave}>
            保存
          </Button>
        ]}
        width={720}
        destroyOnHidden
        styles={{ body: { maxHeight: "70vh", overflowY: "auto", paddingTop: 8 } }}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Form.Item
              name="name"
              label="设备名称"
              rules={[{ required: true, message: "请输入设备名称" }]}
            >
              <Input placeholder="例如：水泵系统" maxLength={50} />
            </Form.Item>
            <Form.Item
              name="type"
              label="设备类型"
              rules={[{ required: true, message: "请选择设备类型" }]}
            >
              <Select options={DEVICE_TYPE_OPTIONS} placeholder="选择类型" />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Form.Item
              name="category"
              label="业务分类"
              tooltip="例如：灌溉 / 通风 / 照明 / 环境监测 / 视频监控"
            >
              <Input placeholder="例如 灌溉" maxLength={30} />
            </Form.Item>
            <Form.Item
              name="node_id"
              label="Node ID"
              tooltip="对应 MQTT node 映射，例如 node0601（继电器/步进电机常用）"
            >
              <Input placeholder="例如 node0601" style={{ fontFamily: "monospace" }} />
            </Form.Item>
          </div>

          {typeValue === "sensor" && (
            <Form.Item
              name="subscribe_topic"
              label="订阅 Topic (MQTT)"
              tooltip="传感器上报数据的 MQTT topic，由 MQTT 服务动态订阅"
            >
              <Input
                placeholder="例如 meimefarm/basic_env_data"
                style={{ fontFamily: "monospace" }}
              />
            </Form.Item>
          )}

          {(typeValue === "relay" || typeValue === "stepper") && (
            <Form.Item
              name="publish_topic"
              label="发布 Topic (MQTT)"
              tooltip="下发控制指令的 MQTT topic"
            >
              <Input
                placeholder="例如 data/set"
                style={{ fontFamily: "monospace" }}
              />
            </Form.Item>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16 }}>
            <Form.Item
              name="icon"
              label="图标名称"
              tooltip="lucide-react 图标名，如 Droplets / Fan / Lightbulb / Sun / Thermometer / Video / Compass"
            >
              <Input placeholder="例如 Droplets" />
            </Form.Item>
            <Form.Item label="颜色">
              <ColorPicker
                value={color}
                onChange={(c) => setColor(c.toHexString())}
                showText
                format="hex"
              />
            </Form.Item>
            <Form.Item name="sort_order" label="排序权重">
              <InputNumber min={0} max={9999} style={{ width: "100%" }} />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {typeValue === "relay" ? (
              <Form.Item
                name="is_critical"
                label="关键设备"
                valuePropName="checked"
                tooltip="关键继电器在执行前需要二次确认（CHECKPOINT）"
              >
                <Switch />
              </Form.Item>
            ) : (
              <div />
            )}
            <Form.Item
              name="is_enabled"
              label="启用状态"
              valuePropName="checked"
              tooltip="禁用后该设备不会出现在控制面板和 AI 工具列表中"
            >
              <Switch />
            </Form.Item>
          </div>

          <Form.Item
            name="config"
            label="配置 (JSON)"
            tooltip="类型相关配置：relay.relay_num / sensor.metrics[] / camera.stream_url / stepper.pulses_per_mm"
          >
            <TextArea
              placeholder={'{\n  "relay_num": 5\n}'}
              autoSize={{ minRows: 4, maxRows: 12 }}
              style={{ fontFamily: "monospace", fontSize: 12 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
