import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { resolvePendingUserInputByUserId } from '@/lib/ai/pending-user-input'
import { z } from 'zod'

export const runtime = 'nodejs'

const respondSchema = z.object({
  checkpoint_id: z.string().min(1, '缺少 checkpoint_id'),
  reply: z.string().min(1, '回复内容不能为空'),
})

/**
 * POST /api/chat/respond
 *
 * 用户在 CHECKPOINT / CLARIFY 表单中提交回复时调用。
 * 后端通过 userId 找到挂起的 Agent Loop（在 pending-user-input.ts 的 Map 中），
 * resolve promise，让 Agent Loop 继续执行。
 *
 * 前端无需传 sessionId（前端不知道后端生成的 `session-${userId}-${timestamp}` 格式），
 * 后端按 userId 前缀匹配查找。
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.id) {
      return Response.json({ error: '未登录' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = respondSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message || '参数错误' },
        { status: 400 }
      )
    }

    const { reply } = parsed.data

    const resolved = resolvePendingUserInputByUserId(user.id, reply)

    if (!resolved) {
      return Response.json(
        { error: '没有正在等待回复的检查点（可能已超时或已处理）' },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      message: '回复已送达，AI 正在继续思考',
    })
  } catch (error: any) {
    console.error('[Chat Respond] Error:', error)
    return Response.json(
      { error: error.message || '服务异常' },
      { status: 500 }
    )
  }
}
