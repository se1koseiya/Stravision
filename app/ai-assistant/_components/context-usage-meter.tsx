"use client"

/**
 * 上下文容量指示器（Context Usage Meter）
 *
 * 形态参考 WorkBuddy（2026-10-10 用户给了参考图）：
 *   · 收起态 —— 只有一枚小圆环（不带文字，不给 footer 添负担）
 *   · hover   —— 出气泡：「59.1% · 177.3K / 300.0K 上下文已使用」
 *   · 点击    —— 弹明细卡：大百分比 + 分段堆叠条 + 各类别占用列表
 *
 * 数据口径：
 *   - 已用量 / 分项明细来自后端 SSE 的 `context_usage` 事件（唯一真相源）
 *   - 窗口容量按当前模型推断（`resolveModelWindow`，与后端同一套表）
 *
 * 百分比分母 = **窗口容量**（`177.3K / 300.0K` → 59.1%），与参考图一致；
 * 「输出预留占掉的那部分」在明细卡底部一行小字里说明，不参与主口径。
 */

import * as React from "react"
import { Popover, Tooltip } from "antd"
import { IconClose } from "@/components/icon"
import { buildContextBudget, getInputBudget, resolveModelWindow } from "@/lib/ai/context/budget"
import type { ContextCategoryKey } from "@/lib/ai/context/telemetry"

/* ── 收起态那枚 19px 细环 ────────────────────────────────────────────────
 * 🚨 2026-10-22 自己画，不再用 antd <Progress type="circle">（用户实锤截图：
 *    「转圈和背景圆都没有匹配好」）。原因很具体：antd v6 为了做**颜色切换动画**，
 *    会同时挂两个 `ant-progress-circle-path`（旧色节点 + 新色节点），而新色节点
 *    在 `strokeColor` 为半透明轨道色时会回落成 antd 自带的 colorSuccess
 *    `rgb(82,196,26)` —— 于是一小截**草绿**弧配着一圈灰轨道，色系都对不上。
 *    自己画只有「轨道 + 弧」两条 circle，几何参数同源 ⇒ 圆心、半径、线宽、
 *    端点圆头必然完全重合，也不可能再冒出第三种颜色。
 *    语义色仍由 toneOf() 决定（<60% 翠绿 / ≥60% 琥珀 / ≥85% 红），不在这层覆盖。 */
const RING_SIZE = 19
const RING_STROKE = 2.2
const RING_R = (RING_SIZE - RING_STROKE) / 2
const RING_C = 2 * Math.PI * RING_R

/** 后端 `context_usage` 事件里的单个分项 */
export interface ContextBreakdownItem {
  key: ContextCategoryKey
  label: string
  tokens: number
}

/** 后端 `context_usage` 事件的载荷 */
export interface ContextUsageInfo {
  /** 本轮真正下发的 system prompt + 历史消息的估算 token */
  usedTokens: number
  /** 模型上下文窗口（后端按 effectiveModel 推断，'auto' 已解析为真实模型） */
  windowTokens: number
  /** 可用于输入的预算（窗口 − 输出预留 − 安全余量） */
  inputBudgetTokens: number
  /** 后端实际使用的模型 id */
  model: string
  /** 本次请求是否触发了历史压缩 */
  compressed?: boolean
  /** 分项占用（系统提示词 / 技能 / 工具 / 对话消息 …） */
  breakdown?: ContextBreakdownItem[]
  /** 当前窗口是否来自用户自定义（设置 → 助理设置 → 上下文与压缩） */
  windowIsCustom?: boolean
  /** 自动压缩触发比例（输入预算占比），默认 0.6 */
  compressionTriggerRatio?: number
  /** 自动压缩触发 token 数（= 输入预算 × 触发比例） */
  compressionTriggerTokens?: number
}

interface Props {
  /** 后端上报的容量数据；从未发过消息时为 null */
  usage: ContextUsageInfo | null
  /** 用户当前选中的模型（可能是 'auto'） */
  model: string
  /** 当前会话是否已有历史消息（决定「未测量」时显示 `—` 还是 `0`） */
  hasMessages?: boolean
  darkMode?: boolean
}

/** 分项色板：与项目主色（emerald×zinc）同族的低饱和多色，保证相邻项可分辨 */
const CATEGORY_COLOR: Record<ContextCategoryKey, { light: string; dark: string }> = {
  system: { light: "#8B5CF6", dark: "#A78BFA" },
  skill: { light: "#EC4899", dark: "#F472B6" },
  tools: { light: "#10B981", dark: "#34D399" },
  messages: { light: "#F59E0B", dark: "#FBBF24" },
  userInfo: { light: "#3B82F6", dark: "#60A5FA" },
  environment: { light: "#06B6D4", dark: "#22D3EE" },
  other: { light: "#A1A1AA", dark: "#71717A" },
}

function colorOf(key: ContextCategoryKey, dark: boolean): string {
  const c = CATEGORY_COLOR[key] ?? CATEGORY_COLOR.other
  return dark ? c.dark : c.light
}

/** token 数紧凑显示：128000 → 128.0K，24800 → 24.8K，980 → 980 */
export function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0"
  if (n < 1000) return String(Math.round(n))
  return `${(n / 1000).toFixed(1)}K`
}

/**
 * 按占用率取语义色。
 * 三档与「什么时候该担心」对齐：60% 开始偏满，85% 接近上限（此时压缩已很频繁）。
 */
function toneOf(ratio: number, dark: boolean): { color: string; label: string } {
  if (ratio >= 0.85) return { color: dark ? "#f87171" : "#dc2626", label: "接近上限" }
  if (ratio >= 0.6) return { color: dark ? "#fbbf24" : "#d97706", label: "占用偏高" }
  return { color: dark ? "#34D399" : "#059669", label: "余量充足" }
}

export function ContextUsageMeter({ usage, model, hasMessages = false, darkMode = false }: Props) {
  const [open, setOpen] = React.useState(false)

  // 'auto' 时前端推不出后端解析后的真实模型 → 一律采信后端上报的窗口
  const isAutoIntent = !model || model === "auto"
  const useReported = !!usage && (isAutoIntent || usage.model === model)

  const windowTokens = useReported ? usage.windowTokens : resolveModelWindow(model || undefined)
  const inputBudgetTokens = useReported
    ? usage.inputBudgetTokens
    : getInputBudget(buildContextBudget(model || undefined))

  const measured = !!usage
  const usedTokens = usage?.usedTokens ?? 0
  /*
   * 自动压缩触发线（用户可在「设置 → 助理设置 → 上下文与压缩」调整比例）：
   * 优先用后端上报的 token 数；老报文没有该字段时按「输入预算 × 比例」补算，
   * 两者都拿不到就画不出线（不猜）。
   */
  const triggerTokens = useReported
    ? usage!.compressionTriggerTokens ??
      (usage!.compressionTriggerRatio != null
        ? Math.floor(usage!.inputBudgetTokens * usage!.compressionTriggerRatio)
        : null)
    : null
  const triggerRatio =
    triggerTokens != null && windowTokens > 0 && triggerTokens <= windowTokens
      ? triggerTokens / windowTokens
      : null
  const ratio = windowTokens > 0 ? Math.min(1, usedTokens / windowTokens) : 0
  const pct = Math.round(ratio * 1000) / 10 // 保留 1 位小数，对齐参考图的 59.1%
  const tone = toneOf(ratio, darkMode)

  const dim = darkMode ? "#a1a1aa" : "#71717a"
  const strong = darkMode ? "#e4e4e7" : "#3F3F46"
  const faint = darkMode ? "rgba(255,255,255,0.06)" : "rgba(24,24,27,0.06)"
  const track = darkMode ? "rgba(255,255,255,0.12)" : "rgba(24,24,27,0.09)"

  /*
   * 未测量三态必须可区分（否则会被误读成「上下文是空的」）：
   *   ① 空态（无消息、无上报）   → 0
   *   ② 有历史但本页还没发消息   → —
   *   ③ 已上报                   → 实际 token
   * 不在本地拿历史消息估一个数：前端拿不到 system prompt（技能 / 工具索引进不去），
   * 估出来会严重偏小，比不显示更误导。
   */
  const valueText = measured ? formatTokens(usedTokens) : hasMessages ? "—" : "0"

  const hoverTip = measured
    ? `${pct}% · ${formatTokens(usedTokens)} / ${formatTokens(windowTokens)} 上下文已使用`
    : hasMessages
      ? "上下文用量 · 发一条消息后显示"
      : `上下文用量 · 窗口 ${formatTokens(windowTokens)}`

  // 明细项：已测量用后端分项
  const items = measured
    ? (usage!.breakdown ?? []).map((b) => {
        const p = windowTokens > 0 ? (b.tokens / windowTokens) * 100 : 0
        return {
          key: b.key,
          label: b.label,
          tokens: b.tokens,
          // 有量但不足 0.1% 时显示 `<0.1`，避免出现「对话消息 0.0%」这种看着像没有的写法
          text: b.tokens > 0 && p < 0.05 ? "<0.1" : p.toFixed(1),
        }
      })
    : []

  const panel = (
    <div data-lenis-prevent style={{ width: 296, padding: "14px 16px 10px" }}>
      {/* 标题行 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: strong }}>上下文用量</span>
        <button
          onClick={() => setOpen(false)}
          title="关闭"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 22, height: 22, borderRadius: 6, border: "none", cursor: "pointer",
            background: "transparent", color: dim, padding: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = faint }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
        >
          <IconClose size={14} />
        </button>
      </div>

      {/* 大百分比 + 已用/窗口 */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: strong, letterSpacing: "-0.5px", lineHeight: 1.1 }}>
          {measured ? `${pct}%` : "—"}
        </span>
        <span style={{ fontSize: 12, color: dim }}>
          已使用 {valueText} / {formatTokens(windowTokens)}
        </span>
      </div>

      {/* 分段堆叠条：总宽 = 窗口，彩色段 = 各类别占用，余下为灰色轨道。
          叠加一条「自动压缩触发线」——用户调过阈值后能一眼看出离压缩还有多远。 */}
      <div style={{ position: "relative", margin: "12px 0 8px" }}>
        <div
          style={{
            display: "flex", height: 8, borderRadius: 4, overflow: "hidden",
            background: track,
          }}
        >
          {items.map((it) => (
            <div
              key={it.key}
              title={`${it.label} ${it.text}%`}
              style={{
                width: `${windowTokens > 0 ? (it.tokens / windowTokens) * 100 : 0}%`,
                background: colorOf(it.key as ContextCategoryKey, darkMode),
                transition: "width 0.4s ease",
              }}
            />
          ))}
        </div>
        {triggerRatio != null && (
          <div
            title={`自动压缩触发线 · ${formatTokens(triggerTokens ?? 0)} tokens`}
            style={{
              position: "absolute", top: -3, bottom: -3,
              left: `${triggerRatio * 100}%`, width: 2,
              marginLeft: -1, borderRadius: 1,
              background: darkMode ? "#fbbf24" : "#d97706",
            }}
          />
        )}
      </div>

      {/* 明细列表 */}
      {measured ? (
        items.length > 0 ? (
          <div>
            {items.map((it) => (
              <div
                key={it.key}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6.5px 0" }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: colorOf(it.key as ContextCategoryKey, darkMode),
                    }}
                  />
                  <span style={{ fontSize: 13, color: strong, whiteSpace: "nowrap" }}>{it.label}</span>
                </span>
                <span style={{ fontSize: 13, color: dim, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  {it.text}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: dim, padding: "6px 0" }}>暂无可拆分的上下文占用</div>
        )
      ) : (
        <div style={{ fontSize: 12.5, color: dim, padding: "6px 0", lineHeight: 1.6 }}>
          {hasMessages ? "发一条消息后即显示本会话的实际占用。" : "还没有对话内容，窗口按当前模型推算。"}
        </div>
      )}

      {/* 脚注：输出预留不参与主口径，在这里说清 */}
      <div
        style={{
          marginTop: 8, paddingTop: 8, borderTop: `1px solid ${faint}`,
          fontSize: 11.5, color: dim, lineHeight: 1.6,
        }}
      >
        模型 {usage?.model || model || "未指定"} · 窗口 {formatTokens(windowTokens)}
        {usage?.windowIsCustom ? "（自定义）" : ""}
        {measured ? ` · ${tone.label}` : ""}
        <br />
        输入预算 {formatTokens(inputBudgetTokens)}（窗口预留 {formatTokens(Math.max(0, windowTokens - inputBudgetTokens))} 给模型回复）
        {triggerTokens != null && (
          <>
            <br />
            自动压缩：用量达 {formatTokens(triggerTokens)}（输入预算的{" "}
            {Math.round((usage?.compressionTriggerRatio ?? 0.6) * 100)}%）时折叠较早对话
          </>
        )}
        {usage?.compressed && (
          <>
            <br />
            ⚠️ 本次已自动压缩历史，较早的对话被折叠为摘要
          </>
        )}
      </div>
    </div>
  )

  const ring = (
    <button
      type="button"
      className="context-usage-meter"
      aria-label={`上下文已用 ${valueText} / ${formatTokens(windowTokens)} tokens`}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 28, height: 28, minWidth: 28, minHeight: 28, padding: 0, flexShrink: 0,
        borderRadius: "50%", border: "none", cursor: "pointer",
        background: open ? faint : "transparent",
        transition: "background 0.15s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = faint }}
      onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent" }}
    >
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        aria-hidden
        style={{ display: "block", overflow: "visible" }}
      >
        {/* 轨道：与弧同 r / 同线宽 —— 任何一档用量都是严丝合缝的一圈 */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          fill="none"
          stroke={darkMode ? "rgba(255,255,255,0.16)" : "rgba(24,24,27,0.12)"}
          strokeWidth={RING_STROKE}
        />
        {/* 进度弧：0% 时整段退到起点（dashoffset = 周长）⇒ 视觉上只剩轨道 */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          fill="none"
          stroke={measured ? tone.color : track}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - (measured ? ratio : 0))}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          style={{ transition: "stroke-dashoffset .3s ease, stroke .3s ease" }}
        />
      </svg>
    </button>
  )

  return (
    <Tooltip title={hoverTip} placement="top" mouseEnterDelay={0.12} open={open ? false : undefined}>
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger="click"
        placement="top"
        arrow={{ pointAtCenter: true }}
        /*
         * antd 6 的 12px 内边距挂在 `.ant-popover-container` 上（不是 `.ant-popover-content`，
         * 后者本来就是 0）→ 必须清 container，否则卡片会在我自己的 16px 之外再多 24px 白边。
         */
        styles={{ container: { padding: 0 }, content: { padding: 0 } }}
        content={panel}
      >
        {ring}
      </Popover>
    </Tooltip>
  )
}
