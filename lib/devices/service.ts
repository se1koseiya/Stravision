/**
 * 通用硬件接入 —— 数据服务层
 *
 * 只做「读写数据库 + 行映射」，不做协议、不做模板渲染。
 * 连接（device_connections）与设备（devices.access_mode='generic'）分离：
 * 一个连接可以挂 N 台设备，删除连接前必须先清空其下设备。
 */

import crypto from 'node:crypto'
import { initDB, query, execute } from '@/lib/db/database'
import type {
  ConnectionRecord,
  GenericDeviceRecord,
  ProtocolId,
} from './protocols/types'
import { isProtocolId } from './protocols'
import { normalizeThingModel, thingModelFromLegacyMetrics, type ThingModel } from './thing-model'

// ============ 行映射 ============

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function parseJson<T>(v: unknown, fallback: T): T {
  if (v === null || v === undefined) return fallback
  if (typeof v === 'string') {
    try { return JSON.parse(v) as T } catch { return fallback }
  }
  return v as T
}

function mapConnection(row: Record<string, unknown>): ConnectionRecord {
  return {
    id: num(row.id),
    name: String(row.name ?? ''),
    protocol: (row.protocol as ProtocolId) || 'http',
    description: row.description === null || row.description === undefined ? null : String(row.description),
    config: parseJson<Record<string, unknown>>(row.config, {}),
    secrets: parseJson<Record<string, unknown>>(row.secrets, {}),
    is_enabled: row.is_enabled === true,
    allow_private_network: row.allow_private_network === true,
    owner_id: row.owner_id === null || row.owner_id === undefined ? null : num(row.owner_id),
    last_ok_at: row.last_ok_at === null || row.last_ok_at === undefined ? null : num(row.last_ok_at),
    last_error: row.last_error === null || row.last_error === undefined ? null : String(row.last_error),
    created_at: num(row.created_at),
    updated_at: num(row.updated_at),
  }
}

function mapGenericDevice(row: Record<string, unknown>): GenericDeviceRecord {
  const rawModel = parseJson<unknown>(row.thing_model, null)
  const config = parseJson<Record<string, unknown>>(row.config, {})
  const model: ThingModel = rawModel
    ? normalizeThingModel(rawModel)
    : thingModelFromLegacyMetrics(config.metrics)

  return {
    id: num(row.id),
    name: String(row.name ?? ''),
    type: String(row.type ?? 'generic'),
    category: String(row.category ?? '通用'),
    subscribe_topic: row.subscribe_topic === null || row.subscribe_topic === undefined ? null : String(row.subscribe_topic),
    publish_topic: row.publish_topic === null || row.publish_topic === undefined ? null : String(row.publish_topic),
    external_id: row.external_id === null || row.external_id === undefined ? null : String(row.external_id),
    connection_id: row.connection_id === null || row.connection_id === undefined ? null : num(row.connection_id),
    protocol: (row.protocol as ProtocolId) || null,
    ingest_key: row.ingest_key === null || row.ingest_key === undefined ? null : String(row.ingest_key),
    thing_model: model,
    last_seen_at: row.last_seen_at === null || row.last_seen_at === undefined ? null : num(row.last_seen_at),
    is_enabled: row.is_enabled !== false,
    icon: String(row.icon ?? 'Cpu'),
    color: String(row.color ?? '#059669'),
  }
}

/** 连接对外的安全视图：凭证只回「是否已配置」，绝不回原文 */
export interface SafeConnection extends Omit<ConnectionRecord, 'secrets'> {
  secretKeys: string[]
  deviceCount?: number
}

export function toSafeConnection(conn: ConnectionRecord, deviceCount?: number): SafeConnection {
  const { secrets, ...rest } = conn
  return { ...rest, secretKeys: Object.keys(secrets || {}), deviceCount }
}

// ============ 连接 CRUD ============

export async function listConnections(): Promise<ConnectionRecord[]> {
  await initDB()
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM device_connections ORDER BY id DESC`
  )
  return rows.map(mapConnection)
}

export async function getConnection(id: number): Promise<ConnectionRecord | null> {
  await initDB()
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM device_connections WHERE id = $1`,
    [id]
  )
  return rows.length > 0 ? mapConnection(rows[0]) : null
}

export interface CreateConnectionInput {
  name: string
  protocol: ProtocolId
  description?: string
  config?: Record<string, unknown>
  secrets?: Record<string, unknown>
  is_enabled?: boolean
  allow_private_network?: boolean
  owner_id?: number
}

export async function createConnection(input: CreateConnectionInput): Promise<ConnectionRecord> {
  await initDB()
  const now = Date.now()
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO device_connections
      (name, protocol, description, config, secrets, is_enabled, allow_private_network, owner_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      input.name.trim().slice(0, 60),
      input.protocol,
      input.description || null,
      JSON.stringify(input.config || {}),
      JSON.stringify(input.secrets || {}),
      input.is_enabled ?? true,
      input.allow_private_network ?? false,
      input.owner_id ?? null,
      now,
      now,
    ]
  )
  return mapConnection(rows[0])
}

export interface UpdateConnectionInput {
  name?: string
  description?: string | null
  config?: Record<string, unknown>
  secrets?: Record<string, unknown>
  is_enabled?: boolean
  allow_private_network?: boolean
}

/** 更新连接；secrets 传 undefined = 不改，传 {} = 清空 */
export async function updateConnection(id: number, input: UpdateConnectionInput): Promise<ConnectionRecord | null> {
  await initDB()
  const existing = await getConnection(id)
  if (!existing) return null
  const merged = {
    name: input.name !== undefined ? input.name.trim().slice(0, 60) : existing.name,
    description: input.description !== undefined ? input.description : existing.description,
    config: input.config !== undefined ? input.config : existing.config,
    secrets: input.secrets !== undefined ? input.secrets : existing.secrets,
    is_enabled: input.is_enabled !== undefined ? input.is_enabled : existing.is_enabled,
    allow_private_network: input.allow_private_network !== undefined ? input.allow_private_network : existing.allow_private_network,
  }
  const rows = await query<Record<string, unknown>>(
    `UPDATE device_connections SET
       name = $2, description = $3, config = $4, secrets = $5,
       is_enabled = $6, allow_private_network = $7, updated_at = $8
     WHERE id = $1 RETURNING *`,
    [
      id,
      merged.name,
      merged.description,
      JSON.stringify(merged.config),
      JSON.stringify(merged.secrets),
      merged.is_enabled,
      merged.allow_private_network,
      Date.now(),
    ]
  )
  return rows.length > 0 ? mapConnection(rows[0]) : null
}

export async function recordConnectionTest(
  id: number,
  result: { ok: boolean; error?: string }
): Promise<void> {
  await initDB()
  await execute(
    `UPDATE device_connections SET last_ok_at = CASE WHEN $2 THEN $3 ELSE last_ok_at END,
       last_error = $4, updated_at = $3 WHERE id = $1`,
    [id, result.ok, Date.now(), result.ok ? null : (result.error || null)]
  )
}

export async function countDevicesOfConnection(id: number): Promise<number> {
  await initDB()
  const rows = await query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM devices WHERE connection_id = $1`,
    [id]
  )
  return num(rows[0]?.c)
}

/** 一次查出所有连接的设备数（避免列表页 N+1） */
export async function countDevicesGrouped(): Promise<Map<number, number>> {
  await initDB()
  const rows = await query<{ connection_id: string; c: string }>(
    `SELECT connection_id, COUNT(*)::text AS c FROM devices
     WHERE connection_id IS NOT NULL GROUP BY connection_id`
  )
  const map = new Map<number, number>()
  for (const r of rows) map.set(num(r.connection_id), num(r.c))
  return map
}

export async function deleteConnection(id: number): Promise<{ deleted: boolean; blocked?: 'has_devices' | 'not_found' }> {
  await initDB()
  const existing = await getConnection(id)
  if (!existing) return { deleted: false, blocked: 'not_found' }
  const count = await countDevicesOfConnection(id)
  if (count > 0) return { deleted: false, blocked: 'has_devices' }
  const res = await execute(`DELETE FROM device_connections WHERE id = $1`, [id])
  return { deleted: res.rowCount > 0 }
}

// ============ 通用设备 CRUD ============

const GENERIC_SELECT = `id, name, type, category, subscribe_topic, publish_topic,
  external_id, connection_id, protocol, ingest_key, thing_model, last_seen_at, config,
  is_enabled, icon, color`

export async function listGenericDevices(connectionId?: number): Promise<GenericDeviceRecord[]> {
  await initDB()
  const params: unknown[] = []
  let where = `WHERE access_mode = 'generic'`
  if (connectionId !== undefined) {
    params.push(connectionId)
    where += ` AND connection_id = $${params.length}`
  }
  const rows = await query<Record<string, unknown>>(
    `SELECT ${GENERIC_SELECT} FROM devices ${where} ORDER BY sort_order ASC, id ASC`,
    params
  )
  return rows.map(mapGenericDevice)
}

export async function getGenericDevice(id: number): Promise<GenericDeviceRecord | null> {
  await initDB()
  const rows = await query<Record<string, unknown>>(
    `SELECT ${GENERIC_SELECT} FROM devices WHERE id = $1 AND access_mode = 'generic'`,
    [id]
  )
  return rows.length > 0 ? mapGenericDevice(rows[0]) : null
}

/** HTTP 上报入口：靠 ingest_key 定位设备（公开路由，不经过登录态） */
export async function getDeviceByIngestKey(key: string): Promise<GenericDeviceRecord | null> {
  if (!key || key.length < 12 || key.length > 120) return null
  await initDB()
  const rows = await query<Record<string, unknown>>(
    `SELECT ${GENERIC_SELECT} FROM devices WHERE ingest_key = $1 AND access_mode = 'generic' LIMIT 1`,
    [key]
  )
  return rows.length > 0 ? mapGenericDevice(rows[0]) : null
}

export interface CreateGenericDeviceInput {
  name: string
  connection_id: number
  external_id?: string
  category?: string
  type?: string
  icon?: string
  color?: string
  subscribe_topic?: string
  publish_topic?: string
  thing_model?: unknown
  protocol?: ProtocolId
}

export function generateIngestKey(): string {
  return `udk_${crypto.randomBytes(18).toString('base64url')}`
}

export async function createGenericDevice(input: CreateGenericDeviceInput): Promise<GenericDeviceRecord> {
  await initDB()
  const now = Date.now()
  const model = normalizeThingModel(input.thing_model)
  const ingestKey = generateIngestKey()
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO devices
      (name, type, category, subscribe_topic, publish_topic, node_id, icon, color, config,
       is_critical, is_enabled, sort_order, created_at, updated_at,
       access_mode, connection_id, protocol, external_id, thing_model, ingest_key)
     VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,'{}'::jsonb,FALSE,TRUE,$8,$9,$10,
             'generic',$11,$12,$13,$14,$15)
     RETURNING ${GENERIC_SELECT}`,
    [
      input.name.trim().slice(0, 60),
      input.type || 'generic',
      input.category || '通用',
      input.subscribe_topic || null,
      input.publish_topic || null,
      input.icon || 'Cpu',
      input.color || '#059669',
      100,
      now,
      now,
      input.connection_id,
      input.protocol || null,
      input.external_id || null,
      JSON.stringify(model),
      ingestKey,
    ]
  )
  return mapGenericDevice(rows[0])
}

export interface UpdateGenericDeviceInput {
  name?: string
  category?: string
  type?: string
  icon?: string
  color?: string
  subscribe_topic?: string | null
  publish_topic?: string | null
  external_id?: string | null
  thing_model?: unknown
  is_enabled?: boolean
}

export async function updateGenericDevice(id: number, input: UpdateGenericDeviceInput): Promise<GenericDeviceRecord | null> {
  await initDB()
  const existing = await getGenericDevice(id)
  if (!existing) return null

  const model = input.thing_model !== undefined
    ? normalizeThingModel(input.thing_model)
    : existing.thing_model

  const rows = await query<Record<string, unknown>>(
    `UPDATE devices SET
       name = $2, type = $3, category = $4, subscribe_topic = $5, publish_topic = $6,
       icon = $7, color = $8, external_id = $9, thing_model = $10, is_enabled = $11, updated_at = $12
     WHERE id = $1 AND access_mode = 'generic'
     RETURNING ${GENERIC_SELECT}`,
    [
      id,
      input.name !== undefined ? input.name.trim().slice(0, 60) : existing.name,
      input.type !== undefined ? input.type : existing.type,
      input.category !== undefined ? input.category : existing.category,
      input.subscribe_topic !== undefined ? input.subscribe_topic : existing.subscribe_topic,
      input.publish_topic !== undefined ? input.publish_topic : existing.publish_topic,
      input.icon !== undefined ? input.icon : existing.icon,
      input.color !== undefined ? input.color : existing.color,
      input.external_id !== undefined ? input.external_id : existing.external_id,
      JSON.stringify(model),
      input.is_enabled !== undefined ? input.is_enabled : existing.is_enabled,
      Date.now(),
    ]
  )
  return rows.length > 0 ? mapGenericDevice(rows[0]) : null
}

export async function deleteGenericDevice(id: number): Promise<boolean> {
  await initDB()
  const res = await execute(
    `DELETE FROM devices WHERE id = $1 AND access_mode = 'generic'`,
    [id]
  )
  if (res.rowCount > 0) {
    // 属性历史一并清理，避免孤儿数据长期占用
    await execute(`DELETE FROM device_property_values WHERE device_id = $1`, [id]).catch(() => undefined)
  }
  return res.rowCount > 0
}

export async function regenerateIngestKey(id: number): Promise<string | null> {
  await initDB()
  const key = generateIngestKey()
  const res = await execute(
    `UPDATE devices SET ingest_key = $2, updated_at = $3 WHERE id = $1 AND access_mode = 'generic'`,
    [id, key, Date.now()]
  )
  return res.rowCount > 0 ? key : null
}

// ============ 属性值读写 ============

export interface PropertyValueInput {
  key: string
  valueNum?: number | null
  valueText?: string | null
  valueBool?: boolean | null
  quality?: string
}

export async function savePropertyValues(deviceId: number, values: PropertyValueInput[], raw?: unknown): Promise<number> {
  if (values.length === 0) return 0
  await initDB()
  const now = Date.now()
  const rawJson = raw === undefined ? null : JSON.stringify(raw)
  const params: unknown[] = []
  // 每行 8 列：device_id / property_key / value_num / value_text / value_bool / quality / raw / created_at
  const tuples = values.map((v, i) => {
    const base = i * 8
    params.push(
      deviceId,
      v.key,
      v.valueNum ?? null,
      v.valueText ?? null,
      v.valueBool ?? null,
      v.quality || 'good',
      rawJson,
      now
    )
    return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7}::jsonb,$${base + 8})`
  })
  await execute(
    `INSERT INTO device_property_values
      (device_id, property_key, value_num, value_text, value_bool, quality, raw, created_at)
     VALUES ${tuples.join(',')}`,
    params
  )
  await execute(`UPDATE devices SET last_seen_at = $2 WHERE id = $1`, [deviceId, now])
  return values.length
}

export type PropertyValue = {
  key: string
  valueNum: number | null
  valueText: string | null
  valueBool: boolean | null
  quality: string
  createdAt: number
}

export async function getLatestPropertyValues(deviceId: number): Promise<PropertyValue[]> {
  await initDB()
  const rows = await query<Record<string, unknown>>(
    `SELECT DISTINCT ON (property_key)
       property_key, value_num, value_text, value_bool, quality, created_at
     FROM device_property_values
     WHERE device_id = $1
     ORDER BY property_key, created_at DESC`,
    [deviceId]
  )
  return rows.map((r) => ({
    key: String(r.property_key),
    valueNum: r.value_num === null || r.value_num === undefined ? null : Number(r.value_num),
    valueText: r.value_text === null || r.value_text === undefined ? null : String(r.value_text),
    valueBool: r.value_bool === null || r.value_bool === undefined ? null : r.value_bool === true,
    quality: String(r.quality ?? 'good'),
    createdAt: num(r.created_at),
  }))
}

/** 批量取多台设备的最新值（设备列表页一次查询，避免 N 次往返） */
export async function getLatestValuesForDevices(deviceIds: number[]): Promise<Map<number, PropertyValue[]>> {
  const out = new Map<number, PropertyValue[]>()
  if (deviceIds.length === 0) return out
  await initDB()
  const rows = await query<Record<string, unknown>>(
    `SELECT DISTINCT ON (device_id, property_key)
       device_id, property_key, value_num, value_text, value_bool, quality, created_at
     FROM device_property_values
     WHERE device_id = ANY($1::bigint[])
     ORDER BY device_id, property_key, created_at DESC`,
    [deviceIds]
  )
  for (const r of rows) {
    const id = num(r.device_id)
    const list = out.get(id) || []
    list.push({
      key: String(r.property_key),
      valueNum: r.value_num === null || r.value_num === undefined ? null : Number(r.value_num),
      valueText: r.value_text === null || r.value_text === undefined ? null : String(r.value_text),
      valueBool: r.value_bool === null || r.value_bool === undefined ? null : r.value_bool === true,
      quality: String(r.quality ?? 'good'),
      createdAt: num(r.created_at),
    })
    out.set(id, list)
  }
  return out
}

const RANGE_MS: Record<string, number> = {
  '10m': 10 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}

export async function getPropertyHistory(
  deviceId: number,
  keys: string[] = [],
  range = '1h',
  limit = 600
): Promise<Array<{ key: string; points: Array<{ t: number; v: number }> }>> {
  await initDB()
  const since = Date.now() - (RANGE_MS[range] ?? RANGE_MS['1h'])
  const params: unknown[] = [deviceId, since]
  let keyFilter = ''
  if (keys.length > 0) {
    params.push(keys)
    keyFilter = ` AND property_key = ANY($${params.length}::text[])`
  }
  params.push(Math.min(Math.max(limit, 10), 3000))
  const rows = await query<Record<string, unknown>>(
    `SELECT property_key, value_num, created_at
     FROM device_property_values
     WHERE device_id = $1 AND created_at >= $2 AND value_num IS NOT NULL${keyFilter}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  )
  const grouped = new Map<string, Array<{ t: number; v: number }>>()
  // 查询是倒序（取最近 N 条），这里反转为正序便于画图
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i]
    const key = String(r.property_key)
    const list = grouped.get(key) || []
    list.push({ t: num(r.created_at), v: Number(r.value_num) })
    grouped.set(key, list)
  }
  return Array.from(grouped.entries()).map(([key, points]) => ({ key, points }))
}

// ============ 统计 ============

export async function getDevicePlatformStats(): Promise<{
  connections: number
  devices: number
  onlineDevices: number
  valuesToday: number
}> {
  await initDB()
  const [conn, dev, online, vals] = await Promise.all([
    query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM device_connections`),
    query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM devices WHERE access_mode = 'generic'`),
    query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM devices WHERE access_mode = 'generic' AND last_seen_at > $1`, [Date.now() - 5 * 60 * 1000]),
    query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM device_property_values WHERE created_at > $1`, [Date.now() - 24 * 60 * 60 * 1000]),
  ])
  return {
    connections: num(conn[0]?.c),
    devices: num(dev[0]?.c),
    onlineDevices: num(online[0]?.c),
    valuesToday: num(vals[0]?.c),
  }
}

/** 校验协议 id（供 API 层复用） */
export function assertProtocol(v: unknown): ProtocolId {
  if (!isProtocolId(v)) throw new Error(`不支持的协议：${String(v)}`)
  return v
}
