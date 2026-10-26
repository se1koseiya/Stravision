/**
 * 生长巡检分析端点（已重构）
 *
 * POST /api/vlm/analyze-frame
 *
 * ── 本次重构做了什么 ──
 * 改造前本文件自己解析 apiKey/apiUrl（兜底到环境变量）、硬编码默认模型 `qwen3-vl-plus`、
 * 自建 fetch。这违反了项目铁律「AI 辅助接口必须复用主对话模型链路」——
 * 后果是用户在设置里换的视觉模型不生效、自带 Key 不被识别。
 *
 * 现在改为调用 `lib/ai/vision/vision-gateway.ts` 的 `callVisionModel()`，
 * 与病虫害诊断端点共用同一条「选模型 → 解析凭据 → 适配请求体 → 超时 → 抽文本」链路。
 *
 * ── 契约保持向后兼容 ──
 * 入参：{ imageData, model?, apiKey?, apiUrl? }
 * 出参：{ success: true, result: PlantAnalysisResult, tokenUsage } | { error }
 * 调用方 `lib/utils/plant-analysis-helper.ts` 无需改动。
 *
 * ⚠️ 语义边界：本端点回答「长到哪个阶段、整体健康度多少」，是**巡检评分**。
 * 病虫害诊断（"这是什么病、依据、怎么治"）请走 `/api/vision/diagnose`。
 */

import { NextRequest, NextResponse } from 'next/server'
import { PLANT_DIAGNOSIS_PROMPT_COMPACT } from '@/lib/vlm-prompts'
import type { PlantAnalysisResult } from '@/lib/types/plant-growth-types'
import { getHealthStatus } from '@/lib/types/plant-growth-types'
import { getCurrentUser } from '@/lib/auth'
import { callVisionModel, extractJsonObject } from '@/lib/ai/vision/vision-gateway'

export const runtime = 'nodejs'
export const maxDuration = 120

const SYSTEM_PROMPT = `你是草莓植株生长状态分析助手。输出必须是纯 JSON 对象，不得包含任何解释文字、markdown 代码块或前后缀。看不清时按可见信息保守估计，不要编造。`

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

        const body = await req.json().catch(() => null)
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: '请求体格式错误' }, { status: 400 })
        }

        const { imageData, model, apiKey, apiUrl } = body as {
            imageData?: string
            model?: string
            apiKey?: string
            apiUrl?: string
        }

        if (!imageData || typeof imageData !== 'string') {
            return NextResponse.json({ error: 'Missing image data' }, { status: 400 })
        }

        // 统一的视觉调用链路（模型与凭据由网关按用户配置解析，不再本文件硬编码）
        const call = await callVisionModel({
            images: [imageData],
            systemPrompt: SYSTEM_PROMPT,
            userPrompt: PLANT_DIAGNOSIS_PROMPT_COMPACT,
            model,
            apiKey,
            apiUrl,
            temperature: 0.1, // 低温度保证诊断结果稳定复现
            maxTokens: 800,
        })

        if (!call.ok || !call.text) {
            console.error('[vlm/analyze-frame] 网关调用失败:', call.errorKind, call.error)
            return NextResponse.json({ error: call.error || 'VLM 调用失败' }, { status: 502 })
        }

        // 解析结构化 JSON（括号平衡扫描，容忍 ```json 围栏与前后缀文本）
        const analysisData = extractJsonObject(call.text)
        if (!analysisData) {
            console.error('[vlm/analyze-frame] 无法解析响应:', call.text.slice(0, 300))
            return NextResponse.json(
                { error: 'Failed to parse VLM response. Please try again.' },
                { status: 500 },
            )
        }

        // 校验并构造结果（与重构前行为保持一致，保证摄像头巡检不回归）
        const healthScore =
            typeof analysisData.healthScore === 'number' ? analysisData.healthScore : 75

        const result: PlantAnalysisResult = {
            stage: typeof analysisData.stage === 'number' ? analysisData.stage : 3,
            healthScore,
            healthStatus: getHealthStatus(healthScore),
            issues: Array.isArray(analysisData.issues) ? analysisData.issues : [],
            recommendations: Array.isArray(analysisData.recommendations) ? analysisData.recommendations : [],
            confidence: 0.8,
            timestamp: Date.now(),
            heatmap:
                Array.isArray(analysisData.heatmap) && analysisData.heatmap.length === 6
                    ? analysisData.heatmap
                    : [75, 75, 75, 75, 75, 75],
        }

        return NextResponse.json({
            success: true,
            result,
            tokenUsage: call.usage || { input: 0, output: 0, total: 0 },
        })
    } catch (error: any) {
        console.error('[vlm/analyze-frame] 未预期错误:', error)
        return NextResponse.json(
            { error: error?.message || 'Internal server error' },
            { status: 500 },
        )
    }
}
