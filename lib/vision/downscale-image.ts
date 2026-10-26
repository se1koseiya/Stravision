/**
 * 浏览器端图片降采样 —— 病历缩略图的生产者
 *
 * 为什么需要它：
 *   诊断底图是用户上传的原图（dataURL，动辄 1~4MB）。病历要长期存库，
 *   直接把原图塞进 PostgreSQL 会让 `diagnosis_records.image_thumbnail` 迅速膨胀
 *   到几十上百 MB。所以入档前统一压到长边 640 / JPEG 0.72（实测 60~120KB）。
 *
 * 降级策略（三级，任何一级成功即返回）：
 *   1. canvas 直出 JPEG
 *   2. 若体积仍超预算 → 降 quality
 *   3. 再超 → 缩到长边 480
 *   全部失败（画布被跨域污染 / 解码失败 / 非浏览器环境）→ 返回 null。
 *
 * ⚠️ 返回 null 是**合法结果**，不是错误：调用方照常入档，只是病历没有缩略图。
 *    绝不允许因为"压不出图"就跳过入档 —— 那会丢病历。
 */

export interface DownscaleOptions {
    /** 长边目标像素，默认 640 */
    maxSize?: number
    /** JPEG 质量，默认 0.72 */
    quality?: number
    /** 结果 dataURL 的字符数上限，默认 1.2MB（与 API 侧封顶一致） */
    maxChars?: number
}

/** 把图片源（dataURL / blob URL / http(s) URL）压成小尺寸 JPEG dataURL。失败返回 null。 */
export async function downscaleToDataUrl(
    src: string,
    options: DownscaleOptions = {}
): Promise<string | null> {
    if (typeof window === "undefined" || !src) return null

    const maxSize = options.maxSize ?? 640
    const quality = options.quality ?? 0.72
    const maxChars = options.maxChars ?? 1_200_000

    let img: HTMLImageElement
    try {
        img = await loadImage(src)
    } catch {
        return null
    }

    if (!img.naturalWidth || !img.naturalHeight) return null

    // 三级降级：先按目标参数出图，超预算就压质量，再超就压尺寸
    const attempts: Array<{ size: number; q: number }> = [
        { size: maxSize, q: quality },
        { size: maxSize, q: 0.55 },
        { size: Math.round(maxSize * 0.75), q: 0.5 },
    ]

    for (const attempt of attempts) {
        const out = renderToDataUrl(img, attempt.size, attempt.q)
        if (out && out.length <= maxChars) return out
    }

    // 三次都超预算：返回最后一次结果（宁可略超，也比完全没图好）——
    // 但若最后一次仍超过 2× 预算就丢弃，避免真的把库撑爆。
    const fallback = renderToDataUrl(img, Math.round(maxSize * 0.75), 0.5)
    if (fallback && fallback.length <= maxChars * 2) return fallback
    return null
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        // 同源 / dataURL 不影响；跨域图设 anonymous 才有机会拿到不污染的画布
        img.crossOrigin = "anonymous"
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error("image load failed"))
        img.src = src
    })
}

/** 等比缩到长边 <= maxSize，绘制到 canvas 并导出 JPEG dataURL。 */
function renderToDataUrl(img: HTMLImageElement, maxSize: number, quality: number): string | null {
    const w0 = img.naturalWidth
    const h0 = img.naturalHeight
    const scale = Math.min(1, maxSize / Math.max(w0, h0))
    const w = Math.max(1, Math.round(w0 * scale))
    const h = Math.max(1, Math.round(h0 * scale))

    try {
        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")
        if (!ctx) return null
        ctx.drawImage(img, 0, 0, w, h)
        return canvas.toDataURL("image/jpeg", quality)
    } catch {
        // getImageData / toDataURL 抛异常 = 画布被跨域污染
        return null
    }
}
