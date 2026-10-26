/**
 * 相似案例检索端点
 *
 * POST /api/vision/similar-cases
 *
 * 请求体：
 *   {
 *     diseaseName: string        // 必填，模型给出的病名
 *     category?: DiseaseCategory // 可选，病害大类
 *     crop?: string              // 可选，作物名（默认「草莓」）
 *     limit?: number             // 可选，最多几条（默认 3，上限 6）
 *   }
 *
 * 响应体：
 *   成功：{ ok: true, available: true, cases: SimilarCase[] }
 *   未配置检索：{ ok: false, available: false, error: string }
 *   检索失败  ：{ ok: false, available: true, error: string }
 *
 * ⚠️ 这是**独立于诊断**的二次检索：诊断卡先渲染（不阻塞用户看结论），
 *    用户在「相似案例」里才触发本端点，结果再由 `similar-cases.ts` 缓存 6 小时。
 *    所以这里可以放心给 30s 的预算 —— 它不在用户的等待关键路径上。
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { findSimilarCases } from '@/lib/ai/vision/similar-cases'
import type { DiseaseCategory } from '@/lib/types/vision-diagnosis'

export const runtime = 'nodejs'
export const maxDuration = 45

const VALID_CATEGORIES: DiseaseCategory[] = [
    'fungal',
    'bacterial',
    'viral',
    'pest',
    'physiological',
    'nutrient',
    'unknown',
]

export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 })
    }

    let body: any
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ ok: false, error: '请求体不是合法 JSON' }, { status: 400 })
    }

    const diseaseName = typeof body?.diseaseName === 'string' ? body.diseaseName.trim() : ''
    if (!diseaseName) {
        return NextResponse.json({ ok: false, error: '缺少 diseaseName' }, { status: 400 })
    }

    const category: DiseaseCategory | undefined = VALID_CATEGORIES.includes(body?.category)
        ? body.category
        : undefined

    const result = await findSimilarCases({
        diseaseName,
        category,
        crop: typeof body?.crop === 'string' && body.crop.trim() ? body.crop.trim() : undefined,
        limit: typeof body?.limit === 'number' ? body.limit : undefined,
    })

    // 未配置检索是「平台能力缺失」，不是错误 —— 用 200 返回，让卡片给出准确引导
    if (!result.available) {
        return NextResponse.json(result, { status: 200 })
    }
    if (!result.ok && result.cases.length === 0) {
        return NextResponse.json(result, { status: 200 })
    }
    return NextResponse.json(result, { status: 200 })
}
