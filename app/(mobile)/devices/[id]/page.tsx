"use client"

/**
 * 移动端「设备详情」（2026-10-05 原型重写，对齐原型图4）
 * ---------------------------------------------------------------------------
 * 按设备类型分两种形态：
 *  - camera → 视频 + 云台方向键 + 变焦（原型左屏）
 *  - sensor → 指标网格（原型右屏，2 列，每格：图标 + 名称 + 大数值 + 单位 + 时间戳）
 *  - relay / stepper → 开关 + 位控
 *
 * 数据：
 *  - 注册信息来自 DeviceProvider（`allDevices`）
 *  - 实时读数来自 `deviceData`（旧版固定列）与 `customDeviceData`（自定义设备）
 *  - 走势复用 `components/charts/sparkline.tsx` 的 `SensorSparkline`（唯一源，别手写 SVG）
 */

import { use, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { toast } from "@/lib/ui/feedback"
import { cn } from "@/lib/utils"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import {
  EmptyHint,
  MOBILE_CANVAS,
  MobileHeader,
  MiniSwitch,
  SectionTitle,
  Tag,
  hairline,
  mobileCard,
} from "@/components/mobile/mobile-shell"
import {
  IconCaution,
  IconCloudy,
  IconFire,
  IconLight,
  IconPower,
  IconRotate,
  IconSeedling,
  IconUp,
  IconWater,
  IconZoomIn,
  IconZoomOut,
} from "@/components/icon"

const LiveStreamPlayer = dynamic(() => import("@/components/live-stream-player").then((m) => m.LiveStreamPlayer), {
  ssr: false,
  loading: () => <div className="grid aspect-video place-items-center bg-zinc-900 text-[12px] text-white/60">视频加载中…</div>,
})
const SensorSparkline = dynamic(() => import("@/components/charts/sparkline").then((m) => m.SensorSparkline), {
  ssr: false,
  loading: () => <div className="h-8 w-full animate-pulse rounded bg-zinc-100 dark:bg-white/5" />,
})

/** 设备配置里声明的采集指标（sensor 型的真指标表） */
interface Metric {
  key: string
  label: string
  unit: string
}

/** 旧版固定列 → 指标（自定义设备走 config.metrics，这里只做兜底） */
const LEGACY_METRICS: Metric[] = [
  { key: "temperature", label: "土壤温度", unit: "°C" },
  { key: "humidity", label: "土壤湿度", unit: "%RH" },
  { key: "earth_water", label: "空气湿度", unit: "%RH" },
  { key: "light", label: "光照强度", unit: "Lux" },
  { key: "co2", label: "空气温度", unit: "°C" },
]

export default function MobileDeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { allDevices, deviceData, customDeviceData, refreshDevices } = useDeviceData()
  const { sendCommand, status } = useDeviceControl()
  const [busy, setBusy] = useState(false)

  const device = useMemo(() => allDevices.find((d) => String(d.id) === id) ?? null, [allDevices, id])

  /** 该设备的实时读数：自定义设备优先，其次旧版固定列 */
  const live = useMemo<Record<string, number>>(() => {
    if (!device) return {}
    const custom = customDeviceData[device.id]
    if (custom && typeof custom === "object") {
      const out: Record<string, number> = {}
      for (const [k, v] of Object.entries(custom)) {
        const n = typeof v === "number" ? v : Number(v)
        if (Number.isFinite(n)) out[k] = n
      }
      if (Object.keys(out).length > 0) return out
    }
    return (deviceData ?? {}) as unknown as Record<string, number>
  }, [device, customDeviceData, deviceData])

  const metrics = useMemo<Metric[]>(() => {
    const declared = device?.config?.metrics
    if (Array.isArray(declared) && declared.length > 0) {
      return declared.map((m: any) => ({ key: m.key, label: m.label, unit: m.unit }))
    }
    return LEGACY_METRICS
  }, [device])

  /** 只展示真有读数的指标 —— 没有读数的格子画出来就是「假数据占位」 */
  const visibleMetrics = useMemo(
    () => metrics.filter((m) => typeof live[m.key] === "number" && Number.isFinite(live[m.key])),
    [metrics, live]
  )

  if (!device) {
    return (
      <div className={cn("flex min-h-dvh w-full flex-col", MOBILE_CANVAS)}>
        <MobileHeader title="设备详情" />
        <EmptyHint icon={<IconCaution className="size-8" />} text="设备不存在或已被删除" />
      </div>
    )
  }

  const toggleEnabled = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !device.is_enabled }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || `HTTP ${res.status}`)
      }
      await refreshDevices()
    } catch (e) {
      toast.error("操作失败", { description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  const stepper = async (direction: 0 | 1 | 2, pulses?: number) => {
    const ok = await sendCommand({
      type: "stepper",
      device_id: device.id,
      stepper_direction: direction,
      ...(pulses ? { stepper_pulses: pulses } : {}),
    })
    if (!ok) toast.error("云台指令发送失败")
  }

  return (
    <div className={cn("flex min-h-dvh w-full flex-col", MOBILE_CANVAS)}>
      <MobileHeader title={device.name} onBack={() => router.back()} />

      <main className="flex flex-1 flex-col gap-4 px-4 pb-28" data-lenis-prevent>
        {/* 状态条：一层容器 */}
        <div className={mobileCard("mt-1 flex items-center gap-3 px-3.5 py-3")}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Tag tone={device.is_enabled ? "ok" : "neutral"}>
                {device.is_enabled ? "已启用" : "已禁用"}
              </Tag>
              {device.is_critical && <Tag tone="danger">关键设备</Tag>}
              <Tag tone="neutral">{device.category || "未分区"}</Tag>
            </div>
            {device.node_id && (
              <p className="mt-1.5 truncate text-[12px] text-zinc-500 dark:text-zinc-400">编号 {device.node_id}</p>
            )}
          </div>
          <MiniSwitch
            checked={device.is_enabled}
            disabled={busy}
            label={`${device.name} 启用状态`}
            onChange={toggleEnabled}
          />
        </div>

        {/* camera：视频 + 云台 */}
        {device.type === "camera" && (
          <>
            <div className="overflow-hidden rounded-2xl bg-zinc-900">
              {device.config?.stream_url ? (
                <LiveStreamPlayer
                  sources={[device.config.stream_url]}
                  className="aspect-video w-full"
                  controls
                  muted
                />
              ) : (
                <div className="grid aspect-video place-items-center px-6 text-center">
                  <div>
                    <p className="text-[13px] font-medium text-white/85">未配置视频流地址</p>
                    <p className="mt-1 text-[12px] text-white/50">
                      在设备管理里给这台摄像头填 stream_url 后即可播放
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/*
             * 🚨 这里不要再加 `device.type !== "stepper"` 判断：
             * 本分支整体在 `device.type === "camera"` 里，TS 会把它收窄成恒真并报 TS2367。
             * 云台是「摄像头这台设备之外的独立步进电机」，所以云台盘对 camera 也成立，
             * 而 stepper 设备自己会在下面单独渲染一个位控盘。
             */}
            <div className={mobileCard("px-3.5 py-4")}>
                <p className="mb-3 text-center text-[12px] text-zinc-500 dark:text-zinc-400">云台</p>
                {/* 方向盘：原型是圆形方向盘，这里用 3×3 网格（更易点中，移动端更稳） */}
                <div className="mx-auto grid w-[168px] grid-cols-3 gap-1.5">
                  <span />
                  <PadBtn label="上" onClick={() => void stepper(1, 400)} disabled={status.loading}>
                    <IconUp className="size-4" />
                  </PadBtn>
                  <span />
                  <PadBtn label="左" onClick={() => void stepper(2, 200)} disabled={status.loading}>
                    <IconRotate className="size-4 -rotate-90" />
                  </PadBtn>
                  <PadBtn label="停止" onClick={() => void stepper(0)} disabled={status.loading} tone="brand">
                    <IconPower className="size-4" />
                  </PadBtn>
                  <PadBtn label="右" onClick={() => void stepper(1, 200)} disabled={status.loading}>
                    <IconRotate className="size-4 rotate-90" />
                  </PadBtn>
                  <span />
                  <PadBtn label="下" onClick={() => void stepper(2, 400)} disabled={status.loading}>
                    <IconUp className="size-4 rotate-180" />
                  </PadBtn>
                  <span />
                </div>
            </div>
          </>
        )}

        {/* sensor：指标网格（原型右屏 2 列） */}
        {device.type === "sensor" && (
          <>
            <SectionTitle>实时读数</SectionTitle>
            {visibleMetrics.length === 0 ? (
              <div className={mobileCard()}>
                <EmptyHint icon={<IconSeedling className="size-7" />} text="这台设备还没有上报任何读数" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {visibleMetrics.map((m, i) => {
                  const v = live[m.key]
                  // 🚨 语义色只给异常档：仅明显越界的读数染色，其余一律中性。
                  // 「每格都染色」= 都在喊 = 都没重点。
                  const abnormal = isAbnormal(m.key, v)
                  return (
                    <div
                      key={m.key}
                      className={cn(
                        mobileCard("px-3.5 py-3"),
                        abnormal === "high" && "border-amber-200 dark:border-amber-500/25",
                        abnormal === "low" && "border-red-200 dark:border-red-500/25"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <MetricIcon name={m.key} />
                        <span className="truncate text-[12px] text-zinc-500 dark:text-zinc-400">{m.label}</span>
                      </div>
                      <p className="mt-1.5 flex items-baseline gap-0.5">
                        <span
                          className={cn(
                            "text-[26px] font-semibold leading-none tabular-nums",
                            abnormal === "high"
                              ? "text-amber-600 dark:text-amber-400"
                              : abnormal === "low"
                                ? "text-red-600 dark:text-red-400"
                                : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {format(v)}
                        </span>
                        <span className="text-[11px] text-zinc-400">{m.unit}</span>
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                        {new Date().toLocaleString("zh-CN", { hour12: false })}
                      </p>
                      {i < visibleMetrics.length - 1 && <span className="sr-only">指标分隔</span>}
                    </div>
                  )
                })}
              </div>
            )}

            {/* 走势：复用唯一源组件（模块级 60s 去重缓存） */}
            <SectionTitle>近 7 小时走势</SectionTitle>
            <div className={mobileCard("px-3.5 py-3")}>
              {(["temperature", "humidity", "light", "co2"] as const).map((k) =>
                visibleMetrics.some((m) => m.key === k) ? (
                  <div key={k} className="mb-3 last:mb-0">
                    <p className="mb-1.5 text-[12px] text-zinc-500 dark:text-zinc-400">
                      {metrics.find((m) => m.key === k)?.label ?? k}
                    </p>
                    <SensorSparkline type={k} className="h-8 w-full text-emerald-500" range="7h" />
                  </div>
                ) : null
              )}
            </div>
          </>
        )}

        {/* relay：通道开关 */}
        {device.type === "relay" && (
          <>
            <SectionTitle>控制</SectionTitle>
            <div className={mobileCard("px-3.5 py-3.5")}>
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <IconPower className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-zinc-800 dark:text-zinc-100">{device.name}</p>
                  <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
                    继电器通道 {device.config?.relay_num ?? "—"}
                  </p>
                </div>
                <RelayToggle device={device} />
              </div>
              <p className="mt-3 text-[11px] leading-5 text-zinc-400 dark:text-zinc-500">
                通道开关需要设备在线且你有对应权限；无权限时服务端会直接拒绝。
              </p>
            </div>
          </>
        )}

        {/* stepper：位控 */}
        {device.type === "stepper" && (
          <>
            <SectionTitle>位控</SectionTitle>
            <div className={mobileCard("px-3.5 py-4")}>
              <div className="mx-auto grid w-[168px] grid-cols-3 gap-1.5">
                <span />
                <PadBtn label="正转" onClick={() => void stepper(1, 400)} disabled={status.loading}>
                  <IconUp className="size-4" />
                </PadBtn>
                <span />
                <PadBtn label="左移" onClick={() => void stepper(2, 200)} disabled={status.loading}>
                  <IconRotate className="size-4 -rotate-90" />
                </PadBtn>
                <PadBtn label="停止" onClick={() => void stepper(0)} disabled={status.loading} tone="brand">
                  <IconPower className="size-4" />
                </PadBtn>
                <PadBtn label="右移" onClick={() => void stepper(1, 200)} disabled={status.loading}>
                  <IconRotate className="size-4 rotate-90" />
                </PadBtn>
                <span />
                <PadBtn label="反转" onClick={() => void stepper(2, 400)} disabled={status.loading}>
                  <IconUp className="size-4 rotate-180" />
                </PadBtn>
                <span />
              </div>
            </div>
          </>
        )}

        {/* 注册信息 */}
        <SectionTitle>设备信息</SectionTitle>
        <div className={mobileCard("px-3.5 py-1")}>
          {(
            [
              ["设备类型", { camera: "监控设备", sensor: "采集设备", relay: "控制设备", stepper: "位控设备" }[device.type] ?? device.type],
              ["设备分区", device.category || "未分区"],
              ["设备编号", device.node_id || "—"],
              ["订阅主题", device.subscribe_topic || "—"],
            ] as const
          ).map(([label, value], i, arr) => (
            <div key={label}>
              {i > 0 && hairline()}
              <div className="flex items-start gap-3 py-3">
                <span className="w-20 shrink-0 text-[12px] text-zinc-500 dark:text-zinc-400">{label}</span>
                <span className="min-w-0 flex-1 break-all text-[13px] text-zinc-800 dark:text-zinc-100">{value}</span>
              </div>
              {i === arr.length - 1 && <div className="h-1" />}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------

function format(v: number) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/** 只判明显越界；阈值是草莓温室的常用区间，宁可少染色也不误报 */
function isAbnormal(key: string, v: number): "none" | "high" | "low" {
  const range: Record<string, [number, number]> = {
    temperature: [10, 32],
    earth_temp: [10, 32],
    humidity: [40, 90],
    earth_water: [30, 80],
    co2: [350, 1200],
    light: [100, 60000],
  }
  const r = range[key]
  if (!r) return "none"
  if (v > r[1]) return "high"
  if (v < r[0]) return "low"
  return "none"
}

function MetricIcon({ name }: { name: string }) {
  const map: Record<string, any> = {
    temperature: IconFire,
    earth_temp: IconFire,
    humidity: IconWater,
    earth_water: IconWater,
    light: IconLight,
    co2: IconCloudy,
    earth_ec: IconSeedling,
  }
  const Icon = map[name] ?? IconSeedling
  return <Icon className="size-3.5 shrink-0 self-center text-emerald-600 dark:text-emerald-400" />
}

function PadBtn({
  children,
  label,
  onClick,
  disabled,
  tone = "plain",
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: "plain" | "brand"
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "mx-auto grid size-12 place-items-center rounded-xl active:scale-95 transition-transform",
        tone === "brand"
          ? "bg-emerald-500 text-white shadow-[0_4px_12px_rgba(5,150,105,0.3)]"
          : "bg-zinc-100 text-zinc-600 dark:bg-white/8 dark:text-zinc-300",
        disabled && "opacity-50"
      )}
    >
      {children}
    </button>
  )
}

function RelayToggle({ device }: { device: any }) {
  const { deviceData } = useDeviceData()
  const { sendCommand, status } = useDeviceControl()
  const relayNum = device.config?.relay_num as number | undefined
  const on = relayNum ? (deviceData as any)?.[`relay${relayNum}`] === 1 : false

  return (
    <MiniSwitch
      checked={on}
      disabled={!relayNum || status.loading}
      label={`${device.name} 通道开关`}
      onChange={(next) => {
        void sendCommand({ type: "relay", relayNum: relayNum!, newState: next ? 1 : 0 }).then((ok) => {
          if (!ok) toast.error("指令发送失败")
        })
      }}
    />
  )
}
