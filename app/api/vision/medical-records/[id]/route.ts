/**
 * 单条病历端点
 *
 * GET    /api/vision/medical-records/:id   取详情（含完整诊断快照 + 复诊时间轴）
 * PATCH  /api/vision/medical-records/:id   更新状态（open / treating / resolved / archived）
 * DELETE /api/vision/medical-records/:id   删除病历（连带复诊）
 *
 * 一律带 `user_id` 校验（service 层 SQL 内 `WHERE user_id = $n`），越权访问返回 404 而非 403 ——
 * 不向非属主泄露"这条记录存在"。
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getMedicalRecordDetail,
  updateMedicalRecordStatus,
  deleteMedicalRecord,
  type MedicalRecordStatus,
} from '@/lib/db/medical-record-service'

export const runtime = 'nodejs'

const VALID_STATUSES: MedicalRecordStatus[] = ['open', 'treating', 'resolved', 'archived']

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 })
  }

  const { id } = await params
  const recordId = Number(id)
  if (!Number.isFinite(recordId) || recordId <= 0) {
    return NextResponse.json({ ok: false, error: '病历 id 非法' }, { status: 400 })
  }

  try {
    const detail = await getMedicalRecordDetail(user.id, recordId)
    if (!detail) {
      return NextResponse.json({ ok: false, error: '病历不存在' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, record: detail })
  } catch (error: any) {
    console.error('[medical-records/:id] GET failed:', error?.message)
    return NextResponse.json({ ok: false, error: '读取病历详情失败' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 })
  }

  const { id } = await params
  const recordId = Number(id)
  if (!Number.isFinite(recordId) || recordId <= 0) {
    return NextResponse.json({ ok: false, error: '病历 id 非法' }, { status: 400 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: '请求体不是合法 JSON' }, { status: 400 })
  }

  const status = body?.status as MedicalRecordStatus
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { ok: false, error: `status 必须是 ${VALID_STATUSES.join(' / ')} 之一` },
      { status: 400 }
    )
  }

  try {
    const updated = await updateMedicalRecordStatus(user.id, recordId, status)
    if (!updated) {
      return NextResponse.json({ ok: false, error: '病历不存在' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, record: updated })
  } catch (error: any) {
    console.error('[medical-records/:id] PATCH failed:', error?.message)
    return NextResponse.json({ ok: false, error: '更新病历状态失败' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 })
  }

  const { id } = await params
  const recordId = Number(id)
  if (!Number.isFinite(recordId) || recordId <= 0) {
    return NextResponse.json({ ok: false, error: '病历 id 非法' }, { status: 400 })
  }

  try {
    const deleted = await deleteMedicalRecord(user.id, recordId)
    if (!deleted) {
      return NextResponse.json({ ok: false, error: '病历不存在' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[medical-records/:id] DELETE failed:', error?.message)
    return NextResponse.json({ ok: false, error: '删除病历失败' }, { status: 500 })
  }
}
