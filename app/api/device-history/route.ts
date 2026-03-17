import { NextRequest, NextResponse } from 'next/server'
import { getSensorHistory } from '@/lib/db/device-service'

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams
    const types = searchParams.get('types') // Check for comma-separated types
    const type = searchParams.get('type') // Fallback for single type
    const range = searchParams.get('range') || '1h'

    try {
        if (types) {
            const typeList = types.split(',')
            const results: Record<string, any[]> = {}
            
            // Use Promise.all to fetch all types in parallel
            await Promise.all(typeList.map(async (t) => {
                results[t.trim()] = await getSensorHistory(t.trim(), range)
            }))
            
            return NextResponse.json({ success: true, data: results })
        }

        if (type) {
            const data = await getSensorHistory(type, range)
            return NextResponse.json({ success: true, data })
        }

        return NextResponse.json({ error: 'Missing type or types parameter' }, { status: 400 })
    } catch (error) {
        console.error("Failed to fetch history:", error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
