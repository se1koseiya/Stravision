"use client"

/**
 * 病历侧边面板 —— AI 助手内的「诊断沉淀 + 复诊闭环」
 *
 * 与「我的空间 / 知识库」同一套浮层壳（`fixed z-[150] top-3 right-3 bottom-3`，
 * 侧栏展开时 left-[272px]，收起时 left-3），因此在 AI 助手里是一个**并列入口**，
 * 而不是跳去另一个页面。
 *
 * 布局：**主从双栏**（不是再套一层抽屉）。
 *   窄屏 / 未选中医病 → 只有列表铺满；
 *   选中医病 → 列表收成 400px 左栏 + 右侧详情，窄屏下详情覆盖列表（带返回）。
 *   之所以不用抽屉：面板本身已经是浮层，抽屉套浮层会出现「浮层里再开一层」的
 *   视觉噪声，且复诊时间轴与诊断快照需要纵向空间。
 *
 * ── 视觉约束（沿用诊断卡那轮定下的口径）──
 * · 色系 emerald × zinc；**只有「待处置」染色**（琥珀），其余状态保持中性 ——
 *   强调来自对比，四档都染色 = 都在喊 = 没重点。
 * · 不套圆角矩形套圆角矩形：分组走 hairline 分隔 + 留白。
 * · 疗效四档：恶化=红 / 无变化=琥珀 / 好转=翠绿 / 痊愈=翠绿实心（靠"实心"区分，不发明新色相）。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/illustration"
import { DiagnosisCard } from "@/components/ai/diagnosis-card"
import { Sparkline } from "@/components/charts/sparkline"
import { downscaleToDataUrl } from "@/lib/vision/downscale-image"
import { getSeverityMeta, type DiseaseCategory } from "@/lib/types/vision-diagnosis"
import {
  EFFICACY_META,
  RECORD_STATUS_META,
  SEVERITY_INDEX,
  type FollowUpEfficacy,
  type MedicalRecordDetail,
  type MedicalRecordStats,
  type MedicalRecordStatus,
  type MedicalRecordSummary,
} from "@/lib/types/medical-record"
import {
  IconAttention,
  IconCamera,
  IconCheck,
  IconClose,
  IconDelete,
  IconEdit,
  IconHistory,
  IconLeaf,
  IconLeft,
  IconLoading,
  IconNotebook,
  IconRefresh,
  IconRight,
  IconSearch,
  IconShieldCheck,
  IconTime,
} from "@/components/icon"

export interface MedicalRecordsPanelProps {
  open: boolean
  onClose: () => void
  darkMode?: boolean
  /** sidebar 是否展开；收起时面板 left 收缩到 12px */
  sidebarOpen?: boolean
  onExpandSidebar?: () => void
  onNewChat?: () => void
}

const HAIRLINE = "border-zinc-900/[0.06] dark:border-white/10"
const OPEN_COLOR = "#D97706"

const STATUS_ORDER: Array<MedicalRecordStatus | "all"> = ["all", "open", "treating", "resolved", "archived"]

const CATEGORY_LABEL: Record<DiseaseCategory, string> = {
  fungal: "真菌性",
  bacterial: "细菌性",
  viral: "病毒性",
  pest: "虫害",
  physiological: "生理性",
  nutrient: "营养失调",
  unknown: "信息不足",
}

const pad2 = (n: number) => String(n).padStart(2, "0")

function formatDate(ts: number | null): string {
  if (!ts) return "—"
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return "—"
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function formatDateTime(ts: number | null): string {
  if (!ts) return "—"
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return "—"
  return `${formatDate(ts)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** 状态标签 —— 只有「待处置」染色（需要用户行动的那一档） */
function StatusChip({ status, className }: { status: MedicalRecordStatus; className?: string }) {
  const meta = RECORD_STATUS_META[status]
  const isOpen = status === "open"
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        !isOpen && "text-zinc-500 dark:text-zinc-400",
        className,
      )}
      style={isOpen ? { color: OPEN_COLOR, background: "rgba(217,119,6,0.12)" } : undefined}
      title={meta.hint}
    >
      {isOpen ? (
        <IconAttention size={11} strokeWidth={2} />
      ) : status === "resolved" ? (
        <IconCheck size={11} strokeWidth={2.2} />
      ) : (
        <span className="size-1.5 rounded-full bg-current opacity-60" />
      )}
      {meta.label}
    </span>
  )
}

/** 疗效标签 —— 三档语义色，痊愈用「实心」区分 */
function EfficacyChip({ efficacy, size = "sm" }: { efficacy: FollowUpEfficacy; size?: "sm" | "md" }) {
  const meta = EFFICACY_META[efficacy]
  const isCured = efficacy === "cured"
  const color = meta.tone === "danger" ? "#DC2626" : meta.tone === "warn" ? "#D97706" : "#059669"
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        isCured && "text-white",
      )}
      style={
        isCured
          ? { background: color }
          : { color, background: `color-mix(in srgb, ${color} 12%, transparent)` }
      }
      title={meta.hint}
    >
      {isCured && <IconShieldCheck size={11} strokeWidth={2.2} />}
      {meta.label}
    </span>
  )
}

function StatTile({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5" title={hint}>
      <span
        className={cn("text-[19px] font-semibold leading-tight tracking-tight", !accent && "text-zinc-900 dark:text-zinc-100")}
        style={accent ? { color: OPEN_COLOR } : undefined}
      >
        {value}
      </span>
      <span className="truncate text-[11.5px] text-zinc-500 dark:text-zinc-400">{label}</span>
    </div>
  )
}

/** 列表行 —— 面板左栏用，比独立页的卡更紧凑 */
function RecordRow({
  record,
  active,
  onOpen,
}: {
  record: MedicalRecordSummary
  active: boolean
  onOpen: (id: number) => void
}) {
  const sev = getSeverityMeta(record.severity)
  return (
    <button
      type="button"
      onClick={() => onOpen(record.id)}
      className={cn(
        "group flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition",
        HAIRLINE,
        active ? "bg-[#059669]/[0.07] dark:bg-[#059669]/[0.12]" : "bg-white hover:bg-zinc-50 dark:bg-transparent dark:hover:bg-white/[0.03]",
      )}
    >
      <div className="relative size-[62px] shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {record.image_thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={record.image_thumbnail} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-zinc-300 dark:text-zinc-600">
            <IconLeaf size={20} strokeWidth={1.6} />
          </div>
        )}
        <span
          className="absolute bottom-0 left-0 right-0 px-1 py-[1px] text-[9.5px] font-medium text-white"
          style={{ background: `linear-gradient(to top, ${sev.color}E6, transparent)` }}
        >
          {sev.label}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-[13.5px] font-medium text-zinc-900 dark:text-zinc-100">{record.disease_name}</h3>
          <StatusChip status={record.status} />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-zinc-500 dark:text-zinc-400">
          <span>{CATEGORY_LABEL[record.category] ?? "未分类"}</span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span>{record.confidence != null ? `${Math.round(record.confidence * 100)}%` : "—"}</span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span>{formatDate(record.created_at)}</span>
        </div>
        {record.summary ? (
          <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            {record.summary}
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {record.affected_parts?.slice(0, 2).map((p) => (
            <span key={p} className="rounded px-1.5 py-[1px] text-[10.5px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400">
              {p}
            </span>
          ))}
          {record.followup_count ? (
            <span className="inline-flex items-center gap-1 text-[10.5px] text-zinc-500 dark:text-zinc-400">
              <IconHistory size={11} strokeWidth={1.9} />
              复诊 {record.followup_count} 次
            </span>
          ) : null}
          {record.latest_efficacy ? <EfficacyChip efficacy={record.latest_efficacy} /> : null}
        </div>
      </div>
    </button>
  )
}

/** 复诊回填表单 */
function FollowUpForm({
  onSubmit,
  busy,
}: {
  onSubmit: (input: { efficacy: FollowUpEfficacy; note: string; thumbnail: string | null }) => Promise<void>
  busy: boolean
}) {
  const [efficacy, setEfficacy] = useState<FollowUpEfficacy>("improved")
  const [note, setNote] = useState("")
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const pickPhoto = useCallback(async (file: File | null) => {
    if (!file) return
    setPreparing(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => resolve(String(fr.result || ""))
        fr.onerror = () => reject(new Error("读取失败"))
        fr.readAsDataURL(file)
      })
      // 复诊照片同样压到长边 640，避免把病历表撑爆
      setThumbnail(await downscaleToDataUrl(dataUrl, { maxSize: 640, quality: 0.7 }))
    } catch {
      setThumbnail(null)
    } finally {
      setPreparing(false)
    }
  }, [])

  return (
    <div className={cn("rounded-2xl border p-3.5", HAIRLINE)}>
      <div className="flex items-center gap-2">
        <IconHistory size={14} strokeWidth={2} className="text-[#059669]" />
        <span className="text-[12.5px] font-medium text-zinc-900 dark:text-zinc-100">回填本次复诊</span>
      </div>

      <div className="mt-2.5 grid grid-cols-4 gap-1.5">
        {(Object.keys(EFFICACY_META) as FollowUpEfficacy[]).map((key) => {
          const meta = EFFICACY_META[key]
          const active = efficacy === key
          const tone = meta.tone === "danger" ? "#DC2626" : meta.tone === "warn" ? "#D97706" : "#059669"
          return (
            <button
              key={key}
              type="button"
              onClick={() => setEfficacy(key)}
              className={cn(
                "rounded-lg px-1 py-1.5 text-[12px] font-medium transition",
                active ? "text-white" : "text-zinc-600 dark:text-zinc-300",
                !active && "bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700/70",
              )}
              style={active ? { background: tone } : undefined}
              title={meta.hint}
            >
              {meta.label}
            </button>
          )
        })}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="记一句观察：用药后 3 天，新叶未再出现水浸状斑…（可留空）"
        className={cn(
          "mt-2.5 w-full resize-none rounded-xl px-3 py-2 text-[12.5px] outline-none",
          "bg-zinc-50 text-zinc-800 placeholder:text-zinc-400 dark:bg-zinc-800/60 dark:text-zinc-200",
          "focus:ring-2 focus:ring-[#059669]/30",
        )}
      />

      <div className="mt-2.5 flex items-center gap-2.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void pickPhoto(e.target.files?.[0] ?? null)
            e.target.value = ""
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={preparing}
          className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-2.5 py-1.5 text-[12px] text-zinc-600 transition hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {preparing ? <IconLoading size={12} className="animate-spin" /> : <IconCamera size={12} strokeWidth={1.9} />}
          {thumbnail ? "换一张" : "加复诊照"}
        </button>

        {thumbnail ? (
          <div className="relative size-10 overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnail} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => setThumbnail(null)}
              className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-bl-md bg-black/60 text-white"
              aria-label="移除复诊照"
            >
              <IconClose size={10} strokeWidth={2.5} />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            await onSubmit({ efficacy, note, thumbnail })
            setNote("")
            setThumbnail(null)
            setEfficacy("improved")
          }}
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[12.5px] font-medium text-white transition",
            busy ? "opacity-60" : "hover:brightness-[1.08]",
          )}
          style={{ background: "#059669" }}
        >
          {busy ? <IconLoading size={12} className="animate-spin" /> : <IconCheck size={12} strokeWidth={2.4} />}
          记录复诊
        </button>
      </div>
    </div>
  )
}

/** 详情区 */
function RecordDetail({
  record,
  loading,
  busy,
  onBack,
  onStatusChange,
  onFollowUp,
  onDelete,
}: {
  record: MedicalRecordDetail | null
  loading: boolean
  busy: boolean
  onBack: () => void
  onStatusChange: (s: MedicalRecordStatus) => void
  onFollowUp: (i: { efficacy: FollowUpEfficacy; note: string; thumbnail: string | null }) => Promise<void>
  onDelete: () => void
}) {
  const trend = useMemo(() => {
    if (!record) return null
    const base = SEVERITY_INDEX[record.severity]
    const pts = [base]
    const asc = [...record.followups].sort((a, b) => a.created_at - b.created_at)
    let last = base
    for (const f of asc) {
      if (f.severity) last = SEVERITY_INDEX[f.severity]
      pts.push(last)
    }
    return pts
  }, [record])

  const trendTone = useMemo(() => {
    if (!trend || trend.length < 2) return "#71717A"
    const first = trend[0]
    const last = trend[trend.length - 1]
    if (last < first) return "#059669"
    if (last > first) return "#DC2626"
    return "#D97706"
  }, [trend])

  // 纠正痕迹：服务层把"改病名/严重度"的原值记在 payload.corrections（不覆盖诊断快照）。
  // 这里摊平成可读行，让用户看到"这条被人工改过、原来是什么"。
  // 🚨 useMemo 必须放在下面 `if (loading || !record) return` **之前**：
  //    首次渲染 record=null 会走早退、少调一个 hook，第二次渲染再调 →
  //    "Rendered more hooks than during the previous render"。
  const corrections = useMemo(() => {
    const list = Array.isArray((record?.payload as any)?.corrections) ? (record?.payload as any).corrections : []
    const sevLabel = (v: unknown) => {
      try {
        return getSeverityMeta(v as any)?.label || String(v ?? "")
      } catch {
        return String(v ?? "")
      }
    }
    const out: { label: string; from: string; to: string }[] = []
    for (const c of list) {
      if (c?.diseaseName) out.push({ label: "病名", from: String(c.diseaseName.from ?? ""), to: String(c.diseaseName.to ?? "") })
      if (c?.severity) out.push({ label: "严重度", from: sevLabel(c.severity.from), to: sevLabel(c.severity.to) })
    }
    return out
  }, [record?.payload])

  if (loading || !record) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[13px] text-zinc-500">
        <IconLoading size={15} className="animate-spin" />
        正在载入病历…
      </div>
    )
  }

  const sortedFollowUps = [...record.followups].sort((a, b) => b.created_at - a.created_at)

  return (
    <div className="flex flex-col gap-3.5 p-4">
      {/* 返回（窄屏才有意义，宽屏也留一枚，避免"不知道怎么回列表"） */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
        >
          <IconLeft size={13} strokeWidth={2} />
          返回列表
        </button>
        <span className="ml-auto text-[11.5px] text-zinc-400 dark:text-zinc-500">
          首诊 {formatDateTime(record.created_at)}
        </span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[18px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {record.disease_name}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-zinc-500 dark:text-zinc-400">
            <span>{CATEGORY_LABEL[record.category] ?? "未分类"}</span>
            {record.crop ? (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <span>{record.crop}</span>
              </>
            ) : null}
          </div>
        </div>
        <StatusChip status={record.status} />
      </div>

      {/* 状态操作 */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(["open", "treating", "resolved", "archived"] as MedicalRecordStatus[]).map((s) => {
          const active = record.status === s
          return (
            <button
              key={s}
              type="button"
              disabled={busy || active}
              onClick={() => onStatusChange(s)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[12px] font-medium transition",
                active
                  ? "bg-[#059669] text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-300",
                busy && !active && "opacity-60",
              )}
            >
              {RECORD_STATUS_META[s].label}
            </button>
          )
        })}
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-zinc-500 transition hover:bg-red-500/10 hover:text-[#DC2626]"
        >
          <IconDelete size={12} strokeWidth={1.9} />
          删除
        </button>
      </div>

      {/* 关键指标 */}
      <div className={cn("grid grid-cols-4 gap-2 rounded-2xl border px-3.5 py-3", HAIRLINE)}>
        <StatTile
          label="严重度"
          value={getSeverityMeta(record.severity).label}
          hint={getSeverityMeta(record.severity).hint}
          accent={record.severity === "moderate" || record.severity === "severe"}
        />
        <StatTile label="置信度" value={record.confidence != null ? `${Math.round(record.confidence * 100)}%` : "—"} />
        <StatTile label="复诊" value={`${record.followups.length} 次`} />
        <StatTile label={record.resolved_at ? "解决于" : "处置起"} value={formatDate(record.resolved_at || record.treated_at)} />
      </div>

      {/* 备注 / 人工纠正痕迹 —— AI 改病历或用户补的说明，不显示就成了"数据黑洞" */}
      {record.note || corrections.length > 0 ? (
        <div className={cn("rounded-2xl border p-3.5", HAIRLINE)}>
          {record.note ? (
            <div className="flex items-start gap-2.5">
              <IconNotebook size={15} strokeWidth={1.9} className="mt-0.5 shrink-0 text-[#059669]" />
              <div className="min-w-0">
                <div className="text-[11.5px] font-medium text-zinc-500 dark:text-zinc-400">备注</div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {record.note}
                </p>
              </div>
            </div>
          ) : null}
          {corrections.length > 0 ? (
            <div className={cn("flex items-start gap-2.5", record.note && "mt-3 border-t pt-3", HAIRLINE)}>
              <IconEdit size={15} strokeWidth={1.9} className="mt-0.5 shrink-0 text-[#D97706]" />
              <div className="min-w-0">
                <div className="text-[11.5px] font-medium text-zinc-500 dark:text-zinc-400">已人工纠正</div>
                <ul className="mt-1 space-y-0.5">
                  {corrections.map((c, i) => (
                    <li key={i} className="text-[12px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {c.label}：<span className="text-zinc-400 line-through">{c.from}</span>
                      <span className="mx-1 text-zinc-400">→</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{c.to}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 病程走势 */}
      {trend && trend.length >= 2 ? (
        <div className={cn("rounded-2xl border p-3.5", HAIRLINE)}>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-zinc-900 dark:text-zinc-100">病程走势</span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">越高越重</span>
          </div>
          <div className="mt-2 h-9" style={{ color: trendTone }}>
            <Sparkline values={trend} area strokeWidth={2} className="size-full" ariaLabel="病程严重度走势" />
          </div>
        </div>
      ) : (
        <div className={cn("flex items-center gap-3 rounded-2xl border p-3.5", HAIRLINE)}>
          <IconTime size={15} strokeWidth={1.9} className="shrink-0 text-zinc-400" />
          <p className="text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            还没有复诊记录。执行防治措施后回填一次疗效，这里就会画出病程曲线。
          </p>
        </div>
      )}

      {/* 当时诊断 */}
      {record.payload ? (
        <div>
          <div className="mb-2 px-1 text-[11.5px] font-medium text-zinc-500 dark:text-zinc-400">当时诊断</div>
          <DiagnosisCard
            result={record.payload}
            imageSrc={record.image_thumbnail || undefined}
            crop={record.crop || undefined}
          />
        </div>
      ) : null}

      {/* 复诊时间轴 */}
      {sortedFollowUps.length > 0 ? (
        <div>
          <div className="mb-2 px-1 text-[11.5px] font-medium text-zinc-500 dark:text-zinc-400">复诊记录</div>
          <div className={cn("rounded-2xl border px-3.5", HAIRLINE)}>
            {sortedFollowUps.map((f, i) => (
              <div key={f.id} className={cn("flex items-start gap-3 py-3", i !== sortedFollowUps.length - 1 && `border-b ${HAIRLINE}`)}>
                <div className="flex w-11 shrink-0 flex-col items-center gap-1">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">第 {f.stage} 次</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <EfficacyChip efficacy={f.efficacy} />
                    {f.severity ? (
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        严重度 {getSeverityMeta(f.severity).label}
                      </span>
                    ) : null}
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{formatDateTime(f.created_at)}</span>
                  </div>
                  {f.note ? (
                    <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-600 dark:text-zinc-300">{f.note}</p>
                  ) : null}
                </div>
                {f.image_thumbnail ? (
                  <div className="size-10 shrink-0 overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.image_thumbnail} alt="" className="size-full object-cover" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <FollowUpForm onSubmit={onFollowUp} busy={busy} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// 面板
// ---------------------------------------------------------------------------

export function MedicalRecordsPanel({
  open,
  onClose,
  darkMode = false,
  sidebarOpen = true,
  onExpandSidebar,
  onNewChat,
}: MedicalRecordsPanelProps) {
  const [items, setItems] = useState<MedicalRecordSummary[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<MedicalRecordStats | null>(null)
  const [diseaseNames, setDiseaseNames] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState<MedicalRecordStatus | "all">("all")
  const [disease, setDisease] = useState("")
  const [keyword, setKeyword] = useState("")
  const [debouncedKeyword, setDebouncedKeyword] = useState("")

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<MedicalRecordDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "err" } | null>(null)

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    setToast({ text, tone })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  // 关闭中（给 wrapper 加 pointer-events-none，与「我的空间」同一处理）
  const [closing, setClosing] = useState(false)
  useEffect(() => { if (open) setClosing(false) }, [open])
  const handleClose = useCallback(() => {
    if (closing) return
    setClosing(true)
    onClose()
  }, [closing, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      // ESC 优先退回列表，列表态才关闭面板 —— 避免"正在看详情，一下全关了"
      if (e.key === "Escape") {
        if (selectedId != null) setSelectedId(null)
        else handleClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, selectedId, handleClose])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300)
    return () => clearTimeout(t)
  }, [keyword])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const sp = new URLSearchParams()
      sp.set("limit", "60")
      sp.set("withMeta", "1")
      if (status !== "all") sp.set("status", status)
      if (disease) sp.set("diseaseName", disease)
      if (debouncedKeyword) sp.set("keyword", debouncedKeyword)

      const res = await fetch(`/api/vision/medical-records?${sp.toString()}`, { credentials: "include" })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) throw new Error(data?.error || "加载失败")
      setItems(Array.isArray(data.items) ? data.items : [])
      setTotal(Number(data.total) || 0)
      setStats(data.stats ?? null)
      setDiseaseNames(Array.isArray(data.diseaseNames) ? data.diseaseNames : [])
    } catch (e: any) {
      setError(e?.message || "加载失败")
    } finally {
      setLoading(false)
    }
  }, [status, disease, debouncedKeyword])

  // 面板打开时才拉取（避免 AI 助手首屏就多打一发请求）
  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const openDetail = useCallback(
    async (id: number) => {
      setSelectedId(id)
      setDetail(null)
      setDetailLoading(true)
      try {
        const res = await fetch(`/api/vision/medical-records/${id}`, { credentials: "include" })
        const data = await res.json().catch(() => null)
        if (res.ok && data?.ok) setDetail(data.record)
        else showToast(data?.error || "载入病历失败", "err")
      } catch {
        showToast("载入病历失败", "err")
      } finally {
        setDetailLoading(false)
      }
    },
    [showToast],
  )

  const changeStatus = useCallback(
    async (next: MedicalRecordStatus) => {
      if (!detail) return
      setBusy(true)
      try {
        const res = await fetch(`/api/vision/medical-records/${detail.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: next }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.ok) throw new Error(data?.error || "更新失败")
        setDetail((prev) => (prev && data.record ? { ...prev, ...data.record, payload: prev.payload, followups: prev.followups } : prev))
        showToast("状态已更新")
        void load()
      } catch (e: any) {
        showToast(e?.message || "更新失败", "err")
      } finally {
        setBusy(false)
      }
    },
    [detail, load, showToast],
  )

  const submitFollowUp = useCallback(
    async (input: { efficacy: FollowUpEfficacy; note: string; thumbnail: string | null }) => {
      if (!detail) return
      setBusy(true)
      try {
        const res = await fetch(`/api/vision/medical-records/${detail.id}/followups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ efficacy: input.efficacy, note: input.note, imageThumbnail: input.thumbnail }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.ok) throw new Error(data?.error || "保存失败")
        showToast("复诊已记录")
        await openDetail(detail.id) // 阶段序号与状态流转都由服务端算
        void load()
      } catch (e: any) {
        showToast(e?.message || "保存失败", "err")
      } finally {
        setBusy(false)
      }
    },
    [detail, load, openDetail, showToast],
  )

  const removeRecord = useCallback(async () => {
    if (!detail) return
    if (!window.confirm(`删除「${detail.disease_name}」这份病历？复诊记录会一并删除，且不可恢复。`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/vision/medical-records/${detail.id}`, { method: "DELETE", credentials: "include" })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) throw new Error(data?.error || "删除失败")
      showToast("病历已删除")
      setSelectedId(null)
      setDetail(null)
      void load()
    } catch (e: any) {
      showToast(e?.message || "删除失败", "err")
    } finally {
      setBusy(false)
    }
  }, [detail, load, showToast])

  const isDark = darkMode
  const isFiltered = status !== "all" || !!disease || !!debouncedKeyword

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: closing ? 0 : 1, scale: closing ? 0.98 : 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "fixed z-[150] flex flex-col overflow-hidden font-sans",
            "top-3 right-3 bottom-3",
            sidebarOpen ? "left-[272px]" : "left-3",
            isDark ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900",
            closing && "pointer-events-none",
          )}
          // 全站由 React Lenis 接管滚轮（components/smooth-scroll.tsx），它会 preventDefault
          // 吞掉未标注容器的滚轮 → 本面板作为 fixed 独立滚动区必须声明放行，否则滚不动。
          data-lenis-prevent
          style={{ borderRadius: 10 }}
        >
          {/* Header */}
          <div className={cn("shrink-0 px-7 pt-5 pb-3", isDark ? "bg-zinc-950" : "bg-white")}>
            {!sidebarOpen && (
              <div className="mb-3 flex items-center gap-1">
                {onExpandSidebar && (
                  <button
                    onClick={onExpandSidebar}
                    title="展开侧边栏"
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg transition-colors",
                      isDark ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                    )}
                  >
                    <IconLeft size={17} className="rotate-180" />
                  </button>
                )}
                {onNewChat && (
                  <button
                    onClick={onNewChat}
                    title="新建对话"
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg transition-colors",
                      isDark ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                    )}
                  >
                    <IconNotebook size={17} />
                  </button>
                )}
              </div>
            )}

            <div className="mb-3.5 flex items-start justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                  <IconNotebook size={22} strokeWidth={1.8} className="text-[#059669]" />
                  病历
                </h1>
                <p className="mt-1 text-sm text-zinc-500">诊断自动归档 · 复诊回填疗效 · 看得见的病程</p>
              </div>
              <button
                onClick={handleClose}
                title="关闭"
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg transition-colors",
                  isDark ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                )}
              >
                <IconClose size={17} />
              </button>
            </div>

            {/* 统计条 */}
            <div className={cn("grid grid-cols-4 gap-3 rounded-xl border px-4 py-2.5", HAIRLINE)}>
              <StatTile label="病历总数" value={stats ? String(stats.total) : "—"} />
              <StatTile label="待处置" value={stats ? String(stats.open) : "—"} hint="尚未开始处理" accent={!!stats && stats.open > 0} />
              <StatTile label="处置中" value={stats ? String(stats.treating) : "—"} hint="已采取措施，等待复诊" />
              <StatTile
                label={stats && stats.followed > 0 ? `已解决 · 治愈率 ${Math.round((stats.cureRate || 0) * 100)}%` : "已解决"}
                value={stats ? String(stats.resolved) : "—"}
                hint={stats && stats.followed > 0 ? `${stats.cured} / ${stats.followed} 份有复诊的病历痊愈` : "还没有复诊记录，暂无治愈率"}
              />
            </div>

            {/* 筛选 */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {STATUS_ORDER.map((s) => {
                  const active = status === s
                  const label = s === "all" ? "全部" : RECORD_STATUS_META[s].label
                  const count = s === "all" ? stats?.total : stats?.[s]
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium transition",
                        active
                          ? "bg-[#059669] text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-300",
                      )}
                    >
                      {label}
                      {typeof count === "number" ? (
                        <span className={cn("text-[10.5px]", active ? "text-white/75" : "text-zinc-400")}>{count}</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <select
                  value={disease}
                  onChange={(e) => setDisease(e.target.value)}
                  className={cn(
                    "h-8 rounded-full border px-2.5 text-[12px] outline-none",
                    HAIRLINE,
                    isDark ? "bg-zinc-900 text-zinc-300" : "bg-white text-zinc-600",
                  )}
                >
                  <option value="">全部病名</option>
                  {diseaseNames.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <IconSearch size={13} strokeWidth={2} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="搜索病名 / 结论…"
                    className={cn(
                      "h-8 w-[168px] rounded-full border pl-7 pr-3 text-[12px] outline-none",
                      HAIRLINE,
                      isDark ? "bg-zinc-900 text-zinc-200 placeholder:text-zinc-500" : "bg-white text-zinc-700 placeholder:text-zinc-400",
                      "focus:ring-2 focus:ring-[#059669]/25",
                    )}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void load()}
                  title="刷新"
                  aria-label="刷新"
                  className="inline-flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <IconRefresh size={14} strokeWidth={1.9} className={loading ? "animate-spin" : undefined} />
                </button>
              </div>
            </div>
          </div>

          {/* Body：主从双栏 */}
          <div className={cn("mx-7 mb-5 flex min-h-0 flex-1 overflow-hidden rounded-xl border", HAIRLINE)}>
            {/* 列表栏 */}
            <div
              className={cn(
                "min-h-0 overflow-y-auto p-2.5",
                selectedId != null ? "hidden lg:block lg:w-[360px] lg:shrink-0 lg:border-r" : "flex-1",
                selectedId != null && HAIRLINE,
              )}
            >
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-zinc-500">
                  <IconLoading size={15} className="animate-spin" />
                  正在载入病历…
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-3 py-16">
                  <IconAttention size={20} className="text-[#D97706]" />
                  <div className="text-[13px] text-zinc-600 dark:text-zinc-300">{error}</div>
                  <button
                    type="button"
                    onClick={() => void load()}
                    className="rounded-full bg-zinc-100 px-4 py-1.5 text-[12.5px] text-zinc-600 transition hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    重试
                  </button>
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  illustration="empty-list"
                  illustrationWidth={160}
                  title={isFiltered ? "没有匹配的病历" : "还没有病历"}
                  description={
                    isFiltered
                      ? "试着放宽筛选条件，或清空搜索关键词。"
                      : "在对话里发一张病叶照片做一次诊断，结果会自动归档到这里。"
                  }
                />
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {items.map((r) => (
                      <RecordRow key={r.id} record={r} active={r.id === selectedId} onOpen={openDetail} />
                    ))}
                  </div>
                  <div className="py-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                    共 {total} 份{items.length < total ? `，当前展示最近 ${items.length} 份` : ""}
                  </div>
                </>
              )}
            </div>

            {/* 详情栏 */}
            {selectedId != null ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <RecordDetail
                  record={detail}
                  loading={detailLoading}
                  busy={busy}
                  onBack={() => setSelectedId(null)}
                  onStatusChange={(s) => void changeStatus(s)}
                  onFollowUp={submitFollowUp}
                  onDelete={() => void removeRecord()}
                />
              </div>
            ) : (
              <div className="hidden flex-1 items-center justify-center lg:flex">
                <div className="max-w-[300px] text-center">
                  <IconNotebook size={30} strokeWidth={1.4} className="mx-auto text-zinc-300 dark:text-zinc-700" />
                  <p className="mt-3 text-[12.5px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                    选左侧一份病历，这里会显示当时的完整诊断、病程走势与复诊记录。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 轻量提示 */}
          <AnimatePresence>
            {toast ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-[12.5px] font-medium text-white shadow-lg"
                style={{ background: toast.tone === "err" ? "#DC2626" : "#18181B" }}
                role="status"
              >
                {toast.text}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default MedicalRecordsPanel
