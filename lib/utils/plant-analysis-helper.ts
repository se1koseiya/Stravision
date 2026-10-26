// Helper function to detect plant analysis requests and handle VLM analysis
import type { PlantAnalysisResult } from '@/lib/types/plant-growth-types'
import { captureFrameFromVideo } from '@/lib/utils/video-capture'

export interface AnalyzePlantOptions {
    apiKey: string
    apiUrl?: string
    model?: string
}

/**
 * Check if user message is requesting plant analysis
 */
export function isPlantAnalysisRequest(message: string): boolean {
    const keywords = [
        '分析植株',
        '分析草莓',
        '植株诊断',
        '植物诊断',
        '植株状态',
        '生长状况',
        '健康状况',
        '检查植株',
        '看看植株',
        '植株怎么样'
    ]

    const lowerMessage = message.toLowerCase()
    return keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))
}

/**
 * Analyze plant from video element
 */
export async function analyzePlantFromVideo(
    videoElement: HTMLVideoElement | null,
    options: AnalyzePlantOptions
): Promise<{
    success: boolean
    result?: PlantAnalysisResult
    frameImage?: string
    error?: string
    tokenUsage?: { input: number; output: number; total: number }
}> {
    try {
        if (!videoElement) {
            return {
                success: false,
                error: '未找到视频流元素'
            }
        }

        // Capture frame from video
        const frameData = captureFrameFromVideo(videoElement, {
            maxWidth: 640,
            maxHeight: 480,
            quality: 0.85
        })

        if (!frameData) {
            return {
                success: false,
                error: '无法捕获视频帧，请确保视频正在播放'
            }
        }

        // Call VLM analysis API
        const response = await fetch('/api/vlm/analyze-frame', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageData: frameData,
                apiKey: options.apiKey,
                apiUrl: options.apiUrl,
                // 不传 model 时由视觉网关按 supportsVision 自动挑选
                // （禁止在此硬编码模型名 —— 见 lib/ai/vision/vision-gateway.ts）
                model: options.model
            })
        })

        if (!response.ok) {
            const errorData = await response.json()
            return {
                success: false,
                error: errorData.error || 'VLM分析请求失败'
            }
        }

        const data = await response.json()

        if (!data.success) {
            return {
                success: false,
                error: data.error || '分析失败'
            }
        }

        // Update plant growth state
        await fetch('/api/plant-growth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                result: data.result
            })
        })

        return {
            success: true,
            result: data.result,
            frameImage: frameData,
            tokenUsage: data.tokenUsage
        }

    } catch (error: unknown) {
        return {
            success: false,
            error: error instanceof Error ? (error.message || '分析过程出现错误') : '分析过程出现错误'
        }
    }
}

/**
 * Format analysis result as readable text
 */
export function formatAnalysisResult(result: PlantAnalysisResult): string {
    const stageNames = ['幼苗期', '生长期', '花芽分化期', '开花结果期', '果实成熟期', '采收后期']
    const stageName = stageNames[result.stage - 1] || `第${result.stage}阶段`

    const statusMap = {
        'excellent': '优秀',
        'good': '良好',
        'normal': '正常',
        'attention': '需要关注',
        'warning': '警告',
        'critical': '危急'
    }
    const statusText = statusMap[result.healthStatus] || result.healthStatus

    let text = `## 植株诊断结果\n\n`
    text += `**生长阶段**: ${stageName}\n\n`
    text += `**整体健康度**: ${result.healthScore}/100 (${statusText})\n\n`

    if (result.issues && result.issues.length > 0) {
        text += `### 发现的问题\n\n`
        result.issues.forEach((issue, i) => {
            text += `${i + 1}. ${issue}\n`
        })
        text += `\n`
    }

    if (result.recommendations && result.recommendations.length > 0) {
        text += `### 改进建议\n\n`
        result.recommendations.forEach((rec, i) => {
            text += `${i + 1}. ${rec}\n`
        })
        text += `\n`
    }

    text += `### 区域健康度分布\n\n`
    text += `从左到右6个区域的健康度评分：\n\n`
    result.heatmap.forEach((score, i) => {
        const status = score >= 90 ? '优秀' : score >= 75 ? '良好' : score >= 60 ? '正常' : score >= 45 ? '注意' : score >= 30 ? '警告' : '异常'
        text += `- 区域${i + 1}: ${score}/100 (${status})\n`
    })

    text += `\n---\n\n`
    text += `*分析时间: ${new Date(result.timestamp).toLocaleString('zh-CN')}*\n`
    text += `*置信度: ${(result.confidence * 100).toFixed(0)}%*`

    return text
}
