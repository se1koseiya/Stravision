/**
 * 上下文偏好 API（「设置 → 助理设置 → 上下文与压缩」）
 *
 * GET   /api/user/context-prefs → { prefs, presets, limits }
 * PATCH /api/user/context-prefs → 增量更新（body 传要改的字段）
 *         body: { windowTokens?: number | null, compressionTriggerRatio?: number }
 * POST  /api/user/context-prefs → { action: 'reset' } 恢复默认
 *
 * 存储：user_preferences 表（key `personal.context_*`），见 lib/db/context-prefs-service.ts。
 * 语义：windowTokens 是**上限**（实际取 min(用户值, 模型窗口)），null = 跟随模型。
 */

export const runtime = 'nodejs'

/**
 * 🚨 必须显式声明动态：这是「读当前用户偏好」的接口，
 * 一旦被 Next 静态化 / 浏览器启发式缓存，用户保存后会读到旧值
 * （2026-10-11 实测：PATCH 成功但紧随其后的 GET 仍返回旧值）。
 * 响应头再补 no-store 作第二道保险。
 */
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' }

import { getCurrentUser } from '@/lib/auth'
import {
  getUserContextPrefs,
  saveUserContextPrefs,
  resetUserContextPrefs,
} from '@/lib/db/context-prefs-service'
import {
  CONTEXT_WINDOW_PRESETS,
  MAX_TRIGGER_RATIO,
  MAX_WINDOW_TOKENS,
  MIN_TRIGGER_RATIO,
  MIN_WINDOW_TOKENS,
} from '@/lib/ai/context/context-prefs'

const LIMITS = {
  minWindowTokens: MIN_WINDOW_TOKENS,
  maxWindowTokens: MAX_WINDOW_TOKENS,
  minTriggerRatio: MIN_TRIGGER_RATIO,
  maxTriggerRatio: MAX_TRIGGER_RATIO,
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: '未登录' }, { status: 401 })

  try {
    const prefs = await getUserContextPrefs(user.id as number)
    return Response.json({ prefs, presets: CONTEXT_WINDOW_PRESETS, limits: LIMITS }, { headers: NO_STORE })
  } catch (e) {
    console.error('[ContextPrefs] GET failed:', e)
    return Response.json({ error: '读取上下文设置失败' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: '未登录' }, { status: 401 })

  try {
    const body = await req.json()
    if (!body || typeof body !== 'object') {
      return Response.json({ error: '请求体格式错误' }, { status: 400 })
    }

    const patch: { windowTokens?: number | null; compressionTriggerRatio?: number } = {}
    if ('windowTokens' in body) {
      const w = body.windowTokens
      patch.windowTokens = w == null || w === '' ? null : Number(w)
      if (patch.windowTokens != null && !Number.isFinite(patch.windowTokens)) {
        return Response.json({ error: '上下文容量必须是数字或 null' }, { status: 400 })
      }
    }
    if ('compressionTriggerRatio' in body) {
      const t = Number(body.compressionTriggerRatio)
      if (!Number.isFinite(t)) {
        return Response.json({ error: '压缩阈值必须是数字' }, { status: 400 })
      }
      patch.compressionTriggerRatio = t
    }

    const prefs = await saveUserContextPrefs(user.id as number, patch)
    return Response.json({ ok: true, prefs }, { headers: NO_STORE })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '保存失败'
    console.error('[ContextPrefs] PATCH failed:', e)
    return Response.json({ error: msg }, { status: 400 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: '未登录' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    if (body?.action !== 'reset') {
      return Response.json({ error: '未知操作' }, { status: 400 })
    }
    const prefs = await resetUserContextPrefs(user.id as number)
    return Response.json({ ok: true, prefs }, { headers: NO_STORE })
  } catch (e) {
    console.error('[ContextPrefs] POST failed:', e)
    return Response.json({ error: '操作失败' }, { status: 500 })
  }
}
