/**
 * 个性化设置 API
 *
 * GET  /api/user/personalization  → { settings, styles }
 * PATCH /api/user/personalization → 增量更新（body 传要改的字段）
 * POST /api/user/personalization  → { action: 'reset' } 恢复默认
 *                                  | { action: 'apply-wizard', wizard: {...} }
 *
 * 🆕 apply-wizard：把首启向导收集的「助手名字 / 对我的称呼」写入个性化设置。
 * 向导窗口是独立的 Electron 窗口，拿不到登录态，因此只能先落盘到
 * desktop-settings.json 的 personal 段；登录后由前端调本 action 回填。
 * 仅在用户尚未设置过对应项时写入，不覆盖用户后来的显式修改。
 */

export const runtime = 'nodejs'

import fs from 'node:fs/promises'
import path from 'node:path'
import { getCurrentUser } from '@/lib/auth'
import {
  getPersonalization,
  savePersonalization,
  resetPersonalization,
  RESPONSE_STYLES,
  CUSTOM_INSTRUCTIONS_MAX,
  DEFAULT_PERSONALIZATION,
} from '@/lib/db/personalization-service'
import { PERSONAL_KEYS } from '@/lib/db/personalization-service'
import { getUserPreference } from '@/lib/db/agent-memory-service'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: '未登录' }, { status: 401 })

  try {
    const settings = await getPersonalization(user.id as number)
    return Response.json({
      settings,
      styles: RESPONSE_STYLES,
      limits: { customInstructions: CUSTOM_INSTRUCTIONS_MAX },
    })
  } catch (e) {
    console.error('[Personalization] GET failed:', e)
    return Response.json({ error: '读取个性化设置失败' }, { status: 500 })
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
    const settings = await savePersonalization(user.id as number, body)
    return Response.json({ ok: true, settings })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '保存失败'
    console.error('[Personalization] PATCH failed:', e)
    return Response.json({ error: msg }, { status: 400 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: '未登录' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const action = body?.action

    if (action === 'reset') {
      const settings = await resetPersonalization(user.id as number)
      return Response.json({ ok: true, settings })
    }

    if (action === 'apply-wizard') {
      const uid = user.id as number
      const wizard = body?.wizard as { assistantName?: string; userAddress?: string } | undefined
      const fromFile = wizard && typeof wizard === 'object' ? wizard : await readWizardPersonalPrefs()

      const patch: Record<string, string> = {}
      // 只在用户"从未显式设置过"时回填，避免覆盖后台里的修改
      const existingName = await getUserPreference(uid, PERSONAL_KEYS.assistantName).catch(() => null)
      const existingAddr = await getUserPreference(uid, PERSONAL_KEYS.userAddress).catch(() => null)

      const name = String(fromFile?.assistantName || '').trim()
      const addr = String(fromFile?.userAddress || '').trim()

      if (name && !hasExplicit(existingName?.preference_value, DEFAULT_PERSONALIZATION.assistantName)) {
        patch.assistantName = name
      }
      if (addr && !hasExplicit(existingAddr?.preference_value, undefined)) {
        patch.userAddress = addr
      }

      if (Object.keys(patch).length === 0) {
        return Response.json({ ok: true, applied: false, settings: await getPersonalization(uid) })
      }

      const settings = await savePersonalization(uid, patch)
      return Response.json({ ok: true, applied: true, settings })
    }

    return Response.json({ error: '未知操作' }, { status: 400 })
  } catch (e) {
    console.error('[Personalization] POST failed:', e)
    return Response.json({ error: '操作失败' }, { status: 500 })
  }
}

/** 判断某个偏好是否已被用户显式设置过（有记录且不等于默认值） */
function hasExplicit(value: string | null, defaultValue: string | undefined): boolean {
  if (value == null) return false
  if (defaultValue !== undefined && value === defaultValue) return false
  return String(value).trim() !== ''
}

/**
 * 读取启动器写的 desktop-settings.json 里的 personal 段。
 * 业务进程通过 STRAVISION_DATA_ROOT 拿到数据根目录（见 desktop/main.js）。
 */
async function readWizardPersonalPrefs(): Promise<{ assistantName?: string; userAddress?: string }> {
  const root = process.env.STRAVISION_DATA_ROOT
  if (!root) return {}
  try {
    const raw = await fs.readFile(path.join(root, 'desktop-settings.json'), 'utf8')
    const parsed = JSON.parse(raw) as { personal?: { assistantName?: string; userAddress?: string } }
    return parsed?.personal || {}
  } catch {
    return {}
  }
}
