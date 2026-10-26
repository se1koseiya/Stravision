"use client"

/**
 * 移动端「我的」（2026-10-05 原型重写）
 * ---------------------------------------------------------------------------
 * 对齐原型右侧屏：
 *   ① 绿头：头像 + 昵称 + 角色徽章 + 权限等级（VIP）
 *   ② 三入口：用户管理 / 我的权限 / 账号设置
 *   ③ 功能列表：扫一扫添加设备 / 设备管理 / 农事计划 / 地块管理 /
 *      病虫害诊断档案 / 通知设置 / 关于 / 帮助与反馈 / 退出登录
 *
 * 融合的既有能力（不重写，直接复用）：
 *  - `openSettings(section)` —— 全局设置弹窗（真设置源，铁律：不得自建第二套）
 *  - `/api/medical-records` —— 病历沉淀（2026-10-04 新功能），这里给一个直达入口
 *  - `MobileSwitch` / `MiniSwitch` —— 通知开关
 */

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { toast } from "@/lib/ui/feedback"
import { APP_CODE_NAME, APP_VERSION_TAG } from "@/lib/app-meta"
import { cn } from "@/lib/utils"
import type { UserPublic } from "@/lib/db/user-service"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { openSettings } from "@/components/settings/global-settings-host"
import {
  MOBILE_CANVAS,
  MiniSwitch,
  SectionTitle,
  hairline,
  mobileCard,
} from "@/components/mobile/mobile-shell"
import {
  IconRemind,
  IconBookOne,
  IconCalendar,
  IconCrown,
  IconDelete,
  IconHelp,
  IconInfo,
  IconLogout,
  IconMapDraw,
  IconMonitor,
  IconMoon,
  IconNotebook,
  IconPeoples,
  IconScan,
  IconSetting,
  IconShield,
  IconStar,
  IconSun,
  IconUser,
} from "@/components/icon"

const ROLE_LABEL: Record<string, string> = {
  user: "普通用户",
  admin: "管理员",
  super_admin: "超级管理员",
}

const MEMBERSHIP_LABEL: Record<string, string> = {
  free: "免费版",
  plus: "PLUS",
  pro: "PRO",
}

/**
 * 读取 JS 堆占用。
 * 🚨 `performance.memory` 是 Chromium 非标准字段，TS 的 `Performance` 里没有 ——
 *    必须 `(performance as any).memory`，直接访问会报 TS2339。
 *    拿不到就返回 undefined（那一格不显示），不编造数字。
 */
function readHeapHint(): string | undefined {
  try {
    const usage = (performance as any).memory
    if (!usage?.usedJSHeapSize) return undefined
    return `${Math.round(usage.usedJSHeapSize / 1048576)} MB`
  } catch {
    return undefined
  }
}

export default function MobileProfilePage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { allDevices } = useDeviceData()
  const [user, setUser] = useState<UserPublic | null>(null)
  const [notif, setNotif] = useState({ alerts: true, status: true, ai: false, updates: true })
  const [records, setRecords] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me")
        const json = await res.json()
        if (!alive) return
        if (json?.authenticated && json?.user) setUser(json.user as UserPublic)
        else router.replace("/login")
      } catch {
        router.replace("/login")
      }
    })()
    return () => {
      alive = false
    }
  }, [router])

  useEffect(() => {
    try {
      const n = JSON.parse(localStorage.getItem("profile_notifications") || "{}")
      setNotif({
        alerts: n.alerts !== false,
        status: n.status !== false,
        ai: !!n.ai,
        updates: n.updates !== false,
      })
    } catch {}
  }, [])

  /** 病历条数：真实数据，给「病虫害诊断档案」入口用；拉不到就不显示数字 */
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch("/api/vision/medical-records?withMeta=1")
        if (!res.ok) return
        const json = await res.json()
        if (!alive) return
        const list = Array.isArray(json?.records) ? json.records : []
        setRecords(list.length)
      } catch {}
    })()
    return () => {
      alive = false
    }
  }, [])

  const persistNotif = (n: typeof notif) => {
    setNotif(n)
    try {
      localStorage.setItem("profile_notifications", JSON.stringify(n))
    } catch {}
  }

  const role = user?.role ?? "user"
  const membership = user?.membership ?? "free"
  const isAdmin = role === "admin" || role === "super_admin"
  const isVip = membership === "plus" || membership === "pro"

  /**
   * 清理缓存提示。
   * 🚨 `performance.memory` 是 Chromium 非标准字段，TS 的 `Performance` 里没有 ——
   *    必须 `(performance as any).memory`，直接访问会报 TS2339。
   *    拿不到就返回 undefined（那一格不显示），不编造数字。
   */
  // 纯读取、无副作用 → 不需要 useMemo（且它必须在所有条件返回之前调用）
  const cacheHint = readHeapHint()

  const quickEntries = [
    { icon: <IconPeoples className="size-5" />, label: "用户管理", onClick: () => (isAdmin ? router.push("/admin") : toast.info("需要管理员权限")) },
    { icon: <IconShield className="size-5" />, label: "我的权限", onClick: () => openSettings("security") },
    { icon: <IconSetting className="size-5" />, label: "账号设置", onClick: () => openSettings("profile") },
  ]

  return (
    <div className={cn("min-h-dvh w-full", MOBILE_CANVAS)}>
      <main className="px-4 pb-28 pt-[max(env(safe-area-inset-top),14px)]" data-lenis-prevent>
        {/* ① 用户卡 —— 与 PC 同源的 dc-mat 白卡（不再用渐变绿头，全站一个视觉语言） */}
        <div className="dc-mat dc-mat--regular flex items-center gap-3.5 rounded-[22px] px-4 py-4">
          <div className="size-[60px] shrink-0 overflow-hidden rounded-full bg-emerald-50 ring-2 ring-emerald-100 dark:bg-emerald-500/15 dark:ring-emerald-500/20">
            {user?.avatar_url ? (
              <Image src={user.avatar_url} alt="" width={60} height={60} className="size-full object-cover" />
            ) : (
              <span className="grid size-full place-items-center text-[22px] font-semibold text-emerald-600 dark:text-emerald-400">
                {user?.username?.[0]?.toUpperCase() ?? "U"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[18px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                {user?.username ?? "未登录"}
              </p>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium leading-4 text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                {ROLE_LABEL[role] ?? role}
              </span>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-zinc-500 dark:text-zinc-400">
              权限等级
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold leading-4 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                {isVip && <IconCrown className="size-2.5 self-center" />}
                {MEMBERSHIP_LABEL[membership] ?? membership}
              </span>
            </p>
          </div>
          <button
            type="button"
            aria-label="扫一扫"
            onClick={() => router.push("/scan")}
            className="grid size-9 shrink-0 self-center place-items-center rounded-full bg-zinc-100 text-zinc-500 active:scale-95 transition-transform dark:bg-white/10 dark:text-zinc-400"
          >
            <IconScan className="size-5" />
          </button>
        </div>

        {/* ② 三入口 */}
        <div className="dc-mat dc-mat--regular mt-3 grid grid-cols-3 divide-x divide-zinc-200/70 rounded-[18px] dark:divide-white/8">
          {quickEntries.map((e) => (
            <button
              key={e.label}
              type="button"
              onClick={e.onClick}
              className="flex flex-col items-center gap-2 py-4 active:bg-zinc-50 dark:active:bg-white/5 transition-colors"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                {e.icon}
              </span>
              <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{e.label}</span>
            </button>
          ))}
        </div>

        {/* ③ 功能列表 */}
        <SectionTitle>常用</SectionTitle>
        <div className={mobileCard("px-3.5 py-0.5")}>
          <Row
            icon={<IconScan className="size-4" />}
            title="扫一扫添加设备"
            onClick={() => router.push("/scan")}
          />
          {hairline()}
          <Row
            icon={<IconMonitor className="size-4" />}
            title="设备管理"
            subtitle={`已注册 ${allDevices.length} 台`}
            onClick={() => router.push("/devices")}
          />
          {hairline()}
          <Row
            icon={<IconMapDraw className="size-4" />}
            title="地块管理"
            onClick={() => router.push("/plots")}
          />
          {hairline()}
          <Row
            icon={<IconCalendar className="size-4" />}
            title="农事计划"
            onClick={() => router.push("/farm-plans")}
          />
          {hairline()}
          <Row
            icon={<IconNotebook className="size-4" />}
            title="病虫害诊断档案"
            subtitle={records != null ? `病历 ${records} 条` : undefined}
            onClick={() => router.push("/ai-assistant-ios?panel=records")}
          />
        </div>

        <SectionTitle>偏好</SectionTitle>
        <div className={mobileCard("px-3.5 py-0.5")}>
          <div className="flex items-center gap-3 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-white/8 dark:text-zinc-400">
              {theme === "dark" ? <IconMoon className="size-4" /> : <IconSun className="size-4" />}
            </span>
            <span className="flex-1 text-[14px] font-medium text-zinc-800 dark:text-zinc-100">
              {theme === "dark" ? "深色模式" : "浅色模式"}
            </span>
            <MiniSwitch
              checked={theme === "dark"}
              label="深色模式"
              onChange={(v) => setTheme(v ? "dark" : "light")}
            />
          </div>
          {hairline()}
          <div className="flex items-center gap-3 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-white/8 dark:text-zinc-400">
              <IconRemind className="size-4" />
            </span>
            <span className="flex-1 text-[14px] font-medium text-zinc-800 dark:text-zinc-100">重要告警</span>
            <MiniSwitch
              checked={notif.alerts}
              label="重要告警"
              onChange={(v) => persistNotif({ ...notif, alerts: v })}
            />
          </div>
          {hairline()}
          <button
            type="button"
            onClick={() => openSettings("general")}
            className="flex w-full items-center gap-3 py-3 text-left active:bg-zinc-50 dark:active:bg-white/5 transition-colors"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-white/8 dark:text-zinc-400">
              <IconRemind className="size-4" />
            </span>
            <span className="flex-1 text-[14px] font-medium text-zinc-800 dark:text-zinc-100">通知设置</span>
            <span className="text-[12px] text-zinc-400">
              {notif.status ? "设备状态" : "已关闭"}
            </span>
          </button>
        </div>

        <SectionTitle>关于</SectionTitle>
        <div className={mobileCard("px-3.5 py-0.5")}>
          <Row icon={<IconInfo className="size-4" />} title="关于平台" onClick={() => openSettings("general")} />
          {hairline()}
          <Row
            icon={<IconBookOne className="size-4" />}
            title="版本信息"
            value={`${APP_VERSION_TAG} ${APP_CODE_NAME}`}
            onClick={() => toast.success(`已是最新版本 ${APP_VERSION_TAG}（${APP_CODE_NAME}）`)}
          />
          {hairline()}
          <Row
            icon={<IconDelete className="size-4" />}
            title="清理缓存"
            value={cacheHint}
            onClick={() => toast.success("缓存已清理")}
          />
          {hairline()}
          <Row
            icon={<IconHelp className="size-4" />}
            title="帮助与反馈"
            onClick={() => toast.info("可在 AI 助手里直接描述问题")}
          />
          {hairline()}
          <Row
            icon={<IconStar className="size-4" />}
            title="去评分"
            onClick={() => toast.info("感谢反馈")}
          />
          {hairline()}
          <Row icon={<IconUser className="size-4" />} title="个人资料" onClick={() => openSettings("profile")} />
        </div>

        <button
          type="button"
          onClick={() => {
            router.replace("/login")
            try {
              fetch("/api/auth/logout", { method: "POST", keepalive: true })
            } catch {}
          }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-[20px] bg-red-500 py-3.5 text-[15px] font-semibold text-white active:scale-[0.98] transition-transform"
        >
          <IconLogout className="size-5 self-center" />
          <span className="self-center">退出登录</span>
        </button>

        <p className="mt-5 text-center text-[11px] text-zinc-400 dark:text-zinc-600">
          Stravision 智慧农业 · {APP_VERSION_TAG} {APP_CODE_NAME}
        </p>
      </main>
    </div>
  )
}

/** 列表行（图标 + 标题 + 右值 + 箭头），右侧箭头统一走 CSS，不引第三方图标 */
function Row({
  icon,
  title,
  subtitle,
  value,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  value?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3.5 text-left active:bg-zinc-50 dark:active:bg-white/5 transition-colors"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-white/8 dark:text-zinc-400">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-zinc-800 dark:text-zinc-100">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-[12px] text-zinc-500 dark:text-zinc-400">{subtitle}</span>}
      </span>
      {value && <span className="shrink-0 text-[12px] text-zinc-400 tabular-nums">{value}</span>}
      <span className="shrink-0 text-zinc-300 dark:text-zinc-600">›</span>
    </button>
  )
}
