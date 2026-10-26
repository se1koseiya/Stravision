"use client"

/**
 * 环境数据总览（2026-10-05 大改）
 * ---------------------------------------------------------------------------
 * 旧版是「我的大棚」综合页（视频 + 控制 + 环境数据），与 /monitor-ios（视频监控）
 * 职责高度重叠，且玻璃拟态视觉与全站「晨雾松白卡」语言脱节，还是无入口的孤儿页。
 *
 * 本版收敛职责：
 *   - 只做**环境数据总览**：温室实况 widget（与 PC/首页同源）+ 全量传感器读数
 *     （温湿度 / 光照 / CO₂ / 土壤 NPK·EC·水分·温度 / 光谱峰值 / 今日降雨）
 *   - 保留执行设备（relay 5-8）快捷开关横滚（田间高频动作）
 *   - 移除视频直播 + 摄像头配置 Dialog（那是 /monitor-ios 的职责，不再维护两份）
 *   - 视觉统一到 mobile-shell 体系：MOBILE_CANVAS 画布 + mobileCard 一层容器
 *   - 顶部灵动岛避让：pt-[max(env(safe-area-inset-top),14px)]
 *
 * 入口：首页「常用功能」宫格 →「环境数据」。
 * 数据口径：有真读数才渲染，缺读数的格子显示「--」，不编造。
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { useDraggableScroll } from "@/lib/hooks/use-draggable-scroll"
import { cn } from "@/lib/utils"
import {
  MOBILE_CANVAS,
  SectionTitle,
  Tag,
  mobileCard,
} from "@/components/mobile/mobile-shell"
import {
  IconChartLine,
  IconCloudy,
  IconFan,
  IconFire,
  IconLight,
  IconLock,
  IconMedicineChest,
  IconRight,
  IconSeedling,
  IconSun,
  IconThunderbolt,
  IconUnlock,
  IconWater,
} from "@/components/icon"

// ---------------------------------------------------------------------------

type Relay = 5 | 6 | 7 | 8

interface EnvControl {
  id: string
  name: string
  relay: Relay
  icon: string
  color: { bg: string; fg: string }
}

const ICON_MAP: Record<string, typeof IconWater> = {
  Droplets: IconWater,
  Fan: IconFan,
  Lightbulb: IconLight,
  Sun: IconSun,
}

/** 旧版本里 gradFrom/gradTo 渐变字段随本版一并废弃（用户要求去渐变绿） */
const DEFAULT_CONTROLS: EnvControl[] = [
  { id: "relay5", name: "自动灌溉系统", relay: 5, icon: "Droplets", color: { bg: "#E0F2F1", fg: "#009688" } },
  { id: "relay6", name: "智能通风系统", relay: 6, icon: "Fan", color: { bg: "#F4F4F5", fg: "#2196F3" } },
]

const SPECTRAL_CHANNELS = [
  { id: "channel1", label: "Violet" },
  { id: "channel2", label: "Blue" },
  { id: "channel3", label: "Cyan" },
  { id: "channel4", label: "Green" },
  { id: "channel5", label: "Y-G" },
  { id: "channel6", label: "Yellow" },
  { id: "channel7", label: "Orange" },
  { id: "channel8", label: "Red" },
  { id: "channel9", label: "NIR" },
  { id: "channel10", label: "Clear" },
  { id: "channel11", label: "Flicker" },
]

/** 传感器读数卡：mobileCard 一层容器，内容驱动高度（不写死 h） */
function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  unit?: string
  tone: string
}) {
  return (
    <div className={cn(mobileCard(), "flex flex-col gap-2.5 px-4 py-3.5")}>
      <div className="flex items-center gap-2">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", tone)}>
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[22px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-white tabular-nums">
          {value}
        </span>
        {unit && <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{unit}</span>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export default function DashboardIOSPage() {
  const { deviceData, connectionStatus } = useDeviceData()
  const { toggleRelay } = useDeviceControl()
  const { weatherData } = useWeatherContext()
  const controlsScrollRef = useDraggableScroll<HTMLDivElement>()

  const [environmentControls, setEnvironmentControls] = useState<EnvControl[]>([])
  const [lockedControls, setLockedControls] = useState<Record<number, boolean>>({})

  useEffect(() => {
    // 🚨 旧版 localStorage 里存的是带 gradFrom/gradTo 的记录 → 读出来后剥掉渐变字段
    const savedControls = localStorage.getItem("monitor-environment-controls")
    if (savedControls) {
      try {
        const parsed = JSON.parse(savedControls) as any[]
        setEnvironmentControls(
          (Array.isArray(parsed) ? parsed : DEFAULT_CONTROLS).map((c) => ({
            id: String(c.id),
            name: String(c.name),
            relay: c.relay,
            icon: String(c.icon),
            color: { bg: c?.color?.bg ?? "#F4F4F5", fg: c?.color?.fg ?? "#52525B" },
          }))
        )
      } catch {
        setEnvironmentControls(DEFAULT_CONTROLS)
      }
    } else {
      setEnvironmentControls(DEFAULT_CONTROLS)
    }
  }, [])

  const isRelayOn = (relayNum: Relay) => deviceData?.[`relay${relayNum}`] === 1
  const handleToggle = (relayNum: Relay) => {
    if (lockedControls[relayNum]) return
    if (!deviceData) return
    toggleRelay(relayNum, deviceData[`relay${relayNum}`])
  }
  const toggleLock = (relay: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setLockedControls((prev) => ({ ...prev, [relay]: !prev[relay] }))
  }

  // 光谱峰值：11 通道里读数最大的那个（拿不到就是 0，显示「--」）
  let peakLabel = "--"
  let peakValue = 0
  if (deviceData) {
    let best = SPECTRAL_CHANNELS[0]
    let bestVal = -1
    for (const ch of SPECTRAL_CHANNELS) {
      const v = Number((deviceData as any)[ch.id]) || 0
      if (v > bestVal) {
        best = ch
        bestVal = v
      }
    }
    peakLabel = best.label
    peakValue = bestVal
  }
  const todayPrecip = weatherData?.forecast?.forecastday?.[0]?.day?.totalprecip_mm ?? null

  const fmt = (v: number | undefined | null, digits = 1) =>
    typeof v === "number" && Number.isFinite(v) ? v.toFixed(digits) : "--"

  return (
    <div className={cn("min-h-dvh w-full", MOBILE_CANVAS)}>
      <main className="px-4 pb-32 pt-[max(env(safe-area-inset-top),14px)]" data-lenis-prevent>
        {/* ① 标题行：页名 + 设备状态 */}
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900 dark:text-white">环境数据</h1>
            <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">温室传感器实时读数与执行设备</p>
          </div>
          {connectionStatus.connected ? <Tag tone="ok">设备在线</Tag> : <Tag tone="warn">设备离线</Tag>}
        </div>

        {/* ② 执行设备快捷开关 */}
        {environmentControls.length > 0 && (
          <section>
            <SectionTitle>执行设备</SectionTitle>
            <div ref={controlsScrollRef} className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
              {environmentControls.map((ctrl) => {
                const Icon = ICON_MAP[ctrl.icon] ?? IconWater
                const on = isRelayOn(ctrl.relay)
                const isLocked = lockedControls[ctrl.relay]
                return (
                  <button
                    key={ctrl.id}
                    type="button"
                    onClick={() => handleToggle(ctrl.relay)}
                    className={cn(
                      mobileCard(),
                      "w-[152px] shrink-0 p-3.5 text-left active:scale-[0.97] transition-transform",
                      on && "border-emerald-300/70 dark:border-emerald-500/40"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-xl transition-colors",
                          on
                            ? "bg-emerald-600 text-white shadow-[0_6px_16px_rgba(5,150,105,0.25)]"
                            : ""
                        )}
                        style={!on ? { backgroundColor: ctrl.color.bg, color: ctrl.color.fg } : undefined}
                      >
                        <Icon className={cn("size-5", ctrl.relay === 6 && on && "animate-spin")} />
                      </span>
                      <span
                        role="button"
                        aria-label={isLocked ? "解锁" : "锁定"}
                        aria-disabled
                        onClick={(e) => toggleLock(ctrl.relay, e as unknown as React.MouseEvent)}
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-full",
                          isLocked ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" : "text-zinc-300 dark:text-zinc-600"
                        )}
                      >
                        {isLocked ? <IconLock className="size-3.5" /> : <IconUnlock className="size-3.5" />}
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <div className="truncate text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">{ctrl.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className={cn("size-1.5 shrink-0 rounded-full", on ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600")} />
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{on ? "运行中" : "已停止"}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* ③ 温室实况 widget —— 与首页/PC 同源的五格 */}
        <section>
          <SectionTitle>温室实况</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={IconFire} label="空气温度" value={deviceData ? fmt(deviceData.temperature / 10) : "--"} unit="°C" tone="bg-orange-50 text-orange-500 dark:bg-orange-500/10" />
            <StatCard icon={IconMedicineChest} label="空气湿度" value={deviceData ? fmt(deviceData.humidity / 10) : "--"} unit="%" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" />
            <StatCard icon={IconSun} label="光照强度" value={deviceData ? String(deviceData.light ?? "--") : "--"} unit="lux" tone="bg-amber-50 text-amber-600 dark:bg-amber-500/10" />
            <StatCard icon={IconCloudy} label="二氧化碳" value={deviceData ? String(deviceData.co2 ?? "--") : "--"} unit="ppm" tone="bg-teal-50 text-teal-600 dark:bg-teal-500/10" />
            <StatCard icon={IconWater} label="土壤水分" value={deviceData ? fmt(deviceData.earth_water) : "--"} unit="%" tone="bg-sky-50 text-sky-600 dark:bg-sky-500/10" />
            <StatCard icon={IconSeedling} label="土壤温度" value={deviceData ? fmt(deviceData.earth_temp) : "--"} unit="°C" tone="bg-rose-50 text-rose-600 dark:bg-rose-500/10" />
            <StatCard icon={IconThunderbolt} label="土壤电导" value={deviceData ? String(deviceData.earth_ec ?? "--") : "--"} unit="μS/cm" tone="bg-violet-50 text-violet-600 dark:bg-violet-500/10" />
            <StatCard icon={IconChartLine} label="光谱峰值" value={deviceData ? peakLabel : "--"} unit={deviceData ? String(peakValue) : undefined} tone="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10" />
          </div>
        </section>

        {/* ④ 土壤养分 + 降雨 */}
        <section>
          <SectionTitle>土壤养分</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={IconSeedling} label="氮 N" value={deviceData ? String(deviceData.earth_n ?? "--") : "--"} unit="mg/kg" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" />
            <StatCard icon={IconSeedling} label="磷 P" value={deviceData ? String(deviceData.earth_p ?? "--") : "--"} unit="mg/kg" tone="bg-pink-50 text-pink-600 dark:bg-pink-500/10" />
            <StatCard icon={IconSeedling} label="钾 K" value={deviceData ? String(deviceData.earth_k ?? "--") : "--"} unit="mg/kg" tone="bg-amber-50 text-amber-600 dark:bg-amber-500/10" />
          </div>
          <div className="mt-3 grid grid-cols-1">
            <StatCard
              icon={IconCloudy}
              label="今日降雨（室外天气）"
              value={todayPrecip != null ? todayPrecip.toFixed(1) : "--"}
              unit="mm"
              tone="bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10"
            />
          </div>
        </section>

        {/* ⑤ 灯光入口（完整 RGBW 控制台在 /device-control-ios，不在这里重复一份调光逻辑） */}
        <section>
          <SectionTitle>灯光</SectionTitle>
          <LightControlCard />
        </section>

        <p className="mt-7 text-center text-[11px] text-zinc-400 dark:text-zinc-600">
          Stravision 智慧农业 · 环境数据
        </p>
      </main>
    </div>
  )
}

/** 灯光入口卡：跳转完整 RGBW 控制台（/device-control-ios） */
function LightControlCard() {
  const { deviceData, connectionStatus } = useDeviceData()
  const router = useRouter()

  const r = deviceData?.led1 ?? 0
  const g = deviceData?.led2 ?? 0
  const b = deviceData?.led3 ?? 0
  const w = deviceData?.led4 ?? 0

  return (
    <button
      type="button"
      onClick={() => router.push("/device-control-ios")}
      className={cn(mobileCard(), "flex w-full items-center gap-3 px-4 py-3.5 text-left active:scale-[0.99] transition-transform")}
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-[0_6px_16px_rgba(5,150,105,0.2)]"
        style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
      >
        <IconLight className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-zinc-800 dark:text-zinc-100">植物灯光谱调节</span>
        <span className="mt-0.5 block text-[11px] text-zinc-400 dark:text-zinc-500">
          {connectionStatus.connected ? `RGBW ${r}·${g}·${b}·${w} · 点按进入控制台` : "设备离线，暂不能下发"}
        </span>
      </span>
      <IconRight className="size-4 shrink-0 self-center text-zinc-300 dark:text-zinc-600" />
    </button>
  )
}
