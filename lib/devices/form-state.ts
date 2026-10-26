/**
 * 表单状态注册表（Copilot ↔ 设备表单的唯一契约）
 *
 * 【为什么需要它】设备接入/设备新增的门槛全在「填表」上，但表单状态历来是组件的
 * 内部 state（useState / Form.useForm），Copilot 一个字都看不到。于是模型只能凭
 * 对话记忆猜「用户填到哪了」，猜错的表现就是**乱填**：
 *   ① 不知道用户正打开哪张表、在第几步；
 *   ② 不知道哪些字段已经填过，于是把用户改过的值又覆盖回去；
 *   ③ 唯一的填写工具 `device_access_apply_draft` 是**整包覆盖**语义
 *      （form.setFieldsValue 一次性铺满），用户「填一半突然被重置」就是它造成的。
 *
 * 于是定这份契约：每个设备表单把「读快照 / 打补丁」两件事注册进来，
 * Copilot 侧只跟注册表打交道，不认识任何具体组件：
 *   · `device_form_read`  —— 看清楚用户此刻在填哪张表、第几步、填了什么、还缺什么；
 *   · `device_form_patch` —— **增量**写字段，没传的字段一律不动（不再整包覆盖）。
 *
 * 【为什么是注册表而不是 prop/ref 透传】
 *   表单散在三层（弹窗 → 向导 → 连接表单），逐层传 ref 会让每个中间组件都多一个
 *   与本业务无关的 prop；注册表让「谁在活跃」由表单自己声明，新增一张表只需
 *   在它内部注册一次，Copilot 侧零改动。
 *
 * 🚨 边界（与 access-draft.ts 一致）：这里**只写前端表单**，不落库。
 *    真正的创建/修改永远由用户点「完成接入 / 保存」触发，AI 无法绕过。
 * 🚨 凭证类字段（secret）只回传「是否已填」，绝不回传值。
 */

/** 可被 Copilot 感知与填写的设备表单 */
export type FormKind =
  /** 第三方设备接入向导（三步） */
  | 'access-wizard'
  /** 接入连接表单 */
  | 'access-connection'
  /** 专属硬件设备表单（设备管理 → 新增/编辑设备） */
  | 'device-registry'

export const FORM_KIND_LABEL: Record<FormKind, string> = {
  'access-wizard': '第三方设备接入向导',
  'access-connection': '接入连接表单',
  'device-registry': '专属硬件设备表单',
}

export interface FormFieldSnapshot {
  /** 与 patch 的键名一一对应（模型照抄即可） */
  key: string
  label: string
  /** 展示值；secret 字段恒为「已填写」/ 空 */
  value: string
  required: boolean
  filled: boolean
  /** 凭证类：模型不得索要、不得填写 */
  secret?: boolean
  /** 这一格该填什么（给模型的即时提示） */
  hint?: string
}

/** 复杂区块（属性表 / 动作 JSON 这类不是单值输入框的东西） */
export interface FormBlockSnapshot {
  key: string
  label: string
  detail: string
}

export interface FormSnapshot {
  kind: FormKind
  title: string
  /** 分步表单才有；单页表单为 null */
  step: number | null
  steps: string[]
  stepTitle: string
  fields: FormFieldSnapshot[]
  blocks: FormBlockSnapshot[]
  /** 必填但还空着 / 还没配的项 */
  missing: string[]
  /** 当前校验不通过的原因（模型据此修，不要猜） */
  issues: string[]
  /** 一句话现状，直接给模型读 */
  summary: string
  /** 接下来该做什么 */
  hint: string
}

export interface PatchOutcome {
  ok: boolean
  /** 真正写进去的键 */
  applied: string[]
  /** 传了但不认识 / 该表单不支持的键 */
  ignored: string[]
  /** 写了但有问题（值不合法等） */
  issues: string[]
  summary: string
}

export interface FormHost {
  kind: FormKind
  /** 这张表现在是否正被用户打开着（决定它是不是「当前表单」） */
  isActive: () => boolean
  read: () => FormSnapshot
  /** 🚨 必须是**增量**语义：只写传进来的键，其余保持原样 */
  patch: (fields: Record<string, unknown>) => PatchOutcome
  /** 分步表单可跳转；单页表单不实现 */
  gotoStep?: (step: number) => boolean
}

/**
 * 同时有多张表开着时谁算「当前表单」。
 * 向导 > 连接表单 > 设备表单：越靠近「用户此刻正在敲的那一格」优先级越高
 * （连接表单是向导的前置步骤，两者互斥；设备表单是最外层容器，永远兜底）。
 */
const PRIORITY: Record<FormKind, number> = {
  'access-wizard': 30,
  'access-connection': 20,
  'device-registry': 10,
}

const hosts = new Map<FormKind, FormHost>()

/**
 * 注册一张表单。**同一 kind 后注册者覆盖前者** —— 页面里可能同时存在
 * 多个设备弹窗实例（如 /admin 与 /device-control 各挂一个），以最新挂载的为准。
 *
 * @returns 注销函数（组件卸载时调用；只有仍是自己时才摘除）
 */
export function registerFormHost(host: FormHost): () => void {
  hosts.set(host.kind, host)
  return () => {
    if (hosts.get(host.kind) === host) hosts.delete(host.kind)
  }
}

/** 当前活跃的表单宿主，优先级从高到低 */
function activeHosts(): FormHost[] {
  const out: FormHost[] = []
  for (const h of hosts.values()) {
    try {
      if (h.isActive()) out.push(h)
    } catch {
      /* 单个表单读状态炸了不能连累其它表单 */
    }
  }
  return out.sort((a, b) => PRIORITY[b.kind] - PRIORITY[a.kind])
}

/** 按 kind 找宿主（不传 = 取优先级最高的那张活跃表单） */
function pickHost(kind?: FormKind | null): FormHost | null {
  const list = activeHosts()
  if (list.length === 0) return null
  if (!kind) return list[0]
  return list.find((h) => h.kind === kind) || null
}

/**
 * 读当前表单快照。
 *
 * @param kind 指定表单；不传则取「用户此刻正在填的那张」
 * @returns 没有正在填写的表单时返回 null —— 调用方要如实告诉模型「用户没在填表」，
 *          不要拿旧记忆编一份假快照。
 */
export function readActiveForm(kind?: FormKind | null): FormSnapshot | null {
  const host = pickHost(kind)
  if (!host) return null
  try {
    return host.read()
  } catch {
    return null
  }
}

/** 所有活跃表单（用于「用户是不是同时在填两张表」的判断与文案） */
export function listActiveForms(): FormSnapshot[] {
  return activeHosts()
    .map((h) => {
      try {
        return h.read()
      } catch {
        return null
      }
    })
    .filter((s): s is FormSnapshot => !!s)
}

/**
 * 往当前表单打**增量补丁**。
 *
 * @param kind 指定表单；不传则打到「用户此刻正在填的那张」
 */
export function patchActiveForm(
  kind: FormKind | null | undefined,
  fields: Record<string, unknown>,
): PatchOutcome {
  const keys = Object.keys(fields || {})
  const host = pickHost(kind)
  if (!host) {
    return {
      ok: false,
      applied: [],
      ignored: keys,
      issues: [
        '用户当前没有打开任何设备表单。若要帮他填，先引导他打开（接入第三方设备走「设备管理 → 接入向导」，专属硬件走「设备管理 → 新增设备」），再调用本工具。',
      ],
      summary: '没有正在填写的表单，未做任何修改',
    }
  }
  try {
    return host.patch(fields || {})
  } catch (e) {
    return {
      ok: false,
      applied: [],
      ignored: keys,
      issues: [e instanceof Error ? e.message : '写入表单时出错'],
      summary: '写入失败，表单未改动',
    }
  }
}

/** 跳到指定步骤（分步表单才支持） */
export function gotoFormStep(kind: FormKind | null | undefined, step: number): boolean {
  const host = pickHost(kind)
  if (!host?.gotoStep) return false
  try {
    return host.gotoStep(step)
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ */
/* 供 systemPrompt 注入的一行现状                                       */
/* ------------------------------------------------------------------ */

const MAX_FIELDS_IN_LINE = 8

/**
 * 把当前表单压缩成一两句自然语言，塞进 Copilot 的页面上下文。
 *
 * 🚨 为什么要注入而不只靠工具：模型**不知道有表单开着**时根本不会去调 read。
 *    这行文字的作用是把「用户正在填表」这件事摆到它眼前，工具负责拿细节。
 */
export function describeActiveForm(): string | null {
  const snap = readActiveForm()
  if (!snap) return null

  const lines: string[] = []
  const where =
    snap.step !== null && snap.steps.length > 0
      ? `${FORM_KIND_LABEL[snap.kind]} · 第 ${snap.step + 1}/${snap.steps.length} 步「${snap.stepTitle}」`
      : FORM_KIND_LABEL[snap.kind]
  lines.push(`【用户正在填的表单】${where}`)

  const filled = snap.fields.filter((f) => f.filled && !f.secret)
  if (filled.length > 0) {
    lines.push(
      '已填：' +
        filled
          .slice(0, MAX_FIELDS_IN_LINE)
          .map((f) => `${f.label}=${f.value}`)
          .join('、'),
    )
  } else {
    lines.push('已填：还没有填任何字段')
  }

  const secretFilled = snap.fields.filter((f) => f.secret && f.filled)
  if (secretFilled.length > 0) {
    lines.push(`凭证已由用户填写：${secretFilled.map((f) => f.label).join('、')}（不要向他索要明文）`)
  }

  if (snap.missing.length > 0) lines.push(`还缺：${snap.missing.join('、')}`)
  if (snap.issues.length > 0) lines.push(`校验未通过：${snap.issues.slice(0, 3).join('；')}`)
  return lines.join('\n')
}

/* ------------------------------------------------------------------ */
/* 探针钩子                                                            */
/* ------------------------------------------------------------------ */

/**
 * 让 `_probe_*.mjs` 能模拟「Copilot 读/写表单」这两步，而不用真的跑一轮对话。
 * 只暴露读写表单的能力，不含任何落库入口。
 */
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__berryFormState = {
    read: readActiveForm,
    list: listActiveForms,
    patch: patchActiveForm,
    describe: describeActiveForm,
  }
}
