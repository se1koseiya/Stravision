import { NextRequest, NextResponse } from 'next/server'
import { getDefaultVLMModel, PLANT_DIAGNOSIS_PROMPT_COMPACT } from '@/lib/vlm-prompts'
import type { PlantAnalysisResult } from '@/lib/types/plant-growth-types'
import { getHealthStatus } from '@/lib/types/plant-growth-types'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
        const body = await req.json()
        const { imageData, model } = body
        let { apiKey, apiUrl } = body

        // Fallback to environment variables if not provided in request
        if (!apiKey) {
            apiKey = process.env.SYSTEM_OPENAI_API_KEY || process.env.DASHSCOPE_API_KEY
        }

        if (!apiUrl && process.env.SYSTEM_OPENAI_BASE_URL) {
            apiUrl = process.env.SYSTEM_OPENAI_BASE_URL
        }

        if (!imageData) {
            return NextResponse.json(
                { error: 'Missing image data' },
                { status: 400 }
            )
        }

        if (!apiKey) {
            return NextResponse.json(
                { error: 'Missing API key. Please configure in AI settings or environment variables.' },
                { status: 400 }
            )
        }

        // Use provided model or default to qwen3-vl-plus
        const vlmModel = model || getDefaultVLMModel()

        // Determine API endpoint
        const isDashScope = apiUrl?.includes('dashscope.aliyuncs.com') || vlmModel.startsWith('qwen')
        const isCompatibleMode = apiUrl?.includes('compatible-mode/v1') ?? false

        let targetUrl = apiUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

        // Ensure URL ends with /chat/completions for compatible mode
        if (isDashScope && isCompatibleMode && /\/v1$/.test(targetUrl)) {
            targetUrl = `${targetUrl}/chat/completions`
        }

        // Prepare messages for VLM
        const messages = [
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            url: imageData
                        }
                    },
                    {
                        type: 'text',
                        text: PLANT_DIAGNOSIS_PROMPT_COMPACT
                    }
                ]
            }
        ]

        // Call VLM API
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: vlmModel,
                messages: messages,
                temperature: 0.1, // Low temperature for consistent diagnosis
                max_tokens: 500
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('VLM API Error:', errorText)
            return NextResponse.json(
                { error: `VLM API Error: ${response.status} - ${errorText}` },
                { status: response.status }
            )
        }

        const data = await response.json()

        // Extract content from response
        let content = ''
        if (isDashScope && !isCompatibleMode) {
            content = data.output?.choices?.[0]?.message?.content || data.output?.text || ''
        } else {
            content = data.choices?.[0]?.message?.content || ''
        }

        // Parse JSON response from VLM
        let analysisData: any
        try {
            // Try to extract JSON from the content
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                analysisData = JSON.parse(jsonMatch[0])
            } else {
                throw new Error('No JSON found in response')
            }
        } catch (parseError) {
            console.error('Failed to parse VLM response:', content)
            return NextResponse.json(
                { error: 'Failed to parse VLM response. Please try again.' },
                { status: 500 }
            )
        }

        // Validate and construct result
        const result: PlantAnalysisResult = {
            stage: analysisData.stage || 3,
            healthScore: analysisData.healthScore || 75,
            healthStatus: getHealthStatus(analysisData.healthScore || 75),
            issues: Array.isArray(analysisData.issues) ? analysisData.issues : [],
            recommendations: Array.isArray(analysisData.recommendations) ? analysisData.recommendations : [],
            confidence: 0.8, // We could calculate this based on response quality
            timestamp: Date.now(),
            heatmap: Array.isArray(analysisData.heatmap) && analysisData.heatmap.length === 6
                ? analysisData.heatmap
                : [75, 75, 75, 75, 75, 75] // Default values
        }

        // Get token usage if available
        const tokenUsage = {
            input: data.usage?.prompt_tokens || 0,
            output: data.usage?.completion_tokens || 0,
            total: data.usage?.total_tokens || 0
        }

        return NextResponse.json({
            success: true,
            result,
            tokenUsage
        })

    } catch (error: any) {
        console.error('VLM Analysis Error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
