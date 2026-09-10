/**
 * 农业数据服务
 *
 * 与 device-service 的区别：
 * - device-service 面向「设备」（控制 + 通用历史曲线）
 * - farm-service 面向「农事判断」（当前态势、土壤诊断、操作记录）
 *
 * 所有数据来自本地库（sensor_readings / device_logs），不依赖任何外部 IoT 平台。
 * 此前有一批 mcp_soil_sensor_query 之类的工具去调不存在的外部 API，已下架，由本模块接替。
 */

import { initDB, query } from './database'

/** 传感器指标元数据（与 device-service.METRIC_META 保持一致，避免交叉引用造成耦合） */
const FARM_METRICS = [
  { key: 'temperature', col: 'temperature', label: '空气温度', unit: '°C' },
  { key: 'humidity', col: 'humidity', label: '空气湿度', unit: '%' },
  { key: 'light', col: 'light', label: '光照', unit: 'lux' },
  { key: 'co2', col: 'co2', label: 'CO2', unit: 'ppm' },
  { key: 'soilMoisture', col: 'soil_moisture', label: '土壤湿度', unit: '%' },
  { key: 'nitrogen', col: 'earth_n', label: '氮含量', unit: 'mg/kg' },
  { key: 'phosphorus', col: 'earth_p', label: '磷含量', unit: 'mg/kg' },
  { key: 'potassium', col: 'earth_k', label: '钾含量', unit: 'mg/kg' },
  { key: 'rainfall', col: 'rainfall', label: '雨量', unit: 'mm' }
] as const

/**
 * 土壤氮磷钾丰缺参考阈值（mg/kg，碱解氮 / 有效磷 / 速效钾通用分级）
 * 用于把裸数值翻译成可执行的农事建议 —— 这是本服务相对「查历史曲线」的真正增量。
 */
const SOIL_THRESHOLDS = {
  nitrogen: { low: 60, high: 120 },
  phosphorus: { low: 20, high: 40 },
  potassium: { low: 80, high: 150 }
} as const

/** 草莓等浆果适宜的土壤相对湿度区间（%） */
const SOIL_MOISTURE_RANGE = { min: 60, max: 80 }

export type Trend = 'rising' | 'falling' | 'stable' | 'unknown'

export interface MetricSnapshot {
  key: string
  label: string
  unit: string
  value: number | null
  avg24h: number | null
  delta24h: number | null
  trend: Trend
}

export interface ConditionsReport {
  measuredAt: number | null
  dataAgeMinutes: number | null
  metrics: MetricSnapshot[]
}

export interface NutrientAssessment {
  key: string
  label: string
  value: number | null
  unit: string
  level: '缺乏' | '中等' | '丰富' | '未知'
  advice: string
}

export interface SoilReport {
  measuredAt: number | null
  moisture: { value: number | null; unit: string; assessment: string }
  nutrients: NutrientAssessment[]
  fertilityIndex: number | null
  summary: string
  suggestions: string[]
}

export interface ActivityEntry {
  id: number
  deviceName: string
  action: string
  operator: string
  details: string | null
  createdAt: number
}

/** 变化超过该比例才算「有趋势」，否则视为平稳，避免微小波动干扰判断 */
const TREND_EPSILON = 0.02

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function round1(n: number | null): number | null {
  return n === null ? null : Number(n.toFixed(1))
}

/**
 * 获取当前环境态势：9 项指标的最新值 + 24 小时均值 + 变化趋势
 *
 * AI 此前只能查「历史曲线」，无法回答「现在棚里什么情况」，本函数补上这个缺口。
 */
export async function getCurrentConditions(): Promise<ConditionsReport> {
  await initDB()

  const now = Date.now()
  const since = now - 24 * 60 * 60 * 1000

  const latest = await query<Record<string, any>>(
    `SELECT * FROM sensor_readings
     ORDER BY created_at DESC
     LIMIT 1`
  )

  const avgRows = await query<Record<string, any>>(
    `SELECT ${FARM_METRICS.map(m => `AVG(${m.col}) AS ${m.col}_avg`).join(', ')}
     FROM sensor_readings
     WHERE created_at >= $1`,
    [since]
  )
  const avg = avgRows[0] ?? {}

  // 24 小时窗口内最早的一条，用于判断趋势方向
  const baseRows = await query<Record<string, any>>(
    `SELECT * FROM sensor_readings
     WHERE created_at >= $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [since]
  )
  const base = baseRows[0] ?? {}

  const row = latest[0] ?? {}
  const measuredAt = toNumber(row.created_at)

  const metrics: MetricSnapshot[] = FARM_METRICS.map(m => {
    const value = toNumber(row[m.col])
    const avg24h = round1(toNumber(avg[`${m.col}_avg`]))
    const baseValue = toNumber(base[m.col])
    const delta24h = value !== null && baseValue !== null ? round1(value - baseValue) : null

    let trend: Trend = 'unknown'
    if (value !== null && baseValue !== null && baseValue !== 0) {
      const ratio = (value - baseValue) / Math.abs(baseValue)
      trend = ratio > TREND_EPSILON ? 'rising' : ratio < -TREND_EPSILON ? 'falling' : 'stable'
    }

    return {
      key: m.key,
      label: m.label,
      unit: m.unit,
      value: round1(value),
      avg24h,
      delta24h,
      trend
    }
  })

  return {
    measuredAt,
    dataAgeMinutes: measuredAt ? Math.round((now - measuredAt) / 60000) : null,
    metrics
  }
}

function assessNutrient(
  key: 'nitrogen' | 'phosphorus' | 'potassium',
  value: number | null
): Pick<NutrientAssessment, 'level' | 'advice'> {
  if (value === null) return { level: '未知', advice: '暂无数据，无法判断' }

  const t = SOIL_THRESHOLDS[key]
  const nameMap = { nitrogen: '氮', phosphorus: '磷', potassium: '钾' }
  const name = nameMap[key]

  if (value < t.low) {
    return { level: '缺乏', advice: `${name}含量偏低，建议追施${name}肥，注意少量多次避免烧根` }
  }
  if (value > t.high) {
    return { level: '丰富', advice: `${name}含量充足，本轮无需追肥，避免过量导致盐渍化` }
  }
  return { level: '中等', advice: `${name}含量处于正常区间，维持现有施肥方案` }
}

/**
 * 土壤诊断：湿度 + 氮磷钾丰缺评级 + 可执行建议
 *
 * 这是农业专属能力 —— 不是查数据，而是给出「该不该浇、该不该施、施什么」的结论。
 */
export async function analyzeSoil(): Promise<SoilReport> {
  await initDB()

  const rows = await query<Record<string, any>>(
    `SELECT soil_moisture, earth_n, earth_p, earth_k, created_at
     FROM sensor_readings
     WHERE soil_moisture IS NOT NULL
        OR earth_n IS NOT NULL
        OR earth_p IS NOT NULL
        OR earth_k IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 1`
  )
  const row = rows[0] ?? {}
  const measuredAt = toNumber(row.created_at)

  const moisture = toNumber(row.soil_moisture)
  const n = toNumber(row.earth_n)
  const p = toNumber(row.earth_p)
  const k = toNumber(row.earth_k)

  const nutrients: NutrientAssessment[] = (
    [
      { key: 'nitrogen', label: '氮含量', value: n, unit: 'mg/kg' },
      { key: 'phosphorus', label: '磷含量', value: p, unit: 'mg/kg' },
      { key: 'potassium', label: '钾含量', value: k, unit: 'mg/kg' }
    ] as const
  ).map(item => ({
    ...item,
    value: round1(item.value),
    ...assessNutrient(item.key, item.value)
  }))

  let moistureAssessment = '暂无土壤湿度数据'
  if (moisture !== null) {
    // 兼容历史数据缩放异常（>100 视为原始数据未归一化）
    const v = moisture > 100 ? Number((moisture / 10).toFixed(1)) : moisture
    if (v < SOIL_MOISTURE_RANGE.min) {
      moistureAssessment = `偏干（${v}%），低于适宜区间 ${SOIL_MOISTURE_RANGE.min}-${SOIL_MOISTURE_RANGE.max}%，建议灌溉`
    } else if (v > SOIL_MOISTURE_RANGE.max) {
      moistureAssessment = `偏湿（${v}%），高于适宜区间，注意排水与病害风险`
    } else {
      moistureAssessment = `适宜（${v}%），处于 ${SOIL_MOISTURE_RANGE.min}-${SOIL_MOISTURE_RANGE.max}% 区间`
    }
  }

  const fertilityIndex =
    n !== null && p !== null && k !== null ? round1(n + p + k) : null

  const suggestions: string[] = []
  const lacking = nutrients.filter(x => x.level === '缺乏')
  if (lacking.length > 0) {
    suggestions.push(`优先补充：${lacking.map(x => x.label.replace('含量', '')).join('、')}`)
  }
  if (moisture !== null && moisture < SOIL_MOISTURE_RANGE.min) {
    suggestions.push('土壤偏干，建议先灌溉再追肥，避免肥料浓度过高伤根')
  }
  if (moisture !== null && moisture > SOIL_MOISTURE_RANGE.max) {
    suggestions.push('土壤过湿，暂缓灌溉并加强通风，降低根部病害风险')
  }
  if (suggestions.length === 0) {
    suggestions.push('土壤各项指标正常，维持当前水肥管理即可')
  }

  const summary =
    fertilityIndex === null
      ? '土壤数据不完整，无法给出综合判断'
      : `综合肥力指数 ${fertilityIndex} mg/kg（N+P+K），${lacking.length > 0 ? `缺${lacking.length}项` : '无缺素'}；土壤湿度${moistureAssessment}`

  return {
    measuredAt,
    moisture: { value: round1(moisture), unit: '%', assessment: moistureAssessment },
    nutrients,
    fertilityIndex,
    summary,
    suggestions
  }
}

/**
 * 查询设备操作记录（灌溉、补光、通风等操作的执行痕迹）
 *
 * 用于回答「上周浇过几次水」「最近谁动过设备」这类农事追溯问题。
 */
export async function getDeviceActivity(options: {
  limit?: number
  deviceName?: string
  sinceHours?: number
} = {}): Promise<ActivityEntry[]> {
  await initDB()

  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100)
  const sinceHours = options.sinceHours ?? 24 * 7
  const since = Date.now() - sinceHours * 60 * 60 * 1000

  const params: any[] = [since]
  let sql = `SELECT id, device_name, action, operator, details, created_at
             FROM device_logs
             WHERE created_at >= $1`

  if (options.deviceName) {
    params.push(options.deviceName)
    sql += ` AND device_name = $${params.length}`
  }

  params.push(limit)
  sql += ` ORDER BY created_at DESC LIMIT $${params.length}`

  const rows = await query<Record<string, any>>(sql, params)

  return rows.map(r => ({
    id: Number(r.id),
    deviceName: String(r.device_name),
    action: String(r.action),
    operator: String(r.operator),
    details: r.details ?? null,
    createdAt: Number(r.created_at)
  }))
}
