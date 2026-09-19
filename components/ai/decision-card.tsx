"use client"

import { cn } from "@/lib/utils"
import { IconCompass } from "@/components/icon";

/**
 * 可解释 AI 决策卡片
 *
 * 当 AI 执行设备控制/环境调控等决策时，附带一张"决策卡"：
 * - WHY：为什么做这个决策（基于什么偏差/问题）
 * - WHAT：做了什么（具体的设备/参数变更）
 * - EVIDENCE：依据的数据（具体数值 + 阈值 + 来源）
 *
 * 让用户一眼看懂"AI 为什么这么做"，建立信任。
 */

export interface DecisionEvidence {
  metric: string
  value: string | number
  reference?: string
  source?: string
}

export interface DecisionData {
  /** 决策意图：为什么这么做 */
  why: string
  /** 实际动作：做了什么（简短） */
  what: string
  /** 决策类型 */
  type?: 'control' | 'recommendation' | 'diagnosis' | 'prediction'
  /** 数据依据 */
  evidence?: DecisionEvidence[]
  /** 置信度 0-1 */
  confidence?: number
  /** 备选方案（被否决的） */
  alternatives?: string[]
}

interface DecisionCardProps {
  data: DecisionData
  className?: string
}

const typeLabels: Record<string, { label: string; color: string }> = {
  control: { label: '设备控制', color: 'bg-[#1677ff]/10 text-[#1677ff] border-[#1677ff]/20' },
  recommendation: { label: '操作建议', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900' },
  diagnosis: { label: '问题诊断', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900' },
  prediction: { label: '趋势预判', color: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900' },
}

export function DecisionCard({ data, className }: DecisionCardProps) {
  const typeMeta = typeLabels[data.type || 'control'] || typeLabels.control
  const confidencePct = typeof data.confidence === 'number' ? Math.round(data.confidence * 100) : null

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden",
      "border-zinc-200 dark:border-zinc-800",
      className
    )}>
      {/* 头部 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800">
        <IconCompass size={14} className="text-zinc-500 shrink-0" strokeWidth={1.75} />
        <span className="text-xs font-medium">AI 决策依据</span>
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", typeMeta.color)}>
          {typeMeta.label}
        </span>
        {confidencePct !== null && (
          <span className="ml-auto text-[10px] text-zinc-500">置信度 {confidencePct}%</span>
        )}
      </div>

      <div className="px-3 py-2.5 space-y-2.5">
        {/* WHY */}
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-medium text-zinc-400 mt-0.5 w-7 shrink-0">WHY</span>
          <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed flex-1">
            {data.why}
          </div>
        </div>

        {/* WHAT */}
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-medium text-zinc-400 mt-0.5 w-7 shrink-0">WHAT</span>
          <div className="text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed flex-1 font-medium">
            {data.what}
          </div>
        </div>

        {/* EVIDENCE */}
        {data.evidence && data.evidence.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-medium text-zinc-400 mt-0.5 w-7 shrink-0">证据</span>
            <div className="flex-1 grid grid-cols-2 gap-1">
              {data.evidence.map((ev, i) => (
                <div key={i} className="text-[11px] rounded bg-zinc-50 dark:bg-zinc-800/60 px-1.5 py-1">
                  <div className="text-zinc-500">{ev.metric}</div>
                  <div className="font-mono text-zinc-900 dark:text-zinc-100">
                    {ev.value}
                    {ev.reference && <span className="text-zinc-400 ml-1">/ {ev.reference}</span>}
                  </div>
                  {ev.source && <div className="text-[10px] text-zinc-400 mt-0.5">来源：{ev.source}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 备选方案 */}
        {data.alternatives && data.alternatives.length > 0 && (
          <div className="flex items-start gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-medium text-zinc-400 mt-0.5 w-7 shrink-0">备选</span>
            <div className="text-[11px] text-zinc-500 leading-relaxed flex-1">
              {data.alternatives.map((alt, i) => (
                <div key={i} className="line-through decoration-zinc-300 dark:decoration-zinc-600">
                  · {alt}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 从 AI 输出文本中解析 <DECISION> 标签
 *
 * 格式：
 * <DECISION>
 * {"why":"...","what":"...","type":"control","evidence":[...],"confidence":0.85}
 * </DECISION>
 *
 * 支持一条消息里多张卡片
 */
export function parseDecisionTags(text: string): DecisionData[] {
  if (!text || typeof text !== 'string') return []
  const results: DecisionData[] = []
  const pattern = /<DECISION>\s*([\s\S]*?)\s*<\/DECISION>/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const jsonText = match[1].trim()
      .replace(/^```json\s*/, '')
      .replace(/```\s*$/, '')
      .trim()
    try {
      const parsed = JSON.parse(jsonText)
      if (parsed && typeof parsed === 'object' && parsed.why && parsed.what) {
        results.push(parsed as DecisionData)
      }
    } catch {
      // 跳过解析失败的标签
    }
  }
  return results
}

/**
 * 从文本中剥离 <DECISION>...</DECISION> 标签（防止在主消息里裸露 JSON）
 */
export function stripDecisionTags(text: string): string {
  if (!text || typeof text !== 'string') return text
  return text.replace(/<DECISION>\s*[\s\S]*?\s*<\/DECISION>/g, '').trim()
}
