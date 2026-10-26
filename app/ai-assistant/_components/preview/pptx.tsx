"use client"

/**
 * PPTX 预览 —— 按服务端留下的 previewModel 渲染
 *
 * ## 为什么不是"解析 zip 再画"
 *
 * PPTX 在浏览器里没有可用的渲染器（pptxjs 之类的还原度很低，体积还不小）。
 * 但这里的 PPTX **是我们自己生成的**：排版时已经算好了每页的版式（cover / kpi /
 * chart / table / bullets…），把这份结构随元数据一起存下来即可 ——
 * 预览照着它画，天然与最终文件一致，也不用二次解析。
 *
 * ## 与生成器的几何一致性
 *
 * 坐标一律取 `SLIDE_METRICS`（pt），与 `render/pptx.ts` 同源；
 * 内部按 960×540 的逻辑尺寸排版，再用 `transform: scale()` 等比缩放到容器宽度。
 * ⛔ 不要在预览里另写一套间距 —— 那会出现"预览正好、打开文件压页脚"。
 *
 * ## 图标
 *
 * 与 PPT 里一样，图标来自 HarmonyOS Symbol 字形（填充轮廓），
 * 经 `getGlyphPath` 拿到路径后用 SVG 画：字体坐标系是 Y 向上，故整组翻转。
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { EMERALD, SEMANTIC, SLIDE_METRICS as M, SLIDE_PT, TYPE, ZINC } from "@/lib/documents/theme"
import { getGlyphPath, pickIconFor } from "@/lib/documents/icons"
import type { PreviewSurfaceProps } from "./types"

const W = SLIDE_PT.w
const H = SLIDE_PT.h
/** 内容区左右边距（pt）= SLIDE_MARGIN_X / 12700 */
const MX = 45
const CONTENT_W = W - MX * 2

const INK = `#${ZINC.ink}`
const BODY = `#${ZINC.body}`
const MUTE = `#${ZINC.mute}`
const FAINT = `#${ZINC.faint}`
const HAIRLINE = `#${ZINC.hairline}`
const ACCENT = `#${EMERALD.light}`
const ACCENT_DEEP = `#${EMERALD.deep}`
const WASH = `#${EMERALD.wash}`
const UP = `#${SEMANTIC.danger}`
const DOWN = `#${SEMANTIC.ok}`

/** 一枚系统图标（填充轮廓，Y 轴翻转） */
function Glyph({ name, size, color }: { name: string; size: number; color: string }) {
  const d = getGlyphPath(name)
  if (!d) return <span aria-hidden style={{ display: "inline-block", width: size, height: size }} />
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 1000 1000"
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
    >
      <g transform="translate(0 880) scale(1 -1)">
        <path d={d} fill={color} />
      </g>
    </svg>
  )
}

/** 一条要点：图标（配不到则用主色短竖线）+ 文字 */
function BulletLine({ text }: { text: string }) {
  const icon = pickIconFor(text)
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-[3px] flex h-[13px] w-[13px] shrink-0 items-center justify-center">
        {icon ? <Glyph name={icon} size={13} color={ACCENT} /> : <span className="block h-[13px] w-[2.5px] rounded-full" style={{ background: ACCENT }} />}
      </span>
      <span style={{ fontSize: TYPE.body, lineHeight: 1.5, color: BODY }}>{text}</span>
    </li>
  )
}

/** 页面通用 chrome：标题 + 主色短线 */
function SlideChrome({ title }: { title: string }) {
  return (
    <>
      <div
        className="absolute font-semibold"
        style={{ left: MX, top: M.titleY, width: CONTENT_W, height: M.titleH, fontSize: TYPE.slideTitle, lineHeight: 1.2, color: INK }}
      >
        {title}
      </div>
      <div className="absolute rounded-full" style={{ left: MX, top: M.ruleY, width: M.ruleW, height: M.ruleH, background: ACCENT }} />
    </>
  )
}

/** 页脚：文档名 · 页码 */
function SlideFooter({ docTitle, page }: { docTitle: string; page: number }) {
  return (
    <div
      className="absolute text-right"
      style={{ left: MX, top: M.footerY, width: CONTENT_W, height: 18, fontSize: TYPE.footer, color: FAINT }}
    >
      {docTitle} · {page}
    </div>
  )
}

/** KPI 卡片组 */
function KpiRow({ kpis }: { kpis: any[] }) {
  const items = (kpis || []).slice(0, 4)
  if (!items.length) return null
  const gap = 18
  const cardW = Math.floor((CONTENT_W - gap * (items.length - 1)) / items.length)
  const cardH = 150
  const cardY = M.bodyY + 14

  return (
    <>
      {items.map((kpi, i) => {
        const x = MX + i * (cardW + gap)
        const tone = kpi.trend === "down" ? DOWN : kpi.trend === "up" ? UP : ACCENT
        return (
          <React.Fragment key={i}>
            <div
              className="absolute rounded-lg"
              style={{ left: x, top: cardY, width: cardW, height: cardH, background: WASH }}
            />
            <div
              className="absolute"
              style={{ left: x + 20, top: cardY + 26, width: cardW - 40, height: 58, display: "flex", alignItems: "flex-end", gap: 2 }}
            >
              <span style={{ fontSize: 40, fontWeight: 700, color: tone, lineHeight: 1 }}>{kpi.value}</span>
              {kpi.unit ? <span style={{ fontSize: 16, color: MUTE, lineHeight: 1.4 }}>{kpi.unit}</span> : null}
            </div>
            <div className="absolute" style={{ left: x + 20, top: cardY + 94, width: cardW - 40, height: 40 }}>
              <span style={{ fontSize: TYPE.caption, color: MUTE }}>{kpi.label}</span>
              {kpi.delta ? <span style={{ fontSize: TYPE.caption, color: tone }}> {kpi.delta}</span> : null}
            </div>
          </React.Fragment>
        )
      })}
    </>
  )
}

/** 柱状 / 折线图（SVG，随容器缩放不糊） */
const CHART_INK = ["#059669", "#0EA5E9", "#F59E0B", "#8B5CF6"]

function ChartPlot({ chart, height }: { chart: any; height: number }) {
  const series: any[] = chart.series || []
  const categories: string[] = chart.categories || []
  const n = Math.max(1, categories.length)
  const maxValue = Math.max(1, ...series.flatMap((s: any) => (s.values || []).map((v: number) => Math.abs(v))))
  const w = CONTENT_W
  const axisH = 24
  const h = height - axisH
  const groupW = w / n

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" aria-hidden>
      {chart.kind === "line"
        ? series.map((s: any, si: number) => {
            const pts = Array.from({ length: n }, (_, i) => {
              const x = ((i + 0.5) / n) * w
              const y = h - (Math.abs(s.values?.[i] ?? 0) / maxValue) * h
              return [x, y] as const
            })
            const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")
            const color = CHART_INK[si % CHART_INK.length]
            return (
              <g key={si}>
                <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {pts.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={3.5} fill={color} />
                ))}
              </g>
            )
          })
        : series.map((s: any, si: number) => {
            const color = CHART_INK[si % CHART_INK.length]
            const sCount = Math.max(1, series.length)
            const barW = Math.max(8, Math.min((groupW * 0.68) / sCount, 52))
            return (s.values || []).map((v: number, i: number) => {
              const bh = Math.max(2, (Math.abs(v) / maxValue) * (h - 14))
              const x = i * groupW + (groupW - barW * sCount) / 2 + si * barW
              const y = h - bh
              return <rect key={`${si}-${i}`} x={x} y={y} width={barW - 5} height={bh} fill={color} rx={2} />
            })
          })}
      <line x1={0} y1={h} x2={w} y2={h} stroke={HAIRLINE} strokeWidth={1} />
    </svg>
  )
}

/** 真表格 */
function DataTable({ table, height }: { table: any; height: number }) {
  const headers: string[] = table.headers || []
  const rows: string[][] = (table.rows || []).slice(0, 8)
  if (!headers.length) return null

  return (
    <div className="overflow-hidden rounded-lg" style={{ border: `1px solid ${HAIRLINE}` }}>
      <table className="w-full border-collapse text-left" style={{ fontSize: TYPE.body - 2 }}>
        <thead>
          <tr style={{ background: WASH }}>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-2.5 py-1.5 font-semibold"
                style={{ color: INK, borderBottom: `1px solid ${HAIRLINE}` }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {headers.map((_, ci) => (
                <td
                  key={ci}
                  className="px-2.5 py-1.5"
                  style={{ color: BODY, borderBottom: `1px solid ${HAIRLINE}` }}
                >
                  {String(row[ci] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * 单页（960×540 逻辑画布）。
 *
 * 缩放用 ResizeObserver 测容器宽度，而不是 CSS `zoom` 或百分比字号：
 * 前者在 Chromium 下对 `position:absolute` 的换算有偏差，后者会让
 * 字号与坐标脱钩 —— 都会破坏"预览 = 文件"。
 */
function Slide({ slide, index }: { slide: any; index: number }) {
  const layout = slide.layout as string
  const common = { docTitle: slide.docTitle || slide.title }

  return (
    <div
      data-preview-slide={index}
      /* data-doc-anchor：折叠窄条的缩略导航按它跳转（一张幻灯片 = 一格） */
      data-doc-anchor={index}
      data-slide-layout={layout}
      className="relative overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-900/10 dark:bg-zinc-950 dark:ring-white/10"
      style={{ width: "100%", aspectRatio: `${W} / ${H}` }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: H,
          transformOrigin: "top left",
          // 父级宽度由 ResizeObserver 写入 CSS 变量，避免每个 slide 各起一个 observer
          transform: "scale(var(--slide-scale, 1))",
        }}
      >
        <SlideBody slide={slide} layout={layout} />
        {layout !== "cover" && <SlideFooter {...common} page={index + 1} />}
      </div>
    </div>
  )
}

function SlideBody({ slide, layout }: { slide: any; layout: string }) {
  switch (layout) {
    case "cover":
      return (
        <>
          <div className="absolute" style={{ left: 0, top: 0, width: M.coverStripW, height: H, background: ACCENT }} />
          <div
            className="absolute font-bold"
            style={{ left: M.coverX, top: M.coverTitleY, width: W - 170, fontSize: TYPE.coverTitle, lineHeight: 1.2, color: INK }}
          >
            {slide.title}
          </div>
          {slide.subtitle ? (
            <>
              <div
                className="absolute"
                style={{ left: M.coverX, top: M.coverSubtitleY, width: W - 170, fontSize: TYPE.lead, color: MUTE }}
              >
                {slide.subtitle}
              </div>
              <div
                className="absolute"
                style={{ left: M.coverX, top: M.coverRuleY, width: 96, height: 3, background: ACCENT }}
              />
            </>
          ) : null}
        </>
      )

    case "section":
      return (
        <>
          <div className="absolute" style={{ left: 0, top: 0, width: W, height: H, background: ACCENT_DEEP }} />
          <div
            className="absolute font-bold"
            style={{
              left: M.sectionX,
              top: M.sectionY,
              width: W - 220,
              height: 130,
              fontSize: TYPE.sectionTitle,
              lineHeight: 1.2,
              color: `#${ZINC.white}`,
              display: "flex",
              alignItems: "center",
            }}
          >
            {slide.title}
          </div>
        </>
      )

    case "quote":
      return (
        <>
          <div className="absolute select-none" style={{ left: MX, top: 150, fontSize: 72, fontWeight: 700, color: WASH, lineHeight: 1 }}>
            &ldquo;
          </div>
          <div
            className="absolute whitespace-pre-wrap break-words"
            style={{
              left: MX + 56,
              top: 216,
              width: CONTENT_W - 104,
              fontSize: TYPE.lead,
              lineHeight: 1.6,
              color: BODY,
            }}
          >
            {slide.block}
          </div>
        </>
      )

    case "closing":
      return (
        <>
          <div className="absolute" style={{ left: 0, top: 0, width: W, height: H, background: WASH }} />
          <div className="absolute" style={{ left: 0, top: 0, width: W, height: 6, background: ACCENT }} />
          <div
            className="absolute font-bold"
            style={{
              left: MX,
              top: 150,
              width: CONTENT_W,
              height: 90,
              fontSize: TYPE.sectionTitle,
              color: INK,
              display: "flex",
              alignItems: "center",
            }}
          >
            {slide.title}
          </div>
          {slide.bullets?.length ? (
            <ul
              className="absolute flex flex-col"
              style={{ left: MX, top: 260, width: CONTENT_W, gap: 12, margin: 0, padding: 0, listStyle: "none" }}
            >
              {slide.bullets.map((b: string, i: number) => (
                <BulletLine key={i} text={b} />
              ))}
            </ul>
          ) : null}
        </>
      )

    case "kpi":
      return (
        <>
          <SlideChrome title={slide.title} />
          <KpiRow kpis={slide.kpis} />
        </>
      )

    case "chart":
      return (
        <>
          <SlideChrome title={slide.title} />
          {slide.chart ? (
            <div className="absolute" style={{ left: MX + 14, top: M.bodyY + 6, width: CONTENT_W - 28 }}>
              <ChartPlot
                chart={slide.chart}
                height={slide.table?.rows?.length ? M.bodyBottom - M.bodyY - 6 - 14 - Math.min(150, Math.max(60, (slide.table.rows.length + 1) * 26)) : M.bodyBottom - M.bodyY - 30}
              />
            </div>
          ) : null}
          {slide.table?.headers?.length ? (
            <div className="absolute" style={{ left: MX, top: M.bodyBottom - Math.min(150, Math.max(60, ((slide.table.rows?.length || 0) + 1) * 26)), width: CONTENT_W }}>
              <DataTable table={slide.table} height={0} />
            </div>
          ) : null}
        </>
      )

    case "table":
      return (
        <>
          <SlideChrome title={slide.title} />
          {slide.table ? (
            <div className="absolute" style={{ left: MX, top: M.bodyY, width: CONTENT_W }}>
              <DataTable table={slide.table} height={M.bodyBottom - M.bodyY} />
            </div>
          ) : null}
        </>
      )

    case "twoColumn": {
      const half = Math.floor((CONTENT_W - 40) / 2)
      const cols: string[][] = [[], []]
      const lines = [0, 0]
      for (const b of slide.bullets || []) {
        const est = Math.max(1, Math.ceil(visualWidth(b) / 34))
        const k = lines[0] <= lines[1] ? 0 : 1
        cols[k].push(b)
        lines[k] += est
      }
      return (
        <>
          <SlideChrome title={slide.title} />
          {cols.map((col, i) => (
            <ul
              key={i}
              className="absolute flex flex-col"
              style={{ left: MX + i * (half + 40), top: M.bodyY, width: half, gap: 10, margin: 0, padding: 0, listStyle: "none" }}
            >
              {col.map((b, j) => (
                <BulletLine key={j} text={b} />
              ))}
            </ul>
          ))}
        </>
      )
    }

    default:
      return (
        <>
          <SlideChrome title={slide.title} />
          {slide.bullets?.length ? (
            <ul
              className="absolute flex flex-col"
              style={{ left: MX, top: M.bodyY, width: CONTENT_W, gap: 10, margin: 0, padding: 0, listStyle: "none" }}
            >
              {slide.bullets.map((b: string, i: number) => (
                <BulletLine key={i} text={b} />
              ))}
            </ul>
          ) : null}
        </>
      )
  }
}

/** 视觉宽度（与生成器同款估算：中文按 1.6 个半角算） */
function visualWidth(s: string): number {
  let w = 0
  for (const ch of String(s || "")) w += /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1.6 : 1
  return w
}

export default function PptxPreview({ previewModel }: PreviewSurfaceProps) {
  const slides: any[] = previewModel?.slides ?? []
  const hostRef = React.useRef<HTMLDivElement>(null)
  const [scaleVar, setScaleVar] = React.useState(1)

  // 只起一个 observer 覆盖整个列表：比例对所有页相同
  React.useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const apply = () => {
      const w = el.clientWidth
      if (w > 0) setScaleVar(w / W)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (!slides.length) {
    return (
      <div data-preview-surface="pptx" className="px-5 py-10 text-center text-[12px] text-zinc-400 dark:text-zinc-500">
        这份 PPT 没有可预览的页面。
      </div>
    )
  }

  return (
    <div
      ref={hostRef}
      data-preview-surface="pptx"
      className="flex flex-col gap-4 px-5 py-4"
      style={{ ["--slide-scale" as any]: scaleVar }}
    >
      {slides.map((slide, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Slide slide={slide} index={i} />
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">第 {i + 1} 页 · {slide.layout}</p>
        </div>
      ))}
    </div>
  )
}
