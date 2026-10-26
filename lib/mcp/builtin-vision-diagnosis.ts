/**
 * 内置视觉诊断工具（builtin-vision-diagnosis）
 *
 * 暴露一个工具：`diagnose_plant_image`
 *
 * ── 为什么要有这一层 ──
 * 改造前，病害诊断靠「系统提示词里写死 <DIAGNOSIS> JSON 契约，赌模型自觉输出」。
 * 实测模型经常无视契约直接回散文（见用户反馈"他也没给我显示呀！"），
 * 导致诊断卡片与病害遮罩图永远不出现，且无任何可观测的失败信号。
 *
 * 现在改成原生 Function Calling：模型只需发起调用，诊断由服务端**必定执行**，
 * 结果带 `_agent_action: 'diagnosis'` 回到 /api/chat，由路由注入 `<DIAGNOSIS>` 标签，
 * 前端因此必定渲染出诊断卡 + 原图病害遮罩图（DetectionOverlay 的"遮罩图"视图）。
 *
 * ── 铁律 ──
 * 1. 模型选择与凭据**只走** `lib/ai/vision/vision-gateway.ts` 的 diagnose()，
 *    本文件严禁出现任何模型名 / apiKey 解析 / 自写 fetch —— 否则设置里换的视觉模型不生效。
 * 2. 图片来源**只走** AgentToolContext.userImages（由 /api/chat 从用户消息中提取），
 *    不要求模型把 base64 回传（真实模型做不到，且会打爆上下文）。
 */

import { diagnose } from '@/lib/ai/vision/vision-gateway'
import type { DiagnosisResult } from '@/lib/types/vision-diagnosis'
import type { AgentToolContext, ToolCallResult } from './mcp-tool-executor'

/** 单次诊断最多送几张图（多图会让视觉推理显著变慢、成本翻倍） */
const MAX_IMAGES = 3
/** 单张 dataURL 字符上限（约 5MB），超了直接丢弃而不是让上游报 413 */
const MAX_DATA_URL_CHARS = 7_000_000

/**
 * 诊断结果里的「动作标记」。
 * /api/chat 识别到它后会注入 `<DIAGNOSIS>` 标签（与 ask_user_question 的
 * `_agent_action: 'clarify'` 同一套机制）。
 */
export const DIAGNOSIS_AGENT_ACTION = 'diagnosis'

/**
 * 从工具上下文中取出用户本轮发的图片。
 *
 * 只接受 dataURL 与 http(s)（与 /api/vision/diagnose 的校验口径一致），
 * 过滤掉文本块、超长串与非图片内容。
 */
function pickImages(ctx?: AgentToolContext): string[] {
    const raw = ctx?.userImages
    if (!Array.isArray(raw)) return []
    return raw
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
        .filter(v => v.startsWith('data:image/') || /^https?:\/\//i.test(v))
        .filter(v => v.length <= MAX_DATA_URL_CHARS)
        .slice(0, MAX_IMAGES)
}

/** 把诊断结果压成一句给模型看的摘要（模型随后用自己的话总结给用户） */
function summarize(result: DiagnosisResult): string {
    const parts: string[] = []
    parts.push(`诊断结论：${result.diseaseName || '未能确定'}`)
    if (result.severity) parts.push(`严重度：${result.severity}`)
    if (typeof result.confidence === 'number') {
        parts.push(`置信度：${(result.confidence * 100).toFixed(0)}%`)
    }
    if (result.affectedParts?.length) parts.push(`发病部位：${result.affectedParts.join('、')}`)
    if (result.detections?.length) parts.push(`定位到 ${result.detections.length} 处异常区域`)
    return parts.join('；')
}

/**
 * 执行视觉诊断工具。
 *
 * 返回结构分两层：
 * - `data.diagnosis_data`：完整 DiagnosisResult，供 /api/chat 注入标签（前端卡片用）
 * - `data.summary`：一句话文本，供模型读完后组织语言
 *
 * 失败时也带 `error`，且成功/失败都不抛异常 —— 让模型能基于失败原因给用户解释，
 * 而不是整个 Agent Loop 崩掉。
 */
export async function executeVisionDiagnosisTool(
    functionName: string,
    args: Record<string, any>,
    agentContext?: AgentToolContext
): Promise<ToolCallResult> {
    if (functionName !== 'diagnose_plant_image') {
        return { success: false, error: `未知的视觉诊断工具: ${functionName}` }
    }

    const images = pickImages(agentContext)
    if (images.length === 0) {
        return {
            success: false,
            error:
                '当前对话里没有可用于诊断的图片。请让用户先发送一张植株照片（拍照或粘贴），再调用本工具。',
        }
    }

    // 模型给的补充线索：context（客观描述）优先，question（用户原话）作补充
    const ctxParts: string[] = []
    if (typeof args?.context === 'string' && args.context.trim()) {
        ctxParts.push(args.context.trim().slice(0, 2000))
    }
    if (typeof args?.question === 'string' && args.question.trim()) {
        ctxParts.push(`用户提问：${args.question.trim().slice(0, 500)}`)
    }

    console.log(
        `[VisionDiagnosis] diagnosing ${images.length} image(s), user=${agentContext?.userId || 'anon'}, ` +
            `context=${ctxParts.length ? 'yes' : 'no'}`
    )

    // 让用户在等待期间看到"在干什么" —— 视觉诊断要 20~60s，纯转圈体验很差
    agentContext?.onStage?.('正在识别病害并定位病灶区域…')

    try {
        const out = await diagnose({
            images,
            context: ctxParts.length ? ctxParts.join('\n') : undefined,
            // 🔥 用户当前选择的模型优先：视觉不能绕过用户选择去挑网关自己的视觉模型。
            // 网关内部仍会在该模型不可用时回退候选，但首选永远是用户选的那个。
            model: agentContext?.userModel,
            withBoundingBoxes: true,
            // 视觉推理比文本慢，给到 90s；工具层超时由 tool-manager 统一兜底
            timeoutMs: 90_000,
        })

        if (!out.ok || !out.result) {
            const kind = out.errorKind || 'internal'
            const friendly: Record<string, string> = {
                no_vision_model: '当前没有可用的视觉模型，请在「设置 → AI 模型」里启用一个支持图片理解的模型。',
                no_credentials: '视觉模型的凭据未配置，请在「设置 → AI 模型」里补全 Key。',
                timeout: '视觉诊断超时，请换一张更小/更清晰的图片重试。',
                upstream: '视觉模型服务返回异常，请稍后重试。',
                bad_output: '视觉模型返回的内容无法解析成诊断结论，请换一张更清晰的图片重试。',
            }
            return {
                success: false,
                error: out.error || '诊断失败',
                data: {
                    errorKind: kind,
                    hint: friendly[kind] || '诊断失败，请稍后重试。',
                    // 让模型能如实告诉用户"用的是哪个模型、哪个环节挂了"，
                    // 而不是含糊一句"服务异常"
                    model: out.model,
                    attempted: out.attempted,
                    requestedModel: agentContext?.userModel,
                },
            }
        }

        const result = out.result
        const hit = result.detections?.length ?? 0
        agentContext?.onStage?.(
            hit > 0
                ? `已定位 ${hit} 处病害部位，正在你发的原图上合成遮罩图…`
                : '已完成病害鉴别，正在整理诊断结论…',
        )
        return {
            success: true,
            data: {
                // 👇 /api/chat 认这个标记，注入 <DIAGNOSIS> 标签 → 前端渲染诊断卡 + 遮罩图
                _agent_action: DIAGNOSIS_AGENT_ACTION,
                diagnosis_data: result,
                summary: summarize(result),
                detections: result.detections ?? [],
                imageCount: images.length,
                degraded: out.degraded ?? false,
                // 实际生效的模型（回退过就与用户选的不同，如实回传便于排查）
                model: out.model,
                requestedModel: agentContext?.userModel,
            },
        }
    } catch (error: any) {
        console.error('[VisionDiagnosis] unexpected error:', error)
        return {
            success: false,
            error: error?.message || '视觉诊断执行异常',
            data: { errorKind: 'internal' },
        }
    }
}
