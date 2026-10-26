/**
 * 内置病历工具（builtin-medical-records）
 *
 * 两个只读 + 两个写：
 *   · `query_medical_records` —— 按状态/病名/关键词筛病历，附全量统计
 *   · `get_medical_record`    —— 取某一份病历的完整快照（当时的诊断 + 后续复诊）
 *   · `update_medical_record` —— 改状态 / 纠正病名与严重度 / 写备注
 *   · `delete_medical_record` —— 默认**归档**（可恢复），明确要求时才永久删除
 *
 * ── 为什么要有它 ──
 * 病历是「有状态的档案」，用户问的自然语言往往跨多条记录：
 * "我这茬草莓得过几次病？""上次那个灰霉病后来好了吗？""我最近有什么没处理的？"
 * 没有工具时模型只能瞎猜或反问，有了它就能**基于真实档案回答**。
 *
 * ── 铁律 ──
 * 1. 读工具无副作用；**写工具必须谨慎**，见下面两条。
 * 2. 🚨 删除默认走 `archived` 归档（数据不丢、可恢复）。只有用户**明确说**
 *    "永久删除 / 彻底删掉 / 从数据库删" 时才允许 `permanent: true`。含糊的"删掉"一律归档。
 * 3. 改病名/严重度是**纠正 AI 误判**用的，服务层会把原值写进 `payload.corrections` 留痕，
 *    所以可以放心改；但仍应先复述"原值 → 新值"让用户确认。
 * 4. 一律按 `agentContext.userId` 隔离，工具参数里**不接受** user_id（防越权）。
 */

import {
  listMedicalRecords,
  getMedicalRecordDetail,
  getMedicalRecordStats,
  listDiseaseNames,
  updateMedicalRecordFields,
  updateMedicalRecordStatus,
  deleteMedicalRecord,
  type MedicalRecordStatus,
} from '@/lib/db/medical-record-service'
import { RECORD_STATUS_META, EFFICACY_META, type FollowUpEfficacy } from '@/lib/types/medical-record'
import type { DiagnosisSeverity } from '@/lib/types/vision-diagnosis'
import type { AgentToolContext, ToolCallResult } from './mcp-tool-executor'

const VALID_STATUSES: MedicalRecordStatus[] = ['open', 'treating', 'resolved', 'archived']
const VALID_SEVERITIES: DiagnosisSeverity[] = ['none', 'mild', 'moderate', 'severe']

function fmtDate(ts: number | null | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 把一条病历压成给模型看的一行（正文由模型自己组织） */
function rowBrief(r: any): string {
  const bits: string[] = [`#${r.id}`, r.disease_name]
  bits.push(`严重度=${r.severity}`)
  bits.push(`状态=${RECORD_STATUS_META[r.status as MedicalRecordStatus]?.label || r.status}`)
  if (r.confidence != null) bits.push(`置信度=${Math.round(r.confidence * 100)}%`)
  if (r.crop) bits.push(`作物=${r.crop}`)
  bits.push(`首诊=${fmtDate(r.created_at)}`)
  if (r.followup_count) {
    const eff = r.latest_efficacy ? `最新疗效=${EFFICACY_META[r.latest_efficacy as FollowUpEfficacy]?.label || r.latest_efficacy}` : ''
    bits.push(`复诊${r.followup_count}次${eff ? `，${eff}` : ''}`)
  }
  return bits.join(' | ')
}

export async function executeMedicalRecordTool(
  functionName: string,
  args: Record<string, any>,
  agentContext?: AgentToolContext
): Promise<ToolCallResult> {
  const userId = agentContext?.userId
  if (!userId) {
    return { success: false, error: '当前会话没有识别到用户身份，无法查询病历。' }
  }

  // -------------------------------------------------------------------------
  // 列举 / 检索
  // -------------------------------------------------------------------------
  if (functionName === 'query_medical_records') {
    const rawStatus = typeof args?.status === 'string' ? args.status.trim() : ''
    const status =
      rawStatus && rawStatus !== 'all' && VALID_STATUSES.includes(rawStatus as MedicalRecordStatus)
        ? (rawStatus as MedicalRecordStatus)
        : 'all'
    const limit = Math.min(Math.max(Number(args?.limit) || 20, 1), 50)

    try {
      agentContext?.onStage?.('正在翻你的病历…')

      const [{ items, total }, stats, diseaseNames] = await Promise.all([
        listMedicalRecords(userId, {
          limit,
          status,
          diseaseName: typeof args?.disease_name === 'string' && args.disease_name.trim() ? args.disease_name.trim() : undefined,
          crop: typeof args?.crop === 'string' && args.crop.trim() ? args.crop.trim() : undefined,
          keyword: typeof args?.keyword === 'string' && args.keyword.trim() ? args.keyword.trim() : undefined,
        }),
        getMedicalRecordStats(userId),
        listDiseaseNames(userId),
      ])

      if (stats.total === 0) {
        return {
          success: true,
          data: {
            summary:
              '该用户还没有任何病历。病历由图像诊断自动入档 —— 可以让用户先拍一张植株照片做一次诊断。',
            total: 0,
            items: [],
          },
        }
      }

      if (items.length === 0) {
        return {
          success: true,
          data: {
            summary: `共 ${stats.total} 份病历，但当前筛选条件下没有匹配项。可用病名：${diseaseNames.join('、') || '（无）'}`,
            total: stats.total,
            matched: 0,
            availableDiseases: diseaseNames,
            items: [],
          },
        }
      }

      const lines = items.map(rowBrief).join('\n')
      const overview =
        `共 ${stats.total} 份病历：待处置 ${stats.open}、处置中 ${stats.treating}、已解决 ${stats.resolved}、已归档 ${stats.archived}；` +
        (stats.followed > 0
          ? `${stats.followed} 份有复诊记录，其中 ${stats.cured} 份痊愈（治愈率 ${Math.round((stats.cureRate || 0) * 100)}%）`
          : '暂无复诊记录，因此还没有治愈率')

      return {
        success: true,
        data: {
          summary: `${overview}\n本次列出 ${items.length} 份（共匹配 ${total} 份）：\n${lines}`,
          total: stats.total,
          matched: total,
          stats,
          availableDiseases: diseaseNames,
          items: items.map((r) => ({
            id: r.id,
            disease_name: r.disease_name,
            category: r.category,
            severity: r.severity,
            status: r.status,
            status_label: RECORD_STATUS_META[r.status]?.label,
            confidence: r.confidence,
            crop: r.crop,
            affected_parts: r.affected_parts,
            summary: r.summary,
            first_seen: fmtDate(r.created_at),
            followup_count: r.followup_count || 0,
            latest_efficacy: r.latest_efficacy || null,
          })),
        },
      }
    } catch (e: any) {
      console.error('[MedicalRecords] query failed:', e?.message)
      return { success: false, error: e?.message || '查询病历失败' }
    }
  }

  // -------------------------------------------------------------------------
  // 单份详情
  // -------------------------------------------------------------------------
  if (functionName === 'get_medical_record') {
    const id = Number(args?.record_id ?? args?.id)
    if (!Number.isFinite(id) || id <= 0) {
      return { success: false, error: '请提供合法的病历 id（可先用 query_medical_records 取得）。' }
    }

    try {
      const detail = await getMedicalRecordDetail(userId, id)
      if (!detail) {
        return { success: false, error: `没有找到 id=${id} 的病历（可能不属于当前用户或已被删除）。` }
      }

      const p = detail.payload
      const parts: string[] = []
      parts.push(`病历 #${detail.id}：${detail.disease_name}（${RECORD_STATUS_META[detail.status]?.label || detail.status}）`)
      if (detail.crop) parts.push(`作物：${detail.crop}`)
      parts.push(`首诊：${fmtDate(detail.created_at)}`)
      if (p?.severity) parts.push(`严重度：${p.severity}`)
      if (p?.confidence != null) parts.push(`置信度：${Math.round(p.confidence * 100)}%`)
      if (p?.affectedParts?.length) parts.push(`发病部位：${p.affectedParts.join('、')}`)
      if (p?.summary) parts.push(`当时结论：${p.summary}`)
      if (p?.evidence?.length) parts.push(`图中依据：${p.evidence.join('；')}`)

      if (detail.followups.length > 0) {
        const asc = [...detail.followups].sort((a, b) => a.created_at - b.created_at)
        const timeline = asc
          .map((f) => {
            const eff = EFFICACY_META[f.efficacy]?.label || f.efficacy
            return `第 ${f.stage} 次（${fmtDate(f.created_at)}）：${eff}${f.note ? ` —— ${f.note}` : ''}`
          })
          .join('\n')
        parts.push(`病程记录（共 ${asc.length} 次复诊）：\n${timeline}`)
      } else {
        parts.push('病程记录：尚无复诊回填')
      }

      // 防治要点：只给"做什么"，不把四级方案全文灌进上下文
      if (p?.treatments?.length) {
        const t = p.treatments
          .map((lv: any) => `${lv.label || lv.level}：${Array.isArray(lv.actions) ? lv.actions.join('、') : ''}${lv.safetyIntervalDays ? `（安全间隔 ${lv.safetyIntervalDays} 天）` : ''}`)
          .join('\n')
        parts.push(`当时给的防治方案：\n${t}`)
      }

      return {
        success: true,
        data: {
          summary: parts.join('\n'),
          record: {
            id: detail.id,
            disease_name: detail.disease_name,
            status: detail.status,
            crop: detail.crop,
            first_seen: fmtDate(detail.created_at),
            treated_at: detail.treated_at ? fmtDate(detail.treated_at) : null,
            resolved_at: detail.resolved_at ? fmtDate(detail.resolved_at) : null,
            followups: detail.followups.map((f) => ({
              stage: f.stage,
              efficacy: f.efficacy,
              efficacy_label: EFFICACY_META[f.efficacy]?.label,
              severity: f.severity,
              note: f.note,
              at: fmtDate(f.created_at),
            })),
          },
        },
      }
    } catch (e: any) {
      console.error('[MedicalRecords] detail failed:', e?.message)
      return { success: false, error: e?.message || '读取病历详情失败' }
    }
  }

  // -------------------------------------------------------------------------
  // 修改病历（写）
  // -------------------------------------------------------------------------
  if (functionName === 'update_medical_record') {
    const id = Number(args?.record_id ?? args?.id)
    if (!Number.isFinite(id) || id <= 0) {
      return { success: false, error: '请提供合法的病历 id（可先用 query_medical_records 取得）。' }
    }

    const rawStatus = typeof args?.status === 'string' ? args.status.trim() : ''
    if (rawStatus && !VALID_STATUSES.includes(rawStatus as MedicalRecordStatus)) {
      return {
        success: false,
        error: `不支持的状态「${rawStatus}」。可选：open（待处置）/ treating（处置中）/ resolved（已解决）/ archived（已归档）。`,
      }
    }
    const nextStatus = rawStatus ? (rawStatus as MedicalRecordStatus) : undefined

    const diseaseName =
      typeof args?.disease_name === 'string' && args.disease_name.trim() ? args.disease_name.trim() : undefined

    const rawSeverity = typeof args?.severity === 'string' ? args.severity.trim() : ''
    if (rawSeverity && !VALID_SEVERITIES.includes(rawSeverity as DiagnosisSeverity)) {
      return { success: false, error: `不支持的严重度「${rawSeverity}」。可选：none / mild / moderate / severe。` }
    }
    const severity = rawSeverity ? (rawSeverity as DiagnosisSeverity) : undefined

    const noteProvided = Object.prototype.hasOwnProperty.call(args || {}, 'note')
    const note = noteProvided ? (args.note == null ? null : String(args.note)) : undefined

    if (nextStatus === undefined && diseaseName === undefined && severity === undefined && !noteProvided) {
      return { success: false, error: '请至少指定要改的内容：status / disease_name / severity / note 之一。' }
    }

    try {
      agentContext?.onStage?.('正在更新病历…')
      const before = await getMedicalRecordDetail(userId, id)
      if (!before) {
        return { success: false, error: `没有找到 id=${id} 的病历（可能不属于当前用户或已被删除）。` }
      }

      // 先算 diff —— 让模型能如实复述"改了什么"，也让"无需修改"不产生空写入
      const changes: string[] = []
      if (diseaseName !== undefined && diseaseName !== before.disease_name) {
        changes.push(`病名：${before.disease_name} → ${diseaseName}`)
      }
      if (severity !== undefined && severity !== before.severity) {
        changes.push(`严重度：${before.severity} → ${severity}`)
      }
      if (noteProvided && (note ?? null) !== (before.note ?? null)) {
        changes.push(note ? `备注：${note}` : '备注：已清空')
      }
      if (nextStatus !== undefined && nextStatus !== before.status) {
        changes.push(
          `状态：${RECORD_STATUS_META[before.status]?.label || before.status} → ${RECORD_STATUS_META[nextStatus]?.label || nextStatus}`
        )
      }

      if (changes.length === 0) {
        return {
          success: true,
          data: {
            summary: `病历 #${id}（${before.disease_name}）本来就是这样的，无需修改。`,
            record_id: id,
            changed: [],
          },
        }
      }

      // 字段与状态分开写：状态走 updateMedicalRecordStatus 以复用 treated_at / resolved_at 逻辑
      if (diseaseName !== undefined || severity !== undefined || noteProvided) {
        await updateMedicalRecordFields(userId, id, { diseaseName, severity, note })
      }
      if (nextStatus !== undefined) {
        await updateMedicalRecordStatus(userId, id, nextStatus)
      }
      const after = await getMedicalRecordDetail(userId, id)

      return {
        success: true,
        data: {
          summary:
            `已更新病历 #${id}（${after?.disease_name || before.disease_name}）：\n` +
            changes.map((c) => `· ${c}`).join('\n') +
            `\n当前状态：${RECORD_STATUS_META[(after?.status || before.status) as MedicalRecordStatus]?.label || after?.status}`,
          record_id: id,
          changed: changes,
          record: after
            ? {
                id: after.id,
                disease_name: after.disease_name,
                severity: after.severity,
                status: after.status,
                note: after.note,
              }
            : null,
        },
      }
    } catch (e: any) {
      console.error('[MedicalRecords] update failed:', e?.message)
      return { success: false, error: e?.message || '更新病历失败' }
    }
  }

  // -------------------------------------------------------------------------
  // 删除 / 归档病历（写）
  // -------------------------------------------------------------------------
  if (functionName === 'delete_medical_record') {
    const id = Number(args?.record_id ?? args?.id)
    if (!Number.isFinite(id) || id <= 0) {
      return { success: false, error: '请提供合法的病历 id（可先用 query_medical_records 取得）。' }
    }
    // 默认归档；只有模型判定用户「明确要求永久删除」时才传 true
    const permanent = args?.permanent === true

    try {
      const before = await getMedicalRecordDetail(userId, id)
      if (!before) {
        return { success: false, error: `没有找到 id=${id} 的病历（可能不属于当前用户或已被删除）。` }
      }

      if (!permanent) {
        if (before.status === 'archived') {
          return {
            success: true,
            data: {
              summary: `病历 #${id}（${before.disease_name}）本来就处于「已归档」，无需重复操作。`,
              record_id: id,
              mode: 'archive',
              restorable: true,
            },
          }
        }
        agentContext?.onStage?.('正在归档病历…')
        await updateMedicalRecordStatus(userId, id, 'archived')
        return {
          success: true,
          data: {
            summary:
              `已把病历 #${id}（${before.disease_name}）归档（不是删除，数据完好）。\n` +
              `归档后不再计入待办；如需找回，可以说"把 #${id} 恢复"；如果确实要彻底删掉，请让用户明确说"永久删除"。`,
            record_id: id,
            mode: 'archive',
            restorable: true,
          },
        }
      }

      agentContext?.onStage?.('正在永久删除病历…')
      const okDel = await deleteMedicalRecord(userId, id)
      if (!okDel) return { success: false, error: `删除失败：没有找到 id=${id} 的病历。` }
      return {
        success: true,
        data: {
          summary: `已永久删除病历 #${id}（${before.disease_name}）及其 ${before.followups.length} 条复诊记录。此操作不可恢复。`,
          record_id: id,
          mode: 'permanent',
          restorable: false,
        },
      }
    } catch (e: any) {
      console.error('[MedicalRecords] delete failed:', e?.message)
      return { success: false, error: e?.message || '删除病历失败' }
    }
  }

  return { success: false, error: `未知的病历工具: ${functionName}` }
}
