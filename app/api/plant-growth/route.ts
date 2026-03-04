import { NextRequest, NextResponse } from 'next/server'
import type { PlantAnalysisResult } from '@/lib/types/plant-growth-types'

// In-memory cache for plant growth state
let plantGrowthCache: PlantAnalysisResult | null = null
let lastAnalysisTime: number = 0

export async function GET(req: NextRequest) {
    try {
        return NextResponse.json({
            success: true,
            data: plantGrowthCache,
            lastAnalyzed: lastAnalysisTime || null
        })
    } catch (error: any) {
        console.error('Get plant growth error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(req: NextRequest) {
    try {
        const { result } = await req.json()

        if (!result) {
            return NextResponse.json(
                { error: 'Missing analysis result data' },
                { status: 400 }
            )
        }

        // Update cache
        plantGrowthCache = result
        lastAnalysisTime = Date.now()

        return NextResponse.json({
            success: true,
            message: 'Plant growth state updated',
            data: plantGrowthCache
        })

    } catch (error: any) {
        console.error('Update plant growth error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
