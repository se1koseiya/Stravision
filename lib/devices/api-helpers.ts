/**
 * 通用接入 API 的公共守卫与响应工具
 *
 * 权限模型（与现有设备注册表保持一致）：
 * - 读：任何登录用户
 * - 写（连接/设备/物模型/下发）：admin / super_admin
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { checkSecurity } from '@/lib/security'
import type { NextRequest } from 'next/server'
import type { UserPublic } from '@/lib/db/user-service'

export type Guard =
  | { ok: true; user: UserPublic }
  | { ok: false; response: NextResponse }

export async function requireUser(req?: NextRequest): Promise<Guard> {
  if (req) {
    const check = await checkSecurity(req)
    if (!check.allowed) return { ok: false, response: check.response! }
  }
  const user = await getCurrentUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { ok: true, user }
}

export async function requireAdmin(req?: NextRequest): Promise<Guard> {
  const guard = await requireUser(req)
  if (!guard.ok) return guard
  if (guard.user.role !== 'admin' && guard.user.role !== 'super_admin') {
    return { ok: false, response: NextResponse.json({ error: '需要管理员权限' }, { status: 403 }) }
  }
  return guard
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function notFound(message = '资源不存在'): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function serverError(scope: string, error: unknown): NextResponse {
  console.error(`[DevicePlatform] ${scope}:`, error)
  return NextResponse.json(
    { error: error instanceof Error ? error.message : '服务器内部错误' },
    { status: 500 }
  )
}

export function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}
