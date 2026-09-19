"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { IconArrowLeft, IconBill, IconCalendar, IconCheck, IconCrown, IconCurrency, IconInfo, IconKey, IconLightning, IconLoading, IconMagic, IconPeoples, IconRight, IconSettingTwo, IconShield, IconTicket } from "@/components/icon";

import type { UserPublic } from "@/lib/db/user-service"
import { ForceLightTheme } from "@/components/landing-v4/force-light"
import { L, SHADOW } from "@/components/landing-v4/shared"

/* -------------------------------------------------------------------------- */
/* IP 美术资源（中文文件名需 encodeURIComponent）                              */
/* -------------------------------------------------------------------------- */

const asset = (name: string) => `/ip/${encodeURIComponent(name)}`

const IP = {
  wave: asset("草莓头IP-招手姿势.png"),
  dance: asset("草莓头IP-舞蹈姿势.png"),
  jump: asset("草莓头IP-跳跃姿势.png"),
  sit: asset("草莓头IP-坐姿玩手机.png"),
  hello: asset("hello.png"),
  sayhi: asset("sayhi.png"),
} as const

/* -------------------------------------------------------------------------- */
/* 类型                                                                        */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* 套餐视觉配置 —— 落地页 v4（Loomy）令牌                                      */
/* -------------------------------------------------------------------------- */

type TierMeta = {
  label: string
  monthlyQuota: number
  description: string
  /** 徽章底色（Loomy 芯片语言：浅色底 + 墨字） */
  badgeBg: string
  /** 主卡面板底色（薄荷面板系） */
  panel: string
  /** 强调文字色（浅底可读：导航绿 #009456 / 中性灰） */
  accent: string
  /** 进度条填充 */
  bar: string
}

const TIER_META: Record<string, TierMeta> = {
  free: {
    label: "体验版",
    monthlyQuota: 500,
    description: "轻量开启 AI 效率体验",
    badgeBg: "#F0F0F0",
    panel: "#F7F7F7",
    accent: "#696969",
    bar: "linear-gradient(90deg, #D4D4D8 0%, #A1A1AA 100%)",
  },
  pro: {
    label: "Pro 版",
    monthlyQuota: 300,
    description: "日常创作与专业助手的首选",
    badgeBg: "#D8FFE9",
    panel: "#ECFDF2",
    accent: "#009456",
    bar: "linear-gradient(90deg, #7DE9AC 0%, #4ED18F 100%)",
  },
  plus: {
    label: "Plus 版",
    monthlyQuota: 2000,
    description: "高频创作与团队协作的不二之选",
    badgeBg: "#DAF1FF",
    panel: "#E6FDEE",
    accent: "#009456",
    bar: "linear-gradient(90deg, #5EE9B5 0%, #009456 100%)",
  },
}

const COMING_SOON_SECTIONS: NavSection[] = ["members", "billing", "api"]

/* -------------------------------------------------------------------------- */
/* 小工具                                                                      */
/* -------------------------------------------------------------------------- */

const fmt = (n: number, digits = 1) =>
  Number.isFinite(n) ? n.toFixed(digits).replace(/\.0+$/, "") : "0"

const group = (n: number) =>
  Number.isFinite(n) ? Math.round(n).toLocaleString("zh-CN") : "0"

function computeCycleEnd(): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0)
  const yyyy = next.getFullYear()
  const mm = String(next.getMonth() + 1).padStart(2, "0")
  const dd = String(next.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} 23:59:59`
}

/* -------------------------------------------------------------------------- */
/* 页面                                                                        */
/* -------------------------------------------------------------------------- */

export default function SubscriptionPage() {
  const router = useRouter()

  const [appReady, setAppReady] = useState(false)
  const [active, setActive] = useState<NavSection>("plan")
  const [creditInfo, setCreditInfo] = useState<CreditInfo>(null)
  const [user, setUser] = useState<UserPublic | null>(null)
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [redeemCode, setRedeemCode] = useState("")
  const [redeeming, setRedeeming] = useState(false)

  useEffect(() => {
    setAppReady(true)
  }, [])

  useEffect(() => {
    const fallback: CreditInfo = {
      membership: "free",
      monthlyRemaining: TIER_META.free.monthlyQuota,
      monthlyUsed: 0,
      monthlyQuota: TIER_META.free.monthlyQuota,
      balance: 0,
      totalRemaining: TIER_META.free.monthlyQuota,
      canUse: true,
    }

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
        setCreditInfo(settings?.credit ?? fallback)
      } catch {
        setCreditInfo(fallback)
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
  const cycleEnd = useMemo(() => computeCycleEnd(), [])

  const usedPct = quota > 0 ? Math.min(100, Math.max(0, (used / quota) * 100)) : 0
  const isExhausted = quota > 0 && used >= quota
  const isLow = usedPct >= 80 && !isExhausted

  const onUpgrade = () => toast.info("付费升级通道开发中，敬请期待")

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
      const settings = await fetch("/api/user/settings")
        .then((r) => r.json())
        .catch(() => null)
      if (settings?.credit) setCreditInfo(settings.credit)
    } catch {
      toast.error("网络异常，兑换失败")
    } finally {
      setRedeeming(false)
    }
  }

  const navItems = useMemo(
    () => [
      { key: "plan" as const, icon: IconLightning, label: "套餐与用量", hint: "" },
      { key: "members" as const, icon: IconPeoples, label: "成员计划", hint: "即将上线" },
      { key: "billing" as const, icon: IconBill, label: "账单与发票", hint: "即将上线" },
      { key: "api" as const, icon: IconKey, label: "API 管理", hint: "即将上线" },
      { key: "account" as const, icon: IconSettingTwo, label: "账号设置", hint: "" },
    ],
    []
  )

  const handleNav = (key: NavSection) => {
    if (key === "account") {
      router.push("/settings")
      return
    }
    if (COMING_SOON_SECTIONS.includes(key)) {
      toast.info("该模块正在开发中，敬请期待")
      return
    }
    setActive(key)
  }

  const activeLabel = navItems.find((n) => n.key === active)?.label ?? ""

  return (
    <div className="relative min-h-screen bg-white text-[#222222]">
      <ForceLightTheme />

      {/* 环境光 —— 落地页下载区同款双 radial 光斑 */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle at 17% 32%, rgba(218,241,255,0.7) 0%, transparent 38%), radial-gradient(circle at 84% 68%, rgba(225,252,235,0.9) 0%, transparent 40%)",
        }}
      />

      {/* 顶部栏 */}
      <header
        className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-xl"
        style={{ borderColor: L.hairline }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="group inline-flex h-9 items-center gap-1.5 rounded-full border bg-white/70 px-3.5 text-[13px] font-medium text-[#696969] transition-colors hover:text-[#222222] active:scale-95"
              style={{ borderColor: L.line }}
            >
              <IconArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              返回
            </button>
            <div className="h-5 w-px" style={{ background: L.line }} />
            <span className="text-[15px] font-semibold tracking-tight">订阅管理</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden text-right sm:block">
              <div className="text-[13px] font-medium leading-tight">
                {user?.username || "我的账户"}
              </div>
              <div className="text-[11px] leading-tight text-[#696969]">{meta.label}</div>
            </div>
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.username || "avatar"}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0A0A] text-[13px] font-semibold text-white ring-2 ring-white">
                {(user?.username?.[0] || "U").toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 主体 */}
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* 侧边导航 */}
          <nav className="lg:w-56 lg:shrink-0">
            <div className="lg:sticky lg:top-24">
              {/* 移动端：横向滚动胶囊 */}
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide lg:hidden">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = active === item.key
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleNav(item.key)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-all active:scale-95 ${
                        isActive
                          ? "border-transparent bg-[#0A0A0A] text-white"
                          : "bg-white/70 text-[#696969]"
                      }`}
                      style={isActive ? undefined : { borderColor: L.line }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </button>
                  )
                })}
              </div>

              {/* 桌面端：纵向列表 */}
              <div className="hidden lg:block">
                <div
                  className="mb-4 flex items-center gap-2.5 rounded-2xl border p-3"
                  style={{ background: "#ECFDF2", borderColor: "rgba(69,144,103,0.244)" }}
                >
                  <img
                    src={IP.hello}
                    alt=""
                    className="h-10 w-10 rounded-xl object-cover"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold leading-tight">
                      {user?.username || "我的账户"}
                    </div>
                    <div
                      className="text-[11px] font-medium leading-tight"
                      style={{ color: meta.accent }}
                    >
                      {meta.label}
                    </div>
                  </div>
                </div>

                <ul className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = active === item.key
                    return (
                      <li key={item.key}>
                        <button
                          onClick={() => handleNav(item.key)}
                          className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                            isActive ? "bg-white" : "border-transparent hover:bg-black/[0.03]"
                          }`}
                          style={
                            isActive
                              ? { borderColor: "rgba(78,209,143,0.65)" }
                              : { borderColor: "transparent" }
                          }
                        >
                          <Icon
                            className={`h-4 w-4 ${
                              isActive ? "text-[#009456]" : "text-[#696969]"
                            }`}
                          />
                          <span
                            className={`flex-1 ${
                              isActive ? "text-[#222222]" : "text-[#696969]"
                            }`}
                          >
                            {item.label}
                          </span>
                          {isActive ? (
                            <IconCheck className="h-3.5 w-3.5 text-[#009456]" />
                          ) : (
                            item.hint && (
                              <span className="text-[10px] text-[#A9A9A9]">{item.hint}</span>
                            )
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </nav>

          {/* 内容区 */}
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              {!appReady || !creditInfo ? (
                <LoadingSkeleton key="loading" />
              ) : active === "plan" ? (
                <motion.div
                  key="plan"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
                  className="space-y-5"
                >
                  <PlanHero
                    meta={meta}
                    tier={tier}
                    used={used}
                    quota={quota}
                    remaining={remaining}
                    usedPct={usedPct}
                    isLow={isLow}
                    isExhausted={isExhausted}
                    cycleEnd={cycleEnd}
                    onUpgrade={onUpgrade}
                    onRedeem={() => setRedeemOpen(true)}
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <BalanceCard
                      balance={balance}
                      onTopUp={() => toast.info("充值功能开发中，敬请期待")}
                    />
                    <AddonCard tier={tier} onUpgrade={onUpgrade} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
                >
                  <ComingSoon title={activeLabel} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <RedeemModal
        open={redeemOpen}
        code={redeemCode}
        loading={redeeming}
        onCodeChange={setRedeemCode}
        onClose={() => setRedeemOpen(false)}
        onSubmit={onRedeem}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 套餐主卡                                                                    */
/* -------------------------------------------------------------------------- */

function PlanHero({
  meta,
  tier,
  used,
  quota,
  remaining,
  usedPct,
  isLow,
  isExhausted,
  cycleEnd,
  onUpgrade,
  onRedeem,
}: {
  meta: TierMeta
  tier: string
  used: number
  quota: number
  remaining: number
  usedPct: number
  isLow: boolean
  isExhausted: boolean
  cycleEnd: string
  onUpgrade: () => void
  onRedeem: () => void
}) {
  return (
    <section
      className="relative overflow-hidden rounded-[1.75rem] border p-6 sm:p-8"
      style={{ background: meta.panel, borderColor: "rgba(69,144,103,0.244)" }}
    >
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        {/* 左侧信息 */}
        <div className="min-w-0 flex-1">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-black/5 px-2.5 py-1 text-[11px] font-semibold text-[#222222]"
            style={{ background: meta.badgeBg }}
          >
            {tier === "plus" && <IconCrown className="h-3 w-3" />}
            {tier === "pro" && <IconMagic className="h-3 w-3" />}
            {meta.label}
          </span>

          <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
            {meta.label}
          </h1>
          <p className="mt-1.5 text-[13px] text-[#696969]">{meta.description}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {tier !== "plus" && (
              <button
                onClick={onUpgrade}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#0A0A0A] px-5 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]"
                style={{ boxShadow: SHADOW.dark }}
              >
                <IconCrown className="h-4 w-4" />
                {tier === "free" ? "升级 Pro" : "升级 Plus"}
              </button>
            )}
            <button
              onClick={onRedeem}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border bg-white px-5 text-[13px] font-semibold text-[#222222] transition-colors hover:border-black/20 active:scale-[0.97]"
              style={{ borderColor: L.line }}
            >
              <IconTicket className="h-4 w-4" />
              使用兑换卡
            </button>
          </div>
        </div>

        {/* 右侧 IP 形象 —— 入场动画交给外层 motion，浮动动画交给内层 CSS，
            避免两者同时写 transform 打架 */}
        <div className="pointer-events-none hidden shrink-0 select-none sm:block">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
          >
            <img
              src={IP.wave}
              alt=""
              className="h-32 w-32 animate-float object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.12)]"
            />
          </motion.div>
        </div>
      </div>

      {/* 用量 */}
      <div className="relative mt-7 border-t pt-5" style={{ borderColor: "rgba(34,34,34,0.08)" }}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "#4AAF7A" }}
            >
              套餐用量
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-[30px] font-bold leading-none tracking-tight">
                {group(Math.max(0, remaining))}
              </span>
              <span className="text-[13px] font-medium text-[#696969]">
                / {group(quota)} 积分
              </span>
            </div>
          </div>

          <div
            className="inline-flex items-center gap-1.5 rounded-full border bg-white/80 px-3 py-1.5 text-[11px] text-[#696969]"
            style={{ borderColor: "rgba(34,34,34,0.08)" }}
          >
            <IconCalendar className="h-3.5 w-3.5" />
            权益于 {cycleEnd} 刷新
          </div>
        </div>

        {/* 进度条 */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/[0.07]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usedPct}%` }}
            transition={{ duration: 0.9, ease: [0.2, 0, 0, 1], delay: 0.15 }}
            className="h-full rounded-full"
            style={{ background: meta.bar }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]">
          <span className="text-[#696969]">
            已使用 <span className="font-semibold text-[#222222]">{fmt(used)}</span> 积分
          </span>
          <span className="text-[#696969]">
            剩余{" "}
            <span className="font-semibold" style={{ color: meta.accent }}>
              {fmt(remaining)}
            </span>{" "}
            积分
          </span>
          {isExhausted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FEECEC] px-2 py-0.5 font-semibold text-[#D92D20]">
              本月额度已用尽
            </span>
          )}
          {isLow && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4E5] px-2 py-0.5 font-semibold text-[#B54708]">
              额度即将用尽
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* 充值余额                                                                    */
/* -------------------------------------------------------------------------- */

function BalanceCard({ balance, onTopUp }: { balance: number; onTopUp: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.08, ease: [0.2, 0, 0, 1] }}
      className="group relative overflow-hidden rounded-[1.75rem] border bg-white p-5 transition-colors hover:border-black/15"
      style={{ borderColor: L.hairline }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DEFAE8]">
            <IconCurrency className="h-4 w-4 text-[#009456]" />
          </div>
          <h3 className="text-[14px] font-semibold">充值积分余额</h3>
        </div>
        <button
          onClick={onTopUp}
          className="inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-semibold text-[#222222] transition-colors hover:border-black/20 active:scale-95"
          style={{ borderColor: L.line }}
        >
          充值
          <IconRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="text-[13px] font-medium text-[#009456]">+</span>
        <span className="text-[32px] font-bold leading-none tracking-tight">
          {fmt(balance, 2)}
        </span>
        <span className="text-[12px] font-medium text-[#696969]">积分</span>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-[#696969]">
        充值积分不会随月度周期清零，可与套餐额度叠加使用。
      </p>

      <img
        src={IP.sit}
        alt=""
        className="pointer-events-none absolute -bottom-3 -right-3 h-24 w-24 select-none object-contain opacity-90 transition-transform duration-500 group-hover:translate-y-[-4px]"
      />
    </motion.section>
  )
}

/* -------------------------------------------------------------------------- */
/* 加量包                                                                      */
/* -------------------------------------------------------------------------- */

function AddonCard({ tier, onUpgrade }: { tier: string; onUpgrade: () => void }) {
  const locked = tier === "free"

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.14, ease: [0.2, 0, 0, 1] }}
      className="group relative overflow-hidden rounded-[1.75rem] border bg-white p-5 transition-colors hover:border-black/15"
      style={{ borderColor: L.hairline }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DEFAE8]">
            <IconMagic className="h-4 w-4 text-[#009456]" />
          </div>
          <h3 className="text-[14px] font-semibold">加量包</h3>
        </div>
        <div className="group/tip relative">
          <IconInfo className="h-4 w-4 cursor-help text-[#A9A9A9]" />
          <span
            className="pointer-events-none absolute right-0 top-6 z-20 w-56 rounded-lg border bg-white p-2.5 text-[11px] leading-relaxed text-[#383838] opacity-0 shadow-xl transition-opacity group-hover/tip:opacity-100"
            style={{ borderColor: L.line }}
          >
            加量包可在基础额度之外额外购买积分，仅对付费版本（Pro / Plus）开放。
          </span>
        </div>
      </div>

      {locked ? (
        <div className="mt-5">
          <p className="text-[12px] leading-relaxed text-[#696969]">
            免费版暂不可购买加量包。如需更多用量，请先升级至付费版本。
          </p>
          <button
            onClick={onUpgrade}
            className="mt-3.5 inline-flex h-8 items-center gap-1 rounded-full bg-[#0A0A0A] px-3.5 text-[12px] font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          >
            去升级
            <IconRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="mt-5">
          <p className="text-[13px] font-medium">加量包购买即将上线</p>
          <p className="mt-1 text-[12px] text-[#696969]">
            可用 <span className="font-semibold text-[#222222]">0</span> 个
          </p>
          <button
            onClick={() => toast.info("加量包商店开发中，敬请期待")}
            className="mt-3.5 inline-flex h-8 items-center gap-1 rounded-full border px-3.5 text-[12px] font-semibold text-[#222222] transition-colors hover:border-black/20 active:scale-95"
            style={{ borderColor: L.line }}
          >
            查看全部
            <IconRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <img
        src={IP.jump}
        alt=""
        className="pointer-events-none absolute -bottom-2 -right-2 h-24 w-24 select-none object-contain opacity-90 transition-transform duration-500 group-hover:translate-y-[-4px]"
      />
    </motion.section>
  )
}

/* -------------------------------------------------------------------------- */
/* 敬请期待                                                                    */
/* -------------------------------------------------------------------------- */

function ComingSoon({ title }: { title: string }) {
  return (
    <section
      className="flex flex-col items-center justify-center rounded-[1.75rem] border bg-[#FAFFFB] px-6 py-16 text-center"
      style={{ borderColor: L.hairline }}
    >
      <img src={IP.sayhi} alt="" className="h-32 w-32 object-contain" />
      <h3 className="mt-4 text-[16px] font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-[#696969]">
        该模块正在紧锣密鼓地开发中，敬请期待。
      </p>
      <span
        className="mt-5 inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-[11px] font-medium text-[#696969]"
        style={{ borderColor: L.line }}
      >
        <IconShield className="h-3.5 w-3.5 text-[#009456]" />
        上线后会第一时间通知你
      </span>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* 加载骨架                                                                    */
/* -------------------------------------------------------------------------- */

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div
        className="h-64 animate-pulse rounded-[1.75rem] border bg-[#F7F7F7]"
        style={{ borderColor: L.hairline }}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <div
          className="h-52 animate-pulse rounded-[1.75rem] border bg-[#F7F7F7]"
          style={{ borderColor: L.hairline }}
        />
        <div
          className="h-52 animate-pulse rounded-[1.75rem] border bg-[#F7F7F7]"
          style={{ borderColor: L.hairline }}
        />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 兑换卡弹窗                                                                  */
/* -------------------------------------------------------------------------- */

function RedeemModal({
  open,
  code,
  loading,
  onCodeChange,
  onClose,
  onSubmit,
}: {
  open: boolean
  code: string
  loading: boolean
  onCodeChange: (v: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.24, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative w-full max-w-[400px] overflow-hidden rounded-[1.75rem] border bg-white p-6 shadow-2xl"
            style={{ borderColor: L.hairline }}
          >
            <img
              src={IP.dance}
              alt=""
              className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 select-none object-contain opacity-90"
            />

            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DEFAE8]">
                  <IconTicket className="h-4 w-4 text-[#009456]" />
                </div>
                <h2 className="text-[17px] font-bold tracking-tight">使用兑换卡</h2>
              </div>

              <p className="mt-2.5 text-[13px] leading-relaxed text-[#696969]">
                输入兑换码以激活 Plus 会员或加量积分。
              </p>

              <input
                value={code}
                onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && !loading && onSubmit()}
                placeholder="例如 WB-PLUS-XXXX"
                autoFocus
                className="mt-4 h-11 w-full rounded-full border bg-white px-4 font-mono text-[13px] tracking-wide outline-none transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-[#A9A9A9] focus:border-[rgba(78,209,143,0.65)] focus:ring-2 focus:ring-[#4ED18F]/15"
                style={{ borderColor: L.line }}
              />

              <div className="mt-5 flex gap-2.5">
                <button
                  onClick={onClose}
                  className="h-10 flex-1 rounded-full border text-[13px] font-semibold text-[#222222] transition-colors hover:bg-black/[0.03] active:scale-[0.97]"
                  style={{ borderColor: L.line }}
                >
                  取消
                </button>
                <button
                  onClick={onSubmit}
                  disabled={loading || !code.trim()}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#0A0A0A] text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading && <IconLoading className="h-4 w-4 animate-spin" />}
                  {loading ? "兑换中" : "立即兑换"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
