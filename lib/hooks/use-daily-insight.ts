"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * 「AI 每日洞察」共享数据层
 *
 * 背景：`components/dashboard/ai-insight-card.tsx` 与
 * `components/dashboard/ios-style/ai-insight-widget.tsx`（已合并删除，网格槽位改作热力图）
 * 各自复制了一份「fetch /api/ai/daily-insight + riskLevel → 文案/配色」的逻辑。
 * 这里收敛为唯一来源，外壳只负责版式。
 */

export type InsightRiskLevel = "low" | "medium" | "high"

export interface DailyInsight {
  riskLevel: InsightRiskLevel
  insight: string
  recommendation: string
  /** 接口未必返回，缺省时 UI 自行兜底 */
  confidence?: number
  error?: string
}

/**
 * 风险等级 → 展示口径（文案 + 语义色）——全站唯一映射
 *
 * ⚠️⚠️ 2026-10-04 修：`medium` 原为 `accent: "#059669"` / `chipClass: "text-emerald-600 …"`，
 *     与 `low`（品牌绿 #34d399 / emerald）**撞色** ——
 *     结果是「需关注」（告警）和「环境优良」（正常）在界面上长得一模一样，
 *     用户报原话：「告警态和正常态怎么会一致。用户发现不了啊」。
 *
 *     语义色只有三档可用（components/device/material-css.ts 的语义材质）：
 *       warn = 琥珀 #D97706「警示」/ danger = 红 #DC2626「危险」/ ok = 翠绿 #059669「正常」
 *     风险也正好三档 → 一对一映射，不能再让两档共用同一个色：
 *       high  高风险  → danger 红
 *       medium 需关注 → warn   琥珀   ← 本行原本错用了绿
 *       low   优良   → ok     翠绿
 */
export const INSIGHT_RISK_META: Record<
  InsightRiskLevel,
  {
    /** 英文短语（角标 / Badge 用） */
    labelEn: string
    /** 中文短标签 */
    labelCn: string
    /** 大标题 */
    headline: string
    /** 语义色（与 material-css.ts 的语义材质同源：danger / warn / ok） */
    accent: string
    /** 语义色淡底 + 描边组合（tailwind class） */
    chipClass: string
  }
> = {
  high: {
    labelEn: "High Risk",
    labelCn: "高风险",
    headline: "需要立即处理",
    accent: "#dc2626",
    chipClass: "text-red-600 bg-red-500/10 border-red-500/20 dark:text-red-400",
  },
  medium: {
    labelEn: "Attention",
    labelCn: "需关注",
    headline: "检测到潜在风险",
    /* 原来是 #059669（品牌绿）—— 那是「正常」的色，不是「警示」的色 */
    accent: "#d97706",
    chipClass: "text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400",
  },
  low: {
    labelEn: "Healthy",
    labelCn: "环境优良",
    headline: "系统运行状态良好",
    accent: "#059669",
    chipClass: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  },
}

export function normalizeRiskLevel(raw: unknown): InsightRiskLevel {
  return raw === "high" || raw === "medium" || raw === "low" ? raw : "low"
}

/** IP 3D 图标（按风险等级切换，加载中用无人机巡检图） */
export const INSIGHT_IP_IMAGES: Record<InsightRiskLevel | "loading", string> = {
  high: "/ip/智慧农业3D图标-浇水灌溉-细线版.png",
  medium: "/ip/智慧农业3D图标-无人机巡检-细线版.png",
  low: "/ip/智慧农业3D图标-作物检测-细线版.png",
  loading: "/ip/智慧农业3D图标-无人机巡检-细线版.png",
}

export interface UseDailyInsightResult {
  data: DailyInsight | null
  loading: boolean
  error: boolean
  refresh: () => void
}

/**
 * @param enabled 为 false 时不发请求（例如卡片被隐藏 / 非 full 版本）
 */
export function useDailyInsight(enabled = true): UseDailyInsightResult {
  const [data, setData] = useState<DailyInsight | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch("/api/ai/daily-insight")
      const json = await res.json().catch(() => null)
      if (!res.ok || !json) throw new Error("Failed to fetch daily insight")
      setData({
        riskLevel: normalizeRiskLevel(json.riskLevel),
        insight: String(json.insight ?? ""),
        recommendation: String(json.recommendation ?? ""),
        confidence: typeof json.confidence === "number" ? json.confidence : undefined,
        error: json.error,
      })
    } catch (e) {
      console.error("[useDailyInsight]", e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void refresh()
  }, [enabled, refresh])

  return { data, loading, error, refresh }
}
