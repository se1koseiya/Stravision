"use client"

/**
 * 移动端「农事计划详情」（2026-10-05）
 * ---------------------------------------------------------------------------
 * 🚨 与列表页同一个接口 `/api/scheduler/tasks`（仅 admin 可读），
 *    这里按 id 从列表里挑出来 —— 平台目前没有单任务详情端点，
 *    为一个只读展示去新增端点不值当；将来有了直接换成 fetch(`/api/scheduler/tasks/${id}`)。
 */

import { use, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { describeCycle } from "@/components/mobile/mobile-data"
import {
  EmptyHint,
  MOBILE_CANVAS,
  MobileHeader,
  SectionTitle,
  Tag,
  hairline,
  mobileCard,
} from "@/components/mobile/mobile-shell"
import { IconCalendar, IconLock, IconTime } from "@/components/icon"

interface RawTask {
  id: number
  title: string
  action_type: string
  is_active: number
  execute_at?: number | null
  cron_expression?: string | null
  updated_at: number
  last_run_at?: number | null
  last_error?: string | null
  run_status?: string | null
}

const ACTION_LABEL: Record<string, string> = {
  relay: "设备控制",
  led: "补光调节",
  agent: "AI 执行",
  reminder: "仅提醒",
}

function fmt(ts?: number | null) {
  if (!ts) return undefined
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function MobilePlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [task, setTask] = useState<RawTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch("/api/scheduler/tasks")
        if (res.status === 401 || res.status === 403) {
          if (alive) setForbidden(true)
          return
        }
        if (!res.ok) return
        const json = await res.json()
        const list: RawTask[] = Array.isArray(json?.tasks) ? json.tasks : []
        const hit = list.find((t) => String(t.id) === id) ?? null
        if (alive) setTask(hit)
      } catch {
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  const cycle = useMemo(() => (task ? describeCycle(task) : ""), [task])

  return (
    <div className={cn("flex min-h-dvh w-full flex-col", MOBILE_CANVAS)}>
      <MobileHeader title="计划详情" onBack={() => router.back()} />

      <main className="flex flex-1 flex-col px-4 pb-28" data-lenis-prevent>
        {loading ? (
          <div className={cn(mobileCard(), "mt-1 h-[140px] animate-pulse bg-zinc-100/60 dark:bg-white/[0.03]")} />
        ) : forbidden ? (
          <EmptyHint icon={<IconLock className="size-8" />} text="农事计划仅管理员可见" />
        ) : !task ? (
          <EmptyHint icon={<IconCalendar className="size-8" />} text="计划不存在或已被删除" />
        ) : (
          <>
            <div className={mobileCard("mt-1 px-3.5 py-4")}>
              <div className="flex items-center gap-2">
                <h2 className="min-w-0 flex-1 text-[17px] font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
                  {task.title}
                </h2>
                <Tag tone={task.is_active ? "ok" : "neutral"}>{task.is_active ? "运行中" : "已停用"}</Tag>
              </div>

              <dl className="mt-3.5 text-[13px]">
                <Row label="执行方式">{ACTION_LABEL[task.action_type] ?? task.action_type}</Row>
                {cycle && (
                  <>
                    {hairline("my-3")}
                    <Row label="周期">{cycle}</Row>
                  </>
                )}
                {task.last_run_at && (
                  <>
                    {hairline("my-3")}
                    <Row label="上次执行">{fmt(task.last_run_at)}</Row>
                  </>
                )}
                {task.updated_at && (
                  <>
                    {hairline("my-3")}
                    <Row label="更新时间">{fmt(task.updated_at)}</Row>
                  </>
                )}
              </dl>
            </div>

            {/* 执行结果：只有真失败才染红 —— 告警分级升级，正常态保持中性 */}
            {(task.run_status || task.last_error) && (
              <>
                <SectionTitle>执行结果</SectionTitle>
                <div
                  className={cn(
                    mobileCard("px-3.5 py-3"),
                    task.run_status === "failed" && "border-red-200 dark:border-red-500/25"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <IconTime className="size-4 shrink-0 self-center text-zinc-400" />
                    <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-200">
                      {task.run_status === "failed" ? "上次执行失败" : "上次执行成功"}
                    </span>
                  </div>
                  {task.last_error && (
                    <p className="mt-2 break-words text-[12px] leading-5 text-red-600 dark:text-red-400">
                      {task.last_error}
                    </p>
                  )}
                </div>
              </>
            )}

            <p className="mt-5 px-1 text-[11px] leading-5 text-zinc-400 dark:text-zinc-600">
              计划的启停与编辑在 AI 助手里用自然语言完成，例如「把每天 7 点的补光任务停掉」。
            </p>
          </>
        )}
      </main>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-20 shrink-0 text-[12px] text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-zinc-800 dark:text-zinc-100">{children}</dd>
    </div>
  )
}
