/**
 * 用户记忆管理 API（「设置 → 记忆与进化」）
 *
 * GET    /api/user/memory            → { memories: [{key,label,value}], raw }
 * PUT    /api/user/memory            → { memories: [{key,value}] } 全量覆盖（编辑保存）
 * PATCH  /api/user/memory            → { key, value } 单条 upsert；{ key, value: null } 删除该条
 * DELETE /api/user/memory            → 清空全部记忆
 * POST   /api/user/memory            → { action:'import', raw } 导入 md 文本 / { action:'export' } 导出
 *
 * 存储：data/user-memory/<userId>.md（人类可读 md，为唯一真相源）
 */

export const runtime = 'nodejs'

import fs from 'node:fs/promises'
import path from 'node:path'
import { getCurrentUser } from '@/lib/auth'
import {
  readUserMemory,
  writeUserMemory,
  clearUserMemory,
  getMemoryKeyLabel,
} from '@/lib/ai/user-memory-file-service'

/** 读取记忆的原始 md 文本（导出用） */
async function readRawMemory(userId: number): Promise<string> {
  try {
    return await fs.readFile(path.join(process.cwd(), 'data', 'user-memory', `${userId}.md`), 'utf-8')
  } catch {
    return ''
  }
}

function toList(map: Record<string, string>) {
  return Object.entries(map)
    .filter(([, v]) => v)
    .map(([key, value]) => ({ key, label: getMemoryKeyLabel(key), value }))
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: '未登录' }, { status: 401 })

  try {
    const userId = user.id as number
    const map = await readUserMemory(userId)
    const raw = await readRawMemory(userId)
    return Response.json({ memories: toList(map), raw })
  } catch (e) {
    console.error('[UserMemory] GET failed:', e)
    return Response.json({ memories: [], raw: '' })
  }
}

/** 全量覆盖（编辑界面保存所有条目） */
export async function PUT(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: '未登录' }, { status: 401 })

  try {
    const body = await req.json()
    const list = Array.isArray(body?.memories) ? body.memories : null
    if (!list) return Response.json({ error: '需要 memories 数组' }, { status: 400 })

    const userId = user.id as number
    // 先清空再写入，实现"删除条目"的语义
    await clearUserMemory(userId)
    const valid = list
      .filter((m: unknown): m is { key: string; value: string } => {
        const o = m as { key?: unknown; value?: unknown }
        return typeof o?.key === 'string' && !!o.key.trim() && typeof o?.value === 'string' && !!o.value.trim()
      })
      .map((m) => ({ key: m.key.trim(), value: m.value.trim() }))

    if (valid.length > 0) await writeUserMemory(userId, valid)

    const map = await readUserMemory(userId)
    return Response.json({ ok: true, memories: toList(map) })
  } catch (e) {
    console.error('[UserMemory] PUT failed:', e)
    return Response.json({ error: '保存失败' }, { status: 500 })
  }
}

/** 单条 upsert / 删除 */
export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: '未登录' }, { status: 401 })

  try {
    const body = await req.json()
    const key = typeof body?.key === 'string' ? body.key.trim() : ''
    if (!key) return Response.json({ error: '需要 key' }, { status: 400 })

    const userId = user.id as number
    const map = await readUserMemory(userId)

    if (body?.value === null || body?.value === '') {
      delete map[key]
    } else if (typeof body?.value === 'string') {
      map[key] = body.value.trim()
    } else {
      return Response.json({ error: 'value 必须是字符串或 null' }, { status: 400 })
    }

    await clearUserMemory(userId)
    const entries = Object.entries(map).filter(([, v]) => v)
    if (entries.length > 0) {
      await writeUserMemory(userId, entries.map(([k, v]) => ({ key: k, value: v })))
    }

    const next = await readUserMemory(userId)
    return Response.json({ ok: true, memories: toList(next) })
  } catch (e) {
    console.error('[UserMemory] PATCH failed:', e)
    return Response.json({ error: '更新失败' }, { status: 500 })
  }
}

/** 清空 / 导入 / 导出 */
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: '未登录' }, { status: 401 })

  try {
    await clearUserMemory(user.id as number)
    return Response.json({ ok: true, memories: [] })
  } catch (e) {
    console.error('[UserMemory] DELETE failed:', e)
    return Response.json({ error: '清空失败' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: '未登录' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const userId = user.id as number

  if (body?.action === 'export') {
    const raw = await readRawMemory(userId)
    return Response.json({ ok: true, raw })
  }

  if (body?.action === 'import') {
    const raw = typeof body?.raw === 'string' ? body.raw : ''
    if (!raw.trim()) return Response.json({ error: '导入内容为空' }, { status: 400 })
    try {
      // 复用解析器：按 "## 标题" 分段解析出 key/value
      const map = parseImportMarkdown(raw)
      if (Object.keys(map).length === 0) {
        return Response.json({ error: '未能从内容中解析出记忆条目（需 ## 标题 + 内容格式）' }, { status: 400 })
      }
      await clearUserMemory(userId)
      await writeUserMemory(userId, Object.entries(map).map(([k, v]) => ({ key: k, value: v })))
      const next = await readUserMemory(userId)
      return Response.json({ ok: true, memories: toList(next) })
    } catch (e) {
      console.error('[UserMemory] import failed:', e)
      return Response.json({ error: '导入失败' }, { status: 500 })
    }
  }

  return Response.json({ error: '未知操作' }, { status: 400 })
}

/** 导入解析：标题 → 是否已知 key 的反向映射（未知标题按原样作 key） */
function parseImportMarkdown(raw: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = raw.split('\n')
  let title = ''
  let values: string[] = []
  const flush = () => {
    if (title && values.length > 0) result[title] = values.join('；')
    values = []
  }
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/)
    if (m) {
      flush()
      title = m[1].trim()
    } else if (title) {
      const t = line.trim()
      if (t && !t.startsWith('#') && !t.startsWith('---') && !t.startsWith('最后更新')) {
        values.push(t.replace(/^[-*]\s+/, '').trim())
      }
    }
  }
  flush()
  // 标题 → 已知 key（复用标签反查），未知则用标题原文
  const out: Record<string, string> = {}
  for (const [t, v] of Object.entries(result)) {
    const known = KEY_BY_LABEL[t]
    out[known || t] = v
  }
  return out
}

/** 标签 → key（与 user-memory-file-service 的 MEMORY_KEY_TITLES 保持同步） */
const KEY_BY_LABEL: Record<string, string> = {
  称呼: 'user_name',
  '大棚/场地': 'greenhouse_info',
  草莓品种: 'strawberry_variety',
  生育期: 'growth_stage',
  关注重点: 'focus_area',
  偏好温度: 'preferred_temperature',
  偏好湿度: 'preferred_humidity',
  偏好光照: 'preferred_light',
  习惯浇水时间: 'preferred_watering_time',
  习惯浇水时长: 'preferred_watering_duration',
  浇水习惯: 'watering_habit',
  通知偏好: 'notification_preference',
  回复详细度: 'response_detail_level',
  回复风格: 'response_style',
  自动化倾向: 'automation_preference',
  语言风格: 'language_style',
  其他偏好: 'preference',
}
