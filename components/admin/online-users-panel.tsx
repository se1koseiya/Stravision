"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Avatar,
  Tag,
  Statistic,
  Tooltip,
  Switch,
  Descriptions,
  Typography as AntTypography,
  App
} from "antd"
import {
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  GlobalOutlined,
  ApiOutlined,
  DisconnectOutlined
} from "@ant-design/icons"
import type { TableColumnsType } from "antd"
import { formatDistanceToNowStrict } from "date-fns"
import { zhCN } from "date-fns/locale"

const { Text } = AntTypography

interface IpLocationInfo {
  ip: string
  country: string | null
  region: string | null
  city: string | null
  is_local?: boolean
}

interface OnlineUser {
  user_id: number
  username: string
  email: string | null
  avatar_url: string | null
  role: string
  last_ip: string
  ip_count: number
  requests: number
  last_active: number
  location: IpLocationInfo | null
}

interface OnlineGuest {
  ip: string
  requests: number
  last_active: number
  location: IpLocationInfo | null
}

interface OnlineSnapshot {
  window_minutes: number
  generated_at: number
  online_users: OnlineUser[]
  guest_ips: OnlineGuest[]
}

interface IpLookupResult extends IpLocationInfo {
  activity?: {
    last_seen: number | null
    requests_24h: number
    last_user: string | null
    banned: boolean
  }
}

function formatLocation(loc: IpLocationInfo | null): string {
  if (!loc) return "—"
  if (loc.is_local) return loc.country || "本地网络"
  const parts = [loc.country, loc.region, loc.city].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : "未知"
}

function relativeTime(ts: number): string {
  try {
    return `${formatDistanceToNowStrict(new Date(ts), { addSuffix: false, locale: zhCN })}前`
  } catch {
    return "—"
  }
}

const roleMap: Record<string, { color: string; label: string }> = {
  super_admin: { color: "error", label: "超级管理员" },
  admin: { color: "orange", label: "管理员" },
  member: { color: "blue", label: "会员" },
  user: { color: "default", label: "普通用户" }
}

export function OnlineUsersPanel() {
  const { message } = App.useApp()
  const [snapshot, setSnapshot] = useState<OnlineSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [ipInput, setIpInput] = useState("")
  const [ipLooking, setIpLooking] = useState(false)
  const [ipResult, setIpResult] = useState<IpLookupResult | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchSnapshot = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch("/api/admin/online-users?window=5")
      if (res.ok) {
        setSnapshot(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch online users", error)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSnapshot()
  }, [fetchSnapshot])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (autoRefresh) {
      timerRef.current = setInterval(() => fetchSnapshot(true), 30000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoRefresh, fetchSnapshot])

  const lookupIp = async () => {
    const ip = ipInput.trim()
    if (!ip) return
    setIpLooking(true)
    setIpResult(null)
    try {
      const res = await fetch(`/api/admin/ip-location?ip=${encodeURIComponent(ip)}`)
      const data = await res.json()
      if (!res.ok) {
        message.error(data.error || "查询失败")
        return
      }
      setIpResult(data)
    } catch (error) {
      console.error(error)
      message.error("查询失败")
    } finally {
      setIpLooking(false)
    }
  }

  const userColumns: TableColumnsType<OnlineUser> = [
    {
      title: "用户",
      key: "user",
      render: (_: unknown, record: OnlineUser) => (
        <Space size={8}>
          <Avatar size={32} src={record.avatar_url} style={{ background: "#1677ff", flexShrink: 0, fontSize: 13 }}>
            {record.username?.[0]?.toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500, lineHeight: 1.3 }}>{record.username}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      )
    },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      width: 110,
      render: (role: string) => {
        const cfg = roleMap[role] ?? { color: "default", label: role }
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      }
    },
    {
      title: "IP 地址",
      key: "ip",
      width: 150,
      render: (_: unknown, record: OnlineUser) => (
        <Space size={4}>
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>{record.last_ip}</span>
          {record.ip_count > 1 && (
            <Tooltip title={`窗口内使用过 ${record.ip_count} 个不同 IP`}>
              <Tag style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}>+{record.ip_count - 1}</Tag>
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: "归属地",
      key: "location",
      width: 220,
      render: (_: unknown, record: OnlineUser) => (
        <Space size={6}>
          <GlobalOutlined style={{ color: "#8F959E", fontSize: 12 }} />
          <span style={{ fontSize: 12 }}>{formatLocation(record.location)}</span>
        </Space>
      )
    },
    {
      title: "最近活动",
      dataIndex: "last_active",
      key: "last_active",
      width: 110,
      render: (val: number) => (
        <Tooltip title={new Date(val).toLocaleString("zh-CN")}>
          <span style={{ fontSize: 12, color: "#646A73" }}>{relativeTime(val)}</span>
        </Tooltip>
      )
    },
    {
      title: "请求数",
      dataIndex: "requests",
      key: "requests",
      width: 90,
      render: (val: number) => (
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{val}</span>
      )
    }
  ]

  const guestColumns: TableColumnsType<OnlineGuest> = [
    {
      title: "IP 地址",
      dataIndex: "ip",
      key: "ip",
      width: 180,
      render: (val: string) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{val}</span>
    },
    {
      title: "归属地",
      key: "location",
      render: (_: unknown, record: OnlineGuest) => (
        <Space size={6}>
          <GlobalOutlined style={{ color: "#8F959E", fontSize: 12 }} />
          <span style={{ fontSize: 12 }}>{formatLocation(record.location)}</span>
        </Space>
      )
    },
    {
      title: "最近活动",
      dataIndex: "last_active",
      key: "last_active",
      width: 110,
      render: (val: number) => (
        <Tooltip title={new Date(val).toLocaleString("zh-CN")}>
          <span style={{ fontSize: 12, color: "#646A73" }}>{relativeTime(val)}</span>
        </Tooltip>
      )
    },
    {
      title: "请求数",
      dataIndex: "requests",
      key: "requests",
      width: 90,
      render: (val: number) => (
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{val}</span>
      )
    }
  ]

  const onlineCount = snapshot?.online_users.length ?? 0
  const guestCount = snapshot?.guest_ips.length ?? 0
  const totalRequests =
    (snapshot?.online_users.reduce((s, u) => s + u.requests, 0) ?? 0) +
    (snapshot?.guest_ips.reduce((s, g) => s + g.requests, 0) ?? 0)

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      {/* 在线概览 */}
      <Card
        size="small"
        title="在线用户"
        extra={
          <Space size={12}>
            <Space size={6}>
              <Text type="secondary" style={{ fontSize: 12 }}>自动刷新</Text>
              <Switch size="small" checked={autoRefresh} onChange={setAutoRefresh} />
            </Space>
            <Button icon={<ReloadOutlined spin={loading} />} onClick={() => fetchSnapshot()} loading={loading}>
              刷新
            </Button>
          </Space>
        }
        style={{ border: "1px solid #EDEEEF" }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 4 }}>
          <Statistic
            title="在线用户"
            value={onlineCount}
            prefix={<TeamOutlined style={{ color: "#1677ff" }} />}
            styles={{ content: { color: "#1F2329", fontSize: 22 }, title: { fontSize: 12, color: "#8F959E" } }}
          />
          <Statistic
            title="访客 IP"
            value={guestCount}
            prefix={<DisconnectOutlined style={{ color: "#1677ff" }} />}
            styles={{ content: { color: "#1F2329", fontSize: 22 }, title: { fontSize: 12, color: "#8F959E" } }}
          />
          <Statistic
            title={`窗口内请求（${snapshot?.window_minutes ?? 5} 分钟）`}
            value={totalRequests}
            prefix={<ApiOutlined style={{ color: "#1677ff" }} />}
            styles={{ content: { color: "#1F2329", fontSize: 22 }, title: { fontSize: 12, color: "#8F959E" } }}
          />
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          判定规则：最近 {snapshot?.window_minutes ?? 5} 分钟内有访问记录即视为在线，每 30 秒自动刷新
        </Text>
      </Card>

      {/* 登录用户表 */}
      <Card title="已登录用户" size="small" styles={{ body: { padding: 0 } }} style={{ border: "1px solid #EDEEEF" }}>
        <Table
          rowKey="user_id"
          columns={userColumns}
          dataSource={snapshot?.online_users ?? []}
          loading={loading && !snapshot}
          pagination={false}
          size="small"
          locale={{ emptyText: "当前没有在线用户" }}
        />
      </Card>

      {/* 访客 IP 表 */}
      <Card
        title="访客 / 未登录 IP"
        size="small"
        styles={{ body: { padding: 0 } }}
        style={{ border: "1px solid #EDEEEF" }}
      >
        <Table
          rowKey="ip"
          columns={guestColumns}
          dataSource={snapshot?.guest_ips ?? []}
          loading={loading && !snapshot}
          pagination={false}
          size="small"
          locale={{ emptyText: "当前没有访客 IP" }}
        />
      </Card>

      {/* IP 归属地查询 */}
      <Card title="IP 归属地查询" size="small" style={{ border: "1px solid #EDEEEF" }}>
        <Space.Compact style={{ width: 380, maxWidth: "100%" }}>
          <Input
            placeholder="输入 IPv4 地址，如 114.114.114.114"
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            onPressEnter={lookupIp}
            style={{ fontFamily: "monospace" }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={lookupIp} loading={ipLooking}>
            查询
          </Button>
        </Space.Compact>

        {ipResult && (
          <Descriptions
            size="small"
            column={1}
            style={{ marginTop: 16 }}
            labelStyle={{ fontSize: 12, color: "#8F959E", width: 100 }}
            contentStyle={{ fontSize: 13 }}
            items={[
              {
                key: "location",
                label: "归属地",
                children: formatLocation(ipResult)
              },
              {
                key: "activity",
                label: "近期活动",
                children: ipResult.activity
                  ? `24 小时内 ${ipResult.activity.requests_24h} 次请求${
                      ipResult.activity.last_user ? ` · 最近登录用户 ${ipResult.activity.last_user}` : ""
                    }`
                  : "—"
              },
              {
                key: "last_seen",
                label: "最后访问",
                children: ipResult.activity?.last_seen
                  ? new Date(ipResult.activity.last_seen).toLocaleString("zh-CN")
                  : "24 小时内无记录"
              },
              {
                key: "banned",
                label: "封禁状态",
                children: ipResult.activity?.banned ? (
                  <Tag color="error">已封禁</Tag>
                ) : (
                  <Tag color="success">正常</Tag>
                )
              }
            ]}
          />
        )}
      </Card>
    </Space>
  )
}
