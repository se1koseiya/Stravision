import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  resolvePendingUserInputByUserId,
  resolvePendingUserInputByCheckpointId,
  resolvePendingUserInputByUserIdAndCheckpoint,
  countPendingUserInputAcrossInstances,
} from '@/lib/ai/pending-user-input'
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

    const { checkpoint_id, reply } = parsed.data

    // 🚨 三档降级匹配（2026-10-09 修正）。
    // 旧实现里第一档「未命中也会返回 true」，导致后面两档永远执行不到 —— 一旦
    // checkpoint_id 对不上就返回 200 假成功、Agent Loop 原地干等到 5 分钟超时。
    // 现在第一档只做**精确匹配**，未命中即降级，全都判不了就 404 让前端立刻走兜底。
    //
    // 2026-10-14：三档都支持**跨实例**（挂起在别的容器上时，经 Redis 索引认领 + 投递），
    // 因此全部返回 Promise。任一档失败（含持有者进程已死）都继续降级 / 404，不假成功。

    // 1) 首选：该用户当前挂起 且 checkpoint_id 完全一致（最精确）
    let resolved = await resolvePendingUserInputByUserIdAndCheckpoint(user.id, checkpoint_id, reply)
    let via = resolved ? 'userId+checkpointId' : ''

    // 2) 次选：该用户当前有挂起即可（id 可能因模型复用同名/前端残留陈旧而失配）——自愈路径
    if (!resolved) {
      resolved = await resolvePendingUserInputByUserId(user.id, reply)
      if (resolved) via = 'userId(自愈：checkpoint_id 失配)'
    }

    // 3) 末选：任意会话里 checkpoint_id 精确命中（跨会话兜底）
    if (!resolved) {
      resolved = await resolvePendingUserInputByCheckpointId(checkpoint_id, reply)
      if (resolved) via = 'checkpointId(any session)'
    }

    if (!resolved) {
      const pendingCount = await countPendingUserInputAcrossInstances()
      console.warn(
        `[Chat Respond] 无可恢复的挂起点 user=${user.id} checkpoint_id=${checkpoint_id} 当前挂起数=${pendingCount} → 404`
      )
      return Response.json(
        { error: '没有正在等待回复的检查点（可能已超时或已处理）' },
        { status: 404 }
      )
    }
    console.log(`[Chat Respond] 已恢复（${via}）user=${user.id} checkpoint_id=${checkpoint_id}`)

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
