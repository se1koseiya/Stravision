"use client"

/**
 * 移动端首页 v3 ——「与 PC 同源」（2026-10-05）
 * ---------------------------------------------------------------------------
 * 用户指令：「要跟 PC 端的 UI 联通」。所以这一版不再自创移动端视觉，
 * 而是**直接复用 PC dashboard 的 widget 组件本体**：
 *   - TemperatureWidget / HumidityWidget / SoilWidget / CO2Widget / LightWidget
 *     （size="small"，与 PC 底部一排小卡完全同源：同一材质、同一配色、同一曲线）
 *   - dc-mat 沉浸光感材质（MATERIAL_CSS 已由根布局全局注入；
 *     DASHBOARD_MATERIAL_CSS 是 dashboard 页专属增强，这里补注一次）
 *   - 顶部横幅 = PC top-banner 的移动版（日期块 + 问候 + 天气），不再用绿头
 *   - AI 洞察卡 = PC「AI 智能洞察」卡的移动形态（状态点 + 分级染色）
 *
 * 数据口径：widget 显示**温室实况**（deviceData），顶部横幅显示**室外天气**
 * （weatherData）——来源不同绝不混写。缺读数的 widget 不渲染，不编造。
 */

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { UserPublic } from "@/lib/db/user-service"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDailyInsight } from "@/lib/hooks/use-daily-insight"
import { DASHBOARD_MATERIAL_CSS } from "@/components/dashboard/ios-style/widget-material"
import { TemperatureWidget } from "@/components/dashboard/ios-style/temperature-widget"
import { HumidityWidget } from "@/components/dashboard/ios-style/humidity-widget"
import { SoilWidget } from "@/components/dashboard/ios-style/soil-widget"
import { CO2Widget } from "@/components/dashboard/ios-style/co2-widget"
import { LightWidget } from "@/components/dashboard/ios-style/light-widget"
import { listFarmPlans, listPlots } from "@/components/mobile/mobile-data"
import { MOBILE_CANVAS, SectionTitle, Tag, mobileCard } from "@/components/mobile/mobile-shell"
import {
  IconCalendar,
  IconChartLine,
  IconLocalPin,
  IconMagic,
  IconMapDraw,
  IconMonitor,
  IconRight,
  IconSeedling,
  IconSettingOne,
} from "@/components/icon"

// ---------------------------------------------------------------------------

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
const MONTHS = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]

/** 进行中的农事计划（真实数据来自 scheduled_tasks） */
function useActivePlan() {
  const [plan, setPlan] = useState<{ title: string; cycle: string; count: number } | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch("/api/scheduler/tasks")
        // 🚨 /api/scheduler/tasks 仅 admin 可读（任务表无 user_id 隔离）。
        // 普通用户拿到 401 是「无权限」而非「无数据」——对首页两者都不该占位，统一按没有处理。
        if (!res.ok) {
          if (alive) setPlan(null)
          return
        }
        const json = await res.json()
        const list = Array.isArray(json?.tasks) ? json.tasks : []
        if (!alive) return
        const active = listFarmPlans(list.filter((t: any) => t.is_active))
        if (active.length === 0) {
          setPlan(null)
          return
        }
        setPlan({ title: active[0].title, cycle: active[0].cycle, count: active.length })
      } catch {
        /* 拉不到就当没有，不显示占位 */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return plan
}

/**
 * AI 智能洞察卡 —— PC dashboard「AI 智能洞察」卡的移动形态。
 * 同样的视觉语义：浅绿卡 + 「AI 智能洞察」小标 + 状态点；分级染色一对一。
 */
function InsightCard() {
  const { data, loading, error } = useDailyInsight(true)
  const router = useRouter()

  const risk = error ? "high" : (data?.riskLevel ?? "low")
  const dot =
    risk === "high" ? "bg-red-500" : risk === "medium" ? "bg-amber-500" : "bg-emerald-500"
  const label =
    risk === "high" ? "需要立即处理" : risk === "medium" ? "需要关注" : "一切正常"
  const labelColor =
    risk === "high"
      ? "text-red-600 dark:text-red-400"
      : risk === "medium"
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400"

  const text = loading
    ? "正在读取温室与天气，生成今日洞察…"
    : error
      ? "今日洞察生成失败，点按重试"
      : (data?.insight ?? "")

  return (
    <button
      type="button"
      onClick={() => router.push("/ai-assistant-ios")}
      className={cn(
        "dc-mat dc-mat--regular w-full rounded-[18px] p-4 text-left",
        "flex items-start gap-3 active:scale-[0.99] transition-transform"
      )}
    >
      <span className="grid size-9 shrink-0 self-start place-items-center rounded-full bg-emerald-600 text-white shadow-[0_6px_16px_rgba(5,150,105,0.3)]">
        <IconMagic className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400">AI 智能洞察</span>
          <span className={cn("size-1.5 rounded-full", dot)} />
          <span className={cn("text-[11px] font-medium", labelColor)}>{label}</span>
        </span>
        <span className="mt-1 line-clamp-2 block text-[13px] font-medium leading-[1.45] text-zinc-800 dark:text-zinc-100">
          {text}
        </span>
      </span>
      <IconRight className="size-4 shrink-0 self-center text-zinc-300 dark:text-zinc-600" />
    </button>
  )
}

// ---------------------------------------------------------------------------

export default function MobileHomePage() {
  const router = useRouter()
  const { weatherData } = useWeatherContext()
  const { devices, deviceData, connectionStatus } = useDeviceData()
  const [user, setUser] = useState<UserPublic | null>(null)
  const plan = useActivePlan()
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    // 日期块放 effect 里落值：SSR 与客户端时钟差不会造成 hydration mismatch
    setNow(new Date())
    let alive = true
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me")
        const json = await res.json()
        if (alive && json?.user) setUser(json.user as UserPublic)
      } catch {}
    })()
    return () => {
      alive = false
    }
  }, [])

  const plots = useMemo(() => listPlots(devices), [devices])
  const onlineCount = devices.length

  /* 温室实况（widget 数据源）：有真读数才上卡 */
  const greenTemp = typeof deviceData?.temperature === "number" && Number.isFinite(deviceData.temperature) ? deviceData.temperature : null
  const greenHum = typeof deviceData?.humidity === "number" && Number.isFinite(deviceData.humidity) ? deviceData.humidity : null
  const greenSoil = typeof deviceData?.earth_water === "number" && Number.isFinite(deviceData.earth_water) ? deviceData.earth_water : null
  const greenCo2 = typeof deviceData?.co2 === "number" && Number.isFinite(deviceData.co2) ? deviceData.co2 : null
  const greenLight = typeof deviceData?.light === "number" && Number.isFinite(deviceData.light) ? deviceData.light : null
  const hasAnyWidget = greenTemp != null || greenHum != null || greenSoil != null || greenCo2 != null || greenLight != null

  /* 室外天气（横幅数据源） */
  const outTemp = typeof weatherData?.current?.temp_c === "number" && Number.isFinite(weatherData.current.temp_c)
    ? Math.round(weatherData.current.temp_c)
    : null

  return (
    <div className={cn("min-h-dvh w-full", MOBILE_CANVAS)}>
      {/* dashboard 页专属材质增强（光晕/按压光源）；MATERIAL_CSS 本体已在根布局全局注入 */}
      <style>{DASHBOARD_MATERIAL_CSS}</style>

      <main className="px-4 pb-32 pt-[max(env(safe-area-inset-top),14px)]" data-lenis-prevent>
        {/* ① 顶部横幅 —— PC top-banner 的移动版（同款 dc-mat 白卡 + 日期块 + 问候） */}
        <div className="dc-mat dc-mat--regular flex items-center gap-3.5 rounded-[22px] px-4 py-3.5">
          {/* 日期块：大数字日 + 周几/月，与 PC 横幅同构 */}
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[30px] font-light leading-none tracking-tight text-zinc-900 dark:text-white tabular-nums">
              {now?.getDate() ?? "—"}
            </span>
            <span className="flex flex-col text-[11px] leading-[1.3] text-zinc-500 dark:text-zinc-400">
              <span>{now ? WEEKDAYS[now.getDay()] : ""}</span>
              <span>{now ? MONTHS[now.getMonth()] : ""}</span>
            </span>
          </div>
          <span className="h-8 w-px shrink-0 bg-zinc-200/80 dark:bg-white/10" />
          {/* 问候 + 室外天气 */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-zinc-900 dark:text-white">
              你好，{user?.username ?? "欢迎回来"}
            </p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
              <IconLocalPin className="size-3 self-center" />
              <span className="truncate">
                {weatherData?.location?.name ?? "Stravision 智慧农业"}
                {weatherData?.current?.condition?.text ? ` · ${weatherData.current.condition.text}` : ""}
              </span>
            </p>
          </div>
          {/* 室外温度 / 天气图标 */}
          <div className="flex shrink-0 items-center gap-1.5">
            {weatherData?.current?.condition?.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https:${weatherData.current.condition.icon}`}
                alt={weatherData.current.condition.text}
                className="size-9 object-contain"
              />
            ) : (
              <Image
                src="/ip/智慧农业3D图标-无人机巡检-细线版.png"
                alt=""
                width={36}
                height={36}
                className="size-9 object-contain"
              />
            )}
            {outTemp != null && (
              <span className="text-[18px] font-light leading-none text-zinc-900 dark:text-white tabular-nums">
                {outTemp}°
              </span>
            )}
          </div>
        </div>

        {/* ② AI 智能洞察 */}
        <div className="mt-3">
          <InsightCard />
        </div>

        {/* ③ 温室实况 widget —— PC 组件本体，2 列小卡（同 PC 底部一排） */}
        <section>
          <SectionTitle
            action={
              connectionStatus.connected ? (
                <Tag tone="ok">设备在线</Tag>
              ) : (
                <Tag tone="warn">设备离线</Tag>
              )
            }
          >
            温室实况
          </SectionTitle>

          {hasAnyWidget ? (
            <div className="grid grid-cols-2 gap-3">
              {/* 每格定高：IOSWidgetCard 是 h-full，高度由网格单元给（PC 同款比例） */}
              {greenTemp != null && (
                <div className="h-[136px]">
                  <TemperatureWidget value={greenTemp} size="small" />
                </div>
              )}
              {greenHum != null && (
                <div className="h-[136px]">
                  <HumidityWidget value={greenHum} size="small" />
                </div>
              )}
              {greenSoil != null && (
                <div className="h-[136px]">
                  <SoilWidget moisture={greenSoil} size="small" />
                </div>
              )}
              {greenCo2 != null && (
                <div className="h-[136px]">
                  <CO2Widget value={greenCo2} size="small" />
                </div>
              )}
              {greenLight != null && (
                <div className="h-[136px]">
                  <LightWidget value={greenLight} size="small" />
                </div>
              )}
            </div>
          ) : (
            <div className={mobileCard()}>
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <div className="text-zinc-300 dark:text-zinc-600">
                  <IconSeedling className="size-7" />
                </div>
                <p className="text-[13px] text-zinc-400 dark:text-zinc-500">
                  {connectionStatus.connected ? "温室传感还没有读数" : "设备未连接，联网后自动亮起温室实况"}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ④ 我的地块 */}
        <section>
          <SectionTitle
            action={
              <Link href="/plots" className="flex items-center text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                全部
                <IconRight className="size-3.5 self-center" />
              </Link>
            }
          >
            我的地块
          </SectionTitle>

          {plots.length === 0 ? (
            <div className={mobileCard()}>
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <div className="text-zinc-300 dark:text-zinc-600">
                  <IconSeedling className="size-7" />
                </div>
                <p className="text-[13px] text-zinc-400 dark:text-zinc-500">
                  {connectionStatus.connected ? "还没有地块，去设备管理里添加" : "设备未连接，联网后自动加载地块"}
                </p>
              </div>
            </div>
          ) : (
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
              {plots.map((p) => (
                <Link
                  key={p.id}
                  href={`/plots/${encodeURIComponent(p.id)}`}
                  className="relative w-[150px] shrink-0 snap-start overflow-hidden rounded-2xl bg-emerald-600 p-3.5 text-white shadow-[0_8px_20px_rgba(5,150,105,0.25)] active:scale-[0.97] transition-transform"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(120% 80% at 14% -8%, rgba(255,255,255,0.32), rgba(255,255,255,0) 60%)",
                    }}
                  />
                  <span className="relative block">
                    <span className="block truncate text-[15px] font-semibold leading-tight">{p.name}</span>
                    <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-white/88">
                      <span className="size-1.5 rounded-full bg-emerald-200 shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
                      {onlineCount} 台在线
                    </span>
                    <span className="mt-3 block truncate text-[11px] leading-tight text-white/72">
                      采集 {p.counts.sensor} · 控制 {p.counts.relay}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ⑤ 进行中的农事计划 */}
        {plan && (
          <section>
            <SectionTitle
              action={
                <Link href="/farm-plans" className="flex items-center text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                  全部
                  <IconRight className="size-3.5 self-center" />
                </Link>
              }
            >
              进行中的农事计划
            </SectionTitle>
            <Link
              href="/farm-plans"
              className={cn(mobileCard(), "flex items-center gap-3 px-3.5 py-3.5 active:scale-[0.99] transition-transform")}
            >
              <span className="grid size-10 shrink-0 self-center place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                <IconCalendar className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-zinc-800 dark:text-zinc-100">
                  {plan.title}
                </span>
                {plan.cycle && (
                  <span className="mt-0.5 block truncate text-[12px] text-zinc-500 dark:text-zinc-400">
                    {plan.cycle}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-1 self-center">
                <span className="text-[15px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {plan.count}
                </span>
                <span className="text-[12px] text-zinc-500 dark:text-zinc-400">项</span>
                <IconRight className="size-4 self-center text-zinc-300 dark:text-zinc-600" />
              </span>
            </Link>
          </section>
        )}

        {/* ⑥ 功能宫格 */}
        <section>
          <SectionTitle>常用功能</SectionTitle>
          <div className="grid grid-cols-4 gap-y-3 px-1">
            {[
              { icon: <IconMonitor className="size-5" />, label: "实时监控", to: "/monitor-ios" },
              { icon: <IconChartLine className="size-5" />, label: "环境数据", to: "/dashboard-ios" },
              { icon: <IconMagic className="size-5" />, label: "病害防治", to: "/ai-assistant-ios?prompt=diagnose" },
              { icon: <IconCalendar className="size-5" />, label: "农事计划", to: "/farm-plans" },
              { icon: <IconMapDraw className="size-5" />, label: "地块管理", to: "/plots" },
              { icon: <IconSettingOne className="size-5" />, label: "设备管理", to: "/devices" },
            ].map((e) => (
              <button
                key={e.label}
                type="button"
                onClick={() => router.push(e.to)}
                className="flex flex-col items-center gap-1.5 py-1 active:scale-95 transition-transform"
              >
                <span className="grid size-[46px] place-items-center rounded-2xl bg-white text-emerald-600 shadow-[0_1px_3px_rgba(16,24,40,0.07),0_6px_16px_rgba(5,150,105,0.06)] dark:bg-white/[0.07] dark:text-emerald-400">
                  {e.icon}
                </span>
                <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{e.label}</span>
              </button>
            ))}
          </div>
        </section>

        <p className="mt-7 text-center text-[11px] text-zinc-400 dark:text-zinc-600">
          Stravision 智慧农业
        </p>
      </main>
    </div>
  )
}
