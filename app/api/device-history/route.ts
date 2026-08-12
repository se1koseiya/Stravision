import { NextRequest, NextResponse } from 'next/server'
import { getSensorHistory } from '@/lib/db/device-service'
import { getCurrentUser } from '@/lib/auth'

// 允许的传感器类型白名单（与 device-service.ts 的 colMap 保持一致）
const ALLOWED_TYPES = new Set([
    'temperature', 'humidity', 'light', 'co2',
    'soilMoisture', 'fertility', 'nitrogen', 'phosphorus',
    'potassium', 'rainfall'
])

// 允许的时间范围白名单
const ALLOWED_RANGES = new Set(['10m', '1h', '7h', '1d', '7d'])

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const searchParams = req.nextUrl.searchParams
    const types = searchParams.get('types') // Check for comma-separated types
    const type = searchParams.get('type') // Fallback for single type
    const range = searchParams.get('range') || '1h'

    // 校验 range 白名单，防止脏数据进入下游
    if (!ALLOWED_RANGES.has(range)) {
        return NextResponse.json({ error: 'Invalid range parameter' }, { status: 400 })
    }

    try {
        if (types) {
            const typeList = types.split(',').map(t => t.trim()).filter(Boolean)
            // 路由层白名单过滤，确保只有合法 type 进入 service 层
            const invalidTypes = typeList.filter(t => !ALLOWED_TYPES.has(t))
            if (invalidTypes.length > 0) {
                return NextResponse.json({ error: `Invalid sensor type(s): ${invalidTypes.join(', ')}` }, { status: 400 })
            }
            const results: Record<string, any[]> = {}

            // Use Promise.all to fetch all types in parallel
            await Promise.all(typeList.map(async (t) => {
                results[t] = await getSensorHistory(t, range)
            }))

            return NextResponse.json({ success: true, data: results })
        }

        if (type) {
            if (!ALLOWED_TYPES.has(type)) {
                return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
            }
            const data = await getSensorHistory(type, range)
            return NextResponse.json({ success: true, data })
        }

        return NextResponse.json({ error: 'Missing type or types parameter' }, { status: 400 })
    } catch (error) {
        console.error("Failed to fetch history:", error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
