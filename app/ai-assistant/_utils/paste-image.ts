/**
 * sender「粘贴 / 选择图片」的统一处理
 *
 * ## 为什么必须压缩
 * 直接把剪贴板里的原图转成 base64 塞进 `image_url`，Windows 上全屏截图常是
 * 2560×1440 的 PNG，单个 data URL 能到 3–8 MB —— 请求体直接被打爆（上游 413 /
 * 网关超时），而 base64 本身还比二进制多占约 33%。
 * 所以统一走「等比缩到最长边 1600 → JPEG 降质到体积达标」，与 `_utils/camera-capture.ts`
 * 里摄像头截图的处理口径保持一致（那边是 maxWidth/maxBytes 双阈值 + 循环降质）。
 *
 * ## 为什么输出 JPEG 而不是 PNG
 * 病虫害识别这类场景要的是**颜色与纹理**，不是无损；JPEG q0.82 在 1600px 下
 * 肉眼无损，体积通常只有原 PNG 的 1/10。透明 PNG 会先铺白底（否则压出黑块）。
 */

/** sender 单条消息最多挂几张图（超出要提示，而不是静默丢弃） */
export const MAX_SENDER_IMAGES = 6

/** 最长边上限：超过则等比缩小 */
const MAX_EDGE = 1600

/** data URL 字符串长度上限（注意是字符串长度，不是解码后的字节数） */
const MAX_DATA_URL_CHARS = 2_000_000

export interface PreparedImage {
  name: string
  type: string
  dataUrl: string
  width: number
  height: number
}

export function isImageFile(file: File): boolean {
  return (file.type || "").toLowerCase().startsWith("image/")
}

/**
 * 从剪贴板事件里挑出文件型条目（只认 `kind === "file"`）。
 * 纯文本粘贴会返回空数组 —— 调用方据此**不** preventDefault，
 * 让浏览器照常把文字插进输入框。
 */
export function pickFilesFromClipboard(data: DataTransfer | null | undefined): File[] {
  if (!data || !data.items || data.items.length === 0) return []
  const out: File[] = []
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]
    if (item.kind !== "file") continue
    const f = item.getAsFile()
    if (f) out.push(f)
  }
  return out
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("IMAGE_DECODE_FAILED"))
    }
    img.src = url
  })
}

/**
 * 图片 → 受控体积的 JPEG data URL。
 *
 * @throws 解码失败（不是图片 / 文件损坏）或 canvas 不可用时抛错，
 *         由调用方决定降级（本项目：跳过这一张，其余照常加）。
 */
export async function prepareImageFile(file: File): Promise<PreparedImage> {
  const img = await loadImage(file)
  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height
  if (!srcW || !srcH) throw new Error("IMAGE_DECODE_FAILED")

  const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH))
  const w = Math.max(1, Math.round(srcW * scale))
  const h = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("CANVAS_FAILED")

  // JPEG 没有 alpha 通道：先铺白底，否则透明区域会被压成黑块
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)

  let q = 0.82
  let dataUrl = ""
  for (let i = 0; i < 4; i++) {
    dataUrl = canvas.toDataURL("image/jpeg", q)
    if (dataUrl.length <= MAX_DATA_URL_CHARS) break
    q = Math.max(0.4, q - 0.15)
  }
  if (!dataUrl.startsWith("data:image/")) throw new Error("ENCODE_FAILED")

  const stem = (file.name || "").replace(/\.[^.]+$/, "")
  return {
    name: `${stem || "pasted"}.jpg`,
    type: "image/jpeg",
    dataUrl,
    width: w,
    height: h,
  }
}

/** 非图片附件（文档等）不压缩，直接读成 data URL */
export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "")
    reader.onerror = () => reject(new Error("READ_FAILED"))
    reader.readAsDataURL(file)
  })
}

/** 人类可读的体积（data URL 长度 → 近似 KB） */
export function dataUrlKb(dataUrl: string): number {
  // base64：4 个字符 ≈ 3 个字节
  return Math.round((dataUrl.length * 3) / 4 / 1024)
}
