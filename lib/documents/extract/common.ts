/**
 * 提取层公共工具
 *
 * 三个共用的东西：字符预算、文本行重建、最小 PNG 编码。
 */

import zlib from 'node:zlib'

/** 一次读取的默认字符预算（中文约 1 字 ≈ 1 token，3 万字 ≈ 一次可安全吞下的上限） */
export const DEFAULT_MAX_CHARS = 30_000

/** 单张图片送多模态的上限字节（超过的多半是原图/印刷级位图，压缩后也不划算） */
export const MAX_VISION_IMAGE_BYTES = 4 * 1024 * 1024

export interface ExtractOptions {
  fileId: string
  fileName: string
  /** 只读这些分节（pdf=页号从1开始 / xlsx=sheet 序 / pptx=slide 序 / docx=section 序），空=全部 */
  sections?: number[]
  /** 字符预算，超出后停止累积并标记 truncated */
  maxChars?: number
  /**
   * 多模态转写回调。由上层注入（视觉网关），缺失时图片只登记不转写 ——
   * 本层不 import 视觉网关，避免工具包之间互相拖依赖。
   */
  describeImage?: (dataUrl: string, hint: string) => Promise<string | null>
  /** 是否尝试转写图片（用户明确要求"看图/扫描件"时才该开） */
  includeImages?: boolean
}

/** 字符预算累加器：任何一段超预算就停，且明确告诉调用方被截断了 */
export class CharBudget {
  private used = 0
  readonly max: number
  truncated = false

  constructor(max = DEFAULT_MAX_CHARS) {
    this.max = max
  }

  /** 返回可用字符数；0 表示已耗尽 */
  remaining(): number {
    return Math.max(0, this.max - this.used)
  }

  /**
   * 截取一段文本。超过预算时截断并置位 truncated。
   * 留 40 字余量给「已截断」提示，避免精确卡在边界上。
   */
  take(text: string): string {
    if (!text) return ''
    const room = this.remaining()
    if (room <= 0) {
      this.truncated = true
      return ''
    }
    if (text.length <= room) {
      this.used += text.length
      return text
    }
    this.truncated = true
    const cut = text.slice(0, Math.max(0, room - 40))
    this.used += cut.length
    return cut + '\n…（本段内容超出读取预算，已截断）'
  }
}

/**
 * 把 pdfjs 的文本项按「同一水平线」聚成行。
 *
 * 不重排会得到「标题温度湿度」这种糊在一起的串 —— pdfjs 的 items 是按绘制顺序给的，
 * 同一行的多个 span 是分开的项。按 y 容差聚类、行内按 x 排序，才能还原阅读顺序。
 */
export function rebuildLines(
  items: Array<{ str?: string; transform?: number[]; width?: number; hasEOL?: boolean }>,
): string {
  const lines: Array<{ y: number; x: number; text: string }> = []

  for (const it of items) {
    const str = it.str ?? ''
    if (!str) continue
    const tr = it.transform
    // transform = [a,b,c,d,e,f]，e=x, f=y
    const x = tr ? tr[4] : 0
    const y = tr ? tr[5] : 0

    // 同一行的判定：y 差在 fontSize 量级内（用 |d| 近似字号）
    const tol = tr ? Math.max(1.5, Math.abs(tr[3]) * 0.5) : 1.5
    const hit = lines.find(l => Math.abs(l.y - y) <= tol)
    if (hit) {
      // 按 x 插到正确位置，而不是简单尾接（PDF 里左右栏容易交错）
      if (x >= hit.x) {
        hit.text += (hit.text && !/\s$/.test(hit.text) ? ' ' : '') + str
        hit.x = x
      } else {
        hit.text = str + hit.text
        hit.x = x
      }
    } else {
      lines.push({ y, x, text: str })
    }
  }

  // 从上到下（PDF 坐标 y 越大越靠上）
  lines.sort((a, b) => b.y - a.y)
  return lines
    .map(l => l.text.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

/** RGBA/RGB 像素 → PNG（纯 JS，不引入 canvas / sharp） */
export function encodePng(
  data: Uint8Array,
  width: number,
  height: number,
  channels: 3 | 4,
): Buffer {
  const bytesPerPixel = channels
  const raw = Buffer.alloc((width * bytesPerPixel + 1) * height)
  let o = 0
  for (let y = 0; y < height; y++) {
    raw[o++] = 0 // filter: none
    const rowStart = y * width * bytesPerPixel
    raw.set(data.subarray(rowStart, rowStart + width * bytesPerPixel), o)
    o += width * bytesPerPixel
  }
  const idat = zlib.deflateSync(raw, { level: 6 })

  const chunk = (type: string, body: Buffer): Buffer => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(body.length, 0)
    const typeBuf = Buffer.from(type, 'ascii')
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, body])) >>> 0, 0)
    return Buffer.concat([len, typeBuf, body, crc])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = channels === 4 ? 6 : 2 // color type: 6=RGBA, 2=RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** 分节过滤：把「只要这几节」的请求归一成 Set */
export function wantedSections(sections?: number[]): Set<number> | null {
  if (!sections || sections.length === 0) return null
  const set = new Set(sections.map(Number).filter(n => Number.isFinite(n) && n > 0))
  return set.size ? set : null
}

/** 粗略字数（中文按字、英文按词） */
export function countWords(text: string): number {
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const latin = (text.match(/[A-Za-z0-9_]+/g) || []).length
  return cjk + latin
}

/** 从纯文本里抽标题（首个非空行，去掉 markdown 记号） */
export function guessTitle(text: string, fallback: string): string {
  for (const line of text.split('\n')) {
    const t = line.replace(/^[#>\s*-]+/, '').trim()
    if (t.length >= 2) return t.slice(0, 80)
  }
  return fallback
}
