import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  createAICronJob,
  getUserAICronJobs,
  cancelAICronJob,
  type AICronJob
} from '@/lib/ai/ai-cron-service'

/**
 * GET /api/ai/cron - 获取用户的所有 Cron 任务
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jobs = await getUserAICronJobs(user.id as number)

    return NextResponse.json({ jobs })
  } catch (error) {
    console.error('[AI Cron API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cron jobs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ai/cron - 创建新的 Cron 任务
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      sessionId,
      taskType,
      taskDescription,
      delayMinutes,
      payload
    } = body

    if (!sessionId || !taskType || !taskDescription || !delayMinutes || !payload) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (delayMinutes < 1 || delayMinutes > 1440) { // 最多24小时
      return NextResponse.json(
        { error: 'Delay must be between 1 and 1440 minutes' },
        { status: 400 }
      )
    }

    const jobId = await createAICronJob(
      user.id as number,
      sessionId,
      taskType,
      taskDescription,
      delayMinutes,
      payload
    )

    return NextResponse.json({
      success: true,
      jobId,
      scheduledTime: Date.now() + delayMinutes * 60 * 1000
    })
  } catch (error) {
    console.error('[AI Cron API] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create cron job' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ai/cron - 取消 Cron 任务
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId' },
        { status: 400 }
      )
    }

    const cancelled = await cancelAICronJob(parseInt(jobId), user.id as number)

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Job not found or already executed' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[AI Cron API] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel cron job' },
      { status: 500 }
    )
  }
}
