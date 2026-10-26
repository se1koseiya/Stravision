"use client"

/**
 * 移动端「设备管理」（2026-10-05 原型重写，对齐原型图3）
 * ---------------------------------------------------------------------------
 * 原型是四个并列列表页：采药设备 / 监控设备 / 控制设备 / 显示设备。
 * 平台侧设备类型只有 4 种（relay / sensor / camera / stepper），
 * 所以这里的分段映射是：
 *   控制设备 → relay + stepper      监控设备 → camera（带视频缩略图位）
 *   显示设备 → sensor（采集读数）   报警设备 → is_critical（原型上的 ⚠ 标记）
 * 「采药设备」是原型的业务叫法，平台无对应类型 —— 不硬造映射，在页面上标为「报警设备」。
 *
 * 铁律：
 *  - 设备真相源 = `/api/devices` + DeviceProvider（`allDevices` 含已禁用）。
 *  - 开关语义是「临时禁用」而不是删除，所以开关切换后设备必须留在列表里变灰。
 *  - 写操作后调 `refreshDevices()`，它会广播 `berry:devices-changed`。
 */

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/lib/ui/feedback"
import { cn } from "@/lib/utils"
import type { RegistryDevice } from "@/lib/contexts/device-context"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { openSettings } from "@/components/settings/global-settings-host"
import {
  EmptyHint,
  MOBILE_CANVAS,
  MobileHeader,
  MobileSearch,
  MiniSwitch,
  Tag,
  hairline,
  mobileCard,
} from "@/components/mobile/mobile-shell"
import { IconCamera, IconCaution, IconEdit, IconMonitor, IconPower, IconSeedling } from "@/components/icon"

type TabKey = "control" | "camera" | "sensor" | "alarm"

const TABS: { key: TabKey; label: string; Icon: any }[] = [
  { key: "control", label: "控制设备", Icon: IconPower },
  { key: "camera", label: "监控设备", Icon: IconCamera },
  { key: "sensor", label: "显示设备", Icon: IconMonitor },
  { key: "alarm", label: "报警设备", Icon: IconCaution },
]

function inTab(d: RegistryDevice, tab: TabKey) {
  switch (tab) {
    case "control":
      return d.type === "relay" || d.type === "stepper"
    case "camera":
      return d.type === "camera"
    case "sensor":
      return d.type === "sensor"
    case "alarm":
      return !!d.is_critical
  }
}

export default function MobileDevicesPage() {
  const router = useRouter()
  // 🚨 useSearchParams() 类型是 `URLSearchParams | null`（无搜索串时为 null）
  const params = useSearchParams()
  const { allDevices, devicesLoading, refreshDevices } = useDeviceData()
  const [tab, setTab] = useState<TabKey>((params?.get("tab") as TabKey) || "control")
  const [q, setQ] = useState("")
  const [busyId, setBusyId] = useState<number | null>(null)

  const list = useMemo(() => {
    const key = q.trim().toLowerCase()
    return allDevices
      .filter((d) => inTab(d, tab))
      .filter((d) => !key || d.name.toLowerCase().includes(key) || String(d.node_id ?? "").toLowerCase().includes(key))
  }, [allDevices, tab, q])

  /**
   * 启停设备 = PATCH /api/devices/:id { is_enabled }
   * 🚨 不是 DELETE：禁用后设备要继续留在列表里变灰并能原地恢复。
   */
  const toggle = async (d: RegistryDevice) => {
    if (!d.is_enabled && busyId != null) return
    setBusyId(d.id)
    try {
      const res = await fetch(`/api/devices/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !d.is_enabled }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || `HTTP ${res.status}`)
      }
      await refreshDevices()
      toast.success(d.is_enabled ? `已停用「${d.name}」` : `已启用「${d.name}」`)
    } catch (e) {
      toast.error(d.is_enabled ? "停用失败" : "启用失败", {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setBusyId(null)
    }
  }

  const activeTab = TABS.find((t) => t.key === tab)!

  return (
    <div className={cn("flex min-h-dvh w-full flex-col", MOBILE_CANVAS)}>
      <MobileHeader title="设备管理" />

      {/* 分段控件：一行四段，不用药丸（药丸 = 四个容器） */}
      <div className="sticky top-[52px] z-20 bg-[#F4F5F6]/92 px-4 py-2 backdrop-blur-lg dark:bg-[#0B0B0C]/92">
        <div className="flex gap-1 rounded-xl bg-zinc-200/60 p-1 dark:bg-white/[0.06]">
          {TABS.map((t) => {
            const on = t.key === tab
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[12px] font-medium transition-colors",
                  on
                    ? "bg-white text-emerald-700 shadow-[0_1px_2px_rgba(16,24,40,0.06)] dark:bg-white/[0.09] dark:text-emerald-400"
                    : "text-zinc-500 dark:text-zinc-400"
                )}
              >
                <t.Icon className="size-3.5 self-center" />
                <span className="self-center">{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <main className="flex flex-1 flex-col gap-3 px-4 pb-28" data-lenis-prevent>
        <MobileSearch value={q} onChange={setQ} placeholder="搜索设备名称" />

        {devicesLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className={cn(mobileCard(), "h-[104px] animate-pulse bg-zinc-100/60 dark:bg-white/[0.03]")} />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyHint
            icon={<activeTab.Icon className="size-8" />}
            text={q ? `没有匹配「${q}」的${activeTab.label}` : `还没有${activeTab.label}`}
          />
        ) : (
          list.map((d) => (
            <DeviceCard
              key={d.id}
              device={d}
              busy={busyId === d.id}
              onToggle={() => void toggle(d)}
              onOpen={() => router.push(`/devices/${d.id}`)}
              onEdit={() => openSettings("devices")}
            />
          ))
        )}
      </main>
    </div>
  )
}

function DeviceCard({
  device: d,
  busy,
  onToggle,
  onOpen,
  onEdit,
}: {
  device: RegistryDevice
  busy: boolean
  onToggle: () => void
  onOpen: () => void
  onEdit: () => void
}) {
  const Icon =
    d.type === "camera" ? IconCamera : d.type === "sensor" ? IconMonitor : d.type === "stepper" ? IconSeedling : IconPower

  const typeLabel =
    d.type === "camera" ? "监控设备" : d.type === "sensor" ? "采集设备" : d.type === "stepper" ? "位控设备" : "控制设备"

  return (
    <div className={cn(mobileCard(), "px-3.5 py-3", !d.is_enabled && "opacity-60")}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <Icon className="size-5" />
        </span>

        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[14px] font-semibold text-zinc-900 dark:text-zinc-50">{d.name}</h3>
            {d.is_critical && <Tag tone="danger">关键</Tag>}
            {!d.is_enabled && <Tag tone="neutral">已禁用</Tag>}
          </div>
          <dl className="mt-1.5 space-y-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
            <MetaRow label="设备类型" value={typeLabel} />
            <MetaRow label="设备分区" value={d.category || "未分区"} />
            {d.node_id && <MetaRow label="设备编号" value={d.node_id} />}
          </dl>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="编辑设备"
              onClick={onEdit}
              className="grid size-7 place-items-center rounded-md text-zinc-400 active:bg-zinc-100 dark:active:bg-white/8"
            >
              <IconEdit className="size-4" />
            </button>
          </div>
          <MiniSwitch checked={d.is_enabled} disabled={busy} label={`${d.name} 启用状态`} onChange={onToggle} />
        </div>
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="shrink-0 text-zinc-400 dark:text-zinc-500">{label}</dt>
      <dd className="min-w-0 truncate">{value}</dd>
    </div>
  )
}
