"use client"

/**
 * 病虫害诊断卡片
 *
 * ── 2026-10-04 第三版（按用户给的参考稿重做）─────────────────────────
 * 交付形态是**两级**的，这也是参考稿的核心信息架构：
 *
 *   ① 收起态（对话里常驻，一眼看完）
 *      缩略图 + 「疑似 XX 病 ⓘ」+ 严重度/概率 + 一句话结论 + ⌄
 *      底部四颗胶囊入口：查看标注 / 可能原因 / 防治建议 / 相似案例
 *      —— 对话流里只占一张卡片的高度，不跟正文抢篇幅。
 *
 *   ② 完整详情（点卡片或右侧箭头展开，**全屏浮层**）
 *      左：标注大图（原图 ⇄ 遮罩由 DetectionOverlay 自带）
 *      右：四个 Tab —— 病斑分析 / 可能原因 / 防治建议 / 相似案例
 *      —— 信息密度高，所以给足宽度；手机上退化为上下布局。
 *
 * ── 为什么用浮层而不是就地展开 ──
 * 详情要「左图右文」的双栏，对话列宽（约 640px）塞不下；就地展开会把
 * 一条消息撑到 1500px+，正是上一版被否掉的「占篇幅」。浮层既给了宽度，
 * 又保证对话流的高度不被侵犯。
 *
 * ── 传下来的硬约束（勿删）──
 * · 圆角层级：卡片/浮层 16 · 图片 8~12 · 胶囊 full。**不做圆角矩形套圆角矩形**；
 *   分组靠浅底（zinc-50）+ 留白，不靠描边盒子。
 * · 图中依据（evidence）必须可见 —— 这是抗幻觉的落点，用户要能"看图对账"。
 * · 置信度低时先给补拍建议，不硬下结论。
 * · 相似案例**必须联网检索**（见 lib/ai/vision/similar-cases.ts），
 *   检索不可用时如实说「未配置联网检索」，绝不伪造案例。
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { DetectionOverlay } from "./detection-overlay"
import { detect } from "@/lib/vision/yolo-detector"
import { downscaleToDataUrl } from "@/lib/vision/downscale-image"
import {
    IconAttention,
    IconBug,
    IconCamera,
    IconCaution,
    IconCheck,
    IconClose,
    IconCompression,
    IconExperiment,
    IconFileSearch,
    IconFullScreen,
    IconHelp,
    IconInfo,
    IconLeaf,
    IconLoading,
    IconMedicineChest,
    IconPicture,
    IconRefresh,
    IconRight,
    IconScan,
    IconScissors,
    IconSeedling,
    IconShieldCheck,
    IconThermometer,
} from "@/components/icon"
import {
    getCategoryMeta,
    getConfidenceTier,
    getSeverityMeta,
    LOW_CONFIDENCE_THRESHOLD,
    TREATMENT_LEVEL_META,
    type Detection,
    type DiagnosisResult,
    type DiseaseCandidate,
    type SimilarCase,
    type TreatmentLevel,
    type TreatmentLevelKey,
} from "@/lib/types/vision-diagnosis"

type IconComponent = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>

/** 浮层里标注大图的高度上限（比列宽更重要：防止竖构图把浮层顶穿） */
const MEDIA_H = 460

/** 细线分隔 —— 等价于 HarmonyOS 的 divider */
const HAIRLINE = "border-zinc-900/[0.06] dark:border-white/10"

const ICON_MAP: Record<string, IconComponent> = {
    IconExperiment,
    IconBug,
    IconLeaf,
    IconSeedling,
    IconHelp,
    IconThermometer,
    IconScissors,
    IconMedicineChest,
}

/**
 * 防治层级在「建议」里的字形。
 * 刻意不复用 `TREATMENT_LEVEL_META.icon`（那是给设置/看板用的温湿度计、剪刀…），
 * 诊断语境下叶片 / 盾牌 / 试管更贴近种植户口语里的「调环境 / 上生物 / 打药」。
 */
const TREATMENT_GLYPH: Record<TreatmentLevelKey, IconComponent> = {
    environment: IconLeaf,
    physical: IconScissors,
    biological: IconShieldCheck,
    chemical: IconExperiment,
}

// ---------------------------------------------------------------------------
// 病历入档指纹
// ---------------------------------------------------------------------------

/**
 * 诊断内容的极简指纹（djb2）—— 只用于让「同一条消息里的多张诊断卡」
 * 与「模型重新生成导致结论变化」得到不同的病历幂等键。
 *
 * ⚠️ 刻意**不**对整个 `result` 做 JSON.stringify：`detections` 可能有几十个框，
 *    序列化成本高且对幂等没有贡献。只取真正定义「这次诊断是什么」的语义字段。
 */
function contentFingerprint(result: DiagnosisResult): string {
    const basis = [
        result.diseaseName,
        result.category,
        result.severity,
        String(result.confidence),
        ...(Array.isArray(result.affectedParts) ? result.affectedParts : []),
        ...(Array.isArray(result.evidence) ? result.evidence.slice(0, 3) : []),
    ].join("|")

    let h = 5381
    for (let i = 0; i < basis.length; i++) {
        h = ((h << 5) + h + basis.charCodeAt(i)) >>> 0
    }
    return h.toString(36)
}

// ---------------------------------------------------------------------------
// 本地 YOLO 检测（可选增强 · 优雅降级的落点）
// ---------------------------------------------------------------------------

/**
 * 模型就绪 → 用本地检测框（毫秒级、框可解释、可计数）；
 * 模型缺失 / wasm 不可用 → 静默返回空数组，调用方回落到 VLM 产出的框。
 * 也就是说：**YOLO 是增强，不是依赖**。
 */
function useLocalDetections(imageSrc?: string): Detection[] {
    const [detections, setDetections] = useState<Detection[]>([])

    useEffect(() => {
        if (!imageSrc) {
            setDetections([])
            return
        }
        let cancelled = false
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = async () => {
            const found = await detect(img)
            if (cancelled || found.length === 0) return
            setDetections(
                found.map((d, i) => ({
                    id: `yolo-${i}`,
                    label: d.label,
                    labelKey: d.labelKey,
                    confidence: d.confidence,
                    bbox: d.bbox,
                    source: "yolo" as const,
                })),
            )
        }
        img.src = imageSrc
        return () => {
            cancelled = true
        }
    }, [imageSrc])

    return detections
}

// ---------------------------------------------------------------------------
// 小组件
// ---------------------------------------------------------------------------

/** 胶囊标签 —— 唯一允许的圆角矩形（full），用于状态而非容器 */
function Pill({
    icon: Icon,
    children,
    color,
    className,
}: {
    icon?: IconComponent
    children: ReactNode
    /** 语义色；给了就用它染字与浅底（浅底取 12% 透明） */
    color?: string
    className?: string
}) {
    return (
        <span
            className={cn(
                "inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[12px] font-medium leading-none whitespace-nowrap",
                !color && "bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300",
                className,
            )}
            style={color ? { color, background: `${color}1F` } : undefined}
        >
            {Icon && <Icon size={12} className="shrink-0" />}
            {children}
        </span>
    )
}

/** 建议里的一枚「小圆点」项目符号 —— 比 ul 默认圆点更贴合正文行高 */
const Dot = () => <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />

// ---------------------------------------------------------------------------
// 相似案例（联网检索）
// ---------------------------------------------------------------------------

type CasesStatus = "idle" | "loading" | "ready" | "empty" | "unavailable" | "error"

interface CasesState {
    status: CasesStatus
    cases: SimilarCase[]
    error?: string
}

/** 案例配图：外链经站内代理，仍可能 404 / 超时 —— 失败就退回占位图标，不留裂图 */
function CaseThumb({ src, alt }: { src?: string; alt: string }) {
    const [broken, setBroken] = useState(false)
    if (!src || broken) {
        return (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-300 dark:bg-white/[0.06] dark:text-zinc-600">
                <IconPicture size={20} />
            </span>
        )
    }
    return (
        <span className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-white/[0.06]">
            <img
                src={src}
                alt={alt}
                loading="lazy"
                draggable={false}
                onError={() => setBroken(true)}
                className="h-full w-full select-none object-cover"
            />
        </span>
    )
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

type DetailTab = "analysis" | "causes" | "treatments" | "cases"

const DETAIL_TABS: Array<{ key: DetailTab; label: string }> = [
    { key: "analysis", label: "病斑分析" },
    { key: "causes", label: "可能原因" },
    { key: "treatments", label: "防治建议" },
    { key: "cases", label: "相似案例" },
]

/** 收起态底部的四个入口 —— 点任意一个都会打开浮层并定位到对应 Tab */
const QUICK_ACTIONS: Array<{ tab: DetailTab; label: string; icon: IconComponent }> = [
    { tab: "analysis", label: "查看标注", icon: IconScan },
    { tab: "causes", label: "可能原因", icon: IconHelp },
    { tab: "treatments", label: "防治建议", icon: IconLeaf },
    { tab: "cases", label: "相似案例", icon: IconFileSearch },
]

export interface DiagnosisCardProps {
    result: DiagnosisResult
    /** 诊断所用图片。传入后收起态左侧展示缩略图，浮层里展示标注大图 */
    imageSrc?: string
    /** 是否仍在分析中 */
    scanning?: boolean
    /** 点击检测框 */
    onSelectDetection?: (id: string | null) => void
    className?: string
    /**
     * 病历归档种子（`${sessionId}:${消息key}:${partIndex}`）。
     * 传入后本卡会在挂载时**自动把诊断结果沉淀成病历**（静默、幂等，见下方 useEffect）。
     * 不传则完全不入档（验收路由 / 无会话上下文的场景）。
     */
    archiveKey?: string
    /** 作物名（入档时记录，便于病历按作物筛选）。未提供则不写 */
    crop?: string
}

export function DiagnosisCard({
    result,
    imageSrc,
    scanning = false,
    onSelectDetection,
    className,
    archiveKey,
    crop,
}: DiagnosisCardProps) {
    const categoryMeta = getCategoryMeta(result.category)
    const severityMeta = getSeverityMeta(result.severity)
    const tier = getConfidenceTier(result.confidence)
    const lowConfidence = result.confidence < LOW_CONFIDENCE_THRESHOLD

    // 本地 YOLO 框优先（快、可解释、可计数）；模型未就绪时回落到 VLM 产出的框
    const localDetections = useLocalDetections(imageSrc)
    const detections = localDetections.length > 0 ? localDetections : result.detections

    const evidence = Array.isArray(result.evidence) ? result.evidence : []
    const treatments = Array.isArray(result.treatments) ? result.treatments : []
    const differentials = Array.isArray(result.differentials) ? result.differentials : []
    const analysis = Array.isArray(result.analysis) ? result.analysis : []
    const followUp = Array.isArray(result.followUp) ? result.followUp : []
    const parts = Array.isArray(result.affectedParts) ? result.affectedParts : []

    /** 一句话结论：模型没给就用「部位 + 严重度提示」兜底，不空着 */
    const summaryText =
        result.summary?.trim() ||
        `${parts[0] ? `${parts[0]}：` : ""}${severityMeta.hint}`

    /**
     * 「可能原因」列表。
     * 模型给了 candidates 就直接用；只给了 differentials（鉴别排除）时降级成一张
     * 无概率的候选表 —— ⚠️ **不拿序号臆造百分比**，宁可不画进度条。
     */
    const candidates: DiseaseCandidate[] = useMemo(() => {
        if (Array.isArray(result.candidates) && result.candidates.length > 0) return result.candidates
        return differentials.slice(0, 3).map((d) => ({ name: d.name, note: d.reason, excluded: d.excluded }))
    }, [result.candidates, differentials])

    // ---------------------------------------------------------------------
    // 病历自动入档（静默 · 幂等）—— 「病历沉淀」的写入口
    // ---------------------------------------------------------------------
    /**
     * 🚨 StrictMode 安全性（这条踩过坑，勿随手改）：
     * 守卫用 ref，且 ref 落值放在**本次调用的第一行**（同步执行、早于任何 await）。
     * 这样 effect 跑两遍时第二遍能看见 key 已存在而跳过；
     * 同时本 effect **刻意不返回 cleanup** —— 若这里 abort 掉请求，
     * StrictMode 的「挂载 → 卸载 → 再挂载」会把第一次的入档请求杀掉，
     * 表现就是"病历偶尔丢一条"。入档是一次性副作用，本就不该随卸载取消。
     */
    const archivedRef = useRef<string | null>(null)

    useEffect(() => {
        if (!archiveKey) return
        // 没有结论的诊断不入档：病历要留的是「可处置的记录」，不是一张空诊断
        if (!result.diseaseName || result.diseaseName === "信息不足") return

        // 最终幂等键 = 位置种子 + 诊断内容指纹。
        // 加指纹是为了区分「同一条消息里的两张诊断卡」与「模型重新生成导致结论变化」。
        const finalKey = `${archiveKey}:${contentFingerprint(result)}`
        if (archivedRef.current === finalKey) return
        archivedRef.current = finalKey // ← 同步落值，必须早于 await

        void (async () => {
            try {
                // 缩略图压到长边 640 —— 原图 1~4MB，不压会把病历表撑爆。
                // 压不出图（跨域污染等）就 null，照常入档：宁可没图，不能丢病历。
                const thumbnail = imageSrc ? await downscaleToDataUrl(imageSrc) : null
                await fetch("/api/vision/medical-records", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        archiveKey: finalKey,
                        crop: crop || null,
                        imageThumbnail: thumbnail,
                        result,
                    }),
                })
            } catch {
                // 静默失败：常见于未登录 / 离线 / 验收环境。
                // 入档是「沉淀」不是「交互」，失败不该打断用户看诊断结论。
            }
        })()
    }, [archiveKey, crop, imageSrc, result])

    // ── 浮层状态 ──
    const [open, setOpen] = useState(false)
    const [tab, setTab] = useState<DetailTab>("analysis")
    /** 全屏看大图 —— contain 模式下竖构图会被高度限制，全屏是唯一能把病灶放大的手段 */
    const [mediaFull, setMediaFull] = useState(false)
    const openAt = useCallback((next: DetailTab) => {
        setTab(next)
        setOpen(true)
    }, [])
    const closeDialog = useCallback(() => {
        setMediaFull(false)
        setOpen(false)
    }, [])

    // ── 相似案例：懒加载，只在用户真的打开那个 Tab 时才联网 ──
    const [cases, setCases] = useState<CasesState>(() =>
        Array.isArray(result.similarCases) && result.similarCases.length > 0
            ? { status: "ready", cases: result.similarCases }
            : { status: "idle", cases: [] },
    )
    /**
     * 🚨 用 ref 记「已请求过的 key」而不是用 state。
     * React StrictMode 下 effect 会跑两遍：若把守卫做成「进 effect 就落值」，
     * 第二遍会直接 return —— 而第一遍的请求可能已被 cleanup 取消 → 请求永不发出。
     * 这里把落值放在**真正发起请求的 async 函数第一行**（同步执行、早于 await），
     * 两遍都进来时第二遍能看见 key 已存在而跳过，且第一遍不会被误杀。
     */
    const casesKeyRef = useRef<string | null>(null)

    const loadCases = useCallback(async () => {
        const key = `${result.diseaseName}|${result.category}`
        if (casesKeyRef.current === key) return
        casesKeyRef.current = key
        setCases({ status: "loading", cases: [] })
        try {
            const res = await fetch("/api/vision/similar-cases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ diseaseName: result.diseaseName, category: result.category, limit: 3 }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok || !data) {
                casesKeyRef.current = null // 允许重试
                setCases({ status: "error", cases: [], error: data?.error || `请求失败（${res.status}）` })
                return
            }
            if (data.available === false) {
                setCases({ status: "unavailable", cases: [], error: data.error })
                return
            }
            if (Array.isArray(data.cases) && data.cases.length > 0) {
                setCases({ status: "ready", cases: data.cases })
            } else {
                setCases({ status: "empty", cases: [], error: data.error })
            }
        } catch (err: any) {
            casesKeyRef.current = null
            setCases({ status: "error", cases: [], error: err?.message || "网络异常" })
        }
    }, [result.diseaseName, result.category])

    useEffect(() => {
        if (!open || tab !== "cases") return
        if (cases.status === "ready" || cases.status === "unavailable") return
        void loadCases()
    }, [open, tab, cases.status, loadCases])

    // ── 浮层：ESC 关闭 + 锁滚动 ──
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return
            // 全屏看大图时，ESC 先退全屏，再退浮层
            if (mediaFull) setMediaFull(false)
            else closeDialog()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open, mediaFull, closeDialog])

    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = prev
        }
    }, [open])

    // ── 元信息 ──
    const metaBits = [
        detections.length > 0 ? `${detections.length} 处病斑` : "",
        result.meta?.elapsedMs > 0 ? `定位耗时 ${(result.meta.elapsedMs / 1000).toFixed(1)}s` : "",
        lowConfidence ? "低置信度提醒" : "",
    ].filter(Boolean)

    /**
     * 浮层标题：模型有时自己就写成「信息不足（疑似非草莓叶片）」，再拼一次括号会变成
     * 「…（疑似非草莓叶片）（草莓灰霉病可能性较高）」。已有括号时不再追加。
     */
    const topCandidate = candidates[0]
    const dialogTitle =
        result.diseaseName.includes("（") || !topCandidate || topCandidate.name === result.diseaseName
            ? result.diseaseName
            : `${result.diseaseName}（${topCandidate.name}可能性较高）`

    return (
        <>
            {/* ══════════ ① 收起态 ══════════ */}
            <div
                data-diagnosis-card
                data-card-expanded={open ? "1" : "0"}
                className={cn(
                    "overflow-hidden rounded-2xl bg-white dark:bg-zinc-900/60",
                    "ring-1 ring-zinc-900/[0.07] dark:ring-white/10",
                    "shadow-[0_1px_2px_rgba(9,9,11,0.04),0_10px_28px_-18px_rgba(9,9,11,0.20)]",
                    className,
                )}
            >
                {/* 头部：整块可点，展开完整详情（不含任何嵌套按钮，避免嵌套交互元素） */}
                <div
                    role="button"
                    tabIndex={0}
                    aria-label="展开完整诊断详情"
                    onClick={() => openAt("analysis")}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            openAt("analysis")
                        }
                    }}
                    className="flex cursor-pointer items-start gap-3.5 p-4 pb-3 outline-none transition-colors hover:bg-zinc-900/[0.015] focus-visible:bg-zinc-900/[0.03] dark:hover:bg-white/[0.03]"
                >
                    {imageSrc && (
                        <span className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                            {/* 缩略图用 object-cover 填满方格 —— 不留"小图悬在大空底上" */}
                            <img
                                src={imageSrc}
                                alt="诊断图片"
                                draggable={false}
                                className="h-full w-full select-none object-cover"
                            />
                        </span>
                    )}

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <h3 className="truncate text-[19px] font-semibold leading-7 text-zinc-900 dark:text-zinc-50">
                                {result.diseaseName}
                            </h3>
                            <IconInfo size={15} className="shrink-0 text-zinc-300 dark:text-zinc-600" />
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Pill icon={IconAttention} color={severityMeta.color}>
                                {severityMeta.label}
                            </Pill>
                            <span className="text-[13.5px] font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                                约 {Math.round(result.confidence * 100)}%
                            </span>
                            {lowConfidence && (
                                <Pill color="#D97706" icon={IconCaution}>
                                    把握有限
                                </Pill>
                            )}
                        </div>

                        <p className="mt-2 line-clamp-3 text-[14px] leading-[22px] text-zinc-600 dark:text-zinc-300">
                            {summaryText}
                        </p>
                    </div>

                    <IconRight
                        size={16}
                        className="mt-6 shrink-0 self-start text-zinc-300 dark:text-zinc-600"
                    />
                </div>

                {/* 底部四入口 —— 对话流里的"下一跳" */}
                <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-4">
                    {QUICK_ACTIONS.map(({ tab: t, label, icon: Icon }) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => openAt(t)}
                            className={cn(
                                "flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[13.5px] font-medium",
                                "bg-zinc-100/80 text-zinc-700 transition-colors hover:bg-zinc-200/70",
                                "dark:bg-white/[0.06] dark:text-zinc-200 dark:hover:bg-white/[0.1]",
                            )}
                        >
                            <Icon size={14} className="shrink-0 text-zinc-500 dark:text-zinc-400" />
                            <span className="truncate">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ══════════ ② 完整详情浮层 ══════════ */}
            {open &&
                typeof document !== "undefined" &&
                createPortal(
                    // 浮层经 createPortal 挂到 body，不在对话/面板的 DOM 树内，
                    // 需自己声明 data-lenis-prevent，否则 Lenis 会吞掉浮层内的滚轮（右列滚不动）。
                    <div data-lenis-prevent className="fixed inset-0 z-[175] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="诊断详情">
                        <div
                            className="absolute inset-0 bg-zinc-900/45 backdrop-blur-[2px]"
                            onClick={closeDialog}
                        />

                        {/* 🚨 浮层给**固定高度**（h-[min(760px,88vh)]）而不是"内容撑开"。
                            之前是内容撑开 + 左列自适应 → 打开「可能原因」这种短内容时，
                            整层塌成 500px 高，左列大图被压成一条宽扁的横带（实测 525×190），
                            等于把照片裁掉了七成 —— 用户："谁看的清"。
                            固定高度后：左列高度恒定，图片按 contain 完整显示，右列自己滚动。 */}
                        <div className="relative flex h-[min(760px,88vh)] w-full max-w-[1040px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_28px_70px_-16px_rgba(9,9,11,0.4)] ring-1 ring-zinc-900/[0.08] dark:bg-zinc-900 dark:ring-white/10">
                            {/* 浮层头部 */}
                            <div className="flex items-start gap-2 px-5 pt-4">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <h2 className="truncate text-[19px] font-semibold leading-7 text-zinc-900 dark:text-zinc-50">
                                            {dialogTitle}
                                        </h2>
                                        <IconInfo size={15} className="shrink-0 text-zinc-300 dark:text-zinc-600" />
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <Pill icon={IconAttention} color={severityMeta.color}>
                                            {severityMeta.label}
                                        </Pill>
                                        <span className="text-[13.5px] font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                                            约 {Math.round(result.confidence * 100)}%
                                        </span>
                                        {categoryMeta && (
                                            <Pill>{categoryMeta.label}</Pill>
                                        )}
                                    </div>
                                    {metaBits.length > 0 && (
                                        <p className="mt-1 text-[12px] leading-5 text-zinc-400">
                                            {metaBits.join(" · ")}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={closeDialog}
                                    aria-label="关闭"
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-900/[0.05] hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                                >
                                    <IconClose size={16} />
                                </button>
                            </div>

                            <div className="mt-3 flex min-h-0 flex-1 flex-col md:flex-row">
                                {/* 左：标注大图（高度由浮层固定高度决定，不被右列内容挤压） */}
                                {imageSrc ? (
                                    <div className="relative h-[240px] shrink-0 md:h-full md:w-[54%]">
                                        <div className="absolute inset-3 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                                            <DetectionOverlay
                                                src={imageSrc}
                                                detections={detections}
                                                scanning={scanning}
                                                fill
                                                /* contain：完整显示病灶。cover 在竖构图上会裁掉
                                                   大半张图（正是病斑所在），"看不全"= "看不清"。 */
                                                fit="contain"
                                                defaultView="mask"
                                                maxHeight={MEDIA_H}
                                                onSelect={
                                                    onSelectDetection ? (d) => onSelectDetection(d?.id ?? null) : undefined
                                                }
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setMediaFull(true)}
                                            title="全屏查看"
                                            aria-label="全屏查看标注图"
                                            className="absolute bottom-5 right-5 z-30 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900/70 text-white backdrop-blur-sm transition-colors hover:bg-zinc-900/85"
                                        >
                                            <IconFullScreen size={15} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="hidden h-auto shrink-0 md:block md:w-[54%]" />
                                )}

                                {/* 右：Tab + 内容 */}
                                <div className={cn("flex min-h-0 flex-1 flex-col border-t md:border-l md:border-t-0", HAIRLINE)}>
                                    <div className="flex shrink-0 items-center gap-1 overflow-x-auto px-4 pt-3">
                                        {DETAIL_TABS.map(({ key, label }) => {
                                            const active = key === tab
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => setTab(key)}
                                                    className={cn(
                                                        "relative shrink-0 rounded-md px-2.5 py-1.5 text-[14px] transition-colors",
                                                        active
                                                            ? "font-semibold text-zinc-900 dark:text-zinc-50"
                                                            : "font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200",
                                                    )}
                                                >
                                                    {label}
                                                    {active && (
                                                        <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-emerald-600 dark:bg-emerald-400" />
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                                        {tab === "analysis" && (
                                            <AnalysisTab
                                                summary={summaryText}
                                                analysis={analysis}
                                                evidence={evidence}
                                            />
                                        )}
                                        {tab === "causes" && <CausesTab candidates={candidates} />}
                                        {tab === "treatments" && (
                                            <TreatmentsTab treatments={treatments} followUp={followUp} />
                                        )}
                                        {tab === "cases" && (
                                            <CasesTab state={cases} onRetry={loadCases} diseaseName={result.diseaseName} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}

            {/* ══════════ ③ 全屏看大图 ══════════
                浮层里图片受"左列宽度"限制，竖构图再大也就 400px 级；
                全屏这一层把图片放到 92vw×剩余高度，是"看清病斑"的最后手段。
                检测框同样挂在图片盒里（fill + contain），放大后依然精确贴合。 */}
            {mediaFull &&
                imageSrc &&
                typeof document !== "undefined" &&
                createPortal(
                    <div data-lenis-prevent className="fixed inset-0 z-[178] flex flex-col bg-zinc-950">
                        <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                                <p className="truncate text-[14px] font-medium text-zinc-100">
                                    {result.diseaseName}
                                </p>
                                <p className="mt-0.5 text-[12px] text-zinc-400">
                                    {severityMeta.label} · 约 {Math.round(result.confidence * 100)}%
                                    {detections.length > 0 && ` · ${detections.length} 处病斑`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMediaFull(false)}
                                aria-label="退出全屏"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <IconCompression size={18} />
                            </button>
                        </div>
                        <div className="relative min-h-0 flex-1">
                            <DetectionOverlay
                                src={imageSrc}
                                detections={detections}
                                fill
                                fit="contain"
                                defaultView="mask"
                                maxHeight={100000}
                            />
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    )
}

// ---------------------------------------------------------------------------
// Tab 内容
// ---------------------------------------------------------------------------

/** 统一的小标题 */
function TabLabel({ children }: { children: ReactNode }) {
    return (
        <h4 className="mb-2 text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">{children}</h4>
    )
}

function AnalysisTab({
    summary,
    analysis,
    evidence,
}: {
    summary: string
    analysis: DiagnosisResult["analysis"]
    evidence: string[]
}) {
    const rows = analysis && analysis.length > 0 ? analysis : []
    return (
        <div className="space-y-4">
            <p className="rounded-xl bg-zinc-50 px-3.5 py-3 text-[13.5px] leading-[22px] text-zinc-700 dark:bg-white/[0.04] dark:text-zinc-200">
                {summary}
            </p>

            {rows.length > 0 && (
                <div className="space-y-2.5">
                    {rows.map((row, i) => (
                        <div key={i} className="flex gap-3">
                            <span className="w-[68px] shrink-0 text-[13px] leading-5 text-zinc-400">{row.label}</span>
                            <span className="flex min-w-0 flex-1 items-start gap-2">
                                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                <span className="text-[13.5px] leading-5 text-zinc-700 dark:text-zinc-200">{row.value}</span>
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {evidence.length > 0 && (
                <div>
                    <TabLabel>图中依据</TabLabel>
                    <ul className="space-y-1.5">
                        {evidence.map((item, i) => (
                            <li key={i} className="flex gap-2.5">
                                <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-emerald-50 text-[11px] font-semibold leading-none tabular-nums text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                    {i + 1}
                                </span>
                                <span className="text-[13px] leading-[18px] text-zinc-600 dark:text-zinc-300">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <p className="flex items-start gap-1.5 rounded-xl bg-zinc-50 px-3 py-2.5 text-[12px] leading-5 text-zinc-500 dark:bg-white/[0.04] dark:text-zinc-400">
                <IconInfo size={13} className="mt-[3px] shrink-0 self-start" />
                <span>以上为基于图像的初步判断，不能替代专业诊断，建议结合实际情况确认。</span>
            </p>
        </div>
    )
}

/** 可能性排序 → 颜色梯度（第一档才是"结论色"，后两档只作区分） */
const CAUSE_COLORS = ["#059669", "#D97706", "#A16207", "#71717A"]

function CausesTab({ candidates }: { candidates: DiseaseCandidate[] }) {
    if (candidates.length === 0) {
        return <EmptyHint text="模型未给出候选病害。" />
    }
    return (
        <div>
            <TabLabel>可能的病害（由高到低）</TabLabel>
            <ul className="space-y-4">
                {candidates.map((c, i) => {
                    const color = CAUSE_COLORS[Math.min(i, CAUSE_COLORS.length - 1)]
                    const hasP = typeof c.probability === "number"
                    return (
                        <li key={`${c.name}-${i}`}>
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="flex min-w-0 items-center gap-1.5">
                                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                                    <span className="truncate text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
                                        {c.name}
                                    </span>
                                    {c.excluded && (
                                        <span className="shrink-0 text-[11px] text-zinc-400">已排除</span>
                                    )}
                                </span>
                                {hasP && (
                                    <span className="shrink-0 text-[13px] font-medium tabular-nums text-zinc-500">
                                        {Math.round((c.probability as number) * 100)}%
                                    </span>
                                )}
                            </div>
                            {hasP && (
                                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
                                    <div
                                        className="h-full rounded-full transition-[width] duration-500"
                                        style={{ width: `${Math.round((c.probability as number) * 100)}%`, background: color }}
                                    />
                                </div>
                            )}
                            {c.note && (
                                <p className="mt-1.5 text-[12.5px] leading-5 text-zinc-500 dark:text-zinc-400">{c.note}</p>
                            )}
                        </li>
                    )
                })}
            </ul>
            <p className="mt-4 text-[12px] leading-5 text-zinc-400">
                可能性为模型基于图片给出的相对判断，不是统计学概率。
            </p>
        </div>
    )
}

function TreatmentsTab({ treatments, followUp }: { treatments: TreatmentLevel[]; followUp: string[] }) {
    return (
        <div className="space-y-5">
            {treatments.length === 0 && <EmptyHint text="模型未给出防治建议。" />}

            {treatments.map((t, i) => {
                const Glyph = TREATMENT_GLYPH[t.level] || IconLeaf
                const isChemical = t.level === "chemical"
                return (
                    <section key={`${t.level}-${i}`}>
                        <h4 className="flex items-center gap-1.5">
                            {/* 🚨 self-start 必需：图标组件的 className 落在外层 span 上，
                                flex 默认 align-items:stretch 会把该 span 拉满整行高，
                                里面的 svg 于是垂直居中 → 图标看起来比标题低一整行。 */}
                            <Glyph
                                size={15}
                                className={cn(
                                    "shrink-0 self-start",
                                    isChemical ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
                                )}
                            />
                            <span className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
                                {t.label || TREATMENT_LEVEL_META[t.level]?.label || "防治"}
                            </span>
                            {isChemical && typeof t.safetyIntervalDays === "number" && (
                                <span className="text-[11px] font-normal text-amber-600 dark:text-amber-400">
                                    安全间隔 {t.safetyIntervalDays} 天
                                </span>
                            )}
                        </h4>
                        <ul className="mt-2 space-y-1.5 pl-0.5">
                            {(t.actions || []).map((a, j) => (
                                <li key={j} className="flex gap-2">
                                    <Dot />
                                    <span className="text-[13px] leading-5 text-zinc-600 dark:text-zinc-300">{a}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )
            })}

            {followUp.length > 0 && (
                <section>
                    <h4 className="flex items-center gap-1.5">
                        <IconCamera size={15} className="shrink-0 self-start text-zinc-500" />
                        <span className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">补拍建议</span>
                    </h4>
                    <ul className="mt-2 space-y-1.5 pl-0.5">
                        {followUp.map((f, i) => (
                            <li key={i} className="flex gap-2">
                                <Dot />
                                <span className="text-[13px] leading-5 text-zinc-600 dark:text-zinc-300">{f}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {treatments.length > 0 && (
                <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2.5 text-[12px] leading-5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    <IconCaution size={13} className="mt-[3px] shrink-0 self-start" />
                    <span>不同品种和地区用药可能不同，建议结合当地植保部门指导调整。</span>
                </p>
            )}
        </div>
    )
}

function CasesTab({
    state,
    onRetry,
    diseaseName,
}: {
    state: CasesState
    onRetry: () => void
    diseaseName: string
}) {
    if (state.status === "loading" || state.status === "idle") {
        return (
            <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                        <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-zinc-100 dark:bg-white/[0.06]" />
                        <div className="min-w-0 flex-1 space-y-2 pt-1">
                            <div className="h-3.5 w-32 animate-pulse rounded bg-zinc-100 dark:bg-white/[0.06]" />
                            <div className="h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-white/[0.06]" />
                            <div className="h-3 w-20 animate-pulse rounded bg-zinc-100 dark:bg-white/[0.06]" />
                        </div>
                    </div>
                ))}
                <p className="flex items-center gap-1.5 pt-1 text-[12px] text-zinc-400">
                    <IconLoading size={12} className="shrink-0 animate-spin" />
                    正在联网检索「{diseaseName}」的历史案例…
                </p>
            </div>
        )
    }

    if (state.status === "unavailable") {
        return (
            <EmptyHint
                text="平台尚未配置联网检索，无法获取相似案例。管理员可在「设置 → 联网检索」中配置搜索服务后重试。"
            />
        )
    }

    if (state.status === "error" || state.status === "empty") {
        return (
            <div className="rounded-xl bg-zinc-50 px-3.5 py-3 dark:bg-white/[0.04]">
                <p className="text-[12.5px] leading-5 text-zinc-500 dark:text-zinc-400">
                    {state.status === "error"
                        ? `联网检索失败：${state.error || "未知原因"}`
                        : "暂未检索到可用的相似案例（可能是配图受防盗链限制）。"}
                </p>
                <button
                    type="button"
                    onClick={onRetry}
                    className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                    <IconRefresh size={12} className="shrink-0" />
                    重新检索
                </button>
            </div>
        )
    }

    return (
        <div>
            <TabLabel>相似案例（来自互联网）</TabLabel>
            <ul className="space-y-1">
                {state.cases.map((c) => (
                    <li key={c.id}>
                        <a
                            href={c.sourceUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-zinc-900/[0.04] dark:hover:bg-white/[0.05]"
                        >
                            <CaseThumb src={c.imageUrl} alt={c.title} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
                                    {c.title}
                                </span>
                                {c.description && (
                                    <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-5 text-zinc-500 dark:text-zinc-400">
                                        {c.description}
                                    </span>
                                )}
                                <span className="mt-1 block text-[11px] text-zinc-400">
                                    {[c.date, c.source].filter(Boolean).join(" · ")}
                                </span>
                            </span>
                            <IconRight size={14} className="mt-5 shrink-0 self-start text-zinc-300 dark:text-zinc-600" />
                        </a>
                    </li>
                ))}
            </ul>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-4 text-zinc-400">
                <IconCheck size={12} className="mt-[2px] shrink-0 self-start" />
                <span>以上内容由联网检索得到，配图与结论来自第三方站点，仅供参考。</span>
            </p>
        </div>
    )
}

function EmptyHint({ text }: { text: string }) {
    return (
        <p className="rounded-xl bg-zinc-50 px-3.5 py-3 text-[12.5px] leading-5 text-zinc-500 dark:bg-white/[0.04] dark:text-zinc-400">
            {text}
        </p>
    )
}

/** 分析中的骨架卡 —— 避免"点击后界面无反应"的空窗感（与收起态同构） */
export function DiagnosisCardSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-900/[0.07] dark:bg-zinc-900/60 dark:ring-white/10",
                "shadow-[0_1px_2px_rgba(9,9,11,0.04),0_10px_28px_-18px_rgba(9,9,11,0.20)]",
                className,
            )}
        >
            <div className="flex items-start gap-3.5 p-4 pb-3">
                <div className="h-[104px] w-[104px] shrink-0 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                <div className="min-w-0 flex-1 space-y-2 pt-1">
                    <div className="h-4 w-40 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                    <div className="h-5 w-28 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
                    <div className="h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                    <div className="flex items-center gap-1.5 pt-0.5">
                        <IconScan size={12} className="shrink-0 animate-pulse text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[12px] text-zinc-500">视觉模型分析中…</span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-9 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                ))}
            </div>
        </div>
    )
}

export default DiagnosisCard
