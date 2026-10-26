/**
 * 设备注册表服务
 *
 * 统一管理所有 IoT 设备（继电器/传感器/摄像头/步进电机），
 * 替代 lib/constants.ts 中的硬编码设备 ID。
 *
 * 设备类型说明：
 * - relay:    开关型设备（水泵/风扇/补光灯），config.relay_num 对应 MQTT node
 * - sensor:   数据采集设备，config.metrics 定义采集的指标列表
 * - camera:   视频流设备，config.stream_url 定义流地址
 * - stepper:  位控设备（云台/滑台），config 定义脉冲参数
 */

import { initDB, query, execute } from "./database"

// ─── 类型定义 ───

export type DeviceType = 'relay' | 'sensor' | 'camera' | 'stepper'

export interface DeviceMetric {
  key: string         // 指标标识 (temperature, humidity, etc.)
  label: string       // 中文名 (温度, 湿度)
  unit: string        // 单位 (°C, %)
  mqtt_field: string  // MQTT 消息中的字段名
  scale?: number      // 缩放因子（如 0.1 表示原始值除以 10）
}

export interface DeviceConfig {
  // relay
  relay_num?: number          // 继电器通道号（对应 MQTT node 映射）
  // sensor
  metrics?: DeviceMetric[]    // 传感器采集的指标列表
  // camera
  stream_url?: string         // 视频流地址（RTSP/HTTP）
  camera_id?: string          // 摄像头标识（a/b/...）
  // stepper
  pulses_per_mm?: number      // 脉冲/mm 转换比
  max_travel_mm?: number      // 物理量程 (mm)
  max_pulses?: number         // 最大脉冲数
  min_pulses?: number         // 最小脉冲数（原点）
  // 通用
  [key: string]: any
}

export interface Device {
  id: number
  name: string
  type: DeviceType
  category: string
  subscribe_topic: string | null
  publish_topic: string | null
  node_id: string | null
  icon: string
  color: string
  config: DeviceConfig
  is_critical: boolean
  is_enabled: boolean
  sort_order: number
  created_at: number
  updated_at: number
}

export interface CreateDeviceInput {
  name: string
  type: DeviceType
  category?: string
  subscribe_topic?: string
  publish_topic?: string
  node_id?: string
  icon?: string
  color?: string
  config?: DeviceConfig
  is_critical?: boolean
  is_enabled?: boolean
  sort_order?: number
}

export interface UpdateDeviceInput extends Partial<CreateDeviceInput> {}

// ─── 内部行映射 ───

interface DeviceRow {
  id: number
  name: string
  type: DeviceType
  category: string
  subscribe_topic: string | null
  publish_topic: string | null
  node_id: string | null
  icon: string
  color: string
  config: string | DeviceConfig
  is_critical: boolean
  is_enabled: boolean
  sort_order: number
  created_at: number
  updated_at: number
}

function mapRowToDevice(row: DeviceRow): Device {
  let config: DeviceConfig = {}
  if (row.config) {
    config = typeof row.config === 'string' ? safeParseJson(row.config) : row.config
  }
  return {
    ...row,
    config,
    is_critical: !!row.is_critical,
    is_enabled: !!row.is_enabled,
  }
}

function safeParseJson(str: string): DeviceConfig {
  try { return JSON.parse(str) } catch { return {} }
}

// ─── CRUD 操作 ───

/**
 * 获取所有设备（默认只返回启用的）
 */
export async function listDevices(opts?: { includeDisabled?: boolean }): Promise<Device[]> {
  await initDB()
  const where = opts?.includeDisabled ? '' : 'WHERE is_enabled = TRUE'
  const rows = await query<DeviceRow>(
    `SELECT * FROM devices ${where} ORDER BY sort_order ASC, id ASC`,
    []
  )
  return rows.map(mapRowToDevice)
}

/**
 * 按类型获取设备
 */
export async function listDevicesByType(type: DeviceType, opts?: { includeDisabled?: boolean }): Promise<Device[]> {
  await initDB()
  const where = opts?.includeDisabled
    ? 'WHERE type = $1'
    : 'WHERE type = $1 AND is_enabled = TRUE'
  const rows = await query<DeviceRow>(
    `SELECT * FROM devices ${where} ORDER BY sort_order ASC, id ASC`,
    [type]
  )
  return rows.map(mapRowToDevice)
}

/**
 * 获取单个设备
 */
export async function getDevice(id: number): Promise<Device | null> {
  await initDB()
  const rows = await query<DeviceRow>(
    `SELECT * FROM devices WHERE id = $1`,
    [id]
  )
  return rows.length > 0 ? mapRowToDevice(rows[0]) : null
}

/**
 * 创建设备
 */
export async function createDevice(input: CreateDeviceInput): Promise<Device> {
  await initDB()
  const now = Date.now()
  const rows = await query<DeviceRow>(
    `INSERT INTO devices (
      name, type, category, subscribe_topic, publish_topic, node_id,
      icon, color, config, is_critical, is_enabled, sort_order,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      input.name,
      input.type,
      input.category || 'general',
      input.subscribe_topic || null,
      input.publish_topic || null,
      input.node_id || null,
      input.icon || 'Cpu',
      input.color || '#059669',
      JSON.stringify(input.config || {}),
      input.is_critical ?? false,
      input.is_enabled ?? true,
      input.sort_order ?? 0,
      now,
      now,
    ]
  )
  return mapRowToDevice(rows[0])
}

/**
 * 更新设备
 */
export async function updateDevice(id: number, input: UpdateDeviceInput): Promise<Device | null> {
  await initDB()
  const existing = await getDevice(id)
  if (!existing) return null

  const merged: Device = {
    ...existing,
    ...input,
    config: { ...existing.config, ...(input.config || {}) },
    updated_at: Date.now(),
  }

  const rows = await query<DeviceRow>(
    `UPDATE devices SET
      name = $2, type = $3, category = $4, subscribe_topic = $5, publish_topic = $6,
      node_id = $7, icon = $8, color = $9, config = $10, is_critical = $11,
      is_enabled = $12, sort_order = $13, updated_at = $14
    WHERE id = $1 RETURNING *`,
    [
      id,
      merged.name,
      merged.type,
      merged.category,
      merged.subscribe_topic,
      merged.publish_topic,
      merged.node_id,
      merged.icon,
      merged.color,
      JSON.stringify(merged.config),
      merged.is_critical,
      merged.is_enabled,
      merged.sort_order,
      merged.updated_at,
    ]
  )
  return rows.length > 0 ? mapRowToDevice(rows[0]) : null
}

/**
 * 删除设备
 *
 * 默认保护：critical 设备不允许直接删除（先在管理后台解除 critical 标记），
 * 防止 AI 助手或误操作把关键控制设备从注册表里移走。
 */
export async function deleteDevice(id: number, options?: { force?: boolean }): Promise<{ deleted: boolean; blocked?: 'critical' | 'not_found' }> {
  await initDB()
  if (!options?.force) {
    const existing = await getDevice(id)
    if (!existing) return { deleted: false, blocked: 'not_found' }
    if (existing.is_critical) return { deleted: false, blocked: 'critical' }
  }
  const result = await execute(
    `DELETE FROM devices WHERE id = $1`,
    [id]
  )
  return { deleted: result.rowCount > 0 }
}

// ─── 传感器数据存储 ───

/**
 * 保存自定义传感器数据
 */
export async function saveSensorData(deviceId: number, metrics: Record<string, number>): Promise<void> {
  await initDB()
  await execute(
    `INSERT INTO device_sensor_data (device_id, metrics, created_at) VALUES ($1, $2, $3)`,
    [deviceId, JSON.stringify(metrics), Date.now()]
  )
}

/**
 * 获取自定义传感器历史数据
 */
export async function getSensorDataHistory(
  deviceId: number,
  range: string = '1h'
): Promise<Array<{ timestamp: number; metrics: Record<string, number> }>> {
  await initDB()
  let startTime = Date.now()
  switch (range) {
    case '10m': startTime -= 10 * 60 * 1000; break
    case '1h':  startTime -= 60 * 60 * 1000; break
    case '7h':  startTime -= 7 * 60 * 60 * 1000; break
    case '1d':  startTime -= 24 * 60 * 60 * 1000; break
    case '7d':  startTime -= 7 * 24 * 60 * 60 * 1000; break
    default:    startTime -= 60 * 60 * 1000
  }

  const rows = await query<{ created_at: number; metrics: string }>(
    `SELECT created_at, metrics FROM device_sensor_data
     WHERE device_id = $1 AND created_at >= $2
     ORDER BY created_at ASC`,
    [deviceId, startTime]
  )

  return rows.map(r => ({
    timestamp: Number(r.created_at),
    metrics: typeof r.metrics === 'string' ? safeParseJson(r.metrics) : r.metrics,
  }))
}

// ─── 种子初始化 ───

/**
 * 种子现有硬编码设备到注册表（幂等，仅首次运行时插入）
 *
 * 将 constants.ts 中的 DEVICE_IDS / DEVICE_NAMES / STEPPER
 * 以及 settings 中的摄像头 URL 转换为注册表记录。
 */
export async function seedDefaultDevices(): Promise<void> {
  await initDB()

  // 检查是否已有设备
  const existing = await query<{ count: string }>(`SELECT COUNT(*) as count FROM devices`)
  const count = parseInt(existing[0]?.count || '0', 10)
  if (count > 0) return

  const now = Date.now()
  const defaults: CreateDeviceInput[] = [
    // ─── 继电器设备 ───
    {
      name: '水泵系统',
      type: 'relay',
      category: '灌溉',
      publish_topic: 'data/set',
      node_id: 'node0601',
      icon: 'Droplets',
      color: '#059669',
      config: { relay_num: 5 },
      is_critical: true,
      sort_order: 1,
    },
    {
      name: '通风风扇',
      type: 'relay',
      category: '通风',
      publish_topic: 'data/set',
      node_id: 'node0602',
      icon: 'Fan',
      color: '#059669',
      config: { relay_num: 6 },
      is_critical: false,
      sort_order: 2,
    },
    {
      name: '全光谱补光灯',
      type: 'relay',
      category: '照明',
      publish_topic: 'data/set',
      node_id: 'node0603',
      icon: 'Lightbulb',
      color: '#52525B',
      config: { relay_num: 7 },
      is_critical: false,
      sort_order: 3,
    },
    {
      name: '辅助补光灯',
      type: 'relay',
      category: '照明',
      publish_topic: 'data/set',
      node_id: 'node0604',
      icon: 'Sun',
      color: '#059669',
      config: { relay_num: 8 },
      is_critical: false,
      sort_order: 4,
    },
    // ─── 环境传感器（沿用 sensor_readings 固定列） ───
    {
      name: '温室环境传感器',
      type: 'sensor',
      category: '环境监测',
      subscribe_topic: 'meimefarm/basic_env_data',
      icon: 'Thermometer',
      color: '#059669',
      config: {
        metrics: [
          { key: 'temperature', label: '温度', unit: '°C', mqtt_field: 'temperature', scale: 0.1 },
          { key: 'humidity', label: '湿度', unit: '%', mqtt_field: 'humidity', scale: 0.1 },
          { key: 'light', label: '光照', unit: 'lux', mqtt_field: 'light' },
          { key: 'co2', label: 'CO2', unit: 'ppm', mqtt_field: 'co2' },
          { key: 'soil_moisture', label: '土壤湿度', unit: '%', mqtt_field: 'earth_water', scale: 0.1 },
          { key: 'earth_n', label: '氮含量', unit: 'mg/kg', mqtt_field: 'earth_n' },
          { key: 'earth_p', label: '磷含量', unit: 'mg/kg', mqtt_field: 'earth_p' },
          { key: 'earth_k', label: '钾含量', unit: 'mg/kg', mqtt_field: 'earth_k' },
        ],
        use_legacy_table: true, // 标记使用 sensor_readings 固定列表
      },
      sort_order: 10,
    },
    {
      name: '光谱传感器',
      type: 'sensor',
      category: '环境监测',
      subscribe_topic: 'meimefarm/Spectrum',
      icon: 'Activity',
      color: '#059669',
      config: {
        metrics: Array.from({ length: 11 }, (_, i) => ({
          key: `channel${i + 1}`,
          label: `通道${i + 1}`,
          unit: '',
          mqtt_field: `channel${i + 1}`,
        })),
        use_legacy_table: false,
      },
      sort_order: 11,
    },
    // ─── 摄像头 ───
    {
      name: '温室监控摄像头 A',
      type: 'camera',
      category: '视频监控',
      icon: 'Video',
      color: '#059669',
      config: { camera_id: 'a', stream_url: '' },
      sort_order: 20,
    },
    {
      name: '温室监控摄像头 B',
      type: 'camera',
      category: '视频监控',
      icon: 'Video',
      color: '#059669',
      config: { camera_id: 'b', stream_url: '' },
      sort_order: 21,
    },
    // ─── 步进电机/云台 ───
    {
      name: '摄像头云台',
      type: 'stepper',
      category: '视频监控',
      publish_topic: 'data/set',
      icon: 'Compass',
      color: '#059669',
      config: {
        pulses_per_mm: 160,
        max_travel_mm: 700,
        max_pulses: 112000,
        min_pulses: 0,
        node_preset: 'node0814',
        node_pulses: 'node0817',
        node_speed: 'node0803',
      },
      sort_order: 30,
    },
  ]

  for (const dev of defaults) {
    try {
      await createDevice(dev)
    } catch (e) {
      console.error('[DeviceRegistry] seed error:', dev.name, e)
    }
  }

  console.log(`[DeviceRegistry] Seeded ${defaults.length} default devices`)
}

/**
 * 获取所有需要订阅的 MQTT topic（用于 MQTT 服务动态订阅）
 */
export async function getSubscribeTopics(): Promise<string[]> {
  await initDB()
  const rows = await query<{ subscribe_topic: string }>(
    `SELECT DISTINCT subscribe_topic FROM devices
     WHERE type = 'sensor' AND is_enabled = TRUE AND subscribe_topic IS NOT NULL`
  )
  return rows.map(r => r.subscribe_topic).filter(Boolean)
}

/**
 * 获取所有继电器设备（用于控制页和 MCP 工具）
 */
export async function getRelayDevices(): Promise<Device[]> {
  return listDevicesByType('relay')
}

/**
 * 获取所有传感器设备
 */
export async function getSensorDevices(): Promise<Device[]> {
  return listDevicesByType('sensor')
}

/**
 * 获取所有摄像头设备
 */
export async function getCameraDevices(): Promise<Device[]> {
  return listDevicesByType('camera')
}

/**
 * 获取所有步进电机设备
 */
export async function getStepperDevices(): Promise<Device[]> {
  return listDevicesByType('stepper')
}
