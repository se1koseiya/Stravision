/**
 * 复诊端点 —— 病历闭环的「回填」入口
 *
 * POST   /api/vision/medical-records/:id/followups   追加一次复诊（疗效 + 备注 + 可选复诊照片）
 * DELETE /api/vision/medical-records/:id/followups?followUpId=123  撤销一条复诊
 *
 * 追加复诊会**顺带推进病历状态**（service 事务内完成）：
 *   cured  → resolved（痊愈）
 *   worse  → treating（重新处置）
 *   improved/stable 且原状态为 open → treating
 * 这样用户只要回填疗效，病历状态就自动跟着走，不需要手动改两次。
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { appendFollowUp, deleteFollowUp, type FollowUpEfficacy } from '@/lib/db/medical-record-service'
import { isDiagnosisResult } from '@/lib/types/vision-diagnosis'

export const runtime = 'nodejs'

const VALID_EFFICACY: FollowUpEfficacy[] = ['improved', 'stable', 'worse', 'cured']
/** 复诊照片上限 1.2MB（字符）—— 同病历缩略图的封顶策略 */
const MAX_THUMBNAIL_CHARS = 1_200_000

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const efficacy = body?.efficacy as FollowUpEfficacy
  if (!VALID_EFFICACY.includes(efficacy)) {
    return NextResponse.json(
      { ok: false, error: `efficacy 必须是 ${VALID_EFFICACY.join(' / ')} 之一` },
      { status: 400 }
    )
  }

  const rawThumb = typeof body?.imageThumbnail === 'string' ? body.imageThumbnail : null
  const imageThumbnail = rawThumb && rawThumb.length <= MAX_THUMBNAIL_CHARS ? rawThumb : null

  // 复诊若带了一次新的诊断结果，一并留存（用于对比病程）
  const payload = isDiagnosisResult(body?.result) ? body.result : null

  try {
    const followUp = await appendFollowUp(user.id, recordId, {
      efficacy,
      severity: typeof body?.severity === 'string' ? body.severity : null,
      note: typeof body?.note === 'string' && body.note.trim() ? body.note.trim() : null,
      image_thumbnail: imageThumbnail,
      payload,
    })
    if (!followUp) {
      return NextResponse.json({ ok: false, error: '病历不存在' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, followUp })
  } catch (error: any) {
    console.error('[medical-records/:id/followups] POST failed:', error?.message)
    return NextResponse.json({ ok: false, error: '复诊保存失败' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 })
  }

  const { id } = await params
  const recordId = Number(id)
  const followUpId = Number(req.nextUrl.searchParams.get('followUpId'))
  if (!Number.isFinite(recordId) || recordId <= 0 || !Number.isFinite(followUpId) || followUpId <= 0) {
    return NextResponse.json({ ok: false, error: 'id 非法' }, { status: 400 })
  }

  try {
    const deleted = await deleteFollowUp(user.id, recordId, followUpId)
    if (!deleted) {
      return NextResponse.json({ ok: false, error: '复诊记录不存在' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[medical-records/:id/followups] DELETE failed:', error?.message)
    return NextResponse.json({ ok: false, error: '撤销复诊失败' }, { status: 500 })
  }
}
