/**
 * 病虫害图像诊断端点
 *
 * POST /api/vision/diagnose
 *
 * 与 `/api/vlm/analyze-frame`（生长巡检）的区别：
 * - analyze-frame：回答「植株长到哪个阶段、整体健康度多少」——巡检评分语义；
 * - 本端点：回答「这是什么病/虫、有多严重、依据是什么、怎么治」——诊断语义。
 *
 * 两者共用 `lib/ai/vision/vision-gateway.ts` 的底层调用链，
 * 因此模型选择与凭据解析在项目内**只有一处实现**，不会出现"设置里换了模型但诊断不生效"。
 *
 * 请求体：
 *   {
 *     images: string[]        // 必填，dataURL 或 http(s) URL，最多 4 张
 *     context?: string        // 可选，用户补充信息（部位/环境/用药史）
 *     model?: string          // 可选，指定模型 id
 *     apiKey?: string         // 可选，用户自带 Key（不消耗平台额度）
 *     apiUrl?: string         // 可选，用户自定义端点
 *     withBoundingBoxes?: boolean  // 可选，默认 true
 *   }
 *
 * 响应体：
 *   成功：{ ok: true, result: DiagnosisResult }
 *   失败：{ ok: false, error: string, errorKind: string, degraded?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { diagnose } from '@/lib/ai/vision/vision-gateway'

export const runtime = 'nodejs'
export const maxDuration = 120

/** 单次诊断最多几张图（全株 + 叶面 + 叶背 + 果实特写） */
const MAX_IMAGES = 4
/** 单张 dataURL 长度上限（约 8MB 原始图像） */
const MAX_DATA_URL_CHARS = 11_000_000

/** errorKind → HTTP 状态码 */
function statusFor(kind?: string): number {
    switch (kind) {
        case 'no_vision_model':
        case 'no_credentials':
        case 'internal':
            return 400
        case 'timeout':
            return 504
        case 'upstream':
        case 'bad_output':
            return 502
        default:
            return 500
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ ok: false, error: '未登录', errorKind: 'internal' }, { status: 401 })
        }

        const body = await req.json().catch(() => null)
        if (!body || typeof body !== 'object') {
            return NextResponse.json(
                { ok: false, error: '请求体格式错误', errorKind: 'internal' },
                { status: 400 },
            )
        }

        // 兼容两种入参：images 数组（推荐）或单张 imageData（历史调用方）
        const rawImages: unknown[] = Array.isArray(body.images)
            ? body.images
            : typeof body.imageData === 'string'
              ? [body.imageData]
              : []

        const images = rawImages
            .filter((v): v is string => typeof v === 'string' && v.length > 0)
            .filter((v) => v.startsWith('data:image/') || /^https?:\/\//i.test(v))
            .slice(0, MAX_IMAGES)

        if (images.length === 0) {
            return NextResponse.json(
                { ok: false, error: '请上传至少一张图片（支持 dataURL 或 http(s) 链接）', errorKind: 'internal' },
                { status: 400 },
            )
        }

        const oversized = images.find((v) => v.length > MAX_DATA_URL_CHARS)
        if (oversized) {
            return NextResponse.json(
                { ok: false, error: '图片过大，请压缩后重试（单张不超过约 8MB）', errorKind: 'internal' },
                { status: 413 },
            )
        }

        const url = new URL(req.url)

        const out = await diagnose({
            images,
            context: typeof body.context === 'string' ? body.context.slice(0, 2000) : undefined,
            model: typeof body.model === 'string' ? body.model : undefined,
            apiKey: typeof body.apiKey === 'string' ? body.apiKey : undefined,
            apiUrl: typeof body.apiUrl === 'string' ? body.apiUrl : undefined,
            withBoundingBoxes: body.withBoundingBoxes !== false,
            // 支持 ?timeoutMs= 调试用（默认 60s，上限 120s）
            timeoutMs: Math.min(Number(url.searchParams.get('timeoutMs')) || 60_000, 120_000),
        })

        if (!out.ok || !out.result) {
            return NextResponse.json(
                {
                    ok: false,
                    error: out.error || '诊断失败',
                    errorKind: out.errorKind,
                    degraded: out.degraded,
                    // 带上"试过哪些模型、各自为什么失败"，否则用户只看到一句上游报错，
                    // 无从判断是没买该模型、额度耗尽，还是模型不支持图片
                    model: out.model,
                    attempted: out.attempted,
                },
                { status: statusFor(out.errorKind) },
            )
        }

        return NextResponse.json({
            ok: true,
            result: out.result,
            // 实际生效的模型（回退了候选时与请求里的 model 不同）
            model: out.model,
            finishReason: out.finishReason,
        })
    } catch (error: any) {
        console.error('[vision/diagnose] unexpected error:', error)
        return NextResponse.json(
            { ok: false, error: error?.message || '服务内部错误', errorKind: 'internal' },
            { status: 500 },
        )
    }
}
