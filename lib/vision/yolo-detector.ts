/**
 * 浏览器端 YOLO 目标检测器
 *
 * ── 为什么放在浏览器端 ──
 * 1. **地基已经现成**：项目为了 Silero VAD 早就把 onnxruntime-web 的 wasm 运行时
 *    铺在 `public/vad/` 下，并且 `next.config.ts` 已开 COOP/COEP 让 SharedArrayBuffer 可用。
 *    浏览器端跑 YOLO 不需要新增任何推理基础设施。
 * 2. **反馈才够"优雅"**：用户选完图本地就出框，毫秒级、零网络等待，
 *    天然适合做扫描线、逐框淡入这类动效；服务端推理则必然带一次往返延迟。
 * 3. **图片不必外流**：本地检测阶段图片不出设备。
 *
 * ── 与 VLM 的关系（重要）──
 * YOLO 解决的是 VLM 最弱的一环：**空间定位**。它回答"哪里异常、有几个"，
 * 但**不回答"是什么病、怎么治"** —— 那仍由 VLM 诊断。二者互补：
 *   YOLO 出框 → 裁剪放大 → VLM 细化鉴别（P1 的 ROI 复用链路）
 * 因此本模块产出的 bbox 与 VLM 的 bbox 使用**同一套归一化协议**，
 * 前端 `DetectionOverlay` 无需区分来源。
 *
 * ── 优雅降级 ──
 * 模型文件不存在、wasm 不可用、跨源隔离缺失 —— 一律返回空数组并标记为
 * `unavailable`，**绝不抛错阻断诊断链路**。此时前端只展示 VLM 产出的框。
 */

import type { BBox } from '@/lib/types/vision-diagnosis'

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export interface YoloDetection {
    /** 展示名，如「病斑」 */
    label: string
    /** 稳定类别 key */
    labelKey: string
    /** 置信度 0~1 */
    confidence: number
    /** 归一化 bbox（0~1，相对原图） */
    bbox: BBox
}

export interface YoloConfig {
    /** 模型地址。默认 `/models/yolo-crop-detect.onnx` */
    modelUrl?: string
    /** 类别标签 JSON（字符串数组）。默认 `/models/yolo-crop-labels.json` */
    labelsUrl?: string
    /** onnxruntime wasm 目录。默认 `/vad/`（复用 Silero VAD 的运行时，避免重复 13MB） */
    wasmPaths?: string
    /** 置信度阈值 */
    scoreThreshold?: number
    /** NMS IoU 阈值 */
    iouThreshold?: number
    /** 输入边长（YOLOv8 默认 640） */
    inputSize?: number
    /** 最多返回多少个框 */
    maxDetections?: number
}

export type DetectorStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

const DEFAULT_CONFIG: Required<YoloConfig> = {
    modelUrl: '/models/yolo-crop-detect.onnx',
    labelsUrl: '/models/yolo-crop-labels.json',
    wasmPaths: '/vad/',
    scoreThreshold: 0.35,
    iouThreshold: 0.45,
    inputSize: 640,
    maxDetections: 20,
}

// ---------------------------------------------------------------------------
// 模块级状态（单例，避免重复加载模型）
// ---------------------------------------------------------------------------

let ortModule: any = null
let session: any = null
let labels: string[] = []
let status: DetectorStatus = 'idle'
let loadPromise: Promise<boolean> | null = null
let unavailableReason = ''

export function getDetectorStatus(): DetectorStatus {
    return status
}

export function getDetectorUnavailableReason(): string {
    return unavailableReason
}

/** 浏览器环境与跨源隔离检查 */
function canUseOnnx(): boolean {
    if (typeof window === 'undefined') return false
    if (typeof crossOriginIsolated === 'undefined' || !crossOriginIsolated) {
        unavailableReason =
            'onnxruntime 多线程 wasm 需要 SharedArrayBuffer（依赖 COOP/COEP 响应头）。当前页面未处于跨源隔离环境。'
        return false
    }
    return true
}

/**
 * 确保检测器可用。返回是否就绪。
 * 幂等：并发调用共享同一次加载。
 */
export async function ensureDetector(config: YoloConfig = {}): Promise<boolean> {
    if (status === 'ready') return true
    if (status === 'unavailable') return false
    if (loadPromise) return loadPromise

    loadPromise = (async (): Promise<boolean> => {
        status = 'loading'
        const cfg = { ...DEFAULT_CONFIG, ...config }

        if (!canUseOnnx()) {
            status = 'unavailable'
            return false
        }

        try {
            // 0. 先探测模型是否存在 —— 避免 404 在控制台刷屏
            const head = await fetch(cfg.modelUrl, { method: 'HEAD' }).catch(() => null)
            if (!head || !head.ok) {
                unavailableReason = `未找到本地检测模型 ${cfg.modelUrl}（可选装：见 docs/病虫害视觉诊断方案.md 的 YOLO 章节）`
                status = 'unavailable'
                return false
            }

            // 1. 加载 onnxruntime-web（复用 VAD 的 wasm 运行时目录）
            const ort = await import('onnxruntime-web')
            ort.env.wasm.wasmPaths = cfg.wasmPaths
            // 已确认 crossOriginIsolated，安全开多线程
            ort.env.wasm.numThreads = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1))
            ort.env.wasm.simd = true
            ortModule = ort

            // 2. 创建推理会话
            session = await ort.InferenceSession.create(cfg.modelUrl, {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all',
            })

            // 3. 加载类别标签（缺失则退化为通用名）
            labels = await fetch(cfg.labelsUrl)
                .then((r) => (r.ok ? r.json() : null))
                .then((j) => (Array.isArray(j) ? j.map(String) : []))
                .catch(() => [])

            status = 'ready'
            return true
        } catch (err: any) {
            unavailableReason = `本地检测器初始化失败：${err?.message || '未知错误'}`
            status = 'unavailable'
            return false
        }
    })()

    return loadPromise
}

// ---------------------------------------------------------------------------
// 推理
// ---------------------------------------------------------------------------

export interface DetectOptions extends YoloConfig {
    /** 原始图片尺寸（可选；不传则从 imageSource 推断） */
    sourceWidth?: number
    sourceHeight?: number
}

/**
 * 对图片执行一次目标检测。
 *
 * 任何异常都会吞掉并返回空数组 —— 检测是**增强**，不是主链路，
 * 不允许因为它失败而让用户看不到诊断结论。
 */
export async function detect(
    imageSource: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    options: DetectOptions = {},
): Promise<YoloDetection[]> {
    const ready = await ensureDetector(options)
    if (!ready || !session || !ortModule) return []

    const cfg = { ...DEFAULT_CONFIG, ...options }

    try {
        const { data, meta } = preprocess(imageSource, cfg.inputSize)
        const inputName = session.inputNames?.[0]
        const feeds: Record<string, any> = {
            [inputName]: new ortModule.Tensor('float32', data, [1, 3, cfg.inputSize, cfg.inputSize]),
        }

        const outputs = await session.run(feeds)
        const outputName = session.outputNames?.[0]
        const output = outputs[outputName]

        const boxes = decodeYolov8(output, meta, labels, cfg)
        return nms(boxes, cfg.iouThreshold).slice(0, cfg.maxDetections)
    } catch (err) {
        console.warn('[YOLO] 推理失败，已降级为不含本地检测框:', err)
        return []
    }
}

/** 释放资源（页面卸载或不再需要时调用） */
export async function disposeDetector(): Promise<void> {
    try {
        await session?.release?.()
    } catch {
        /* ignore */
    }
    session = null
    status = 'idle'
    loadPromise = null
}

// ---------------------------------------------------------------------------
// 预处理 / 解码 / NMS
// ---------------------------------------------------------------------------

interface LetterboxMeta {
    scale: number
    dx: number
    dy: number
    sourceWidth: number
    sourceHeight: number
}

/**
 * letterbox 缩放 + 归一化到 CHW Float32。
 * 保持宽高比并填充灰边，避免拉伸导致的框偏移。
 */
function preprocess(
    imageSource: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    size: number,
): { data: Float32Array; meta: LetterboxMeta } {
    const sourceWidth =
        (imageSource as HTMLImageElement).naturalWidth ||
        (imageSource as HTMLCanvasElement).width ||
        (imageSource as ImageBitmap).width
    const sourceHeight =
        (imageSource as HTMLImageElement).naturalHeight ||
        (imageSource as HTMLCanvasElement).height ||
        (imageSource as ImageBitmap).height

    const scale = Math.min(size / sourceWidth, size / sourceHeight)
    const newW = Math.round(sourceWidth * scale)
    const newH = Math.round(sourceHeight * scale)
    const dx = Math.floor((size - newW) / 2)
    const dy = Math.floor((size - newH) / 2)

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = 'rgb(114,114,114)'
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(imageSource as CanvasImageSource, dx, dy, newW, newH)

    const { data: rgba } = ctx.getImageData(0, 0, size, size)
    const area = size * size
    const data = new Float32Array(3 * area)

    for (let i = 0; i < area; i++) {
        data[i] = rgba[i * 4] / 255               // R → CHW[0]
        data[area + i] = rgba[i * 4 + 1] / 255    // G → CHW[1]
        data[area * 2 + i] = rgba[i * 4 + 2] / 255 // B → CHW[2]
    }

    return { data, meta: { scale, dx, dy, sourceWidth, sourceHeight } }
}

/**
 * 解码 YOLOv8 输出：shape [1, 4 + nc, N]。
 * 前 4 行为 cx,cy,w,h（letterbox 空间像素），其后为各类别分数（已 sigmoid）。
 */
function decodeYolov8(
    output: any,
    meta: LetterboxMeta,
    labels: string[],
    cfg: Required<YoloConfig>,
): YoloDetection[] {
    const dims: number[] = output?.dims || []
    if (dims.length !== 3) return []

    const [, channels, anchors] = dims
    const numClasses = channels - 4
    if (numClasses <= 0) return []

    const raw = output.data as Float32Array
    const results: YoloDetection[] = []

    for (let a = 0; a < anchors; a++) {
        // 找该 anchor 的最高类别分
        let bestScore = 0
        let bestClass = -1
        for (let c = 0; c < numClasses; c++) {
            const score = raw[(4 + c) * anchors + a]
            if (score > bestScore) {
                bestScore = score
                bestClass = c
            }
        }
        if (bestScore < cfg.scoreThreshold || bestClass < 0) continue

        const cx = raw[a]
        const cy = raw[anchors + a]
        const w = raw[anchors * 2 + a]
        const h = raw[anchors * 3 + a]

        // letterbox 空间 → 原图像素 → 归一化
        const px = (cx - w / 2 - meta.dx) / meta.scale
        const py = (cy - h / 2 - meta.dy) / meta.scale
        const pw = w / meta.scale
        const ph = h / meta.scale

        const nx = px / meta.sourceWidth
        const ny = py / meta.sourceHeight
        const nw = pw / meta.sourceWidth
        const nh = ph / meta.sourceHeight

        if (nw <= 0 || nh <= 0) continue

        results.push({
            label: labels[bestClass] || `目标 ${bestClass + 1}`,
            labelKey: `cls_${bestClass}`,
            confidence: bestScore,
            bbox: {
                x: Math.min(Math.max(nx, 0), 1),
                y: Math.min(Math.max(ny, 0), 1),
                w: Math.min(Math.max(nw, 0), 1),
                h: Math.min(Math.max(nh, 0), 1),
            },
        })
    }

    return results
}

/** 标准 NMS：同类框按 IoU 抑制 */
function nms(boxes: YoloDetection[], iouThreshold: number): YoloDetection[] {
    const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence)
    const kept: YoloDetection[] = []

    for (const box of sorted) {
        const overlapped = kept.some(
            (k) => k.labelKey === box.labelKey && iou(k.bbox, box.bbox) > iouThreshold,
        )
        if (!overlapped) kept.push(box)
    }

    return kept
}

function iou(a: BBox, b: BBox): number {
    const x1 = Math.max(a.x, b.x)
    const y1 = Math.max(a.y, b.y)
    const x2 = Math.min(a.x + a.w, b.x + b.w)
    const y2 = Math.min(a.y + a.h, b.y + b.h)
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
    if (inter <= 0) return 0
    const union = a.w * a.h + b.w * b.h - inter
    return union > 0 ? inter / union : 0
}
