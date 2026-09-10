/**
 * 设备接入工坊（Device Integration）核心服务
 *
 * 链路：用户提供设备接入文档（MQTT 协议/报文样例/字段定义）→
 *   1. analyze    阅读文档：识别设备类型、上报数据点、控制指令、MQTT topic 线索、报文样例与缺失项
 *   2. generate   生成设备接入配置草稿（对齐 devices 表：name/type/topic/node_id/config.metrics 等）
 *   3. validate   确定性规则校验（必填项/字段格式/重复 key），输出 error/warning 两类 issue
 *   4. dry-run    用 LLM 给的模拟报文走一遍字段映射核对，找出「metrics.mqtt_field 在 payload 里取不到值」
 *                 这类仅靠看文档看不出来的坑
 *   5. revise     校验/干跑失败时把失败原因回灌生成器自动修订，最多 maxRevisionRounds 轮
 *   6. deliver    交付草稿（⚠️ 不落库）：生成结果是「可编辑表单」，用户在前端确认/修改后才真正写入 devices 表
 *
 * 与 skill-forge 的关系：skill-forge 把文档锻造成「技能」（store_skills 表，给 AI 当知识用）；
 * 本服务把文档锻造成「设备接入配置」（devices 表的前置草稿，给 IoT 链路用）。两者可衔接：
 * 设备装入平台后，用户可再一键把 usage_doc 交给 create_skill_from_doc 发布成技能，让 AI 学会该设备。
 *
 * LLM 调用遵循 admin 默认模型（provider-resolver），与 skill-forge 同一模式。
 */

import { readProvidersConfig, resolveDefaultModelId, resolveProvider } from './provider-resolver'

// ============ 类型定义 ============

export type DeviceForgeStage = 'analyze' | 'generate' | 'validate' | 'dry-run' | 'revise' | 'deliver'

export interface DeviceForgeProgress {
  stage: DeviceForgeStage
  detail: string
  round?: number
}

/** devices.type 枚举（与 device-registry-service 对齐，避免引 DB 代码） */
export type DeviceTypeEnum = 'relay' | 'sensor' | 'camera' | 'stepper'

/** 与 device-registry-service.DeviceMetric 对齐：数据点 → MQTT 报文字段映射 */
export interface DraftMetric {
  key: string          // 指标标识（英文小写，如 temperature）
  label: string        // 中文名
  unit: string         // 单位
  mqtt_field: string   // MQTT 报文中取值字段（支持 a.b.c 路径）
  scale?: number       // 缩放因子
}

/** 设备接入配置草稿（= 前端可编辑表单的模型） */
export interface DeviceDraft {
  name: string
  type: DeviceTypeEnum
  category: string
  icon?: string
  color?: string
  subscribe_topic?: string   // 传感器上行 topic
  publish_topic?: string     // 继电器/位控下行控制 topic
  node_id?: string           // 设备/节点标识
  relay_num?: number         // relay 通道号
  metrics?: DraftMetric[]    // sensor 数据点
  extra_config?: Record<string, unknown>  // 其他配置（透传 config JSONB）
  description: string        // 给用户看的生成说明
  usage_doc: string          // 面向「技能工坊」的接入能力说明文档（用户点「发布技能」时交给 create_skill_from_doc）
  test_payload?: string      // 模拟上行报文（JSON 字符串，用于 dry-run 与展示）
}

/** 文档分析结果（供卡片展示识别情况） */
export interface DeviceDocumentAnalysis {
  subject_name: string
  device_type_hint: string          // 猜测类型
  summary: string
  capabilities: Array<{ name: string; description: string }>
  topic_hints: string[]             // 文档中出现的 topic 线索
  payload_samples: string[]         // 文档中的报文样例
  rules: string[]
  missing_info: string[]
}

export interface DraftIssue {
  field: string
  message: string
  level: 'error' | 'warning'
}

export interface DraftValidation {
  passed: boolean
  issues: DraftIssue[]
}

/** dry-run 结果：每个 metric 能否在模拟报文中取到值 */
export interface DryRunMetricResult {
  key: string
  label: string
  mqtt_field: string
  found: boolean
  sampleValue?: string
  error?: string
}

export interface DryRunResult {
  payloadValid: boolean          // 模拟报文能否 JSON.parse
  payloadError?: string
  metrics: DryRunMetricResult[]
  controlChecked: boolean        // relay/stepper 是否检查了下行 topic
  passed: boolean
}

export interface DeviceIntegrationResult {
  success: boolean
  analysis: DeviceDocumentAnalysis | null
  draft: DeviceDraft | null
  validation: DraftValidation | null
  dryRun: DryRunResult | null
  rounds: number
  /** 关键信息不足：需要用户补充后重试（不生成草稿） */
  needsInput?: boolean
  questions?: string[]
  error?: string
}

export interface DeviceIntegrationOptions {
  document: string
  documentName?: string
  /** 自动修订最大轮数（默认 1，即最多生成 2 次） */
  maxRevisionRounds?: number
  /** 阶段进度回调（chat 链路转 SSE 思维链） */
  onProgress?: (progress: DeviceForgeProgress) => void
}

// ============ 常量 ============

const MAX_DOC_CHARS = 60_000
const LLM_TIMEOUT_MS = 180_000
const PIPELINE_BUDGET_MS = 240_000

const VALID_TYPES: DeviceTypeEnum[] = ['relay', 'sensor', 'camera', 'stepper']
const TYPE_ICON_HINTS: Record<string, { icon: string; color: string }> = {
  sensor: { icon: 'Thermometer', color: '#1677ff' },
  relay: { icon: 'ToggleRight', color: '#52c41a' },
  camera: { icon: 'Video', color: '#722ed1' },
  stepper: { icon: 'Compass', color: '#fa8c16' },
}

// ============ LLM 调用 ============

interface LLMCallOptions {
  system: string
  user: string
  temperature?: number
  jsonMode?: boolean
  maxTokens?: number
}

async function resolveLLM(): Promise<{ url: string; apiKey: string; model: string } | null> {
  const config = await readProvidersConfig()
  const modelId = resolveDefaultModelId(config)
  if (!modelId) {
    const key = process.env.SYSTEM_OPENAI_API_KEY || process.env.SYSTEM_GLM_API_KEY || ''
    const base = process.env.SYSTEM_OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
    if (!key) return null
    return {
      url: /\/chat\/completions$/.test(base) ? base : `${base.replace(/\/+$/, '')}/chat/completions`,
      apiKey: key,
      model: process.env.SYSTEM_OPENAI_MODEL || 'qwen-plus',
    }
  }
  const provider = await resolveProvider(modelId)
  if (!provider) return null
  return { url: provider.baseUrl, apiKey: provider.apiKey, model: provider.model }
}

async function callLLM(opts: LLMCallOptions): Promise<string> {
  const llm = await resolveLLM()
  if (!llm) throw new Error('AI 服务未配置：请先在管理后台「AI 提供商」中配置模型')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)
  try {
    const body: Record<string, any> = {
      model: llm.model,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
      temperature: opts.temperature ?? 0.3,
    }
    if (opts.jsonMode !== false) body.response_format = { type: 'json_object' }
    if (opts.maxTokens) body.max_tokens = opts.maxTokens
    const res = await fetch(llm.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${llm.apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`AI API 错误 (${res.status}): ${text.slice(0, 300)}`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
  } finally {
    clearTimeout(timer)
  }
}

/** 从 LLM 输出中稳健提取 JSON */
export function extractJson<T>(raw: string): T | null {
  if (!raw) return null
  let text = raw.trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) text = fence[1].trim()
  try { return JSON.parse(text) as T } catch { /* 继续 */ }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) as T } catch { /* 继续 */ }
  }
  return null
}

/** 从任意值取安全字符串数组 */
function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String).filter(Boolean) : []
}

function asNum(v: unknown, fallback?: number): number | undefined {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

// ============ Stage 1: 分析文档 ============

const ANALYZE_SYSTEM = `你是物联网设备接入专家，负责从设备接入文档（MQTT 通信协议/报文样例/字段定义表）中提取"平台接入设备"所需的全部信息。

这份文档将用于把设备接入智慧农业平台的 MQTT 通道：sensor 设备按 subscribe_topic 订阅上行数据、按 metrics 定义把报文字段映射为数据指标；relay/stepper 设备通过 publish_topic 下发控制指令。

输出严格 JSON：
{
  "subject_name": "设备/产品名",
  "device_type_hint": "根据功能猜测设备类型，只从 relay/sensor/camera/stepper 中选（不确定就填最可能的）",
  "summary": "一段话概括（60-120字）",
  "capabilities": [{ "name": "功能名", "description": "功能说明" }],
  "topic_hints": ["文档中出现的所有 MQTT topic 字样（发布/订阅/上行/下行主题）"],
  "payload_samples": ["文档中的报文/JSON 样例原文，逐条放入"],
  "rules": ["关键规则一句话一条：报文结构、字段单位、缩放换算、指令格式、topic 规则"],
  "missing_info": ["接入必需的但文档缺失/含糊的信息，如订阅 topic 未给出、字段缺单位、无报文样例；没有则空数组"]
}
要求：
- 尽力还原数据点字段名、单位（温度/湿度/CO2…），宁可列出原文字段名也不自己发明
- 只输出 JSON，不要任何解释文字`

async function analyzeDocument(document: string): Promise<DeviceDocumentAnalysis> {
  const raw = await callLLM({
    system: ANALYZE_SYSTEM,
    user: `请分析以下设备接入文档：\n\n${document}`,
    temperature: 0.1,
    maxTokens: 4000,
  })
  const parsed = extractJson<Partial<DeviceDocumentAnalysis>>(raw)
  if (!parsed || !parsed.subject_name) {
    throw new Error('文档分析失败：AI 未返回有效的结构化结果')
  }
  return {
    subject_name: String(parsed.subject_name || '未命名设备'),
    device_type_hint: String(parsed.device_type_hint || ''),
    summary: String(parsed.summary || ''),
    capabilities: Array.isArray(parsed.capabilities)
      ? parsed.capabilities.map((c: any) => ({ name: String(c?.name || ''), description: String(c?.description || '') })).filter(c => c.name)
      : [],
    topic_hints: asStringArray(parsed.topic_hints),
    payload_samples: asStringArray(parsed.payload_samples),
    rules: asStringArray(parsed.rules),
    missing_info: asStringArray(parsed.missing_info),
  }
}

/** 信息充分性：没有报文样例、又没有可识别的能力/数据点时视为不足 */
export function isDeviceAnalysisInsufficient(analysis: DeviceDocumentAnalysis): boolean {
  return analysis.capabilities.length === 0 && analysis.payload_samples.length === 0 && analysis.topic_hints.length === 0
}

/** 构造向用户追问的清单 */
export function buildDeviceFollowUpQuestions(analysis: DeviceDocumentAnalysis): string[] {
  const q: string[] = []
  if (analysis.topic_hints.length === 0) q.push('请提供 MQTT 收发 topic（设备上行数据发到哪个主题？控制命令订阅哪个主题？）')
  if (analysis.payload_samples.length === 0) q.push('请提供至少一份真实上报报文/JSON 样例，以及每个字段的名称与单位')
  if (analysis.missing_info.length > 0) q.push(...analysis.missing_info.slice(0, 5))
  return q.slice(0, 6)
}

// ============ Stage 2: 生成配置草稿 ============

const GENERATE_SYSTEM = `你是智能农业平台的"设备接入工程师"。依据设备接入文档分析结果与原文，把该设备锻造成一份可直接写入平台 devices 注册表的接入配置草稿。

平台 devices 表语义：
- sensor（传感器，平台订阅它上行数据）：subscribe_topic 填设备上报 topic；config.metrics 定义数据点映射
- relay（开关类：水泵/风扇/灯）：publish_topic 填平台下发控制指令的 topic；config.relay_num 填继电器通道号
- camera/stepper：按实际文档信息填写，无信息则保持对应类型空字段即可
- metrics 每项含义：key=指标标识(英文小写,唯一)；label=中文名；unit=单位(无则空串)；mqtt_field=报文中取该值的字段路径(支持 a.b.c 与数组元素,必须与报文样例对应)；scale=缩放因子(原始值需除以 scale 得到真实值,如报文 235 表示 23.5°C 则填 10；无缩放不填)

输出严格 JSON：
{
  "name": "设备中文名（≤20字，如 'CO2浓度传感器'）",
  "type": "sensor|relay|camera|stepper",
  "category": "分类（如 环境监测/灌溉/照明/视频监控）",
  "icon": "建议 icon（可选）",
  "color": "建议颜色（可选，hex）",
  "subscribe_topic": "上行订阅 topic（sensor 必须；没有则留空并在 description 说明）",
  "publish_topic": "下行控制 topic（relay/stepper 必须）",
  "node_id": "设备节点标识（文档有则填，如 node0601；无则空）",
  "relay_num": 1,
  "metrics": [{ "key": "temperature", "label": "温度", "unit": "°C", "mqtt_field": "data.temperature", "scale": 10 }],
  "extra_config": {},
  "description": "一段 40-100 字说明：识别到了什么、填了什么、哪里是根据文档推测的",
  "usage_doc": "面向 AI 助手的设备接入能力说明文档（Markdown，400-1500字）：开头说明设备是什么，然后给字段表（指标key/中文名/单位/报文取值路径）、topic 信息、控制指令格式、注意事项。内容必须自包含、可直接作为技能文档二次使用，不要出现'参见原文'",
  "test_payload": { "一个与 subscribe_topic 上报一致的模拟报文 JSON 对象，用于核对 metrics 映射；如 {"data":{"temperature":235,"humidity":680},"ts":1690000000} }
}
要求：
- 全部字段值必须来自文档，严禁编造文档中不存在的 topic/字段/单位；拿不准的放 missing 说明或留空
- metrics 的 mqtt_field 必须能在 test_payload 中取到值（两者要互相印证）
- 只输出 JSON`

async function generateDeviceDraft(params: {
  document: string
  analysis: DeviceDocumentAnalysis
  failureFeedback?: string[]
}): Promise<DeviceDraft> {
  let user =
    `设备接入文档分析结果：\n${JSON.stringify(params.analysis, null, 2)}\n\n设备接入文档原文：\n${params.document}`
  if (params.failureFeedback && params.failureFeedback.length > 0) {
    user += `\n\n## 上一轮校验/干跑失败原因（必须修复）\n${params.failureFeedback.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
  }
  const raw = await callLLM({
    system: GENERATE_SYSTEM,
    user,
    temperature: 0.3,
    maxTokens: 6000,
  })
  const parsed = extractJson<any>(raw)
  if (!parsed) {
    // 🔥 失败兜底：LLM 没返回 JSON 也别让整条管线崩 —— 用分析结果构造最小可用草稿，
    // 用户在表单里改完照样能装入/发布技能。
    console.warn('[DeviceIntegration] generate LLM output unparseable, preview:\n', raw.slice(0, 800))
    return buildFallbackDraft(params.analysis, `AI 返回内容无法解析为 JSON（已展示前 800 字符供排查）\n\n${raw.slice(0, 600)}`)
  }

  // 宽容字段提取：name/type 接受多种常见写法（title/device_name/设备名 等）
  const name = String(
    parsed.name ?? parsed.title ?? parsed.device_name ?? parsed['设备名'] ?? ''
  ).trim()
  const typeRaw = String(
    parsed.type ?? parsed.device_type ?? parsed['设备类型'] ?? params.analysis.device_type_hint ?? 'sensor'
  ).trim().toLowerCase()
  const type: DeviceTypeEnum = (VALID_TYPES as string[]).includes(typeRaw) ? (typeRaw as DeviceTypeEnum) : 'sensor'
  const iconHint = TYPE_ICON_HINTS[type] || { icon: 'Cpu', color: '#1677ff' }
  const metrics: DraftMetric[] = Array.isArray(parsed.metrics)
    ? parsed.metrics
        .map((m: any) => ({
          key: String(m?.key || '').trim(),
          label: String(m?.label || m?.key || '').trim(),
          unit: String(m?.unit ?? ''),
          mqtt_field: String(m?.mqtt_field || m?.key || '').trim(),
          scale: asNum(m?.scale),
        }))
        .filter((m: { key: string; mqtt_field: string }) => m.key && m.mqtt_field)
    : []
  // key 唯一性：重复 key 仅保留首个
  const seen = new Set<string>()
  const uniqueMetrics = metrics.filter(m => {
    if (seen.has(m.key)) return false
    seen.add(m.key)
    return true
  })

  let testPayload: string | undefined
  if (parsed.test_payload !== undefined && parsed.test_payload !== null) {
    try {
      testPayload = typeof parsed.test_payload === 'string'
        ? parsed.test_payload
        : JSON.stringify(parsed.test_payload)
    } catch { testPayload = undefined }
  }

  return {
    name: name.slice(0, 20) || params.analysis.subject_name.slice(0, 20) || '未命名设备',
    type,
    category: String(parsed.category || '通用'),
    icon: String(parsed.icon || iconHint.icon),
    color: String(parsed.color || iconHint.color),
    subscribe_topic: String(parsed.subscribe_topic || '').trim() || undefined,
    publish_topic: String(parsed.publish_topic || '').trim() || undefined,
    node_id: String(parsed.node_id || '').trim() || undefined,
    relay_num: asNum(parsed.relay_num),
    metrics: type === 'sensor' ? uniqueMetrics : undefined,
    extra_config: parsed.extra_config && typeof parsed.extra_config === 'object' ? parsed.extra_config : undefined,
    description: String(parsed.description || ''),
    usage_doc: String(parsed.usage_doc || '').trim(),
    test_payload: testPayload,
  }
}

/**
 * 生成阶段失败兜底：LLM 输出无法解析为 JSON 时，用分析阶段已识别的信息
 * 构造"最小可用草稿"（用户可在表单里直接改），不阻断整条管线。
 */
function buildFallbackDraft(analysis: DeviceDocumentAnalysis, rawPreview: string): DeviceDraft {
  // topic 推断：找最像订阅 topic 的（包含 /device/ /sensor/ /data 等关键词），其次第一个
  const subscribeHint = analysis.topic_hints.find(t => /(report|state|telemetry|status|env|device|up|upload)/i.test(t))
    || analysis.topic_hints[0]
  return {
    name: analysis.subject_name.slice(0, 20) || '未命名设备',
    type: (['relay', 'sensor', 'camera', 'stepper'] as string[]).includes(analysis.device_type_hint)
      ? (analysis.device_type_hint as DeviceTypeEnum)
      : 'sensor',
    category: '通用',
    icon: 'Cpu',
    color: '#1677ff',
    subscribe_topic: subscribeHint,
    publish_topic: undefined,
    node_id: undefined,
    metrics: undefined,
    extra_config: undefined,
    description: `⚠️ AI 未能生成完整接入配置（已用分析阶段识别信息构造最小草稿，请在下方表单中补全）\n\nAI 原始输出片段：\n${rawPreview}`,
    usage_doc: analysis.summary ? `设备「${analysis.subject_name}」接入能力说明（草稿，待补全）：\n\n${analysis.summary}\n\n【提示】原文档中识别到 ${analysis.capabilities.length} 项能力、${analysis.payload_samples.length} 段报文样例，请基于这些信息补全 usage_doc。` : '',
    test_payload: analysis.payload_samples[0],
  }
}

// ============ Stage 3: 确定性校验 ============

export function validateDeviceDraft(draft: DeviceDraft): DraftValidation {
  const issues: DraftIssue[] = []

  if (!draft.name || draft.name.trim().length === 0) {
    issues.push({ field: 'name', message: '设备名称不能为空', level: 'error' })
  }

  // sensor：必须能收到数据（subscribe_topic + metrics）
  if (draft.type === 'sensor') {
    if (!draft.subscribe_topic || !/^[a-zA-Z0-9_\-+$/]{3,160}$/.test(draft.subscribe_topic)) {
      issues.push({ field: 'subscribe_topic', message: '传感器缺少有效的订阅 topic（如 dev/xx/sensor/data），否则平台收不到数据', level: 'error' })
    }
    if (!draft.metrics || draft.metrics.length === 0) {
      issues.push({ field: 'metrics', message: '传感器至少需要定义 1 个数据点（metrics），否则上报数据无法映射', level: 'error' })
    } else {
      const badKeys = draft.metrics.filter(m => !/^[a-z_][a-z0-9_]{0,39}$/.test(m.key))
      if (badKeys.length > 0) {
        issues.push({ field: 'metrics', message: `存在非法指标 key（需英文小写下划线开头）：${badKeys.map(m => m.key).join('、')}`, level: 'error' })
      }
      const emptyField = draft.metrics.filter(m => !m.mqtt_field)
      if (emptyField.length > 0) {
        issues.push({ field: 'metrics', message: `数据点缺少报文取值字段 mqtt_field：${emptyField.map(m => m.key || m.label).join('、')}`, level: 'error' })
      }
      const emptyLabel = draft.metrics.filter(m => !m.label)
      if (emptyLabel.length > 0) {
        issues.push({ field: 'metrics', message: `存在缺少中文名 label 的数据点：${emptyLabel.map(m => m.key).join('、')}`, level: 'warning' })
      }
    }
  }

  // relay/stepper：必须能下发指令
  if (draft.type === 'relay' || draft.type === 'stepper') {
    if (!draft.publish_topic || !/^[a-zA-Z0-9_\-+$/]{3,160}$/.test(draft.publish_topic)) {
      issues.push({ field: 'publish_topic', message: `${draft.type === 'relay' ? '继电器' : '位控设备'}缺少有效的下行控制 topic，否则平台无法控制它`, level: 'error' })
    }
  }
  if (draft.type === 'relay' && draft.relay_num === undefined) {
    issues.push({ field: 'relay_num', message: '继电器未指定通道号 relay_num（对应 MQTT 节点映射），建议补齐', level: 'warning' })
  }

  // 通用
  const dupTopics = new Set<string>()
  if (draft.subscribe_topic) {
    if (dupTopics.has(draft.subscribe_topic)) issues.push({ field: 'subscribe_topic', message: 'topic 与现有设备重复会导致订阅冲突', level: 'warning' })
    dupTopics.add(draft.subscribe_topic)
  }
  if (draft.subscribe_topic && draft.publish_topic && draft.subscribe_topic === draft.publish_topic) {
    issues.push({ field: 'subscribe_topic', message: '订阅与发布 topic 相同（上行/下行混用同一主题），请确认设备端协议是否如此', level: 'warning' })
  }

  if (!draft.description) {
    issues.push({ field: 'description', message: '缺少生成说明，建议保留以便用户理解配置依据', level: 'warning' })
  }

  return { passed: !issues.some(i => i.level === 'error'), issues }
}

// ============ Stage 3.5: dry-run 干跑核对 ============

/** 从对象按点路径取值（支持 a.b.c 与数组 a[0].b） */
function lookupByPath(obj: any, path: string): unknown {
  const parts = String(path || '').split(/\.|\[|\]/).map(s => s.trim()).filter(Boolean)
  let cur = obj
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined
    cur = cur[p]
  }
  return cur
}

/** 尝试从字符串中提取内嵌 JSON（宽容解析报文样例） */
function tryParsePayload(raw: string): { ok: boolean; value?: any; error?: string } {
  try { return { ok: true, value: JSON.parse(raw) } } catch { /* 继续 */ }
  // 截取首 { 到末 } 再试一次
  const s = raw.indexOf('{')
  const e = raw.lastIndexOf('}')
  if (s >= 0 && e > s) {
    try { return { ok: true, value: JSON.parse(raw.slice(s, e + 1)) } } catch { /* 继续 */ }
  }
  return { ok: false, error: '模拟报文不是合法 JSON，无法核对字段映射' }
}

export function dryRunDraft(draft: DeviceDraft): DryRunResult {
  const result: DryRunResult = { payloadValid: true, metrics: [], controlChecked: false, passed: false }

  // relay/stepper 检查下行通道
  if (draft.type === 'relay' || draft.type === 'stepper') {
    result.controlChecked = !!draft.publish_topic
  }

  // sensor：核对 metrics ↔ 报文
  if (draft.type === 'sensor') {
    if (!draft.test_payload || !draft.test_payload.trim()) {
      result.payloadValid = false
      result.payloadError = '缺少模拟报文（test_payload），跳过字段映射核对'
      result.passed = result.controlChecked
      return result
    }
    const parsed = tryParsePayload(draft.test_payload)
    if (!parsed.ok) {
      result.payloadValid = false
      result.payloadError = parsed.error
      return result
    }
    result.payloadValid = true
    result.metrics = (draft.metrics || []).map(m => {
      const v = lookupByPath(parsed.value, m.mqtt_field)
      if (v === undefined || v === null) {
        return { key: m.key, label: m.label, mqtt_field: m.mqtt_field, found: false, error: `报文中取不到 ${m.mqtt_field}` }
      }
      return { key: m.key, label: m.label, mqtt_field: m.mqtt_field, found: true, sampleValue: String(v) }
    })
    result.passed = result.metrics.length > 0 && result.metrics.every(m => m.found)
    if (result.metrics.length === 0) result.passed = false
    return result
  }

  result.passed = result.controlChecked
  return result
}

// ============ 主流程 ============

export async function integrateDeviceFromDocument(options: DeviceIntegrationOptions): Promise<DeviceIntegrationResult> {
  const { document, documentName, maxRevisionRounds = 1, onProgress } = options
  const startedAt = Date.now()

  let doc = (document || '').trim()
  if (doc.length === 0) {
    return { success: false, analysis: null, draft: null, validation: null, dryRun: null, rounds: 0, error: '文档内容为空' }
  }
  if (doc.length > MAX_DOC_CHARS) {
    doc = doc.slice(0, MAX_DOC_CHARS) + '\n\n[文档过长，已截断]'
  }

  try {
    // ---- Stage 1: 分析 ----
    onProgress?.({ stage: 'analyze', detail: '正在阅读接入文档，识别设备类型、数据点与 MQTT 通道…' })
    const analysis = await analyzeDocument(doc)
    onProgress?.({
      stage: 'analyze',
      detail: `文档分析完成：识别对象「${analysis.subject_name}」${analysis.device_type_hint ? `（推测类型 ${analysis.device_type_hint}）` : ''}，${analysis.capabilities.length} 项能力、${analysis.topic_hints.length} 个 topic 线索、${analysis.payload_samples.length} 段报文样例${analysis.missing_info.length > 0 ? `；缺失：${analysis.missing_info.slice(0, 2).join('；')}${analysis.missing_info.length > 2 ? '…' : ''}` : ''}`,
    })

    // ---- Stage 1.5: 信息充分性 ----
    if (isDeviceAnalysisInsufficient(analysis)) {
      const questions = buildDeviceFollowUpQuestions(analysis)
      onProgress?.({
        stage: 'analyze',
        detail: `关键信息不足（无 topic/报文/能力线索），已中止生成，等待用户补充 ${questions.length} 项信息`,
      })
      return {
        success: false, analysis, draft: null, validation: null, dryRun: null, rounds: 0,
        needsInput: true, questions,
        error: '文档关键信息不足，需要用户补充后才能生成接入配置',
      }
    }

    // ---- Stage 2-4: 生成 → 校验 → dry-run（自动修订） ----
    let draft: DeviceDraft | null = null
    let validation: DraftValidation | null = null
    let dryRun: DryRunResult | null = null
    let round = 0
    const maxRounds = maxRevisionRounds + 1

    while (round < maxRounds) {
      round++
      onProgress?.({
        stage: round === 1 ? 'generate' : 'revise',
        detail: round === 1
          ? '正在依据分析结果生成设备接入配置草稿（字段映射/数据点/topic）…'
          : `第 ${round - 1} 轮校验未通过，正在根据失败原因自动修订配置…`,
        round,
      })

      const failureFeedback: string[] = []
      if (validation) {
        validation.issues.filter(i => i.level === 'error').forEach(i => failureFeedback.push(`[校验] ${i.field}: ${i.message}`))
      }
      if (dryRun && !dryRun.passed) {
        dryRun.metrics.filter(m => !m.found).forEach(m => failureFeedback.push(`[干跑] 数据点 ${m.label}(${m.key}) 的报文取值路径 ${m.mqtt_field} 在模拟报文中取不到值，请修正 mqtt_field 或 test_payload`))
        if (dryRun.payloadError) failureFeedback.push(`[干跑] 模拟报文问题：${dryRun.payloadError}`)
      }

      draft = await generateDeviceDraft({ document: doc, analysis, failureFeedback: round > 1 ? failureFeedback : undefined }).catch((err: any) => {
        // 🔥 单轮 LLM 异常也兜底：用分析结果构造最小草稿，让后续校验继续给有用 issue
        console.warn('[DeviceIntegration] generate LLM failed, falling back:', err?.message)
        return buildFallbackDraft(analysis, `AI 调用失败（${err?.message || '未知错误'}）`)
      })

      onProgress?.({ stage: 'validate', detail: '正在校验接入配置（必填项/topic 格式/数据点合法性）…', round })
      validation = validateDeviceDraft(draft)
      if (!validation.passed) {
        onProgress?.({ stage: 'validate', detail: `校验发现 ${validation.issues.filter(i => i.level === 'error').length} 个问题，${round < maxRounds ? '进入自动修订' : '已达最大轮数'}`, round })
        if (round < maxRounds) continue
        break
      }

      onProgress?.({ stage: 'dry-run', detail: draft.type === 'sensor' ? '正在用模拟报文干跑核对数据点字段映射…' : '正在检查下行控制通道…', round })
      dryRun = dryRunDraft(draft)
      const failedMetrics = (dryRun.metrics || []).filter(m => !m.found)
      onProgress?.({
        stage: 'dry-run',
        detail: dryRun.passed
          ? `干跑通过（${dryRun.metrics.length} 个数据点全部能在报文中取值${dryRun.controlChecked ? '，控制通道正常' : ''}）`
          : `干跑发现问题：${dryRun.payloadError || `${failedMetrics.length} 个数据点映射不上报文字段`}，${round < maxRounds ? '进入自动修订' : '已达最大轮数'}`,
        round,
      })
      if (dryRun.passed) break
      if (round >= maxRounds) break

      // 时间预算保护
      if (Date.now() - startedAt > PIPELINE_BUDGET_MS - 60_000) {
        onProgress?.({ stage: 'dry-run', detail: '已达时间预算上限，将以当前版本交付（用户可人工修正数据点映射）', round })
        break
      }
    }

    if (!draft || !validation) {
      return {
        success: false, analysis, draft, validation, dryRun,
        rounds: round, error: '接入配置生成流程异常中断',
      }
    }

    const finalPassed = validation.passed && (dryRun?.passed ?? false)

    onProgress?.({
      stage: 'deliver',
      detail: finalPassed
        ? `配置草稿已就绪：设备「${draft.name}」${draft.type === 'sensor' ? `，${(draft.metrics || []).length} 个数据点已映射` : `，${draft.publish_topic ? '控制通道已配置' : '控制通道待补充'}`}。请在表单中确认后「装入莓小智」`
        : `配置已生成但存在未达标项（详见表单下方问题列表），可在表单中直接修改后装入`,
    })

    return { success: finalPassed, analysis, draft, validation, dryRun, rounds: round }
  } catch (error: any) {
    console.error('[DeviceIntegration] Pipeline error:', error)
    // 🔥 兜底：让失败也出失败卡片（用户能看到失败原因与最小可编辑草稿，而不是"啥都没有"）
    // 注：主函数内已 try/catch 抛错点（generate 失败、validate 抛错）已各自兜底；这里只剩
    // analyze 阶段就失败（如 LLM 服务不可用）的极端情况
    return {
      success: false, analysis: null, draft: null, validation: null, dryRun: null,
      rounds: 0, error: error?.message || '设备接入配置生成失败',
    }
  }
}
