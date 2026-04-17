import { NextRequest, NextResponse } from 'next/server'
import { runAICronExecutor } from '@/lib/ai/ai-cron-executor'

/**
 * POST /api/ai/cron/execute - 手动触发 Cron 执行器
 * 这个端点可以被 cron job 服务调用，或者用于测试
 */
export async function POST(req: NextRequest) {
  try {
    // 验证请求来源（可选：添加 API key 验证）
    const authHeader = req.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await runAICronExecutor()

    return NextResponse.json({ success: true, message: 'Cron executor ran successfully' })
  } catch (error) {
    console.error('[AI Cron Execute API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to run cron executor' },
      { status: 500 }
    )
  }
}

// 允许 GET 请求用于健康检查
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'ai-cron-executor' })
}
