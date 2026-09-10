"use client"

/**
 * 设备接入会话全局状态（轻量跨组件同步）
 *
 * 数据流：
 *   后端生成草稿 → AI 输出 <DEVICE_FORGE>{card JSON}</DEVICE_FORGE>
 *   → 消息渲染器 parseDeviceForgeCard → <DeviceForgeCard> 组件
 *   → 组件 mount 时把 card 写入本 store → 右侧「设备接入面板」实时读取渲染
 *   → 用户在卡片/面板任一侧编辑表单，patchDraft 双向同步
 *
 * 使用 useSyncExternalStore，避免引入重型状态库。
 */

export interface ForgeDraftMetric {
  key: string
  label: string
  unit: string
  mqtt_field: string
  scale?: number
}

export interface ForgeDraftForm {
  name: string
  type: 'relay' | 'sensor' | 'camera' | 'stepper'
  category: string
  icon?: string
  color?: string
  subscribe_topic?: string
  publish_topic?: string
  node_id?: string
  relay_num?: number
  metrics?: ForgeDraftMetric[]
  extra_config?: Record<string, unknown>
}

export interface DeviceForgeIssue {
  field: string
  message: string
  level: 'error' | 'warning'
}

export interface DeviceForgeCardData {
  status: 'ready' | 'failed'
  error?: string
  subject?: string
  description?: string
  issues: DeviceForgeIssue[]
  dryRun?: {
    passed: boolean
    payloadError?: string
    metrics: Array<{ key: string; label: string; field: string; ok: boolean; err?: string }>
  }
  draft?: ForgeDraftForm
  usageDoc?: string
}

/** DEVICE_FORGE 会话四段时间线（用于右侧面板与卡片内失败原因可视化） */
export interface DeviceForgeStep {
  id: string
  label: string
  state: 'pending' | 'running' | 'done' | 'warn' | 'fail'
  detail: string
}

export interface DeviceForgeSnapshot {
  /** 唯一会话 id（同一消息内卡片 id 不变） */
  sessionId: string
  card: DeviceForgeCardData | null
  steps: DeviceForgeStep[]
  /** 面板是否打开 */
  panelOpen: boolean
  /** 当前编辑中的表单（表单编辑 → patch 保持双端同步） */
  form: ForgeDraftForm | null
  /** 「装入莓小智」执行状态（卡片/面板共享，避免双端不一致） */
  installStatus: 'idle' | 'loading' | 'success' | 'error'
  installError?: string
  installedDevice?: { id: number; name: string }
}

const STAGE_SEQ = ['analyze', 'generate', 'validate', 'dry-run', 'deliver'] as const
const STAGE_LABELS: Record<string, string> = {
  analyze: '阅读接入文档',
  generate: '生成接入配置',
  validate: '规则校验',
  'dry-run': '报文干跑核对',
  deliver: '交付草稿',
}

/** 从最终 card 重建完整时间线（失败原因逐条展开为独立步骤） */
export function buildStepsFromCard(card: DeviceForgeCardData): DeviceForgeStep[] {
  const steps: DeviceForgeStep[] = []
  const push = (s: DeviceForgeStep) => steps.push(s)

  if (card.status === 'failed') {
    push({ id: 'analyze', label: STAGE_LABELS.analyze, state: 'fail', detail: card.error || '生成流程中断' })
    return steps
  }

  const errs = card.issues.filter(i => i.level === 'error')
  const warns = card.issues.filter(i => i.level === 'warning')
  const dryMiss = (card.dryRun?.metrics || []).filter(m => !m.ok)

  const allGood =
    errs.length === 0 &&
    dryMiss.length === 0 &&
    (card.dryRun?.passed !== false)

  // 识别/生成（同一完成态；若校验有错则注明）
  push({
    id: 'generate',
    label: '识别设备与生成配置',
    state: allGood ? 'done' : 'done',
    detail: `识别对象${card.subject ? `「${card.subject}」` : ''}${card.draft?.metrics?.length ? `，映射 ${card.draft.metrics.length} 个数据点` : ''}，草稿已生成`,
  })

  // 校验步骤：每个 error 一条，有 error 则该步 fail；仅有 warning 标 warn
  if (errs.length > 0) {
    for (const e of errs) {
      push({ id: `validate-err-${e.field}-${e.message.slice(0, 8)}`, label: `校验失败 · ${e.field}`, state: 'fail', detail: e.message })
    }
  } else if (warns.length > 0) {
    push({
      id: 'validate',
      label: STAGE_LABELS.validate,
      state: 'warn',
      detail: `基础校验通过，但有 ${warns.length} 项建议：${warns.map(w => `${w.field}：${w.message}`).join('；')}`,
    })
  } else {
    push({ id: 'validate', label: STAGE_LABELS.validate, state: 'done', detail: '必填项与格式校验通过' })
  }

  // dry-run 步骤
  if (card.draft?.type === 'sensor') {
    if (dryMiss.length > 0) {
      for (const m of dryMiss) {
        push({ id: `dry-${m.key}`, label: `数据点映射失败 · ${m.label || m.key}`, state: 'fail', detail: m.err || `报文取值路径 ${m.field} 取不到值` })
      }
    } else if (card.dryRun?.payloadError) {
      push({ id: 'dry-payload', label: '报文干跑核对', state: 'fail', detail: card.dryRun.payloadError })
    } else if (card.dryRun?.passed) {
      push({ id: 'dry-run', label: STAGE_LABELS['dry-run'], state: 'done', detail: `用模拟报文干跑：${(card.dryRun?.metrics || []).length} 个数据点全部可取值` })
    } else {
      push({ id: 'dry-run', label: STAGE_LABELS['dry-run'], state: 'warn', detail: '未进行干跑核对（缺少模拟报文）' })
    }
  } else {
    push({ id: 'dry-run', label: '下行控制通道', state: card.draft?.publish_topic ? 'done' : 'fail', detail: card.draft?.publish_topic ? `控制 topic：${card.draft.publish_topic}` : '缺少下行控制 topic，装入前请补充' })
  }

  push({
    id: 'deliver',
    label: '交付',
    state: allGood ? 'done' : 'warn',
    detail: allGood ? '草稿就绪，可在下方表单确认后「装入莓小智」' : '存在未达标项，建议在表单中修正后再装入',
  })
  return steps
}

function createInitialStore(): DeviceForgeSnapshot {
  return { sessionId: '', card: null, steps: [], panelOpen: false, form: null, installStatus: 'idle' }
}

let store: DeviceForgeSnapshot = createInitialStore()
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

export const deviceForgeStore = {
  getSnapshot(): DeviceForgeSnapshot {
    return store
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  /** 卡片渲染时注册会话（同一消息多次渲染幂等：sessionId 相同则只更新不重置） */
  registerCard(sessionId: string, card: DeviceForgeCardData): void {
    const isNewSession = store.sessionId !== sessionId
    store = {
      ...store,
      sessionId,
      card,
      steps: buildStepsFromCard(card),
      form: card.draft ? { ...card.draft, metrics: card.draft.metrics ? card.draft.metrics.map(m => ({ ...m })) : [] } : null,
      // 新会话重置上一次的装入状态（避免历史成功状态串到新草稿）
      ...(isNewSession ? { installStatus: 'idle' as const, installError: undefined, installedDevice: undefined } : {}),
    }
    emit()
  },
  /** 用户编辑表单（卡片/面板任一侧），同步给另一侧 */
  patchForm(form: ForgeDraftForm): void {
    store = { ...store, form: { ...form, metrics: form.metrics ? form.metrics.map(m => ({ ...m })) : [] } }
    emit()
  },
  /** 「装入莓小智」执行状态（卡片与面板共享） */
  setInstall(status: DeviceForgeSnapshot['installStatus'], extra?: { error?: string; device?: { id: number; name: string } }): void {
    store = {
      ...store,
      installStatus: status,
      installError: status === 'error' ? extra?.error : undefined,
      installedDevice: status === 'success' && extra?.device ? extra.device : store.installedDevice,
    }
    emit()
  },
  /** 打开/关闭面板 */
  setPanelOpen(open: boolean): void {
    if (store.panelOpen === open) return
    store = { ...store, panelOpen: open }
    emit()
  },
  /** 清除会话（新设备接入开始或用户手动关闭） */
  clear(): void {
    store = createInitialStore()
    emit()
  },
}

// ============ <DEVICE_FORGE> 标签解析 ============

/** 从 <DEVICE_FORGE>{json}</DEVICE_FORGE> 标签提取 card 数据 */
export function parseDeviceForgeCardData(inner: string): DeviceForgeCardData | null {
  try {
    const raw = JSON.parse(inner.trim())
    if (!raw || typeof raw !== 'object' || !('status' in raw)) return null
    const card: DeviceForgeCardData = {
      status: raw.status === 'ready' ? 'ready' : 'failed',
      error: raw.error,
      subject: raw.subject,
      description: raw.description,
      issues: Array.isArray(raw.issues)
        ? raw.issues.map((i: any) => ({
            field: String(i?.field || ''),
            message: String(i?.message || ''),
            level: i?.level === 'warning' ? 'warning' : 'error',
          }))
        : [],
      dryRun: raw.dryRun
        ? {
            passed: raw.dryRun.passed === true,
            payloadError: raw.dryRun.payloadError,
            metrics: Array.isArray(raw.dryRun.metrics)
              ? raw.dryRun.metrics.map((m: any) => ({ key: String(m?.key || ''), label: String(m?.label || ''), field: String(m?.field || ''), ok: m?.ok === true, err: m?.err }))
              : [],
          }
        : undefined,
      usageDoc: raw.usageDoc,
    }
    const d = raw.draft
    if (d && typeof d === 'object' && d.name && d.type) {
      card.draft = {
        name: String(d.name),
        type: ['relay', 'sensor', 'camera', 'stepper'].includes(d.type) ? d.type : 'sensor',
        category: String(d.category || '通用'),
        icon: d.icon ? String(d.icon) : undefined,
        color: d.color ? String(d.color) : undefined,
        subscribe_topic: d.subscribe_topic ? String(d.subscribe_topic) : undefined,
        publish_topic: d.publish_topic ? String(d.publish_topic) : undefined,
        node_id: d.node_id ? String(d.node_id) : undefined,
        relay_num: typeof d.relay_num === 'number' ? d.relay_num : undefined,
        metrics: Array.isArray(d.metrics)
          ? d.metrics.map((m: any) => ({
              key: String(m?.key || ''),
              label: String(m?.label || ''),
              unit: String(m?.unit ?? ''),
              mqtt_field: String(m?.mqtt_field || ''),
              scale: typeof m?.scale === 'number' ? m.scale : undefined,
            }))
          : [],
        extra_config: d.extra_config && typeof d.extra_config === 'object' ? d.extra_config : undefined,
      }
    }
    return card
  } catch {
    return null
  }
}

/** 流式未闭合判断（TAG_REGEX 已以 $ 兜底捕获，这里判断标签是否真正闭合） */
export function isDeviceForgeClosed(part: string): boolean {
  return /<\/\s*DEVICE_FORGE\s*>$/.test(part)
}
