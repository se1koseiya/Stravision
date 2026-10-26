/**
 * PPTX 就地编辑（保格式）
 *
 * 与 docx 同思路：只改 `ppt/slides/slideN.xml` 里的 `<a:t>` 字符，
 * 版式、母版、图片、动画、转场全部原样保留。
 *
 * 两个 PPT 特有的坑：
 *
 * 1. **文字同样会被切成多个 `<a:t>`**（Word 的拼写检查、字体变更、输入法都会切），
 *    所以替换必须在 `<a:p>` 段落层面拼接后再映射回 run —— 逻辑与 docx 共用一套算法，
 *    见 edit/docx.ts#replaceInParagraph 的注释。
 *
 * 2. **追加幻灯片要同时改三个文件**：新建 slideN.xml、在 presentation.xml 的
 *    `sldIdLst` 里挂 id、在 rels 里登记关系、在 `[Content_Types].xml` 里声明类型。
 *    少任何一个，PowerPoint 都会报「文件已损坏」。
 */

import JSZip from 'jszip'
import { buildSlideXml, type SlideContent } from '../render/pptx'
import { decodeXmlText, encodeXmlText, replaceInParagraph } from './docx'

export type PptxOp =
  | { op: 'replace_text'; find: string; replace: string; slide?: number; limit?: number }
  | { op: 'set_slide_title'; slide: number; title: string }
  | { op: 'append_slide'; title: string; bullets?: string[] }

export interface PptxEditResult {
  buf: Buffer
  replacements: number
  notes: string[]
  details: Array<{ op: string; ok: boolean; note?: string }>
}

/** `<a:t>` 的匹配（含自闭合形式极少见，一并覆盖） */
const A_T_RE = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g

/** 段落级跨 run 替换（PPT 版：结构是 <a:p> + <a:r><a:t>） */
function replaceInParagraphPptx(paragraphXml: string, find: string, replace: string): { xml: string; count: number } {
  type Slot = { start: number; end: number }
  const slots: Slot[] = []
  let combined = ''
  A_T_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = A_T_RE.exec(paragraphXml)) !== null) {
    const text = decodeXmlText(m[1])
    slots.push({ start: combined.length, end: combined.length + text.length })
    combined += text
  }
  if (!slots.length || !find) return { xml: paragraphXml, count: 0 }

  const hits: Array<{ s: number; e: number }> = []
  let from = 0
  while (true) {
    const idx = combined.indexOf(find, from)
    if (idx < 0) break
    hits.push({ s: idx, e: idx + find.length })
    from = idx + find.length
  }
  if (!hits.length) return { xml: paragraphXml, count: 0 }

  // 与 docx 同构：先取出各 run 文本，倒序替换，再按序写回
  A_T_RE.lastIndex = 0
  const texts: string[] = []
  let mm: RegExpExecArray | null
  while ((mm = A_T_RE.exec(paragraphXml)) !== null) texts.push(decodeXmlText(mm[1]))

  for (const hit of [...hits].reverse()) {
    const i = slots.findIndex(s => hit.s >= s.start && hit.s < s.end)
    const jRaw = slots.findIndex(s => hit.e > s.start && hit.e <= s.end)
    const first = i < 0 ? texts.length - 1 : i
    const last = jRaw < 0 ? first : Math.max(first, jRaw)
    const prefix = texts[first].slice(0, hit.s - slots[first].start)
    const suffix = texts[last].slice(hit.e - slots[last].start)
    texts[first] = prefix + replace + (first === last ? suffix : '')
    for (let k = first + 1; k < last; k++) texts[k] = ''
    if (first !== last) texts[last] = suffix
  }

  let cursor = 0
  const rebuilt = paragraphXml.replace(A_T_RE, () => {
    const text = texts[cursor++] ?? ''
    return `<a:t>${encodeXmlText(text)}</a:t>`
  })
  return { xml: rebuilt, count: hits.length }
}

/** 在整份 slide XML 上做替换，返回命中数 */
function replaceInSlideXml(xml: string, find: string, replace: string, limit: number): { xml: string; count: number } {
  let total = 0
  const out = xml.replace(/<a:p\b[\s\S]*?<\/a:p>/g, para => {
    if (total >= limit) return para
    const r = replaceInParagraphPptx(para, find, replace)
    total += r.count
    return r.xml
  })
  return { xml: out, count: total }
}

export async function applyPptxEdits(buf: Buffer, ops: PptxOp[]): Promise<PptxEditResult> {
  const zip = await JSZip.loadAsync(buf)
  const slideNames = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1] || 0) - Number(b.match(/slide(\d+)/)?.[1] || 0))
  if (!slideNames.length) throw new Error('不是有效的 pptx：找不到 ppt/slides/slideN.xml')

  let replacements = 0
  const notes: string[] = []
  const details: PptxEditResult['details'] = []

  for (const op of ops) {
    if (op.op === 'replace_text') {
      const targets =
        op.slide && op.slide > 0
          ? [slideNames[op.slide - 1]].filter(Boolean)
          : slideNames
      let hit = 0
      for (const name of targets) {
        const file = zip.file(name)
        if (!file) continue
        const xml = await file.async('string')
        const r = replaceInSlideXml(xml, op.find, op.replace, op.limit ?? Infinity)
        if (r.count > 0) {
          zip.file(name, r.xml)
          hit += r.count
        }
      }
      replacements += hit
      details.push({
        op: `replace_text("${op.find.slice(0, 20)}")${op.slide ? ` @第${op.slide}张` : ''}`,
        ok: hit > 0,
        note: hit > 0 ? `命中 ${hit} 处` : '未找到目标文本（可能在图片、图表或备注里）',
      })
    } else if (op.op === 'set_slide_title') {
      const name = slideNames[op.slide - 1]
      if (!name) {
        details.push({ op: 'set_slide_title', ok: false, note: `第 ${op.slide} 张不存在（共 ${slideNames.length} 张）` })
        continue
      }
      const file = zip.file(name)!
      let xml = await file.async('string')
      // 标题 = 页面上最大的那段文字；先把标题形状的文本换掉，失败则退化为「替换首个 a:t」
      const before = xml
      xml = replaceSlideTitle(xml, op.title)
      if (xml === before) {
        xml = xml.replace(A_T_RE, (_m, t: string) => `<a:t>${encodeXmlText(op.title)}</a:t>`)
      }
      zip.file(name, xml)
      details.push({ op: `set_slide_title(第${op.slide}张)`, ok: true })
    } else if (op.op === 'append_slide') {
      const index = slideNames.length + 1
      const bullets = (op.bullets || []).filter(Boolean)
      const slide: SlideContent = {
        kind: 'content',
        // 追加的页面沿用生成器的版式规则：少于等于 5 条走单栏，更多走双栏。
        // 走同一套 `buildSlideXml` 才能和已有页面保持一致的边距、字号与主色条。
        layout: bullets.length > 5 ? 'twoColumn' : 'bullets',
        title: op.title,
        bullets,
      }
      zip.file(`ppt/slides/slide${index}.xml`, buildSlideXml(slide))
      zip.file(
        `ppt/slides/_rels/slide${index}.xml.rels`,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`,
      )
      await patchPresentation(zip, index)
      await patchContentTypes(zip, index)
      details.push({ op: `append_slide(第${index}张)`, ok: true })
    }
  }

  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  if (replacements === 0 && ops.some(o => o.op === 'replace_text')) {
    notes.push('未命中任何文字。若文字在图片/图表/备注页中，需改用「基于内容重新生成」而不是原地替换。')
  }
  return { buf: out, replacements, notes, details }
}

/** 改标题：优先命中带 title 占位符的形状 */
function replaceSlideTitle(xml: string, title: string): string {
  const shapes = xml.split(/<p:sp>/)
  let changed = false
  const rebuilt = shapes.map((shape, i) => {
    if (i === 0 || changed) return shape
    if (!/<p:ph\b[^>]*\btype="(?:title|ctrTitle)"/i.test(shape)) return shape
    changed = true
    let first = true
    return shape.replace(A_T_RE, (_m) => {
      if (first) {
        first = false
        return `<a:t>${encodeXmlText(title)}</a:t>`
      }
      return '<a:t></a:t>'
    })
  })
  return changed ? rebuilt.join('<p:sp>') : xml
}

/** 把新幻灯片挂到 presentation.xml 的 sldIdLst 末尾，并补 rels */
async function patchPresentation(zip: JSZip, newIndex: number): Promise<void> {
  const presFile = zip.file('ppt/presentation.xml')
  const relsFile = zip.file('ppt/_rels/presentation.xml.rels')
  if (!presFile || !relsFile) throw new Error('pptx 结构异常：缺少 presentation.xml')

  const pres = await presFile.async('string')
  const rels = await relsFile.async('string')

  // 计算新的 rId（避免与已有冲突）
  const usedIds = [...rels.matchAll(/Id="rId(\d+)"/g)].map(m => Number(m[1]))
  const nextRid = Math.max(0, ...usedIds) + 1
  const sldIds = [...pres.matchAll(/<p:sldId\b[^>]*\bid="(\d+)"/g)].map(m => Number(m[1]))
  const nextSlideId = Math.max(255, ...sldIds) + 1

  const newPres = pres.replace(
    /<\/p:sldIdLst>/,
    `<p:sldId id="${nextSlideId}" r:id="rId${nextRid}"/></p:sldIdLst>`,
  )
  const newRels = rels.replace(
    /<\/Relationships>/,
    `<Relationship Id="rId${nextRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${newIndex}.xml"/></Relationships>`,
  )

  zip.file('ppt/presentation.xml', newPres)
  zip.file('ppt/_rels/presentation.xml.rels', newRels)
}

/** 声明新幻灯片的 ContentType */
async function patchContentTypes(zip: JSZip, newIndex: number): Promise<void> {
  const f = zip.file('[Content_Types].xml')
  if (!f) throw new Error('pptx 结构异常：缺少 [Content_Types].xml')
  const xml = await f.async('string')
  if (xml.includes(`/ppt/slides/slide${newIndex}.xml`)) return
  const patched = xml.replace(
    /<\/Types>/,
    `<Override PartName="/ppt/slides/slide${newIndex}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`,
  )
  zip.file('[Content_Types].xml', patched)
}

export { replaceInParagraph }
