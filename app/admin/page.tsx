"use client"

import { useEffect, useState } from "react"
import {
  Layout,
  Menu,
  Table,
  Button,
  Card,
  Tag,
  Avatar,
  Space,
  Typography,
  Spin,
  Dropdown,
  ConfigProvider,
  theme,
  message,
  Badge,
  Breadcrumb,
  Statistic,
  Tooltip,
  App,
  Typography as AntTypography
} from "antd"
import {
  UserAddOutlined,
  EditOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  FileTextOutlined,
  LockOutlined,
  WarningOutlined,
  CloudServerOutlined,
  ShopOutlined,
  ApiOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  NotificationOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  BookOutlined,
  DatabaseOutlined,
  SoundOutlined,
  ExperimentOutlined
} from "@ant-design/icons"
import type { TableColumnsType, MenuProps } from "antd"
import Image from "next/image"
import Link from "next/link"
import { UserPublic } from "@/lib/db/user-service"
import { UserDialog } from "@/components/admin/user-dialog"
import { BannedIPsManager } from "@/components/admin/banned-ips-manager"
import { AccessLogsViewer } from "@/components/admin/access-logs-viewer"
import { RateLimitSettings } from "@/components/admin/rate-limit-settings"
import { AnnouncementSender } from "@/components/admin/announcement-sender"
import { ChangelogSender } from "@/components/admin/changelog-sender"
import { MaintenanceSettings } from "@/components/admin/maintenance-settings"
import { MCPMarketManager } from "@/components/admin/mcp-market-manager"
import { KnowledgeMarketManager } from "@/components/admin/knowledge-market-manager"
import { FeatureAnnouncementAdmin } from "@/components/dashboard/feature-announcement-admin"
import { CameraSettings } from "@/components/admin/camera-settings"
import { SkillManager } from "@/components/admin/skill-manager"
import { DocsManager } from "@/components/admin/docs-manager"
import { AIFeaturesSettings } from "@/components/admin/ai-features-settings"
import { AIModelsManager } from "@/components/admin/ai-models-manager"
import { AIProvidersManager } from "@/components/admin/ai-providers-manager"
import { ModelMarketplace } from "@/components/admin/model-marketplace"
import DeviceManager from "@/components/admin/device-manager"
import { VoiceSettings } from "@/components/admin/voice-settings"
import { VoiceTestPage } from "@/components/admin/voice-test-page"
import { UserAvatarMenu } from "@/components/user-avatar-menu"

const { Header, Sider, Content } = Layout
const { Text, Title } = AntTypography

type AdminSection =
  | "dashboard"
  | "users"
  | "ai-models"
  | "ai-providers"
  | "model-marketplace"
  | "security"
  | "announcement"
  | "settings"
  | "voice-test"
  | "mcp-market"
  | "kb-market"
  | "skills"
  | "docs"
  | "devices"

interface SidebarItem {
  key: AdminSection
  label: string
  icon: React.ReactNode
}

interface SidebarGroup {
  key: string
  label: string
  items: SidebarItem[]
}

const sidebarGroups: SidebarGroup[] = [
  {
    key: "overview",
    label: "",
    items: [{ key: "dashboard", label: "概览", icon: <DashboardOutlined /> }]
  },
  {
    key: "system",
    label: "系统管理",
    items: [
      { key: "users", label: "用户管理", icon: <UserOutlined /> },
      { key: "security", label: "安全设置", icon: <LockOutlined /> },
      { key: "announcement", label: "公告管理", icon: <NotificationOutlined /> },
      { key: "settings", label: "系统设置", icon: <SettingOutlined /> },
      { key: "devices", label: "设备管理", icon: <DatabaseOutlined /> }
    ]
  },
  {
    key: "ai",
    label: "AI 配置",
    items: [
      { key: "ai-providers", label: "AI 提供商", icon: <CloudServerOutlined /> },
      { key: "ai-models", label: "AI 模型", icon: <RobotOutlined /> },
      { key: "model-marketplace", label: "模型市场", icon: <ShopOutlined /> },
      { key: "voice-test", label: "语音测试", icon: <ExperimentOutlined /> }
    ]
  },
  {
    key: "extension",
    label: "扩展",
    items: [
      { key: "mcp-market", label: "MCP 市场", icon: <ApiOutlined /> },
      { key: "kb-market", label: "知识库市场", icon: <BookOutlined /> },
      { key: "skills", label: "Agent 技能", icon: <ToolOutlined /> },
      { key: "docs", label: "文档管理", icon: <FileTextOutlined /> }
    ]
  }
]

const sectionMeta: Record<AdminSection, { label: string; breadcrumb: string[] }> = {
  dashboard: { label: "概览", breadcrumb: ["首页"] },
  users: { label: "用户管理", breadcrumb: ["系统管理", "用户管理"] },
  "ai-models": { label: "AI 模型", breadcrumb: ["AI 配置", "模型管理"] },
  "ai-providers": { label: "AI 提供商", breadcrumb: ["AI 配置", "提供商管理"] },
  "model-marketplace": { label: "模型市场", breadcrumb: ["AI 配置", "模型市场"] },
  security: { label: "安全设置", breadcrumb: ["系统管理", "安全"] },
  announcement: { label: "公告管理", breadcrumb: ["系统管理", "公告"] },
  settings: { label: "系统设置", breadcrumb: ["系统管理"] },
  "voice-test": { label: "语音测试", breadcrumb: ["AI 配置", "语音测试"] },
  "mcp-market": { label: "MCP 市场", breadcrumb: ["扩展", "MCP 市场"] },
  devices: { label: "设备管理", breadcrumb: ["系统管理", "设备管理"] },
  "kb-market": { label: "知识库市场", breadcrumb: ["扩展", "知识库市场"] },
  skills: { label: "Agent 技能", breadcrumb: ["扩展", "技能管理"] },
  docs: { label: "文档管理", breadcrumb: ["扩展", "文档管理"] }
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserPublic | null>(null)
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard")
  const [collapsed, setCollapsed] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // 强制使用浅色主题 — 避免跟随系统深色模式导致侧边栏/顶栏变深色
    setIsDark(false)
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Failed to fetch users")
      const data = await res.json()
      setUsers(data)
    } catch (error) {
      message.error("加载用户列表失败")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me")
      const data = await res.json()
      if (data.authenticated) setCurrentUser(data.user)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchCurrentUser()
    fetchUsers()
  }, [])

  const handleEdit = (user: UserPublic) => {
    setSelectedUser(user)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setSelectedUser(null)
    setDialogOpen(true)
  }

  const userColumns: TableColumnsType<UserPublic> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      render: (id: number) => <Text style={{ fontFamily: "monospace", fontSize: 12 }}>{id}</Text>
    },
    {
      title: "用户",
      key: "user",
      render: (_: any, record: UserPublic) => (
        <Space size={8}>
          <Avatar
            size={32}
            src={record.avatar_url}
            style={{ background: "#1677ff", flexShrink: 0, fontSize: 13 }}
          >
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
      render: (role: string) => {
        const map: Record<string, { color: string; label: string }> = {
          super_admin: { color: "error", label: "超级管理员" },
          admin: { color: "orange", label: "管理员" },
          member: { color: "blue", label: "会员" },
          user: { color: "default", label: "普通用户" }
        }
        const cfg = map[role] ?? { color: "default", label: role }
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      }
    },
    {
      title: "设备权限",
      key: "permissions",
      render: (_: any, record: UserPublic) => {
        const count = record.permissions?.allowedControls?.length ?? 0
        return count > 0 ? <Tag>{count} 台设备</Tag> : <Text type="disabled">—</Text>
      }
    },
    {
      title: "操作",
      key: "actions",
      width: 80,
      render: (_: any, record: UserPublic) => (
        <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
      )
    }
  ]

  const userMenuItems: MenuProps["items"] = [
    { key: "settings", icon: <SettingOutlined />, label: "设置" },
    { key: "home", icon: <DashboardOutlined />, label: <Link href="/">返回首页</Link> },
    { key: "logout", icon: <LogoutOutlined />, label: "退出登录", danger: true }
  ]

  const meta = sectionMeta[activeSection]

  const renderPageHeader = (extra?: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#1F2329", lineHeight: 1.4 }}>{meta.label}</div>
        <div style={{ fontSize: 12, color: "#8F959E", marginTop: 2 }}>共 {users.length} 个用户</div>
      </div>
      {extra}
    </div>
  )

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#1F2329", lineHeight: 1.4 }}>系统概览</div>
              <div style={{ fontSize: 12, color: "#8F959E", marginTop: 2 }}>实时查看系统运行状态</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
              <Card size="small" loading={loading} style={{ border: "1px solid #EDEEEF" }}>
                <Statistic
                  title="总用户"
                  value={users.length}
                  prefix={<UserOutlined style={{ color: "#1677ff" }} />}
                  styles={{ content: { color: "#1F2329", fontSize: 22 }, title: { fontSize: 12, color: "#8F959E" } }}
                />
              </Card>
              <Card size="small" style={{ border: "1px solid #EDEEEF" }}>
                <Statistic
                  title="管理员"
                  value={users.filter((u) => u.role === "admin" || u.role === "super_admin").length}
                  prefix={<SafetyCertificateOutlined style={{ color: "#1677ff" }} />}
                  styles={{ content: { color: "#1F2329", fontSize: 22 }, title: { fontSize: 12, color: "#8F959E" } }}
                />
              </Card>
              <Card size="small" style={{ border: "1px solid #EDEEEF" }}>
                <Statistic
                  title="会员"
                  value={users.filter((u) => u.role === "member").length}
                  prefix={<ThunderboltOutlined style={{ color: "#1677ff" }} />}
                  styles={{ content: { color: "#1F2329", fontSize: 22 }, title: { fontSize: 12, color: "#8F959E" } }}
                />
              </Card>
              <Card size="small" style={{ border: "1px solid #EDEEEF" }}>
                <Statistic
                  title="系统状态"
                  value="正常"
                  prefix={<CheckCircleFilled style={{ color: "#1677ff" }} />}
                  styles={{ content: { color: "#1F2329", fontSize: 18 }, title: { fontSize: 12, color: "#8F959E" } }}
                />
              </Card>
            </div>
            <Card title="最近用户" size="small" styles={{ body: { padding: 0 } }} style={{ border: "1px solid #EDEEEF" }}>
              <Table
                rowKey="id"
                columns={userColumns}
                dataSource={users.slice(0, 5)}
                pagination={false}
                size="small"
              />
            </Card>
          </div>
        )

      case "users":
        return (
          <div>
            {renderPageHeader(
              <Button type="primary" icon={<UserAddOutlined />} onClick={handleCreate}>新建用户</Button>
            )}
            <Card styles={{ body: { padding: 0 } }} style={{ border: "1px solid #EDEEEF" }}>
              <Table
                rowKey="id"
                columns={userColumns}
                dataSource={users}
                loading={loading}
                pagination={{ pageSize: 20, showSizeChanger: false }}
                locale={{ emptyText: "暂无用户数据" }}
                size="middle"
              />
            </Card>
          </div>
        )

      case "ai-models":
        return <AIModelsManager />
      case "ai-providers":
        return <AIProvidersManager />
      case "model-marketplace":
        return <ModelMarketplace />

      case "security":
        return (
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            <BannedIPsManager />
            <AccessLogsViewer />
          </Space>
        )

      case "announcement":
        return (
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            <AnnouncementSender />
            <ChangelogSender />
            <FeatureAnnouncementAdmin />
          </Space>
        )

      case "settings":
        return (
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            <AIFeaturesSettings />
            <VoiceSettings />
            <RateLimitSettings />
            <MaintenanceSettings />
            <CameraSettings />
          </Space>
        )

      case "mcp-market":
        return <MCPMarketManager />

      case "voice-test":
        return <VoiceTestPage />

      case "devices":
        return <DeviceManager />

      case "kb-market":
        return <KnowledgeMarketManager />

      case "skills":
        return <SkillManager />

      case "docs":
        return <DocsManager />

      default:
        return null
    }
  }

  if (loading) {
    return (
      <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F6F7" }}>
          <Spin size="large" />
        </div>
      </ConfigProvider>
    )
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 6,
          fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, sans-serif)",
          colorBorder: "#EDEEEF",
          colorBorderSecondary: "#F2F3F5",
          colorBgLayout: "#F5F6F7",
          controlHeight: 32,
          controlItemBgHover: "#F2F3F5",
          controlItemBgActive: "#E8F0FF",
          colorText: "#1F2329",
          colorTextSecondary: "#646A73",
          colorTextTertiary: "#8F959E",
          fontSize: 13
        },
        components: {
          Layout: {
            headerBg: "#ffffff",
            siderBg: "#F7F8FA",
            bodyBg: "#F5F6F7",
            headerHeight: 56,
            headerPadding: "0 20px"
          },
          Menu: {
            itemBg: "transparent",
            itemSelectedBg: "#E8F0FF",
            itemSelectedColor: "#1677ff",
            itemHoverBg: "#F2F3F5",
            itemColor: "#1F2329",
            itemBorderRadius: 6,
            itemMarginInline: 8,
            itemHeight: 36,
            iconSize: 15,
            activeBarBorderWidth: 0
          },
          Card: {
            borderRadiusLG: 6,
            headerBg: "transparent",
            headerFontSize: 14,
            paddingLG: 16,
            boxShadowTertiary: "none"
          },
          Table: {
            headerBg: "#FAFBFC",
            headerColor: "#646A73",
            rowHoverBg: "#F7F8FA",
            borderColor: "#EFF0F1",
            cellPaddingBlock: 10
          },
          Button: {
            borderRadius: 6,
            controlHeight: 32,
            paddingInline: 14
          }
        }
      }}
    >
      <App
        notification={{ placement: "topRight" }}
        message={{ maxCount: 3 }}
      >
        <Layout style={{ minHeight: "100vh" }}>
          {/* Sidebar */}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme="light"
          width={220}
          collapsedWidth={56}
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            overflow: "auto",
            background: "#F7F8FA",
            borderRight: "1px solid #EDEEEF"
          }}
        >
          {/* Logo area */}
          <div
            style={{
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "0" : "0 16px",
              gap: 8
            }}
          >
            <Image src="/logo.png" alt="Logo" width={24} height={24} style={{ objectFit: "contain", flexShrink: 0 }} />
            {!collapsed && (
              <Title level={5} style={{ margin: 0, fontWeight: 600, fontSize: 15, whiteSpace: "nowrap", color: "#1F2329" }}>
                BerryRealm
              </Title>
            )}
          </div>

          {/* Navigation */}
          <Menu
            mode="inline"
            theme="light"
            selectedKeys={[activeSection]}
            onClick={({ key }) => setActiveSection(key as AdminSection)}
            style={{ border: "none", marginTop: 4, background: "transparent", paddingInline: 0 }}
            inlineCollapsed={collapsed}
            items={sidebarGroups.flatMap((group) => {
              if (!group.label) {
                return group.items.map((item) => ({
                  key: item.key,
                  icon: item.icon,
                  label: item.label
                }))
              }
              return [
                {
                  type: "group" as const,
                  label: collapsed ? null : (
                    <span style={{ fontSize: 11, color: "#8F959E", fontWeight: 500, letterSpacing: "0.02em" }}>
                      {group.label}
                    </span>
                  ),
                  key: group.key,
                  children: group.items.map((item) => ({
                    key: item.key,
                    icon: item.icon,
                    label: item.label
                  }))
                }
              ]
            })}
          />
        </Sider>

        {/* Main */}
        <Layout
          style={{
            marginLeft: collapsed ? 56 : 220,
            transition: "margin-left 0.2s",
            background: "#F5F6F7"
          }}
        >
          {/* Header */}
          <Header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 99,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 20px",
              background: "#ffffff",
              borderBottom: "1px solid #EDEEEF",
              height: 56
            }}
          >
            {/* Left: Collapse + Breadcrumb */}
            <Space size={12}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: 15, color: "#646A73" }}
              />
              <Breadcrumb
                items={meta.breadcrumb.map((b, i) => ({
                  title: i === meta.breadcrumb.length - 1 ? (
                    <span style={{ color: "#1F2329", fontSize: 13 }}>{b}</span>
                  ) : (
                    <span style={{ color: "#8F959E", fontSize: 13 }}>{b}</span>
                  )
                }))}
              />
            </Space>

            {/* Right: Actions */}
            <Space size={12}>
              <Tooltip title="暂无新通知">
                <Badge count={0} size="small">
                  <BellOutlined style={{ fontSize: 16, color: "#646A73", cursor: "pointer" }} />
                </Badge>
              </Tooltip>
              {currentUser ? (
                <Dropdown
                  menu={{
                    items: userMenuItems,
                    onClick: ({ key }) => {
                      if (key === "logout") window.location.href = "/auth/logout"
                    }
                  }}
                  placement="bottomRight"
                >
                  <Space size={8} style={{ cursor: "pointer" }}>
                    <Avatar size={28} src={currentUser.avatar_url} style={{ background: "#1677ff", fontSize: 12 }}>
                      {currentUser.username?.[0]?.toUpperCase()}
                    </Avatar>
                    <Text style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                      {currentUser.username}
                    </Text>
                  </Space>
                </Dropdown>
              ) : (
                <UserAvatarMenu user={null} />
              )}
            </Space>
          </Header>

          {/* Content */}
          <Content style={{ padding: 20, background: "#F5F6F7", minHeight: "calc(100vh - 56px)" }}>
            {renderContent()}
          </Content>
        </Layout>

        {/* User Dialog */}
        <UserDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          user={selectedUser}
          currentUserRole={currentUser?.role || "user"}
          onSuccess={() => {
            fetchUsers()
            setDialogOpen(false)
          }}
        />
      </Layout>
    </App>
    </ConfigProvider>
  )
}
