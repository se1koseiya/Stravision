/**
 * 病历类型层 —— 视觉诊断沉淀的「档案」
 *
 * 与 `lib/db/medical-record-service.ts` 分离的原因：
 * 服务层 import 了 `pg`（仅服务端可用），而病历页是客户端组件。
 * 把契约放这里，客户端可以 `import type` 拿到形状而不把数据库驱动拖进 bundle。
 */

import type { DiagnosisResult, DiagnosisSeverity, DiseaseCategory } from "./vision-diagnosis"

/** 病历状态：待处置 → 处置中 → 已解决（或用户手动归档） */
export type MedicalRecordStatus = "open" | "treating" | "resolved" | "archived"

/**
 * 疗效分档 —— 复诊时回填。
 * `cured` 是终点（痊愈），其余三档表示相对上次的变化方向。
 */
export type FollowUpEfficacy = "improved" | "stable" | "worse" | "cured"

export interface MedicalRecordSummary {
  id: number
  user_id: number
  /** 幂等键（`${sessionId}:${消息键}:${partIndex}:${指纹}`） */
  archive_key: string
  session_id: string | null
  message_id: string | null
  crop: string | null
  disease_name: string
  category: DiseaseCategory
  confidence: number | null
  severity: DiagnosisSeverity
  affected_parts: string[]
  summary: string | null
  /** 病历备注（AI 或用户补充的说明，如"已打药""雨后复发"）—— 与「当时诊断」快照分列存储，纠正病名不污染它 */
  note: string | null
  /** 压缩后的缩略图（dataURL），可能为 null（压缩失败时） */
  image_thumbnail: string | null
  status: MedicalRecordStatus
  treated_at: number | null
  resolved_at: number | null
  created_at: number
  updated_at: number
  /** 复诊次数 */
  followup_count?: number
  /** 最近一次复诊疗效 */
  latest_efficacy?: FollowUpEfficacy | null
}

export interface DiagnosisFollowUp {
  id: number
  record_id: number
  user_id: number
  /** 第几次复诊（从 1 开始） */
  stage: number
  efficacy: FollowUpEfficacy
  severity: DiagnosisSeverity | null
  note: string | null
  image_thumbnail: string | null
  /** 复诊时的诊断快照（可选） */
  payload: DiagnosisResult | null
  created_at: number
}

export interface MedicalRecordDetail extends MedicalRecordSummary {
  /** 完整诊断快照 —— 病历要能「原样回放」当时的诊断 */
  payload: DiagnosisResult | null
  followups: DiagnosisFollowUp[]
}

export interface MedicalRecordStats {
  total: number
  open: number
  treating: number
  resolved: number
  archived: number
  /** 有复诊记录的病历数 */
  followed: number
  /** 最近一次复诊为「痊愈」的病历数 */
  cured: number
  /** 治愈率（cured / followed）；无复诊时为 null —— 不臆造 0% */
  cureRate: number | null
  /** 近 30 天新增 */
  recent30: number
}

// ---------------------------------------------------------------------------
// 展示元数据
// ---------------------------------------------------------------------------

export const RECORD_STATUS_META: Record<MedicalRecordStatus, { label: string; hint: string }> = {
  open: { label: "待处置", hint: "尚未开始处理" },
  treating: { label: "处置中", hint: "已采取措施，等待复诊" },
  resolved: { label: "已解决", hint: "已痊愈或症状消失" },
  archived: { label: "已归档", hint: "不再跟踪" },
}

export const EFFICACY_META: Record<
  FollowUpEfficacy,
  { label: string; hint: string; tone: "ok" | "warn" | "danger" }
> = {
  cured: { label: "痊愈", hint: "症状完全消失", tone: "ok" },
  improved: { label: "好转", hint: "症状减轻", tone: "ok" },
  stable: { label: "无变化", hint: "症状与上次相当", tone: "warn" },
  worse: { label: "恶化", hint: "症状加重，需重新处置", tone: "danger" },
}

/**
 * 病情指数 —— 把严重度映射成可画曲线的数值（越高越重）。
 * 用于病程走势：首诊 + 每次复诊连成一条线，直观看出"在好转还是在恶化"。
 */
export const SEVERITY_INDEX: Record<DiagnosisSeverity, number> = {
  none: 0,
  mild: 1,
  moderate: 2,
  severe: 3,
}
