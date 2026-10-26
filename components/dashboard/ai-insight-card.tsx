"use client"

import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { ImmersiveCard } from "@/components/device/immersive-card"
import { IconArrowRight, IconCaution, IconCheckOne, IconLightning, IconRefresh } from "@/components/icon";
import {
  useDailyInsight,
  INSIGHT_RISK_META,
  type InsightRiskLevel,
} from "@/lib/hooks/use-daily-insight"

/**
 * AI 每日洞察 · 单行摘要条（dashboard 顶栏）
 *
 * 数据/配色口径全部来自 `lib/hooks/use-daily-insight` —— 与仪表盘小组件同源。
 *
 * ══════════════════════════════════════════════════════════════════
 * 2026-10-04 第二次改版（用户原话：「每日洞察排版很丑啊啊，非得用这种形式来展现吗」）
 *
 * ── 为什么上一版仍然丑（不是配色问题，是**层级堆叠**问题）──
 *   上一版在约 200px 高里纵向塞了 **6 条横向带**：
 *     ① 英文小标 `AI DAILY INSIGHT`   ② 中文大标题 `每日洞察`
 *     ③ 状态药丸  ④ 洞察正文  ⑤ 发丝线  ⑥ `AI 建议` 小标题 + 图标 + 正文
 *   其中两组是**纯重复**：
 *     · ① 与 ② 说的是同一件事（还都是「这是什么卡」而非「里面说了什么」）；
 *     · ③ 的「检测到潜在风险」紧跟着被 ④ 的正文又说了一遍。
 *   纵向堆 6 层是**文档**的排法：每层都在喊，所以没有重点。
 *   而仪表盘首屏上方这块位置，本来就该让给下面的网格看板。
 *
 * ⚠️ 记忆里那条铁律的教训（`ai-insight` 已从网格槽位移出、改为顶栏 hero）也要顾到：
 *   不是页面上没地方放，而是**这块内容不需要那么大的版面**。
 *
 * ── 现在的形态 ──
 *   一行、约 60px：`[状态点] 结论 · 摘要 …………… 完整分析 ↗  刷新`
 *   信息一条不丢 —— `insight`（结论）留在条上，`recommendation`（建议）走「完整分析」。
 *   ⚠️ 若调用方**没给 `onOpenDetail`**（如当前 dashboard 用法），则不能把建议藏起来
 *      变成死信息：此时摘要条自动**可展开**，点一下在条下露出一行「建议」。
 *      （旧实现是直接 `onOpenDetail &&` 隐藏按钮 → 建议永远不可达。）
 *
 * ── 材质照旧（华为 HDS 沉浸光感，唯一来源 components/device/material-css.ts）──
 *   ImmersiveCard（REGULAR 档）+ interactive={false}（条本身不可点，按压光会被误读成可点）。
 *   状态语义色仍走 dc-mat--tint-* 的**材质本体染色**（底/受光边/投影三件一起），
 *   不是贴一块色片。本文件不写任何 --mat-* 数值。
 * ══════════════════════════════════════════════════════════════════
 */

/**
 * ══════════════════════════════════════════════════════════════════
 * 2026-10-04 第三次改版：修「告警态与正常态看起来一样」（用户报「用户发现不了啊」）
 *
 * ── 病根 1：语义映射写错（同一档绿用了两次）──
 *   `RISK_MAT` 原为 `{ high: warn, medium: OK, low: OK }` ——
 *   「需关注」和「环境优良」拿到**同一个绿色材质**。
 *   数据层 `INSIGHT_RISK_META.medium.accent` 也是 `#059669`（品牌绿），同样错。
 *   语义色只有三档（material-css.ts）：warn=琥珀「警示」/ danger=红「危险」/ ok=翠绿「正常」，
 *   而风险有三档 —— 正确映射只能是 high→danger、medium→warn、low→ok。
 *
 * ── 病根 2：只靠一枚小药丸变色，扫不到 ──
 *   一行 1400px 的摘要条里，12px 的药丸换色在余光里几乎不可见；
 *   而这块条最常见的状态是「正常」，日常看起来永远一样 → 告警来了也发现不了。
 *
 * ── 现在的规则：**分级升级（升级才染色，正常保持中性）** ──
 *   low  正常  → 条体**中性材质**（不染）+ 翠绿点 + 翠绿药丸  ← 常态，安静
 *   medium 关注 → **整条琥珀染色** + 琥珀药丸                    ← 一眼可见
 *   high  危险 → **整条红色染色** + 红色药丸                    ← 强提醒
 *   依据华为「巧妙突出重要内容」：强调来自**对比**（多数时候安静，异常时才变），
 *   而不是让每一档各染一个色 —— 那样三档都"在喊"，等于都没有重点。
 *   染色范围也遵循 HDS：语义色做进**材质本体**（底/受光边/投影三件一起），
 *   不是盖一层色片；alpha 由 material-css.ts 统一给（.09~.10），本文件不写数值。
 * ══════════════════════════════════════════════════════════════════
 */

/** 条体材质：**只有异常档染色**，正常档走 REGULAR 档默认材质（对比才是强调）
 *  ⚠️ 正常档不要挂 `dc-mat--neutral` —— 那档是给「画布本身纯白」的场景用的（只换底/边、
 *     不换受光边与投影），看板画布是 #F7F7F8 + 氛围层，挂上去反而与其它小组件材质不一致。 */
const RISK_BAR_MAT: Record<InsightRiskLevel, string> = {
  high: "dc-mat--tint-danger",
  medium: "dc-mat--tint-warn",
  low: "",
}

/** 状态药丸材质：三档各自区分（小面积，可以都用色） */
const RISK_CHIP_MAT: Record<InsightRiskLevel, string> = {
  high: "dc-mat--tint-danger",
  medium: "dc-mat--tint-warn",
  low: "dc-mat--tint-ok",
}

const RISK_ICON: Record<InsightRiskLevel, typeof IconCaution> = {
  high: IconCaution,
  medium: IconLightning,
  low: IconCheckOne,
}

/** 状态色（点 / 药丸文字）。语义色只落在小面积，条体染色交给材质 */
const RISK_TEXT: Record<InsightRiskLevel, string> = {
  high: "text-red-700 dark:text-red-300",
  medium: "text-amber-700 dark:text-amber-300",
  low: "text-emerald-700 dark:text-emerald-300",
}

const RISK_DOT: Record<InsightRiskLevel, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
}

export function AiInsightCard({
  className,
  /** 点击「完整分析」时的回调；缺省时摘要条改为可展开（建议不能不可达） */
  onOpenDetail,
}: {
  className?: string
  onOpenDetail?: () => void
}) {
  const { data, loading, error, refresh } = useDailyInsight()
  // 无 onOpenDetail 时靠展开露出「建议」；有回调时展开无意义，直接走完整分析
  const [expanded, setExpanded] = useState(false)
  const canExpand = !onOpenDetail

  const risk = data?.riskLevel ?? "low"
  const meta = INSIGHT_RISK_META[risk]

  const refreshBtn = (
    <button
      type="button"
      onClick={refresh}
      /* ⚠️ 不用 `disabled`（记忆铁律）：Chrome 里 disabled 的 button 不派发鼠标事件
         → `title` 永不显示。要 tooltip 就走 aria-disabled + tabIndex。 */
      aria-disabled={loading}
      tabIndex={loading ? -1 : 0}
      title="重新生成洞察"
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full",
        "text-zinc-400 transition-colors duration-200",
        "hover:bg-zinc-900/[0.06] hover:text-zinc-700",
        "dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200",
        loading && "pointer-events-none opacity-50"
      )}
    >
      <IconRefresh size={14} className={loading ? "animate-spin" : undefined} />
    </button>
  )

  /* ── 加载：同高骨架条，避免数据到达时高度跳一下 ── */
  if (loading && !data && !error) {
    return (
      <ImmersiveCard className={className} grade="regular" interactive={false}>
        <div className="flex h-[58px] items-center gap-3 px-4">
          <Skeleton className="size-2 shrink-0 rounded-full bg-zinc-300/70 dark:bg-white/15" />
          <Skeleton className="h-3.5 w-16 shrink-0 rounded-full bg-zinc-200/70 dark:bg-white/10" />
          <Skeleton className="h-3.5 flex-1 rounded-full bg-zinc-200/70 dark:bg-white/10" />
          <Skeleton className="size-7 shrink-0 rounded-full bg-zinc-200/70 dark:bg-white/10" />
        </div>
      </ImmersiveCard>
    )
  }

  /* ── 错误：同样压成一行，不再为失败态撑起 200px（旧版会整块塌成居中大卡）。
        整条红色染色 —— 失败本身就是一个必须一眼看到的告警态。 ── */
  if (error) {
    return (
      <ImmersiveCard className={cn("dc-mat--tint-danger", className)} grade="regular" interactive={false}>
        <div className="flex h-[58px] items-center gap-3 px-4">
          <span className="dc-mat dc-mat--thin dc-mat--tint-danger grid size-6 shrink-0 place-items-center rounded-full">
            <IconCaution size={13} className="text-red-600 dark:text-red-300" />
          </span>
          <span className="text-[13px] font-medium text-red-800 dark:text-red-200">无法生成洞察</span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-600 dark:text-zinc-300">
            AI 服务暂时不可用，请稍后重试
          </span>
          <button
            type="button"
            onClick={refresh}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[12.5px] font-medium",
              "text-red-700 dark:text-red-200",
              "dc-ctrl dc-ctrl--field dc-ctrl--press"
            )}
          >
            重试
          </button>
        </div>
      </ImmersiveCard>
    )
  }

  if (!data) return null

  const RIcon = RISK_ICON[risk]

  /* ── 正文：结论 + 摘要一行。摘要在窄屏被截断，完整文本仍在 DOM（title 可读全） ── */
  const Row = (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {/* 状态点：一眼可见的风险等级（与药丸同色，双保险） */}
      <span className={cn("size-2 shrink-0 rounded-full", RISK_DOT[risk])} />
      {/* 状态词 + 图标：语义色染进 thin 材质本体，不是贴色片 */}
      <span
        className={cn(
          "dc-mat dc-mat--thin hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 sm:inline-flex",
          RISK_CHIP_MAT[risk]
        )}
      >
        <RIcon size={12} className={cn("shrink-0", RISK_TEXT[risk])} />
        <span className={cn("whitespace-nowrap text-[12px] font-medium", RISK_TEXT[risk])}>
          {meta.labelCn}
        </span>
      </span>
      {/* 结论：本条唯一的正文，单行截断 */}
      <p
        className="min-w-0 flex-1 truncate text-[13.5px] text-zinc-700 dark:text-zinc-300"
        title={data.insight}
      >
        {data.insight}
      </p>
    </div>
  )

  return (
    /* ⚠️ 条体材质随风险升级：high/medium 才染色，low 保持档位默认 —— 
       「告警态与正常态必须一眼可分」就靠这条大面积线索 + 小面积药丸色双保险。 */
    <ImmersiveCard
      className={cn(RISK_BAR_MAT[risk], className)}
      grade="regular"
      interactive={false}
    >
      <div className="flex h-[58px] items-center gap-3 px-4">
        {Row}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {onOpenDetail ? (
            <button
              type="button"
              onClick={onOpenDetail}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-medium text-emerald-600 transition-colors hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              完整分析
              <IconArrowRight size={12} />
            </button>
          ) : (
            /* 无回调 → 摘要条本身可展开，保证「建议」可达 */
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-medium text-zinc-500 transition-colors hover:bg-zinc-900/[0.06] hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-200"
            >
              建议
              <IconArrowRight
                size={12}
                className={cn("transition-transform duration-200", expanded && "rotate-90")}
              />
            </button>
          )}
          {refreshBtn}
        </div>
      </div>

      {/* 展开区：仅在无「完整分析」回调时使用（否则建议本就走详情页） */}
      {canExpand && (
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="advice"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.2, 0.72, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-zinc-200/70 px-4 pb-3.5 pt-3 dark:border-white/10">
                <div className="flex min-w-0 items-start gap-2.5">
                  {/* 图标裸放（不给圆底座，避免圆角矩形套圆角矩形） */}
                  <span className="mt-[3px] shrink-0 text-[11px] font-medium tracking-wide text-zinc-400 dark:text-zinc-500">
                    建议
                  </span>
                  <p className="text-[13px] leading-[1.65] text-zinc-800 dark:text-zinc-200">
                    {data.recommendation}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </ImmersiveCard>
  )
}

export default AiInsightCard
