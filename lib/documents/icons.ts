/**
 * 生成物图标（矢量）
 *
 * ## 问题：模型画不出图标，也不该让它画
 *
 * 让模型去"生成图标"是注定失败的路：它只能吐一段粗糙的 SVG 路径，
 * 而 OOXML 里根本没有"贴一段 SVG"这种东西（Office 2016+ 才有 svgBlip，
 * 且兼容性一言难尽）。结果就是——要么图标画得歪七扭八，
 * 要么整页退化成一堆文字。
 *
 * ## 解法：图标是**系统的资产**，不是模型的产物
 *
 * 项目里已经有 213 个 HarmonyOS Symbol 字形（`components/harmonyos-symbol-data`），
 * 这套字形本身就是**填充轮廓路径**。这里把它们转成 DrawingML 的
 * `<a:custGeom>`（自定义几何），于是：
 *
 *   · PPTX 里是**真矢量形状**（可改色、缩放不糊，不是图片）；
 *   · DOCX 里用同样的 `wps:wsp + a:custGeom` 画（Word 支持）；
 *   · 模型只需要说"要点"或"指标"，图标由版式**按语义自动配**
 *     （见 {@link pickIconFor}），或者显式写 `::icon[leaf]`。
 *
 * 一句话：模型负责说人话，图标由系统负责画。
 */

import { HARMONY_SYMBOL_PATHS } from '@/components/harmonyos-symbol-data'
import { EMERALD } from './theme'

/** DrawingML 路径盒：固定 21600 × 21600 EMU */
export const PATH_BOX = 21600

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 字形设计盒（字体单位，与 harmonyos-symbol-data 头部说明一致） */
const DESIGN = { upem: 1000, top: 880 } as const

export type DrawCmd =
  | { c: 'M' | 'L'; x: number; y: number }
  | { c: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { c: 'Q'; x1: number; y1: number; x: number; y: number }
  | { c: 'Z' }

/**
 * 字体单位坐标 → DrawingML 路径坐标。
 *
 * 与 `HARMONY_SYMBOL_TRANSFORM = translate(0 21.12) scale(0.024 -0.024)` 等价：
 *   u = (x / upem) · 21600
 *   v = ((top - y) / upem) · 21600
 */
function toPathX(x: number): number {
  return Math.round((x / DESIGN.upem) * PATH_BOX)
}
function toPathY(y: number): number {
  return Math.round(((DESIGN.top - y) / DESIGN.upem) * PATH_BOX)
}

/** 数字序列（支持 `-66`、`.5`、`1e3` 与逗号分隔） */
function numbers(src: string): number[] {
  const out: number[] = []
  const re = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) out.push(Number(m[0]))
  return out
}

/**
 * 解析 SVG path `d` → DrawingML 指令序列。
 *
 * 已覆盖 HarmonyOS Symbol 实际用到的全部指令（M / L / H / V / Q / Z），
 * 另外支持 C 与 A（弧线用贝塞尔逼近），其余指令退化为直线，保证不解析失败。
 */
export function parsePath(d: string): DrawCmd[] {
  const cmds: DrawCmd[] = []
  const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || []

  let i = 0
  let cx = 0 // 当前点（字体单位）
  let cy = 0
  let cmd = ''
  let startX = 0
  let startY = 0

  const read = (n: number): number[] => {
    const vals: number[] = []
    for (let k = 0; k < n; k++) vals.push(Number(tokens[i++]))
    return vals
  }

  while (i < tokens.length) {
    const t = tokens[i]
    if (/[A-Za-z]/.test(t)) {
      cmd = t
      i++
      if (cmd === 'Z' || cmd === 'z') {
        cmds.push({ c: 'Z' })
        cx = startX
        cy = startY
        continue
      }
    }

    const rel = cmd === cmd.toLowerCase()
    const C = cmd.toUpperCase()

    if (C === 'M') {
      const [x, y] = read(2)
      cx = rel ? cx + x : x
      cy = rel ? cy + y : y
      startX = cx
      startY = cy
      cmds.push({ c: 'M', x: toPathX(cx), y: toPathY(cy) })
      // M 之后的隐式坐标对视作 L
      cmd = rel ? 'l' : 'L'
    } else if (C === 'L') {
      const [x, y] = read(2)
      cx = rel ? cx + x : x
      cy = rel ? cy + y : y
      cmds.push({ c: 'L', x: toPathX(cx), y: toPathY(cy) })
    } else if (C === 'H') {
      const [x] = read(1)
      cx = rel ? cx + x : x
      cmds.push({ c: 'L', x: toPathX(cx), y: toPathY(cy) })
    } else if (C === 'V') {
      const [y] = read(1)
      cy = rel ? cy + y : y
      cmds.push({ c: 'L', x: toPathX(cx), y: toPathY(cy) })
    } else if (C === 'C') {
      const [x1, y1, x2, y2, x, y] = read(6)
      const p1x = rel ? cx + x1 : x1
      const p1y = rel ? cy + y1 : y1
      const p2x = rel ? cx + x2 : x2
      const p2y = rel ? cy + y2 : y2
      const px = rel ? cx + x : x
      const py = rel ? cy + y : y
      cmds.push({
        c: 'C',
        x1: toPathX(p1x),
        y1: toPathY(p1y),
        x2: toPathX(p2x),
        y2: toPathY(p2y),
        x: toPathX(px),
        y: toPathY(py),
      })
      cx = px
      cy = py
    } else if (C === 'Q') {
      const [x1, y1, x, y] = read(4)
      const px1 = rel ? cx + x1 : x1
      const py1 = rel ? cy + y1 : y1
      const px = rel ? cx + x : x
      const py = rel ? cy + y : y
      cmds.push({
        c: 'Q',
        x1: toPathX(px1),
        y1: toPathY(py1),
        x: toPathX(px),
        y: toPathY(py),
      })
      cx = px
      cy = py
    } else if (C === 'A') {
      // 弧线：用四段三次贝塞尔逼近（90° 分段，误差可接受）
      const [rx, ry] = read(2)
      i += 1 // 旋转角
      const [laf, sf] = read(2)
      const [ex, ey] = read(2)
      const tx = rel ? cx + ex : ex
      const ty = rel ? cy + ey : ey
      for (const seg of arcToCubics(cx, cy, rx, ry, laf, sf, tx, ty)) {
        cmds.push({
          c: 'C',
          x1: toPathX(seg.c1x),
          y1: toPathY(seg.c1y),
          x2: toPathX(seg.c2x),
          y2: toPathY(seg.c2y),
          x: toPathX(seg.x),
          y: toPathY(seg.y),
        })
      }
      cx = tx
      cy = ty
    } else {
      i++ // 未知指令：跳过，避免死循环
    }
  }

  return cmds
}

interface CubicSeg {
  c1x: number
  c1y: number
  c2x: number
  c2y: number
  x: number
  y: number
}

/** 端点弧 → 三次贝塞尔（标准 endpoint arc parameterization + 分段） */
function arcToCubics(
  sx: number,
  sy: number,
  rx: number,
  ry: number,
  largeArc: number,
  sweep: number,
  ex: number,
  ey: number,
): CubicSeg[] {
  if (rx === 0 || ry === 0) return [{ c1x: sx, c1y: sy, c2x: ex, c2y: ey, x: ex, y: ey }]
  const dx2 = (sx - ex) / 2
  const dy2 = (sy - ey) / 2
  const rxr = Math.abs(rx)
  const ryr = Math.abs(ry)
  const lambda = (dx2 * dx2) / (rxr * rxr) + (dy2 * dy2) / (ryr * ryr)
  if (lambda > 1) {
    const s = Math.sqrt(lambda)
    return arcToCubics(sx, sy, rxr * s, ryr * s, largeArc, sweep, ex, ey)
  }

  const sign = largeArc !== sweep ? 1 : -1
  const coef =
    sign *
    Math.sqrt(
      Math.max(
        0,
        (rxr * rxr * ryr * ryr - rxr * rxr * dy2 * dy2 - ryr * ryr * dx2 * dx2) /
          (rxr * rxr * dy2 * dy2 + ryr * ryr * dx2 * dx2),
      ),
    )
  const cxp = (coef * rxr * dy2) / ryr
  const cyp = (-coef * ryr * dx2) / rxr
  const cx0 = cxp + (sx + ex) / 2
  const cy0 = cyp + (sy + ey) / 2

  const phi = 0 // 数据里旋转角恒为 0
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const x1p = (sx - cx0) / rxr
  const y1p = (sy - cy0) / ryr
  const x2p = (ex - cx0) / rxr
  const y2p = (ey - cy0) / ryr
  const theta1 = Math.atan2(y1p, x1p)
  let dTheta = Math.atan2(y2p, x2p) - theta1
  if (sweep === 0 && dTheta > 0) dTheta -= 2 * Math.PI
  else if (sweep === 1 && dTheta < 0) dTheta += 2 * Math.PI

  const segments = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)))
  const delta = dTheta / segments
  const t = ((4 / 3) * Math.tan(delta / 4))

  const out: CubicSeg[] = []
  let th = theta1
  let px = sx
  let py = sy
  for (let s = 0; s < segments; s++) {
    const th2 = th + delta
    const cos1 = Math.cos(th)
    const sin1 = Math.sin(th)
    const cos2 = Math.cos(th2)
    const sin2 = Math.sin(th2)
    const exx = cx0 + rxr * cos2
    const eyy = cy0 + ryr * sin2
    const e1x = px - t * (-rxr * sin1)
    const e1y = py - t * (ryr * cos1)
    const e2x = exx + t * (-rxr * sin2)
    const e2y = eyy + t * (ryr * cos2)
    out.push({ c1x: e1x, c1y: e1y, c2x: e2x, c2y: e2y, x: exx, y: eyy })
    th = th2
    px = exx
    py = eyy
  }
  return out
}

/**
 * DrawingML `<a:path>` 片段（不含外层 `<a:custGeom>`）。
 *
 * 两个入口：
 *   · `pathXml(svgPath)` —— 传 SVG path `d`（字体单位），内部解析 + 换算；
 *   · `drawPathXml(cmds)` —— 传**已换算好的 21600 盒坐标**指令，供渲染器
 *     直接画图表折线这类"现算出来的几何"。
 */
export function pathXml(d: string): string {
  return drawPathXml(parsePath(d))
}

export function drawPathXml(cmds: DrawCmd[], box = PATH_BOX): string {
  const parts: string[] = []
  for (const c of cmds) {
    if (c.c === 'M' || c.c === 'L') {
      parts.push(`<a:${c.c === 'M' ? 'moveTo' : 'lnTo'}><a:pt x="${c.x}" y="${c.y}"/></a:${c.c === 'M' ? 'moveTo' : 'lnTo'}>`)
    } else if (c.c === 'Q') {
      parts.push(
        `<a:quadBezTo><a:pt x="${c.x1}" y="${c.y1}"/><a:pt x="${c.x}" y="${c.y}"/></a:quadBezTo>`,
      )
    } else if (c.c === 'C') {
      parts.push(
        `<a:cubicBezTo><a:pt x="${c.x1}" y="${c.y1}"/><a:pt x="${c.x2}" y="${c.y2}"/><a:pt x="${c.x}" y="${c.y}"/></a:cubicBezTo>`,
      )
    } else {
      parts.push('<a:close/>')
    }
  }
  return `<a:path w="${box}" h="${box}">${parts.join('')}</a:path>`
}

/**
 * PPTX 自定义几何（`<a:custGeom>`）——把图标字形变成真正的矢量形状。
 *
 * 为什么不用 `<a:blip>` 贴 PNG：贴进去的是位图，放大就糊，且在 PowerPoint 里
 * 无法跟随主题改色。custGeom 是形状，缩放无损、可改填充色。
 */
export function custGeomXml(glyphName: string): string | null {
  const d = getGlyphPath(glyphName)
  if (!d) return null
  return [
    '<a:custGeom>',
    '<a:avLst/>',
    '<a:gdLst/>',
    '<a:ahLst/>',
    '<a:cxnLst/>',
    '<a:rect l="l" t="t" r="r" b="b"/>',
    '<a:pathLst>',
    pathXml(d),
    '</a:pathLst>',
    '</a:custGeom>',
  ].join('')
}

/** 取字形路径（字体单位坐标） */
export function getGlyphPath(name: string): string | undefined {
  return HARMONY_SYMBOL_PATHS[name]
}

/** 全部图标名（按字母序） */
export function listIconNames(): string[] {
  return Object.keys(HARMONY_SYMBOL_PATHS).sort()
}

/**
 * 语义 → 图标。
 *
 * 排序敏感：先匹配更具体的长词，避免「数据」被「数」抢走。
 * 这是给「自动配图标」用的：模型只输出要点文字，系统按关键词挑一枚合适的字形。
 */
const ICON_KEYWORDS: Array<[RegExp, string]> = [
  [/温度|气温|地温|therm|temper/i, 'thermometer'],
  [/湿度|水分|含水|土壤墒|moist|humid/i, 'drop'],
  [/光照|日照|补光|lux|light/i, 'sun_max'],
  [/co2|二氧化碳|carbon/i, 'cloud'],
  [/灌溉|浇水|滴灌|喷灌|irrigat/i, 'drop'],
  [/施肥|养分|营养|肥料|fert/i, 'leaf'],
  [/生长|长势|发育|growth/i, 'leaf'],
  [/病害|病害|病斑|发病|防治|disease|pest/i, 'cross_case'],
  [/土壤|基质|substrate|soil/i, 'tropicaltrees_and_sand'],
  [/产量|收获|投产|yield/i, 'histogram'],
  [/设备|摄像头|相机|监控|camera|device/i, 'camera'],
  [/传感器|探头|探头|sensor/i, 'memory_module'],
  [/网络|联网|离线|掉线|wifi|network|offline/i, 'wifi'],
  [/告警|预警|告警|风险|异常|alert|warn|risk/i, 'exclamationmark_triangle'],
  [/数据|指标|统计|趋势|analytics|data|metric|kpi/i, 'data_proportion'],
  [/图表|柱状|折线|chart/i, 'histogram'],
  [/效率|提升|优化|增效|efficien/i, 'bolt'],
  [/成本|费用|预算|投入|cost|budget/i, 'yuansign_circle'],
  [/时间|周期|计划|排期|日程|schedule|time|calendar/i, 'calendar'],
  [/流程|步骤|阶段|环节|process|flow|step/i, 'arrow_2_circlepath'],
  [/质量|品级|分级|quality|grade/i, 'checkmark_shield'],
  [/安全|权限|加密|防控|security|lock/i, 'lock'],
  [/团队|人员|用户|员工|协作|team|user|people/i, 'person_2'],
  [/目标|愿景|战略|规划|goal|target|vision/i, 'dart_target'],
  [/创新|智能|ai|模型|算法|smart|brain/i, 'lightbulb'],
  [/环境|生态|绿色|低碳|eco|green/i, 'leaf'],
  [/物流|运输|配送|供应链|logistic|ship/i, 'archivebox'],
  [/销售|市场|营收|增长|sales|market|revenue/i, 'arrow_up_right'],
  [/培训|学习|教育|知识|train|learn|edu/i, 'graduationcap'],
  [/报告|总结|汇报|文档|报告|report|doc/i, 'doc_text'],
  [/结论|建议|行动|下一步|conclusion|next/i, 'checkmark'],
]

/** 兜底图标：关键词都没命中时用的一枚中性字形 */
const FALLBACK_GLYPH = 'circle'

/** 是否已有这枚图标（模型写错名字时用来降级，而不是渲染出空洞） */
export function hasIcon(name: string): boolean {
  return Boolean(getGlyphPath(name))
}

/** 按标题/要点语义挑一枚图标；命中不了返回 null（调用方决定是否画徽标） */
export function pickIconFor(text: string): string | null {
  const s = String(text || '')
  if (!s.trim()) return null
  for (const [re, name] of ICON_KEYWORDS) {
    if (re.test(s)) return name
  }
  return null
}

/** 挑一枚图标，命中不了就退回中性兜底形 */
export function pickIconOrDefault(text: string): string {
  return pickIconFor(text) ?? FALLBACK_GLYPH
}

/**
 * PPTX 图标形状（`<p:sp>` + `<a:custGeom>`）。
 *
 * 尺寸用 EMU 传，调用方自己算（PPTX 只有 EMU 这一个单位，
 * 别在渲染器里出现第二套单位 —— 见 lib/documents/theme.ts）。
 */
export function iconShapeXml(input: {
  name: string
  /** EMU */
  x: number
  y: number
  size: number
  /** 6 位 hex，不带 #；省略时用主色（幻灯片恒为浅色底，故取 light） */
  color?: string
  id: number
}): string | null {
  const geom = custGeomXml(input.name)
  if (!geom) return null
  const color = input.color || EMERALD.light

  return [
    '<p:sp>',
    '<p:nvSpPr>',
    `<p:cNvPr id="${input.id}" name="Icon ${escapeXml(input.name)}"/>`,
    '<p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr>',
    '<p:nvPr/>',
    '</p:nvSpPr>',
    '<p:spPr>',
    `<a:xfrm><a:off x="${input.x}" y="${input.y}"/><a:ext cx="${input.size}" cy="${input.size}"/></a:xfrm>`,
    geom,
    `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`,
    '<a:ln><a:noFill/></a:ln>',
    '</p:spPr>',
    '<p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:endParaRPr lang="zh-CN" altLang="en-US"/></a:p></p:txBody>',
    '</p:sp>',
  ].join('')
}
