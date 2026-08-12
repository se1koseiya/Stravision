/**
 * AI 主动守护服务 (Guardian Service)
 *
 * 职责链：传感器数据 → 异常检测 → AI 分析 → 生成守护通知 → 存储 + 推送
 *
 * 与现有 alert-manager 的区别：
 * - alert-manager 监控的是 Agent 自身性能（错误率/响应时间）
 * - guardian-service 监控的是种植环境（温湿度/CO2/设备状态/病害征兆）
 *
 * 触发方式：
 * 1. 定时检查（由 instrumentation.ts 的 cron 每 10 分钟调用 runScheduledGuardianCheck，
 *    频率可通过 GUARDIAN_CHECK_CRON 环境变量配置；会主动判定设备在线/离线状态）
 * 2. 实时检测（设备数据上报时由 MQTTService.triggerGuardianCheck 调用 checkAndNotify）
 */

import { query, queryOne, execute } from '@/lib/db/database'
import { getSensorHistory } from '@/lib/db/device-service'
import { resolveProvider } from '@/lib/ai/provider-resolver'
import { MQTTService } from '@/lib/mqtt-service'

// === 类型定义 ===

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertCategory = 'environment' | 'device' | 'disease' | 'prediction'

export interface GuardianAlert {
  id?: number
  user_id: number
  severity: AlertSeverity
  category: AlertCategory
  title: string
  message: string
  recommendation: string
  data_snapshot: Record<string, any>
  created_at?: Date
  read: boolean
  dismissed: boolean
}

export interface AnomalyDetection {
  metric: string
  value: number
  threshold: { min: number; max: number }
  severity: AlertSeverity
  message: string
}

// === 草莓关键阈值配置 ===

const THRESHOLDS: Record<string, { min: number; max: number; unit: string; critical_min?: number; critical_max?: number }> = {
  temperature: { min: 5, max: 30, unit: '°C', critical_min: 2, critical_max: 35 },
  humidity: { min: 40, max: 90, unit: '%', critical_max: 95 },
  co2: { min: 350, max: 1500, unit: 'ppm' },
  light: { min: 5000, max: 50000, unit: 'Lux' },
  soilMoisture: { min: 30, max: 80, unit: '%', critical_min: 20, critical_max: 85 },
}

// === 异常检测 ===

/**
 * 字段名别名：THRESHOLDS 使用 camelCase（soilMoisture），
 * 但项目其它地方（mqtt-service / device-service）使用 snake_case（soil_moisture）。
 * 这里做一次归一化映射，让两种命名都能命中阈值检测。
 */
const METRIC_ALIASES: Record<string, string> = {
  soil_moisture: 'soilMoisture',
  soil_moisture_percent: 'soilMoisture',
  co2_ppm: 'co2',
  light_lux: 'light',
  temperature_c: 'temperature',
  humidity_percent: 'humidity',
}

/**
 * 检测当前传感器数据中的异常
 */
export function detectAnomalies(sensorData: Record<string, number>): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = []

  for (const [rawMetric, value] of Object.entries(sensorData)) {
    // 归一化字段名
    const metric = METRIC_ALIASES[rawMetric] || rawMetric
    const threshold = THRESHOLDS[metric]
    if (!threshold) continue

    // 严重越界
    if (threshold.critical_max !== undefined && value > threshold.critical_max) {
      anomalies.push({
        metric,
        value,
        threshold,
        severity: 'critical',
        message: `${metric === 'temperature' ? '温度' : metric === 'humidity' ? '湿度' : metric === 'co2' ? 'CO2' : metric === 'soilMoisture' ? '土壤湿度' : metric} 严重偏高：${value}${threshold.unit}（临界值 ${threshold.critical_max}${threshold.unit}）`,
      })
    } else if (threshold.critical_min !== undefined && value < threshold.critical_min) {
      anomalies.push({
        metric,
        value,
        threshold,
        severity: 'critical',
        message: `${metric === 'temperature' ? '温度' : metric === 'humidity' ? '湿度' : metric === 'co2' ? 'CO2' : metric === 'soilMoisture' ? '土壤湿度' : metric} 严重偏低：${value}${threshold.unit}（临界值 ${threshold.critical_min}${threshold.unit}）`,
      })
    } else if (value > threshold.max) {
      anomalies.push({
        metric,
        value,
        threshold,
        severity: 'warning',
        message: `${metric === 'temperature' ? '温度' : metric === 'humidity' ? '湿度' : metric === 'co2' ? 'CO2' : metric === 'soilMoisture' ? '土壤湿度' : metric} 偏高：${value}${threshold.unit}（适宜上限 ${threshold.max}${threshold.unit}）`,
      })
    } else if (value < threshold.min) {
      anomalies.push({
        metric,
        value,
        threshold,
        severity: 'warning',
        message: `${metric === 'temperature' ? '温度' : metric === 'humidity' ? '湿度' : metric === 'co2' ? 'CO2' : metric === 'soilMoisture' ? '土壤湿度' : metric} 偏低：${value}${threshold.unit}（适宜下限 ${threshold.min}${threshold.unit}）`,
      })
    }
  }

  return anomalies
}

// === AI 分析 ===

/**
 * 调用 AI 对异常进行深度分析，生成可执行的建议
 */
export async function analyzeAnomaliesWithAI(
  anomalies: AnomalyDetection[],
  sensorData: Record<string, number>,
  userId: number
): Promise<{ recommendation: string; disease_risk?: string } | null> {
  if (anomalies.length === 0) return null

  try {
    const resolved = await resolveProvider('qwen3.6-plus')
    const apiKey = resolved?.apiKey || process.env.DASHSCOPE_API_KEY
    const baseUrl = resolved?.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    const model = resolved?.model || process.env.SYSTEM_OPENAI_MODEL || 'qwen-plus'

    if (!apiKey) return null

    const anomalyText = anomalies.map(a => `- ${a.message}`).join('\n')
    const fullDataText = Object.entries(sensorData).map(([k, v]) => `${k}: ${v}`).join(', ')

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `你是草莓种植守护专家。检测到环境异常时，给出简洁、可执行的应对建议（不超过 100 字）。如果异常组合暗示病害风险（如高温高湿→灰霉病），一并指出。输出 JSON：{"recommendation":"建议","disease_risk":"风险提示或null"}`
          },
          {
            role: 'user',
            content: `当前环境数据：${fullDataText}\n\n检测到的异常：\n${anomalyText}\n\n请给出应对建议和病害风险评估。`
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) return null

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content || '{}'
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      return JSON.parse(cleanContent)
    } catch {
      return { recommendation: '请检查环境数据并手动调整设备' }
    }
  } catch (e) {
    console.error('[Guardian] AI analysis failed:', e)
    return null
  }
}

// === 通知存储 ===

/**
 * 确保守护通知表存在
 */
export async function ensureGuardianTable() {
  await execute(`
    CREATE TABLE IF NOT EXISTS ai_guardian_alerts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      severity VARCHAR(20) NOT NULL DEFAULT 'warning',
      category VARCHAR(30) NOT NULL DEFAULT 'environment',
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      recommendation TEXT,
      data_snapshot JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      read BOOLEAN DEFAULT FALSE,
      dismissed BOOLEAN DEFAULT FALSE
    )
  `)
  await execute(`CREATE INDEX IF NOT EXISTS idx_guardian_user_unread ON ai_guardian_alerts(user_id) WHERE read = FALSE AND dismissed = FALSE`)
}

/**
 * 创建守护通知
 */
export async function createGuardianAlert(alert: Omit<GuardianAlert, 'id' | 'created_at' | 'read' | 'dismissed'>): Promise<number | null> {
  await ensureGuardianTable()

  // 去重：同一用户 1 小时内相同 title 的通知不重复创建
  const existing = await queryOne(
    `SELECT id FROM ai_guardian_alerts
     WHERE user_id = $1 AND title = $2 AND created_at > NOW() - INTERVAL '1 hour'
     LIMIT 1`,
    [alert.user_id, alert.title]
  )
  if (existing) return null

  const result = await queryOne(
    `INSERT INTO ai_guardian_alerts (user_id, severity, category, title, message, recommendation, data_snapshot)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      alert.user_id,
      alert.severity,
      alert.category,
      alert.title,
      alert.message,
      alert.recommendation || '',
      JSON.stringify(alert.data_snapshot || {}),
    ]
  )
  return result?.id || null
}

/**
 * 获取用户未读守护通知
 */
export async function getUnreadAlerts(userId: number, limit = 20): Promise<GuardianAlert[]> {
  await ensureGuardianTable()
  return query(
    `SELECT * FROM ai_guardian_alerts WHERE user_id = $1 AND read = FALSE AND dismissed = FALSE ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  ) as GuardianAlert[]
}

/**
 * 标记通知已读
 */
export async function markAlertRead(alertId: number, userId: number) {
  await execute(
    `UPDATE ai_guardian_alerts SET read = TRUE WHERE id = $1 AND user_id = $2`,
    [alertId, userId]
  )
}

/**
 * 忽略通知
 */
export async function dismissAlert(alertId: number, userId: number) {
  await execute(
    `UPDATE ai_guardian_alerts SET dismissed = TRUE WHERE id = $1 AND user_id = $2`,
    [alertId, userId]
  )
}

// === 主入口：检查并通知 ===

/**
 * 主动守护检查入口
 * 由 scheduler 定时调用，或由设备数据上报时触发
 */
export async function checkAndNotify(
  userId: number,
  sensorData: Record<string, number>
): Promise<GuardianAlert[]> {
  // 1. 检测异常
  const anomalies = detectAnomalies(sensorData)
  if (anomalies.length === 0) return []

  // 2. AI 深度分析
  const aiAnalysis = await analyzeAnomaliesWithAI(anomalies, sensorData, userId)

  // 3. 生成并存储通知
  const createdAlerts: GuardianAlert[] = []
  for (const anomaly of anomalies) {
    const severityMap: Record<string, AlertSeverity> = { critical: 'critical', warning: 'warning' }
    const alert: Omit<GuardianAlert, 'id' | 'created_at' | 'read' | 'dismissed'> = {
      user_id: userId,
      severity: severityMap[anomaly.severity] || 'warning',
      category: 'environment',
      title: anomaly.message.split('：')[0] || '环境异常',
      message: anomaly.message,
      recommendation: aiAnalysis?.recommendation || '请检查设备状态并手动调整',
      data_snapshot: { ...sensorData, anomaly_metric: anomaly.metric, anomaly_value: anomaly.value },
    }

    const alertId = await createGuardianAlert(alert)
    if (alertId) {
      createdAlerts.push({ ...alert, id: alertId, read: false, dismissed: false })
    }
  }

  // 4. 如果有病害风险，额外创建病害预警通知
  if (aiAnalysis?.disease_risk && aiAnalysis.disease_risk !== 'null') {
    const diseaseAlertId = await createGuardianAlert({
      user_id: userId,
      severity: 'warning',
      category: 'disease',
      title: '病害风险预警',
      message: aiAnalysis.disease_risk,
      recommendation: aiAnalysis.recommendation,
      data_snapshot: { ...sensorData, disease_risk: aiAnalysis.disease_risk },
    })
    if (diseaseAlertId) {
      createdAlerts.push({
        id: diseaseAlertId,
        user_id: userId,
        severity: 'warning',
        category: 'disease',
        title: '病害风险预警',
        message: aiAnalysis.disease_risk,
        recommendation: aiAnalysis.recommendation,
        data_snapshot: { ...sensorData, disease_risk: aiAnalysis.disease_risk },
        read: false,
        dismissed: false,
      })
    }
  }

  return createdAlerts
}

// === 设备在线状态判定 ===

export type DeviceStatus = 'online' | 'offline' | 'no_data'

export interface DeviceStatusInfo {
  status: DeviceStatus
  /** 最近一次收到设备数据的时间戳（ms），从未收到过为 null */
  lastSeenAt: number | null
  /** 距离上次数据已过多少分钟，无数据时为 null */
  staleMinutes: number | null
}

/**
 * 离线判定阈值：超过该时长未收到设备数据则判定为离线。
 * 可通过 GUARDIAN_OFFLINE_THRESHOLD_MS 环境变量配置（毫秒），默认 5 分钟。
 */
const OFFLINE_THRESHOLD_MS = Number(process.env.GUARDIAN_OFFLINE_THRESHOLD_MS) || 5 * 60 * 1000

/**
 * 判断设备在线状态
 *
 * 数据源优先级：
 * 1. MQTTService 内存时间戳（lastDataReceivedAt）—— 快，无需查 DB，但进程重启后丢失
 * 2. sensor_readings 表最新 created_at —— 持久化真相源，进程重启后仍可用
 *
 * 两者都无 → no_data（可能是新部署，从未收到过数据）
 */
export async function getDeviceStatus(): Promise<DeviceStatusInfo> {
  // 1. 优先用 MQTT 内存时间戳
  const mqttLastAt = MQTTService.getInstance().getLastDataReceivedAt()
  if (mqttLastAt) {
    const staleMs = Date.now() - mqttLastAt
    return {
      status: staleMs > OFFLINE_THRESHOLD_MS ? 'offline' : 'online',
      lastSeenAt: mqttLastAt,
      staleMinutes: Math.floor(staleMs / 60_000),
    }
  }

  // 2. fallback 到 DB（进程重启场景）
  const row = await queryOne<{ created_at: string }>(
    `SELECT created_at FROM sensor_readings ORDER BY created_at DESC LIMIT 1`
  )
  if (!row) {
    return { status: 'no_data', lastSeenAt: null, staleMinutes: null }
  }
  const lastSeenAt = Number(row.created_at)
  const staleMs = Date.now() - lastSeenAt
  return {
    status: staleMs > OFFLINE_THRESHOLD_MS ? 'offline' : 'online',
    lastSeenAt,
    staleMinutes: Math.floor(staleMs / 60_000),
  }
}

/**
 * 获取最新传感器数据（用于定时守护检查）
 * 优先用 MQTT 内存 latestData（实时），fallback 到 DB 最新一条 reading
 */
async function getLatestSensorData(): Promise<Record<string, number> | null> {
  const latest = MQTTService.getInstance().getLatestData()
  if (latest) {
    return {
      temperature: latest.temperature / 10,
      humidity: latest.humidity / 10,
      light: latest.light,
      co2: latest.co2,
      soil_moisture: latest.earth_water / 10,
    }
  }

  // fallback 到 DB
  const row = await queryOne<{
    temperature: number
    humidity: number
    light: number
    co2: number
    soil_moisture: number
  }>(
    `SELECT temperature, humidity, light, co2, soil_moisture
     FROM sensor_readings ORDER BY created_at DESC LIMIT 1`
  )
  if (!row) return null
  return {
    temperature: row.temperature,
    humidity: row.humidity,
    light: row.light,
    co2: row.co2,
    soil_moisture: row.soil_moisture,
  }
}

/**
 * 创建"设备离线"告警（1 小时内同 title 去重，复用 createGuardianAlert 逻辑）
 */
async function createOfflineAlert(userId: number, status: DeviceStatusInfo): Promise<void> {
  const minutes = status.staleMinutes ?? 0
  const lastSeenText = status.lastSeenAt
    ? new Date(status.lastSeenAt).toLocaleString('zh-CN', { hour12: false })
    : '未知'
  const durationText = minutes >= 60
    ? `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`
    : `${minutes} 分钟`
  const alert: Omit<GuardianAlert, 'id' | 'created_at' | 'read' | 'dismissed'> = {
    user_id: userId,
    severity: 'critical',
    category: 'device',
    title: '设备离线',
    message: `设备已离线 ${durationText}，无法获取环境数据。最后数据时间：${lastSeenText}。请检查设备网络与供电。`,
    recommendation: '检查设备电源、网络连接及 MQTT 上报链路，恢复后守护服务将自动继续监测。',
    data_snapshot: {
      lastSeenAt: status.lastSeenAt,
      staleMinutes: minutes,
      offlineThresholdMs: OFFLINE_THRESHOLD_MS,
    },
  }
  await createGuardianAlert(alert)
}

/**
 * 定时守护检查入口
 *
 * 由 instrumentation.ts 的 cron 每 N 分钟调用（频率可配置，默认 10 分钟）。
 *
 * 与 MQTT 上报触发的 triggerGuardianCheck 区别：
 * - triggerGuardianCheck 只在设备在线上报时触发，设备离线时不跑 → 无法发现离线
 * - runScheduledGuardianCheck 无论设备在线与否都跑，能主动发现"设备离线"
 *
 * 流程：查 owner → 判断设备状态 → 离线则创建离线告警 → 在线则用最新数据跑 checkAndNotify
 */
export async function runScheduledGuardianCheck(): Promise<void> {
  try {
    const owner = await queryOne<{ id: number }>(
      "SELECT id FROM users WHERE role = 'super_admin' LIMIT 1"
    )
    if (!owner) return

    const deviceStatus = await getDeviceStatus()

    if (deviceStatus.status === 'offline') {
      // 设备离线：创建/更新离线告警（1小时去重），跳过异常检测（数据已陈旧无意义）
      await createOfflineAlert(owner.id, deviceStatus)
      return
    }

    if (deviceStatus.status === 'no_data') {
      // 从未有数据：可能是新部署，静默返回不告警
      return
    }

    // 设备在线：用最新传感器数据跑异常检测
    const sensorData = await getLatestSensorData()
    if (!sensorData) return
    await checkAndNotify(owner.id, sensorData)
  } catch (e) {
    console.error('[Guardian] Scheduled check failed:', e)
  }
}
