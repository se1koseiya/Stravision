"use client"

/**
 * 技能工坊结果卡片（Skill Forge Card）
 *
 * 由 AI 在对话中输出 <SKILL_FORGE>{compact-json}</SKILL_FORGE> 标签触发渲染。
 * 展示：文档分析摘要 → 生成的技能信息 → 自测复用报告 → 注册状态，
 * 并提供「试用示例」「反馈修订」等对话内交互（点击即向 AI 发消息）。
 */

import React, { useState } from "react"
import { IconBookOne, IconCaution, IconCheckOne, IconCloseOne, IconDown, IconLoading, IconMagic, IconSend, IconTool, IconUp } from "@/components/icon";

// ---------- 卡片数据（AI 在标签内输出的紧凑 JSON） ----------

export interface SkillForgeCardData {
  status: "success" | "draft" | "failed"
  skillId?: string
  name?: string
  icon?: string
  category?: string
  description?: string
  subject?: string
  capabilities?: string[]
  propertyCount?: number
  missingInfo?: string[]
  keywords?: string[]
  examples?: string[]
  score?: number
  rounds?: number
  published?: boolean
  matchTests?: Array<{ q: string; ok: boolean }>
  rehearsalTests?: Array<{ q: string; ok: boolean; why?: string }>
  error?: string
}

export function parseSkillForgeCardData(raw: string): SkillForgeCardData | null {
  try {
    const cleaned = raw.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim()
    const data = JSON.parse(cleaned)
    if (!data || typeof data !== "object") return null
    if (!data.status && !data.skillId && !data.name) return null
    return data as SkillForgeCardData
  } catch {
    return null
  }
}

// ---------- 子组件 ----------

function StatusBadge({ status, published }: { status: SkillForgeCardData["status"]; published?: boolean }) {
  if (status === "success") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
        <IconCheckOne size={11} /> {published ? "已发布 · 全域可用" : "通过"}
      </span>
    )
  }
  if (status === "draft") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
        <IconCaution size={11} /> 草稿 · 待修订
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/60 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
      <IconCloseOne size={11} /> 锻造失败
    </span>
  )
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#059669" : score >= 60 ? "#52525B" : "#DC2626"
  return (
    <div className="relative flex h-11 w-11 items-center justify-center">
      <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3.2"
          className="text-zinc-100 dark:text-zinc-800" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3.2"
          strokeDasharray={`${(score / 100) * 97.4} 97.4`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[12px] font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

// ---------- 主卡片 ----------

export function SkillForgeCard({
  data,
  onSendMessage,
}: {
  data: SkillForgeCardData
  onSendMessage?: (text: string) => void
}) {
  const [showTests, setShowTests] = useState(false)
  const [refineText, setRefineText] = useState("")
  const [showRefine, setShowRefine] = useState(false)

  const hasTests = (data.matchTests && data.matchTests.length > 0) || (data.rehearsalTests && data.rehearsalTests.length > 0)
  const matchPassed = data.matchTests?.filter(t => t.ok).length ?? 0
  const rehearsalPassed = data.rehearsalTests?.filter(t => t.ok).length ?? 0

  const submitRefine = () => {
    const fb = refineText.trim()
    if (!fb || !data.skillId) return
    onSendMessage?.(`【技能修订】技能 ID：${data.skillId}，修改要求：${fb}\n请调用 refine_skill 工具重新修订该技能。`)
    setRefineText("")
    setShowRefine(false)
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* ===== 头部 ===== */}
      <div className="flex items-center gap-3 border-b border-zinc-100 bg-gradient-to-r from-emerald-50/80 to-indigo-50/80 px-4 py-3 dark:border-zinc-800 dark:from-emerald-950/40 dark:to-indigo-950/40">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-indigo-600 text-lg text-white shadow-sm">
          {data.icon && data.status !== "failed" ? data.icon : <IconMagic size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[14px] font-bold text-zinc-900 dark:text-zinc-50">
              {data.name || "技能锻造"}
            </span>
            <StatusBadge status={data.status} published={data.published} />
            {data.rounds && data.rounds > 1 && (
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                第 {data.rounds} 轮
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            {data.skillId && <code className="rounded bg-white/70 px-1 dark:bg-zinc-800/70">{data.skillId}</code>}
            {data.category && <span>· {data.category}</span>}
            {data.description && <span className="truncate">· {data.description}</span>}
          </div>
        </div>
      </div>

      {/* ===== 失败态 ===== */}
      {data.status === "failed" && data.error && (
        <div className="px-4 py-3 text-[12px] text-red-600 dark:text-red-400">
          失败原因：{data.error}
        </div>
      )}

      {/* ===== 文档分析 ===== */}
      {(data.subject || (data.capabilities && data.capabilities.length > 0)) && (
        <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            <IconBookOne size={11} /> 文档分析{data.subject ? `：${data.subject}` : ""}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.capabilities?.map((c, i) => (
              <span key={i} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                {c}
              </span>
            ))}
            {typeof data.propertyCount === "number" && data.propertyCount > 0 && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                属性字段 ×{data.propertyCount}
              </span>
            )}
          </div>
          {data.missingInfo && data.missingInfo.length > 0 && (
            <div className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <span className="font-semibold">文档待补充：</span>{data.missingInfo.join("；")}
            </div>
          )}
        </div>
      )}

      {/* ===== 自测复用 ===== */}
      {typeof data.score === "number" && (
        <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <button
            onClick={() => hasTests && setShowTests(!showTests)}
            className="flex w-full items-center gap-3 text-left"
          >
            <ScoreRing score={data.score} />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-800 dark:text-zinc-200">
                <IconTool size={12} className="text-zinc-400" />
                自测复用{data.status === "success" ? "通过" : "未达标"}
                {hasTests && (showTests ? <IconUp size={12} className="text-zinc-400" /> : <IconDown size={12} className="text-zinc-400" />)}
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                关键词路由 {matchPassed}/{data.matchTests?.length ?? 0} 通过 · AI 彩排 {rehearsalPassed}/{data.rehearsalTests?.length ?? 0} 忠实
              </div>
            </div>
          </button>

          {showTests && hasTests && (
            <div className="mt-2 space-y-1.5">
              {data.matchTests?.map((t, i) => (
                <div key={`m${i}`} className="flex items-center justify-between rounded-lg bg-zinc-50 px-2.5 py-1.5 text-[11px] dark:bg-zinc-800/60">
                  <span className="text-zinc-600 dark:text-zinc-300">路由测试：&ldquo;{t.q}&rdquo;</span>
                  {t.ok
                    ? <IconCheckOne size={13} className="shrink-0 text-emerald-500" />
                    : <IconCloseOne size={13} className="shrink-0 text-red-500" />}
                </div>
              ))}
              {data.rehearsalTests?.map((t, i) => (
                <div key={`r${i}`} className="rounded-lg bg-zinc-50 px-2.5 py-1.5 text-[11px] dark:bg-zinc-800/60">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-zinc-600 dark:text-zinc-300">彩排：{t.q}</span>
                    {t.ok
                      ? <IconCheckOne size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                      : <IconCloseOne size={13} className="mt-0.5 shrink-0 text-red-500" />}
                  </div>
                  {t.why && <div className="mt-0.5 text-zinc-400 dark:text-zinc-500">{t.why}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== 底部操作 ===== */}
      {onSendMessage && data.status !== "failed" && (
        <div className="px-4 py-3">
          {data.examples && data.examples.length > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-zinc-400">试用：</span>
              {data.examples.slice(0, 3).map((ex, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(ex)}
                  className="rounded-full border border-emerald-200 px-2.5 py-1 text-[11px] text-emerald-600 transition-colors hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          {showRefine ? (
            <div className="flex items-center gap-2">
              <input
                value={refineText}
                onChange={e => setRefineText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitRefine() }}
                placeholder="反馈修改要求，如：温度单位改为摄氏度"
                className="flex-1 rounded-lg border border-zinc-200 bg-transparent px-2.5 py-1.5 text-[12px] text-zinc-800 outline-none focus:border-emerald-400 dark:border-zinc-700 dark:text-zinc-200"
                autoFocus
              />
              <button
                onClick={submitRefine}
                disabled={!refineText.trim()}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <IconSend size={12} /> 提交
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowRefine(true)}
              className="flex items-center gap-1 text-[11px] text-zinc-400 transition-colors hover:text-emerald-500"
            >
              <IconTool size={11} /> 结果不满意？反馈让 AI 修订
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** 流式中的骨架占位（JSON 未闭合时） */
export function SkillForgeCardSkeleton({ stage }: { stage?: string }) {
  return (
    <div className="my-3 rounded-xl border border-[#05966930] bg-white p-4 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <IconLoading className="animate-spin" size={14} style={{ color: "#059669" }} />
        <span className="text-[13px] text-zinc-500 dark:text-zinc-400">
          {stage || "正在生成技能锻造报告卡片…"}
        </span>
      </div>
    </div>
  )
}
