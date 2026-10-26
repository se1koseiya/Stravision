import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { resolveClientToolResult, REGISTRY_INSTANCE_ID, getPendingClientToolCountAcrossInstances } from '@/lib/ai/pending-client-tool'
import { z } from 'zod'

export const runtime = 'nodejs'

const schema = z.object({
  client_tool_id: z.string().min(1, '缺少 client_tool_id'),
  /** 前端工具的结构化返回（任意 JSON），会原样回灌给 Agent Loop */
  result: z.unknown(),
})

/**
 * POST /api/chat/client-tool-result
 *
 * 前端工具（client tool）执行完成后回传结果。
 *
 * 典型场景：AI 调用 automation_canvas_apply 改画布 → 编辑器在浏览器里把 ops 应用到
 * ReactFlow 的本地 state → 把执行结果 POST 回来 → 挂起的 Agent Loop 继续下一轮推理。
 *
 * 后端在 lib/ai/pending-client-tool.ts 的注册表（挂在 globalThis，跨路由 bundle 共享）
 * 里按 client_tool_id 找到挂起项并 resolve。
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.id) {
      return Response.json({ error: '未登录' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message || '参数错误' },
        { status: 400 }
      )
    }

    // 2026-10-14：支持**跨实例**解析（挂起在别的容器上时经 Redis 索引认领 + 投递）
    const resolved = await resolveClientToolResult(parsed.data.client_tool_id, parsed.data.result)
    if (!resolved) {
      // 幂等：已超时/已处理/持有者进程已死都返回 200，避免前端控制台刷红错
      const pendingCount = await getPendingClientToolCountAcrossInstances()
      console.warn(
        `[Client Tool Result] not_pending id=${parsed.data.client_tool_id} ` +
        `instance=${REGISTRY_INSTANCE_ID} 当前挂起数=${pendingCount}`
      )
      return Response.json({ success: false, reason: 'not_pending' })
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('[Client Tool Result] Error:', error)
    return Response.json({ error: error.message || '服务异常' }, { status: 500 })
  }
}
