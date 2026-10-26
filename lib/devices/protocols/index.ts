/**
 * 协议注册表（服务端专用 —— 含 node:net 等 Node 内置模块，**不要**在客户端组件里 import）
 *
 * 新增协议 = 在本文件加一行注册。前端通过 /api/device-platform/protocols 拿元数据，
 * 不直接依赖本模块，因此新增协议不需要改任何页面代码。
 */

import mqttAdapter from './mqtt'
import httpAdapter from './http'
import modbusAdapter from './modbus-tcp'
import type { ProtocolAdapter, ProtocolId, ProtocolMeta } from './types'

export const ADAPTERS: Record<ProtocolId, ProtocolAdapter> = {
  mqtt: mqttAdapter,
  http: httpAdapter,
  modbus_tcp: modbusAdapter,
}

export const PROTOCOL_IDS = Object.keys(ADAPTERS) as ProtocolId[]

export function isProtocolId(v: unknown): v is ProtocolId {
  return typeof v === 'string' && v in ADAPTERS
}

export function getAdapter(protocol: ProtocolId | string | null | undefined): ProtocolAdapter | null {
  if (!protocol) return null
  return (ADAPTERS as Record<string, ProtocolAdapter>)[protocol] ?? null
}

export function listProtocolMeta(): ProtocolMeta[] {
  return PROTOCOL_IDS.map((id) => ADAPTERS[id].meta)
}

export type { ProtocolAdapter, ProtocolId, ProtocolMeta }
export * from './types'
