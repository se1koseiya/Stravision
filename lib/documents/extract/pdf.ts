/**
 * PDF 读取
 *
 * ## 分两条腿走
 *
 * 1. **有文本层**（Word/WPS/LaTeX 导出的绝大多数 PDF）→ pdfjs 提 `getTextContent`，
 *    按坐标重建成行。这条腿产出的是真文字，最准也最省。
 *
 * 2. **无文本层**（扫描件 / 拍照转 PDF）→ **不跑 OCR**。
 *    直接抽出页内的原始位图（扫描页通常就是一整张 JPEG），原样交给多模态模型看。
 *    这是本模块最重要的设计：OCR 引擎对中文表格、手写、印章的识别率远不如
 *    「让模型直接看图」，而且会引入一个必须常驻的外部依赖。
 *
 * 图片数据来源按 pdfjs 的 ImageKind 分支处理：
 *   · JPEG → 原始字节就是合法 JPEG，直接 base64（无损、零重编码）
 *   · RGB/RGBA 原始像素 → 本地纯 JS 编成 PNG（见 common.ts#encodePng）
 *   · 1bpp 阈值图 / JPX(JPEG2000) → 跳过（前者是掩码图，后者 Node 无解码器）
 */

import path from 'node:path'
import type { DocumentDigest, DigestImage, DigestSection, OutlineNode } from '../types'
import {
  CharBudget,
  DEFAULT_MAX_CHARS,
  MAX_VISION_IMAGE_BYTES,
  countWords,
  encodePng,
  guessTitle,
  rebuildLines,
  wantedSections,
  type ExtractOptions,
} from './common'

/** pdfjs 的 ImageKind 数值（避免深层 import 内部模块，这里是稳定 ABI） */
const KIND_GRAYSCALE_1BPP = 1
const KIND_RGB_24BPP = 2
const KIND_RGBA_32BPP = 3
const KIND_JPEG = 4

interface PdfImageData {
  data?: Uint8Array | Uint8ClampedArray
  width?: number
  height?: number
  kind?: number
}

let pdfjsPromise: Promise<any> | null = null

/** 惰性加载 pdfjs（legacy build 才带 Node 兼容层；首次解析要 200~400ms，之后复用） */
async function loadPdfjs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').catch(async () => {
      // 部分打包形态下 legacy 入口解析失败，回退到标准入口（该入口没有类型声明，故用变量路径绕开静态检查）
      const fallbackPath = 'pdfjs-dist/build/pdf.mjs'
      return await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ fallbackPath)
    })
  }
  return pdfjsPromise
}

/** 资源目录（cmaps 对中文 CID 字体是关键，缺失会导致中文整段丢失） */
function resourceUrls(): { cMapUrl?: string; standardFontDataUrl?: string } {
  const base = path.join(process.cwd(), 'node_modules', 'pdfjs-dist')
  return {
    cMapUrl: path.join(base, 'cmaps') + path.sep,
    standardFontDataUrl: path.join(base, 'standard_fonts') + path.sep,
  }
}

export async function extractPdf(buf: Buffer, opts: ExtractOptions): Promise<DocumentDigest> {
  const pdfjs = await loadPdfjs()
  const { cMapUrl, standardFontDataUrl } = resourceUrls()

  const task = pdfjs.getDocument({
    // pdfjs 会接管并可能 detach 传入的 buffer，必须给独立副本
    data: new Uint8Array(buf),
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
    useSystemFonts: false,
    isEvalSupported: false,
    disableFontFace: true,
  })
  const pdf = await task.promise

  const budget = new CharBudget(opts.maxChars ?? DEFAULT_MAX_CHARS)
  const only = wantedSections(opts.sections)
  const notes: string[] = []

  const sections: DigestSection[] = []
  const images: DigestImage[] = []
  const outline: OutlineNode[] = []
  let textlessUnits = 0

  // ── 大纲（书签）──
  try {
    const raw = await pdf.getOutline()
    if (raw?.length) {
      for (const item of raw.slice(0, 80)) {
        let sectionIndex: number | undefined
        try {
          const dest = typeof item.dest === 'string' ? await pdf.getDestination(item.dest) : item.dest
          if (Array.isArray(dest) && dest[0]) {
            const pageIdx = await pdf.getPageIndex(dest[0])
            sectionIndex = pageIdx + 1 // section.index 用 1-based 页号
          }
        } catch {
          // 目标页解析失败时只保留标题
        }
        outline.push({ level: 1, title: String(item.title || '').trim() || `第 ${sectionIndex ?? '?'} 页`, sectionIndex })
      }
    }
  } catch {
    // 大纲坏了不影响正文
  }

  const totalPages: number = pdf.numPages
  const pageNumbers: number[] = only
    ? [...only].filter(n => n <= totalPages).sort((a, b) => a - b)
    : Array.from({ length: totalPages }, (_, i) => i + 1)

  for (const pageNo of pageNumbers) {
    const page = await pdf.getPage(pageNo)
    let text = ''
    try {
      const tc = await page.getTextContent()
      text = rebuildLines(tc.items as any[])
    } catch (e: any) {
      notes.push(`第 ${pageNo} 页文本层解析失败：${e?.message ?? e}`)
    }

    const trimmed = text.trim()
    const sectionIndex = pageNo

    if (!trimmed) {
      textlessUnits++
    }

    // ── 图片：仅在该页没有文本、或调用方明确要看图时才提取 ──
    //   「有文本的页也抽图」会让一份 80 页的图文报告瞬间产生 200 张图，
    //   既撑爆上下文也没必要 —— 文字已经说清楚了。
    const wantImages = opts.includeImages !== false && (!trimmed || opts.includeImages === true)
    if (wantImages) {
      const pageImages = await extractPageImages(page, sectionIndex, opts)
      if (pageImages.length) {
        images.push(...pageImages)
        if (!trimmed) {
          // 扫描页：把模型看到的图注当成该页正文，页面才有内容可引用
          const first = pageImages.find(i => i.transcript)
          if (first?.transcript) {
            text = first.transcript
          }
        }
      }
    }

    const content = budget.take(text)
    sections.push({
      index: sectionIndex,
      kind: 'page',
      label: `第 ${pageNo} 页`,
      text: content,
      charCount: content.length,
    })

    if (budget.remaining() <= 0 && pageNo !== pageNumbers[pageNumbers.length - 1]) {
      notes.push(`已达读取预算（${budget.max} 字），第 ${pageNo + 1} 页起未读取。需要后续内容请指定 sections 续读。`)
      break
    }
  }

  if (!outline.length && sections.length) {
    // 没有书签的 PDF 用页级大纲兜底，模型至少能按页定位
    for (const s of sections.slice(0, 40)) {
      outline.push({ level: 1, title: `${s.label}${s.text ? '' : '（无文本层）'}`, sectionIndex: s.index })
    }
  }

  const totalChars = sections.reduce((n, s) => n + s.charCount, 0)
  if (textlessUnits > 0 && !images.some(i => i.transcript)) {
    notes.push(
      `有 ${textlessUnits} 页没有文本层（扫描件/图片页）。` +
        `如需读取这些页，请让用户把该页截图发到对话里，或重新以「包含图片」方式读取。`,
    )
  }

  const title = await readPdfTitle(pdf).catch(() => '') || guessTitle(sections[0]?.text ?? '', opts.fileName)

  await pdf.destroy().catch(() => {})

  return {
    fileId: opts.fileId,
    fileName: opts.fileName,
    format: 'pdf',
    sizeBytes: buf.length,
    title,
    outline,
    sections,
    tables: [],
    images,
    stats: {
      pages: totalPages,
      chars: totalChars,
      tables: 0,
      images: images.length,
      textlessUnits,
      paragraphs: sections.length,
    },
    truncated: budget.truncated,
    notes,
  }
}

/** 读 PDF 元数据里的标题 */
async function readPdfTitle(pdf: any): Promise<string> {
  const meta = await pdf.getMetadata()
  const t = meta?.info?.Title
  return typeof t === 'string' ? t.trim().slice(0, 120) : ''
}

/**
 * 从一页的操作列表里捞出图像对象。
 *
 * pdfjs 的 `page.objs` 是异步填充的：`get(id, cb)` 在对象尚未解码时会挂回调。
 * 必须带超时 —— 某些损坏的 PDF 会让回调永不到达，否则整次读取会卡死。
 */
async function extractPageImages(
  page: any,
  sectionIndex: number,
  opts: ExtractOptions,
): Promise<DigestImage[]> {
  const out: DigestImage[] = []
  let opList: any
  try {
    opList = await page.getOperatorList()
  } catch {
    return out
  }

  const pdfjs = await loadPdfjs()
  const OPS = pdfjs.OPS
  const imageOps = new Set<number>([OPS.paintImageXObject, OPS.paintImageMaskXObject, OPS.paintInlineImageXObject])

  for (let i = 0; i < opList.fnArray.length && out.length < 6; i++) {
    if (!imageOps.has(opList.fnArray[i])) continue
    const args = opList.argsArray[i]
    const objId = typeof args?.[0] === 'string' ? args[0] : null
    if (!objId) continue

    const img = await waitForObject(page, objId)
    if (!img) continue

    const encoded = encodePdfImage(img)
    if (!encoded) continue

    const bytes = encoded.buf.length
    if (bytes < 8 * 1024) continue // 小于 8KB 的多为装饰图形/图标

    let dataUrl: string | undefined
    let transcript: string | undefined
    // 只有体积合理 + 上层提供了视觉能力时才真的送模型
    if (bytes <= MAX_VISION_IMAGE_BYTES && opts.includeImages && opts.describeImage) {
      dataUrl = `data:${encoded.mime};base64,${encoded.buf.toString('base64')}`
      try {
        transcript =
          (await opts.describeImage(dataUrl, `${opts.fileName} 第 ${sectionIndex} 页的图片内容`)) ?? undefined
      } catch {
        transcript = undefined
      }
    }

    out.push({
      sectionIndex,
      label: `第 ${sectionIndex} 页 · 图 ${out.length + 1}`,
      bytes,
      width: img.width,
      height: img.height,
      transcript,
      dataUrl,
    })
  }
  return out
}

/** 等 page.objs 里的图像对象就绪（最多 1.5s） */
function waitForObject(page: any, objId: string): Promise<PdfImageData | null> {
  return new Promise(resolve => {
    let settled = false
    const done = (v: PdfImageData | null) => {
      if (settled) return
      settled = true
      resolve(v)
    }
    const timer = setTimeout(() => done(null), 1500)
    try {
      // 已存在时回调同步触发；不存在则注册等待
      page.objs.get(objId, (data: PdfImageData) => {
        clearTimeout(timer)
        done(data ?? null)
      })
    } catch {
      clearTimeout(timer)
      done(null)
    }
  })
}

/** pdfjs 图像对象 → 可直接交付的图片字节 */
function encodePdfImage(img: PdfImageData): { buf: Buffer; mime: string } | null {
  const raw = img.data
  if (!raw || !img.width || !img.height) return null
  const bytes = Buffer.from(raw instanceof Uint8ClampedArray ? new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength) : raw)

  // JPEG：字节本身就是完整文件，零重编码
  const looksJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (img.kind === KIND_JPEG || looksJpeg) {
    return { buf: bytes, mime: 'image/jpeg' }
  }

  if (img.kind === KIND_RGB_24BPP) {
    const need = img.width * img.height * 3
    if (bytes.length < need) return null
    return { buf: encodePng(bytes.subarray(0, need), img.width, img.height, 3), mime: 'image/png' }
  }
  if (img.kind === KIND_RGBA_32BPP) {
    const need = img.width * img.height * 4
    if (bytes.length < need) return null
    return { buf: encodePng(bytes.subarray(0, need), img.width, img.height, 4), mime: 'image/png' }
  }
  if (img.kind === KIND_GRAYSCALE_1BPP) {
    // 单色掩码图（通常是签名/线条图层），转成灰度 PNG 会误导模型，直接跳过
    return null
  }

  // 未知 kind：尽量按像素数猜通道
  const px = img.width * img.height
  if (bytes.length >= px * 4) {
    return { buf: encodePng(bytes.subarray(0, px * 4), img.width, img.height, 4), mime: 'image/png' }
  }
  if (bytes.length >= px * 3) {
    return { buf: encodePng(bytes.subarray(0, px * 3), img.width, img.height, 3), mime: 'image/png' }
  }
  return null
}
