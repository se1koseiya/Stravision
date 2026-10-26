/**
 * 物模型（Thing Model）—— 通用硬件接入的类型基座
 *
 * 设计目标：把「专属硬件的固定字段」（温度/湿度/relay5/node0601…）换成
 * 「任意设备都能描述的三要素」：
 *   - property 属性：设备能上报/被读取的状态量（温度、电量、开关状态…）
 *   - action   动作：平台能下发的操作（开/关、调亮度、云台移动…）
 *   - event    事件：设备主动上报的告警（缺水、离线、越限…）
 *
 * 这一层只做「纯函数」——不碰数据库、不碰网络，便于单测与在 AI 工具里复用。
 */

import type { ProtocolId } from './protocols/types'

// ============ 类型 ============

export type PropertyDataType = 'number' | 'boolean' | 'string' | 'enum'
export type PropertyAccess = 'r' | 'rw' | 'w'

/** 写入方式（动作 / 可写属性共用）：描述"这个值怎么发到设备上" */
export interface TransportSpec {
  /** 覆盖连接默认协议（默认跟随所属连接） */
  protocol?: ProtocolId
  /** MQTT 下行 topic（支持 {{device.external_id}} 等占位符） */
  topic?: string
  /** MQTT / HTTP 报文模板（JSON 模板，占位符用 {{path}}） */
  payload?: string
  /** HTTP 方法 */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** HTTP 地址（支持占位符） */
  url?: string
  /** HTTP 头（值支持占位符） */
  headers?: Record<string, string>
  /** HTTP 请求体模板；不填则用 payload */
  body?: string
  /** Modbus 从站地址 */
  slaveId?: number
  /** Modbus 寄存器 / 线圈地址 */
  register?: number
  /** Modbus 寄存器类型 */
  registerType?: 'holding' | 'coil' | 'input' | 'discrete'
  /** Modbus 编码 */
  dataType?: 'int16' | 'uint16' | 'int32' | 'uint32' | 'float32'
}

export interface ThingProperty {
  key: string
  name: string
  dataType: PropertyDataType
  unit?: string
  access: PropertyAccess
  /** 上报报文中取值的路径（支持 a.b.c 与 a[0].b）；缺省时用 key */
  path?: string
  /** 换算：真实值 = 原始值 / scale - offset（对齐老 metrics.scale 语义） */
  scale?: number
  offset?: number
  /** 保留小数位（仅展示用） */
  decimals?: number
  min?: number
  max?: number
  /** 枚举可选取值 */
  enum?: Array<{ value: string | number; label: string }>
  /** 可写属性的写入方式（access 含 w 时有效） */
  write?: TransportSpec
  /** 展示用的强调色（可选，十六进制） */
  color?: string
}

export interface ThingParam {
  key: string
  name: string
  dataType: PropertyDataType
  required?: boolean
  unit?: string
  min?: number
  max?: number
  default?: string | number | boolean
  enum?: Array<{ value: string | number; label: string }>
}

export interface ThingAction {
  key: string
  name: string
  description?: string
  params: ThingParam[]
  /** 下发通道；缺省时回落到设备的 publish_topic + 默认报文 */
  transport?: TransportSpec
}

export interface ThingEvent {
  key: string
  name: string
  /** 事件等级，用于 UI 与通知 */
  level?: 'info' | 'warning' | 'critical'
  /** 触发条件的自然语言说明（给 AI 与人看） */
  condition?: string
  /** 事件附带的数据点 key 列表 */
  fields?: string[]
}

export interface ThingModel {
  schemaVersion: 1
  /** 设备型号/产品名（第三方设备常叫 productKey） */
  model?: string
  description?: string
  properties: ThingProperty[]
  actions: ThingAction[]
  events: ThingEvent[]
}

export interface ThingIssue {
  field: string
  message: string
  level: 'error' | 'warning'
}

export interface ThingModelValidation {
  ok: boolean
  issues: ThingIssue[]
  model: ThingModel
}

// ============ 常量 ============

const KEY_RE = /^[a-zA-Z_][a-zA-Z0-9_]{0,39}$/
const VALID_TYPES: PropertyDataType[] = ['number', 'boolean', 'string', 'enum']
const VALID_ACCESS: PropertyAccess[] = ['r', 'w', 'rw']

export function isEmptyThingModel(model?: ThingModel | null): boolean {
  return !model || (model.properties.length === 0 && model.actions.length === 0 && model.events.length === 0)
}

// ============ 路径读取 / 模板渲染 ============

/**
 * 按点路径取值：支持 `a.b.c`、`a[0].b`、`a.0.b`。
 * 任何一层缺失返回 undefined（不抛错，上报报文永远不可信）。
 */
export function readPath(source: unknown, path: string | undefined | null): unknown {
  if (!path) return source
  const parts = String(path)
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean)
  let cur: unknown = source
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined
    if (typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

export interface TemplateContext {
  [key: string]: unknown
}

const WHOLE_PLACEHOLDER_RE = /^\s*\{\{\s*([a-zA-Z0-9_.$\[\]]+)\s*\}\}\s*$/
const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_.$\[\]]+)\s*\}\}/g

/**
 * 渲染模板。
 *
 * 规则（刻意保持简单可预期）：
 * - 整个模板就是一个占位符 → 返回**原始类型**（数字仍是数字，布尔仍是布尔）
 * - 模板里混排占位符 → 一律字符串拼接（对象转 JSON）
 * - 占位符取不到值 → 保留空串（不抛错），便于设备侧忽略该字段
 */
export function renderTemplate(template: string, ctx: TemplateContext): unknown {
  if (typeof template !== 'string') return template
  const whole = template.match(WHOLE_PLACEHOLDER_RE)
  if (whole) return readPath(ctx, whole[1])

  return template.replace(PLACEHOLDER_RE, (_m, path: string) => {
    const v = readPath(ctx, path)
    if (v === undefined || v === null) return ''
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  })
}

/**
 * 渲染 JSON 模板并解析。
 * 模板非法 JSON 时抛错（调用方要把它当成配置错误展示给用户，而不是静默发一个坏报文）。
 */
export function renderJsonTemplate(template: string, ctx: TemplateContext): unknown {
  const rendered = renderTemplate(template, ctx)
  if (typeof rendered !== 'string') return rendered
  const text = rendered.trim()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`报文模板渲染后不是合法 JSON：${text.slice(0, 200)}`)
  }
}

// ============ 值归一化 ============

export interface CoercedValue {
  value: number | string | boolean | null
  numeric: number | null
  text: string | null
  bool: boolean | null
  ok: boolean
  reason?: string
}

const TRUE_WORDS = new Set(['1', 'true', 'on', 'yes', 'open', 'online', 'active'])
const FALSE_WORDS = new Set(['0', 'false', 'off', 'no', 'closed', 'offline', 'inactive'])

/** 解包第三方平台常见的 { value } / { val } 包裹；其它情况原样返回 */
function unwrapReportedValue(input: unknown): unknown {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const obj = input as Record<string, unknown>
    if ('value' in obj) return obj.value
    if ('val' in obj) return obj.val
  }
  return input
}

/** 把设备上报的原始值按属性定义转成平台标准值 */
export function coercePropertyValue(prop: ThingProperty, raw: unknown): CoercedValue {
  const empty: CoercedValue = { value: null, numeric: null, text: null, bool: null, ok: false }

  if (raw === undefined || raw === null || raw === '') {
    return { ...empty, reason: '报文缺少该字段' }
  }

  // 第三方平台常见包裹：{ value: 23.5 } / { val: ... }
  const v = unwrapReportedValue(raw)

  switch (prop.dataType) {
    case 'number': {
      const n = typeof v === 'number' ? v : Number(v)
      if (!Number.isFinite(n)) return { ...empty, reason: `无法转为数值：${String(v).slice(0, 40)}` }
      const scale = typeof prop.scale === 'number' && prop.scale !== 0 ? prop.scale : 1
      const offset = typeof prop.offset === 'number' ? prop.offset : 0
      let real = n / scale - offset
      if (prop.decimals !== undefined) {
        const f = Math.pow(10, Math.max(0, Math.min(6, prop.decimals)))
        real = Math.round(real * f) / f
      }
      return {
        value: real,
        numeric: real,
        text: String(real),
        bool: real !== 0,
        ok: true,
      }
    }
    case 'boolean': {
      let b: boolean | null = null
      if (typeof v === 'boolean') b = v
      else if (typeof v === 'number') b = v !== 0
      else if (typeof v === 'string') {
        const s = v.trim().toLowerCase()
        if (TRUE_WORDS.has(s)) b = true
        else if (FALSE_WORDS.has(s)) b = false
      }
      if (b === null) return { ...empty, reason: `无法转为布尔值：${String(v).slice(0, 40)}` }
      return { value: b, numeric: b ? 1 : 0, text: b ? 'true' : 'false', bool: b, ok: true }
    }
    case 'enum': {
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
      const hit = (prop.enum || []).find((o) => String(o.value) === s)
      return { value: s, numeric: Number.isFinite(Number(s)) ? Number(s) : null, text: hit?.label ?? s, bool: null, ok: true }
    }
    case 'string':
    default: {
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
      return { value: s, numeric: Number.isFinite(Number(s)) ? Number(s) : null, text: s, bool: null, ok: true }
    }
  }
}

/** 从一条上报报文里抽取全部属性值 */
export function extractPropertyValues(
  model: ThingModel,
  payload: unknown
): { values: Record<string, CoercedValue>; missing: string[] } {
  const values: Record<string, CoercedValue> = {}
  const missing: string[] = []
  for (const prop of model.properties) {
    if (prop.access === 'w') continue // 只写属性不接受上报
    const raw = readPath(payload, prop.path || prop.key)
    const coerced = coercePropertyValue(prop, raw)
    values[prop.key] = coerced
    if (!coerced.ok) missing.push(prop.key)
  }
  return { values, missing }
}

/** 校验动作入参（下发前唯一入口，避免各协议各写一套） */
export function validateActionParams(
  action: ThingAction,
  params: Record<string, unknown> | undefined
): { ok: boolean; errors: string[]; normalized: Record<string, unknown> } {
  const errors: string[] = []
  const normalized: Record<string, unknown> = {}
  const input = params || {}

  for (const p of action.params) {
    const raw = input[p.key] ?? p.default
    if (raw === undefined || raw === null || raw === '') {
      if (p.required) errors.push(`缺少必填参数：${p.name || p.key}`)
      continue
    }
    if (p.dataType === 'number') {
      const n = Number(raw)
      if (!Number.isFinite(n)) {
        errors.push(`参数 ${p.name || p.key} 必须是数值`)
        continue
      }
      if (p.min !== undefined && n < p.min) errors.push(`参数 ${p.name || p.key} 不能小于 ${p.min}`)
      if (p.max !== undefined && n > p.max) errors.push(`参数 ${p.name || p.key} 不能大于 ${p.max}`)
      normalized[p.key] = n
    } else if (p.dataType === 'boolean') {
      const c = coercePropertyValue(
        { key: p.key, name: p.name, dataType: 'boolean', access: 'w' },
        raw
      )
      if (!c.ok) errors.push(`参数 ${p.name || p.key} 必须是布尔值`)
      else normalized[p.key] = c.value
    } else {
      const s = String(raw)
      if (p.dataType === 'enum' && p.enum && p.enum.length > 0) {
        const hit = p.enum.find((o) => String(o.value) === s)
        if (!hit) errors.push(`参数 ${p.name || p.key} 只能是：${p.enum.map((o) => o.value).join(' / ')}`)
      }
      normalized[p.key] = s
    }
  }

  return { ok: errors.length === 0, errors, normalized }
}

// ============ 规范化 / 校验 ============

function asString(v: unknown, fallback = ''): string {
  if (v === undefined || v === null) return fallback
  return String(v)
}

function asNumberOrUndefined(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function normalizeEnum(v: unknown): Array<{ value: string | number; label: string }> | undefined {
  if (!Array.isArray(v)) return undefined
  const out = v
    .map((item) => {
      if (item === null || item === undefined) return null
      if (typeof item === 'object') {
        const o = item as Record<string, unknown>
        const value = o.value ?? o.key ?? o.id
        if (value === undefined) return null
        return { value: typeof value === 'number' ? value : String(value), label: asString(o.label ?? o.name ?? value) }
      }
      return { value: typeof item === 'number' ? item : String(item), label: String(item) }
    })
    .filter(Boolean) as Array<{ value: string | number; label: string }>
  return out.length > 0 ? out : undefined
}

function normalizeTransport(v: unknown): TransportSpec | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined
  const o = v as Record<string, unknown>
  const spec: TransportSpec = {}
  if (o.protocol) spec.protocol = asString(o.protocol) as ProtocolId
  if (o.topic) spec.topic = asString(o.topic)
  if (o.payload !== undefined && o.payload !== null) {
    spec.payload = typeof o.payload === 'string' ? o.payload : JSON.stringify(o.payload)
  }
  if (o.method) spec.method = asString(o.method).toUpperCase() as TransportSpec['method']
  if (o.url) spec.url = asString(o.url)
  if (o.body !== undefined && o.body !== null) {
    spec.body = typeof o.body === 'string' ? o.body : JSON.stringify(o.body)
  }
  if (o.headers && typeof o.headers === 'object' && !Array.isArray(o.headers)) {
    const headers: Record<string, string> = {}
    for (const [k, val] of Object.entries(o.headers as Record<string, unknown>)) headers[k] = asString(val)
    if (Object.keys(headers).length > 0) spec.headers = headers
  }
  const slaveId = asNumberOrUndefined(o.slaveId)
  if (slaveId !== undefined) spec.slaveId = slaveId
  const register = asNumberOrUndefined(o.register)
  if (register !== undefined) spec.register = register
  if (o.registerType) spec.registerType = asString(o.registerType) as TransportSpec['registerType']
  if (o.dataType) spec.dataType = asString(o.dataType) as TransportSpec['dataType']
  return Object.keys(spec).length > 0 ? spec : undefined
}

function normalizeProperty(input: unknown): ThingProperty | null {
  if (!input || typeof input !== 'object') return null
  const o = input as Record<string, unknown>
  const key = asString(o.key ?? o.id).trim()
  if (!key) return null
  const dataTypeRaw = asString(o.dataType ?? o.type ?? 'number').toLowerCase()
  const dataType: PropertyDataType = (VALID_TYPES as string[]).includes(dataTypeRaw)
    ? (dataTypeRaw as PropertyDataType)
    : 'number'
  const accessRaw = asString(o.access ?? (o.write ? 'rw' : 'r')).toLowerCase()
  const access: PropertyAccess = (VALID_ACCESS as string[]).includes(accessRaw)
    ? (accessRaw as PropertyAccess)
    : 'r'
  return {
    key,
    name: asString(o.name ?? o.label ?? key).slice(0, 40) || key,
    dataType,
    unit: o.unit === undefined ? undefined : asString(o.unit),
    access,
    path: o.path === undefined ? undefined : asString(o.path),
    scale: asNumberOrUndefined(o.scale),
    offset: asNumberOrUndefined(o.offset),
    decimals: asNumberOrUndefined(o.decimals),
    min: asNumberOrUndefined(o.min),
    max: asNumberOrUndefined(o.max),
    enum: normalizeEnum(o.enum ?? o.options),
    write: normalizeTransport(o.write),
    color: o.color === undefined ? undefined : asString(o.color),
  }
}

function normalizeAction(input: unknown): ThingAction | null {
  if (!input || typeof input !== 'object') return null
  const o = input as Record<string, unknown>
  const key = asString(o.key ?? o.id ?? o.name).trim()
  if (!key) return null
  const paramsRaw = Array.isArray(o.params) ? o.params : []
  const params: ThingParam[] = paramsRaw
    .map((p) => {
      if (!p || typeof p !== 'object') return null
      const po = p as Record<string, unknown>
      const pk = asString(po.key ?? po.id ?? po.name).trim()
      if (!pk) return null
      const dtRaw = asString(po.dataType ?? po.type ?? 'string').toLowerCase()
      const dt: PropertyDataType = (VALID_TYPES as string[]).includes(dtRaw) ? (dtRaw as PropertyDataType) : 'string'
      return {
        key: pk,
        name: asString(po.name ?? po.label ?? pk),
        dataType: dt,
        required: po.required === true,
        unit: po.unit === undefined ? undefined : asString(po.unit),
        min: asNumberOrUndefined(po.min),
        max: asNumberOrUndefined(po.max),
        default: po.default as ThingParam['default'],
        enum: normalizeEnum(po.enum ?? po.options),
      } satisfies ThingParam
    })
    .filter(Boolean) as ThingParam[]

  return {
    key,
    name: asString(o.name ?? key).slice(0, 40) || key,
    description: o.description === undefined ? undefined : asString(o.description),
    params,
    transport: normalizeTransport(o.transport),
  }
}

function normalizeEvent(input: unknown): ThingEvent | null {
  if (!input || typeof input !== 'object') return null
  const o = input as Record<string, unknown>
  const key = asString(o.key ?? o.id ?? o.name).trim()
  if (!key) return null
  const levelRaw = asString(o.level ?? 'info').toLowerCase()
  const level: ThingEvent['level'] = levelRaw === 'critical' || levelRaw === 'warning' ? levelRaw : 'info'
  return {
    key,
    name: asString(o.name ?? key),
    level,
    condition: o.condition === undefined ? undefined : asString(o.condition),
    fields: Array.isArray(o.fields) ? o.fields.map((f) => asString(f)).filter(Boolean) : undefined,
  }
}

/**
 * 把任意来源（用户填的 JSON、AI 生成的草稿、旧 config.metrics）规范成 ThingModel。
 * 永不抛错：坏字段直接丢弃，由 validateThingModel 报告。
 */
export function normalizeThingModel(input: unknown): ThingModel {
  if (!input || typeof input !== 'object') {
    return { schemaVersion: 1, properties: [], actions: [], events: [] }
  }
  const o = input as Record<string, unknown>
  // 兼容两种写法：{ properties: [...] } 或直接 { temperature: {...} } 的简化映射
  let propsRaw: unknown[] = []
  if (Array.isArray(o.properties)) propsRaw = o.properties
  else if (o.properties && typeof o.properties === 'object') {
    propsRaw = Object.entries(o.properties as Record<string, unknown>).map(([k, v]) =>
      v && typeof v === 'object' ? { key: k, ...(v as Record<string, unknown>) } : { key: k, name: String(v) }
    )
  }

  const seen = new Set<string>()
  const properties = propsRaw
    .map((p) => normalizeProperty(p))
    .filter((p): p is ThingProperty => !!p)
    .filter((p) => {
      if (seen.has(p.key)) return false
      seen.add(p.key)
      return true
    })

  const actions = (Array.isArray(o.actions) ? o.actions : [])
    .map(normalizeAction)
    .filter((a): a is ThingAction => !!a)
  const seenA = new Set<string>()
  const uniqueActions = actions.filter((a) => {
    if (seenA.has(a.key)) return false
    seenA.add(a.key)
    return true
  })

  const events = (Array.isArray(o.events) ? o.events : [])
    .map(normalizeEvent)
    .filter((e): e is ThingEvent => !!e)

  return {
    schemaVersion: 1,
    model: o.model === undefined ? undefined : asString(o.model),
    description: o.description === undefined ? undefined : asString(o.description),
    properties,
    actions: uniqueActions,
    events,
  }
}

/** 把旧 devices.config.metrics 转成物模型属性（老设备升级 / 展示用） */
export function thingModelFromLegacyMetrics(metrics: unknown): ThingModel {
  if (!Array.isArray(metrics)) return { schemaVersion: 1, properties: [], actions: [], events: [] }
  const properties: ThingProperty[] = []
  for (const m of metrics) {
    if (!m || typeof m !== 'object') continue
    const o = m as Record<string, unknown>
    const key = asString(o.key ?? o.mqtt_field).trim()
    if (!key) continue
    properties.push({
      key,
      name: asString(o.label ?? key),
      dataType: 'number',
      unit: o.unit === undefined ? undefined : asString(o.unit),
      access: 'r',
      path: asString(o.mqtt_field ?? key),
      scale: asNumberOrUndefined(o.scale),
    })
  }
  return { schemaVersion: 1, properties, actions: [], events: [] }
}

/**
 * 校验物模型。
 * error = 必然跑不通（缺 key / 非法 key / 可写属性没有下发通道）；
 * warning = 能跑但容易出问题（没有单位、数值没有量程、动作没有参数说明）。
 */
export function validateThingModel(model: ThingModel, opts?: { requireWritableChannel?: boolean }): ThingModelValidation {
  const issues: ThingIssue[] = []
  const requireChannel = opts?.requireWritableChannel !== false

  if (model.properties.length === 0 && model.actions.length === 0) {
    issues.push({ field: 'properties', message: '设备至少要定义 1 个属性（可上报）或 1 个动作（可下发）', level: 'error' })
  }

  for (const p of model.properties) {
    if (!KEY_RE.test(p.key)) {
      issues.push({ field: `properties.${p.key}`, message: `属性标识「${p.key}」非法：需字母/下划线开头，仅含字母数字下划线，≤40 字符`, level: 'error' })
    }
    if (!p.name) {
      issues.push({ field: `properties.${p.key}`, message: `属性「${p.key}」缺少中文名`, level: 'warning' })
    }
    if (p.dataType === 'number' && p.scale === 0) {
      issues.push({ field: `properties.${p.key}`, message: `属性「${p.name}」的换算系数不能为 0`, level: 'error' })
    }
    if (p.min !== undefined && p.max !== undefined && p.min > p.max) {
      issues.push({ field: `properties.${p.key}`, message: `属性「${p.name}」量程反了（min > max）`, level: 'error' })
    }
    if (p.access === 'w' && requireChannel && !p.write) {
      issues.push({ field: `properties.${p.key}`, message: `属性「${p.name}」声明为可写，但没有配置下发通道`, level: 'warning' })
    }
    if (p.dataType === 'enum' && (!p.enum || p.enum.length === 0)) {
      issues.push({ field: `properties.${p.key}`, message: `属性「${p.name}」是枚举类型，但没有定义可选值`, level: 'error' })
    }
  }

  for (const a of model.actions) {
    if (!KEY_RE.test(a.key)) {
      issues.push({ field: `actions.${a.key}`, message: `动作标识「${a.key}」非法：需字母/下划线开头`, level: 'error' })
    }
    for (const param of a.params) {
      if (!KEY_RE.test(param.key)) {
        issues.push({ field: `actions.${a.key}.${param.key}`, message: `参数标识「${param.key}」非法`, level: 'error' })
      }
      if (param.dataType === 'number' && param.min !== undefined && param.max !== undefined && param.min > param.max) {
        issues.push({ field: `actions.${a.key}.${param.key}`, message: `参数「${param.name}」量程反了（min > max）`, level: 'error' })
      }
    }
  }

  for (const e of model.events) {
    if (!KEY_RE.test(e.key)) {
      issues.push({ field: `events.${e.key}`, message: `事件标识「${e.key}」非法`, level: 'error' })
    }
  }

  return { ok: !issues.some((i) => i.level === 'error'), issues, model }
}

/** 生成一个最小可用物模型（UI 的「从零开始」入口） */
export function createEmptyThingModel(name = '新设备'): ThingModel {
  return {
    schemaVersion: 1,
    model: name,
    properties: [
      { key: 'temperature', name: '温度', dataType: 'number', unit: '°C', access: 'r', path: 'temperature', decimals: 1 },
    ],
    actions: [],
    events: [],
  }
}

/**
 * 给 AI / 文档用的物模型摘要（紧凑文本，避免把整坨 JSON 塞进上下文）
 */
export function summarizeThingModel(model: ThingModel): string {
  const lines: string[] = []
  if (model.properties.length > 0) {
    lines.push('属性：')
    for (const p of model.properties) {
      const bounds = [p.min !== undefined ? `≥${p.min}` : '', p.max !== undefined ? `≤${p.max}` : ''].filter(Boolean).join(' ')
      lines.push(
        `- ${p.key}（${p.name}${p.unit ? `，${p.unit}` : ''}，${p.dataType}，${p.access === 'rw' ? '可读写' : p.access === 'w' ? '只写' : '只读'}${bounds ? `，${bounds}` : ''}${p.path ? `，上报字段 ${p.path}` : ''}）`
      )
    }
  }
  if (model.actions.length > 0) {
    lines.push('动作：')
    for (const a of model.actions) {
      const params = a.params.map((p) => `${p.key}${p.required ? '*' : ''}:${p.dataType}${p.unit ? `(${p.unit})` : ''}`).join(', ')
      lines.push(`- ${a.key}（${a.name}${params ? `；参数 ${params}` : '；无参数'}）`)
    }
  }
  if (model.events.length > 0) {
    lines.push('事件：')
    for (const e of model.events) lines.push(`- ${e.key}（${e.name}，${e.level || 'info'}）`)
  }
  return lines.join('\n')
}
