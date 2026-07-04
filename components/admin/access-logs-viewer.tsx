"use client"

import { useState, useEffect } from "react"
import { Card, Table, Button } from "antd"
import { ReloadOutlined } from "@ant-design/icons"
import { AccessLog } from "@/lib/db/security-service"
import { format } from "date-fns"

export function AccessLogsViewer() {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/access-logs?limit=50")
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (error) {
      console.error("Failed to fetch logs", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const columns = [
    {
      title: "Time",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      render: (val: number) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#8c8c8c' }}>
          {format(new Date(Number(val)), "MM-dd HH:mm:ss")}
        </span>
      ),
    },
    {
      title: "IP",
      dataIndex: "ip",
      key: "ip",
      width: 140,
      render: (val: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{val}</span>
      ),
    },
    {
      title: "Method",
      dataIndex: "method",
      key: "method",
      width: 80,
      render: (val: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600 }}>{val}</span>
      ),
    },
    {
      title: "Path",
      dataIndex: "path",
      key: "path",
      ellipsis: true,
      render: (val: string) => (
        <span
          style={{ fontFamily: 'monospace', fontSize: '12px', color: '#595959', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={val}
        >
          {val}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 80,
      render: (val: number) => {
        const isError = val >= 400
        return (
          <span style={{
            padding: '2px 8px',
            borderRadius: '0',
            fontSize: '10px',
            fontWeight: 500,
            border: `1px solid ${isError ? '#ffccc7' : '#b7eb8f'}`,
            backgroundColor: isError ? '#fff2f0' : '#f6ffed',
            color: isError ? '#f5222d' : '#52c41a',
          }}>
            {val}
          </span>
        )
      },
    },
  ]

  return (
    <Card
      title="Recent Access Logs"
      extra={
        <Button
          icon={<ReloadOutlined spin={loading} />}
          onClick={fetchLogs}
          loading={loading}
        >
          Refresh
        </Button>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        pagination={false}
        size="small"
        locale={{ emptyText: 'No logs found' }}
      />
    </Card>
  )
}
