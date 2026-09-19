"use client"

import { useState, useEffect } from "react"
import { Button, Input, Table, Modal, Form, Typography, Card } from "antd"
import { toast } from "sonner"
import { format } from "date-fns"
import { BannedIP } from "@/lib/db/security-service"
import { IconDelete, IconPause } from "@/components/icon";

export function BannedIPsManager() {
  const [ips, setIps] = useState<BannedIP[]>([])
  const [loading, setLoading] = useState(true)
  const [newIp, setNewIp] = useState("")
  const [reason, setReason] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const fetchIps = async () => {
    try {
      const res = await fetch("/api/admin/banned-ips")
      if (res.ok) {
        const data = await res.json()
        setIps(data)
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load banned IPs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIps()
  }, [])

  const handleBan = async () => {
    try {
      const values = await form.validateFields()
      const res = await fetch("/api/admin/banned-ips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: values.ip, reason: values.reason }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to ban IP")
      }

      toast.success("IP banned successfully")
      setNewIp("")
      setReason("")
      setModalOpen(false)
      form.resetFields()
      fetchIps()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed")
    }
  }

  const handleUnban = async (ip: string) => {
    try {
      const res = await fetch(`/api/admin/banned-ips?ip=${ip}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to unban IP")

      toast.success("IP unbanned successfully")
      fetchIps()
    } catch (error) {
      toast.error("Failed to unban IP")
    }
  }

  const columns = [
    {
      title: "IP Address",
      dataIndex: "ip",
      key: "ip",
      render: (val: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: '#F5222D' }}>{val}</span>
      ),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      render: (val: string) => (
        <span style={{ fontSize: '12px' }}>{val || "-"}</span>
      ),
    },
    {
      title: "Banned By",
      dataIndex: "banned_by",
      key: "banned_by",
      render: (val: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#8F959E' }}>{val}</span>
      ),
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      render: (val: number) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#8F959E' }}>
          {format(new Date(Number(val)), "yyyy-MM-dd HH:mm")}
        </span>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      render: (_: unknown, record: BannedIP) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<IconDelete />}
          onClick={() => handleUnban(record.ip)}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          Unban
        </Button>
      ),
    },
  ]

  return (
    <Card
      title={
        <div>
          <Typography.Title level={5} style={{ margin: 0 }}>Banned IPs</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
            Manage IP blocks and access control.
          </Typography.Text>
        </div>
      }
      extra={
        <Button
          danger
          icon={<IconPause />}
          onClick={() => setModalOpen(true)}
        >
          Ban IP
        </Button>
      }
      style={{ border: "1px solid #EDEEEF" }}
      styles={{ body: { padding: 0 } }}
    >
      <Table
        columns={columns}
        dataSource={ips}
        rowKey="id"
        pagination={false}
        size="small"
        locale={{ emptyText: 'No banned IPs found.' }}
      />

      <Modal
        title="Ban IP Address"
        open={modalOpen}
        onOk={handleBan}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
        }}
        okText="Confirm Ban"
        okButtonProps={{ danger: true }}
      >
        <Form form={form} layout="vertical" style={{ paddingTop: '16px' }}>
          <Form.Item
            name="ip"
            label="IP Address"
            rules={[{ required: true, message: 'Please enter an IP address' }]}
          >
            <Input placeholder="192.168.1.1" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Reason (Optional)"
          >
            <Input placeholder="Malicious activity" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
