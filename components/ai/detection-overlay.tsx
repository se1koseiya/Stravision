"use client"

/**
 * 检测叠层 —— 病虫害诊断的「优雅前端反馈」
 *
 * 这是 YOLO / VLM 的 bbox 最终长什么样的地方。设计目标是让用户在结果出来之前
 * 就"感觉到"系统在认真看图，而不是干等一个 loading 圈。
 *
 * 四层反馈：
 *   1. **扫描光带** —— 分析中，一条 emerald 光带自上而下扫过，暗示"正在逐区域看"
 *   2. **取景四角** —— 常驻的四角括号，建立"这是一次成像分析"的仪式感
 *   3. **逐框错峰淡入** —— 框按索引依次 0.08s 错开，形成"逐个发现"的节奏
 *   4. **悬停/选中态** —— 其余框降透明、当前框加亮，弱化视觉噪音
 *
 * 工程约束（沿用项目既有约定）：
 * - 框用**归一化百分比**定位，因此图片任意缩放都自动贴合，无需监听 resize
 * - 动效走 framer-motion，**不写自定义 keyframes**（避免 `<style>` 模板串里的反引号陷阱）
 * - 完整尊重 `prefers-reduced-motion`
 * - 明暗主题：图上元素一律深底亮字，不依赖页面主题变量
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { getSeverityMeta, type Detection } from "@/lib/types/vision-diagnosis"
import { renderDiagnosisMask, maskFileName } from "@/lib/vision/mask-renderer"
import { IconDownload, IconPicture, IconScan } from "@/components/icon"

export interface DetectionOverlayProps {
    /** 图片地址（dataURL 或 http(s) URL） */
    src: string
    alt?: string
    /** 检测框。来自 YOLO 或 VLM 均可 —— 两者共用同一 bbox 协议 */
    detections?: Detection[]
    /** 是否处于分析中（显示扫描光带） */
    scanning?: boolean
    /** 点击某个框 */
    onSelect?: (detection: Detection | null) => void
    className?: string
    /** 图片最大展示高度 */
    maxHeight?: number
    /**
     * 首次呈现用哪个视图（默认 `raw`）。
     *
     * 诊断场景请传 `"mask"` —— 用户要的是"在我这张图上圈出病害部位"，
     * 打开就先看到矩形框会显得像没做处理。遮罩图合成完成前会先显示原图 +
     * 「正在生成遮罩」提示，合成失败则自动留在原图，不会白屏。
     */
    defaultView?: "raw" | "mask"
    /**
     * **铺满模式** —— 用于卡片里的「媒体块」：由父容器给出尺寸 + 圆角 + `overflow-hidden`，
     * 本组件 `absolute inset-0` 铺满它。
     *
     * 与默认模式的区别：
     * - 不画「满宽深色观看区」（父容器自己定尺寸）、不画取景四角、不画底部图注；
     * - 图片按 `cover` 铺满（默认模式是 `contain` + 居中留边）；
     * - 左上角出现 `● N 处病害` 角标，右上角是单个「原图 / 遮罩」切换 +
     *   下载，而不是两段式分段器。
     *
     * ⚠️ `cover` 会**裁掉一边**，所以坐标系不能再用「槽」的百分比 ——
     * 内部会先算出 cover 盒（图片真实渲染区域）再把框挂上去，见组件内注释。
     */
    fill?: boolean
    /**
     * 铺满模式下图片怎么适配盒子（仅在 `fill` 生效时有效，默认 `cover`）：
     *
     * - `"cover"`：填满整块，**会裁掉一边** —— 适合小而方的媒体位（缩略图）；
     * - `"contain"`：完整显示，**可能留边** —— 诊断大图必须用这个：
     *   「看不清病灶」比「留一点边」严重得多，裁掉的部分正好是病斑时最糟。
     *
     * 两种模式的差别只在「算出来的图片盒尺寸」那一步，
     * 检测框始终挂在图片盒里 → 百分比定位在两种模式下都成立。
     */
    fit?: "cover" | "contain"
}

/** 尊重系统的"减少动态效果"偏好 */
function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
        setReduced(mq.matches)
        const handler = () => setReduced(mq.matches)
        mq.addEventListener("change", handler)
        return () => mq.removeEventListener("change", handler)
    }, [])

    return reduced
}

/** 取景框四角的 L 形括号 */
function CornerBrackets({ color }: { color: string }) {
    const base = "absolute h-5 w-5 pointer-events-none"
    const stroke = { borderColor: color }
    return (
        <>
            <span className={cn(base, "left-2 top-2 border-l-2 border-t-2 rounded-tl-sm")} style={stroke} />
            <span className={cn(base, "right-2 top-2 border-r-2 border-t-2 rounded-tr-sm")} style={stroke} />
            <span className={cn(base, "bottom-2 left-2 border-b-2 border-l-2 rounded-bl-sm")} style={stroke} />
            <span className={cn(base, "bottom-2 right-2 border-b-2 border-r-2 rounded-br-sm")} style={stroke} />
        </>
    )
}

export function DetectionOverlay({
    src,
    alt = "诊断图片",
    detections = [],
    scanning = false,
    onSelect,
    className,
    maxHeight = 420,
    defaultView = "raw",
    fill = false,
    fit = "cover",
}: DetectionOverlayProps) {
    const reduceMotion = usePrefersReducedMotion()
    const [activeId, setActiveId] = useState<string | null>(null)

    /* 🚨 图片宽高比（2026-10-04 修「标的位置不准确」）——
       外层是 `w-full`（卡片宽度）+ 图片 `object-contain`：
       竖构图会被**居中留出左右黑边**，而检测框原先按**外层容器宽度**取百分比，
       于是整组框偏到黑边上（实测 900×1600 竖图每侧留黑 ~217px，框 3 整块落在左侧黑边区）。
       解法：图片 + 检测框共用一个「图片盒」，盒宽 = min(100%, maxHeight × 比例) + aspect-ratio 锁定
       → 盒子的坐标系 == 图片的渲染坐标系 → 百分比定位天然对齐（实测偏差 0.000）。
       遮罩图由 mask-renderer 按 naturalWidth/Height 等比合成，比例与原图一致，切换视图不跳变。 */
    const imgRef = useRef<HTMLImageElement | null>(null)
    const [ratio, setRatio] = useState<number | null>(null)
    const handleImgLoad = useCallback(() => {
        const el = imgRef.current
        if (!el) return
        const w = el.naturalWidth
        const h = el.naturalHeight
        if (!w || !h) return
        const r = w / h
        // 值相同就不 setState，避免 raw ↔ mask 切换时多余重渲染
        setRatio((prev) => (prev !== null && Math.abs(prev - r) < 1e-4 ? prev : r))
    }, [])

    /* ── 遮罩图：把框真正画进图片，出一张可查看 / 可下载的成品 ──────────
       与上面的 DOM 叠层是**互补**的两条呈现：叠层负责交互（悬停 / 选中），
       遮罩图负责"交付"（保存、转发、贴进报告）。
       合成逻辑在 `lib/vision/mask-renderer.ts`：整幅压暗 → 病灶擦回原亮度 → 描边 + 标签。 */
    const [view, setView] = useState<"raw" | "mask">("raw")
    const [maskUrl, setMaskUrl] = useState<string | null>(null)
    const [rendering, setRendering] = useState(false)
    /** 合成彻底失败（跨域污染 / canvas 不可用）—— 用于收掉"正在合成"的过渡文案，别让用户空等 */
    const [maskFailed, setMaskFailed] = useState(false)
    /** 是否已完成「画框 → 遮罩图」的自动交接 */
    const [handedOff, setHandedOff] = useState(false)

    /** 检测框一变就作废缓存，避免展示过期标注 */
    const detKey = useMemo(
        () =>
            JSON.stringify(
                detections.map((d) => [d.id, d.bbox.x, d.bbox.y, d.bbox.w, d.bbox.h, d.severity ?? ""]),
            ),
        [detections],
    )
    useEffect(() => {
        setMaskUrl(null)
        setMaskFailed(false)
        setHandedOff(false)
    }, [src, detKey])

    const buildMask = useCallback(async () => {
        if (maskUrl) return maskUrl
        if (detections.length === 0) return null
        setRendering(true)
        try {
            const url = await renderDiagnosisMask(src, detections)
            setMaskUrl(url)
            return url
        } catch (e) {
            // 合成失败（跨域污染 / canvas 不可用）只影响"出图"，
            // 叠层展示不受影响 —— 静默回退，不打断诊断流程。
            console.warn("[DetectionOverlay] 遮罩图合成失败，回退到叠层:", e)
            setMaskFailed(true)
            return null
        } finally {
            setRendering(false)
        }
    }, [maskUrl, src, detections])

    const switchView = async (next: "raw" | "mask") => {
        if (next === "mask") await buildMask()
        setView(next)
    }

    const downloadMask = async () => {
        const url = await buildMask()
        if (!url) return
        const a = document.createElement("a")
        a.href = url
        a.download = maskFileName()
        document.body.appendChild(a)
        a.click()
        a.remove()
    }

    /* 有框就后台预生成遮罩图 —— 用户点「遮罩图」时是瞬时的，不用等一次 canvas 合成。
       ⚠️ triedRef 是必需的：合成失败时 maskUrl 会一直是 null，
       没有它这个 effect 会因依赖变化而反复重试，直接把浏览器卡死。 */
    const hasBoxes = detections.length > 0

    const triedRef = useRef(false)
    useEffect(() => {
        triedRef.current = false
    }, [src, detKey])
    useEffect(() => {
        if (!hasBoxes || maskUrl || rendering || triedRef.current) return
        triedRef.current = true
        void buildMask()
    }, [hasBoxes, maskUrl, rendering, buildMask])

    /* 诊断场景的「交接」节奏：先让用户看清 AI 画出来的框（逐框错峰淡入），
       停留一下，再自动转成遮罩图 —— 也就是用户要的"画框后转交画遮罩图"。
       合成失败时 maskUrl 一直是 null，这里就永远不切 —— 用户看到的仍是原图 + 叠层，
       不会出现"说好的遮罩图却是空白"。 */
    const revealStartedAtRef = useRef(Date.now())
    useEffect(() => {
        revealStartedAtRef.current = Date.now()
    }, [src, detKey])

    useEffect(() => {
        if (defaultView !== "mask" || !maskUrl || handedOff) return
        if (reduceMotion) {
            setView("mask")
            setHandedOff(true)
            return
        }
        // 框动画本身要 0.08s×N + 0.28s；再留 ~0.9s 让眼睛跟上，然后交接
        const revealMs = 800 + 90 * detections.length
        const wait = Math.max(0, revealStartedAtRef.current + revealMs - Date.now())
        const t = setTimeout(() => {
            setView("mask")
            setHandedOff(true)
        }, wait)
        return () => clearTimeout(t)
    }, [defaultView, maskUrl, handedOff, reduceMotion, detections.length])

    /** 遮罩视图下框已经画进图里，不再叠 DOM 框 / 取景角 */
    const showLiveOverlay = view === "raw"
    const currentSrc = view === "mask" && maskUrl ? maskUrl : src
    /** 声称在遮罩视图、但图还没合成好 —— 给一句明确提示，别让用户以为没生效 */
    const maskPending = view === "mask" && !maskUrl && hasBoxes
    /** 处在"已画框、正等交接"的过渡态 */
    const handoffPending =
        defaultView === "mask" && view === "raw" && hasBoxes && !handedOff && !maskFailed

    /* ── 铺满模式：槽尺寸量测 + cover 盒 ───────────────────────────────
       fill 模式下父容器给尺寸（固定高 × flex 宽），图片按 `cover` 铺满 →
       **必然裁掉一边**（槽更宽→裁左右；槽更高→裁上下）。
       若把检测框按「槽」的百分比定位，被裁掉的那部分比例会整体错位 ——
       等于把「标的位置不准确」重演一遍。
       所以先按图片比例与槽比例算出 **cover 盒**（= 图片真实渲染区域），
       框挂在 cover 盒之下，百分比才等于图片自己的坐标。 */
    const slotRef = useRef<HTMLDivElement | null>(null)
    const [slot, setSlot] = useState<{ w: number; h: number } | null>(null)

    useEffect(() => {
        if (!fill) return
        const el = slotRef.current
        if (!el) return
        const measure = () => {
            const w = el.clientWidth
            const h = el.clientHeight
            if (!w || !h) return
            setSlot((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }))
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [fill])

    /**
     * 铺满模式下「图片真实渲染区域」的尺寸 —— 也就是检测框的坐标系。
     *
     * 槽是固定的、图片比例是任意的，两者一撞必然有取舍：
     *   · `cover`：取**能盖住整块槽**的最小等比盒 → 有一边被裁；
     *   · `contain`：取**能整个塞进槽**的最大等比盒 → 有一边留边。
     * 无论哪种，框都挂在算出来的这个盒子里，所以百分比定位都 == 图片像素坐标。
     */
    const imageBox = useMemo(() => {
        if (!slot || !ratio || slot.w <= 0 || slot.h <= 0) return null
        const slotRatio = slot.w / slot.h
        const wider = ratio >= slotRatio
        if (fit === "contain") {
            return wider ? { w: slot.w, h: slot.w / ratio } : { w: slot.h * ratio, h: slot.h }
        }
        return wider ? { w: slot.h * ratio, h: slot.h } : { w: slot.w, h: slot.w / ratio }
    }, [slot, ratio, fit])

    /** 检测框是否具备「可信坐标系」——默认模式只要图片比例，铺满模式还要图片盒 */
    const boxesReady = ratio !== null && (!fill || imageBox !== null)

    /** 检测框节点 —— 两套壳共用；必须挂在「图片渲染区域」之下 */
    const boxesNode = (
        <AnimatePresence>
            {boxesReady &&
                showLiveOverlay &&
                detections.map((detection, index) => {
                    const isActive = activeId === detection.id
                    const dimmed = activeId !== null && !isActive
                    const color = detection.severity ? getSeverityMeta(detection.severity).color : "#34D399"

                    return (
                        <motion.button
                            key={detection.id}
                            type="button"
                            /* 供验收探针稳定地选中"检测框"本身（右上角还有遮罩/下载按钮） */
                            data-detection-index={index}
                            className="absolute cursor-pointer text-left"
                            style={{
                                left: `${detection.bbox.x * 100}%`,
                                top: `${detection.bbox.y * 100}%`,
                                width: `${detection.bbox.w * 100}%`,
                                height: `${detection.bbox.h * 100}%`,
                            }}
                            initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                            animate={{ opacity: dimmed ? 0.35 : 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{
                                delay: reduceMotion ? 0 : 0.08 * index,
                                duration: 0.28,
                                ease: "easeOut",
                            }}
                            onMouseEnter={() => setActiveId(detection.id)}
                            onMouseLeave={() => setActiveId(null)}
                            onFocus={() => setActiveId(detection.id)}
                            onBlur={() => setActiveId(null)}
                            onClick={() => onSelect?.(activeId === detection.id ? null : detection)}
                            aria-label={`${detection.label}，置信度 ${Math.round(detection.confidence * 100)}%`}
                        >
                            {/* 框体：外描边保证在任何底色上都可辨 */}
                            <span
                                className="absolute inset-0 rounded-md transition-all duration-200"
                                style={{
                                    border: `2px solid ${color}`,
                                    boxShadow: isActive
                                        ? `0 0 0 2px rgba(0,0,0,0.35), 0 0 18px ${color}66`
                                        : "0 0 0 1px rgba(0,0,0,0.28)",
                                    background: isActive ? `${color}1F` : `${color}14`,
                                }}
                            />

                            {/* 标签胶囊：深底亮字，不依赖页面主题 */}
                            <span
                                className="absolute -top-0.5 left-0 flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none whitespace-nowrap"
                                style={{
                                    background: "rgba(9,9,11,0.86)",
                                    color: "#F4F4F5",
                                    transform: "translateY(-100%)",
                                }}
                            >
                                <span
                                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ background: color }}
                                />
                                <span className="truncate">{detection.label}</span>
                                <span className="shrink-0 tabular-nums text-zinc-400">
                                    {Math.round(detection.confidence * 100)}%
                                </span>
                            </span>

                            {/* 序号：小框里唯一保证可见的标识 */}
                            <span
                                className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold leading-none"
                                style={{ background: color, color: "#09090B" }}
                            >
                                {index + 1}
                            </span>
                        </motion.button>
                    )
                })}
        </AnimatePresence>
    )

    /* ── 铺满模式：由父容器定尺寸，本组件铺满它 ──────────────────────
       没有「满宽深色观看区 / 取景四角 / 底部图注」——那些是默认模式的语言。 */
    if (fill) {
        return (
            <div ref={slotRef} className={cn("absolute inset-0 overflow-hidden", className)}>
                {/* 🚨 图片盒 == 图片渲染区域 == 检测框坐标系（见上方注释）。
                    量好之前先按槽铺满，避免闪一下空白。 */}
                <div
                    className="absolute left-1/2 top-1/2"
                    style={
                        imageBox
                            ? {
                                  width: `${imageBox.w}px`,
                                  height: `${imageBox.h}px`,
                                  transform: "translate(-50%, -50%)",
                              }
                            : { width: "100%", height: "100%" }
                    }
                >
                    <img
                        ref={imgRef}
                        src={currentSrc}
                        alt={alt}
                        draggable={false}
                        onLoad={handleImgLoad}
                        className={cn(
                            "block h-full w-full select-none",
                            fit === "contain" ? "object-contain" : "object-cover",
                        )}
                    />
                    {!scanning && boxesNode}
                </div>

                {/* 左上：病害数角标（替代默认模式底部的图注） */}
                {!scanning && (hasBoxes || maskPending || handoffPending) && (
                    <span className="pointer-events-none absolute left-2 top-2 z-20 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900/78 px-2 py-1 text-[12px] font-medium leading-none text-white backdrop-blur-sm">
                        <span
                            className={cn(
                                "inline-block h-1.5 w-1.5 rounded-full bg-emerald-400",
                                (maskPending || handoffPending) && "animate-pulse",
                            )}
                        />
                        {maskPending || handoffPending ? "正在合成遮罩" : `${detections.length} 处病害`}
                    </span>
                )}

                {/* 右上：单键切换原图/遮罩 + 下载（参考稿是单按钮，不是分段器） */}
                {hasBoxes && !scanning && (
                    <div className="absolute right-2 top-2 z-20 flex items-center gap-0.5 rounded-lg bg-zinc-900/78 p-0.5 backdrop-blur-sm">
                        <button
                            type="button"
                            onClick={() => switchView(view === "mask" ? "raw" : "mask")}
                            aria-pressed={view === "mask"}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] leading-none text-white transition-colors hover:bg-white/10"
                        >
                            {view === "mask" ? <IconPicture size={13} /> : <IconScan size={13} />}
                            {rendering ? "生成中…" : view === "mask" ? "原图" : "遮罩"}
                        </button>
                        <button
                            type="button"
                            onClick={downloadMask}
                            title="下载标注图"
                            aria-label="下载标注图"
                            className="rounded-md p-1 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <IconDownload size={13} />
                        </button>
                    </div>
                )}

                {/* 扫描光带 / 不确定进度条：与默认模式同一套反馈 */}
                {scanning && !reduceMotion && (
                    <motion.div
                        className="pointer-events-none absolute left-0 right-0"
                        style={{
                            height: 96,
                            background:
                                "linear-gradient(180deg, rgba(52,211,153,0) 0%, rgba(52,211,153,0.30) 50%, rgba(52,211,153,0) 100%)",
                        }}
                        initial={{ top: "-20%" }}
                        animate={{ top: ["-20%", "104%"] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                    />
                )}
                {scanning && !hasBoxes && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-white/10">
                        {reduceMotion ? (
                            <div className="h-full w-1/3 bg-emerald-400" />
                        ) : (
                            <motion.div
                                className="h-full w-1/3 rounded-full bg-emerald-400"
                                animate={{ x: ["-110%", "330%"] }}
                                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                            />
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div
            className={cn(
                "relative w-full overflow-hidden rounded-xl bg-zinc-950",
                // 一层容器原则：外框只用一条极细描边，不做嵌套装饰
                "ring-1 ring-zinc-900/10 dark:ring-white/10",
                className,
            )}
            /* 外层容器保持「满宽深色观看区」——原设计语言（取景四角 / 扫描光带 / 图注都在这一层）。
               ⚠️ 这里**不能**用来给检测框定位：满宽 ≠ 图片渲染宽度，
               竖构图时 object-contain 会居中留黑，百分比定位就会偏到黑边上。
               真正的坐标系是下面的「图片盒」。
               maxHeight 只作硬上限兜底（图片盒自己也会收敛）。 */
            style={{ maxHeight }}
        >
            {/* 🚨 图片盒 = 整个叠层的**坐标系**（2026-10-04 修「标的位置不准确」）。
                根因（拿到了真实几何证据）：外层是 w-full（卡片宽），图片 object-contain 遇到竖构图
                会被**居中留出左右黑边**（实测 900×1600 竖图在 636px 宽的卡片里，每侧留黑 ~217px），
                而检测框原先按**外层容器宽度**取百分比 → 整组框偏到黑边上
                （用户截图里「早期紫红点」整块落在左侧黑边区、框 1 探进右侧黑边）。
                解法：图片 + 检测框共用一个盒子，盒宽 = min(100%, maxHeight × 图片比例) 且 aspect-ratio 锁定
                → 盒子 == 图片渲染区域 → 百分比定位与图片像素一一对应（实测偏差 0.000）。
                遮罩图由 mask-renderer 按 naturalWidth/Height 等比合成，比例与原图一致，切换视图不跳变。 */}
            <div
                className="relative mx-auto"
                style={
                    ratio
                        ? {
                            width: `min(100%, ${(maxHeight * ratio).toFixed(4)}px)`,
                            aspectRatio: String(ratio),
                            maxHeight,
                        }
                        : { width: "100%" }
                }
            >
                {/* 底图：遮罩视图下换成合成图（框已经画进去了） */}
                <img
                    ref={imgRef}
                    src={currentSrc}
                    alt={alt}
                    draggable={false}
                    onLoad={handleImgLoad}
                    className={cn(
                        "block select-none object-contain",
                        ratio ? "h-full w-full" : "h-auto w-full",
                    )}
                    style={ratio ? undefined : { maxHeight }}
                />

                {/* 检测框（遮罩视图下隐藏：框已经画进图里了，再叠一层就是重影）
                    ratio 未就绪（图片还没 load）时不画框 —— 坐标系还没建立，画出来必然错位 */}
                {boxesNode}
            </div>

            {/* 右上：视图切换 + 导出。只在真的有框时出现 ——
                没有检出结果时，"遮罩图"这个入口本身就没有意义。 */}
            {hasBoxes && !scanning && (
                <div className="absolute right-2 top-2 z-20 flex items-center gap-0.5 rounded-md bg-zinc-900/82 p-0.5 backdrop-blur-sm">
                    <button
                        type="button"
                        onClick={() => switchView("raw")}
                        aria-pressed={view === "raw"}
                        className={cn(
                            "rounded px-2 py-1 text-[10px] leading-none transition-colors",
                            view === "raw"
                                ? "bg-white/15 text-white"
                                : "text-zinc-400 hover:text-zinc-100",
                        )}
                    >
                        原图
                    </button>
                    <button
                        type="button"
                        onClick={() => switchView("mask")}
                        aria-pressed={view === "mask"}
                        className={cn(
                            "rounded px-2 py-1 text-[10px] leading-none transition-colors",
                            view === "mask"
                                ? "bg-emerald-500/25 text-emerald-200"
                                : "text-zinc-400 hover:text-zinc-100",
                        )}
                    >
                        {rendering ? "生成中…" : "遮罩图"}
                    </button>
                    <button
                        type="button"
                        onClick={downloadMask}
                        title="下载标注图"
                        aria-label="下载标注图"
                        className="rounded p-1 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <IconDownload size={12} />
                    </button>
                </div>
            )}

            {/* 取景四角：有框或分析中时出现，暗示"成像分析" */}
            <AnimatePresence>
                {(scanning || (hasBoxes && showLiveOverlay)) && (
                    <motion.div
                        key="brackets"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <CornerBrackets color="rgba(52,211,153,0.85)" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 扫描光带 */}
            {scanning && !reduceMotion && (
                <motion.div
                    className="pointer-events-none absolute left-0 right-0"
                    style={{
                        height: 96,
                        background:
                            "linear-gradient(180deg, rgba(52,211,153,0) 0%, rgba(52,211,153,0.30) 50%, rgba(52,211,153,0) 100%)",
                    }}
                    initial={{ top: "-20%" }}
                    animate={{ top: ["-20%", "104%"] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                />
            )}

            {/* 分析中但还没有框：底部一条不确定进度条，避免视觉空窗 */}
            {scanning && !hasBoxes && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-white/10">
                    {reduceMotion ? (
                        <div className="h-full w-1/3 bg-emerald-400" />
                    ) : (
                        <motion.div
                            className="h-full w-1/3 rounded-full bg-emerald-400"
                            animate={{ x: ["-110%", "330%"] }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                        />
                    )}
                </div>
            )}

            {/* 检测框层已移入下面的「图片盒」内渲染 ——
                它必须与图片共享同一个坐标系，挂在这一层（满宽观看区）会重现错位。 */}

            {/* 图注：分析中 / 命中数 */}
            <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-zinc-900/80 px-2 py-1 text-[10px] leading-none text-zinc-300 backdrop-blur-sm">
                {scanning ? (
                    <>
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        正在分析画面
                    </>
                ) : maskPending || handoffPending ? (
                    <>
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        {handoffPending
                            ? `已框出 ${detections.length} 处病害部位 · 正在合成遮罩图…`
                            : "正在生成病害遮罩…"}
                    </>
                ) : hasBoxes ? (
                    <>
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {view === "mask"
                            ? `已在原图圈出 ${detections.length} 处病害部位`
                            : `命中 ${detections.length} 处异常`}
                    </>
                ) : (
                    <>未检出异常区域</>
                )}
            </div>
        </div>
    )
}

export default DetectionOverlay
