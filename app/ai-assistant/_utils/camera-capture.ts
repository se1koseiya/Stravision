// AI Assistant — 摄像头抓帧工具（纯浏览器端，无 React 依赖）
//
// 设计要点（针对历史 bug 的修复）：
//  1. 整个抓帧流程只使用 **一个** setInterval，所有超时都通过时间戳在轮询内判定，
//     不再存在「20s 硬超时」与「6s 截图延迟」两个互不知情的定时器互相竞态的问题。
//  2. 画面就绪后用 **亮度采样** 判定黑屏，替代原先固定盲等 6 秒的做法。
//  3. 监听 video 的 error 事件，流挂了立即失败，不再干等满超时。
//  4. 支持 shouldAbort 中途取消，所有定时器在 settle 后必定清理。
//  5. 跨域流（无 CORS 头）会在 toDataURL 抛 SecurityError，单独识别为 TAINTED_CANVAS。

/**
 * 视觉巡检播放器挂载的 <video> 元素 id。
 * 全站统一使用一个 id：同一时刻只会有一路巡检在跑，
 * 复用同一个 id 也能避免旧元素残留导致抓帧抓到上一个摄像头。
 */
export const VISION_CAMERA_ELEMENT_ID = "ai-vision-camera"

/** 抓帧错误码 */
export type CaptureErrorCode =
  | "ABORTED"
  | "ELEMENT_NOT_FOUND"
  | "STREAM_ERROR"
  | "TIMEOUT"
  | "BLACK_FRAME"
  | "TAINTED_CANVAS"
  | "CANVAS_FAILED"

export class CameraCaptureError extends Error {
  readonly code: CaptureErrorCode

  constructor(code: CaptureErrorCode, message: string) {
    super(message)
    this.name = "CameraCaptureError"
    this.code = code
  }
}

/** 抓帧进度阶段 */
export type CaptureStage =
  | "waiting-mount"
  | "loading"
  | "settling"
  | "captured"
  | "retrying"

export interface CaptureFrameOptions {
  /** 等待 <video> 元素挂载到 DOM 的宽限时间 */
  mountTimeoutMs?: number
  /** 等待画面可解码的总超时（自调用开始计时） */
  loadTimeoutMs?: number
  /** 画面解码后，等待画面稳定/非黑屏的最长时间 */
  settleTimeoutMs?: number
  /** 画面稳定后的最短保持时间，避免刚解码就抓到首帧黑屏 */
  minSettleMs?: number
  /** 判定为「无信号画面」的平均亮度阈值（0-255），低于此值且几乎无细节则视为黑屏 */
  blackFrameLuma?: number
  /** 判定为「无信号画面」的亮度标准差阈值，低于此值说明画面无细节 */
  blackFrameStdDev?: number
  /** 连续多少次采样为正常画面才判定稳定 */
  stableSamples?: number
  /** 采样间隔 */
  sampleIntervalMs?: number
  /** JPEG 编码质量 */
  quality?: number
  /** 输出图片最大宽度，超过则等比缩小以控制 base64 体积 */
  maxWidth?: number
  /** base64 体积上限，超出则自动降质重编码 */
  maxBytes?: number
  /** 失败重试次数（不含首次） */
  retries?: number
  /** 重试退避基数 */
  retryDelayMs?: number
  /** 返回 true 时立即中止抓帧 */
  shouldAbort?: () => boolean
  /** 进度回调 */
  onProgress?: (stage: CaptureStage, detail?: string) => void
}

export interface CaptureFrameResult {
  /** JPEG base64 data URL */
  dataUrl: string
  width: number
  height: number
  /** 最终帧的平均亮度，便于排查黑屏 */
  luma: number
  /** 整个抓帧耗时 */
  waitedMs: number
  /** 实际尝试次数 */
  attempts: number
}

interface FrameSample {
  mean: number
  stddev: number
}

// 不可重试的错误：重试不会改变结果
const NON_RETRYABLE: ReadonlySet<CaptureErrorCode> = new Set<CaptureErrorCode>([
  "ABORTED",
  "ELEMENT_NOT_FOUND",
  "TAINTED_CANVAS",
])

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/**
 * 把数据库里配置的原始摄像头地址转成浏览器可播放的地址。
 * 逻辑与 Monitor 页面保持一致。
 */
export function getPlayableUrl(rawUrl: string): string {
  const url = (rawUrl || "").trim()
  if (!url) return ""

  // 已经是代理地址，直接返回
  if (url.includes("/api/stream-proxy") || url.includes("/api/stream-rtmp")) return url

  // RTMP → 走服务端 FFmpeg 转封装代理
  if (url.startsWith("rtmp://") || url.startsWith("rtmps://")) {
    return `/api/stream-rtmp?url=${encodeURIComponent(url)}`
  }

  // 厂商播放器地址：从 query 中还原真实视频地址
  if (/player\.xstrive\.com\/video\/live/i.test(url)) {
    const safeDecode = (value: string) => {
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    }

    // videoUrl 参数值本身可能未编码，从而包含 & 导致被 URL 解析截断，
    // 这里做一次宽松提取，取到尽可能完整的地址。
    const extractVideoUrlLoosely = (playerUrl: string) => {
      const qIndex = playerUrl.indexOf("?")
      if (qIndex < 0) return ""
      const query = playerUrl.slice(qIndex + 1)
      const lower = query.toLowerCase()
      let start = lower.indexOf("videourl=")
      while (start !== -1 && start > 0 && query[start - 1] !== "&") {
        start = lower.indexOf("videourl=", start + 1)
      }
      if (start === -1) return ""
      const valueStart = start + "videourl=".length
      const after = query.slice(valueStart)
      const parts = after.split("&")
      const stopKeys = new Set([
        "islive",
        "ismute",
        "aspect",
        "lang",
        "autoplay",
        "from",
        "player",
        "t",
        "ts",
      ])
      const videoParts: string[] = []
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        const eq = p.indexOf("=")
        const key = eq >= 0 ? p.slice(0, eq).toLowerCase() : ""
        if (i > 0 && key && stopKeys.has(key)) break
        videoParts.push(p)
      }
      return videoParts.join("&")
    }

    let picked = ""
    try {
      const u = new URL(url)
      const videoUrl = u.searchParams.get("videoUrl") ?? ""
      const loose = extractVideoUrlLoosely(url)
      picked = loose.length > videoUrl.length ? loose : videoUrl
    } catch {
      picked = extractVideoUrlLoosely(url)
    }
    if (!picked) return ""
    // 统一走同源代理，避免跨域导致 canvas 被污染而无法截图
    return `/api/stream-proxy?url=${encodeURIComponent(safeDecode(picked))}`
  }

  try {
    const u = new URL(url)
    if (u.protocol === "http:" || u.protocol === "https:") {
      return `/api/stream-proxy?url=${encodeURIComponent(url)}`
    }
  } catch {
    /* 非绝对 URL，走兜底 */
  }

  return url
}

function describeMediaError(err: MediaError | null): string {
  if (!err) return "视频流加载失败"
  switch (err.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return "视频加载被中止"
    case MediaError.MEDIA_ERR_NETWORK:
      return "视频流网络错误，无法拉取数据"
    case MediaError.MEDIA_ERR_DECODE:
      return "视频流解码失败，可能是编码格式不受支持"
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "视频源不可用或格式不受支持（摄像头可能离线）"
    default:
      return err.message || "视频流加载失败"
  }
}

/** 采样一帧的亮度均值与标准差，用于黑屏检测。跨域污染时返回 null。 */
function sampleFrame(video: HTMLVideoElement, w = 64, h = 36): FrameSample | null {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  try {
    ctx.drawImage(video, 0, 0, w, h)
    const data = ctx.getImageData(0, 0, w, h).data
    let sum = 0
    let sumSq = 0
    const n = w * h
    for (let i = 0; i < data.length; i += 4) {
      const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      sum += luma
      sumSq += luma * luma
    }
    const mean = sum / n
    const variance = Math.max(0, sumSq / n - mean * mean)
    return { mean, stddev: Math.sqrt(variance) }
  } catch {
    // SecurityError：canvas 被跨域流污染，无法读取像素
    return null
  }
}

/** 单次抓帧尝试。整个流程只有一个轮询定时器，超时通过时间戳判定。 */
function captureFrameOnce(
  elementId: string,
  options: Required<
    Pick<
      CaptureFrameOptions,
      | "mountTimeoutMs"
      | "loadTimeoutMs"
      | "settleTimeoutMs"
      | "minSettleMs"
      | "blackFrameLuma"
      | "blackFrameStdDev"
      | "stableSamples"
      | "sampleIntervalMs"
      | "quality"
      | "maxWidth"
      | "maxBytes"
    >
  > & Pick<CaptureFrameOptions, "shouldAbort" | "onProgress">
): Promise<Omit<CaptureFrameResult, "attempts">> {
  const {
    mountTimeoutMs,
    loadTimeoutMs,
    settleTimeoutMs,
    minSettleMs,
    blackFrameLuma,
    blackFrameStdDev,
    stableSamples,
    sampleIntervalMs,
    quality,
    maxWidth,
    maxBytes,
    shouldAbort,
    onProgress,
  } = options

  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    let settled = false
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let video: HTMLVideoElement | null = null
    let phase: "mount" | "decode" | "settle" = "mount"
    let settleStartedAt = 0
    let goodSamples = 0
    let lastSample: FrameSample | null = null
    let lastGood: FrameSample | null = null
    let sawTaintedSample = false

    const isBlank = (s: FrameSample | null) =>
      !!s && s.mean < blackFrameLuma && s.stddev < blackFrameStdDev

    const cleanup = () => {
      if (pollTimer !== null) {
        clearInterval(pollTimer)
        pollTimer = null
      }
      if (video) {
        video.removeEventListener("error", onVideoError)
        video.removeEventListener("stalled", onVideoStalled)
      }
    }

    const fail = (code: CaptureErrorCode, message: string) => {
      if (settled) return
      settled = true
      cleanup()
      reject(new CameraCaptureError(code, message))
    }

    const succeed = (result: Omit<CaptureFrameResult, "attempts">) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(result)
    }

    function onVideoError() {
      fail("STREAM_ERROR", describeMediaError(video?.error ?? null))
    }
    // stalled 只作为提示，不直接失败——播放器自带重连逻辑
    function onVideoStalled() {
      onProgress?.("loading", "视频流卡顿，等待恢复...")
    }

    const capture = () => {
      const v = video
      if (!v) {
        fail("ELEMENT_NOT_FOUND", `视频元素 #${elementId} 已卸载`)
        return
      }
      try {
        const srcW = v.videoWidth
        const srcH = v.videoHeight
        if (!srcW || !srcH) {
          fail("TIMEOUT", "视频尺寸无效，画面尚未解码")
          return
        }

        const scale = Math.min(1, maxWidth / srcW)
        const w = Math.max(1, Math.round(srcW * scale))
        const h = Math.max(1, Math.round(srcH * scale))

        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          fail("CANVAS_FAILED", "无法创建 Canvas 上下文")
          return
        }
        ctx.drawImage(v, 0, 0, w, h)

        let dataUrl = ""
        let q = quality
        for (let i = 0; i < 4; i++) {
          try {
            dataUrl = canvas.toDataURL("image/jpeg", q)
          } catch {
            fail(
              "TAINTED_CANVAS",
              "视频流跨域且缺少 CORS 响应头，浏览器禁止截图。请确认流地址已通过 /api/stream-proxy 代理。"
            )
            return
          }
          if (dataUrl.length <= maxBytes) break
          q = Math.max(0.4, q - 0.15)
        }

        if (!dataUrl.startsWith("data:image/jpeg")) {
          fail("CANVAS_FAILED", "截图编码失败")
          return
        }

        onProgress?.("captured", `已捕获 ${w}×${h} 画面`)
        succeed({
          dataUrl,
          width: w,
          height: h,
          luma: lastSample?.mean ?? 0,
          waitedMs: Date.now() - startedAt,
        })
      } catch (err) {
        fail("CANVAS_FAILED", err instanceof Error ? err.message : String(err))
      }
    }

    const poll = () => {
      if (settled) return
      const elapsed = Date.now() - startedAt

      // 1. 中止检查（用户点了停止）
      if (shouldAbort?.()) {
        fail("ABORTED", "巡检已中止")
        return
      }

      // 2. 等待 video 元素挂载
      if (phase === "mount") {
        video = document.getElementById(elementId) as HTMLVideoElement | null
        if (!video) {
          if (elapsed > mountTimeoutMs) {
            fail("ELEMENT_NOT_FOUND", `未找到视频元素 #${elementId}`)
          } else {
            onProgress?.("waiting-mount", "等待播放器挂载...")
          }
          return
        }
        video.addEventListener("error", onVideoError)
        video.addEventListener("stalled", onVideoStalled)
        phase = "decode"
      }

      // 3. 等待画面可解码
      if (phase === "decode") {
        if (video?.error) {
          fail("STREAM_ERROR", describeMediaError(video.error))
          return
        }
        if (elapsed > loadTimeoutMs) {
          fail(
            "TIMEOUT",
            `摄像头画面加载超时（${Math.round(loadTimeoutMs / 1000)}s），请检查摄像头是否在线、流地址是否正确`
          )
          return
        }
        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          phase = "settle"
          settleStartedAt = Date.now()
          onProgress?.("settling", "画面已解码，等待画面稳定...")
        } else {
          onProgress?.(
            "loading",
            `正在缓冲画面数据（readyState=${video?.readyState ?? 0}）`
          )
          return
        }
      }

      // 4. 等待画面稳定且非黑屏
      if (phase === "settle") {
        if (video?.error) {
          fail("STREAM_ERROR", describeMediaError(video.error))
          return
        }

        const sample = sampleFrame(video as HTMLVideoElement)
        if (sample) {
          lastSample = sample
          if (!isBlank(sample)) {
            goodSamples += 1
            lastGood = sample
          } else {
            goodSamples = 0
          }
        } else {
          sawTaintedSample = true
          // 读不到像素（跨域污染）时退化为按时间判定，不再做黑屏检测
          goodSamples += 1
        }

        const settleElapsed = Date.now() - settleStartedAt

        if (goodSamples >= stableSamples && settleElapsed >= minSettleMs) {
          capture()
          return
        }

        if (settleElapsed > settleTimeoutMs) {
          // 超时了但只要曾经拿到过可用画面就做兜底交付，避免反复失败
          if (lastGood) {
            capture()
            return
          }
          if (isBlank(lastSample)) {
            fail("BLACK_FRAME", "摄像头画面持续为黑屏，可能镜头被遮挡或摄像头无信号")
            return
          }
          fail("TIMEOUT", `画面未在 ${Math.round(settleTimeoutMs / 1000)}s 内稳定`)
          return
        }

        onProgress?.(
          "settling",
          sawTaintedSample
            ? "画面稳定中..."
            : `画面稳定中（亮度 ${lastSample ? lastSample.mean.toFixed(0) : "-"}）`
        )
      }
    }

    pollTimer = setInterval(poll, sampleIntervalMs)
    poll()
  })
}

/**
 * 从指定的 <video> 元素抓取一帧。
 * 内部自带重试；所有失败都会抛出 CameraCaptureError。
 */
export async function captureVideoFrame(
  elementId: string,
  options: CaptureFrameOptions = {}
): Promise<CaptureFrameResult> {
  const {
    mountTimeoutMs = 10_000,
    loadTimeoutMs = 20_000,
    settleTimeoutMs = 8_000,
    minSettleMs = 1_000,
    blackFrameLuma = 6,
    blackFrameStdDev = 3,
    stableSamples = 3,
    sampleIntervalMs = 250,
    quality = 0.85,
    maxWidth = 1280,
    maxBytes = 4 * 1024 * 1024,
    retries = 1,
    retryDelayMs = 800,
    shouldAbort,
    onProgress,
  } = options

  const onceOptions = {
    mountTimeoutMs,
    loadTimeoutMs,
    settleTimeoutMs,
    minSettleMs,
    blackFrameLuma,
    blackFrameStdDev,
    stableSamples,
    sampleIntervalMs,
    quality,
    maxWidth,
    maxBytes,
    shouldAbort,
    onProgress,
  }

  let lastError: unknown = null

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    if (shouldAbort?.()) {
      throw new CameraCaptureError("ABORTED", "巡检已中止")
    }
    if (attempt > 1) {
      onProgress?.("retrying", `第 ${attempt - 1} 次重试抓帧...`)
      await sleep(retryDelayMs * (attempt - 1))
    }
    try {
      const result = await captureFrameOnce(elementId, onceOptions)
      return { ...result, attempts: attempt }
    } catch (err) {
      lastError = err
      if (err instanceof CameraCaptureError && NON_RETRYABLE.has(err.code)) throw err
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new CameraCaptureError("TIMEOUT", "摄像头抓帧失败")
}
