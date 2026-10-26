/**
 * 屏幕截图 —— 全站唯一实现源
 *
 * 这里有两套互补的能力，别混用：
 *
 * ① **划选截图**（`snapshotPage` + `cropRegionToFile`，交互层见
 *    `components/ui/region-screenshot-overlay.tsx`）—— 用户的默认预期：
 *    点截图 → 页面冻住变暗 → 自己拖拽划一块 → 截那一块。
 *    像素来自 `html-to-image` 对 DOM 的重绘，**零授权弹窗**、点一下就走。
 *    代价：iframe / 跨域图 / `<video>` 当前帧拿不到（画布会被跨域污染）。
 *
 * ② **屏幕捕获**（`captureScreen`，`getDisplayMedia`）—— 兜底。
 *    拍的是真实合成像素，连视频画面都在；代价是每次要过一次浏览器原生
 *    「选择要共享的内容」弹窗。①失败时（页面含跨域资源等）由调用方降级到它。
 */

/* 🚨 必须**静态** import。曾经写成 `await import("html-to-image")`，dev 下这是一次
   按需编译 + 网络请求，能挂到十几秒不返回，而当时超时兜底建立在 import **之后**
   —— 于是「点了截图没反应、控制台一个字都没有」。
   已确证 html-to-image 顶层（lib/*.js 全部文件）无任何 window/document 访问，SSR 安全。 */
import { toCanvas } from "html-to-image"

/** 划选截图的结果：三态同 captureScreen，调用方语义一致 */
export type ScreenCaptureResult =
  | { ok: true; file: File }
  | { ok: false; reason: "unsupported" | "cancelled" | "failed" }

/* ══════════════════════════════════════════════════════════════════
 * ① 划选截图
 * ══════════════════════════════════════════════════════════════════ */

/** 划选出来的矩形（**视口坐标**，CSS px，原点在视口左上角） */
export interface RegionRect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * 页面快照 —— 「冻结底图」+ 把视口坐标换算到画布坐标所需的全部信息。
 *
 * 🚨 别让调用方自己算换算：`originX/originY` 是 DOM 起点在视口里的位置，
 *    它把「滚动偏移」「body 外边距」一次性吃掉了。少算一次就会整体错位
 *    —— 表现是"截出来的图跟框选的区域对不上，偏了一段"。
 */
export interface PageSnapshot {
  canvas: HTMLCanvasElement
  /** 画布像素 ÷ CSS 像素（html-to-image 的 pixelRatio 实际生效值，反算出来的） */
  scale: number
  /** DOM 内容原点在视口坐标系里的位置（CSS px） */
  originX: number
  originY: number
}

export interface SnapshotPageOptions {
  /**
   * 拍图前临时隐藏的元素选择器（拍完原样恢复）。
   * 发起截图的那块 UI 必须藏起来 —— 否则它会出现在底图里，
   * 用户划选时看到的是"带着侧栏的页面"，截出来也带着。
   */
  hideSelectors?: string[]
  /** 出图像素比。默认 1（够用且快，反正后面还要压到 1600 长边） */
  pixelRatio?: number
  /** 重绘超时（ms）。超时即降级，绝不把用户晾在"点了没反应"上 */
  timeoutMs?: number
}

/** 重绘超时兜底：超过这个时长还没出图，就当失败降级（默认 8s） */
const SNAPSHOT_TIMEOUT_MS = 8000

/* ── 页面滚动冻结（引用计数）───────────────────────────────────────────
 *
 * 为什么需要：冻结根滚动条会让视口**变宽**（经典滚动条约 15px）。
 * 底图与划选遮罩必须量到同一个宽度，否则遮罩右缘会多出一条"没有底图"的缝
 * —— 看着像截图偏了，其实是两次量宽不一致。
 * 所以冻结要在拍底图**之前**发生，且遮罩显示期间不能松手：
 * 引用计数让「拍图」与「遮罩」各持一份，谁先谁后都不会提前解冻。
 *
 * ⚠️ 必须写 `documentElement`（不是 `body`）：根元素的 overflow 才是视口的 overflow。
 *    本项目 globals.css 里 html 带 `overflow-x: clip`，而按规范「根元素有一个轴不是
 *    visible 时，body 的 overflow 不再向视口传播」—— 所以改 body 是改了个寂寞。
 */
let freezeCount = 0
let savedRootOverflow = ""

export function freezePageScroll(): () => void {
  if (typeof document === "undefined") return () => {}
  if (freezeCount === 0) {
    savedRootOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"
  }
  freezeCount++
  let released = false
  return () => {
    if (released) return
    released = true
    freezeCount = Math.max(0, freezeCount - 1)
    if (freezeCount === 0) document.documentElement.style.overflow = savedRootOverflow
  }
}

/**
 * 把当前页面拍成一张「冻结底图」。
 *
 * 失败（返回 null）的典型原因：
 *  · 页面里有跨域图片且服务端没给 CORS 头 → canvas 被污染；
 *  · 页面太大 / 字体太多 → 重绘超时。
 * 调用方应当降级到 `captureScreen`，而不是只弹个错误了事。
 */
export async function snapshotPage(opts: SnapshotPageOptions = {}): Promise<PageSnapshot | null> {
  if (typeof document === "undefined") return null
  const { hideSelectors, pixelRatio = 1, timeoutMs = SNAPSHOT_TIMEOUT_MS } = opts

  const t0 = typeof performance !== "undefined" ? performance.now() : 0
  const elapsed = () => Math.round((typeof performance !== "undefined" ? performance.now() : 0) - t0)
  const dev = process.env.NODE_ENV !== "production"

  if (dev) {
    console.log(
      `[screenshot] snapshotPage 开始：隐藏 ${hideSelectors?.length ?? 0} 个选择器，` +
        `pixelRatio=${pixelRatio}，超时 ${timeoutMs}ms`,
    )
  }

  /* 🚨 看门狗必须**包住整个函数体**（含隐藏元素、等帧、取矩形、重绘）。
     只盯 `toCanvas` 是不够的：任何一个前置 await 挂住，用户看到的都是"点了没反应"。 */
  let watchdog: ReturnType<typeof setTimeout> | undefined
  let timedOut = false
  const guard = new Promise<never>((_, reject) => {
    watchdog = setTimeout(() => {
      timedOut = true
      reject(new Error("SNAPSHOT_TIMEOUT"))
    }, timeoutMs)
  })

  const hidden: Array<{ el: HTMLElement; prev: string }> = []
  try {
    const work = (async () => {
      for (const sel of hideSelectors ?? []) {
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
          hidden.push({ el, prev: el.style.visibility })
          el.style.visibility = "hidden"
        })
      }
      // 必须等隐藏真的上屏，否则 html-to-image 拍到的是"还没藏起来"的那一帧
      if (hidden.length) await nextPaint()

      const bodyRect = document.body.getBoundingClientRect()
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth

      const canvas = await toCanvas(document.body, {
        pixelRatio,
        // 透明底会压成黑块（JPEG 无 alpha），先铺白
        backgroundColor: "#ffffff",
        /* 跳过字体下载/内联：html-to-image 默认会把页面上每个 @font-face 都抓一遍再嵌进
           渲染用的 SVG，外链字体还会真的走网络 —— 站点字体一多这一步能慢到秒级甚至挂死。
           截图是给人看的画面，字形回退到系统字体完全可接受，不值得为它赌一次超时。 */
        skipFonts: true,
        /* 只画真正要的内容：dev overlay（nextjs-portal）是 body 的子节点且带 shadow DOM，
           重绘它又慢又没意义；脚本节点同理；刚被 hideSelectors 藏起来的自己也不用画。 */
        filter: (node) => {
          const el = node as HTMLElement
          if (!el || typeof el.tagName !== "string") return true
          if (el.id === "nextjs-portal") return false
          const tag = el.tagName.toLowerCase()
          if (tag === "script" || tag === "noscript") return false
          if (el.style?.visibility === "hidden") return false
          return true
        },
      })

      return { canvas, bodyRect, viewportWidth }
    })()

    const { canvas, bodyRect, viewportWidth } = await Promise.race([work, guard])

    if (!canvas.width || !canvas.height) return null

    if (dev) {
      console.log(
        `[screenshot] snapshotPage 完成：${elapsed()}ms，` +
          `${canvas.width}×${canvas.height}，scale=${(canvas.width / viewportWidth).toFixed(3)}`,
      )
    }

    return {
      canvas,
      scale: canvas.width / viewportWidth,
      originX: bodyRect.left,
      originY: bodyRect.top,
    }
  } catch (e) {
    /* 降级由调用方决定（通常是转屏幕捕获），但失败原因必须留在控制台 ——
       否则线上只会看到"截图失败"，永远不知道是跨域图还是超时。 */
    if (dev) {
      const why = timedOut ? `超时（>${timeoutMs}ms）` : "异常"
      console.warn(`[screenshot] snapshotPage 失败（${elapsed()}ms，${why}）：`, e)
    }
    return null
  } finally {
    if (watchdog) clearTimeout(watchdog)
    for (const h of hidden) h.el.style.visibility = h.prev
  }
}

/**
 * 从冻结底图裁出选区 → PNG File。
 * 返回的 `File` 可直接喂给 `_utils/paste-image.ts#prepareImageFile`（与选图/粘贴同一条压缩通路）。
 */
export async function cropRegionToFile(
  snapshot: PageSnapshot,
  rect: RegionRect,
  name = "screenshot",
): Promise<File | null> {
  const { canvas, scale, originX, originY } = snapshot
  const sx = Math.round((rect.x - originX) * scale)
  const sy = Math.round((rect.y - originY) * scale)
  const sw = Math.max(1, Math.round(rect.w * scale))
  const sh = Math.max(1, Math.round(rect.h * scale))

  const out = document.createElement("canvas")
  out.width = sw
  out.height = sh
  const ctx = out.getContext("2d")
  if (!ctx) return null
  // 越界部分交给 canvas 自己裁（drawImage 对超出源范围的部分是透明的）——
  // 划选时已经 clamp 过，这里只是兜底，不再写一套边界算法。
  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)

  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"))
  if (!blob) return null
  return new File([blob], `${name}-${Date.now()}.png`, { type: "image/png" })
}

/* ══════════════════════════════════════════════════════════════════
 * ② 屏幕捕获（兜底）
 * ══════════════════════════════════════════════════════════════════ */

export interface CaptureScreenOptions {
  /** 是否把鼠标指针画进截图（默认 always，与用户预期一致） */
  cursor?: "always" | "motion" | "never"
  /**
   * 抓帧前额外等待（ms）。某些浏览器/系统在 `play()` 返回后首帧仍是黑的，
   * 默认 220ms —— 实测（Chrome 140 / Windows）比只等一帧稳定。
   */
  settleMs?: number
  /** 文件名词干，最终为 `${name}-${时间戳}.png` */
  name?: string
  /**
   * 抓帧期间临时隐藏的元素选择器（截图完成后原样恢复）。
   *
   * 用途：截图按钮就长在被截的那个页面上——不藏起来，用户选「整个屏幕 / 当前标签页」
   * 时会把**发起截图的那块 UI**一并截进去（侧栏、悬浮球），送去给 AI 看就多了一坨噪声。
   * ⚠️ 只改 `visibility`，不改 `display` —— 后者会触发布局重排，
   *    被截页面会跳一下，而且恢复时又跳一下。
   */
  hideSelectors?: string[]
}

/**
 * 等到视频元数据就绪且首帧可绘制。
 *
 * 🚨 超时兜底不是可选项：`video.onloadedmetadata` 在某些环境下（标签页被切换、
 *    源窗口最小化）可能永远不触发，而 `play()` 的 promise 也可能既不 resolve
 *    也不 reject —— 老实现就是在这里悬挂，用户看到的是按钮永远转圈。
 */
function waitVideoReady(video: HTMLVideoElement, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer)
      video.onloadedmetadata = null
      video.onerror = null
    }
    const ok = () => {
      cleanup()
      resolve()
    }
    const fail = () => {
      cleanup()
      reject(new Error("VIDEO_NOT_READY"))
    }
    const timer = setTimeout(fail, timeoutMs)
    video.onerror = fail
    video.onloadedmetadata = () => {
      // 静音 + playsInline 下自动播放策略不会拦，但真被拦了也必须收尾而不是悬挂
      video.play().then(ok).catch(fail)
    }
  })
}

/** 等价于等两帧：确保上面写的 `visibility` 已经真的上屏，而不是还躺在样式队列里 */
function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

/**
 * 截取屏幕 → PNG File。
 *
 * 直接返回 `File`（不是 dataUrl）：调用方可以复用既有的
 * 「File → 压缩 → 附件」通路（见 `_utils/paste-image.ts#prepareImageFile`），
 * 让截图与「选文件 / 粘贴」走同一条处理管线。
 */
export async function captureScreen(
  opts: CaptureScreenOptions = {},
): Promise<ScreenCaptureResult> {
  const { cursor = "always", settleMs = 220, name = "screenshot", hideSelectors } = opts

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
    return { ok: false, reason: "unsupported" }
  }

  let stream: MediaStream | null = null
  const hidden: Array<{ el: HTMLElement; prev: string }> = []
  const restore = () => {
    for (const h of hidden) h.el.style.visibility = h.prev
    hidden.length = 0
  }

  try {
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor } as MediaTrackConstraints,
        audio: false,
      })
    } catch {
      // NotAllowedError（用户点了取消 / 按 Esc 关掉选择器）与权限拒绝都落这里
      return { ok: false, reason: "cancelled" }
    }

    const video = document.createElement("video")
    video.srcObject = stream
    video.muted = true
    video.playsInline = true

    await waitVideoReady(video, 6000)

    // 抓帧前藏起自己的 UI（见 hideSelectors 注释），等它真的上屏
    if (hideSelectors?.length && typeof document !== "undefined") {
      for (const sel of hideSelectors) {
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
          hidden.push({ el, prev: el.style.visibility })
          el.style.visibility = "hidden"
        })
      }
      if (hidden.length) await nextPaint()
    }

    if (settleMs > 0) await new Promise((r) => setTimeout(r, settleMs))

    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return { ok: false, reason: "failed" }

    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return { ok: false, reason: "failed" }
    ctx.drawImage(video, 0, 0, w, h)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
    if (!blob) return { ok: false, reason: "failed" }

    return { ok: true, file: new File([blob], `${name}-${Date.now()}.png`, { type: "image/png" }) }
  } catch {
    return { ok: false, reason: "failed" }
  } finally {
    // 无论成败都要收口：媒体轨不 stop 的话，标签页会一直亮着"正在共享屏幕"
    restore()
    stream?.getTracks().forEach((t) => t.stop())
  }
}
