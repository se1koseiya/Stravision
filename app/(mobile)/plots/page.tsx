"use client"

/**
 * 移动端「地块管理」（2026-10-05 原型重写，对齐原型图2 左屏）
 * ---------------------------------------------------------------------------
 * 地块来自 `components/mobile/mobile-data.ts` 的派生（devices.category 分组）——
 * 平台目前没有 `farm_plots` 表，所以这里**不编造**面积/作物/地址等字段：
 * 只有真实存在的数据（分区名 + 四类设备计数）才渲染。
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { listPlots } from "@/components/mobile/mobile-data"
import {
  EmptyHint,
  MOBILE_CANVAS,
  MobileHeader,
  MobileSearch,
  mobileCard,
} from "@/components/mobile/mobile-shell"
import { IconCamera, IconMapDraw, IconMonitor, IconSeedling, IconCaution } from "@/components/icon"

export default function MobilePlotsPage() {
  const { allDevices, devicesLoading, connectionStatus } = useDeviceData()
  const [q, setQ] = useState("")

  const plots = useMemo(() => listPlots(allDevices), [allDevices])
  const shown = useMemo(() => {
    const key = q.trim().toLowerCase()
    if (!key) return plots
    return plots.filter((p) => p.name.toLowerCase().includes(key))
  }, [plots, q])

  return (
    <div className={cn("flex min-h-dvh w-full flex-col", MOBILE_CANVAS)}>
      <MobileHeader title="地块管理" />

      <main className="flex flex-1 flex-col gap-3 px-4 pb-28" data-lenis-prevent>
        <MobileSearch value={q} onChange={setQ} placeholder="搜索地块名称" />

        {devicesLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className={cn(mobileCard(), "h-[116px] animate-pulse bg-zinc-100/60 dark:bg-white/[0.03]")} />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyHint
            icon={<IconMapDraw className="size-8" />}
            text={
              q
                ? `没有匹配「${q}」的地块`
                : connectionStatus.connected
                  ? "还没有地块，设备注册表为空"
                  : "设备未连接，联网后自动加载地块"
            }
          />
        ) : (
          shown.map((p) => (
            <Link
              key={p.id}
              href={`/plots/${encodeURIComponent(p.id)}`}
              className={cn(mobileCard(), "block px-3.5 py-3.5 active:scale-[0.99] transition-transform")}
            >
              <div className="flex items-center gap-2">
                <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
                  {p.name}
                </h3>
                {p.counts.alarm > 0 && (
                  <span className="flex shrink-0 items-center gap-0.5 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
                    <IconCaution className="size-3 self-center" />
                    {p.counts.alarm}
                  </span>
                )}
              </div>

              {/* 四枚计数：原型上是四个小格。这里用裸排 + 竖细线，避免「四药丸 = 四容器」 */}
              <div className="mt-3 flex items-stretch">
                <StatCell icon={<IconMonitor className="size-3.5" />} label="采集设备" value={p.counts.sensor} />
                <Divider />
                <StatCell icon={<IconSeedling className="size-3.5" />} label="控制设备" value={p.counts.relay} />
                <Divider />
                <StatCell icon={<IconCamera className="size-3.5" />} label="显示设备" value={p.counts.camera} />
                <Divider />
                <StatCell icon={<IconCaution className="size-3.5" />} label="报警设备" value={p.counts.alarm} />
              </div>
            </Link>
          ))
        )}

        <p className="mt-2 px-1 text-[11px] leading-5 text-zinc-400 dark:text-zinc-600">
          地块由设备分区（category）自动归集，共 {plots.length} 个。
        </p>
      </main>
    </div>
  )
}

function StatCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        {icon}
        <span className="text-[15px] font-semibold leading-none text-zinc-900 dark:text-zinc-50 tabular-nums">
          {value}
        </span>
      </span>
      <span className="truncate text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">{label}</span>
    </div>
  )
}

function Divider() {
  return <span className="w-px shrink-0 bg-zinc-200/70 dark:bg-white/8" aria-hidden />
}
