"use client"

/**
 * 移动端「地块详情」（2026-10-05，对齐原型图2 左屏的二级页）
 * ---------------------------------------------------------------------------
 * 展示该地块下的设备清单，按类型分组（采集 / 控制 / 显示）。
 * 数据仍来自 devices.category 派生，不新增存储。
 */

import { use, useMemo } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { RegistryDevice } from "@/lib/contexts/device-context"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { listPlots } from "@/components/mobile/mobile-data"
import {
  EmptyHint,
  MOBILE_CANVAS,
  MobileHeader,
  SectionTitle,
  Tag,
  hairline,
  mobileCard,
} from "@/components/mobile/mobile-shell"
import { IconCamera, IconCaution, IconMonitor, IconPower, IconSeedling } from "@/components/icon"

const TYPE_META: Record<string, { label: string; icon: any; href: (id: string) => string }> = {
  sensor: { label: "采集设备", icon: IconMonitor, href: (id) => `/devices/${id}?type=sensor` },
  relay: { label: "控制设备", icon: IconPower, href: (id) => `/devices/${id}?type=relay` },
  camera: { label: "显示设备", icon: IconCamera, href: (id) => `/devices/${id}?type=camera` },
  stepper: { label: "位控设备", icon: IconSeedling, href: (id) => `/devices/${id}?type=stepper` },
}

export default function MobilePlotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Next 16：params 是 Promise，必须 await/ use
  const { id } = use(params)
  const router = useRouter()
  const { allDevices } = useDeviceData()

  const plot = useMemo(() => listPlots(allDevices).find((p) => p.id === id) ?? null, [allDevices, id])

  const groups = useMemo(() => {
    if (!plot) return []
    return Object.keys(TYPE_META)
      .map((t) => ({ type: t, list: plot.devices.filter((d) => d.type === t) }))
      .filter((g) => g.list.length > 0)
  }, [plot])

  if (!plot) {
    return (
      <div className={cn("flex min-h-dvh w-full flex-col", MOBILE_CANVAS)}>
        <MobileHeader title="地块详情" />
        <EmptyHint icon={<IconCaution className="size-8" />} text="地块不存在或设备列表已变更" />
      </div>
    )
  }

  return (
    <div className={cn("flex min-h-dvh w-full flex-col", MOBILE_CANVAS)}>
      <MobileHeader title={plot.name} onBack={() => router.back()} />

      <main className="flex flex-1 flex-col px-4 pb-28" data-lenis-prevent>
        {/* 概览：一层容器，四格裸排 */}
        <div className={mobileCard("mt-1 px-3.5 py-3.5")}>
          <div className="flex items-stretch">
            {(
              [
                { label: "采集", value: plot.counts.sensor },
                { label: "控制", value: plot.counts.relay },
                { label: "显示", value: plot.counts.camera },
                { label: "报警", value: plot.counts.alarm },
              ] as const
            ).map((s, i) => (
              <div key={s.label} className={cn("flex flex-1 flex-col items-center gap-0.5", i > 0 && "border-l border-zinc-200/70 dark:border-white/8")}>
                <span className="text-[20px] font-semibold leading-none text-zinc-900 dark:text-zinc-50 tabular-nums">
                  {s.value}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-zinc-400 dark:text-zinc-500">
            本分区共 {plot.devices.length} 台设备，按设备分区（category）自动归集。
          </p>
        </div>

        {/* 设备分组 */}
        {groups.length === 0 ? (
          <EmptyHint icon={<IconMonitor className="size-8" />} text="该地块下还没有设备" />
        ) : (
          groups.map((g) => {
            const meta = TYPE_META[g.type]
            return (
              <section key={g.type}>
                <SectionTitle>
                  {meta.label}
                  <span className="ml-1.5 text-[12px] font-normal text-zinc-400">{g.list.length}</span>
                </SectionTitle>
                <div className={mobileCard("px-3.5 py-0.5")}>
                  {g.list.map((d, i) => (
                    <div key={d.id}>
                      {i > 0 && hairline()}
                      <button
                        type="button"
                        onClick={() => router.push(meta.href(String(d.id)))}
                        className="flex w-full items-center gap-3 py-3 text-left active:bg-zinc-50 dark:active:bg-white/5 transition-colors"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                          <meta.icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-zinc-800 dark:text-zinc-100">
                            {d.name}
                          </span>
                          {d.node_id && (
                            <span className="mt-0.5 block truncate text-[12px] text-zinc-500 dark:text-zinc-400">
                              {d.node_id}
                            </span>
                          )}
                        </span>
                        {d.is_critical && <Tag tone="danger">关键</Tag>}
                        {!d.is_enabled && <Tag tone="neutral">已禁用</Tag>}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )
          })
        )}
      </main>
    </div>
  )
}
