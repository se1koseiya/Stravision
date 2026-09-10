"use client"

import { useState, useEffect } from "react"
import {
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  Space,
  Upload,
  message,
  Typography,
  Divider,
  Row,
  Col,
  InputNumber
} from "antd"
import { UploadOutlined, PlusOutlined } from "@ant-design/icons"
import type { UploadProps } from "antd"
import { UserPublic } from "@/lib/db/user-service"
import { toast } from "sonner"

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserPublic | null
  currentUserRole: string
  onSuccess: () => void
}

const CONTROLS = [
  { id: "relay5", label: "Relay 5 (水泵)" },
  { id: "relay6", label: "Relay 6 (风扇)" },
  { id: "relay7", label: "Relay 7 (植物全光谱补光灯)" },
  { id: "relay8", label: "Relay 8 (光照植物补光灯)" },
  { id: "led1", label: "LED 1 (红)" },
  { id: "led2", label: "LED 2 (绿)" },
  { id: "led3", label: "LED 3 (蓝)" },
  { id: "led4", label: "LED 4 (白/亮度)" },
  { id: "stepper", label: "丝杆滑台 (摄像头云台)" }
]

/** 本月已用积分（周期不是当前月时视为 0，与 credit-service 的惰性重置一致） */
function monthlyUsedOf(user: UserPublic): number {
  const d = new Date()
  const cycle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  return user.credit_cycle_date === cycle ? (user.monthly_credit_used ?? 0) : 0
}

export function UserDialog({ open, onOpenChange, user, currentUserRole, onSuccess }: UserDialogProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [allowedControls, setAllowedControls] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      if (user) {
        form.setFieldsValue({
          username: user.username,
          email: user.email,
          password: undefined,
          role: user.role,
          membership: user.membership || "free",
          avatar_url: user.avatar_url || "",
          daily_ai_limit: user.daily_ai_limit ?? 10,
          ai_balance: user.ai_balance ?? 0,
          monthly_credit_quota: user.monthly_credit_quota ?? 0,
          credit_balance: user.credit_balance ?? 0
        })
        setAllowedControls(user.permissions?.allowedControls || [])
      } else {
        form.resetFields()
        form.setFieldsValue({ membership: "free", daily_ai_limit: 0, monthly_credit_quota: 0, credit_balance: 0 })
        setAllowedControls([])
      }
    }
  }, [user, open, form])

  const handleMembershipChange = (val: string) => {
    let limit = 0
    if (val === "free") limit = 0
    else if (val === "pro") limit = 70
    else if (val === "plus") limit = 999999
    form.setFieldValue("daily_ai_limit", limit)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const url = user ? `/api/admin/users/${user.id}` : "/api/admin/users"
      const method = user ? "PUT" : "POST"
      const body: any = {
        username: values.username,
        role: values.role,
        membership: values.membership,
        permissions: { allowedControls },
        daily_ai_limit: Number(values.daily_ai_limit) || 0,
        ai_balance: Number(values.ai_balance) || 0,
        monthly_credit_quota: Number(values.monthly_credit_quota) || 0,
        credit_balance: Number(values.credit_balance) || 0
      }
      if (!user && values.email) body.email = values.email
      if (values.password) body.password = values.password
      if (values.avatar_url) body.avatar_url = values.avatar_url

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "操作失败")
      }

      toast.success(user ? "用户已更新" : "用户已创建")
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败")
    } finally {
      setLoading(false)
    }
  }

  const uploadProps: UploadProps = {
    name: "file",
    action: "/api/admin/upload",
    showUploadList: false,
    accept: "image/*",
    async beforeUpload(file) {
      const isImage = file.type.startsWith("image/")
      if (!isImage) {
        message.error("只能上传图片文件")
        return false
      }
      const isLt2M = file.size / 1024 / 1024 < 2
      if (!isLt2M) {
        message.error("图片必须小于 2MB")
        return false
      }
      const formData = new FormData()
      formData.append("file", file)
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: formData })
        const data = await res.json()
        if (data.success) {
          form.setFieldValue("avatar_url", data.url)
          message.success("头像上传成功")
        } else {
          message.error(data.error || "上传失败")
        }
      } catch {
        message.error("上传失败，请重试")
      }
      return false
    }
  }

  const canEditRole = currentUserRole === "super_admin"

  return (
    <Modal
      title={user ? "编辑用户" : "新建用户"}
      open={open}
      onCancel={() => onOpenChange(false)}
      width={520}
      footer={
        <Space>
          <Button onClick={() => onOpenChange(false)}>取消</Button>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            保存
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" size="middle">
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: "请输入用户名" }]}
            >
              <Input placeholder="请输入用户名" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="email"
              label="邮箱"
              rules={[{ required: !user, type: "email", message: "请输入有效邮箱" }]}
            >
              <Input placeholder="请输入邮箱" disabled={!!user} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="password" label={user ? "新密码（留空保持不变）" : "密码"} rules={user ? [] : [{ required: true, message: "请输入密码" }]}>
          <Input.Password placeholder={user ? "留空保持不变" : "请输入密码"} />
        </Form.Item>

        <Form.Item name="avatar_url" label="头像">
          <Space.Compact style={{ width: "100%" }}>
            <Input placeholder="头像 URL" />
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>上传</Button>
            </Upload>
          </Space.Compact>
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="role" label="角色">
              <Select disabled={!canEditRole}>
                <Select.Option value="user">普通用户</Select.Option>
                <Select.Option value="admin">管理员</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="membership" label="会员等级">
              <Select onChange={handleMembershipChange}>
                <Select.Option value="free">Free</Select.Option>
                <Select.Option value="pro">Pro</Select.Option>
                <Select.Option value="plus">Plus</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="daily_ai_limit" label="每日 AI 限额">
              <Input type="number" min={0} placeholder="0" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="ai_balance" label="额外余额">
              <Input type="number" min={0} placeholder="0" />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ marginTop: 8, marginBottom: 12 }} />

        <Typography.Text strong style={{ marginBottom: 8, display: "block" }}>
          AI 积分额度（按 token 计费）
        </Typography.Text>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="monthly_credit_quota"
              label="月度积分额度"
              extra="填 0 = 跟随会员等级默认额度"
            >
              <InputNumber min={0} step={100} style={{ width: "100%" }} placeholder="0" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="credit_balance"
              label="充值积分余额"
              extra="月度额度用完后自动扣减"
            >
              <InputNumber min={0} step={10} precision={2} style={{ width: "100%" }} placeholder="0" />
            </Form.Item>
          </Col>
        </Row>
        {user && (
          <div
            style={{
              background: "#F7F8FA",
              borderRadius: 6,
              padding: "8px 12px",
              marginBottom: 8,
              fontSize: 12,
              color: "#646A73",
              lineHeight: 1.8
            }}
          >
            本月已用 <b>{monthlyUsedOf(user)}</b> 积分 · 月度额度{" "}
            <b>{user.monthly_credit_quota ? user.monthly_credit_quota : "跟随等级默认"}</b> ·
            充值余额 <b>{user.credit_balance ?? 0}</b>
          </div>
        )}

        <Divider style={{ marginTop: 8, marginBottom: 12 }} />

        <Typography.Text strong style={{ marginBottom: 8, display: "block" }}>
          设备控制权限
        </Typography.Text>
        <Checkbox.Group
          value={allowedControls}
          onChange={(vals) => setAllowedControls(vals as string[])}
          style={{ width: "100%" }}
        >
          <Row gutter={[8, 8]}>
            {CONTROLS.map((ctrl) => (
              <Col span={12} key={ctrl.id}>
                <Checkbox value={ctrl.id}>{ctrl.label}</Checkbox>
              </Col>
            ))}
          </Row>
        </Checkbox.Group>
      </Form>
    </Modal>
  )
}
