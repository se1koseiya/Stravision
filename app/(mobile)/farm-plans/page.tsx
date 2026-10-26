"use client"

/**
 * 移动端「农事计划」（2026-10-05 原型重写，对齐原型图2 右屏）
 * ---------------------------------------------------------------------------
 * 数据源 = `scheduled_tasks`（真实定时任务）。
 * 🚨 该接口仅 admin/super_admin 可读（任务表无 user_id 隔离），
 *    所以普通用户看到的是「无权限查看」而不是空列表 —— 两者含义不同，不能混。
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { listFarmPlans, type MobileFarmPlan } from "@/components/mobile/mobile-data"
import {
  EmptyHint,
  MOBILE_CANVAS,
  MobileHeader,
  MobileSearch,
  Tag,
  mobileCard,
} from "@/components/mobile/mobile-shell"
import { IconCalendar, IconLock, IconRefresh } from "@/components/icon"

const STATUS_META: Record<MobileFarmPlan["status"], { label: string; tone: "warn" | "neutral" | "ok" }> = {
  pending: { label: "待执行", tone: "warn" },
  expired: { label: "已过期", tone: "neutral" },
  done: { label: "今日已执行", tone: "ok" },
}

export default function MobilePlansPage() {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [plans, setPlans] = useState<MobileFarmPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/scheduler/tasks")
      if (res.status === 401 || res.status === 403) {
        setForbidden(true)
        setPlans([])
        return
      }
      if (!res.ok) {
        setPlans([])
        return
      }
      const json = await res.json()
      const list = Array.isArray(json?.tasks) ? json.tasks : []
      setPlans(listFarmPlans(list))
      setForbidden(false)
    } catch {
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const shown = useMemo(() => {
    const key = q.trim().toLowerCase()
    if (!key) return plans
    return plans.filter((p) => p.title.toLowerCase().includes(key))
  }, [plans, q])

  return (
    <div className={cn("flex min-h-dvh w-full flex-col", MOBILE_CANVAS)}>
      <MobileHeader
        title="农事计划"
        action={
          <button type="button" aria-label="刷新" onClick={() => void load()} className="grid size-9 place-items-center rounded-full active:scale-95 transition-transform">
            <IconRefresh className="size-5" />
          </button>
        }
      />

      <main className="flex flex-1 flex-col gap-3 px-4 pb-28" data-lenis-prevent>
        <MobileSearch value={q} onChange={setQ} placeholder="搜索计划名称" />

        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className={cn(mobileCard(), "h-[124px] animate-pulse bg-zinc-100/60 dark:bg-white/[0.03]")} />
            ))}
          </div>
        ) : forbidden ? (
          <EmptyHint icon={<IconLock className="size-8" />} text="农事计划仅管理员可见" />
        ) : shown.length === 0 ? (
          <EmptyHint
            icon={<IconCalendar className="size-8" />}
            text={q ? `没有匹配「${q}」的计划` : "还没有农事计划"}
          />
        ) : (
          shown.map((p) => (
            <PlanCard key={p.id} plan={p} onOpen={() => router.push(`/farm-plans/${p.id}`)} />
          ))
        )}
      </main>
    </div>
  )
}

function PlanCard({ plan, onOpen }: { plan: MobileFarmPlan; onOpen: () => void }) {
  const meta = STATUS_META[plan.status]
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(mobileCard(), "block w-full px-3.5 py-3.5 text-left active:scale-[0.99] transition-transform")}
    >
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
          {plan.title}
        </h3>
        <Tag tone={meta.tone}>{meta.label}</Tag>
      </div>

      {/* 计划属性：裸排 + 发丝线，不用四个药丸（那会变成四个容器） */}
      <dl className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-zinc-500 dark:text-zinc-400">
        <Field label="方式" value={plan.actionLabel} />
        {plan.cycle && <Field label="周期" value={plan.cycle} />}
      </dl>

      {/* 时间轴：起止都拿不到就不画（不编造时间） */}
      {plan.cycle && (
        <div className="mt-3 flex items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span className="h-px flex-1 bg-emerald-500/30" />
          <span className="size-1.5 shrink-0 rounded-full bg-emerald-500/30" />
          <span className="shrink-0 text-[11px] text-zinc-400">按周期执行</span>
        </div>
      )}
    </button>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1">
      <dt className="text-zinc-400 dark:text-zinc-500">{label}</dt>
      <dd className="text-zinc-700 dark:text-zinc-200">{value}</dd>
    </div>
  )
}
