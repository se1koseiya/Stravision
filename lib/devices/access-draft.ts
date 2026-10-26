/**
 * 接入草稿（DeviceAccessDraft）—— Copilot ↔ 接入向导的唯一契约
 *
 * 【为什么需要它】硬件接入对普通用户是门槛最高的一步（协议、Broker 地址、字段路径、
 * 换算系数…）。用户表达的是「我买了个温湿度传感器，想接进来」，而不是物模型。
 * 于是让 Copilot 在对话里把需求收敛成一份**结构化草稿**，再一键灌进接入向导：
 *   · 用户只需核对/补密码这类机器猜不到的东西，其余全部预填；
 *   · 草稿是纯数据，不落库 —— 真正的创建仍然由用户点「创建并接入」触发，
 *     所以 AI 永远无法在用户没看见的情况下往设备表里塞东西。
 *
 * 【两份消费方】
 *   1. `components/device-access/device-wizard.tsx` —— 打开时用它预填表单；
 *   2. `accessDraftBus` —— 前端工具（client tool）把草稿从对话投递到向导。
 *
 * 🚨 解析必须宽松：模型给的键名/类型经常有毛刺（"scale": "100"、unit 写成 ""、
 *    properties 直接给对象映射）。这里统一走 normalizeThingModel 收敛，
 *    解析失败只回 issues，绝不抛异常 —— 抛了整条对话就断了。
 */

import { normalizeThingModel, validateThingModel, type ThingModel } from './thing-model'
import type { ProtocolId } from './protocols/types'

/**
 * 🚨 不要从 `./protocols` 导入 `isProtocolId`：
 * 那个 barrel 会把 mqtt / HTTP / Modbus 适配器一起带进来，而本文件被
 * `components/device-access/device-wizard.tsx`（客户端组件）引用，
 * 一引就把 `mqtt` 包塞进浏览器 bundle。协议白名单在这里就地判，类型仍用 type-only 导入。
 */
const PROTOCOL_IDS: readonly ProtocolId[] = ['mqtt', 'http', 'modbus_tcp']

function isProtocolId(v: string): v is ProtocolId {
  return (PROTOCOL_IDS as readonly string[]).includes(v)
}

/** 草稿里对「连接」的描述：可以复用已有连接（给 id），也可以是待新建的 */
export interface AccessDraftConnection {
  /** 已有连接的 id（用户说「接到我那个 EMQX 上」时由模型填） */
  id?: number | null
  name?: string
  protocol?: ProtocolId
  description?: string
  /** 非敏感配置（Broker 地址、轮询路径、从站号…）；凭证一律不预填 */
  config?: Record<string, unknown>
  allow_private_network?: boolean
}

export interface AccessDraftDevice {
  name: string
  external_id?: string
  subscribe_topic?: string
  publish_topic?: string
  thing_model: ThingModel
}

export interface DeviceAccessDraft {
  connection?: AccessDraftConnection | null
  device: AccessDraftDevice
  /** 机器猜不到、需要用户补的参数（如「Broker 密码」「设备实际占用的从站地址」） */
  missing?: string[]
  /** Copilot 的判断依据（展示在向导顶部，让用户知道为什么这么填） */
  notes?: string[]
  /** 来源标记，便于以后区分「AI 生成」与「模板生成」 */
  source?: 'copilot'
}

export interface ParseDraftResult {
  draft: DeviceAccessDraft | null
  issues: string[]
}

const MAX_NOTES = 12
const MAX_ITEMS = 60

function asStr(input: unknown): string {
  if (typeof input === 'string') return input.trim()
  if (typeof input === 'number' || typeof input === 'boolean') return String(input)
  return ''
}

/** 收一份「字符串或 {name,value}」的列表，去空去重且限量 */
function asList(input: unknown, limit = MAX_NOTES): string[] {
  if (!Array.isArray(input)) return []
  const out: string[] = []
  for (const item of input) {
    const s = typeof item === 'string' ? item.trim() : asStr((item as { text?: unknown })?.text)
    if (s && !out.includes(s)) out.push(s.slice(0, 200))
    if (out.length >= limit) break
  }
  return out
}

/**
 * 把任意输入收敛成草稿。
 *
 * @param input 模型给的工具参数 / 从会话里恢复的 JSON
 */
export function parseAccessDraft(input: unknown): ParseDraftResult {
  const issues: string[] = []
  if (!input || typeof input !== 'object') {
    return { draft: null, issues: ['草稿必须是对象'] }
  }
  const o = input as Record<string, unknown>

  /* ── 设备 ── */
  const rawDevice = (o.device && typeof o.device === 'object' ? o.device : {}) as Record<string, unknown>
  const name = asStr(rawDevice.name)
  if (!name) issues.push('缺少设备名称（device.name）')

  // 物模型：兼容 {properties:[...]} / {properties:{k:{...}}} / 直接给属性数组
  let rawModel: unknown = rawDevice.thing_model ?? rawDevice.thingModel ?? rawDevice.model
  if (Array.isArray(rawModel)) rawModel = { properties: rawModel }
  const thingModel = normalizeThingModel(rawModel)
  if (thingModel.properties.length === 0) {
    issues.push('物模型里没有任何属性（thing_model.properties）—— 不知道要采集/控制什么')
  }
  if (thingModel.properties.length > MAX_ITEMS) {
    issues.push(`属性过多（${thingModel.properties.length} 个），请分批接入`)
  }

  for (const v of validateThingModel(thingModel, { requireWritableChannel: false }).issues) {
    if (v.level === 'error') issues.push(v.message)
  }

  /* ── 连接 ── */
  let connection: AccessDraftConnection | null = null
  const rawConn = o.connection
  if (rawConn && typeof rawConn === 'object') {
    const c = rawConn as Record<string, unknown>
    const protocolRaw = asStr(c.protocol)
    const protocol = isProtocolId(protocolRaw) ? protocolRaw : undefined
    if (protocolRaw && !protocol) {
      issues.push(`未知协议「${protocolRaw}」，仅支持 mqtt / http / modbus_tcp`)
    }
    const cfgRaw = (c.config && typeof c.config === 'object' ? c.config : {}) as Record<string, unknown>
    const config: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(cfgRaw)) {
      if (v === undefined || v === null || v === '') continue
      // 数字型字段模型常给成字符串（"1883"），这里按原样保留，由向导的 InputNumber 兜住
      config[k] = v
    }
    const idNum = Number(c.id)
    connection = {
      id: Number.isFinite(idNum) && idNum > 0 ? idNum : null,
      name: asStr(c.name) || undefined,
      protocol,
      description: asStr(c.description) || undefined,
      config: Object.keys(config).length ? config : undefined,
      allow_private_network: c.allow_private_network === true,
    }
    if (!connection.id && !connection.name) {
      issues.push('新建连接需要给个名字（connection.name）')
    }
    if (!connection.id && !protocol) {
      issues.push('新建连接需要指定协议（connection.protocol）')
    }
  }

  const draft: DeviceAccessDraft = {
    connection,
    device: {
      name,
      external_id: asStr(rawDevice.external_id) || undefined,
      subscribe_topic: asStr(rawDevice.subscribe_topic) || undefined,
      publish_topic: asStr(rawDevice.publish_topic) || undefined,
      thing_model: thingModel,
    },
    missing: asList(o.missing),
    notes: asList(o.notes),
    source: 'copilot',
  }

  // 有问题就整份拒收：让模型根据 issues 自己修，比默默写入半份草稿更可靠
  if (issues.length > 0) return { draft: null, issues }
  return { draft, issues }
}

/* ------------------------------------------------------------------ */
/* 投递总线（对话 → 接入向导）                                          */
/* ------------------------------------------------------------------ */

/** 草稿就绪事件：设备管理弹窗收到后打开接入向导并预填 */
export const DEVICE_ACCESS_DRAFT_EVENT = 'berry:device-access-draft'

let pendingDraft: DeviceAccessDraft | null = null

/**
 * 投递一份草稿。
 *
 * 先存 pending 再派事件：派事件时监听者可能还没挂载（比如用户当时不在设备控制页），
 * 监听者挂载后调 `consumeAccessDraft()` 仍能取到。
 */
export function pushAccessDraft(draft: DeviceAccessDraft): void {
  pendingDraft = draft
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(DEVICE_ACCESS_DRAFT_EVENT, { detail: draft }))
}

/** 取出并清空（只能被消费一次，避免重复弹向导） */
export function consumeAccessDraft(): DeviceAccessDraft | null {
  const d = pendingDraft
  pendingDraft = null
  return d
}

/** 只看不取（监听者判断是否值得抢焦点时用） */
export function peekAccessDraft(): DeviceAccessDraft | null {
  return pendingDraft
}

/**
 * 探针钩子：让 `_probe_access_draft.mjs` 能模拟「前端工具调用」把草稿投进向导。
 * 只挂一个投递函数，不暴露读取/写库能力（等价于用户在对话里说完话的那一刻）。
 */
if (typeof window !== 'undefined') {
  ;(window as unknown as { __berryPushAccessDraft?: typeof pushAccessDraft }).__berryPushAccessDraft =
    pushAccessDraft
}
