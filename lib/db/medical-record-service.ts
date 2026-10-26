/**
 * 视觉诊断「病历」服务
 *
 * 把一次性的诊断结果沉淀成可回溯的病历：诊断后自动入档（幂等），
 * 之后可以复诊、回填疗效，形成「诊断 → 处置 → 复诊 → 结论」的闭环。
 *
 * 与 `user-reports-service.ts` 的差别：简报是"文档"，病历是**有状态的档案**，
 * 所以多带一张 `diagnosis_followups` 复诊表，并维护 status / treated_at / resolved_at。
 */
import { queryOne, query, execute, withTransaction, initDB } from "./database"
import type { DiagnosisResult, DiagnosisSeverity, DiseaseCategory } from "@/lib/types/vision-diagnosis"
import type {
  MedicalRecordStatus,
  FollowUpEfficacy,
  MedicalRecordSummary,
  DiagnosisFollowUp,
  MedicalRecordDetail,
  MedicalRecordStats,
} from "@/lib/types/medical-record"

// 契约与展示元数据统一住在 `lib/types/medical-record.ts`（客户端也要用，不能拖 pg 进 bundle）
export type {
  MedicalRecordStatus,
  FollowUpEfficacy,
  MedicalRecordSummary,
  DiagnosisFollowUp,
  MedicalRecordDetail,
  MedicalRecordStats,
}

// ---------------------------------------------------------------------------
// 输入契约（仅服务端使用，留在服务层）
// ---------------------------------------------------------------------------

export interface ArchiveDiagnosisInput {
  user_id: number
  /** 幂等键：`${sessionId}:${消息key}:${partIndex}:${内容指纹}` */
  archive_key: string
  session_id?: string | null
  message_id?: string | null
  crop?: string | null
  /** 压缩后的缩略图（dataURL），用于列表缩略图 */
  image_thumbnail?: string | null
  /** 完整的诊断结果快照 */
  result: DiagnosisResult
}

export interface ListMedicalRecordsOptions {
  limit?: number
  offset?: number
  status?: MedicalRecordStatus | "all"
  diseaseName?: string
  crop?: string
  keyword?: string
}

export interface ListMedicalRecordsResult {
  items: MedicalRecordSummary[]
  total: number
}

export interface AppendFollowUpInput {
  efficacy: FollowUpEfficacy
  severity?: DiagnosisSeverity | null
  note?: string | null
  image_thumbnail?: string | null
  payload?: DiagnosisResult | null
}

/** 「改病历」允许改的字段（至少给一个，否则是空操作）。 */
export interface UpdateMedicalRecordInput {
  /** 纠正病名（AI 误判时手动改） */
  diseaseName?: string
  /** 纠正严重度 */
  severity?: DiagnosisSeverity
  /** 备注；传 null 表示清空 */
  note?: string | null
}

// ---------------------------------------------------------------------------
// 内部映射
// ---------------------------------------------------------------------------

/**
 * pg 驱动把 BIGINT 以字符串返回（防 int64 精度丢失），NUMERIC 同样是字符串。
 * 统一归一为 number，否则前端 `new Date("1758512345678")` → Invalid Date。
 */
function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function mapSummaryRow(row: any): MedicalRecordSummary {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    archive_key: row.archive_key,
    session_id: row.session_id ?? null,
    message_id: row.message_id ?? null,
    crop: row.crop ?? null,
    disease_name: row.disease_name,
    category: (row.category || "unknown") as DiseaseCategory,
    confidence: toNum(row.confidence),
    severity: (row.severity || "none") as DiagnosisSeverity,
    affected_parts: Array.isArray(row.affected_parts) ? row.affected_parts : [],
    summary: row.summary ?? null,
    note: row.note ?? null,
    image_thumbnail: row.image_thumbnail ?? null,
    status: (row.status || "open") as MedicalRecordStatus,
    treated_at: toNum(row.treated_at),
    resolved_at: toNum(row.resolved_at),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
    followup_count: row.followup_count !== undefined ? Number(row.followup_count) : undefined,
    latest_efficacy: row.latest_efficacy ?? null,
  }
}

function mapFollowUpRow(row: any): DiagnosisFollowUp {
  return {
    id: Number(row.id),
    record_id: Number(row.record_id),
    user_id: Number(row.user_id),
    stage: Number(row.stage),
    efficacy: (row.efficacy || "stable") as FollowUpEfficacy,
    severity: row.severity ? (row.severity as DiagnosisSeverity) : null,
    note: row.note ?? null,
    image_thumbnail: row.image_thumbnail ?? null,
    payload: row.payload ?? null,
    created_at: Number(row.created_at),
  }
}

// ---------------------------------------------------------------------------
// 入档
// ---------------------------------------------------------------------------

/**
 * 诊断结果入档（幂等）。
 *
 * 同 `(user_id, archive_key)` 已存在时**不覆盖**（保留首次诊断快照），直接返回已有 id，
 * 这样诊断卡无论重挂载/刷新多少次都只落一条。
 */
export async function archiveDiagnosis(
  input: ArchiveDiagnosisInput
): Promise<{ id: number; created: boolean }> {
  await initDB()
  const now = Date.now()
  const r = input.result

  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO diagnosis_records
      (user_id, archive_key, session_id, message_id, crop, disease_name, category,
       confidence, severity, affected_parts, summary, payload, image_thumbnail,
       status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12::jsonb, $13, 'open', $14, $14)
     ON CONFLICT (user_id, archive_key) DO NOTHING
     RETURNING id`,
    [
      input.user_id,
      input.archive_key,
      input.session_id || null,
      input.message_id || null,
      input.crop || null,
      r.diseaseName,
      r.category,
      typeof r.confidence === "number" ? r.confidence : null,
      r.severity,
      JSON.stringify(Array.isArray(r.affectedParts) ? r.affectedParts : []),
      r.summary || null,
      JSON.stringify(r),
      input.image_thumbnail || null,
      now,
    ]
  )

  if (inserted?.id) {
    return { id: Number(inserted.id), created: true }
  }

  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM diagnosis_records WHERE user_id = $1 AND archive_key = $2`,
    [input.user_id, input.archive_key]
  )
  return { id: existing ? Number(existing.id) : 0, created: false }
}

// ---------------------------------------------------------------------------
// 查询
// ---------------------------------------------------------------------------

/**
 * 列出病历（摘要字段，不带 payload —— 列表页不需要重体）。
 * 附带复诊次数与最近一次疗效，供卡片角标使用。
 */
export async function listMedicalRecords(
  userId: number,
  options: ListMedicalRecordsOptions = {}
): Promise<ListMedicalRecordsResult> {
  await initDB()
  const limit = Math.min(Math.max(options.limit || 30, 1), 100)
  const offset = Math.max(options.offset || 0, 0)

  const where: string[] = ["r.user_id = $1"]
  const params: any[] = [userId]

  if (options.status && options.status !== "all") {
    params.push(options.status)
    where.push(`r.status = $${params.length}`)
  }
  if (options.diseaseName) {
    params.push(options.diseaseName)
    where.push(`r.disease_name = $${params.length}`)
  }
  if (options.crop) {
    params.push(options.crop)
    where.push(`r.crop = $${params.length}`)
  }
  if (options.keyword) {
    params.push(`%${options.keyword}%`)
    where.push(
      `(r.disease_name ILIKE $${params.length} OR coalesce(r.summary, '') ILIKE $${params.length} OR coalesce(r.crop, '') ILIKE $${params.length})`
    )
  }

  const whereSql = where.join(" AND ")

  const totalRow = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM diagnosis_records r WHERE ${whereSql}`,
    params
  )

  const listParams = [...params, limit, offset]
  const rows = await query<any>(
    `SELECT r.id, r.user_id, r.archive_key, r.session_id, r.message_id, r.crop,
            r.disease_name, r.category, r.confidence, r.severity, r.affected_parts,
            r.summary, r.note, r.image_thumbnail, r.status, r.treated_at, r.resolved_at,
            r.created_at, r.updated_at,
            (SELECT COUNT(*)::int FROM diagnosis_followups f WHERE f.record_id = r.id) AS followup_count,
            (SELECT f.efficacy FROM diagnosis_followups f
              WHERE f.record_id = r.id ORDER BY f.created_at DESC LIMIT 1) AS latest_efficacy
       FROM diagnosis_records r
      WHERE ${whereSql}
      ORDER BY r.created_at DESC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  )

  return {
    items: rows.map(mapSummaryRow),
    total: Number(totalRow?.n || 0),
  }
}

/**
 * 取病历详情（含完整诊断快照 + 复诊时间轴）。带 user_id 校验防越权。
 */
export async function getMedicalRecordDetail(
  userId: number,
  recordId: number
): Promise<MedicalRecordDetail | null> {
  await initDB()
  const row = await queryOne<any>(
    `SELECT * FROM diagnosis_records WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  )
  if (!row) return null

  const followups = await query<any>(
    `SELECT * FROM diagnosis_followups
      WHERE record_id = $1 AND user_id = $2
      ORDER BY created_at DESC`,
    [recordId, userId]
  )

  const summary = mapSummaryRow(row)
  return {
    ...summary,
    payload: row.payload ?? null,
    followups: followups.map(mapFollowUpRow),
  }
}

/** 按 archive_key 取单条摘要（诊断卡挂载后回查是否已入档）。 */
export async function getMedicalRecordByArchiveKey(
  userId: number,
  archiveKey: string
): Promise<MedicalRecordSummary | null> {
  await initDB()
  const row = await queryOne<any>(
    `SELECT id, user_id, archive_key, session_id, message_id, crop, disease_name,
            category, confidence, severity, affected_parts, summary, note, image_thumbnail,
            status, treated_at, resolved_at, created_at, updated_at
       FROM diagnosis_records WHERE user_id = $1 AND archive_key = $2`,
    [userId, archiveKey]
  )
  return row ? mapSummaryRow(row) : null
}

// ---------------------------------------------------------------------------
// 状态流转
// ---------------------------------------------------------------------------

/**
 * 更新病历状态。
 * - 置 `treating` 时若无 treated_at 则补记（首次开始处置的时间）
 * - 置 `resolved` 时补记 resolved_at 且保留已有序（不覆盖）
 * - 从 resolved/archived 退回时**不清空** treated_at（保留处置痕迹）
 */
export async function updateMedicalRecordStatus(
  userId: number,
  recordId: number,
  status: MedicalRecordStatus
): Promise<MedicalRecordSummary | null> {
  await initDB()
  const now = Date.now()
  const current = await queryOne<any>(
    `SELECT * FROM diagnosis_records WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  )
  if (!current) return null

  const treatedAt =
    status === "treating" || status === "resolved"
      ? current.treated_at ?? now
      : current.treated_at ?? null
  const resolvedAt =
    status === "resolved" ? current.resolved_at ?? now : current.resolved_at ?? null

  await execute(
    `UPDATE diagnosis_records
        SET status = $1, treated_at = $2, resolved_at = $3, updated_at = $4
      WHERE id = $5 AND user_id = $6`,
    [status, treatedAt, resolvedAt, now, recordId, userId]
  )

  const row = await queryOne<any>(
    `SELECT * FROM diagnosis_records WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  )
  return row ? mapSummaryRow(row) : null
}

/**
 * 修改病历的可编辑字段（AI「改病历」工具 / 面板都用它）。
 *
 * 只允许改三样：`diseaseName`（纠正 AI 误判）、`severity`、`note`（备注）。
 * 状态流转走 `updateMedicalRecordStatus`，复诊走 `appendFollowUp`，互不重叠。
 *
 * ⚠️ `payload` 是「当时的诊断」快照 —— **绝不覆盖**。
 *    纠正病名/严重度时只在 `payload.corrections` 旁挂一条「from → to」的审计记录，
 *    这样"改过什么、原来是什么"永远查得到。
 * 无实际变化时幂等返回现状（不写审计、不刷 updated_at）。
 */
export async function updateMedicalRecordFields(
  userId: number,
  recordId: number,
  input: UpdateMedicalRecordInput
): Promise<MedicalRecordSummary | null> {
  await initDB()
  const current = await queryOne<any>(
    `SELECT * FROM diagnosis_records WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  )
  if (!current) return null

  const sets: string[] = []
  const params: any[] = []
  const corrections: Record<string, unknown> = {}

  if (input.diseaseName !== undefined) {
    const next = String(input.diseaseName).trim()
    if (next && next !== current.disease_name) {
      corrections.diseaseName = { from: current.disease_name, to: next }
      params.push(next)
      sets.push(`disease_name = $${params.length}`)
    }
  }
  if (input.severity !== undefined && input.severity !== current.severity) {
    corrections.severity = { from: current.severity, to: input.severity }
    params.push(input.severity)
    sets.push(`severity = $${params.length}`)
  }
  if (input.note !== undefined) {
    const next = input.note == null ? null : String(input.note)
    if (next !== (current.note ?? null)) {
      params.push(next)
      sets.push(`note = $${params.length}`)
    }
  }

  if (sets.length === 0) return mapSummaryRow(current)

  if (Object.keys(corrections).length > 0) {
    const payload = current.payload && typeof current.payload === 'object' ? current.payload : {}
    const list = Array.isArray((payload as any).corrections) ? (payload as any).corrections : []
    list.push({ at: Date.now(), ...corrections })
    params.push(JSON.stringify({ ...payload, corrections: list }))
    sets.push(`payload = $${params.length}::jsonb`)
  }

  params.push(Date.now())
  sets.push(`updated_at = $${params.length}`)
  params.push(recordId)
  const idIdx = params.length
  params.push(userId)
  const userIdx = params.length

  await execute(
    `UPDATE diagnosis_records SET ${sets.join(', ')} WHERE id = $${idIdx} AND user_id = $${userIdx}`,
    params
  )

  const row = await queryOne<any>(
    `SELECT * FROM diagnosis_records WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  )
  return row ? mapSummaryRow(row) : null
}

/**
 * 追加一次复诊。
 *
 * `stage` = 该病历现有复诊数 + 1；同时在**事务内**把病历状态推进：
 * 疗效为 `cured` → resolved；`worse` → treating（重新进入处置）。
 */
export async function appendFollowUp(
  userId: number,
  recordId: number,
  input: AppendFollowUpInput
): Promise<DiagnosisFollowUp | null> {
  await initDB()

  return withTransaction(async (client) => {
    const own = await client.query(
      `SELECT id, status FROM diagnosis_records WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [recordId, userId]
    )
    if (own.rows.length === 0) return null

    const countRes = await client.query(
      `SELECT COUNT(*)::int AS n FROM diagnosis_followups WHERE record_id = $1`,
      [recordId]
    )
    const stage = Number(countRes.rows[0]?.n || 0) + 1
    const now = Date.now()

    const inserted = await client.query(
      `INSERT INTO diagnosis_followups
        (record_id, user_id, stage, efficacy, severity, note, image_thumbnail, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
       RETURNING *`,
      [
        recordId,
        userId,
        stage,
        input.efficacy,
        input.severity || null,
        input.note || null,
        input.image_thumbnail || null,
        input.payload ? JSON.stringify(input.payload) : null,
        now,
      ]
    )

    // 疗效 → 状态推进（只在更严重时才回退，避免"好转"后又因为一次 worse 之外的操作掉状态）
    const currentStatus = own.rows[0].status as MedicalRecordStatus
    let nextStatus: MedicalRecordStatus = currentStatus
    let resolvedAt: number | null = null
    if (input.efficacy === "cured") {
      nextStatus = "resolved"
      resolvedAt = now
    } else if (input.efficacy === "worse") {
      nextStatus = "treating"
    } else if (currentStatus === "open") {
      nextStatus = "treating"
    }

    const treatedAt = currentStatus === "open" ? now : null

    await client.query(
      `UPDATE diagnosis_records
          SET status = $1,
              treated_at = COALESCE(treated_at, $2),
              resolved_at = COALESCE($3, resolved_at),
              updated_at = $4
        WHERE id = $5 AND user_id = $6`,
      [nextStatus, treatedAt, resolvedAt, now, recordId, userId]
    )

    return mapFollowUpRow(inserted.rows[0])
  })
}

/** 删除一条复诊记录（回填错了可以撤销），同时把 stage 重排。 */
export async function deleteFollowUp(
  userId: number,
  recordId: number,
  followUpId: number
): Promise<boolean> {
  await initDB()
  return withTransaction(async (client) => {
    const del = await client.query(
      `DELETE FROM diagnosis_followups WHERE id = $1 AND record_id = $2 AND user_id = $3`,
      [followUpId, recordId, userId]
    )
    if ((del.rowCount ?? 0) === 0) return false

    // 重排 stage（按时间正序）
    const rows = await client.query(
      `SELECT id FROM diagnosis_followups WHERE record_id = $1 ORDER BY created_at ASC`,
      [recordId]
    )
    for (let i = 0; i < rows.rows.length; i++) {
      await client.query(`UPDATE diagnosis_followups SET stage = $1 WHERE id = $2`, [
        i + 1,
        rows.rows[i].id,
      ])
    }
    return true
  })
}

/** 删除一条病历（连带复诊，事务内）。 */
export async function deleteMedicalRecord(userId: number, recordId: number): Promise<boolean> {
  await initDB()
  return withTransaction(async (client) => {
    const own = await client.query(
      `SELECT id FROM diagnosis_records WHERE id = $1 AND user_id = $2`,
      [recordId, userId]
    )
    if (own.rows.length === 0) return false
    await client.query(`DELETE FROM diagnosis_followups WHERE record_id = $1 AND user_id = $2`, [
      recordId,
      userId,
    ])
    await client.query(`DELETE FROM diagnosis_records WHERE id = $1 AND user_id = $2`, [
      recordId,
      userId,
    ])
    return true
  })
}

// ---------------------------------------------------------------------------
// 统计
// ---------------------------------------------------------------------------

/** 病历总览统计（页面顶部统计条）。 */
export async function getMedicalRecordStats(userId: number): Promise<MedicalRecordStats> {
  await initDB()

  const statusRows = await query<{ status: string; n: number }>(
    `SELECT status, COUNT(*)::int AS n FROM diagnosis_records WHERE user_id = $1 GROUP BY status`,
    [userId]
  )
  const byStatus: Record<string, number> = {}
  let total = 0
  for (const r of statusRows) {
    byStatus[r.status] = Number(r.n)
    total += Number(r.n)
  }

  const followedRow = await queryOne<{ n: number }>(
    `SELECT COUNT(DISTINCT record_id)::int AS n FROM diagnosis_followups WHERE user_id = $1`,
    [userId]
  )
  const followed = Number(followedRow?.n || 0)

  // 最近一次复诊为 cured 的病历数（用 DISTINCT ON 取每条病历最新一次疗效）
  const curedRow = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM (
        SELECT DISTINCT ON (record_id) record_id, efficacy
          FROM diagnosis_followups WHERE user_id = $1
         ORDER BY record_id, created_at DESC
     ) t WHERE t.efficacy = 'cured'`,
    [userId]
  )
  const cured = Number(curedRow?.n || 0)

  const recentRow = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM diagnosis_records WHERE user_id = $1 AND created_at > $2`,
    [userId, Date.now() - 30 * 24 * 60 * 60 * 1000]
  )

  return {
    total,
    open: byStatus["open"] || 0,
    treating: byStatus["treating"] || 0,
    resolved: byStatus["resolved"] || 0,
    archived: byStatus["archived"] || 0,
    followed,
    cured,
    cureRate: followed > 0 ? cured / followed : null,
    recent30: Number(recentRow?.n || 0),
  }
}

/** 列出出现过的病名（筛选下拉用）。 */
export async function listDiseaseNames(userId: number): Promise<string[]> {
  await initDB()
  const rows = await query<{ disease_name: string }>(
    `SELECT disease_name, COUNT(*)::int AS n
       FROM diagnosis_records WHERE user_id = $1
      GROUP BY disease_name ORDER BY n DESC LIMIT 50`,
    [userId]
  )
  return rows.map((r) => r.disease_name)
}
