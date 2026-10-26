"use client"

import { useEffect, useState } from "react"
import { Layout, Menu, Table, Button, Card, Tag, Avatar, Space, Typography, Spin, Dropdown, ConfigProvider, theme, Badge, Breadcrumb, Statistic, Tooltip, App, Typography as AntTypography } from "antd"

import { message } from "@/lib/ui/feedback"
import type { TableColumnsType, MenuProps } from "antd"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { UserPublic } from "@/lib/db/user-service"
import { IS_DESKTOP_APP } from "@/lib/desktop-mode"
import { UserDialog } from "@/components/admin/user-dialog"
import { BannedIPsManager } from "@/components/admin/banned-ips-manager"
import { OnlineUsersPanel } from "@/components/admin/online-users-panel"
import { AccessLogsViewer } from "@/components/admin/access-logs-viewer"
import { RateLimitSettings } from "@/components/admin/rate-limit-settings"
import { AnnouncementSender } from "@/components/admin/announcement-sender"
import { ChangelogSender } from "@/components/admin/changelog-sender"
import { ChangelogManager } from "@/components/admin/changelog-manager"
import { MaintenanceSettings } from "@/components/admin/maintenance-settings"
import { MCPMarketManager } from "@/components/admin/mcp-market-manager"
import { KnowledgeMarketManager } from "@/components/admin/knowledge-market-manager"
import { FeatureAnnouncementAdmin } from "@/components/dashboard/feature-announcement-admin"
import { CameraSettings } from "@/components/admin/camera-settings"
import { BrandingSettings } from "@/components/admin/branding-settings"
import { SkillManager } from "@/components/admin/skill-manager"
import { DocsManager } from "@/components/admin/docs-manager"
import { AIFeaturesSettings } from "@/components/admin/ai-features-settings"
import { AIModelsManager } from "@/components/admin/ai-models-manager"
import { AIProvidersManager } from "@/components/admin/ai-providers-manager"
import { ModelMarketplace } from "@/components/admin/model-marketplace"
import DeviceManager from "@/components/admin/device-manager"
// 设备管理弹窗：桌面端「摄像头与设备」不再用 antd 表格，改用与 AI 助手设置同版式的弹窗
import { DeviceManagerDialog, DeviceManagerLauncher } from "@/components/device/device-manager-dialog"
import { VoiceSettings } from "@/components/admin/voice-settings"
import { VoiceTestPage } from "@/components/admin/voice-test-page"
import { DesktopAbout } from "@/components/admin/desktop-about"
import { DesktopLicensesManager } from "@/components/admin/desktop-licenses-manager"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { IconAddUser, IconApi, IconArrowLeft, IconAttention, IconBook, IconCamera, IconCaution, IconCertificate, IconCheckOne, IconCloudStorage, IconDashboard, IconDatabaseNetwork, IconEdit, IconExperiment, IconFileText, IconHistory, IconInfo, IconLayoutTwo, IconLock, IconLogout, IconPeoples, IconRemind, IconRobot, IconSetting, IconShop, IconThunderbolt, IconTool, IconUser, IconVolumeNotice } from "@/components/icon";

const { Header, Sider, Content } = Layout
const { Text, Title } = AntTypography

type AdminSection =
  | "dashboard"
  | "users"
  | "online-users"
  | "ai-models"
  | "ai-providers"
  | "model-marketplace"
  | "security"
  | "announcement"
  | "changelog"
  | "settings"
  | "voice-test"
  | "mcp-market"
  | "kb-market"
  | "skills"
  | "docs"
  | "devices"
  | "desktop-licenses"
  | "desktop-about"

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
    items: [{ key: "dashboard", label: "概览", icon: <IconDashboard /> }]
  },  {
    key: "system",
    label: "系统管理",
    items: [
      { key: "users", label: "用户管理", icon: <IconUser /> },
      { key: "online-users", label: "在线用户", icon: <IconPeoples /> },
      { key: "security", label: "安全设置", icon: <IconLock /> },
      { key: "announcement", label: "公告管理", icon: <IconRemind /> },
      { key: "changelog", label: "更新日志", icon: <IconHistory /> },
      { key: "settings", label: "系统设置", icon: <IconSetting /> },
      { key: "devices", label: "设备管理", icon: <IconDatabaseNetwork /> },
      { key: "desktop-licenses", label: "桌面端授权", icon: <IconCertificate /> }
    ]
  },
  {
    key: "ai",
    label: "AI 配置",
    items: [
      { key: "ai-providers", label: "AI 提供商", icon: <IconCloudStorage /> },
      { key: "ai-models", label: "AI 模型", icon: <IconRobot /> },
      { key: "model-marketplace", label: "模型市场", icon: <IconShop /> },
      { key: "voice-test", label: "语音测试", icon: <IconExperiment /> }
    ]
  },
  {
    key: "extension",
    label: "扩展",
    items: [
      { key: "mcp-market", label: "MCP 市场", icon: <IconApi /> },
      { key: "kb-market", label: "知识库市场", icon: <IconBook /> },
      { key: "skills", label: "Agent 技能", icon: <IconTool /> },
      { key: "docs", label: "文档管理", icon: <IconFileText /> }
    ]
  }
]

const sectionMeta: Record<AdminSection, { label: string; breadcrumb: string[] }> = {
  dashboard: { label: "概览", breadcrumb: ["首页"] },
  users: { label: "用户管理", breadcrumb: ["系统管理", "用户管理"] },
  "online-users": { label: "在线用户", breadcrumb: ["系统管理", "在线用户"] },
  "ai-models": { label: "AI 模型", breadcrumb: ["AI 配置", "模型管理"] },
  "ai-providers": { label: "AI 提供商", breadcrumb: ["AI 配置", "提供商管理"] },
  "model-marketplace": { label: "模型市场", breadcrumb: ["AI 配置", "模型市场"] },
  security: { label: "安全设置", breadcrumb: ["系统管理", "安全"] },
  announcement: { label: "公告管理", breadcrumb: ["系统管理", "公告"] },
  changelog: { label: "更新日志", breadcrumb: ["系统管理", "更新日志"] },
  settings: { label: "系统设置", breadcrumb: ["系统管理"] },
  "voice-test": { label: "语音测试", breadcrumb: ["AI 配置", "语音测试"] },
  "mcp-market": { label: "MCP 市场", breadcrumb: ["扩展", "MCP 市场"] },
  devices: { label: "设备管理", breadcrumb: ["系统管理", "设备管理"] },
  "desktop-licenses": { label: "桌面端授权", breadcrumb: ["系统管理", "桌面端授权"] },
  "kb-market": { label: "知识库市场", breadcrumb: ["扩展", "知识库市场"] },
  skills: { label: "Agent 技能", breadcrumb: ["扩展", "技能管理"] },
  docs: { label: "文档管理", breadcrumb: ["扩展", "文档管理"] },
  "desktop-about": { label: "关于本机", breadcrumb: ["关于"] },
}

/**
 * 🚨 桌面端专属菜单（2026-09-17 用户反馈 adminUI"难用的要死，要以用户角度出发"）：
 * 本地单用户形态下，"概览"里的总用户/会员/在线人数全是服务器端概念、毫无意义；
 * AI 分区按用户语言重命名，并新增「关于本机」（版本/检查更新/日志/重启）。
 *
 * 🚨 2026-09-19 用户纠正：个性化 / 记忆与进化 **不再**是 admin 页面的分区——
 * 它们属于「设置弹窗」（components/ai-settings-dialog.tsx，WorkBuddy 式居中弹窗）。
 * admin 页只保留运维视角的「AI 配置」与「关于本机」。
 */
const desktopSidebarGroups: SidebarGroup[] = [
  {
    key: "ai",
    label: "AI 设置",
    items: [
      { key: "ai-providers", label: "AI 服务", icon: <IconCloudStorage /> },
      { key: "ai-models", label: "默认模型", icon: <IconRobot /> },
      { key: "model-marketplace", label: "模型市场", icon: <IconShop /> },
      { key: "voice-test", label: "语音", icon: <IconExperiment /> }
    ]
  },
  {
    key: "prefs",
    label: "本机",
    items: [{ key: "settings", label: "摄像头与设备", icon: <IconCamera /> }]
  },
  {
    key: "about",
    label: "",
    items: [{ key: "desktop-about", label: "关于本机", icon: <IconInfo /> }]
  }
]

// 桌面端面包屑/标题用用户语言命名（与 desktopSidebarGroups 一致）
const desktopSectionLabels: Partial<Record<AdminSection, string>> = {
  settings: "摄像头与设备",
  "ai-providers": "AI 服务",
  "ai-models": "默认模型",
  "model-marketplace": "模型市场",
  "voice-test": "语音",
  "desktop-about": "关于本机",
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserPublic | null>(null)
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard")
  const [collapsed, setCollapsed] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [onlineCount, setOnlineCount] = useState<number | null>(null)
  // 桌面端「摄像头与设备」→ 设备管理弹窗（与 AI 助手设置同版式）
  const [deviceManagerOpen, setDeviceManagerOpen] = useState(false)

  useEffect(() => {
    // 支持 /admin?section=ai-providers 直达分区（桌面端「管理设置」入口用）。
    // 用 window.location.search 而非 useSearchParams，避开 SSR prerender 对
    // useSearchParams 的 Suspense 边界要求。
    // 桌面端无参数时默认直达「AI 服务」——本地单用户没有"概览"可看（2026-09-17 改版）。
    const s = new URLSearchParams(window.location.search).get("section") as AdminSection | null
    if (s && sectionMeta[s]) setActiveSection(s)
    else if (IS_DESKTOP_APP) setActiveSection("ai-providers")
  }, [])

  useEffect(() => {
    // 强制使用浅色主题 — 避免跟随系统深色模式导致侧边栏/顶栏变深色
    setIsDark(false)
  }, [])

  useEffect(() => {
    // 🆕 首启向导的「助手名字 / 对我的称呼」回填：
    // 向导窗口拿不到登录态，只能先把意向落盘到 desktop-settings.json；
    // 这里在用户登录后调一次 apply-wizard，仅在用户从未显式设置过时生效。
    if (!IS_DESKTOP_APP) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/user/personalization", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "apply-wizard" }),
        })
        if (res.ok && !cancelled) {
          const d = await res.json()
          if (d?.applied) console.log("[Personalization] 已回填向导偏好")
        }
      } catch {
        /* 静默：向导偏好只是锦上添花，失败不影响主流程 */
      }
    })()
    return () => {
      cancelled = true
    }
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
    // 🚨 桌面端不拉用户/在线统计：本地单用户无意义，且相关 admin API 未对桌面端放行（点了 403 弹"加载失败"）
    if (!IS_DESKTOP_APP) {
      fetchUsers()
      fetch("/api/admin/online-users?window=5")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.online_users) setOnlineCount(data.online_users.length)
        })
        .catch(() => {})
    } else {
      setLoading(false)
    }
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
            style={{ background: "#059669", flexShrink: 0, fontSize: 13 }}
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
      title: "AI 积分",
      key: "credits",
      width: 150,
      render: (_: any, record: UserPublic) => {
        if (!record.membership || record.membership === "free") {
          return <Text type="secondary">—</Text>
        }
        const d = new Date()
        const cycle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        const quota = record.monthly_credit_quota ?? 0
        const used = record.credit_cycle_date === cycle ? (record.monthly_credit_used ?? 0) : 0
        const balance = record.credit_balance ?? 0
        return (
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            <div>
              月额 <b>{quota > 0 ? quota : "默认"}</b> · 已用 <b>{used}</b>
            </div>
            <Text type="secondary">余额 {balance}</Text>
          </div>
        )
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
        <Button type="text" icon={<IconEdit />} onClick={() => handleEdit(record)} />
      )
    }
  ]

  const userMenuItems: MenuProps["items"] = [
    { key: "settings", icon: <IconSetting />, label: "设置" },
    { key: "home", icon: <IconDashboard />, label: <Link href="/">返回首页</Link> },
    { key: "logout", icon: <IconLogout />, label: "退出登录", danger: true }
  ]

  const meta = sectionMeta[activeSection]
  // 桌面端标题/面包屑走用户语言命名
  const displayLabel = (IS_DESKTOP_APP && desktopSectionLabels[activeSection]) || meta.label

  const renderPageHeader = (extra?: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#18181B", lineHeight: 1.4 }}>{displayLabel}</div>
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
              <div style={{ fontSize: 18, fontWeight: 600, color: "#18181B", lineHeight: 1.4 }}>系统概览</div>
              <div style={{ fontSize: 12, color: "#8F959E", marginTop: 2 }}>实时查看系统运行状态</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
              <Card size="small" loading={loading} style={{ border: "1px solid #EDEEEF" }}>
                <Statistic
                  title="总用户"
                  value={users.length}
                  prefix={<IconUser style={{ color: "#059669" }} />}
                  styles={{ content: { color: "#18181B", fontSize: 22 }, title: { fontSize: 12, color: "#8F959E" } }}
                />
              </Card>
              <Card size="small" style={{ border: "1px solid #EDEEEF" }}>
                <Statistic
                  title="管理员"
                  value={users.filter((u) => u.role === "admin" || u.role === "super_admin").length}
                  prefix={<IconCertificate style={{ color: "#059669" }} />}
                  styles={{ content: { color: "#18181B", fontSize: 22 }, title: { fontSize: 12, color: "#8F959E" } }}
                />
              </Card>
              <Card size="small" style={{ border: "1px solid #EDEEEF" }}>
                <Statistic
                  title="会员"
                  value={users.filter((u) => u.role === "member").length}
                  prefix={<IconThunderbolt style={{ color: "#059669" }} />}
                  styles={{ content: { color: "#18181B", fontSize: 22 }, title: { fontSize: 12, color: "#8F959E" } }}
                />
              </Card>
              <Card size="small" style={{ border: "1px solid #EDEEEF" }}>
                <Statistic
                  title="当前在线"
                  value={onlineCount ?? "—"}
                  prefix={<IconPeoples style={{ color: "#059669" }} />}
                  styles={{ content: { color: "#18181B", fontSize: 22 }, title: { fontSize: 12, color: "#8F959E" } }}
                />
              </Card>
              <Card size="small" style={{ border: "1px solid #EDEEEF" }}>
                <Statistic
                  title="系统状态"
                  value="正常"
                  prefix={<IconCheckOne style={{ color: "#059669" }} />}
                  styles={{ content: { color: "#18181B", fontSize: 18 }, title: { fontSize: 12, color: "#8F959E" } }}
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
              <Button type="primary" icon={<IconAddUser />} onClick={handleCreate}>新建用户</Button>
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

      case "online-users":
        return <OnlineUsersPanel />

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

      case "changelog":
        return <ChangelogManager />

      case "settings":
        // 桌面端：「摄像头与设备」只给本地用户看真正用得上的两项
        // （摄像头地址 + 设备管理），服务器侧的品牌/限流/维护/语音 Key
        // 全是运维概念，桌面端隐藏。
        if (IS_DESKTOP_APP) {
          return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <CameraSettings />
              <DeviceManagerLauncher />
            </Space>
          )
        }
        return (
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            <BrandingSettings />
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

      case "desktop-about":
        return <DesktopAbout />

      case "devices":
        return <DeviceManager />

      case "desktop-licenses":
        return <DesktopLicensesManager />

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
          colorPrimary: "#059669",
          borderRadius: 6,
          fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, sans-serif)",
          colorBorder: "#EDEEEF",
          colorBorderSecondary: "#F4F4F5",
          colorBgLayout: "#F5F6F7",
          controlHeight: 32,
          controlItemBgHover: "#F4F4F5",
          controlItemBgActive: "#F4F4F5",
          colorText: "#18181B",
          colorTextSecondary: "#646A73",
          colorTextTertiary: "#8F959E",
          fontSize: 13
        },
        components: {
          Layout: {
            headerBg: "#ffffff",
            siderBg: "#FAFAFA",
            bodyBg: "#F5F6F7",
            headerHeight: 56,
            headerPadding: "0 20px"
          },
          Menu: {
            itemBg: "transparent",
            itemSelectedBg: "#F4F4F5",
            itemSelectedColor: "#059669",
            itemHoverBg: "#F4F4F5",
            itemColor: "#18181B",
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
            rowHoverBg: "#FAFAFA",
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
            background: "#FAFAFA",
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
              <Title level={5} style={{ margin: 0, fontWeight: 600, fontSize: 15, whiteSpace: "nowrap", color: "#18181B" }}>
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
            items={(IS_DESKTOP_APP ? desktopSidebarGroups : sidebarGroups).flatMap((group) => {
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
            {/* Left: 返回 + Collapse + Breadcrumb */}
            <Space size={12}>
              {/* 🚨 返回入口（2026-09-17 用户反馈"adminui 页面不能返回上一页"）：
                  桌面端固定回 AI 助手页（用户从「管理设置」进来）；Web 端走历史返回 */}
              <Button
                type="text"
                icon={<IconArrowLeft />}
                onClick={() => (IS_DESKTOP_APP ? router.push("/ai-assistant") : router.back())}
                style={{ fontSize: 13, color: "#18181B" }}
              >
                返回
              </Button>
              <Button
                type="text"
                icon={collapsed ? <IconLayoutTwo /> : <IconLayoutTwo />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: 15, color: "#646A73" }}
              />
              <Breadcrumb
                items={(IS_DESKTOP_APP ? [displayLabel] : meta.breadcrumb).map((b, i, arr) => ({
                  title: i === arr.length - 1 ? (
                    <span style={{ color: "#18181B", fontSize: 13 }}>{b}</span>
                  ) : (
                    <span style={{ color: "#8F959E", fontSize: 13 }}>{b}</span>
                  )
                }))}
              />
            </Space>

            {/* Right: Actions */}
            <Space size={12}>
              {!IS_DESKTOP_APP && (
                <Tooltip title="暂无新通知">
                  <Badge count={0} size="small">
                    <IconRemind style={{ fontSize: 16, color: "#646A73", cursor: "pointer" }} />
                  </Badge>
                </Tooltip>
              )}
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
                    <Avatar size={28} src={currentUser.avatar_url} style={{ background: "#059669", fontSize: 12 }}>
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

        {/* 设备管理弹窗（桌面端「摄像头与设备」入口；监听全局打开事件） */}
        {IS_DESKTOP_APP && (
          <DeviceManagerDialog
            open={deviceManagerOpen}
            onOpenChange={setDeviceManagerOpen}
            canManage={currentUser?.role === "admin" || currentUser?.role === "super_admin"}
          />
        )}
      </Layout>
    </App>
    </ConfigProvider>
  )
}
