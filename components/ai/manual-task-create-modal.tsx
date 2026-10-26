"use client"

import { useState, useEffect } from "react"
import { Modal, Form, Input, Select, InputNumber, Segmented, Radio, theme } from "antd"
import { toast } from "@/lib/ui/feedback"
import { IconLight, IconRemind, IconThunderbolt, IconTime } from "@/components/icon";

const { TextArea } = Input

export type ScheduleMode = "delay" | "cron"

export interface ManualTaskFormData {
  title: string
  mode: ScheduleMode
  /** 延时秒数（mode=delay 时使用） */
  delay_seconds?: number
  /** Cron 表达式（mode=cron 时使用） */
  cron?: string
  task_action: "toggle_relay" | "set_led" | "agent_analysis" | "user_reminder"
  device?: number
  value?: 0 | 1
  params?: any
}

interface ManualTaskCreateModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  /** 编辑模式：传入要编辑的任务 */
  editingTask?: {
    id: number
    title: string
    cron_expression?: string | null
    execute_at?: number | null
    action_type: "relay" | "led" | "agent" | "reminder"
    device_id?: number
    params: any
  } | null
}

const DEVICE_OPTIONS = [
  { label: "灌溉水泵 (5)", value: 5 },
  { label: "通风风扇 (6)", value: 6 },
  { label: "补光灯 (7)", value: 7 },
  { label: "白光灯 (8)", value: 8 },
]

const ACTION_OPTIONS = [
  { label: "设备开关", value: "toggle_relay", icon: <IconThunderbolt /> },
  { label: "智能分析", value: "agent_analysis", icon: <IconTime /> },
  { label: "定时提醒", value: "user_reminder", icon: <IconRemind /> },
  { label: "调节灯光", value: "set_led", icon: <IconLight /> },
]

const CRON_PRESETS = [
  { label: "每天 8:00", value: "0 8 * * *" },
  { label: "每天 18:00", value: "0 18 * * *" },
  { label: "每 2 小时", value: "0 */2 * * *" },
  { label: "工作日 9:00", value: "0 9 * * 1-5" },
  { label: "每小时整点", value: "0 * * * *" },
]

const DELAY_PRESETS = [
  { label: "5 分钟", value: 300 },
  { label: "30 分钟", value: 1800 },
  { label: "1 小时", value: 3600 },
  { label: "3 小时", value: 10800 },
]

const safeJsonParse = (s: any) => {
  if (!s) return {}
  if (typeof s === "object") return s
  try { return JSON.parse(s) } catch { return {} }
}

const mapActionToForm = (action: "relay" | "led" | "agent" | "reminder"): ManualTaskFormData["task_action"] => {
  switch (action) {
    case "relay": return "toggle_relay"
    case "led": return "set_led"
    case "agent": return "agent_analysis"
    case "reminder": return "user_reminder"
  }
}

export function ManualTaskCreateModal({ open, onClose, onSuccess, editingTask }: ManualTaskCreateModalProps) {
  const [form] = Form.useForm<ManualTaskFormData>()
  const [submitting, setSubmitting] = useState(false)
  const { token } = theme.useToken()
  const taskAction = Form.useWatch("task_action", form)
  const mode = Form.useWatch("mode", form)
  const isEdit = !!editingTask

  // 重置/初始化表单
  useEffect(() => {
    if (!open) return
    if (editingTask) {
      const params = typeof editingTask.params === "string" ? safeJsonParse(editingTask.params) : (editingTask.params || {})
      const isCron = !!editingTask.cron_expression
      form.setFieldsValue({
        title: editingTask.title,
        mode: isCron ? "cron" : "delay",
        task_action: mapActionToForm(editingTask.action_type),
        cron: editingTask.cron_expression || "0 8 * * *",
        delay_seconds: editingTask.execute_at
          ? Math.max(1, Math.round((editingTask.execute_at - Date.now()) / 1000))
          : 300,
        device: editingTask.device_id ?? 5,
        value: (params?.value ?? 1) as 0 | 1,
        params,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({
        title: "",
        mode: "delay",
        task_action: "user_reminder",
        delay_seconds: 300,
        cron: "0 8 * * *",
        device: 5,
        value: 1,
      })
    }
  }, [open, editingTask, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      // 构造 API 请求体
      const body: any = {
        title: values.title,
        action_type:
          values.task_action === "toggle_relay" ? "relay" :
          values.task_action === "set_led" ? "led" :
          values.task_action === "agent_analysis" ? "agent" :
          values.task_action === "user_reminder" ? "reminder" : values.task_action,
        params: {},
      }

      if (values.mode === "delay") {
        if (!values.delay_seconds || values.delay_seconds < 1) {
          toast.error("延时时长必须大于 0")
          setSubmitting(false)
          return
        }
        body.execute_at = Date.now() + values.delay_seconds * 1000
      } else {
        if (!values.cron) {
          toast.error("请填写 Cron 表达式")
          setSubmitting(false)
          return
        }
        body.cron_expression = values.cron
      }

      if (values.task_action === "toggle_relay") {
        if (!values.device) {
          toast.error("请选择设备")
          setSubmitting(false)
          return
        }
        body.device_id = values.device
        body.params = { value: values.value ?? 1 }
      } else if (values.task_action === "set_led") {
        body.params = values.params || { r: 255, g: 255, b: 255, w: 0 }
      }

      let res: Response
      if (isEdit && editingTask) {
        res = await fetch("/api/scheduler/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingTask.id, ...body }),
        })
      } else {
        res = await fetch("/api/scheduler/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || (isEdit ? "更新失败" : "创建失败"))
      }

      toast.success(isEdit ? "定时任务已更新" : "定时任务已创建", { description: values.title })
      onSuccess?.()
      onClose()
    } catch (e: any) {
      if (e?.errorFields) return // 表单校验错误
      toast.error(e?.message || (isEdit ? "更新失败" : "创建失败"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={isEdit ? "编辑定时任务" : "手动创建定时任务"}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      okText={isEdit ? "保存" : "创建"}
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnClose
      width={520}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="title"
          label="任务名称"
          rules={[{ required: true, message: "请输入任务名称" }, { max: 50, message: "名称过长" }]}
        >
          <Input placeholder="例如：每天早上8点浇水" />
        </Form.Item>

        <Form.Item name="task_action" label="任务类型" rules={[{ required: true }]}>
          <Select options={ACTION_OPTIONS} optionRender={(option) => (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {option.data.icon}{option.label}
            </span>
          )} />
        </Form.Item>

        <Form.Item name="mode" label="触发方式" rules={[{ required: true }]}>
          <Segmented
            options={[
              { label: "延时执行", value: "delay" },
              { label: "周期执行 (Cron)", value: "cron" },
            ]}
            block
          />
        </Form.Item>

        {mode === "delay" ? (
          <Form.Item
            name="delay_seconds"
            label="延时时长（秒）"
            rules={[{ required: true, message: "请输入延时时长" }]}
            extra={
              <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                {DELAY_PRESETS.map(p => (
                  <a
                    key={p.value}
                    onClick={() => form.setFieldValue("delay_seconds", p.value)}
                    style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: token.borderRadiusSM,
                      background: token.colorFillQuaternary,
                      color: token.colorPrimary,
                    }}
                  >
                    {p.label}
                  </a>
                ))}
              </div>
            }
          >
            <InputNumber min={1} max={86400} style={{ width: "100%" }} placeholder="例如：300 表示 5 分钟后" />
          </Form.Item>
        ) : (
          <Form.Item
            name="cron"
            label="Cron 表达式"
            rules={[{ required: true, message: "请填写 Cron 表达式" }]}
            extra={
              <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                {CRON_PRESETS.map(p => (
                  <a
                    key={p.value}
                    onClick={() => form.setFieldValue("cron", p.value)}
                    style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: token.borderRadiusSM,
                      background: token.colorFillQuaternary,
                      color: token.colorPrimary,
                    }}
                  >
                    {p.label}
                  </a>
                ))}
              </div>
            }
          >
            <Input placeholder="格式：分 时 日 月 周 (例如：0 8 * * * = 每天8:00)" style={{ fontFamily: "monospace" }} />
          </Form.Item>
        )}

        {taskAction === "toggle_relay" && (
          <>
            <Form.Item name="device" label="目标设备" rules={[{ required: true, message: "请选择设备" }]}>
              <Select options={DEVICE_OPTIONS} />
            </Form.Item>
            <Form.Item name="value" label="设备状态" rules={[{ required: true }]}>
              <Radio.Group>
                <Radio.Button value={1}>开启</Radio.Button>
                <Radio.Button value={0}>关闭</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </>
        )}

        {taskAction === "user_reminder" && (
          <Form.Item name={["params", "content"]} label="提醒内容（可选）">
            <TextArea rows={2} placeholder="提醒的具体内容，留空则使用任务名称" />
          </Form.Item>
        )}

        {taskAction === "set_led" && (
          <div style={{ display: "flex", gap: 8 }}>
            <Form.Item name={["params", "r"]} label="R" style={{ flex: 1 }}>
              <InputNumber min={0} max={255} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name={["params", "g"]} label="G" style={{ flex: 1 }}>
              <InputNumber min={0} max={255} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name={["params", "b"]} label="B" style={{ flex: 1 }}>
              <InputNumber min={0} max={255} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name={["params", "w"]} label="W" style={{ flex: 1 }}>
              <InputNumber min={0} max={255} style={{ width: "100%" }} />
            </Form.Item>
          </div>
        )}
      </Form>
    </Modal>
  )
}
