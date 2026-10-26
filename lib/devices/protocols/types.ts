/**
 * 协议适配器契约 —— 通用硬件接入的第二块基座
 *
 * 目标：新增一种硬件协议只需要**加一个文件**，不用改数据库、不用改页面、不用改 AI 工具。
 * 每个适配器负责三件事：
 *   1. meta        自描述（名称/说明/配置表单字段），前端据此动态渲染接入表单
 *   2. test        连通性自检（用户点「测试连接」）
 *   3. send        下发（动作/可写属性），返回可展示的请求与响应
 *
 * 上行（设备 → 平台）由三条通路承接，与适配器解耦：
 *   - HTTP 推送：走 /api/device-platform/ingest/[key]，不需要常驻连接
 *   - HTTP 轮询：走 poller（按连接配置的 interval 拉取）
 *   - MQTT 常驻：走 mqtt-runtime（按连接建立 client 并订阅）
 *   - Modbus TCP：按需读取（动作可读保持寄存器）
 */

export type ProtocolId = 'mqtt' | 'http' | 'modbus_tcp'

export type ProtocolFieldType = 'text' | 'number' | 'password' | 'boolean' | 'select' | 'textarea'

export interface ProtocolField {
  key: string
  label: string
  type: ProtocolFieldType
  required?: boolean
  placeholder?: string
  help?: string
  /** 存到 secrets（API 只回掩码）而不是 config */
  secret?: boolean
  /**
   * 高级参数：默认折叠进「高级参数」，只有配置过接入的人才会去改。
   * 放进折叠区的判据是「不改也能跑」，而不是「不重要」。
   */
  advanced?: boolean
  /**
   * 条件显示：同组另一个字段取到指定值时才有意义。
   * 例：HTTP 的 token 只在 authType=bearer 时出现，避免五种凭证同时铺满表单。
   */
  showWhen?: { key: string; in: string[] }
  options?: Array<{ label: string; value: string }>
  default?: string | number | boolean
}

export interface ProtocolMeta {
  id: ProtocolId
  name: string
  summary: string
  /** 是否支持设备上报（建立上行通路） */
  inbound: boolean
  /** 是否支持平台下发 */
  outbound: boolean
  /** 上报方式说明（"设备主动 POST" / "平台订阅 topic" / "平台轮询"） */
  inboundHint: string
  fields: ProtocolField[]
}

// ============ 记录类型（与 DB 行一一对应） ============

export interface ConnectionRecord {
  id: number
  name: string
  protocol: ProtocolId
  description: string | null
  config: Record<string, unknown>
  secrets: Record<string, unknown>
  is_enabled: boolean
  allow_private_network: boolean
  owner_id: number | null
  last_ok_at: number | null
  last_error: string | null
  created_at: number
  updated_at: number
}

/** 通用设备记录（devices 表中 access_mode = 'generic' 的行） */
export interface GenericDeviceRecord {
  id: number
  name: string
  type: string
  category: string
  subscribe_topic: string | null
  publish_topic: string | null
  external_id: string | null
  connection_id: number | null
  protocol: ProtocolId | null
  ingest_key: string | null
  thing_model: unknown
  last_seen_at: number | null
  is_enabled: boolean
  icon: string
  color: string
}

// ============ 下发 ============

export interface SendContext {
  connection: ConnectionRecord
  device: GenericDeviceRecord
  /** 下发通道（动作 transport / 属性 write / 设备 publish_topic 回落） */
  spec: {
    topic?: string
    payload?: string
    method?: string
    url?: string
    headers?: Record<string, string>
    body?: string
    slaveId?: number
    register?: number
    registerType?: 'holding' | 'coil' | 'input' | 'discrete'
    dataType?: 'int16' | 'uint16' | 'int32' | 'uint32' | 'float32'
  }
  /** 模板上下文：{ value, params, device, conn } */
  vars: Record<string, unknown>
}

export interface SendResult {
  ok: boolean
  /** 实际发出的请求（给用户看，便于自己用 curl/模拟器复现） */
  request?: Record<string, unknown>
  /** 设备/服务端响应（截断后） */
  response?: unknown
  error?: string
  /** 毫秒 */
  durationMs?: number
}

export interface TestResult {
  ok: boolean
  detail: string
  /** 探测到的额外信息（如 broker 版本、HTTP 状态码、寄存器值） */
  extra?: Record<string, unknown>
}

export interface ProtocolAdapter {
  meta: ProtocolMeta
  /**
   * 配置校验：返回错误列表（空数组 = 通过）。
   * 只做「静态」校验（必填/格式/端口范围），不做网络请求。
   */
  validate(config: Record<string, unknown>, secrets: Record<string, unknown>): string[]
  /** 连通性测试（会发真实请求，必须带超时） */
  test(connection: ConnectionRecord, opts?: { allowPrivateNetwork?: boolean }): Promise<TestResult>
  /** 下发一条指令 */
  send(ctx: SendContext, opts?: { allowPrivateNetwork?: boolean }): Promise<SendResult>
}

// ============ 工具 ============

/** 从 config 读字符串（带默认值） */
export function cfgStr(config: Record<string, unknown>, key: string, fallback = ''): string {
  const v = config[key]
  if (v === undefined || v === null) return fallback
  return String(v)
}

/** 从 config 读数字（带默认值 + 范围收敛） */
export function cfgNum(config: Record<string, unknown>, key: string, fallback: number, min?: number, max?: number): number {
  const n = Number(config[key])
  let out = Number.isFinite(n) ? n : fallback
  if (min !== undefined && out < min) out = min
  if (max !== undefined && out > max) out = max
  return out
}

/** 从 config 读布尔（显式 true 才算 true，避免字符串 "false" 变真） */
export function cfgBool(config: Record<string, unknown>, key: string, fallback = false): boolean {
  const v = config[key]
  if (v === undefined || v === null) return fallback
  if (typeof v === 'boolean') return v
  return String(v) === 'true'
}

/** 统一超时 fetch（所有适配器共用，禁止裸 fetch 无超时） */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
