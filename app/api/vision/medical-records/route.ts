/**
 * 病历（视觉诊断沉淀）端点
 *
 * GET  /api/vision/medical-records   列出当前用户病历（摘要分页 + 可选统计）
 * POST /api/vision/medical-records   诊断结果入档（幂等）
 *
 * 设计说明：
 * - 所有操作都从会话 cookie 取 `user.id`，**不接受请求体传 user_id**（防越权）。
 * - 入档是幂等的：诊断卡重挂载/刷新会重复调用本端点，靠 `(user_id, archive_key)` 唯一约束兜住。
 * - 缩略图是 base64 dataURL，体量不可控 → 这里硬性封顶，超限就丢图保诊断（宁可没图也不能塞爆库）。
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  archiveDiagnosis,
  listMedicalRecords,
  listDiseaseNames,
  getMedicalRecordStats,
  type MedicalRecordStatus,
} from '@/lib/db/medical-record-service'
import { isDiagnosisResult } from '@/lib/types/vision-diagnosis'

export const runtime = 'nodejs'

/** 缩略图上限 1.2MB（字符数）—— 压缩后长边 640 / JPEG 0.72 通常 60~120KB，留足余量 */
const MAX_THUMBNAIL_CHARS = 1_200_000

const VALID_STATUSES: MedicalRecordStatus[] = ['open', 'treating', 'resolved', 'archived']

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const statusParam = sp.get('status') || 'all'
  const status: MedicalRecordStatus | 'all' = VALID_STATUSES.includes(statusParam as MedicalRecordStatus)
    ? (statusParam as MedicalRecordStatus)
    : 'all'

  const num = (key: string, def: number) => {
    const v = Number(sp.get(key))
    return Number.isFinite(v) ? v : def
  }

  try {
    const { items, total } = await listMedicalRecords(user.id, {
      limit: num('limit', 30),
      offset: num('offset', 0),
      status,
      diseaseName: sp.get('diseaseName') || undefined,
      crop: sp.get('crop') || undefined,
      keyword: sp.get('keyword') || undefined,
    })

    const payload: Record<string, unknown> = { ok: true, items, total }

    // 首页需要统计条 + 筛选下拉，一次请求带回来，省一次往返
    if (sp.get('withMeta') === '1') {
      const [stats, diseaseNames] = await Promise.all([
        getMedicalRecordStats(user.id),
        listDiseaseNames(user.id),
      ])
      payload.stats = stats
      payload.diseaseNames = diseaseNames
    }

    return NextResponse.json(payload)
  } catch (error: any) {
    console.error('[medical-records] GET failed:', error?.message)
    return NextResponse.json({ ok: false, error: '读取病历失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: '请求体不是合法 JSON' }, { status: 400 })
  }

  const archiveKey = typeof body?.archiveKey === 'string' ? body.archiveKey.trim() : ''
  if (!archiveKey) {
    return NextResponse.json({ ok: false, error: '缺少 archiveKey' }, { status: 400 })
  }

  const result = body?.result
  if (!isDiagnosisResult(result)) {
    return NextResponse.json({ ok: false, error: 'result 不是合法的诊断结果' }, { status: 400 })
  }

  // 「信息不足」这类没有结论的诊断不入档 —— 病历要留的是可处置的记录
  if (result.category === 'unknown' && !result.diseaseName) {
    return NextResponse.json({ ok: true, skipped: true, reason: '无有效诊断结论' })
  }

  const rawThumb = typeof body?.imageThumbnail === 'string' ? body.imageThumbnail : null
  const imageThumbnail = rawThumb && rawThumb.length <= MAX_THUMBNAIL_CHARS ? rawThumb : null

  try {
    const { id, created } = await archiveDiagnosis({
      user_id: user.id,
      archive_key: archiveKey,
      session_id: typeof body?.sessionId === 'string' ? body.sessionId : null,
      message_id: typeof body?.messageId === 'string' ? body.messageId : null,
      crop: typeof body?.crop === 'string' && body.crop.trim() ? body.crop.trim() : null,
      image_thumbnail: imageThumbnail,
      result,
    })
    return NextResponse.json({ ok: true, id, created })
  } catch (error: any) {
    console.error('[medical-records] POST failed:', error?.message)
    return NextResponse.json({ ok: false, error: '入档失败' }, { status: 500 })
  }
}
