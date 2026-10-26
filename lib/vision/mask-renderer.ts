/**
 * 病害遮罩图渲染 —— 在**用户自己那张照片**上，按病灶的**真实像素轮廓**画出遮罩
 *
 * ## 为什么要有它（和 `components/ai/detection-overlay.tsx` 的分工）
 * `DetectionOverlay` 是**DOM 叠层**：框是浮在 `<img>` 上的元素，随容器缩放自动贴合，
 * 交互（悬停/选中）很自然 —— 但它**不是一张图**，用户没法保存、没法转发、没法贴进报告。
 * 这里补上后者：canvas 合成一张真正带遮罩的成品图。
 *
 * ## 为什么不能只画框（v1 的教训）
 * v1 直接拿 VLM 给的矩形框「压暗 → 擦亮」。问题是 VLM 的 grounding 只是**粗定位**：
 * 它给的是"病灶大概在这一片"，框往往比病斑大一圈、甚至偏移。
 * 用户看到的就是"一个方框套在叶子上" —— 既不精准，也不像"遮罩"。
 *
 * ## v2：像素级病灶分割
 * 流程（全部在浏览器 canvas 上做，无额外模型依赖）：
 *   1. 以 VLM 框为**搜索窗口**（外扩一点），把窗口内的像素读出来；
 *   2. 按颜色把像素分成「健康组织 / 病灶」两类 —— 健康叶片是绿色主导
 *      （色相 70~170°、有饱和度），病斑则是褐色坏死、灰白霉层、或极暗焦枯；
 *   3. 形态学清理：多数表决去噪 ×2 → 只保留最大连通域（去掉零星误检）；
 *   4. 填洞：病灶内部常被反光/高光打断，从窗口边界洪泛填充，填掉封闭空洞；
 *   5. 得到**逐像素的遮罩**，据此压暗背景、给病灶上色、沿真实轮廓描边。
 *
 * 若分割不成立（窗口里几乎没有健康绿色 = 框到土/阴影上了；或分割出的区域
 * 几乎覆盖整个窗口 = 阈值失效），**自动退回矩形框渲染**，绝不让用户空手而归。
 *
 * ## 坐标
 * 检测框一律是**归一化**的（0~1，见 `lib/types/vision-diagnosis.ts`），
 * 因此这里按图片真实像素尺寸换算即可，与渲染容器大小无关。
 */

import { getSeverityMeta, normalizeBBox, type Detection } from "@/lib/types/vision-diagnosis"

export interface MaskRenderOptions {
  /** 是否压暗非病灶区域（遮罩模式）。关掉就是纯粹的"描框图" */
  dim?: boolean
  /** 压暗强度 0~1 */
  dimAlpha?: number
  /** 是否绘制标签胶囊（病名 + 置信度） */
  labels?: boolean
  /** 是否绘制序号 */
  badges?: boolean
  /** 输出最长边上限（超过等比缩小，控制 data URL 体积） */
  maxEdge?: number
  /** JPEG 质量 0~1 */
  quality?: number
  /**
   * 是否做像素级分割细化（默认开）。
   * 关掉 = v1 行为（只按矩形框压暗），用于对比排查。
   */
  refine?: boolean
  /**
   * 每条检测的分割统计 —— 给验收探针用（判断"到底是像素级遮罩还是矩形框"）。
   * 生产代码不传即可。
   */
  onStats?: (stats: MaskRenderStats[]) => void
}

/** 单条检测的分割结果统计 */
export interface MaskRenderStats {
  id: string
  label: string
  /** 是否成功做了像素级分割（false = 退化成矩形框） */
  refined: boolean
  /** 输入矩形框面积（输出坐标系像素²） */
  rectArea: number
  /** 分割出的像素数 */
  maskArea: number
  /** 分割结果的紧致包围盒面积 */
  maskBBoxArea: number
  /**
   * 遮罩像素占其紧致包围盒的比例。
   * 矩形框必然是 1.0；真实病灶轮廓一般 0.5~0.85 —— 这个值远小于 1
   * 就说明"确实是按轮廓画的，不是拿方框糊上去"。
   */
  fillRatio: number
  /** 输出图片尺寸 */
  imageWidth: number
  imageHeight: number
}

/** 描边宽度按图片尺寸自适应：大图用粗线，缩略图不至于糊成一团 */
function strokeWidthFor(edge: number): number {
  return Math.max(2, Math.round(edge / 320))
}

/** 圆角矩形路径（CanvasRenderingContext2D.roundRect 在旧 Safari 上缺席，自己兜） */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    // data URL / 同源图不需要 CORS；远端图尽量带上，否则 canvas 会被污染导致导出失败
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"))
    img.src = src
  })
}

// ---------------------------------------------------------------------------
// 颜色分类：健康组织 vs 病灶
// ---------------------------------------------------------------------------

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const mx = Math.max(rn, gn, bn)
  const mn = Math.min(rn, gn, bn)
  const d = mx - mn
  let h = 0
  if (d !== 0) {
    if (mx === rn) h = 60 * (((gn - bn) / d) % 6)
    else if (mx === gn) h = 60 * ((bn - rn) / d + 2)
    else h = 60 * ((rn - gn) / d + 4)
  }
  if (h < 0) h += 360
  const s = mx === 0 ? 0 : d / mx
  return { h, s, v: mx }
}

/** 健康叶片组织：绿色主导、有一定饱和度、不是死黑 */
function isHealthyGreen(r: number, g: number, b: number): boolean {
  const { h, s, v } = rgbToHsv(r, g, b)
  if (v < 0.18) return false
  // 绿色相带较宽（60~180°），容忍偏黄的新叶与偏青的老叶
  if (h < 60 || h > 185) return false
  if (s < 0.14) return false
  // 绿色通道必须是主导
  return g >= r && g >= b
}

/**
 * 病灶像素判定。
 *
 * 三类典型表现（覆盖绝大多数草莓病害外观）：
 *   - 褐色坏死斑 / 水渍状暗晕：色相 5~55°，中低明度
 *   - 灰白霉层（灰霉、白粉）：低饱和度 + 中高明度
 *   - 焦枯 / 黑斑：极低明度
 * 再加上一条兜底：明显「非绿」且不是高饱和的异物色。
 */
function isLesionPixel(r: number, g: number, b: number): boolean {
  if (isHealthyGreen(r, g, b)) return false
  const { h, s, v } = rgbToHsv(r, g, b)

  // 褐色 / 黄褐 / 暗红坏死
  if (h >= 0 && h <= 58 && v >= 0.16 && v <= 0.92 && s >= 0.12) return true
  // 灰白霉层 / 粉状物
  if (s <= 0.22 && v >= 0.52) return true
  // 极暗焦枯
  if (v < 0.2) return true
  // 兜底：非绿且有色彩倾向（偏紫/偏青的病斑）
  if (v >= 0.2 && v <= 0.85 && s >= 0.18 && h > 185 && h <= 330) return true

  return false
}

// ---------------------------------------------------------------------------
// 分割
// ---------------------------------------------------------------------------

interface RegionMask {
  /** 窗口左上角在整图上的像素坐标 */
  ox: number
  oy: number
  /** 窗口尺寸 */
  ww: number
  wh: number
  /** 逐像素 0/1，长度 ww*wh */
  mask: Uint8Array
  /** 分割出的紧致包围盒（窗口内相对坐标） */
  bounds: { x0: number; y0: number; x1: number; y1: number }
}

/** 多数表决去噪：一个像素只有在 8 邻域里至少有 minNeighbors 个同伴时才保留 */
function majorityFilter(mask: Uint8Array, w: number, h: number, minNeighbors = 4): Uint8Array {
  const out = new Uint8Array(mask.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!mask[i]) continue
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          if (mask[ny * w + nx]) n++
        }
      }
      if (n >= minNeighbors) out[i] = 1
    }
  }
  return out
}

/** 只保留最大连通域（8 连通，迭代式洪泛，避免递归爆栈） */
function keepLargestComponent(mask: Uint8Array, w: number, h: number): { mask: Uint8Array; area: number } {
  const label = new Int32Array(mask.length).fill(0)
  const stack = new Int32Array(mask.length)
  let bestId = 0
  let bestArea = 0
  let cur = 0

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || label[start]) continue
    cur++
    let sp = 0
    stack[sp++] = start
    label[start] = cur
    let area = 0

    while (sp > 0) {
      const p = stack[--sp]
      area++
      const px = p % w
      const py = (p - px) / w
      for (let dy = -1; dy <= 1; dy++) {
        const ny = py + dy
        if (ny < 0 || ny >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = px + dx
          if (nx < 0 || nx >= w) continue
          const q = ny * w + nx
          if (mask[q] && !label[q]) {
            label[q] = cur
            stack[sp++] = q
          }
        }
      }
    }

    if (area > bestArea) {
      bestArea = area
      bestId = cur
    }
  }

  const out = new Uint8Array(mask.length)
  if (bestId > 0) {
    for (let i = 0; i < mask.length; i++) if (label[i] === bestId) out[i] = 1
  }
  return { mask: out, area: bestArea }
}

/** 填洞：从窗口四边洪泛「非病灶」区域，没被淹到的就是封闭空洞 */
function fillHoles(mask: Uint8Array, w: number, h: number): Uint8Array {
  const outside = new Uint8Array(mask.length)
  const stack: number[] = []

  const push = (x: number, y: number) => {
    const i = y * w + x
    if (mask[i] || outside[i]) return
    outside[i] = 1
    stack.push(i)
  }
  for (let x = 0; x < w; x++) {
    push(x, 0)
    push(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    push(0, y)
    push(w - 1, y)
  }
  while (stack.length) {
    const p = stack.pop() as number
    const px = p % w
    const py = (p - px) / w
    for (let dy = -1; dy <= 1; dy++) {
      const ny = py + dy
      if (ny < 0 || ny >= h) continue
      for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx
        if (nx < 0 || nx >= w) continue
        const q = ny * w + nx
        if (!mask[q] && !outside[q]) {
          outside[q] = 1
          stack.push(q)
        }
      }
    }
  }

  const out = new Uint8Array(mask.length)
  for (let i = 0; i < mask.length; i++) out[i] = mask[i] || !outside[i] ? 1 : 0
  return out
}

/**
 * 在给定搜索窗口内分割出病灶像素。
 *
 * @returns 成功返回 RegionMask；分割不成立返回 null（调用方退回矩形框渲染）
 */
function segmentWindow(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  win: { x: number; y: number; w: number; h: number },
): RegionMask | null {
  const x0 = Math.max(0, Math.floor(win.x))
  const y0 = Math.max(0, Math.floor(win.y))
  const x1 = Math.min(imgW, Math.ceil(win.x + win.w))
  const y1 = Math.min(imgH, Math.ceil(win.y + win.h))
  const ww = x1 - x0
  const wh = y1 - y0
  if (ww < 4 || wh < 4) return null

  const raw = new Uint8Array(ww * wh)
  let green = 0
  for (let y = 0; y < wh; y++) {
    for (let x = 0; x < ww; x++) {
      const si = ((y0 + y) * imgW + (x0 + x)) * 4
      const r = data[si]
      const g = data[si + 1]
      const b = data[si + 2]
      if (isHealthyGreen(r, g, b)) {
        green++
        continue
      }
      if (isLesionPixel(r, g, b)) raw[y * ww + x] = 1
    }
  }

  const total = ww * wh
  const greenRatio = green / total

  // 窗口里几乎没有健康绿色 → 大概率框到土/背景/阴影上了，不要硬分割
  if (greenRatio < 0.1) return null

  let mask = majorityFilter(raw, ww, wh, 4)
  mask = majorityFilter(mask, ww, wh, 4)

  const largest = keepLargestComponent(mask, ww, wh)
  // 病灶区域过小（噪声）或过大（阈值失效，整窗都判成了病灶）都不算成功
  const areaRatio = largest.area / total
  if (areaRatio < 0.012 || areaRatio > 0.75) return null

  mask = fillHoles(largest.mask, ww, wh)

  // 重新算紧致包围盒
  let bx0 = ww
  let by0 = wh
  let bx1 = -1
  let by1 = -1
  for (let y = 0; y < wh; y++) {
    for (let x = 0; x < ww; x++) {
      if (!mask[y * ww + x]) continue
      if (x < bx0) bx0 = x
      if (y < by0) by0 = y
      if (x > bx1) bx1 = x
      if (y > by1) by1 = y
    }
  }
  if (bx1 < 0) return null

  return { ox: x0, oy: y0, ww, wh, mask, bounds: { x0: bx0, y0: by0, x1: bx1, y1: by1 } }
}

// ---------------------------------------------------------------------------
// 主入口
// ---------------------------------------------------------------------------

interface RenderBox {
  detection: Detection
  /** VLM 原始框（像素，输出坐标系） */
  x: number
  y: number
  w: number
  h: number
  color: string
  /** 像素级分割结果（像素坐标 = 原图坐标；渲染时再乘缩放） */
  region?: RegionMask
}

/**
 * 在源图上绘制病害遮罩，返回 JPEG data URL。
 *
 * @throws 图片加载失败或 canvas 不可用/被污染时抛错，由调用方降级（本项目：回退到叠层展示）
 */
export async function renderDiagnosisMask(
  src: string,
  detections: Detection[],
  options: MaskRenderOptions = {},
): Promise<string> {
  const {
    dim = true,
    dimAlpha = 0.5,
    labels = true,
    badges = true,
    maxEdge = 1600,
    quality = 0.9,
    refine = true,
    onStats,
  } = options

  const img = await loadImage(src)
  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height
  if (!srcW || !srcH) throw new Error("IMAGE_EMPTY")

  // ── 输出 / 工作分辨率 ──
  // 分割与渲染都在**同一个**坐标系里做，避免"原图坐标 ↔ 输出坐标"两套换算出错。
  // 上限 maxEdge（默认 1600）：手机原图动辄 4000px，按原尺寸跑逐像素连通域会卡住主线程，
  // 而 1600px 对"圈出病斑"这个精度要求来说已经绰绰有余（1px 误差 ≈ 画面 0.06%）。
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH))
  const w = Math.max(1, Math.round(srcW * scale))
  const h = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("CANVAS_FAILED")

  ctx.drawImage(img, 0, 0, w, h)

  const boxes: RenderBox[] = detections
    .map((d) => {
      const b = normalizeBBox(d.bbox)
      if (!b) return null
      return {
        detection: d,
        x: b.x * w,
        y: b.y * h,
        w: b.w * w,
        h: b.h * h,
        color: d.severity ? getSeverityMeta(d.severity).color : "#34D399",
      } as RenderBox
    })
    .filter((v): v is RenderBox => v !== null)

  // ── 1. 像素级分割：在工作分辨率上读一次像素，所有框共用 ──
  if (refine && boxes.length > 0) {
    let pixels: ImageData | null = null
    try {
      pixels = ctx.getImageData(0, 0, w, h)
    } catch {
      // canvas 被跨域图片污染 → 放弃细化，走矩形框
      pixels = null
    }
    if (pixels) {
      for (const bx of boxes) {
        // 搜索窗口 = VLM 框外扩 18%（至少 6px），给分割留出余量
        const padX = Math.max(6, bx.w * 0.18)
        const padY = Math.max(6, bx.h * 0.18)
        const region = segmentWindow(pixels.data, w, h, {
          x: bx.x - padX,
          y: bx.y - padY,
          w: bx.w + padX * 2,
          h: bx.h + padY * 2,
        })
        if (region) bx.region = region
      }
    }
  }

  if (boxes.length === 0) {
    return canvas.toDataURL("image/jpeg", quality)
  }

  /** 把某个框的分割结果画进一张「白/透明」画布（尺寸 = 输出画布），用于擦亮、上色、描边 */
  const maskLayer = document.createElement("canvas")
  maskLayer.width = w
  maskLayer.height = h
  const mctx = maskLayer.getContext("2d")
  if (!mctx) throw new Error("CANVAS_FAILED")

  const drawRegionToMask = (bx: RenderBox) => {
    if (!bx.region) return false
    const r = bx.region
    const tile = document.createElement("canvas")
    tile.width = r.ww
    tile.height = r.wh
    const tctx = tile.getContext("2d")
    if (!tctx) return false
    const id = tctx.createImageData(r.ww, r.wh)
    for (let i = 0; i < r.mask.length; i++) {
      if (!r.mask[i]) continue
      const p = i * 4
      id.data[p] = 255
      id.data[p + 1] = 255
      id.data[p + 2] = 255
      id.data[p + 3] = 255
    }
    tctx.putImageData(id, 0, 0)
    mctx.drawImage(tile, 0, 0, r.ww, r.wh, r.ox, r.oy, r.ww, r.wh)
    return true
  }

  const refinedCount = boxes.filter((bx) => bx.region).length

  if (onStats) {
    const stats: MaskRenderStats[] = boxes.map((bx) => {
      const rectArea = bx.w * bx.h
      const r = bx.region
      if (!r) {
        return {
          id: bx.detection.id,
          label: bx.detection.label,
          refined: false,
          rectArea,
          maskArea: rectArea,
          maskBBoxArea: rectArea,
          fillRatio: 1,
          imageWidth: w,
          imageHeight: h,
        }
      }
      let area = 0
      for (let i = 0; i < r.mask.length; i++) if (r.mask[i]) area++
      const bbW = r.bounds.x1 - r.bounds.x0 + 1
      const bbH = r.bounds.y1 - r.bounds.y0 + 1
      return {
        id: bx.detection.id,
        label: bx.detection.label,
        refined: true,
        rectArea,
        maskArea: area,
        maskBBoxArea: bbW * bbH,
        fillRatio: bbW * bbH > 0 ? area / (bbW * bbH) : 0,
        imageWidth: w,
        imageHeight: h,
      }
    })
    onStats(stats)
  }

  for (const bx of boxes) {
    if (!drawRegionToMask(bx)) {
      // 未成功分割 → 退化成矩形（仍然给用户一个可用的遮罩）
      mctx.fillStyle = "#fff"
      mctx.fillRect(bx.x, bx.y, bx.w, bx.h)
    }
  }

  // ── 3. 压暗背景：整幅盖一层暗色，再用 maskLayer 把病灶区域挖空 ──
  if (dim) {
    const dimLayer = document.createElement("canvas")
    dimLayer.width = w
    dimLayer.height = h
    const dctx = dimLayer.getContext("2d")
    if (dctx) {
      dctx.fillStyle = `rgba(0,0,0,${Math.min(Math.max(dimAlpha, 0), 0.9)})`
      dctx.fillRect(0, 0, w, h)
      dctx.globalCompositeOperation = "destination-out"
      dctx.drawImage(maskLayer, 0, 0)
      dctx.globalCompositeOperation = "source-over"
      ctx.drawImage(dimLayer, 0, 0)
    }
  }

  // ── 4. 病灶上色（半透明）+ 沿真实轮廓描边 ──
  const sw = strokeWidthFor(Math.max(w, h))

  for (const bx of boxes) {
    if (!bx.region) {
      // 矩形兜底：色块 + 方框
      ctx.save()
      ctx.fillStyle = `${bx.color}22`
      ctx.fillRect(bx.x, bx.y, bx.w, bx.h)
      ctx.strokeStyle = bx.color
      ctx.lineWidth = sw
      ctx.strokeRect(
        bx.x + sw / 2,
        bx.y + sw / 2,
        Math.max(1, bx.w - sw),
        Math.max(1, bx.h - sw),
      )
      ctx.restore()
    }
  }

  // 分割成功的一起上色：把 mask 剪出彩色版再贴上去（一次 drawImage，比逐像素快）
  const coloredIds = new Set(boxes.filter((b) => b.region).map((b) => b.detection.id))
  if (coloredIds.size > 0) {
    for (const bx of boxes) {
      if (!bx.region) continue
      const tint = document.createElement("canvas")
      tint.width = w
      tint.height = h
      const tctx = tint.getContext("2d")
      if (!tctx) continue
      tctx.fillStyle = `${bx.color}40`
      tctx.fillRect(0, 0, w, h)
      tctx.globalCompositeOperation = "destination-in"
      // 只保留这一个框的 mask：临时重建只含它的层
      const only = document.createElement("canvas")
      only.width = w
      only.height = h
      const octx = only.getContext("2d")
      if (!octx) continue
      const r = bx.region
      const tile = document.createElement("canvas")
      tile.width = r.ww
      tile.height = r.wh
      const tileCtx = tile.getContext("2d")
      if (!tileCtx) continue
      const id = tileCtx.createImageData(r.ww, r.wh)
      for (let i = 0; i < r.mask.length; i++) {
        if (!r.mask[i]) continue
        const p = i * 4
        id.data[p] = 255
        id.data[p + 1] = 255
        id.data[p + 2] = 255
        id.data[p + 3] = 255
      }
      tileCtx.putImageData(id, 0, 0)
      octx.drawImage(tile, 0, 0, r.ww, r.wh, r.ox, r.oy, r.ww, r.wh)
      tctx.drawImage(only, 0, 0)
      ctx.drawImage(tint, 0, 0)
    }
  }

  // 轮廓：在 mask 上做一次边界检测，用主色描出真实轮廓
  ctx.save()
  ctx.globalAlpha = 0.95
  const edgeStep = Math.max(2, Math.round(sw))
  for (const bx of boxes) {
    if (!bx.region) continue
    const r = bx.region
    ctx.fillStyle = bx.color
    for (let y = 0; y < r.wh; y++) {
      for (let x = 0; x < r.ww; x++) {
        if (!r.mask[y * r.ww + x]) continue
        const left = x === 0 || !r.mask[y * r.ww + (x - 1)]
        const right = x === r.ww - 1 || !r.mask[y * r.ww + (x + 1)]
        const up = y === 0 || !r.mask[(y - 1) * r.ww + x]
        const down = y === r.wh - 1 || !r.mask[(y + 1) * r.ww + x]
        if (!(left || right || up || down)) continue
        // 边界像素：跳过同等步长的取样点，避免逐像素画碎块（描边会更细腻但更慢）
        ctx.fillRect(
          r.ox + x - edgeStep / 2,
          r.oy + y - edgeStep / 2,
          edgeStep,
          edgeStep,
        )
      }
    }
  }
  ctx.restore()

  // ── 5. 标签 / 序号（字号按图缩放，小图也不会糊） ───────────────────
  const fontPx = Math.max(11, Math.round(Math.max(w, h) / 58))
  ctx.textBaseline = "middle"
  ctx.textAlign = "left"

  const anchors = boxes.map((bx) => {
    if (bx.region) {
      const r = bx.region
      return {
        bx,
        x: r.ox + r.bounds.x0,
        y: r.oy + r.bounds.y0,
        w: r.bounds.x1 - r.bounds.x0 + 1,
        h: r.bounds.y1 - r.bounds.y0 + 1,
      }
    }
    return { bx, x: bx.x, y: bx.y, w: bx.w, h: bx.h }
  })

  anchors.forEach((a, index) => {
    const { bx } = a
    const text = `${bx.detection.label} ${Math.round(bx.detection.confidence * 100)}%`

    if (labels) {
      ctx.save()
      ctx.font = `500 ${fontPx}px system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`
      const padX = fontPx * 0.5
      const boxH = fontPx * 1.75
      const tw = ctx.measureText(text).width
      const boxW = tw + padX * 2 + fontPx * 0.9
      // 标签优先贴在区域上方；贴不下（靠近顶边）就翻到区域内侧顶部
      let lx = a.x
      let ly = a.y - boxH - 2
      if (ly < 2) ly = a.y + 2
      if (lx + boxW > w) lx = Math.max(0, w - boxW)

      ctx.fillStyle = "rgba(9,9,11,0.88)"
      roundRectPath(ctx, lx, ly, boxW, boxH, fontPx * 0.4)
      ctx.fill()

      // 置信度色点
      ctx.fillStyle = bx.color
      ctx.beginPath()
      ctx.arc(lx + padX + fontPx * 0.22, ly + boxH / 2, fontPx * 0.22, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "#F4F4F5"
      ctx.fillText(text, lx + padX + fontPx * 0.62, ly + boxH / 2 + 0.5)
      ctx.restore()
    }

    if (badges) {
      ctx.save()
      const r = fontPx * 0.72
      const cx = a.x + r + 3
      const cy = a.y + r + 3
      ctx.fillStyle = bx.color
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#09090B"
      ctx.font = `700 ${Math.round(fontPx * 0.86)}px system-ui, sans-serif`
      ctx.textAlign = "center"
      ctx.fillText(String(index + 1), cx, cy + 0.5)
      ctx.restore()
    }
  })

  // 便于调用方判断"到底有没有真的做成像素级遮罩"
  ;(canvas as any).__refinedCount = refinedCount

  return canvas.toDataURL("image/jpeg", quality)
}

/** 给遮罩图一个稳定文件名（下载用） */
export function maskFileName(prefix = "病害标注"): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.jpg`
}
