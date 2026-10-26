/**
 * PPTX 生成（手写 OOXML）+ 版式库
 *
 * ## 为什么要自己拼 XML
 *
 * npm 上没有能在服务端「从 Markdown 生成像样 PPT」的库：
 *   · pptxgenjs 可用，但它把版式锁死在自己的几个 layout 里，中文字体与间距不可控；
 *   · 其余库基本都只能读。
 *
 * 而一份合法的 .pptx 本质只是一个固定骨架的 ZIP。这里按 OOXML 规范直接产出骨架：
 *   [Content_Types].xml → _rels/.rels → presentation.xml → slideMaster/Layout/theme → slides
 *
 * ## 版式（16:9，12192000 × 6858000 EMU）
 *
 * 不用 placeholder 继承（那要求 master 里定义成对的占位符，改一处就得同步另一处），
 * 而是每页用**绝对坐标文本框**排版 —— 所见即所得，也不依赖 master 的默认样式。
 * master/layout 仍然必须存在且合法，否则 PowerPoint 会判定文件损坏。
 *
 * ## 版式选择（这一版的关键改造）
 *
 * 旧版所有页面都是「标题 + 一串项目符号」，于是成品看起来"只有文字"。
 * 现在按内容形态分流：
 *   cover / section（章节页）/ kpi（指标卡）/ chart（原生图表）/ table / bullets（图标要点）
 *   / twoColumn / quote / closing
 *
 * ## 单位纪律
 *
 * PPTX 只有 EMU 这一个单位。渲染器内部只用 **pt 写常量**，出口处 `E()` 换算，
 * 避免同一文件里出现第二套单位（历史 bug 的主要来源）。
 *
 * ## 图标
 *
 * 图标**不是模型画的**：由 `../icons` 把 HarmonyOS Symbol 字形转成 DrawingML
 * `<a:custGeom>`，于是 PPT 里是真正的矢量形状（可改色、缩放不糊）。
 * 选择依据 = 要点文字的关键词（见 `pickIconFor`），模型也可显式写 `::icon[leaf]`。
 */

import JSZip from 'jszip'
import { plainText, type MdBlock } from './markdown'
import type { Chapter } from './markdown'
import {
  EMERALD,
  FONT_FAMILY,
  SEMANTIC,
  SLIDE_EMU,
  SLIDE_MARGIN_X,
  SLIDE_METRICS as M,
  TYPE,
  ZINC,
} from '../theme'
import { PATH_BOX, drawPathXml, iconShapeXml, pickIconFor, type DrawCmd } from '../icons'

// ─────────────────────────────────────────────────────────────
// 画布（EMU）
// ───────────────────────────────────────────────────────────────

const EMU_PER_PT = 12700
/** pt → EMU */
function E(p: number): number {
  return Math.round(p * EMU_PER_PT)
}

const SLIDE_W = SLIDE_EMU.w
const SLIDE_H = SLIDE_EMU.h
const MX = SLIDE_MARGIN_X
const CONTENT_W = SLIDE_W - MX * 2

const C = {
  ink: ZINC.ink,
  body: ZINC.body,
  mute: ZINC.mute,
  faint: ZINC.faint,
  hairline: ZINC.hairline,
  surface: ZINC.surface,
  white: ZINC.white,
  accent: EMERALD.light,
  accentDeep: EMERALD.deep,
  wash: EMERALD.wash,
  /** 涨=红 / 跌=绿（中国市场习惯） */
  up: SEMANTIC.danger,
  down: SEMANTIC.ok,
}

/**
 * 版式度量的 EMU 版本。
 *
 * `M` 存的是 pt（前端预览直接用），OOXML 只认 EMU，所以在这一层一次性换算完。
 * 换算只发生在这里 —— 下方所有坐标都引用 `ME`，不再出现裸 `E(ME.x)`。
 */
const ME = {
  titleY: E(M.titleY),
  titleH: E(M.titleH),
  ruleY: E(M.ruleY),
  ruleW: E(M.ruleW),
  ruleH: E(M.ruleH),
  bodyY: E(M.bodyY),
  bodyBottom: E(M.bodyBottom),
  footerY: E(M.footerY),
  coverStripW: E(M.coverStripW),
  coverX: E(M.coverX),
  coverTitleY: E(M.coverTitleY),
  coverSubtitleY: E(M.coverSubtitleY),
  coverRuleY: E(M.coverRuleY),
  sectionX: E(M.sectionX),
  sectionY: E(M.sectionY),
}

/** 字号（百分之一磅） */
const SZ = {
  coverTitle: TYPE.coverTitle * 100,
  sectionTitle: TYPE.sectionTitle * 100,
  slideTitle: TYPE.slideTitle * 100,
  lead: TYPE.lead * 100,
  body: TYPE.body * 100,
  caption: TYPE.caption * 100,
  footer: TYPE.footer * 100,
}

export interface PptxRenderOptions {
  title: string
  subtitle?: string
  author?: string
}

/** 版式 */
export type SlideLayout =
  | 'cover'
  | 'section'
  | 'kpi'
  | 'chart'
  | 'table'
  | 'bullets'
  | 'twoColumn'
  | 'quote'
  | 'closing'

/** 一张 KPI 卡片 */
export interface KpiItem {
  value: string
  unit?: string
  label: string
  delta?: string
  trend?: 'up' | 'down' | 'flat'
}

/** 图表数据 */
export interface ChartSpec {
  kind: 'column' | 'bar' | 'line'
  categories: string[]
  /**
   * 每个系列自带单位。
   *
   * 单位必须是「每系列」而不是「每张图」：同一张表里
   * 「在线率 96.2%」和「故障工单 21 个」是不同量纲的并列行，
   * 若取一个全局单位就会把 21 标成 21% —— 那是把数据改写错了，
   * 比不好看严重得多。
   */
  series: Array<{ name: string; unit?: string; values: number[] }>
}

/** 一页幻灯片的内容模型 */
export interface SlideContent {
  kind: 'cover' | 'section' | 'content'
  layout: SlideLayout
  title: string
  subtitle?: string
  bullets: string[]
  /** 代码/引述类整段文本（独占一页） */
  block?: string
  table?: { headers: string[]; rows: string[][] }
  kpis?: KpiItem[]
  chart?: ChartSpec
  /** 页序号（用于页脚页码） */
  index?: number
  /**
   * 文档名（用于页脚）。
   *
   * 之所以要单独带一份而不是让 `slideXml` 去读生成时的 options：
   * `buildSlideXml` 也被「追加幻灯片」的编辑链路调用，那条链路上没有 options。
   */
  docTitle?: string
}

/**
 * PPTX 预览模型。
 *
 * PPTX 在浏览器里**没有原生渲染器**，而让用户「下载完才知道长什么样」是最糟的交互。
 * 既然文件是我们自己拼出来的，就把排版时的结构（而不是二进制）留一份，
 * 前端照着它渲染 —— 预览与最终文件天然一致，也不用二次解析 zip。
 */
export interface PptxPreview {
  kind: 'pptx'
  title: string
  subtitle?: string
  /** 16:9 逻辑尺寸，前端据此等比缩放 */
  width: number
  height: number
  slides: SlideContent[]
}

export interface PptxRenderResult {
  buf: Buffer
  preview: PptxPreview
}

export async function renderPptx(
  blocks: MdBlock[],
  chapters: Chapter[],
  options: PptxRenderOptions,
): Promise<PptxRenderResult> {
  const slides = planSlides(blocks, chapters, options)

  const zip = new JSZip()

  // ── 固定骨架 ──
  zip.file('[Content_Types].xml', contentTypesXml(slides.length))
  zip.file('_rels/.rels', rootRelsXml())
  zip.file('docProps/core.xml', coreXml(options))
  zip.file('docProps/app.xml', appXml(slides.length))
  zip.file('ppt/presentation.xml', presentationXml(slides.length))
  zip.file('ppt/_rels/presentation.xml.rels', presentationRelsXml(slides.length))
  zip.file('ppt/presProps.xml', presPropsXml())
  zip.file('ppt/theme/theme1.xml', themeXml())
  zip.file('ppt/slideMasters/slideMaster1.xml', masterXml())
  zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', masterRelsXml())
  zip.file('ppt/slideLayouts/slideLayout1.xml', layoutXml())
  zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', layoutRelsXml())

  // ── 每页 ──
  slides.forEach((slide, i) => {
    zip.file(`ppt/slides/slide${i + 1}.xml`, buildSlideXml({ ...slide, index: i + 1 }))
    zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, slideRelsXml())
  })

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })

  return {
    buf,
    preview: {
      kind: 'pptx',
      title: options.title,
      subtitle: options.subtitle,
      // EMU → pt：前端只认 pt，跟着换算就不会出现两套单位
      width: SLIDE_W / EMU_PER_PT,
      height: SLIDE_H / EMU_PER_PT,
      slides,
    },
  }
}

// ─────────────────────────────────────────────────────────────
// 排版规划：块树 → 幻灯片序列（含版式选择）
// ───────────────────────────────────────────────────────────────

function planSlides(blocks: MdBlock[], chapters: Chapter[], options: PptxRenderOptions): SlideContent[] {
  const cover: SlideContent = {
    kind: 'cover',
    layout: 'cover',
    title: options.title || chapters[0]?.title || '演示文稿',
    subtitle: options.subtitle || options.author || '',
    bullets: [],
  }

  const usable = chapters.length ? chapters : [{ title: options.title, blocks }]
  const slides: SlideContent[] = [cover]

  usable.forEach((chapter) => {
    let chapterTitle = chapter.title || options.title
    const bullets: string[] = []
    const tables: NonNullable<SlideContent['table']>[] = []
    const quotes: string[] = []
    const codes: string[] = []

    for (const block of chapter.blocks) {
      switch (block.type) {
        case 'heading': {
          // H1 视为章节名；更低层级降级为「小标题要点」，避免每级标题都开新页
          const text = plainText(block.text)
          if (!text || text === chapterTitle) break
          if (block.level <= 1) chapterTitle = text
          else bullets.push(`〔${text}〕`)
          break
        }
        case 'paragraph':
          bullets.push(plainText(block.text))
          break
        case 'list':
          for (const item of block.items) bullets.push(plainText(item.text))
          break
        case 'quote':
          quotes.push(plainText(block.text))
          break
        case 'code':
          codes.push(block.text.slice(0, 1600))
          break
        case 'table':
          tables.push({ headers: block.headers, rows: block.rows.slice(0, 10) })
          break
        default:
          break
      }
    }

    // ① 章节页：长报告需要节奏停顿（只在多章节时出现）
    if (usable.length > 1 && chapterTitle) {
      slides.push({ kind: 'section', layout: 'section', title: chapterTitle, bullets: [] })
    }

    // ② 表格页：能画成图的优先画图（图比表直观），行数太多才退回表格
    for (const t of tables) {
      const chart = chartFromTable(t)
      if (chart) {
        // 图表页同时带上原表：下方会再画一张真表格，保证读回时不丢结构
        slides.push({ kind: 'content', layout: 'chart', title: `${chapterTitle} · 图表`, bullets: [], chart, table: t })
      } else {
        slides.push({ kind: 'content', layout: 'table', title: chapterTitle, bullets: [], table: t })
      }
    }

    // ③ 代码 / 引述：整段独占一页
    for (const code of codes) {
      slides.push({ kind: 'section', layout: 'quote', title: `${chapterTitle} · 代码`, bullets: [], block: code })
    }
    for (const q of quotes) {
      slides.push({ kind: 'section', layout: 'quote', title: `${chapterTitle} · 引述`, bullets: [], block: q })
    }

    // ④ 要点：优先 KPI 卡片，其次单栏图标要点，多了自然分栏
    if (bullets.length) {
      const kpis = kpisFromBullets(bullets)
      if (kpis?.length) {
        slides.push({ kind: 'content', layout: 'kpi', title: `${chapterTitle} · 关键指标`, bullets: [], kpis })
      } else {
        slides.push(...chunkBullets(bullets, chapterTitle))
      }
    } else if (!tables.length && !codes.length && !quotes.length) {
      // 空章节：保留一页占位，避免整章凭空消失
      slides.push({ kind: 'content', layout: 'bullets', title: chapterTitle, bullets: [] })
    }
  })

  // 收尾页：「结论 / 建议 / 下一步」类章节单独做收束
  const last = slides[slides.length - 1]
  if (last && last.layout !== 'cover' && /结论|总结|建议|下一步|行动|展望/i.test(last.title)) {
    last.layout = 'closing'
  }

  // 页脚统一带上文档名（封面页不画页脚，字段留着无妨）
  return slides.map(s => ({ ...s, docTitle: options.title }))
}

/**
 * 要点按容量分页。
 *
 * 估算：一行约 42 个视觉单位（中文按 1.6 倍权重），行高 22pt，行间再留 10pt。
 * 装不下就续页并加「（续）」，而不是让文字溢出到页面外。
 */
function chunkBullets(bullets: string[], title: string): SlideContent[] {
  const out: SlideContent[] = []
  const budgetLines = Math.max(2, Math.floor((ME.bodyBottom - ME.bodyY) / E(22)))
  let part = 1
  let cursor = 0

  while (cursor < bullets.length) {
    const picked: string[] = []
    let lines = 0
    while (cursor < bullets.length && picked.length < 8) {
      const est = bulletLines(bullets[cursor])
      if (lines + est > budgetLines && picked.length) break
      picked.push(bullets[cursor])
      lines += est
      cursor++
    }
    if (!picked.length) {
      picked.push(bullets[cursor].slice(0, 600))
      cursor++
    }
    out.push({
      kind: 'content',
      layout: picked.length > 5 ? 'twoColumn' : 'bullets',
      title: part === 1 ? title : `${title}（续）`,
      bullets: picked,
    })
    part++
  }

  return out
}

/** 一条要点需要占几行（中文按 1.6 倍权重） */
function bulletLines(text: string, perLine = 42): number {
  return Math.max(1, Math.ceil(visualWidth(text) / perLine))
}

/** 视觉宽度（中文按 1.6 个半角字符算） */
function visualWidth(s: string): number {
  let w = 0
  for (const ch of String(s || '')) w += /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1.6 : 1
  return w
}

/** 数值后面常见的单位后缀（用于图表数值标签原样带回单位） */
const UNIT_SUFFIX_RE = /([%℃°]|个百分点|pt|kg|g|t|亩|株|台|套|次|小时|天|倍|元|万元|亿元|cm|mm|m)$/

/** `在线率 96.2%` / `故障工单：21 个` 这类「名字 + 数字」形态 */
const KPI_RE = /^(.{1,14}?)[:：\s]*([+-]?\d[\d,]*(?:\.\d+)?)\s*(%|个百分点|pt|℃|°C|kg|g|t|亩|株|台|套|次|小时|天|倍|元|万元|亿元|cm|mm|m)?$/

function parseKpi(bullet: string): KpiItem | null {
  const text = String(bullet || '').trim()
  if (!text || text.length > 40) return null
  const m = KPI_RE.exec(text)
  if (!m) return null
  const label = m[1].trim()
  // 标签里还有数字 → 多半是普通句子，不是指标
  if (!label || /\d/.test(label)) return null
  return {
    value: m[2],
    unit: m[3],
    label,
    trend: m[2].startsWith('-') ? 'down' : m[2].startsWith('+') ? 'up' : 'flat',
  }
}

function kpisFromBullets(bullets: string[]): KpiItem[] | null {
  if (bullets.length < 2 || bullets.length > 4) return null
  const parsed = bullets.map(parseKpi)
  return parsed.every(Boolean) ? (parsed as KpiItem[]) : null
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v ?? '').trim()
  if (!s) return null
  const m = s.match(/-?\d[\d,]*(?:\.\d+)?/)
  if (!m) return null
  const n = Number(m[0].replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/** 表格 → 图表数据；条件：≥2 数据行且至少一列是数值列 */
function chartFromTable(table: { headers: string[]; rows: string[][] }): ChartSpec | null {
  const { headers, rows } = table
  if (headers.length < 2 || rows.length < 2 || rows.length > 8) return null

  const numericCols: number[] = []
  for (let c = 1; c < headers.length; c++) {
    const vals = rows.map(r => toNumber(r[c])).filter((v): v is number => v != null)
    if (vals.length >= 2 && vals.length >= Math.ceil(rows.length * 0.7)) numericCols.push(c)
  }
  if (!numericCols.length) return null

  return {
    kind: rows.length >= 5 ? 'line' : 'column',
    categories: rows.map(r => String(r[0] ?? '').trim() || '—'),
    series: numericCols.map(c => ({
      name: String(headers[c] ?? '').trim() || '数值',
      unit: detectUnit(rows.map(r => String(r[c] ?? ''))),
      values: rows.map(r => toNumber(r[c]) ?? 0),
    })),
  }
}

/** 一整列里出现次数最多的单位后缀 */
function detectUnit(values: string[]): string | undefined {
  const counts = new Map<string, number>()
  for (const raw of values) {
    const m = String(raw ?? '').trim().match(UNIT_SUFFIX_RE)
    if (m) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1)
  }
  let best: string | undefined
  let bestN = 0
  for (const [unit, n] of counts) {
    if (n > bestN) {
      best = unit
      bestN = n
    }
  }
  return best
}

// ─────────────────────────────────────────────────────────────
// 幻灯片 XML（按版式分发）
// ─────────────────────────────────────────────────────────────

/**
 * 单页 XML。
 *
 * 导出是为了让 `edit/pptx.ts` 的「追加幻灯片」用同一套版式 ——
 * 否则追加出来的页面会和生成的页面长得不一样（字号、边距、主色条全不同）。
 */
export function buildSlideXml(slide: SlideContent): string {
  return slideXml(slide)
}

function slideXml(slide: SlideContent): string {
  const shapes: string[] = []
  let id = 2

  switch (slide.layout) {
    case 'cover': {
      // 白底 + 左侧主色竖条；标题压在下方三分之一处。封面不画页脚。
      shapes.push(rectXml(id++, 'CoverStrip', 0, 0, ME.coverStripW, SLIDE_H, C.accent))
      shapes.push(
        textBoxXml({
          id: id++,
          name: 'CoverTitle',
          x: ME.coverX,
          y: ME.coverTitleY,
          w: SLIDE_W - E(170),
          h: E(150),
          paragraphs: [{ runs: [{ text: slide.title, size: SZ.coverTitle, bold: true, color: C.ink }], align: 'l' }],
          anchor: 't',
        }),
      )
      if (slide.subtitle) {
        shapes.push(
          textBoxXml({
            id: id++,
            name: 'CoverSubtitle',
            x: ME.coverX,
          y: ME.coverSubtitleY,
          w: SLIDE_W - E(170),
          h: E(40),
          paragraphs: [{ runs: [{ text: slide.subtitle, size: SZ.lead, color: C.mute }], align: 'l' }],
          anchor: 't',
        }),
        )
        shapes.push(rectXml(id++, 'CoverRule', ME.coverX, ME.coverRuleY, E(96), E(3), C.accent))
      }
      break
    }

    case 'section': {
      // 章节页：主色满底 + 白色大标题 + 右下角序号
      shapes.push(rectXml(id++, 'SectionBg', 0, 0, SLIDE_W, SLIDE_H, C.accentDeep))
      shapes.push(
        textBoxXml({
          id: id++,
          name: 'SectionTitle',
          x: ME.sectionX,
          y: ME.sectionY,
          w: SLIDE_W - E(220),
          h: E(130),
          paragraphs: [{ runs: [{ text: slide.title, size: SZ.sectionTitle, bold: true, color: C.white }], align: 'l' }],
          anchor: 'ctr',
        }),
      )
      if (slide.subtitle) {
        shapes.push(
          textBoxXml({
            id: id++,
            name: 'SectionIndex',
            x: SLIDE_W - E(210),
          y: SLIDE_H - E(170),
          w: E(114),
          h: E(70),
          paragraphs: [{ runs: [{ text: slide.subtitle, size: 3600, bold: true, color: C.wash }], align: 'r' }],
          anchor: 'ctr',
        }),
        )
      }
      break
    }

    case 'kpi': {
      shapes.push(titleShape(id++, slide.title))
      shapes.push(ruleShape(id++, ME.ruleY, ME.ruleW))
      shapes.push(...kpiCards(id, slide.kpis || []))
      id += 64
      break
    }

    case 'chart': {
      shapes.push(titleShape(id++, slide.title))
      shapes.push(ruleShape(id++, ME.ruleY, ME.ruleW))
      if (slide.chart) shapes.push(...chartShapes(id, slide.chart, slide.table))
      id += 128
      break
    }

    case 'table': {
      shapes.push(titleShape(id++, slide.title))
      shapes.push(ruleShape(id++, ME.ruleY, ME.ruleW))
      if (slide.table) {
        shapes.push(
          tableXml(id++, 'Table', MX, ME.bodyY, CONTENT_W, ME.bodyBottom - ME.bodyY, slide.table),
        )
      }
      break
    }

    case 'quote': {
      shapes.push(
        textBoxXml({
          id: id++,
          name: 'QuoteMark',
          x: MX,
          y: E(150),
          w: E(90),
          h: E(90),
          paragraphs: [{ runs: [{ text: '“', size: 7200, bold: true, color: C.wash }], align: 'l' }],
          anchor: 't',
        }),
      )
      shapes.push(
        textBoxXml({
          id: id++,
          name: 'QuoteBody',
          x: MX + E(56),
          y: E(216),
          w: CONTENT_W - E(104),
          h: ME.bodyBottom - E(216),
          paragraphs: (slide.block || '').split('\n').map(line => ({
            runs: [{ text: line || ' ', size: SZ.lead, color: C.body }],
            align: 'l' as const,
            noBullet: true,
          })),
          anchor: 't',
        }),
      )
      break
    }

    case 'closing': {
      shapes.push(rectXml(id++, 'ClosingBg', 0, 0, SLIDE_W, SLIDE_H, C.wash))
      shapes.push(rectXml(id++, 'ClosingBar', 0, 0, SLIDE_W, E(6), C.accent))
      shapes.push(
        textBoxXml({
          id: id++,
          name: 'ClosingTitle',
          x: MX,
          y: E(150),
          w: CONTENT_W,
          h: E(90),
          paragraphs: [{ runs: [{ text: slide.title, size: SZ.sectionTitle, bold: true, color: C.ink }], align: 'l' }],
          anchor: 'ctr',
        }),
      )
      if (slide.bullets.length) {
        shapes.push(...bulletsBlock(id, slide.bullets))
        // 要点块内部自行分配 id（图标 + 文本框），这里一次性跳过去，
        // 否则页脚会复用到已被占用的 id —— 重复 id 会让 PowerPoint 判定文件损坏。
        id += 64
      }
      break
    }

    case 'twoColumn': {
      shapes.push(titleShape(id++, slide.title))
      shapes.push(ruleShape(id++, ME.ruleY, ME.ruleW))
      const half = Math.floor((CONTENT_W - E(40)) / 2)
      const cols: string[][] = [[], []]
      const lines = [0, 0]
      for (const b of slide.bullets) {
        const est = bulletLines(b, 34) // 双栏更窄，每行按 34 单位估
        const k = lines[0] <= lines[1] ? 0 : 1
        cols[k].push(b)
        lines[k] += est
      }
      cols.forEach((col, i) => {
        shapes.push(
          textBoxXml({
            id: id++,
            name: `Col${i}`,
            x: MX + i * (half + E(40)),
            y: ME.bodyY,
            w: half,
            h: ME.bodyBottom - ME.bodyY,
            paragraphs: col.map(b => ({
              runs: [{ text: b, size: SZ.body, color: C.body }],
              align: 'l' as const,
              bullet: true,
            })),
            anchor: 't',
          }),
        )
      })
      break
    }

    default: {
      shapes.push(titleShape(id++, slide.title))
      shapes.push(ruleShape(id++, ME.ruleY, ME.ruleW))
      if (slide.bullets.length) {
        shapes.push(...bulletsBlock(id, slide.bullets))
        id += 64 // 同上：跳过要点块内部已用掉的 id 段
      }
      break
    }
  }

  // 页脚：文档名 · 页码（封面页不画）
  if (slide.layout !== 'cover') {
    shapes.push(footerShape(id++, slide.docTitle || slide.title, slide.index ?? 1))
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
${shapes.join('\n')}
</p:spTree></p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`
}

// ─────────────────────────────────────────────────────────────
// Chrome：标题条 / 页脚
// ───────────────────────────────────────────────────────────────

function titleShape(id: number, title: string): string {
  return textBoxXml({
    id,
    name: 'Title',
    x: MX,
    y: ME.titleY,
    w: CONTENT_W,
    h: ME.titleH,
    paragraphs: [{ runs: [{ text: title, size: SZ.slideTitle, bold: true, color: C.ink }], align: 'l' }],
    anchor: 'b',
  })
}

function ruleShape(id: number, y: number, w: number): string {
  return rectXml(id, 'Accent', MX, y, w, ME.ruleH, C.accent)
}

function footerShape(id: number, docTitle: string, page: number): string {
  return textBoxXml({
    id,
    name: 'Footer',
    x: MX,
    y: ME.footerY,
    w: CONTENT_W,
    h: E(18),
    paragraphs: [{ runs: [{ text: `${docTitle}  ·  ${page}`, size: SZ.footer, bold: false, color: C.faint }], align: 'r' }],
    anchor: 'b',
  })
}

/**
 * 图标化要点块。
 *
 * 每行 = 一枚 13pt 矢量图标 + 一段 16pt 正文；图标按条目语义自动挑
 * （见 `pickIconFor`），挑不到就退回左侧主色短竖线 —— 保证视觉上仍是"列表"，
 * 而不是一段失去结构的散文字。
 */
function bulletsBlock(startId: number, bullets: string[]): string[] {
  const out: string[] = []
  let id = startId
  const lineH = E(22)
  const gap = E(10)
  const iconSize = E(13)
  let y = ME.bodyY

  for (const b of bullets) {
    const rowH = bulletLines(b) * lineH + gap
    const icon = pickIconFor(b)
    if (icon) {
      const g = iconShapeXml({ name: icon, x: MX, y: y + E(3), size: iconSize, color: C.accent, id: id++ })
      if (g) out.push(g)
    } else {
      out.push(rectXml(id++, 'BulletBar', MX, y + E(5), E(2.5), E(13), C.accent))
    }
    out.push(
      textBoxXml({
        id: id++,
        name: 'Bullet',
        x: MX + E(22),
        y,
        w: CONTENT_W - E(22),
        h: rowH,
        paragraphs: [{ runs: [{ text: b, size: SZ.body, color: C.body }], align: 'l' }],
        anchor: 't',
      }),
    )
    y += rowH
  }

  return out
}

// ─────────────────────────────────────────────────────────────
// 版式：KPI 卡片
// ───────────────────────────────────────────────────────────────

function kpiCards(startId: number, kpis: KpiItem[]): string[] {
  const out: string[] = []
  let id = startId
  const items = kpis.slice(0, 4)
  if (!items.length) return out

  const gap = E(18)
  const cardW = Math.floor((CONTENT_W - gap * (items.length - 1)) / items.length)
  const cardH = E(150)
  const cardY = ME.bodyY + E(14)

  items.forEach((kpi, i) => {
    const x = MX + i * (cardW + gap)
    const tone = kpi.trend === 'down' ? C.down : kpi.trend === 'up' ? C.up : C.accent

    out.push(roundRectXml({ id: id++, name: `KpiBg${i}`, x, y: cardY, w: cardW, h: cardH, color: C.wash }))
    out.push(
      textBoxXml({
        id: id++,
        name: `KpiValue${i}`,
        x: x + E(20),
        y: cardY + E(26),
        w: cardW - E(40),
        h: E(58),
        paragraphs: [
          {
            runs: [
              { text: kpi.value, size: 4000, bold: true, color: tone },
              ...(kpi.unit ? [{ text: kpi.unit, size: 1600, bold: false, color: C.mute }] : []),
            ],
            align: 'l' as const,
          },
        ],
        anchor: 'b',
      }),
    )
    out.push(
      textBoxXml({
        id: id++,
        name: `KpiLabel${i}`,
        x: x + E(20),
        y: cardY + E(94),
        w: cardW - E(40),
        h: E(40),
        paragraphs: [
          {
            runs: [
              { text: kpi.label, size: SZ.caption, bold: false, color: C.mute },
              ...(kpi.delta ? [{ text: `  ${kpi.delta}`, size: SZ.caption, bold: false, color: tone }] : []),
            ],
            align: 'l' as const,
          },
        ],
        anchor: 't',
      }),
    )
  })

  return out
}

// ─────────────────────────────────────────────────────────────
// 版式：图表（原生形状，缩放不糊）
// ───────────────────────────────────────────────────────────────

const CHART_INK = ['059669', '0EA5E9', 'F59E0B', '8B5CF6']

function chartShapes(
  startId: number,
  chart: ChartSpec,
  /** 原表：图表下方照原样再画一张真表格 */
  table?: { headers: string[]; rows: string[][] },
): string[] {
  const out: string[] = []
  let id = startId

  const plotX = MX + E(14)
  const plotY = ME.bodyY + E(6)
  const plotW = CONTENT_W - E(28)

  // 「图 + 数据底表」而不是「只留图」：
  // 只画图时精确值得靠肉眼比对柱高，且表头与行列的对应关系会整体丢失
  // —— 文档子系统主打「生成 → 读回守恒」，把表换成图等于悄悄删内容。
  const hasTable = !!table && table.rows.length > 0 && table.headers.length > 0
  const tableH = hasTable
    ? Math.min(E(150), Math.max(E(60), (table!.rows.length + 1) * E(26)))
    : 0
  const tableGap = hasTable ? E(14) : 0

  const plotH = ME.bodyBottom - plotY - E(24) - tableH - tableGap
  const maxValue = Math.max(1, ...chart.series.flatMap(s => s.values.map(v => Math.abs(v))))
  const n = Math.max(1, chart.categories.length)
  /** 每一类占的横向槽宽：柱状按组并列、折线按点定位、分类标签居中，三处共用 */
  const groupW = Math.floor(plotW / n)
  const axisY = plotY + plotH - E(34)

  if (chart.kind === 'line') {
    chart.series.forEach((s, si) => {
      const color = CHART_INK[si % CHART_INK.length]
      const cmds: DrawCmd[] = []
      for (let i = 0; i < n; i++) {
        const x = Math.round(((i + 0.5) / n) * PATH_BOX)
        const y = Math.round(PATH_BOX - (Math.abs(s.values[i] ?? 0) / maxValue) * PATH_BOX)
        cmds.push(i === 0 ? { c: 'M', x, y } : { c: 'L', x, y })
      }
      out.push(
        `<p:sp><p:nvSpPr><p:cNvPr id="${id++}" name="Line${si}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
          `<p:spPr><a:xfrm><a:off x="${plotX}" y="${plotY}"/><a:ext cx="${plotW}" cy="${plotH}"/></a:xfrm>` +
          custGeomOf(cmds) +
          `<a:noFill/><a:ln w="${E(0.3)}" cap="rnd"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln>` +
          `</p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="zh-CN"/></a:p></p:txBody></p:sp>`,
      )

      // 数据点标记：让"几个值"一眼可数
      for (let i = 0; i < n; i++) {
        const x = plotX + Math.round(((i + 0.5) / n) * plotW) - E(4)
        const y = plotY + Math.round(plotH - (Math.abs(s.values[i] ?? 0) / maxValue) * plotH) - E(4)
        out.push(ellipseXml({ id: id++, name: `Dot${si}-${i}`, x, y, size: E(8), color }))
      }
    })
  } else {
    // 柱状图：一类一组，组内并列
    const sCount = Math.max(1, chart.series.length)
    const barW = Math.max(E(8), Math.min(Math.floor((groupW * 0.68) / sCount), E(52)))
    chart.series.forEach((s, si) => {
      const color = CHART_INK[si % CHART_INK.length]
      s.values.forEach((v, i) => {
        const h = Math.max(E(2), Math.round((Math.abs(v) / maxValue) * (plotH - E(46))))
        const x = plotX + i * groupW + Math.floor((groupW - barW * sCount) / 2) + si * barW
        const y = axisY - h
        out.push(rectXml(id++, `Bar${si}-${i}`, x, y, barW - E(5), h, color))
        // 数值标签（紧贴柱顶上方）
        out.push(
          textBoxXml({
            id: id++,
            name: `BarVal${si}-${i}`,
            x,
            y: y - E(19),
            w: barW - E(5),
            h: E(18),
            paragraphs: [
              { runs: [{ text: fmtNum(v) + (s.unit || ''), size: 1100, bold: false, color: C.mute }], align: 'ctr' },
            ],
            anchor: 'b',
          }),
        )
      })
    })
  }

  // 基线
  out.push(rectXml(id++, 'Axis', plotX, axisY, plotW, E(1.25), C.hairline))

  // 分类标签
  chart.categories.forEach((label, i) => {
    out.push(
      textBoxXml({
        id: id++,
        name: `Cat${i}`,
      x: plotX + i * groupW,
      y: axisY + E(6),
      w: groupW,
      h: E(20),
      paragraphs: [{ runs: [{ text: label, size: SZ.caption, bold: false, color: C.mute }], align: 'ctr' }],
      anchor: 't',
    }),
    )
  })

  // 数据底表：贴在画布底部，保留原始数值与表头
  if (hasTable) {
    out.push(tableXml(id++, 'DataTable', MX, ME.bodyBottom - tableH, CONTENT_W, tableH, table!))
  }

  return out
}

// ─────────────────────────────────────────────────────────────
// 版式：表格（真 a:tbl）
// ───────────────────────────────────────────────────────────────

/**
 * 真表格（`a:tbl`），包在 `graphicFrame` 里。
 *
 * 不用「一堆文本框拼格子」凑表格 —— 那种做法列宽一变就散架，
 * 而且用户在 PowerPoint 里没法再编辑。真表格可以直接改字、增删行列。
 *
 * 行高按画布均分，并给一个 20pt 下限：行数少时不会拉成一条细线，
 * 行数多时总高也不会溢出（`tblGrid` 的宽度同理按列均分）。
 */
function tableXml(
  id: number,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  table: { headers: string[]; rows: string[][] },
): string {
  const cols = Math.max(1, table.headers.length)
  const rows = table.rows.slice(0, 8)
  const rowH = Math.max(E(20), Math.floor(h / (rows.length + 1)))
  const colW = Math.floor(w / cols)

  const grid = Array.from({ length: cols }, () => `<a:gridCol w="${colW}"/>`).join('')

  const cellXml = (text: string, isHead: boolean): string => {
    const fill = isHead
      ? `<a:solidFill><a:srgbClr val="${C.wash}"/></a:solidFill>`
      : `<a:noFill/>`
    const color = isHead ? C.ink : C.body
    const bold = isHead ? 'b="1"' : ''
    const para = text
      ? `<a:p><a:pPr algn="l"><a:buNone/></a:pPr><a:r><a:rPr lang="zh-CN" sz="${SZ.body}" ${bold}>` +
        `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>` +
        `<a:latin typeface="${FONT_FAMILY}"/><a:ea typeface="${FONT_FAMILY}"/>` +
        `</a:rPr><a:t>${esc(text)}</a:t></a:r></a:p>`
      : `<a:p><a:endParaRPr lang="zh-CN"/></a:p>`
    // 只画下边框：整张表靠横线分隔行，视觉上比全框格更轻
    const ln = (val: string) => `<a:lnB w="12700"><a:solidFill><a:srgbClr val="${val}"/></a:solidFill></a:lnB>`
    return (
      `<a:tc><a:txBody><a:bodyPr wrap="square" lIns="54000" tIns="27000" rIns="54000" bIns="27000" anchor="ctr"/>` +
      `<a:lstStyle/>${para}</a:txBody>` +
      `<a:tcPr marL="0" marR="0" marT="0" marB="0" anchor="ctr" anchorCtr="0">${fill}${ln(C.hairline)}</a:tcPr>` +
      `</a:tc>`
    )
  }

  const trs = [
    `<a:tr h="${rowH}">${table.headers.map(h => cellXml(String(h ?? ''), true)).join('')}</a:tr>`,
    ...rows.map(
      r =>
        `<a:tr h="${rowH}">${Array.from({ length: cols }, (_, c) => cellXml(String(r[c] ?? ''), false)).join('')}</a:tr>`,
    ),
  ].join('')

  return `<p:graphicFrame>
<p:nvGraphicFramePr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>
<p:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></p:xfrm>
<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
<a:tbl><a:tblPr firstRow="1" bandRow="1"><a:tableStyleId>{2D5ABB26-0587-4C30-8999-92F81FD0307C}</a:tableStyleId></a:tblPr><a:tblGrid>${grid}</a:tblGrid>${trs}</a:tbl>
</a:graphicData></a:graphic>
</p:graphicFrame>`
}

/**
 * 图表数值标签的紧凑写法。
 *
 * 柱顶只有 ~40pt 宽，写 `12345.678` 必定溢出到隔壁柱子；
 * 所以上万转「万」（`1.2万元` 是符合中文阅读习惯的写法），
 * 百以下保留一位小数（96.2 这种带小数的百分比不能被抹成 96）。
 */
function fmtNum(v: number): string {
  if (!Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs >= 10000) return `${(v / 10000).toFixed(abs >= 100000 ? 0 : 1)}万`
  if (abs >= 100) return String(Math.round(v))
  if (Number.isInteger(v)) return String(v)
  return String(Math.round(v * 10) / 10)
}

// ─────────────────────────────────────────────────────────────
// 形状原语
// ───────────────────────────────────────────────────────────────

interface TextRunSpec {
  text: string
  size: number
  bold?: boolean
  color?: string
  mono?: boolean
}

function textBoxXml(input: {
  id: number
  name: string
  x: number
  y: number
  w: number
  h: number
  paragraphs: ParagraphSpec[]
  anchor?: 't' | 'ctr' | 'b'
}): string {
  const paras = input.paragraphs.length
    ? input.paragraphs.map(p => paragraphXml(p)).join('')
    : `<a:p><a:endParaRPr lang="zh-CN"/></a:p>`

  return `<p:sp>
<p:nvSpPr><p:cNvPr id="${input.id}" name="${esc(input.name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="${input.x}" y="${input.y}"/><a:ext cx="${input.w}" cy="${input.h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>
<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="${input.anchor ?? 't'}"><a:normAutofit/></a:bodyPr><a:lstStyle/>
${paras}
</p:txBody>
</p:sp>`
}

function paragraphXml(p: ParagraphSpec): string {
  const algn = p.align === 'ctr' ? 'ctr' : p.align === 'r' ? 'r' : 'l'
  const bulletProps = p.bullet
    ? `<a:pPr marL="285750" indent="-285750"><a:buFont typeface="Arial"/><a:buChar char="•"/></a:pPr>`
    : `<a:pPr marL="0" indent="0"><a:buNone/></a:pPr>`
  const runs = p.runs
    .map(r => {
      const attrs = ['lang="zh-CN"', 'altLang="en-US"', `sz="${r.size}"`, r.bold ? 'b="1"' : '']
        .filter(Boolean)
        .join(' ')
      const fontXml = r.mono
        ? `<a:latin typeface="Consolas"/><a:ea typeface="等线"/>`
        : `<a:latin typeface="${FONT_FAMILY}"/><a:ea typeface="${FONT_FAMILY}"/>`
      const fill = r.color ? `<a:solidFill><a:srgbClr val="${r.color}"/></a:solidFill>` : ''
      return `<a:r><a:rPr ${attrs}>${fill}${fontXml}</a:rPr><a:t>${esc(r.text)}</a:t></a:r>`
    })
    .join('')
  return `<a:p>${bulletProps}${runs}</a:p>`
}

interface ParagraphSpec {
  runs: TextRunSpec[]
  align: 'l' | 'ctr' | 'r'
  bullet?: boolean
  noBullet?: boolean
}

function rectXml(id: number, name: string, x: number, y: number, w: number, h: number, color: string): string {
  return `<p:sp>
<p:nvSpPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="zh-CN"/></a:p></p:txBody>
</p:sp>`
}

/** 圆角矩形（adj 为 DrawingML 的圆角半径，21600 = 半径取短边一半） */
function roundRectXml(input: {
  id: number
  name: string
  x: number
  y: number
  w: number
  h: number
  color: string
  adj?: number
}): string {
  const adj = input.adj ?? 4167
  return `<p:sp>
<p:nvSpPr><p:cNvPr id="${input.id}" name="${esc(input.name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="${input.x}" y="${input.y}"/><a:ext cx="${input.w}" cy="${input.h}"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${adj}"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="${input.color}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="zh-CN"/></a:p></p:txBody>
</p:sp>`
}

/** 圆点（折线图的数据点标记） */
function ellipseXml(input: {
  id: number
  name: string
  x: number
  y: number
  size: number
  color: string
}): string {
  return `<p:sp>
<p:nvSpPr><p:cNvPr id="${input.id}" name="${esc(input.name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="${input.x}" y="${input.y}"/><a:ext cx="${input.size}" cy="${input.size}"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${input.color}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="zh-CN"/></a:p></p:txBody>
</p:sp>`
}

/** 由 DrawingML 坐标指令拼 `<a:custGeom>`（图表折线与图标共用同一套图元写法） */
function custGeomOf(cmds: DrawCmd[], box = PATH_BOX): string {
  return `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="l" t="t" r="r" b="b"/><a:pathLst>${drawPathXml(cmds, box)}</a:pathLst></a:custGeom>`
}

// ─────────────────────────────────────────────────────────────
// 骨架 XML
// ───────────────────────────────────────────────────────────────

function contentTypesXml(slideCount: number): string {
  const slides = Array.from(
    { length: slideCount },
    (_, i) =>
      `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
  ).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
${slides}
</Types>`
}

function rootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
}

function presentationXml(slideCount: number): string {
  const ids = Array.from(
    { length: slideCount },
    (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`,
  ).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>${ids}</p:sldIdLst>
<p:sldSz cx="${SLIDE_W}" cy="${SLIDE_H}"/>
<p:notesSz cx="6858000" cy="9144000"/>
<p:defaultTextStyle><a:defPPr><a:defRPr lang="zh-CN"/></a:defPPr></p:defaultTextStyle>
</p:presentation>`
}

function presentationRelsXml(slideCount: number): string {
  const slides = Array.from(
    { length: slideCount },
    (_, i) =>
      `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`,
  ).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
${slides}
<Relationship Id="rId${slideCount + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
<Relationship Id="rId${slideCount + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>
</Relationships>`
}

function presPropsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`
}

function slideRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`
}

function masterRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`
}

function layoutRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`
}

/** 母版：只保留必需的 spTree 骨架（真实排版由每页的绝对坐标决定） */
function masterXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree></p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
<p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="3400" b="1" lang="zh-CN"><a:solidFill><a:srgbClr val="1F2328"/></a:solidFill><a:latin typeface="Calibri Light"/><a:ea typeface="微软雅黑"/></a:defRPr></a:lvl1pPr></p:titleStyle>
<p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800" lang="zh-CN"><a:solidFill><a:srgbClr val="1F2328"/></a:solidFill><a:latin typeface="Calibri"/><a:ea typeface="等线"/></a:defRPr></a:lvl1pPr></p:bodyStyle>
<p:otherStyle><a:lvl1pPr><a:defRPr sz="1800" lang="zh-CN"/></a:lvl1pPr></p:otherStyle></p:txStyles>
</p:sldMaster>`
}

function layoutXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
<p:cSld name="Blank"><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree></p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`
}

/** 主题：12 色 + 字体 + 4 组样式列表（缺任何一组 PowerPoint 都会报文件损坏） */
function themeXml(): string {
  const solid = (val: string) => `<a:solidFill><a:schemeClr val="${val}"/></a:solidFill>`
  const line = `<a:ln w="9525" cap="flat" cmpd="sng" algn="ctr">${solid('phClr')}<a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>`
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Stravision">
<a:themeElements>
<a:clrScheme name="Stravision">
<a:dk1><a:srgbClr val="1F2328"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="3A4340"/></a:dk2><a:lt2><a:srgbClr val="F6F7F7"/></a:lt2>
<a:accent1><a:srgbClr val="059669"/></a:accent1><a:accent2><a:srgbClr val="34D399"/></a:accent2>
<a:accent3><a:srgbClr val="0EA5E9"/></a:accent3><a:accent4><a:srgbClr val="F59E0B"/></a:accent4>
<a:accent5><a:srgbClr val="8B5CF6"/></a:accent5><a:accent6><a:srgbClr val="EF4444"/></a:accent6>
<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="Stravision">
<a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface="微软雅黑"/><a:cs typeface=""/></a:majorFont>
<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface="等线"/><a:cs typeface=""/></a:minorFont>
</a:fontScheme>
<a:fmtScheme name="Stravision">
<a:fillStyleLst>${solid('phClr')}${solid('phClr')}${solid('phClr')}</a:fillStyleLst>
<a:lnStyleLst>${line}${line}${line}</a:lnStyleLst>
<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
<a:bgFillStyleLst>${solid('phClr')}${solid('phClr')}${solid('phClr')}</a:bgFillStyleLst>
</a:fmtScheme>
</a:themeElements>
</a:theme>`
}

function coreXml(options: PptxRenderOptions): string {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcterms="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(options.title || '')}</dc:title>
<dc:creator>${esc(options.author || 'Stravision AI 助手')}</dc:creator>
<cp:lastModifiedBy>${esc(options.author || 'Stravision AI 助手')}</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`
}

function appXml(slideCount: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>Stravision</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>${slideCount}</Slides>
</Properties>`
}

/** XML 文本转义（含 XML 1.0 非法控制字符剔除，否则 PowerPoint 直接判定损坏） */
function esc(s: string): string {
  return String(s ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
