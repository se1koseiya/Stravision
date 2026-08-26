"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Crown,
  Zap,
  Users as UsersIcon,
  Receipt,
  Key,
  UserCog,
  ArrowRight,
  Ticket,
  Info,
  ArrowUpRight,
} from "lucide-react"
import { toast } from "sonner"

import {
  Layout,
  Menu,
  Card,
  Statistic,
  Progress,
  Tag,
  Button,
  Avatar,
  Space,
  Typography,
  Empty,
  Modal,
  Input,
  Divider,
  App as AntApp,
  Tooltip,
  theme,
} from "antd"

import type { UserPublic } from "@/lib/db/user-service"

const { Sider, Content, Header } = Layout
const { Title, Text } = Typography

type CreditInfo = {
  membership?: string
  monthlyRemaining: number
  monthlyUsed: number
  monthlyQuota: number
  balance: number
  totalRemaining: number
  canUse: boolean
  reason?: string
} | null

type NavSection = "plan" | "members" | "billing" | "api" | "account"

const TIER_META: Record<string, { label: string; color: string; monthlyQuota: number; description: string }> = {
  free: { label: "体验版", color: "default", monthlyQuota: 500, description: "轻量开启 AI 效率体验" },
  pro: { label: "Pro 版", color: "blue", monthlyQuota: 300, description: "日常创作与专业助手的首选" },
  plus: { label: "Plus 版", color: "gold", monthlyQuota: 2000, description: "高频创作与团队协作的不二之选" },
}

export default function SubscriptionPage() {
  const router = useRouter()
  const [appReady, setAppReady] = useState(false)
  const [active, setActive] = useState<NavSection>("plan")
  const [creditInfo, setCreditInfo] = useState<CreditInfo>(null)
  const [user, setUser] = useState<UserPublic | null>(null)
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [redeemCode, setRedeemCode] = useState("")
  const [redeeming, setRedeeming] = useState(false)
  const { token } = theme.useToken()

  useEffect(() => { setAppReady(true) }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [me, settings] = await Promise.all([
          fetch("/api/auth/me").then((r) => r.json()).catch(() => null),
          fetch("/api/user/settings").then((r) => r.json()).catch(() => null),
        ])
        if (!me?.authenticated) {
          router.replace("/login")
          return
        }
        setUser(me.user)
        if (settings?.credit) {
          setCreditInfo(settings.credit)
        } else {
          setCreditInfo({
            membership: "free",
            monthlyRemaining: TIER_META.free.monthlyQuota,
            monthlyUsed: 0,
            monthlyQuota: TIER_META.free.monthlyQuota,
            balance: 0,
            totalRemaining: TIER_META.free.monthlyQuota,
            canUse: true,
          })
        }
      } catch {
        // 失败时保留兜底 free 数据
        setCreditInfo({
          membership: "free",
          monthlyRemaining: TIER_META.free.monthlyQuota,
          monthlyUsed: 0,
          monthlyQuota: TIER_META.free.monthlyQuota,
          balance: 0,
          totalRemaining: TIER_META.free.monthlyQuota,
          canUse: true,
        })
      }
    }
    load()
  }, [router])

  const tier = creditInfo?.membership || "free"
  const meta = TIER_META[tier] ?? TIER_META.free
  const quota = creditInfo?.monthlyQuota ?? meta.monthlyQuota
  const used = creditInfo?.monthlyUsed ?? 0
  const remaining = creditInfo?.monthlyRemaining ?? quota
  const balance = creditInfo?.balance ?? 0
  const cycleEnd = computeCycleEnd()

  const onUpgrade = () => {
    toast.info("付费升级通道开发中，敬请期待")
  }

  const onRedeem = async () => {
    const code = redeemCode.trim()
    if (!code) {
      toast.warning("请输入兑换码")
      return
    }
    setRedeeming(true)
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.message || "兑换失败，请稍后重试")
        return
      }
      toast.success(data?.message || "兑换成功")
      setRedeemCode("")
      setRedeemOpen(false)
      const settings = await fetch("/api/user/settings").then((r) => r.json()).catch(() => null)
      if (settings?.credit) setCreditInfo(settings.credit)
    } catch {
      toast.error("网络异常，兑换失败")
    } finally {
      setRedeeming(false)
    }
  }

  const navItems = [
    { key: "plan", icon: <Zap size={15} />, label: "套餐与用量" },
    { key: "members", icon: <UsersIcon size={15} />, label: "成员计划", disabled: true },
    { key: "billing", icon: <Receipt size={15} />, label: "账单与发票", disabled: true },
    { key: "api", icon: <Key size={15} />, label: "API 管理", disabled: true },
    { key: "account", icon: <UserCog size={15} />, label: "账号设置" },
  ]

  return (
    <AntApp>
      <Layout style={{ minHeight: "100vh" }}>
        {/* 顶部 Header：极简，仅返回 */}
        <Header
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 56,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button type="text" onClick={() => router.back()} icon={<ArrowRight size={14} />}>
              返回对话
            </Button>
            <Divider type="vertical" style={{ height: 20 }} />
            <Text strong style={{ fontSize: 15 }}>
              订阅管理
            </Text>
          </div>
          <Space>
            <Avatar size={32} src={user?.avatar_url} style={{ backgroundColor: token.colorPrimaryBg }}>
              {user?.username?.[0]?.toUpperCase() || "U"}
            </Avatar>
          </Space>
        </Header>

        <Layout>
          {/* 左侧导航 */}
          <Sider
            width={220}
            style={{
              background: token.colorBgContainer,
              borderRight: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <div style={{ padding: "16px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 8 }}>
                <Avatar size={36} src={user?.avatar_url} style={{ backgroundColor: token.colorPrimaryBg }}>
                  {user?.username?.[0]?.toUpperCase() || "U"}
                </Avatar>
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{user?.username || "我的账户"}</div>
                  <Tag color={meta.color} bordered={false} style={{ margin: "4px 0 0", fontSize: 11 }}>
                    {meta.label}
                  </Tag>
                </div>
              </div>
            </div>
            <Menu
              mode="inline"
              selectedKeys={[active]}
              onClick={(e) => {
                const key = String(e.key) as NavSection
                if (key === "account") {
                  router.push("/settings")
                  return
                }
                if (key === "members" || key === "billing" || key === "api") {
                  toast.info("该模块正在开发中，敬请期待")
                  return
                }
                setActive(key)
              }}
              style={{ border: "none", background: "transparent" }}
              items={navItems.map((it) => ({
                key: it.key,
                icon: it.icon,
                label: it.label,
                disabled: it.disabled,
              }))}
            />
          </Sider>

          {/* 主区 */}
          <Content style={{ padding: "32px 40px", background: token.colorBgLayout, maxWidth: 960 }}>
            {active === "plan" && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <Title level={3} style={{ margin: 0 }}>
                    套餐与用量
                  </Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    查看您的订阅计划、用量及权益信息
                  </Text>
                </div>

                {/* 当前套餐 + 兑换卡 */}
                <Card
                  bordered={false}
                  style={{ marginBottom: 16, borderRadius: 12 }}
                  styles={{ body: { padding: 24 } }}
                  extra={
                    <Button icon={<Ticket size={14} />} onClick={() => setRedeemOpen(true)}>
                      使用兑换卡
                    </Button>
                  }
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
                    <div>
                      <Space size="small" style={{ marginBottom: 4 }}>
                        <Tag color={meta.color} bordered={false} style={{ fontSize: 12 }}>
                          {meta.label}
                        </Tag>
                      </Space>
                      <Title level={2} style={{ margin: "4px 0" }}>
                        {meta.label}
                      </Title>
                      <Text type="secondary">{meta.description}</Text>
                    </div>
                    {tier !== "plus" && (
                      <Button
                        type="primary"
                        size="large"
                        icon={<Crown size={15} />}
                        onClick={onUpgrade}
                      >
                        {tier === "free" ? "升级 Pro" : "升级 Plus"}
                      </Button>
                    )}
                  </div>

                  {/* 套餐用量 */}
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      套餐用量
                    </Text>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <Statistic
                        value={Math.max(0, quota - used)}
                        precision={1}
                        suffix={
                          <span style={{ fontSize: 14, color: token.colorTextSecondary, fontWeight: 400 }}>
                            {" "}/ {quota} 积分
                          </span>
                        }
                        valueStyle={{ fontSize: 24, fontWeight: 500 }}
                      />
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      下次权益周期更新时间：{cycleEnd}
                    </Text>
                  </div>
                  <Progress
                    percent={quota > 0 ? Math.min(100, (used / quota) * 100) : 0}
                    showInfo={false}
                    strokeColor={used >= quota ? token.colorError : token.colorPrimary}
                    size={{ height: 6 }}
                  />
                  <div style={{ marginTop: 12, fontSize: 12, color: token.colorTextSecondary }}>
                    本月已使用 <strong style={{ color: token.colorText }}>{used.toFixed(1)}</strong> 积分 · 剩余{" "}
                    <strong style={{ color: token.colorPrimary }}>{remaining.toFixed(1)}</strong> 积分
                  </div>
                </Card>

                {/* 充值余额 */}
                <Card
                  bordered={false}
                  style={{ marginBottom: 16, borderRadius: 12 }}
                  styles={{ body: { padding: 24 } }}
                  title={<Text strong style={{ fontSize: 14 }}>充值积分余额</Text>}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Statistic
                      value={balance}
                      precision={2}
                      prefix={<span style={{ color: token.colorTextSecondary, marginRight: 4 }}>+</span>}
                      suffix={<span style={{ fontSize: 14, color: token.colorTextSecondary, fontWeight: 400 }}>积分</span>}
                      valueStyle={{ fontSize: 28, fontWeight: 500 }}
                    />
                    <Button onClick={() => toast.info("充值功能开发中，敬请期待")}>充值</Button>
                  </div>
                </Card>

                {/* 加量包 */}
                <Card
                  bordered={false}
                  style={{ borderRadius: 12 }}
                  styles={{ body: { padding: 24 } }}
                  title={
                    <Space size={6}>
                      <Text strong style={{ fontSize: 14 }}>加量包</Text>
                      <Tooltip
                        title="加量包可在基础额度之外额外购买积分。仅对付费版本（Pro / Plus）开放。"
                      >
                        <Info size={14} style={{ color: token.colorTextTertiary, cursor: "help" }} />
                      </Tooltip>
                    </Space>
                  }
                >
                  {tier === "free" ? (
                    <div style={{ fontSize: 13, color: token.colorTextSecondary }}>
                      <span>免费版暂不可购买加量包。如需更多用量，请先升级至付费版本，</span>
                      <Button type="link" size="small" onClick={onUpgrade} style={{ padding: 0 }}>
                        去升级 <ArrowRight size={12} style={{ marginLeft: 2 }} />
                      </Button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <Text style={{ fontSize: 13 }}>加量包购买即将上线</Text>
                        <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 4 }}>
                          可用 <strong>0</strong> 个 · 剩余 <strong>{balance.toFixed(2)}</strong> 积分
                        </div>
                      </div>
                      <Button
                        icon={<ArrowUpRight size={14} />}
                        onClick={() => toast.info("加量包商店开发中，敬请期待")}
                      >
                        查看全部
                      </Button>
                    </div>
                  )}
                </Card>
              </>
            )}

            {active !== "plan" && active !== "account" && (
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div style={{ marginTop: 8 }}>
                      <Text strong style={{ fontSize: 14 }}>
                        {navItems.find((n) => n.key === active)?.label}
                      </Text>
                      <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 4 }}>
                        该模块正在开发中，敬请期待
                      </div>
                    </div>
                  }
                />
              </Card>
            )}
          </Content>
        </Layout>
      </Layout>

      {/* 兑换卡 Modal */}
      <Modal
        title={
          <Space>
            <Ticket size={16} style={{ color: token.colorPrimary }} />
            <span>使用兑换卡</span>
          </Space>
        }
        open={redeemOpen}
        onCancel={() => setRedeemOpen(false)}
        footer={null}
        width={420}
        destroyOnClose
      >
        <p style={{ color: token.colorTextSecondary, fontSize: 13 }}>
          输入兑换码以激活 Plus 会员或加量积分
        </p>
        <Input
          value={redeemCode}
          onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
          placeholder="请输入兑换码，例如 WB-PLUS-XXXX"
          size="large"
          style={{ fontFamily: "monospace" }}
          onPressEnter={onRedeem}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Button block onClick={() => setRedeemOpen(false)}>
            取消
          </Button>
          <Button block type="primary" loading={redeeming} onClick={onRedeem}>
            立即兑换
          </Button>
        </div>
      </Modal>

      {!appReady && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: token.colorBgLayout,
          }}
        >
          加载中…
        </div>
      )}
    </AntApp>
  )
}

function computeCycleEnd(): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0)
  const yyyy = next.getFullYear()
  const mm = String(next.getMonth() + 1).padStart(2, "0")
  const dd = String(next.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} 23:59:59`
}